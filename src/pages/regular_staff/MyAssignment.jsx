// src/pages/regular_staff/MyAssignment.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Box, Typography, CircularProgress, Chip, Button, Alert,
  Dialog, DialogContent, Divider, IconButton, useTheme,
  Badge, Paper, FormControl, InputLabel, Select, MenuItem,
  ClickAwayListener, Avatar,
} from "@mui/material";
import CalendarTodayOutlinedIcon  from "@mui/icons-material/CalendarTodayOutlined";
import LocationOnOutlinedIcon     from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineOutlinedIcon  from "@mui/icons-material/PersonOutlineOutlined";
import AccessTimeOutlinedIcon     from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineIcon     from "@mui/icons-material/CheckCircleOutline";
import CloseIcon                  from "@mui/icons-material/Close";
import AssignmentOutlinedIcon     from "@mui/icons-material/AssignmentOutlined";
import FilterListIcon             from "@mui/icons-material/FilterList";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PhoneOutlinedIcon          from "@mui/icons-material/PhoneOutlined";
import DescriptionOutlinedIcon    from "@mui/icons-material/DescriptionOutlined";
import WarningAmberOutlinedIcon   from "@mui/icons-material/WarningAmberOutlined";
import { supabase }               from "../../lib/supabaseClient";

const STATUS_STYLES = {
  Pending:   { backgroundColor: "#fff3e0", color: "#e65100" },
  Completed: { backgroundColor: "#e8f5e9", color: "#2e7d32" },
};

const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage.from("coverage-files").getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};

