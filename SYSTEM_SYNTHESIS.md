# TGP Coverage Request and Scheduling Management System — System Synthesis


## 1. System Overview!

The **TGP Coverage Request and Scheduling Management System** is a comprehensive, role-based web application designed to streamline the submission, tracking, and fulfillment of media coverage requests within an organization. The system facilitates the coordination between clients who need coverage services (such as news articles, photo documentation, and video documentation) and the staff members responsible for delivering those services.

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
- `useDutyChangeRequestQuota()` - Tracks duty day change request quota per semester

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
- **Cancel Requests**: Canceling requests that are still in cancellable stages (Pending through On Going), with optional reason and notifications to relevant parties.
- **Reschedule Requests**: Rescheduling events that have already been assigned, with date validation, conflict checking, and automatic staff reassignment workflow.
- **Manage Profile**: Updating their own profile information.

Clients interact primarily with the Request Tracker, which displays their requests in both a pipeline view (showing workflow stages with two-phase visualization) and filtered list views (All Requests, Pending, Approved, Declined). Request statuses progress through: Draft → Pending → Forwarded → Assigned → For Approval → Approved → On Going → Completed (or Cancelled/Declined at any stage).

### 3.3 Section Head (role: "sec_head")

Section Heads manage specific coverage sections (News, Photojournalism, Videojournalism) and are responsible for:

- **Dashboard Overview**: Viewing section-specific metrics and pending items.
- **Coverage Assignment**: Assigning staff members from their section to coverage requests that have been forwarded to them, with duty schedule integration to ensure proper staffing.
- **Coverage Tracking**: Monitoring ongoing coverage and completed assignments with real-time status updates.
- **Time Records**: Viewing and managing staffer time-in/time-out records with filtering and export capabilities.
- **Managing Staffers**: Viewing and monitoring staff members within their section.
- **Submit for Approval**: After assigning staffers, section heads submit requests for final admin approval.
- **Profile Management**: Maintaining their profile information.

The Section Head interface features modular pages:

- **Coverage Assignment**: Views for All, For Assignment, For Approval, and Assigned statuses
- **Coverage Tracker**: Views for All, On Going, and Completed coverage records
- **Time Records**: Comprehensive time tracking with search, filter, and CSV export
- **Reassignment History**: Dedicated page tracking announced emergencies and no-shows with replacement details
- **Real-time Updates**: Live subscription to coverage_requests and coverage_assignments tables

### 3.4 Regular Staff (role: "staff")

Regular Staff are the front-line personnel who execute coverage assignments. They can:

- **View Assignments**: Seeing all assigned coverage tasks, with details including event information, venue, time, contact person, and required services.
- **Time In**: Recording their actual start time for assignments, transitioning status from "Approved" to "On Going" (with timing logic - opens 10 minutes before event).
- **Mark Complete**: Recording completion of assignments, transitioning status to "Completed."
- **View Schedule**: Accessing their personal schedule of upcoming assignments.
- **Manage Profile**: Updating their profile information.

Staff assignments follow a lifecycle: Pending → Approved → On Going (Time In) → Completed (or No Show if failed to report).

---

## 3.5 Organizational Structure and Coverage Divisions

The TGP organization consists of **two main divisions** that manage coverage services, each with distinct sections and responsibilities:

### 3.5.1 Scribes Division

**Responsible for:** News coverage

- **Section**: News
- **Managed by**: News Section Head
- **Coverage Services**: News Article

The News Section Head manages all News Article coverage assignments from staff members within the Scribes division.

### 3.5.2 Creatives Division

**Responsible for:** Visual media coverage

- **Sections**:
  - Photojournalism (managed by Photo Section Head)
  - Videojournalism (managed by Video Section Head)
- **Coverage Services**:
  - Photo Documentation (managed by Photo Section Head)
  - Video Documentation (managed by Video Section Head)
  - Camera Operator (managed by Video Section Head only)

The Photo and Video Section Heads manage coverage assignments within their respective sections.

### 3.5.3 Division-Based Assignment Rules

All section heads operate within their division scope and must observe the following assignment hierarchy:

| Section Head | Primary Assignment | Secondary Assignment            | Scope              | Special Authority                    |
| ------------ | ------------------ | ------------------------------- | ------------------ | ------------------------------------ |
| News Head    | News staff         | Other Scribes staff (if needed) | Scribes Division   | None                                 |
| Photo Head   | Photo staff        | Video staff (if needed)         | Creatives Division | None                                 |
| Video Head   | Video staff        | Photo staff (if needed)         | Creatives Division | **Camera Operator (CO) assignments** |

**Key Assignment Rules:**

1. **Primary Section Priority**: All section heads prioritize assigning staff from their own section first
2. **Within-Division Cross-Assignment**: Section heads can assign staff from other sections **within their division only** if workload or availability requires it:
   - News head: Can pull from other Scribes staff (though currently only News section is part of coverage workflow)
   - Photo head: Can pull from Videojournalism staff within Creatives division
   - Video head: Can pull from Photojournalism staff within Creatives division
3. **No Cross-Division Assignment**: Section heads **cannot** assign staff from other divisions
4. **Camera Operator Management**:
   - Only the Video Section Head can assign Camera Operator staff
   - Camera Operator is only assigned when explicitly requested in the coverage requirements
   - Camera Operator is managed as a specialized role within Videojournalism section

### 3.5.4 Multi-Day Event Staffing

For multi-day coverage events:

- Each day requires separate staffing with individual assignments per day
- Assignment records include an `assignment_date` field to track the specific date of service
- Section heads assign staffers per day, allowing the same event to have different staff on different days if needed
- Assignment counts update dynamically as assignments are made per day

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

1. **Creation**: Clients fill out a detailed request form including title, description, event date, start/end times, venue, service requirements (checkboxes for News Article, Photo Documentation, Video Documentation, Camera Operator), client type, entity, contact person, and optional file attachments. The system supports both single-day and multi-day events, where multi-day events can have different schedules for each day.
2. **Submission**: Requests are submitted as "Pending" status, triggering notifications to administrators.
3. **Review**: Administrators review submissions and may forward them to one or more sections (News, Photojournalism, Videojournalism) based on the services requested.
4. **Assignment**: Section Heads assign available staff from their section to cover the request, considering duty schedules and current workload.
5. **Section Approval**: Section Heads submit assigned requests for final admin approval.
6. **Final Approval**: Administrators provide final approval, at which point assigned staff can view and act on the assignment.
7. **Execution**: Staff time in to begin coverage, and mark complete when finished.
8. **Documentation**: Completed requests may have file outputs (photos, videos, articles) associated with them.
9. **Cancellation**: Clients can cancel requests at any cancellable stage (Pending through On Going), triggering notifications to all relevant parties.
10. **Rescheduling**: Clients can reschedule events that have already been assigned, with status resetting to Forwarded for staff reassignment.

The system supports draft functionality, allowing clients to save incomplete requests for later completion. Files are stored in Supabase Storage with organized paths (e.g., `program_flows/{user_id}/{timestamp}_{filename}`).

### 4.3 Notification System

A centralized notification service (`NotificationService.js`) manages multi-channel in-app notifications:

