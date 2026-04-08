import React, { useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  IconButton,
  TextField,
  Button,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

const DEFAULT_FONT_FAMILY = "'Inter', sans-serif";
const DEFAULT_HOVER_BG = "rgba(53,53,53,0.03)";

export default function CancelConfirmDialog({
  open,
  onClose,
  onConfirm,
  loading,
  isDark,
  border,
  fontFamily = DEFAULT_FONT_FAMILY,
  hoverBg = DEFAULT_HOVER_BG,
}) {
  const [reason, setReason] = useState("");

  const handleConfirm = () => onConfirm(reason.trim());

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: "10px",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 8px 40px rgba(53,53,53,0.12)",
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 3,
          pb: 2,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            sx={{
              width: 34,
              height: 34,
              borderRadius: "10px",
              backgroundColor: isDark ? "rgba(239,68,68,0.1)" : "#fef2f2",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <CancelOutlinedIcon sx={{ fontSize: 18, color: "#ef4444" }} />
          </Box>
          <Box>
            <Typography
              sx={{
                fontFamily,
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              Cancel Request
            </Typography>
            <Typography
              sx={{
                fontFamily,
                fontSize: "0.72rem",
                color: "text.secondary",
                mt: 0.15,
              }}
            >
              This action cannot be undone.
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={handleClose}
          disabled={loading}
          size="small"
          sx={{
            color: "text.secondary",
            borderRadius: "10px",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : hoverBg,
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 17 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ px: 3, pt: 0, pb: 3 }}>
        <Typography
          sx={{
            fontFamily,
            fontSize: "0.8rem",
            color: "text.secondary",
            lineHeight: 1.6,
            mb: 1.5,
          }}
        >
          Are you sure you want to cancel this request? All assigned staff will
          be unassigned.
        </Typography>

        <TextField
          fullWidth
          multiline
          minRows={2}
          placeholder="Reason for cancellation (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          sx={{
            "& .MuiOutlinedInput-root": {
              fontFamily,
              fontSize: "0.82rem",
              borderRadius: "10px",
              "& fieldset": { borderColor: border },
              "&:hover fieldset": { borderColor: "rgba(53,53,53,0.25)" },
              "&.Mui-focused fieldset": { borderColor: "#ef4444" },
            },
          }}
        />

        <Box sx={{ display: "flex", gap: 1.25, mt: 2 }}>
          <Button
            fullWidth
            onClick={handleClose}
            disabled={loading}
            sx={{
              fontFamily,
              fontSize: "0.82rem",
              fontWeight: 500,
              borderRadius: "10px",
              py: 1,
              textTransform: "none",
              border: `1px solid ${border}`,
              color: "text.secondary",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : hoverBg,
              },
            }}
          >
            Keep Request
          </Button>
          <Button
            fullWidth
            onClick={handleConfirm}
            disabled={loading}
            sx={{
              fontFamily,
              fontSize: "0.82rem",
              fontWeight: 600,
              borderRadius: "10px",
              py: 1,
              textTransform: "none",
              backgroundColor: "#dc2626",
              color: "#fff",
              "&:hover": { backgroundColor: "#b91c1c" },
              "&:disabled": {
                backgroundColor: "rgba(220,38,38,0.35)",
                color: "rgba(255,255,255,0.7)",
              },
            }}
          >
            {loading ? (
              <CircularProgress size={16} sx={{ color: "#fff" }} />
            ) : (
              "Yes, Cancel Request"
            )}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
