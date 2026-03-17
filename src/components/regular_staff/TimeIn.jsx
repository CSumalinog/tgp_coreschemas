// src/components/staff/TimeInComponents.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Time In / On Going alert UI components.
//
// Both normal and emergency Time In require:
//   ✓ GPS verification (within 400m of CSU Main Campus academic core)
//   ✓ Selfie with baked-in timestamp
//
// GPS is a soft requirement:
//   - Granted + on campus  → proceeds normally (gps_verified = true)
//   - Granted + off campus → soft warning, flagged for admin review (gps_verified = false)
//   - Denied / unavailable → allowed but flagged (gps_verified = false)
//
// Emergency Time In (is_reassigned = true):
//   - Same proof requirements
//   - No retake option (faster UX)
//   - Auto-submits after photo capture
//
// DB requirements:
//   ALTER TABLE coverage_assignments
//   ADD COLUMN IF NOT EXISTS selfie_url   text,
//   ADD COLUMN IF NOT EXISTS gps_lat      numeric,
//   ADD COLUMN IF NOT EXISTS gps_lng      numeric,
//   ADD COLUMN IF NOT EXISTS gps_verified boolean DEFAULT false;
//
// onConfirm receives: { selfieFile, gpsData }
//   gpsData = { lat, lng, verified } | null
//
// Import:
//   import { TimeInModal, OnGoingAlertDialog } from "../../components/staff/TimeInComponents";
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useRef, useCallback, useEffect } from "react";
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
import GpsFixedIcon               from "@mui/icons-material/GpsFixed";
import GpsNotFixedIcon            from "@mui/icons-material/GpsNotFixed";
import GpsOffIcon                 from "@mui/icons-material/GpsOff";
import WarningAmberOutlinedIcon   from "@mui/icons-material/WarningAmberOutlined";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD        = "#F5C52B";
const GOLD_08     = "rgba(245,197,43,0.08)";
const CHARCOAL    = "#353535";
const BORDER      = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG    = "rgba(53,53,53,0.03)";
const dm          = "'DM Sans', sans-serif";

// ── CSU Main Campus — academic core coordinates ───────────────────────────────
// Center: confirmed on-campus location (Brgy. Ampayon, Butuan City)
// Radius: 400m covers all academic buildings in the 32-hectare core
const CSU_CAMPUS = {
  lat:    8.955481,
  lng:    125.597788,
  radius: 400,
};

// ── Haversine distance calculator ─────────────────────────────────────────────
function getDistanceMeters(lat1, lng1, lat2, lng2) {
  const R    = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a    =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function isOnCampus(lat, lng) {
  return getDistanceMeters(lat, lng, CSU_CAMPUS.lat, CSU_CAMPUS.lng) <= CSU_CAMPUS.radius;
}

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
        display: "flex", alignItems: "center", justifyContent: "center", gap: 0.6,
        px: 2, py: 0.75, borderRadius: "8px",
        cursor: inactive ? "default" : "pointer",
        backgroundColor: inactive ? "rgba(245,197,43,0.45)" : GOLD,
        color: inactive ? "rgba(53,53,53,0.5)" : CHARCOAL,
        fontFamily: dm, fontSize: "0.8rem", fontWeight: 600,
        whiteSpace: "nowrap", flexShrink: 0,
        transition: "background-color 0.15s",
        "&:hover": { backgroundColor: inactive ? "rgba(245,197,43,0.45)" : "#e6b920" },
      }}
    >
      {loading && <CircularProgress size={13} sx={{ color: CHARCOAL }} />}
      {children}
    </Box>
  );
}

