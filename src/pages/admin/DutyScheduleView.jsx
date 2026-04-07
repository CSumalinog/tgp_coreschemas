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
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { notifySpecificStaff } from "../../services/NotificationService";
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

const ACTION_BTN_HEIGHT = 36;
const REASON_PREVIEW_LIMIT = 88;

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

export default function DutyScheduleView() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

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
  const [expandedReasonById, setExpandedReasonById] = useState({});
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [isTableFullscreen, setIsTableFullscreen] = useState(false);
  const [selectedDayFilter, setSelectedDayFilter] = useState(null);
  const gridApiRef = useGridApiRef();

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
        `id, staffer_id, current_duty_day, requested_duty_day, request_reason, status, created_at, staffer:staffer_id ( id, full_name, section, role, division, avatar_url )`,
      )
      .eq("semester_id", activeSemester.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

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

  const sectionOptions = useMemo(() => {
    const uniqueSections = Array.from(
      new Set(
        schedules
          .map((s) => s.staffer?.section)
          .filter(Boolean),
      ),
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
        });

        await loadSchedules();
        await loadPendingRequests();
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
          title: "Duty Day Change Rejected",
          message: `Your request to change from ${DAY_LABELS[request.current_duty_day]} to ${DAY_LABELS[request.requested_duty_day]} was rejected.${reason?.trim() ? ` Reason: ${reason.trim()}` : ""}`,
          requestId: null,
          createdBy: user?.id || null,
        });

        await loadPendingRequests();
      } catch (actionErr) {
        setError(
          actionErr.message || "Failed to reject schedule change request.",
        );
      } finally {
        setRequestActionId("");
      }
    },
    [loadPendingRequests],
  );

  const openRejectDialog = useCallback((request) => {
    if (!request?.id) return;
    setRejectTarget(request);
    setRejectReason("");
    setRejectDialogOpen(true);
  }, []);

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

  const toggleReasonExpanded = useCallback((requestId) => {
    setExpandedReasonById((prev) => ({
      ...prev,
      [requestId]: !prev[requestId],
    }));
  }, []);

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

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "#ffffff",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        fontFamily: dm,
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ mb: 3, flexShrink: 0 }}>
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
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            color: "text.secondary",
            mt: 0.3,
          }}
        >
          {activeSemester
            ? `Showing duty schedules for ${activeSemester.name}`
            : "No active semester. Create and activate one in Semester Management."}
        </Typography>
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
                  setSelectedDayFilter((current) =>
                    current === i ? null : i,
                  )
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
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(event, value) => setActiveTab(value)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 44,
              "& .MuiTab-root": {
                fontFamily: dm,
                fontSize: "0.82rem",
                textTransform: "none",
                minHeight: 44,
                py: 0.5,
                px: 1.5,
                borderRadius: "10px",
              },
              "& .MuiTabs-indicator": {
                height: 3,
                borderRadius: "3px",
              },
            }}
          >
            <Tab label="Schedule" />
            <Tab
              label={
                <Badge
                  badgeContent={pendingRequests.length}
                  invisible={pendingRequests.length === 0}
                  sx={{
                    "& .MuiBadge-badge": {
                      backgroundColor: GOLD,
                      color: "#000",
                      minWidth: 16,
                      height: 16,
                      borderRadius: "50%",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      padding: "0 4px",
                      lineHeight: 1,
                    },
                  }}
                >
                  Requests
                </Badge>
              }
            />
          </Tabs>
        </Box>
      )}

      {activeSemester && activeTab === 1 && (
        <Box
          sx={{
            mb: 2,
            px: 2,
            py: 1.75,
            borderRadius: "10px",
            border: `1px solid ${border}`,
            backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#ffffff",
            display: "flex",
            flexDirection: "column",
            gap: 0.75,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  color: "text.primary",
                }}
              >
                Pending Schedule Changes
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  mt: 0.35,
                }}
              >
                Review requested duty-day changes before they affect assignment
                planning.
              </Typography>
            </Box>
          </Box>

          {pendingRequests.length === 0 ? (
            <Box
              sx={{
                px: 2,
                py: 2,
                borderRadius: "10px",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.03)"
                  : "#ffffff",
                border: `1px solid ${border}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "text.secondary",
                }}
              >
                No pending duty schedule change requests at the moment.
              </Typography>
            </Box>
          ) : (
            pendingRequests.map((request) => {
              const staffName = request.staffer?.full_name || "Unknown Staffer";
              const avatarColor = getAvatarColor(
                request.staffer_id || request.id,
              );
              const avatarUrl = getAvatarUrl(request.staffer?.avatar_url);
              const isBusy = requestActionId === request.id;
              const reason = request.request_reason || "No reason provided.";
              const isExpanded = !!expandedReasonById[request.id];
              const isReasonLong = reason.length > REASON_PREVIEW_LIMIT;
              const reasonPreview = isReasonLong
                ? `${reason.slice(0, REASON_PREVIEW_LIMIT)}...`
                : reason;

              return (
                <Box
                  key={request.id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    flexWrap: "wrap",
                    px: 1.25,
                    py: 1.1,
                    borderRadius: "10px",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "#ffffff",
                    border: `1px solid ${border}`,
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.1,
                      minWidth: 0,
                      flex: "1 1 360px",
                    }}
                  >
                    <Avatar
                      src={avatarUrl}
                      sx={{
                        width: 32,
                        height: 32,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        backgroundColor: avatarColor.bg,
                        color: avatarColor.color,
                      }}
                    >
                      {!avatarUrl && getInitials(staffName)}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "text.primary",
                        }}
                      >
                        {staffName}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.72rem",
                          color: "text.secondary",
                        }}
                      >
                        {request.staffer?.section || "No Section"}
                        {request.staffer?.role
                          ? ` • ${request.staffer.role}`
                          : ""}
                        {request.created_at
                          ? ` • Requested ${formatDateTime(request.created_at)}`
                          : ""}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.72rem",
                          color: "text.secondary",
                          mt: 0.5,
                          whiteSpace: "pre-line",
                          wordBreak: "break-word",
                        }}
                      >
                        {`Reason: ${isExpanded ? reason : reasonPreview}`}
                      </Typography>
                      {isReasonLong && (
                        <Box
                          onClick={() => toggleReasonExpanded(request.id)}
                          sx={{
                            mt: 0.35,
                            display: "inline-flex",
                            fontFamily: dm,
                            fontSize: "0.7rem",
                            fontWeight: 700,
                            color: "#8a6a00",
                            cursor: "pointer",
                            userSelect: "none",
                          }}
                        >
                          {isExpanded ? "View less" : "View more"}
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flexWrap: "wrap",
                    }}
                  >
                    <DayPill dayIndex={request.current_duty_day} />
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.72rem",
                        color: "text.secondary",
                        fontWeight: 700,
                      }}
                    >
                      →
                    </Typography>
                    <DayPill dayIndex={request.requested_duty_day} accent />
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.8,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      onClick={!isBusy ? () => openRejectDialog(request) : undefined}
                      sx={{
                        px: 1.5,
                        height: 34,
                        borderRadius: "10px",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: isBusy ? "default" : "pointer",
                        border: "1px solid rgba(220,38,38,0.18)",
                        backgroundColor: isDark
                          ? "rgba(220,38,38,0.12)"
                          : "rgba(220,38,38,0.06)",
                        color: "#dc2626",
                        fontFamily: dm,
                        fontSize: "0.76rem",
                        fontWeight: 600,
                        opacity: isBusy ? 0.6 : 1,
                      }}
                    >
                      Reject
                    </Box>
                    <Box
                      onClick={
                        !isBusy ? () => handleApproveRequest(request) : undefined
                      }
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.6,
                        px: 1.5,
                        height: 34,
                        borderRadius: "10px",
                        justifyContent: "center",
                        cursor: isBusy ? "default" : "pointer",
                        backgroundColor: GOLD,
                        color: "#1a1a1a",
                        fontFamily: dm,
                        fontSize: "0.76rem",
                        fontWeight: 700,
                        opacity: isBusy ? 0.7 : 1,
                      }}
                    >
                      {isBusy && (
                        <CircularProgress size={12} sx={{ color: "#1a1a1a" }} />
                      )}
                      Approve
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
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
            gap: 1.5,
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
                borderRadius: "10px",
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
              renderValue={(val) => (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  {isSectionFiltered && (
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        backgroundColor: GOLD,
                        flexShrink: 0,
                      }}
                    />
                  )}
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.primary",
                    }}
                  >
                    {val}
                  </Typography>
                </Box>
              )}
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                borderRadius: "10px",
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
                    <Box
                      component="span"
                      sx={{
                        minWidth: 20,
                        height: 18,
                        borderRadius: "99px",
                        px: 0.75,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected
                          ? GOLD
                          : count === 0
                            ? "transparent"
                            : isDark
                              ? "rgba(255,255,255,0.08)"
                              : "rgba(53,53,53,0.07)",
                        fontSize: "0.62rem",
                        fontWeight: 600,
                        lineHeight: 1,
                        color: isSelected
                          ? "#000"
                          : count === 0
                            ? "text.disabled"
                            : "text.secondary",
                        opacity: count === 0 ? 0.4 : 1,
                      }}
                    >
                      {count}
                    </Box>
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
              borderRadius: "10px",
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
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10]}
              disableRowSelectionOnClick
              rowHeight={52}
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
              gap: 2,
              flexShrink: 0,
              transform: isTableFullscreen ? "translateY(0)" : "translateY(-10px)",
              opacity: isTableFullscreen ? 1 : 0,
              transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
              transitionDelay: isTableFullscreen ? "0.1s" : "0s",
            }}
          >
            {/* Day buttons - inline */}
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
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.06)",
                    "&:hover": {
                      color: "text.primary",
                      backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(53,53,53,0.1)",
                    },
                  }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              )}
            </Box>

            {/* Spacer */}
            <Box sx={{ flex: 1 }} />

            {/* Search */}
            <FormControl size="small" sx={{ minWidth: 250, flex: 1 }}>
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
                  borderRadius: "10px",
                  backgroundColor: "#f7f7f8",
                  "&.MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: "rgba(0,0,0,0.12)" },
                  },
                }}
              />
            </FormControl>

            {/* Section Filter */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <Select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                IconComponent={UnfoldMoreIcon}
                displayEmpty
                renderValue={(val) => (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {isSectionFiltered && (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: GOLD,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.78rem",
                        color: "text.primary",
                      }}
                    >
                      {val}
                    </Typography>
                  </Box>
                )}
                sx={{
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  borderRadius: "10px",
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
                      <Box
                        component="span"
                        sx={{
                          minWidth: 20,
                          height: 18,
                          borderRadius: "99px",
                          px: 0.75,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: isSelected
                            ? GOLD
                            : count === 0
                              ? "transparent"
                              : isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(53,53,53,0.07)",
                          fontSize: "0.62rem",
                          fontWeight: 600,
                          lineHeight: 1,
                          color: isSelected
                            ? "#000"
                            : count === 0
                              ? "text.disabled"
                              : "text.secondary",
                          opacity: count === 0 ? 0.4 : 1,
                        }}
                      >
                        {count}
                      </Box>
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>

            {/* Export */}
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
              transform: isTableFullscreen ? "translateY(0)" : "translateY(20px)",
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
              {loading ? (
                <Box
                  sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <CircularProgress size={26} sx={{ color: GOLD }} />
                </Box>
              ) : (
                <DataGrid
                  rows={rows}
                  columns={columns}
                  pageSize={10}
                  rowsPerPageOptions={[10]}
                  disableRowSelectionOnClick
                  rowHeight={52}
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
        </Box>
      )}

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
            Reject Schedule Change
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
              ? `Reject ${rejectTarget.staffer?.full_name || "this staff member"}'s request to move from ${DAY_LABELS[rejectTarget.current_duty_day]} to ${DAY_LABELS[rejectTarget.requested_duty_day]}?`
              : "Reject this schedule change request?"}
          </Typography>

          <TextField
            label="Reason for rejection (optional)"
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
            Confirm Reject
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
            {`Adjust the slot capacity for ${DAY_LABELS[slotDialogDayIndex] || "this day"} in ${activeSemester?.name || "the active semester"}.`}
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
