// src/pages/admin/AdminRequestManagement.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box, Typography, CircularProgress, MenuItem,
  Select, FormControl, InputLabel, useTheme, IconButton,
  Badge, Paper, Divider, ClickAwayListener,
} from "@mui/material";
import { DataGrid }                     from "@mui/x-data-grid";
import { useSearchParams, useLocation } from "react-router-dom";
import { useAdminRequests }             from "../../hooks/useAdminRequest";
import RequestDetails                   from "../../components/admin/RequestDetails";
import { supabase }                     from "../../lib/supabaseClient";
import FilterListIcon                   from "@mui/icons-material/FilterList";
import CloseIcon                        from "@mui/icons-material/Close";
import ChevronRightIcon                 from "@mui/icons-material/ChevronRight";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD        = "#F5C52B";
const GOLD_08     = "rgba(245,197,43,0.08)";
const CHARCOAL    = "#353535";
const BORDER      = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG    = "rgba(53,53,53,0.03)";
const dm          = "'DM Sans', sans-serif";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:        { bg: "#fef9ec", color: "#b45309", dot: "#f59e0b" },
  Forwarded:      { bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  Assigned:       { bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  "For Approval": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Approved:       { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  Declined:       { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
};

const TABS = [
  { label: "All Requests",  key: "all"          },
  { label: "Pending",       key: "Pending"       },
  { label: "Forwarded",     key: "Forwarded"     },
  { label: "For Approval",  key: "For Approval"  },
  { label: "Approved",      key: "Approved"      },
  { label: "Declined",      key: "Declined"      },
];

const TAB_DESCRIPTIONS = {
  all:            "All submitted requests across all statuses.",
  Pending:        "Newly submitted requests awaiting your review.",
  Forwarded:      "Requests forwarded to section heads for staff assignment.",
  "For Approval": "Staffers have been assigned. Review and give final approval.",
  Approved:       "Requests that have been fully approved and confirmed.",
  Declined:       "Requests that were declined and their reasons.",
};

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminRequestManagement() {
  const theme    = useTheme();
  const isDark   = theme.palette.mode === "dark";
  const location = useLocation();
  const border   = isDark ? BORDER_DARK : BORDER;

  const { requests, pending, forwarded, forApproval, approved, declined, loading, refetch } = useAdminRequests();

  const [tab, setTab] = useState(() => {
    const incoming = location.state?.tab;
    if (!incoming) return 0;
    const idx = TABS.findIndex((t) => t.key === incoming);
    return idx >= 0 ? idx : 0;
  });

  const [selectedRequest, setSelectedRequest] = useState(null);

  useEffect(() => {
    const openId = location.state?.openRequestId;
    if (!openId || loading || requests.length === 0) return;
    const found = requests.find((r) => r.id === openId);
    if (found) setSelectedRequest(found);
  }, [location.state?.openRequestId, loading, requests]);

  const [semesters,      setSemesters]      = useState([]);
  const [selectedSem,    setSelectedSem]    = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [filterOpen,     setFilterOpen]     = useState(false);
  const filterRef = useRef(null);

  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";

  useEffect(() => {
    const incoming = location.state?.tab;
    if (!incoming) return;
    const idx = TABS.findIndex((t) => t.key === incoming);
    if (idx >= 0) setTab(idx);
  }, [location.state?.tab]);

  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase
        .from("semesters")
        .select("id, name, start_date, end_date")
        .order("start_date", { ascending: false });
      setSemesters(data || []);
    }
    loadSemesters();
  }, []);

  const entityOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    requests.forEach((r) => {
      const name = r.entity?.name;
      if (name && !seen.has(name)) { seen.add(name); opts.push(name); }
    });
    return opts.sort();
  }, [requests]);

  const activeFilterCount = (selectedSem !== "all" ? 1 : 0) + (selectedEntity !== "all" ? 1 : 0);

  const applyFilters = (source) => {
    let filtered = source;
    if (selectedSem !== "all") {
      const sem = semesters.find((s) => s.id === selectedSem);
      if (sem) {
        const start = new Date(sem.start_date);
        const end   = new Date(sem.end_date);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter((r) => {
          if (!r.submitted_at) return false;
          const d = new Date(r.submitted_at);
          return d >= start && d <= end;
        });
      }
    }
    if (selectedEntity !== "all") {
      filtered = filtered.filter((r) => r.entity?.name === selectedEntity);
    }
    return filtered;
  };

  const getBaseSource = (key) => {
    if (key === "all")          return requests.filter((r) => r.status !== "Draft");
    if (key === "Pending")      return pending;
    if (key === "Forwarded")    return forwarded;
    if (key === "For Approval") return forApproval || requests.filter((r) => r.status === "For Approval");
    if (key === "Approved")     return approved;
    if (key === "Declined")     return declined;
    return [];
  };

  const filteredSource = useMemo(
    () => applyFilters(getBaseSource(TABS[tab].key)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tab, requests, selectedSem, selectedEntity, semesters],
  );

  const rows = filteredSource.map((req) => ({
    id:           req.id,
    requestTitle: req.title,
    client:       req.entity?.name || "—",
    dateReceived: req.submitted_at
      ? new Date(req.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    eventDate:    req.event_date
      ? new Date(req.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    forwardedTo:  req.forwarded_sections || [],
    status:       req.status,
    _raw:         req,
  }));

  const getTabCount = (key) => applyFilters(getBaseSource(key)).length;

  // ── Columns ───────────────────────────────────────────────────────────────
  const baseColumns = [
    {
      field: "requestTitle", headerName: "Request Title", flex: 1.4, minWidth: 160,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "client", headerName: "Client", flex: 1, minWidth: 120,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "dateReceived", headerName: "Received", flex: 0.9, minWidth: 110,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "eventDate", headerName: "Event Date", flex: 0.9, minWidth: 110,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
  ];

  const forwardedCol = {
    field: "forwardedTo", headerName: "Forwarded To", flex: 1.2, minWidth: 140,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%", gap: 0.5, flexWrap: "wrap" }}>
        {p.value?.length > 0
          ? p.value.map((s, i) => (
              <Box key={i} sx={{
                display: "flex", alignItems: "center", gap: 0.5,
                px: 1, py: 0.25, borderRadius: "5px",
                backgroundColor: "#f5f3ff",
              }}>
                <Box sx={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#8b5cf6", flexShrink: 0 }} />
                <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 600, color: "#6d28d9" }}>{s}</Typography>
              </Box>
            ))
          : <MetaCell>—</MetaCell>}
      </Box>
    ),
  };

  const statusCol = {
    field: "status", headerName: "Status", flex: 0.9, minWidth: 110,
    renderCell: (p) => {
      const cfg = STATUS_CONFIG[p.value] || { bg: "#f9fafb", color: "#6b7280", dot: "#9ca3af" };
      return (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.25, py: 0.35, borderRadius: "6px", backgroundColor: cfg.bg }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: cfg.dot, flexShrink: 0 }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 600, color: cfg.color, letterSpacing: "0.04em" }}>
              {p.value}
            </Typography>
          </Box>
        </Box>
      );
    },
  };

  const actionCol = {
    field: "actions", headerName: "", flex: 0.5, minWidth: 90, sortable: false,
    align: "right", headerAlign: "right",
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%", pr: 0.5 }}>
        <Box
          onClick={() => setSelectedRequest(p.row._raw)}
          sx={{
            display: "flex", alignItems: "center", gap: 0.4,
            px: 1.25, py: 0.5, borderRadius: "6px", cursor: "pointer",
            border: `1px solid ${border}`,
            fontFamily: dm, fontSize: "0.75rem", fontWeight: 500,
            color: "text.secondary",
            transition: "all 0.15s",
            "&:hover": { borderColor: GOLD, color: CHARCOAL, backgroundColor: GOLD_08 },
          }}
        >
          View <ChevronRightIcon sx={{ fontSize: 14 }} />
        </Box>
      </Box>
    ),
  };

  const buildColumns = () => {
    const key = TABS[tab].key;
    if (key === "all")       return [...baseColumns, statusCol, actionCol];
    if (key === "Forwarded") return [...baseColumns, forwardedCol, actionCol];
    return [...baseColumns, actionCol];
  };

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 }, height: "100%", boxSizing: "border-box", backgroundColor: "background.default", fontFamily: dm }}>

      {/* ── Page description ── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary" }}>
          Manage all coverage requests — review, forward to sections, and approve or decline.
        </Typography>
      </Box>

      {/* ── Tabs row + filter ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0, gap: 1 }}>
        {/* Underline tabs */}
        <Box sx={{
          display: "flex", gap: 0, flex: 1,
          borderBottom: `1px solid ${border}`,
          overflowX: "auto",
          "&::-webkit-scrollbar": { height: 0 },
        }}>
          {TABS.map((t, idx) => {
            const count   = getTabCount(t.key);
            const isActive = tab === idx;
            return (
              <Box
                key={t.key}
                onClick={() => setTab(idx)}
                sx={{
                  display: "flex", alignItems: "center", gap: 0.75,
                  px: 2, py: 1.1, cursor: "pointer",
                  position: "relative", flexShrink: 0,
                  fontFamily: dm, fontSize: "0.8rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? CHARCOAL : "text.secondary",
                  transition: "color 0.15s",
                  "&:hover": { color: CHARCOAL },
                  "&::after": isActive ? {
                    content: '""',
                    position: "absolute",
                    bottom: -1, left: 0, right: 0,
                    height: "2px",
                    borderRadius: "2px 2px 0 0",
                    backgroundColor: GOLD,
                  } : {},
                }}
              >
                {t.label}
                {count > 0 && (
                  <Box sx={{
                    minWidth: 17, height: 17, borderRadius: "9px", px: 0.5,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: isActive ? GOLD : isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.07)",
                    flexShrink: 0,
                  }}>
                    <Typography sx={{
                      fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, lineHeight: 1,
                      color: isActive ? CHARCOAL : "text.secondary",
                    }}>
                      {count}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Filter button */}
        <Box ref={filterRef} sx={{ position: "relative", flexShrink: 0, pb: "1px" }}>
          <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
            <Box>
              <IconButton
                size="small"
                onClick={() => setFilterOpen((p) => !p)}
                sx={{
                  border: `1px solid ${activeFilterCount > 0 ? GOLD : border}`,
                  borderRadius: "8px", px: 1, py: 0.65,
                  backgroundColor: activeFilterCount > 0 ? GOLD_08 : "transparent",
                  color: activeFilterCount > 0 ? CHARCOAL : "text.secondary",
                  transition: "all 0.15s",
                  "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08, color: CHARCOAL },
                }}
              >
                <Badge
                  badgeContent={activeFilterCount}
                  sx={{ "& .MuiBadge-badge": { fontSize: "0.58rem", height: 14, minWidth: 14, backgroundColor: GOLD, color: CHARCOAL } }}
                >
                  <FilterListIcon sx={{ fontSize: 17 }} />
                </Badge>
              </IconButton>

              {/* Filter popover */}
              {filterOpen && (
                <Paper
                  elevation={0}
                  sx={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: { xs: "calc(100vw - 48px)", sm: 240 },
                    maxWidth: 280,
                    zIndex: 1300,
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    backgroundColor: "background.paper",
                    boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.4)" : "0 4px 24px rgba(53,53,53,0.1)",
                    overflow: "hidden",
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", fontWeight: 700, color: "text.primary" }}>
                      Filters
                    </Typography>
                    {activeFilterCount > 0 && (
                      <Box
                        onClick={() => { setSelectedSem("all"); setSelectedEntity("all"); }}
                        sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary", cursor: "pointer", "&:hover": { color: "text.primary" } }}
                      >
                        Clear all
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ px: 2, py: 2, display: "flex", flexDirection: "column", gap: 1.75 }}>
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ fontFamily: dm, fontSize: "0.78rem" }}>Semester</InputLabel>
                      <Select
                        value={selectedSem} label="Semester"
                        onChange={(e) => setSelectedSem(e.target.value)}
                        sx={{
                          fontFamily: dm, fontSize: "0.78rem", borderRadius: "8px",
                          "& .MuiOutlinedInput-notchedOutline": { borderColor: border },
                          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: GOLD },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: GOLD },
                        }}
                      >
                        <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>All Semesters</MenuItem>
                        {semesters.map((s) => (
                          <MenuItem key={s.id} value={s.id} sx={{ fontFamily: dm, fontSize: "0.78rem" }}>{s.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ fontFamily: dm, fontSize: "0.78rem" }}>Client</InputLabel>
                      <Select
                        value={selectedEntity} label="Client"
                        onChange={(e) => setSelectedEntity(e.target.value)}
                        sx={{
                          fontFamily: dm, fontSize: "0.78rem", borderRadius: "8px",
                          "& .MuiOutlinedInput-notchedOutline": { borderColor: border },
                          "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: GOLD },
                          "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: GOLD },
                        }}
                      >
                        <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>All Clients</MenuItem>
                        {entityOptions.map((name) => (
                          <MenuItem key={name} value={name} sx={{ fontFamily: dm, fontSize: "0.78rem" }}>{name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>
                </Paper>
              )}
            </Box>
          </ClickAwayListener>
        </Box>
      </Box>

      {/* ── Active filter chips ── */}
      {activeFilterCount > 0 && (
        <Box sx={{ display: "flex", gap: 0.75, mt: 1.5, flexWrap: "wrap" }}>
          {selectedSem !== "all" && (
            <FilterChip
              label={semesters.find((s) => s.id === selectedSem)?.name}
              onDelete={() => setSelectedSem("all")}
            />
          )}
          {selectedEntity !== "all" && (
            <FilterChip label={selectedEntity} onDelete={() => setSelectedEntity("all")} />
          )}
        </Box>
      )}

      {/* ── Tab description ── */}
      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary" }}>
          {TAB_DESCRIPTIONS[TABS[tab].key]}
        </Typography>
      </Box>

      {/* ── Data Grid ── */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Box sx={{
          minWidth: 680,
          bgcolor: "background.paper",
          borderRadius: "10px",
          border: `1px solid ${border}`,
          overflow: "hidden",
        }}>
          {loading ? (
            <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={buildColumns()}
              pageSize={8}
              rowsPerPageOptions={[8]}
              disableSelectionOnClick
              rowHeight={52}
              getRowClassName={(params) =>
                highlight && params.row.requestTitle?.toLowerCase().includes(highlight)
                  ? "highlighted-row"
                  : ""
              }
              sx={{
                ...makeDataGridSx(isDark, border),
                "& .highlighted-row": {
                  backgroundColor: isDark ? "rgba(245,197,43,0.08)" : "rgba(245,197,43,0.10)",
                  "&:hover": { backgroundColor: isDark ? "rgba(245,197,43,0.13)" : "rgba(245,197,43,0.15)" },
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* ── Request Detail Dialog ── */}
      <RequestDetails
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onActionSuccess={() => { setSelectedRequest(null); refetch(); }}
      />
    </Box>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function MetaCell({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}>{children}</Typography>
    </Box>
  );
}

function FilterChip({ label, onDelete }) {
  return (
    <Box sx={{
      display: "flex", alignItems: "center", gap: 0.5,
      pl: 1.25, pr: 0.75, py: 0.35, borderRadius: "6px",
      backgroundColor: GOLD_08,
      border: `1px solid rgba(245,197,43,0.3)`,
    }}>
      <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", fontWeight: 600, color: "#b45309" }}>
        {label}
      </Typography>
      <Box
        onClick={onDelete}
        sx={{
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 14, height: 14, borderRadius: "4px", cursor: "pointer",
          color: "#b45309", opacity: 0.7,
          "&:hover": { opacity: 1 },
        }}
      >
        <CloseIcon sx={{ fontSize: 11 }} />
      </Box>
    </Box>
  );
}

function makeDataGridSx(isDark, border) {
  return {
    border: "none",
    fontFamily: dm,
    fontSize: "0.82rem",
    backgroundColor: "background.paper",
    color: "text.primary",

    "& .MuiDataGrid-columnHeaders": {
      backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)",
      borderBottom: `1px solid ${border}`,
      minHeight: "40px !important",
      maxHeight: "40px !important",
      lineHeight: "40px !important",
    },
    "& .MuiDataGrid-columnHeaderTitle": {
      fontFamily: dm,
      fontSize: "0.68rem",
      fontWeight: 700,
      color: "text.secondary",
      letterSpacing: "0.07em",
      textTransform: "uppercase",
    },
    "& .MuiDataGrid-columnSeparator": { display: "none" },
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },

    "& .MuiDataGrid-row": {
      borderBottom: `1px solid ${border}`,
      transition: "background-color 0.12s",
      "&:last-child": { borderBottom: "none" },
    },
    "& .MuiDataGrid-row:hover": {
      backgroundColor: isDark ? "rgba(255,255,255,0.025)" : HOVER_BG,
    },

    "& .MuiDataGrid-cell": {
      border: "none",
      outline: "none !important",
      "&:focus, &:focus-within": { outline: "none" },
    },

    "& .MuiDataGrid-footerContainer": {
      borderTop: `1px solid ${border}`,
      backgroundColor: "transparent",
      minHeight: "44px",
    },
    "& .MuiTablePagination-root": {
      fontFamily: dm, fontSize: "0.75rem", color: "text.secondary",
    },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
      fontFamily: dm, fontSize: "0.75rem",
    },
    "& .MuiDataGrid-virtualScroller":  { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay":          { backgroundColor: "background.paper" },
  };
}