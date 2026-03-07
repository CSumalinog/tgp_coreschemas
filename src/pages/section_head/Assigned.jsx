// src/pages/sechead/Assigned.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Alert, Chip, Avatar, useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { supabase } from "../../lib/supabaseClient";

const STATUS_STYLES = {
  Assigned:            { backgroundColor: "#e3f2fd", color: "#1565c0" },
  "Coverage Complete": { backgroundColor: "#e8f5e9", color: "#2e7d32" },
};

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export default function SecHeadAssigned() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [currentUser, setCurrentUser] = useState(null);
  const [requests,    setRequests]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("id, full_name, role, section, division").eq("id", user.id).single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  const loadRequests = useCallback(async () => {
    if (!currentUser?.section) return;
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("coverage_requests")
      .select(`
        id, title, event_date, venue, status, forwarded_at,
        entity:entity_id ( name ),
        coverage_assignments (
          id, status, assigned_to,
          staffer:assigned_to ( full_name, section )
        )
      `)
      .in("status", ["Assigned", "Coverage Complete"])
      .contains("forwarded_sections", [currentUser.section])
      .order("event_date", { ascending: true });

    if (fetchErr) setError(fetchErr.message);
    else setRequests(data || []);
    setLoading(false);
  }, [currentUser]);

  useEffect(() => { if (currentUser) loadRequests(); }, [currentUser, loadRequests]);

  const rows = requests.map((req) => {
    const sectionAssignments = (req.coverage_assignments || []).filter(
      (a) => a.staffer?.section === currentUser?.section
    );
    return {
      id: req.id,
      title: req.title,
      client: req.entity?.name || "—",
      eventDate: req.event_date
        ? new Date(req.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "—",
      venue: req.venue || "—",
      status: req.status,
      staffers: sectionAssignments,
      completedCount: sectionAssignments.filter((a) => a.status === "Completed").length,
      totalCount: sectionAssignments.length,
    };
  });

  const dataGridSx = {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: "0.9rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-cell":           { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-columnHeaders":  { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", backgroundColor: isDark ? "#2a2a2a" : "#fafafa", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-footerContainer":{ backgroundColor: isDark ? "#1e1e1e" : "#fff", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-row:hover":      { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":    { color: "text.secondary" },
  };

  const columns = [
    {
      field: "title", headerName: "Event Title", flex: 1.3,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem", color: "text.primary" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "client", headerName: "Client", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem", color: "text.primary" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "eventDate", headerName: "Event Date", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem", color: "text.primary" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "staffers", headerName: "Assigned Staffers", flex: 1.2, sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: "100%", flexWrap: "wrap" }}>
          {params.value.length === 0 ? (
            <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>—</Typography>
          ) : (
            params.value.map((a) => (
              <Avatar key={a.id} title={a.staffer?.full_name}
                sx={{ width: 28, height: 28, fontSize: "0.68rem", fontWeight: 700, backgroundColor: a.status === "Completed" ? "#a5d6a7" : "#f5c52b", color: "#212121" }}>
                {getInitials(a.staffer?.full_name)}
              </Avatar>
            ))
          )}
        </Box>
      ),
    },
    {
      field: "completedCount", headerName: "Progress", flex: 0.7,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.88rem", color: params.row.completedCount === params.row.totalCount ? "#2e7d32" : "text.secondary", fontWeight: 500 }}>
            {params.row.completedCount}/{params.row.totalCount} done
          </Typography>
        </Box>
      ),
    },
    {
      field: "status", headerName: "Status", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip label={params.value} size="small"
            sx={{ fontSize: "0.78rem", fontWeight: 600, ...(STATUS_STYLES[params.value] || { backgroundColor: "#f5f5f5", color: "#757575" }) }} />
        </Box>
      ),
    },
  ];

  if (!currentUser) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.primary" }}>Assigned</Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.3 }}>
          Requests assigned to your section ({currentUser.section}) currently in progress or completed by your team.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid rows={rows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick sx={dataGridSx} />
        )}
      </Box>
    </Box>
  );
}