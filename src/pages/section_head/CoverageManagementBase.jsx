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
} from "@mui/material";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import { useSearchParams, useLocation } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMoreOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLessOutlined";
import ViewActionButton from "../../components/common/ViewActionButton";
import NumberBadge from "../../components/common/NumberBadge";
import CoverageCompletionDialog from "../../components/section_head/CoverageCompletionDialog";
import { supabase } from "../../lib/supabaseClient";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import BrandedLoader from "../../components/common/BrandedLoader";
import { notifyAdmins } from "../../services/NotificationService";
import {
  CONTROL_RADIUS,
  FILTER_BUTTON_HEIGHT,
  FILTER_SEARCH_FLEX,
  FILTER_SEARCH_MAX_WIDTH,
  FILTER_SEARCH_MIN_WIDTH,
  MODAL_TAB_HEIGHT,
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
  Completed: { dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
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
  assignment?.status === "Completed" || !!assignment?.completed_at;
const isAssignmentOnGoing = (assignment) =>
  (assignment?.status === "On Going" || !!assignment?.timed_in_at) &&
  !isAssignmentCompleted(assignment);
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

// ── Small shared UI pieces ────────────────────────────────────────────────────
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
  const [toast, setToast] = useState({
    open: false,
    text: "",
    severity: "success",
  });
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
  const isErrorToast = toast.severity === "error";
  const toastAccent = isErrorToast ? RED : GOLD;
  const toastSurface = isDark ? "#1f1f23" : "#ffffff";
  const toastBorder = isDark ? "rgba(255,255,255,0.12)" : "#e8e8e8";
  const toastTitle = isErrorToast ? "Assignment Error" : "Assignment Update";

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
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [dayStaffers, setDayStaffers] = useState({});
  const [daySelected, setDaySelected] = useState({});
  const [dayAssigned, setDayAssigned] = useState({});
  const [staffersLoading, setStaffersLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [completionDetailsOpen, setCompletionDetailsOpen] = useState(false);
  const [selectedCompletionAssignment, setSelectedCompletionAssignment] =
    useState(null);
  const openedFromNotificationRef = useRef(null);

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

      const forAssignRows = forwardedData.filter((req) => {
        if (req.status !== "Forwarded") return false;
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
        const sectionAssignments = sectionAssignmentsOf(req);
        return (
          sectionAssignments.length > 0 &&
          sectionAssignments.every(isAssignmentCompleted)
        );
      };
      const isSectionOnGoing = (req) =>
        sectionAssignmentsOf(req).some(isAssignmentOnGoing);

      const sectionCompletedRows = allProgressRows.filter(isSectionCompleted);
      const completedIds = new Set(sectionCompletedRows.map((r) => r.id));
      const sectionOnGoingRows = allProgressRows.filter(
        (req) => !completedIds.has(req.id) && isSectionOnGoing(req),
      );
      const onGoingIds = new Set(sectionOnGoingRows.map((r) => r.id));

      const cleanAssigned = assignedData.filter(
        (req) => !onGoingIds.has(req.id) && !completedIds.has(req.id),
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
      setForApprovalReqs(forApproval.data || []);
      setAssignedReqs(cleanAssigned);
      setOnGoingReqs(Array.from(mergedOnGoing.values()));
      setCompletedReqs(Array.from(mergedCompleted.values()));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) loadAll();
  }, [currentUser, loadAll]);
  useRealtimeNotify("coverage_assignments", loadAll, null, {
    title: "Assignment",
  });

  // ── Bulk actions ──────────────────────────────────────────────────────────
  const handleBulkArchive = async (ids) => {
    if (!currentUser?.id || !ids?.length) return;
    setError("");
    setToast((prev) => ({ ...prev, open: false, text: "" }));
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
    setToast({
      open: true,
      text: `${ids.length} request(s) moved to archive.`,
      severity: "success",
    });
    loadAll();
  };
  const handleBulkTrash = async (ids) => {
    if (!currentUser?.id || !ids?.length) return;
    setError("");
    setToast((prev) => ({ ...prev, open: false, text: "" }));
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
    setToast({
      open: true,
      text: `${ids.length} request(s) moved to trash.`,
      severity: "success",
    });
    loadAll();
  };
  const handleArchive = async (row) => {
    if (!currentUser?.id || !row?.id) return;
    setError("");
    setToast((prev) => ({ ...prev, open: false, text: "" }));
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
    setToast({
      open: true,
      text: "Request moved to archive.",
      severity: "success",
    });
    loadAll();
  };
  const handleTrash = async (row) => {
    if (!currentUser?.id || !row?.id) return;
    setError("");
    setToast((prev) => ({ ...prev, open: false, text: "" }));
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
    setToast({
      open: true,
      text: "Request moved to trash.",
      severity: "success",
    });
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
        if (!weekend && dutyDay !== null) {
          const { data: semester } = await supabase
            .from("semesters")
            .select("id")
            .eq("is_active", true)
            .single();
          if (semester?.id) {
            const { data: dutySchedules } = await supabase
              .from("duty_schedules")
              .select("staffer_id")
              .eq("semester_id", semester.id)
              .eq("duty_day", dutyDay);
            const eligibleIds = new Set(
              (dutySchedules || []).map((d) => d.staffer_id),
            );
            eligibleProfiles = allProfiles.filter((p) => eligibleIds.has(p.id));
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
      setDaySelected({});
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
    [loadStaffersForDate, currentUser?.section],
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
      openAssignDialog(request);
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
      setViewFilter("for-assignment");
      setToast({
        open: true,
        text: "Assignment already saved. Please submit for approval when ready.",
        severity: "success",
      });
      return;
    }

    setAssignLoading(true);
    setAssignError("");
    try {
      const rows = [];
      const buildRows = (stafferIds, dateStr, fromTime, toTime) => {
        stafferIds.forEach((stafferId) => {
          const serviceKeys = getServiceKeysForAssignment(req);
          if (serviceKeys.length === 0) {
            rows.push({
              request_id: req.id,
              assigned_to: stafferId,
              assigned_by: currentUser.id,
              section: currentUser.section,
              assignment_date: dateStr,
              from_time: fromTime,
              to_time: toTime,
            });
          } else {
            serviceKeys.forEach((serviceKey) => {
              rows.push({
                request_id: req.id,
                assigned_to: stafferId,
                assigned_by: currentUser.id,
                section: currentUser.section,
                service_key: serviceKey,
                assignment_date: dateStr,
                from_time: fromTime,
                to_time: toTime,
              });
            });
          }
        });
      };

      if (isMultiDay) {
        req.event_days.forEach((dayObj) => {
          const stafferIds = daySelected[dayObj.date] || [];
          buildRows(stafferIds, dayObj.date, dayObj.from_time, dayObj.to_time);
        });
      } else {
        buildRows(
          daySelected[req.event_date] || [],
          req.event_date,
          req.from_time,
          req.to_time,
        );
      }

      if (rows.length === 0) {
        setAssignError("No staffers selected.");
        setAssignLoading(false);
        return;
      }

      const { error: assignErr } = await supabase
        .from("coverage_assignments")
        .insert(rows);
      if (assignErr) throw assignErr;

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

      // Note: Status is NOT changed here. Assignments are saved but status
      // remains "For Assignment" until SEC head submits for approval.
      // handleSubmitForApproval() will handle the status transition.

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
      setViewFilter("for-assignment");
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
    getServiceKeysForAssignment,
  ]);

  const handleSubmitForApproval = async (requestId) => {
    setSubmitLoading(true);
    try {
      const { data: req } = await supabase
        .from("coverage_requests")
        .select("title, forwarded_sections, submitted_sections, status")
        .eq("id", requestId)
        .single();

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
        });
      }
      setConfirmRequest(null);
      setPostAssignReview(null);
      await loadAll();
      setViewFilter("for-approval");
      setToast({
        open: true,
        text: allSectionsSubmitted
          ? "Submitted for approval. All sections are complete and the request is now queued for admin review."
          : "Submission saved for your section. Other sections still need to submit their assignments.",
        severity: "success",
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Row builder ───────────────────────────────────────────────────────────
  const buildRows = (source) =>
    source.map((req) => {
      const rowView = req._sectionHeadView || viewFilter;
      const sectionAssignments = (req.coverage_assignments || []).filter(
        (a) => a.section === currentUser?.section,
      );
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

      const isMultiDay = !!(req.is_multiday && req.event_days?.length > 0);
      const assignedDates = new Set(
        sectionAssignments.map((a) => a.assignment_date),
      );
      const totalDays = isMultiDay ? req.event_days?.length || 1 : 1;
      const assignedDayCount = isMultiDay
        ? (req.event_days || []).filter((d) => assignedDates.has(d.date)).length
        : sectionAssignments.length > 0
          ? 1
          : 0;

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
        myHasAssignments: sectionAssignments.length > 0,
        myDone: assignedDayCount >= totalDays,
        myPartial: assignedDayCount > 0 && assignedDayCount < totalDays,
        assignedDayCount,
        totalDays,
        venue: req.venue || "—",
        assignments: req.coverage_assignments || [],
        rowView,
        stageLabel: VIEW_LABEL_BY_KEY[rowView] || req.status,
        _raw: req,
      };
    });

  // ── Column definitions ────────────────────────────────────────────────────
  const titleCol = {
    field: "title",
    headerName: "Event Title",
    flex: 1.4,
    minWidth: 180,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            fontWeight: 500,
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
                setSelectedCompletionAssignment(p.row);
                setCompletionDetailsOpen(true);
              }}
            >
              View Details
            </ViewActionButton>
          )}
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
          px: 1.25,
          py: 1,
          borderRadius: "10px",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f3f3f4",
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

        <FormControl size="small" sx={{ minWidth: 168 }}>
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
                {getSemesterDisplayName(s)}
                {s.is_active ? " (Active)" : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Staffer */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
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
        <Box
          onClick={handleExportCsv}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            height: FILTER_BUTTON_HEIGHT,
            borderRadius: CONTROL_RADIUS,
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
              <BrandedLoader size={40} inline />
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
                ["on-going", "completed"].includes(viewFilter) ? 60 : 56
              }
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
          )}
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
              onToast={({ text, severity = "success" }) =>
                setToast({ open: true, text, severity })
              }
            />
          )}
          {settingsTab === 1 && (
            <RoleTrashManagement
              role="sec_head"
              embedded
              onStateChange={loadAll}
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

      {/* ── Completion Details Dialog ── */}
      <CoverageCompletionDialog
        open={completionDetailsOpen}
        assignment={selectedCompletionAssignment}
        isDark={isDark}
        border={border}
        onClose={() => setCompletionDetailsOpen(false)}
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
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
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
              width: 2.5,
              height: 26,
              borderRadius: "2px",
              backgroundColor: GOLD,
              flexShrink: 0,
            }}
          />
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
            borderRadius: "8px",
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
              color: isAlreadyAssigned ? "#15803d" : "text.secondary",
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
      PaperProps={{
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
          <Box
            sx={{
              width: 2.5,
              height: 26,
              borderRadius: "2px",
              backgroundColor: GOLD,
              flexShrink: 0,
            }}
          />
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
              borderRadius: "8px",
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
      PaperProps={{
        sx: {
          borderRadius: "14px",
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
