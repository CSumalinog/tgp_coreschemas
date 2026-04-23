// src/components/admin/RequestSlotsDialog.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Alert,
  Tooltip,
  Divider,
  Dialog,
  TextField,
  CircularProgress,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import BrandDatePicker from "../common/BrandDatePicker";
import { supabase } from "../../lib/supabaseClient";
import { pushSuccessToast } from "../common/SuccessToast";

const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm = "'Inter', sans-serif";

const formatISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const parseISODate = (value) => {
  if (!value || typeof value !== "string") return null;
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const normalizePickerDate = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return "";
  return formatISO(value);
};

export default function RequestSlotsDialog({
  open,
  onClose,
  currentUser,
  onDataChanged,
  initialDate,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [defaultSlotsInput, setDefaultSlotsInput] = useState("2");
  const [overrideDateInput, setOverrideDateInput] = useState(
    () => initialDate || formatISO(new Date()),
  );
  const [overrideSlotsInput, setOverrideSlotsInput] = useState("2");
  const [slotOverrides, setSlotOverrides] = useState([]);

  const loadSlotSettings = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [
        { data: settingsRow, error: settingsErr },
        { data: overrides, error: overridesErr },
      ] = await Promise.all([
        supabase
          .from("calendar_slot_settings")
          .select("id, default_slots")
          .eq("id", 1)
          .maybeSingle(),
        supabase
          .from("calendar_slot_overrides")
          .select("slot_date, slot_capacity, updated_at")
          .order("slot_date", { ascending: true }),
      ]);

      if (settingsErr) throw settingsErr;
      if (overridesErr) throw overridesErr;

      const defaultSlots = settingsRow?.default_slots ?? 2;
      setDefaultSlotsInput(String(defaultSlots));
      setOverrideSlotsInput(String(defaultSlots));
      setSlotOverrides(overrides || []);
    } catch (err) {
      setError(err.message || "Failed to load slot settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => {
        void loadSlotSettings();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [open, loadSlotSettings]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setOverrideDateInput(initialDate || formatISO(new Date()));
    }, 0);
    return () => clearTimeout(timer);
  }, [open, initialDate]);

  const saveDateOverride = async () => {
    if (!overrideDateInput) {
      setError("Please pick a date for the override.");
      return;
    }
    const parsed = Number(overrideSlotsInput);
    if (!Number.isFinite(parsed) || parsed < 0) {
      setError("Override slots must be a number greater than or equal to 0.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const { error: upsertErr } = await supabase
        .from("calendar_slot_overrides")
        .upsert(
          {
            slot_date: overrideDateInput,
            slot_capacity: parsed,
            updated_by: currentUser?.id || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "slot_date" },
        );
      if (upsertErr) throw upsertErr;
      await loadSlotSettings();
      setOverrideDateInput(initialDate || formatISO(new Date()));
      setOverrideSlotsInput(String(defaultSlotsInput));
      onDataChanged?.();
    } catch (err) {
      setError(err.message || "Failed to save date override.");
    } finally {
      setSaving(false);
    }
  };

  const saveSlotChanges = async () => {
    const parsedDefault = Number(defaultSlotsInput);
    if (!Number.isFinite(parsedDefault) || parsedDefault < 0) {
      setError("Default slots must be a number greater than or equal to 0.");
      return;
    }

    const parsedOverride = Number(overrideSlotsInput);
    const hasValidOverrideDraft =
      !!overrideDateInput &&
      Number.isFinite(parsedOverride) &&
      parsedOverride >= 0;
    const hasExistingOverrideForDate = slotOverrides.some(
      (row) => row.slot_date === overrideDateInput,
    );
    const shouldSaveOverrideDraft =
      hasValidOverrideDraft &&
      (Boolean(initialDate) ||
        hasExistingOverrideForDate ||
        parsedOverride !== parsedDefault);

    setSaving(true);
    setError("");
    try {
      const { error: defaultErr } = await supabase
        .from("calendar_slot_settings")
        .upsert(
          {
            id: 1,
            default_slots: parsedDefault,
            updated_by: currentUser?.id || null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      if (defaultErr) throw defaultErr;

      if (shouldSaveOverrideDraft) {
        const { error: upsertErr } = await supabase
          .from("calendar_slot_overrides")
          .upsert(
            {
              slot_date: overrideDateInput,
              slot_capacity: parsedOverride,
              updated_by: currentUser?.id || null,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "slot_date" },
          );
        if (upsertErr) throw upsertErr;
      }

      await loadSlotSettings();
      onDataChanged?.();
      onClose();
      pushSuccessToast(
        shouldSaveOverrideDraft
          ? "Slot settings and override saved."
          : "Slot settings saved.",
      );
    } catch (err) {
      setError(err.message || "Failed to save slot settings.");
    } finally {
      setSaving(false);
    }
  };

  const removeDateOverride = async (slotDate) => {
    setSaving(true);
    setError("");
    try {
      const { error: delErr } = await supabase
        .from("calendar_slot_overrides")
        .delete()
        .eq("slot_date", slotDate);
      if (delErr) throw delErr;
      await loadSlotSettings();
      onDataChanged?.();
    } catch (err) {
      setError(err.message || "Failed to remove date override.");
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
          justifyContent: "space-between",
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
          Client Calendar Slots
        </Typography>
      </Box>

      {/* Body */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
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

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "text.primary",
              minWidth: 132,
            }}
          >
            Default daily slots:
          </Typography>
          <TextField
            label="Default slots"
            type="number"
            size="small"
            value={defaultSlotsInput}
            onChange={(e) => setDefaultSlotsInput(e.target.value)}
            disabled={saving || loading}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{
              width: 180,
              "& .MuiOutlinedInput-root": {
                fontFamily: dm,
                fontSize: "0.82rem",
                borderRadius: "10px",
                height: 46,
              },
              "& .MuiInputLabel-root": { fontFamily: dm, fontSize: "0.8rem" },
            }}
          />
        </Box>

        <Divider sx={{ borderColor: border, my: 0.25 }} />

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              color: "text.primary",
              minWidth: 132,
            }}
          >
            Date override:
          </Typography>
          <BrandDatePicker
            label="Date"
            value={parseISODate(overrideDateInput)}
            onChange={(d) => setOverrideDateInput(normalizePickerDate(d))}
            disabled={saving || loading}
            border={border}
          />
          <TextField
            label="Slots"
            type="number"
            size="small"
            value={overrideSlotsInput}
            onChange={(e) => setOverrideSlotsInput(e.target.value)}
            disabled={saving || loading}
            slotProps={{ htmlInput: { min: 0 } }}
            sx={{
              width: 96,
              "& .MuiOutlinedInput-root": {
                fontFamily: dm,
                fontSize: "0.82rem",
                borderRadius: "10px",
                height: 46,
              },
              "& .MuiInputLabel-root": { fontFamily: dm, fontSize: "0.8rem" },
            }}
          />
          <Tooltip title="Add override" arrow>
            <span>
              <IconButton
                size="small"
                onClick={saveDateOverride}
                disabled={saving || loading}
                sx={{
                  borderRadius: "10px",
                  color: "#ffffff",
                  backgroundColor: "#212121",
                  width: 36,
                  height: 36,
                  flexShrink: 0,
                  "&:hover": { backgroundColor: "#333" },
                  "&.Mui-disabled": {
                    backgroundColor: "rgba(33,33,33,0.3)",
                    color: "#ffffff",
                  },
                }}
              >
                <AddIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {/* Overrides list */}
        <Box
          sx={{
            mt: 0.5,
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
                Loading overrides...
              </Typography>
            </Box>
          ) : slotOverrides.length === 0 ? (
            <Box sx={{ p: 1.25 }}>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.76rem",
                  color: "text.secondary",
                }}
              >
                No date overrides yet.
              </Typography>
            </Box>
          ) : (
            slotOverrides.map((row, idx) => (
              <Box
                key={row.slot_date}
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
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.76rem",
                    color: "text.primary",
                  }}
                >
                  {new Date(`${row.slot_date}T00:00:00`).toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.74rem",
                      color: "text.secondary",
                      fontWeight: 600,
                    }}
                  >
                    {row.slot_capacity} slots
                  </Typography>
                  <IconButton
                    size="small"
                    disabled={saving}
                    onClick={() => removeDateOverride(row.slot_date)}
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
              </Box>
            ))
          )}
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
          onClick={!saving && !loading ? saveSlotChanges : undefined}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.75,
            py: 0.65,
            borderRadius: "10px",
            cursor: saving || loading ? "default" : "pointer",
            backgroundColor: "#212121",
            color: "#ffffff",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            opacity: saving || loading ? 0.7 : 1,
            transition: "background-color 0.15s",
            "&:hover": {
              backgroundColor: saving || loading ? "#212121" : "#333",
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
