// src/pages/section_head/SecHeadAssignmentManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box, Typography, CircularProgress, Dialog, DialogContent,
  Avatar, IconButton, Alert, Checkbox, FormGroup, useTheme,
  ClickAwayListener, GlobalStyles,
} from "@mui/material";
import { DataGrid }                from "@mui/x-data-grid";
import { useSearchParams, useLocation } from "react-router-dom";
import CloseIcon                   from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PersonAddOutlinedIcon       from "@mui/icons-material/PersonAddOutlined";
import CheckCircleOutlinedIcon     from "@mui/icons-material/CheckCircleOutlined";
import FilterListIcon              from "@mui/icons-material/FilterList";
import WarningAmberOutlinedIcon    from "@mui/icons-material/WarningAmberOutlined";
import ChevronRightIcon            from "@mui/icons-material/ChevronRight";
import { supabase }                from "../../lib/supabaseClient";
import { getAvatarUrl }            from "../../components/common/UserAvatar";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD        = "#F5C52B";
const GOLD_08     = "rgba(245,197,43,0.08)";
const GOLD_18     = "rgba(245,197,43,0.18)";
const CHARCOAL    = "#353535";
const BORDER      = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG    = "rgba(53,53,53,0.03)";
const dm          = "'DM Sans', sans-serif";

// ── Config ────────────────────────────────────────────────────────────────────
const SECTION_SERVICE_MAP = {
  News:            "News Article",
  Photojournalism: "Photo Documentation",
  Videojournalism: "Video Documentation",
};

const STATUS_CFG = {
  Forwarded:           { dot: "#a855f7", color: "#7c3aed", bg: "#f5f3ff" },
  Assigned:            { dot: "#f97316", color: "#c2410c", bg: "#fff7ed" },
  "For Approval":      { dot: "#38bdf8", color: "#0369a1", bg: "#f0f9ff" },
  "Coverage Complete": { dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
  Approved:            { dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
  Declined:            { dot: "#ef4444", color: "#dc2626", bg: "#fef2f2" },
  "No-show":           { dot: "#f59e0b", color: "#b45309", bg: "#fffbeb" },
  Completed:           { dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
};

const TABS = [
  { label: "For Assignment", key: "for-assignment" },
  { label: "Assigned",       key: "assigned"       },
  { label: "History",        key: "history"        },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status, isDark }) {
  const cfg = STATUS_CFG[status] || { dot: "#9ca3af", color: "#6b7280", bg: "#f9fafb" };
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.55, px: 1.1, py: 0.3, borderRadius: "6px", backgroundColor: isDark ? `${cfg.dot}18` : cfg.bg }}>
      <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: cfg.dot, flexShrink: 0 }} />
      <Typography sx={{ fontFamily: dm, fontSize: "0.66rem", fontWeight: 700, color: isDark ? cfg.dot : cfg.color, letterSpacing: "0.04em" }}>
        {status}
      </Typography>
    </Box>
  );
}

