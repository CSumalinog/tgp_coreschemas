// src/pages/client/MyCalendar.jsx
import React, { useState, useEffect } from "react";
import { Box, Typography, IconButton, Tooltip, useTheme } from "@mui/material";
import ArrowBackIosNewIcon  from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon  from "@mui/icons-material/ArrowForwardIos";
import CoverageRequestDialog from "../../components/client/RequestForm";
import { supabase } from "../../lib/supabaseClient";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_EVENTS_PER_DAY = 2;

function getPhilippineHolidays(year) {
  const holidays = {};
  const fixedHolidays = {
    "01-01": "New Year's Day", "05-01": "Labor Day", "06-12": "Independence Day",
    "08-31": "National Heroes Day", "11-30": "Bonifacio Day",
    "12-25": "Christmas Day", "12-30": "Rizal Day",
  };
  const specialDays = {
    "02-25": "EDSA People Power Anniversary", "11-01": "All Saints' Day",
    "11-02": "All Souls' Day", "12-08": "Feast of the Immaculate Conception",
    "12-24": "Christmas Eve", "12-31": "New Year's Eve",
  };
  Object.entries(fixedHolidays).forEach(([d, t]) => { holidays[`${year}-${d}`] = t; });
  Object.entries(specialDays).forEach(([d, t]) => { holidays[`${year}-${d}`] = t; });

  const easter = calculateEaster(year);
  const goodFriday    = new Date(easter); goodFriday.setDate(easter.getDate() - 2);
  const maundyThursday = new Date(easter); maundyThursday.setDate(easter.getDate() - 3);
  const fmt = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  holidays[fmt(maundyThursday)] = "Maundy Thursday";
  holidays[fmt(goodFriday)]     = "Good Friday";
  return holidays;
}

function calculateEaster(Y) {
  const a=Y%19,b=Math.floor(Y/100),c=Y%100,d=Math.floor(b/4),e=b%4;
  const f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,L=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*L)/451);
  const month=Math.floor((h+L-7*m+114)/31),day=((h+L-7*m+114)%31)+1;
  return new Date(Y,month-1,day);
}

