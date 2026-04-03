// src/pages/section_head/SecHeadAssignmentManagement.jsx
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
  FormGroup,
  useTheme,
  ClickAwayListener,
  GlobalStyles,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "../../components/common/AppDataGrid";
import { useSearchParams, useLocation } from "react-router-dom";
import CloseIcon from "@mui/icons-material/Close";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ArchiveManagement from "./ArchiveManagement";
import TrashManagement from "./TrashManagement";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FilterListIcon from "@mui/icons-material/FilterList";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import { supabase } from "../../lib/supabaseClient";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import {
  notifyAdmins,
  notifyClient,
  notifySpecificStaff,
} from "../../services/NotificationService";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_18 = "rgba(245,197,43,0.18)";
const CHARCOAL = "#353535";
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

const TABS = [
  { label: "For Assignment", key: "for-assignment" },
  { label: "Assigned", key: "assigned" },
  { label: "On Going", key: "on-going" },
  { label: "Completed", key: "completed" },
];

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

// ── Status pill ───────────────────────────────────────────────────────────────
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

// ── Event Type pill ───────────────────────────────────────────────────────────
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
        sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}
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
                  width: 28,
                  height: 28,
                  fontSize: "0.65rem",
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
      {popoverContent}
    </Box>
  );
}

// ── FIX 2: Column menu GlobalStyles — fixed broken template literal ───────────
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
        // FIX: was mixing " and ` — now all consistent double quotes
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function SecHeadAssignmentManagement() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;
  const location = useLocation();

  const [tab, setTab] = useState(() => {
    const incoming = location.state?.tab;
    if (!incoming) return 0;
    const idx = TABS.findIndex((t) => t.key === incoming);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    const incoming = location.state?.tab;
    if (!incoming) return;
    const idx = TABS.findIndex((t) => t.key === incoming);
    if (idx >= 0) setTab(idx);
  }, [location.state?.tab]);

  const [currentUser, setCurrentUser] = useState(null);
  const [forAssignmentReqs, setForAssignmentReqs] = useState([]);
  const [assignedReqs, setAssignedReqs] = useState([]);
  const [onGoingReqs, setOnGoingReqs] = useState([]);
  const [completedReqs, setCompletedReqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [semesters, setSemesters] = useState([]);
  const [activeSemesterId, setActiveSemesterId] = useState("all");
  const [allStaffers, setAllStaffers] = useState([]);
  const [stafferFilter, setStafferFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState(0);
  const [semRange, setSemRange] = useState(null);

  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedDayIdx, setSelectedDayIdx] = useState(0);
  const [dayStaffers, setDayStaffers] = useState({});
  const [daySelected, setDaySelected] = useState({});
  const [dayAssigned, setDayAssigned] = useState({});
  const [staffersLoading, setStaffersLoading] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);
  const [confirmRequest, setConfirmRequest] = useState(null);

  // ── Emergency reassignment state ──────────────────────────────────────────
  const [noShowAlerts, setNoShowAlerts] = useState([]);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [reassignTarget, setReassignTarget] = useState(null);
  const [reassignPool, setReassignPool] = useState([]);
  const [reassignPoolLoading, setReassignPoolLoading] = useState(false);
  const [reassignSelected, setReassignSelected] = useState(null);
  const [reassignLoading, setReassignLoading] = useState(false);
  const [reassignError, setReassignError] = useState("");
  const noShowNotifiedRef = useRef(new Set());

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
        .select("id, name, label, start_date, end_date, is_active")
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
    if (!activeSemesterId || activeSemesterId === "all") {
      setSemRange(null);
      return;
    }
    const sem = semesters.find((s) => s.id === activeSemesterId);
    setSemRange(
      sem ? { start_date: sem.start_date, end_date: sem.end_date } : null,
    );
  }, [activeSemesterId, semesters]);

  const loadAll = useCallback(async () => {
    if (!currentUser?.section) return;
    setLoading(true);
    setError("");
    try {
      const baseSelect = `
        id, title, description, event_date, from_time, to_time,
        is_multiday, event_days, end_date,
        venue, services, status, contact_person, contact_info,
        file_url, forwarded_sections, submitted_sections, forwarded_at, submitted_at, requester_id,
        client_type:client_types ( id, name ),
        entity:client_entities ( id, name ),
        coverage_assignments (
          id, status, assigned_to, assigned_by, section, service, timed_in_at, completed_at,
          assignment_date, from_time, to_time,
          staffer:profiles!assigned_to ( id, full_name, section, role, avatar_url ),
          assigner:assigned_by ( id, section, full_name )
        )
      `;

      const [allForwarded, assignedAndApproval, onGoing, completed, userState] =
        await Promise.all([
          supabase
            .from("coverage_requests")
            .select(baseSelect)
            .in("status", ["Forwarded", "Assigned", "For Approval"])
            .contains("forwarded_sections", [currentUser.section])
            .is("archived_at", null)
            .is("trashed_at", null)
            .order("forwarded_at", { ascending: false }),
          supabase
            .from("coverage_requests")
            .select(baseSelect)
            .in("status", ["Assigned", "For Approval", "Approved"])
            .contains("forwarded_sections", [currentUser.section])
            .is("archived_at", null)
            .is("trashed_at", null)
            .order("event_date", { ascending: true }),
          supabase
            .from("coverage_requests")
            .select(baseSelect)
            .eq("status", "On Going")
            .contains("forwarded_sections", [currentUser.section])
            .is("archived_at", null)
            .is("trashed_at", null)
            .order("event_date", { ascending: true }),
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
            .is("archived_at", null)
            .is("trashed_at", null)
            .order("event_date", { ascending: false }),
          supabase
            .from("request_user_state")
            .select("request_id")
            .eq("user_id", currentUser.id),
        ]);

      if (
        allForwarded.error ||
        assignedAndApproval.error ||
        onGoing.error ||
        completed.error
      )
        throw (
          allForwarded.error ||
          assignedAndApproval.error ||
          onGoing.error ||
          completed.error
        );

      const hiddenIds = new Set((userState.data || []).map((r) => r.request_id));
      const exclude = (rows) => (rows || []).filter((r) => !hiddenIds.has(r.id));

      const mySection = currentUser.section;
      const forwardedData = exclude(allForwarded.data);

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

      const forwardedButMySecDone = forwardedData.filter((req) => {
        if (req.status !== "Forwarded") return false;
        const myAssignments = (req.coverage_assignments || []).filter(
          (a) => a.section === mySection,
        );
        if (!req.is_multiday) return myAssignments.length > 0;
        const assignedDates = new Set(
          myAssignments.map((a) => a.assignment_date),
        );
        const allDates = (req.event_days || []).map((d) => d.date);
        return allDates.every((d) => assignedDates.has(d));
      });

      const assignedMap = new Map();
      [...forwardedButMySecDone, ...exclude(assignedAndApproval.data)].forEach(
        (r) => assignedMap.set(r.id, r),
      );
      const assignedRows = Array.from(assignedMap.values()).sort(
        (a, b) => new Date(a.event_date) - new Date(b.event_date),
      );

      setForAssignmentReqs(forAssignRows);
      setAssignedReqs(assignedRows);
      setOnGoingReqs(exclude(onGoing.data));
      setCompletedReqs(exclude(completed.data));
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

  const handleArchive = async (id) => {
    const ts = new Date().toISOString();
    await supabase.from("request_user_state").upsert({ user_id: currentUser.id, request_id: id, archived_at: ts, trashed_at: null, purged_at: null }, { onConflict: "user_id,request_id" });
    loadAll();
  };
  const handleTrash = async (id) => {
    const ts = new Date().toISOString();
    await supabase.from("request_user_state").upsert({ user_id: currentUser.id, request_id: id, archived_at: null, trashed_at: ts, purged_at: null }, { onConflict: "user_id,request_id" });
    loadAll();
  };
  const handleBulkArchive = async (ids) => {
    const ts = new Date().toISOString();
    const rows = ids.map((rid) => ({ user_id: currentUser.id, request_id: rid, archived_at: ts, trashed_at: null, purged_at: null }));
    await supabase.from("request_user_state").upsert(rows, { onConflict: "user_id,request_id" });
    loadAll();
  };
  const handleBulkTrash = async (ids) => {
    const ts = new Date().toISOString();
    const rows = ids.map((rid) => ({ user_id: currentUser.id, request_id: rid, archived_at: null, trashed_at: ts, purged_at: null }));
    await supabase.from("request_user_state").upsert(rows, { onConflict: "user_id,request_id" });
    loadAll();
  };

  // ── Request browser notification permission once on mount ─────────────────
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ── No-show detection: runs every 60 s ────────────────────────────────────
  useEffect(() => {
    const TWO_MIN = 2 * 60 * 1000;

    const detect = () => {
      if (!assignedReqs.length || !currentUser?.section) return;
      const now = Date.now();
      const found = [];

      assignedReqs.forEach((req) => {
        if (req.status !== "Approved") return;
        (req.coverage_assignments || []).forEach((a) => {
          const belongsToMe =
            a.section === currentUser.section ||
            a.assigner?.section === currentUser.section;
          if (!belongsToMe) return;
          if (a.timed_in_at) return;
          if (a.status === "No-show" || a.status === "Cancelled") return;

          const aDateStr = a.assignment_date || req.event_date;
          const aFromTime = (a.from_time || req.from_time || "").slice(0, 5);
          const aStart = new Date(`${aDateStr}T${aFromTime}`).getTime();
          // Window closed = event start + 2 min has passed
          if (now <= aStart + TWO_MIN) return;
          // Skip stale (> 24 h)
          if (now > aStart + 24 * 60 * 60 * 1000) return;

          if (found.some((f) => f.assignmentId === a.id)) return;

          found.push({
            assignmentId: a.id,
            requestId: req.id,
            reqTitle: req.title || "Untitled",
            requesterId: req.requester_id || null,
            stafferId: a.assigned_to,
            stafferName: a.staffer?.full_name || "Unknown",
            assignDate: aDateStr,
            fromTime: a.from_time || req.from_time,
            toTime: a.to_time || req.to_time,
          });

          // Browser notification — once per assignment
          if (
            !noShowNotifiedRef.current.has(a.id) &&
            "Notification" in window
          ) {
            noShowNotifiedRef.current.add(a.id);
            const fire = () => {
              try {
                const n = new Notification(
                  "TGP — Emergency Reassignment Needed",
                  {
                    body: `${a.staffer?.full_name || "A staffer"} missed time-in for "${req.title || "an event"}". Tap to reassign.`,
                    icon: "/favicon.ico",
                    tag: `noshow-${a.id}`,
                    requireInteraction: true,
                  },
                );
                n.onclick = () => {
                  window.focus();
                  n.close();
                };
              } catch {
                /* silently ignore */
              }
            };
            if (Notification.permission === "granted") {
              fire();
            } else if (Notification.permission !== "denied") {
              Notification.requestPermission().then((p) => {
                if (p === "granted") fire();
              });
            }
          }
        });
      });

      setNoShowAlerts(found);
    };

    detect();
    const id = setInterval(detect, 60_000);
    return () => clearInterval(id);
  }, [assignedReqs, currentUser]);

  const loadReassignPool = useCallback(
    async (alert) => {
      if (!currentUser?.section) return;
      setReassignPoolLoading(true);
      try {
        const dutyDay = jsDateToDutyDay(alert.assignDate);

        // 1. Get active semester
        const { data: semester } = await supabase
          .from("semesters")
          .select("id")
          .eq("is_active", true)
          .single();

        // 2. Get on-duty staffer IDs for that day
        let onDutyIds = null;
        if (semester?.id && dutyDay !== null) {
          const { data: schedules } = await supabase
            .from("duty_schedules")
            .select("staffer_id")
            .eq("semester_id", semester.id)
            .eq("duty_day", dutyDay);
          onDutyIds = new Set((schedules || []).map((s) => s.staffer_id));
        }

        // 3. Get all active section staff (excluding the no-show staffer)
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, section, avatar_url")
          .eq("division", currentUser.division)
          .eq("role", "staff")
          .eq("is_active", true)
          .eq("section", currentUser.section)
          .neq("id", alert.stafferId);

        const candidates = (profiles || []).filter(
          (p) => onDutyIds === null || onDutyIds.has(p.id),
        );

        if (candidates.length === 0) {
          setReassignPool([]);
          return;
        }

        const ids = candidates.map((p) => p.id);

        // 4. Get assignments on the same date to check overlap
        const { data: dayAssignments } = await supabase
          .from("coverage_assignments")
          .select("assigned_to, from_time, to_time, status")
          .in("assigned_to", ids)
          .eq("assignment_date", alert.assignDate)
          .not(
            "status",
            "in",
            '("No-show","Cancelled","Completed","Coverage Complete")',
          );

        // 5. Count past no-shows per staffer
        const { data: noShows } = await supabase
          .from("coverage_assignments")
          .select("assigned_to")
          .in("assigned_to", ids)
          .eq("status", "No-show");

        const noShowCount = {};
        (noShows || []).forEach((r) => {
          noShowCount[r.assigned_to] = (noShowCount[r.assigned_to] || 0) + 1;
        });

        // 6. Classify availability
        const eFrom = (alert.fromTime || "00:00").slice(0, 5);
        const eTo = (alert.toTime || "23:59").slice(0, 5);

        const scored = candidates.map((p) => {
          const mine = (dayAssignments || []).filter(
            (a) => a.assigned_to === p.id,
          );
          let availability = "available";
          let freeAt = null;

          for (const a of mine) {
            const af = (a.from_time || "").slice(0, 5);
            const at = (a.to_time || "").slice(0, 5);
            const overlaps = af < eTo && at > eFrom;
            if (overlaps) {
              // Ends before event starts? → free after
              if (at <= eFrom) {
                availability = "free-after";
                freeAt = at;
              } else {
                availability = "busy";
                break;
              }
            }
          }

          return {
            ...p,
            availability,
            freeAt,
            noShowCount: noShowCount[p.id] || 0,
          };
        });

        // Sort: available → free-after → busy, then fewest no-shows
        const order = { available: 0, "free-after": 1, busy: 2 };
        scored.sort(
          (a, b) =>
            order[a.availability] - order[b.availability] ||
            a.noShowCount - b.noShowCount,
        );

        setReassignPool(scored);
      } catch {
        setReassignPool([]);
      } finally {
        setReassignPoolLoading(false);
      }
    },
    [currentUser],
  );

  const openReassignDialog = useCallback(
    async (alert) => {
      setReassignTarget(alert);
      setReassignSelected(null);
      setReassignError("");
      setReassignPool([]);
      setReassignOpen(true);
      await loadReassignPool(alert);
      // Pre-select best candidate
      setReassignSelected((prev) => prev); // will be set after pool loads below
    },
    [loadReassignPool],
  );

  // Pre-select top available candidate once pool loads
  useEffect(() => {
    if (!reassignOpen || reassignPoolLoading || reassignPool.length === 0)
      return;
    if (!reassignSelected) {
      const best =
        reassignPool.find((s) => s.availability === "available") ||
        reassignPool[0];
      setReassignSelected(best);
    }
  }, [reassignPool, reassignPoolLoading, reassignOpen, reassignSelected]);

  const handleQuickConfirm = useCallback(
    async (alert, staffer) => {
      if (!staffer || !currentUser) return;
      try {
        await supabase
          .from("coverage_assignments")
          .update({
            status: "No-show",
            cancelled_at: new Date().toISOString(),
            cancellation_reason:
              "Missed time-in window — emergency reassignment",
          })
          .eq("id", alert.assignmentId);

        await supabase.from("coverage_assignments").insert({
          request_id: alert.requestId,
          assigned_to: staffer.id,
          assigned_by: currentUser.id,
          section: staffer.section || currentUser.section,
          assignment_date: alert.assignDate,
          from_time: alert.fromTime,
          to_time: alert.toTime,
          is_reassigned: true,
        });

        await supabase.from("notifications").insert({
          user_id: staffer.id,
          recipient_id: staffer.id,
          recipient_role: "staff",
          request_id: alert.requestId,
          type: "emergency_assignment",
          title: "Emergency Assignment",
          message: `You've been urgently reassigned to "${alert.reqTitle}". Check in immediately.`,
          is_read: false,
          created_by: currentUser.id,
        });

        // Notify the no-show staffer — formal record in their notification history
        await notifySpecificStaff({
          staffIds: [alert.stafferId],
          type: "no_show",
          title: "Assignment Marked No Show",
          message: `Your assignment for "${alert.reqTitle}" was marked No Show due to missed time-in. Please contact your section head.`,
          requestId: alert.requestId,
          createdBy: currentUser.id,
        });

        // Notify admins — accountability and visibility
        await notifyAdmins({
          type: "no_show",
          title: "No Show — Emergency Reassignment Made",
          message: `${alert.stafferName} missed time-in for "${alert.reqTitle}". ${staffer.full_name} has been reassigned as emergency coverage.`,
          requestId: alert.requestId,
          createdBy: currentUser.id,
        });

        // Notify client — reassurance that coverage is still happening
        if (alert.requesterId) {
          await notifyClient({
            requesterId: alert.requesterId,
            type: "coverage_update",
            title: "Coverage Update",
            message: `A replacement staffer has been assigned for "${alert.reqTitle}". Your coverage will proceed as scheduled.`,
            requestId: alert.requestId,
            createdBy: currentUser.id,
          });
        }

        await loadAll();
      } catch {
        /* banner stays visible if it fails */
      }
    },
    [currentUser, loadAll],
  );

  const handleReassign = useCallback(async () => {
    if (!reassignTarget || !reassignSelected || !currentUser) return;
    setReassignLoading(true);
    setReassignError("");
    try {
      await handleQuickConfirm(reassignTarget, reassignSelected);
      setReassignOpen(false);
      setReassignTarget(null);
      setReassignSelected(null);
    } catch (err) {
      setReassignError(err.message);
    } finally {
      setReassignLoading(false);
    }
  }, [reassignTarget, reassignSelected, currentUser, handleQuickConfirm]);

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

        setDayStaffers((prev) => ({
          ...prev,
          [dateStr]: { primary, others },
        }));
      } finally {
        setStaffersLoading(false);
      }
    },
    [currentUser],
  );

  const openAssignDialog = useCallback(
    async (req) => {
      setAssignError("");
      setSelectedRequest(req);
      setSelectedDayIdx(0);
      setDaySelected({});
      setDayStaffers({});

      const isMultiDay = !!(req.is_multiday && req.event_days?.length > 0);
      const dates = isMultiDay
        ? req.event_days.map((d) => d.date)
        : [req.event_date];

      const { data: existing } = await supabase
        .from("coverage_assignments")
        .select(
          "assigned_to, assignment_date, staffer:profiles!assigned_to ( full_name, section )",
        )
        .eq("request_id", req.id);

      const byDate = {};
      dates.forEach((d) => {
        byDate[d] = [];
      });
      (existing || []).forEach((a) => {
        const key = a.assignment_date || dates[0];
        if (!byDate[key]) byDate[key] = [];
        byDate[key].push(a);
      });
      setDayAssigned(byDate);
      await loadStaffersForDate(dates[0]);
    },
    [currentUser, loadStaffersForDate],
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

  const getServiceKeysForAssignment = useCallback(
    (request, stafferId) => {
      const section = currentUser?.section;
      const serviceKeys = SECTION_SERVICE_KEYS[section] || [];
      return serviceKeys.filter((key) => (request.services?.[key] || 0) > 0);
    },
    [currentUser],
  );

  const handleAssign = useCallback(async () => {
    if (!selectedRequest || !currentUser) return;
    const isMultiDay = !!(
      selectedRequest.is_multiday && selectedRequest.event_days?.length > 0
    );

    const totalSelected = Object.values(daySelected).flat().length;
    const totalAlreadyAssigned = Object.values(dayAssigned).flat().length;

    if (totalSelected === 0 && totalAlreadyAssigned === 0) {
      setAssignError(
        "Please select at least one staffer for at least one day.",
      );
      return;
    }
    if (totalSelected === 0 && totalAlreadyAssigned > 0) {
      setSelectedRequest(null);
      await loadAll();
      setTab(1);
      return;
    }

    setAssignLoading(true);
    setAssignError("");
    try {
      const rows = [];

      if (isMultiDay) {
        selectedRequest.event_days.forEach((dayObj) => {
          const stafferIds = daySelected[dayObj.date] || [];
          stafferIds.forEach((stafferId) => {
            const dayData = dayStaffers[dayObj.date] || {
              primary: [],
              others: [],
            };
            const allForDay = [
              ...(dayData.primary || []),
              ...(dayData.others || []),
            ];
            const stafferProfile = allForDay.find((s) => s.id === stafferId);

            rows.push({
              request_id: selectedRequest.id,
              assigned_to: stafferId,
              assigned_by: currentUser.id,
              section: stafferProfile?.section || currentUser.section,
              assignment_date: dayObj.date,
              from_time: dayObj.from_time,
              to_time: dayObj.to_time,
            });
          });
        });
      } else {
        const stafferIds = daySelected[selectedRequest.event_date] || [];
        const dayData = dayStaffers[selectedRequest.event_date] || {
          primary: [],
          others: [],
        };
        const allForDay = [
          ...(dayData.primary || []),
          ...(dayData.others || []),
        ];
        stafferIds.forEach((stafferId) => {
          const stafferProfile = allForDay.find((s) => s.id === stafferId);

          rows.push({
            request_id: selectedRequest.id,
            assigned_to: stafferId,
            assigned_by: currentUser.id,
            section: stafferProfile?.section || currentUser.section,
            assignment_date: selectedRequest.event_date,
            from_time: selectedRequest.from_time,
            to_time: selectedRequest.to_time,
          });
        });
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

      const forwardedSections = selectedRequest.forwarded_sections || [];
      let allAssigned = forwardedSections.length === 0;
      if (!allAssigned) {
        const { data: existing } = await supabase
          .from("coverage_assignments")
          .select("section")
          .eq("request_id", selectedRequest.id);
        const assignedSections = new Set(
          (existing || []).map((a) => a.section),
        );
        allAssigned = forwardedSections.every((s) => assignedSections.has(s));
      }
      if (allAssigned)
        await supabase
          .from("coverage_requests")
          .update({ status: "Assigned" })
          .eq("id", selectedRequest.id);

      setSelectedRequest(null);
      await loadAll();
      setTab(1);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignLoading(false);
    }
  }, [
    selectedRequest,
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
        const { data: admins } = await supabase
          .from("profiles")
          .select("id")
          .eq("role", "admin")
          .eq("is_active", true);

        if (admins && admins.length > 0) {
          await supabase.from("notifications").insert(
            admins.map((admin) => ({
              user_id: admin.id,
              recipient_id: admin.id,
              recipient_role: "admin",
              request_id: requestId,
              type: "for_approval",
              title: "Assignment Ready for Approval",
              message: `All sections have submitted their staff assignments for "${req?.title || "a coverage request"}" — ready for your approval.`,
              is_read: false,
            })),
          );
        }
      }

      setConfirmRequest(null);
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

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
              (a.assigner?.section === currentUser?.section ||
                a.section === currentUser?.section),
          ),
        );
      }
      return filtered;
    },
    [semRange, stafferFilter, currentUser],
  );

  const activeFilterCount =
    (activeSemesterId !== "all" ? 1 : 0) + (stafferFilter !== "all" ? 1 : 0);

  const counts = useMemo(
    () => ({
      "for-assignment": applyFilters(forAssignmentReqs).length,
      assigned: applyFilters(assignedReqs).length,
      "on-going": applyFilters(onGoingReqs).length,
      completed: applyFilters(completedReqs).length,
    }),
    [applyFilters, forAssignmentReqs, assignedReqs, onGoingReqs, completedReqs],
  );

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

  const selectedSemLabel =
    semesters.find((s) => s.id === activeSemesterId)?.label ||
    semesters.find((s) => s.id === activeSemesterId)?.name;
  const selectedStafferName = allStaffers.find(
    (s) => s.id === stafferFilter,
  )?.full_name;

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
        <CircularProgress size={26} sx={{ color: GOLD }} />
      </Box>
    );

  // ── FIX 1 & 3: Outer wrapper uses height 100vh + flex column (no page scroll)
  // FIX 1 was JSX comment placed outside root element — now it's just regular code
  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 3 },
        height: "100vh",
        overflow: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "background.default",
        fontFamily: dm,
      }}
    >
      <ColumnMenuStyles isDark={isDark} border={border} />

      {/* Header — static */}
      <Box sx={{ mb: 2, flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "1.05rem",
            color: "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          Assignment Management
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            color: "text.secondary",
            mt: 0.3,
          }}
        >
          {tab === 0 &&
            `Requests forwarded to your section (${currentUser.section}). Assign staffers, then submit for admin approval.`}
          {tab === 1 &&
            `Requests with staffers assigned from your section (${currentUser.section}). Submit ready ones for admin approval.`}
          {tab === 2 &&
            `Coverage currently in progress — your section's staffers have timed in and are on-site.`}
          {tab === 3 &&
            `Completed coverage requests handled by your section (${currentUser.section}). Full time in, time out, and duration records.`}
        </Typography>
      </Box>

      {/* Tabs + filter — static */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          flexShrink: 0,
          mb: 2.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
            flex: 1,
          }}
        >
          {TABS.map((t, idx) => {
            const isActive = tab === idx;
            return (
              <Box
                key={t.key}
                onClick={() => setTab(idx)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 0.65,
                  borderRadius: "10px",
                  cursor: "pointer",
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
                {t.label}
                {counts[t.key] > 0 && (
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
                          ? "rgba(255,255,255,0.08)"
                          : "rgba(53,53,53,0.07)",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        lineHeight: 1,
                        color: isActive ? "#fff" : "text.secondary",
                      }}
                    >
                      {counts[t.key]}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
          <Box sx={{ position: "relative", pb: "1px", flexShrink: 0 }}>
            <Box
              onClick={() => setFilterOpen((p) => !p)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.25,
                py: 0.55,
                borderRadius: "10px",
                cursor: "pointer",
                border: `1px solid ${activeFilterCount > 0 ? "rgba(245,197,43,0.6)" : border}`,
                backgroundColor:
                  activeFilterCount > 0 ? GOLD_08 : "transparent",
                fontFamily: dm,
                fontSize: "0.76rem",
                fontWeight: 500,
                color: activeFilterCount > 0 ? "#b45309" : "text.secondary",
                transition: "all 0.15s",
                "&:hover": {
                  borderColor: "rgba(245,197,43,0.6)",
                  color: "#b45309",
                  backgroundColor: GOLD_08,
                },
              }}
            >
              <FilterListIcon sx={{ fontSize: 15 }} />
              Filter
              {activeFilterCount > 0 && (
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "10px",
                    backgroundColor: GOLD,
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
                      color: CHARCOAL,
                      lineHeight: 1,
                    }}
                  >
                    {activeFilterCount}
                  </Typography>
                </Box>
              )}
            </Box>
            {filterOpen && (
              <Box
                onMouseDown={(e) => e.stopPropagation()}
                sx={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  right: 0,
                  width: 250,
                  zIndex: 1300,
                  borderRadius: "10px",
                  overflow: "hidden",
                  border: `1px solid ${border}`,
                  backgroundColor: "background.paper",
                  boxShadow: isDark
                    ? "0 12px 40px rgba(0,0,0,0.5)"
                    : "0 4px 24px rgba(53,53,53,0.12)",
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
                      fontSize: "0.76rem",
                      fontWeight: 700,
                      color: "text.primary",
                    }}
                  >
                    Filter
                  </Typography>
                  {activeFilterCount > 0 && (
                    <Box
                      onClick={() => {
                        setActiveSemesterId("all");
                        setStafferFilter("all");
                      }}
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.72rem",
                        color: "text.secondary",
                        cursor: "pointer",
                        "&:hover": { color: CHARCOAL },
                      }}
                    >
                      Clear all
                    </Box>
                  )}
                </Box>
                <Box
                  sx={{
                    px: 2,
                    py: 1.75,
                    display: "flex",
                    flexDirection: "column",
                    gap: 1.5,
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
                    }}
                  >
                    Semester
                  </Typography>
                  <Box
                    sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                  >
                    {[
                      { id: "all", name: "All Semesters" },
                      ...semesters.map((s) => ({
                        id: s.id,
                        name:
                          (s.label || s.name) +
                          (s.is_active ? " (Active)" : ""),
                      })),
                    ].map((s) => (
                      <Box
                        key={s.id}
                        onClick={() => setActiveSemesterId(s.id)}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          px: 1.25,
                          py: 0.6,
                          borderRadius: "10px",
                          cursor: "pointer",
                          backgroundColor:
                            activeSemesterId === s.id ? GOLD_08 : "transparent",
                          "&:hover": {
                            backgroundColor:
                              activeSemesterId === s.id ? GOLD_08 : HOVER_BG,
                          },
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.78rem",
                            color:
                              activeSemesterId === s.id
                                ? "#b45309"
                                : "text.primary",
                            fontWeight: activeSemesterId === s.id ? 600 : 400,
                          }}
                        >
                          {s.name}
                        </Typography>
                        {activeSemesterId === s.id && (
                          <Box
                            sx={{
                              width: 5,
                              height: 5,
                              borderRadius: "50%",
                              backgroundColor: GOLD,
                            }}
                          />
                        )}
                      </Box>
                    ))}
                  </Box>
                  {allStaffers.length > 0 && (
                    <>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          color: "text.disabled",
                          textTransform: "uppercase",
                          letterSpacing: "0.09em",
                        }}
                      >
                        Staffer
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        {[
                          { id: "all", full_name: "All Staffers" },
                          ...allStaffers,
                        ].map((s) => (
                          <Box
                            key={s.id}
                            onClick={() => setStafferFilter(s.id)}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              px: 1.25,
                              py: 0.6,
                              borderRadius: "10px",
                              cursor: "pointer",
                              backgroundColor:
                                stafferFilter === s.id
                                  ? GOLD_08
                                  : "transparent",
                              "&:hover": {
                                backgroundColor:
                                  stafferFilter === s.id ? GOLD_08 : HOVER_BG,
                              },
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.78rem",
                                color:
                                  stafferFilter === s.id
                                    ? "#b45309"
                                    : "text.primary",
                                fontWeight: stafferFilter === s.id ? 600 : 400,
                              }}
                            >
                              {s.full_name}
                            </Typography>
                            {stafferFilter === s.id && (
                              <Box
                                sx={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: "50%",
                                  backgroundColor: GOLD,
                                }}
                              />
                            )}
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </ClickAwayListener>

        {/* ── Settings gear ── */}
        <Tooltip title="Archive & Trash" arrow>
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(true)}
            sx={{
              borderRadius: "10px",
              p: 0.7,
              border: `1px solid ${border}`,
              color: "text.secondary",
              transition: "all 0.15s",
              flexShrink: 0,
              "&:hover": {
                borderColor: "rgba(53,53,53,0.3)",
                color: "text.primary",
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : HOVER_BG,
              },
            }}
          >
            <SettingsOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Filter chips — static */}
      {activeFilterCount > 0 && (
        <Box
          sx={{
            display: "flex",
            gap: 0.75,
            mt: 1.5,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          {activeSemesterId !== "all" && (
            <FilterChip
              label={selectedSemLabel}
              onDelete={() => setActiveSemesterId("all")}
            />
          )}
          {stafferFilter !== "all" && (
            <FilterChip
              label={selectedStafferName}
              onDelete={() => setStafferFilter("all")}
            />
          )}
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mt: 1.5,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
            flexShrink: 0,
          }}
        >
          {error}
        </Alert>
      )}

      {/* ── Emergency no-show banner ─────────────────────────────────────── */}
      {noShowAlerts.length > 0 && (
        <Box
          sx={{
            mt: 1.5,
            flexShrink: 0,
            borderRadius: "10px",
            border: "1.5px solid #ef4444",
            backgroundColor: isDark ? "rgba(239,68,68,0.07)" : "#fff5f5",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: "1px solid rgba(239,68,68,0.2)",
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              backgroundColor: isDark
                ? "rgba(239,68,68,0.10)"
                : "rgba(239,68,68,0.06)",
            }}
          >
            <WarningAmberOutlinedIcon sx={{ fontSize: 16, color: "#ef4444" }} />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "#ef4444",
              }}
            >
              {noShowAlerts.length} staffer{noShowAlerts.length > 1 ? "s" : ""}{" "}
              missed time-in — emergency reassignment required
            </Typography>
          </Box>
          {/* Per-alert rows */}
          <Box sx={{ display: "flex", flexDirection: "column" }}>
            {noShowAlerts.map((al, idx) => {
              const suggested =
                reassignTarget?.assignmentId === al.assignmentId
                  ? reassignSelected
                  : null;
              // Find pre-computed suggestion from pool if dialog not open
              const poolSuggestion = null; // populated in dialog only
              return (
                <Box
                  key={al.assignmentId}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    px: 2,
                    py: 1.25,
                    flexWrap: "wrap",
                    borderBottom:
                      idx < noShowAlerts.length - 1
                        ? "1px solid rgba(239,68,68,0.12)"
                        : "none",
                  }}
                >
                  {/* No-show staffer info */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      flex: 1,
                      minWidth: 180,
                    }}
                  >
                    <Box
                      sx={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        backgroundColor: "#ef4444",
                        flexShrink: 0,
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        color: "text.primary",
                      }}
                    >
                      {al.stafferName}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.78rem",
                        color: "text.secondary",
                      }}
                    >
                      · {al.reqTitle}
                    </Typography>
                    {al.fromTime && (
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.74rem",
                          color: "text.disabled",
                        }}
                      >
                        · {fmtTimeStr(al.fromTime)}
                      </Typography>
                    )}
                  </Box>
                  {/* Action buttons */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      component="button"
                      onClick={() => openReassignDialog(al)}
                      sx={{
                        cursor: "pointer",
                        border: "1.5px solid #ef4444",
                        borderRadius: "10px",
                        px: 1.5,
                        py: 0.45,
                        background: "#ef4444",
                        fontFamily: dm,
                        fontSize: "0.73rem",
                        fontWeight: 700,
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        gap: 0.5,
                        transition: "background 0.15s",
                        "&:hover": { background: "#dc2626" },
                      }}
                    >
                      <PersonAddOutlinedIcon sx={{ fontSize: 13 }} />
                      Reassign
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ★ FIX 3: Table card fills remaining space — flex: 1, minHeight: 0 */}
      <Box
        sx={{
          mt: 2,
          flex: 1,
          minHeight: 0,
          bgcolor: "background.paper",
          borderRadius: "10px",
          border: `1px solid ${border}`,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading ? (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={26} sx={{ color: GOLD }} />
          </Box>
        ) : (
          <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
            {tab === 0 && (
              <ForAssignmentTab
                rows={applyFilters(forAssignmentReqs)}
                highlight={highlight}
                currentUser={currentUser}
                isDark={isDark}
                border={border}
                getPaxForSection={getPaxForSection}
                onAssign={openAssignDialog}
                onBulkArchive={handleBulkArchive}
                onBulkTrash={handleBulkTrash}
                onArchive={handleArchive}
                onTrash={handleTrash}
              />
            )}
            {tab === 1 && (
              <AssignedTab
                rows={applyFilters(assignedReqs)}
                highlight={highlight}
                currentUser={currentUser}
                isDark={isDark}
                border={border}
                submitLoading={submitLoading}
                onRequestConfirm={(row) => setConfirmRequest(row)}
                onBulkArchive={handleBulkArchive}
                onBulkTrash={handleBulkTrash}
                onArchive={handleArchive}
                onTrash={handleTrash}
              />
            )}
            {tab === 2 && (
              <OnGoingTab
                rows={applyFilters(onGoingReqs)}
                highlight={highlight}
                currentUser={currentUser}
                isDark={isDark}
                border={border}
                onBulkArchive={handleBulkArchive}
                onBulkTrash={handleBulkTrash}
                onArchive={handleArchive}
                onTrash={handleTrash}
              />
            )}
            {tab === 3 && (
              <CompletedTab
                rows={applyFilters(completedReqs)}
                highlight={highlight}
                currentUser={currentUser}
                isDark={isDark}
                border={border}
                onBulkArchive={handleBulkArchive}
                onBulkTrash={handleBulkTrash}
                onArchive={handleArchive}
                onTrash={handleTrash}
              />
            )}
          </Box>
        )}
      </Box>

      <AssignmentDialog
        open={!!selectedRequest}
        request={selectedRequest}
        onClose={() => !assignLoading && setSelectedRequest(null)}
        currentUser={currentUser}
        isDark={isDark}
        border={border}
        selectedDayIdx={selectedDayIdx}
        onSelectDay={(idx) => handleSelectDay(idx, selectedRequest)}
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

      <SubmitConfirmDialog
        open={!!confirmRequest}
        request={confirmRequest}
        isDark={isDark}
        border={border}
        loading={submitLoading}
        onCancel={() => !submitLoading && setConfirmRequest(null)}
        onConfirm={() => handleSubmitForApproval(confirmRequest.id)}
      />

      <ReassignDialog
        open={reassignOpen}
        target={reassignTarget}
        pool={reassignPool}
        poolLoading={reassignPoolLoading}
        selected={reassignSelected}
        onSelect={setReassignSelected}
        loading={reassignLoading}
        error={reassignError}
        isDark={isDark}
        border={border}
        onClose={() => !reassignLoading && setReassignOpen(false)}
        onConfirm={handleReassign}
      />

      {/* ── Settings Drawer (Archive / Trash) ── */}
      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 520, md: 600 },
            backgroundColor: "background.default",
            backgroundImage: "none",
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, pt: 2.5, pb: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SettingsOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
              <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.88rem", color: "text.primary", letterSpacing: "-0.01em" }}>
                Request Settings
              </Typography>
            </Box>
            <IconButton size="small" onClick={() => setSettingsOpen(false)} sx={{ color: "text.secondary" }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <Box sx={{ display: "flex", gap: "6px", px: 2.5, pb: 2 }}>
            {[
              { label: "Archive", icon: <ArchiveOutlinedIcon sx={{ fontSize: 13 }} /> },
              { label: "Trash", icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 13 }} /> },
            ].map((t, idx) => {
              const active = settingsTab === idx;
              return (
                <Box
                  key={t.label}
                  onClick={() => setSettingsTab(idx)}
                  sx={{
                    display: "inline-flex", alignItems: "center", gap: 0.5, px: 1.5, py: 0.55, borderRadius: "10px", cursor: "pointer",
                    fontFamily: dm, fontSize: "0.78rem", fontWeight: active ? 600 : 400,
                    color: active ? "#fff" : "text.secondary",
                    border: `1px solid ${active ? "#212121" : border}`,
                    backgroundColor: active ? "#212121" : "transparent",
                    transition: "all 0.12s",
                    "&:hover": active ? {} : { borderColor: "rgba(53,53,53,0.3)", color: isDark ? "#f5f5f5" : CHARCOAL },
                  }}
                >
                  {t.icon} {t.label}
                </Box>
              );
            })}
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, pb: 2.5 }}>
            {settingsTab === 0 && <ArchiveManagement embedded />}
            {settingsTab === 1 && <TrashManagement embedded />}
          </Box>
        </Box>
      </Drawer>
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
              borderRadius: "10px",
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
                    borderRadius: "10px",
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
            borderRadius: "10px",
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
          {!loading && <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}Confirm
          Submission
        </PrimaryBtn>
      </Box>
    </Dialog>
  );
}

