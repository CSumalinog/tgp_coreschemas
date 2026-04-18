// src/pages/section_head/RectificationsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  Dialog,
  TextField,
  Alert,
  LinearProgress,
  IconButton,
  Avatar,
  useTheme,
  Tooltip,
  FormControl,
  OutlinedInput,
  InputAdornment,
} from "@mui/material";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import BrandedLoader from "../../components/common/BrandedLoader";
import { DataGrid } from "../../components/common/AppDataGrid";
import { supabase } from "../../lib/supabaseClient";
import {
  notifySpecificStaff,
  notifyAdmins,
} from "../../services/NotificationService";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import {
  TABLE_USER_AVATAR_SIZE,
  TABLE_USER_AVATAR_FONT_SIZE,
  CONTROL_RADIUS,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
  FILTER_SEARCH_FLEX,
  FILTER_SEARCH_MIN_WIDTH,
  FILTER_SEARCH_MAX_WIDTH,
} from "../../utils/layoutTokens";

const GOLD = "#F5C52B";
const dm = "'Inter', sans-serif";

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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GavelOutlinedIcon sx={{ fontSize: 16, color: "#6d28d9" }} />
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700 }}
          >
            Review Rectification
          </Typography>
        </Box>
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
            mb: 0.25,
          }}
        >
          Staff member
        </Typography>
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 600, mb: 1.5 }}
        >
          {request.staff?.full_name ?? "—"}
        </Typography>

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.75rem",
            color: "text.secondary",
            mb: 0.25,
          }}
        >
          Assignment
        </Typography>
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 600, mb: 1.5 }}
        >
          {request.request?.title ?? "—"}
        </Typography>

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
            <Box
              component="a"
              href={proofUrl}
              target="_blank"
              rel="noreferrer"
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                fontFamily: dm,
                fontSize: "0.8rem",
                color: "#6d28d9",
                mb: 1.75,
                textDecoration: "none",
                "&:hover": { textDecoration: "underline" },
              }}
            >
              <InsertDriveFileOutlinedIcon sx={{ fontSize: 15 }} />
              View attached proof
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
          onClick={reviewing ? undefined : onClose}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
            cursor: reviewing ? "default" : "pointer",
            border: `1px solid ${border}`,
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "text.secondary",
            userSelect: "none",
            "&:hover": reviewing
              ? {}
              : {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(0,0,0,0.04)",
                },
          }}
        >
          Cancel
        </Box>
        <Box
          onClick={reviewing ? undefined : onReject}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
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
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            "&:hover": reviewing
              ? {}
              : { backgroundColor: "rgba(220,38,38,0.12)" },
          }}
        >
          <ThumbDownOutlinedIcon sx={{ fontSize: 14 }} />
          Reject
        </Box>
        <Box
          onClick={reviewing ? undefined : onApprove}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
            cursor: reviewing ? "default" : "pointer",
            backgroundColor: reviewing ? "rgba(0,0,0,0.06)" : "#111",
            color: reviewing ? "text.disabled" : "#fff",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            "&:hover": reviewing ? {} : { backgroundColor: "#333" },
          }}
        >
          <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />
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
const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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

  // Review dialog state
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewNote, setReviewNote] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");

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
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }, [currentUser?.section]);

  useEffect(() => {
    if (currentUser?.section) loadRequests();
  }, [currentUser, loadRequests]);

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

        setRequests((prev) => prev.filter((r) => r.id !== reviewTarget.id));
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
            _raw: r,
          };
        }),
    [requests, searchText],
  );

  // ── Columns ─────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        field: "staffName",
        headerName: "Staff",
        flex: 1,
        minWidth: 160,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              gap: 0.75,
            }}
          >
            <Avatar
              src={getAvatarUrl(p.row.staffAvatarUrl)}
              sx={{
                width: TABLE_USER_AVATAR_SIZE,
                height: TABLE_USER_AVATAR_SIZE,
                fontSize: TABLE_USER_AVATAR_FONT_SIZE,
                fontWeight: 700,
                backgroundColor: p.row.avatarBg,
                color: p.row.avatarFg,
                flexShrink: 0,
              }}
            >
              {!getAvatarUrl(p.row.staffAvatarUrl) && getInitials(p.value)}
            </Avatar>
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
        flex: 1,
        minWidth: 160,
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
        flex: 1,
        minWidth: 160,
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
        width: 60,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (p) => {
          if (!p.value) {
            return (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "100%" }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.8rem",
                    color: "text.disabled",
                  }}
                >
                  —
                </Typography>
              </Box>
            );
          }
          const { data } = supabase.storage
            .from("coverage-files")
            .getPublicUrl(p.row.proofPath);
          return (
            <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
              <Tooltip title="View Proof">
                <Box
                  component="a"
                  href={data?.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  <InsertDriveFileOutlinedIcon sx={{ fontSize: 16 }} />
                </Box>
              </Tooltip>
            </Box>
          );
        },
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
          px: 1.25,
          py: 1,
          borderRadius: CONTROL_RADIUS,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f3f3f4",
        }}
      >
        <FormControl
          size="small"
          sx={{
            flex: FILTER_SEARCH_FLEX,
            minWidth: FILTER_SEARCH_MIN_WIDTH,
            maxWidth: FILTER_SEARCH_MAX_WIDTH,
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

        <Box sx={{ flex: 1 }} />

        <Box
          onClick={runExport}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            height: FILTER_INPUT_HEIGHT,
            borderRadius: CONTROL_RADIUS,
            cursor: "pointer",
            border: "1px solid rgba(0,0,0,0.12)",
            fontFamily: dm,
            fontSize: "0.78rem",
            fontWeight: 500,
            color: "text.secondary",
            backgroundColor: isDark ? "transparent" : "#f7f7f8",
            flexShrink: 0,
            transition: "all 0.15s",
            "&:hover": {
              borderColor: "rgba(53,53,53,0.3)",
              color: "text.primary",
              backgroundColor: "#ededee",
            },
          }}
        >
          <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
          Export
        </Box>
      </Box>
      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}>
          <BrandedLoader />
        </Box>
      )}

      {/* Empty state */}
      {!loading && requests.length === 0 && (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            py: 10,
            gap: 1.5,
            color: "text.secondary",
          }}
        >
          <GavelOutlinedIcon sx={{ fontSize: 36, opacity: 0.25 }} />
          <Typography sx={{ fontFamily: dm, fontSize: "0.85rem" }}>
            No pending rectification requests.
          </Typography>
        </Box>
      )}

      {/* DataGrid */}
      {!loading && requests.length > 0 && (
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            border: `1px solid ${border}`,
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            rowHeight={56}
            showToolbar={false}
            onRowClick={(params) => {
              setReviewTarget(params.row._raw);
              setReviewNote("");
              setReviewError("");
            }}
            sx={{ height: "100%", cursor: "pointer" }}
            hideFooter={rows.length <= 100}
            pageSizeOptions={[100]}
          />
        </Box>
      )}

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
      />
    </Box>
  );
}
