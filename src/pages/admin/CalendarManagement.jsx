// src/pages/admin/CalendarManagement.jsx
// Fully responsive – works at all breakpoints (mobile → desktop)
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Box, Typography, IconButton, CircularProgress,
  Alert, useTheme, Tooltip, Divider, useMediaQuery, Drawer,
  Fab,
} from "@mui/material";
import ArrowBackIosNewIcon       from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon       from "@mui/icons-material/ArrowForwardIos";
import DeleteOutlinedIcon        from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon          from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon         from "@mui/icons-material/BlockOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AddIcon                   from "@mui/icons-material/Add";
import ListIcon                  from "@mui/icons-material/List";
import CloseIcon                 from "@mui/icons-material/Close";
import CalendarEventDialog       from "../../components/admin/CalendarAvailabilitySetter";
import { supabase }              from "../../lib/supabaseClient";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD        = "#F5C52B";
const GOLD_08     = "rgba(245,197,43,0.08)";
const CHARCOAL    = "#353535";
const BORDER      = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm          = "'DM Sans', sans-serif";

// ── Calendar config ───────────────────────────────────────────────────────────
const SCHEDULER_START_HOUR = 8;
const SCHEDULER_END_HOUR   = 24;
const SLOT_HEIGHT          = 56;           // slightly smaller on mobile
const MINUTE_RATIO         = SLOT_HEIGHT / 60;

// ── Helpers ───────────────────────────────────────────────────────────────────
const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays    = (d, n) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const formatISO  = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
const isPastDate = (date) => startOfDay(date) < startOfDay(new Date());

function getWeekOfMonth(date) {
  const firstDay  = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  return Math.ceil((date.getDate() + dayOffset) / 7);
}

function getDensityBg(count, isDark) {
  if (!count)      return "transparent";
  if (count === 1) return isDark ? "rgba(245,197,43,0.05)" : "rgba(245,197,43,0.06)";
  if (count === 2) return isDark ? "rgba(245,197,43,0.10)" : "rgba(245,197,43,0.12)";
  if (count === 3) return isDark ? "rgba(245,197,43,0.16)" : "rgba(245,197,43,0.18)";
  return isDark ? "rgba(220,38,38,0.18)" : "rgba(220,38,38,0.10)";
}

function fmtDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

