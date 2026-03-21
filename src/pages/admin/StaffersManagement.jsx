// src/pages/admin/StaffersManagement.jsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Dialog,
  TextField,
  MenuItem,
  IconButton,
  Alert,
  useTheme,
  Avatar,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import { useSearchParams } from "react-router-dom";
import {
  fetchAllStaffers,
  createStafferAccount,
  updateStafferProfile,
  toggleStafferStatus,
  deleteStafferAccount,
} from "../../services/StafferService";
import { getAvatarUrl } from "../../components/common/UserAvatar";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD      = "#F5C52B";
const GOLD_08   = "rgba(245,197,43,0.08)";
const GOLD_18   = "rgba(245,197,43,0.18)";
const CHARCOAL  = "#353535";
const BORDER      = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG  = "rgba(53,53,53,0.03)";
const dm        = "'Inter', sans-serif";

// ── Config ────────────────────────────────────────────────────────────────────
const ROLES = [
  { value: "admin",    label: "Admin" },
  { value: "sec_head", label: "Section Head" },
  { value: "staff",    label: "Staff" },
];

const DIVISIONS = [
  { value: "Executives", label: "Executives" },
  { value: "Scribes",    label: "Scribes" },
  { value: "Creatives",  label: "Creatives" },
  { value: "Managerial", label: "Managerial" },
];

const SECTIONS_BY_DIVISION = {
  Executives: ["EIC", "Managing Editor", "Assoc. Managing Editor", "Technical Editor", "Creative Director"],
  Scribes:    ["News", "Feature", "Sports/Opinion", "Literary"],
  Creatives:  ["Photojournalism", "Videojournalism", "Illustrations", "Graphics Design", "Newsletter"],
  Managerial: ["HR", "Circulation", "Online Accounts"],
};

const POSITIONS_BY_SECTION = {
  EIC:                     ["EIC"],
  "Managing Editor":       ["Managing Editor"],
  "Assoc. Managing Editor":["Assoc. Managing Editor"],
  "Technical Editor":      ["Technical Editor"],
  "Creative Director":     ["Creative Director"],
  News:                    ["News Editor", "News Writer"],
  Feature:                 ["Feature Editor", "Feature Writer"],
  "Sports/Opinion":        ["Sports/Opinion Editor", "Opinion Writer"],
  Literary:                ["Literary Editor", "Literary Writer"],
  Photojournalism:         ["Photojournalism Director", "Photographer"],
  Videojournalism:         ["Videojournalism Director", "Videographer"],
  Illustrations:           ["Illustrator"],
  "Graphics Design":       ["Graphic Design Director", "Layout Artist"],
  Newsletter:              ["Newsletter Editor", "Newsletter Writer"],
  HR:                      ["HR Manager"],
  Circulation:             ["Circulation Manager", "Assoc. Circulation Manager"],
  "Online Accounts":       ["Online Accounts Manager"],
};

