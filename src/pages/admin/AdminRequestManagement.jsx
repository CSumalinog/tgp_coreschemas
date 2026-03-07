// src/pages/admin/AdminRequestManagement.jsx
import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box, Typography, CircularProgress, Button, MenuItem,
  Select, FormControl, InputLabel, useTheme, IconButton,
  Badge, Chip, Paper, Divider, ClickAwayListener,
} from "@mui/material";
import { DataGrid }         from "@mui/x-data-grid";
import { useSearchParams }  from "react-router-dom";
import { useAdminRequests } from "../../hooks/useAdminRequest";
import RequestDetails       from "../../components/admin/RequestDetails";
import { supabase }         from "../../lib/supabaseClient";
import FilterListIcon       from "@mui/icons-material/FilterList";

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  Pending:        { bg: "#fef3c7", color: "#d97706" },
  Forwarded:      { bg: "#f3e8ff", color: "#7c3aed" },
  Assigned:       { bg: "#fff7ed", color: "#c2410c" },
  "For Approval": { bg: "#e0f2fe", color: "#0369a1" },
  Approved:       { bg: "#dcfce7", color: "#15803d" },
  Declined:       { bg: "#fee2e2", color: "#dc2626" },
};

const TABS = [
  { label: "All Requests",  key: "all" },
  { label: "Pending",       key: "Pending" },
  { label: "Forwarded",     key: "Forwarded" },
  { label: "For Approval",  key: "For Approval" },
  { label: "Approved",      key: "Approved" },
  { label: "Declined",      key: "Declined" },
];

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AdminRequestManagement() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { requests, pending, forwarded, forApproval, approved, declined, loading, refetch } = useAdminRequests();
  const [tab,             setTab]             = useState(0);
  const [selectedRequest, setSelectedRequest] = useState(null);

  // ── Filters ──
  const [semesters,      setSemesters]      = useState([]);
  const [selectedSem,    setSelectedSem]    = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [filterOpen,     setFilterOpen]     = useState(false);
  const filterRef = useRef(null);

  // ── Highlight from search ──
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";

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

  // ── Filter logic ──────────────────────────────────────────────────────────
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
    dateReceived: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "—",
    eventDate:    req.event_date   || "—",
    forwardedTo:  req.forwarded_sections || [],
    status:       req.status,
    _raw:         req,
  }));

  const getTabCount = (key) => applyFilters(getBaseSource(key)).length;

  // ── Columns ───────────────────────────────────────────────────────────────
  const baseColumns = [
    { field: "requestTitle", headerName: "Request Title", flex: 1.4, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "client",       headerName: "Client",        flex: 1,   renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "dateReceived", headerName: "Date Received", flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "eventDate",    headerName: "Event Date",    flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
  ];

  const forwardedCol = {
    field: "forwardedTo", headerName: "Forwarded To", flex: 1.2,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%", gap: 0.5, flexWrap: "wrap" }}>
        {p.value?.length > 0
          ? p.value.map((s, i) => (
              <Box key={i} sx={{ px: 1, py: 0.2, borderRadius: 1, backgroundColor: "#f3e8ff", border: "1px solid #7c3aed30" }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 600, color: "#7c3aed" }}>{s}</Typography>
              </Box>
            ))
          : <CellText>—</CellText>}
      </Box>
    ),
  };

  const statusCol = {
    field: "status", headerName: "Status", flex: 0.9,
    renderCell: (p) => {
      const cfg = STATUS_CONFIG[p.value] || { bg: "#f3f4f6", color: "#6b7280" };
      return (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box sx={{ px: 1.25, py: 0.3, borderRadius: 1, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: cfg.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {p.value}
            </Typography>
          </Box>
        </Box>
      );
    },
  };

  const actionCol = {
    field: "actions", headerName: "Action", flex: 0.8, sortable: false,
    renderCell: (p) => (
      <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
        <Button variant="outlined" size="small" onClick={() => setSelectedRequest(p.row._raw)} sx={{ textTransform: "none", fontSize: "0.78rem" }}>
          View Details
        </Button>
      </Box>
    ),
  };

  const buildColumns = () => {
    const key = TABS[tab].key;
    if (key === "all")       return [...baseColumns, statusCol, actionCol];
    if (key === "Forwarded") return [...baseColumns, forwardedCol, actionCol];
    return [...baseColumns, actionCol];
  };

  const selectedSemName    = semesters.find((s) => s.id === selectedSem)?.name;
  const borderColor        = isDark ? "#2e2e2e" : "#e0e0e0";

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default" }}>

      {/* ── Page description ── */}
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          Manage all coverage requests — review, forward to sections, and approve or decline.
        </Typography>
      </Box>

      {/* ── Tabs row + filter icon ── */}
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
        {/* Tab pills */}
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {TABS.map((t, idx) => {
            const count = getTabCount(t.key);
            return (
              <Box
                key={t.key}
                onClick={() => setTab(idx)}
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
                {count > 0 && (
                  <Box sx={{
                    minWidth: 18, height: 18, borderRadius: 9, px: 0.5,
                    backgroundColor: tab === idx ? "#f5c52b" : isDark ? "#333" : "#f3f4f6",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, lineHeight: 1, color: tab === idx ? "#111827" : "text.secondary" }}>
                      {count}
                    </Typography>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Filter icon button */}
        <Box ref={filterRef} sx={{ position: "relative" }}>
          <ClickAwayListener onClickAway={() => setFilterOpen(false)}>
            <Box>
              <IconButton
                size="small"
                onClick={() => setFilterOpen((p) => !p)}
                sx={{
                  border: "1px solid",
                  borderColor: activeFilterCount > 0 ? "#f5c52b" : borderColor,
                  borderRadius: 1.5,
                  px: 1, py: 0.6,
                  backgroundColor: activeFilterCount > 0
                    ? isDark ? "#2a2200" : "#fffbeb"
                    : "background.paper",
                  color: activeFilterCount > 0 ? "#d97706" : "text.secondary",
                  "&:hover": { borderColor: "#f5c52b", color: "#d97706", backgroundColor: isDark ? "#2a2200" : "#fffbeb" },
                }}
              >
                <Badge
                  badgeContent={activeFilterCount}
                  sx={{
                    "& .MuiBadge-badge": {
                      fontSize: "0.6rem", height: 14, minWidth: 14,
                      backgroundColor: "#f5c52b", color: "#111827",
                    },
                  }}
                >
                  <FilterListIcon sx={{ fontSize: 18 }} />
                </Badge>
              </IconButton>

              {/* ── Filter popover ── */}
              {filterOpen && (
                <Paper
                  elevation={4}
                  sx={{
                    position: "absolute", top: "calc(100% + 8px)", right: 0,
                    width: 260, zIndex: 1300, borderRadius: 2, overflow: "hidden",
                    border: `1px solid ${borderColor}`,
                    backgroundColor: "background.paper",
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${borderColor}` }}>
                    <Typography sx={{ fontSize: "0.78rem", fontWeight: 700, color: "text.primary" }}>
                      Filter Requests
                    </Typography>
                  </Box>

                  <Box sx={{ px: 2, py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
                    {/* Semester */}
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ fontSize: "0.82rem" }}>Semester</InputLabel>
                      <Select
                        value={selectedSem}
                        label="Semester"
                        onChange={(e) => setSelectedSem(e.target.value)}
                        sx={{ fontSize: "0.82rem", borderRadius: 1.5 }}
                      >
                        <MenuItem value="all" sx={{ fontSize: "0.82rem" }}>All Semesters</MenuItem>
                        {semesters.map((s) => (
                          <MenuItem key={s.id} value={s.id} sx={{ fontSize: "0.82rem" }}>{s.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>

                    {/* Client */}
                    <FormControl size="small" fullWidth>
                      <InputLabel sx={{ fontSize: "0.82rem" }}>Client</InputLabel>
                      <Select
                        value={selectedEntity}
                        label="Client"
                        onChange={(e) => setSelectedEntity(e.target.value)}
                        sx={{ fontSize: "0.82rem", borderRadius: 1.5 }}
                      >
                        <MenuItem value="all" sx={{ fontSize: "0.82rem" }}>All Clients</MenuItem>
                        {entityOptions.map((name) => (
                          <MenuItem key={name} value={name} sx={{ fontSize: "0.82rem" }}>{name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {activeFilterCount > 0 && (
                    <>
                      <Divider sx={{ borderColor }} />
                      <Box sx={{ px: 2, py: 1.2 }}>
                        <Button
                          size="small" fullWidth
                          onClick={() => { setSelectedSem("all"); setSelectedEntity("all"); }}
                          sx={{ textTransform: "none", fontSize: "0.78rem", color: "text.secondary", borderRadius: 1.5 }}
                        >
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
            <Chip
              label={selectedSemName}
              size="small"
              onDelete={() => setSelectedSem("all")}
              sx={{ fontSize: "0.75rem", backgroundColor: isDark ? "#2a2200" : "#fffbeb", color: "#d97706", border: "1px solid #f5c52b", "& .MuiChip-deleteIcon": { color: "#d97706" } }}
            />
          )}
          {selectedEntity !== "all" && (
            <Chip
              label={selectedEntity}
              size="small"
              onDelete={() => setSelectedEntity("all")}
              sx={{ fontSize: "0.75rem", backgroundColor: isDark ? "#2a2200" : "#fffbeb", color: "#d97706", border: "1px solid #f5c52b", "& .MuiChip-deleteIcon": { color: "#d97706" } }}
            />
          )}
        </Box>
      )}

      {/* ── Tab description ── */}
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
          {TABS[tab].key === "all"          && "All submitted requests across all statuses."}
          {TABS[tab].key === "Pending"      && "Newly submitted requests awaiting your review."}
          {TABS[tab].key === "Forwarded"    && "Requests forwarded to section heads for staff assignment."}
          {TABS[tab].key === "For Approval" && "Staffers have been assigned. Review and give final approval."}
          {TABS[tab].key === "Approved"     && "Requests that have been fully approved and confirmed."}
          {TABS[tab].key === "Declined"     && "Requests that were declined and their reasons."}
        </Typography>
      </Box>

      {/* ── Data Grid ── */}
      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={buildColumns()}
            pageSize={7}
            rowsPerPageOptions={[7]}
            disableSelectionOnClick
            getRowClassName={(params) =>
              highlight && params.row.requestTitle?.toLowerCase().includes(highlight)
                ? "highlighted-row"
                : ""
            }
            sx={{
              ...makeDataGridSx(isDark),
              "& .highlighted-row": {
                backgroundColor: isDark ? "rgba(245,197,43,0.13)" : "rgba(245,197,43,0.18)",
                "&:hover": { backgroundColor: isDark ? "rgba(245,197,43,0.2)" : "rgba(245,197,43,0.28)" },
              },
            }}
          />
        )}
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
function CellText({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography sx={{ fontSize: "0.88rem", color: "text.primary" }}>{children}</Typography>
    </Box>
  );
}

function makeDataGridSx(isDark) {
  return {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: "0.88rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-virtualScroller":  { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay":          { backgroundColor: "background.paper" },
    "& .MuiDataGrid-cell":             { outline: "none", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-columnHeaders":    { backgroundColor: isDark ? "#2a2a2a" : "#fafafa", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-footerContainer":  { backgroundColor: isDark ? "#1e1e1e" : "#fff", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-row:hover":        { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":      { color: "text.secondary" },
  };
}