import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress MUI DataGrid :first-child SSR warning
const originalWarn = console.warn;
console.warn = function (...args) {
  if (args[0]?.includes && args[0].includes('":first-child" is potentially unsafe')) {
    return;
  }
  originalWarn.apply(console, args);
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
