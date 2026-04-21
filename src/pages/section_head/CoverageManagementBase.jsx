// src/pages/section_head/CoverageManagementBase.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import ReactDOM from "react-dom";
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  DialogContent,
  Avatar,
  IconButton,
  Alert,
  Checkbox,
  useTheme,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  FormControl,
  Select,
  OutlinedInput,
  InputAdornment,
  Drawer,
  Tooltip,
  Snackbar,
  Divider,
  Radio,
  TextField,
  LinearProgress,
} from "@mui/material";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import {
  useSearchParams,
  useLocation,
  useNavigate,
  Link,
} from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMoreOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLessOutlined";
import ViewActionButton from "../../components/common/ViewActionButton";
import NumberBadge from "../../components/common/NumberBadge";
import { supabase } from "../../lib/supabaseClient";
import { pushSuccessToast } from "../../components/common/SuccessToast";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import BrandedLoader from "../../components/common/BrandedLoader";
import {
  notifyAdmins,
  notifySecHeads,
  notifySpecificStaff,
} from "../../services/NotificationService";
import { reassignAfterNoShow } from "../../services/ReassignmentService";
import {
  CONTROL_RADIUS,
  FILTER_BUTTON_HEIGHT,
  FILTER_CLIENT_MIN_WIDTH,
  FILTER_SEARCH_FLEX,
  FILTER_SEARCH_MAX_WIDTH,
  FILTER_SEARCH_MIN_WIDTH,
  FILTER_SEMESTER_MIN_WIDTH,
  FILTER_STATUS_MIN_WIDTH,
  MODAL_TAB_HEIGHT,
  TABLE_FIRST_COL_FLEX,
  TABLE_FIRST_COL_MIN_WIDTH,
  TABLE_USER_AVATAR_FONT_SIZE,
  TABLE_USER_AVATAR_SIZE,
} from "../../utils/layoutTokens";
import {
  RoleArchiveManagement,
  RoleTrashManagement,
} from "../common/request-management/RoleRequestManagement";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_18 = "rgba(245,197,43,0.18)";
const CHARCOAL = "#353535";
const RED = "#dc2626";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

// ── Avatar color palette ──────────────────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#EAF3DE", color: "#27500A" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#FBEAF0", color: "#72243E" },
  { bg: "#dbeafe", color: "#1e40af" },
];
const getAvatarColor = (id) => {
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

// ── Config ────────────────────────────────────────────────────────────────────
const SECTION_SERVICE_MAP = {
  News: "News Article",
  Photojournalism: "Photo Documentation",
  Videojournalism: "Video Documentation",
};

const SECTION_SERVICE_KEYS = {
  News: ["News Article"],
  Photojournalism: ["Photo Documentation"],
  Videojournalism: [
    "Video Documentation",
    "Camera Operator (for live streaming)",
  ],
};

const SECTION_PRIMARY_POSITIONS = {
  News: [
    "News Writer",
    "Feature Writer",
    "Sports Writer",
    "Opinion Writer",
    "Literary Writer",
  ],
  Photojournalism: ["Photojournalist"],
  Videojournalism: ["Videojournalist"],
};

const STATUS_CFG = {
  Forwarded: { dot: "#a855f7", color: "#7c3aed", bg: "#f5f3ff" },
  Assigned: { dot: "#f97316", color: "#c2410c", bg: "#fff7ed" },
  "For Approval": { dot: "#38bdf8", color: "#0369a1", bg: "#f0f9ff" },
  "On Going": { dot: "#3b82f6", color: "#1d4ed8", bg: "#eff6ff" },
  "Coverage Complete": { dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
  Approved: { dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
  Declined: { dot: "#ef4444", color: "#dc2626", bg: "#fef2f2" },
  "No-show": { dot: "#f59e0b", color: "#b45309", bg: "#fffbeb" },
  "No Show": { dot: "#ef4444", color: "#b91c1c", bg: "rgba(239,68,68,0.08)" },
  Completed: { dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
  Rectified: { dot: "#8b5cf6", color: "#6d28d9", bg: "rgba(139,92,246,0.08)" },
};

// View options — shows requests at different stages of the assignment workflow
const VIEW_OPTIONS = [
  { label: "All", key: "all" },
  { label: "For Assignment", key: "for-assignment" },
  { label: "For Approval", key: "for-approval" },
  { label: "Assigned", key: "assigned" },
  { label: "On Going", key: "on-going" },
  { label: "Completed", key: "completed" },
];

const getViewMeta = (key) =>
  VIEW_OPTIONS.find((option) => option.key === key) || VIEW_OPTIONS[0];

const getAvailableViewOptions = (allowedViews) =>
  VIEW_OPTIONS.filter((option) => allowedViews.includes(option.key));

const getPreferredView = (allowedViews, preferredView) => {
  if (preferredView && allowedViews.includes(preferredView))
    return preferredView;
  return getAvailableViewOptions(allowedViews)[0]?.key || VIEW_OPTIONS[0].key;
};

const VIEW_LABEL_BY_KEY = {
  all: "All",
  "for-assignment": "For Assignment",
  "for-approval": "For Approval",
  assigned: "Assigned",
  "on-going": "On Going",
  completed: "Completed",
};

const buildPendingAssignmentsKey = (userId, section) =>
  `section-head-pending-assignments:${userId}:${section || "none"}`;

// ── Helpers ───────────────────────────────────────────────────────────────────
const jsDateToDutyDay = (dateStr) => {
  if (!dateStr) return null;
  const day = new Date(dateStr + "T00:00:00").getDay();
  if (day === 0 || day === 6) return null;
  return day - 1;
};
const isWeekendDate = (dateStr) => {
  if (!dateStr) return false;
  const day = new Date(dateStr + "T00:00:00").getDay();
  return day === 0 || day === 6;
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
const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage
    .from("coverage-files")
    .getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};
const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};
const extractEmergencyProofPath = (reasonText) => {
  if (!reasonText) return null;
  const match = String(reasonText).match(/\(Proof:\s*([^)]+)\)\s*$/i);
  return match?.[1]?.trim() || null;
};
const extractEmergencyReasonText = (reasonText) => {
  const raw = String(reasonText || "").trim();
  if (!raw) return "Emergency announced";
  const withoutProof = raw.replace(/\(Proof:\s*([^)]+)\)\s*$/i, "").trim();
  return (
    withoutProof.replace(/^Emergency announced:\s*/i, "").trim() ||
    "Emergency announced"
  );
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
const isAssignmentCompleted = (assignment) =>
  assignment?.status === "Completed" || assignment?.status === "Rectified";
const isAssignmentOnGoing = (assignment) =>
  !["Cancelled", "No Show", "Completed", "Rectified"].includes(
    assignment?.status,
  ) &&
  (assignment?.status === "On Going" || !!assignment?.timed_in_at);
const fmtTime = (ts) => {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};
const fmtDateShort = (d) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};
const fmtTimeStr = (t) => {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
};
const fmtWeekday = (d) => {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
  });
};
const isAnnouncedEmergencyAssignment = (assignment) => {
  if (!assignment) return false;
  if (assignment.status !== "Cancelled") return false;
  const reason = String(assignment.cancellation_reason || "").toLowerCase();
  return reason.includes("emergency");
};
// Fires 10 minutes after the assignment's from_time on the event day.
// This aligns with the TimeIn modal window — if a staffer hasn't clocked in
// within 10 minutes of their scheduled start, they are considered a no-show.
const isUnannouncedNoShowCandidate = (assignment, currentSection, now) => {
  if (!assignment) return false;
  if (assignment.section !== currentSection) return false;
  if (assignment.timed_in_at) return false;
  if (!assignment.assignment_date) return false;
  if (
    ["Cancelled", "No Show", "Completed", "Rectified"].includes(
      assignment.status,
    )
  )
    return false;
  const fromTime = assignment.from_time || "00:00:00";
  const eventStart = new Date(`${assignment.assignment_date}T${fromTime}`);
  const threshold = new Date(eventStart.getTime() + 10 * 60 * 1000);
  return now >= threshold;
};

