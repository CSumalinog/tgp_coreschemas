// src/pages/admin/DutyScheduleView.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  useTheme,
} from "@mui/material";
import { DataGrid } from "../../components/common/AppDataGrid";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

// ── Day config ────────────────────────────────────────────────────────────────
const DAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const DAY_CFG = [
  {
    bg: "#eff6ff",
    color: "#1d4ed8",
    dot: "#3b82f6",
    darkBg: "rgba(59,130,246,0.08)",
    darkColor: "#93c5fd",
  },
  {
    bg: "#f5f3ff",
    color: "#6d28d9",
    dot: "#8b5cf6",
    darkBg: "rgba(139,92,246,0.08)",
    darkColor: "#c4b5fd",
  },
  {
    bg: "#f0fdf4",
    color: "#15803d",
    dot: "#22c55e",
    darkBg: "rgba(34,197,94,0.08)",
    darkColor: "#86efac",
  },
  {
    bg: "#fff7ed",
    color: "#c2410c",
    dot: "#f97316",
    darkBg: "rgba(249,115,22,0.08)",
    darkColor: "#fdba74",
  },
  {
    bg: "#fdf2f8",
    color: "#9d174d",
    dot: "#ec4899",
    darkBg: "rgba(236,72,153,0.08)",
    darkColor: "#f9a8d4",
  },
];

