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
  Menu,
  ListItemIcon,
  ListItemText,
  FormControl,
  Select,
  OutlinedInput,
  Drawer,
  Tabs,
  Tab,
  Divider,
} from "@mui/material";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import AddOutlinedIcon from "@mui/icons-material/AddOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import ContentCopyOutlinedIcon from "@mui/icons-material/ContentCopyOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMoreOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";
import { useSearchParams } from "react-router-dom";
import {
  fetchAllStaffers,
  fetchTrashedStaffers,
  createStafferAccount,
  updateStafferProfile,
  toggleStafferStatus,
  moveStaffersToTrash,
  restoreTrashedStaffers,
  deleteStafferAccount,
} from "../../services/StafferService";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import BrandedLoader from "../../components/common/BrandedLoader";
import NumberBadge from "../../components/common/NumberBadge";
import {
  CONTROL_RADIUS,
  FILTER_BUTTON_HEIGHT,
  FILTER_SEARCH_FLEX,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
  FILTER_SEARCH_MAX_WIDTH,
  FILTER_SEARCH_MIN_WIDTH,
  TABLE_USER_AVATAR_FONT_SIZE,
  TABLE_USER_AVATAR_SIZE,
} from "../../utils/layoutTokens";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_18 = "rgba(245,197,43,0.18)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

const ROLES = [
  { value: "admin", label: "Admin" },
  { value: "sec_head", label: "Section Head" },
  { value: "staff", label: "Staff" },
];

const DIVISIONS = [
  { value: "Scribes", label: "Scribes" },
  { value: "Creatives", label: "Creatives" },
];

const SECTIONS_BY_DIVISION = {
  Scribes: ["News", "Feature", "Sports/Opinion", "Literary"],
  Creatives: [
    "Photojournalism",
    "Videojournalism",
    "Illustrations",
    "Graphics Design",
  ],
};

const POSITIONS_BY_SECTION = {
  News: ["News Editor", "News Writer"],
  Feature: ["Feature Editor", "Feature Writer"],
  "Sports/Opinion": ["Sports Editor", "Sports Writer", "Opinion Writer"],
  Literary: ["Literary Editor", "Literary Writer"],
  Photojournalism: ["Photojournalism Director", "Photojournalist"],
  Videojournalism: [
    "Videojournalism Director",
    "Videojournalist",
    "Videographer",
  ],
  Illustrations: ["Illustrations Director", "Illustrator"],
  "Graphics Design": ["Graphic Design Director", "Layout Artist"],
};

const DESIGNATIONS = [
  "Editor-in-Chief",
  "Managing Editor",
  "Technical Editor",
  "Creative Director",
  "Associate Managing Editor",
  "News Editor",
  "Feature Editor",
  "Sports Editor",
  "Literary Editor",
  "Photojournalism Director",
  "Videojournalism Director",
  "Illustrations Director",
  "Graphic Design Director",
  "Newsletter Editor",
  "HR Manager",
  "Circulations Manager",
  "Online Accounts Manager",
];

const ROLE_CFG = {
  admin: { dot: "#f97316", color: "#c2410c", bg: "#fff7ed" },
  sec_head: { dot: "#22c55e", color: "#15803d", bg: "#f0fdf4" },
  staff: { dot: "#3b82f6", color: "#1d4ed8", bg: "#eff6ff" },
};

const TABS = ["All", "Scribes", "Creatives"];

const EMPTY_FORM = {
  full_name: "",
  email: "",
  password: "",
  role: "staff",
  division: "",
  section: "",
  position: "",
  designation: "",
};

const AVATAR_COLORS = [
  { bg: "#FFE9A8", color: "#2D2400" },
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#EAF3DE", color: "#27500A" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#FBEAF0", color: "#72243E" },
];