// ── Small shared UI pieces ────────────────────────────────────────────────────
function MetaCell({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.8rem",
          fontWeight: 500,
          color: "text.secondary",
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}

function StatusPill({ status, isDark }) {
  const cfg = STATUS_CFG[status] || {
    dot: "#9ca3af",
    color: "#6b7280",
    bg: "#f9fafb",
  };
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.55,
        px: 1.1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isDark ? `${cfg.dot}18` : cfg.bg,
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

// ── Avatar Stack with Portal Popover ─────────────────────────────────────────
const MAX_VISIBLE = 3;

function AvatarStackPopover({ staffers = [], isDark, border, renderExtra }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef(null);
  const hideTimer = useRef(null);

  const visible = staffers.slice(0, MAX_VISIBLE);
  const overflow = staffers.length - MAX_VISIBLE;

  const showPopover = useCallback(() => {
    clearTimeout(hideTimer.current);
    if (anchorRef.current) {
      const rect = anchorRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top + window.scrollY - 8,
        left: rect.left + window.scrollX,
      });
    }
    setOpen(true);
  }, []);

  const hidePopover = useCallback(() => {
    hideTimer.current = setTimeout(() => setOpen(false), 80);
  }, []);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  if (staffers.length === 0) {
    return (
      <Typography
        sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary" }}
      >
        —
      </Typography>
    );
  }

  const popoverContent =
    open &&
    ReactDOM.createPortal(
      <Box
        onMouseEnter={() => clearTimeout(hideTimer.current)}
        onMouseLeave={hidePopover}
        sx={{
          position: "absolute",
          top: coords.top,
          left: coords.left,
          transform: "translateY(-100%)",
          zIndex: 9999,
          minWidth: 220,
          maxWidth: 280,
          backgroundColor: isDark ? "#1e1e1e" : "#ffffff",
          border: `1px solid ${border}`,
          borderRadius: "10px",
          boxShadow: isDark
            ? "0 12px 40px rgba(0,0,0,0.55)"
            : "0 4px 20px rgba(53,53,53,0.14)",
          overflow: "hidden",
          pointerEvents: "auto",
        }}
      >
        <Box
          sx={{
            px: 1.75,
            py: 0.9,
            borderBottom: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(53,53,53,0.02)",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.62rem",
              fontWeight: 700,
              color: isDark ? "rgba(255,255,255,0.4)" : "rgba(53,53,53,0.45)",
              textTransform: "uppercase",
              letterSpacing: "0.09em",
            }}
          >
            Assigned staffers · {staffers.length}
          </Typography>
        </Box>
        {staffers.map((s, i) => {
          const url = getAvatarUrl(s.avatar_url);
          const clr = getAvatarColor(s.id);
          const extra = renderExtra ? renderExtra(s) : null;
          return (
            <Box
              key={s.id || i}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: 1.75,
                py: 0.85,
                borderBottom:
                  i < staffers.length - 1 ? `1px solid ${border}` : "none",
                "&:hover": {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(53,53,53,0.02)",
                },
              }}
            >
              <Avatar
                src={url || undefined}
                sx={{
                  width: TABLE_USER_AVATAR_SIZE,
                  height: TABLE_USER_AVATAR_SIZE,
                  fontSize: TABLE_USER_AVATAR_FONT_SIZE,
                  fontWeight: 500,
                  flexShrink: 0,
                  backgroundColor: clr.bg,
                  color: clr.color,
                }}
              >
                {!url && getInitials(s.full_name)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: isDark ? "rgba(255,255,255,0.9)" : CHARCOAL,
                    lineHeight: 1.3,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.full_name || "—"}
                </Typography>
                {(s.section || s.role) && (
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.67rem",
                      color: isDark
                        ? "rgba(255,255,255,0.4)"
                        : "rgba(53,53,53,0.5)",
                      lineHeight: 1.2,
                    }}
                  >
                    {s.section || s.role}
                  </Typography>
                )}
              </Box>
              {extra}
            </Box>
          );
        })}
      </Box>,
      document.body,
    );

  return (
    <Box
      ref={anchorRef}
      sx={{
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
      }}
      onMouseEnter={showPopover}
      onMouseLeave={hidePopover}
    >
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.35 }}>
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {visible.map((s, i) => {
            const url = getAvatarUrl(s.avatar_url);
            const clr = getAvatarColor(s.id);
            return (
              <Box
                key={s.id || i}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: `2px solid ${isDark ? "#1e1e1e" : "#ffffff"}`,
                  ml: i === 0 ? 0 : "-8px",
                  zIndex: MAX_VISIBLE - i,
                  position: "relative",
                  flexShrink: 0,
                  transition: "transform 0.15s",
                  "&:hover": {
                    transform: "translateY(-2px) scale(1.1)",
                    zIndex: 20,
                  },
                }}
              >
                <Avatar
                  src={url || undefined}
                  sx={{
                    width: "100%",
                    height: "100%",
                    fontSize: "0.6rem",
                    fontWeight: 500,
                    backgroundColor: clr.bg,
                    color: clr.color,
                  }}
                >
                  {!url && getInitials(s.full_name)}
                </Avatar>
              </Box>
            );
          })}
          {overflow > 0 && (
            <Box
              sx={{
                width: 28,
                height: 28,
                borderRadius: "50%",
                border: `2px solid ${isDark ? "#1e1e1e" : "#ffffff"}`,
                ml: "-8px",
                zIndex: 0,
                flexShrink: 0,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(53,53,53,0.07)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  lineHeight: 1,
                }}
              >
                +{overflow}
              </Typography>
            </Box>
          )}
        </Box>
        <ChevronRightIcon
          sx={{
            fontSize: 16,
            color: isDark ? "rgba(255,255,255,0.38)" : "rgba(53,53,53,0.42)",
            transform: open ? "translateX(1px)" : "none",
            transition: "transform 140ms ease, color 140ms ease",
          }}
        />
      </Box>
      {popoverContent}
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CoverageManagementBase({
  pageTitle = "Coverage Management",
  exportFileName = "coverage-management-export",
  settingsTitle = "Assignment Settings",
  defaultView = "for-assignment",
  allowedViews = VIEW_OPTIONS.map((option) => option.key),
  showHeader = false,
  compactTop = false,
  descriptions = {},
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;
  const location = useLocation();
  const navigate = useNavigate();
  const gridApiRef = useGridApiRef();
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";
  const availableViewOptions = useMemo(
    () => getAvailableViewOptions(allowedViews),
    [allowedViews],
  );
  const fallbackView = useMemo(
    () => getPreferredView(allowedViews, defaultView),
    [allowedViews, defaultView],
  );

  // ── View filter ──────────────────────────────────────────────────────────
  const [viewFilter, setViewFilter] = useState(() => {
    const incoming = location.state?.tab;
    return getPreferredView(allowedViews, incoming || defaultView);
  });

  useEffect(() => {
    const incoming = location.state?.tab;
    if (!incoming) {
      setViewFilter((prev) =>
        allowedViews.includes(prev) ? prev : fallbackView,
      );
      return;
    }
    const preferred = getPreferredView(allowedViews, incoming);
    setViewFilter((prev) => (prev === preferred ? prev : preferred));
  }, [location.state?.tab, allowedViews, defaultView, fallbackView]);

  const [currentUser, setCurrentUser] = useState(null);
  const [forAssignmentReqs, setForAssignmentReqs] = useState([]);
  const [forApprovalReqs, setForApprovalReqs] = useState([]);
  const [assignedReqs, setAssignedReqs] = useState([]);
  const [onGoingReqs, setOnGoingReqs] = useState([]);
  const [completedReqs, setCompletedReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");
  const [allStaffers, setAllStaffers] = useState([]);
  const [stafferFilter, setStafferFilter] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [semRange, setSemRange] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState(0);
  const hasBulkSelection = selectedRowIds.length > 1;

  const handleRowSelectionModelChange = useCallback((model) => {
    const ids = model?.ids instanceof Set ? [...model.ids] : [];
    setSelectedRowIds(ids);
  }, []);

  useEffect(() => {
    if (!hasBulkSelection) return;
    if (menuAnchor) {
      queueMicrotask(() => {
        setMenuAnchor(null);
        setMenuRow(null);
      });
    }
  }, [hasBulkSelection, menuAnchor]);

  // ── Assign dialog state ───────────────────────────────────────────────────
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignRequest, setAssignRequest] = useState(null);
  const [postAssignReview, setPostAssignReview] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState({});
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [dayStaffers, setDayStaffers] = useState({});
  const [daySelected, setDaySelected] = useState({});
  const [dayAssigned, setDayAssigned] = useState({});
  const [staffersLoading, setStaffersLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  // ── Reassign dialog state ──────────────────────────────────────────────────
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false);
  const [reassignRequest, setReassignRequest] = useState(null); // the request row
  const [reassignAssignment, setReassignAssignment] = useState(null); // the specific assignment to replace
  const [reassignStaffers, setReassignStaffers] = useState([]);
  const [reassignStaffersLoading, setReassignStaffersLoading] = useState(false);
  const [reassignSelectedId, setReassignSelectedId] = useState("");
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState("");
  const openedFromNotificationRef = useRef(null);
  // Tracks assignment IDs already processed for no-show auto-mark this session
  // to prevent re-processing after each loadAll() re-render cycle.
  const markedNoShowIds = useRef(new Set());

  // ── Rectification review state ─────────────────────────────────────────────
  const [rectifRequests, setRectifRequests] = useState([]);
  const [rectifDialogOpen, setRectifDialogOpen] = useState(false);
  const [rectifTarget, setRectifTarget] = useState(null); // single rectif_request being reviewed
  const [rectifReviewNote, setRectifReviewNote] = useState("");
  const [rectifReviewing, setRectifReviewing] = useState(false);
  const [rectifReviewError, setRectifReviewError] = useState("");

  const loadRectifRequests = useCallback(async () => {
    if (!currentUser?.section) return;
    const { data } = await supabase
      .from("rectification_requests")
      .select(
        `id, assignment_id, request_id, staff_id, reason, proof_path, status, created_at,
         staff:profiles!staff_id(id, full_name, avatar_url),
         request:coverage_requests!request_id(id, title)`,
      )
      .eq("section", currentUser.section)
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRectifRequests(data || []);
  }, [currentUser?.section]);

  useEffect(() => {
    loadRectifRequests();
  }, [loadRectifRequests]);

  const handleRectifDecision = useCallback(
    async (decision) => {
      if (!rectifTarget || !currentUser?.id) return;
      setRectifReviewing(true);
      setRectifReviewError("");
      try {
        const now = new Date().toISOString();
        // Update rectification_requests
        const { error: rErr } = await supabase
          .from("rectification_requests")
          .update({
            status: decision,
            reviewed_by: currentUser.id,
            reviewed_at: now,
            reviewer_note: rectifReviewNote.trim() || null,
          })
          .eq("id", rectifTarget.id);
        if (rErr) throw rErr;

        // If approved, mark the assignment as Rectified
        if (decision === "approved") {
          const { error: aErr } = await supabase
            .from("coverage_assignments")
            .update({ status: "Rectified" })
            .eq("id", rectifTarget.assignment_id);
          if (aErr) throw aErr;
        }

        // Notify staff member
        const msg =
          decision === "approved"
            ? `Your rectification request for "${rectifTarget.request?.title ?? "an assignment"}" was approved. The No Show mark has been removed.`
            : `Your rectification request for "${rectifTarget.request?.title ?? "an assignment"}" was rejected.${rectifReviewNote.trim() ? " Note: " + rectifReviewNote.trim() : ""}`;
        await notifySpecificStaff({
          staffIds: [rectifTarget.staff_id],
          type: "rectification_reviewed",
          title:
            decision === "approved"
              ? "Rectification Approved"
              : "Rectification Rejected",
          message: msg,
          requestId: rectifTarget.request_id,
          createdBy: currentUser.id,
          targetPath: "/my-assignment",
          targetPayload: { assignmentId: rectifTarget.assignment_id },
        });

        // Remove from local list
        setRectifRequests((prev) =>
          prev.filter((r) => r.id !== rectifTarget.id),
        );
        setRectifTarget(null);
        setRectifReviewNote("");
        pushSuccessToast(
          decision === "approved"
            ? "Rectification approved."
            : "Rectification rejected.",
        );
      } catch (err) {
        setRectifReviewError(err?.message ?? "Failed. Please try again.");
      } finally {
        setRectifReviewing(false);
      }
    },
    [rectifTarget, currentUser, rectifReviewNote],
  );
  const pendingAssignmentsKey = useMemo(
    () =>
      currentUser?.id
        ? buildPendingAssignmentsKey(currentUser.id, currentUser.section)
        : null,
    [currentUser?.id, currentUser?.section],
  );

  useEffect(() => {
    if (!pendingAssignmentsKey) {
      setPendingAssignments({});
      return;
    }
    try {
      const raw = window.localStorage.getItem(pendingAssignmentsKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setPendingAssignments(parsed && typeof parsed === "object" ? parsed : {});
    } catch {
      setPendingAssignments({});
    }
  }, [pendingAssignmentsKey]);

  useEffect(() => {
    if (!pendingAssignmentsKey) return;
    try {
      window.localStorage.setItem(
        pendingAssignmentsKey,
        JSON.stringify(pendingAssignments),
      );
    } catch {
      // no-op
    }
  }, [pendingAssignmentsKey, pendingAssignments]);

  const hasUnsavedModalChanges =
    assignDialogOpen &&
    Object.values(daySelected).some(
      (stafferIds) => Array.isArray(stafferIds) && stafferIds.length > 0,
    );

  useEffect(() => {
    if (!hasUnsavedModalChanges) return;
    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedModalChanges]);

  // ── Load user ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, section, division")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase
        .from("semesters")
        .select("id, name, start_date, end_date, is_active")
        .order("start_date", { ascending: false });
      setSemesters(data || []);
    }
    loadSemesters();
  }, []);

  useEffect(() => {
    if (!currentUser?.section) return;
    async function loadAllStaffers() {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url")
        .eq("division", currentUser.division)
        .eq("role", "staff")
        .eq("is_active", true);
      setAllStaffers(data || []);
    }
    loadAllStaffers();
  }, [currentUser]);

  useEffect(() => {
    if (!selectedSem || selectedSem === "all") {
      setSemRange(null);
      return;
    }
    const sem = semesters.find((s) => s.id === selectedSem);
    setSemRange(
      sem ? { start_date: sem.start_date, end_date: sem.end_date } : null,
    );
  }, [selectedSem, semesters]);

  // ── Load all requests ─────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!currentUser?.section) return;
    setLoading(true);
    setError("");
    try {
      const { data: hiddenStateRows, error: hiddenStateError } = await supabase
        .from("request_user_state")
        .select("request_id")
        .eq("user_id", currentUser.id);
      if (hiddenStateError) throw hiddenStateError;

      const hiddenRequestIds = (hiddenStateRows || []).map((r) => r.request_id);
      const applyHiddenFilter = (query) =>
        hiddenRequestIds.length > 0
          ? query.not("id", "in", `(${hiddenRequestIds.join(",")})`)
          : query;

      const baseSelect = `
        id, title, description, event_date, from_time, to_time,
        is_multiday, event_days, end_date,
        venue, services, status, contact_person, contact_info,
        file_url, forwarded_sections, submitted_sections, forwarded_at, submitted_at,
        client_type:client_types ( id, name ),
        entity:client_entities ( id, name ),
        coverage_assignments (
          id, status, assigned_to, section, service_key, timed_in_at, completed_at,
          cancellation_reason, cancelled_at, is_reassigned,
          assignment_date, from_time, to_time, selfie_url,
          staffer:profiles!assigned_to ( id, full_name, section, role, avatar_url )
        )
      `;

      const [allForwarded, forApproval, assigned, onGoing, completed] =
        await Promise.all([
          applyHiddenFilter(
            supabase
              .from("coverage_requests")
              .select(baseSelect)
              .eq("status", "Forwarded")
              .contains("forwarded_sections", [currentUser.section])
              .order("forwarded_at", { ascending: false }),
          ),
          applyHiddenFilter(
            supabase
              .from("coverage_requests")
              .select(baseSelect)
              .eq("status", "For Approval")
              .contains("forwarded_sections", [currentUser.section])
              .order("event_date", { ascending: true }),
          ),
          applyHiddenFilter(
            supabase
              .from("coverage_requests")
              .select(baseSelect)
              .in("status", ["Assigned", "Approved"])
              .contains("forwarded_sections", [currentUser.section])
              .order("event_date", { ascending: true }),
          ),
          applyHiddenFilter(
            supabase
              .from("coverage_requests")
              .select(baseSelect)
              .eq("status", "On Going")
              .contains("forwarded_sections", [currentUser.section])
              .order("event_date", { ascending: true }),
          ),
          applyHiddenFilter(
            supabase
              .from("coverage_requests")
              .select(baseSelect)
              .in("status", [
                "Coverage Complete",
                "Completed",
                "No-show",
                "Declined",
              ])
              .contains("forwarded_sections", [currentUser.section])
              .order("event_date", { ascending: false }),
          ),
        ]);

      if (
        allForwarded.error ||
        forApproval.error ||
        assigned.error ||
        onGoing.error ||
        completed.error
      )
        throw (
          allForwarded.error ||
          forApproval.error ||
          assigned.error ||
          onGoing.error ||
          completed.error
        );

      const mySection = currentUser.section;
      const forwardedData = allForwarded.data || [];
      const pendingRequestIds = new Set(Object.keys(pendingAssignments || {}));

      const forAssignRows = forwardedData.filter((req) => {
        if (req.status !== "Forwarded") return false;
        if (pendingRequestIds.has(req.id)) return false;
        if ((req.submitted_sections || []).includes(mySection)) return false;
        const myAssignments = (req.coverage_assignments || []).filter(
          (a) => a.section === mySection,
        );
        if (!req.is_multiday) return myAssignments.length === 0;
        const assignedDates = new Set(
          myAssignments.map((a) => a.assignment_date),
        );
        const allDates = (req.event_days || []).map((d) => d.date);
        return allDates.some((d) => !assignedDates.has(d));
      });

      // Derive section-level progress from assignment rows so stale request.status
      // does not keep completed coverage visible under "On Going".
      const assignedData = assigned.data || [];
      const onGoingData = onGoing.data || [];
      const completedData = completed.data || [];
      const sectionForApprovalMap = new Map();
      [...(forApproval.data || []), ...forwardedData].forEach((req) => {
        const myHasSubmitted = (req.submitted_sections || []).includes(
          mySection,
        );
        // Only show in "For Approval" if the request hasn't been acted on by
        // admin yet. Once status is Assigned/Approved/On Going/Completed the
        // request must leave this bucket regardless of submitted_sections.
        const adminNotActed = ![
          "Assigned",
          "Approved",
          "On Going",
          "Coverage Complete",
          "Completed",
          "No-show",
        ].includes(req.status);
        if (
          adminNotActed &&
          (req.status === "For Approval" || myHasSubmitted)
        ) {
          sectionForApprovalMap.set(req.id, req);
        }
      });
      const sectionForApprovalRows = Array.from(sectionForApprovalMap.values());
      const sectionForApprovalIds = new Set(
        sectionForApprovalRows.map((r) => r.id),
      );
      const allProgressRows = Array.from(
        new Map(
          [...assignedData, ...onGoingData, ...completedData].map((req) => [
            req.id,
            req,
          ]),
        ).values(),
      );
      const sectionAssignmentsOf = (req) =>
        (req.coverage_assignments || []).filter((a) => a.section === mySection);
      const isSectionCompleted = (req) => {
        // Exclude replaced/terminal rows — only active assignments count.
        const active = sectionAssignmentsOf(req).filter(
          (a) => !["Cancelled", "No Show"].includes(a.status),
        );
        return active.length > 0 && active.every(isAssignmentCompleted);
      };
      const isSectionOnGoing = (req) =>
        sectionAssignmentsOf(req)
          .filter((a) => !["Cancelled", "No Show"].includes(a.status))
          .some(isAssignmentOnGoing);

      const sectionCompletedRows = allProgressRows.filter(isSectionCompleted);
      const completedIds = new Set(sectionCompletedRows.map((r) => r.id));
      const sectionOnGoingRows = allProgressRows.filter(
        (req) => !completedIds.has(req.id) && isSectionOnGoing(req),
      );
      const onGoingIds = new Set(sectionOnGoingRows.map((r) => r.id));

      const cleanAssigned = assignedData.filter(
        (req) =>
          !onGoingIds.has(req.id) &&
          !completedIds.has(req.id) &&
          !sectionForApprovalIds.has(req.id),
      );
      const forwardedAssignedRows = forwardedData.filter((req) => {
        if ((req.submitted_sections || []).includes(mySection)) return false;
        const myAssignments = (req.coverage_assignments || []).filter(
          (a) => a.section === mySection,
        );
        return myAssignments.length > 0;
      });
      // Search for emergency-cancelled assignments across all fetched request statuses
      const emergencyCancelledRows = [
        ...assignedData,
        ...onGoingData,
        ...completedData,
      ].filter((req) =>
        (req.coverage_assignments || []).some(
          (a) => a.section === mySection && isAnnouncedEmergencyAssignment(a),
        ),
      );
      const pendingAssignedRows = forwardedData
        .filter((req) => pendingRequestIds.has(req.id))
        .map((req) => ({
          ...req,
          _pendingDraft: pendingAssignments[req.id],
          _sectionHeadView: "assigned",
        }));
      const mergedAssigned = Array.from(
        new Map(
          [
            ...cleanAssigned,
            ...forwardedAssignedRows,
            ...pendingAssignedRows,
            ...emergencyCancelledRows,
          ].map((req) => [req.id, req]),
        ).values(),
      );
      const mergedOnGoing = new Map();
      [...onGoingData, ...sectionOnGoingRows].forEach((r) => {
        if (completedIds.has(r.id)) return;
        mergedOnGoing.set(r.id, r);
      });
      const mergedCompleted = new Map();
      [...completedData, ...sectionCompletedRows].forEach((r) => {
        mergedCompleted.set(r.id, r);
      });

      setForAssignmentReqs(forAssignRows);
      setForApprovalReqs(sectionForApprovalRows);
      setAssignedReqs(mergedAssigned);
      setOnGoingReqs(Array.from(mergedOnGoing.values()));
      setCompletedReqs(Array.from(mergedCompleted.values()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser, pendingAssignments]);

  useEffect(() => {
    if (currentUser) loadAll();
  }, [currentUser, loadAll]);

  // Re-fetch when the user switches back to this tab — guards against stale
  // state when admin approves a request while the section head is away.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && currentUser) loadAll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [currentUser, loadAll]);

  // ── Auto-refresh every 60 s while on assigned/on-going tab ───────────────
  // Ensures no-show threshold crossings are detected without manual refresh.
  useEffect(() => {
    if (!["assigned", "on-going"].includes(viewFilter)) return;
    const interval = setInterval(() => {
      if (currentUser) loadAll();
    }, 60_000);
    return () => clearInterval(interval);
  }, [viewFilter, currentUser, loadAll]);

  // ── Auto-mark no-shows after 10-min grace period ─────────────────────────
  // Only runs on pages that include the "assigned" view (not Tracker/Time Record).
  // Uses markedNoShowIds ref to prevent re-processing the same assignment
  // across re-renders triggered by loadAll().
  useEffect(() => {
    if (!allowedViews.includes("assigned")) return;
    if (!currentUser?.section) return;
    const allReqs = [...assignedReqs, ...onGoingReqs];
    if (!allReqs.length) return;

    const now = new Date();
    const toMark = [];

    allReqs.forEach((req) => {
      (req.coverage_assignments || []).forEach((a) => {
        if (markedNoShowIds.current.has(a.id)) return;
        if (isUnannouncedNoShowCandidate(a, currentUser.section, now)) {
          toMark.push({ assignment: a, req });
        }
      });
    });

    if (!toMark.length) return;

    // Register IDs immediately to block concurrent effect runs
    toMark.forEach(({ assignment }) =>
      markedNoShowIds.current.add(assignment.id),
    );

    (async () => {
      for (const { assignment, req } of toMark) {
        const { error } = await supabase
          .from("coverage_assignments")
          .update({
            status: "No Show",
            cancellation_reason: "No Show",
            completed_at: now.toISOString(),
          })
          .eq("id", assignment.id)
          .eq("status", "Assigned"); // guard: only update if still Assigned
        if (!error) {
          await notifySpecificStaff({
            staffIds: [assignment.assigned_to],
            type: "assignment",
            title: "Marked as No Show",
            message: `You were marked as a No Show for "${req.title}" because check-in was not completed within 10 minutes of the scheduled start time.`,
            requestId: req.id,
            createdBy: currentUser.id,
          });
        }
      }
      // Refresh so "Reassign" button appears for the newly-marked assignments
      await loadAll();
    })();
  }, [assignedReqs, onGoingReqs, currentUser, allowedViews, loadAll]);

  useRealtimeNotify(
    "coverage_assignments",
    loadAll,
    currentUser?.section ? `section=eq.${currentUser.section}` : null,
    {
      title: "Assignment",
      toast: false,
      sound: false,
      tabFlash: false,
    },
  );
  // Re-fetch when admin changes coverage_request status (e.g. Approved).
  useRealtimeNotify("coverage_requests", loadAll, null, {
    title: "Request",
    toast: false,
    sound: false,
    tabFlash: false,
  });

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkArchive = async (ids) => {
    if (!currentUser?.id || !ids?.length) return;
    setError("");
    const ts = new Date().toISOString();
    const rows = ids.map((id) => ({
      user_id: currentUser.id,
      request_id: id,
      archived_at: ts,
      trashed_at: null,
      purged_at: null,
    }));
    const { error } = await supabase
      .from("request_user_state")
      .upsert(rows, { onConflict: "user_id,request_id" });
    if (error) {
      setError(error.message);
      return;
    }
    pushSuccessToast(`${ids.length} request(s) moved to archive.`);
    loadAll();
  };
  const handleBulkTrash = async (ids) => {
    if (!currentUser?.id || !ids?.length) return;
    setError("");
    const ts = new Date().toISOString();
    const rows = ids.map((id) => ({
      user_id: currentUser.id,
      request_id: id,
      archived_at: null,
      trashed_at: ts,
      purged_at: null,
    }));
    const { error } = await supabase
      .from("request_user_state")
      .upsert(rows, { onConflict: "user_id,request_id" });
    if (error) {
      setError(error.message);
      return;
    }
    pushSuccessToast(`${ids.length} request(s) moved to trash.`);
    loadAll();
  };
  const handleArchive = async (row) => {
    if (!currentUser?.id || !row?.id) return;
    setError("");
    const { error } = await supabase.from("request_user_state").upsert(
      {
        user_id: currentUser.id,
        request_id: row.id,
        archived_at: new Date().toISOString(),
        trashed_at: null,
        purged_at: null,
      },
      { onConflict: "user_id,request_id" },
    );
    if (error) {
      setError(error.message);
      return;
    }
    pushSuccessToast("Request moved to archive.");
    loadAll();
  };
  const handleTrash = async (row) => {
    if (!currentUser?.id || !row?.id) return;
    setError("");
    const { error } = await supabase.from("request_user_state").upsert(
      {
        user_id: currentUser.id,
        request_id: row.id,
        archived_at: null,
        trashed_at: new Date().toISOString(),
        purged_at: null,
      },
      { onConflict: "user_id,request_id" },
    );
    if (error) {
      setError(error.message);
      return;
    }
    pushSuccessToast("Request moved to trash.");
    loadAll();
  };

  // ── Filters ───────────────────────────────────────────────────────────────
  const applyFilters = useCallback(
    (reqs) => {
      let filtered = reqs;
      if (semRange) {
        const start = new Date(semRange.start_date);
        const end = new Date(semRange.end_date);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter((r) => {
          if (!r.event_date) return false;
          const d = new Date(r.event_date);
          return d >= start && d <= end;
        });
      }
      if (stafferFilter !== "all") {
        filtered = filtered.filter((r) =>
          (r.coverage_assignments || []).some(
            (a) =>
              a.assigned_to === stafferFilter &&
              a.section === currentUser?.section,
          ),
        );
      }
      return filtered;
    },
    [semRange, stafferFilter, currentUser],
  );

  const getViewSource = useCallback(
    (key) => {
      if (key === "all") {
        const merged = new Map();
        allowedViews
          .filter((viewKey) => viewKey !== "all")
          .forEach((viewKey) => {
            const rows = getViewSource(viewKey);
            rows.forEach((row) => {
              merged.set(`${viewKey}:${row.id}`, {
                ...row,
                _sectionHeadView: viewKey,
              });
            });
          });
        return Array.from(merged.values());
      }
      if (key === "for-assignment") return applyFilters(forAssignmentReqs);
      if (key === "for-approval") return applyFilters(forApprovalReqs);
      if (key === "assigned") return applyFilters(assignedReqs);
      if (key === "on-going") return applyFilters(onGoingReqs);
      if (key === "completed") return applyFilters(completedReqs);
      return [];
    },
    [
      allowedViews,
      applyFilters,
      forAssignmentReqs,
      forApprovalReqs,
      assignedReqs,
      onGoingReqs,
      completedReqs,
    ],
  );

  const getViewCount = useCallback(
    (key) => getViewSource(key).length,
    [getViewSource],
  );

  const filteredSource = useMemo(
    () => getViewSource(viewFilter),
    [viewFilter, getViewSource],
  );

  const isViewFiltered = viewFilter !== fallbackView;

  // ── External search filter for DataGrid ───────────────────────────────────
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
      fileName: exportFileName,
    });
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getPaxForSection = (request) => {
    if (!currentUser?.section || !request?.services) return "—";
    if (currentUser.section === "Videojournalism") {
      const videoPax = request.services["Video Documentation"] || 0;
      const cameraPax =
        request.services["Camera Operator (for live streaming)"] || 0;
      return videoPax + cameraPax || "—";
    }
    return request.services[SECTION_SERVICE_MAP[currentUser.section]] || "—";
  };

  // ── Staffer loading for assign dialog ────────────────────────────────────
  const loadStaffersForDate = useCallback(
    async (dateStr) => {
      if (!currentUser?.section || !dateStr) return;
      setStaffersLoading(true);
      try {
        const weekend = isWeekendDate(dateStr);
        const dutyDay = jsDateToDutyDay(dateStr);
        const primaryPositions =
          SECTION_PRIMARY_POSITIONS[currentUser.section] || [];

        const { data: allProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, section, role, position, avatar_url")
          .eq("division", currentUser.division)
          .eq("role", "staff")
          .eq("is_active", true);

        if (!allProfiles || allProfiles.length === 0) {
          setDayStaffers((prev) => ({
            ...prev,
            [dateStr]: { primary: [], others: [] },
          }));
          setStaffersLoading(false);
          return;
        }

        let eligibleProfiles = allProfiles;
        let isExpandedSearch = false;
        if (!weekend && dutyDay !== null) {
          const { data: semester } = await supabase
            .from("semesters")
            .select("id")
            .eq("is_active", true)
            .single();
          if (semester?.id) {
            // First try exact duty day match
            const { data: dutySchedules } = await supabase
              .from("duty_schedules")
              .select("staffer_id")
              .eq("semester_id", semester.id)
              .eq("duty_day", dutyDay);
            const eligibleIds = new Set(
              (dutySchedules || []).map((d) => d.staffer_id),
            );
            eligibleProfiles = allProfiles.filter((p) => eligibleIds.has(p.id));

            // If not enough options, expand to nearby duty days
            if (eligibleProfiles.length < 3) {
              isExpandedSearch = true;
              const dutyDaysToFetch = [dutyDay];
              if (dutyDay > 0) dutyDaysToFetch.push(dutyDay - 1);
              if (dutyDay < 4) dutyDaysToFetch.push(dutyDay + 1);

              const { data: nearbySchedules } = await supabase
                .from("duty_schedules")
                .select("staffer_id")
                .eq("semester_id", semester.id)
                .in("duty_day", dutyDaysToFetch);
              const expandedIds = new Set(
                (nearbySchedules || []).map((d) => d.staffer_id),
              );
              eligibleProfiles = allProfiles.filter((p) =>
                expandedIds.has(p.id),
              );
            }
          }
        }

        let assignmentCounts = {};
        if (eligibleProfiles.length > 0) {
          const ids = eligibleProfiles.map((p) => p.id);
          const { data: assignments } = await supabase
            .from("coverage_assignments")
            .select("assigned_to")
            .in("assigned_to", ids);
          (assignments || []).forEach((a) => {
            assignmentCounts[a.assigned_to] =
              (assignmentCounts[a.assigned_to] || 0) + 1;
          });
        }

        const withCounts = eligibleProfiles.map((p) => ({
          ...p,
          assignmentCount: assignmentCounts[p.id] || 0,
          isFromNearbyDay: isExpandedSearch,
        }));
        const primary = withCounts
          .filter((p) => primaryPositions.includes(p.position))
          .sort((a, b) => a.assignmentCount - b.assignmentCount);
        const others = withCounts
          .filter((p) => !primaryPositions.includes(p.position))
          .sort((a, b) => a.assignmentCount - b.assignmentCount);

        setDayStaffers((prev) => ({ ...prev, [dateStr]: { primary, others } }));
      } finally {
        setStaffersLoading(false);
      }
    },
    [currentUser],
  );

  const openAssignDialog = useCallback(
    async (req) => {
      setAssignError("");
      setAssignRequest(req);
      setSelectedDayIdx(0);
      const requestId = req._raw?.id || req.id;
      const draft = pendingAssignments[requestId];
      setDaySelected(draft?.daySelected || {});
      setDayStaffers({});
      setAssignDialogOpen(true);

      const isMultiDay = !!(req.is_multiday && req.event_days?.length > 0);
      const dates = isMultiDay
        ? req.event_days.map((d) => d.date)
        : [req.event_date];

      const { data: existing } = await supabase
        .from("coverage_assignments")
        .select(
          "assigned_to, assignment_date, staffer:profiles!assigned_to ( full_name, section )",
        )
        .eq("request_id", req._raw?.id || req.id)
        .eq("section", currentUser?.section);

      const byDate = {};
      dates.forEach((d) => {
        byDate[d] = [];
      });
      (existing || []).forEach((a) => {
        const key = a.assignment_date || dates[0];
        if (!byDate[key]) byDate[key] = [];

        // Multi-service assignments can create multiple rows for one staffer/day.
        // Keep one entry per staffer per date for UI state and selection gating.
        const alreadyTracked = byDate[key].some(
          (row) => row.assigned_to === a.assigned_to,
        );
        if (!alreadyTracked) byDate[key].push(a);
      });
      setDayAssigned(byDate);
      await loadStaffersForDate(dates[0]);
    },
    [loadStaffersForDate, currentUser?.section, pendingAssignments],
  );

  const handleSelectDay = useCallback(
    async (idx, req) => {
      setSelectedDayIdx(idx);
      const isMultiDay = !!(req.is_multiday && req.event_days?.length > 0);
      const dateStr = isMultiDay ? req.event_days[idx].date : req.event_date;
      if (!dayStaffers[dateStr]) await loadStaffersForDate(dateStr);
    },
    [dayStaffers, loadStaffersForDate],
  );

  useEffect(() => {
    const openRequestId = location.state?.openRequestId;
    if (!openRequestId || loading) return;
    if (openedFromNotificationRef.current === openRequestId) return;

    const sources = [
      ["for-assignment", forAssignmentReqs],
      ["for-approval", forApprovalReqs],
      ["assigned", assignedReqs],
      ["on-going", onGoingReqs],
      ["completed", completedReqs],
    ];

    const matchEntry = sources
      .map(([view, rows]) => [
        view,
        rows.find((request) => request.id === openRequestId),
      ])
      .find(([, request]) => !!request);

    if (!matchEntry) return;

    const [view, request] = matchEntry;
    openedFromNotificationRef.current = openRequestId;

    queueMicrotask(() => {
      setViewFilter(view);
      if (view === "for-assignment") {
        openAssignDialog(request);
      }
    });
  }, [
    location.state?.openRequestId,
    loading,
    forAssignmentReqs,
    forApprovalReqs,
    assignedReqs,
    onGoingReqs,
    completedReqs,
    openAssignDialog,
  ]);

  const getServiceKeysForAssignment = useCallback(
    (request) => {
      const section = currentUser?.section;
      const serviceKeys = SECTION_SERVICE_KEYS[section] || [];
      return serviceKeys.filter((key) => (request.services?.[key] || 0) > 0);
    },
    [currentUser],
  );

  const handleAssign = useCallback(async () => {
    if (!assignRequest || !currentUser) return;
    const req = assignRequest._raw || assignRequest;
    const isMultiDay = !!(req.is_multiday && req.event_days?.length > 0);

    const totalSelected = Object.values(daySelected).flat().length;
    const totalAlreadyAssigned = Object.values(dayAssigned).flat().length;

    if (totalSelected === 0 && totalAlreadyAssigned === 0) {
      setAssignError(
        "Please select at least one staffer for at least one day.",
      );
      return;
    }
    if (totalSelected === 0 && totalAlreadyAssigned > 0) {
      setAssignDialogOpen(false);
      await loadAll();
      setViewFilter("assigned");
      pushSuccessToast("Assignment already saved. Please submit for approval when ready.");
      return;
    }

    setAssignLoading(true);
    setAssignError("");
    try {
      const totalDays = isMultiDay ? req.event_days.length : 1;
      const previouslyCoveredDates = new Set(
        Object.entries(dayAssigned)
          .filter(([, assigned]) => (assigned || []).length > 0)
          .map(([date]) => date),
      );
      const newlyCoveredDates = new Set(
        Object.entries(daySelected)
          .filter(([, selected]) => (selected || []).length > 0)
          .map(([date]) => date),
      );
      const coveredDateCount = new Set([
        ...previouslyCoveredDates,
        ...newlyCoveredDates,
      ]).size;
      const mySectionFullyAssigned = isMultiDay
        ? coveredDateCount >= totalDays
        : coveredDateCount > 0;

      // Note: Nothing is persisted yet. We store a local pending draft and only
      // create coverage_assignments after final submit-for-approval confirmation.

      // Build staffers-by-day for the post-assign review dialog
      const staffersByDay = {};
      if (isMultiDay) {
        req.event_days.forEach((dayObj) => {
          const ids = daySelected[dayObj.date] || [];
          if (ids.length > 0) {
            const allForDay = [
              ...((dayStaffers[dayObj.date] || {}).primary || []),
              ...((dayStaffers[dayObj.date] || {}).others || []),
            ];
            staffersByDay[dayObj.date] = ids
              .map((id) => allForDay.find((s) => s.id === id))
              .filter(Boolean);
          }
        });
      } else {
        const dateStr = req.event_date;
        const ids = daySelected[dateStr] || [];
        const allForDay = [
          ...((dayStaffers[dateStr] || {}).primary || []),
          ...((dayStaffers[dateStr] || {}).others || []),
        ];
        staffersByDay[dateStr] = ids
          .map((id) => allForDay.find((s) => s.id === id))
          .filter(Boolean);
      }

      const hasPendingSelections = Object.values(daySelected).some(
        (stafferIds) => Array.isArray(stafferIds) && stafferIds.length > 0,
      );
      if (!hasPendingSelections) {
        setAssignError("No staffers selected.");
        setAssignLoading(false);
        return;
      }

      setPendingAssignments((prev) => ({
        ...prev,
        [req.id]: {
          requestId: req.id,
          isMultiDay,
          daySelected,
          staffersByDay,
          updatedAt: new Date().toISOString(),
        },
      }));

      setAssignDialogOpen(false);
      setPostAssignReview({
        requestId: req.id,
        title: req.title,
        isMultiDay,
        eventDate: req.event_date,
        eventDays: req.event_days || [],
        fromTime: req.from_time,
        toTime: req.to_time,
        staffersByDay,
        coveredDateCount,
        totalDays,
        mySectionFullyAssigned,
      });
      await loadAll();
      setViewFilter("assigned");
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignLoading(false);
    }
  }, [
    assignRequest,
    currentUser,
    daySelected,
    dayAssigned,
    dayStaffers,
    loadAll,
    setPendingAssignments,
  ]);

  const handleSubmitForApproval = async (requestId) => {
    setSubmitLoading(true);
    try {
      const { data: req } = await supabase
        .from("coverage_requests")
        .select(
          "title, forwarded_sections, submitted_sections, status, is_multiday, event_days, event_date, from_time, to_time, services",
        )
        .eq("id", requestId)
        .single();

      const pendingDraft = pendingAssignments[requestId];
      if (pendingDraft) {
        const rows = [];
        const serviceKeys = getServiceKeysForAssignment(req);

        const pushRowsForDay = (stafferIds, dateStr, fromTime, toTime) => {
          stafferIds.forEach((stafferId) => {
            if (serviceKeys.length === 0) {
              rows.push({
                request_id: requestId,
                assigned_to: stafferId,
                assigned_by: currentUser.id,
                section: currentUser.section,
                assignment_date: dateStr,
                from_time: fromTime,
                to_time: toTime,
              });
              return;
            }

            serviceKeys.forEach((serviceKey) => {
              rows.push({
                request_id: requestId,
                assigned_to: stafferId,
                assigned_by: currentUser.id,
                section: currentUser.section,
                service_key: serviceKey,
                assignment_date: dateStr,
                from_time: fromTime,
                to_time: toTime,
              });
            });
          });
        };

        if (req.is_multiday && req.event_days?.length > 0) {
          req.event_days.forEach((dayObj) => {
            const ids = pendingDraft.daySelected?.[dayObj.date] || [];
            if (ids.length > 0) {
              pushRowsForDay(
                ids,
                dayObj.date,
                dayObj.from_time,
                dayObj.to_time,
              );
            }
          });
        } else {
          const ids = pendingDraft.daySelected?.[req.event_date] || [];
          if (ids.length > 0) {
            pushRowsForDay(ids, req.event_date, req.from_time, req.to_time);
          }
        }

        if (rows.length === 0) {
          throw new Error("No pending staff selections found to submit.");
        }

        const { error: assignErr } = await supabase
          .from("coverage_assignments")
          .insert(rows);
        if (assignErr) throw assignErr;

        setPendingAssignments((prev) => {
          const next = { ...prev };
          delete next[requestId];
          return next;
        });
      }

      const alreadySubmitted = req.submitted_sections || [];
      const updatedSubmitted = alreadySubmitted.includes(currentUser.section)
        ? alreadySubmitted
        : [...alreadySubmitted, currentUser.section];

      const forwardedSections = req.forwarded_sections || [];
      const allSectionsSubmitted =
        forwardedSections.length > 0 &&
        forwardedSections.every((s) => updatedSubmitted.includes(s));
      const newStatus = allSectionsSubmitted ? "For Approval" : req.status;

      const { error } = await supabase
        .from("coverage_requests")
        .update({ submitted_sections: updatedSubmitted, status: newStatus })
        .eq("id", requestId);
      if (error) throw error;

      if (allSectionsSubmitted) {
        await notifyAdmins({
          type: "for_approval",
          title: "Assignment Ready for Approval",
          message: `All sections have submitted their staff assignments for "${req?.title || "a coverage request"}" — ready for your approval.`,
          requestId,
          createdBy: currentUser.id,
          targetPayload: {
            actorMode: "system_all_sections",
          },
        });
      }
      setConfirmRequest(null);
      setPostAssignReview(null);
      await loadAll();
      setViewFilter("for-approval");
      pushSuccessToast(
        allSectionsSubmitted
          ? "Submitted for approval. All sections are complete and the request is now queued for admin review."
          : "Submission saved for your section. Other sections still need to submit their assignments.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Reassign handlers ─────────────────────────────────────────────────────
  const openReassignDialog = useCallback(
    async (req, assignment) => {
      setReassignError("");
      setReassignSelectedId("");
      setReassignRequest(req);
      setReassignAssignment(assignment);
      setReassignStaffers([]);
      setReassignDialogOpen(true);

      const dateStr = assignment.assignment_date || req.event_date;
      if (!dateStr) return;

      setReassignStaffersLoading(true);
      try {
        const weekend = isWeekendDate(dateStr);
        const dutyDay = jsDateToDutyDay(dateStr);
        const isEmergencyReassignment =
          isAnnouncedEmergencyAssignment(assignment);
        const primaryPositions =
          SECTION_PRIMARY_POSITIONS[currentUser?.section] || [];

        const { data: allProfiles } = await supabase
          .from("profiles")
          .select(
            "id, full_name, section, division, role, position, avatar_url",
          )
          .eq("role", "staff")
          .eq("is_active", true);

        if (!allProfiles || allProfiles.length === 0) {
          setReassignStaffers([]);
          return;
        }

        const sameDivisionProfiles = allProfiles.filter(
          (profile) => profile.division === currentUser.division,
        );
        const crossDivisionProfiles = allProfiles.filter(
          (profile) =>
            profile.division && profile.division !== currentUser.division,
        );

        let exactDutyIds = null;
        let nearbyDutyIds = null;
        if (!weekend && dutyDay !== null) {
          const { data: semester } = await supabase
            .from("semesters")
            .select("id")
            .eq("is_active", true)
            .single();
          if (semester?.id) {
            const { data: exactSchedules } = await supabase
              .from("duty_schedules")
              .select("staffer_id")
              .eq("semester_id", semester.id)
              .eq("duty_day", dutyDay);
            exactDutyIds = new Set(
              (exactSchedules || []).map((schedule) => schedule.staffer_id),
            );

            const nearbyDutyDays = [dutyDay];
            if (dutyDay > 0) nearbyDutyDays.push(dutyDay - 1);
            if (dutyDay < 4) nearbyDutyDays.push(dutyDay + 1);
            const { data: nearbySchedules } = await supabase
              .from("duty_schedules")
              .select("staffer_id")
              .eq("semester_id", semester.id)
              .in("duty_day", nearbyDutyDays);
            nearbyDutyIds = new Set(
              (nearbySchedules || []).map((schedule) => schedule.staffer_id),
            );
          }
        }

        const decorateCandidates = async (
          profiles,
          { isCrossDivision = false, useNearbyBadge = false } = {},
        ) => {
          let pool = profiles.filter(
            (profile) => profile.id !== assignment.assigned_to,
          );
          if (exactDutyIds && !useNearbyBadge) {
            pool = pool.filter((profile) => exactDutyIds.has(profile.id));
          }
          if (nearbyDutyIds && useNearbyBadge) {
            pool = pool.filter((profile) => nearbyDutyIds.has(profile.id));
          }

          const ids = pool.map((profile) => profile.id);
          const assignmentCounts = {};
          const conflictIds = new Set();
          if (ids.length > 0) {
            const { data: assignments } = await supabase
              .from("coverage_assignments")
              .select("assigned_to, assignment_date")
              .in("assigned_to", ids);
            (assignments || []).forEach((assigned) => {
              assignmentCounts[assigned.assigned_to] =
                (assignmentCounts[assigned.assigned_to] || 0) + 1;
              if (assigned.assignment_date === dateStr) {
                conflictIds.add(assigned.assigned_to);
              }
            });
          }

          return pool
            .map((profile) => ({
              ...profile,
              assignmentCount: assignmentCounts[profile.id] || 0,
              hasConflict: conflictIds.has(profile.id),
              isCrossDivision,
              isFromNearbyDay: !!(
                useNearbyBadge &&
                nearbyDutyIds &&
                !exactDutyIds?.has(profile.id)
              ),
            }))
            .sort((a, b) => {
              if (a.hasConflict !== b.hasConflict) {
                return a.hasConflict ? 1 : -1;
              }
              return a.assignmentCount - b.assignmentCount;
            });
        };

        const getSelectableCount = (profiles) =>
          profiles.filter((profile) => !profile.hasConflict).length;

        let withMeta = await decorateCandidates(sameDivisionProfiles);
        if (getSelectableCount(withMeta) < 2) {
          const nearbySameDivision = await decorateCandidates(
            sameDivisionProfiles,
            {
              useNearbyBadge: true,
            },
          );
          if (
            getSelectableCount(nearbySameDivision) > 0 ||
            withMeta.length === 0
          ) {
            withMeta = nearbySameDivision;
          }
        }

        if (isEmergencyReassignment && getSelectableCount(withMeta) === 0) {
          const crossDivisionFallback = await decorateCandidates(
            crossDivisionProfiles,
            {
              isCrossDivision: true,
              useNearbyBadge: !!nearbyDutyIds,
            },
          );
          if (crossDivisionFallback.length > 0) {
            withMeta = crossDivisionFallback;
          }
        }

        const primary = withMeta.filter((p) =>
          primaryPositions.includes(p.position),
        );
        const others = withMeta.filter(
          (p) => !primaryPositions.includes(p.position),
        );
        setReassignStaffers([...primary, ...others]);
      } finally {
        setReassignStaffersLoading(false);
      }
    },
    [currentUser],
  );

  const handleReassign = useCallback(async () => {
    if (
      !reassignAssignment ||
      !reassignSelectedId ||
      !currentUser ||
      reassigning
    )
      return;
    setReassigning(true);
    setReassignError("");
    try {
      const isAnnouncedEmergency =
        isAnnouncedEmergencyAssignment(reassignAssignment);
      const selectedStaffer = reassignStaffers.find(
        (staffer) => staffer.id === reassignSelectedId,
      );
      const isCrossDivisionEmergency =
        isAnnouncedEmergency && !!selectedStaffer?.isCrossDivision;
      const reason = isAnnouncedEmergency ? undefined : "No Show";
      const result = await reassignAfterNoShow({
        requestId: reassignAssignment.request_id,
        assignmentId: reassignAssignment.id,
        newStaffId: reassignSelectedId,
        section: currentUser.section,
        assignedBy: currentUser.id,
        triggerType: isAnnouncedEmergency
          ? "announced-emergency"
          : "unannounced-no-show",
        reason,
      });
      if (result?.error) throw result.error;

      if (isCrossDivisionEmergency) {
        await notifyAdmins({
          type: "cross_division_emergency_reassignment",
          title: "Cross-Division Emergency Reassignment",
          message: `${currentUser.full_name} reassigned "${reassignRequest?.title || "a coverage request"}" to ${selectedStaffer?.full_name || "a replacement staffer"} from ${selectedStaffer?.division || "another division"} because no same-division replacement was available.`,
          requestId: reassignAssignment.request_id,
          createdBy: currentUser.id,
          targetPayload: {
            replacementStaffId: selectedStaffer?.id,
            replacementSection: selectedStaffer?.section || null,
            replacementDivision: selectedStaffer?.division || null,
            sourceDivision: currentUser.division || null,
            actorMode: "cross_division_emergency",
          },
        });
      }

      await notifySecHeads({
        sections: reassignRequest?.forwarded_sections?.length
          ? reassignRequest.forwarded_sections
          : [reassignAssignment.section || currentUser.section],
        type: "reassignment_triggered",
        title: "Reassignment Triggered",
        message: `A reassignment was applied for "${reassignRequest?.title || "a coverage request"}".`,
        requestId: reassignAssignment.request_id,
        createdBy: currentUser.id,
      });

      // Notify the new staffer
      await notifySpecificStaff({
        staffIds: [reassignSelectedId],
        type: "assignment",
        title: "New Assignment",
        message: `You have been assigned as a replacement for "${reassignRequest?.title || "a coverage request"}".`,
        requestId: reassignAssignment.request_id,
        createdBy: currentUser.id,
      });

      // Notify the original staffer
      if (reassignAssignment.assigned_to) {
        await notifySpecificStaff({
          staffIds: [reassignAssignment.assigned_to],
          type: "assignment",
          title: "Assignment Reassigned",
          message: `Your assignment for "${reassignRequest?.title || "a coverage request"}" has been reassigned to another staffer.`,
          requestId: reassignAssignment.request_id,
          createdBy: currentUser.id,
        });
      }

      setReassignDialogOpen(false);
      setReassignAssignment(null);
      setReassignRequest(null);
      setReassignSelectedId("");
      await loadAll();
      pushSuccessToast(
        isAnnouncedEmergency
          ? isCrossDivisionEmergency
            ? "Emergency replacement assigned across divisions. Admins were notified."
            : "Emergency replacement assigned successfully."
          : "No-show replacement assigned successfully.",
      );
    } catch (err) {
      setReassignError(err.message || "Reassignment failed.");
    } finally {
      setReassigning(false);
    }
  }, [
    reassignAssignment,
    reassignRequest,
    reassignSelectedId,
    reassignStaffers,
    reassigning,
    currentUser,
    loadAll,
  ]);

  // ── Row builder ───────────────────────────────────────────────────────────
  const buildRows = (source) =>
    source.map((req) => {
      const rowView = req._sectionHeadView || viewFilter;
      const pendingDraft = req._pendingDraft || pendingAssignments[req.id];
      const sectionAssignments = (req.coverage_assignments || []).filter(
        (a) => a.section === currentUser?.section,
      );
      const now = new Date();
      const emergencyAssignment = (req.coverage_assignments || []).find(
        (a) =>
          a.section === currentUser?.section &&
          isAnnouncedEmergencyAssignment(a),
      );
      const noShowCandidate = (req.coverage_assignments || []).find((a) =>
        isUnannouncedNoShowCandidate(a, currentUser?.section, now),
      );
      const reassignmentCandidate = emergencyAssignment || noShowCandidate;
      const reassignmentType = emergencyAssignment
        ? "emergency"
        : noShowCandidate
          ? "no-show"
          : null;
      const myAssignments =
        rowView === "on-going"
          ? sectionAssignments.filter(isAssignmentOnGoing)
          : rowView === "completed"
            ? sectionAssignments.filter(isAssignmentCompleted)
            : sectionAssignments;
      const seen = new Set();
      const uniqueStaffers = myAssignments
        .filter((a) => {
          if (seen.has(a.assigned_to)) return false;
          seen.add(a.assigned_to);
          return true;
        })
        .map((a) => ({
          ...a.staffer,
          id: a.assigned_to,
          timed_in_at: a.timed_in_at,
          completed_at: a.completed_at,
          selfie_url: a.selfie_url,
        }));

      if (uniqueStaffers.length === 0 && pendingDraft?.staffersByDay) {
        const pendingSeen = new Set();
        Object.values(pendingDraft.staffersByDay).forEach((staffers) => {
          (staffers || []).forEach((s) => {
            if (!s?.id || pendingSeen.has(s.id)) return;
            pendingSeen.add(s.id);
            uniqueStaffers.push({
              id: s.id,
              full_name: s.full_name,
              avatar_url: s.avatar_url,
              section: s.section,
            });
          });
        });
      }

      const isMultiDay = !!(req.is_multiday && req.event_days?.length > 0);
      const assignedDates = new Set(
        sectionAssignments.map((a) => a.assignment_date),
      );
      if (pendingDraft?.daySelected) {
        Object.entries(pendingDraft.daySelected).forEach(([date, ids]) => {
          if (Array.isArray(ids) && ids.length > 0) assignedDates.add(date);
        });
      }
      const totalDays = isMultiDay ? req.event_days?.length || 1 : 1;
      const assignedDayCount = isMultiDay
        ? (req.event_days || []).filter((d) => assignedDates.has(d.date)).length
        : sectionAssignments.length > 0
          ? 1
          : pendingDraft?.daySelected?.[req.event_date]?.length > 0
            ? 1
            : 0;

      const hasPendingAssignments = Object.values(
        pendingDraft?.daySelected || {},
      ).some((ids) => Array.isArray(ids) && ids.length > 0);

      return {
        id: req.id,
        title: req.title,
        client: req.entity?.name || "—",
        eventDate:
          isMultiDay && req.event_days?.length > 0
            ? `${fmtDateShort(req.event_days[0].date)} – ${fmtDateShort(req.event_days[req.event_days.length - 1].date)}`
            : req.event_date
              ? new Date(req.event_date + "T00:00:00").toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )
              : "—",
        eventType: isMultiDay,
        pax: getPaxForSection(req),
        forwarded: req.forwarded_at
          ? new Date(req.forwarded_at).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })
          : "—",
        status: req.status,
        staffers: uniqueStaffers,
        myHasSubmitted: (req.submitted_sections || []).includes(
          currentUser?.section,
        ),
        myHasAssignments:
          sectionAssignments.length > 0 || hasPendingAssignments,
        myDone: assignedDayCount >= totalDays,
        myPartial: assignedDayCount > 0 && assignedDayCount < totalDays,
        assignedDayCount,
        totalDays,
        venue: req.venue || "—",
        assignments: req.coverage_assignments || [],
        reassignmentCandidate,
        reassignmentType,
        needsReassignment: !!reassignmentCandidate,
        rowView,
        stageLabel: VIEW_LABEL_BY_KEY[rowView] || req.status,
        _raw: req,
      };
    });

  // ── Column definitions ────────────────────────────────────────────────────
  const titleCol = {
    field: "title",
    headerName: "Event Title",
    flex: TABLE_FIRST_COL_FLEX,
    minWidth: TABLE_FIRST_COL_MIN_WIDTH,
    renderCell: (p) => (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.7,
          width: "100%",
          height: "100%",
          minWidth: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            fontWeight: 500,
            color: isDark ? "#f5f5f5" : "#1a1a1a",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            flex: 1,
          }}
        >
          {p.value}
        </Typography>
        {p.row?.needsReassignment && (
          <Tooltip
            title={
              p.row?.reassignmentType === "emergency"
                ? "Announced emergency"
                : "Unannounced no-show"
            }
            placement="top"
            arrow
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: "999px",
                flexShrink: 0,
                backgroundColor:
                  p.row?.reassignmentType === "emergency"
                    ? "#dc2626"
                    : "#d97706",
                boxShadow:
                  p.row?.reassignmentType === "emergency"
                    ? "0 0 0 2px rgba(220,38,38,0.18)"
                    : "0 0 0 2px rgba(217,119,6,0.18)",
              }}
            />
          </Tooltip>
        )}
      </Box>
    ),
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
  const eventDateCol = {
    field: "eventDate",
    headerName: "Event Date",
    flex: 1.1,
    minWidth: 150,
    renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
  };
  const paxCol = {
    field: "pax",
    headerName: "Pax",
    flex: 0.55,
    minWidth: 70,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Box
          sx={{
            px: 1.1,
            py: 0.3,
            borderRadius: "10px",
            backgroundColor: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.68rem",
              fontWeight: 600,
              color: "#1d4ed8",
            }}
          >
            {p.value} pax
          </Typography>
        </Box>
      </Box>
    ),
  };

  const statusCol = {
    field: "stageLabel",
    headerName: "Status",
    flex: 0.8,
    minWidth: 140,
    sortable: false,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <StatusPill status={p.value} isDark={isDark} />
      </Box>
    ),
  };

  const staffersCol = {
    field: "staffers",
    headerName: "Staffers",
    flex: 0.65,
    minWidth: 80,
    sortable: false,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <AvatarStackPopover
          staffers={p.value}
          isDark={isDark}
          border={border}
        />
      </Box>
    ),
  };

  const onGoingStaffersCol = {
    field: "staffers",
    headerName: "Staffers On-Site",
    flex: 1.4,
    minWidth: 180,
    sortable: false,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <AvatarStackPopover
          staffers={p.value}
          isDark={isDark}
          border={border}
          renderExtra={(s) => {
            const timeIn = fmtTime(s.timed_in_at);
            return timeIn ? (
              <Box
                sx={{
                  px: 0.8,
                  py: 0.2,
                  borderRadius: "5px",
                  backgroundColor: isDark ? "rgba(59,130,246,0.12)" : "#eff6ff",
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.64rem",
                    fontWeight: 600,
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
                  py: 0.2,
                  borderRadius: "5px",
                  backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "#fffbeb",
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.64rem",
                    fontWeight: 600,
                    color: "#b45309",
                  }}
                >
                  Not yet
                </Typography>
              </Box>
            );
          }}
        />
      </Box>
    ),
  };

  const completedStaffersCol = {
    field: "staffers",
    headerName: "Staffers",
    flex: 0.65,
    minWidth: 80,
    sortable: false,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <AvatarStackPopover
          staffers={p.value}
          isDark={isDark}
          border={border}
          renderExtra={(s) => {
            const duration = computeDuration(s.timed_in_at, s.completed_at);
            return duration ? (
              <Box
                sx={{
                  px: 0.8,
                  py: 0.2,
                  borderRadius: "5px",
                  backgroundColor: isDark
                    ? "rgba(245,197,43,0.1)"
                    : "rgba(245,197,43,0.12)",
                  border: "1px solid rgba(245,197,43,0.3)",
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.64rem",
                    fontWeight: 700,
                    color: "#b45309",
                  }}
                >
                  {duration}
                </Typography>
              </Box>
            ) : null;
          }}
        />
      </Box>
    ),
  };

  const actionCol = {
    field: "actions",
    headerName: "",
    flex: 0.95,
    minWidth: 130,
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
        {(viewFilter === "for-assignment" ||
          p.row?.rowView === "for-assignment") &&
          !hasBulkSelection && (
            <ViewActionButton
              onClick={(e) => {
                e.stopPropagation();
                openAssignDialog(p.row);
              }}
            >
              {p.row?.myPartial
                ? `Assign (${p.row?.assignedDayCount}/${p.row?.totalDays})`
                : "Assign"}
            </ViewActionButton>
          )}
        {(viewFilter === "assigned" || p.row?.rowView === "assigned") &&
          !hasBulkSelection &&
          p.row?.myHasAssignments &&
          !p.row?.myHasSubmitted && (
            <ViewActionButton
              onClick={(e) => {
                e.stopPropagation();
                setConfirmRequest(p.row);
              }}
            >
              Submit
            </ViewActionButton>
          )}
        {(viewFilter === "completed" || p.row?.rowView === "completed") &&
          !hasBulkSelection &&
          p.row?.staffers?.length > 0 && (
            <ViewActionButton
              onClick={(e) => {
                e.stopPropagation();
                navigate("/sec_head/coverage-management/time-record", {
                  state: { highlightRequestId: p.row.id },
                });
              }}
            >
              View CTR
            </ViewActionButton>
          )}
        {(() => {
          const inReassignView =
            viewFilter === "on-going" ||
            p.row?.rowView === "on-going" ||
            viewFilter === "assigned" ||
            p.row?.rowView === "assigned";
          if (!inReassignView || hasBulkSelection) return null;
          const reassignCandidate = p.row?.reassignmentCandidate;
          if (!reassignCandidate) return null;
          return (
            <ViewActionButton
              onClick={(e) => {
                e.stopPropagation();
                openReassignDialog(p.row, reassignCandidate);
              }}
              sx={{
                backgroundColor: "#d32f2f",
                border: "1px solid #b71c1c",
                color: "#fff",
                "&:hover": {
                  backgroundColor: "#b71c1c",
                  borderColor: "#7f0000",
                },
                "&:active": { backgroundColor: "#7f0000" },
              }}
            >
              Reassign
            </ViewActionButton>
          );
        })()}
        <IconButton
          size="small"
          disabled={hasBulkSelection}
          onClick={(e) => {
            if (hasBulkSelection) return;
            setMenuAnchor(e.currentTarget);
            setMenuRow(p.row);
          }}
        >
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    ),
  };

  const buildColumns = () => {
    if (viewFilter === "all")
      return [titleCol, typeCol, clientCol, eventDateCol, statusCol, actionCol];
    if (viewFilter === "for-assignment")
      return [titleCol, typeCol, clientCol, eventDateCol, paxCol, actionCol];
    if (viewFilter === "assigned")
      return [
        titleCol,
        typeCol,
        clientCol,
        eventDateCol,
        staffersCol,
        actionCol,
      ];
    if (viewFilter === "on-going")
      return [
        titleCol,
        typeCol,
        clientCol,
        eventDateCol,
        onGoingStaffersCol,
        actionCol,
      ];
    if (viewFilter === "completed")
      return [
        titleCol,
        typeCol,
        clientCol,
        eventDateCol,
        completedStaffersCol,
        actionCol,
      ];
    return [titleCol, typeCol, clientCol, eventDateCol, actionCol];
  };

  // ── Shared dropdown sx ────────────────────────────────────────────────────
  const selectSx = {
    fontFamily: dm,
    fontSize: "0.78rem",
    borderRadius: "10px",
    backgroundColor: isDark ? "transparent" : "#f7f7f8",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.12)" },
    "& .MuiSelect-icon": { fontSize: 18, color: "text.disabled" },
  };

  if (!currentUser)
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <BrandedLoader size={44} inline />
      </Box>
    );

  const rows = buildRows(filteredSource);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2, md: 3 },
        pt: compactTop
          ? { xs: 0.5, sm: 0.75, md: 1 }
          : { xs: 1.5, sm: 2, md: 3 },
        pb: { xs: 1.5, sm: 2, md: 3 },
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
      {showHeader && (
        <Box
          sx={{
            mb: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "text.primary",
                letterSpacing: "-0.01em",
              }}
            >
              {pageTitle}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                color: "text.secondary",
                mt: 0.3,
              }}
            >
              {descriptions[viewFilter] || ""}
            </Typography>
          </Box>
        </Box>
      )}

      {/* ── Filter row ── */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "flex-end",
          gap: 1,
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <FormControl
          size="small"
          sx={{
            flex: FILTER_SEARCH_FLEX,
            minWidth: FILTER_SEARCH_MIN_WIDTH,
            maxWidth: FILTER_SEARCH_MAX_WIDTH,
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

        <FormControl size="small" sx={{ minWidth: FILTER_STATUS_MIN_WIDTH }}>
          <Select
            value={viewFilter}
            onChange={(e) => setViewFilter(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            inputProps={{ "aria-label": `${pageTitle} status filter` }}
            renderValue={(val) => {
              const opt = getViewMeta(val);
              const triggerCount = getViewCount(val);
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.primary",
                    }}
                  >
                    {opt?.label || "For Assignment"}
                  </Typography>
                  <NumberBadge
                    count={triggerCount}
                    active={isViewFiltered}
                    inactiveBg={
                      isDark ? "rgba(255,255,255,0.28)" : "rgba(53,53,53,0.45)"
                    }
                    fontFamily={dm}
                    fontSize="0.56rem"
                    sx={{ opacity: triggerCount === 0 ? 0.5 : 1 }}
                  />
                </Box>
              );
            }}
            sx={selectSx}
          >
            {availableViewOptions.map((o) => {
              const count = getViewCount(o.key);
              const isSelected = viewFilter === o.key;
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
                  <NumberBadge
                    count={count}
                    active={isSelected}
                    inactiveBg={
                      isDark ? "rgba(255,255,255,0.28)" : "rgba(53,53,53,0.45)"
                    }
                    fontFamily={dm}
                    fontSize="0.56rem"
                    sx={{ opacity: count === 0 ? 0.5 : 1 }}
                  />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        {/* Semester */}
        <FormControl size="small" sx={{ minWidth: FILTER_SEMESTER_MIN_WIDTH }}>
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
                {getSemesterDisplayName(s)}
                {s.is_active ? " (Active)" : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Staffer */}
        <FormControl size="small" sx={{ minWidth: FILTER_CLIENT_MIN_WIDTH }}>
          <Select
            value={stafferFilter}
            onChange={(e) => setStafferFilter(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            inputProps={{ "aria-label": "Staffer filter" }}
            sx={selectSx}
          >
            <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
              All Staffers
            </MenuItem>
            {allStaffers.map((s) => (
              <MenuItem
                key={s.id}
                value={s.id}
                sx={{ fontFamily: dm, fontSize: "0.78rem" }}
              >
                {s.full_name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Divider
          orientation="vertical"
          flexItem
          sx={{
            mr: 0.75,
            height: 18,
            alignSelf: "center",
            borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
          }}
        />

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

        {/* Settings gear */}
        <Tooltip title="Manage record" arrow>
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(true)}
            sx={{
              borderRadius: CONTROL_RADIUS,
              p: 0.7,
              height: FILTER_BUTTON_HEIGHT,
              width: FILTER_BUTTON_HEIGHT,
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

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 1.5,
            borderRadius: "8px",
            fontFamily: dm,
            fontSize: "0.78rem",
            flexShrink: 0,
          }}
        >
          {error}
        </Alert>
      )}

      {/* ── Table ── */}
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
            minWidth: 680,
            height: "100%",
            bgcolor: isDark ? "background.paper" : "#f7f7f8",
            borderRadius: "10px",
            border: `1px solid ${border}`,
            overflow: "hidden",
          }}
        >
          <DataGrid
            rows={rows}
            columns={buildColumns()}
            loading={loading}
            pageSize={10}
            rowsPerPageOptions={[10]}
            checkboxSelection
            disableRowSelectionOnClick
            apiRef={gridApiRef}
            onRowSelectionModelChange={handleRowSelectionModelChange}
            enableSearch={false}
            filterModel={externalFilterModel}
            selectionActions={
              hasBulkSelection
                ? [
                    {
                      label: "Archive",
                      icon: <ArchiveOutlinedIcon sx={{ fontSize: 20 }} />,
                      onClick: handleBulkArchive,
                    },
                    {
                      label: "Move to Trash",
                      icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 20 }} />,
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
            rowHeight={["on-going", "completed"].includes(viewFilter) ? 60 : 56}
            getRowClassName={(params) =>
              highlight && params.row.title?.toLowerCase().includes(highlight)
                ? "highlighted-row"
                : ""
            }
            sx={{
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: isDark ? "#1a1a1d" : "#f7f7f8",
                borderBottom: `1px solid ${border}`,
                minHeight: "42px !important",
                maxHeight: "42px !important",
                lineHeight: "42px !important",
              },
            }}
          />
        </Box>
      </Box>

      {/* ── 3-dot context menu ── */}
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
              minWidth: 180,
              borderRadius: "10px",
              mt: 0.5,
              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            if (menuRow) openAssignDialog(menuRow);
            setMenuAnchor(null);
            setMenuRow(null);
          }}
          sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}
        >
          <ListItemIcon>
            <InfoOutlinedIcon sx={{ fontSize: 18 }} />
          </ListItemIcon>
          <ListItemText
            slotProps={{ primary: { fontFamily: dm, fontSize: "0.82rem" } }}
          >
            View Details
          </ListItemText>
        </MenuItem>
        <Divider sx={{ my: 0.5 }} />
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
            slotProps={{ primary: { fontFamily: dm, fontSize: "0.82rem" } }}
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
            slotProps={{
              primary: {
                fontFamily: dm,
                fontSize: "0.82rem",
                color: "#dc2626",
              },
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
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: "clamp(480px, 33.333vw, 600px)" },
              maxWidth: "100vw",
              backgroundColor: "background.default",
              borderLeft: `1px solid ${border}`,
            },
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
              {settingsTitle}
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
            flexWrap: "nowrap",
            overflowX: "auto",
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
                  height: MODAL_TAB_HEIGHT,
                  flexShrink: 0,
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
              role="sec_head"
              embedded
              onStateChange={loadAll}
              onToast={({ text, severity = "success" }) => {
                if (severity === "success") pushSuccessToast(text);
              }}
            />
          )}
          {settingsTab === 1 && (
            <RoleTrashManagement
              role="sec_head"
              embedded
              onStateChange={loadAll}
              onToast={({ text, severity = "success" }) => {
                if (severity === "success") pushSuccessToast(text);
              }}
            />
          )}
        </Box>
      </Drawer>

      {/* ── Assign Dialog ── */}
      <AssignmentDialog
        open={assignDialogOpen}
        request={assignRequest}
        onClose={() => !assignLoading && setAssignDialogOpen(false)}
        currentUser={currentUser}
        isDark={isDark}
        border={border}
        selectedDayIdx={selectedDayIdx}
        onSelectDay={(idx) =>
          handleSelectDay(idx, assignRequest?._raw || assignRequest)
        }
        dayStaffers={dayStaffers}
        daySelected={daySelected}
        setDaySelected={setDaySelected}
        dayAssigned={dayAssigned}
        staffersLoading={staffersLoading}
        assignLoading={assignLoading}
        assignError={assignError}
        getPaxForSection={getPaxForSection}
        onAssign={handleAssign}
      />

      {/* ── Submit Confirm Dialog ── */}
      <SubmitConfirmDialog
        open={!!confirmRequest}
        request={confirmRequest}
        isDark={isDark}
        border={border}
        loading={submitLoading}
        onCancel={() => !submitLoading && setConfirmRequest(null)}
        onConfirm={() =>
          handleSubmitForApproval(confirmRequest._raw?.id || confirmRequest.id)
        }
      />

      {/* ── Post-Assign Review Dialog ── */}
      <PostAssignReviewDialog
        open={!!postAssignReview}
        review={postAssignReview}
        isDark={isDark}
        border={border}
        loading={submitLoading}
        onClose={() => !submitLoading && setPostAssignReview(null)}
        onSubmit={() => handleSubmitForApproval(postAssignReview?.requestId)}
      />

      {/* ── Reassign Picker Dialog ── */}
      <ReassignPickerDialog
        open={reassignDialogOpen}
        request={reassignRequest}
        assignment={reassignAssignment}
        staffers={reassignStaffers}
        loading={reassignStaffersLoading}
        selectedId={reassignSelectedId}
        onSelect={setReassignSelectedId}
        reassigning={reassigning}
        error={reassignError}
        isDark={isDark}
        border={border}
        currentDivision={currentUser?.division}
        onClose={() => {
          if (reassigning) return;
          setReassignDialogOpen(false);
          setReassignAssignment(null);
          setReassignRequest(null);
          setReassignSelectedId("");
          setReassignError("");
        }}
        onConfirm={handleReassign}
      />

      {/* ── Rectification Review Dialog ── */}
      <RectificationListDialog
        open={rectifDialogOpen}
        requests={rectifRequests}
        onClose={() => setRectifDialogOpen(false)}
        onSelect={(r) => {
          setRectifTarget(r);
          setRectifReviewNote("");
          setRectifReviewError("");
        }}
        isDark={isDark}
        border={border}
      />
      <RectificationReviewDialog
        open={!!rectifTarget}
        request={rectifTarget}
        note={rectifReviewNote}
        onNoteChange={setRectifReviewNote}
        reviewing={rectifReviewing}
        error={rectifReviewError}
        isDark={isDark}
        border={border}
        onClose={() => {
          if (rectifReviewing) return;
          setRectifTarget(null);
          setRectifReviewNote("");
          setRectifReviewError("");
        }}
        onApprove={() => handleRectifDecision("approved")}
        onReject={() => handleRectifDecision("rejected")}
      />
    </Box>
  );
}

