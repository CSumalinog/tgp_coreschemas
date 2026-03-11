// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box, Typography, CircularProgress, Chip, Alert, Divider, Avatar,
  MenuItem, Select, FormControl, Button, Tooltip, useTheme, useMediaQuery,
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
import WarningAmberOutlinedIcon             from "@mui/icons-material/WarningAmberOutlined";
import AssessmentOutlinedIcon               from "@mui/icons-material/AssessmentOutlined";
import OpenInNewOutlinedIcon                from "@mui/icons-material/OpenInNewOutlined";
import ArrowUpwardOutlinedIcon              from "@mui/icons-material/ArrowUpwardOutlined";
import { supabase }                         from "../../lib/supabaseClient";
import ReportGenerator                      from "../../components/admin/ReportGenerator";

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

const STATUS = {
  light: {
    Pending:             { bg: BRAND.goldAlpha15, color: "#7a5c00"  },
    Forwarded:           { bg: BRAND.goldAlpha12, color: "#856900"  },
    Assigned:            { bg: "rgba(53,53,53,0.07)",  color: "#353535"  },
    "For Approval":      { bg: BRAND.goldAlpha20, color: "#6b4f00"  },
    "Coverage Complete": { bg: "rgba(53,53,53,0.05)",  color: "#555"     },
    Approved:            { bg: BRAND.goldAlpha15, color: "#8a6800"  },
    Declined:            { bg: BRAND.redLight,    color: BRAND.red   },
  },
  dark: {
    Pending:             { bg: BRAND.goldAlpha15, color: BRAND.gold  },
    Forwarded:           { bg: BRAND.goldAlpha12, color: "#e6b920"   },
    Assigned:            { bg: "rgba(255,255,255,0.07)", color: "#aaa" },
    "For Approval":      { bg: BRAND.goldAlpha20, color: BRAND.gold  },
    "Coverage Complete": { bg: "rgba(255,255,255,0.05)", color: "#888" },
    Approved:            { bg: BRAND.goldAlpha15, color: BRAND.gold  },
    Declined:            { bg: BRAND.redAlpha15,  color: "#ef5350"   },
  },
};

const SECTION = {
  light: {
    News:            { avatarBg: BRAND.goldAlpha15,       avatarColor: "#7a5c00", bar: BRAND.gold },
    Photojournalism: { avatarBg: "rgba(53,53,53,0.08)",   avatarColor: "#353535", bar: "#888"     },
    Videojournalism: { avatarBg: "rgba(245,197,43,0.08)", avatarColor: "#a07c00", bar: "#c49b00"  },
  },
  dark: {
    News:            { avatarBg: BRAND.goldAlpha20,        avatarColor: BRAND.gold, bar: BRAND.gold },
    Photojournalism: { avatarBg: "rgba(255,255,255,0.08)", avatarColor: "#aaa",     bar: "#888"     },
    Videojournalism: { avatarBg: "rgba(245,197,43,0.10)",  avatarColor: "#e6b920",  bar: "#c49b00"  },
  },
};

const URGENCY = {
  light: {
    overdue:  { color: BRAND.red,  border: "#ef9a9a",              dot: BRAND.red,  label: "Overdue"  },
    critical: { color: BRAND.red,  border: "rgba(198,40,40,0.3)",  dot: BRAND.red,  label: "Critical" },
    soon:     { color: "#8a6800",  border: "rgba(245,197,43,0.5)", dot: BRAND.gold, label: "Soon"     },
    upcoming: { color: "#888",     border: "#e0e0e0",              dot: "#ccc",     label: "Upcoming" },
  },
  dark: {
    overdue:  { color: "#ef5350",  border: "rgba(198,40,40,0.4)",   dot: "#ef5350",  label: "Overdue"  },
    critical: { color: "#ef5350",  border: "rgba(198,40,40,0.3)",   dot: "#ef5350",  label: "Critical" },
    soon:     { color: BRAND.gold, border: "rgba(245,197,43,0.35)", dot: BRAND.gold, label: "Soon"     },
    upcoming: { color: "#666",     border: "#3a3a3a",               dot: "#555",     label: "Upcoming" },
  },
};

