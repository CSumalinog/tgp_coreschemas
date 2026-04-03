// src/pages/sechead/MyStaffers.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Avatar,
  useTheme,
  GlobalStyles,
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
const DAY_CFG = [
  { label: "Monday", dot: "#3b82f6", color: "#1d4ed8", bg: "#eff6ff" },
  { label: "Tuesday", dot: "#a855f7", color: "#7c3aed", bg: "#f5f3ff" },
  { label: "Wednesday", dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
  { label: "Thursday", dot: "#f97316", color: "#c2410c", bg: "#fff7ed" },
  { label: "Friday", dot: "#ec4899", color: "#be185d", bg: "#fdf2f8" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

// ── Day Pill ──────────────────────────────────────────────────────────────────
function DayPill({ dayIndex, isDark }) {
  if (dayIndex === null || dayIndex === undefined)
    return (
      <Typography
        sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.disabled" }}
      >
        Not set
      </Typography>
    );
  const cfg = DAY_CFG[dayIndex];
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.55,
        px: 1.1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isDark ? `${cfg.dot}18` : cfg.bg,
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
          fontSize: "0.66rem",
          fontWeight: 700,
          color: isDark ? cfg.dot : cfg.color,
          letterSpacing: "0.04em",
        }}
      >
        {cfg.label}
      </Typography>
    </Box>
  );
}

// ── Count Badge ───────────────────────────────────────────────────────────────
function CountBadge({ value, colorDot, colorText, colorBg, isDark }) {
  const isZero = !value || value === 0;
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.55,
        px: 1.1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isZero
          ? isDark
            ? "rgba(255,255,255,0.04)"
            : "#f5f5f5"
          : isDark
            ? `${colorDot}18`
            : colorBg,
      }}
    >
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          flexShrink: 0,
          backgroundColor: isZero
            ? isDark
              ? "rgba(255,255,255,0.15)"
              : "#d1d5db"
            : colorDot,
        }}
      />
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.66rem",
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: isZero ? "text.disabled" : isDark ? colorDot : colorText,
        }}
      >
        {value ?? 0}
      </Typography>
    </Box>
  );
}

// ── Cell text ─────────────────────────────────────────────────────────────────
function CellText({ children, secondary }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.8rem",
          color: secondary ? "text.secondary" : "text.primary",
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}

// ── DataGrid sx ───────────────────────────────────────────────────────────────
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
    "& .MuiDataGrid-menuIcon button": {
      color: "text.disabled",
      padding: "2px",
      borderRadius: "10px",
      transition: "all 0.15s",
      "&:hover": { backgroundColor: GOLD_08, color: "#b45309" },
    },
    "& .MuiDataGrid-menuIcon .MuiSvgIcon-root": { fontSize: "1rem" },
    "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-menuIcon button": {
      color: "text.secondary",
    },
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

