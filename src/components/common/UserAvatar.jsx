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

const dm = "'Inter', sans-serif";

export function getAvatarUrl(avatarPath) {
  if (!avatarPath) return undefined;
  const { data } = supabase.storage
    .from("coverage-files")
    .getPublicUrl(avatarPath);
  return data?.publicUrl || undefined;
}

export default function UserAvatar({ profileRoute = "profile" }) {
  const navigate               = useNavigate();
  const { isDark, toggleDark } = useThemeMode();

  const [user,      setUser]      = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [anchorEl,  setAnchorEl]  = useState(null);
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    async function loadUser() {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, section, division, position, avatar_url")
        .eq("id", authUser.id)
        .single();

      setUser({
        email:      authUser.email,
        full_name:  profile?.full_name  || "",
        role:       profile?.role       || "",
        section:    profile?.section    || "",
        division:   profile?.division   || "",
        position:   profile?.position   || "",
        avatar_url: profile?.avatar_url || null,
      });

      setAvatarUrl(getAvatarUrl(profile?.avatar_url) || null);
      setLoading(false);
    }

    loadUser();

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
    if (u.role === "client") return "Client";
    const parts = [];
    if (u.section)  parts.push(u.section);
    if (u.position) parts.push(u.position);
    if (parts.length) return parts.join(" · ");
    const labels = { admin: "Administrator", sec_head: "Section Head", staff: "Staff" };
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
      {/* ── Avatar trigger ── */}
      <Avatar
        src={avatarUrl || undefined}
        onClick={handleAvatarClick}
        sx={{
          width: 42, height: 42, mr: 2,
          cursor: "pointer",
          backgroundColor: "#f5c52b", color: "#212121",
          fontSize: "0.8rem", fontWeight: 700, fontFamily: dm,
          transition: "opacity 0.2s",
          "&:hover": { opacity: 0.85 },
        }}
      >
        {!avatarUrl && getInitials(user?.full_name)}
      </Avatar>

      {/* ── Dropdown ── */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        // opens upward, aligned to the left of the avatar
        anchorOrigin={{ horizontal: "left", vertical: "top" }}
        transformOrigin={{ horizontal: "left", vertical: "bottom" }}
        PaperProps={{
          sx: {
            fontFamily: dm,
            width: 240,                                          // matches sidebar width
            borderRadius: "10px",
            backgroundColor: "#1A2820",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 -16px 48px rgba(0,0,0,0.55)",
            mb: 1,                                              // gap above the avatar
            overflow: "hidden",
            "& .MuiList-root": { py: 0 },
          },
        }}
      >

        {/* ── User header ── */}
        <Box sx={{
          px: 2, py: 1.5,
          display: "flex", alignItems: "center", gap: 1.25,
          borderBottom: "1px solid rgba(255,255,255,0.07)",
        }}>
          {loading ? (
            <CircularProgress size={34} sx={{ color: "#f5c52b", flexShrink: 0 }} />
          ) : (
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 36, height: 36, flexShrink: 0,
                backgroundColor: "#f5c52b", color: "#111",
                fontSize: "0.8rem", fontWeight: 700, fontFamily: dm,
              }}
            >
              {!avatarUrl && getInitials(user?.full_name)}
            </Avatar>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{
              fontFamily: dm, fontWeight: 600, fontSize: "0.82rem",
              color: "#F0F4F2", lineHeight: 1.3,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {user?.full_name || "Staff"}
            </Typography>
            <Typography sx={{
              fontFamily: dm, fontSize: "0.68rem", color: "#8A9E94",
              lineHeight: 1.3, mt: 0.15,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {user?.email || ""}
            </Typography>
            {positionLabel && (
              <Typography sx={{
                fontFamily: dm, fontSize: "0.6rem", fontWeight: 700,
                color: "#f5c52b", textTransform: "uppercase",
                letterSpacing: "0.07em", mt: 0.35, lineHeight: 1,
              }}>
                {positionLabel}
              </Typography>
            )}
          </Box>
        </Box>

        {/* ── Menu items ── */}
        <Box sx={{ py: 0.5 }}>
          <MenuItem
            onClick={handleProfile}
            sx={{
              gap: 1.5, px: 2, py: 0.9,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
            }}
          >
            <AccountCircleOutlinedIcon sx={{ fontSize: 16, color: "#8A9E94", flexShrink: 0 }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "#F0F4F2", lineHeight: 1 }}>
              Profile &amp; Settings
            </Typography>
          </MenuItem>

          <MenuItem
            onClick={toggleDark}
            sx={{
              gap: 1.5, px: 2, py: 0.9,
              "&:hover": { backgroundColor: "rgba(255,255,255,0.06)" },
            }}
          >
            <DarkModeOutlinedIcon sx={{ fontSize: 16, color: "#8A9E94", flexShrink: 0 }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "#F0F4F2", flex: 1, lineHeight: 1 }}>
              Dark Mode
            </Typography>
            <Switch
              checked={isDark}
              onChange={toggleDark}
              onClick={(e) => e.stopPropagation()}
              size="small"
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked":                    { color: "#f5c52b" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#f5c52b" },
                "& .MuiSwitch-track":                                     { backgroundColor: "#4B5A52" },
              }}
            />
          </MenuItem>
        </Box>

        <Box sx={{ height: "1px", backgroundColor: "rgba(255,255,255,0.07)", mx: 2 }} />

        <Box sx={{ py: 0.5 }}>
          <MenuItem
            onClick={handleLogout}
            sx={{
              gap: 1.5, px: 2, py: 0.9,
              "&:hover": { backgroundColor: "rgba(248,113,113,0.08)" },
            }}
          >
            <LogoutIcon sx={{ fontSize: 16, color: "#F87171", flexShrink: 0 }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "#F87171", lineHeight: 1 }}>
              Log out
            </Typography>
          </MenuItem>
        </Box>

      </Menu>
    </>
  );
}