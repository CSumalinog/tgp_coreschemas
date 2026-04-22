// src/pages/regular_staff/MyAssignment.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Dialog,
  DialogContent,
  IconButton,
  useTheme,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Drawer,
  Tooltip,
  Divider,
  FormControl,
  Select,
  OutlinedInput,
  InputAdornment,
  TextField,
  LinearProgress,
} from "@mui/material";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
  RoleArchiveManagement,
  RoleTrashManagement,
} from "../common/request-management/RoleRequestManagement";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMoreOutlined";
import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import { StaffAvatar } from "../../components/common/UserAvatar";
import { supabase } from "../../lib/supabaseClient";
import { pushSuccessToast } from "../../components/common/SuccessToast";
import { useAnnounceEmergency } from "../../hooks/useAnnounceEmergency.jsx";
import { notifySecHeads } from "../../services/NotificationService";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { useLocation } from "react-router-dom";
import BrandedLoader from "../../components/common/BrandedLoader";
import NumberBadge from "../../components/common/NumberBadge";
import {
  CONTROL_RADIUS,
  FILTER_BUTTON_HEIGHT,
  FILTER_CLIENT_MIN_WIDTH,
  FILTER_SEARCH_FLEX,
  FILTER_GROUP_GAP,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
  FILTER_SEARCH_MAX_WIDTH,
  FILTER_SEARCH_MIN_WIDTH,
  MODAL_TAB_HEIGHT,
  FILTER_SEMESTER_MIN_WIDTH,
  FILTER_STATUS_MIN_WIDTH,
} from "../../utils/layoutTokens";

import {
  TimeInModal,
  OnGoingAlertDialog,
} from "../../components/regular_staff/TimeIn";
import QRScanCompleteDialog from "../../components/regular_staff/QRScanCompleteDialog";

// â”€â”€ Brand tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_18 = "rgba(245,197,43,0.18)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

const SECTION_COLORS = {
  News: { bg: "#e3f2fd", color: "#1565c0" },
  Photojournalism: { bg: "#f3e5f5", color: "#7b1fa2" },
  Videojournalism: { bg: "#e8f5e9", color: "#2e7d32" },
};

