// src/pages/client/RequestTracker.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  useTheme,
  Dialog,
  DialogContent,
  IconButton,
  Avatar,
  GlobalStyles,
  TextField,
  Button,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  Select,
  OutlinedInput,
  InputAdornment,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import EventRepeatOutlinedIcon from "@mui/icons-material/EventRepeatOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { useLocation } from "react-router-dom";

// ── Tab icons ─────────────────────────────────────────────────────────────────
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

// ── Pipeline stage icons ──────────────────────────────────────────────────────
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import PendingActionsOutlinedIcon from "@mui/icons-material/PendingActionsOutlined";
import VerifiedOutlinedIcon from "@mui/icons-material/VerifiedOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";

import {
  DataGrid,
  useGridApiRef,
  GridLogicOperator,
  gridFilteredSortedRowIdsSelector,
} from "../../components/common/AppDataGrid";
import ViewActionButton from "../../components/common/ViewActionButton";
import NumberBadge from "../../components/common/NumberBadge";
import { useClientRequests } from "../../hooks/useClientRequests";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import { generateConfirmationPDF } from "../../utils/generateConfirmationPDF";
import BrandedLoader from "../../components/common/BrandedLoader";
import {
  cancelRequest,
  rescheduleRequest,
} from "../../services/coverageRequestService";
import {
  checkConflictForDate,
  checkLateSubmissionForDate,
} from "../../hooks/RequestAssistant";

// ── Helpers ───────────────────────────────────────────────────────────────────
const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};
const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage
    .from("coverage-files")
    .getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
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
const getFriendlyStatus = (status) => {
  const map = {
    Forwarded: "Under Review",
    Assigned: "Staff Assigned",
    "For Approval": "For Approval",
    "On Going": "On Going",
    Completed: "Completed",
    Cancelled: "Cancelled",
  };
  return map[status] || status;
};

function fmtTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDate(d, opts = { month: "long", day: "numeric", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
}

function buildEventDateDisplay(req) {
  if (!req) return "—";
  if (req.is_multiday && req.event_days?.length > 0) {
    const sorted = [...req.event_days].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const first = fmtDate(sorted[0].date, { month: "short", day: "numeric" });
    const last = fmtDate(sorted[sorted.length - 1].date, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return sorted.length === 1 ? fmtDate(sorted[0].date) : `${first} – ${last}`;
  }
  return req.event_date
    ? new Date(req.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
}

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

// ── Constants ─────────────────────────────────────────────────────────────────
const SECTION_COLORS = {
  News: { bg: "#e3f2fd", color: "#1565c0" },
  Photojournalism: { bg: "#f3e5f5", color: "#7b1fa2" },
  Videojournalism: { bg: "#e8f5e9", color: "#2e7d32" },
};

const CANCELLABLE_STATUSES = [
  "Pending",
  "Forwarded",
  "Assigned",
  "For Approval",
  "Approved",
  "On Going",
];

const RESCHEDULABLE_STATUSES = [
  "Forwarded",
  "Assigned",
  "For Approval",
  "Approved",
  "On Going",
];

const PIPELINE_ACTIVE_STATUSES = [
  "Pending",
  "Forwarded",
  "Assigned",
  "For Approval",
  "Approved",
  "On Going",
  "Completed",
];

// ── Pipeline stages ───────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  {
    key: "Pending",
    label: "Submitted",
    sub: "Awaiting admin review",
    phase: 1,
    Icon: SendOutlinedIcon,
  },
  {
    key: "Forwarded",
    label: "Under Review",
    sub: "Forwarded to section heads",
    phase: 1,
    Icon: ManageSearchOutlinedIcon,
  },
  {
    key: "Assigned",
    label: "Staff Assigned",
    sub: "Staffers have been assigned",
    phase: 1,
    Icon: GroupsOutlinedIcon,
  },
  {
    key: "For Approval",
    label: "For Approval",
    sub: "Awaiting final admin sign-off",
    phase: 1,
    Icon: PendingActionsOutlinedIcon,
  },
  {
    key: "Approved",
    label: "Approved",
    sub: "Request approved",
    phase: 1,
    Icon: VerifiedOutlinedIcon,
  },
  {
    key: "On Going",
    label: "On Going",
    sub: "Coverage is underway",
    phase: 2,
    Icon: VideocamOutlinedIcon,
  },
  {
    key: "Completed",
    label: "Completed",
    sub: "Coverage complete",
    phase: 2,
    Icon: TaskAltOutlinedIcon,
  },
];

const STATUS_CONFIG = {
  Pending: { bg: "#fef9ec", color: "#b45309", dot: "#f59e0b" },
  Forwarded: { bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  Assigned: { bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  "For Approval": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Approved: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  "On Going": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Completed: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  Declined: { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
  Cancelled: { bg: "#f9fafb", color: "#6b7280", dot: "#9ca3af" },
  Draft: { bg: "#f9fafb", color: "#6b7280", dot: "#9ca3af" },
};

const getStageIndex = (status) => {
  const map = {
    Pending: 0,
    Forwarded: 1,
    Assigned: 2,
    "For Approval": 3,
    Approved: 4,
    "On Going": 5,
    Completed: 6,
  };
  return map[status] ?? -1;
};

// ── Tabs config ───────────────────────────────────────────────────────────────
const TABS = [
  { label: "All Requests", Icon: ListAltOutlinedIcon },
  { label: "Pending", Icon: HourglassEmptyOutlinedIcon },
  { label: "Approved", Icon: CheckCircleOutlinedIcon },
  { label: "Declined", Icon: BlockOutlinedIcon },
];

const VIEW_BADGE_CONFIG = {
  pipeline: {
    label: "Pipeline",
    bg: "#eef2ff",
    color: "#4338ca",
    dot: "#6366f1",
  },
  0: {
    label: "All Requests",
    bg: "#f3f4f6",
    color: "#4b5563",
    dot: "#9ca3af",
  },
  1: {
    label: "Pending",
    bg: "#fef9ec",
    color: "#b45309",
    dot: "#f59e0b",
  },
  2: {
    label: "Approved",
    bg: "#f0fdf4",
    color: "#15803d",
    dot: "#22c55e",
  },
  3: {
    label: "Declined",
    bg: "#fef2f2",
    color: "#dc2626",
    dot: "#ef4444",
  },
};

const SILENT = { sound: false, toast: false, tabFlash: false };

function resolveTrackerTab(tab) {
  if (tab === "pipeline") return "pipeline";
  if (tab === "all" || tab === 0) return 0;
  if (tab === "pending" || tab === 1) return 1;
  if (tab === "approved" || tab === 2) return 2;
  if (tab === "declined" || tab === 3) return 3;
  return "pipeline";
}

function ViewFilterBadge({ value, count, active = false, spread = false }) {
  const cfg = VIEW_BADGE_CONFIG[value] || {
    label: "Select view",
    bg: "#f3f4f6",
    color: "#4b5563",
    dot: "#9ca3af",
  };

  return (
    <Box
      sx={{
        width: spread ? "100%" : "auto",
        display: "flex",
        alignItems: "center",
        justifyContent: spread ? "space-between" : "flex-start",
        gap: 1,
      }}
    >
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.84rem",
          fontWeight: 400,
          color: "text.primary",
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {cfg.label}
      </Typography>
      <NumberBadge count={count} active={active} fontFamily={dm} />
    </Box>
  );
}

function useAutoOpenRequest(rows, openRequestId, onOpen) {
  const handledIdRef = useRef(null);

  useEffect(() => {
    if (!openRequestId || !rows.length) return;
    if (handledIdRef.current === openRequestId) return;

    const match = rows.find(
      (row) => (row._raw?.id || row.id) === openRequestId,
    );
    if (!match) return;

    handledIdRef.current = openRequestId;
    queueMicrotask(() => {
      onOpen(match._raw || match);
    });
  }, [openRequestId, onOpen, rows]);
}

// ── Event Type Pill (mirrors AdminRequestManagement) ──────────────────────────
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

// ── Column menu GlobalStyles ──────────────────────────────────────────────────
function ColumnMenuStyles({ isDark, border }) {
  const paperBg = isDark ? "#1e1e1e" : "#ffffff";
  const shadow = isDark
    ? "0 12px 40px rgba(0,0,0,0.55)"
    : "0 4px 24px rgba(53,53,53,0.12)";
  const textColor = isDark ? "rgba(255,255,255,0.85)" : CHARCOAL;
  const iconColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(53,53,53,0.4)";
  const hoverBg = isDark ? "rgba(245,197,43,0.08)" : "rgba(245,197,43,0.07)";
  return (
    <GlobalStyles
      styles={{
        ".MuiPaper-root:has(> .MuiDataGrid-menuList)": {
          borderRadius: "10px !important",
          border: `1px solid ${border} !important`,
          backgroundColor: `${paperBg} !important`,
          boxShadow: `${shadow} !important`,
          minWidth: "180px !important",
          overflow: "hidden !important",
        },
        ".MuiDataGrid-menuList": { padding: "4px 0 !important" },
        ".MuiDataGrid-menuList .MuiMenuItem-root": {
          fontFamily: `${dm} !important`,
          fontSize: "0.78rem !important",
          fontWeight: "500 !important",
          color: `${textColor} !important`,
          padding: "7px 14px !important",
          minHeight: "unset !important",
          gap: "10px !important",
          transition: "background-color 0.12s, color 0.12s !important",
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root:hover": {
          backgroundColor: `${hoverBg} !important`,
          color: "#b45309 !important",
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root .MuiListItemIcon-root": {
          minWidth: "unset !important",
          color: `${iconColor} !important`,
          transition: "color 0.12s !important",
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root .MuiSvgIcon-root": {
          fontSize: "1rem !important",
          color: `${iconColor} !important`,
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiListItemIcon-root": {
          color: "#b45309 !important",
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiSvgIcon-root": {
          color: "#b45309 !important",
        },
        ".MuiDataGrid-menuList .MuiListItemText-primary": {
          fontFamily: `${dm} !important`,
          fontSize: "0.78rem !important",
          fontWeight: "500 !important",
        },
        ".MuiDataGrid-menuList .MuiDivider-root": {
          borderColor: `${border} !important`,
          margin: "4px 12px !important",
        },
      }}
    />
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function RequestTracker() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const location = useLocation();
  const [tab, setTab] = useState(() => resolveTrackerTab(location.state?.tab));
  const [searchText, setSearchText] = useState("");
  const { requests: trackerRequests } = useClientRequests();
  const gridApiRef = useGridApiRef();
  const border = isDark ? BORDER_DARK : BORDER;
  const openRequestId = location.state?.openRequestId || null;
  const lastSyncedLocationTabRef = useRef(location.state?.tab);

  const externalFilterModel = useMemo(() => {
    const tokens = searchText
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    return {
      items: [],
      quickFilterValues: tokens,
      quickFilterLogicOperator: GridLogicOperator.Or,
    };
  }, [searchText]);

  const handleExportCsv = () => {
    if (tab === "pipeline") {
      return;
    }

    gridApiRef.current?.exportDataAsCsv({
      utf8WithBom: true,
      fileName: "request-tracker-export",
      getRowsToExport: ({ apiRef }) => gridFilteredSortedRowIdsSelector(apiRef),
    });
  };

  useEffect(() => {
    const locationTab = location.state?.tab;
    if (locationTab === lastSyncedLocationTabRef.current) return;

    lastSyncedLocationTabRef.current = locationTab;
    queueMicrotask(() => setTab(resolveTrackerTab(locationTab)));
  }, [location.state?.tab]);

  const isPipeline = tab === "pipeline";
  const filterControlHeight = 40;

  const viewCounts = useMemo(() => {
    const nonDraft = trackerRequests.filter((r) => r.status !== "Draft");
    return {
      pipeline: trackerRequests.filter((r) => PIPELINE_ACTIVE_STATUSES.includes(r.status)).length,
      0: nonDraft.length,
      1: trackerRequests.filter((r) => r.status === "Pending").length,
      2: trackerRequests.filter((r) => r.status === "Approved").length,
      3: trackerRequests.filter((r) => r.status === "Declined").length,
    };
  }, [trackerRequests]);

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 3 },
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        fontFamily: dm,
      }}
    >
      <ColumnMenuStyles isDark={isDark} border={border} />

      {/* ── Header ── */}
      <Box sx={{ mb: 2.5, flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 600,
            fontSize: "0.95rem",
            color: "text.primary",
            letterSpacing: "-0.01em",
          }}
        >
          Request Tracker
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            color: "text.secondary",
            mt: 0.3,
          }}
        >
          Track the status of your coverage requests from submission to
          completion.
        </Typography>
      </Box>

      {/* ── Filter row: Search | View | Export ── */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "flex-end",
          gap: 1.5,
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <FormControl size="small" sx={{ flex: 1, minWidth: 300 }}>
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
              height: filterControlHeight,
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: "10px",
              backgroundColor: "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          />
        </FormControl>

        {/* View */}
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={tab}
            onChange={(e) => setTab(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            inputProps={{ "aria-label": "Request view filter" }}
            renderValue={(v) => (
              <ViewFilterBadge value={v} count={viewCounts[v]} active />
            )}
            sx={{
              height: filterControlHeight,
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: "10px",
              backgroundColor: "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
              "& .MuiSelect-icon": { fontSize: 18, color: "text.disabled" },
            }}
          >
            <MenuItem
              value="pipeline"
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                fontWeight: 400,
                "&.Mui-selected": { fontWeight: 400 },
              }}
            >
              <ViewFilterBadge
                value="pipeline"
                count={viewCounts.pipeline}
                active={tab === "pipeline"}
                spread
              />
            </MenuItem>
            {TABS.map(({ label }, idx) => (
              <MenuItem
                key={label}
                value={idx}
                sx={{
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  fontWeight: 400,
                  "&.Mui-selected": { fontWeight: 400 },
                }}
              >
                <ViewFilterBadge
                  value={idx}
                  count={viewCounts[idx]}
                  active={tab === idx}
                  spread
                />
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        {/* Export */}
        <Box
          onClick={handleExportCsv}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            height: filterControlHeight,
            borderRadius: "10px",
            cursor: "pointer",
            border: "1px solid rgba(0,0,0,0.12)",
            fontFamily: dm,
            fontSize: "0.78rem",
            fontWeight: 500,
            color: "text.secondary",
            backgroundColor: "#f7f7f8",
            transition: "all 0.15s",
            flexShrink: 0,
            opacity: isPipeline ? 0.5 : 1,
            pointerEvents: isPipeline ? "none" : "auto",
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
      </Box>

      {isPipeline && (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <PipelineTab
            isDark={isDark}
            border={border}
            openRequestId={openRequestId}
          />
        </Box>
      )}
      {tab === 0 && (
        <AllRequestsTab
          isDark={isDark}
          border={border}
          gridApiRef={gridApiRef}
          filterModel={externalFilterModel}
          openRequestId={openRequestId}
        />
      )}
      {tab === 1 && (
        <PendingTab
          isDark={isDark}
          border={border}
          gridApiRef={gridApiRef}
          filterModel={externalFilterModel}
          openRequestId={openRequestId}
        />
      )}
      {tab === 2 && (
        <ApprovedTab
          isDark={isDark}
          border={border}
          gridApiRef={gridApiRef}
          filterModel={externalFilterModel}
          openRequestId={openRequestId}
        />
      )}
      {tab === 3 && (
        <DeclinedTab
          isDark={isDark}
          border={border}
          gridApiRef={gridApiRef}
          filterModel={externalFilterModel}
          openRequestId={openRequestId}
        />
      )}
    </Box>
  );
}

// ── Pipeline Tab ──────────────────────────────────────────────────────────────
function PipelineTab({ isDark, border, openRequestId }) {
  const { requests, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });

  const active = requests.filter((r) =>
    PIPELINE_ACTIVE_STATUSES.includes(r.status),
  );

  useAutoOpenRequest(active, openRequestId, setSelected);

  if (loading) return <Loader />;
  if (active.length === 0)
    return (
      <Box sx={{ py: 10, textAlign: "center" }}>
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.85rem", color: "text.secondary" }}
        >
          No active requests in the pipeline.
        </Typography>
      </Box>
    );

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {active.map((req) => (
          <PipelineCard
            key={req.id}
            request={req}
            isDark={isDark}
            border={border}
            onClick={() => setSelected(req)}
          />
        ))}
      </Box>
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
        onCancelSuccess={() => {
          setSelected(null);
          refetch();
        }}
        onRescheduleSuccess={() => {
          setSelected(null);
          refetch();
        }}
      />
    </>
  );
}

// ── Pipeline Card ─────────────────────────────────────────────────────────────
function PipelineCard({ request, isDark, border, onClick }) {
  const currentIdx = getStageIndex(request.status);
  const isDeclined = request.status === "Declined";
  const cfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.Draft;
  const currentPhase = currentIdx >= 5 ? 2 : 1;
  const isMultiDay = !!(request.is_multiday && request.event_days?.length > 0);

  const phase1 = PIPELINE_STAGES.filter((s) => s.phase === 1);
  const phase2 = PIPELINE_STAGES.filter((s) => s.phase === 2);

  const renderStages = (stages, baseOffset) =>
    stages.map((stage, i) => {
      const idx = baseOffset + i;
      const done = idx < currentIdx;
      const current = idx === currentIdx;
      const isP2 = stage.phase === 2;
      const { Icon } = stage;

      let wrapBg, wrapBorder, wrapShadow, iconColor;
      if (done) {
        wrapBg = "#dcfce7";
        wrapBorder = "transparent";
        wrapShadow = "none";
        iconColor = "#15803d";
      } else if (current && !isP2) {
        wrapBg = GOLD;
        wrapBorder = "transparent";
        wrapShadow = `0 0 0 4px ${GOLD_08}`;
        iconColor = CHARCOAL;
      } else if (current && isP2) {
        wrapBg = "#dbeafe";
        wrapBorder = "transparent";
        wrapShadow = "0 0 0 4px rgba(59,130,246,0.15)";
        iconColor = "#1d4ed8";
      } else {
        wrapBg = "transparent";
        wrapBorder = isDark ? "#444" : "#d1d5db";
        wrapShadow = "none";
        iconColor = isDark ? "#555" : "#c4c4c4";
      }

      return (
        <React.Fragment key={stage.key}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              opacity: isP2 && currentPhase < 2 ? 0.4 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <Box sx={{ mb: 0.6 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  backgroundColor: wrapBg,
                  border: `1.5px solid ${wrapBorder}`,
                  boxShadow: wrapShadow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                <Icon
                  sx={{
                    fontSize: 13,
                    color: iconColor,
                    transition: "color 0.2s",
                  }}
                />
              </Box>
            </Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.6rem",
                textAlign: "center",
                lineHeight: 1.3,
                px: 0.25,
                fontWeight: current ? 700 : done ? 500 : 400,
                color: done
                  ? "#15803d"
                  : current
                    ? "text.primary"
                    : "text.secondary",
              }}
            >
              {stage.label}
            </Typography>
          </Box>
          {i < stages.length - 1 && (
            <Box
              sx={{
                height: "2px",
                flex: 1,
                mx: 0.5,
                mb: 3,
                borderRadius: 1,
                backgroundColor:
                  idx < currentIdx ? "#22c55e" : isDark ? "#333" : "#e5e7eb",
                transition: "background-color 0.3s",
                opacity: isP2 && currentPhase < 2 ? 0.3 : 1,
              }}
            />
          )}
        </React.Fragment>
      );
    });

  return (
    <Box
      onClick={onClick}
      sx={{
        px: 2.5,
        py: 2,
        borderRadius: "10px",
        border: `1px solid ${border}`,
        backgroundColor: "background.paper",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        "&:hover": {
          borderColor: GOLD,
          boxShadow: `0 2px 16px ${isDark ? "rgba(0,0,0,0.25)" : "rgba(53,53,53,0.06)"}`,
        },
      }}
    >
      {/* Title row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box
          sx={{
            minWidth: 0,
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 600,
              fontSize: "0.88rem",
              color: "text.primary",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {request.title}
          </Typography>
          <EventTypePill isMultiDay={isMultiDay} isDark={isDark} />
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            ml: 2,
            flexShrink: 0,
          }}
        >
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
                fontWeight: 600,
                color: cfg.color,
                letterSpacing: "0.04em",
              }}
            >
              {getFriendlyStatus(request.status)}
            </Typography>
          </Box>
          <ChevronRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        </Box>
      </Box>

      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.72rem",
          color: "text.secondary",
          mb: 2,
          mt: -1.5,
        }}
      >
        {buildEventDateDisplay(request)}
        {request.venue ? ` · ${request.venue}` : ""}
      </Typography>

      {/* Pipeline or declined */}
      {!isDeclined ? (
        <Box>
          {/* Phase labels bar */}
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.25 }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flex: phase1.length,
              }}
            >
              <Box
                sx={{
                  px: 0.75,
                  py: 0.1,
                  borderRadius: "10px",
                  backgroundColor:
                    currentPhase === 1
                      ? GOLD_08
                      : isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(53,53,53,0.04)",
                  border: `1px solid ${currentPhase === 1 ? "rgba(245,197,43,0.3)" : isDark ? "#2e2e2e" : "#e8e8e8"}`,
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.56rem",
                    fontWeight: 700,
                    color:
                      currentPhase === 1
                        ? isDark
                          ? GOLD
                          : "#7a5c00"
                        : "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Phase 1
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  height: "1px",
                  backgroundColor:
                    currentPhase === 1
                      ? "rgba(245,197,43,0.25)"
                      : isDark
                        ? "#2a2a2a"
                        : "#ebebeb",
                }}
              />
            </Box>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                flexShrink: 0,
                backgroundColor:
                  currentPhase === 2 ? "#3b82f6" : isDark ? "#444" : "#d1d5db",
                boxShadow:
                  currentPhase === 2
                    ? "0 0 0 3px rgba(59,130,246,0.15)"
                    : "none",
                transition: "all 0.25s",
              }}
            />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flex: phase2.length,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  height: "1px",
                  backgroundColor:
                    currentPhase === 2
                      ? "rgba(59,130,246,0.25)"
                      : isDark
                        ? "#2a2a2a"
                        : "#ebebeb",
                }}
              />
              <Box
                sx={{
                  px: 0.75,
                  py: 0.1,
                  borderRadius: "10px",
                  backgroundColor:
                    currentPhase === 2
                      ? "rgba(59,130,246,0.08)"
                      : isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(53,53,53,0.04)",
                  border: `1px solid ${currentPhase === 2 ? "rgba(59,130,246,0.2)" : isDark ? "#2e2e2e" : "#e8e8e8"}`,
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.56rem",
                    fontWeight: 700,
                    color: currentPhase === 2 ? "#3b82f6" : "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Phase 2
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Stage nodes */}
          <Box sx={{ display: "flex", alignItems: "flex-start" }}>
            {renderStages(phase1, 0)}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mx: 0.5,
                mb: 3,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  height: "2px",
                  width: 14,
                  backgroundColor:
                    currentIdx >= 5 ? "#22c55e" : isDark ? "#333" : "#e5e7eb",
                  borderRadius: 1,
                }}
              />
            </Box>
            {renderStages(phase2, phase1.length)}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: "10px",
            backgroundColor: isDark ? "#1a0a0a" : "#fef2f2",
            borderLeft: "2.5px solid #ef4444",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.75rem",
              color: "#dc2626",
              lineHeight: 1.5,
            }}
          >
            This request was declined.
            {request.declined_reason ? ` "${request.declined_reason}"` : ""}
          </Typography>
        </Box>
      )}

      {!isDeclined && currentIdx >= 0 && (
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.68rem",
            color: "text.secondary",
            mt: 0.75,
            textAlign: "center",
          }}
        >
          {PIPELINE_STAGES[currentIdx]?.sub}
        </Typography>
      )}
    </Box>
  );
}

