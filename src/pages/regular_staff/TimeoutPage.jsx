// src/pages/regular_staff/TimeoutPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import { Box, Typography, CircularProgress, Avatar } from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import PlaceOutlinedIcon from "@mui/icons-material/PlaceOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import { supabase } from "../../lib/supabaseClient";
import {
  notifyAdmins,
  notifyClient,
  notifySecHeads,
} from "../../services/NotificationService";

const GOLD = "#F5C52B";
const DARK = "#212121";
const dm = "'Inter', sans-serif";

const STATUS_CONFIG = {
  Pending: { label: "Pending", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  Approved: { label: "Approved", color: "#3b82f6", bg: "rgba(59,130,246,0.1)" },
  "On Going": {
    label: "On Going",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.1)",
  },
  Completed: {
    label: "Completed",
    color: "#22c55e",
    bg: "rgba(34,197,94,0.1)",
  },
  "No Show": { label: "No Show", color: "#ef4444", bg: "rgba(239,68,68,0.1)" },
};

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status] || {
    label: status,
    color: "#6b7280",
    bg: "#f3f4f6",
  };
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: cfg.bg,
      }}
    >
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: cfg.color,
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.68rem",
          fontWeight: 700,
          color: cfg.color,
        }}
      >
        {cfg.label}
      </Typography>
    </Box>
  );
}

function MetaRow({ icon, text }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
      <Box
        sx={{
          width: 22,
          height: 22,
          borderRadius: "10px",
          backgroundColor: "rgba(245,197,43,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {React.cloneElement(icon, { sx: { fontSize: 13, color: GOLD } })}
      </Box>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.82rem",
          color: "rgba(255,255,255,0.75)",
        }}
      >
        {text}
      </Typography>
    </Box>
  );
}

