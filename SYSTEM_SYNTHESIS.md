# TGP Coverage Request Management System — System Synthesis

## 1. System Overview

The **TGP Coverage Request Management System** is a comprehensive, role-based web application designed to streamline the submission, tracking, and fulfillment of media coverage requests within an organization. The system facilitates the coordination between clients who need coverage services (such as news articles, photo documentation, and video documentation) and the staff members responsible for delivering those services.

Built on a modern technology stack comprising **React 18** with **Vite** for the frontend, **Supabase** for the backend-as-a-service infrastructure (including authentication, database, and storage), and **Material-UI (MUI)** for the component library, the system provides a responsive and intuitive user experience across all device types. The application is designed with a dark and light theme toggle, ensuring accessibility and user preference accommodation.

The system's core purpose is to replace manual, paper-based, or fragmented communication channels with a centralized platform where coverage requests flow seamlessly from submission to completion, with appropriate stakeholders notified and involved at each stage of the workflow.

---

## 2. Technology Stack

### 2.1 Frontend Architecture

The frontend is constructed using **React 18** with functional components and hooks, following modern best practices for state management and component composition. **Vite** serves as the build tool, providing fast development server startup and hot module replacement (HMR) for an efficient development workflow. The routing is managed through **React Router v6**, enabling declarative route definitions with support for nested layouts and protected routes based on user roles.

**Material-UI (MUI)** provides the design system, offering a comprehensive set of pre-built components such as DataGrid for tabular data display, DatePicker and TimePicker for datetime selection, Dialogs for modal interactions, and theming capabilities for consistent styling. The application leverages MUI's theming provider to support both light and dark modes, with custom color tokens (gold, charcoal, and status-specific colors) applied throughout to maintain brand consistency.

**Custom React Hooks** provide centralized data management:
- `useAdminRequests()` - Fetches and manages all coverage requests for admin views
- `useClientRequests()` - Manages client-side request data with filtering
- `useRealtimeNotify()` - Handles real-time notifications and data synchronization
- `useRealtimeSync()` - Subscribes to database changes for live updates

### 2.2 Backend and Data Infrastructure

**Supabase** serves as the complete backend solution, providing:

- **Authentication**: Email/password-based authentication with session management. User identities are stored in Supabase Auth, with additional profile data (role, section, active status) stored in a custom `profiles` table.
- **Database**: PostgreSQL database with tables for coverage requests, assignments, profiles, notifications, client types, entities, semesters, duty schedules, and calendar availability. Relationships are properly normalized with foreign keys and referential integrity.
- **Storage**: Supabase Storage buckets for uploading and serving files such as program flows, event documentation, and user avatars.
- **Real-time Capabilities**: The system subscribes to database changes using Supabase Realtime, enabling live updates when new requests are submitted, statuses change, or assignments are made.

### 2.3 Additional Libraries and Tools

The system incorporates several supporting libraries:

- **date-fns** and **@mui/x-date-pickers**: For robust date and time handling with timezone safety.
- **@mui/x-data-grid**: For displaying and managing tabular data with sorting, filtering, and pagination.
- **jspdf** and **jspdf-autotable**: For generating PDF reports and confirmation documents.
- **@supabase/supabase-js**: The official JavaScript client for interacting with Supabase services.

---

## 3. User Roles and Access Control

The system implements a robust **Role-Based Access Control (RBAC)** model with four distinct user roles, each with personalized dashboards, navigation layouts, and permission sets. This design ensures that users only see and interact with the functionality relevant to their responsibilities.

### 3.1 Administrator (role: "admin")

Administrators have full system oversight and control. They are responsible for:

- **Dashboard**: High-level metrics including request counts by status, pipeline visualization, urgency indicators (Overdue, Critical, Soon, Upcoming), and recent activity feeds with attention flags.
- **Request Management**: Viewing all submitted requests, forwarding requests to appropriate sections, approving or declining requests with notes, and managing the overall request pipeline.
- **Staffers Management**: Creating, editing, and managing staff accounts, including assigning sections and controlling active/deactivated status.
- **Calendar Management**: Setting up availability windows and managing the system's calendar for coverage scheduling.
- **Semester Management**: Configuring academic semester periods that may affect request handling and scheduling.
- **Duty Schedule Viewing**: Monitoring duty schedules across all sections.
- **Reporting**: Generating reports on request volumes, completion rates, staff performance, and other analytics.
- **Profile Management**: Maintaining their own profile information.