- **notifyAdmins**: Alerts all active administrators when new requests are submitted.
- **notifyClient**: Informs the requester of status changes (forwarded, approved, declined, cancelled) and assignment updates.
- **notifySecHeads**: Notifies section heads when requests are forwarded to their section, or when requests are cancelled/rescheduled.
- **notifyAssignedStaff**: Alerts assigned staff members when they receive new coverage assignments.
- **notifySpecificStaff**: Notifies specific staff members by ID array (used for targeted notifications like cancellation notices).

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

- **profiles**: User accounts with role, section, full_name, avatar_url,
- **coverage_requests**: Main request records with all event details, status, timestamps, including multi-day event support (`is_multiday`, `event_days`, `end_date`)
- **coverage_assignments**: Staff assignments linking requests to staff members with status, timed_in_at
- **client_types**: Categories of clients (e.g., academic department, student organization)
- **client_entities**: Specific entities within client types
- **notifications**: User notifications with read status
- **semesters**: Academic semester definitions
- **calendar_availability**: Staff availability windows
- **duty_schedules**: Staff duty day assignments per semester
- **duty_schedule_change_requests**: Staff duty day change requests with status tracking
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
10. **Cancelled** → Request cancelled by client at any cancellable stage (Pending through On Going)

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

### 9.4.1 Regular Staff My Assignment (v2.1) — Enhanced Features

**Tabbed Interface and Filtering:**

- Tabbed organization with "All" and "Completed" tabs showing respective counts
- Semester-based filtering to view assignments by academic period
- Entity/Client filtering for viewing assignments from specific clients
- Filter chips for active filters with clear functionality
- Statistics display (Total, Completed, Ongoing) when semester filter is active

**Auto-Popup Time In Notification:**

- Automatic alert dialog pops up when Time In window opens (10 minutes before event)
- Checks every 30 seconds for upcoming assignments
- Dismissible with option to proceed to Time In

**Enhanced Time In System with GPS and Selfie Verification:**
The [`TimeIn`](src/components/regular_staff/TimeIn.jsx:1) component provides robust staff check-in functionality:

- **GPS Location Verification**: Uses the browser's Geolocation API to verify staff presence within 400m radius of CSU Main Campus (coordinates: 8.955481, 125.597788)
- **Distance Calculation**: Implements Haversine formula for accurate proximity detection
- **GPS Status Indicators**: Visual feedback showing verification status (Verified ✓, Outside, Denied, Unavailable)
- **Hard Block**: Prevents check-in if staff is detected outside campus premises
- **Soft Warning**: Allows check-in without GPS but flags for admin review when location is denied/unavailable

**Selfie Capture with Timestamp:**

- Front camera capture with baked-in timestamp displaying date and time
- Timestamp overlay with gold text on dark background for visibility
- Preview with retake option for normal check-ins
- Emergency mode (for reassigned assignments) with no retake option and auto-submit

**Notification System:**

- Alerts admins when staff checks in (with GPS verification status)
- Notifies section heads of the assigned staff member's check-in
- Informs clients that coverage has started
- Emergency check-in notifications for reassigned assignments

**Database Enhancements:**

- Stores selfie proof in Supabase Storage (`login-proof` bucket)
- Records GPS coordinates (lat, lng) and verification status
- Tracks timed_in_at and completed_at timestamps
- Supports is_reassigned flag for emergency coverage scenarios

### 9.5 Admin Request Management (v2.0)

- Enhanced status filtering tabs
- Semester and entity filtering
- Custom DataGrid column menu styling
- Tab descriptions for better UX

### 9.6 Admin Request Details - Assessment Warning Dialog (v2.1)

- **Intelligent Request Assessment**: Integration with [`RequestAssistant`](src/hooks/RequestAssistant.js:1) hook to automatically evaluate requests for potential issues
- **Pre-Forward Warning System**: Before forwarding requests, administrators are alerted to any assessment flags including:
  - **Late Submission Warnings**: Detects requests submitted too close to the event date
  - **Incomplete Information**: Identifies missing or incomplete required fields
  - **Scheduling Conflicts**: Flags potential conflicts with existing coverage assignments
- **Assessment Flag Dialog**: Dedicated warning dialog that displays all detected issues with:
  - Color-coded severity indicators (warning vs. error states)
  - Detailed issue descriptions and specific missing fields
  - Conflict details showing overlapping events with times
  - Acknowledgment workflow requiring admin to explicitly proceed despite warnings
- **Service-Based Section Pre-selection**: Automatically pre-selects relevant sections based on requested services:
  - News Article → News section
  - Photo Documentation → Photojournalism section
  - Video Documentation/Camera Operator → Videojournalism section
  - Only allows forwarding to sections relevant to the client's requested services
- **Enhanced User Experience**: Prevents accidental forwarding of problematic requests while still allowing admin override when necessary

### 9.7 Request Assistant Hook - Intelligent Request Assessment (v2.2)

The [`RequestAssistant`](src/hooks/RequestAssistant.js:1) hook provides comprehensive AI-like request analysis with four distinct assessment modules:

#### 9.7.1 Late Submission Detection

- Compares event date with submission date
- Flags same-day submissions as errors
- Warns when submissions are less than 2 days before the event
- Provides clear success messages for timely submissions

#### 9.7.2 Incomplete Request Checker

- Validates presence of program flow (PDF) attachment
- Checks description length (minimum 20 characters)
- Verifies contact person and contact information
- Ensures at least one service is requested
- Returns multi-issue arrays for comprehensive feedback

#### 9.7.3 Newsworthiness Scoring (3-Filter System)

- **Filter 1 - Relevance**: Evaluates public significance (university-wide, department-level, organization-level)
- **Filter 2 - Newsworthiness Type**: Categorizes events as critical, good stories, or routine
- **Filter 3 - Resource Justification**: Scores based on service count and expected participation
- Generates composite score (1-5 scale) with labels (Low, Moderate, High, Very High)
- Provides actionable recommendations (Decline, Forward with note, Forward immediately)

#### 9.7.4 Scheduling Conflict Detection

- Queries database for overlapping approved/ongoing/forwarded coverage on same date
- Displays conflict details with titles, times, and statuses
- Prevents double-booking of staff resources

### 9.8 Enhanced Notification System with Audio/Visual Alerts

The [`useRealtimeNotify`](src/hooks/useRealtimeNotify.js:1) hook has been significantly enhanced with multi-channel notification capabilities:

#### 9.8.1 Audio Notifications

- Web Audio API-based three-tone ascending chime (C5 → E5 → G5)
- Automatic AudioContext unlocking on first user interaction
- Respects browser autoplay policies
- Smooth gain transitions for pleasant audio experience

#### 9.8.2 Visual Notifications

- **Tab Title Flashing**: Browser tab title flashes with notification icon and "New update" message
- **Toast Notifications**: Slide-in toast messages (max 5 visible) with table and title information
- Configurable per-use-case (sound, toast, tabFlash can be individually toggled)

#### 9.8.3 Silent Mode

- `SILENT` constant provides no-sound/no-toast/no-flash option for specific scenarios
- Used in Client Request Tracker for non-intrusive assignment updates

### 9.9 Service Layer Enhancements

