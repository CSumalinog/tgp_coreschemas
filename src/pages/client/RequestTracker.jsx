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
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import EventRepeatOutlinedIcon from "@mui/icons-material/EventRepeatOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMoreOutlined";
import { useLocation } from "react-router-dom";

// G��G�� Tab icons G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import ListAltOutlinedIcon from "@mui/icons-material/ListAltOutlined";
import HourglassEmptyOutlinedIcon from "@mui/icons-material/HourglassEmptyOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

// G��G�� Pipeline stage icons G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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
import {
  CONTROL_RADIUS,
  FILTER_BUTTON_HEIGHT,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
  FILTER_SEARCH_FLEX,
  FILTER_SEARCH_MAX_WIDTH,
  FILTER_SEARCH_MIN_WIDTH,
  FILTER_STATUS_MIN_WIDTH,
  TABLE_FIRST_COL_FLEX,
  TABLE_FIRST_COL_MIN_WIDTH,
} from "../../utils/layoutTokens";
import ViewActionButton from "../../components/common/ViewActionButton";
import NumberBadge from "../../components/common/NumberBadge";
import { useClientRequests } from "../../hooks/useClientRequests";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import {
  generateConfirmationPDF,
  previewConfirmationPDF,
} from "../../utils/generateConfirmationPDF";
import BrandedLoader from "../../components/common/BrandedLoader";
import {
  cancelRequest,
  rescheduleRequest,
} from "../../services/coverageRequestService";
import CancelConfirmDialog from "../../components/client/CancelConfirmDialog";
import RescheduleDialog from "../../components/client/RescheduleDialog";

// G��G�� Helpers G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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
  if (!d) return "N/A";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
}

function buildEventDateDisplay(req) {
  if (!req) return "N/A";
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
    return sorted.length === 1 ? fmtDate(sorted[0].date) : `${first} - ${last}`;
  }
  return req.event_date
    ? new Date(req.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A";
}

// G��G�� Brand tokens G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

// G��G�� Constants G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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

// G��G�� Pipeline stages G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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

// G��G�� Tabs config G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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

// G��G�� Event Type Pill (mirrors AdminRequestManagement) G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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

// G��G�� Column menu GlobalStyles G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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
          fontSize: "1.5rem !important",
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