const getInitials = (name) =>
  (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

const getAvatarColor = (key) => {
  if (!key) return AVATAR_COLORS[0];
  const str = String(key);
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

export default function StaffersManagement() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [staffers, setStaffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [showPassword, setShowPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const highlight = searchParams.get("highlight")?.toLowerCase() || "";
  const focusStaffId = searchParams.get("focus") || "";

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [copyFeedback, setCopyFeedback] = useState("");
  const [createdAccountOpen, setCreatedAccountOpen] = useState(false);
  const [createdAccount, setCreatedAccount] = useState(null);
  const [createdShowPassword, setCreatedShowPassword] = useState(false);
  const [createdCopyFeedback, setCreatedCopyFeedback] = useState("");
  const [createdCredentialsCopied, setCreatedCredentialsCopied] =
    useState(false);
  const [createdDismissConfirmOpen, setCreatedDismissConfirmOpen] =
    useState(false);

  const [toggleOpen, setToggleOpen] = useState(false);
  const [toggleTarget, setToggleTarget] = useState(null);
  const [toggleLoading, setToggleLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleteIds, setBulkDeleteIds] = useState([]);
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false);
  const [bulkDeactivateOpen, setBulkDeactivateOpen] = useState(false);
  const [bulkDeactivateIds, setBulkDeactivateIds] = useState([]);
  const [bulkDeactivateLoading, setBulkDeactivateLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuRow, setMenuRow] = useState(null);
  const [recordsDrawerOpen, setRecordsDrawerOpen] = useState(false);
  const [recordsTab, setRecordsTab] = useState("deactivated");
  const [trashedStaffers, setTrashedStaffers] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const gridApiRef = useGridApiRef();
  const [rowSelectionModel, setRowSelectionModel] = useState({
    type: "include",
    ids: new Set(),
  });

  const selectedRowCount =
    rowSelectionModel?.ids instanceof Set ? rowSelectionModel.ids.size : 0;
  const isBulkSelectionActive = selectedRowCount > 1;

  useEffect(() => {
    if (!isBulkSelectionActive || !menuAnchor) return;
    queueMicrotask(() => {
      setMenuAnchor(null);
      setMenuRow(null);
    });
  }, [isBulkSelectionActive, menuAnchor]);

  const loadStaffers = useCallback(async () => {
    setLoading(true);
    try {
      setStaffers(await fetchAllStaffers());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaffers();
  }, [loadStaffers]);

  const loadTrashedStaffersList = useCallback(async () => {
    setRecordsLoading(true);
    try {
      setTrashedStaffers(await fetchTrashedStaffers());
    } catch (err) {
      setError(err.message);
    } finally {
      setRecordsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrashedStaffersList();
  }, [loadTrashedStaffersList]);

  const filteredRows = useMemo(
    () =>
      staffers
        .filter((s) => activeTab === "All" || s.division === activeTab)
        .map((s) => ({ id: s.id, ...s })),
    [staffers, activeTab],
  );

  useEffect(() => {
    if (!focusStaffId || loading || filteredRows.length === 0) return;

    const rowExists = filteredRows.some(
      (row) => String(row.id) === String(focusStaffId),
    );
    if (!rowExists) return;

    setRowSelectionModel({
      type: "include",
      ids: new Set([focusStaffId]),
    });

    queueMicrotask(() => {
      const rowIndex =
        gridApiRef.current?.getRowIndexRelativeToVisibleRows?.(focusStaffId);
      if (typeof rowIndex === "number" && rowIndex >= 0) {
        gridApiRef.current?.scrollToIndexes?.({ rowIndex });
      }
    });
  }, [focusStaffId, filteredRows, loading, gridApiRef]);

  const getCount = (tab) =>
    tab === "All"
      ? staffers.length
      : staffers.filter((s) => s.division === tab).length;

  const isDivisionFiltered = activeTab !== "All";
  const deactivatedRows = useMemo(
    () => staffers.filter((s) => !s.is_active),
    [staffers],
  );

  const externalFilterModel = useMemo(() => {
    const tokens = searchText
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    return { items: [], quickFilterValues: tokens };
  }, [searchText]);

  const handleExportCsv = () => {
    gridApiRef.current?.exportDataAsCsv({
      utf8WithBom: true,
      fileName: "staffers-export",
    });
  };

  const handleOpenCreate = () => {
    setFormMode("create");
    setFormData(EMPTY_FORM);
    setFormError("");
    setCopyFeedback("");
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
      position: row.position || "",
      designation: row.designation || "",
    });
    setFormError("");
    setCopyFeedback("");
    setFormOpen(true);
  };

  const handleFormChange = (field, value) => {
    setFormData((prev) => {
      const u = { ...prev, [field]: value };
      if (field === "division") {
        u.section = "";
        u.position = "";
        u.designation = "";
      }
      if (field === "section") {
        u.position = "";
      }
      return u;
    });
    if (field === "email" || field === "password") {
      setCopyFeedback("");
    }
  };

  const handleCopyCredentials = async () => {
    const email = formData.email.trim();
    const password = formData.password;

    if (!email || !password) {
      setFormError("Enter email and password first to copy credentials.");
      return;
    }

    const text = `Email: ${email}\nPassword: ${password}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setFormError("");
      setCopyFeedback("Credentials copied");
    } catch {
      setFormError("Could not copy credentials. Please copy manually.");
    }
  };

  const handleCopyCreated = async (mode = "all") => {
    if (!createdAccount) return;

    if (mode === "all") {
      setCreatedShowPassword(false);
    }

    const text =
      mode === "email"
        ? createdAccount.email
        : `Email: ${createdAccount.email}\nPassword: ${createdAccount.password}`;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "absolute";
        textarea.style.left = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCreatedCopyFeedback(
        mode === "email" ? "Email copied" : "Credentials copied",
      );
      if (mode === "all") {
        setCreatedCredentialsCopied(true);
      }
    } catch {
      setCreatedCopyFeedback("Copy failed");
    }
  };

  const clearCreatedAccountState = () => {
    setCreatedAccountOpen(false);
    setCreatedDismissConfirmOpen(false);
    setCreatedAccount(null);
    setCreatedShowPassword(false);
    setCreatedCopyFeedback("");
    setCreatedCredentialsCopied(false);
  };

  const handleAttemptCloseCreatedAccount = () => {
    if (!createdCredentialsCopied) {
      setCreatedDismissConfirmOpen(true);
      return;
    }
    clearCreatedAccountState();
  };

  const handleFormSubmit = async () => {
    setFormError("");
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
      const payload = {
        full_name: formData.full_name.trim(),
        role: formData.role,
        division: formData.division || null,
        section: formData.section || null,
        position: formData.position || null,
        designation: formData.designation || null,
      };
      if (formMode === "create") {
        await createStafferAccount({
          ...payload,
          email: formData.email.trim(),
          password: formData.password,
        });
        setCreatedAccount({
          full_name: payload.full_name,
          email: formData.email.trim(),
          password: formData.password,
          role: payload.role,
          division: payload.division,
          section: payload.section,
          position: payload.position,
        });
        setCreatedShowPassword(false);
        setCreatedCopyFeedback("");
        setCreatedCredentialsCopied(false);
        setCreatedAccountOpen(true);
      } else {
        await updateStafferProfile(selectedId, payload);
      }
      setFormOpen(false);
      loadStaffers();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setFormLoading(false);
    }
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

  const handleConfirmDelete = async () => {
    setDeleteLoading(true);
    try {
      await moveStaffersToTrash([deleteTarget.id]);
      setDeleteOpen(false);
      setDeleteTarget(null);
      await Promise.all([loadStaffers(), loadTrashedStaffersList()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBulkDeleteConfirm = async () => {
    setBulkDeleteLoading(true);
    try {
      await moveStaffersToTrash(bulkDeleteIds);
      setBulkDeleteOpen(false);
      setBulkDeleteIds([]);
      setRowSelectionModel({ type: "include", ids: new Set() });
      await Promise.all([loadStaffers(), loadTrashedStaffersList()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkDeleteLoading(false);
    }
  };

  const handleBulkDeactivateConfirm = async () => {
    setBulkDeactivateLoading(true);
    try {
      const targets = staffers.filter(
        (s) => bulkDeactivateIds.includes(s.id) && s.is_active,
      );
      await Promise.all(
        targets.map((staffer) => toggleStafferStatus(staffer.id, false)),
      );
      setBulkDeactivateOpen(false);
      setBulkDeactivateIds([]);
      setRowSelectionModel({ type: "include", ids: new Set() });
      await Promise.all([loadStaffers(), loadTrashedStaffersList()]);
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkDeactivateLoading(false);
    }
  };

  const handleRestoreFromTrash = async (id) => {
    try {
      await restoreTrashedStaffers([id]);
      await Promise.all([loadStaffers(), loadTrashedStaffersList()]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeletePermanently = async (id) => {
    try {
      await deleteStafferAccount(id);
      await loadTrashedStaffersList();
    } catch (err) {
      setError(err.message);
    }
  };

  const columns = useMemo(
    () => [
      {
        field: "full_name",
        headerName: "Full Name",
        flex: 1.5,
        minWidth: 200,
        renderCell: (p) => {
          const url = getAvatarUrl(p.row.avatar_url);
          const avatarColor = getAvatarColor(p.row.id || p.value);
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
                  width: TABLE_USER_AVATAR_SIZE,
                  height: TABLE_USER_AVATAR_SIZE,
                  backgroundColor: avatarColor.bg,
                  color: avatarColor.color,
                  fontSize: TABLE_USER_AVATAR_FONT_SIZE,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {!url && getInitials(p.value)}
              </Avatar>
              <Tooltip
                title={p.value || ""}
                placement="top"
                arrow
                disableHoverListener={!p.value || p.value.length < 22}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.83rem",
                    fontWeight: 400,
                    color: isDark ? "#f5f5f5" : "#1a1a1a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    lineHeight: 1.3,
                  }}
                >
                  {p.value || "—"}
                </Typography>
              </Tooltip>
            </Box>
          );
        },
      },
      {
        field: "role",
        headerName: "Role",
        flex: 0.8,
        minWidth: 110,
        renderCell: (p) => {
          const cfg = ROLE_CFG[p.value] || {
            dot: "#9ca3af",
            color: "#6b7280",
            bg: "#f9fafb",
          };
          const label =
            ROLES.find((r) => r.value === p.value)?.label || p.value;
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
                  backgroundColor: isDark ? `${cfg.dot}18` : cfg.bg,
                }}
              >
                <Box
                  sx={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: cfg.dot,
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
                  {label}
                </Typography>
              </Box>
            </Box>
          );
        },
      },
      {
        field: "division",
        headerName: "Division",
        flex: 0.9,
        minWidth: 110,
        renderCell: (p) => <MetaCell>{p.value || "—"}</MetaCell>,
      },
      {
        field: "section",
        headerName: "Section",
        flex: 0.9,
        minWidth: 110,
        renderCell: (p) => <MetaCell>{p.value || "—"}</MetaCell>,
      },
      {
        field: "position",
        headerName: "Position",
        flex: 1.1,
        minWidth: 150,
        renderCell: (p) => <MetaCell>{p.value || "—"}</MetaCell>,
      },
      {
        field: "designation",
        headerName: "Designation",
        flex: 1.1,
        minWidth: 160,
        renderCell: (p) => {
          if (!p.value) return <MetaCell>—</MetaCell>;
          return (
            <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.55,
                  px: 1.1,
                  py: 0.3,
                  borderRadius: "10px",
                  backgroundColor: isDark
                    ? "rgba(245,197,43,0.1)"
                    : "rgba(245,197,43,0.12)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.66rem",
                    fontWeight: 700,
                    color: isDark ? GOLD : "#b45309",
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
        field: "is_active",
        headerName: "Status",
        flex: 0.7,
        minWidth: 90,
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
                  ? isDark
                    ? "rgba(34,197,94,0.1)"
                    : "#f0fdf4"
                  : isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(53,53,53,0.04)",
              }}
            >
              <Box
                sx={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  backgroundColor: p.value ? "#22c55e" : "rgba(53,53,53,0.3)",
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.68rem",
                  fontWeight: 600,
                  color: p.value ? "#15803d" : "text.secondary",
                  letterSpacing: "0.04em",
                }}
              >
                {p.value ? "Active" : "Inactive"}
              </Typography>
            </Box>
          </Box>
        ),
      },
      {
        field: "actions",
        headerName: "",
        width: 50,
        sortable: false,
        align: "center",
        headerAlign: "center",
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <IconButton
              size="small"
              disabled={isBulkSelectionActive}
              onClick={(e) => {
                if (isBulkSelectionActive) return;
                e.stopPropagation();
                setMenuAnchor(e.currentTarget);
                setMenuRow(p.row);
              }}
              sx={{
                borderRadius: "4px",
                p: 0.4,
                color: "text.secondary",
                opacity: isBulkSelectionActive ? 0.4 : 1,
                transition: "all 0.15s",
                "&:hover": {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.06)"
                    : "rgba(53,53,53,0.06)",
                },
              }}
            >
              <MoreVertIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        ),
      },
    ],
    [isBulkSelectionActive, isDark],
  );

  const availableSections = formData.division
    ? SECTIONS_BY_DIVISION[formData.division] || []
    : [];
  const availablePositions = formData.section
    ? POSITIONS_BY_SECTION[formData.section] || []
    : [];
  const showDesignation = !!formData.division;

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "#ffffff",
        fontFamily: dm,
      }}
    >
     

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2.5,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
          onClose={() => setError("")}
        >
          {error}
        </Alert>
      )}

      {/* ── Filter row: Search | Division | Export | Add Member ── */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: FILTER_ROW_GAP,
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
          px: 1.25,
          py: 1,
          borderRadius: CONTROL_RADIUS,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f3f3f4",
        }}
      >
        {/* Search */}
        <FormControl
          size="small"
          sx={{
            flex: FILTER_SEARCH_FLEX,
            minWidth: FILTER_SEARCH_MIN_WIDTH,
            maxWidth: FILTER_SEARCH_MAX_WIDTH,
          }}
        >
          <OutlinedInput
            placeholder="Search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <SearchIcon sx={{ fontSize: 16, color: "text.disabled" }} />
              </InputAdornment>
            }
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          />
        </FormControl>

        {/* Division */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <Select
            value={activeTab}
            onChange={(e) => setActiveTab(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            renderValue={(val) => {
              const triggerCount = getCount(val);
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.primary",
                    }}
                  >
                    {val}
                  </Typography>
                  <NumberBadge
                    count={triggerCount}
                    active={isDivisionFiltered}
                    inactiveBg={
                      isDark ? "rgba(255,255,255,0.28)" : "rgba(53,53,53,0.45)"
                    }
                    fontFamily={dm}
                    fontSize="0.56rem"
                    sx={{ opacity: triggerCount === 0 ? 0.5 : 1 }}
                  />
                </Box>
              );
            }}
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
              "& .MuiSelect-icon": { fontSize: 18, color: "text.disabled" },
            }}
          >
            {TABS.map((tab) => {
              const count = getCount(tab);
              const isSelected = activeTab === tab;
              return (
                <MenuItem
                  key={tab}
                  value={tab}
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.78rem",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 2,
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {tab}
                  <NumberBadge
                    count={count}
                    active={isSelected}
                    inactiveBg={
                      isDark ? "rgba(255,255,255,0.28)" : "rgba(53,53,53,0.45)"
                    }
                    fontFamily={dm}
                    fontSize="0.56rem"
                    sx={{ opacity: count === 0 ? 0.5 : 1 }}
                  />
                </MenuItem>
              );
            })}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Divider
          orientation="vertical"
          flexItem
          sx={{
            mr: 0.75,
            height: 18,
            alignSelf: "center",
            borderColor: isDark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.18)",
          }}
        />

        {/* Add Member */}
        <Box
          onClick={handleOpenCreate}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.75,
            height: FILTER_BUTTON_HEIGHT,
            borderRadius: CONTROL_RADIUS,
            cursor: "pointer",
            backgroundColor: GOLD,
            color: "#1a1a1a",
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            transition: "background-color 0.15s",
            flexShrink: 0,
            "&:hover": { backgroundColor: "#e6b722" },
          }}
        >
          <AddOutlinedIcon sx={{ fontSize: 15 }} />
          Add Member
        </Box>

        {/* Export */}
        <Box
          onClick={handleExportCsv}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            height: FILTER_BUTTON_HEIGHT,
            borderRadius: CONTROL_RADIUS,
            cursor: "pointer",
            border: "1px solid rgba(0,0,0,0.12)",
            fontFamily: dm,
            fontSize: "0.78rem",
            fontWeight: 500,
            color: "text.secondary",
            backgroundColor: "#f7f7f8",
            transition: "all 0.15s",
            flexShrink: 0,
            "&:hover": {
              borderColor: "rgba(53,53,53,0.3)",
              color: "text.primary",
              backgroundColor: "#ededee",
            },
          }}
        >
          <FileDownloadOutlinedIcon sx={{ fontSize: 16 }} />
          Export
        </Box>

        {/* Manage Records */}
        <Tooltip title="Manage Staff Records" arrow>
          <IconButton
            onClick={() => setRecordsDrawerOpen(true)}
            size="small"
            sx={{
              borderRadius: CONTROL_RADIUS,
              p: 0.7,
              height: FILTER_BUTTON_HEIGHT,
              width: FILTER_BUTTON_HEIGHT,
              border: "1px solid rgba(0,0,0,0.12)",
              color: "text.secondary",
              backgroundColor: "#f7f7f8",
              transition: "all 0.15s",
              flexShrink: 0,
              "&:hover": {
                borderColor: "rgba(53,53,53,0.3)",
                color: "text.primary",
                backgroundColor: "#ededee",
              },
            }}
          >
            <SettingsOutlinedIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Row action menu ── */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          setMenuRow(null);
        }}
        onClick={() => {
          setMenuAnchor(null);
          setMenuRow(null);
        }}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        slotProps={{
          paper: {
            sx: {
              minWidth: 160,
              borderRadius: "10px",
              fontFamily: dm,
              mt: 0.5,
              boxShadow: isDark
                ? "0 8px 24px rgba(0,0,0,0.4)"
                : "0 8px 24px rgba(0,0,0,0.08)",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => menuRow && handleOpenEdit(menuRow)}
          sx={{ fontFamily: dm, fontSize: "0.78rem", gap: 1, py: 0.75 }}
        >
          <ListItemIcon sx={{ minWidth: "auto !important" }}>
            <EditOutlinedIcon sx={{ fontSize: 15, color: "text.secondary" }} />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              fontFamily: dm,
              fontSize: "0.78rem",
            }}
          >
            Edit
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menuRow) return;
            setToggleTarget(menuRow);
            setToggleOpen(true);
          }}
          sx={{ fontFamily: dm, fontSize: "0.78rem", gap: 1, py: 0.75 }}
        >
          <ListItemIcon sx={{ minWidth: "auto !important" }}>
            {menuRow?.is_active ? (
              <BlockOutlinedIcon sx={{ fontSize: 15, color: "#f97316" }} />
            ) : (
              <CheckCircleOutlineIcon sx={{ fontSize: 15, color: "#22c55e" }} />
            )}
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              fontFamily: dm,
              fontSize: "0.78rem",
            }}
          >
            {menuRow?.is_active ? "Deactivate" : "Reactivate"}
          </ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (!menuRow) return;
            setDeleteTarget(menuRow);
            setDeleteOpen(true);
          }}
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            gap: 1,
            py: 0.75,
            color: "#dc2626",
          }}
        >
          <ListItemIcon sx={{ minWidth: "auto !important" }}>
            <DeleteOutlineOutlinedIcon
              sx={{ fontSize: 15, color: "#dc2626" }}
            />
          </ListItemIcon>
          <ListItemText
            primaryTypographyProps={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "#dc2626",
            }}
          >
            Delete
          </ListItemText>
        </MenuItem>
      </Menu>

      <Box sx={{ flex: 1, minHeight: 0, width: "100%", overflowX: "auto" }}>
        <Box
          sx={{
            minWidth: 700,
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
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BrandedLoader size={44} inline />
            </Box>
          ) : (
            <DataGrid
              rows={filteredRows}
              columns={columns}
              columnVisibilityModel={{ division: activeTab === "All" }}
              pageSize={10}
              rowsPerPageOptions={[10]}
              disableRowSelectionOnClick
              rowHeight={56}
              enableSearch={false}
              apiRef={gridApiRef}
              rowSelectionModel={rowSelectionModel}
              onRowSelectionModelChange={setRowSelectionModel}
              filterModel={externalFilterModel}
              slotProps={{
                toolbar: {
                  csvOptions: { disableToolbarButton: true },
                  printOptions: { disableToolbarButton: true },
                },
              }}
              selectionActions={[
                {
                  label: `Deactivate selected`,
                  icon: <BlockOutlinedIcon sx={{ fontSize: 20 }} />,
                  onClick: (ids) => {
                    setBulkDeactivateIds(ids);
                    setBulkDeactivateOpen(true);
                  },
                },
                {
                  label: `Delete selected`,
                  icon: <DeleteOutlineOutlinedIcon sx={{ fontSize: 20 }} />,
                  color: "error",
                  onClick: (ids) => {
                    setBulkDeleteIds(ids);
                    setBulkDeleteOpen(true);
                  },
                },
              ]}
              getRowClassName={(params) =>
                (focusStaffId &&
                  String(params.row.id) === String(focusStaffId)) ||
                (highlight &&
                  params.row.full_name?.toLowerCase().includes(highlight))
                  ? "highlighted-row"
                  : ""
              }
            />
          )}
        </Box>
      </Box>

      <Drawer
        anchor="right"
        open={recordsDrawerOpen}
        onClose={() => setRecordsDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 520, md: 600 },
            borderLeft: `1px solid ${border}`,
            backgroundColor: isDark ? "#171717" : "#ffffff",
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <SettingsOutlinedIcon
              sx={{ fontSize: 16, color: "text.secondary" }}
            />
            <Typography
              sx={{ fontFamily: dm, fontSize: "0.95rem", fontWeight: 700 }}
            >
              Manage Staff Records
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setRecordsDrawerOpen(false)}>
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box sx={{ px: 2.5, py: 1.5, borderBottom: `1px solid ${border}` }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            {[
              {
                key: "deactivated",
                label: `Deactivated (${deactivatedRows.length})`,
                Icon: BlockOutlinedIcon,
              },
              {
                key: "trash",
                label: `Trash (${trashedStaffers.length})`,
                Icon: DeleteOutlineOutlinedIcon,
              },
            ].map((item) => {
              const active = recordsTab === item.key;
              return (
                <Box
                  key={item.key}
                  onClick={() => setRecordsTab(item.key)}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 0.6,
                    px: 1.35,
                    py: 0.5,
                    borderRadius: "10px",
                    border: `1px solid ${active ? "#212121" : border}`,
                    backgroundColor: active ? "#212121" : "transparent",
                    color: active ? "#ffffff" : "text.secondary",
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    fontWeight: active ? 600 : 500,
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  <item.Icon sx={{ fontSize: 14 }} />
                  {item.label}
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ p: 2.5, overflowY: "auto", flex: 1 }}>
          {recordsLoading ? (
            <Box sx={{ py: 5, display: "flex", justifyContent: "center" }}>
              <BrandedLoader size={36} inline />
            </Box>
          ) : recordsTab === "deactivated" ? (
            deactivatedRows.length === 0 ? (
              <Box
                sx={{
                  border: `1px solid ${border}`,
                  borderRadius: "10px",
                  minHeight: 220,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                }}
              >
                <ArchiveOutlinedIcon
                  sx={{
                    fontSize: 28,
                    color: isDark
                      ? "rgba(255,255,255,0.14)"
                      : "rgba(53,53,53,0.14)",
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.92rem",
                    color: "text.disabled",
                  }}
                >
                  No deactivated staff records
                </Typography>
              </Box>
            ) : (
              <Box
                sx={{
                  border: `1px solid ${border}`,
                  borderRadius: "10px",
                  p: 1.25,
                  display: "flex",
                  flexDirection: "column",
                  gap: 1,
                }}
              >
                {deactivatedRows.map((s) => (
                  <Box
                    key={s.id}
                    sx={{
                      border: `1px solid ${border}`,
                      borderRadius: "10px",
                      p: 1.2,
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Avatar
                      src={getAvatarUrl(s.avatar_url)}
                      sx={{ width: 30, height: 30, fontSize: "0.62rem" }}
                    >
                      {getInitials(s.full_name)}
                    </Avatar>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.8rem",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {s.full_name}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.7rem",
                          color: "text.secondary",
                        }}
                      >
                        {s.role} {s.section ? `· ${s.section}` : ""}
                      </Typography>
                    </Box>
                    <Box
                      onClick={async () => {
                        await toggleStafferStatus(s.id, true);
                        await loadStaffers();
                      }}
                      sx={{
                        px: 1.1,
                        py: 0.4,
                        borderRadius: "10px",
                        fontFamily: dm,
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        cursor: "pointer",
                        border: "1px solid rgba(0,0,0,0.12)",
                      }}
                    >
                      Reactivate
                    </Box>
                  </Box>
                ))}
              </Box>
            )
          ) : trashedStaffers.length === 0 ? (
            <Box
              sx={{
                border: `1px solid ${border}`,
                borderRadius: "10px",
                minHeight: 220,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
              }}
            >
              <DeleteOutlineOutlinedIcon
                sx={{
                  fontSize: 28,
                  color: isDark
                    ? "rgba(255,255,255,0.14)"
                    : "rgba(53,53,53,0.14)",
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.92rem",
                  color: "text.disabled",
                }}
              >
                No trashed staff records
              </Typography>
            </Box>
          ) : (
            <Box
              sx={{
                border: `1px solid ${border}`,
                borderRadius: "10px",
                p: 1.25,
                display: "flex",
                flexDirection: "column",
                gap: 1,
              }}
            >
              {trashedStaffers.map((s) => (
                <Box
                  key={s.id}
                  sx={{
                    border: `1px solid ${border}`,
                    borderRadius: "10px",
                    p: 1.2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Avatar
                    src={getAvatarUrl(s.avatar_url)}
                    sx={{ width: 30, height: 30, fontSize: "0.62rem" }}
                  >
                    {getInitials(s.full_name)}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.full_name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.7rem",
                        color: "text.secondary",
                      }}
                    >
                      Trashed{" "}
                      {new Date(s.trashed_at).toLocaleDateString("en-US")}
                    </Typography>
                  </Box>
                  <Box
                    onClick={() => handleRestoreFromTrash(s.id)}
                    sx={{
                      px: 1,
                      py: 0.35,
                      borderRadius: "10px",
                      fontFamily: dm,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: "1px solid rgba(0,0,0,0.12)",
                    }}
                  >
                    Restore
                  </Box>
                  <Box
                    onClick={() => handleDeletePermanently(s.id)}
                    sx={{
                      px: 1,
                      py: 0.35,
                      borderRadius: "10px",
                      fontFamily: dm,
                      fontSize: "0.7rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      color: "#dc2626",
                      border: "1px solid rgba(220,38,38,0.35)",
                      backgroundColor: "rgba(220,38,38,0.04)",
                    }}
                  >
                    Delete
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Drawer>

      {/* ── Create / Edit Dialog ── */}
      <BrandDialog
        open={formOpen}
        onClose={() => !formLoading && setFormOpen(false)}
        title={formMode === "create" ? "Add New Member" : "Edit Member"}
        isDark={isDark}
        border={border}
        footer={
          <>
            <CancelBtn
              onClick={() => setFormOpen(false)}
              disabled={formLoading}
              border={border}
            />
            <PrimaryBtn
              onClick={handleFormSubmit}
              loading={formLoading}
              tone={formMode === "create" ? "gold" : "dark"}
            >
              {formMode === "create" ? "Create Account" : "Save Changes"}
            </PrimaryBtn>
          </>
        }
      >
        {formError && (
          <Alert
            severity="error"
            sx={{
              borderRadius: "10px",
              fontFamily: dm,
              fontSize: "0.78rem",
              mb: 0.5,
            }}
          >
            {formError}
          </Alert>
        )}
        <StyledField
          label="Full Name"
          value={formData.full_name}
          onChange={(e) => handleFormChange("full_name", e.target.value)}
          disabled={formLoading}
          border={border}
        />
        {formMode === "create" && (
          <>
            <StyledField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => handleFormChange("email", e.target.value)}
              disabled={formLoading}
              border={border}
            />
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
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.15,
                      }}
                    >
                      <Tooltip
                        title={copyFeedback || "Copy credentials"}
                        arrow
                        placement="top"
                      >
                        <span>
                          <IconButton
                            size="small"
                            onClick={handleCopyCredentials}
                            edge="end"
                            disabled={formLoading}
                            sx={{
                              color: copyFeedback
                                ? "#b45309"
                                : "text.secondary",
                            }}
                          >
                            <ContentCopyOutlinedIcon sx={{ fontSize: 15 }} />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((p) => !p)}
                        edge="end"
                        sx={{ color: "text.secondary" }}
                      >
                        {showPassword ? (
                          <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />
                        ) : (
                          <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                    </Box>
                  </InputAdornment>
                ),
              }}
            />
          </>
        )}
        <StyledField
          label="Role"
          select
          value={formData.role}
          onChange={(e) => handleFormChange("role", e.target.value)}
          disabled={formLoading}
          border={border}
        >
          {ROLES.map((r) => (
            <MenuItem
              key={r.value}
              value={r.value}
              sx={{ fontFamily: dm, fontSize: "0.82rem" }}
            >
              {r.label}
            </MenuItem>
          ))}
        </StyledField>
        <StyledField
          label="Division"
          select
          value={formData.division}
          onChange={(e) => handleFormChange("division", e.target.value)}
          disabled={formLoading}
          border={border}
        >
          <MenuItem value="" sx={{ fontFamily: dm, fontSize: "0.82rem" }}>
            — None —
          </MenuItem>
          {DIVISIONS.map((d) => (
            <MenuItem
              key={d.value}
              value={d.value}
              sx={{ fontFamily: dm, fontSize: "0.82rem" }}
            >
              {d.label}
            </MenuItem>
          ))}
        </StyledField>
        <StyledField
          label="Section"
          select
          value={formData.section}
          onChange={(e) => handleFormChange("section", e.target.value)}
          disabled={formLoading || !formData.division}
          helperText={!formData.division ? "Select a division first" : ""}
          border={border}
        >
          <MenuItem value="" sx={{ fontFamily: dm, fontSize: "0.82rem" }}>
            — None —
          </MenuItem>
          {availableSections.map((s) => (
            <MenuItem
              key={s}
              value={s}
              sx={{ fontFamily: dm, fontSize: "0.82rem" }}
            >
              {s}
            </MenuItem>
          ))}
        </StyledField>
        <StyledField
          label="Position"
          select
          value={formData.position}
          onChange={(e) => handleFormChange("position", e.target.value)}
          disabled={formLoading || !formData.section}
          helperText={!formData.section ? "Select a section first" : ""}
          border={border}
        >
          <MenuItem value="" sx={{ fontFamily: dm, fontSize: "0.82rem" }}>
            — None —
          </MenuItem>
          {availablePositions.map((pos) => (
            <MenuItem
              key={pos}
              value={pos}
              sx={{ fontFamily: dm, fontSize: "0.82rem" }}
            >
              {pos}
            </MenuItem>
          ))}
        </StyledField>
        {showDesignation && (
          <StyledField
            label="Designation (optional)"
            select
            value={formData.designation}
            onChange={(e) => handleFormChange("designation", e.target.value)}
            disabled={formLoading}
            helperText="e.g. Feature Editor, Photojournalism Director, HR Manager"
            border={border}
          >
            <MenuItem value="" sx={{ fontFamily: dm, fontSize: "0.82rem" }}>
              — None —
            </MenuItem>
            {DESIGNATIONS.map((d) => (
              <MenuItem
                key={d}
                value={d}
                sx={{ fontFamily: dm, fontSize: "0.82rem" }}
              >
                {d}
              </MenuItem>
            ))}
          </StyledField>
        )}
      </BrandDialog>

      {/* ── Created Account Dialog ── */}
      <BrandDialog
        open={createdAccountOpen}
        onClose={(_, reason) => {
          if (reason === "backdropClick" || reason === "escapeKeyDown") return;
          handleAttemptCloseCreatedAccount();
        }}
        title="Account Created"
        isDark={isDark}
        border={border}
        footer={
          <>
            <Box
              onClick={() => handleCopyCreated("all")}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                px: 1.5,
                py: 0.65,
                borderRadius: "10px",
                cursor: "pointer",
                border: `1px solid ${GOLD_18}`,
                fontFamily: dm,
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "#b45309",
                backgroundColor: GOLD_08,
                transition: "all 0.15s",
                "&:hover": {
                  backgroundColor: "rgba(245,197,43,0.16)",
                },
              }}
            >
              <ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />
              {createdCopyFeedback || "Copy Credentials"}
            </Box>
            <PrimaryBtn onClick={handleAttemptCloseCreatedAccount}>
              Done
            </PrimaryBtn>
          </>
        }
      >
        <Alert
          severity="success"
          sx={{
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
            mb: 0.5,
          }}
        >
          New account has been created successfully.
        </Alert>
        <Box
          sx={{
            border: `1px solid ${border}`,
            borderRadius: "10px",
            overflow: "hidden",
          }}
        >
          {[
            ["Full Name", createdAccount?.full_name || "—"],
            ["Email", createdAccount?.email || "—"],
            ["Password", createdAccount?.password || "—"],
            ["Role", createdAccount?.role || "—"],
            ["Division", createdAccount?.division || "—"],
            ["Section", createdAccount?.section || "—"],
            ["Position", createdAccount?.position || "—"],
          ].map(([label, value], idx) => (
            <Box
              key={label}
              sx={{
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                gap: 1.25,
                px: 1.5,
                py: 1,
                borderBottom:
                  idx === 6
                    ? "none"
                    : `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.08)"}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  color: "text.secondary",
                }}
              >
                {label}
              </Typography>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.8rem",
                  fontWeight: label === "Password" ? 600 : 400,
                  color: "text.primary",
                  wordBreak: "break-word",
                }}
              >
                {label === "Password" ? (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ letterSpacing: createdShowPassword ? 0 : "0.04em" }}
                    >
                      {createdShowPassword
                        ? value
                        : value === "—"
                          ? "—"
                          : "•".repeat(String(value).length)}
                    </Box>
                    <IconButton
                      size="small"
                      onClick={() => setCreatedShowPassword((prev) => !prev)}
                      sx={{ color: "text.secondary" }}
                    >
                      {createdShowPassword ? (
                        <VisibilityOffOutlinedIcon sx={{ fontSize: 16 }} />
                      ) : (
                        <VisibilityOutlinedIcon sx={{ fontSize: 16 }} />
                      )}
                    </IconButton>
                  </Box>
                ) : (
                  value
                )}
              </Typography>
            </Box>
          ))}
        </Box>
      </BrandDialog>

      <BrandDialog
        open={createdDismissConfirmOpen}
        onClose={() => setCreatedDismissConfirmOpen(false)}
        title="Close Without Copying?"
        isDark={isDark}
        border={border}
        footer={
          <>
            <CancelBtn
              onClick={() => setCreatedDismissConfirmOpen(false)}
              border={border}
            />
            <Box
              onClick={clearCreatedAccountState}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.75,
                py: 0.65,
                borderRadius: "10px",
                cursor: "pointer",
                backgroundColor: "#dc2626",
                color: "#fff",
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                transition: "background-color 0.15s",
                "&:hover": { backgroundColor: "#b91c1c" },
              }}
            >
              Close Anyway
            </Box>
          </>
        }
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            color: "text.secondary",
            lineHeight: 1.65,
          }}
        >
          You have not copied the generated credentials yet. Once you close this
          dialog, you will not be able to view this password again. Continue
          only if you are sure.
        </Typography>
      </BrandDialog>

      {/* ── Toggle Status Dialog ── */}
      <BrandDialog
        open={toggleOpen}
        onClose={() => !toggleLoading && setToggleOpen(false)}
        title={
          toggleTarget?.is_active ? "Deactivate Account" : "Reactivate Account"
        }
        isDark={isDark}
        border={border}
        footer={
          <>
            <CancelBtn
              onClick={() => setToggleOpen(false)}
              disabled={toggleLoading}
              border={border}
            />
            <PrimaryBtn onClick={handleConfirmToggle} loading={toggleLoading}>
              {toggleTarget?.is_active ? "Yes, Deactivate" : "Yes, Reactivate"}
            </PrimaryBtn>
          </>
        }
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            color: "text.secondary",
            lineHeight: 1.65,
          }}
        >
          {toggleTarget?.is_active ? (
            <>
              Are you sure you want to deactivate{" "}
              <strong style={{ color: CHARCOAL }}>
                {toggleTarget?.full_name}
              </strong>
              's account? They will no longer be able to log in.
            </>
          ) : (
            <>
              Are you sure you want to reactivate{" "}
              <strong style={{ color: CHARCOAL }}>
                {toggleTarget?.full_name}
              </strong>
              's account? They will regain access to the system.
            </>
          )}
        </Typography>
      </BrandDialog>

      {/* ── Delete Dialog ── */}
      <BrandDialog
        open={deleteOpen}
        onClose={() => !deleteLoading && setDeleteOpen(false)}
        title="Move Account to Trash"
        isDark={isDark}
        border={border}
        footer={
          <>
            <CancelBtn
              onClick={() => setDeleteOpen(false)}
              disabled={deleteLoading}
              border={border}
            />
            <Box
              onClick={!deleteLoading ? handleConfirmDelete : undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.75,
                py: 0.65,
                borderRadius: "10px",
                cursor: deleteLoading ? "default" : "pointer",
                backgroundColor: "#dc2626",
                color: "#fff",
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                opacity: deleteLoading ? 0.7 : 1,
                transition: "background-color 0.15s",
                "&:hover": {
                  backgroundColor: deleteLoading ? "#dc2626" : "#b91c1c",
                },
              }}
            >
              {deleteLoading && (
                <CircularProgress size={13} sx={{ color: "#fff" }} />
              )}
              Move to Trash
            </Box>
          </>
        }
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            color: "text.secondary",
            lineHeight: 1.65,
            mb: 1.5,
          }}
        >
          Are you sure you want to move{" "}
          <strong style={{ color: CHARCOAL }}>{deleteTarget?.full_name}</strong>
          's account to trash? You can restore it from Manage Staff Records.
        </Typography>
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: "10px",
            backgroundColor: isDark
              ? "rgba(239,68,68,0.06)"
              : "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.76rem",
              color: "#dc2626",
              lineHeight: 1.6,
            }}
          >
            Use this only for graduates or members who have permanently left
            TGP. For temporary deactivation, use the deactivate option instead.
          </Typography>
        </Box>
      </BrandDialog>

      {/* ── Bulk Delete Dialog ── */}
      <BrandDialog
        open={bulkDeleteOpen}
        onClose={() => !bulkDeleteLoading && setBulkDeleteOpen(false)}
        title="Move Accounts to Trash"
        isDark={isDark}
        border={border}
        footer={
          <>
            <CancelBtn
              onClick={() => setBulkDeleteOpen(false)}
              disabled={bulkDeleteLoading}
              border={border}
            />
            <Box
              onClick={!bulkDeleteLoading ? handleBulkDeleteConfirm : undefined}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.75,
                py: 0.65,
                borderRadius: "10px",
                cursor: bulkDeleteLoading ? "default" : "pointer",
                backgroundColor: "#dc2626",
                color: "#fff",
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                opacity: bulkDeleteLoading ? 0.7 : 1,
                transition: "background-color 0.15s",
                "&:hover": {
                  backgroundColor: bulkDeleteLoading ? "#dc2626" : "#b91c1c",
                },
              }}
            >
              {bulkDeleteLoading && (
                <CircularProgress size={13} sx={{ color: "#fff" }} />
              )}
              Move {bulkDeleteIds.length} Account
              {bulkDeleteIds.length !== 1 ? "s" : ""}
            </Box>
          </>
        }
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            color: "text.secondary",
            lineHeight: 1.65,
            mb: 1.5,
          }}
        >
          You are about to move{" "}
          <strong style={{ color: CHARCOAL }}>
            {bulkDeleteIds.length} account
            {bulkDeleteIds.length !== 1 ? "s" : ""}
          </strong>
          . You can restore them from Manage Staff Records.
        </Typography>
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: "10px",
            backgroundColor: isDark
              ? "rgba(239,68,68,0.06)"
              : "rgba(239,68,68,0.05)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.76rem",
              color: "#dc2626",
              lineHeight: 1.6,
            }}
          >
            Use this when members should be removed from the active roster while
            keeping a recovery option in trash.
          </Typography>
        </Box>
      </BrandDialog>

      {/* ── Bulk Deactivate Dialog ── */}
      <BrandDialog
        open={bulkDeactivateOpen}
        onClose={() => !bulkDeactivateLoading && setBulkDeactivateOpen(false)}
        title="Deactivate Accounts"
        isDark={isDark}
        border={border}
        footer={
          <>
            <CancelBtn
              onClick={() => setBulkDeactivateOpen(false)}
              disabled={bulkDeactivateLoading}
              border={border}
            />
            <Box
              onClick={
                !bulkDeactivateLoading ? handleBulkDeactivateConfirm : undefined
              }
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                px: 1.75,
                py: 0.65,
                borderRadius: "10px",
                cursor: bulkDeactivateLoading ? "default" : "pointer",
                backgroundColor: "#1f2937",
                color: "#fff",
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                opacity: bulkDeactivateLoading ? 0.7 : 1,
                transition: "background-color 0.15s",
                "&:hover": {
                  backgroundColor: bulkDeactivateLoading
                    ? "#1f2937"
                    : "#111827",
                },
              }}
            >
              {bulkDeactivateLoading && (
                <CircularProgress size={13} sx={{ color: "#fff" }} />
              )}
              Deactivate {bulkDeactivateIds.length} Account
              {bulkDeactivateIds.length !== 1 ? "s" : ""}
            </Box>
          </>
        }
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.82rem",
            color: "text.secondary",
            lineHeight: 1.65,
            mb: 1.5,
          }}
        >
          You are about to deactivate{" "}
          <strong style={{ color: CHARCOAL }}>
            {bulkDeactivateIds.length} account
            {bulkDeactivateIds.length !== 1 ? "s" : ""}
          </strong>
          . Deactivated members can be reactivated later.
        </Typography>
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: "10px",
            backgroundColor: isDark
              ? "rgba(31,41,55,0.16)"
              : "rgba(31,41,55,0.06)",
            border: "1px solid rgba(31,41,55,0.2)",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.76rem",
              color: isDark ? "rgba(255,255,255,0.75)" : "#374151",
              lineHeight: 1.6,
            }}
          >
            This is a reversible action and is recommended for members who are
            temporarily inactive.
          </Typography>
        </Box>
      </BrandDialog>
    </Box>
  );
}

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