// ── Read-only detail dialog ────────────────────────────────────────────────────
function AssignmentDetailDialog({ assignment, open, onClose, isDark, onMarkComplete }) {
  if (!assignment) return null;
  const req    = assignment.request;
  const border = isDark ? "#2e2e2e" : "#ebebeb";

  const isWeekend = (() => {
    if (!req?.event_date) return false;
    const d = new Date(req.event_date).getDay();
    return d === 0 || d === 6;
  })();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          backgroundColor: "background.paper",
          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.1)",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
            <Chip
              label={assignment.status}
              size="small"
              sx={{ fontSize: "0.68rem", fontWeight: 700, ...STATUS_STYLES[assignment.status] }}
            />
            {isWeekend && (
              <Chip label="Weekend" size="small"
                sx={{ fontSize: "0.68rem", fontWeight: 600, height: 20, backgroundColor: "#fff3e0", color: "#e65100" }} />
            )}
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "text.primary", lineHeight: 1.35 }}>
            {req?.title || "—"}
          </Typography>
          {assignment.assigned_by_profile?.full_name && (
            <Typography sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 0.3 }}>
              Assigned by {assignment.assigned_by_profile.full_name}
            </Typography>
          )}
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: "text.secondary", flexShrink: 0 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Body */}
      <DialogContent sx={{ p: 0 }}>

        {/* Quick info strip */}
        <Box sx={{ px: 3, py: 2, display: "flex", flexWrap: "wrap", gap: 2.5, borderBottom: `1px solid ${border}`, backgroundColor: isDark ? "#1a1a1a" : "#fafafa" }}>
          {req?.event_date && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <CalendarTodayOutlinedIcon sx={{ fontSize: 14, color: "#f5c52b" }} />
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</Typography>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}>
                  {new Date(req.event_date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                </Typography>
              </Box>
            </Box>
          )}
          {req?.from_time && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <AccessTimeOutlinedIcon sx={{ fontSize: 14, color: "#f5c52b" }} />
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.06em" }}>Time</Typography>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}>
                  {req.from_time}{req.to_time ? ` — ${req.to_time}` : ""}
                </Typography>
              </Box>
            </Box>
          )}
          {req?.venue && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <LocationOnOutlinedIcon sx={{ fontSize: 14, color: "#f5c52b" }} />
              <Box>
                <Typography sx={{ fontSize: "0.68rem", color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.06em" }}>Venue</Typography>
                <Typography sx={{ fontSize: "0.82rem", fontWeight: 600, color: "text.primary" }}>{req.venue}</Typography>
              </Box>
            </Box>
          )}
        </Box>

        {/* Detail sections */}
        <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 2.5 }}>

          {/* Description */}
          {req?.description && (
            <DetailSection label="Description" icon={<DescriptionOutlinedIcon sx={{ fontSize: 14 }} />}>
              <Typography sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.6 }}>
                {req.description}
              </Typography>
            </DetailSection>
          )}

          {/* Client / Contact */}
          <DetailSection label="Client" icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 14 }} />}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              {req?.entity?.name && (
                <Typography sx={{ fontSize: "0.85rem", color: "text.primary", fontWeight: 500 }}>
                  {req.entity.name}
                </Typography>
              )}
              {req?.contact_person && (
                <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
                  Contact: {req.contact_person}
                </Typography>
              )}
              {req?.contact_info && (
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <PhoneOutlinedIcon sx={{ fontSize: 13, color: "text.disabled" }} />
                  <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>{req.contact_info}</Typography>
                </Box>
              )}
            </Box>
          </DetailSection>

          {/* Services */}
          {req?.services && Object.keys(req.services).length > 0 && (
            <DetailSection label="Coverage Requirements">
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
                {Object.entries(req.services).map(([service, pax]) => (
                  <Box
                    key={service}
                    sx={{
                      px: 1.5, py: 0.6, borderRadius: 1.5,
                      backgroundColor: isDark ? "#0d2137" : "#e3f2fd",
                      border: `1px solid ${isDark ? "#1a3a5c" : "#bbdefb"}`,
                    }}
                  >
                    <Typography sx={{ fontSize: "0.78rem", color: "#1565c0", fontWeight: 600 }}>
                      {service}
                      <Typography component="span" sx={{ fontWeight: 400, color: isDark ? "#90caf9" : "#1976d2" }}>
                        {" "}· {pax} pax
                      </Typography>
                    </Typography>
                  </Box>
                ))}
              </Box>
            </DetailSection>
          )}

          {/* Attachment */}
          {req?.file_url && (
            <DetailSection label="Attachment" icon={<InsertDriveFileOutlinedIcon sx={{ fontSize: 14 }} />}>
              <Box
                onClick={() => openFile(req.file_url)}
                sx={{
                  display: "inline-flex", alignItems: "center", gap: 0.75,
                  cursor: "pointer", color: "#1976d2",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ fontSize: "0.85rem" }}>{getFileName(req.file_url)}</Typography>
              </Box>
            </DetailSection>
          )}

          {/* Mark complete warning */}
          {assignment.status === "Pending" && (
            <Box sx={{
              display: "flex", gap: 1, p: 1.5, borderRadius: 1.5,
              backgroundColor: isDark ? "#1a1200" : "#fffbeb",
              border: `1px solid ${isDark ? "#3a2800" : "#fde68a"}`,
            }}>
              <WarningAmberOutlinedIcon sx={{ fontSize: 15, color: "#d97706", flexShrink: 0, mt: 0.1 }} />
              <Typography sx={{ fontSize: "0.78rem", color: isDark ? "#fbbf24" : "#92400e", lineHeight: 1.5 }}>
                Only mark as complete <strong>after</strong> you have finished covering the event. This cannot be undone.
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      {/* Footer */}
      <Box sx={{
        px: 3, py: 2, borderTop: `1px solid ${border}`,
        display: "flex", justifyContent: "flex-end", gap: 1,
        backgroundColor: isDark ? "#161616" : "#fafafa",
      }}>
        <Button
          size="small" onClick={onClose}
          sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary", borderRadius: 1.5 }}
        >
          Close
        </Button>
        {assignment.status === "Pending" && (
          <Button
            variant="contained" size="small"
            startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 15 }} />}
            onClick={() => { onClose(); onMarkComplete(assignment); }}
            sx={{
              textTransform: "none", fontSize: "0.82rem", fontWeight: 600, borderRadius: 1.5,
              backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none",
              "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
            }}
          >
            Mark Complete
          </Button>
        )}
      </Box>
    </Dialog>
  );
}