export default function TimeoutPage() {
  const { requestId } = useParams();

  const [currentUser, setCurrentUser] = useState(null);
  const [request, setRequest] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [myAssignment, setMyAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [completedAt, setCompletedAt] = useState(null);

  // ── Load current user — cancelled guard prevents AbortError on unmount ───
  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, section, avatar_url")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      setCurrentUser(profile || null);
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Fetch request + assignments ───────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    setError("");
    try {
      const { data: req, error: reqErr } = await supabase
        .from("coverage_requests")
        .select(
          `
          id, title, event_date, from_time, to_time,
          venue, status, requested_by,
          entity:entity_id(name),
          other_entity
        `,
        )
        .eq("id", requestId)
        .single();

      if (reqErr || !req) throw new Error("Coverage request not found.");

      const { data: assigns, error: assignErr } = await supabase
        .from("coverage_assignments")
        .select(
          `
          id, status, section, timed_in_at,
          staffer:assigned_to(id, full_name, avatar_url)
        `,
        )
        .eq("request_id", requestId)
        .order("section");

      if (assignErr) throw new Error("Failed to load assignments.");

      setRequest(req);
      setAssignments(assigns || []);
      setMyAssignment(
        (assigns || []).find((a) => a.staffer?.id === currentUser.id) || null,
      );
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
      const now = new Date().toISOString();

      const { error: updateErr } = await supabase
        .from("coverage_assignments")
        .update({ status: "Completed", completed_at: now })
        .eq("id", myAssignment.id)
        .eq("status", "On Going");

      if (updateErr) throw updateErr;

      const { data: freshAssigns } = await supabase
        .from("coverage_assignments")
        .select("id, status")
        .eq("request_id", requestId);

      const allCompleted =
        freshAssigns?.length > 0 &&
        freshAssigns.every((a) => a.status === "Completed");

      if (allCompleted) {
        await supabase
          .from("coverage_requests")
          .update({ status: "Completed", completed_at: now })
          .eq("id", requestId);
      }

      const assignedSections = [
        ...new Set((assignments || []).map((a) => a.section).filter(Boolean)),
      ];

      await Promise.all([
        notifyAdmins({
          type: "staff_timeout",
          title: "Staff Timed Out",
          message: `${currentUser.full_name} has confirmed coverage completion for "${request.title}".`,
          requestId,
          createdBy: currentUser.id,
        }),
        notifySecHeads({
          sections: assignedSections,
          type: "staff_timeout",
          title: "Staff Timed Out",
          message: `${currentUser.full_name} (${myAssignment.section}) has confirmed time-out for "${request.title}".`,
          requestId,
          createdBy: currentUser.id,
        }),
        request.requested_by
          ? notifyClient({
              requesterId: request.requested_by,
              type: allCompleted ? "request_completed" : "staff_timeout",
              title: allCompleted ? "Coverage Completed" : "Staff Timed Out",
              message: allCompleted
                ? `All staff have completed coverage for your request "${request.title}".`
                : `${currentUser.full_name} has completed their coverage for "${request.title}".`,
              requestId,
              createdBy: currentUser.id,
            })
          : Promise.resolve(),
      ]);

      setCompletedAt(now);
      setConfirmed(true);
      await fetchData();
    } catch (err) {
      setError("Failed to confirm timeout: " + err.message);
    } finally {
      setConfirming(false);
    }
  };

  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "—";

  const fmtTime = (t) => {
    if (!t) return "—";
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
  };

  const fmtDateTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return `${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} · ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  };

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "?";

  // ── Loading ───────────────────────────────────────────────────────────────
  if (!currentUser || loading)
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: DARK,
        }}
      >
        <CircularProgress sx={{ color: GOLD }} />
      </Box>
    );

  // ── Error / not found ─────────────────────────────────────────────────────
  if (error || !request)
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: DARK,
          px: 3,
          textAlign: "center",
        }}
      >
        <Typography sx={{ fontSize: "2rem", mb: 1.5 }}>😕</Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "1rem",
            color: "#fff",
            mb: 0.75,
          }}
        >
          Request Not Found
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.6,
          }}
        >
          {error || "This QR code may be invalid or expired."}
        </Typography>
      </Box>
    );

  // ── Not assigned ──────────────────────────────────────────────────────────
  if (!myAssignment)
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: DARK,
          px: 3,
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 64,
            height: 64,
            borderRadius: "10px",
            backgroundColor: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            mb: 2,
          }}
        >
          <LockOutlinedIcon sx={{ fontSize: 28, color: "#ef4444" }} />
        </Box>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "#fff",
            mb: 0.75,
          }}
        >
          Access Denied
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            color: "rgba(255,255,255,0.4)",
            lineHeight: 1.6,
          }}
        >
          You are not assigned to this coverage request.
        </Typography>
      </Box>
    );

  const entityName = request.entity?.name || request.other_entity || "";
  const myDone = myAssignment?.status === "Completed";
  const canConfirm = myAssignment?.status === "On Going";
  const doneCount = assignments.filter((a) => a.status === "Completed").length;
  const totalCount = assignments.length;

  // ── Success state ─────────────────────────────────────────────────────────
  if (confirmed || myDone)
    return (
      <Box
        sx={{ minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: dm }}
      >
        <Box
          sx={{
            backgroundColor: DARK,
            px: 3,
            pt: 5,
            pb: 4,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              border: `2px solid ${GOLD}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mb: 2,
            }}
          >
            <CheckCircleOutlineIcon sx={{ fontSize: 34, color: GOLD }} />
          </Box>
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: "1.35rem",
              color: "#fff",
              mb: 0.75,
            }}
          >
            Coverage complete
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              color: "rgba(255,255,255,0.45)",
              lineHeight: 1.6,
              mb: 1,
            }}
          >
            Your time-out has been recorded. Thank you for your service.
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              fontWeight: 600,
              color: GOLD,
            }}
          >
            {fmtDateTime(completedAt || new Date().toISOString())}
          </Typography>
        </Box>

        <Box sx={{ px: 2, py: 2.5 }}>
          <Box
            sx={{
              backgroundColor: "#fff",
              borderRadius: "10px",
              border: "1px solid #e5e7eb",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.25,
                borderBottom: "1px solid #f3f4f6",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "#9ca3af",
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                }}
              >
                Coverage team
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Box
                  sx={{
                    width: 56,
                    height: 4,
                    borderRadius: "10px",
                    backgroundColor: "#f3f4f6",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${(doneCount / totalCount) * 100}%`,
                      backgroundColor: "#22c55e",
                      borderRadius: "10px",
                    }}
                  />
                </Box>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: "#15803d",
                  }}
                >
                  {doneCount} / {totalCount} done
                </Typography>
              </Box>
            </Box>
            {assignments.map((assign) => {
              const isMe = assign.staffer?.id === currentUser.id;
              return (
                <Box
                  key={assign.id}
                  sx={{
                    px: 2,
                    py: 1.25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderBottom: "1px solid #f9fafb",
                    opacity: assign.status === "Completed" ? 0.55 : 1,
                    "&:last-child": { borderBottom: "none" },
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Avatar
                      src={assign.staffer?.avatar_url}
                      sx={{
                        width: 30,
                        height: 30,
                        fontSize: "0.72rem",
                        backgroundColor: isMe ? GOLD : "#f3f4f6",
                        color: isMe ? DARK : "#6b7280",
                      }}
                    >
                      {getInitials(assign.staffer?.full_name)}
                    </Avatar>
                    <Box>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          color: "#111827",
                        }}
                      >
                        {assign.staffer?.full_name || "—"}
                        {isMe && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.75,
                              fontSize: "0.68rem",
                              color: "#9ca3af",
                              fontWeight: 400,
                            }}
                          >
                            (you)
                          </Box>
                        )}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.7rem",
                          color: "#9ca3af",
                        }}
                      >
                        {assign.section}
                      </Typography>
                    </Box>
                  </Box>
                  <StatusPill status={assign.status} />
                </Box>
              );
            })}
          </Box>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.7rem",
              color: "#9ca3af",
              textAlign: "center",
              mt: 2,
            }}
          >
            Each staff member confirms their own timeout individually.
          </Typography>
        </Box>
      </Box>
    );

  // ── Main view ─────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{ minHeight: "100vh", backgroundColor: "#f9fafb", fontFamily: dm }}
    >
      <Box
        sx={{
          backgroundColor: DARK,
          px: 2.5,
          py: 1.75,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            sx={{ backgroundColor: GOLD, borderRadius: "10px", px: 1, py: 0.4 }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.72rem",
                color: DARK,
              }}
            >
              TGP
            </Typography>
          </Box>
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 600,
              fontSize: "0.85rem",
              color: "#fff",
            }}
          >
            Core Schemas
          </Typography>
        </Box>
        <Box
          sx={{
            backgroundColor: "rgba(245,197,43,0.1)",
            border: "1px solid rgba(245,197,43,0.35)",
            borderRadius: "10px",
            px: 1.1,
            py: 0.35,
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.68rem",
              fontWeight: 600,
              color: GOLD,
            }}
          >
            Staff Time-Out
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          backgroundColor: DARK,
          px: 2.5,
          pt: 2.5,
          pb: 3,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "1.1rem",
            color: "#fff",
            lineHeight: 1.3,
            mb: 0.5,
          }}
        >
          {request.title}
        </Typography>
        {entityName && (
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.4)",
              mb: 2,
            }}
          >
            {entityName}
          </Typography>
        )}
        <MetaRow
          icon={<EventOutlinedIcon />}
          text={fmtDate(request.event_date)}
        />
        <MetaRow
          icon={<AccessTimeIcon />}
          text={`${fmtTime(request.from_time)} – ${fmtTime(request.to_time)}`}
        />
        <MetaRow icon={<PlaceOutlinedIcon />} text={request.venue || "—"} />
      </Box>

      <Box
        sx={{
          px: 2,
          py: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 1,
            borderRadius: "10px",
            backgroundColor: "#fff",
            border: "1px solid #e5e7eb",
          }}
        >
          <Avatar
            src={currentUser.avatar_url}
            sx={{
              width: 26,
              height: 26,
              fontSize: "0.65rem",
              backgroundColor: GOLD,
              color: DARK,
            }}
          >
            {getInitials(currentUser.full_name)}
          </Avatar>
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.75rem", color: "#374151" }}
          >
            Logged in as <strong>{currentUser.full_name}</strong> ·{" "}
            {currentUser.section}
          </Typography>
        </Box>

        {error && (
          <Box
            sx={{
              px: 1.5,
              py: 1.25,
              borderRadius: "10px",
              backgroundColor: "rgba(239,68,68,0.06)",
              border: "1px solid rgba(239,68,68,0.25)",
            }}
          >
            <Typography
              sx={{ fontFamily: dm, fontSize: "0.78rem", color: "#dc2626" }}
            >
              {error}
            </Typography>
          </Box>
        )}

        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.09em",
              }}
            >
              Your assignment
            </Typography>
            <StatusPill status={myAssignment.status} />
          </Box>
          <Box
            sx={{
              px: 2,
              py: 1.75,
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <Avatar
              src={currentUser.avatar_url}
              sx={{
                width: 44,
                height: 44,
                fontSize: "0.9rem",
                backgroundColor: GOLD,
                color: DARK,
              }}
            >
              {getInitials(currentUser.full_name)}
            </Avatar>
            <Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  color: "#111827",
                }}
              >
                {currentUser.full_name}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                <Typography
                  sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#9ca3af" }}
                >
                  {myAssignment.section}
                </Typography>
                {myAssignment.timed_in_at && (
                  <>
                    <Box
                      sx={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        backgroundColor: "#d1d5db",
                      }}
                    />
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.72rem",
                        color: "#9ca3af",
                      }}
                    >
                      Timed in{" "}
                      {new Date(myAssignment.timed_in_at).toLocaleTimeString(
                        "en-US",
                        { hour: "2-digit", minute: "2-digit" },
                      )}
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
                mx: 1.75,
                mb: 1.75,
                py: 1.4,
                borderRadius: "10px",
                backgroundColor: DARK,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                cursor: confirming ? "default" : "pointer",
                transition: "background-color 0.15s",
                "&:hover": { backgroundColor: confirming ? DARK : "#2e2e2e" },
              }}
            >
              {confirming ? (
                <CircularProgress size={15} sx={{ color: "#fff" }} />
              ) : (
                <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "#fff" }} />
              )}
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                {confirming ? "Recording…" : "Confirm Coverage Complete"}
              </Typography>
            </Box>
          )}

          {myAssignment.status === "Approved" && (
            <Box
              sx={{
                mx: 1.75,
                mb: 1.75,
                py: 1.2,
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{ fontFamily: dm, fontSize: "0.78rem", color: "#9ca3af" }}
              >
                Not timed in yet
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            backgroundColor: "#fff",
            borderRadius: "10px",
            border: "1px solid #e5e7eb",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.25,
              borderBottom: "1px solid #f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 700,
                color: "#9ca3af",
                textTransform: "uppercase",
                letterSpacing: "0.09em",
              }}
            >
              Coverage team
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <Box
                sx={{
                  width: 56,
                  height: 4,
                  borderRadius: "10px",
                  backgroundColor: "#f3f4f6",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    height: "100%",
                    width: `${(doneCount / totalCount) * 100}%`,
                    backgroundColor: "#22c55e",
                    borderRadius: "10px",
                    transition: "width 0.4s",
                  }}
                />
              </Box>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: "#15803d",
                }}
              >
                {doneCount} / {totalCount} done
              </Typography>
            </Box>
          </Box>
          {assignments.map((assign) => {
            const isMe = assign.staffer?.id === currentUser.id;
            return (
              <Box
                key={assign.id}
                sx={{
                  px: 2,
                  py: 1.25,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid #f9fafb",
                  opacity: assign.status === "Completed" ? 0.55 : 1,
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar
                    src={assign.staffer?.avatar_url}
                    sx={{
                      width: 30,
                      height: 30,
                      fontSize: "0.72rem",
                      backgroundColor: isMe ? GOLD : "#f3f4f6",
                      color: isMe ? DARK : "#6b7280",
                    }}
                  >
                    {getInitials(assign.staffer?.full_name)}
                  </Avatar>
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "#111827",
                      }}
                    >
                      {assign.staffer?.full_name || "—"}
                      {isMe && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.75,
                            fontSize: "0.68rem",
                            color: "#9ca3af",
                            fontWeight: 400,
                          }}
                        >
                          (you)
                        </Box>
                      )}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.7rem",
                        color: "#9ca3af",
                      }}
                    >
                      {assign.section}
                    </Typography>
                  </Box>
                </Box>
                <StatusPill status={assign.status} />
              </Box>
            );
          })}
        </Box>

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.7rem",
            color: "#9ca3af",
            textAlign: "center",
            pb: 1,
          }}
        >
          Each staff member confirms their own timeout individually.
        </Typography>
      </Box>
    </Box>
  );
}
