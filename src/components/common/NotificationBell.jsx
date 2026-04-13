// src/components/common/NotificationBell.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Avatar,
  Tooltip,
  ClickAwayListener,
  CircularProgress,
  Menu,
  MenuItem,
  ListItemIcon,
  useTheme,
} from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DoneAllOutlinedIcon from "@mui/icons-material/DoneAllOutlined";
import RefreshOutlinedIcon from "@mui/icons-material/RefreshOutlined";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutwardOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutlineOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "./UserAvatar";
import BrandedLoader from "./BrandedLoader";
import { getMuiNumberBadgeSx } from "./numberBadgeStyles";
import {
  getNotificationDestination,
  getNotificationPagePath,
  isNotificationNavigable,
} from "../../utils/notificationRouting";
import {
  LAYOUT_ICON_BASE,
  LAYOUT_ICON_MD,
  MODAL_TAB_HEIGHT,
} from "../../utils/layoutTokens";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_12 = "rgba(245,197,43,0.12)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

// ── Notification type config ──────────────────────────────────────────────────
// Each type has: dot color, icon, label, and left border color for unread
const TYPE_CONFIG = {
  new_request: {
    dot: "#3b82f6",
    icon: AddCircleOutlineIcon,
    label: "New Request",
    border: "#3b82f6",
  },
  time_in_alert: {
    dot: "#f59e0b",
    icon: HowToRegOutlinedIcon,
    label: "Time In",
    border: "#f59e0b",
  },
  for_approval: {
    dot: "#8b5cf6",
    icon: AssignmentOutlinedIcon,
    label: "For Approval",
    border: "#8b5cf6",
  },
  approved: {
    dot: "#22c55e",
    icon: CheckCircleOutlineIcon,
    label: "Approved",
    border: "#22c55e",
  },
  declined: {
    dot: "#ef4444",
    icon: CancelOutlinedIcon,
    label: "Declined",
    border: "#ef4444",
  },
  assigned: {
    dot: "#3b82f6",
    icon: AssignmentOutlinedIcon,
    label: "Assignment",
    border: "#3b82f6",
  },
  forwarded: {
    dot: "#8b5cf6",
    icon: ForwardToInboxOutlinedIcon,
    label: "Forwarded",
    border: "#8b5cf6",
  },
  default: {
    dot: GOLD,
    icon: InfoOutlinedIcon,
    label: "Notification",
    border: GOLD,
  },
};

const getTypeCfg = (type) => TYPE_CONFIG[type] || TYPE_CONFIG.default;

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getCoverageRequestLabel(message, fallbackTitle) {
  const fromQuotedMessage = String(message || "").match(/"([^"]+)"/);
  if (fromQuotedMessage?.[1]) return fromQuotedMessage[1];
  return fallbackTitle || "this request";
}

function getRequestLabel(message, fallbackTitle) {
  const fromQuotedMessage = String(message || "").match(/"([^"]+)"/);
  if (fromQuotedMessage?.[1]) return fromQuotedMessage[1];

  const beforeVerb = String(message || "").match(/^(.+?)\s+has\s+been\s+/i);
  if (beforeVerb?.[1]) {
    return beforeVerb[1].replace(/^"|"$/g, "").trim();
  }

  return fallbackTitle || "this request";
}

function getSectionFromCoverageMessage(message) {
  const sectionMatch = String(message || "").match(/\bby\s+(.+?)(?:\.|$)/i);
  return sectionMatch?.[1]?.trim() || "";
}

function buildCoverageRequestMessage(notification, requesterName) {
  if (!requesterName || requesterName === "Unknown requester") {
    return notification.message;
  }

  const requestLabel = getCoverageRequestLabel(
    notification.message,
    notification.title,
  );
  const section = getSectionFromCoverageMessage(notification.message);
  const fromClause = section ? ` from ${section}` : "";

  return `${requesterName}${fromClause} submitted "${requestLabel}".`;
}

function getReasonFromMessage(message) {
  const reasonMatch = String(message || "").match(/Reason:\s*(.+)$/i);
  return reasonMatch?.[1]?.trim() || "";
}

function getRescheduleDateFromMessage(message) {
  const dateMatch = String(message || "").match(
    /rescheduled\s+to\s+(.+?)(?:\.|$)/i,
  );
  return dateMatch?.[1]?.trim() || "";
}

