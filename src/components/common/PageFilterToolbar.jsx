import React from "react";
import { Box } from "@mui/material";
import { FILTER_ROW_GAP } from "../../utils/layoutTokens";

export default function PageFilterToolbar({
  children,
  mb = 2,
  gap = FILTER_ROW_GAP,
  sx,
}) {
  return (
    <Box
      sx={{
        mb,
        display: "flex",
        alignItems: "center",
        gap,
        flexWrap: "nowrap",
        overflowX: "auto",
        flexShrink: 0,
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}