import React from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { DM, GOLD_08, RED, RED_08 } from "./sharedStyles.jsx";

export default function RequestBulkBar({
  count,
  actions,
  actionLoading,
  isDark,
  border,
}) {
  if (count === 0) return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1,
        mb: 1.5,
        borderRadius: "10px",
        backgroundColor: isDark ? "rgba(245,197,43,0.06)" : GOLD_08,
        border: `1px solid ${isDark ? "rgba(245,197,43,0.15)" : "rgba(245,197,43,0.25)"}`,
      }}
    >
      <Typography sx={{ fontFamily: DM, fontSize: "0.78rem", fontWeight: 600, color: "text.primary" }}>
        {count} selected
      </Typography>
      <Box sx={{ flex: 1 }} />
      {actions.map((action) => (
        <Tooltip key={action.label} title={action.label} arrow>
          <span>
            <IconButton
              size="small"
              disabled={actionLoading}
              onClick={action.onClick}
              sx={{
                width: 32,
                height: 32,
                borderRadius: "4px",
                color: action.destructive ? RED : "text.secondary",
                backgroundColor: action.destructive
                  ? RED_08
                  : isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(53,53,53,0.04)",
                border: `1px solid ${action.destructive ? "rgba(220,38,38,0.2)" : border}`,
                "&:hover": {
                  backgroundColor: action.destructive
                    ? "rgba(220,38,38,0.15)"
                    : isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(53,53,53,0.08)",
                },
              }}
            >
              {action.icon}
            </IconButton>
          </span>
        </Tooltip>
      ))}
    </Box>
  );
}
