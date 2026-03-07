// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, CircularProgress, Chip, Alert, Divider, Avatar,
  MenuItem, Select, FormControl, Button, Tabs, Tab, useTheme,
} from "@mui/material";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { supabase } from "../../lib/supabaseClient";
import ReportGenerator from "../../components/admin/ReportGenerator";

const SECTION_COLORS = {
  News:            { bg: "#e3f2fd", color: "#1565c0" },
  Photojournalism: { bg: "#f3e5f5", color: "#7b1fa2" },
  Videojournalism: { bg: "#e8f5e9", color: "#2e7d32" },
};

const STATUS_STYLES = {
  Pending:             { bg: "#fff3e0",  color: "#e65100" },
  Forwarded:           { bg: "#f3e5f5",  color: "#7b1fa2" },
  Assigned:            { bg: "#e3f2fd",  color: "#1565c0" },
  "Coverage Complete": { bg: "#e8f5e9",  color: "#2e7d32" },
  Approved:            { bg: "#fffde7",  color: "#f57c00" },
  Declined:            { bg: "#ffebee",  color: "#c62828" },
};

const PIPELINE_STAGES = [
  { key: "Pending",           label: "Pending",   icon: <PendingActionsOutlinedIcon sx={{ fontSize: 18 }} /> },
  { key: "Forwarded",         label: "Forwarded", icon: <ForwardToInboxOutlinedIcon sx={{ fontSize: 18 }} /> },
  { key: "Assigned",          label: "Assigned",  icon: <AssignmentOutlinedIcon sx={{ fontSize: 18 }} />, hint: "Staffers set, ready for approval" },
  { key: "Approved",          label: "Approved",  icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 18 }} /> },
  { key: "Coverage Complete", label: "Covered",   icon: <TaskAltOutlinedIcon sx={{ fontSize: 18 }} /> },
];

function toEndOfDay(dateStr) {
  return new Date(dateStr).toISOString().split("T")[0] + "T23:59:59";
}