// ── Blocked Dates Panel content (shared between sidebar & drawer) ──────────────
function BlockedDatesContent({ events, loading, isDark, onEdit, onDelete, onAdd }) {
  const border = isDark ? BORDER_DARK : BORDER;
  const today  = new Date();
  const sorted   = [...events].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const upcoming = sorted.filter((ev) => new Date(ev.endDate) >= startOfDay(today));
  const past     = sorted.filter((ev) => new Date(ev.endDate) <  startOfDay(today));

  const BlockCard = ({ ev, isPast }) => {
    const start     = new Date(ev.startDate);
    const end       = new Date(ev.endDate);
    const isMulti   = ev.eventType === "multi" || formatISO(start) !== formatISO(end);
    const dateLabel = isMulti
      ? `${fmtDate(formatISO(start))} – ${fmtDate(formatISO(end))}`
      : fmtDate(formatISO(start));

    return (
      <Box sx={{
        px: 1.5, py: 1.25, borderRadius: "8px",
        border: `1px solid ${border}`,
        backgroundColor: isPast ? "transparent" : isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.015)",
        opacity: isPast ? 0.5 : 1,
        transition: "opacity 0.15s",
        "&:hover": { opacity: 1 },
      }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flex: 1, minWidth: 0 }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: isPast ? "text.disabled" : "rgba(53,53,53,0.35)", flexShrink: 0 }} />
            <Typography sx={{
              fontFamily: dm, fontSize: "0.78rem", fontWeight: 600,
              color: isPast ? "text.disabled" : "text.primary",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {ev.title}
            </Typography>
          </Box>
          {!isPast && (
            <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
              <Tooltip title="Edit" arrow>
                <IconButton size="small" onClick={() => onEdit(ev)} sx={{
                  width: 22, height: 22, borderRadius: "6px", color: "text.secondary",
                  "&:hover": { color: CHARCOAL, backgroundColor: GOLD_08 },
                }}>
                  <EditOutlinedIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete" arrow>
                <IconButton size="small" onClick={() => onDelete(ev.id)} sx={{
                  width: 22, height: 22, borderRadius: "6px", color: "text.secondary",
                  "&:hover": { color: "#dc2626", backgroundColor: isDark ? "rgba(220,38,38,0.1)" : "#fef2f2" },
                }}>
                  <DeleteOutlinedIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: ev.notes ? 0.5 : 0 }}>
          <CalendarMonthOutlinedIcon sx={{ fontSize: 10, color: "text.disabled" }} />
          <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", color: "text.secondary" }}>{dateLabel}</Typography>
        </Box>
        {ev.notes && (
          <Typography sx={{
            fontFamily: dm, fontSize: "0.67rem", color: "text.disabled",
            lineHeight: 1.4, fontStyle: "italic",
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {ev.notes}
          </Typography>
        )}
      </Box>
    );
  };

  if (loading) return (
    <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
      <CircularProgress size={20} sx={{ color: GOLD }} />
    </Box>
  );

  if (events.length === 0) return (
    <Box sx={{ textAlign: "center", py: 5 }}>
      <BlockOutlinedIcon sx={{ fontSize: 26, color: isDark ? "#333" : "#e0e0e0", mb: 1 }} />
      <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: "text.disabled" }}>No blocked dates yet</Typography>
      <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", color: "text.disabled", mt: 0.25 }}>Click any cell to add one</Typography>
    </Box>
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
      {upcoming.length > 0 && (
        <>
          <Typography sx={{ fontFamily: dm, fontSize: "0.6rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.1em", px: 0.25, mb: 0.25 }}>
            Upcoming
          </Typography>
          {upcoming.map((ev) => <BlockCard key={ev.id} ev={ev} isPast={false} />)}
        </>
      )}
      {past.length > 0 && (
        <>
          <Divider sx={{ borderColor: isDark ? BORDER_DARK : BORDER, my: 0.75 }} />
          <Typography sx={{ fontFamily: dm, fontSize: "0.6rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.1em", px: 0.25, mb: 0.25 }}>
            Past
          </Typography>
          {past.map((ev) => <BlockCard key={ev.id} ev={ev} isPast={true} />)}
        </>
      )}
    </Box>
  );
}

