// src/pages/client/RequestTracker.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  useTheme,
  Dialog,
  DialogContent,
  IconButton,
  Avatar,
  GlobalStyles,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { DataGrid } from "@mui/x-data-grid";
import { useClientRequests } from "../../hooks/useClientRequests";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import { generateConfirmationPDF } from "../../utils/generateConfirmationPDF";

// ── Helpers ───────────────────────────────────────────────────────────────────
const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};
const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage
    .from("coverage-files")
    .getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};
const getInitials = (name) => {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};
const getFriendlyStatus = (status) => {
  const map = {
    Forwarded: "Under Review",
    Assigned: "Staff Assigned",
    "For Approval": "For Approval",
    "On Going": "On Going",
    Completed: "Completed",
  };
  return map[status] || status;
};

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_18 = "rgba(245,197,43,0.18)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

// ── Constants ─────────────────────────────────────────────────────────────────
const SECTION_COLORS = {
  News: { bg: "#e3f2fd", color: "#1565c0" },
  Photojournalism: { bg: "#f3e5f5", color: "#7b1fa2" },
  Videojournalism: { bg: "#e8f5e9", color: "#2e7d32" },
};
const PIPELINE_STAGES = [
  {
    key: "Pending",
    label: "Submitted",
    sub: "Awaiting admin review",
    phase: 1,
  },
  {
    key: "Forwarded",
    label: "Under Review",
    sub: "Forwarded to section heads",
    phase: 1,
  },
  {
    key: "Assigned",
    label: "Staff Assigned",
    sub: "Staffers have been assigned",
    phase: 1,
  },
  {
    key: "For Approval",
    label: "For Approval",
    sub: "Awaiting final admin sign-off",
    phase: 1,
  },
  { key: "Approved", label: "Approved", sub: "Request approved", phase: 1 },
  { key: "On Going", label: "On Going", sub: "Coverage is underway", phase: 2 },
  { key: "Completed", label: "Completed", sub: "Coverage complete", phase: 2 },
];
const STATUS_CONFIG = {
  Pending: { bg: "#fef9ec", color: "#b45309", dot: "#f59e0b" },
  Forwarded: { bg: "#f5f3ff", color: "#6d28d9", dot: "#8b5cf6" },
  Assigned: { bg: "#fff7ed", color: "#c2410c", dot: "#f97316" },
  "For Approval": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Approved: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  "On Going": { bg: "#eff6ff", color: "#1d4ed8", dot: "#3b82f6" },
  Completed: { bg: "#f0fdf4", color: "#15803d", dot: "#22c55e" },
  Declined: { bg: "#fef2f2", color: "#dc2626", dot: "#ef4444" },
  Draft: { bg: "#f9fafb", color: "#6b7280", dot: "#9ca3af" },
};
const getStageIndex = (status) => {
  const map = {
    Pending: 0,
    Forwarded: 1,
    Assigned: 2,
    "For Approval": 3,
    Approved: 4,
    "On Going": 5,
    Completed: 6,
  };
  return map[status] ?? -1;
};

const TABS = ["Pipeline", "All Requests", "Pending", "Approved", "Declined"];

// ── Shared silent realtime options (no sound/toast/flash for assignment changes) ──
const SILENT = { sound: false, toast: false, tabFlash: false };

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

// ── Root ──────────────────────────────────────────────────────────────────────
export default function RequestTracker() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [tab, setTab] = useState(0);
  const border = isDark ? BORDER_DARK : BORDER;

  return (
    <Box
      sx={{
        p: 3,
        height: "100%",
        boxSizing: "border-box",
        backgroundColor: "background.default",
        fontFamily: dm,
      }}
    >
      <ColumnMenuStyles isDark={isDark} border={border} />

      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            color: "text.secondary",
            lineHeight: 1.5,
          }}
        >
          Track the status of your coverage requests from submission to
          completion.
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 0,
          mb: 3,
          borderBottom: `1px solid ${border}`,
        }}
      >
        {TABS.map((label, idx) => (
          <Box
            key={label}
            onClick={() => setTab(idx)}
            sx={{
              px: 2,
              py: 1.1,
              cursor: "pointer",
              position: "relative",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: tab === idx ? 600 : 400,
              color: tab === idx ? CHARCOAL : "text.secondary",
              transition: "color 0.15s",
              "&:hover": { color: CHARCOAL },
              "&::after":
                tab === idx
                  ? {
                      content: '""',
                      position: "absolute",
                      bottom: -1,
                      left: 0,
                      right: 0,
                      height: "2px",
                      borderRadius: "2px 2px 0 0",
                      backgroundColor: GOLD,
                    }
                  : {},
            }}
          >
            {label}
          </Box>
        ))}
      </Box>

      {tab === 0 && <PipelineTab isDark={isDark} border={border} />}
      {tab === 1 && <AllRequestsTab isDark={isDark} border={border} />}
      {tab === 2 && <PendingTab isDark={isDark} border={border} />}
      {tab === 3 && <ApprovedTab isDark={isDark} border={border} />}
      {tab === 4 && <DeclinedTab isDark={isDark} border={border} />}
    </Box>
  );
}

