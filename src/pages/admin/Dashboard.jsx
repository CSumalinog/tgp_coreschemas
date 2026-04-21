// src/pages/admin/Dashboard.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Chip,
  Alert,
  Divider,
  Avatar,
  MenuItem,
  Select,
  FormControl,
  Button,
  Tooltip,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import TrendingUpOutlinedIcon from "@mui/icons-material/TrendingUpOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import AssessmentOutlinedIcon from "@mui/icons-material/AssessmentOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import RadioButtonCheckedOutlinedIcon from "@mui/icons-material/RadioButtonCheckedOutlined";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import { supabase } from "../../lib/supabaseClient";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import ReportGenerator from "../../components/admin/ReportGenerator";
import BrandedLoader from "../../components/common/BrandedLoader";

// ─── Brand tokens ─────────────────────────────────────────────────────────────
const GOLD = "#f5c52b";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_12 = "rgba(245,197,43,0.12)";
const GOLD_20 = "rgba(245,197,43,0.20)";
const CHARCOAL = "#353535";
const RED = "#c62828";
const RED_15 = "rgba(198,40,40,0.15)";
const RED_L = "#ffebee";
const BORDER_L = "#e8e8e8";
const BORDER_D = "#2e2e2e";
const SURF_L = "#f7f7f7";
const SURF_D = "#222222";
const dm = "'Inter', sans-serif";

const STATUS = {
  light: {
    Pending: { bg: "rgba(245,197,43,0.12)", color: "#7a5c00" },
    Forwarded: { bg: "rgba(245,197,43,0.08)", color: "#856900" },
    Assigned: { bg: "rgba(53,53,53,0.07)", color: "#353535" },
    "For Approval": { bg: "rgba(245,197,43,0.18)", color: "#6b4f00" },
    Approved: { bg: "rgba(245,197,43,0.12)", color: "#8a6800" },
    "On Going": { bg: "rgba(59,130,246,0.10)", color: "#1d4ed8" },
    Completed: { bg: "rgba(34,197,94,0.10)", color: "#15803d" },
    Declined: { bg: RED_L, color: RED },
  },
  dark: {
    Pending: { bg: "rgba(245,197,43,0.12)", color: GOLD },
    Forwarded: { bg: "rgba(245,197,43,0.08)", color: "#e6b920" },
    Assigned: { bg: "rgba(255,255,255,0.07)", color: "#aaa" },
    "For Approval": { bg: "rgba(245,197,43,0.18)", color: GOLD },
    Approved: { bg: "rgba(245,197,43,0.12)", color: GOLD },
    "On Going": { bg: "rgba(59,130,246,0.15)", color: "#60a5fa" },
    Completed: { bg: "rgba(34,197,94,0.12)", color: "#4ade80" },
    Declined: { bg: RED_15, color: "#ef5350" },
  },
};

const URGENCY = {
  light: {
    overdue: { color: RED, border: "#ef9a9a", dot: RED, label: "Overdue" },
    critical: {
      color: RED,
      border: "rgba(198,40,40,0.3)",
      dot: RED,
      label: "Critical",
    },
    soon: {
      color: "#8a6800",
      border: "rgba(245,197,43,0.5)",
      dot: GOLD,
      label: "Soon",
    },
    upcoming: {
      color: "#888",
      border: "#e0e0e0",
      dot: "#ccc",
      label: "Upcoming",
    },
  },
  dark: {
    overdue: {
      color: "#ef5350",
      border: "rgba(198,40,40,0.4)",
      dot: "#ef5350",
      label: "Overdue",
    },
    critical: {
      color: "#ef5350",
      border: "rgba(198,40,40,0.3)",
      dot: "#ef5350",
      label: "Critical",
    },
    soon: {
      color: GOLD,
      border: "rgba(245,197,43,0.35)",
      dot: GOLD,
      label: "Soon",
    },
    upcoming: {
      color: "#555",
      border: "#3a3a3a",
      dot: "#444",
      label: "Upcoming",
    },
  },
};

const PIPELINE_STAGES = [
  {
    key: "Pending",
    label: "Pending",
    icon: PendingActionsOutlinedIcon,
    navTab: "Pending",
  },
  {
    key: "Forwarded",
    label: "Forwarded",
    icon: ForwardToInboxOutlinedIcon,
    navTab: "Forwarded",
  },
  {
    key: "Assigned",
    label: "Assigned",
    icon: AssignmentOutlinedIcon,
    navTab: "Forwarded",
  },
  {
    key: "For Approval",
    label: "For Approval",
    icon: HowToRegOutlinedIcon,
    navTab: "For Approval",
  },
  {
    key: "Approved",
    label: "Approved",
    icon: CheckCircleOutlineOutlinedIcon,
    navTab: "Approved",
  },
  {
    key: "On Going",
    label: "On Going",
    icon: RadioButtonCheckedOutlinedIcon,
    navTab: "Approved",
    isPhase2: true,
  },
  {
    key: "Completed",
    label: "Completed",
    icon: TaskAltOutlinedIcon,
    navTab: "Approved",
    isPhase2: true,
  },
];

