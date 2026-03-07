// src/layouts/AdminLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, IconButton,
  Drawer, useMediaQuery, Collapse, Badge, useTheme,
} from "@mui/material";

// Icons
import DashboardOutlinedIcon              from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon            from "@mui/icons-material/DescriptionOutlined";
import EventOutlinedIcon                  from "@mui/icons-material/EventOutlined";
import GroupOutlinedIcon                  from "@mui/icons-material/GroupOutlined";
import NotificationsNoneOutlinedIcon      from "@mui/icons-material/NotificationsNoneOutlined";
import MenuIcon                           from "@mui/icons-material/Menu";
import ChevronLeftIcon                    from "@mui/icons-material/ChevronLeft";
import KeyboardArrowDownIcon              from "@mui/icons-material/KeyboardArrowDown";
import AccessTimeOutlinedIcon             from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineOutlinedIcon     from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon                 from "@mui/icons-material/CancelOutlined";
import ForwardToInboxOutlinedIcon         from "@mui/icons-material/ForwardToInboxOutlined";
import CalendarMonthOutlinedIcon          from "@mui/icons-material/CalendarMonthOutlined";
import TableChartOutlinedIcon             from "@mui/icons-material/TableChartOutlined";
import SchoolOutlinedIcon                 from "@mui/icons-material/SchoolOutlined";

import UserAvatar   from "../../components/common/UserAvatar";
import GlobalSearch from "../../components/common/GlobalSearch";
import { supabase } from "../../lib/supabaseClient";

