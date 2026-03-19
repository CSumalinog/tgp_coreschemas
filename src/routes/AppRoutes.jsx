// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "../components/common/ProtectedRoute";
import AdminLayout from "../layouts/admin/AdminLayout";
import ClientLayout from "../layouts/client/ClientLayout";
import SectionHeadLayout from "../layouts/section_head/SectionHeadLayout";
import RegularStaffLayout from "../layouts/regular_staff/RegularStaffLayout";

// Auth Pages
import Login from "../pages/auth/Login";
import Signup from "../pages/auth/Signup";

// Admin Pages
import Dashboard from "../pages/admin/Dashboard";
import AdminRequestManagement from "../pages/admin/AdminRequestManagement";
import CalendarManagement from "../pages/admin/CalendarManagement";
import StaffersManagement from "../pages/admin/StaffersManagement";
import SemesterManagement from "../pages/admin/SemesterManagement";
import DutyScheduleView from "../pages/admin/DutyScheduleView";

// Client Pages
import Calendar from "../pages/client/Calendar";
import Draft from "../pages/client/Draft";
import RequestTracker from "../pages/client/RequestTracker";

// Section Head Pages
import SecHeadDashboard from "../pages/section_head/SecHeadDashboard";
import SecHeadAssignmentManagement from "../pages/section_head/SecHeadAssignmentManagement";
import SecHeadMyStaffers from "../pages/section_head/MyStaffers";

// Regular Staff Pages
import MyAssignment from "../pages/regular_staff/MyAssignment";
import MySchedule from "../pages/regular_staff/MySchedule";
import TimeoutPage from "../pages/regular_staff/TimeoutPage";

// Shared Profile Page
import ProfilePage from "../pages/common/ProfilePage";

function AppRoutes() {
  return (
    <Routes>
      {/* Auth Routes */}
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* ── Timeout — staff only, full-page (no layout wrapper) ── */}
      <Route
        path="/timeout/:requestId"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <TimeoutPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes — only role: "admin" */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="request-management" element={<AdminRequestManagement />} />
        <Route path="calendar-management" element={<CalendarManagement />} />
        <Route path="staffers-management" element={<StaffersManagement />} />
        <Route path="semester-management" element={<SemesterManagement />} />
        <Route path="duty-schedule-view" element={<DutyScheduleView />} />
        <Route path="profile" element={<ProfilePage />} />
        {/* Legacy redirects */}
        <Route path="approved-requests"  element={<Navigate to="/admin/request-management" replace />} />
        <Route path="forwarded-requests" element={<Navigate to="/admin/request-management" replace />} />
        <Route path="declined-requests"  element={<Navigate to="/admin/request-management" replace />} />
        <Route path="for-approval"       element={<Navigate to="/admin/request-management" replace />} />
      </Route>

      {/* Client Routes — only role: "client" */}
      <Route
        path="/client"
        element={
          <ProtectedRoute allowedRoles={["client"]}>
            <ClientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="calendar" />} />
        <Route path="calendar" element={<Calendar />} />
        <Route path="draft" element={<Draft />} />
        <Route path="request-tracker" element={<RequestTracker />} />
        <Route path="profile" element={<ProfilePage />} />
        {/* Legacy redirects */}
        <Route path="pending-requests"  element={<Navigate to="/client/request-tracker" replace />} />
        <Route path="approved-requests" element={<Navigate to="/client/request-tracker" replace />} />
        <Route path="declined-requests" element={<Navigate to="/client/request-tracker" replace />} />
        <Route path="history"           element={<Navigate to="/client/request-tracker" replace />} />
      </Route>

      {/* Section Head Routes — only role: "sec_head" */}
      <Route
        path="/sec_head"
        element={
          <ProtectedRoute allowedRoles={["sec_head"]}>
            <SectionHeadLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<SecHeadDashboard />} />
        <Route path="coverage-assignment" element={<SecHeadAssignmentManagement />} />
        <Route path="my-staffers" element={<SecHeadMyStaffers />} />
        <Route path="profile" element={<ProfilePage />} />
        {/* Legacy redirects */}
        <Route path="assignment-management" element={<Navigate to="/sec_head/coverage-assignment" replace />} />
        <Route path="for-assignment"        element={<Navigate to="/sec_head/coverage-assignment" replace />} />
        <Route path="assigned"              element={<Navigate to="/sec_head/coverage-assignment" replace />} />
        <Route path="history"               element={<Navigate to="/sec_head/coverage-assignment" replace />} />
      </Route>

      {/* Regular Staff Routes — only role: "staff" */}
      <Route
        path="/staff"
        element={
          <ProtectedRoute allowedRoles={["staff"]}>
            <RegularStaffLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="my-assignment" />} />
        <Route path="my-assignment" element={<MyAssignment />} />
        <Route path="my-schedule" element={<MySchedule />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* 404 fallback */}
      <Route path="*" element={<h1>Page Not Found</h1>} />
    </Routes>
  );
}

export default AppRoutes;