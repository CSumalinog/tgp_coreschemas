// src/components/common/UserAvatar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar, Box, Typography, Menu, Divider,
  MenuItem, Switch, CircularProgress,
} from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutIcon                 from "@mui/icons-material/Logout";
import DarkModeOutlinedIcon       from "@mui/icons-material/DarkModeOutlined";
import { supabase }               from "../../lib/supabaseClient";
import { useThemeMode }           from "../../context/ThemeContext";

export default function UserAvatar({ profileRoute = "profile" }) {
  const navigate              = useNavigate();
  const { isDark, toggleDark } = useThemeMode();

  const [user,      setUser]      = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [anchorEl,  setAnchorEl]  = useState(null);
  const menuOpen = Boolean(anchorEl);

  // ── Load user profile + avatar ──
  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, section, division, avatar_url")
        .eq("id", authUser.id)
        .single();

      setUser({
        email:      authUser.email,
        full_name:  profile?.full_name  || "",
        role:       profile?.role       || "",
        section:    profile?.section    || "",
        division:   profile?.division   || "",
        avatar_url: profile?.avatar_url || null,
      });

      // Resolve public URL if avatar exists
      if (profile?.avatar_url) {
        const { data } = supabase.storage
          .from("coverage-files")
          .getPublicUrl(profile.avatar_url);
        setAvatarUrl(data?.publicUrl || null);
      }

      setLoading(false);
    }

    loadUser();

    // Re-fetch on auth state change (e.g. after profile update)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });
    return () => subscription.unsubscribe();
  }, []);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getPositionLabel = (u) => {
    if (!u) return "";
    if (u.section) return u.section;
    const labels = { client: "Client", admin: "Administrator", sec_head: "Section Head", staff: "Staff" };
    return labels[u.role] || u.role;
  };

  const handleAvatarClick = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose   = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleProfile = () => {
    handleMenuClose();
    navigate(profileRoute);
  };

  const positionLabel = getPositionLabel(user);

  return (
    <>
      {/* ── Trigger Avatar ── */}
      <Avatar
        src={avatarUrl || undefined}
        onClick={handleAvatarClick}
        sx={{
          width: 34, height: 34, mr: 2, cursor: "pointer",
          backgroundColor: "#f5c52b", color: "#212121",
          fontSize: "0.8rem", fontWeight: 500,
          "&:hover": { opacity: 0.85 },
          transition: "opacity 0.2s",
        }}
      >
        {!avatarUrl && getInitials(user?.full_name)}
      </Avatar>

      {/* ── Dropdown Menu ── */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            borderRadius: 3, minWidth: 300,
            boxShadow: "0 8px 32px rgba(0,0,0,0.12)", mt: 1,
            overflow: "hidden",
          },
        }}
      >

        {/* ── Google-style header: big avatar + name + email + role ── */}
        <Box sx={{
          px: 3, pt: 3, pb: 2.5,
          display: "flex", flexDirection: "column", alignItems: "center", gap: 1,
          background: (theme) => theme.palette.mode === "dark"
            ? "linear-gradient(160deg, #2a2a2a 0%, #1e1e1e 100%)"
            : "linear-gradient(160deg, #fffde7 0%, #ffffff 100%)",
        }}>
          {loading ? (
            <CircularProgress size={56} sx={{ color: "#f5c52b" }} />
          ) : (
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 72, height: 72,
                backgroundColor: "#f5c52b", color: "#212121",
                fontSize: "1.5rem", fontWeight: 700,
                border: "3px solid", borderColor: "#f5c52b",
              }}
            >
              {!avatarUrl && getInitials(user?.full_name)}
            </Avatar>
          )}
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.3 }}>
              {user?.full_name || "User"}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.3 }}>
              {user?.email || ""}
            </Typography>
            {positionLabel && (
              <Typography sx={{
                fontSize: "0.68rem", fontWeight: 700, mt: 0.6,
                color: "#f5c52b", textTransform: "uppercase", letterSpacing: 0.8,
              }}>
                {positionLabel}
              </Typography>
            )}
          </Box>
        </Box>

        <Divider />

        {/* ── Profile & Settings ── */}
        <MenuItem
          onClick={handleProfile}
          sx={{ gap: 1.5, py: 1.3, px: 2.5, fontSize: "0.88rem" }}
        >
          <AccountCircleOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography sx={{ fontSize: "0.88rem", flex: 1 }}>Profile & Settings</Typography>
        </MenuItem>

        {/* ── Dark Mode toggle ── */}
        <MenuItem
          onClick={toggleDark}
          sx={{ gap: 1.5, py: 1.3, px: 2.5, fontSize: "0.88rem" }}
        >
          <DarkModeOutlinedIcon fontSize="small" sx={{ color: "text.secondary" }} />
          <Typography sx={{ fontSize: "0.88rem", flex: 1 }}>Dark Mode</Typography>
          <Switch
            checked={isDark}
            onChange={toggleDark}
            onClick={(e) => e.stopPropagation()}
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked":            { color: "#f5c52b" },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#f5c52b" },
            }}
          />
        </MenuItem>

        <Divider />

        {/* ── Logout ── */}
        <MenuItem
          onClick={handleLogout}
          sx={{ gap: 1.5, py: 1.3, px: 2.5, fontSize: "0.88rem", color: "#c62828" }}
        >
          <LogoutIcon fontSize="small" sx={{ color: "#c62828" }} />
          <Typography sx={{ fontSize: "0.88rem", color: "#c62828" }}>Logout</Typography>
        </MenuItem>

      </Menu>
    </>
  );
}