#### 9.9.1 Admin Request Service ([`adminRequestService.js`](src/services/adminRequestService.js))

- `fetchAllRequests()`: Comprehensive request fetching with related data (client types, entities, requesters)
- `forwardRequest()`: Section-based forwarding with notification triggers
- `declineRequest()`: Request rejection with mandatory reason and client notification
- `approveRequest()`: Multi-step approval workflow that:
  - Updates request status to "Approved"
  - Flips all associated assignments to "Approved" status
  - Notifies both client and assigned staff members

#### 9.9.2 Coverage Request Service ([`coverageRequestService.js`](src/services/coverageRequestService.js))

- `submitCoverageRequest()`: Handles file uploads with timestamp-based naming
- `fetchMyRequests()`: Retrieves client requests with coverage assignments and staffer details
- `updateDraftRequest()`: Supports draft editing and direct submission
- `deleteDraftRequest()`: Allows deletion of draft requests
- `cancelRequest()`: Client-initiated cancellation with multi-party notifications
- `rescheduleRequest()`: Client-initiated rescheduling with audit trail and reassignment workflow
- `getFileUrl()`: Helper function for retrieving public URLs from Supabase Storage
- RPC integration for "Others" entity handling via `upsert_client_entity`

#### 9.9.3 Notification Service ([`NotificationService.js`](src/services/NotificationService.js))

- `notifyAdmins()`: Alerts all active administrators
- `notifyClient()`: Informs requesters of status changes
- `notifySecHeads()`: Notifies section heads when requests are forwarded
- `notifyAssignedStaff()`: Alerts staff of new coverage assignments
- `notifySpecificStaff()`: Notifies specific staff members by ID array (for targeted notifications like cancellations)
- Comprehensive type-based notification categorization with request_id tracking

### 9.10 Real-time Synchronization Improvements

#### 9.10.1 useRealtimeSync Hook

- Subscribes to Supabase Realtime channels for `coverage_requests` and `coverage_assignments`
- Callback-based change detection with configurable filters
- Automatic re-fetch on database changes

#### 9.10.2 useRealtimeNotify Hook

- Enhanced real-time capabilities with automatic toast notifications
- Sound, toast, and tab flash configuration per use case
- Shared audio context for performance optimization

### 9.11 PDF Generation Enhancements

The [`generateConfirmationPDF.js`](src/utils/generateConfirmationPDF.js) utility provides:

- Professional confirmation documents for approved requests
- Event details including date, time, venue
- Client information and contact details
- Service requirements summary
- Confirmation status and timestamps

### 9.12 Custom DataGrid Column Menu Styling

All data grids throughout the application feature consistent custom-styled column menus:

