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
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMoreOutlined";
import { supabase } from "../../lib/supabaseClient";
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
  FILTER_SEMESTER_MIN_WIDTH,
  FILTER_STATUS_MIN_WIDTH,
} from "../../utils/layoutTokens";

import {
  TimeInModal,
  OnGoingAlertDialog,
} from "../../components/regular_staff/TimeIn";
import QRScanCompleteDialog from "../../components/regular_staff/QRScanCompleteDialog";

// ── Brand tokens ──────────────────────────────────────────────────────────────
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
};

// ── Helpers ───────────────────────────────────────────────────────────────────
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
const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

// ── Assignment Card ───────────────────────────────────────────────────────────
function AssignmentCard({
  a,
  isDark,
  border,
  onView,
  onTimeIn,
  onComplete,
  onArchive,
  onTrash,
}) {
  const cfg = STATUS_CFG[a.status] || { accent: "#9ca3af" };
  const req = a.request;
  const canTimeIn = ["Assigned", "Approved"].includes(a.status);
  const state = canTimeIn ? getTimeInState(req) : null;
  const [menuAnchor, setMenuAnchor] = useState(null);

  return (
    <Box
      onClick={() => onView(a)}
      sx={{
        position: "relative",
        borderRadius: "10px",
        border: `1px solid ${border}`,
        backgroundColor: "background.paper",
        overflow: "hidden",
        cursor: "pointer",
        transition: "box-shadow 0.18s, transform 0.18s",
        "&:hover": {
          boxShadow: isDark
            ? "0 4px 20px rgba(0,0,0,0.35)"
            : "0 4px 20px rgba(53,53,53,0.10)",
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box
        sx={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          borderRadius: "10px 0 0 10px",
          backgroundColor: cfg.accent,
        }}
      />
      <Box
        sx={{
          pl: 2.5,
          pr: 2,
          pt: 1.75,
          pb: 1.75,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            flexWrap: "wrap",
          }}
        >
          <StatusPill status={a.status} isDark={isDark} />
          {isWeekendDate(req?.event_date) && <WeekendBadge isDark={isDark} />}
          <Box sx={{ flex: 1 }} />
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
                primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}
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
        </Box>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "0.92rem",
            color: "text.primary",
            lineHeight: 1.35,
          }}
        >
          {req?.title || "—"}
        </Typography>
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
                {req.to_time ? ` — ${formatTime(req.to_time)}` : ""}
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
                py: 0.9,
                borderRadius: "10px",
                border: `1px solid rgba(239,68,68,0.25)`,
                backgroundColor: "rgba(239,68,68,0.04)",
                fontFamily: dm,
                fontSize: "0.76rem",
                color: "#b91c1c",
              }}
            >
              Time In window has passed
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
    </Box>
  );
}

