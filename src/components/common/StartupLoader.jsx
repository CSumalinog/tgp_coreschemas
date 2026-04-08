import React from "react";
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
        <svg
          className="startup-loader__trace"
          viewBox="0 0 150 150"
          aria-hidden="true"
        >
          <path
            className="startup-loader__trace-shape"
            d="M75 24 L90 39 L80 49 L75 44 L70 49 L60 39 Z"
          />
          <path
            className="startup-loader__trace-shape"
            d="M126 75 L111 60 L101 70 L106 75 L101 80 L111 90 Z"
          />
          <path
            className="startup-loader__trace-shape"
            d="M75 126 L90 111 L80 101 L75 106 L70 101 L60 111 Z"
          />
          <path
            className="startup-loader__trace-shape"
            d="M24 75 L39 90 L49 80 L44 75 L49 70 L39 60 Z"
          />
          <circle
            className="startup-loader__trace-shape"
            cx="75"
            cy="75"
            r="12"
          />
        </svg>
        <img
          src={brandLogo}
          alt="core schemas"
          className="startup-loader__logo"
        />
      </div>
    </div>
  );
}

export default StartupLoader;
