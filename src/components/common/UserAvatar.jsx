// src/components/common/UserAvatar.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Avatar,
  Box,
  Typography,
  Menu,
  MenuItem,
  Divider,
} from "@mui/material";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { supabase } from "../../lib/supabaseClient";

export default function UserAvatar({ profileRoute = "profile" }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, section, division")
        .eq("id", authUser.id)
        .single();

      setUser({
        email: authUser.email,
        full_name: profile?.full_name || "",
        role: profile?.role || "",
        section: profile?.section || "",
        division: profile?.division || "",
      });
    }

    loadUser();
  }, []);

  // Get initials from full name (max 2 letters)
  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Label priority:
   * 1. section (Creative Director, News, Photojournalism, etc.)
   * 2. role fallback (Staff, Client, etc.)
   */
  const getPositionLabel = (user) => {
    if (!user) return "";

    // If they have a specific section, show that
    if (user.section) return user.section;

    // Fallback to role label
    const labels = {
      client: "Client",
      admin: "Administrator",
      sec_head: "Section Head",
      staff: "Staff",
    };
    return labels[user.role] || user.role;
  };

  const handleAvatarClick = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

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
      {/* Avatar Button */}
      <Avatar
        onClick={handleAvatarClick}
        sx={{
          width: 34,
          height: 34,
          mr: 2,
          cursor: "pointer",
          backgroundColor: "#f5c52b",
          color: "#212121",
          fontSize: "0.8rem",
          fontWeight: 500,
          "&:hover": { opacity: 0.85 },
          transition: "opacity 0.2s",
        }}
      >
        {getInitials(user?.full_name)}
      </Avatar>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            minWidth: 250,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            mt: 1,
          },
        }}
      >
        {/* User info header */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <Typography sx={{ fontWeight: 600, fontSize: "0.9rem" }}>
            {user?.full_name || "User"}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "#9e9e9e" }}>
            {user?.email || ""}
          </Typography>

          {/* Position label — section takes priority over role */}
          {positionLabel && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5 }}>
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: "#f5c52b",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                }}
              >
                {positionLabel}
              </Typography>
              
            </Box>
          )}
        </Box>

        <Divider />

        <MenuItem
          onClick={handleProfile}
          sx={{ gap: 1.5, py: 1.2, fontSize: "0.9rem" }}
        >
          <AccountCircleOutlinedIcon fontSize="small" sx={{ color: "#212121" }} />
          Profile
        </MenuItem>

        <Divider />

        <MenuItem
          onClick={handleLogout}
          sx={{ gap: 1.5, py: 1.2, fontSize: "0.9rem", color: "#212121" }}
        >
          <LogoutIcon fontSize="small" />
          Logout
        </MenuItem>
      </Menu>
    </>
  );
}