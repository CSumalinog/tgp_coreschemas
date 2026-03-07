// src/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  typography: {
    fontFamily: "'Inter', sans-serif",
  },
  components: {
    MuiDataGrid: {
      styleOverrides: {
        root: {
          fontFamily: "'Inter', sans-serif",
        },
        cell: {
          fontFamily: "'Inter', sans-serif",
        },
        columnHeaders: {
          fontFamily: "'Inter', sans-serif",
        },
      },
    },
  },
});

export default theme;