const STATUS_CFG = {
  Pending: {
    dot: "#f97316",
    color: "#c2410c",
    bg: "#fff7ed",
    accent: "#f97316",
  },
  Approved: {
    dot: "#22c55e",
    color: "#15803d",
    bg: "rgba(34,197,94,0.08)",
    accent: "#22c55e",
  },
  "On Going": {
    dot: "#3b82f6",
    color: "#1d4ed8",
    bg: "rgba(59,130,246,0.08)",
    accent: "#3b82f6",
  },
  Completed: {
    dot: "#22c55e",
    color: "#15803d",
    bg: "#f0fdf4",
    accent: "#22c55e",
  },
  "No Show": {
    dot: "#ef4444",
    color: "#b91c1c",
    bg: "rgba(239,68,68,0.08)",
    accent: "#ef4444",
  },
  Rectified: {
    dot: "#8b5cf6",
    color: "#6d28d9",
    bg: "rgba(139,92,246,0.08)",
    accent: "#8b5cf6",
  },
};

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
const isWeekendDate = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr).getDay();
  return d === 0 || d === 6;
};
const formatTime = (timeStr) => {
  if (!timeStr) return "";
  const [h, m] = timeStr.slice(0, 5).split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${m} ${ampm}`;
};
const getTimeInState = (request) => {
  if (!request?.event_date || !request?.from_time) return "unavailable";
  // ── Test mode: always open ────────────────────────────────────────────────
  if (import.meta.env.VITE_TEST_MODE === "true") return "open";

  const timeStr = request.from_time.slice(0, 5);
  const eventStart = new Date(`${request.event_date}T${timeStr}`).getTime();
  const now = Date.now();
  const diff = eventStart - now;
  const TEN_MIN = 10 * 60 * 1000;
  const TWO_MIN = 2 * 60 * 1000;
  if (diff >= -TWO_MIN && diff <= TEN_MIN) return "open";
  if (diff > TEN_MIN) return "early";
  return "passed";
};

const getAssignmentCardKey = (assignment) => {
  const requestId = assignment?.request?.id || "no-request";
  const dayKey =
    assignment?.assignment_date || assignment?.request?.event_date || "no-date";
  const fromKey = assignment?.request?.from_time || "no-from";
  const toKey = assignment?.request?.to_time || "no-to";
  return `${requestId}|${dayKey}|${fromKey}|${toKey}`;
};

const dedupeAssignments = (list = []) => {
  const seen = new Set();
  const out = [];
  list.forEach((assignment) => {
    const key = getAssignmentCardKey(assignment);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(assignment);
  });
  return out;
};

// â”€â”€ Status pill â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

function WeekendBadge({ isDark }) {
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.55,
        px: 1.1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.1)",
        border: `1px solid rgba(245,197,43,0.3)`,
      }}
    >
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.66rem",
          fontWeight: 700,
          color: "#b45309",
          letterSpacing: "0.04em",
        }}
      >
        Weekend
      </Typography>
    </Box>
  );
}

function DetailSection({ label, icon, children }) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
        {icon && <Box sx={{ color: "text.disabled" }}>{icon}</Box>}
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.62rem",
            fontWeight: 700,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.09em",
          }}
        >
          {label}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

// â”€â”€ Assignment Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AssignmentCard({
  a,
  isDark,
  border,
  onView,
  onTimeIn,
  onComplete,
  onArchive,
  onTrash,
  onRectification,
  hasPendingRectif,
  onAnnounceEmergency,
}) {
  const cfg = STATUS_CFG[a.status] || { accent: "#9ca3af" };
  const req = a.request;
  const canTimeIn = ["Assigned", "Approved"].includes(a.status);
  const state = canTimeIn ? getTimeInState(req) : null;
  const announceEmergencyDisabled = !canTimeIn || state === "passed" || !!a.timed_in_at;
  const [menuAnchor, setMenuAnchor] = useState(null);

  return (
    <Box
      onClick={() => onView(a)}
      sx={{
        p: 2,
        borderRadius: "10px",
        border: `1px solid ${border}`,
        backgroundColor: "background.paper",
        boxShadow: isDark
          ? "0 1px 10px rgba(0,0,0,0.4)"
          : "0 1px 8px rgba(0,0,0,0.07)",
        cursor: "pointer",
        transition: "box-shadow 0.15s",
        "&:hover": {
          boxShadow: isDark
            ? "0 4px 24px rgba(0,0,0,0.3)"
            : "0 4px 24px rgba(53,53,53,0.08)",
        },
        display: "flex",
        flexDirection: "column",
        gap: 1.25,
        position: "relative",
      }}
    >
      {/* Top row: title + menu */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: "0.88rem",
              color: "text.primary",
              lineHeight: 1.35,
            }}
          >
            {req?.title || "–"}
          </Typography>
          {isWeekendDate(req?.event_date) && (
            <Box sx={{ mt: 0.5 }}>
              <WeekendBadge isDark={isDark} />
            </Box>
          )}
        </Box>

        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            setMenuAnchor(e.currentTarget);
          }}
          sx={{ mr: -0.5 }}
        >
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={(e) => {
            e.stopPropagation();
            setMenuAnchor(null);
          }}
          onClick={(e) => e.stopPropagation()}
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
              onArchive(req?.id);
              setMenuAnchor(null);
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
              onTrash(req?.id);
              setMenuAnchor(null);
            }}
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              gap: 1,
              color: "#dc2626",
            }}
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
          <MenuItem
            disabled={
              (a.status !== "No Show" && state !== "passed") ||
              a.status === "Rectified" ||
              hasPendingRectif
            }
            onClick={() => {
              onRectification?.(a);
              setMenuAnchor(null);
            }}
            sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}
          >
            <ListItemIcon>
              <FactCheckOutlinedIcon
                sx={{
                  fontSize: 18,
                  color:
                    (a.status !== "No Show" && state !== "passed") ||
                    hasPendingRectif
                      ? "text.disabled"
                      : "#111",
                }}
              />
            </ListItemIcon>
            <ListItemText
              slotProps={{
                primary: {
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color:
                    (a.status !== "No Show" && state !== "passed") ||
                    hasPendingRectif
                      ? "text.disabled"
                      : undefined,
                },
              }}
            >
              {hasPendingRectif
                ? "Rectification Pending"
                : "Request Rectification"}
            </ListItemText>
          </MenuItem>
          <MenuItem
            disabled={announceEmergencyDisabled}
            onClick={() => {
              onAnnounceEmergency(a);
              setMenuAnchor(null);
            }}
            sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}
          >
            <ListItemIcon>
              <WarningAmberOutlinedIcon
                sx={{
                  fontSize: 18,
                  color: announceEmergencyDisabled ? "text.disabled" : GOLD,
                }}
              />
            </ListItemIcon>
            <ListItemText
              slotProps={{
                primary: {
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: announceEmergencyDisabled ? "text.disabled" : GOLD,
                },
              }}
            >
              {a.status === "Cancelled"
                ? "Emergency Announced"
                : "Announce Emergency"}
            </ListItemText>
          </MenuItem>
        </Menu>
      </Box>

      {/* Meta info */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
        {req?.event_date && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <CalendarTodayOutlinedIcon
              sx={{ fontSize: 12, color: GOLD, flexShrink: 0 }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.76rem",
                color: "text.secondary",
              }}
            >
              {new Date(req.event_date).toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Typography>
          </Box>
        )}
        {req?.from_time && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <AccessTimeOutlinedIcon
              sx={{ fontSize: 12, color: GOLD, flexShrink: 0 }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.76rem",
                color: "text.secondary",
              }}
            >
              {formatTime(req.from_time)}
              {req.to_time ? ` – ${formatTime(req.to_time)}` : ""}
            </Typography>
          </Box>
        )}
        {req?.venue && (
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0.75 }}>
            <LocationOnOutlinedIcon
              sx={{ fontSize: 12, color: GOLD, flexShrink: 0, mt: 0.15 }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.76rem",
                color: "text.secondary",
                lineHeight: 1.4,
              }}
            >
              {req.venue}
            </Typography>
          </Box>
        )}
        {req?.entity?.name && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <PersonOutlineOutlinedIcon
              sx={{ fontSize: 12, color: GOLD, flexShrink: 0 }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.76rem",
                color: "text.secondary",
              }}
            >
              {req.entity.name}
            </Typography>
          </Box>
        )}
      </Box>

      {a.assigned_by_profile?.full_name && (
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.68rem", color: "text.disabled" }}
        >
          Assigned by {a.assigned_by_profile.full_name}
        </Typography>
      )}

      <Box sx={{ height: "1px", backgroundColor: border }} />

      {/* Action buttons */}
      <Box onClick={(e) => e.stopPropagation()}>
        {canTimeIn && state === "open" && (
          <Box
            onClick={() => onTimeIn(a)}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              py: 0.9,
              borderRadius: "10px",
              cursor: "pointer",
              backgroundColor: "#212121",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#fff",
              transition: "background-color 0.15s",
              "&:hover": { backgroundColor: "#333" },
            }}
          >
            <HowToRegOutlinedIcon sx={{ fontSize: 14 }} />
            Time In
          </Box>
        )}
        {canTimeIn && state === "early" && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              py: 0.9,
              borderRadius: "10px",
              border: `1px solid ${border}`,
              fontFamily: dm,
              fontSize: "0.76rem",
              color: "text.disabled",
            }}
          >
            Time In opens 10 mins before event
          </Box>
        )}
        {canTimeIn && state === "passed" && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              py: 0.9,
              borderRadius: "10px",
              border: `1px solid rgba(239,68,68,0.3)`,
              backgroundColor: "rgba(239,68,68,0.04)",
              fontFamily: dm,
              fontSize: "0.76rem",
              fontWeight: 600,
              color: "#b91c1c",
              cursor: "default",
            }}
          >
            <WarningAmberOutlinedIcon sx={{ fontSize: 13 }} />
            Time in window has passed. For rectification use the menu to access
            the form.
          </Box>
        )}
        {a.status === "On Going" && (
          <Box
            onClick={() => onComplete(a)}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              py: 0.9,
              borderRadius: "10px",
              cursor: "pointer",
              backgroundColor: "#212121",
              border: `1px solid #212121`,
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#fff",
              transition: "all 0.15s",
              "&:hover": {
                backgroundColor: "#333",
                borderColor: "#333",
              },
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
            Mark Complete
          </Box>
        )}
        {a.status === "Completed" && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 0.75,
              py: 0.9,
              borderRadius: "10px",
              border: `1px solid rgba(34,197,94,0.25)`,
              backgroundColor: "rgba(34,197,94,0.05)",
              fontFamily: dm,
              fontSize: "0.76rem",
              fontWeight: 600,
              color: "#15803d",
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
            Completed
          </Box>
        )}
      </Box>
    </Box>
  );
}