// ── Column menu GlobalStyles ──────────────────────────────────────────────────
// Confirmed DOM structure from DevTools:
//   <div class="MuiPaper-root ...">           ← portalled to <body>
//     <ul class="MuiDataGrid-menuList ...">
//       <li class="MuiMenuItem-root ...">
//         <div class="MuiListItemIcon-root">
//         <div class="MuiListItemText-root">
//           <span class="MuiListItemText-primary">
//       <hr class="MuiDivider-root ...">
//
// Paper is portalled directly to <body> with no DataGrid ancestor.
// :has(> .MuiDataGrid-menuList) scopes the Paper rule to this menu only.
function ColumnMenuStyles({ isDark, border }) {
  const paperBg   = isDark ? "#1e1e1e" : "#ffffff";
  const shadow    = isDark ? "0 12px 40px rgba(0,0,0,0.55)" : "0 4px 24px rgba(53,53,53,0.12)";
  const textColor = isDark ? "rgba(255,255,255,0.85)" : CHARCOAL;
  const iconColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(53,53,53,0.4)";
  const hoverBg   = isDark ? "rgba(245,197,43,0.08)" : "rgba(245,197,43,0.07)";

  return (
    <GlobalStyles styles={{
      // Paper wrapping the menu list
      ".MuiPaper-root:has(> .MuiDataGrid-menuList)": {
        borderRadius:    "10px !important",
        border:          `1px solid ${border} !important`,
        backgroundColor: `${paperBg} !important`,
        boxShadow:       `${shadow} !important`,
        minWidth:        "180px !important",
        overflow:        "hidden !important",
      },
      // The <ul> list
      ".MuiDataGrid-menuList": {
        padding: "4px 0 !important",
      },
      // Each <li> item
      ".MuiDataGrid-menuList .MuiMenuItem-root": {
        fontFamily:  `${dm} !important`,
        fontSize:    "0.78rem !important",
        fontWeight:  "500 !important",
        color:       `${textColor} !important`,
        padding:     "7px 14px !important",
        minHeight:   "unset !important",
        gap:         "10px !important",
        transition:  "background-color 0.12s, color 0.12s !important",
      },
      // Item hover state
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover": {
        backgroundColor: `${hoverBg} !important`,
        color:           "#b45309 !important",
      },
      // Icon wrapper
      ".MuiDataGrid-menuList .MuiMenuItem-root .MuiListItemIcon-root": {
        minWidth:   "unset !important",
        color:      `${iconColor} !important`,
        transition: "color 0.12s !important",
      },
      // SVG icon
      ".MuiDataGrid-menuList .MuiMenuItem-root .MuiSvgIcon-root": {
        fontSize: "1rem !important",
        color:    `${iconColor} !important`,
      },
      // Icon on hover
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiListItemIcon-root": {
        color: "#b45309 !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiSvgIcon-root": {
        color: "#b45309 !important",
      },
      // Label text
      ".MuiDataGrid-menuList .MuiListItemText-primary": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.78rem !important",
        fontWeight: "500 !important",
      },
      // Divider <hr>
      ".MuiDataGrid-menuList .MuiDivider-root": {
        borderColor: `${border} !important`,
        margin:      "4px 12px !important",
      },
    }} />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function SecHeadAssignmentManagement() {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === "dark";
  const border   = isDark ? BORDER_DARK : BORDER;
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

  const [semesters,        setSemesters]        = useState([]);
  const [activeSemesterId, setActiveSemesterId] = useState("all");
  const [allStaffers,      setAllStaffers]      = useState([]);
  const [stafferFilter,    setStafferFilter]    = useState("all");
  const [filterOpen,       setFilterOpen]       = useState(false);
  const [semRange,         setSemRange]         = useState(null);

  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";

  const [selectedRequest,  setSelectedRequest]  = useState(null);
  const [staffers,         setStaffers]         = useState([]);
  const [staffersLoading,  setStaffersLoading]  = useState(false);
  const [selectedStaffers, setSelectedStaffers] = useState([]);
  const [assignLoading,    setAssignLoading]    = useState(false);
  const [assignError,      setAssignError]      = useState("");
  const [isWeekend,        setIsWeekend]        = useState(false);
  const [alreadyAssigned,  setAlreadyAssigned]  = useState([]);
  const [submitLoading,    setSubmitLoading]    = useState(false);
  const [confirmRequest,   setConfirmRequest]   = useState(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase.from("profiles").select("id, full_name, role, section, division").eq("id", user.id).single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase.from("semesters").select("id, name, label, start_date, end_date, is_active").order("start_date", { ascending: false });
      setSemesters(data || []);
    }
    loadSemesters();
  }, []);

  useEffect(() => {
    if (!currentUser?.section) return;
    async function loadAllStaffers() {
      const { data } = await supabase.from("profiles").select("id, full_name, avatar_url").eq("section", currentUser.section).eq("is_active", true);
      setAllStaffers(data || []);
    }
    loadAllStaffers();
  }, [currentUser]);

  useEffect(() => {
    if (!activeSemesterId || activeSemesterId === "all") { setSemRange(null); return; }
    const sem = semesters.find((s) => s.id === activeSemesterId);
    setSemRange(sem ? { start_date: sem.start_date, end_date: sem.end_date } : null);
  }, [activeSemesterId, semesters]);

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
        supabase.from("coverage_requests").select(baseSelect).in("status", ["Forwarded", "Assigned", "For Approval"]).contains("forwarded_sections", [currentUser.section]).order("forwarded_at", { ascending: false }),
        supabase.from("coverage_requests").select(baseSelect).in("status", ["Assigned", "For Approval"]).contains("forwarded_sections", [currentUser.section]).order("event_date", { ascending: true }),
        supabase.from("coverage_requests").select(baseSelect).in("status", ["Approved", "Coverage Complete", "Completed", "No-show", "Declined"]).contains("forwarded_sections", [currentUser.section]).order("event_date", { ascending: false }),
      ]);
      if (allForwarded.error || assignedAndApproval.error || history.error)
        throw allForwarded.error || assignedAndApproval.error || history.error;

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
      const assignedRows = Array.from(assignedMap.values()).sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

      setForAssignmentReqs(forAssignRows);
      setAssignedReqs(assignedRows);
      setHistoryReqs(history.data || []);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [currentUser]);

  useEffect(() => { if (currentUser) loadAll(); }, [currentUser, loadAll]);

  useEffect(() => {
    if (!selectedRequest || !currentUser?.section) return;
    async function loadStaffers() {
      setStaffersLoading(true); setStaffers([]); setSelectedStaffers([]);
      const eventDate = selectedRequest.event_date;
      const weekend   = isWeekendDate(eventDate);
      setIsWeekend(weekend);
      const dutyDay = jsDateToDutyDay(eventDate);

      const { data: existingAssignments } = await supabase.from("coverage_assignments").select("assigned_to, profiles:assigned_to ( full_name )").eq("request_id", selectedRequest.id).eq("section", currentUser.section);
      setAlreadyAssigned(existingAssignments || []);

      const { data: semester } = await supabase.from("semesters").select("id").eq("is_active", true).single();
      const { data: allProfiles } = await supabase.from("profiles").select("id, full_name, section, role, avatar_url").eq("section", currentUser.section).eq("is_active", true);

      if (!allProfiles || allProfiles.length === 0) { setStaffers([]); setStaffersLoading(false); return; }

      let eligibleProfiles = allProfiles;
      if (!weekend && dutyDay !== null && semester?.id) {
        const { data: dutySchedules } = await supabase.from("duty_schedules").select("staffer_id").eq("semester_id", semester.id).eq("duty_day", dutyDay);
        const eligibleIds = new Set((dutySchedules || []).map((d) => d.staffer_id));
        eligibleProfiles = allProfiles.filter((p) => eligibleIds.has(p.id));
      }
      let assignmentCounts = {};
      if (eligibleProfiles.length > 0) {
        const ids = eligibleProfiles.map((p) => p.id);
        const { data: assignments } = await supabase.from("coverage_assignments").select("assigned_to").in("assigned_to", ids);
        (assignments || []).forEach((a) => { assignmentCounts[a.assigned_to] = (assignmentCounts[a.assigned_to] || 0) + 1; });
      }
      setStaffers(eligibleProfiles.map((p) => ({ ...p, assignmentCount: assignmentCounts[p.id] || 0 })).sort((a, b) => a.assignmentCount - b.assignmentCount));
      setStaffersLoading(false);
    }
    loadStaffers();
  }, [selectedRequest, currentUser]);

  const applyFilters = useCallback((reqs) => {
    let filtered = reqs;
    if (semRange) {
      const start = new Date(semRange.start_date);
      const end   = new Date(semRange.end_date); end.setHours(23, 59, 59, 999);
      filtered = filtered.filter((r) => { if (!r.event_date) return false; const d = new Date(r.event_date); return d >= start && d <= end; });
    }
    if (stafferFilter !== "all") {
      filtered = filtered.filter((r) => (r.coverage_assignments || []).some((a) => a.assigned_to === stafferFilter && a.staffer?.section === currentUser?.section));
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

  const handleAssign = async () => {
    if (selectedStaffers.length === 0) { setAssignError("Please select at least one staffer."); return; }
    setAssignLoading(true); setAssignError("");
    try {
      const assignments = selectedStaffers.map((stafferId) => ({ request_id: selectedRequest.id, assigned_to: stafferId, assigned_by: currentUser.id, section: currentUser.section }));
      const { error: assignErr } = await supabase.from("coverage_assignments").insert(assignments);
      if (assignErr) throw assignErr;
      const forwardedSections = selectedRequest.forwarded_sections || [];
      let allAssigned = forwardedSections.length === 0;
      if (!allAssigned) {
        const { data: existing } = await supabase.from("coverage_assignments").select("section").eq("request_id", selectedRequest.id);
        const assignedSections = new Set((existing || []).map((a) => a.section));
        allAssigned = forwardedSections.every((s) => assignedSections.has(s));
      }
      if (allAssigned) await supabase.from("coverage_requests").update({ status: "Assigned" }).eq("id", selectedRequest.id);
      setSelectedRequest(null); loadAll();
    } catch (err) { setAssignError(err.message); }
    finally { setAssignLoading(false); }
  };

  const handleSubmitForApproval = async (requestId) => {
    setSubmitLoading(true);
    try {
      const { error } = await supabase.from("coverage_requests").update({ status: "For Approval" }).eq("id", requestId);
      if (error) throw error;
      setConfirmRequest(null); loadAll();
    } catch (err) { setError(err.message); }
    finally { setSubmitLoading(false); }
  };

  const selectedSemLabel    = semesters.find((s) => s.id === activeSemesterId)?.label || semesters.find((s) => s.id === activeSemesterId)?.name;
  const selectedStafferName = allStaffers.find((s) => s.id === stafferFilter)?.full_name;

  if (!currentUser) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <CircularProgress size={26} sx={{ color: GOLD }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%", fontFamily: dm }}>

      {/* ── Column menu styles ── */}
      <ColumnMenuStyles isDark={isDark} border={border} />

      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "1.05rem", color: "text.primary", letterSpacing: "-0.02em" }}>
          Assignment Management
        </Typography>
        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary", mt: 0.3 }}>
          {tab === 0 && `Requests forwarded to your section (${currentUser.section}). Assign staffers, then submit for admin approval.`}
          {tab === 1 && `Requests with staffers assigned from your section (${currentUser.section}). Submit ready ones for admin approval.`}
          {tab === 2 && `Completed and past coverage requests handled by your section (${currentUser.section}).`}
        </Typography>
      </Box>

      {/* ── Tabs row + filter ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
        <Box sx={{ display: "flex", gap: 0, borderBottom: `1px solid ${border}`, flex: 1 }}>
          {TABS.map((t, idx) => {
            const isActive = tab === idx;
            return (
              <Box key={t.key} onClick={() => setTab(idx)} sx={{
                display: "flex", alignItems: "center", gap: 0.75,
                px: 1.75, py: 0.9, cursor: "pointer", position: "relative",
                fontFamily: dm, fontSize: "0.79rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? CHARCOAL : "text.secondary",
                transition: "color 0.15s", "&:hover": { color: CHARCOAL },
                "&::after": isActive ? { content: '""', position: "absolute", bottom: -1, left: 0, right: 0, height: "2px", borderRadius: "2px 2px 0 0", backgroundColor: GOLD } : {},
              }}>
                {t.label}
                {counts[t.key] > 0 && (
                  <Box sx={{ minWidth: 17, height: 17, borderRadius: "9px", px: 0.5, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isActive ? GOLD : isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.07)" }}>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, lineHeight: 1, color: isActive ? CHARCOAL : "text.secondary" }}>
                      {counts[t.key]}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Filter button */}
        <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
          <Box sx={{ position: "relative", pb: "1px" }}>
            <Box onClick={() => setFilterOpen((p) => !p)} sx={{
              display: "flex", alignItems: "center", gap: 0.6,
              px: 1.25, py: 0.55, borderRadius: "8px", cursor: "pointer",
              border: `1px solid ${activeFilterCount > 0 ? "rgba(245,197,43,0.6)" : border}`,
              backgroundColor: activeFilterCount > 0 ? GOLD_08 : "transparent",
              fontFamily: dm, fontSize: "0.76rem", fontWeight: 500,
              color: activeFilterCount > 0 ? "#b45309" : "text.secondary",
              transition: "all 0.15s",
              "&:hover": { borderColor: "rgba(245,197,43,0.6)", color: "#b45309", backgroundColor: GOLD_08 },
            }}>
              <FilterListIcon sx={{ fontSize: 15 }} />
              Filter
              {activeFilterCount > 0 && (
                <Box sx={{ width: 16, height: 16, borderRadius: "8px", backgroundColor: GOLD, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.6rem", fontWeight: 700, color: CHARCOAL, lineHeight: 1 }}>{activeFilterCount}</Typography>
                </Box>
              )}
            </Box>

            {filterOpen && (
              <Box sx={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 250, zIndex: 1300, borderRadius: "12px", overflow: "hidden", border: `1px solid ${border}`, backgroundColor: "background.paper", boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.5)" : "0 4px 24px rgba(53,53,53,0.12)" }}>
                <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", fontWeight: 700, color: "text.primary" }}>Filter</Typography>
                  {activeFilterCount > 0 && (
                    <Box onClick={() => { setActiveSemesterId("all"); setStafferFilter("all"); }} sx={{ fontFamily: dm, fontSize: "0.72rem", color: "text.secondary", cursor: "pointer", "&:hover": { color: CHARCOAL } }}>Clear all</Box>
                  )}
                </Box>
                <Box sx={{ px: 2, py: 1.75, display: "flex", flexDirection: "column", gap: 1.5 }}>
                  <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.09em" }}>Semester</Typography>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                    {[{ id: "all", name: "All Semesters" }, ...semesters.map((s) => ({ id: s.id, name: (s.label || s.name) + (s.is_active ? " (Active)" : "") }))].map((s) => (
                      <Box key={s.id} onClick={() => setActiveSemesterId(s.id)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.25, py: 0.6, borderRadius: "7px", cursor: "pointer", backgroundColor: activeSemesterId === s.id ? GOLD_08 : "transparent", "&:hover": { backgroundColor: activeSemesterId === s.id ? GOLD_08 : HOVER_BG } }}>
                        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: activeSemesterId === s.id ? "#b45309" : "text.primary", fontWeight: activeSemesterId === s.id ? 600 : 400 }}>{s.name}</Typography>
                        {activeSemesterId === s.id && <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: GOLD }} />}
                      </Box>
                    ))}
                  </Box>
                  {allStaffers.length > 0 && (
                    <>
                      <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.09em" }}>Staffer</Typography>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        {[{ id: "all", full_name: "All Staffers" }, ...allStaffers].map((s) => (
                          <Box key={s.id} onClick={() => setStafferFilter(s.id)} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1.25, py: 0.6, borderRadius: "7px", cursor: "pointer", backgroundColor: stafferFilter === s.id ? GOLD_08 : "transparent", "&:hover": { backgroundColor: stafferFilter === s.id ? GOLD_08 : HOVER_BG } }}>
                            <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: stafferFilter === s.id ? "#b45309" : "text.primary", fontWeight: stafferFilter === s.id ? 600 : 400 }}>{s.full_name}</Typography>
                            {stafferFilter === s.id && <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: GOLD }} />}
                          </Box>
                        ))}
                      </Box>
                    </>
                  )}
                </Box>
              </Box>
            )}
          </Box>
        </ClickAwayListener>
      </Box>

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <Box sx={{ display: "flex", gap: 0.75, mt: 1.5, flexWrap: "wrap" }}>
          {activeSemesterId !== "all" && <FilterChip label={selectedSemLabel} onDelete={() => setActiveSemesterId("all")} />}
          {stafferFilter !== "all" && <FilterChip label={selectedStafferName} onDelete={() => setStafferFilter("all")} />}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mt: 2, borderRadius: "8px", fontFamily: dm, fontSize: "0.78rem" }}>{error}</Alert>}

      {/* ── Table ── */}
      <Box sx={{ mt: 2, width: "100%", overflowX: "auto" }}>
        <Box sx={{ minWidth: 700, bgcolor: "background.paper", borderRadius: "10px", border: `1px solid ${border}`, overflow: "hidden", height: 500 }}>
          {loading ? (
            <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          ) : (
            <>
              {tab === 0 && <ForAssignmentTab rows={applyFilters(forAssignmentReqs)} highlight={highlight} currentUser={currentUser} isDark={isDark} border={border} getPaxForSection={getPaxForSection} onAssign={(req) => { setAssignError(""); setSelectedRequest(req); }} />}
              {tab === 1 && <AssignedTab     rows={applyFilters(assignedReqs)}      highlight={highlight} currentUser={currentUser} isDark={isDark} border={border} submitLoading={submitLoading} onRequestConfirm={(row) => setConfirmRequest(row)} />}
              {tab === 2 && <HistoryTab      rows={applyFilters(historyReqs)}       highlight={highlight} currentUser={currentUser} isDark={isDark} border={border} />}
            </>
          )}
        </Box>
      </Box>

      {/* ── Assignment dialog ── */}
      <AssignmentDialog
        open={!!selectedRequest} request={selectedRequest}
        onClose={() => !assignLoading && setSelectedRequest(null)}
        currentUser={currentUser} isDark={isDark} border={border}
        staffers={staffers} staffersLoading={staffersLoading}
        selectedStaffers={selectedStaffers} setSelectedStaffers={setSelectedStaffers}
        alreadyAssigned={alreadyAssigned} isWeekend={isWeekend}
        assignLoading={assignLoading} assignError={assignError}
        getPaxForSection={getPaxForSection} onAssign={handleAssign}
      />

      {/* ── Submit for Approval dialog ── */}
      <SubmitConfirmDialog
        open={!!confirmRequest} request={confirmRequest} isDark={isDark} border={border}
        loading={submitLoading}
        onCancel={() => !submitLoading && setConfirmRequest(null)}
        onConfirm={() => handleSubmitForApproval(confirmRequest.id)}
      />
    </Box>
  );
}

