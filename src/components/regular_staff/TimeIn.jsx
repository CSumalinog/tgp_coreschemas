// src/components/staff/TimeInComponents.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Time In / On Going alert UI components.
// TimeInModal now requires a selfie before confirming arrival.
//
// DB requirement:
//   ALTER TABLE coverage_assignments ADD COLUMN IF NOT EXISTS selfie_url text;
//
// Import:
//   import { TimeInModal, OnGoingAlertDialog } from "../../components/staff/TimeInComponents";
//
// TimeInModal props:
//   open, assignment, isDark, submitting, error, onClose,
//   onConfirm(selfieFile) ← parent receives the File, handles upload + DB update
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Alert,
  Dialog, IconButton,
} from "@mui/material";
import CalendarTodayOutlinedIcon  from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon     from "@mui/icons-material/LocationOnOutlined";
import AccessTimeOutlinedIcon     from "@mui/icons-material/AccessTimeOutlined";
import HowToRegOutlinedIcon       from "@mui/icons-material/HowToRegOutlined";
import CameraAltOutlinedIcon      from "@mui/icons-material/CameraAltOutlined";
import CloseIcon                  from "@mui/icons-material/Close";
import DeleteOutlineIcon          from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon     from "@mui/icons-material/CheckCircleOutline";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD        = "#F5C52B";
const GOLD_08     = "rgba(245,197,43,0.08)";
const CHARCOAL    = "#353535";
const BORDER      = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG    = "rgba(53,53,53,0.03)";
const dm          = "'DM Sans', sans-serif";

// ── Shared micro-components ───────────────────────────────────────────────────
function MetaItem({ icon, children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
      <Box sx={{ color: "text.disabled" }}>{icon}</Box>
      <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: "text.secondary" }}>
        {children}
      </Typography>
    </Box>
  );
}

function CancelBtn({ onClick, disabled, border }) {
  return (
    <Box
      onClick={!disabled ? onClick : undefined}
      sx={{
        px: 1.75, py: 0.65, borderRadius: "8px",
        cursor: disabled ? "default" : "pointer",
        border: `1px solid ${border}`,
        fontFamily: dm, fontSize: "0.8rem", fontWeight: 500,
        color: "text.secondary", opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        "&:hover": { color: "text.primary", backgroundColor: HOVER_BG },
      }}
    >
      Cancel
    </Box>
  );
}

function PrimaryBtn({ onClick, loading, disabled, children }) {
  const inactive = loading || disabled;
  return (
    <Box
      onClick={!inactive ? onClick : undefined}
      sx={{
        display: "flex", alignItems: "center", gap: 0.6,
        px: 1.75, py: 0.65, borderRadius: "8px",
        cursor: inactive ? "default" : "pointer",
        backgroundColor: inactive ? (GOLD + "80") : GOLD,
        color: CHARCOAL,
        fontFamily: dm, fontSize: "0.8rem", fontWeight: 600,
        opacity: inactive ? 0.7 : 1,
        transition: "background-color 0.15s",
        "&:hover": { backgroundColor: inactive ? (GOLD + "80") : "#e6b920" },
      }}
    >
      {loading && <CircularProgress size={13} sx={{ color: CHARCOAL }} />}
      {children}
    </Box>
  );
}

