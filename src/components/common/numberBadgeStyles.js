const DEFAULT_FONT = "'Inter', sans-serif";

export function getMuiNumberBadgeSx({
  size = 15,
  bgColor = "#F5C52B",
  textColor = "#ffffff",
  fontFamily = DEFAULT_FONT,
  fontSize = "0.6rem",
  fontWeight = 700,
} = {}) {
  return {
    "& .MuiBadge-badge": {
      width: size,
      height: size,
      minWidth: size,
      borderRadius: "999px",
      backgroundColor: bgColor,
      color: textColor,
      fontFamily,
      fontSize,
      fontWeight,
      lineHeight: 1,
      padding: 0,
    },
  };
}
