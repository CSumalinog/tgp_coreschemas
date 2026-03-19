// src/components/common/GlobalSearch.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  CircularProgress,
  Divider,
  IconButton,
  useTheme,
} from "@mui/material";
import SearchOutlinedIcon from "@mui/icons-material/SearchOutlined";
import CloseIcon from "@mui/icons-material/Close";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import TableChartOutlinedIcon from "@mui/icons-material/TableChartOutlined";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import AccessTimeOutlinedIcon from "@mui/icons-material/AccessTimeOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import ForwardToInboxOutlinedIcon from "@mui/icons-material/ForwardToInboxOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import FolderOutlinedIcon from "@mui/icons-material/FolderOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";

// ─── Pages per role (no duplicates) ──────────────────────────────────────────
const PAGES_BY_ROLE = {
  admin: [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: <DashboardOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Pending Requests",
      path: "/admin/request-management",
      icon: <AccessTimeOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Forwarded Requests",
      path: "/admin/forwarded-requests",
      icon: <ForwardToInboxOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "For Approval",
      path: "/admin/for-approval",
      icon: <HowToRegOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Approved Requests",
      path: "/admin/approved-requests",
      icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Declined Requests",
      path: "/admin/declined-requests",
      icon: <CancelOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Semester Management",
      path: "/admin/semester-management",
      icon: <CalendarMonthOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Duty Schedule View",
      path: "/admin/duty-schedule-view",
      icon: <TableChartOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Calendar Management",
      path: "/admin/calendar-management",
      icon: <EventOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Staffers Management",
      path: "/admin/staffers-management",
      icon: <GroupOutlinedIcon sx={{ fontSize: 16 }} />,
    },
  ],
  sec_head: [
    {
      label: "Dashboard",
      path: "/sec_head/dashboard",
      icon: <DashboardOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "For Assignment",
      path: "/sec_head/assignment-management",
      icon: <AccessTimeOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Assigned",
      path: "/sec_head/assignment-management",
      icon: <TaskAltOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "History",
      path: "/sec_head/assignment-management",
      icon: <HistoryOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "My Staffers",
      path: "/sec_head/my-staffers",
      icon: <GroupOutlinedIcon sx={{ fontSize: 16 }} />,
    },
  ],
  staff: [
    {
      label: "Dashboard",
      path: "/staff/dashboard",
      icon: <DashboardOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "My Assignment",
      path: "/staff/my-assignment",
      icon: <AssignmentIndOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "My Schedule",
      path: "/staff/my-schedule",
      icon: <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />,
    },
  ],
  client: [
    {
      label: "Calendar",
      path: "/client/calendar",
      icon: <CalendarTodayOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Draft",
      path: "/client/draft",
      icon: <DescriptionOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Pending Requests",
      path: "/client/pending-requests",
      icon: <AccessTimeOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Approved Requests",
      path: "/client/approved-requests",
      icon: <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Declined Requests",
      path: "/client/declined-requests",
      icon: <CancelOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "History",
      path: "/client/history",
      icon: <HistoryOutlinedIcon sx={{ fontSize: 16 }} />,
    },
    {
      label: "Request Tracker",
      path: "/client/pending-requests",
      icon: <TrackChangesOutlinedIcon sx={{ fontSize: 16 }} />,
    },
  ],
};

// ─── Path resolvers (complete status coverage) ────────────────────────────────
const getAdminRequestPath = (status) =>
  ({
    Pending: "/admin/request-management",
    Forwarded: "/admin/forwarded-requests",
    Assigned: "/admin/forwarded-requests", // assigned lives under forwarded tab
    "For Approval": "/admin/for-approval",
    Approved: "/admin/approved-requests",
    "Coverage Complete": "/admin/approved-requests",
    Declined: "/admin/declined-requests",
  })[status] || "/admin/request-management";

const getClientRequestPath = (status) =>
  ({
    Pending: "/client/pending-requests",
    Approved: "/client/approved-requests",
    Declined: "/client/declined-requests",
    Draft: "/client/draft",
  })[status] || "/client/pending-requests";

const getSecHeadAssignmentPath = (status) =>
  ({
    Pending: "/sec_head/assignment-management",
    Assigned: "/sec_head/assignment-management",
    Completed: "/sec_head/assignment-management",
    "Coverage Complete": "/sec_head/assignment-management",
  })[status] || "/sec_head/assignment-management";

