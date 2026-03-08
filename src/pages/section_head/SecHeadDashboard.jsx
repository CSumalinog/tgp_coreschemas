// src/pages/section_head/SecHeadDashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Chip, Avatar, Tooltip, useTheme,
} from "@mui/material";
import { useNavigate }              from "react-router-dom";
import AssignmentOutlinedIcon       from "@mui/icons-material/AssignmentOutlined";
import AccessTimeOutlinedIcon       from "@mui/icons-material/AccessTimeOutlined";
import TaskAltOutlinedIcon          from "@mui/icons-material/TaskAltOutlined";
import CalendarTodayOutlinedIcon    from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon       from "@mui/icons-material/LocationOnOutlined";
import GroupOutlinedIcon            from "@mui/icons-material/GroupOutlined";
import OpenInNewOutlinedIcon        from "@mui/icons-material/OpenInNewOutlined";
import { supabase }                 from "../../lib/supabaseClient";
import { getAvatarUrl }             from "../../components/common/UserAvatar";

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

const STATUS_TO_TAB = {
  "Forwarded":          "for-assignment",
  "Assigned":           "assigned",
  "For Approval":       "assigned",
  "Coverage Complete":  "history",
  "Approved":           "history",
  "Declined":           "history",
};

export default function SecHeadDashboard() {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === "dark";
  const navigate = useNavigate();

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
        .from("profiles").select("id, full_name, section, role, avatar_url")
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
  const goToRequest = (status) => goToTab(STATUS_TO_TAB[status] || "for-assignment");

  const dutyDaySet   = teamSnapshot.filter((s) => s.dutyDay !== null).length;
  const dutyDayUnset = teamSnapshot.filter((s) => s.dutyDay === null).length;

  const border = isDark ? "#2e2e2e" : "#ebebeb";

  const statCards = [
    {
      label: "Needs Assignment", value: stats.pending,
      icon: AccessTimeOutlinedIcon,
      accent: isDark ? "#1e0a2e" : "#f3e5f5", iconColor: "#7b1fa2",
      valueColor: "#7b1fa2",
      tab: "for-assignment", tooltip: "Go to For Assignment",
    },
    {
      label: "In Progress", value: stats.assigned,
      icon: AssignmentOutlinedIcon,
      accent: isDark ? "#0d2137" : "#e3f2fd", iconColor: "#1565c0",
      valueColor: "#1565c0",
      tab: "assigned", tooltip: "Go to Assigned",
    },
    {
      label: "Coverage Done", value: stats.complete,
      icon: TaskAltOutlinedIcon,
      accent: isDark ? "#0a2210" : "#e8f5e9", iconColor: "#2e7d32",
      valueColor: "#2e7d32",
      tab: "history", tooltip: "Go to History",
    },
  ];

  if (!currentUser || loading) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "text.primary", letterSpacing: "-0.01em" }}>
          {getGreeting()}, {currentUser.full_name?.split(" ")[0]} 👋
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
            {currentUser.section} · {currentUser.division}
          </Typography>
          {activeSemester && (
            <Chip label={activeSemester.name} size="small"
              sx={{ fontSize: "0.72rem", backgroundColor: isDark ? "#2a2200" : "#fffde7", color: "#f57c00", fontWeight: 600, border: "1px solid #f5c52b" }} />
          )}
        </Box>
      </Box>

      {/* ── Stat cards ── */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1.5, mb: 2.5 }}>
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Tooltip key={stat.label} title={stat.tooltip} placement="top" arrow>
              <Box
                onClick={() => goToTab(stat.tab)}
                sx={{
                  bgcolor: "background.paper", borderRadius: 2.5,
                  border: `1px solid ${border}`,
                  p: 2, cursor: "pointer",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  "&:hover": { borderColor: "#f5c52b", boxShadow: "0 2px 8px rgba(245,197,43,0.15)" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                  <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontWeight: 500 }}>{stat.label}</Typography>
                  <Box sx={{ width: 28, height: 28, borderRadius: 1.5, backgroundColor: stat.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon sx={{ fontSize: 14, color: stat.iconColor }} />
                  </Box>
                </Box>
                <Typography sx={{ fontSize: "1.75rem", fontWeight: 750, color: stat.valueColor, lineHeight: 1, letterSpacing: "-0.02em" }}>
                  {stat.value}
                </Typography>
                <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", mt: 0.5 }}>requests</Typography>
              </Box>
            </Tooltip>
          );
        })}
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>

        {/* ── Recent requests ── */}
        <Box sx={{ flex: "2 1 400px" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 650, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Recent Requests
            </Typography>
            <Tooltip title="View all in Assignment Management" arrow>
              <Box
                onClick={() => goToTab("for-assignment")}
                sx={{ display: "flex", alignItems: "center", gap: 0.3, cursor: "pointer", color: "text.disabled", "&:hover": { color: "#f5c52b" }, transition: "color 0.15s" }}
              >
                <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: "0.7rem" }}>View all</Typography>
              </Box>
            </Tooltip>
          </Box>

          <Box sx={{ bgcolor: "background.paper", borderRadius: 2.5, border: `1px solid ${border}`, overflow: "hidden" }}>
            {recentRequests.length === 0 ? (
              <Box sx={{ p: 4, textAlign: "center" }}>
                <AssignmentOutlinedIcon sx={{ fontSize: 36, color: isDark ? "#333" : "#e0e0e0", mb: 1 }} />
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
                      display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2,
                      cursor: "pointer",
                      transition: "background 0.15s",
                      "&:hover": { backgroundColor: isDark ? "#1e1e1e" : "#fafafa" },
                    }}
                  >
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", color: "text.primary", mb: 0.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                    <Chip label={r.status} size="small"
                      sx={{ fontSize: "0.68rem", fontWeight: 600, flexShrink: 0, ...(STATUS_STYLES[r.status] || { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5", color: "text.secondary" }) }} />
                  </Box>
                </Tooltip>
              ))
            )}
          </Box>
        </Box>

        {/* ── Team snapshot ── */}
        <Box sx={{ flex: "1 1 240px" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
            <Typography sx={{ fontSize: "0.78rem", fontWeight: 650, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Team — {currentUser.division}
            </Typography>
            <Tooltip title="Manage staffers" arrow>
              <Box
                onClick={() => navigate("/sec_head/my-staffers")}
                sx={{ display: "flex", alignItems: "center", gap: 0.3, cursor: "pointer", color: "text.disabled", "&:hover": { color: "#f5c52b" }, transition: "color 0.15s" }}
              >
                <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />
                <Typography sx={{ fontSize: "0.7rem" }}>Manage</Typography>
              </Box>
            </Tooltip>
          </Box>

          <Box sx={{ bgcolor: "background.paper", borderRadius: 2.5, border: `1px solid ${border}`, overflow: "hidden" }}>
            {/* Duty day summary row */}
            <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <GroupOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Duty days set</Typography>
              </Box>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: dutyDayUnset > 0 ? "#e65100" : "#2e7d32" }}>
                {dutyDaySet}/{teamSnapshot.length}
              </Typography>
            </Box>

            {teamSnapshot.length === 0 ? (
              <Box sx={{ p: 3, textAlign: "center" }}>
                <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>No team members found.</Typography>
              </Box>
            ) : (
              teamSnapshot.map((s, idx) => {
                const url = getAvatarUrl(s.avatar_url);
                return (
                  <Tooltip key={s.id} title="View in My Staffers" placement="left" arrow>
                    <Box
                      onClick={() => navigate("/sec_head/my-staffers")}
                      sx={{
                        px: 2.5, py: 1.5,
                        borderBottom: idx < teamSnapshot.length - 1 ? `1px solid ${border}` : "none",
                        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1,
                        cursor: "pointer",
                        transition: "background 0.15s",
                        "&:hover": { backgroundColor: isDark ? "#1e1e1e" : "#fafafa" },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
                        <Avatar src={url} sx={{ width: 32, height: 32, fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#f5c52b", color: "#212121" }}>
                          {!url && getInitials(s.full_name)}
                        </Avatar>
                        <Box>
                          <Typography sx={{ fontSize: "0.88rem", fontWeight: 500, color: "text.primary" }}>{s.full_name}</Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{s.section}</Typography>
                        </Box>
                      </Box>
                      {s.dutyDay !== null ? (
                        <Chip label={DAY_LABELS[s.dutyDay]} size="small"
                          sx={{ fontSize: "0.68rem", fontWeight: 600, backgroundColor: DAY_COLORS[s.dutyDay], color: DAY_TEXT[s.dutyDay] }} />
                      ) : (
                        <Typography sx={{ fontSize: "0.7rem", color: isDark ? "#555" : "#bdbdbd" }}>Not set</Typography>
                      )}
                    </Box>
                  </Tooltip>
                );
              })
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}