// ── Confirm Complete Dialog ────────────────────────────────────────────────────
function ConfirmCompleteDialog({ assignment, open, onClose, onConfirm, completing, error, isDark }) {
  if (!assignment) return null;
  const border = isDark ? "#2e2e2e" : "#ebebeb";
  return (
    <Dialog open={open} onClose={() => !completing && onClose()} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: 2.5, backgroundColor: "background.paper" } }}>
      <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 1.5, backgroundColor: isDark ? "#0a2210" : "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "#2e7d32" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "text.primary" }}>Mark as Completed</Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>Confirm you've finished this coverage</Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={completing} sx={{ color: "text.secondary" }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        {error && <Alert severity="error" sx={{ borderRadius: 1.5, fontSize: "0.78rem" }}>{error}</Alert>}

        <Box sx={{ p: 1.75, borderRadius: 1.5, border: `1px solid ${border}`, backgroundColor: isDark ? "#1a1a1a" : "#fafafa" }}>
          <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "text.primary" }}>
            {assignment.request?.title}
          </Typography>
          {assignment.request?.event_date && (
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.3 }}>
              {new Date(assignment.request.event_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
            </Typography>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, p: 1.5, borderRadius: 1.5, backgroundColor: isDark ? "#1a1200" : "#fffbeb", border: `1px solid ${isDark ? "#3a2800" : "#fde68a"}` }}>
          <WarningAmberOutlinedIcon sx={{ fontSize: 15, color: "#d97706", flexShrink: 0, mt: 0.1 }} />
          <Typography sx={{ fontSize: "0.78rem", color: isDark ? "#fbbf24" : "#92400e", lineHeight: 1.5 }}>
            This confirms you have covered the event. This action cannot be undone.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "#161616" : "#fafafa" }}>
        <Button size="small" onClick={onClose} disabled={completing}
          sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary", borderRadius: 1.5 }}>
          Cancel
        </Button>
        <Button variant="contained" size="small" onClick={onConfirm} disabled={completing}
          startIcon={completing ? null : <CheckCircleOutlineIcon sx={{ fontSize: 15 }} />}
          sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, borderRadius: 1.5, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}>
          {completing ? <CircularProgress size={16} sx={{ color: "#111827" }} /> : "Yes, Mark Complete"}
        </Button>
      </Box>
    </Dialog>
  );
}

