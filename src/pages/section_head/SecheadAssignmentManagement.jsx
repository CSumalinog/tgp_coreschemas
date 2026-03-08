// src/pages/section_head/SecHeadAssignmentManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Button, Typography, CircularProgress, Dialog, DialogContent,
  Chip, Divider, Avatar, IconButton, Alert, Checkbox, FormGroup,
  MenuItem, Select, FormControl, InputLabel, useTheme,
  Badge, Paper, ClickAwayListener,
} from "@mui/material";
import { DataGrid }                from "@mui/x-data-grid";
import { useSearchParams, useLocation } from "react-router-dom";
import CloseIcon                   from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PersonAddOutlinedIcon       from "@mui/icons-material/PersonAddOutlined";
import CheckCircleOutlinedIcon     from "@mui/icons-material/CheckCircleOutlined";
import FilterListIcon              from "@mui/icons-material/FilterList";
import WarningAmberOutlinedIcon    from "@mui/icons-material/WarningAmberOutlined";
import { supabase }                from "../../lib/supabaseClient";
import { getAvatarUrl }            from "../../components/common/UserAvatar";

// ── Constants ──────────────────────────────────────────────────────────────────
const SECTION_SERVICE_MAP = {
  News:            "News Article",
  Photojournalism: "Photo Documentation",
  Videojournalism: "Video Documentation",
};

const STATUS_CONFIG = {
  Forwarded:           { bg: "#f3e8ff", color: "#7c3aed" },
  Assigned:            { bg: "#fff7ed", color: "#c2410c" },
  "For Approval":      { bg: "#e0f2fe", color: "#0369a1" },
  "Coverage Complete": { bg: "#dcfce7", color: "#15803d" },
  Approved:            { bg: "#dcfce7", color: "#15803d" },
  Declined:            { bg: "#fee2e2", color: "#dc2626" },
  "No-show":           { bg: "#fef3c7", color: "#d97706" },
  Completed:           { bg: "#dcfce7", color: "#15803d" },
};

const TABS = [
  { label: "For Assignment", key: "for-assignment" },
  { label: "Assigned",       key: "assigned"       },
  { label: "History",        key: "history"        },
];

const jsDateToDutyDay = (dateStr) => {
  if (!dateStr) return null;
  const day = new Date(dateStr).getDay();
  if (day === 0 || day === 6) return null;
  return day - 1;
};

const isWeekendDate = (dateStr) => {
  if (!dateStr) return false;
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
};

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
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

