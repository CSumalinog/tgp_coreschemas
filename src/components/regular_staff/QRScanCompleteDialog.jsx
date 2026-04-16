// src/components/regular_staff/QRScanCompleteDialog.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  IconButton,
  CircularProgress,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScannerOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import BrandedLoader from "../common/BrandedLoader";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

const SCANNER_ID = "qr-scanner-container";

/**
 * QRScanCompleteDialog
 *
 * Opens the device camera and scans a QR code.
 * Validates that the scanned URL matches:
 *   https://tgp-coreschemas.vercel.app/timeout/{assignment.request.id}
 *
 * On success → calls onConfirm()
 * On invalid QR → shows error and keeps scanner open
 */
export default function QRScanCompleteDialog({
  open,
  assignment,
  isDark,
  completing,
  error: externalError,
  onClose,
  onConfirm,
}) {
  const border = isDark ? BORDER_DARK : BORDER;
  const [scanState, setScanState] = useState("idle"); // idle | scanning | success | error
  const [scanError, setScanError] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef(null);
  const isMounted = useRef(false);

  // ── Start scanner when dialog opens ──────────────────────────────────────
  useEffect(() => {
    if (!open || !assignment) return;
    isMounted.current = true;
    setScanState("idle");
    setScanError("");
    setScannerReady(false);

    // Small delay to let the Dialog render the container div first
    const timer = setTimeout(() => {
      if (!isMounted.current) return;
      startScanner();
    }, 400);

    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      stopScanner();
    };
  }, [open, assignment]);

  const startScanner = async () => {
    try {
      const { Html5Qrcode } = await import("html5-qrcode");

      // Clean up any previous instance
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (_) {}
        scannerRef.current = null;
      }

      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      setScanState("scanning");
      setScannerReady(true);

      await scanner.start(
        { facingMode: "environment" }, // rear camera
        {
          fps: 10,
          qrbox: { width: 240, height: 240 },
          aspectRatio: 1.0,
        },
        (decodedText) => handleScanSuccess(decodedText),
        () => {}, // ignore per-frame errors
      );
    } catch (err) {
      if (!isMounted.current) return;
      setScanState("error");
      setScanError(
        err?.message?.includes("Permission")
          ? "Camera permission denied. Please allow camera access and try again."
          : "Could not start camera. Please check your device settings.",
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      scannerRef.current = null;
    }
  };

  const handleScanSuccess = async (decodedText) => {
    if (!isMounted.current) return;

    // Stop scanner immediately after a successful read
    await stopScanner();

    // Validate the scanned QR — extract request ID from the full timeout URL
    // QR encodes: https://tgp-coreschemas.vercel.app/timeout/{requestId}
    const scannedId =
      decodedText.trim().split("/timeout/")[1]?.split("/")[0] ?? "";
    if (scannedId !== assignment.request.id) {
      setScanState("error");
      setScanError(
        "Invalid QR code. Please scan the QR code from the official coverage confirmation.",
      );
      return;
    }

    // Valid — proceed to confirm
    setScanState("success");
    setTimeout(() => {
      if (isMounted.current) onConfirm();
    }, 800); // brief success flash before closing
  };

  const handleClose = async () => {
    await stopScanner();
    setScanState("idle");
    setScanError("");
    onClose();
  };

  const handleRetry = async () => {
    setScanState("idle");
    setScanError("");
    setScannerReady(false);
    setTimeout(() => {
      if (isMounted.current) startScanner();
    }, 300);
  };

  if (!assignment) return null;
  const req = assignment.request;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: {
        sx: {
          borderRadius: "10px",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 8px 40px rgba(53,53,53,0.12)",
          overflow: "hidden",
        },
      } }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 2.5,
              height: 26,
              borderRadius: "10px",
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
              Scan QR to Complete
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.7rem",
                color: "text.secondary",
                mt: 0.2,
              }}
            >
              Scan the QR code from the client's confirmation
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={handleClose}
          disabled={completing}
          sx={{
            borderRadius: "10px",
            color: "text.secondary",
            flexShrink: 0,
            "&:hover": { backgroundColor: HOVER_BG },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
          {/* Event info */}
          <Box
            sx={{
              px: 1.75,
              py: 1.25,
              borderRadius: "10px",
              mb: 2,
              border: `1px solid ${border}`,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.02)"
                : "rgba(53,53,53,0.02)",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.84rem",
                fontWeight: 600,
                color: "text.primary",
              }}
            >
              {req?.title}
            </Typography>
            {req?.event_date && (
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.73rem",
                  color: "text.secondary",
                  mt: 0.3,
                }}
              >
                {new Date(req.event_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </Typography>
            )}
          </Box>

          {/* ── Scanner area ── */}
          <Box
            sx={{
              position: "relative",
              width: "100%",
              borderRadius: "10px",
              overflow: "hidden",
              border: `1px solid ${border}`,
              backgroundColor: "#000",
              minHeight: 280,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* html5-qrcode mounts here */}
            <Box
              id={SCANNER_ID}
              sx={{
                width: "100%",
                "& video": {
                  borderRadius: "10px !important",
                  width: "100% !important",
                },
                "& img": { display: "none" }, // hide the QR code icon html5-qrcode renders
              }}
            />

            {/* Overlay states */}
            {scanState === "idle" && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isDark ? "#111" : "#1a1a1a",
                  gap: 1,
                }}
              >
                <BrandedLoader size={40} inline />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  Starting camera…
                </Typography>
              </Box>
            )}

            {scanState === "success" && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.85)",
                  gap: 1,
                }}
              >
                <CheckCircleOutlineIcon
                  sx={{ fontSize: 48, color: "#22c55e" }}
                />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    color: "#22c55e",
                  }}
                >
                  QR Code Valid!
                </Typography>
              </Box>
            )}

            {scanState === "error" && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(0,0,0,0.88)",
                  gap: 1.5,
                  px: 3,
                  textAlign: "center",
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 40, color: "#ef4444" }} />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.8rem",
                    color: "#fca5a5",
                    lineHeight: 1.5,
                  }}
                >
                  {scanError}
                </Typography>
                <Box
                  onClick={handleRetry}
                  sx={{
                    mt: 0.5,
                    px: 2,
                    py: 0.75,
                    borderRadius: "10px",
                    cursor: "pointer",
                    backgroundColor: GOLD,
                    color: CHARCOAL,
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    transition: "background-color 0.15s",
                    "&:hover": { backgroundColor: "#e6b920" },
                  }}
                >
                  Try Again
                </Box>
              </Box>
            )}

            {/* Scanning frame overlay */}
            {scanState === "scanning" && scannerReady && (
              <Box
                sx={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  sx={{
                    width: 200,
                    height: 200,
                    position: "relative",
                    "&::before, &::after": {
                      content: '""',
                      position: "absolute",
                      width: 32,
                      height: 32,
                      borderColor: GOLD,
                      borderStyle: "solid",
                    },
                    "&::before": {
                      top: 0,
                      left: 0,
                      borderWidth: "3px 0 0 3px",
                      borderTopLeftRadius: "4px",
                    },
                    "&::after": {
                      bottom: 0,
                      right: 0,
                      borderWidth: "0 3px 3px 0",
                      borderBottomRightRadius: "4px",
                    },
                  }}
                >
                  {/* Other two corners */}
                  <Box
                    sx={{
                      position: "absolute",
                      top: 0,
                      right: 0,
                      width: 32,
                      height: 32,
                      borderTop: `3px solid ${GOLD}`,
                      borderRight: `3px solid ${GOLD}`,
                      borderTopRightRadius: "4px",
                    }}
                  />
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 0,
                      left: 0,
                      width: 32,
                      height: 32,
                      borderBottom: `3px solid ${GOLD}`,
                      borderLeft: `3px solid ${GOLD}`,
                      borderBottomLeftRadius: "4px",
                    }}
                  />
                  {/* Scan line animation */}
                  <Box
                    sx={{
                      position: "absolute",
                      left: 8,
                      right: 8,
                      height: "2px",
                      backgroundColor: GOLD,
                      opacity: 0.8,
                      animation: "scanline 2s ease-in-out infinite",
                      "@keyframes scanline": {
                        "0%": { top: "10%" },
                        "50%": { top: "85%" },
                        "100%": { top: "10%" },
                      },
                    }}
                  />
                </Box>
              </Box>
            )}
          </Box>

          {/* Instruction */}
          {scanState === "scanning" && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                mt: 1.5,
                px: 0.5,
              }}
            >
              <QrCodeScannerIcon
                sx={{ fontSize: 14, color: "text.disabled", flexShrink: 0 }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.73rem",
                  color: "text.secondary",
                  lineHeight: 1.5,
                }}
              >
                Point your camera at the QR code on the client's confirmation
                document.
              </Typography>
            </Box>
          )}

          {/* External error (from DB update failure) */}
          {externalError && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                px: 1.5,
                py: 1.25,
                mt: 1.5,
                borderRadius: "10px",
                backgroundColor: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.25)",
              }}
            >
              <ErrorOutlineIcon
                sx={{ fontSize: 14, color: "#dc2626", flexShrink: 0, mt: 0.1 }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.76rem",
                  color: "#dc2626",
                  lineHeight: 1.55,
                }}
              >
                {externalError}
              </Typography>
            </Box>
          )}

          {/* Warning */}
          <Box
            sx={{
              display: "flex",
              gap: 1,
              px: 1.5,
              py: 1.25,
              mt: 1.5,
              mb: 1,
              borderRadius: "10px",
              backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.07)",
              border: "1px solid rgba(245,197,43,0.3)",
            }}
          >
            <WarningAmberOutlinedIcon
              sx={{ fontSize: 14, color: "#b45309", flexShrink: 0, mt: 0.1 }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "#b45309",
                lineHeight: 1.55,
              }}
            >
              This action cannot be undone. Only scan the QR code from the
              official confirmation document.
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      {/* ── Footer ── */}
      <Box
        sx={{
          px: 3,
          py: 1.75,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          backgroundColor: isDark
            ? "rgba(255,255,255,0.01)"
            : "rgba(53,53,53,0.01)",
        }}
      >
        <Box
          onClick={handleClose}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "10px",
            cursor: "pointer",
            border: `1px solid ${border}`,
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 500,
            color: "text.secondary",
            transition: "all 0.15s",
            "&:hover": { color: "text.primary", backgroundColor: HOVER_BG },
          }}
        >
          Cancel
        </Box>
      </Box>
    </Dialog>
  );
}




