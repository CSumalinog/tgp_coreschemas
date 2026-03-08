// src/components/admin/CalendarAvailabilitySetter.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog, DialogContent, DialogActions,
  TextField, Button, Box, Typography, IconButton,
  Divider, useTheme,
} from "@mui/material";
import CloseIcon                 from "@mui/icons-material/Close";
import EditOutlinedIcon          from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon        from "@mui/icons-material/DeleteOutlined";
import BlockOutlinedIcon         from "@mui/icons-material/BlockOutlined";
import EventBusyOutlinedIcon     from "@mui/icons-material/EventBusyOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import AccessTimeOutlinedIcon    from "@mui/icons-material/AccessTimeOutlined";
import dayjs from "dayjs";

const MODE = { VIEW: "view", EDIT: "edit", CREATE: "create" };

export default function CalendarEventDialog({
  open, handleClose, handleSave, handleDelete,
  defaultDate, existingEvent, existingEvents = [], initialEventType = "single",
}) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const titleRef = useRef(null);

  const [mode,               setMode]               = useState(MODE.CREATE);
  const [eventType,          setEventType]          = useState("single");
  const [title,              setTitle]              = useState("");
  const [notes,              setNotes]              = useState("");
  const [start,              setStart]              = useState(null);
  const [end,                setEnd]                = useState(null);
  const [error,              setError]              = useState("");
  const [confirmDeleteOpen,  setConfirmDeleteOpen]  = useState(false);

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
      setTitle(""); setNotes("");
      setEventType(initialEventType);
      if (initialEventType === "single") { setStart(base); setEnd(base.add(1, "hour")); }
      else { setStart(base.startOf("day")); setEnd(base.endOf("day")); }
    }
    setError("");
  }, [open, existingEvent, defaultDate, initialEventType]);

  const isEditable  = mode !== MODE.VIEW;
  const borderColor = isDark ? "#2e2e2e" : "#e8e8e8";
  const surfaceBg   = isDark ? "#181818" : "#ffffff";
  const subtleBg    = isDark ? "#1e1e1e" : "#f9f9f9";

  // ── Logic ─────────────────────────────────────────────────────────────────
  const hasConflict = (newStart, newEnd) =>
    existingEvents.some((event) => {
      if (existingEvent && event.id === existingEvent.id) return false;
      const s = dayjs(event.startDate), e = dayjs(event.endDate);
      return newStart.isBefore(e) && newEnd.isAfter(s);
    });

  const validate = () => {
    if (!title.trim())       { setError("Title is required."); return false; }
    if (!start || !end)      { setError("Start and end are required."); return false; }
    if (end.isBefore(start)) { setError("End must be after start."); return false; }
    if (hasConflict(start, end)) { setError("Conflicts with an existing block."); return false; }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    let finalStart = start, finalEnd = end;
    if (eventType === "multi") { finalStart = start.startOf("day"); finalEnd = end.endOf("day"); }
    handleSave({ id: existingEvent?.id || Date.now(), title, notes, eventType, startDate: finalStart.toDate(), endDate: finalEnd.toDate() });
  };

  const confirmDelete = () => {
    handleDelete?.(existingEvent?.id);
    setConfirmDeleteOpen(false);
    handleClose();
  };

  // ── Shared input sx ───────────────────────────────────────────────────────
  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: "6px",
      fontSize: "0.85rem",
      backgroundColor: isEditable ? (isDark ? "#1a1a1a" : "#fafafa") : "transparent",
      "& fieldset":                  { borderColor },
      "&:hover fieldset":            { borderColor: isEditable ? "#f5c52b" : borderColor },
      "&.Mui-focused fieldset":      { borderColor: "#f5c52b", borderWidth: "1.5px" },
      "&.Mui-disabled":              { backgroundColor: "transparent" },
    },
    "& .MuiInputLabel-root":             { fontSize: "0.82rem", color: "text.secondary" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#d97706" },
    "& .MuiInputBase-input.Mui-disabled": { WebkitTextFillColor: isDark ? "#666" : "#999" },
  };

  // ── Mode pill ─────────────────────────────────────────────────────────────
  const modePill = {
    [MODE.VIEW]:   { label: "Viewing",  bg: isDark ? "#1e2a1e" : "#f0fdf4", color: "#16a34a", border: isDark ? "#1e3a1e" : "#bbf7d0" },
    [MODE.EDIT]:   { label: "Editing",  bg: isDark ? "#2a2200" : "#fffbeb", color: "#d97706", border: isDark ? "#3a3000" : "#fde68a" },
    [MODE.CREATE]: { label: "New Block",bg: isDark ? "#1a1a2e" : "#eff6ff", color: "#2563eb", border: isDark ? "#1e2a4e" : "#bfdbfe" },
  }[mode];

  // ── Block type cards ──────────────────────────────────────────────────────
  const typeOptions = [
    {
      value: "single",
      label: "Single Day",
      sub: "Block specific hours",
      icon: <AccessTimeOutlinedIcon sx={{ fontSize: 15 }} />,
    },
    {
      value: "multi",
      label: "Multi Day",
      sub: "Block full day range",
      icon: <CalendarMonthOutlinedIcon sx={{ fontSize: 15 }} />,
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
            backgroundColor: surfaceBg,
            backgroundImage: "none",
            border: `1px solid ${borderColor}`,
            boxShadow: isDark
              ? "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
              : "0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
            overflow: "hidden",
          },
        }}
      >
        {/* ── Header band ── */}
        <Box sx={{
          px: 2.5, pt: 2.5, pb: 2,
          background: isDark
            ? "linear-gradient(135deg, #1e1e1e 0%, #1a1a1a 100%)"
            : "linear-gradient(135deg, #fffff9 0%, #fff 100%)",
          borderBottom: `1px solid ${isDark ? "#2a2a00" : "#fce97a"}`,
          display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        }}>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
            {/* Icon badge */}
            <Box sx={{
              mt: 0.2,
              width: 36, height: 36, borderRadius: "10px",
              background: existingEvent
                ? isDark ? "linear-gradient(135deg,#3a0a0a,#2a0505)" : "linear-gradient(135deg,#fee2e2,#fecaca)"
                : isDark ? "linear-gradient(135deg,#2a2200,#1e1900)" : "linear-gradient(135deg,#fef9c3,#fde68a)",
              border: `1px solid ${existingEvent ? (isDark ? "#5a1010" : "#fca5a5") : (isDark ? "#4a3800" : "#fcd34d")}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              {existingEvent
                ? <EventBusyOutlinedIcon sx={{ fontSize: 17, color: isDark ? "#f87171" : "#dc2626" }} />
                : <BlockOutlinedIcon    sx={{ fontSize: 17, color: isDark ? "#fbbf24" : "#d97706" }} />
              }
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary", lineHeight: 1.25, fontFamily: "'Inter', sans-serif" }}>
                {existingEvent ? existingEvent.title || "Blocked Date" : "Block a Date"}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.3, lineHeight: 1.4 }}>
                {mode === MODE.VIEW   && "View-only — click edit to make changes"}
                {mode === MODE.EDIT   && "Editing this block — clients will see changes"}
                {mode === MODE.CREATE && "Clients won't be able to request on blocked dates"}
              </Typography>
            </Box>
          </Box>

          {/* Action icons */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, ml: 1, flexShrink: 0 }}>
            {existingEvent && mode === MODE.VIEW && (
              <IconButton size="small" onClick={() => setMode(MODE.EDIT)} sx={{
                width: 28, height: 28, color: "text.secondary",
                "&:hover": { backgroundColor: isDark ? "#2a2200" : "#fef3c7", color: "#d97706" },
              }}>
                <EditOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
            {existingEvent && (
              <IconButton size="small" onClick={() => setConfirmDeleteOpen(true)} sx={{
                width: 28, height: 28, color: "text.secondary",
                "&:hover": { backgroundColor: isDark ? "#2a0a0a" : "#fee2e2", color: "#dc2626" },
              }}>
                <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
              </IconButton>
            )}
            <IconButton size="small" onClick={handleClose} sx={{
              width: 28, height: 28, color: "text.secondary",
              "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
            }}>
              <CloseIcon sx={{ fontSize: 15 }} />
            </IconButton>
          </Box>
        </Box>

        {/* ── Body ── */}
        <DialogContent sx={{ px: 2.5, py: 2, display: "flex", flexDirection: "column", gap: 0 }}>

          {/* Mode pill */}
          <Box sx={{ mb: 2 }}>
            <Box sx={{
              display: "inline-flex", alignItems: "center", gap: 0.6,
              px: 1.2, py: 0.4, borderRadius: "20px",
              backgroundColor: modePill.bg,
              border: `1px solid ${modePill.border}`,
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: modePill.color }} />
              <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: modePill.color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                {modePill.label}
              </Typography>
            </Box>
          </Box>

          {/* Title field */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.7 }}>
              Title / Reason
            </Typography>
            <TextField
              inputRef={titleRef}
              fullWidth size="small"
              value={title}
              disabled={!isEditable}
              onChange={(e) => { setTitle(e.target.value); setError(""); }}
              placeholder="e.g. Office Closed, Holiday, Maintenance"
              sx={inputSx}
            />
          </Box>

          {/* Block type cards */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.7 }}>
              Block Type
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              {typeOptions.map((opt) => {
                const selected = eventType === opt.value;
                return (
                  <Box
                    key={opt.value}
                    onClick={() => isEditable && setEventType(opt.value)}
                    sx={{
                      flex: 1, px: 1.5, py: 1.2,
                      borderRadius: "8px",
                      border: "1.5px solid",
                      borderColor: selected ? "#f5c52b" : borderColor,
                      backgroundColor: selected
                        ? isDark ? "#2a2200" : "#fffbeb"
                        : subtleBg,
                      cursor: isEditable ? "pointer" : "default",
                      transition: "all 0.15s ease",
                      ...(isEditable && !selected && {
                        "&:hover": { borderColor: isDark ? "#5a4800" : "#fcd34d", backgroundColor: isDark ? "#1e1a00" : "#fffde7" },
                      }),
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.7, mb: 0.3, color: selected ? "#d97706" : "text.secondary" }}>
                      {opt.icon}
                      <Typography sx={{ fontSize: "0.8rem", fontWeight: selected ? 700 : 500, color: selected ? "#d97706" : "text.primary" }}>
                        {opt.label}
                      </Typography>
                    </Box>
                    <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", lineHeight: 1.3 }}>
                      {opt.sub}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>

          {/* Date / time range */}
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.7 }}>
              {eventType === "single" ? "Time Range" : "Date Range"}
            </Typography>
            <Box sx={{ display: "flex", gap: 1.5 }}>
              {eventType === "single" ? (
                <>
                  <TextField
                    label="Start" type="datetime-local" size="small" fullWidth
                    disabled={!isEditable}
                    value={start ? start.format("YYYY-MM-DDTHH:mm") : ""}
                    onChange={(e) => setStart(dayjs(e.target.value))}
                    InputLabelProps={{ shrink: true }} sx={inputSx}
                  />
                  <TextField
                    label="End" type="datetime-local" size="small" fullWidth
                    disabled={!isEditable}
                    value={end ? end.format("YYYY-MM-DDTHH:mm") : ""}
                    onChange={(e) => setEnd(dayjs(e.target.value))}
                    InputLabelProps={{ shrink: true }} sx={inputSx}
                  />
                </>
              ) : (
                <>
                  <TextField
                    label="From" type="date" size="small" fullWidth
                    disabled={!isEditable}
                    value={start ? start.format("YYYY-MM-DD") : ""}
                    onChange={(e) => setStart(dayjs(e.target.value).startOf("day"))}
                    InputLabelProps={{ shrink: true }} sx={inputSx}
                  />
                  <TextField
                    label="To" type="date" size="small" fullWidth
                    disabled={!isEditable}
                    value={end ? end.format("YYYY-MM-DD") : ""}
                    onChange={(e) => setEnd(dayjs(e.target.value).endOf("day"))}
                    InputLabelProps={{ shrink: true }} sx={inputSx}
                  />
                </>
              )}
            </Box>
          </Box>

          {/* Notes */}
          <Box sx={{ mb: error ? 2 : 0 }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.7 }}>
              Notes{" "}
              <Typography component="span" sx={{ fontSize: "0.68rem", color: "text.disabled", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                (optional)
              </Typography>
            </Typography>
            <TextField
              fullWidth multiline rows={2} size="small"
              value={notes}
              disabled={!isEditable}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal notes — not visible to clients..."
              sx={inputSx}
            />
          </Box>

          {/* Error banner */}
          {error && (
            <Box sx={{
              display: "flex", alignItems: "center", gap: 1,
              px: 1.5, py: 1,
              borderRadius: "8px",
              backgroundColor: isDark ? "#2a0a0a" : "#fff5f5",
              border: `1px solid ${isDark ? "#5a1010" : "#fca5a5"}`,
            }}>
              <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#dc2626", flexShrink: 0 }} />
              <Typography sx={{ fontSize: "0.78rem", color: isDark ? "#f87171" : "#dc2626" }}>{error}</Typography>
            </Box>
          )}
        </DialogContent>

        {/* ── Footer ── */}
        {isEditable && (
          <>
            <Divider sx={{ borderColor }} />
            <DialogActions sx={{ px: 2.5, py: 1.75, gap: 1, justifyContent: "flex-end" }}>
              <Button
                size="small" onClick={handleClose}
                sx={{
                  textTransform: "none", fontSize: "0.82rem", fontWeight: 500,
                  color: "text.secondary", borderRadius: "6px", px: 2,
                  "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
                }}
              >
                Cancel
              </Button>
              <Button
                size="small" variant="contained" onClick={handleSubmit}
                sx={{
                  textTransform: "none", fontSize: "0.82rem", fontWeight: 700,
                  borderRadius: "6px", px: 2.5,
                  backgroundColor: "#f5c52b", color: "#111827",
                  boxShadow: "none",
                  "&:hover": { backgroundColor: "#e6b920", boxShadow: "0 2px 8px rgba(245,197,43,0.4)" },
                  transition: "all 0.15s ease",
                }}
              >
                {existingEvent ? "Save Changes" : "Block Date"}
              </Button>
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
            width: 380, borderRadius: "12px",
            backgroundColor: surfaceBg,
            backgroundImage: "none",
            border: `1px solid ${borderColor}`,
            boxShadow: isDark ? "0 20px 60px rgba(0,0,0,0.6)" : "0 8px 40px rgba(0,0,0,0.12)",
            overflow: "hidden",
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          px: 2.5, pt: 2.5, pb: 2,
          background: isDark
            ? "linear-gradient(135deg,#2a0a0a,#1e0505)"
            : "linear-gradient(135deg,white)",
          borderBottom: `1px solid ${isDark ? "#5a1010" : "#fecaca"}`,
          display: "flex", alignItems: "center", gap: 1.5,
        }}>
          <Box sx={{
            width: 34, height: 34, borderRadius: "9px",
            background: isDark ? "linear-gradient(135deg,#3a0a0a,#2a0505)" : "linear-gradient(135deg,#fee2e2,#fecaca)",
            border: `1px solid ${isDark ? "#5a1010" : "#fca5a5"}`,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <DeleteOutlinedIcon sx={{ fontSize: 16, color: isDark ? "#f87171" : "#dc2626" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "text.primary", lineHeight: 1.2 }}>
              Remove Block
            </Typography>
            <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 0.2 }}>
              This action cannot be undone
            </Typography>
          </Box>
        </Box>

        {/* Body */}
        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography sx={{ fontSize: "0.84rem", color: "text.secondary", lineHeight: 1.65 }}>
            Remove{" "}
            <Typography component="span" sx={{ fontWeight: 700, color: "text.primary" }}>
              "{existingEvent?.title}"
            </Typography>
            ? Clients will immediately be able to book this date again.
          </Typography>
        </Box>

        <Divider sx={{ borderColor }} />

        {/* Actions */}
        <Box sx={{ px: 2.5, py: 1.75, display: "flex", justifyContent: "flex-end", gap: 1 }}>
          <Button
            size="small" onClick={() => setConfirmDeleteOpen(false)}
            sx={{
              textTransform: "none", fontSize: "0.82rem", fontWeight: 500,
              color: "text.secondary", borderRadius: "6px", px: 2,
              "&:hover": { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
            }}
          >
            Cancel
          </Button>
          <Button
            size="small" variant="contained" onClick={confirmDelete}
            sx={{
              textTransform: "none", fontSize: "0.82rem", fontWeight: 700,
              borderRadius: "6px", px: 2,
              backgroundColor: "#dc2626", color: "#fff",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#b91c1c", boxShadow: "0 2px 8px rgba(220,38,38,0.4)" },
              transition: "all 0.15s ease",
            }}
          >
            Remove Block
          </Button>
        </Box>
      </Dialog>
    </>
  );
}