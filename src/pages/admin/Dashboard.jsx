// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, CircularProgress, Chip, Alert, Divider, Avatar,
  MenuItem, Select, FormControl, Button, Tooltip, useTheme,
} from "@mui/material";
import { useNavigate }                      from "react-router-dom";
import PendingActionsOutlinedIcon           from "@mui/icons-material/PendingActionsOutlined";
import ForwardToInboxOutlinedIcon           from "@mui/icons-material/ForwardToInboxOutlined";
import AssignmentOutlinedIcon               from "@mui/icons-material/AssignmentOutlined";
import HowToRegOutlinedIcon                 from "@mui/icons-material/HowToRegOutlined";
import TaskAltOutlinedIcon                  from "@mui/icons-material/TaskAltOutlined";
import CheckCircleOutlineOutlinedIcon       from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon                   from "@mui/icons-material/CancelOutlined";
import CalendarTodayOutlinedIcon            from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon               from "@mui/icons-material/LocationOnOutlined";
import GroupOutlinedIcon                    from "@mui/icons-material/GroupOutlined";
import TrendingUpOutlinedIcon               from "@mui/icons-material/TrendingUpOutlined";
import AccessTimeOutlinedIcon               from "@mui/icons-material/AccessTimeOutlined";
import WarningAmberOutlinedIcon             from "@mui/icons-material/WarningAmberOutlined";
import AssessmentOutlinedIcon               from "@mui/icons-material/AssessmentOutlined";
import OpenInNewOutlinedIcon                from "@mui/icons-material/OpenInNewOutlined";
import { supabase }                         from "../../lib/supabaseClient";
import ReportGenerator                      from "../../components/admin/ReportGenerator";

// ─── constants ────────────────────────────────────────────────────────────────
const SECTION_COLORS = {
  News:            { bg: "#e3f2fd", color: "#1565c0" },
  Photojournalism: { bg: "#f3e5f5", color: "#7b1fa2" },
  Videojournalism: { bg: "#e8f5e9", color: "#2e7d32" },
};

const STATUS_STYLES = {
  Pending:             { bg: "#fff3e0", color: "#e65100" },
  Forwarded:           { bg: "#f3e5f5", color: "#7b1fa2" },
  Assigned:            { bg: "#e3f2fd", color: "#1565c0" },
  "For Approval":      { bg: "#e0f2fe", color: "#0369a1" },  // admin action required
  "Coverage Complete": { bg: "#e8f5e9", color: "#2e7d32" },
  Approved:            { bg: "#fffde7", color: "#f57c00" },
  Declined:            { bg: "#ffebee", color: "#c62828" },
};

// Pipeline: Assigned = sec heads working (read-only for admin)
//           For Approval = sec head submitted, admin must act
const PIPELINE_STAGES = [
  { key: "Pending",           label: "Pending",      icon: PendingActionsOutlinedIcon,       navTab: "Pending"      },
  { key: "Forwarded",         label: "Forwarded",    icon: ForwardToInboxOutlinedIcon,        navTab: "Forwarded"    },
  { key: "Assigned",          label: "Assigned",     icon: AssignmentOutlinedIcon,            navTab: "Forwarded"    },
  { key: "For Approval",      label: "For Approval", icon: HowToRegOutlinedIcon,              navTab: "For Approval" },
  { key: "Approved",          label: "Approved",     icon: CheckCircleOutlineOutlinedIcon,    navTab: "Approved"     },
  { key: "Coverage Complete", label: "Covered",      icon: TaskAltOutlinedIcon,               navTab: "Approved"     },
];

const URGENCY_STYLES = {
  overdue:  { bg: "#ffebee", color: "#c62828", border: "#ef9a9a", label: "Overdue",  dot: "#c62828" },
  critical: { bg: "#fff3e0", color: "#e65100", border: "#ffcc80", label: "Critical", dot: "#e65100" },
  soon:     { bg: "#fffde7", color: "#f57c00", border: "#fff176", label: "Soon",     dot: "#f57c00" },
  upcoming: { bg: "#f5f5f5", color: "#757575", border: "#e0e0e0", label: "Upcoming", dot: "#bdbdbd" },
};

