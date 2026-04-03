// src/pages/regular_staff/ArchiveManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  useTheme,
} from "@mui/material";
import { DataGrid } from "../../components/common/AppDataGrid";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import UnarchiveOutlinedIcon from "@mui/icons-material/UnarchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { supabase } from "../../lib/supabaseClient";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
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

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "\u2014";

const fmtDateStr = (d) => {
  if (!d) return "\u2014";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const buildEventDateDisplay = (req) => {
  if (req.is_multiday && req.event_days?.length > 0) {
    const sorted = [...req.event_days].sort((a, b) => a.date.localeCompare(b.date));
    const first = new Date(sorted[0].date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const last = new Date(sorted[sorted.length - 1].date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    return sorted.length === 1 ? fmtDateStr(sorted[0].date) : `${first} \u2013 ${last}`;
  }
  return fmtDateStr(req.event_date);
};

function makeDataGridSx(isDark, border) {
  return {
    border: "none", fontFamily: dm, fontSize: "0.78rem", backgroundColor: "background.paper", color: "text.primary",
    "& .MuiDataGrid-columnHeaders": { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)", borderBottom: `1px solid ${border}`, minHeight: "40px !important", maxHeight: "40px !important", lineHeight: "40px !important" },
    "& .MuiDataGrid-columnHeaderTitle": { fontFamily: dm, fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.07em", textTransform: "uppercase" },
    "& .MuiDataGrid-columnSeparator": { display: "none" },
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },
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

function StatusPill({ status, isDark }) {
  const cfg = STATUS_CONFIG[status] || { bg: "rgba(53,53,53,0.05)", color: "text.secondary", dot: "text.disabled" };
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, px: 1, py: 0.3, borderRadius: "10px", backgroundColor: isDark ? `${cfg.dot}18` : cfg.bg, border: `1px solid ${isDark ? `${cfg.dot}35` : `${cfg.dot}30`}` }}>
      <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: cfg.dot, flexShrink: 0 }} />
      <Typography sx={{ fontFamily: dm, fontSize: "0.66rem", fontWeight: 700, color: isDark ? cfg.dot : cfg.color, letterSpacing: "0.04em" }}>{status}</Typography>
    </Box>
  );
}

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading, destructive }) {
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: "10px", width: 400, p: 0, fontFamily: dm, bgcolor: "background.paper" } }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          {destructive ? (
            <Box sx={{ width: 34, height: 34, borderRadius: "10px", backgroundColor: RED_08, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: RED }} />
            </Box>
          ) : (
            <Box sx={{ width: 34, height: 34, borderRadius: "10px", backgroundColor: GOLD_08, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ArchiveOutlinedIcon sx={{ fontSize: 17, color: GOLD }} />
            </Box>
          )}
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.92rem", color: "text.primary" }}>{title}</Typography>
        </Box>
        <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.6, mb: 3 }}>{message}</Typography>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Box onClick={onClose} sx={{ px: 2, py: 0.8, borderRadius: "4px", cursor: "pointer", fontFamily: dm, fontSize: "0.82rem", fontWeight: 600, color: "text.secondary", border: "1px solid", borderColor: "divider", userSelect: "none", transition: "all 0.15s", "&:hover": { borderColor: "text.secondary" } }}>Cancel</Box>
          <Box onClick={!loading ? onConfirm : undefined} sx={{ px: 2, py: 0.8, borderRadius: "4px", cursor: loading ? "not-allowed" : "pointer", fontFamily: dm, fontSize: "0.82rem", fontWeight: 700, color: "#fff", backgroundColor: destructive ? RED : "#212121", opacity: loading ? 0.7 : 1, userSelect: "none", transition: "all 0.15s", "&:hover": !loading ? { backgroundColor: destructive ? "#b91c1c" : "#333" } : {} }}>
            {loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : destructive ? "Delete" : "Confirm"}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