// ── Reassign Dialog ─────────────────────────────────────────────────────────
function ReassignDialog({
  open,
  target,
  pool,
  poolLoading,
  selected,
  onSelect,
  loading,
  error,
  isDark,
  border,
  onClose,
  onConfirm,
}) {
  if (!target) return null;

  const AVAIL_CFG = {
    available: { color: "#16a34a", label: "Available" },
    "free-after": { color: "#d97706", label: null },
    busy: { color: "#ef4444", label: "Busy" },
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
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
          <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: "#ef4444" }} />
          <Typography
            sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.92rem" }}
          >
            Emergency Reassignment
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={loading}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Event info */}
      <Box sx={{ px: 3, pt: 2, pb: 0 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.76rem",
            color: "text.secondary",
            mb: 0.25,
          }}
        >
          <strong>{target.stafferName}</strong> did not time in for:
        </Typography>
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.85rem", fontWeight: 700, mb: 0.2 }}
        >
          {target.reqTitle}
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.74rem",
            color: "text.disabled",
            mb: 2,
          }}
        >
          {target.fromTime ? fmtTimeStr(target.fromTime) : ""}
          {target.toTime ? ` — ${fmtTimeStr(target.toTime)}` : ""}
        </Typography>

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.09em",
            mb: 1,
          }}
        >
          On-duty replacements
        </Typography>
      </Box>

      {/* Pool list */}
      <Box sx={{ px: 3, pb: 2, maxHeight: 260, overflowY: "auto" }}>
        {poolLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
            <CircularProgress size={22} sx={{ color: GOLD }} />
          </Box>
        ) : pool.length === 0 ? (
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.disabled",
              py: 1,
            }}
          >
            No on-duty staffers available.
          </Typography>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {pool.map((s, idx) => {
              const acol = getAvatarColor(s.id);
              const isSelected = selected?.id === s.id;
              const cfg = AVAIL_CFG[s.availability] || AVAIL_CFG["available"];
              const availLabel =
                s.availability === "free-after" && s.freeAt
                  ? `Free at ${fmtTimeStr(s.freeAt)}`
                  : cfg.label;
              return (
                <Box
                  key={s.id}
                  onClick={() => onSelect(s)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.25,
                    px: 1.5,
                    py: 1,
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: isSelected
                      ? "1.5px solid #ef4444"
                      : `1px solid ${border}`,
                    backgroundColor: isSelected
                      ? isDark
                        ? "rgba(239,68,68,0.10)"
                        : "rgba(239,68,68,0.05)"
                      : "transparent",
                    transition: "all 0.15s",
                    "&:hover": {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : HOVER_BG,
                    },
                  }}
                >
                  <Avatar
                    src={s.avatar_url || undefined}
                    sx={{
                      width: 30,
                      height: 30,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      bgcolor: acol.bg,
                      color: acol.color,
                      flexShrink: 0,
                    }}
                  >
                    {!s.avatar_url && getInitials(s.full_name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box
                      sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.8rem",
                          fontWeight: isSelected ? 700 : 500,
                        }}
                      >
                        {s.full_name}
                      </Typography>
                      {idx === 0 && (
                        <Box
                          sx={{
                            px: 0.8,
                            py: 0.15,
                            borderRadius: "10px",
                            backgroundColor: isDark
                              ? "rgba(245,197,43,0.12)"
                              : GOLD_08,
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              color: "#b45309",
                            }}
                          >
                            ★ Recommended
                          </Typography>
                        </Box>
                      )}
                    </Box>
                    {availLabel && (
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.66rem",
                          color: cfg.color,
                          fontWeight: 600,
                        }}
                      >
                        ● {availLabel}
                      </Typography>
                    )}
                  </Box>
                  {isSelected && (
                    <CheckCircleIcon
                      sx={{ fontSize: 16, color: "#ef4444", flexShrink: 0 }}
                    />
                  )}
                </Box>
              );
            })}
          </Box>
        )}
        {error && (
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.73rem",
              color: "#ef4444",
              mt: 1,
            }}
          >
            {error}
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
          component="button"
          onClick={onClose}
          disabled={loading}
          sx={{
            cursor: "pointer",
            border: `1px solid ${border}`,
            borderRadius: "10px",
            px: 2,
            py: 0.7,
            background: "transparent",
            fontFamily: dm,
            fontSize: "0.78rem",
            fontWeight: 600,
            color: "text.secondary",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : HOVER_BG,
            },
          }}
        >
          Cancel
        </Box>
        <Box
          component="button"
          onClick={onConfirm}
          disabled={loading || !selected}
          sx={{
            cursor: loading || !selected ? "not-allowed" : "pointer",
            border: "none",
            borderRadius: "10px",
            px: 2,
            py: 0.7,
            background: loading || !selected ? "#9ca3af" : "#ef4444",
            fontFamily: dm,
            fontSize: "0.78rem",
            fontWeight: 700,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            transition: "background 0.15s",
            "&:hover": {
              background: loading || !selected ? "#9ca3af" : "#dc2626",
            },
          }}
        >
          {loading && <CircularProgress size={12} sx={{ color: "#fff" }} />}
          Confirm Reassignment
        </Box>
      </Box>
    </Dialog>
  );
}