// ── Sidebar (desktop ≥ lg) ─────────────────────────────────────────────────────
function BlockedDatesPanel({ events, loading, isDark, onEdit, onDelete, onAdd }) {
  const border = isDark ? BORDER_DARK : BORDER;
  const today  = new Date();
  const sorted   = [...events].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const upcoming = sorted.filter((ev) => new Date(ev.endDate) >= startOfDay(today));
  const past     = sorted.filter((ev) => new Date(ev.endDate) <  startOfDay(today));

  return (
    <Box sx={{ width: 268, flexShrink: 0, position: "sticky", top: 24, alignSelf: "flex-start", maxHeight: "calc(100vh - 120px)" }}>
      <Box sx={{
        borderRadius: "12px", border: `1px solid ${border}`,
        backgroundColor: "background.paper",
        overflow: "hidden", display: "flex", flexDirection: "column",
        maxHeight: "calc(100vh - 120px)",
      }}>
        {/* Header */}
        <Box sx={{ px: 2, py: 1.75, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ width: 26, height: 26, borderRadius: "7px", backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.06)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <BlockOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
            </Box>
            <Box>
              <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>
                Blocked Dates
              </Typography>
              <Typography sx={{ fontFamily: dm, fontSize: "0.66rem", color: "text.secondary" }}>
                {upcoming.length} upcoming · {past.length} past
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Block a date" arrow>
            <Box onClick={onAdd} sx={{
              width: 26, height: 26, borderRadius: "7px",
              backgroundColor: GOLD, color: CHARCOAL,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flexShrink: 0, transition: "background-color 0.15s",
              "&:hover": { backgroundColor: "#e6b920" },
            }}>
              <AddIcon sx={{ fontSize: 15 }} />
            </Box>
          </Tooltip>
        </Box>
        {/* List */}
        <Box sx={{
          overflowY: "auto", flex: 1, px: 1.5, py: 1.5,
          "&::-webkit-scrollbar": { width: 3 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: isDark ? "#3a3a3a" : "#e0e0e0", borderRadius: 2 },
        }}>
          <BlockedDatesContent events={events} loading={loading} isDark={isDark} onEdit={onEdit} onDelete={onDelete} onAdd={onAdd} />
        </Box>
      </Box>
    </Box>
  );
}

// ── Drawer (tablet / mobile) ──────────────────────────────────────────────────
function BlockedDatesDrawer({ open, onClose, events, loading, isDark, onEdit, onDelete, onAdd }) {
  const border = isDark ? BORDER_DARK : BORDER;
  const today  = new Date();
  const sorted   = [...events].sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  const upcoming = sorted.filter((ev) => new Date(ev.endDate) >= startOfDay(today));
  const past     = sorted.filter((ev) => new Date(ev.endDate) <  startOfDay(today));

  return (
    <Drawer
      anchor="bottom"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          borderTopLeftRadius: 16, borderTopRightRadius: 16,
          maxHeight: "75vh",
          backgroundColor: "background.paper",
        },
      }}
    >
      {/* Drag handle */}
      <Box sx={{ display: "flex", justifyContent: "center", pt: 1.25, pb: 0.5 }}>
        <Box sx={{ width: 36, height: 4, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)" }} />
      </Box>

      {/* Header */}
      <Box sx={{ px: 2.5, pb: 1.5, pt: 0.5, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <BlockOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Box>
            <Typography sx={{ fontFamily: dm, fontSize: "0.9rem", fontWeight: 700, color: "text.primary", lineHeight: 1.2 }}>
              Blocked Dates
            </Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary" }}>
              {upcoming.length} upcoming · {past.length} past
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
          <Box onClick={() => { onAdd(); onClose(); }} sx={{
            px: 1.5, py: 0.5, borderRadius: "8px", backgroundColor: GOLD, color: CHARCOAL,
            display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer",
            fontFamily: dm, fontSize: "0.75rem", fontWeight: 700,
            "&:hover": { backgroundColor: "#e6b920" },
          }}>
            <AddIcon sx={{ fontSize: 14 }} /> Add
          </Box>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      </Box>

      {/* List */}
      <Box sx={{ overflowY: "auto", px: 2, py: 1.5, flex: 1 }}>
        <BlockedDatesContent
          events={events} loading={loading} isDark={isDark}
          onEdit={(ev) => { onEdit(ev); onClose(); }}
          onDelete={onDelete} onAdd={() => { onAdd(); onClose(); }}
        />
      </Box>
    </Drawer>
  );
}

// ── Day column count per breakpoint ──────────────────────────────────────────
// xs:1  sm:3  md:5  lg:7
function useDayCount(theme) {
  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  if (isXs) return 1;
  if (isSm) return 3;
  if (isMd) return 5;
  return 7;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CalendarManagement() {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === "dark";
  const border   = isDark ? BORDER_DARK : BORDER;
  const today    = new Date();
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));
  const dayCount  = useDayCount(theme);

  const [currentWindowStart, setCurrentWindowStart] = useState(() => {
    // Start window so today is visible
    const d = new Date(), day = d.getDay();
    return addDays(d, -((day + 6) % 7));   // Monday of current week
  });
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [events,        setEvents]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [openDialog,    setOpenDialog]    = useState(false);
  const [selectedDate,  setSelectedDate]  = useState(null);
  const [editingEvent,  setEditingEvent]  = useState(null);
  const [currentUser,   setCurrentUser]   = useState(null);

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

  // Visible days array based on responsive day count
  const visibleDays = useMemo(() =>
    Array.from({ length: dayCount }).map((_, i) => addDays(currentWindowStart, i)),
    [currentWindowStart, dayCount]
  );

  const prevWindow = () => setCurrentWindowStart(addDays(currentWindowStart, -dayCount));
  const nextWindow = () => setCurrentWindowStart(addDays(currentWindowStart, dayCount));
  const goToToday  = () => {
    const day = today.getDay();
    setCurrentWindowStart(addDays(today, -((day + 6) % 7)));
  };

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

  const handlePanelEdit = (ev) => { setEditingEvent(ev); setSelectedDate(new Date(ev.startDate)); setOpenDialog(true); };
  const handlePanelAdd  = () => { setEditingEvent(null); setSelectedDate(new Date()); setOpenDialog(true); };

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
        backgroundColor: isDark ? "rgba(53,53,53,0.85)" : CHARCOAL,
        color: "#fff", borderRadius: "5px",
        p: 0.5, overflow: "hidden", zIndex: 1,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(53,53,53,0.7)"}`,
        cursor: "pointer",
      }}
        onClick={(e) => {
          e.stopPropagation();
          setEditingEvent(ev); setSelectedDate(new Date(ev.startDate)); setOpenDialog(true);
        }}
      >
        <Typography sx={{ fontFamily: dm, fontSize: "0.65rem", fontWeight: 700, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {ev.title}
        </Typography>
        <Typography sx={{ fontFamily: dm, fontSize: "0.58rem", opacity: 0.85 }}>
          {start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          {" – "}
          {end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Typography>
      </Box>
    );
  };

  // ── Header label (adapts to window size) ─────────────────────────────────
  const windowLabel = useMemo(() => {
    if (dayCount === 7) {
      const weekNumber = getWeekOfMonth(currentWindowStart);
      const monthYear  = currentWindowStart.toLocaleString("default", { month: "long", year: "numeric" });
      return `Week ${weekNumber} of ${monthYear}`;
    }
    const last = addDays(currentWindowStart, dayCount - 1);
    const opts = { month: "short", day: "numeric" };
    if (currentWindowStart.getFullYear() !== last.getFullYear())
      return `${currentWindowStart.toLocaleDateString("en-US", { ...opts, year: "numeric" })} – ${last.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
    if (currentWindowStart.getMonth() !== last.getMonth())
      return `${currentWindowStart.toLocaleDateString("en-US", opts)} – ${last.toLocaleDateString("en-US", opts)} ${last.getFullYear()}`;
    return `${currentWindowStart.toLocaleDateString("en-US", { month: "long" })} ${currentWindowStart.getDate()}–${last.getDate()}, ${last.getFullYear()}`;
  }, [currentWindowStart, dayCount]);

  // time label width shrinks on small screens
  const timeLabelWidth = dayCount <= 1 ? 52 : 68;

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, backgroundColor: "background.default", minHeight: "100%", fontFamily: dm }}>

      {/* ── Page header ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: { xs: 2, md: 3 }, gap: 1 }}>
        {/* Left: prev */}
        <IconButton onClick={prevWindow} size="small" sx={{
          border: `1px solid ${border}`, borderRadius: "8px", p: 0.65, color: "text.secondary", flexShrink: 0,
          "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08, color: CHARCOAL }, transition: "all 0.15s",
        }}>
          <ArrowBackIosNewIcon sx={{ fontSize: 13 }} />
        </IconButton>

        {/* Centre: title + actions */}
        <Box sx={{ textAlign: "center", minWidth: 0, flex: 1 }}>
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: { xs: "0.85rem", sm: "1rem" }, color: "text.primary", letterSpacing: "-0.02em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {windowLabel}
          </Typography>
          <Typography sx={{ fontFamily: dm, fontSize: "0.67rem", color: "text.secondary", mt: 0.2, display: { xs: "none", sm: "block" } }}>
            Click any future cell to block a date
          </Typography>
        </Box>

        {/* Right: today + next + (mobile) list button */}
        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center", flexShrink: 0 }}>
          <Box onClick={goToToday} sx={{
            px: { xs: 1, sm: 1.5 }, py: 0.55, borderRadius: "8px", cursor: "pointer",
            border: `1px solid ${border}`, fontFamily: dm,
            fontSize: { xs: "0.7rem", sm: "0.76rem" }, fontWeight: 500,
            color: "text.secondary", userSelect: "none", transition: "all 0.15s",
            "&:hover": { borderColor: GOLD, color: CHARCOAL, backgroundColor: GOLD_08 },
          }}>
            Today
          </Box>
          <IconButton onClick={nextWindow} size="small" sx={{
            border: `1px solid ${border}`, borderRadius: "8px", p: 0.65, color: "text.secondary",
            "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08, color: CHARCOAL }, transition: "all 0.15s",
          }}>
            <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
          </IconButton>

          {/* List button – only shows below lg */}
          {!isDesktop && (
            <Tooltip title="Blocked dates" arrow>
              <IconButton
                onClick={() => setDrawerOpen(true)}
                size="small"
                sx={{
                  border: `1px solid ${border}`, borderRadius: "8px", p: 0.65, color: "text.secondary",
                  position: "relative",
                  "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08, color: CHARCOAL }, transition: "all 0.15s",
                }}
              >
                <ListIcon sx={{ fontSize: 16 }} />
                {events.length > 0 && (
                  <Box sx={{
                    position: "absolute", top: 2, right: 2,
                    width: 7, height: 7, borderRadius: "50%",
                    backgroundColor: GOLD, border: `1px solid ${isDark ? "#1a1a1a" : "#fff"}`,
                  }} />
                )}
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: "8px", fontFamily: dm, fontSize: "0.78rem" }}>{error}</Alert>}

      {/* ── Two-column layout (sidebar only on lg+) ── */}
      <Box sx={{ display: "flex", gap: 2.5, alignItems: "flex-start" }}>

        {/* ── Calendar grid ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{
            overflow: "auto", borderRadius: "12px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            // Give the grid a max-height with scroll on all sizes
            maxHeight: { xs: "calc(100vh - 140px)", sm: "calc(100vh - 150px)", md: "calc(100vh - 140px)" },
          }}>
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300 }}>
                <CircularProgress size={26} sx={{ color: GOLD }} />
              </Box>
            ) : (
              <Box display="grid" gridTemplateColumns={`${timeLabelWidth}px repeat(${dayCount}, 1fr)`}>

                {/* Day headers */}
                <Box sx={{ borderBottom: `1px solid ${border}`, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)", position: "sticky", top: 0, zIndex: 2 }} />
                {visibleDays.map((date) => {
                  const isToday   = formatISO(date) === formatISO(today);
                  const dayBlocks = eventsMap[formatISO(date)] || [];
                  return (
                    <Box key={date.toISOString()} sx={{
                      textAlign: "center", px: { xs: 0.5, sm: 1 }, py: { xs: 0.75, sm: 1.25 },
                      borderLeft: `1px solid ${border}`,
                      borderBottom: isToday ? `2px solid ${GOLD}` : `1px solid ${border}`,
                      backgroundColor: isToday
                        ? isDark ? GOLD_08 : "rgba(245,197,43,0.06)"
                        : isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)",
                      position: "sticky", top: 0, zIndex: 2,
                    }}>
                      <Typography sx={{ fontFamily: dm, fontWeight: 600, fontSize: { xs: "0.62rem", sm: "0.72rem" }, color: isToday ? CHARCOAL : "text.secondary", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        {date.toLocaleDateString(undefined, { weekday: dayCount <= 3 ? "long" : "short" }).slice(0, dayCount <= 1 ? 9 : 3)}
                      </Typography>
                      <Typography sx={{ fontFamily: dm, fontSize: { xs: "0.82rem", sm: "0.88rem" }, fontWeight: isToday ? 700 : 400, color: isToday ? CHARCOAL : "text.primary", lineHeight: 1.3 }}>
                        {date.getDate()}
                      </Typography>
                      {dayBlocks.length > 0 && (
                        <Box sx={{ display: "flex", justifyContent: "center", mt: 0.3 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.3, px: 0.6, py: 0.15, borderRadius: "4px", backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(53,53,53,0.06)" }}>
                            <Box sx={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: isDark ? "rgba(255,255,255,0.35)" : "rgba(53,53,53,0.35)" }} />
                            <Typography sx={{ fontFamily: dm, fontSize: "0.55rem", color: "text.secondary", fontWeight: 600 }}>
                              {dayBlocks.length}
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
                      {/* Time label */}
                      <Box sx={{
                        px: { xs: 0.5, sm: 1 }, py: 0.5,
                        borderTop: `1px solid ${border}`,
                        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)",
                        display: "flex", alignItems: "flex-start",
                        width: timeLabelWidth,
                      }}>
                        <Typography sx={{ fontFamily: dm, fontSize: { xs: "0.56rem", sm: "0.62rem" }, color: "text.disabled", userSelect: "none", lineHeight: 1, whiteSpace: "nowrap" }}>
                          {new Date(0, 0, 0, hour).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </Typography>
                      </Box>

                      {/* Day cells */}
                      {visibleDays.map((date) => {
                        const iso       = formatISO(date);
                        const pastCell  = isPastDate(date);
                        const cellEvs   = (eventsMap[iso] || []).filter((ev) => new Date(ev.startDate).getHours() === hour);
                        const densityBg = getDensityBg(densityMap[`${iso}_${hour}`] || 0, isDark);
                        return (
                          <Box key={iso + hour} position="relative" sx={{
                            minHeight: SLOT_HEIGHT,
                            borderTop:  `1px solid ${border}`,
                            borderLeft: `1px solid ${border}`,
                            p: 0.3,
                            cursor: pastCell ? "not-allowed" : "pointer",
                            opacity: pastCell ? 0.45 : 1,
                            backgroundColor: densityBg,
                            transition: "background-color 0.12s",
                            "&:hover": !pastCell ? { backgroundColor: isDark ? "rgba(245,197,43,0.06)" : "rgba(245,197,43,0.07)" } : {},
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
          </Box>
        </Box>

        {/* Sidebar – desktop only */}
        {isDesktop && (
          <BlockedDatesPanel
            events={events}
            loading={loading}
            isDark={isDark}
            onEdit={handlePanelEdit}
            onDelete={handleQuickDelete}
            onAdd={handlePanelAdd}
          />
        )}
      </Box>

      {/* Drawer – tablet / mobile */}
      {!isDesktop && (
        <BlockedDatesDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          events={events}
          loading={loading}
          isDark={isDark}
          onEdit={handlePanelEdit}
          onDelete={handleQuickDelete}
          onAdd={handlePanelAdd}
        />
      )}

      {/* FAB – mobile quick-add (xs only) */}
      <Fab
        size="medium"
        onClick={handlePanelAdd}
        sx={{
          position: "fixed", bottom: 24, right: 24,
          backgroundColor: GOLD, color: CHARCOAL,
          display: { xs: "flex", sm: "none" },
          boxShadow: "0 4px 14px rgba(245,197,43,0.4)",
          "&:hover": { backgroundColor: "#e6b920" },
          zIndex: 1200,
        }}
      >
        <AddIcon />
      </Fab>

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