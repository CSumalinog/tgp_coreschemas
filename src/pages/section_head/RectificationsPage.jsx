// src/pages/section_head/RectificationsPage.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  Box,
  Typography,
  Dialog,
  TextField,
  Alert,
  LinearProgress,
  IconButton,
  useTheme,
  Tooltip,
  FormControl,
  OutlinedInput,
  InputAdornment,
  Select,
  MenuItem,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import BrandedLoader from "../../components/common/BrandedLoader";
import { DataGrid } from "../../components/common/AppDataGrid";
import { supabase } from "../../lib/supabaseClient";
import {
  notifySpecificStaff,
  notifyAdmins,
} from "../../services/NotificationService";
import { StaffAvatar } from "../../components/common/UserAvatar";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import {
  CONTROL_RADIUS,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
  FILTER_SEARCH_FLEX,
  FILTER_SEARCH_MIN_WIDTH,
  FILTER_SEARCH_MAX_WIDTH,
  FILTER_STATUS_MIN_WIDTH,
  FILTER_SEMESTER_MIN_WIDTH,
} from "../../utils/layoutTokens";

const GOLD = "#F5C52B";
const dm = "'Inter', sans-serif";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    bg: "#fefce8",
    color: "#854d0e",
    dot: "#eab308",
  },
  approved: {
    label: "Approved",
    bg: "#f0fdf4",
    color: "#166534",
    dot: "#22c55e",
  },
  rejected: {
    label: "Rejected",
    bg: "#fef2f2",
    color: "#991b1b",
    dot: "#ef4444",
  },
};