- 10px border radius with subtle shadows
- Light/dark mode adaptive backgrounds
- Gold hover accent colors (#F5C52B)
- DM Sans typography throughout
- Smooth transition animations
- Icon color coordination

### 9.13 Brand Token Standardization

The system implements consistent design tokens across all components:

- **Primary**: Gold (#F5C52B) with rgba variants (8%, 18%)
- **Secondary**: Charcoal (#353535)
- **Borders**: Subtle rgba borders with dark mode variants
- **Typography**: DM Sans font family
- **Status Colors**: Distinct color schemes for each workflow status

### 9.14 Client Request Tracker Enhancements (v2.1)

- **Section Color Coding**: Visual indicators for News (blue), Photojournalism (purple), Videojournalism (green)
- **Friendly Status Mapping**: User-friendly status labels ("Under Review", "Staff Assigned")
- **File Handling**: Integrated file preview and download from Supabase Storage
- **Confirmation PDF**: Direct download of approved request confirmations
- **Staff Avatar Display**: Shows assigned staffer information with avatars
- **Request Cancellation**: In-dialog cancellation with confirmation dialog and optional reason
- **Request Rescheduling**: Date change capability with validation, conflict detection, and reassignment workflow

### 9.15 Regular Staff My Assignment Enhancements (v2.2)

#### 9.15.1 Smart Time In System

- Opens 10 minutes before event start time
- Three states: "early", "open", "passed"
- Weekend detection with visual badges

#### 9.15.2 GPS & Selfie Verification

- **GPS Location**: Uses Haversine formula for 400m radius verification around CSU Main Campus
- **Hard Block**: Prevents check-in if staff is outside campus premises
- **Soft Warning**: Allows check-in without GPS but flags for admin review
- **Selfie Capture**: Front camera with baked-in timestamp overlay

#### 9.15.3 Database Enhancements

- `selfie_url`: Stores login proof in Supabase Storage
- `gps_lat`, `gps_lng`: Records geographic coordinates
- `gps_verified`: Boolean flag for verification status
- `timed_in_at`, `completed_at`: Timestamp tracking
- `is_reassigned`: Emergency coverage scenario support

### 9.16 Section Head Assignment Management Enhancements (v2.1)

- **Three-Tab Interface**: For Assignment, Assigned, History
- **Duty Schedule Integration**: Filters eligible staffers by their duty day
- **Workload Balancing**: Assignment count display per staffer
- **Weekend Detection**: Visual badges for weekend events
- **Real-time Updates**: Live subscription to assignment changes

### 9.17 Admin Request Details - Multi-Day Event Support (v2.2)

- **Multi-Day Event Display**: Enhanced RequestDetails component displays events spanning multiple days with individual day schedules
- **Date/Time Formatting**: Added `fmtTime()` and `fmtDate()` helper functions for consistent time display (12-hour format with AM/PM)
- **Event Duration Badge**: Visual indicator showing "X-day event" for multi-day requests
- **Day-by-Day Schedule**: Each day of a multi-day event displays its own date and time range
- **Multi-Day Aware UI**: The admin request details view adapts to show either single date/time or multiple day schedules based on `is_multiday` flag

### 9.18 Client Request Form - Multi-Day Event Creation

- **Multi-Day Toggle**: Clients can specify whether their event spans multiple days
- **Dynamic Day Scheduling**: When multi-day is selected, clients can add individual day schedules with specific dates and time ranges
- **Service Layer Integration**: The `coverageRequestService.js` handles multi-day payloads with `buildDatePayload()` function
- **Database Schema**: Stores `is_multiday` boolean, `event_days` array, and `end_date` for multi-day event metadata

### 9.19 Enhanced Staff Onboarding with Automated Welcome Emails (v2.3)

#### 9.19.1 Automated Welcome Email System

The create-staff-account Edge Function now includes a comprehensive sendWelcomeEmail function that delivers branded HTML emails to new staff members when their accounts are created. The email includes:

- **Branded Header**: TGP Core Schemas logo and tagline
- **Personalized Greeting**: Uses the staff member's first name
- **Credentials Display**: Shows their email and password in a secure-styled box
- **Login CTA**: Direct link to the login page
- **Security Notice**: Warning to change password after first login
- **Professional Footer**: System branding and contact information

**Email Provider**: Uses Resend API for reliable email delivery
**Fallback Handling**: Gracefully skips email if RESEND_API_KEY is not configured
**Error Logging**: Detailed logging for debugging failed deliveries

#### 9.19.2 Enhanced Staff Profile Fields

Staff profiles now support two additional metadata fields:

- **position**: Job title or role within the section (e.g., Senior Photographer, Junior Writer)
- **designation**: Specific assignment or specialization (e.g., Sports, Events, News)

These fields are captured during account creation and editable via the StaffersManagement interface, enabling more granular staff categorization and assignment matching.

#### 9.19.3 Automatic Email Confirmation

The account creation process now sets email_confirm to true, bypassing Supabase confirmation email flow. New staff can log in immediately using the credentials sent via the welcome email, improving the onboarding experience.

#### 9.19.4 Enhanced AdminRequestService

The fetchAllRequests function now includes avatar_url in the profile data for forwarded_by, approved_by, and declined_by users, enabling avatar display throughout the request management interface. The profiles query selects id, full_name, section, and avatar_url fields for efficient data retrieval.

### 9.20 Client-Initiated Request Cancellation

Clients can now cancel their own requests at any stage before completion through the Request Tracker interface:

#### Cancellation Flow

- **Cancellable Statuses**: Pending, Forwarded, Assigned, For Approval, Approved, On Going
- **Cancellation Dialog**: Confirmation dialog with optional reason field
- **Soft-Cancel Assignments**: Active assignments are marked as "Cancelled" rather than deleted

#### Multi-Party Notifications

The cancellation triggers notifications to all relevant stakeholders:

- **Admins**: Always notified of request cancellations
- **Section Heads**: Notified when request was forwarded or beyond
- **Assigned Staff**: Notified when staff were already assigned (Approved or On Going status)

#### Database Updates

- `status` → "Cancelled"
- `cancelled_at`: Timestamp of cancellation
- `cancelled_by`: Client user ID
- `cancellation_reason`: Optional reason text
- Assignment records receive `cancelled_at`, `cancellation_reason`, and status update

### 9.21 Client-Initiated Request Rescheduling

Clients can reschedule their requests when coverage has already been assigned:

#### Rescheduling Flow

- **Reschedulable Statuses**: Forwarded, Assigned, For Approval, Approved, On Going
- **Date Validation**: Checks that new date is not same-day or past (minimum 2-day lead time)
- **Conflict Detection**: Validates no scheduling conflicts exist on the new date
- **Status Reset**: Request status resets to "Forwarded" requiring staff reassignment

#### Audit Trail

Previous event dates are preserved for historical reference:

- `previous_event_date`: Original event date
- `previous_from_time`: Original start time
- `previous_to_time`: Original end time
- `previous_event_days`: Original multi-day schedule
- `reschedule_requested_at`: Timestamp of reschedule request
- `reschedule_reason`: Optional reason text
- `rescheduled_at`: Final reschedule timestamp
- `rescheduled_by`: Client user ID

#### Notification Workflow

- **Section Heads**: Alerted to reassign staff for the new date
- **Previously Assigned Staff**: Notified that their assignment was cancelled
- **Admins**: Informed of the reschedule with status reset confirmation

### 9.22 Enhanced Request Assistant for Reschedule Validation

The [`RequestAssistant`](src/hooks/RequestAssistant.js:1) hook now includes standalone functions for validating reschedule requests:

#### `checkConflictForDate(eventDate, excludeId)`

Checks for scheduling conflicts on a specific date:

- Queries for Approved, Ongoing, or Forwarded requests on the target date
- Returns conflict details with titles, times, and statuses
- Excludes the current request from conflict detection
- Used during the reschedule flow to validate new dates

#### `checkLateSubmissionForDate(eventDate)`

Validates that a new event date meets minimum lead time:

- Same-day or past dates return error
- Less than 2 days from today returns warning
- Returns success with days count for valid dates
- Ensures requests maintain the 2-day minimum lead time requirement

#### Integration with Reschedule Flow

These functions are used by the Request Tracker's reschedule dialog to:

1. Validate the new date is not too soon
2. Check for scheduling conflicts on the proposed date
3. Present warnings before allowing submission
4. Provide clear feedback on why validation failed

### 9.23 Duty Schedule Change Request System (v2.4)

Staff members can now request changes to their duty day assignments through a formal request workflow:

#### Database Schema

The [`duty_schedule_change_requests`](supabase/migrations/008_create_duty_schedule_change_requests.sql) table stores:

- `staffer_id`: Reference to the staff member's profile
- `semester_id`: Reference to the active semester
- `current_duty_day`: The staff member's current assigned day (0-4, Monday-Friday)
- `requested_duty_day`: The requested duty day (0-4, Monday-Friday)
- `request_reason`: Optional reason for the change request
- `status`: Request status (pending, approved, rejected, cancelled)
- `review_notes`: Admin notes when reviewing the request
- `reviewed_at`: Timestamp of admin review
- `reviewed_by`: Admin who reviewed the request

#### Quota System

The [`useDutyChangeRequestQuota`](src/hooks/useDutyChangeRequestQuota.js:1) hook enforces a quota system:

- **Maximum 3 requests per semester**: Each staff member can have up to 3 approved duty day changes per semester
- **Quota tracking**: The hook fetches and counts only APPROVED requests (rejected/pending don't consume quota)
- **Exhaustion handling**: When quota is exhausted, staff cannot submit new requests

#### Regular Staff Interface

The MySchedule page now includes duty day change request functionality:

- **Current Schedule Display**: Shows assigned duty day with weekend detection
- **Pending Request Status**: Displays any pending change requests
- **Request Submission**: Staff can request a new duty day with optional reason
- **Quota Display**: Shows remaining requests (X of 3 used)
- **Real-time Updates**: Notifications when requests are approved/rejected

#### Admin Management Interface

The Admin DutyScheduleView includes change request management:

- **Request Queue Tab**: View all pending change requests
- **Request Details**: View staffer info, current/requested day, and reason
- **Approval Workflow**: Approve or reject with optional review notes
- **History Tab**: View approved/rejected/cancelled requests
- **Conflict Detection**: Prevents duplicate pending requests per staff per semester

#### Workflow Notifications

Notifications are sent to relevant parties:

- **Admins**: Notified when new change requests are submitted
- **Staff**: Notified when their request is approved or rejected

#### Security and Access Control

RLS policies ensure proper access:

- **Read Access**: Staff can read their own requests; Admins can read all
- **Insert Access**: Staff can only insert their own pending requests
- **Update Access**: Only admins can update (approve/reject) requests

### 9.24 Brand Identity and Layout Standardization (v2.4)

#### 9.24.1 New Brand Assets

The system received a complete brand identity refresh with new logo assets:

- **Primary Logo**: `cs-logo.png` - Main institutional logo
- **Fallback SVG**: `cs-logo.svg` - Scalable vector alternative
- **Favicon**: `favicon.svg` - Browser tab icon
- Legacy `tgp.png` logo was removed as part of the refresh

#### 9.24.2 Layout Tokens ([`layoutTokens.js`](src/utils/layoutTokens.js:1))

A new shared utility provides consistent layout spacing and sizing across all pages:

- **Page Padding**: Compact (1.5/2/2.5) and Standard (2/3) variants for responsive spacing
- **Content Width**: Max width of 1240px with 0.5/1rem inner gutters
- **Control Rhythm**: Shared tokens for filter/toolbar consistency:
  - `CONTROL_RADIUS`: 10px border radius
  - `FILTER_INPUT_HEIGHT`: 38px
  - `FILTER_BUTTON_HEIGHT`: 38px
  - `FILTER_ROW_GAP`: 1rem
  - `FILTER_GROUP_GAP`: 0.75rem

#### 9.24.3 NumberBadge Component ([`NumberBadge.jsx`](src/components/common/NumberBadge.jsx:1))

A reusable circular badge component for displaying counts:

- Configurable size (default 15px), active/inactive backgrounds
- Gold (#F5C52B) for active states, charcoal gray for inactive
- Used throughout the system for notification counts, tab badges, and statistics

#### 9.24.4 Loading Components

- **BrandedLoader** ([`BrandedLoader.jsx`](src/components/common/BrandedLoader.jsx:1)): Reusable branded loading spinner
- **StartupLoader** ([`StartupLoader.jsx`](src/components/common/StartupLoader.jsx:1)): Initial app loading screen with logo

#### 9.24.5 Layout Enhancements

All four role-based layouts received consistent updates:

- **AdminLayout**: New branding; Coverage Tracker is a collapsible group with "Requests" and "Time Record" child routes; Scheduling group contains Semester Management and Duty Schedule
- **ClientLayout**: Updated navigation with client-specific items
- **RegularStaffLayout**: Staff-focused navigation and branding
- **SectionHeadLayout**: Coverage Management is a collapsible group with four child routes: Assignment, Tracker, Time Record, and Reassignment History

### 9.25 Enhanced Semester Management with Scheduling Control (v2.4)

The [`SemesterManagement`](src/pages/admin/SemesterManagement.jsx:1) component received major UI enhancements:

#### Scheduling Open/Close Toggle

- New `scheduling_open` boolean field on semesters
- Controls when staffers can pick/modify their duty days
- Visual lock/unlock icon indicators (LockOpenOutlinedIcon / LockOutlinedIcon)
- Blue styling (#1d4ed8) for "Open" state
- Toggled via row action menu

#### Enhanced UI

- Active semester banner with pulsing gold indicator
- Scheduling status displayed inline in both banner and table
- Row actions menu with Edit and Scheduling toggle options
- Full CRUD dialog with scheduling toggle switch
- Dark mode adaptive column menu styling

#### Confirmation Dialogs

- Toggle confirmation dialogs for both scheduling and active status changes
- Descriptive explanations of what each action does
- Loading states during apply operations

### 9.26 Database Schema Enhancements

#### Per-Day Slot Capacities

Migration `007_add_duty_slot_fields_to_semesters.sql` added per-day slot capacity fields:

- `monday_slots` through `friday_slots` (integer, default 10)
- Constraints ensuring non-negative values
- Controls maximum number of staffers allowed on duty per day

#### Profile Soft Delete Support

Migration `011_add_trashed_at_to_profiles.sql` added:

- `trashed_at`: Timestamp for soft-delete functionality
- Enables future trash/restore features for staff profiles

### 9.27 Duty Schedule View - Day Slot Capacities and Requests Management (v2.4)

The [`DutyScheduleView`](src/pages/admin/DutyScheduleView.jsx:1) component received major enhancements:

#### Per-Day Slot Capacity Management

- **Slot Summary Cards**: Each weekday (Monday-Friday) displays current staffing count vs. capacity
- **Inline Edit**: Click the edit icon on any day card to adjust its slot capacity
- **Progress Visualization**: Visual progress bars show capacity usage with over-capacity warnings
- **Dynamic Capacity Display**: Capacities stored per-semester (monday_slots through friday_slots fields)

#### Requests Tab Integration

- **Tabbed Interface**: "Schedule" tab for duty roster, "Requests" tab for change requests
- **Badge Notification**: Pending request count displayed on the Requests tab
- **Search & Filter**: Full-text search across staffer names, sections, and reasons
- **Status Filtering**: Filter by Pending, Approved, or Declined requests
- **Fullscreen Mode**: Toggle fullscreen for better data visibility
- **CSV Export**: Export both schedule and requests data

#### Approval Workflow Enhancements

- **Scheduling Lock**: When `scheduling_open` is false, approvals are blocked with visual indicator
- **Quota Tracking**: Each staffer's used quota displayed (X/3 approved changes per semester)
- **Conflict Detection**: Prevents approval if staffer has active assignments on current duty day
- **Capacity Validation**: Rejects if target day would exceed slot capacity

#### Real-time Updates

- Subscriptions to both `duty_schedules` and `duty_schedule_change_requests` tables
- Toast notifications for schedule changes
- Auto-refresh on external modifications

### 9.28 Advanced Duty Schedule Governance (v2.5)

The [`DutyScheduleView`](src/pages/admin/DutyScheduleView.jsx:1) component received comprehensive governance and operations features:

#### Blackout Dates Management

- **Operations Panel**: Settings drawer with dedicated blackout dates section
- **Date Input**: Add dates when no duty operations should occur
- **Reason Tracking**: Optional reason for each blackout date
- **Removable Tags**: Visual tag display with remove functionality
- **Persistence**: Stored in `duty_schedule_blackout_dates` table per semester

#### Roster Publishing System

- **Versioned Snapshots**: Create permanent records of duty roster state
- **Publishing Workflow**: Confirm dialog with roster summary and CSV export option
- **Publication History**: View all past published rosters with version numbers
- **Snapshot Viewer**: Dialog showing published roster by day with section/duty day grouping
- **Selection Management**: Switch between different published versions
- **CSV Export**: Export any published snapshot to CSV
- **Storage**: Published rosters stored in `duty_schedule_publications` table with:
  - `version`: Sequential version number
  - `published_at`: Timestamp
  - `published_by`: Admin who published
  - `snapshot`: JSON array of staffer records

#### Audit Trail System

- **Complete Activity Log**: All duty schedule actions tracked
- **Action Types**: duty_change_approved, duty_change_rejected, duty_blackout_date_added, duty_blackout_date_removed, duty_roster_published
- **Search & Filter**: Full-text search across actor, target, action, and reasons
- **CSV Export**: Export audit logs for external analysis
- **Storage**: Logs stored in `duty_schedule_audit_logs` table with:
  - `actor_id`: Admin who performed action
  - `target_staffer_id`: Affected staff member
  - `request_id`: Related change request
  - `action_type`: Type of action
  - `metadata`: JSON with additional context (from_day, to_day, reason, etc.)
  - `created_at`: Timestamp

#### Settings Drawer

- **Three-Tab Interface**: Operations, Governance, Audit Trail
- **Operations Panel**: Blackout dates management
- **Governance Panel**: Publishing controls, publication history, version selection
- **Audit Panel**: Searchable audit log with export

#### Division Composition Tracking

- **Team Balance Visualization**: Display Scribes vs Creatives count per day
- **Projected Composition**: Shows how composition changes after requested duty day
- **Balance Policy Enforcement**: Prevents changes that would leave a day without both divisions
- **Visual Indicators**: Blue for Scribes (#3b82f6), Orange for Creatives (#f97316)

#### Scheduling Reopen Feature

- **Admin Control**: Re-enable scheduling when closed
- **Visual Indicator**: "SCHEDULING CLOSED" warning banner with reopen link
- **Blocking Logic**: Request approvals blocked when scheduling is closed
- **Still Allows Declines**: Admins can still decline requests when closed

#### Enhanced Day Slot Cards

- **Progress Visualization**: Visual progress bars with color-coded capacity
- **Over-Capacity Warnings**: Red "Over" badge when staffing exceeds capacity
- **Hover Actions**: Edit icon appears on hover for capacity adjustment
- **Click Filtering**: Click day cards to filter the duty roster table

#### CSV Export Capabilities

- **Schedule Export**: Full duty roster export
- **Requests Export**: Duty change requests with status
- **Audit Export**: Complete audit trail
- **Snapshot Export**: Published roster versions

### 9.29 Section Head Interface Restructuring (v2.5)

The Section Head module received a complete architectural overhaul with new page structure and shared base component:

#### New Page Architecture

The section head navigation now uses a modular component structure:

- **CoverageAssignmentPage** ([`CoverageAssignmentPage.jsx`](src/pages/section_head/CoverageAssignmentPage.jsx:1)): Manages staff assignments with views for "All", "For Assignment", "For Approval", and "Assigned" statuses
- **CoverageTrackerPage** ([`CoverageTrackerPage.jsx`](src/pages/section_head/CoverageTrackerPage.jsx:1)): Tracks ongoing and completed coverage with "All", "On Going", and "Completed" views
- **CoverageTimeRecordPage** ([`CoverageTimeRecordPage.jsx`](src/pages/section_head/CoverageTimeRecordPage.jsx:1)): Comprehensive time record management with filtering, search, and CSV export capabilities
- **ReassignmentHistoryPage** ([`ReassignmentHistoryPage.jsx`](src/pages/section_head/ReassignmentHistoryPage.jsx:1)): Dedicated view for tracking announced emergencies and no-show incidents with replacement details (see §9.34)

#### CoverageManagementBase Component

A new shared base component ([`CoverageManagementBase.jsx`](src/pages/section_head/CoverageManagementBase.jsx:1)) provides:

- **Configurable Views**: Page-specific view definitions with customizable tabs and filtering
- **DataGrid Integration**: Full-featured data tables with sorting, filtering, and pagination
- **Real-time Updates**: Live subscription to coverage_requests and coverage_assignments tables
- **Assignment Workflow**: Complete assignment creation, editing, and submission workflow
- **Coverage Completion**: Staff can mark assignments as complete with dialog confirmation
- **View Details**: Drawer-based detail view for examining individual requests
- **Export Functionality**: CSV export with customizable filename
- **Archive/Trash Management**: Integration with role-based archive and trash systems
- **Unified Styling**: Consistent use of layout tokens (TABLE_USER_AVATAR_SIZE, TABLE_USER_AVATAR_FONT_SIZE)

#### Layout Token Integration

All section head pages now import and utilize shared layout tokens from [`layoutTokens.js`](src/utils/layoutTokens.js:1):

- FILTER_SEARCH_MIN_WIDTH, FILTER_ROW_GAP, FILTER_INPUT_HEIGHT
- TABLE_USER_AVATAR_SIZE, TABLE_USER_AVATAR_FONT_SIZE

#### Deprecation

The legacy **SecheadAssignmentManagement.jsx** component has been removed and replaced by the new modular architecture.

### 9.30 Regular Staff My Schedule Enhancements (v2.6)

The MySchedule page received comprehensive UI enhancements for duty day management with improved visualization and interaction:

#### Staffer Avatar Display System

- **Color-Coded Avatar Swatches**: 8 distinct color combinations randomly assigned to staffers for visual differentiation
- **Initials Generation**: Automatic extraction of first letters from first and last names
- **Avatar with Fallback**: Uses uploaded avatar_url or generates initials-based fallback
- **Co-Staffer Visibility**: Staff can view other team members on the same duty day

#### Capacity Visualization

- **Progress Bar Display**: Each day shows a visual progress bar indicating slot usage (count/capacity)
- **Color-Coded Full States**: Red (#ef4444) when full, Gold (#F5C52B) when available
- **Percentage Calculation**: Automatic calculation of utilization percentage
- **Full Badge**: "Full" indicator appears when a day reaches capacity

#### Staffer List Popover

- **Click-to-View**: Click on the staffer avatars group to open a detailed popover
- **Full Roster Display**: Shows all staffers assigned to the selected day
- **Section Information**: Displays each staffer's section (News, Photo, Video)
- **Co-Staffer Filtering**: When viewing own day, excludes self from the list

#### Enhanced Day Selection Grid

- **Visual Selection States**: Gold border for pending selection, green border for current assignment
- **Disabled States**: Proper opacity reduction for unavailable days
- **My Day Badge**: "Your day" indicator for assigned duty day
- **Pending Badge**: "Pending" indicator for requested changes

#### First-Time Setup Flow

- **Dedicated Welcome Card**: Special UI card explaining first-time duty day setup
- **Step-by-Step Instructions**: Clear numbered guidance (Choose → Check → Confirm)
- **Notice About Approval**: Explains that changes after setup require admin approval
- **No Existing Schedule Detection**: Automatically detects new staff without assignments

#### Confirmation Dialog

- **Change Confirmation Dialog**: Modal dialog for confirming duty day changes
- **Load Display**: Shows current count/capacity for target day
- **Reason Input**: Multi-line text field for providing change reason
- **Validation**: Prevents submission without reason text
- **Loading State**: Circular progress indicator during submission

### 9.31 Emergency Announcement System (v2.6)

The system received a comprehensive emergency announcement system enabling staff to proactively declare unavailability for their assigned coverage:

#### AnnounceEmergencyDialog Component ([`AnnounceEmergencyDialog.jsx`](src/components/regular_staff/AnnounceEmergencyDialog.jsx:1))

A new dialog component for staff to announce emergencies in advance:

- **Reason Input**: Multi-line text field for providing detailed reason for unavailability
- **Proof Upload**: Mandatory file attachment supporting images and PDFs (max 10MB)
- **File Validation**: Client-side validation for file type (image/pdf) and size
- **Loading States**: Progress indicator during submission
- **Error Handling**: Clear validation messages for reason and proof requirements
- **Form Reset**: Automatic cleanup when dialog closes

#### useAnnounceEmergency Hook ([`useAnnounceEmergency.jsx`](src/hooks/useAnnounceEmergency.jsx:1))

Centralized logic for emergency announcements:

- **Proof Upload**: Handles image/PDF upload to Supabase Storage (`emergency-proof` bucket)
- **Assignment Update**: Updates assignment status to "Cancelled" with cancellation reason
- **Notification System**:
  - Notifies section head immediately upon announcement
  - Notifies admins about the emergency
  - Triggers reassignment workflow for section head
- **Error Handling**: Comprehensive error handling with user feedback

#### Emergency Reassignment Workflow

The [`ReassignmentService.js`](src/services/ReassignmentService.js:1) was enhanced to support announced emergencies:

- **Trigger Types**: Distinguishes between "announced-emergency" and "unannounced-no-show"
- **Status Preservation**: Maintains emergency announcement with proof attachment
- **Cancellation Recording**: Stores cancellation reason with embedded proof path
- **Proof Path Extraction**: Utility functions to extract and display proof from cancellation reasons

#### Regular Staff Integration ([`MyAssignment.jsx`](src/pages/regular_staff/MyAssignment.jsx:1))

The My Assignment page now includes emergency announcement capability:

- **Action Button**: "Announce Emergency" button appears on assignment cards
- **Dialog Integration**: Opens AnnounceEmergencyDialog with assignment context
- **Status Aware**: Only visible when assignment is in "Approved" or "On Going" status
- **Toast Feedback**: Success/error notifications after announcement

#### Section Head Integration ([`CoverageManagementBase.jsx`](src/pages/section_head/CoverageManagementBase.jsx:1))

Enhanced to handle emergency reassignments:

- **Emergency Detection**: Identifies assignments with emergency cancellation status
- **Reassignment Types**: Visual differentiation between "emergency" and "no-show" candidates
- **Status Indicators**:
  - Red indicator for announced emergencies
  - Amber indicator for unannounced no-shows
- **Reassign Action**: "Reassign" button appears for emergency-affected assignments
- **Notification Handling**: Proper notification delivery for emergency reassignments

#### Request Tracker Enhancements ([`RequestTracker.jsx`](src/pages/client/RequestTracker.jsx:1))

Client-side improvements:

- **Status Display**: Better visualization of cancelled assignments
- **Staff Availability**: Shows "Not yet" when assigned staff hasn't timed in
- **Detail View**: Enhanced completion details with staff timing information

### 9.32 Coverage Completion Details Enhancement

The completion details viewing experience was improved:

- **Section Head View** ([`CoverageManagementBase.jsx`](src/pages/section_head/CoverageManagementBase.jsx:1)):
  - "View Details" action available in completed view
  - CoverageCompletionDialog displays full assignment details
  - Staff timing information (time in, completion, duration)
  - Selfie proof display from Supabase Storage

- **Admin Coverage Tracker** ([`CoverageTracker.jsx`](src/pages/admin/CoverageTracker.jsx:1)):
  - Enhanced completion details viewing
  - Improved staff information display
  - Duration calculation and display

### 9.33 PDF Confirmation Improvements ([`generateConfirmationPDF.js`](src/utils/generateConfirmationPDF.js:1))

The PDF confirmation generator received minor refinements:

- Better handling of null/undefined values
- Improved date formatting consistency
- Enhanced error handling for missing data

### 9.34 Reassignment History Page — Section Head (v2.7)

A new standalone page ([`ReassignmentHistoryPage.jsx`](src/pages/section_head/ReassignmentHistoryPage.jsx:1)) gives section heads a dedicated view of all emergency and no-show assignment incidents within their section:

#### Navigation

`SectionHeadLayout` now exposes "Reassignment History" as a fourth child item under the collapsible **Coverage Management** group (alongside Assignment, Tracker, and Time Record), routing to `reassignment-history`.

#### Type Segmentation

Two toggle tabs filter the incident type:

- **Announced Emergency**: Assignments cancelled where the staffer proactively announced an emergency (detected by `"emergency"` keyword in `cancellation_reason`)
- **No Show**: Cancelled or No Show assignments where no emergency was announced

#### Data Displayed (DataGrid)

| Column               | Description                                                                                              |
| -------------------- | -------------------------------------------------------------------------------------------------------- |
| Title                | Request title with quick-navigate arrow to the assignment page                                           |
| Date Occurred        | `assignment_date` of the original cancelled assignment                                                   |
| Reason               | Extracted emergency reason text (strips proof path suffix)                                               |
| Proof                | Clickable file icon linking to the emergency proof stored in Supabase Storage (`emergency-proof` bucket) |
| Reassigned To        | Full name(s) of replacement staffer(s) matched by `is_reassigned=true` on same day/service key           |
| Date of Reassignment | `created_at` of the replacement assignment record                                                        |

#### Filtering

- **Semester filter**: Scopes data to a selected academic semester (defaults to active semester) by filtering `assignment_date` within semester date range
- **Result count**: Live count badge showing number of matching events

#### Data Logic

- Fetches `coverage_assignments` with status `Cancelled` or `No Show` for the section head's section
- Separately fetches replacement assignments (`is_reassigned=true`) and joins them per day/service key
- Proof path is extracted from a structured `cancellation_reason` string using regex pattern `(Proof: <path>)`

### 9.35 Admin Coverage Tracker — Requests & Time Record Split (v2.7)

The Admin `CoverageTracker` module is now surfaced through two distinct sub-routes under a collapsible **Coverage Tracker** group in `AdminLayout`:

- **Requests** → `coverage-tracker/requests`: The main coverage tracking DataGrid (All, On Going, Completed filter tabs) with per-request assignment details and completion dialogs
- **Time Record** → `coverage-tracker/time-record`: Dedicated time record view for admin-level inspection of staffer time-in/time-out data across all sections

Previously the Coverage Tracker was accessed as a single flat route. The collapsible group pattern (matching the Scheduling group) keeps the sidebar organized as admin features grow.

### 9.36 Admin Coverage Completion Dialog ([`AdminCoverageCompletionDialog.jsx`](src/components/admin/AdminCoverageCompletionDialog.jsx:1))

A new reusable dialog component for administrators to inspect the completion details of a coverage request:

#### Features

- **Section-Grouped Assignment Cards**: Assignments are fetched fresh from `coverage_assignments` and grouped by section (News, Photojournalism, Videojournalism)
- **Staffer Identity**: Avatar display with deterministic color palette (8 distinct color pairs), initials fallback, and full name
- **Timing Summary**: Displays time-in (`timed_in_at`), completion time (`completed_at`), and computed duration (e.g., `2h 30m`)
- **Selfie Proof with Collapsible Viewer**: Clicking the chevron expands an inline selfie image fetched from Supabase Storage (`login-proof` bucket); broken image fallback handled gracefully
- **Status Badges**: Visual status pills per assignment
- **Maximized Layout Support**: Accepts a `maximized` prop to adapt the dialog layout for fullscreen contexts
- **Loading & Empty States**: Spinner during data fetch, empty state message when no assignments exist

#### Usage

Used by the admin `CoverageTracker` to view completion records for finished requests, and referenced in `CoverageRequestDetailsPage` for in-page detail inspection.

### 9.37 Admin Rectifications Log (v2.8)

A dedicated full-page DataGrid ([`RectificationsLog.jsx`](src/pages/admin/RectificationsLog.jsx:1)) gives administrators a system-wide view of all submitted rectification requests across every section:

#### Navigation

`AdminLayout` now exposes **Rectifications Log** as a third child route under the collapsible **Coverage Tracker** group, alongside Requests and Time Record. The nav item includes a live count badge using the same `#F5C52B` / `#212121` gold-on-dark scheme.

#### Columns

| Column      | Description                                                         |
| ----------- | ------------------------------------------------------------------- |
| Assignment  | Request title with quick-navigate arrow (`_nav`, width 48)          |
| Staff       | Staff member's full name with avatar and navigate arrow             |
| Submitted   | `created_at` of the rectification request                           |
| Reviewed By | Full name of the admin reviewer (or "—")                            |
| Proof       | Clickable file icon linking to uploaded proof (width 80, icon only) |
| Status      | Pill badge: pending (gold), approved (green), rejected (red)        |

#### Toolbar

- **Search**: Full-text search across staff name, assignment title, reason
- **Status Filter**: Dropdown to filter by Pending / Approved / Rejected / All
- **CSV Export**: Exports all visible rows

#### Data Source

Queries `rectification_requests` with joins to `coverage_requests!request_id(title)` and `staff:profiles!staff_id(full_name, avatar_url)` and `reviewer:profiles!reviewed_by(full_name)`.

### 9.38 DataGrid Navigation Standardization — `_nav` Columns (v2.8)

All data grids that link to a detail page now use a standardized invisible arrow column (`_nav`) rather than inline buttons or row click handlers:

- **Column spec**: `field: "_nav"`, `width: 48`, `sortable: false`, `disableColumnMenu: true`, no `headerName`
- **Cell renderer**: `ArrowForwardOutlinedIcon` at `fontSize: 16` with `color: "text.disabled"`
- **Applied across**: CoverageTracker (admin), RectificationsLog (admin), CoverageManagementBase (section head), RectificationsPage (section head), and Request Management pages

This ensures users always know where to click to navigate while keeping the column narrowly sized and visually unobtrusive.

### 9.39 Avatar URL Centralization (v2.8)

Raw `avatar_url` column values (Supabase storage paths) are now always resolved through the shared `getAvatarUrl(path)` helper from [`UserAvatar.jsx`](src/components/common/UserAvatar.jsx:1) before being passed to `<Avatar>` components. This was audited and corrected across:

- `TimeoutPage` (admin)
- `MySchedule` (regular staff)
- `RectificationsLog` (admin)
- `RectificationsPage` (section head)

The helper fetches the public URL from the `coverage-files` bucket, ensuring consistent avatar resolution regardless of where in the app an avatar is displayed.

### 9.40 Coverage Tracker — Column & Navigation Enhancements (v2.8)

#### Admin Coverage Tracker

- **Section column removed** from the Tracker DataGrid; replaced with a dedicated `_nav_staff` arrow navigating to the assignment detail
- `staffer_id` added to row data to support navigation targets
- **AssignedByStack component**: A new inline avatar stack showing who assigned each coverage record, using `TABLE_USER_AVATAR_SIZE` and `TABLE_USER_AVATAR_FONT_SIZE` tokens

#### Section Head Coverage Tracker (CoverageManagementBase)

- Rectifications toolbar badge button **removed** from the Coverage Tracker toolbar — rectification access is now exclusively via the sidebar nav item
- Rectifications are accessible through the dedicated **Rectifications** child route in the Coverage Management collapsible group (fifth child: Assignment → Tracker → Time Record → Reassignment History → Rectifications)
- The `ChildNavItem` component gained a `trailing` prop (rendered after the label) to support the live count badge on the Rectifications nav item
- Badge styling: `#F5C52B` background, `#212121` text, `borderRadius: "9px"`

### 9.41 Admin Request Management — Per-Filter Column Enhancements (v2.8)

The Request Management DataGrid (`buildColumns` factory in the admin pages) now adapts its visible columns based on the active view filter:

| Filter       | Column Changes                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| **Pending**  | Event Date column is hidden (less relevant at this stage)                                               |
| **Assigned** | Adds **Assigned Staff Count** column showing how many staffers have been assigned                       |
| **Declined** | Adds **Decline Reason** column (truncated text) and a `_nav` arrow for navigating to the decline detail |

#### Implementation details

- `assignedCount` is computed per row by counting related `coverage_assignments` records
- `declinedReasonCol` renders a truncated reason string with an ellipsis tooltip
- `declinedNavCol` is a standard `_nav` width-48 arrow column

### 9.42 Regular Staff My Assignment — History Tabs (v2.8)

The Settings drawer (gear icon) on the My Assignment page expanded from 2 to 4 tabs:

| Tab                | Content                    |
| ------------------ | -------------------------- |
| 0 — Archive        | Existing archived requests |
| 1 — Trash          | Existing trashed requests  |
| 2 — Rectifications | New: `RectifHistoryTab`    |
| 3 — Emergencies    | New: `EmergencyHistoryTab` |

The tab container uses `flexWrap: "wrap"` to prevent overflow on narrow drawers.

#### RectifHistoryTab

- Queries `rectification_requests` filtered by `staff_id = currentUser.id`, joined with `coverage_requests!request_id(title)`
- Orders by `created_at desc`
- Renders a card list: assignment title, submitted date, status pill (pending=gold, approved=green, rejected=red)
- Shows gold `CircularProgress` while loading; empty state message when no records exist

#### EmergencyHistoryTab

- Queries `coverage_assignments` where `assigned_to = currentUser.id`, `status = 'Cancelled'`, and `cancellation_reason ilike 'Emergency%'`
- Orders by `cancelled_at desc`
- Parses the cancellation reason: strips the `"Emergency announced: "` prefix and `"(Proof: ...)"` suffix
- Renders cards with a red-tint style (`border: rgba(220,38,38,0.2)`, `background: #fef2f2` / dark variant)
- Shows assignment title, extracted reason, and date

### 9.43 Regular Staff My Schedule — Change Request History DataGrid (v2.8)

The MySchedule page now shows a full history of reviewed duty change requests below the calendar grid:

#### State and Data Changes

- Added `allReviewedRequests` state (array)
- Removed `.limit(1)` from the `reviewedRows` query — the page now fetches **all** reviewed requests (approved / rejected / cancelled), not just the most recent one
- `latestReviewedRequest` continues to drive the existing "latest result" banner; `allReviewedRequests` drives the new history grid

#### Change Request History Section

- Appears only when `allReviewedRequests.length > 0`
- Section heading: **"Change Request History"** (uppercase, `text.disabled`, `letterSpacing: 0.09em`)
- Uses the shared `<DataGrid>` component from `AppDataGrid`

#### Columns

| Column         | Description                                                      |
| -------------- | ---------------------------------------------------------------- |
| Requested Day  | Day name mapped via `DAY_LABELS[r.requested_duty_day]`           |
| Date Requested | `created_at` formatted as "Mon DD, YYYY"                         |
| Status         | Pill badge: Approved (green) · Declined (red) · Cancelled (grey) |

The grid uses `autoHeight`, `hideFooter`, and a `border`/`borderRadius` matching the page's existing card style.

---

## 10. Conclusion

The TGP Coverage Request Management System is a mature, feature-rich application that successfully digitizes and automates the complete lifecycle of media coverage requests. Its thoughtful role-based architecture ensures that each stakeholder—clients, administrators, section heads, and staff—interacts with a tailored interface that supports their specific responsibilities. The integration of real-time updates, notifications, document generation, and comprehensive reporting makes it a powerful tool for managing coverage operations at scale.

The system's foundation on Supabase provides scalability, security, and reliability, while the React/Material-UI frontend delivers a polished, accessible user experience. The recent enhancements have significantly improved the user experience with better visual feedback, workflow optimization, and intelligent staffing suggestions based on duty schedules.

This synthesis document captures the essential characteristics of the system and provides a reference for understanding its capabilities, architecture, and value proposition.  



