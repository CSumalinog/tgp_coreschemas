import React from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

const dm = "'DM Sans', sans-serif";
const GOLD = "#F5C52B";

function getSlotProps(border) {
  return {
    textField: {
      size: "small",
      sx: {
        "& .MuiOutlinedInput-root": {
          fontFamily: dm,
          fontSize: "0.82rem",
          borderRadius: "10px",
          "& fieldset": { borderColor: border || "rgba(0,0,0,0.23)" },
          "&:hover fieldset": { borderColor: "rgba(245,197,43,0.5)" },
          "&.Mui-focused fieldset": { borderColor: GOLD },
        },
        "& .MuiInputLabel-root": { fontFamily: dm, fontSize: "0.8rem" },
        "& .MuiInputLabel-root.Mui-focused": { color: "#b45309" },
      },
    },
    desktopPaper: {
      sx: {
        borderRadius: "12px",
        "& .MuiPickersCalendarHeader-label": {
          fontFamily: dm,
          fontSize: "0.88rem",
          fontWeight: 600,
        },
        "& .MuiDayCalendar-weekDayLabel": {
          fontFamily: dm,
          fontSize: "0.72rem",
          fontWeight: 500,
        },
        "& .MuiPickersDay-root": {
          fontFamily: dm,
          fontSize: "0.82rem",
        },
        "& .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton": {
          fontFamily: dm,
          fontSize: "0.82rem",
        },
        "& .MuiPickersArrowSwitcher-button": {
          transform: "scale(0.9)",
        },
      },
    },
  };
}

/**
 * BrandDatePicker — branded DatePicker consistent with SemesterManagement styling.
 *
 * Props:
 *   label       — field label
 *   value       — Date | null
 *   onChange    — (Date | null) => void
 *   border      — border color string (defaults to theme divider)
 *   format      — date format string (default: "dd/MM/yyyy")
 *   disabled    — boolean
 *   minDate     — Date | null
 *   maxDate     — Date | null
 *   slotProps   — merged on top of defaults (optional)
 *   ...rest     — any other DatePicker props
 */
export default function BrandDatePicker({
  label,
  value,
  onChange,
  border,
  format = "dd/MM/yyyy",
  disabled,
  minDate,
  maxDate,
  slotProps: extraSlotProps,
  sx,
  ...rest
}) {
  const baseSlotProps = getSlotProps(border);

  const mergedSlotProps = extraSlotProps
    ? {
        ...baseSlotProps,
        ...extraSlotProps,
        textField: {
          ...baseSlotProps.textField,
          ...(extraSlotProps.textField || {}),
          sx: {
            ...baseSlotProps.textField.sx,
            ...(sx || {}),
            ...(extraSlotProps.textField?.sx || {}),
          },
        },
      }
    : {
        ...baseSlotProps,
        textField: {
          ...baseSlotProps.textField,
          sx: {
            ...baseSlotProps.textField.sx,
            ...(sx || {}),
          },
        },
      };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <DatePicker
        label={label}
        format={format}
        value={value}
        onChange={onChange}
        disabled={disabled}
        minDate={minDate}
        maxDate={maxDate}
        slotProps={mergedSlotProps}
        {...rest}
      />
    </LocalizationProvider>
  );
}
