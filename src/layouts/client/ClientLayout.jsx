// src/layouts/ClientLayout.jsx
import React, { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import logo from "../../assets/img/tgp.png";
import RequestForm from "../../components/client/RequestForm"; // your dialog
import { Collapse } from "@mui/material";

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
  Button,
} from "@mui/material";

// ✅ MUI Icons
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import AddIcon from "@mui/icons-material/Add";

function ClientLayout() {
  const location = useLocation();
  const showLegend = location.pathname.includes("/my-calendar");

  // ------------------ NEW: instruction/help panel ------------------
  const [showInstructions, setShowInstructions] = useState(true); // OPEN by default

  const handleToggleInstructions = () => {
    setShowInstructions((prev) => !prev);
  };

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

  // ------------------ DIALOG STATE ------------------
  const [openDialog, setOpenDialog] = useState(false);

  const handleOpen = () => setOpenDialog(true);
  const handleClose = () => setOpenDialog(false);

  const handleSubmitRequest = (data) => {
    console.log("Coverage request submitted:", data);
    // TODO: save to Supabase or API here
    handleClose(); // close the dialog
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
        {/* Left: Logo + Button */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <img src={logo} alt="Logo" style={{ width: 55, height: 40 }} />
          <Typography
            sx={{
              fontSize: "1.1rem",
              fontWeight: "bold",
              color: "#212121",
              marginRight: 3,
            }}
          >
            THE GOLD PANICLES
          </Typography>

          {/* ---------- Create Request Button ---------- */}
          <Button
            variant="contained"
            color="white"
            size="small"
            startIcon={<AddIcon />}
            sx={{
              textTransform: "none",
              borderRadius: 20,
              height: 34,
              width: 200,
            }}
            onClick={handleOpen} // open dialog
          >
            Create Request
          </Button>
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
            alt="User Name"
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
              <ListItemButton
                component={NavLink}
                to="my-calendar"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <CalendarTodayOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="My Calendar" />
              </ListItemButton>

              <ListItemButton
                component={NavLink}
                to="my-request"
                sx={menuItemSx}
              >
                <ListItemIcon>
                  <AssignmentOutlinedIcon sx={{ fontSize: 20 }} />
                </ListItemIcon>
                <ListItemText primary="My Request" />
              </ListItemButton>
            </List>
          </Box>

          {showLegend && (
            <Box sx={{ mt: "auto", mb: 1, padding: 1 }}>
              {/* ---------- HELP PANEL (title same UI as legends) ---------- */}
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
                <Typography sx={{ fontSize: ".9rem", color: "#757575" }}>
                  How to Request Coverage
                </Typography>

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
                    1. Click the "Create Request" button at the top to fill out
                    a new request.
                  </Typography>
                  <Typography variant="body2">
                    2. Or click any available date on the calendar to pre-fill
                    the request date.
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Note: Past dates and holidays are blocked.
                  </Typography>
                </Box>
              </Collapse>

              {/* ---------- LEGENDS (collapsed by default) ---------- */}
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
        </nav>

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

// ---------------- Collapsible Legend ----------------
function CollapsibleLegend({ title, items }) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{ mb: 1 }}>
      {/* Title OUTSIDE */}
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

      {/* Only LIST inside bordered box */}
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
