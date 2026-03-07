// src/pages/sechead/MyStaffers.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Alert, Chip, Avatar, useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { supabase } from "../../lib/supabaseClient";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_COLORS = ["#e3f2fd", "#f3e5f5", "#e8f5e9", "#fff3e0", "#fce4ec"];
const DAY_TEXT   = ["#1565c0", "#6a1b9a", "#2e7d32", "#e65100", "#880e4f"];

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export default function MyStaffers() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [currentUser,    setCurrentUser]    = useState(null);
  const [staffers,       setStaffers]       = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");

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

  useEffect(() => {
    async function loadSemester() {
      const { data } = await supabase.from("semesters").select("id, name").eq("is_active", true).single();
      setActiveSemester(data || null);
    }
    loadSemester();
  }, []);

  const loadStaffers = useCallback(async () => {
    if (!currentUser?.division || !activeSemester?.id) return;
    setLoading(true);

    const { data: profiles, error: profErr } = await supabase
      .from("profiles").select("id, full_name, section, role")
      .eq("division", currentUser.division).eq("is_active", true).neq("id", currentUser.id);

    if (profErr) { setError(profErr.message); setLoading(false); return; }
    if (!profiles || profiles.length === 0) { setStaffers([]); setLoading(false); return; }

    const profileIds = profiles.map((p) => p.id);

    const { data: dutySchedules } = await supabase
      .from("duty_schedules").select("staffer_id, duty_day")
      .eq("semester_id", activeSemester.id).in("staffer_id", profileIds);

    const dutyMap = {};
    (dutySchedules || []).forEach((d) => { dutyMap[d.staffer_id] = d.duty_day; });

    const { data: assignments } = await supabase
      .from("coverage_assignments").select("assigned_to, status").in("assigned_to", profileIds);

    const totalMap = {}, completedMap = {}, pendingMap = {};
    (assignments || []).forEach((a) => {
      totalMap[a.assigned_to]     = (totalMap[a.assigned_to]     || 0) + 1;
      if (a.status === "Completed") completedMap[a.assigned_to] = (completedMap[a.assigned_to] || 0) + 1;
      if (a.status === "Pending")   pendingMap[a.assigned_to]   = (pendingMap[a.assigned_to]   || 0) + 1;
    });

    const merged = profiles.map((p) => ({
      ...p,
      dutyDay:   dutyMap[p.id]     ?? null,
      total:     totalMap[p.id]     || 0,
      completed: completedMap[p.id] || 0,
      pending:   pendingMap[p.id]   || 0,
    })).sort((a, b) => b.total - a.total);

    setStaffers(merged);
    setLoading(false);
  }, [currentUser, activeSemester]);

  useEffect(() => { if (currentUser && activeSemester) loadStaffers(); }, [currentUser, activeSemester, loadStaffers]);

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

  const rows = staffers.map((s) => ({ id: s.id, ...s }));

  const columns = [
    {
      field: "full_name", headerName: "Staffer", flex: 1.2,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
          <Avatar sx={{ width: 30, height: 30, fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#f5c52b", color: "#212121" }}>
            {getInitials(params.value)}
          </Avatar>
          <Box>
            <Typography sx={{ fontSize: "0.88rem", fontWeight: 500, color: "text.primary" }}>{params.value}</Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>{params.row.role}</Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "section", headerName: "Section", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip label={params.value} size="small"
            sx={{ fontSize: "0.78rem", backgroundColor: "#f3e5f5", color: "#7b1fa2", fontWeight: 500 }} />
        </Box>
      ),
    },
    {
      field: "dutyDay", headerName: "Duty Day", flex: 0.8,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          {params.value !== null && params.value !== undefined ? (
            <Chip label={DAY_LABELS[params.value]} size="small"
              sx={{ fontSize: "0.78rem", fontWeight: 600, backgroundColor: DAY_COLORS[params.value], color: DAY_TEXT[params.value] }} />
          ) : (
            <Typography sx={{ fontSize: "0.82rem", color: "text.secondary" }}>Not set</Typography>
          )}
        </Box>
      ),
    },
    {
      field: "total", headerName: "Total", flex: 0.55,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "text.primary" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "pending", headerName: "Pending", flex: 0.65,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip label={params.value} size="small"
            sx={{ fontSize: "0.78rem", fontWeight: 600, backgroundColor: params.value > 0 ? "#fff3e0" : "#f5f5f5", color: params.value > 0 ? "#e65100" : "#bdbdbd" }} />
        </Box>
      ),
    },
    {
      field: "completed", headerName: "Completed", flex: 0.75,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip label={params.value} size="small"
            sx={{ fontSize: "0.78rem", fontWeight: 600, backgroundColor: params.value > 0 ? "#e8f5e9" : "#f5f5f5", color: params.value > 0 ? "#2e7d32" : "#bdbdbd" }} />
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
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.primary" }}>My Staffers</Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.3 }}>
          {activeSemester ? `${currentUser.division} division — ${activeSemester.name}` : `${currentUser.division} division`}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
      {!activeSemester && <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>No active semester. Duty day info won't be available.</Alert>}

      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : staffers.length === 0 ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Typography sx={{ fontSize: "0.88rem", color: "text.secondary" }}>No staffers found in your division.</Typography>
          </Box>
        ) : (
          <DataGrid rows={rows} columns={columns} pageSize={10} rowsPerPageOptions={[10]} disableSelectionOnClick sx={dataGridSx} />
        )}
      </Box>
    </Box>
  );
}