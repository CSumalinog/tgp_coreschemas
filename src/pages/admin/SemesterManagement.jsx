// src/pages/admin/SemesterManagement.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Button, Typography, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, Alert, IconButton, Divider,
  TextField, Switch, FormControlLabel, Card, CardContent,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LockOpenOutlinedIcon from "@mui/icons-material/LockOpenOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";
import { supabase } from "../../lib/supabaseClient";

const EMPTY_FORM = {
  name: "",
  start_date: "",
  end_date: "",
  is_active: false,
  scheduling_open: false,
};

export default function SemesterManagement() {
  const [semesters, setSemesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = create mode
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Load semesters ──
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

  useEffect(() => { loadSemesters(); }, [loadSemesters]);

  // ── Open dialog ──
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

  // ── Save ──
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
      // If setting this semester as active, deactivate all others first
      if (form.is_active) {
        await supabase.from("semesters").update({ is_active: false }).neq("id", editTarget?.id ?? "");
      }

      if (editTarget) {
        const { error: updErr } = await supabase
          .from("semesters")
          .update(form)
          .eq("id", editTarget.id);
        if (updErr) throw updErr;
      } else {
        const { error: insErr } = await supabase
          .from("semesters")
          .insert(form);
        if (insErr) throw insErr;
      }

      setDialogOpen(false);
      loadSemesters();
    } catch (err) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  // ── Quick toggle scheduling_open ──
  const toggleScheduling = async (row) => {
    await supabase
      .from("semesters")
      .update({ scheduling_open: !row.scheduling_open })
      .eq("id", row.id);
    loadSemesters();
  };

  // ── Quick toggle is_active ──
  const toggleActive = async (row) => {
    if (!row.is_active) {
      // Deactivate all, then activate this one
      await supabase.from("semesters").update({ is_active: false }).neq("id", row.id);
    }
    await supabase
      .from("semesters")
      .update({ is_active: !row.is_active })
      .eq("id", row.id);
    loadSemesters();
  };

  // ── Summary cards ──
  const activeSemester = semesters.find((s) => s.is_active);

  // ── Columns ──
  const columns = [
    {
      field: "name", headerName: "Semester", flex: 1.2,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>{params.value}</Typography>
          {params.row.is_active && (
            <Chip label="Active" size="small" sx={{ fontSize: "0.7rem", backgroundColor: "#e8f5e9", color: "#2e7d32", fontWeight: 600 }} />
          )}
        </Box>
      ),
    },
    {
      field: "start_date", headerName: "Start Date", flex: 0.8,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.88rem" }}>
            {params.value ? new Date(params.value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "end_date", headerName: "End Date", flex: 0.8,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.88rem" }}>
            {params.value ? new Date(params.value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
          </Typography>
        </Box>
      ),
    },
    {
      field: "scheduling_open", headerName: "Scheduling", flex: 0.8,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip
            label={params.value ? "Open" : "Closed"}
            size="small"
            icon={params.value ? <LockOpenOutlinedIcon sx={{ fontSize: "14px !important" }} /> : <LockOutlinedIcon sx={{ fontSize: "14px !important" }} />}
            sx={{
              fontSize: "0.78rem",
              fontWeight: 600,
              backgroundColor: params.value ? "#e3f2fd" : "#fafafa",
              color: params.value ? "#1565c0" : "#9e9e9e",
              border: "1px solid",
              borderColor: params.value ? "#90caf9" : "#e0e0e0",
            }}
          />
        </Box>
      ),
    },
    {
      field: "actions", headerName: "Actions", flex: 1, sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, height: "100%" }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toggleActive(params.row)}
            startIcon={params.row.is_active ? <CheckCircleOutlineIcon sx={{ fontSize: 14 }} /> : <RadioButtonUncheckedIcon sx={{ fontSize: 14 }} />}
            sx={{
              textTransform: "none",
              fontSize: "0.78rem",
              borderColor: params.row.is_active ? "#a5d6a7" : "#e0e0e0",
              color: params.row.is_active ? "#2e7d32" : "#9e9e9e",
              "&:hover": { borderColor: "#2e7d32", color: "#2e7d32" },
            }}
          >
            {params.row.is_active ? "Active" : "Set Active"}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => toggleScheduling(params.row)}
            sx={{
              textTransform: "none",
              fontSize: "0.78rem",
              borderColor: params.row.scheduling_open ? "#90caf9" : "#e0e0e0",
              color: params.row.scheduling_open ? "#1565c0" : "#9e9e9e",
              "&:hover": { borderColor: "#1565c0", color: "#1565c0" },
            }}
          >
            {params.row.scheduling_open ? "Close" : "Open"} Scheduling
          </Button>
          <IconButton size="small" onClick={() => openEdit(params.row)}>
            <EditOutlinedIcon sx={{ fontSize: 16, color: "#757575" }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  const rows = semesters.map((s) => ({ ...s }));

  return (
    <Box sx={{ p: 3, backgroundColor: "#f9f9f9", minHeight: "100%" }}>
      {/* Header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "#212121" }}>
            Semester Management
          </Typography>
          <Typography sx={{ fontSize: "0.8rem", color: "#9e9e9e", mt: 0.3 }}>
            Manage semesters and control when staffers can pick their duty days.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openCreate}
          sx={{
            textTransform: "none",
            backgroundColor: "#f5c52b",
            color: "#212121",
            fontWeight: 600,
            boxShadow: "none",
            "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
          }}
        >
          New Semester
        </Button>
      </Box>

      {/* Active semester summary card */}
      {activeSemester && (
        <Card
          elevation={0}
          sx={{ mb: 3, border: "1px solid #f5c52b", borderRadius: 2, backgroundColor: "#fffde7" }}
        >
          <CardContent sx={{ py: 1.5, px: 2.5, "&:last-child": { pb: 1.5 } }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
              <Box>
                <Typography sx={{ fontSize: "0.72rem", color: "#f57c00", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Active Semester
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "#212121" }}>
                  {activeSemester.name}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ borderColor: "#ffe082" }} />
              <Box>
                <Typography sx={{ fontSize: "0.72rem", color: "#9e9e9e" }}>Period</Typography>
                <Typography sx={{ fontSize: "0.85rem", color: "#212121" }}>
                  {new Date(activeSemester.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {" — "}
                  {new Date(activeSemester.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </Typography>
              </Box>
              <Divider orientation="vertical" flexItem sx={{ borderColor: "#ffe082" }} />
              <Box>
                <Typography sx={{ fontSize: "0.72rem", color: "#9e9e9e" }}>Scheduling</Typography>
                <Chip
                  label={activeSemester.scheduling_open ? "Open — Staffers can pick their day" : "Closed"}
                  size="small"
                  sx={{
                    fontSize: "0.78rem",
                    fontWeight: 600,
                    backgroundColor: activeSemester.scheduling_open ? "#e3f2fd" : "#f5f5f5",
                    color: activeSemester.scheduling_open ? "#1565c0" : "#9e9e9e",
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

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
            pageSize={7}
            rowsPerPageOptions={[7]}
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

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={() => !saving && setDialogOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>
            {editTarget ? "Edit Semester" : "New Semester"}
          </Typography>
          <IconButton size="small" onClick={() => setDialogOpen(false)} disabled={saving}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <Divider />

        <DialogContent sx={{ pt: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          {saveError && <Alert severity="error" sx={{ borderRadius: 2 }}>{saveError}</Alert>}

          <TextField
            label="Semester Name"
            placeholder='e.g. "1st Sem 2025-2026"'
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            size="small"
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              label="Start Date"
              type="date"
              value={form.start_date}
              onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End Date"
              type="date"
              value={form.end_date}
              onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Box>

          <Box sx={{ display: "flex", gap: 3 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={form.is_active}
                  onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                  sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#f5c52b" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#f5c52b" } }}
                />
              }
              label={<Typography sx={{ fontSize: "0.88rem" }}>Set as Active Semester</Typography>}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.scheduling_open}
                  onChange={(e) => setForm((f) => ({ ...f, scheduling_open: e.target.checked }))}
                  sx={{ "& .MuiSwitch-switchBase.Mui-checked": { color: "#1976d2" }, "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#1976d2" } }}
                />
              }
              label={<Typography sx={{ fontSize: "0.88rem" }}>Open Scheduling</Typography>}
            />
          </Box>

          {form.is_active && (
            <Alert severity="warning" sx={{ borderRadius: 2, fontSize: "0.82rem" }}>
              Setting this as active will deactivate the current active semester.
            </Alert>
          )}
        </DialogContent>

        <Divider />
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={saving} sx={{ textTransform: "none", color: "#757575" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{ textTransform: "none", backgroundColor: "#f5c52b", color: "#212121", fontWeight: 600, boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}
          >
            {saving ? <CircularProgress size={18} sx={{ color: "#212121" }} /> : editTarget ? "Save Changes" : "Create Semester"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}