function Calendar() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const today = new Date(); today.setHours(0,0,0,0);
  const [currentDate,  setCurrentDate]  = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [openDialog,   setOpenDialog]   = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [eventMap,     setEventMap]     = useState({});
  const [blockedDates, setBlockedDates] = useState(new Set());

  const PH_HOLIDAYS = getPhilippineHolidays(currentDate.getFullYear());

  useEffect(() => {
    const year = currentDate.getFullYear(), month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).toISOString().split("T")[0];
    const lastDay  = new Date(year, month+1, 0).toISOString().split("T")[0];
    fetchMonthData(firstDay, lastDay);
  }, [currentDate]);

  const fetchMonthData = async (firstDay, lastDay) => {
    try {
      const { data: requests, error: reqError } = await supabase
        .from("coverage_requests").select("event_date")
        .in("status", ["Pending","Approved","Forwarded","Assigned"])
        .gte("event_date", firstDay).lte("event_date", lastDay);
      if (!reqError && requests) {
        const map = {};
        requests.forEach(({ event_date }) => { map[event_date] = (map[event_date]||0)+1; });
        setEventMap(map);
      }
      const { data: blocked, error: blockedError } = await supabase
        .from("blocked_dates").select("start_date, end_date")
        .lte("start_date", lastDay).gte("end_date", firstDay);
      if (!blockedError && blocked) {
        const blockedSet = new Set();
        blocked.forEach(({ start_date, end_date }) => {
          let d = new Date(start_date), end = new Date(end_date);
          while (d <= end) { blockedSet.add(d.toISOString().split("T")[0]); d.setDate(d.getDate()+1); }
        });
        setBlockedDates(blockedSet);
      }
    } catch (err) { console.error("Calendar fetch error:", err); }
  };

  const getEventCount     = (iso) => eventMap[iso] || 0;
  const getRemainingSlots = (iso) => Math.max(0, MAX_EVENTS_PER_DAY - getEventCount(iso));
  const isBlocked         = (iso) => blockedDates.has(iso);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()-1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth()+1, 1));

  const generateCalendarGrid = () => {
    const year=currentDate.getFullYear(), month=currentDate.getMonth();
    const firstDayOfMonth=new Date(year,month,1).getDay(), daysInMonth=new Date(year,month+1,0).getDate();
    const prevMonthDays=new Date(year,month,0).getDate();
    const totalCells=Math.ceil((firstDayOfMonth+daysInMonth)/7)*7;
    const calendar=[];
    for (let i=0;i<totalCells;i++) {
      let dayNumber="",isCurrentMonth=true,cellDate;
      if (i<firstDayOfMonth) { dayNumber=prevMonthDays-firstDayOfMonth+1+i; isCurrentMonth=false; cellDate=new Date(year,month-1,dayNumber); }
      else if (i>=firstDayOfMonth+daysInMonth) { dayNumber=i-(firstDayOfMonth+daysInMonth)+1; isCurrentMonth=false; cellDate=new Date(year,month+1,dayNumber); }
      else { dayNumber=i-firstDayOfMonth+1; cellDate=new Date(year,month,dayNumber); }
      const iso=`${cellDate.getFullYear()}-${String(cellDate.getMonth()+1).padStart(2,"0")}-${String(cellDate.getDate()).padStart(2,"0")}`;
      calendar.push({ dayNumber, isCurrentMonth, iso, cellDate });
    }
    return calendar;
  };

  const calendarDays = generateCalendarGrid();

  const handleDateClick = (date) => {
    if (date.cellDate < today || getRemainingSlots(date.iso) <= 0 || isBlocked(date.iso) || !date.isCurrentMonth) return;
    setSelectedDate(date.cellDate);
    setOpenDialog(true);
  };

  const handleSuccess = () => {
    const year=currentDate.getFullYear(), month=currentDate.getMonth();
    fetchMonthData(new Date(year,month,1).toISOString().split("T")[0], new Date(year,month+1,0).toISOString().split("T")[0]);
  };

  return (
    <Box sx={{ width: "100%", height: "100%", p: 3, pt: 2 }}>

      {/* Month Header */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
        <IconButton onClick={prevMonth}><ArrowBackIosNewIcon /></IconButton>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography fontSize="1rem" fontWeight="semibold" color="text.primary">
            {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
          </Typography>
          <IconButton
            onClick={() => setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))}
            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 6, minWidth: 80, padding: "6px 12px", "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" } }}
          >
            <Typography sx={{ fontSize: "0.8rem", color: "text.primary" }}>Today</Typography>
          </IconButton>
        </Box>
        <IconButton onClick={nextMonth}><ArrowForwardIosIcon /></IconButton>
      </Box>

      {/* Weekday Header */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
        {DAYS.map((day) => (
          <Typography key={day} align="center" fontWeight="semibold" color="text.secondary" sx={{ fontSize: "0.8rem" }}>
            {day}
          </Typography>
        ))}
      </Box>

      {/* Calendar Grid */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", border: "1px solid", borderColor: "divider", borderRadius: 3, overflow: "hidden" }}>
        {calendarDays.map((date, idx) => {
          const d = date.cellDate;
          const isWeekend    = d.getDay() === 0 || d.getDay() === 6;
          const holidayTitle = PH_HOLIDAYS[date.iso];
          const isToday      = d.toDateString() === today.toDateString() && date.isCurrentMonth;
          const isPast       = d < today;
          const remainingSlots = getRemainingSlots(date.iso);
          const blocked      = isBlocked(date.iso);
          const isDisabled   = isPast || remainingSlots <= 0 || blocked;

          return (
            <Box key={idx} onClick={() => handleDateClick(date)}
              sx={{
                minHeight: 95, p: 1,
                color: date.isCurrentMonth ? "text.primary" : "text.secondary",
                backgroundColor: isWeekend
                  ? (isDark ? "#1a1a1a" : "#f5f5f5")
                  : "background.paper",
                borderRight: ".5px solid", borderBottom: ".5px solid", borderColor: "divider",
                "&:nth-of-type(7n)":      { borderRight: "none" },
                "&:nth-last-child(-n+7)": { borderBottom: "none" },
                "&:hover": { backgroundColor: isDisabled ? undefined : (isDark ? "#2a2a2a" : "#fafafa") },
                position: "relative",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isPast ? 0.5 : 1,
              }}
            >
              <Box sx={{ display: "flex", justifyContent: "center" }}>
                <Tooltip title={holidayTitle || (blocked ? "Blocked by Admin" : "")} arrow>
                  <Box sx={{
                    minWidth: "100%", height: 22, px: 0.8,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: 2,
                    fontFamily: "'Helvetica', sans-serif", fontSize: "0.8rem",
                    color: "text.primary",
                    ...(isToday      && { backgroundColor: "#1976d2", color: "white" }),
                    ...(holidayTitle && !isToday && { backgroundColor: "#4caf50", color: "white" }),
                    ...(blocked      && !isToday && { backgroundColor: "#d32f2f", color: "white" }),
                  }}>
                    {date.dayNumber}
                  </Box>
                </Tooltip>
              </Box>

              {date.isCurrentMonth && !isPast && (
                <Typography sx={{
                  fontSize: ".65rem", textAlign: "center", mt: 0.5,
                  color: blocked ? "#d32f2f" : remainingSlots === 0 ? "#d32f2f" : "text.secondary",
                }}>
                  {blocked ? "Unavailable" : remainingSlots === 0 ? "Fully Booked" : `Available Slots: ${remainingSlots}`}
                </Typography>
              )}
            </Box>
          );
        })}
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