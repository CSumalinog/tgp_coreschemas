// src/pages/admin/StaffersManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Tabs,
  Tab,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import {
  fetchAllStaffers,
  createStafferAccount,
  updateStafferProfile,
  toggleStafferStatus,
  deleteStafferAccount,
} from "../../services/StafferService";
import InputAdornment from "@mui/material/InputAdornment";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";

// ── Options ────────────────────────────────────────────────────────────────
const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sec_head", label: "Section Head" },
  { value: "staff", label: "Staff" },
];

const DIVISIONS = [
  { value: "Executives", label: "Executives" },
  { value: "Scribes", label: "Scribes" },
  { value: "Creatives", label: "Creatives" },
  { value: "Managerial", label: "Managerial" },
];

const SECTIONS_BY_DIVISION = {
  Executives: [
    "EIC",
    "Technical Editor",
    "Managing Editor",
    "Creative Director",
  ],
  Scribes: ["News", "Sports/Opinion", "Feature", "Literary"],
  Creatives: [
    "Newsletter",
    "Photojournalism",
    "Videojournalism",
    "Illustrations",
    "Graphics Design",
  ],
  Managerial: ["HR Manager", "Circulation Manager", "Online Accounts Manager"],
};

const ROLE_COLORS = {
  admin: { bg: "#fff8e1", color: "#f57c00" },
  sec_head: { bg: "#e8f5e9", color: "#388e3c" },
  staff: { bg: "#e3f2fd", color: "#1565c0" },
};

const TABS = ["All", "Executives", "Scribes", "Creatives", "Managerial"];

const EMPTY_FORM = {
  full_name: "",
  email: "",
  password: "",
  role: "staff",
  division: "",
  section: "",
};