const ROLE_CFG = {
  admin:    { dot: "#f97316", color: "#c2410c", bg: "#fff7ed" },
  sec_head: { dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
  staff:    { dot: "#3b82f6", color: "#1d4ed8", bg: "#eff6ff" },
};

const TABS = ["All", "Executives", "Scribes", "Creatives", "Managerial"];

const EMPTY_FORM = {
  full_name: "", email: "", password: "",
  role: "staff", division: "", section: "", position: "",
};

const getInitials = (name) =>
  (name || "?").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

export default function StaffersManagement() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [staffers,     setStaffers]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [activeTab,    setActiveTab]    = useState("All");
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";

  const [formOpen,    setFormOpen]    = useState(false);
  const [formMode,    setFormMode]    = useState("create");
  const [formData,    setFormData]    = useState(EMPTY_FORM);
  const [selectedId,  setSelectedId]  = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError,   setFormError]   = useState("");

  const [toggleOpen,    setToggleOpen]    = useState(false);
  const [toggleTarget,  setToggleTarget]  = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [deleteOpen,    setDeleteOpen]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadStaffers = useCallback(async () => {
    setLoading(true);
    try { setStaffers(await fetchAllStaffers()); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadStaffers(); }, [loadStaffers]);

  const filteredRows = useMemo(
    () => staffers
      .filter((s) => activeTab === "All" || s.division === activeTab)
      .map((s) => ({ id: s.id, ...s })),
    [staffers, activeTab],
  );

  const getCount = (tab) =>
    tab === "All" ? staffers.length : staffers.filter((s) => s.division === tab).length;

  const handleOpenCreate = () => {
    setFormMode("create"); setFormData(EMPTY_FORM); setFormError(""); setFormOpen(true);
  };

  const handleOpenEdit = (row) => {
    setFormMode("edit"); setSelectedId(row.id);
    setFormData({
      full_name: row.full_name || "", email: row.email || "", password: "",
      role: row.role || "staff", division: row.division || "",
      section: row.section || "", position: row.position || "",
    });
    setFormError(""); setFormOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const u = { ...prev, [field]: value };
      if (field === "division") { u.section = ""; u.position = ""; }
      if (field === "section")  { u.position = ""; }
      return u;
    });
  };

  const handleFormSubmit = async () => {
    setFormError("");
    if (!formData.full_name.trim()) return setFormError("Full name is required.");
    if (formMode === "create") {
      if (!formData.email.trim())    return setFormError("Email is required.");
      if (!formData.password.trim()) return setFormError("Password is required.");
      if (formData.password.length < 8) return setFormError("Password must be at least 8 characters.");
    }
    if (!formData.role) return setFormError("Role is required.");
    setFormLoading(true);
    try {
      if (formMode === "create") {
        await createStafferAccount({
          full_name: formData.full_name.trim(), email: formData.email.trim(),
          password: formData.password, role: formData.role,
          division: formData.division || null, section: formData.section || null,
          position: formData.position || null,
        });
      } else {
        await updateStafferProfile(selectedId, {
          full_name: formData.full_name.trim(), role: formData.role,
          division: formData.division || null, section: formData.section || null,
          position: formData.position || null,
        });
      }
      setFormOpen(false); loadStaffers();
    } catch (err) { setFormError(err.message); }
    finally { setFormLoading(false); }
  };

  const handleConfirmToggle = async () => {
    setToggleLoading(true);
    try {
      await toggleStafferStatus(toggleTarget.id, !toggleTarget.is_active);
      setToggleOpen(false); setToggleTarget(null); loadStaffers();
    } catch (err) { setError(err.message); }
    finally { setToggleLoading(false); }
  };

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteStafferAccount(deleteTarget.id);
      setDeleteOpen(false); setDeleteTarget(null); loadStaffers();
    } catch (err) { setError(err.message); }
    finally { setDeleteLoading(false); }
  };

  const availableSections  = formData.division ? SECTIONS_BY_DIVISION[formData.division]  || [] : [];
  const availablePositions = formData.section  ? POSITIONS_BY_SECTION[formData.section]   || [] : [];

  const columns = useMemo(() => [
    {
      field: "full_name", headerName: "Full Name", flex: 1.5, minWidth: 200,
      renderCell: (p) => {
        const url = getAvatarUrl(p.row.avatar_url);
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, height: "100%" }}>
            {/* ── Avatar: 36px — readable initials + photo ── */}
            <Avatar
              src={url}
              sx={{
                width: 36, height: 36,
                backgroundColor: GOLD, color: CHARCOAL,
                fontSize: "0.7rem", fontWeight: 700, flexShrink: 0,
              }}
            >
              {!url && getInitials(p.value)}
            </Avatar>
            {/* ── Full name with tooltip for long names ── */}
            <Tooltip title={p.value || ""} placement="top" arrow
              disableHoverListener={!p.value || p.value.length < 22}
            >
              <Typography sx={{
                fontFamily: dm, fontSize: "0.83rem", fontWeight: 600,
                color: "text.primary",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                lineHeight: 1.3,
              }}>
                {p.value || "—"}
              </Typography>
            </Tooltip>
          </Box>
        );
      },
    },
    {
      field: "role", headerName: "Role", flex: 0.8, minWidth: 110,
      renderCell: (p) => {
        const cfg   = ROLE_CFG[p.value] || { dot: "#9ca3af", color: "#6b7280", bg: "#f9fafb" };
        const label = ROLES.find((r) => r.value === p.value)?.label || p.value;
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.25, py: 0.35, borderRadius: "6px", backgroundColor: isDark ? `${cfg.dot}18` : cfg.bg }}>
              <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: cfg.dot }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 600, color: isDark ? cfg.dot : cfg.color, letterSpacing: "0.04em" }}>{label}</Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "division", headerName: "Division", flex: 0.9, minWidth: 110,
      renderCell: (p) => <MetaCell>{p.value || "—"}</MetaCell>,
    },
    {
      field: "section", headerName: "Section", flex: 0.9, minWidth: 110,
      renderCell: (p) => <MetaCell>{p.value || "—"}</MetaCell>,
    },
    {
      field: "position", headerName: "Position", flex: 1.1, minWidth: 150,
      renderCell: (p) => <MetaCell>{p.value || "—"}</MetaCell>,
    },
    {
      field: "is_active", headerName: "Status", flex: 0.7, minWidth: 90,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.25, py: 0.35, borderRadius: "6px", backgroundColor: p.value ? (isDark ? "rgba(34,197,94,0.1)" : "#f0fdf4") : (isDark ? "rgba(255,255,255,0.04)" : "rgba(53,53,53,0.04)") }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: p.value ? "#22c55e" : "rgba(53,53,53,0.3)" }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 600, color: p.value ? "#15803d" : "text.secondary", letterSpacing: "0.04em" }}>
              {p.value ? "Active" : "Inactive"}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "actions", headerName: "", flex: 0.85, minWidth: 110,
      sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Box sx={{ display: "flex", gap: 0.5, alignItems: "center", justifyContent: "flex-end", height: "100%", pr: 0.5 }}>
          <Tooltip title="Edit" arrow>
            <IconButton size="small" onClick={() => handleOpenEdit(p.row)}
              sx={{ borderRadius: "7px", border: `1px solid ${border}`, p: 0.55, color: "text.secondary", transition: "all 0.15s", "&:hover": { borderColor: GOLD, color: CHARCOAL, backgroundColor: GOLD_08 } }}
            >
              <EditOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title={p.row.is_active ? "Deactivate" : "Reactivate"} arrow>
            <IconButton size="small"
              onClick={() => { setToggleTarget(p.row); setToggleOpen(true); }}
              sx={{ borderRadius: "7px", border: `1px solid ${border}`, p: 0.55, color: "text.secondary", transition: "all 0.15s", "&:hover": { borderColor: p.row.is_active ? "rgba(249,115,22,0.5)" : "rgba(34,197,94,0.5)", color: p.row.is_active ? "#c2410c" : "#15803d", backgroundColor: p.row.is_active ? "rgba(249,115,22,0.06)" : "rgba(34,197,94,0.06)" } }}
            >
              {p.row.is_active ? <BlockOutlinedIcon sx={{ fontSize: 14 }} /> : <CheckCircleOutlineIcon sx={{ fontSize: 14 }} />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete" arrow>
            <IconButton size="small"
              onClick={() => { setDeleteTarget(p.row); setDeleteOpen(true); }}
              sx={{ borderRadius: "7px", border: `1px solid ${border}`, p: 0.55, color: "text.secondary", transition: "all 0.15s", "&:hover": { borderColor: "rgba(239,68,68,0.4)", color: "#dc2626", backgroundColor: "rgba(239,68,68,0.06)" } }}
            >
              <DeleteOutlineOutlinedIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ),
    },
  ], [activeTab, border, isDark]);

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default", fontFamily: dm }}>

      {/* ── Header ── */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 3, gap: 2, flexWrap: "wrap" }}>
        <Box>
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "1.05rem", color: "text.primary", letterSpacing: "-0.02em" }}>
            Staffers Management
          </Typography>
          <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary", mt: 0.3 }}>
            Manage TGP member accounts — create, edit, deactivate, or remove members.
          </Typography>
        </Box>
        <Box onClick={handleOpenCreate}
          sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.75, py: 0.75, borderRadius: "9px", cursor: "pointer", backgroundColor: GOLD, color: CHARCOAL, fontFamily: dm, fontSize: "0.8rem", fontWeight: 600, transition: "background-color 0.15s", "&:hover": { backgroundColor: "#e6b920" } }}
        >
          <AddOutlinedIcon sx={{ fontSize: 15 }} />
          Add Member
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: "8px", fontFamily: dm, fontSize: "0.78rem" }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* ── Tabs ── */}
      <Box sx={{ mb: 2, borderBottom: `1px solid ${border}`, display: "flex", gap: 0 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <Box key={tab} onClick={() => setActiveTab(tab)}
              sx={{
                display: "flex", alignItems: "center", gap: 0.75,
                px: 1.75, py: 0.9, cursor: "pointer", position: "relative",
                fontFamily: dm, fontSize: "0.79rem",
                fontWeight: isActive ? 600 : 400,
                color: isActive ? "text.primary" : "text.secondary",
                transition: "color 0.15s", "&:hover": { color: "text.primary" },
                "&::after": isActive ? { content: '""', position: "absolute", bottom: -1, left: 0, right: 0, height: "2px", borderRadius: "2px 2px 0 0", backgroundColor: GOLD } : {},
              }}
            >
              {tab}
              <Box sx={{ minWidth: 17, height: 17, borderRadius: "9px", px: 0.5, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: isActive ? GOLD : isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.07)" }}>
                <Typography sx={{ fontFamily: dm, fontSize: "0.62rem", fontWeight: 700, lineHeight: 1, color: isActive ? CHARCOAL : "text.secondary" }}>
                  {getCount(tab)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ── Table ── */}
      <Box sx={{ width: "100%", overflowX: "auto" }}>
        <Box sx={{ minWidth: 640, bgcolor: "background.paper", borderRadius: "10px", border: `1px solid ${border}`, overflow: "hidden", height: 500 }}>
          {loading ? (
            <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CircularProgress size={26} sx={{ color: GOLD }} />
            </Box>
          ) : (
            <DataGrid
              rows={filteredRows}
              columns={columns}
              columnVisibilityModel={{ division: activeTab === "All" }}
              pageSize={8}
              rowsPerPageOptions={[8]}
              disableSelectionOnClick
              rowHeight={56}
              getRowClassName={(params) =>
                highlight && params.row.full_name?.toLowerCase().includes(highlight) ? "highlighted-row" : ""
              }
              sx={{
                ...makeDataGridSx(isDark, border),
                "& .highlighted-row": {
                  backgroundColor: isDark ? GOLD_08 : "rgba(245,197,43,0.08)",
                  "&:hover": { backgroundColor: isDark ? GOLD_18 : "rgba(245,197,43,0.14)" },
                },
              }}
            />
          )}
        </Box>
      </Box>

      {/* ── Create / Edit Dialog ── */}
      <BrandDialog
        open={formOpen}
        onClose={() => !formLoading && setFormOpen(false)}
        title={formMode === "create" ? "Add New Member" : "Edit Member"}
        isDark={isDark} border={border}
        footer={
          <>
            <CancelBtn onClick={() => setFormOpen(false)} disabled={formLoading} border={border} />
            <PrimaryBtn onClick={handleFormSubmit} loading={formLoading}>
              {formMode === "create" ? "Create Account" : "Save Changes"}
            </PrimaryBtn>
          </>
        }
      >
        {formError && (
          <Alert severity="error" sx={{ borderRadius: "8px", fontFamily: dm, fontSize: "0.78rem", mb: 0.5 }}>{formError}</Alert>
        )}
        <StyledField label="Full Name" value={formData.full_name} onChange={(e) => handleFormChange("full_name", e.target.value)} disabled={formLoading} border={border} />
        {formMode === "create" && (
          <>
            <StyledField label="Email" type="email" value={formData.email} onChange={(e) => handleFormChange("email", e.target.value)} disabled={formLoading} border={border} />
            <StyledField
              label="Password"
              type={showPassword ? "text" : "password"}
              value={formData.password}
              onChange={(e) => handleFormChange("password", e.target.value)}
              disabled={formLoading}
              helperText="Minimum 8 characters"
              border={border}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPassword((p) => !p)} edge="end" sx={{ color: "text.secondary" }}>
                      {showPassword ? <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} /> : <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
          </>
        )}
        <StyledField label="Role" select value={formData.role} onChange={(e) => handleFormChange("role", e.target.value)} disabled={formLoading} border={border}>
          {ROLES.map((r) => <MenuItem key={r.value} value={r.value} sx={{ fontFamily: dm, fontSize: "0.82rem" }}>{r.label}</MenuItem>)}
        </StyledField>
        <StyledField label="Division" select value={formData.division} onChange={(e) => handleFormChange("division", e.target.value)} disabled={formLoading} border={border}>
          <MenuItem value="" sx={{ fontFamily: dm, fontSize: "0.82rem" }}>— None —</MenuItem>
          {DIVISIONS.map((d) => <MenuItem key={d.value} value={d.value} sx={{ fontFamily: dm, fontSize: "0.82rem" }}>{d.label}</MenuItem>)}
        </StyledField>
        <StyledField label="Section" select value={formData.section} onChange={(e) => handleFormChange("section", e.target.value)} disabled={formLoading || !formData.division} helperText={!formData.division ? "Select a division first" : ""} border={border}>
          <MenuItem value="" sx={{ fontFamily: dm, fontSize: "0.82rem" }}>— None —</MenuItem>
          {availableSections.map((s) => <MenuItem key={s} value={s} sx={{ fontFamily: dm, fontSize: "0.82rem" }}>{s}</MenuItem>)}
        </StyledField>
        <StyledField label="Position" select value={formData.position} onChange={(e) => handleFormChange("position", e.target.value)} disabled={formLoading || !formData.section} helperText={!formData.section ? "Select a section first" : ""} border={border}>
          <MenuItem value="" sx={{ fontFamily: dm, fontSize: "0.82rem" }}>— None —</MenuItem>
          {availablePositions.map((pos) => <MenuItem key={pos} value={pos} sx={{ fontFamily: dm, fontSize: "0.82rem" }}>{pos}</MenuItem>)}
        </StyledField>
      </BrandDialog>

      {/* ── Toggle Status Dialog ── */}
      <BrandDialog
        open={toggleOpen} onClose={() => !toggleLoading && setToggleOpen(false)}
        title={toggleTarget?.is_active ? "Deactivate Account" : "Reactivate Account"}
        isDark={isDark} border={border}
        footer={
          <>
            <CancelBtn onClick={() => setToggleOpen(false)} disabled={toggleLoading} border={border} />
            <PrimaryBtn onClick={handleConfirmToggle} loading={toggleLoading}>
              {toggleTarget?.is_active ? "Yes, Deactivate" : "Yes, Reactivate"}
            </PrimaryBtn>
          </>
        }
      >
        <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.65 }}>
          {toggleTarget?.is_active ? (
            <>Are you sure you want to deactivate <strong style={{ color: CHARCOAL }}>{toggleTarget?.full_name}</strong>'s account? They will no longer be able to log in.</>
          ) : (
            <>Are you sure you want to reactivate <strong style={{ color: CHARCOAL }}>{toggleTarget?.full_name}</strong>'s account? They will regain access to the system.</>
          )}
        </Typography>
      </BrandDialog>

      {/* ── Delete Dialog ── */}
      <BrandDialog
        open={deleteOpen} onClose={() => !deleteLoading && setDeleteOpen(false)}
        title="Delete Account" isDark={isDark} border={border}
        footer={
          <>
            <CancelBtn onClick={() => setDeleteOpen(false)} disabled={deleteLoading} border={border} />
            <Box
              onClick={!deleteLoading ? handleConfirmDelete : undefined}
              sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.75, py: 0.65, borderRadius: "8px", cursor: deleteLoading ? "default" : "pointer", backgroundColor: "#dc2626", color: "#fff", fontFamily: dm, fontSize: "0.8rem", fontWeight: 600, opacity: deleteLoading ? 0.7 : 1, transition: "background-color 0.15s", "&:hover": { backgroundColor: deleteLoading ? "#dc2626" : "#b91c1c" } }}
            >
              {deleteLoading && <CircularProgress size={13} sx={{ color: "#fff" }} />}
              Delete Permanently
            </Box>
          </>
        }
      >
        <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary", lineHeight: 1.65, mb: 1.5 }}>
          Are you sure you want to permanently delete <strong style={{ color: CHARCOAL }}>{deleteTarget?.full_name}</strong>'s account? This action cannot be undone.
        </Typography>
        <Box sx={{ px: 1.5, py: 1.25, borderRadius: "8px", backgroundColor: isDark ? "rgba(239,68,68,0.06)" : "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: "#dc2626", lineHeight: 1.6 }}>
            Use this only for graduates or members who have permanently left TGP. For temporary deactivation, use the deactivate option instead.
          </Typography>
        </Box>
      </BrandDialog>
    </Box>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function MetaCell({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}>{children}</Typography>
    </Box>
  );
}

function BrandDialog({ open, onClose, title, children, footer, isDark, border }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{ sx: { borderRadius: "14px", backgroundColor: "background.paper", border: `1px solid ${border}`, boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.6)" : "0 8px 40px rgba(53,53,53,0.12)" } }}
    >
      <Box sx={{ px: 3, py: 2, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 2.5, height: 26, borderRadius: "2px", backgroundColor: GOLD, flexShrink: 0 }} />
          <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.92rem", color: "text.primary" }}>{title}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ borderRadius: "8px", color: "text.secondary", "&:hover": { backgroundColor: HOVER_BG } }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>
      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 1.75 }}>{children}</Box>
      <Box sx={{ px: 3, py: 1.75, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "flex-end", gap: 1, backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)" }}>
        {footer}
      </Box>
    </Dialog>
  );
}