// â”€â”€ Assignment Detail Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function AssignmentDetailDialog({
  assignment,
  open,
  onClose,
  isDark,
  onMarkComplete,
  onTimeIn,
  currentUserId,
}) {
  if (!assignment) return null;
  const req = assignment.request;
  const border = isDark ? BORDER_DARK : BORDER;

  const coStaffers = useMemo(() => {
    const all = req?.all_assignments || [];
    return all.filter((a) => a.assigned_to !== currentUserId && a.staffer);
  }, [req, currentUserId]);

  const coStaffersBySection = useMemo(() => {
    const grouped = {};
    coStaffers.forEach((a) => {
      const sec = a.staffer.section || a.section || "Unknown";
      if (!grouped[sec]) grouped[sec] = [];
      grouped[sec].push(a.staffer);
    });
    return grouped;
  }, [coStaffers]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: "10px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${border}`,
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "0.9rem",
            color: "text.primary",
          }}
        >
          Details
        </Typography>
      </Box>

      <DialogContent
        sx={{
          p: 0,
          flex: 1,
          overflowY: "auto",
          "&::-webkit-scrollbar": { width: 5 },
          "&::-webkit-scrollbar-thumb": {
            background: isDark ? "#333" : "#ddd",
            borderRadius: "10px",
          },
          "&::-webkit-scrollbar-thumb:hover": { background: GOLD },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 2.5,
          }}
        >
          {/* EVENT INFORMATION */}
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                mb: 1,
              }}
            >
              Event Information
            </Typography>
            <Divider sx={{ mb: 1.5 }} />
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                rowGap: 1,
              }}
            >
              <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>Event Title</Typography>
              <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary" }}>{req?.title || "–"}</Typography>
              {req?.description && (
                <>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>Description</Typography>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary", lineHeight: 1.6 }}>{req.description}</Typography>
                </>
              )}
              {req?.event_date && (
                <>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>Date</Typography>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary" }}>
                    {new Date(req.event_date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Typography>
                </>
              )}
              {req?.from_time && (
                <>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>Time</Typography>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary" }}>
                    {formatTime(req.from_time)}{req.to_time ? ` – ${formatTime(req.to_time)}` : ""}
                  </Typography>
                </>
              )}
              {req?.venue && (
                <>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>Venue</Typography>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary" }}>{req.venue}</Typography>
                </>
              )}
            </Box>
          </Box>
          {/* CONTACT DETAILS */}
          {(req?.entity?.name || req?.contact_person || req?.contact_info || assignment.assigned_by_profile?.full_name) && (
            <Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  mb: 1,
                }}
              >
                Contact Details
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  rowGap: 1,
                }}
              >
                {req?.entity?.name && (
                  <>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>Organization</Typography>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary" }}>{req.entity.name}</Typography>
                  </>
                )}
                {req?.contact_person && (
                  <>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>Contact Person</Typography>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary" }}>{req.contact_person}</Typography>
                  </>
                )}
                {req?.contact_info && (
                  <>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>Contact Info</Typography>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary" }}>{req.contact_info}</Typography>
                  </>
                )}
                {assignment.assigned_by_profile?.full_name && (
                  <>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>Assigned by</Typography>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary" }}>{assignment.assigned_by_profile.full_name}</Typography>
                  </>
                )}
              </Box>
            </Box>
          )}
          {/* CO-STAFFERS */}
          {coStaffers.length > 0 && (
            <Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  mb: 1,
                }}
              >
                Co-Staffers Assigned
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {Object.entries(coStaffersBySection).map(([section, staffers]) => {
                  const colors = SECTION_COLORS[section] || { bg: "#f3f4f6", color: "#6b7280" };
                  return (
                    <Box key={section}>
                      <Box
                        sx={{
                          display: "inline-flex",
                          px: 1,
                          py: 0.2,
                          borderRadius: "10px",
                          backgroundColor: colors.bg,
                          mb: 0.75,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.62rem",
                            fontWeight: 700,
                            color: colors.color,
                            letterSpacing: "0.07em",
                            textTransform: "uppercase",
                          }}
                        >
                          {section}
                        </Typography>
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {staffers.map((staffer) => (
                          <Box
                            key={staffer.id}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              px: 1.25,
                              py: 0.75,
                              borderRadius: "8px",
                              border: `1px solid ${border}`,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.02)"
                                : "rgba(53,53,53,0.01)",
                            }}
                          >
                            <StaffAvatar
                              path={staffer.avatar_url}
                              name={staffer.full_name}
                              size={26}
                              fontSize="0.6rem"
                            />
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
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Box>
          )}
          {/* ATTACHMENT */}
          {req?.file_url && (
            <Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  mb: 1,
                }}
              >
                Attachment
              </Typography>
              <Divider sx={{ mb: 1.5 }} />
              <Box
                onClick={() => openFile(req.file_url)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: "10px",
                  cursor: "pointer",
                  border: `1px solid ${isDark ? BORDER_DARK : BORDER}`,
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
              </Box>
            </Box>
          )}
          {assignment.status === "On Going" && (
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: "10px",
                backgroundColor: "rgba(34,197,94,0.06)",
                border: `1px solid rgba(34,197,94,0.25)`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.76rem",
                  color: "#15803d",
                  lineHeight: 1.55,
                }}
              >
                You've checked in.
                {assignment.timed_in_at &&
                  ` Checked in at ${new Date(assignment.timed_in_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.`}{" "}
                Mark complete when coverage is done.
              </Typography>
            </Box>
          )}
          {assignment.status === "Cancelled" &&
            (() => {
              const raw = String(assignment.cancellation_reason || "");
              const isEmergency = raw
                .toLowerCase()
                .startsWith("emergency announced");
              if (!isEmergency) return null;
              // Parse reason text: strip prefix and optional (Proof: ...) suffix
              const withoutPrefix = raw.replace(
                /^emergency announced:\s*/i,
                "",
              );
              const proofMatch = withoutPrefix.match(
                /\s*\(Proof:\s*([^)]+)\)\s*$/,
              );
              const reasonText = proofMatch
                ? withoutPrefix
                    .slice(0, withoutPrefix.lastIndexOf(proofMatch[0]))
                    .trim()
                : withoutPrefix.trim();
              const proofPath = proofMatch ? proofMatch[1].trim() : null;
              const supabaseBase = (
                import.meta.env.VITE_SUPABASE_URL || ""
              ).replace(/\/+$/, "");
              const proofUrl =
                proofPath && supabaseBase
                  ? `${supabaseBase}/storage/v1/object/public/coverage-files/${proofPath}`
                  : proofPath;
              return (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.9,
                    px: 1.5,
                    py: 1.25,
                    borderRadius: "10px",
                    backgroundColor: "rgba(245,197,43,0.06)",
                    border: `1px solid rgba(245,197,43,0.3)`,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#b45309",
                    }}
                  >
                    Emergency Announced — Received
                  </Typography>
                  {reasonText && (
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.76rem",
                        color: "text.secondary",
                        lineHeight: 1.55,
                        pl: 0.25,
                      }}
                    >
                      {reasonText}
                    </Typography>
                  )}
                  {proofUrl && (
                    <Box
                      component="a"
                      href={proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.7,
                        px: 1,
                        py: 0.45,
                        borderRadius: "6px",
                        cursor: "pointer",
                        border: `1px solid rgba(245,197,43,0.35)`,
                        textDecoration: "none",
                        transition: "all 0.15s",
                        alignSelf: "flex-start",
                        "&:hover": {
                          borderColor: "#b45309",
                          backgroundColor: "rgba(245,197,43,0.1)",
                        },
                      }}
                    >
                      <InsertDriveFileOutlinedIcon
                        sx={{ fontSize: 13, color: "#b45309" }}
                      />
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.74rem",
                          color: "#b45309",
                        }}
                      >
                        View Proof
                      </Typography>
                    </Box>
                  )}
                </Box>
              );
            })()}
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
          flexShrink: 0,
        }}
      >
        <CancelBtn onClick={onClose} border={isDark ? BORDER_DARK : BORDER} />
        {["Assigned", "Approved"].includes(assignment.status) &&
          (() => {
            const state = getTimeInState(assignment.request);
            if (state === "open")
              return (
                <PrimaryBtn
                  onClick={() => {
                    onClose();
                    onTimeIn(assignment);
                  }}
                >
                  Time In
                </PrimaryBtn>
              );
            if (state === "early")
              return (
                <Box
                  sx={{
                    px: 1.75,
                    py: 0.65,
                    borderRadius: "10px",
                    border: `1px solid rgba(53,53,53,0.08)`,
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    color: "text.disabled",
                  }}
                >
                  Time In opens 10 mins before event
                </Box>
              );
            return (
              <Box
                sx={{
                  px: 1.75,
                  py: 0.65,
                  borderRadius: "10px",
                  border: `1px solid rgba(239,68,68,0.25)`,
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  color: "#b91c1c",
                  backgroundColor: "rgba(239,68,68,0.05)",
                }}
              >
                Time In window has passed
              </Box>
            );
          })()}
        {assignment.status === "On Going" && (
          <PrimaryBtn
            onClick={() => {
              onClose();
              onMarkComplete(assignment);
            }}
          >
            Mark Complete
          </PrimaryBtn>
        )}
      </Box>
    </Dialog>
  );
}

