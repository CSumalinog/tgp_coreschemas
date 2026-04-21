// src/components/common/SuccessToast.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Lightweight success toast system.
//
// Usage:
//   1. Wrap your layout with <SuccessToastProvider> (replaces RealtimeToastProvider)
//   2. In any page/component, call the singleton:
//        import { pushSuccessToast } from "./SuccessToast";
//        pushSuccessToast("Request submitted successfully.");
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from "react";
import { Box, Typography, IconButton, useTheme } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlined";
import CloseIcon from "@mui/icons-material/Close";

const dm = "'Inter', sans-serif";
const GREEN = "#22c55e";
const DISMISS_MS = 3000;
const SLIDE_OUT_MS = 300;

// ── Singleton setter (allows pushSuccessToast outside React tree) ─────────────
let _setter = null;

export function _registerSuccessToastSetter(fn) {
  _setter = fn;
}

export function pushSuccessToast(message) {
  if (_setter)
    _setter((prev) => [...prev.slice(-4), { id: Date.now(), message }]);
}

// ── Single toast item ─────────────────────────────────────────────────────────
function ToastItem({ toast, onDone }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const ref = useRef(null);

  const dismiss = () => {
    const el = ref.current;
    if (!el) {
      onDone();
      return;
    }
    el.style.transition = `transform ${SLIDE_OUT_MS}ms ease, opacity ${SLIDE_OUT_MS}ms ease`;
    el.style.transform = "translateX(120%)";
    el.style.opacity = "0";
    setTimeout(onDone, SLIDE_OUT_MS);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Slide in
    el.style.transition = "none";
    el.style.transform = "translateX(120%)";
    el.style.opacity = "0";
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.style.transition =
          "transform 0.32s cubic-bezier(0.34,1.56,0.64,1), opacity 0.22s ease";
        el.style.transform = "translateX(0)";
        el.style.opacity = "1";
      });
    });

    const timer = setTimeout(dismiss, DISMISS_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Box
      ref={ref}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        width: 360,
        px: 1.5,
        py: 1.1,
        borderRadius: "10px",
        backgroundColor: isDark ? "#1a1a1a" : "#ffffff",
        border: `1px solid ${isDark ? "#2e2e2e" : "#e8e8e8"}`,
        boxShadow: isDark
          ? "0 8px 32px rgba(0,0,0,0.55)"
          : "0 4px 20px rgba(53,53,53,0.12)",
        pointerEvents: "all",
        userSelect: "none",
      }}
    >
      <CheckCircleOutlineIcon
        sx={{ fontSize: 17, color: GREEN, flexShrink: 0 }}
      />

      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.78rem",
          fontWeight: 500,
          color: isDark ? "#f5f5f5" : "#212121",
          flex: 1,
          lineHeight: 1.4,
        }}
      >
        {toast.message}
      </Typography>

      <IconButton
        size="small"
        onClick={dismiss}
        sx={{
          p: 0.3,
          flexShrink: 0,
          borderRadius: "6px",
          color: isDark ? "#777" : "#9ca3af",
          "&:hover": {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.05)",
            color: isDark ? "#ccc" : "#555",
          },
        }}
      >
        <CloseIcon sx={{ fontSize: 13 }} />
      </IconButton>
    </Box>
  );
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function SuccessToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    _registerSuccessToastSetter(setToasts);
    return () => _registerSuccessToastSetter(null);
  }, []);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  return (
    <>
      {children}

      {/* Toast stack — bottom-right */}
      <Box
        sx={{
          position: "fixed",
          bottom: 24,
          right: 24,
          display: "flex",
          flexDirection: "column-reverse",
          gap: 1,
          zIndex: 9999,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDone={() => remove(t.id)} />
        ))}
      </Box>
    </>
  );
}
