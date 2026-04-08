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
  RadioGroup,
  Radio,
  useTheme,
  GlobalStyles,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { format as formatDate } from "date-fns";
import { DataGrid } from "../../components/common/AppDataGrid";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { supabase } from "../../lib/supabaseClient";
import BrandedLoader from "../../components/common/BrandedLoader";
import {
  inferSemesterChoice,
  inferAcademicYearStart,
  buildSemesterName,
  getAcademicYearLabel,
  getSemesterDisplayName,
} from "../../utils/semesterLabel";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

const EMPTY_FORM = {
  semester: "1st",
  academic_year_start: "",
  start_date: "",
  end_date: "",
  is_active: false,
  scheduling_open: false,
};

const SEMESTER_STATES = {
  DRAFT: "draft",
  ACTIVE_OPEN: "active_open",
  ACTIVE_CLOSED: "active_closed",
  COMPLETED: "completed",
};

const SEMESTER_STATE_RULES = {
  [SEMESTER_STATES.DRAFT]: {
    label: "Draft",
    isCurrent: false,
    canSetActive: true,
  },
  [SEMESTER_STATES.ACTIVE_OPEN]: {
    label: "Current",
    isCurrent: true,
    canSetActive: false,
    schedulingLabel: "Open",
    schedulingColor: "#1d4ed8",
    schedulingBg: "#eff6ff",
    schedulingBorder: "rgba(29,78,216,0.18)",
  },
  [SEMESTER_STATES.ACTIVE_CLOSED]: {
    label: "Current",
    isCurrent: true,
    canSetActive: false,
    schedulingLabel: "Closed",
    schedulingColor: "text.secondary",
    schedulingBgLight: "rgba(53,53,53,0.04)",
    schedulingBgDark: "rgba(255,255,255,0.04)",
  },
  [SEMESTER_STATES.COMPLETED]: {
    label: "Completed",
    isCurrent: false,
    canSetActive: true,
  },
};

const getSemesterState = (row) => {
  if (!row) return SEMESTER_STATES.DRAFT;
  if (row.is_active) {
    return row.scheduling_open
      ? SEMESTER_STATES.ACTIVE_OPEN
      : SEMESTER_STATES.ACTIVE_CLOSED;
  }

  if (row.end_date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(`${row.end_date}T00:00:00`);
    if (!Number.isNaN(endDate.getTime()) && endDate < today) {
      return SEMESTER_STATES.COMPLETED;
    }
  }

  return SEMESTER_STATES.DRAFT;
};

const parseDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(`${value}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const getCurrentAcademicYearStart = (date = new Date()) => {
  const year = date.getFullYear();
  return date.getMonth() >= 6 ? year : year - 1;
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
  const [confirmAction, setConfirmAction] = useState(null);
  const [confirmingAction, setConfirmingAction] = useState(false);
  const currentAcademicYearStart = getCurrentAcademicYearStart();
  const editAcademicYearStart = editTarget
    ? Number.parseInt(
        inferAcademicYearStart({
          name: editTarget.name,
          start_date: editTarget.start_date,
          semester: inferSemesterChoice(editTarget.name),
        }),
        10,
      )
    : null;
  const minAcademicYearStart =
    editAcademicYearStart && !Number.isNaN(editAcademicYearStart)
      ? Math.min(currentAcademicYearStart, editAcademicYearStart)
      : currentAcademicYearStart;
  const parsedAcademicYearStart = Number.parseInt(form.academic_year_start, 10);
  const hasPastAcademicYear =
    form.academic_year_start.length === 4 &&
    !Number.isNaN(parsedAcademicYearStart) &&
    parsedAcademicYearStart < minAcademicYearStart;
  const academicYearErrorMessage = hasPastAcademicYear
    ? `Minimum allowed is ${minAcademicYearStart}`
    : "";

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
    const semester = inferSemesterChoice(row.name);
    setEditTarget(row);
    setForm({
      semester,
      academic_year_start: inferAcademicYearStart({
        name: row.name,
        start_date: row.start_date,
        semester,
      }),
      start_date: row.start_date,
      end_date: row.end_date,
      is_active: row.is_active,
      scheduling_open: row.scheduling_open,
    });
    setSaveError("");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.semester || !form.academic_year_start || !form.start_date || !form.end_date) {
      setSaveError("Please fill in all fields.");
      return;
    }
    if (!/^\d{4}$/.test(form.academic_year_start)) {
      setSaveError("Academic year must start with a valid 4-digit year.");
      return;
    }
    if (parsedAcademicYearStart < minAcademicYearStart) {
      setSaveError(`Academic year cannot be earlier than ${minAcademicYearStart}.`);
      return;
    }
    if (form.start_date >= form.end_date) {
      setSaveError("End date must be after start date.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      const payload = {
        name: buildSemesterName(form),
        start_date: form.start_date,
        end_date: form.end_date,
        is_active: form.is_active,
        scheduling_open: form.scheduling_open,
      };

      if (form.is_active) {
        let deactivateQuery = supabase
          .from("semesters")
          .update({ is_active: false })
          .eq("is_active", true);

        if (editTarget?.id) {
          deactivateQuery = deactivateQuery.neq("id", editTarget.id);
        }

        const { error: deactivateError } = await deactivateQuery;
        if (deactivateError) throw deactivateError;
      }

      if (editTarget) {
        const { error: e } = await supabase
          .from("semesters")
          .update(payload)
          .eq("id", editTarget.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("semesters").insert(payload);
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
    if (!row?.id) return false;

    setError("");
    const { error: toggleErr } = await supabase
      .from("semesters")
      .update({ scheduling_open: !row.scheduling_open })
      .eq("id", row.id);

    if (toggleErr) {
      setError(toggleErr.message || "Failed to update scheduling state.");
      return false;
    }

    await loadSemesters();
    return true;
  };

  const toggleActive = async (row) => {
    if (!row?.id) return false;

    setError("");

    if (!row.is_active) {
      const { error: clearErr } = await supabase
        .from("semesters")
        .update({ is_active: false })
        .neq("id", row.id);

      if (clearErr) {
        setError(clearErr.message || "Failed to update active semester.");
        return false;
      }
    }

    const { error: toggleErr } = await supabase
      .from("semesters")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);

    if (toggleErr) {
      setError(toggleErr.message || "Failed to update active semester.");
      return false;
    }

    await loadSemesters();
    return true;
  };

  const openSchedulingConfirm = (row) => {
    setConfirmAction({ type: "scheduling", row });
  };

  const openActiveConfirm = (row) => {
    setConfirmAction({ type: "active", row });
  };

  const closeConfirmDialog = () => {
    if (confirmingAction) return;
    setConfirmAction(null);
  };

  const getRuleForRow = (row) => {
    const state = getSemesterState(row);
    return (
      SEMESTER_STATE_RULES[state] || SEMESTER_STATE_RULES[SEMESTER_STATES.DRAFT]
    );
  };

  const confirmTargetRule = confirmAction?.row
    ? getRuleForRow(confirmAction.row)
    : null;

  const confirmActionLabel =
    confirmAction?.type === "scheduling"
      ? confirmAction?.row?.scheduling_open
        ? "Close Scheduling"
        : "Open Scheduling"
      : confirmAction?.type === "active"
        ? confirmAction?.row?.is_active
          ? "Deactivate Semester"
          : "Set Active"
        : "Confirm Action";

  const confirmActionDescription =
    confirmAction?.type === "scheduling"
      ? confirmAction?.row?.scheduling_open
        ? "Closing scheduling prevents regular staff from submitting or changing duty-day requests. Pending requests can still be reviewed by admins."
        : "Opening scheduling allows regular staff to submit and update duty-day requests for this semester."
      : confirmAction?.type === "active"
        ? confirmTargetRule?.isCurrent
          ? "This will remove the active status from this semester. Active-semester dependent screens may no longer show semester-scoped data until another semester is set active."
          : "This semester will become active and the current active semester will be automatically deactivated."
        : "";

  const handleConfirmAction = async () => {
    if (!confirmAction?.row) return;

    setConfirmingAction(true);

    try {
      if (confirmAction.type === "scheduling") {
        await toggleScheduling(confirmAction.row);
      } else if (confirmAction.type === "active") {
        await toggleActive(confirmAction.row);
      }
    } finally {
      setConfirmingAction(false);
      setConfirmAction(null);
    }
  };

  const columns = [
    {
      field: "name",
      headerName: "Semester",
      flex: 1.2,
      minWidth: 160,
      renderCell: (p) => {
        const rowRule = getRuleForRow(p.row);

        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              height: "100%",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.82rem",
                fontWeight: 500,
                color: "text.primary",
              }}
            >
              {getSemesterDisplayName(p.row)}
            </Typography>
            {rowRule.isCurrent && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.45,
                  px: 0.8,
                  py: 0.18,
                  borderRadius: "10px",
                  border: "1px solid rgba(21,128,61,0.14)",
                  backgroundColor: "rgba(34,197,94,0.06)",
                  color: "#15803d",
                }}
              >
                <CheckCircleOutlineIcon sx={{ fontSize: 10 }} />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.62rem",
                    fontWeight: 600,
                    color: "#15803d",
                  }}
                >
                  {rowRule.label}
                </Typography>
              </Box>
            )}
          </Box>
        );
      },
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
      renderCell: (p) => {
        const rowRule = getRuleForRow(p.row);
        const isOpen = p.value;
        const chipColor = isOpen
          ? rowRule.schedulingColor || "#1d4ed8"
          : rowRule.schedulingColor || "text.secondary";
        const chipBg = isOpen
          ? rowRule.schedulingBg || "#eff6ff"
          : isDark
            ? rowRule.schedulingBgDark || "rgba(255,255,255,0.04)"
            : rowRule.schedulingBgLight || "rgba(53,53,53,0.04)";

        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              onClick={() => openSchedulingConfirm(p.row)}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.25,
                py: 0.35,
                borderRadius: "10px",
                border: `1px solid ${isOpen ? rowRule.schedulingBorder || "rgba(29,78,216,0.18)" : border}`,
                backgroundColor: chipBg,
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": {
                  borderColor: isOpen
                    ? "rgba(29,78,216,0.35)"
                    : "rgba(53,53,53,0.2)",
                  backgroundColor: isOpen
                    ? "#e7f0ff"
                    : isDark
                      ? "rgba(255,255,255,0.06)"
                      : "rgba(53,53,53,0.08)",
                },
              }}
            >
              {isOpen ? (
                <LockOpenOutlinedIcon sx={{ fontSize: 11, color: chipColor }} />
              ) : (
                <LockOutlinedIcon sx={{ fontSize: 11, color: chipColor }} />
              )}
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: chipColor,
                  letterSpacing: "0.04em",
                }}
              >
                {isOpen ? rowRule.schedulingLabel || "Open" : "Closed"}
              </Typography>
            </Box>
          </Box>
        );
      },
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
          {getRuleForRow(p.row).canSetActive && (
            <ActionChip
              active={false}
              onClick={() => openActiveConfirm(p.row)}
              activeColor="#15803d"
              activeBg="rgba(34,197,94,0.08)"
              icon={<RadioButtonUncheckedIcon sx={{ fontSize: 12 }} />}
              border={border}
            >
              Set Active
            </ActionChip>
          )}
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
              <BrandedLoader size={44} inline />
            </Box>
          ) : (
            <DataGrid
              rows={semesters.map((s) => ({ ...s }))}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10]}
              rowHeight={56}
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
        onClose={() => {
          setMenuAnchor(null);
          setMenuRow(null);
        }}
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
              openEdit(menuRow);
              setMenuAnchor(null);
              setMenuRow(null);
            }}
            sx={{ fontFamily: dm, fontSize: "0.82rem", gap: 1 }}
          >
            <ListItemIcon>
              <EditOutlinedIcon sx={{ fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText
              primaryTypographyProps={{ fontFamily: dm, fontSize: "0.82rem" }}
            >
              Edit
            </ListItemText>
          </MenuItem>
        )}
      </Menu>

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={dialogOpen}
        onClose={() => {
          if (saving) return;
          setDialogOpen(false);
        }}
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
            <Typography sx={{ fontSize: "0.875rem", fontWeight: 500 }}>
              Semester:
            </Typography>
            <RadioGroup
              row
              value={form.semester ?? "1st"}
              onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
              sx={{
                gap: 2,
                "& .MuiFormControlLabel-label": {
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  fontFamily: dm,
                  color: "text.primary",
                },
              }}
            >
              <FormControlLabel
                value="1st"
                control={<Radio size="small" />}
                label="1st Semester"
              />
              <FormControlLabel
                value="2nd"
                control={<Radio size="small" />}
                label="2nd Semester"
              />
            </RadioGroup>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.6 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, flexWrap: "wrap" }}>
                <TextField
                  label="A.Y. Start"
                  value={form.academic_year_start}
                  onChange={(e) => {
                    const nextValue = e.target.value.replace(/\D/g, "").slice(0, 4);
                    setForm((f) => ({ ...f, academic_year_start: nextValue }));
                  }}
                  error={hasPastAcademicYear}
                  size="small"
                  placeholder="2026"
                  slotProps={{
                    htmlInput: {
                      inputMode: "numeric",
                      pattern: "[0-9]*",
                      maxLength: 4,
                    },
                  }}
                  sx={{
                    ...inputSx(border),
                    width: 118,
                    "& .MuiOutlinedInput-root": {
                      ...inputSx(border)["& .MuiOutlinedInput-root"],
                      fontSize: "0.8rem",
                    },
                  }}
                />
                <Typography
                  sx={{
                    fontSize: "0.875rem",
                    fontWeight: 500,
                    fontFamily: dm,
                    color: "text.secondary",
                  }}
                >
                  {getAcademicYearLabel(form)}
                </Typography>
              </Box>
              {academicYearErrorMessage && (
                <Typography
                  sx={{
                    fontSize: "0.74rem",
                    fontWeight: 500,
                    fontFamily: dm,
                    color: "error.main",
                    ml: 0.25,
                    lineHeight: 1.2,
                  }}
                >
                  {academicYearErrorMessage}
                </Typography>
              )}
            </Box>
          </Box>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
              <DatePicker
                label="Start Date"
                format="dd/MM/yyyy"
                value={parseDateValue(form.start_date)}
                onChange={(nextDate) => {
                  setForm((f) => ({
                    ...f,
                    start_date: nextDate ? formatDate(nextDate, "yyyy-MM-dd") : "",
                  }));
                }}
                slotProps={datePickerSlotProps(border)}
              />

              <DatePicker
                label="End Date"
                format="dd/MM/yyyy"
                value={parseDateValue(form.end_date)}
                onChange={(nextDate) => {
                  setForm((f) => ({
                    ...f,
                    end_date: nextDate ? formatDate(nextDate, "yyyy-MM-dd") : "",
                  }));
                }}
                slotProps={datePickerSlotProps(border)}
              />
            </Box>
          </LocalizationProvider>
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

      <Dialog
        open={Boolean(confirmAction)}
        onClose={closeConfirmDialog}
        fullWidth
        maxWidth="xs"
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
            px: 2.5,
            py: 1.75,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: "0.9rem",
              color: "text.primary",
            }}
          >
            {confirmActionLabel}
          </Typography>
          <IconButton
            size="small"
            onClick={closeConfirmDialog}
            disabled={confirmingAction}
            sx={{
              borderRadius: "10px",
              color: "text.secondary",
              "&:hover": { backgroundColor: HOVER_BG },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box sx={{ px: 2.5, py: 2 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              color: "text.secondary",
              lineHeight: 1.6,
            }}
          >
            {confirmActionDescription}
          </Typography>
        </Box>

        <Box
          sx={{
            px: 2.5,
            py: 1.5,
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
            onClick={closeConfirmDialog}
            sx={{
              px: 1.5,
              py: 0.6,
              borderRadius: "10px",
              cursor: confirmingAction ? "default" : "pointer",
              border: `1px solid ${border}`,
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
              color: "text.secondary",
              opacity: confirmingAction ? 0.5 : 1,
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
            onClick={!confirmingAction ? handleConfirmAction : undefined}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.65,
              px: 1.5,
              py: 0.6,
              borderRadius: "10px",
              cursor: confirmingAction ? "default" : "pointer",
              backgroundColor: "#212121",
              color: "#fff",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 600,
              opacity: confirmingAction ? 0.7 : 1,
              "&:hover": {
                backgroundColor: confirmingAction ? "#212121" : "#333",
              },
            }}
          >
            {confirmingAction ? (
              <>
                <CircularProgress size={13} sx={{ color: "#fff" }} />
                Applying...
              </>
            ) : (
              "Confirm"
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
  disabled = false,
  compact = false,
  subtle = false,
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
        px: subtle ? 0.85 : 1.25,
        py: subtle ? 0.22 : compact ? 0.35 : 0.45,
        borderRadius: "10px",
        cursor: disabled ? "default" : "pointer",
        border: `1px solid ${active ? (subtle ? `${activeColor}20` : `${activeColor}30`) : border}`,
        backgroundColor: active ? activeBg : "transparent",
        fontFamily: dm,
        fontSize: subtle ? "0.64rem" : compact ? "0.68rem" : "0.72rem",
        fontWeight: subtle ? 600 : compact ? 600 : 500,
        color: active ? activeColor : "text.secondary",
        transition: "all 0.15s",
        whiteSpace: "nowrap",
        opacity: disabled ? (subtle ? 1 : 0.9) : 1,
        "&:hover": {
          borderColor: disabled
            ? active
              ? subtle
                ? `${activeColor}20`
                : `${activeColor}30`
              : border
            : active
              ? activeColor
              : "rgba(53,53,53,0.2)",
          backgroundColor: disabled
            ? active
              ? activeBg
              : "transparent"
            : active
              ? activeBg
              : HOVER_BG,
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

function datePickerSlotProps(border) {
  return {
    textField: {
      size: "small",
      fullWidth: true,
      sx: { ...inputSx(border), flex: "1 1 140px" },
    },
    desktopPaper: {
      sx: {
        borderRadius: "12px",
        "& .MuiPickersCalendarHeader-label": {
          fontFamily: dm,
          fontSize: "0.88rem",
          fontWeight: 600,
        },
        "& .MuiDayCalendar-weekDayLabel": {
          fontFamily: dm,
          fontSize: "0.72rem",
          fontWeight: 500,
        },
        "& .MuiPickersDay-root": {
          fontFamily: dm,
          fontSize: "0.82rem",
        },
        "& .MuiPickersYear-yearButton, & .MuiPickersMonth-monthButton": {
          fontFamily: dm,
          fontSize: "0.82rem",
        },
        "& .MuiPickersArrowSwitcher-button": {
          transform: "scale(0.9)",
        },
      },
    },
  };
}
