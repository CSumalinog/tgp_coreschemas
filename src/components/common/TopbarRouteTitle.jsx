import React from "react";
import { Box, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import { resolveRouteTitle } from "../../utils/routeTitleConfig";

const CHARCOAL = "#353535";
const dm = "'Inter', sans-serif";

function TopbarRouteTitle({ role, isMobile = false }) {
  const location = useLocation();
  const { title, description } = resolveRouteTitle(role, location.pathname);

  return (
    <Box
      sx={{
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: { xs: "0.84rem", sm: "0.95rem" },
          fontWeight: 700,
          color: CHARCOAL,
          lineHeight: 1.2,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: { xs: 165, sm: 260 },
        }}
      >
        {title}
      </Typography>
      {!isMobile && !!description && (
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.72rem",
            color: "rgba(53,53,53,0.6)",
            lineHeight: 1.2,
            mt: 0.15,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            maxWidth: 320,
          }}
        >
          {description}
        </Typography>
      )}
    </Box>
  );
}

export default TopbarRouteTitle;
