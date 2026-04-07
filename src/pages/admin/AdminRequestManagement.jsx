// src/pages/admin/AdminRequestManagement.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  InputAdornment,
  OutlinedInput,
  useTheme,
  Avatar,
  Menu,
  ListItemIcon,
  ListItemText,
  IconButton,
  Drawer,
  Tooltip,
  Snackbar,
} from "@mui/material";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import ViewActionButton from "../../components/common/ViewActionButton";
import { useSearchParams, useLocation } from "react-router-dom";
import { useAdminRequests } from "../../hooks/useAdminRequest";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import RequestDetails from "../../components/admin/RequestDetails";
import { supabase } from "../../lib/supabaseClient";
import CloseIcon from "@mui/icons-material/Close";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import {
  RoleArchiveManagement,
  RoleTrashManagement,
} from "../common/request-management/RoleRequestManagement";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const RED = "#dc2626";
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

const STATUS_OPTIONS = [
  { label: "All Statuses", key: "all" },
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
  if (!d) return "—";
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
      : `${first} – ${last}`;
  }
  return req.event_date
    ? new Date(req.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
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

  const [statusFilter, setStatusFilter] = useState(() => {
    const incoming = location.state?.tab;
    return incoming && STATUS_OPTIONS.some((o) => o.key === incoming)
      ? incoming
      : "all";
  });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [viewedIds, setViewedIds] = useState(new Set());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState(0);
  const [toast, setToast] = useState({
    open: false,
    text: "",
    severity: "success",
  });

  useEffect(() => {
    async function loadViewed() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("request_views")
        .select("request_id")
        .eq("user_id", user.id);
      if (data) setViewedIds(new Set(data.map((r) => r.request_id)));
    }
    loadViewed();
  }, [requests]);

  const markAsViewed = async (requestId) => {
    if (viewedIds.has(requestId)) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    await supabase
      .from("request_views")
      .upsert(
        { user_id: user.id, request_id: requestId },
        { onConflict: "user_id,request_id" },
      );
    setViewedIds((prev) => new Set([...prev, requestId]));
  };

  const handleArchive = async (row) => {
    if (!row?.id) return;
    const { error } = await supabase
      .from("coverage_requests")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", row.id);
    if (!error) {
      refetch();
      setToast({
        open: true,
        text: "Request moved to archive.",
        severity: "success",
      });
    }
  };
  const handleTrash = async (row) => {
    if (!row?.id) return;
    const { error } = await supabase
      .from("coverage_requests")
      .update({ trashed_at: new Date().toISOString() })
      .eq("id", row.id);
    if (!error) {
      refetch();
      setToast({
        open: true,
        text: "Request moved to trash.",
        severity: "success",
      });
    }
  };
  const handleBulkArchive = async (ids) => {
    if (!ids?.length) return;
    const { error } = await supabase
      .from("coverage_requests")
      .update({ archived_at: new Date().toISOString() })
      .in("id", ids);
    if (!error) {
      refetch();
      setToast({
        open: true,
        text: `${ids.length} request(s) moved to archive.`,
        severity: "success",
      });
    }
  };
  const handleBulkTrash = async (ids) => {
    if (!ids?.length) return;
    const { error } = await supabase
      .from("coverage_requests")
      .update({ trashed_at: new Date().toISOString() })
      .in("id", ids);
    if (!error) {
      refetch();
      setToast({
        open: true,
        text: `${ids.length} request(s) moved to trash.`,
        severity: "success",
      });
    }
  };

  const handleOpenRequest = async (row) => {
    if (!row) return;
    if (row.id) await markAsViewed(row.id);
    setSelectedRequest(row._raw || row);
  };

  useEffect(() => {
    const openId = location.state?.openRequestId;
    if (!openId || loading || requests.length === 0) return;
    const found = requests.find((r) => r.id === openId);
    if (found) {
      queueMicrotask(() => {
        setSelectedRequest(found);
      });
    }
  }, [location.state?.openRequestId, loading, requests]);

  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [rowSelectionModel, setRowSelectionModel] = useState({
    type: "include",
    ids: new Set(),
  });
  const [suppressedArchivableIds, setSuppressedArchivableIds] = useState(
    () => new Set(),
  );
  const gridApiRef = useGridApiRef();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";
  const selectedRowCount =
    rowSelectionModel?.ids instanceof Set ? rowSelectionModel.ids.size : 0;
  const isBulkSelectionActive = selectedRowCount > 1;

  const handleSuppressArchivableIds = useCallback((ids = []) => {
    if (!ids.length) return;
    setSuppressedArchivableIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  useEffect(() => {
    const incoming = location.state?.tab;
    if (!incoming) return;
    if (
      STATUS_OPTIONS.some((o) => o.key === incoming) &&
      incoming !== statusFilter
    ) {
      queueMicrotask(() => {
        setStatusFilter(incoming);
      });
    }
  }, [location.state?.tab, statusFilter]);

  useEffect(() => {
    if (!isBulkSelectionActive) return;
    if (!menuAnchor) return;
    queueMicrotask(() => {
      setMenuAnchor(null);
      setMenuRow(null);
    });
  }, [isBulkSelectionActive, menuAnchor]);

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

  const externalFilterModel = useMemo(() => {
    const tokens = searchText
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    return { items: [], quickFilterValues: tokens };
  }, [searchText]);

  const handleExportCsv = () => {
    gridApiRef.current?.exportDataAsCsv({
      utf8WithBom: true,
      fileName: "request-management-export",
    });
  };

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
    () => applyFilters(getBaseSource(statusFilter)),
    [statusFilter, applyFilters, getBaseSource],
  );

  const getStatusCount = useCallback(
    (key) => applyFilters(getBaseSource(key)).length,
    [applyFilters, getBaseSource],
  );

  const rows = filteredSource.map((req) => ({
    id: req.id,
    requestTitle: req.title,
    client: req.entity?.name || "—",
    dateReceived: req.submitted_at
      ? new Date(req.submitted_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    eventDate: buildEventDateDisplay(req),
    is_multiday: !!(req.is_multiday && req.event_days?.length > 0),
    eventType: !!(req.is_multiday && req.event_days?.length > 0),
    forwardedTo: req.forwarded_sections || [],
    forwardedBy: req.forwarded_by_profile?.full_name || "—",
    forwardedByAvatar: req.forwarded_by_profile?.avatar_url || null,
    approvedBy: req.approved_by_profile?.full_name || "—",
    approvedByAvatar: req.approved_by_profile?.avatar_url || null,
    declinedBy: req.declined_by_profile?.full_name || "—",
    declinedByAvatar: req.declined_by_profile?.avatar_url || null,
    declinedReason: req.declined_reason || "—",
    status: req.status,
    assignments: req.coverage_assignments || [],
    _raw: req,
  }));

  // ── Column definitions ──────────────────────────────────────────────────────

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
    flex: 0.95,
    minWidth: 120,
    sortable: false,
    align: "right",
    headerAlign: "right",
    renderCell: (p) => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          height: "100%",
          pr: 0.5,
        }}
      >
        <ViewActionButton onClick={() => handleOpenRequest(p.row)} />
        <IconButton
          size="small"
          disabled={isBulkSelectionActive}
          onClick={(e) => {
            if (isBulkSelectionActive) return;
            setMenuAnchor(e.currentTarget);
            setMenuRow(p.row);
          }}
        >
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
      if (!sections.length) return <MetaCell>—</MetaCell>;
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
          {p.value !== "—" && (
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
              color: p.value === "—" ? "text.disabled" : "text.secondary",
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

  const onGoingVenueCol = {
    field: "venue",
    headerName: "Venue",
    flex: 1,
    minWidth: 120,
    renderCell: (p) => <MetaCell>{p.row._raw?.venue || "—"}</MetaCell>,
  };

  const onGoingStaffersCol = {
    field: "assignments",
    headerName: "Staffers On-Site",
    flex: 1.6,
    minWidth: 200,
    sortable: false,
    renderCell: (p) => {
      const assignments = p.value || [];
      if (!assignments.length) return <MetaCell>—</MetaCell>;
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
                  {a.staffer?.full_name || "—"}
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
      if (!a.length) return <MetaCell>—</MetaCell>;
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
                  {x.staffer?.full_name || "—"}
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
      if (!a.length) return <MetaCell>—</MetaCell>;
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
                {t || "—"}
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
      if (!a.length) return <MetaCell>—</MetaCell>;
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
                —
              </Typography>
            );
          })}
        </Box>
      );
    },
  };

  const buildColumns = () => {
    const key = statusFilter;
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
        completedStafferCol,
        completedTimeInCol,
        completedTimeOutCol,
        completedDurCol,
        actionCol,
      ];
    if (key === "Declined")
      return [titleCol, typeCol, clientCol, declinedByCol, actionCol];
    return [titleCol, typeCol, clientCol, receivedCol, eventDateCol, actionCol];
  };

  // ── Shared dropdown sx ──────────────────────────────────────────────────────
  const selectSx = {
    fontFamily: dm,
    fontSize: "0.78rem",
    borderRadius: "10px",
    backgroundColor: isDark ? "transparent" : "#f7f7f8",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.12)" },
    "& .MuiSelect-icon": { fontSize: 18, color: "text.disabled" },
  };

  const isStatusFiltered = statusFilter !== "all";
  const isErrorToast = toast.severity === "error";
  const toastAccent = isErrorToast ? RED : GOLD;
  const toastSurface = isDark ? "#1f1f23" : "#ffffff";
  const toastBorder = isDark ? "rgba(255,255,255,0.12)" : "#e8e8e8";
  const toastTitle = isErrorToast ? "Request Error" : "Request Update";

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: isDark ? "background.default" : "#ffffff",
        fontFamily: dm,
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          mb: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
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

      {/* ── Filter row ── */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <FormControl
          size="small"
          sx={{ flex: 2.4, minWidth: 250, maxWidth: 440 }}
        >
          <OutlinedInput
            placeholder="Search"
            inputProps={{ "aria-label": "Search for request" }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: "text.disabled" }} />
              </InputAdornment>
            }
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: "10px",
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          />
        </FormControl>

        {/* Status — clean trigger, counts only inside dropdown items */}
        <FormControl size="small" sx={{ minWidth: 158 }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            inputProps={{ "aria-label": "Status filter" }}
            // ✅ Clean trigger: just the label + a small dot when a filter is active
            renderValue={(val) => {
              const opt = STATUS_OPTIONS.find((o) => o.key === val);
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {isStatusFiltered && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: GOLD,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.primary",
                    }}
                  >
                    {opt?.label || "All Statuses"}
                  </Typography>
                </Box>
              );
            }}
            sx={selectSx}
          >
            {STATUS_OPTIONS.map((o) => {
              const count = getStatusCount(o.key);
              const isSelected = statusFilter === o.key;
              return (
                <MenuItem
                  key={o.key}
                  value={o.key}
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  <span>{o.label}</span>
                  {/* Count badge — shown for all items so users can scan totals */}
                  <Box
                    component="span"
                    sx={{
                      minWidth: 20,
                      height: 18,
                      borderRadius: "99px",
                      px: 0.75,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      // gold if selected, muted gray if zero, light gray otherwise
                      backgroundColor: isSelected
                        ? GOLD
                        : count === 0
                          ? "transparent"
                          : isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(53,53,53,0.07)",
                      fontSize: "0.62rem",
                      fontWeight: 600,
                      lineHeight: 1,
                      color: isSelected
                        ? "#000"
                        : count === 0
                          ? "text.disabled"
                          : "text.secondary",
                      border: count === 0 ? "none" : "none",
                      opacity: count === 0 ? 0.4 : 1,
                    }}
                  >
                    {count}
                  </Box>
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* Semester */}
        <FormControl size="small" sx={{ minWidth: 148 }}>
          <Select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            inputProps={{ "aria-label": "Semester filter" }}
            sx={selectSx}
          >
            <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
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

        {/* Client */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            inputProps={{ "aria-label": "Client filter" }}
            sx={selectSx}
          >
            <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
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

        <Box sx={{ flex: 0.35 }} />

        {/* Export */}
        <Box
          onClick={handleExportCsv}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            height: 38,
            borderRadius: "10px",
            cursor: "pointer",
            border: "1px solid rgba(0,0,0,0.12)",
            fontFamily: dm,
            fontSize: "0.78rem",
            fontWeight: 500,
            color: "text.secondary",
            backgroundColor: isDark ? "transparent" : "#f7f7f8",
            transition: "all 0.15s",
            flexShrink: 0,
            "&:hover": {
              borderColor: "rgba(53,53,53,0.3)",
              color: "text.primary",
              backgroundColor: "#ededee",
            },
          }}
        >
          <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
          Export
        </Box>

        {/* Settings gear */}
        <Tooltip title="Manage requests" arrow>
          <IconButton
            size="small"
            onClick={() => {
              setSuppressedArchivableIds(new Set());
              setSettingsOpen(true);
            }}
            sx={{
              borderRadius: "10px",
              p: 0.7,
              height: 38,
              width: 38,
              border: "1px solid rgba(0,0,0,0.12)",
              color: "text.secondary",
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              transition: "all 0.15s",
              flexShrink: 0,
              "&:hover": {
                borderColor: "rgba(53,53,53,0.3)",
                color: "text.primary",
                backgroundColor: "#ededee",
              },
            }}
          >
            <SettingsOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Table ── */}
      <Box sx={{ flex: 1, minHeight: 0, width: "100%", overflowX: "auto" }}>
        <Box
          sx={{
            minWidth: 680,
            height: "100%",
            bgcolor: isDark ? "background.paper" : "#f7f7f8",
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
              pageSize={10}
              rowsPerPageOptions={[10]}
              checkboxSelection
              disableRowSelectionOnClick
              apiRef={gridApiRef}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={setRowSelectionModel}
              enableSearch={false}
              filterModel={externalFilterModel}
              selectionActions={
                selectedRowCount > 1
                  ? [
                      {
                        label: "Archive",
                        icon: <ArchiveOutlinedIcon sx={{ fontSize: 20 }} />,
                        onClick: handleBulkArchive,
                      },
                      {
                        label: "Move to Trash",
                        icon: (
                          <DeleteOutlineOutlinedIcon sx={{ fontSize: 20 }} />
                        ),
                        onClick: handleBulkTrash,
                        color: "error",
                      },
                    ]
                  : []
              }
              slotProps={{
                toolbar: {
                  csvOptions: { disableToolbarButton: true },
                  printOptions: { disableToolbarButton: true },
                },
              }}
              rowHeight={
                ["On Going", "Completed"].includes(statusFilter) ? 60 : 52
              }
              getRowHeight={
                statusFilter === "Forwarded"
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

      {/* ── 3-dot menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          setMenuRow(null);
        }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
              borderRadius: "10px",
              mt: 0.5,
              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            handleArchive(menuRow);
            setMenuAnchor(null);
            setMenuRow(null);
          }}
          sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}
        >
          <ListItemIcon>
            <ArchiveOutlinedIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}
          >
            Archive
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleTrash(menuRow);
            setMenuAnchor(null);
            setMenuRow(null);
          }}
          sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1, color: "#dc2626" }}
        >
          <ListItemIcon>
            <DeleteOutlineOutlinedIcon
              sx={{ fontSize: 18, color: "#dc2626" }}
            />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              fontFamily: dm,
              fontSize: "0.82rem",
              color: "#dc2626",
            }}
          >
            Move to Trash
          </ListItemText>
        </MenuItem>
      </Menu>

      {/* ── Settings Drawer ── */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 520, md: 600 },
            backgroundColor: "background.default",
            borderLeft: `1px solid ${border}`,
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <SettingsOutlinedIcon
              sx={{ fontSize: 16, color: "text.secondary" }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.85rem",
                fontWeight: 600,
                color: "text.primary",
              }}
            >
              Request Settings
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(false)}
            sx={{
              borderRadius: "10px",
              color: "text.secondary",
              "&:hover": {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            px: 2.5,
            pt: 2,
            pb: 2,
            display: "flex",
            gap: "6px",
            flexShrink: 0,
          }}
        >
          {[
            { label: "Archive", Icon: ArchiveOutlinedIcon },
            { label: "Trash", Icon: DeleteOutlineOutlinedIcon },
          ].map((t, idx) => {
            const active = settingsTab === idx;
            return (
              <Box
                key={t.label}
                onClick={() => setSettingsTab(idx)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.6,
                  px: 1.5,
                  py: 0.65,
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontFamily: dm,
                  fontSize: "0.79rem",
                  fontWeight: active ? 600 : 400,
                  color: active ? "#fff" : "text.secondary",
                  border: `1px solid ${active ? "#212121" : border}`,
                  backgroundColor: active ? "#212121" : "background.paper",
                  transition: "all 0.12s",
                  "&:hover": active
                    ? {}
                    : {
                        borderColor: "rgba(53,53,53,0.3)",
                        color: isDark ? "#f5f5f5" : CHARCOAL,
                      },
                }}
              >
                <t.Icon sx={{ fontSize: 14 }} />
                {t.label}
              </Box>
            );
          })}
        </Box>

        <Box sx={{ flex: 1, overflow: "auto" }}>
          {settingsTab === 0 && (
            <RoleArchiveManagement
              role="admin"
              embedded
              onStateChange={refetch}
              suppressedArchivableIds={[...suppressedArchivableIds]}
              onSuppressArchivableIds={handleSuppressArchivableIds}
              onToast={({ text, severity = "success" }) =>
                setToast({ open: true, text, severity })
              }
            />
          )}
          {settingsTab === 1 && (
            <RoleTrashManagement
              role="admin"
              embedded
              onStateChange={refetch}
              onSuppressArchivableIds={handleSuppressArchivableIds}
              onToast={({ text, severity = "success" }) =>
                setToast({ open: true, text, severity })
              }
            />
          )}
        </Box>
      </Drawer>

      <Snackbar
        open={toast.open}
        autoHideDuration={2200}
        onClose={(_, reason) => {
          if (reason === "clickaway") return;
          setToast((prev) => ({ ...prev, open: false }));
        }}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{
          mt: 1.5,
          mr: 1,
        }}
      >
        <Box
          role="status"
          aria-live="polite"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.25,
            minWidth: 240,
            maxWidth: 320,
            px: 1.75,
            py: 1.05,
            borderRadius: "10px",
            backgroundColor: toastSurface,
            border: `1px solid ${toastBorder}`,
            borderLeft: `3px solid ${toastAccent}`,
            boxShadow: isDark
              ? "0 10px 26px rgba(0,0,0,0.45)"
              : "0 4px 20px rgba(53,53,53,0.12)",
            userSelect: "none",
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: 8,
              height: 8,
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                backgroundColor: toastAccent,
              }}
            />
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.76rem",
                fontWeight: 700,
                color: "text.primary",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {toastTitle}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.67rem",
                color: "text.secondary",
                mt: 0.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {toast.text}
            </Typography>
          </Box>

          <IconButton
            size="small"
            onClick={() => setToast((prev) => ({ ...prev, open: false }))}
            sx={{
              color: toastAccent,
              p: 0.35,
              borderRadius: "8px",
              flexShrink: 0,
              "&:hover": {
                backgroundColor: isErrorToast
                  ? "rgba(220,38,38,0.1)"
                  : "rgba(245,197,43,0.1)",
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>
      </Snackbar>
    </Box>
  );
}