// ── Grid Tabs ─────────────────────────────────────────────────────────────────
function RequestsGrid({
  rows,
  columns,
  border,
  gridApiRef,
  filterModel,
}) {
  return (
    <Box sx={{ flex: 1, minHeight: 0, width: "100%", overflowX: "auto" }}>
      <Box
        sx={{
          minWidth: 640,
          height: "100%",
          bgcolor: "#f7f7f8",
          borderRadius: "10px",
          border: `1px solid ${border}`,
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          pageSize={10}
          rowsPerPageOptions={[10]}
          disableRowSelectionOnClick
          rowHeight={56}
          enableSearch={false}
          apiRef={gridApiRef}
          filterModel={filterModel}
          slotProps={{
            toolbar: {
              csvOptions: { disableToolbarButton: true },
              printOptions: { disableToolbarButton: true },
            },
          }}
        />
      </Box>
    </Box>
  );
}

// ── Row-level action menu cell ────────────────────────────────────────────────
function RowActionMenu({ row, isDark, onView, onReschedule, onCancel }) {
  const [anchor, setAnchor] = useState(null);
  const border = isDark ? BORDER_DARK : BORDER;
  const status = row._raw?.status;
  const canReschedule = onReschedule && RESCHEDULABLE_STATUSES.includes(status);
  const canCancel = onCancel && CANCELLABLE_STATUSES.includes(status);
  const hasSecondaryActions = canReschedule || canCancel;

  return (
    <>
      <ViewActionButton
        onClick={(e) => {
          e.stopPropagation();
          onView(row._raw);
        }}
      >
        View
      </ViewActionButton>
      {hasSecondaryActions && (
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setAnchor(e.currentTarget);
          }}
          sx={{
            color: "text.secondary",
            borderRadius: "10px",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
            },
          }}
        >
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      )}
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              borderRadius: "10px",
              minWidth: 170,
              border: `1px solid ${border}`,
              boxShadow: isDark
                ? "0 8px 24px rgba(0,0,0,0.5)"
                : "0 4px 20px rgba(53,53,53,0.10)",
            },
          },
        }}
      >
        {canReschedule && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onReschedule(row._raw);
            }}
            sx={{ fontFamily: dm, fontSize: "0.8rem", py: 1, gap: 0.5 }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <EventRepeatOutlinedIcon
                sx={{ fontSize: 16, color: "text.secondary" }}
              />
            </ListItemIcon>
            <ListItemText
              primary="Reschedule"
              primaryTypographyProps={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 500,
              }}
            />
          </MenuItem>
        )}
        {canCancel && (
          <MenuItem
            onClick={() => {
              setAnchor(null);
              onCancel(row._raw);
            }}
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              py: 1,
              gap: 0.5,
              color: "#ef4444",
            }}
          >
            <ListItemIcon sx={{ minWidth: 28 }}>
              <CancelOutlinedIcon sx={{ fontSize: 16, color: "#ef4444" }} />
            </ListItemIcon>
            <ListItemText
              primary="Cancel Request"
              primaryTypographyProps={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 500,
                color: "#ef4444",
              }}
            />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

