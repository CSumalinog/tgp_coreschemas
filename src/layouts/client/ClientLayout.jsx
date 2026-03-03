// src/layouts/ClientLayout.jsx
import React, { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Collapse, Drawer, useMediaQuery, IconButton } from "@mui/material";

// ✅ MUI Components
import {
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Button,
} from "@mui/material";

// ✅ MUI Icons
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/Add";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";


// ✅ FIXED: correct import name and path
import CoverageRequestDialog from "../../components/client/RequestForm";
import UserAvatar from "../../components/common/UserAvatar";

function ClientLayout() {
  const location = useLocation();
  const navigate = useNavigate();

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

  const [openDialog, setOpenDialog] = useState(false);
  const handleOpen = () => setOpenDialog(true);
  const handleClose = () => setOpenDialog(false);

  // ✅ FIXED: onSuccess just closes the dialog
  // The calendar refetches itself via its own onSuccess handler
  const handleSuccess = () => {
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
            gap: { xs: 1, sm: 2, md: 7 },
          }}
        >
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
              background:
                "linear-gradient(90deg, #F5C52B, #212121, #757575)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
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

          <UserAvatar profileRoute="profile" />
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
              "& .MuiDrawer-paper": {
                width: 270,
                boxSizing: "border-box",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                p: 1,
                borderBottom: "1px solid #e0e0e0",
                height: 75,
              }}
            >
              <Typography
                sx={{
                  fontWeight: "800",
                  fontSize: "1.6rem",
                  ml: 1,
                  background:
                    "linear-gradient(90deg, #F5C52B, #212121, #757575)",
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

        {/* Main content */}
        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </Box>
      </div>

      {/* ✅ FIXED: correct component name + onSuccess prop */}
      <CoverageRequestDialog
        open={openDialog}
        handleClose={handleClose}
        onSuccess={handleSuccess}
      />
    </div>
  );
}

// ---------------- Sidebar Content ----------------
function SidebarContent({ menuItemSx }) {
  const location = useLocation();
  const showLegend = location.pathname.includes("/calendar");
  const [showInstructions, setShowInstructions] = useState(false);

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
          {/* How to Request Coverage */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              cursor: "pointer",
              mb: 1,
            }}
            onClick={() => setShowInstructions((prev) => !prev)}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <InfoOutlinedIcon sx={{ fontSize: 20, color: "#f5c52b" }} />
              <Typography
                sx={{ fontSize: ".9rem", fontWeight: 400, color: "#212121" }}
              >
                How to Request Coverage
              </Typography>
            </Box>
            <KeyboardArrowDownIcon
              sx={{
                transition: "0.3s",
                transform: showInstructions
                  ? "rotate(180deg)"
                  : "rotate(0deg)",
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
                Note: Past dates and blocked dates are unavailable.
              </Typography>
            </Box>
          </Collapse>

          {/* ✅ UPDATED: My Calendars legend now includes Blocked by Admin */}
          <CollapsibleLegend
            title="My Calendars"
            items={[
              { color: "#b0b0b0", label: "Available" },
              { color: "#f44336", label: "Fully Booked" },
              { color: "#d32f2f", label: "Blocked by Admin", isBorder: true },
            ]}
          />

          <CollapsibleLegend
            title="Other Calendars"
            items={[
              { color: "#4caf50", label: "Holidays in the Philippines" },
              { color: "#f5f5f5", label: "Weekend", isBorder: true },
              { color: "#1976d2", label: "Today" },
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
          <ListItemButton component={NavLink} to="pending-requests" sx={menuItemSx}>
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
                    backgroundColor: item.isBorder
                      ? "transparent"
                      : item.color,
                    border: item.isBorder
                      ? `2px solid ${item.color}`
                      : "none",
                  }}
                />
                <Typography sx={{ fontSize: ".9rem" }}>
                  {item.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}

export default ClientLayout;