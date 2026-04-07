import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  CircularProgress,
  IconButton,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import CheckIcon from "@mui/icons-material/Check";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DraftsOutlinedIcon from "@mui/icons-material/DraftsOutlined";
import MarkunreadOutlinedIcon from "@mui/icons-material/MarkunreadOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import {
  getNotificationDestination,
  getRoleFromPathname,
  isNotificationNavigable,
} from "../../utils/notificationRouting";
import {
  PAGE_PADDING,
  PAGE_CONTENT_MAX_WIDTH,
  PAGE_CONTENT_INNER_GUTTER,
} from "../../utils/layoutTokens";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

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
    year: "numeric",
  });
}

const TYPE_CONFIG = {
  new_request: { dot: "#3b82f6", icon: AddCircleOutlineIcon },
  time_in_alert: { dot: "#f59e0b", icon: HowToRegOutlinedIcon },
  for_approval: { dot: "#8b5cf6", icon: AssignmentOutlinedIcon },
  approved: { dot: "#22c55e", icon: CheckCircleOutlineIcon },
  declined: { dot: "#ef4444", icon: CancelOutlinedIcon },
  forwarded: { dot: "#8b5cf6", icon: ForwardToInboxOutlinedIcon },
  assigned: { dot: "#3b82f6", icon: AssignmentOutlinedIcon },
  request_cancelled: { dot: "#ef4444", icon: CancelOutlinedIcon },
  request_rescheduled: { dot: "#3b82f6", icon: AddCircleOutlineIcon },
  assignment_cancelled: { dot: "#ef4444", icon: CancelOutlinedIcon },
  duty_schedule_change_requested: { dot: "#f59e0b", icon: HowToRegOutlinedIcon },
  duty_schedule_change_approved: { dot: "#22c55e", icon: CheckCircleOutlineIcon },
  duty_schedule_change_rejected: { dot: "#ef4444", icon: CancelOutlinedIcon },
  default: { dot: GOLD, icon: InfoOutlinedIcon },
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

  const requestLabel = getCoverageRequestLabel(notification.message, notification.title);
  const section = getSectionFromCoverageMessage(notification.message);
  const fromClause = section ? ` from ${section}` : "";

  return `${requesterName}${fromClause} submitted "${requestLabel}".`;
}

function getReasonFromMessage(message) {
  const reasonMatch = String(message || "").match(/Reason:\s*(.+)$/i);
  return reasonMatch?.[1]?.trim() || "";
}

function getRescheduleDateFromMessage(message) {
  const dateMatch = String(message || "").match(/rescheduled\s+to\s+(.+?)(?:\.|$)/i);
  return dateMatch?.[1]?.trim() || "";
}

function buildRequestCancelledMessage(notification, actorLabel) {
  if (!actorLabel || actorLabel === "Unknown requester") {
    return notification.message;
  }

  const requestLabel = getRequestLabel(notification.message, notification.title);
  const reason = getReasonFromMessage(notification.message);

  return `${actorLabel} cancelled the request for "${requestLabel}".${reason ? ` Reason: ${reason}` : ""}`;
}

function buildRequestRescheduledMessage(notification, actorLabel) {
  if (!actorLabel || actorLabel === "Unknown requester") {
    return notification.message;
  }

  const requestLabel = getRequestLabel(notification.message, notification.title);
  const nextDate = getRescheduleDateFromMessage(notification.message);
  const reason = getReasonFromMessage(notification.message);
  const dateClause = nextDate ? ` to ${nextDate}` : "";

  return `${actorLabel} rescheduled the request for "${requestLabel}"${dateClause}.${reason ? ` Reason: ${reason}` : ""}`;
}

function buildForwardedMessage(notification, actorLabel) {
  if (!actorLabel || actorLabel === "Unknown requester") {
    return notification.message;
  }

  const requestLabel = getRequestLabel(notification.message, notification.title);
  return `${actorLabel} forwarded "${requestLabel}" for staff assignment.`;
}

function buildDutyChangeRejectedMessage(notification, actorLabel) {
  if (!actorLabel || actorLabel === "Unknown requester") {
    return notification.message;
  }

  const message = String(notification.message || "");
  const changeMatch = message.match(/change\s+from\s+(.+?)\s+to\s+(.+?)\s+was\s+rejected/i);
  const reasonMatch = message.match(/Reason:\s*(.+)$/i);

  if (!changeMatch) {
    return `${actorLabel} declined your duty day change request.${reasonMatch?.[1] ? ` Reason: ${reasonMatch[1].trim()}` : ""}`;
  }

  const fromDay = changeMatch[1]?.trim();
  const toDay = changeMatch[2]?.trim();
  const reason = reasonMatch?.[1]?.trim();

  return `${actorLabel} declined your duty day change request from ${fromDay} to ${toDay}.${reason ? ` Reason: ${reason}` : ""}`;
}

