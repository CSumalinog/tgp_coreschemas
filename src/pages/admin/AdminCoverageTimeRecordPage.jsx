// src/pages/admin/AdminCoverageTimeRecordPage.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Avatar,
  Box,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  OutlinedInput,
  Select,
  Tooltip,
  Typography,
  useTheme,
  Menu,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMoreOutlined";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import { supabase } from "../../lib/supabaseClient";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import {
  CONTROL_RADIUS,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
  FILTER_SEARCH_FLEX,
  FILTER_SEARCH_MAX_WIDTH,
  FILTER_SEARCH_MIN_WIDTH,
  FILTER_SEMESTER_MIN_WIDTH,
  TABLE_FIRST_COL_FLEX,
  TABLE_FIRST_COL_MIN_WIDTH,
  TABLE_USER_AVATAR_FONT_SIZE,
  TABLE_USER_AVATAR_SIZE,
} from "../../utils/layoutTokens";

// ── Tokens ──────────────────────────────────────────────────────────────────
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm = "'Inter', sans-serif";
const AVATAR_COLORS = [
  { bg: "#E6F1FB", color: "#0C447C" },
  { bg: "#EAF3DE", color: "#27500A" },
  { bg: "#FAEEDA", color: "#633806" },
  { bg: "#EEEDFE", color: "#3C3489" },
  { bg: "#E1F5EE", color: "#085041" },
  { bg: "#FAECE7", color: "#712B13" },
  { bg: "#FBEAF0", color: "#72243E" },
  { bg: "#dbeafe", color: "#1e40af" },
];