// ── Rectification Review Dialog ───────────────────────────────────────────────
function ReviewDialog({
  open,
  request,
  note,
  onNoteChange,
  reviewing,
  error,
  isDark,
  border,
  onClose,
  onApprove,
  onReject,
  onOpenLightbox,
  onProofMouseEnter,
  onProofMouseLeave,
}) {
  if (!request) return null;

  const proofUrl = request.proof_path
    ? (() => {
        const { data } = supabase.storage
          .from("coverage-files")
          .getPublicUrl(request.proof_path);
        return data?.publicUrl ?? null;
      })()
    : null;

  return (
    <Dialog
      open={open}
      onClose={reviewing ? undefined : onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: "10px", border: `1px solid ${border}` } },
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700 }}
        >
          Review Rectification
        </Typography>
        <IconButton size="small" disabled={reviewing} onClick={onClose}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.75rem",
            color: "text.secondary",
            mb: 0.5,
          }}
        >
          Staff reason
        </Typography>
        <Box
          sx={{
            p: 1.5,
            borderRadius: "8px",
            border: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(0,0,0,0.02)",
            mb: 1.75,
          }}
        >
          <Typography sx={{ fontFamily: dm, fontSize: "0.8rem" }}>
            {request.reason}
          </Typography>
        </Box>

        {proofUrl && (
          <>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.75rem",
                color: "text.secondary",
                mb: 0.5,
              }}
            >
              Proof
            </Typography>

            {/* Attachment chip */}
            <Box
              onClick={() => onOpenLightbox && onOpenLightbox(proofUrl)}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                mb: 1.75,
                px: 1,
                py: 0.75,
                borderRadius: "8px",
                border: `1px solid ${border}`,
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#fafafa",
                cursor: "zoom-in",
                transition: "background 0.15s, box-shadow 0.15s",
                "&:hover": {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.07)"
                    : "#f0f0f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                },
              }}
            >
              {/* Tiny thumbnail */}
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "5px",
                  overflow: "hidden",
                  flexShrink: 0,
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "#e8e8e8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Box
                  component="img"
                  src={proofUrl}
                  alt="proof thumbnail"
                  sx={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top",
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                  onMouseEnter={() =>
                    onProofMouseEnter &&
                    onProofMouseEnter(request.proof_path, proofUrl)
                  }
                  onMouseLeave={() =>
                    onProofMouseLeave && onProofMouseLeave(request.proof_path)
                  }
                />
              </Box>
              <Box>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "text.primary",
                    lineHeight: 1.2,
                  }}
                >
                  proof_attachment
                </Typography>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.7rem",
                    color: "text.disabled",
                    lineHeight: 1.2,
                  }}
                >
                  Click to view
                </Typography>
              </Box>
            </Box>
          </>
        )}

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.75rem",
            color: "text.secondary",
            mb: 0.5,
          }}
        >
          Reviewer note (optional)
        </Typography>
        <TextField
          multiline
          minRows={2}
          maxRows={4}
          fullWidth
          placeholder="Add a note for the staff member…"
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          disabled={reviewing}
          size="small"
          inputProps={{ maxLength: 400 }}
          sx={{
            "& .MuiOutlinedInput-root": {
              borderRadius: "8px",
              fontFamily: dm,
              fontSize: "0.82rem",
            },
          }}
        />

        {error && (
          <Alert
            severity="error"
            sx={{
              mt: 1.5,
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: "8px",
            }}
          >
            {error}
          </Alert>
        )}
      </Box>

      {reviewing && (
        <LinearProgress
          sx={{
            mx: 3,
            mb: 1,
            borderRadius: "4px",
            height: 3,
            "& .MuiLinearProgress-bar": { backgroundColor: GOLD },
            backgroundColor: isDark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.06)",
          }}
        />
      )}

      <Box
        sx={{
          px: 3,
          py: 1.75,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
        }}
      >
        <Box
          onClick={reviewing ? undefined : onReject}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "10px",
            cursor: reviewing ? "default" : "pointer",
            border: "1px solid rgba(220,38,38,0.3)",
            backgroundColor: reviewing
              ? "rgba(220,38,38,0.05)"
              : "rgba(220,38,38,0.06)",
            color: reviewing ? "text.disabled" : "#dc2626",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            userSelect: "none",
            "&:hover": reviewing
              ? {}
              : { backgroundColor: "rgba(220,38,38,0.12)" },
          }}
        >
          Reject
        </Box>
        <Box
          onClick={reviewing ? undefined : onApprove}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "10px",
            cursor: reviewing ? "default" : "pointer",
            backgroundColor: reviewing ? "rgba(0,0,0,0.06)" : "#111",
            color: reviewing ? "text.disabled" : "#fff",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            userSelect: "none",
            "&:hover": reviewing ? {} : { backgroundColor: "#333" },
          }}
        >
          Approve
        </Box>
      </Box>
    </Dialog>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};
// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RectificationsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.08)";

  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");

  // Review dialog state
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");

  // Lightbox / hover preview
  const [lightboxProof, setLightboxProof] = useState(null);
  const [hoveredProof, setHoveredProof] = useState(null);
  const hoverTimerRef = useRef(null);

  const handleProofMouseEnter = (id, url) => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(
      () => setHoveredProof({ id, url }),
      150,
    );
  };
  const handleProofMouseLeave = (id) => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    setHoveredProof((prev) => (prev?.id === id ? null : prev));
  };

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, section")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  const loadRequests = useCallback(async () => {
    if (!currentUser?.section) return;
    setLoading(true);
    const { data } = await supabase
      .from("rectification_requests")
      .select(
        `id, assignment_id, request_id, staff_id, reason, proof_path, status, created_at,
         staff:profiles!staff_id(id, full_name, avatar_url),
         request:coverage_requests!request_id(id, title)`,
      )
      .eq("section", currentUser.section)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }, [currentUser?.section]);

  useEffect(() => {
    if (currentUser?.section) loadRequests();
  }, [currentUser, loadRequests]);

  useEffect(() => {
    supabase
      .from("semesters")
      .select("*")
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        setSemesters(data || []);
      });
  }, []);

  const handleDecision = useCallback(
    async (decision) => {
      if (!reviewTarget || !currentUser?.id) return;
      setReviewing(true);
      setReviewError("");
      try {
        const now = new Date().toISOString();
        const { error: rErr } = await supabase
          .from("rectification_requests")
          .update({
            status: decision,
            reviewed_by: currentUser.id,
            reviewed_at: now,
            reviewer_note: reviewNote.trim() || null,
          })
          .eq("id", reviewTarget.id);
        if (rErr) throw rErr;

        if (decision === "approved") {
          const { error: aErr } = await supabase
            .from("coverage_assignments")
            .update({ status: "Rectified" })
            .eq("id", reviewTarget.assignment_id);
          if (aErr) throw aErr;
        }

        const msg =
          decision === "approved"
            ? `Your rectification request for "${reviewTarget.request?.title ?? "an assignment"}" was approved. The No Show mark has been removed.`
            : `Your rectification request for "${reviewTarget.request?.title ?? "an assignment"}" was rejected.${reviewNote.trim() ? " Note: " + reviewNote.trim() : ""}`;

        await notifySpecificStaff({
          staffIds: [reviewTarget.staff_id],
          type: "rectification_reviewed",
          title:
            decision === "approved"
              ? "Rectification Approved"
              : "Rectification Rejected",
          message: msg,
          requestId: reviewTarget.request_id,
          createdBy: currentUser.id,
          targetPath: "/my-assignment",
          targetPayload: { assignmentId: reviewTarget.assignment_id },
        });

        if (decision === "approved") {
          await notifyAdmins({
            type: "rectification_reviewed",
            title: "Rectification Approved",
            message: `${currentUser.full_name ?? "A section head"} approved a rectification for "${reviewTarget.request?.title ?? "an assignment"}" (${reviewTarget.staff?.full_name ?? "staff"}).`,
            requestId: reviewTarget.request_id,
            createdBy: currentUser.id,
            targetPath: "/admin/rectifications-log",
          });
        }

        setRequests((prev) =>
          prev.map((r) =>
            r.id === reviewTarget.id ? { ...r, status: decision } : r,
          ),
        );
        setReviewTarget(null);
        setReviewNote("");
      } catch (err) {
        setReviewError(err?.message ?? "Failed. Please try again.");
      } finally {
        setReviewing(false);
      }
    },
    [reviewTarget, currentUser, reviewNote],
  );

  // ── CSV export ───────────────────────────────────────────────────────────────
  const runExport = useCallback(() => {
    const headers = ["Staff", "Assignment", "Reason", "Submitted"];
    const dataRows = requests.map((r) => [
      r.staff?.full_name ?? "",
      r.request?.title ?? "",
      r.reason ?? "",
      new Date(r.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
    ]);
    const escape = (v) => {
      const s = String(v ?? "").replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [headers, ...dataRows]
      .map((row) => row.map(escape).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rectifications-pending.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [requests]);

  // ── Rows ────────────────────────────────────────────────────────────────────
  const rows = useMemo(
    () =>
      requests
        .filter((r) => {
          if (statusFilter !== "all" && r.status !== statusFilter) return false;
          if (selectedSem !== "all") {
            const sem = semesters.find((s) => s.id === selectedSem);
            if (sem) {
              const from = new Date(sem.start_date + "T00:00:00");
              const to = new Date(sem.end_date + "T23:59:59");
              const d = new Date(r.created_at);
              if (d < from || d > to) return false;
            }
          }
          if (!searchText.trim()) return true;
          const tokens = searchText.toLowerCase().split(/\s+/).filter(Boolean);
          const haystack = [
            r.staff?.full_name ?? "",
            r.request?.title ?? "",
            r.reason ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return tokens.every((t) => haystack.includes(t));
        })
        .map((r) => {
          const ac = getAvatarColor(r.staff_id ?? r.id);
          const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
          return {
            id: r.id,
            staffName: r.staff?.full_name ?? "—",
            staffAvatarUrl: r.staff?.avatar_url ?? null,
            avatarBg: ac.bg,
            avatarFg: ac.color,
            title: r.request?.title ?? "—",
            reason: r.reason ?? "",
            submitted: r.created_at,
            hasProof: !!r.proof_path,
            proofPath: r.proof_path,
            statusLabel: statusCfg.label,
            statusBg: statusCfg.bg,
            statusColor: statusCfg.color,
            statusDot: statusCfg.dot,
            _raw: r,
          };
        }),
    [requests, searchText, statusFilter, selectedSem, semesters],
  );

  // ── Proof thumbnail cell ─────────────────────────────────────────────────────
  function ProofCell({ proofPath }) {
    if (!proofPath)
      return (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.disabled" }}
          >
            —
          </Typography>
        </Box>
      );
    const { data } = supabase.storage
      .from("coverage-files")
      .getPublicUrl(proofPath);
    const url = data?.publicUrl;
    const cellId = proofPath;
    return (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Box
          onClick={(e) => {
            e.stopPropagation();
            setLightboxProof(url);
          }}
          sx={{
            width: 52,
            height: 34,
            borderRadius: "6px",
            border: `1px solid ${border}`,
            overflow: "hidden",
            backgroundColor: isDark
              ? "rgba(17,17,17,0.45)"
              : "rgba(53,53,53,0.03)",
            cursor: "zoom-in",
            flexShrink: 0,
          }}
        >
          <Box
            component="img"
            src={url}
            alt="proof"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "top",
              display: "block",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
            onMouseEnter={() => handleProofMouseEnter(cellId, url)}
            onMouseLeave={() => handleProofMouseLeave(cellId)}
          />
        </Box>
      </Box>
    );
  }

  // ── Columns ─────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        field: "staffName",
        headerName: "Staff",
        flex: 0.9,
        minWidth: 140,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              gap: 0.75,
            }}
          >
            <StaffAvatar
              path={p.row.staffAvatarUrl}
              name={p.value}
              bg={p.row.avatarBg}
              fg={p.row.avatarFg}
            />
            <Typography
              sx={{ fontFamily: dm, fontSize: "0.8rem", fontWeight: 500 }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "title",
        headerName: "Assignment",
        flex: 1.8,
        minWidth: 200,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "submitted",
        headerName: "Submitted",
        width: 120,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                color: "text.secondary",
              }}
            >
              {new Date(p.value).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </Typography>
          </Box>
        ),
      },
      {
        field: "hasProof",
        headerName: "Proof",
        width: 120,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (p) => <ProofCell proofPath={p.row.proofPath} />,
      },
      {
        field: "statusLabel",
        headerName: "Status",
        width: 120,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.9,
                py: 0.25,
                borderRadius: "20px",
                backgroundColor: p.row.statusBg,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: p.row.statusDot,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: p.row.statusColor,
                  textTransform: "capitalize",
                }}
              >
                {p.value}
              </Typography>
            </Box>
          </Box>
        ),
      },
    ],
    [],
  );

  if (!currentUser) return <BrandedLoader />;

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2, md: 3 },
        pt: { xs: 1.5, sm: 2, md: 3 },
        pb: { xs: 1.5, sm: 2, md: 3 },
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: isDark ? "background.default" : "#ffffff",
        fontFamily: dm,
      }}
    >
      {/* ── Toolbar ── */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: FILTER_ROW_GAP,
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        <FormControl
          size="small"
          sx={{
            flexShrink: 0,
            minWidth: FILTER_SEARCH_MIN_WIDTH,
          }}
        >
          <OutlinedInput
            placeholder="Search staff, assignment, reason"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: "text.disabled" }} />
              </InputAdornment>
            }
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          />
        </FormControl>

        <FormControl
          size="small"
          sx={{ flexShrink: 0, minWidth: FILTER_STATUS_MIN_WIDTH }}
        >
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          >
            <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
              All Statuses
            </MenuItem>
            <MenuItem
              value="pending"
              sx={{ fontFamily: dm, fontSize: "0.78rem" }}
            >
              Pending
            </MenuItem>
            <MenuItem
              value="approved"
              sx={{ fontFamily: dm, fontSize: "0.78rem" }}
            >
              Approved
            </MenuItem>
            <MenuItem
              value="rejected"
              sx={{ fontFamily: dm, fontSize: "0.78rem" }}
            >
              Rejected
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl
          size="small"
          sx={{ flexShrink: 0, minWidth: FILTER_SEMESTER_MIN_WIDTH }}
        >
          <Select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          >
            <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
              All Semesters
            </MenuItem>
            {semesters.map((s) => (
              <MenuItem
                key={s.id}
                value={s.id}
                sx={{ fontFamily: dm, fontSize: "0.78rem" }}
              >
                {getSemesterDisplayName(s)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Export" arrow>
          <IconButton
            size="small"
            onClick={runExport}
            sx={{
              borderRadius: CONTROL_RADIUS,
              width: FILTER_INPUT_HEIGHT,
              height: FILTER_INPUT_HEIGHT,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              color: "text.secondary",
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              flexShrink: 0,
              "&:hover": {
                borderColor: "rgba(53,53,53,0.3)",
                color: "text.primary",
                backgroundColor: "#ededee",
              },
            }}
          >
            <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>
      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <BrandedLoader />
        </Box>
      )}

      {/* DataGrid — always rendered, skeleton rows shown while loading */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          border: `1px solid ${border}`,
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: isDark
            ? "0 1px 10px rgba(0,0,0,0.4)"
            : "0 1px 8px rgba(0,0,0,0.07)",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          rowHeight={56}
          showToolbar={false}
          onRowClick={(params) => {
            setReviewTarget(params.row._raw);
            setReviewNote("");
            setReviewError("");
          }}
          sx={{ height: "100%", cursor: "pointer" }}
          pageSizeOptions={[25, 50, 100]}
        />
      </Box>

      {/* Review dialog */}
      <ReviewDialog
        open={!!reviewTarget}
        request={reviewTarget}
        note={reviewNote}
        onNoteChange={setReviewNote}
        reviewing={reviewing}
        error={reviewError}
        isDark={isDark}
        border={border}
        onClose={() => {
          if (!reviewing) {
            setReviewTarget(null);
            setReviewNote("");
            setReviewError("");
          }
        }}
        onApprove={() => handleDecision("approved")}
        onReject={() => handleDecision("rejected")}
        onOpenLightbox={setLightboxProof}
        onProofMouseEnter={handleProofMouseEnter}
        onProofMouseLeave={handleProofMouseLeave}
      />

      {/* ── Photo lightbox (click) ── */}
      {lightboxProof && (
        <Box
          onClick={() => setLightboxProof(null)}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: "relative",
              maxWidth: "min(800px, 92vw)",
              maxHeight: "90vh",
              lineHeight: 0,
            }}
          >
            <Box
              component="img"
              src={lightboxProof}
              alt="Proof"
              sx={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "4px",
              }}
            />
          </Box>
        </Box>
      )}

      {/* ── Photo hover preview ── */}
      {hoveredProof?.url && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: (t) => t.zIndex.modal + 2,
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          <Box
            sx={{
              width: "min(68vw, 700px)",
              maxHeight: "78vh",
              borderRadius: "12px",
              overflow: "hidden",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.45)"}`,
              boxShadow: "0 24px 60px rgba(0,0,0,0.42)",
              backgroundColor: "rgba(0,0,0,0.28)",
              backdropFilter: "blur(6px)",
            }}
          >
            <Box
              component="img"
              src={hoveredProof.url}
              alt="Proof preview"
              sx={{
                width: "100%",
                maxHeight: "78vh",
                objectFit: "contain",
                display: "block",
                backgroundColor: isDark ? "#0f0f0f" : "#111",
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
