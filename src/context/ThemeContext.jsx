// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";

const ThemeContext = createContext({
  isDark: false,
  toggleDark: () => {},
});

export function useThemeMode() {
  return useContext(ThemeContext);
}

function buildTheme(isDark) {
  return createTheme({
    palette: {
      mode: isDark ? "dark" : "light",
      primary:    { main: "#f5c52b" },
      background: {
        default: isDark ? "#121212" : "#f9f9f9",
        paper:   isDark ? "#1e1e1e" : "#ffffff",
      },
      text: {
        primary:   isDark ? "#f5f5f5" : "#212121",
        secondary: isDark ? "#aaaaaa" : "#9e9e9e",
      },
      divider: isDark ? "#2e2e2e" : "#e0e0e0",
    },
    typography: {
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
    },
    shape: { borderRadius: 8 },
    components: {
      MuiPaper:  { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: { styleOverrides: { root: { textTransform: "none", boxShadow: "none" } } },
      // ── Global CSS overrides ──────────────────────────────────────────────
      MuiCssBaseline: {
        styleOverrides: isDark ? `
          /* Force dark background on all common wrappers */
          body, #root {
            background-color: #121212 !important;
            color: #f5f5f5 !important;
          }

          /* All white / light grey boxes → dark paper */
          [style*="background-color: rgb(255, 255, 255)"],
          [style*="background-color: white"],
          [style*="background-color: #fff"],
          [style*="background-color: #ffffff"] {
            background-color: #1e1e1e !important;
          }

          [style*="background-color: rgb(249, 249, 249)"],
          [style*="background-color: #f9f9f9"] {
            background-color: #121212 !important;
          }

          [style*="background-color: rgb(245, 245, 245)"],
          [style*="background-color: #f5f5f5"] {
            background-color: #2a2a2a !important;
          }

          /* Borders */
          [style*="border-color: rgb(224, 224, 224)"],
          [style*="border: 1px solid rgb(224, 224, 224)"],
          [style*="border-color: #e0e0e0"] {
            border-color: #2e2e2e !important;
          }

          /* Text overrides */
          [style*="color: rgb(33, 33, 33)"],
          [style*="color: #212121"] {
            color: #f5f5f5 !important;
          }

          [style*="color: rgb(158, 158, 158)"],
          [style*="color: #9e9e9e"] {
            color: #aaaaaa !important;
          }

          [style*="color: rgb(117, 117, 117)"],
          [style*="color: #757575"] {
            color: #888888 !important;
          }

          /* DataGrid */
          .MuiDataGrid-root {
            background-color: #1e1e1e !important;
            color: #f5f5f5 !important;
            border-color: #2e2e2e !important;
          }
          .MuiDataGrid-columnHeaders {
            background-color: #2a2a2a !important;
            border-color: #2e2e2e !important;
          }
          .MuiDataGrid-cell {
            border-color: #2e2e2e !important;
            color: #f5f5f5 !important;
          }
          .MuiDataGrid-row:hover {
            background-color: #2a2a2a !important;
          }
          .MuiDataGrid-footerContainer {
            background-color: #1e1e1e !important;
            border-color: #2e2e2e !important;
          }

          /* Sidebar / nav layouts */
          nav, aside, header,
          [class*="sidebar"], [class*="Sidebar"],
          [class*="layout"], [class*="Layout"],
          [class*="navbar"], [class*="Navbar"] {
            background-color: #1e1e1e !important;
            border-color: #2e2e2e !important;
          }

          /* MUI Divider */
          hr, .MuiDivider-root {
            border-color: #2e2e2e !important;
          }

          /* Inputs */
          .MuiOutlinedInput-root {
            background-color: #2a2a2a !important;
          }
          .MuiOutlinedInput-notchedOutline {
            border-color: #3a3a3a !important;
          }
          .MuiInputLabel-root {
            color: #aaaaaa !important;
          }
          .MuiInputBase-input {
            color: #f5f5f5 !important;
          }

          /* Select dropdowns */
          .MuiSelect-select {
            background-color: #2a2a2a !important;
            color: #f5f5f5 !important;
          }
          .MuiMenu-paper, .MuiPopover-paper {
            background-color: #1e1e1e !important;
            color: #f5f5f5 !important;
          }
          .MuiMenuItem-root:hover {
            background-color: #2a2a2a !important;
          }

          /* Chips */
          .MuiChip-root {
            border-color: #3a3a3a !important;
          }

          /* Dialog */
          .MuiDialog-paper {
            background-color: #1e1e1e !important;
            color: #f5f5f5 !important;
          }

          /* Scrollbar */
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #1e1e1e; }
          ::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover { background: #4a4a4a; }
        ` : `
          body, #root {
            background-color: #f9f9f9;
            color: #212121;
          }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: #f5f5f5; }
          ::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 3px; }
        `,
      },
    },
  });
}

export function AppThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("darkMode") === "true"; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("darkMode", isDark); }
    catch {}
  }, [isDark]);

  const toggleDark = () => setIsDark((prev) => !prev);
  const theme      = buildTheme(isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}