// ── Detail section helper ──────────────────────────────────────────────────────
function DetailSection({ label, icon, children }) {
  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 0.75 }}>
        {icon && <Box sx={{ color: "text.disabled" }}>{icon}</Box>}
        <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          {label}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function MyAssignment() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [currentUser,   setCurrentUser]   = useState(null);
  const [assignments,   setAssignments]   = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState("");
  const [statusFilter,  setStatusFilter]  = useState("All");

  const [detailTarget,  setDetailTarget]  = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [completing,    setCompleting]    = useState(false);
  const [completeError, setCompleteError] = useState("");

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
          venue, services, file_url,
          entity:client_entities ( id, name ),
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

  // ── Real-time: refresh when a new assignment comes in ──
  useEffect(() => {
    if (!currentUser?.id) return;
    const ch = supabase.channel("my-assignments-rt")
      .on("postgres_changes", {
        event: "*", schema: "public", table: "coverage_assignments",
        filter: `assigned_to=eq.${currentUser.id}`,
      }, () => loadAssignments())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [currentUser?.id, loadAssignments]);

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

  const filtered = useMemo(() => {
    const byStatus = statusFilter === "All"
      ? assignments
      : assignments.filter((a) => a.status === statusFilter);
    return applyFilters(byStatus);
  }, [assignments, statusFilter, applyFilters]);

  const allFiltered       = useMemo(() => applyFilters(assignments),                                         [assignments, applyFilters]);
  const pendingFiltered   = useMemo(() => applyFilters(assignments.filter((a) => a.status === "Pending")),   [assignments, applyFilters]);
  const completedFiltered = useMemo(() => applyFilters(assignments.filter((a) => a.status === "Completed")), [assignments, applyFilters]);

  const handleComplete = async () => {
    if (!confirmTarget) return;
    setCompleting(true); setCompleteError("");
    const { error: updErr } = await supabase
      .from("coverage_assignments").update({ status: "Completed" }).eq("id", confirmTarget.id);
    if (updErr) { setCompleteError(updErr.message); setCompleting(false); return; }

    // Check if all assignments for this request are done → bump request status
    const { data: allAssignments } = await supabase
      .from("coverage_assignments").select("status").eq("request_id", confirmTarget.request.id);
    const allDone = (allAssignments || []).every((a) => a.status === "Completed");
    if (allDone) {
      await supabase.from("coverage_requests")
        .update({ status: "Coverage Complete", completed_at: new Date().toISOString() })
        .eq("id", confirmTarget.request.id);
    }
    setConfirmTarget(null); setCompleting(false);
    loadAssignments();
  };

  const border          = isDark ? "#2e2e2e" : "#ebebeb";
  const selectedSemName = semesters.find((s) => s.id === selectedSem)?.name;

  if (!currentUser || loading) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "text.primary", letterSpacing: "-0.01em" }}>
          My Assignments
        </Typography>
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.3 }}>
          All coverage assignments given to you. Click any row to view full details.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Status tabs + filter */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2, gap: 1 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {[
            { label: "All",       count: allFiltered.length       },
            { label: "Pending",   count: pendingFiltered.length   },
            { label: "Completed", count: completedFiltered.length },
          ].map((tab) => (
            <Box
              key={tab.label}
              onClick={() => setStatusFilter(tab.label)}
              sx={{
                px: 2, py: 0.75, borderRadius: 1.5, cursor: "pointer",
                fontSize: "0.82rem", fontWeight: statusFilter === tab.label ? 700 : 500,
                border: "1px solid",
                borderColor: statusFilter === tab.label ? "#f5c52b" : "divider",
                backgroundColor: statusFilter === tab.label ? (isDark ? "#2a2200" : "#fffbeb") : "background.paper",
                color: statusFilter === tab.label ? "#d97706" : "text.secondary",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 1,
                "&:hover": { borderColor: "#f5c52b", color: "#d97706", backgroundColor: isDark ? "#2a2200" : "#fffbeb" },
              }}
            >
              {tab.label}
              {tab.count > 0 && (
                <Box sx={{ minWidth: 18, height: 18, borderRadius: 9, px: 0.5, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: statusFilter === tab.label ? "#f5c52b" : isDark ? "#333" : "#f3f4f6" }}>
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, lineHeight: 1, color: statusFilter === tab.label ? "#111827" : "text.secondary" }}>
                    {tab.count}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>

        {/* Filter */}
        <Box ref={filterRef} sx={{ position: "relative" }}>
          <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
            <Box>
              <IconButton size="small" onClick={() => setFilterOpen((p) => !p)}
                sx={{
                  border: "1px solid", borderColor: activeFilterCount > 0 ? "#f5c52b" : border,
                  borderRadius: 1.5, px: 1, py: 0.6,
                  backgroundColor: activeFilterCount > 0 ? (isDark ? "#2a2200" : "#fffbeb") : "background.paper",
                  color: activeFilterCount > 0 ? "#d97706" : "text.secondary",
                  "&:hover": { borderColor: "#f5c52b", color: "#d97706", backgroundColor: isDark ? "#2a2200" : "#fffbeb" },
                }}>
                <Badge badgeContent={activeFilterCount} sx={{ "& .MuiBadge-badge": { fontSize: "0.6rem", height: 14, minWidth: 14, backgroundColor: "#f5c52b", color: "#111827" } }}>
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </Badge>
              </IconButton>

              {filterOpen && (
                <Paper elevation={4} sx={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 260, zIndex: 1300, borderRadius: 2, overflow: "hidden", border: `1px solid ${border}`, backgroundColor: "background.paper" }}>
                  <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${border}` }}>
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
                      <Divider sx={{ borderColor: border }} />
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

      {/* Active filter chips */}
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

      {/* Assignment cards */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2.5, border: `1px solid ${border}`, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <Box sx={{ p: 5, textAlign: "center" }}>
            <AssignmentOutlinedIcon sx={{ fontSize: 40, color: isDark ? "#444" : "#e0e0e0", mb: 1 }} />
            <Typography sx={{ fontSize: "0.85rem", color: "text.disabled" }}>
              {statusFilter === "All" ? "No assignments found." : `No ${statusFilter.toLowerCase()} assignments.`}
            </Typography>
          </Box>
        ) : (
          filtered.map((a, idx) => {
            const isWeekend = (() => {
              if (!a.request?.event_date) return false;
              const d = new Date(a.request.event_date).getDay();
              return d === 0 || d === 6;
            })();

            return (
              <Box
                key={a.id}
                onClick={() => setDetailTarget(a)}
                sx={{
                  px: 3, py: 2.5,
                  borderBottom: idx < filtered.length - 1 ? `1px solid ${border}` : "none",
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2,
                  cursor: "pointer",
                  transition: "background 0.15s",
                  "&:hover": { backgroundColor: isDark ? "#1a1a1a" : "#fafafa" },
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.6, flexWrap: "wrap" }}>
                    <Typography sx={{ fontWeight: 600, fontSize: "0.92rem", color: "text.primary" }}>
                      {a.request?.title || "—"}
                    </Typography>
                    <Chip label={a.status} size="small"
                      sx={{ fontSize: "0.68rem", fontWeight: 700, ...STATUS_STYLES[a.status] }} />
                    {isWeekend && (
                      <Chip label="Weekend" size="small"
                        sx={{ fontSize: "0.68rem", fontWeight: 600, height: 20, backgroundColor: isDark ? "#2a1a00" : "#fff3e0", color: "#e65100" }} />
                    )}
                  </Box>

                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 0.3 }}>
                    {a.request?.event_date && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <CalendarTodayOutlinedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                          {new Date(a.request.event_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                        </Typography>
                      </Box>
                    )}
                    {a.request?.from_time && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <AccessTimeOutlinedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                          {a.request.from_time}{a.request.to_time ? ` — ${a.request.to_time}` : ""}
                        </Typography>
                      </Box>
                    )}
                    {a.request?.venue && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <LocationOnOutlinedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{a.request.venue}</Typography>
                      </Box>
                    )}
                    {a.request?.entity?.name && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <PersonOutlineOutlinedIcon sx={{ fontSize: 12, color: "text.disabled" }} />
                        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>{a.request.entity.name}</Typography>
                      </Box>
                    )}
                  </Box>

                  {a.assigned_by_profile?.full_name && (
                    <Typography sx={{ fontSize: "0.72rem", color: "text.disabled", mt: 0.6 }}>
                      Assigned by {a.assigned_by_profile.full_name}
                    </Typography>
                  )}
                </Box>

                {a.status === "Pending" && (
                  <Button
                    size="small" variant="outlined"
                    startIcon={<CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
                    onClick={(e) => { e.stopPropagation(); setCompleteError(""); setConfirmTarget(a); }}
                    sx={{
                      textTransform: "none", fontSize: "0.78rem", flexShrink: 0, borderRadius: 1.5,
                      borderColor: "#a5d6a7", color: "#2e7d32",
                      "&:hover": { backgroundColor: "#e8f5e9", borderColor: "#2e7d32" },
                    }}
                  >
                    Mark Complete
                  </Button>
                )}
              </Box>
            );
          })
        )}
      </Box>

      {/* Detail dialog */}
      <AssignmentDetailDialog
        open={!!detailTarget}
        assignment={detailTarget}
        isDark={isDark}
        onClose={() => setDetailTarget(null)}
        onMarkComplete={(a) => { setCompleteError(""); setConfirmTarget(a); }}
      />

      {/* Confirm complete dialog */}
      <ConfirmCompleteDialog
        open={!!confirmTarget}
        assignment={confirmTarget}
        isDark={isDark}
        completing={completing}
        error={completeError}
        onClose={() => { setConfirmTarget(null); setCompleteError(""); }}
        onConfirm={handleComplete}
      />
    </Box>
  );
}