export default function ArchiveManagement({ embedded = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [archivedRequests, setArchivedRequests] = useState([]);
  const [archivableRequests, setArchivableRequests] = useState([]);
  const [selected, setSelected] = useState([]);
  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", destructive: false, action: null });
  const [userId, setUserId] = useState(null);
  const [myRequestIds, setMyRequestIds] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);
      const { data } = await supabase
        .from("coverage_assignments")
        .select("request_id")
        .eq("assigned_to", user.id);
      setMyRequestIds([...new Set((data || []).map((a) => a.request_id))]);
    })();
  }, []);

  const fetchArchived = useCallback(async () => {
    if (!userId || !myRequestIds || myRequestIds.length === 0) return;
    const { data: stateRows } = await supabase
      .from("request_user_state")
      .select("request_id, archived_at")
      .eq("user_id", userId)
      .not("archived_at", "is", null)
      .is("trashed_at", null)
      .is("purged_at", null);
    const archivedMap = new Map((stateRows || []).map((r) => [r.request_id, r.archived_at]));
    const archivedIds = [...archivedMap.keys()].filter((id) => myRequestIds.includes(id));
    if (archivedIds.length === 0) { setArchivedRequests([]); return; }
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id")
      .in("id", archivedIds);
    if (!error) {
      setArchivedRequests(
        (data || []).map((r) => ({ ...r, archived_at: archivedMap.get(r.id) }))
          .sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at)),
      );
    }
  }, [userId, myRequestIds]);

  const fetchArchivable = useCallback(async () => {
    if (!userId || !myRequestIds || myRequestIds.length === 0) return;
    const { data: stateRows } = await supabase
      .from("request_user_state").select("request_id").eq("user_id", userId);
    const hiddenIds = (stateRows || []).map((r) => r.request_id);
    const visibleIds = myRequestIds.filter((id) => !hiddenIds.includes(id));
    if (visibleIds.length === 0) { setArchivableRequests([]); return; }
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id")
      .in("status", ["Completed", "Declined", "Cancelled"])
      .is("archived_at", null)
      .is("trashed_at", null)
      .in("id", visibleIds)
      .order("submitted_at", { ascending: false });
    if (!error) setArchivableRequests(data || []);
  }, [userId, myRequestIds]);

  useEffect(() => {
    if (!userId || myRequestIds === null) return;
    if (myRequestIds.length === 0) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      await Promise.all([fetchArchived(), fetchArchivable()]);
      setLoading(false);
    })();
  }, [fetchArchived, fetchArchivable, userId, myRequestIds]);

  const archiveRequests = useCallback(async (ids) => {
    setActionLoading(true);
    try {
      const ts = new Date().toISOString();
      const rows = ids.map((id) => ({ user_id: userId, request_id: id, archived_at: ts, trashed_at: null, purged_at: null }));
      const { error } = await supabase.from("request_user_state").upsert(rows, { onConflict: "user_id,request_id" });
      if (error) throw error;
      setMsg({ type: "success", text: `${ids.length} request(s) archived.` });
      setSelected([]);
      await Promise.all([fetchArchived(), fetchArchivable()]);
    } catch (err) { setMsg({ type: "error", text: err.message }); }
    finally { setActionLoading(false); }
  }, [userId, fetchArchived, fetchArchivable]);

  const restoreFromArchive = useCallback(async (ids) => {
    setActionLoading(true);
    try {
      const { error } = await supabase.from("request_user_state").delete().eq("user_id", userId).in("request_id", ids);
      if (error) throw error;
      setMsg({ type: "success", text: `${ids.length} request(s) restored.` });
      setSelected([]);
      await Promise.all([fetchArchived(), fetchArchivable()]);
    } catch (err) { setMsg({ type: "error", text: err.message }); }
    finally { setActionLoading(false); }
  }, [userId, fetchArchived, fetchArchivable]);

  const moveToTrash = useCallback(async (ids) => {
    setActionLoading(true);
    try {
      const ts = new Date().toISOString();
      const rows = ids.map((id) => ({ user_id: userId, request_id: id, archived_at: null, trashed_at: ts, purged_at: null }));
      const { error } = await supabase.from("request_user_state").upsert(rows, { onConflict: "user_id,request_id" });
      if (error) throw error;
      setMsg({ type: "success", text: `${ids.length} request(s) moved to trash.` });
      setSelected([]);
      await Promise.all([fetchArchived(), fetchArchivable()]);
    } catch (err) { setMsg({ type: "error", text: err.message }); }
    finally { setActionLoading(false); }
  }, [userId, fetchArchived, fetchArchivable]);

  const openConfirm = (title, message, action, destructive = false) => setConfirm({ open: true, title, message, destructive, action });
  const closeConfirm = () => setConfirm((p) => ({ ...p, open: false }));
  const runConfirm = async () => { if (confirm.action) await confirm.action(); closeConfirm(); };

  const requestColumns = useMemo(() => [
    {
      field: "title", headerName: "Title", flex: 1, minWidth: 200,
      renderCell: ({ row }) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 600, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.title}</Typography>
        </Box>
      ),
    },
    {
      field: "status", headerName: "Status", width: 130,
      renderCell: ({ row }) => (<Box sx={{ display: "flex", alignItems: "center", height: "100%" }}><StatusPill status={row.status} isDark={isDark} /></Box>),
    },
    {
      field: "event_date", headerName: "Event Date", width: 170,
      renderCell: ({ row }) => (<Box sx={{ display: "flex", alignItems: "center", height: "100%" }}><Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary" }}>{buildEventDateDisplay(row)}</Typography></Box>),
    },
    {
      field: "submitted_at", headerName: "Submitted", width: 140,
      renderCell: ({ row }) => (<Box sx={{ display: "flex", alignItems: "center", height: "100%" }}><Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary" }}>{fmt(row.submitted_at)}</Typography></Box>),
    },
  ], [isDark]);

  const archiveColumns = useMemo(() => [
    ...requestColumns,
    {
      field: "archived_at", headerName: "Archived", width: 140,
      renderCell: ({ row }) => (<Box sx={{ display: "flex", alignItems: "center", height: "100%" }}><Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary" }}>{fmt(row.archived_at)}</Typography></Box>),
    },
    {
      field: "actions", headerName: "", width: 50, sortable: false, disableColumnMenu: true,
      renderCell: ({ row }) => {
        const [anchorEl, setAnchorEl] = React.useState(null);
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }} sx={{ borderRadius: "4px", p: 0.4, color: "text.secondary", "&:hover": { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.06)" } }}>
              <MoreVertIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} onClick={() => setAnchorEl(null)} transformOrigin={{ horizontal: "right", vertical: "top" }} anchorOrigin={{ horizontal: "right", vertical: "bottom" }} slotProps={{ paper: { sx: { minWidth: 160, borderRadius: "10px", fontFamily: dm, mt: 0.5, boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.08)" } } }}>
              <MenuItem onClick={() => restoreFromArchive([row.id])} sx={{ fontFamily: dm, fontSize: "0.78rem", gap: 1, py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: "auto !important" }}><UnarchiveOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.78rem" }}>Restore</ListItemText>
              </MenuItem>
              <MenuItem onClick={() => openConfirm("Move to Trash", `Move "${row.title}" to trash?`, () => moveToTrash([row.id]))} sx={{ fontFamily: dm, fontSize: "0.78rem", gap: 1, py: 0.75, color: RED }}>
                <ListItemIcon sx={{ minWidth: "auto !important" }}><DeleteOutlineOutlinedIcon sx={{ fontSize: 15, color: RED }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.78rem", color: RED }}>Move to Trash</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        );
      },
    },
  ], [requestColumns, restoreFromArchive, moveToTrash, isDark]);

  const archivableColumns = useMemo(() => [
    ...requestColumns,
    {
      field: "actions", headerName: "", width: 50, sortable: false, disableColumnMenu: true,
      renderCell: ({ row }) => {
        const [anchorEl, setAnchorEl] = React.useState(null);
        return (
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); }} sx={{ borderRadius: "4px", p: 0.4, color: "text.secondary", "&:hover": { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.06)" } }}>
              <MoreVertIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)} onClick={() => setAnchorEl(null)} transformOrigin={{ horizontal: "right", vertical: "top" }} anchorOrigin={{ horizontal: "right", vertical: "bottom" }} slotProps={{ paper: { sx: { minWidth: 140, borderRadius: "10px", fontFamily: dm, mt: 0.5, boxShadow: isDark ? "0 8px 24px rgba(0,0,0,0.4)" : "0 8px 24px rgba(0,0,0,0.08)" } } }}>
              <MenuItem onClick={() => archiveRequests([row.id])} sx={{ fontFamily: dm, fontSize: "0.78rem", gap: 1, py: 0.75 }}>
                <ListItemIcon sx={{ minWidth: "auto !important" }}><ArchiveOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} /></ListItemIcon>
                <ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.78rem" }}>Archive</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        );
      },
    },
  ], [requestColumns, archiveRequests, isDark]);

  // eslint-disable-next-line no-unused-vars
  const SectionLabel = ({ icon: Icon, label, iconColor = GOLD, iconBg = GOLD_08 }) => (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
      <Box sx={{ width: 26, height: 26, borderRadius: "10px", backgroundColor: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon sx={{ fontSize: 13, color: iconColor }} />
      </Box>
      <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</Typography>
    </Box>
  );

  const BulkBar = ({ count, actions }) => {
    if (count === 0) return null;
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, px: 2, py: 1, mb: 1.5, borderRadius: "10px", backgroundColor: isDark ? "rgba(245,197,43,0.06)" : GOLD_08, border: `1px solid ${isDark ? "rgba(245,197,43,0.15)" : "rgba(245,197,43,0.25)"}` }}>
        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", fontWeight: 600, color: "text.primary" }}>{count} selected</Typography>
        <Box sx={{ flex: 1 }} />
        {actions.map((a, i) => (
          <Box key={i} onClick={!actionLoading ? a.onClick : undefined} sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.5, borderRadius: "4px", cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: dm, fontSize: "0.75rem", fontWeight: 600, color: a.destructive ? RED : "text.primary", backgroundColor: a.destructive ? RED_08 : isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.05)", border: `1px solid ${a.destructive ? "rgba(220,38,38,0.2)" : border}`, userSelect: "none", transition: "all 0.15s", "&:hover": { backgroundColor: a.destructive ? "rgba(220,38,38,0.15)" : isDark ? "rgba(255,255,255,0.1)" : "rgba(53,53,53,0.08)" } }}>
            {a.icon}{a.label}
          </Box>
        ))}
      </Box>
    );
  };

  const Card = ({ children, sx = {} }) => (
    <Box sx={{ backgroundColor: "background.paper", borderRadius: "10px", border: `1px solid ${border}`, p: { xs: 2, sm: 3 }, ...sx }}>{children}</Box>
  );

  if (loading) {
    return (<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: embedded ? "40vh" : "60vh" }}><CircularProgress size={28} sx={{ color: GOLD }} /></Box>);
  }

  return (
    <Box sx={{ p: embedded ? 0 : { xs: 2, sm: 3 }, fontFamily: dm }}>
      {!embedded && (
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "1rem", color: "text.primary", letterSpacing: "-0.02em" }}>Archive</Typography>
          <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "text.secondary", mt: 0.3 }}>Archive completed, declined, or cancelled assignments.</Typography>
        </Box>
      )}

      {msg && (
        <Alert severity={msg.type} onClose={() => setMsg(null)} sx={{ mb: 2, borderRadius: "10px", fontFamily: dm, fontSize: "0.78rem", py: 0.75 }}>{msg.text}</Alert>
      )}

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {archivableRequests.length > 0 && (
          <Card>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
              <SectionLabel icon={DescriptionOutlinedIcon} label="Ready to Archive" />
              <Box
                onClick={!actionLoading ? () => openConfirm("Archive All", `Archive all ${archivableRequests.length} request(s)?`, () => archiveRequests(archivableRequests.map((r) => r.id))) : undefined}
                sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.5, borderRadius: "4px", cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: dm, fontSize: "0.75rem", fontWeight: 600, color: "#fff", backgroundColor: "#212121", userSelect: "none", transition: "all 0.15s", "&:hover": { backgroundColor: "#333" } }}
              >
                <ArchiveOutlinedIcon sx={{ fontSize: 14 }} />
                Archive All
              </Box>
            </Box>
            <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "text.disabled", mb: 1.5 }}>
              {archivableRequests.length} assignment(s) ready to be archived.
            </Typography>
            <DataGrid rows={archivableRequests} columns={archivableColumns} density="compact" autoHeight pageSize={10} rowsPerPageOptions={[10, 25, 50]} disableSelectionOnClick sx={makeDataGridSx(isDark, border)} />
          </Card>
        )}

        <Card>
          <SectionLabel icon={ArchiveOutlinedIcon} label="Archived Assignments" />
          {archivedRequests.length === 0 ? (
            <Box sx={{ py: 6, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <ArchiveOutlinedIcon sx={{ fontSize: 32, color: isDark ? "rgba(255,255,255,0.1)" : "rgba(53,53,53,0.12)" }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.disabled" }}>No archived assignments</Typography>
            </Box>
          ) : (
            <>
              <BulkBar
                count={selected.length}
                actions={[
                  { label: "Restore", icon: <UnarchiveOutlinedIcon sx={{ fontSize: 14 }} />, onClick: () => restoreFromArchive(selected) },
                  { label: "Move to Trash", icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 14 }} />, onClick: () => openConfirm("Move to Trash", `Move ${selected.length} request(s) to trash?`, () => moveToTrash(selected)), destructive: true },
                ]}
              />
              <DataGrid rows={archivedRequests} columns={archiveColumns} density="compact" autoHeight pageSize={10} rowsPerPageOptions={[10, 25, 50]} checkboxSelection onSelectionModelChange={(ids) => setSelected(ids)} selectionModel={selected} sx={makeDataGridSx(isDark, border)} />
            </>
          )}
        </Card>
      </Box>

      <ConfirmDialog open={confirm.open} onClose={closeConfirm} onConfirm={runConfirm} title={confirm.title} message={confirm.message} loading={actionLoading} destructive={confirm.destructive} />
    </Box>
  );
}
