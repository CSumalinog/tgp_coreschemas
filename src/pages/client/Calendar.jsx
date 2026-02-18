// src/pages/MyCalendar.jsx
import React, { useState } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import ArrowForwardIosIcon from "@mui/icons-material/ArrowForwardIos";
import RequestForm from "../../components/client/RequestForm"; // import your dialog

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// --------------------- Holiday functions ---------------------
function getPhilippineHolidays(year) {
  const holidays = {};

  const fixedHolidays = {
    "01-01": "New Year's Day",
    "05-01": "Labor Day",
    "06-12": "Independence Day",
    "08-31": "National Heroes Day",
    "11-30": "Bonifacio Day",
    "12-25": "Christmas Day",
    "12-30": "Rizal Day",
  };
  Object.entries(fixedHolidays).forEach(([d, title]) => {
    holidays[`${year}-${d}`] = title;
  });

  const specialDays = {
    "02-25": "EDSA People Power Anniversary",
    "11-01": "All Saints' Day",
    "11-02": "All Souls' Day",
    "12-08": "Feast of the Immaculate Conception",
    "12-24": "Christmas Eve",
    "12-31": "New Year's Eve",
  };
  Object.entries(specialDays).forEach(([d, title]) => {
    holidays[`${year}-${d}`] = title;
  });

  const easter = calculateEaster(year);
  const goodFriday = new Date(easter);
  goodFriday.setDate(easter.getDate() - 2);
  const maundyThursday = new Date(easter);
  maundyThursday.setDate(easter.getDate() - 3);

  const formatIso = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;

  holidays[formatIso(maundyThursday)] = "Maundy Thursday";
  holidays[formatIso(goodFriday)] = "Good Friday";

  return holidays;
}

function calculateEaster(Y) {
  const a = Y % 19;
  const b = Math.floor(Y / 100);
  const c = Y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const L = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * L) / 451);
  const month = Math.floor((h + L - 7 * m + 114) / 31);
  const day = ((h + L - 7 * m + 114) % 31) + 1;
  return new Date(Y, month - 1, day);
}

