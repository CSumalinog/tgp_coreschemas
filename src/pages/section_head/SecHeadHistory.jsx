// src/pages/sechead/SecHeadHistory.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Alert, Chip, Avatar,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { supabase } from "../../lib/supabaseClient";

const STATUS_STYLES = {
  "Coverage Complete": { backgroundColor: "#e8f5e9", color: "#2e7d32" },
  Approved:            { backgroundColor: "#fffde7", color: "#f57c00" },
};

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export default function SecHeadHistory() {
  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState("");

  // ── Load current user ──
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, section, division")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  // ── Load history ──
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
      .in("status", ["Coverage Complete", "Approved"])
      .contains("forwarded_sections", [currentUser.section])
      .order("event_date", { ascending: false });

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
    };
  });

  const columns = [
    {
      field: "title", headerName: "Event Title", flex: 1.3,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "client", headerName: "Client", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "eventDate", headerName: "Event Date", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "venue", headerName: "Venue", flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem", color: "#757575" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "staffers", headerName: "Staffers", flex: 1,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: "100%" }}>
          {params.value.length === 0 ? (
            <Typography sx={{ fontSize: "0.82rem", color: "#bdbdbd" }}>—</Typography>
          ) : (
            params.value.map((a) => (
              <Avatar
                key={a.id}
                title={a.staffer?.full_name}
                sx={{ width: 28, height: 28, fontSize: "0.68rem", fontWeight: 700, backgroundColor: "#a5d6a7", color: "#212121" }}
              >
                {getInitials(a.staffer?.full_name)}
              </Avatar>
            ))
          )}
        </Box>
      ),
    },
    {
      field: "status", headerName: "Status", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip
            label={params.value}
            size="small"
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              ...(STATUS_STYLES[params.value] || { backgroundColor: "#f5f5f5", color: "#757575" }),
            }}
          />
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
    <Box sx={{ p: 3, backgroundColor: "#f9f9f9", minHeight: "100%" }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#212121" }}>
          History
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "#757575", mt: 0.3 }}>
          All completed and approved coverage requests handled by your section ({currentUser.section}).
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ height: 500, width: "100%", bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={7}
            rowsPerPageOptions={[7]}
            disableSelectionOnClick
            sx={{
              border: "none",
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: "0.9rem",
              "& .MuiDataGrid-cell": { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none" },
              "& .MuiDataGrid-columnHeaders": { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem" },
            }}
          />
        )}
      </Box>
    </Box>
  );
}