// src/layouts/client/ClientLayout.jsx
import React, { useState, useEffect } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Collapse, Drawer, useMediaQuery, IconButton, useTheme,
  List, ListItemButton, ListItemIcon, ListItemText,
  Box, Typography, Button,
} from "@mui/material";

import CalendarTodayOutlinedIcon     from "@mui/icons-material/CalendarTodayOutlined";
import KeyboardArrowDownIcon         from "@mui/icons-material/KeyboardArrowDown";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import AddIcon                       from "@mui/icons-material/Add";
import InfoOutlinedIcon              from "@mui/icons-material/InfoOutlined";
import DescriptionOutlinedIcon       from "@mui/icons-material/DescriptionOutlined";
import TrackChangesOutlinedIcon      from "@mui/icons-material/TrackChangesOutlined";
import MenuIcon                      from "@mui/icons-material/Menu";
import ChevronLeftIcon               from "@mui/icons-material/ChevronLeft";

import CoverageRequestDialog from "../../components/client/RequestForm";
import UserAvatar            from "../../components/common/UserAvatar";
import GlobalSearch          from "../../components/common/GlobalSearch";
import { supabase }          from "../../lib/supabaseClient";

function ClientLayout() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [openDialog,  setOpenDialog]  = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const isMobile = useMediaQuery("(max-width:900px)");

  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);
  const handleOpen    = () => setOpenDialog(true);
  const handleClose   = () => setOpenDialog(false);
  const handleSuccess = () => handleClose();

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
        <Box sx={{ display: "flex", alignItems: "center", gap: { xs: 1, sm: 2, md: 7 } }}>
          {isMobile && <IconButton onClick={handleDrawerToggle}><MenuIcon /></IconButton>}
          <Typography sx={{
            fontSize: "1.8rem", fontWeight: "800",
            display: { xs: "none", md: "block" }, marginLeft: 2,
            background: "linear-gradient(90deg, #F5C52B, #212121, #757575)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            core schemas
          </Typography>
          <Button
            variant="contained" size="small" startIcon={<AddIcon />}
            onClick={handleOpen}
            sx={{
              textTransform: "none", borderRadius: 20, height: 34,
              minWidth: { xs: 120, sm: 160, md: 200 },
              backgroundColor: "#f5c52b", color: "#212121", boxShadow: "none",
              "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
            }}
          >
            Create Request
          </Button>
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GlobalSearch role="client" userId={currentUser?.id} />
          <IconButton><NotificationsNoneOutlinedIcon sx={{ fontSize: 20 }} /></IconButton>
          <UserAvatar profileRoute="profile" />
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", p: 1, borderBottom: "1px solid", borderColor: "divider", height: 75 }}>
              <Typography sx={{
                fontWeight: "800", fontSize: "1.6rem", ml: 1,
                background: "linear-gradient(90deg, #F5C52B, #212121, #757575)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              }}>
                core schemas
              </Typography>
              <IconButton onClick={handleDrawerToggle}><ChevronLeftIcon /></IconButton>
            </Box>
            <SidebarContent menuItemSx={menuItemSx} isDark={isDark} />
          </Drawer>
        ) : (
          <Box sx={{
            width: "270px", backgroundColor: "background.paper", padding: "10px",
            display: "flex", flexDirection: "column",
            borderRight: "1px solid", borderColor: "divider",
          }}>
            <SidebarContent menuItemSx={menuItemSx} isDark={isDark} />
          </Box>
        )}

        <Box sx={{ flex: 1, overflowY: "auto", backgroundColor: "background.default" }}>
          <Outlet />
        </Box>
      </Box>

      <CoverageRequestDialog open={openDialog} handleClose={handleClose} onSuccess={handleSuccess} />
    </Box>
  );
}

// ── Sidebar Content ────────────────────────────────────────────────────────────
function SidebarContent({ menuItemSx, isDark }) {
  const location = useLocation();
  const showLegend = location.pathname.includes("/calendar");
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List sx={{ display: "flex", flexDirection: "column" }}>

          <ListItemButton component={NavLink} to="calendar" sx={menuItemSx}>
            <ListItemIcon><CalendarTodayOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="Calendar" />
          </ListItemButton>

          <ListItemButton component={NavLink} to="draft" sx={menuItemSx}>
            <ListItemIcon><DescriptionOutlinedIcon sx={{ fontSize: 22 }} /></ListItemIcon>
            <ListItemText primary="Draft" />
          </ListItemButton>

          {/* ── Single Request Tracker link ── */}
          <ListItemButton component={NavLink} to="request-tracker" sx={menuItemSx}>
            <ListItemIcon><TrackChangesOutlinedIcon sx={{ fontSize: 20 }} /></ListItemIcon>
            <ListItemText primary="Request Tracker" />
          </ListItemButton>

        </List>
      </Box>

      {/* ── Calendar legend (only shown on /calendar) ── */}
      {showLegend && (
        <Box sx={{ mt: "auto", mb: 1, padding: 1 }}>
          <Box
            sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", mb: 1 }}
            onClick={() => setShowInstructions((prev) => !prev)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <InfoOutlinedIcon sx={{ fontSize: 20, color: "#f5c52b" }} />
              <Typography sx={{ fontSize: ".9rem", fontWeight: 400, color: "text.primary" }}>
                How to Request Coverage
              </Typography>
            </Box>
            <KeyboardArrowDownIcon sx={{ transition: "0.3s", transform: showInstructions ? "rotate(180deg)" : "rotate(0deg)" }} />
          </Box>

          <Collapse in={showInstructions}>
            <Box sx={{ mb: 2, p: 2, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider" }}>
              <Typography variant="body2">1. Click the "Create Request" button at the top to fill out a new request.</Typography>
              <Typography variant="body2">2. Or click any available date on the calendar to pre-fill the request date.</Typography>
              <Typography variant="body2" color="text.secondary">Note: Past dates and blocked dates are unavailable.</Typography>
            </Box>
          </Collapse>

          <CollapsibleLegend title="My Calendars" isDark={isDark} items={[
            { color: "#15803d", label: "Available" },
            { color: "#f5c52b", label: "Fully Booked" },
            { color: "#d32f2f", label: "Office Unavailable", },
          ]} />
          <CollapsibleLegend title="Other Calendars" isDark={isDark} items={[
            { color: "#4caf50", label: "Holidays in the Philippines" },
            { color: "#f5f5f5", label: "Weekend", isBorder: true },
            { color: "#1976d2", label: "Today" },
          ]} />
        </Box>
      )}
    </Box>
  );
}

function CollapsibleLegend({ title, items, isDark }) {
  const [open, setOpen] = useState(false);
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", mb: 1 }}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Typography sx={{ fontSize: ".9rem", color: "text.secondary" }}>{title}</Typography>
        <KeyboardArrowDownIcon sx={{ transition: "0.3s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </Box>
      <Collapse in={open}>
        <Box sx={{ p: 2, bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider", mb: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {items.map((item, idx) => (
              <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{
                  width: 14, height: 14, borderRadius: "50%",
                  backgroundColor: item.isBorder ? "transparent" : item.color,
                  border: item.isBorder ? `2px solid ${item.color}` : "none",
                }} />
                <Typography sx={{ fontSize: ".9rem", color: "text.primary" }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export default ClientLayout;