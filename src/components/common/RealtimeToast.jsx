// src/components/common/RealtimeToast.jsx
// ─────────────────────────────────────────────────────────────────────────────
// 1. Wrap your app (or admin layout) with <RealtimeToastProvider />
// 2. Toasts appear automatically whenever useRealtimeNotify fires.
//
// Usage in your layout:
//   import { RealtimeToastProvider } from "../components/common/RealtimeToast";
//   <RealtimeToastProvider>
//     <Outlet />
//   </RealtimeToastProvider>
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, useTheme }          from "@mui/material";
import SyncOutlinedIcon                       from "@mui/icons-material/SyncOutlined";
import { _registerToastSetter }               from "../../hooks/useRealtimeNotify";

const GOLD     = "#f5c52b";
const CHARCOAL = "#353535";
const dm       = "'Inter', sans-serif";

// ── Single toast item ─────────────────────────────────────────────────────────
function ToastItem({ toast, onDone }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const ref    = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Slide in
    el.style.transition = "none";
    el.style.transform  = "translateX(120%)";
    el.style.opacity    = "0";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition = "transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease";
        el.style.transform  = "translateX(0)";
        el.style.opacity    = "1";
      });
    });

    // Auto-dismiss after 4s
    const dismiss = setTimeout(() => {
      el.style.transition = "transform 0.3s ease, opacity 0.3s ease";
      el.style.transform  = "translateX(120%)";
      el.style.opacity    = "0";
      setTimeout(onDone, 320);
    }, 4000);

    return () => clearTimeout(dismiss);
  }, [onDone]);

  const label = toast.title
    ? toast.title.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Data updated";

  return (
    <Box
      ref={ref}
      sx={{
        display: "flex", alignItems: "center", gap: 1.25,
        px: 1.75, py: 1.1,
        borderRadius: "10px",
        backgroundColor: isDark ? "#1a1a1a" : "#fff",
        border: `1px solid ${isDark ? "#2e2e2e" : "#e8e8e8"}`,
        borderLeft: `3px solid ${GOLD}`,
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.55)"
          : "0 4px 20px rgba(53,53,53,0.12)",
        minWidth: 220, maxWidth: 300,
        cursor: "default",
        userSelect: "none",
      }}
    >
      {/* Pulsing gold dot */}
      <Box sx={{ position: "relative", flexShrink: 0, width: 8, height: 8 }}>
        <Box sx={{
          position: "absolute", inset: 0, borderRadius: "50%",
          backgroundColor: GOLD, opacity: 0.35,
          animation: "rtPulse 1.4s ease-out infinite",
          "@keyframes rtPulse": {
            "0%":   { transform: "scale(1)",   opacity: 0.35 },
            "100%": { transform: "scale(2.5)", opacity: 0    },
          },
        }} />
        <Box sx={{ position: "absolute", inset: 0, borderRadius: "50%", backgroundColor: GOLD }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{
          fontFamily: dm, fontSize: "0.76rem", fontWeight: 700,
          color: "text.primary", lineHeight: 1.2,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {label}
        </Typography>
        <Typography sx={{
          fontFamily: dm, fontSize: "0.67rem",
          color: "text.secondary", mt: 0.2,
        }}>
          Live update received
        </Typography>
      </Box>

      {/* Spinning sync icon */}
      <SyncOutlinedIcon sx={{
        fontSize: 14, color: GOLD, flexShrink: 0,
        animation: "rtSpin 1s linear 1",
        "@keyframes rtSpin": {
          from: { transform: "rotate(0deg)"   },
          to:   { transform: "rotate(360deg)" },
        },
      }} />
    </Box>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function RealtimeToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Register the setter so useRealtimeNotify can push toasts
  useEffect(() => {
    _registerToastSetter(setToasts);
    return () => _registerToastSetter(null);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {children}

      {/* Toast stack — bottom-right */}
      <Box sx={{
        position: "fixed", bottom: 24, right: 24,
        display: "flex", flexDirection: "column-reverse", gap: 1,
        zIndex: 9999, pointerEvents: "none",
      }}>
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => remove(t.id)} />
        ))}
      </Box>
    </>
  );
}