// â”€â”€ Confirm Complete Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function ConfirmCompleteDialog({
  assignment,
  open,
  onClose,
  onConfirm,
  completing,
  error,
  isDark,
}) {
  if (!assignment) return null;
  const border = isDark ? BORDER_DARK : BORDER;
  return (
    <Dialog
      open={open}
      onClose={() => !completing && onClose()}
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
              Mark as Completed
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.7rem",
                color: "text.secondary",
              }}
            >
              Confirm you've finished this coverage
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          disabled={completing}
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
        {error && (
          <Alert
            severity="error"
            sx={{ borderRadius: "10px", fontFamily: dm, fontSize: "0.78rem" }}
          >
            {error}
          </Alert>
        )}
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
            {assignment.request?.title}
          </Typography>
          {assignment.request?.event_date && (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.3,
              }}
            >
              {new Date(assignment.request.event_date).toLocaleDateString(
                "en-US",
                { month: "long", day: "numeric", year: "numeric" },
              )}
            </Typography>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: "10px",
            backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.07)",
            border: `1px solid rgba(245,197,43,0.3)`,
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
            This confirms you have covered the event. This action cannot be
            undone.
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
        <CancelBtn onClick={onClose} disabled={completing} border={border} />
        <PrimaryBtn onClick={onConfirm} loading={completing}>
          {!completing && <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
          Yes, Mark Complete
        </PrimaryBtn>
      </Box>
    </Dialog>
  );
}

