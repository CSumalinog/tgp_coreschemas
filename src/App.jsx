// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AppThemeProvider } from "./context/ThemeContext";
import StartupLoader from "./components/common/StartupLoader";

function App() {
  const [isBooting, setIsBooting] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    const minVisibleMs = 700;
    const fadeMs = 220;

    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, minVisibleMs);

    const hideTimer = setTimeout(() => {
      setIsBooting(false);
    }, minVisibleMs + fadeMs);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (isBooting) {
    return <StartupLoader fading={isFading} />;
  }

  return (
    <AppThemeProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppThemeProvider>
  );
}

export default App;