// ── For Assignment Tab ────────────────────────────────────────────────────────
// FIX: removed initialState={{ pinnedColumns }} — Pro only, crashes on free tier
function ForAssignmentTab({
  rows,
  highlight,
  currentUser,
  isDark,
  border,
  getPaxForSection,
  onAssign,
  onBulkArchive,
  onBulkTrash,
  onArchive,
  onTrash,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const mappedRows = rows.map((req) => {
    // Filter assignments by who assigned them (assigner's section head)
    // This correctly includes cross-assigned staff (e.g., Videojournalism staff assigned by Photo head)
    const myAssignments = (req.coverage_assignments || []).filter(
      (a) =>
        a.assigner?.section === currentUser?.section ||
        a.section === currentUser?.section,
    );
    const allSections = req.forwarded_sections || [];
    const otherSections = allSections.filter((s) => s !== currentUser?.section);
    const assignedSections = new Set(
      (req.coverage_assignments || [])
        .map((a) => a.assigner?.section || a.section)
        .filter(Boolean),
    );
    const pendingOthers = otherSections.filter((s) => !assignedSections.has(s));
    const isMultiDay = !!(req.is_multiday && req.event_days?.length > 0);
    const assignedDates = new Set(myAssignments.map((a) => a.assignment_date));
    const totalDays = isMultiDay ? req.event_days.length : 1;
    const assignedDayCount = isMultiDay
      ? req.event_days.filter((d) => assignedDates.has(d.date)).length
      : myAssignments.length > 0
        ? 1
        : 0;
    const myDone = assignedDayCount >= totalDays;
    const myPartial = !myDone && assignedDayCount > 0;
    return {
      id: req.id,
      requestTitle: req.title,
      client: req.entity?.name || "—",
      eventDate:
        isMultiDay && req.event_days?.length > 0
          ? `${fmtDateShort(req.event_days[0].date)} – ${fmtDateShort(req.event_days[req.event_days.length - 1].date)}`
          : req.event_date
            ? new Date(req.event_date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })
            : "—",
      eventType: isMultiDay,
      paxNeeded: getPaxForSection(req),
      dateForwarded: req.forwarded_at
        ? new Date(req.forwarded_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      myDone,
      myPartial,
      assignedDayCount,
      totalDays,
      pendingOthers,
      _raw: req,
    };
  });

  const columns = [
    {
      field: "requestTitle",
      headerName: "Event Title",
      flex: 1.4,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <CellText bold>{p.value}</CellText>
        </Box>
      ),
    },
    {
      field: "eventType",
      headerName: "Type",
      flex: 0.65,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <EventTypePill isMultiDay={p.value} isDark={isDark} />
        </Box>
      ),
    },
    {
      field: "client",
      headerName: "Client",
      flex: 0.9,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "eventDate",
      headerName: "Event Date",
      flex: 1,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "paxNeeded",
      headerName: "Pax",
      flex: 0.55,
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
    },
    {
      field: "dateForwarded",
      headerName: "Forwarded",
      flex: 0.85,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "actions",
      headerName: "",
      flex: 1.6,
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
            gap: 0.5,
            pr: 0.5,
          }}
        >
          {!p.row.myDone ? (
            <ActionChip onClick={() => onAssign(p.row._raw)} border={border}>
              <PersonAddOutlinedIcon sx={{ fontSize: 12 }} />
              {p.row.myPartial
                ? `Assign (${p.row.assignedDayCount}/${p.row.totalDays} days)`
                : "Assign"}
            </ActionChip>
          ) : (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 0.2,
                alignItems: "flex-end",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
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
                    fontWeight: 600,
                  }}
                >
                  Your section assigned
                </Typography>
              </Box>
              {p.row.pendingOthers.length > 0 && (
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.68rem",
                    color: "text.secondary",
                  }}
                >
                  Waiting: {p.row.pendingOthers.join(", ")}
                </Typography>
              )}
            </Box>
          )}
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuRow(p.row); }}>
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <>
    <DataGrid
      rows={mappedRows}
      columns={columns}
      hideFooter
      checkboxSelection
      disableRowSelectionOnClick
      selectionActions={[
        { label: "Archive", onClick: onBulkArchive },
        { label: "Move to Trash", onClick: onBulkTrash, color: "error" },
      ]}
      rowHeight={52}
      getRowClassName={(p) =>
        highlight && p.row.requestTitle?.toLowerCase().includes(highlight)
          ? "highlighted-row"
          : ""
      }
      sx={makeDataGridSx(isDark, border)}
    />
    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuRow(null); }} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { minWidth: 160, borderRadius: "10px", mt: 0.5, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" } } }}>
      <MenuItem onClick={() => { if (menuRow) onAssign(menuRow._raw); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}><ListItemIcon><VisibilityOutlinedIcon sx={{ fontSize: 18 }} /></ListItemIcon><ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}>View / Assign</ListItemText></MenuItem>
      <MenuItem onClick={() => { if (menuRow) onArchive(menuRow.id); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}><ListItemIcon><ArchiveOutlinedIcon sx={{ fontSize: 18 }} /></ListItemIcon><ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}>Archive</ListItemText></MenuItem>
      <MenuItem onClick={() => { if (menuRow) onTrash(menuRow.id); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1, color: "#dc2626" }}><ListItemIcon><DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: "#dc2626" }} /></ListItemIcon><ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem", color: "#dc2626" }}>Move to Trash</ListItemText></MenuItem>
    </Menu>
    </>
  );
}