// ── Pipeline Tab ──────────────────────────────────────────────────────────────
function PipelineTab({ isDark, border }) {
  const { requests, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);

  // Subscribe to both tables — status changes on coverage_requests AND
  // coverage_assignments (time in / complete) both trigger a refetch
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });

  const active = requests.filter((r) =>
    [
      "Pending",
      "Forwarded",
      "Assigned",
      "For Approval",
      "Approved",
      "On Going",
      "Completed",
    ].includes(r.status),
  );

  if (loading) return <Loader />;
  if (active.length === 0)
    return (
      <Box sx={{ py: 10, textAlign: "center" }}>
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.85rem", color: "text.secondary" }}
        >
          No active requests in the pipeline.
        </Typography>
      </Box>
    );

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {active.map((req) => (
          <PipelineCard
            key={req.id}
            request={req}
            isDark={isDark}
            border={border}
            onClick={() => setSelected(req)}
          />
        ))}
      </Box>
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
      />
    </>
  );
}

function PipelineCard({ request, isDark, border, onClick }) {
  const currentIdx = getStageIndex(request.status);
  const isDeclined = request.status === "Declined";
  const cfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.Draft;
  const currentPhase = currentIdx >= 5 ? 2 : 1;

  const phase1 = PIPELINE_STAGES.filter((s) => s.phase === 1);
  const phase2 = PIPELINE_STAGES.filter((s) => s.phase === 2);

  const renderStages = (stages, baseOffset) =>
    stages.map((stage, i) => {
      const idx = baseOffset + i;
      const done = idx < currentIdx;
      const current = idx === currentIdx;
      const isP2 = stage.phase === 2;
      return (
        <React.Fragment key={stage.key}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              flex: 1,
              minWidth: 0,
              opacity: isP2 && currentPhase < 2 ? 0.45 : 1,
              transition: "opacity 0.2s",
            }}
          >
            <Box sx={{ mb: 0.5 }}>
              {done ? (
                <CheckCircleIcon sx={{ fontSize: 16, color: "#22c55e" }} />
              ) : current ? (
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    backgroundColor: isP2 ? "#3b82f6" : GOLD,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: `0 0 0 3px ${isP2 ? "rgba(59,130,246,0.15)" : GOLD_08}`,
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: "#fff",
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    border: `1.5px solid ${isDark ? "#444" : "#d1d5db"}`,
                  }}
                />
              )}
            </Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.61rem",
                textAlign: "center",
                lineHeight: 1.3,
                px: 0.25,
                fontWeight: current ? 600 : 400,
                color: done
                  ? "#15803d"
                  : current
                    ? "text.primary"
                    : "text.secondary",
              }}
            >
              {stage.label}
            </Typography>
          </Box>
          {i < stages.length - 1 && (
            <Box
              sx={{
                height: "1.5px",
                flex: 1,
                mx: 0.5,
                mb: 2.8,
                borderRadius: 1,
                backgroundColor:
                  idx < currentIdx ? "#22c55e" : isDark ? "#333" : "#e5e7eb",
                transition: "background-color 0.3s",
                opacity: isP2 && currentPhase < 2 ? 0.35 : 1,
              }}
            />
          )}
        </React.Fragment>
      );
    });

  return (
    <Box
      onClick={onClick}
      sx={{
        px: 2.5,
        py: 2,
        borderRadius: "10px",
        border: `1px solid ${border}`,
        backgroundColor: "background.paper",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        "&:hover": {
          borderColor: GOLD,
          boxShadow: `0 2px 16px ${isDark ? "rgba(0,0,0,0.25)" : "rgba(53,53,53,0.06)"}`,
        },
      }}
    >
      {/* Title row */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 2,
        }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 600,
              fontSize: "0.88rem",
              color: "text.primary",
              lineHeight: 1.3,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {request.title}
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.72rem",
              color: "text.secondary",
              mt: 0.25,
            }}
          >
            {request.event_date || "—"}
            {request.venue ? ` · ${request.venue}` : ""}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            ml: 2,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              px: 1.25,
              py: 0.35,
              borderRadius: "6px",
              backgroundColor: cfg.bg,
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
                color: cfg.color,
                letterSpacing: "0.04em",
              }}
            >
              {getFriendlyStatus(request.status)}
            </Typography>
          </Box>
          <ChevronRightIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        </Box>
      </Box>

      {/* Pipeline stages or declined message */}
      {!isDeclined ? (
        <Box>
          {/* Phase labels row */}
          <Box
            sx={{ display: "flex", alignItems: "center", gap: 0.5, mb: 1.25 }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flex: phase1.length,
              }}
            >
              <Box
                sx={{
                  px: 0.75,
                  py: 0.1,
                  borderRadius: "4px",
                  backgroundColor:
                    currentPhase === 1
                      ? GOLD_08
                      : isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(53,53,53,0.04)",
                  border: `1px solid ${currentPhase === 1 ? "rgba(245,197,43,0.3)" : isDark ? "#2e2e2e" : "#e8e8e8"}`,
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.56rem",
                    fontWeight: 700,
                    color:
                      currentPhase === 1
                        ? isDark
                          ? GOLD
                          : "#7a5c00"
                        : "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Phase 1
                </Typography>
              </Box>
              <Box
                sx={{
                  flex: 1,
                  height: "1px",
                  backgroundColor:
                    currentPhase === 1
                      ? "rgba(245,197,43,0.25)"
                      : isDark
                        ? "#2a2a2a"
                        : "#ebebeb",
                }}
              />
            </Box>
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                flexShrink: 0,
                backgroundColor:
                  currentPhase === 2 ? "#3b82f6" : isDark ? "#444" : "#d1d5db",
                boxShadow:
                  currentPhase === 2
                    ? "0 0 0 3px rgba(59,130,246,0.15)"
                    : "none",
                transition: "all 0.25s",
              }}
            />
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                flex: phase2.length,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  height: "1px",
                  backgroundColor:
                    currentPhase === 2
                      ? "rgba(59,130,246,0.25)"
                      : isDark
                        ? "#2a2a2a"
                        : "#ebebeb",
                }}
              />
              <Box
                sx={{
                  px: 0.75,
                  py: 0.1,
                  borderRadius: "4px",
                  backgroundColor:
                    currentPhase === 2
                      ? "rgba(59,130,246,0.08)"
                      : isDark
                        ? "rgba(255,255,255,0.04)"
                        : "rgba(53,53,53,0.04)",
                  border: `1px solid ${currentPhase === 2 ? "rgba(59,130,246,0.2)" : isDark ? "#2e2e2e" : "#e8e8e8"}`,
                  flexShrink: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.56rem",
                    fontWeight: 700,
                    color: currentPhase === 2 ? "#3b82f6" : "text.disabled",
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    whiteSpace: "nowrap",
                  }}
                >
                  Phase 2
                </Typography>
              </Box>
            </Box>
          </Box>

          {/* Stages row */}
          <Box sx={{ display: "flex", alignItems: "flex-start" }}>
            {renderStages(phase1, 0)}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                mx: 0.5,
                mb: 2.8,
                flexShrink: 0,
              }}
            >
              <Box
                sx={{
                  height: "1.5px",
                  width: 16,
                  backgroundColor:
                    currentIdx >= 5 ? "#22c55e" : isDark ? "#333" : "#e5e7eb",
                  borderRadius: 1,
                }}
              />
            </Box>
            {renderStages(phase2, phase1.length)}
          </Box>
        </Box>
      ) : (
        <Box
          sx={{
            px: 1.5,
            py: 1,
            borderRadius: "8px",
            backgroundColor: isDark ? "#1a0a0a" : "#fef2f2",
            borderLeft: "2.5px solid #ef4444",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.75rem",
              color: "#dc2626",
              lineHeight: 1.5,
            }}
          >
            This request was declined.
            {request.declined_reason ? ` "${request.declined_reason}"` : ""}
          </Typography>
        </Box>
      )}

      {!isDeclined && currentIdx >= 0 && (
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.68rem",
            color: "text.secondary",
            mt: 0.75,
            textAlign: "center",
          }}
        >
          {PIPELINE_STAGES[currentIdx]?.sub}
        </Typography>
      )}
    </Box>
  );
}