// ── Submit Confirmation Dialog ────────────────────────────────────────────────
function SubmitConfirmDialog({
  open,
  request,
  isDark,
  border,
  loading,
  onCancel,
  onConfirm,
}) {
  if (!request) return null;
  const stafferNames = (request.staffers || [])
    .map((a) => a.full_name)
    .filter(Boolean);
  return (
    <Dialog
      open={open}
      onClose={() => !loading && onCancel()}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "14px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        },
      }}
    >
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              Submit for Approval
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.7rem",
                color: "text.secondary",
              }}
            >
              This will notify the admin for final review.
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={onCancel}
          disabled={loading}
          sx={{
            borderRadius: "10px",
            color: "text.secondary",
            "&:hover": { backgroundColor: HOVER_BG },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.75,
        }}
      >
        <Box
          sx={{
            px: 1.75,
            py: 1.25,
            borderRadius: "8px",
            border: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(53,53,53,0.02)",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.84rem",
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            {request.title}
          </Typography>
          {request.eventDate && request.eventDate !== "—" && (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.3,
              }}
            >
              Event date: {request.eventDate}
            </Typography>
          )}
        </Box>
        {stafferNames.length > 0 && (
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "text.disabled",
                textTransform: "uppercase",
                letterSpacing: "0.09em",
                mb: 0.75,
              }}
            >
              Staffers being submitted
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
              {stafferNames.map((name, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6,
                    px: 1.1,
                    py: 0.3,
                    borderRadius: "6px",
                    backgroundColor: isDark
                      ? "rgba(34,197,94,0.08)"
                      : "#f0fdf4",
                    border: "1px solid rgba(34,197,94,0.2)",
                  }}
                >
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: "#22c55e",
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.72rem",
                      color: "#15803d",
                      fontWeight: 500,
                    }}
                  >
                    {name}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: "8px",
            backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.07)",
            border: "1px solid rgba(245,197,43,0.3)",
          }}
        >
          <WarningAmberOutlinedIcon
            sx={{ fontSize: 14, color: "#b45309", flexShrink: 0, mt: 0.1 }}
          />
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.76rem",
              color: "#b45309",
              lineHeight: 1.55,
            }}
          >
            Once submitted, staffers will be locked in and the admin will be
            notified. This cannot be undone.
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          px: 3,
          py: 1.75,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.01)"
            : "rgba(53,53,53,0.01)",
        }}
      >
        <CancelBtn onClick={onCancel} disabled={loading} border={border} />
        <PrimaryBtn onClick={onConfirm} loading={loading}>
          {!loading && <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
          Confirm Submission
        </PrimaryBtn>
      </Box>
    </Dialog>
  );
}