function getUrgency(event_date) {
  if (!event_date) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const evDate = new Date(event_date);
  evDate.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((evDate - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0)  return "overdue";
  if (diffDays <= 3) return "critical";
  if (diffDays <= 7) return "soon";
  return "upcoming";
}

const URGENCY_STYLES = {
  overdue:  { bg: "#ffebee", color: "#c62828", border: "#ef9a9a", label: "Overdue",  dot: "#c62828" },
  critical: { bg: "#fff3e0", color: "#e65100", border: "#ffcc80", label: "Critical", dot: "#e65100" },
  soon:     { bg: "#fffde7", color: "#f57c00", border: "#fff176", label: "Soon",     dot: "#f57c00" },
  upcoming: { bg: "#f5f5f5", color: "#757575", border: "#e0e0e0", label: "Upcoming", dot: "#bdbdbd" },
};

export default function Dashboard() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [semesters, setSemesters]               = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [isAllTime, setIsAllTime]               = useState(false);
  const [activeSemester, setActiveSemester]     = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState("");

  const [statusCounts, setStatusCounts]       = useState({});
  const [perfStats, setPerfStats]             = useState({ total: 0, approved: 0, declined: 0, declineRate: 0, completionRate: 0, avgTurnaround: null });
  const [sectionWorkload, setSectionWorkload] = useState([]);
  const [recentRequests, setRecentRequests]   = useState([]);
  const [scheduleStats, setScheduleStats]     = useState({ total: 0, set: 0 });
  const [activeTab, setActiveTab]             = useState(0);

  const channelRef = useRef(null);

  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase
        .from("semesters")
        .select("id, name, start_date, end_date, is_active, scheduling_open")
        .order("start_date", { ascending: false });
      setSemesters(data || []);
      const active = (data || []).find((s) => s.is_active);
      setActiveSemester(active || null);
      setSelectedSemester(active || (data || [])[0] || null);
    }
    loadSemesters();
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!selectedSemester && !isAllTime) return;

    let isCurrent = true;
    setLoading(true);
    setError("");

    try {
      let requestQuery = supabase
        .from("coverage_requests")
        .select("id, title, status, event_date, venue, submitted_at, approved_at, entity:entity_id(name)");

      if (!isAllTime && selectedSemester) {
        requestQuery = requestQuery
          .gte("submitted_at", selectedSemester.start_date)
          .lte("submitted_at", toEndOfDay(selectedSemester.end_date));
      }

      const { data: requests, error: reqErr } = await requestQuery.order("submitted_at", { ascending: false });
      if (reqErr) throw reqErr;
      if (!isCurrent) return;

      const counts = {};
      (requests || []).forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
      setStatusCounts(counts);

      const total    = requests?.length || 0;
      const approved = (requests || []).filter((r) => r.status === "Approved").length;
      const declined = (requests || []).filter((r) => r.status === "Declined").length;
      const covered  = (requests || []).filter((r) => ["Coverage Complete", "Approved"].includes(r.status)).length;
      const assigned = (requests || []).filter((r) => ["Assigned", "Coverage Complete", "Approved"].includes(r.status)).length;
      const declineRate    = total > 0 ? ((declined / total) * 100).toFixed(1) : 0;
      const completionRate = assigned > 0 ? ((covered / assigned) * 100).toFixed(1) : 0;

      const turnaroundDays = (requests || [])
        .filter((r) => r.approved_at && r.submitted_at)
        .map((r) => (new Date(r.approved_at) - new Date(r.submitted_at)) / (1000 * 60 * 60 * 24));
      const avgTurnaround = turnaroundDays.length > 0
        ? (turnaroundDays.reduce((a, b) => a + b, 0) / turnaroundDays.length).toFixed(1)
        : null;

      setPerfStats({ total, approved, declined, declineRate, completionRate, avgTurnaround });

      const attention = (requests || [])
        .filter((r) => ["Pending", "Forwarded", "Assigned"].includes(r.status))
        .map((r) => ({ ...r, urgency: getUrgency(r.event_date) }))
        .sort((a, b) => {
          const order = { overdue: 0, critical: 1, soon: 2, upcoming: 3 };
          if (order[a.urgency] !== order[b.urgency]) return order[a.urgency] - order[b.urgency];
          return new Date(a.event_date || 0) - new Date(b.event_date || 0);
        })
        .slice(0, 8);
      setRecentRequests(attention);

      let assignQuery = supabase.from("coverage_assignments").select("section, status, assigned_at");
      if (!isAllTime && selectedSemester) {
        assignQuery = assignQuery
          .gte("assigned_at", selectedSemester.start_date)
          .lte("assigned_at", toEndOfDay(selectedSemester.end_date));
      }
      const { data: assignments } = await assignQuery;
      if (!isCurrent) return;

      const sectionMap = {
        News:            { pending: 0, completed: 0 },
        Photojournalism: { pending: 0, completed: 0 },
        Videojournalism: { pending: 0, completed: 0 },
      };
      (assignments || []).forEach((a) => {
        if (sectionMap[a.section]) {
          if (a.status === "Pending")   sectionMap[a.section].pending++;
          if (a.status === "Completed") sectionMap[a.section].completed++;
        }
      });
      setSectionWorkload(Object.entries(sectionMap).map(([section, data]) => ({ section, ...data })));

      if (activeSemester?.id) {
        const { data: staffers } = await supabase
          .from("profiles").select("id").eq("is_active", true).in("role", ["staff", "sec_head"]);
        const { data: dutySchedules } = await supabase
          .from("duty_schedules").select("staffer_id").eq("semester_id", activeSemester.id);
        if (!isCurrent) return;
        setScheduleStats({ total: (staffers || []).length, set: (dutySchedules || []).length });
      }
    } catch (err) {
      if (isCurrent) setError(err.message);
    } finally {
      if (isCurrent) setLoading(false);
    }

    return () => { isCurrent = false; };
  }, [selectedSemester, isAllTime, activeSemester]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const loadDashboardRef = useRef(loadDashboard);
  useEffect(() => { loadDashboardRef.current = loadDashboard; }, [loadDashboard]);

  useEffect(() => {
    const channel = supabase
      .channel("dashboard-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "coverage_requests" },    () => { loadDashboardRef.current(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "coverage_assignments" }, () => { loadDashboardRef.current(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "duty_schedules" },       () => { loadDashboardRef.current(); })
      .subscribe();
    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, []);

  const declined = statusCounts["Declined"] || 0;

  // Dark-aware stat card icon backgrounds
  const statCards = [
    { label: "Total Submitted", value: perfStats.total,     sub: isAllTime ? "All time" : selectedSemester?.name, icon: <AssignmentOutlinedIcon />,         bg: isDark ? "#2a2a2a" : "#f5f5f5", color: "#757575" },
    { label: "Approved",        value: perfStats.approved,  sub: "Events covered",                                icon: <CheckCircleOutlineOutlinedIcon />, bg: isDark ? "#0a2210" : "#e8f5e9", color: "#2e7d32" },
    { label: "Declined",        value: perfStats.declined,  sub: `${perfStats.declineRate}% decline rate`,        icon: <CancelOutlinedIcon />,            bg: isDark ? "#2a0a0a" : "#ffebee", color: "#c62828" },
    { label: "Completion Rate", value: `${perfStats.completionRate}%`, sub: "Of assigned events covered",        icon: <TrendingUpOutlinedIcon />,         bg: isDark ? "#0d2137" : "#e3f2fd", color: "#1565c0" },
    { label: "Avg Turnaround",  value: perfStats.avgTurnaround !== null ? `${perfStats.avgTurnaround}d` : "—", sub: "Submitted to approved", icon: <AccessTimeOutlinedIcon />, bg: isDark ? "#2a1a00" : "#fff3e0", color: "#e65100" },
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* Header + Controls */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 550, fontSize: "1.1rem", color: "text.primary" }}>Dashboard</Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.3 }}>
            System overview — coverage requests, assignments, and scheduling.
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant={isAllTime ? "contained" : "outlined"}
            onClick={() => setIsAllTime((prev) => !prev)}
            sx={{
              textTransform: "none", fontSize: "0.78rem", borderRadius: 2, boxShadow: "none",
              borderColor: isDark ? "#444" : "#e0e0e0",
              color: isAllTime ? "#212121" : "text.secondary",
              backgroundColor: isAllTime ? "#f5c52b" : "background.paper",
              "&:hover": { backgroundColor: isAllTime ? "#e6b920" : isDark ? "#2a2a2a" : "#f5f5f5", boxShadow: "none", borderColor: isDark ? "#444" : "#e0e0e0" },
            }}
          >
            All Time
          </Button>
          <FormControl size="small" disabled={isAllTime}>
            <Select
              value={selectedSemester?.id || ""}
              onChange={(e) => setSelectedSemester(semesters.find((s) => s.id === e.target.value) || null)}
              sx={{
                fontSize: "0.82rem", borderRadius: 2,
                backgroundColor: isAllTime ? (isDark ? "#2a2a2a" : "#f5f5f5") : "background.paper",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: isDark ? "#444" : "#e0e0e0" },
                minWidth: 190,
              }}
            >
              {semesters.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.82rem" }}>
                  {s.name}
                  {s.is_active && <Chip label="Active" size="small" sx={{ ml: 1, fontSize: "0.65rem", height: 16, backgroundColor: "#e8f5e9", color: "#2e7d32" }} />}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onChange={(_, v) => setActiveTab(v)}
        sx={{
          mb: 3,
          "& .MuiTabs-indicator": { backgroundColor: "#f5c52b", height: 2.5 },
          "& .MuiTab-root":       { textTransform: "none", fontSize: "0.82rem", fontWeight: 500, color: "text.secondary", minHeight: 38, py: 0.5 },
          "& .Mui-selected":      { color: "text.primary !important", fontWeight: 550 },
          borderBottom: isDark ? "1px solid #2e2e2e" : "1px solid #e0e0e0",
        }}
      >
        <Tab label="Overview" />
        <Tab label="Reports" />
      </Tabs>

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
          <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
        </Box>
      ) : (
        <>
          {activeTab === 0 && (
            <>
              {/* Performance Stats */}
              <Box sx={{ display: "flex", gap: 2, mb: 3, flexWrap: "wrap" }}>
                {statCards.map((stat) => (
                  <Box key={stat.label} sx={{ flex: "1 1 140px", bgcolor: "background.paper", borderRadius: 2, border: isDark ? "1px solid #2e2e2e" : "1px solid #e0e0e0", p: 2.5 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{stat.label}</Typography>
                      <Box sx={{ p: 0.8, borderRadius: 1.5, backgroundColor: stat.bg, color: stat.color, display: "flex" }}>
                        {React.cloneElement(stat.icon, { sx: { fontSize: 15 } })}
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: "1.6rem", fontWeight: 700, color: "text.primary", lineHeight: 1 }}>{stat.value}</Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.5 }}>{stat.sub}</Typography>
                  </Box>
                ))}
              </Box>

              {/* Pipeline */}
              <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: isDark ? "1px solid #2e2e2e" : "1px solid #e0e0e0", p: 2.5, mb: 3 }}>
                <Typography sx={{ fontSize: "0.8rem", fontWeight: 550, color: "text.secondary", mb: 2 }}>
                  Request Pipeline
                </Typography>
                <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                  {PIPELINE_STAGES.map((stage, idx) => {
                    const count    = statusCounts[stage.key] || 0;
                    const isActive = count > 0;
                    return (
                      <React.Fragment key={stage.key}>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.8, flex: 1 }}>
                          <Box sx={{
                            width: 44, height: 44, borderRadius: "50%",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            backgroundColor: isActive ? (isDark ? "#2a2200" : "#fffde7") : isDark ? "#2a2a2a" : "#f5f5f5",
                            border: "1.5px solid", borderColor: isActive ? "#f5c52b" : isDark ? "#444" : "#e0e0e0",
                            color: isActive ? "#f5c52b" : isDark ? "#555" : "#bdbdbd",
                            transition: "all 0.2s",
                          }}>
                            {stage.icon}
                          </Box>
                          <Typography sx={{ fontSize: "0.75rem", color: isActive ? "text.primary" : "text.disabled", fontWeight: isActive ? 600 : 400 }}>
                            {stage.label}
                          </Typography>
                          <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: isActive ? "text.primary" : "text.disabled", lineHeight: 1 }}>
                            {count}
                          </Typography>
                          {stage.hint && isActive && (
                            <Typography sx={{ fontSize: "0.65rem", color: "#f57c00", textAlign: "center", maxWidth: 80, lineHeight: 1.3, mt: 0.3 }}>
                              {stage.hint}
                            </Typography>
                          )}
                        </Box>
                        {idx < PIPELINE_STAGES.length - 1 && (
                          <ArrowForwardIcon sx={{ color: isDark ? "#444" : "#e0e0e0", fontSize: 18, flexShrink: 0, mt: 1.5 }} />
                        )}
                      </React.Fragment>
                    );
                  })}

                  <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                  {/* Declined */}
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.8 }}>
                    <Box sx={{
                      width: 44, height: 44, borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      backgroundColor: declined > 0 ? (isDark ? "#2a0a0a" : "#ffebee") : isDark ? "#2a2a2a" : "#f5f5f5",
                      border: "1.5px solid", borderColor: declined > 0 ? "#ef9a9a" : isDark ? "#444" : "#e0e0e0",
                      color: declined > 0 ? "#c62828" : isDark ? "#555" : "#bdbdbd",
                    }}>
                      <CancelOutlinedIcon sx={{ fontSize: 18 }} />
                    </Box>
                    <Typography sx={{ fontSize: "0.75rem", color: declined > 0 ? "#c62828" : "text.disabled", fontWeight: declined > 0 ? 600 : 400 }}>
                      Declined
                    </Typography>
                    <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: declined > 0 ? "#c62828" : "text.disabled", lineHeight: 1 }}>
                      {declined}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ mt: 2, mb: 1.5 }} />
                <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                    {isAllTime ? "All time total" : `Total for ${selectedSemester?.name}`}
                  </Typography>
                  <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: "text.primary" }}>{perfStats.total}</Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", mb: 3 }}>
                {/* Section Workload */}
                <Box sx={{ flex: "1 1 300px" }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1.5 }}>Section workload</Typography>
                  <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: isDark ? "1px solid #2e2e2e" : "1px solid #e0e0e0", overflow: "hidden" }}>
                    {sectionWorkload.map((s, idx) => (
                      <Box key={s.section} sx={{ px: 2.5, py: 2, borderBottom: idx < sectionWorkload.length - 1 ? `1px solid ${isDark ? "#2e2e2e" : "#f5f5f5"}` : "none", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: "0.72rem", fontWeight: 700, backgroundColor: SECTION_COLORS[s.section]?.bg, color: SECTION_COLORS[s.section]?.color }}>
                            {s.section[0]}
                          </Avatar>
                          <Typography sx={{ fontSize: "0.88rem", fontWeight: 500, color: "text.primary" }}>{s.section}</Typography>
                        </Box>
                        <Box sx={{ display: "flex", gap: 1 }}>
                          <Chip label={`${s.pending} pending`}  size="small" sx={{ fontSize: "0.72rem", backgroundColor: s.pending   > 0 ? "#fff3e0" : isDark ? "#2a2a2a" : "#f5f5f5", color: s.pending   > 0 ? "#e65100" : "text.disabled" }} />
                          <Chip label={`${s.completed} done`}   size="small" sx={{ fontSize: "0.72rem", backgroundColor: s.completed > 0 ? "#e8f5e9" : isDark ? "#2a2a2a" : "#f5f5f5", color: s.completed > 0 ? "#2e7d32" : "text.disabled" }} />
                        </Box>
                      </Box>
                    ))}
                  </Box>
                </Box>

                {/* Scheduling Status */}
                <Box sx={{ flex: "1 1 220px" }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1.5 }}>
                    Scheduling — {activeSemester?.name || "No active semester"}
                  </Typography>
                  <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: isDark ? "1px solid #2e2e2e" : "1px solid #e0e0e0", p: 2.5 }}>
                    {!activeSemester ? (
                      <Typography sx={{ fontSize: "0.82rem", color: "text.disabled" }}>No active semester set.</Typography>
                    ) : (
                      <>
                        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                            <GroupOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>Duty days set</Typography>
                          </Box>
                          <Typography sx={{ fontSize: "0.88rem", fontWeight: 700, color: scheduleStats.set === scheduleStats.total ? "#2e7d32" : "#e65100" }}>
                            {scheduleStats.set}/{scheduleStats.total}
                          </Typography>
                        </Box>
                        <Box sx={{ height: 6, borderRadius: 3, backgroundColor: isDark ? "#333" : "#f0f0f0", mb: 1.5 }}>
                          <Box sx={{
                            height: "100%", borderRadius: 3,
                            backgroundColor: scheduleStats.set === scheduleStats.total ? "#a5d6a7" : "#f5c52b",
                            width: `${scheduleStats.total > 0 ? (scheduleStats.set / scheduleStats.total) * 100 : 0}%`,
                            transition: "width 0.4s ease",
                          }} />
                        </Box>
                        <Divider sx={{ mb: 1.5 }} />
                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.8 }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Period</Typography>
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                            {new Date(activeSemester.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" — "}
                            {new Date(activeSemester.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Scheduling</Typography>
                          <Chip
                            label={activeSemester.scheduling_open ? "Open" : "Closed"}
                            size="small"
                            sx={{
                              fontSize: "0.7rem", fontWeight: 600, height: 18,
                              backgroundColor: activeSemester.scheduling_open ? "#e3f2fd" : isDark ? "#2a2a2a" : "#f5f5f5",
                              color: activeSemester.scheduling_open ? "#1565c0" : "text.secondary",
                            }}
                          />
                        </Box>
                      </>
                    )}
                  </Box>
                </Box>
              </Box>

              {/* Overdue banner */}
              {recentRequests.some((r) => r.urgency === "overdue") && (
                <Box sx={{
                  display: "flex", alignItems: "center", gap: 1.5, mb: 2,
                  px: 2, py: 1.5, borderRadius: 2,
                  backgroundColor: isDark ? "#2a0a0a" : "#ffebee",
                  border: "1px solid #ef9a9a",
                }}>
                  <ErrorOutlineOutlinedIcon sx={{ color: "#c62828", fontSize: 18, flexShrink: 0 }} />
                  <Typography sx={{ fontSize: "0.82rem", color: "#c62828", fontWeight: 600 }}>
                    {recentRequests.filter((r) => r.urgency === "overdue").length} request
                    {recentRequests.filter((r) => r.urgency === "overdue").length > 1 ? "s have" : " has"} passed their event date without being resolved.
                  </Typography>
                </Box>
              )}

              {/* Requests needing attention */}
              <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mb: 1.5 }}>Requests needing attention</Typography>
              <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: isDark ? "1px solid #2e2e2e" : "1px solid #e0e0e0", overflow: "hidden" }}>
                {recentRequests.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: "center" }}>
                    <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 36, color: isDark ? "#444" : "#e0e0e0", mb: 1 }} />
                    <Typography sx={{ fontSize: "0.88rem", color: "text.disabled" }}>Nothing needs attention right now.</Typography>
                  </Box>
                ) : (
                  recentRequests.map((r, idx) => {
                    const urgency = URGENCY_STYLES[r.urgency];
                    return (
                      <Box
                        key={r.id}
                        sx={{
                          px: 2.5, py: 2,
                          borderBottom: idx < recentRequests.length - 1 ? `1px solid ${isDark ? "#2e2e2e" : "#f5f5f5"}` : "none",
                          display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2,
                          borderLeft: "3px solid", borderLeftColor: urgency.border,
                          backgroundColor: r.urgency === "overdue" ? (isDark ? "#1a0505" : "#fffafa") : "background.paper",
                        }}
                      >
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.4 }}>
                            <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: urgency.dot, flexShrink: 0 }} />
                            <Typography sx={{ fontWeight: 600, fontSize: "0.9rem", color: "text.primary" }}>{r.title}</Typography>
                          </Box>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, pl: "15px" }}>
                            {r.entity?.name && (
                              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{r.entity.name}</Typography>
                            )}
                            {r.event_date && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                                <CalendarTodayOutlinedIcon sx={{ fontSize: 12, color: urgency.dot }} />
                                <Typography sx={{ fontSize: "0.75rem", color: urgency.color, fontWeight: r.urgency !== "upcoming" ? 600 : 400 }}>
                                  {new Date(r.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  {r.urgency === "overdue"  && " — Overdue"}
                                  {r.urgency === "critical" && " — In ≤3 days"}
                                  {r.urgency === "soon"     && " — This week"}
                                </Typography>
                              </Box>
                            )}
                            {r.venue && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                                <LocationOnOutlinedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                                <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{r.venue}</Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.8, flexShrink: 0 }}>
                          <Chip
                            label={r.status}
                            size="small"
                            sx={{
                              fontSize: "0.72rem", fontWeight: 600,
                              backgroundColor: STATUS_STYLES[r.status]?.bg || "#f5f5f5",
                              color: STATUS_STYLES[r.status]?.color || "#757575",
                            }}
                          />
                          {r.urgency !== "upcoming" && (
                            <Chip
                              icon={<WarningAmberOutlinedIcon sx={{ fontSize: "11px !important", color: `${urgency.color} !important` }} />}
                              label={urgency.label}
                              size="small"
                              sx={{ fontSize: "0.68rem", fontWeight: 600, height: 18, backgroundColor: urgency.bg, color: urgency.color }}
                            />
                          )}
                        </Box>
                      </Box>
                    );
                  })
                )}
              </Box>
            </>
          )}

          {activeTab === 1 && (
            <ReportGenerator selectedSemester={selectedSemester} isAllTime={isAllTime} />
          )}
        </>
      )}
    </Box>
  );
}