// ── GPSStatus pill ────────────────────────────────────────────────────────────
function GPSStatusPill({ status, isDark }) {
  const cfg = {
    idle:        { icon: GpsNotFixedIcon, color: "text.secondary",  bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(53,53,53,0.04)", label: "Checking location…"           },
    checking:    { icon: GpsNotFixedIcon, color: "#3b82f6",          bg: "rgba(59,130,246,0.08)",           label: "Getting your location…"         },
    verified:    { icon: GpsFixedIcon,    color: "#15803d",          bg: "rgba(34,197,94,0.08)",            label: "On campus ✓"                    },
    outside:     { icon: GpsOffIcon,      color: "#b45309",          bg: "rgba(245,197,43,0.08)",           label: "Location unverified"            },
    denied:      { icon: GpsOffIcon,      color: "#b45309",          bg: "rgba(245,197,43,0.08)",           label: "Location access denied"         },
    unavailable: { icon: GpsOffIcon,      color: "text.secondary",  bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(53,53,53,0.04)", label: "GPS unavailable" },
  }[status] || {};

  const Icon = cfg.icon || GpsNotFixedIcon;

  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 0.75,
      px: 1.25, py: 0.75, borderRadius: "8px",
      backgroundColor: cfg.bg,
      border: `1px solid ${status === "verified" ? "rgba(34,197,94,0.25)" : (isDark ? BORDER_DARK : BORDER)}`,
    }}>
      {status === "checking" || status === "idle"
        ? <CircularProgress size={13} sx={{ color: "#3b82f6" }} />
        : <Icon sx={{ fontSize: 14, color: cfg.color }} />
      }
      <Typography sx={{ fontFamily: dm, fontSize: "0.74rem", fontWeight: 500, color: cfg.color }}>
        {cfg.label}
      </Typography>
    </Box>
  );
}