function AdminLayout() {
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
    borderRadius: "10px",
    px: 1.5, py: 1,
    transition: "0.2s ease",
    "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "&:hover .MuiListItemText-primary": { color: isDark ? "#f5f5f5" : "#212121" },
    "&:hover .MuiListItemIcon-root":    { color: isDark ? "#f5f5f5" : "#212121" },
    "&.active": { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiListItemText-primary": {
      color: isDark ? "#aaaaaa" : "#9e9e9e", fontWeight: 400, fontSize: "0.9rem",
    },
    "&.active .MuiListItemText-primary": {
      color: isDark ? "#f5f5f5" : "#212121", fontWeight: 400,
    },
    "& .MuiListItemIcon-root": {
      color: isDark ? "#aaaaaa" : "#9e9e9e", minWidth: "35px",
    },
    "&.active .MuiListItemIcon-root": {
      color: isDark ? "#f5f5f5" : "#212121",
    },
  };

  const headerSx = {
    p: 1,
    backgroundColor: "background.paper",
    display: "flex",
    alignItems: "center",
    borderBottom: "1px solid",
    borderColor: "divider",
    height: 70,
  };

  const sidebarSx = {
    width: "270px",
    backgroundColor: "background.paper",
    padding: "10px",
    display: "flex",
    flexDirection: "column",
    borderRight: "1px solid",
    borderColor: isDark ? "#2e2e2e" : "#e0e0e0",
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "background.default" }}>

      {/* ── HEADER ── */}
      <Box sx={headerSx}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isMobile && (
            <IconButton onClick={handleDrawerToggle}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            sx={{
              fontSize: "1.8rem", fontWeight: "800",
              display: { xs: "none", md: "block" },
              marginLeft: 2,
              background: "linear-gradient(90deg, #F5C52B, #212121, #757575)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            core schemas
          </Typography>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GlobalSearch role="admin" userId={currentUser?.id} />

          <IconButton>
            <Badge
              badgeContent={unreadCount}
              color="error"
              invisible={unreadCount === 0}
              sx={{ "& .MuiBadge-badge": { fontSize: "0.65rem", height: 16, minWidth: 16 } }}
            >
              <NotificationsNoneOutlinedIcon sx={{ fontSize: 20 }} />
            </Badge>
          </IconButton>

          <UserAvatar profileRoute="/admin/profile" />
        </Box>
      </Box>

      {/* ── BODY ── */}
      <Box sx={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {isMobile ? (
          <Drawer
            open={mobileOpen}
            onClose={handleDrawerToggle}
            variant="temporary"
            ModalProps={{ keepMounted: true }}
            sx={{
              "& .MuiDrawer-paper": {
                width: 270,
                boxSizing: "border-box",
                backgroundColor: "background.paper",
                borderColor: "divider",
              },
            }}
          >
            <Box sx={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              p: 1, borderBottom: "1px solid", borderColor: "divider", height: 70,
            }}>
              <Typography
                sx={{
                  fontWeight: "800", fontSize: "1.6rem", marginLeft: 1,
                  background: "linear-gradient(90deg, #F5C52B, #212121, #757575)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                core schemas
              </Typography>
              <IconButton onClick={handleDrawerToggle}>
                <ChevronLeftIcon />
              </IconButton>
            </Box>
            <SidebarContent menuItemSx={menuItemSx} />
          </Drawer>
        ) : (
          <Box sx={sidebarSx}>
            <SidebarContent menuItemSx={menuItemSx} />
          </Box>
        )}

        {/* ── Page content ── */}
        <Box sx={{ flex: 1, overflowY: "auto", backgroundColor: "background.default" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}

// ── Sidebar Content ────────────────────────────────────────────────────────────
function SidebarContent({ menuItemSx }) {
  const [openRequests,   setOpenRequests]   = useState(false);
  const [openScheduling, setOpenScheduling] = useState(false);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List>
          <ListItemButton component={NavLink} to="dashboard" sx={menuItemSx}>
            <ListItemIcon><DashboardOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>

          {/* Collapsible Request Management */}
          <ListItemButton
            onClick={() => setOpenRequests((prev) => !prev)}
            sx={{ ...menuItemSx, justifyContent: "space-between" }}
          >
            <ListItemIcon><DescriptionOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="Request Management" />
            <KeyboardArrowDownIcon
              sx={{ transition: "0.3s", transform: openRequests ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </ListItemButton>

          <Collapse in={openRequests} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 3 }}>
              <ListItemButton component={NavLink} to="request-management" sx={menuItemSx}>
                <ListItemIcon><AccessTimeOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
                <ListItemText primary="Pending Requests" />
              </ListItemButton>
              <ListItemButton component={NavLink} to="forwarded-requests" sx={menuItemSx}>
                <ListItemIcon><ForwardToInboxOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
                <ListItemText primary="Forwarded Requests" />
              </ListItemButton>
              <ListItemButton component={NavLink} to="for-approval" sx={menuItemSx}>
                <ListItemIcon><DescriptionOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
                <ListItemText primary="For Approval" />
              </ListItemButton>
              <ListItemButton component={NavLink} to="approved-requests" sx={menuItemSx}>
                <ListItemIcon><CheckCircleOutlineOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
                <ListItemText primary="Approved Requests" />
              </ListItemButton>
              <ListItemButton component={NavLink} to="declined-requests" sx={menuItemSx}>
                <ListItemIcon><CancelOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
                <ListItemText primary="Declined Requests" />
              </ListItemButton>
            </List>
          </Collapse>

          {/* Collapsible Scheduling */}
          <ListItemButton
            onClick={() => setOpenScheduling((prev) => !prev)}
            sx={{ ...menuItemSx, justifyContent: "space-between" }}
          >
            <ListItemIcon><SchoolOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="Scheduling" />
            <KeyboardArrowDownIcon
              sx={{ transition: "0.3s", transform: openScheduling ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </ListItemButton>

          <Collapse in={openScheduling} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 3 }}>
              <ListItemButton component={NavLink} to="semester-management" sx={menuItemSx}>
                <ListItemIcon><CalendarMonthOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
                <ListItemText primary="Semester Management" />
              </ListItemButton>
              <ListItemButton component={NavLink} to="duty-schedule-view" sx={menuItemSx}>
                <ListItemIcon><TableChartOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
                <ListItemText primary="Duty Schedule View" />
              </ListItemButton>
            </List>
          </Collapse>

          <ListItemButton component={NavLink} to="calendar-management" sx={menuItemSx}>
            <ListItemIcon><EventOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="Calendar Management" />
          </ListItemButton>

          <ListItemButton component={NavLink} to="staffers-management" sx={menuItemSx}>
            <ListItemIcon><GroupOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="Staffers Management" />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );
}

export default AdminLayout;