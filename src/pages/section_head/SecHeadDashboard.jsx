// src/pages/sechead/SecHeadDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Chip, Avatar, useTheme,
} from "@mui/material";
import AssignmentOutlinedIcon     from "@mui/icons-material/AssignmentOutlined";
import AccessTimeOutlinedIcon     from "@mui/icons-material/AccessTimeOutlined";
import TaskAltOutlinedIcon        from "@mui/icons-material/TaskAltOutlined";
import CalendarTodayOutlinedIcon  from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon     from "@mui/icons-material/LocationOnOutlined";
import GroupOutlinedIcon          from "@mui/icons-material/GroupOutlined";
import { supabase } from "../../lib/supabaseClient";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_COLORS = ["#e3f2fd", "#f3e5f5", "#e8f5e9", "#fff3e0", "#fce4ec"];
const DAY_TEXT   = ["#1565c0", "#6a1b9a", "#2e7d32", "#e65100", "#880e4f"];

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const STATUS_STYLES = {
  Forwarded:           { backgroundColor: "#f3e5f5", color: "#7b1fa2" },
  Assigned:            { backgroundColor: "#e3f2fd", color: "#1565c0" },
  "Coverage Complete": { backgroundColor: "#e8f5e9", color: "#2e7d32" },
};

export default function SecHeadDashboard() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

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
        .from("profiles").select("id, full_name, role, section, division").eq("id", user.id).single();
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
      .select("id, status, title, event_date, venue, forwarded_at, entity:entity_id(name)")
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
        .from("profiles").select("id, full_name, section, role")
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

  const dutyDaySet   = teamSnapshot.filter((s) => s.dutyDay !== null).length;
  const dutyDayUnset = teamSnapshot.filter((s) => s.dutyDay === null).length;

  const statCards = [
    { label: "Needs Assignment", value: stats.pending,  icon: <AccessTimeOutlinedIcon />, bg: "#f3e5f5", color: "#7b1fa2" },
    { label: "In Progress",      value: stats.assigned, icon: <AssignmentOutlinedIcon />, bg: "#e3f2fd", color: "#1565c0" },
    { label: "Coverage Done",    value: stats.complete, icon: <TaskAltOutlinedIcon />,    bg: "#e8f5e9", color: "#2e7d32" },
  ];

  const dataGridSx = {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: "0.9rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-cell":          { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-columnHeaders": { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", backgroundColor: isDark ? "#2a2a2a" : "#fafafa", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-footerContainer":{ backgroundColor: isDark ? "#1e1e1e" : "#fff", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-row:hover":     { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":   { color: "text.secondary" },
  };

  if (!currentUser || loading) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
    </Box>
  );

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
          {activeSemester && (
            <Chip label={activeSemester.name} size="small"
              sx={{ fontSize: "0.75rem", backgroundColor: "#fffde7", color: "#f57c00", fontWeight: 600, border: "1px solid #f5c52b" }} />
          )}
        </Box>
      </Box>

      {/* Stat cards */}
      <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
        {statCards.map((stat) => (
          <Box key={stat.label} sx={{ flex: "1 1 160px", bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider", p: 2.5 }}>
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

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>

        {/* Recent requests */}
        <Box sx={{ flex: "2 1 400px" }}>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1.5 }}>Recent forwarded requests</Typography>
          <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
            {recentRequests.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <AssignmentOutlinedIcon sx={{ fontSize: 36, color: "divider", mb: 1 }} />
                <Typography sx={{ fontSize: "0.88rem", color: "text.secondary" }}>No requests yet.</Typography>
              </Box>
            ) : (
              recentRequests.map((r, idx) => (
                <Box key={r.id} sx={{
                  px: 2.5, py: 2,
                  borderBottom: idx < recentRequests.length - 1 ? "1px solid" : "none",
                  borderColor: "divider",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2,
                }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", color: "text.primary", mb: 0.4 }}>
                      {r.title}
                    </Typography>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                      {r.event_date && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                          <CalendarTodayOutlinedIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                            {new Date(r.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </Typography>
                        </Box>
                      )}
                      {r.venue && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                          <LocationOnOutlinedIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{r.venue}</Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>
                  <Chip label={r.status} size="small" sx={{ fontSize: "0.72rem", fontWeight: 600, flexShrink: 0, ...(STATUS_STYLES[r.status] || { backgroundColor: "#f5f5f5", color: "#757575" }) }} />
                </Box>
              ))
            )}
          </Box>
        </Box>

        {/* Team snapshot */}
        <Box sx={{ flex: "1 1 240px" }}>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1.5 }}>Team — {currentUser.division}</Typography>
          <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <GroupOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>Duty days set</Typography>
              </Box>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: dutyDayUnset > 0 ? "#e65100" : "#2e7d32" }}>
                {dutyDaySet}/{teamSnapshot.length}
              </Typography>
            </Box>
            {teamSnapshot.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>No team members found.</Typography>
              </Box>
            ) : (
              teamSnapshot.map((s, idx) => (
                <Box key={s.id} sx={{
                  px: 2.5, py: 1.5,
                  borderBottom: idx < teamSnapshot.length - 1 ? "1px solid" : "none",
                  borderColor: "divider",
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
                }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar sx={{ width: 28, height: 28, fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#f5c52b", color: "#212121" }}>
                      {getInitials(s.full_name)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: "0.82rem", fontWeight: 500, color: "text.primary" }}>{s.full_name}</Typography>
                      <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{s.section}</Typography>
                    </Box>
                  </Box>
                  {s.dutyDay !== null ? (
                    <Chip label={DAY_LABELS[s.dutyDay]} size="small"
                      sx={{ fontSize: "0.68rem", fontWeight: 600, backgroundColor: DAY_COLORS[s.dutyDay], color: DAY_TEXT[s.dutyDay] }} />
                  ) : (
                    <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>Not set</Typography>
                  )}
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}