// ── SelfieCapture ─────────────────────────────────────────────────────────────
function SelfieCapture({ selfieFile, onCapture, onClear, isDark, border, isEmergency }) {
  const inputRef   = useRef(null);
  const previewUrl = selfieFile ? URL.createObjectURL(selfieFile) : null;

  const stampImage = useCallback((file) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas     = document.createElement("canvas");
      canvas.width     = img.width;
      canvas.height    = img.height;
      const ctx        = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0);

      const now       = new Date();
      const dateLine  = now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const timeLine  = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", second: "2-digit" });
      const stampText = `${dateLine}  ${timeLine}`;

      const fontSize  = Math.max(20, Math.round(img.width * 0.035));
      const padding   = Math.round(fontSize * 0.6);
      const barHeight = fontSize + padding * 2;

      ctx.fillStyle    = "rgba(0,0,0,0.52)";
      ctx.fillRect(0, img.height - barHeight, img.width, barHeight);
      ctx.font         = `bold ${fontSize}px 'DM Sans', Arial, sans-serif`;
      ctx.fillStyle    = "#F5C52B";
      ctx.textAlign    = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(stampText, padding, img.height - barHeight / 2);

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
    if (!file || !file.type.startsWith("image/")) return;
    stampImage(file);
    e.target.value = "";
  };

  return (
    <Box>
      <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.09em", mb: 0.75 }}>
        Selfie Proof <Box component="span" sx={{ color: "#ef4444" }}>*</Box>
        {isEmergency && (
          <Box component="span" sx={{ ml: 1, px: 0.75, py: 0.1, borderRadius: "4px", backgroundColor: "rgba(198,40,40,0.1)", color: "#c62828", fontSize: "0.6rem", fontWeight: 700, letterSpacing: "0.06em" }}>
            EMERGENCY
          </Box>
        )}
      </Typography>

      {!selfieFile ? (
        <Box
          onClick={() => inputRef.current?.click()}
          sx={{
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 1, py: 3, borderRadius: "10px", cursor: "pointer",
            border: `1.5px dashed ${isEmergency ? "rgba(198,40,40,0.3)" : (isDark ? "rgba(255,255,255,0.12)" : "rgba(53,53,53,0.15)")}`,
            backgroundColor: isEmergency ? "rgba(198,40,40,0.03)" : (isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)"),
            transition: "all 0.15s",
            "&:hover": {
              borderColor: isEmergency ? "#c62828" : GOLD,
              backgroundColor: isEmergency ? "rgba(198,40,40,0.06)" : GOLD_08,
            },
          }}
        >
          <Box sx={{
            width: 44, height: 44, borderRadius: "50%",
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: isEmergency ? "rgba(198,40,40,0.1)" : (isDark ? "rgba(245,197,43,0.1)" : "rgba(245,197,43,0.12)"),
          }}>
            <CameraAltOutlinedIcon sx={{ fontSize: 22, color: isEmergency ? "#c62828" : GOLD }} />
          </Box>
          <Box sx={{ textAlign: "center" }}>
            <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", fontWeight: 600, color: "text.primary" }}>
              {isEmergency ? "Take selfie now" : "Take a selfie"}
            </Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary", mt: 0.2 }}>
              {isEmergency ? "No retake — captured immediately" : "Opens front camera on mobile · file picker on desktop"}
            </Typography>
          </Box>
        </Box>
      ) : (
        <Box sx={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: `1px solid rgba(34,197,94,0.35)` }}>
          <Box component="img" src={previewUrl} alt="Selfie preview"
            sx={{ width: "100%", maxHeight: 220, objectFit: "cover", display: "block" }} />
          <Box sx={{ position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.4, borderRadius: "6px", backgroundColor: "rgba(0,0,0,0.55)" }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 13, color: "#4ade80" }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 600, color: "#4ade80" }}>Photo taken</Typography>
          </Box>
          {!isEmergency && (
            <Box onClick={() => { onClear(); inputRef.current?.click(); }}
              sx={{ position: "absolute", top: 8, right: 8, display: "flex", alignItems: "center", gap: 0.4, px: 1, py: 0.4, borderRadius: "6px", cursor: "pointer", backgroundColor: "rgba(0,0,0,0.55)", transition: "background 0.12s", "&:hover": { backgroundColor: "rgba(0,0,0,0.75)" } }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 13, color: "#fff" }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 500, color: "#fff" }}>Retake</Typography>
            </Box>
          )}
        </Box>
      )}

      <input ref={inputRef} type="file" accept="image/*" capture="user"
        style={{ display: "none" }} onChange={handleFileChange} />
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TimeInModal
// ─────────────────────────────────────────────────────────────────────────────
export function TimeInModal({ open, assignment, isDark, submitting, error, onClose, onConfirm }) {
  const [selfieFile, setSelfieFile] = useState(null);
  const [gpsStatus,  setGpsStatus]  = useState("idle");
  const [gpsData,    setGpsData]    = useState(null);

  const border      = isDark ? BORDER_DARK : BORDER;
  const req         = assignment?.request;
  const isEmergency = !!assignment?.is_reassigned;

  // ── Request GPS when modal opens ──────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    setGpsStatus("checking");
    setGpsData(null);

    if (!navigator.geolocation) {
      setGpsStatus("unavailable");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat      = pos.coords.latitude;
        const lng      = pos.coords.longitude;
        const verified = isOnCampus(lat, lng);
        setGpsData({ lat, lng, verified });
        setGpsStatus(verified ? "verified" : "outside");
      },
      () => {
        setGpsStatus("denied");
        setGpsData({ lat: null, lng: null, verified: false });
      },
      { timeout: 10000, maximumAge: 0, enableHighAccuracy: true }
    );
  }, [open]);

  useEffect(() => {
    if (!open) { setSelfieFile(null); setGpsStatus("idle"); setGpsData(null); }
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    setSelfieFile(null);
    onClose();
  };

  const handleConfirm = () => {
    if (!selfieFile || submitting) return;
    if (gpsStatus === "outside") return; // hard block if off campus
    const file = selfieFile;
    setSelfieFile(null);
    onClose();
    onConfirm({ selfieFile: file, gpsData });
  };

  const handleEmergencyCapture = useCallback((file) => {
    setSelfieFile(file);
    setTimeout(() => {
      onClose();
      onConfirm({ selfieFile: file, gpsData });
    }, 600);
  }, [gpsData, onClose, onConfirm]);

  if (!assignment) return null;

  const canConfirm = !!selfieFile && gpsStatus !== "outside" && gpsStatus !== "checking";

  return (
    <Dialog
      open={open} onClose={handleClose}
      maxWidth="xs" fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          backgroundColor: "background.paper",
          border: `1px solid ${isEmergency ? "rgba(198,40,40,0.3)" : border}`,
          boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.6)" : "0 8px 40px rgba(53,53,53,0.12)",
        },
      }}
    >
      {isEmergency && (
        <Box sx={{ height: 3, background: "linear-gradient(90deg, #c62828, #ef5350)", borderRadius: "14px 14px 0 0" }} />
      )}

      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 2.5, height: 26, borderRadius: "2px", backgroundColor: isEmergency ? "#c62828" : GOLD, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>
              {isEmergency ? "Emergency Check-In" : "Confirm Arrival"}
            </Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary" }}>
              {isEmergency ? "GPS + selfie required · no retake" : "GPS + selfie required to verify presence"}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={handleClose} disabled={submitting}
          sx={{ borderRadius: "8px", color: "text.secondary", "&:hover": { backgroundColor: HOVER_BG } }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        {error && <Alert severity="error" sx={{ borderRadius: "8px", fontFamily: dm, fontSize: "0.78rem" }}>{error}</Alert>}

        {/* Event summary */}
        <Box sx={{ px: 1.75, py: 1.5, borderRadius: "8px", border: `1px solid ${border}`, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)", display: "flex", flexDirection: "column", gap: 0.9 }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.84rem", fontWeight: 600, color: "text.primary" }}>{req?.title}</Typography>
          {req?.event_date && (
            <MetaItem icon={<CalendarTodayOutlinedIcon sx={{ fontSize: 11 }} />}>
              {new Date(req.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
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

        {/* GPS status */}
        <Box>
          <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.09em", mb: 0.75 }}>
            Location Verification
          </Typography>
          <GPSStatusPill status={gpsStatus} isDark={isDark} />

          {/* Hard block for outside */}
          {gpsStatus === "outside" && (
            <Box sx={{ display: "flex", gap: 0.75, mt: 1, px: 1.25, py: 1, borderRadius: "8px", backgroundColor: "rgba(198,40,40,0.06)", border: `1px solid rgba(198,40,40,0.2)` }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: "#c62828", flexShrink: 0, mt: 0.1 }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.73rem", color: "#c62828", lineHeight: 1.55 }}>
                You must be on the CSU Main Campus to check in. Please proceed to the venue.
              </Typography>
            </Box>
          )}
          {(gpsStatus === "denied" || gpsStatus === "unavailable") && (
            <Box sx={{ display: "flex", gap: 0.75, mt: 1, px: 1.25, py: 1, borderRadius: "8px", backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.06)", border: `1px solid rgba(245,197,43,0.3)` }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: "#b45309", flexShrink: 0, mt: 0.1 }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.73rem", color: "#b45309", lineHeight: 1.55 }}>
                Location unavailable — your check-in will be flagged for admin review.
              </Typography>
            </Box>
          )}
        </Box>

        {/* Selfie — only show if not hard blocked by GPS */}
        {gpsStatus !== "outside" && (
          <SelfieCapture
            selfieFile={selfieFile}
            onCapture={isEmergency ? handleEmergencyCapture : setSelfieFile}
            onClear={() => setSelfieFile(null)}
            isDark={isDark}
            border={border}
            isEmergency={isEmergency}
          />
        )}

        {!isEmergency && !selfieFile && gpsStatus !== "outside" && (
          <Box sx={{ display: "flex", gap: 1, px: 1.5, py: 1, borderRadius: "8px", backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(53,53,53,0.03)", border: `1px solid ${border}` }}>
            <Typography sx={{ fontFamily: dm, fontSize: "0.74rem", color: "text.secondary", lineHeight: 1.55 }}>
              A selfie is required. This photo will be visible to admins.
            </Typography>
          </Box>
        )}

        {isEmergency && !selfieFile && gpsStatus !== "outside" && (
          <Box sx={{ display: "flex", gap: 1, px: 1.5, py: 1, borderRadius: "8px", backgroundColor: "rgba(198,40,40,0.04)", border: `1px solid rgba(198,40,40,0.2)` }}>
            <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: "#c62828", flexShrink: 0, mt: 0.1 }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.74rem", color: "#c62828", lineHeight: 1.55 }}>
              Emergency check-in — photo submits automatically. No retake.
            </Typography>
          </Box>
        )}
      </Box>

      {/* Footer — normal flow only */}
      {!isEmergency && (
        <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 1, flexShrink: 0, backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)" }}>
          <CancelBtn onClick={handleClose} disabled={submitting} border={border} />
          <PrimaryBtn onClick={handleConfirm} loading={submitting} disabled={!canConfirm}>
            {!submitting && <HowToRegOutlinedIcon sx={{ fontSize: 14 }} />}
            Confirm Arrival
          </PrimaryBtn>
        </Box>
      )}
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OnGoingAlertDialog
// ─────────────────────────────────────────────────────────────────────────────
export function OnGoingAlertDialog({ open, assignment, isDark, onClose, onTimeIn }) {
  if (!assignment) return null;

  const req         = assignment.request;
  const border      = isDark ? BORDER_DARK : BORDER;
  const isEmergency = !!assignment?.is_reassigned;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          backgroundColor: "background.paper",
          border: `1px solid ${isEmergency ? "rgba(198,40,40,0.3)" : "rgba(59,130,246,0.3)"}`,
          boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.7)" : "0 8px 48px rgba(59,130,246,0.18)",
        },
      }}
    >
      <Box sx={{
        height: 3,
        background: isEmergency
          ? "linear-gradient(90deg, #c62828, #ef5350)"
          : "linear-gradient(90deg, #3b82f6, #60a5fa)",
        borderRadius: "14px 14px 0 0",
      }} />

      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ position: "relative", width: 10, height: 10, flexShrink: 0 }}>
            <Box sx={{
              position: "absolute", inset: 0, borderRadius: "50%",
              bgcolor: isEmergency ? "#c62828" : "#3b82f6",
              animation: "ping 1.4s ease-in-out infinite",
              "@keyframes ping": { "0%": { transform: "scale(1)", opacity: 0.7 }, "100%": { transform: "scale(2.2)", opacity: 0 } },
            }} />
            <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", bgcolor: isEmergency ? "#c62828" : "#3b82f6" }} />
          </Box>
          <Box>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>
              {isEmergency ? "⚠ Emergency Assignment" : "Coverage Starting Soon"}
            </Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary" }}>
              {isEmergency ? "You've been urgently reassigned" : "Your event is about to begin"}
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose}
          sx={{ borderRadius: "8px", color: "text.secondary", mt: -0.25, "&:hover": { backgroundColor: HOVER_BG } }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 1.5 }}>
        <Box sx={{
          px: 1.75, py: 1.5, borderRadius: "8px",
          border: `1px solid ${isEmergency ? "rgba(198,40,40,0.2)" : "rgba(59,130,246,0.2)"}`,
          backgroundColor: isEmergency ? "rgba(198,40,40,0.04)" : "rgba(59,130,246,0.04)",
          display: "flex", flexDirection: "column", gap: 0.9,
        }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700, color: "text.primary", lineHeight: 1.3 }}>
            {req?.title}
          </Typography>
          {req?.from_time && (
            <MetaItem icon={<AccessTimeOutlinedIcon sx={{ fontSize: 11, color: isEmergency ? "#c62828" : "#3b82f6" }} />}>
              {req.from_time}{req.to_time ? ` — ${req.to_time}` : ""}
            </MetaItem>
          )}
          {req?.venue && (
            <MetaItem icon={<LocationOnOutlinedIcon sx={{ fontSize: 11, color: isEmergency ? "#c62828" : "#3b82f6" }} />}>
              {req.venue}
            </MetaItem>
          )}
        </Box>

        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: isEmergency ? "#c62828" : "text.secondary", lineHeight: 1.6, px: 0.25, fontWeight: isEmergency ? 600 : 400 }}>
          {isEmergency
            ? "Proceed to the venue immediately. GPS + selfie required. You have 5 minutes to check in."
            : "Proceed to the venue and tap Time In when you arrive. GPS + selfie required to confirm."}
        </Typography>
      </Box>

      {/* Footer */}
      <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)" }}>
        {!isEmergency && <CancelBtn onClick={onClose} border={border} />}
        <Box
          onClick={() => { onClose(); onTimeIn(assignment); }}
          sx={{
            display: "flex", alignItems: "center", gap: 0.6,
            px: 1.75, py: 0.65, borderRadius: "8px", cursor: "pointer",
            backgroundColor: isEmergency ? "#c62828" : "#3b82f6",
            color: "#fff",
            fontFamily: dm, fontSize: "0.8rem", fontWeight: 600,
            transition: "background-color 0.15s",
            "&:hover": { backgroundColor: isEmergency ? "#b71c1c" : "#2563eb" },
          }}
        >
          <HowToRegOutlinedIcon sx={{ fontSize: 14 }} />
          {isEmergency ? "Check In Now" : "Time In"}
        </Box>
      </Box>
    </Dialog>
  );
}