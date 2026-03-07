// src/pages/regular_staff/StaffDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Chip, useTheme,
} from "@mui/material";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import { supabase } from "../../lib/supabaseClient";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function StaffDashboard() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [currentUser, setCurrentUser]     = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);
  const [dutySchedule, setDutySchedule]   = useState(null);
  const [assignments, setAssignments]     = useState([]);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, section, division, role")
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
        .select("*")
        .eq("is_active", true)
        .single();
      setActiveSemester(data || null);
    }
    loadSemester();
  }, []);

  const loadData = useCallback(async () => {
    if (!currentUser?.id || !activeSemester?.id) return;
    setLoading(true);

    const { data: duty } = await supabase
      .from("duty_schedules")
      .select("duty_day")
      .eq("staffer_id", currentUser.id)
      .eq("semester_id", activeSemester.id)
      .single();
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

  if (!currentUser || loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.primary" }}>
          {getGreeting()}, {currentUser.full_name?.split(" ")[0]} 👋
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
            {currentUser.section} · {currentUser.division}
          </Typography>
          {dutySchedule ? (
            <Chip
              icon={<CalendarTodayOutlinedIcon sx={{ fontSize: "13px !important" }} />}
              label={`Duty day: ${DAY_LABELS[dutySchedule.duty_day]}s`}
              size="small"
              sx={{ fontSize: "0.75rem", backgroundColor: isDark ? "#2a2200" : "#fffde7", color: "#f57c00", fontWeight: 600, border: "1px solid #f5c52b" }}
            />
          ) : (
            <Chip
              label="No duty day set"
              size="small"
              sx={{ fontSize: "0.75rem", backgroundColor: isDark ? "#2a2a2a" : "#fafafa", color: "text.disabled", border: isDark ? "1px solid #333" : "1px solid #e0e0e0" }}
            />
          )}
        </Box>
      </Box>

      {/* Stat cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {[
          { label: "Total Assignments", value: total,     icon: <AssignmentOutlinedIcon />, bg: isDark ? "#0d2137" : "#e3f2fd", color: "#1565c0" },
          { label: "Pending",           value: pending,   icon: <AccessTimeOutlinedIcon />, bg: isDark ? "#2a1a00" : "#fff3e0", color: "#e65100" },
          { label: "Completed",         value: completed, icon: <CheckCircleOutlineIcon />, bg: isDark ? "#0a2210" : "#e8f5e9", color: "#2e7d32" },
        ].map((stat) => (
          <Box
            key={stat.label}
            sx={{
              flex: "1 1 160px",
              bgcolor: "background.paper",
              borderRadius: 2,
              border: isDark ? "1px solid #2e2e2e" : "1px solid #e0e0e0",
              p: 2.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{stat.label}</Typography>
              <Box sx={{ p: 0.8, borderRadius: 1.5, backgroundColor: stat.bg, color: stat.color, display: "flex" }}>
                {React.cloneElement(stat.icon, { sx: { fontSize: 16 } })}
              </Box>
            </Box>
            <Typography sx={{ fontSize: "1.8rem", fontWeight: 700, color: "text.primary", lineHeight: 1 }}>
              {stat.value}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Recent assignments */}
      <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1.5 }}>
        Recent assignments — showing latest 5
      </Typography>

      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: isDark ? "1px solid #2e2e2e" : "1px solid #e0e0e0", overflow: "hidden" }}>
        {assignments.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <AssignmentOutlinedIcon sx={{ fontSize: 36, color: isDark ? "#444" : "#e0e0e0", mb: 1 }} />
            <Typography sx={{ fontSize: "0.88rem", color: "text.disabled" }}>
              No assignments yet.
            </Typography>
          </Box>
        ) : (
          assignments.map((a, idx) => (
            <Box
              key={a.id}
              sx={{
                px: 2.5, py: 2,
                borderBottom: idx < assignments.length - 1 ? `1px solid ${isDark ? "#2e2e2e" : "#f5f5f5"}` : "none",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", color: "text.primary", mb: 0.5 }}>
                  {a.request?.title || "—"}
                </Typography>
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                  {a.request?.event_date && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                      <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                        {new Date(a.request.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {a.request.from_time && ` · ${a.request.from_time}`}
                      </Typography>
                    </Box>
                  )}
                  {a.request?.venue && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{a.request.venue}</Typography>
                    </Box>
                  )}
                  {a.request?.entity?.name && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                      <PersonOutlineOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{a.request.entity.name}</Typography>
                    </Box>
                  )}
                </Box>
                {a.assigned_by_profile?.full_name && (
                  <Typography sx={{ fontSize: "0.75rem", color: "text.disabled", mt: 0.5 }}>
                    Assigned by {a.assigned_by_profile.full_name}
                  </Typography>
                )}
              </Box>
              <Chip
                label={a.status}
                size="small"
                sx={{
                  fontSize: "0.75rem", fontWeight: 600, flexShrink: 0,
                  backgroundColor: a.status === "Completed" ? "#e8f5e9" : "#fff3e0",
                  color: a.status === "Completed" ? "#2e7d32" : "#e65100",
                }}
              />
            </Box>
          ))
        )}
      </Box>
    </Box>
  );
}