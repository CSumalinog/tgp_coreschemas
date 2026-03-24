// src/components/client/CoverageRequestDialog.jsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  Typography,
  Box,
  CircularProgress,
  Alert,
  useTheme,
  IconButton,
  Collapse,
  Paper,
} from "@mui/material";
import { TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  getDaysInMonth,
  getDay,
  isBefore,
  startOfDay,
  parseISO,
} from "date-fns";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  fetchClientTypes,
  fetchEntitiesByType,
} from "../../services/classificationService";
import {
  submitCoverageRequest,
  updateDraftRequest,
} from "../../services/coverageRequestService";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const SERVICES = [
  "News Article",
  "Photo Documentation",
  "Video Documentation",
  "Camera Operator (for live streaming)",
];

const DAYS_OF_WEEK      = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MAX_DAY_SELECTION = 7;
const MAX_PAX           = 3; // max staff per service per day (single or multi-day)
const OTHER_ID          = "__others__";

const EMPTY_ERRORS = {
  title:         "",
  description:   "",
  eventDays:     "",
  venue:         "",
  services:      "",
  clientType:    "",
  entity:        "",
  otherEntity:   "",
  contactPerson: "",
  contactInfo:   "",
  file:          "",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatKey(key) {
  return format(parseISO(key), "MMM d");
}

// ─────────────────────────────────────────────
// Popup Mini Calendar
// ─────────────────────────────────────────────
function PopupCalendar({ onSelect, alreadySelected, isDark }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today     = startOfDay(new Date());
  const year      = viewDate.getFullYear();
  const month     = viewDate.getMonth();
  const firstDow  = getDay(startOfMonth(viewDate));
  const totalDays = getDaysInMonth(viewDate);
  const cells     = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  return (
    <Paper elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1.5, backgroundColor: "background.paper" }}>
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
        <Typography sx={{ fontSize: "0.85rem", fontWeight: 500, color: "text.primary" }}>
          {format(viewDate, "MMMM yyyy")}
        </Typography>
        <Box sx={{ display: "flex", gap: 0.25 }}>
          <IconButton size="small" onClick={() => setViewDate((v) => subMonths(v, 1))} sx={{ p: 0.4 }}>
            <ChevronLeftIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <IconButton size="small" onClick={() => setViewDate((v) => addMonths(v, 1))} sx={{ p: 0.4 }}>
            <ChevronRightIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", mb: 0.25 }}>
        {DAYS_OF_WEEK.map((d) => (
          <Typography key={d} sx={{ fontSize: "0.65rem", textAlign: "center", color: "text.disabled", fontWeight: 500 }}>{d}</Typography>
        ))}
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", rowGap: "1px" }}>
        {cells.map((day, idx) => {
          if (!day) return <Box key={`e-${idx}`} />;
          const key       = dateKey(year, month, day);
          const cellDate  = startOfDay(new Date(year, month, day));
          const isPast    = isBefore(cellDate, today);
          const isAlready = alreadySelected.includes(key);
          const isToday   = cellDate.getTime() === today.getTime();
          return (
            <Box
              key={key}
              onClick={() => { if (!isPast && !isAlready) onSelect(key); }}
              sx={{
                height: 30, width: 30, mx: "auto",
                display: "flex", alignItems: "center", justifyContent: "center",
                borderRadius: "50%", fontSize: "0.75rem",
                cursor: isPast || isAlready ? "default" : "pointer",
                transition: "background 0.1s",
                ...(isAlready && { backgroundColor: isDark ? "#333" : "#e5e7eb", color: "text.disabled" }),
                ...(!isAlready && isToday && { backgroundColor: isDark ? "#1e1800" : "#fffbeb", color: isDark ? "#fbbf24" : "#92400e" }),
                ...(!isAlready && isPast && { color: "text.disabled" }),
                ...(!isAlready && !isPast && { color: "text.primary" }),
                ...(!isPast && !isAlready && { "&:hover": { backgroundColor: "#f5c52b", color: "#111" } }),
              }}
            >
              {day}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

// ─────────────────────────────────────────────
// DateChipInput
// ─────────────────────────────────────────────
function DateChipInput({ eventDays, onToggleDay, onTimeChange, onApplyFirstToAll, isDark, error, loading }) {
  const [calOpen, setCalOpen] = useState(false);
  const wrapRef               = useRef(null);
  const selectedKeys          = eventDays.map((d) => d.date);
  const isMultiDay            = eventDays.length > 1;
  const allFilled             = eventDays.length > 0 && eventDays.every((d) => d.fromTime && d.toTime);

  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setCalOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const timePickerSx = (filled) => ({
    flex: 1, minWidth: 0,
    "& .MuiInputBase-input": { fontSize: "0.82rem", py: 0.55, px: 0.75 },
    "& .MuiOutlinedInput-root": {
      borderRadius: 1, fontSize: "0.82rem",
      ...(filled && { "& fieldset": { borderColor: "#f5c52b" } }),
    },
    "& .MuiInputAdornment-root": { ml: 0 },
    "& .MuiInputAdornment-root .MuiIconButton-root": { p: 0.25 },
    "& .MuiSvgIcon-root": { fontSize: 14 },
  });

  return (
    <Box ref={wrapRef}>
      <Box
        onClick={() => !loading && setCalOpen((v) => !v)}
        sx={{
          display: "flex", alignItems: "center", gap: 1,
          border: "1px solid",
          borderColor: calOpen ? "#f5c52b" : error ? "#ef4444" : "divider",
          borderRadius: 1.5, px: 1.5, py: 1,
          cursor: loading ? "default" : "pointer",
          backgroundColor: calOpen ? (isDark ? "#1e1800" : "#fffbeb") : "background.paper",
          transition: "all 0.15s",
          "&:hover": !loading ? { borderColor: "#f5c52b" } : {},
        }}
      >
        <CalendarTodayOutlinedIcon sx={{ fontSize: 15, color: calOpen ? "#f5c52b" : "text.disabled", flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.83rem", color: eventDays.length > 0 ? "text.primary" : "text.disabled", flex: 1 }}>
          {eventDays.length === 0
            ? "Select date(s)"
            : eventDays.length === 1
              ? formatKey(eventDays[0].date)
              : `${eventDays.length} days selected`}
        </Typography>
        {eventDays.length > 0 && (
          <Box
            component="span"
            onClick={(e) => { e.stopPropagation(); eventDays.forEach((d) => onToggleDay(d.date)); }}
            sx={{ fontSize: "0.7rem", color: "text.disabled", "&:hover": { color: "text.primary" }, cursor: "pointer" }}
          >
            Clear
          </Box>
        )}
        {eventDays.length > 0 && (
          <Box sx={{
            px: 0.75, py: 0.15, borderRadius: "20px", fontSize: "0.65rem", fontWeight: 500, flexShrink: 0,
            ...(isMultiDay
              ? { backgroundColor: isDark ? "#0d1f0d" : "#f0fdf4", color: isDark ? "#4ade80" : "#15803d", border: "1px solid", borderColor: isDark ? "#166534" : "#86efac" }
              : { backgroundColor: isDark ? "#1e1800" : "#fffbeb", color: isDark ? "#fbbf24" : "#92400e", border: "1px solid #f5c52b" }),
          }}>
            {isMultiDay ? "Multi-day" : "Single day"}
          </Box>
        )}
      </Box>

      {error && <Typography sx={{ fontSize: "0.72rem", color: "#ef4444", mt: 0.25, ml: 0.5 }}>{error}</Typography>}

      <Collapse in={calOpen}>
        <Box sx={{ mt: 0.75, mb: 0.5 }}>
          <PopupCalendar onSelect={(key) => { onToggleDay(key); }} alreadySelected={selectedKeys} isDark={isDark} />
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 0.75 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <InfoOutlinedIcon sx={{ fontSize: 11, color: "text.disabled" }} />
              <Typography sx={{ fontSize: "0.68rem", color: "text.disabled" }}>
                {selectedKeys.length}/{MAX_DAY_SELECTION} selected · grayed days already added
              </Typography>
            </Box>
            <Button size="small" onClick={() => setCalOpen(false)} sx={{ textTransform: "none", fontSize: "0.75rem", color: "#f5c52b", minWidth: 0, p: 0.5 }}>
              Done
            </Button>
          </Box>
        </Box>
      </Collapse>

      {eventDays.length > 0 && (
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box sx={{ mt: calOpen ? 0.5 : 1 }}>
            {isMultiDay && (
              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 0.75 }}>
                <Button
                  size="small" variant="outlined"
                  onClick={onApplyFirstToAll}
                  disabled={!eventDays[0]?.fromTime || loading}
                  sx={{ textTransform: "none", fontSize: "0.72rem", fontWeight: 500, borderRadius: 1.5, borderColor: "divider", color: "text.primary", px: 1, py: 0.3, "&:hover": { borderColor: "#f5c52b" } }}
                >
                  Copy first time to all
                </Button>
              </Box>
            )}
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
              {eventDays.map((dayObj) => {
                const filled = dayObj.fromTime && dayObj.toTime;
                return (
                  <Box
                    key={dayObj.date}
                    sx={{
                      display: "flex", alignItems: "center", gap: 0.75,
                      px: 1.25, py: 0.75, borderRadius: 1.5, border: "1px solid",
                      borderColor: filled ? "#f5c52b" : "divider",
                      backgroundColor: filled ? (isDark ? "#1e1800" : "#fffbeb") : (isDark ? "#1a1a1a" : "#fafafa"),
                      transition: "all 0.15s",
                    }}
                  >
                    <Box sx={{ px: 0.9, py: 0.25, borderRadius: "20px", backgroundColor: "#f5c52b", color: "#111", fontSize: "0.72rem", fontWeight: 600, flexShrink: 0, whiteSpace: "nowrap" }}>
                      {formatKey(dayObj.date)}
                    </Box>
                    <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", flexShrink: 0 }}>From</Typography>
                    <TimePicker
                      value={dayObj.fromTime} disabled={loading}
                      onChange={(val) => onTimeChange(dayObj.date, "fromTime", val)}
                      slotProps={{ textField: { size: "small", sx: timePickerSx(!!dayObj.fromTime) } }}
                    />
                    <Typography sx={{ fontSize: "0.75rem", color: "text.disabled", flexShrink: 0 }}>—</Typography>
                    <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", flexShrink: 0 }}>To</Typography>
                    <TimePicker
                      value={dayObj.toTime} disabled={loading}
                      onChange={(val) => onTimeChange(dayObj.date, "toTime", val)}
                      slotProps={{ textField: { size: "small", sx: timePickerSx(!!dayObj.toTime) } }}
                    />
                    <Box
                      component="span"
                      onClick={() => !loading && onToggleDay(dayObj.date)}
                      sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: 1, border: "1px solid", borderColor: "divider", fontSize: "0.8rem", color: "text.disabled", cursor: "pointer", flexShrink: 0, transition: "all 0.15s", "&:hover": { borderColor: "#ef4444", color: "#ef4444", backgroundColor: isDark ? "#1f0000" : "#fef2f2" } }}
                    >
                      ×
                    </Box>
                  </Box>
                );
              })}
            </Box>
            {allFilled && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#16a34a", flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.68rem", color: isDark ? "#4ade80" : "#15803d" }}>
                  {eventDays.length === 1
                    ? `${formatKey(eventDays[0].date)} · ${format(eventDays[0].fromTime, "h:mm a")} – ${format(eventDays[0].toTime, "h:mm a")}`
                    : `${eventDays.length} days · all times set`}
                </Typography>
              </Box>
            )}
          </Box>
        </LocalizationProvider>
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────
// Main Dialog
// ─────────────────────────────────────────────
export default function CoverageRequestDialog({
  open,
  handleClose,
  onSuccess,
  defaultDate     = null,
  existingRequest = null,
}) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [eventDays,       setEventDays]       = useState([]);
  const [title,           setTitle]           = useState("");
  const [description,     setDescription]     = useState("");
  const [services,        setServices]        = useState(SERVICES.reduce((acc, svc) => ({ ...acc, [svc]: 0 }), {}));
  const [venue,           setVenue]           = useState("");
  const [clientType,      setClientType]      = useState("");
  const [entity,          setEntity]          = useState("");
  const [otherEntity,     setOtherEntity]     = useState("");
  const [contactPerson,   setContactPerson]   = useState("");
  const [contactInfo,     setContactInfo]     = useState("");
  const [file,            setFile]            = useState(null);
  const [confirmOpen,     setConfirmOpen]     = useState(false);
  const [loading,         setLoading]         = useState(false);
  const [submitError,     setSubmitError]     = useState("");
  const [errors,          setErrors]          = useState(EMPTY_ERRORS);
  const [clientTypes,     setClientTypes]     = useState([]);
  const [entities,        setEntities]        = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  const isOthers   = entity === OTHER_ID;
  const isMultiDay = eventDays.length > 1;

  const selectedDaysSummary = (() => {
    if (eventDays.length === 0) return null;
    if (eventDays.length === 1) return formatKey(eventDays[0].date);
    const sorted = eventDays.map((d) => d.date).sort();
    return `${formatKey(sorted[0])} – ${formatKey(sorted[sorted.length - 1])} (${eventDays.length} days)`;
  })();

  const handleToggleDay = useCallback((key) => {
    setEventDays((prev) => {
      const exists = prev.find((d) => d.date === key);
      if (exists) return prev.filter((d) => d.date !== key);
      if (prev.length >= MAX_DAY_SELECTION) return prev;
      return [...prev, { date: key, fromTime: null, toTime: null }].sort((a, b) => a.date.localeCompare(b.date));
    });
    setErrors((p) => ({ ...p, eventDays: "" }));
  }, []);

  const handleTimeChange = useCallback((key, field, val) => {
    setEventDays((prev) => prev.map((d) => d.date === key ? { ...d, [field]: val } : d));
  }, []);

  const handleApplyFirstToAll = useCallback(() => {
    setEventDays((prev) => {
      if (!prev[0]?.fromTime) return prev;
      const { fromTime: ft, toTime: tt } = prev[0];
      return prev.map((d) => ({ ...d, fromTime: ft, toTime: tt }));
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    async function load() {
      try { setClientTypes((await fetchClientTypes()) || []); }
      catch { setClientTypes([]); }
    }
    load();
    setErrors(EMPTY_ERRORS);
    setSubmitError("");

    if (existingRequest) {
      setTitle(existingRequest.title || "");
      setDescription(existingRequest.description || "");
      if (existingRequest.event_days?.length > 0) {
        setEventDays(existingRequest.event_days.map((d) => ({
          date:     d.date,
          fromTime: d.from_time ? new Date(`1970-01-01T${d.from_time}`) : null,
          toTime:   d.to_time   ? new Date(`1970-01-01T${d.to_time}`)   : null,
        })));
      } else if (existingRequest.event_date) {
        setEventDays([{
          date:     existingRequest.event_date,
          fromTime: existingRequest.from_time ? new Date(`1970-01-01T${existingRequest.from_time}`) : null,
          toTime:   existingRequest.to_time   ? new Date(`1970-01-01T${existingRequest.to_time}`)   : null,
        }]);
      } else {
        setEventDays([]);
      }
      const existingDays       = existingRequest.event_days?.length || 1;
      const isExistingMultiDay = !!(existingRequest.is_multiday && existingRequest.event_days?.length > 1);
      const rawServices        = existingRequest.services || SERVICES.reduce((acc, svc) => ({ ...acc, [svc]: 0 }), {});
      setServices(
        isExistingMultiDay
          ? Object.fromEntries(Object.entries(rawServices).map(([k, v]) => [k, Math.round(v / existingDays)]))
          : rawServices
      );
      setVenue(existingRequest.venue || "");
      setClientType(existingRequest.client_type?.id || existingRequest.client_type_id || "");
      setEntity(existingRequest.entity?.id || existingRequest.entity_id || "");
      setOtherEntity("");
      setContactPerson(existingRequest.contact_person || "");
      setContactInfo(existingRequest.contact_info || "");
      setFile(null);
    } else {
      resetForm();
      if (defaultDate) {
        const d   = new Date(defaultDate);
        const key = dateKey(d.getFullYear(), d.getMonth(), d.getDate());
        setEventDays([{ date: key, fromTime: null, toTime: null }]);
      }
    }
  }, [open, existingRequest]);

  useEffect(() => {
    if (!clientType) { setEntities([]); setEntity(""); setOtherEntity(""); return; }
    async function load() {
      setEntitiesLoading(true);
      try { setEntities((await fetchEntitiesByType(clientType)) || []); }
      catch { setEntities([]); }
      finally { setEntitiesLoading(false); }
      setEntity(""); setOtherEntity("");
    }
    load();
  }, [clientType]);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (f && f.type !== "application/pdf") { alert("Only PDF files are allowed."); e.target.value = null; return; }
    setFile(f);
    if (f) setErrors((p) => ({ ...p, file: "" }));
  };

  const resetForm = () => {
    setEventDays([]);
    setTitle(""); setDescription("");
    setServices(SERVICES.reduce((acc, svc) => ({ ...acc, [svc]: 0 }), {}));
    setVenue(""); setClientType(""); setEntity(""); setOtherEntity("");
    setContactPerson(""); setContactInfo(""); setFile(null);
    setErrors(EMPTY_ERRORS); setSubmitError("");
  };

  const validate = () => {
    const newErrors     = { ...EMPTY_ERRORS };
    let   hasError      = false;
    const totalServices = Object.values(services).reduce((s, v) => s + v, 0);

    if (!title)                  { newErrors.title = "Event title is required.";                              hasError = true; }
    if (!description)            { newErrors.description = "Description is required.";                        hasError = true; }
    if (eventDays.length === 0)  {
      newErrors.eventDays = "Please select at least one date.";                                               hasError = true;
    } else if (eventDays.some((d) => !d.fromTime || !d.toTime)) {
      newErrors.eventDays = "Please set From and To times for all selected days.";                            hasError = true;
    }
    if (!venue)                  { newErrors.venue = "Venue is required.";                                    hasError = true; }
    if (totalServices === 0)     { newErrors.services = "Please select at least one service.";                hasError = true; }
    if (!clientType)             { newErrors.clientType = "Client type is required.";                         hasError = true; }
    if (!entity)                 { newErrors.entity = "Entity name is required.";                             hasError = true; }
    if (isOthers && !otherEntity.trim()) { newErrors.otherEntity = "Please specify the entity name.";        hasError = true; }
    if (!contactPerson)          { newErrors.contactPerson = "Contact person is required.";                   hasError = true; }
    if (!contactInfo)            { newErrors.contactInfo = "Contact information is required.";                hasError = true; }
    if (!file && !existingRequest?.file_url) { newErrors.file = "Please upload the program flow (PDF).";     hasError = true; }
    setErrors(newErrors);
    return !hasError;
  };

  const submitForm = async (isDraft = false) => {
    setSubmitError("");
    if (!isDraft && !validate()) return;
    if (isDraft && !title) {
      setErrors((p) => ({ ...p, title: "Please enter at least an event title to save as draft." }));
      return;
    }
    setLoading(true);
    try {
      const sorted    = [...eventDays].sort((a, b) => a.date.localeCompare(b.date));
      const hasAnyDay = sorted.length > 0;
      const isMD      = sorted.length > 1;

      const eventDaysPayload = hasAnyDay
        ? sorted.map((d) => ({
            date:      d.date,
            from_time: d.fromTime ? format(d.fromTime, "HH:mm:ss") : null,
            to_time:   d.toTime   ? format(d.toTime,   "HH:mm:ss") : null,
          }))
        : null;

      // For multi-day: multiply per-day pax by number of days for true total
      const savedServices = isMD
        ? Object.fromEntries(Object.entries(services).map(([k, v]) => [k, v * sorted.length]))
        : services;

      const requestData = {
        title,
        description,
        is_multiday:    isMD,
        date:           hasAnyDay ? parseISO(sorted[0].date) : null,
        from_time:      hasAnyDay ? sorted[0].fromTime       : null,
        to_time:        hasAnyDay ? sorted[0].toTime         : null,
        event_days:     isMD ? eventDaysPayload : null,
        services:       savedServices,
        venue,
        client_type:    clientType,
        entity:         isOthers ? null : entity,
        other_entity:   isOthers ? otherEntity.trim() : null,
        contact_person: contactPerson,
        contact_info:   contactInfo,
      };

      if (existingRequest) {
        await updateDraftRequest(existingRequest.id, requestData, file, !isDraft);
      } else {
        await submitCoverageRequest(requestData, file, isDraft);
      }

      resetForm();
      setConfirmOpen(false);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fieldSx = {
    "& .MuiInputBase-input": { fontSize: "0.85rem" },
    "& .MuiInputLabel-root": { fontSize: "0.85rem" },
    "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
  };
  const errorFieldSx = (hasErr) => ({
    ...fieldSx,
    "& .MuiOutlinedInput-root": {
      borderRadius: 1.5,
      ...(hasErr && { "& fieldset": { borderColor: "#ef4444" }, "&:hover fieldset": { borderColor: "#ef4444" }, "&.Mui-focused fieldset": { borderColor: "#ef4444" } }),
    },
    ...(hasErr && { "& .MuiInputLabel-root": { color: "#ef4444" }, "& .MuiInputLabel-root.Mui-focused": { color: "#ef4444" } }),
  });
  const helperSx = { fontSize: "0.72rem", color: "#ef4444", mt: 0.25, ml: 0.5 };

  return (
    <>
      <Dialog fullWidth open={open} onClose={handleClose}
        PaperProps={{ sx: { borderRadius: 2, width: 600, height: "90vh", maxHeight: "90vh", display: "flex", flexDirection: "column", backgroundColor: "background.paper", boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.08)" } }}
      >
        {/* Header */}
        <Box sx={{ px: 3, py: 2, flexShrink: 0, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 3, height: 26, borderRadius: 1, backgroundColor: "#f5c52b", flexShrink: 0 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary" }}>
            {existingRequest ? "Edit Draft" : "Coverage Request Form"}
          </Typography>
        </Box>

        {/* Scrollable body */}
        <DialogContent sx={{
          px: 3, py: 2.5, overflowY: "auto", flex: 1,
          "&::-webkit-scrollbar": { width: 6 },
          "&::-webkit-scrollbar-track": { background: "transparent" },
          "&::-webkit-scrollbar-thumb": { background: isDark ? "#333" : "#ddd", borderRadius: 3 },
          "&::-webkit-scrollbar-thumb:hover": { background: "#f5c52b" },
        }}>

          {/* EVENT DETAILS */}
          <FormSection label="Event Details">
            <TextField
              label="Event Title" fullWidth margin="dense" value={title} required disabled={loading}
              onChange={(e) => { setTitle(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, title: "" })); }}
              error={!!errors.title} helperText={errors.title} sx={errorFieldSx(!!errors.title)} FormHelperTextProps={{ sx: helperSx }}
            />
            <TextField
              label="Description" fullWidth multiline rows={3} margin="dense" value={description} required disabled={loading}
              onChange={(e) => { setDescription(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, description: "" })); }}
              error={!!errors.description} helperText={errors.description} sx={errorFieldSx(!!errors.description)} FormHelperTextProps={{ sx: helperSx }}
            />
            <Box sx={{ mt: 1.5 }}>
              <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 0.75 }}>
                Event date(s) <span style={{ color: "#ef4444" }}>*</span>
              </Typography>
              <DateChipInput
                eventDays={eventDays} onToggleDay={handleToggleDay}
                onTimeChange={handleTimeChange} onApplyFirstToAll={handleApplyFirstToAll}
                isDark={isDark} error={errors.eventDays} loading={loading}
              />
            </Box>
            <TextField
              label="Venue" fullWidth margin="dense" value={venue} required disabled={loading}
              onChange={(e) => { setVenue(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, venue: "" })); }}
              error={!!errors.venue} helperText={errors.venue} sx={{ ...errorFieldSx(!!errors.venue), mt: 1.5 }} FormHelperTextProps={{ sx: helperSx }}
            />
          </FormSection>

          {/* SERVICES */}
          <FormSection label="Services Needed">
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 1.5 }}>
              Select services and specify the number of staff required for each.{" "}
              <Box component="span" sx={{ color: "text.disabled" }}>Max {MAX_PAX} per service{isMultiDay ? " per day" : ""}.</Box>
            </Typography>

            {isMultiDay && eventDays.length > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", px: 1.25, py: 0.85, borderRadius: 1.5, backgroundColor: isDark ? "rgba(245,197,43,0.06)" : "rgba(245,197,43,0.07)", border: "1px solid rgba(245,197,43,0.3)", mb: 1.5 }}>
                <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
                  {eventDays.map((d) => (
                    <Box key={d.date} sx={{ px: 0.9, py: 0.2, borderRadius: "20px", backgroundColor: "#F5C52B", fontSize: "0.68rem", fontWeight: 700, color: "#353535" }}>
                      {format(parseISO(d.date), "MMM d")}
                    </Box>
                  ))}
                </Box>
                <Typography sx={{ fontSize: "0.75rem", color: "#b45309" }}>
                  — how many staff do you need <Box component="span" sx={{ fontWeight: 600 }}>each day?</Box>
                </Typography>
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {SERVICES.map((service) => {
                const isChecked  = services[service] > 0;
                const totalSlots = isMultiDay ? services[service] * eventDays.length : services[service];
                return (
                  <Box key={service}>
                    <Box
                      onClick={() => {
                        if (loading) return;
                        setServices((prev) => {
                          const updated = { ...prev, [service]: prev[service] > 0 ? 0 : 1 };
                          if (Object.values(updated).reduce((s, v) => s + v, 0) > 0) setErrors((p) => ({ ...p, services: "" }));
                          return updated;
                        });
                      }}
                      sx={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        px: 1.5, py: 1, borderRadius: 1.5, border: "1px solid",
                        borderColor: isChecked ? "#f5c52b" : errors.services ? "#ef4444" : "divider",
                        backgroundColor: isChecked ? (isDark ? "#1e1800" : "#fffbeb") : (isDark ? "#1a1a1a" : "#fafafa"),
                        cursor: loading ? "default" : "pointer",
                        transition: "border-color 0.15s, background-color 0.15s",
                        "&:hover": !loading ? { borderColor: "#f5c52b" } : {},
                      }}
                    >
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <Box sx={{ width: 14, height: 14, borderRadius: "3px", border: "1.5px solid", borderColor: isChecked ? "#f5c52b" : "divider", backgroundColor: isChecked ? "#f5c52b" : "transparent", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {isChecked && <Box sx={{ width: 8, height: 8, borderRadius: "1px", backgroundColor: "#111827" }} />}
                        </Box>
                        <Typography sx={{ fontSize: "0.83rem", color: isChecked ? "text.primary" : "text.secondary" }}>{service}</Typography>
                      </Box>
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0.25 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                          {isMultiDay && isChecked && (
                            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>per day</Typography>
                          )}
                          <TextField
                            type="number" size="small"
                            value={services[service]}
                            onChange={(e) => {
                              e.stopPropagation();
                              // ── Enforce 0–MAX_PAX (3) for both single and multi-day ──
                              const val = Math.min(MAX_PAX, Math.max(0, Number(e.target.value)));
                              setServices((prev) => {
                                const updated = { ...prev, [service]: val };
                                if (Object.values(updated).reduce((s, v) => s + v, 0) > 0) setErrors((p) => ({ ...p, services: "" }));
                                return updated;
                              });
                            }}
                            onClick={(e) => e.stopPropagation()}
                            inputProps={{ min: 0, max: MAX_PAX }}
                            disabled={!isChecked || loading}
                            sx={{ width: 80, "& .MuiInputBase-input": { fontSize: "0.82rem", textAlign: "center", py: 0.6 }, "& .MuiOutlinedInput-root": { borderRadius: 1 } }}
                          />
                        </Box>
                        {isMultiDay && isChecked && totalSlots > 0 && (
                          <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", pr: 0.25 }}>
                            {totalSlots} total across {eventDays.length} days
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {isMultiDay && Object.values(services).reduce((s, v) => s + v, 0) > 0 && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, mt: 1 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#16a34a", flexShrink: 0 }} />
                <Typography sx={{ fontSize: "0.71rem", color: "#15803d" }}>
                  {Object.values(services).reduce((s, v) => s + v, 0) * eventDays.length} total staff slots across {eventDays.length} days
                </Typography>
              </Box>
            )}

            {errors.services && <Typography sx={{ ...helperSx, mt: 0.75 }}>{errors.services}</Typography>}
          </FormSection>

          {/* CLIENT INFORMATION */}
          <FormSection label="Client Information">
            <TextField
              label="Contact Person" fullWidth margin="dense" value={contactPerson} required disabled={loading}
              onChange={(e) => { setContactPerson(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, contactPerson: "" })); }}
              error={!!errors.contactPerson} helperText={errors.contactPerson} sx={errorFieldSx(!!errors.contactPerson)} FormHelperTextProps={{ sx: helperSx }}
            />
            <TextField
              label="Contact Info (phone / messenger / email)" fullWidth margin="dense" value={contactInfo} required disabled={loading}
              onChange={(e) => { setContactInfo(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, contactInfo: "" })); }}
              error={!!errors.contactInfo} helperText={errors.contactInfo} sx={errorFieldSx(!!errors.contactInfo)} FormHelperTextProps={{ sx: helperSx }}
            />
            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <FormControl fullWidth margin="dense" required error={!!errors.clientType} sx={fieldSx}>
                <InputLabel sx={{ fontSize: "0.85rem", ...(errors.clientType && { color: "#ef4444" }) }}>Client Type</InputLabel>
                <Select
                  label="Client Type" value={clientType} disabled={loading}
                  onChange={(e) => { setClientType(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, clientType: "" })); }}
                  sx={{ borderRadius: 1.5, fontSize: "0.85rem", ...(errors.clientType && { "& fieldset": { borderColor: "#ef4444" } }) }}
                >
                  {clientTypes.map((type) => <MenuItem key={type.id} value={type.id} sx={{ fontSize: "0.85rem" }}>{type.name}</MenuItem>)}
                </Select>
                {errors.clientType && <FormHelperText sx={helperSx}>{errors.clientType}</FormHelperText>}
              </FormControl>
              <FormControl fullWidth margin="dense" required error={!!errors.entity} disabled={!clientType || entitiesLoading || loading} sx={fieldSx}>
                <InputLabel sx={{ fontSize: "0.85rem", ...(errors.entity && { color: "#ef4444" }) }}>
                  {entitiesLoading ? "Loading…" : "Entity Name"}
                </InputLabel>
                <Select
                  label={entitiesLoading ? "Loading…" : "Entity Name"} value={entity}
                  onChange={(e) => { setEntity(e.target.value); setOtherEntity(""); if (e.target.value) setErrors((p) => ({ ...p, entity: "", otherEntity: "" })); }}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 240, overflowY: "auto" } }, MenuListProps: { style: { maxHeight: 240, overflow: "auto" } }, getContentAnchorEl: null, anchorOrigin: { vertical: "bottom", horizontal: "left" }, transformOrigin: { vertical: "top", horizontal: "left" }, disablePortal: false }}
                  sx={{ borderRadius: 1.5, fontSize: "0.85rem", ...(errors.entity && { "& fieldset": { borderColor: "#ef4444" } }) }}
                >
                  {entities.map((ent) => <MenuItem key={ent.id} value={ent.id} sx={{ fontSize: "0.85rem" }}>{ent.name}</MenuItem>)}
                  <MenuItem value={OTHER_ID} sx={{ fontSize: "0.85rem", fontStyle: "italic", borderTop: "1px solid", borderColor: "divider", color: "text.secondary" }}>
                    Others (specify below)
                  </MenuItem>
                </Select>
                {errors.entity && <FormHelperText sx={helperSx}>{errors.entity}</FormHelperText>}
              </FormControl>
            </Box>
            {isOthers && (
              <TextField
                label="Specify Entity Name" fullWidth margin="dense" value={otherEntity} required disabled={loading}
                onChange={(e) => { setOtherEntity(e.target.value); if (e.target.value) setErrors((p) => ({ ...p, otherEntity: "" })); }}
                placeholder="e.g. Office of the President, Engineering Department..."
                error={!!errors.otherEntity} helperText={errors.otherEntity} sx={errorFieldSx(!!errors.otherEntity)} FormHelperTextProps={{ sx: helperSx }}
              />
            )}
          </FormSection>

          {/* ATTACHMENT */}
          <FormSection label="Attachment">
            <Button
              variant="outlined" component="label" disabled={loading} size="small"
              sx={{ textTransform: "none", fontSize: "0.82rem", borderRadius: 1.5, borderColor: errors.file ? "#ef4444" : "divider", color: errors.file ? "#ef4444" : "text.secondary", "&:hover": { borderColor: "#f5c52b", color: "text.primary" } }}
            >
              {existingRequest ? "Replace Program Flow (PDF)" : "Upload Program Flow (PDF)"}
              <input type="file" hidden onChange={handleFileChange} accept="application/pdf" />
            </Button>
            {errors.file && <Typography sx={{ ...helperSx, mt: 0.5 }}>{errors.file}</Typography>}
            {file ? (
              <Typography sx={{ mt: 1, fontSize: "0.8rem", color: "#15803d" }}>✓ {file.name}</Typography>
            ) : existingRequest?.file_url ? (
              <Typography sx={{ mt: 1, fontSize: "0.8rem", color: "text.secondary" }}>
                Current: {existingRequest.file_url.split("/").pop().replace(/^\d+_/, "")}
              </Typography>
            ) : null}
          </FormSection>
        </DialogContent>

        {/* Footer */}
        <Box sx={{ px: 3, py: 1.75, flexShrink: 0, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "#161616" : "#fafafa" }}>
          <Button onClick={handleClose} disabled={loading} size="small" sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}>Cancel</Button>
          <Button
            variant="contained" size="small" disabled={loading}
            onClick={() => { if (!validate()) return; setErrors(EMPTY_ERRORS); setConfirmOpen(true); }}
            sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}
          >
            Submit
          </Button>
        </Box>
      </Dialog>

      {/* Confirm Dialog */}
      <Dialog
        open={confirmOpen} onClose={() => !loading && setConfirmOpen(false)} fullWidth maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 2, backgroundColor: "background.paper", boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.08)" } }}
      >
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 3, height: 22, borderRadius: 1, backgroundColor: "#f5c52b", flexShrink: 0 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>Confirm Submission</Typography>
        </Box>
        <DialogContent sx={{ pt: 2 }}>
          {selectedDaysSummary && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 1.5, p: 1.25, borderRadius: 1.5, backgroundColor: isDark ? "#0d1f0d" : "#f0fdf4", border: "1px solid", borderColor: isDark ? "#166534" : "#86efac" }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#16a34a", flexShrink: 0 }} />
              <Typography sx={{ fontSize: "0.78rem", color: isDark ? "#4ade80" : "#15803d", fontWeight: 500 }}>
                {selectedDaysSummary}{isMultiDay ? ` — ${eventDays.length} coverage slots` : ""}
              </Typography>
            </Box>
          )}
          <Typography sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.6 }}>
            Do you want to submit this request now, or save it as a draft?
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1.25, p: 1.25, borderRadius: 1.5, backgroundColor: isDark ? "#1a1a1a" : "#f9fafb", border: "1px solid", borderColor: "divider" }}>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.5 }}>Once submitted, the request can no longer be edited.</Typography>
          </Box>
          {submitError && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5, fontSize: "0.82rem" }}>{submitError}</Alert>}
          {loading && <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}><CircularProgress size={20} sx={{ color: "#f5c52b" }} /></Box>}
        </DialogContent>
        <Box sx={{ px: 3, py: 1.75, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "#161616" : "#fafafa" }}>
          <Button onClick={() => submitForm(true)} disabled={loading} size="small" sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}>Save as Draft</Button>
          <Button
            variant="contained" onClick={() => submitForm(false)} disabled={loading} size="small"
            sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}
          >
            Submit Now
          </Button>
        </Box>
      </Dialog>
    </>
  );
}

function FormSection({ label, children }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1, pb: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}