// G��G�� Root G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
export default function RequestTracker() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const location = useLocation();
  const [tab, setTab] = useState(() => resolveTrackerTab(location.state?.tab));
  const [searchText, setSearchText] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionErrorOpen, setActionErrorOpen] = useState(false);
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
  const handleActionError = (message) => {
    setActionError(message || "Something went wrong. Please try again.");
    setActionErrorOpen(true);
  };

  const viewCounts = useMemo(() => {
    const nonDraft = trackerRequests.filter((r) => r.status !== "Draft");
    return {
      pipeline: trackerRequests.filter((r) =>
        PIPELINE_ACTIVE_STATUSES.includes(r.status),
      ).length,
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
        backgroundColor: "transparent",
        fontFamily: dm,
      }}
    >
      <ColumnMenuStyles isDark={isDark} border={border} />

      <Snackbar
        open={actionErrorOpen}
        autoHideDuration={5000}
        onClose={() => setActionErrorOpen(false)}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={() => setActionErrorOpen(false)}
          severity="error"
          variant="filled"
          sx={{ fontFamily: dm, fontSize: "0.78rem" }}
        >
          {actionError}
        </Alert>
      </Snackbar>

      {/* G��G�� Header G��G�� */}
      <Box sx={{ mb: 2.5, flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 600,
            fontSize: "0.8rem",
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

      {/* G��G�� Filter row: Search | View | Export G��G�� */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: FILTER_ROW_GAP,
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <FormControl
          size="small"
          sx={{
            flexShrink: 0,
            minWidth: FILTER_SEARCH_MIN_WIDTH,
          }}
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
              height: FILTER_INPUT_HEIGHT,
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          />
        </FormControl>

        {/* View */}
        <FormControl size="small" sx={{ minWidth: FILTER_STATUS_MIN_WIDTH }}>
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
              height: FILTER_INPUT_HEIGHT,
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
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
        <Tooltip title="Export" arrow>
          <IconButton
            size="small"
            onClick={handleExportCsv}
            sx={{
              borderRadius: CONTROL_RADIUS,
              width: FILTER_BUTTON_HEIGHT,
              height: FILTER_BUTTON_HEIGHT,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              color: "text.secondary",
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
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
            <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {isPipeline && (
        <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <PipelineTab
            isDark={isDark}
            border={border}
            openRequestId={openRequestId}
            onActionError={handleActionError}
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
          onActionError={handleActionError}
        />
      )}
      {tab === 1 && (
        <PendingTab
          isDark={isDark}
          border={border}
          gridApiRef={gridApiRef}
          filterModel={externalFilterModel}
          openRequestId={openRequestId}
          onActionError={handleActionError}
        />
      )}
      {tab === 2 && (
        <ApprovedTab
          isDark={isDark}
          border={border}
          gridApiRef={gridApiRef}
          filterModel={externalFilterModel}
          openRequestId={openRequestId}
          onActionError={handleActionError}
        />
      )}
      {tab === 3 && (
        <DeclinedTab
          isDark={isDark}
          border={border}
          gridApiRef={gridApiRef}
          filterModel={externalFilterModel}
          openRequestId={openRequestId}
          onActionError={handleActionError}
        />
      )}
    </Box>
  );
}

// G��G�� Pipeline Tab G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
function PipelineTab({ isDark, border, openRequestId, onActionError }) {
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
        onActionError={onActionError}
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

// G��G�� Pipeline Card G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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

      let iconColor;
      if (done) {
        iconColor = "#15803d";
      } else if (current && !isP2) {
        iconColor = GOLD;
      } else if (current && isP2) {
        iconColor = "#1d4ed8";
      } else if (isP2 && currentPhase < 2) {
        iconColor = isDark ? "#555" : "#c4c4c4";
      } else {
        iconColor = isDark ? "#6b7280" : "#9ca3af";
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
            <Box sx={{ mb: 0.6, display: "flex", alignItems: "center" }}>
              <Icon
                sx={{
                  fontSize: 16,
                  color: iconColor,
                  transition: "color 0.2s",
                }}
              />
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
        boxShadow: isDark
          ? "0 1px 10px rgba(0,0,0,0.4)"
          : "0 1px 8px rgba(0,0,0,0.07)",
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
        {request.venue ? ` -+ ${request.venue}` : ""}
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

// G��G�� Grid Tabs G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
function RequestsGrid({
  rows,
  columns,
  border,
  isDark,
  gridApiRef,
  filterModel,
  loading,
}) {
  return (
    <Box
      sx={{
        flex: 1,
        minHeight: 0,
        width: "100%",
        overflowX: "auto",
        borderRadius: "10px",
        boxShadow: isDark
          ? "0 1px 10px rgba(0,0,0,0.4)"
          : "0 1px 8px rgba(0,0,0,0.07)",
      }}
    >
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
          loading={loading}
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

// G��G�� Row-level action menu cell G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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
              slotProps={{
                primary: {
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 500,
                },
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
              slotProps={{
                primary: {
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "#ef4444",
                },
              }}
            />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}

// G��G�� Shared grid columns hook G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
function useGridColumns(isDark, { onView, onReschedule, onCancel } = {}) {
  const titleCol = {
    field: "eventTitle",
    headerName: "Event Title",
    flex: TABLE_FIRST_COL_FLEX,
    minWidth: TABLE_FIRST_COL_MIN_WIDTH,
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

  // G��G�� Event Type column G�� mirrors AdminRequestManagement G��G��
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
    : "N/A",
  eventDate: buildEventDateDisplay(req),
  eventType: !!(req.is_multiday && req.event_days?.length > 0), // used by EventTypePill
  status: req.status,
  dateApproved: req.approved_at
    ? new Date(req.approved_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A",
  dateDeclined: req.declined_at
    ? new Date(req.declined_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "N/A",
  _raw: req,
});

function AllRequestsTab({
  isDark,
  border,
  gridApiRef,
  filterModel,
  openRequestId,
  onActionError,
}) {
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
      onActionError?.(
        err.message || "Failed to cancel the request. Please try again.",
      );
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
      onActionError?.(
        err.message || "Failed to reschedule the request. Please try again.",
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        loading={loading}
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
        onActionError={onActionError}
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

function PendingTab({
  isDark,
  border,
  gridApiRef,
  filterModel,
  openRequestId,
  onActionError,
}) {
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
      onActionError?.(
        err.message || "Failed to cancel the request. Please try again.",
      );
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
      onActionError?.(
        err.message || "Failed to reschedule the request. Please try again.",
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        loading={loading}
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
        onActionError={onActionError}
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

function ApprovedTab({
  isDark,
  border,
  gridApiRef,
  filterModel,
  openRequestId,
  onActionError,
}) {
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
      onActionError?.(
        err.message || "Failed to cancel the request. Please try again.",
      );
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
      onActionError?.(
        err.message || "Failed to reschedule the request. Please try again.",
      );
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        loading={loading}
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
        onActionError={onActionError}
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

function DeclinedTab({
  isDark,
  border,
  gridApiRef,
  filterModel,
  openRequestId,
  onActionError,
}) {
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

  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        loading={loading}
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
        onActionError={onActionError}
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

// G��G�� Detail Dialog G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
function RequestDetailDialog({
  open,
  onClose,
  request,
  isDark,
  border,
  onActionError,
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
      onActionError?.(
        err.message || "Failed to cancel the request. Please try again.",
      );
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
      onActionError?.(
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
        slotProps={{
          paper: {
            sx: {
              borderRadius: "10px",
              maxHeight: "90vh",
              backgroundColor: "background.paper",
              border: `1px solid ${border}`,
              boxShadow: isDark
                ? "0 24px 64px rgba(0,0,0,0.6)"
                : "0 8px 40px rgba(53,53,53,0.12)",
            },
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
                        slotProps={{
                          primary: {
                            fontFamily: dm,
                            fontSize: "0.8rem",
                            fontWeight: 500,
                          },
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
                        slotProps={{
                          primary: {
                            fontFamily: dm,
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            color: "#ef4444",
                          },
                        }}
                      />
                    </MenuItem>
                  )}
                </Menu>
              </>
            )}
            {["Approved", "On Going", "Completed"].includes(request.status) && (
              <>
                <Tooltip title="View Confirmation" placement="top">
                  <IconButton
                    size="small"
                    onClick={() =>
                      previewConfirmationPDF(request, teamBySection)
                    }
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
                    <OpenInNewOutlinedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Download Confirmation" placement="top">
                  <IconButton
                    size="small"
                    onClick={() =>
                      generateConfirmationPDF(request, teamBySection)
                    }
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
                    <DownloadOutlinedIcon sx={{ fontSize: 17 }} />
                  </IconButton>
                </Tooltip>
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
              <CloseIcon sx={{ fontSize: 16 }} />
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
                  let iconColor;
                  if (done) {
                    iconColor = "#15803d";
                  } else if (current && !isP2) {
                    iconColor = GOLD;
                  } else if (current && isP2) {
                    iconColor = "#1d4ed8";
                  } else {
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
                        <Box
                          sx={{
                            mb: 0.5,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <Icon sx={{ fontSize: 14, color: iconColor }} />
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
                  ? ` -+ ${new Date(request.cancelled_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
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
                  ? ` -+ "${request.reschedule_reason}"`
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
                            {fmtTime(day.from_time)} - {fmtTime(day.to_time)}
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
                      ? `${fmtTime(request.from_time)} - ${fmtTime(request.to_time)}`
                      : "N/A"}
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
                {request.venue || "N/A"}
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
                        +{c.pax}
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
                N/A
              </Typography>
            )}
          </Section>

          <Section label="Contact Details" border={border}>
            <InfoGrid
              rows={[
                ["Contact Person", request.contact_person || "N/A"],
                ["Contact Info", request.contact_info || "N/A"],
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
                      : "N/A"}
                  </Typography>
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

// G��G�� Shared components G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��G��
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
            {value || "N/A"}
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
