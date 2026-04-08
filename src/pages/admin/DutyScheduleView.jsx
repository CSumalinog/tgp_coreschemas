// src/pages/admin/DutyScheduleView.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  Dialog,
  IconButton,
  TextField,
  useTheme,
  FormControl,
  Select,
  MenuItem,
  OutlinedInput,
  InputAdornment,
} from "@mui/material";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { notifySpecificStaff } from "../../services/NotificationService";
import BrandedLoader from "../../components/common/BrandedLoader";
import NumberBadge from "../../components/common/NumberBadge";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import {
  CONTROL_RADIUS,
  FILTER_BUTTON_HEIGHT,
  FILTER_GROUP_GAP,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
} from "../../utils/layoutTokens";
import { useLocation } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseIcon from "@mui/icons-material/Close";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import FullscreenExitIcon from "@mui/icons-material/FullscreenExit";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

// ── Day config ────────────────────────────────────────────────────────────────
const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const SLOT_FIELDS = [
  "monday_slots",
  "tuesday_slots",
  "wednesday_slots",
  "thursday_slots",
  "friday_slots",
];

const ACTIVE_REQUEST_STATUSES = ["Assigned", "For Approval", "On Going"];

const getDutyDayFromDate = (dateStr) => {
  if (!dateStr) return null;
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  if (day === 0 || day === 6) return null;
  return day - 1;
};

const getUpcomingRequestDates = (request) => {
  if (!request) return [];
  if (request.is_multiday && Array.isArray(request.event_days)) {
    return request.event_days.map((entry) => entry?.date).filter(Boolean);
  }
  return request.event_date ? [request.event_date] : [];
};

const formatDateTime = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const DAY_CFG = [
  {
    bg: "#eff6ff",
    color: "#1d4ed8",
    dot: "#3b82f6",
    darkBg: "rgba(59,130,246,0.08)",
    darkColor: "#93c5fd",
  },
  {
    bg: "#f5f3ff",
    color: "#6d28d9",
    dot: "#8b5cf6",
    darkBg: "rgba(139,92,246,0.08)",
    darkColor: "#c4b5fd",
  },
  {
    bg: "#f0fdf4",
    color: "#15803d",
    dot: "#22c55e",
    darkBg: "rgba(34,197,94,0.08)",
    darkColor: "#86efac",
  },
  {
    bg: "#fff7ed",
    color: "#c2410c",
    dot: "#f97316",
    darkBg: "rgba(249,115,22,0.08)",
    darkColor: "#fdba74",
  },
  {
    bg: "#fdf2f8",
    color: "#9d174d",
    dot: "#ec4899",
    darkBg: "rgba(236,72,153,0.08)",
    darkColor: "#f9a8d4",
  },
];

