// src/pages/client/MyCalendar.jsx
import React, { useState, useEffect } from "react";
import { Box, Typography, IconButton, Tooltip, Button, useTheme } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNewOutlined";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIosOutlined";
import CoverageRequestDialog from "../../components/client/RequestForm";
import { supabase } from "../../lib/supabaseClient";

// ── Brand tokens ───────────────────────────────────────────────────────────
const GOLD     = "#F5C52B";
const GOLD_08  = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";

const HOLIDAY_TAG_PALETTE = [
  {
    light: { bg: "rgba(59,130,246,0.10)", border: "rgba(59,130,246,0.35)", text: "#1d4ed8" },
    dark: { bg: "rgba(59,130,246,0.20)", border: "rgba(96,165,250,0.45)", text: "#93c5fd" },
  },
  {
    light: { bg: "rgba(236,72,153,0.10)", border: "rgba(236,72,153,0.35)", text: "#be185d" },
    dark: { bg: "rgba(236,72,153,0.20)", border: "rgba(244,114,182,0.45)", text: "#f9a8d4" },
  },
  {
    light: { bg: "rgba(249,115,22,0.10)", border: "rgba(249,115,22,0.35)", text: "#c2410c" },
    dark: { bg: "rgba(249,115,22,0.20)", border: "rgba(251,146,60,0.45)", text: "#fdba74" },
  },
  {
    light: { bg: "rgba(168,85,247,0.10)", border: "rgba(168,85,247,0.35)", text: "#7e22ce" },
    dark: { bg: "rgba(168,85,247,0.20)", border: "rgba(192,132,252,0.45)", text: "#d8b4fe" },
  },
  {
    light: { bg: "rgba(20,184,166,0.10)", border: "rgba(20,184,166,0.35)", text: "#0f766e" },
    dark: { bg: "rgba(20,184,166,0.20)", border: "rgba(45,212,191,0.45)", text: "#99f6e4" },
  },
  {
    light: { bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.35)", text: "#b91c1c" },
    dark: { bg: "rgba(239,68,68,0.20)", border: "rgba(248,113,113,0.45)", text: "#fca5a5" },
  },
];

const DAYS               = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FALLBACK_DEFAULT_SLOTS = 2;

// ── Timezone-safe ISO helper ──────────────────────────────────────────────
const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseLocalDate = (str) => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
};

function getHolidayTagStyle(title, isDark) {
  let hash = 0;
  for (let i = 0; i < title.length; i++) {
    hash = (hash << 5) - hash + title.charCodeAt(i);
    hash |= 0;
  }
  const swatch = HOLIDAY_TAG_PALETTE[Math.abs(hash) % HOLIDAY_TAG_PALETTE.length];
  return isDark ? swatch.dark : swatch.light;
}

function getPhilippineHolidays(year) {
  const holidays = {};
  const fixedHolidays = {
    "01-01": "New Year's Day",         "05-01": "Labor Day",
    "06-12": "Independence Day",       "08-31": "National Heroes Day",
    "11-30": "Bonifacio Day",          "12-25": "Christmas Day",
    "12-30": "Rizal Day",
  };
  const specialDays = {
    "02-25": "EDSA People Power Anniversary", "11-01": "All Saints' Day",
    "11-02": "All Souls' Day",                "12-08": "Feast of the Immaculate Conception",
    "12-24": "Christmas Eve",                 "12-31": "New Year's Eve",
  };
  Object.entries(fixedHolidays).forEach(([d, t]) => { holidays[`${year}-${d}`] = t; });
  Object.entries(specialDays).forEach(([d, t]) => { holidays[`${year}-${d}`] = t; });

  const easter         = calculateEaster(year);
  const goodFriday     = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
  const maundyThursday = new Date(easter); maundyThursday.setDate(easter.getDate() - 3);
  holidays[toISO(maundyThursday)] = "Maundy Thursday";
  holidays[toISO(goodFriday)]     = "Good Friday";
  return holidays;
}

function calculateEaster(Y) {
  const a=Y%19,b=Math.floor(Y/100),c=Y%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,L=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*L)/451);
  const month=Math.floor((h+L-7*m+114)/31),day=((h+L-7*m+114)%31)+1;
  return new Date(Y, month - 1, day);
}

