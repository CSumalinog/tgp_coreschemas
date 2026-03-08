// src/pages/admin/DutyScheduleView.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Typography, CircularProgress, Alert, Chip, Avatar,
  ToggleButton, ToggleButtonGroup, Card, CardContent, useTheme,
} from "@mui/material";
import { DataGrid }     from "@mui/x-data-grid";
import { supabase }     from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";

const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const DAY_COLORS = ["#e3f2fd", "#f3e5f5", "#e8f5e9", "#fff3e0", "#fce4ec"];
const DAY_TEXT   = ["#1565c0", "#6a1b9a", "#2e7d32", "#e65100", "#880e4f"];

const DAY_COLORS_DARK = ["#0d2137", "#1e0a2e", "#0a2210", "#1e1000", "#2e0a18"];
const DAY_TEXT_DARK   = ["#90caf9", "#ce93d8", "#a5d6a7", "#ffb74d", "#f48fb1"];

const SECTION_CHIP = {
  News:            { bg: "#e3f2fd", color: "#1565c0", darkBg: "#0d2137", darkColor: "#90caf9" },
  Photojournalism: { bg: "#f3e5f5", color: "#6a1b9a", darkBg: "#1e0a2e", darkColor: "#ce93d8" },
  Videojournalism: { bg: "#e8f5e9", color: "#2e7d32", darkBg: "#0a2210", darkColor: "#a5d6a7" },
};