The Admin Dashboard provides high-level metrics including request counts by status (Pending, Forwarded, Assigned, For Approval, Approved, On Going, Completed, Declined), pipeline visualization, urgency indicators (Overdue, Critical, Soon, Upcoming), and recent activity feeds.

### 3.2 Client (role: "client")

Clients are the requesters—individuals or departments that need coverage services. They can:

- **Submit Coverage Requests**: Creating new requests with details such as event title, description, date, time, venue, required services, contact information, and supporting file uploads.
- **Save as Draft**: Working on requests over time before formal submission, allowing for incomplete requests to be saved and edited later.
- **Track Request Status**: Monitoring the progress of submitted requests through the pipeline stages with visual progress indicators.
- **View Calendar**: Accessing a calendar view of scheduled events.
- **Download Confirmations**: Generating and downloading PDF confirmations for approved requests.
- **Manage Profile**: Updating their own profile information.

Clients interact primarily with the Request Tracker, which displays their requests in both a pipeline view (showing workflow stages with two-phase visualization) and filtered list views (All Requests, Pending, Approved, Declined). Request statuses progress through: Draft → Pending → Forwarded → Assigned → For Approval → Approved → On Going → Completed (or Declined at any stage).

### 3.3 Section Head (role: "sec_head")

Section Heads manage specific coverage sections (News, Photojournalism, Videojournalism) and are responsible for:

- **Dashboard Overview**: Viewing section-specific metrics and pending items.
- **Coverage Assignment**: Assigning staff members from their section to coverage requests that have been forwarded to them, with duty schedule integration to ensure proper staffing.
- **Managing Staffers**: Viewing and monitoring staff members within their section.
- **Submit for Approval**: After assigning staffers, section heads submit requests for final admin approval.
- **Profile Management**: Maintaining their profile information.

The Section Head Assignment Management interface features:
- Three-tab organization: For Assignment, Assigned, History
- Semester and staffer filtering capabilities
- Duty schedule integration (eligible staffers based on duty day)
- Assignment count tracking per staffer
- Real-time updates via Supabase Realtime

### 3.4 Regular Staff (role: "staff")

Regular Staff are the front-line personnel who execute coverage assignments. They can:

- **View Assignments**: Seeing all assigned coverage tasks, with details including event information, venue, time, contact person, and required services.
- **Time In**: Recording their actual start time for assignments, transitioning status from "Approved" to "On Going" (with timing logic - opens 10 minutes before event).
- **Mark Complete**: Recording completion of assignments, transitioning status to "Completed."
- **View Schedule**: Accessing their personal schedule of upcoming assignments.
- **Manage Profile**: Updating their profile information.

Staff assignments follow a lifecycle: Pending → Approved → On Going (Time In) → Completed (or No Show if failed to report).

---

## 4. Core Features and Functionality

### 4.1 Authentication and Authorization

The system implements secure authentication with Supabase Auth. Upon login, the system queries the user's profile to determine their role, section assignment, and active status. Users with inactive accounts are prevented from logging in. The `ProtectedRoute` component wraps all authenticated routes, verifying both authentication status and role-based access before rendering protected content.

The login flow includes:
1. Email and password submission
2. Supabase authentication
3. Profile verification (role, section, is_active flag)
4. Role-based redirect to the appropriate dashboard

### 4.2 Coverage Request Workflow

The request lifecycle represents the heart of the system:

1. **Creation**: Clients fill out a detailed request form including title, description, event date, start/end times, venue, service requirements (checkboxes for News Article, Photo Documentation, Video Documentation, Camera Operator), client type, entity, contact person, and optional file attachments.
2. **Submission**: Requests are submitted as "Pending" status, triggering notifications to administrators.
3. **Review**: Administrators review submissions and may forward them to one or more sections (News, Photojournalism, Videojournalism) based on the services requested.
4. **Assignment**: Section Heads assign available staff from their section to cover the request, considering duty schedules and current workload.
5. **Section Approval**: Section Heads submit assigned requests for final admin approval.
6. **Final Approval**: Administrators provide final approval, at which point assigned staff can view and act on the assignment.
7. **Execution**: Staff time in to begin coverage, and mark complete when finished.
8. **Documentation**: Completed requests may have file outputs (photos, videos, articles) associated with them.