// ── Grid Tabs ─────────────────────────────────────────────────────────────────
function RequestsGrid({ rows, columns, isDark, border }) {
  return (
    <Box
      sx={{
        width: "100%",
        bgcolor: "background.paper",
        borderRadius: "10px",
        border: `1px solid ${border}`,
        overflow: "hidden",
      }}
    >
      <DataGrid
        rows={rows}
        columns={columns}
        pageSize={8}
        rowsPerPageOptions={[8]}
        disableSelectionOnClick
        rowHeight={52}
        sx={makeDataGridSx(isDark, border)}
      />
    </Box>
  );
}

function useGridColumns(isDark, onView) {
  return [
    {
      field: "eventTitle",
      headerName: "Event Title",
      flex: 1.5,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              fontWeight: 500,
              color: "text.primary",
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
      field: "submissionDate",
      headerName: "Submitted",
      flex: 0.9,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "eventDate",
      headerName: "Event Date",
      flex: 0.9,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (p) => {
        const cfg = STATUS_CONFIG[p.value] || STATUS_CONFIG.Draft;
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.6,
                px: 1.25,
                py: 0.35,
                borderRadius: "6px",
                backgroundColor: cfg.bg,
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
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: cfg.color,
                  letterSpacing: "0.04em",
                }}
              >
                {getFriendlyStatus(p.value)}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "",
      width: 80,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            height: "100%",
            pr: 0.75,
          }}
        >
          <Box
            onClick={() => onView(p.row._raw)}
            sx={{
              px: 1.25,
              py: 0.45,
              borderRadius: "6px",
              cursor: "pointer",
              border: `1px solid ${isDark ? BORDER_DARK : BORDER}`,
              fontFamily: dm,
              fontSize: "0.73rem",
              fontWeight: 500,
              color: "text.secondary",
              transition: "all 0.15s",
              "&:hover": {
                borderColor: GOLD,
                color: CHARCOAL,
                backgroundColor: GOLD_08,
              },
            }}
          >
            View
          </Box>
        </Box>
      ),
    },
  ];
}