const COVERAGE_SECTIONS = ["News", "Photojournalism", "Videojournalism"];

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export default function DutyScheduleView() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [schedules,      setSchedules]      = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState("");
  const [sectionFilter,  setSectionFilter]  = useState("All");

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

  const loadSchedules = useCallback(async () => {
    if (!activeSemester?.id) { setLoading(false); return; }
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("duty_schedules")
      .select(`
        id, duty_day, created_at,
        staffer:staffer_id ( id, full_name, section, role, division, avatar_url )
      `)
      .eq("semester_id", activeSemester.id)
      .order("duty_day", { ascending: true });

    if (fetchErr) setError(fetchErr.message);
    else setSchedules(data || []);
    setLoading(false);
  }, [activeSemester]);

  useEffect(() => { loadSchedules(); }, [loadSchedules]);

  const filtered = sectionFilter === "All"
    ? schedules
    : schedules.filter((s) => s.staffer?.section === sectionFilter);

  const dayCounts = DAY_LABELS.map((_, i) =>
    schedules.filter((s) => s.duty_day === i).length
  );

  const rows = filtered.map((s) => ({
    id:         s.id,
    full_name:  s.staffer?.full_name  || "—",
    section:    s.staffer?.section    || "—",
    role:       s.staffer?.role       || "—",
    division:   s.staffer?.division   || "—",
    avatar_url: s.staffer?.avatar_url || null,
    duty_day:   s.duty_day,
  }));

  const borderColor = isDark ? "#2e2e2e" : "#e0e0e0";

  const dataGridSx = {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-virtualScroller":  { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay":          { backgroundColor: "background.paper" },
    "& .MuiDataGrid-cell":             { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none", color: "text.primary", borderColor },
    "& .MuiDataGrid-columnHeaders":    { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5", color: "text.primary", borderColor },
    "& .MuiDataGrid-footerContainer":  { backgroundColor: "background.paper", borderColor },
    "& .MuiDataGrid-row:hover":        { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":      { color: "text.secondary" },
  };

  const columns = [
    {
      field: "full_name", headerName: "Staffer", flex: 1.3,
      renderCell: (params) => {
        const url = getAvatarUrl(params.row.avatar_url);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, height: "100%" }}>
            <Avatar src={url} sx={{ width: 32, height: 32, fontSize: "0.72rem", fontWeight: 700, backgroundColor: "#f5c52b", color: "#212121" }}>
              {!url && getInitials(params.value)}
            </Avatar>
            <Box>
              <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: "text.primary", lineHeight: 1.2 }}>
                {params.value}
              </Typography>

            </Box>
          </Box>
        );
      },
    },
    {
      field: "section", headerName: "Section", flex: 0.9,
      renderCell: (params) => {
        const cfg = SECTION_CHIP[params.value] || { bg: "#f5f5f5", color: "#757575", darkBg: "#2a2a2a", darkColor: "#aaa" };
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Chip
              label={params.value}
              size="small"
              sx={{
                fontSize: "0.78rem", fontWeight: 600,
                backgroundColor: isDark ? cfg.darkBg : cfg.bg,
                color: isDark ? cfg.darkColor : cfg.color,
              }}
            />
          </Box>
        );
      },
    },
    {
      field: "role", headerName: "Role", flex: 0.8,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip
            label={params.value || "—"}
            size="small"
            sx={{
              fontSize: "0.75rem", fontWeight: 600, textTransform: "capitalize",
              backgroundColor: isDark ? "#1e1e1e" : "#f3f4f6",
              color: "text.secondary",
              border: `1px solid ${isDark ? "#2e2e2e" : "#e0e0e0"}`,
            }}
          />
        </Box>
      ),
    },
    {
      field: "division", headerName: "Division", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.88rem", color: "text.secondary" }}>{params.value}</Typography>
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
              label={DAY_LABELS[day] ?? "—"}
              size="small"
              sx={{
                fontSize: "0.78rem", fontWeight: 600,
                backgroundColor: isDark ? (DAY_COLORS_DARK[day] || "#2a2a2a") : (DAY_COLORS[day] || "#f5f5f5"),
                color:           isDark ? (DAY_TEXT_DARK[day]   || "#aaa")    : (DAY_TEXT[day]   || "#757575"),
              }}
            />
          </Box>
        );
      },
    },
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%" }}>

      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontWeight: 700, fontSize: "1.05rem", color: "text.primary", letterSpacing: "-0.01em" }}>
          Duty Schedule
        </Typography>
        <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mt: 0.3 }}>
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
              sx={{
                flex: "1 1 120px", minWidth: 110,
                border: `1px solid ${borderColor}`,
                borderRadius: 2,
                backgroundColor: "background.paper",
              }}
            >
              <CardContent sx={{ py: 1.5, px: 2, "&:last-child": { pb: 1.5 } }}>
                <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", fontWeight: 500, mb: 0.3 }}>
                  {day}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5 }}>
                  <Typography sx={{ fontSize: "1.4rem", fontWeight: 700, color: isDark ? DAY_TEXT_DARK[i] : DAY_TEXT[i] }}>
                    {dayCounts[i]}
                  </Typography>
                  <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>/10</Typography>
                </Box>
                <Box sx={{ mt: 0.8, height: 4, borderRadius: 2, backgroundColor: isDark ? "#333" : "#f0f0f0", overflow: "hidden" }}>
                  <Box sx={{
                    height: "100%",
                    width: `${Math.min((dayCounts[i] / 10) * 100, 100)}%`,
                    backgroundColor: isDark ? DAY_TEXT_DARK[i] : DAY_TEXT[i],
                    borderRadius: 2,
                    transition: "width 0.4s ease",
                  }} />
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
            sx={{
              "& .MuiToggleButton-root": {
                textTransform: "none", fontSize: "0.82rem", px: 2,
                borderRadius: "8px !important", mx: 0.3,
                border: `1px solid ${borderColor} !important`,
                color: "text.secondary",
              },
              "& .MuiToggleButton-root.Mui-selected": {
                backgroundColor: "#f5c52b !important",
                color: "#111827 !important",
                fontWeight: 700,
                border: "1px solid #f5c52b !important",
              },
            }}
          >
            {["All", ...COVERAGE_SECTIONS].map((sec) => (
              <ToggleButton key={sec} value={sec}>
                {sec}
                {sec !== "All" && (
                  <Box sx={{
                    ml: 0.8, minWidth: 18, height: 18, borderRadius: 9, px: 0.5,
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    backgroundColor: sectionFilter === sec ? "rgba(0,0,0,0.15)" : (isDark ? "#333" : "#f0f0f0"),
                  }}>
                    <Typography sx={{ fontSize: "0.65rem", fontWeight: 700, lineHeight: 1, color: sectionFilter === sec ? "#111827" : "text.secondary" }}>
                      {schedules.filter((s) => s.staffer?.section === sec).length}
                    </Typography>
                  </Box>
                )}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}

      {/* Table */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
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
            sx={dataGridSx}
          />
        )}
      </Box>
    </Box>
  );
}