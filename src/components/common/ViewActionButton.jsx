import React from "react";
import Button from "@mui/material/Button";

const dm = "'Inter', sans-serif";

export default function ViewActionButton({ onClick, children = "View" }) {
  return (
    <Button
      variant="contained"
      size="small"
      onClick={onClick}
      sx={{
        minWidth: 72,
        px: 1.5,
        py: 0.45,
        borderRadius: "8px",
        border: "1px solid #d4a20a",
        backgroundColor: "#F5C52B",
        color: "#111111",
        boxShadow: "none",
        fontFamily: dm,
        fontSize: "0.73rem",
        fontWeight: 600,
        lineHeight: 1.2,
        textTransform: "none",
        "&:hover": {
          backgroundColor: "#e4b21f",
          borderColor: "#c99600",
          boxShadow: "none",
        },
        "&:active": {
          backgroundColor: "#d8a60f",
          boxShadow: "none",
        },
        "&:focus-visible": {
          outline: "2px solid #111111",
          outlineOffset: 1,
        },
      }}
    >
      {children}
    </Button>
  );
}
