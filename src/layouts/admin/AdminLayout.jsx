// src/layouts/AdminLayout.jsx
import React, { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
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
  Drawer,
  useMediaQuery,
  Collapse,
} from "@mui/material";

// Icons
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

function AdminLayout() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const isMobile = useMediaQuery("(max-width:900px)");

 const menuItemSx = {
   borderRadius: "10px",
    px: 1.5,
    py: 1,
    transition: "0.2s ease",

    "&:hover": { backgroundColor: " #757575)" },

    "&:hover .MuiListItemText-primary": {
      color: "#212121",
    },
    "&:hover .MuiListItemIcon-root": {
      color: "#212121",
    },

    "&.active": { backgroundColor: " #757575)" },

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
      {/* ---------------- HEADER ---------------- */}
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
        {/* Left: Menu icon (mobile) + Logo */}
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
              background: "linear-gradient(90deg, #F5C52B, #212121, #757575)", // yellow → black → gray
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            core schemas
          </Typography>
        </Box>

        {/* Spacer */}
        <Box sx={{ flexGrow: 1 }} />

        {/* Right: Search + Notifications + Avatar */}
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
            <NotificationsNoneOutlinedIcon sx={{ fontSize: 20 }} />
          </IconButton>
          <Avatar sx={{ width: 30, height: 30, mr: 2 }} />
        </Box>
      </Box>

      {/* ---------------- BODY ---------------- */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        {isMobile ? (
          <Drawer
            open={mobileOpen}
            onClose={handleDrawerToggle}
            variant="temporary"
            ModalProps={{ keepMounted: true }}
            sx={{ "& .MuiDrawer-paper": { width: 270, boxSizing: "border-box" } }}
          >
            {/* Mobile drawer header */}
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
              <Typography sx={{ fontWeight: "800", fontSize: "1.6rem", marginLeft: 1, background: "linear-gradient(90deg, #F5C52B, #212121, #757575)", // yellow → black → gray
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent", }}>
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

        {/* Main content */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </Box>
      </div>
    </div>
  );
}

// ---------------- Sidebar Content ----------------
function SidebarContent({ menuItemSx }) {
  const [openRequests, setOpenRequests] = useState(false);

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

          {/* Collapsible Request Management */}
          <ListItemButton
            onClick={() => setOpenRequests((prev) => !prev)}
            sx={{ ...menuItemSx, justifyContent: "space-between" }}
          >
            <ListItemIcon>
              <DescriptionOutlinedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText primary="Request Management" />
            <KeyboardArrowDownIcon
              sx={{
                transition: "0.3s",
                transform: openRequests ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </ListItemButton>

          <Collapse in={openRequests} timeout="auto" unmountOnExit>
            <List component="div" disablePadding sx={{ pl: 3 }}>
              <ListItemButton
                component={NavLink}
                to="request-management"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <AccessTimeOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Pending Requests" />
              </ListItemButton>

               <ListItemButton
                component={NavLink}
                to="for-approval"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <CancelOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="For Approval" />
              </ListItemButton>

              <ListItemButton
                component={NavLink}
                to="approved-requests"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Approved Requests" />
              </ListItemButton>

              <ListItemButton
                component={NavLink}
                to="declined-requests"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <CancelOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="Declined Requests" />
              </ListItemButton>

              
            </List>
          </Collapse>

        
          <ListItemButton component={NavLink} to="calendar-management" sx={menuItemSx}>
            <ListItemIcon>
              <EventOutlinedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText primary="Calendar Management" />
          </ListItemButton>

          <ListItemButton component={NavLink} to="staffers-management" sx={menuItemSx}>
            <ListItemIcon>
              <GroupOutlinedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText primary="Staffers Management" />
          </ListItemButton>
        </List>
      </Box>
    </Box>
  );
}

export default AdminLayout;