// ── Column menu GlobalStyles ──────────────────────────────────────────────────
function ColumnMenuStyles({ isDark, border }) {
  const paperBg = isDark ? "#1e1e1e" : "#ffffff";
  const shadow = isDark
    ? "0 12px 40px rgba(0,0,0,0.55)"
    : "0 4px 24px rgba(53,53,53,0.12)";
  const textColor = isDark ? "rgba(255,255,255,0.85)" : CHARCOAL;
  const iconColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(53,53,53,0.4)";
  const hoverBg = isDark ? "rgba(245,197,43,0.08)" : "rgba(245,197,43,0.07)";
  return (
    <GlobalStyles
      styles={{
        ".MuiPaper-root:has(> .MuiDataGrid-menuList)": {
          borderRadius: "10px !important",
          border: `1px solid ${border} !important`,
          backgroundColor: `${paperBg} !important`,
          boxShadow: `${shadow} !important`,
          minWidth: "180px !important",
          overflow: "hidden !important",
        },
        ".MuiDataGrid-menuList": { padding: "4px 0 !important" },
        ".MuiDataGrid-menuList .MuiMenuItem-root": {
          fontFamily: `${dm} !important`,
          fontSize: "0.78rem !important",
          fontWeight: "500 !important",
          color: `${textColor} !important`,
          padding: "7px 14px !important",
          minHeight: "unset !important",
          gap: "10px !important",
          transition: "background-color 0.12s, color 0.12s !important",
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root:hover": {
          backgroundColor: `${hoverBg} !important`,
          color: "#b45309 !important",
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root .MuiListItemIcon-root": {
          minWidth: "unset !important",
          color: `${iconColor} !important`,
          transition: "color 0.12s !important",
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root .MuiSvgIcon-root": {
          fontSize: "1rem !important",
          color: `${iconColor} !important`,
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiListItemIcon-root": {
          color: "#b45309 !important",
        },
        ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiSvgIcon-root": {
          color: "#b45309 !important",
        },
        ".MuiDataGrid-menuList .MuiListItemText-primary": {
          fontFamily: `${dm} !important`,
          fontSize: "0.78rem !important",
          fontWeight: "500 !important",
        },
        ".MuiDataGrid-menuList .MuiDivider-root": {
          borderColor: `${border} !important`,
          margin: "4px 12px !important",
        },
      }}
    />
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function MyStaffers() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [currentUser, setCurrentUser] = useState(null);
  const [staffers, setStaffers] = useState([]);
  const [activeSemester, setActiveSemester] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const dataGridSx = useMemo(
    () => makeDataGridSx(isDark, border),
    [isDark, border],
  );

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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

  useEffect(() => {
    async function loadSemester() {
      const { data } = await supabase
        .from("semesters")
        .select("id, name")
        .eq("is_active", true)
        .single();
      setActiveSemester(data || null);
    }
    loadSemester();
  }, []);

  const loadStaffers = useCallback(async () => {
    if (!currentUser?.division || !activeSemester?.id) return;
    setLoading(true);

    // ── Only fetch role=staff — excludes sec heads and admins ──
    const { data: profiles, error: profErr } = await supabase
      .from("profiles")
      .select("id, full_name, section, role, avatar_url")
      .eq("division", currentUser.division)
      .eq("role", "staff")
      .eq("is_active", true)
      .neq("id", currentUser.id);

    if (profErr) {
      setError(profErr.message);
      setLoading(false);
      return;
    }
    if (!profiles || profiles.length === 0) {
      setStaffers([]);
      setLoading(false);
      return;
    }

    const profileIds = profiles.map((p) => p.id);

    const { data: dutySchedules } = await supabase
      .from("duty_schedules")
      .select("staffer_id, duty_day")
      .eq("semester_id", activeSemester.id)
      .in("staffer_id", profileIds);

    const dutyMap = {};
    (dutySchedules || []).forEach((d) => {
      dutyMap[d.staffer_id] = d.duty_day;
    });

    const { data: assignments } = await supabase
      .from("coverage_assignments")
      .select("assigned_to, status")
      .in("assigned_to", profileIds);

    const totalMap = {},
      completedMap = {},
      pendingMap = {};
    (assignments || []).forEach((a) => {
      totalMap[a.assigned_to] = (totalMap[a.assigned_to] || 0) + 1;
      if (a.status === "Completed")
        completedMap[a.assigned_to] = (completedMap[a.assigned_to] || 0) + 1;
      if (a.status === "Pending")
        pendingMap[a.assigned_to] = (pendingMap[a.assigned_to] || 0) + 1;
    });

    const merged = profiles
      .map((p) => ({
        ...p,
        dutyDay: dutyMap[p.id] ?? null,
        total: totalMap[p.id] || 0,
        completed: completedMap[p.id] || 0,
        pending: pendingMap[p.id] || 0,
      }))
      .sort((a, b) => b.total - a.total);

    setStaffers(merged);
    setLoading(false);
  }, [currentUser, activeSemester]);

  useEffect(() => {
    if (currentUser && activeSemester) loadStaffers();
  }, [currentUser, activeSemester, loadStaffers]);

  const rows = staffers.map((s) => ({ id: s.id, ...s }));

  const columns = [
    {
      field: "full_name",
      headerName: "Staffer",
      flex: 1.3,
      renderCell: (params) => {
        const url = getAvatarUrl(params.row.avatar_url);
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
              {!url && getInitials(params.value)}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "text.primary",
                  lineHeight: 1.2,
                }}
              >
                {params.value}
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  color: "text.secondary",
                  lineHeight: 1.2,
                }}
              >
                {params.row.role}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "section",
      headerName: "Section",
      flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.55,
              px: 1.1,
              py: 0.3,
              borderRadius: "10px",
              backgroundColor: isDark ? "rgba(168,85,247,0.1)" : "#f5f3ff",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.66rem",
                fontWeight: 700,
                color: isDark ? "#a855f7" : "#7c3aed",
                letterSpacing: "0.04em",
              }}
            >
              {params.value}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "dutyDay",
      headerName: "Duty Day",
      flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <DayPill dayIndex={params.value} isDark={isDark} />
        </Box>
      ),
    },
    {
      field: "total",
      headerName: "Total",
      flex: 0.55,
      renderCell: (params) => <CellText>{params.value}</CellText>,
    },
    {
      field: "pending",
      headerName: "Pending",
      flex: 0.65,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <CountBadge
            value={params.value}
            isDark={isDark}
            colorDot="#f97316"
            colorText="#c2410c"
            colorBg="#fff7ed"
          />
        </Box>
      ),
    },
    {
      field: "completed",
      headerName: "Completed",
      flex: 0.8,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <CountBadge
            value={params.value}
            isDark={isDark}
            colorDot="#22c55e"
            colorText="#15803d"
            colorBg="#f0fdf4"
          />
        </Box>
      ),
    },
  ];

  if (!currentUser)
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <CircularProgress size={26} sx={{ color: GOLD }} />
      </Box>
    );

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "background.default",
        minHeight: "100%",
        fontFamily: dm,
      }}
    >
      <ColumnMenuStyles isDark={isDark} border={border} />

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
          My Staffers
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
            ? `${currentUser.division} division — ${activeSemester.name}`
            : `${currentUser.division} division`}
        </Typography>
      </Box>

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
      {!activeSemester && (
        <Alert
          severity="info"
          sx={{
            mb: 2,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          No active semester. Duty day info won't be available.
        </Alert>
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
            height: 500,
          }}
        >
          {loading ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          ) : staffers.length === 0 ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "text.secondary",
                }}
              >
                No staffers found in your division.
              </Typography>
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10]}
              disableRowSelectionOnClick
              rowHeight={52}
              sx={dataGridSx}
            />
          )}
        </Box>
      </Box>
    </Box>
  );
}
