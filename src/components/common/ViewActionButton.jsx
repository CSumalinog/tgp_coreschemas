import React from "react";
import Button from "@mui/material/Button";

const dm = "'Inter', sans-serif";

export default function ViewActionButton({ onClick, children = "View" }) {
  return (
    <Button
      variant="outlined"
      size="small"
      onClick={onClick}
      sx={{
        minWidth: 72,
        px: 1.5,
        py: 0.45,
        fontFamily: dm,
        fontSize: "0.73rem",
        fontWeight: 600,
        lineHeight: 1.2,
      }}
    >
      {children}
    </Button>
  );
}
