// src/layouts/AdminLayout.jsx
import React from "react";
import { Outlet, Link } from "react-router-dom";

function SectionHeadLayout() {
  return (
    <div style={{ display: "flex", height: "100vh" }}>
      {/* Sidebar */}
      <nav style={{ width: "250px", background: "#f0f0f0", padding: "20px" }}>
        <h3>Section Head Menu</h3>
        <ul style={{ listStyle: "none", padding: 0 }}>
          <li><Link to="my-team">My Team</Link></li>
          <li><Link to="assignment">Section Head Assignment</Link></li>
          
        </ul>
      </nav>

      {/* Main content */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet /> {/* This is where pages render */}
      </div>
    </div>
  );
}

export default SectionHeadLayout;