const toRow = (req) => ({
  id: req.id,
  eventTitle: req.title,
  submissionDate: req.submitted_at
    ? new Date(req.submitted_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—",
  eventDate: req.event_date
    ? new Date(req.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—",
  status: req.status,
  dateApproved: req.approved_at
    ? new Date(req.approved_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—",
  dateDeclined: req.declined_at
    ? new Date(req.declined_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—",
  _raw: req,
});

function AllRequestsTab({ isDark, border }) {
  const { requests, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });
  const columns = useGridColumns(isDark, setSelected);
  const rows = requests.filter((r) => r.status !== "Draft").map(toRow);
  if (loading) return <Loader />;
  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        isDark={isDark}
        border={border}
      />
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
      />
    </>
  );
}

function PendingTab({ isDark, border }) {
  const { pending, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });
  const columns = useGridColumns(isDark, setSelected);
  const rows = pending.map(toRow);
  if (loading) return <Loader />;
  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        isDark={isDark}
        border={border}
      />
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
      />
    </>
  );
}

function ApprovedTab({ isDark, border }) {
  const { requests, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });
  const baseColumns = useGridColumns(isDark, setSelected);
  const columns = [
    ...baseColumns.filter((c) => c.field !== "status" && c.field !== "actions"),
    {
      field: "dateApproved",
      headerName: "Date Approved",
      flex: 1,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    baseColumns.find((c) => c.field === "actions"),
  ];
  const rows = requests.filter((r) => r.status === "Approved").map(toRow);
  if (loading) return <Loader />;
  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        isDark={isDark}
        border={border}
      />
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
      />
    </>
  );
}

