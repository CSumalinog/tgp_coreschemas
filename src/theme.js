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
         
        },
        columnHeaders: {
          fontFamily: "'Helvetica Neue', sans-serif",
          
        },
      },
    },
  },
});

export default theme;
