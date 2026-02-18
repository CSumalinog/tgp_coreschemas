// src/layouts/AdminLayout.jsx
import React from "react";
import { Outlet, NavLink } from "react-router-dom";

// ✅ MUI Components
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  IconButton,
  Avatar,
  TextField,
  InputAdornment,
} from "@mui/material";

// ✅ MUI Icons
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";

function AdminLayout() {
  const menuItemSx = {
    borderRadius: "10px",
    px: 1.5,
    py: 1,
    transition: "0.2s ease",
    "&:hover": { backgroundColor: "#f5f5f5" },
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
      {/* ✅ GLOBAL HEADER */}
      <Box
        sx={{
          p: 1,
          backgroundColor: "white",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid #e0e0e0",
          flexShrink: 0,
          height: 70,
        }}
      >
        {/* Left: Title */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            sx={{
              display: "flex",
              alignItems: "center",
              fontSize: "2rem",
              fontWeight: "bold",
              color: "#212121",
              marginRight: 6,
              marginLeft: 2,
            }}
          >
            core schemas
          </Typography>
        </Box>

        {/* Right: Header actions */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <TextField
            size="small"
            placeholder="Search..."
            sx={{
              width: 200,
              "& .MuiOutlinedInput-root": { borderRadius: 20, height: 32 },
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
            <NotificationsNoneOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>

          <Avatar
            alt="Admin"
            src="/path/to/avatar.jpg"
            sx={{ width: 30, height: 30 }}
          />
        </Box>
      </Box>

      {/* ✅ BODY (sidebar + content) */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
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
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            <List sx={{ display: "flex", flexDirection: "column" }}>
              <ListItemButton component={NavLink} to="dashboard" sx={menuItemSx}>
                <ListItemIcon>
                  <DashboardOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Dashboard" />
              </ListItemButton>

              <ListItemButton
                component={NavLink}
                to="request-management"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Request Management" />
              </ListItemButton>

              <ListItemButton
                component={NavLink}
                to="assignment-management"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <AssignmentTurnedInOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Assignment Management" />
              </ListItemButton>

              <ListItemButton
                component={NavLink}
                to="calendar-management"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <EventOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Calendar Management" />
              </ListItemButton>

              <ListItemButton
                component={NavLink}
                to="staffers-management"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <GroupOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Staffers Management" />
              </ListItemButton>
            </List>
          </Box>
        </nav>

        {/* Main content */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </Box>
      </div>
    </div>
  );
}

export default AdminLayout;
