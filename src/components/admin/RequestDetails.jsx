// src/components/admin/RequestDetails.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  IconButton,
  Button,
  Chip,
  Stack,
  Divider,
  TextField,
  FormGroup,
  CircularProgress,
  Alert,
  Avatar,
  useTheme,
  Checkbox,
  Tooltip,
  Popover,
  Collapse,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBackOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import ViewSidebarOutlinedIcon from "@mui/icons-material/ViewSidebarOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMoreOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import {
  forwardRequest,
  declineRequest,
  approveRequest,
} from "../../services/adminRequestService";
import { useRequestAssistant } from "../../hooks/RequestAssistant";
import BrandedLoader from "../common/BrandedLoader";
import RequestAssessmentPanel from "./RequestAssessmentPanel";

const ALL_SECTIONS = ["News", "Photojournalism", "Videojournalism"];

const SERVICE_SECTION_MAP = {
  "News Article": "News",
  "Photo Documentation": "Photojournalism",
  "Video Documentation": "Videojournalism",
  "Camera Operator (for live streaming)": "Videojournalism",
};

const SERVICE_COLUMNS = [
  { key: "News Article", label: "News Article", section: "News" },
  {
    key: "Photo Documentation",
    label: "Photo Doc",
    section: "Photojournalism",
  },
  {
    key: "Video Documentation",
    label: "Video Doc",
    section: "Videojournalism",
  },
  {
    key: "Camera Operator (for live streaming)",
    label: "Camera Op",
    section: "Videojournalism",
  },
];

// Helper: Determine service based on who assigned (assigner's section)
// Each section head can only assign to their respective service(s)
const getAssignmentService = (assigner, assignerSection) => {
  if (!assigner || !assigner.section) return null;

  const assignerSec = assigner.section;
  // Map each section head to their primary service
  // Note: Video head can assign both Video Doc AND Camera Op - we assume Video Doc by default
  // unless additional logic determines otherwise (e.g., tracking total assignments)
  if (assignerSec === "News") return "News Article";
  if (assignerSec === "Photojournalism") return "Photo Documentation";
  if (assignerSec === "Videojournalism") return "Video Documentation";

  return null;
};

const STATUS_CONFIG = {
  Pending: { bg: "#fef3c7", color: "#d97706" },
  Forwarded: { bg: "#f3e8ff", color: "#7c3aed" },
  Assigned: { bg: "#fff7ed", color: "#c2410c" },
  "For Approval": { bg: "#e0f2fe", color: "#0369a1" },
  Approved: { bg: "#dcfce7", color: "#15803d" },
  "On Going": { bg: "#dbeafe", color: "#1d4ed8" },
  Completed: { bg: "#f0fdf4", color: "#15803d" },
  Declined: { bg: "#fee2e2", color: "#dc2626" },
  Rectified: { bg: "rgba(139,92,246,0.08)", color: "#6d28d9" },
};

const SCORE_CONFIG = {
  Low: { color: "#dc2626" },
  Moderate: { color: "#d97706" },
  High: { color: "#15803d" },
  "Very High": { color: "#1d4ed8" },
};

// Statuses where Decline should be available — FIX #4
const DECLINABLE_STATUSES = ["Pending"];

const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};

const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage
    .from("coverage-files")
    .getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

function fmtTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

