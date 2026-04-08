import React from "react";
import { Box } from "@mui/material";
import brandLogo from "../../assets/img/cs-logo.png";

function BrandedLoader({
  size = 72,
  minHeight = "40vh",
  fullScreen = false,
  darkBackground = false,
  inline = false,
}) {
  // container is proportionally larger so the SVG trace has room around the logo
  const containerSize = Math.round(size / 0.6);
  const cssVars = {
    "--bl-size": `${containerSize}px`,
    "--bl-logo-size": `${size}px`,
  };

  // inline (tight) contexts: just the pulsing logo — trace needs space
  if (inline) {
    return (
      <Box
        component="img"
        src={brandLogo}
        alt="Loading"
        sx={{
          width: size,
          height: size,
          objectFit: "contain",
          display: "block",
          filter: "brightness(0) saturate(100%)",
          animation: "branded-loader-pulse 1.2s ease-in-out infinite",
          "@keyframes branded-loader-pulse": {
            "0%, 100%": { opacity: 0.6, transform: "scale(0.95)" },
            "50%": { opacity: 1, transform: "scale(1)" },
          },
        }}
      />
    );
  }

  const traceNode = (
    <div className="branded-loader__core" style={cssVars}>
      <svg
        className="branded-loader__trace"
        viewBox="0 0 150 150"
        aria-hidden="true"
      >
        <path className="branded-loader__trace-shape" d="M75 24 L90 39 L80 49 L75 44 L70 49 L60 39 Z" />
        <path className="branded-loader__trace-shape" d="M126 75 L111 60 L101 70 L106 75 L101 80 L111 90 Z" />
        <path className="branded-loader__trace-shape" d="M75 126 L90 111 L80 101 L75 106 L70 101 L60 111 Z" />
        <path className="branded-loader__trace-shape" d="M24 75 L39 90 L49 80 L44 75 L49 70 L39 60 Z" />
        <circle className="branded-loader__trace-shape" cx="75" cy="75" r="12" />
      </svg>
      <img src={brandLogo} alt="Loading" className="branded-loader__logo" />
    </div>
  );

  return (
    <Box
      sx={{
        minHeight: fullScreen ? "100vh" : minHeight,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: fullScreen
          ? darkBackground
            ? "#212121"
            : "#ffffff"
          : "transparent",
      }}
    >
      {traceNode}
    </Box>
  );
}

export default BrandedLoader;