// ── Assignment Detail Dialog ──────────────────────────────────────────────────
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
      PaperProps={{
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
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              mb: 0.6,
              flexWrap: "wrap",
            }}
          >
            <Box
              sx={{
                width: 2.5,
                height: 22,
                borderRadius: "10px",
                backgroundColor: GOLD,
                flexShrink: 0,
              }}
            />
            <StatusPill status={assignment.status} isDark={isDark} />
            {isWeekendDate(req?.event_date) && <WeekendBadge isDark={isDark} />}
          </Box>
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "text.primary",
              lineHeight: 1.35,
              pl: 0.5,
            }}
          >
            {req?.title || "—"}
          </Typography>
          {assignment.assigned_by_profile?.full_name && (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.7rem",
                color: "text.disabled",
                mt: 0.3,
                pl: 0.5,
              }}
            >
              Assigned by {assignment.assigned_by_profile.full_name}
            </Typography>
          )}
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            borderRadius: "10px",
            color: "text.secondary",
            flexShrink: 0,
            "&:hover": { backgroundColor: HOVER_BG },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      <Box
        sx={{
          px: 3,
          py: 1.75,
          display: "flex",
          flexWrap: "wrap",
          gap: 2.5,
          borderBottom: `1px solid ${border}`,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.02)"
            : "rgba(53,53,53,0.02)",
          flexShrink: 0,
        }}
      >
        {req?.event_date && (
          <InfoChip
            icon={
              <CalendarTodayOutlinedIcon sx={{ fontSize: 12, color: GOLD }} />
            }
            label="Date"
          >
            {new Date(req.event_date).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </InfoChip>
        )}
        {req?.from_time && (
          <InfoChip
            icon={<AccessTimeOutlinedIcon sx={{ fontSize: 12, color: GOLD }} />}
            label="Time"
          >
            {formatTime(req.from_time)}
            {req.to_time ? ` — ${formatTime(req.to_time)}` : ""}
          </InfoChip>
        )}
        {req?.venue && (
          <InfoChip
            icon={<LocationOnOutlinedIcon sx={{ fontSize: 12, color: GOLD }} />}
            label="Venue"
          >
            {req.venue}
          </InfoChip>
        )}
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
          {req?.description && (
            <DetailSection
              label="Description"
              icon={<DescriptionOutlinedIcon sx={{ fontSize: 13 }} />}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "text.primary",
                  lineHeight: 1.65,
                }}
              >
                {req.description}
              </Typography>
            </DetailSection>
          )}
          <DetailSection
            label="Client"
            icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 13 }} />}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.4 }}>
              {req?.entity?.name && (
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    color: "text.primary",
                    fontWeight: 500,
                  }}
                >
                  {req.entity.name}
                </Typography>
              )}
              {req?.contact_person && (
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    color: "text.secondary",
                  }}
                >
                  Contact: {req.contact_person}
                </Typography>
              )}
              {req?.contact_info && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PhoneOutlinedIcon
                    sx={{ fontSize: 12, color: "text.disabled" }}
                  />
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.secondary",
                    }}
                  >
                    {req.contact_info}
                  </Typography>
                </Box>
              )}
            </Box>
          </DetailSection>
          <DetailSection
            label="Co-Staffers Assigned"
            icon={<GroupOutlinedIcon sx={{ fontSize: 13 }} />}
          >
            {coStaffers.length === 0 ? (
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  color: "text.disabled",
                }}
              >
                No other staffers assigned.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                {Object.entries(coStaffersBySection).map(
                  ([section, staffers]) => {
                    const colors = SECTION_COLORS[section] || {
                      bg: "#f3f4f6",
                      color: "#6b7280",
                    };
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
                        <Box
                          sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}
                        >
                          {staffers.map((staffer) => (
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
                                sx={{
                                  width: 20,
                                  height: 20,
                                  fontSize: "0.58rem",
                                  fontWeight: 700,
                                  backgroundColor: colors.bg,
                                  color: colors.color,
                                }}
                              >
                                {getInitials(staffer.full_name)}
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
                  },
                )}
              </Box>
            )}
          </DetailSection>
          {req?.file_url && (
            <DetailSection
              label="Attachment"
              icon={<InsertDriveFileOutlinedIcon sx={{ fontSize: 13 }} />}
            >
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
                <ChevronRightIcon
                  sx={{ fontSize: 13, color: "text.disabled" }}
                />
              </Box>
            </DetailSection>
          )}
          {["Assigned", "Approved"].includes(assignment.status) &&
            getTimeInState(assignment.request) === "open" && (
              <Box
                sx={{
                  display: "flex",
                  gap: 1,
                  px: 1.5,
                  py: 1.25,
                  borderRadius: "10px",
                  backgroundColor: "rgba(59,130,246,0.06)",
                  border: `1px solid rgba(59,130,246,0.25)`,
                }}
              >
                <HowToRegOutlinedIcon
                  sx={{
                    fontSize: 14,
                    color: "#1d4ed8",
                    flexShrink: 0,
                    mt: 0.1,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.76rem",
                    color: "#1d4ed8",
                    lineHeight: 1.55,
                  }}
                >
                  Coverage is starting soon. Tap <strong>Time In</strong> when
                  you arrive at the venue.
                </Typography>
              </Box>
            )}
          {assignment.status === "On Going" && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                px: 1.5,
                py: 1.25,
                borderRadius: "10px",
                backgroundColor: "rgba(34,197,94,0.06)",
                border: `1px solid rgba(34,197,94,0.25)`,
              }}
            >
              <CheckCircleOutlineIcon
                sx={{ fontSize: 14, color: "#15803d", flexShrink: 0, mt: 0.1 }}
              />
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
                  <HowToRegOutlinedIcon sx={{ fontSize: 14 }} />
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
            <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />
            Mark Complete
          </PrimaryBtn>
        )}
      </Box>
    </Dialog>
  );
}