// --------------------- Main Component ---------------------
function Calendar() {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );

  const [openDialog, setOpenDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  const prevMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1)
    );

  const nextMonth = () =>
    setCurrentDate(
      new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1)
    );

  const PH_HOLIDAYS = getPhilippineHolidays(currentDate.getFullYear());

  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const totalCells = 35;

    const calendar = [];

    for (let i = 0; i < totalCells; i++) {
      let dayNumber = "";
      let isCurrentMonth = true;
      let cellDate;

      if (i < firstDayOfMonth) {
        dayNumber = prevMonthDays - firstDayOfMonth + 1 + i;
        isCurrentMonth = false;
        cellDate = new Date(year, month - 1, dayNumber);
      } else if (i >= firstDayOfMonth + daysInMonth) {
        dayNumber = i - (firstDayOfMonth + daysInMonth) + 1;
        isCurrentMonth = false;
        cellDate = new Date(year, month + 1, dayNumber);
      } else {
        dayNumber = i - firstDayOfMonth + 1;
        cellDate = new Date(year, month, dayNumber);
      }

      const iso = `${cellDate.getFullYear()}-${String(
        cellDate.getMonth() + 1
      ).padStart(2, "0")}-${String(cellDate.getDate()).padStart(2, "0")}`;

      calendar.push({ dayNumber, isCurrentMonth, iso, cellDate });
    }

    return calendar;
  };

  const calendarDays = generateCalendarGrid();

  const handleDateClick = (date) => {
    const isPast = date.cellDate < new Date(today.setHours(0, 0, 0, 0));
    const isHoliday = PH_HOLIDAYS[date.iso];

    if (isPast || isHoliday) return; // blocked
    setSelectedDate(date.cellDate); // preselect the clicked date
    setOpenDialog(true); // open dialog
  };

  const handleCloseDialog = () => setOpenDialog(false);

  const handleSubmitRequest = (data) => {
    console.log("Coverage request submitted:", data);
    handleCloseDialog();
  };

  return (
    <Box sx={{ width: "100%", height: "100%", p: 3, pt: 2 }}>
      {/* Month header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <IconButton onClick={prevMonth}>
          <ArrowBackIosNewIcon />
        </IconButton>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography variant="h6" fontWeight="semibold">
            {currentDate.toLocaleString("default", {
              month: "long",
              year: "numeric",
            })}
          </Typography>

          <IconButton
            onClick={() =>
              setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1))
            }
            sx={{
              border: "1px solid #e0e0e0",
              borderRadius: 6,
              minWidth: 80,
              padding: "6px 12px",
              "&:hover": { backgroundColor: "#f5f5f5" },
            }}
          >
            <Typography sx={{ fontSize: "0.75rem" }}>Today</Typography>
          </IconButton>
        </Box>

        <IconButton onClick={nextMonth}>
          <ArrowForwardIosIcon />
        </IconButton>
      </Box>

      {/* Weekday header */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.5 }}>
        {DAYS.map((day) => (
          <Typography
            key={day}
            align="center"
            fontWeight="semibold"
            color="text.secondary"
            sx={{ fontSize: "0.9rem" }}
          >
            {day}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          border: "1px solid #e0e0e0",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        {calendarDays.map((date, idx) => {
          const d = date.cellDate;
          const isWeekend = d.getDay() === 0 || d.getDay() === 6;
          const holidayTitle = PH_HOLIDAYS[date.iso];
          const isToday = d.toDateString() === today.toDateString() && date.isCurrentMonth;

          const isPast = d < new Date(today.setHours(0, 0, 0, 0));
          const isDisabled = isPast || holidayTitle;

          return (
            <Box
              key={idx}
              onClick={() => handleDateClick(date)}
              sx={{
                minHeight: 95,
                p: 1,
                color: date.isCurrentMonth ? "#212121" : "#b0b0b0",
                backgroundColor: isWeekend ? "#f5f5f5" : "transparent",
                borderRight: ".5px solid #e0e0e0",
                borderBottom: ".5px solid #e0e0e0",
                "&:nth-of-type(7n)": { borderRight: "none" },
                "&:nth-last-child(-n+7)": { borderBottom: "none" },
                "&:hover": { backgroundColor: isDisabled ? undefined : "#fafafa" },
                position: "relative",
                border: isToday ? "2px solid #1976d2" : ".01px solid #e0e0e",
                borderRadius: isToday ? "70%" : "0",
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isPast ? 0.5 : 1, // only past dates faded, holidays not
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.9rem",
                  fontWeight: "semibold",
                  textAlign: "center",
                }}
              >
                {date.dayNumber}
              </Typography>

              {holidayTitle && (
                <Tooltip title={holidayTitle} arrow>
                  <Typography
                    sx={{
                      fontSize: ".9rem",
                      backgroundColor: "#2e7d32",
                      color: "white",
                      textAlign: "center",
                      position: "absolute",
                      top: "50%",
                      left: "50%",
                      transform: "translate(-50%, -50%)",
                      borderRadius: 2,
                      overflow: "hidden",
                      whiteSpace: "nowrap",
                      textOverflow: "ellipsis",
                      px: 0.5,
                      maxWidth: "90%",
                      pointerEvents: "auto",
                    }}
                  >
                    {holidayTitle}
                  </Typography>
                </Tooltip>
              )}
            </Box>
          );
        })}
      </Box>

      {/* ---------- COVERAGE REQUEST DIALOG ---------- */}
      <RequestForm
        open={openDialog}
        handleClose={handleCloseDialog}
        handleSubmit={handleSubmitRequest}
        defaultDate={selectedDate} // preselected clicked date
      />
    </Box>
  );
}

export default Calendar;
