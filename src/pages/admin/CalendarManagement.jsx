// src/pages/admin/CalendarManagement.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Box, Typography, IconButton, Paper, CircularProgress,
  Alert, useTheme, Tooltip, Divider,
} from "@mui/material";
import ArrowBackIosNewIcon       from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon       from "@mui/icons-material/ArrowForwardIos";
import DeleteOutlinedIcon        from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon          from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon         from "@mui/icons-material/BlockOutlined";
import EventBusyOutlinedIcon     from "@mui/icons-material/EventBusyOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import CalendarEventDialog from "../../components/admin/CalendarAvailabilitySetter";
import { supabase } from "../../lib/supabaseClient";

// ── Config ─────────────────────────────────────────────────────────────────
const SCHEDULER_START_HOUR  = 8;
const SCHEDULER_END_HOUR    = 24;
const SLOT_HEIGHT            = 60;
const MINUTE_RATIO           = SLOT_HEIGHT / 60;
const TODAY_HIGHLIGHT_COLOR  = "#f5c52b33";
const TODAY_BORDER_COLOR     = "#f5c52b";

// ── Helpers ────────────────────────────────────────────────────────────────
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays    = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const formatISO  = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;

function getWeekOfMonth(date) {
  const firstDay  = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  return Math.ceil((date.getDate() + dayOffset) / 7);
}

function isPastDate(date) {
  return startOfDay(date) < startOfDay(new Date());
}

function getDensityColor(count) {
  if (!count)      return "transparent";
  if (count === 1) return "rgba(245,194,66,0.08)";
  if (count === 2) return "rgba(245,194,66,0.18)";
  if (count === 3) return "rgba(245,194,66,0.28)";
  return "rgba(212,51,51,0.35)";
}

function fmtDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Blocked Dates Panel ────────────────────────────────────────────────────
function BlockedDatesPanel({ events, loading, isDark, onEdit, onDelete, onAdd }) {
  const borderColor = isDark ? "#2e2e2e" : "#e8e8e8";
  const cardBg      = isDark ? "#1a1a1a" : "#fafafa";
  const today       = new Date();

  const sorted = [...events].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const upcoming = sorted.filter((ev) => new Date(ev.endDate) >= startOfDay(today));
  const past     = sorted.filter((ev) => new Date(ev.endDate) <  startOfDay(today));

  const BlockCard = ({ ev, isPast }) => {
    const start    = new Date(ev.startDate);
    const end      = new Date(ev.endDate);
    const isMulti  = ev.eventType === "multi" || formatISO(start) !== formatISO(end);
    const dateLabel = isMulti
      ? `${fmtDate(formatISO(start))} – ${fmtDate(formatISO(end))}`
      : fmtDate(formatISO(start));

    return (
      <Box sx={{
        px: 1.5, py: 1.25,
        borderRadius: "8px",
        border: `1px solid ${isPast ? borderColor : isDark ? "#3a1a1a" : "#fecaca"}`,
        backgroundColor: isPast
          ? cardBg
          : isDark ? "#1e0f0f" : "#fff5f5",
        opacity: isPast ? 0.6 : 1,
        transition: "opacity 0.15s",
        "&:hover": { opacity: 1 },
      }}>
        {/* Title row */}
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.6 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.8, flex: 1, minWidth: 0 }}>
            <EventBusyOutlinedIcon sx={{ fontSize: 13, color: isPast ? "text.disabled" : "#dc2626", flexShrink: 0 }} />
            <Typography sx={{
              fontSize: "0.8rem", fontWeight: 700,
              color: isPast ? "text.disabled" : "text.primary",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {ev.title}
            </Typography>
          </Box>

          {/* Action buttons */}
          {!isPast && (
            <Box sx={{ display: "flex", gap: 0.3, flexShrink: 0 }}>
              <Tooltip title="Edit" arrow>
                <IconButton
                  size="small"
                  onClick={() => onEdit(ev)}
                  sx={{
                    width: 24, height: 24, color: "text.secondary",
                    "&:hover": { color: "#d97706", backgroundColor: isDark ? "#2a2200" : "#fef3c7" },
                  }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete" arrow>
                <IconButton
                  size="small"
                  onClick={() => onDelete(ev.id)}
                  sx={{
                    width: 24, height: 24, color: "text.secondary",
                    "&:hover": { color: "#dc2626", backgroundColor: isDark ? "#2a0a0a" : "#fee2e2" },
                  }}
                >
                  <DeleteOutlinedIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>

        {/* Date range */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mb: ev.notes ? 0.6 : 0 }}>
          <CalendarMonthOutlinedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
          <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>{dateLabel}</Typography>
        </Box>

        {/* Notes preview */}
        {ev.notes && (
          <Typography sx={{
            fontSize: "0.68rem", color: "text.disabled",
            mt: 0.4, lineHeight: 1.4,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
            fontStyle: "italic",
          }}>
            {ev.notes}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{
      width: 280, flexShrink: 0,
      display: "flex", flexDirection: "column",
      position: "sticky", top: 24, alignSelf: "flex-start",
      maxHeight: "calc(100vh - 120px)",
    }}>
      <Paper sx={{
        borderRadius: "12px",
        border: `1px solid ${borderColor}`,
        backgroundColor: "background.paper",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        maxHeight: "calc(100vh - 120px)",
      }}>
        {/* Panel header */}
        <Box sx={{
          px: 2, py: 1.75,
          borderBottom: `1px solid ${borderColor}`,
          background: isDark
            ? "linear-gradient(135deg,#1e1e1e,#1a1a1a)"
            : "linear-gradient(135deg,#fff5f5,#fee2e2)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: "8px",
              backgroundColor: isDark ? "#2a0a0a" : "#fecaca",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <BlockOutlinedIcon sx={{ fontSize: 14, color: isDark ? "#f87171" : "#dc2626" }} />
            </Box>
            <Box>
              <Typography sx={{ fontSize: "0.82rem", fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>
                Blocked Dates
              </Typography>
              <Typography sx={{ fontSize: "0.68rem", color: "text.secondary" }}>
                {upcoming.length} upcoming · {past.length} past
              </Typography>
            </Box>
          </Box>

          <Tooltip title="Block a new date" arrow>
            <IconButton
              size="small"
              onClick={onAdd}
              sx={{
                width: 28, height: 28,
                backgroundColor: "#f5c52b", color: "#111827",
                borderRadius: "7px",
                "&:hover": { backgroundColor: "#e6b920" },
              }}
            >
              <Typography sx={{ fontSize: "1rem", fontWeight: 700, lineHeight: 1, mt: "-1px" }}>+</Typography>
            </IconButton>
          </Tooltip>
        </Box>

        {/* List body */}
        <Box sx={{ overflowY: "auto", flex: 1, px: 1.5, py: 1.5,
          "&::-webkit-scrollbar": { width: 4 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: isDark ? "#3a3a3a" : "#e0e0e0", borderRadius: 2 },
        }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress size={20} sx={{ color: "#f5c52b" }} />
            </Box>
          ) : events.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <EventBusyOutlinedIcon sx={{ fontSize: 28, color: isDark ? "#333" : "#e0e0e0", mb: 1 }} />
              <Typography sx={{ fontSize: "0.78rem", color: "text.disabled" }}>
                No blocked dates yet
              </Typography>
              <Typography sx={{ fontSize: "0.7rem", color: "text.disabled", mt: 0.3 }}>
                Click any cell to add one
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {/* Upcoming */}
              {upcoming.length > 0 && (
                <>
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.08em", px: 0.5, mb: 0.25 }}>
                    Upcoming
                  </Typography>
                  {upcoming.map((ev) => <BlockCard key={ev.id} ev={ev} isPast={false} />)}
                </>
              )}

              {/* Past */}
              {past.length > 0 && (
                <>
                  <Divider sx={{ borderColor, my: 0.5 }} />
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.08em", px: 0.5, mb: 0.25 }}>
                    Past
                  </Typography>
                  {past.map((ev) => <BlockCard key={ev.id} ev={ev} isPast={true} />)}
                </>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    </Box>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function CalendarManagement() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const today  = new Date();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date(), day = d.getDay();
    return addDays(d, -((day + 6) % 7));
  });

  const [events,       setEvents]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [openDialog,   setOpenDialog]   = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentUser,  setCurrentUser]  = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, []);

  const loadEvents = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const { data, error: fetchErr } = await supabase
        .from("blocked_dates")
        .select("id, title, notes, start_date, end_date, blocked_by, created_at")
        .order("start_date", { ascending: true });
      if (fetchErr) throw fetchErr;
      setEvents((data || []).map((row) => ({
        id:         row.id,
        title:      row.title,
        notes:      row.notes || "",
        eventType:  row.start_date === row.end_date ? "single" : "multi",
        startDate:  new Date(`${row.start_date}T12:00:00`),
        endDate:    new Date(`${row.end_date}T12:00:00`),
        blocked_by: row.blocked_by,
      })));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // ── Derived maps ──
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
      const start = new Date(ev.startDate), end = new Date(ev.endDate);
      const iso   = formatISO(start);
      for (let h = start.getHours(); h <= end.getHours(); h++)
        map[`${iso}_${h}`] = (map[`${iso}_${h}`] || 0) + 1;
    });
    return map;
  }, [events]);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i)),
    [currentWeekStart]
  );

  // ── Navigation ──
  const prevWeek  = () => setCurrentWeekStart(addDays(currentWeekStart, -7));
  const nextWeek  = () => setCurrentWeekStart(addDays(currentWeekStart, 7));
  const goToToday = () => setCurrentWeekStart(addDays(today, -(( today.getDay() + 6) % 7)));

  // ── CRUD ──
  const handleSaveEvent = async (eventData) => {
    setError("");
    try {
      const startIso = formatISO(new Date(eventData.startDate));
      const endIso   = formatISO(new Date(eventData.endDate));
      if (editingEvent) {
        const { error: e } = await supabase.from("blocked_dates")
          .update({ title: eventData.title, notes: eventData.notes || null, start_date: startIso, end_date: endIso })
          .eq("id", editingEvent.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("blocked_dates")
          .insert({ title: eventData.title, notes: eventData.notes || null, start_date: startIso, end_date: endIso, blocked_by: currentUser?.id });
        if (e) throw e;
      }
      await loadEvents(); setOpenDialog(false);
    } catch (err) { setError(err.message); }
  };

  const handleDeleteEvent = async (id) => {
    setError("");
    try {
      const { error: e } = await supabase.from("blocked_dates").delete().eq("id", id);
      if (e) throw e;
      await loadEvents(); setOpenDialog(false);
    } catch (err) { setError(err.message); }
  };

  // Quick delete from panel (no dialog needed)
  const handleQuickDelete = async (id) => {
    setError("");
    try {
      const { error: e } = await supabase.from("blocked_dates").delete().eq("id", id);
      if (e) throw e;
      await loadEvents();
    } catch (err) { setError(err.message); }
  };

  const handleCellClick = (date, hour) => {
    if (isPastDate(date)) return;
    setEditingEvent(null);
    const start = new Date(date); start.setHours(hour, 0, 0, 0);
    setSelectedDate(start); setOpenDialog(true);
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

  // ── Event block renderer ──
  const renderEventBlock = (ev) => {
    const start        = new Date(ev.startDate);
    const end          = new Date(ev.endDate);
    const startMinutes = (start.getHours() - SCHEDULER_START_HOUR) * 60 + start.getMinutes();
    const durationMins = (end - start) / (1000 * 60);
    return (
      <Box key={ev.id} sx={{
        position: "absolute",
        top: startMinutes * MINUTE_RATIO,
        height: Math.max(durationMins * MINUTE_RATIO, 20),
        left: 2, right: 2,
        background: "linear-gradient(135deg, #ef4444, #dc2626)",
        color: "white", borderRadius: "4px",
        fontSize: "0.7rem", p: 0.5,
        overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        cursor: "pointer", zIndex: 1,
        boxShadow: "0 1px 4px rgba(220,38,38,0.3)",
      }}
        onClick={(e) => {
          e.stopPropagation();
          setEditingEvent(ev); setSelectedDate(new Date(ev.startDate)); setOpenDialog(true);
        }}
      >
        <Typography fontSize="0.7rem" fontWeight={700} sx={{ lineHeight: 1.2 }}>{ev.title}</Typography>
        <Typography fontSize="0.62rem" sx={{ opacity: 0.85 }}>
          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Typography>
      </Box>
    );
  };

  const borderColor      = isDark ? "#2e2e2e" : "#eee";
  const currentMonthYear = currentWeekStart.toLocaleString("default", { month: "long", year: "numeric" });
  const weekNumber       = getWeekOfMonth(currentWeekStart);

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* ── Page header ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2.5}>
        <IconButton onClick={prevWeek} size="small" sx={{ color: "text.secondary" }}>
          <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
        </IconButton>

        <Box textAlign="center">
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>
            Week {weekNumber} of {currentMonthYear}
          </Typography>
          <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
            Click any future cell to block a date
          </Typography>
        </Box>

        <Box display="flex" gap={1} alignItems="center">
          <Box
            onClick={goToToday}
            sx={{
              px: 1.5, py: 0.5, borderRadius: "6px", cursor: "pointer",
              border: `1px solid ${borderColor}`, fontSize: "0.75rem",
              color: "text.secondary", userSelect: "none",
              "&:hover": { borderColor: "#f5c52b", color: "text.primary" },
              transition: "all 0.15s",
            }}
          >
            Today
          </Box>
          <IconButton onClick={nextWeek} size="small" sx={{ color: "text.secondary" }}>
            <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* ── Two-column layout: calendar + panel ── */}
      <Box sx={{ display: "flex", gap: 2.5, alignItems: "flex-start" }}>

        {/* Calendar grid */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Paper sx={{
            overflow: "auto", borderRadius: "12px",
            backgroundColor: "background.paper",
            border: `1px solid ${borderColor}`,
          }}>
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
                <CircularProgress size={28} sx={{ color: "#f5c52b" }} />
              </Box>
            ) : (
              <Box display="grid" gridTemplateColumns={`80px repeat(7, 1fr)`}>

                {/* Day headers */}
                <Box sx={{ borderBottom: `1px solid ${borderColor}` }} />
                {weekDays.map((date) => {
                  const isToday   = formatISO(date) === formatISO(today);
                  const dayBlocks = eventsMap[formatISO(date)] || [];
                  return (
                    <Box key={date.toISOString()} textAlign="center" p={1} sx={{
                      backgroundColor: isToday ? TODAY_HIGHLIGHT_COLOR : "transparent",
                      borderBottom: isToday ? `3px solid ${TODAY_BORDER_COLOR}` : `1px solid ${borderColor}`,
                      borderLeft: `1px solid ${borderColor}`,
                    }}>
                      <Typography sx={{ fontWeight: 600, fontSize: "0.8rem", color: "text.primary" }}>
                        {date.toLocaleDateString(undefined, { weekday: "short" })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{date.getDate()}</Typography>
                      {dayBlocks.length > 0 && (
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 0.3 }}>
                          <Box sx={{ px: 0.8, py: 0.1, borderRadius: "4px", backgroundColor: "#dc262622", border: "1px solid #dc262644" }}>
                            <Typography sx={{ fontSize: "0.58rem", color: "#dc2626", fontWeight: 700 }}>
                              {dayBlocks.length} blocked
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  );
                })}

                {/* Time rows */}
                {Array.from({ length: SCHEDULER_END_HOUR - SCHEDULER_START_HOUR }).map((_, i) => {
                  const hour = SCHEDULER_START_HOUR + i;
                  return (
                    <React.Fragment key={hour}>
                      <Box sx={{ p: 1, fontSize: "0.7rem", borderTop: `1px solid ${borderColor}`, color: "text.secondary", userSelect: "none" }}>
                        {new Date(0, 0, 0, hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </Box>
                      {weekDays.map((date) => {
                        const iso       = formatISO(date);
                        const pastCell  = isPastDate(date);
                        const cellEvs   = (eventsMap[iso] || []).filter((ev) => new Date(ev.startDate).getHours() === hour);
                        const densityBg = getDensityColor(densityMap[`${iso}_${hour}`] || 0);
                        return (
                          <Box key={iso + hour} position="relative" minHeight={SLOT_HEIGHT} sx={{
                            borderTop:  `1px solid ${borderColor}`,
                            borderLeft: `1px solid ${borderColor}`,
                            p: 0.3,
                            cursor: pastCell ? "not-allowed" : "pointer",
                            opacity: pastCell ? 0.5 : 1,
                            backgroundColor: densityBg,
                            "&:hover": !pastCell ? { backgroundColor: isDark ? "#2a2200" : "#fffbeb" } : {},
                          }}
                            onClick={() => handleCellClick(date, hour)}
                          >
                            {cellEvs.map(renderEventBlock)}
                          </Box>
                        );
                      })}
                    </React.Fragment>
                  );
                })}
              </Box>
            )}
          </Paper>
        </Box>

        {/* Blocked dates panel */}
        <BlockedDatesPanel
          events={events}
          loading={loading}
          isDark={isDark}
          onEdit={handlePanelEdit}
          onDelete={handleQuickDelete}
          onAdd={handlePanelAdd}
        />
      </Box>

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