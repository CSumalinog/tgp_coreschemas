// src/pages/admin/AdminRequestManagement.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
  IconButton,
  Badge,
  Paper,
  ClickAwayListener,
  GlobalStyles,
  Avatar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useSearchParams, useLocation } from "react-router-dom";
import { useAdminRequests } from "../../hooks/useAdminRequest";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import RequestDetails from "../../components/admin/RequestDetails";
import { supabase } from "../../lib/supabaseClient";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import { getAvatarUrl } from "../../components/common/UserAvatar";

// ── Tab icons ─────────────────────────────────────────────────────────────────
import ListAltOutlinedIcon        from "@mui/icons-material/ListAltOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import VerifiedOutlinedIcon       from "@mui/icons-material/VerifiedOutlined";
import VideocamOutlinedIcon       from "@mui/icons-material/VideocamOutlined";
import TaskAltOutlinedIcon        from "@mui/icons-material/TaskAltOutlined";
import CancelOutlinedIcon         from "@mui/icons-material/CancelOutlined";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD      = "#F5C52B";
const GOLD_08   = "rgba(245,197,43,0.08)";
const CHARCOAL  = "#353535";
const BORDER      = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG  = "rgba(53,53,53,0.03)";
const dm        = "'Inter', sans-serif";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:        { bg: "#fef9ec", color: "#b45309", dot: "#f59e0b" },
  Forwarded:      { bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  Assigned:       { bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  "For Approval": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Approved:       { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  "On Going":     { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Declined:       { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
};

// ── Tabs — with icons ─────────────────────────────────────────────────────────
const TABS = [
  { label: "All Requests",  key: "all",          Icon: ListAltOutlinedIcon },
  { label: "Pending",       key: "Pending",       Icon: HourglassEmptyOutlinedIcon },
  { label: "Forwarded",     key: "Forwarded",     Icon: ForwardToInboxOutlinedIcon },
  { label: "For Approval",  key: "For Approval",  Icon: PendingActionsOutlinedIcon },
  { label: "Approved",      key: "Approved",      Icon: VerifiedOutlinedIcon },
  { label: "On Going",      key: "On Going",      Icon: VideocamOutlinedIcon },
  { label: "Completed",     key: "Completed",     Icon: TaskAltOutlinedIcon },
  { label: "Declined",      key: "Declined",      Icon: CancelOutlinedIcon },
];

const TAB_DESCRIPTIONS = {
  all:            "All submitted requests across all statuses.",
  Pending:        "Newly submitted requests awaiting your review.",
  Forwarded:      "Requests forwarded to section heads for staff assignment.",
  "For Approval": "Staffers have been assigned. Review and give final approval.",
  Approved:       "Requests that have been fully approved and are ready for coverage.",
  "On Going":     "Coverage currently in progress — staff have timed in and are on-site.",
  Completed:      "Coverage finished — full time in, time out, and duration records.",
  Declined:       "Requests that were declined at any stage and their reasons.",
};

// ── Section color map ─────────────────────────────────────────────────────────
const SECTION_COLORS = {
  News:            { bg: "#e3f2fd", color: "#1565c0", dot: "#1976d2" },
  Photojournalism: { bg: "#f3e5f5", color: "#7b1fa2", dot: "#8b5cf6" },
  Videojournalism: { bg: "#e8f5e9", color: "#2e7d32", dot: "#22c55e" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const computeDuration = (timedIn, completedAt) => {
  if (!timedIn || !completedAt) return null;
  const diffMs = new Date(completedAt) - new Date(timedIn);
  if (diffMs <= 0) return null;
  const totalMins = Math.floor(diffMs / 60000);
  const hrs  = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0)  return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

const fmtTime = (ts) => {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};

const fmtDateStr = (d, opts = { month: "short", day: "numeric", year: "numeric" }) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
};

const buildEventDateDisplay = (req) => {
  if (req.is_multiday && req.event_days?.length > 0) {
    const sorted = [...req.event_days].sort((a, b) => a.date.localeCompare(b.date));
    const first = fmtDateStr(sorted[0].date, { month: "short", day: "numeric" });
    const last  = fmtDateStr(sorted[sorted.length - 1].date, { month: "short", day: "numeric", year: "numeric" });
    return sorted.length === 1 ? fmtDateStr(sorted[0].date) : `${first} – ${last}`;
  }
  return req.event_date
    ? new Date(req.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "—";
};

// ── Column menu GlobalStyles ──────────────────────────────────────────────────
function ColumnMenuStyles({ isDark, border }) {
  const paperBg   = isDark ? "#1e1e1e" : "#ffffff";
  const shadow    = isDark ? "0 12px 40px rgba(0,0,0,0.55)" : "0 4px 24px rgba(53,53,53,0.12)";
  const textColor = isDark ? "rgba(255,255,255,0.85)" : CHARCOAL;
  const iconColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(53,53,53,0.4)";
  const hoverBg   = isDark ? "rgba(245,197,43,0.08)" : "rgba(245,197,43,0.07)";
  return (
    <GlobalStyles styles={{
      ".MuiPaper-root:has(> .MuiDataGrid-menuList)": { borderRadius: "10px !important", border: `1px solid ${border} !important`, backgroundColor: `${paperBg} !important`, boxShadow: `${shadow} !important`, minWidth: "180px !important", overflow: "hidden !important" },
      ".MuiDataGrid-menuList": { padding: "4px 0 !important" },
      ".MuiDataGrid-menuList .MuiMenuItem-root": { fontFamily: `${dm} !important`, fontSize: "0.78rem !important", fontWeight: "500 !important", color: `${textColor} !important`, padding: "7px 14px !important", minHeight: "unset !important", gap: "10px !important", transition: "background-color 0.12s, color 0.12s !important" },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover": { backgroundColor: `${hoverBg} !important`, color: "#b45309 !important" },
      ".MuiDataGrid-menuList .MuiMenuItem-root .MuiListItemIcon-root": { minWidth: "unset !important", color: `${iconColor} !important`, transition: "color 0.12s !important" },
      ".MuiDataGrid-menuList .MuiMenuItem-root .MuiSvgIcon-root": { fontSize: "1rem !important", color: `${iconColor} !important` },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiListItemIcon-root": { color: "#b45309 !important" },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiSvgIcon-root": { color: "#b45309 !important" },
      ".MuiDataGrid-menuList .MuiListItemText-primary": { fontFamily: `${dm} !important`, fontSize: "0.78rem !important", fontWeight: "500 !important" },
      ".MuiDataGrid-menuList .MuiDivider-root": { borderColor: `${border} !important`, margin: "4px 12px !important" },
    }} />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AdminRequestManagement() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const location = useLocation();
  const border = isDark ? BORDER_DARK : BORDER;

  const {
    requests, pending, forwarded, forApproval, approved,
    onGoing, completed, declined, loading, refetch,
  } = useAdminRequests();

  useRealtimeNotify("coverage_requests", refetch, null, { title: "Coverage Request" });

  const [tab, setTab] = useState(() => {
    const incoming = location.state?.tab;
    if (!incoming) return 0;
    const idx = TABS.findIndex((t) => t.key === incoming);
    return idx >= 0 ? idx : 0;
  });

  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const openId = location.state?.openRequestId;
    if (!openId || loading || requests.length === 0) return;
    const found = requests.find((r) => r.id === openId);
    if (found) setSelectedRequest(found);
  }, [location.state?.openRequestId, loading, requests]);

  const [semesters,      setSemesters]      = useState([]);
  const [selectedSem,    setSelectedSem]    = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [filterOpen,     setFilterOpen]     = useState(false);
  const filterRef = useRef(null);

  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";

  useEffect(() => {
    const incoming = location.state?.tab;
    if (!incoming) return;
    const idx = TABS.findIndex((t) => t.key === incoming);
    if (idx >= 0) setTab(idx);
  }, [location.state?.tab]);

  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase
        .from("semesters").select("id, name, start_date, end_date")
        .order("start_date", { ascending: false });
      setSemesters(data || []);
    }
    loadSemesters();
  }, []);

  const entityOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    requests.forEach((r) => {
      const name = r.entity?.name;
      if (name && !seen.has(name)) { seen.add(name); opts.push(name); }
    });
    return opts.sort();
  }, [requests]);

  const activeFilterCount = (selectedSem !== "all" ? 1 : 0) + (selectedEntity !== "all" ? 1 : 0);

  const applyFilters = (source) => {
    let filtered = source;
    if (selectedSem !== "all") {
      const sem = semesters.find((s) => s.id === selectedSem);
      if (sem) {
        const start = new Date(sem.start_date);
        const end   = new Date(sem.end_date);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter((r) => {
          const dateField = ["On Going", "Completed"].includes(r.status) ? r.event_date : r.submitted_at;
          if (!dateField) return false;
          const d = new Date(dateField);
          return d >= start && d <= end;
        });
      }
    }
    if (selectedEntity !== "all") {
      filtered = filtered.filter((r) => r.entity?.name === selectedEntity);
    }
    return filtered;
  };

  const getBaseSource = (key) => {
    if (key === "all")          return requests.filter((r) => r.status !== "Draft");
    if (key === "Pending")      return pending;
    if (key === "Forwarded")    return forwarded;
    if (key === "For Approval") return forApproval || requests.filter((r) => r.status === "For Approval");
    if (key === "Approved")     return approved;
    if (key === "On Going")     return onGoing;
    if (key === "Completed")    return completed;
    if (key === "Declined")     return declined;
    return [];
  };

  const filteredSource = useMemo(
    () => applyFilters(getBaseSource(TABS[tab].key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, requests, selectedSem, selectedEntity, semesters],
  );

  const rows = filteredSource.map((req) => ({
    id:             req.id,
    requestTitle:   req.title,
    client:         req.entity?.name || "—",
    dateReceived:   req.submitted_at
      ? new Date(req.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    eventDate:      buildEventDateDisplay(req),
    is_multiday:    !!(req.is_multiday && req.event_days?.length > 0),
    forwardedTo:    req.forwarded_sections || [],
    forwardedBy:    req.forwarded_by_profile?.full_name || "—",
    approvedBy:     req.approved_by_profile?.full_name  || "—",
    declinedBy:     req.declined_by_profile?.full_name  || "—",
    declinedReason: req.declined_reason || "—",
    status:         req.status,
    assignments:    req.coverage_assignments || [],
    _raw:           req,
  }));

  const getTabCount = (key) => applyFilters(getBaseSource(key)).length;

  // ── Shared columns ─────────────────────────────────────────────────────────
  const titleCol = {
    field: "requestTitle", headerName: "Request Title", flex: 1.4, minWidth: 180,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%", gap: 0.75 }}>
        <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p.value}
        </Typography>
        {p.row.is_multiday && (
          <Box sx={{ px: 0.75, py: 0.15, borderRadius: "20px", flexShrink: 0, backgroundColor: isDark ? "#0d1f0d" : "#f0fdf4", border: "1px solid", borderColor: isDark ? "#166534" : "#86efac" }}>
            <Typography sx={{ fontFamily: dm, fontSize: "0.58rem", fontWeight: 700, color: isDark ? "#4ade80" : "#15803d" }}>Multi-day</Typography>
          </Box>
        )}
      </Box>
    ),
  };

  const clientCol = {
    field: "client", headerName: "Client", flex: 1, minWidth: 120,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };

  const receivedCol = {
    field: "dateReceived", headerName: "Received", flex: 0.9, minWidth: 110,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };

  const eventDateCol = {
    field: "eventDate", headerName: "Event Date", flex: 1.1, minWidth: 150,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary", whiteSpace: "nowrap" }}>
          {p.value}
        </Typography>
      </Box>
    ),
  };

  const actionCol = {
    field: "actions", headerName: "", flex: 0.5, minWidth: 80,
    sortable: false, align: "right", headerAlign: "right",
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%", pr: 0.5 }}>
        <Box
          onClick={() => setSelectedRequest(p.row._raw)}
          sx={{ px: 1.25, py: 0.45, borderRadius: "6px", cursor: "pointer", border: `1px solid ${border}`, fontFamily: dm, fontSize: "0.73rem", fontWeight: 500, color: "text.secondary", transition: "all 0.15s", "&:hover": { borderColor: GOLD, color: CHARCOAL, backgroundColor: GOLD_08 } }}
        >
          View
        </Box>
      </Box>
    ),
  };

  // ── Forwarded To — stacked column, row height auto-adjusts ──────────────
  const forwardedToCol = {
    field: "forwardedTo", headerName: "Forwarded To", flex: 1.4, minWidth: 200,
    renderCell: (p) => {
      const sections = p.value || [];
      if (!sections.length) return <MetaCell>—</MetaCell>;
      return (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.4, py: 0.75 }}>
          {sections.map((s, i) => {
            const clr = SECTION_COLORS[s] || { bg: "#f3f4f6", color: "#6b7280", dot: "#9ca3af" };
            return (
              <Box key={i} sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 0.9, py: 0.3, borderRadius: "5px", backgroundColor: clr.bg, width: "fit-content" }}>
                <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: clr.dot, flexShrink: 0 }} />
                <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", fontWeight: 600, color: clr.color, whiteSpace: "nowrap" }}>{s}</Typography>
              </Box>
            );
          })}
        </Box>
      );
    },
  };

  const forwardedByCol = {
    field: "forwardedBy", headerName: "Forwarded By", flex: 1, minWidth: 130,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%", gap: 0.75 }}>
        {p.value !== "—" && (
          <Avatar sx={{ width: 20, height: 20, fontSize: "0.55rem", fontWeight: 700, backgroundColor: "#f5f3ff", color: "#6d28d9" }}>
            {getInitials(p.value)}
          </Avatar>
        )}
        <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: p.value === "—" ? "text.disabled" : "text.primary" }}>{p.value}</Typography>
      </Box>
    ),
  };

  const approvedByCol = {
    field: "approvedBy", headerName: "Approved By", flex: 1, minWidth: 130,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%", gap: 0.75 }}>
        {p.value !== "—" && (
          <Avatar sx={{ width: 20, height: 20, fontSize: "0.55rem", fontWeight: 700, backgroundColor: "#f0fdf4", color: "#15803d" }}>
            {getInitials(p.value)}
          </Avatar>
        )}
        <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: p.value === "—" ? "text.disabled" : "text.primary" }}>{p.value}</Typography>
      </Box>
    ),
  };

  const declinedByCol = {
    field: "declinedBy", headerName: "Declined By", flex: 1, minWidth: 130,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%", gap: 0.75 }}>
        {p.value !== "—" && (
          <Avatar sx={{ width: 20, height: 20, fontSize: "0.55rem", fontWeight: 700, backgroundColor: "#fef2f2", color: "#dc2626" }}>
            {getInitials(p.value)}
          </Avatar>
        )}
        <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: p.value === "—" ? "text.disabled" : "text.primary" }}>{p.value}</Typography>
      </Box>
    ),
  };

  const declinedReasonCol = {
    field: "declinedReason", headerName: "Reason", flex: 1.4, minWidth: 180,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: p.value === "—" ? "text.disabled" : "#dc2626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: p.value === "—" ? "normal" : "italic" }}>
          {p.value}
        </Typography>
      </Box>
    ),
  };

  const statusCol = {
    field: "status", headerName: "Status", flex: 0.9, minWidth: 110,
    renderCell: (p) => {
      const cfg = STATUS_CONFIG[p.value] || { bg: "#f9fafb", color: "#6b7280", dot: "#9ca3af" };
      return (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.25, py: 0.35, borderRadius: "6px", backgroundColor: cfg.bg }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: cfg.dot, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 600, color: cfg.color, letterSpacing: "0.04em" }}>{p.value}</Typography>
          </Box>
        </Box>
      );
    },
  };

  const onGoingStaffersCol = {
    field: "assignments", headerName: "Staffers On-Site", flex: 1.6, minWidth: 200, sortable: false,
    renderCell: (p) => {
      const assignments = p.value || [];
      if (!assignments.length) return <MetaCell>—</MetaCell>;
      return (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.35, height: "100%", py: 0.5 }}>
          {assignments.map((a) => {
            const url    = getAvatarUrl(a.staffer?.avatar_url);
            const timeIn = fmtTime(a.timed_in_at);
            return (
              <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                <Avatar src={url} sx={{ width: 18, height: 18, fontSize: "0.48rem", fontWeight: 700, backgroundColor: "#eff6ff", color: "#1d4ed8", flexShrink: 0 }}>
                  {!url && getInitials(a.staffer?.full_name)}
                </Avatar>
                <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: "text.primary", fontWeight: 500 }}>{a.staffer?.full_name || "—"}</Typography>
                {timeIn ? (
                  <Box sx={{ px: 0.8, py: 0.15, borderRadius: "5px", backgroundColor: isDark ? "rgba(59,130,246,0.12)" : "#eff6ff", flexShrink: 0 }}>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.64rem", fontWeight: 600, color: "#1d4ed8" }}>{timeIn}</Typography>
                  </Box>
                ) : (
                  <Box sx={{ px: 0.8, py: 0.15, borderRadius: "5px", backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb", flexShrink: 0 }}>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.64rem", fontWeight: 600, color: "#b45309" }}>Not yet</Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      );
    },
  };

  const completedStafferCol = {
    field: "assignments", headerName: "Staffer", flex: 1.2, minWidth: 150, sortable: false,
    renderCell: (p) => {
      const assignments = p.value || [];
      if (!assignments.length) return <MetaCell>—</MetaCell>;
      return (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5, height: "100%", py: 0.5 }}>
          {assignments.map((a) => {
            const url = getAvatarUrl(a.staffer?.avatar_url);
            return (
              <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Avatar src={url} sx={{ width: 22, height: 22, fontSize: "0.52rem", fontWeight: 700, backgroundColor: isDark ? "rgba(34,197,94,0.15)" : "#f0fdf4", color: "#15803d", flexShrink: 0 }}>
                  {!url && getInitials(a.staffer?.full_name)}
                </Avatar>
                <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {a.staffer?.full_name || "—"}
                </Typography>
              </Box>
            );
          })}
        </Box>
      );
    },
  };

  const completedTimeInCol = {
    field: "timeIn", flex: 0.7, minWidth: 80, sortable: false,
    renderHeader: () => <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 700, color: "#1d4ed8", letterSpacing: "0.07em", textTransform: "uppercase" }}>IN</Typography>,
    renderCell: (p) => {
      const assignments = p.row.assignments || [];
      if (!assignments.length) return <MetaCell>—</MetaCell>;
      return (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5, height: "100%", py: 0.5 }}>
          {assignments.map((a) => {
            const t = fmtTime(a.timed_in_at);
            return <Typography key={a.id} sx={{ fontFamily: dm, fontSize: "0.78rem", fontWeight: 500, color: t ? "#1d4ed8" : "text.disabled", fontStyle: t ? "normal" : "italic" }}>{t || "—"}</Typography>;
          })}
        </Box>
      );
    },
  };

  const completedTimeOutCol = {
    field: "timeOut", flex: 0.7, minWidth: 80, sortable: false,
    renderHeader: () => <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 700, color: "#15803d", letterSpacing: "0.07em", textTransform: "uppercase" }}>OUT</Typography>,
    renderCell: (p) => {
      const assignments = p.row.assignments || [];
      if (!assignments.length) return <MetaCell>—</MetaCell>;
      return (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5, height: "100%", py: 0.5 }}>
          {assignments.map((a) => {
            const t = fmtTime(a.completed_at);
            return <Typography key={a.id} sx={{ fontFamily: dm, fontSize: "0.78rem", fontWeight: 500, color: t ? "#15803d" : "text.disabled", fontStyle: t ? "normal" : "italic" }}>{t || "—"}</Typography>;
          })}
        </Box>
      );
    },
  };

  const completedDurCol = {
    field: "duration", flex: 0.7, minWidth: 80, sortable: false,
    renderHeader: () => <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 700, color: "#b45309", letterSpacing: "0.07em", textTransform: "uppercase" }}>DUR</Typography>,
    renderCell: (p) => {
      const assignments = p.row.assignments || [];
      if (!assignments.length) return <MetaCell>—</MetaCell>;
      return (
        <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 0.5, height: "100%", py: 0.5 }}>
          {assignments.map((a) => {
            const dur = computeDuration(a.timed_in_at, a.completed_at);
            return dur ? (
              <Box key={a.id} sx={{ display: "inline-flex" }}>
                <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", fontWeight: 700, color: "#b45309", backgroundColor: isDark ? "rgba(245,197,43,0.1)" : "rgba(245,197,43,0.12)", border: "1px solid rgba(245,197,43,0.3)", px: 0.75, py: 0.15, borderRadius: "4px" }}>{dur}</Typography>
              </Box>
            ) : (
              <Typography key={a.id} sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.disabled", fontStyle: "italic" }}>—</Typography>
            );
          })}
        </Box>
      );
    },
  };

  const onGoingVenueCol = {
    field: "venue", headerName: "Venue", flex: 1, minWidth: 120,
    renderCell: (p) => <MetaCell>{p.row._raw?.venue || "—"}</MetaCell>,
  };

  const buildColumns = () => {
    const key = TABS[tab].key;
    if (key === "all")          return [titleCol, clientCol, receivedCol, eventDateCol, statusCol, actionCol];
    if (key === "Forwarded")    return [titleCol, clientCol, eventDateCol, forwardedToCol, forwardedByCol, actionCol];
    if (key === "Approved")     return [titleCol, clientCol, eventDateCol, approvedByCol, actionCol];
    if (key === "On Going")     return [titleCol, clientCol, eventDateCol, onGoingVenueCol, onGoingStaffersCol, actionCol];
    if (key === "Completed")    return [titleCol, clientCol, eventDateCol, onGoingVenueCol, completedStafferCol, completedTimeInCol, completedTimeOutCol, completedDurCol, actionCol];
    if (key === "Declined")     return [titleCol, clientCol, eventDateCol, declinedByCol, declinedReasonCol, actionCol];
    return [titleCol, clientCol, receivedCol, eventDateCol, actionCol];
  };

  const isMultiRowTab = ["On Going", "Completed"].includes(TABS[tab].key);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, height: "100%", boxSizing: "border-box", backgroundColor: "background.default", fontFamily: dm }}>
      <ColumnMenuStyles isDark={isDark} border={border} />

      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary" }}>
          Manage all coverage requests — review, forward to sections, and approve or decline.
        </Typography>
      </Box>

      {/* ── Tabs + filter ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0, gap: 1 }}>
        <Box sx={{ display: "flex", gap: 0, flex: 1, borderBottom: `1px solid ${border}`, overflowX: "auto", "&::-webkit-scrollbar": { height: 0 } }}>
          {TABS.map(({ label, key, Icon }, idx) => {
            const count    = getTabCount(key);
            const isActive = tab === idx;
            return (
              <Box
                key={key} onClick={() => setTab(idx)}
                sx={{
                  display: "flex", alignItems: "center", gap: 0.6,
                  px: 1.75, py: 1.1, cursor: "pointer", position: "relative", flexShrink: 0,
                  fontFamily: dm, fontSize: "0.8rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "text.primary" : "text.secondary",
                  transition: "color 0.15s",
                  "&:hover": { color: "text.primary" },
                  "&::after": isActive ? { content: '""', position: "absolute", bottom: -1, left: 0, right: 0, height: "2px", borderRadius: "2px 2px 0 0", backgroundColor: GOLD } : {},
                }}
              >
                <Icon sx={{ fontSize: 14, flexShrink: 0 }} />
                {label}
                {count > 0 && (
                  <Box sx={{ minWidth: 17, height: 17, borderRadius: "9px", px: 0.5, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isActive ? GOLD : isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.07)", flexShrink: 0 }}>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, lineHeight: 1, color: isActive ? CHARCOAL : "text.secondary" }}>{count}</Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Filter button */}
        <Box ref={filterRef} sx={{ position: "relative", flexShrink: 0, pb: "1px" }}>
          <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
            <Box>
              <IconButton size="small" onClick={() => setFilterOpen((p) => !p)}
                sx={{ border: `1px solid ${activeFilterCount > 0 ? GOLD : border}`, borderRadius: "8px", px: 1, py: 0.65, backgroundColor: activeFilterCount > 0 ? GOLD_08 : "transparent", color: activeFilterCount > 0 ? CHARCOAL : "text.secondary", transition: "all 0.15s", "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08, color: CHARCOAL } }}
              >
                <Badge badgeContent={activeFilterCount} sx={{ "& .MuiBadge-badge": { fontSize: "0.58rem", height: 14, minWidth: 14, backgroundColor: GOLD, color: CHARCOAL } }}>
                  <FilterListIcon sx={{ fontSize: 17 }} />
                </Badge>
              </IconButton>

              {filterOpen && (
                <Paper elevation={0} onMouseDown={(e) => e.stopPropagation()}
                  sx={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: { xs: "calc(100vw - 48px)", sm: 240 }, maxWidth: 280, zIndex: 1300, borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: "background.paper", boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 4px 24px rgba(53,53,53,0.1)", overflow: "hidden" }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", fontWeight: 700, color: "text.primary" }}>Filters</Typography>
                    {activeFilterCount > 0 && (
                      <Box onClick={() => { setSelectedSem("all"); setSelectedEntity("all"); }} sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary", cursor: "pointer", "&:hover": { color: "text.primary" } }}>
                        Clear all
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ px: 2, py: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ fontFamily: dm, fontSize: "0.78rem" }}>Semester</InputLabel>
                      <Select value={selectedSem} label="Semester" onChange={(e) => setSelectedSem(e.target.value)} MenuProps={{ disablePortal: true }}
                        sx={{ fontFamily: dm, fontSize: "0.78rem", borderRadius: "8px", "& .MuiOutlinedInput-notchedOutline": { borderColor: border }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: GOLD }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: GOLD } }}
                      >
                        <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>All Semesters</MenuItem>
                        {semesters.map((s) => <MenuItem key={s.id} value={s.id} sx={{ fontFamily: dm, fontSize: "0.78rem" }}>{s.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ fontFamily: dm, fontSize: "0.78rem" }}>Client</InputLabel>
                      <Select value={selectedEntity} label="Client" onChange={(e) => setSelectedEntity(e.target.value)} MenuProps={{ disablePortal: true }}
                        sx={{ fontFamily: dm, fontSize: "0.78rem", borderRadius: "8px", "& .MuiOutlinedInput-notchedOutline": { borderColor: border }, "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: GOLD }, "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: GOLD } }}
                      >
                        <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>All Clients</MenuItem>
                        {entityOptions.map((name) => <MenuItem key={name} value={name} sx={{ fontFamily: dm, fontSize: "0.78rem" }}>{name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                </Paper>
              )}
            </Box>
          </ClickAwayListener>
        </Box>
      </Box>

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <Box sx={{ display: "flex", gap: 0.75, mt: 1.5, flexWrap: "wrap" }}>
          {selectedSem !== "all" && <FilterChip label={semesters.find((s) => s.id === selectedSem)?.name} onDelete={() => setSelectedSem("all")} />}
          {selectedEntity !== "all" && <FilterChip label={selectedEntity} onDelete={() => setSelectedEntity("all")} />}
        </Box>
      )}

      {/* ── Tab description ── */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary" }}>
          {TAB_DESCRIPTIONS[TABS[tab].key]}
        </Typography>
      </Box>

      {/* ── Data Grid — horizontal scroll wrapper ── */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Box sx={{ minWidth: 680, bgcolor: "background.paper", borderRadius: "10px", border: `1px solid ${border}`, overflow: "hidden" }}>
          {loading ? (
            <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={buildColumns()}
              pageSize={8}
              rowsPerPageOptions={[8]}
              disableSelectionOnClick
              getRowHeight={({ model }) => {
                const key = TABS[tab].key;
                if (key === "Forwarded") {
                  const sections = model.forwardedTo || [];
                  if (sections.length <= 1) return 52;
                  if (sections.length === 2) return 68;
                  return 88;
                }
                if (isMultiRowTab) return 60;
                return 52;
              }}
              getRowClassName={(params) =>
                highlight && params.row.requestTitle?.toLowerCase().includes(highlight) ? "highlighted-row" : ""
              }
              sx={{
                ...makeDataGridSx(isDark, border),
                "& .highlighted-row": {
                  backgroundColor: isDark ? "rgba(245,197,43,0.08)" : "rgba(245,197,43,0.10)",
                  "&:hover": { backgroundColor: isDark ? "rgba(245,197,43,0.13)" : "rgba(245,197,43,0.15)" },
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* ── Request Detail Dialog ── */}
      <RequestDetails
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onActionSuccess={() => { setSelectedRequest(null); refetch(); }}
      />
    </Box>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function MetaCell({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}>{children}</Typography>
    </Box>
  );
}

function FilterChip({ label, onDelete }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, pl: 1.25, pr: 0.75, py: 0.35, borderRadius: "6px", backgroundColor: GOLD_08, border: "1px solid rgba(245,197,43,0.3)" }}>
      <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", fontWeight: 600, color: "#b45309" }}>{label}</Typography>
      <Box onClick={onDelete} sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 14, height: 14, borderRadius: "4px", cursor: "pointer", color: "#b45309", opacity: 0.7, "&:hover": { opacity: 1 } }}>
        <CloseIcon sx={{ fontSize: 11 }} />
      </Box>
    </Box>
  );
}