const PIPELINE_STAGES = [
  { key: "Pending",           label: "Pending",      icon: PendingActionsOutlinedIcon,     navTab: "Pending"      },
  { key: "Forwarded",         label: "Forwarded",    icon: ForwardToInboxOutlinedIcon,     navTab: "Forwarded"    },
  { key: "Assigned",          label: "Assigned",     icon: AssignmentOutlinedIcon,         navTab: "Forwarded"    },
  { key: "For Approval",      label: "For Approval", icon: HowToRegOutlinedIcon,           navTab: "For Approval" },
  { key: "Approved",          label: "Approved",     icon: CheckCircleOutlineOutlinedIcon, navTab: "Approved"     },
  { key: "Coverage Complete", label: "Covered",      icon: TaskAltOutlinedIcon,            navTab: "Approved"     },
];

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

// ─── Card shell ───────────────────────────────────────────────────────────────
function SectionCard({ children, sx = {}, onClick }) {
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
    <Box sx={{ px: 2.5, pt: 2, pb: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.09em" }}>
        {title}
      </Typography>
      {action}
    </Box>
  );
}

// ─── SVG Donut ────────────────────────────────────────────────────────────────
function MiniDonut({ approved, declined, total, isDark }) {
  const size = 116, r = 42, cx = size / 2, cy = size / 2;
  const circum = 2 * Math.PI * r;
  const pA = total > 0 ? approved / total : 0;
  const pD = total > 0 ? declined / total : 0;
  const pP = Math.max(0, 1 - pA - pD);
  const gap = 3;
  let offset = 0;
  const segs = [
    { pct: pA, color: BRAND.gold,                      len: Math.max(pA * circum - gap, 0) },
    { pct: pD, color: BRAND.red,                       len: Math.max(pD * circum - gap, 0) },
    { pct: pP, color: isDark ? "#3a3a3a" : "#e8e8e8", len: Math.max(pP * circum - gap, 0) },
  ];
  return (
    <Box sx={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        {segs.map((seg, i) => {
          const dashOffset = circum - offset;
          offset += seg.pct * circum;
          return (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth={11}
              strokeDasharray={`${seg.len} ${circum - seg.len}`}
              strokeDashoffset={dashOffset} strokeLinecap="round"
            />
          );
        })}
      </svg>
      <Box sx={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <Typography sx={{ fontSize: "1.5rem", fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: "text.primary" }}>{total}</Typography>
        <Typography sx={{ fontSize: "0.58rem", color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.07em", mt: 0.2 }}>total</Typography>
      </Box>
    </Box>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  // ── Responsive breakpoints ────────────────────────────────────────────────
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));   // <600px
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));   // <900px
  const isLg     = useMediaQuery(theme.breakpoints.down("lg"));   // <1200px

  const border   = isDark ? BRAND.borderDark  : BRAND.borderLight;
  const surf     = isDark ? BRAND.surfDark    : BRAND.surfLight;
  const iconWell = isDark ? BRAND.goldAlpha15 : BRAND.goldAlpha12;
  const status   = isDark ? STATUS.dark       : STATUS.light;
  const urgency  = isDark ? URGENCY.dark      : URGENCY.light;
  const section  = isDark ? SECTION.dark      : SECTION.light;

  const [semesters,         setSemesters]         = useState([]);
  const [selectedSemester,  setSelectedSemester]  = useState(null);
  const [isAllTime,         setIsAllTime]         = useState(false);
  const [activeSemester,    setActiveSemester]    = useState(null);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState("");
  const [showReports,       setShowReports]       = useState(false);
  const [statusCounts,      setStatusCounts]      = useState({});
  const [perfStats,         setPerfStats]         = useState({ total: 0, approved: 0, declined: 0, declineRate: 0, completionRate: 0, avgTurnaround: null });
  const [sectionWorkload,   setSectionWorkload]   = useState([]);
  const [recentRequests,    setRecentRequests]    = useState([]);
  const [scheduleStats,     setScheduleStats]     = useState({ total: 0, set: 0 });

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
      if (!isAllTime && selectedSemester)
        q = q.gte("submitted_at", selectedSemester.start_date).lte("submitted_at", toEndOfDay(selectedSemester.end_date));
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
      if (!isAllTime && selectedSemester)
        aq = aq.gte("assigned_at", selectedSemester.start_date).lte("assigned_at", toEndOfDay(selectedSemester.end_date));
      const { data: assignments } = await aq;
      if (!isCurrent) return;

      const sm = { News:{pending:0,completed:0}, Photojournalism:{pending:0,completed:0}, Videojournalism:{pending:0,completed:0} };
      (assignments||[]).forEach((a) => {
        if (sm[a.section]) {
          if (a.status==="Pending")   sm[a.section].pending++;
          if (a.status==="Completed") sm[a.section].completed++;
        }
      });
      setSectionWorkload(Object.entries(sm).map(([sec,d])=>({section:sec,...d})));

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

  const goToRequests = (tab) => navigate("/admin/request-management", { state: { tab } });
  const goToRequest  = (id, s) => {
    const tabMap = { Pending:"Pending", Forwarded:"Forwarded", Assigned:"Forwarded", "For Approval":"For Approval", "Coverage Complete":"Approved", Approved:"Approved", Declined:"Declined" };
    navigate("/admin/request-management", { state: { tab: tabMap[s] || "all", openRequestId: id } });
  };

  const overdueCount     = recentRequests.filter((r) => r.urgency === "overdue").length;
  const criticalCount    = recentRequests.filter((r) => r.urgency === "critical").length;
  const forApprovalCount = recentRequests.filter((r) => r.status === "For Approval").length;
  const schedPct         = scheduleStats.total > 0 ? (scheduleStats.set / scheduleStats.total) * 100 : 0;
  const schedDone        = scheduleStats.set === scheduleStats.total && scheduleStats.total > 0;

  const toggleSx = (active) => ({
    textTransform: "none", fontSize: "0.78rem", borderRadius: 2, boxShadow: "none",
    borderColor: active ? BRAND.gold : border,
    color: active ? BRAND.charcoal : "text.secondary",
    backgroundColor: active ? BRAND.gold : "background.paper",
    "&:hover": { backgroundColor: active ? "#e6b920" : surf, borderColor: BRAND.gold, boxShadow: "none" },
    transition: "all 0.18s",
    minWidth: "unset",
    px: isMobile ? 1.25 : 1.75,
  });

  const kpiCards = [
    { label: "Total Requests", value: perfStats.total,    sub: "submitted this period",         navTab: "all",      icon: AssignmentOutlinedIcon,         isRed: false },
    { label: "Approved",       value: perfStats.approved, trend: perfStats.total > 0 ? `${((perfStats.approved/perfStats.total)*100).toFixed(0)}% of total` : null, navTab: "Approved",  icon: CheckCircleOutlineOutlinedIcon, isRed: false },
    { label: "Declined",       value: perfStats.declined, sub: `${perfStats.declineRate}% decline rate`, navTab: "Declined",  icon: CancelOutlinedIcon,            isRed: true  },
    { label: "Completion",     value: `${perfStats.completionRate}%`, sub: "assigned → covered", navTab: null,       icon: TrendingUpOutlinedIcon,         isRed: false },
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 2.5, md: 3 }, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* ── TOP BAR ── */}
      <Box sx={{
        display: "flex",
        alignItems: { xs: "flex-start", sm: "center" },
        flexDirection: { xs: "column", sm: "row" },
        justifyContent: "space-between",
        gap: { xs: 1.5, sm: 2 },
        mb: 3,
      }}>
        <Box>
          <Typography sx={{ fontWeight: 800, fontSize: { xs: "1rem", md: "1.1rem" }, color: "text.primary", letterSpacing: "-0.02em" }}>
            Dashboard
          </Typography>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.2 }}>
            {isAllTime ? "Showing all-time data" : selectedSemester?.name || "—"}
            {!isAllTime && activeSemester && selectedSemester?.id !== activeSemester?.id && (
              <Chip label="Not active semester" size="small" sx={{ ml: 1, fontSize: "0.65rem", height: 16, backgroundColor: iconWell, color: isDark ? BRAND.gold : "#7a5c00" }} />
            )}
          </Typography>
        </Box>

        {/* Controls — wrap on mobile */}
        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1, width: { xs: "100%", sm: "auto" } }}>
          <Button size="small" variant={showReports ? "contained" : "outlined"}
            startIcon={<AssessmentOutlinedIcon sx={{ fontSize: 15 }} />}
            onClick={() => setShowReports((p) => !p)} sx={toggleSx(showReports)}>
            Reports
          </Button>
          <Button size="small" variant={isAllTime ? "contained" : "outlined"}
            onClick={() => setIsAllTime((p) => !p)} sx={toggleSx(isAllTime)}>
            All Time
          </Button>
          <FormControl size="small" disabled={isAllTime} sx={{ flex: { xs: 1, sm: "unset" } }}>
            <Select
              value={selectedSemester?.id || ""}
              onChange={(e) => setSelectedSemester(semesters.find((s) => s.id === e.target.value) || null)}
              sx={{
                fontSize: "0.82rem", borderRadius: 2,
                backgroundColor: isAllTime ? surf : "background.paper",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: border },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: BRAND.gold },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: BRAND.gold },
                minWidth: { xs: "unset", sm: 185 },
                width: { xs: "100%", sm: "auto" },
              }}>
              {semesters.map((s) => (
                <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.82rem" }}>
                  {s.name}
                  {s.is_active && <Chip label="Active" size="small" sx={{ ml: 1, fontSize: "0.65rem", height: 16, backgroundColor: iconWell, color: isDark ? BRAND.gold : "#7a5c00" }} />}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>{error}</Alert>}
      {showReports && <Box sx={{ mb: 3 }}><ReportGenerator selectedSemester={selectedSemester} isAllTime={isAllTime} /></Box>}

      {loading ? (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "40vh" }}>
          <CircularProgress size={28} sx={{ color: BRAND.gold }} />
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, md: 2.5 } }}>

          {/* ── ROW 1: Hero + KPIs ── */}
          <Box sx={{
            display: "grid",
            gap: { xs: 1.5, md: 1.5 },
            // mobile: 2 cols, tablet: 2+2, desktop: hero + 4 kpis
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              md: "240px repeat(4, 1fr)",
              lg: "272px repeat(4, 1fr)",
            },
            gridTemplateRows: { xs: "auto auto", md: "1fr" },
          }}>

            {/* Hero card — spans full width on mobile/tablet */}
            <Box sx={{
              gridColumn: { xs: "1 / -1", md: "1 / 2" },
              borderRadius: 3, overflow: "hidden", position: "relative",
              background: isDark
                ? `linear-gradient(140deg, #1e1a00 0%, ${BRAND.charcoal} 55%, #141400 100%)`
                : `linear-gradient(140deg, ${BRAND.charcoal} 0%, #1a1a1a 60%, #0d0d0d 100%)`,
              p: { xs: 2, md: 2.5 },
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              minHeight: { xs: 110, md: 138 },
            }}>
              {/* decorative rings */}
              <Box sx={{ position: "absolute", top: -36, right: -36, width: 110, height: 110, borderRadius: "50%", border: `1.5px solid ${BRAND.goldAlpha12}`, pointerEvents: "none" }} />
              <Box sx={{ position: "absolute", top: -16, right: -16, width: 68,  height: 68,  borderRadius: "50%", border: `1.5px solid rgba(245,197,43,0.07)`, pointerEvents: "none" }} />
              <Box sx={{ position: "absolute", bottom: -24, left: -24, width: 80, height: 80, borderRadius: "50%", backgroundColor: "rgba(245,197,43,0.04)", pointerEvents: "none" }} />

              <Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, mb: 1 }}>
                  <Box sx={{
                    width: 6, height: 6, borderRadius: "50%", backgroundColor: BRAND.gold,
                    boxShadow: `0 0 6px ${BRAND.gold}`,
                    animation: "blink 2s ease-in-out infinite",
                    "@keyframes blink": { "0%,100%": { opacity: 1 }, "50%": { opacity: 0.35 } },
                  }} />
                  <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: BRAND.gold, textTransform: "uppercase", letterSpacing: "0.1em" }}>Live</Typography>
                </Box>

                {forApprovalCount > 0 ? (
                  <>
                    <Typography sx={{ fontSize: { xs: "0.88rem", md: "0.98rem" }, fontWeight: 800, color: BRAND.white, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                      {forApprovalCount} request{forApprovalCount > 1 ? "s" : ""} awaiting approval
                    </Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", mt: 0.5 }}>Action required from you</Typography>
                  </>
                ) : overdueCount > 0 ? (
                  <>
                    <Typography sx={{ fontSize: { xs: "0.88rem", md: "0.98rem" }, fontWeight: 800, color: BRAND.white, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                      {overdueCount} overdue event{overdueCount > 1 ? "s" : ""} need attention
                    </Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", mt: 0.5 }}>Check the list below</Typography>
                  </>
                ) : (
                  <>
                    <Typography sx={{ fontSize: { xs: "0.88rem", md: "0.98rem" }, fontWeight: 800, color: BRAND.white, lineHeight: 1.25, letterSpacing: "-0.01em" }}>
                      All clear — pipeline running smoothly
                    </Typography>
                    <Typography sx={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.42)", mt: 0.5 }}>No urgent items right now</Typography>
                  </>
                )}
              </Box>

              <Box onClick={() => goToRequests("For Approval")} sx={{
                mt: 1.5, display: "inline-flex", alignItems: "center", gap: 0.4,
                cursor: "pointer", color: "rgba(255,255,255,0.38)", fontSize: "0.7rem", fontWeight: 500,
                "&:hover": { color: BRAND.gold }, transition: "color 0.15s", width: "fit-content",
              }}>
                <OpenInNewOutlinedIcon sx={{ fontSize: 12 }} />
                View requests
              </Box>
            </Box>

            {/* 4 KPI cards */}
            {kpiCards.map((k) => {
              const Icon = k.icon;
              return (
                <Tooltip key={k.label} title={k.navTab ? `Go to ${k.label.toLowerCase()}` : ""} placement="top" arrow>
                  <Box onClick={k.navTab ? () => goToRequests(k.navTab) : undefined} sx={{
                    bgcolor: "background.paper", borderRadius: 3, border: `1px solid ${border}`,
                    p: { xs: 1.75, md: 2.5 },
                    minHeight: { xs: 100, md: 138 },
                    display: "flex", flexDirection: "column", justifyContent: "space-between",
                    ...(k.navTab ? {
                      cursor: "pointer", transition: "border-color 0.2s, box-shadow 0.2s",
                      "&:hover": { borderColor: BRAND.gold, boxShadow: `0 2px 16px ${BRAND.goldAlpha12}` },
                    } : {}),
                  }}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <Typography sx={{ fontSize: { xs: "0.68rem", md: "0.72rem" }, color: "text.secondary", fontWeight: 500 }}>
                        {k.label}
                      </Typography>
                      <Box sx={{
                        width: { xs: 26, md: 30 }, height: { xs: 26, md: 30 },
                        borderRadius: 2, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                        backgroundColor: k.isRed ? (isDark ? BRAND.redAlpha15 : BRAND.redLight) : iconWell,
                      }}>
                        <Icon sx={{ fontSize: { xs: 13, md: 15 }, color: k.isRed ? BRAND.red : BRAND.gold }} />
                      </Box>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: { xs: "1.6rem", md: "2rem" }, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", color: k.isRed ? BRAND.red : "text.primary" }}>
                        {k.value}
                      </Typography>
                      {k.trend ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, mt: 0.5 }}>
                          <ArrowUpwardOutlinedIcon sx={{ fontSize: 11, color: BRAND.gold }} />
                          <Typography sx={{ fontSize: "0.7rem", color: BRAND.gold, fontWeight: 600 }}>{k.trend}</Typography>
                        </Box>
                      ) : (
                        <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", mt: 0.5 }}>{k.sub}</Typography>
                      )}
                    </Box>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>

          {/* ── ROW 2: Attention list + right column ── */}
          <Box sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", lg: "1fr 300px" },
            gap: { xs: 2, md: 2 },
            alignItems: "start",
          }}>

            {/* Needs Attention */}
            <SectionCard>
              <SectionHeader
                title="Needs Attention"
                action={
                  <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 0.8 }}>
                    {overdueCount > 0 && (
                      <Chip size="small" label={`${overdueCount} overdue`} sx={{ fontSize: "0.68rem", height: 20, fontWeight: 600, backgroundColor: isDark ? BRAND.redAlpha15 : BRAND.redLight, color: isDark ? "#ef5350" : BRAND.red }} />
                    )}
                    {criticalCount > 0 && (
                      <Chip size="small" label={`${criticalCount} critical`} sx={{ fontSize: "0.68rem", height: 20, fontWeight: 600, backgroundColor: isDark ? BRAND.redAlpha15 : BRAND.redLight, color: isDark ? "#ef9a9a" : "#b71c1c" }} />
                    )}
                    {recentRequests.length > 0 && (
                      <Tooltip title="View all in Request Management" arrow>
                        <Box onClick={() => goToRequests("all")} sx={{ display: "flex", alignItems: "center", gap: 0.3, cursor: "pointer", color: "text.disabled", "&:hover": { color: BRAND.gold }, transition: "color 0.15s" }}>
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
                  <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 32, color: isDark ? "#444" : "#ddd", mb: 1 }} />
                  <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>All clear — nothing needs attention.</Typography>
                </Box>
              ) : (
                recentRequests.map((r, idx) => {
                  const urg = urgency[r.urgency];
                  return (
                    <Tooltip key={r.id} title="Click to view full details" placement="left" arrow>
                      <Box onClick={() => goToRequest(r.id, r.status)} sx={{
                        px: { xs: 2, md: 2.5 }, py: { xs: 1.4, md: 1.6 },
                        borderBottom: idx < recentRequests.length - 1 ? `1px solid ${border}` : "none",
                        display: "flex",
                        flexDirection: { xs: "column", sm: "row" },
                        alignItems: { xs: "flex-start", sm: "center" },
                        justifyContent: "space-between",
                        gap: { xs: 1, sm: 2 },
                        borderLeft: "3px solid", borderLeftColor: urg.border,
                        backgroundColor:
                          r.urgency === "overdue"  ? (isDark ? "rgba(198,40,40,0.06)" : "rgba(255,235,238,0.5)") :
                          r.urgency === "critical" ? (isDark ? "rgba(198,40,40,0.04)" : "rgba(255,235,238,0.25)") :
                          r.urgency === "soon"     ? (isDark ? "rgba(245,197,43,0.03)" : "rgba(245,197,43,0.04)") :
                          "transparent",
                        cursor: "pointer", transition: "background 0.15s",
                        "&:hover": { backgroundColor: isDark ? "#1e1e1e" : "#fafafa" },
                      }}>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.3 }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: urg.dot, flexShrink: 0 }} />
                            <Typography sx={{ fontWeight: 600, fontSize: "0.875rem", color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {r.title}
                            </Typography>
                          </Box>
                          <Box sx={{ display: "flex", flexWrap: "wrap", gap: { xs: 0.8, sm: 1.2 }, pl: "14px" }}>
                            {r.entity?.name && (
                              <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>{r.entity.name}</Typography>
                            )}
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
                            {r.venue && !isMobile && (
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.3 }}>
                                <LocationOnOutlinedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
                                <Typography sx={{ fontSize: "0.72rem", color: "text.disabled" }}>{r.venue}</Typography>
                              </Box>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ display: "flex", flexDirection: { xs: "row", sm: "column" }, alignItems: { xs: "center", sm: "flex-end" }, gap: 0.5, flexShrink: 0 }}>
                          <Chip label={r.status} size="small" sx={{ fontSize: "0.68rem", fontWeight: 600, height: 20, backgroundColor: status[r.status]?.bg || surf, color: status[r.status]?.color || "#888" }} />
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

            {/* RIGHT COLUMN — stacks below on mobile/tablet */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

              {/* Overview donut */}
              <SectionCard>
                <SectionHeader title="Overview" />
                <Divider sx={{ borderColor: border }} />
                <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                  <MiniDonut approved={perfStats.approved} declined={perfStats.declined} total={perfStats.total} isDark={isDark} />
                  <Box sx={{ width: "100%", display: "flex", flexDirection: "column", gap: 0.9 }}>
                    {[
                      { label: "Approved",    value: perfStats.approved, color: BRAND.gold },
                      { label: "Declined",    value: perfStats.declined, color: BRAND.red  },
                      { label: "In Pipeline", value: perfStats.total - perfStats.approved - perfStats.declined, color: isDark ? "#555" : "#ccc" },
                    ].map((item) => (
                      <Box key={item.label} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", flex: 1 }}>{item.label}</Typography>
                        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "text.primary" }}>{item.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </SectionCard>

              {/* Pipeline */}
              <SectionCard>
                <SectionHeader title="Pipeline" />
                <Divider sx={{ borderColor: border }} />
                <Box sx={{ p: 2, display: "flex", flexDirection: "column" }}>
                  {[...PIPELINE_STAGES, { key: "Declined", label: "Declined", icon: CancelOutlinedIcon, navTab: "Declined", isDivider: true }].map((stage) => {
                    const count    = statusCounts[stage.key] || 0;
                    const isActive = count > 0;
                    const isRed    = !!stage.isDivider;
                    const Icon     = stage.icon;
                    const pct      = perfStats.total > 0 ? (count / perfStats.total) * 100 : 0;
                    return (
                      <React.Fragment key={stage.key}>
                        {isRed && <Divider sx={{ my: 1, borderColor: border }} />}
                        <Tooltip title={isActive ? `Go to ${stage.label} requests` : ""} placement="left" arrow>
                          <Box onClick={isActive ? () => goToRequests(stage.navTab) : undefined} sx={{
                            display: "flex", alignItems: "center", gap: 1.5, py: 0.9, borderRadius: 1.5, px: 0.5,
                            ...(isActive ? { cursor: "pointer", "&:hover": { backgroundColor: surf }, transition: "background 0.15s" } : {}),
                          }}>
                            <Box sx={{
                              width: 27, height: 27, borderRadius: "50%", flexShrink: 0,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              backgroundColor: isActive ? (isRed ? (isDark ? BRAND.redAlpha15 : BRAND.redLight) : iconWell) : (isDark ? "#252525" : "#f3f3f3"),
                              color: isActive ? (isRed ? BRAND.red : BRAND.gold) : (isDark ? "#555" : "#ccc"),
                            }}>
                              <Icon sx={{ fontSize: 13 }} />
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.35 }}>
                                <Typography sx={{ fontSize: "0.75rem", color: isActive ? "text.primary" : "text.disabled", fontWeight: isActive ? 600 : 400 }}>{stage.label}</Typography>
                                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: isRed && isActive ? BRAND.red : isActive ? "text.primary" : "text.disabled" }}>{count}</Typography>
                              </Box>
                              <Box sx={{ height: 3, borderRadius: 2, backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0", overflow: "hidden" }}>
                                <Box sx={{ height: "100%", borderRadius: 2, backgroundColor: isRed ? BRAND.red : BRAND.gold, width: `${pct}%`, transition: "width 0.4s ease" }} />
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
                      action={activeSemester && (
                        <Chip label={activeSemester.scheduling_open ? "Open" : "Closed"} size="small" sx={{
                          fontSize: "0.68rem", fontWeight: 600, height: 20,
                          backgroundColor: activeSemester.scheduling_open ? iconWell : surf,
                          color: activeSemester.scheduling_open ? (isDark ? BRAND.gold : "#7a5c00") : "text.secondary",
                        }} />
                      )}
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
                            <Typography sx={{ fontSize: "1rem", fontWeight: 700, color: schedDone ? BRAND.gold : BRAND.red }}>
                              {scheduleStats.set}
                              <Typography component="span" sx={{ fontSize: "0.75rem", fontWeight: 400, color: "text.secondary" }}>/{scheduleStats.total}</Typography>
                            </Typography>
                          </Box>
                          <Box sx={{ height: 5, borderRadius: 3, backgroundColor: isDark ? "#333" : "#f0f0f0", mb: 1.5, overflow: "hidden" }}>
                            <Box sx={{ height: "100%", borderRadius: 3, backgroundColor: BRAND.gold, width: `${schedPct}%`, transition: "width 0.4s ease" }} />
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

          {/* ── ROW 3: Section Workload ── */}
          <SectionCard>
            <SectionHeader title="Section Workload" />
            <Divider sx={{ borderColor: border }} />
            <Box sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            }}>
              {sectionWorkload.map((s, idx) => {
                const total  = s.pending + s.completed;
                const pct    = total > 0 ? (s.completed / total) * 100 : 0;
                const colors = section[s.section] || { avatarBg: surf, avatarColor: "#888", bar: BRAND.gold };
                return (
                  <Box key={s.section} sx={{
                    p: { xs: 2, md: 2.5 },
                    borderRight: {
                      xs: "none",
                      sm: idx < sectionWorkload.length - 1 ? `1px solid ${border}` : "none",
                    },
                    borderBottom: {
                      xs: idx < sectionWorkload.length - 1 ? `1px solid ${border}` : "none",
                      sm: "none",
                    },
                  }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.2, mb: 2 }}>
                      <Avatar sx={{ width: 30, height: 30, fontSize: "0.7rem", fontWeight: 700, backgroundColor: colors.avatarBg, color: colors.avatarColor }}>
                        {s.section[0]}
                      </Avatar>
                      <Typography sx={{ fontSize: "0.85rem", fontWeight: 700, color: "text.primary" }}>{s.section}</Typography>
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                      {[
                        { label: "Completed", value: s.completed, color: colors.bar },
                        { label: "Pending",   value: s.pending,   color: isDark ? "#3a3a3a" : "#e4e4e4" },
                      ].map((bar) => (
                        <Box key={bar.label}>
                          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.4 }}>
                            <Typography sx={{ fontSize: "0.68rem", color: "text.disabled" }}>{bar.label}</Typography>
                            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "text.secondary" }}>{bar.value}</Typography>
                          </Box>
                          <Box sx={{ height: 5, borderRadius: 3, backgroundColor: isDark ? "#2a2a2a" : "#f0f0f0", overflow: "hidden" }}>
                            <Box sx={{ height: "100%", borderRadius: 3, backgroundColor: bar.color, width: `${total > 0 ? (bar.value / total) * 100 : 0}%`, transition: "width 0.5s ease" }} />
                          </Box>
                        </Box>
                      ))}
                    </Box>
                    <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", mt: 1.5 }}>
                      {total > 0 ? `${pct.toFixed(0)}% completion` : "No assignments yet"}
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