The system supports draft functionality, allowing clients to save incomplete requests for later completion. Files are stored in Supabase Storage with organized paths (e.g., `program_flows/{user_id}/{timestamp}_{filename}`).

### 4.3 Notification System

A centralized notification service (`NotificationService.js`) manages multi-channel in-app notifications:

- **notifyAdmins**: Alerts all active administrators when new requests are submitted.
- **notifyClient**: Informs the requester of status changes (forwarded, approved, declined) and assignment updates.
- **notifySecHeads**: Notifies section heads when requests are forwarded to their section.
- **notifyAssignedStaff**: Alerts assigned staff members when they receive new coverage assignments.

Notifications are stored in the `notifications` table with fields for recipient, type, title, message, request association, and read status. The NotificationBell component in the layout provides a visual indicator of unread notifications.

### 4.4 Real-time Synchronization

The `useRealtimeSync` hook subscribes to Supabase Realtime channels, listening for changes to `coverage_requests` and `coverage_assignments` tables. When changes occur, the hook triggers a callback (typically refreshing the data), ensuring all connected clients see up-to-date information without manual page refreshes.

The `useRealtimeNotify` hook provides enhanced real-time capabilities with automatic toast notifications for various events.

### 4.5 Calendar and Availability Management

The system includes calendar functionality at multiple levels:

- **Client Calendar**: Clients can view their requested events on a calendar.
- **Admin Calendar Management**: Administrators can set up availability windows, configure calendar settings, and view duty schedules.
- **Staff Schedule**: Staff members can view their personal assigned coverage schedule.
- **Semester Management**: Administrators can define academic semesters, which may influence scheduling rules or reporting periods.
- **Duty Schedules**: System tracks which staffers are assigned to duty on which days, used for intelligent assignment suggestions.

### 4.6 Reporting and Analytics

The Admin Dashboard includes a ReportGenerator component that provides:

- Request volume statistics by status and time period
- Completion rate metrics
- Staff performance tracking
- Section-specific analytics

Reports can be exported or viewed directly within the dashboard.

### 4.7 Document Generation

The system includes PDF generation capabilities (`generateConfirmationPDF.js`) that allow clients to download formal confirmation documents for approved coverage requests. These PDFs include request details, event information, and confirmation status.

### 4.8 Global Search

A GlobalSearch component enables searching across requests, staff, and other entities, providing quick access to relevant records without navigating through multiple pages.

### 4.9 Two-Phase Pipeline Visualization

The Client Request Tracker implements a two-phase pipeline visualization:
- **Phase 1**: Submission → Admin Review → Forwarding → Staff Assignment → Admin Approval
- **Phase 2**: Execution → Coverage Complete

This provides clients with clear visual feedback on their request progress through the system.

### 4.10 Duty Schedule Integration

The Section Head Assignment Management integrates with duty schedules to:
- Filter eligible staffers based on their assigned duty days
- Consider weekends vs. weekdays for staffing decisions
- Track assignment counts per staffer for workload balancing

---

## 5. Database Schema Overview

While the full schema is defined in Supabase, the key tables include:

- **profiles**: User accounts with role, section, full_name, avatar_url, is_active
- **coverage_requests**: Main request records with all event details, status, timestamps
- **coverage_assignments**: Staff assignments linking requests to staff members with status, timed_in_at
- **client_types**: Categories of clients (e.g., academic department, student organization)
- **client_entities**: Specific entities within client types
- **notifications**: User notifications with read status
- **semesters**: Academic semester definitions
- **calendar_availability**: Staff availability windows
- **duty_schedules**: Staff duty day assignments per semester
- **sections**: Coverage sections (News, Photojournalism, Videojournalism)

---

## 6. UI/UX Design Principles

### 6.1 Layout Architecture

Each role has a dedicated layout component (`AdminLayout`, `ClientLayout`, `SectionHeadLayout`, `RegularStaffLayout`) that provides consistent navigation (sidebar or topbar), notification access, and content area. These layouts share common elements while providing role-specific navigation items.

### 6.2 Theming

The `ThemeContext` implements MUI's theming system with custom tokens:

- **Primary**: Gold (#F5C52B) for highlights and CTAs
- **Secondary**: Charcoal (#353535) for text and backgrounds
- **Status Colors**: Distinct colors for each workflow status (Pending: amber, Approved: green, Declined: red, On Going: blue, etc.)
- **Dark Mode**: Full dark theme variant with adjusted colors for backgrounds, surfaces, and text

### 6.3 Responsive Design

The system uses MUI's `useMediaQuery` hook to adapt layouts for mobile, tablet, and desktop viewports, ensuring usability across devices.

### 6.4 Custom DataGrid Styling

All data grids throughout the application feature custom-styled column menus with:
- Consistent border radius (10px)
- Custom shadows for light/dark modes
- Hover effects with gold accent colors
- Custom typography using DM Sans font

---

## 7. Supabase Edge Functions

The system includes server-side Edge Functions:

- **create-staff-account**: Automated staff account creation, likely triggered during admin-initiated staff onboarding.
- **send-credentials**: Automated email delivery of login credentials to new users.

These functions extend the application's capabilities beyond client-side logic, enabling secure server operations.

---

## 8. System Workflow Summary

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   CLIENT    │────▶│   PENDING    │────▶│    ADMIN        │
│  submits    │     │              │     │  reviews &      │
│  request    │     │              │     │  forwards       │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                                                   ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│   STAFF     │◀────│  ASSIGNED    │◀────│  SEC HEAD       │
│  executes   │     │  (Approved)  │     │  assigns staff │
│  coverage   │     │              │     │  & submits      │
└─────────────┘     └──────────────┘     └─────────────────┘
        │
        ▼
┌─────────────┐
│  COMPLETED  │
│             │
└─────────────┘
```

### Detailed Status Flow

1. **Draft** → Client saves incomplete request
2. **Pending** → Client submits request, awaiting admin review
3. **Forwarded** → Admin forwards to section(s) for staff assignment
4. **Assigned** → Section head assigns staff members
5. **For Approval** → Section head submits for final admin approval
6. **Approved** → Admin approves, staff can view and act
7. **On Going** → Staff member has timed in
8. **Completed** → Coverage finished
9. **Declined** → Request denied at any stage

---

## 9. Recent Enhancements

### 9.1 Section Head Assignment Management (v2.0)
- Complete UI redesign with three-tab organization (For Assignment, Assigned, History)
- Semester-based filtering
- Staffer filtering and workload visualization
- Duty schedule integration for eligible staffer suggestions
- Submit for approval workflow
- Real-time updates via Supabase Realtime
- Enhanced status pills with custom styling

### 9.2 Admin Dashboard (v2.0)
- Hero banner with live status indicators
- KPI cards (Total, Approved, Declined, Completion) with navigation to filtered views
- Needs Attention section with urgency categorization (Overdue, Critical, Soon)
- All-time toggle for historical data
- Semester selector for time-bound analytics
- Real-time subscription to multiple tables

### 9.3 Client Request Tracker (v2.0)
- Two-phase pipeline visualization
- Tabbed interface (Pipeline, All Requests, Pending, Approved, Declined)
- Visual progress indicators with phase markers
- Enhanced status configuration
- Real-time updates

### 9.4 Regular Staff My Assignment (v2.0)
- Smart Time In logic (opens 10 minutes before event, early/passed states)
- Weekend detection and badge display
- Assignment card redesign with status pills
- Detailed assignment dialog with full coverage information

### 9.5 Admin Request Management (v2.0)
- Enhanced status filtering tabs
- Semester and entity filtering
- Custom DataGrid column menu styling
- Tab descriptions for better UX

---

## 10. Conclusion

The TGP Coverage Request Management System is a mature, feature-rich application that successfully digitizes and automates the complete lifecycle of media coverage requests. Its thoughtful role-based architecture ensures that each stakeholder—clients, administrators, section heads, and staff—interacts with a tailored interface that supports their specific responsibilities. The integration of real-time updates, notifications, document generation, and comprehensive reporting makes it a powerful tool for managing coverage operations at scale.

The system's foundation on Supabase provides scalability, security, and reliability, while the React/Material-UI frontend delivers a polished, accessible user experience. The recent enhancements have significantly improved the user experience with better visual feedback, workflow optimization, and intelligent staffing suggestions based on duty schedules.

This synthesis document captures the essential characteristics of the system and provides a reference for understanding its capabilities, architecture, and value proposition.