// ── Assigned Tab ──────────────────────────────────────────────────────────────
function AssignedTab({
  rows,
  highlight,
  currentUser,
  isDark,
  border,
  submitLoading,
  onRequestConfirm,
  onBulkArchive,
  onBulkTrash,
  onArchive,
  onTrash,
}) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const mappedRows = rows.map((req) => {
    // Filter assignments by who assigned them (assigner's section head)
    // This correctly includes cross-assigned staff
    const sectionAssignments = (req.coverage_assignments || []).filter(
      (a) =>
        a.assigner?.section === currentUser?.section ||
        a.section === currentUser?.section,
    );
    const seen = new Set();
    const uniqueStaffers = sectionAssignments
      .filter((a) => {
        if (seen.has(a.assigned_to)) return false;
        seen.add(a.assigned_to);
        return true;
      })
      .map((a) => ({ ...a.staffer, id: a.assigned_to }));

    const myHasSubmitted = (req.submitted_sections || []).includes(
      currentUser?.section,
    );
    const myHasAssignments = sectionAssignments.length > 0;

    return {
      id: req.id,
      title: req.title,
      client: req.entity?.name || "—",
      eventDate: req.event_date
        ? new Date(req.event_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      eventType: !!(req.is_multiday && req.event_days?.length > 0),
      status: req.status,
      staffers: uniqueStaffers,
      myHasSubmitted,
      myHasAssignments,
    };
  });

  const columns = [
    {
      field: "title",
      headerName: "Event Title",
      flex: 1.2,
      renderCell: (p) => <CellText bold>{p.value}</CellText>,
    },
    {
      field: "eventType",
      headerName: "Type",
      flex: 0.65,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <EventTypePill isMultiDay={p.value} isDark={isDark} />
        </Box>
      ),
    },
    {
      field: "client",
      headerName: "Client",
      flex: 0.9,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "eventDate",
      headerName: "Event Date",
      flex: 0.9,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "staffers",
      headerName: "Staffers",
      flex: 0.65,
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
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.85,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <StatusPill status={p.value} isDark={isDark} />
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "",
      flex: 1.3,
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
          {p.row.status === "Approved" ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1.1,
                py: 0.3,
                borderRadius: "10px",
                backgroundColor: isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4",
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 12, color: "#22c55e" }} />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.73rem",
                  fontWeight: 600,
                  color: "#15803d",
                }}
              >
                Approved — awaiting coverage
              </Typography>
            </Box>
          ) : p.row.myHasSubmitted ? (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "#0369a1",
                fontStyle: "italic",
              }}
            >
              Submitted — awaiting admin approval
            </Typography>
          ) : p.row.myHasAssignments ? (
            <ActionChip
              onClick={() => onRequestConfirm(p.row)}
              disabled={submitLoading}
              border={isDark ? BORDER_DARK : BORDER}
            >
              <CheckCircleOutlinedIcon sx={{ fontSize: 12 }} /> Submit for
              Approval
            </ActionChip>
          ) : null}
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuRow(p.row); }}>
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <>
    <DataGrid
      rows={mappedRows}
      columns={columns}
      hideFooter
      checkboxSelection
      disableRowSelectionOnClick
      selectionActions={[
        { label: "Archive", onClick: onBulkArchive },
        { label: "Move to Trash", onClick: onBulkTrash, color: "error" },
      ]}
      rowHeight={52}
      getRowClassName={(p) =>
        highlight && p.row.title?.toLowerCase().includes(highlight)
          ? "highlighted-row"
          : ""
      }
      sx={makeDataGridSx(isDark, border)}
    />
    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuRow(null); }} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { minWidth: 160, borderRadius: "10px", mt: 0.5, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" } } }}>
      <MenuItem onClick={() => { if (menuRow) onArchive(menuRow.id); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}><ListItemIcon><ArchiveOutlinedIcon sx={{ fontSize: 18 }} /></ListItemIcon><ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}>Archive</ListItemText></MenuItem>
      <MenuItem onClick={() => { if (menuRow) onTrash(menuRow.id); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1, color: "#dc2626" }}><ListItemIcon><DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: "#dc2626" }} /></ListItemIcon><ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem", color: "#dc2626" }}>Move to Trash</ListItemText></MenuItem>
    </Menu>
    </>
  );
}

