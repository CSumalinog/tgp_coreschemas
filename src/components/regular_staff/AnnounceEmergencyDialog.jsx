// src/components/regular_staff/AnnounceEmergencyDialog.jsx
// Dialog for staff to announce an emergency/unavailability in advance

import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  Button,
  TextField,
  Typography,
  Box,
  Divider,
  IconButton,
  CircularProgress,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";

const GOLD = "#F5C52B";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

/**
 * Props:
 * - open: boolean
 * - onClose: function
 * - onAnnounce: function({ reason: string, proofFile: File | null })
 * - loading: boolean
 * - error: string
 */
function AnnounceEmergencyDialog({
  open,
  onClose,
  onAnnounce,
  loading = false,
  error = "",
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = theme.palette.divider;

  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");
  const [proofFile, setProofFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setReason("");
      setReasonError("");
      setProofFile(null);
      setFileError("");
    }
  }, [open]);

  const validateFile = (file) => {
    if (!file) return "";
    const isImage = String(file.type || "").startsWith("image/");
    const isPdf = file.type === "application/pdf";
    if (!isImage && !isPdf) {
      return "Only image or PDF files are allowed.";
    }
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      return "File is too large. Maximum size is 10 MB.";
    }
    return "";
  };

  const handleAnnounce = () => {
    if (!reason.trim()) {
      setReasonError("Please provide a reason for your unavailability.");
      return;
    }
    setReasonError("");

    if (!proofFile) {
      setFileError("Please attach proof (image or PDF) before submitting.");
      return;
    }

    const validationMessage = validateFile(proofFile);
    if (validationMessage) {
      setFileError(validationMessage);
      return;
    }
    setFileError("");

    onAnnounce({ reason: reason.trim(), proofFile: proofFile || null });
  };

  const handleClose = () => {
    if (loading) return;
    setReason("");
    setReasonError("");
    setProofFile(null);
    setFileError("");
    onClose();
  };

  const handleSelectProof = (event) => {
    const file = event.target.files?.[0] || null;
    const validationMessage = validateFile(file);
    if (validationMessage) {
      setFileError(validationMessage);
      setProofFile(null);
      return;
    }
    setFileError("");
    setProofFile(file);
  };

  const handleRemoveProof = () => {
    setProofFile(null);
    setFileError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: {
        sx: {
          borderRadius: "14px",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 8px 40px rgba(53,53,53,0.12)",
        },
      } }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 2.5,
              height: 26,
              borderRadius: "2px",
              backgroundColor: GOLD,
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              Announce Emergency / Unavailability
            </Typography>
          </Box>
        </Box>

        <IconButton
          size="small"
          onClick={handleClose}
          disabled={loading}
          sx={{
            borderRadius: "10px",
            color: "text.secondary",
            "&:hover": { backgroundColor: HOVER_BG },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.8rem",
            color: "text.secondary",
            lineHeight: 1.55,
            mb: 1.4,
          }}
        >
          Let your section head know in advance if you cannot make it to your assignment.
          Add a short reason and required supporting proof.
        </Typography>

        <Box>
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.62rem", mb: 0.7, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.09em" }}>
            Reason *
          </Typography>
          <TextField
            placeholder="e.g. I have a medical appointment on this date."
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError("");
            }}
            fullWidth
            multiline
            minRows={3}
            error={!!reasonError}
            helperText={reasonError}
            autoFocus
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                fontFamily: dm,
              },
            }}
          />
        </Box>

        <Box>
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.62rem", mb: 0.7, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.09em" }}>
            Proof *
          </Typography>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={handleSelectProof}
            style={{ display: "none" }}
          />

          <Box
            sx={{
              border: `1px dashed ${isDark ? "rgba(255,255,255,0.18)" : "rgba(53,53,53,0.25)"}`,
              borderRadius: "8px",
              p: 1.25,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: dm, fontSize: "0.84rem", fontWeight: 600, color: "text.primary", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {proofFile ? proofFile.name : "No file selected"}
              </Typography>
              <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: "text.secondary" }}>
                Image or PDF up to 10 MB
              </Typography>
            </Box>

            <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
              <Button
                size="small"
                variant="outlined"
                startIcon={<UploadFileOutlinedIcon />}
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                sx={{
                  minWidth: 92,
                  borderRadius: "10px",
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  fontWeight: 600,
                }}
              >
                {proofFile ? "Replace" : "Choose"}
              </Button>
              {proofFile && (
                <Button
                  size="small"
                  onClick={handleRemoveProof}
                  disabled={loading}
                  sx={{
                    borderRadius: "10px",
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                  }}
                >
                  Remove
                </Button>
              )}
            </Box>
          </Box>

          {fileError && (
            <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: "error.main", mt: 0.6 }}>
              {fileError}
            </Typography>
          )}
        </Box>

        {error && (
          <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "error.main" }}>
            {error}
          </Typography>
        )}
      </Box>

      <Divider />

      <Box
        sx={{
          px: 3,
          py: 2,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
        }}
      >
        <Box
          onClick={!loading ? handleClose : undefined}
          sx={{
            borderRadius: "10px",
            cursor: loading ? "default" : "pointer",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "text.secondary",
            border: `1px solid ${border}`,
            backgroundColor: "transparent",
            px: 1.75,
            py: 0.65,
            opacity: loading ? 0.5 : 1,
            "&:hover": {
              backgroundColor: loading ? undefined : HOVER_BG,
            },
          }}
        >
          Cancel
        </Box>
        <Box
          onClick={!loading ? handleAnnounce : undefined}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.6,
            cursor: loading ? "default" : "pointer",
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 700,
            backgroundColor: loading ? "action.disabledBackground" : "#111",
            color: loading ? "text.disabled" : "#fff",
            px: 1.75,
            py: 0.65,
            transition: "background-color 0.15s",
            "&:hover": {
              backgroundColor: loading ? undefined : "#333",
            },
          }}
        >
          {loading ? (
            <>
              <CircularProgress size={12} sx={{ color: "inherit" }} />
              Submitting...
            </>
          ) : (
            "Submit request"
          )}
        </Box>
      </Box>
    </Dialog>
  );
}

export default AnnounceEmergencyDialog;
