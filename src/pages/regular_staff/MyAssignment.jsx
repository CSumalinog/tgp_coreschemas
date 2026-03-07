// src/pages/regular_staff/MyAssignment.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Chip, Button, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider, IconButton, useTheme,
} from "@mui/material";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CloseIcon from "@mui/icons-material/Close";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import { supabase } from "../../lib/supabaseClient";

const STATUS_STYLES = {
  Pending:   { backgroundColor: "#fff3e0", color: "#e65100" },
  Completed: { backgroundColor: "#e8f5e9", color: "#2e7d32" },
};

export default function MyAssignment() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [currentUser, setCurrentUser]   = useState(null);
  const [assignments, setAssignments]   = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [filter, setFilter]             = useState("All");

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [completing, setCompleting]       = useState(false);
  const [completeError, setCompleteError] = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, section, division")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  const loadAssignments = useCallback(async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("coverage_assignments")
      .select(`
        id, status, section, assigned_at,
        assigned_by_profile:assigned_by ( full_name ),
        request:request_id (
          id, title, description, event_date, from_time, to_time,
          venue, services,
          entity:entity_id ( name ),
          contact_person, contact_info
        )
      `)
      .eq("assigned_to", currentUser.id)
      .order("assigned_at", { ascending: false });

    if (fetchErr) setError(fetchErr.message);
    else setAssignments(data || []);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const handleComplete = async () => {
    if (!confirmTarget) return;
    setCompleting(true);
    setCompleteError("");

    const { error: updErr } = await supabase
      .from("coverage_assignments")
      .update({ status: "Completed" })
      .eq("id", confirmTarget.id);

    if (updErr) {
      setCompleteError(updErr.message);
      setCompleting(false);
      return;
    }

    const { data: allAssignments } = await supabase
      .from("coverage_assignments")
      .select("status")
      .eq("request_id", confirmTarget.request.id);

    const allDone = (allAssignments || []).every((a) => a.status === "Completed");

    if (allDone) {
      await supabase
        .from("coverage_requests")
        .update({ status: "Coverage Complete" })
        .eq("id", confirmTarget.request.id);
    }

    setConfirmTarget(null);
    setCompleting(false);
    loadAssignments();
  };

  const filtered = filter === "All"
    ? assignments
    : assignments.filter((a) => a.status === filter);

  const pendingCount   = assignments.filter((a) => a.status === "Pending").length;
  const completedCount = assignments.filter((a) => a.status === "Completed").length;

  if (!currentUser || loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
        <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 600, fontSize: "1.1rem", color: "text.primary" }}>
          My Assignments
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.3 }}>
          All coverage assignments given to you this semester.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Filter tabs */}
      <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
        {[
          { label: "All", count: assignments.length },
          { label: "Pending", count: pendingCount },
          { label: "Completed", count: completedCount },
        ].map((tab) => (
          <Button
            key={tab.label}
            onClick={() => setFilter(tab.label)}
            size="small"
            variant={filter === tab.label ? "contained" : "outlined"}
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              borderRadius: 1,
              px: 2,
              boxShadow: "none",
              borderColor: isDark ? "#444" : "#e0e0e0",
              color: filter === tab.label ? "#212121" : "text.secondary",
              backgroundColor: filter === tab.label ? "#f5c52b" : "background.paper",
              "&:hover": {
                backgroundColor: filter === tab.label ? "#e6b920" : isDark ? "#2a2a2a" : "#f5f5f5",
                boxShadow: "none",
                borderColor: isDark ? "#444" : "#e0e0e0",
              },
            }}
          >
            {tab.label}
            <Box
              component="span"
              sx={{
                ml: 0.8, px: 0.8, py: 0.1, borderRadius: 10,
                fontSize: "0.72rem", fontWeight: 700,
                backgroundColor: filter === tab.label ? "rgba(0,0,0,0.1)" : isDark ? "#333" : "#f5f5f5",
                color: filter === tab.label ? "#212121" : "text.secondary",
              }}
            >
              {tab.count}
            </Box>
          </Button>
        ))}
      </Box>

      {/* Assignment list */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: isDark ? "1px solid #2e2e2e" : "1px solid #e0e0e0", overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <AssignmentOutlinedIcon sx={{ fontSize: 40, color: isDark ? "#444" : "#e0e0e0", mb: 1 }} />
            <Typography sx={{ fontSize: "0.88rem", color: "text.disabled" }}>
              {filter === "All" ? "No assignments yet." : `No ${filter.toLowerCase()} assignments.`}
            </Typography>
          </Box>
        ) : (
          filtered.map((a, idx) => (
            <Box
              key={a.id}
              sx={{
                px: 3, py: 2.5,
                borderBottom: idx < filtered.length - 1 ? `1px solid ${isDark ? "#2e2e2e" : "#f5f5f5"}` : "none",
                display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                  <Typography sx={{ fontWeight: 600, fontSize: "0.92rem", color: "text.primary" }}>
                    {a.request?.title || "—"}
                  </Typography>
                  <Chip label={a.status} size="small" sx={{ fontSize: "0.72rem", fontWeight: 600, ...STATUS_STYLES[a.status] }} />
                </Box>

                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 0.8 }}>
                  {a.request?.event_date && (() => {
                    const d = new Date(a.request.event_date).getDay();
                    const weekend = d === 0 || d === 6;
                    return (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                        <CalendarTodayOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                          {new Date(a.request.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </Typography>
                        {weekend && (
                          <Chip label="Weekend" size="small" sx={{ fontSize: "0.68rem", fontWeight: 600, height: 18, backgroundColor: "#fff3e0", color: "#e65100" }} />
                        )}
                      </Box>
                    );
                  })()}
                  {a.request?.from_time && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                      <AccessTimeOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                        {a.request.from_time}{a.request.to_time && ` — ${a.request.to_time}`}
                      </Typography>
                    </Box>
                  )}
                  {a.request?.venue && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                      <LocationOnOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{a.request.venue}</Typography>
                    </Box>
                  )}
                  {a.request?.entity?.name && (
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.4 }}>
                      <PersonOutlineOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                      <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{a.request.entity.name}</Typography>
                    </Box>
                  )}
                </Box>

                {a.assigned_by_profile?.full_name && (
                  <Typography sx={{ fontSize: "0.75rem", color: "text.disabled", mt: 0.8 }}>
                    Assigned by {a.assigned_by_profile.full_name}
                  </Typography>
                )}
              </Box>

              {a.status === "Pending" && (
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 15 }} />}
                  onClick={() => { setCompleteError(""); setConfirmTarget(a); }}
                  sx={{
                    textTransform: "none", fontSize: "0.78rem",
                    borderColor: "#a5d6a7", color: "#2e7d32", flexShrink: 0,
                    "&:hover": { backgroundColor: "#e8f5e9", borderColor: "#2e7d32" },
                  }}
                >
                  Mark Complete
                </Button>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* Confirm Complete Dialog */}
      <Dialog
        open={!!confirmTarget}
        onClose={() => !completing && setConfirmTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3, backgroundColor: "background.paper" } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>Mark as Completed</Typography>
          <IconButton size="small" onClick={() => setConfirmTarget(null)} disabled={completing}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />
        <DialogContent sx={{ pt: 2 }}>
          {completeError && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{completeError}</Alert>}
          <Typography sx={{ fontSize: "0.88rem", color: "text.primary" }}>
            Are you sure you want to mark <strong>{confirmTarget?.request?.title}</strong> as completed?
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 1 }}>
            This confirms that you have finished covering this event. This action cannot be undone.
          </Typography>
        </DialogContent>
        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmTarget(null)} disabled={completing} sx={{ textTransform: "none", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleComplete}
            disabled={completing}
            sx={{
              textTransform: "none", fontWeight: 600,
              backgroundColor: "#f5c52b", color: "#212121", boxShadow: "none",
              "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
            }}
          >
            {completing ? <CircularProgress size={18} sx={{ color: "#212121" }} /> : "Yes, Mark Complete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}