// ── SelfieCapture ─────────────────────────────────────────────────────────────
// Handles both mobile (native camera via input[capture]) and
// desktop (file picker fallback). Burns date/time onto the photo via canvas
// before passing the stamped file up to the parent.
function SelfieCapture({ selfieFile, onCapture, onClear, isDark, border }) {
  const inputRef   = useRef(null);
  const previewUrl = selfieFile ? URL.createObjectURL(selfieFile) : null;

  // ── Stamp date/time onto image using canvas ───────────────────────────────
  const stampImage = useCallback((file) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");

      // Draw original photo
      ctx.drawImage(img, 0, 0);

      // ── Timestamp text ──
      const now       = new Date();
      const dateLine  = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const timeLine  = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
      const stampText = `${dateLine}  ${timeLine}`;

      const fontSize  = Math.max(20, Math.round(img.width * 0.035));
      const padding   = Math.round(fontSize * 0.6);
      const barHeight = fontSize + padding * 2;

      // Semi-transparent dark bar at bottom
      ctx.fillStyle = "rgba(0, 0, 0, 0.52)";
      ctx.fillRect(0, img.height - barHeight, img.width, barHeight);

      // Gold timestamp text
      ctx.font         = `bold ${fontSize}px 'DM Sans', Arial, sans-serif`;
      ctx.fillStyle    = "#F5C52B";
      ctx.textAlign    = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(stampText, padding, img.height - barHeight / 2);

      // Export canvas as File
      canvas.toBlob((blob) => {
        if (!blob) return;
        const stampedFile = new File(
          [blob],
          `login-proof-${Date.now()}.jpg`,
          { type: "image/jpeg" }
        );
        onCapture(stampedFile);
      }, "image/jpeg", 0.92);

      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [onCapture]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return;
    stampImage(file);
    e.target.value = "";
  };

  return (
    <Box>
      <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.09em", mb: 0.75 }}>
        Selfie Proof <Box component="span" sx={{ color: "#ef4444" }}>*</Box>
      </Typography>

      {!selfieFile ? (
        // ── No photo yet — show capture button ──
        <Box
          onClick={() => inputRef.current?.click()}
          sx={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 1, py: 3, borderRadius: "10px", cursor: "pointer",
            border: `1.5px dashed ${isDark ? "rgba(255,255,255,0.12)" : "rgba(53,53,53,0.15)"}`,
            backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)",
            transition: "all 0.15s",
            "&:hover": {
              borderColor: GOLD,
              backgroundColor: GOLD_08,
            },
          }}
        >
          <Box sx={{
            width: 44, height: 44, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: isDark ? "rgba(245,197,43,0.1)" : "rgba(245,197,43,0.12)",
          }}>
            <CameraAltOutlinedIcon sx={{ fontSize: 22, color: GOLD }} />
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", fontWeight: 600, color: "text.primary" }}>
              Take a selfie
            </Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary", mt: 0.2 }}>
              Opens front camera on mobile · file picker on desktop
            </Typography>
          </Box>
        </Box>
      ) : (
        // ── Photo taken — show preview ──
        <Box sx={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: `1px solid rgba(34,197,94,0.35)` }}>
          <Box
            component="img"
            src={previewUrl}
            alt="Selfie preview"
            sx={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }}
          />
          {/* Green checkmark overlay */}
          <Box sx={{
            position: "absolute", top: 8, left: 8,
            display: "flex", alignItems: "center", gap: 0.5,
            px: 1, py: 0.4, borderRadius: "6px",
            backgroundColor: "rgba(0,0,0,0.55)",
          }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 13, color: "#4ade80" }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 600, color: "#4ade80" }}>
              Photo taken
            </Typography>
          </Box>
          {/* Retake button */}
          <Box
            onClick={() => { onClear(); inputRef.current?.click(); }}
            sx={{
              position: "absolute", top: 8, right: 8,
              display: "flex", alignItems: "center", gap: 0.4,
              px: 1, py: 0.4, borderRadius: "6px", cursor: "pointer",
              backgroundColor: "rgba(0,0,0,0.55)",
              transition: "background 0.12s",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.75)" },
            }}
          >
            <DeleteOutlineIcon sx={{ fontSize: 13, color: "#fff" }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 500, color: "#fff" }}>
              Retake
            </Typography>
          </Box>
        </Box>
      )}

      {/* Hidden file input — capture="user" opens front camera on mobile */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="user"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TimeInModal
// Props:
//   open        boolean
//   assignment  object  — coverage_assignment row with .request join
//   isDark      boolean
//   submitting  boolean
//   error       string
//   onClose     () => void
//   onConfirm   (selfieFile: File) => void  — parent handles upload + DB update
// ─────────────────────────────────────────────────────────────────────────────
export function TimeInModal({ open, assignment, isDark, submitting, error, onClose, onConfirm }) {
  const [selfieFile, setSelfieFile] = useState(null);
  const border = isDark ? BORDER_DARK : BORDER;
  const req    = assignment?.request;

  const handleClose = () => {
    if (submitting) return;
    setSelfieFile(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!selfieFile || submitting) return;
    onConfirm(selfieFile);
  };

  // Reset selfie when modal closes
  React.useEffect(() => {
    if (!open) setSelfieFile(null);
  }, [open]);

  if (!assignment) return null;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 8px 40px rgba(53,53,53,0.12)",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 2.5, height: 26, borderRadius: "2px", backgroundColor: GOLD, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>
              Confirm Arrival
            </Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary" }}>
              Take a selfie to verify you're at the venue
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small" onClick={handleClose} disabled={submitting}
          sx={{ borderRadius: "8px", color: "text.secondary", "&:hover": { backgroundColor: HOVER_BG } }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        {error && (
          <Alert severity="error" sx={{ borderRadius: "8px", fontFamily: dm, fontSize: "0.78rem" }}>
            {error}
          </Alert>
        )}

        {/* Event summary */}
        <Box sx={{
          px: 1.75, py: 1.5, borderRadius: "8px",
          border: `1px solid ${border}`,
          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)",
          display: "flex", flexDirection: "column", gap: 0.9,
        }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.84rem", fontWeight: 600, color: "text.primary" }}>
            {req?.title}
          </Typography>
          {req?.event_date && (
            <MetaItem icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 11 }} />}>
              {new Date(req.event_date).toLocaleDateString("en-US", {
                weekday: "long", month: "long", day: "numeric", year: "numeric",
              })}
            </MetaItem>
          )}
          {req?.from_time && (
            <MetaItem icon={<AccessTimeOutlinedIcon sx={{ fontSize: 11 }} />}>
              {req.from_time}{req.to_time ? ` — ${req.to_time}` : ""}
            </MetaItem>
          )}
          {req?.venue && (
            <MetaItem icon={<LocationOnOutlinedIcon sx={{ fontSize: 11 }} />}>
              {req.venue}
            </MetaItem>
          )}
        </Box>

        {/* Selfie capture */}
        <SelfieCapture
          selfieFile={selfieFile}
          onCapture={setSelfieFile}
          onClear={() => setSelfieFile(null)}
          isDark={isDark}
          border={border}
        />

        {/* No selfie warning */}
        {!selfieFile && (
          <Box sx={{
            display: "flex", gap: 1, px: 1.5, py: 1,
            borderRadius: "8px",
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(53,53,53,0.03)",
            border: `1px solid ${border}`,
          }}>
            <Typography sx={{ fontFamily: dm, fontSize: "0.74rem", color: "text.secondary", lineHeight: 1.55 }}>
              A selfie is required to confirm your arrival. This photo will be visible to admins.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box sx={{
        px: 3, py: 1.75, borderTop: `1px solid ${border}`,
        display: "flex", justifyContent: "flex-end", gap: 1,
        backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)",
      }}>
        <CancelBtn onClick={handleClose} disabled={submitting} border={border} />
        <PrimaryBtn onClick={handleConfirm} loading={submitting} disabled={!selfieFile}>
          {!submitting && <HowToRegOutlinedIcon sx={{ fontSize: 14 }} />}
          Confirm Arrival
        </PrimaryBtn>
      </Box>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OnGoingAlertDialog
// Auto-popup that fires when the event is ≤10 mins away.
// Props:
//   open, assignment, isDark, onClose, onTimeIn(assignment)
// ─────────────────────────────────────────────────────────────────────────────
export function OnGoingAlertDialog({ open, assignment, isDark, onClose, onTimeIn }) {
  if (!assignment) return null;

  const req    = assignment.request;
  const border = isDark ? BORDER_DARK : BORDER;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          backgroundColor: "background.paper",
          border: `1px solid rgba(59,130,246,0.3)`,
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.7)"
            : "0 8px 48px rgba(59,130,246,0.18)",
        },
      }}
    >
      {/* Blue accent bar */}
      <Box sx={{
        height: 3,
        background: "linear-gradient(90deg, #3b82f6, #60a5fa)",
        borderRadius: "14px 14px 0 0",
      }} />

      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          {/* Pulsing blue dot */}
          <Box sx={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
            <Box sx={{
              position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "#3b82f6",
              animation: "ping 1.4s ease-in-out infinite",
              "@keyframes ping": {
                "0%":   { transform: "scale(1)",   opacity: 0.7 },
                "100%": { transform: "scale(2.2)", opacity: 0   },
              },
            }} />
            <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", bgcolor: "#3b82f6" }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>
              Coverage Starting Soon
            </Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary" }}>
              Your event is about to begin
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small" onClick={onClose}
          sx={{ borderRadius: "8px", color: "text.secondary", mt: -0.25, "&:hover": { backgroundColor: HOVER_BG } }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{
          px: 1.75, py: 1.5, borderRadius: "8px",
          border: `1px solid rgba(59,130,246,0.2)`,
          backgroundColor: "rgba(59,130,246,0.04)",
          display: "flex", flexDirection: "column", gap: 0.9,
        }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}>
            {req?.title}
          </Typography>
          {req?.from_time && (
            <MetaItem icon={<AccessTimeOutlinedIcon sx={{ fontSize: 11, color: "#3b82f6" }} />}>
              {req.from_time}{req.to_time ? ` — ${req.to_time}` : ""}
            </MetaItem>
          )}
          {req?.venue && (
            <MetaItem icon={<LocationOnOutlinedIcon sx={{ fontSize: 11, color: "#3b82f6" }} />}>
              {req.venue}
            </MetaItem>
          )}
        </Box>

        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.6, px: 0.25 }}>
          Proceed to the venue and tap <strong style={{ color: "inherit" }}>Time In</strong> when you arrive. You'll need to take a selfie to confirm.
        </Typography>
      </Box>

      {/* Footer */}
      <Box sx={{
        px: 3, py: 1.75, borderTop: `1px solid ${border}`,
        display: "flex", justifyContent: "flex-end", gap: 1,
        backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)",
      }}>
        <CancelBtn onClick={onClose} border={border} />
        <Box
          onClick={() => { onClose(); onTimeIn(assignment); }}
          sx={{
            display: "flex", alignItems: "center", gap: 0.6,
            px: 1.75, py: 0.65, borderRadius: "8px", cursor: "pointer",
            backgroundColor: "#3b82f6", color: "#fff",
            fontFamily: dm, fontSize: "0.8rem", fontWeight: 600,
            transition: "background-color 0.15s",
            "&:hover": { backgroundColor: "#2563eb" },
          }}
        >
          <HowToRegOutlinedIcon sx={{ fontSize: 14 }} />
          Time In
        </Box>
      </Box>
    </Dialog>
  );
}