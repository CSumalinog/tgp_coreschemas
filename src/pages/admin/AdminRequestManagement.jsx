// src/pages/admin/AdminRequestManagement.jsx
import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import {
  Box,
  Typography,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  useTheme,
  Paper,
  ClickAwayListener,
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText,
  IconButton,
} from "@mui/material";
import { DataGrid } from "../../components/common/AppDataGrid";
import ViewActionButton from "../../components/common/ViewActionButton";
import { useSearchParams, useLocation } from "react-router-dom";
import { useAdminRequests } from "../../hooks/useAdminRequest";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import RequestDetails from "../../components/admin/RequestDetails";
import { supabase } from "../../lib/supabaseClient";
import FilterListIcon from "@mui/icons-material/FilterList";
import CloseIcon from "@mui/icons-material/Close";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { getAvatarUrl } from "../../components/common/UserAvatar";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

const STATUS_CONFIG = {
  Pending: { bg: "#fef9ec", color: "#b45309", dot: "#f59e0b" },
  Forwarded: { bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  Assigned: { bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  "For Approval": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Approved: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  "On Going": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Declined: { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
};

const TABS = [
  { label: "All", key: "all" },
  { label: "Pending", key: "Pending" },
  { label: "Forwarded", key: "Forwarded" },
  { label: "For Approval", key: "For Approval" },
  { label: "Approved", key: "Approved" },
  { label: "On Going", key: "On Going" },
  { label: "Completed", key: "Completed" },
  { label: "Declined", key: "Declined" },
];

const SECTION_COLORS = {
  News: { bg: "#e3f2fd", color: "#1565c0", dot: "#1976d2" },
  Photojournalism: { bg: "#f3e5f5", color: "#7b1fa2", dot: "#8b5cf6" },
  Videojournalism: { bg: "#e8f5e9", color: "#2e7d32", dot: "#22c55e" },
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
const computeDuration = (timedIn, completedAt) => {
  if (!timedIn || !completedAt) return null;
  const diffMs = new Date(completedAt) - new Date(timedIn);
  if (diffMs <= 0) return null;
  const totalMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};
const fmtTime = (ts) => {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};
const fmtDateStr = (
  d,
  opts = { month: "short", day: "numeric", year: "numeric" },
) => {
  if (!d) return "\u2014";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
};
const buildEventDateDisplay = (req) => {
  if (req.is_multiday && req.event_days?.length > 0) {
    const sorted = [...req.event_days].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const first = fmtDateStr(sorted[0].date, {
      month: "short",
      day: "numeric",
    });
    const last = fmtDateStr(sorted[sorted.length - 1].date, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return sorted.length === 1
      ? fmtDateStr(sorted[0].date)
      : `${first} \u2013 ${last}`;
  }
  return req.event_date
    ? new Date(req.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "\u2014";
};

function MetaCell({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.78rem",
          fontWeight: 400,
          color: "text.secondary",
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}

function FilterChip({ label, onDelete }) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        pl: 1.25,
        pr: 0.75,
        py: 0.35,
        borderRadius: "10px",
        backgroundColor: GOLD_08,
        border: "1px solid rgba(245,197,43,0.3)",
      }}
    >
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.72rem",
          fontWeight: 500,
          color: "#b45309",
        }}
      >
        {label}
      </Typography>
      <Box
        onClick={onDelete}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: 14,
          height: 14,
          borderRadius: "10px",
          cursor: "pointer",
          color: "#b45309",
          opacity: 0.7,
          "&:hover": { opacity: 1 },
        }}
      >
        <CloseIcon sx={{ fontSize: 11 }} />
      </Box>
    </Box>
  );
}