function toEndOfDay(d) {
  return new Date(d).toISOString().split("T")[0] + "T23:59:59";
}
function getUrgency(event_date) {
  if (!event_date) return "upcoming";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const ev = new Date(event_date);
  ev.setHours(0, 0, 0, 0);
  const diff = Math.ceil((ev - today) / 86400000);
  if (diff < 0) return "overdue";
  if (diff <= 3) return "critical";
  if (diff <= 7) return "soon";
  return "upcoming";
}
export default function Dashboard() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const border = isDark ? BORDER_D : BORDER_L;
  const surf = isDark ? SURF_D : SURF_L;
  const cardShadow = isDark
    ? "0 1px 10px rgba(0,0,0,0.4)"
    : "0 1px 8px rgba(0,0,0,0.07)";
  const stCfg = isDark ? STATUS.dark : STATUS.light;
  const urgCfg = isDark ? URGENCY.dark : URGENCY.light;

  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState(null);
  const [isAllTime, setIsAllTime] = useState(false);
  const [activeSemester, setActiveSemester] = useState(null);
  const [upcomingSemester, setUpcomingSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showReports, setShowReports] = useState(false);
  const [adminName, setAdminName] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function loadAdminName() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      if (!cancelled && data?.full_name) {
        setAdminName(data.full_name.split(" ")[0]);
      }
    }
    loadAdminName();
    return () => {
      cancelled = true;
    };
  }, []);
  const [statusCounts, setStatusCounts] = useState({});
  const [perfStats, setPerfStats] = useState({
    total: 0,
    approved: 0,
    declined: 0,
    covered: 0,
    completed: 0,
    declineRate: 0,
    completionRate: 0,
    avgTurnaround: null,
  });
  const [sectionWorkload, setSectionWorkload] = useState([]);
  const [recentRequests, setRecentRequests] = useState([]);
  const [scheduleStats, setScheduleStats] = useState({ total: 0, set: 0 });
  const [todayCoverage, setTodayCoverage] = useState({
    total: 0,
    onGoing: 0,
    approved: 0,
  });

  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase
        .from("semesters")
        .select("id,name,start_date,end_date,is_active,scheduling_open")
        .order("start_date", { ascending: false });
      setSemesters(data || []);
      const active = (data || []).find((s) => s.is_active);
      setActiveSemester(active || null);
      setSelectedSemester(active || (data || [])[0] || null);
      const upcoming =
        (data || [])
          .filter((s) => !s.is_active && new Date(s.start_date) > new Date())
          .sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0] ||
        null;
      setUpcomingSemester(upcoming);
    }
    loadSemesters();
  }, []);

  const loadDashboard = useCallback(async () => {
    if (!selectedSemester && !isAllTime) return;
    let isCurrent = true;
    setLoading(true);
    setError("");
    try {
      let q = supabase
        .from("coverage_requests")
        .select(
          "id,title,status,event_date,venue,submitted_at,approved_at,entity:entity_id(name)",
        )
        .is("archived_at", null)
        .is("trashed_at", null);
      if (!isAllTime && selectedSemester)
        q = q
          .gte("submitted_at", selectedSemester.start_date)
          .lte("submitted_at", toEndOfDay(selectedSemester.end_date));
      const { data: requests, error: reqErr } = await q.order("submitted_at", {
        ascending: false,
      });
      if (reqErr) throw reqErr;
      if (!isCurrent) return;

      let aq = supabase
        .from("coverage_assignments")
        .select(
          "request_id, section, status, assigned_at, timed_in_at, completed_at",
        );
      if (!isAllTime && selectedSemester)
        aq = aq
          .gte("assigned_at", selectedSemester.start_date)
          .lte("assigned_at", toEndOfDay(selectedSemester.end_date));
      const { data: assignments } = await aq;
      if (!isCurrent) return;

      const sm = {
        News: { pending: 0, completed: 0 },
        Photojournalism: { pending: 0, completed: 0 },
        Videojournalism: { pending: 0, completed: 0 },
      };
      (assignments || []).forEach((a) => {
        if (sm[a.section]) {
          if (a.status === "Pending") sm[a.section].pending++;
          if (a.status === "Completed") sm[a.section].completed++;
        }
      });
      setSectionWorkload(
        Object.entries(sm).map(([sec, d]) => ({ section: sec, ...d })),
      );

      const assignmentProgressByRequest = new Map();
      (assignments || []).forEach((a) => {
        if (!a.request_id) return;
        const prev = assignmentProgressByRequest.get(a.request_id) || {
          total: 0,
          completed: 0,
          onGoing: 0,
        };
        prev.total += 1;
        if (a.status === "Completed" || !!a.completed_at) prev.completed += 1;
        if (a.status === "On Going" || !!a.timed_in_at) prev.onGoing += 1;
        assignmentProgressByRequest.set(a.request_id, prev);
      });

      const requestsWithComputedStatus = (requests || []).map((r) => {
        const progress = assignmentProgressByRequest.get(r.id);
        if (!progress || progress.total === 0) return r;

        if (progress.completed === progress.total) {
          return { ...r, status: "Completed" };
        }

        if (progress.onGoing > 0 && r.status !== "Completed") {
          return { ...r, status: "On Going" };
        }

        return r;
      });

      const counts = {};
      requestsWithComputedStatus.forEach((r) => {
        counts[r.status] = (counts[r.status] || 0) + 1;
      });
      setStatusCounts(counts);

      const total = requestsWithComputedStatus.length;
      const approved = requestsWithComputedStatus.filter(
        (r) => r.status === "Approved",
      ).length;
      const declined = requestsWithComputedStatus.filter(
        (r) => r.status === "Declined",
      ).length;
      const onGoing = requestsWithComputedStatus.filter(
        (r) => r.status === "On Going",
      ).length;
      const completed = requestsWithComputedStatus.filter(
        (r) => r.status === "Completed",
      ).length;
      const covered = approved + onGoing + completed;
      const assigned = requestsWithComputedStatus.filter((r) =>
        [
          "Assigned",
          "For Approval",
          "Approved",
          "On Going",
          "Completed",
        ].includes(r.status),
      ).length;
      const td = requestsWithComputedStatus
        .filter((r) => r.approved_at && r.submitted_at)
        .map(
          (r) =>
            (new Date(r.approved_at) - new Date(r.submitted_at)) / 86400000,
        );

      setPerfStats({
        total,
        approved,
        declined,
        covered,
        completed,
        declineRate: total > 0 ? ((declined / total) * 100).toFixed(1) : 0,
        completionRate:
          assigned > 0 ? ((covered / assigned) * 100).toFixed(1) : 0,
        avgTurnaround:
          td.length > 0
            ? (td.reduce((a, b) => a + b, 0) / td.length).toFixed(1)
            : null,
      });

      const attention = requestsWithComputedStatus
        .filter((r) =>
          ["Pending", "Forwarded", "Assigned", "For Approval"].includes(
            r.status,
          ),
        )
        .map((r) => ({ ...r, urgency: getUrgency(r.event_date) }))
        .sort((a, b) => {
          const o = { overdue: 0, critical: 1, soon: 2, upcoming: 3 };
          if (o[a.urgency] !== o[b.urgency]) return o[a.urgency] - o[b.urgency];
          return new Date(a.event_date || 0) - new Date(b.event_date || 0);
        })
        .slice(0, 8);
      setRecentRequests(attention);

      const todayStr = new Date().toISOString().slice(0, 10);
      const todayReqs = requestsWithComputedStatus.filter(
        (r) =>
          r.event_date === todayStr &&
          [
            "Approved",
            "On Going",
            "Assigned",
            "For Approval",
            "Forwarded",
          ].includes(r.status),
      );
      setTodayCoverage({
        total: todayReqs.length,
        onGoing: todayReqs.filter((r) => r.status === "On Going").length,
        approved: todayReqs.filter((r) => r.status === "Approved").length,
      });

      if (activeSemester?.id) {
        const { data: staffers } = await supabase
          .from("profiles")
          .select("id")
          .eq("is_active", true)
          .in("role", ["staff", "sec_head"]);
        const { data: dutySchedules } = await supabase
          .from("duty_schedules")
          .select("staffer_id")
          .eq("semester_id", activeSemester.id);
        if (!isCurrent) return;
        setScheduleStats({
          total: (staffers || []).length,
          set: (dutySchedules || []).length,
        });
      }
    } catch (err) {
      if (isCurrent) setError(err.message);
    } finally {
      if (isCurrent) setLoading(false);
    }
    return () => {
      isCurrent = false;
    };
  }, [selectedSemester, isAllTime, activeSemester]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useRealtimeNotify("coverage_requests", loadDashboard, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", loadDashboard, null, {
    title: "Assignment",
  });
  useRealtimeNotify("duty_schedules", loadDashboard, null, {
    title: "Duty Schedule",
  });

  const goToRequests = (tab) => {
    if (tab === "On Going" || tab === "Completed") {
      navigate("/admin/coverage-tracker", { state: { tab } });
      return;
    }
    navigate("/admin/request-management", { state: { tab } });
  };
  const goToRequest = (id, s) => {
    const m = {
      Pending: "Pending",
      Forwarded: "Forwarded",
      Assigned: "Forwarded",
      "For Approval": "For Approval",
      Approved: "Approved",
      "On Going": "Approved",
      Completed: "Approved",
      Declined: "Declined",
    };
    navigate("/admin/request-management", {
      state: { tab: m[s] || "all", openRequestId: id },
    });
  };

  const overdueCount = recentRequests.filter(
    (r) => r.urgency === "overdue",
  ).length;
  const criticalCount = recentRequests.filter(
    (r) => r.urgency === "critical",
  ).length;
  const forApprovalCount = recentRequests.filter(
    (r) => r.status === "For Approval",
  ).length;
  const schedPct =
    scheduleStats.total > 0
      ? (scheduleStats.set / scheduleStats.total) * 100
      : 0;
  const schedDone =
    scheduleStats.set === scheduleStats.total && scheduleStats.total > 0;

  const kpiCards = [
    {
      label: "Total Requests",
      value: perfStats.total,
      sub: "submitted this period",
      navTab: "all",
      isRed: false,
      icon: AssignmentOutlinedIcon,
    },
    {
      label: "Approved",
      value: perfStats.approved,
      sub: `${perfStats.total > 0 ? ((perfStats.approved / perfStats.total) * 100).toFixed(0) : 0}% of total`,
      navTab: "Approved",
      isRed: false,
      icon: CheckCircleOutlineOutlinedIcon,
    },
    {
      label: "Declined",
      value: perfStats.declined,
      sub: `${perfStats.declineRate}% decline rate`,
      navTab: "Declined",
      isRed: true,
      icon: CancelOutlinedIcon,
    },
    {
      label: "Completed Coverage",
      value: perfStats.completed,
      sub: "fully covered",
      navTab: "Approved",
      isRed: false,
      icon: TaskAltOutlinedIcon,
    },
  ];

  const cardHeaderSx = {
    px: 2,
    py: 1.4,
    borderBottom: `1px solid ${border}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: isDark
      ? "rgba(255,255,255,0.015)"
      : "rgba(53,53,53,0.018)",
  };
  const cardAccent = {
    width: "3px",
    height: 14,
    borderRadius: "10px",
    backgroundColor: GOLD,
    flexShrink: 0,
  };
  const cardTitleSx = {
    fontFamily: dm,
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "text.primary",
    textTransform: "uppercase",
    letterSpacing: "0.09em",
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 2.5 },
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: dm,
      }}
    >
      {/* ── Toolbar ── */}
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
          boxShadow: cardShadow,
          px: 2,
          py: 1.25,
        }}
      >
        {/* Daily pulse — today's coverage */}
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
                  label: "Approved",
                  value: todayCoverage.approved,
                  color: isDark ? "#4ade80" : "#166534",
                  hide: todayCoverage.approved === 0,
                },
                {
                  label: "In Pipeline",
                  value:
                    todayCoverage.total -
                    todayCoverage.onGoing -
                    todayCoverage.approved,
                  color: isDark ? GOLD : "#7a5c00",
                  hide:
                    todayCoverage.total -
                      todayCoverage.onGoing -
                      todayCoverage.approved ===
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

        {/* Right: Reports + filter */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          {/* Reports toggle */}
          <Box
            onClick={() => setShowReports((p) => !p)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              cursor: "pointer",
              userSelect: "none",
              transition: "color 0.15s",
              color: showReports
                ? isDark
                  ? GOLD
                  : CHARCOAL
                : "text.secondary",
              "&:hover": { color: isDark ? GOLD : CHARCOAL },
            }}
          >
            <AssessmentOutlinedIcon sx={{ fontSize: 15, color: "inherit" }} />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: showReports ? 700 : 400,
                color: "inherit",
              }}
            >
              Reports
            </Typography>
          </Box>

          {/* Divider */}
          <Box sx={{ width: "1px", height: 18, backgroundColor: border }} />

          {/* Semester filter dropdown */}
          <Select
            size="small"
            value={
              isAllTime
                ? "all"
                : selectedSemester?.id === upcomingSemester?.id
                  ? "upcoming"
                  : "current"
            }
            onChange={(e) => {
              const v = e.target.value;
              if (v === "all") {
                setIsAllTime(true);
              } else if (v === "current") {
                setIsAllTime(false);
                setSelectedSemester(activeSemester);
              } else {
                setIsAllTime(false);
                setSelectedSemester(upcomingSemester);
              }
            }}
            sx={{
              fontFamily: dm,
              fontSize: "0.73rem",
              borderRadius: "4px",
              height: 30,
              minWidth: 180,
              "& .MuiSelect-select": {
                py: 0,
                fontFamily: dm,
                fontSize: "0.73rem",
              },
              "& .MuiOutlinedInput-notchedOutline": { borderColor: border },
              "&:hover .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark ? GOLD : CHARCOAL,
              },
              "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                borderColor: isDark ? GOLD : CHARCOAL,
                borderWidth: "1px",
              },
            }}
          >
            <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.73rem" }}>
              All
            </MenuItem>
            <MenuItem
              value="current"
              disabled={!activeSemester}
              sx={{ fontFamily: dm, fontSize: "0.73rem" }}
            >
              {activeSemester
                ? getSemesterDisplayName(activeSemester)
                : "Current Semester"}
            </MenuItem>
            {upcomingSemester && (
              <MenuItem
                value="upcoming"
                sx={{ fontFamily: dm, fontSize: "0.73rem" }}
              >
                {getSemesterDisplayName(upcomingSemester)}
              </MenuItem>
            )}
          </Select>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          {error}
        </Alert>
      )}

      {/* ── Reports-only view ── */}
      {showReports && (
        <Box
          sx={{
            bgcolor: "background.paper",
            borderRadius: "10px",
            border: `1px solid ${border}`,
            boxShadow: cardShadow,
            overflow: "hidden",
          }}
        >
          <Box sx={{ ...cardHeaderSx, px: 2.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={cardAccent} />
              <Typography sx={cardTitleSx}>Reports</Typography>
            </Box>
          </Box>
          <Box sx={{ p: 2 }}>
            <ReportGenerator
              selectedSemester={selectedSemester}
              isAllTime={isAllTime}
            />
          </Box>
        </Box>
      )}

      {!showReports && loading ? (
        <BrandedLoader size={84} minHeight="40vh" />
      ) : !showReports ? (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {/* ── KPI Strip ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "repeat(2,1fr)", md: "repeat(4,1fr)" },
              gap: 1.5,
            }}
          >
            {kpiCards.map((k) => {
              const Icon = k.icon;
              return (
                <Box
                  key={k.label}
                  onClick={k.navTab ? () => goToRequests(k.navTab) : undefined}
                  sx={{
                    bgcolor: "background.paper",
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    boxShadow: cardShadow,
                    p: { xs: 1.75, md: 2.25 },
                    height: { xs: 110, md: 140 },
                    boxSizing: "border-box",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    ...(k.navTab
                      ? {
                          cursor: "pointer",
                          transition: "border-color 0.15s, box-shadow 0.15s",
                          "&:hover": {
                            borderColor: GOLD,
                            boxShadow: `0 4px 16px ${GOLD_12}`,
                          },
                        }
                      : {}),
                  }}
                >
                  {/* Top row: icon + label */}
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1.25 }}
                  >
                    <Box
                      sx={{
                        width: { xs: 36, md: 42 },
                        height: { xs: 36, md: 42 },
                        borderRadius: "10px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: k.isRed
                          ? isDark
                            ? RED_15
                            : RED_L
                          : isDark
                            ? GOLD_12
                            : "rgba(245,197,43,0.09)",
                      }}
                    >
                      <Icon
                        sx={{
                          fontSize: { xs: 17, md: 20 },
                          color: k.isRed ? RED : GOLD,
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: { xs: "0.68rem", md: "0.72rem" },
                        fontWeight: 500,
                        color: "text.secondary",
                        lineHeight: 1.3,
                      }}
                    >
                      {k.label}
                    </Typography>
                  </Box>
                  {/* Bottom: big number + sub */}
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: { xs: "1.7rem", md: "2rem" },
                        fontWeight: 800,
                        lineHeight: 1,
                        letterSpacing: "-0.03em",
                        color: k.isRed ? RED : "text.primary",
                      }}
                    >
                      {k.value}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.67rem",
                        color: "text.disabled",
                        mt: 0.25,
                      }}
                    >
                      {k.sub}
                    </Typography>
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* ── Main row ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "3fr 1fr" },
              gap: 1.5,
              alignItems: "start",
            }}
          >
            {/* Needs Attention */}
            <Box
              sx={{
                bgcolor: "background.paper",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                boxShadow: cardShadow,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: { xs: "auto", lg: 420 },
              }}
            >
              <Box sx={cardHeaderSx}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={cardAccent} />
                  <Typography sx={cardTitleSx}>Needs Attention</Typography>
                  {recentRequests.length > 0 && (
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.1,
                        borderRadius: "10px",
                        backgroundColor: GOLD_12,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: isDark ? GOLD : "#7a5c00",
                        }}
                      >
                        {recentRequests.length}
                      </Typography>
                    </Box>
                  )}
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  {overdueCount > 0 && (
                    <Box
                      sx={{
                        px: 1,
                        py: 0.15,
                        borderRadius: "10px",
                        backgroundColor: isDark ? RED_15 : RED_L,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: isDark ? "#ef5350" : RED,
                        }}
                      >
                        {overdueCount} overdue
                      </Typography>
                    </Box>
                  )}
                  {criticalCount > 0 && (
                    <Box
                      sx={{
                        px: 1,
                        py: 0.15,
                        borderRadius: "10px",
                        backgroundColor: isDark ? RED_15 : RED_L,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.6rem",
                          fontWeight: 700,
                          color: isDark ? "#ef9a9a" : "#b71c1c",
                        }}
                      >
                        {criticalCount} critical
                      </Typography>
                    </Box>
                  )}
                  <Box
                    onClick={() => goToRequests("all")}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.3,
                      cursor: "pointer",
                      color: "text.disabled",
                      "&:hover": { color: GOLD },
                      transition: "color 0.15s",
                    }}
                  >
                    <OpenInNewOutlinedIcon sx={{ fontSize: 13 }} />
                    <Typography sx={{ fontFamily: dm, fontSize: "0.67rem" }}>
                      View all
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {recentRequests.length === 0 ? (
                <Box sx={{ py: 6, textAlign: "center" }}>
                  <CheckCircleOutlineOutlinedIcon
                    sx={{
                      fontSize: 28,
                      color: isDark ? "#333" : "#ddd",
                      mb: 1,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.82rem",
                      color: "text.disabled",
                    }}
                  >
                    All clear — nothing needs attention.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Box sx={{ flex: 1, overflowY: "auto" }}>
                    {recentRequests.map((r, idx) => {
                      const isFirstOfGroup =
                        idx === 0 ||
                        r.urgency !== recentRequests[idx - 1].urgency;
                      const urg = urgCfg[r.urgency];
                      const st = stCfg[r.status] || {
                        bg: isDark ? "#252525" : "#f5f5f5",
                        color: "#888",
                      };
                      return (
                        <React.Fragment key={r.id}>
                          {isFirstOfGroup && (
                            <Box
                              sx={{
                                px: 2.5,
                                py: 0.55,
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                backgroundColor: isDark ? "#181818" : "#f5f5f5",
                                borderBottom: `1px solid ${border}`,
                              }}
                            >
                              <Box
                                sx={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: "50%",
                                  backgroundColor: urg.dot,
                                  flexShrink: 0,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.6rem",
                                  fontWeight: 700,
                                  color: urg.color,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.09em",
                                }}
                              >
                                {urg.label}
                              </Typography>
                            </Box>
                          )}
                          <Box
                            onClick={() => goToRequest(r.id, r.status)}
                            sx={{
                              px: 2.5,
                              py: 1.4,
                              borderBottom:
                                idx < recentRequests.length - 1
                                  ? `1px solid ${border}`
                                  : "none",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 2,
                              borderLeft: "3px solid",
                              borderLeftColor: urg.border,
                              backgroundColor:
                                r.urgency === "overdue"
                                  ? isDark
                                    ? "rgba(198,40,40,0.05)"
                                    : "rgba(255,235,238,0.4)"
                                  : r.urgency === "critical"
                                    ? isDark
                                      ? "rgba(198,40,40,0.03)"
                                      : "rgba(255,235,238,0.2)"
                                    : r.urgency === "soon"
                                      ? isDark
                                        ? "rgba(245,197,43,0.02)"
                                        : "rgba(245,197,43,0.03)"
                                      : "transparent",
                              cursor: "pointer",
                              transition: "background 0.12s",
                              "&:hover": {
                                backgroundColor: isDark
                                  ? "rgba(255,255,255,0.02)"
                                  : SURF_L,
                              },
                            }}
                          >
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.75,
                                  mb: 0.3,
                                }}
                              >
                                <Box
                                  sx={{
                                    width: 5,
                                    height: 5,
                                    borderRadius: "50%",
                                    backgroundColor: urg.dot,
                                    flexShrink: 0,
                                  }}
                                />
                                <Typography
                                  sx={{
                                    fontFamily: dm,
                                    fontWeight: 600,
                                    fontSize: "0.83rem",
                                    color: "text.primary",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {r.title}
                                </Typography>
                              </Box>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 1.25,
                                  pl: "13px",
                                }}
                              >
                                {r.entity?.name && (
                                  <Typography
                                    sx={{
                                      fontFamily: dm,
                                      fontSize: "0.69rem",
                                      color: "text.disabled",
                                    }}
                                  >
                                    {r.entity.name}
                                  </Typography>
                                )}
                                {r.event_date && (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.3,
                                    }}
                                  >
                                    <CalendarTodayOutlinedIcon
                                      sx={{ fontSize: 10, color: urg.dot }}
                                    />
                                    <Typography
                                      sx={{
                                        fontFamily: dm,
                                        fontSize: "0.69rem",
                                        color: urg.color,
                                        fontWeight:
                                          r.urgency !== "upcoming" ? 600 : 400,
                                      }}
                                    >
                                      {new Date(
                                        r.event_date,
                                      ).toLocaleDateString("en-US", {
                                        month: "short",
                                        day: "numeric",
                                        year: "numeric",
                                      })}
                                      {r.urgency === "overdue" && " · Overdue"}
                                      {r.urgency === "critical" && " · ≤3 days"}
                                      {r.urgency === "soon" && " · This week"}
                                    </Typography>
                                  </Box>
                                )}
                                {r.venue && !isMobile && (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 0.3,
                                    }}
                                  >
                                    <LocationOnOutlinedIcon
                                      sx={{
                                        fontSize: 10,
                                        color: "text.disabled",
                                      }}
                                    />
                                    <Typography
                                      sx={{
                                        fontFamily: dm,
                                        fontSize: "0.69rem",
                                        color: "text.disabled",
                                      }}
                                    >
                                      {r.venue}
                                    </Typography>
                                  </Box>
                                )}
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                                flexShrink: 0,
                              }}
                            >
                              {r.urgency !== "upcoming" && (
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.3,
                                  }}
                                >
                                  <WarningAmberOutlinedIcon
                                    sx={{ fontSize: 11, color: urg.color }}
                                  />
                                  <Typography
                                    sx={{
                                      fontFamily: dm,
                                      fontSize: "0.63rem",
                                      color: urg.color,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {urg.label}
                                  </Typography>
                                </Box>
                              )}
                              <Box
                                sx={{
                                  px: 0.9,
                                  py: 0.2,
                                  borderRadius: "10px",
                                  backgroundColor: st.bg,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontFamily: dm,
                                    fontSize: "0.63rem",
                                    fontWeight: 600,
                                    color: st.color,
                                  }}
                                >
                                  {r.status}
                                </Typography>
                              </Box>
                              <ChevronRightIcon
                                sx={{ fontSize: 14, color: "text.disabled" }}
                              />
                            </Box>
                          </Box>
                        </React.Fragment>
                      );
                    })}
                  </Box>

                  {/* View more footer */}
                  <Box
                    onClick={() => navigate("/admin/request-management")}
                    sx={{
                      px: 2.5,
                      py: 1,
                      borderTop: `1px solid ${border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 0.4,
                      cursor: "pointer",
                      transition: "background 0.12s",
                      "&:hover": { backgroundColor: surf },
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.72rem",
                        color: "text.disabled",
                      }}
                    >
                      View all requests
                    </Typography>
                    <ChevronRightIcon
                      sx={{ fontSize: 13, color: "text.disabled" }}
                    />
                  </Box>
                </>
              )}
            </Box>

            {/* Right column */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
              {/* Pipeline */}
              <Box
                sx={{
                  bgcolor: "background.paper",
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  boxShadow: cardShadow,
                  overflow: "hidden",
                  display: "flex",
                  flexDirection: "column",
                  height: { xs: "auto", lg: 420 },
                }}
              >
                <Box sx={cardHeaderSx}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Box sx={cardAccent} />
                    <Typography sx={cardTitleSx}>Pipeline</Typography>
                  </Box>
                </Box>
                <Box
                  sx={{
                    px: 1.5,
                    py: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.2,
                    flex: 1,
                    overflowY: "auto",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      mb: 0.25,
                    }}
                  >
                    <Divider sx={{ flex: 1, borderColor: border }} />
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.54rem",
                        fontWeight: 700,
                        color: "text.disabled",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Request
                    </Typography>
                    <Divider sx={{ flex: 1, borderColor: border }} />
                  </Box>
                  {[
                    ...PIPELINE_STAGES,
                    {
                      key: "Declined",
                      label: "Declined",
                      icon: CancelOutlinedIcon,
                      navTab: "Declined",
                      isDivider: true,
                    },
                  ].map((stage) => {
                    const count = statusCounts[stage.key] || 0;
                    const isActive = count > 0;
                    const isRed = !!stage.isDivider;
                    const isP2 = !!stage.isPhase2;
                    const Icon = stage.icon;
                    const pct =
                      perfStats.total > 0 ? (count / perfStats.total) * 100 : 0;
                    return (
                      <React.Fragment key={stage.key}>
                        {isRed && (
                          <Divider sx={{ my: 0.5, borderColor: border }} />
                        )}
                        {isP2 && stage.key === "On Going" && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              my: 0.5,
                            }}
                          >
                            <Divider sx={{ flex: 1, borderColor: border }} />
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.54rem",
                                fontWeight: 700,
                                color: "text.disabled",
                                textTransform: "uppercase",
                                letterSpacing: "0.08em",
                                whiteSpace: "nowrap",
                              }}
                            >
                              Coverage Assignment
                            </Typography>
                            <Divider sx={{ flex: 1, borderColor: border }} />
                          </Box>
                        )}
                        <Box
                          onClick={
                            isActive
                              ? () => goToRequests(stage.navTab)
                              : undefined
                          }
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 1.25,
                            py: 0.7,
                            px: 0.75,
                            borderRadius: "10px",
                            opacity: isP2 ? 0.5 : 1,
                            ...(isActive
                              ? {
                                  cursor: "pointer",
                                  transition: "background 0.12s",
                                  "&:hover": {
                                    backgroundColor: isDark
                                      ? "rgba(255,255,255,0.03)"
                                      : SURF_L,
                                  },
                                }
                              : {}),
                          }}
                        >
                          <Box
                            sx={{
                              width: 24,
                              height: 24,
                              borderRadius: "10px",
                              flexShrink: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isActive
                                ? isRed
                                  ? isDark
                                    ? RED_15
                                    : RED_L
                                  : isP2
                                    ? "rgba(59,130,246,0.12)"
                                    : GOLD_12
                                : isDark
                                  ? "#1e1e1e"
                                  : "#f5f5f5",
                              color: isActive
                                ? isRed
                                  ? RED
                                  : isP2
                                    ? "#3b82f6"
                                    : GOLD
                                : isDark
                                  ? "#3a3a3a"
                                  : "#ccc",
                            }}
                          >
                            <Icon sx={{ fontSize: 12 }} />
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                mb: 0.3,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.72rem",
                                  color: isActive
                                    ? "text.primary"
                                    : "text.disabled",
                                  fontWeight: isActive ? 600 : 400,
                                }}
                              >
                                {stage.label}
                              </Typography>
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.72rem",
                                  fontWeight: 700,
                                  color:
                                    isRed && isActive
                                      ? RED
                                      : isActive
                                        ? "text.primary"
                                        : "text.disabled",
                                }}
                              >
                                {count}
                              </Typography>
                            </Box>
                            <Box
                              sx={{
                                height: 2,
                                borderRadius: "10px",
                                backgroundColor: isDark ? "#252525" : "#efefef",
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                sx={{
                                  height: "100%",
                                  borderRadius: "10px",
                                  backgroundColor: isRed
                                    ? RED
                                    : isP2
                                      ? "#3b82f6"
                                      : GOLD,
                                  width: `${pct}%`,
                                  transition: "width 0.4s ease",
                                }}
                              />
                            </Box>
                          </Box>
                        </Box>
                      </React.Fragment>
                    );
                  })}
                </Box>
              </Box>
            </Box>
          </Box>

          {/* ── Bottom row: Scheduling + Section Workload ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "280px 1fr" },
              gap: 1.5,
              alignItems: "start",
            }}
          >
            {/* Scheduling */}
            <Box
              onClick={() => navigate("/admin/duty-schedule-view")}
              sx={{
                bgcolor: "background.paper",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                boxShadow: cardShadow,
                overflow: "hidden",
                cursor: "pointer",
                transition: "border-color 0.15s,box-shadow 0.15s",
                "&:hover": {
                  borderColor: GOLD,
                  boxShadow: `0 4px 18px ${GOLD_12}`,
                },
              }}
            >
              <Box sx={cardHeaderSx}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={cardAccent} />
                  <Typography sx={cardTitleSx}>Scheduling</Typography>
                </Box>
                {activeSemester && (
                  <Box
                    sx={{
                      px: 0.75,
                      py: 0.15,
                      borderRadius: "10px",
                      backgroundColor: activeSemester.scheduling_open
                        ? GOLD_12
                        : isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(53,53,53,0.04)",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        color: activeSemester.scheduling_open
                          ? isDark
                            ? GOLD
                            : "#7a5c00"
                          : "text.disabled",
                      }}
                    >
                      {activeSemester.scheduling_open ? "Open" : "Closed"}
                    </Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ px: 2, py: 1.75 }}>
                {!activeSemester ? (
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.disabled",
                    }}
                  >
                    No active semester.
                  </Typography>
                ) : (
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        mb: 1,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <GroupOutlinedIcon
                          sx={{ fontSize: 12, color: "text.secondary" }}
                        />
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.73rem",
                            color: "text.secondary",
                          }}
                        >
                          Duty days set
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.92rem",
                          fontWeight: 800,
                          color: schedDone ? GOLD : RED,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        {scheduleStats.set}
                        <Typography
                          component="span"
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.7rem",
                            fontWeight: 400,
                            color: "text.disabled",
                          }}
                        >
                          /{scheduleStats.total}
                        </Typography>
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 4,
                        borderRadius: "10px",
                        backgroundColor: isDark ? "#252525" : "#f0f0f0",
                        mb: 1.25,
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          borderRadius: "10px",
                          backgroundColor: GOLD,
                          width: `${schedPct}%`,
                          transition: "width 0.4s ease",
                        }}
                      />
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.67rem",
                        color: "text.disabled",
                      }}
                    >
                      {new Date(activeSemester.start_date).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                      {" – "}
                      {new Date(activeSemester.end_date).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </Typography>
                  </>
                )}
              </Box>
            </Box>

            {/* Section Workload */}
            <Box
              sx={{
                bgcolor: "background.paper",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                boxShadow: cardShadow,
                overflow: "hidden",
              }}
            >
              <Box sx={{ ...cardHeaderSx, px: 2.5 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box sx={cardAccent} />
                  <Typography sx={cardTitleSx}>Section Workload</Typography>
                </Box>
              </Box>
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(3,1fr)" },
                }}
              >
                {sectionWorkload.map((s, idx) => {
                  const total = s.pending + s.completed;
                  const pct = total > 0 ? (s.completed / total) * 100 : 0;
                  const c = {
                    News: { dot: GOLD, bar: GOLD },
                    Photojournalism: { dot: "#888", bar: "#888" },
                    Videojournalism: { dot: "#c49b00", bar: "#c49b00" },
                  }[s.section] || { dot: GOLD, bar: GOLD };
                  return (
                    <Box
                      key={s.section}
                      sx={{
                        px: 2.5,
                        py: 2,
                        borderRight: {
                          xs: "none",
                          sm:
                            idx < sectionWorkload.length - 1
                              ? `1px solid ${border}`
                              : "none",
                        },
                        borderBottom: {
                          xs:
                            idx < sectionWorkload.length - 1
                              ? `1px solid ${border}`
                              : "none",
                          sm: "none",
                        },
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 1.25,
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                          }}
                        >
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              backgroundColor: c.dot,
                            }}
                          />
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "text.primary",
                            }}
                          >
                            {s.section}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.67rem",
                            color: "text.disabled",
                          }}
                        >
                          {total > 0
                            ? `${pct.toFixed(0)}% done`
                            : "No assignments"}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          height: 3,
                          borderRadius: "10px",
                          backgroundColor: isDark ? "#252525" : "#f0f0f0",
                          mb: 1.25,
                          overflow: "hidden",
                        }}
                      >
                        <Box
                          sx={{
                            height: "100%",
                            borderRadius: "10px",
                            backgroundColor: c.bar,
                            width: `${pct}%`,
                            transition: "width 0.5s ease",
                          }}
                        />
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        {[
                          {
                            label: "Completed",
                            value: s.completed,
                            color: c.dot,
                          },
                          {
                            label: "Pending",
                            value: s.pending,
                            color: isDark ? "#3a3a3a" : "#ccc",
                          },
                        ].map((item) => (
                          <Box
                            key={item.label}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                backgroundColor: item.color,
                              }}
                            />
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.67rem",
                                color: "text.disabled",
                              }}
                            >
                              {item.label}
                            </Typography>
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.67rem",
                                fontWeight: 700,
                                color: "text.secondary",
                                ml: 0.25,
                              }}
                            >
                              {item.value}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
