import React from "react";
import { Box, Typography } from "@mui/material";

const DEFAULT_FONT = "'Inter', sans-serif";
const DEFAULT_ACTIVE_BG = "#F5C52B";
const DEFAULT_INACTIVE_BG = "rgba(53,53,53,0.45)";

export default function NumberBadge({
  count,
  active = false,
  size = 15,
  activeBg = DEFAULT_ACTIVE_BG,
  inactiveBg = DEFAULT_INACTIVE_BG,
  textColor = "#ffffff",
  fontFamily = DEFAULT_FONT,
  fontSize = "0.58rem",
  fontWeight = 700,
  sx,
}) {
  if (typeof count !== "number") return null;

  return (
    <Box
      sx={{
        width: size,
        height: size,
        borderRadius: "999px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: active ? activeBg : inactiveBg,
        color: textColor,
        flexShrink: 0,
        ...sx,
      }}
    >
      <Typography
        sx={{
          fontFamily,
          fontSize,
          fontWeight,
          lineHeight: 1,
          color: textColor,
        }}
      >
        {count}
      </Typography>
    </Box>
  );
}