function EventTypePill({ isMultiDay, isDark }) {
  return isMultiDay ? (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isDark ? "rgba(74,222,128,0.1)" : "#f0fdf4",
        border: `1px solid ${isDark ? "rgba(74,222,128,0.25)" : "#86efac"}`,
      }}
    >
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: isDark ? "#4ade80" : "#22c55e",
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.66rem",
          fontWeight: 700,
          color: isDark ? "#4ade80" : "#15803d",
          letterSpacing: "0.04em",
        }}
      >
        Multi-day
      </Typography>
    </Box>
  ) : (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isDark
          ? "rgba(148,163,184,0.1)"
          : "rgba(53,53,53,0.05)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.1)"}`,
      }}
    >
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: isDark
            ? "rgba(255,255,255,0.3)"
            : "rgba(53,53,53,0.3)",
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.66rem",
          fontWeight: 700,
          color: isDark ? "rgba(255,255,255,0.45)" : "rgba(53,53,53,0.5)",
          letterSpacing: "0.04em",
        }}
      >
        Single
      </Typography>
    </Box>
  );
}

function makeDataGridSx(isDark, border) {
  return {
    border: "none",
    fontFamily: dm,
    fontSize: "0.78rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: isDark
        ? "rgba(255,255,255,0.02)"
        : "rgba(53,53,53,0.02)",
      borderBottom: `1px solid ${border}`,
      minHeight: "40px !important",
      maxHeight: "40px !important",
      lineHeight: "40px !important",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontFamily: dm,
      fontSize: "0.68rem",
      fontWeight: 700,
      color: "text.secondary",
      letterSpacing: "0.07em",
      textTransform: "uppercase",
    },
    "& .MuiDataGrid-columnSeparator": { display: "none" },
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
      { outline: "none" },
    "& .MuiDataGrid-menuIcon button": {
      color: "text.disabled",
      padding: "2px",
      borderRadius: "10px",
      transition: "all 0.15s",
      "&:hover": { backgroundColor: GOLD_08, color: "#b45309" },
    },
    "& .MuiDataGrid-menuIcon .MuiSvgIcon-root": { fontSize: "1rem" },
    "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-menuIcon button": {
      color: "text.secondary",
    },
    "& .MuiDataGrid-row": {
      borderBottom: `1px solid ${border}`,
      transition: "background-color 0.12s",
      "&:last-child": { borderBottom: "none" },
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: isDark ? "rgba(255,255,255,0.025)" : HOVER_BG,
    },
    "& .MuiDataGrid-cell": {
      border: "none",
      outline: "none !important",
      "&:focus, &:focus-within": { outline: "none" },
    },
    "& .MuiDataGrid-footerContainer": {
      borderTop: `1px solid ${border}`,
      backgroundColor: "transparent",
      minHeight: "44px",
    },
    "& .MuiTablePagination-root": {
      fontFamily: dm,
      fontSize: "0.75rem",
      color: "text.secondary",
    },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
      fontFamily: dm,
      fontSize: "0.75rem",
    },
    "& .MuiDataGrid-virtualScroller": { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay": { backgroundColor: "background.paper" },
    "& .highlighted-row": {
      backgroundColor: isDark
        ? "rgba(245,197,43,0.08)"
        : "rgba(245,197,43,0.10)",
      "&:hover": {
        backgroundColor: isDark
          ? "rgba(245,197,43,0.13)"
          : "rgba(245,197,43,0.15)",
      },
    },
  };
}

// ✅ Fix 2: Removed unused DropdownPill component

export default function AdminRequestManagement() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const location = useLocation();
  const border = isDark ? BORDER_DARK : BORDER;

  const {
    requests,
    pending,
    forwarded,
    forApproval,
    approved,
    onGoing,
    completed,
    declined,
    loading,
    refetch,
  } = useAdminRequests();
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });

  const [tab, setTab] = useState(() => {
    const incoming = location.state?.tab;
    if (!incoming) return 0;
    const idx = TABS.findIndex((t) => t.key === incoming);
    return idx >= 0 ? idx : 0;
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [viewedIds, setViewedIds] = useState(new Set());

  // Gmail-style: fetch which requests this user has viewed
  useEffect(() => {
    async function loadViewed() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("request_views").select("request_id").eq("user_id", user.id);
      if (data) setViewedIds(new Set(data.map((r) => r.request_id)));
    }
    loadViewed();
  }, [requests]);

  const markAsViewed = async (requestId) => {
    if (viewedIds.has(requestId)) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("request_views").upsert({ user_id: user.id, request_id: requestId }, { onConflict: "user_id,request_id" });
    setViewedIds((prev) => new Set([...prev, requestId]));
  };

  const handleArchive = async (row) => {
    const { error } = await supabase.from("coverage_requests").update({ archived_at: new Date().toISOString() }).eq("id", row.id);
    if (!error) refetch();
  };
  const handleTrash = async (row) => {
    const { error } = await supabase.from("coverage_requests").update({ trashed_at: new Date().toISOString() }).eq("id", row.id);
    if (!error) refetch();
  };
  const handleBulkArchive = async (ids) => {
    const { error } = await supabase.from("coverage_requests").update({ archived_at: new Date().toISOString() }).in("id", ids);
    if (!error) refetch();
  };
  const handleBulkTrash = async (ids) => {
    const { error } = await supabase.from("coverage_requests").update({ trashed_at: new Date().toISOString() }).in("id", ids);
    if (!error) refetch();
  };

  useEffect(() => {
    const openId = location.state?.openRequestId;
    if (!openId || loading || requests.length === 0) return;
    const found = requests.find((r) => r.id === openId);
    if (found) setSelectedRequest(found);
  }, [location.state?.openRequestId, loading, requests]);

  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  // ✅ Fix 4: Removed unused filterRef (ClickAwayListener handles outside clicks)
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
        .from("semesters")
        .select("id, name, start_date, end_date")
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
      if (name && !seen.has(name)) {
        seen.add(name);
        opts.push(name);
      }
    });
    return opts.sort();
  }, [requests]);

  const activeFilterCount =
    (selectedSem !== "all" ? 1 : 0) + (selectedEntity !== "all" ? 1 : 0);

  // ✅ Fix 3 & 5: Wrapped in useCallback so useMemo deps are stable and accurate
  const getBaseSource = useCallback(
    (key) => {
      if (key === "all") return requests.filter((r) => r.status !== "Draft");
      if (key === "Pending") return pending || [];
      if (key === "Forwarded") return forwarded || [];
      if (key === "For Approval")
        return (
          forApproval || requests.filter((r) => r.status === "For Approval")
        );
      if (key === "Approved") return approved || [];
      if (key === "On Going") return onGoing || [];
      if (key === "Completed") return completed || [];
      if (key === "Declined") return declined || [];
      return [];
    },
    [
      requests,
      pending,
      forwarded,
      forApproval,
      approved,
      onGoing,
      completed,
      declined,
    ],
  );

  const applyFilters = useCallback(
    (source) => {
      let filtered = source;
      if (selectedSem !== "all") {
        const sem = semesters.find((s) => s.id === selectedSem);
        if (sem) {
          const start = new Date(sem.start_date);
          const end = new Date(sem.end_date);
          end.setHours(23, 59, 59, 999);
          filtered = filtered.filter((r) => {
            const df = ["On Going", "Completed"].includes(r.status)
              ? r.event_date
              : r.submitted_at;
            if (!df) return false;
            const d = new Date(df);
            return d >= start && d <= end;
          });
        }
      }
      if (selectedEntity !== "all")
        filtered = filtered.filter((r) => r.entity?.name === selectedEntity);
      return filtered;
    },
    [selectedSem, selectedEntity, semesters],
  );

  const filteredSource = useMemo(
    () => applyFilters(getBaseSource(TABS[tab].key)),
    [tab, applyFilters, getBaseSource],
  );

  const rows = filteredSource.map((req) => ({
    id: req.id,
    requestTitle: req.title,
    client: req.entity?.name || "\u2014",
    dateReceived: req.submitted_at
      ? new Date(req.submitted_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "\u2014",
    eventDate: buildEventDateDisplay(req),
    is_multiday: !!(req.is_multiday && req.event_days?.length > 0),
    eventType: !!(req.is_multiday && req.event_days?.length > 0),
    forwardedTo: req.forwarded_sections || [],
    forwardedBy: req.forwarded_by_profile?.full_name || "\u2014",
    forwardedByAvatar: req.forwarded_by_profile?.avatar_url || null,
    approvedBy: req.approved_by_profile?.full_name || "\u2014",
    approvedByAvatar: req.approved_by_profile?.avatar_url || null,
    declinedBy: req.declined_by_profile?.full_name || "\u2014",
    declinedByAvatar: req.declined_by_profile?.avatar_url || null,
    declinedReason: req.declined_reason || "\u2014",
    status: req.status,
    assignments: req.coverage_assignments || [],
    _raw: req,
  }));

  const getTabCount = useCallback(
    (key) => applyFilters(getBaseSource(key)).length,
    [applyFilters, getBaseSource],
  );

  const titleCol = {
    field: "requestTitle",
    headerName: "Request Title",
    flex: 1.4,
    minWidth: 180,
    renderCell: (p) => {
      const isUnread = !viewedIds.has(p.row.id);
      return (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              fontWeight: isUnread ? 600 : 400,
              color: isDark ? "#f5f5f5" : "#1a1a1a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {p.value}
          </Typography>
        </Box>
      );
    },
  };
  const typeCol = {
    field: "eventType",
    headerName: "Type",
    flex: 0.65,
    minWidth: 90,
    sortable: false,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <EventTypePill isMultiDay={p.value} isDark={isDark} />
      </Box>
    ),
  };
  const clientCol = {
    field: "client",
    headerName: "Client",
    flex: 1,
    minWidth: 120,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };
  const receivedCol = {
    field: "dateReceived",
    headerName: "Received",
    flex: 0.9,
    minWidth: 110,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };
  const eventDateCol = {
    field: "eventDate",
    headerName: "Event Date",
    flex: 1.1,
    minWidth: 150,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };
  const actionCol = {
    field: "actions",
    headerName: "",
    flex: 0.4,
    minWidth: 56,
    sortable: false,
    align: "right",
    headerAlign: "right",
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%", pr: 0.5 }}>
        <IconButton size="small" onClick={(e) => { setMenuAnchor(e.currentTarget); setMenuRow(p.row); }}>
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    ),
  };
  const statusCol = {
    field: "status",
    headerName: "Status",
    flex: 0.9,
    minWidth: 110,
    renderCell: (p) => {
      const cfg = STATUS_CONFIG[p.value] || {
        bg: "#f9fafb",
        color: "#6b7280",
        dot: "#9ca3af",
      };
      return (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              px: 1.25,
              py: 0.35,
              borderRadius: "10px",
              backgroundColor: cfg.bg,
            }}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor: cfg.dot,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 500,
                color: cfg.color,
                letterSpacing: "0.02em",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        </Box>
      );
    },
  };
  const forwardedToCol = {
    field: "forwardedTo",
    headerName: "Forwarded To",
    flex: 1.4,
    minWidth: 200,
    renderCell: (p) => {
      const sections = p.value || [];
      if (!sections.length) return <MetaCell>\u2014</MetaCell>;
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0.4,
            py: 0.75,
          }}
        >
          {sections.map((s, i) => {
            const clr = SECTION_COLORS[s] || {
              bg: "#f3f4f6",
              color: "#6b7280",
              dot: "#9ca3af",
            };
            return (
              <Box
                key={i}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 0.9,
                  py: 0.2,
                  borderRadius: "10px",
                  backgroundColor: clr.bg,
                  width: "fit-content",
                }}
              >
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: clr.dot,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.7rem",
                    fontWeight: 500,
                    color: clr.color,
                    whiteSpace: "nowrap",
                  }}
                >
                  {s}
                </Typography>
              </Box>
            );
          })}
        </Box>
      );
    },
  };
  const mkPersonCol = (field, avatarField, header, avatarBg, avatarColor) => ({
    field,
    headerName: header,
    flex: 1,
    minWidth: 150,
    renderCell: (p) => {
      const url = getAvatarUrl(p.row[avatarField]);
      return (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            gap: 0.85,
          }}
        >
          {p.value !== "\u2014" && (
            <Avatar
              src={url || undefined}
              sx={{
                width: 28,
                height: 28,
                fontSize: "0.62rem",
                fontWeight: 600,
                backgroundColor: avatarBg,
                color: avatarColor,
                flexShrink: 0,
              }}
            >
              {!url && getInitials(p.value)}
            </Avatar>
          )}
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              fontWeight: 400,
              color: p.value === "\u2014" ? "text.disabled" : "text.secondary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {p.value}
          </Typography>
        </Box>
      );
    },
  });
  const forwardedByCol = mkPersonCol(
    "forwardedBy",
    "forwardedByAvatar",
    "Forwarded By",
    "#f5f3ff",
    "#6d28d9",
  );
  const approvedByCol = mkPersonCol(
    "approvedBy",
    "approvedByAvatar",
    "Approved By",
    "#f0fdf4",
    "#15803d",
  );
  const declinedByCol = mkPersonCol(
    "declinedBy",
    "declinedByAvatar",
    "Declined By",
    "#fef2f2",
    "#dc2626",
  );
  const declinedReasonCol = {
    field: "declinedReason",
    headerName: "Reason",
    flex: 1.4,
    minWidth: 180,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.81rem",
            fontWeight: 400,
            color: p.value === "\u2014" ? "text.disabled" : "#dc2626",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontStyle: p.value === "\u2014" ? "normal" : "italic",
          }}
        >
          {p.value}
        </Typography>
      </Box>
    ),
  };
  const onGoingVenueCol = {
    field: "venue",
    headerName: "Venue",
    flex: 1,
    minWidth: 120,
    renderCell: (p) => <MetaCell>{p.row._raw?.venue || "\u2014"}</MetaCell>,
  };
  const onGoingStaffersCol = {
    field: "assignments",
    headerName: "Staffers On-Site",
    flex: 1.6,
    minWidth: 200,
    sortable: false,
    renderCell: (p) => {
      const assignments = p.value || [];
      if (!assignments.length) return <MetaCell>\u2014</MetaCell>;
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0.35,
            height: "100%",
            py: 0.5,
          }}
        >
          {assignments.map((a) => {
            const url = getAvatarUrl(a.staffer?.avatar_url);
            const timeIn = fmtTime(a.timed_in_at);
            return (
              <Box
                key={a.id}
                sx={{ display: "flex", alignItems: "center", gap: 0.6 }}
              >
                <Avatar
                  src={url}
                  sx={{
                    width: 18,
                    height: 18,
                    fontSize: "0.48rem",
                    fontWeight: 600,
                    backgroundColor: "#eff6ff",
                    color: "#1d4ed8",
                    flexShrink: 0,
                  }}
                >
                  {!url && getInitials(a.staffer?.full_name)}
                </Avatar>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: 400,
                    color: "text.secondary",
                  }}
                >
                  {a.staffer?.full_name || "\u2014"}
                </Typography>
                {timeIn ? (
                  <Box
                    sx={{
                      px: 0.8,
                      py: 0.15,
                      borderRadius: "10px",
                      backgroundColor: isDark
                        ? "rgba(59,130,246,0.12)"
                        : "#eff6ff",
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.64rem",
                        fontWeight: 500,
                        color: "#1d4ed8",
                      }}
                    >
                      {timeIn}
                    </Typography>
                  </Box>
                ) : (
                  <Box
                    sx={{
                      px: 0.8,
                      py: 0.15,
                      borderRadius: "10px",
                      backgroundColor: isDark
                        ? "rgba(245,158,11,0.12)"
                        : "#fffbeb",
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.64rem",
                        fontWeight: 500,
                        color: "#b45309",
                      }}
                    >
                      Not yet
                    </Typography>
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
    field: "assignments",
    headerName: "Staffer",
    flex: 1.2,
    minWidth: 150,
    sortable: false,
    renderCell: (p) => {
      const a = p.value || [];
      if (!a.length) return <MetaCell>\u2014</MetaCell>;
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0.5,
            height: "100%",
            py: 0.5,
          }}
        >
          {a.map((x) => {
            const url = getAvatarUrl(x.staffer?.avatar_url);
            return (
              <Box
                key={x.id}
                sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
              >
                <Avatar
                  src={url}
                  sx={{
                    width: 22,
                    height: 22,
                    fontSize: "0.52rem",
                    fontWeight: 600,
                    backgroundColor: isDark
                      ? "rgba(34,197,94,0.15)"
                      : "#f0fdf4",
                    color: "#15803d",
                    flexShrink: 0,
                  }}
                >
                  {!url && getInitials(x.staffer?.full_name)}
                </Avatar>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: 400,
                    color: "text.secondary",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {x.staffer?.full_name || "\u2014"}
                </Typography>
              </Box>
            );
          })}
        </Box>
      );
    },
  };
  const mkTimeCol = (field, header, color) => ({
    field,
    flex: 0.7,
    minWidth: 80,
    sortable: false,
    renderHeader: () => (
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.65rem",
          fontWeight: 700,
          color,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        {header}
      </Typography>
    ),
    renderCell: (p) => {
      const a = p.row.assignments || [];
      if (!a.length) return <MetaCell>\u2014</MetaCell>;
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0.5,
            height: "100%",
            py: 0.5,
          }}
        >
          {a.map((x) => {
            const t =
              field === "timeIn"
                ? fmtTime(x.timed_in_at)
                : fmtTime(x.completed_at);
            return (
              <Typography
                key={x.id}
                sx={{
                  fontFamily: dm,
                  fontSize: "0.81rem",
                  fontWeight: 400,
                  color: t ? color : "text.disabled",
                  fontStyle: t ? "normal" : "italic",
                }}
              >
                {t || "\u2014"}
              </Typography>
            );
          })}
        </Box>
      );
    },
  });
  const completedTimeInCol = mkTimeCol("timeIn", "IN", "#1d4ed8");
  const completedTimeOutCol = mkTimeCol("timeOut", "OUT", "#15803d");
  const completedDurCol = {
    field: "duration",
    flex: 0.7,
    minWidth: 80,
    sortable: false,
    renderHeader: () => (
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.65rem",
          fontWeight: 700,
          color: "#b45309",
          letterSpacing: "0.07em",
          textTransform: "uppercase",
        }}
      >
        DUR
      </Typography>
    ),
    renderCell: (p) => {
      const a = p.row.assignments || [];
      if (!a.length) return <MetaCell>\u2014</MetaCell>;
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 0.5,
            height: "100%",
            py: 0.5,
          }}
        >
          {a.map((x) => {
            const dur = computeDuration(x.timed_in_at, x.completed_at);
            return dur ? (
              <Box key={x.id} sx={{ display: "inline-flex" }}>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.72rem",
                    fontWeight: 600,
                    color: "#b45309",
                    backgroundColor: isDark
                      ? "rgba(245,197,43,0.1)"
                      : "rgba(245,197,43,0.12)",
                    border: "1px solid rgba(245,197,43,0.3)",
                    px: 0.75,
                    py: 0.15,
                    borderRadius: "10px",
                  }}
                >
                  {dur}
                </Typography>
              </Box>
            ) : (
              <Typography
                key={x.id}
                sx={{
                  fontFamily: dm,
                  fontSize: "0.81rem",
                  color: "text.disabled",
                  fontStyle: "italic",
                }}
              >
                \u2014
              </Typography>
            );
          })}
        </Box>
      );
    },
  };

  const buildColumns = () => {
    const key = TABS[tab].key;
    if (key === "all")
      return [
        titleCol,
        typeCol,
        clientCol,
        receivedCol,
        eventDateCol,
        statusCol,
        actionCol,
      ];
    if (key === "Forwarded")
      return [
        titleCol,
        typeCol,
        clientCol,
        eventDateCol,
        forwardedToCol,
        forwardedByCol,
        actionCol,
      ];
    if (key === "Approved")
      return [
        titleCol,
        typeCol,
        clientCol,
        eventDateCol,
        approvedByCol,
        actionCol,
      ];
    if (key === "On Going")
      return [
        titleCol,
        typeCol,
        clientCol,
        eventDateCol,
        onGoingVenueCol,
        onGoingStaffersCol,
        actionCol,
      ];
    if (key === "Completed")
      return [
        titleCol,
        typeCol,
        clientCol,
        eventDateCol,
        onGoingVenueCol,
        completedStafferCol,
        completedTimeInCol,
        completedTimeOutCol,
        completedDurCol,
        actionCol,
      ];
    if (key === "Declined")
      return [
        titleCol,
        typeCol,
        clientCol,
        eventDateCol,
        declinedByCol,
        declinedReasonCol,
        actionCol,
      ];
    return [titleCol, typeCol, clientCol, receivedCol, eventDateCol, actionCol];
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        height: "100%",
        boxSizing: "border-box",
        backgroundColor: "background.default",
        fontFamily: dm,
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.95rem",
            fontWeight: 600,
            color: "text.primary",
            letterSpacing: "-0.01em",
          }}
        >
          Request Management
        </Typography>
      </Box>

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <Box sx={{ display: "flex", gap: 0.75, mb: 2, flexWrap: "wrap" }}>
          {selectedSem !== "all" && (
            <FilterChip
              label={semesters.find((s) => s.id === selectedSem)?.name}
              onDelete={() => setSelectedSem("all")}
            />
          )}
          {selectedEntity !== "all" && (
            <FilterChip
              label={selectedEntity}
              onDelete={() => setSelectedEntity("all")}
            />
          )}
        </Box>
      )}

      {/* ── Segmented tab bar + filter ── */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            flex: 1,
            alignItems: "flex-end",
          }}
        >
          {TABS.map(({ label, key }, idx) => {
            const isActive = tab === idx;
            const count = getTabCount(key);
            return (
              <Box
                key={key}
                onClick={() => setTab(idx)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.6,
                  px: 1.5,
                  py: 0.65,
                  borderRadius: "10px",
                  cursor: "pointer",
                  flexShrink: 0,
                  fontFamily: dm,
                  fontSize: "0.79rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#fff" : "text.secondary",
                  border: `1px solid ${isActive ? "#212121" : border}`,
                  backgroundColor: isActive ? "#212121" : "background.paper",
                  transition: "all 0.12s",
                  "&:hover": isActive
                    ? {}
                    : {
                        borderColor: "rgba(53,53,53,0.3)",
                        color: isDark ? "#f5f5f5" : CHARCOAL,
                      },
                }}
              >
                {label}
                {count > 0 && (
                  <Box
                    sx={{
                      minWidth: 17,
                      height: 17,
                      borderRadius: "10px",
                      px: 0.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isActive
                        ? "rgba(255,255,255,0.18)"
                        : isDark
                          ? "rgba(255,255,255,0.1)"
                          : "rgba(53,53,53,0.08)",
                      flexShrink: 0,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        lineHeight: 1,
                        color: isActive ? "#fff" : "text.secondary",
                      }}
                    >
                      {count}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* ── Filter button ── */}
        {/* ✅ Fix 4: Removed unused filterRef, ClickAwayListener handles outside clicks */}
        <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
          <Box sx={{ position: "relative" }}>
            <Box
              onClick={() => setFilterOpen((p) => !p)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.25,
                py: 0.6,
                borderRadius: "10px",
                cursor: "pointer",
                border: `1px solid ${activeFilterCount > 0 ? "rgba(33,33,33,0.45)" : border}`,
                backgroundColor:
                  activeFilterCount > 0
                    ? "rgba(33,33,33,0.08)"
                    : "background.paper",
                fontFamily: dm,
                fontSize: "0.76rem",
                fontWeight: 400,
                color:
                  activeFilterCount > 0 ? "text.primary" : "text.secondary",
                transition: "all 0.15s",
                "&:hover": {
                  borderColor: "rgba(33,33,33,0.45)",
                  color: "text.primary",
                  backgroundColor: "rgba(33,33,33,0.08)",
                },
              }}
            >
              <FilterListIcon sx={{ fontSize: 14 }} />
              Filter
              {activeFilterCount > 0 && (
                <Box
                  sx={{
                    width: 15,
                    height: 15,
                    borderRadius: "10px",
                    backgroundColor: "#212121",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.58rem",
                      fontWeight: 700,
                      color: "#fff",
                      lineHeight: 1,
                    }}
                  >
                    {activeFilterCount}
                  </Typography>
                </Box>
              )}
            </Box>
            {filterOpen && (
              <Paper
                elevation={0}
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 240,
                  zIndex: 1300,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  backgroundColor: "background.paper",
                  boxShadow: isDark
                    ? "0 8px 32px rgba(0,0,0,0.4)"
                    : "0 4px 24px rgba(53,53,53,0.1)",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    px: 2,
                    py: 1.5,
                    borderBottom: `1px solid ${border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "text.primary",
                    }}
                  >
                    Filters
                  </Typography>
                  {activeFilterCount > 0 && (
                    <Box
                      onClick={() => {
                        setSelectedSem("all");
                        setSelectedEntity("all");
                      }}
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.7rem",
                        color: "text.secondary",
                        cursor: "pointer",
                        "&:hover": { color: "text.primary" },
                      }}
                    >
                      Clear all
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 2,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.75,
                  }}
                >
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
                      Semester
                    </InputLabel>
                    <Select
                      value={selectedSem}
                      label="Semester"
                      onChange={(e) => setSelectedSem(e.target.value)}
                      MenuProps={{ disablePortal: true }}
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.78rem",
                        borderRadius: "10px",
                      }}
                    >
                      <MenuItem
                        value="all"
                        sx={{ fontFamily: dm, fontSize: "0.78rem" }}
                      >
                        All Semesters
                      </MenuItem>
                      {semesters.map((s) => (
                        <MenuItem
                          key={s.id}
                          value={s.id}
                          sx={{ fontFamily: dm, fontSize: "0.78rem" }}
                        >
                          {s.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
                      Client
                    </InputLabel>
                    <Select
                      value={selectedEntity}
                      label="Client"
                      onChange={(e) => setSelectedEntity(e.target.value)}
                      MenuProps={{ disablePortal: true }}
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.78rem",
                        borderRadius: "10px",
                      }}
                    >
                      <MenuItem
                        value="all"
                        sx={{ fontFamily: dm, fontSize: "0.78rem" }}
                      >
                        All Clients
                      </MenuItem>
                      {entityOptions.map((name) => (
                        <MenuItem
                          key={name}
                          value={name}
                          sx={{ fontFamily: dm, fontSize: "0.78rem" }}
                        >
                          {name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
              </Paper>
            )}
          </Box>
        </ClickAwayListener>
      </Box>

      {/* ── Table ── */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Box
          sx={{
            minWidth: 680,
            bgcolor: "background.paper",
            borderRadius: "10px",
            border: `1px solid ${border}`,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box
              sx={{
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={24} sx={{ color: GOLD }} />
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={buildColumns()}
              pageSize={8}
              rowsPerPageOptions={[8]}
              checkboxSelection
              disableRowSelectionOnClick
              selectionActions={[
                { label: "Archive", onClick: handleBulkArchive },
                { label: "Move to Trash", onClick: handleBulkTrash, color: "error" },
              ]}
              rowHeight={
                ["On Going", "Completed"].includes(TABS[tab].key) ? 60 : 52
              }
              getRowHeight={
                TABS[tab].key === "Forwarded"
                  ? ({ model }) => {
                      const s = model.forwardedTo?.length || 1;
                      if (s <= 1) return 52;
                      if (s === 2) return 68;
                      return 88;
                    }
                  : undefined
              }
              getRowClassName={(params) =>
                highlight &&
                params.row.requestTitle?.toLowerCase().includes(highlight)
                  ? "highlighted-row"
                  : ""
              }
              sx={makeDataGridSx(isDark, border)}
            />
          )}
        </Box>
      </Box>

      <RequestDetails
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onActionSuccess={() => {
          setSelectedRequest(null);
          refetch();
        }}
      />

      {/* 3-dot menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setMenuRow(null); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{ paper: { sx: { minWidth: 160, borderRadius: "10px", mt: 0.5, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" } } }}
      >
        <MenuItem onClick={() => { if (menuRow?.id) markAsViewed(menuRow.id); setSelectedRequest(menuRow?._raw); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}>
          <ListItemIcon><VisibilityOutlinedIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}>View</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleArchive(menuRow); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}>
          <ListItemIcon><ArchiveOutlinedIcon sx={{ fontSize: 18 }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}>Archive</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { handleTrash(menuRow); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1, color: "#dc2626" }}>
          <ListItemIcon><DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: "#dc2626" }} /></ListItemIcon>
          <ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem", color: "#dc2626" }}>Move to Trash</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