function CancelBtn({ onClick, disabled, border }) {
  return (
    <Box onClick={!disabled ? onClick : undefined}
      sx={{ px: 1.75, py: 0.65, borderRadius: "8px", cursor: disabled ? "default" : "pointer", border: `1px solid ${border}`, fontFamily: dm, fontSize: "0.8rem", fontWeight: 500, color: "text.secondary", opacity: disabled ? 0.5 : 1, transition: "all 0.15s", "&:hover": { borderColor: "rgba(53,53,53,0.2)", color: "text.primary", backgroundColor: HOVER_BG } }}
    >
      Cancel
    </Box>
  );
}

function PrimaryBtn({ onClick, loading, children }) {
  return (
    <Box onClick={!loading ? onClick : undefined}
      sx={{ display: "flex", alignItems: "center", gap: 0.75, px: 1.75, py: 0.65, borderRadius: "8px", cursor: loading ? "default" : "pointer", backgroundColor: GOLD, color: CHARCOAL, fontFamily: dm, fontSize: "0.8rem", fontWeight: 600, opacity: loading ? 0.8 : 1, transition: "background-color 0.15s", "&:hover": { backgroundColor: loading ? GOLD : "#e6b920" } }}
    >
      {loading && <CircularProgress size={13} sx={{ color: CHARCOAL }} />}
      {children}
    </Box>
  );
}

