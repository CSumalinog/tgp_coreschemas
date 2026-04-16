// src/pages/admin/DutyScheduleView.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  Button,
  Dialog,
  Drawer,
  IconButton,
  TextField,
  useTheme,
  FormControl,
  Select,
  MenuItem,
  OutlinedInput,
  InputAdornment,
  Divider,
  Tooltip,
} from "@mui/material";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { notifySpecificStaff } from "../../services/NotificationService";
import BrandedLoader from "../../components/common/BrandedLoader";
import NumberBadge from "../../components/common/NumberBadge";
import PageFilterToolbar from "../../components/common/PageFilterToolbar";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import {
  CONTROL_RADIUS,
  FILTER_BUTTON_HEIGHT,
  FILTER_SEARCH_FLEX,
  FILTER_GROUP_GAP,
  FILTER_INPUT_HEIGHT,
  FILTER_SEARCH_MAX_WIDTH,
  FILTER_SEARCH_MIN_WIDTH,
  MODAL_ACTION_HEIGHT,
  MODAL_COMPACT_WIDTH,
  MODAL_TAB_HEIGHT,
  TABLE_FIRST_COL_STAFF_FLEX,
  TABLE_FIRST_COL_STAFF_MIN_WIDTH,
  TABLE_USER_AVATAR_FONT_SIZE,
  TABLE_USER_AVATAR_SIZE,
} from "../../utils/layoutTokens";
import { useLocation, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMoreOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import ArrowOutwardIcon from "@mui/icons-material/ArrowOutwardOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CloseIcon from "@mui/icons-material/Close";

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
const MODAL_ACTION_BTN_HEIGHT = MODAL_ACTION_HEIGHT;
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

const normalizeDivision = (value) => {
  if (!value) return "";
  const clean = String(value).trim().toLowerCase();
  if (clean === "scribe" || clean === "scribes") return "Scribes";
  if (clean === "creative" || clean === "creatives") return "Creatives";
  return "";
};

const countDivision = (list = []) => {
  let scribes = 0;
  let creatives = 0;
  (list || []).forEach((item) => {
    const division = normalizeDivision(
      item?.staffer?.division || item?.division,
    );
    if (division === "Scribes") scribes += 1;
    if (division === "Creatives") creatives += 1;
  });
  return { scribes, creatives, total: scribes + creatives };
};

export default function DutyScheduleView() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = 0;

  const [schedules, setSchedules] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
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
  const [selectedDayFilter, setSelectedDayFilter] = useState(null);
  const [requestSearchText, setRequestSearchText] = useState("");
  const [requestStatusFilter, setRequestStatusFilter] = useState("All");
  const [divisionComposition, setDivisionComposition] = useState({
    current: { scribes: 0, creatives: 0 },
    requested: { scribes: 0, creatives: 0 },
  });
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [blackoutDateInput, setBlackoutDateInput] = useState("");
  const [blackoutReasonInput, setBlackoutReasonInput] = useState("");
  const [blackoutSaving, setBlackoutSaving] = useState(false);
  const [latestPublication, setLatestPublication] = useState(null);
  const [publications, setPublications] = useState([]);
  const [publicationsLoading, setPublicationsLoading] = useState(false);
  const [publishSaving, setPublishSaving] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState("");
  const [governanceMessage, setGovernanceMessage] = useState("");
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditSearchText, setAuditSearchText] = useState("");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [publishExportCsv, setPublishExportCsv] = useState(true);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [settingsPanelTab, setSettingsPanelTab] = useState("governance");
  const [selectedPublicationId, setSelectedPublicationId] = useState(null);
  const [snapshotViewerOpen, setSnapshotViewerOpen] = useState(false);
  const gridApiRef = useGridApiRef();
  const requestGridApiRef = useGridApiRef();
  const auditGridApiRef = useGridApiRef();

  const writeDutyAuditLog = useCallback(
    async ({
      actorId = null,
      actionType,
      targetStafferId = null,
      requestId = null,
      metadata = {},
    }) => {
      try {
        if (!activeSemester?.id || !actionType) return;
        await supabase.from("duty_schedule_audit_logs").insert({
          semester_id: activeSemester.id,
          actor_id: actorId,
          target_staffer_id: targetStafferId,
          request_id: requestId,
          action_type: actionType,
          metadata,
        });
      } catch {
        // Keep admin flow resilient if audit logging fails.
      }
    },
    [activeSemester?.id],
  );

  const loadSemesters = useCallback(async () => {
    const { data, error: semesterError } = await supabase
      .from("semesters")
      .select("*")
      .order("start_date", { ascending: false });

    if (semesterError) {
      setError(semesterError.message);
      return;
    }

    const rows = data || [];
    setSemesters(rows);
    if (!rows.length) {
      setSelectedSemesterId("");
      setActiveSemester(null);
      return;
    }

    const fallback = rows.find((semester) => semester.is_active) || rows[0];
    setSelectedSemesterId((prev) =>
      prev && rows.some((semester) => semester.id === prev)
        ? prev
        : fallback.id,
    );
  }, []);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  useEffect(() => {
    if (!selectedSemesterId) {
      setActiveSemester(null);
      return;
    }
    setActiveSemester(
      semesters.find((semester) => semester.id === selectedSemesterId) || null,
    );
  }, [semesters, selectedSemesterId]);

  useRealtimeNotify("semesters", loadSemesters, null, {
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
        `id, staffer_id, current_duty_day, requested_duty_day, request_reason, status, created_at, reviewed_at, review_notes, staffer:staffer_id ( id, full_name, section, role, division, position, avatar_url )`,
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

  const loadBlackoutDates = useCallback(async () => {
    if (!activeSemester?.id) {
      setBlackoutDates([]);
      return;
    }

    const { data, error: fetchErr } = await supabase
      .from("duty_schedule_blackout_dates")
      .select("id, blackout_date, reason, created_at")
      .eq("semester_id", activeSemester.id)
      .order("blackout_date", { ascending: true });

    if (fetchErr) {
      setError(fetchErr.message);
      return;
    }

    setBlackoutDates(data || []);
  }, [activeSemester]);

  useEffect(() => {
    loadBlackoutDates();
  }, [loadBlackoutDates]);

  const loadPublications = useCallback(async () => {
    if (!activeSemester?.id) {
      setPublications([]);
      setLatestPublication(null);
      setSelectedPublicationId(null);
      return;
    }

    setPublicationsLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("duty_schedule_publications")
      .select("id, version, published_at, published_by, snapshot")
      .eq("semester_id", activeSemester.id)
      .order("version", { ascending: false })
      .limit(20);

    if (fetchErr) {
      setError(fetchErr.message);
      setPublicationsLoading(false);
      return;
    }

    const publicationRows = data || [];
    setPublications(publicationRows);
    setLatestPublication(publicationRows[0] || null);
    setSelectedPublicationId((prev) =>
      publicationRows.some((row) => row.id === prev)
        ? prev
        : (publicationRows[0]?.id ?? null),
    );
    setPublicationsLoading(false);
  }, [activeSemester]);

  useEffect(() => {
    loadPublications();
  }, [loadPublications]);

  const loadAuditLogs = useCallback(async () => {
    if (!activeSemester?.id) {
      setAuditLogs([]);
      return;
    }

    const { data, error: fetchErr } = await supabase
      .from("duty_schedule_audit_logs")
      .select(
        "id, action_type, metadata, created_at, actor:profiles!actor_id(id, full_name), target:profiles!target_staffer_id(id, full_name)",
      )
      .eq("semester_id", activeSemester.id)
      .order("created_at", { ascending: false })
      .limit(300);

    if (fetchErr) {
      setError(fetchErr.message);
      return;
    }

    setAuditLogs(data || []);
  }, [activeSemester]);

  useEffect(() => {
    loadAuditLogs();
  }, [loadAuditLogs]);

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

  useRealtimeNotify(
    "duty_schedule_blackout_dates",
    loadBlackoutDates,
    activeSemester?.id ? `semester_id=eq.${activeSemester.id}` : null,
    {
      title: "Duty Blackout Dates",
      sound: false,
    },
  );

  useRealtimeNotify(
    "duty_schedule_publications",
    loadPublications,
    activeSemester?.id ? `semester_id=eq.${activeSemester.id}` : null,
    {
      title: "Duty Publication",
      sound: false,
    },
  );

  useRealtimeNotify(
    "duty_schedule_audit_logs",
    loadAuditLogs,
    activeSemester?.id ? `semester_id=eq.${activeSemester.id}` : null,
    {
      title: "Duty Audit",
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
  const selectedPublication = useMemo(
    () =>
      publications.find(
        (publication) => publication.id === selectedPublicationId,
      ) ||
      latestPublication ||
      null,
    [latestPublication, publications, selectedPublicationId],
  );
  const settingsPanelMeta = useMemo(
    () => ({
      governance: {
        title: "Governance",
        description:
          "Publish final rosters, inspect versions, and export approved snapshots.",
      },
      audit: {
        title: "Audit Trail",
        description: "Review change history and export activity logs.",
      },
    }),
    [],
  );
  const activeSettingsMeta =
    settingsPanelMeta[settingsPanelTab] || settingsPanelMeta.governance;

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

  const handleExportAuditCsv = () => {
    auditGridApiRef.current?.exportDataAsCsv({
      utf8WithBom: true,
      fileName: "duty-audit-export",
    });
  };

  const handleManageDutySchedule = () => {
    setSettingsDrawerOpen(false);
    navigate("/admin/calendar-management", {
      state: { openDutySettings: true },
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

      await loadSemesters();
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

  const getProjectedDivisionForRequest = useCallback(
    (request) => {
      const sourceDay = request?.current_duty_day;
      const targetDay = request?.requested_duty_day;
      const actorDivision = normalizeDivision(request?.staffer?.division);

      const sourceList = schedules.filter(
        (entry) => entry.duty_day === sourceDay,
      );
      const targetList = schedules.filter(
        (entry) => entry.duty_day === targetDay,
      );
      let source = countDivision(sourceList);
      let target = countDivision(targetList);

      if (actorDivision === "Scribes") {
        source = {
          ...source,
          scribes: Math.max(0, source.scribes - 1),
          total: Math.max(0, source.total - 1),
        };
        target = {
          ...target,
          scribes: target.scribes + 1,
          total: target.total + 1,
        };
      }

      if (actorDivision === "Creatives") {
        source = {
          ...source,
          creatives: Math.max(0, source.creatives - 1),
          total: Math.max(0, source.total - 1),
        };
        target = {
          ...target,
          creatives: target.creatives + 1,
          total: target.total + 1,
        };
      }

      const sourceViolation =
        source.total > 0 && (source.scribes === 0 || source.creatives === 0);
      const targetViolation =
        target.total > 0 && (target.scribes === 0 || target.creatives === 0);

      return {
        source,
        target,
        sourceViolation,
        targetViolation,
        actorDivision,
      };
    },
    [schedules],
  );

  const approveRequestInternal = useCallback(
    async (request, reviewerId, { closeDetails = false } = {}) => {
      if (!activeSemester?.id || !request?.id) return false;

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
        return false;
      }

      if (currentSchedule.duty_day !== request.current_duty_day) {
        setError(
          "This request is stale because the staff member's approved duty day already changed.",
        );
        await loadPendingRequests();
        await loadSchedules();
        return false;
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
        return false;
      }

      const projection = getProjectedDivisionForRequest(request);
      if (
        projection.actorDivision &&
        (projection.sourceViolation || projection.targetViolation)
      ) {
        const blockedDay = projection.sourceViolation
          ? request.current_duty_day
          : request.requested_duty_day;
        setError(
          `Balance policy: ${DAY_LABELS[blockedDay]} must keep both Scribes and Creatives assigned.`,
        );
        return false;
      }

      const conflicts = await findScheduleConflicts(
        request.staffer_id,
        request.current_duty_day,
      );

      if (conflicts.length > 0) {
        setError(
          `${request.staffer?.full_name || "This staff member"} still has upcoming assignments on ${DAY_LABELS[request.current_duty_day]}. Resolve those before approving the change.`,
        );
        return false;
      }

      const { error: approveErr } = await supabase.rpc(
        "approve_duty_schedule_change_request",
        {
          p_request_id: request.id,
          p_reviewer_id: reviewerId || null,
        },
      );

      if (approveErr) throw approveErr;

      await notifySpecificStaff({
        staffIds: [request.staffer_id],
        type: "duty_schedule_change_approved",
        title: "Duty Day Change Approved",
        message: `Your request to change from ${DAY_LABELS[request.current_duty_day]} to ${DAY_LABELS[request.requested_duty_day]} was approved.`,
        requestId: null,
        createdBy: reviewerId || null,
        targetPath: "/staff/my-schedule",
        targetPayload: { openDutyChangeRequestId: request.id },
      });

      await loadSchedules();
      await loadPendingRequests();

      if (closeDetails) {
        setRequestDetailsOpen(false);
        setRequestDetailsTarget(null);
      }

      return true;
    },
    [
      activeSemester,
      dayCapacities,
      findScheduleConflicts,
      getProjectedDivisionForRequest,
      loadPendingRequests,
      loadSchedules,
      schedules,
    ],
  );

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
        await approveRequestInternal(request, user?.id || null, {
          closeDetails: true,
        });
      } catch (actionErr) {
        setError(
          actionErr.message || "Failed to approve schedule change request.",
        );
      } finally {
        setRequestActionId("");
      }
    },
    [activeSemester, approveRequestInternal],
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

        await writeDutyAuditLog({
          actorId: user?.id || null,
          actionType: "duty_change_rejected",
          targetStafferId: request.staffer_id,
          requestId: request.id,
          metadata: {
            from_day: request.current_duty_day,
            to_day: request.requested_duty_day,
            reason: reason.trim() || null,
          },
        });

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
    [loadPendingRequests, writeDutyAuditLog],
  );

  const openRejectDialog = useCallback((request) => {
    if (!request?.id) return;
    setRequestDetailsOpen(false);
    setRequestDetailsTarget(null);
    setRejectTarget(request);
    setRejectReason("");
    setRejectDialogOpen(true);
  }, []);

  const getDayDivisionComposition = useCallback(
    (dayIndex) => {
      if (dayIndex === null || !schedules) return { scribes: 0, creatives: 0 };
      const dayStaffers = schedules.filter((s) => s.duty_day === dayIndex);
      const scribes = dayStaffers.filter(
        (s) => s.staffer?.division === "Scribes",
      ).length;
      const creatives = dayStaffers.filter(
        (s) => s.staffer?.division === "Creatives",
      ).length;
      return { scribes, creatives };
    },
    [schedules],
  );

  const openRequestDetails = useCallback(
    (request) => {
      if (!request?.id) return;
      setRequestDetailsTarget(request);
      const currentComp = getDayDivisionComposition(request.current_duty_day);
      const requestedComp = getDayDivisionComposition(
        request.requested_duty_day,
      );
      setDivisionComposition({
        current: currentComp,
        requested: requestedComp,
      });
      setRequestDetailsOpen(true);
    },
    [getDayDivisionComposition],
  );

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

  const exportSnapshotCsv = useCallback((snapshot, version) => {
    if (!snapshot?.length) return;
    const header = [
      "Full Name",
      "Section",
      "Division",
      "Role",
      "Duty Day",
    ].join(",");
    const csvRows = snapshot.map((row) =>
      [
        row.full_name,
        row.section,
        row.division,
        row.role,
        DAY_LABELS[row.duty_day] ?? row.duty_day,
      ]
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header, ...csvRows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `duty-roster-v${version}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const openSnapshotViewer = useCallback(
    (
      publicationId = selectedPublication?.id ?? latestPublication?.id ?? null,
    ) => {
      if (publicationId) {
        setSelectedPublicationId(publicationId);
      }
      setSnapshotViewerOpen(true);
    },
    [latestPublication?.id, selectedPublication?.id],
  );

  const handlePublishRoster = useCallback(async () => {
    if (!activeSemester?.id) return;
    if (activeSemester.scheduling_open) {
      setGovernanceMessage(
        "Close scheduling first before publishing a final roster.",
      );
      return;
    }

    setPublishSaving(true);
    setError("");
    setGovernanceMessage("");
    setPublishSuccess("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: latestRow, error: versionErr } = await supabase
        .from("duty_schedule_publications")
        .select("version")
        .eq("semester_id", activeSemester.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (versionErr) throw versionErr;

      const nextVersion = (latestRow?.version || 0) + 1;
      const snapshot = schedules.map((entry) => ({
        staffer_id: entry.staffer?.id || null,
        full_name: entry.staffer?.full_name || null,
        section: entry.staffer?.section || null,
        role: entry.staffer?.role || null,
        division: entry.staffer?.division || null,
        duty_day: entry.duty_day,
      }));

      const { error: publishErr } = await supabase
        .from("duty_schedule_publications")
        .insert({
          semester_id: activeSemester.id,
          published_by: user?.id || null,
          version: nextVersion,
          snapshot,
        });

      if (publishErr) throw publishErr;

      await writeDutyAuditLog({
        actorId: user?.id || null,
        actionType: "duty_roster_published",
        metadata: {
          version: nextVersion,
          rows: snapshot.length,
          scheduling_open: activeSemester.scheduling_open,
        },
      });

      await loadPublications();
      if (publishExportCsv) exportSnapshotCsv(snapshot, nextVersion);
      setPublishConfirmOpen(false);
      setPublishSuccess(`Roster published as version ${nextVersion}.`);
    } catch (publishErr) {
      setGovernanceMessage(
        publishErr.message || "Failed to publish duty roster.",
      );
    } finally {
      setPublishSaving(false);
    }
  }, [
    activeSemester,
    exportSnapshotCsv,
    loadPublications,
    publishExportCsv,
    schedules,
    writeDutyAuditLog,
  ]);

  const handleAddBlackoutDate = useCallback(async () => {
    if (!activeSemester?.id || !blackoutDateInput) return;

    setBlackoutSaving(true);
    setError("");
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { error: insertErr } = await supabase
        .from("duty_schedule_blackout_dates")
        .insert({
          semester_id: activeSemester.id,
          blackout_date: blackoutDateInput,
          reason: blackoutReasonInput.trim() || null,
          created_by: user?.id || null,
        });

      if (insertErr) throw insertErr;

      await writeDutyAuditLog({
        actorId: user?.id || null,
        actionType: "duty_blackout_date_added",
        metadata: {
          blackout_date: blackoutDateInput,
          reason: blackoutReasonInput.trim() || null,
        },
      });

      setBlackoutDateInput("");
      setBlackoutReasonInput("");
      await loadBlackoutDates();
    } catch (insertErr) {
      setError(insertErr.message || "Failed to add blackout date.");
    } finally {
      setBlackoutSaving(false);
    }
  }, [
    activeSemester,
    blackoutDateInput,
    blackoutReasonInput,
    loadBlackoutDates,
    writeDutyAuditLog,
  ]);

  const handleRemoveBlackoutDate = useCallback(
    async (blackoutRow) => {
      if (!blackoutRow?.id) return;
      setBlackoutSaving(true);
      setError("");
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        const { error: deleteErr } = await supabase
          .from("duty_schedule_blackout_dates")
          .delete()
          .eq("id", blackoutRow.id);

        if (deleteErr) throw deleteErr;

        await writeDutyAuditLog({
          actorId: user?.id || null,
          actionType: "duty_blackout_date_removed",
          metadata: {
            blackout_date: blackoutRow.blackout_date,
          },
        });

        await loadBlackoutDates();
      } catch (deleteErr) {
        setError(deleteErr.message || "Failed to remove blackout date.");
      } finally {
        setBlackoutSaving(false);
      }
    },
    [loadBlackoutDates, writeDutyAuditLog],
  );

  const handleOpenPublishConfirm = useCallback(() => {
    if (!activeSemester?.id) return;
    if (activeSemester.scheduling_open) {
      setGovernanceMessage(
        "Close scheduling first before publishing a final roster.",
      );
      return;
    }
    setError("");
    setGovernanceMessage("");
    setPublishSuccess("");
    setPublishConfirmOpen(true);
  }, [activeSemester]);

  const handleReopenScheduling = useCallback(async () => {
    if (!activeSemester?.id) return;
    const { error: reopenErr } = await supabase
      .from("semesters")
      .update({ scheduling_open: true })
      .eq("id", activeSemester.id);
    if (reopenErr) {
      setError(reopenErr.message || "Failed to reopen scheduling.");
      return;
    }
    setGovernanceMessage("");
    await loadSemesters();
  }, [activeSemester, loadSemesters]);

  const rows = filteredByDay.map((s) => {
    const relatedRequests = (pendingRequests || []).filter(
      (request) => request.staffer_id === s.staffer?.id,
    );
    const linkedRequest =
      relatedRequests.find((request) => request.status === "pending") ||
      relatedRequests[0] ||
      null;

    return {
      id: s.id,
      staffer_id: s.staffer?.id || null,
      full_name: s.staffer?.full_name || "—",
      avatar_url: s.staffer?.avatar_url || null,
      duty_day: s.duty_day,
      request_count: requestCountPerStaffer[s.staffer?.id] || 0,
      linkedRequest,
    };
  });

  const columns = [
    {
      field: "full_name",
      headerName: "Staff",
      headerAlign: "left",
      flex: 1.45,
      minWidth: TABLE_FIRST_COL_STAFF_MIN_WIDTH,
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
                width: TABLE_USER_AVATAR_SIZE,
                height: TABLE_USER_AVATAR_SIZE,
                fontSize: TABLE_USER_AVATAR_FONT_SIZE,
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
            <Box
              onClick={(e) => {
                e.stopPropagation();
                if (!p.row.staffer_id) return;
                navigate(
                  `/admin/staffers-management?focus=${encodeURIComponent(String(p.row.staffer_id))}`,
                );
              }}
              sx={{
                ml: "auto",
                width: 24,
                height: 24,
                borderRadius: "6px",
                border: "1px solid rgba(0,0,0,0.18)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.disabled",
                backgroundColor: "#ffffff",
                cursor: p.row.staffer_id ? "pointer" : "not-allowed",
                opacity: p.row.staffer_id ? 1 : 0.35,
                transition: "all 0.15s",
                "&:hover": p.row.staffer_id
                  ? {
                      borderColor: "#212121",
                      color: "#212121",
                    }
                  : undefined,
              }}
              title="Open in Staffers Management"
            >
              <ArrowForwardIcon sx={{ fontSize: 13 }} />
            </Box>
          </Box>
        );
      },
    },
    {
      field: "duty_day",
      headerName: "Duty Day",
      headerAlign: "left",
      flex: 0.95,
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
    {
      field: "request_count",
      headerName: "Changes of Requests Used",
      flex: 1.05,
      minWidth: 235,
      align: "center",
      headerAlign: "left",
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
                fontWeight: 600,
                color: isQuotaExhausted ? "#b91c1c" : "text.primary",
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
      field: "request_email",
      headerName: "Email",
      width: 92,
      align: "center",
      headerAlign: "left",
      sortable: false,
      filterable: false,
      renderCell: (p) => {
        const hasLinkedRequest = Boolean(p.row.linkedRequest);
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              onClick={() => {
                if (hasLinkedRequest) openRequestDetails(p.row.linkedRequest);
              }}
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(0,0,0,0.14)",
                backgroundColor: "#ffffff",
                color: "rgba(0,0,0,0.75)",
                cursor: hasLinkedRequest ? "pointer" : "not-allowed",
                opacity: hasLinkedRequest ? 1 : 0.35,
                transition: "background-color 0.15s, border-color 0.15s",
                "&:hover": hasLinkedRequest
                  ? {
                      backgroundColor: "#f7f7f7",
                      borderColor: "rgba(0,0,0,0.24)",
                    }
                  : undefined,
              }}
              title={
                hasLinkedRequest
                  ? "Open schedule change request"
                  : "No schedule change request"
              }
            >
              <MailOutlineIcon sx={{ fontSize: 15 }} />
            </Box>
          </Box>
        );
      },
    },
  ];

  const requestRows = filteredRequests.map((request) => ({
    id: request.id,
    staffer_name: request.staffer?.full_name || "Unknown Staffer",
    duty_day_label: `${DAY_LABELS[request.current_duty_day] || "-"} -> ${DAY_LABELS[request.requested_duty_day] || "-"}`,
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

  const auditTokens = auditSearchText
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  const auditRows = (auditLogs || [])
    .filter((log) => {
      if (!auditTokens.length) return true;
      const content = [
        log.actor?.full_name,
        log.target?.full_name,
        log.action_type,
        log.metadata?.reason,
        DAY_LABELS[log.metadata?.from_day],
        DAY_LABELS[log.metadata?.to_day],
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return auditTokens.every((token) => content.includes(token));
    })
    .map((log) => ({
      id: log.id,
      created_at: log.created_at,
      actor_name: log.actor?.full_name || "System",
      target_name: log.target?.full_name || "-",
      action_type: log.action_type,
      from_day:
        log.metadata?.from_day !== null && log.metadata?.from_day !== undefined
          ? DAY_LABELS[log.metadata.from_day]
          : "-",
      to_day:
        log.metadata?.to_day !== null && log.metadata?.to_day !== undefined
          ? DAY_LABELS[log.metadata.to_day]
          : "-",
      reason: log.metadata?.reason || "-",
    }));

  const requestColumns = [
    {
      field: "staffer_name",
      headerName: "Staff",
      headerAlign: "left",
      flex: TABLE_FIRST_COL_STAFF_FLEX,
      minWidth: TABLE_FIRST_COL_STAFF_MIN_WIDTH,
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
                width: TABLE_USER_AVATAR_SIZE,
                height: TABLE_USER_AVATAR_SIZE,
                fontSize: TABLE_USER_AVATAR_FONT_SIZE,
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
            <Box
              onClick={(e) => {
                e.stopPropagation();
                navigate("/admin/staffers-management");
              }}
              sx={{
                width: 24,
                height: 24,
                borderRadius: "6px",
                border: "1px solid rgba(0,0,0,0.18)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                color: "text.disabled",
                backgroundColor: "#ffffff",
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": {
                  borderColor: "#212121",
                  color: "#212121",
                },
              }}
              title="Open staffers management"
            >
              <ArrowForwardIcon sx={{ fontSize: 13 }} />
            </Box>
          </Box>
        );
      },
    },
    {
      field: "duty_day_label",
      headerName: "Duty Day",
      headerAlign: "left",
      flex: 1,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "request_count",
      headerName: "Changes of Schedule Used",
      width: 176,
      align: "center",
      headerAlign: "left",
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
                fontWeight: 600,
                color: isQuotaExhausted ? "#b91c1c" : "text.primary",
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
      field: "actions",
      headerName: "Email",
      width: 92,
      align: "center",
      headerAlign: "left",
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box
            onClick={() => openRequestDetails(p.row.rawRequest)}
            sx={{
              width: 30,
              height: 30,
              borderRadius: 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              border: "1px solid rgba(0,0,0,0.2)",
              backgroundColor: "#ffffff",
              color: "#111111",
              transition: "background-color 0.15s, border-color 0.15s",
              "&:hover": {
                backgroundColor: "#f5f5f5",
                borderColor: "rgba(0,0,0,0.35)",
              },
            }}
            title="Open schedule request"
          >
            <MailOutlineIcon sx={{ fontSize: 16 }} />
          </Box>
        </Box>
      ),
    },
  ];

  const auditColumns = [
    {
      field: "created_at",
      headerName: "Time",
      flex: 0.95,
      minWidth: 130,
      renderCell: (p) => <MetaCell>{formatDateTime(p.value)}</MetaCell>,
    },
    {
      field: "actor_name",
      headerName: "Actor",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "target_name",
      headerName: "Target",
      flex: 1,
      minWidth: 130,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "action_type",
      headerName: "Action",
      flex: 1.25,
      minWidth: 150,
      renderCell: (p) => (
        <MetaCell>{String(p.value || "-").replaceAll("_", " ")}</MetaCell>
      ),
    },
    {
      field: "from_day",
      headerName: "From",
      flex: 0.8,
      minWidth: 95,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "to_day",
      headerName: "To",
      flex: 0.8,
      minWidth: 95,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "reason",
      headerName: "Reason / Note",
      flex: 1.6,
      minWidth: 220,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
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
          mb: 1.5,
          flexShrink: 0,
          display: "flex",
          flexDirection: "column",
          gap: 0.25,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          {semesters.length > 0 && (
            <PageFilterToolbar
              mb={0}
              gap={FILTER_GROUP_GAP}
              sx={{
                justifyContent: "flex-start",
                width: "100%",
                minWidth: "100%",
                px: 1.25,
                py: 1,
                borderRadius: CONTROL_RADIUS,
                border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
                backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f3f3f4",
              }}
            >
              {activeTab === 1 ? (
                <>
                  <FormControl
                    size="small"
                    sx={{
                      flex: FILTER_SEARCH_FLEX,
                      minWidth: FILTER_SEARCH_MIN_WIDTH,
                      maxWidth: FILTER_SEARCH_MAX_WIDTH,
                    }}
                  >
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

                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <Select
                      value={selectedSemesterId}
                      onChange={(e) => setSelectedSemesterId(e.target.value)}
                      IconComponent={UnfoldMoreIcon}
                      displayEmpty
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
                      {semesters.map((semester) => (
                        <MenuItem
                          key={semester.id}
                          value={semester.id}
                          sx={{ fontFamily: dm, fontSize: "0.78rem" }}
                        >
                          {getSemesterDisplayName(semester)}
                          {semester.is_active ? " (Active)" : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ flex: 1 }} />

                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{
                      mr: 0.75,
                      height: 18,
                      alignSelf: "center",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(0,0,0,0.18)",
                    }}
                  />

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

                  <Box
                    onClick={() =>
                      navigate("/admin/calendar-management", {
                        state: { openDutySettings: true },
                      })
                    }
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      px: 1.5,
                      height: ACTION_BTN_HEIGHT,
                      borderRadius: CONTROL_RADIUS,
                      cursor: "pointer",
                      border: "1px solid rgba(0,0,0,0.12)",
                      color: "text.secondary",
                      backgroundColor: "#f7f7f8",
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      fontWeight: 500,
                      transition: "all 0.15s",
                      flexShrink: 0,
                      "&:hover": {
                        borderColor: "rgba(53,53,53,0.3)",
                        color: "text.primary",
                        backgroundColor: "#ededee",
                      },
                    }}
                    title="Open duty blocking settings"
                  >
                    Duty Blocking
                  </Box>

                  <Box
                    onClick={() => {
                      setSettingsPanelTab("governance");
                      setSettingsDrawerOpen(true);
                    }}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: ACTION_BTN_HEIGHT,
                      height: ACTION_BTN_HEIGHT,
                      borderRadius: CONTROL_RADIUS,
                      cursor: "pointer",
                      border: "1px solid rgba(0,0,0,0.12)",
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
                    title="Open governance and audit"
                  >
                    <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                  </Box>
                </>
              ) : (
                <>
                  <FormControl
                    size="small"
                    sx={{
                      flex: FILTER_SEARCH_FLEX,
                      minWidth: FILTER_SEARCH_MIN_WIDTH,
                      maxWidth: FILTER_SEARCH_MAX_WIDTH,
                    }}
                  >
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
                        borderRadius: CONTROL_RADIUS,
                        height: FILTER_INPUT_HEIGHT,
                        backgroundColor: "#f7f7f8",
                        "& .MuiOutlinedInput-notchedOutline": {
                          borderColor: "rgba(0,0,0,0.12)",
                        },
                      }}
                    />
                  </FormControl>

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
                            : schedules.filter(
                                (s) => s.staffer?.section === val,
                              ).length;
                        return (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
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
                              activeBg="#F5C52B"
                              inactiveBg={
                                isDark
                                  ? "rgba(255,255,255,0.28)"
                                  : "rgba(53,53,53,0.45)"
                              }
                              textColor="#ffffff"
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
                            : schedules.filter(
                                (s) => s.staffer?.section === sec,
                              ).length;
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
                              activeBg="#F5C52B"
                              inactiveBg={
                                isDark
                                  ? "rgba(255,255,255,0.28)"
                                  : "rgba(53,53,53,0.45)"
                              }
                              textColor="#ffffff"
                              fontFamily={dm}
                              fontSize="0.56rem"
                              sx={{ opacity: count === 0 ? 0.5 : 1 }}
                            />
                          </MenuItem>
                        );
                      })}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ minWidth: 220 }}>
                    <Select
                      value={selectedSemesterId}
                      onChange={(e) => setSelectedSemesterId(e.target.value)}
                      IconComponent={UnfoldMoreIcon}
                      displayEmpty
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
                      {semesters.map((semester) => (
                        <MenuItem
                          key={semester.id}
                          value={semester.id}
                          sx={{ fontFamily: dm, fontSize: "0.78rem" }}
                        >
                          {getSemesterDisplayName(semester)}
                          {semester.is_active ? " (Active)" : ""}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ flex: 1 }} />

                  <Divider
                    orientation="vertical"
                    flexItem
                    sx={{
                      mr: 0.75,
                      height: 18,
                      alignSelf: "center",
                      borderColor: isDark
                        ? "rgba(255,255,255,0.18)"
                        : "rgba(0,0,0,0.18)",
                    }}
                  />

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

                  <Box
                    onClick={() => {
                      setSettingsPanelTab("governance");
                      setSettingsDrawerOpen(true);
                    }}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: ACTION_BTN_HEIGHT,
                      height: ACTION_BTN_HEIGHT,
                      borderRadius: CONTROL_RADIUS,
                      cursor: "pointer",
                      border: "1px solid rgba(0,0,0,0.12)",
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
                    title="Open governance and audit"
                  >
                    <SettingsOutlinedIcon sx={{ fontSize: 16 }} />
                  </Box>
                </>
              )}
            </PageFilterToolbar>
          )}
        </Box>

        {activeSemester && !canApprovePendingRequests && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              flexWrap: "wrap",
              mt: 0.1,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.25,
                py: 0.35,
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
                  whiteSpace: "nowrap",
                }}
              >
                SCHEDULING CLOSED
              </Typography>
              <Box
                onClick={handleReopenScheduling}
                sx={{
                  fontFamily: dm,
                  fontSize: "0.66rem",
                  fontWeight: 600,
                  color: "#9a6b00",
                  cursor: "pointer",
                  textDecoration: "underline",
                  whiteSpace: "nowrap",
                  "&:hover": { color: "#704f00" },
                }}
              >
                Reopen
              </Box>
            </Box>
          </Box>
        )}
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
          No semester available. Go to Semester Management to set one up.
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
                  "& .day-card-actions": {
                    opacity: 0,
                    transform: "translateY(-2px)",
                    pointerEvents: "none",
                    transition: "opacity 0.18s ease, transform 0.18s ease",
                  },
                  "&:hover .day-card-actions, &:focus-within .day-card-actions":
                    {
                      opacity: 1,
                      transform: "translateY(0)",
                      pointerEvents: "auto",
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
                  <Box
                    className="day-card-actions"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
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

      {publishSuccess && (
        <Alert
          severity="success"
          sx={{
            mb: 2,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          {publishSuccess}
        </Alert>
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

      {/* ── Table ── */}
      {activeSemester && activeTab === 0 && (
        <Box sx={{ flex: 1, minHeight: 0, width: "100%", overflowX: "hidden" }}>
          <Box
            sx={{
              minWidth: 0,
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
                <CircularProgress size={22} sx={{ color: "text.secondary" }} />
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

      <Dialog
        open={requestDetailsOpen}
        onClose={closeRequestDetails}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: {
          sx: {
            borderRadius: "10px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        } }}
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
            py: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1.25,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "flex-start",
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "text.primary",
                minWidth: { sm: 132 },
                pt: { sm: 0.35 },
              }}
            >
              Staff:
            </Typography>
            <Box sx={{ flex: 1 }}>
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
                  lineHeight: 1.45,
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
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "flex-start",
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "text.primary",
                minWidth: { sm: 132 },
                pt: { sm: 1 },
              }}
            >
              Requested Change:
            </Typography>
            <Box
              sx={{
                flex: 1,
                width: "100%",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                px: 1.35,
                py: 1.1,
                backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "#fafafa",
              }}
            >
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
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "flex-start",
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "text.primary",
                minWidth: { sm: 132 },
                pt: { sm: 1 },
              }}
            >
              Team Composition:
            </Typography>
            <Box
              sx={{
                flex: 1,
                width: "100%",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                px: 1.35,
                py: 1.1,
                backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "#fafafa",
              }}
            >
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    px: 1,
                    py: 0.9,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(255,255,255,0.7)",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "text.secondary",
                      mb: 0.75,
                    }}
                  >
                    {DAY_LABELS[requestDetailsTarget?.current_duty_day]} (Today)
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.55 }}>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.76rem",
                        color: "text.primary",
                      }}
                    >
                      Scribes:{" "}
                      <Box component="span" sx={{ color: "#1e40af", fontWeight: 700 }}>
                        {divisionComposition.current.scribes}
                      </Box>
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.76rem",
                        color: "text.primary",
                      }}
                    >
                      Creatives:{" "}
                      <Box component="span" sx={{ color: "#c2410c", fontWeight: 700 }}>
                        {divisionComposition.current.creatives}
                      </Box>
                    </Typography>
                  </Box>
                </Box>

                <Box
                  sx={{
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    px: 1,
                    py: 0.9,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(255,255,255,0.7)",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      color: "text.secondary",
                      mb: 0.75,
                    }}
                  >
                    {DAY_LABELS[requestDetailsTarget?.requested_duty_day]} (After)
                  </Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.55 }}>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.76rem",
                        color: "text.primary",
                      }}
                    >
                      Scribes:{" "}
                      <Box component="span" sx={{ color: "#1e40af", fontWeight: 700 }}>
                        {divisionComposition.requested.scribes}
                      </Box>
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.76rem",
                        color: "text.primary",
                      }}
                    >
                      Creatives:{" "}
                      <Box component="span" sx={{ color: "#c2410c", fontWeight: 700 }}>
                        {divisionComposition.requested.creatives}
                      </Box>
                    </Typography>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "flex-start",
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "text.primary",
                minWidth: { sm: 132 },
                pt: { sm: 1 },
              }}
            >
              Reason:
            </Typography>
            <Box
              sx={{
                flex: 1,
                width: "100%",
                borderRadius: "10px",
                border: `1px solid ${border}`,
                px: 1.25,
                py: 1.05,
                minHeight: 88,
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
              <Button
                onClick={
                  requestActionId === requestDetailsTarget?.id
                    ? undefined
                    : () => openRejectDialog(requestDetailsTarget)
                }
                variant="outlined"
                color="error"
                disabled={requestActionId === requestDetailsTarget?.id}
                sx={{
                  minWidth: 112,
                  height: MODAL_ACTION_BTN_HEIGHT,
                  borderRadius: "10px",
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                }}
              >
                Decline
              </Button>
              <Button
                onClick={
                  requestActionId === requestDetailsTarget?.id ||
                  !requestDetailsTarget ||
                  !canApprovePendingRequests
                    ? undefined
                    : () => handleApproveRequest(requestDetailsTarget)
                }
                variant="contained"
                disabled={
                  requestActionId === requestDetailsTarget?.id ||
                  !requestDetailsTarget ||
                  !canApprovePendingRequests
                }
                startIcon={
                  requestActionId === requestDetailsTarget?.id ? (
                    <CircularProgress size={13} sx={{ color: "#fff" }} />
                  ) : null
                }
                sx={{
                  minWidth: 124,
                  height: MODAL_ACTION_BTN_HEIGHT,
                  borderRadius: "10px",
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  "& .MuiButton-startIcon": {
                    mr: 0.6,
                  },
                }}
              >
                Approve
              </Button>
            </>
          )}
        </Box>
      </Dialog>

      <Dialog
        open={rejectDialogOpen}
        onClose={closeRejectDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: {
          sx: {
            borderRadius: "10px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        } }}
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
          <Button
            onClick={!requestActionId ? closeRejectDialog : undefined}
            variant="outlined"
            disabled={!!requestActionId}
            sx={{
              minWidth: 112,
              height: MODAL_ACTION_BTN_HEIGHT,
              borderRadius: "10px",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={!requestActionId ? confirmRejectRequest : undefined}
            variant="contained"
            color="error"
            disabled={!!requestActionId}
            startIcon={
              requestActionId === rejectTarget?.id ? (
                <CircularProgress size={13} sx={{ color: "#fff" }} />
              ) : null
            }
            sx={{
              minWidth: 148,
              height: MODAL_ACTION_BTN_HEIGHT,
              borderRadius: "10px",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              "& .MuiButton-startIcon": {
                mr: 0.6,
              },
            }}
          >
            Confirm Decline
          </Button>
        </Box>
      </Dialog>

      {/* ── Publish confirm dialog ── */}
      <Dialog
        open={publishConfirmOpen}
        onClose={publishSaving ? undefined : () => setPublishConfirmOpen(false)}
        slotProps={{ paper: {
          sx: {
            borderRadius: "10px",
            width: 480,
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        } }}
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
            Publish Duty Roster
          </Typography>
          <IconButton
            size="small"
            onClick={() => setPublishConfirmOpen(false)}
            disabled={publishSaving}
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
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              color: "text.secondary",
              lineHeight: 1.6,
            }}
          >
            This creates a permanent versioned snapshot of the current roster
            for{" "}
            <strong style={{ color: "inherit" }}>
              {getSemesterDisplayName(activeSemester)}
            </strong>
            .
          </Typography>

          {/* Summary */}
          <Box
            sx={{
              borderRadius: "10px",
              border: `1px solid ${border}`,
              px: 1.5,
              py: 1.25,
              backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "#fafafa",
              display: "flex",
              flexDirection: "column",
              gap: 0.75,
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Roster summary
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "text.primary",
                }}
              >
                {schedules.length} staffer{schedules.length !== 1 ? "s" : ""}
              </Typography>
            </Box>
            {(() => {
              const div = countDivision(schedules);
              return (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.3,
                      borderRadius: "8px",
                      backgroundColor: isDark
                        ? "rgba(59,130,246,0.12)"
                        : "#eff6ff",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        color: isDark ? "#93c5fd" : "#1d4ed8",
                      }}
                    >
                      Scribes: {div.scribes}
                    </Typography>
                  </Box>
                  <Box
                    sx={{
                      px: 1,
                      py: 0.3,
                      borderRadius: "8px",
                      backgroundColor: isDark
                        ? "rgba(139,92,246,0.12)"
                        : "#f5f3ff",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.68rem",
                        fontWeight: 600,
                        color: isDark ? "#c4b5fd" : "#6d28d9",
                      }}
                    >
                      Creatives: {div.creatives}
                    </Typography>
                  </Box>
                </Box>
              );
            })()}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 0.5,
                mt: 0.25,
              }}
            >
              {DAY_LABELS.map((day, i) => (
                <Box
                  key={day}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    px: 1,
                    py: 0.4,
                    borderRadius: "8px",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(53,53,53,0.03)",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.68rem",
                      color: "text.secondary",
                    }}
                  >
                    {day}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.68rem",
                      fontWeight: 700,
                      color: "text.primary",
                    }}
                  >
                    {dayCounts[i]}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Export CSV toggle */}
          <Box
            onClick={() => setPublishExportCsv((v) => !v)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              cursor: "pointer",
              userSelect: "none",
              px: 1.25,
              py: 0.85,
              borderRadius: "10px",
              border: `1px solid ${publishExportCsv ? "rgba(53,53,53,0.2)" : border}`,
              backgroundColor: publishExportCsv
                ? isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(53,53,53,0.03)"
                : "transparent",
              transition: "all 0.15s",
            }}
          >
            <Box
              sx={{
                width: 16,
                height: 16,
                borderRadius: "4px",
                border: publishExportCsv
                  ? "none"
                  : `1.5px solid rgba(53,53,53,0.3)`,
                backgroundColor: publishExportCsv ? "#1a1a1a" : "transparent",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                transition: "all 0.15s",
              }}
            >
              {publishExportCsv && (
                <Box
                  component="span"
                  sx={{
                    fontSize: 10,
                    color: "#fff",
                    fontWeight: 900,
                    lineHeight: 1,
                    mt: "-1px",
                  }}
                >
                  ✓
                </Box>
              )}
            </Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                color: "text.primary",
              }}
            >
              Download roster as CSV after publishing
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{
                borderRadius: "10px",
                fontFamily: dm,
                fontSize: "0.77rem",
                py: 0.25,
              }}
            >
              {error}
            </Alert>
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
          }}
        >
          <Box
            onClick={
              publishSaving ? undefined : () => setPublishConfirmOpen(false)
            }
            sx={{
              px: 1.75,
              py: 0.65,
              borderRadius: "10px",
              cursor: publishSaving ? "default" : "pointer",
              border: `1px solid ${border}`,
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "text.secondary",
              opacity: publishSaving ? 0.5 : 1,
              transition: "all 0.15s",
            }}
          >
            Cancel
          </Box>
          <Box
            onClick={publishSaving ? undefined : handlePublishRoster}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.75,
              py: 0.65,
              borderRadius: "10px",
              cursor: publishSaving ? "default" : "pointer",
              backgroundColor: publishSaving ? "rgba(245,197,43,0.6)" : GOLD,
              border: "1px solid #d5a308",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "#1a1a1a",
              transition: "background-color 0.15s",
              "&:hover": {
                backgroundColor: publishSaving
                  ? "rgba(245,197,43,0.6)"
                  : "#e9b914",
              },
            }}
          >
            {publishSaving && (
              <CircularProgress size={13} sx={{ color: "#1a1a1a" }} />
            )}
            {publishSaving ? "Publishing..." : "Confirm Publish"}
          </Box>
        </Box>
      </Dialog>

      {/* ── Snapshot viewer dialog ── */}
      <Dialog
        open={snapshotViewerOpen}
        onClose={() => setSnapshotViewerOpen(false)}
        slotProps={{ paper: {
          sx: {
            borderRadius: "10px",
            width: 620,
            maxWidth: "96vw",
            maxHeight: "82vh",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
            display: "flex",
            flexDirection: "column",
          },
        } }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.92rem",
                color: "text.primary",
              }}
            >
              Published Roster
            </Typography>
            {selectedPublication && (
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  color: "text.secondary",
                  mt: 0.2,
                }}
              >
                v{selectedPublication.version} · Published{" "}
                {formatDateTime(selectedPublication.published_at)} ·{" "}
                {selectedPublication.snapshot?.length ?? 0} staffers
              </Typography>
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {selectedPublication?.snapshot?.length > 0 && (
              <Box
                onClick={() =>
                  exportSnapshotCsv(
                    selectedPublication.snapshot,
                    selectedPublication.version,
                  )
                }
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  px: 1.25,
                  py: 0.5,
                  borderRadius: "8px",
                  border: "1px solid rgba(0,0,0,0.12)",
                  cursor: "pointer",
                  backgroundColor: "#f7f7f8",
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  fontWeight: 500,
                  color: "text.secondary",
                  "&:hover": {
                    borderColor: "rgba(53,53,53,0.3)",
                    color: "text.primary",
                    backgroundColor: "#ededee",
                  },
                }}
              >
                <FileDownloadOutlinedIcon sx={{ fontSize: 13 }} />
                Export CSV
              </Box>
            )}
            <IconButton
              size="small"
              onClick={() => setSnapshotViewerOpen(false)}
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
        </Box>
        <Box sx={{ overflow: "auto", flex: 1 }}>
          {!selectedPublication?.snapshot?.length ? (
            <Box
              sx={{
                px: 2.5,
                py: 3,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  color: "text.secondary",
                }}
              >
                No snapshot data available.
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* Header row */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  px: 2.5,
                  py: 0.8,
                  borderBottom: `1px solid ${border}`,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(53,53,53,0.025)",
                  position: "sticky",
                  top: 0,
                  zIndex: 1,
                }}
              >
                {["Name", "Section", "Division", "Duty Day"].map((col) => (
                  <Typography
                    key={col}
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {col}
                  </Typography>
                ))}
              </Box>
              {/* Data rows */}
              {[...DAY_LABELS.keys()].flatMap((dayIdx) => {
                const dayRows = (selectedPublication.snapshot || []).filter(
                  (r) => r.duty_day === dayIdx,
                );
                if (!dayRows.length) return [];
                const cfg = DAY_CFG[dayIdx];
                return [
                  <Box
                    key={`day-header-${dayIdx}`}
                    sx={{
                      px: 2.5,
                      py: 0.5,
                      backgroundColor: isDark ? cfg.darkBg : cfg.bg,
                      borderBottom: `1px solid ${border}`,
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.62rem",
                        fontWeight: 800,
                        color: isDark ? cfg.darkColor : cfg.color,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {DAY_LABELS[dayIdx]} · {dayRows.length} staffer
                      {dayRows.length !== 1 ? "s" : ""}
                    </Typography>
                  </Box>,
                  ...dayRows.map((row, rowIdx) => (
                    <Box
                      key={`${dayIdx}-${rowIdx}`}
                      sx={{
                        display: "grid",
                        gridTemplateColumns: "2fr 1fr 1fr 1fr",
                        px: 2.5,
                        py: 0.95,
                        borderBottom: `1px solid ${border}`,
                        "&:hover": {
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.025)"
                            : HOVER_BG,
                        },
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.78rem",
                          fontWeight: 500,
                          color: "text.primary",
                        }}
                      >
                        {row.full_name || "—"}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.72rem",
                          color: "text.secondary",
                        }}
                      >
                        {row.section || "—"}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.72rem",
                          color: "text.secondary",
                        }}
                      >
                        {row.division || "—"}
                      </Typography>
                      <Box>
                        <Box
                          sx={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 0.5,
                            px: 0.9,
                            py: 0.25,
                            borderRadius: "8px",
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
                              fontSize: "0.65rem",
                              fontWeight: 700,
                              color: isDark ? cfg.darkColor : cfg.color,
                              letterSpacing: "0.04em",
                            }}
                          >
                            {DAY_LABELS[row.duty_day] ?? "—"}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  )),
                ];
              })}
            </Box>
          )}
        </Box>
      </Dialog>

      {/* ── Settings Drawer ── */}
      <Drawer
        anchor="right"
        open={settingsDrawerOpen}
        onClose={() => setSettingsDrawerOpen(false)}
        slotProps={{
          paper: {
            sx: {
              width: { xs: "100%", sm: "clamp(480px, 33.333vw, 600px)" },
              maxWidth: "100vw",
              backgroundColor: "background.paper",
              borderLeft: `1px solid ${border}`,
              boxShadow: isDark
                ? "-18px 0 48px rgba(0,0,0,0.45)"
                : "-12px 0 32px rgba(53,53,53,0.12)",
            },
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          {/* Drawer header */}
          <Box
            sx={{
              px: 2,
              py: 1.75,
              borderBottom: `1px solid ${border}`,
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.92rem",
                  fontWeight: 700,
                  color: "text.primary",
                }}
              >
                Duty Settings
              </Typography>
              <Typography
                sx={{
                  mt: 0.3,
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  color: "text.secondary",
                  lineHeight: 1.45,
                }}
              >
                Keep daily schedule tasks clean by grouping non-daily controls
                here.
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setSettingsDrawerOpen(false)}
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

          {/* Tab bar */}
          <Box
            sx={{
              px: 2,
              pt: 1.5,
              pb: 1,
              borderBottom: `1px solid ${border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "nowrap",
                overflowX: "auto",
                alignItems: "center",
              }}
            >
              {[
                { key: "governance", label: "Governance" },
                { key: "audit", label: "Audit Trail" },
              ].map((tab) => {
                const active = settingsPanelTab === tab.key;
                return (
                  <Box
                    key={tab.key}
                    onClick={() => setSettingsPanelTab(tab.key)}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      px: 1.5,
                      height: MODAL_TAB_HEIGHT,
                      flexShrink: 0,
                      minWidth: 108,
                      borderRadius: "10px",
                      cursor: "pointer",
                      border: active
                        ? "1px solid rgba(0,0,0,0.25)"
                        : "1px solid rgba(0,0,0,0.12)",
                      backgroundColor: active ? "#0f1115" : "#f7f7f8",
                      color: active ? "#ffffff" : "text.secondary",
                      fontFamily: dm,
                      fontSize: "0.76rem",
                      fontWeight: active ? 700 : 600,
                      transition: "all 0.15s",
                      "&:hover": {
                        borderColor: active
                          ? "#0f1115"
                          : "rgba(53,53,53,0.3)",
                        color: active ? "#ffffff" : "text.primary",
                        backgroundColor: active ? "#0f1115" : "#ededee",
                      },
                    }}
                  >
                    {tab.label}
                  </Box>
                );
              })}
            </Box>
            <Tooltip title="Manage Duty Sched" arrow>
              <IconButton
                onClick={handleManageDutySchedule}
                sx={{
                  borderRadius: "10px",
                  color: "text.secondary",
                  backgroundColor: "#f7f7f8",
                  border: "1px solid rgba(0,0,0,0.12)",
                  height: MODAL_TAB_HEIGHT,
                  width: MODAL_TAB_HEIGHT,
                  flexShrink: 0,
                  "&:hover": {
                    backgroundColor: "#ededee",
                    borderColor: "rgba(53,53,53,0.3)",
                    color: "text.primary",
                  },
                }}
              >
                <ArrowOutwardIcon />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Drawer scrollable content */}
          <Box sx={{ p: 2, overflow: "auto", flex: 1 }}>
            {settingsPanelTab !== "audit" && (
              <Box sx={{ mb: 1.25 }}>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "text.primary",
                  }}
                >
                  {activeSettingsMeta.title}
                </Typography>
                <Typography
                  sx={{
                    mt: 0.2,
                    fontFamily: dm,
                    fontSize: "0.72rem",
                    color: "text.secondary",
                  }}
                >
                  {activeSettingsMeta.description}
                </Typography>
              </Box>
            )}

            {settingsPanelTab === "governance" && governanceMessage && (
              <Alert
                severity="error"
                sx={{
                  mb: 1.25,
                  borderRadius: "10px",
                  fontFamily: dm,
                  fontSize: "0.76rem",
                }}
              >
                {governanceMessage}
              </Alert>
            )}

            {settingsPanelTab === "governance" && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(53,53,53,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Governance Controls
                </Typography>

                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Publishing
                </Typography>

                <Box sx={{ display: "flex", gap: 0.75, flexWrap: "wrap" }}>
                  <Box
                    onClick={
                      publishSaving ? undefined : handleOpenPublishConfirm
                    }
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      px: 1.4,
                      py: 0.65,
                      borderRadius: "10px",
                      cursor: publishSaving ? "default" : "pointer",
                      border: "1px solid rgba(0,0,0,0.18)",
                      backgroundColor: "#ffffff",
                      color: "text.primary",
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      opacity: publishSaving ? 0.65 : 1,
                      transition: "all 0.15s",
                      "&:hover": publishSaving
                        ? {}
                        : {
                            borderColor: "rgba(0,0,0,0.34)",
                            backgroundColor: "#f7f7f8",
                          },
                    }}
                  >
                    {publishSaving ? "Publishing..." : "Publish Roster"}
                  </Box>

                  {selectedPublication?.snapshot?.length > 0 && (
                    <Box
                      onClick={() =>
                        openSnapshotViewer(selectedPublication.id)
                      }
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        px: 1.4,
                        py: 0.65,
                        borderRadius: "10px",
                        cursor: "pointer",
                        border: "1px solid rgba(0,0,0,0.12)",
                        backgroundColor: "#f7f7f8",
                        color: "text.secondary",
                        fontFamily: dm,
                        fontSize: "0.78rem",
                        fontWeight: 600,
                        transition: "all 0.15s",
                        "&:hover": {
                          borderColor: "rgba(53,53,53,0.3)",
                          color: "text.primary",
                          backgroundColor: "#ededee",
                        },
                      }}
                    >
                      View Snapshot
                    </Box>
                  )}

                  <Box
                    onClick={() =>
                      selectedPublication?.snapshot?.length > 0
                        ? exportSnapshotCsv(
                            selectedPublication.snapshot,
                            selectedPublication.version,
                          )
                        : undefined
                    }
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      px: 1.4,
                      py: 0.65,
                      borderRadius: "10px",
                      cursor: "pointer",
                      border: "1px solid rgba(0,0,0,0.12)",
                      backgroundColor: "#f7f7f8",
                      color: "text.secondary",
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      opacity:
                        selectedPublication?.snapshot?.length > 0 ? 1 : 0.6,
                      transition: "all 0.15s",
                      "&:hover": {
                        borderColor: "rgba(53,53,53,0.3)",
                        color: "text.primary",
                        backgroundColor: "#ededee",
                      },
                    }}
                  >
                    Export Selected CSV
                  </Box>
                </Box>

                <Box
                  sx={{
                    mt: 0.75,
                    p: 1,
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.02)"
                      : "#ffffff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.68rem",
                        fontWeight: 700,
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                      }}
                    >
                      Selected Publication
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.25,
                        fontFamily: dm,
                        fontSize: "0.84rem",
                        fontWeight: 700,
                        color: "text.primary",
                      }}
                    >
                      {selectedPublication
                        ? `Roster v${selectedPublication.version}`
                        : "No publication selected"}
                    </Typography>
                    <Typography
                      sx={{
                        mt: 0.15,
                        fontFamily: dm,
                        fontSize: "0.72rem",
                        color: "text.secondary",
                      }}
                    >
                      {selectedPublication
                        ? `${formatDateTime(selectedPublication.published_at)} • ${selectedPublication.snapshot?.length ?? 0} staffers`
                        : "Publish a roster to start version tracking."}
                    </Typography>
                  </Box>
                  {latestPublication?.id === selectedPublication?.id && (
                    <Box
                      sx={{
                        px: 0.85,
                        py: 0.25,
                        borderRadius: "999px",
                        border: "1px solid rgba(34,197,94,0.24)",
                        backgroundColor: isDark
                          ? "rgba(34,197,94,0.08)"
                          : "#f0fdf4",
                        fontFamily: dm,
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        color: "#15803d",
                        whiteSpace: "nowrap",
                      }}
                    >
                      Current
                    </Box>
                  )}
                </Box>

                <Typography
                  sx={{
                    mt: 0.2,
                    fontFamily: dm,
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Publication History
                </Typography>

                <Box
                  sx={{
                    mt: 0.25,
                    maxHeight: 260,
                    overflow: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    pr: 0.25,
                  }}
                >
                  {publicationsLoading ? (
                    <Box
                      sx={{
                        py: 2,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <CircularProgress
                        size={18}
                        sx={{ color: "text.secondary" }}
                      />
                    </Box>
                  ) : publications.length === 0 ? (
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.74rem",
                        color: "text.secondary",
                      }}
                    >
                      No publication history yet.
                    </Typography>
                  ) : (
                    publications.map((publication) => {
                      const isSelected =
                        publication.id === selectedPublication?.id;
                      return (
                        <Box
                          key={publication.id}
                          onClick={() =>
                            setSelectedPublicationId(publication.id)
                          }
                          sx={{
                            px: 1,
                            py: 0.85,
                            borderRadius: "10px",
                            border: `1px solid ${
                              isSelected
                                ? isDark
                                  ? "rgba(255,255,255,0.22)"
                                  : "rgba(0,0,0,0.2)"
                                : border
                            }`,
                            backgroundColor: isSelected
                              ? isDark
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(53,53,53,0.03)"
                              : isDark
                                ? "rgba(255,255,255,0.02)"
                                : "#ffffff",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                            "&:hover": {
                              borderColor: isDark
                                ? "rgba(255,255,255,0.18)"
                                : "rgba(0,0,0,0.16)",
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.035)"
                                : "#f7f7f8",
                            },
                          }}
                        >
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "text.primary",
                            }}
                          >
                            Roster v{publication.version}
                          </Typography>
                          <Typography
                            sx={{
                              mt: 0.2,
                              fontFamily: dm,
                              fontSize: "0.7rem",
                              color: "text.secondary",
                            }}
                          >
                            {formatDateTime(publication.published_at)} •{" "}
                            {publication.snapshot?.length ?? 0} staffers
                          </Typography>
                        </Box>
                      );
                    })
                  )}
                </Box>
              </Box>
            )}

            {settingsPanelTab === "audit" && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(53,53,53,0.02)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    minHeight: 420,
                    border: `1px solid ${border}`,
                    overflowX: "auto",
                    overflowY: "hidden",
                    backgroundColor: "background.paper",
                    borderRadius: 0,
                    boxShadow: "none",
                  }}
                >
                  <DataGrid
                    rows={auditRows}
                    columns={auditColumns}
                    pageSize={10}
                    rowsPerPageOptions={[10]}
                    disableRowSelectionOnClick
                    rowHeight={56}
                    enableSearch={false}
                    apiRef={auditGridApiRef}
                    sx={{ minWidth: 950 }}
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
          </Box>
        </Box>
      </Drawer>

      {/* ── Slot capacity dialog ── */}
      <Dialog
        open={slotDialogOpen}
        onClose={closeSlotDialog}
        fullWidth
        maxWidth="xs"
        slotProps={{ paper: {
          sx: {
            borderRadius: "10px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        } }}
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