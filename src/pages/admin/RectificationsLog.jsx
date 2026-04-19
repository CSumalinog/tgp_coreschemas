// src/pages/admin/RectificationsLog.jsx
// Read-only admin view of all rectification requests across all sections.
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Dialog,
  useTheme,
  Tooltip,
  FormControl,
  OutlinedInput,
  InputAdornment,
  Select,
  MenuItem,
} from "@mui/material";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import OpenInNewOutlinedIcon from "@mui/icons-material/OpenInNewOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import IconButton from "@mui/material/IconButton";
import BrandedLoader from "../../components/common/BrandedLoader";
import { StaffAvatar } from "../../components/common/UserAvatar";
import { DataGrid } from "../../components/common/AppDataGrid";
import { supabase } from "../../lib/supabaseClient";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import {
  CONTROL_RADIUS,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
  FILTER_SEARCH_FLEX,
  FILTER_SEARCH_MIN_WIDTH,
  FILTER_SEARCH_MAX_WIDTH,
  FILTER_STATUS_MIN_WIDTH,
  FILTER_SEMESTER_MIN_WIDTH,
} from "../../utils/layoutTokens";

const dm = "'Inter', sans-serif";

const STATUS_CONFIG = {
  pending: {
    label: "Pending",
    bg: "#fefce8",
    color: "#854d0e",
    dot: "#eab308",
  },
  approved: {
    label: "Approved",
    bg: "#f0fdf4",
    color: "#15803d",
    dot: "#22c55e",
  },
  rejected: {
    label: "Rejected",
    bg: "#fef2f2",
    color: "#991b1b",
    dot: "#ef4444",
  },
};

const AVATAR_COLORS = [
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#FFF3E0", color: "#7C4300" },
  { bg: "#F3E8FD", color: "#5B1494" },
  { bg: "#E8FDF3", color: "#0C6B3C" },
  { bg: "#FDE8EF", color: "#8B0C36" },
];

function getAvatarColor(id = "") {
  const sum = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Read-Only Detail Dialog ────────────────────────────────────────────────────
function ViewDialog({ open, request, isDark, border, onClose }) {
  if (!request) return null;

  const proofUrl = request.proof_path
    ? (() => {
        const { data } = supabase.storage
          .from("coverage-files")
          .getPublicUrl(request.proof_path);
        return data?.publicUrl ?? null;
      })()
    : null;

  const statusCfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: { sx: { borderRadius: "10px", border: `1px solid ${border}` } },
      }}
    >
      {/* Header */}
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
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <GavelOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.88rem", fontWeight: 700 }}
          >
            Rectification Details
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      {/* Body */}
      <Box sx={{ px: 3, pt: 2.5, pb: 2.5 }}>
        {/* Status badge */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: 0.5,
              px: 1,
              py: 0.3,
              borderRadius: "20px",
              backgroundColor: statusCfg.bg,
            }}
          >
            <Box
              sx={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: statusCfg.dot,
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.72rem",
                fontWeight: 600,
                color: statusCfg.color,
                textTransform: "capitalize",
              }}
            >
              {statusCfg.label}
            </Typography>
          </Box>
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.72rem", color: "text.disabled" }}
          >
            Section: {request.section ?? "—"}
          </Typography>
        </Box>

        <Row label="Staff member" value={request.staff?.full_name ?? "—"} />
        <Row label="Assignment" value={request.request?.title ?? "—"} />
        <Row label="Submitted" value={fmtDate(request.created_at)} />

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.75rem",
            color: "text.secondary",
            mb: 0.25,
            mt: 1.5,
          }}
        >
          Reason
        </Typography>
        <Box
          sx={{
            p: 1.25,
            borderRadius: "8px",
            border: `1px solid ${border}`,
            backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f9f9f9",
            mb: 1.5,
          }}
        >
          <Typography
            sx={{ fontFamily: dm, fontSize: "0.82rem", lineHeight: 1.55 }}
          >
            {request.reason ?? "—"}
          </Typography>
        </Box>

        {request.status !== "pending" && (
          <>
            <Box sx={{ borderTop: `1px solid ${border}`, mt: 1.5, pt: 1.5 }}>
              <Row
                label="Reviewed by"
                value={request.reviewer?.full_name ?? "—"}
              />
              <Row label="Reviewed on" value={fmtDate(request.reviewed_at)} />
              {request.reviewer_note && (
                <>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                      mb: 0.25,
                      mt: 1,
                    }}
                  >
                    Reviewer note
                  </Typography>
                  <Box
                    sx={{
                      p: 1.25,
                      borderRadius: "8px",
                      border: `1px solid ${border}`,
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.02)"
                        : "#f9f9f9",
                    }}
                  >
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.82rem",
                        lineHeight: 1.55,
                      }}
                    >
                      {request.reviewer_note}
                    </Typography>
                  </Box>
                </>
              )}
            </Box>
          </>
        )}
      </Box>

      {/* Footer */}
      <Box
        sx={{
          px: 3,
          py: 1.75,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <Box
          onClick={onClose}
          sx={{
            px: 1.75,
            py: 0.65,
            borderRadius: "4px",
            cursor: "pointer",
            border: `1px solid ${border}`,
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: 600,
            color: "text.secondary",
            userSelect: "none",
            "&:hover": {
              color: "text.primary",
              borderColor: "rgba(53,53,53,0.3)",
            },
          }}
        >
          Close
        </Box>
      </Box>
    </Dialog>
  );
}