function StyledField({ border, children, ...props }) {
  return (
    <TextField size="small" fullWidth
      sx={{
        "& .MuiOutlinedInput-root": { fontFamily: dm, fontSize: "0.82rem", borderRadius: "8px", "& fieldset": { borderColor: border }, "&:hover fieldset": { borderColor: "rgba(245,197,43,0.5)" }, "&.Mui-focused fieldset": { borderColor: GOLD } },
        "& .MuiInputLabel-root": { fontFamily: dm, fontSize: "0.8rem" },
        "& .MuiInputLabel-root.Mui-focused": { color: "#b45309" },
        "& .MuiFormHelperText-root": { fontFamily: dm, fontSize: "0.72rem" },
      }}
      {...props}
    >
      {children}
    </TextField>
  );
}

function makeDataGridSx(isDark, border) {
  return {
    border: "none", fontFamily: dm, fontSize: "0.82rem",
    backgroundColor: "background.paper", color: "text.primary",
    "& .MuiDataGrid-columnHeaders": { backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)", borderBottom: `1px solid ${border}`, minHeight: "40px !important", maxHeight: "40px !important", lineHeight: "40px !important" },
    "& .MuiDataGrid-columnHeaderTitle": { fontFamily: dm, fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.07em", textTransform: "uppercase" },
    "& .MuiDataGrid-columnSeparator": { display: "none" },
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },
    "& .MuiDataGrid-row": { borderBottom: `1px solid ${border}`, transition: "background-color 0.12s", "&:last-child": { borderBottom: "none" } },
    "& .MuiDataGrid-row:hover": { backgroundColor: isDark ? "rgba(255,255,255,0.025)" : HOVER_BG },
    "& .MuiDataGrid-cell": { border: "none", outline: "none !important", "&:focus, &:focus-within": { outline: "none" } },
    "& .MuiDataGrid-footerContainer": { borderTop: `1px solid ${border}`, backgroundColor: "transparent", minHeight: "44px" },
    "& .MuiTablePagination-root": { fontFamily: dm, fontSize: "0.75rem", color: "text.secondary" },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": { fontFamily: dm, fontSize: "0.75rem" },
    "& .MuiDataGrid-virtualScroller": { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay": { backgroundColor: "background.paper" },
  };
}