// ── Helpers ──────────────────────────────────────────────────────────────────
const getAvatarColor = (id) => {
  let hash = 0;
  for (let i = 0; i < (id || "").length; i++) {
    hash = (id || "").charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
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

const fmtTime = (ts) => {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatLightboxTimestamp = (ts) => {
  if (!ts) return "";
  const d = new Date(ts);
  const date = d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
  return `${date}  ${time}`;
};

const computeDuration = (timedIn, completedAt) => {
  if (!timedIn || !completedAt) return "—";
  const diffMs = new Date(completedAt) - new Date(timedIn);
  if (diffMs <= 0) return "—";
  const totalMins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  if (hrs === 0) return `${mins}m`;
  if (mins === 0) return `${hrs}h`;
  return `${hrs}h ${mins}m`;
};

const buildEventDateDisplay = (req) => {
  const fmtDs = (d, opts) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
  };
  if (req.is_multiday && req.event_days?.length > 0) {
    const sorted = [...req.event_days].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const first = fmtDs(sorted[0].date, { month: "short", day: "numeric" });
    const last = fmtDs(sorted[sorted.length - 1].date, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return sorted.length === 1
      ? fmtDs(sorted[0].date, {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : `${first} – ${last}`;
  }
  return req.event_date
    ? new Date(req.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
};

const resolveSelfieUrl = (rawSelfieUrl) => {
  if (!rawSelfieUrl) return null;
  const value = String(rawSelfieUrl).trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  const supabaseBaseUrl = (import.meta.env.VITE_SUPABASE_URL || "").replace(
    /\/+$/,
    "",
  );
  if (value.startsWith("/storage/v1/object/public/login-proof/")) {
    return supabaseBaseUrl ? `${supabaseBaseUrl}${value}` : value;
  }
  const normalizedPath = value
    .replace(/^\/?storage\/v1\/object\/public\/login-proof\//i, "")
    .replace(/^login-proof\//i, "")
    .replace(/^\/+/, "");
  return supabase.storage.from("login-proof").getPublicUrl(normalizedPath)?.data
    ?.publicUrl;
};

const getAssignmentPriority = (assignment) => {
  const completedScore = assignment?.completed_at ? 30 : 0;
  const timedInScore = assignment?.timed_in_at ? 20 : 0;
  const proofScore = assignment?.selfie_url ? 10 : 0;
  const latestTs = Math.max(
    assignment?.completed_at ? new Date(assignment.completed_at).getTime() : 0,
    assignment?.timed_in_at ? new Date(assignment.timed_in_at).getTime() : 0,
  );
  return completedScore + timedInScore + proofScore + latestTs;
};

const escapeCsvValue = (value) => {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return /[",\n]/.test(str) ? `"${str}"` : str;
};

const downloadCsvFile = (filename, headers, rows) => {
  const csvLines = [
    headers.map(escapeCsvValue).join(","),
    ...rows.map((row) => row.map(escapeCsvValue).join(",")),
  ];
  const blob = new Blob([`\uFEFF${csvLines.join("\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

const sanitizeFileNamePart = (value) => {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || "export";
};

// ── Component ────────────────────────────────────────────────────────────────
export default function AdminCoverageTimeRecordPage() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [brokenSelfieById, setBrokenSelfieById] = useState({});
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);
  const [lightboxSelfie, setLightboxSelfie] = useState(null);
  const [hoveredProof, setHoveredProof] = useState(null);
  const hoverPreviewTimerRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const gridApiRef = useGridApiRef();
  const highlightReqId = location.state?.highlightRequestId ?? null;

  const handleProofMouseEnter = (proof) => {
    if (hoverPreviewTimerRef.current)
      window.clearTimeout(hoverPreviewTimerRef.current);
    hoverPreviewTimerRef.current = window.setTimeout(
      () => setHoveredProof(proof),
      150,
    );
  };

  const handleProofMouseLeave = (proofId) => {
    if (hoverPreviewTimerRef.current) {
      window.clearTimeout(hoverPreviewTimerRef.current);
      hoverPreviewTimerRef.current = null;
    }
    setHoveredProof((prev) => (prev?.id === proofId ? null : prev));
  };

  // ── Load semesters ────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadSemesters() {
      const { data } = await supabase
        .from("semesters")
        .select("id, name, start_date, end_date")
        .order("start_date", { ascending: false });
      setSemesters(data || []);
    }
    loadSemesters();
  }, []);

  // ── Load requests (all, no section filter) ───────────────────────────────
  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coverage_requests")
        .select(
          `
          id, title, event_date, is_multiday, event_days, venue, status,
          entity:client_entities ( id, name ),
          coverage_assignments (
            id, status, assigned_to, section, timed_in_at, completed_at, selfie_url,
            staffer:profiles!assigned_to ( id, full_name, section, role, avatar_url )
          )
        `,
        )
        .in("status", [
          "Assigned",
          "Approved",
          "On Going",
          "Coverage Complete",
          "Completed",
        ])
        .is("archived_at", null)
        .is("trashed_at", null)
        .order("event_date", { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error("AdminCTR load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // ── Build attendance map ──────────────────────────────────────────────────
  const attendanceByRequest = useMemo(() => {
    const grouped = {};
    requests.forEach((req) => {
      const assignments = (req.coverage_assignments || []).filter(
        (a) => a.status !== "Cancelled" && a.status !== "No Show",
      );

      const byStaff = new Map();
      assignments.forEach((item) => {
        const fallbackStaffName = item.staffer?.full_name || "Unknown";
        const staffKey =
          item.assigned_to ||
          item.staffer?.id ||
          `name:${fallbackStaffName.toLowerCase()}`;
        if (!byStaff.has(staffKey)) {
          byStaff.set(staffKey, item);
          return;
        }
        const existing = byStaff.get(staffKey);
        if (getAssignmentPriority(item) > getAssignmentPriority(existing)) {
          byStaff.set(staffKey, item);
        }
      });

      const deduped = Array.from(byStaff.values()).sort((a, b) => {
        const left = a.timed_in_at ? new Date(a.timed_in_at).getTime() : 0;
        const right = b.timed_in_at ? new Date(b.timed_in_at).getTime() : 0;
        return right - left;
      });

      grouped[req.id] = deduped;
    });
    return grouped;
  }, [requests]);

  // ── Filter by semester + search ───────────────────────────────────────────
  const filteredRequests = useMemo(() => {
    let list = requests;

    if (selectedSem !== "all") {
      const sem = semesters.find((s) => s.id === selectedSem);
      if (sem) {
        const start = new Date(sem.start_date);
        const end = new Date(sem.end_date);
        end.setHours(23, 59, 59, 999);
        list = list.filter((r) => {
          if (!r.event_date) return false;
          const d = new Date(r.event_date);
          return d >= start && d <= end;
        });
      }
    }

    if (searchText.trim()) {
      const tokens = searchText
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      list = list.filter((r) => {
        const hay = [r.title || "", r.entity?.name || "", r.venue || ""]
          .join(" ")
          .toLowerCase();
        return tokens.every((t) => hay.includes(t));
      });
    }

    return list;
  }, [requests, selectedSem, semesters, searchText]);

  // ── DataGrid rows (flat, one per assignment) ─────────────────────────────
  const dataRows = useMemo(() => {
    const rows = [];
    filteredRequests.forEach((req) => {
      const attendance = attendanceByRequest[req.id] || [];
      attendance.forEach((a) => {
        const status = a.completed_at
          ? "Completed"
          : a.timed_in_at
            ? "Ongoing"
            : "Pending";
        rows.push({
          id: a.id,
          reqId: req.id,
          title: req.title || "Coverage Request",
          client: req.entity?.name || "—",
          staffName: a.staffer?.full_name || "Unknown",
          staffAvatarUrl: getAvatarUrl(a.staffer?.avatar_url),
          avatarBg: getAvatarColor(a.assigned_to || "").bg,
          avatarFg: getAvatarColor(a.assigned_to || "").color,
          section: a.section || a.staffer?.section || "—",
          timeIn: fmtTime(a.timed_in_at),
          timeOut: fmtTime(a.completed_at),
          duration: computeDuration(a.timed_in_at, a.completed_at),
          status,
          hasProof: !!a.selfie_url,
          proofUrl: resolveSelfieUrl(a.selfie_url),
          isBroken: !!brokenSelfieById[a.id],
          selfieId: a.id,
          timedInAt: a.timed_in_at,
        });
      });
    });
    return rows;
  }, [filteredRequests, attendanceByRequest, brokenSelfieById]);

  // ── Scroll to highlighted row ─────────────────────────────────────────────
  useEffect(() => {
    if (!highlightReqId || loading || dataRows.length === 0) return;
    const targetRow = dataRows.find((r) => r.reqId === highlightReqId);
    if (!targetRow) return;
    const rowIndex = dataRows.indexOf(targetRow);
    gridApiRef.current?.scrollToIndexes({ rowIndex });
  }, [highlightReqId, dataRows, loading, gridApiRef]);

  // ── DataGrid columns ──────────────────────────────────────────────────────
  const columns = useMemo(
    () => [
      {
        field: "title",
        headerName: "Title",
        flex: TABLE_FIRST_COL_FLEX,
        minWidth: TABLE_FIRST_COL_MIN_WIDTH,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              width: "100%",
              minWidth: 0,
              pr: 0.5,
              height: "100%",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "text.primary",
                flex: 1,
                minWidth: 0,
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
        field: "_nav",
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
            <Tooltip title="View request" placement="top">
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/admin/coverage-request-details/${p.row.reqId}`, {
                    state: { backTo: "/admin/coverage-tracker/time-record" },
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
                <ArrowForwardIcon sx={{ fontSize: 13 }} />
              </Box>
            </Tooltip>
          </Box>
        ),
      },
      {
        field: "client",
        headerName: "Client",
        flex: 1,
        minWidth: 120,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                color: "text.secondary",
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
        field: "staffName",
        headerName: "Staff Assigned",
        flex: 1.4,
        minWidth: 180,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              minWidth: 0,
              height: "100%",
            }}
          >
            <Avatar
              src={p.row.staffAvatarUrl || undefined}
              sx={{
                width: TABLE_USER_AVATAR_SIZE,
                height: TABLE_USER_AVATAR_SIZE,
                fontSize: TABLE_USER_AVATAR_FONT_SIZE,
                fontWeight: 600,
                backgroundColor: p.row.avatarBg,
                color: p.row.avatarFg,
                flexShrink: 0,
              }}
            >
              {!p.row.staffAvatarUrl && getInitials(p.value)}
            </Avatar>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
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
        field: "section",
        headerName: "Section",
        flex: 0.8,
        minWidth: 100,
        renderCell: (p) => (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                color: "text.secondary",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "timeIn",
        headerName: "Time In",
        flex: 0.9,
        minWidth: 90,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              width: "100%",
            }}
          >
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
        field: "timeOut",
        headerName: "Time Out",
        flex: 0.9,
        minWidth: 90,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              width: "100%",
            }}
          >
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
        field: "duration",
        headerName: "Duration",
        flex: 0.7,
        minWidth: 80,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              width: "100%",
            }}
          >
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                color:
                  p.value === "—"
                    ? "text.disabled"
                    : isDark
                      ? "#f5c52b"
                      : "#d97706",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "status",
        headerName: "Status",
        flex: 0.9,
        minWidth: 100,
        renderCell: (p) => (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              height: "100%",
              width: "100%",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 0.75,
                py: 0.22,
                borderRadius: "999px",
                fontFamily: dm,
                fontSize: "0.72rem",
                fontWeight: 700,
                lineHeight: 1,
                backgroundColor:
                  p.value === "Completed"
                    ? "#ecf8e6"
                    : p.value === "Ongoing"
                      ? "#e6f1fb"
                      : isDark
                        ? "rgba(255,255,255,0.08)"
                        : "rgba(53,53,53,0.08)",
                color:
                  p.value === "Completed"
                    ? "#27500a"
                    : p.value === "Ongoing"
                      ? "#0c447c"
                      : "text.secondary",
              }}
            >
              {p.value}
            </Box>
          </Box>
        ),
      },
      {
        field: "proof",
        headerName: "Proof of Attendance",
        flex: 1,
        minWidth: 120,
        sortable: false,
        renderCell: (p) => {
          if (!p.row.hasProof)
            return (
              <Box
                sx={{ display: "flex", alignItems: "center", height: "100%" }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.72rem",
                    color: "text.disabled",
                  }}
                >
                  —
                </Typography>
              </Box>
            );
          return (
            <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
              <Box
                sx={{
                  width: 80,
                  height: 44,
                  borderRadius: "6px",
                  border: `1px solid ${border}`,
                  overflow: "hidden",
                  backgroundColor: isDark
                    ? "rgba(17,17,17,0.45)"
                    : "rgba(53,53,53,0.03)",
                  cursor:
                    p.row.proofUrl && !p.row.isBroken ? "zoom-in" : "default",
                  flexShrink: 0,
                }}
                onClick={(e) => {
                  if (!p.row.proofUrl || p.row.isBroken) return;
                  e.stopPropagation();
                  setLightboxSelfie({
                    url: p.row.proofUrl,
                    timedInAt: p.row.timedInAt,
                  });
                }}
              >
                {p.row.proofUrl && !p.row.isBroken ? (
                  <Box
                    component="img"
                    src={p.row.proofUrl}
                    alt="Attendance proof"
                    sx={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                    onError={() =>
                      setBrokenSelfieById((prev) => ({
                        ...prev,
                        [p.row.selfieId]: true,
                      }))
                    }
                    onMouseEnter={() =>
                      handleProofMouseEnter({
                        id: p.row.selfieId,
                        url: p.row.proofUrl,
                      })
                    }
                    onMouseLeave={() => handleProofMouseLeave(p.row.selfieId)}
                  />
                ) : (
                  <Box
                    sx={{
                      width: "100%",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <BrokenImageOutlinedIcon
                      sx={{ color: "text.disabled", fontSize: 16 }}
                    />
                    <Typography
                      sx={{
                        fontFamily: dm,
                        fontSize: "0.6rem",
                        color: "text.disabled",
                        lineHeight: 1,
                        mt: 0.25,
                      }}
                    >
                      Unavailable
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          );
        },
      },
    ],
    [navigate, isDark, border],
  );

  // ── Export ────────────────────────────────────────────────────────────────
  const buildExportRows = () => {
    const rows = [];
    filteredRequests.forEach((req) => {
      const attendance = attendanceByRequest[req.id] || [];
      if (attendance.length === 0) {
        rows.push([
          req.id,
          req.title || "Coverage Request",
          req.entity?.name || "",
          buildEventDateDisplay(req),
          req.venue || "",
          "",
          "",
          "No attendance",
          "",
          "",
          "",
          "",
        ]);
        return;
      }
      attendance.forEach((a) => {
        const status = a.completed_at
          ? "Completed"
          : a.timed_in_at
            ? "Ongoing"
            : "Pending";
        rows.push([
          req.id,
          req.title || "Coverage Request",
          req.entity?.name || "",
          buildEventDateDisplay(req),
          req.venue || "",
          a.staffer?.full_name || "Unknown",
          a.section || a.staffer?.section || "",
          status,
          fmtTime(a.timed_in_at),
          fmtTime(a.completed_at),
          computeDuration(a.timed_in_at, a.completed_at),
          resolveSelfieUrl(a.selfie_url) || "",
        ]);
      });
    });
    return rows;
  };

  const runExport = (format) => {
    const headers = [
      "Request ID",
      "Request Title",
      "Client",
      "Event Date",
      "Venue",
      "Staff Name",
      "Section",
      "Status",
      "Time In",
      "Time Out",
      "Duration",
      "Proof URL",
    ];
    if (format === "csv") {
      downloadCsvFile(
        `coverage-time-record-${sanitizeFileNamePart("all")}.csv`,
        headers,
        buildExportRows(),
      );
    }
    setExportMenuAnchorEl(null);
  };

  const selectSx = {
    fontFamily: dm,
    fontSize: "0.78rem",
    borderRadius: CONTROL_RADIUS,
    height: FILTER_INPUT_HEIGHT,
    backgroundColor: isDark ? "transparent" : "#f7f7f8",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.12)" },
    "& .MuiSelect-icon": { fontSize: 18, color: "text.disabled" },
  };

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
      {/* ── Filter row ── */}
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
            placeholder="Search request, client, venue"
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

        <FormControl size="small" sx={{ minWidth: FILTER_SEMESTER_MIN_WIDTH }}>
          <Select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            sx={selectSx}
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
            onClick={(e) => setExportMenuAnchorEl(e.currentTarget)}
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

        <Menu
          anchorEl={exportMenuAnchorEl}
          open={Boolean(exportMenuAnchorEl)}
          onClose={() => setExportMenuAnchorEl(null)}
          slotProps={{ paper: { sx: { borderRadius: "8px" } } }}
        >
          <MenuItem
            onClick={() => runExport("csv")}
            sx={{ fontFamily: dm, fontSize: "0.78rem" }}
          >
            Export as CSV
          </MenuItem>
        </Menu>
      </Box>

      {/* ── DataGrid ── */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          border: `1px solid ${border}`,
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <DataGrid
          apiRef={gridApiRef}
          rows={dataRows}
          columns={columns}
          loading={loading}
          enableSearch={false}
          showToolbar={false}
          rowHeight={56}
          sx={{ height: "100%" }}
        />
      </Box>

      {/* ── Photo lightbox (click) ── */}
      {lightboxSelfie && (
        <Box
          onClick={() => setLightboxSelfie(null)}
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0,0,0,0.92)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box
            onClick={(e) => e.stopPropagation()}
            sx={{
              position: "relative",
              maxWidth: "min(800px, 92vw)",
              maxHeight: "90vh",
              lineHeight: 0,
            }}
          >
            <Box
              component="img"
              src={lightboxSelfie.url}
              alt="Attendance proof"
              sx={{
                display: "block",
                maxWidth: "100%",
                maxHeight: "90vh",
                objectFit: "contain",
                borderRadius: "4px",
              }}
            />
            {lightboxSelfie.timedInAt && (
              <Box
                sx={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  px: 2,
                  py: 1,
                  backgroundColor: "rgba(0,0,0,0.62)",
                  borderBottomLeftRadius: "4px",
                  borderBottomRightRadius: "4px",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.82rem",
                    fontWeight: 600,
                    color: "#F5C52B",
                    letterSpacing: "0.01em",
                  }}
                >
                  {formatLightboxTimestamp(lightboxSelfie.timedInAt)}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      )}

      {/* ── Photo hover preview ── */}
      {hoveredProof?.url && (
        <Box
          sx={{
            position: "fixed",
            inset: 0,
            zIndex: (t) => t.zIndex.modal + 2,
            display: { xs: "none", md: "flex" },
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.5)",
            pointerEvents: "none",
          }}
        >
          <Box
            sx={{
              width: "min(68vw, 700px)",
              maxHeight: "78vh",
              borderRadius: "12px",
              overflow: "hidden",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.45)"}`,
              boxShadow: "0 24px 60px rgba(0,0,0,0.42)",
              backgroundColor: "rgba(0,0,0,0.28)",
              backdropFilter: "blur(6px)",
            }}
          >
            <Box
              component="img"
              src={hoveredProof.url}
              alt="Proof of attendance"
              sx={{
                width: "100%",
                maxHeight: "78vh",
                objectFit: "contain",
                display: "block",
                backgroundColor: isDark ? "#0f0f0f" : "#111",
              }}
            />
          </Box>
        </Box>
      )}
    </Box>
  );
}