function DeclinedTab({ isDark, border }) {
  const { requests, loading, refetch } = useClientRequests();
  const [selected, setSelected] = useState(null);
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    ...SILENT,
    title: "Coverage Request",
  });
  const baseColumns = useGridColumns(isDark, setSelected);
  const columns = [
    ...baseColumns.filter((c) => c.field !== "status" && c.field !== "actions"),
    {
      field: "dateDeclined",
      headerName: "Date Declined",
      flex: 1,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    baseColumns.find((c) => c.field === "actions"),
  ];
  const rows = requests.filter((r) => r.status === "Declined").map(toRow);
  if (loading) return <Loader />;
  return (
    <>
      <RequestsGrid
        rows={rows}
        columns={columns}
        isDark={isDark}
        border={border}
      />
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
        border={border}
      />
    </>
  );
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────
function RequestDetailDialog({ open, onClose, request, isDark, border }) {
  if (!request) return null;

  const statusCfg = STATUS_CONFIG[request.status] || STATUS_CONFIG.Draft;
  const currentIdx = getStageIndex(request.status);
  const isDeclined = request.status === "Declined";

  const showTeam = [
    "Assigned",
    "For Approval",
    "Approved",
    "On Going",
    "Completed",
  ].includes(request.status);
  const currentPhase = currentIdx >= 5 ? 2 : 1;

  const teamBySection = {};
  if (showTeam) {
    (request.coverage_assignments || []).forEach((a) => {
      if (!a.staffer) return;
      const sec = a.staffer.section || a.section || "Unknown";
      if (!teamBySection[sec]) teamBySection[sec] = [];
      if (!teamBySection[sec].find((s) => s.id === a.staffer.id))
        teamBySection[sec].push(a.staffer);
    });
  }
  const teamSections = Object.keys(teamBySection);

  const coverageComponents = request.services
    ? Object.entries(request.services)
        .filter(([, pax]) => pax > 0)
        .map(([name, pax]) => ({ name, pax }))
    : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: "14px",
          maxHeight: "90vh",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark
            ? "0 24px 64px rgba(0,0,0,0.6)"
            : "0 8px 40px rgba(53,53,53,0.12)",
        },
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
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}
        >
          <Box
            sx={{
              width: 2.5,
              height: 28,
              borderRadius: "2px",
              backgroundColor: statusCfg.dot,
              flexShrink: 0,
            }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.92rem",
                color: "text.primary",
                lineHeight: 1.3,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {request.title}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.7rem",
                color: "text.secondary",
                mt: 0.15,
              }}
            >
              {request.submitted_at
                ? `Submitted ${new Date(request.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : "Date unknown"}
            </Typography>
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            ml: 1.5,
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.6,
              px: 1.25,
              py: 0.4,
              borderRadius: "6px",
              backgroundColor: statusCfg.bg,
            }}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor: statusCfg.dot,
              }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.68rem",
                fontWeight: 600,
                color: statusCfg.color,
                letterSpacing: "0.04em",
              }}
            >
              {getFriendlyStatus(request.status)}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: "text.secondary",
              borderRadius: "8px",
              "&:hover": {
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : HOVER_BG,
              },
            }}
          >
            <CloseIcon sx={{ fontSize: 17 }} />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ px: 3, py: 2.5, overflowY: "auto" }}>
        {/* Progress tracker */}
        {currentIdx >= 0 && !isDeclined && (
          <Box
            sx={{
              mb: 3,
              p: 2,
              borderRadius: "10px",
              backgroundColor: isDark
                ? "rgba(255,255,255,0.02)"
                : "rgba(53,53,53,0.02)",
              border: `1px solid ${border}`,
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.62rem",
                fontWeight: 700,
                color: "text.secondary",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                mb: 1.5,
              }}
            >
              Request Progress
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {PIPELINE_STAGES.map((stage, idx) => {
                const done = idx < currentIdx;
                const current = idx === currentIdx;
                const isP2 = stage.phase === 2;
                const activeColor = isP2 ? "#3b82f6" : GOLD;
                const activeGlow = isP2 ? "rgba(59,130,246,0.15)" : GOLD_08;
                const innerDot = isP2 ? "#ffffff" : CHARCOAL;
                return (
                  <React.Fragment key={stage.key}>
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      <Box sx={{ mb: 0.5 }}>
                        {done ? (
                          <CheckCircleIcon
                            sx={{ fontSize: 15, color: "#22c55e" }}
                          />
                        ) : current ? (
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "50%",
                              backgroundColor: activeColor,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: `0 0 0 3px ${activeGlow}`,
                            }}
                          >
                            <Box
                              sx={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                backgroundColor: innerDot,
                              }}
                            />
                          </Box>
                        ) : (
                          <Box
                            sx={{
                              width: 15,
                              height: 15,
                              borderRadius: "50%",
                              border: `1.5px solid ${isDark ? "#444" : "#d1d5db"}`,
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.62rem",
                          textAlign: "center",
                          fontWeight: current ? 600 : 400,
                          color: done
                            ? "#15803d"
                            : current
                              ? "text.primary"
                              : "text.secondary",
                          lineHeight: 1.3,
                          px: 0.3,
                        }}
                      >
                        {stage.label}
                      </Typography>
                    </Box>
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <Box
                        sx={{
                          height: "1.5px",
                          flex: 1,
                          mx: 0.5,
                          mb: 2.5,
                          borderRadius: 1,
                          backgroundColor:
                            idx < currentIdx
                              ? "#22c55e"
                              : isDark
                                ? "#333"
                                : "#e5e7eb",
                        }}
                      />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Coverage team */}
        {showTeam && teamSections.length > 0 && (
          <Section label="Coverage Team" border={border}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {teamSections.map((sec) => {
                const colors = SECTION_COLORS[sec] || {
                  bg: "#f3f4f6",
                  color: "#6b7280",
                };
                return (
                  <Box key={sec}>
                    <Box
                      sx={{
                        display: "inline-flex",
                        px: 1,
                        py: 0.2,
                        borderRadius: "5px",
                        backgroundColor: colors.bg,
                        mb: 1,
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.64rem",
                          fontWeight: 700,
                          color: colors.color,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                        }}
                      >
                        {sec}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
                      {teamBySection[sec].map((staffer) => (
                        <Box
                          key={staffer.id}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.75,
                            px: 1,
                            py: 0.6,
                            borderRadius: "8px",
                            border: `1px solid ${border}`,
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.02)"
                              : "rgba(53,53,53,0.02)",
                          }}
                        >
                          <Avatar
                            src={getAvatarUrl(staffer.avatar_url)}
                            sx={{
                              width: 22,
                              height: 22,
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              backgroundColor: colors.bg,
                              color: colors.color,
                            }}
                          >
                            {!getAvatarUrl(staffer.avatar_url) &&
                              getInitials(staffer.full_name)}
                          </Avatar>
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.78rem",
                              fontWeight: 500,
                              color: "text.primary",
                            }}
                          >
                            {staffer.full_name}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Section>
        )}

        <Section label="Event Information" border={border}>
          <InfoGrid
            rows={[
              ["Event Title", request.title],
              ["Description", request.description],
              ["Date", request.event_date || "—"],
              [
                "Time",
                request.from_time && request.to_time
                  ? `${request.from_time} – ${request.to_time}`
                  : "—",
              ],
              ["Venue", request.venue || "—"],
            ]}
          />
        </Section>

        <Section label="Coverage Requirements" border={border}>
          {coverageComponents.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
              {coverageComponents.map((c, idx) => (
                <Box
                  key={idx}
                  sx={{
                    px: 1.25,
                    py: 0.4,
                    borderRadius: "6px",
                    border: `1px solid ${border}`,
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.02)"
                      : "rgba(53,53,53,0.02)",
                  }}
                >
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.78rem",
                      color: "text.primary",
                    }}
                  >
                    {c.name}{" "}
                    <Box component="span" sx={{ color: "text.secondary" }}>
                      ×{c.pax}
                    </Box>
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.82rem",
                color: "text.secondary",
              }}
            >
              —
            </Typography>
          )}
        </Section>

        <Section label="Contact Details" border={border}>
          <InfoGrid
            rows={[
              ["Contact Person", request.contact_person || "—"],
              ["Contact Info", request.contact_info || "—"],
            ]}
          />
        </Section>

        <Section label="Attachment" border={border}>
          {request.file_url ? (
            <Box
              onClick={() => openFile(request.file_url)}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 0.75,
                cursor: "pointer",
                px: 1.25,
                py: 0.6,
                borderRadius: "7px",
                border: `1px solid ${border}`,
                transition: "border-color 0.15s",
                "&:hover": { borderColor: GOLD },
              }}
            >
              <InsertDriveFileOutlinedIcon
                sx={{ fontSize: 14, color: "text.secondary" }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  color: "text.primary",
                }}
              >
                {getFileName(request.file_url)}
              </Typography>
            </Box>
          ) : (
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.82rem",
                color: "text.secondary",
              }}
            >
              No file attached
            </Typography>
          )}
        </Section>

        {/* On Going status */}
        {request.status === "On Going" && (
          <Section label="Coverage Status" border={border}>
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: "8px",
                backgroundColor: isDark ? "rgba(59,130,246,0.06)" : "#eff6ff",
                borderLeft: "2.5px solid #3b82f6",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "#1d4ed8",
                  lineHeight: 1.6,
                }}
              >
                Coverage is currently underway. Your assigned team has checked
                in and is on location.
              </Typography>
            </Box>
          </Section>
        )}

        {/* Completed status */}
        {request.status === "Completed" && (
          <Section label="Coverage Status" border={border}>
            <Box
              sx={{
                px: 1.5,
                py: 1.25,
                borderRadius: "8px",
                backgroundColor: isDark ? "rgba(34,197,94,0.06)" : "#f0fdf4",
                borderLeft: "2.5px solid #22c55e",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "#15803d",
                  lineHeight: 1.6,
                }}
              >
                Coverage has been completed. Thank you for your request!
              </Typography>
            </Box>
          </Section>
        )}

        {request.status === "Approved" && request.admin_notes && (
          <Section label="Admin Notes" border={border}>
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: "8px",
                backgroundColor: isDark ? "#0a1a0a" : "#f0fdf4",
                borderLeft: "2.5px solid #22c55e",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "#15803d",
                  lineHeight: 1.6,
                }}
              >
                {request.admin_notes}
              </Typography>
            </Box>
          </Section>
        )}

        {isDeclined && (
          <Section label="Decline Reason" border={border}>
            <Box
              sx={{
                px: 1.5,
                py: 1,
                borderRadius: "8px",
                backgroundColor: isDark ? "#1a0a0a" : "#fef2f2",
                borderLeft: "2.5px solid #ef4444",
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "#dc2626",
                  lineHeight: 1.6,
                }}
              >
                {request.declined_reason || "No reason provided."}
              </Typography>
            </Box>
          </Section>
        )}

        {["Approved", "On Going", "Completed"].includes(request.status) && (
          <Section label="Approval" border={border}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 2,
              }}
            >
              <Box>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.72rem",
                    color: "text.secondary",
                  }}
                >
                  Approved on
                </Typography>
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.85rem",
                    color: "text.primary",
                    fontWeight: 600,
                    mt: 0.2,
                  }}
                >
                  {request.approved_at
                    ? new Date(request.approved_at).toLocaleDateString(
                        "en-US",
                        { month: "long", day: "numeric", year: "numeric" },
                      )
                    : "—"}
                </Typography>
              </Box>
              <Box
                onClick={() => generateConfirmationPDF(request, teamBySection)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 0.7,
                  borderRadius: "8px",
                  cursor: "pointer",
                  border: `1px solid ${border}`,
                  fontFamily: dm,
                  fontSize: "0.78rem",
                  fontWeight: 500,
                  color: "text.secondary",
                  flexShrink: 0,
                  transition: "all 0.15s",
                  "&:hover": {
                    borderColor: GOLD,
                    color: CHARCOAL,
                    backgroundColor: GOLD_08,
                  },
                }}
              >
                <DownloadOutlinedIcon sx={{ fontSize: 14 }} />
                Download Confirmation
              </Box>
            </Box>
          </Section>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function Section({ label, children, border }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.62rem",
          fontWeight: 700,
          color: "text.secondary",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          mb: 1,
          pb: 0.75,
          borderBottom: `1px solid ${border}`,
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function InfoGrid({ rows }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "130px 1fr",
        rowGap: 0.75,
        columnGap: 1.5,
        alignItems: "start",
      }}
    >
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.75rem",
              color: "text.secondary",
            }}
          >
            {label}
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              color: "text.primary",
              lineHeight: 1.55,
            }}
          >
            {value || "—"}
          </Typography>
        </React.Fragment>
      ))}
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

function Loader() {
  return (
    <Box sx={{ py: 10, display: "flex", justifyContent: "center" }}>
      <CircularProgress size={26} sx={{ color: GOLD }} />
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
    "& .MuiDataGrid-menuIcon button": {
      color: "text.disabled",
      padding: "2px",
      borderRadius: "6px",
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
    "& .MuiDataGrid-selectedRowCount": { fontFamily: dm, fontSize: "0.75rem" },
  };
}
