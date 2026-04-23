// src/pages/admin/CalendarManagement.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Box, Typography, IconButton, Alert, useTheme, Divider, Menu, MenuItem } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNewOutlined";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIosOutlined";
import { useNavigate, useLocation } from "react-router-dom";
import CalendarEventDialog from "../../components/admin/CalendarAvailabilitySetter";
import BlockedDatesPanel from "../../components/admin/BlockedDatesPanel";
import RequestSlotsDialog from "../../components/admin/RequestSlotsDialog";
import DutySettingsDialog from "../../components/admin/DutySettingsDialog";
import { supabase } from "../../lib/supabaseClient";
import { pushSuccessToast } from "../../components/common/SuccessToast";
import BrandedLoader from "../../components/common/BrandedLoader";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm = "'Inter', sans-serif";

// ── Calendar config ───────────────────────────────────────────────────────────
const SCHEDULER_START_HOUR = 8;
const SCHEDULER_END_HOUR = 24;
const SLOT_HEIGHT = 60;
const MINUTE_RATIO = SLOT_HEIGHT / 60;
const TIME_COL_WIDTH = 64;
const DAY_COL_MIN_WIDTH = 96;

// ── Helpers ───────────────────────────────────────────────────────────────────
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d, n) => {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
};
const startOfWeek = (d) => {
  const day = d.getDay();
  return addDays(d, -((day + 6) % 7));
};
const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
const formatISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isPastDate = (date) => startOfDay(date) < startOfDay(new Date());

function getDensityBg(count, isDark) {
  if (!count) return "transparent";
  if (count === 1)
    return isDark ? "rgba(245,197,43,0.05)" : "rgba(245,197,43,0.06)";
  if (count === 2)
    return isDark ? "rgba(245,197,43,0.10)" : "rgba(245,197,43,0.12)";
  if (count === 3)
    return isDark ? "rgba(245,197,43,0.16)" : "rgba(245,197,43,0.18)";
  return isDark ? "rgba(220,38,38,0.18)" : "rgba(220,38,38,0.10)";
}

function fmtDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CalendarManagement() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;
  const today = new Date();
  const [viewMode, setViewMode] = useState("week");

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    return startOfWeek(d);
  });
  const [currentMonthStart, setCurrentMonthStart] = useState(() =>
    startOfMonth(new Date()),
  );
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [dutySettingsOpen, setDutySettingsOpen] = useState(false);
  const [defaultSlots, setDefaultSlots] = useState(2);
  const [slotOverrides, setSlotOverrides] = useState([]);
  const [dutyBlackouts, setDutyBlackouts] = useState([]);
  const [cellMenuAnchor, setCellMenuAnchor] = useState(null);
  const [cellMenuDate, setCellMenuDate] = useState(null);
  const [slotInitialDate, setSlotInitialDate] = useState(null);
  const [dutyInitialDate, setDutyInitialDate] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, []);

  const loadSlotSummary = useCallback(async () => {
    try {
      const [{ data: settingsRow }, { data: overrides }] = await Promise.all([
        supabase
          .from("calendar_slot_settings")
          .select("id, default_slots")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("calendar_slot_overrides")
          .select("slot_date, slot_capacity")
          .order("slot_date", { ascending: true }),
      ]);
      setDefaultSlots(settingsRow?.default_slots ?? 2);
      setSlotOverrides(overrides || []);
    } catch { /* silently ignore */ }
  }, []);

  const loadDutySummary = useCallback(async () => {
    try {
      const { data: activeSemester } = await supabase
        .from("semesters")
        .select("id")
        .eq("is_active", true)
        .maybeSingle();
      if (!activeSemester) { setDutyBlackouts([]); return; }
      const { data } = await supabase
        .from("duty_schedule_blackout_dates")
        .select("id, blackout_date, reason")
        .eq("semester_id", activeSemester.id)
        .order("blackout_date", { ascending: true });
      setDutyBlackouts(data || []);
    } catch { /* silently ignore */ }
  }, []);

  useEffect(() => {
    loadSlotSummary();
  }, [loadSlotSummary]);

  useEffect(() => {
    loadDutySummary();
  }, [loadDutySummary]);

  useEffect(() => {
    if (location.state?.openDutySettings) {
      setDutySettingsOpen(true);
    }
  }, [location.state?.openDutySettings]);



  const loadEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: fetchErr } = await supabase
        .from("blocked_dates")
        .select(
          "id, title, notes, start_date, end_date, start_time, end_time, blocked_by, created_at",
        )
        .order("start_date", { ascending: true });
      if (fetchErr) throw fetchErr;

      const blockerIds = [
        ...new Set((data || []).map((r) => r.blocked_by).filter(Boolean)),
      ];
      let blockerNameById = {};
      if (blockerIds.length > 0) {
        const { data: blockerRows } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", blockerIds);
        blockerNameById = Object.fromEntries(
          (blockerRows || []).map((r) => [r.id, r.full_name || "Unknown"]),
        );
      }

      setEvents(
        (data || []).map((row) => {
          const isMulti = row.start_date !== row.end_date;

          // Build startDate: use start_time if available (single-day), else noon fallback
          const startDate = row.start_time
            ? new Date(`${row.start_date}T${row.start_time}`)
            : new Date(
                `${row.start_date}T${isMulti ? "00:00:00" : "08:00:00"}`,
              );

          const endDate = row.end_time
            ? new Date(`${row.end_date}T${row.end_time}`)
            : new Date(`${row.end_date}T${isMulti ? "23:59:59" : "09:00:00"}`);

          return {
            id: row.id,
            title: row.title,
            notes: row.notes || "",
            eventType: isMulti ? "multi" : "single",
            startDate,
            endDate,
            blocked_by: row.blocked_by,
            blocked_by_name: blockerNameById[row.blocked_by] || "Unknown",
            created_at: row.created_at,
          };
        }),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventsMap = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      let d = startOfDay(new Date(ev.startDate));
      const end = startOfDay(new Date(ev.endDate));
      while (d <= end) {
        const key = formatISO(d);
        if (!map[key]) map[key] = [];
        map[key].push(ev);
        d = addDays(d, 1);
      }
    });
    return map;
  }, [events]);

  const densityMap = useMemo(() => {
    const map = {};
    events.forEach((ev) => {
      const isMulti = ev.eventType === "multi";
      if (isMulti) {
        // Mark every hour of every day in the range
        let d = startOfDay(new Date(ev.startDate));
        const endDay = startOfDay(new Date(ev.endDate));
        while (d <= endDay) {
          const iso = formatISO(d);
          for (let h = SCHEDULER_START_HOUR; h < SCHEDULER_END_HOUR; h++)
            map[`${iso}_${h}`] = (map[`${iso}_${h}`] || 0) + 1;
          d = addDays(d, 1);
        }
      } else {
        const start = new Date(ev.startDate),
          end = new Date(ev.endDate);
        const iso = formatISO(start);
        for (let h = start.getHours(); h <= end.getHours(); h++)
          map[`${iso}_${h}`] = (map[`${iso}_${h}`] || 0) + 1;
      }
    });
    return map;
  }, [events]);

  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart],
  );

  const monthDays = useMemo(() => {
    const firstDay = startOfMonth(currentMonthStart);
    const firstGridDay = startOfWeek(firstDay);
    return Array.from({ length: 42 }).map((_, i) => addDays(firstGridDay, i));
  }, [currentMonthStart]);

  const goPrev = () => {
    if (viewMode === "week") {
      setCurrentWeekStart(addDays(currentWeekStart, -7));
      return;
    }
    setCurrentMonthStart(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
    );
  };

  const goNext = () => {
    if (viewMode === "week") {
      setCurrentWeekStart(addDays(currentWeekStart, 7));
      return;
    }
    setCurrentMonthStart(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
    );
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(today));
    setCurrentMonthStart(startOfMonth(today));
  };

  const handleSaveEvent = async (eventData) => {
    setError("");
    try {
      const start = new Date(eventData.startDate);
      const end = new Date(eventData.endDate);
      const startIso = formatISO(start);
      const endIso = formatISO(end);
      const isMulti = eventData.eventType === "multi";

      // For single-day events, persist the time so the grid renders correctly
      const startTime = isMulti
        ? null
        : `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}:00`;
      const endTime = isMulti
        ? null
        : `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}:00`;

      const payload = {
        title: eventData.title,
        notes: eventData.notes || null,
        start_date: startIso,
        end_date: endIso,
        start_time: startTime,
        end_time: endTime,
      };

      if (editingEvent) {
        const { error: e } = await supabase
          .from("blocked_dates")
          .update(payload)
          .eq("id", editingEvent.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase
          .from("blocked_dates")
          .insert({ ...payload, blocked_by: currentUser?.id });
        if (e) throw e;
      }
      await loadEvents();
      setOpenDialog(false);
      pushSuccessToast(editingEvent ? "Event updated." : "Event saved.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteEvent = async (id) => {
    setError("");
    try {
      const { error: e } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("id", id);
      if (e) throw e;
      await loadEvents();
      setOpenDialog(false);
      pushSuccessToast("Event deleted.");
    } catch (err) {
      setError(err.message);
    }
  };

  const handleQuickDelete = async (id) => {
    setError("");
    try {
      const { error: e } = await supabase
        .from("blocked_dates")
        .delete()
        .eq("id", id);
      if (e) throw e;
      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCellClick = (e, date, hour) => {
    if (isPastDate(date)) return;
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    setCellMenuAnchor(e.currentTarget);
    setCellMenuDate(start);
  };

  const handlePanelEdit = (ev) => {
    setEditingEvent(ev);
    setSelectedDate(new Date(ev.startDate));
    setOpenDialog(true);
  };
  const handlePanelAdd = () => {
    setEditingEvent(null);
    setSelectedDate(new Date());
    setOpenDialog(true);
  };

  const handleMonthCellClick = (e, date) => {
    if (isPastDate(date)) return;
    const start = new Date(date);
    start.setHours(8, 0, 0, 0);
    setCellMenuAnchor(e.currentTarget);
    setCellMenuDate(start);
  };

  // Single-day timed block
  const renderTimedBlock = (ev) => {
    const start = new Date(ev.startDate);
    const end = new Date(ev.endDate);
    const startMinutes =
      (start.getHours() - SCHEDULER_START_HOUR) * 60 + start.getMinutes();
    const durationMins = (end - start) / (1000 * 60);
    return (
      <Box
        key={ev.id}
        sx={{
          position: "absolute",
          top: startMinutes * MINUTE_RATIO,
          height: Math.max(durationMins * MINUTE_RATIO, 20),
          left: 2,
          right: 2,
          backgroundColor: isDark ? "#d9d9d9" : "#212121",
          color: isDark ? "#212121" : "#fff",
          borderRadius: "4px",
          p: 0.5,
          overflow: "hidden",
          zIndex: 1,
          border: "none",
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setEditingEvent(ev);
          setSelectedDate(new Date(ev.startDate));
          setOpenDialog(true);
        }}
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.68rem",
            fontWeight: 700,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ev.title}
        </Typography>
        <Typography sx={{ fontFamily: dm, fontSize: "0.6rem", opacity: 0.85 }}>
          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Typography>
      </Box>
    );
  };

  // Multi-day full-column fill — rendered once per day in the SCHEDULER_START_HOUR row
  const renderAllDayBlock = (ev) => (
    <Box
      key={ev.id}
      sx={{
        position: "absolute",
        top: 0,
        height: (SCHEDULER_END_HOUR - SCHEDULER_START_HOUR) * SLOT_HEIGHT,
        left: 2,
        right: 2,
        backgroundColor: isDark ? "#d9d9d9" : "#212121",
        color: isDark ? "#212121" : "#fff",
        borderRadius: "4px",
        overflow: "hidden",
        zIndex: 1,
        border: "none",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
      }}
      onClick={(e) => {
        e.stopPropagation();
        setEditingEvent(ev);
        setSelectedDate(new Date(ev.startDate));
        setOpenDialog(true);
      }}
    >
      <Box
        sx={{
          position: "sticky",
          top: 4,
          mx: 0.5,
          px: 0.75,
          py: 0.4,
          borderRadius: "10px",
          backgroundColor: isDark
            ? "rgba(255,255,255,0.08)"
            : "rgba(255,255,255,0.15)",
          flexShrink: 0,
        }}
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.68rem",
            fontWeight: 700,
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ev.title}
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.58rem",
            opacity: 0.75,
            lineHeight: 1.3,
          }}
        >
          All day
        </Typography>
      </Box>
    </Box>
  );

  const headerTitle =
    viewMode === "week"
      ? currentWeekStart.toLocaleString("default", { month: "long", year: "numeric" })
      : currentMonthStart.toLocaleString("default", { month: "long", year: "numeric" });
  const stickyBg = isDark ? "#161616" : "#ffffff";

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        backgroundColor: isDark ? "background.default" : "#ffffff",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: dm,
      }}
    >
      {/* ── Page header ── */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        {/* Left spacer — mirrors right controls width for centering */}
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", visibility: "hidden" }}>
          <Box sx={{ display: "inline-flex", p: 0.25, borderRadius: "10px", border: `1px solid ${border}` }}>
            <Box sx={{ px: 1.1, py: 0.45, fontFamily: dm, fontSize: "0.72rem" }}>Week</Box>
            <Box sx={{ px: 1.1, py: 0.45, fontFamily: dm, fontSize: "0.72rem" }}>Month</Box>
          </Box>
          <Box sx={{ px: 1.5, py: 0.55, fontFamily: dm, fontSize: "0.76rem" }}>Today</Box>
        </Box>

        {/* ── Centered nav unit: < April 2026 > ── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton
            onClick={goPrev}
            size="small"
            sx={{
              border: `1px solid ${border}`,
              borderRadius: "10px",
              p: 0.65,
              color: "text.secondary",
              "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08, color: CHARCOAL },
              transition: "all 0.15s",
            }}
          >
            <ArrowBackIosNewIcon sx={{ fontSize: 13 }} />
          </IconButton>

          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: { xs: "0.88rem", sm: "1rem" },
              color: "text.primary",
              letterSpacing: "-0.02em",
              minWidth: 140,
              textAlign: "center",
            }}
          >
            {headerTitle}
          </Typography>

          <IconButton
            onClick={goNext}
            size="small"
            sx={{
              border: `1px solid ${border}`,
              borderRadius: "10px",
              p: 0.65,
              color: "text.secondary",
              "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08, color: CHARCOAL },
              transition: "all 0.15s",
            }}
          >
            <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
          </IconButton>
        </Box>

        {/* ── Right controls ── */}
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              p: 0.25,
              borderRadius: "10px",
              border: `1px solid ${border}`,
              backgroundColor: "background.paper",
            }}
          >
            <Box
              onClick={() => setViewMode("week")}
              sx={{
                px: 1.1,
                py: 0.45,
                borderRadius: "10px",
                cursor: "pointer",
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                color: viewMode === "week" ? CHARCOAL : "text.secondary",
                backgroundColor: viewMode === "week" ? GOLD_08 : "transparent",
                border: viewMode === "week"
                  ? `1px solid ${isDark ? "rgba(245,197,43,0.35)" : "rgba(245,197,43,0.45)"}`
                  : "1px solid transparent",
                transition: "all 0.15s",
              }}
            >
              Week
            </Box>
            <Box
              onClick={() => setViewMode("month")}
              sx={{
                px: 1.1,
                py: 0.45,
                borderRadius: "10px",
                cursor: "pointer",
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                color: viewMode === "month" ? CHARCOAL : "text.secondary",
                backgroundColor: viewMode === "month" ? GOLD_08 : "transparent",
                border: viewMode === "month"
                  ? `1px solid ${isDark ? "rgba(245,197,43,0.35)" : "rgba(245,197,43,0.45)"}`
                  : "1px solid transparent",
                transition: "all 0.15s",
              }}
            >
              Month
            </Box>
          </Box>

          <Box
            onClick={goToToday}
            sx={{
              px: 1.5,
              py: 0.55,
              borderRadius: "10px",
              cursor: "pointer",
              border: `1px solid ${border}`,
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "text.secondary",
              userSelect: "none",
              transition: "all 0.15s",
              "&:hover": { borderColor: GOLD, color: CHARCOAL, backgroundColor: GOLD_08 },
            }}
          >
            Today
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2.5,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          {error}
        </Alert>
      )}

      {/* ── Two-column layout ── */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          alignItems: "stretch",
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
        }}
      >
        {/* ── Calendar grid ── */}
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: "flex" }}>
          <Box
            sx={{
              flex: 1,
              minHeight: 0,
              overflowX: "auto",
              overflowY: "auto",
              borderRadius: "10px",
              backgroundColor: "background.paper",
              border: `1px solid ${border}`,
              WebkitOverflowScrolling: "touch",
              "&::-webkit-scrollbar": { height: 4, width: 4 },
              "&::-webkit-scrollbar-track": { background: "transparent" },
              "&::-webkit-scrollbar-thumb": {
                background: isDark ? "#3a3a3a" : "#e0e0e0",
                borderRadius: "10px",
              },
            }}
          >
            {loading ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 300,
                }}
              >
                <BrandedLoader size={44} inline />
              </Box>
            ) : viewMode === "month" ? (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "repeat(7, minmax(120px, 1fr))",
                  minWidth: 7 * 120,
                }}
              >
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(
                  (dayLabel) => (
                    <Box
                      key={dayLabel}
                      sx={{
                        position: "sticky",
                        top: 0,
                        zIndex: 3,
                        px: 1,
                        py: 1,
                        textAlign: "center",
                        borderLeft: `1px solid ${border}`,
                        borderBottom: `1px solid ${border}`,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.02)"
                          : "rgba(53,53,53,0.02)",
                        "&:first-of-type": { borderLeft: "none" },
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontWeight: 700,
                          fontSize: "0.68rem",
                          color: "text.secondary",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        {dayLabel}
                      </Typography>
                    </Box>
                  ),
                )}

                {monthDays.map((date) => {
                  const iso = formatISO(date);
                  const dayEvents = eventsMap[iso] || [];
                  const isToday = iso === formatISO(today);
                  const inCurrentMonth =
                    date.getMonth() === currentMonthStart.getMonth();
                  const pastCell = isPastDate(date);
                  const densityBg = getDensityBg(dayEvents.length, isDark);

                  return (
                    <Box
                      key={iso}
                      onClick={(e) => handleMonthCellClick(e, date)}
                      sx={{
                        minHeight: 116,
                        p: 1,
                        borderLeft: `1px solid ${border}`,
                        borderTop: `1px solid ${border}`,
                        backgroundColor:
                          dayEvents.length > 0
                            ? densityBg
                            : pastCell
                              ? isDark
                                ? "rgba(255,255,255,0.02)"
                                : "rgba(53,53,53,0.03)"
                              : inCurrentMonth
                                ? "transparent"
                                : isDark
                                  ? "rgba(255,255,255,0.015)"
                                  : "rgba(53,53,53,0.015)",
                        cursor: pastCell ? "not-allowed" : "pointer",
                        opacity: inCurrentMonth ? (pastCell ? 0.5 : 1) : 0.58,
                        transition: "background-color 0.15s",
                        "&:hover": !pastCell
                          ? {
                              backgroundColor: isDark
                                ? "rgba(245,197,43,0.06)"
                                : "rgba(245,197,43,0.08)",
                            }
                          : undefined,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          mb: 0.8,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.78rem",
                            fontWeight: isToday ? 700 : 500,
                            color: isToday
                              ? CHARCOAL
                              : pastCell
                                ? "text.disabled"
                                : "text.primary",
                          }}
                        >
                          {date.getDate()}
                        </Typography>
                        {dayEvents.length > 0 && (
                          <Box
                            sx={{
                              px: 0.55,
                              py: 0.1,
                              borderRadius: "10px",
                              border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(53,53,53,0.15)"}`,
                              fontFamily: dm,
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              color: "text.secondary",
                              lineHeight: 1.2,
                            }}
                          >
                            {dayEvents.length}
                          </Box>
                        )}
                      </Box>

                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.35,
                        }}
                      >
                        {dayEvents.slice(0, 2).map((ev) => (
                          <Box
                            key={ev.id}
                            sx={{
                              px: 0.65,
                              py: 0.35,
                              borderRadius: "4px",
                              backgroundColor: isDark ? "#d9d9d9" : "#212121",
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.64rem",
                                fontWeight: 600,
                                color: isDark ? "#212121" : "#fff",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {ev.title}
                            </Typography>
                          </Box>
                        ))}
                        {dayEvents.length > 2 && (
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.62rem",
                              color: "text.disabled",
                              px: 0.2,
                            }}
                          >
                            +{dayEvents.length - 2} more
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: `${TIME_COL_WIDTH}px repeat(7, minmax(${DAY_COL_MIN_WIDTH}px, 1fr))`,
                  minWidth: TIME_COL_WIDTH + 7 * DAY_COL_MIN_WIDTH,
                }}
              >
                {/* Top-left corner */}
                <Box
                  sx={{
                    position: "sticky",
                    top: 0,
                    left: 0,
                    zIndex: 4,
                    borderBottom: `1px solid ${border}`,
                    backgroundColor: stickyBg,
                  }}
                />

                {/* Day headers */}
                {weekDays.map((date) => {
                  const isToday = formatISO(date) === formatISO(today);
                  const dayBlocks = eventsMap[formatISO(date)] || [];
                  return (
                    <Box
                      key={date.toISOString()}
                      sx={{
                        textAlign: "center",
                        px: 1,
                        py: 1.25,
                        borderLeft: `1px solid ${border}`,
                        borderBottom: isToday
                          ? `2px solid ${GOLD}`
                          : `1px solid ${border}`,
                        backgroundColor: isToday
                          ? isDark
                            ? GOLD_08
                            : "rgba(245,197,43,0.06)"
                          : isDark
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(53,53,53,0.02)",
                        position: "sticky",
                        top: 0,
                        zIndex: 3,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontWeight: 600,
                          fontSize: "0.72rem",
                          color: isToday ? CHARCOAL : "text.secondary",
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {date.toLocaleDateString(undefined, {
                          weekday: "short",
                        })}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.88rem",
                          fontWeight: isToday ? 700 : 400,
                          color: isToday ? CHARCOAL : "text.primary",
                          lineHeight: 1.3,
                        }}
                      >
                        {date.getDate()}
                      </Typography>
                      {dayBlocks.length > 0 && (
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 0.5 }}>
                          <Box
                            sx={{
                              px: 0.7,
                              py: 0.15,
                              borderRadius: "4px",
                              backgroundColor: "#212121",
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.58rem",
                                fontWeight: 700,
                                color: "#fff",
                                lineHeight: 1.4,
                              }}
                            >
                              {dayBlocks.length}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}

                {/* Time rows */}
                {Array.from({
                  length: SCHEDULER_END_HOUR - SCHEDULER_START_HOUR,
                }).map((_, i) => {
                  const hour = SCHEDULER_START_HOUR + i;
                  return (
                    <React.Fragment key={hour}>
                      <Box
                        sx={{
                          position: "sticky",
                          left: 0,
                          zIndex: 2,
                          px: 1,
                          py: 0.5,
                          borderTop: `1px solid ${border}`,
                          backgroundColor: stickyBg,
                          display: "flex",
                          alignItems: "flex-start",
                          width: TIME_COL_WIDTH,
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.62rem",
                            color: "text.disabled",
                            userSelect: "none",
                            lineHeight: 1,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {new Date(0, 0, 0, hour).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </Typography>
                      </Box>

                      {weekDays.map((date) => {
                        const iso = formatISO(date);
                        const pastCell = isPastDate(date);
                        const allEvs = eventsMap[iso] || [];

                        // Multi-day: full-column fill, rendered only in the first hour row
                        const allDayEvs =
                          hour === SCHEDULER_START_HOUR
                            ? allEvs.filter((ev) => ev.eventType === "multi")
                            : [];

                        // Single-day timed: render in their start-hour row
                        const timedEvs = allEvs.filter(
                          (ev) =>
                            ev.eventType !== "multi" &&
                            new Date(ev.startDate).getHours() === hour,
                        );

                        const densityBg = getDensityBg(
                          densityMap[`${iso}_${hour}`] || 0,
                          isDark,
                        );

                        return (
                          <Box
                            key={iso + hour}
                            sx={{
                              position: "relative",
                              minHeight: SLOT_HEIGHT,
                              borderTop: `1px solid ${border}`,
                              borderLeft: `1px solid ${border}`,
                              p: 0.3,
                              cursor: pastCell ? "not-allowed" : "pointer",
                              opacity: pastCell ? 0.45 : 1,
                              transition: "background-color 0.12s",
                              "&:hover": !pastCell
                                ? {
                                    backgroundColor: isDark
                                      ? "rgba(245,197,43,0.06)"
                                      : "rgba(245,197,43,0.07)",
                                  }
                                : {},
                            }}
                            onClick={(e) => handleCellClick(e, date, hour)}
                          />
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </Box>
            )}
          </Box>
        </Box>

        {/* ── Blocked dates panel (collapsible) ── */}
        <BlockedDatesPanel
          events={events}
          loading={loading}
          isDark={isDark}
          onEdit={handlePanelEdit}
          onDelete={handleQuickDelete}
          onAdd={handlePanelAdd}
          onViewAll={() =>
            navigate("/admin/calendar-management/blocking-details")
          }
          onOpenLogEntry={(eventId) =>
            navigate(
              `/admin/calendar-management/blocking-details?eventId=${eventId}`,
            )
          }
          defaultSlots={defaultSlots}
          overrideCount={slotOverrides.length}
          slotOverrides={slotOverrides}
          dutyBlackouts={dutyBlackouts}
          onOpenSlotSettings={() => { setSlotInitialDate(null); setSlotDialogOpen(true); }}
          onOpenDutySettings={() => { setDutyInitialDate(null); setDutySettingsOpen(true); }}
          collapsed={panelCollapsed}
          onToggle={() => setPanelCollapsed((v) => !v)}
        />
      </Box>

      <Menu
        anchorEl={cellMenuAnchor}
        open={Boolean(cellMenuAnchor)}
        onClose={() => setCellMenuAnchor(null)}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "10px",
              border: `1px solid ${border}`,
              boxShadow: isDark
                ? "0 4px 24px rgba(0,0,0,0.4)"
                : "0 4px 24px rgba(0,0,0,0.10)",
              minWidth: 180,
            },
          },
        }}
      >
        <Box sx={{ px: 2, pt: 1.2, pb: 0.75 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.7rem",
              fontWeight: 600,
              color: "text.secondary",
              letterSpacing: "0.04em",
            }}
          >
            {cellMenuDate?.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Typography>
        </Box>
        <Divider />
        <MenuItem
          onClick={() => {
            setCellMenuAnchor(null);
            setEditingEvent(null);
            setSelectedDate(cellMenuDate);
            setOpenDialog(true);
          }}
          sx={{ fontFamily: dm, fontSize: "0.78rem", py: 1, px: 2 }}
        >
          Block this date
        </MenuItem>
        <MenuItem
          onClick={() => {
            setCellMenuAnchor(null);
            setSlotInitialDate(cellMenuDate ? formatISO(cellMenuDate) : null);
            setSlotDialogOpen(true);
          }}
          sx={{ fontFamily: dm, fontSize: "0.78rem", py: 1, px: 2 }}
        >
          Set slot override
        </MenuItem>
        <MenuItem
          onClick={() => {
            setCellMenuAnchor(null);
            setDutyInitialDate(cellMenuDate ? formatISO(cellMenuDate) : null);
            setDutySettingsOpen(true);
          }}
          sx={{ fontFamily: dm, fontSize: "0.78rem", py: 1, px: 2 }}
        >
          Add duty blackout
        </MenuItem>
      </Menu>
      <RequestSlotsDialog key={slotDialogOpen ? (slotInitialDate || "request-slot-today") : "request-slot-closed"} open={slotDialogOpen} onClose={() => setSlotDialogOpen(false)} currentUser={currentUser} onDataChanged={loadSlotSummary} initialDate={slotInitialDate} />
      <DutySettingsDialog open={dutySettingsOpen} onClose={() => setDutySettingsOpen(false)} currentUser={currentUser} onDataChanged={loadDutySummary} initialDate={dutyInitialDate} />

      <CalendarEventDialog
        open={openDialog}
        handleClose={() => setOpenDialog(false)}
        handleSave={handleSaveEvent}
        handleDelete={handleDeleteEvent}
        defaultDate={selectedDate}
        existingEvent={editingEvent}
        existingEvents={events}
      />
    </Box>
  );
}
