import React from "react";
import { Box, Typography } from "@mui/material";

export default function AssessCard({ title, check, issues, conflicts }) {
  const type = check?.type;
  const borderColor =
    type === "success"
      ? "#15803d"
      : type === "warning"
        ? "#d97706"
        : type === "error"
          ? "#dc2626"
          : "divider";
  const dotColor =
    type === "success"
      ? "#15803d"
      : type === "warning"
        ? "#d97706"
        : type === "error"
          ? "#dc2626"
          : "#9ca3af";
  const textColor =
    type === "success"
      ? "#15803d"
      : type === "warning"
        ? "#d97706"
        : type === "error"
          ? "#dc2626"
          : "text.secondary";
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: "10px",
        border: "1px solid",
        borderColor: "divider",
        borderLeft: `3px solid ${borderColor}`,
        backgroundColor: "background.paper",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.4 }}>
        <Box
          sx={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: dotColor,
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{ fontSize: "0.75rem", fontWeight: 700, color: "text.primary" }}
        >
          {title}
        </Typography>
      </Box>
      {check?.message && (
        <Typography
          sx={{
            fontSize: "0.73rem",
            color: textColor,
            lineHeight: 1.5,
            pl: 1.5,
          }}
        >
          {check.message}
        </Typography>
      )}
      {issues?.map((issue, idx) => (
        <Typography
          key={idx}
          sx={{
            fontSize: "0.72rem",
            color: textColor,
            lineHeight: 1.6,
            pl: 1.5,
          }}
        >
          · {issue}
        </Typography>
      ))}
      {conflicts?.map((c, idx) => (
        <Typography
          key={idx}
          sx={{
            fontSize: "0.72rem",
            color: "#d97706",
            lineHeight: 1.6,
            pl: 1.5,
          }}
        >
          · {c.title} ({c.time})
        </Typography>
      ))}
      {!type && !check?.message && (
        <Typography
          sx={{ fontSize: "0.73rem", color: "text.secondary", pl: 1.5 }}
        >
          Checking…
        </Typography>
      )}
    </Box>
  );
}