// ── Shared grid columns hook ──────────────────────────────────────────────────
function useGridColumns(isDark, { onView, onReschedule, onCancel } = {}) {
  const titleCol = {
    field: "eventTitle",
    headerName: "Event Title",
    flex: 1.4,
    minWidth: 180,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            fontWeight: 400,
            color: isDark ? "#f5f5f5" : "#1a1a1a",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {p.value}
        </Typography>
      </Box>
    ),
  };

  // ── Event Type column — mirrors AdminRequestManagement ──
  const typeCol = {
    field: "eventType",
    headerName: "Type",
    flex: 0.65,
    minWidth: 100,
    sortable: false,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <EventTypePill isMultiDay={p.value} isDark={isDark} />
      </Box>
    ),
  };

  const submissionCol = {
    field: "submissionDate",
    headerName: "Submitted",
    flex: 0.9,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };

  const eventDateCol = {
    field: "eventDate",
    headerName: "Event Date",
    flex: 1.1,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };

  const statusCol = {
    field: "status",
    headerName: "Status",
    flex: 1,
    renderCell: (p) => {
      const cfg = STATUS_CONFIG[p.value] || STATUS_CONFIG.Draft;
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
                fontSize: "0.7rem",
                fontWeight: 600,
                color: cfg.color,
                letterSpacing: "0.04em",
              }}
            >
              {getFriendlyStatus(p.value)}
            </Typography>
          </Box>
        </Box>
      );
    },
  };

  const actionCol = {
    field: "actions",
    headerName: "",
    width: 140,
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
        <RowActionMenu
          row={p.row}
          isDark={isDark}
          onView={onView}
          onReschedule={onReschedule}
          onCancel={onCancel}
        />
      </Box>
    ),
  };

  const dateApprovedCol = {
    field: "dateApproved",
    headerName: "Date Approved",
    flex: 1,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };

  const dateDeclinedCol = {
    field: "dateDeclined",
    headerName: "Date Declined",
    flex: 1,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };

  return {
    titleCol,
    typeCol,
    submissionCol,
    eventDateCol,
    statusCol,
    actionCol,
    dateApprovedCol,
    dateDeclinedCol,
  };
}