function BrandDialog({
  open,
  onClose,
  title,
  children,
  footer,
  isDark,
  border,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
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
          display: "flex",
          flexDirection: "column",
          maxHeight: "90vh",
        },
      }}
    >
      {/* ── Header ── */}
      <Box
        sx={{
          px: 2.5,
          py: 1.75,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              width: 3,
              height: 22,
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
            {title}
          </Typography>
        </Box>
        <IconButton
          size="small"
          onClick={onClose}
          sx={{
            borderRadius: "10px",
            color: "text.secondary",
            "&:hover": {
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
            },
          }}
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* ── Scrollable body ── */}
      <Box
        sx={{
          px: 2.5,
          py: 2,
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          overflowY: "auto",
          flex: 1,
          "&::-webkit-scrollbar": { width: "4px" },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: isDark
              ? "rgba(255,255,255,0.1)"
              : "rgba(53,53,53,0.15)",
            borderRadius: "10px",
          },
        }}
      >
        {children}
      </Box>

      {/* ── Sticky footer ── */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          flexShrink: 0,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.01)"
            : "rgba(53,53,53,0.01)",
        }}
      >
        {footer}
      </Box>
    </Dialog>
  );
}

function CancelBtn({ onClick, disabled, border }) {
  return (
    <Box
      onClick={!disabled ? onClick : undefined}
      sx={{
        px: 1.75,
        py: 0.65,
        borderRadius: "10px",
        cursor: disabled ? "default" : "pointer",
        border: `1px solid ${border}`,
        fontFamily: dm,
        fontSize: "0.8rem",
        fontWeight: 500,
        color: "text.secondary",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        "&:hover": { borderColor: "rgba(53,53,53,0.4)", color: "text.primary" },
      }}
    >
      Cancel
    </Box>
  );
}