function Row({ label, value }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.75rem",
          color: "text.secondary",
          mb: 0.2,
        }}
      >
        {label}
      </Typography>
      <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 500 }}>
        {value}
      </Typography>
    </Box>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function RectificationsLog() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.08)";
  const navigate = useNavigate();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");
  const [viewTarget, setViewTarget] = useState(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("rectification_requests")
      .select(
        `id, assignment_id, request_id, staff_id, section, reason, proof_path,
         status, reviewed_at, reviewer_note, created_at,
         staff:profiles!staff_id(id, full_name, avatar_url),
         reviewer:profiles!reviewed_by(id, full_name, avatar_url),
         request:coverage_requests!request_id(id, title)`,
      )
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    supabase
      .from("semesters")
      .select("*")
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        setSemesters(data || []);
        const active = (data || []).find((s) => s.is_active);
        if (active) setSelectedSem(active.id);
      });
  }, []);

  // ── CSV export ───────────────────────────────────────────────────────────────
  const runExport = useCallback(() => {
    const headers = [
      "Staff",
      "Assignment",
      "Status",
      "Submitted",
      "Reviewed By",
      "Reviewed At",
      "Reviewer Note",
    ];
    const dataRows = requests.map((r) => [
      r.staff?.full_name ?? "",
      r.request?.title ?? "",
      r.status ?? "",
      fmtDate(r.created_at),
      r.reviewer?.full_name ?? "",
      fmtDate(r.reviewed_at),
      r.reviewer_note ?? "",
    ]);
    const escape = (v) => {
      const s = String(v ?? "").replace(/"/g, '""');
      return /[,"\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [headers, ...dataRows]
      .map((row) => row.map(escape).join(","))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `rectifications-log.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [requests]);

  // ── Filtered rows ────────────────────────────────────────────────────────────
  const rows = useMemo(
    () =>
      requests
        .filter((r) => {
          if (statusFilter !== "all" && r.status !== statusFilter) return false;
          if (selectedSem !== "all") {
            const sem = semesters.find((s) => s.id === selectedSem);
            if (sem) {
              const from = new Date(sem.start_date + "T00:00:00");
              const to = new Date(sem.end_date + "T23:59:59");
              const d = new Date(r.created_at);
              if (d < from || d > to) return false;
            }
          }
          if (!searchText.trim()) return true;
          const tokens = searchText.toLowerCase().split(/\s+/).filter(Boolean);
          const haystack = [
            r.staff?.full_name ?? "",
            r.request?.title ?? "",
            r.reason ?? "",
            r.reviewer?.full_name ?? "",
          ]
            .join(" ")
            .toLowerCase();
          return tokens.every((t) => haystack.includes(t));
        })
        .map((r) => {
          const ac = getAvatarColor(r.staff_id ?? r.id);
          const statusCfg = STATUS_CONFIG[r.status] ?? STATUS_CONFIG.pending;
          return {
            id: r.id,
            staffId: r.staff_id,
            staffName: r.staff?.full_name ?? "—",
            staffAvatarUrl: r.staff?.avatar_url ?? null,
            avatarBg: ac.bg,
            avatarFg: ac.color,
            title: r.request?.title ?? "—",
            requestId: r.request_id,
            status: r.status,
            statusLabel: statusCfg.label,
            statusBg: statusCfg.bg,
            statusColor: statusCfg.color,
            statusDot: statusCfg.dot,
            submitted: r.created_at,
            reviewedBy: r.reviewer?.full_name ?? "—",
            reviewedAt: r.reviewed_at,
            hasProof: !!r.proof_path,
            proofPath: r.proof_path,
            _raw: r,
          };
        }),
    [requests, searchText, statusFilter, selectedSem, semesters],
  );

  // ── Columns ──────────────────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        field: "title",
        headerName: "Assignment",
        flex: 1.2,
        minWidth: 160,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "_nav_req",
        headerName: "",
        width: 48,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Tooltip title="View in Request Management">
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/coverage-tracker/requests`, {
                    state: { openRequestId: p.row.requestId },
                  });
                }}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: "6px",
                  border: `1px solid ${border}`,
                  cursor: "pointer",
                  color: "text.disabled",
                  transition: "all 0.15s",
                  "&:hover": { borderColor: "#212121", color: "#212121" },
                }}
              >
                <ArrowForwardOutlinedIcon sx={{ fontSize: 13 }} />
              </Box>
            </Tooltip>
          </Box>
        ),
      },
      {
        field: "staffName",
        headerName: "Staff",
        flex: 1.2,
        minWidth: 160,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              gap: 0.75,
            }}
          >
            <StaffAvatar
              path={p.row.staffAvatarUrl}
              name={p.value}
              bg={p.row.avatarBg}
              fg={p.row.avatarFg}
            />
            <Typography
              sx={{ fontFamily: dm, fontSize: "0.8rem", fontWeight: 500 }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "_nav_staff",
        headerName: "",
        width: 48,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
            }}
          >
            <Tooltip title="View in Staffers Management">
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/staffers-management?focus=${p.row.staffId}`);
                }}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 24,
                  height: 24,
                  borderRadius: "6px",
                  border: `1px solid ${border}`,
                  cursor: "pointer",
                  color: "text.disabled",
                  transition: "all 0.15s",
                  "&:hover": { borderColor: "#212121", color: "#212121" },
                }}
              >
                <ArrowForwardOutlinedIcon sx={{ fontSize: 13 }} />
              </Box>
            </Tooltip>
          </Box>
        ),
      },
      {
        field: "submitted",
        headerName: "Submitted",
        flex: 0.9,
        minWidth: 130,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                color: "text.secondary",
              }}
            >
              {fmtDate(p.value)}
            </Typography>
          </Box>
        ),
      },
      {
        field: "reviewedBy",
        headerName: "Reviewed By",
        flex: 1,
        minWidth: 140,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                color: p.value === "—" ? "text.disabled" : "text.primary",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "hasProof",
        headerName: "Proof",
        width: 80,
        sortable: false,
        disableColumnMenu: true,
        renderCell: (p) => {
          if (!p.value) {
            return (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "100%" }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.8rem",
                    color: "text.disabled",
                  }}
                >
                  —
                </Typography>
              </Box>
            );
          }
          const { data } = supabase.storage
            .from("coverage-files")
            .getPublicUrl(p.row.proofPath);
          return (
            <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
              <Tooltip title="View Proof">
                <Box
                  component="a"
                  href={data?.publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "text.secondary",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  <InsertDriveFileOutlinedIcon sx={{ fontSize: 16 }} />
                </Box>
              </Tooltip>
            </Box>
          );
        },
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.8,
        minWidth: 120,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.5,
                px: 0.9,
                py: 0.25,
                borderRadius: "20px",
                backgroundColor: p.row.statusBg,
              }}
            >
              <Box
                sx={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: p.row.statusDot,
                  flexShrink: 0,
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: p.row.statusColor,
                  textTransform: "capitalize",
                }}
              >
                {p.row.statusLabel}
              </Typography>
            </Box>
          </Box>
        ),
      },
    ],
    [navigate],
  );

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2, md: 3 },
        pt: { xs: 1.5, sm: 2, md: 3 },
        pb: { xs: 1.5, sm: 2, md: 3 },
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: isDark ? "background.default" : "#ffffff",
        fontFamily: dm,
      }}
    >
      {/* ── Toolbar ── */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: FILTER_ROW_GAP,
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        <FormControl
          size="small"
          sx={{
            flexShrink: 0,
            minWidth: FILTER_SEARCH_MIN_WIDTH,
          }}
        >
          <OutlinedInput
            placeholder="Search staff, section, assignment…"
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
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          />
        </FormControl>

        <FormControl size="small" sx={{ minWidth: FILTER_STATUS_MIN_WIDTH, flexShrink: 0 }}>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          >
            <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
              All Statuses
            </MenuItem>
            <MenuItem
              value="pending"
              sx={{ fontFamily: dm, fontSize: "0.78rem" }}
            >
              Pending
            </MenuItem>
            <MenuItem
              value="approved"
              sx={{ fontFamily: dm, fontSize: "0.78rem" }}
            >
              Approved
            </MenuItem>
            <MenuItem
              value="rejected"
              sx={{ fontFamily: dm, fontSize: "0.78rem" }}
            >
              Rejected
            </MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: FILTER_SEMESTER_MIN_WIDTH, flexShrink: 0 }}>
          <Select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              borderRadius: CONTROL_RADIUS,
              height: FILTER_INPUT_HEIGHT,
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          >
            <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
              All Semesters
            </MenuItem>
            {semesters.map((s) => (
              <MenuItem
                key={s.id}
                value={s.id}
                sx={{ fontFamily: dm, fontSize: "0.78rem" }}
              >
                {getSemesterDisplayName(s)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Export" arrow>
          <IconButton
            size="small"
            onClick={runExport}
            sx={{
              borderRadius: CONTROL_RADIUS,
              width: FILTER_INPUT_HEIGHT,
              height: FILTER_INPUT_HEIGHT,
              border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
              color: "text.secondary",
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              flexShrink: 0,
              "&:hover": {
                borderColor: "rgba(53,53,53,0.3)",
                color: "text.primary",
                backgroundColor: "#ededee",
              },
            }}
          >
            <FileDownloadOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Tooltip>
      </Box>

      {/* DataGrid — skeleton rows shown while loading */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          border: `1px solid ${border}`,
          borderRadius: "10px",
          overflow: "hidden",
          boxShadow: isDark
            ? "0 1px 10px rgba(0,0,0,0.4)"
            : "0 1px 8px rgba(0,0,0,0.07)",
        }}
      >
        <DataGrid
          rows={rows}
          columns={columns}
          loading={loading}
          rowHeight={56}
          showToolbar={false}
          onRowClick={(params) => setViewTarget(params.row._raw)}
          sx={{ height: "100%", cursor: "pointer" }}
          pageSizeOptions={[25, 50, 100]}
        />
      </Box>

      {/* Detail dialog */}
      <ViewDialog
        open={!!viewTarget}
        request={viewTarget}
        isDark={isDark}
        border={border}
        onClose={() => setViewTarget(null)}
      />
    </Box>
  );
}
