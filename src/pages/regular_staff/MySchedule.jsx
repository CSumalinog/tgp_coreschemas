// src/pages/regular_staff/MySchedule.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  useTheme,
  IconButton,
  Avatar,
  Popover,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircleOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import AutorenewOutlinedIcon from "@mui/icons-material/AutorenewOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import ExpandLessIcon from "@mui/icons-material/ExpandLessOutlined";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { notifyAdmins } from "../../services/NotificationService";
import { useDutyChangeRequestQuota } from "../../hooks/useDutyChangeRequestQuota";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import { useLocation } from "react-router-dom";
import BrandedLoader from "../../components/common/BrandedLoader";
import { DataGrid } from "../../components/common/AppDataGrid";

// -- Brand tokens -------------------------------------------------------------
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm = "'Inter', sans-serif";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT = ["MON", "TUE", "WED", "THU", "FRI"];
const SLOT_FIELDS = [
  "monday_slots",
  "tuesday_slots",
  "wednesday_slots",
  "thursday_slots",
  "friday_slots",
];

const ACTIVE_REQUEST_STATUSES = ["Assigned", "For Approval", "On Going"];

const AVATAR_SWATCHES = [
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#EAF3DE", color: "#27500A" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#FBEAF0", color: "#72243E" },
  { bg: "#DBEAFE", color: "#1E40AF" },
];

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

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const normalizeDivision = (value) => {
  if (!value) return "";
  const clean = String(value).trim().toLowerCase();
  if (clean === "scribe" || clean === "scribes") return "Scribes";
  if (clean === "creative" || clean === "creatives") return "Creatives";
  return "";
};

const isTrackedDivision = (division) =>
  division === "Scribes" || division === "Creatives";

const getDivisionCounts = (staffers = []) => {
  let scribes = 0;
  let creatives = 0;
  (staffers || []).forEach((staffer) => {
    const division = normalizeDivision(staffer?.division);
    if (division === "Scribes") scribes += 1;
    if (division === "Creatives") creatives += 1;
  });
  return { scribes, creatives, total: scribes + creatives };
};

