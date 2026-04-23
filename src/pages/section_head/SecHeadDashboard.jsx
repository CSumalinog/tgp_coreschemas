// src/pages/section_head/SecHeadDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Avatar,
  Tooltip,
  Divider,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import { supabase } from "../../lib/supabaseClient";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import BrandedLoader from "../../components/common/BrandedLoader";
import {
  TABLE_USER_AVATAR_FONT_SIZE,
  TABLE_USER_AVATAR_SIZE,
} from "../../utils/layoutTokens";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const BRAND = {
  gold: "#f5c52b",
  goldAlpha12: "rgba(245,197,43,0.12)",
  goldAlpha15: "rgba(245,197,43,0.15)",
  goldAlpha20: "rgba(245,197,43,0.20)",
  charcoal: "#353535",
  white: "#ffffff",
  red: "#c62828",
  redAlpha15: "rgba(198,40,40,0.15)",
  redLight: "#ffebee",
  borderLight: "#e8e8e8",
  borderDark: "#2e2e2e",
  surfLight: "#f7f7f7",
  surfDark: "#282828",
};

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_CHIP = {
  light: [
    { bg: BRAND.goldAlpha20, color: "#7a5c00" },
    { bg: "rgba(53,53,53,0.08)", color: "#353535" },
    { bg: BRAND.goldAlpha15, color: "#6b4f00" },
    { bg: "rgba(53,53,53,0.06)", color: "#555" },
    { bg: "rgba(245,197,43,0.10)", color: "#8a6800" },
  ],
  dark: [
    { bg: BRAND.goldAlpha20, color: BRAND.gold },
    { bg: "rgba(255,255,255,0.08)", color: "#aaa" },
    { bg: BRAND.goldAlpha15, color: BRAND.gold },
    { bg: "rgba(255,255,255,0.06)", color: "#888" },
    { bg: "rgba(245,197,43,0.10)", color: "#e6b920" },
  ],
};

