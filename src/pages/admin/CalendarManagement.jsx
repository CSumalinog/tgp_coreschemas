import React, { useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Paper,
} from "@mui/material";

import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";

import CalendarEventDialog from "../../components/admin/CalendarAvailabilitySetter";

/*
=====================================================
CONFIGURATION
=====================================================
*/

const SCHEDULER_START_HOUR = 8;
const SCHEDULER_END_HOUR = 24;

const SLOT_HEIGHT = 60;
const MINUTE_RATIO = SLOT_HEIGHT / 60;

const TODAY_HIGHLIGHT_COLOR = "#f5c52b33";
const TODAY_BORDER_COLOR = "#f5c52b";

/*
=====================================================
HELPERS
=====================================================
*/

const startOfDay = (d) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const addDays = (d, n) => {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
};

const formatISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

function getWeekOfMonth(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);

  const dayOffset =
    firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;

  const adjustedDate = date.getDate() + dayOffset;

  return Math.ceil(adjustedDate / 7);
}

function isPastDate(date) {
  const today = new Date();
  return startOfDay(date) < startOfDay(today);
}

/*
=====================================================
DENSITY INTELLIGENCE LAYER
=====================================================
*/

function getDensityColor(count) {
  if (!count) return "transparent";

  if (count === 1) return "rgba(245, 194, 66, 0.08)";
  if (count === 2) return "rgba(245, 194, 66, 0.18)";
  if (count === 3) return "rgba(245, 194, 66, 0.28)";
  if (count >= 4) return "rgba(212, 51, 51, 0.35)";

  return "transparent";
}

/*
=====================================================
COMPONENT
=====================================================
*/