// ── Main Component ─────────────────────────────────────────────────────────
export default function StaffersManagement() {
  const [staffers, setStaffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [showPassword, setShowPassword] = useState(false);

  // Create/Edit dialog
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");

  // Toggle status confirmation dialog
  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Delete dialog
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ── Fetch ──
  const loadStaffers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAllStaffers();
      setStaffers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaffers();
  }, [loadStaffers]);

  // ── Tab filtering ──
  const filteredRows = useMemo(
    () =>
      staffers
        .filter((s) => activeTab === "All" || s.division === activeTab)
        .map((s) => ({ id: s.id, ...s })),
    [staffers, activeTab],
  );

  // ── Tab counts ──
  const getCount = (tab) =>
    tab === "All"
      ? staffers.length
      : staffers.filter((s) => s.division === tab).length;

  // ── Form Handlers ──
  const handleOpenCreate = () => {
    setFormMode("create");
    setFormData(EMPTY_FORM);
    setFormError("");
    setFormOpen(true);
  };

  const handleOpenEdit = (row) => {
    setFormMode("edit");
    setSelectedId(row.id);
    setFormData({
      full_name: row.full_name || "",
      email: row.email || "",
      password: "",
      role: row.role || "staff",
      division: row.division || "",
      section: row.section || "",
    });
    setFormError("");
    setFormOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === "division") updated.section = "";
      return updated;
    });
  };

  const handleFormSubmit = async () => {
    setFormError("");

    // Validation
    if (!formData.full_name.trim())
      return setFormError("Full name is required.");
    if (formMode === "create") {
      if (!formData.email.trim()) return setFormError("Email is required.");
      if (!formData.password.trim())
        return setFormError("Password is required.");
      if (formData.password.length < 8)
        return setFormError("Password must be at least 8 characters.");
    }
    if (!formData.role) return setFormError("Role is required.");

    setFormLoading(true);
    try {
      if (formMode === "create") {
        await createStafferAccount({
          full_name: formData.full_name.trim(),
          email: formData.email.trim(),
          password: formData.password,
          role: formData.role,
          division: formData.division || null,
          section: formData.section || null,
        });
      } else {
        await updateStafferProfile(selectedId, {
          full_name: formData.full_name.trim(),
          role: formData.role,
          division: formData.division || null,
          section: formData.section || null,
        });
      }
      setFormOpen(false);
      loadStaffers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
  };

  // ── Toggle Status — open confirmation ──
  const handleOpenToggle = (row) => {
    setToggleTarget(row);
    setToggleOpen(true);
  };

  const handleConfirmToggle = async () => {
    setToggleLoading(true);
    try {
      await toggleStafferStatus(toggleTarget.id, !toggleTarget.is_active);
      setToggleOpen(false);
      setToggleTarget(null);
      loadStaffers();
    } catch (err) {
      setError(err.message);
    } finally {
      setToggleLoading(false);
    }
  };

  // ── Delete ──
  const handleOpenDelete = (row) => {
    setDeleteTarget(row);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteStafferAccount(deleteTarget.id);
      setDeleteOpen(false);
      setDeleteTarget(null);
      loadStaffers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Columns ──
  const columns = useMemo(
    () => [
      {
        field: "full_name",
        headerName: "Full Name",
        flex: 1.2,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography sx={{ fontSize: "0.9rem", fontWeight: 500 }}>
              {params.value || "—"}
            </Typography>
          </Box>
        ),
      },
      {
        field: "role",
        headerName: "Role",
        flex: 0.8,
        renderCell: (params) => {
          const colors = ROLE_COLORS[params.value] || {
            bg: "#f5f5f5",
            color: "#757575",
          };
          const label =
            ROLES.find((r) => r.value === params.value)?.label || params.value;
          return (
            <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
              <Chip
                label={label}
                size="small"
                sx={{
                  fontSize: "0.9rem",
                  fontWeight: 500,
                  backgroundColor: colors.bg,
                  color: colors.color,
                  borderRadius: 2,
                }}
              />
            </Box>
          );
        },
      },
      {
        field: "division",
        headerName: "Division",
        flex: 0.9,
        hide: activeTab !== "All",
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography sx={{ fontSize: "0.9rem", color: "#616161" }}>
              {params.value || "—"}
            </Typography>
          </Box>
        ),
      },
      {
        field: "section",
        headerName: "Position",
        flex: 1,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography sx={{ fontSize: "0.9rem", color: "#616161" }}>
              {params.value || "—"}
            </Typography>
          </Box>
        ),
      },
      {
        field: "is_active",
        headerName: "Status",
        flex: 0.7,
        renderCell: (params) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Chip
              label={params.value ? "Active" : "Inactive"}
              size="small"
              sx={{
                fontSize: "0.9rem",
                fontWeight: 500,
                backgroundColor: params.value ? "#e8f5e9" : "#fdecea",
                color: params.value ? "#388e3c" : "#d32f2f",
                borderRadius: 2,
              }}
            />
          </Box>
        ),
      },
      {
        field: "actions",
        headerName: "Actions",
        flex: 0.8,
        sortable: false,
        renderCell: (params) => (
          <Box
            sx={{
              display: "flex",
              gap: 0.5,
              alignItems: "center",
              height: "100%",
            }}
          >
            <Tooltip title="Edit">
              <IconButton
                size="small"
                onClick={() => handleOpenEdit(params.row)}
              >
                <EditOutlinedIcon sx={{ fontSize: 22, color: "#616161" }} />
              </IconButton>
            </Tooltip>
            <Tooltip title={params.row.is_active ? "Deactivate" : "Reactivate"}>
              <IconButton
                size="small"
                onClick={() => handleOpenToggle(params.row)}
              >
                {params.row.is_active ? (
                  <BlockOutlinedIcon sx={{ fontSize: 22, color: "#f57c00" }} />
                ) : (
                  <CheckCircleOutlineIcon
                    sx={{ fontSize: 22, color: "#388e3c" }}
                  />
                )}
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton
                size="small"
                onClick={() => handleOpenDelete(params.row)}
              >
                <DeleteOutlineOutlinedIcon
                  sx={{ fontSize: 22, color: "#d32f2f" }}
                />
              </IconButton>
            </Tooltip>
          </Box>
        ),
      },
    ],
    [activeTab],
  );

  const availableSections = formData.division
    ? SECTIONS_BY_DIVISION[formData.division] || []
    : [];

  return (
    <Box
      sx={{
        p: 3,
        height: "100%",
        boxSizing: "border-box",
        backgroundColor: "#f9f9f9",
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Typography
          sx={{ fontSize: "0.9rem", color: "#757575", lineHeight: 1 }}
        >
          Manage TGP member accounts — create, edit, deactivate, or remove
          members.
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddOutlinedIcon />}
          onClick={handleOpenCreate}
          sx={{
            textTransform: "none",
            backgroundColor: "#f5c52b",
            color: "#212121",
            fontWeight: 500,
            fontSize: "0.8rem",
            "&:hover": { backgroundColor: "#e6b920" },
            borderRadius: 3,
            px: 2,
          }}
        >
          Add Member
        </Button>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, borderRadius: 2 }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* ── Table Card with Tabs ── */}
      <Box
        sx={{
          bgcolor: "white",
          borderRadius: 2,
          boxShadow: 1,
          overflow: "hidden",
        }}
      >
        {/* Tabs */}
        <Tabs
          value={activeTab}
          onChange={(_, val) => setActiveTab(val)}
          sx={{
            borderBottom: "1px solid #e0e0e0",
            px: 2,
            "& .MuiTab-root": {
              textTransform: "none",
              fontSize: "0.9rem",
              fontFamily: "'Helvetica Neue', sans-serif",
              minHeight: 50,
              color: "#9e9e9e",
            },
            "& .Mui-selected": { color: "#212121", fontWeight: 500 },
            "& .MuiTabs-indicator": { backgroundColor: "#f5c52b", height: 3 },
          }}
        >
          {TABS.map((tab) => (
            <Tab
              key={tab}
              value={tab}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                  {tab}
                  <Chip
                    label={getCount(tab)}
                    size="small"
                    sx={{
                      height: 22,
                      fontSize: "0.8rem",
                      fontWeight: 500,
                      backgroundColor:
                        activeTab === tab ? "#f5c52b" : "#f5f5f5",
                      color: activeTab === tab ? "#212121" : "#9e9e9e",
                      "& .MuiChip-label": { px: 0.8 },
                    }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* DataGrid */}
        <Box sx={{ height: 500 }}>
          {loading ? (
            <Box
              sx={{
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
            </Box>
          ) : (
            <DataGrid
              rows={filteredRows}
              columns={columns}
              columnVisibilityModel={{ division: activeTab === "All" }}
              pageSize={7}
              rowsPerPageOptions={[7]}
              disableSelectionOnClick
              sx={{
                border: "none",
                fontFamily: "'Helvetica Neue', sans-serif",
                fontSize: "0.88rem",
                "& .MuiDataGrid-cell": {
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: "0.88rem",
                  outline: "none",
                },
                "& .MuiDataGrid-columnHeaders": {
                  fontFamily: "'Helvetica Neue', sans-serif",
                  fontSize: "0.88rem",
                  backgroundColor: "#fafafa",
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* ── Create / Edit Dialog ── */}
      <Dialog
        open={formOpen}
        onClose={() => !formLoading && setFormOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 650,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e0e0e0",
            mb: 2,
          }}
        >
          {formMode === "create" ? "Add New Member" : "Edit Member"}
          <IconButton
            onClick={() => setFormOpen(false)}
            size="small"
            disabled={formLoading}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent
          sx={{ pt: 3, display: "flex", flexDirection: "column", gap: 2 }}
        >
          {formError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {formError}
            </Alert>
          )}

          <TextField
            label="Full Name"
            fullWidth
            value={formData.full_name}
            onChange={(e) => handleFormChange("full_name", e.target.value)}
            disabled={formLoading}
            size="small"
            sx={{ mt: 1 }}
          />

          {formMode === "create" && (
            <>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => handleFormChange("email", e.target.value)}
                disabled={formLoading}
                size="small"
              />
              <TextField
                label="Password"
                type={showPassword ? "text" : "password"}
                fullWidth
                value={formData.password}
                onChange={(e) => handleFormChange("password", e.target.value)}
                disabled={formLoading}
                size="small"
                helperText="Minimum 8 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((prev) => !prev)}
                        edge="end"
                      >
                        {showPassword ? (
                          <VisibilityOffOutlinedIcon sx={{ fontSize: 18 }} />
                        ) : (
                          <VisibilityOutlinedIcon sx={{ fontSize: 18 }} />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </>
          )}

          <TextField
            label="Role"
            select
            fullWidth
            value={formData.role}
            onChange={(e) => handleFormChange("role", e.target.value)}
            disabled={formLoading}
            size="small"
          >
            {ROLES.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Division"
            select
            fullWidth
            value={formData.division}
            onChange={(e) => handleFormChange("division", e.target.value)}
            disabled={formLoading}
            size="small"
          >
            <MenuItem value="">— None —</MenuItem>
            {DIVISIONS.map((d) => (
              <MenuItem key={d.value} value={d.value}>
                {d.label}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Position / Section"
            select
            fullWidth
            value={formData.section}
            onChange={(e) => handleFormChange("section", e.target.value)}
            disabled={formLoading || !formData.division}
            size="small"
            helperText={!formData.division ? "Select a division first" : ""}
          >
            <MenuItem value="">— None —</MenuItem>
            {availableSections.map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setFormOpen(false)}
            disabled={formLoading}
            sx={{ textTransform: "none", color: "#757575" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleFormSubmit}
            disabled={formLoading}
            sx={{
              textTransform: "none",
              backgroundColor: "#f5c52b",
              color: "#212121",
              fontWeight: 500,
              "&:hover": { backgroundColor: "#e6b920" },
            }}
          >
            {formLoading ? (
              <CircularProgress size={18} sx={{ color: "#212121" }} />
            ) : formMode === "create" ? (
              "Create Account"
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Toggle Status Confirmation Dialog ── */}
      <Dialog
        open={toggleOpen}
        onClose={() => !toggleLoading && setToggleOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #e0e0e0",
            mb: 1,
          }}
        >
          {toggleTarget?.is_active
            ? "Deactivate Account"
            : "Reactivate Account"}
          <IconButton
            onClick={() => setToggleOpen(false)}
            size="small"
            disabled={toggleLoading}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.88rem", color: "#616161" }}>
            {toggleTarget?.is_active ? (
              <>
                Are you sure you want to deactivate{" "}
                <strong>{toggleTarget?.full_name}</strong>'s account? They will
                no longer be able to log in.
              </>
            ) : (
              <>
                Are you sure you want to reactivate{" "}
                <strong>{toggleTarget?.full_name}</strong>'s account? They will
                regain access to the system.
              </>
            )}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button
            onClick={() => setToggleOpen(false)}
            disabled={toggleLoading}
            sx={{ textTransform: "none", color: "#757575" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmToggle}
            disabled={toggleLoading}
            sx={{
              textTransform: "none",
              backgroundColor: toggleTarget?.is_active ? "#f5c52b" : "#388e3c",
              color: "#212121",
              fontWeight: 500,
              "&:hover": {
                backgroundColor: toggleTarget?.is_active
                  ? "#e6b920"
                  : "#2e7d32",
              },
            }}
          >
            {toggleLoading ? (
              <CircularProgress size={18} sx={{ color: "#212121" }} />
            ) : toggleTarget?.is_active ? (
              "Yes, Deactivate"
            ) : (
              "Yes, Reactivate"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirmation Dialog ── */}
      <Dialog
        open={deleteOpen}
        onClose={() => !deleteLoading && setDeleteOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle
          sx={{
            fontWeight: 700,
            fontSize: "0.95rem",
            borderBottom: "1px solid #e0e0e0",
            mb: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          Delete Account
          <IconButton
            onClick={() => setDeleteOpen(false)}
            size="small"
            disabled={deleteLoading}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: "0.88rem", color: "#616161" }}>
            Are you sure you want to permanently delete{" "}
            <strong>{deleteTarget?.full_name}</strong>'s account? This action
            cannot be undone.
          </Typography>
          <Box sx={{ mt: 1.5, p: 1.5, bgcolor: "#fdecea", borderRadius: 2 }}>
            <Typography sx={{ fontSize: "0.82rem", color: "#d32f2f" }}>
              ⚠️ Use this only for graduates or members who have permanently
              left TGP. For temporary deactivation, use the deactivate option
              instead.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button
            onClick={() => setDeleteOpen(false)}
            disabled={deleteLoading}
            sx={{ textTransform: "none", color: "#757575" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmDelete}
            disabled={deleteLoading}
            sx={{ textTransform: "none" }}
          >
            {deleteLoading ? (
              <CircularProgress size={18} />
            ) : (
              "Delete Permanently"
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