const SECTION_CFG = {
  News: { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Photojournalism: { bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  Videojournalism: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
};

const COVERAGE_SECTIONS = ["News", "Photojournalism", "Videojournalism"];

const AVATAR_COLORS = [
  { bg: "#FFE9A8", color: "#2D2400" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#EAF3DE", color: "#27500A" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#FBEAF0", color: "#72243E" },
];

const ACTION_BTN_HEIGHT = FILTER_BUTTON_HEIGHT;
const REASON_PREVIEW_LIMIT = 88;

const REQUEST_STATUS_META = {
  pending: {
    label: "Pending",
    bg: "rgba(245,197,43,0.14)",
    color: "#9a6b00",
    border: "rgba(245,197,43,0.38)",
  },
  approved: {
    label: "Approved",
    bg: "rgba(34,197,94,0.12)",
    color: "#166534",
    border: "rgba(34,197,94,0.28)",
  },
  rejected: {
    label: "Declined",
    bg: "rgba(239,68,68,0.1)",
    color: "#b91c1c",
    border: "rgba(239,68,68,0.24)",
  },
};

const getSlotForm = (semester) => ({
  monday_slots: semester?.monday_slots ?? 10,
  tuesday_slots: semester?.tuesday_slots ?? 10,
  wednesday_slots: semester?.wednesday_slots ?? 10,
  thursday_slots: semester?.thursday_slots ?? 10,
  friday_slots: semester?.friday_slots ?? 10,
});

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getAvatarColor = (key) => {
  if (!key) return AVATAR_COLORS[0];
  const str = String(key);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const getRequestStatusMeta = (status) =>
  REQUEST_STATUS_META[status] || {
    label: status
      ? status.charAt(0).toUpperCase() + status.slice(1)
      : "Unknown",
    bg: "rgba(53,53,53,0.06)",
    color: "#525252",
    border: "rgba(53,53,53,0.12)",
  };

export default function DutyScheduleView() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;
  const location = useLocation();

  const [schedules, setSchedules] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [slotForm, setSlotForm] = useState(getSlotForm(null));
  const [slotSaving, setSlotSaving] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [slotDialogDayIndex, setSlotDialogDayIndex] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [requestActionId, setRequestActionId] = useState("");
  const [requestDetailsOpen, setRequestDetailsOpen] = useState(false);
  const [requestDetailsTarget, setRequestDetailsTarget] = useState(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState(null);
  const [requestSearchText, setRequestSearchText] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("All");
  const gridApiRef = useGridApiRef();
  const requestGridApiRef = useGridApiRef();

  const loadActiveSemester = useCallback(async () => {
    const { data, error: semesterError } = await supabase
      .from("semesters")
      .select("*")
      .eq("is_active", true)
      .single();

    if (semesterError && semesterError.code !== "PGRST116") {
      setError(semesterError.message);
      return;
    }

    setActiveSemester(data || null);
  }, []);

  useEffect(() => {
    loadActiveSemester();
  }, [loadActiveSemester]);

  useRealtimeNotify("semesters", loadActiveSemester, "is_active=eq.true", {
    title: "Duty Slots",
    sound: false,
  });

  const loadSchedules = useCallback(async () => {
    if (!activeSemester?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("duty_schedules")
      .select(
        `id, duty_day, created_at, staffer:staffer_id ( id, full_name, section, role, division, avatar_url )`,
      )
      .eq("semester_id", activeSemester.id)
      .order("duty_day", { ascending: true });
    if (fetchErr) setError(fetchErr.message);
    else setSchedules(data || []);
    setLoading(false);
  }, [activeSemester]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const loadPendingRequests = useCallback(async () => {
    if (!activeSemester?.id) {
      setPendingRequests([]);
      return;
    }

    const { data, error: fetchErr } = await supabase
      .from("duty_schedule_change_requests")
      .select(
        `id, staffer_id, current_duty_day, requested_duty_day, request_reason, status, created_at, reviewed_at, review_notes, staffer:staffer_id ( id, full_name, section, role, division, avatar_url )`,
      )
      .eq("semester_id", activeSemester.id)
      .in("status", ["pending", "approved", "rejected"])
      .order("created_at", { ascending: false });

    if (fetchErr) {
      setError(fetchErr.message);
      return;
    }

    setPendingRequests(data || []);
  }, [activeSemester]);

  useEffect(() => {
    loadPendingRequests();
  }, [loadPendingRequests]);

  useRealtimeNotify(
    "duty_schedules",
    loadSchedules,
    activeSemester?.id ? `semester_id=eq.${activeSemester.id}` : null,
    {
      title: "Duty Schedule",
      sound: false,
    },
  );

  useRealtimeNotify(
    "duty_schedule_change_requests",
    loadPendingRequests,
    activeSemester?.id ? `semester_id=eq.${activeSemester.id}` : null,
    {
      title: "Schedule Changes",
      sound: false,
    },
  );

  const filtered =
    sectionFilter === "All"
      ? schedules
      : schedules.filter((s) => s.staffer?.section === sectionFilter);
  const isSectionFiltered = sectionFilter !== "All";
  const pendingRequestCount = useMemo(
    () =>
      pendingRequests.filter((request) => request.status === "pending").length,
    [pendingRequests],
  );
  const canApprovePendingRequests = Boolean(activeSemester?.scheduling_open);

  // Count total APPROVED requests per staffer for quota display
  const requestCountPerStaffer = useMemo(() => {
    const counts = {};
    (pendingRequests || []).forEach((request) => {
      // Only count approved requests toward quota
      if (request.status === "approved") {
        const stafferId = request.staffer_id;
        counts[stafferId] = (counts[stafferId] || 0) + 1;
      }
    });
    return counts;
  }, [pendingRequests]);

  const requestSearchTokens = requestSearchText
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const filteredRequests = useMemo(
    () =>
      pendingRequests.filter((request) => {
        const matchesStatus =
          requestStatusFilter === "All" ||
          getRequestStatusMeta(request.status).label === requestStatusFilter;

        if (!matchesStatus) return false;

        if (requestSearchTokens.length === 0) return true;

        const content = [
          request.staffer?.full_name,
          request.staffer?.role,
          request.staffer?.section,
          DAY_LABELS[request.current_duty_day],
          DAY_LABELS[request.requested_duty_day],
          request.request_reason,
          request.review_notes,
          getRequestStatusMeta(request.status).label,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return requestSearchTokens.every((token) => content.includes(token));
      }),
    [pendingRequests, requestSearchTokens, requestStatusFilter],
  );

  useEffect(() => {
    const openRequestId = location.state?.openDutyChangeRequestId;
    const openStafferId = location.state?.openDutyChangeRequestStafferId;
    if ((!openRequestId && !openStafferId) || pendingRequests.length === 0)
      return;

    const match = openRequestId
      ? pendingRequests.find((request) => request.id === openRequestId)
      : pendingRequests.find(
          (request) =>
            request.staffer_id === openStafferId &&
            request.status === "pending",
        ) ||
        pendingRequests.find((request) => request.staffer_id === openStafferId);

    if (!match) return;

    queueMicrotask(() => {
      setActiveTab(1);
      setRequestStatusFilter("All");
      setRequestSearchText(match.staffer?.full_name || "");
      setRequestDetailsTarget(match);
      setRequestDetailsOpen(true);
    });
  }, [
    location.state?.openDutyChangeRequestId,
    location.state?.openDutyChangeRequestStafferId,
    pendingRequests,
  ]);

  const sectionOptions = useMemo(() => {
    const uniqueSections = Array.from(
      new Set(schedules.map((s) => s.staffer?.section).filter(Boolean)),
    );

    return [
      ...COVERAGE_SECTIONS.filter((sec) => uniqueSections.includes(sec)),
      ...uniqueSections.filter((sec) => !COVERAGE_SECTIONS.includes(sec)),
    ];
  }, [schedules]);

  // Day counts should reflect section-filtered data (before search)
  const dayCounts = DAY_LABELS.map(
    (_, i) => filtered.filter((s) => s.duty_day === i).length,
  );

  // Apply search to section-filtered data
  const searchTokens = searchText
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const filteredBySearch =
    searchTokens.length === 0
      ? filtered
      : filtered.filter((s) => {
          const content = [
            s.staffer?.full_name,
            s.staffer?.section,
            s.staffer?.role,
            s.staffer?.division,
            DAY_LABELS[s.duty_day],
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchTokens.every((token) => content.includes(token));
        });

  // Apply day filter to search-filtered data
  const filteredByDay =
    selectedDayFilter === null
      ? filteredBySearch
      : filteredBySearch.filter((s) => s.duty_day === selectedDayFilter);

  const dayCapacities = SLOT_FIELDS.map((field) =>
    Math.max(0, Number(activeSemester?.[field] ?? 10) || 0),
  );

  const handleExportCsv = () => {
    gridApiRef.current?.exportDataAsCsv({
      utf8WithBom: true,
      fileName: "duty-schedule-export",
    });
  };

  const handleExportRequestsCsv = () => {
    requestGridApiRef.current?.exportDataAsCsv({
      utf8WithBom: true,
      fileName: "duty-change-requests-export",
    });
  };

  const openSlotDialog = (dayIndex = null) => {
    setSlotForm(getSlotForm(activeSemester));
    setSlotError("");
    setSlotDialogDayIndex(dayIndex);
    setSlotDialogOpen(true);
  };

  const handleSlotChange = (field, value) => {
    const parsed = value === "" ? "" : Number(value);
    setSlotForm((prev) => ({
      ...prev,
      [field]: value === "" || Number.isNaN(parsed) ? "" : parsed,
    }));
  };

  const handleSaveSlots = async () => {
    if (!activeSemester?.id) return;

    if (slotDialogDayIndex === null) return;

    const selectedField = SLOT_FIELDS[slotDialogDayIndex];
    const selectedValue = Number(slotForm[selectedField]);

    if (Number.isNaN(selectedValue) || selectedValue < 0) {
      setSlotError("Enter a valid slot count of 0 or more.");
      return;
    }

    setSlotSaving(true);
    setSlotError("");
    try {
      const payload = {
        [selectedField]: selectedValue,
      };

      const { error: saveError } = await supabase
        .from("semesters")
        .update(payload)
        .eq("id", activeSemester.id);

      if (saveError) throw saveError;

      await loadActiveSemester();
      setSlotDialogDayIndex(null);
      setSlotDialogOpen(false);
    } catch (saveError) {
      setSlotError(saveError.message || "Failed to save slot capacities.");
    } finally {
      setSlotSaving(false);
    }
  };

  const closeSlotDialog = () => {
    if (slotSaving) return;
    setSlotDialogOpen(false);
    setSlotDialogDayIndex(null);
    setSlotError("");
  };

  const findScheduleConflicts = useCallback(async (stafferId, dutyDay) => {
    if (!stafferId || dutyDay === null || dutyDay === undefined) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error: fetchErr } = await supabase
      .from("coverage_assignments")
      .select(
        `id, request:coverage_requests!inner(id, title, event_date, is_multiday, event_days, status)`,
      )
      .eq("assigned_to", stafferId);

    if (fetchErr) throw fetchErr;

    return (data || [])
      .map((row) => row.request)
      .filter(
        (request) =>
          request && ACTIVE_REQUEST_STATUSES.includes(request.status),
      )
      .filter((request) =>
        getUpcomingRequestDates(request).some((date) => {
          const nextDate = new Date(`${date}T00:00:00`);
          nextDate.setHours(0, 0, 0, 0);
          return nextDate >= today && getDutyDayFromDate(date) === dutyDay;
        }),
      );
  }, []);

  const handleApproveRequest = useCallback(
    async (request) => {
      if (!activeSemester?.id || !request?.id) return;

      if (!activeSemester.scheduling_open) {
        setError(
          "Scheduling is closed for the active semester. Re-open scheduling to approve duty day changes.",
        );
        return;
      }

      setRequestActionId(request.id);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { data: currentSchedule, error: scheduleErr } = await supabase
          .from("duty_schedules")
          .select("id, duty_day")
          .eq("semester_id", activeSemester.id)
          .eq("staffer_id", request.staffer_id)
          .maybeSingle();

        if (scheduleErr) throw scheduleErr;

        if (!currentSchedule) {
          setError(
            "This staff member no longer has an approved duty day to update.",
          );
          return;
        }

        if (currentSchedule.duty_day !== request.current_duty_day) {
          setError(
            "This request is stale because the staff member's approved duty day already changed.",
          );
          await loadPendingRequests();
          await loadSchedules();
          return;
        }

        const requestedDayCount = schedules.filter(
          (entry) => entry.duty_day === request.requested_duty_day,
        ).length;
        const requestedDayProjectedCount =
          currentSchedule.duty_day === request.requested_duty_day
            ? requestedDayCount
            : requestedDayCount + 1;
        const requestedDayCapacity =
          dayCapacities[request.requested_duty_day] ?? 10;

        if (requestedDayProjectedCount > requestedDayCapacity) {
          setError(
            `${DAY_LABELS[request.requested_duty_day]} is already full (${requestedDayCount}/${requestedDayCapacity}).`,
          );
          return;
        }

        const conflicts = await findScheduleConflicts(
          request.staffer_id,
          request.current_duty_day,
        );

        if (conflicts.length > 0) {
          setError(
            `${request.staffer?.full_name || "This staff member"} still has upcoming assignments on ${DAY_LABELS[request.current_duty_day]}. Resolve those before approving the change.`,
          );
          return;
        }

        const { error: upsertErr } = await supabase
          .from("duty_schedules")
          .upsert(
            {
              staffer_id: request.staffer_id,
              semester_id: activeSemester.id,
              duty_day: request.requested_duty_day,
            },
            { onConflict: "staffer_id,semester_id" },
          );

        if (upsertErr) throw upsertErr;

        const { error: reviewErr } = await supabase
          .from("duty_schedule_change_requests")
          .update({
            status: "approved",
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id || null,
          })
          .eq("id", request.id);

        if (reviewErr) throw reviewErr;

        await notifySpecificStaff({
          staffIds: [request.staffer_id],
          type: "duty_schedule_change_approved",
          title: "Duty Day Change Approved",
          message: `Your request to change from ${DAY_LABELS[request.current_duty_day]} to ${DAY_LABELS[request.requested_duty_day]} was approved.`,
          requestId: null,
          createdBy: user?.id || null,
          targetPath: "/staff/my-schedule",
          targetPayload: { openDutyChangeRequestId: request.id },
        });

        await loadSchedules();
        await loadPendingRequests();
        setRequestDetailsOpen(false);
        setRequestDetailsTarget(null);
      } catch (actionErr) {
        setError(
          actionErr.message || "Failed to approve schedule change request.",
        );
      } finally {
        setRequestActionId("");
      }
    },
    [
      activeSemester,
      dayCapacities,
      findScheduleConflicts,
      loadPendingRequests,
      loadSchedules,
      schedules,
    ],
  );

  const handleRejectRequest = useCallback(
    async (request, reason = "") => {
      if (!request?.id) return;

      setRequestActionId(request.id);
      setError("");

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error: reviewErr } = await supabase
          .from("duty_schedule_change_requests")
          .update({
            status: "rejected",
            review_notes: reason.trim() || null,
            reviewed_at: new Date().toISOString(),
            reviewed_by: user?.id || null,
          })
          .eq("id", request.id);

        if (reviewErr) throw reviewErr;

        await notifySpecificStaff({
          staffIds: [request.staffer_id],
          type: "duty_schedule_change_rejected",
          title: "Duty Day Change Declined",
          message: `Your request to change from ${DAY_LABELS[request.current_duty_day]} to ${DAY_LABELS[request.requested_duty_day]} was declined.${reason?.trim() ? ` Reason: ${reason.trim()}` : ""}`,
          requestId: null,
          createdBy: user?.id || null,
          targetPath: "/staff/my-schedule",
          targetPayload: { openDutyChangeRequestId: request.id },
        });

        await loadPendingRequests();
      } catch (actionErr) {
        setError(
          actionErr.message || "Failed to decline schedule change request.",
        );
      } finally {
        setRequestActionId("");
      }
    },
    [loadPendingRequests],
  );

  const openRejectDialog = useCallback((request) => {
    if (!request?.id) return;
    setRequestDetailsOpen(false);
    setRequestDetailsTarget(null);
    setRejectTarget(request);
    setRejectReason("");
    setRejectDialogOpen(true);
  }, []);

  const openRequestDetails = useCallback((request) => {
    if (!request?.id) return;
    setRequestDetailsTarget(request);
    setRequestDetailsOpen(true);
  }, []);

  const closeRequestDetails = useCallback(() => {
    if (requestActionId) return;
    setRequestDetailsOpen(false);
    setRequestDetailsTarget(null);
  }, [requestActionId]);

  const closeRejectDialog = useCallback(() => {
    if (requestActionId) return;
    setRejectDialogOpen(false);
    setRejectTarget(null);
    setRejectReason("");
  }, [requestActionId]);

  const confirmRejectRequest = useCallback(async () => {
    if (!rejectTarget) return;
    await handleRejectRequest(rejectTarget, rejectReason);
    setRejectDialogOpen(false);
    setRejectTarget(null);
    setRejectReason("");
  }, [handleRejectRequest, rejectReason, rejectTarget]);

  const rows = filteredByDay.map((s) => ({
    id: s.id,
    full_name: s.staffer?.full_name || "—",
    section: s.staffer?.section || "—",
    role: s.staffer?.role || "—",
    division: s.staffer?.division || "—",
    avatar_url: s.staffer?.avatar_url || null,
    duty_day: s.duty_day,
  }));

  const columns = [
    {
      field: "full_name",
      headerName: "Staffer",
      flex: 1.3,
      renderCell: (p) => {
        const url = getAvatarUrl(p.row.avatar_url);
        const avatarColor = getAvatarColor(p.row.id || p.value);
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              height: "100%",
            }}
          >
            <Avatar
              src={url}
              sx={{
                width: 28,
                height: 28,
                fontSize: "0.62rem",
                fontWeight: 700,
                backgroundColor: avatarColor.bg,
                color: avatarColor.color,
                flexShrink: 0,
              }}
            >
              {!url && getInitials(p.value)}
            </Avatar>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "text.primary",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "section",
      headerName: "Section",
      flex: 0.9,
      renderCell: (p) => {
        const cfg = SECTION_CFG[p.value] || {
          bg: "#f9fafb",
          color: "#6b7280",
          dot: "#9ca3af",
        };
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.25,
                py: 0.35,
                borderRadius: "10px",
                backgroundColor: isDark ? `${cfg.dot}15` : cfg.bg,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: cfg.dot,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: isDark ? cfg.dot : cfg.color,
                  letterSpacing: "0.04em",
                }}
              >
                {p.value}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "role",
      headerName: "Role",
      flex: 0.8,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box
            sx={{
              px: 1.25,
              py: 0.35,
              borderRadius: "10px",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(53,53,53,0.04)",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 500,
                color: "text.secondary",
                textTransform: "capitalize",
              }}
            >
              {p.value || "—"}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "division",
      headerName: "Division",
      flex: 0.9,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "duty_day",
      headerName: "Duty Day",
      flex: 0.8,
      renderCell: (p) => {
        const cfg = DAY_CFG[p.value] || DAY_CFG[0];
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.25,
                py: 0.35,
                borderRadius: "10px",
                backgroundColor: isDark ? cfg.darkBg : cfg.bg,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: cfg.dot,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: isDark ? cfg.darkColor : cfg.color,
                  letterSpacing: "0.04em",
                }}
              >
                {DAY_LABELS[p.value] ?? "—"}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
  ];

  const requestRows = filteredRequests.map((request) => ({
    id: request.id,
    staffer_name: request.staffer?.full_name || "Unknown Staffer",
    staffer_section: request.staffer?.section || "—",
    staffer_role: request.staffer?.role || "Staff",
    staffer_avatar_url: request.staffer?.avatar_url || null,
    staffer_id: request.staffer_id,
    current_duty_day: request.current_duty_day,
    requested_duty_day: request.requested_duty_day,
    request_reason: request.request_reason || "No reason provided.",
    status: request.status,
    status_label: getRequestStatusMeta(request.status).label,
    created_at: request.created_at,
    request_count: requestCountPerStaffer[request.staffer_id] || 0,
    rawRequest: request,
  }));

  const requestColumns = [
    {
      field: "staffer_name",
      headerName: "Staffer",
      flex: 1.2,
      renderCell: (p) => {
        const url = getAvatarUrl(p.row.staffer_avatar_url);
        const avatarColor = getAvatarColor(p.row.staffer_id || p.row.id);
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.85,
              height: "100%",
            }}
          >
            <Avatar
              src={url}
              sx={{
                width: 26,
                height: 26,
                fontSize: "0.62rem",
                fontWeight: 700,
                backgroundColor: avatarColor.bg,
                color: avatarColor.color,
              }}
            >
              {!url && getInitials(p.value)}
            </Avatar>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 400,
                  color: "text.primary",
                  lineHeight: 1.15,
                }}
              >
                {p.value}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "request_count",
      headerName: "Changes Used",
      width: 112,
      align: "center",
      headerAlign: "center",
      sortable: false,
      renderCell: (p) => {
        const count = p.value || 0;
        const isQuotaExhausted = count >= 3;
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.72rem",
                fontWeight: 500,
                color: isQuotaExhausted ? "#b91c1c" : "#b45309",
                letterSpacing: "0.01em",
              }}
            >
              {count}/3
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "staffer_section",
      headerName: "Section",
      flex: 0.85,
      renderCell: (p) => {
        const cfg = SECTION_CFG[p.value] || {
          bg: "#f9fafb",
          color: "#6b7280",
          dot: "#9ca3af",
        };
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.15,
                py: 0.35,
                borderRadius: "10px",
                backgroundColor: isDark ? `${cfg.dot}15` : cfg.bg,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: cfg.dot,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: isDark ? cfg.dot : cfg.color,
                  letterSpacing: "0.04em",
                }}
              >
                {p.value}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "staffer_role",
      headerName: "Role",
      flex: 0.72,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box
            sx={{
              px: 1.15,
              py: 0.35,
              borderRadius: "10px",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(53,53,53,0.04)",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 500,
                color: "text.secondary",
                textTransform: "capitalize",
              }}
            >
              {p.value || "Staff"}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "created_at",
      headerName: "Requested",
      flex: 0.8,
      renderCell: (p) => <MetaCell>{formatDateTime(p.value)}</MetaCell>,
    },
    {
      field: "status_label",
      headerName: "Status",
      flex: 0.7,
      renderCell: (p) => {
        const statusMeta = getRequestStatusMeta(p.row.status);
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minWidth: 86,
                px: 1.1,
                height: 26,
                borderRadius: "999px",
                border: `1px solid ${statusMeta.border}`,
                backgroundColor: statusMeta.bg,
                color: statusMeta.color,
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 700,
              }}
            >
              {statusMeta.label}
            </Box>
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "Action",
      flex: 0.55,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box
            onClick={() => openRequestDetails(p.row.rawRequest)}
            sx={{
              px: 1.35,
              height: 28,
              borderRadius: "4px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "1px solid #d5a308",
              backgroundColor: GOLD,
              color: "#1a1a1a",
              fontFamily: dm,
              fontSize: "0.72rem",
              fontWeight: 700,
              transition: "background-color 0.15s, border-color 0.15s",
              "&:hover": {
                backgroundColor: "#e9b914",
                borderColor: "#bf9000",
              },
            }}
          >
            View
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "#ffffff",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflowX: "hidden",
        overflowY: "hidden",
        position: "relative",
        fontFamily: dm,
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          mb: 3,
          flexShrink: 0,
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 1,
          flexWrap: "wrap",
        }}
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "1.05rem",
            color: "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          Duty Schedule
        </Typography>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            flexDirection: "row",
            gap: 0.75,
            flexWrap: "nowrap",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.secondary",
              whiteSpace: "nowrap",
              textAlign: "right",
            }}
          >
            {activeSemester
              ? `Showing duty schedules for ${getSemesterDisplayName(activeSemester)}`
              : "No active semester. Create and activate one in Semester Management."}
          </Typography>

          {activeSemester && !canApprovePendingRequests && (
            <Box
              sx={{
                px: 1,
                py: 0.28,
                borderRadius: "10px",
                border: "1px solid rgba(245,197,43,0.45)",
                backgroundColor: isDark ? "rgba(245,197,43,0.14)" : "#fefce8",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.66rem",
                  fontWeight: 700,
                  color: "#9a6b00",
                  letterSpacing: "0.03em",
                }}
              >
                APPROVALS LOCKED (SCHEDULING CLOSED)
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {!activeSemester && !loading && (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          No active semester found. Go to Semester Management to set one up.
        </Alert>
      )}

      {/* ── Day slot summary cards ── */}
      {activeSemester && (
        <Box
          sx={{
            display: "flex",
            gap: 1,
            mb: 3,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          {DAY_LABELS.map((day, i) => {
            const cfg = DAY_CFG[i];
            const isSelected = selectedDayFilter === i;
            return (
              <Box
                key={day}
                onClick={() =>
                  setSelectedDayFilter((current) => (current === i ? null : i))
                }
                sx={{
                  flex: "1 1 110px",
                  minWidth: 100,
                  px: 2,
                  py: 1.5,
                  borderRadius: "10px",
                  border: `1px solid ${isSelected ? GOLD : border}`,
                  backgroundColor: isSelected
                    ? isDark
                      ? "rgba(245,197,43,0.12)"
                      : "rgba(245,197,43,0.08)"
                    : "background.paper",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: isSelected
                      ? "none"
                      : "0 10px 20px rgba(0,0,0,0.04)",
                  },
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      mb: 0.5,
                    }}
                  >
                    {day}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {isSelected && (
                      <IconButton
                        size="small"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedDayFilter(null);
                        }}
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: "6px",
                          color: "text.disabled",
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(53,53,53,0.04)",
                          "&:hover": {
                            color: "text.primary",
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(53,53,53,0.08)",
                          },
                        }}
                      >
                        <CloseIcon sx={{ fontSize: 13 }} />
                      </IconButton>
                    )}
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        openSlotDialog(i);
                      }}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "6px",
                        color: "text.disabled",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(53,53,53,0.04)",
                        "&:hover": {
                          color: "text.primary",
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.08)"
                            : "rgba(53,53,53,0.08)",
                        },
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  </Box>
                  {dayCounts[i] > dayCapacities[i] && (
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        color: "#dc2626",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                      }}
                    >
                      Over
                    </Typography>
                  )}
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 0.4,
                    mb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "1.35rem",
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                      color: isDark ? cfg.darkColor : cfg.color,
                      lineHeight: 1,
                    }}
                  >
                    {dayCounts[i]}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.7rem",
                      color: "text.secondary",
                    }}
                  >
                    /{dayCapacities[i]}
                  </Typography>
                </Box>
                {/* Progress bar */}
                <Box
                  sx={{
                    height: 3,
                    borderRadius: "10px",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(53,53,53,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${Math.min(
                        dayCapacities[i] > 0
                          ? (dayCounts[i] / dayCapacities[i]) * 100
                          : dayCounts[i] > 0
                            ? 100
                            : 0,
                        100,
                      )}%`,
                      backgroundColor:
                        dayCounts[i] > dayCapacities[i] && dayCapacities[i] >= 0
                          ? "#dc2626"
                          : isDark
                            ? cfg.darkColor
                            : cfg.dot,
                      borderRadius: "10px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          {error}
        </Alert>
      )}

      {activeSemester && (
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: FILTER_GROUP_GAP,
            flexWrap: "wrap",
          }}
        >
          {[
            { key: 0, label: "Schedule" },
            { key: 1, label: "Requests", showBadge: true },
          ].map((item) => {
            const active = activeTab === item.key;
            return (
              <Box
                key={item.key}
                component="button"
                type="button"
                onClick={() => setActiveTab(item.key)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: item.showBadge ? 1 : 0,
                  px: 1.35,
                  height: FILTER_BUTTON_HEIGHT,
                  borderRadius: CONTROL_RADIUS,
                  border: `1px solid ${active ? "#212121" : "rgba(53,53,53,0.12)"}`,
                  backgroundColor: active ? "#212121" : "transparent",
                  color: active ? "#ffffff" : "text.secondary",
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: active ? 600 : 500,
                  lineHeight: 1.15,
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.15s ease",
                  "&:hover": {
                    borderColor: active ? "#212121" : "rgba(53,53,53,0.22)",
                    color: active ? "#ffffff" : "text.primary",
                    backgroundColor: active ? "#212121" : "rgba(53,53,53,0.03)",
                  },
                }}
              >
                <Box component="span" sx={{ lineHeight: 1 }}>
                  {item.label}
                </Box>
                {item.showBadge && pendingRequestCount > 0 ? (
                  <NumberBadge
                    count={pendingRequestCount}
                    active={active}
                    size={15}
                    activeBg={GOLD}
                    inactiveBg={
                      isDark ? "rgba(255,255,255,0.28)" : "rgba(53,53,53,0.45)"
                    }
                    textColor="#ffffff"
                    sx={{
                      fontFamily: dm,
                      fontWeight: 700,
                      fontSize: "0.62rem",
                    }}
                  />
                ) : null}
              </Box>
            );
          })}
        </Box>
      )}

      {activeSemester && activeTab === 1 && (
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: FILTER_GROUP_GAP,
            flexWrap: "nowrap",
            overflowX: "auto",
            flexShrink: 0,
          }}
        >
          <FormControl size="small" sx={{ flex: 1, minWidth: 280 }}>
            <OutlinedInput
              placeholder="Search requests"
              value={requestSearchText}
              onChange={(e) => setRequestSearchText(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                </InputAdornment>
              }
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                borderRadius: CONTROL_RADIUS,
                height: FILTER_INPUT_HEIGHT,
                backgroundColor: "#f7f7f8",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(0,0,0,0.12)",
                },
              }}
            />
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <Select
              value={requestStatusFilter}
              onChange={(e) => setRequestStatusFilter(e.target.value)}
              IconComponent={UnfoldMoreIcon}
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                borderRadius: CONTROL_RADIUS,
                height: FILTER_INPUT_HEIGHT,
                backgroundColor: "#f7f7f8",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(0,0,0,0.12)",
                },
              }}
            >
              {["All", "Pending", "Approved", "Declined"].map((status) => (
                <MenuItem
                  key={status}
                  value={status}
                  sx={{ fontFamily: dm, fontSize: "0.78rem" }}
                >
                  {status}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          <IconButton
            size="small"
            onClick={() => setIsTableFullscreen(true)}
            sx={{
              borderRadius: CONTROL_RADIUS,
              color: "text.secondary",
              border: "1px solid rgba(0,0,0,0.12)",
              backgroundColor: "#f7f7f8",
              width: ACTION_BTN_HEIGHT,
              height: ACTION_BTN_HEIGHT,
              transition: "all 0.15s",
              flexShrink: 0,
              "&:hover": {
                borderColor: "rgba(53,53,53,0.3)",
                color: "text.primary",
                backgroundColor: "#ededee",
              },
            }}
          >
            <FullscreenIcon sx={{ fontSize: 16 }} />
          </IconButton>

          <Box
            onClick={handleExportRequestsCsv}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5,
              height: ACTION_BTN_HEIGHT,
              borderRadius: CONTROL_RADIUS,
              cursor: "pointer",
              border: "1px solid rgba(0,0,0,0.12)",
              fontFamily: dm,
              fontSize: "0.78rem",
              fontWeight: 500,
              color: "text.secondary",
              backgroundColor: "#f7f7f8",
              transition: "all 0.15s",
              flexShrink: 0,
              "&:hover": {
                borderColor: "rgba(53,53,53,0.3)",
                color: "text.primary",
                backgroundColor: "#ededee",
              },
            }}
          >
            <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
            Export
          </Box>
        </Box>
      )}

      {activeSemester && activeTab === 1 && (
        <Box sx={{ flex: 1, minHeight: 0, width: "100%", overflowX: "auto" }}>
          <Box
            sx={{
              minWidth: 600,
              height: "100%",
              bgcolor: "#f7f7f8",
              borderRadius: "10px",
              border: `1px solid ${border}`,
              overflow: "hidden",
            }}
          >
            <DataGrid
              rows={requestRows}
              columns={requestColumns}
              pageSize={10}
              rowsPerPageOptions={[10]}
              disableRowSelectionOnClick
              rowHeight={56}
              enableSearch={false}
              apiRef={requestGridApiRef}
              slotProps={{
                toolbar: {
                  csvOptions: { disableToolbarButton: true },
                  printOptions: { disableToolbarButton: true },
                },
              }}
            />
          </Box>
        </Box>
      )}

      {/* ── Filter row: Search | Section | Export ── */}
      {/* ── Filter row: Search | Section | Export ── */}
      {activeSemester && activeTab === 0 && (
        <Box
          sx={{
            mb: 2,
            display: "flex",
            alignItems: "center",
            gap: FILTER_ROW_GAP,
            flexWrap: "nowrap",
            overflowX: "auto",
            flexShrink: 0,
          }}
        >
          {/* Search */}
          <FormControl size="small" sx={{ flex: 1, minWidth: 300 }}>
            <OutlinedInput
              placeholder="Search"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              startAdornment={
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                </InputAdornment>
              }
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                borderRadius: CONTROL_RADIUS,
                height: FILTER_INPUT_HEIGHT,
                backgroundColor: "#f7f7f8",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(0,0,0,0.12)",
                },
              }}
            />
          </FormControl>

          {/* Section */}
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <Select
              value={sectionFilter}
              onChange={(e) => setSectionFilter(e.target.value)}
              IconComponent={UnfoldMoreIcon}
              displayEmpty
              renderValue={(val) => {
                const triggerCount =
                  val === "All"
                    ? schedules.length
                    : schedules.filter((s) => s.staffer?.section === val)
                        .length;
                return (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.78rem",
                        color: "text.primary",
                      }}
                    >
                      {val}
                    </Typography>
                    <NumberBadge
                      count={triggerCount}
                      active={isSectionFiltered}
                      inactiveBg={
                        isDark
                          ? "rgba(255,255,255,0.28)"
                          : "rgba(53,53,53,0.45)"
                      }
                      fontFamily={dm}
                      fontSize="0.56rem"
                      sx={{ opacity: triggerCount === 0 ? 0.5 : 1 }}
                    />
                  </Box>
                );
              }}
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                borderRadius: CONTROL_RADIUS,
                height: FILTER_INPUT_HEIGHT,
                backgroundColor: "#f7f7f8",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: "rgba(0,0,0,0.12)",
                },
                "& .MuiSelect-icon": { fontSize: 18, color: "text.disabled" },
              }}
            >
              {["All", ...sectionOptions].map((sec) => {
                const count =
                  sec === "All"
                    ? schedules.length
                    : schedules.filter((s) => s.staffer?.section === sec)
                        .length;
                const isSelected = sectionFilter === sec;
                return (
                  <MenuItem
                    key={sec}
                    value={sec}
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 2,
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {sec}
                    <NumberBadge
                      count={count}
                      active={isSelected}
                      inactiveBg={
                        isDark
                          ? "rgba(255,255,255,0.28)"
                          : "rgba(53,53,53,0.45)"
                      }
                      fontFamily={dm}
                      fontSize="0.56rem"
                      sx={{ opacity: count === 0 ? 0.5 : 1 }}
                    />
                  </MenuItem>
                );
              })}
            </Select>
          </FormControl>

          <Box sx={{ flex: 1 }} />

          {/* Expand Button */}
          <IconButton
            size="small"
            onClick={() => setIsTableFullscreen(true)}
            sx={{
              borderRadius: CONTROL_RADIUS,
              color: "text.secondary",
              border: "1px solid rgba(0,0,0,0.12)",
              backgroundColor: "#f7f7f8",
              width: ACTION_BTN_HEIGHT,
              height: ACTION_BTN_HEIGHT,
              transition: "all 0.15s",
              flexShrink: 0,
              "&:hover": {
                borderColor: "rgba(53,53,53,0.3)",
                color: "text.primary",
                backgroundColor: "#ededee",
              },
            }}
          >
            <FullscreenIcon sx={{ fontSize: 16 }} />
          </IconButton>

          {/* Export */}
          <Box
            onClick={handleExportCsv}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1.5,
              height: ACTION_BTN_HEIGHT,
              borderRadius: CONTROL_RADIUS,
              cursor: "pointer",
              border: "1px solid rgba(0,0,0,0.12)",
              fontFamily: dm,
              fontSize: "0.78rem",
              fontWeight: 500,
              color: "text.secondary",
              backgroundColor: "#f7f7f8",
              transition: "all 0.15s",
              flexShrink: 0,
              "&:hover": {
                borderColor: "rgba(53,53,53,0.3)",
                color: "text.primary",
                backgroundColor: "#ededee",
              },
            }}
          >
            <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
            Export
          </Box>
        </Box>
      )}

      {/* ── Table ── */}
      {activeSemester && activeTab === 0 && (
        <Box sx={{ flex: 1, minHeight: 0, width: "100%", overflowX: "auto" }}>
          <Box
            sx={{
              minWidth: 600,
              height: "100%",
              bgcolor: "#f7f7f8",
              borderRadius: "10px",
              border: `1px solid ${border}`,
              overflow: "hidden",
            }}
          >
            {loading ? (
              <Box
                sx={{
                  height: 300,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <BrandedLoader size={44} inline />
              </Box>
            ) : (
              <DataGrid
                rows={rows}
                columns={columns}
                pageSize={10}
                rowsPerPageOptions={[10]}
                disableRowSelectionOnClick
                rowHeight={56}
                enableSearch={false}
                apiRef={gridApiRef}
                slotProps={{
                  toolbar: {
                    csvOptions: { disableToolbarButton: true },
                    printOptions: { disableToolbarButton: true },
                  },
                }}
              />
            )}
          </Box>
        </Box>
      )}

      {/* ── Fullscreen Table View ── */}
      {isTableFullscreen && activeSemester && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            flexDirection: "column",
            backgroundColor: "#fff",
            zIndex: 1300,
            boxShadow: isDark
              ? "0 16px 40px rgba(0,0,0,0.35)"
              : "0 10px 30px rgba(0,0,0,0.08)",
            ...(!isDark && {}),
            ...(isDark && { backgroundColor: "#121212" }),
            opacity: isTableFullscreen ? 1 : 0,
            transform: isTableFullscreen ? "scale(1)" : "scale(0.95)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            pointerEvents: isTableFullscreen ? "auto" : "none",
          }}
        >
          {/* Header */}
          <Box
            sx={{
              px: 4,
              py: 2,
              borderBottom: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              gap: FILTER_GROUP_GAP,
              flexShrink: 0,
              transform: isTableFullscreen
                ? "translateY(0)"
                : "translateY(-10px)",
              opacity: isTableFullscreen ? 1 : 0,
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              transitionDelay: isTableFullscreen ? "0.1s" : "0s",
            }}
          >
            {activeTab === 0 ? (
              <>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.8,
                    flexShrink: 0,
                  }}
                >
                  {DAY_LABELS.map((day, i) => {
                    const label = ["M", "T", "W", "Th", "F"][i];
                    const cfg = DAY_CFG[i];
                    const isSelected = selectedDayFilter === i;
                    return (
                      <Box
                        key={day}
                        onClick={() =>
                          setSelectedDayFilter((current) =>
                            current === i ? null : i,
                          )
                        }
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: 0.3,
                          cursor: "pointer",
                        }}
                      >
                        <Box
                          sx={{
                            width: 38,
                            height: 38,
                            borderRadius: "50%",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontFamily: dm,
                            fontWeight: 700,
                            fontSize: "0.75rem",
                            border: `1px solid ${isSelected ? GOLD : border}`,
                            backgroundColor: isSelected
                              ? isDark
                                ? "rgba(245,197,43,0.12)"
                                : "rgba(245,197,43,0.08)"
                              : "background.paper",
                            color: isSelected ? "text.primary" : cfg.color,
                            transition: "all 0.2s ease",
                            "&:hover": {
                              transform: "translateY(-1px)",
                              boxShadow: isSelected
                                ? "none"
                                : "0 10px 20px rgba(0,0,0,0.04)",
                            },
                          }}
                        >
                          {label}
                        </Box>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.62rem",
                            color: isSelected ? GOLD : "text.secondary",
                          }}
                        >
                          {dayCounts[i]}
                        </Typography>
                      </Box>
                    );
                  })}

                  {selectedDayFilter !== null && (
                    <IconButton
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        openSlotDialog(selectedDayFilter);
                      }}
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "10px",
                        color: "text.disabled",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.06)"
                          : "rgba(53,53,53,0.06)",
                        "&:hover": {
                          color: "text.primary",
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(53,53,53,0.1)",
                        },
                      }}
                    >
                      <EditOutlinedIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  )}
                </Box>

                <Box sx={{ flex: 1 }} />

                <FormControl size="small" sx={{ minWidth: 250, flex: 1 }}>
                  <OutlinedInput
                    placeholder="Search"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ fontSize: 16, color: "text.disabled" }}
                        />
                      </InputAdornment>
                    }
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      borderRadius: "10px",
                      backgroundColor: "#f7f7f8",
                      "&.MuiOutlinedInput-root": {
                        "& fieldset": { borderColor: "rgba(0,0,0,0.12)" },
                      },
                    }}
                  />
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={sectionFilter}
                    onChange={(e) => setSectionFilter(e.target.value)}
                    IconComponent={UnfoldMoreIcon}
                    displayEmpty
                    renderValue={(val) => {
                      const triggerCount =
                        val === "All"
                          ? schedules.length
                          : schedules.filter((s) => s.staffer?.section === val)
                              .length;
                      return (
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.78rem",
                              color: "text.primary",
                            }}
                          >
                            {val}
                          </Typography>
                          <NumberBadge
                            count={triggerCount}
                            active={isSectionFiltered}
                            inactiveBg={
                              isDark
                                ? "rgba(255,255,255,0.28)"
                                : "rgba(53,53,53,0.45)"
                            }
                            fontFamily={dm}
                            fontSize="0.56rem"
                            sx={{ opacity: triggerCount === 0 ? 0.5 : 1 }}
                          />
                        </Box>
                      );
                    }}
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      borderRadius: "10px",
                      backgroundColor: "#f7f7f8",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(0,0,0,0.12)",
                      },
                      "& .MuiSelect-icon": {
                        fontSize: 18,
                        color: "text.disabled",
                      },
                    }}
                  >
                    {["All", ...sectionOptions].map((sec) => {
                      const count =
                        sec === "All"
                          ? schedules.length
                          : schedules.filter((s) => s.staffer?.section === sec)
                              .length;
                      const isSelected = sectionFilter === sec;
                      return (
                        <MenuItem
                          key={sec}
                          value={sec}
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.78rem",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: 2,
                            fontWeight: isSelected ? 600 : 400,
                          }}
                        >
                          {sec}
                          <NumberBadge
                            count={count}
                            active={isSelected}
                            inactiveBg={
                              isDark
                                ? "rgba(255,255,255,0.28)"
                                : "rgba(53,53,53,0.45)"
                            }
                            fontFamily={dm}
                            fontSize="0.56rem"
                            sx={{ opacity: count === 0 ? 0.5 : 1 }}
                          />
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <Box
                  onClick={handleExportCsv}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1.5,
                    height: ACTION_BTN_HEIGHT,
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: "1px solid rgba(0,0,0,0.12)",
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    color: "text.secondary",
                    backgroundColor: "#f7f7f8",
                    transition: "all 0.15s",
                    flexShrink: 0,
                    "&:hover": {
                      borderColor: "rgba(53,53,53,0.3)",
                      color: "text.primary",
                      backgroundColor: "#ededee",
                    },
                  }}
                >
                  <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
                  Export
                </Box>
              </>
            ) : (
              <>
                <FormControl size="small" sx={{ minWidth: 280, flex: 1 }}>
                  <OutlinedInput
                    placeholder="Search requests"
                    value={requestSearchText}
                    onChange={(e) => setRequestSearchText(e.target.value)}
                    startAdornment={
                      <InputAdornment position="start">
                        <SearchIcon
                          sx={{ fontSize: 16, color: "text.disabled" }}
                        />
                      </InputAdornment>
                    }
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      borderRadius: "10px",
                      backgroundColor: "#f7f7f8",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(0,0,0,0.12)",
                      },
                    }}
                  />
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 150 }}>
                  <Select
                    value={requestStatusFilter}
                    onChange={(e) => setRequestStatusFilter(e.target.value)}
                    IconComponent={UnfoldMoreIcon}
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      borderRadius: "10px",
                      backgroundColor: "#f7f7f8",
                      "& .MuiOutlinedInput-notchedOutline": {
                        borderColor: "rgba(0,0,0,0.12)",
                      },
                    }}
                  >
                    {["All", "Pending", "Approved", "Declined"].map(
                      (status) => (
                        <MenuItem
                          key={status}
                          value={status}
                          sx={{ fontFamily: dm, fontSize: "0.78rem" }}
                        >
                          {status}
                        </MenuItem>
                      ),
                    )}
                  </Select>
                </FormControl>

                <Box sx={{ flex: 1 }} />

                <Box
                  onClick={handleExportRequestsCsv}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.5,
                    px: 1.5,
                    height: ACTION_BTN_HEIGHT,
                    borderRadius: "10px",
                    cursor: "pointer",
                    border: "1px solid rgba(0,0,0,0.12)",
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: 500,
                    color: "text.secondary",
                    backgroundColor: "#f7f7f8",
                    transition: "all 0.15s",
                    flexShrink: 0,
                    "&:hover": {
                      borderColor: "rgba(53,53,53,0.3)",
                      color: "text.primary",
                      backgroundColor: "#ededee",
                    },
                  }}
                >
                  <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
                  Export
                </Box>
              </>
            )}
            <IconButton
              size="small"
              onClick={() => setIsTableFullscreen(false)}
              sx={{
                borderRadius: "10px",
                color: "text.secondary",
                "&:hover": {
                  backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
                },
              }}
            >
              <FullscreenExitIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>

          {/* Table */}
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              width: "100%",
              overflowX: "auto",
              px: 4,
              py: 2,
              transform: isTableFullscreen
                ? "translateY(0)"
                : "translateY(20px)",
              opacity: isTableFullscreen ? 1 : 0,
              transition: "all 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
              transitionDelay: isTableFullscreen ? "0.2s" : "0s",
            }}
          >
            <Box
              sx={{
                minWidth: 600,
                height: "100%",
                bgcolor: "#f7f7f8",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                overflow: "hidden",
              }}
            >
              {loading && activeTab === 0 ? (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <BrandedLoader size={44} inline />
                </Box>
              ) : (
                <DataGrid
                  rows={activeTab === 0 ? rows : requestRows}
                  columns={activeTab === 0 ? columns : requestColumns}
                  pageSize={10}
                  rowsPerPageOptions={[10]}
                  disableRowSelectionOnClick
                  rowHeight={56}
                  enableSearch={false}
                  apiRef={activeTab === 0 ? gridApiRef : requestGridApiRef}
                  slotProps={{
                    toolbar: {
                      csvOptions: { disableToolbarButton: true },
                      printOptions: { disableToolbarButton: true },
                    },
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      )}

      <Dialog
        open={requestDetailsOpen}
        onClose={closeRequestDetails}
        PaperProps={{
          sx: {
            borderRadius: "10px",
            width: 560,
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: "0.92rem",
              color: "text.primary",
            }}
          >
            Pending Schedule Request
          </Typography>
          <IconButton
            size="small"
            onClick={closeRequestDetails}
            sx={{
              borderRadius: "10px",
              color: "text.secondary",
              "&:hover": {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Box sx={{ pb: 0.25 }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.84rem",
                fontWeight: 700,
                color: "text.primary",
              }}
            >
              {requestDetailsTarget?.staffer?.full_name || "Unknown Staffer"}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.25,
                opacity: 0.85,
              }}
            >
              {(requestDetailsTarget?.staffer?.role
                ? requestDetailsTarget.staffer.role.charAt(0).toUpperCase() +
                  requestDetailsTarget.staffer.role.slice(1)
                : "Staff") +
                (requestDetailsTarget?.status
                  ? ` • ${getRequestStatusMeta(requestDetailsTarget.status).label}`
                  : "") +
                (requestDetailsTarget?.created_at
                  ? ` • Requested ${formatDateTime(requestDetailsTarget.created_at)}`
                  : "")}
            </Typography>
          </Box>

          <Box
            sx={{
              borderRadius: "10px",
              border: "1px solid rgba(245,197,43,0.32)",
              px: 1.35,
              py: 1.1,
              backgroundColor: isDark ? "rgba(245,197,43,0.08)" : "#fff9ec",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "#9a6b00",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                mb: 0.7,
              }}
            >
              Change Day Requested
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.8,
                flexWrap: "wrap",
              }}
            >
              <DayPill dayIndex={requestDetailsTarget?.current_duty_day} />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  fontWeight: 700,
                }}
              >
                →
              </Typography>
              <DayPill
                dayIndex={requestDetailsTarget?.requested_duty_day}
                accent
              />
            </Box>
          </Box>

          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                mb: 0.65,
              }}
            >
              Reason
            </Typography>
            <Box
              sx={{
                borderRadius: "10px",
                border: `1px solid ${border}`,
                px: 1.25,
                py: 1.05,
                backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "#fafafa",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.79rem",
                  color: "text.primary",
                  lineHeight: 1.6,
                  whiteSpace: "pre-line",
                  wordBreak: "break-word",
                }}
              >
                {requestDetailsTarget?.request_reason || "No reason provided."}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent:
              requestDetailsTarget?.status === "pending"
                ? "flex-end"
                : "space-between",
            alignItems: "center",
            gap: 1,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.01)"
              : "rgba(53,53,53,0.01)",
          }}
        >
          {requestDetailsTarget?.status !== "pending" && (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.76rem",
                color: "text.secondary",
              }}
            >
              This request has already been{" "}
              {getRequestStatusMeta(
                requestDetailsTarget?.status,
              ).label.toLowerCase()}
              .
            </Typography>
          )}

          {requestDetailsTarget?.status === "pending" && (
            <>
              {!canApprovePendingRequests && (
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.74rem",
                    color: "#b45309",
                    mr: "auto",
                  }}
                >
                  Scheduling is closed. You can still decline this request, but
                  approval is disabled.
                </Typography>
              )}
              <Box
                onClick={
                  requestActionId === requestDetailsTarget?.id
                    ? undefined
                    : () => openRejectDialog(requestDetailsTarget)
                }
                sx={{
                  px: 1.75,
                  py: 0.65,
                  borderRadius: "10px",
                  cursor:
                    requestActionId === requestDetailsTarget?.id
                      ? "default"
                      : "pointer",
                  border: "1px solid rgba(220,38,38,0.18)",
                  backgroundColor: isDark
                    ? "rgba(220,38,38,0.12)"
                    : "rgba(220,38,38,0.06)",
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#dc2626",
                  opacity:
                    requestActionId === requestDetailsTarget?.id ? 0.5 : 1,
                }}
              >
                Decline
              </Box>
              <Box
                onClick={
                  requestActionId === requestDetailsTarget?.id ||
                  !requestDetailsTarget ||
                  !canApprovePendingRequests
                    ? undefined
                    : () => handleApproveRequest(requestDetailsTarget)
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.75,
                  py: 0.65,
                  borderRadius: "10px",
                  cursor:
                    requestActionId === requestDetailsTarget?.id ||
                    !requestDetailsTarget ||
                    !canApprovePendingRequests
                      ? "default"
                      : "pointer",
                  backgroundColor: GOLD,
                  color: "#1a1a1a",
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  opacity:
                    requestActionId === requestDetailsTarget?.id ||
                    !requestDetailsTarget ||
                    !canApprovePendingRequests
                      ? 0.7
                      : 1,
                }}
              >
                {requestActionId === requestDetailsTarget?.id && (
                  <CircularProgress size={13} sx={{ color: "#1a1a1a" }} />
                )}
                Approve
              </Box>
            </>
          )}
        </Box>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onClose={closeRejectDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "10px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: "0.92rem",
              color: "text.primary",
            }}
          >
            Decline Schedule Change
          </Typography>
          <IconButton
            size="small"
            onClick={closeRejectDialog}
            sx={{
              borderRadius: "10px",
              color: "text.secondary",
              "&:hover": {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.secondary",
              lineHeight: 1.5,
            }}
          >
            {rejectTarget
              ? `Decline ${rejectTarget.staffer?.full_name || "this staff member"}'s request to move from ${DAY_LABELS[rejectTarget.current_duty_day]} to ${DAY_LABELS[rejectTarget.requested_duty_day]}?`
              : "Decline this schedule change request?"}
          </Typography>

          <TextField
            label="Reason for declining (optional)"
            placeholder="Add context for the staff member"
            size="small"
            multiline
            minRows={3}
            value={rejectReason}
            onChange={(event) => setRejectReason(event.target.value)}
            disabled={!!requestActionId}
            sx={{
              "& .MuiOutlinedInput-root": {
                fontFamily: dm,
                fontSize: "0.82rem",
                borderRadius: "10px",
                "& fieldset": { borderColor: border },
                "&:hover fieldset": { borderColor: "rgba(245,197,43,0.5)" },
                "&.Mui-focused fieldset": { borderColor: GOLD },
              },
              "& .MuiInputLabel-root": { fontFamily: dm, fontSize: "0.8rem" },
              "& .MuiInputLabel-root.Mui-focused": { color: "#b45309" },
            }}
          />
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.01)"
              : "rgba(53,53,53,0.01)",
          }}
        >
          <Box
            onClick={!requestActionId ? closeRejectDialog : undefined}
            sx={{
              px: 1.75,
              py: 0.65,
              borderRadius: "10px",
              cursor: requestActionId ? "default" : "pointer",
              border: `1px solid ${border}`,
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "text.secondary",
              opacity: requestActionId ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            Cancel
          </Box>
          <Box
            onClick={!requestActionId ? confirmRejectRequest : undefined}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.75,
              py: 0.65,
              borderRadius: "10px",
              cursor: requestActionId ? "default" : "pointer",
              backgroundColor: "#dc2626",
              color: "#fff",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              opacity: requestActionId ? 0.7 : 1,
              transition: "background-color 0.15s",
              "&:hover": {
                backgroundColor: requestActionId ? "#dc2626" : "#b91c1c",
              },
            }}
          >
            {requestActionId === rejectTarget?.id && (
              <CircularProgress size={13} sx={{ color: "#fff" }} />
            )}
            Confirm Decline
          </Box>
        </Box>
      </Dialog>

      <Dialog
        open={slotDialogOpen}
        onClose={closeSlotDialog}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: "10px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 3,
                height: 22,
                borderRadius: "10px",
                backgroundColor: GOLD,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.92rem",
                color: "text.primary",
              }}
            >
              {slotDialogDayIndex === null
                ? "Edit Duty Slots"
                : `Edit ${DAY_LABELS[slotDialogDayIndex]} Slots`}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={closeSlotDialog}
            sx={{
              borderRadius: "10px",
              color: "text.secondary",
              "&:hover": {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.5,
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.secondary",
            }}
          >
            {`Adjust the slot capacity for ${DAY_LABELS[slotDialogDayIndex] || "this day"} in ${activeSemester ? getSemesterDisplayName(activeSemester) : "the active semester"}.`}
          </Typography>

          {slotError && (
            <Alert
              severity="error"
              sx={{ borderRadius: "10px", fontFamily: dm, fontSize: "0.78rem" }}
            >
              {slotError}
            </Alert>
          )}

          {slotDialogDayIndex !== null && (
            <TextField
              label={`${DAY_LABELS[slotDialogDayIndex]} Slots`}
              type="number"
              size="small"
              value={slotForm[SLOT_FIELDS[slotDialogDayIndex]]}
              onChange={(event) =>
                handleSlotChange(
                  SLOT_FIELDS[slotDialogDayIndex],
                  event.target.value,
                )
              }
              disabled={slotSaving}
              inputProps={{ min: 0 }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  borderRadius: "10px",
                  "& fieldset": { borderColor: border },
                  "&:hover fieldset": { borderColor: "rgba(245,197,43,0.5)" },
                  "&.Mui-focused fieldset": { borderColor: GOLD },
                },
                "& .MuiInputLabel-root": { fontFamily: dm, fontSize: "0.8rem" },
                "& .MuiInputLabel-root.Mui-focused": { color: "#b45309" },
              }}
            />
          )}
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.5,
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.01)"
              : "rgba(53,53,53,0.01)",
          }}
        >
          <Box
            onClick={!slotSaving ? closeSlotDialog : undefined}
            sx={{
              px: 1.75,
              py: 0.65,
              borderRadius: "10px",
              cursor: slotSaving ? "default" : "pointer",
              border: `1px solid ${border}`,
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "text.secondary",
              opacity: slotSaving ? 0.5 : 1,
              transition: "all 0.15s",
              "&:hover": {
                borderColor: "rgba(53,53,53,0.4)",
                color: "text.primary",
              },
            }}
          >
            Cancel
          </Box>
          <Box
            onClick={!slotSaving ? handleSaveSlots : undefined}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.75,
              py: 0.65,
              borderRadius: "10px",
              cursor: slotSaving ? "default" : "pointer",
              backgroundColor: GOLD,
              color: "#1a1a1a",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 600,
              opacity: slotSaving ? 0.7 : 1,
              transition: "background-color 0.15s",
              "&:hover": { backgroundColor: slotSaving ? GOLD : "#e6b722" },
            }}
          >
            {slotSaving && (
              <CircularProgress size={13} sx={{ color: "#1a1a1a" }} />
            )}
            Save Slots
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function MetaCell({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography
        sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}
      >
        {children}
      </Typography>
    </Box>
  );
}

function DayPill({ dayIndex, accent = false }) {
  const cfg = DAY_CFG[dayIndex] || DAY_CFG[0];

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.55,
        px: 1,
        py: 0.45,
        borderRadius: "999px",
        backgroundColor: accent ? "#fff9e6" : cfg.bg,
        border: accent ? "1.5px solid #d4a718" : "none",
      }}
    >
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: accent ? GOLD : cfg.dot,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.68rem",
          fontWeight: 700,
          color: accent ? "#704f00" : cfg.color,
          letterSpacing: "0.04em",
        }}
      >
        {DAY_LABELS[dayIndex] ?? "Unknown"}
      </Typography>
    </Box>
  );
}