// ── On Going Tab ──────────────────────────────────────────────────────────────
function OnGoingTab({ rows, highlight, currentUser, isDark, border, onBulkArchive, onBulkTrash, onArchive, onTrash }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const mappedRows = rows.map((req) => {
    // Filter assignments by who assigned them (assigner's section head)
    // This correctly includes cross-assigned staff
    const sectionAssignments = (req.coverage_assignments || []).filter(
      (a) =>
        a.assigner?.section === currentUser?.section ||
        a.section === currentUser?.section,
    );
    const seen = new Set();
    const uniqueStaffers = sectionAssignments
      .filter((a) => {
        if (seen.has(a.assigned_to)) return false;
        seen.add(a.assigned_to);
        return true;
      })
      .map((a) => ({
        ...a.staffer,
        id: a.assigned_to,
        timed_in_at: a.timed_in_at,
      }));
    return {
      id: req.id,
      title: req.title,
      client: req.entity?.name || "—",
      eventDate: req.event_date
        ? new Date(req.event_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      eventType: !!(req.is_multiday && req.event_days?.length > 0),
      venue: req.venue || "—",
      staffers: uniqueStaffers,
    };
  });

  const columns = [
    {
      field: "title",
      headerName: "Event Title",
      flex: 1.2,
      renderCell: (p) => <CellText bold>{p.value}</CellText>,
    },
    {
      field: "eventType",
      headerName: "Type",
      flex: 0.65,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <EventTypePill isMultiDay={p.value} isDark={isDark} />
        </Box>
      ),
    },
    {
      field: "client",
      headerName: "Client",
      flex: 0.85,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "eventDate",
      headerName: "Event Date",
      flex: 0.85,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "venue",
      headerName: "Venue",
      flex: 0.85,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "staffers",
      headerName: "Staffers",
      flex: 0.65,
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
    },
    {
      field: "actions",
      headerName: "",
      flex: 0.4,
      minWidth: 56,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%", pr: 0.5 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuRow(p.row); }}>
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <>
    <DataGrid
      rows={mappedRows}
      columns={columns}
      hideFooter
      checkboxSelection
      disableRowSelectionOnClick
      selectionActions={[
        { label: "Archive", onClick: onBulkArchive },
        { label: "Move to Trash", onClick: onBulkTrash, color: "error" },
      ]}
      rowHeight={52}
      getRowClassName={(p) =>
        highlight && p.row.title?.toLowerCase().includes(highlight)
          ? "highlighted-row"
          : ""
      }
      sx={makeDataGridSx(isDark, border)}
    />
    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuRow(null); }} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { minWidth: 160, borderRadius: "10px", mt: 0.5, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" } } }}>
      <MenuItem onClick={() => { if (menuRow) onArchive(menuRow.id); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}><ListItemIcon><ArchiveOutlinedIcon sx={{ fontSize: 18 }} /></ListItemIcon><ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}>Archive</ListItemText></MenuItem>
      <MenuItem onClick={() => { if (menuRow) onTrash(menuRow.id); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1, color: "#dc2626" }}><ListItemIcon><DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: "#dc2626" }} /></ListItemIcon><ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem", color: "#dc2626" }}>Move to Trash</ListItemText></MenuItem>
    </Menu>
    </>
  );
}

