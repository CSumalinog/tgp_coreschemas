// src/pages/admin/SemesterManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  Alert,
  IconButton,
  TextField,
  Switch,
  FormControlLabel,
  useTheme,
  GlobalStyles,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { DataGrid } from "../../components/common/AppDataGrid";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { supabase } from "../../lib/supabaseClient";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_18 = "rgba(245,197,43,0.18)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

const EMPTY_FORM = {
  name: "",
  start_date: "",
  end_date: "",
  is_active: false,
  scheduling_open: false,
};

const fmt = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";

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
        ".MuiDataGrid-menuList": {
          padding: "4px 0 !important",
        },
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

export default function SemesterManagement() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);

  const loadSemesters = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchErr } = await supabase
      .from("semesters")
      .select("*")
      .order("created_at", { ascending: false });
    if (fetchErr) setError(fetchErr.message);
    else setSemesters(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSemesters();
  }, [loadSemesters]);

  const openCreate = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setSaveError("");
    setDialogOpen(true);
  };
  const openEdit = (row) => {
    setEditTarget(row);
    setForm({
      name: row.name,
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active,
      scheduling_open: row.scheduling_open,
    });
    setSaveError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.start_date || !form.end_date) {
      setSaveError("Please fill in all fields.");
      return;
    }
    if (form.start_date >= form.end_date) {
      setSaveError("End date must be after start date.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      if (form.is_active)
        await supabase
          .from("semesters")
          .update({ is_active: false })
          .neq("id", editTarget?.id ?? "");
      if (editTarget) {
        const { error: e } = await supabase
          .from("semesters")
          .update(form)
          .eq("id", editTarget.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("semesters").insert(form);
        if (e) throw e;
      }
      setDialogOpen(false);
      loadSemesters();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleScheduling = async (row) => {
    await supabase
      .from("semesters")
      .update({ scheduling_open: !row.scheduling_open })
      .eq("id", row.id);
    loadSemesters();
  };
  const toggleActive = async (row) => {
    if (!row.is_active)
      await supabase
        .from("semesters")
        .update({ is_active: false })
        .neq("id", row.id);
    await supabase
      .from("semesters")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    loadSemesters();
  };

  const activeSemester = semesters.find((s) => s.is_active);

  const columns = [
    {
      field: "name",
      headerName: "Semester",
      flex: 1.2,
      minWidth: 160,
      renderCell: (p) => (
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}
        >
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
          {p.row.is_active && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1,
                py: 0.25,
                borderRadius: "10px",
                backgroundColor: GOLD_08,
              }}
            >
              <Box
                sx={{
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  backgroundColor: GOLD,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: "#b45309",
                }}
              >
                Active
              </Typography>
            </Box>
          )}
        </Box>
      ),
    },
    {
      field: "start_date",
      headerName: "Start Date",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => <MetaCell>{fmt(p.value)}</MetaCell>,
    },
    {
      field: "end_date",
      headerName: "End Date",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => <MetaCell>{fmt(p.value)}</MetaCell>,
    },
    {
      field: "scheduling_open",
      headerName: "Scheduling",
      flex: 0.8,
      minWidth: 120,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              px: 1.25,
              py: 0.35,
              borderRadius: "10px",
              backgroundColor: p.value
                ? "#eff6ff"
                : isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(53,53,53,0.04)",
            }}
          >
            {p.value ? (
              <LockOpenOutlinedIcon sx={{ fontSize: 11, color: "#1d4ed8" }} />
            ) : (
              <LockOutlinedIcon
                sx={{ fontSize: 11, color: "text.secondary" }}
              />
            )}
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 600,
                color: p.value ? "#1d4ed8" : "text.secondary",
                letterSpacing: "0.04em",
              }}
            >
              {p.value ? "Open" : "Closed"}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "",
      flex: 0.8,
      minWidth: 120,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 0.75,
            height: "100%",
            pr: 0.5,
          }}
        >
          <ActionChip
            active={p.row.is_active}
            onClick={() => toggleActive(p.row)}
            activeColor="#15803d"
            activeBg="#f0fdf4"
            icon={
              p.row.is_active ? (
                <CheckCircleOutlineIcon sx={{ fontSize: 12 }} />
              ) : (
                <RadioButtonUncheckedIcon sx={{ fontSize: 12 }} />
              )
            }
            border={border}
          >
            {p.row.is_active ? "Active" : "Set Active"}
          </ActionChip>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setMenuAnchor(e.currentTarget);
              setMenuRow(p.row);
            }}
          >
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "#ffffff",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: dm,
      }}
    >
      {/* ── Column menu styles ── */}
      <ColumnMenuStyles isDark={isDark} border={border} />

      {/* ── Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          mb: 3,
          flexWrap: "wrap",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: "1.05rem",
              color: "text.primary",
              letterSpacing: "-0.02em",
            }}
          >
            Semester Management
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.secondary",
              mt: 0.3,
            }}
          >
            Manage semesters and control when staffers can pick their duty days.
          </Typography>
        </Box>
        <Box
          onClick={openCreate}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.75,
            py: 0.75,
            borderRadius: "10px",
            cursor: "pointer",
            backgroundColor: "#212121",
            color: "#fff",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            transition: "background-color 0.15s",
            "&:hover": { backgroundColor: "#333" },
          }}
        >
          <AddIcon sx={{ fontSize: 15 }} />
          New Semester
        </Box>
      </Box>

      {/* ── Active semester banner ── */}
      {activeSemester && (
        <Box
          sx={{
            mb: 3,
            px: 2.5,
            py: 1.75,
            borderRadius: "10px",
            border: `1px solid rgba(245,197,43,0.35)`,
            backgroundColor: isDark ? GOLD_08 : "#fefce8",
            display: "flex",
            alignItems: "center",
            gap: 3,
            flexWrap: "wrap",
            flexShrink: 0,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: GOLD,
                boxShadow: `0 0 6px ${GOLD}`,
                animation: "blink 2s ease-in-out infinite",
                "@keyframes blink": {
                  "0%,100%": { opacity: 1 },
                  "50%": { opacity: 0.35 },
                },
              }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.65rem",
                fontWeight: 700,
                color: "#b45309",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Active Semester
            </Typography>
          </Box>
          <Box
            sx={{
              width: "1px",
              height: 24,
              backgroundColor: "rgba(245,197,43,0.3)",
            }}
          />
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.88rem",
                color: "text.primary",
              }}
            >
              {activeSemester.name}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
            <CalendarTodayOutlinedIcon
              sx={{ fontSize: 12, color: "text.secondary" }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.76rem",
                color: "text.secondary",
              }}
            >
              {fmt(activeSemester.start_date)} — {fmt(activeSemester.end_date)}
            </Typography>
          </Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              px: 1.25,
              py: 0.35,
              borderRadius: "10px",
              backgroundColor: activeSemester.scheduling_open
                ? "#eff6ff"
                : isDark
                  ? "rgba(255,255,255,0.04)"
                  : "rgba(53,53,53,0.04)",
            }}
          >
            {activeSemester.scheduling_open ? (
              <LockOpenOutlinedIcon sx={{ fontSize: 11, color: "#1d4ed8" }} />
            ) : (
              <LockOutlinedIcon
                sx={{ fontSize: 11, color: "text.secondary" }}
              />
            )}
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 600,
                color: activeSemester.scheduling_open
                  ? "#1d4ed8"
                  : "text.secondary",
              }}
            >
              {activeSemester.scheduling_open
                ? "Scheduling Open"
                : "Scheduling Closed"}
            </Typography>
          </Box>
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

      {/* ── Table ── */}
      <Box sx={{ flex: 1, minHeight: 0, width: "100%", overflowX: "auto" }}>
        <Box
          sx={{
            minWidth: 680,
            height: "100%",
            bgcolor: "#f7f7f8",
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
              rows={semesters.map((s) => ({ ...s }))}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10]}
              rowHeight={52}
              disableRowSelectionOnClick
              showToolbar={false}
            />
          )}
        </Box>
      </Box>

      {/* ── Row action menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => { setMenuAnchor(null); setMenuRow(null); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 180,
              borderRadius: "10px",
              mt: 0.5,
              boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
            },
          },
        }}
      >
        {menuRow && (
          <MenuItem
            onClick={() => {
              toggleScheduling(menuRow);
              setMenuAnchor(null);
              setMenuRow(null);
            }}
            sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}
          >
            <ListItemIcon>
              {menuRow.scheduling_open ? (
                <LockOutlinedIcon sx={{ fontSize: 18 }} />
              ) : (
                <LockOpenOutlinedIcon sx={{ fontSize: 18 }} />
              )}
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}>
              {menuRow.scheduling_open ? "Close Scheduling" : "Open Scheduling"}
            </ListItemText>
          </MenuItem>
        )}
        {menuRow && (
          <MenuItem
            onClick={() => {
              openEdit(menuRow);
              setMenuAnchor(null);
              setMenuRow(null);
            }}
            sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}
          >
            <ListItemIcon>
              <EditOutlinedIcon sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}>
              Edit
            </ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "10px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box
              sx={{
                width: 2.5,
                height: 26,
                borderRadius: "10px",
                backgroundColor: GOLD,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.92rem",
                color: "text.primary",
              }}
            >
              {editTarget ? "Edit Semester" : "New Semester"}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setDialogOpen(false)}
            disabled={saving}
            sx={{
              borderRadius: "10px",
              color: "text.secondary",
              "&:hover": { backgroundColor: HOVER_BG },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box
          sx={{
            px: 3,
            py: 2.5,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          {saveError && (
            <Alert
              severity="error"
              sx={{ borderRadius: "10px", fontFamily: dm, fontSize: "0.78rem" }}
            >
              {saveError}
            </Alert>
          )}
          <TextField
            label="Semester Name"
            placeholder='e.g. "1st Sem 2025-2026"'
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
            sx={inputSx(border)}
          />
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <TextField
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, start_date: e.target.value }))
              }
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ ...inputSx(border), flex: "1 1 140px" }}
            />
            <TextField
              label="End Date"
              type="date"
              value={form.end_date}
              onChange={(e) =>
                setForm((f) => ({ ...f, end_date: e.target.value }))
              }
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              sx={{ ...inputSx(border), flex: "1 1 140px" }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap", pt: 0.5 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, is_active: e.target.checked }))
                  }
                  size="small"
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: GOLD },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: GOLD,
                    },
                    "& .MuiSwitch-track": {
                      backgroundColor: "rgba(53,53,53,0.2)",
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    color: "text.primary",
                  }}
                >
                  Set as Active
                </Typography>
              }
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.scheduling_open}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      scheduling_open: e.target.checked,
                    }))
                  }
                  size="small"
                  sx={{
                    "& .MuiSwitch-switchBase.Mui-checked": { color: "#1d4ed8" },
                    "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                      backgroundColor: "#1d4ed8",
                    },
                    "& .MuiSwitch-track": {
                      backgroundColor: "rgba(53,53,53,0.2)",
                    },
                  }}
                />
              }
              label={
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    color: "text.primary",
                  }}
                >
                  Open Scheduling
                </Typography>
              }
            />
          </Box>
          {form.is_active && (
            <Box
              sx={{
                display: "flex",
                gap: 1,
                px: 1.5,
                py: 1.25,
                borderRadius: "10px",
                backgroundColor: isDark ? GOLD_08 : "#fefce8",
                border: `1px solid rgba(245,197,43,0.3)`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.76rem",
                  color: "#b45309",
                  lineHeight: 1.55,
                }}
              >
                Setting this as active will deactivate the current active
                semester.
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            px: 3,
            py: 1.75,
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.01)"
              : "rgba(53,53,53,0.01)",
          }}
        >
          <Box
            onClick={() => !saving && setDialogOpen(false)}
            sx={{
              px: 1.75,
              py: 0.65,
              borderRadius: "10px",
              cursor: saving ? "default" : "pointer",
              border: `1px solid ${border}`,
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "text.secondary",
              opacity: saving ? 0.5 : 1,
              transition: "all 0.15s",
              "&:hover": {
                borderColor: "rgba(53,53,53,0.2)",
                color: "text.primary",
                backgroundColor: HOVER_BG,
              },
            }}
          >
            Cancel
          </Box>
          <Box
            onClick={!saving ? handleSave : undefined}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              px: 1.75,
              py: 0.65,
              borderRadius: "10px",
              cursor: saving ? "default" : "pointer",
              backgroundColor: "#212121",
              color: "#fff",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 600,
              opacity: saving ? 0.7 : 1,
              transition: "background-color 0.15s",
              "&:hover": { backgroundColor: saving ? "#212121" : "#333" },
            }}
          >
            {saving ? (
              <>
                <CircularProgress size={13} sx={{ color: "#fff" }} /> Saving…
              </>
            ) : editTarget ? (
              "Save Changes"
            ) : (
              "Create Semester"
            )}
          </Box>
        </Box>
      </Dialog>
    </Box>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
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

function ActionChip({
  children,
  onClick,
  active,
  activeColor,
  activeBg,
  icon,
  border,
}) {
  return (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1.25,
        py: 0.45,
        borderRadius: "10px",
        cursor: "pointer",
        border: `1px solid ${active ? `${activeColor}30` : border}`,
        backgroundColor: active ? activeBg : "transparent",
        fontFamily: dm,
        fontSize: "0.72rem",
        fontWeight: 500,
        color: active ? activeColor : "text.secondary",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        "&:hover": {
          borderColor: active ? activeColor : "rgba(53,53,53,0.2)",
          backgroundColor: active ? activeBg : HOVER_BG,
        },
      }}
    >
      {icon}
      {children}
    </Box>
  );
}

function inputSx(border) {
  return {
    "& .MuiOutlinedInput-root": {
      fontFamily: dm,
      fontSize: "0.82rem",
      borderRadius: "10px",
      "& fieldset": { borderColor: border },
      "&:hover fieldset": { borderColor: "rgba(245,197,43,0.5)" },
      "&.Mui-focused fieldset": { borderColor: "#F5C52B" },
    },
    "& .MuiInputLabel-root": { fontFamily: dm, fontSize: "0.8rem" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#b45309" },
  };
}