function fmtDate(d, opts = { month: "long", day: "numeric", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
}

// ── Service Row with fill bar, inline names, X/Y badge, popover ──────────────
function ServiceRow({
  svcKey,
  label,
  section,
  paxRequested,
  staffers,
  requested,
  isDark,
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  // Filter assignments by service section.
  // An assignment belongs to this service if the assigner (section head) is from the section that manages this service.
  // For example, Photo Documentation is managed by Photojournalism head, so we match assignments where assigner.section === "Photojournalism"
  const sectionStaffers = staffers.filter((a) => {
    // Match based on assigner's section (who created the assignment)
    if (a.assigner?.section === section) return true;

    // Fallback: if no assigner data, try matching the staff member's own section
    // (this handles edge cases or legacy data)
    if (!a.assigner && a.staffer?.section === section) return true;

    return false;
  });

  // Count assignment units as staffer-per-day so multi-day staffing is reflected.
  // We still dedupe duplicate rows for the exact same staffer+date key.
  const seenStaffers = new Set();
  const colStaffers = sectionStaffers.filter((a) => {
    const stafferId = a.assigned_to || a.staffer?.id;
    if (!stafferId) return false;
    const key = `${stafferId}::${a.assignment_date || ""}`;
    if (!key) return false;
    if (seenStaffers.has(key)) return false;
    seenStaffers.add(key);
    return true;
  });
  const assigned = colStaffers.length;
  const total = paxRequested || 0;
  const fillPct =
    total > 0 ? Math.min(100, Math.round((assigned / total) * 100)) : 0;
  const isFull = assigned >= total && total > 0;
  const isPartial = assigned > 0 && assigned < total;
  const hasStaffers = assigned > 0;

  const badgeSx = isFull
    ? {
        bg: isDark ? "rgba(34,197,94,0.12)" : "#f0fdf4",
        border: isDark ? "#166534" : "#86efac",
        dot: "#22c55e",
        text: isDark ? "#4ade80" : "#15803d",
      }
    : isPartial
      ? {
          bg: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb",
          border: isDark ? "#92400e" : "#fde68a",
          dot: "#f59e0b",
          text: isDark ? "#fbbf24" : "#92400e",
        }
      : {
          bg: isDark ? "rgba(255,255,255,0.04)" : "#f9fafb",
          border: isDark ? "#333" : "#e5e7eb",
          dot: "#9ca3af",
          text: "text.secondary",
        };

  const grouped = {};
  colStaffers.forEach((a) => {
    const sec = a.staffer?.section || a.section || "Unknown";
    if (!grouped[sec]) grouped[sec] = [];
    if (!grouped[sec].find((x) => x.id === a.id)) grouped[sec].push(a);
  });

  const MAX_INLINE = 2;
  const inlineNames = colStaffers
    .slice(0, MAX_INLINE)
    .map((a) => a.staffer?.full_name?.split(" ")[0])
    .join(", ");
  const overflow = colStaffers.length - MAX_INLINE;

  return (
    <>
      <Box
        onClick={(e) => hasStaffers && setAnchorEl(e.currentTarget)}
        sx={{
          display: "grid",
          gridTemplateColumns: "130px 1fr auto",
          alignItems: "center",
          gap: 1.5,
          px: 1.75,
          py: 1.25,
          borderRadius: "10px",
          border: "1px solid",
          borderColor: hasStaffers
            ? isDark
              ? "rgba(245,197,43,0.35)"
              : "rgba(245,197,43,0.4)"
            : "divider",
          backgroundColor: hasStaffers
            ? isDark
              ? "rgba(245,197,43,0.04)"
              : "rgba(245,197,43,0.03)"
            : isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(53,53,53,0.015)",
          opacity: requested ? 1 : 0.38,
          cursor: hasStaffers ? "pointer" : "default",
          transition: "all 0.15s",
          "&:hover": hasStaffers
            ? {
                borderColor: "#f5c52b",
                backgroundColor: isDark
                  ? "rgba(245,197,43,0.08)"
                  : "rgba(245,197,43,0.07)",
              }
            : {},
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: "0.78rem",
              fontWeight: 500,
              color: hasStaffers ? "text.primary" : "text.secondary",
              mb: 0.5,
            }}
          >
            {label}
          </Typography>
          <Box
            sx={{
              height: "3px",
              borderRadius: "10px",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.08)"
                : "rgba(53,53,53,0.08)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                height: "100%",
                width: `${fillPct}%`,
                borderRadius: "10px",
                backgroundColor: isFull
                  ? "#22c55e"
                  : isPartial
                    ? "#f59e0b"
                    : "#f5c52b",
                transition: "width 0.3s",
              }}
            />
          </Box>
        </Box>

        {hasStaffers ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              minWidth: 0,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {colStaffers.slice(0, 3).map((a, i) => {
                const url = getAvatarUrl(a.staffer?.avatar_url);
                return (
                  <Avatar
                    key={a.id}
                    src={url || undefined}
                    sx={{
                      width: 24,
                      height: 24,
                      fontSize: "0.5rem",
                      fontWeight: 700,
                      backgroundColor: "#f5c52b",
                      color: "#111827",
                      border: `2px solid ${isDark ? "#1a1a1a" : "#fff"}`,
                      ml: i > 0 ? "-6px" : 0,
                      zIndex: 3 - i,
                    }}
                  >
                    {!url && getInitials(a.staffer?.full_name)}
                  </Avatar>
                );
              })}
            </Box>
            <Typography
              sx={{
                fontSize: "0.75rem",
                color: "text.secondary",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {inlineNames}
              {overflow > 0 ? ` +${overflow}` : ""}
            </Typography>
          </Box>
        ) : (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "text.secondary",
              fontStyle: "italic",
            }}
          >
            {requested ? "No staff assigned yet" : "Not requested"}
          </Typography>
        )}

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            px: 1,
            py: 0.35,
            borderRadius: "10px",
            backgroundColor: badgeSx.bg,
            border: "1px solid",
            borderColor: badgeSx.border,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: badgeSx.dot,
            }}
          />
          <Typography
            sx={{
              fontSize: "0.7rem",
              fontWeight: 600,
              color: badgeSx.text,
              whiteSpace: "nowrap",
            }}
          >
            {requested ? `${assigned} / ${total}` : "— / —"}
          </Typography>
        </Box>
      </Box>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            sx: {
              borderRadius: "10px",
              border: "1px solid",
              borderColor: isDark
                ? "rgba(255,255,255,0.1)"
                : "rgba(53,53,53,0.1)",
              boxShadow: isDark
                ? "0 12px 40px rgba(0,0,0,0.55)"
                : "0 4px 24px rgba(53,53,53,0.12)",
              backgroundColor: "background.paper",
              minWidth: 210,
              mt: 0.75,
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2,
            pt: 1.5,
            pb: 0.75,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography
            sx={{
              fontSize: "0.65rem",
              fontWeight: 700,
              color: "text.secondary",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            {label} · {assigned} assigned
          </Typography>
        </Box>
        <Box sx={{ py: 0.75 }}>
          {Object.entries(grouped).map(([sec, list]) => (
            <Box key={sec}>
              <Typography
                sx={{
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  color: "text.disabled",
                  px: 1.5,
                  py: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                }}
              >
                {sec}
              </Typography>
              {list.map((a) => {
                const url = getAvatarUrl(a.staffer?.avatar_url);
                return (
                  <Box
                    key={a.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      px: 1.5,
                      py: 0.75,
                      "&:hover": {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(53,53,53,0.03)",
                      },
                    }}
                  >
                    <Avatar
                      src={url || undefined}
                      sx={{
                        width: 28,
                        height: 28,
                        fontSize: "0.6rem",
                        fontWeight: 700,
                        backgroundColor: "#f5c52b",
                        color: "#111827",
                        flexShrink: 0,
                      }}
                    >
                      {!url && getInitials(a.staffer?.full_name)}
                    </Avatar>
                    <Box>
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          fontWeight: 500,
                          color: "text.primary",
                          lineHeight: 1.3,
                        }}
                      >
                        {a.staffer?.full_name || "—"}
                      </Typography>
                      <Typography
                        sx={{ fontSize: "0.68rem", color: "text.secondary" }}
                      >
                        {sec}
                      </Typography>
                    </Box>
                  </Box>
                );
              })}
            </Box>
          ))}
          {total > assigned && (
            <Box
              sx={{
                px: 1.5,
                pt: 0.5,
                pb: 0.75,
                borderTop: "1px solid",
                borderColor: "divider",
                mt: 0.5,
              }}
            >
              {Array.from({ length: total - assigned }).map((_, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    py: 0.5,
                    opacity: 0.45,
                  }}
                >
                  <Box
                    sx={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: "1.5px dashed",
                      borderColor: "divider",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "0.65rem", color: "text.disabled" }}
                    >
                      ?
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      fontStyle: "italic",
                    }}
                  >
                    Unfilled slot
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Popover>
    </>
  );
}