// â”€â”€ Main Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function MyAssignment() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const [detailTarget, setDetailTarget] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState("");

  // Emergency announcement integration - must be after all other useState calls
  const { openAnnounce, AnnounceEmergencyDialogWrapper } = useAnnounceEmergency(
    { supabase, currentUser },
  );

  const [timeInTarget, setTimeInTarget] = useState(null);
  const [timeInConfirmTarget, setTimeInConfirmTarget] = useState(null);
  const [timingIn, setTimingIn] = useState(false);
  const [timeInError, setTimeInError] = useState("");
  const [onGoingAlert, setOnGoingAlert] = useState(null);
  const [rectificationTarget, setRectificationTarget] = useState(null);
  const [rectifReason, setRectifReason] = useState("");
  const [rectifFile, setRectifFile] = useState(null);
  const [rectifSubmitting, setRectifSubmitting] = useState(false);
  const [rectifError, setRectifError] = useState("");
  const [rectifSuccess, setRectifSuccess] = useState(false);
  // Track assignment IDs that have a pending rectification request
  const [pendingRectifIds, setPendingRectifIds] = useState(new Set());

  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState(0);
  const timeInNotifiedRef = useRef(new Set());
  const timeInActiveRef = useRef(false);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, section, division")
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
        .select("id, name, start_date, end_date")
        .order("start_date", { ascending: false });
      setSemesters(data || []);
    }
    loadSemesters();
  }, []);

  const loadAssignments = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    const [assignResult, usResult] = await Promise.all([
      supabase
        .from("coverage_assignments")
        .select(
          `
        id, request_id, status, section, assignment_date, assigned_at, timed_in_at,
        cancellation_reason, is_reassigned,
        assigned_by_profile:assigned_by ( full_name ),
        request:request_id (
          id, title, description, event_date, from_time, to_time,
          venue, services, file_url, requester_id,
          entity:entity_id ( id, name ),
          contact_person, contact_info,
          all_assignments:coverage_assignments (
            id, assigned_to, section,
            staffer:assigned_to ( id, full_name, section, avatar_url )
          )
        )
      `,
        )
        .eq("assigned_to", currentUser.id)
        .not("status", "eq", "Pending")
        .order("assigned_at", { ascending: false }),
      supabase
        .from("request_user_state")
        .select("request_id")
        .eq("user_id", currentUser.id),
    ]);
    if (assignResult.error) setError(assignResult.error.message);
    else {
      const hiddenIds = new Set((usResult.data || []).map((r) => r.request_id));
      const visible = (assignResult.data || []).filter(
        (a) => !hiddenIds.has(a.request?.id),
      );
      setAssignments(dedupeAssignments(visible));
    }
    setLoading(false);
  }, [currentUser]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  useEffect(() => {
    const openRequestId = location.state?.openRequestId;
    if (!openRequestId || assignments.length === 0) return;

    const match = assignments.find(
      (assignment) => assignment.request?.id === openRequestId,
    );
    if (!match) return;

    queueMicrotask(() => {
      setDetailTarget(match);
    });
  }, [location.state?.openRequestId, assignments]);

  useRealtimeNotify(
    "coverage_assignments",
    loadAssignments,
    currentUser?.id ? `assigned_to=eq.${currentUser.id}` : null,
    { title: "Assignment" },
  );

  // ── Load pending rectification IDs for this user ────────────────────────────
  const loadPendingRectifIds = useCallback(async () => {
    if (!currentUser?.id) return;
    const { data } = await supabase
      .from("rectification_requests")
      .select("assignment_id")
      .eq("staff_id", currentUser.id)
      .eq("status", "pending");
    if (data) {
      setPendingRectifIds(new Set(data.map((r) => r.assignment_id)));
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadPendingRectifIds();
  }, [loadPendingRectifIds]);

  // ── Submit rectification request ─────────────────────────────────────────────
  const handleSubmitRectification = useCallback(async () => {
    if (!rectificationTarget || !currentUser?.id) return;
    if (!rectifReason.trim()) {
      setRectifError("Please provide a reason.");
      return;
    }
    setRectifSubmitting(true);
    setRectifError("");
    try {
      const assignment = rectificationTarget;
      let proof_path = null;

      if (rectifFile) {
        const ext = rectifFile.name.split(".").pop();
        const filePath = `rectification_proofs/${currentUser.id}/${Date.now()}_${assignment.id}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("coverage-files")
          .upload(filePath, rectifFile, { upsert: false });
        if (uploadError) throw uploadError;
        proof_path = filePath;
      }

      const { error: insertError } = await supabase
        .from("rectification_requests")
        .insert({
          assignment_id: assignment.id,
          request_id: assignment.request_id,
          staff_id: currentUser.id,
          section: assignment.section ?? assignment.request?.section ?? null,
          reason: rectifReason.trim(),
          proof_path,
        });
      if (insertError) throw insertError;

      // Notify section head(s)
      const section = assignment.section ?? assignment.request?.section;
      if (section) {
        await notifySecHeads({
          sections: [section],
          type: "rectification_submitted",
          title: "Rectification Request",
          message: `${currentUser.full_name ?? "A staff member"} submitted a rectification request for "${assignment.request?.title ?? "an assignment"}".`,
          requestId: assignment.request_id,
          createdBy: currentUser.id,
          targetPath: "/section-head/coverage-management",
          targetPayload: { assignmentId: assignment.id },
        });
      }

      setRectifSuccess(true);
      pushSuccessToast("Rectification submitted.");
      setPendingRectifIds((prev) => new Set([...prev, assignment.id]));
    } catch (err) {
      setRectifError(err?.message ?? "Failed to submit. Please try again.");
    } finally {
      setRectifSubmitting(false);
    }
  }, [rectificationTarget, currentUser, rectifReason, rectifFile]);

  const handleArchive = async (requestId) => {
    const ts = new Date().toISOString();
    await supabase.from("request_user_state").upsert(
      {
        user_id: currentUser.id,
        request_id: requestId,
        archived_at: ts,
        trashed_at: null,
        purged_at: null,
      },
      { onConflict: "user_id,request_id" },
    );
    loadAssignments();
  };
  const handleTrash = async (requestId) => {
    if (!requestId || !currentUser?.id) return;
    const ts = new Date().toISOString();
    await supabase.from("request_user_state").upsert(
      {
        user_id: currentUser.id,
        request_id: requestId,
        archived_at: null,
        trashed_at: ts,
        purged_at: null,
      },
      { onConflict: "user_id,request_id" },
    );
    loadAssignments();
  };

  useEffect(() => {
    function checkUpcoming() {
      const now = Date.now();
      const TEN_MIN = 10 * 60 * 1000;
      const TWO_MIN = 2 * 60 * 1000;
      const match = assignments.find((a) => {
        if (a.status !== "Approved") return false;
        const req = a.request;
        if (!req?.event_date || !req?.from_time) return false;
        const timeStr = req.from_time.slice(0, 5);
        const eventStart = new Date(`${req.event_date}T${timeStr}`).getTime();
        const diff = eventStart - now;
        return diff >= -TWO_MIN && diff <= TEN_MIN;
      });
      if (match) {
        if (!timeInActiveRef.current) {
          setOnGoingAlert(match);
        }
        if (
          !timeInNotifiedRef.current.has(match.id) &&
          "Notification" in window
        ) {
          timeInNotifiedRef.current.add(match.id);
          const fire = () => {
            try {
              new Notification("TGP – Time to Check In", {
                body: `"${match.request?.title || "Your event"}" starts in 10 minutes. Open the app to time in now.`,
                icon: "/favicon.ico",
                tag: `timein-${match.id}`,
              });
            } catch {
              /* silently ignore if blocked */
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
      }
    }
    checkUpcoming();
    const id = setInterval(checkUpcoming, 30_000);
    return () => clearInterval(id);
  }, [assignments]);

  const entityOptions = useMemo(() => {
    const seen = new Set(),
      opts = [];
    assignments.forEach((a) => {
      const name = a.request?.entity?.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        opts.push(name);
      }
    });
    return opts.sort();
  }, [assignments]);

  const applyFilters = useCallback(
    (list) => {
      let out = list;
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        out = out.filter((a) => {
          const request = a.request || {};
          return [
            request.title,
            request.venue,
            request.entity?.name,
            a.assigned_by_profile?.full_name,
          ]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(q));
        });
      }
      if (selectedSem !== "all") {
        const sem = semesters.find((s) => s.id === selectedSem);
        if (sem) {
          const start = new Date(sem.start_date);
          const end = new Date(sem.end_date);
          end.setHours(23, 59, 59, 999);
          out = out.filter((a) => {
            if (!a.request?.event_date) return false;
            const d = new Date(a.request.event_date);
            return d >= start && d <= end;
          });
        }
      }
      if (selectedEntity !== "all")
        out = out.filter((a) => a.request?.entity?.name === selectedEntity);
      return out;
    },
    [searchText, selectedSem, selectedEntity, semesters],
  );

  const filtered = useMemo(
    () =>
      dedupeAssignments(
        applyFilters(
          statusFilter === "All"
            ? assignments
            : assignments.filter((a) => a.status === statusFilter),
        ),
      ),
    [assignments, statusFilter, applyFilters],
  );
  const allFiltered = useMemo(
    () => dedupeAssignments(applyFilters(assignments)),
    [assignments, applyFilters],
  );
  const completedFiltered = useMemo(
    () =>
      dedupeAssignments(
        applyFilters(
          assignments.filter(
            (a) => a.status === "Completed" || a.status === "Rectified",
          ),
        ),
      ),
    [assignments, applyFilters],
  );

  const handleComplete = async () => {
    if (!confirmTarget) return;
    setCompleting(true);
    setCompleteError("");
    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("coverage_assignments")
      .update({ status: "Completed", completed_at: now })
      .eq("id", confirmTarget.id);
    if (updErr) {
      setCompleteError(updErr.message);
      setCompleting(false);
      return;
    }
    await supabase.rpc("sync_request_status_from_assignments", {
      p_request_id: confirmTarget.request.id,
    });
    setConfirmTarget(null);
    setCompleting(false);
    loadAssignments();
    pushSuccessToast("Assignment marked as completed.");
  };

  const handleTimeIn = async ({ selfieFile, gpsData }) => {
    if (!timeInTarget || !selfieFile) return;
    setTimingIn(true);
    setTimeInError("");
    try {
      const now = new Date().toISOString();
      const timestamp = Date.now();
      const ext = selfieFile.name.split(".").pop() || "jpg";
      const filePath = `${currentUser.id}/${timeInTarget.id}_${timestamp}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("login-proof")
        .upload(filePath, selfieFile, { cacheControl: "3600", upsert: false });
      if (uploadErr)
        throw new Error(`Selfie upload failed: ${uploadErr.message}`);
      const { error: assignErr } = await supabase
        .from("coverage_assignments")
        .update({
          status: "On Going",
          timed_in_at: now,
          selfie_url: uploadData.path,
          gps_lat: gpsData?.lat || null,
          gps_lng: gpsData?.lng || null,
          gps_verified: gpsData?.verified ?? false,
        })
        .eq("id", timeInTarget.id);
      if (assignErr) throw assignErr;
      const { error: reqSyncErr } = await supabase.rpc(
        "sync_request_status_from_assignments",
        {
          p_request_id: timeInTarget.request.id,
        },
      );
      if (reqSyncErr) {
        console.warn(
          "[handleTimeIn] request status sync failed:",
          reqSyncErr.message,
        );
      }
      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("is_active", true);
      const timeLabel = new Date(now).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
      });
      const gpsNote = gpsData?.verified
        ? " - GPS verified"
        : gpsData?.lat
          ? " - GPS unverified"
          : " - GPS unavailable";
      const adminNotifs = (admins || []).map((admin) => ({
        user_id: admin.id,
        recipient_id: admin.id,
        recipient_role: "admin",
        request_id: timeInTarget.request.id,
        type: "time_in_alert",
        title: timeInTarget.is_reassigned
          ? "Emergency Check-In"
          : "Staff Checked In",
        message: `${currentUser.full_name} checked in for "${timeInTarget.request.title}" at ${timeLabel}${gpsNote}.`,
        created_by: currentUser.id,
      }));
      const { data: secHeads } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "sec_head")
        .eq("section", timeInTarget.section)
        .eq("is_active", true);
      const secHeadNotifs = (secHeads || []).map((sh) => ({
        user_id: sh.id,
        recipient_id: sh.id,
        recipient_role: "sec_head",
        request_id: timeInTarget.request.id,
        type: "time_in_alert",
        title: "Staff Checked In",
        message: `${currentUser.full_name} has checked in for "${timeInTarget.request.title}" at ${timeLabel}${gpsNote}.`,
        created_by: currentUser.id,
      }));
      const clientId = timeInTarget.request?.requester_id;
      const clientNotifs = clientId
        ? [
            {
              user_id: clientId,
              recipient_id: clientId,
              recipient_role: "client",
              request_id: timeInTarget.request.id,
              type: "time_in_alert",
              title: "Coverage Has Started",
              message: `Coverage for "${timeInTarget.request.title}" has started. Your assigned team is now on the way.`,
              created_by: currentUser.id,
            },
          ]
        : [];
      const allNotifs = [...adminNotifs, ...secHeadNotifs, ...clientNotifs];
      if (allNotifs.length) {
        const { error: notifErr } = await supabase
          .from("notifications")
          .insert(allNotifs);
        if (notifErr) throw notifErr;
      }
      timeInActiveRef.current = false;
      setTimeInTarget(null);
      setOnGoingAlert(null);
      loadAssignments();
      pushSuccessToast("Timed in successfully.");
    } catch (err) {
      setTimeInError(err.message || "Something went wrong. Please try again.");
    } finally {
      setTimingIn(false);
    }
  };

  if (!currentUser || loading)
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

  const statusOptions = [
    "All",
    "On Going",
    "Completed",
    "Rectified",
    "No Show",
  ];

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: dm,
      }}
    >
      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2.5,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          {error}
        </Alert>
      )}

      {/* â”€â”€ Controls row â”€â”€ */}
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
        <FormControl
          size="small"
          sx={{
            flexShrink: 0,
            minWidth: FILTER_SEARCH_MIN_WIDTH,
          }}
        >
          <OutlinedInput
            placeholder="Search"
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
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          />
        </FormControl>

        <FormControl size="small" sx={{ minWidth: FILTER_STATUS_MIN_WIDTH }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            renderValue={(val) => {
              const count =
                val === "All"
                  ? allFiltered.length
                  : allFiltered.filter((a) => a.status === val).length;
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
                    {val}
                  </Typography>
                  <NumberBadge
                    count={count}
                    active={val !== "All"}
                    inactiveBg={
                      isDark ? "rgba(255,255,255,0.28)" : "rgba(53,53,53,0.45)"
                    }
                    fontFamily={dm}
                    fontSize="0.56rem"
                  />
                </Box>
              );
            }}
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          >
            {statusOptions.map((status) => (
              <MenuItem
                key={status}
                value={status}
                sx={{ fontFamily: dm, fontSize: "0.78rem" }}
              >
                {status}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: FILTER_SEMESTER_MIN_WIDTH }}>
          <Select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
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
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: FILTER_CLIENT_MIN_WIDTH }}>
          <Select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
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

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: FILTER_GROUP_GAP,
            flexShrink: 0,
          }}
        >
          {/* â”€â”€ Settings gear â”€â”€ */}
          <Tooltip title="Archive & Trash" arrow>
            <IconButton
              size="small"
              onClick={() => setSettingsOpen(true)}
              sx={{
                borderRadius: CONTROL_RADIUS,
                width: FILTER_BUTTON_HEIGHT,
                height: FILTER_BUTTON_HEIGHT,
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
      </Box>

      {selectedSem !== "all" && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            px: 1.5,
            py: 1.25,
            mt: 1,
            mb: 0.5,
            borderRadius: "10px",
            backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.06)",
            border: `1px solid rgba(245,197,43,0.2)`,
          }}
        >
          <SemStat label="Total" value={allFiltered.length} />
          <Box
            sx={{
              width: 1,
              height: 24,
              backgroundColor: "rgba(245,197,43,0.25)",
            }}
          />
          <SemStat label="Completed" value={completedFiltered.length} />
          <Box
            sx={{
              width: 1,
              height: 24,
              backgroundColor: "rgba(245,197,43,0.25)",
            }}
          />
          <SemStat
            label="Ongoing"
            value={allFiltered.filter((a) => a.status === "On Going").length}
          />
        </Box>
      )}

      <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1.5 }}>
        {filtered.length === 0 ? (
          <Box
            sx={{
              p: 5,
              textAlign: "center",
              bgcolor: "background.paper",
              borderRadius: "10px",
              border: `1px solid ${border}`,
            }}
          >
            <AssignmentOutlinedIcon
              sx={{ fontSize: 32, color: isDark ? "#333" : "#e0e0e0", mb: 1 }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.82rem",
                color: "text.disabled",
              }}
            >
              {statusFilter === "All"
                ? "No assignments yet."
                : `No ${statusFilter.toLowerCase()} assignments.`}
            </Typography>
          </Box>
        ) : (
          filtered.map((a) => (
            <AssignmentCard
              key={a.id}
              a={a}
              isDark={isDark}
              border={border}
              onView={(assignment) => setDetailTarget(assignment)}
              onTimeIn={(assignment) => {
                setTimeInError("");
                setTimeInConfirmTarget(assignment);
              }}
              onComplete={(assignment) => {
                setCompleteError("");
                setConfirmTarget(assignment);
              }}
              onArchive={handleArchive}
              onTrash={handleTrash}
              onRectification={(assignment) => {
                setRectifReason("");
                setRectifFile(null);
                setRectifError("");
                setRectifSuccess(false);
                setRectificationTarget(assignment);
              }}
              hasPendingRectif={pendingRectifIds.has(a.id)}
              onAnnounceEmergency={openAnnounce}
            />
          ))
        )}
      </Box>

      {/* Emergency Announce Dialog – rendered outside the list */}
      <AnnounceEmergencyDialogWrapper />

      <Dialog
        open={!!rectificationTarget}
        onClose={() => {
          if (rectifSubmitting) return;
          setRectificationTarget(null);
          setRectifReason("");
          setRectifFile(null);
          setRectifError("");
          setRectifSuccess(false);
        }}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "10px",
              border: `1px solid ${border}`,
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
          }}
        >
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700 }}
          >
            Request Rectification
          </Typography>
        </Box>

        {/* Body */}
        <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
          {rectifSuccess ? (
            <Box sx={{ textAlign: "center", py: 2 }}>
              <CheckCircleOutlineIcon
                sx={{ fontSize: 40, color: "#22c55e", mb: 1 }}
              />
              <Typography
                sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700 }}
              >
                Submitted successfully
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  color: "text.secondary",
                  mt: 0.5,
                }}
              >
                Your rectification request has been sent to your section head
                for review.
              </Typography>
            </Box>
          ) : (
            <>
              {/* Reason */}
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  mb: 0.5,
                }}
              >
                Reason <span style={{ color: "#ef4444" }}>*</span>
              </Typography>
              <TextField
                multiline
                minRows={6}
                maxRows={12}
                fullWidth
                placeholder="Explain why you believe the No Show mark is incorrect…"
                value={rectifReason}
                onChange={(e) => setRectifReason(e.target.value)}
                disabled={rectifSubmitting}
                size="small"
                inputProps={{ maxLength: 800 }}
                sx={{
                  mb: 2,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontFamily: dm,
                    fontSize: "0.82rem",
                  },
                }}
              />

              {/* Proof upload */}
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  mb: 0.5,
                }}
              >
                Proof (optional — photo, screenshot, or document)
              </Typography>
              <Box
                component="label"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 2,
                  py: 1.25,
                  border: `1px dashed ${border}`,
                  borderRadius: "8px",
                  cursor: rectifSubmitting ? "default" : "pointer",
                  mb: rectifFile ? 0.75 : 0,
                  "&:hover": rectifSubmitting
                    ? {}
                    : { backgroundColor: HOVER_BG },
                }}
              >
                <CloudUploadOutlinedIcon
                  sx={{ fontSize: 18, color: "text.secondary" }}
                />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.8rem",
                    color: "text.secondary",
                    flexGrow: 1,
                  }}
                >
                  {rectifFile ? rectifFile.name : "Click to upload a file"}
                </Typography>
                <input
                  type="file"
                  hidden
                  accept="image/*,.pdf,.doc,.docx"
                  disabled={rectifSubmitting}
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    setRectifFile(f);
                    e.target.value = "";
                  }}
                />
              </Box>
              {rectifFile && (
                <Box
                  sx={{ display: "flex", justifyContent: "flex-end", mb: 0 }}
                >
                  <Box
                    component="span"
                    onClick={() => setRectifFile(null)}
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.72rem",
                      color: "#ef4444",
                      cursor: "pointer",
                      mt: 0.25,
                    }}
                  >
                    Remove
                  </Box>
                </Box>
              )}

              {rectifError && (
                <Alert
                  severity="error"
                  sx={{
                    mt: 1.5,
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    borderRadius: "8px",
                  }}
                >
                  {rectifError}
                </Alert>
              )}
            </>
          )}
        </Box>

        {/* Progress bar */}
        {rectifSubmitting && (
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
          {rectifSuccess ? (
            <Box
              onClick={() => {
                setRectificationTarget(null);
                setRectifReason("");
                setRectifFile(null);
                setRectifError("");
                setRectifSuccess(false);
              }}
              sx={{
                px: 2,
                py: 0.65,
                borderRadius: "10px",
                cursor: "pointer",
                backgroundColor: isDark ? "#fff" : CHARCOAL,
                color: isDark ? CHARCOAL : "#fff",
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                userSelect: "none",
              }}
            >
              Done
            </Box>
          ) : (
            <>
              <Box
                onClick={() => {
                  if (rectifSubmitting) return;
                  setRectificationTarget(null);
                  setRectifReason("");
                  setRectifFile(null);
                  setRectifError("");
                  setRectifSuccess(false);
                }}
                sx={{
                  px: 1.75,
                  py: 0.65,
                  borderRadius: "10px",
                  cursor: rectifSubmitting ? "default" : "pointer",
                  border: `1px solid ${border}`,
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "text.secondary",
                  userSelect: "none",
                  "&:hover": rectifSubmitting
                    ? {}
                    : { backgroundColor: HOVER_BG },
                }}
              >
                Cancel
              </Box>
              <Box
                onClick={
                  rectifSubmitting ? undefined : handleSubmitRectification
                }
                sx={{
                  px: 2,
                  py: 0.65,
                  borderRadius: "10px",
                  cursor:
                    rectifSubmitting || !rectifReason.trim()
                      ? "default"
                      : "pointer",
                  backgroundColor:
                    rectifSubmitting || !rectifReason.trim()
                      ? isDark
                        ? "rgba(255,255,255,0.12)"
                        : "rgba(53,53,53,0.12)"
                      : isDark
                        ? "#fff"
                        : CHARCOAL,
                  color:
                    rectifSubmitting || !rectifReason.trim()
                      ? "text.disabled"
                      : isDark
                        ? CHARCOAL
                        : "#fff",
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  userSelect: "none",
                  transition: "background-color 0.15s",
                }}
              >
                Submit Request
              </Box>
            </>
          )}
        </Box>
      </Dialog>

      <AssignmentDetailDialog
        open={!!detailTarget}
        assignment={detailTarget}
        isDark={isDark}
        currentUserId={currentUser?.id}
        onClose={() => setDetailTarget(null)}
        onMarkComplete={(a) => {
          setCompleteError("");
          setConfirmTarget(a);
        }}
        onTimeIn={(a) => {
          setTimeInError("");
          setTimeInConfirmTarget(a);
        }}
      />
      <QRScanCompleteDialog
        open={!!confirmTarget}
        assignment={confirmTarget}
        isDark={isDark}
        completing={completing}
        error={completeError}
        onClose={() => {
          setConfirmTarget(null);
          setCompleteError("");
        }}
        onConfirm={handleComplete}
      />
      {/* Time In confirmation dialog */}
      <Dialog
        open={!!timeInConfirmTarget}
        onClose={() => setTimeInConfirmTarget(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: "10px",
              backgroundColor: "background.paper",
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
            gap: 1.5,
          }}
        >
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "text.primary",
              fontFamily: dm,
            }}
          >
            Confirm Time In
          </Typography>
        </Box>
        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.85rem",
              color: "text.primary",
              lineHeight: 1.6,
            }}
          >
            You're about to time in for{" "}
            <Box component="span" sx={{ fontWeight: 600 }}>
              {timeInConfirmTarget?.request?.title || "this assignment"}
            </Box>
            . You'll be asked to take a selfie and confirm your location.
          </Typography>
        </DialogContent>
        <Box
          sx={{
            px: 3,
            py: 1.75,
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            backgroundColor: isDark ? "#161616" : "#fafafa",
          }}
        >
          <CancelBtn
            onClick={() => setTimeInConfirmTarget(null)}
            border={isDark ? BORDER_DARK : BORDER}
          />
          <PrimaryBtn
            onClick={() => {
              const target = timeInConfirmTarget;
              setTimeInConfirmTarget(null);
              setTimeInError("");
              timeInActiveRef.current = true;
              setTimeInTarget(target);
            }}
          >
            Proceed
          </PrimaryBtn>
        </Box>
      </Dialog>
      <TimeInModal
        open={!!timeInTarget}
        assignment={timeInTarget}
        isDark={isDark}
        submitting={timingIn}
        error={timeInError}
        onClose={() => {
          timeInActiveRef.current = false;
          setTimeInTarget(null);
          setTimeInError("");
        }}
        onConfirm={({ selfieFile, gpsData }) =>
          handleTimeIn({ selfieFile, gpsData })
        }
      />
      <OnGoingAlertDialog
        open={!!onGoingAlert}
        assignment={onGoingAlert}
        isDark={isDark}
        onClose={() => setOnGoingAlert(null)}
        onTimeIn={(a) => {
          setOnGoingAlert(null);
          setTimeInError("");
          setTimeInConfirmTarget(a);
        }}
      />

      {/* â”€â”€ Settings Drawer (Archive / Trash) â”€â”€ */}
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
              backgroundImage: "none",
            },
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              px: 2.5,
              pt: 2.5,
              pb: 1.5,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <SettingsOutlinedIcon
                sx={{ fontSize: 16, color: "text.secondary" }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontWeight: 700,
                  fontSize: "0.88rem",
                  color: "text.primary",
                  letterSpacing: "-0.01em",
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
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(53,53,53,0.04)",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: "6px",
              px: 2.5,
              pb: 2,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "Archive",
                icon: <ArchiveOutlinedIcon sx={{ fontSize: 13 }} />,
              },
              {
                label: "Trash",
                icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 13 }} />,
              },
            ].map((t, idx) => {
              const active = settingsTab === idx;
              return (
                <Box
                  key={t.label}
                  onClick={() => setSettingsTab(idx)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1.5,
                    height: MODAL_TAB_HEIGHT,
                    flexShrink: 0,
                    borderRadius: "10px",
                    cursor: "pointer",
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: active ? 600 : 400,
                    color: active ? "#fff" : "text.secondary",
                    border: `1px solid ${active ? "#212121" : border}`,
                    backgroundColor: active ? "#212121" : "transparent",
                    transition: "all 0.12s",
                    "&:hover": active
                      ? {}
                      : {
                          borderColor: "rgba(53,53,53,0.3)",
                          color: isDark ? "#f5f5f5" : CHARCOAL,
                        },
                  }}
                >
                  {t.icon} {t.label}
                </Box>
              );
            })}
          </Box>
          <Box sx={{ flex: 1, overflowY: "auto", px: 2.5, pb: 2.5 }}>
            {settingsTab === 0 && (
              <RoleArchiveManagement role="staff" embedded />
            )}
            {settingsTab === 1 && <RoleTrashManagement role="staff" embedded />}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}

