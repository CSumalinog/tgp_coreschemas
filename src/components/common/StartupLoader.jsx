import React from "react";
import { LinearProgress } from "@mui/material";
import brandLogo from "../../assets/img/cs-logo.png";

function StartupLoader({ fading = false }) {
  return (
    <div
      className={`startup-loader${fading ? " is-fading" : ""}`}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="startup-loader__core">
        <img
          src={brandLogo}
          alt="core schemas"
          className="startup-loader__logo"
        />
        <LinearProgress
          sx={{
            width: 140,
            borderRadius: 4,
            backgroundColor: "rgba(245, 197, 43, 0.15)",
            "& .MuiLinearProgress-bar": { backgroundColor: "#F5C52B" },
          }}
        />
      </div>
    </div>
  );
}

export default StartupLoader;