export default function RequestDetails({
  open,
  onClose,
  request,
  onActionSuccess,
  onOpenCoverageDetails,
  asPage = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [forwardOpen, setForwardOpen] = useState(false);
  const [warningOpen, setWarningOpen] = useState(false);
  const [selectedSections, setSelectedSections] = useState([]);
  const [secHeads, setSecHeads] = useState({});
  const [secHeadsLoading, setSecHeadsLoading] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [approveOpen, setApproveOpen] = useState(false);
  // FIX #1 & #2: separate warning dialog for approve flow
  const [approveWarningOpen, setApproveWarningOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [assignedStaffers, setAssignedStaffers] = useState([]);

  const checks = useRequestAssistant(open ? request : null);

  const assessmentFlags = React.useMemo(() => {
    if (!checks || checks.loading) return [];
    const flags = [];
    if (
      checks.lateSubmission?.type === "warning" ||
      checks.lateSubmission?.type === "error"
    )
      flags.push({
        title: "Submission Timing",
        message: checks.lateSubmission.message,
        type: checks.lateSubmission.type,
      });
    if (
      checks.incomplete?.type === "warning" ||
      checks.incomplete?.type === "error"
    )
      flags.push({
        title: "Completeness",
        message: checks.incomplete.message,
        issues: checks.incomplete?.issues,
        type: checks.incomplete.type,
      });
    if (
      checks.conflict?.type === "warning" ||
      checks.conflict?.type === "error"
    )
      flags.push({
        title: "Scheduling Conflict",
        message: checks.conflict.message,
        conflicts: checks.conflict?.conflicts,
        type: checks.conflict.type,
      });
    return flags;
  }, [checks]);

  // Hard block: requested service has ZERO staff assigned
  const unfilledSlots = React.useMemo(() => {
    if (!request?.services) return [];
    const zeros = [];
    SERVICE_COLUMNS.forEach((svc) => {
      const pax = request.services?.[svc.key] || 0;
      if (pax === 0) return;
      // Filter by assigner's section (who created the assignment), matching ServiceRow logic
      const matching = assignedStaffers.filter(
        (a) =>
          a.assigner?.section === svc.section ||
          (a.staffer?.section === svc.section && !a.assigner),
      );
      const filled = new Set(
        matching
          .map((a) => {
            const stafferId = a.assigned_to || a.staffer?.id;
            if (!stafferId) return null;
            return `${stafferId}::${a.assignment_date || ""}`;
          })
          .filter(Boolean),
      ).size;
      if (filled === 0) zeros.push({ label: svc.label, pax });
    });
    return zeros;
  }, [request?.services, assignedStaffers]);

  // Soft warning: requested service is partially staffed (at least 1 but under pax)
  const partialSlots = React.useMemo(() => {
    if (!request?.services) return [];
    const partial = [];
    SERVICE_COLUMNS.forEach((svc) => {
      const pax = request.services?.[svc.key] || 0;
      if (pax === 0) return;
      // Filter by assigner's section (who created the assignment), matching ServiceRow logic
      const matching = assignedStaffers.filter(
        (a) =>
          a.assigner?.section === svc.section ||
          (a.staffer?.section === svc.section && !a.assigner),
      );
      const filled = new Set(
        matching
          .map((a) => {
            const stafferId = a.assigned_to || a.staffer?.id;
            if (!stafferId) return null;
            return `${stafferId}::${a.assignment_date || ""}`;
          })
          .filter(Boolean),
      ).size;
      if (filled > 0 && filled < pax)
        partial.push({ label: svc.label, filled, pax });
    });
    return partial;
  }, [request?.services, assignedStaffers]);

  const allowedSections = request?.services
    ? [
        ...new Set(
          Object.entries(request.services)
            .filter(([_, pax]) => pax > 0)
            .map(([svc]) => SERVICE_SECTION_MAP[svc])
            .filter(Boolean),
        ),
      ]
    : [];

  useEffect(() => {
    if (!open || !request?.id) {
      setAssignedStaffers([]);
      return;
    }
    if (
      ![
        "Forwarded",
        "Assigned",
        "For Approval",
        "Approved",
        "On Going",
        "Completed",
        "Rectified",
      ].includes(request.status)
    ) {
      setAssignedStaffers([]);
      return;
    }
    async function loadAssignments() {
      try {
        const { data, error } = await supabase
          .from("coverage_assignments")
          .select(
            "id, section, assigned_to, assigned_by, assignment_date, from_time, to_time, staffer:assigned_to ( id, full_name, section, avatar_url ), assigner:assigned_by ( id, section, full_name )",
          )
          .eq("request_id", request.id);
        if (error) {
          console.error("loadAssignments error:", error);
        }
        setAssignedStaffers(data || []);
      } catch (err) {
        console.error("loadAssignments exception:", err);
        setAssignedStaffers([]);
      }
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
        .from("profiles")
        .select("id, full_name, section, role")
        .eq("role", "sec_head")
        .in("section", ALL_SECTIONS);
      if (data) {
        const map = {};
        data.forEach((p) => {
          map[p.section] = p;
        });
        setSecHeads(map);
      }
      setSecHeadsLoading(false);
    }
    loadSecHeads();
  }, [forwardOpen]);

  const resetState = () => {
    setError("");
    setForwardOpen(false);
    setWarningOpen(false);
    setApproveWarningOpen(false);
    setApproveSoftWarnOpen(false);
    setDeclineOpen(false);
    setApproveOpen(false);
    setDeclineReason("");
    setAdminNotes("");
    setSelectedSections([]);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleForward = async () => {
    if (selectedSections.length === 0) {
      setError("Select at least one section.");
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

  // Hard block only when a requested service has zero assignees.
  // Partial staffing is allowed to proceed to approval.
  // They are shown in separate dialogs — never mixed.
  const [approveSoftWarnOpen, setApproveSoftWarnOpen] = useState(false);

  const handleApproveClick = () => {
    setError("");
    if (unfilledSlots.length > 0) {
      setApproveWarningOpen(true); // hard block dialog — staff issues only
    } else if (assessmentFlags.length > 0) {
      setApproveSoftWarnOpen(true); // soft warning dialog — assessment flags only
    } else {
      setApproveOpen(true);
    }
  };

  const coverageComponents = request?.services
    ? Object.entries(request.services)
        .filter(([_, pax]) => pax > 0)
        .map(([name, pax]) => ({ name, pax }))
    : [];

  const displayStatus =
    request?.status === "Assigned" && request?.approved_at
      ? "Approved"
      : request?.status;
  const statusCfg = STATUS_CONFIG[displayStatus] || {
    bg: "#f3f4f6",
    color: "#6b7280",
  };
  const isMultiDay = !!(
    request?.is_multiday && request?.event_days?.length > 0
  );
  // FIX #3: show staff panel for more statuses including On Going / Completed
  const showStaff = [
    "Forwarded",
    "Assigned",
    "For Approval",
    "Approved",
    "On Going",
    "Completed",
    "Rectified",
  ].includes(request?.status);
  // FIX #4: decline available at any pre-completion stage
  const canDecline = DECLINABLE_STATUSES.includes(request?.status);
  const canOpenCoverageDetails = [
    "Assigned",
    "For Approval",
    "Approved",
    "On Going",
    "Completed",
    "Rectified",
  ].includes(request?.status);

  const eventDateDisplay = React.useMemo(() => {
    if (!request) return "—";
    if (request.is_multiday && request.event_days?.length) {
      const sorted = [...request.event_days].sort((a, b) =>
        a.date.localeCompare(b.date),
      );
      const first = fmtDate(sorted[0].date, { month: "short", day: "numeric" });
      const last = fmtDate(sorted[sorted.length - 1].date, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      return sorted.length === 1
        ? fmtDate(sorted[0].date)
        : `${first} – ${last}`;
    }
    return request.event_date ? fmtDate(request.event_date) : "—";
  }, [request]);

  const [panelOpen, setPanelOpen] = useState({
    eventInfo: true,
    coverageRequirements: true,
    clientDetails: true,
    attachment: true,
  });
  const [assessmentSidebarOpen, setAssessmentSidebarOpen] = useState(true);

  useEffect(() => {
    if (!open || !request?.id) return;
    const defaultOpen = !["On Going", "Completed"].includes(request.status);
    setPanelOpen({
      eventInfo: defaultOpen,
      coverageRequirements: defaultOpen,
      clientDetails: defaultOpen,
      attachment: defaultOpen,
    });
    setAssessmentSidebarOpen(true);
  }, [open, request?.id, request?.status]);

  const togglePanel = (key) => {
    setPanelOpen((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  if (!request) return null;

  const openCtrForThisRequest = () => {
    onOpenCoverageDetails?.({
      requestId: request.id,
      title: request.title || "Coverage request",
      client: request.entity?.name || "—",
      eventDate: eventDateDisplay,
      venue: request.venue || "—",
    });
  };

  const detailsContent = (
    <>
      {/* Title bar */}
      <Box
        sx={{
          px: 3,
          py: 1,
          borderBottom: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          {asPage && (
            <Tooltip title="Back" arrow>
              <IconButton
                onClick={handleClose}
                size="small"
                sx={{ color: "text.secondary", mr: -0.4 }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              px: 1.5,
              py: 0.35,
              borderRadius: 1,
              backgroundColor: statusCfg.bg,
              border: `1px solid ${statusCfg.color}30`,
            }}
          >
            <Typography
              sx={{
                fontSize: "0.7rem",
                fontWeight: 700,
                color: statusCfg.color,
                letterSpacing: "0.07em",
                textTransform: "uppercase",
                lineHeight: 1.2,
              }}
            >
              {displayStatus}
            </Typography>
          </Box>
          <Tooltip
            title={
              assessmentSidebarOpen
                ? "Hide assessment panel"
                : "Show assessment panel"
            }
            arrow
          >
            <IconButton
              size="small"
              onClick={() => setAssessmentSidebarOpen((v) => !v)}
              sx={{
                color: "text.secondary",
                transition: "color 0.2s ease, background-color 0.2s ease",
                "&:hover": {
                  color: "text.primary",
                },
              }}
            >
              <ViewSidebarOutlinedIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          {!asPage && (
            <IconButton
              onClick={handleClose}
              size="small"
              sx={{
                color: "text.secondary",
                borderRadius: "10px",
                "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>

      {/* Body */}
      <DialogContent
        sx={{
          p: 0,
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          overflow: { xs: "auto", md: "hidden" },
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left */}
        <Box
          sx={{
            flex: 1,
            px: 3,
            py: 3,
            overflowY: { xs: "visible", md: "auto" },
            minWidth: 0,
          }}
        >
          <Section
            label="Event Information"
            collapsible
            open={panelOpen.eventInfo}
            onToggle={() => togglePanel("eventInfo")}
          >
            <InfoGrid
              rows={[
                ["Event Title", request.title],
                ["Description", request.description],
              ]}
              isDark={isDark}
            />

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "140px 1fr",
                rowGap: 0.75,
                columnGap: 1,
                alignItems: "start",
                mt: 0.75,
              }}
            >
              <Typography
                sx={{
                  fontSize: "0.8rem",
                  color: "text.secondary",
                  pt: isMultiDay ? 0.3 : 0.2,
                }}
              >
                {isMultiDay ? "Coverage Days" : "Date"}
              </Typography>

              {isMultiDay ? (
                <Box
                  sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
                >
                  {request.event_days.map((day, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        px: 1,
                        py: 0.5,
                        borderRadius: "10px",
                        border: "1px solid",
                        borderColor: "divider",
                        backgroundColor: isDark ? "#1a1a1a" : "#fafafa",
                      }}
                    >
                      <Box
                        sx={{
                          px: 0.9,
                          py: 0.2,
                          borderRadius: "10px",
                          backgroundColor: "#f5c52b",
                          color: "#111",
                          fontSize: "0.7rem",
                          fontWeight: 600,
                          flexShrink: 0,
                          minWidth: 52,
                          textAlign: "center",
                        }}
                      >
                        {fmtDate(day.date, {
                          month: "short",
                          day: "numeric",
                        })}
                      </Box>
                      {day.from_time && day.to_time ? (
                        <Typography
                          sx={{ fontSize: "0.8rem", color: "text.primary" }}
                        >
                          {fmtTime(day.from_time)} – {fmtTime(day.to_time)}
                        </Typography>
                      ) : (
                        <Typography
                          sx={{
                            fontSize: "0.78rem",
                            color: "text.disabled",
                            fontStyle: "italic",
                          }}
                        >
                          No time set
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography
                  sx={{
                    fontSize: "0.85rem",
                    color: "text.primary",
                    lineHeight: 1.5,
                    pt: 0.2,
                  }}
                >
                  {fmtDate(request.event_date)}
                </Typography>
              )}

              {!isMultiDay && (
                <>
                  <Typography
                    sx={{
                      fontSize: "0.8rem",
                      color: "text.secondary",
                      pt: 0.2,
                    }}
                  >
                    Time
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: "0.85rem",
                      color: "text.primary",
                      lineHeight: 1.5,
                    }}
                  >
                    {request.from_time && request.to_time
                      ? `${fmtTime(request.from_time)} – ${fmtTime(request.to_time)}`
                      : "—"}
                  </Typography>
                </>
              )}

              <Typography
                sx={{ fontSize: "0.8rem", color: "text.secondary", pt: 0.2 }}
              >
                Venue
              </Typography>
              <Typography
                sx={{
                  fontSize: "0.85rem",
                  color: "text.primary",
                  lineHeight: 1.5,
                }}
              >
                {request.venue || "—"}
              </Typography>
            </Box>
          </Section>

          <Section
            label="Coverage Requirements"
            collapsible
            open={panelOpen.coverageRequirements}
            onToggle={() => togglePanel("coverageRequirements")}
          >
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75, mb: 0.5 }}>
              {coverageComponents.length > 0 ? (
                coverageComponents.map((c, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      px: 1.25,
                      py: 0.5,
                      borderRadius: 1,
                      border: "1px solid",
                      borderColor: "divider",
                      backgroundColor: isDark ? "#1e1e1e" : "#f9fafb",
                    }}
                  >
                    <Typography
                      sx={{ fontSize: "0.8rem", color: "text.primary" }}
                    >
                      {c.name}{" "}
                      <Typography
                        component="span"
                        sx={{ fontSize: "0.78rem", color: "text.secondary" }}
                      >
                        ×{c.pax}
                      </Typography>
                    </Typography>
                  </Box>
                ))
              ) : (
                <Typography
                  sx={{ fontSize: "0.85rem", color: "text.secondary" }}
                >
                  —
                </Typography>
              )}
            </Box>
          </Section>

          <Section
            label="Client Details"
            collapsible
            open={panelOpen.clientDetails}
            onToggle={() => togglePanel("clientDetails")}
          >
            <InfoGrid
              rows={[
                ["Organization", request.entity?.name || "—"],
                ["Client Type", request.client_type?.name || "—"],
                ["Submitted By", request.requester?.full_name || "—"],
                ["Contact Person", request.contact_person || "—"],
                ["Contact Info", request.contact_info || "—"],
              ]}
              isDark={isDark}
            />
          </Section>

          <Section
            label="Attachment"
            collapsible
            open={panelOpen.attachment}
            onToggle={() => togglePanel("attachment")}
          >
            {request.file_url ? (
              <Box
                onClick={() => openFile(request.file_url)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  cursor: "pointer",
                  color: "#1976d2",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ fontSize: "0.85rem" }}>
                  {getFileName(request.file_url)}
                </Typography>
              </Box>
            ) : (
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                No file attached
              </Typography>
            )}
          </Section>

          {/* FIX #6: show forwarded sections on both Forwarded AND For Approval */}
          {["Forwarded", "Assigned", "For Approval"].includes(request.status) &&
            request.forwarded_sections?.length > 0 && (
              <Section label="Forwarded To">
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
                  {request.forwarded_sections.map((s, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        px: 1.25,
                        py: 0.5,
                        borderRadius: 1,
                        backgroundColor: isDark ? "#1e0a2e" : "#f3e8ff",
                        border: "1px solid #7c3aed30",
                      }}
                    >
                      <Typography
                        sx={{
                          fontSize: "0.8rem",
                          color: "#7c3aed",
                          fontWeight: 500,
                        }}
                      >
                        {s}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Section>
            )}

          {/* ── Assigned Staff — service rows with fill bar ── */}
          {showStaff && (
            <Section label="Assigned Staff">
              <Box
                sx={{
                  position: "relative",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "10px",
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.01)"
                    : "#ffffff",
                  overflow: "hidden",
                  transition: "background-color 0.18s ease",
                  "& .assigned-staff-ctr-action": {
                    opacity: 0,
                    pointerEvents: "none",
                  },
                  "&:hover": {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.03)"
                      : "rgba(53,53,53,0.02)",
                  },
                  "&:hover .assigned-staff-ctr-action": {
                    opacity: 1,
                    pointerEvents: "auto",
                  },
                }}
              >
                {canOpenCoverageDetails && (
                  <Tooltip title="View CTR" placement="left" arrow>
                    <IconButton
                      className="assigned-staff-ctr-action"
                      onClick={(e) => {
                        e.stopPropagation();
                        openCtrForThisRequest();
                      }}
                      sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: { xs: 52, md: 72 },
                        borderRadius: 0,
                        borderLeft: "1px solid",
                        borderColor: "divider",
                        background: isDark
                          ? "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.08) 100%)"
                          : "linear-gradient(90deg, rgba(53,53,53,0.00) 0%, rgba(53,53,53,0.06) 100%)",
                        color: isDark
                          ? "rgba(255,255,255,0.85)"
                          : "rgba(17,17,17,0.75)",
                        transition:
                          "opacity 0.2s ease, background 0.2s ease, color 0.2s ease",
                        "&:hover": {
                          background: isDark
                            ? "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.14) 100%)"
                            : "linear-gradient(90deg, rgba(53,53,53,0.03) 0%, rgba(53,53,53,0.12) 100%)",
                          color: isDark ? "#ffffff" : "#111111",
                        },
                      }}
                    >
                      <ChevronRightIcon
                        sx={{ fontSize: { xs: 26, md: 38 }, fontWeight: 700 }}
                      />
                    </IconButton>
                  </Tooltip>
                )}

                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                    p: 1,
                    pr: canOpenCoverageDetails ? { xs: 1, md: 8 } : 1,
                  }}
                >
                  {SERVICE_COLUMNS.filter((svc) => {
                    const pax = request.services?.[svc.key];
                    if (!pax || pax <= 0) return false;
                    if (
                      svc.key === "Camera Operator (for live streaming)" &&
                      svc.section === "Videojournalism"
                    ) {
                      return pax > 0;
                    }
                    return true;
                  }).map((svc) => {
                    const paxRequested = request.services?.[svc.key] || 0;
                    return (
                      <ServiceRow
                        key={svc.key}
                        svcKey={svc.key}
                        label={svc.label}
                        section={svc.section}
                        paxRequested={paxRequested}
                        staffers={assignedStaffers}
                        requested={true}
                        isDark={isDark}
                      />
                    );
                  })}
                </Box>
              </Box>
              {assignedStaffers.length === 0 && (
                <Typography
                  sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 1 }}
                >
                  No staff assigned yet.
                </Typography>
              )}
            </Section>
          )}

          {request.status === "Declined" && request.declined_reason && (
            <Section label="Decline Reason">
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: isDark ? "#1a0a0a" : "#fef2f2",
                  borderRadius: "10px",
                  borderLeft: "3px solid #dc2626",
                }}
              >
                <Typography sx={{ fontSize: "0.85rem", color: "#dc2626" }}>
                  {request.declined_reason}
                </Typography>
              </Box>
            </Section>
          )}

          {/* FIX #3: show admin_notes for all post-approval statuses */}
          {["Approved", "Assigned", "On Going", "Completed"].includes(
            request.status,
          ) &&
            request.admin_notes && (
              <Section label="Admin Notes">
                <Box
                  sx={{
                    p: 1.5,
                    bgcolor: isDark ? "#0a1a0a" : "#f0fdf4",
                    borderRadius: "10px",
                    borderLeft: "3px solid #15803d",
                  }}
                >
                  <Typography sx={{ fontSize: "0.85rem", color: "#15803d" }}>
                    {request.admin_notes}
                  </Typography>
                </Box>
              </Section>
            )}
        </Box>

        <Collapse
          in={assessmentSidebarOpen}
          orientation="horizontal"
          timeout={{ enter: 260, exit: 220 }}
          easing={{
            enter: "cubic-bezier(0.22, 1, 0.36, 1)",
            exit: "cubic-bezier(0.4, 0, 0.2, 1)",
          }}
          sx={{ display: { xs: "none", md: "block" } }}
        >
          <Box sx={{ display: "flex", height: "100%" }}>
            <Divider orientation="vertical" flexItem sx={{ display: "flex" }} />
            <RequestAssessmentPanel checks={checks} isDark={isDark} />
          </Box>
        </Collapse>

        {assessmentSidebarOpen && (
          <Box sx={{ display: { xs: "block", md: "none" }, width: "100%" }}>
            <Divider orientation="horizontal" flexItem />
            <RequestAssessmentPanel checks={checks} isDark={isDark} />
          </Box>
        )}
      </DialogContent>

      {/* Footer — FIX #4: Decline available for all DECLINABLE_STATUSES */}
      <Box
        sx={{
          px: 3,
          py: 1.75,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          backgroundColor: isDark ? "#161616" : "#fafafa",
        }}
      >
        {canDecline && (
          <Button
            variant="outlined"
            size="small"
            onClick={() => {
              setError("");
              setDeclineOpen(true);
            }}
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              borderColor: "divider",
              color: "text.secondary",
              "&:hover": { borderColor: "#dc2626", color: "#dc2626" },
            }}
          >
            Decline
          </Button>
        )}
        {request.status === "Pending" && (
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setError("");
              assessmentFlags.length > 0
                ? setWarningOpen(true)
                : setForwardOpen(true);
            }}
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#212121",
              color: "#fff",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#333", boxShadow: "none" },
            }}
          >
            Forward to Section
          </Button>
        )}
        {/* FIX #2: approve goes through handleApproveClick which checks flags + unfilled slots */}
        {/* Show approve button for both "For Approval" and "Assigned" statuses - sec heads may submit as either */}
        {["For Approval", "Assigned"].includes(request.status) && (
          <Button
            variant="contained"
            size="small"
            onClick={handleApproveClick}
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#212121",
              color: "#fff",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#333", boxShadow: "none" },
            }}
          >
            Approve Request
          </Button>
        )}
      </Box>
    </>
  );

  return (
    <>
      {asPage ? (
        <Box
          sx={{
            height: "100%",
            minHeight: 0,
            display: "flex",
            flexDirection: "column",
            border: "1px solid",
            borderColor: "divider",
            borderRadius: "20px",
            backgroundColor: "background.paper",
            overflow: "hidden",
          }}
        >
          {detailsContent}
        </Box>
      ) : (
        <Dialog
          open={open}
          onClose={handleClose}
          fullWidth
          maxWidth="md"
          slotProps={{
            paper: {
              sx: {
                borderRadius: "10px",
                fontFamily: "'Helvetica Neue', sans-serif",
                height: { md: "90vh" },
                maxHeight: "95vh",
                backgroundColor: "background.paper",
                boxShadow: isDark
                  ? "0 8px 32px rgba(0,0,0,0.5)"
                  : "0 4px 24px rgba(0,0,0,0.08)",
              },
            },
          }}
        >
          {detailsContent}
        </Dialog>
      )}

      {/* ── Forward Warning Dialog (unchanged) ── */}
      <Dialog
        open={warningOpen}
        onClose={() => setWarningOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: "10px", backgroundColor: "background.paper" },
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              Assessment Flags Detected
            </Typography>
            <Typography
              sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}
            >
              This request has issues that require your attention before
              forwarding.
            </Typography>
          </Box>
        </Box>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {assessmentFlags.map((flag, idx) => {
              const isError = flag.type === "error";
              const borderClr = isError ? "#dc2626" : "#d97706";
              const bgClr = isError
                ? isDark
                  ? "rgba(220,38,38,0.06)"
                  : "#fef2f2"
                : isDark
                  ? "rgba(217,119,6,0.06)"
                  : "#fffbeb";
              const textClr = isError ? "#dc2626" : "#b45309";
              return (
                <Box
                  key={idx}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRadius: "10px",
                    backgroundColor: bgClr,
                    borderLeft: `3px solid ${borderClr}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: textClr,
                      mb: 0.4,
                    }}
                  >
                    {isError ? "⚠ " : "• "}
                    {flag.title}
                  </Typography>
                  {flag.message && (
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: textClr,
                        lineHeight: 1.55,
                      }}
                    >
                      {flag.message}
                    </Typography>
                  )}
                  {flag.issues?.map((issue, i) => (
                    <Typography
                      key={i}
                      sx={{
                        fontSize: "0.73rem",
                        color: textClr,
                        lineHeight: 1.6,
                      }}
                    >
                      · {issue}
                    </Typography>
                  ))}
                  {flag.conflicts?.map((c, i) => (
                    <Typography
                      key={i}
                      sx={{
                        fontSize: "0.73rem",
                        color: "#d97706",
                        lineHeight: 1.6,
                      }}
                    >
                      · {c.title} ({c.time})
                    </Typography>
                  ))}
                </Box>
              );
            })}
          </Box>
          <Box
            sx={{
              mt: 2,
              px: 1.5,
              py: 1.25,
              borderRadius: "10px",
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.78rem",
                color: "text.secondary",
                lineHeight: 1.6,
              }}
            >
              You may still forward this request, but you are acknowledging that
              these issues have been reviewed and you are choosing to proceed.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            onClick={() => setWarningOpen(false)}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              color: "text.secondary",
            }}
          >
            Go Back
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setWarningOpen(false);
              setForwardOpen(true);
            }}
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#d97706",
              color: "#fff",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#b45309", boxShadow: "none" },
            }}
          >
            I Understand, Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Hard Block Dialog: staff assignment issues only, no escape ── */}
      <Dialog
        open={approveWarningOpen}
        onClose={() => setApproveWarningOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: "10px", backgroundColor: "background.paper" },
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              Cannot Approve Yet
            </Typography>
            <Typography
              sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}
            >
              All requested services must have at least one staff assigned
              before approval.
            </Typography>
          </Box>
        </Box>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {unfilledSlots.length > 0 && (
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderRadius: "10px",
                  backgroundColor: isDark ? "rgba(220,38,38,0.06)" : "#fef2f2",
                  borderLeft: "3px solid #dc2626",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#dc2626",
                    mb: 0.5,
                  }}
                >
                  ⚠ No Staff Assigned
                </Typography>
                <Typography
                  sx={{
                    fontSize: "0.73rem",
                    color: "#dc2626",
                    lineHeight: 1.6,
                    mb: 0.5,
                  }}
                >
                  The following requested services have no staff assigned yet:
                </Typography>
                {unfilledSlots.map((s, i) => (
                  <Typography
                    key={i}
                    sx={{
                      fontSize: "0.73rem",
                      color: "#dc2626",
                      lineHeight: 1.6,
                    }}
                  >
                    · {s.label} (needs {s.pax})
                  </Typography>
                ))}
              </Box>
            )}
            {partialSlots.length > 0 && (
              <Box
                sx={{
                  px: 1.5,
                  py: 1.25,
                  borderRadius: "10px",
                  backgroundColor: isDark ? "rgba(217,119,6,0.06)" : "#fffbeb",
                  borderLeft: "3px solid #d97706",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    color: "#b45309",
                    mb: 0.5,
                  }}
                >
                  • Partially Filled Slots
                </Typography>
                {partialSlots.map((s, i) => (
                  <Typography
                    key={i}
                    sx={{
                      fontSize: "0.73rem",
                      color: "#b45309",
                      lineHeight: 1.6,
                    }}
                  >
                    · {s.label}: {s.filled} of {s.pax} filled
                  </Typography>
                ))}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5 }}>
          <Button
            onClick={() => setApproveWarningOpen(false)}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              color: "text.secondary",
            }}
          >
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Soft Warning Dialog: assessment flags only, admin can override ── */}
      <Dialog
        open={approveSoftWarnOpen}
        onClose={() => setApproveSoftWarnOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: "10px", backgroundColor: "background.paper" },
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: "0.9rem",
                color: "text.primary",
              }}
            >
              Review Before Approving
            </Typography>
            <Typography
              sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}
            >
              Assessment flags were found. Please review before finalizing.
            </Typography>
          </Box>
        </Box>
        <DialogContent sx={{ pt: 2.5, pb: 1 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
            {assessmentFlags.map((flag, idx) => {
              const isError = flag.type === "error";
              const borderClr = isError ? "#dc2626" : "#d97706";
              const bgClr = isError
                ? isDark
                  ? "rgba(220,38,38,0.06)"
                  : "#fef2f2"
                : isDark
                  ? "rgba(217,119,6,0.06)"
                  : "#fffbeb";
              const textClr = isError ? "#dc2626" : "#b45309";
              return (
                <Box
                  key={idx}
                  sx={{
                    px: 1.5,
                    py: 1.25,
                    borderRadius: "10px",
                    backgroundColor: bgClr,
                    borderLeft: `3px solid ${borderClr}`,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: "0.78rem",
                      fontWeight: 700,
                      color: textClr,
                      mb: 0.4,
                    }}
                  >
                    {isError ? "⚠ " : "• "}
                    {flag.title}
                  </Typography>
                  {flag.message && (
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: textClr,
                        lineHeight: 1.55,
                      }}
                    >
                      {flag.message}
                    </Typography>
                  )}
                  {flag.issues?.map((issue, i) => (
                    <Typography
                      key={i}
                      sx={{
                        fontSize: "0.73rem",
                        color: textClr,
                        lineHeight: 1.6,
                      }}
                    >
                      · {issue}
                    </Typography>
                  ))}
                  {flag.conflicts?.map((c, i) => (
                    <Typography
                      key={i}
                      sx={{
                        fontSize: "0.73rem",
                        color: "#d97706",
                        lineHeight: 1.6,
                      }}
                    >
                      · {c.title} ({c.time})
                    </Typography>
                  ))}
                </Box>
              );
            })}
          </Box>
          <Box
            sx={{
              mt: 2,
              px: 1.5,
              py: 1.25,
              borderRadius: "10px",
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#f9fafb",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Typography
              sx={{
                fontSize: "0.78rem",
                color: "text.secondary",
                lineHeight: 1.6,
              }}
            >
              You may still approve this request, but you are acknowledging that
              these issues have been reviewed and you are choosing to proceed.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
          <Button
            onClick={() => setApproveSoftWarnOpen(false)}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              color: "text.secondary",
            }}
          >
            Go Back
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              setApproveSoftWarnOpen(false);
              setApproveOpen(true);
            }}
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#d97706",
              color: "#fff",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#b45309", boxShadow: "none" },
            }}
          >
            I Understand, Proceed
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Forward Dialog ── */}
      <Dialog
        open={forwardOpen}
        onClose={() => !actionLoading && setForwardOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: "10px", backgroundColor: "background.paper" },
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}
          >
            Forward to Section
          </Typography>
          <IconButton
            onClick={() => setForwardOpen(false)}
            size="small"
            disabled={actionLoading}
            sx={{
              color: "text.secondary",
              borderRadius: "10px",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 2 }}>
          <Typography
            sx={{
              fontSize: "0.82rem",
              color: "text.secondary",
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            Sections are pre-selected based on the client's requested services.
            Only relevant sections can be forwarded to.
          </Typography>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: "10px", fontSize: "0.82rem" }}
            >
              {error}
            </Alert>
          )}
          {secHeadsLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <BrandedLoader size={34} inline />
            </Box>
          ) : (
            <FormGroup sx={{ gap: 1 }}>
              {ALL_SECTIONS.map((section) => {
                const secHead = secHeads[section];
                const isAllowed = allowedSections.includes(section);
                const isChecked = selectedSections.includes(section);
                const isDisabled = actionLoading || !isAllowed;
                return (
                  <Tooltip
                    key={section}
                    title={
                      !isAllowed
                        ? "Not required for this request's services"
                        : ""
                    }
                    placement="right"
                    arrow
                  >
                    <Box
                      onClick={() => {
                        if (isDisabled) return;
                        setSelectedSections((prev) =>
                          prev.includes(section)
                            ? prev.filter((s) => s !== section)
                            : [...prev, section],
                        );
                      }}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        p: 1.5,
                        borderRadius: "10px",
                        border: "1px solid",
                        borderColor: isDisabled
                          ? "divider"
                          : isChecked
                            ? "#f5c52b"
                            : "divider",
                        backgroundColor: isDisabled
                          ? isDark
                            ? "#111"
                            : "#f9fafb"
                          : isChecked
                            ? isDark
                              ? "#1e1800"
                              : "#fffbeb"
                            : "background.paper",
                        cursor: isDisabled ? "not-allowed" : "pointer",
                        opacity: isDisabled ? 0.45 : 1,
                        transition:
                          "border-color 0.15s, background-color 0.15s, opacity 0.15s",
                        "&:hover": !isDisabled
                          ? { borderColor: "#f5c52b" }
                          : {},
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 44,
                          height: 44,
                          fontSize: "0.8rem",
                          fontWeight: 700,
                          backgroundColor:
                            secHead && isAllowed
                              ? "#f5c52b"
                              : isDark
                                ? "#333"
                                : "#e5e7eb",
                          color:
                            secHead && isAllowed ? "#111827" : "text.secondary",
                        }}
                      >
                        {secHead ? getInitials(secHead.full_name) : "?"}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography
                          sx={{
                            fontSize: "0.85rem",
                            fontWeight: 600,
                            color: isDisabled
                              ? "text.disabled"
                              : "text.primary",
                          }}
                        >
                          {section}
                        </Typography>
                        <Typography
                          sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                        >
                          {isDisabled
                            ? "Not required for this request"
                            : secHead
                              ? secHead.full_name
                              : "No section head assigned"}
                        </Typography>
                      </Box>
                      <Checkbox
                        checked={isChecked}
                        disabled={isDisabled}
                        size="small"
                        sx={{
                          p: 0,
                          color: "divider",
                          "&.Mui-checked": { color: "#f5c52b" },
                        }}
                      />
                    </Box>
                  </Tooltip>
                );
              })}
            </FormGroup>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setForwardOpen(false)}
            disabled={actionLoading}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleForward}
            disabled={actionLoading}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#f5c52b",
              color: "#111827",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
            }}
          >
            {actionLoading ? (
              <CircularProgress size={16} sx={{ color: "#111827" }} />
            ) : (
              "Confirm Forward"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Decline Dialog ── */}
      <Dialog
        open={declineOpen}
        onClose={() => !actionLoading && setDeclineOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: "10px", backgroundColor: "background.paper" },
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}
          >
            Decline Request
          </Typography>
          <IconButton
            onClick={() => setDeclineOpen(false)}
            size="small"
            disabled={actionLoading}
            sx={{
              color: "text.secondary",
              borderRadius: "10px",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 2 }}>
          <Typography
            sx={{
              fontSize: "0.82rem",
              color: "text.secondary",
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            Provide a reason for declining. The client will be notified.
          </Typography>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: "10px", fontSize: "0.82rem" }}
            >
              {error}
            </Alert>
          )}
          <TextField
            label="Reason for Declining"
            multiline
            rows={4}
            fullWidth
            value={declineReason}
            onChange={(e) => setDeclineReason(e.target.value)}
            disabled={actionLoading}
            placeholder="e.g. Insufficient preparation time..."
            size="small"
            sx={{
              "& .MuiInputBase-input": { fontSize: "0.85rem" },
              "& .MuiInputLabel-root": { fontSize: "0.85rem" },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setDeclineOpen(false)}
            disabled={actionLoading}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDecline}
            disabled={actionLoading}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              boxShadow: "none",
              "&:hover": { boxShadow: "none" },
            }}
          >
            {actionLoading ? <CircularProgress size={16} /> : "Confirm Decline"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Approve Dialog ── */}
      <Dialog
        open={approveOpen}
        onClose={() => !actionLoading && setApproveOpen(false)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: { borderRadius: "10px", backgroundColor: "background.paper" },
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}
          >
            Approve Request
          </Typography>
          <IconButton
            onClick={() => setApproveOpen(false)}
            size="small"
            disabled={actionLoading}
            sx={{
              color: "text.secondary",
              borderRadius: "10px",
              "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
        <DialogContent sx={{ pt: 2 }}>
          <Typography
            sx={{
              fontSize: "0.82rem",
              color: "text.secondary",
              mb: 2,
              lineHeight: 1.6,
            }}
          >
            Approving will notify the client and finalize the request. You may
            add optional notes.
          </Typography>
          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2, borderRadius: "10px", fontSize: "0.82rem" }}
            >
              {error}
            </Alert>
          )}
          <TextField
            label="Admin Notes (optional)"
            multiline
            rows={3}
            fullWidth
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            disabled={actionLoading}
            placeholder="e.g. Please coordinate with the assigned staff before the event."
            size="small"
            sx={{
              "& .MuiInputBase-input": { fontSize: "0.85rem" },
              "& .MuiInputLabel-root": { fontSize: "0.85rem" },
            }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setApproveOpen(false)}
            disabled={actionLoading}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleApprove}
            disabled={actionLoading}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#15803d",
              color: "white",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#166534", boxShadow: "none" },
            }}
          >
            {actionLoading ? <CircularProgress size={16} /> : "Confirm Approve"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function Section({
  label,
  children,
  collapsible = false,
  open = true,
  onToggle,
}) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Box
        onClick={() => collapsible && onToggle?.()}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1,
          pb: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
          cursor: collapsible ? "pointer" : "default",
          userSelect: "none",
        }}
      >
        <Typography
          sx={{
            fontSize: "0.68rem",
            fontWeight: 700,
            color: "text.secondary",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </Typography>
        {collapsible && (
          <ExpandMoreIcon
            sx={{
              fontSize: 16,
              color: "text.disabled",
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.2s ease",
            }}
          />
        )}
      </Box>

      {collapsible ? <Collapse in={open}>{children}</Collapse> : children}
    </Box>
  );
}

function InfoGrid({ rows, isDark }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "140px 1fr",
        rowGap: 0.6,
        columnGap: 1,
        alignItems: "start",
      }}
    >
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography
            sx={{ fontSize: "0.8rem", color: "text.secondary", pt: 0.2 }}
          >
            {label}
          </Typography>
          <Typography
            sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.5 }}
          >
            {value || "—"}
          </Typography>
        </React.Fragment>
      ))}
    </Box>
  );
}