function CalendarManagement() {
  const today = new Date();

  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    return addDays(d, -((day + 6) % 7));
  });

  const [events, setEvents] = useState([]);

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingEvent, setEditingEvent] = useState(null);

  /*
  -----------------------------------------------------
  Conflict Engine
  -----------------------------------------------------
  */

  const hasConflict = (newEvent) => {
    const newStart = new Date(newEvent.startDate);
    const newEnd = new Date(newEvent.endDate);

    return events.some((ev) => {
      if (editingEvent && ev.id === editingEvent.id) return false;

      const start = new Date(ev.startDate);
      const end = new Date(ev.endDate);

      return newStart <= end && newEnd >= start;
    });
  };

  /*
  -----------------------------------------------------
  Event Map Indexing
  -----------------------------------------------------
  */

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

  /*
  -----------------------------------------------------
  Density Layer Map
  -----------------------------------------------------
  */

  const densityMap = useMemo(() => {
    const map = {};

    events.forEach((ev) => {
      const start = new Date(ev.startDate);
      const end = new Date(ev.endDate);

      const isoDate = formatISO(start);

      for (let h = start.getHours(); h <= end.getHours(); h++) {
        const key = `${isoDate}_${h}`;
        map[key] = (map[key] || 0) + 1;
      }
    });

    return map;
  }, [events]);

  /*
  -----------------------------------------------------
  Week Computation
  -----------------------------------------------------
  */

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) =>
      addDays(currentWeekStart, i)
    );
  }, [currentWeekStart]);

  /*
  -----------------------------------------------------
  Navigation Logic
  -----------------------------------------------------
  */

  const prevWeek = () =>
    setCurrentWeekStart(addDays(currentWeekStart, -7));

  const nextWeek = () =>
    setCurrentWeekStart(addDays(currentWeekStart, 7));

  const goToToday = () => {
    const day = today.getDay();
    const weekStart = addDays(today, -((day + 6) % 7));
    setCurrentWeekStart(weekStart);
  };

  /*
  -----------------------------------------------------
  Dialog Handlers
  -----------------------------------------------------
  */

  const handleCloseDialog = () => setOpenDialog(false);

  const handleSaveEvent = (eventData) => {
    if (hasConflict(eventData)) {
      alert("Schedule conflict detected!");
      return;
    }

    setEvents((prev) => {
      const index = prev.findIndex((e) => e.id === eventData.id);

      if (index > -1) {
        const copy = [...prev];
        copy[index] = eventData;
        return copy;
      }

      return [...prev, eventData];
    });

    setOpenDialog(false);
  };

  /*
  -----------------------------------------------------
  Interaction
  -----------------------------------------------------
  */

  const handleCellClick = (date, hour) => {
    if (isPastDate(date)) return;

    setEditingEvent(null);

    const start = new Date(date);
    start.setHours(hour, 0, 0, 0);

    setSelectedDate(start);
    setOpenDialog(true);
  };

  /*
  -----------------------------------------------------
  Event Renderer
  -----------------------------------------------------
  */

  const renderEventBlock = (ev) => {
    const start = new Date(ev.startDate);
    const end = new Date(ev.endDate);

    const startMinutes =
      (start.getHours() - SCHEDULER_START_HOUR) * 60 +
      start.getMinutes();

    const durationMinutes = (end - start) / (1000 * 60);

    return (
      <Box
        key={ev.id}
        sx={{
          position: "absolute",
          top: startMinutes * MINUTE_RATIO,
          height: durationMinutes * MINUTE_RATIO,
          left: 2,
          right: 2,
          bgcolor: "#d32f2f",
          color: "white",
          borderRadius: 1,
          fontSize: "0.7rem",
          p: 0.5,
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
          cursor: "pointer",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setEditingEvent(ev);
          setSelectedDate(new Date(ev.startDate));
          setOpenDialog(true);
        }}
      >
        <Typography fontSize="0.7rem" fontWeight={600}>
          {ev.title}
        </Typography>

        <Typography fontSize="0.65rem">
          {start.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}{" "}
          -{" "}
          {end.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Typography>
      </Box>
    );
  };

  /*
  -----------------------------------------------------
  Metadata
  -----------------------------------------------------
  */

  const currentMonthYear = currentWeekStart.toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const weekNumber = getWeekOfMonth(currentWeekStart);

  /*
  =====================================================
  RENDER
  =====================================================
  */

  return (
    <Box p={3}>
      {/* HEADER */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <IconButton onClick={prevWeek}>
          <ArrowBackIosNewIcon />
        </IconButton>

        <Box textAlign="center">
          <Typography variant="h6" fontWeight={600}>
            Week {weekNumber} of {currentMonthYear}
          </Typography>
        </Box>

        <Box display="flex" gap={1}>
          <IconButton
            onClick={goToToday}
            sx={{
              border: "1px solid #eee",
              borderRadius: 2,
              px: 2,
              fontSize: "0.75rem",
            }}
          >
            Today
          </IconButton>

          <IconButton onClick={nextWeek}>
            <ArrowForwardIosIcon />
          </IconButton>
        </Box>
      </Box>

      {/* GRID */}
      <Paper sx={{ overflow: "auto" }}>
        <Box display="grid" gridTemplateColumns={`80px repeat(7, 1fr)`}>
          {/* Weekday Header */}
          <Box />

          {weekDays.map((date) => {
            const isToday =
              formatISO(date) === formatISO(today);

            return (
              <Box
                key={date}
                textAlign="center"
                p={1}
                sx={{
                  backgroundColor: isToday
                    ? TODAY_HIGHLIGHT_COLOR
                    : "transparent",
                  borderBottom: isToday
                    ? `3px solid ${TODAY_BORDER_COLOR}`
                    : "none",
                  borderRadius: 1,
                }}
              >
                <Typography fontWeight={600}>
                  {date.toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  {date.getDate()}
                </Typography>
              </Box>
            );
          })}

          {/* Timeline */}
          {Array.from({
            length: SCHEDULER_END_HOUR - SCHEDULER_START_HOUR,
          }).map((_, hourIndex) => {
            const hour = SCHEDULER_START_HOUR + hourIndex;

            return (
              <React.Fragment key={hour}>
                <Box p={1} fontSize="0.75rem" borderTop="1px solid #eee">
                  {new Date(0, 0, 0, hour).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Box>

                {weekDays.map((date) => {
                  const iso = formatISO(date);

                  const dayEvents = (eventsMap[iso] || []).filter(
                    (ev) => new Date(ev.startDate).getHours() === hour
                  );

                  const pastCell = isPastDate(date);

                  const densityKey = `${iso}_${hour}`;
                  const densityCount = densityMap[densityKey] || 0;
                  const densityBg = getDensityColor(densityCount);

                  return (
                    <Box
                      key={iso + hour}
                      position="relative"
                      minHeight={SLOT_HEIGHT}
                      borderTop="1px solid #eee"
                      borderLeft="1px solid #eee"
                      p={0.3}
                      sx={{
                        cursor: pastCell ? "not-allowed" : "pointer",
                        opacity: pastCell ? 0.55 : 1,
                        backgroundColor: densityBg,
                      }}
                      onClick={() => handleCellClick(date, hour)}
                    >
                      {dayEvents.map(renderEventBlock)}
                    </Box>
                  );
                })}
              </React.Fragment>
            );
          })}
        </Box>
      </Paper>

      <CalendarEventDialog
        open={openDialog}
        handleClose={handleCloseDialog}
        handleSave={handleSaveEvent}
        defaultDate={selectedDate}
        existingEvent={editingEvent}
      />
    </Box>
  );
}

export default CalendarManagement;