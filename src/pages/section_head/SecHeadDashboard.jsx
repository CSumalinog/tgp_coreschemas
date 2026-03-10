// src/pages/section_head/SecHeadDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Chip, Avatar, Tooltip, Divider, useTheme,
} from "@mui/material";
import { useNavigate }              from "react-router-dom";
import AssignmentOutlinedIcon       from "@mui/icons-material/AssignmentOutlined";
import AccessTimeOutlinedIcon       from "@mui/icons-material/AccessTimeOutlined";
import TaskAltOutlinedIcon          from "@mui/icons-material/TaskAltOutlined";
import CalendarTodayOutlinedIcon    from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon       from "@mui/icons-material/LocationOnOutlined";
import GroupOutlinedIcon            from "@mui/icons-material/GroupOutlined";
import OpenInNewOutlinedIcon        from "@mui/icons-material/OpenInNewOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import { supabase }                 from "../../lib/supabaseClient";
import { getAvatarUrl }             from "../../components/common/UserAvatar";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  gold:        "#f5c52b",
  goldAlpha12: "rgba(245,197,43,0.12)",
  goldAlpha15: "rgba(245,197,43,0.15)",
  goldAlpha20: "rgba(245,197,43,0.20)",
  charcoal:    "#353535",
  white:       "#ffffff",
  red:         "#c62828",
  redAlpha15:  "rgba(198,40,40,0.15)",
  redLight:    "#ffebee",
  borderLight: "#e8e8e8",
  borderDark:  "#2e2e2e",
  surfLight:   "#f7f7f7",
  surfDark:    "#282828",
};

// ─── Day labels — now gold-toned instead of rainbow ──────────────────────────
const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
// Light/dark bg + text for each day, staying within brand neutrals + gold
const DAY_CHIP = {
  light: [
    { bg: BRAND.goldAlpha20,          color: "#7a5c00" },
    { bg: "rgba(53,53,53,0.08)",      color: "#353535" },
    { bg: BRAND.goldAlpha15,          color: "#6b4f00" },
    { bg: "rgba(53,53,53,0.06)",      color: "#555"    },
    { bg: "rgba(245,197,43,0.10)",    color: "#8a6800" },
  ],
  dark: [
    { bg: BRAND.goldAlpha20,          color: BRAND.gold   },
    { bg: "rgba(255,255,255,0.08)",   color: "#aaa"       },
    { bg: BRAND.goldAlpha15,          color: BRAND.gold   },
    { bg: "rgba(255,255,255,0.06)",   color: "#888"       },
    { bg: "rgba(245,197,43,0.10)",    color: "#e6b920"    },
  ],
};

// ─── Status chip palettes ─────────────────────────────────────────────────────
const STATUS = {
  light: {
    Forwarded:           { bg: BRAND.goldAlpha15, color: "#7a5c00"  },
    Assigned:            { bg: BRAND.goldAlpha12, color: "#856900"  },
    "Coverage Complete": { bg: "rgba(53,53,53,0.07)", color: "#353535" },
  },
  dark: {
    Forwarded:           { bg: BRAND.goldAlpha15, color: BRAND.gold  },
    Assigned:            { bg: BRAND.goldAlpha12, color: "#e6b920"   },
    "Coverage Complete": { bg: "rgba(255,255,255,0.07)", color: "#aaa" },
  },
};

const STATUS_TO_TAB = {
  "Forwarded":          "for-assignment",
  "Assigned":           "assigned",
  "For Approval":       "assigned",
  "Coverage Complete":  "history",
  "Approved":           "history",
  "Declined":           "history",
};

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

// ─── Shared card shell ────────────────────────────────────────────────────────
function Card({ children, sx = {}, onClick }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box onClick={onClick} sx={{
      bgcolor: "background.paper",
      borderRadius: 3,
      border: `1px solid ${isDark ? BRAND.borderDark : BRAND.borderLight}`,
      overflow: "hidden",
      ...(onClick ? {
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        "&:hover": { borderColor: BRAND.gold, boxShadow: `0 4px 20px ${BRAND.goldAlpha12}` },
      } : {}),
      ...sx,
    }}>
      {children}
    </Box>
  );
}

