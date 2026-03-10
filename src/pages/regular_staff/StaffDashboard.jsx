// src/pages/regular_staff/StaffDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Chip, Divider, useTheme,
} from "@mui/material";
import AssignmentOutlinedIcon       from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlineIcon       from "@mui/icons-material/CheckCircleOutline";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import AccessTimeOutlinedIcon       from "@mui/icons-material/AccessTimeOutlined";
import CalendarTodayOutlinedIcon    from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon       from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineOutlinedIcon    from "@mui/icons-material/PersonOutlineOutlined";
import { supabase }                 from "../../lib/supabaseClient";

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

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
};

// ─── Card shell ───────────────────────────────────────────────────────────────
function Card({ children, sx = {} }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box sx={{
      bgcolor: "background.paper",
      borderRadius: 3,
      border: `1px solid ${isDark ? BRAND.borderDark : BRAND.borderLight}`,
      overflow: "hidden",
      ...sx,
    }}>
      {children}
    </Box>
  );
}

function SectionHeader({ title }) {
  return (
    <Box sx={{ px: 2.5, pt: 2, pb: 1.5 }}>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.09em" }}>
        {title}
      </Typography>
    </Box>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const border   = isDark ? BRAND.borderDark  : BRAND.borderLight;
  const surf     = isDark ? BRAND.surfDark    : BRAND.surfLight;
  const iconWell = isDark ? BRAND.goldAlpha15 : BRAND.goldAlpha12;

  const [currentUser,    setCurrentUser]    = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);
  const [dutySchedule,   setDutySchedule]   = useState(null);
  const [assignments,    setAssignments]    = useState([]);
  const [loading,        setLoading]        = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, section, division, role")
        .eq("id", user.id).single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadSemester() {
      const { data } = await supabase
        .from("semesters").select("*").eq("is_active", true).single();
      setActiveSemester(data || null);
    }
    loadSemester();
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser?.id || !activeSemester?.id) return;
    setLoading(true);

    const { data: duty } = await supabase
      .from("duty_schedules").select("duty_day")
      .eq("staffer_id", currentUser.id).eq("semester_id", activeSemester.id).single();
    setDutySchedule(duty || null);

    const { data: assignmentData } = await supabase
      .from("coverage_assignments")
      .select(`
        id, status, section, assigned_at,
        assigned_by_profile:assigned_by ( full_name ),
        request:request_id (
          title, event_date, from_time, to_time, venue,
          entity:entity_id ( name )
        )
      `)
      .eq("assigned_to", currentUser.id)
      .order("assigned_at", { ascending: false })
      .limit(5);

    setAssignments(assignmentData || []);
    setLoading(false);
  }, [currentUser, activeSemester]);

  useEffect(() => { loadData(); }, [loadData]);

  const total     = assignments.length;
  const pending   = assignments.filter((a) => a.status === "Pending").length;
  const completed = assignments.filter((a) => a.status === "Completed").length;

  if (!currentUser || loading) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <CircularProgress size={32} sx={{ color: BRAND.gold }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 800, fontSize: "1.1rem", color: "text.primary", letterSpacing: "-0.02em" }}>
          {getGreeting()}, {currentUser.full_name?.split(" ")[0]} 👋
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {currentUser.section} · {currentUser.division}
          </Typography>
          {dutySchedule ? (
            <Chip
              icon={<CalendarTodayOutlinedIcon sx={{ fontSize: "12px !important", color: `${isDark ? BRAND.gold : "#7a5c00"} !important` }} />}
              label={`Duty: ${DAY_LABELS[dutySchedule.duty_day]}s`}
              size="small"
              sx={{
                fontSize: "0.7rem", fontWeight: 600, height: 20,
                backgroundColor: iconWell,
                color: isDark ? BRAND.gold : "#7a5c00",
                border: `1px solid ${isDark ? "rgba(245,197,43,0.25)" : "rgba(245,197,43,0.4)"}`,
              }}
            />
          ) : (
            <Chip
              label="No duty day set"
              size="small"
              sx={{
                fontSize: "0.7rem", height: 20,
                backgroundColor: surf,
                color: "text.disabled",
                border: `1px solid ${border}`,
              }}
            />
          )}
        </Box>
      </Box>

      {/* ── ROW 1: Hero + 3 KPI cards ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "220px repeat(3, 1fr)", gap: 1.5, mb: 2.5 }}>

        {/* Hero card */}
        <Box sx={{
          borderRadius: 3, overflow: "hidden", position: "relative",
          background: isDark
            ? `linear-gradient(140deg, #1e1a00 0%, ${BRAND.charcoal} 55%, #141400 100%)`
            : `linear-gradient(140deg, ${BRAND.charcoal} 0%, #1a1a1a 60%, #0d0d0d 100%)`,
          p: 2.5, display: "flex", flexDirection: "column", justifyContent: "space-between", minHeight: 130,
        }}>
          <Box sx={{ position: "absolute", top: -32, right: -32, width: 96,  height: 96,  borderRadius: "50%", border: `1.5px solid ${BRAND.goldAlpha12}`,        pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", top: -14, right: -14, width: 58,  height: 58,  borderRadius: "50%", border: `1.5px solid rgba(245,197,43,0.07)`,       pointerEvents: "none" }} />
          <Box sx={{ position: "absolute", bottom: -20, left: -20, width: 68, height: 68, borderRadius: "50%", backgroundColor: "rgba(245,197,43,0.04)",          pointerEvents: "none" }} />

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

            {pending > 0 ? (
              <>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: BRAND.white, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                  {pending} assignment{pending > 1 ? "s" : ""} pending
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", mt: 0.5 }}>Ready for coverage</Typography>
              </>
            ) : completed > 0 ? (
              <>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: BRAND.white, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                  {completed} assignment{completed > 1 ? "s" : ""} completed
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", mt: 0.5 }}>Great work</Typography>
              </>
            ) : (
              <>
                <Typography sx={{ fontSize: "0.95rem", fontWeight: 800, color: BRAND.white, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                  No assignments yet
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", mt: 0.5 }}>Nothing assigned to you</Typography>
              </>
            )}
          </Box>

          {dutySchedule && (
            <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.38)", mt: 1.5 }}>
              📅 Duty every {DAY_LABELS[dutySchedule.duty_day]}
            </Typography>
          )}
        </Box>

        {/* 3 KPI cards */}
        {[
          { label: "Total",     value: total,     sub: "assignments",    icon: AssignmentOutlinedIcon,   isRed: false },
          { label: "Pending",   value: pending,   sub: "to be covered",  icon: AccessTimeOutlinedIcon,   isRed: pending > 0 },
          { label: "Completed", value: completed, sub: "done",           icon: CheckCircleOutlineIcon,   isRed: false },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <Box key={k.label} sx={{
              bgcolor: "background.paper", borderRadius: 3, border: `1px solid ${border}`,
              p: 2.5, minHeight: 130, display: "flex", flexDirection: "column", justifyContent: "space-between",
            }}>
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
          );
        })}
      </Box>

      {/* ── Recent Assignments ── */}
      <Card>
        <SectionHeader title="Recent Assignments" />
        <Divider sx={{ borderColor: border }} />

        {assignments.length === 0 ? (
          <Box sx={{ py: 5, textAlign: "center" }}>
            <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 32, color: isDark ? "#444" : "#ddd", mb: 1 }} />
            <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>No assignments yet.</Typography>
          </Box>
        ) : (
          assignments.map((a, idx) => (
            <Box
              key={a.id}
              sx={{
                px: 2.5, py: 1.75,
                borderBottom: idx < assignments.length - 1 ? `1px solid ${border}` : "none",
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
                // left accent bar
                borderLeft: "3px solid",
                borderLeftColor: a.status === "Completed"
                  ? isDark ? "#444" : "#ddd"
                  : BRAND.gold,
                backgroundColor: a.status === "Pending"
                  ? isDark ? "rgba(245,197,43,0.03)" : "rgba(245,197,43,0.03)"
                  : "transparent",
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: "text.primary", mb: 0.35, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.request?.title || "—"}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  {a.request?.event_date && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                      <CalendarTodayOutlinedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                        {new Date(a.request.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {a.request.from_time && ` · ${a.request.from_time}`}
                      </Typography>
                    </Box>
                  )}
                  {a.request?.venue && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{a.request.venue}</Typography>
                    </Box>
                  )}
                  {a.request?.entity?.name && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                      <PersonOutlineOutlinedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{a.request.entity.name}</Typography>
                    </Box>
                  )}
                </Box>
                {a.assigned_by_profile?.full_name && (
                  <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 0.4 }}>
                    Assigned by {a.assigned_by_profile.full_name}
                  </Typography>
                )}
              </Box>
              <Chip
                label={a.status} size="small"
                sx={{
                  fontSize: "0.68rem", fontWeight: 600, flexShrink: 0, height: 20,
                  backgroundColor: a.status === "Completed"
                    ? isDark ? "rgba(255,255,255,0.07)" : "rgba(53,53,53,0.07)"
                    : isDark ? BRAND.goldAlpha15 : BRAND.goldAlpha12,
                  color: a.status === "Completed"
                    ? isDark ? "#aaa" : "#555"
                    : isDark ? BRAND.gold : "#7a5c00",
                }}
              />
            </Box>
          ))
        )}
      </Card>

    </Box>
  );
}