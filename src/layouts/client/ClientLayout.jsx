// src/layouts/AdminLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";

function ClientLayout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <nav style={{ width: "250px", background: "#f0f0f0", padding: "20px" }}>
        <h3>Client Menu</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li><Link to="my-calendar">My Calendar</Link></li>
          <li><Link to="my-request">My Request</Link></li>
          
        </ul>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet /> {/* This is where pages render */}
      </div>
    </div>
  );
}

export default ClientLayout;