// ── Submit Confirmation Dialog ────────────────────────────────────────────────
function SubmitConfirmDialog({ open, request, isDark, border, loading, onCancel, onConfirm }) {
  if (!request) return null;
  const stafferNames = (request.staffers || []).map((a) => a.staffer?.full_name).filter(Boolean);

  return (
    <Dialog open={open} onClose={() => !loading && onCancel()} maxWidth="xs" fullWidth
      PaperProps={{ sx: { borderRadius: "14px", backgroundColor: "background.paper", border: `1px solid ${border}`, boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.6)" : "0 8px 40px rgba(53,53,53,0.12)" } }}
    >
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 2.5, height: 26, borderRadius: "2px", backgroundColor: GOLD, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>Submit for Approval</Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary" }}>This will notify the admin for final review.</Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onCancel} disabled={loading} sx={{ borderRadius: "8px", color: "text.secondary", "&:hover": { backgroundColor: HOVER_BG } }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 1.75 }}>
        <Box sx={{ px: 1.75, py: 1.25, borderRadius: "8px", border: `1px solid ${border}`, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)" }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.84rem", fontWeight: 600, color: "text.primary" }}>{request.title}</Typography>
          {request.eventDate && request.eventDate !== "—" && (
            <Typography sx={{ fontFamily: dm, fontSize: "0.73rem", color: "text.secondary", mt: 0.3 }}>Event date: {request.eventDate}</Typography>
          )}
        </Box>

        {stafferNames.length > 0 && (
          <Box>
            <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, color: "text.disabled", textTransform: "uppercase", letterSpacing: "0.09em", mb: 0.75 }}>Staffers being submitted</Typography>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
              {stafferNames.map((name, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.1, py: 0.3, borderRadius: "6px", backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4", border: `1px solid rgba(34,197,94,0.2)` }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#22c55e" }} />
                  <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#15803d", fontWeight: 500 }}>{name}</Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1, px: 1.5, py: 1.25, borderRadius: "8px", backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.07)", border: `1px solid rgba(245,197,43,0.3)` }}>
          <WarningAmberOutlinedIcon sx={{ fontSize: 14, color: "#b45309", flexShrink: 0, mt: 0.1 }} />
          <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: "#b45309", lineHeight: 1.55 }}>
            Once submitted, staffers will be locked in and the admin will be notified. This cannot be undone.
          </Typography>
        </Box>
      </Box>

      <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)" }}>
        <CancelBtn onClick={onCancel} disabled={loading} border={border} />
        <PrimaryBtn onClick={onConfirm} loading={loading}>
          {!loading && <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
          Confirm Submission
        </PrimaryBtn>
      </Box>
    </Dialog>
  );
}

