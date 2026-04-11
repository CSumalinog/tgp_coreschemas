// src/pages/admin/CalendarManagement.jsx
import React, { useMemo, useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  useTheme,
  Tooltip,
  Divider,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNewOutlined";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIosOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import { useNavigate } from "react-router-dom";
import CalendarEventDialog from "../../components/admin/CalendarAvailabilitySetter";
import { supabase } from "../../lib/supabaseClient";
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

function getWeekOfMonth(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  return Math.ceil((date.getDate() + dayOffset) / 7);
}

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

// ── Blocked Dates Panel ───────────────────────────────────────────────────────
function BlockedDatesPanel({
  events,
  loading,
  isDark,
  onEdit,
  onDelete,
  onAdd,
  onViewAll,
  onOpenLogEntry,
  collapsed,
  onToggle,
}) {
  const border = isDark ? BORDER_DARK : BORDER;
  const today = new Date();
  const sorted = [...events].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate),
  );
  const upcoming = sorted.filter(
    (ev) => new Date(ev.endDate) >= startOfDay(today),
  );
  const past = sorted.filter((ev) => new Date(ev.endDate) < startOfDay(today));

  // ── Collapsed state — just a slim vertical strip ──────────────────────────
  if (collapsed) {
    return (
      <Box
        sx={{
          width: 36,
          flexShrink: 0,
          position: "sticky",
          top: 24,
          alignSelf: "flex-start",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        {/* Expand button */}
        <Tooltip title="Show blocked dates" placement="left" arrow>
          <Box
            onClick={onToggle}
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              border: `1px solid ${border}`,
              backgroundColor: "background.paper",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s",
              "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08 },
            }}
          >
            <ChevronLeftIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          </Box>
        </Tooltip>

        {/* Add button */}
        <Tooltip title="Block a date" placement="left" arrow>
          <Box
            onClick={onAdd}
            sx={{
              width: 36,
              height: 36,
              borderRadius: "10px",
              backgroundColor: "#212121",
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background-color 0.15s",
              "&:hover": { backgroundColor: "#333" },
            }}
          >
            <AddIcon sx={{ fontSize: 15 }} />
          </Box>
        </Tooltip>

        {/* Badge — upcoming count */}
        {upcoming.length > 0 && (
          <Tooltip
            title={`${upcoming.length} upcoming blocked date${upcoming.length > 1 ? "s" : ""}`}
            placement="left"
            arrow
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                border: `1px solid ${border}`,
                backgroundColor: "background.paper",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                gap: 0,
              }}
            >
              <BlockOutlinedIcon
                sx={{ fontSize: 12, color: "text.disabled" }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.6rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  lineHeight: 1,
                }}
              >
                {upcoming.length}
              </Typography>
            </Box>
          </Tooltip>
        )}
      </Box>
    );
  }

  // ── Expanded state ────────────────────────────────────────────────────────
  const BlockCard = ({ ev, isPast }) => {
    const start = new Date(ev.startDate);
    const end = new Date(ev.endDate);
    const isMulti =
      ev.eventType === "multi" || formatISO(start) !== formatISO(end);
    const dateLabel = isMulti
      ? `${fmtDate(formatISO(start))} – ${fmtDate(formatISO(end))}`
      : fmtDate(formatISO(start));

    return (
      <Box
        onClick={() => onOpenLogEntry?.(ev.id)}
        sx={{
          px: 1.5,
          py: 1.25,
          borderRadius: "10px",
          border: `1px solid ${border}`,
          backgroundColor: isPast
            ? "transparent"
            : isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(53,53,53,0.015)",
          opacity: isPast ? 0.5 : 1,
          transition: "opacity 0.15s",
          cursor: "pointer",
          "&:hover": { opacity: 1 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
            mb: 0.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor: isPast
                  ? "text.disabled"
                  : "rgba(53,53,53,0.35)",
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                fontWeight: 600,
                color: isPast ? "text.disabled" : "text.primary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {ev.title}
            </Typography>
          </Box>
          {!isPast && (
            <Box sx={{ display: "flex", gap: 0.25, flexShrink: 0 }}>
              <Tooltip title="Edit" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(ev);
                  }}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "10px",
                    color: "text.secondary",
                    "&:hover": { color: CHARCOAL, backgroundColor: GOLD_08 },
                  }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete" arrow>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(ev.id);
                  }}
                  sx={{
                    width: 22,
                    height: 22,
                    borderRadius: "10px",
                    color: "text.secondary",
                    "&:hover": {
                      color: "#dc2626",
                      backgroundColor: isDark
                        ? "rgba(220,38,38,0.1)"
                        : "#fef2f2",
                    },
                  }}
                >
                  <DeleteOutlinedIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Tooltip>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            mb: ev.notes ? 0.5 : 0,
          }}
        >
          <CalendarMonthOutlinedIcon
            sx={{ fontSize: 10, color: "text.disabled" }}
          />
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.68rem",
              color: "text.secondary",
            }}
          >
            {dateLabel}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0.75,
            mb: ev.notes ? 0.5 : 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.66rem",
              color: "text.disabled",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={`Blocked by ${ev.blocked_by_name || "Unknown"}`}
          >
            Blocked by: {ev.blocked_by_name || "Unknown"}
          </Typography>
        </Box>
        {ev.notes && (
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.67rem",
              color: "text.disabled",
              lineHeight: 1.4,
              fontStyle: "italic",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {ev.notes}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: 268,
        flexShrink: 0,
        position: "sticky",
        top: 24,
        alignSelf: "flex-start",
        maxHeight: "calc(100vh - 120px)",
        // Animate width when toggling (handled by parent gap + width change)
        transition: "width 0.2s ease",
      }}
    >
      <Box
        sx={{
          borderRadius: "10px",
          border: `1px solid ${border}`,
          backgroundColor: "background.paper",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100vh - 120px)",
        }}
      >
        {/* Panel header */}
        <Box
          sx={{
            px: 2,
            py: 1.75,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: "10px",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(53,53,53,0.06)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <BlockOutlinedIcon
                sx={{ fontSize: 13, color: "text.secondary" }}
              />
            </Box>
            <Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                Blocked Dates
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.66rem",
                  color: "text.secondary",
                }}
              >
                {upcoming.length} upcoming · {past.length} past
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
            {/* Collapse button */}
            <Tooltip title="Collapse" arrow>
              <Box
                onClick={onToggle}
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08 },
                }}
              >
                <ChevronRightIcon
                  sx={{ fontSize: 15, color: "text.secondary" }}
                />
              </Box>
            </Tooltip>

            {/* Add button */}
            <Tooltip title="Block a date" arrow>
              <Box
                onClick={onAdd}
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "10px",
                  backgroundColor: "#212121",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "background-color 0.15s",
                  "&:hover": { backgroundColor: "#333" },
                }}
              >
                <AddIcon sx={{ fontSize: 15 }} />
              </Box>
            </Tooltip>
          </Box>
        </Box>

        <Box
          sx={{
            px: 2,
            py: 0.8,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <Typography
            onClick={onViewAll}
            sx={{
              fontFamily: dm,
              fontSize: "0.68rem",
              fontWeight: 600,
              color: "text.secondary",
              cursor: "pointer",
              userSelect: "none",
              "&:hover": {
                color: CHARCOAL,
                textDecoration: "underline",
                textUnderlineOffset: "2px",
              },
            }}
          >
            See all
          </Typography>
        </Box>

        {/* List body */}
        <Box
          sx={{
            overflowY: "auto",
            flex: 1,
            px: 1.5,
            py: 1.5,
            "&::-webkit-scrollbar": { width: 3 },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: isDark ? "#3a3a3a" : "#e0e0e0",
              borderRadius: "10px",
            },
          }}
        >
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <BrandedLoader size={34} inline />
            </Box>
          ) : events.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 5 }}>
              <BlockOutlinedIcon
                sx={{ fontSize: 26, color: isDark ? "#333" : "#e0e0e0", mb: 1 }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.76rem",
                  color: "text.disabled",
                }}
              >
                No blocked dates yet
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  color: "text.disabled",
                  mt: 0.25,
                }}
              >
                Click any cell to add one
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {upcoming.length > 0 && (
                <>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: "text.disabled",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      px: 0.25,
                      mb: 0.25,
                    }}
                  >
                    Upcoming
                  </Typography>
                  {upcoming.map((ev) => (
                    <BlockCard key={ev.id} ev={ev} isPast={false} />
                  ))}
                </>
              )}
              {past.length > 0 && (
                <>
                  <Divider
                    sx={{
                      borderColor: isDark ? BORDER_DARK : BORDER,
                      my: 0.75,
                    }}
                  />
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: "text.disabled",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      px: 0.25,
                      mb: 0.25,
                    }}
                  >
                    Past
                  </Typography>
                  {past.map((ev) => (
                    <BlockCard key={ev.id} ev={ev} isPast={true} />
                  ))}
                </>
              )}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CalendarManagement() {
  const navigate = useNavigate();
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
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user));
  }, []);

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

      const blockerIds = [...new Set((data || []).map((r) => r.blocked_by).filter(Boolean))];
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

  const handleCellClick = (date, hour) => {
    if (isPastDate(date)) return;
    setEditingEvent(null);
    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);
    setSelectedDate(start);
    setOpenDialog(true);
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

  const handleMonthCellClick = (date) => {
    if (isPastDate(date)) return;
    setEditingEvent(null);
    const start = new Date(date);
    start.setHours(8, 0, 0, 0);
    setSelectedDate(start);
    setOpenDialog(true);
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
          backgroundColor: isDark ? "rgba(53,53,53,0.85)" : CHARCOAL,
          color: "#fff",
          borderRadius: "10px",
          p: 0.5,
          overflow: "hidden",
          zIndex: 1,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(53,53,53,0.7)"}`,
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
        backgroundColor: isDark ? "rgba(53,53,53,0.72)" : CHARCOAL,
        color: "#fff",
        borderRadius: "10px",
        overflow: "hidden",
        zIndex: 1,
        border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(53,53,53,0.7)"}`,
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

  const weekNumber = getWeekOfMonth(currentWeekStart);
  const currentWeekMonthYear = currentWeekStart.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const currentMonthYear = currentMonthStart.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });
  const headerTitle =
    viewMode === "week"
      ? `Week ${weekNumber} of ${currentWeekMonthYear}`
      : currentMonthYear;
  const headerSubtitle =
    viewMode === "week"
      ? "Click any future cell to block a date"
      : "Select a day to create a blocked date";
  const stickyBg = isDark ? "#161616" : "#ffffff";

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        backgroundColor: "#ffffff",
        minHeight: "100%",
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
        <IconButton
          onClick={goPrev}
          size="small"
          sx={{
            border: `1px solid ${border}`,
            borderRadius: "10px",
            p: 0.65,
            color: "text.secondary",
            "&:hover": {
              borderColor: GOLD,
              backgroundColor: GOLD_08,
              color: CHARCOAL,
            },
            transition: "all 0.15s",
          }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 13 }} />
        </IconButton>

        <Box sx={{ textAlign: "center" }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: { xs: "0.88rem", sm: "1rem" },
              color: "text.primary",
              letterSpacing: "-0.02em",
            }}
          >
            {headerTitle}
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.7rem",
              color: "text.secondary",
              mt: 0.2,
              display: { xs: "none", sm: "block" },
            }}
          >
            {headerSubtitle}
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: 0.75, alignItems: "center" }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              p: 0.25,
              borderRadius: "10px",
              border: `1px solid ${border}`,
              backgroundColor: "background.paper",
              mr: 0.25,
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
                fontSize: "0.72rem",
                fontWeight: 600,
                color: viewMode === "week" ? CHARCOAL : "text.secondary",
                backgroundColor: viewMode === "week" ? GOLD_08 : "transparent",
                border:
                  viewMode === "week"
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
                fontSize: "0.72rem",
                fontWeight: 600,
                color: viewMode === "month" ? CHARCOAL : "text.secondary",
                backgroundColor:
                  viewMode === "month" ? GOLD_08 : "transparent",
                border:
                  viewMode === "month"
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
              fontSize: "0.76rem",
              fontWeight: 500,
              color: "text.secondary",
              userSelect: "none",
              transition: "all 0.15s",
              "&:hover": {
                borderColor: GOLD,
                color: CHARCOAL,
                backgroundColor: GOLD_08,
              },
            }}
          >
            Today
          </Box>
          <IconButton
            onClick={goNext}
            size="small"
            sx={{
              border: `1px solid ${border}`,
              borderRadius: "10px",
              p: 0.65,
              color: "text.secondary",
              "&:hover": {
                borderColor: GOLD,
                backgroundColor: GOLD_08,
                color: CHARCOAL,
              },
              transition: "all 0.15s",
            }}
          >
            <ArrowForwardIosIcon sx={{ fontSize: 13 }} />
          </IconButton>
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
      <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
        {/* ── Calendar grid ── */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              overflowX: "auto",
              overflowY: "auto",
              borderRadius: "10px",
              backgroundColor: "background.paper",
              border: `1px solid ${border}`,
              maxHeight: "calc(100vh - 160px)",
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
                      onClick={() => handleMonthCellClick(date)}
                      sx={{
                        minHeight: 116,
                        p: 1,
                        borderLeft: `1px solid ${border}`,
                        borderTop: `1px solid ${border}`,
                        backgroundColor:
                          dayEvents.length > 0
                            ? densityBg
                            : inCurrentMonth
                              ? "transparent"
                              : isDark
                                ? "rgba(255,255,255,0.015)"
                                : "rgba(53,53,53,0.015)",
                        cursor: pastCell ? "not-allowed" : "pointer",
                        opacity: inCurrentMonth ? 1 : 0.58,
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
                            color: isToday ? CHARCOAL : "text.primary",
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

                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.35 }}>
                        {dayEvents.slice(0, 2).map((ev) => (
                          <Box
                            key={ev.id}
                            sx={{
                              px: 0.65,
                              py: 0.35,
                              borderRadius: "10px",
                              border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(53,53,53,0.12)"}`,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.04)"
                                : "rgba(53,53,53,0.04)",
                            }}
                          >
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.64rem",
                                fontWeight: 600,
                                color: "text.secondary",
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
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            mt: 0.4,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.4,
                              px: 0.75,
                              py: 0.2,
                              borderRadius: "10px",
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.06)"
                                : "rgba(53,53,53,0.06)",
                            }}
                          >
                            <Box
                              sx={{
                                width: 4,
                                height: 4,
                                borderRadius: "50%",
                                backgroundColor: isDark
                                  ? "rgba(255,255,255,0.35)"
                                  : "rgba(53,53,53,0.35)",
                              }}
                            />
                            <Typography
                              sx={{
                                fontFamily: dm,
                                fontSize: "0.58rem",
                                color: "text.secondary",
                                fontWeight: 600,
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
                              backgroundColor:
                                allDayEvs.length > 0
                                  ? "transparent"
                                  : densityBg,
                              transition: "background-color 0.12s",
                              "&:hover": !pastCell
                                ? {
                                    backgroundColor: isDark
                                      ? "rgba(245,197,43,0.06)"
                                      : "rgba(245,197,43,0.07)",
                                  }
                                : {},
                            }}
                            onClick={() => handleCellClick(date, hour)}
                          >
                            {allDayEvs.map(renderAllDayBlock)}
                            {timedEvs.map(renderTimedBlock)}
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
          collapsed={panelCollapsed}
          onToggle={() => setPanelCollapsed((v) => !v)}
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