// ─── Fetch results — fixed foreign key ilike queries ─────────────────────────
async function fetchResults(role, query, userId) {
  const results = {
    staffers: [],
    requests: [],
    semesters: [],
    assignments: [],
  };

  if (!query || query.trim().length < 2) {
    return results;
  }

  try {
    switch (role) {
      case "admin": {
        const [stafferRes, requestRes, semesterRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, section, division")
            .ilike("full_name", `%${query}%`)
            .limit(4),
          supabase
            .from("coverage_requests")
            .select("id, title, status")
            .ilike("title", `%${query}%`)
            .neq("status", "Draft")
            .limit(4),
          supabase
            .from("semesters")
            .select("id, name, is_active")
            .ilike("name", `%${query}%`)
            .limit(3),
        ]);
        results.staffers = stafferRes.data || [];
        results.requests = requestRes.data || [];
        results.semesters = semesterRes.data || [];
        break;
      }

      case "sec_head": {
        const [stafferRes, requestRes] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, full_name, section")
            .ilike("full_name", `%${query}%`)
            .limit(4),
          supabase
            .from("coverage_requests")
            .select("id, title")
            .ilike("title", `%${query}%`)
            .limit(8),
        ]);
        results.staffers = stafferRes.data || [];

        const matchedRequestIds = (requestRes.data || []).map((r) => r.id);
        if (matchedRequestIds.length > 0) {
          const { data: assignmentData } = await supabase
            .from("coverage_assignments")
            .select("id, status, request:request_id(id, title)")
            .in("request_id", matchedRequestIds)
            .limit(4);
          results.assignments = assignmentData || [];
        }
        break;
      }

      case "staff": {
        const { data: requestData } = await supabase
          .from("coverage_requests")
          .select("id, title")
          .ilike("title", `%${query}%`)
          .limit(8);

        const matchedRequestIds = (requestData || []).map((r) => r.id);
        if (matchedRequestIds.length > 0) {
          const { data: assignmentData } = await supabase
            .from("coverage_assignments")
            .select("id, status, request:request_id(id, title)")
            .eq("assigned_to", userId)
            .in("request_id", matchedRequestIds)
            .limit(4);
          results.assignments = assignmentData || [];
        }
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
  } catch (error) {
    console.error("Search error:", error);
  }

  return results;
}