function startsWithRequesterName(message, requesterName) {
  if (!message || !requesterName || requesterName === "Unknown requester") {
    return false;
  }

  return String(message)
    .toLowerCase()
    .startsWith(String(requesterName).toLowerCase());
}

export default function NotificationsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const location = useLocation();
  const navigate = useNavigate();
  const border = isDark ? BORDER_DARK : BORDER;
  const currentRole = getRoleFromPathname(location.pathname);

  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [requesterProfiles, setRequesterProfiles] = useState({});

  const filters = useMemo(() => {
    if (currentRole === "client") {
      return [
        { key: "all", label: "All" },
        { key: "unread", label: "Unread" },
      ];
    }

    const roleSpecific =
      currentRole === "staff"
        ? { key: "assignments", label: "Assignments" }
        : { key: "requests", label: "Requests" };

    return [
      { key: "all", label: "All" },
      { key: "unread", label: "Unread" },
      roleSpecific,
      { key: "schedule", label: "Schedule" },
    ];
  }, [currentRole]);

  useEffect(() => {
    const hasCurrentFilter = filters.some((item) => item.key === filter);
    if (!hasCurrentFilter) {
      setFilter("all");
    }
  }, [filters, filter]);

  const loadRequesterProfiles = useCallback(async (rows) => {
    const requesterIds = [...new Set(rows.map((row) => row.created_by).filter(Boolean))];

    if (!requesterIds.length) {
      setRequesterProfiles({});
      return;
    }

    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, section, position, designation, avatar_url")
      .in("id", requesterIds);

    if (profileError) {
      console.error("Requester profile fetch failed:", profileError.message);
      return;
    }

    const profileMap = (data || []).reduce((acc, profile) => {
      acc[profile.id] = profile;
      return acc;
    }, {});

    setRequesterProfiles(profileMap);
  }, []);

  const loadNotifications = useCallback(async (currentUserId) => {
    if (!currentUserId) return;

    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false })
      .limit(200);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      const rows = data || [];
      setNotifications(rows);
      loadRequesterProfiles(rows);
    }

    setLoading(false);
  }, [loadRequesterProfiles]);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);
      loadNotifications(user.id);
    }

    loadUser();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications-page:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => loadNotifications(userId),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadNotifications]);

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter((notification) => !notification.is_read);
    }

    if (filter === "requests") {
      return notifications.filter(
        (notification) =>
          !!notification.request_id ||
          !String(notification.type || "").startsWith("duty_schedule_change"),
      );
    }

    if (filter === "assignments") {
      return notifications.filter((notification) =>
        ["assigned", "assignment_cancelled"].includes(notification.type),
      );
    }

    if (filter === "schedule") {
      return notifications.filter((notification) =>
        String(notification.type || "").startsWith("duty_schedule_change"),
      );
    }

    return notifications;
  }, [filter, notifications]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.is_read).length,
    [notifications],
  );

  const updateNotificationState = useCallback((id, updater) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, ...updater } : notification,
      ),
    );
  }, []);

  const handleOpen = async (notification) => {
    setActionError("");

    if (!notification.is_read) {
      const { error: updateError } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);

      if (updateError) {
        setActionError(updateError.message);
        return;
      }

      updateNotificationState(notification.id, { is_read: true });
    }

    const destination = getNotificationDestination(notification);
    if (destination) {
      navigate(destination.path, { state: destination.state });
    }
  };

  const handleToggleRead = async (event, notification) => {
    event.stopPropagation();
    setActionError("");

    const nextReadState = !notification.is_read;
    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: nextReadState })
      .eq("id", notification.id);

    if (updateError) {
      setActionError(updateError.message);
      return;
    }

    updateNotificationState(notification.id, { is_read: nextReadState });
  };

  const handleDelete = async (event, notificationId) => {
    event.stopPropagation();
    setActionError("");

    const { error: deleteError } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationId);

    if (deleteError) {
      setActionError(deleteError.message);
      return;
    }

    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== notificationId),
    );
  };

  const handleMarkAllRead = async () => {
    if (!unreadCount) return;
    setActionError("");

    const unreadIds = notifications
      .filter((notification) => !notification.is_read)
      .map((notification) => notification.id);

    const { error: updateError } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);

    if (updateError) {
      setActionError(updateError.message);
      return;
    }

    setNotifications((prev) =>
      prev.map((notification) => ({ ...notification, is_read: true })),
    );
  };

  return (
    <Box
      sx={{
        p: PAGE_PADDING.compact,
        width: "100%",
        boxSizing: "border-box",
        overflowX: "hidden",
        minHeight: "100%",
        backgroundColor: "#ffffff",
        fontFamily: dm,
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: PAGE_CONTENT_MAX_WIDTH,
          mx: "auto",
          px: PAGE_CONTENT_INNER_GUTTER,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
            flexWrap: "wrap",
            mb: 2.5,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 600,
                fontSize: "0.95rem",
                color: "text.primary",
                letterSpacing: "-0.01em",
              }}
            >
              Notifications
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                color: "text.secondary",
                mt: 0.35,
              }}
            >
              Review updates, manage your inbox, and jump straight to the item that needs attention.
            </Typography>
          </Box>

          <Box
            onClick={handleMarkAllRead}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.65,
              px: 1.25,
              py: 0.65,
              borderRadius: "10px",
              cursor: unreadCount > 0 ? "pointer" : "not-allowed",
              border: `1px solid ${unreadCount > 0 ? "#212121" : border}`,
              backgroundColor: unreadCount > 0 ? "#212121" : "transparent",
              color: unreadCount > 0 ? "#ffffff" : "text.disabled",
              fontFamily: dm,
              fontSize: "0.76rem",
              fontWeight: 700,
              transition: "all 0.15s",
            }}
          >
            <CheckIcon sx={{ fontSize: 14 }} />
            Mark all read
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap", mb: 2 }}>
          {filters.map((item) => {
            const active = item.key === filter;
            return (
              <Box
                key={item.key}
                onClick={() => setFilter(item.key)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.55,
                  px: 1.25,
                  py: 0.55,
                  borderRadius: "10px",
                  cursor: "pointer",
                  border: `1px solid ${active ? "#212121" : border}`,
                  backgroundColor: active ? "#212121" : "transparent",
                  color: active ? "#ffffff" : "text.secondary",
                  fontFamily: dm,
                  fontSize: "0.74rem",
                  fontWeight: active ? 700 : 500,
                }}
              >
                {item.label}
                {item.key === "unread" && unreadCount > 0 && (
                  <Box
                    sx={{
                      minWidth: 16,
                      height: 16,
                      borderRadius: "10px",
                      px: 0.5,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: active ? "rgba(255,255,255,0.14)" : GOLD_08,
                      color: active ? "#ffffff" : "#7a5c00",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        lineHeight: 1,
                      }}
                    >
                      {unreadCount}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>
            {error}
          </Alert>
        )}

        {actionError && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: "10px" }}>
            {actionError}
          </Alert>
        )}

        {loading ? (
          <Box
            sx={{
              minHeight: "50vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress size={26} sx={{ color: GOLD }} />
          </Box>
        ) : filteredNotifications.length === 0 ? (
          <Box
            sx={{
              minHeight: "45vh",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 1,
              borderRadius: "10px",
              border: `1px solid ${border}`,
              backgroundColor: "#ffffff",
            }}
          >
            <NotificationsNoneOutlinedIcon
              sx={{ fontSize: 32, color: "text.disabled" }}
            />
            <Typography
              sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}
            >
              No notifications in this view.
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {filteredNotifications.map((notification) => {
            const unread = !notification.is_read;
            const navigable = isNotificationNavigable(notification);
            const requester = requesterProfiles[notification.created_by] || null;
            const requesterName = requester?.full_name || "Unknown requester";
            const requesterSection = requester?.section || "";
            const requesterDesignation = requester?.designation || requesterSection;
            const actorLabel =
              requesterName === "Unknown requester"
                ? requesterName
                : `${requesterName}${requesterSection ? ` from ${requesterSection}` : ""}`;
            const forwardedActorLabel =
              requesterName === "Unknown requester"
                ? requesterName
                : `${requesterName}${requesterDesignation ? ` - ${requesterDesignation}` : ""}`;
            const reviewerActorLabel =
              requesterName === "Unknown requester"
                ? requesterName
                : `${requesterName}${requesterDesignation ? ` - ${requesterDesignation}` : ""}`;
            const requesterAvatarUrl = getAvatarUrl(requester?.avatar_url);
            const typeCfg = getTypeCfg(notification.type);
            const TypeIcon = typeCfg.icon;
            const isCoverageRequest = notification.type === "new_request";
            const isRequestCancelled = notification.type === "request_cancelled";
            const isRequestRescheduled = notification.type === "request_rescheduled";
            const isForwarded = notification.type === "forwarded";
            const isDutyChangeRejected =
              notification.type === "duty_schedule_change_rejected";

            let displayMessage = notification.message;
            if (isCoverageRequest) {
              displayMessage = buildCoverageRequestMessage(notification, requesterName);
            } else if (isRequestCancelled) {
              displayMessage = buildRequestCancelledMessage(notification, actorLabel);
            } else if (isRequestRescheduled) {
              displayMessage = buildRequestRescheduledMessage(notification, actorLabel);
            } else if (isForwarded) {
              displayMessage = buildForwardedMessage(notification, forwardedActorLabel);
            } else if (isDutyChangeRejected) {
              displayMessage = buildDutyChangeRejectedMessage(notification, reviewerActorLabel);
            }

            const shouldShowRequesterLine =
              !startsWithRequesterName(displayMessage, requesterName);

            return (
              <Box
                key={notification.id}
                onClick={() => handleOpen(notification)}
                sx={{
                  p: 2,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  boxShadow: unread ? `inset 3px 0 0 ${GOLD}` : "none",
                  backgroundColor: unread ? GOLD_08 : "#ffffff",
                  cursor: navigable ? "pointer" : "default",
                  transition: "background-color 0.15s, border-color 0.15s",
                  "&:hover": {
                    backgroundColor: navigable
                      ? isDark
                        ? "rgba(255,255,255,0.04)"
                        : HOVER_BG
                      : unread
                        ? GOLD_08
                        : "#ffffff",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "space-between",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      minWidth: 0,
                      flex: 1,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1.3,
                    }}
                  >
                    <Box
                      sx={{
                        position: "relative",
                        mt: 0.1,
                        flexShrink: 0,
                        width: 42,
                        height: 42,
                      }}
                    >
                      <Tooltip title={requesterName} arrow>
                        <Avatar
                          src={requesterAvatarUrl || undefined}
                          sx={{
                            width: 42,
                            height: 42,
                            borderRadius: "50%",
                            fontFamily: dm,
                            fontSize: "0.8rem",
                            fontWeight: 700,
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.12)"
                              : "rgba(53,53,53,0.14)",
                            color: isDark ? "#ffffff" : "#212121",
                          }}
                        >
                          {!requesterAvatarUrl && getInitials(requester?.full_name)}
                        </Avatar>
                      </Tooltip>

                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          borderRadius: "50%",
                          position: "absolute",
                          right: -3,
                          bottom: -3,
                          backgroundColor: "#ffffff",
                          zIndex: 1,
                          pointerEvents: "none",
                        }}
                      />

                      <Box
                        sx={{
                          width: 18,
                          height: 18,
                          borderRadius: "50%",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          position: "absolute",
                          right: -2,
                          bottom: -2,
                          backgroundColor: `${typeCfg.dot}18`,
                          border: `1px solid ${typeCfg.dot}44`,
                          zIndex: 2,
                        }}
                      >
                        <TypeIcon
                          sx={{
                            fontSize: 11,
                            color: typeCfg.dot,
                          }}
                        />
                      </Box>
                    </Box>

                    <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        mb: 0.4,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.82rem",
                          fontWeight: unread ? 700 : 600,
                          color: "text.primary",
                        }}
                      >
                        {notification.title}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.68rem",
                          color: "text.disabled",
                          flexShrink: 0,
                        }}
                      >
                        {timeAgo(notification.created_at)}
                      </Typography>
                    </Box>

                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.66rem",
                        color: "text.disabled",
                        mb: 0.35,
                        display: shouldShowRequesterLine ? "block" : "none",
                      }}
                    >
                      {requesterName}
                    </Typography>

                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.74rem",
                        lineHeight: 1.6,
                        color: unread ? "text.secondary" : "text.disabled",
                      }}
                    >
                      {displayMessage}
                    </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                    <Tooltip title={notification.is_read ? "Mark as unread" : "Mark as read"} arrow>
                      <IconButton
                        size="small"
                        onClick={(event) => handleToggleRead(event, notification)}
                        sx={{ borderRadius: "10px" }}
                      >
                        {notification.is_read ? (
                          <MarkunreadOutlinedIcon sx={{ fontSize: 17 }} />
                        ) : (
                          <DraftsOutlinedIcon sx={{ fontSize: 17 }} />
                        )}
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete" arrow>
                      <IconButton
                        size="small"
                        onClick={(event) => handleDelete(event, notification.id)}
                        sx={{ borderRadius: "10px" }}
                      >
                        <DeleteOutlineOutlinedIcon sx={{ fontSize: 17 }} />
                      </IconButton>
                    </Tooltip>
                    {navigable && (
                      <Tooltip title="Open target" arrow>
                        <IconButton size="small" sx={{ borderRadius: "10px" }}>
                          <ArrowOutwardIcon sx={{ fontSize: 17 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Box>
            );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}