function SectionHeader({ title, action }) {
  return (
    <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.09em" }}>
        {title}
      </Typography>
      {action}
    </Box>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SecHeadDashboard() {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const border   = isDark ? BRAND.borderDark  : BRAND.borderLight;
  const surf     = isDark ? BRAND.surfDark    : BRAND.surfLight;
  const iconWell = isDark ? BRAND.goldAlpha15 : BRAND.goldAlpha12;
  const status   = isDark ? STATUS.dark       : STATUS.light;
  const dayChip  = isDark ? DAY_CHIP.dark     : DAY_CHIP.light;

  const [currentUser,    setCurrentUser]    = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);
  const [stats,          setStats]          = useState({ pending: 0, assigned: 0, complete: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [teamSnapshot,   setTeamSnapshot]   = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, section, division, position")
        .eq("id", user.id).single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadSemester() {
      const { data } = await supabase
        .from("semesters").select("id, name, start_date, end_date").eq("is_active", true).single();
      setActiveSemester(data || null);
    }
    loadSemester();
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser?.section || !currentUser?.division) return;
    setLoading(true);

    const { data: allRequests } = await supabase
      .from("coverage_requests")
      .select("id, status, title, event_date, venue, forwarded_at, entity:client_entities(name)")
      .contains("forwarded_sections", [currentUser.section])
      .in("status", ["Forwarded", "Assigned", "Coverage Complete"])
      .order("forwarded_at", { ascending: false });

    const pending  = (allRequests || []).filter((r) => r.status === "Forwarded").length;
    const assigned = (allRequests || []).filter((r) => r.status === "Assigned").length;
    const complete = (allRequests || []).filter((r) => r.status === "Coverage Complete").length;
    setStats({ pending, assigned, complete });
    setRecentRequests((allRequests || []).slice(0, 5));

    if (activeSemester?.id) {
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, section, role, position, avatar_url")
        .eq("division", currentUser.division).eq("is_active", true).neq("id", currentUser.id);

      const profileIds = (profiles || []).map((p) => p.id);
      const { data: dutySchedules } = await supabase
        .from("duty_schedules").select("staffer_id, duty_day")
        .eq("semester_id", activeSemester.id).in("staffer_id", profileIds);

      const dutyMap = {};
      (dutySchedules || []).forEach((d) => { dutyMap[d.staffer_id] = d.duty_day; });
      setTeamSnapshot((profiles || []).map((p) => ({ ...p, dutyDay: dutyMap[p.id] ?? null })));
    }

    setLoading(false);
  }, [currentUser, activeSemester]);

  useEffect(() => { if (currentUser && activeSemester) loadData(); }, [currentUser, activeSemester, loadData]);

  const goToTab     = (tab) => navigate("/sec_head/assignment-management", { state: { tab } });
  const goToRequest = (s)   => goToTab(STATUS_TO_TAB[s] || "for-assignment");

  const dutyDaySet   = teamSnapshot.filter((s) => s.dutyDay !== null).length;
  const dutyDayUnset = teamSnapshot.filter((s) => s.dutyDay === null).length;
  const schedPct     = teamSnapshot.length > 0 ? (dutyDaySet / teamSnapshot.length) * 100 : 0;

  const getSubtitle = () => {
    if (!currentUser) return "";
    const parts = [];
    if (currentUser.position) parts.push(currentUser.position);
    if (currentUser.section)  parts.push(currentUser.section);
    return parts.join(" · ");
  };

  if (!currentUser || loading) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <CircularProgress size={32} sx={{ color: BRAND.gold }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%", maxWidth: 1100 }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "text.primary", letterSpacing: "-0.02em" }}>
          {getGreeting()}, {currentUser.full_name?.split(" ")[0]} 👋
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {getSubtitle()}
          </Typography>
          {activeSemester && (
            <Chip
              label={activeSemester.name}
              size="small"
              sx={{
                fontSize: "0.7rem", fontWeight: 600, height: 20,
                backgroundColor: iconWell,
                color: isDark ? BRAND.gold : "#7a5c00",
                border: `1px solid ${isDark ? "rgba(245,197,43,0.25)" : "rgba(245,197,43,0.4)"}`,
              }}
            />
          )}
        </Box>
      </Box>

      {/* ── ROW 1: Hero card + 3 KPI cards ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "240px repeat(3, 1fr)", gap: 1.5, mb: 2.5 }}>

        {/* Hero card */}
        <Box sx={{
          borderRadius: 3, overflow: "hidden", position: "relative",
          background: isDark
            ? `linear-gradient(140deg, #1e1a00 0%, ${BRAND.charcoal} 55%, #141400 100%)`
            : `linear-gradient(140deg, ${BRAND.charcoal} 0%, #1a1a1a 60%, #0d0d0d 100%)`,
          p: 2.5, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 130,
        }}>
          {/* decorative rings */}
          <Box sx={{ position: "absolute", top: -32, right: -32, width: 100, height: 100, borderRadius: "50%", border: `1.5px solid ${BRAND.goldAlpha12}`, pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", top: -14, right: -14, width: 62,  height: 62,  borderRadius: "50%", border: `1.5px solid rgba(245,197,43,0.07)`, pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", bottom: -20, left: -20, width: 70, height: 70, borderRadius: "50%", backgroundColor: "rgba(245,197,43,0.04)", pointerEvents: "none" }} />

          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1 }}>
              <Box sx={{
                width: 6, height: 6, borderRadius: "50%", backgroundColor: BRAND.gold,
                boxShadow: `0 0 6px ${BRAND.gold}`,
                animation: "blink 2s ease-in-out infinite",
                "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.35 } },
              }} />
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: BRAND.gold, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {currentUser.section}
              </Typography>
            </Box>

            {stats.pending > 0 ? (
              <>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: BRAND.white, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                  {stats.pending} request{stats.pending > 1 ? "s" : ""} need assignment
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", mt: 0.5 }}>Assign staffers now</Typography>
              </>
            ) : stats.assigned > 0 ? (
              <>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: BRAND.white, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                  {stats.assigned} request{stats.assigned > 1 ? "s" : ""} in progress
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", mt: 0.5 }}>Coverage ongoing</Typography>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: BRAND.white, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                  All caught up!
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", mt: 0.5 }}>No pending assignments</Typography>
              </>
            )}
          </Box>

          <Box
            onClick={() => goToTab("for-assignment")}
            sx={{
              mt: 1.5, display: "inline-flex", alignItems: "center", gap: 0.4,
              cursor: "pointer", color: "rgba(255,255,255,0.38)", fontSize: "0.7rem", fontWeight: 500,
              "&:hover": { color: BRAND.gold }, transition: "color 0.15s", width: "fit-content",
            }}
          >
            <OpenInNewOutlinedIcon sx={{ fontSize: 12 }} />
            View requests
          </Box>
        </Box>

        {/* 3 KPI cards */}
        {[
          { label: "Needs Assignment", value: stats.pending,  sub: "awaiting staffers", tab: "for-assignment", icon: AccessTimeOutlinedIcon, isRed: stats.pending > 0 },
          { label: "In Progress",      value: stats.assigned, sub: "being covered",     tab: "assigned",       icon: AssignmentOutlinedIcon, isRed: false              },
          { label: "Coverage Done",    value: stats.complete, sub: "completed",         tab: "history",        icon: TaskAltOutlinedIcon,    isRed: false              },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Tooltip key={k.label} title={`Go to ${k.label}`} placement="top" arrow>
              <Box
                onClick={() => goToTab(k.tab)}
                sx={{
                  bgcolor: "background.paper", borderRadius: 3,
                  border: `1px solid ${border}`,
                  p: 2.5, minHeight: 130, cursor: "pointer",
                  display: "flex", flexDirection: "column", justifyContent: "space-between",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  "&:hover": { borderColor: BRAND.gold, boxShadow: `0 2px 16px ${BRAND.goldAlpha12}` },
                }}
              >
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontWeight: 500 }}>{k.label}</Typography>
                  <Box sx={{
                    width: 30, height: 30, borderRadius: 2, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: k.isRed ? (isDark ? BRAND.redAlpha15 : BRAND.redLight) : iconWell,
                  }}>
                    <Icon sx={{ fontSize: 15, color: k.isRed ? BRAND.red : BRAND.gold }} />
                  </Box>
                </Box>
                <Box>
                  <Typography sx={{ fontSize: "2rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: k.isRed ? BRAND.red : "text.primary" }}>
                    {k.value}
                  </Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", mt: 0.5 }}>{k.sub}</Typography>
                </Box>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      {/* ── ROW 2: Recent requests + Team snapshot ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 2 }}>

        {/* Recent Requests */}
        <Card>
          <SectionHeader
            title="Recent Requests"
            action={
              <Tooltip title="View all in Assignment Management" arrow>
                <Box
                  onClick={() => goToTab("for-assignment")}
                  sx={{ display: "flex", alignItems: "center", gap: 0.3, cursor: "pointer", color: "text.disabled", "&:hover": { color: BRAND.gold }, transition: "color 0.15s" }}
                >
                  <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />
                  <Typography sx={{ fontSize: "0.7rem" }}>View all</Typography>
                </Box>
              </Tooltip>
            }
          />
          <Divider sx={{ borderColor: border }} />

          {recentRequests.length === 0 ? (
            <Box sx={{ py: 5, textAlign: "center" }}>
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 32, color: isDark ? "#444" : "#ddd", mb: 1 }} />
              <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>No requests yet.</Typography>
            </Box>
          ) : (
            recentRequests.map((r, idx) => (
              <Tooltip key={r.id} title="Click to view in Assignment Management" placement="left" arrow>
                <Box
                  onClick={() => goToRequest(r.status)}
                  sx={{
                    px: 2.5, py: 1.75,
                    borderBottom: idx < recentRequests.length - 1 ? `1px solid ${border}` : "none",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
                    cursor: "pointer", transition: "background 0.15s",
                    "&:hover": { backgroundColor: isDark ? "#1e1e1e" : "#fafafa" },
                    // left accent bar matching urgency/status
                    borderLeft: "3px solid",
                    borderLeftColor: r.status === "Forwarded" ? BRAND.gold : r.status === "Coverage Complete" ? (isDark ? "#555" : "#ddd") : border,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: "text.primary", mb: 0.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {r.title}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                      {r.event_date && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                          <CalendarTodayOutlinedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                            {new Date(r.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </Typography>
                        </Box>
                      )}
                      {r.venue && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                          <LocationOnOutlinedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{r.venue}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  <Chip
                    label={r.status} size="small"
                    sx={{
                      fontSize: "0.68rem", fontWeight: 600, flexShrink: 0, height: 20,
                      backgroundColor: status[r.status]?.bg || surf,
                      color: status[r.status]?.color || "text.secondary",
                    }}
                  />
                </Box>
              </Tooltip>
            ))
          )}
        </Card>

        {/* Team Snapshot */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

          {/* Duty progress mini-card */}
          <Card>
            <SectionHeader
              title={`Team — ${currentUser.division}`}
              action={
                <Tooltip title="Manage staffers" arrow>
                  <Box
                    onClick={() => navigate("/sec_head/my-staffers")}
                    sx={{ display: "flex", alignItems: "center", gap: 0.3, cursor: "pointer", color: "text.disabled", "&:hover": { color: BRAND.gold }, transition: "color 0.15s" }}
                  >
                    <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />
                    <Typography sx={{ fontSize: "0.7rem" }}>Manage</Typography>
                  </Box>
                </Tooltip>
              }
            />
            <Divider sx={{ borderColor: border }} />

            {/* Duty schedule progress */}
            <Box sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${border}` }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.8 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <GroupOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                  <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Duty days set</Typography>
                </Box>
                <Typography sx={{ fontSize: "0.9rem", fontWeight: 700, color: dutyDayUnset > 0 ? BRAND.red : BRAND.gold }}>
                  {dutyDaySet}
                  <Typography component="span" sx={{ fontSize: "0.72rem", fontWeight: 400, color: "text.secondary" }}>/{teamSnapshot.length}</Typography>
                </Typography>
              </Box>
              <Box sx={{ height: 4, borderRadius: 2, backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0", overflow: "hidden" }}>
                <Box sx={{ height: "100%", borderRadius: 2, backgroundColor: BRAND.gold, width: `${schedPct}%`, transition: "width 0.5s ease" }} />
              </Box>
            </Box>

            {/* Team member list */}
            {teamSnapshot.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>No team members found.</Typography>
              </Box>
            ) : (
              teamSnapshot.map((s, idx) => {
                const url  = getAvatarUrl(s.avatar_url);
                const chip = s.dutyDay !== null ? dayChip[s.dutyDay] : null;
                return (
                  <Tooltip key={s.id} title="View in My Staffers" placement="left" arrow>
                    <Box
                      onClick={() => navigate("/sec_head/my-staffers")}
                      sx={{
                        px: 2.5, py: 1.4,
                        borderBottom: idx < teamSnapshot.length - 1 ? `1px solid ${border}` : "none",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
                        cursor: "pointer", transition: "background 0.15s",
                        "&:hover": { backgroundColor: isDark ? "#1e1e1e" : "#fafafa" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.2 }}>
                        <Avatar
                          src={url}
                          sx={{ width: 30, height: 30, fontSize: "0.7rem", fontWeight: 700, backgroundColor: BRAND.gold, color: BRAND.charcoal }}
                        >
                          {!url && getInitials(s.full_name)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 500, color: "text.primary", lineHeight: 1.2 }}>{s.full_name}</Typography>
                          <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{s.position || s.section || "—"}</Typography>
                        </Box>
                      </Box>
                      {chip ? (
                        <Chip
                          label={DAY_LABELS[s.dutyDay]} size="small"
                          sx={{ fontSize: "0.67rem", fontWeight: 600, height: 20, backgroundColor: chip.bg, color: chip.color }}
                        />
                      ) : (
                        <Typography sx={{ fontSize: "0.68rem", color: isDark ? "#555" : "#bdbdbd" }}>Not set</Typography>
                      )}
                    </Box>
                  </Tooltip>
                );
              })
            )}
          </Card>

        </Box>
      </Box>
    </Box>
  );
}