const SECTION_CFG = {
  News: { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Photojournalism: { bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  Videojournalism: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
};

const COVERAGE_SECTIONS = ["News", "Photojournalism", "Videojournalism"];

const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

export default function DutyScheduleView() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [schedules, setSchedules] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");

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
    if (!activeSemester?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("duty_schedules")
      .select(
        `id, duty_day, created_at, staffer:staffer_id ( id, full_name, section, role, division, avatar_url )`,
      )
      .eq("semester_id", activeSemester.id)
      .order("duty_day", { ascending: true });
    if (fetchErr) setError(fetchErr.message);
    else setSchedules(data || []);
    setLoading(false);
  }, [activeSemester]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  const filtered =
    sectionFilter === "All"
      ? schedules
      : schedules.filter((s) => s.staffer?.section === sectionFilter);

  const dayCounts = DAY_LABELS.map(
    (_, i) => schedules.filter((s) => s.duty_day === i).length,
  );

  const rows = filtered.map((s) => ({
    id: s.id,
    full_name: s.staffer?.full_name || "—",
    section: s.staffer?.section || "—",
    role: s.staffer?.role || "—",
    division: s.staffer?.division || "—",
    avatar_url: s.staffer?.avatar_url || null,
    duty_day: s.duty_day,
  }));

  const columns = [
    {
      field: "full_name",
      headerName: "Staffer",
      flex: 1.3,
      renderCell: (p) => {
        const url = getAvatarUrl(p.row.avatar_url);
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              height: "100%",
            }}
          >
            <Avatar
              src={url}
              sx={{
                width: 28,
                height: 28,
                fontSize: "0.62rem",
                fontWeight: 700,
                backgroundColor: GOLD,
                color: CHARCOAL,
                flexShrink: 0,
              }}
            >
              {!url && getInitials(p.value)}
            </Avatar>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "text.primary",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        );
      },
    },
    {
      field: "section",
      headerName: "Section",
      flex: 0.9,
      renderCell: (p) => {
        const cfg = SECTION_CFG[p.value] || {
          bg: "#f9fafb",
          color: "#6b7280",
          dot: "#9ca3af",
        };
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.25,
                py: 0.35,
                borderRadius: "10px",
                backgroundColor: isDark ? `${cfg.dot}15` : cfg.bg,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: cfg.dot,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: isDark ? cfg.dot : cfg.color,
                  letterSpacing: "0.04em",
                }}
              >
                {p.value}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "role",
      headerName: "Role",
      flex: 0.8,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box
            sx={{
              px: 1.25,
              py: 0.35,
              borderRadius: "10px",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.04)"
                : "rgba(53,53,53,0.04)",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 500,
                color: "text.secondary",
                textTransform: "capitalize",
              }}
            >
              {p.value || "—"}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "division",
      headerName: "Division",
      flex: 0.9,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "duty_day",
      headerName: "Duty Day",
      flex: 0.8,
      renderCell: (p) => {
        const cfg = DAY_CFG[p.value] || DAY_CFG[0];
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.25,
                py: 0.35,
                borderRadius: "10px",
                backgroundColor: isDark ? cfg.darkBg : cfg.bg,
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: cfg.dot,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: isDark ? cfg.darkColor : cfg.color,
                  letterSpacing: "0.04em",
                }}
              >
                {DAY_LABELS[p.value] ?? "—"}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "background.default",
        minHeight: "100%",
        fontFamily: dm,
      }}
    >
      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "1.05rem",
            color: "text.primary",
            letterSpacing: "-0.02em",
          }}
        >
          Duty Schedule
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            color: "text.secondary",
            mt: 0.3,
          }}
        >
          {activeSemester
            ? `Showing duty schedules for ${activeSemester.name}`
            : "No active semester. Create and activate one in Semester Management."}
        </Typography>
      </Box>

      {!activeSemester && !loading && (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          No active semester found. Go to Semester Management to set one up.
        </Alert>
      )}

      {/* ── Day slot summary cards ── */}
      {activeSemester && (
        <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
          {DAY_LABELS.map((day, i) => {
            const cfg = DAY_CFG[i];
            const pct = Math.min((dayCounts[i] / 10) * 100, 100);
            return (
              <Box
                key={day}
                sx={{
                  flex: "1 1 110px",
                  minWidth: 100,
                  px: 2,
                  py: 1.5,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  backgroundColor: "background.paper",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    mb: 0.5,
                  }}
                >
                  {day}
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 0.4,
                    mb: 1,
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "1.35rem",
                      fontWeight: 800,
                      letterSpacing: "-0.03em",
                      color: isDark ? cfg.darkColor : cfg.color,
                      lineHeight: 1,
                    }}
                  >
                    {dayCounts[i]}
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.7rem",
                      color: "text.secondary",
                    }}
                  >
                    /10
                  </Typography>
                </Box>
                {/* Progress bar */}
                <Box
                  sx={{
                    height: 3,
                    borderRadius: "10px",
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(53,53,53,0.06)",
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      height: "100%",
                      width: `${pct}%`,
                      backgroundColor: isDark ? cfg.darkColor : cfg.dot,
                      borderRadius: "10px",
                      transition: "width 0.4s ease",
                    }}
                  />
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          {error}
        </Alert>
      )}

      {/* ── Section filter (underline tabs) ── */}
      {activeSemester && (
        <Box
          sx={{
            mb: 2,
            display: "flex",
            gap: "6px",
            flexWrap: "wrap",
          }}
        >
          {["All", ...COVERAGE_SECTIONS].map((sec) => {
            const isActive = sectionFilter === sec;
            const count =
              sec === "All"
                ? schedules.length
                : schedules.filter((s) => s.staffer?.section === sec).length;
            return (
              <Box
                key={sec}
                onClick={() => setSectionFilter(sec)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 0.65,
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontFamily: dm,
                  fontSize: "0.79rem",
                  fontWeight: isActive ? 600 : 400,
                  color: isActive ? "#fff" : "text.secondary",
                  border: `1px solid ${isActive ? "#212121" : border}`,
                  backgroundColor: isActive ? "#212121" : "background.paper",
                  transition: "all 0.12s",
                  "&:hover": isActive
                    ? {}
                    : {
                        borderColor: "rgba(53,53,53,0.3)",
                        color: isDark ? "#f5f5f5" : CHARCOAL,
                      },
                }}
              >
                {sec}
                <Box
                  sx={{
                    minWidth: 17,
                    height: 17,
                    borderRadius: "10px",
                    px: 0.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: isActive
                      ? "rgba(255,255,255,0.18)"
                      : isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(53,53,53,0.07)",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      lineHeight: 1,
                      color: isActive ? "#fff" : "text.secondary",
                    }}
                  >
                    {count}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {/* ── Table ── */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Box
          sx={{
            minWidth: 600,
            bgcolor: "background.paper",
            borderRadius: "10px",
            border: `1px solid ${border}`,
            overflow: "hidden",
          }}
        >
          {loading ? (
            <Box
              sx={{
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10]}
              disableRowSelectionOnClick
              rowHeight={52}
              autoHeight
              sx={makeDataGridSx(isDark, border)}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function MetaCell({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography
        sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}
      >
        {children}
      </Typography>
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
      backgroundColor: isDark
        ? "rgba(255,255,255,0.02)"
        : "rgba(53,53,53,0.02)",
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
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within":
      { outline: "none" },

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
      fontFamily: dm,
      fontSize: "0.75rem",
      color: "text.secondary",
    },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
      fontFamily: dm,
      fontSize: "0.75rem",
    },
    "& .MuiDataGrid-virtualScroller": { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay": { backgroundColor: "background.paper" },
  };
}