// ── Main Component ─────────────────────────────────────────────────────────────
export default function SecHeadAssignmentManagement() {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === "dark";
  const location = useLocation();

  const [tab, setTab] = useState(() => {
    const incoming = location.state?.tab;
    if (!incoming) return 0;
    const idx = TABS.findIndex((t) => t.key === incoming);
    return idx >= 0 ? idx : 0;
  });

  useEffect(() => {
    const incoming = location.state?.tab;
    if (!incoming) return;
    const idx = TABS.findIndex((t) => t.key === incoming);
    if (idx >= 0) setTab(idx);
  }, [location.state?.tab]);

  const [currentUser,       setCurrentUser]       = useState(null);
  const [forAssignmentReqs, setForAssignmentReqs] = useState([]);
  const [assignedReqs,      setAssignedReqs]      = useState([]);
  const [historyReqs,       setHistoryReqs]       = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState("");

  // ── Filters ──
  const [semesters,        setSemesters]        = useState([]);
  const [activeSemesterId, setActiveSemesterId] = useState("all");
  const [allStaffers,      setAllStaffers]      = useState([]);
  const [stafferFilter,    setStafferFilter]    = useState("all");
  const [filterOpen,       setFilterOpen]       = useState(false);
  const [semRange,         setSemRange]         = useState(null);

  // ── Highlight ──
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";

  // ── Assignment dialog ──
  const [selectedRequest,  setSelectedRequest]  = useState(null);
  const [staffers,         setStaffers]         = useState([]);
  const [staffersLoading,  setStaffersLoading]  = useState(false);
  const [selectedStaffers, setSelectedStaffers] = useState([]);
  const [assignLoading,    setAssignLoading]    = useState(false);
  const [assignError,      setAssignError]      = useState("");
  const [isWeekend,        setIsWeekend]        = useState(false);
  const [alreadyAssigned,  setAlreadyAssigned]  = useState([]);
  const [submitLoading,    setSubmitLoading]    = useState(false);

  // ── Submit for Approval confirmation ──
  const [confirmRequest, setConfirmRequest] = useState(null);

  // ── Load user ──
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("id, full_name, role, section, division")
        .eq("id", user.id).single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  // ── Load semesters ──
  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase
        .from("semesters").select("id, name, label, start_date, end_date, is_active")
        .order("start_date", { ascending: false });
      setSemesters(data || []);
    }
    loadSemesters();
  }, []);

  // ── Load section staffers for filter dropdown ──
  useEffect(() => {
    if (!currentUser?.section) return;
    async function loadAllStaffers() {
      const { data } = await supabase
        .from("profiles").select("id, full_name, avatar_url")
        .eq("section", currentUser.section).eq("is_active", true);
      setAllStaffers(data || []);
    }
    loadAllStaffers();
  }, [currentUser]);

  // ── Resolve semester date range ──
  useEffect(() => {
    if (!activeSemesterId || activeSemesterId === "all") { setSemRange(null); return; }
    const sem = semesters.find((s) => s.id === activeSemesterId);
    setSemRange(sem ? { start_date: sem.start_date, end_date: sem.end_date } : null);
  }, [activeSemesterId, semesters]);

  // ── Load all requests ──
  const loadAll = useCallback(async () => {
    if (!currentUser?.section) return;
    setLoading(true); setError("");
    try {
      const baseSelect = `
        id, title, description, event_date, from_time, to_time,
        venue, services, status, contact_person, contact_info,
        file_url, forwarded_sections, forwarded_at, submitted_at,
        client_type:client_type_id ( id, name ),
        entity:client_entities ( id, name ),
        coverage_assignments (
          id, status, assigned_to,
          staffer:assigned_to ( id, full_name, section, role, avatar_url )
        )
      `;
      const [allForwarded, assignedAndApproval, history] = await Promise.all([
        supabase.from("coverage_requests").select(baseSelect)
          .in("status", ["Forwarded", "Assigned", "For Approval"])
          .contains("forwarded_sections", [currentUser.section])
          .order("forwarded_at", { ascending: false }),
        supabase.from("coverage_requests").select(baseSelect)
          .in("status", ["Assigned", "For Approval"])
          .contains("forwarded_sections", [currentUser.section])
          .order("event_date", { ascending: true }),
        supabase.from("coverage_requests").select(baseSelect)
          .in("status", ["Approved", "Coverage Complete", "Completed", "No-show", "Declined"])
          .contains("forwarded_sections", [currentUser.section])
          .order("event_date", { ascending: false }),
      ]);
      if (allForwarded.error)        throw allForwarded.error;
      if (assignedAndApproval.error) throw assignedAndApproval.error;
      if (history.error)             throw history.error;

      const mySection     = currentUser.section;
      const forwardedData = allForwarded.data || [];

      const forAssignRows = forwardedData.filter((req) => {
        if (req.status !== "Forwarded") return false;
        return !(req.coverage_assignments || []).some((a) => a.staffer?.section === mySection);
      });

      const forwardedButMySecDone = forwardedData.filter((req) => {
        if (req.status !== "Forwarded") return false;
        return (req.coverage_assignments || []).some((a) => a.staffer?.section === mySection);
      });

      const assignedMap = new Map();
      [...forwardedButMySecDone, ...(assignedAndApproval.data || [])].forEach((r) => assignedMap.set(r.id, r));
      const assignedRows = Array.from(assignedMap.values()).sort(
        (a, b) => new Date(a.event_date) - new Date(b.event_date)
      );

      setForAssignmentReqs(forAssignRows);
      setAssignedReqs(assignedRows);
      setHistoryReqs(history.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { if (currentUser) loadAll(); }, [currentUser, loadAll]);

  // ── Load staffers for assignment dialog ──
  useEffect(() => {
    if (!selectedRequest || !currentUser?.section) return;
    async function loadStaffers() {
      setStaffersLoading(true); setStaffers([]); setSelectedStaffers([]);
      const eventDate = selectedRequest.event_date;
      const weekend   = isWeekendDate(eventDate);
      setIsWeekend(weekend);
      const dutyDay = jsDateToDutyDay(eventDate);

      const { data: existingAssignments } = await supabase
        .from("coverage_assignments")
        .select("assigned_to, profiles:assigned_to ( full_name )")
        .eq("request_id", selectedRequest.id).eq("section", currentUser.section);
      setAlreadyAssigned(existingAssignments || []);

      const { data: semester } = await supabase
        .from("semesters").select("id").eq("is_active", true).single();
      const { data: allProfiles } = await supabase
        .from("profiles").select("id, full_name, section, role, avatar_url")
        .eq("section", currentUser.section).eq("is_active", true);

      if (!allProfiles || allProfiles.length === 0) {
        setStaffers([]); setStaffersLoading(false); return;
      }

      let eligibleProfiles = allProfiles;
      if (!weekend && dutyDay !== null && semester?.id) {
        const { data: dutySchedules } = await supabase
          .from("duty_schedules").select("staffer_id")
          .eq("semester_id", semester.id).eq("duty_day", dutyDay);
        const eligibleIds = new Set((dutySchedules || []).map((d) => d.staffer_id));
        eligibleProfiles = allProfiles.filter((p) => eligibleIds.has(p.id));
      }

      let assignmentCounts = {};
      if (eligibleProfiles.length > 0) {
        const ids = eligibleProfiles.map((p) => p.id);
        const { data: assignments } = await supabase
          .from("coverage_assignments").select("assigned_to").in("assigned_to", ids);
        (assignments || []).forEach((a) => {
          assignmentCounts[a.assigned_to] = (assignmentCounts[a.assigned_to] || 0) + 1;
        });
      }

      setStaffers(
        eligibleProfiles
          .map((p) => ({ ...p, assignmentCount: assignmentCounts[p.id] || 0 }))
          .sort((a, b) => a.assignmentCount - b.assignmentCount)
      );
      setStaffersLoading(false);
    }
    loadStaffers();
  }, [selectedRequest, currentUser]);

  // ── Filter logic ──
  const applyFilters = useCallback((reqs) => {
    let filtered = reqs;
    if (semRange) {
      const start = new Date(semRange.start_date);
      const end   = new Date(semRange.end_date);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => {
        if (!r.event_date) return false;
        const d = new Date(r.event_date);
        return d >= start && d <= end;
      });
    }
    if (stafferFilter !== "all") {
      filtered = filtered.filter((r) =>
        (r.coverage_assignments || []).some(
          (a) => a.assigned_to === stafferFilter && a.staffer?.section === currentUser?.section
        )
      );
    }
    return filtered;
  }, [semRange, stafferFilter, currentUser]);

  const activeFilterCount = (activeSemesterId !== "all" ? 1 : 0) + (stafferFilter !== "all" ? 1 : 0);

  const counts = useMemo(() => ({
    "for-assignment": applyFilters(forAssignmentReqs).length,
    "assigned":       applyFilters(assignedReqs).length,
    "history":        applyFilters(historyReqs).length,
  }), [applyFilters, forAssignmentReqs, assignedReqs, historyReqs]);

  const getPaxForSection = (request) => {
    if (!currentUser?.section || !request?.services) return "—";
    return request.services[SECTION_SERVICE_MAP[currentUser.section]] || "—";
  };

  // ── Assign handler ──
  const handleAssign = async () => {
    if (selectedStaffers.length === 0) { setAssignError("Please select at least one staffer."); return; }
    setAssignLoading(true); setAssignError("");
    try {
      const assignments = selectedStaffers.map((stafferId) => ({
        request_id:  selectedRequest.id,
        assigned_to: stafferId,
        assigned_by: currentUser.id,
        section:     currentUser.section,
      }));
      const { error: assignErr } = await supabase.from("coverage_assignments").insert(assignments);
      if (assignErr) throw assignErr;

      const forwardedSections = selectedRequest.forwarded_sections || [];
      let allAssigned = false;
      if (forwardedSections.length === 0) {
        allAssigned = true;
      } else {
        const { data: existing } = await supabase
          .from("coverage_assignments").select("section").eq("request_id", selectedRequest.id);
        const assignedSections = new Set((existing || []).map((a) => a.section));
        allAssigned = forwardedSections.every((s) => assignedSections.has(s));
      }
      if (allAssigned) {
        await supabase.from("coverage_requests").update({ status: "Assigned" }).eq("id", selectedRequest.id);
      }
      setSelectedRequest(null);
      loadAll();
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  // ── Submit for Approval handler ──
  const handleSubmitForApproval = async (requestId) => {
    setSubmitLoading(true);
    try {
      const { error } = await supabase
        .from("coverage_requests").update({ status: "For Approval" }).eq("id", requestId);
      if (error) throw error;
      setConfirmRequest(null);
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitLoading(false);
    }
  };

  const borderColor = isDark ? "#2e2e2e" : "#e0e0e0";

  const dataGridSx = {
    border: "none", fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem",
    backgroundColor: "background.paper", color: "text.primary",
    "& .MuiDataGrid-virtualScroller":  { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay":          { backgroundColor: "background.paper" },
    "& .MuiDataGrid-cell":            { outline: "none", color: "text.primary", borderColor },
    "& .MuiDataGrid-columnHeaders":   { backgroundColor: isDark ? "#2a2a2a" : "#fafafa", color: "text.primary", borderColor },
    "& .MuiDataGrid-footerContainer": { backgroundColor: isDark ? "#1e1e1e" : "#fff", borderColor },
    "& .MuiDataGrid-row:hover":       { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":     { color: "text.secondary" },
    "& .highlighted-row": {
      backgroundColor: isDark ? "rgba(245,197,43,0.13)" : "rgba(245,197,43,0.18)",
      "&:hover": { backgroundColor: isDark ? "rgba(245,197,43,0.2)" : "rgba(245,197,43,0.28)" },
    },
  };

  const selectedSemLabel    = semesters.find((s) => s.id === activeSemesterId)?.label
                           || semesters.find((s) => s.id === activeSemesterId)?.name;
  const selectedStafferName = allStaffers.find((s) => s.id === stafferFilter)?.full_name;

  if (!currentUser) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* ── Tabs row + filter icon ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {TABS.map((t, idx) => (
            <Box key={t.key} onClick={() => setTab(idx)}
              sx={{
                px: 2, py: 0.75, borderRadius: 1.5, cursor: "pointer",
                fontSize: "0.82rem", fontWeight: tab === idx ? 700 : 500,
                border: "1px solid",
                borderColor: tab === idx ? "#f5c52b" : "divider",
                backgroundColor: tab === idx ? (isDark ? "#2a2200" : "#fffbeb") : "background.paper",
                color: tab === idx ? "#d97706" : "text.secondary",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", gap: 1,
                "&:hover": { borderColor: "#f5c52b", color: "#d97706", backgroundColor: isDark ? "#2a2200" : "#fffbeb" },
              }}
            >
              {t.label}
              {counts[t.key] > 0 && (
                <Box sx={{ minWidth: 18, height: 18, borderRadius: 9, px: 0.5, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: tab === idx ? "#f5c52b" : (isDark ? "#333" : "#f3f4f6") }}>
                  <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, lineHeight: 1, color: tab === idx ? "#111827" : "text.secondary" }}>
                    {counts[t.key]}
                  </Typography>
                </Box>
              )}
            </Box>
          ))}
        </Box>

        <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
          <Box sx={{ position: "relative" }}>
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
              <Paper elevation={4} sx={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 260, zIndex: 1300, borderRadius: 2, overflow: "hidden", border: `1px solid ${borderColor}`, backgroundColor: "background.paper" }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${borderColor}` }}>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "text.primary" }}>Filter Requests</Typography>
                </Box>
                <Box sx={{ px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ fontSize: "0.82rem" }}>Semester</InputLabel>
                    <Select value={activeSemesterId} label="Semester" onChange={(e) => setActiveSemesterId(e.target.value)} sx={{ fontSize: "0.82rem", borderRadius: 1.5 }}>
                      <MenuItem value="all" sx={{ fontSize: "0.82rem" }}>All Semesters</MenuItem>
                      {semesters.map((s) => (
                        <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.82rem" }}>{s.label || s.name}{s.is_active ? " (Active)" : ""}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <FormControl size="small" fullWidth>
                    <InputLabel sx={{ fontSize: "0.82rem" }}>Staff</InputLabel>
                    <Select value={stafferFilter} label="Staff" onChange={(e) => setStafferFilter(e.target.value)} sx={{ fontSize: "0.82rem", borderRadius: 1.5 }}>
                      <MenuItem value="all" sx={{ fontSize: "0.82rem" }}>All Staffers</MenuItem>
                      {allStaffers.map((s) => (
                        <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.82rem" }}>{s.full_name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>
                {activeFilterCount > 0 && (
                  <>
                    <Divider sx={{ borderColor }} />
                    <Box sx={{ px: 2, py: 1.2 }}>
                      <Button size="small" fullWidth onClick={() => { setActiveSemesterId("all"); setStafferFilter("all"); }} sx={{ textTransform: "none", fontSize: "0.78rem", color: "text.secondary", borderRadius: 1.5 }}>
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

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
          {activeSemesterId !== "all" && (
            <Chip label={selectedSemLabel} size="small" onDelete={() => setActiveSemesterId("all")}
              sx={{ fontSize: "0.75rem", backgroundColor: isDark ? "#2a2200" : "#fffbeb", color: "#d97706", border: "1px solid #f5c52b", "& .MuiChip-deleteIcon": { color: "#d97706" } }} />
          )}
          {stafferFilter !== "all" && (
            <Chip label={selectedStafferName} size="small" onDelete={() => setStafferFilter("all")}
              sx={{ fontSize: "0.75rem", backgroundColor: isDark ? "#2a2200" : "#fffbeb", color: "#d97706", border: "1px solid #f5c52b", "& .MuiChip-deleteIcon": { color: "#d97706" } }} />
          )}
        </Box>
      )}

      {/* ── Tab description ── */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
          {tab === 0 && `Requests forwarded to your section (${currentUser.section}). Assign staffers, then submit for admin approval.`}
          {tab === 1 && `Requests with staffers assigned from your section (${currentUser.section}). Submit ready ones for admin approval.`}
          {tab === 2 && `Completed and past coverage requests handled by your section (${currentUser.section}).`}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

      {/* ── Tab content ── */}
      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <>
            {tab === 0 && (
              <ForAssignmentTab
                rows={applyFilters(forAssignmentReqs)}
                highlight={highlight}
                currentUser={currentUser}
                isDark={isDark}
                dataGridSx={dataGridSx}
                getPaxForSection={getPaxForSection}
                onAssign={(req) => { setAssignError(""); setSelectedRequest(req); }}
              />
            )}
            {tab === 1 && (
              <AssignedTab
                rows={applyFilters(assignedReqs)}
                highlight={highlight}
                currentUser={currentUser}
                isDark={isDark}
                dataGridSx={dataGridSx}
                submitLoading={submitLoading}
                onRequestConfirm={(row) => setConfirmRequest(row)}
              />
            )}
            {tab === 2 && (
              <HistoryTab
                rows={applyFilters(historyReqs)}
                highlight={highlight}
                currentUser={currentUser}
                isDark={isDark}
                dataGridSx={dataGridSx}
              />
            )}
          </>
        )}
      </Box>

      {/* ── Assignment dialog ── */}
      <AssignmentDialog
        open={!!selectedRequest}
        request={selectedRequest}
        onClose={() => !assignLoading && setSelectedRequest(null)}
        currentUser={currentUser}
        isDark={isDark}
        staffers={staffers}
        staffersLoading={staffersLoading}
        selectedStaffers={selectedStaffers}
        setSelectedStaffers={setSelectedStaffers}
        alreadyAssigned={alreadyAssigned}
        isWeekend={isWeekend}
        assignLoading={assignLoading}
        assignError={assignError}
        getPaxForSection={getPaxForSection}
        onAssign={handleAssign}
      />

      {/* ── Submit for Approval confirmation dialog ── */}
      <SubmitConfirmDialog
        open={!!confirmRequest}
        request={confirmRequest}
        isDark={isDark}
        loading={submitLoading}
        onCancel={() => !submitLoading && setConfirmRequest(null)}
        onConfirm={() => handleSubmitForApproval(confirmRequest.id)}
      />
    </Box>
  );
}

// ── Submit Confirmation Dialog ─────────────────────────────────────────────────
function SubmitConfirmDialog({ open, request, isDark, loading, onCancel, onConfirm }) {
  if (!request) return null;
  const borderColor = isDark ? "#2e2e2e" : "#e0e0e0";

  const stafferNames = (request.staffers || [])
    .map((a) => a.staffer?.full_name)
    .filter(Boolean);

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onCancel()}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2.5,
          backgroundColor: "background.paper",
          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.1)",
        },
      }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${borderColor}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 34, height: 34, borderRadius: 1.5, backgroundColor: isDark ? "#0d2137" : "#e0f2fe", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <CheckCircleOutlinedIcon sx={{ fontSize: 18, color: "#0369a1" }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.92rem", color: "text.primary", lineHeight: 1.3 }}>
              Submit for Approval
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}>
              This will notify the admin for final review.
            </Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onCancel} disabled={loading} sx={{ color: "text.secondary", mt: -0.5 }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ p: 1.75, borderRadius: 1.5, border: `1px solid ${borderColor}`, backgroundColor: isDark ? "#1a1a1a" : "#fafafa" }}>
          <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "text.primary", mb: 0.5 }}>
            {request.title}
          </Typography>
          {request.eventDate && request.eventDate !== "—" && (
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>
              Event date: {request.eventDate}
            </Typography>
          )}
        </Box>

        {stafferNames.length > 0 && (
          <Box>
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>
              Staffers being submitted
            </Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {stafferNames.map((name, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: 1, backgroundColor: isDark ? "#0a1a0a" : "#dcfce7", border: "1px solid #15803d30" }}>
                  <Avatar sx={{ width: 20, height: 20, fontSize: "0.6rem", fontWeight: 700, backgroundColor: "#a5d6a7", color: "#212121" }}>
                    {getInitials(name)}
                  </Avatar>
                  <Typography sx={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 500 }}>{name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1, p: 1.5, borderRadius: 1.5, backgroundColor: isDark ? "#1a1200" : "#fffbeb", border: `1px solid ${isDark ? "#3a2800" : "#fde68a"}` }}>
          <WarningAmberOutlinedIcon sx={{ fontSize: 16, color: "#d97706", flexShrink: 0, mt: 0.1 }} />
          <Typography sx={{ fontSize: "0.78rem", color: isDark ? "#fbbf24" : "#92400e", lineHeight: 1.5 }}>
            Once submitted, staffers will be locked in and the admin will be notified for final approval. This cannot be undone.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 3, py: 2, borderTop: `1px solid ${borderColor}`, display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "#161616" : "#fafafa" }}>
        <Button size="small" onClick={onCancel} disabled={loading}
          sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary", borderRadius: 1.5 }}>
          Cancel
        </Button>
        <Button variant="contained" size="small" onClick={onConfirm} disabled={loading}
          startIcon={loading ? null : <CheckCircleOutlinedIcon sx={{ fontSize: 15 }} />}
          sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, borderRadius: 1.5, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}>
          {loading ? <CircularProgress size={16} sx={{ color: "#111827" }} /> : "Confirm Submission"}
        </Button>
      </Box>
    </Dialog>
  );
}

// ── For Assignment Tab ─────────────────────────────────────────────────────────
function ForAssignmentTab({ rows, highlight, currentUser, isDark, dataGridSx, getPaxForSection, onAssign }) {
  const mappedRows = rows.map((req) => {
    const myAssignments    = (req.coverage_assignments || []).filter((a) => a.staffer?.section === currentUser?.section);
    const allSections      = req.forwarded_sections || [];
    const otherSections    = allSections.filter((s) => s !== currentUser?.section);
    const assignedSections = new Set((req.coverage_assignments || []).map((a) => a.staffer?.section).filter(Boolean));
    const pendingOthers    = otherSections.filter((s) => !assignedSections.has(s));
    return {
      id:            req.id,
      requestTitle:  req.title,
      client:        req.entity?.name || "—",
      eventDate:     req.event_date ? new Date(req.event_date).toLocaleDateString() : "—",
      paxNeeded:     getPaxForSection(req),
      dateForwarded: req.forwarded_at ? new Date(req.forwarded_at).toLocaleDateString() : "—",
      myDone:        myAssignments.length > 0,
      pendingOthers,
      _raw:          req,
    };
  });

  const columns = [
    { field: "requestTitle",  headerName: "Event Title",    flex: 1.4, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "client",        headerName: "Client",         flex: 1,   renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "eventDate",     headerName: "Event Date",     flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    {
      field: "paxNeeded", headerName: "Pax Needed", flex: 0.7,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip label={`${p.value} pax`} size="small" sx={{ fontSize: "0.78rem", backgroundColor: isDark ? "#0d2137" : "#e3f2fd", color: "#1565c0", fontWeight: 500 }} />
        </Box>
      ),
    },
    { field: "dateForwarded", headerName: "Date Forwarded", flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    {
      field: "actions", headerName: "Action", flex: 1.3, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          {!p.row.myDone ? (
            <Button variant="outlined" size="small" onClick={() => onAssign(p.row._raw)} sx={{ textTransform: "none", fontSize: "0.78rem" }}>
              Assign
            </Button>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.3 }}>
              <Typography sx={{ fontSize: "0.75rem", color: "#15803d", fontWeight: 600 }}>✓ Your section assigned</Typography>
              {p.row.pendingOthers.length > 0 && (
                <Typography sx={{ fontSize: "0.7rem", color: "text.secondary" }}>Waiting: {p.row.pendingOthers.join(", ")}</Typography>
              )}
            </Box>
          )}
        </Box>
      ),
    },
  ];

  return (
    <DataGrid rows={mappedRows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick
      getRowClassName={(p) => highlight && p.row.requestTitle?.toLowerCase().includes(highlight) ? "highlighted-row" : ""}
      sx={dataGridSx}
    />
  );
}

// ── Assigned Tab ───────────────────────────────────────────────────────────────
function AssignedTab({ rows, highlight, currentUser, isDark, dataGridSx, submitLoading, onRequestConfirm }) {
  const mappedRows = rows.map((req) => {
    const sectionAssignments = (req.coverage_assignments || []).filter(
      (a) => a.staffer?.section === currentUser?.section
    );
    return {
      id:        req.id,
      title:     req.title,
      client:    req.entity?.name || "—",
      eventDate: req.event_date
        ? new Date(req.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—",
      venue:    req.venue || "—",
      status:   req.status,
      staffers: sectionAssignments,
    };
  });

  const columns = [
    { field: "title",     headerName: "Event Title", flex: 1.2, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "client",    headerName: "Client",      flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "eventDate", headerName: "Event Date",  flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "venue",     headerName: "Venue",       flex: 1,   renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    {
      field: "staffers", headerName: "Assigned Staffers", flex: 1.4, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%", flexWrap: "wrap" }}>
          {p.value.length === 0
            ? <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>—</Typography>
            : p.value.map((a) => {
                const url = getAvatarUrl(a.staffer?.avatar_url);
                return (
                  <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Avatar src={url} title={a.staffer?.full_name}
                      sx={{ width: 28, height: 28, fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#f5c52b", color: "#212121" }}>
                      {!url && getInitials(a.staffer?.full_name)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "text.primary", lineHeight: 1.2 }}>
                        {a.staffer?.full_name || "—"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.68rem", color: "text.secondary", lineHeight: 1.2 }}>
                        {a.staffer?.role || a.staffer?.section || "—"}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
          }
        </Box>
      ),
    },
    {
      field: "status", headerName: "Status", flex: 0.85,
      renderCell: (p) => {
        const cfg = STATUS_CONFIG[p.value] || { bg: "#f3f4f6", color: "#6b7280" };
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box sx={{ px: 1.25, py: 0.3, borderRadius: 1, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: cfg.color }}>
                {p.value}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "actions", headerName: "Action", flex: 1.4, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          {(p.row.status === "Assigned" || p.row.status === "Forwarded") && (
            <Button
              variant="contained" size="small"
              disabled={submitLoading}
              onClick={() => onRequestConfirm(p.row)}
              startIcon={<CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
              sx={{ textTransform: "none", fontSize: "0.78rem", fontWeight: 600, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}
            >
              Submit for Approval
            </Button>
          )}
          {p.row.status === "For Approval" && (
            <Typography sx={{ fontSize: "0.75rem", color: "#0369a1", fontStyle: "italic" }}>
              Awaiting admin sign-off
            </Typography>
          )}
        </Box>
      ),
    },
  ];

  return (
    <DataGrid rows={mappedRows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick
      getRowClassName={(p) => highlight && p.row.title?.toLowerCase().includes(highlight) ? "highlighted-row" : ""}
      sx={dataGridSx}
    />
  );
}

// ── History Tab ────────────────────────────────────────────────────────────────
function HistoryTab({ rows, highlight, currentUser, isDark, dataGridSx }) {
  const mappedRows = rows.map((req) => {
    const sectionAssignments = (req.coverage_assignments || []).filter(
      (a) => a.staffer?.section === currentUser?.section
    );
    return {
      id:        req.id,
      title:     req.title,
      client:    req.entity?.name || "—",
      eventDate: req.event_date
        ? new Date(req.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—",
      venue:    req.venue || "—",
      status:   req.status,
      staffers: sectionAssignments,
    };
  });

  const columns = [
    { field: "title",     headerName: "Event Title", flex: 1.3, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "client",    headerName: "Client",      flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "eventDate", headerName: "Event Date",  flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "venue",     headerName: "Venue",       flex: 1,   renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    {
      field: "staffers", headerName: "Staffers", flex: 1.4, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%", flexWrap: "wrap" }}>
          {p.value.length === 0
            ? <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>—</Typography>
            : p.value.map((a) => {
                const url = getAvatarUrl(a.staffer?.avatar_url);
                return (
                  <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 0.75, height: "100%" }}>
                    <Avatar src={url} title={a.staffer?.full_name}
                      sx={{ width: 32, height: 32, fontSize: "0.72rem", fontWeight: 700, backgroundColor: isDark ? "#333" : "#e5e7eb", color: "text.primary" }}>
                      {!url && getInitials(a.staffer?.full_name)}
                    </Avatar>
                    <Box>
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 500, color: "text.primary" }}>
                        {a.staffer?.full_name || "—"}
                      </Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary"}}>
                        {a.staffer?.role || a.staffer?.section || "—"}
                      </Typography>
                    </Box>
                  </Box>
                );
              })
          }
        </Box>
      ),
    },
    {
      field: "status", headerName: "Status", flex: 0.9,
      renderCell: (p) => {
        const cfg = STATUS_CONFIG[p.value] || { bg: "#f3f4f6", color: "#6b7280" };
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box sx={{ px: 1.25, py: 0.3, borderRadius: 1, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: cfg.color }}>
                {p.value}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
  ];

  return (
    <DataGrid rows={mappedRows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick
      getRowClassName={(p) => highlight && p.row.title?.toLowerCase().includes(highlight) ? "highlighted-row" : ""}
      sx={dataGridSx}
    />
  );
}

// ── Assignment Dialog ──────────────────────────────────────────────────────────
function AssignmentDialog({ open, request, onClose, currentUser, isDark, staffers, staffersLoading, selectedStaffers, setSelectedStaffers, alreadyAssigned, isWeekend, assignLoading, assignError, getPaxForSection, onAssign }) {
  if (!request) return null;
  const borderColor = isDark ? "#2e2e2e" : "#e0e0e0";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"
      PaperProps={{ sx: { borderRadius: 2, height: { md: "90vh" }, maxHeight: "95vh", backgroundColor: "background.paper", boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.08)" } }}>

      <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 3, height: 28, borderRadius: 1, backgroundColor: "#f5c52b", flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary", lineHeight: 1.3 }}>{request.title}</Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}>
              {request.forwarded_at
                ? `Forwarded ${new Date(request.forwarded_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : "Forwarded date unknown"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, backgroundColor: isDark ? "#1e0a2e" : "#f3e8ff", border: "1px solid #7c3aed30" }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#7c3aed", letterSpacing: "0.07em", textTransform: "uppercase" }}>{currentUser.section}</Typography>
          </Box>
          {isWeekend && (
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, backgroundColor: isDark ? "#1e1000" : "#fff7ed", border: "1px solid #c2410c30" }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#c2410c", letterSpacing: "0.07em", textTransform: "uppercase" }}>Weekend</Typography>
            </Box>
          )}
          <IconButton onClick={onClose} size="small" disabled={assignLoading} sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: { xs: "column", md: "row" }, overflow: { xs: "auto", md: "hidden" }, minHeight: 0 }}>
        <Box sx={{ flex: 1, px: 3, py: 3, overflowY: { xs: "visible", md: "auto" }, minWidth: 0 }}>
          <Section label="Event Information">
            <InfoGrid rows={[
              ["Event Title", request.title],
              ["Description", request.description],
              ["Date",        request.event_date || "—"],
              ["Time",        request.from_time && request.to_time ? `${request.from_time} – ${request.to_time}` : "—"],
              ["Venue",       request.venue || "—"],
            ]} />
          </Section>
          <Section label="Coverage Requirements">
            <Box sx={{ display: "inline-flex", px: 1.25, py: 0.5, borderRadius: 1, border: "1px solid", borderColor: isDark ? "#0d2137" : "#bfdbfe", backgroundColor: isDark ? "#0d2137" : "#eff6ff" }}>
              <Typography sx={{ fontSize: "0.8rem", color: "#1565c0", fontWeight: 600 }}>
                {getPaxForSection(request)} pax
                <Typography component="span" sx={{ fontSize: "0.78rem", color: "text.secondary", fontWeight: 400 }}>{" "}for {currentUser.section}</Typography>
              </Typography>
            </Box>
          </Section>
          <Section label="Client Details">
            <InfoGrid rows={[
              ["Organization",   request.entity?.name || "—"],
              ["Contact Person", request.contact_person || "—"],
              ["Contact Info",   request.contact_info || "—"],
            ]} />
          </Section>
          <Section label="Attachment">
            {request.file_url ? (
              <Box onClick={() => openFile(request.file_url)} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, cursor: "pointer", color: "#1976d2", "&:hover": { textDecoration: "underline" } }}>
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 15 }} />
                <Typography sx={{ fontSize: "0.85rem" }}>{getFileName(request.file_url)}</Typography>
              </Box>
            ) : (
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>No file attached</Typography>
            )}
          </Section>
          {alreadyAssigned.length > 0 && (
            <Section label="Already Assigned">
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                {alreadyAssigned.map((a, i) => (
                  <Box key={i} sx={{ px: 1.25, py: 0.5, borderRadius: 1, backgroundColor: isDark ? "#0a1a0a" : "#dcfce7", border: "1px solid #15803d30" }}>
                    <Typography sx={{ fontSize: "0.78rem", color: "#15803d", fontWeight: 500 }}>{a.profiles?.full_name || "—"}</Typography>
                  </Box>
                ))}
              </Box>
            </Section>
          )}
        </Box>

        <Divider orientation="horizontal" flexItem sx={{ display: { xs: "block", md: "none" } }} />
        <Divider orientation="vertical"   flexItem sx={{ display: { xs: "none",  md: "flex" } }} />

        <Box sx={{ width: { xs: "100%", md: 290 }, flexShrink: 0, px: 2.5, py: 3, backgroundColor: isDark ? "#161616" : "#fafafa", overflowY: { xs: "visible", md: "auto" }, display: "flex", flexDirection: "column", gap: 1.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
            <PersonAddOutlinedIcon sx={{ fontSize: 13, color: "#f5c52b" }} />
            <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase" }}>Select Staffers</Typography>
          </Box>
          <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.6 }}>
            {isWeekend
              ? "Weekend event — all staffers shown, sorted by least assignments."
              : `Showing staffers on duty for ${new Date(request.event_date).toLocaleDateString("en-US", { weekday: "long" })}, sorted by least assignments.`}
          </Typography>
          {assignError && <Alert severity="error" sx={{ borderRadius: 1.5, fontSize: "0.78rem" }}>{assignError}</Alert>}
          {staffersLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={18} sx={{ color: "#f5c52b" }} />
            </Box>
          ) : staffers.length === 0 ? (
            <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", textAlign: "center", py: 2 }}>No eligible staffers found for this event day.</Typography>
          ) : (
            <FormGroup sx={{ gap: 1 }}>
              {staffers.map((staffer) => {
                const isSelected = selectedStaffers.includes(staffer.id);
                const avatarUrl  = getAvatarUrl(staffer.avatar_url);
                return (
                  <Box key={staffer.id}
                    onClick={() => setSelectedStaffers((prev) =>
                      prev.includes(staffer.id) ? prev.filter((id) => id !== staffer.id) : [...prev, staffer.id]
                    )}
                    sx={{ display: "flex", alignItems: "center", gap: 1.5, p: 1.25, borderRadius: 1.5, border: "1px solid", borderColor: isSelected ? "#f5c52b" : "divider", backgroundColor: isSelected ? (isDark ? "#1e1800" : "#fffbeb") : "background.paper", cursor: "pointer", transition: "border-color 0.15s, background-color 0.15s", "&:hover": { borderColor: "#f5c52b" } }}
                  >
                    <Avatar
                      src={avatarUrl}
                      sx={{ width: 32, height: 32, fontSize: "0.72rem", fontWeight: 700, backgroundColor: isSelected ? "#f5c52b" : (isDark ? "#333" : "#e5e7eb"), color: isSelected ? "#111827" : "text.secondary" }}
                    >
                      {!avatarUrl && getInitials(staffer.full_name)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Typography sx={{ fontSize: "0.88rem", fontWeight: 500, color: "text.primary" }}>{staffer.full_name}</Typography>
                      <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                        {staffer.assignmentCount === 0 ? "No assignments yet" : `${staffer.assignmentCount} assignment${staffer.assignmentCount > 1 ? "s" : ""}`}
                      </Typography>
                    </Box>
                    <Checkbox checked={isSelected} size="small" sx={{ p: 0, color: "divider", "&.Mui-checked": { color: "#f5c52b" } }} />
                  </Box>
                );
              })}
            </FormGroup>
          )}
          {selectedStaffers.length > 0 && (
            <Box sx={{ p: 1.25, borderRadius: 1.5, backgroundColor: isDark ? "#1e1800" : "#fffbeb", border: "1px solid #f5c52b" }}>
              <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#d97706" }}>
                {selectedStaffers.length} staffer{selectedStaffers.length > 1 ? "s" : ""} selected
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <Box sx={{ px: 3, py: 1.75, borderTop: "1px solid", borderColor: "divider", display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "#161616" : "#fafafa" }}>
        <Button onClick={onClose} disabled={assignLoading} size="small" sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}>Cancel</Button>
        <Button variant="contained" onClick={onAssign} disabled={assignLoading} size="small"
          sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}>
          {assignLoading ? <CircularProgress size={16} sx={{ color: "#111827" }} /> : "Confirm Assignment"}
        </Button>
      </Box>
    </Dialog>
  );
}

// ── Shared helpers ─────────────────────────────────────────────────────────────
function Section({ label, children }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1, pb: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function InfoGrid({ rows }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 0.6, columnGap: 1, alignItems: "start" }}>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", pt: 0.2 }}>{label}</Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.5 }}>{value || "—"}</Typography>
        </React.Fragment>
      ))}
    </Box>
  );
}

function CellText({ children, secondary }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography sx={{ fontSize: "0.9rem", color: secondary ? "text.secondary" : "text.primary" }}>
        {children}
      </Typography>
    </Box>
  );
}