function PrimaryBtn({ onClick, loading, children, tone = "dark" }) {
  const isGold = tone === "gold";
  return (
    <Box
      onClick={!loading ? onClick : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        px: 1.75,
        py: 0.65,
        borderRadius: "10px",
        cursor: loading ? "default" : "pointer",
        backgroundColor: isGold ? GOLD : "#212121",
        color: isGold ? "#1a1a1a" : "#fff",
        fontFamily: dm,
        fontSize: "0.8rem",
        fontWeight: 600,
        opacity: loading ? 0.7 : 1,
        transition: "background-color 0.15s",
        "&:hover": {
          backgroundColor: loading
            ? isGold
              ? GOLD
              : "#212121"
            : isGold
              ? "#e6b722"
              : "#333",
        },
      }}
    >
      {loading && (
        <CircularProgress
          size={13}
          sx={{ color: isGold ? "#1a1a1a" : "#fff" }}
        />
      )}
      {children}
    </Box>
  );
}

function StyledField({ border, children, InputProps, slotProps, ...props }) {
  const mergedSlotProps = InputProps
    ? {
        ...(slotProps || {}),
        input: {
          ...(slotProps?.input || {}),
          ...InputProps,
        },
      }
    : slotProps;

  return (
    <TextField
      size="small"
      fullWidth
      sx={{
        "& .MuiOutlinedInput-root": {
          fontFamily: dm,
          fontSize: "0.82rem",
          borderRadius: "10px",
          "& fieldset": { borderColor: border },
          "&:hover fieldset": { borderColor: "rgba(245,197,43,0.5)" },
          "&.Mui-focused fieldset": { borderColor: GOLD },
        },
        "& .MuiInputLabel-root": { fontFamily: dm, fontSize: "0.8rem" },
        "& .MuiInputLabel-root.Mui-focused": { color: "#b45309" },
        "& .MuiFormHelperText-root": { fontFamily: dm, fontSize: "0.72rem" },
      }}
      slotProps={mergedSlotProps}
      {...props}
    >
      {children}
    </TextField>
  );
}
