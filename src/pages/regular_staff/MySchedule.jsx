// src/pages/regular_staff/MySchedule.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Alert, Button, Divider,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import { supabase } from "../../lib/supabaseClient";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT  = ["MON", "TUE", "WED", "THU", "FRI"];
const MAX_SLOTS  = 10;

export default function MySchedule() {
  const [currentUser, setCurrentUser]           = useState(null);
  const [activeSemester, setActiveSemester]     = useState(null);
  const [slotCounts, setSlotCounts]             = useState([0, 0, 0, 0, 0]);
  const [existingSchedule, setExistingSchedule] = useState(null);
  const [selectedDay, setSelectedDay]           = useState(null);
  const [saving, setSaving]                     = useState(false);
  const [saveError, setSaveError]               = useState("");
  const [saveSuccess, setSaveSuccess]           = useState(false);
  const [loading, setLoading]                   = useState(true);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
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
    async function loadSemester() {
      const { data } = await supabase
        .from("semesters")
        .select("*")
        .eq("is_active", true)
        .single();
      setActiveSemester(data || null);
    }
    loadSemester();
  }, []);

  const loadScheduleData = useCallback(async () => {
    if (!activeSemester?.id || !currentUser?.id) return;
    setLoading(true);

    const { data: allSchedules } = await supabase
      .from("duty_schedules")
      .select("duty_day, staffer_id")
      .eq("semester_id", activeSemester.id);

    const counts = [0, 0, 0, 0, 0];
    (allSchedules || []).forEach((s) => {
      if (s.duty_day >= 0 && s.duty_day <= 4) counts[s.duty_day]++;
    });
    setSlotCounts(counts);

    const myPick = (allSchedules || []).find((s) => s.staffer_id === currentUser.id);
    if (myPick) {
      setExistingSchedule(myPick);
      setSelectedDay(myPick.duty_day);
    } else {
      setExistingSchedule(null);
      setSelectedDay(null);
    }

    setLoading(false);
  }, [activeSemester, currentUser]);

  useEffect(() => { loadScheduleData(); }, [loadScheduleData]);

  const handleSave = async () => {
    if (selectedDay === null) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      const countForDay = slotCounts[selectedDay];
      const isChanging = existingSchedule && existingSchedule.duty_day !== selectedDay;
      const isNew = !existingSchedule;

      if ((isNew || isChanging) && countForDay >= MAX_SLOTS) {
        setSaveError(`${DAY_LABELS[selectedDay]} is already full (${MAX_SLOTS}/${MAX_SLOTS}). Please pick another day.`);
        setSaving(false);
        return;
      }

      if (existingSchedule) {
        await supabase
          .from("duty_schedules")
          .delete()
          .eq("staffer_id", currentUser.id)
          .eq("semester_id", activeSemester.id);
      }

      if (!existingSchedule || isChanging) {
        const { error: insErr } = await supabase
          .from("duty_schedules")
          .insert({
            staffer_id: currentUser.id,
            semester_id: activeSemester.id,
            duty_day: selectedDay,
          });
        if (insErr) throw insErr;
      }

      setSaveSuccess(true);
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

  if (!currentUser || loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "#f9f9f9", minHeight: "100%" }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#212121" }}>
          My Duty Schedule
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "#9e9e9e", mt: 0.3 }}>
          Pick one day — you'll be on duty every week of the semester on that day.
        </Typography>
      </Box>

      {noSemester && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No active semester at the moment. Check back later.
        </Alert>
      )}

      {activeSemester && (
        <>
          {/* Semester info */}
          <Box
            sx={{
              p: 2,
              mb: 3,
              borderRadius: 2,
              border: "1px solid #f5c52b",
              backgroundColor: "#fffde7",
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <EventAvailableOutlinedIcon sx={{ fontSize: 18, color: "#f57c00" }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "#212121" }}>
                {activeSemester.name}
              </Typography>
              <Typography sx={{ fontSize: "0.78rem", color: "#757575" }}>
                {new Date(activeSemester.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {" — "}
                {new Date(activeSemester.end_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              </Typography>
            </Box>
          </Box>

          {schedulingClosed && (
            <Alert severity="warning" icon={<LockOutlinedIcon fontSize="small" />} sx={{ mb: 3, borderRadius: 2 }}>
              Scheduling is currently closed. You cannot change your duty day.
            </Alert>
          )}
          {existingSchedule && !schedulingClosed && (
            <Alert severity="success" icon={<CheckCircleIcon fontSize="small" />} sx={{ mb: 3, borderRadius: 2 }}>
              You're on <strong>{DAY_LABELS[existingSchedule.duty_day]}</strong> this semester. You can change it below.
            </Alert>
          )}
          {saveError && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{saveError}</Alert>}
          {saveSuccess && !hasChanged && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>Duty day saved successfully!</Alert>
          )}

          {/* ── Weekly calendar grid ── */}
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              border: "1px solid #e0e0e0",
              borderRadius: 2,
              overflow: "hidden",
              backgroundColor: "white",
              mb: 3,
            }}
          >
            {/* Day headers */}
            {DAY_SHORT.map((short, i) => (
              <Box
                key={short}
                sx={{
                  px: 1.5,
                  py: 1.2,
                  textAlign: "center",
                  backgroundColor: "#fafafa",
                  borderBottom: "1px solid #e0e0e0",
                  borderRight: i < 4 ? "1px solid #e0e0e0" : "none",
                }}
              >
                <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "#9e9e9e", letterSpacing: 1 }}>
                  {short}
                </Typography>
              </Box>
            ))}

            {/* Day cells */}
            {DAY_LABELS.map((day, i) => {
              const count     = slotCounts[i];
              const isFull    = count >= MAX_SLOTS;
              const isMyPick  = existingSchedule?.duty_day === i;
              const isSelected = selectedDay === i;
              const isDisabled = schedulingClosed || (isFull && !isMyPick);

              return (
                <Box
                  key={day}
                  onClick={() => !isDisabled && setSelectedDay(i)}
                  sx={{
                    px: 1.5,
                    py: 2.5,
                    textAlign: "center",
                    borderRight: i < 4 ? "1px solid #e0e0e0" : "none",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    backgroundColor: isSelected
                      ? "#fffde7"
                      : isMyPick
                      ? "#f1f8e9"
                      : "white",
                    borderTop: isSelected
                      ? "3px solid #f5c52b"
                      : isMyPick
                      ? "3px solid #a5d6a7"
                      : "3px solid transparent",
                    opacity: isDisabled && !isMyPick ? 0.45 : 1,
                    transition: "all 0.15s ease",
                    "&:hover": !isDisabled ? {
                      backgroundColor: "#fffde7",
                      borderTop: "3px solid #f5c52b",
                    } : {},
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  {/* Selected checkmark or circle */}
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: isSelected ? "#f5c52b" : isMyPick ? "#a5d6a7" : "#f5f5f5",
                      transition: "background-color 0.15s",
                    }}
                  >
                    {isSelected || isMyPick ? (
                      <CheckCircleIcon sx={{ fontSize: 16, color: "white" }} />
                    ) : (
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#e0e0e0" }} />
                    )}
                  </Box>

                  {/* Slot count */}
                  <Box>
                    <Typography sx={{ fontSize: "0.72rem", color: isFull ? "#c62828" : "#9e9e9e", fontWeight: isFull ? 600 : 400 }}>
                      {count}/{MAX_SLOTS}
                    </Typography>
                    {isFull && !isMyPick && (
                      <Typography sx={{ fontSize: "0.65rem", color: "#c62828", fontWeight: 600 }}>Full</Typography>
                    )}
                    {isMyPick && (
                      <Typography sx={{ fontSize: "0.65rem", color: "#2e7d32", fontWeight: 600 }}>Your day</Typography>
                    )}
                  </Box>

                  {/* Slot fill bar */}
                  <Box sx={{ width: "80%", height: 3, borderRadius: 2, backgroundColor: "#f0f0f0" }}>
                    <Box
                      sx={{
                        height: "100%",
                        width: `${(count / MAX_SLOTS) * 100}%`,
                        borderRadius: 2,
                        backgroundColor: isFull ? "#ef9a9a" : "#f5c52b",
                        transition: "width 0.3s ease",
                      }}
                    />
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={saving || selectedDay === null || !hasChanged || schedulingClosed}
              sx={{
                textTransform: "none",
                fontWeight: 600,
                backgroundColor: "#f5c52b",
                color: "#212121",
                boxShadow: "none",
                px: 3,
                "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
                "&.Mui-disabled": { backgroundColor: "#f5f5f5", color: "#bdbdbd" },
              }}
            >
              {saving
                ? <CircularProgress size={18} sx={{ color: "#212121" }} />
                : existingSchedule ? "Change My Day" : "Confirm My Day"}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}