function buildRequestCancelledMessage(notification, actorLabel) {
  if (!actorLabel || actorLabel === "Unknown requester") {
    return notification.message;
  }

  const requestLabel = getRequestLabel(
    notification.message,
    notification.title,
  );
  const reason = getReasonFromMessage(notification.message);

  return `${actorLabel} cancelled the request for "${requestLabel}".${reason ? ` Reason: ${reason}` : ""}`;
}

function buildRequestRescheduledMessage(notification, actorLabel) {
  if (!actorLabel || actorLabel === "Unknown requester") {
    return notification.message;
  }

  const requestLabel = getRequestLabel(
    notification.message,
    notification.title,
  );
  const nextDate = getRescheduleDateFromMessage(notification.message);
  const reason = getReasonFromMessage(notification.message);
  const dateClause = nextDate ? ` to ${nextDate}` : "";

  return `${actorLabel} rescheduled the request for "${requestLabel}"${dateClause}.${reason ? ` Reason: ${reason}` : ""}`;
}

function buildForwardedMessage(notification, actorLabel) {
  if (!actorLabel || actorLabel === "Unknown requester") {
    return notification.message;
  }

  const requestLabel = getRequestLabel(
    notification.message,
    notification.title,
  );
  return `${actorLabel} forwarded "${requestLabel}" for staff assignment.`;
}

