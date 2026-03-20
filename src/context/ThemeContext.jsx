// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { createTheme, ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import CssBaseline  from "@mui/material/CssBaseline";
import GlobalStyles from "@mui/material/GlobalStyles";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD    = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const dm      = "'Inter', sans-serif";

// ── Theme Context ─────────────────────────────────────────────────────────────
const ThemeContext = createContext({
  isDark:     false,
  toggleDark: () => {},
});

export function useThemeMode() {
  return useContext(ThemeContext);
}

// ── Theme Builder ─────────────────────────────────────────────────────────────
function buildTheme(isDark) {
  return createTheme({
    palette: {
      mode:    isDark ? "dark" : "light",
      primary: { main: GOLD },
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
      fontFamily: dm,
      h1: { fontFamily: dm },
      h2: { fontFamily: dm },
      h3: { fontFamily: dm },
      h4: { fontFamily: dm },
      h5: { fontFamily: dm },
      h6: { fontFamily: dm },
      body1:    { fontFamily: dm },
      body2:    { fontFamily: dm },
      subtitle1:{ fontFamily: dm },
      subtitle2:{ fontFamily: dm },
      caption:  { fontFamily: dm },
      overline: { fontFamily: dm },
      button:   { fontFamily: dm, textTransform: "none" },
    },

    shape: { borderRadius: 8 },

    components: {
      MuiPaper:  { styleOverrides: { root: { backgroundImage: "none" } } },
      MuiButton: { styleOverrides: { root: { textTransform: "none", boxShadow: "none", fontFamily: dm } } },
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontFamily:    dm,
            fontSize:      "0.78rem",
            fontWeight:    500,
            minHeight:     "unset",
            paddingTop:    "7px",
            paddingBottom: "7px",
          },
        },
      },
      MuiListItemText: {
        styleOverrides: {
          primary: {
            fontFamily: dm,
            fontSize:   "0.78rem",
            fontWeight: 500,
          },
        },
      },
      MuiInputBase:   { styleOverrides: { root: { fontFamily: dm } } },
      MuiInputLabel:  { styleOverrides: { root: { fontFamily: dm } } },
      MuiTableCell:   { styleOverrides: { root: { fontFamily: dm } } },
      MuiTooltip:     { styleOverrides: { tooltip: { fontFamily: dm } } },
      MuiAlert:       { styleOverrides: { root: { fontFamily: dm } } },
      MuiChip:        { styleOverrides: { root: { fontFamily: dm } } },
      MuiTab:         { styleOverrides: { root: { fontFamily: dm, textTransform: "none" } } },
      MuiSelect: {
        styleOverrides: {
          select: { fontFamily: dm, fontSize: "0.78rem" },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            "& .MuiOutlinedInput-notchedOutline": {
              borderWidth: "1px",
              borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.15)",
            },
            "&:hover .MuiOutlinedInput-notchedOutline": {
              borderWidth: "1px",
              borderColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(53,53,53,0.3)",
            },
            "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
              borderWidth: "1px",
              borderColor: GOLD,
            },
          },
        },
      },
      MuiDataGrid: {
        styleOverrides: {
          root:             { fontFamily: dm },
          cell:             { fontFamily: dm },
          columnHeaders:    { fontFamily: dm },
          toolbarContainer: { fontFamily: dm },
        },
      },

      MuiCssBaseline: {
        styleOverrides: isDark ? `
          *, *::before, *::after { font-family: ${dm}; }

          body, #root {
            background-color: #121212 !important;
            color: #f5f5f5 !important;
            font-family: ${dm} !important;
          }

          [style*="background-color: rgb(255, 255, 255)"],
          [style*="background-color: white"],
          [style*="background-color: #fff"],
          [style*="background-color: #ffffff"] { background-color: #1e1e1e !important; }

          [style*="background-color: rgb(249, 249, 249)"],
          [style*="background-color: #f9f9f9"]  { background-color: #121212 !important; }

          [style*="background-color: rgb(245, 245, 245)"],
          [style*="background-color: #f5f5f5"]  { background-color: #2a2a2a !important; }

          [style*="border-color: rgb(224, 224, 224)"],
          [style*="border: 1px solid rgb(224, 224, 224)"],
          [style*="border-color: #e0e0e0"]       { border-color: #2e2e2e !important; }

          [style*="color: rgb(33, 33, 33)"],
          [style*="color: #212121"]              { color: #f5f5f5 !important; }

          [style*="color: rgb(158, 158, 158)"],
          [style*="color: #9e9e9e"]              { color: #aaaaaa !important; }

          .MuiDataGrid-root          { background-color: #1e1e1e !important; color: #f5f5f5 !important; border-color: #2e2e2e !important; }
          .MuiDataGrid-columnHeaders { background-color: #2a2a2a !important; border-color: #2e2e2e !important; }
          .MuiDataGrid-cell          { border-color: #2e2e2e !important; color: #f5f5f5 !important; }
          .MuiDataGrid-row:hover     { background-color: #2a2a2a !important; }
          .MuiDataGrid-footerContainer { background-color: #1e1e1e !important; border-color: #2e2e2e !important; }

          nav, aside, header,
          [class*="sidebar"], [class*="Sidebar"],
          [class*="layout"],  [class*="Layout"],
          [class*="navbar"],  [class*="Navbar"] {
            background-color: #1e1e1e !important;
            border-color: #2e2e2e !important;
          }

          hr, .MuiDivider-root               { border-color: #2e2e2e !important; }
          .MuiOutlinedInput-root             { background-color: #2a2a2a !important; }
          .MuiOutlinedInput-notchedOutline   { border-color: #3a3a3a !important; }
          .MuiInputLabel-root                { color: #aaaaaa !important; }
          .MuiInputBase-input                { color: #f5f5f5 !important; }
          .MuiSelect-select                  { background-color: #2a2a2a !important; color: #f5f5f5 !important; }
          .MuiMenu-paper, .MuiPopover-paper  { background-color: #1e1e1e !important; color: #f5f5f5 !important; }
          .MuiMenuItem-root:hover            { background-color: #2a2a2a !important; }
          .MuiChip-root                      { border-color: #3a3a3a !important; }
          .MuiDialog-paper                   { background-color: #1e1e1e !important; color: #f5f5f5 !important; }

          ::-webkit-scrollbar               { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track         { background: #1e1e1e; }
          ::-webkit-scrollbar-thumb         { background: #3a3a3a; border-radius: 3px; }
          ::-webkit-scrollbar-thumb:hover   { background: #4a4a4a; }
        ` : `
          *, *::before, *::after { font-family: ${dm}; }

          body, #root {
            background-color: #f9f9f9;
            color: #212121;
            font-family: ${dm};
          }
          ::-webkit-scrollbar               { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track         { background: #f5f5f5; }
          ::-webkit-scrollbar-thumb         { background: #e0e0e0; border-radius: 3px; }
        `,
      },
    },
  });
}

