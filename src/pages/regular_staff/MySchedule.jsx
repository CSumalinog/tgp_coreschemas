// src/pages/regular_staff/MySchedule.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Alert, Chip, Button, Divider,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import EventAvailableOutlinedIcon from "@mui/icons-material/EventAvailableOutlined";
import { supabase } from "../../lib/supabaseClient";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_SHORT  = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const MAX_SLOTS  = 10;

export default function MySchedule() {
  const [currentUser, setCurrentUser]       = useState(null);
  const [activeSemester, setActiveSemester] = useState(null);
  const [slotCounts, setSlotCounts]         = useState([0, 0, 0, 0, 0]);
  const [existingSchedule, setExistingSchedule] = useState(null); // current pick
  const [selectedDay, setSelectedDay]       = useState(null);     // UI selection
  const [saving, setSaving]                 = useState(false);
  const [saveError, setSaveError]           = useState("");
  const [saveSuccess, setSaveSuccess]       = useState(false);
  const [loading, setLoading]               = useState(true);

  // ── Load current user ──
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

  // ── Load active semester ──
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

  // ── Load slot counts + existing pick ──
  const loadScheduleData = useCallback(async () => {
    if (!activeSemester?.id || !currentUser?.id) return;
    setLoading(true);

    // All picks for this semester (for slot counts)
    const { data: allSchedules } = await supabase
      .from("duty_schedules")
      .select("duty_day, staffer_id")
      .eq("semester_id", activeSemester.id);

    // Count per day
    const counts = [0, 0, 0, 0, 0];
    (allSchedules || []).forEach((s) => {
      if (s.duty_day >= 0 && s.duty_day <= 4) counts[s.duty_day]++;
    });
    setSlotCounts(counts);

    // This staffer's existing pick
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

  // ── Save ──
  const handleSave = async () => {
    if (selectedDay === null) return;
    setSaving(true);
    setSaveError("");
    setSaveSuccess(false);

    try {
      // Check slot cap (re-verify on save)
      const countForDay = slotCounts[selectedDay];
      const isChanging = existingSchedule && existingSchedule.duty_day !== selectedDay;
      const isNew = !existingSchedule;

      if ((isNew || isChanging) && countForDay >= MAX_SLOTS) {
        setSaveError(`${DAY_LABELS[selectedDay]} is already full (${MAX_SLOTS}/${MAX_SLOTS}). Please pick another day.`);
        setSaving(false);
        return;
      }

      if (existingSchedule) {
        // Delete old, insert new
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

  // ── States ──
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
    <Box sx={{ maxWidth: 620, mx: "auto", pt: 4, px: 2 }}>

      {/* Page title */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.2rem", color: "#212121" }}>
          My Duty Schedule
        </Typography>
        <Typography sx={{ fontSize: "0.82rem", color: "#9e9e9e", mt: 0.3 }}>
          Pick one day per week — you'll be on duty every week of the semester on that day.
        </Typography>
      </Box>

      {/* No semester */}
      {noSemester && (
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          No active semester at the moment. Check back later.
        </Alert>
      )}

      {activeSemester && (
        <>
          {/* Semester info card */}
          <Box
            sx={{
              p: 2.5,
              mb: 3,
              borderRadius: 2,
              border: "1px solid #f5c52b",
              backgroundColor: "#fffde7",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
              <EventAvailableOutlinedIcon sx={{ fontSize: 16, color: "#f57c00" }} />
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "#f57c00", textTransform: "uppercase", letterSpacing: 0.5 }}>
                Active Semester
              </Typography>
            </Box>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#212121" }}>
              {activeSemester.name}
            </Typography>
            <Typography sx={{ fontSize: "0.82rem", color: "#757575", mt: 0.3 }}>
              {new Date(activeSemester.start_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
              {" — "}
              {new Date(activeSemester.end_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </Typography>
          </Box>

          {/* Scheduling closed banner */}
          {schedulingClosed && (
            <Alert
              severity="warning"
              icon={<LockOutlinedIcon fontSize="small" />}
              sx={{ mb: 3, borderRadius: 2, fontSize: "0.85rem" }}
            >
              Scheduling is currently closed. You cannot change your duty day.
            </Alert>
          )}

          {/* Already picked banner */}
          {existingSchedule && !schedulingClosed && (
            <Alert
              severity="success"
              icon={<CheckCircleIcon fontSize="small" />}
              sx={{ mb: 3, borderRadius: 2, fontSize: "0.85rem" }}
            >
              You're currently on <strong>{DAY_LABELS[existingSchedule.duty_day]}</strong>. You can change it below while scheduling is open.
            </Alert>
          )}

          {saveError && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{saveError}</Alert>
          )}
          {saveSuccess && !hasChanged && (
            <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
              Your duty day has been saved successfully!
            </Alert>
          )}

          {/* Day picker */}
          <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "#757575", mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
            Choose Your Day
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 3 }}>
            {DAY_LABELS.map((day, i) => {
              const count = slotCounts[i];
              const isFull = count >= MAX_SLOTS;
              const isMyCurrentPick = existingSchedule?.duty_day === i;
              const isSelected = selectedDay === i;
              const isDisabled = schedulingClosed || (isFull && !isMyCurrentPick);

              return (
                <Box
                  key={day}
                  onClick={() => !isDisabled && setSelectedDay(i)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    p: 2,
                    borderRadius: 2,
                    border: "1.5px solid",
                    borderColor: isSelected
                      ? "#f5c52b"
                      : isMyCurrentPick
                      ? "#a5d6a7"
                      : "#e0e0e0",
                    backgroundColor: isSelected
                      ? "#fffde7"
                      : isMyCurrentPick && !isSelected
                      ? "#f1f8e9"
                      : "white",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled && !isMyCurrentPick ? 0.5 : 1,
                    transition: "all 0.15s ease",
                    "&:hover": !isDisabled
                      ? { borderColor: "#f5c52b", backgroundColor: "#fffde7" }
                      : {},
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                    {/* Day indicator circle */}
                    <Box
                      sx={{
                        width: 36,
                        height: 36,
                        borderRadius: "50%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: isSelected ? "#f5c52b" : "#f5f5f5",
                        transition: "background-color 0.15s",
                      }}
                    >
                      <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "#212121" : "#9e9e9e" }}>
                        {DAY_SHORT[i]}
                      </Typography>
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: isSelected ? 700 : 500, fontSize: "0.9rem", color: "#212121" }}>
                        {day}
                      </Typography>
                      {isMyCurrentPick && (
                        <Typography sx={{ fontSize: "0.72rem", color: "#2e7d32", fontWeight: 500 }}>
                          Your current pick
                        </Typography>
                      )}
                    </Box>
                  </Box>

                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    {/* Slot bar */}
                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontSize: "0.75rem", color: isFull ? "#c62828" : "#9e9e9e", fontWeight: isFull ? 600 : 400 }}>
                        {count}/{MAX_SLOTS} {isFull ? "— Full" : "slots"}
                      </Typography>
                      <Box sx={{ width: 80, height: 4, borderRadius: 2, backgroundColor: "#f0f0f0", mt: 0.5 }}>
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

                    {isSelected && (
                      <CheckCircleIcon sx={{ fontSize: 20, color: "#f5c52b" }} />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ mb: 2.5 }} />

          {/* Save button */}
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
                : existingSchedule
                ? "Change My Day"
                : "Confirm My Day"}
            </Button>
          </Box>
        </>
      )}
    </Box>
  );
}