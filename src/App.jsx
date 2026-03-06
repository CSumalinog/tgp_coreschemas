// src/App.jsx
import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes";
import { AppThemeProvider } from "./context/ThemeContext";

function App() {
  return (
    <AppThemeProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AppThemeProvider>
  );
}

export default App;