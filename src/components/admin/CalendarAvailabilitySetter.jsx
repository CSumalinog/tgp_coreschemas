// src/components/admin/CalendarAvailabilitySetter.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogActions,
  TextField,
  Box,
  Typography,
  IconButton,
  Divider,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import EventBusyOutlinedIcon from "@mui/icons-material/EventBusyOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import dayjs from "dayjs";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_16 = "rgba(245,197,43,0.16)";
const CHARCOAL = "#353535";
const dm = "'Inter', sans-serif";

const MODE = { VIEW: "view", EDIT: "edit", CREATE: "create" };

export default function CalendarEventDialog({
  open,
  handleClose,
  handleSave,
  handleDelete,
  defaultDate,
  existingEvent,
  existingEvents = [],
  initialEventType = "single",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.08)";
  const paperBg = isDark ? "#1e1e1e" : "#ffffff";
  const subtleBg = isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)";

  const titleRef = useRef(null);

  const [mode, setMode] = useState(MODE.CREATE);
  const [eventType, setEventType] = useState("single");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);
  const [error, setError] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const base = defaultDate ? dayjs(defaultDate) : dayjs();
    if (existingEvent) {
      setMode(MODE.VIEW);
      setTitle(existingEvent.title || "");
      setNotes(existingEvent.notes || "");
      setEventType(existingEvent.eventType || "single");
      setStart(dayjs(existingEvent.startDate));
      setEnd(dayjs(existingEvent.endDate));
    } else {
      setMode(MODE.CREATE);
      setTitle("");
      setNotes("");
      setEventType(initialEventType);
      if (initialEventType === "single") {
        setStart(base);
        setEnd(base.add(1, "hour"));
      } else {
        setStart(base.startOf("day"));
        setEnd(base.endOf("day"));
      }
    }
    setError("");
  }, [open, existingEvent, defaultDate, initialEventType]);

  const isEditable = mode !== MODE.VIEW;

  // ── Logic ─────────────────────────────────────────────────────────────────
  const hasConflict = (newStart, newEnd) =>
    existingEvents.some((ev) => {
      if (existingEvent && ev.id === existingEvent.id) return false;
      const s = dayjs(ev.startDate),
        e = dayjs(ev.endDate);
      return newStart.isBefore(e) && newEnd.isAfter(s);
    });

  const validate = () => {
    if (!title.trim()) {
      setError("Title is required.");
      return false;
    }
    if (!start || !end) {
      setError("Start and end are required.");
      return false;
    }
    if (end.isBefore(start)) {
      setError("End must be after start.");
      return false;
    }
    if (hasConflict(start, end)) {
      setError("Conflicts with an existing block.");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    let finalStart = start,
      finalEnd = end;
    if (eventType === "multi") {
      finalStart = start.startOf("day");
      finalEnd = end.endOf("day");
    }
    handleSave({
      id: existingEvent?.id || Date.now(),
      title,
      notes,
      eventType,
      startDate: finalStart.toDate(),
      endDate: finalEnd.toDate(),
    });
  };

  const confirmDelete = () => {
    handleDelete?.(existingEvent?.id);
    setConfirmDeleteOpen(false);
    handleClose();
  };

  // ── Shared input sx ───────────────────────────────────────────────────────
  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "8px",
      fontSize: "0.85rem",
      fontFamily: dm,
      backgroundColor: isEditable ? subtleBg : "transparent",
      "& fieldset": { borderColor: border },
      "&:hover fieldset": { borderColor: isEditable ? GOLD : border },
      "&.Mui-focused fieldset": { borderColor: GOLD, borderWidth: "1px" },
      "&.Mui-disabled": { backgroundColor: "transparent" },
    },
    "& .MuiInputLabel-root": {
      fontSize: "0.82rem",
      fontFamily: dm,
      color: "text.secondary",
    },
    "& .MuiInputLabel-root.Mui-focused": { color: GOLD },
    "& .MuiInputBase-input.Mui-disabled": {
      WebkitTextFillColor: isDark
        ? "rgba(255,255,255,0.3)"
        : "rgba(53,53,53,0.35)",
    },
  };

  // ── Field label ───────────────────────────────────────────────────────────
  const FieldLabel = ({ children, optional }) => (
    <Typography
      sx={{
        fontFamily: dm,
        fontSize: "0.68rem",
        fontWeight: 700,
        color: "text.disabled",
        textTransform: "uppercase",
        letterSpacing: "0.09em",
        mb: 0.75,
      }}
    >
      {children}
      {optional && (
        <Typography
          component="span"
          sx={{
            fontFamily: dm,
            fontSize: "0.66rem",
            fontWeight: 400,
            color: "text.disabled",
            textTransform: "none",
            letterSpacing: 0,
            ml: 0.5,
          }}
        >
          (optional)
        </Typography>
      )}
    </Typography>
  );

  // ── Mode pill ─────────────────────────────────────────────────────────────
  const modePill = {
    [MODE.VIEW]: { label: "Viewing", dotColor: "#16a34a" },
    [MODE.EDIT]: { label: "Editing", dotColor: GOLD },
    [MODE.CREATE]: { label: "New Block", dotColor: "#2563eb" },
  }[mode];

  // ── Block type options ────────────────────────────────────────────────────
  const typeOptions = [
    {
      value: "single",
      label: "Single Day",
      sub: "Block specific hours",
      Icon: AccessTimeOutlinedIcon,
    },
    {
      value: "multi",
      label: "Multi Day",
      sub: "Block full day range",
      Icon: CalendarMonthOutlinedIcon,
    },
  ];

  return (
    <>
      {/* ══════════════════════════════════════════════════════════
          MAIN DIALOG
      ══════════════════════════════════════════════════════════ */}
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        PaperProps={{
          sx: {
            width: 460,
            borderRadius: "12px",
            backgroundColor: paperBg,
            backgroundImage: "none",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 20px 60px rgba(0,0,0,0.5)"
              : "0 8px 40px rgba(53,53,53,0.12)",
            overflow: "hidden",
          },
        }}
      >
        {/* ── Header ── */}
        <Box
          sx={{
            px: 2.5,
            pt: 2.25,
            pb: 2,
            borderBottom: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(53,53,53,0.02)",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}>
            {/* Icon badge */}
            <Box
              sx={{
                mt: 0.15,
                width: 34,
                height: 34,
                borderRadius: "9px",
                backgroundColor: existingEvent
                  ? isDark
                    ? "rgba(220,38,38,0.1)"
                    : "rgba(220,38,38,0.06)"
                  : GOLD_08,
                border: `1px solid ${
                  existingEvent
                    ? isDark
                      ? "rgba(220,38,38,0.2)"
                      : "rgba(220,38,38,0.15)"
                    : GOLD_16
                }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {existingEvent ? (
                <EventBusyOutlinedIcon
                  sx={{ fontSize: 16, color: isDark ? "#f87171" : "#dc2626" }}
                />
              ) : (
                <BlockOutlinedIcon sx={{ fontSize: 16, color: GOLD }} />
              )}
            </Box>

            <Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  color: "text.primary",
                  lineHeight: 1.25,
                }}
              >
                {existingEvent
                  ? existingEvent.title || "Blocked Date"
                  : "Block a Date"}
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.7rem",
                  color: "text.secondary",
                  mt: 0.25,
                  lineHeight: 1.4,
                }}
              >
                {mode === MODE.VIEW && "View-only — click edit to make changes"}
                {mode === MODE.EDIT &&
                  "Editing this block — clients will see changes"}
                {mode === MODE.CREATE &&
                  "Clients won't be able to request on blocked dates"}
              </Typography>
            </Box>
          </Box>

          {/* Action icons */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              ml: 1,
              flexShrink: 0,
            }}
          >
            {existingEvent && mode === MODE.VIEW && (
              <IconButton
                size="small"
                onClick={() => setMode(MODE.EDIT)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "7px",
                  color: "text.secondary",
                  "&:hover": { backgroundColor: GOLD_08, color: CHARCOAL },
                }}
              >
                <EditOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
            {existingEvent && (
              <IconButton
                size="small"
                onClick={() => setConfirmDeleteOpen(true)}
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: "7px",
                  color: "text.secondary",
                  "&:hover": {
                    backgroundColor: isDark ? "rgba(220,38,38,0.1)" : "#fef2f2",
                    color: "#dc2626",
                  },
                }}
              >
                <DeleteOutlinedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            )}
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{
                width: 28,
                height: 28,
                borderRadius: "7px",
                color: "text.secondary",
                "&:hover": {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(53,53,53,0.06)",
                },
              }}
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
        </Box>

        {/* ── Body ── */}
        <DialogContent
          sx={{
            px: 2.5,
            py: 2.25,
            display: "flex",
            flexDirection: "column",
            gap: 0,
          }}
        >
          {/* Mode pill */}
          <Box sx={{ mb: 2 }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.1,
                py: 0.35,
                borderRadius: "20px",
                border: `1px solid ${border}`,
                backgroundColor: subtleBg,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: modePill.dotColor,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "text.secondary",
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                }}
              >
                {modePill.label}
              </Typography>
            </Box>
          </Box>

          {/* Title */}
          <Box sx={{ mb: 2 }}>
            <FieldLabel>Title / Reason</FieldLabel>
            <TextField
              inputRef={titleRef}
              fullWidth
              size="small"
              value={title}
              disabled={!isEditable}
              onChange={(e) => {
                setTitle(e.target.value);
                setError("");
              }}
              placeholder="e.g. Office Closed, Holiday, Maintenance"
              sx={inputSx}
            />
          </Box>

          {/* Block type */}
          <Box sx={{ mb: 2 }}>
            <FieldLabel>Block Type</FieldLabel>
            <Box sx={{ display: "flex", gap: 1 }}>
              {typeOptions.map(({ value, label, sub, Icon }) => {
                const selected = eventType === value;
                return (
                  <Box
                    key={value}
                    onClick={() => isEditable && setEventType(value)}
                    sx={{
                      flex: 1,
                      px: 1.5,
                      py: 1.25,
                      borderRadius: "8px",
                      border: `1px solid ${selected ? GOLD : border}`,
                      backgroundColor: selected ? GOLD_08 : subtleBg,
                      cursor: isEditable ? "pointer" : "default",
                      transition: "all 0.15s",
                      ...(isEditable &&
                        !selected && {
                          "&:hover": {
                            borderColor: GOLD,
                            backgroundColor: GOLD_08,
                          },
                        }),
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 0.6,
                        mb: 0.2,
                      }}
                    >
                      <Icon
                        sx={{
                          fontSize: 13,
                          color: selected ? GOLD : "text.disabled",
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.8rem",
                          fontWeight: selected ? 700 : 500,
                          color: selected ? CHARCOAL : "text.primary",
                        }}
                      >
                        {label}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.67rem",
                        color: "text.secondary",
                        lineHeight: 1.3,
                      }}
                    >
                      {sub}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Date / time range */}
          <Box sx={{ mb: 2 }}>
            <FieldLabel>
              {eventType === "single" ? "Time Range" : "Date Range"}
            </FieldLabel>
            <Box sx={{ display: "flex", gap: 1.25 }}>
              {eventType === "single" ? (
                <>
                  <TextField
                    label="Start"
                    type="datetime-local"
                    size="small"
                    fullWidth
                    disabled={!isEditable}
                    value={start ? start.format("YYYY-MM-DDTHH:mm") : ""}
                    onChange={(e) => setStart(dayjs(e.target.value))}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                  <TextField
                    label="End"
                    type="datetime-local"
                    size="small"
                    fullWidth
                    disabled={!isEditable}
                    value={end ? end.format("YYYY-MM-DDTHH:mm") : ""}
                    onChange={(e) => setEnd(dayjs(e.target.value))}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="From"
                    type="date"
                    size="small"
                    fullWidth
                    disabled={!isEditable}
                    value={start ? start.format("YYYY-MM-DD") : ""}
                    onChange={(e) =>
                      setStart(dayjs(e.target.value).startOf("day"))
                    }
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                  <TextField
                    label="To"
                    type="date"
                    size="small"
                    fullWidth
                    disabled={!isEditable}
                    value={end ? end.format("YYYY-MM-DD") : ""}
                    onChange={(e) => setEnd(dayjs(e.target.value).endOf("day"))}
                    InputLabelProps={{ shrink: true }}
                    sx={inputSx}
                  />
                </>
              )}
            </Box>
          </Box>

          {/* Notes */}
          <Box sx={{ mb: error ? 2 : 0 }}>
            <FieldLabel optional>Notes</FieldLabel>
            <TextField
              fullWidth
              multiline
              rows={2}
              size="small"
              value={notes}
              disabled={!isEditable}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes — not visible to clients..."
              sx={inputSx}
            />
          </Box>

          {/* Error */}
          {error && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                px: 1.5,
                py: 1,
                borderRadius: "8px",
                backgroundColor: isDark ? "rgba(220,38,38,0.08)" : "#fef2f2",
                border: `1px solid ${isDark ? "rgba(220,38,38,0.2)" : "rgba(220,38,38,0.2)"}`,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: "#dc2626",
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.76rem",
                  color: isDark ? "#f87171" : "#dc2626",
                }}
              >
                {error}
              </Typography>
            </Box>
          )}
        </DialogContent>

        {/* ── Footer ── */}
        {isEditable && (
          <>
            <Divider sx={{ borderColor: border }} />
            <DialogActions sx={{ px: 2.5, py: 1.75, gap: 1 }}>
              {/* Cancel */}
              <Box
                onClick={handleClose}
                sx={{
                  px: 2,
                  py: 0.65,
                  borderRadius: "8px",
                  border: `1px solid ${border}`,
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 500,
                  color: "text.secondary",
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "all 0.15s",
                  "&:hover": {
                    borderColor: GOLD,
                    backgroundColor: GOLD_08,
                    color: CHARCOAL,
                  },
                }}
              >
                Cancel
              </Box>

              {/* Save / Block */}
              <Box
                onClick={handleSubmit}
                sx={{
                  px: 2.5,
                  py: 0.65,
                  borderRadius: "8px",
                  backgroundColor: GOLD,
                  color: CHARCOAL,
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  userSelect: "none",
                  transition: "background-color 0.15s",
                  "&:hover": { backgroundColor: "#e6b920" },
                }}
              >
                {existingEvent ? "Save Changes" : "Block Date"}
              </Box>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* ══════════════════════════════════════════════════════════
          DELETE CONFIRM DIALOG
      ══════════════════════════════════════════════════════════ */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
        PaperProps={{
          sx: {
            width: 380,
            borderRadius: "12px",
            backgroundColor: paperBg,
            backgroundImage: "none",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 20px 60px rgba(0,0,0,0.5)"
              : "0 8px 40px rgba(53,53,53,0.12)",
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            px: 2.5,
            pt: 2.25,
            pb: 2,
            borderBottom: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(220,38,38,0.04)"
              : "rgba(220,38,38,0.02)",
            display: "flex",
            alignItems: "center",
            gap: 1.25,
          }}
        >
          <Box
            sx={{
              width: 32,
              height: 32,
              borderRadius: "8px",
              flexShrink: 0,
              backgroundColor: isDark
                ? "rgba(220,38,38,0.1)"
                : "rgba(220,38,38,0.06)",
              border: `1px solid ${isDark ? "rgba(220,38,38,0.2)" : "rgba(220,38,38,0.15)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DeleteOutlinedIcon
              sx={{ fontSize: 15, color: isDark ? "#f87171" : "#dc2626" }}
            />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
                lineHeight: 1.2,
              }}
            >
              Remove Block
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                color: "text.secondary",
                mt: 0.2,
              }}
            >
              This action cannot be undone
            </Typography>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.83rem",
              color: "text.secondary",
              lineHeight: 1.65,
            }}
          >
            Remove{" "}
            <Typography
              component="span"
              sx={{ fontFamily: dm, fontWeight: 700, color: "text.primary" }}
            >
              "{existingEvent?.title}"
            </Typography>
            ? Clients will immediately be able to book this date again.
          </Typography>
        </Box>

        <Divider sx={{ borderColor: border }} />

        {/* Actions */}
        <Box
          sx={{
            px: 2.5,
            py: 1.75,
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
          }}
        >
          <Box
            onClick={() => setConfirmDeleteOpen(false)}
            sx={{
              px: 2,
              py: 0.65,
              borderRadius: "8px",
              border: `1px solid ${border}`,
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "text.secondary",
              cursor: "pointer",
              userSelect: "none",
              transition: "all 0.15s",
              "&:hover": {
                borderColor: GOLD,
                backgroundColor: GOLD_08,
                color: CHARCOAL,
              },
            }}
          >
            Cancel
          </Box>
          <Box
            onClick={confirmDelete}
            sx={{
              px: 2,
              py: 0.65,
              borderRadius: "8px",
              backgroundColor: "#dc2626",
              color: "#fff",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              userSelect: "none",
              transition: "background-color 0.15s",
              "&:hover": { backgroundColor: "#b91c1c" },
            }}
          >
            Remove Block
          </Box>
        </Box>
      </Dialog>
    </>
  );
}
