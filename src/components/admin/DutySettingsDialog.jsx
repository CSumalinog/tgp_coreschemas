// src/components/admin/DutySettingsDialog.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Alert,
  Divider,
  Dialog,
  TextField,
  MenuItem,
  CircularProgress,
  useTheme,
} from "@mui/material";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import BrandDatePicker from "../common/BrandDatePicker";
import { supabase } from "../../lib/supabaseClient";
import { getSemesterDisplayName } from "../../utils/semesterLabel";

const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm = "'Inter', sans-serif";

const MODAL_FIELD_SX = {
  "& .MuiOutlinedInput-root": {
    fontFamily: dm,
    fontSize: "0.82rem",
    borderRadius: "10px",
    minHeight: 46,
    alignItems: "center",
  },
  "& .MuiInputLabel-root": {
    fontFamily: dm,
    fontSize: "0.8rem",
  },
};

const MODAL_TEXTAREA_SX = {
  "& .MuiOutlinedInput-root": {
    fontFamily: dm,
    fontSize: "0.82rem",
    borderRadius: "10px",
  },
  "& .MuiInputLabel-root": {
    fontFamily: dm,
    fontSize: "0.8rem",
  },
};

const formatISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function DutySettingsDialog({ open, onClose, currentUser, onDataChanged, initialDate }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [semesters, setSemesters] = useState([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");
  const [blackouts, setBlackouts] = useState([]);
  const [blackoutInput, setBlackoutInput] = useState("");
  const [blackoutReasonInput, setBlackoutReasonInput] = useState("");

  const loadSemesters = useCallback(async () => {
    try {
      const { data, error: semesterErr } = await supabase
        .from("semesters")
        .select("id, name, is_active, start_date, end_date")
        .order("start_date", { ascending: false });

      if (semesterErr) throw semesterErr;

      const rows = data || [];
      setSemesters(rows);
      if (!rows.length) {
        setSelectedSemesterId("");
        return;
      }

      setSelectedSemesterId((prev) => {
        if (prev && rows.some((s) => s.id === prev)) return prev;
        const active = rows.find((s) => s.is_active);
        return active?.id || rows[0].id;
      });
    } catch (err) {
      setError(err.message || "Failed to load semesters.");
    }
  }, []);

  const loadBlackouts = useCallback(async () => {
    if (!selectedSemesterId) {
      setBlackouts([]);
      return;
    }

    setLoading(true);
    setError("");
    try {
      const { data, error: blackoutErr } = await supabase
        .from("duty_schedule_blackout_dates")
        .select("id, blackout_date, reason")
        .eq("semester_id", selectedSemesterId)
        .order("blackout_date", { ascending: true });

      if (blackoutErr) throw blackoutErr;
      setBlackouts(data || []);
    } catch (err) {
      setError(err.message || "Failed to load duty blackout dates.");
    } finally {
      setLoading(false);
    }
  }, [selectedSemesterId]);

  useEffect(() => {
    if (open) {
      loadSemesters();
      if (initialDate) setBlackoutInput(initialDate);
    }
  }, [open, initialDate, loadSemesters]);

  useEffect(() => {
    if (open) {
      loadBlackouts();
    }
  }, [open, loadBlackouts]);

  const addBlackout = async () => {
    if (!selectedSemesterId || !blackoutInput) return;

    setSaving(true);
    setError("");
    try {
      const { error: insertErr } = await supabase
        .from("duty_schedule_blackout_dates")
        .insert({
          semester_id: selectedSemesterId,
          blackout_date: blackoutInput,
          reason: blackoutReasonInput.trim() || null,
          created_by: currentUser?.id || null,
        });
      if (insertErr) throw insertErr;

      setBlackoutInput("");
      setBlackoutReasonInput("");
      await loadBlackouts();
      onDataChanged?.();
    } catch (err) {
      setError(err.message || "Failed to add duty blackout date.");
    } finally {
      setSaving(false);
    }
  };

  const removeBlackout = async (id) => {
    if (!id) return;
    setSaving(true);
    setError("");
    try {
      const { error: deleteErr } = await supabase
        .from("duty_schedule_blackout_dates")
        .delete()
        .eq("id", id);
      if (deleteErr) throw deleteErr;
      await loadBlackouts();
      onDataChanged?.();
    } catch (err) {
      setError(err.message || "Failed to remove duty blackout date.");
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setError("");
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      slotProps={{
        paper: {
          sx: {
            borderRadius: "10px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
          },
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
        }}
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "0.92rem",
            color: "text.primary",
          }}
        >
          Duty Settings
        </Typography>
      </Box>

      {/* Body */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {error && (
          <Alert
            severity="error"
            sx={{
              borderRadius: "10px",
              fontFamily: dm,
              fontSize: "0.78rem",
            }}
          >
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "text.primary",
              minWidth: 132,
            }}
          >
            Semester:
          </Typography>
          <TextField
            select
            value={selectedSemesterId}
            onChange={(e) => setSelectedSemesterId(e.target.value)}
            disabled={saving}
            sx={{ flex: 1, ...MODAL_FIELD_SX }}
          >
            {semesters.map((semester) => (
              <MenuItem
                key={semester.id}
                value={semester.id}
                sx={{ fontFamily: dm, fontSize: "0.82rem" }}
              >
                {getSemesterDisplayName(semester)}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Divider sx={{ borderColor: border, my: 0.25 }} />

        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "text.primary",
              minWidth: 132,
              pt: 1.5,
            }}
          >
            Duty Blackout Dates:
          </Typography>

          <Box
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 0.85,
            }}
          >
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <BrandDatePicker
                label="Date"
                value={
                  blackoutInput ? new Date(blackoutInput + "T00:00:00") : null
                }
                onChange={(d) => setBlackoutInput(d ? formatISO(d) : "")}
                disabled={saving || !selectedSemesterId}
                border={border}
                slotProps={{ textField: { sx: { maxWidth: 220 } } }}
              />
              <TextField
                label="Reason (optional)"
                fullWidth
                multiline
                minRows={4}
                value={blackoutReasonInput}
                onChange={(e) => setBlackoutReasonInput(e.target.value)}
                disabled={saving || !selectedSemesterId}
                sx={MODAL_TEXTAREA_SX}
              />
            </Box>

            {/* Blackouts list */}
            <Box
              sx={{
                mt: 0.1,
                border: `1px solid ${border}`,
                borderRadius: "10px",
                maxHeight: 210,
                overflowY: "auto",
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.01)"
                  : "rgba(53,53,53,0.01)",
              }}
            >
              {loading ? (
                <Box sx={{ p: 1.25 }}>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.76rem",
                      color: "text.secondary",
                    }}
                  >
                    Loading duty blackout dates...
                  </Typography>
                </Box>
              ) : blackouts.length === 0 ? (
                <Box sx={{ p: 1.25 }}>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.76rem",
                      color: "text.secondary",
                    }}
                  >
                    No duty blackout dates yet.
                  </Typography>
                </Box>
              ) : (
                blackouts.map((row, idx) => (
                  <Box
                    key={row.id}
                    sx={{
                      px: 1.25,
                      py: 0.9,
                      borderTop: idx === 0 ? "none" : `1px solid ${border}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.76rem",
                          color: "text.primary",
                        }}
                      >
                        {new Date(
                          `${row.blackout_date}T00:00:00`,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </Typography>
                      {row.reason ? (
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.68rem",
                            color: "text.secondary",
                          }}
                        >
                          {row.reason}
                        </Typography>
                      ) : null}
                    </Box>
                    <IconButton
                      size="small"
                      disabled={saving}
                      onClick={() => removeBlackout(row.id)}
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "10px",
                        color: "text.secondary",
                        "&:hover": {
                          color: "#dc2626",
                          backgroundColor: isDark
                            ? "rgba(220,38,38,0.12)"
                            : "#fef2f2",
                        },
                      }}
                    >
                      <DeleteOutlinedIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                ))
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.01)"
            : "rgba(53,53,53,0.01)",
        }}
      >
        <Box
          onClick={handleClose}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "10px",
            cursor: saving ? "default" : "pointer",
            border: `1px solid ${border}`,
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "text.secondary",
            opacity: saving ? 0.5 : 1,
            transition: "all 0.15s",
            "&:hover": {
              borderColor: "rgba(53,53,53,0.4)",
              color: "text.primary",
            },
          }}
        >
          Cancel
        </Box>
        <Box
          onClick={
            !saving && !loading && selectedSemesterId && blackoutInput
              ? addBlackout
              : undefined
          }
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.75,
            py: 0.65,
            borderRadius: "10px",
            cursor:
              saving || loading || !selectedSemesterId || !blackoutInput
                ? "default"
                : "pointer",
            backgroundColor: "#212121",
            color: "#ffffff",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            opacity:
              saving || loading || !selectedSemesterId || !blackoutInput
                ? 0.4
                : 1,
            transition: "background-color 0.15s",
            "&:hover": {
              backgroundColor:
                saving || loading || !selectedSemesterId || !blackoutInput
                  ? "#212121"
                  : "#333",
            },
          }}
        >
          {saving && <CircularProgress size={13} sx={{ color: "#ffffff" }} />}
          Save Changes
        </Box>
      </Box>
    </Dialog>
  );
}
