// src/pages/regular_staff/TimeoutPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Typography, CircularProgress,
  Avatar, Chip, Alert,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeIcon         from "@mui/icons-material/AccessTime";
import EventOutlinedIcon      from "@mui/icons-material/EventOutlined";
import PlaceOutlinedIcon      from "@mui/icons-material/PlaceOutlined";
import LockOutlinedIcon       from "@mui/icons-material/LockOutlined";
import { supabase }           from "../../lib/supabaseClient";
import {
  notifyAdmins,
  notifyClient,
  notifySecHeads,
} from "../../services/NotificationService";

const GOLD    = "#f5c52b";
const GOLD_BG = "rgba(245,197,43,0.08)";
const dm      = "'DM Sans', sans-serif";

const STATUS_CONFIG = {
  Pending:    { label: "Pending",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  Approved:   { label: "Approved",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  "On Going": { label: "On Going",  color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
  Completed:  { label: "Completed", color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  "No Show":  { label: "No Show",   color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
};

export default function TimeoutPage() {
  const { requestId } = useParams();

  const [currentUser,  setCurrentUser]  = useState(null);
  const [request,      setRequest]      = useState(null);
  const [assignments,  setAssignments]  = useState([]);
  const [myAssignment, setMyAssignment] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [confirming,   setConfirming]   = useState(false);
  const [confirmed,    setConfirmed]    = useState(false);

  // ── Load current user profile ─────────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, section, avatar_url")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile || null);
    }
    loadUser();
  }, []);

  // ── Fetch request + assignments ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      const { data: req, error: reqErr } = await supabase
        .from("coverage_requests")
        .select(`
          id, title, event_date, from_time, to_time,
          venue, status, requested_by,
          entity:entity_id(name),
          other_entity
        `)
        .eq("id", requestId)
        .single();

      if (reqErr || !req) throw new Error("Coverage request not found.");

      const { data: assigns, error: assignErr } = await supabase
        .from("coverage_assignments")
        .select(`
          id, status, section, timed_in_at,
          staffer:assigned_to(id, full_name, avatar_url)
        `)
        .eq("request_id", requestId)
        .order("section");

      if (assignErr) throw new Error("Failed to load assignments.");

      setRequest(req);
      setAssignments(assigns || []);
      setMyAssignment((assigns || []).find((a) => a.staffer?.id === currentUser.id) || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [requestId, currentUser]);

  useEffect(() => {
    if (currentUser) fetchData();
  }, [currentUser, fetchData]);

  // ── Confirm timeout ───────────────────────────────────────────────────────
  const confirmTimeout = async () => {
    if (!myAssignment) return;
    setConfirming(true);
    try {
      // 1. Mark this assignment as Completed
      const { error: updateErr } = await supabase
        .from("coverage_assignments")
        .update({ status: "Completed", completed_at: new Date().toISOString() })
        .eq("id", myAssignment.id)
        .eq("status", "On Going");

      if (updateErr) throw updateErr;

      // 2. Re-fetch ALL assignments fresh to get accurate statuses
      const { data: freshAssigns } = await supabase
        .from("coverage_assignments")
        .select("id, status")
        .eq("request_id", requestId);

      const allCompleted = freshAssigns?.length > 0
        && freshAssigns.every((a) => a.status === "Completed");

      // 3. If every staffer is done, mark the request itself as Completed
      if (allCompleted) {
        await supabase
          .from("coverage_requests")
          .update({ status: "Completed", completed_at: new Date().toISOString() })
          .eq("id", requestId);
      }

      // 4. Fire notifications — derive unique sections from all assignments
      const assignedSections = [
        ...new Set((assignments || []).map((a) => a.section).filter(Boolean)),
      ];

      await Promise.all([
        // Notify admins
        notifyAdmins({
          type:      "staff_timeout",
          title:     "Staff Timed Out",
          message:   `${currentUser.full_name} has confirmed coverage completion for "${request.title}".`,
          requestId,
        }),

        // Notify relevant section heads
        notifySecHeads({
          sections: assignedSections,
          type:     "staff_timeout",
          title:    "Staff Timed Out",
          message:  `${currentUser.full_name} (${myAssignment.section}) has confirmed time-out for "${request.title}".`,
          requestId,
        }),

        // Notify client that coverage has been completed
        request.requested_by
          ? notifyClient({
              requesterId: request.requested_by,
              type:        allCompleted ? "request_completed" : "staff_timeout",
              title:       allCompleted ? "Coverage Completed" : "Staff Timed Out",
              message:     allCompleted
                ? `All staff have completed coverage for your request "${request.title}".`
                : `${currentUser.full_name} has completed their coverage for "${request.title}".`,
              requestId,
            })
          : Promise.resolve(),
      ]);

      setConfirmed(true);
      await fetchData();
    } catch (err) {
      setError("Failed to confirm timeout: " + err.message);
    } finally {
      setConfirming(false);
    }
  };

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "—";

  const fmtTime = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
  };

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!currentUser || loading) return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
      <CircularProgress sx={{ color: GOLD }} />
    </Box>
  );

  // ── Request not found ─────────────────────────────────────────────────────
  if (error || !request) return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb", px: 3 }}>
      <Box sx={{ maxWidth: 400, textAlign: "center" }}>
        <Typography sx={{ fontFamily: dm, fontSize: "2rem", mb: 1 }}>😕</Typography>
        <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "1rem", color: "#111827", mb: 0.5 }}>
          Request Not Found
        </Typography>
        <Typography sx={{ fontFamily: dm, fontSize: "0.85rem", color: "#6b7280" }}>
          {error || "This QR code may be invalid or expired."}
        </Typography>
      </Box>
    </Box>
  );

  // ── Not assigned to this request ──────────────────────────────────────────
  if (!myAssignment) return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb", px: 3 }}>
      <Box sx={{ maxWidth: 400, textAlign: "center" }}>
        <Box sx={{ width: 56, height: 56, borderRadius: "16px", backgroundColor: "#111827", display: "flex", alignItems: "center", justifyContent: "center", mx: "auto", mb: 2 }}>
          <LockOutlinedIcon sx={{ fontSize: 26, color: "#ef4444" }} />
        </Box>
        <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "1rem", color: "#111827", mb: 0.75 }}>
          Access Denied
        </Typography>
        <Typography sx={{ fontFamily: dm, fontSize: "0.85rem", color: "#6b7280", lineHeight: 1.6 }}>
          You are not assigned to this coverage request.
        </Typography>
      </Box>
    </Box>
  );

  const entityName = request.entity?.name || request.other_entity || "—";
  const allDone    = assignments.length > 0 && assignments.every((a) => a.status === "Completed");
  const myDone     = myAssignment?.status === "Completed";
  const canConfirm = myAssignment?.status === "On Going";

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: dm }}>

      {/* ── Top bar ── */}
      <Box sx={{ backgroundColor: "#111827", px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: "8px", backgroundColor: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontFamily: dm, fontWeight: 900, fontSize: "0.75rem", color: "#111827" }}>TGP</Typography>
          </Box>
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.88rem", color: "#fff" }}>
            The Gold Panicles
          </Typography>
        </Box>
        <Chip
          label="Staff Time-Out"
          size="small"
          sx={{ fontFamily: dm, fontSize: "0.7rem", backgroundColor: GOLD_BG, color: GOLD, border: `1px solid ${GOLD}`, fontWeight: 600 }}
        />
      </Box>

      <Box sx={{ maxWidth: 560, mx: "auto", px: 2, py: 4 }}>

        {/* ── Logged in as ── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5, px: 1.5, py: 1, borderRadius: "10px", backgroundColor: "#fff", border: "1px solid #e5e7eb" }}>
          <Avatar src={currentUser.avatar_url} sx={{ width: 28, height: 28, fontSize: "0.68rem", backgroundColor: GOLD, color: "#111827" }}>
            {currentUser.full_name?.charAt(0)}
          </Avatar>
          <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "#374151" }}>
            Logged in as <strong>{currentUser.full_name}</strong> · {currentUser.section}
          </Typography>
        </Box>

        {/* ── Banners ── */}
        {confirmed && (
          <Alert icon={<CheckCircleOutlineIcon fontSize="small" />} severity="success" sx={{ mb: 2.5, borderRadius: 2, fontFamily: dm, fontSize: "0.82rem" }}>
            Your timeout has been confirmed. Coverage marked as complete!
          </Alert>
        )}
        {allDone && !confirmed && (
          <Alert icon={<CheckCircleOutlineIcon fontSize="small" />} severity="success" sx={{ mb: 2.5, borderRadius: 2, fontFamily: dm, fontSize: "0.82rem" }}>
            All staff have confirmed their timeout for this event.
          </Alert>
        )}

        {/* ── Event card ── */}
        <Box sx={{ backgroundColor: "#fff", borderRadius: "16px", border: "1px solid #e5e7eb", overflow: "hidden", mb: 3, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
          <Box sx={{ backgroundColor: "#111827", px: 3, py: 2.5 }}>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "1.05rem", color: "#fff", mb: 0.5 }}>
              {request.title}
            </Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
              {entityName}
            </Typography>
          </Box>
          <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <EventOutlinedIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.85rem", color: "#374151" }}>{fmtDate(request.event_date)}</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <AccessTimeIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.85rem", color: "#374151" }}>
                {fmtTime(request.from_time)} – {fmtTime(request.to_time)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <PlaceOutlinedIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.85rem", color: "#374151" }}>{request.venue || "—"}</Typography>
            </Box>
          </Box>
        </Box>

        {/* ── My assignment action ── */}
        <Box sx={{
          backgroundColor: canConfirm ? GOLD_BG : "#fff",
          borderRadius: "16px",
          border: canConfirm ? `1.5px solid ${GOLD}` : "1px solid #e5e7eb",
          overflow: "hidden", mb: 3,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          <Box sx={{ px: 3, py: 2, borderBottom: "1px solid #e5e7eb", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.78rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Your Assignment
            </Typography>
            <Chip
              label={myAssignment.status}
              size="small"
              icon={myDone ? <CheckCircleOutlineIcon style={{ fontSize: 12, color: STATUS_CONFIG["Completed"].color }} /> : undefined}
              sx={{
                fontFamily: dm, fontSize: "0.72rem", fontWeight: 600,
                backgroundColor: STATUS_CONFIG[myAssignment.status]?.bg || "#f3f4f6",
                color: STATUS_CONFIG[myAssignment.status]?.color || "#6b7280",
                border: `1px solid ${(STATUS_CONFIG[myAssignment.status]?.color || "#d1d5db")}30`,
              }}
            />
          </Box>
          <Box sx={{ px: 3, py: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Avatar src={currentUser.avatar_url} sx={{ width: 38, height: 38, fontSize: "0.85rem", backgroundColor: GOLD, color: "#111827" }}>
                {currentUser.full_name?.charAt(0)}
              </Avatar>
              <Box>
                <Typography sx={{ fontFamily: dm, fontWeight: 600, fontSize: "0.88rem", color: "#111827" }}>
                  {currentUser.full_name}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#9ca3af" }}>
                    {myAssignment.section}
                  </Typography>
                  {myAssignment.timed_in_at && (
                    <>
                      <Box sx={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#d1d5db" }} />
                      <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#9ca3af" }}>
                        Timed in {new Date(myAssignment.timed_in_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </Typography>
                    </>
                  )}
                </Box>
              </Box>
            </Box>

            {canConfirm && (
              <Box
                onClick={!confirming ? confirmTimeout : undefined}
                sx={{
                  px: 2, py: 0.85, borderRadius: "8px",
                  cursor: confirming ? "default" : "pointer",
                  backgroundColor: GOLD, color: "#111827",
                  fontFamily: dm, fontSize: "0.78rem", fontWeight: 700,
                  display: "flex", alignItems: "center", gap: 0.75,
                  flexShrink: 0,
                  transition: "background-color 0.15s",
                  "&:hover": { backgroundColor: confirming ? GOLD : "#e6b920" },
                }}
              >
                {confirming
                  ? <CircularProgress size={14} sx={{ color: "#111827" }} />
                  : <><CheckCircleOutlineIcon sx={{ fontSize: 15 }} /> Confirm Timeout</>
                }
              </Box>
            )}

            {myDone && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, color: "#15803d" }}>
                <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", fontWeight: 600 }}>Done</Typography>
              </Box>
            )}

            {myAssignment.status === "Approved" && (
              <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "#6b7280" }}>
                Not timed in yet
              </Typography>
            )}
          </Box>
        </Box>

        {/* ── All staff list (read-only) ── */}
        <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.78rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5 }}>
          All Assigned Staff
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {assignments.map((assign) => {
            const cfg  = STATUS_CONFIG[assign.status] || STATUS_CONFIG.Pending;
            const isMe = assign.staffer?.id === currentUser.id;
            return (
              <Box
                key={assign.id}
                sx={{
                  backgroundColor: "#fff",
                  borderRadius: "10px",
                  border: isMe ? `1.5px solid ${GOLD}` : "1px solid #e5e7eb",
                  px: 2, py: 1.5,
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2,
                  opacity: assign.status === "Completed" ? 0.7 : 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                  <Avatar src={assign.staffer?.avatar_url} sx={{ width: 32, height: 32, fontSize: "0.75rem", backgroundColor: "#e5e7eb", color: "#374151" }}>
                    {assign.staffer?.full_name?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontFamily: dm, fontWeight: 600, fontSize: "0.84rem", color: "#111827" }}>
                      {assign.staffer?.full_name || "—"}
                      {isMe && <Box component="span" sx={{ ml: 0.75, fontSize: "0.68rem", color: "#9ca3af", fontWeight: 400 }}>(you)</Box>}
                    </Typography>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "#9ca3af" }}>{assign.section}</Typography>
                  </Box>
                </Box>
                <Chip
                  label={cfg.label}
                  size="small"
                  icon={assign.status === "Completed" ? <CheckCircleOutlineIcon style={{ fontSize: 12, color: cfg.color }} /> : undefined}
                  sx={{
                    fontFamily: dm, fontSize: "0.7rem", fontWeight: 600,
                    backgroundColor: cfg.bg, color: cfg.color,
                    border: `1px solid ${cfg.color}30`,
                    "& .MuiChip-icon": { ml: 0.5 },
                  }}
                />
              </Box>
            );
          })}
        </Box>

        <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#9ca3af", textAlign: "center", mt: 4 }}>
          Each staff member must confirm their own timeout individually.
        </Typography>
      </Box>
    </Box>
  );
}