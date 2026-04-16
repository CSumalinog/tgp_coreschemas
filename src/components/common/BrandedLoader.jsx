import React from "react";
import { Box, LinearProgress } from "@mui/material";

const GOLD = "#F5C52B";

// size / darkBackground accepted for call-site compatibility but unused
function BrandedLoader({
  minHeight = "40vh",
  fullScreen = false,
  inline = false,
}) {
  const bar = (
    <LinearProgress
      sx={{
        width: 140,
        borderRadius: 4,
        backgroundColor: "rgba(245, 197, 43, 0.15)",
        "& .MuiLinearProgress-bar": { backgroundColor: GOLD },
      }}
    />
  );

  if (inline) return bar;

  return (
    <Box
      sx={{
        minHeight: fullScreen ? "100vh" : minHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {bar}
    </Box>
  );
}

export default BrandedLoader;
