import React, { useCallback, useState } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  Avatar,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../common/UserAvatar";

const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

const AVATAR_COLORS = [
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#EAF3DE", color: "#27500A" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#FBEAF0", color: "#72243E" },
  { bg: "#dbeafe", color: "#1e40af" },
];

const getAvatarColor = (id) => {
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const computeDuration = (timedIn, completedAt) => {
  if (!timedIn || !completedAt) return null;
  const diffMs = new Date(completedAt) - new Date(timedIn);
  if (diffMs <= 0) return null;
  const totalMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

export default function CoverageCompletionDialog({
  open,
  assignment,
  isDark,
  border,
  onClose,
}) {
  const staffers = assignment?.staffers || [];
  const [brokenSelfieByStaffId, setBrokenSelfieByStaffId] = useState({});

  const resolveSelfieUrl = useCallback((rawSelfieUrl) => {
    if (!rawSelfieUrl) return null;

    const value = String(rawSelfieUrl).trim();
    if (!value) return null;

    if (/^https?:\/\//i.test(value)) return value;

    const supabaseBaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(
      /\/+$/,
      "",
    );
    if (value.startsWith("/storage/v1/object/public/login-proof/")) {
      return supabaseBaseUrl ? `${supabaseBaseUrl}${value}` : value;
    }

    const normalizedPath = value
      .replace(/^\/?storage\/v1\/object\/public\/login-proof\//i, "")
      .replace(/^login-proof\//i, "")
      .replace(/^\/+/, "");

    return supabase.storage
      .from("login-proof")
      .getPublicUrl(normalizedPath)?.data?.publicUrl;
  }, []);

  if (!assignment) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: {
        sx: {
          borderRadius: "10px",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 20px 60px rgba(0,0,0,0.5)"
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
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "1.02rem",
                color: "text.primary",
              }}
            >
              Coverage completion
            </Typography>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
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
        <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "text.disabled",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              mb: 0.8,
            }}
          >
            Event
          </Typography>

          <Box
            sx={{
              px: 1.75,
              py: 1.3,
              borderRadius: "10px",
              mb: 2.5,
              border: `1px solid ${border}`,
              backgroundColor: isDark
                ? "rgba(255,255,255,0.02)"
                : "rgba(53,53,53,0.02)",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                color: "text.primary",
              }}
            >
              {assignment.title}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.5,
              }}
            >
              {assignment.client}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.3,
              }}
            >
              {assignment.eventDate}
            </Typography>
            {assignment.venue && (
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.73rem",
                  color: "text.secondary",
                  mt: 0.3,
                }}
              >
                📍 {assignment.venue}
              </Typography>
            )}
          </Box>

          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "text.disabled",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              mb: 0.8,
              mt: 0.5,
            }}
          >
            Attendance
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {staffers.map((staffer) => {
              const timeInStr = staffer.timed_in_at
                ? new Date(staffer.timed_in_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—";
              const completedAtStr = staffer.completed_at
                ? new Date(staffer.completed_at).toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : "—";
              const duration = computeDuration(
                staffer.timed_in_at,
                staffer.completed_at,
              );

              return (
                <Box
                  key={staffer.id}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(245,197,43,0.05)",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                  }}
                >
                  {/* Left: Avatar + Name */}
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 38,
                        height: 38,
                        fontSize: ".85rem",
                        fontWeight: 600,
                        backgroundColor: getAvatarColor(staffer.id).bg,
                        color: getAvatarColor(staffer.id).color,
                        flexShrink: 0,
                      }}
                      src={getAvatarUrl(staffer.avatar_url)}
                    >
                      {staffer.full_name
                        ?.split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          color: "text.primary",
                          lineHeight: 1.2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {staffer.full_name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.72rem",
                          color: "text.secondary",
                          mt: 0.15,
                        }}
                      >
                        {(staffer.section || "").toLowerCase() ||
                          "Assigned section"}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Right: Time in / Time out / Duration */}
                  <Box
                    sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}
                  >
                    {[
                      { label: "Time in", value: timeInStr },
                      { label: "Time out", value: completedAtStr },
                    ].map(({ label, value }) => (
                      <Box
                        key={label}
                        sx={{
                          borderRadius: "10px",
                          backgroundColor: isDark
                            ? "rgba(0,0,0,0.25)"
                            : "rgba(53,53,53,0.06)",
                          px: 1.15,
                          py: 0.75,
                          textAlign: "center",
                        }}
                      >
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: "text.disabled",
                          }}
                        >
                          {label}
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.78rem",
                            fontWeight: 600,
                            color: "text.primary",
                          }}
                        >
                          {value}
                        </Typography>
                      </Box>
                    ))}

                    {/* Duration */}
                    <Box
                      sx={{
                        borderRadius: "10px",
                        backgroundColor: isDark
                          ? "rgba(0,0,0,0.25)"
                          : "rgba(53,53,53,0.06)",
                        px: 1.15,
                        py: 0.75,
                        textAlign: "center",
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "text.disabled",
                        }}
                      >
                        Duration
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: isDark ? "#f5c52b" : "#d97706",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          px: 0.6,
                          py: 0.25,
                          borderRadius: "8px",
                          border: isDark
                            ? "1px solid rgba(245,197,43,0.45)"
                            : "1px solid rgba(217,119,6,0.35)",
                          backgroundColor: isDark
                            ? "rgba(245,197,43,0.14)"
                            : "rgba(245,197,43,0.16)",
                        }}
                      >
                        {duration || "—"}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.7rem",
              fontWeight: 700,
              color: "text.disabled",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              mb: 0.8,
              mt: 1.75,
            }}
          >
            Proof of Attendance
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {staffers.map((staffer) => {
              const selfieUrl = resolveSelfieUrl(staffer.selfie_url);
              const isSelfieBroken = !!brokenSelfieByStaffId[staffer.id];

              return (
                <Box
                  key={staffer.id}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(245,197,43,0.05)",
                  }}
                >
                  <Box
                    sx={{
                      width: "100%",
                      minHeight: 140,
                      borderRadius: "10px",
                      border: `1px solid ${border}`,
                      backgroundColor: isDark
                        ? "rgba(17,17,17,0.45)"
                        : "rgba(53,53,53,0.03)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                    }}
                  >
                    {selfieUrl && !isSelfieBroken ? (
                      <Box
                        component="img"
                        src={selfieUrl}
                        alt="Selfie proof"
                        sx={{
                          width: "100%",
                          maxHeight: 220,
                          objectFit: "cover",
                          cursor: "pointer",
                          transition: "opacity 0.2s",
                          "&:hover": { opacity: 0.9 },
                        }}
                        onError={() =>
                          setBrokenSelfieByStaffId((prev) => ({
                            ...prev,
                            [staffer.id]: true,
                          }))
                        }
                        onClick={() => window.open(selfieUrl, "_blank")}
                      />
                    ) : (
                      <Box sx={{ py: 2.5, px: 1.5 }}>
                        <BrokenImageOutlinedIcon
                          sx={{
                            color: "text.disabled",
                            fontSize: 30,
                            mb: 0.5,
                          }}
                        />
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.95rem",
                            color: "text.secondary",
                          }}
                        >
                          Selfie proof
                        </Typography>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.84rem",
                            color: "text.disabled",
                            mt: 0.25,
                          }}
                        >
                          Image unavailable
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}

