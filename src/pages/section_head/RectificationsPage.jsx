// src/pages/section_head/RectificationsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
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
} from "@mui/material";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ThumbUpOutlinedIcon from "@mui/icons-material/ThumbUpOutlined";
import ThumbDownOutlinedIcon from "@mui/icons-material/ThumbDownOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import BrandedLoader from "../../components/common/BrandedLoader";
import { supabase } from "../../lib/supabaseClient";
import { notifySpecificStaff } from "../../services/NotificationService";

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
          <Typography sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700 }}>
            Review Rectification
          </Typography>
        </Box>
        <IconButton size="small" disabled={reviewing} onClick={onClose}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 3, pt: 2.5, pb: 1 }}>
        <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary", mb: 0.25 }}>
          Staff member
        </Typography>
        <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 600, mb: 1.5 }}>
          {request.staff?.full_name ?? "—"}
        </Typography>

        <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary", mb: 0.25 }}>
          Assignment
        </Typography>
        <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 600, mb: 1.5 }}>
          {request.request?.title ?? "—"}
        </Typography>

        <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}>
          Staff reason
        </Typography>
        <Box
          sx={{
            p: 1.5,
            borderRadius: "8px",
            border: `1px solid ${border}`,
            backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
            mb: 1.75,
          }}
        >
          <Typography sx={{ fontFamily: dm, fontSize: "0.8rem" }}>
            {request.reason}
          </Typography>
        </Box>

        {proofUrl && (
          <>
            <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}>
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

        <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary", mb: 0.5 }}>
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
          <Alert severity="error" sx={{ mt: 1.5, fontFamily: dm, fontSize: "0.78rem", borderRadius: "8px" }}>
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
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
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
            "&:hover": reviewing ? {} : { backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" },
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
            backgroundColor: reviewing ? "rgba(220,38,38,0.05)" : "rgba(220,38,38,0.06)",
            color: reviewing ? "text.disabled" : "#dc2626",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            "&:hover": reviewing ? {} : { backgroundColor: "rgba(220,38,38,0.12)" },
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
            backgroundColor: reviewing ? "rgba(109,40,217,0.08)" : "#6d28d9",
            color: reviewing ? "text.disabled" : "#fff",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            userSelect: "none",
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            "&:hover": reviewing ? {} : { backgroundColor: "#5b21b6" },
          }}
        >
          <ThumbUpOutlinedIcon sx={{ fontSize: 14 }} />
          Approve
        </Box>
      </Box>
    </Dialog>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RectificationsPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.08)";

  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

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
         staff:profiles!staff_id(id, full_name),
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
          title: decision === "approved" ? "Rectification Approved" : "Rectification Rejected",
          message: msg,
          requestId: reviewTarget.request_id,
          createdBy: currentUser.id,
          targetPath: "/my-assignment",
          targetPayload: { assignmentId: reviewTarget.assignment_id },
        });

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

  if (!currentUser) return <BrandedLoader />;

  return (
    <Box sx={{ px: { xs: 2, sm: 3 }, py: 3, maxWidth: 760, mx: "auto" }}>
      {/* Page header */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 3 }}>
        
        {requests.length > 0 && (
          <Box
            sx={{
              minWidth: 20,
              height: 20,
              borderRadius: "10px",
              backgroundColor: "#6d28d9",
              color: "#fff",
              fontSize: "0.65rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              px: 0.75,
            }}
          >
            {requests.length}
          </Box>
        )}
      </Box>

      {/* Loading */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
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

      {/* Request cards */}
      {!loading &&
        requests.map((r) => (
          <Box
            key={r.id}
            sx={{
              p: 2.25,
              mb: 1.25,
              borderRadius: "10px",
              border: `1px solid ${border}`,
              backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#fff",
              cursor: "pointer",
              transition: "box-shadow 0.15s, background-color 0.15s",
              "&:hover": {
                backgroundColor: isDark
                  ? "rgba(255,255,255,0.04)"
                  : "#fafafa",
                boxShadow: isDark
                  ? "0 2px 12px rgba(0,0,0,0.4)"
                  : "0 2px 12px rgba(0,0,0,0.06)",
              },
            }}
            onClick={() => {
              setReviewTarget(r);
              setReviewNote("");
              setReviewError("");
            }}
          >
            <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
              <Avatar
                sx={{
                  width: 34,
                  height: 34,
                  fontSize: "0.72rem",
                  fontWeight: 700,
                  fontFamily: dm,
                  backgroundColor: "#ede9fe",
                  color: "#6d28d9",
                  flexShrink: 0,
                  mt: 0.25,
                }}
              >
                {r.staff?.full_name
                  ? r.staff.full_name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)
                  : "?"}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.25 }}>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.84rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.request?.title ?? "—"}
                  </Typography>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "text.secondary", flexShrink: 0 }}>
                    {new Date(r.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: dm, fontSize: "0.77rem", color: "text.secondary", mb: 0.75 }}>
                  {r.staff?.full_name ?? "—"}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.79rem",
                    color: "text.secondary",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {r.reason}
                </Typography>
                {r.proof_path && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.75 }}>
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 13, color: "#6d28d9" }} />
                    <Typography sx={{ fontFamily: dm, fontSize: "0.73rem", color: "#6d28d9" }}>
                      Proof attached
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        ))}

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