// ── Assignment Dialog ─────────────────────────────────────────────────────────
function AssignmentDialog({
  open,
  request,
  onClose,
  currentUser,
  isDark,
  border,
  selectedDayIdx,
  onSelectDay,
  dayStaffers,
  daySelected,
  setDaySelected,
  dayAssigned,
  staffersLoading,
  assignLoading,
  assignError,
  getPaxForSection,
  onAssign,
}) {
  const [showOthersMap, setShowOthersMap] = useState({});
  if (!request) return null;

  const req = request._raw || request;
  const isMultiDay = !!(req.is_multiday && req.event_days?.length > 0);
  const days = isMultiDay
    ? req.event_days
    : [
        {
          date: req.event_date,
          from_time: req.from_time,
          to_time: req.to_time,
        },
      ];

  const activeDateStr = days[selectedDayIdx]?.date;
  const activeDayData = dayStaffers[activeDateStr] || {
    primary: [],
    others: [],
  };
  const activePrimary = activeDayData.primary || [];
  const activeOthers = activeDayData.others || [];
  const activeSelected = daySelected[activeDateStr] || [];
  const activeAssigned = dayAssigned[activeDateStr] || [];
  const activeIsWeekend = isWeekendDate(activeDateStr);
  const activeWeekday = activeDateStr
    ? new Date(activeDateStr + "T00:00:00").toLocaleDateString("en-US", {
        weekday: "long",
      })
    : "";
  const totalSelectedCount = Object.values(daySelected).flat().length;
  const isDayDone = (dateStr) => (dayAssigned[dateStr] || []).length > 0;
  const showOthers = showOthersMap[activeDateStr] || false;

  const toggleShowOthers = () =>
    setShowOthersMap((prev) => ({
      ...prev,
      [activeDateStr]: !prev[activeDateStr],
    }));

  const renderStafferRow = (staffer, showPosition = false) => {
    const isSelected = activeSelected.includes(staffer.id);
    const isAlreadyAssigned = activeAssigned.some(
      (a) => a.assigned_to === staffer.id,
    );
    const url = getAvatarUrl(staffer.avatar_url);
    const clr = getAvatarColor(staffer.id);
    return (
      <Box
        key={staffer.id}
        onClick={() => {
          if (isAlreadyAssigned) return;
          setDaySelected((prev) => {
            const cur = prev[activeDateStr] || [];
            return {
              ...prev,
              [activeDateStr]: cur.includes(staffer.id)
                ? cur.filter((id) => id !== staffer.id)
                : [...cur, staffer.id],
            };
          });
        }}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          px: 1.25,
          py: 1,
          borderRadius: "8px",
          cursor: isAlreadyAssigned ? "default" : "pointer",
          border: `1px solid ${isAlreadyAssigned ? "rgba(34,197,94,0.35)" : isSelected ? "rgba(245,197,43,0.5)" : border}`,
          backgroundColor: isAlreadyAssigned
            ? isDark
              ? "rgba(34,197,94,0.05)"
              : "rgba(34,197,94,0.03)"
            : isSelected
              ? isDark
                ? GOLD_08
                : "rgba(245,197,43,0.04)"
              : "transparent",
          transition: "all 0.15s",
          "&:hover": isAlreadyAssigned
            ? {}
            : { borderColor: "rgba(245,197,43,0.5)" },
          opacity: isAlreadyAssigned ? 0.7 : 1,
        }}
      >
        <Avatar
          src={url || undefined}
          sx={{
            width: TABLE_USER_AVATAR_SIZE,
            height: TABLE_USER_AVATAR_SIZE,
            fontSize: TABLE_USER_AVATAR_FONT_SIZE,
            fontWeight: 500,
            backgroundColor: isAlreadyAssigned
              ? "#22c55e"
              : isSelected
                ? GOLD
                : clr.bg,
            color: isAlreadyAssigned
              ? "white"
              : isSelected
                ? CHARCOAL
                : clr.color,
            flexShrink: 0,
          }}
        >
          {!url && getInitials(staffer.full_name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "text.primary",
            }}
          >
            {staffer.full_name}
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.68rem",
              color: isAlreadyAssigned
                ? "#15803d"
                : staffer.assignmentCount > 4
                  ? "#dc2626"
                  : "text.secondary",
            }}
          >
            {isAlreadyAssigned
              ? "Already assigned"
              : showPosition && staffer.position
                ? staffer.position
                : staffer.assignmentCount === 0
                  ? "No assignments yet"
                  : `${staffer.assignmentCount} assignment${staffer.assignmentCount > 1 ? "s" : ""}`}
          </Typography>
        </Box>
        {staffer.isFromNearbyDay && !isAlreadyAssigned && (
          <Box
            sx={{
              px: 0.6,
              py: 0.3,
              borderRadius: "4px",
              backgroundColor: isDark
                ? "rgba(96, 165, 250, 0.12)"
                : "rgba(96, 165, 250, 0.08)",
              border: `1px solid ${isDark ? "rgba(96, 165, 250, 0.25)" : "rgba(96, 165, 250, 0.15)"}`,
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.58rem",
                fontWeight: 600,
                color: isDark ? "#60a5fa" : "#0c4a6e",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Nearby
            </Typography>
          </Box>
        )}
        {showPosition && !isAlreadyAssigned && (
          <Box
            sx={{
              px: 0.9,
              py: 0.2,
              borderRadius: "20px",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.06)"
                : "rgba(53,53,53,0.06)",
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.65rem",
                fontWeight: 600,
                color: "text.secondary",
              }}
            >
              {staffer.assignmentCount}
            </Typography>
          </Box>
        )}
        {isAlreadyAssigned ? (
          <CheckCircleIcon
            sx={{ fontSize: 14, color: "#22c55e", flexShrink: 0 }}
          />
        ) : (
          <Checkbox
            checked={isSelected}
            size="small"
            sx={{ p: 0, color: border, "&.Mui-checked": { color: GOLD } }}
          />
        )}
      </Box>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            borderRadius: "14px",
            height: { md: "90vh" },
            maxHeight: "95vh",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        },
      }}
    >
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  color: "text.primary",
                  lineHeight: 1.3,
                }}
              >
                {req.title}
              </Typography>
              {isMultiDay && (
                <Box
                  sx={{
                    px: 0.8,
                    py: 0.2,
                    borderRadius: "20px",
                    backgroundColor: isDark ? "#0d1f0d" : "#f0fdf4",
                    border: "1px solid",
                    borderColor: isDark ? "#166534" : "#86efac",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.63rem",
                      fontWeight: 700,
                      color: isDark ? "#4ade80" : "#15803d",
                    }}
                  >
                    {days.length}-day event
                  </Typography>
                </Box>
              )}
            </Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.7rem",
                color: "text.secondary",
                mt: 0.2,
              }}
            >
              {req.forwarded_at
                ? `Forwarded ${new Date(req.forwarded_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : "Forwarded date unknown"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={{
              px: 1.1,
              py: 0.3,
              borderRadius: "6px",
              backgroundColor: isDark ? "rgba(168,85,247,0.1)" : "#f5f3ff",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.66rem",
                fontWeight: 700,
                color: "#7c3aed",
              }}
            >
              {currentUser.section}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            disabled={assignLoading}
            sx={{
              borderRadius: "10px",
              color: "text.secondary",
              "&:hover": { backgroundColor: HOVER_BG },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          overflow: { xs: "auto", md: "hidden" },
          minHeight: 0,
        }}
      >
        {/* Left panel */}
        <Box
          sx={{
            flex: 1,
            px: 3,
            py: 2.5,
            overflowY: { xs: "visible", md: "auto" },
            minWidth: 0,
          }}
        >
          <Section label="Event Information" border={border}>
            <InfoGrid
              rows={[
                ["Title", req.title],
                ["Description", req.description],
                ["Venue", req.venue || "—"],
              ]}
            />
          </Section>
          <Section label="Coverage Requirements" border={border}>
            {(() => {
              const totalPax = getPaxForSection(req);
              const perDay =
                isMultiDay && days.length > 1
                  ? Math.round(totalPax / days.length)
                  : null;
              return (
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.75,
                    px: 1.25,
                    py: 0.5,
                    borderRadius: "6px",
                    border: `1px solid ${border}`,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(53,53,53,0.02)",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.82rem",
                      fontWeight: 700,
                      color: "text.primary",
                    }}
                  >
                    {perDay !== null ? perDay : totalPax}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.secondary",
                    }}
                  >
                    pax{perDay !== null ? " per day" : ""} ·{" "}
                    {currentUser.section}
                  </Typography>
                  {perDay !== null && (
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.15,
                        borderRadius: "5px",
                        backgroundColor: isDark
                          ? "rgba(59,130,246,0.1)"
                          : "#eff6ff",
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.68rem",
                          fontWeight: 600,
                          color: "#1d4ed8",
                        }}
                      >
                        {totalPax} total
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
          </Section>
          <Section
            label={
              isMultiDay
                ? "Coverage Days — Select a day to assign staffers"
                : "Coverage Day"
            }
            border={border}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {days.map((dayObj, idx) => {
                const dateStr = dayObj.date;
                const isActive = selectedDayIdx === idx;
                const isDone = isDayDone(dateStr);
                const selected = daySelected[dateStr] || [];
                const assigned = dayAssigned[dateStr] || [];
                const hasNew = selected.length > 0;
                const weekend = isWeekendDate(dateStr);
                return (
                  <Box
                    key={dateStr}
                    onClick={() => onSelectDay(idx)}
                    sx={{
                      px: 1.5,
                      py: 1.25,
                      borderRadius: "10px",
                      cursor: "pointer",
                      border: "1px solid",
                      borderColor: isActive
                        ? GOLD
                        : isDone || hasNew
                          ? "rgba(34,197,94,0.4)"
                          : border,
                      backgroundColor: isActive
                        ? isDark
                          ? "rgba(245,197,43,0.06)"
                          : "rgba(245,197,43,0.04)"
                        : isDone || hasNew
                          ? isDark
                            ? "rgba(34,197,94,0.05)"
                            : "rgba(34,197,94,0.03)"
                          : "transparent",
                      transition: "all 0.15s",
                      "&:hover": {
                        borderColor: isActive ? GOLD : "rgba(245,197,43,0.4)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <Box
                          sx={{
                            px: 0.9,
                            py: 0.2,
                            borderRadius: "20px",
                            backgroundColor: isActive
                              ? GOLD
                              : isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(53,53,53,0.07)",
                            color: isActive ? CHARCOAL : "text.secondary",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {fmtDateShort(dateStr)}
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.75rem",
                            color: "text.secondary",
                          }}
                        >
                          {fmtWeekday(dateStr)}
                          {weekend ? " · Weekend" : ""}
                        </Typography>
                        {dayObj.from_time && dayObj.to_time && (
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.73rem",
                              color: "text.secondary",
                            }}
                          >
                            {fmtTimeStr(dayObj.from_time)} –{" "}
                            {fmtTimeStr(dayObj.to_time)}
                          </Typography>
                        )}
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 0.75,
                        }}
                      >
                        {(isDone || hasNew) && (
                          <CheckCircleIcon
                            sx={{ fontSize: 14, color: "#22c55e" }}
                          />
                        )}
                        {isActive && (
                          <ChevronRightIcon
                            sx={{ fontSize: 14, color: GOLD }}
                          />
                        )}
                      </Box>
                    </Box>
                    {(assigned.length > 0 || selected.length > 0) && (
                      <Box
                        sx={{
                          display: "flex",
                          gap: 0.5,
                          mt: 0.75,
                          flexWrap: "wrap",
                        }}
                      >
                        {assigned.map((a, i) => {
                          const url = getAvatarUrl(a.staffer?.avatar_url);
                          const clr = getAvatarColor(a.assigned_to);
                          return (
                            <Box
                              key={i}
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 0.75,
                                py: 0.25,
                                borderRadius: "6px",
                                backgroundColor: isDark
                                  ? "rgba(34,197,94,0.08)"
                                  : "#f0fdf4",
                                border: "1px solid rgba(34,197,94,0.2)",
                              }}
                            >
                              <Avatar
                                src={url || undefined}
                                sx={{
                                  width: 16,
                                  height: 16,
                                  fontSize: "0.45rem",
                                  fontWeight: 500,
                                  backgroundColor: clr.bg,
                                  color: clr.color,
                                }}
                              >
                                {!url &&
                                  getInitials(
                                    a.staffer?.full_name ||
                                      a.profiles?.full_name,
                                  )}
                              </Avatar>
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.68rem",
                                  color: "#15803d",
                                  fontWeight: 500,
                                }}
                              >
                                {a.staffer?.full_name ||
                                  a.profiles?.full_name ||
                                  "—"}
                              </Typography>
                            </Box>
                          );
                        })}
                        {selected.length > 0 && (
                          <Box
                            sx={{
                              px: 0.75,
                              py: 0.25,
                              borderRadius: "6px",
                              backgroundColor: isDark
                                ? GOLD_08
                                : "rgba(245,197,43,0.08)",
                              border: "1px solid rgba(245,197,43,0.3)",
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.68rem",
                                color: "#b45309",
                                fontWeight: 600,
                              }}
                            >
                              {selected.length} pending
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    )}
                  </Box>
                );
              })}
            </Box>
          </Section>
          <Section label="Client Details" border={border}>
            <InfoGrid
              rows={[
                ["Organization", req.entity?.name || "—"],
                ["Contact Person", req.contact_person || "—"],
                ["Contact Info", req.contact_info || "—"],
              ]}
            />
          </Section>
          <Section label="Reassignment History" border={border}>
            {(() => {
              const allAssignments = req.coverage_assignments || [];

              // Anything that caused a reassignment (Cancelled or No Show)
              const triggers = allAssignments
                .filter(
                  (a) => a.status === "Cancelled" || a.status === "No Show",
                )
                .sort((a, b) => {
                  const da = a.cancelled_at || a.assignment_date || "";
                  const db = b.cancelled_at || b.assignment_date || "";
                  return da < db ? -1 : da > db ? 1 : 0;
                });

              if (triggers.length === 0) {
                return (
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.8rem",
                      color: "text.secondary",
                    }}
                  >
                    No reassignment events for this request.
                  </Typography>
                );
              }

              // Build a lookup of replacement assignments keyed by date|section|service_key
              const replacementMap = {};
              allAssignments.forEach((a) => {
                if (a.is_reassigned) {
                  const key = `${a.assignment_date}|${a.section}|${a.service_key || ""}`;
                  if (!replacementMap[key]) replacementMap[key] = [];
                  replacementMap[key].push(a);
                }
              });

              return (
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}
                >
                  {triggers.map((a) => {
                    const isEmergency = isAnnouncedEmergencyAssignment(a);
                    const reasonText = isEmergency
                      ? extractEmergencyReasonText(a.cancellation_reason)
                      : null;
                    const proofPath = isEmergency
                      ? extractEmergencyProofPath(a.cancellation_reason)
                      : null;
                    const triggerName = a.staffer?.full_name || "Unknown staff";
                    const cancelledAt = a.cancelled_at
                      ? new Date(a.cancelled_at).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })
                      : null;

                    const repKey = `${a.assignment_date}|${a.section}|${a.service_key || ""}`;
                    const replacements = replacementMap[repKey] || [];

                    const badgeColor = isEmergency ? "#b45309" : "#dc2626";
                    const badgeBg = isEmergency
                      ? "rgba(245,197,43,0.1)"
                      : "rgba(220,38,38,0.08)";
                    const borderColor = isEmergency
                      ? "rgba(245,197,43,0.3)"
                      : "rgba(220,38,38,0.2)";
                    const label = isEmergency ? "Emergency" : "No Show";

                    return (
                      <Box
                        key={a.id}
                        sx={{
                          border: `1px solid ${borderColor}`,
                          borderRadius: "10px",
                          overflow: "hidden",
                        }}
                      >
                        {/* Header row */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            gap: 0.5,
                            px: 1.5,
                            py: 1,
                            backgroundColor: badgeBg,
                            borderBottom: `1px solid ${borderColor}`,
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
                                px: 0.85,
                                py: 0.2,
                                borderRadius: "4px",
                                backgroundColor: badgeColor,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.62rem",
                                  fontWeight: 700,
                                  color: "#fff",
                                  letterSpacing: "0.06em",
                                  textTransform: "uppercase",
                                }}
                              >
                                {label}
                              </Typography>
                            </Box>
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.8rem",
                                fontWeight: 700,
                                color: "text.primary",
                              }}
                            >
                              {triggerName}
                            </Typography>
                          </Box>
                          {cancelledAt && (
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.7rem",
                                color: "text.disabled",
                              }}
                            >
                              {cancelledAt}
                            </Typography>
                          )}
                        </Box>

                        {/* Body */}
                        <Box
                          sx={{
                            px: 1.5,
                            py: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 0.75,
                          }}
                        >
                          {/* Date + time */}
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.74rem",
                              color: "text.secondary",
                            }}
                          >
                            {a.assignment_date
                              ? fmtDateShort(a.assignment_date)
                              : "—"}
                            {a.from_time && a.to_time
                              ? ` · ${fmtTimeStr(a.from_time)} – ${fmtTimeStr(a.to_time)}`
                              : ""}
                          </Typography>

                          {/* Reason */}
                          {reasonText && (
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.78rem",
                                color: "text.secondary",
                                lineHeight: 1.55,
                              }}
                            >
                              {reasonText}
                            </Typography>
                          )}

                          {/* Proof */}
                          {proofPath && (
                            <Box
                              onClick={() => openFile(proofPath)}
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.7,
                                px: 1,
                                py: 0.45,
                                borderRadius: "6px",
                                cursor: "pointer",
                                border: `1px solid ${border}`,
                                alignSelf: "flex-start",
                                transition: "all 0.15s",
                                "&:hover": {
                                  borderColor: GOLD,
                                  backgroundColor: GOLD_08,
                                },
                              }}
                            >
                              <InsertDriveFileOutlinedIcon
                                sx={{ fontSize: 13, color: "text.secondary" }}
                              />
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.74rem",
                                  color: "text.secondary",
                                }}
                              >
                                {getFileName(proofPath) || "View Proof"}
                              </Typography>
                              <ChevronRightIcon
                                sx={{ fontSize: 13, color: "text.disabled" }}
                              />
                            </Box>
                          )}

                          {/* Replacement */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.75,
                              mt: 0.25,
                              pt: 0.75,
                              borderTop: `1px dashed ${border}`,
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.7rem",
                                color: "text.disabled",
                                flexShrink: 0,
                              }}
                            >
                              Replaced by
                            </Typography>
                            {replacements.length > 0 ? (
                              replacements.map((r) => (
                                <Typography
                                  key={r.id}
                                  sx={{
                                    fontFamily: dm,
                                    fontSize: "0.78rem",
                                    fontWeight: 600,
                                    color: "text.primary",
                                  }}
                                >
                                  {r.staffer?.full_name || "Unknown"}
                                </Typography>
                              ))
                            ) : (
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.76rem",
                                  color: "text.disabled",
                                  fontStyle: "italic",
                                }}
                              >
                                Pending reassignment
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              );
            })()}
          </Section>
          <Section label="Attachment" border={border}>
            {req.file_url ? (
              <Box
                onClick={() => openFile(req.file_url)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: "6px",
                  cursor: "pointer",
                  border: `1px solid ${border}`,
                  transition: "all 0.15s",
                  "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08 },
                }}
              >
                <InsertDriveFileOutlinedIcon
                  sx={{ fontSize: 13, color: "text.secondary" }}
                />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    color: "text.secondary",
                  }}
                >
                  {getFileName(req.file_url)}
                </Typography>
                <ChevronRightIcon
                  sx={{ fontSize: 13, color: "text.disabled" }}
                />
              </Box>
            ) : (
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                }}
              >
                No file attached
              </Typography>
            )}
          </Section>
        </Box>

        <Box
          sx={{
            width: "1px",
            backgroundColor: border,
            display: { xs: "none", md: "block" },
          }}
        />

        {/* Right panel — staffer selection */}
        <Box
          sx={{
            width: { xs: "100%", md: 280 },
            flexShrink: 0,
            px: 2.5,
            py: 2.5,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.01)"
              : "rgba(53,53,53,0.01)",
            overflowY: { xs: "visible", md: "auto" },
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <PersonAddOutlinedIcon sx={{ fontSize: 13, color: GOLD }} />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {activeDateStr ? fmtDateShort(activeDateStr) : "Select Staffers"}
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.76rem",
              color: "text.secondary",
              lineHeight: 1.6,
            }}
          >
            {activeDateStr
              ? activeIsWeekend
                ? "Weekend — all staffers shown, sorted by least assignments."
                : `Showing staffers on duty for ${activeWeekday}, sorted by least assignments.`
              : "Select a day on the left to assign staffers."}
          </Typography>

          {assignError && (
            <Alert
              severity="error"
              sx={{ borderRadius: "8px", fontFamily: dm, fontSize: "0.76rem" }}
            >
              {assignError}
            </Alert>
          )}

          {staffersLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <BrandedLoader size={28} inline />
            </Box>
          ) : !activeDateStr ? null : activePrimary.length === 0 &&
            activeOthers.length === 0 ? (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                color: "text.secondary",
                textAlign: "center",
                py: 2,
              }}
            >
              No eligible staffers found for this day.
            </Typography>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {activePrimary.length > 0 && (
                <>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 0.25,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        color: isDark ? "#5DCAA5" : "#0F6E56",
                        textTransform: "uppercase",
                        letterSpacing: "0.09em",
                        flexShrink: 0,
                      }}
                    >
                      {currentUser.section === "News"
                        ? "Writers"
                        : currentUser.section === "Photojournalism"
                          ? "Photojournalists"
                          : "Videojournalists"}
                    </Typography>
                    <Box
                      sx={{ flex: 1, height: "1px", backgroundColor: border }}
                    />
                  </Box>
                  {activePrimary.map((staffer) =>
                    renderStafferRow(staffer, false),
                  )}
                </>
              )}
              {activeOthers.length > 0 && (
                <>
                  <Box
                    onClick={toggleShowOthers}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      px: 1.25,
                      py: 0.7,
                      borderRadius: "8px",
                      cursor: "pointer",
                      border: `1px dashed ${isDark ? "rgba(255,255,255,0.12)" : "rgba(53,53,53,0.15)"}`,
                      color: "text.secondary",
                      transition: "all 0.15s",
                      mt: 0.5,
                      "&:hover": {
                        borderColor: "rgba(245,197,43,0.5)",
                        color: "#b45309",
                      },
                    }}
                  >
                    {showOthers ? (
                      <ExpandLessIcon sx={{ fontSize: 14 }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 14 }} />
                    )}
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.73rem",
                        fontWeight: 500,
                      }}
                    >
                      {showOthers
                        ? "Hide others"
                        : `Show others (${activeOthers.length})`}
                    </Typography>
                    {!showOthers && (
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.68rem",
                          color: "text.disabled",
                          ml: "auto",
                        }}
                      >
                        Layout, Illustrators
                        {currentUser.section === "Photojournalism"
                          ? ", Video"
                          : currentUser.section === "Videojournalism"
                            ? ", Photo"
                            : ""}
                      </Typography>
                    )}
                  </Box>
                  {showOthers && (
                    <>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          py: 0.25,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            color: "text.disabled",
                            textTransform: "uppercase",
                            letterSpacing: "0.09em",
                            flexShrink: 0,
                          }}
                        >
                          Others
                        </Typography>
                        <Box
                          sx={{
                            flex: 1,
                            height: "1px",
                            backgroundColor: border,
                          }}
                        />
                      </Box>
                      {activeOthers.map((staffer) =>
                        renderStafferRow(staffer, true),
                      )}
                    </>
                  )}
                </>
              )}
              {activePrimary.length === 0 && activeOthers.length > 0 && (
                <>
                  <Box
                    sx={{
                      px: 1.25,
                      py: 0.9,
                      borderRadius: "8px",
                      backgroundColor: isDark
                        ? "rgba(245,158,11,0.08)"
                        : "#fffbeb",
                      border: "1px solid rgba(245,158,11,0.25)",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.73rem",
                        color: "#b45309",
                        lineHeight: 1.55,
                      }}
                    >
                      No primary staffers on duty for this day. Others are
                      available as fallback.
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      py: 0.25,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        color: "text.disabled",
                        textTransform: "uppercase",
                        letterSpacing: "0.09em",
                        flexShrink: 0,
                      }}
                    >
                      Others
                    </Typography>
                    <Box
                      sx={{ flex: 1, height: "1px", backgroundColor: border }}
                    />
                  </Box>
                  {activeOthers.map((staffer) =>
                    renderStafferRow(staffer, true),
                  )}
                </>
              )}
            </Box>
          )}

          {totalSelectedCount > 0 && (
            <Box
              sx={{
                px: 1.25,
                py: 0.9,
                borderRadius: "8px",
                backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.07)",
                border: "1px solid rgba(245,197,43,0.35)",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.76rem",
                  fontWeight: 600,
                  color: "#b45309",
                }}
              >
                {totalSelectedCount} assignment
                {totalSelectedCount > 1 ? "s" : ""} pending across{" "}
                {Object.values(daySelected).filter((v) => v.length > 0).length}{" "}
                day
                {Object.values(daySelected).filter((v) => v.length > 0).length >
                1
                  ? "s"
                  : ""}
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <Box
        sx={{
          px: 3,
          py: 1.75,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.01)"
            : "rgba(53,53,53,0.01)",
        }}
      >
        <CancelBtn onClick={onClose} disabled={assignLoading} border={border} />
        <PrimaryBtn onClick={onAssign} loading={assignLoading}>
          {!assignLoading && <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
          Confirm Assignment
        </PrimaryBtn>
      </Box>
    </Dialog>
  );
}

// ── Shared small components ───────────────────────────────────────────────────
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
          mb: 0.75,
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
        rowGap: 0.6,
        columnGap: 1.5,
        alignItems: "start",
      }}
    >
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.76rem",
              color: "text.secondary",
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
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

// ── Post-Assign Review Dialog ─────────────────────────────────────────────────
function PostAssignReviewDialog({
  open,
  review,
  isDark,
  border,
  loading,
  onClose,
  onSubmit,
}) {
  if (!review) return null;
  const {
    title,
    isMultiDay,
    eventDate,
    eventDays,
    fromTime,
    toTime,
    staffersByDay,
  } = review;

  const fmtDate = (dateStr) =>
    new Date(dateStr + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  const fmtTime = (t) => {
    if (!t) return "";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    const hr = h % 12 || 12;
    return `${hr}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  const hasEntries = Object.values(staffersByDay).some((s) => s.length > 0);

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "14px",
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              backgroundColor: "rgba(34,197,94,0.10)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CheckCircleOutlinedIcon sx={{ fontSize: 17, color: "#22c55e" }} />
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
              Assignment Saved
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.7rem",
                color: "text.secondary",
              }}
            >
              Review the assigned staff before submitting for admin approval.
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          disabled={loading}
          sx={{
            borderRadius: "8px",
            color: "text.secondary",
            "&:hover": { backgroundColor: HOVER_BG },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          maxHeight: "60vh",
          overflowY: "auto",
        }}
      >
        {/* Request info */}
        <Box
          sx={{
            px: 1.75,
            py: 1.25,
            borderRadius: "8px",
            border: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(53,53,53,0.02)",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.84rem",
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            {title}
          </Typography>
          {!isMultiDay && (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.3,
              }}
            >
              {fmtDate(eventDate)}
              {fromTime ? ` · ${fmtTime(fromTime)} – ${fmtTime(toTime)}` : ""}
            </Typography>
          )}
          {isMultiDay && (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.3,
              }}
            >
              {eventDays.length}-day event
            </Typography>
          )}
        </Box>

        {/* Staffers by day */}
        {hasEntries &&
          Object.entries(staffersByDay)
            .filter(([, staffers]) => staffers.length > 0)
            .map(([dateStr, staffers]) => (
              <Box key={dateStr}>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.62rem",
                    fontWeight: 700,
                    color: "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.09em",
                    mb: 0.75,
                  }}
                >
                  {isMultiDay ? fmtDate(dateStr) : "Staffers assigned"}
                </Typography>
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}
                >
                  {staffers.map((s) => {
                    const url = getAvatarUrl(s.avatar_url);
                    const clr = getAvatarColor(s.id);
                    return (
                      <Box
                        key={s.id}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.25,
                          px: 1.25,
                          py: 0.9,
                          borderRadius: "8px",
                          border: `1px solid ${border}`,
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(53,53,53,0.01)",
                        }}
                      >
                        <Avatar
                          src={url || undefined}
                          sx={{
                            width: TABLE_USER_AVATAR_SIZE,
                            height: TABLE_USER_AVATAR_SIZE,
                            fontSize: TABLE_USER_AVATAR_FONT_SIZE,
                            fontWeight: 600,
                            backgroundColor: clr.bg,
                            color: clr.color,
                            border: `1.5px solid ${border}`,
                          }}
                        >
                          {!url && s.full_name
                            ? s.full_name.charAt(0).toUpperCase()
                            : ""}
                        </Avatar>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.8rem",
                            fontWeight: 500,
                            color: "text.primary",
                          }}
                        >
                          {s.full_name}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            ))}

        {/* Warning */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: "8px",
            backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.07)",
            border: "1px solid rgba(245,197,43,0.3)",
          }}
        >
          <WarningAmberOutlinedIcon
            sx={{ fontSize: 14, color: "#b45309", flexShrink: 0, mt: 0.1 }}
          />
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.76rem",
              color: "#b45309",
              lineHeight: 1.55,
            }}
          >
            Once submitted, staffers will be locked in and the admin will be
            notified. This cannot be undone.
          </Typography>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 1.75,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.01)"
            : "rgba(53,53,53,0.01)",
        }}
      >
        <CancelBtn onClick={onClose} disabled={loading} border={border} />
        <PrimaryBtn onClick={onSubmit} loading={loading}>
          {!loading && <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
          Submit for Approval
        </PrimaryBtn>
      </Box>
    </Dialog>
  );
}