function buildDutyChangeRejectedMessage(notification, actorLabel) {
  if (!actorLabel || actorLabel === "Unknown requester") {
    return notification.message;
  }

  const message = String(notification.message || "");
  const changeMatch = message.match(
    /change\s+from\s+(.+?)\s+to\s+(.+?)\s+was\s+rejected/i,
  );
  const reasonMatch = message.match(/Reason:\s*(.+)$/i);

  if (!changeMatch) {
    return `${actorLabel} declined your duty day change request.${reasonMatch?.[1] ? ` Reason: ${reasonMatch[1].trim()}` : ""}`;
  }

  const fromDay = changeMatch[1]?.trim();
  const toDay = changeMatch[2]?.trim();
  const reason = reasonMatch?.[1]?.trim();

  return `${actorLabel} declined your duty day change request from ${fromDay} to ${toDay}.${reason ? ` Reason: ${reason}` : ""}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function NotificationBell({ userId }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const border = isDark ? BORDER_DARK : BORDER;

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [filterKey, setFilterKey] = useState("all");
  const [headerMenuAnchor, setHeaderMenuAnchor] = useState(null);
  const [requesterProfiles, setRequesterProfiles] = useState({});
  const anchorRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const filteredNotifications =
    filterKey === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;
  const visibleNotifications = filteredNotifications.slice(0, 5);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const isInitialLoad = useRef(true);

  const loadRequesterProfiles = useCallback(async (rows) => {
    const requesterIds = [
      ...new Set(rows.map((row) => row.created_by).filter(Boolean)),
    ];

    if (!requesterIds.length) {
      setRequesterProfiles({});
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, section, designation, avatar_url")
      .in("id", requesterIds);

    if (error) {
      console.error("Requester profile fetch failed:", error.message);
      return;
    }

    const profileMap = (data || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    setRequesterProfiles(profileMap);
  }, []);

  const fetchNotifications = useCallback(
    async (showSpinner = false) => {
      if (!userId) return;
      if (showSpinner) setLoading(true);

      let { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data);
        loadRequesterProfiles(data);
      } else if (error) {
        console.error("Notification fetch failed:", error.message);
      }
      if (showSpinner) setLoading(false);
    },
    [userId, loadRequesterProfiles],
  );

  useEffect(() => {
    fetchNotifications(true);
    isInitialLoad.current = false;
  }, [fetchNotifications]);

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchNotifications(false),
      )
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [userId, fetchNotifications]);

  const updateReadState = async (notif, nextReadState) => {
    setActionError("");
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: nextReadState })
      .eq("id", notif.id);

    if (error) {
      setActionError("Could not update notification status.");
      return false;
    }

    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notif.id ? { ...n, is_read: nextReadState } : n,
      ),
    );

    return true;
  };

  // ── Mark one as read + navigate ───────────────────────────────────────────
  const markRead = async (notif) => {
    if (!notif.is_read) {
      const ok = await updateReadState(notif, true);
      if (!ok) return;
    }

    const destination = getNotificationDestination(notif);
    if (destination) {
      navigate(destination.path, { state: destination.state });
    }

    setOpen(false);
  };

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = async () => {
    setActionError("");
    if (!unreadCount) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      setActionError("Could not mark notifications as read.");
      return;
    }

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleViewAll = () => {
    const notificationsPath = getNotificationPagePath(window.location.pathname);
    if (!notificationsPath) return;
    closeHeaderMenu();
    setOpen(false);
    navigate(notificationsPath);
  };

  const openHeaderMenu = (event) => {
    event.stopPropagation();
    setHeaderMenuAnchor(event.currentTarget);
  };

  const closeHeaderMenu = () => {
    setHeaderMenuAnchor(null);
  };

  const handleClickAway = () => {
    if (headerMenuAnchor) return;
    setOpen(false);
    closeHeaderMenu();
  };

  return (
    <ClickAwayListener onClickAway={handleClickAway}>
      <Box ref={anchorRef} sx={{ position: "relative" }}>
        {/* ── Bell button ── */}
        <Tooltip title="Notifications" arrow>
          <IconButton
            size="small"
            onClick={() => {
              setOpen((prev) => {
                const next = !prev;
                if (!next) closeHeaderMenu();
                return next;
              });
            }}
            sx={{
              borderRadius: "10px",
              p: 0.9,
              border: `1px solid ${open ? GOLD : border}`,
              backgroundColor: open ? GOLD_08 : "transparent",
              color: open ? CHARCOAL : "text.secondary",
              transition: "all 0.15s",
              "&:hover": {
                backgroundColor: GOLD_08,
                borderColor: GOLD,
                color: CHARCOAL,
              },
            }}
          >
            <Badge
              badgeContent={unreadCount}
              invisible={unreadCount === 0}
              sx={[
                getMuiNumberBadgeSx({
                  size: 15,
                  bgColor: GOLD,
                  textColor: "#ffffff",
                  fontFamily: dm,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                }),
                {
                  "& .MuiBadge-badge": {
                    top: 0,
                    right: 0,
                    transform: "translate(55%, -55%)",
                    boxShadow: `0 0 0 2px ${isDark ? "#1a1a1a" : "#ffffff"}`,
                  },
                },
              ]}
            >
              <NotificationsNoneOutlinedIcon
                sx={{ fontSize: LAYOUT_ICON_MD }}
              />
            </Badge>
          </IconButton>
        </Tooltip>

        {/* ── Dropdown panel ── */}
        {open && (
          <Box
            sx={{
              position: "absolute",
              top: "calc(100% + 8px)",
              right: 0,
              width: 350,
              maxHeight: "auto",
              minHeight: "auto",
              zIndex: 1200,
              borderRadius: "10px",
              border: `1px solid ${border}`,
              backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
              boxShadow: isDark
                ? "0 12px 40px rgba(0,0,0,0.5)"
                : "0 8px 32px rgba(53,53,53,0.12)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "fadeDown 0.16s ease",
              "@keyframes fadeDown": {
                from: { opacity: 0, transform: "translateY(-6px)" },
                to: { opacity: 1, transform: "translateY(0)" },
              },
            }}
          >
            {/* Header */}
            <Box
              sx={{
                px: 2,
                py: 1.5,
                borderBottom: `1px solid ${border}`,
                display: "flex",
                flexDirection: "column",
                gap: 1,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 3,
                      height: 14,
                      borderRadius: "10px",
                      backgroundColor: GOLD,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "text.primary",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Notifications
                  </Typography>
                  {unreadCount > 0 && (
                    <Box
                      sx={{
                        px: 0.75,
                        py: 0.1,
                        borderRadius: "10px",
                        backgroundColor: GOLD_12,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "#b45309",
                        }}
                      >
                        {unreadCount} new
                      </Typography>
                    </Box>
                  )}
                </Box>

                <IconButton
                  size="small"
                  onClick={openHeaderMenu}
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
                  <MoreVertIcon sx={{ fontSize: LAYOUT_ICON_MD }} />
                </IconButton>
              </Box>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 0.7,
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.7,
                    flexWrap: "nowrap",
                    overflowX: "auto",
                  }}
                >
                  {[
                    { key: "all", label: "All" },
                    { key: "unread", label: "Unread" },
                  ].map((item) => {
                    const active = filterKey === item.key;
                    return (
                      <Box
                        key={item.key}
                        onClick={() => setFilterKey(item.key)}
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          px: 1.1,
                          height: MODAL_TAB_HEIGHT,
                          flexShrink: 0,
                          borderRadius: "10px",
                          border: `1px solid ${active ? "#212121" : border}`,
                          backgroundColor: active ? "#212121" : "transparent",
                          color: active ? "#fff" : "text.secondary",
                          fontFamily: dm,
                          fontSize: "0.68rem",
                          fontWeight: active ? 700 : 500,
                          cursor: "pointer",
                          transition: "all 0.12s",
                        }}
                      >
                        {item.label}
                      </Box>
                    );
                  })}
                </Box>

                <Typography
                  onClick={handleViewAll}
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#212121",
                    cursor: "pointer",
                  }}
                >
                  See all
                </Typography>
              </Box>
            </Box>

            {/* Body */}
            <Box
              sx={{
                overflowY: "auto",
                flex: 1,
                "&::-webkit-scrollbar": { width: 0 },
              }}
            >
              {actionError && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderBottom: `1px solid ${border}`,
                    backgroundColor: isDark
                      ? "rgba(239,68,68,0.12)"
                      : "rgba(254,242,242,0.9)",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.68rem",
                      color: "#b91c1c",
                    }}
                  >
                    {actionError}
                  </Typography>
                </Box>
              )}
              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 5,
                  }}
                >
                  <BrandedLoader size={34} inline />
                </Box>
              ) : filteredNotifications.length === 0 ? (
                <Box
                  sx={{
                    py: 6,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <NotificationsNoneOutlinedIcon
                    sx={{ fontSize: 32, color: "text.disabled" }}
                  />
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.secondary",
                    }}
                  >
                    No notifications yet
                  </Typography>
                </Box>
              ) : (
                visibleNotifications.map((notif) => {
                  const cfg = getTypeCfg(notif.type);
                  const Icon = cfg.icon;
                  const unread = !notif.is_read;
                  const navigable = isNotificationNavigable(notif);
                  const requester = requesterProfiles[notif.created_by] || null;
                  const requesterName =
                    requester?.full_name || "Unknown requester";
                  const requesterSection = requester?.section || "";
                  const requesterDesignation =
                    requester?.designation || requesterSection;
                  const actorLabel =
                    requesterName === "Unknown requester"
                      ? requesterName
                      : `${requesterName}${requesterSection ? ` from ${requesterSection}` : ""}`;
                  const forwardedActorLabel =
                    requesterName === "Unknown requester"
                      ? requesterName
                      : `${requesterName}${requesterDesignation ? ` - ${requesterDesignation}` : ""}`;
                  const requesterAvatarUrl = getAvatarUrl(
                    requester?.avatar_url,
                  );
                  const isCoverageRequest = notif.type === "new_request";
                  const isRequestCancelled = notif.type === "request_cancelled";
                  const isRequestRescheduled =
                    notif.type === "request_rescheduled";
                  const isForwarded = notif.type === "forwarded";
                  const isDutyChangeRejected =
                    notif.type === "duty_schedule_change_rejected";

                  let displayMessage = notif.message;
                  if (isCoverageRequest) {
                    displayMessage = buildCoverageRequestMessage(
                      notif,
                      requesterName,
                    );
                  } else if (isRequestCancelled) {
                    displayMessage = buildRequestCancelledMessage(
                      notif,
                      actorLabel,
                    );
                  } else if (isRequestRescheduled) {
                    displayMessage = buildRequestRescheduledMessage(
                      notif,
                      actorLabel,
                    );
                  } else if (isForwarded) {
                    displayMessage = buildForwardedMessage(
                      notif,
                      forwardedActorLabel,
                    );
                  } else if (isDutyChangeRejected) {
                    displayMessage = buildDutyChangeRejectedMessage(
                      notif,
                      forwardedActorLabel,
                    );
                  }

                  return (
                    <Box
                      key={notif.id}
                      onClick={() => markRead(notif)}
                      sx={{
                        // ── Left border: only on unread ──
                        borderLeft: unread
                          ? `3px solid ${cfg.border}`
                          : "3px solid transparent",
                        px: 1.75,
                        py: 1.5,
                        borderBottom: `1px solid ${border}`,
                        cursor: "pointer",

                        // ── Background: stronger tint when unread ──
                        backgroundColor: unread
                          ? isDark
                            ? `${cfg.border}14`
                            : `${cfg.border}0d`
                          : "transparent",

                        transition: "background 0.12s",
                        display: "flex",
                        gap: 1.25,
                        alignItems: "flex-start",
                        "&:last-child": { borderBottom: "none" },
                        "&:hover": {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : HOVER_BG,
                        },
                      }}
                    >
                      {/* ── Type icon ── */}
                      <Box
                        sx={{
                          width: 32,
                          height: 32,
                          borderRadius: "50%",
                          flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        <Avatar
                          src={requesterAvatarUrl || undefined}
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            fontFamily: dm,
                            fontSize: "0.68rem",
                            fontWeight: 700,
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(53,53,53,0.14)",
                            color: isDark ? "#ffffff" : "#212121",
                          }}
                        >
                          {!requesterAvatarUrl &&
                            getInitials(requesterName || notif.title)}
                        </Avatar>

                        <Box
                          sx={{
                            width: 17,
                            height: 17,
                            borderRadius: "50%",
                            position: "absolute",
                            right: -2,
                            bottom: -2,
                            backgroundColor: "#ffffff",
                            zIndex: 1,
                            pointerEvents: "none",
                          }}
                        />

                        <Box
                          sx={{
                            width: 15,
                            height: 15,
                            borderRadius: "50%",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            position: "absolute",
                            right: -1,
                            bottom: -1,
                            backgroundColor: `${cfg.dot}18`,
                            border: `1px solid ${cfg.dot}44`,
                            zIndex: 2,
                          }}
                        >
                          <Icon
                            sx={{
                              fontSize: "10px !important",
                              color: cfg.dot,
                              lineHeight: 1,
                              display: "block",
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Content */}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 1,
                            mb: 0.25,
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.78rem",
                              fontWeight: unread ? 700 : 400,
                              color: unread ? "text.primary" : "text.secondary",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {notif.title}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.63rem",
                              color: "text.disabled",
                              flexShrink: 0,
                            }}
                          >
                            {timeAgo(notif.created_at)}
                          </Typography>
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.72rem",
                            color: unread
                              ? isDark
                                ? "rgba(255,255,255,0.65)"
                                : "rgba(53,53,53,0.75)"
                              : "text.disabled",
                            lineHeight: 1.5,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {displayMessage}
                        </Typography>
                      </Box>

                      {navigable && (
                        <Box
                          sx={{
                            width: 24,
                            height: 24,
                            borderRadius: "10px",
                            flexShrink: 0,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundColor: "transparent",
                            color: unread ? "text.secondary" : "text.disabled",
                            mt: 0.1,
                          }}
                        >
                          <ArrowOutwardIcon sx={{ fontSize: 14 }} />
                        </Box>
                      )}
                    </Box>
                  );
                })
              )}

              {filteredNotifications.length > 5 && (
                <Box
                  sx={{
                    px: 2,
                    py: 1,
                    borderTop: `1px solid ${border}`,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.02)"
                      : "#fafafa",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.67rem",
                      color: "text.secondary",
                      textAlign: "center",
                    }}
                  >
                    Showing latest 5 of {filteredNotifications.length}
                  </Typography>
                </Box>
              )}
            </Box>

            <Menu
              anchorEl={headerMenuAnchor}
              open={Boolean(headerMenuAnchor)}
              onClose={closeHeaderMenu}
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              transformOrigin={{ vertical: "top", horizontal: "right" }}
              slotProps={{
                paper: {
                  sx: {
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    minWidth: 170,
                  },
                },
              }}
            >
              <MenuItem
                disabled={unreadCount === 0}
                onClick={async () => {
                  await markAllRead();
                  closeHeaderMenu();
                }}
                sx={{ fontFamily: dm, fontSize: "0.76rem" }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <DoneAllOutlinedIcon
                    sx={{ fontSize: LAYOUT_ICON_BASE, color: "text.secondary" }}
                  />
                </ListItemIcon>
                Mark all as read
              </MenuItem>
              <MenuItem
                onClick={async () => {
                  await fetchNotifications(true);
                  closeHeaderMenu();
                }}
                sx={{ fontFamily: dm, fontSize: "0.76rem" }}
              >
                <ListItemIcon sx={{ minWidth: 28 }}>
                  <RefreshOutlinedIcon
                    sx={{ fontSize: LAYOUT_ICON_BASE, color: "text.secondary" }}
                  />
                </ListItemIcon>
                Refresh
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
