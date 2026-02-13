// src/layouts/AdminLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";

function AdminLayout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <nav style={{ width: "250px", background: "#f0f0f0", padding: "20px" }}>
        <h3>Admin Menu</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li><Link to="dashboard">Dashboard</Link></li>
          <li><Link to="request-management">Request Management</Link></li>
          <li><Link to="assignment-management">Assignment Management</Link></li>
          <li><Link to="calendar-management">Calendar Management</Link></li>
          <li><Link to="staffers-management">Staffers Management</Link></li>
        </ul>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet /> {/* This is where pages render */}
      </div>
    </div>
  );
}

export default AdminLayout;
