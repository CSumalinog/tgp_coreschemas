import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import {
  getNotificationDestination,
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

const FILTERS = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "requests", label: "Requests" },
  { key: "schedule", label: "Schedule" },
];

export default function NotificationsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();
  const border = isDark ? BORDER_DARK : BORDER;

  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");

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
      setNotifications(data || []);
    }

    setLoading(false);
  }, []);

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
          {FILTERS.map((item) => {
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
                        fontSize: "0.74rem",
                        lineHeight: 1.6,
                        color: unread ? "text.secondary" : "text.disabled",
                      }}
                    >
                      {notification.message}
                    </Typography>
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