// ─── Highlight matching text ──────────────────────────────────────────────────
function Highlight({ text, query }) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <Box
        component="span"
        sx={{
          backgroundColor: "#fff9c4",
          color: "#212121",
          borderRadius: "2px",
          px: "1px",
        }}
      >
        {text.slice(idx, idx + query.length)}
      </Box>
      {text.slice(idx + query.length)}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function GlobalSearch({
  role = "staff",
  userId = null,
  alwaysExpanded = false,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const navigate = useNavigate();

  const [expanded, setExpanded] = useState(alwaysExpanded);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({
    pages: [],
    staffers: [],
    requests: [],
    semesters: [],
    assignments: [],
  });
  const [focused, setFocused] = useState(-1);

  const containerRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const pages = PAGES_BY_ROLE[role] || [];
  const allItems = [
    ...results.pages,
    ...results.staffers,
    ...results.requests,
    ...results.semesters,
    ...results.assignments,
  ];

  useEffect(() => {
    if (alwaysExpanded) setExpanded(true);
  }, [alwaysExpanded]);
  useEffect(() => {
    if (expanded && !alwaysExpanded)
      setTimeout(() => inputRef.current?.focus(), 50);
  }, [expanded, alwaysExpanded]);

  const search = useCallback(
    async (q) => {
      const lower = q.toLowerCase();
      const matchedPages = pages
        .filter((p) => p.label.toLowerCase().includes(lower))
        .slice(0, 5);
      const dbResults = await fetchResults(role, q, userId);
      setResults({ ...dbResults, pages: matchedPages });
      setLoading(false);
    },
    [role, userId, pages],
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults({
        pages: [],
        staffers: [],
        requests: [],
        semesters: [],
        assignments: [],
      });
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
        setOpen(false);
        setFocused(-1);
        if (!alwaysExpanded) {
          setExpanded(false);
          setQuery("");
        }
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [alwaysExpanded]);

  const handleSelect = (path) => {
    navigate(path);
    setOpen(false);
    setQuery("");
    setFocused(-1);
    if (!alwaysExpanded) setExpanded(false);
  };

  const handleClose = () => {
    setQuery("");
    setOpen(false);
    setFocused(-1);
    if (!alwaysExpanded) setExpanded(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      handleClose();
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocused((p) => Math.min(p + 1, allItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocused((p) => Math.max(p - 1, 0));
    } else if (e.key === "Enter" && focused >= 0 && allItems[focused]?.path)
      handleSelect(allItems[focused].path);
  };

  const dropdownBg = isDark ? "#1e1e1e" : "#ffffff";
  const borderColor = isDark ? "#2e2e2e" : "#e0e0e0";
  const hoverBg = isDark ? "#2a2a2a" : "#f5f5f5";

  const sectionLabelSx = {
    fontSize: "0.7rem",
    fontWeight: 700,
    color: "#9e9e9e",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    px: 1.5,
    py: 0.8,
  };

  const hasPages = results.pages.length > 0;
  const hasStaffers = results.staffers.length > 0;
  const hasRequests = results.requests.length > 0;
  const hasSemesters = results.semesters.length > 0;
  const hasAssignments = results.assignments.length > 0;
  const hasResults =
    hasPages || hasStaffers || hasRequests || hasSemesters || hasAssignments;

  let gIdx = 0;

  const ResultItem = ({ icon, primary, secondary, path, globalIndex }) => (
    <Box
      onMouseDown={() => path && handleSelect(path)}
      onMouseEnter={() => setFocused(globalIndex)}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 1.5,
        py: 1,
        cursor: "pointer",
        borderRadius: 1,
        mx: 0.5,
        backgroundColor: focused === globalIndex ? hoverBg : "transparent",
        transition: "background-color 0.15s",
      }}
    >
      <Box sx={{ color: "#9e9e9e", display: "flex", flexShrink: 0 }}>
        {icon}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: "0.85rem",
            color: "text.primary",
            fontWeight: 500,
            lineHeight: 1.3,
          }}
        >
          <Highlight text={primary} query={query} />
        </Typography>
        {secondary && (
          <Typography
            sx={{
              fontSize: "0.75rem",
              color: "text.secondary",
              lineHeight: 1.2,
            }}
          >
            {secondary}
          </Typography>
        )}
      </Box>
    </Box>
  );

  // ─── Dropdown position — left-align on mobile to prevent clipping ──────────
  const dropdownPositionSx = {
    position: "absolute",
    top: "calc(100% + 8px)",
    // right-align on desktop, left-align on mobile
    right: { xs: "auto", sm: 0 },
    left: { xs: 0, sm: "auto" },
    // cap width on mobile so it doesn't overflow viewport
    width: { xs: "calc(100vw - 32px)", sm: 340 },
    maxWidth: 340,
  };

  return (
    <Box
      ref={containerRef}
      sx={{ position: "relative", display: "flex", alignItems: "center" }}
    >
      {/* ── Collapsed: icon only ── */}
      {!expanded && !alwaysExpanded && (
        <IconButton
          onClick={() => setExpanded(true)}
          size="small"
          sx={{ color: "text.secondary", "&:hover": { color: "text.primary" } }}
        >
          <SearchOutlinedIcon sx={{ fontSize: 20 }} />
        </IconButton>
      )}

      {/* ── Expanded input ── */}
      {expanded && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
          <TextField
            inputRef={inputRef}
            size="small"
            placeholder="Search anything..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setFocused(-1);
            }}
            onKeyDown={handleKeyDown}
            sx={{
              width: alwaysExpanded
                ? { xs: 160, sm: 220, md: 300 }
                : { xs: 140, sm: 180, md: 260 },
              transition: "width 0.2s ease",
              "& .MuiOutlinedInput-root": {
                borderRadius: 1,
                height: 36,
                paddingTop: 0,
                paddingBottom: 0,
                fontSize: "0.85rem",
              },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  {loading ? (
                    <CircularProgress size={16} sx={{ color: "#9e9e9e" }} />
                  ) : (
                    <SearchOutlinedIcon
                      sx={{ fontSize: 18, color: "#9e9e9e" }}
                    />
                  )}
                </InputAdornment>
              ),
              endAdornment:
                !alwaysExpanded && query ? (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClose}>
                      <CloseIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </InputAdornment>
                ) : undefined,
            }}
          />
          {!alwaysExpanded && (
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{
                color: "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          )}
        </Box>
      )}

      {/* ── Dropdown results ── */}
      {expanded && open && query.trim() && (
        <Box
          sx={{
            ...dropdownPositionSx,
            backgroundColor: dropdownBg,
            border: `1px solid ${borderColor}`,
            borderRadius: 2,
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.5)"
              : "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 1400,
            overflow: "auto",
            maxHeight: 400,
            py: 0.5,
          }}
        >
          {/* Loading */}
          {loading && (
            <Box
              sx={{
                px: 2,
                py: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <CircularProgress size={14} sx={{ color: "#9e9e9e" }} />
              <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>
                Searching...
              </Typography>
            </Box>
          )}

          {/* No results */}
          {!loading && !hasResults && (
            <Box sx={{ px: 2, py: 2.5, textAlign: "center" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>
                No results for "{query}"
              </Typography>
            </Box>
          )}

          {/* Results */}
          {!loading && hasResults && (
            <>
              {/* Pages */}
              {hasPages && (
                <>
                  <Typography sx={sectionLabelSx}>Pages</Typography>
                  {results.pages.map((p) => (
                    <ResultItem
                      key={p.path + p.label}
                      icon={p.icon}
                      primary={p.label}
                      path={p.path}
                      globalIndex={gIdx++}
                    />
                  ))}
                </>
              )}

              {/* Staffers */}
              {hasStaffers && (
                <>
                  {hasPages && <Divider sx={{ my: 0.5, borderColor }} />}
                  <Typography sx={sectionLabelSx}>Staffers</Typography>
                  {results.staffers.map((s) => (
                    <ResultItem
                      key={s.id}
                      icon={<PersonOutlineOutlinedIcon sx={{ fontSize: 16 }} />}
                      primary={s.full_name}
                      secondary={[s.section, s.division]
                        .filter(Boolean)
                        .join(" · ")}
                      path={
                        role === "admin"
                          ? "/admin/staffers-management"
                          : "/sec_head/my-staffers"
                      }
                      globalIndex={gIdx++}
                    />
                  ))}
                </>
              )}

              {/* Requests */}
              {hasRequests && (
                <>
                  {(hasPages || hasStaffers) && (
                    <Divider sx={{ my: 0.5, borderColor }} />
                  )}
                  <Typography sx={sectionLabelSx}>Requests</Typography>
                  {results.requests.map((r) => (
                    <ResultItem
                      key={r.id}
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

              {/* Semesters */}
              {hasSemesters && (
                <>
                  {(hasPages || hasStaffers || hasRequests) && (
                    <Divider sx={{ my: 0.5, borderColor }} />
                  )}
                  <Typography sx={sectionLabelSx}>Semesters</Typography>
                  {results.semesters.map((s) => (
                    <ResultItem
                      key={s.id}
                      icon={<CalendarMonthOutlinedIcon sx={{ fontSize: 16 }} />}
                      primary={s.name}
                      secondary={s.is_active ? "Active" : "Inactive"}
                      path="/admin/semester-management"
                      globalIndex={gIdx++}
                    />
                  ))}
                </>
              )}

              {/* Assignments */}
              {hasAssignments && (
                <>
                  {(hasPages || hasStaffers || hasRequests || hasSemesters) && (
                    <Divider sx={{ my: 0.5, borderColor }} />
                  )}
                  <Typography sx={sectionLabelSx}>Assignments</Typography>
                  {results.assignments.map((a) => (
                    <ResultItem
                      key={a.id}
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

              {/* Keyboard hints */}
              <Box
                sx={{
                  px: 1.5,
                  py: 0.8,
                  borderTop: `1px solid ${borderColor}`,
                  mt: 0.5,
                  display: "flex",
                  gap: 1.5,
                }}
              >
                <Typography sx={{ fontSize: "0.68rem", color: "#bdbdbd" }}>
                  ↑↓ navigate
                </Typography>
                <Typography sx={{ fontSize: "0.68rem", color: "#bdbdbd" }}>
                  ↵ select
                </Typography>
                <Typography sx={{ fontSize: "0.68rem", color: "#bdbdbd" }}>
                  esc close
                </Typography>
              </Box>
            </>
          )}
        </Box>
      )}
    </Box>
  );
}