// ── Completed Tab ─────────────────────────────────────────────────────────────
function CompletedTab({ rows, highlight, currentUser, isDark, border, onBulkArchive, onBulkTrash, onArchive, onTrash }) {
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const mappedRows = rows.map((req) => {
    // Filter assignments by who assigned them (assigner's section head)
    // This correctly includes cross-assigned staff
    const sectionAssignments = (req.coverage_assignments || []).filter(
      (a) =>
        a.assigner?.section === currentUser?.section ||
        a.section === currentUser?.section,
    );
    const seen = new Set();
    const uniqueStaffers = sectionAssignments
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
      }));
    return {
      id: req.id,
      title: req.title,
      client: req.entity?.name || "—",
      eventDate: req.event_date
        ? new Date(req.event_date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—",
      eventType: !!(req.is_multiday && req.event_days?.length > 0),
      venue: req.venue || "—",
      status: req.status,
      staffers: uniqueStaffers,
    };
  });

  const columns = [
    {
      field: "title",
      headerName: "Event Title",
      flex: 1.2,
      renderCell: (p) => <CellText bold>{p.value}</CellText>,
    },
    {
      field: "eventType",
      headerName: "Type",
      flex: 0.65,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <EventTypePill isMultiDay={p.value} isDark={isDark} />
        </Box>
      ),
    },
    {
      field: "client",
      headerName: "Client",
      flex: 0.8,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "eventDate",
      headerName: "Event Date",
      flex: 0.8,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "venue",
      headerName: "Venue",
      flex: 0.8,
      renderCell: (p) => <CellText secondary>{p.value}</CellText>,
    },
    {
      field: "staffers",
      headerName: "Staffers",
      flex: 0.65,
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
                    borderRadius: "10px",
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
    },
    {
      field: "actions",
      headerName: "",
      flex: 0.4,
      minWidth: 56,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%", pr: 0.5 }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); setMenuRow(p.row); }}>
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <>
    <DataGrid
      rows={mappedRows}
      columns={columns}
      hideFooter
      checkboxSelection
      disableRowSelectionOnClick
      selectionActions={[
        { label: "Archive", onClick: onBulkArchive },
        { label: "Move to Trash", onClick: onBulkTrash, color: "error" },
      ]}
      rowHeight={52}
      getRowClassName={(p) =>
        highlight && p.row.title?.toLowerCase().includes(highlight)
          ? "highlighted-row"
          : ""
      }
      sx={makeDataGridSx(isDark, border)}
    />
    <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => { setMenuAnchor(null); setMenuRow(null); }} anchorOrigin={{ vertical: "bottom", horizontal: "right" }} transformOrigin={{ vertical: "top", horizontal: "right" }} slotProps={{ paper: { sx: { minWidth: 160, borderRadius: "10px", mt: 0.5, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" } } }}>
      <MenuItem onClick={() => { if (menuRow) onArchive(menuRow.id); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}><ListItemIcon><ArchiveOutlinedIcon sx={{ fontSize: 18 }} /></ListItemIcon><ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}>Archive</ListItemText></MenuItem>
      <MenuItem onClick={() => { if (menuRow) onTrash(menuRow.id); setMenuAnchor(null); setMenuRow(null); }} sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1, color: "#dc2626" }}><ListItemIcon><DeleteOutlineOutlinedIcon sx={{ fontSize: 18, color: "#dc2626" }} /></ListItemIcon><ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem", color: "#dc2626" }}>Move to Trash</ListItemText></MenuItem>
    </Menu>
    </>
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

  const isMultiDay = !!(request.is_multiday && request.event_days?.length > 0);
  const days = isMultiDay
    ? request.event_days
    : [
        {
          date: request.event_date,
          from_time: request.from_time,
          to_time: request.to_time,
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

  const toggleShowOthers = () => {
    setShowOthersMap((prev) => ({
      ...prev,
      [activeDateStr]: !prev[activeDateStr],
    }));
  };

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
          borderRadius: "10px",
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
            width: 36,
            height: 36,
            fontSize: "0.72rem",
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
              borderRadius: "10px",
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
          borderRadius: "10px",
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
              borderRadius: "10px",
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
                {request.title}
              </Typography>
              {isMultiDay && (
                <Box
                  sx={{
                    px: 0.8,
                    py: 0.2,
                    borderRadius: "10px",
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
              {request.forwarded_at
                ? `Forwarded ${new Date(request.forwarded_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : "Forwarded date unknown"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            sx={{
              px: 1.1,
              py: 0.3,
              borderRadius: "10px",
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
                ["Title", request.title],
                ["Description", request.description],
                ["Venue", request.venue || "—"],
              ]}
            />
          </Section>
          <Section label="Coverage Requirements" border={border}>
            {(() => {
              const totalPax = getPaxForSection(request);
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
                        borderRadius: "10px",
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
                            borderRadius: "10px",
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
                                borderRadius: "10px",
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
                              borderRadius: "10px",
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
                ["Organization", request.entity?.name || "—"],
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
                  px: 1.25,
                  py: 0.5,
                  borderRadius: "10px",
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
                  {getFileName(request.file_url)}
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
              sx={{ borderRadius: "10px", fontFamily: dm, fontSize: "0.76rem" }}
            >
              {assignError}
            </Alert>
          )}

          {staffersLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={18} sx={{ color: GOLD }} />
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
                      borderRadius: "10px",
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
                      borderRadius: "10px",
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
                borderRadius: "10px",
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
function CellText({ children, secondary, bold }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.8rem",
          fontWeight: bold ? 500 : 400,
          color: secondary ? "text.secondary" : "text.primary",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}
function ActionChip({ children, onClick, disabled, border }) {
  return (
    <Box
      onClick={!disabled ? onClick : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.25,
        py: 0.45,
        borderRadius: "10px",
        cursor: disabled ? "default" : "pointer",
        border: `1px solid ${border}`,
        fontFamily: dm,
        fontSize: "0.73rem",
        fontWeight: 500,
        color: "text.secondary",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        "&:hover": disabled
          ? {}
          : { borderColor: GOLD, color: CHARCOAL, backgroundColor: GOLD_08 },
      }}
    >
      {children}
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
        px: 1.1,
        py: 0.35,
        borderRadius: "10px",
        border: "1px solid rgba(245,197,43,0.45)",
        backgroundColor: GOLD_08,
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
function CancelBtn({ onClick, disabled, border }) {
  return (
    <Box
      onClick={!disabled ? onClick : undefined}
      sx={{
        px: 1.75,
        py: 0.65,
        borderRadius: "10px",
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
        borderRadius: "10px",
        cursor: loading ? "default" : "pointer",
        backgroundColor: "#212121",
        color: "#fff",
        fontFamily: dm,
        fontSize: "0.8rem",
        fontWeight: 600,
        opacity: loading ? 0.7 : 1,
        transition: "background-color 0.15s",
        "&:hover": { backgroundColor: loading ? "#212121" : "#333" },
      }}
    >
      {loading && <CircularProgress size={13} sx={{ color: "#fff" }} />}
      {children}
    </Box>
  );
}

// ── FIX: makeDataGridSx — removed pinnedColumns styles since free tier
// DataGrid handles its own layout; hideFooter replaces pagination
function makeDataGridSx(isDark, border) {
  return {
    border: "none",
    fontFamily: dm,
    fontSize: "0.82rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    height: "100%",
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
    "& .MuiDataGrid-footerContainer": { display: "none" },
    "& .MuiDataGrid-virtualScroller": { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay": { backgroundColor: "background.paper" },
    "& .highlighted-row": {
      backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.08)",
      "&:hover": {
        backgroundColor: isDark ? GOLD_18 : "rgba(245,197,43,0.14)",
      },
    },
  };
}
