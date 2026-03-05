// src/layouts/regular_staff/RegularStaffLayout.jsx
import React, { useState } from "react";
import { Outlet, NavLink } from "react-router-dom";
import {
  List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, IconButton, TextField, InputAdornment,
  Drawer, useMediaQuery, Badge,
} from "@mui/material";

import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";

import UserAvatar from "../../components/common/UserAvatar";

function RegularStaffLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const isMobile = useMediaQuery("(max-width:900px)");

  const unreadCount = 0;

  const menuItemSx = {
    borderRadius: "10px",
    px: 1.5,
    py: 1,
    transition: "0.2s ease",
    "&:hover": { backgroundColor: "#f5f5f5" },
    "&:hover .MuiListItemText-primary": { color: "#212121" },
    "&:hover .MuiListItemIcon-root": { color: "#212121" },
    "&.active": { backgroundColor: "#f5f5f5" },
    "& .MuiListItemText-primary": {
      color: "#9e9e9e",
      fontWeight: 400,
      fontSize: "0.9rem",
    },
    "&.active .MuiListItemText-primary": {
      color: "#212121",
      fontWeight: 400,
    },
    "& .MuiListItemIcon-root": {
      color: "#9e9e9e",
      minWidth: "35px",
    },
    "&.active .MuiListItemIcon-root": {
      color: "#212121",
    },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* HEADER */}
      <Box
        sx={{
          p: 1,
          backgroundColor: "white",
          display: "flex",
          alignItems: "center",
          borderBottom: "1px solid #e0e0e0",
          height: 70,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isMobile && (
            <IconButton onClick={handleDrawerToggle}>
              <MenuIcon />
            </IconButton>
          )}
          <Typography
            sx={{
              fontSize: "1.8rem",
              fontWeight: "800",
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
          <TextField
            size="small"
            placeholder="Search..."
            sx={{
              width: { xs: 120, sm: 160, md: 200 },
              "& .MuiOutlinedInput-root": {
                borderRadius: 20,
                height: 34,
                paddingTop: 0,
                paddingBottom: 0,
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchOutlinedIcon />
                </InputAdornment>
              ),
            }}
          />

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

          <UserAvatar profileRoute="/staff/profile" />
        </Box>
      </Box>

      {/* BODY */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {isMobile ? (
          <Drawer
            open={mobileOpen}
            onClose={handleDrawerToggle}
            variant="temporary"
            ModalProps={{ keepMounted: true }}
            sx={{ "& .MuiDrawer-paper": { width: 270, boxSizing: "border-box" } }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1,
                borderBottom: "1px solid #e0e0e0",
                height: 70,
              }}
            >
              <Typography
                sx={{
                  fontWeight: "800",
                  fontSize: "1.6rem",
                  marginLeft: 1,
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
          <nav
            style={{
              width: "270px",
              background: "white",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              borderRight: "1px solid #e0e0e0",
            }}
          >
            <SidebarContent menuItemSx={menuItemSx} />
          </nav>
        )}

        <Box sx={{ flex: 1, overflowY: "auto", backgroundColor: "#f9f9f9" }}>
          <Outlet />
        </Box>
      </div>
    </div>
  );
}

// ---------------- Sidebar Content ----------------
function SidebarContent({ menuItemSx }) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List>
          <ListItemButton component={NavLink} to="dashboard" sx={menuItemSx}>
            <ListItemIcon>
              <DashboardOutlinedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>

          <ListItemButton component={NavLink} to="my-assignment" sx={menuItemSx}>
            <ListItemIcon>
              <AssignmentIndOutlinedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText primary="My Assignment" />
          </ListItemButton>

          <ListItemButton component={NavLink} to="my-schedule" sx={menuItemSx}>
            <ListItemIcon>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText primary="My Schedule" />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );
}

export default RegularStaffLayout;