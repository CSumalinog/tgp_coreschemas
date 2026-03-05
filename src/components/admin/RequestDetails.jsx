// src/components/admin/RequestDetails.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Box, Typography, IconButton, Button, Chip, Stack,
  Divider, TextField, FormGroup, FormControlLabel,
  Checkbox, CircularProgress, Alert, Avatar,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import { supabase } from "../../lib/supabaseClient";
import { forwardRequest, declineRequest, approveRequest } from "../../services/adminRequestService";
import { useRequestAssistant } from "../../hooks/RequestAssistant";

const ALL_SECTIONS = ["News", "Photojournalism", "Videojournalism"];

const SERVICE_SECTION_MAP = {
  "News Article": "News",
  "Photo Documentation": "Photojournalism",
  "Video Documentation": "Videojournalism",
  "Camera Operator (for live streaming)": "Videojournalism",
};

const STATUS_COLORS = {
  Pending: "#1976d2",
  Forwarded: "#7b1fa2",
  Assigned: "#f57c00",
  Approved: "#43a047",
  Declined: "#d32f2f",
};

const SCORE_COLORS = {
  Low: { bg: "#fdecea", color: "#d32f2f" },
  Moderate: { bg: "#fff8e1", color: "#f57c00" },
  High: { bg: "#e8f5e9", color: "#388e3c" },
  "Very High": { bg: "#e3f2fd", color: "#1565c0" },
};

const SCORE_STARS = (score) => "⭐".repeat(score || 0);

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

// Section → which profiles.section value maps to it
const SECTION_HEAD_MAP = {
  News: "News",
  Photojournalism: "Photojournalism",
  Videojournalism: "Videojournalism",
};

