// src/pages/admin/DutyScheduleView.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Alert, Chip, Avatar,
  ToggleButton, ToggleButtonGroup, Card, CardContent, Divider,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { supabase } from "../../lib/supabaseClient";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_COLORS = ["#e3f2fd", "#f3e5f5", "#e8f5e9", "#fff3e0", "#fce4ec"];
const DAY_TEXT   = ["#1565c0", "#6a1b9a", "#2e7d32", "#e65100", "#880e4f"];

const COVERAGE_SECTIONS = ["News", "Photojournalism", "Videojournalism"];

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export default function DutyScheduleView() {
  const [schedules, setSchedules] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");

  // ── Load active semester ──
  useEffect(() => {
    async function loadSemester() {
      const { data } = await supabase
        .from("semesters")
        .select("*")
        .eq("is_active", true)
        .single();
      setActiveSemester(data || null);
    }
    loadSemester();
  }, []);

  // ── Load duty schedules ──
  const loadSchedules = useCallback(async () => {
    if (!activeSemester?.id) return;
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("duty_schedules")
      .select(`
        id, duty_day, created_at,
        staffer:staffer_id ( id, full_name, section, role, division )
      `)
      .eq("semester_id", activeSemester.id)
      .order("duty_day", { ascending: true });

    if (fetchErr) setError(fetchErr.message);
    else setSchedules(data || []);
    setLoading(false);
  }, [activeSemester]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  // ── Filter ──
  const filtered = sectionFilter === "All"
    ? schedules
    : schedules.filter((s) => s.staffer?.section === sectionFilter);

  // ── Day slot counts (across all sections, for the summary) ──
  const dayCounts = DAY_LABELS.map((_, i) =>
    schedules.filter((s) => s.duty_day === i).length
  );

  // ── Table rows ──
  const rows = filtered.map((s) => ({
    id: s.id,
    full_name: s.staffer?.full_name || "—",
    section: s.staffer?.section || "—",
    division: s.staffer?.division || "—",
    duty_day: s.duty_day,
  }));

  const columns = [
    {
      field: "full_name", headerName: "Staffer", flex: 1.2,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
          <Avatar sx={{ width: 30, height: 30, fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#f5c52b", color: "#212121" }}>
            {getInitials(params.value)}
          </Avatar>
          <Typography sx={{ fontSize: "0.88rem", fontWeight: 500 }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "section", headerName: "Section", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip
            label={params.value}
            size="small"
            sx={{ fontSize: "0.78rem", backgroundColor: "#f3e5f5", color: "#7b1fa2", fontWeight: 500 }}
          />
        </Box>
      ),
    },
    {
      field: "division", headerName: "Division", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.88rem", color: "#757575" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "duty_day", headerName: "Duty Day", flex: 0.8,
      renderCell: (params) => {
        const day = params.value;
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Chip
              label={DAY_LABELS[day] || "—"}
              size="small"
              sx={{
                fontSize: "0.78rem",
                fontWeight: 600,
                backgroundColor: DAY_COLORS[day] || "#f5f5f5",
                color: DAY_TEXT[day] || "#757575",
              }}
            />
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: "#f9f9f9", minHeight: "100%" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#212121" }}>
          Duty Schedule View
        </Typography>
        <Typography sx={{ fontSize: "0.8rem", color: "#9e9e9e", mt: 0.3 }}>
          {activeSemester
            ? `Showing duty schedules for ${activeSemester.name}`
            : "No active semester. Create and activate one in Semester Management."}
        </Typography>
      </Box>

      {!activeSemester && !loading && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          No active semester found. Go to Semester Management to set one up.
        </Alert>
      )}

      {/* Day slot summary cards */}
      {activeSemester && (
        <Box sx={{ display: "flex", gap: 1.5, mb: 3, flexWrap: "wrap" }}>
          {DAY_LABELS.map((day, i) => (
            <Card
              key={day}
              elevation={0}
              sx={{ flex: "1 1 120px", border: "1px solid #e0e0e0", borderRadius: 2, minWidth: 110 }}
            >
              <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                <Typography sx={{ fontSize: "0.72rem", color: "#9e9e9e", fontWeight: 500, mb: 0.3 }}>
                  {day}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, color: DAY_TEXT[i] }}>
                    {dayCounts[i]}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "#9e9e9e" }}>/10</Typography>
                </Box>
                <Box
                  sx={{
                    mt: 0.8,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: "#f0f0f0",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${Math.min((dayCounts[i] / 10) * 100, 100)}%`,
                      backgroundColor: DAY_TEXT[i],
                      borderRadius: 2,
                      transition: "width 0.4s ease",
                    }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Section filter */}
      {activeSemester && (
        <Box sx={{ mb: 2 }}>
          <ToggleButtonGroup
            value={sectionFilter}
            exclusive
            onChange={(_, val) => val && setSectionFilter(val)}
            size="small"
            sx={{ "& .MuiToggleButton-root": { textTransform: "none", fontSize: "0.82rem", px: 2, borderRadius: "8px !important", mx: 0.3, border: "1px solid #e0e0e0 !important" } }}
          >
            {["All", ...COVERAGE_SECTIONS].map((sec) => (
              <ToggleButton
                key={sec}
                value={sec}
                sx={{
                  "&.Mui-selected": {
                    backgroundColor: "#f5c52b !important",
                    color: "#212121 !important",
                    fontWeight: 600,
                    border: "1px solid #f5c52b !important",
                  },
                }}
              >
                {sec}
                {sec !== "All" && (
                  <Chip
                    label={schedules.filter((s) => s.staffer?.section === sec).length}
                    size="small"
                    sx={{ ml: 0.8, height: 18, fontSize: "0.7rem", backgroundColor: "rgba(0,0,0,0.08)" }}
                  />
                )}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Table */}
      <Box sx={{ bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10]}
            disableSelectionOnClick
            autoHeight
            sx={{
              border: "none",
              fontFamily: "'Helvetica Neue', sans-serif",
              "& .MuiDataGrid-cell": { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none" },
              "& .MuiDataGrid-columnHeaders": { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem" },
            }}
          />
        )}
      </Box>
    </Box>
  );
}