// src/layouts/regular_staff/RegularStaffLayout.jsx
import React from "react";
import { Outlet, NavLink } from "react-router-dom";
import logo from "../../assets/img/tgp.png";

// ✅ MUI Components
import { List, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";

// ✅ MUI Icon
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";

function RegularStaffLayout() {
  const menuItemSx = {
    borderRadius: "10px",
    px: 1.5,
    py: 1,
    transition: "0.2s ease",

    "&:hover": {
      backgroundColor: "#f5f5f5",
    },

    "&.active": {
      backgroundColor: "#f5f5f5",
    },

    // Text default
    "& .MuiListItemText-primary": {
      color: "#9e9e9e",
      fontWeight: 400,
      fontSize: "0.95rem",
    },

    // Text active
    "&.active .MuiListItemText-primary": {
      color: "#212121",
      fontWeight: 600,
    },

    // Icon default
    "& .MuiListItemIcon-root": {
      color: "#9e9e9e",
      minWidth: "35px",
    },

    // Icon active
    "&.active .MuiListItemIcon-root": {
      color: "#212121",
    },
  };

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <nav style={{ width: "270px", background: "white", padding: "10px" }}>
        {/* Logo + Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: "30px",
            whiteSpace: "nowrap",
            gap: "0px",
          }}
        >
          <img
            src={logo}
            alt="Logo"
            style={{
              width: "55px",
              height: "40px",
              flexShrink: 0,
            }}
          />
          <span
            style={{ fontSize: "1.1rem", fontWeight: "bold", color: "#212121" }}
          >
            THE GOLD PANICLES
          </span>
        </div>

        <p style={{ color: "#9e9e9e", fontWeight: "semibold" }}>Menu</p>

        {/* Menu */}
        <List sx={{ display: "flex", flexDirection: "column",  }}>
          <ListItemButton
            component={NavLink}
            to="my-assignment"
            sx={menuItemSx}
          >
            <ListItemIcon>
              <AssignmentIndOutlinedIcon sx={{ fontSize: 22 }} />
            </ListItemIcon>
            <ListItemText primary="My Assignment" />
          </ListItemButton>
        </List>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet />
      </div>
    </div>
  );
}

export default RegularStaffLayout;
