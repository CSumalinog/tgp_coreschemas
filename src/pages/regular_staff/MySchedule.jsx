// src/pages/regular_staff/MySchedule.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  useTheme,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import { supabase } from "../../lib/supabaseClient";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";

// ── Brand tokens ──────────────────────────────────────────────────────────────
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

export default function MySchedule() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [currentUser, setCurrentUser] = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);
  const [slotCounts, setSlotCounts] = useState([0, 0, 0, 0, 0]);
  const [existingSchedule, setExistingSchedule] = useState(null);
  const [pendingRequest, setPendingRequest] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");
  const [loading, setLoading] = useState(true);

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
        .select("id, full_name, section, division, role")
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
    const [{ data: allSchedules }, { data: pendingRows }] = await Promise.all([
      supabase
        .from("duty_schedules")
        .select("duty_day, staffer_id")
        .eq("semester_id", activeSemester.id),
      supabase
        .from("duty_schedule_change_requests")
        .select("id, current_duty_day, requested_duty_day, status, created_at")
        .eq("semester_id", activeSemester.id)
        .eq("staffer_id", currentUser.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    const counts = [0, 0, 0, 0, 0];
    (allSchedules || []).forEach((s) => {
      if (s.duty_day >= 0 && s.duty_day <= 4) counts[s.duty_day]++;
    });
    setSlotCounts(counts);
    const nextPending = pendingRows?.[0] || null;
    setPendingRequest(nextPending);
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

  // ─── Realtime subscription ────────────────────────────────────────────────
  useRealtimeNotify("duty_schedules", loadScheduleData, null, {
    title: "Duty Schedule",
  });
  useRealtimeNotify(
    "duty_schedule_change_requests",
    loadScheduleData,
    currentUser?.id ? `staffer_id=eq.${currentUser.id}` : null,
    {
      title: "Duty Schedule Change",
      sound: false,
    },
  );
  useRealtimeNotify("semesters", loadActiveSemester, "is_active=eq.true", {
    title: "Duty Slots",
    sound: false,
  });

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

  const handleSave = async () => {
    if (selectedDay === null) return;
    if (pendingRequest) return;
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

      const countForDay = slotCounts[selectedDay];
      const capacityForDay = slotCapacities[selectedDay] ?? 10;
      const isChanging =
        effectiveExistingSchedule &&
        effectiveExistingSchedule.duty_day !== selectedDay;
      const isNew = !effectiveExistingSchedule;

      if ((isNew || isChanging) && countForDay >= capacityForDay) {
        setSaveError(
          `${DAY_LABELS[selectedDay]} is already full (${countForDay}/${capacityForDay}). Please pick another day.`,
        );
        setSaving(false);
        return;
      }

      if (isChanging) {
        setExistingSchedule(effectiveExistingSchedule);
        const conflicts = await checkScheduleConflict();
        if (conflicts.length > 0) {
          setSaveError(
            `You have upcoming coverage assignments tied to your current ${DAY_LABELS[effectiveExistingSchedule.duty_day]} schedule. Please contact an admin to resolve this before requesting a change.`,
          );
          setSaving(false);
          return;
        }

        const { error: requestErr } = await supabase
          .from("duty_schedule_change_requests")
          .insert({
            staffer_id: currentUser.id,
            semester_id: activeSemester.id,
            current_duty_day: effectiveExistingSchedule.duty_day,
            requested_duty_day: selectedDay,
            status: "pending",
          });

        if (requestErr) throw requestErr;

        setSaveSuccess("Duty day change request submitted for approval.");
      } else {
        const { error: upsertErr } = await supabase
          .from("duty_schedules")
          .upsert(
            {
              staffer_id: currentUser.id,
              semester_id: activeSemester.id,
              duty_day: selectedDay,
            },
            { onConflict: "staffer_id,semester_id" },
          );
        if (upsertErr) throw upsertErr;

        setSaveSuccess("Duty day saved successfully!");
      }

      await loadScheduleData();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const schedulingClosed = activeSemester && !activeSemester.scheduling_open;
  const noSemester = !loading && !activeSemester;
  const hasChanged = selectedDay !== (existingSchedule?.duty_day ?? null);
  const slotCapacities = SLOT_FIELDS.map((field) =>
    Math.max(0, Number(activeSemester?.[field] ?? 10) || 0),
  );

  if (!currentUser || loading)
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <CircularProgress size={26} sx={{ color: GOLD }} />
      </Box>
    );

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: dm,
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "1.05rem",
            color: "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          My Duty Schedule
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            color: "text.secondary",
            mt: 0.3,
          }}
        >
          Pick one day — you'll be on duty every week of the semester on that
          day.
        </Typography>
      </Box>

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
              {activeSemester.name}
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
          </Box>

          {/* ── Status alerts ── */}
          {schedulingClosed && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
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
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.75,
                py: 1.25,
                mb: 2.5,
                borderRadius: "10px",
                border: `1px solid rgba(245,197,43,0.35)`,
                backgroundColor: isDark ? GOLD_08 : "#fefce8",
              }}
            >
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
                sx={{ fontFamily: dm, fontSize: "0.78rem", color: "#b45309" }}
              >
                Your request to change from{" "}
                <strong>{DAY_LABELS[pendingRequest.current_duty_day]}</strong>{" "}
                to{" "}
                <strong>{DAY_LABELS[pendingRequest.requested_duty_day]}</strong>{" "}
                is pending admin approval.
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
          {saveSuccess && (
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
              const isFull = count >= capacity;
              const isMyPick = existingSchedule?.duty_day === i;
              const isSelected = selectedDay === i;
              const isPendingTarget = pendingRequest?.requested_duty_day === i;
              const isDisabled =
                schedulingClosed || !!pendingRequest || (isFull && !isMyPick);
              const pct = Math.min(
                capacity > 0 ? (count / capacity) * 100 : count > 0 ? 100 : 0,
                100,
              );

              return (
                <Box
                  key={day}
                  onClick={() => !isDisabled && setSelectedDay(i)}
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
                      width: 30,
                      height: 30,
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
                    {isSelected ? (
                      <CheckCircleIcon sx={{ fontSize: 15, color: CHARCOAL }} />
                    ) : isMyPick ? (
                      <CheckCircleIcon
                        sx={{ fontSize: 15, color: "#22c55e" }}
                      />
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

          {/* ── Footer / save ── */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              pt: 0.5,
              borderTop: `1px solid ${border}`,
            }}
          >
            <Box
              onClick={
                !saving &&
                selectedDay !== null &&
                hasChanged &&
                !schedulingClosed &&
                !pendingRequest
                  ? handleSave
                  : undefined
              }
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                mt: 2,
                px: 2,
                py: 0.75,
                borderRadius: "10px",
                cursor:
                  saving ||
                  selectedDay === null ||
                  !hasChanged ||
                  schedulingClosed ||
                  pendingRequest
                    ? "not-allowed"
                    : "pointer",
                backgroundColor:
                  saving ||
                  selectedDay === null ||
                  !hasChanged ||
                  schedulingClosed ||
                  pendingRequest
                    ? isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(53,53,53,0.06)"
                    : GOLD,
                color:
                  saving ||
                  selectedDay === null ||
                  !hasChanged ||
                  schedulingClosed ||
                  pendingRequest
                    ? "text.disabled"
                    : CHARCOAL,
                fontFamily: dm,
                fontSize: "0.82rem",
                fontWeight: 600,
                transition: "background-color 0.15s",
                "&:hover":
                  !saving &&
                  selectedDay !== null &&
                  hasChanged &&
                  !schedulingClosed &&
                  !pendingRequest
                    ? { backgroundColor: "#e6b920" }
                    : {},
              }}
            >
              {saving ? (
                <>
                  <CircularProgress size={13} sx={{ color: "inherit" }} />{" "}
                  Saving…
                </>
              ) : pendingRequest ? (
                "Request Pending"
              ) : existingSchedule ? (
                "Submit Change Request"
              ) : (
                "Confirm My Day"
              )}
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}
