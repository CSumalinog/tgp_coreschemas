// src/components/common/GlobalSearch.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box, Typography, TextField, InputAdornment, CircularProgress, Divider, IconButton, useTheme,
} from "@mui/material";
import SearchOutlinedIcon                from "@mui/icons-material/SearchOutlined";
import CloseIcon                         from "@mui/icons-material/Close";
import DashboardOutlinedIcon             from "@mui/icons-material/DashboardOutlined";
import GroupOutlinedIcon                 from "@mui/icons-material/GroupOutlined";
import DescriptionOutlinedIcon           from "@mui/icons-material/DescriptionOutlined";
import CalendarMonthOutlinedIcon         from "@mui/icons-material/CalendarMonthOutlined";
import TableChartOutlinedIcon            from "@mui/icons-material/TableChartOutlined";
import EventOutlinedIcon                 from "@mui/icons-material/EventOutlined";
import AccessTimeOutlinedIcon            from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineOutlinedIcon    from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon                from "@mui/icons-material/CancelOutlined";
import ForwardToInboxOutlinedIcon        from "@mui/icons-material/ForwardToInboxOutlined";
import PersonOutlineOutlinedIcon         from "@mui/icons-material/PersonOutlineOutlined";
import FolderOutlinedIcon                from "@mui/icons-material/FolderOutlined";
import SchoolOutlinedIcon                from "@mui/icons-material/SchoolOutlined";
import AssignmentOutlinedIcon            from "@mui/icons-material/AssignmentOutlined";
import AssignmentIndOutlinedIcon         from "@mui/icons-material/AssignmentIndOutlined";
import CalendarTodayOutlinedIcon         from "@mui/icons-material/CalendarTodayOutlined";
import HistoryOutlinedIcon               from "@mui/icons-material/HistoryOutlined";
import TrackChangesOutlinedIcon          from "@mui/icons-material/TrackChangesOutlined";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

// ── Pages per role ─────────────────────────────────────────────────────────────
const PAGES_BY_ROLE = {
  admin: [
    { label: "Dashboard",           path: "/admin/dashboard",           icon: <DashboardOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Pending Requests",    path: "/admin/request-management",  icon: <AccessTimeOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Forwarded Requests",  path: "/admin/forwarded-requests",  icon: <ForwardToInboxOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "For Approval",        path: "/admin/for-approval",        icon: <DescriptionOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Approved Requests",   path: "/admin/approved-requests",   icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Declined Requests",   path: "/admin/declined-requests",   icon: <CancelOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Semester Management", path: "/admin/semester-management", icon: <CalendarMonthOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Duty Schedule View",  path: "/admin/duty-schedule-view",  icon: <TableChartOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Calendar Management", path: "/admin/calendar-management", icon: <EventOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Staffers Management", path: "/admin/staffers-management", icon: <GroupOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Scheduling",          path: "/admin/semester-management", icon: <SchoolOutlinedIcon sx={{ fontSize: 16 }} /> },
  ],
  sec_head: [
    { label: "Dashboard",      path: "/sec_head/dashboard",      icon: <DashboardOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "For Assignment", path: "/sec_head/for-assignment",  icon: <AccessTimeOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Assigned",       path: "/sec_head/assigned",        icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "History",        path: "/sec_head/history",         icon: <HistoryOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "My Staffers",    path: "/sec_head/my-staffers",     icon: <GroupOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Assignments",    path: "/sec_head/for-assignment",  icon: <AssignmentOutlinedIcon sx={{ fontSize: 16 }} /> },
  ],
  staff: [
    { label: "Dashboard",     path: "/staff/dashboard",     icon: <DashboardOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "My Assignment", path: "/staff/my-assignment", icon: <AssignmentIndOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "My Schedule",   path: "/staff/my-schedule",   icon: <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} /> },
  ],
  client: [
    { label: "Calendar",         path: "/client/calendar",          icon: <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Draft",            path: "/client/draft",             icon: <DescriptionOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Pending Request",  path: "/client/pending-requests",  icon: <AccessTimeOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Approved Request", path: "/client/approved-requests", icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Declined Request", path: "/client/declined-requests", icon: <CancelOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "History",          path: "/client/history",           icon: <HistoryOutlinedIcon sx={{ fontSize: 16 }} /> },
    { label: "Request Tracker",  path: "/client/pending-requests",  icon: <TrackChangesOutlinedIcon sx={{ fontSize: 16 }} /> },
  ],
};