function CancelBtn({ onClick, disabled, border }) {
  return (
    <Box
      onClick={!disabled ? onClick : undefined}
      sx={{
        px: 1.75,
        py: 0.65,
        borderRadius: "8px",
        cursor: disabled ? "default" : "pointer",
        border: `1px solid ${border}`,
        fontFamily: dm,
        fontSize: "0.8rem",
        fontWeight: 500,
        color: "text.secondary",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        "&:hover": { color: "text.primary", backgroundColor: HOVER_BG },
      }}
    >
      Cancel
    </Box>
  );
}
function PrimaryBtn({ onClick, loading, children }) {
  return (
    <Box
      onClick={!loading ? onClick : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.6,
        px: 1.75,
        py: 0.65,
        borderRadius: "8px",
        cursor: loading ? "default" : "pointer",
        backgroundColor: GOLD,
        color: CHARCOAL,
        fontFamily: dm,
        fontSize: "0.8rem",
        fontWeight: 600,
        opacity: loading ? 0.8 : 1,
        transition: "background-color 0.15s",
        "&:hover": { backgroundColor: loading ? GOLD : "#e6b920" },
      }}
    >
      {loading && <CircularProgress size={13} sx={{ color: CHARCOAL }} />}
      {children}
    </Box>
  );
}
// ── Reassign Picker Dialog ────────────────────────────────────────────────────
function ReassignPickerDialog({
  open,
  request,
  assignment,
  staffers,
  loading,
  selectedId,
  onSelect,
  reassigning,
  error,
  isDark,
  border,
  currentDivision,
  onClose,
  onConfirm,
}) {
  if (!open) return null;

  const originalName =
    assignment?.staffer?.full_name || "the original assignee";
  const dateStr = assignment?.assignment_date;
  const isAnnouncedEmergency = isAnnouncedEmergencyAssignment(assignment);
  const selectedStaffer = staffers.find((s) => s.id === selectedId);
  const selectedHasConflict = !!selectedStaffer?.hasConflict;
  const hasCrossDivisionOptions = staffers.some((s) => s.isCrossDivision);

  const fmtDateLabel = (d) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <Dialog
      open={open}
      onClose={() => !reassigning && onClose()}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "10px",
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              Reassign Staffer
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.7rem",
                color: "text.secondary",
              }}
            >
              {isAnnouncedEmergency
                ? `Emergency announced by ${originalName}. Select a replacement.`
                : `No check-in from ${originalName}. Select a replacement.`}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <Tooltip title="View Reassignment History" placement="top">
            <IconButton
              component={Link}
              to="/sec_head/reassignment-history"
              size="small"
              sx={{
                borderRadius: "10px",
                color: "text.secondary",
                "&:hover": { backgroundColor: HOVER_BG },
              }}
            >
              <HistoryOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
          <IconButton
            size="small"
            onClick={onClose}
            disabled={reassigning}
            sx={{
              borderRadius: "10px",
              color: "text.secondary",
              "&:hover": { backgroundColor: HOVER_BG },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Body */}
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 2,
        }}
      >
        {/* Context card */}
        <Box
          sx={{
            px: 1.75,
            py: 1.25,
            borderRadius: "8px",
            border: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(53,53,53,0.02)",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.84rem",
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            {request?.title || "Coverage Request"}
          </Typography>
          {dateStr && (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.3,
              }}
            >
              {fmtDateLabel(dateStr)} · Replacing {originalName}
            </Typography>
          )}
        </Box>

        {/* Staffer list */}
        <Box>
          {hasCrossDivisionOptions && (
            <Alert
              severity="warning"
              sx={{
                mb: 1.25,
                borderRadius: "8px",
                fontFamily: dm,
                alignItems: "center",
                "& .MuiAlert-message": {
                  fontSize: "0.8rem",
                  lineHeight: 1.35,
                },
              }}
            >
              Same-division replacements were unavailable. Outside-division
              staffers are shown as an emergency fallback, and admins will be
              notified if you confirm one.
            </Alert>
          )}
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.62rem",
              fontWeight: 700,
              color: "text.disabled",
              textTransform: "uppercase",
              letterSpacing: "0.09em",
              mb: 0.75,
            }}
          >
            {loading ? "Loading eligible staffers…" : "Choose replacement"}
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={24} sx={{ color: GOLD }} />
            </Box>
          ) : staffers.length === 0 ? (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                color: "text.secondary",
                py: 1,
              }}
            >
              {isAnnouncedEmergency
                ? "No eligible staffers found after same-division and emergency fallback checks."
                : "No eligible staffers found for this date."}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.6,
                maxHeight: 280,
                overflowY: "auto",
              }}
            >
              {staffers.map((s) => {
                const isSelected = selectedId === s.id;
                const url = getAvatarUrl(s.avatar_url);
                const clr = getAvatarColor(s.id);
                return (
                  <Box
                    key={s.id}
                    onClick={() => {
                      if (s.hasConflict) return;
                      onSelect(s.id);
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.25,
                      px: 1.25,
                      py: 0.9,
                      borderRadius: "8px",
                      cursor: s.hasConflict ? "not-allowed" : "pointer",
                      border: `1px solid ${isSelected ? "rgba(245,197,43,0.5)" : border}`,
                      backgroundColor: isSelected
                        ? isDark
                          ? GOLD_08
                          : "rgba(245,197,43,0.04)"
                        : "transparent",
                      transition: "all 0.15s",
                      opacity: s.hasConflict ? 0.65 : 1,
                      "&:hover": s.hasConflict
                        ? {}
                        : { borderColor: "rgba(245,197,43,0.5)" },
                    }}
                  >
                    <Avatar
                      src={url || undefined}
                      sx={{
                        width: TABLE_USER_AVATAR_SIZE,
                        height: TABLE_USER_AVATAR_SIZE,
                        fontSize: TABLE_USER_AVATAR_FONT_SIZE,
                        fontWeight: 500,
                        backgroundColor: isSelected ? GOLD : clr.bg,
                        color: isSelected ? CHARCOAL : clr.color,
                        flexShrink: 0,
                      }}
                    >
                      {!url && getInitials(s.full_name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          color: "text.primary",
                        }}
                      >
                        {s.full_name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.68rem",
                          color: s.hasConflict
                            ? "#b45309"
                            : s.assignmentCount > 4
                              ? "#dc2626"
                              : "text.secondary",
                        }}
                      >
                        {s.hasConflict
                          ? "Already assigned on this date"
                          : s.assignmentCount === 0
                            ? "No assignments yet"
                            : `${s.assignmentCount} assignment${s.assignmentCount > 1 ? "s" : ""}`}
                      </Typography>
                      {s.isCrossDivision && (
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.65rem",
                            color: "text.secondary",
                            mt: 0.15,
                          }}
                        >
                          {s.section || "Other section"} ·{" "}
                          {s.division || "Other division"}
                          {currentDivision ? ` vs ${currentDivision}` : ""}
                        </Typography>
                      )}
                    </Box>
                    {s.isFromNearbyDay && (
                      <Box
                        sx={{
                          px: 0.8,
                          py: 0.4,
                          borderRadius: "4px",
                          backgroundColor: isDark
                            ? "rgba(96, 165, 250, 0.12)"
                            : "rgba(96, 165, 250, 0.08)",
                          border: `1px solid ${isDark ? "rgba(96, 165, 250, 0.25)" : "rgba(96, 165, 250, 0.15)"}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.62rem",
                            fontWeight: 600,
                            color: isDark ? "#60a5fa" : "#0c4a6e",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Nearby
                        </Typography>
                      </Box>
                    )}
                    {s.isCrossDivision && (
                      <Box
                        sx={{
                          px: 0.8,
                          py: 0.4,
                          borderRadius: "4px",
                          backgroundColor: isDark
                            ? "rgba(239,68,68,0.12)"
                            : "rgba(239,68,68,0.08)",
                          border: `1px solid ${isDark ? "rgba(239,68,68,0.24)" : "rgba(239,68,68,0.18)"}`,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.62rem",
                            fontWeight: 600,
                            color: "#b91c1c",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Outside Division
                        </Typography>
                      </Box>
                    )}
                    {s.hasConflict && (
                      <Box
                        sx={{
                          px: 0.8,
                          py: 0.2,
                          borderRadius: "5px",
                          backgroundColor: isDark
                            ? "rgba(245,158,11,0.12)"
                            : "#fffbeb",
                          border: "1px solid rgba(245,158,11,0.3)",
                          flexShrink: 0,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.62rem",
                            fontWeight: 600,
                            color: "#b45309",
                          }}
                        >
                          Conflict
                        </Typography>
                      </Box>
                    )}
                    <Radio
                      checked={isSelected}
                      disabled={s.hasConflict || reassigning}
                      size="small"
                      sx={{
                        p: 0,
                        color: border,
                        "&.Mui-checked": { color: GOLD },
                      }}
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => onSelect(s.id)}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        {error && (
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.75rem", color: "error.main" }}
          >
            {error}
          </Typography>
        )}
        {selectedHasConflict && (
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.75rem", color: "#b45309" }}
          >
            Selected staffer already has an assignment on this date. Choose a
            non-conflicting replacement.
          </Typography>
        )}
        {!selectedHasConflict && selectedStaffer?.isCrossDivision && (
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.75rem", color: "#b91c1c" }}
          >
            This replacement is outside {currentDivision || "your current"}{" "}
            division. Confirm only for emergency coverage when no same-division
            option is available.
          </Typography>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
        }}
      >
        <Box
          onClick={() => !reassigning && onClose()}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
            cursor: reassigning ? "default" : "pointer",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "text.secondary",
            border: `1px solid ${border}`,
            backgroundColor: "transparent",
            opacity: reassigning ? 0.5 : 1,
            "&:hover": { backgroundColor: HOVER_BG },
          }}
        >
          Cancel
        </Box>
        <Box
          onClick={
            !reassigning && selectedId && !selectedHasConflict
              ? onConfirm
              : undefined
          }
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.6,
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
            cursor:
              !selectedId || selectedHasConflict || reassigning
                ? "default"
                : "pointer",
            backgroundColor:
              !selectedId || selectedHasConflict || reassigning
                ? "action.disabledBackground"
                : "#111",
            color:
              !selectedId || selectedHasConflict || reassigning
                ? "text.disabled"
                : "#fff",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            transition: "background-color 0.15s",
            "&:hover": {
              backgroundColor:
                !selectedId || selectedHasConflict || reassigning
                  ? undefined
                  : "#333",
            },
          }}
        >
          {reassigning && (
            <CircularProgress size={12} sx={{ color: "inherit" }} />
          )}
          {isAnnouncedEmergency
            ? "Confirm Emergency Replacement"
            : "Confirm Replacement"}
        </Box>
      </Box>
    </Dialog>
  );
}

// ── Rectification List Dialog ─────────────────────────────────────────────────
function RectificationListDialog({
  open,
  requests,
  onClose,
  onSelect,
  isDark,
  border,
}) {
  if (!open) return null;
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: "10px", border: `1px solid ${border}` } },
      }}
    >
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GavelOutlinedIcon sx={{ fontSize: 16, color: "#6d28d9" }} />
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700 }}
          >
            Pending Rectifications
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 2, py: 1.5, maxHeight: 420, overflowY: "auto" }}>
        {requests.length === 0 ? (
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              color: "text.secondary",
              py: 2,
              textAlign: "center",
            }}
          >
            No pending rectifications.
          </Typography>
        ) : (
          requests.map((r) => (
            <Box
              key={r.id}
              onClick={() => {
                onSelect(r);
                onClose();
              }}
              sx={{
                p: 1.75,
                mb: 0.75,
                borderRadius: "8px",
                border: `1px solid ${border}`,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)",
                },
              }}
            >
              <Typography
                sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 600 }}
              >
                {r.request?.title ?? "—"}
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  mt: 0.25,
                }}
              >
                {r.staff?.full_name ?? "—"} ·{" "}
                {new Date(r.created_at).toLocaleDateString()}
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  color: "text.secondary",
                  mt: 0.5,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {r.reason}
              </Typography>
            </Box>
          ))
        )}
      </Box>

      <Box
        sx={{
          px: 3,
          py: 1.5,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Box
          onClick={onClose}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
            cursor: "pointer",
            border: `1px solid ${border}`,
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "text.secondary",
            userSelect: "none",
            "&:hover": { backgroundColor: HOVER_BG },
          }}
        >
          Close
        </Box>
      </Box>
    </Dialog>
  );
}

// ── Rectification Review Dialog ───────────────────────────────────────────────
function RectificationReviewDialog({
  open,
  request,
  note,
  onNoteChange,
  reviewing,
  error,
  isDark,
  border,
  onClose,
  onApprove,
  onReject,
}) {
  if (!request) return null;

  const proofUrl = request.proof_path
    ? (() => {
        const { data } = supabase.storage
          .from("coverage-files")
          .getPublicUrl(request.proof_path);
        return data?.publicUrl ?? null;
      })()
    : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: "10px", border: `1px solid ${border}` } },
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GavelOutlinedIcon sx={{ fontSize: 16, color: "#6d28d9" }} />
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700 }}
          >
            Review Rectification
          </Typography>
        </Box>
        <IconButton size="small" disabled={reviewing} onClick={onClose}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
        {/* Staff + assignment */}
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.75rem",
            color: "text.secondary",
            mb: 0.25,
          }}
        >
          Staff member
        </Typography>
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 600, mb: 1.5 }}
        >
          {request.staff?.full_name ?? "—"}
        </Typography>

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.75rem",
            color: "text.secondary",
            mb: 0.25,
          }}
        >
          Assignment
        </Typography>
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 600, mb: 1.5 }}
        >
          {request.request?.title ?? "—"}
        </Typography>

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.75rem",
            color: "text.secondary",
            mb: 0.5,
          }}
        >
          Staff reason
        </Typography>
        <Box
          sx={{
            p: 1.5,
            borderRadius: "8px",
            border: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.02)",
            mb: 1.75,
          }}
        >
          <Typography sx={{ fontFamily: dm, fontSize: "0.8rem" }}>
            {request.reason}
          </Typography>
        </Box>

        {proofUrl && (
          <>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.75rem",
                color: "text.secondary",
                mb: 0.5,
              }}
            >
              Proof
            </Typography>
            <Box
              component="a"
              href={proofUrl}
              target="_blank"
              rel="noreferrer"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                fontFamily: dm,
                fontSize: "0.8rem",
                color: "#6d28d9",
                mb: 1.75,
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              <InsertDriveFileOutlinedIcon sx={{ fontSize: 15 }} />
              View attached proof
            </Box>
          </>
        )}

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.75rem",
            color: "text.secondary",
            mb: 0.5,
          }}
        >
          Reviewer note (optional)
        </Typography>
        <TextField
          multiline
          minRows={2}
          maxRows={4}
          fullWidth
          placeholder="Add a note for the staff member…"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          disabled={reviewing}
          size="small"
          inputProps={{ maxLength: 400 }}
          sx={{
            mb: error ? 0 : 0,
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              fontFamily: dm,
              fontSize: "0.82rem",
            },
          }}
        />

        {error && (
          <Alert
            severity="error"
            sx={{
              mt: 1.5,
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: "8px",
            }}
          >
            {error}
          </Alert>
        )}
      </Box>

      {reviewing && (
        <LinearProgress
          sx={{
            mx: 3,
            mb: 1,
            borderRadius: "4px",
            height: 3,
            "& .MuiLinearProgress-bar": { backgroundColor: GOLD },
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
          }}
        />
      )}

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 1.75,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
        }}
      >
        <Box
          onClick={reviewing ? undefined : onClose}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
            cursor: reviewing ? "default" : "pointer",
            border: `1px solid ${border}`,
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "text.secondary",
            userSelect: "none",
            "&:hover": reviewing ? {} : { backgroundColor: HOVER_BG },
          }}
        >
          Cancel
        </Box>
        <Box
          onClick={reviewing ? undefined : onReject}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
            cursor: reviewing ? "default" : "pointer",
            border: "1px solid rgba(220,38,38,0.3)",
            backgroundColor: reviewing
              ? "rgba(220,38,38,0.05)"
              : "rgba(220,38,38,0.06)",
            color: reviewing ? "text.disabled" : "#dc2626",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            "&:hover": reviewing
              ? {}
              : { backgroundColor: "rgba(220,38,38,0.12)" },
          }}
        >
          <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />
          Reject
        </Box>
        <Box
          onClick={reviewing ? undefined : onApprove}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
            cursor: reviewing ? "default" : "pointer",
            backgroundColor: reviewing ? "rgba(109,40,217,0.08)" : "#6d28d9",
            color: reviewing ? "text.disabled" : "#fff",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            "&:hover": reviewing ? {} : { backgroundColor: "#5b21b6" },
          }}
        >
          <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />
          Approve
        </Box>
      </Box>
    </Dialog>
  );
}
