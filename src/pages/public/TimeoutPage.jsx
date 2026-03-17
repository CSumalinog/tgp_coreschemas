// src/pages/public/TimeoutPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import {
  Box, Typography, Button, CircularProgress,
  Avatar, Chip, Divider, Alert,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeIcon         from "@mui/icons-material/AccessTime";
import EventOutlinedIcon      from "@mui/icons-material/EventOutlined";
import PlaceOutlinedIcon      from "@mui/icons-material/PlaceOutlined";
import { supabase }           from "../../lib/supabaseClient";

const GOLD     = "#f5c52b";
const GOLD_BG  = "rgba(245,197,43,0.08)";
const dm       = "'DM Sans', sans-serif";

const STATUS_CONFIG = {
  Pending:   { label: "Pending",   color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  Approved:  { label: "Approved",  color: "#3b82f6", bg: "rgba(59,130,246,0.1)"  },
  "On Going":{ label: "On Going",  color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
  Completed: { label: "Completed", color: "#22c55e", bg: "rgba(34,197,94,0.1)"   },
  "No Show": { label: "No Show",   color: "#ef4444", bg: "rgba(239,68,68,0.1)"   },
};

export default function TimeoutPage() {
  const { requestId } = useParams();

  const [request,     setRequest]     = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [confirming,  setConfirming]  = useState(null); // assignment id being confirmed

  // ── Fetch request + assignments ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data: req, error: reqErr } = await supabase
        .from("coverage_requests")
        .select(`
          id, title, event_date, from_time, to_time,
          venue, status,
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
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [requestId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Confirm timeout for a specific assignment ─────────────────────────────
  const confirmTimeout = async (assignmentId) => {
    setConfirming(assignmentId);
    try {
      const { error } = await supabase
        .from("coverage_assignments")
        .update({
          status:       "Completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)
        .eq("status", "On Going"); // only allow if On Going

      if (error) throw error;
      await fetchData(); // refresh
    } catch (err) {
      setError("Failed to confirm timeout: " + err.message);
    } finally {
      setConfirming(null);
    }
  };

  // ── Format helpers ────────────────────────────────────────────────────────
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
  if (loading) return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb" }}>
      <CircularProgress sx={{ color: GOLD }} />
    </Box>
  );

  // ── Error ─────────────────────────────────────────────────────────────────
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

  const entityName = request.entity?.name || request.other_entity || "—";
  const allDone    = assignments.length > 0 && assignments.every((a) => a.status === "Completed");

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: dm }}>

      {/* ── Top bar ── */}
      <Box sx={{
        backgroundColor: "#111827",
        px: 3, py: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 28, height: 28, borderRadius: "8px", backgroundColor: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontFamily: dm, fontWeight: 900, fontSize: "0.75rem", color: "#111827" }}>TGP</Typography>
          </Box>
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.88rem", color: "#fff" }}>
            The Golden Press
          </Typography>
        </Box>
        <Chip
          label="Staff Time-Out"
          size="small"
          sx={{ fontFamily: dm, fontSize: "0.7rem", backgroundColor: GOLD_BG, color: GOLD, border: `1px solid ${GOLD}`, fontWeight: 600 }}
        />
      </Box>

      <Box sx={{ maxWidth: 560, mx: "auto", px: 2, py: 4 }}>

        {/* ── All done banner ── */}
        {allDone && (
          <Alert
            icon={<CheckCircleOutlineIcon fontSize="small" />}
            severity="success"
            sx={{ mb: 3, borderRadius: 2, fontFamily: dm, fontSize: "0.82rem" }}
          >
            All staff have confirmed their timeout for this event.
          </Alert>
        )}

        {/* ── Event card ── */}
        <Box sx={{
          backgroundColor: "#fff",
          borderRadius: "16px",
          border: "1px solid #e5e7eb",
          overflow: "hidden",
          mb: 3,
          boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
        }}>
          {/* Card header */}
          <Box sx={{ backgroundColor: "#111827", px: 3, py: 2.5 }}>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "1.05rem", color: "#fff", mb: 0.5 }}>
              {request.title}
            </Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "rgba(255,255,255,0.5)" }}>
              {entityName}
            </Typography>
          </Box>

          {/* Event details */}
          <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <EventOutlinedIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.85rem", color: "#374151" }}>
                {fmtDate(request.event_date)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <AccessTimeIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.85rem", color: "#374151" }}>
                {fmtTime(request.from_time)} – {fmtTime(request.to_time)}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <PlaceOutlinedIcon sx={{ fontSize: 16, color: "#9ca3af" }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.85rem", color: "#374151" }}>
                {request.venue || "—"}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Staff list ── */}
        <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.78rem", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.5 }}>
          Assigned Staff
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {assignments.map((assign) => {
            const cfg        = STATUS_CONFIG[assign.status] || STATUS_CONFIG.Pending;
            const canConfirm = assign.status === "On Going";
            const isConfirming = confirming === assign.id;

            return (
              <Box
                key={assign.id}
                sx={{
                  backgroundColor: "#fff",
                  borderRadius: "12px",
                  border: "1px solid #e5e7eb",
                  px: 2.5, py: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 2,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                  // Highlight On Going cards
                  ...(canConfirm && {
                    borderColor: GOLD,
                    backgroundColor: GOLD_BG,
                  }),
                  ...(assign.status === "Completed" && {
                    opacity: 0.7,
                  }),
                }}
              >
                {/* Avatar + name */}
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Avatar
                    src={assign.staffer?.avatar_url}
                    sx={{ width: 38, height: 38, fontSize: "0.85rem", backgroundColor: "#e5e7eb", color: "#374151" }}
                  >
                    {assign.staffer?.full_name?.charAt(0)}
                  </Avatar>
                  <Box>
                    <Typography sx={{ fontFamily: dm, fontWeight: 600, fontSize: "0.88rem", color: "#111827" }}>
                      {assign.staffer?.full_name || "—"}
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
                      <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#9ca3af" }}>
                        {assign.section}
                      </Typography>
                      {assign.timed_in_at && (
                        <>
                          <Box sx={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#d1d5db" }} />
                          <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#9ca3af" }}>
                            Timed in {new Date(assign.timed_in_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </Typography>
                        </>
                      )}
                    </Box>
                  </Box>
                </Box>

                {/* Right side: status or confirm button */}
                <Box sx={{ flexShrink: 0 }}>
                  {canConfirm ? (
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => confirmTimeout(assign.id)}
                      disabled={isConfirming}
                      sx={{
                        fontFamily: dm,
                        fontWeight: 600,
                        fontSize: "0.78rem",
                        textTransform: "none",
                        borderRadius: "8px",
                        backgroundColor: GOLD,
                        color: "#111827",
                        boxShadow: "none",
                        px: 2,
                        "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
                      }}
                    >
                      {isConfirming
                        ? <CircularProgress size={14} sx={{ color: "#111827" }} />
                        : "Confirm Timeout"
                      }
                    </Button>
                  ) : (
                    <Chip
                      label={cfg.label}
                      size="small"
                      icon={assign.status === "Completed"
                        ? <CheckCircleOutlineIcon style={{ fontSize: 13, color: cfg.color }} />
                        : undefined
                      }
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        backgroundColor: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}30`,
                        "& .MuiChip-icon": { ml: 0.5 },
                      }}
                    />
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* ── Footer note ── */}
        <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#9ca3af", textAlign: "center", mt: 4 }}>
          This page is for staff use only. Each staff member must confirm their own timeout individually.
        </Typography>

      </Box>
    </Box>
  );
}