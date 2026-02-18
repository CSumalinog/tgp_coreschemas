// src/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: "'Helvetica Neue', sans-serif",
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          fontFamily: "'Helvetica Neue', sans-serif", // inherit theme font
        },
        cell: {
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: '0.9rem', // optional: match your page font size
        },
        columnHeaders: {
          fontFamily: "'Helvetica Neue', sans-serif",
          fontSize: '0.9rem',
          fontWeight: 400,
        },
      },
    },
  },
});

export default theme;
