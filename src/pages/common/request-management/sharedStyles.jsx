import React from "react";
import { Box, Typography } from "@mui/material";

export const GOLD = "#F5C52B";
export const GOLD_08 = "rgba(245,197,43,0.08)";
export const BORDER = "rgba(53,53,53,0.08)";
export const BORDER_DARK = "rgba(255,255,255,0.08)";
export const DM = "'Inter', sans-serif";
export const RED = "#dc2626";
export const RED_08 = "rgba(220,38,38,0.08)";

const STATUS_CONFIG = {
  Pending: { bg: "#fef9ec", color: "#b45309", dot: "#f59e0b" },
  Forwarded: { bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  Assigned: { bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  "For Approval": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Approved: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  "On Going": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Completed: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  Declined: { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
  Cancelled: { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
};

export const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "\u2014";

const fmtDateStr = (d) => {
  if (!d) return "\u2014";
  return new Date(`${d}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const buildEventDateDisplay = (req) => {
  if (req.is_multiday && req.event_days?.length > 0) {
    const sorted = [...req.event_days].sort((a, b) => a.date.localeCompare(b.date));
    const first = new Date(`${sorted[0].date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    const last = new Date(`${sorted[sorted.length - 1].date}T00:00:00`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return sorted.length === 1 ? fmtDateStr(sorted[0].date) : `${first} \u2013 ${last}`;
  }
  return fmtDateStr(req.event_date);
};

export function StatusPill({ status, isDark }) {
  const cfg =
    STATUS_CONFIG[status] || {
      bg: "rgba(53,53,53,0.05)",
      color: "text.secondary",
      dot: "text.disabled",
    };

  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isDark ? `${cfg.dot}18` : cfg.bg,
        border: `1px solid ${isDark ? `${cfg.dot}35` : `${cfg.dot}30`}`,
      }}
    >
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: cfg.dot,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontFamily: DM,
          fontSize: "0.66rem",
          fontWeight: 700,
          color: isDark ? cfg.dot : cfg.color,
          letterSpacing: "0.04em",
        }}
      >
        {status}
      </Typography>
    </Box>
  );
}
