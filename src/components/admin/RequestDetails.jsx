// src/components/admin/RequestDetails.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, IconButton, Button, Chip, Stack,
  Divider, TextField, FormGroup, CircularProgress,
  Alert, Avatar, useTheme, Checkbox, Tooltip,
} from "@mui/material";
import CloseIcon                   from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import AutoAwesomeOutlinedIcon     from "@mui/icons-material/AutoAwesomeOutlined";
import { supabase }                from "../../lib/supabaseClient";
import { getAvatarUrl }           from "../../components/common/UserAvatar";
import { forwardRequest, declineRequest, approveRequest } from "../../services/adminRequestService";
import { useRequestAssistant }     from "../../hooks/RequestAssistant";

const ALL_SECTIONS = ["News", "Photojournalism", "Videojournalism"];

const SERVICE_SECTION_MAP = {
  "News Article":                           "News",
  "Photo Documentation":                    "Photojournalism",
  "Video Documentation":                    "Videojournalism",
  "Camera Operator (for live streaming)":   "Videojournalism",
};

const STATUS_CONFIG = {
  Pending:        { bg: "#fef3c7", color: "#d97706" },
  Forwarded:      { bg: "#f3e8ff", color: "#7c3aed" },
  Assigned:       { bg: "#fff7ed", color: "#c2410c" },
  "For Approval": { bg: "#e0f2fe", color: "#0369a1" },
  Approved:       { bg: "#dcfce7", color: "#15803d" },
  Declined:       { bg: "#fee2e2", color: "#dc2626" },
};

const SCORE_CONFIG = {
  Low:        { color: "#dc2626" },
  Moderate:   { color: "#d97706" },
  High:       { color: "#15803d" },
  "Very High":{ color: "#1d4ed8" },
};

const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};

const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage.from("coverage-files").getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