function toEndOfDay(d) { return new Date(d).toISOString().split("T")[0] + "T23:59:59"; }
function getUrgency(event_date) {
  if (!event_date) return "upcoming";
  const today = new Date(); today.setHours(0,0,0,0);
  const ev    = new Date(event_date); ev.setHours(0,0,0,0);
  const diff  = Math.ceil((ev - today) / 86400000);
  if (diff < 0)  return "overdue";
  if (diff <= 3) return "critical";
  if (diff <= 7) return "soon";
  return "upcoming";
}

// ─── reusable card shell ──────────────────────────────────────────────────────
function SectionCard({ children, sx = {}, onClick }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  return (
    <Box
      onClick={onClick}
      sx={{
        bgcolor: "background.paper",
        borderRadius: 2.5,
        border: isDark ? "1px solid #2e2e2e" : "1px solid #ebebeb",
        overflow: "hidden",
        ...(onClick ? { cursor: "pointer", "&:hover": { borderColor: "#f5c52b" }, transition: "border-color 0.15s" } : {}),
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

function SectionHeader({ title, action }) {
  return (
    <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Typography sx={{ fontSize: "0.78rem", fontWeight: 650, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </Typography>
      {action}
    </Box>
  );
}

// ─── main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [semesters, setSemesters]               = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [isAllTime, setIsAllTime]               = useState(false);
  const [activeSemester, setActiveSemester]     = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [error, setError]                       = useState("");
  const [showReports, setShowReports]           = useState(false);

  const [statusCounts, setStatusCounts]         = useState({});
  const [perfStats, setPerfStats]               = useState({ total: 0, approved: 0, declined: 0, declineRate: 0, completionRate: 0, avgTurnaround: null });
  const [sectionWorkload, setSectionWorkload]   = useState([]);
  const [recentRequests, setRecentRequests]     = useState([]);
  const [scheduleStats, setScheduleStats]       = useState({ total: 0, set: 0 });

  const channelRef       = useRef(null);
  const loadDashboardRef = useRef(null);

  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase.from("semesters")
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
    setLoading(true); setError("");
    try {
      let q = supabase.from("coverage_requests")
        .select("id, title, status, event_date, venue, submitted_at, approved_at, entity:entity_id(name)");
      if (!isAllTime && selectedSemester) {
        q = q.gte("submitted_at", selectedSemester.start_date).lte("submitted_at", toEndOfDay(selectedSemester.end_date));
      }
      const { data: requests, error: reqErr } = await q.order("submitted_at", { ascending: false });
      if (reqErr) throw reqErr;
      if (!isCurrent) return;

      const counts = {};
      (requests || []).forEach((r) => { counts[r.status] = (counts[r.status] || 0) + 1; });
      setStatusCounts(counts);

      const total    = requests?.length || 0;
      const approved = (requests || []).filter((r) => r.status === "Approved").length;
      const declined = (requests || []).filter((r) => r.status === "Declined").length;
      const covered  = (requests || []).filter((r) => ["Coverage Complete","Approved"].includes(r.status)).length;
      const assigned = (requests || []).filter((r) => ["Assigned","Coverage Complete","Approved"].includes(r.status)).length;
      const td = (requests || []).filter((r) => r.approved_at && r.submitted_at)
        .map((r) => (new Date(r.approved_at) - new Date(r.submitted_at)) / 86400000);

      setPerfStats({
        total, approved, declined,
        declineRate:    total    > 0 ? ((declined / total)    * 100).toFixed(1) : 0,
        completionRate: assigned > 0 ? ((covered  / assigned) * 100).toFixed(1) : 0,
        avgTurnaround:  td.length > 0 ? (td.reduce((a,b)=>a+b,0)/td.length).toFixed(1) : null,
      });

      // Needs Attention: Pending + Forwarded + Assigned (visibility) + For Approval (action required)
      const attention = (requests || [])
        .filter((r) => ["Pending","Forwarded","Assigned","For Approval"].includes(r.status))
        .map((r) => ({ ...r, urgency: getUrgency(r.event_date) }))
        .sort((a, b) => {
          const o = { overdue:0, critical:1, soon:2, upcoming:3 };
          if (o[a.urgency] !== o[b.urgency]) return o[a.urgency] - o[b.urgency];
          return new Date(a.event_date||0) - new Date(b.event_date||0);
        })
        .slice(0, 8);
      setRecentRequests(attention);

      let aq = supabase.from("coverage_assignments").select("section, status, assigned_at");
      if (!isAllTime && selectedSemester) {
        aq = aq.gte("assigned_at", selectedSemester.start_date).lte("assigned_at", toEndOfDay(selectedSemester.end_date));
      }
      const { data: assignments } = await aq;
      if (!isCurrent) return;

      const sm = { News:{pending:0,completed:0}, Photojournalism:{pending:0,completed:0}, Videojournalism:{pending:0,completed:0} };
      (assignments||[]).forEach((a) => {
        if (sm[a.section]) {
          if (a.status==="Pending")   sm[a.section].pending++;
          if (a.status==="Completed") sm[a.section].completed++;
        }
      });
      setSectionWorkload(Object.entries(sm).map(([section,data])=>({section,...data})));

      if (activeSemester?.id) {
        const { data: staffers }      = await supabase.from("profiles").select("id").eq("is_active",true).in("role",["staff","sec_head"]);
        const { data: dutySchedules } = await supabase.from("duty_schedules").select("staffer_id").eq("semester_id",activeSemester.id);
        if (!isCurrent) return;
        setScheduleStats({ total:(staffers||[]).length, set:(dutySchedules||[]).length });
      }
    } catch (err) { if (isCurrent) setError(err.message); }
    finally       { if (isCurrent) setLoading(false); }
    return () => { isCurrent = false; };
  }, [selectedSemester, isAllTime, activeSemester]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);
  useEffect(() => { loadDashboardRef.current = loadDashboard; }, [loadDashboard]);

  useEffect(() => {
    const ch = supabase.channel("dashboard-rt")
      .on("postgres_changes",{event:"*",schema:"public",table:"coverage_requests"},    ()=>loadDashboardRef.current())
      .on("postgres_changes",{event:"*",schema:"public",table:"coverage_assignments"}, ()=>loadDashboardRef.current())
      .on("postgres_changes",{event:"*",schema:"public",table:"duty_schedules"},       ()=>loadDashboardRef.current())
      .subscribe();
    channelRef.current = ch;
    return () => supabase.removeChannel(ch);
  }, []);

  // ── nav helpers ──────────────────────────────────────────────────────────
  const goToRequests = (tab) => navigate("/admin/request-management", { state: { tab } });
  const goToRequest  = (id, status) => {
    // Assigned → "With Sections" tab (Forwarded key), read-only for admin
    // For Approval → actionable tab
    const tabMap = {
      "Pending":            "Pending",
      "Forwarded":          "Forwarded",
      "Assigned":           "Forwarded",       // read-only, grouped with Forwarded
      "For Approval":       "For Approval",    // admin must act here
      "Coverage Complete":  "Approved",
      "Approved":           "Approved",
      "Declined":           "Declined",
    };
    navigate("/admin/request-management", { state: { tab: tabMap[status] || "all", openRequestId: id } });
  };

  // derived
  const overdueCount  = recentRequests.filter((r) => r.urgency === "overdue").length;
  const criticalCount = recentRequests.filter((r) => r.urgency === "critical").length;
  const schedPct      = scheduleStats.total > 0 ? (scheduleStats.set / scheduleStats.total) * 100 : 0;
  const border        = isDark ? "#2e2e2e" : "#ebebeb";

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%", maxWidth: 1200 }}>

      {/* ── TOP BAR ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "text.primary", letterSpacing: "-0.01em" }}>
            Dashboard
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.2 }}>
            {isAllTime ? "Showing all-time data" : selectedSemester?.name || "—"}
            {!isAllTime && activeSemester && selectedSemester?.id !== activeSemester?.id && (
              <Chip label="Not active semester" size="small" sx={{ ml: 1, fontSize: "0.65rem", height: 16, backgroundColor: isDark ? "#2a1a00" : "#fff3e0", color: "#e65100" }} />
            )}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Button
            size="small"
            variant={showReports ? "contained" : "outlined"}
            startIcon={<AssessmentOutlinedIcon sx={{ fontSize: 15 }} />}
            onClick={() => setShowReports((p) => !p)}
            sx={{
              textTransform: "none", fontSize: "0.78rem", borderRadius: 2, boxShadow: "none",
              borderColor: isDark ? "#444" : "#e0e0e0",
              color: showReports ? "#212121" : "text.secondary",
              backgroundColor: showReports ? "#f5c52b" : "background.paper",
              "&:hover": { backgroundColor: showReports ? "#e6b920" : isDark ? "#2a2a2a" : "#f5f5f5", boxShadow: "none" },
            }}
          >
            Reports
          </Button>
          <Button
            size="small"
            variant={isAllTime ? "contained" : "outlined"}
            onClick={() => setIsAllTime((p) => !p)}
            sx={{
              textTransform: "none", fontSize: "0.78rem", borderRadius: 2, boxShadow: "none",
              borderColor: isDark ? "#444" : "#e0e0e0",
              color: isAllTime ? "#212121" : "text.secondary",
              backgroundColor: isAllTime ? "#f5c52b" : "background.paper",
              "&:hover": { backgroundColor: isAllTime ? "#e6b920" : isDark ? "#2a2a2a" : "#f5f5f5", boxShadow: "none" },
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
                minWidth: 185,
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

      {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}

      {showReports && (
        <Box sx={{ mb: 3 }}>
          <ReportGenerator selectedSemester={selectedSemester} isAllTime={isAllTime} />
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
          <CircularProgress size={28} sx={{ color: "#f5c52b" }} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>

          {/* ── ROW 1: KPI strip ── */}
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 1.5 }}>
            {[
              { label: "Total",          value: perfStats.total,    sub: "submitted",                   navTab: "all",      icon: AssignmentOutlinedIcon,         iconColor: "#9e9e9e", accent: isDark ? "#2a2a2a" : "#f5f5f5", valueColor: "text.primary" },
              { label: "Approved",       value: perfStats.approved, sub: "events covered",              navTab: "Approved", icon: CheckCircleOutlineOutlinedIcon, iconColor: "#2e7d32", accent: isDark ? "#0a2210" : "#e8f5e9", valueColor: "#2e7d32"      },
              { label: "Declined",       value: perfStats.declined, sub: `${perfStats.declineRate}% rate`, navTab: "Declined", icon: CancelOutlinedIcon,          iconColor: "#c62828", accent: isDark ? "#2a0a0a" : "#ffebee", valueColor: "#c62828"      },
              { label: "Completion",     value: `${perfStats.completionRate}%`, sub: "assigned → covered", navTab: null,    icon: TrendingUpOutlinedIcon,         iconColor: "#1565c0", accent: isDark ? "#0d2137" : "#e3f2fd", valueColor: "#1565c0"      },
              { label: "Avg Turnaround", value: perfStats.avgTurnaround != null ? `${perfStats.avgTurnaround}d` : "—", sub: "to approval", navTab: null, icon: AccessTimeOutlinedIcon, iconColor: "#e65100", accent: isDark ? "#2a1a00" : "#fff3e0", valueColor: "#e65100" },
            ].map((k) => {
              const Icon = k.icon;
              return (
                <Tooltip key={k.label} title={k.navTab ? `Go to ${k.label === "Total" ? "all requests" : k.label.toLowerCase()}` : ""} placement="top" arrow>
                  <Box
                    onClick={k.navTab ? () => goToRequests(k.navTab) : undefined}
                    sx={{
                      bgcolor: "background.paper", borderRadius: 2.5,
                      border: isDark ? "1px solid #2e2e2e" : "1px solid #ebebeb",
                      p: 2, overflow: "hidden",
                      ...(k.navTab ? {
                        cursor: "pointer",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                        "&:hover": { borderColor: "#f5c52b", boxShadow: "0 2px 8px rgba(245,197,43,0.15)" },
                      } : {}),
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
                      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontWeight: 500 }}>{k.label}</Typography>
                      <Box sx={{ width: 28, height: 28, borderRadius: 1.5, backgroundColor: k.accent, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Icon sx={{ fontSize: 14, color: k.iconColor }} />
                      </Box>
                    </Box>
                    <Typography sx={{ fontSize: "1.75rem", fontWeight: 750, color: k.valueColor, lineHeight: 1, letterSpacing: "-0.02em" }}>{k.value}</Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", mt: 0.5 }}>{k.sub}</Typography>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* ── ROW 2: Attention list + right column ── */}
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 2 }}>

            {/* LEFT: Needs attention */}
            <SectionCard>
              <SectionHeader
                title="Needs Attention"
                action={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                    {overdueCount  > 0 && <Chip size="small" label={`${overdueCount} overdue`}  sx={{ fontSize: "0.68rem", height: 20, backgroundColor: isDark ? "#2a0a0a" : "#ffebee", color: "#c62828", fontWeight: 600 }} />}
                    {criticalCount > 0 && <Chip size="small" label={`${criticalCount} critical`} sx={{ fontSize: "0.68rem", height: 20, backgroundColor: isDark ? "#2a1a00" : "#fff3e0", color: "#e65100", fontWeight: 600 }} />}
                    {recentRequests.length > 0 && (
                      <Tooltip title="View all in Request Management" arrow>
                        <Box
                          onClick={() => goToRequests("all")}
                          sx={{ display: "flex", alignItems: "center", gap: 0.3, cursor: "pointer", color: "text.disabled", "&:hover": { color: "#f5c52b" }, transition: "color 0.15s" }}
                        >
                          <OpenInNewOutlinedIcon sx={{ fontSize: 14 }} />
                          <Typography sx={{ fontSize: "0.7rem" }}>View all</Typography>
                        </Box>
                      </Tooltip>
                    )}
                  </Box>
                }
              />
              <Divider sx={{ borderColor: border }} />

              {recentRequests.length === 0 ? (
                <Box sx={{ py: 5, textAlign: "center" }}>
                  <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 32, color: isDark ? "#444" : "#e0e0e0", mb: 1 }} />
                  <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>All clear — nothing needs attention.</Typography>
                </Box>
              ) : (
                recentRequests.map((r, idx) => {
                  const urg = URGENCY_STYLES[r.urgency];
                  return (
                    <Tooltip key={r.id} title="Click to view full details" placement="left" arrow>
                      <Box
                        onClick={() => goToRequest(r.id, r.status)}
                        sx={{
                          px: 2.5, py: 1.75,
                          borderBottom: idx < recentRequests.length - 1 ? `1px solid ${border}` : "none",
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
                          borderLeft: "3px solid", borderLeftColor: urg.border,
                          backgroundColor: r.urgency === "overdue"
                            ? isDark ? "rgba(198,40,40,0.06)" : "rgba(255,235,238,0.5)"
                            : "transparent",
                          cursor: "pointer",
                          transition: "background 0.15s",
                          "&:hover": { backgroundColor: isDark ? "#1e1e1e" : "#fafafa" },
                        }}
                      >
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: urg.dot, flexShrink: 0 }} />
                            <Typography sx={{ fontWeight: 600, fontSize: "0.88rem", color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r.title}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.2, pl: "14px" }}>
                            {r.entity?.name && <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>{r.entity.name}</Typography>}
                            {r.event_date && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                                <CalendarTodayOutlinedIcon sx={{ fontSize: 11, color: urg.dot }} />
                                <Typography sx={{ fontSize: "0.72rem", color: urg.color, fontWeight: r.urgency !== "upcoming" ? 600 : 400 }}>
                                  {new Date(r.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  {r.urgency === "overdue"  && " · Overdue"}
                                  {r.urgency === "critical" && " · ≤3 days"}
                                  {r.urgency === "soon"     && " · This week"}
                                </Typography>
                              </Box>
                            )}
                            {r.venue && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                                <LocationOnOutlinedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                                <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>{r.venue}</Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.5, flexShrink: 0 }}>
                          <Chip label={r.status} size="small" sx={{ fontSize: "0.68rem", fontWeight: 600, height: 20, backgroundColor: STATUS_STYLES[r.status]?.bg || "#f5f5f5", color: STATUS_STYLES[r.status]?.color || "#757575" }} />
                          {r.urgency !== "upcoming" && (
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                              <WarningAmberOutlinedIcon sx={{ fontSize: 11, color: urg.color }} />
                              <Typography sx={{ fontSize: "0.67rem", color: urg.color, fontWeight: 600 }}>{urg.label}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </Tooltip>
                  );
                })
              )}
            </SectionCard>

            {/* RIGHT COLUMN */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

              {/* Pipeline */}
              <SectionCard>
                <SectionHeader title="Pipeline" />
                <Divider sx={{ borderColor: border }} />
                <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 0 }}>
                  {[...PIPELINE_STAGES, { key: "Declined", label: "Declined", icon: CancelOutlinedIcon, navTab: "Declined", isDivider: true }].map((stage) => {
                    const count     = statusCounts[stage.key] || 0;
                    const isActive  = count > 0;
                    const isDecline = !!stage.isDivider;
                    const Icon      = stage.icon;
                    const pct       = perfStats.total > 0 ? (count / perfStats.total) * 100 : 0;

                    return (
                      <React.Fragment key={stage.key}>
                        {isDecline && <Divider sx={{ my: 1, borderColor: border }} />}
                        <Tooltip title={isActive ? `Go to ${stage.label} requests` : ""} placement="left" arrow>
                          <Box
                            onClick={isActive ? () => goToRequests(stage.navTab) : undefined}
                            sx={{
                              display: "flex", alignItems: "center", gap: 1.5, py: 0.9,
                              borderRadius: 1.5, px: 0.5,
                              ...(isActive ? {
                                cursor: "pointer",
                                "&:hover": { backgroundColor: isDark ? "#1e1e1e" : "#fafafa" },
                                transition: "background 0.15s",
                              } : {}),
                            }}
                          >
                            <Box sx={{
                              width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              backgroundColor: isActive
                                ? isDecline ? (isDark ? "#2a0a0a" : "#ffebee") : (isDark ? "#2a2200" : "#fffde7")
                                : isDark ? "#252525" : "#f5f5f5",
                              color: isActive ? (isDecline ? "#c62828" : "#f5c52b") : isDark ? "#555" : "#ccc",
                            }}>
                              <Icon sx={{ fontSize: 13 }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3 }}>
                                <Typography sx={{ fontSize: "0.75rem", color: isActive ? "text.primary" : "text.disabled", fontWeight: isActive ? 600 : 400 }}>
                                  {stage.label}
                                </Typography>
                                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: isDecline && isActive ? "#c62828" : isActive ? "text.primary" : "text.disabled" }}>
                                  {count}
                                </Typography>
                              </Box>
                              <Box sx={{ height: 3, borderRadius: 2, backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0", overflow: "hidden" }}>
                                <Box sx={{ height: "100%", borderRadius: 2, backgroundColor: isDecline ? "#ef9a9a" : "#f5c52b", width: `${pct}%`, transition: "width 0.4s ease" }} />
                              </Box>
                            </Box>
                          </Box>
                        </Tooltip>
                      </React.Fragment>
                    );
                  })}
                </Box>
              </SectionCard>

              {/* Scheduling */}
              <Tooltip title="Go to Duty Schedule View" placement="top" arrow>
                <Box>
                  <SectionCard onClick={() => navigate("/admin/duty-schedule-view")}>
                    <SectionHeader
                      title="Scheduling"
                      action={
                        activeSemester && (
                          <Chip
                            label={activeSemester.scheduling_open ? "Open" : "Closed"}
                            size="small"
                            sx={{
                              fontSize: "0.68rem", fontWeight: 600, height: 20,
                              backgroundColor: activeSemester.scheduling_open ? "#e3f2fd" : isDark ? "#2a2a2a" : "#f5f5f5",
                              color: activeSemester.scheduling_open ? "#1565c0" : "text.secondary",
                            }}
                          />
                        )
                      }
                    />
                    <Divider sx={{ borderColor: border }} />
                    <Box sx={{ p: 2 }}>
                      {!activeSemester ? (
                        <Typography sx={{ fontSize: "0.8rem", color: "text.disabled" }}>No active semester.</Typography>
                      ) : (
                        <>
                          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.8 }}>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                              <GroupOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                              <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>Duty days set</Typography>
                            </Box>
                            <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: scheduleStats.set === scheduleStats.total && scheduleStats.total > 0 ? "#2e7d32" : "#e65100" }}>
                              {scheduleStats.set}
                              <Typography component="span" sx={{ fontSize: "0.75rem", fontWeight: 400, color: "text.secondary" }}>/{scheduleStats.total}</Typography>
                            </Typography>
                          </Box>
                          <Box sx={{ height: 5, borderRadius: 3, backgroundColor: isDark ? "#333" : "#f0f0f0", mb: 1.5, overflow: "hidden" }}>
                            <Box sx={{ height: "100%", borderRadius: 3, transition: "width 0.4s ease", backgroundColor: scheduleStats.set === scheduleStats.total && scheduleStats.total > 0 ? "#a5d6a7" : "#f5c52b", width: `${schedPct}%` }} />
                          </Box>
                          <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>
                            {new Date(activeSemester.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {" – "}
                            {new Date(activeSemester.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </SectionCard>
                </Box>
              </Tooltip>
            </Box>
          </Box>

          {/* ── ROW 3: Section workload ── */}
          <SectionCard>
            <SectionHeader title="Section Workload" />
            <Divider sx={{ borderColor: border }} />
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
              {sectionWorkload.map((s, idx) => {
                const total  = s.pending + s.completed;
                const pct    = total > 0 ? (s.completed / total) * 100 : 0;
                const colors = SECTION_COLORS[s.section] || { bg: "#f5f5f5", color: "#757575" };
                return (
                  <Box
                    key={s.section}
                    sx={{ p: 2.5, borderRight: idx < sectionWorkload.length - 1 ? `1px solid ${border}` : "none" }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 1.5 }}>
                      <Avatar sx={{ width: 30, height: 30, fontSize: "0.7rem", fontWeight: 700, backgroundColor: colors.bg, color: colors.color }}>
                        {s.section[0]}
                      </Avatar>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: "text.primary" }}>{s.section}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", gap: 3, mb: 1.5 }}>
                      <Box>
                        <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, color: s.pending > 0 ? "#e65100" : "text.disabled", lineHeight: 1 }}>{s.pending}</Typography>
                        <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 0.2 }}>pending</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: "1.2rem", fontWeight: 700, color: s.completed > 0 ? "#2e7d32" : "text.disabled", lineHeight: 1 }}>{s.completed}</Typography>
                        <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 0.2 }}>completed</Typography>
                      </Box>
                    </Box>
                    <Box sx={{ height: 4, borderRadius: 2, backgroundColor: isDark ? "#333" : "#f0f0f0", overflow: "hidden" }}>
                      <Box sx={{ height: "100%", borderRadius: 2, transition: "width 0.4s ease", backgroundColor: colors.color, width: `${pct}%` }} />
                    </Box>
                    <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 0.5 }}>
                      {total > 0 ? `${pct.toFixed(0)}% completion` : "No assignments"}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </SectionCard>

        </Box>
      )}

    </Box>
  );
}