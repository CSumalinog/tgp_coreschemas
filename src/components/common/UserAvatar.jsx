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

/**
 * Reusable UserAvatar component
 * Works across all layouts: Client, Admin, Sec Head, Staff
 *
 * Props:
 * - profileRoute (string): where "Profile" navigates to. 
 *     e.g. "profile" for client, "/admin/profile" for admin
 *     Defaults to "profile"
 */
export default function UserAvatar({ profileRoute = "profile" }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const menuOpen = Boolean(anchorEl);

  // Fetch logged-in user profile on mount
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", authUser.id)
        .single();

      setUser({
        email: authUser.email,
        full_name: profile?.full_name || "",
        role: profile?.role || "",
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

  // Role display label
  const getRoleLabel = (role) => {
    const labels = {
      client: "Client",
      admin: "Administrator",
      sec_head: "Section Head",
      staff: "Staff",
    };
    return labels[role] || role;
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
          {user?.role && (
            <Typography
              sx={{
                fontSize: "0.7rem",
                color: "#f5c52b",
                fontWeight: 600,
                mt: 0.3,
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            >
              {getRoleLabel(user.role)}
            </Typography>
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