export default function RequestDetails({ open, onClose, request, onActionSuccess }) {
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const [forwardOpen, setForwardOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState([]);
  const [secHeads, setSecHeads] = useState({}); // { News: {...}, Photojournalism: {...}, ... }
  const [secHeadsLoading, setSecHeadsLoading] = useState(false);

  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");

  const checks = useRequestAssistant(open ? request : null);

  // ── Pre-select sections based on services ──
  useEffect(() => {
    if (request?.services) {
      const suggested = Object.entries(request.services)
        .filter(([_, pax]) => pax > 0)
        .map(([svc]) => SERVICE_SECTION_MAP[svc])
        .filter(Boolean);
      setSelectedSections([...new Set(suggested)]);
    }
  }, [request]);

  // ── Fetch sec heads when forward dialog opens ──
  useEffect(() => {
    if (!forwardOpen) return;
    async function loadSecHeads() {
      setSecHeadsLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, section, role")
        .eq("role", "sec_head")
        .in("section", ALL_SECTIONS);

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
    setError("");
    setForwardOpen(false);
    setDeclineOpen(false);
    setApproveOpen(false);
    setDeclineReason("");
    setAdminNotes("");
    setSelectedSections([]);
  };

  const handleClose = () => { resetState(); onClose(); };

  const handleForward = async () => {
    if (selectedSections.length === 0) {
      setError("Please select at least one section to forward to.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await forwardRequest(request.id, selectedSections);
      setForwardOpen(false);
      handleClose();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async () => {
    if (!declineReason.trim()) {
      setError("Please provide a reason for declining.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      await declineRequest(request.id, declineReason);
      setDeclineOpen(false);
      handleClose();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    setError("");
    try {
      await approveRequest(request.id, adminNotes);
      setApproveOpen(false);
      handleClose();
      if (onActionSuccess) onActionSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (!request) return null;

  const coverageComponents = request.services
    ? Object.entries(request.services).filter(([_, pax]) => pax > 0).map(([name, pax]) => ({ name, pax }))
    : [];

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3, fontFamily: "'Helvetica Neue', sans-serif", height: "90vh" } }}
      >
        {/* Header */}
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>Request Details</Typography>
            <Chip
              label={request.status}
              size="small"
              sx={{
                backgroundColor: STATUS_COLORS[request.status] + "20",
                color: STATUS_COLORS[request.status],
                fontWeight: 600,
                fontSize: "0.72rem",
                textTransform: "uppercase",
                letterSpacing: 0.5,
              }}
            />
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ py: 0, px: 0 }}>
          <Box sx={{ display: "flex", height: "100%" }}>
            {/* ── Left: Request Info ── */}
            <Box sx={{ flex: 1, px: 4, py: 3, overflowY: "auto" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "160px 1fr", rowGap: 0.5, columnGap: 1, alignItems: "start" }}>
                <RowLabel>Event Title</RowLabel>
                <RowValue>{request.title}</RowValue>

                <RowLabel>Description</RowLabel>
                <RowValue>{request.description}</RowValue>

                <RowLabel>Event Date</RowLabel>
                <RowValue>{request.event_date || "—"}</RowValue>

                <RowLabel>Time</RowLabel>
                <RowValue>{request.from_time && request.to_time ? `${request.from_time} - ${request.to_time}` : "—"}</RowValue>

                <RowLabel>Venue</RowLabel>
                <RowValue>{request.venue}</RowValue>

                <RowLabel>Services Needed</RowLabel>
                <Box>
                  {coverageComponents.length > 0 ? (
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                      {coverageComponents.map((c, idx) => (
                        <Chip key={idx} label={`${c.name} (${c.pax})`} size="small" sx={{ borderRadius: 2, fontSize: "0.8rem" }} />
                      ))}
                    </Stack>
                  ) : (
                    <Typography sx={{ fontSize: "0.88rem", color: "#9e9e9e" }}>—</Typography>
                  )}
                </Box>

                <RowLabel>Client</RowLabel>
                <RowValue>{request.entity?.name || "—"}</RowValue>

                <RowLabel>Client Type</RowLabel>
                <RowValue>{request.client_type?.name || "—"}</RowValue>

                <RowLabel>Submitted By</RowLabel>
                <RowValue>{request.requester?.full_name || "—"}</RowValue>

                <RowLabel>Contact Person</RowLabel>
                <RowValue>{request.contact_person}</RowValue>

                <RowLabel>Contact Info</RowLabel>
                <RowValue>{request.contact_info}</RowValue>

                <RowLabel>Date Submitted</RowLabel>
                <RowValue>{request.submitted_at ? new Date(request.submitted_at).toLocaleDateString() : "—"}</RowValue>

                <RowLabel>File Attachment</RowLabel>
                <Box>
                  {request.file_url ? (
                    <Box
                      onClick={() => openFile(request.file_url)}
                      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, cursor: "pointer", color: "#1976d2", "&:hover": { textDecoration: "underline" } }}
                    >
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: 16 }} />
                      <Typography sx={{ fontSize: "0.88rem" }}>{getFileName(request.file_url)}</Typography>
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: "0.88rem", color: "#9e9e9e" }}>No file attached</Typography>
                  )}
                </Box>

                {request.status === "Forwarded" && request.forwarded_sections?.length > 0 && (
                  <>
                    <RowLabel>Forwarded To</RowLabel>
                    <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                      {request.forwarded_sections.map((s, idx) => (
                        <Chip key={idx} label={s} size="small" sx={{ borderRadius: 2, fontSize: "0.8rem", backgroundColor: "#f3e5f5", color: "#7b1fa2" }} />
                      ))}
                    </Stack>
                  </>
                )}

                {request.status === "Declined" && request.declined_reason && (
                  <>
                    <RowLabel>Decline Reason</RowLabel>
                    <Box sx={{ p: 1.5, bgcolor: "#fdecea", borderRadius: 2 }}>
                      <Typography sx={{ fontSize: "0.88rem", color: "#d32f2f" }}>{request.declined_reason}</Typography>
                    </Box>
                  </>
                )}

                {request.status === "Approved" && request.admin_notes && (
                  <>
                    <RowLabel>Admin Notes</RowLabel>
                    <Box sx={{ p: 1.5, bgcolor: "#e8f5e9", borderRadius: 2 }}>
                      <Typography sx={{ fontSize: "0.88rem", color: "#388e3c" }}>{request.admin_notes}</Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* ── Right: System Assistant Panel ── */}
            <Box sx={{ width: 350, px: 2.5, py: 3, backgroundColor: "#fafafa", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <AutoAwesomeOutlinedIcon sx={{ fontSize: 16, color: "#f5c52b" }} />
                <Typography sx={{ fontWeight: 600, fontSize: "0.85rem", color: "#212121" }}>Request Assessment</Typography>
              </Box>

              {!checks || checks.loading ? (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
                  <CircularProgress size={14} sx={{ color: "#f5c52b" }} />
                  <Typography sx={{ fontSize: "0.8rem", color: "#9e9e9e" }}>Analyzing request...</Typography>
                </Box>
              ) : (
                <>
                  <CheckCard title="Submission Timing" type={checks.lateSubmission?.type} message={checks.lateSubmission?.message} />
                  <CheckCard title="Request Completeness" type={checks.incomplete?.type} message={checks.incomplete?.message} issues={checks.incomplete?.issues} />
                  <CheckCard title="Scheduling Conflict" type={checks.conflict?.type} message={checks.conflict?.message} conflicts={checks.conflict?.conflicts} />
                  {checks.newsworthiness && (
                    <Box sx={{ borderRadius: 2, border: "1px solid #e0e0e0", p: 1.5, backgroundColor: "white" }}>
                      <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#212121", mb: 1 }}>Newsworthiness</Typography>
                      {checks.newsworthiness.score ? (
                        <>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                            <Typography sx={{ fontSize: "0.85rem" }}>{SCORE_STARS(checks.newsworthiness.score)}</Typography>
                            <Chip
                              label={checks.newsworthiness.label}
                              size="small"
                              sx={{
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                backgroundColor: SCORE_COLORS[checks.newsworthiness.label]?.bg || "#f5f5f5",
                                color: SCORE_COLORS[checks.newsworthiness.label]?.color || "#757575",
                              }}
                            />
                          </Box>
                          <Typography sx={{ fontSize: "0.78rem", color: "#616161", lineHeight: 1.5, mb: 1 }}>{checks.newsworthiness.reasoning}</Typography>
                          {checks.newsworthiness.recommendation && (
                            <Typography sx={{ fontSize: "0.75rem", fontWeight: 600, color: "#1976d2" }}>→ {checks.newsworthiness.recommendation}</Typography>
                          )}
                        </>
                      ) : (
                        <Typography sx={{ fontSize: "0.78rem", color: "#9e9e9e" }}>{checks.newsworthiness.reasoning}</Typography>
                      )}
                    </Box>
                  )}
                </>
              )}
            </Box>
          </Box>
        </DialogContent>

        <Divider />

        {/* ── Action Buttons ── */}
        <DialogActions sx={{ px: 4, py: 2, gap: 1 }}>
          {request.status === "Pending" && (
            <>
              <Button variant="outlined" color="error" onClick={() => { setError(""); setDeclineOpen(true); }} sx={{ textTransform: "none" }}>
                Decline
              </Button>
              <Button
                variant="contained"
                onClick={() => { setError(""); setForwardOpen(true); }}
                sx={{ textTransform: "none", backgroundColor: "#f5c52b", color: "#212121", "&:hover": { backgroundColor: "#e6b920" } }}
              >
                Forward
              </Button>
            </>
          )}
          {request.status === "Assigned" && (
            <Button
              variant="contained"
              onClick={() => { setError(""); setApproveOpen(true); }}
              sx={{ textTransform: "none", backgroundColor: "#43a047", color: "white", "&:hover": { backgroundColor: "#388e3c" } }}
            >
              Approve
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ── Forward Dialog ── */}
      <Dialog
        open={forwardOpen}
        onClose={() => !actionLoading && setForwardOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 600,
            fontSize: "0.9rem",
            borderBottom: "1px solid #e0e0e0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          Forward to Section/s
          <IconButton onClick={() => setForwardOpen(false)} size="small" disabled={actionLoading}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Typography sx={{ fontSize: "0.85rem", color: "#757575", mb: 2 }}>
            Select which sections should handle this request. Sections are pre-selected based on requested services.
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

          {secHeadsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={22} sx={{ color: "#f5c52b" }} />
            </Box>
          ) : (
            <FormGroup sx={{ gap: 1 }}>
              {ALL_SECTIONS.map((section) => {
                const secHead = secHeads[section];
                const isChecked = selectedSections.includes(section);
                return (
                  <Box
                    key={section}
                    onClick={() => !actionLoading && setSelectedSections((prev) =>
                      prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
                    )}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1.5,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: isChecked ? "#f5c52b" : "#e0e0e0",
                      backgroundColor: "white",
                      cursor: "pointer",
                      transition: "all 0.15s",
                      "&:hover": { borderColor: "#f5c52b" },
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 44,
                        height: 44,
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        backgroundColor: secHead ? "#f5c52b" : "#e0e0e0",
                        color: secHead ? "#212121" : "#9e9e9e",
                      }}
                    >
                      {secHead ? getInitials(secHead.full_name) : "?"}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "#212121" }}>
                        {section}
                      </Typography>
                      <Typography sx={{ fontSize: "0.75rem", color: "#9e9e9e" }}>
                        {secHead ? secHead.full_name : "No sec head assigned"}
                      </Typography>
                    </Box>
                    <Checkbox
                      checked={isChecked}
                      disabled={actionLoading}
                      size="small"
                      sx={{ p: 0, color: "#e0e0e0", "&.Mui-checked": { color: "#f5c52b" } }}
                    />
                  </Box>
                );
              })}
            </FormGroup>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setForwardOpen(false)} disabled={actionLoading} sx={{ textTransform: "none", color: "#757575" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleForward}
            disabled={actionLoading}
            sx={{ textTransform: "none", backgroundColor: "#f5c52b", color: "#212121", fontWeight: 600, "&:hover": { backgroundColor: "#e6b920" } }}
          >
            {actionLoading ? <CircularProgress size={18} sx={{ color: "#212121" }} /> : "Confirm Forward"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Decline Dialog ── */}
      <Dialog
        open={declineOpen}
        onClose={() => !actionLoading && setDeclineOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "0.95rem", borderBottom: "1px solid #e0e0e0", mb: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Decline Request
          <IconButton onClick={() => setDeclineOpen(false)} size="small" disabled={actionLoading}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.85rem", color: "#757575", mb: 2 }}>
            Provide a reason for declining. The client will be notified.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <TextField
            label="Reason for Declining"
            multiline
            rows={4}
            fullWidth
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            disabled={actionLoading}
            placeholder="e.g. Insufficient time preparation..."
            inputProps={{ style: { fontSize: "0.875rem" } }}
            InputLabelProps={{ style: { fontSize: "0.875rem" } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setDeclineOpen(false)} disabled={actionLoading} sx={{ textTransform: "none", color: "#757575" }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDecline} disabled={actionLoading} sx={{ textTransform: "none" }}>
            {actionLoading ? <CircularProgress size={18} /> : "Confirm Decline"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Approve Dialog ── */}
      <Dialog
        open={approveOpen}
        onClose={() => !actionLoading && setApproveOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 600, fontSize: "0.95rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          Approve Request
          <IconButton onClick={() => setApproveOpen(false)} size="small" disabled={actionLoading}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.85rem", color: "#757575", mb: 2 }}>
            Approving this request will notify the client. You may add optional notes.
          </Typography>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          <TextField
            label="Admin Notes (optional)"
            multiline
            rows={3}
            fullWidth
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            disabled={actionLoading}
            placeholder="e.g. Please coordinate with the assigned staff..."
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={() => setApproveOpen(false)} disabled={actionLoading} sx={{ textTransform: "none", color: "#757575" }}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleApprove}
            disabled={actionLoading}
            sx={{ textTransform: "none", backgroundColor: "#43a047", color: "white", "&:hover": { backgroundColor: "#388e3c" } }}
          >
            {actionLoading ? <CircularProgress size={18} /> : "Confirm Approve"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ── Check Card ──
function CheckCard({ title, type, message, issues, conflicts }) {
  const iconMap = {
    success: <CheckCircleOutlineIcon sx={{ fontSize: 14, color: "#43a047" }} />,
    warning: <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: "#f57c00" }} />,
    error: <ErrorOutlineIcon sx={{ fontSize: 14, color: "#d32f2f" }} />,
  };
  const bgMap = { success: "#f1f8e9", warning: "#fff8e1", error: "#fdecea" };
  const colorMap = { success: "#388e3c", warning: "#e65100", error: "#c62828" };

  return (
    <Box sx={{ borderRadius: 2, border: "1px solid #e0e0e0", p: 1.5, backgroundColor: type ? bgMap[type] : "white" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.5 }}>
        {type && iconMap[type]}
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#212121" }}>{title}</Typography>
      </Box>
      {message && <Typography sx={{ fontSize: "0.76rem", color: type ? colorMap[type] : "#757575", lineHeight: 1.5 }}>{message}</Typography>}
      {issues?.map((issue, idx) => (
        <Typography key={idx} sx={{ fontSize: "0.75rem", color: colorMap[type], lineHeight: 1.6 }}>• {issue}</Typography>
      ))}
      {conflicts?.map((c, idx) => (
        <Typography key={idx} sx={{ fontSize: "0.75rem", color: colorMap["warning"], lineHeight: 1.6 }}>• {c.title} ({c.time})</Typography>
      ))}
      {!type && !message && <Typography sx={{ fontSize: "0.76rem", color: "#9e9e9e" }}>Checking...</Typography>}
    </Box>
  );
}

function RowLabel({ children }) {
  return <Typography sx={{ fontSize: "0.82rem", color: "#9e9e9e", fontWeight: 500, pt: 0.3 }}>{children}</Typography>;
}

function RowValue({ children }) {
  return <Typography sx={{ fontSize: "0.88rem", color: "#212121" }}>{children || "—"}</Typography>;
}