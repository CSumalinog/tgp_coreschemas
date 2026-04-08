import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EventRepeatOutlinedIcon from "@mui/icons-material/EventRepeatOutlined";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineOutlinedIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import {
  checkConflictForDate,
  checkLateSubmissionForDate,
} from "../../hooks/RequestAssistant";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const DEFAULT_FONT_FAMILY = "'Inter', sans-serif";

function fmtTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDate(d, opts = { month: "long", day: "numeric", year: "numeric" }) {
  if (!d) return "-";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
}

function buildEventDateDisplay(req) {
  if (!req) return "-";
  if (req.is_multiday && req.event_days?.length > 0) {
    const sorted = [...req.event_days].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const first = fmtDate(sorted[0].date, { month: "short", day: "numeric" });
    const last = fmtDate(sorted[sorted.length - 1].date, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return sorted.length === 1 ? fmtDate(sorted[0].date) : `${first} - ${last}`;
  }
  return req.event_date
    ? new Date(req.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "-";
}

function parseDateValue(value) {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function toDateValue(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseTimeValue(value) {
  if (!value) return null;
  const [h, m] = value.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
}

function toTimeValue(dateObj) {
  if (!(dateObj instanceof Date) || Number.isNaN(dateObj.getTime())) return "";
  const h = String(dateObj.getHours()).padStart(2, "0");
  const m = String(dateObj.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

export default function RescheduleDialog({
  open,
  onClose,
  onConfirm,
  loading,
  isDark,
  border,
  request,
  fontFamily = DEFAULT_FONT_FAMILY,
}) {
  const [multiDay, setMultiDay] = useState(false);
  const [singleDate, setSingleDate] = useState("");
  const [fromTime, setFromTime] = useState("");
  const [toTime, setToTime] = useState("");
  const [days, setDays] = useState([{ date: "", from_time: "", to_time: "" }]);
  const [reason, setReason] = useState("");
  const [validating, setValidating] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [showWarningStep, setShowWarningStep] = useState(false);

  useEffect(() => {
    if (open) {
      const wasMultiDay = !!(
        request?.is_multiday && request?.event_days?.length > 0
      );
      setMultiDay(wasMultiDay);
      setSingleDate("");
      setFromTime(request?.from_time || "");
      setToTime(request?.to_time || "");
      setDays(
        wasMultiDay
          ? request.event_days.map((d) => ({
              date: "",
              from_time: d.from_time || "",
              to_time: d.to_time || "",
            }))
          : [{ date: "", from_time: "", to_time: "" }],
      );
      setReason("");
      setValidationIssues([]);
      setShowWarningStep(false);
    }
  }, [open, request]);

  const addDay = () =>
    setDays((p) => [...p, { date: "", from_time: "", to_time: "" }]);
  const removeDay = (i) => setDays((p) => p.filter((_, idx) => idx !== i));
  const updateDay = (i, field, val) =>
    setDays((p) => p.map((d, idx) => (idx === i ? { ...d, [field]: val } : d)));

  const getPrimaryDate = () => {
    if (multiDay) {
      const filled = days
        .filter((d) => d.date)
        .sort((a, b) => a.date.localeCompare(b.date));
      return filled[0]?.date || null;
    }
    return singleDate || null;
  };

  const buildPayload = () => {
    if (multiDay) {
      const sorted = [...days]
        .filter((d) => d.date)
        .sort((a, b) => a.date.localeCompare(b.date));
      return {
        is_multiday: true,
        event_date: sorted[0]?.date || null,
        end_date: sorted[sorted.length - 1]?.date || null,
        from_time: sorted[0]?.from_time || null,
        to_time: sorted[0]?.to_time || null,
        event_days: sorted,
      };
    }
    return {
      is_multiday: false,
      event_date: singleDate,
      end_date: null,
      from_time: fromTime || null,
      to_time: toTime || null,
      event_days: [],
    };
  };

  const handleValidate = async () => {
    const primaryDate = getPrimaryDate();
    if (!primaryDate) return;
    setValidating(true);
    setValidationIssues([]);
    const issues = [];
    try {
      const lateResult = await checkLateSubmissionForDate(primaryDate);
      if (lateResult.type === "error") {
        issues.push({ severity: "error", message: lateResult.message });
      } else if (lateResult.type === "warning") {
        issues.push({ severity: "warning", message: lateResult.message });
      }

      const conflictResult = await checkConflictForDate(primaryDate, request?.id);
      if (conflictResult.hasConflict) {
        const msgs = conflictResult.conflicts.map(
          (c) =>
            `"${c.title}" (${c.status}${c.from_time ? ` · ${fmtTime(c.from_time)}-${fmtTime(c.to_time)}` : ""})`,
        );
        issues.push({
          severity: "warning",
          message: `Scheduling conflict${msgs.length > 1 ? "s" : ""} on this date: ${msgs.join("; ")}`,
        });
      }
    } catch (err) {
      console.error("Validation error:", err);
    } finally {
      setValidating(false);
    }

    if (issues.length > 0) {
      setValidationIssues(issues);
      setShowWarningStep(true);
    } else {
      onConfirm(buildPayload(), reason.trim());
    }
  };

  const handleProceedDespiteWarnings = () =>
    onConfirm(buildPayload(), reason.trim());

  const handleBack = () => {
    setShowWarningStep(false);
    setValidationIssues([]);
  };

  const handleClose = () => {
    if (loading) return;
    setShowWarningStep(false);
    setValidationIssues([]);
    onClose();
  };

  const primaryDate = getPrimaryDate();
  const canSubmit = !!primaryDate;
  const hasHardError = validationIssues.some((i) => i.severity === "error");

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      fontFamily,
      fontSize: "0.82rem",
      borderRadius: "10px",
      "& fieldset": { borderColor: border },
      "&:hover fieldset": { borderColor: GOLD },
      "&.Mui-focused fieldset": { borderColor: GOLD },
    },
    "& .MuiInputLabel-root": { fontFamily, fontSize: "0.82rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: GOLD },
    "& .MuiInputBase-input": { fontFamily },
  };

  const pickerInputSx = {
    ...inputSx,
    "& .MuiInputBase-input": {
      fontFamily,
      fontSize: "0.84rem",
      fontWeight: 500,
      py: 1.1,
    },
    "& .MuiIconButton-root": {
      color: "text.secondary",
      borderRadius: "10px",
      p: 0.4,
      "&:hover": {
        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : HOVER_BG,
      },
    },
    "& .MuiSvgIcon-root": { fontSize: 18 },
  };

  const pickerPopperSx = {
    "& .MuiPaper-root": {
      borderRadius: "10px",
      border: `1px solid ${border}`,
      boxShadow: isDark
        ? "0 24px 64px rgba(0,0,0,0.6)"
        : "0 16px 48px rgba(53,53,53,0.16)",
      backgroundImage: "none",
      backgroundColor: "background.paper",
    },
    "& .MuiPickersDay-root.Mui-selected": {
      backgroundColor: GOLD,
      color: "#111",
      fontWeight: 700,
      "&:hover": { backgroundColor: GOLD },
    },
    "& .MuiClock-pin, & .MuiClockPointer-root, & .MuiClockPointer-thumb": {
      backgroundColor: GOLD,
      borderColor: GOLD,
    },
    "& .MuiPickersToolbar-root, & .MuiDateCalendar-root": {
      fontFamily,
    },
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "10px",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 8px 40px rgba(53,53,53,0.12)",
          maxHeight: "90vh",
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          borderBottom: `1px solid ${border}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              backgroundColor: isDark ? "rgba(245,197,43,0.1)" : GOLD_08,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <EventRepeatOutlinedIcon sx={{ fontSize: 18, color: GOLD }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily,
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              {showWarningStep ? "Review Issues" : "Reschedule Request"}
            </Typography>
            <Typography
              sx={{
                fontFamily,
                fontSize: "0.72rem",
                color: "text.secondary",
                mt: 0.15,
              }}
            >
              {showWarningStep
                ? "Please review the issues below before proceeding."
                : "Status will reset to Under Review for staff reassignment."}
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          size="small"
          sx={{
            color: "text.secondary",
            borderRadius: "10px",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.5, overflowY: "auto" }}>
        {showWarningStep ? (
          <Box>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.25,
                mb: 3,
              }}
            >
              {validationIssues.map((issue, idx) => {
                const isError = issue.severity === "error";
                return (
                  <Box
                    key={idx}
                    sx={{
                      display: "flex",
                      gap: 1.25,
                      p: 1.5,
                      borderRadius: "10px",
                      backgroundColor: isError
                        ? isDark
                          ? "rgba(239,68,68,0.08)"
                          : "#fef2f2"
                        : isDark
                          ? "rgba(245,158,11,0.08)"
                          : "#fffbeb",
                      border: `1px solid ${isError ? (isDark ? "rgba(239,68,68,0.2)" : "#fecaca") : isDark ? "rgba(245,158,11,0.2)" : "#fde68a"}`,
                    }}
                  >
                    {isError ? (
                      <ErrorOutlineOutlinedIcon
                        sx={{
                          fontSize: 17,
                          color: "#ef4444",
                          flexShrink: 0,
                          mt: 0.1,
                        }}
                      />
                    ) : (
                      <WarningAmberOutlinedIcon
                        sx={{
                          fontSize: 17,
                          color: "#f59e0b",
                          flexShrink: 0,
                          mt: 0.1,
                        }}
                      />
                    )}
                    <Typography
                      sx={{
                        fontFamily,
                        fontSize: "0.8rem",
                        color: isError ? "#dc2626" : "#92400e",
                        lineHeight: 1.55,
                      }}
                    >
                      {issue.message}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
            {!hasHardError && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.02)"
                    : "rgba(53,53,53,0.02)",
                  border: `1px solid ${border}`,
                  mb: 3,
                }}
              >
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: "0.78rem",
                    color: "text.secondary",
                    lineHeight: 1.6,
                  }}
                >
                  You can still proceed with this reschedule. Section heads will
                  be notified to reassign staff for the new date.
                </Typography>
              </Box>
            )}
            <Box sx={{ display: "flex", gap: 1.25 }}>
              <Button
                fullWidth
                onClick={handleBack}
                disabled={loading}
                sx={{
                  fontFamily,
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  borderRadius: "10px",
                  py: 1,
                  textTransform: "none",
                  border: `1px solid ${border}`,
                  color: "text.secondary",
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : HOVER_BG,
                  },
                }}
              >
                Go Back
              </Button>
              {!hasHardError && (
                <Button
                  fullWidth
                  onClick={handleProceedDespiteWarnings}
                  disabled={loading}
                  sx={{
                    fontFamily,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    borderRadius: "10px",
                    py: 1,
                    textTransform: "none",
                    backgroundColor: "#212121",
                    color: "#fff",
                    "&:hover": { backgroundColor: "#333" },
                    "&:disabled": {
                      backgroundColor: "rgba(33,33,33,0.35)",
                      color: "rgba(255,255,255,0.7)",
                    },
                  }}
                >
                  {loading ? (
                    <CircularProgress size={16} sx={{ color: "#fff" }} />
                  ) : (
                    "Proceed Anyway"
                  )}
                </Button>
              )}
            </Box>
          </Box>
        ) : (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: "10px",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(53,53,53,0.02)",
                border: `1px solid ${border}`,
                mb: 2.5,
              }}
            >
              <Typography
                sx={{
                  fontFamily,
                  fontSize: "0.7rem",
                  color: "text.secondary",
                  mb: 0.25,
                }}
              >
                Current event date
              </Typography>
              <Typography
                sx={{
                  fontFamily,
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "text.primary",
                }}
              >
                {buildEventDateDisplay(request)}
              </Typography>
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mb: 2,
              }}
            >
              <Typography
                sx={{
                  fontFamily,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  color: "text.primary",
                }}
              >
                New Schedule
              </Typography>
              <Box
                onClick={() => {
                  setMultiDay((p) => !p);
                  setDays([{ date: "", from_time: "", to_time: "" }]);
                  setSingleDate("");
                  setFromTime("");
                  setToTime("");
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.25,
                  py: 0.45,
                  borderRadius: "10px",
                  cursor: "pointer",
                  border: `1px solid ${multiDay ? GOLD : border}`,
                  backgroundColor: multiDay ? GOLD_08 : "transparent",
                  transition: "all 0.15s",
                }}
              >
                <Typography
                  sx={{
                    fontFamily,
                    fontSize: "0.73rem",
                    fontWeight: 500,
                    color: multiDay
                      ? isDark
                        ? GOLD
                        : "#7a5c00"
                      : "text.secondary",
                  }}
                >
                  Multi-day
                </Typography>
              </Box>
            </Box>

            {!multiDay && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
                <DatePicker
                  label="New Event Date"
                  value={parseDateValue(singleDate)}
                  onChange={(val) => setSingleDate(toDateValue(val))}
                  format="MMM d, yyyy"
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      sx: pickerInputSx,
                    },
                    popper: { sx: pickerPopperSx },
                  }}
                />
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 1.5,
                  }}
                >
                  <TimePicker
                    label="Start Time"
                    value={parseTimeValue(fromTime)}
                    onChange={(val) => setFromTime(toTimeValue(val))}
                    ampm
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: pickerInputSx,
                      },
                      popper: { sx: pickerPopperSx },
                    }}
                  />
                  <TimePicker
                    label="End Time"
                    value={parseTimeValue(toTime)}
                    onChange={(val) => setToTime(toTimeValue(val))}
                    ampm
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        sx: pickerInputSx,
                      },
                      popper: { sx: pickerPopperSx },
                    }}
                  />
                </Box>
              </Box>
            )}

            {multiDay && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {days.map((day, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      p: 1.5,
                      borderRadius: "10px",
                      border: `1px solid ${border}`,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.01)"
                        : "rgba(53,53,53,0.01)",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        mb: 1.25,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily,
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "text.secondary",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Day {idx + 1}
                      </Typography>
                      {days.length > 1 && (
                        <IconButton
                          onClick={() => removeDay(idx)}
                          size="small"
                          sx={{
                            color: "text.disabled",
                            borderRadius: "10px",
                            p: 0.4,
                            "&:hover": {
                              color: "#ef4444",
                              backgroundColor: "rgba(239,68,68,0.06)",
                            },
                          }}
                        >
                          <DeleteOutlineOutlinedIcon sx={{ fontSize: 15 }} />
                        </IconButton>
                      )}
                    </Box>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <DatePicker
                        label="Date"
                        value={parseDateValue(day.date)}
                        onChange={(val) =>
                          updateDay(idx, "date", toDateValue(val))
                        }
                        format="MMM d, yyyy"
                        slotProps={{
                          textField: {
                            fullWidth: true,
                            size: "small",
                            sx: pickerInputSx,
                          },
                          popper: { sx: pickerPopperSx },
                        }}
                      />
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 1,
                        }}
                      >
                        <TimePicker
                          label="Start"
                          value={parseTimeValue(day.from_time)}
                          onChange={(val) =>
                            updateDay(idx, "from_time", toTimeValue(val))
                          }
                          ampm
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: "small",
                              sx: pickerInputSx,
                            },
                            popper: { sx: pickerPopperSx },
                          }}
                        />
                        <TimePicker
                          label="End"
                          value={parseTimeValue(day.to_time)}
                          onChange={(val) =>
                            updateDay(idx, "to_time", toTimeValue(val))
                          }
                          ampm
                          slotProps={{
                            textField: {
                              fullWidth: true,
                              size: "small",
                              sx: pickerInputSx,
                            },
                            popper: { sx: pickerPopperSx },
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                ))}
                <Box
                  onClick={addDay}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 0.75,
                    py: 1,
                    borderRadius: "10px",
                    border: `1px dashed ${border}`,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    "&:hover": {
                      borderColor: "rgba(53,53,53,0.35)",
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.04)"
                        : HOVER_BG,
                    },
                  }}
                >
                  <AddOutlinedIcon
                    sx={{ fontSize: 15, color: "text.secondary" }}
                  />
                  <Typography
                    sx={{
                      fontFamily,
                      fontSize: "0.78rem",
                      color: "text.secondary",
                    }}
                  >
                    Add another day
                  </Typography>
                </Box>
              </Box>
            )}

            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Reason for rescheduling (optional)"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                sx={inputSx}
              />
            </Box>

            <Box
              sx={{
                mt: 2,
                p: 1.25,
                borderRadius: "10px",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.02)"
                  : "rgba(53,53,53,0.02)",
                border: `1px solid ${border}`,
                borderLeft: "2.5px solid #353535",
              }}
            >
              <Typography
                sx={{
                  fontFamily,
                  fontSize: "0.75rem",
                  color: "text.secondary",
                  lineHeight: 1.55,
                }}
              >
                Rescheduling will reset this request to <strong>Under Review</strong>
                so section heads can reassign staff for the new date. Previously
                assigned staff will be notified.
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1.25, mt: 2.5 }}>
              <Button
                fullWidth
                onClick={handleClose}
                disabled={loading || validating}
                sx={{
                  fontFamily,
                  fontSize: "0.82rem",
                  fontWeight: 500,
                  borderRadius: "10px",
                  py: 1,
                  textTransform: "none",
                  border: `1px solid ${border}`,
                  color: "text.secondary",
                  backgroundColor: "transparent",
                  "&:hover": {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : HOVER_BG,
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                fullWidth
                onClick={handleValidate}
                disabled={!canSubmit || loading || validating}
                sx={{
                  fontFamily,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  borderRadius: "10px",
                  py: 1,
                  textTransform: "none",
                  backgroundColor: "#212121",
                  color: "#fff",
                  "&:hover": { backgroundColor: "#333" },
                  "&:disabled": {
                    backgroundColor: "rgba(33,33,33,0.35)",
                    color: "rgba(255,255,255,0.7)",
                  },
                }}
              >
                {validating ? (
                  <CircularProgress size={16} sx={{ color: "#fff" }} />
                ) : (
                  "Continue"
                )}
              </Button>
            </Box>
          </Box>
          </LocalizationProvider>
        )}
      </DialogContent>
    </Dialog>
  );
}