// â”€â”€ Shared micro-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function SemStat({ label, value }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "1rem",
          fontWeight: 700,
          color: "#b45309",
          lineHeight: 1,
        }}
      >
        {value}
      </Typography>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.72rem",
          color: "#b45309",
          opacity: 0.75,
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}
function InfoChip({ icon, label, children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
      {icon}
      <Box>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.62rem",
            color: "text.disabled",
            textTransform: "uppercase",
            letterSpacing: "0.07em",
          }}
        >
          {label}
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "text.primary",
          }}
        >
          {children}
        </Typography>
      </Box>
    </Box>
  );
}
function FilterLabel({ children }) {
  return (
    <Typography
      sx={{
        fontFamily: dm,
        fontSize: "0.62rem",
        fontWeight: 700,
        color: "text.disabled",
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        px: 0.25,
      }}
    >
      {children}
    </Typography>
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
        border: `1px solid rgba(245,197,43,0.45)`,
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

// ── Settings drawer sub-tabs ──────────────────────────────────────────────────

const RECTIF_STATUS_CFG = {
  pending: {
    bg: "#fef9ec",
    color: "#b45309",
    dot: "#f59e0b",
    label: "Pending",
  },
  approved: {
    bg: "#f0fdf4",
    color: "#15803d",
    dot: "#22c55e",
    label: "Approved",
  },
  rejected: {
    bg: "#fef2f2",
    color: "#dc2626",
    dot: "#ef4444",
    label: "Rejected",
  },
};

function fmtShortDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RectifHistoryTab({ userId, border, isDark }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("rectification_requests")
      .select(
        "id, status, created_at, request:coverage_requests!request_id(title)",
      )
      .eq("staff_id", userId)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, [userId]);

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={20} sx={{ color: GOLD }} />
      </Box>
    );

  if (!items.length)
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.disabled" }}
        >
          No rectification requests yet.
        </Typography>
      </Box>
    );

  return (
    <Box>
      {items.map((item) => {
        const cfg = RECTIF_STATUS_CFG[item.status] ?? RECTIF_STATUS_CFG.pending;
        return (
          <Box
            key={item.id}
            sx={{
              px: 1.5,
              py: 1.25,
              mb: 0.75,
              borderRadius: "10px",
              border: `1px solid ${border}`,
              backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#fafafa",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.82rem",
                fontWeight: 500,
                mb: 0.5,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.request?.title ?? "—"}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  color: "text.secondary",
                }}
              >
                {fmtShortDate(item.created_at)}
              </Typography>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.4,
                  px: 0.75,
                  py: 0.15,
                  borderRadius: "20px",
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
                  }}
                >
                  {cfg.label}
                </Typography>
              </Box>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}

function EmergencyHistoryTab({ userId, border, isDark }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from("coverage_assignments")
      .select(
        "id, assignment_date, cancellation_reason, cancelled_at, request:request_id(title)",
      )
      .eq("assigned_to", userId)
      .eq("status", "Cancelled")
      .ilike("cancellation_reason", "Emergency%")
      .order("cancelled_at", { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        setItems(data || []);
        setLoading(false);
      });
  }, [userId]);

  const extractReason = (text) => {
    if (!text) return "Emergency announced";
    return (
      String(text)
        .replace(/\(Proof:\s*[^)]+\)\s*$/i, "")
        .replace(/^Emergency announced:\s*/i, "")
        .trim() || "Emergency announced"
    );
  };

  if (loading)
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={20} sx={{ color: GOLD }} />
      </Box>
    );

  if (!items.length)
    return (
      <Box sx={{ py: 4, textAlign: "center" }}>
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.disabled" }}
        >
          No emergency announcements yet.
        </Typography>
      </Box>
    );

  return (
    <Box>
      {items.map((item) => (
        <Box
          key={item.id}
          sx={{
            px: 1.5,
            py: 1.25,
            mb: 0.75,
            borderRadius: "10px",
            border: `1px solid rgba(220,38,38,0.2)`,
            backgroundColor: isDark ? "rgba(220,38,38,0.06)" : "#fef2f2",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              fontWeight: 500,
              mb: 0.4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {item.request?.title ?? "—"}
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.74rem",
              color: "#b91c1c",
              mb: 0.25,
            }}
          >
            {extractReason(item.cancellation_reason)}
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.72rem",
              color: "text.secondary",
            }}
          >
            {fmtShortDate(item.cancelled_at || item.assignment_date)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}
