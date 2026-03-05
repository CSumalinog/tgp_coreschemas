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
import ApprovedRequests from "../pages/admin/AdminApprovedRequests";
import ForwardedRequest from "../pages/admin/ForwardedRequest";
import DeclinedRequests from "../pages/admin/AdminDeclinedRequests";
import ForApproval from "../pages/admin/ForApproval";
import CalendarManagement from "../pages/admin/CalendarManagement";
import StaffersManagement from "../pages/admin/StaffersManagement";
import SemesterManagement from "../pages/admin/SemesterManagement";
import DutyScheduleView from "../pages/admin/DutyScheduleView";

// Client Pages
import Calendar from "../pages/client/Calendar";
import PendingRequest from "../pages/client/PendingRequest";
import Draft from "../pages/client/Draft";
import ApprovedRequest from "../pages/client/ApprovedRequests";
import DeclinedRequest from "../pages/client/DeclinedRequests";
import History from "../pages/client/History";

// Section Head Pages
import SecHeadDashboard from "../pages/section_head/SecHeadDashboard";
import SecHeadAssignment from "../pages/section_head/SecHeadAssignment";
import SecHeadAssigned from "../pages/section_head/Assigned";
import SecHeadHistory from "../pages/section_head/SecHeadHistory";
import SecHeadMyStaffers from "../pages/section_head/MyStaffers";

// Regular Staff Pages
import StaffDashboard from "../pages/regular_staff/StaffDashboard";
import MyAssignment from "../pages/regular_staff/MyAssignment";
import MySchedule from "../pages/regular_staff/MySchedule";

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="request-management" element={<RequestManagement />} />
        <Route path="approved-requests" element={<ApprovedRequests />} />
        <Route path="forwarded-requests" element={<ForwardedRequest />} />
        <Route path="declined-requests" element={<DeclinedRequests />} />
        <Route path="for-approval" element={<ForApproval />} />
        <Route path="calendar-management" element={<CalendarManagement />} />
        <Route path="staffers-management" element={<StaffersManagement />} />
        <Route path="semester-management" element={<SemesterManagement />} />
        <Route path="duty-schedule-view" element={<DutyScheduleView />} />
      </Route>

      {/* Client Routes */}
      <Route path="/client" element={<ClientLayout />}>
        <Route index element={<Navigate to="calendar" />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="draft" element={<Draft />} />
        <Route path="pending-requests" element={<PendingRequest />} />
        <Route path="approved-requests" element={<ApprovedRequest />} />
        <Route path="declined-requests" element={<DeclinedRequest />} />
        <Route path="history" element={<History />} />
      </Route>

      {/* Section Head Routes */}
      <Route path="/sec_head" element={<SectionHeadLayout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<SecHeadDashboard />} />
        <Route path="for-assignment" element={<SecHeadAssignment />} />
        <Route path="assigned" element={<SecHeadAssigned />} />
        <Route path="history" element={<SecHeadHistory />} />
        <Route path="my-staffers" element={<SecHeadMyStaffers />} />
      </Route>

      {/* Regular Staff Routes */}
      <Route path="/staff" element={<RegularStaffLayout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<StaffDashboard />} />
        <Route path="my-assignment" element={<MyAssignment />} />
        <Route path="my-schedule" element={<MySchedule />} />
      </Route>

      {/* 404 fallback */}
      <Route path="*" element={<h1>Page Not Found</h1>} />
    </Routes>
  );
}

export default AppRoutes;
