import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/admin/AdminLayout";
import ClientLayout from "../layouts/client/ClientLayout";
import SectionHeadLayout from "../layouts/section_head/SectionHeadLayout";
import RegularStaffLayout from "../layouts/regular_staff/RegularStaffLayout";

// Auth Pages
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";

// Admin Pages
import Dashboard from "../pages/admin/Dashboard";
import RequestManagement from "../pages/admin/RequestManagement";
import AssignmentManagement from "../pages/admin/AssignmentManagement";
import CalendarManagement from "../pages/admin/CalendarManagement";
import StaffersManagement from "../pages/admin/StaffersManagement";

// Client Pages
import Calendar from "../pages/client/Calendar";
import Request from "../pages/client/Request";
import Draft from "../pages/client/Draft";
import ApprovedRequest from "../pages/client/ApprovedRequests";
import DeclinedRequest from "../pages/client/DeclinedRequests";
import History from "../pages/client/History"

// Section Head Pages
import MyTeam from "../pages/section_head/MyTeam";
import SecHeadAssignment from "../pages/section_head/SecHeadAssignment";


// Regular Staff Pages
import MyAssignment from "../pages/regular_staff/MyAssignment";
import ApprovedRequests from "../pages/client/ApprovedRequests";

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="request-management" element={<RequestManagement />} />
        <Route path="assignment-management" element={<AssignmentManagement />} />
        <Route path="calendar-management" element={<CalendarManagement />} />
        <Route path="staffers-management" element={<StaffersManagement />} />
      </Route>


       <Route path="/client" element={<ClientLayout />}>
        <Route path="calendar" element={<Calendar />} />
        <Route path="request" element={<Request />} />
        <Route path="draft" element={<Draft />} />
        <Route path="approved-requests" element={<ApprovedRequest />} />
         <Route path="declined-requests" element={<DeclinedRequest />} />
        <Route path="history" element={<History />} />
        
      </Route>

       <Route path="/section_head" element={<SectionHeadLayout />}>
        <Route path="my-team" element={<MyTeam />} />
        <Route path="assignment" element={<SecHeadAssignment />} />
      </Route>
        
        <Route path="/regular_staff" element={<RegularStaffLayout />}>
        <Route path="my-assignment" element={<MyAssignment />} />
      </Route>


      {/* 404 fallback */}
      <Route path="*" element={<h1>Page Not Found</h1>} />
    </Routes>
  );
}

export default AppRoutes;