// ── Confirm Complete Dialog ───────────────────────────────────────────────────
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

// ── Main Page ─────────────────────────────────────────────────────────────────
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

  const [timeInTarget, setTimeInTarget] = useState(null);
  const [timingIn, setTimingIn] = useState(false);
  const [timeInError, setTimeInError] = useState("");
  const [onGoingAlert, setOnGoingAlert] = useState(null);

  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState(0);
  const timeInNotifiedRef = useRef(new Set());

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
        id, status, section, assignment_date, assigned_at, timed_in_at,
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

  const handleArchive = async (requestId) => {
    if (!requestId || !currentUser?.id) return;
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
        setOnGoingAlert(match);
        // Browser notification — fires once per assignment
        if (
          !timeInNotifiedRef.current.has(match.id) &&
          "Notification" in window
        ) {
          timeInNotifiedRef.current.add(match.id);
          const fire = () => {
            try {
              new Notification("TGP — Time to Check In", {
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
        applyFilters(assignments.filter((a) => a.status === "Completed")),
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
    const { data: allA } = await supabase
      .from("coverage_assignments")
      .select("status")
      .eq("request_id", confirmTarget.request.id);
    if ((allA || []).every((a) => a.status === "Completed")) {
      await supabase
        .from("coverage_requests")
        .update({ status: "Completed", completed_at: now })
        .eq("id", confirmTarget.request.id);
    }
    setConfirmTarget(null);
    setCompleting(false);
    loadAssignments();
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
      const { error: reqErr } = await supabase
        .from("coverage_requests")
        .update({ status: "On Going" })
        .eq("id", timeInTarget.request.id);
      if (reqErr) throw reqErr;
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
        ? " · GPS verified ✓"
        : gpsData?.lat
          ? " · GPS unverified"
          : " · GPS unavailable";
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
      setTimeInTarget(null);
      setOnGoingAlert(null);
      loadAssignments();
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

  const statusOptions = ["All", "On Going", "Completed"];

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

      {/* ── Controls row ── */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: FILTER_ROW_GAP,
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
          px: 1.25,
          py: 1,
          borderRadius: CONTROL_RADIUS,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f3f3f4",
        }}
      >
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

        <Divider
          orientation="vertical"
          flexItem
          sx={{
            mx: 0.75,
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
          {/* ── Settings gear ── */}
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
                setTimeInTarget(assignment);
              }}
              onComplete={(assignment) => {
                setCompleteError("");
                setConfirmTarget(assignment);
              }}
              onArchive={handleArchive}
              onTrash={handleTrash}
            />
          ))
        )}
      </Box>

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
          setTimeInTarget(a);
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
      <TimeInModal
        open={!!timeInTarget}
        assignment={timeInTarget}
        isDark={isDark}
        submitting={timingIn}
        error={timeInError}
        onClose={() => {
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
          setTimeInTarget(a);
        }}
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
              sx={{ color: "text.secondary" }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
          <Box sx={{ display: "flex", gap: "6px", px: 2.5, pb: 2 }}>
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
                    py: 0.55,
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

// ── Shared micro-components ───────────────────────────────────────────────────
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