export default function MySchedule() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;
  const location = useLocation();

  const [currentUser, setCurrentUser] = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);
  const [slotCounts, setSlotCounts] = useState([0, 0, 0, 0, 0]);
  const [existingSchedule, setExistingSchedule] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [latestReviewedRequest, setLatestReviewedRequest] = useState(null);
  const [allReviewedRequests, setAllReviewedRequests] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null);
  const [pendingSelection, setPendingSelection] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [requestReason, setRequestReason] = useState("");
  const [reasonDialogOpen, setReasonDialogOpen] = useState(false);
  const [pendingNoticeExpanded, setPendingNoticeExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dayStaffers, setDayStaffers] = useState([[], [], [], [], []]);
  const [blackoutDates, setBlackoutDates] = useState([]);
  const [stafferListAnchorEl, setStafferListAnchorEl] = useState(null);
  const [stafferListDayIndex, setStafferListDayIndex] = useState(null);
  const avatarColorMapRef = useRef({});

  const getRandomAvatarColor = useCallback((stafferId) => {
    const key = String(stafferId || "unknown");
    if (!avatarColorMapRef.current[key]) {
      avatarColorMapRef.current[key] =
        AVATAR_SWATCHES[Math.floor(Math.random() * AVATAR_SWATCHES.length)];
    }
    return avatarColorMapRef.current[key];
  }, []);

  // quotas hook - re-fetches when currentUser or activeSemester changes
  const {
    remaining: requestsRemaining,
    isExhausted: quotaExhausted,
    refetch: refetchQuota,
  } = useDutyChangeRequestQuota(currentUser?.id, activeSemester?.id);

  const writeDutyAuditLog = useCallback(
    async ({
      actionType,
      targetStafferId = null,
      metadata = {},
      requestId = null,
    }) => {
      try {
        if (!activeSemester?.id || !currentUser?.id || !actionType) return;
        await supabase.from("duty_schedule_audit_logs").insert({
          semester_id: activeSemester.id,
          actor_id: currentUser.id,
          target_staffer_id: targetStafferId,
          request_id: requestId,
          action_type: actionType,
          metadata,
        });
      } catch {
        // Keep scheduling actions resilient even if audit logging fails.
      }
    },
    [activeSemester?.id, currentUser?.id],
  );

  const loadActiveSemester = useCallback(async () => {
    const { data } = await supabase
      .from("semesters")
      .select("*")
      .eq("is_active", true)
      .single();
    setActiveSemester(data || null);
  }, []);

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, section, division, role, avatar_url")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  useEffect(() => {
    loadActiveSemester();
  }, [loadActiveSemester]);

  const loadScheduleData = useCallback(async () => {
    if (!activeSemester?.id || !currentUser?.id) return;
    setLoading(true);
    const [
      { data: allSchedules },
      { data: pendingRows },
      { data: reviewedRows },
      { data: blackoutRows },
    ] = await Promise.all([
      supabase
        .from("duty_schedules")
        .select(
          "duty_day, staffer_id, staffer:profiles!staffer_id(id, full_name, section, avatar_url, division)",
        )
        .eq("semester_id", activeSemester.id),
      supabase
        .from("duty_schedule_change_requests")
        .select(
          "id, current_duty_day, requested_duty_day, request_reason, status, created_at",
        )
        .eq("semester_id", activeSemester.id)
        .eq("staffer_id", currentUser.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1),
      supabase
        .from("duty_schedule_change_requests")
        .select(
          "id, current_duty_day, requested_duty_day, status, review_notes, reviewed_at, created_at",
        )
        .eq("semester_id", activeSemester.id)
        .eq("staffer_id", currentUser.id)
        .in("status", ["approved", "rejected", "cancelled"])
        .order("reviewed_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("duty_schedule_blackout_dates")
        .select("id, blackout_date, reason")
        .eq("semester_id", activeSemester.id)
        .order("blackout_date", { ascending: true }),
    ]);
    const counts = [0, 0, 0, 0, 0];
    const nextDayStaffers = [[], [], [], [], []];
    (allSchedules || []).forEach((s) => {
      if (s.duty_day >= 0 && s.duty_day <= 4) {
        counts[s.duty_day]++;
        if (s.staffer) {
          nextDayStaffers[s.duty_day].push(s.staffer);
        }
      }
    });

    // Deduplicate staffers per day (safety against accidental duplicates).
    const dedupedDayStaffers = nextDayStaffers.map((list) => {
      const seen = new Set();
      return list.filter((s) => {
        if (!s?.id || seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });
    });

    setSlotCounts(counts);
    setDayStaffers(dedupedDayStaffers);
    setBlackoutDates(blackoutRows || []);
    const nextPending = pendingRows?.[0] || null;
    setPendingRequest(nextPending);
    setLatestReviewedRequest(reviewedRows?.[0] || null);
    setAllReviewedRequests(reviewedRows || []);
    if (nextPending) setSaveSuccess("");
    const myPick = (allSchedules || []).find(
      (s) => s.staffer_id === currentUser.id,
    );
    if (myPick) {
      setExistingSchedule(myPick);
      setSelectedDay(nextPending?.requested_duty_day ?? myPick.duty_day);
    } else if (nextPending) {
      setExistingSchedule(null);
      setSelectedDay(nextPending.requested_duty_day);
    } else {
      setExistingSchedule(null);
      setSelectedDay(null);
    }
    setLoading(false);
  }, [activeSemester, currentUser]);

  useEffect(() => {
    loadScheduleData();
  }, [loadScheduleData]);

  useEffect(() => {
    if (!pendingRequest) setPendingNoticeExpanded(false);
  }, [pendingRequest]);

  useEffect(() => {
    const openDutyChangeRequestId = location.state?.openDutyChangeRequestId;
    if (!openDutyChangeRequestId) return;

    if (pendingRequest?.id === openDutyChangeRequestId) {
      queueMicrotask(() => {
        setPendingNoticeExpanded(true);
      });
    }
  }, [location.state?.openDutyChangeRequestId, pendingRequest]);

  const refreshScheduleData = useCallback(() => {
    loadScheduleData();
    setTimeout(() => {
      loadScheduleData();
    }, 350);
  }, [loadScheduleData]);

  // ─── Realtime subscription ────────────────────────────────────────────────
  useRealtimeNotify("duty_schedules", refreshScheduleData, null, {
    title: "Duty Schedule",
  });
  useRealtimeNotify(
    "duty_schedule_change_requests",
    refreshScheduleData,
    currentUser?.id ? `staffer_id=eq.${currentUser.id}` : null,
    {
      title: "Duty Schedule Change",
      sound: true,
    },
  );
  useRealtimeNotify("semesters", loadActiveSemester, "is_active=eq.true", {
    title: "Duty Slots",
    sound: false,
  });
  useRealtimeNotify(
    "notifications",
    refreshScheduleData,
    currentUser?.id ? `user_id=eq.${currentUser.id}` : null,
    {
      title: "Schedule Notification",
      sound: true,
      toast: false,
      tabFlash: false,
    },
  );

  const checkScheduleConflict = useCallback(async () => {
    if (!currentUser?.id || !existingSchedule) return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("coverage_assignments")
      .select(
        `id, request:coverage_requests!inner(id, title, event_date, is_multiday, event_days, status)`,
      )
      .eq("assigned_to", currentUser.id);

    if (error) throw error;

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
          return (
            nextDate >= today &&
            getDutyDayFromDate(date) === existingSchedule.duty_day
          );
        }),
      );
  }, [currentUser, existingSchedule]);

  const handleSave = async (requestedDay = selectedDay) => {
    if (requestedDay === null) return;
    if (pendingRequest) return;

    // Check quota for duty day CHANGE requests (not initial setup)
    if (existingSchedule && existingSchedule.duty_day !== requestedDay) {
      if (quotaExhausted) {
        setSaveError(
          "You have reached your 3 duty day change limit for this semester. Contact admin for more.",
        );
        return;
      }
    }

    setSaving(true);
    setSaveError("");
    setSaveSuccess("");
    try {
      // Re-read current schedule so stale local state cannot bypass request flow.
      const { data: liveSchedule, error: liveScheduleErr } = await supabase
        .from("duty_schedules")
        .select("duty_day")
        .eq("semester_id", activeSemester.id)
        .eq("staffer_id", currentUser.id)
        .maybeSingle();

      if (liveScheduleErr) throw liveScheduleErr;

      const effectiveExistingSchedule =
        liveSchedule || existingSchedule || null;

      const countForDay = slotCounts[requestedDay];
      const capacityForDay = slotCapacities[requestedDay] ?? 10;
      const isChanging =
        effectiveExistingSchedule &&
        effectiveExistingSchedule.duty_day !== requestedDay;
      const isNew = !effectiveExistingSchedule;

      if ((isNew || isChanging) && countForDay >= capacityForDay) {
        setSaveError(
          `${DAY_LABELS[requestedDay]} is already full (${countForDay}/${capacityForDay}). Please pick another day.`,
        );
        setSaving(false);
        return;
      }

      const actorDivision = normalizeDivision(currentUser?.division);
      if (isTrackedDivision(actorDivision) && (isNew || isChanging)) {
        const sourceDay = effectiveExistingSchedule?.duty_day;
        const affectedDays = Array.from(
          new Set([
            requestedDay,
            sourceDay !== undefined && sourceDay !== null ? sourceDay : null,
          ]),
        ).filter((day) => day !== null);

        const getProjectedCountsForDay = (dayIndex) => {
          const baseStaffers = dayStaffers[dayIndex] || [];
          let scribes = getDivisionCounts(baseStaffers).scribes;
          let creatives = getDivisionCounts(baseStaffers).creatives;

          if (
            isChanging &&
            sourceDay === dayIndex &&
            isTrackedDivision(actorDivision)
          ) {
            if (actorDivision === "Scribes") scribes = Math.max(0, scribes - 1);
            if (actorDivision === "Creatives") {
              creatives = Math.max(0, creatives - 1);
            }
          }

          if (
            (isNew || isChanging) &&
            requestedDay === dayIndex &&
            isTrackedDivision(actorDivision)
          ) {
            if (actorDivision === "Scribes") scribes += 1;
            if (actorDivision === "Creatives") creatives += 1;
          }

          return { scribes, creatives, total: scribes + creatives };
        };

        const violatedDay = affectedDays.find((dayIndex) => {
          const projection = getProjectedCountsForDay(dayIndex);
          const isBootstrapAllowed =
            isNew && dayIndex === requestedDay && countForDay === 0;
          if (isBootstrapAllowed) return false;
          return (
            projection.total > 0 &&
            (projection.scribes === 0 || projection.creatives === 0)
          );
        });

        if (violatedDay !== undefined) {
          setSaveError(
            `Balance policy: ${DAY_LABELS[violatedDay]} must keep both Scribes and Creatives assigned.`,
          );
          setSaving(false);
          return;
        }
      }

      if (isChanging) {
        if (!requestReason.trim()) {
          setSaveError("Please provide a reason for your change request.");
          setSaving(false);
          return;
        }

        setExistingSchedule(effectiveExistingSchedule);
        const conflicts = await checkScheduleConflict();
        if (conflicts.length > 0) {
          setSaveError(
            `You have upcoming coverage assignments tied to your current ${DAY_LABELS[effectiveExistingSchedule.duty_day]} schedule. Please contact an admin to resolve this before requesting a change.`,
          );
          setSaving(false);
          return;
        }

        const { data: changeRequest, error: requestErr } = await supabase
          .from("duty_schedule_change_requests")
          .insert({
            staffer_id: currentUser.id,
            semester_id: activeSemester.id,
            current_duty_day: effectiveExistingSchedule.duty_day,
            requested_duty_day: requestedDay,
            request_reason: requestReason.trim(),
            status: "pending",
          })
          .select("id")
          .single();

        if (requestErr) throw requestErr;

        await notifyAdmins({
          type: "duty_schedule_change_requested",
          title: "Duty Day Change Requested",
          message: `${currentUser?.full_name || "A staff member"} requested a duty day change from ${DAY_LABELS[effectiveExistingSchedule.duty_day]} to ${DAY_LABELS[requestedDay]}.`,
          requestId: null,
          createdBy: currentUser?.id || null,
          targetPath: "/admin/duty-schedule-view",
          targetPayload: { openDutyChangeRequestId: changeRequest?.id || null },
        });

        setSaveSuccess("Duty day change request submitted for approval.");
        setRequestReason("");
        await refetchQuota();
        await writeDutyAuditLog({
          actionType: "duty_change_requested",
          targetStafferId: currentUser.id,
          requestId: changeRequest?.id || null,
          metadata: {
            from_day: effectiveExistingSchedule.duty_day,
            to_day: requestedDay,
            reason: requestReason.trim(),
          },
        });
      } else {
        const { error: upsertErr } = await supabase
          .from("duty_schedules")
          .upsert(
            {
              staffer_id: currentUser.id,
              semester_id: activeSemester.id,
              duty_day: requestedDay,
            },
            { onConflict: "staffer_id,semester_id" },
          );
        if (upsertErr) throw upsertErr;

        setSaveSuccess("Duty day saved successfully!");
        setRequestReason("");
        await writeDutyAuditLog({
          actionType: "duty_day_saved",
          targetStafferId: currentUser.id,
          metadata: {
            from_day: effectiveExistingSchedule?.duty_day ?? null,
            to_day: requestedDay,
            is_initial_setup: !effectiveExistingSchedule,
          },
        });
      }

      await loadScheduleData();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDialogConfirm = async () => {
    if (!requestReason.trim()) {
      setSaveError("Please provide a reason for your change request.");
      return;
    }

    setReasonDialogOpen(false);
    await handleSave(pendingSelection);
    setPendingSelection(null);
  };

  const handleDialogClose = () => {
    if (pendingSelection !== null && existingSchedule) {
      setSelectedDay(existingSchedule.duty_day);
    }
    setPendingSelection(null);
    setReasonDialogOpen(false);
    setSaveError("");
  };

  const schedulingClosed = activeSemester && !activeSemester.scheduling_open;
  const noSemester = !loading && !activeSemester;
  const isInitialSetup = !existingSchedule && !pendingRequest;
  const slotCapacities = SLOT_FIELDS.map((field) =>
    Math.max(0, Number(activeSemester?.[field] ?? 10) || 0),
  );
  const dialogTargetDay =
    pendingSelection !== null ? pendingSelection : selectedDay;
  const dialogCurrentDay = existingSchedule?.duty_day ?? null;
  const dialogTargetCount =
    dialogTargetDay !== null ? slotCounts[dialogTargetDay] : null;
  const dialogTargetCapacity =
    dialogTargetDay !== null ? (slotCapacities[dialogTargetDay] ?? 10) : null;

  if (!currentUser || loading)
    return <BrandedLoader size={84} minHeight="60vh" />;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: dm,
      }}
    >
      {noSemester && (
        <Alert
          severity="info"
          sx={{ borderRadius: "10px", fontFamily: dm, fontSize: "0.78rem" }}
        >
          No active semester at the moment. Check back later.
        </Alert>
      )}

      {activeSemester && (
        <>
          {/* ── Active semester banner ── */}
          <Box
            sx={{
              mb: 3,
              px: 2.5,
              py: 1.75,
              borderRadius: "10px",
              border: `1px solid rgba(245,197,43,0.35)`,
              backgroundColor: isDark ? GOLD_08 : "#fefce8",
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: GOLD,
                  boxShadow: `0 0 6px ${GOLD}`,
                  animation: "blink 2s ease-in-out infinite",
                  "@keyframes blink": {
                    "0%,100%": { opacity: 1 },
                    "50%": { opacity: 0.35 },
                  },
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "#b45309",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Active Semester
              </Typography>
            </Box>
            <Box
              sx={{
                width: "1px",
                height: 22,
                backgroundColor: "rgba(245,197,43,0.3)",
              }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.88rem",
                color: "text.primary",
              }}
            >
              {getSemesterDisplayName(activeSemester)}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
              <CalendarTodayOutlinedIcon
                sx={{ fontSize: 11, color: "text.secondary" }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.76rem",
                  color: "text.secondary",
                }}
              >
                {new Date(activeSemester.start_date).toLocaleDateString(
                  "en-US",
                  { month: "short", day: "numeric", year: "numeric" },
                )}
                {" — "}
                {new Date(activeSemester.end_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </Typography>
            </Box>

            {existingSchedule && !schedulingClosed && (
              <Box
                sx={{
                  ml: { xs: 0, md: "auto" },
                  width: { xs: "100%", md: "auto" },
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                  pt: { xs: 0.6, md: 0 },
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.73rem",
                    fontWeight: 600,
                    color: quotaExhausted ? "#b91c1c" : "#b45309",
                    letterSpacing: "0.02em",
                  }}
                >
                  Changes left this semester
                </Typography>
                <Box
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 42,
                    px: 1,
                    py: 0.35,
                    borderRadius: "999px",
                    border: quotaExhausted
                      ? "1.5px solid rgba(220,38,38,0.4)"
                      : "1.5px solid rgba(245,197,43,0.5)",
                    backgroundColor: "#ffffff",
                    color: quotaExhausted ? "#dc2626" : "#b45309",
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    boxShadow: quotaExhausted
                      ? "inset 0 0 0 1px rgba(220,38,38,0.2)"
                      : "inset 0 0 0 1px rgba(245,197,43,0.2)",
                  }}
                >
                  {requestsRemaining}/3
                </Box>
              </Box>
            )}
          </Box>

          {isInitialSetup && !schedulingClosed && (
            <Box
              sx={{
                mb: 2.5,
                p: 2,
                borderRadius: "10px",
                border: `1px solid rgba(245,197,43,0.35)`,
                backgroundColor: isDark ? GOLD_08 : "#fffdf5",
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "90px 1fr" },
                gap: 1.5,
                alignItems: "center",
              }}
            >
              <Box
                sx={{
                  width: { xs: "100%", sm: 90 },
                  height: { xs: 74, sm: 90 },
                  borderRadius: "10px",
                  border: `1px solid rgba(245,197,43,0.35)`,
                  background:
                    "linear-gradient(140deg, rgba(245,197,43,0.18), rgba(245,197,43,0.04))",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  position: "relative",
                }}
              >
                <CalendarTodayOutlinedIcon
                  sx={{ fontSize: 24, color: "#b45309", opacity: 0.9 }}
                />
                <TaskAltOutlinedIcon
                  sx={{
                    fontSize: 16,
                    color: "#15803d",
                    position: "absolute",
                    right: 14,
                    bottom: 14,
                  }}
                />
              </Box>

              <Box>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.84rem",
                    fontWeight: 700,
                    color: "text.primary",
                  }}
                >
                  First-time duty day setup
                </Typography>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.76rem",
                    color: "text.secondary",
                    mt: 0.45,
                    lineHeight: 1.55,
                  }}
                >
                  1. Choose a day from Monday to Friday. 2. Check slot
                  availability. 3. Confirm your choice for the semester.
                </Typography>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.73rem",
                    color: "#b45309",
                    mt: 0.75,
                    fontWeight: 600,
                  }}
                >
                  After initial setup, day changes require admin approval.
                </Typography>
              </Box>
            </Box>
          )}

          {blackoutDates.length > 0 && (
            <Box
              sx={{
                mb: 2.5,
                px: 1.6,
                py: 1.2,
                borderRadius: "10px",
                border: `1px solid ${border}`,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(53,53,53,0.02)",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "text.secondary",
                  mb: 0.6,
                }}
              >
                Blackout Dates
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.76rem",
                  color: "text.secondary",
                  lineHeight: 1.55,
                }}
              >
                No duty operations on:{" "}
                {blackoutDates
                  .map((row) =>
                    new Date(
                      `${row.blackout_date}T00:00:00`,
                    ).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }),
                  )
                  .join(", ")}
              </Typography>
            </Box>
          )}

          {/* ── Status alerts ── */}
          {schedulingClosed && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                px: 1.75,
                py: 1.25,
                mb: 2.5,
                borderRadius: "10px",
                border: `1px solid ${border}`,
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.03)"
                  : "rgba(53,53,53,0.03)",
              }}
            >
              <LockOutlinedIcon
                sx={{ fontSize: 14, color: "text.secondary" }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  color: "text.secondary",
                }}
              >
                Scheduling is currently closed. You cannot change your duty day.
              </Typography>
            </Box>
          )}
          {pendingRequest ? (
            <Box
              sx={{
                px: 1.5,
                py: 1,
                mb: 2.5,
                borderRadius: "10px",
                border: `1px solid rgba(245,197,43,0.35)`,
                backgroundColor: isDark ? GOLD_08 : "#fefce8",
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
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Box
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: GOLD,
                      flexShrink: 0,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "#b45309",
                      lineHeight: 1.4,
                    }}
                  >
                    Your request to change from{" "}
                    <strong>
                      {DAY_LABELS[pendingRequest.current_duty_day]}
                    </strong>{" "}
                    to{" "}
                    <strong>
                      {DAY_LABELS[pendingRequest.requested_duty_day]}
                    </strong>{" "}
                    is pending admin approval.
                  </Typography>
                </Box>

                {pendingRequest.request_reason && (
                  <IconButton
                    size="small"
                    onClick={() => setPendingNoticeExpanded((v) => !v)}
                    sx={{
                      color: "#b45309",
                      border: "1px solid rgba(245,197,43,0.4)",
                      borderRadius: "4px",
                      width: 26,
                      height: 26,
                    }}
                  >
                    {pendingNoticeExpanded ? (
                      <ExpandLessIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 16 }} />
                    )}
                  </IconButton>
                )}
              </Box>

              {pendingNoticeExpanded && pendingRequest.request_reason && (
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.74rem",
                    color: "text.secondary",
                    mt: 0.8,
                    pl: 1.6,
                  }}
                >
                  Reason: {pendingRequest.request_reason}
                </Typography>
              )}
            </Box>
          ) : latestReviewedRequest?.status === "rejected" ? (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                px: 1.75,
                py: 1.25,
                mb: 2.5,
                borderRadius: "10px",
                border: "1px solid rgba(220,38,38,0.25)",
                backgroundColor: isDark ? "rgba(220,38,38,0.12)" : "#fef2f2",
                flexDirection: "column",
                alignItems: "flex-start",
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: "#dc2626",
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{ fontFamily: dm, fontSize: "0.78rem", color: "#b91c1c" }}
              >
                Your request to change from{" "}
                <strong>
                  {DAY_LABELS[latestReviewedRequest.current_duty_day]}
                </strong>{" "}
                to{" "}
                <strong>
                  {DAY_LABELS[latestReviewedRequest.requested_duty_day]}
                </strong>{" "}
                was not approved.
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  mt: 0.5,
                }}
              >
                Admin note:{" "}
                {latestReviewedRequest.review_notes || "No reason provided."}
              </Typography>
            </Box>
          ) : (
            existingSchedule &&
            !schedulingClosed && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1.75,
                  py: 1.25,
                  mb: 2.5,
                  borderRadius: "10px",
                  border: `1px solid rgba(34,197,94,0.25)`,
                  backgroundColor: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4",
                }}
              >
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: "#22c55e",
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{ fontFamily: dm, fontSize: "0.78rem", color: "#15803d" }}
                >
                  You're on{" "}
                  <strong>{DAY_LABELS[existingSchedule.duty_day]}</strong> this
                  semester. You can change it below.
                </Typography>
              </Box>
            )
          )}
          {saveError && (
            <Alert
              severity="error"
              sx={{
                mb: 2.5,
                borderRadius: "10px",
                fontFamily: dm,
                fontSize: "0.78rem",
              }}
            >
              {saveError}
            </Alert>
          )}
          {saveSuccess && !pendingRequest && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.75,
                py: 1.25,
                mb: 2.5,
                borderRadius: "10px",
                border: `1px solid rgba(34,197,94,0.25)`,
                backgroundColor: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4",
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{ fontFamily: dm, fontSize: "0.78rem", color: "#15803d" }}
              >
                {saveSuccess}
              </Typography>
            </Box>
          )}

          {/* ── Weekly calendar grid ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              border: `1px solid ${border}`,
              borderRadius: "10px",
              overflow: "hidden",
              backgroundColor: "background.paper",
              boxShadow: isDark
                ? "0 1px 10px rgba(0,0,0,0.4)"
                : "0 1px 8px rgba(0,0,0,0.07)",
              mb: 3,
            }}
          >
            {DAY_SHORT.map((short, i) => (
              <Box
                key={short}
                sx={{
                  px: 1.5,
                  py: 1.1,
                  textAlign: "center",
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(53,53,53,0.02)",
                  borderBottom: `1px solid ${border}`,
                  borderRight: i < 4 ? `1px solid ${border}` : "none",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "text.secondary",
                    letterSpacing: "0.1em",
                  }}
                >
                  {short}
                </Typography>
              </Box>
            ))}

            {DAY_LABELS.map((day, i) => {
              const count = slotCounts[i];
              const capacity = slotCapacities[i] ?? 10;
              const assignedStaffers = dayStaffers[i] || [];
              const isFull = count >= capacity;
              const isMyPick = existingSchedule?.duty_day === i;
              const sameDayPeers = isMyPick
                ? assignedStaffers.filter(
                    (staffer) => staffer.id !== currentUser?.id,
                  )
                : assignedStaffers;
              const previewStaffers = sameDayPeers.slice(0, 2);
              const overflowCount = Math.max(
                sameDayPeers.length - previewStaffers.length,
                0,
              );
              const isSelected = selectedDay === i;
              const isPendingTarget = pendingRequest?.requested_duty_day === i;
              const isChangingDay =
                existingSchedule && i !== existingSchedule.duty_day;
              const isDisabled =
                schedulingClosed ||
                !!pendingRequest ||
                (isFull && !isMyPick) ||
                (isChangingDay && quotaExhausted);
              const pct = Math.min(
                capacity > 0 ? (count / capacity) * 100 : count > 0 ? 100 : 0,
                100,
              );

              return (
                <Box
                  key={day}
                  onClick={() => {
                    if (isDisabled) return;
                    if (existingSchedule && i !== existingSchedule.duty_day) {
                      setSelectedDay(i);
                      setPendingSelection(i);
                      setSaveError("");
                      setReasonDialogOpen(true);
                    } else {
                      setSelectedDay(i);
                    }
                  }}
                  sx={{
                    px: 1.5,
                    py: 2.5,
                    textAlign: "center",
                    borderRight: i < 4 ? `1px solid ${border}` : "none",
                    borderTop: isSelected
                      ? `2px solid ${GOLD}`
                      : isMyPick
                        ? "2px solid rgba(34,197,94,0.6)"
                        : `2px solid transparent`,
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    backgroundColor: isSelected
                      ? isDark
                        ? GOLD_08
                        : "rgba(245,197,43,0.05)"
                      : isMyPick
                        ? isDark
                          ? "rgba(34,197,94,0.06)"
                          : "#f0fdf4"
                        : isPendingTarget
                          ? isDark
                            ? "rgba(245,197,43,0.06)"
                            : "#fefce8"
                          : "background.paper",
                    opacity: isDisabled && !isMyPick ? 0.4 : 1,
                    transition: "all 0.15s ease",
                    "&:hover": !isDisabled
                      ? {
                          backgroundColor: isDark
                            ? GOLD_08
                            : "rgba(245,197,43,0.05)",
                          borderTop: `2px solid ${GOLD}`,
                        }
                      : {},
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  <Box
                    sx={{
                      width: isMyPick ? 40 : 30,
                      height: isMyPick ? 40 : 30,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected
                        ? GOLD
                        : isMyPick
                          ? "rgba(34,197,94,0.15)"
                          : isDark
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(53,53,53,0.05)",
                      transition: "background-color 0.15s",
                      border: isSelected
                        ? "none"
                        : isMyPick
                          ? "1.5px solid rgba(34,197,94,0.4)"
                          : `1.5px solid ${border}`,
                    }}
                  >
                    {isMyPick ? (
                      <Avatar
                        src={getAvatarUrl(currentUser?.avatar_url)}
                        sx={{
                          width: 36,
                          height: 36,
                          fontFamily: dm,
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          border: `1px solid ${isSelected ? "rgba(33,33,33,0.18)" : "rgba(34,197,94,0.35)"}`,
                        }}
                      >
                        {!currentUser?.avatar_url &&
                          getInitials(currentUser?.full_name)}
                      </Avatar>
                    ) : isSelected ? (
                      <CheckCircleIcon sx={{ fontSize: 15, color: CHARCOAL }} />
                    ) : (
                      <Box
                        sx={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.2)"
                            : "rgba(53,53,53,0.15)",
                        }}
                      />
                    )}
                  </Box>

                  <Box>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.7rem",
                        color: isFull ? "#dc2626" : "text.secondary",
                        fontWeight: isFull ? 600 : 400,
                      }}
                    >
                      {count}/{capacity}
                    </Typography>
                    {isFull && !isMyPick && (
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.63rem",
                          color: "#dc2626",
                          fontWeight: 700,
                        }}
                      >
                        Full
                      </Typography>
                    )}
                    {isPendingTarget && (
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.63rem",
                          color: "#b45309",
                          fontWeight: 600,
                        }}
                      >
                        Pending
                      </Typography>
                    )}
                    {isMyPick && (
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.63rem",
                          color: "#15803d",
                          fontWeight: 600,
                        }}
                      >
                        Your day
                      </Typography>
                    )}
                  </Box>

                  {sameDayPeers.length > 0 && (
                    <Box
                      onClick={(e) => {
                        e.stopPropagation();
                        setStafferListAnchorEl(e.currentTarget);
                        setStafferListDayIndex(i);
                      }}
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.55,
                        px: 0.75,
                        py: 0.35,
                        borderRadius: "10px",
                        border: `1px solid ${border}`,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(53,53,53,0.02)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        "&:hover": {
                          borderColor: GOLD,
                          backgroundColor: GOLD_08,
                        },
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {previewStaffers.map((staffer, idx) => {
                          const tone = getRandomAvatarColor(staffer.id);
                          return (
                            <Avatar
                              key={staffer.id || idx}
                              src={getAvatarUrl(staffer.avatar_url)}
                              sx={{
                                width: 24,
                                height: 24,
                                ml: idx === 0 ? 0 : -0.45,
                                border: `1.5px solid ${isDark ? "#1f1f1f" : "#fff"}`,
                                fontFamily: dm,
                                fontSize: "0.58rem",
                                fontWeight: 700,
                                backgroundColor: tone.bg,
                                color: tone.color,
                              }}
                            >
                              {!staffer.avatar_url &&
                                getInitials(staffer.full_name)}
                            </Avatar>
                          );
                        })}
                        {overflowCount > 0 && (
                          <Box
                            sx={{
                              ml: -0.45,
                              width: 24,
                              height: 24,
                              borderRadius: "50%",
                              border: `1.5px solid ${isDark ? "#1f1f1f" : "#fff"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.12)"
                                : "rgba(53,53,53,0.15)",
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.54rem",
                                fontWeight: 700,
                                color: "text.primary",
                                lineHeight: 1,
                              }}
                            >
                              +{overflowCount}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )}

                  <Box
                    sx={{
                      width: "80%",
                      height: 3,
                      borderRadius: "10px",
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.06)"
                        : "rgba(53,53,53,0.06)",
                    }}
                  >
                    <Box
                      sx={{
                        height: "100%",
                        width: `${pct}%`,
                        borderRadius: "10px",
                        backgroundColor: isFull ? "#ef4444" : GOLD,
                        transition: "width 0.3s ease",
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>

          {/* ── Schedule change request history ── */}
          {allReviewedRequests.length > 0 && (
            <Box sx={{ mt: 3 }}>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  color: "text.disabled",
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                  mb: 1.25,
                }}
              >
                Change Request History
              </Typography>
              <DataGrid
                rows={allReviewedRequests.map((r) => ({
                  id: r.id,
                  requestedDay: DAY_LABELS[r.requested_duty_day] ?? "—",
                  dateRequested: r.created_at
                    ? new Date(r.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—",
                  status: r.status,
                }))}
                columns={[
                  {
                    field: "requestedDay",
                    headerName: "Requested Day",
                    flex: 1,
                    minWidth: 130,
                    renderCell: (p) => (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          height: "100%",
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.8rem",
                            fontWeight: 500,
                          }}
                        >
                          {p.value}
                        </Typography>
                      </Box>
                    ),
                  },
                  {
                    field: "dateRequested",
                    headerName: "Date Requested",
                    flex: 1,
                    minWidth: 140,
                    renderCell: (p) => (
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          height: "100%",
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.8rem",
                            color: "text.secondary",
                          }}
                        >
                          {p.value}
                        </Typography>
                      </Box>
                    ),
                  },
                  {
                    field: "status",
                    headerName: "Status",
                    flex: 0.8,
                    minWidth: 110,
                    renderCell: (p) => {
                      const cfgMap = {
                        approved: {
                          bg: "#f0fdf4",
                          color: "#15803d",
                          dot: "#22c55e",
                          label: "Approved",
                        },
                        rejected: {
                          bg: "#fef2f2",
                          color: "#dc2626",
                          dot: "#ef4444",
                          label: "Declined",
                        },
                        cancelled: {
                          bg: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
                          color: "#6b7280",
                          dot: "#9ca3af",
                          label: "Cancelled",
                        },
                      };
                      const cfg = cfgMap[p.value] ?? cfgMap.cancelled;
                      return (
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            height: "100%",
                          }}
                        >
                          <Box
                            sx={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              px: 1,
                              py: 0.3,
                              borderRadius: "20px",
                              backgroundColor: cfg.bg,
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
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                color: cfg.color,
                              }}
                            >
                              {cfg.label}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    },
                  },
                ]}
                autoHeight
                disableRowSelectionOnClick
                pageSizeOptions={[25, 50, 100]}
                sx={{
                  border: `1px solid ${border}`,
                  borderRadius: "10px",
                  fontFamily: dm,
                  "& .MuiDataGrid-columnHeaders": {
                    borderRadius: "10px 10px 0 0",
                  },
                }}
              />
            </Box>
          )}

          <Popover
            open={Boolean(stafferListAnchorEl)}
            anchorEl={stafferListAnchorEl}
            onClose={() => {
              setStafferListAnchorEl(null);
              setStafferListDayIndex(null);
            }}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
            transformOrigin={{ vertical: "top", horizontal: "left" }}
            slotProps={{
              paper: {
                sx: {
                  mt: 0.75,
                  width: 450,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  overflow: "hidden",
                  boxShadow: isDark
                    ? "0 14px 36px rgba(0,0,0,0.45)"
                    : "0 14px 36px rgba(17,24,39,0.12)",
                },
              },
            }}
          >
            {(() => {
              const popoverAllStaffers =
                stafferListDayIndex !== null
                  ? dayStaffers[stafferListDayIndex] || []
                  : [];
              const isPopoverMyDay =
                stafferListDayIndex !== null &&
                existingSchedule?.duty_day === stafferListDayIndex;
              const popoverStaffers = isPopoverMyDay
                ? popoverAllStaffers.filter(
                    (staffer) => staffer.id !== currentUser?.id,
                  )
                : popoverAllStaffers;

              return (
                <>
                  <Box
                    sx={{
                      px: 1.4,
                      py: 1,
                      borderBottom: `1px solid ${border}`,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.03)"
                        : "rgba(53,53,53,0.02)",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.64rem",
                        fontWeight: 800,
                        color: "text.secondary",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                      }}
                    >
                      {stafferListDayIndex !== null
                        ? isPopoverMyDay
                          ? `Co-Staffers · ${popoverStaffers.length}`
                          : `${DAY_SHORT[stafferListDayIndex]} · ${popoverStaffers.length} assigned`
                        : "Assigned Staffers"}
                    </Typography>
                  </Box>

                  <Box sx={{ maxHeight: 280, overflowY: "auto" }}>
                    {popoverStaffers.length === 0 ? (
                      <Box sx={{ px: 1.4, py: 1.25 }}>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.76rem",
                            color: "text.secondary",
                          }}
                        >
                          {isPopoverMyDay
                            ? "No other staff assigned the same day yet."
                            : "No assigned staff for this day yet."}
                        </Typography>
                      </Box>
                    ) : (
                      popoverStaffers.map((staffer, idx) => {
                        const tone = getRandomAvatarColor(staffer.id);
                        return (
                          <Box
                            key={staffer.id || idx}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              px: 1.4,
                              py: 1,
                              borderBottom:
                                idx < popoverStaffers.length - 1
                                  ? `1px solid ${border}`
                                  : "none",
                            }}
                          >
                            <Avatar
                              src={getAvatarUrl(staffer.avatar_url)}
                              sx={{
                                width: 30,
                                height: 30,
                                fontFamily: dm,
                                fontSize: "0.65rem",
                                fontWeight: 700,
                                backgroundColor: tone.bg,
                                color: tone.color,
                              }}
                            >
                              {!staffer.avatar_url &&
                                getInitials(staffer.full_name)}
                            </Avatar>

                            <Box sx={{ minWidth: 0 }}>
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.82rem",
                                  color: "text.primary",
                                  fontWeight: 600,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                              >
                                {staffer.full_name || "Unnamed Staffer"}
                              </Typography>
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.72rem",
                                  color: "text.secondary",
                                }}
                              >
                                {staffer.section || "Unassigned Section"}
                              </Typography>
                            </Box>
                          </Box>
                        );
                      })
                    )}
                  </Box>
                </>
              );
            })()}
          </Popover>

          <Dialog
            open={reasonDialogOpen}
            onClose={handleDialogClose}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: "10px",
                  width: 450,
                  p: 0,
                  fontFamily: dm,
                  bgcolor: "background.paper",
                },
              },
            }}
          >
            <Box
              sx={{
                px: 3,
                py: 2.25,
                display: "flex",
                alignItems: "center",
                gap: 1.5,
                borderBottom: `1px solid ${border}`,
              }}
            >
              <Box
                sx={{
                  width: 34,
                  height: 34,
                  borderRadius: "10px",
                  backgroundColor: GOLD_08,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <AutorenewOutlinedIcon sx={{ fontSize: 17, color: GOLD }} />
              </Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  color: "text.primary",
                }}
              >
                Confirm Duty Day Change
              </Typography>
            </Box>

            <Box sx={{ px: 3, py: 2.25 }}>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "text.secondary",
                  lineHeight: 1.6,
                  mb: 1.5,
                }}
              >
                Change from <strong>{DAY_LABELS[dialogCurrentDay]}</strong> to{" "}
                <strong>{DAY_LABELS[dialogTargetDay]}</strong>?
              </Typography>

              <Box
                sx={{
                  px: 1.25,
                  py: 0.85,
                  mb: 1.4,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.03)"
                    : "rgba(53,53,53,0.02)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.74rem",
                    color: "text.secondary",
                  }}
                >
                  {DAY_LABELS[dialogTargetDay]} load: {dialogTargetCount}/
                  {dialogTargetCapacity} slots
                </Typography>
              </Box>

              <TextField
                multiline
                minRows={3}
                fullWidth
                autoFocus
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                label="Reason"
                placeholder="e.g. I have a scheduling conflict on Thursdays."
                size="small"
              />

              {saveError && (
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    color: "#dc2626",
                    mt: 1,
                  }}
                >
                  {saveError}
                </Typography>
              )}
            </Box>

            <Box
              sx={{
                px: 3,
                py: 2,
                display: "flex",
                gap: 1,
                justifyContent: "flex-end",
                borderTop: `1px solid ${border}`,
              }}
            >
              <Box
                onClick={!saving ? handleDialogClose : undefined}
                sx={{
                  px: 2,
                  py: 0.8,
                  borderRadius: "10px",
                  cursor: saving ? "not-allowed" : "pointer",
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "text.secondary",
                  border: `1px solid ${border}`,
                  userSelect: "none",
                  opacity: saving ? 0.7 : 1,
                  transition: "all 0.15s",
                }}
              >
                Cancel
              </Box>
              <Box
                onClick={
                  !saving && requestReason.trim()
                    ? handleDialogConfirm
                    : undefined
                }
                sx={{
                  px: 2,
                  py: 0.8,
                  borderRadius: "10px",
                  cursor:
                    saving || !requestReason.trim() ? "not-allowed" : "pointer",
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  color: "#fff",
                  backgroundColor: "#212121",
                  opacity: saving || !requestReason.trim() ? 0.7 : 1,
                  userSelect: "none",
                  transition: "all 0.15s",
                  "&:hover":
                    !saving && requestReason.trim()
                      ? { backgroundColor: "#333" }
                      : {},
                }}
              >
                {saving ? (
                  <CircularProgress size={14} sx={{ color: "#fff" }} />
                ) : (
                  "Submit request"
                )}
              </Box>
            </Box>
          </Dialog>
        </>
      )}
    </Box>
  );
}
