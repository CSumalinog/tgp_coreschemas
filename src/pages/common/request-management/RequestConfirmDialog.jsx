import React from "react";
import { Box, CircularProgress, Dialog, Typography } from "@mui/material";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { DM, GOLD, GOLD_08, RED, RED_08 } from "./sharedStyles.jsx";

export default function RequestConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  loading,
  destructive,
  confirmLabel = "Confirm",
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: {
        sx: {
          borderRadius: "10px",
          width: 400,
          p: 0,
          fontFamily: DM,
          bgcolor: "background.paper",
        },
      } }}
    >
      <Box>
        <Box
          sx={{
            px: 3,
            py: 2.25,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {destructive ? (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                backgroundColor: RED_08,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <WarningAmberOutlinedIcon sx={{ fontSize: 17, color: RED }} />
            </Box>
          ) : (
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: "10px",
                backgroundColor: GOLD_08,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <ArchiveOutlinedIcon sx={{ fontSize: 17, color: GOLD }} />
            </Box>
          )}
          <Typography sx={{ fontFamily: DM, fontWeight: 700, fontSize: "0.92rem", color: "text.primary" }}>
            {title}
          </Typography>
        </Box>
        <Box sx={{ px: 3, py: 2.25 }}>
          <Typography sx={{ fontFamily: DM, fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.6 }}>
            {message}
          </Typography>
        </Box>
        <Box
          sx={{
            px: 3,
            py: 2,
            display: "flex",
            gap: 1,
            justifyContent: "flex-end",
            borderTop: "1px solid",
            borderColor: "divider",
          }}
        >
          <Box
            onClick={onClose}
            sx={{
              px: 2,
              py: 0.8,
              borderRadius: "10px",
              cursor: "pointer",
              fontFamily: DM,
              fontSize: "0.82rem",
              fontWeight: 600,
              color: "text.secondary",
              border: "1px solid",
              borderColor: "divider",
              userSelect: "none",
              transition: "all 0.15s",
              "&:hover": { borderColor: "text.secondary" },
            }}
          >
            Cancel
          </Box>
          <Box
            onClick={!loading ? onConfirm : undefined}
            sx={{
              px: 2,
              py: 0.8,
              borderRadius: "10px",
              cursor: loading ? "not-allowed" : "pointer",
              fontFamily: DM,
              fontSize: "0.82rem",
              fontWeight: 700,
              color: "#fff",
              backgroundColor: destructive ? RED : "#212121",
              opacity: loading ? 0.7 : 1,
              userSelect: "none",
              transition: "all 0.15s",
              "&:hover": !loading
                ? { backgroundColor: destructive ? "#b91c1c" : "#333" }
                : {},
            }}
          >
            {loading ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : confirmLabel}
          </Box>
        </Box>
      </Box>
    </Dialog>
  );
}
