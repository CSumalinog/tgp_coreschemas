// src/layouts/ClientLayout.jsx
import React, { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";

import RequestForm from "../../components/client/RequestForm"; // your dialog
import { Collapse, Drawer, useMediaQuery, IconButton } from "@mui/material";

// ✅ MUI Components
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Avatar,
  TextField,
  InputAdornment,
  Button,
} from "@mui/material";

// ✅ MUI Icons
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined"; // Draft
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined"; // History
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";

function ClientLayout() {
  const location = useLocation();
  const showLegend = location.pathname.includes("/calendar");

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
      fontSize: "1rem",
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

  const [openDialog, setOpenDialog] = useState(false);
  const handleOpen = () => setOpenDialog(true);
  const handleClose = () => setOpenDialog(false);
  const handleSubmitRequest = (data) => {
    console.log("Coverage request submitted:", data);
    handleClose();
  };

  // ---------- MOBILE SIDEBAR ----------
  const isMobile = useMediaQuery("(max-width:900px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const handleDrawerToggle = () => setMobileOpen((prev) => !prev);

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
        {/* Left: Logo + Create Request */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: { xs: 1, sm: 2, md: 7 }, // ← responsive gap
          }}
        >
          {isMobile && (
            <IconButton onClick={handleDrawerToggle}>
              <MenuIcon />
            </IconButton>
          )}

          <Typography
            sx={{
              fontSize: "2rem",
              fontWeight: "bold",
              display: { xs: "none", md: "block" },
              marginLeft:2,
            }}
          >
            core schemas
          </Typography>

          <Button
            variant="contained"
            color="white"
            size="small"
            startIcon={<AddIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 20,
              height: 34,
              minWidth: { xs: 120, sm: 160, md: 200 },
            }}
            onClick={handleOpen}
          >
            Create Request
          </Button>
        </Box>

        {/* Spacer pushes the right items to the far edge */}
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

          <Avatar sx={{ width: 30, height: 30, mr:2 }} />
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
            sx={{
              "& .MuiDrawer-paper": { width: 270, boxSizing: "border-box" },
            }}
          >
            {/* Collapse button at top */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between", // so logo left, chevron right
                alignItems: "center",
                p: 1,
                borderBottom: "1px solid #e0e0e0", // ← add bottom border
                height: 75,
              }}
            >
              <Typography sx={{ fontWeight: "bold", fontSize: "1.7rem", ml:1 }}>
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

      {/* ---------- COVERAGE REQUEST DIALOG ---------- */}
      <RequestForm
        open={openDialog}
        handleClose={handleClose}
        handleSubmit={handleSubmitRequest}
      />
    </div>
  );
}

