import React, { useCallback, useState, useEffect } from "react";
import {
  Box,
  Typography,
  Dialog,
  DialogContent,
  Avatar,
  IconButton,
  CircularProgress,
  Collapse,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
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

const fmtTime = (ts) => {
  if (!ts) return null;
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

export default function AdminCoverageCompletionDialog({
  open,
  event,
  isDark,
  border,
  maximized = false,
  onClose,
}) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [brokenSelfieById, setBrokenSelfieById] = useState({});
  const [expandedProofIds, setExpandedProofIds] = useState(new Set());

  useEffect(() => {
    if (!open || !event?.id) {
      setSections([]);
      setExpandedProofIds(new Set());
      return;
    }

    async function loadSections() {
      setLoading(true);
      try {
        const requestId = event?.requestId || event?.id;
        const { data, error } = await supabase
          .from("coverage_assignments")
          .select(
            `
            id,
            section_id,
            staff_id,
            selfie_url,
            timed_in_at,
            completed_at,
            sections:section_id (id, name),
            staff:staff_id (id, full_name, avatar_url)
          `,
          )
          .eq("request_id", requestId)
          .order("sections(name), staff(full_name)");

        if (error) throw error;

        // Group by section
        const grouped = {};
        if (data) {
          data.forEach((assignment) => {
            const sectionName = assignment.sections?.name || "Unknown Section";
            if (!grouped[sectionName]) {
              grouped[sectionName] = [];
            }
            grouped[sectionName].push(assignment);
          });
        }

        // Convert to array and sort sections alphabetically
        const sectionsArray = Object.entries(grouped).map(([name, staffers]) => ({
          name,
          staffers,
        }));
        sectionsArray.sort((a, b) => a.name.localeCompare(b.name));

        setSections(sectionsArray);
      } catch (err) {
        console.error("Error loading coverage assignments:", err);
      } finally {
        setLoading(false);
      }
    }

    loadSections();
  }, [open, event?.id, event?.requestId]);

  const toggleProof = (id) => {
    setExpandedProofIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

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

  if (!event) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maximized ? "lg" : "sm"}
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: "10px",
          backgroundColor: "background.paper",
          width: maximized ? "min(1100px, 96vw)" : undefined,
          height: maximized ? "min(92vh, 900px)" : undefined,
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 20px 60px rgba(0,0,0,0.5)"
            : "0 8px 40px rgba(53,53,53,0.12)",
        },
      }}
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
          <Box
            sx={{
              width: 2.5,
              height: 26,
              borderRadius: "10px",
              backgroundColor: "#22c55e",
              flexShrink: 0,
            }}
          />
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "1.02rem",
                color: "text.primary",
              }}
            >
              Coverage progress
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

      <DialogContent
        sx={{ p: 0, maxHeight: maximized ? "calc(92vh - 74px)" : undefined }}
      >
        <Box sx={{ px: 3, pt: 2.5, pb: 3 }}>
          {/* Event Details */}
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
                fontSize: "0.9rem",
                fontWeight: 600,
                color: "text.primary",
              }}
            >
              {event.title}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.5,
              }}
            >
              {event.client}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.73rem",
                color: "text.secondary",
                mt: 0.3,
              }}
            >
              {event.eventDate}
            </Typography>
            {event.venue && (
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.73rem",
                  color: "text.secondary",
                  mt: 0.3,
                }}
              >
                📍 {event.venue}
              </Typography>
            )}
          </Box>

          {/* ATTENDANCE */}
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
            Attendance
          </Typography>

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={28} sx={{ color: "#22c55e" }} />
            </Box>
          ) : sections.length === 0 ? (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.85rem",
                color: "text.secondary",
                textAlign: "center",
                py: 2,
              }}
            >
              No coverage assignments for this event
            </Typography>
          ) : (
            <>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {sections.map((section) => (
                  <Box key={section.name}>
                    {/* Section divider */}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                      <Box sx={{ flex: 1, height: "1px", backgroundColor: border }} />
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.62rem",
                          fontWeight: 700,
                          color: "text.disabled",
                          textTransform: "uppercase",
                          letterSpacing: "0.09em",
                          px: 0.5,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {section.name}
                      </Typography>
                      <Box sx={{ flex: 1, height: "1px", backgroundColor: border }} />
                    </Box>
                    {/* Staffer cards */}
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {section.staffers.map((assignment) => {
                        const timeInStr = fmtTime(assignment.timed_in_at);
                        const completedAtStr = fmtTime(assignment.completed_at);
                        const duration = computeDuration(
                          assignment.timed_in_at,
                          assignment.completed_at,
                        );
                        const avatarColor = getAvatarColor(assignment.staff_id);
                        const avatarUrl = getAvatarUrl(assignment.staff?.avatar_url);
                        const selfieUrl = resolveSelfieUrl(assignment.selfie_url);
                        const proofExpanded = expandedProofIds.has(assignment.id);
                        const isBroken = !!brokenSelfieById[assignment.id];
                        const hasProof = !!assignment.selfie_url;

                        return (
                          <Box
                            key={assignment.id}
                            sx={{
                              px: 1.5,
                              py: 1.25,
                              borderRadius: "10px",
                              border: `1px solid ${border}`,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.02)"
                                : "rgba(245,197,43,0.05)",
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.25,
                            }}
                          >
                            {/* Avatar */}
                            <Avatar
                              src={avatarUrl}
                              sx={{
                                width: 36,
                                height: 36,
                                fontSize: ".82rem",
                                fontWeight: 600,
                                backgroundColor: avatarColor.bg,
                                color: avatarColor.color,
                                flexShrink: 0,
                                mt: 0.15,
                              }}
                            >
                              {!avatarUrl &&
                                assignment.staff?.full_name
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()}
                            </Avatar>

                            {/* Name + Timeline + Proof */}
                            <Box sx={{ minWidth: 0, flex: 1 }}>
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
                                {assignment.staff?.full_name || "Unknown"}
                              </Typography>

                              {/* Timeline pills */}
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 0.75,
                                  flexWrap: "wrap",
                                  mt: 0.75,
                                }}
                              >
                                {[
                                  { label: "Time in", value: timeInStr },
                                  { label: "Time out", value: completedAtStr },
                                ].map(({ label, value }) => (
                                  <Box
                                    key={label}
                                    sx={{
                                      borderRadius: "8px",
                                      backgroundColor: isDark
                                        ? "rgba(0,0,0,0.25)"
                                        : "rgba(53,53,53,0.06)",
                                      px: 1,
                                      py: 0.5,
                                      display: "flex",
                                      alignItems: "baseline",
                                      gap: 0.6,
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontFamily: dm,
                                        fontSize: "0.63rem",
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
                                        color: value ? "text.primary" : "text.disabled",
                                        fontStyle: value ? "normal" : "italic",
                                      }}
                                    >
                                      {value || "—"}
                                    </Typography>
                                  </Box>
                                ))}
                                {/* Duration */}
                                <Box
                                  sx={{
                                    borderRadius: "8px",
                                    px: 1,
                                    py: 0.5,
                                    display: "flex",
                                    alignItems: "baseline",
                                    gap: 0.6,
                                    border: isDark
                                      ? "1px solid rgba(245,197,43,0.35)"
                                      : "1px solid rgba(217,119,6,0.25)",
                                    backgroundColor: isDark
                                      ? "rgba(245,197,43,0.1)"
                                      : "rgba(245,197,43,0.12)",
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontFamily: dm,
                                      fontSize: "0.63rem",
                                      fontWeight: 700,
                                      color: "text.disabled",
                                    }}
                                  >
                                    Duration
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontFamily: dm,
                                      fontSize: "0.78rem",
                                      fontWeight: 600,
                                      color: duration
                                        ? isDark ? "#f5c52b" : "#d97706"
                                        : "text.disabled",
                                      fontStyle: duration ? "normal" : "italic",
                                    }}
                                  >
                                    {duration || "—"}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Proof of attendance — collapsible */}
                              {hasProof && (
                                <Box>
                                  <Box
                                    onClick={() => toggleProof(assignment.id)}
                                    sx={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: 0.4,
                                      mt: 0.9,
                                      cursor: "pointer",
                                      px: 0.75,
                                      py: 0.3,
                                      borderRadius: "8px",
                                      transition: "background 0.15s",
                                      "&:hover": {
                                        backgroundColor: isDark
                                          ? "rgba(255,255,255,0.06)"
                                          : "rgba(53,53,53,0.05)",
                                      },
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontFamily: dm,
                                        fontSize: "0.64rem",
                                        fontWeight: 700,
                                        color: "text.disabled",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.06em",
                                      }}
                                    >
                                      Proof of attendance
                                    </Typography>
                                    <ExpandMoreIcon
                                      sx={{
                                        fontSize: 14,
                                        color: "text.disabled",
                                        transform: proofExpanded
                                          ? "rotate(180deg)"
                                          : "rotate(0deg)",
                                        transition: "transform 0.2s",
                                      }}
                                    />
                                  </Box>
                                  <Collapse in={proofExpanded}>
                                    <Box
                                      sx={{
                                        mt: 0.75,
                                        borderRadius: "10px",
                                        border: `1px solid ${border}`,
                                        overflow: "hidden",
                                        backgroundColor: isDark
                                          ? "rgba(17,17,17,0.45)"
                                          : "rgba(53,53,53,0.03)",
                                      }}
                                    >
                                      {selfieUrl && !isBroken ? (
                                        <Box
                                          component="img"
                                          src={selfieUrl}
                                          alt="Selfie proof"
                                          sx={{
                                            width: "100%",
                                            maxHeight: 240,
                                            objectFit: "cover",
                                            cursor: "pointer",
                                            display: "block",
                                            transition: "opacity 0.2s",
                                            "&:hover": { opacity: 0.9 },
                                          }}
                                          onError={() =>
                                            setBrokenSelfieById((prev) => ({
                                              ...prev,
                                              [assignment.id]: true,
                                            }))
                                          }
                                          onClick={() =>
                                            window.open(selfieUrl, "_blank")
                                          }
                                        />
                                      ) : (
                                        <Box
                                          sx={{
                                            py: 2.5,
                                            display: "flex",
                                            flexDirection: "column",
                                            alignItems: "center",
                                          }}
                                        >
                                          <BrokenImageOutlinedIcon
                                            sx={{
                                              color: "text.disabled",
                                              fontSize: 28,
                                              mb: 0.5,
                                            }}
                                          />
                                          <Typography
                                            sx={{
                                              fontFamily: dm,
                                              fontSize: "0.75rem",
                                              color: "text.disabled",
                                            }}
                                          >
                                            Image unavailable
                                          </Typography>
                                        </Box>
                                      )}
                                    </Box>
                                  </Collapse>
                                </Box>
                              )}
                            </Box>
                          </Box>
                        );
                      })}
                    </Box>
                  </Box>
                ))}
              </Box>
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}


