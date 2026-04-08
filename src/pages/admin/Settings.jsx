// src/pages/admin/Settings.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Collapse,
  Dialog,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import { DataGrid } from "../../components/common/AppDataGrid";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import RestoreFromTrashOutlinedIcon from "@mui/icons-material/RestoreFromTrashOutlined";
import DeleteForeverOutlinedIcon from "@mui/icons-material/DeleteForeverOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import CleaningServicesOutlinedIcon from "@mui/icons-material/CleaningServicesOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { supabase } from "../../lib/supabaseClient";
import BrandedLoader from "../../components/common/BrandedLoader";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

const RED = "#dc2626";
const RED_08 = "rgba(220,38,38,0.08)";

const STATUS_CONFIG = {
  Pending: { bg: "#fef9ec", color: "#b45309", dot: "#f59e0b" },
  Forwarded: { bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  Assigned: { bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  "For Approval": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Approved: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  "On Going": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Completed: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  Declined: { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
  Cancelled: { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
};

const SECTIONS = [
  { key: "archive", label: "Archive", Icon: ArchiveOutlinedIcon },
  { key: "trash", label: "Trash", Icon: DeleteOutlineOutlinedIcon },
  { key: "notifications", label: "Notifications", Icon: NotificationsNoneOutlinedIcon },
];

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "\u2014";

const fmtDateStr = (d) => {
  if (!d) return "\u2014";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const buildEventDateDisplay = (req) => {
  if (req.is_multiday && req.event_days?.length > 0) {
    const sorted = [...req.event_days].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const first = new Date(sorted[0].date + "T00:00:00").toLocaleDateString(
      "en-US",
      { month: "short", day: "numeric" },
    );
    const last = new Date(
      sorted[sorted.length - 1].date + "T00:00:00",
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return sorted.length === 1 ? fmtDateStr(sorted[0].date) : `${first} \u2013 ${last}`;
  }
  return fmtDateStr(req.event_date);
};

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status, isDark }) {
  const cfg = STATUS_CONFIG[status] || {
    bg: "rgba(53,53,53,0.05)",
    color: "text.secondary",
    dot: "text.disabled",
  };
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isDark ? `${cfg.dot}18` : cfg.bg,
        border: `1px solid ${isDark ? `${cfg.dot}35` : `${cfg.dot}30`}`,
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
          fontSize: "0.66rem",
          fontWeight: 700,
          color: isDark ? cfg.dot : cfg.color,
          letterSpacing: "0.04em",
        }}
      >
        {status}
      </Typography>
    </Box>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({ open, onClose, onConfirm, title, message, loading, destructive }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderRadius: "10px",
          width: 400,
          p: 0,
          fontFamily: dm,
          bgcolor: "background.paper",
        },
      }}
    >
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          {destructive ? (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                backgroundColor: RED_08,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: RED }} />
            </Box>
          ) : (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                backgroundColor: GOLD_08,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ArchiveOutlinedIcon sx={{ fontSize: 17, color: GOLD }} />
            </Box>
          )}
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: "0.92rem",
              color: "text.primary",
            }}
          >
            {title}
          </Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            color: "text.secondary",
            lineHeight: 1.6,
            mb: 3,
          }}
        >
          {message}
        </Typography>

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Box
            onClick={onClose}
            sx={{
              px: 2,
              py: 0.8,
              borderRadius: "4px",
              cursor: "pointer",
              fontFamily: dm,
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              userSelect: "none",
              transition: "all 0.15s",
              "&:hover": { borderColor: "text.secondary" },
            }}
          >
            Cancel
          </Box>
          <Box
            onClick={!loading ? onConfirm : undefined}
            sx={{
              px: 2,
              py: 0.8,
              borderRadius: "4px",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: dm,
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: destructive ? RED : "#212121",
              opacity: loading ? 0.7 : 1,
              userSelect: "none",
              transition: "all 0.15s",
              "&:hover": !loading
                ? { backgroundColor: destructive ? "#b91c1c" : "#333" }
                : {},
            }}
          >
            {loading ? (
              <CircularProgress size={14} sx={{ color: "#fff" }} />
            ) : destructive ? (
              "Delete"
            ) : (
              "Confirm"
            )}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function Settings() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [openSections, setOpenSections] = useState({ archive: true, trash: false, notifications: false });
  const toggleSection = (key) => setOpenSections((p) => ({ ...p, [key]: !p[key] }));
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);

  // ── Requests data ────────────────────────────────────────
  const [archivedRequests, setArchivedRequests] = useState([]);
  const [trashedRequests, setTrashedRequests] = useState([]);
  const [archivableRequests, setArchivableRequests] = useState([]);
  const [selected, setSelected] = useState([]);

  // ── Notifications data ───────────────────────────────────
  const [notifStats, setNotifStats] = useState({ total: 0, read: 0 });
  const [notifLoading, setNotifLoading] = useState(false);

  // ── Confirm dialog ───────────────────────────────────────
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    destructive: false,
    action: null,
  });

  // ── Fetch ────────────────────────────────────────────────
  const fetchArchived = useCallback(async () => {
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, status, event_date, is_multiday, event_days, submitted_at, archived_at, requester_id")
      .not("archived_at", "is", null)
      .is("trashed_at", null)
      .order("archived_at", { ascending: false });
    if (!error) setArchivedRequests(data || []);
  }, []);

  const fetchTrashed = useCallback(async () => {
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, status, event_date, is_multiday, event_days, submitted_at, trashed_at, requester_id")
      .not("trashed_at", "is", null)
      .order("trashed_at", { ascending: false });
    if (!error) setTrashedRequests(data || []);
  }, []);

  const fetchArchivable = useCallback(async () => {
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id")
      .in("status", ["Completed", "Declined", "Cancelled"])
      .is("archived_at", null)
      .is("trashed_at", null)
      .order("submitted_at", { ascending: false });
    if (!error) setArchivableRequests(data || []);
  }, []);

  const fetchNotifStats = useCallback(async () => {
    const { count: total } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true });
    const { count: read } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("is_read", true);
    setNotifStats({ total: total || 0, read: read || 0 });
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchArchived(), fetchTrashed(), fetchArchivable(), fetchNotifStats()]);
    setLoading(false);
  }, [fetchArchived, fetchTrashed, fetchArchivable, fetchNotifStats]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // ── Actions ──────────────────────────────────────────────
  const archiveRequests = useCallback(async (ids) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("coverage_requests")
        .update({ archived_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      setMsg({ type: "success", text: `${ids.length} request(s) archived.` });
      setSelected([]);
      await Promise.all([fetchArchived(), fetchArchivable()]);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [fetchArchived, fetchArchivable]);

  const restoreFromArchive = useCallback(async (ids) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("coverage_requests")
        .update({ archived_at: null })
        .in("id", ids);
      if (error) throw error;
      setMsg({ type: "success", text: `${ids.length} request(s) restored.` });
      setSelected([]);
      await Promise.all([fetchArchived(), fetchArchivable()]);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [fetchArchived, fetchArchivable]);

  const moveToTrash = useCallback(async (ids) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("coverage_requests")
        .update({ trashed_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
      setMsg({ type: "success", text: `${ids.length} request(s) moved to trash.` });
      setSelected([]);
      await Promise.all([fetchArchived(), fetchTrashed(), fetchArchivable()]);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [fetchArchived, fetchTrashed, fetchArchivable]);

  const restoreFromTrash = useCallback(async (ids) => {
    setActionLoading(true);
    try {
      const { error } = await supabase
        .from("coverage_requests")
        .update({ trashed_at: null, archived_at: null })
        .in("id", ids);
      if (error) throw error;
      setMsg({ type: "success", text: `${ids.length} request(s) restored.` });
      setSelected([]);
      await Promise.all([fetchArchived(), fetchTrashed(), fetchArchivable()]);
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [fetchArchived, fetchTrashed, fetchArchivable]);

  const deleteForever = useCallback(async (ids) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.rpc("admin_delete_requests", { request_ids: ids });
      if (error) throw error;

      setMsg({ type: "success", text: `${ids.length} request(s) permanently deleted.` });
      setSelected([]);
      await fetchTrashed();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [fetchTrashed]);

  const emptyTrash = async () => {
    const ids = trashedRequests.map((r) => r.id);
    if (ids.length === 0) return;
    await deleteForever(ids);
  };

  const purgeReadNotifications = async () => {
    setNotifLoading(true);
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("is_read", true);
      if (error) throw error;
      setMsg({ type: "success", text: `${notifStats.read} read notification(s) cleared.` });
      await fetchNotifStats();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setNotifLoading(false);
    }
  };

  // ── Confirm helpers ──────────────────────────────────────
  const openConfirm = (title, message, action, destructive = false) =>
    setConfirm({ open: true, title, message, destructive, action });
  const closeConfirm = () =>
    setConfirm((p) => ({ ...p, open: false }));
  const runConfirm = async () => {
    if (confirm.action) await confirm.action();
    closeConfirm();
  };

  // ── Column definitions ──────────────────────────────────
  const requestColumns = useMemo(() => [
    {
      field: "title",
      headerName: "Title",
      flex: 1,
      minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "text.primary",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {row.title}
          </Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 130,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <StatusPill status={row.status} isDark={isDark} />
        </Box>
      ),
    },
    {
      field: "event_date",
      headerName: "Event Date",
      width: 170,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.secondary",
            }}
          >
            {buildEventDateDisplay(row)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "submitted_at",
      headerName: "Submitted",
      width: 140,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.secondary",
            }}
          >
            {fmt(row.submitted_at)}
          </Typography>
        </Box>
      ),
    },
  ], [isDark]);

  const archiveColumns = useMemo(() => [
    ...requestColumns,
    {
      field: "archived_at",
      headerName: "Archived",
      width: 140,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary" }}>
            {fmt(row.archived_at)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 90,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: "100%" }}>
          <Tooltip title="Restore" arrow>
            <IconButton size="small" onClick={() => restoreFromArchive([row.id])}
              sx={{ borderRadius: "4px", width: 28, height: 28, color: "text.secondary", "&:hover": { backgroundColor: GOLD_08, color: GOLD } }}>
              <UnarchiveOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Move to Trash" arrow>
            <IconButton size="small"
              onClick={() => openConfirm("Move to Trash", `Move "${row.title}" to trash? You can restore it later.`, () => moveToTrash([row.id]))}
              sx={{ borderRadius: "4px", width: 28, height: 28, color: "text.secondary", "&:hover": { backgroundColor: RED_08, color: RED } }}>
              <DeleteOutlineOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [requestColumns, restoreFromArchive, moveToTrash]);

  const trashColumns = useMemo(() => [
    ...requestColumns,
    {
      field: "trashed_at",
      headerName: "Trashed",
      width: 140,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary" }}>
            {fmt(row.trashed_at)}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 90,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: "100%" }}>
          <Tooltip title="Restore" arrow>
            <IconButton size="small" onClick={() => restoreFromTrash([row.id])}
              sx={{ borderRadius: "4px", width: 28, height: 28, color: "text.secondary", "&:hover": { backgroundColor: GOLD_08, color: GOLD } }}>
              <RestoreFromTrashOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete Forever" arrow>
            <IconButton size="small"
              onClick={() => openConfirm("Delete Forever", `Permanently delete "${row.title}"? This cannot be undone.`, () => deleteForever([row.id]), true)}
              sx={{ borderRadius: "4px", width: 28, height: 28, color: "text.secondary", "&:hover": { backgroundColor: RED_08, color: RED } }}>
              <DeleteForeverOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [requestColumns, restoreFromTrash, deleteForever]);

  const archivableColumns = useMemo(() => [
    ...requestColumns,
    {
      field: "actions",
      headerName: "",
      width: 50,
      sortable: false,
      disableColumnMenu: true,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Tooltip title="Archive" arrow>
            <IconButton size="small" onClick={() => archiveRequests([row.id])}
              sx={{ borderRadius: "4px", width: 28, height: 28, color: "text.secondary", "&:hover": { backgroundColor: GOLD_08, color: GOLD } }}>
              <ArchiveOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [requestColumns, archiveRequests]);

  // ── Section label ────────────────────────────────────────
  // eslint-disable-next-line no-unused-vars
  const SectionLabel = ({ icon: Icon, label, iconColor = GOLD, iconBg = GOLD_08 }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: "10px",
          backgroundColor: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 13, color: iconColor }} />
      </Box>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "text.secondary",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </Typography>
    </Box>
  );

  // ── Action bar for bulk operations ───────────────────────
  const BulkBar = ({ count, actions }) => {
    if (count === 0) return null;
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 2,
          py: 1,
          mb: 1.5,
          borderRadius: "10px",
          backgroundColor: isDark ? "rgba(245,197,43,0.06)" : GOLD_08,
          border: `1px solid ${isDark ? "rgba(245,197,43,0.15)" : "rgba(245,197,43,0.25)"}`,
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
          {count} selected
        </Typography>
        <Box sx={{ flex: 1 }} />
        {actions.map((a, i) => (
          <Box
            key={i}
            onClick={!actionLoading ? a.onClick : undefined}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              borderRadius: "4px",
              cursor: actionLoading ? "not-allowed" : "pointer",
              fontFamily: dm,
              fontSize: "0.75rem",
              fontWeight: 600,
              color: a.destructive ? RED : "text.primary",
              backgroundColor: a.destructive ? RED_08 : isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.05)",
              border: `1px solid ${a.destructive ? "rgba(220,38,38,0.2)" : border}`,
              userSelect: "none",
              transition: "all 0.15s",
              "&:hover": {
                backgroundColor: a.destructive
                  ? "rgba(220,38,38,0.15)"
                  : isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(53,53,53,0.08)",
              },
            }}
          >
            {a.icon}
            {a.label}
          </Box>
        ))}
      </Box>
    );
  };

  // ── Card wrapper ─────────────────────────────────────────
  const Card = ({ children, sx = {} }) => (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderRadius: "10px",
        border: `1px solid ${border}`,
        p: { xs: 2, sm: 3 },
        ...sx,
      }}
    >
      {children}
    </Box>
  );

  // ── Loading state ────────────────────────────────────────
  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <BrandedLoader size={46} inline />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, fontFamily: dm }}>
      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "1rem",
            color: "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          Settings
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.72rem",
            color: "text.secondary",
            mt: 0.3,
          }}
        >
          Manage archived requests, trash, and system cleanup.
        </Typography>
      </Box>

      {/* ── Alert ── */}
      {msg && (
        <Alert
          severity={msg.type}
          onClose={() => setMsg(null)}
          sx={{
            mb: 2,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
            py: 0.75,
          }}
        >
          {msg.text}
        </Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>

      {/* ══════════════════════════════════════════════════════
          ARCHIVE SECTION
       ══════════════════════════════════════════════════════ */}
      {(() => {
        const sec = SECTIONS[0];
        const count = archivedRequests.length;
        const isOpen = openSections.archive;
        return (
          <Card>
            <Box
              onClick={() => { toggleSection("archive"); setSelected([]); }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                userSelect: "none",
                py: 0.5,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "10px",
                  backgroundColor: GOLD_08,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <sec.Icon sx={{ fontSize: 14, color: GOLD }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "text.primary",
                  flex: 1,
                }}
              >
                {sec.label}
              </Typography>
              {count > 0 && (
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.1,
                    borderRadius: "10px",
                    backgroundColor: isOpen ? GOLD_08 : isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.06)",
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    fontFamily: dm,
                    color: isOpen ? GOLD : "text.disabled",
                    lineHeight: 1.4,
                  }}
                >
                  {count}
                </Box>
              )}
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: 16,
                  color: "text.secondary",
                  transition: "transform 0.22s",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </Box>

            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2.5 }}>
          {/* ── Archivable requests (ready to archive) ── */}
          {archivableRequests.length > 0 && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <SectionLabel
                  icon={DescriptionOutlinedIcon}
                  label="Ready to Archive"
                />
                <Box
                  onClick={
                    !actionLoading
                      ? () =>
                          openConfirm(
                            "Archive All",
                            `Archive all ${archivableRequests.length} completed/declined/cancelled request(s)?`,
                            () =>
                              archiveRequests(
                                archivableRequests.map((r) => r.id),
                              ),
                          )
                      : undefined
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1.5,
                    py: 0.5,
                    borderRadius: "4px",
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    fontFamily: dm,
                    fontSize: "0.75rem",
                    fontWeight: 600,
                    color: "#fff",
                    backgroundColor: "#212121",
                    userSelect: "none",
                    transition: "all 0.15s",
                    "&:hover": { backgroundColor: "#333" },
                  }}
                >
                  <ArchiveOutlinedIcon sx={{ fontSize: 14 }} />
                  Archive All
                </Box>
              </Box>

              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  color: "text.disabled",
                  mb: 1.5,
                }}
              >
                {archivableRequests.length} request(s) with
                Completed/Declined/Cancelled status ready to be archived.
              </Typography>

              <Box
                sx={{
                  height: Math.min(
                    archivableRequests.length * 52 + 56,
                    320,
                  ),
                  width: "100%",
                }}
              >
                <DataGrid
                  rows={archivableRequests}
                  columns={archivableColumns}
                  density="compact"
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  disableSelectionOnClick
                />
              </Box>
            </Box>
          )}

          {/* ── Archived requests ── */}
          <Box
            sx={{
              borderTop: `1px solid ${border}`,
              pt: 2,
            }}
          >
            <SectionLabel
              icon={ArchiveOutlinedIcon}
              label="Archived Requests"
            />

            {archivedRequests.length === 0 ? (
              <Box
                sx={{
                  py: 6,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <ArchiveOutlinedIcon
                  sx={{
                    fontSize: 32,
                    color: isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(53,53,53,0.12)",
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    color: "text.disabled",
                  }}
                >
                  No archived requests
                </Typography>
              </Box>
            ) : (
              <>
                <BulkBar
                  count={selected.length}
                  actions={[
                    {
                      label: "Restore",
                      icon: <UnarchiveOutlinedIcon sx={{ fontSize: 14 }} />,
                      onClick: () => restoreFromArchive(selected),
                    },
                    {
                      label: "Move to Trash",
                      icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 14 }} />,
                      onClick: () =>
                        openConfirm(
                          "Move to Trash",
                          `Move ${selected.length} request(s) to trash?`,
                          () => moveToTrash(selected),
                        ),
                      destructive: true,
                    },
                  ]}
                />
                <Box
                  sx={{
                    height: Math.min(
                      archivedRequests.length * 52 + 56,
                      420,
                    ),
                    width: "100%",
                  }}
                >
                  <DataGrid
                    rows={archivedRequests}
                    columns={archiveColumns}
                    density="compact"
                    pageSize={10}
                    rowsPerPageOptions={[10, 25, 50]}
                    checkboxSelection
                    onSelectionModelChange={(ids) => setSelected(ids)}
                    selectionModel={selected}
                  />
                </Box>
              </>
            )}
          </Box>
              </Box>
            </Collapse>
          </Card>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          TRASH SECTION
       ══════════════════════════════════════════════════════ */}
      {(() => {
        const sec = SECTIONS[1];
        const count = trashedRequests.length;
        const isOpen = openSections.trash;
        return (
          <Card>
            <Box
              onClick={() => { toggleSection("trash"); setSelected([]); }}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                userSelect: "none",
                py: 0.5,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "10px",
                  backgroundColor: RED_08,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <sec.Icon sx={{ fontSize: 14, color: RED }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "text.primary",
                  flex: 1,
                }}
              >
                {sec.label}
              </Typography>
              {count > 0 && (
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.1,
                    borderRadius: "10px",
                    backgroundColor: isOpen ? RED_08 : isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.06)",
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    fontFamily: dm,
                    color: isOpen ? RED : "text.disabled",
                    lineHeight: 1.4,
                  }}
                >
                  {count}
                </Box>
              )}
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: 16,
                  color: "text.secondary",
                  transition: "transform 0.22s",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </Box>

            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ pt: 2 }}>
          {trashedRequests.length > 0 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "flex-end",
                mb: 1.5,
              }}
            >
              <Box
                onClick={() =>
                  openConfirm(
                    "Empty Trash",
                    `Permanently delete all ${trashedRequests.length} trashed request(s)? This cannot be undone.`,
                    emptyTrash,
                    true,
                  )
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontFamily: dm,
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: RED,
                  backgroundColor: RED_08,
                  border: `1px solid rgba(220,38,38,0.2)`,
                  userSelect: "none",
                  transition: "all 0.15s",
                  "&:hover": { backgroundColor: "rgba(220,38,38,0.15)" },
                }}
              >
                <DeleteForeverOutlinedIcon sx={{ fontSize: 14 }} />
                Empty Trash
              </Box>
            </Box>
          )}

          {trashedRequests.length === 0 ? (
            <Box
              sx={{
                py: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 1,
              }}
            >
              <DeleteOutlineOutlinedIcon
                sx={{
                  fontSize: 32,
                  color: isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(53,53,53,0.12)",
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "text.disabled",
                }}
              >
                Trash is empty
              </Typography>
            </Box>
          ) : (
            <>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  color: "text.disabled",
                  mb: 1.5,
                }}
              >
                {trashedRequests.length} request(s) in trash. Restore or
                permanently delete.
              </Typography>

              <BulkBar
                count={selected.length}
                actions={[
                  {
                    label: "Restore",
                    icon: (
                      <RestoreFromTrashOutlinedIcon sx={{ fontSize: 14 }} />
                    ),
                    onClick: () => restoreFromTrash(selected),
                  },
                  {
                    label: "Delete Forever",
                    icon: (
                      <DeleteForeverOutlinedIcon sx={{ fontSize: 14 }} />
                    ),
                    onClick: () =>
                      openConfirm(
                        "Delete Forever",
                        `Permanently delete ${selected.length} request(s)? This cannot be undone.`,
                        () => deleteForever(selected),
                        true,
                      ),
                    destructive: true,
                  },
                ]}
              />

              <Box
                sx={{
                  height: Math.min(
                    trashedRequests.length * 52 + 56,
                    420,
                  ),
                  width: "100%",
                }}
              >
                <DataGrid
                  rows={trashedRequests}
                  columns={trashColumns}
                  density="compact"
                  pageSize={10}
                  rowsPerPageOptions={[10, 25, 50]}
                  checkboxSelection
                  onSelectionModelChange={(ids) => setSelected(ids)}
                  selectionModel={selected}
                />
              </Box>
            </>
          )}
              </Box>
            </Collapse>
          </Card>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          NOTIFICATIONS SECTION
       ══════════════════════════════════════════════════════ */}
      {(() => {
        const sec = SECTIONS[2];
        const count = notifStats.read;
        const isOpen = openSections.notifications;
        return (
          <Card>
            <Box
              onClick={() => toggleSection("notifications")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                cursor: "pointer",
                userSelect: "none",
                py: 0.5,
              }}
            >
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "10px",
                  backgroundColor: GOLD_08,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <sec.Icon sx={{ fontSize: 14, color: GOLD }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "text.primary",
                  flex: 1,
                }}
              >
                Notification Cleanup
              </Typography>
              {count > 0 && (
                <Box
                  sx={{
                    px: 0.75,
                    py: 0.1,
                    borderRadius: "10px",
                    backgroundColor: isOpen ? GOLD_08 : isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.06)",
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    fontFamily: dm,
                    color: isOpen ? GOLD : "text.disabled",
                    lineHeight: 1.4,
                  }}
                >
                  {count}
                </Box>
              )}
              <KeyboardArrowDownIcon
                sx={{
                  fontSize: 16,
                  color: "text.secondary",
                  transition: "transform 0.22s",
                  transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </Box>

            <Collapse in={isOpen} timeout="auto" unmountOnExit>
              <Box sx={{ pt: 2 }}>

          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            {/* Stats row */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(53,53,53,0.02)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    color: "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    mb: 0.5,
                  }}
                >
                  Total Notifications
                </Typography>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "text.primary",
                  }}
                >
                  {notifStats.total.toLocaleString()}
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(53,53,53,0.02)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    color: "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    mb: 0.5,
                  }}
                >
                  Read (Clearable)
                </Typography>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: notifStats.read > 0 ? GOLD : "text.primary",
                  }}
                >
                  {notifStats.read.toLocaleString()}
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  p: 2,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(53,53,53,0.02)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    color: "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    mb: 0.5,
                  }}
                >
                  Unread
                </Typography>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "1.4rem",
                    fontWeight: 700,
                    color: "text.primary",
                  }}
                >
                  {(notifStats.total - notifStats.read).toLocaleString()}
                </Typography>
              </Box>
            </Box>

            {/* Purge action */}
            <Box
              onClick={
                notifStats.read > 0 && !notifLoading
                  ? () =>
                      openConfirm(
                        "Clear Read Notifications",
                        `Delete ${notifStats.read} read notification(s) across all users? This cannot be undone.`,
                        purgeReadNotifications,
                        true,
                      )
                  : undefined
              }
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                py: 1,
                borderRadius: "4px",
                cursor:
                  notifStats.read > 0 && !notifLoading
                    ? "pointer"
                    : "not-allowed",
                fontFamily: dm,
                fontSize: "0.82rem",
                fontWeight: 700,
                color: notifStats.read > 0 ? "#fff" : "text.disabled",
                backgroundColor:
                  notifStats.read > 0 ? "#212121" : isDark ? "rgba(255,255,255,0.04)" : "rgba(53,53,53,0.06)",
                opacity: notifLoading ? 0.7 : 1,
                userSelect: "none",
                transition: "all 0.15s",
                "&:hover":
                  notifStats.read > 0 && !notifLoading
                    ? { backgroundColor: "#333" }
                    : {},
              }}
            >
              {notifLoading ? (
                <CircularProgress size={16} sx={{ color: "#fff" }} />
              ) : (
                <>
                  <CleaningServicesOutlinedIcon sx={{ fontSize: 16 }} />
                  Clear All Read Notifications
                </>
              )}
            </Box>

            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                color: "text.disabled",
                textAlign: "center",
              }}
            >
              Only read notifications will be removed. Unread notifications are
              preserved.
            </Typography>
          </Box>
              </Box>
            </Collapse>
          </Card>
        );
      })()}

      </Box>

      {/* ── Confirm Dialog ── */}
      <ConfirmDialog
        open={confirm.open}
        onClose={closeConfirm}
        onConfirm={runConfirm}
        title={confirm.title}
        message={confirm.message}
        loading={actionLoading}
        destructive={confirm.destructive}
      />
    </Box>
  );
}