const STATUS = {
  light: {
    Forwarded: { bg: BRAND.goldAlpha15, color: "#7a5c00" },
    "For Approval": { bg: "rgba(124,58,237,0.10)", color: "#6d28d9" },
    Assigned: { bg: BRAND.goldAlpha12, color: "#856900" },
    "On Going": { bg: "rgba(59,130,246,0.10)", color: "#1d4ed8" },
    "Coverage Complete": { bg: "rgba(53,53,53,0.07)", color: "#353535" },
  },
  dark: {
    Forwarded: { bg: BRAND.goldAlpha15, color: BRAND.gold },
    "For Approval": { bg: "rgba(124,58,237,0.15)", color: "#a78bfa" },
    Assigned: { bg: BRAND.goldAlpha12, color: "#e6b920" },
    "On Going": { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
    "Coverage Complete": { bg: "rgba(255,255,255,0.07)", color: "#aaa" },
  },
};

const STATUS_TO_TAB = {
  Forwarded: "for-assignment",
  Assigned: "assigned",
  "For Approval": "for-approval",
  "On Going": "on-going",
  "Coverage Complete": "completed",
  Approved: "assigned",
  Declined: "completed",
};

const getCoverageManagementPath = (tab) =>
  ["on-going", "completed"].includes(tab)
    ? "/sec_head/coverage-management/tracker"
    : "/sec_head/coverage-management/assignment";

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

// ─── Shared card shell ────────────────────────────────────────────────────────
function Card({ children, sx = {}, onClick }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: "background.paper",
        borderRadius: "10px",
        border: `1px solid ${isDark ? BRAND.borderDark : BRAND.borderLight}`,
        boxShadow: isDark
          ? "0 1px 10px rgba(0,0,0,0.4)"
          : "0 1px 8px rgba(0,0,0,0.07)",
        overflow: "hidden",
        ...(onClick
          ? {
              cursor: "pointer",
              transition: "border-color 0.2s, box-shadow 0.2s",
              "&:hover": {
                borderColor: BRAND.gold,
                boxShadow: `0 4px 20px ${BRAND.goldAlpha12}`,
              },
            }
          : {}),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function SectionHeader({ title, action }) {
  return (
    <Box
      sx={{
        px: 2.5,
        pt: 2,
        pb: 1.5,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 1,
      }}
    >
      <Typography
        sx={{
          fontSize: "0.7rem",
          fontWeight: 700,
          color: "text.secondary",
          textTransform: "uppercase",
          letterSpacing: "0.09em",
        }}
      >
        {title}
      </Typography>
      {action}
    </Box>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SecHeadDashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const border = isDark ? BRAND.borderDark : BRAND.borderLight;
  const surf = isDark ? BRAND.surfDark : BRAND.surfLight;
  const status = isDark ? STATUS.dark : STATUS.light;
  const dayChip = isDark ? DAY_CHIP.dark : DAY_CHIP.light;

  const [currentUser, setCurrentUser] = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [teamSnapshot, setTeamSnapshot] = useState([]);
  const [todayCoverage, setTodayCoverage] = useState({
    total: 0,
    onGoing: 0,
    complete: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, section, division, position")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadSemester() {
      const { data } = await supabase
        .from("semesters")
        .select("id, name, start_date, end_date")
        .eq("is_active", true)
        .single();
      setActiveSemester(data || null);
    }
    loadSemester();
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser?.section || !currentUser?.division) return;
    setLoading(true);

    const [reqResult, usResult] = await Promise.all([
      supabase
        .from("coverage_requests")
        .select(
          "id, status, title, event_date, venue, forwarded_at, entity:client_entities(name)",
        )
        .contains("forwarded_sections", [currentUser.section])
        .in("status", [
          "Forwarded",
          "For Approval",
          "Assigned",
          "On Going",
          "Coverage Complete",
        ])
        .is("archived_at", null)
        .is("trashed_at", null)
        .order("forwarded_at", { ascending: false }),
      supabase
        .from("request_user_state")
        .select("request_id")
        .eq("user_id", currentUser.id),
    ]);

    const hiddenIds = new Set((usResult.data || []).map((r) => r.request_id));
    const allRequests = (reqResult.data || []).filter(
      (r) => !hiddenIds.has(r.id),
    );

    setRecentRequests(allRequests.slice(0, 8));

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayReqs = allRequests.filter((r) => r.event_date === todayStr);
    setTodayCoverage({
      total: todayReqs.length,
      onGoing: todayReqs.filter((r) => r.status === "On Going").length,
      complete: todayReqs.filter((r) => r.status === "Coverage Complete")
        .length,
    });

    if (activeSemester?.id) {
      // ── Only show regular staff in the same division, excluding sec heads ──
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, section, role, position, avatar_url")
        .eq("division", currentUser.division)
        .eq("role", "staff")
        .eq("is_active", true)
        .neq("id", currentUser.id);

      const profileIds = (profiles || []).map((p) => p.id);
      const { data: dutySchedules } = await supabase
        .from("duty_schedules")
        .select("staffer_id, duty_day")
        .eq("semester_id", activeSemester.id)
        .in("staffer_id", profileIds);

      const dutyMap = {};
      (dutySchedules || []).forEach((d) => {
        dutyMap[d.staffer_id] = d.duty_day;
      });
      setTeamSnapshot(
        (profiles || []).map((p) => ({ ...p, dutyDay: dutyMap[p.id] ?? null })),
      );
    }

    setLoading(false);
  }, [currentUser, activeSemester]);

  useEffect(() => {
    if (currentUser && activeSemester) loadData();
  }, [currentUser, activeSemester, loadData]);

  // Silent reloads — notifications come from the layout-level useRealtimeNotify;
  // coverage_requests can't be filtered by forwarded_sections (array column),
  // but coverage_assignments can be scoped to this section.
  useRealtimeNotify("coverage_requests", loadData, null, {
    title: "Coverage Request",
    toast: false,
    sound: false,
    tabFlash: false,
  });
  useRealtimeNotify(
    "coverage_assignments",
    loadData,
    currentUser?.section ? `section=eq.${currentUser.section}` : null,
    { title: "Assignment", toast: false, sound: false, tabFlash: false },
  );

  const goToTab = (tab) =>
    navigate(getCoverageManagementPath(tab), { state: { tab } });
  const goToRequest = (s) => goToTab(STATUS_TO_TAB[s] || "for-assignment");

  const dutyDaySet = teamSnapshot.filter((s) => s.dutyDay !== null).length;
  const dutyDayUnset = teamSnapshot.filter((s) => s.dutyDay === null).length;
  const schedPct =
    teamSnapshot.length > 0 ? (dutyDaySet / teamSnapshot.length) * 100 : 0;

  const getSubtitle = () => {
    if (!currentUser) return "";
    const parts = [];
    if (currentUser.position) parts.push(currentUser.position);
    if (currentUser.section) parts.push(currentUser.section);
    return parts.join(" · ");
  };

  if (!currentUser || loading)
    return <BrandedLoader size={88} minHeight="60vh" />;

  const dm = "'Inter', sans-serif";

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 2.5, md: 3 },
        backgroundColor: "#ffffff",
        minHeight: "100%",
      }}
    >
      {/* ── Today's Coverage Pulse ── */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          bgcolor: "background.paper",
          borderRadius: "10px",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 1px 10px rgba(0,0,0,0.4)"
            : "0 1px 8px rgba(0,0,0,0.07)",
          px: 2,
          py: 1.25,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.disabled",
              fontWeight: 600,
            }}
          >
            Today
          </Typography>
          {todayCoverage.total === 0 ? (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                color: "text.disabled",
              }}
            >
              Nothing scheduled for today.
            </Typography>
          ) : (
            <>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  color: "text.primary",
                }}
              >
                {todayCoverage.total} event
                {todayCoverage.total !== 1 ? "s" : ""}
              </Typography>
              {[
                {
                  label: "On Going",
                  value: todayCoverage.onGoing,
                  color: "#3b82f6",
                  hide: todayCoverage.onGoing === 0,
                },
                {
                  label: "Covered",
                  value: todayCoverage.complete,
                  color: isDark ? "#4ade80" : "#166534",
                  hide: todayCoverage.complete === 0,
                },
                {
                  label: "In Pipeline",
                  value:
                    todayCoverage.total -
                    todayCoverage.onGoing -
                    todayCoverage.complete,
                  color: isDark ? BRAND.gold : "#7a5c00",
                  hide:
                    todayCoverage.total -
                      todayCoverage.onGoing -
                      todayCoverage.complete ===
                    0,
                },
              ]
                .filter((s) => !s.hide)
                .map((s) => (
                  <Box
                    key={s.label}
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: s.color,
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        color: s.color,
                      }}
                    >
                      {s.value}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.78rem",
                        color: "text.disabled",
                      }}
                    >
                      {s.label}
                    </Typography>
                  </Box>
                ))}
            </>
          )}
        </Box>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.72rem",
            color: "text.disabled",
            flexShrink: 0,
          }}
        >
          {currentUser.section}
        </Typography>
      </Box>

      {/* ── 3-col grid: Recent Requests + Team Snapshot ── */}
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "repeat(2, 1fr)",
            sm: "repeat(3, 1fr)",
            md: "repeat(3, 1fr)",
          },
        }}
      >
        {/* Recent Requests — spans 2 cols */}
        <Card sx={{ gridColumn: { xs: "1 / -1", sm: "1 / 3", md: "1 / 3" } }}>
          <SectionHeader
            title="Recent Requests"
            action={
              <Tooltip title="View all in Assignment Management" arrow>
                <Box
                  onClick={() => goToTab("for-assignment")}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.3,
                    cursor: "pointer",
                    color: "text.disabled",
                    "&:hover": { color: BRAND.gold },
                    transition: "color 0.15s",
                  }}
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
              <CheckCircleOutlineOutlinedIcon
                sx={{ fontSize: 32, color: isDark ? "#444" : "#ddd", mb: 1 }}
              />
              <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>
                No requests yet.
              </Typography>
            </Box>
          ) : (
            recentRequests.map((r, idx) => (
              <Tooltip
                key={r.id}
                title="Click to view in Assignment Management"
                placement="left"
                arrow
              >
                <Box
                  onClick={() => goToRequest(r.status)}
                  sx={{
                    px: { xs: 2, md: 2.5 },
                    py: { xs: 1.4, md: 1.75 },
                    borderBottom:
                      idx < recentRequests.length - 1
                        ? `1px solid ${border}`
                        : "none",
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                    justifyContent: "space-between",
                    gap: { xs: 1, sm: 2 },
                    cursor: "pointer",
                    transition: "background 0.15s",
                    "&:hover": {
                      backgroundColor: isDark ? "#1e1e1e" : "#fafafa",
                    },
                    borderLeft: "3px solid",
                    borderLeftColor:
                      r.status === "Forwarded"
                        ? BRAND.gold
                        : r.status === "For Approval"
                          ? "#7c3aed"
                          : r.status === "On Going"
                            ? "#3b82f6"
                            : r.status === "Coverage Complete"
                              ? isDark
                                ? "#555"
                                : "#ddd"
                              : border,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontWeight: 600,
                        fontSize: "0.875rem",
                        color: "text.primary",
                        mb: 0.35,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.title}
                    </Typography>
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: { xs: 0.8, sm: 1.5 },
                      }}
                    >
                      {r.event_date && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.4,
                          }}
                        >
                          <CalendarTodayOutlinedIcon
                            sx={{ fontSize: 11, color: "text.disabled" }}
                          />
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              color: "text.secondary",
                            }}
                          >
                            {new Date(r.event_date).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              },
                            )}
                          </Typography>
                        </Box>
                      )}
                      {r.venue && !isMobile && (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.4,
                          }}
                        >
                          <LocationOnOutlinedIcon
                            sx={{ fontSize: 11, color: "text.disabled" }}
                          />
                          <Typography
                            sx={{
                              fontSize: "0.72rem",
                              color: "text.secondary",
                            }}
                          >
                            {r.venue}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  <Chip
                    label={r.status}
                    size="small"
                    sx={{
                      fontSize: "0.68rem",
                      fontWeight: 600,
                      flexShrink: 0,
                      height: 20,
                      backgroundColor: status[r.status]?.bg || surf,
                      color: status[r.status]?.color || "text.secondary",
                    }}
                  />
                </Box>
              </Tooltip>
            ))
          )}
        </Card>

        {/* Team Snapshot — spans 1 col */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
            gridColumn: { xs: "1 / -1", sm: "3 / 4", md: "3 / 4" },
          }}
        >
          <Card>
            <SectionHeader
              title={`Team — ${currentUser.division}`}
              action={
                <Tooltip title="View all staffers" arrow>
                  <Box
                    onClick={() => navigate("/sec_head/my-staffers")}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.3,
                      cursor: "pointer",
                      color: "text.disabled",
                      "&:hover": { color: BRAND.gold },
                      transition: "color 0.15s",
                    }}
                  >
                    <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />
                    <Typography sx={{ fontSize: "0.7rem" }}>
                      View all
                    </Typography>
                  </Box>
                </Tooltip>
              }
            />
            <Divider sx={{ borderColor: border }} />

            {/* Duty schedule progress */}
            <Box
              sx={{ px: 2.5, py: 1.75, borderBottom: `1px solid ${border}` }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 0.8,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <GroupOutlinedIcon
                    sx={{ fontSize: 13, color: "text.secondary" }}
                  />
                  <Typography
                    sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                  >
                    Duty days set
                  </Typography>
                </Box>
                <Typography
                  sx={{
                    fontSize: "0.9rem",
                    fontWeight: 700,
                    color: dutyDayUnset > 0 ? BRAND.red : BRAND.gold,
                  }}
                >
                  {dutyDaySet}
                  <Typography
                    component="span"
                    sx={{
                      fontSize: "0.72rem",
                      fontWeight: 400,
                      color: "text.secondary",
                    }}
                  >
                    /{teamSnapshot.length}
                  </Typography>
                </Typography>
              </Box>
              <Box
                sx={{
                  height: 4,
                  borderRadius: "10px",
                  backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    borderRadius: "10px",
                    backgroundColor: BRAND.gold,
                    width: `${schedPct}%`,
                    transition: "width 0.5s ease",
                  }}
                />
              </Box>
            </Box>

            {/* Team member list */}
            {teamSnapshot.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography
                  sx={{ fontSize: "0.82rem", color: "text.disabled" }}
                >
                  No team members found.
                </Typography>
              </Box>
            ) : (
              teamSnapshot.map((s, idx) => {
                const url = getAvatarUrl(s.avatar_url);
                const chip = s.dutyDay !== null ? dayChip[s.dutyDay] : null;
                return (
                  <Tooltip
                    key={s.id}
                    title="View in My Staffers"
                    placement="left"
                    arrow
                  >
                    <Box
                      onClick={() => navigate("/sec_head/my-staffers")}
                      sx={{
                        px: 2.5,
                        py: 1.4,
                        borderBottom:
                          idx < teamSnapshot.length - 1
                            ? `1px solid ${border}`
                            : "none",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        cursor: "pointer",
                        transition: "background 0.15s",
                        "&:hover": {
                          backgroundColor: isDark ? "#1e1e1e" : "#fafafa",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.2,
                          minWidth: 0,
                        }}
                      >
                        <Avatar
                          src={url}
                          sx={{
                            width: TABLE_USER_AVATAR_SIZE,
                            height: TABLE_USER_AVATAR_SIZE,
                            fontSize: TABLE_USER_AVATAR_FONT_SIZE,
                            fontWeight: 700,
                            backgroundColor: BRAND.gold,
                            color: BRAND.charcoal,
                            flexShrink: 0,
                          }}
                        >
                          {!url && getInitials(s.full_name)}
                        </Avatar>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: "0.85rem",
                              fontWeight: 500,
                              color: "text.primary",
                              lineHeight: 1.2,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {s.full_name}
                          </Typography>
                          <Typography
                            sx={{ fontSize: "0.7rem", color: "text.secondary" }}
                          >
                            {s.position || s.section || "—"}
                          </Typography>
                        </Box>
                      </Box>
                      {chip ? (
                        <Chip
                          label={DAY_LABELS[s.dutyDay]}
                          size="small"
                          sx={{
                            fontSize: "0.67rem",
                            fontWeight: 600,
                            height: 20,
                            backgroundColor: chip.bg,
                            color: chip.color,
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Typography
                          sx={{
                            fontSize: "0.68rem",
                            color: isDark ? "#555" : "#bdbdbd",
                            flexShrink: 0,
                          }}
                        >
                          Not set
                        </Typography>
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
