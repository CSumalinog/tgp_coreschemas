// src/pages/regular_staff/MyAssignment.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box, Typography, CircularProgress, Chip, Button, Alert,
  Dialog, DialogTitle, DialogContent, DialogActions, Divider,
  IconButton, useTheme, Badge, Paper, FormControl, InputLabel,
  Select, MenuItem, ClickAwayListener,
} from "@mui/material";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon    from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AccessTimeOutlinedIcon    from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineIcon    from "@mui/icons-material/CheckCircleOutline";
import CloseIcon                 from "@mui/icons-material/Close";
import AssignmentOutlinedIcon    from "@mui/icons-material/AssignmentOutlined";
import FilterListIcon            from "@mui/icons-material/FilterList";
import { supabase }              from "../../lib/supabaseClient";

const STATUS_STYLES = {
  Pending:   { backgroundColor: "#fff3e0", color: "#e65100" },
  Completed: { backgroundColor: "#e8f5e9", color: "#2e7d32" },
};

export default function MyAssignment() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [currentUser,   setCurrentUser]   = useState(null);
  const [assignments,   setAssignments]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [statusFilter,  setStatusFilter]  = useState("All");

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [completing,    setCompleting]    = useState(false);
  const [completeError, setCompleteError] = useState("");

  // ── Filters ──
  const [semesters,      setSemesters]      = useState([]);
  const [selectedSem,    setSelectedSem]    = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [filterOpen,     setFilterOpen]     = useState(false);
  const filterRef = useRef(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("id, full_name, section, division")
        .eq("id", user.id).single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase
        .from("semesters").select("id, name, start_date, end_date")
        .order("start_date", { ascending: false });
      setSemesters(data || []);
    }
    loadSemesters();
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

  // ── Derived entity options ──
  const entityOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    assignments.forEach((a) => {
      const name = a.request?.entity?.name;
      if (name && !seen.has(name)) { seen.add(name); opts.push(name); }
    });
    return opts.sort();
  }, [assignments]);

  const activeFilterCount = (selectedSem !== "all" ? 1 : 0) + (selectedEntity !== "all" ? 1 : 0);

  // ── Apply all filters ──
  const applyFilters = useCallback((list) => {
    let filtered = list;

    if (selectedSem !== "all") {
      const sem = semesters.find((s) => s.id === selectedSem);
      if (sem) {
        const start = new Date(sem.start_date);
        const end   = new Date(sem.end_date);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter((a) => {
          if (!a.request?.event_date) return false;
          const d = new Date(a.request.event_date);
          return d >= start && d <= end;
        });
      }
    }

    if (selectedEntity !== "all") {
      filtered = filtered.filter((a) => a.request?.entity?.name === selectedEntity);
    }

    return filtered;
  }, [selectedSem, selectedEntity, semesters]);

  // Status filter + advanced filters combined
  const filtered = useMemo(() => {
    const byStatus = statusFilter === "All"
      ? assignments
      : assignments.filter((a) => a.status === statusFilter);
    return applyFilters(byStatus);
  }, [assignments, statusFilter, applyFilters]);

  // Tab counts (apply advanced filters, then count per status)
  const allFiltered       = useMemo(() => applyFilters(assignments), [assignments, applyFilters]);
  const pendingFiltered   = useMemo(() => applyFilters(assignments.filter((a) => a.status === "Pending")),   [assignments, applyFilters]);
  const completedFiltered = useMemo(() => applyFilters(assignments.filter((a) => a.status === "Completed")), [assignments, applyFilters]);

  const handleComplete = async () => {
    if (!confirmTarget) return;
    setCompleting(true); setCompleteError("");
    const { error: updErr } = await supabase
      .from("coverage_assignments").update({ status: "Completed" }).eq("id", confirmTarget.id);
    if (updErr) { setCompleteError(updErr.message); setCompleting(false); return; }
    const { data: allAssignments } = await supabase
      .from("coverage_assignments").select("status").eq("request_id", confirmTarget.request.id);
    const allDone = (allAssignments || []).every((a) => a.status === "Completed");
    if (allDone) {
      await supabase.from("coverage_requests").update({ status: "Coverage Complete" }).eq("id", confirmTarget.request.id);
    }
    setConfirmTarget(null); setCompleting(false);
    loadAssignments();
  };

  const borderColor        = isDark ? "#2e2e2e" : "#e0e0e0";
  const selectedSemName    = semesters.find((s) => s.id === selectedSem)?.name;

  if (!currentUser || loading) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 600, fontSize: "1.1rem", color: "text.primary" }}>My Assignments</Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.3 }}>
          All coverage assignments given to you this semester.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* ── Status tabs row + filter icon ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 1 }}>

        {/* Status pills */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {[
            { label: "All",       count: allFiltered.length       },
            { label: "Pending",   count: pendingFiltered.length   },
            { label: "Completed", count: completedFiltered.length },
          ].map((tab) => (
            <Button
              key={tab.label}
              onClick={() => setStatusFilter(tab.label)}
              size="small"
              variant={statusFilter === tab.label ? "contained" : "outlined"}
              sx={{
                textTransform: "none", fontSize: "0.82rem", borderRadius: 1, px: 2,
                boxShadow: "none", borderColor: isDark ? "#444" : "#e0e0e0",
                color: statusFilter === tab.label ? "#212121" : "text.secondary",
                backgroundColor: statusFilter === tab.label ? "#f5c52b" : "background.paper",
                "&:hover": {
                  backgroundColor: statusFilter === tab.label ? "#e6b920" : isDark ? "#2a2a2a" : "#f5f5f5",
                  boxShadow: "none", borderColor: isDark ? "#444" : "#e0e0e0",
                },
              }}
            >
              {tab.label}
              <Box component="span" sx={{ ml: 0.8, px: 0.8, py: 0.1, borderRadius: 10, fontSize: "0.72rem", fontWeight: 700, backgroundColor: statusFilter === tab.label ? "rgba(0,0,0,0.1)" : isDark ? "#333" : "#f5f5f5", color: statusFilter === tab.label ? "#212121" : "text.secondary" }}>
                {tab.count}
              </Box>
            </Button>
          ))}
        </Box>

        {/* Filter icon */}
        <Box ref={filterRef} sx={{ position: "relative" }}>
          <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
            <Box>
              <IconButton
                size="small"
                onClick={() => setFilterOpen((p) => !p)}
                sx={{
                  border: "1px solid",
                  borderColor: activeFilterCount > 0 ? "#f5c52b" : borderColor,
                  borderRadius: 1.5, px: 1, py: 0.6,
                  backgroundColor: activeFilterCount > 0 ? (isDark ? "#2a2200" : "#fffbeb") : "background.paper",
                  color: activeFilterCount > 0 ? "#d97706" : "text.secondary",
                  "&:hover": { borderColor: "#f5c52b", color: "#d97706", backgroundColor: isDark ? "#2a2200" : "#fffbeb" },
                }}
              >
                <Badge badgeContent={activeFilterCount} sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", height: 14, minWidth: 14, backgroundColor: "#f5c52b", color: "#111827" } }}>
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </Badge>
              </IconButton>

              {filterOpen && (
                <Paper elevation={4} sx={{
                  position: "absolute", top: "calc(100% + 8px)", right: 0,
                  width: 260, zIndex: 1300, borderRadius: 2, overflow: "hidden",
                  border: `1px solid ${borderColor}`, backgroundColor: "background.paper",
                }}>
                  <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${borderColor}` }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "text.primary" }}>Filter Assignments</Typography>
                  </Box>
                  <Box sx={{ px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ fontSize: "0.82rem" }}>Semester</InputLabel>
                      <Select value={selectedSem} label="Semester" onChange={(e) => setSelectedSem(e.target.value)} sx={{ fontSize: "0.82rem", borderRadius: 1.5 }}>
                        <MenuItem value="all" sx={{ fontSize: "0.82rem" }}>All Semesters</MenuItem>
                        {semesters.map((s) => <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.82rem" }}>{s.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ fontSize: "0.82rem" }}>Client</InputLabel>
                      <Select value={selectedEntity} label="Client" onChange={(e) => setSelectedEntity(e.target.value)} sx={{ fontSize: "0.82rem", borderRadius: 1.5 }}>
                        <MenuItem value="all" sx={{ fontSize: "0.82rem" }}>All Clients</MenuItem>
                        {entityOptions.map((name) => <MenuItem key={name} value={name} sx={{ fontSize: "0.82rem" }}>{name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Box>
                  {activeFilterCount > 0 && (
                    <>
                      <Divider sx={{ borderColor }} />
                      <Box sx={{ px: 2, py: 1.2 }}>
                        <Button size="small" fullWidth onClick={() => { setSelectedSem("all"); setSelectedEntity("all"); }}
                          sx={{ textTransform: "none", fontSize: "0.78rem", color: "text.secondary", borderRadius: 1.5 }}>
                          Clear all filters
                        </Button>
                      </Box>
                    </>
                  )}
                </Paper>
              )}
            </Box>
          </ClickAwayListener>
        </Box>
      </Box>

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          {selectedSem !== "all" && (
            <Chip label={selectedSemName} size="small" onDelete={() => setSelectedSem("all")}
              sx={{ fontSize: "0.75rem", backgroundColor: isDark ? "#2a2200" : "#fffbeb", color: "#d97706", border: "1px solid #f5c52b", "& .MuiChip-deleteIcon": { color: "#d97706" } }} />
          )}
          {selectedEntity !== "all" && (
            <Chip label={selectedEntity} size="small" onDelete={() => setSelectedEntity("all")}
              sx={{ fontSize: "0.75rem", backgroundColor: isDark ? "#2a2200" : "#fffbeb", color: "#d97706", border: "1px solid #f5c52b", "& .MuiChip-deleteIcon": { color: "#d97706" } }} />
          )}
        </Box>
      )}

      {/* ── Assignment cards ── */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: `1px solid ${borderColor}`, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <AssignmentOutlinedIcon sx={{ fontSize: 40, color: isDark ? "#444" : "#e0e0e0", mb: 1 }} />
            <Typography sx={{ fontSize: "0.88rem", color: "text.disabled" }}>
              {statusFilter === "All" ? "No assignments found." : `No ${statusFilter.toLowerCase()} assignments.`}
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
                  size="small" variant="outlined"
                  startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 15 }} />}
                  onClick={() => { setCompleteError(""); setConfirmTarget(a); }}
                  sx={{ textTransform: "none", fontSize: "0.78rem", borderColor: "#a5d6a7", color: "#2e7d32", flexShrink: 0, "&:hover": { backgroundColor: "#e8f5e9", borderColor: "#2e7d32" } }}
                >
                  Mark Complete
                </Button>
              )}
            </Box>
          ))
        )}
      </Box>

      {/* ── Confirm Complete Dialog ── */}
      <Dialog open={!!confirmTarget} onClose={() => !completing && setConfirmTarget(null)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 3, backgroundColor: "background.paper" } }}>
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary" }}>Mark as Completed</Typography>
          <IconButton size="small" onClick={() => setConfirmTarget(null)} disabled={completing}><CloseIcon fontSize="small" /></IconButton>
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
          <Button onClick={() => setConfirmTarget(null)} disabled={completing} sx={{ textTransform: "none", color: "text.secondary" }}>Cancel</Button>
          <Button variant="contained" onClick={handleComplete} disabled={completing}
            sx={{ textTransform: "none", fontWeight: 600, backgroundColor: "#f5c52b", color: "#212121", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}>
            {completing ? <CircularProgress size={18} sx={{ color: "#212121" }} /> : "Yes, Mark Complete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}