// ── Format "HH:MM:SS" → "H:MM AM/PM" ────────────────────────────────────────
function fmtTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Format "YYYY-MM-DD" → localized string ───────────────────────────────────
function fmtDate(d, opts = { month: "long", day: "numeric", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
}

export default function RequestDetails({ open, onClose, request, onActionSuccess }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [actionLoading,     setActionLoading]     = useState(false);
  const [error,             setError]             = useState("");
  const [forwardOpen,       setForwardOpen]       = useState(false);
  const [warningOpen,       setWarningOpen]       = useState(false);
  const [selectedSections,  setSelectedSections]  = useState([]);
  const [secHeads,          setSecHeads]          = useState({});
  const [secHeadsLoading,   setSecHeadsLoading]   = useState(false);
  const [declineOpen,       setDeclineOpen]       = useState(false);
  const [declineReason,     setDeclineReason]     = useState("");
  const [approveOpen,       setApproveOpen]       = useState(false);
  const [adminNotes,        setAdminNotes]        = useState("");
  const [assignedStaffers,  setAssignedStaffers]  = useState([]);

  const checks = useRequestAssistant(open ? request : null);

  const assessmentFlags = React.useMemo(() => {
    if (!checks || checks.loading) return [];
    const flags = [];
    if (checks.lateSubmission?.type === "warning" || checks.lateSubmission?.type === "error")
      flags.push({ title: "Submission Timing", message: checks.lateSubmission.message, type: checks.lateSubmission.type });
    if (checks.incomplete?.type === "warning" || checks.incomplete?.type === "error")
      flags.push({ title: "Completeness", message: checks.incomplete.message, issues: checks.incomplete?.issues, type: checks.incomplete.type });
    if (checks.conflict?.type === "warning" || checks.conflict?.type === "error")
      flags.push({ title: "Scheduling Conflict", message: checks.conflict.message, conflicts: checks.conflict?.conflicts, type: checks.conflict.type });
    return flags;
  }, [checks]);

  const allowedSections = request?.services
    ? [...new Set(
        Object.entries(request.services)
          .filter(([_, pax]) => pax > 0)
          .map(([svc]) => SERVICE_SECTION_MAP[svc])
          .filter(Boolean)
      )]
    : [];

  useEffect(() => {
    if (!open || !request?.id) { setAssignedStaffers([]); return; }
    if (!["Assigned", "For Approval", "Approved"].includes(request.status)) { setAssignedStaffers([]); return; }
    async function loadAssignments() {
      const { data } = await supabase
        .from("coverage_assignments")
        .select("id, section, assigned_to, staffer:assigned_to ( id, full_name, section, avatar_url )")
        .eq("request_id", request.id);
      setAssignedStaffers(data || []);
    }
    loadAssignments();
  }, [open, request?.id, request?.status]);

  useEffect(() => {
    if (request?.services) {
      const suggested = Object.entries(request.services)
        .filter(([_, pax]) => pax > 0)
        .map(([svc]) => SERVICE_SECTION_MAP[svc])
        .filter(Boolean);
      setSelectedSections([...new Set(suggested)]);
    }
  }, [request]);

  useEffect(() => {
    if (!forwardOpen) return;
    async function loadSecHeads() {
      setSecHeadsLoading(true);
      const { data } = await supabase
        .from("profiles").select("id, full_name, section, role")
        .eq("role", "sec_head").in("section", ALL_SECTIONS);
      if (data) {
        const map = {};
        data.forEach((p) => { map[p.section] = p; });
        setSecHeads(map);
      }
      setSecHeadsLoading(false);
    }
    loadSecHeads();
  }, [forwardOpen]);

  const resetState = () => {
    setError(""); setForwardOpen(false); setWarningOpen(false); setDeclineOpen(false);
    setApproveOpen(false); setDeclineReason(""); setAdminNotes("");
    setSelectedSections([]);
  };

  const handleClose = () => { resetState(); onClose(); };

  const handleForward = async () => {
    if (selectedSections.length === 0) { setError("Select at least one section."); return; }
    setActionLoading(true); setError("");
    try {
      await forwardRequest(request.id, selectedSections);
      setForwardOpen(false); handleClose();
      if (onActionSuccess) onActionSuccess();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) { setError("Please provide a reason for declining."); return; }
    setActionLoading(true); setError("");
    try {
      await declineRequest(request.id, declineReason);
      setDeclineOpen(false); handleClose();
      if (onActionSuccess) onActionSuccess();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  const handleApprove = async () => {
    setActionLoading(true); setError("");
    try {
      await approveRequest(request.id, adminNotes);
      setApproveOpen(false); handleClose();
      if (onActionSuccess) onActionSuccess();
    } catch (err) { setError(err.message); }
    finally { setActionLoading(false); }
  };

  if (!request) return null;

  const coverageComponents = request.services
    ? Object.entries(request.services).filter(([_, pax]) => pax > 0).map(([name, pax]) => ({ name, pax }))
    : [];

  const statusCfg = STATUS_CONFIG[request.status] || { bg: "#f3f4f6", color: "#6b7280" };
  const isMultiDay = !!(request.is_multiday && request.event_days?.length > 0);

  return (
    <>
      <Dialog
        open={open} onClose={handleClose} fullWidth maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 2,
            fontFamily: "'Helvetica Neue', sans-serif",
            height: { md: "90vh" }, maxHeight: "95vh",
            backgroundColor: "background.paper",
            boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.08)",
          },
        }}
      >
        {/* Title bar */}
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 3, height: 28, borderRadius: 1, backgroundColor: "#f5c52b", flexShrink: 0 }} />
            <Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary", lineHeight: 1.3 }}>
                  {request.title}
                </Typography>
                {isMultiDay && (
                  <Box sx={{
                    px: 0.9, py: 0.2, borderRadius: "20px",
                    backgroundColor: isDark ? "#0d1f0d" : "#f0fdf4",
                    border: "1px solid", borderColor: isDark ? "#166534" : "#86efac",
                    fontSize: "0.65rem", fontWeight: 600,
                    color: isDark ? "#4ade80" : "#15803d", flexShrink: 0,
                  }}>
                    {request.event_days.length}-day event
                  </Box>
                )}
              </Box>
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}>
                {request.submitted_at
                  ? `Submitted ${new Date(request.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : "Date unknown"}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, backgroundColor: statusCfg.bg, border: `1px solid ${statusCfg.color}30` }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: statusCfg.color, letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {request.status}
              </Typography>
            </Box>
            <IconButton onClick={handleClose} size="small" sx={{ color: "text.secondary" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* Body */}
        <DialogContent sx={{ p: 0, display: "flex", flexDirection: { xs: "column", md: "row" }, overflow: { xs: "auto", md: "hidden" } }}>
          {/* Left */}
          <Box sx={{ flex: 1, px: 3, py: 3, overflowY: { xs: "visible", md: "auto" }, minWidth: 0 }}>

            <Section label="Event Information">
              <InfoGrid rows={[
                ["Event Title",  request.title],
                ["Description",  request.description],
              ]} isDark={isDark} />

              {/* ── Date / Time — multi-day aware ── */}
              <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 0.75, columnGap: 1, alignItems: "start", mt: 0.75 }}>

                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", pt: isMultiDay ? 0.3 : 0.2 }}>
                  {isMultiDay ? "Coverage Days" : "Date"}
                </Typography>

                {isMultiDay ? (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {request.event_days.map((day, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: "flex", alignItems: "center", gap: 1,
                          px: 1, py: 0.5, borderRadius: 1.5,
                          border: "1px solid", borderColor: "divider",
                          backgroundColor: isDark ? "#1a1a1a" : "#fafafa",
                        }}
                      >
                        <Box sx={{
                          px: 0.9, py: 0.2, borderRadius: "20px",
                          backgroundColor: "#f5c52b", color: "#111",
                          fontSize: "0.7rem", fontWeight: 600,
                          flexShrink: 0, minWidth: 52, textAlign: "center",
                        }}>
                          {fmtDate(day.date, { month: "short", day: "numeric" })}
                        </Box>
                        {day.from_time && day.to_time ? (
                          <Typography sx={{ fontSize: "0.8rem", color: "text.primary" }}>
                            {fmtTime(day.from_time)} – {fmtTime(day.to_time)}
                          </Typography>
                        ) : (
                          <Typography sx={{ fontSize: "0.78rem", color: "text.disabled", fontStyle: "italic" }}>
                            No time set
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.5, pt: 0.2 }}>
                    {fmtDate(request.event_date)}
                  </Typography>
                )}

                {/* Time row — single day only */}
                {!isMultiDay && (
                  <>
                    <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", pt: 0.2 }}>Time</Typography>
                    <Typography sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.5 }}>
                      {request.from_time && request.to_time
                        ? `${fmtTime(request.from_time)} – ${fmtTime(request.to_time)}`
                        : "—"}
                    </Typography>
                  </>
                )}

                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", pt: 0.2 }}>Venue</Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.5 }}>
                  {request.venue || "—"}
                </Typography>
              </Box>
            </Section>

            <Section label="Coverage Requirements">
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 0.5 }}>
                {coverageComponents.length > 0 ? coverageComponents.map((c, idx) => (
                  <Box key={idx} sx={{ px: 1.25, py: 0.5, borderRadius: 1, border: "1px solid", borderColor: "divider", backgroundColor: isDark ? "#1e1e1e" : "#f9fafb" }}>
                    <Typography sx={{ fontSize: "0.8rem", color: "text.primary" }}>
                      {c.name}{" "}
                      <Typography component="span" sx={{ fontSize: "0.78rem", color: "text.secondary" }}>×{c.pax}</Typography>
                    </Typography>
                  </Box>
                )) : <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>—</Typography>}
              </Box>
            </Section>

            <Section label="Client Details">
              <InfoGrid rows={[
                ["Organization",   request.entity?.name || "—"],
                ["Client Type",    request.client_type?.name || "—"],
                ["Submitted By",   request.requester?.full_name || "—"],
                ["Contact Person", request.contact_person || "—"],
                ["Contact Info",   request.contact_info || "—"],
              ]} isDark={isDark} />
            </Section>

            <Section label="Attachment">
              {request.file_url ? (
                <Box onClick={() => openFile(request.file_url)} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, cursor: "pointer", color: "#1976d2", "&:hover": { textDecoration: "underline" } }}>
                  <InsertDriveFileOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography sx={{ fontSize: "0.85rem" }}>{getFileName(request.file_url)}</Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>No file attached</Typography>
              )}
            </Section>

            {request.status === "Forwarded" && request.forwarded_sections?.length > 0 && (
              <Section label="Forwarded To">
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
                  {request.forwarded_sections.map((s, idx) => (
                    <Box key={idx} sx={{ px: 1.25, py: 0.5, borderRadius: 1, backgroundColor: isDark ? "#1e0a2e" : "#f3e8ff", border: "1px solid #7c3aed30" }}>
                      <Typography sx={{ fontSize: "0.8rem", color: "#7c3aed", fontWeight: 500 }}>{s}</Typography>
                    </Box>
                  ))}
                </Stack>
              </Section>
            )}

            {["Assigned", "For Approval", "Approved"].includes(request.status) && assignedStaffers.length > 0 && (
              <Section label="Assigned Staff">
                {["News", "Photojournalism", "Videojournalism"].map((sec) => {
                  const secStaffers = assignedStaffers.filter((a) => a.staffer?.section === sec);
                  if (secStaffers.length === 0) return null;
                  return (
                    <Box key={sec} sx={{ mb: 1.5 }}>
                      <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.07em", textTransform: "uppercase", mb: 0.75 }}>{sec}</Typography>
                      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                        {secStaffers.map((a) => (
                          <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.6, borderRadius: 1.5, border: "1px solid", borderColor: "divider", backgroundColor: isDark ? "#1e1e1e" : "#f9fafb" }}>
                            <Avatar src={getAvatarUrl(a.staffer?.avatar_url)} sx={{ width: 44, height: 44, fontSize: "0.65rem", fontWeight: 700, backgroundColor: "#f5c52b", color: "#212121" }}>
                              {!getAvatarUrl(a.staffer?.avatar_url) && getInitials(a.staffer?.full_name)}
                            </Avatar>
                            <Typography sx={{ fontSize: "0.8rem", color: "text.primary", fontWeight: 500 }}>{a.staffer?.full_name || "—"}</Typography>
                          </Box>
                        ))}
                      </Box>
                    </Box>
                  );
                })}
              </Section>
            )}

            {request.status === "Declined" && request.declined_reason && (
              <Section label="Decline Reason">
                <Box sx={{ p: 1.5, bgcolor: isDark ? "#1a0a0a" : "#fef2f2", borderRadius: 1.5, borderLeft: "3px solid #dc2626" }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "#dc2626" }}>{request.declined_reason}</Typography>
                </Box>
              </Section>
            )}

            {request.status === "Approved" && request.admin_notes && (
              <Section label="Admin Notes">
                <Box sx={{ p: 1.5, bgcolor: isDark ? "#0a1a0a" : "#f0fdf4", borderRadius: 1.5, borderLeft: "3px solid #15803d" }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "#15803d" }}>{request.admin_notes}</Typography>
                </Box>
              </Section>
            )}
          </Box>

          <Divider orientation="horizontal" flexItem sx={{ display: { xs: "block", md: "none" } }} />
          <Divider orientation="vertical"   flexItem sx={{ display: { xs: "none",  md: "flex" } }} />

          {/* Right: Assessment panel */}
          <Box sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0, px: 2.5, py: 3, backgroundColor: isDark ? "#161616" : "#fafafa", overflowY: { xs: "visible", md: "auto" }, display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
              <AutoAwesomeOutlinedIcon sx={{ fontSize: 13, color: "#f5c52b" }} />
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Request Assessment
              </Typography>
            </Box>

            {!checks || checks.loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <CircularProgress size={12} sx={{ color: "#f5c52b" }} />
                <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>Analyzing…</Typography>
              </Box>
            ) : (
              <>
                <AssessCard title="Submission Timing"    check={checks.lateSubmission} isDark={isDark} />
                <AssessCard title="Completeness"         check={checks.incomplete}     isDark={isDark} issues={checks.incomplete?.issues} />
                <AssessCard title="Scheduling Conflict"  check={checks.conflict}       isDark={isDark} conflicts={checks.conflict?.conflicts} />
                {checks.newsworthiness && (
                  <Box sx={{ p: 1.5, borderRadius: 1.5, border: "1px solid", borderColor: "divider", backgroundColor: "background.paper" }}>
                    <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.08em", textTransform: "uppercase", mb: 1 }}>
                      Newsworthiness
                    </Typography>
                    {checks.newsworthiness.score ? (
                      <>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                          <Typography sx={{ fontSize: "0.85rem" }}>{"⭐".repeat(checks.newsworthiness.score)}</Typography>
                          <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: SCORE_CONFIG[checks.newsworthiness.label]?.color || "text.secondary" }}>
                            {checks.newsworthiness.label}
                          </Typography>
                        </Box>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.5, mb: 0.75 }}>{checks.newsworthiness.reasoning}</Typography>
                        {checks.newsworthiness.recommendation && (
                          <Typography sx={{ fontSize: "0.72rem", fontWeight: 600, color: "#1976d2" }}>→ {checks.newsworthiness.recommendation}</Typography>
                        )}
                      </>
                    ) : (
                      <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{checks.newsworthiness.reasoning}</Typography>
                    )}
                  </Box>
                )}
              </>
            )}
          </Box>
        </DialogContent>

        {/* Footer */}
        <Box sx={{ px: 3, py: 1.75, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "#161616" : "#fafafa" }}>
          {request.status === "Pending" && (
            <>
              <Button variant="outlined" size="small" onClick={() => { setError(""); setDeclineOpen(true); }}
                sx={{ textTransform: "none", fontSize: "0.82rem", borderColor: "divider", color: "text.secondary", "&:hover": { borderColor: "#dc2626", color: "#dc2626" } }}>
                Decline
              </Button>
              <Button variant="contained" size="small"
                onClick={() => { setError(""); assessmentFlags.length > 0 ? setWarningOpen(true) : setForwardOpen(true); }}
                sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}>
                Forward to Section
              </Button>
            </>
          )}
          {request.status === "For Approval" && (
            <Button variant="contained" size="small" onClick={() => { setError(""); setApproveOpen(true); }}
              sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#15803d", color: "white", boxShadow: "none", "&:hover": { backgroundColor: "#166534", boxShadow: "none" } }}>
              Approve Request
            </Button>
          )}
        </Box>
      </Dialog>

      {/* Warning Dialog */}
      <Dialog open={warningOpen} onClose={() => setWarningOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2, backgroundColor: "background.paper" } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 3, height: 28, borderRadius: 1, backgroundColor: "#d97706", flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>Assessment Flags Detected</Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}>This request has issues that require your attention before forwarding.</Typography>
          </Box>
        </Box>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {assessmentFlags.map((flag, idx) => {
              const isError = flag.type === "error";
              const borderClr = isError ? "#dc2626" : "#d97706";
              const bgClr = isError ? (isDark ? "rgba(220,38,38,0.06)" : "#fef2f2") : (isDark ? "rgba(217,119,6,0.06)" : "#fffbeb");
              const textClr = isError ? "#dc2626" : "#b45309";
              return (
                <Box key={idx} sx={{ px: 1.5, py: 1.25, borderRadius: 1.5, backgroundColor: bgClr, borderLeft: `3px solid ${borderClr}` }}>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: textClr, mb: 0.4 }}>{isError ? "⚠ " : "• "}{flag.title}</Typography>
                  {flag.message && <Typography sx={{ fontSize: "0.75rem", color: textClr, lineHeight: 1.55 }}>{flag.message}</Typography>}
                  {flag.issues?.map((issue, i) => <Typography key={i} sx={{ fontSize: "0.73rem", color: textClr, lineHeight: 1.6 }}>· {issue}</Typography>)}
                  {flag.conflicts?.map((c, i) => <Typography key={i} sx={{ fontSize: "0.73rem", color: "#d97706", lineHeight: 1.6 }}>· {c.title} ({c.time})</Typography>)}
                </Box>
              );
            })}
          </Box>
          <Box sx={{ mt: 2, px: 1.5, py: 1.25, borderRadius: 1.5, backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb", border: "1px solid", borderColor: "divider" }}>
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.6 }}>
              You may still forward this request, but you are acknowledging that these issues have been reviewed and you are choosing to proceed.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button onClick={() => setWarningOpen(false)} size="small" sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}>Go Back</Button>
          <Button variant="contained" size="small" onClick={() => { setWarningOpen(false); setForwardOpen(true); }}
            sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#d97706", color: "#fff", boxShadow: "none", "&:hover": { backgroundColor: "#b45309", boxShadow: "none" } }}>
            I Understand, Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* Forward Dialog */}
      <Dialog open={forwardOpen} onClose={() => !actionLoading && setForwardOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 2, backgroundColor: "background.paper" } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>Forward to Section</Typography>
          <IconButton onClick={() => setForwardOpen(false)} size="small" disabled={actionLoading} sx={{ color: "text.secondary" }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 2, lineHeight: 1.6 }}>
            Sections are pre-selected based on the client's requested services. Only relevant sections can be forwarded to.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.82rem" }}>{error}</Alert>}
          {secHeadsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}><CircularProgress size={20} sx={{ color: "#f5c52b" }} /></Box>
          ) : (
            <FormGroup sx={{ gap: 1 }}>
              {ALL_SECTIONS.map((section) => {
                const secHead = secHeads[section];
                const isAllowed = allowedSections.includes(section);
                const isChecked = selectedSections.includes(section);
                const isDisabled = actionLoading || !isAllowed;
                return (
                  <Tooltip key={section} title={!isAllowed ? "Not required for this request's services" : ""} placement="right" arrow>
                    <Box
                      onClick={() => { if (isDisabled) return; setSelectedSections((prev) => prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]); }}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5, p: 1.5, borderRadius: 1.5, border: "1px solid",
                        borderColor: isDisabled ? "divider" : isChecked ? "#f5c52b" : "divider",
                        backgroundColor: isDisabled ? (isDark ? "#111" : "#f9fafb") : isChecked ? (isDark ? "#1e1800" : "#fffbeb") : "background.paper",
                        cursor: isDisabled ? "not-allowed" : "pointer", opacity: isDisabled ? 0.45 : 1,
                        transition: "border-color 0.15s, background-color 0.15s, opacity 0.15s",
                        "&:hover": !isDisabled ? { borderColor: "#f5c52b" } : {},
                      }}
                    >
                      <Avatar sx={{ width: 44, height: 44, fontSize: "0.8rem", fontWeight: 700, backgroundColor: secHead && isAllowed ? "#f5c52b" : (isDark ? "#333" : "#e5e7eb"), color: secHead && isAllowed ? "#111827" : "text.secondary" }}>
                        {secHead ? getInitials(secHead.full_name) : "?"}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: "0.85rem", fontWeight: 600, color: isDisabled ? "text.disabled" : "text.primary" }}>{section}</Typography>
                        <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
                          {isDisabled ? "Not required for this request" : secHead ? secHead.full_name : "No section head assigned"}
                        </Typography>
                      </Box>
                      <Checkbox checked={isChecked} disabled={isDisabled} size="small" sx={{ p: 0, color: "divider", "&.Mui-checked": { color: "#f5c52b" } }} />
                    </Box>
                  </Tooltip>
                );
              })}
            </FormGroup>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setForwardOpen(false)} disabled={actionLoading} size="small" sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}>Cancel</Button>
          <Button variant="contained" onClick={handleForward} disabled={actionLoading} size="small"
            sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}>
            {actionLoading ? <CircularProgress size={16} sx={{ color: "#111827" }} /> : "Confirm Forward"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={declineOpen} onClose={() => !actionLoading && setDeclineOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2, backgroundColor: "background.paper" } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>Decline Request</Typography>
          <IconButton onClick={() => setDeclineOpen(false)} size="small" disabled={actionLoading} sx={{ color: "text.secondary" }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 2, lineHeight: 1.6 }}>Provide a reason for declining. The client will be notified.</Typography>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.82rem" }}>{error}</Alert>}
          <TextField label="Reason for Declining" multiline rows={4} fullWidth value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} disabled={actionLoading}
            placeholder="e.g. Insufficient preparation time..." size="small"
            sx={{ "& .MuiInputBase-input": { fontSize: "0.85rem" }, "& .MuiInputLabel-root": { fontSize: "0.85rem" } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeclineOpen(false)} disabled={actionLoading} size="small" sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDecline} disabled={actionLoading} size="small"
            sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, boxShadow: "none", "&:hover": { boxShadow: "none" } }}>
            {actionLoading ? <CircularProgress size={16} /> : "Confirm Decline"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approve Dialog */}
      <Dialog open={approveOpen} onClose={() => !actionLoading && setApproveOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2, backgroundColor: "background.paper" } }}>
        <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>Approve Request</Typography>
          <IconButton onClick={() => setApproveOpen(false)} size="small" disabled={actionLoading} sx={{ color: "text.secondary" }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", mb: 2, lineHeight: 1.6 }}>Approving will notify the client and finalize the request. You may add optional notes.</Typography>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.82rem" }}>{error}</Alert>}
          <TextField label="Admin Notes (optional)" multiline rows={3} fullWidth value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} disabled={actionLoading}
            placeholder="e.g. Please coordinate with the assigned staff before the event." size="small"
            sx={{ "& .MuiInputBase-input": { fontSize: "0.85rem" }, "& .MuiInputLabel-root": { fontSize: "0.85rem" } }} />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setApproveOpen(false)} disabled={actionLoading} size="small" sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}>Cancel</Button>
          <Button variant="contained" onClick={handleApprove} disabled={actionLoading} size="small"
            sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#15803d", color: "white", boxShadow: "none", "&:hover": { backgroundColor: "#166534", boxShadow: "none" } }}>
            {actionLoading ? <CircularProgress size={16} /> : "Confirm Approve"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Section({ label, children }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1, pb: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function InfoGrid({ rows, isDark }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 0.6, columnGap: 1, alignItems: "start" }}>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", pt: 0.2 }}>{label}</Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.5 }}>{value || "—"}</Typography>
        </React.Fragment>
      ))}
    </Box>
  );
}

function AssessCard({ title, check, issues, conflicts, isDark }) {
  const type = check?.type;
  const borderColor = type === "success" ? "#15803d" : type === "warning" ? "#d97706" : type === "error" ? "#dc2626" : "divider";
  const dotColor = type === "success" ? "#15803d" : type === "warning" ? "#d97706" : type === "error" ? "#dc2626" : "#9ca3af";
  const textColor = type === "success" ? "#15803d" : type === "warning" ? "#d97706" : type === "error" ? "#dc2626" : "text.secondary";
  return (
    <Box sx={{ p: 1.5, borderRadius: 1.5, border: "1px solid", borderColor: "divider", borderLeft: `3px solid ${borderColor}`, backgroundColor: "background.paper" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.4 }}>
        <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: dotColor, flexShrink: 0 }} />
        <Typography sx={{ fontSize: "0.75rem", fontWeight: 700, color: "text.primary" }}>{title}</Typography>
      </Box>
      {check?.message && <Typography sx={{ fontSize: "0.73rem", color: textColor, lineHeight: 1.5, pl: 1.5 }}>{check.message}</Typography>}
      {issues?.map((issue, idx) => <Typography key={idx} sx={{ fontSize: "0.72rem", color: textColor, lineHeight: 1.6, pl: 1.5 }}>· {issue}</Typography>)}
      {conflicts?.map((c, idx) => <Typography key={idx} sx={{ fontSize: "0.72rem", color: "#d97706", lineHeight: 1.6, pl: 1.5 }}>· {c.title} ({c.time})</Typography>)}
      {!type && !check?.message && <Typography sx={{ fontSize: "0.73rem", color: "text.secondary", pl: 1.5 }}>Checking…</Typography>}
    </Box>
  );
}