const toRow = (req) => ({
  id: req.id,
  eventTitle: req.title,
  submissionDate: req.submitted_at
    ? new Date(req.submitted_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—",
  eventDate: buildEventDateDisplay(req),
  eventType: !!(req.is_multiday && req.event_days?.length > 0), // used by EventTypePill
  status: req.status,
  dateApproved: req.approved_at
    ? new Date(req.approved_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—",
  dateDeclined: req.declined_at
    ? new Date(req.declined_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—",
  _raw: req,
});

function AllRequestsTab({ isDark, border, gridApiRef, filterModel, openRequestId }) {
  const { requests, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });
  const {
    titleCol,
    typeCol,
    submissionCol,
    eventDateCol,
    statusCol,
    actionCol,
  } = useGridColumns(isDark, {
    onView: setSelected,
    onReschedule: setRescheduleTarget,
    onCancel: setCancelTarget,
  });
  const columns = [
    titleCol,
    typeCol,
    submissionCol,
    eventDateCol,
    statusCol,
    actionCol,
  ];
  const rows = requests.filter((r) => r.status !== "Draft").map(toRow);

  useAutoOpenRequest(rows, openRequestId, setSelected);

  const handleCancelConfirm = async (reason) => {
    setCancelLoading(true);
    try {
      await cancelRequest(cancelTarget.id, reason);
      setCancelTarget(null);
      refetch();
    } catch (err) {
      console.error("Cancel failed:", err);
      alert(err.message || "Failed to cancel the request. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleConfirm = async (newDatePayload, reason) => {
    setRescheduleLoading(true);
    try {
      await rescheduleRequest(rescheduleTarget.id, newDatePayload, reason);
      setRescheduleTarget(null);
      refetch();
    } catch (err) {
      console.error("Reschedule failed:", err);
      alert(
        err.message || "Failed to reschedule the request. Please try again.",
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) return <Loader />;
  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        isDark={isDark}
        border={border}
        gridApiRef={gridApiRef}
        filterModel={filterModel}
      />
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
        onCancelSuccess={() => {
          setSelected(null);
          refetch();
        }}
        onRescheduleSuccess={() => {
          setSelected(null);
          refetch();
        }}
      />
      <CancelConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        loading={cancelLoading}
        isDark={isDark}
        border={border}
      />
      <RescheduleDialog
        open={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleRescheduleConfirm}
        loading={rescheduleLoading}
        isDark={isDark}
        border={border}
        request={rescheduleTarget}
      />
    </>
  );
}

function PendingTab({ isDark, border, gridApiRef, filterModel, openRequestId }) {
  const { pending, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });
  const { titleCol, typeCol, submissionCol, eventDateCol, actionCol } =
    useGridColumns(isDark, {
      onView: setSelected,
      onReschedule: setRescheduleTarget,
      onCancel: setCancelTarget,
    });
  const columns = [titleCol, typeCol, submissionCol, eventDateCol, actionCol];
  const rows = pending.map(toRow);

  useAutoOpenRequest(rows, openRequestId, setSelected);

  const handleCancelConfirm = async (reason) => {
    setCancelLoading(true);
    try {
      await cancelRequest(cancelTarget.id, reason);
      setCancelTarget(null);
      refetch();
    } catch (err) {
      console.error("Cancel failed:", err);
      alert(err.message || "Failed to cancel the request. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleConfirm = async (newDatePayload, reason) => {
    setRescheduleLoading(true);
    try {
      await rescheduleRequest(rescheduleTarget.id, newDatePayload, reason);
      setRescheduleTarget(null);
      refetch();
    } catch (err) {
      console.error("Reschedule failed:", err);
      alert(
        err.message || "Failed to reschedule the request. Please try again.",
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) return <Loader />;
  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        isDark={isDark}
        border={border}
        gridApiRef={gridApiRef}
        filterModel={filterModel}
      />
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
        onCancelSuccess={() => {
          setSelected(null);
          refetch();
        }}
        onRescheduleSuccess={() => {
          setSelected(null);
          refetch();
        }}
      />
      <CancelConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        loading={cancelLoading}
        isDark={isDark}
        border={border}
      />
      <RescheduleDialog
        open={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleRescheduleConfirm}
        loading={rescheduleLoading}
        isDark={isDark}
        border={border}
        request={rescheduleTarget}
      />
    </>
  );
}

function ApprovedTab({ isDark, border, gridApiRef, filterModel, openRequestId }) {
  const { requests, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });
  const { titleCol, typeCol, eventDateCol, actionCol, dateApprovedCol } =
    useGridColumns(isDark, {
      onView: setSelected,
      onReschedule: setRescheduleTarget,
      onCancel: setCancelTarget,
    });
  const columns = [titleCol, typeCol, eventDateCol, dateApprovedCol, actionCol];
  const rows = requests.filter((r) => r.status === "Approved").map(toRow);

  useAutoOpenRequest(rows, openRequestId, setSelected);

  const handleCancelConfirm = async (reason) => {
    setCancelLoading(true);
    try {
      await cancelRequest(cancelTarget.id, reason);
      setCancelTarget(null);
      refetch();
    } catch (err) {
      console.error("Cancel failed:", err);
      alert(err.message || "Failed to cancel the request. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleConfirm = async (newDatePayload, reason) => {
    setRescheduleLoading(true);
    try {
      await rescheduleRequest(rescheduleTarget.id, newDatePayload, reason);
      setRescheduleTarget(null);
      refetch();
    } catch (err) {
      console.error("Reschedule failed:", err);
      alert(
        err.message || "Failed to reschedule the request. Please try again.",
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  if (loading) return <Loader />;
  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        isDark={isDark}
        border={border}
        gridApiRef={gridApiRef}
        filterModel={filterModel}
      />
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
        onCancelSuccess={() => {
          setSelected(null);
          refetch();
        }}
        onRescheduleSuccess={() => {
          setSelected(null);
          refetch();
        }}
      />
      <CancelConfirmDialog
        open={!!cancelTarget}
        onClose={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
        loading={cancelLoading}
        isDark={isDark}
        border={border}
      />
      <RescheduleDialog
        open={!!rescheduleTarget}
        onClose={() => setRescheduleTarget(null)}
        onConfirm={handleRescheduleConfirm}
        loading={rescheduleLoading}
        isDark={isDark}
        border={border}
        request={rescheduleTarget}
      />
    </>
  );
}

function DeclinedTab({ isDark, border, gridApiRef, filterModel, openRequestId }) {
  const { requests, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });
  const { titleCol, typeCol, eventDateCol, actionCol, dateDeclinedCol } =
    useGridColumns(isDark, { onView: setSelected });
  const columns = [titleCol, typeCol, eventDateCol, dateDeclinedCol, actionCol];
  const rows = requests.filter((r) => r.status === "Declined").map(toRow);

  useAutoOpenRequest(rows, openRequestId, setSelected);
  if (loading) return <Loader />;
  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        isDark={isDark}
        border={border}
        gridApiRef={gridApiRef}
        filterModel={filterModel}
      />
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
        onCancelSuccess={() => {
          setSelected(null);
          refetch();
        }}
        onRescheduleSuccess={() => {
          setSelected(null);
          refetch();
        }}
      />
    </>
  );
}

// ── Cancel Confirmation Dialog ────────────────────────────────────────────────
function CancelConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading,
  isDark,
  border,
}) {
  const [reason, setReason] = useState("");
  const handleConfirm = () => onConfirm(reason.trim());
  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: "10px",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 8px 40px rgba(53,53,53,0.12)",
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CancelOutlinedIcon sx={{ fontSize: 18, color: "#ef4444" }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              Cancel Request
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.72rem",
                color: "text.secondary",
                mt: 0.15,
              }}
            >
              This action cannot be undone.
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          size="small"
          sx={{
            color: "text.secondary",
            borderRadius: "10px",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>
      <DialogContent sx={{ px: 3, pt: 0, pb: 3 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            color: "text.secondary",
            mb: 2,
            lineHeight: 1.6,
          }}
        >
          Are you sure you want to cancel this request? All assigned staff will
          be notified and their assignments will be removed.
        </Typography>
        <TextField
          fullWidth
          multiline
          minRows={3}
          placeholder="Reason for cancellation (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
          sx={{
            "& .MuiOutlinedInput-root": {
              fontFamily: dm,
              fontSize: "0.82rem",
              borderRadius: "10px",
              "& fieldset": { borderColor: border },
              "&:hover fieldset": { borderColor: GOLD },
              "&.Mui-focused fieldset": { borderColor: GOLD },
            },
            "& .MuiInputBase-input::placeholder": {
              color: "text.disabled",
              opacity: 1,
            },
          }}
        />
        <Box sx={{ display: "flex", gap: 1.25, mt: 2.5 }}>
          <Button
            fullWidth
            onClick={handleClose}
            disabled={loading}
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              fontWeight: 500,
              borderRadius: "10px",
              py: 1,
              textTransform: "none",
              border: `1px solid ${border}`,
              color: "text.secondary",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : HOVER_BG,
                borderColor: "text.secondary",
              },
            }}
          >
            Keep Request
          </Button>
          <Button
            fullWidth
            onClick={handleConfirm}
            disabled={loading}
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              fontWeight: 600,
              borderRadius: "10px",
              py: 1,
              textTransform: "none",
              backgroundColor: "#ef4444",
              color: "#fff",
              "&:hover": { backgroundColor: "#dc2626" },
              "&:disabled": { backgroundColor: "#fca5a5", color: "#fff" },
            }}
          >
            {loading ? (
              <CircularProgress size={16} sx={{ color: "#fff" }} />
            ) : (
              "Yes, Cancel Request"
            )}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

// ── Reschedule Dialog ─────────────────────────────────────────────────────────
function RescheduleDialog({
  open,
  onClose,
  onConfirm,
  loading,
  isDark,
  border,
  request,
}) {
  const [multiDay, setMultiDay] = useState(false);
  const [singleDate, setSingleDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [days, setDays] = useState([{ date: "", from_time: "", to_time: "" }]);
  const [reason, setReason] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [showWarningStep, setShowWarningStep] = useState(false);

  useEffect(() => {
    if (open) {
      const wasMultiDay = !!(
        request?.is_multiday && request?.event_days?.length > 0
      );
      setMultiDay(wasMultiDay);
      setSingleDate("");
      setFromTime(request?.from_time || "");
      setToTime(request?.to_time || "");
      setDays(
        wasMultiDay
          ? request.event_days.map((d) => ({
              date: "",
              from_time: d.from_time || "",
              to_time: d.to_time || "",
            }))
          : [{ date: "", from_time: "", to_time: "" }],
      );
      setReason("");
      setValidationIssues([]);
      setShowWarningStep(false);
    }
  }, [open, request]);

  const addDay = () =>
    setDays((p) => [...p, { date: "", from_time: "", to_time: "" }]);
  const removeDay = (i) => setDays((p) => p.filter((_, idx) => idx !== i));
  const updateDay = (i, field, val) =>
    setDays((p) => p.map((d, idx) => (idx === i ? { ...d, [field]: val } : d)));

  const getPrimaryDate = () => {
    if (multiDay) {
      const filled = days
        .filter((d) => d.date)
        .sort((a, b) => a.date.localeCompare(b.date));
      return filled[0]?.date || null;
    }
    return singleDate || null;
  };

  const buildPayload = () => {
    if (multiDay) {
      const sorted = [...days]
        .filter((d) => d.date)
        .sort((a, b) => a.date.localeCompare(b.date));
      return {
        is_multiday: true,
        event_date: sorted[0]?.date || null,
        end_date: sorted[sorted.length - 1]?.date || null,
        from_time: sorted[0]?.from_time || null,
        to_time: sorted[0]?.to_time || null,
        event_days: sorted,
      };
    }
    return {
      is_multiday: false,
      event_date: singleDate,
      end_date: null,
      from_time: fromTime || null,
      to_time: toTime || null,
      event_days: [],
    };
  };

  const handleValidate = async () => {
    const primaryDate = getPrimaryDate();
    if (!primaryDate) return;
    setValidating(true);
    setValidationIssues([]);
    const issues = [];
    try {
      const lateResult = await checkLateSubmissionForDate(primaryDate);
      if (lateResult.type === "error")
        issues.push({ severity: "error", message: lateResult.message });
      else if (lateResult.type === "warning")
        issues.push({ severity: "warning", message: lateResult.message });
      const conflictResult = await checkConflictForDate(
        primaryDate,
        request?.id,
      );
      if (conflictResult.hasConflict) {
        const msgs = conflictResult.conflicts.map(
          (c) =>
            `"${c.title}" (${c.status}${c.from_time ? ` · ${fmtTime(c.from_time)}–${fmtTime(c.to_time)}` : ""})`,
        );
        issues.push({
          severity: "warning",
          message: `Scheduling conflict${msgs.length > 1 ? "s" : ""} on this date: ${msgs.join("; ")}`,
        });
      }
    } catch (err) {
      console.error("Validation error:", err);
    } finally {
      setValidating(false);
    }
    if (issues.length > 0) {
      setValidationIssues(issues);
      setShowWarningStep(true);
    } else onConfirm(buildPayload(), reason.trim());
  };

  const handleProceedDespiteWarnings = () =>
    onConfirm(buildPayload(), reason.trim());
  const handleBack = () => {
    setShowWarningStep(false);
    setValidationIssues([]);
  };
  const handleClose = () => {
    if (loading) return;
    setShowWarningStep(false);
    setValidationIssues([]);
    onClose();
  };

  const primaryDate = getPrimaryDate();
  const canSubmit = !!primaryDate;
  const hasHardError = validationIssues.some((i) => i.severity === "error");

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      fontFamily: dm,
      fontSize: "0.82rem",
      borderRadius: "10px",
      "& fieldset": { borderColor: border },
      "&:hover fieldset": { borderColor: GOLD },
      "&.Mui-focused fieldset": { borderColor: GOLD },
    },
    "& .MuiInputLabel-root": { fontFamily: dm, fontSize: "0.82rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: GOLD },
    "& .MuiInputBase-input": { fontFamily: dm },
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "10px",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 8px 40px rgba(53,53,53,0.12)",
          maxHeight: "90vh",
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              backgroundColor: isDark ? "rgba(245,197,43,0.1)" : GOLD_08,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <EventRepeatOutlinedIcon sx={{ fontSize: 18, color: GOLD }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              {showWarningStep ? "Review Issues" : "Reschedule Request"}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.72rem",
                color: "text.secondary",
                mt: 0.15,
              }}
            >
              {showWarningStep
                ? "Please review the issues below before proceeding."
                : "Status will reset to Under Review for staff reassignment."}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          size="small"
          sx={{
            color: "text.secondary",
            borderRadius: "10px",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.5, overflowY: "auto" }}>
        {showWarningStep ? (
          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
                mb: 3,
              }}
            >
              {validationIssues.map((issue, idx) => {
                const isError = issue.severity === "error";
                return (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      gap: 1.25,
                      p: 1.5,
                      borderRadius: "10px",
                      backgroundColor: isError
                        ? isDark
                          ? "rgba(239,68,68,0.08)"
                          : "#fef2f2"
                        : isDark
                          ? "rgba(245,158,11,0.08)"
                          : "#fffbeb",
                      border: `1px solid ${isError ? (isDark ? "rgba(239,68,68,0.2)" : "#fecaca") : isDark ? "rgba(245,158,11,0.2)" : "#fde68a"}`,
                    }}
                  >
                    {isError ? (
                      <ErrorOutlineOutlinedIcon
                        sx={{
                          fontSize: 17,
                          color: "#ef4444",
                          flexShrink: 0,
                          mt: 0.1,
                        }}
                      />
                    ) : (
                      <WarningAmberOutlinedIcon
                        sx={{
                          fontSize: 17,
                          color: "#f59e0b",
                          flexShrink: 0,
                          mt: 0.1,
                        }}
                      />
                    )}
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.8rem",
                        color: isError ? "#dc2626" : "#92400e",
                        lineHeight: 1.55,
                      }}
                    >
                      {issue.message}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            {!hasHardError && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(53,53,53,0.02)",
                  border: `1px solid ${border}`,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    color: "text.secondary",
                    lineHeight: 1.6,
                  }}
                >
                  You can still proceed with this reschedule. Section heads will
                  be notified to reassign staff for the new date.
                </Typography>
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1.25 }}>
              <Button
                fullWidth
                onClick={handleBack}
                disabled={loading}
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  borderRadius: "10px",
                  py: 1,
                  textTransform: "none",
                  border: `1px solid ${border}`,
                  color: "text.secondary",
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : HOVER_BG,
                  },
                }}
              >
                Go Back
              </Button>
              {!hasHardError && (
                <Button
                  fullWidth
                  onClick={handleProceedDespiteWarnings}
                  disabled={loading}
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    borderRadius: "10px",
                    py: 1,
                    textTransform: "none",
                    backgroundColor: "#212121",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#333" },
                    "&:disabled": {
                      backgroundColor: "rgba(33,33,33,0.35)",
                      color: "rgba(255,255,255,0.7)",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={16} sx={{ color: "#fff" }} />
                  ) : (
                    "Proceed Anyway"
                  )}
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: "10px",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(53,53,53,0.02)",
                border: `1px solid ${border}`,
                mb: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.7rem",
                  color: "text.secondary",
                  mb: 0.25,
                }}
              >
                Current event date
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "text.primary",
                }}
              >
                {buildEventDateDisplay(request)}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "text.primary",
                }}
              >
                New Schedule
              </Typography>
              <Box
                onClick={() => {
                  setMultiDay((p) => !p);
                  setDays([{ date: "", from_time: "", to_time: "" }]);
                  setSingleDate("");
                  setFromTime("");
                  setToTime("");
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.25,
                  py: 0.45,
                  borderRadius: "10px",
                  cursor: "pointer",
                  border: `1px solid ${multiDay ? GOLD : border}`,
                  backgroundColor: multiDay ? GOLD_08 : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.73rem",
                    fontWeight: 500,
                    color: multiDay
                      ? isDark
                        ? GOLD
                        : "#7a5c00"
                      : "text.secondary",
                  }}
                >
                  Multi-day
                </Typography>
              </Box>
            </Box>

            {!multiDay && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <TextField
                  fullWidth
                  label="New Event Date"
                  type="date"
                  value={singleDate}
                  onChange={(e) => setSingleDate(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  sx={inputSx}
                />
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5,
                  }}
                >
                  <TextField
                    fullWidth
                    label="Start Time"
                    type="time"
                    value={fromTime}
                    onChange={(e) => setFromTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                  <TextField
                    fullWidth
                    label="End Time"
                    type="time"
                    value={toTime}
                    onChange={(e) => setToTime(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </Box>
              </Box>
            )}

            {multiDay && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {days.map((day, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      borderRadius: "10px",
                      border: `1px solid ${border}`,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.01)"
                        : "rgba(53,53,53,0.01)",
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
                        Day {idx + 1}
                      </Typography>
                      {days.length > 1 && (
                        <IconButton
                          onClick={() => removeDay(idx)}
                          size="small"
                          sx={{
                            color: "text.disabled",
                            borderRadius: "10px",
                            p: 0.4,
                            "&:hover": {
                              color: "#ef4444",
                              backgroundColor: "rgba(239,68,68,0.06)",
                            },
                          }}
                        >
                          <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      )}
                    </Box>
                    <Box
                      sx={{ display: "flex", flexDirection: "column", gap: 1 }}
                    >
                      <TextField
                        fullWidth
                        label="Date"
                        type="date"
                        value={day.date}
                        onChange={(e) => updateDay(idx, "date", e.target.value)}
                        InputLabelProps={{ shrink: true }}
                        sx={inputSx}
                        size="small"
                      />
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 1,
                        }}
                      >
                        <TextField
                          fullWidth
                          label="Start"
                          type="time"
                          value={day.from_time}
                          onChange={(e) =>
                            updateDay(idx, "from_time", e.target.value)
                          }
                          InputLabelProps={{ shrink: true }}
                          sx={inputSx}
                          size="small"
                        />
                        <TextField
                          fullWidth
                          label="End"
                          type="time"
                          value={day.to_time}
                          onChange={(e) =>
                            updateDay(idx, "to_time", e.target.value)
                          }
                          InputLabelProps={{ shrink: true }}
                          sx={inputSx}
                          size="small"
                        />
                      </Box>
                    </Box>
                  </Box>
                ))}
                <Box
                  onClick={addDay}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    py: 1,
                    borderRadius: "10px",
                    border: `1px dashed ${border}`,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: "rgba(53,53,53,0.35)",
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : HOVER_BG,
                    },
                  }}
                >
                  <AddOutlinedIcon
                    sx={{ fontSize: 15, color: "text.secondary" }}
                  />
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.secondary",
                    }}
                  >
                    Add another day
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Reason for rescheduling (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                sx={inputSx}
              />
            </Box>

            <Box
              sx={{
                mt: 2,
                p: 1.25,
                borderRadius: "10px",
                backgroundColor: isDark ? "rgba(139,92,246,0.06)" : "#f5f3ff",
                border: `1px solid ${isDark ? "rgba(139,92,246,0.2)" : "#e9d5ff"}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.75rem",
                  color: isDark ? "#a78bfa" : "#6d28d9",
                  lineHeight: 1.55,
                }}
              >
                Rescheduling will reset this request to{" "}
                <strong>Under Review</strong> so section heads can reassign
                staff for the new date. Previously assigned staff will be
                notified.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1.25, mt: 2.5 }}>
              <Button
                fullWidth
                onClick={handleClose}
                disabled={loading || validating}
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  borderRadius: "10px",
                  py: 1,
                  textTransform: "none",
                  border: `1px solid ${border}`,
                  color: "text.secondary",
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : HOVER_BG,
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handleValidate}
                disabled={!canSubmit || loading || validating}
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "10px",
                  py: 1,
                  textTransform: "none",
                  backgroundColor: "#212121",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#333" },
                  "&:disabled": {
                    backgroundColor: "rgba(33,33,33,0.35)",
                    color: "rgba(255,255,255,0.7)",
                  },
                }}
              >
                {validating ? (
                  <CircularProgress size={16} sx={{ color: "#fff" }} />
                ) : (
                  "Continue"
                )}
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────
function RequestDetailDialog({
  open,
  onClose,
  request,
  isDark,
  border,
  onCancelSuccess,
  onRescheduleSuccess,
}) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);

  if (!request) return null;

  const statusCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.Draft;
  const currentIdx = getStageIndex(request.status);
  const isDeclined = request.status === "Declined";
  const isCancelled = request.status === "Cancelled";
  const isMultiDay = !!(request.is_multiday && request.event_days?.length > 0);
  const showTeam = [
    "Assigned",
    "For Approval",
    "Approved",
    "On Going",
    "Completed",
  ].includes(request.status);
  const canCancel = CANCELLABLE_STATUSES.includes(request.status);
  const canReschedule = RESCHEDULABLE_STATUSES.includes(request.status);

  const teamBySection = {};
  if (showTeam) {
    (request.coverage_assignments || []).forEach((a) => {
      if (!a.staffer) return;
      const sec = a.staffer.section || a.section || "Unknown";
      if (!teamBySection[sec]) teamBySection[sec] = [];
      if (!teamBySection[sec].find((s) => s.id === a.staffer.id))
        teamBySection[sec].push(a.staffer);
    });
  }
  const teamSections = Object.keys(teamBySection);

  const coverageComponents = request.services
    ? Object.entries(request.services)
        .filter(([, pax]) => pax > 0)
        .map(([name, pax]) => ({ name, pax }))
    : [];

  const handleCancelConfirm = async (reason) => {
    setCancelLoading(true);
    try {
      await cancelRequest(request.id, reason);
      setCancelOpen(false);
      onCancelSuccess?.();
    } catch (err) {
      console.error("Cancel failed:", err);
      alert(err.message || "Failed to cancel the request. Please try again.");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRescheduleConfirm = async (newDatePayload, reason) => {
    setRescheduleLoading(true);
    try {
      await rescheduleRequest(request.id, newDatePayload, reason);
      setRescheduleOpen(false);
      onRescheduleSuccess?.();
    } catch (err) {
      console.error("Reschedule failed:", err);
      alert(
        err.message || "Failed to reschedule the request. Please try again.",
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "10px",
            maxHeight: "90vh",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 2.5,
                height: 28,
                borderRadius: "10px",
                backgroundColor: statusCfg.dot,
                flexShrink: 0,
              }}
            />
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  color: "text.primary",
                  lineHeight: 1.3,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {request.title}
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.7rem",
                  color: "text.secondary",
                  mt: 0.15,
                }}
              >
                {request.submitted_at
                  ? `Submitted ${new Date(request.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : "Date unknown"}
              </Typography>
            </Box>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              ml: 1.5,
              flexShrink: 0,
            }}
          >
            {(canReschedule || canCancel) && (
              <>
                <IconButton
                  onClick={(e) => setMenuAnchor(e.currentTarget)}
                  size="small"
                  sx={{
                    color: "text.secondary",
                    borderRadius: "10px",
                    "&:hover": {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : HOVER_BG,
                    },
                  }}
                >
                  <MoreVertIcon sx={{ fontSize: 17 }} />
                </IconButton>
                <Menu
                  anchorEl={menuAnchor}
                  open={Boolean(menuAnchor)}
                  onClose={() => setMenuAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 0.5,
                        borderRadius: "10px",
                        minWidth: 180,
                        border: `1px solid ${border}`,
                        boxShadow: isDark
                          ? "0 8px 24px rgba(0,0,0,0.5)"
                          : "0 4px 20px rgba(53,53,53,0.10)",
                      },
                    },
                  }}
                >
                  {canReschedule && (
                    <MenuItem
                      onClick={() => {
                        setMenuAnchor(null);
                        setRescheduleOpen(true);
                      }}
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.8rem",
                        py: 1,
                        gap: 0.5,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <EventRepeatOutlinedIcon
                          sx={{ fontSize: 16, color: "text.secondary" }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary="Reschedule"
                        primaryTypographyProps={{
                          fontFamily: dm,
                          fontSize: "0.8rem",
                          fontWeight: 500,
                        }}
                      />
                    </MenuItem>
                  )}
                  {canCancel && (
                    <MenuItem
                      onClick={() => {
                        setMenuAnchor(null);
                        setCancelOpen(true);
                      }}
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.8rem",
                        py: 1,
                        gap: 0.5,
                        color: "#ef4444",
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <CancelOutlinedIcon
                          sx={{ fontSize: 16, color: "#ef4444" }}
                        />
                      </ListItemIcon>
                      <ListItemText
                        primary="Cancel Request"
                        primaryTypographyProps={{
                          fontFamily: dm,
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          color: "#ef4444",
                        }}
                      />
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: "text.secondary",
                borderRadius: "10px",
                "&:hover": {
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 17 }} />
            </IconButton>
          </Box>
        </Box>

        <DialogContent sx={{ px: 3, py: 2.5, overflowY: "auto" }}>
          {/* Progress tracker */}
          {currentIdx >= 0 && !isDeclined && !isCancelled && (
            <Box
              sx={{
                mb: 3,
                p: 2,
                borderRadius: "10px",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(53,53,53,0.02)",
                border: `1px solid ${border}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  mb: 1.5,
                }}
              >
                Request Progress
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {PIPELINE_STAGES.map((stage, idx) => {
                  const done = idx < currentIdx;
                  const current = idx === currentIdx;
                  const isP2 = stage.phase === 2;
                  const { Icon } = stage;
                  let wrapBg, wrapBorder, wrapShadow, iconColor;
                  if (done) {
                    wrapBg = "#dcfce7";
                    wrapBorder = "transparent";
                    wrapShadow = "none";
                    iconColor = "#15803d";
                  } else if (current && !isP2) {
                    wrapBg = GOLD;
                    wrapBorder = "transparent";
                    wrapShadow = `0 0 0 3px ${GOLD_08}`;
                    iconColor = CHARCOAL;
                  } else if (current && isP2) {
                    wrapBg = "#dbeafe";
                    wrapBorder = "transparent";
                    wrapShadow = "0 0 0 3px rgba(59,130,246,0.15)";
                    iconColor = "#1d4ed8";
                  } else {
                    wrapBg = "transparent";
                    wrapBorder = isDark ? "#444" : "#d1d5db";
                    wrapShadow = "none";
                    iconColor = isDark ? "#555" : "#c4c4c4";
                  }
                  return (
                    <React.Fragment key={stage.key}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          flex: 1,
                          minWidth: 0,
                        }}
                      >
                        <Box sx={{ mb: 0.5 }}>
                          <Box
                            sx={{
                              width: 26,
                              height: 26,
                              borderRadius: "50%",
                              backgroundColor: wrapBg,
                              border: `1.5px solid ${wrapBorder}`,
                              boxShadow: wrapShadow,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <Icon sx={{ fontSize: 12, color: iconColor }} />
                          </Box>
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.6rem",
                            textAlign: "center",
                            fontWeight: current ? 700 : done ? 500 : 400,
                            color: done
                              ? "#15803d"
                              : current
                                ? "text.primary"
                                : "text.secondary",
                            lineHeight: 1.3,
                            px: 0.3,
                          }}
                        >
                          {stage.label}
                        </Typography>
                      </Box>
                      {idx < PIPELINE_STAGES.length - 1 && (
                        <Box
                          sx={{
                            height: "2px",
                            flex: 1,
                            mx: 0.5,
                            mb: 2.5,
                            borderRadius: 1,
                            backgroundColor:
                              idx < currentIdx
                                ? "#22c55e"
                                : isDark
                                  ? "#333"
                                  : "#e5e7eb",
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </Box>
            </Box>
          )}

          {isCancelled && (
            <Box
              sx={{
                mb: 3,
                px: 1.5,
                py: 1.25,
                borderRadius: "10px",
                backgroundColor: isDark ? "rgba(156,163,175,0.08)" : "#f9fafb",
                borderLeft: "2.5px solid #9ca3af",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "#6b7280",
                  lineHeight: 1.6,
                }}
              >
                This request was cancelled by you.
                {request.cancellation_reason
                  ? ` Reason: "${request.cancellation_reason}"`
                  : ""}
                {request.cancelled_at
                  ? ` · ${new Date(request.cancelled_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : ""}
              </Typography>
            </Box>
          )}

          {request.rescheduled_at && request.previous_event_date && (
            <Box
              sx={{
                mb: 3,
                px: 1.5,
                py: 1.25,
                borderRadius: "10px",
                backgroundColor: isDark ? "rgba(139,92,246,0.06)" : "#f5f3ff",
                borderLeft: "2.5px solid #8b5cf6",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  color: isDark ? "#a78bfa" : "#6d28d9",
                  lineHeight: 1.6,
                }}
              >
                Rescheduled from{" "}
                <strong>{fmtDate(request.previous_event_date)}</strong>
                {request.reschedule_reason
                  ? ` · "${request.reschedule_reason}"`
                  : ""}
              </Typography>
            </Box>
          )}

          {showTeam && teamSections.length > 0 && (
            <Section label="Coverage Team" border={border}>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {teamSections.map((sec) => {
                  const colors = SECTION_COLORS[sec] || {
                    bg: "#f3f4f6",
                    color: "#6b7280",
                  };
                  return (
                    <Box key={sec}>
                      <Box
                        sx={{
                          display: "inline-flex",
                          px: 1,
                          py: 0.2,
                          borderRadius: "10px",
                          backgroundColor: colors.bg,
                          mb: 1,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.64rem",
                            fontWeight: 700,
                            color: colors.color,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                          }}
                        >
                          {sec}
                        </Typography>
                      </Box>
                      <Box
                        sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}
                      >
                        {teamBySection[sec].map((staffer) => (
                          <Box
                            key={staffer.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                              px: 1,
                              py: 0.6,
                              borderRadius: "10px",
                              border: `1px solid ${border}`,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.02)"
                                : "rgba(53,53,53,0.02)",
                            }}
                          >
                            <Avatar
                              src={getAvatarUrl(staffer.avatar_url)}
                              sx={{
                                width: 22,
                                height: 22,
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                backgroundColor: colors.bg,
                                color: colors.color,
                              }}
                            >
                              {!getAvatarUrl(staffer.avatar_url) &&
                                getInitials(staffer.full_name)}
                            </Avatar>
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.78rem",
                                fontWeight: 500,
                                color: "text.primary",
                              }}
                            >
                              {staffer.full_name}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Section>
          )}

          <Section label="Event Information" border={border}>
            <InfoGrid
              rows={[
                ["Event Title", request.title],
                ["Description", request.description],
              ]}
            />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "130px 1fr",
                rowGap: 0.75,
                columnGap: 1.5,
                alignItems: "start",
                mt: 0.75,
              }}
            >
              {isMultiDay ? (
                <>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      pt: 0.3,
                    }}
                  >
                    Coverage Days
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    {request.event_days.map((day, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          px: 1,
                          py: 0.5,
                          borderRadius: "10px",
                          border: `1px solid ${border}`,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.02)"
                            : "#fafafa",
                        }}
                      >
                        <Box
                          sx={{
                            px: 0.9,
                            py: 0.2,
                            borderRadius: "10px",
                            backgroundColor: GOLD,
                            color: CHARCOAL,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            flexShrink: 0,
                            minWidth: 48,
                            textAlign: "center",
                          }}
                        >
                          {fmtDate(day.date, {
                            month: "short",
                            day: "numeric",
                          })}
                        </Box>
                        {day.from_time && day.to_time ? (
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.8rem",
                              color: "text.primary",
                            }}
                          >
                            {fmtTime(day.from_time)} – {fmtTime(day.to_time)}
                          </Typography>
                        ) : (
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.78rem",
                              color: "text.disabled",
                              fontStyle: "italic",
                            }}
                          >
                            No time set
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </>
              ) : (
                <>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                  >
                    Date
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.82rem",
                      color: "text.primary",
                      lineHeight: 1.55,
                    }}
                  >
                    {fmtDate(request.event_date)}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                  >
                    Time
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.82rem",
                      color: "text.primary",
                      lineHeight: 1.55,
                    }}
                  >
                    {request.from_time && request.to_time
                      ? `${fmtTime(request.from_time)} – ${fmtTime(request.to_time)}`
                      : "—"}
                  </Typography>
                </>
              )}
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                }}
              >
                Venue
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "text.primary",
                  lineHeight: 1.55,
                }}
              >
                {request.venue || "—"}
              </Typography>
            </Box>
          </Section>

          <Section label="Coverage Requirements" border={border}>
            {coverageComponents.length > 0 ? (
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                {coverageComponents.map((c, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      px: 1.25,
                      py: 0.4,
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
                        fontSize: "0.78rem",
                        color: "text.primary",
                      }}
                    >
                      {c.name}{" "}
                      <Box component="span" sx={{ color: "text.secondary" }}>
                        ×{c.pax}
                      </Box>
                    </Typography>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "text.secondary",
                }}
              >
                —
              </Typography>
            )}
          </Section>

          <Section label="Contact Details" border={border}>
            <InfoGrid
              rows={[
                ["Contact Person", request.contact_person || "—"],
                ["Contact Info", request.contact_info || "—"],
              ]}
            />
          </Section>

          <Section label="Attachment" border={border}>
            {request.file_url ? (
              <Box
                onClick={() => openFile(request.file_url)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  cursor: "pointer",
                  px: 1.25,
                  py: 0.6,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  transition: "border-color 0.15s",
                  "&:hover": { borderColor: GOLD },
                }}
              >
                <InsertDriveFileOutlinedIcon
                  sx={{ fontSize: 14, color: "text.secondary" }}
                />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    color: "text.primary",
                  }}
                >
                  {getFileName(request.file_url)}
                </Typography>
              </Box>
            ) : (
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "text.secondary",
                }}
              >
                No file attached
              </Typography>
            )}
          </Section>

          {request.status === "On Going" && (
            <Section label="Coverage Status" border={border}>
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderRadius: "10px",
                  backgroundColor: isDark ? "rgba(59,130,246,0.06)" : "#eff6ff",
                  borderLeft: "2.5px solid #3b82f6",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    color: "#1d4ed8",
                    lineHeight: 1.6,
                  }}
                >
                  Coverage is currently underway. Your assigned team has checked
                  in and is on location.
                </Typography>
              </Box>
            </Section>
          )}

          {request.status === "Completed" && (
            <Section label="Coverage Status" border={border}>
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderRadius: "10px",
                  backgroundColor: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4",
                  borderLeft: "2.5px solid #22c55e",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    color: "#15803d",
                    lineHeight: 1.6,
                  }}
                >
                  Coverage has been completed. Thank you for your request!
                </Typography>
              </Box>
            </Section>
          )}

          {request.status === "Approved" && request.admin_notes && (
            <Section label="Admin Notes" border={border}>
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: "10px",
                  backgroundColor: isDark ? "#0a1a0a" : "#f0fdf4",
                  borderLeft: "2.5px solid #22c55e",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    color: "#15803d",
                    lineHeight: 1.6,
                  }}
                >
                  {request.admin_notes}
                </Typography>
              </Box>
            </Section>
          )}

          {isDeclined && (
            <Section label="Decline Reason" border={border}>
              <Box
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: "10px",
                  backgroundColor: isDark ? "#1a0a0a" : "#fef2f2",
                  borderLeft: "2.5px solid #ef4444",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    color: "#dc2626",
                    lineHeight: 1.6,
                  }}
                >
                  {request.declined_reason || "No reason provided."}
                </Typography>
              </Box>
            </Section>
          )}

          {["Approved", "On Going", "Completed"].includes(request.status) && (
            <Section label="Approval" border={border}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                }}
              >
                <Box>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.72rem",
                      color: "text.secondary",
                    }}
                  >
                    Approved on
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.85rem",
                      color: "text.primary",
                      fontWeight: 600,
                      mt: 0.2,
                    }}
                  >
                    {request.approved_at
                      ? new Date(request.approved_at).toLocaleDateString(
                          "en-US",
                          { month: "long", day: "numeric", year: "numeric" },
                        )
                      : "—"}
                  </Typography>
                </Box>
                <Box
                  onClick={() =>
                    generateConfirmationPDF(request, teamBySection)
                  }
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.5,
                    py: 0.7,
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: `1px solid ${border}`,
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    color: "text.secondary",
                    flexShrink: 0,
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: "rgba(53,53,53,0.35)",
                      color: "text.primary",
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : HOVER_BG,
                    },
                  }}
                >
                  <DownloadOutlinedIcon sx={{ fontSize: 14 }} />
                  Download Confirmation
                </Box>
              </Box>
            </Section>
          )}
        </DialogContent>
      </Dialog>

      <CancelConfirmDialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onConfirm={handleCancelConfirm}
        loading={cancelLoading}
        isDark={isDark}
        border={border}
      />
      <RescheduleDialog
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        onConfirm={handleRescheduleConfirm}
        loading={rescheduleLoading}
        isDark={isDark}
        border={border}
        request={request}
      />
    </>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Section({ label, children, border }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.62rem",
          fontWeight: 700,
          color: "text.secondary",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          mb: 1,
          pb: 0.75,
          borderBottom: `1px solid ${border}`,
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function InfoGrid({ rows }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "130px 1fr",
        rowGap: 0.75,
        columnGap: 1.5,
        alignItems: "start",
      }}
    >
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.75rem",
              color: "text.secondary",
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              color: "text.primary",
              lineHeight: 1.55,
            }}
          >
            {value || "—"}
          </Typography>
        </React.Fragment>
      ))}
    </Box>
  );
}

function MetaCell({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography
        sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}
      >
        {children}
      </Typography>
    </Box>
  );
}

function Loader() {
  return (
    <Box sx={{ py: 10, display: "flex", justifyContent: "center" }}>
      <BrandedLoader size={44} inline />
    </Box>
  );
}