// ── Smart path resolvers per role ──────────────────────────────────────────────

// Admin: route request to the correct page based on its status
const getAdminRequestPath = (status) => {
  const map = {
    "Pending":      "/admin/request-management",
    "Forwarded":    "/admin/forwarded-requests",
    "For Approval": "/admin/for-approval",
    "Approved":     "/admin/approved-requests",
    "Declined":     "/admin/declined-requests",
  };
  return map[status] || "/admin/request-management";
};

// Client: route their own request to the correct tracker page
const getClientRequestPath = (status) => {
  const map = {
    "Pending":  "/client/pending-requests",
    "Approved": "/client/approved-requests",
    "Declined": "/client/declined-requests",
  };
  return map[status] || "/client/pending-requests";
};

// Sec head: route assignment to the correct page based on status
const getSecHeadAssignmentPath = (status) => {
  const map = {
    "Pending":   "/sec_head/for-assignment",
    "Assigned":  "/sec_head/assigned",
    "Completed": "/sec_head/history",
  };
  return map[status] || "/sec_head/for-assignment";
};

// ── Highlight matching text ────────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Box component="span" sx={{ backgroundColor: "#fff9c4", color: "#212121", borderRadius: "2px", px: "1px" }}>
        {text.slice(idx, idx + query.length)}
      </Box>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Supabase queries per role ──────────────────────────────────────────────────