// ── For Assignment Tab ────────────────────────────────────────────────────────
function ForAssignmentTab({ rows, highlight, currentUser, isDark, border, getPaxForSection, onAssign }) {
  const mappedRows = rows.map((req) => {
    const myAssignments    = (req.coverage_assignments || []).filter((a) => a.staffer?.section === currentUser?.section);
    const allSections      = req.forwarded_sections || [];
    const otherSections    = allSections.filter((s) => s !== currentUser?.section);
    const assignedSections = new Set((req.coverage_assignments || []).map((a) => a.staffer?.section).filter(Boolean));
    const pendingOthers    = otherSections.filter((s) => !assignedSections.has(s));
    return { id: req.id, requestTitle: req.title, client: req.entity?.name || "—", eventDate: req.event_date ? new Date(req.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—", paxNeeded: getPaxForSection(req), dateForwarded: req.forwarded_at ? new Date(req.forwarded_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—", myDone: myAssignments.length > 0, pendingOthers, _raw: req };
  });

  const columns = [
    { field: "requestTitle",  headerName: "Event Title",     flex: 1.4, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "client",        headerName: "Client",          flex: 1,   renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    { field: "eventDate",     headerName: "Event Date",      flex: 0.9, renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    {
      field: "paxNeeded", headerName: "Pax", flex: 0.6,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box sx={{ px: 1.1, py: 0.3, borderRadius: "6px", backgroundColor: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff" }}>
            <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 600, color: "#1d4ed8" }}>{p.value} pax</Typography>
          </Box>
        </Box>
      ),
    },
    { field: "dateForwarded", headerName: "Forwarded", flex: 0.9, renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    {
      field: "actions", headerName: "", flex: 1.3, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%", pr: 0.5 }}>
          {!p.row.myDone ? (
            <ActionChip onClick={() => onAssign(p.row._raw)} border={border}>
              <PersonAddOutlinedIcon sx={{ fontSize: 12 }} /> Assign
            </ActionChip>
          ) : (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.2, alignItems: "flex-end" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#22c55e" }} />
                <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#15803d", fontWeight: 600 }}>Your section assigned</Typography>
              </Box>
              {p.row.pendingOthers.length > 0 && (
                <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", color: "text.secondary" }}>Waiting: {p.row.pendingOthers.join(", ")}</Typography>
              )}
            </Box>
          )}
        </Box>
      ),
    },
  ];

  return (
    <DataGrid rows={mappedRows} columns={columns} pageSize={8} rowsPerPageOptions={[8]} disableSelectionOnClick rowHeight={52}
      getRowClassName={(p) => highlight && p.row.requestTitle?.toLowerCase().includes(highlight) ? "highlighted-row" : ""}
      sx={makeDataGridSx(isDark, border)}
    />
  );
}

// ── Assigned Tab ──────────────────────────────────────────────────────────────
function AssignedTab({ rows, highlight, currentUser, isDark, border, submitLoading, onRequestConfirm }) {
  const mappedRows = rows.map((req) => {
    const sectionAssignments = (req.coverage_assignments || []).filter((a) => a.staffer?.section === currentUser?.section);
    return { id: req.id, title: req.title, client: req.entity?.name || "—", eventDate: req.event_date ? new Date(req.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—", venue: req.venue || "—", status: req.status, staffers: sectionAssignments };
  });

  const columns = [
    { field: "title",     headerName: "Event Title", flex: 1.2, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "client",    headerName: "Client",      flex: 0.9, renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    { field: "eventDate", headerName: "Event Date",  flex: 0.9, renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    {
      field: "staffers", headerName: "Assigned Staffers", flex: 1.4, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%", flexWrap: "wrap" }}>
          {p.value.length === 0
            ? <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}>—</Typography>
            : p.value.map((a) => {
                const url = getAvatarUrl(a.staffer?.avatar_url);
                return (
                  <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                    <Avatar src={url} sx={{ width: 24, height: 24, fontSize: "0.6rem", fontWeight: 700, backgroundColor: GOLD, color: CHARCOAL }}>{!url && getInitials(a.staffer?.full_name)}</Avatar>
                    <Box>
                      <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", fontWeight: 600, color: "text.primary", lineHeight: 1.2 }}>{a.staffer?.full_name || "—"}</Typography>
                      <Typography sx={{ fontFamily: dm, fontSize: "0.65rem", color: "text.secondary", lineHeight: 1.2 }}>{a.staffer?.role || a.staffer?.section || "—"}</Typography>
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
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <StatusPill status={p.value} isDark={isDark} />
        </Box>
      ),
    },
    {
      field: "actions", headerName: "", flex: 1.3, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%", pr: 0.5 }}>
          {(p.row.status === "Assigned" || p.row.status === "Forwarded") && (
            <ActionChip onClick={() => onRequestConfirm(p.row)} disabled={submitLoading} border={isDark ? BORDER_DARK : BORDER}>
              <CheckCircleOutlinedIcon sx={{ fontSize: 12 }} /> Submit for Approval
            </ActionChip>
          )}
          {p.row.status === "For Approval" && (
            <Typography sx={{ fontFamily: dm, fontSize: "0.73rem", color: "#0369a1", fontStyle: "italic" }}>Awaiting admin sign-off</Typography>
          )}
        </Box>
      ),
    },
  ];

  return (
    <DataGrid rows={mappedRows} columns={columns} pageSize={8} rowsPerPageOptions={[8]} disableSelectionOnClick rowHeight={52}
      getRowClassName={(p) => highlight && p.row.title?.toLowerCase().includes(highlight) ? "highlighted-row" : ""}
      sx={makeDataGridSx(isDark, border)}
    />
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ rows, highlight, currentUser, isDark, border }) {
  const mappedRows = rows.map((req) => {
    const sectionAssignments = (req.coverage_assignments || []).filter((a) => a.staffer?.section === currentUser?.section);
    return { id: req.id, title: req.title, client: req.entity?.name || "—", eventDate: req.event_date ? new Date(req.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—", venue: req.venue || "—", status: req.status, staffers: sectionAssignments };
  });

  const columns = [
    { field: "title",     headerName: "Event Title", flex: 1.3, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "client",    headerName: "Client",      flex: 0.9, renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    { field: "eventDate", headerName: "Event Date",  flex: 0.9, renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    { field: "venue",     headerName: "Venue",       flex: 1,   renderCell: (p) => <CellText secondary>{p.value}</CellText> },
    {
      field: "staffers", headerName: "Staffers", flex: 1.2, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, height: "100%", flexWrap: "wrap" }}>
          {p.value.length === 0
            ? <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}>—</Typography>
            : p.value.map((a) => {
                const url = getAvatarUrl(a.staffer?.avatar_url);
                return (
                  <Box key={a.id} sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                    <Avatar src={url} sx={{ width: 22, height: 22, fontSize: "0.58rem", fontWeight: 700, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.08)", color: "text.secondary" }}>{!url && getInitials(a.staffer?.full_name)}</Avatar>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", fontWeight: 500, color: "text.primary" }}>{a.staffer?.full_name || "—"}</Typography>
                  </Box>
                );
              })
          }
        </Box>
      ),
    },
    {
      field: "status", headerName: "Status", flex: 0.9,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <StatusPill status={p.value} isDark={isDark} />
        </Box>
      ),
    },
  ];

  return (
    <DataGrid rows={mappedRows} columns={columns} pageSize={8} rowsPerPageOptions={[8]} disableSelectionOnClick rowHeight={52}
      getRowClassName={(p) => highlight && p.row.title?.toLowerCase().includes(highlight) ? "highlighted-row" : ""}
      sx={makeDataGridSx(isDark, border)}
    />
  );
}

// ── Assignment Dialog ─────────────────────────────────────────────────────────
function AssignmentDialog({ open, request, onClose, currentUser, isDark, border, staffers, staffersLoading, selectedStaffers, setSelectedStaffers, alreadyAssigned, isWeekend, assignLoading, assignError, getPaxForSection, onAssign }) {
  if (!request) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md"
      PaperProps={{ sx: { borderRadius: "14px", height: { md: "90vh" }, maxHeight: "95vh", backgroundColor: "background.paper", border: `1px solid ${border}`, boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.6)" : "0 8px 40px rgba(53,53,53,0.12)" } }}
    >
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 2.5, height: 26, borderRadius: "2px", backgroundColor: GOLD, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.92rem", color: "text.primary", lineHeight: 1.3 }}>{request.title}</Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary", mt: 0.2 }}>
              {request.forwarded_at ? `Forwarded ${new Date(request.forwarded_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : "Forwarded date unknown"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box sx={{ px: 1.1, py: 0.3, borderRadius: "6px", backgroundColor: isDark ? "rgba(168,85,247,0.1)" : "#f5f3ff" }}>
            <Typography sx={{ fontFamily: dm, fontSize: "0.66rem", fontWeight: 700, color: "#7c3aed", letterSpacing: "0.04em" }}>{currentUser.section}</Typography>
          </Box>
          {isWeekend && (
            <Box sx={{ px: 1.1, py: 0.3, borderRadius: "6px", backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.1)", border: `1px solid rgba(245,197,43,0.3)` }}>
              <Typography sx={{ fontFamily: dm, fontSize: "0.66rem", fontWeight: 700, color: "#b45309" }}>Weekend</Typography>
            </Box>
          )}
          <IconButton onClick={onClose} size="small" disabled={assignLoading} sx={{ borderRadius: "8px", color: "text.secondary", "&:hover": { backgroundColor: HOVER_BG } }}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: { xs: "column", md: "row" }, overflow: { xs: "auto", md: "hidden" }, minHeight: 0 }}>
        <Box sx={{ flex: 1, px: 3, py: 2.5, overflowY: { xs: "visible", md: "auto" }, minWidth: 0 }}>
          <Section label="Event Information" border={border}>
            <InfoGrid rows={[
              ["Title",       request.title],
              ["Description", request.description],
              ["Date",        request.event_date || "—"],
              ["Time",        request.from_time && request.to_time ? `${request.from_time} – ${request.to_time}` : "—"],
              ["Venue",       request.venue || "—"],
            ]} />
          </Section>
          <Section label="Coverage Requirements" border={border}>
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.6, px: 1.25, py: 0.4, borderRadius: "6px", border: `1px solid ${border}`, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)" }}>
              <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", fontWeight: 600, color: "text.primary" }}>{getPaxForSection(request)} pax</Typography>
              <Box sx={{ width: 1, height: 10, backgroundColor: border }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary" }}>for {currentUser.section}</Typography>
            </Box>
          </Section>
          <Section label="Client Details" border={border}>
            <InfoGrid rows={[
              ["Organization",   request.entity?.name || "—"],
              ["Contact Person", request.contact_person || "—"],
              ["Contact Info",   request.contact_info || "—"],
            ]} />
          </Section>
          <Section label="Attachment" border={border}>
            {request.file_url ? (
              <Box onClick={() => openFile(request.file_url)} sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, px: 1.25, py: 0.5, borderRadius: "6px", cursor: "pointer", border: `1px solid ${border}`, transition: "all 0.15s", "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08 } }}>
                <InsertDriveFileOutlinedIcon sx={{ fontSize: 13, color: "text.secondary" }} />
                <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary" }}>{getFileName(request.file_url)}</Typography>
                <ChevronRightIcon sx={{ fontSize: 13, color: "text.disabled" }} />
              </Box>
            ) : (
              <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}>No file attached</Typography>
            )}
          </Section>
          {alreadyAssigned.length > 0 && (
            <Section label="Already Assigned" border={border}>
              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.6 }}>
                {alreadyAssigned.map((a, i) => (
                  <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 0.55, px: 1.1, py: 0.3, borderRadius: "6px", backgroundColor: isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4", border: `1px solid rgba(34,197,94,0.2)` }}>
                    <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#22c55e" }} />
                    <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: "#15803d", fontWeight: 500 }}>{a.profiles?.full_name || "—"}</Typography>
                  </Box>
                ))}
              </Box>
            </Section>
          )}
        </Box>

        <Box sx={{ width: "1px", backgroundColor: border, display: { xs: "none", md: "block" } }} />

        <Box sx={{ width: { xs: "100%", md: 280 }, flexShrink: 0, px: 2.5, py: 2.5, backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)", overflowY: { xs: "visible", md: "auto" }, display: "flex", flexDirection: "column", gap: 1.25 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <PersonAddOutlinedIcon sx={{ fontSize: 13, color: GOLD }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase" }}>Select Staffers</Typography>
          </Box>
          <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: "text.secondary", lineHeight: 1.6 }}>
            {isWeekend ? "Weekend event — all staffers shown, sorted by least assignments." : `Showing staffers on duty for ${new Date(request.event_date).toLocaleDateString("en-US", { weekday: "long" })}, sorted by least assignments.`}
          </Typography>

          {assignError && <Alert severity="error" sx={{ borderRadius: "8px", fontFamily: dm, fontSize: "0.76rem" }}>{assignError}</Alert>}

          {staffersLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={18} sx={{ color: GOLD }} />
            </Box>
          ) : staffers.length === 0 ? (
            <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary", textAlign: "center", py: 2 }}>No eligible staffers found for this event day.</Typography>
          ) : (
            <FormGroup sx={{ gap: 0.75 }}>
              {staffers.map((staffer) => {
                const isSelected = selectedStaffers.includes(staffer.id);
                const url        = getAvatarUrl(staffer.avatar_url);
                return (
                  <Box key={staffer.id}
                    onClick={() => setSelectedStaffers((prev) => prev.includes(staffer.id) ? prev.filter((id) => id !== staffer.id) : [...prev, staffer.id])}
                    sx={{
                      display: "flex", alignItems: "center", gap: 1.25, px: 1.25, py: 1,
                      borderRadius: "8px", cursor: "pointer",
                      border: `1px solid ${isSelected ? "rgba(245,197,43,0.5)" : border}`,
                      backgroundColor: isSelected ? (isDark ? GOLD_08 : "rgba(245,197,43,0.04)") : "transparent",
                      transition: "all 0.15s", "&:hover": { borderColor: "rgba(245,197,43,0.5)" },
                    }}
                  >
                    <Avatar src={url} sx={{ width: 28, height: 28, fontSize: "0.62rem", fontWeight: 700, backgroundColor: isSelected ? GOLD : isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.08)", color: isSelected ? CHARCOAL : "text.secondary", flexShrink: 0 }}>
                      {!url && getInitials(staffer.full_name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", fontWeight: 500, color: "text.primary" }}>{staffer.full_name}</Typography>
                      <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", color: "text.secondary" }}>
                        {staffer.assignmentCount === 0 ? "No assignments yet" : `${staffer.assignmentCount} assignment${staffer.assignmentCount > 1 ? "s" : ""}`}
                      </Typography>
                    </Box>
                    <Checkbox checked={isSelected} size="small" sx={{ p: 0, color: border, "&.Mui-checked": { color: GOLD } }} />
                  </Box>
                );
              })}
            </FormGroup>
          )}

          {selectedStaffers.length > 0 && (
            <Box sx={{ px: 1.25, py: 0.9, borderRadius: "8px", backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.07)", border: `1px solid rgba(245,197,43,0.35)` }}>
              <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", fontWeight: 600, color: "#b45309" }}>
                {selectedStaffers.length} staffer{selectedStaffers.length > 1 ? "s" : ""} selected
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)" }}>
        <CancelBtn onClick={onClose} disabled={assignLoading} border={border} />
        <PrimaryBtn onClick={onAssign} loading={assignLoading}>
          {!assignLoading && <CheckCircleOutlinedIcon sx={{ fontSize: 14 }} />}
          Confirm Assignment
        </PrimaryBtn>
      </Box>
    </Dialog>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Section({ label, children, border }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase", mb: 0.75, pb: 0.75, borderBottom: `1px solid ${border}` }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function InfoGrid({ rows }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "130px 1fr", rowGap: 0.6, columnGap: 1.5, alignItems: "start" }}>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: "text.secondary" }}>{label}</Typography>
          <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.primary", lineHeight: 1.55 }}>{value || "—"}</Typography>
        </React.Fragment>
      ))}
    </Box>
  );
}

function CellText({ children, secondary }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: secondary ? "text.secondary" : "text.primary" }}>{children}</Typography>
    </Box>
  );
}

function ActionChip({ children, onClick, disabled, border }) {
  return (
    <Box onClick={!disabled ? onClick : undefined} sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.25, py: 0.45, borderRadius: "6px", cursor: disabled ? "default" : "pointer", border: `1px solid ${border}`, fontFamily: dm, fontSize: "0.73rem", fontWeight: 500, color: "text.secondary", opacity: disabled ? 0.5 : 1, transition: "all 0.15s", "&:hover": disabled ? {} : { borderColor: GOLD, color: CHARCOAL, backgroundColor: GOLD_08 } }}>
      {children}
    </Box>
  );
}

function FilterChip({ label, onDelete }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1.1, py: 0.35, borderRadius: "6px", border: `1px solid rgba(245,197,43,0.45)`, backgroundColor: GOLD_08 }}>
      <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", fontWeight: 500, color: "#b45309" }}>{label}</Typography>
      <Box onClick={onDelete} sx={{ display: "flex", alignItems: "center", cursor: "pointer", color: "#b45309", opacity: 0.7, "&:hover": { opacity: 1 } }}>
        <CloseIcon sx={{ fontSize: 11 }} />
      </Box>
    </Box>
  );
}

function CancelBtn({ onClick, disabled, border }) {
  return (
    <Box onClick={!disabled ? onClick : undefined} sx={{ px: 1.75, py: 0.65, borderRadius: "8px", cursor: disabled ? "default" : "pointer", border: `1px solid ${border}`, fontFamily: dm, fontSize: "0.8rem", fontWeight: 500, color: "text.secondary", opacity: disabled ? 0.5 : 1, transition: "all 0.15s", "&:hover": { color: "text.primary", backgroundColor: HOVER_BG } }}>
      Cancel
    </Box>
  );
}

function PrimaryBtn({ onClick, loading, children }) {
  return (
    <Box onClick={!loading ? onClick : undefined} sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.75, py: 0.65, borderRadius: "8px", cursor: loading ? "default" : "pointer", backgroundColor: GOLD, color: CHARCOAL, fontFamily: dm, fontSize: "0.8rem", fontWeight: 600, opacity: loading ? 0.8 : 1, transition: "background-color 0.15s", "&:hover": { backgroundColor: loading ? GOLD : "#e6b920" } }}>
      {loading && <CircularProgress size={13} sx={{ color: CHARCOAL }} />}
      {children}
    </Box>
  );
}

function makeDataGridSx(isDark, border) {
  return {
    border: "none", fontFamily: dm, fontSize: "0.82rem",
    backgroundColor: "background.paper", color: "text.primary",
    "& .MuiDataGrid-columnHeaders": { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)", borderBottom: `1px solid ${border}`, minHeight: "40px !important", maxHeight: "40px !important", lineHeight: "40px !important" },
    "& .MuiDataGrid-columnHeaderTitle": { fontFamily: dm, fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.07em", textTransform: "uppercase" },
    "& .MuiDataGrid-columnSeparator": { display: "none" },
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },
    "& .MuiDataGrid-menuIcon button":    { color: "text.disabled", padding: "2px", borderRadius: "6px", transition: "all 0.15s", "&:hover": { backgroundColor: GOLD_08, color: "#b45309" } },
    "& .MuiDataGrid-menuIcon .MuiSvgIcon-root": { fontSize: "1rem" },
    "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-menuIcon button": { color: "text.secondary" },
    "& .MuiDataGrid-row": { borderBottom: `1px solid ${border}`, transition: "background-color 0.12s", "&:last-child": { borderBottom: "none" } },
    "& .MuiDataGrid-row:hover": { backgroundColor: isDark ? "rgba(255,255,255,0.025)" : HOVER_BG },
    "& .MuiDataGrid-cell": { border: "none", outline: "none !important", "&:focus, &:focus-within": { outline: "none" } },
    "& .MuiDataGrid-footerContainer": { borderTop: `1px solid ${border}`, backgroundColor: "transparent", minHeight: "44px" },
    "& .MuiTablePagination-root": { fontFamily: dm, fontSize: "0.75rem", color: "text.secondary" },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontFamily: dm, fontSize: "0.75rem" },
    "& .MuiDataGrid-virtualScroller": { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay": { backgroundColor: "background.paper" },
    "& .highlighted-row": { backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.08)", "&:hover": { backgroundColor: isDark ? GOLD_18 : "rgba(245,197,43,0.14)" } },
  };
}