// ── DataGrid Global Styles ────────────────────────────────────────────────────
function DataGridStyles({ isDark }) {
  const border    = isDark ? "rgba(255,255,255,0.08)"  : "rgba(53,53,53,0.08)";
  const paperBg   = isDark ? "#1e1e1e"                 : "#ffffff";
  const textColor = isDark ? "rgba(255,255,255,0.85)"  : "#353535";
  const subColor  = isDark ? "rgba(255,255,255,0.45)"  : "rgba(53,53,53,0.5)";
  const iconColor = isDark ? "rgba(255,255,255,0.35)"  : "rgba(53,53,53,0.4)";
  const inputBg   = isDark ? "rgba(255,255,255,0.03)"  : "rgba(53,53,53,0.02)";
  const shadow    = isDark
    ? "0 12px 40px rgba(0,0,0,0.55)"
    : "0 4px 24px rgba(53,53,53,0.12)";

  return (
    <GlobalStyles styles={{

      "body .MuiMenuItem-root": {
        fontFamily:    `${dm} !important`,
        fontSize:      "0.78rem !important",
        fontWeight:    "500 !important",
        minHeight:     "unset !important",
        paddingTop:    "7px !important",
        paddingBottom: "7px !important",
        lineHeight:    "1.4 !important",
      },
      "body .MuiListItemText-primary": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.78rem !important",
        fontWeight: "500 !important",
        lineHeight: "1.4 !important",
      },
      "body .MuiListItemText-secondary": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.7rem !important",
      },
      "body .MuiInputBase-root": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.82rem !important",
      },
      "body .MuiInputBase-input": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.82rem !important",
      },
      "body .MuiSelect-select": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.78rem !important",
      },
      "body .MuiFormLabel-root, body .MuiInputLabel-root": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.75rem !important",
      },

      // ── Column menu panel ────────────────────────────────────────────────
      ".MuiPaper-root:has(> .MuiDataGrid-menuList)": {
        borderRadius:    "10px !important",
        border:          `1px solid ${border} !important`,
        backgroundColor: `${paperBg} !important`,
        boxShadow:       `${shadow} !important`,
        minWidth:        "180px !important",
        overflow:        "hidden !important",
      },
      ".MuiDataGrid-menuList": {
        padding: "4px 0 !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.78rem !important",
        fontWeight: "500 !important",
        color:      `${textColor} !important`,
        padding:    "7px 14px !important",
        minHeight:  "unset !important",
        gap:        "10px !important",
        transition: "background-color 0.12s, color 0.12s !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover": {
        backgroundColor: `${GOLD_08} !important`,
        color:           "#b45309 !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root .MuiListItemIcon-root": {
        minWidth:   "unset !important",
        color:      `${iconColor} !important`,
        transition: "color 0.12s !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root .MuiSvgIcon-root": {
        fontSize: "1rem !important",
        color:    `${iconColor} !important`,
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiListItemIcon-root": { color: "#b45309 !important" },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiSvgIcon-root":      { color: "#b45309 !important" },
      ".MuiDataGrid-menuList .MuiListItemText-primary": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.78rem !important",
        fontWeight: "500 !important",
      },
      ".MuiDataGrid-menuList .MuiDivider-root": {
        borderColor: `${border} !important`,
        margin:      "4px 12px !important",
      },

      // ── Filter panel ─────────────────────────────────────────────────────
      ".MuiDataGrid-paper": {
        borderRadius:    "10px !important",
        border:          `1px solid ${border} !important`,
        backgroundColor: `${paperBg} !important`,
        boxShadow:       `${shadow} !important`,
        overflow:        "hidden !important",
      },
      ".MuiDataGrid-filterForm": {
        padding:    "14px 16px !important",
        gap:        "12px !important",
        alignItems: "flex-end !important",
      },
      ".MuiDataGrid-filterForm .MuiFormLabel-root, .MuiDataGrid-filterForm .MuiInputLabel-root": {
        fontFamily:    `${dm} !important`,
        fontSize:      "0.62rem !important",
        fontWeight:    "700 !important",
        color:         `${GOLD} !important`,
        letterSpacing: "0.08em !important",
        textTransform: "uppercase !important",
      },
      ".MuiDataGrid-filterForm .MuiFormLabel-root.Mui-focused, .MuiDataGrid-filterForm .MuiInputLabel-root.Mui-focused": {
        color: `${GOLD} !important`,
      },
      ".MuiDataGrid-filterForm .MuiInputBase-root": {
        fontFamily:      `${dm} !important`,
        fontSize:        "0.82rem !important",
        color:           `${textColor} !important`,
        backgroundColor: `${inputBg} !important`,
        borderRadius:    "8px !important",
      },
      ".MuiDataGrid-filterForm .MuiInputBase-input": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.82rem !important",
        color:      `${textColor} !important`,
        padding:    "6px 8px !important",
      },
      ".MuiDataGrid-filterForm .MuiSelect-select": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.82rem !important",
        color:      `${textColor} !important`,
      },
      ".MuiDataGrid-filterForm .MuiInputBase-input::placeholder": {
        color:   `${subColor} !important`,
        opacity: "1 !important",
      },
      ".MuiDataGrid-filterForm .MuiInput-underline:before":                          { borderBottomColor: `${border} !important` },
      ".MuiDataGrid-filterForm .MuiInput-underline:after":                           { borderBottomColor: `${GOLD} !important` },
      ".MuiDataGrid-filterForm .MuiInput-underline:hover:not(.Mui-disabled):before": { borderBottomColor: `${GOLD} !important` },
      ".MuiDataGrid-filterForm .MuiSelect-icon": { color: `${GOLD} !important` },
      ".MuiDataGrid-filterForm .MuiIconButton-root": {
        borderRadius: "8px !important",
        color:        `${subColor} !important`,
        transition:   "all 0.15s !important",
      },
      ".MuiDataGrid-filterForm .MuiIconButton-root:hover": {
        backgroundColor: `${GOLD_08} !important`,
        color:           `${GOLD} !important`,
      },

      // ── Portalled dropdowns ───────────────────────────────────────────────
      "body > div[role='presentation'] .MuiPaper-root, body .MuiPopover-root .MuiPaper-root, body .MuiMenu-root .MuiPaper-root": {
        borderRadius:    "10px !important",
        border:          `1px solid ${border} !important`,
        backgroundColor: `${paperBg} !important`,
        boxShadow:       `${shadow} !important`,
        overflow:        "hidden !important",
      },
      "body > div[role='presentation'] .MuiMenuItem-root, body .MuiPopover-root .MuiMenuItem-root, body .MuiMenu-root .MuiMenuItem-root": {
        fontFamily:   `${dm} !important`,
        fontSize:     "0.78rem !important",
        fontWeight:   "500 !important",
        color:        `${textColor} !important`,
        minHeight:    "unset !important",
        padding:      "7px 14px !important",
        lineHeight:   "1.4 !important",
        transition:   "background-color 0.12s !important",
      },
      "body > div[role='presentation'] .MuiMenuItem-root:hover, body .MuiPopover-root .MuiMenuItem-root:hover, body .MuiMenu-root .MuiMenuItem-root:hover": {
        backgroundColor: `${GOLD_08} !important`,
        color:           "#b45309 !important",
      },
      "body > div[role='presentation'] .MuiMenuItem-root.Mui-selected, body .MuiPopover-root .MuiMenuItem-root.Mui-selected, body .MuiMenu-root .MuiMenuItem-root.Mui-selected": {
        backgroundColor: `${GOLD_08} !important`,
        color:           `${GOLD} !important`,
        fontWeight:      "600 !important",
      },
      "body > div[role='presentation'] .MuiMenuItem-root.Mui-selected:hover, body .MuiPopover-root .MuiMenuItem-root.Mui-selected:hover, body .MuiMenu-root .MuiMenuItem-root.Mui-selected:hover": {
        backgroundColor: "rgba(245,197,43,0.14) !important",
      },
      "body > div[role='presentation'] .MuiListItemText-primary, body .MuiPopover-root .MuiListItemText-primary, body .MuiMenu-root .MuiListItemText-primary": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.78rem !important",
        fontWeight: "500 !important",
        lineHeight: "1.4 !important",
      },

      // ── Manage Columns panel ──────────────────────────────────────────────
      ".MuiDataGrid-columnsManagement": {
        backgroundColor: `${paperBg} !important`,
        padding:         "8px 0 !important",
      },
      ".MuiDataGrid-columnsManagement .MuiFormControlLabel-label": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.78rem !important",
        color:      `${textColor} !important`,
      },
      ".MuiDataGrid-columnsManagement .MuiCheckbox-root":             { color: `${border} !important` },
      ".MuiDataGrid-columnsManagement .MuiCheckbox-root.Mui-checked": { color: `${GOLD} !important` },
      ".MuiDataGrid-columnsManagementHeader": {
        padding:      "8px 16px !important",
        borderBottom: `1px solid ${border} !important`,
      },
      ".MuiDataGrid-columnsManagementFooter": {
        borderTop: `1px solid ${border} !important`,
        padding:   "8px 16px !important",
      },
      ".MuiDataGrid-columnsManagementFooter .MuiButton-root": {
        fontFamily:    `${dm} !important`,
        fontSize:      "0.75rem !important",
        fontWeight:    "600 !important",
        color:         `${GOLD} !important`,
        textTransform: "none !important",
      },

    }} />
  );
}

// ── App Theme Provider ────────────────────────────────────────────────────────
export function AppThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    try { return localStorage.getItem("darkMode") === "true"; }
    catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("darkMode", String(isDark)); }
    catch {}
  }, [isDark]);

  const toggleDark = () => setIsDark((prev) => !prev);

  // ── Fixed: memoize theme so MUI doesn't remount the entire tree on toggle ─
  const theme = useMemo(() => buildTheme(isDark), [isDark]);

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        <DataGridStyles isDark={isDark} />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
}