async function fetchResults(role, query, userId) {
  const results = { staffers: [], requests: [], semesters: [], assignments: [] };

  switch (role) {
    case "admin": {
      const [stafferRes, requestRes, semesterRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, section, division").ilike("full_name", `%${query}%`).limit(4),
        supabase.from("coverage_requests").select("id, title, status").ilike("title", `%${query}%`).limit(4),
        supabase.from("semesters").select("id, name, is_active").ilike("name", `%${query}%`).limit(3),
      ]);
      results.staffers  = stafferRes.data  || [];
      results.requests  = requestRes.data  || [];
      results.semesters = semesterRes.data || [];
      break;
    }
    case "sec_head": {
      const [stafferRes, assignmentRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, section").ilike("full_name", `%${query}%`).limit(4),
        supabase.from("coverage_assignments").select("id, status, request:request_id(title)").ilike("request.title", `%${query}%`).limit(4),
      ]);
      results.staffers    = stafferRes.data    || [];
      results.assignments = assignmentRes.data || [];
      break;
    }
    case "staff": {
      const { data } = await supabase
        .from("coverage_assignments")
        .select("id, status, request:request_id(title)")
        .eq("assigned_to", userId)
        .ilike("request.title", `%${query}%`)
        .limit(4);
      results.assignments = data || [];
      break;
    }
    case "client": {
      const { data } = await supabase
        .from("coverage_requests")
        .select("id, title, status")
        .eq("created_by", userId)
        .ilike("title", `%${query}%`)
        .limit(4);
      results.requests = data || [];
      break;
    }
    default:
      break;
  }

  return results;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function GlobalSearch({ role = "staff", userId = null }) {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(false);
  const [query,    setQuery]    = useState("");
  const [open,     setOpen]     = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [results,  setResults]  = useState({ pages: [], staffers: [], requests: [], semesters: [], assignments: [] });
  const [focused,  setFocused]  = useState(-1);

  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const debounceRef  = useRef(null);

  const pages = PAGES_BY_ROLE[role] || [];

  const allItems = [
    ...results.pages,
    ...results.staffers,
    ...results.requests,
    ...results.semesters,
    ...results.assignments,
  ];

  useEffect(() => {
    if (expanded) setTimeout(() => inputRef.current?.focus(), 50);
  }, [expanded]);

  const search = useCallback(async (q) => {
    const lower = q.toLowerCase();
    const matchedPages = pages.filter((p) => p.label.toLowerCase().includes(lower)).slice(0, 5);
    const dbResults = await fetchResults(role, q, userId);
    setResults({ ...dbResults, pages: matchedPages });
    setLoading(false);
  }, [role, userId, pages]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults({ pages: [], staffers: [], requests: [], semesters: [], assignments: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(() => search(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, search]);

  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false); setExpanded(false); setQuery(""); setFocused(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (path) => {
    navigate(path);
    setOpen(false); setExpanded(false); setQuery(""); setFocused(-1);
  };

  const handleClose = () => {
    setExpanded(false); setOpen(false); setQuery(""); setFocused(-1);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape")       { handleClose(); return; }
    if (!open) return;
    if (e.key === "ArrowDown")    { e.preventDefault(); setFocused((p) => Math.min(p + 1, allItems.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setFocused((p) => Math.max(p - 1, 0)); }
    else if (e.key === "Enter" && focused >= 0 && allItems[focused]?.path) handleSelect(allItems[focused].path);
  };

  const dropdownBg  = isDark ? "#1e1e1e" : "#ffffff";
  const borderColor = isDark ? "#2e2e2e" : "#e0e0e0";
  const hoverBg     = isDark ? "#2a2a2a" : "#f5f5f5";

  const sectionLabelSx = {
    fontSize: "0.7rem", fontWeight: 700, color: "#9e9e9e",
    textTransform: "uppercase", letterSpacing: 0.8, px: 1.5, py: 0.8,
  };

  const hasPages       = results.pages.length > 0;
  const hasStaffers    = results.staffers.length > 0;
  const hasRequests    = results.requests.length > 0;
  const hasSemesters   = results.semesters.length > 0;
  const hasAssignments = results.assignments.length > 0;
  const hasResults     = hasPages || hasStaffers || hasRequests || hasSemesters || hasAssignments;

  let gIdx = 0;

  const ResultItem = ({ icon, primary, secondary, path, globalIndex }) => (
    <Box
      onMouseDown={() => path && handleSelect(path)}
      onMouseEnter={() => setFocused(globalIndex)}
      sx={{
        display: "flex", alignItems: "center", gap: 1.5,
        px: 1.5, py: 1, cursor: "pointer", borderRadius: 1, mx: 0.5,
        backgroundColor: focused === globalIndex ? hoverBg : "transparent",
        transition: "background-color 0.15s",
      }}
    >
      <Box sx={{ color: "#9e9e9e", display: "flex", flexShrink: 0 }}>{icon}</Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontSize: "0.85rem", color: "text.primary", fontWeight: 500, lineHeight: 1.3 }}>
          <Highlight text={primary} query={query} />
        </Typography>
        {secondary && (
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", lineHeight: 1.2 }}>
            {secondary}
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Box ref={containerRef} sx={{ position: "relative", display: "flex", alignItems: "center" }}>

      {/* ── Collapsed: icon only ── */}
      {!expanded && (
        <IconButton
          onClick={() => setExpanded(true)}
          size="small"
          sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
        >
          <SearchOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      {/* ── Expanded: full input ── */}
      {expanded && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <TextField
            inputRef={inputRef}
            size="small"
            placeholder="Search..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); setFocused(-1); }}
            onKeyDown={handleKeyDown}
            sx={{
              width: { xs: 160, sm: 200, md: 300 },
              transition: "width 0.2s ease",
              "& .MuiOutlinedInput-root": {
                borderRadius: 3, height: 34,
                paddingTop: 0, paddingBottom: 0, fontSize: "0.85rem",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loading
                    ? <CircularProgress size={20} sx={{ color: "#9e9e9e" }} />
                    : <SearchOutlinedIcon sx={{ fontSize: 20, color: "#9e9e9e" }} />}
                </InputAdornment>
              ),
            }}
          />
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
          >
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      )}

      {/* ── Dropdown ── */}
      {expanded && open && query.trim() && (
        <Box sx={{
          position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340,
          backgroundColor: dropdownBg, border: `1px solid ${borderColor}`, borderRadius: 2,
          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 1400, overflow: "hidden", py: 0.5,
        }}>

          {loading && (
            <Box sx={{ px: 2, py: 2, display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={14} sx={{ color: "#9e9e9e" }} />
              <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>Searching...</Typography>
            </Box>
          )}

          {!loading && !hasResults && (
            <Box sx={{ px: 2, py: 2.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                No results for "{query}"
              </Typography>
            </Box>
          )}

          {!loading && hasResults && (
            <>
              {/* Pages */}
              {hasPages && (
                <>
                  <Typography sx={sectionLabelSx}>Pages</Typography>
                  {results.pages.map((p) => (
                    <ResultItem key={p.path} icon={p.icon} primary={p.label} path={p.path} globalIndex={gIdx++} />
                  ))}
                </>
              )}

              {/* Staffers — admin + sec_head */}
              {hasStaffers && (
                <>
                  {hasPages && <Divider sx={{ my: 0.5, borderColor }} />}
                  <Typography sx={sectionLabelSx}>Staffers</Typography>
                  {results.staffers.map((s) => (
                    <ResultItem key={s.id}
                      icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                      primary={s.full_name}
                      secondary={[s.section, s.division].filter(Boolean).join(" · ")}
                      path={role === "admin" ? "/admin/staffers-management" : "/sec_head/my-staffers"}
                      globalIndex={gIdx++}
                    />
                  ))}
                </>
              )}

              {/* Requests — admin (status-based) + client (status-based) */}
              {hasRequests && (
                <>
                  {(hasPages || hasStaffers) && <Divider sx={{ my: 0.5, borderColor }} />}
                  <Typography sx={sectionLabelSx}>Requests</Typography>
                  {results.requests.map((r) => (
                    <ResultItem key={r.id}
                      icon={<FolderOutlinedIcon sx={{ fontSize: 16 }} />}
                      primary={r.title}
                      secondary={r.status}
                      path={
                        role === "admin"
                          ? getAdminRequestPath(r.status)
                          : getClientRequestPath(r.status)
                      }
                      globalIndex={gIdx++}
                    />
                  ))}
                </>
              )}

              {/* Semesters — admin only */}
              {hasSemesters && (
                <>
                  {(hasPages || hasStaffers || hasRequests) && <Divider sx={{ my: 0.5, borderColor }} />}
                  <Typography sx={sectionLabelSx}>Semesters</Typography>
                  {results.semesters.map((s) => (
                    <ResultItem key={s.id}
                      icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 16 }} />}
                      primary={s.name}
                      secondary={s.is_active ? "Active" : "Inactive"}
                      path="/admin/semester-management"
                      globalIndex={gIdx++}
                    />
                  ))}
                </>
              )}

              {/* Assignments — sec_head (status-based) + staff */}
              {hasAssignments && (
                <>
                  {(hasPages || hasStaffers || hasRequests || hasSemesters) && <Divider sx={{ my: 0.5, borderColor }} />}
                  <Typography sx={sectionLabelSx}>Assignments</Typography>
                  {results.assignments.map((a) => (
                    <ResultItem key={a.id}
                      icon={<AssignmentOutlinedIcon sx={{ fontSize: 16 }} />}
                      primary={a.request?.title || "—"}
                      secondary={a.status}
                      path={
                        role === "staff"
                          ? "/staff/my-assignment"
                          : getSecHeadAssignmentPath(a.status)
                      }
                      globalIndex={gIdx++}
                    />
                  ))}
                </>
              )}

              {/* Footer */}
              <Box sx={{ px: 1.5, py: 0.8, borderTop: `1px solid ${borderColor}`, mt: 0.5, display: "flex", gap: 1.5 }}>
                <Typography sx={{ fontSize: "0.68rem", color: "#bdbdbd" }}>↑↓ navigate</Typography>
                <Typography sx={{ fontSize: "0.68rem", color: "#bdbdbd" }}>↵ select</Typography>
                <Typography sx={{ fontSize: "0.68rem", color: "#bdbdbd" }}>esc close</Typography>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}