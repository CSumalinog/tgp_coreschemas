// src/pages/regular_staff/NotificationCleanup.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  Alert,
  IconButton,
  Tooltip,
  useTheme,
} from "@mui/material";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import CleaningServicesOutlinedIcon from "@mui/icons-material/CleaningServicesOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { supabase } from "../../lib/supabaseClient";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm = "'Inter', sans-serif";
const RED = "#dc2626";
const RED_08 = "rgba(220,38,38,0.08)";

function ConfirmDialog({ open, onClose, onConfirm, title, message, loading, destructive }) {
  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: "10px", width: 400, p: 0, fontFamily: dm, bgcolor: "background.paper" } }}>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 2 }}>
          {destructive ? (
            <Box sx={{ width: 34, height: 34, borderRadius: "10px", backgroundColor: RED_08, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: RED }} />
            </Box>
          ) : (
            <Box sx={{ width: 34, height: 34, borderRadius: "10px", backgroundColor: GOLD_08, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <ArchiveOutlinedIcon sx={{ fontSize: 17, color: GOLD }} />
            </Box>
          )}
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.92rem", color: "text.primary" }}>{title}</Typography>
        </Box>
        <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.6, mb: 3 }}>{message}</Typography>
        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Box onClick={onClose} sx={{ px: 2, py: 0.8, borderRadius: "4px", cursor: "pointer", fontFamily: dm, fontSize: "0.82rem", fontWeight: 600, color: "text.secondary", border: "1px solid", borderColor: "divider", userSelect: "none", transition: "all 0.15s", "&:hover": { borderColor: "text.secondary" } }}>Cancel</Box>
          <Box onClick={!loading ? onConfirm : undefined} sx={{ px: 2, py: 0.8, borderRadius: "4px", cursor: loading ? "not-allowed" : "pointer", fontFamily: dm, fontSize: "0.82rem", fontWeight: 700, color: "#fff", backgroundColor: destructive ? RED : "#212121", opacity: loading ? 0.7 : 1, userSelect: "none", transition: "all 0.15s", "&:hover": !loading ? { backgroundColor: destructive ? "#b91c1c" : "#333" } : {} }}>
            {loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : destructive ? "Delete" : "Confirm"}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}

export default function NotificationCleanup() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [loading, setLoading] = useState(true);
  const [notifLoading, setNotifLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [notifStats, setNotifStats] = useState({ total: 0, read: 0 });
  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", destructive: false, action: null });
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    })();
  }, []);

  const fetchNotifStats = useCallback(async () => {
    if (!userId) return;
    const { count: total } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId);
    const { count: read } = await supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("is_read", true);
    setNotifStats({ total: total || 0, read: read || 0 });
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    (async () => {
      setLoading(true);
      await fetchNotifStats();
      setLoading(false);
    })();
  }, [fetchNotifStats, userId]);

  const purgeReadNotifications = async () => {
    setNotifLoading(true);
    try {
      const { error } = await supabase.from("notifications").delete().eq("user_id", userId).eq("is_read", true);
      if (error) throw error;
      setMsg({ type: "success", text: `${notifStats.read} read notification(s) cleared.` });
      await fetchNotifStats();
    } catch (err) {
      setMsg({ type: "error", text: err.message });
    } finally {
      setNotifLoading(false);
    }
  };

  const openConfirm = (title, message, action, destructive = false) => setConfirm({ open: true, title, message, destructive, action });
  const closeConfirm = () => setConfirm((p) => ({ ...p, open: false }));
  const runConfirm = async () => { if (confirm.action) await confirm.action(); closeConfirm(); };

  const Card = ({ children, sx = {} }) => (
    <Box sx={{ backgroundColor: "background.paper", borderRadius: "10px", border: `1px solid ${border}`, p: { xs: 2, sm: 3 }, ...sx }}>{children}</Box>
  );

  if (loading) {
    return (<Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}><CircularProgress size={28} sx={{ color: GOLD }} /></Box>);
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, fontFamily: dm }}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "1rem", color: "text.primary", letterSpacing: "-0.02em" }}>Notifications</Typography>
        <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "text.secondary", mt: 0.3 }}>Manage and clean up your notifications.</Typography>
      </Box>

      {msg && (
        <Alert severity={msg.type} onClose={() => setMsg(null)} sx={{ mb: 2, borderRadius: "10px", fontFamily: dm, fontSize: "0.78rem", py: 0.75 }}>{msg.text}</Alert>
      )}

      <Card>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <Tooltip title={notifStats.read > 0 ? `Clear ${notifStats.read} read notification(s)` : "No read notifications to clear"} arrow>
              <span>
                <IconButton
                  size="small"
                  disabled={notifStats.read === 0 || notifLoading}
                  onClick={() => openConfirm("Clear Read Notifications", `Delete ${notifStats.read} read notification(s)? This cannot be undone.`, purgeReadNotifications, true)}
                  sx={{
                    borderRadius: "4px",
                    p: 0.6,
                    color: notifStats.read > 0 ? "#dc2626" : "text.disabled",
                    transition: "all 0.15s",
                    "&:hover": { backgroundColor: "rgba(220,38,38,0.08)" },
                    "&.Mui-disabled": { color: "text.disabled" },
                  }}
                >
                  {notifLoading ? <CircularProgress size={14} sx={{ color: "text.secondary" }} /> : <CleaningServicesOutlinedIcon sx={{ fontSize: 16 }} />}
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Box sx={{ flex: 1, p: 2, borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)" }}>
              <Typography sx={{ fontFamily: dm, fontSize: "0.66rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>Total Notifications</Typography>
              <Typography sx={{ fontFamily: dm, fontSize: "1.4rem", fontWeight: 700, color: "text.primary" }}>{notifStats.total.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ flex: 1, p: 2, borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)" }}>
              <Typography sx={{ fontFamily: dm, fontSize: "0.66rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>Read (Clearable)</Typography>
              <Typography sx={{ fontFamily: dm, fontSize: "1.4rem", fontWeight: 700, color: notifStats.read > 0 ? GOLD : "text.primary" }}>{notifStats.read.toLocaleString()}</Typography>
            </Box>
            <Box sx={{ flex: 1, p: 2, borderRadius: "10px", border: `1px solid ${border}`, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)" }}>
              <Typography sx={{ fontFamily: dm, fontSize: "0.66rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>Unread</Typography>
              <Typography sx={{ fontFamily: dm, fontSize: "1.4rem", fontWeight: 700, color: "text.primary" }}>{(notifStats.total - notifStats.read).toLocaleString()}</Typography>
            </Box>
          </Box>
        </Box>
      </Card>

      <ConfirmDialog open={confirm.open} onClose={closeConfirm} onConfirm={runConfirm} title={confirm.title} message={confirm.message} loading={notifLoading} destructive={confirm.destructive} />
    </Box>
  );
}