function makeDataGridSx(isDark, border) {
  return {
    border: "none", fontFamily: dm, fontSize: "0.82rem",
    backgroundColor: "background.paper", color: "text.primary",
    "& .MuiDataGrid-columnHeaders": { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)", borderBottom: `1px solid ${border}`, minHeight: "40px !important", maxHeight: "40px !important", lineHeight: "40px !important" },
    "& .MuiDataGrid-columnHeaderTitle": { fontFamily: dm, fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.07em", textTransform: "uppercase" },
    "& .MuiDataGrid-columnSeparator": { display: "none" },
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },
    "& .MuiDataGrid-menuIcon button": { color: "text.disabled", padding: "2px", borderRadius: "6px", transition: "all 0.15s", "&:hover": { backgroundColor: GOLD_08, color: "#b45309" } },
    "& .MuiDataGrid-menuIcon .MuiSvgIcon-root": { fontSize: "1rem" },
    "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-menuIcon button": { color: "text.secondary" },
    "& .MuiDataGrid-row": { borderBottom: `1px solid ${border}`, transition: "background-color 0.12s", "&:last-child": { borderBottom: "none" } },
    "& .MuiDataGrid-row:hover": { backgroundColor: isDark ? "rgba(255,255,255,0.025)" : HOVER_BG },
    "& .MuiDataGrid-cell": { border: "none", outline: "none !important", "&:focus, &:focus-within": { outline: "none" } },
    "& .MuiDataGrid-footerContainer": { borderTop: `1px solid ${border}`, backgroundColor: "transparent", minHeight: "44px" },
    "& .MuiTablePagination-root": { fontFamily: dm, fontSize: "0.75rem", color: "text.secondary" },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontFamily: dm, fontSize: "0.75rem" },
    "& .MuiDataGrid-virtualScroller": { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay": { backgroundColor: "background.paper" },
  };
}