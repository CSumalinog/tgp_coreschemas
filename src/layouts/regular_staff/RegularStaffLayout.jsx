// src/layouts/regular_staff/RegularStaffLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, IconButton,
  Drawer, useMediaQuery, Badge, useTheme,
} from "@mui/material";

import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import MenuIcon                      from "@mui/icons-material/Menu";
import ChevronLeftIcon               from "@mui/icons-material/ChevronLeft";
import DashboardOutlinedIcon         from "@mui/icons-material/DashboardOutlined";
import AssignmentIndOutlinedIcon     from "@mui/icons-material/AssignmentIndOutlined";
import CalendarTodayOutlinedIcon     from "@mui/icons-material/CalendarTodayOutlined";

import UserAvatar   from "../../components/common/UserAvatar";
import GlobalSearch from "../../components/common/GlobalSearch";
import { supabase } from "../../lib/supabaseClient";

function RegularStaffLayout() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const isMobile    = useMediaQuery("(max-width:900px)");
  const unreadCount = 0;

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setCurrentUser(user);
    }
    loadUser();
  }, []);

  const menuItemSx = {
    borderRadius: "10px", px: 1.5, py: 1, transition: "0.2s ease",
    "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "&:hover .MuiListItemText-primary": { color: isDark ? "#f5f5f5" : "#212121" },
    "&:hover .MuiListItemIcon-root":    { color: isDark ? "#f5f5f5" : "#212121" },
    "&.active": { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiListItemText-primary": { color: isDark ? "#aaaaaa" : "#9e9e9e", fontWeight: 400, fontSize: "0.9rem" },
    "&.active .MuiListItemText-primary": { color: isDark ? "#f5f5f5" : "#212121", fontWeight: 400 },
    "& .MuiListItemIcon-root": { color: isDark ? "#aaaaaa" : "#9e9e9e", minWidth: "35px" },
    "&.active .MuiListItemIcon-root": { color: isDark ? "#f5f5f5" : "#212121" },
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "background.default" }}>

      {/* ── HEADER ── */}
      <Box sx={{
        p: 1, backgroundColor: "background.paper",
        display: "flex", alignItems: "center",
        borderBottom: "1px solid", borderColor: "divider", height: 70,
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isMobile && <IconButton onClick={handleDrawerToggle}><MenuIcon /></IconButton>}
          <Typography sx={{
            fontSize: "1.8rem", fontWeight: "800",
            display: { xs: "none", md: "block" }, marginLeft: 2,
            background: "linear-gradient(90deg, #F5C52B, #212121, #757575)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            core schemas
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GlobalSearch role="staff" userId={currentUser?.id} />
          <IconButton>
            <Badge badgeContent={unreadCount} color="error" invisible={unreadCount === 0}
              sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", height: 16, minWidth: 16 } }}>
              <NotificationsNoneOutlinedIcon sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>
          <UserAvatar profileRoute="/staff/profile" />
        </Box>
      </Box>

      {/* ── BODY ── */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {isMobile ? (
          <Drawer
            open={mobileOpen} onClose={handleDrawerToggle} variant="temporary"
            ModalProps={{ keepMounted: true }}
            sx={{ "& .MuiDrawer-paper": { width: 270, boxSizing: "border-box", backgroundColor: "background.paper", borderColor: "divider" } }}
          >
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, borderBottom: "1px solid", borderColor: "divider", height: 70 }}>
              <Typography sx={{
                fontWeight: "800", fontSize: "1.6rem", marginLeft: 1,
                background: "linear-gradient(90deg, #F5C52B, #212121, #757575)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                core schemas
              </Typography>
              <IconButton onClick={handleDrawerToggle}><ChevronLeftIcon /></IconButton>
            </Box>
            <SidebarContent menuItemSx={menuItemSx} />
          </Drawer>
        ) : (
          <Box sx={{
            width: "270px", backgroundColor: "background.paper", padding: "10px",
            display: "flex", flexDirection: "column",
            borderRight: "1px solid", borderColor: "divider",
          }}>
            <SidebarContent menuItemSx={menuItemSx} />
          </Box>
        )}

        <Box sx={{ flex: 1, overflowY: "auto", backgroundColor: "background.default" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

function SidebarContent({ menuItemSx }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List>
          <ListItemButton component={NavLink} to="dashboard" sx={menuItemSx}>
            <ListItemIcon><DashboardOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
          <ListItemButton component={NavLink} to="my-assignment" sx={menuItemSx}>
            <ListItemIcon><AssignmentIndOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="My Assignment" />
          </ListItemButton>
          <ListItemButton component={NavLink} to="my-schedule" sx={menuItemSx}>
            <ListItemIcon><CalendarTodayOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="My Schedule" />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );
}

export default RegularStaffLayout;