// ---------------- Sidebar Content ----------------
function SidebarContent({ menuItemSx }) {
  const location = useLocation();
  const showLegend = location.pathname.includes("/calendar");
  const [showInstructions, setShowInstructions] = useState(false);
  const handleToggleInstructions = () => setShowInstructions((prev) => !prev);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Box sx={{ flex: 1, overflowY: "auto" }}>
        <List sx={{ display: "flex", flexDirection: "column" }}>
          <ListItemButton component={NavLink} to="calendar" sx={menuItemSx}>
            <ListItemIcon>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText primary="Calendar" />
          </ListItemButton>

          <ListItemButton component={NavLink} to="draft" sx={menuItemSx}>
            <ListItemIcon>
              <DescriptionOutlinedIcon sx={{ fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText primary="Draft" />
          </ListItemButton>

          <RequestTracker menuItemSx={menuItemSx} />

          <ListItemButton component={NavLink} to="history" sx={menuItemSx}>
            <ListItemIcon>
              <HistoryOutlinedIcon sx={{ fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText primary="History" />
          </ListItemButton>
        </List>
      </Box>

      {showLegend && (
        <Box sx={{ mt: "auto", mb: 1, padding: 1 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              mb: 1,
            }}
            onClick={handleToggleInstructions}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <InfoOutlinedIcon sx={{ fontSize: 20, color: "#212121" }} />
              <Typography
                sx={{ fontSize: ".9rem", fontWeight: 400, color: "#212121" }}
              >
                How to Request Coverage
              </Typography>
            </Box>
            <KeyboardArrowDownIcon
              sx={{
                transition: "0.3s",
                transform: showInstructions ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </Box>

          <Collapse in={showInstructions}>
            <Box
              sx={{
                mb: 2,
                p: 2,
                bgcolor: "white",
                borderRadius: 2,
                border: "1px solid #e0e0e0",
              }}
            >
              <Typography variant="body2">
                1. Click the "Create Request" button at the top to fill out a
                new request.
              </Typography>
              <Typography variant="body2">
                2. Or click any available date on the calendar to pre-fill the
                request date.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Note: Past dates and holidays are blocked.
              </Typography>
            </Box>
          </Collapse>

          <CollapsibleLegend
            title="My Calendars"
            items={[
              { color: "#ffeb3b", label: "Available" },
              { color: "#f44336", label: "Unavailable" },
            ]}
          />

          <CollapsibleLegend
            title="Other Calendars"
            items={[
              { color: "#66bb6a", label: "Holiday" },
              { color: "#f5f5f5", label: "Weekend" },
              { color: "#1976d2", label: "Today", isBorder: true },
            ]}
          />
        </Box>
      )}
    </Box>
  );
}

// ---------------- Collapsible Request Tracker ----------------
function RequestTracker({ menuItemSx }) {
  const [openTracker, setOpenTracker] = useState(false);

  return (
    <>
      <ListItemButton
        onClick={() => setOpenTracker(!openTracker)}
        sx={{ ...menuItemSx, justifyContent: "space-between" }}
      >
        <ListItemIcon>
          <TrackChangesOutlinedIcon sx={{ fontSize: 22 }} />
        </ListItemIcon>
        <ListItemText primary="Request Tracker" />
        <KeyboardArrowDownIcon
          sx={{
            transition: "0.3s",
            transform: openTracker ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </ListItemButton>

      <Collapse in={openTracker} timeout="auto" unmountOnExit>
        <List component="div" disablePadding sx={{ pl: 2 }}>
          <ListItemButton component={NavLink} to="request" sx={menuItemSx}>
            <ListItemIcon>
              <AccessTimeOutlinedIcon sx={{ fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText primary="Pending Request" />
          </ListItemButton>

          <ListItemButton
            component={NavLink}
            to="approved-requests"
            sx={menuItemSx}
          >
            <ListItemIcon>
              <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText primary="Approved Request" />
          </ListItemButton>

          <ListItemButton
            component={NavLink}
            to="declined-requests"
            sx={menuItemSx}
          >
            <ListItemIcon>
              <CancelOutlinedIcon sx={{ fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText primary="Declined Request" />
          </ListItemButton>
        </List>
      </Collapse>
    </>
  );
}

// ---------------- Collapsible Legend ----------------
function CollapsibleLegend({ title, items }) {
  const [open, setOpen] = useState(false);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          mb: 1,
        }}
        onClick={() => setOpen((prev) => !prev)}
      >
        <Typography sx={{ fontSize: ".9rem", color: "#757575" }}>
          {title}
        </Typography>
        <KeyboardArrowDownIcon
          sx={{
            transition: "0.3s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Box>

      <Collapse in={open}>
        <Box
          sx={{
            p: 2,
            bgcolor: "white",
            borderRadius: 2,
            border: "1px solid #e0e0e0",
            mb: 1,
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {items.map((item, idx) => (
              <Box
                key={idx}
                sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    backgroundColor: item.isBorder ? "transparent" : item.color,
                    border: item.isBorder ? `2px solid ${item.color}` : "none",
                  }}
                />
                <Typography sx={{ fontSize: ".9rem" }}>{item.label}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export default ClientLayout;
