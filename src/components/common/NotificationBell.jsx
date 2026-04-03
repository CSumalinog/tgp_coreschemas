// src/components/common/NotificationBell.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Badge,
  Tooltip,
  ClickAwayListener,
  CircularProgress,
  useTheme,
} from "@mui/material";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import CheckIcon from "@mui/icons-material/Check";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

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
  const anchorRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const isInitialLoad = useRef(true);

  const fetchNotifications = useCallback(
    async (showSpinner = false) => {
      if (!userId) return;
      if (showSpinner) setLoading(true);

      let { data, error } = await supabase
        .from("notifications")
        .select("id, title, message, type, is_read, request_id, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (!error && data) {
        setNotifications(data);
      } else if (error) {
        console.error("Notification fetch failed:", error.message);
      }
      if (showSpinner) setLoading(false);
    },
    [userId],
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

  // ── Mark one as read + navigate ───────────────────────────────────────────
  const markRead = async (notif) => {
    if (!notif.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n)),
      );
    }
    if (notif.request_id) {
      const path = window.location.pathname;
      if (path.startsWith("/admin"))
        navigate("/admin/request-management", {
          state: { openRequestId: notif.request_id },
        });
      if (path.startsWith("/client")) navigate("/client/request-tracker");
      if (path.startsWith("/sec_head"))
        navigate("/sec_head/coverage-assignment");
      if (path.startsWith("/staff")) navigate("/staff/my-assignment");
    }
    setOpen(false);
  };

  // ── Mark all as read ──────────────────────────────────────────────────────
  const markAllRead = async (e) => {
    e.stopPropagation();
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  return (
    <ClickAwayListener onClickAway={() => setOpen(false)}>
      <Box ref={anchorRef} sx={{ position: "relative" }}>
        {/* ── Bell button ── */}
        <Tooltip title="Notifications" arrow>
          <IconButton
            size="small"
            onClick={() => setOpen((p) => !p)}
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
              sx={{
                "& .MuiBadge-badge": {
                  fontSize: "0.6rem",
                  height: 15,
                  minWidth: 15,
                  backgroundColor: "#c62828",
                  color: "#fff",
                  fontFamily: dm,
                },
              }}
            >
              <NotificationsNoneOutlinedIcon sx={{ fontSize: 18 }} />
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
              zIndex: 1400,
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
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
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
              {unreadCount > 0 && (
                <Box
                  onClick={markAllRead}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                    cursor: "pointer",
                    px: 1,
                    py: 0.4,
                    borderRadius: "10px",
                    transition: "background 0.12s",
                    "&:hover": {
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : HOVER_BG,
                    },
                  }}
                >
                  <CheckIcon sx={{ fontSize: 12, color: "text.secondary" }} />
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.7rem",
                      color: "text.secondary",
                    }}
                  >
                    Mark all read
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Body */}
            <Box
              sx={{
                overflowY: "auto",
                flex: 1,
                "&::-webkit-scrollbar": { width: 0 },
              }}
            >
              {loading ? (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    py: 5,
                  }}
                >
                  <CircularProgress size={20} sx={{ color: GOLD }} />
                </Box>
              ) : notifications.length === 0 ? (
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
                notifications.map((notif) => {
                  const cfg = getTypeCfg(notif.type);
                  const Icon = cfg.icon;
                  const unread = !notif.is_read;

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
                          borderRadius: "10px",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: unread
                            ? `${cfg.dot}18`
                            : isDark
                              ? "rgba(255,255,255,0.05)"
                              : "rgba(53,53,53,0.05)",
                          border: `1.5px solid ${unread ? `${cfg.dot}30` : "transparent"}`,
                        }}
                      >
                        <Icon
                          sx={{
                            fontSize: 17,
                            color: unread ? cfg.dot : "text.disabled",
                          }}
                        />
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
                          {notif.message}
                        </Typography>

                        {/* Type badge — only on unread */}
                        {unread && (
                          <Box
                            sx={{
                              mt: 0.6,
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.4,
                              px: 0.75,
                              py: 0.15,
                              borderRadius: "10px",
                              backgroundColor: `${cfg.dot}18`,
                            }}
                          >
                            <Box
                              sx={{
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                backgroundColor: cfg.dot,
                                flexShrink: 0,
                              }}
                            />
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.6rem",
                                fontWeight: 700,
                                color: cfg.dot,
                                letterSpacing: "0.04em",
                              }}
                            >
                              {cfg.label}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                })
              )}
            </Box>
          </Box>
        )}
      </Box>
    </ClickAwayListener>
  );
}