function Calendar() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [currentDate,    setCurrentDate]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [openDialog,     setOpenDialog]     = useState(false);
  const [selectedDate,   setSelectedDate]   = useState(null);
  const [eventMap,       setEventMap]       = useState({});
  const [blockedDates,   setBlockedDates]   = useState(new Set());
  const [myRequestDates, setMyRequestDates] = useState(new Set());
  const [defaultSlots,   setDefaultSlots]   = useState(FALLBACK_DEFAULT_SLOTS);
  const [slotOverrides,  setSlotOverrides]  = useState({});

  const PH_HOLIDAYS = getPhilippineHolidays(currentDate.getFullYear());

  useEffect(() => {
    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = toISO(new Date(year, month, 1));
    const lastDay  = toISO(new Date(year, month + 1, 0));
    fetchMonthData(firstDay, lastDay);
  }, [currentDate]);

  const fetchMonthData = async (firstDay, lastDay) => {
    try {
      const [{ data: settingsRow }, { data: overrideRows }] = await Promise.all([
        supabase
          .from("calendar_slot_settings")
          .select("default_slots")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("calendar_slot_overrides")
          .select("slot_date, slot_capacity")
          .gte("slot_date", firstDay)
          .lte("slot_date", lastDay),
      ]);

      const resolvedDefault = settingsRow?.default_slots ?? FALLBACK_DEFAULT_SLOTS;
      setDefaultSlots(resolvedDefault);
      setSlotOverrides(
        Object.fromEntries(
          (overrideRows || []).map((row) => [row.slot_date, row.slot_capacity]),
        ),
      );

      // ✅ Only count Approved, On Going, and Completed as taken slots
      const { data: requests, error: reqError } = await supabase
        .from("coverage_requests")
        .select("event_date")
        .in("status", ["Approved", "On Going", "Completed"])
        .is("archived_at", null)
        .is("trashed_at", null)
        .gte("event_date", firstDay)
        .lte("event_date", lastDay);

      if (!reqError && requests) {
        const map = {};
        requests.forEach(({ event_date }) => {
          map[event_date] = (map[event_date] || 0) + 1;
        });
        setEventMap(map);
      }

      // ✅ Gold dot — shows client's own requests (any non-draft status)
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: myReqs } = await supabase
          .from("coverage_requests")
          .select("event_date")
          .eq("requester_id", user.id)
          .not("status", "eq", "Draft")
          .is("archived_at", null)
          .is("trashed_at", null)
          .gte("event_date", firstDay)
          .lte("event_date", lastDay);

        if (myReqs) setMyRequestDates(new Set(myReqs.map((r) => r.event_date)));
      }

      // ✅ Blocked dates — unchanged
      const { data: blocked, error: blockedError } = await supabase
        .from("blocked_dates")
        .select("start_date, end_date")
        .lte("start_date", lastDay)
        .gte("end_date", firstDay);

      if (!blockedError && blocked) {
        const blockedSet = new Set();
        blocked.forEach(({ start_date, end_date }) => {
          let d   = parseLocalDate(start_date);
          const e = parseLocalDate(end_date);
          while (d <= e) {
            blockedSet.add(toISO(d));
            d.setDate(d.getDate() + 1);
          }
        });
        setBlockedDates(blockedSet);
      }
    } catch (err) {
      console.error("Calendar fetch error:", err);
    }
  };

  const getEventCount     = (iso) => eventMap[iso] || 0;
  const getCapacityForDate = (iso) => slotOverrides[iso] ?? defaultSlots;
  const getRemainingSlots = (iso) =>
    Math.max(0, getCapacityForDate(iso) - getEventCount(iso));
  const isBlocked         = (iso) => blockedDates.has(iso);
  const hasMyRequest      = (iso) => myRequestDates.has(iso);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDayOfMonth = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth     = new Date(year, month + 1, 0).getDate();
    const prevMonthDays   = new Date(year, month, 0).getDate();
    const totalCells      = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
    const calendar        = [];

    for (let i = 0; i < totalCells; i++) {
      let cellDate;
      if (i < firstDayOfMonth) {
        cellDate = new Date(year, month - 1, prevMonthDays - firstDayOfMonth + 1 + i);
      } else if (i >= firstDayOfMonth + daysInMonth) {
        cellDate = new Date(year, month + 1, i - (firstDayOfMonth + daysInMonth) + 1);
      } else {
        cellDate = new Date(year, month, i - firstDayOfMonth + 1);
      }
      calendar.push({
        dayNumber:      cellDate.getDate(),
        isCurrentMonth: cellDate.getMonth() === month,
        iso:            toISO(cellDate),
        cellDate,
      });
    }
    return calendar;
  };

  const calendarDays = generateCalendarGrid();

  const handleDateClick = (date) => {
    if (!date.isCurrentMonth || date.cellDate < today || getRemainingSlots(date.iso) <= 0 || isBlocked(date.iso)) return;
    setSelectedDate(date.cellDate);
    setOpenDialog(true);
  };

  const handleSuccess = () => {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    fetchMonthData(toISO(new Date(year, month, 1)), toISO(new Date(year, month + 1, 0)));
  };

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        p: { xs: 1.5, md: 3 },
        pt: 2,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        minHeight: 0,
      }}
    >

      {/* ── Month Header ── */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <IconButton onClick={prevMonth} size="small" sx={{
          borderRadius: "10px", color: "text.secondary",
          "&:hover": { backgroundColor: GOLD_08, color: CHARCOAL },
          transition: "all 0.15s",
        }}>
          <ArrowBackIosNewIcon sx={{ fontSize: 14 }} />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Typography sx={{ fontSize: { xs: "0.9rem", md: "1rem" }, fontWeight: 700, color: "text.primary", letterSpacing: "-0.02em" }}>
            {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
          </Typography>
          <Button onClick={goToToday} size="small" variant="outlined" sx={{
            textTransform: "none", fontSize: "0.72rem", px: 1.5, py: 0.35,
            borderColor: "divider", color: "text.secondary", borderRadius: "10px", fontWeight: 500,
            "&:hover": { borderColor: GOLD, color: CHARCOAL, backgroundColor: GOLD_08 },
            transition: "all 0.15s",
          }}>
            Today
          </Button>
        </Box>

        <IconButton onClick={nextMonth} size="small" sx={{
          borderRadius: "10px", color: "text.secondary",
          "&:hover": { backgroundColor: GOLD_08, color: CHARCOAL },
          transition: "all 0.15s",
        }}>
          <ArrowForwardIosIcon sx={{ fontSize: 14 }} />
        </IconButton>
      </Box>

      {/* ── Calendar Grid ── */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          overflow: "auto",
          border: "1px solid",
          borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.10)",
          borderRadius: "10px",
          backgroundColor: "background.paper",
          "&::-webkit-scrollbar": { width: 6, height: 6 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": {
            background: isDark ? "#3a3a3a" : "#d9d9d9",
            borderRadius: "10px",
          },
        }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(7, minmax(120px, 1fr))",
            minWidth: 7 * 120,
          }}
        >
          {DAYS.map((day) => (
            <Box
              key={day}
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                px: 1,
                py: 1,
                textAlign: "center",
                borderLeft: "1px solid",
                borderBottom: "1px solid",
                borderColor: "divider",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(53,53,53,0.02)",
                "&:first-of-type": { borderLeft: "none" },
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                {day}
              </Typography>
            </Box>
          ))}

          {calendarDays.map((date, idx) => {
          const d              = date.cellDate;
          const isWeekend      = d.getDay() === 0 || d.getDay() === 6;
          const holidayTitle   = PH_HOLIDAYS[date.iso];
          const isToday        = toISO(d) === toISO(today) && date.isCurrentMonth;
          const isPast         = d < today;
          const remainingSlots = getRemainingSlots(date.iso);
          const blocked        = isBlocked(date.iso);
          const hasRequest     = hasMyRequest(date.iso);
          const isDisabled     = !date.isCurrentMonth || isPast || remainingSlots <= 0 || blocked;
          const isClickable    = !isDisabled;
          const holidayTagStyle = holidayTitle
            ? getHolidayTagStyle(holidayTitle, isDark)
            : null;

          let cellBg = "background.paper";
          if (isWeekend && date.isCurrentMonth)  cellBg = isDark ? "#1a1a1a" : "rgba(53,53,53,0.02)";
          if (!date.isCurrentMonth)              cellBg = isDark ? "#141414" : "rgba(53,53,53,0.015)";
          if (blocked && date.isCurrentMonth)    cellBg = isDark ? "#1a0a0a" : "#fff5f5";

          const tooltipTitle =
            !date.isCurrentMonth ? "" :
            blocked              ? "Blocked by Admin" :
            isPast               ? "" :
            remainingSlots === 0 ? "Fully booked" :
            holidayTitle         ? holidayTitle : "";

          const cellContent = (
            <Box
              onClick={() => handleDateClick(date)}
              sx={{
                minHeight: 116,
                p: 1,
                borderLeft: "1px solid",
                borderTop: "1px solid",
                borderColor: "divider",
                backgroundColor: cellBg,
                position: "relative",
                cursor: isClickable ? "pointer" : "not-allowed",
                opacity: !date.isCurrentMonth ? 0.58 : isPast ? 0.45 : 1,
                transition: "background-color 0.15s",
                ...(isClickable && {
                  "&:hover": {
                    backgroundColor: GOLD_08,
                  },
                }),
              }}
            >
              {/* Date + holiday label row */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.55, mb: 0.45 }}>
                <Box className="day-number-box" sx={{
                  width: "auto", height: "auto",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: { xs: "0.7rem", md: "0.8rem" },
                  fontWeight: isToday ? 700 : 400,
                  transition: "color 0.15s",
                  color: "text.primary",
                  ...(isToday && { color: GOLD }),
                  ...(holidayTitle && !isToday && { color: "#15803d", fontWeight: 700 }),
                  ...(blocked && date.isCurrentMonth && !isToday && { color: "#d32f2f", fontWeight: 700 }),
                }}>
                  {date.dayNumber}
                </Box>

                {date.isCurrentMonth && holidayTitle && (
                  <Box
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      px: 0.65,
                      py: 0.12,
                      borderRadius: "999px",
                      border: "1px solid",
                      borderColor: holidayTagStyle.border,
                      backgroundColor: holidayTagStyle.bg,
                    }}
                  >
                    <Typography
                      noWrap
                      sx={{
                        fontSize: { xs: "0.5rem", md: "0.56rem" },
                        lineHeight: 1.2,
                        fontWeight: 600,
                        color: holidayTagStyle.text,
                        letterSpacing: "0.01em",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {holidayTitle}
                    </Typography>
                  </Box>
                )}
              </Box>

              {/* Slot status */}

              {date.isCurrentMonth && !isPast && (
                <Typography sx={{
                  fontSize: { xs: "0.55rem", md: "0.63rem" },
                  textAlign: "left", lineHeight: 1.2, fontWeight: 500,
                  color:
                    blocked              ? "#d32f2f" :
                    remainingSlots === 0 ? "#d32f2f" :
                    "#15803d",
                }}>
                  {blocked              ? "Unavailable"  :
                   remainingSlots === 0 ? "Fully Booked" :
                   `Slots open: ${remainingSlots}`}
                </Typography>
              )}

              {/* My request dot */}
              {hasRequest && date.isCurrentMonth && (
                <Box sx={{
                  position: "absolute", bottom: 4, right: 5,
                  width: 6, height: 6, borderRadius: "50%",
                  backgroundColor: GOLD,
                  border: `1px solid ${isDark ? "#111" : "#fff"}`,
                }} />
              )}
            </Box>
          );

            return tooltipTitle ? (
              <Tooltip key={idx} title={tooltipTitle} arrow placement="bottom" disableInteractive>
                {cellContent}
              </Tooltip>
            ) : (
              <React.Fragment key={idx}>{cellContent}</React.Fragment>
            );
          })}
        </Box>
      </Box>

      <CoverageRequestDialog
        open={openDialog}
        handleClose={() => setOpenDialog(false)}
        onSuccess={handleSuccess}
        defaultDate={selectedDate}
      />
    </Box>
  );
}

export default Calendar;
