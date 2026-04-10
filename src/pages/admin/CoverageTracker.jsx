import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  CircularProgress,
  Avatar,
  FormControl,
  Select,
  MenuItem,
  OutlinedInput,
  InputAdornment,
  IconButton,
  Tooltip,
  Drawer,
  Switch,
  FormControlLabel,
  Menu,
  useTheme,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import SearchIcon from "@mui/icons-material/Search";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import FileDownloadOutlinedIcon from "@mui/icons-material/FileDownloadOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import BrokenImageOutlinedIcon from "@mui/icons-material/BrokenImageOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import NumberBadge from "../../components/common/NumberBadge";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import ViewActionButton from "../../components/common/ViewActionButton";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import { useAdminRequests } from "../../hooks/useAdminRequest";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import {
  CONTROL_RADIUS,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
  FILTER_SEARCH_MIN_WIDTH,
  TABLE_USER_AVATAR_FONT_SIZE,
  TABLE_USER_AVATAR_SIZE,
} from "../../utils/layoutTokens";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import { supabase } from "../../lib/supabaseClient";

const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

const STAGE_OPTIONS = [
  { key: "all", label: "All" },
  { key: "On Going", label: "On Going" },
  { key: "Completed", label: "Completed" },
];

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

const fmtDateStr = (
  d,
  opts = { month: "short", day: "numeric", year: "numeric" },
) => {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
};

const buildEventDateDisplay = (req) => {
  if (req.is_multiday && req.event_days?.length > 0) {
    const sorted = [...req.event_days].sort((a, b) => a.date.localeCompare(b.date));
    const first = fmtDateStr(sorted[0].date, {
      month: "short",
      day: "numeric",
    });
    const last = fmtDateStr(sorted[sorted.length - 1].date, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return sorted.length === 1 ? fmtDateStr(sorted[0].date) : `${first} – ${last}`;
  }
  return req.event_date
    ? new Date(req.event_date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "—";
};

const hasAnyTimeIn = (request) =>
  (request?.coverage_assignments || []).some((a) => !!a?.timed_in_at);

const hasAnyCompleted = (request) =>
  (request?.coverage_assignments || []).some((a) => !!a?.completed_at);

const hasAnyAssignments = (request) =>
  (request?.coverage_assignments || []).length > 0;

const isCtrEligibleStatus = (status) => {
  const normalized = String(status || "")
    .trim()
    .toLowerCase();
  return (
    normalized === "assigned" ||
    normalized === "approved" ||
    normalized === "on going" ||
    normalized === "completed"
  );
};

const dedupeById = (list) => {
  const seen = new Set();
  return list.filter((item) => {
    if (!item?.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
};

const getAvatarColor = (id) => {
  if (!id) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
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

function MetaCell({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.78rem",
          fontWeight: 400,
          color: "text.secondary",
        }}
      >
        {children}
      </Typography>
    </Box>
  );
}

const fmtTime = (ts) => {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
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

  return supabase.storage
    .from("login-proof")
    .getPublicUrl(normalizedPath)?.data?.publicUrl;
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

const sanitizeFileNamePart = (value) => {
  const cleaned = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return cleaned || "export";
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

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const openPrintTable = (title, columns, rows) => {
  const popup = window.open("", "_blank", "noopener,noreferrer,width=1200,height=800");
  if (!popup) return;

  const headerHtml = columns.map((col) => `<th>${escapeHtml(col)}</th>`).join("");
  const rowHtml = rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell) => `<td>${escapeHtml(cell)}</td>`)
          .join("")}</tr>`,
    )
    .join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #111; }
          h1 { margin: 0 0 6px; font-size: 18px; }
          p { margin: 0 0 14px; font-size: 12px; color: #444; }
          table { width: 100%; border-collapse: collapse; table-layout: fixed; }
          th, td { border: 1px solid #ddd; padding: 6px 8px; font-size: 11px; vertical-align: top; word-wrap: break-word; }
          th { background: #f5f5f5; text-align: left; font-weight: 700; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(title)}</h1>
        <p>Generated ${escapeHtml(new Date().toLocaleString())}</p>
        <table>
          <thead><tr>${headerHtml}</tr></thead>
          <tbody>${rowHtml}</tbody>
        </table>
      </body>
    </html>
  `;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();

  // Trigger print only after the popup has finished laying out the injected table.
  popup.onload = () => {
    popup.focus();
    popup.print();
  };
};

function EventTypePill({ isMultiDay, isDark }) {
  return isMultiDay ? (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isDark ? "rgba(74,222,128,0.1)" : "#f0fdf4",
        border: `1px solid ${isDark ? "rgba(74,222,128,0.25)" : "#86efac"}`,
      }}
    >
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: isDark ? "#4ade80" : "#22c55e",
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.66rem",
          fontWeight: 700,
          color: isDark ? "#4ade80" : "#15803d",
          letterSpacing: "0.04em",
        }}
      >
        Multi-day
      </Typography>
    </Box>
  ) : (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.3,
        borderRadius: "10px",
        backgroundColor: isDark
          ? "rgba(148,163,184,0.1)"
          : "rgba(53,53,53,0.05)",
        border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.1)"}`,
      }}
    >
      <Box
        sx={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          backgroundColor: isDark
            ? "rgba(255,255,255,0.3)"
            : "rgba(53,53,53,0.3)",
          flexShrink: 0,
        }}
      />
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.66rem",
          fontWeight: 700,
          color: isDark ? "rgba(255,255,255,0.45)" : "rgba(53,53,53,0.5)",
          letterSpacing: "0.04em",
        }}
      >
        Single
      </Typography>
    </Box>
  );
}

export default function CoverageTracker() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;
  const navigate = useNavigate();
  const location = useLocation();
  const gridApiRef = useGridApiRef();

  const { requests, onGoing, completed, loading, refetch } = useAdminRequests();

  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });
  useRealtimeNotify("coverage_assignments", refetch, null, {
    title: "Coverage Assignment",
  });

  const [stageFilter, setStageFilter] = useState(() => {
    const incoming = location.state?.tab;
    if (incoming === "Completed" || incoming === "CTR") return "Completed";
    if (incoming === "On Going") return "On Going";
    return "all";
  });
  const [activeTab, setActiveTab] = useState(() => {
    const incoming = location.state?.tab;
    return incoming === "Completed" || incoming === "CTR" ? "ctr" : "tracker";
  });
  const [focusedRequestId, setFocusedRequestId] = useState(
    () => location.state?.focusRequestId || null,
  );
  const [searchText, setSearchText] = useState("");
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");
  const [selectedEntity, setSelectedEntity] = useState("all");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [missingProofOnly, setMissingProofOnly] = useState(false);
  const [brokenSelfieById, setBrokenSelfieById] = useState({});
  const [hoveredProof, setHoveredProof] = useState(null);
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);
  const [exportMenuScope, setExportMenuScope] = useState("global");
  const [exportRequestContext, setExportRequestContext] = useState(null);
  const hoverPreviewTimerRef = useRef(null);

  const handleProofMouseEnter = (proof) => {
    if (hoverPreviewTimerRef.current) {
      window.clearTimeout(hoverPreviewTimerRef.current);
    }
    hoverPreviewTimerRef.current = window.setTimeout(() => {
      setHoveredProof(proof);
    }, 150);
  };

  const handleProofMouseLeave = (proofId) => {
    if (hoverPreviewTimerRef.current) {
      window.clearTimeout(hoverPreviewTimerRef.current);
      hoverPreviewTimerRef.current = null;
    }
    setHoveredProof((prev) => (prev?.id === proofId ? null : prev));
  };

  useEffect(() => {
    const incoming = location.state?.tab;
    const focusedId = location.state?.focusRequestId;

    const frameId = window.requestAnimationFrame(() => {
      if (incoming === "Completed") {
        setStageFilter((prev) => (prev === "Completed" ? prev : "Completed"));
        setActiveTab((prev) => (prev === "ctr" ? prev : "ctr"));
      } else if (incoming === "On Going") {
        setStageFilter((prev) => (prev === "On Going" ? prev : "On Going"));
        setActiveTab((prev) => (prev === "tracker" ? prev : "tracker"));
      } else if (incoming === "CTR") {
        setActiveTab((prev) => (prev === "ctr" ? prev : "ctr"));
      }

      if (focusedId) {
        setFocusedRequestId((prev) => (prev === focusedId ? prev : focusedId));
        setActiveTab((prev) => (prev === "ctr" ? prev : "ctr"));
      }
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [location.state?.tab, location.state?.focusRequestId]);

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

  const trackerBaseSource = useMemo(() => {
    if (stageFilter === "On Going") {
      return dedupeById([...(onGoing || []), ...requests.filter((r) => hasAnyTimeIn(r))]).filter(
        (r) => hasAnyAssignments(r) && hasAnyTimeIn(r),
      );
    }
    if (stageFilter === "Completed") {
      return dedupeById([
        ...(completed || []),
        ...requests.filter((r) => hasAnyCompleted(r)),
      ]).filter((r) => hasAnyAssignments(r) && hasAnyCompleted(r));
    }
    // "all" — combine on-going and completed
    return dedupeById([
      ...(onGoing || []),
      ...(completed || []),
      ...requests.filter((r) => hasAnyAssignments(r) && isCtrEligibleStatus(r.status)),
    ]).filter((r) => hasAnyAssignments(r) && isCtrEligibleStatus(r.status));
  }, [stageFilter, onGoing, completed, requests]);

  const ctrBaseSource = useMemo(
    () =>
      dedupeById([
        ...(onGoing || []),
        ...(completed || []),
        ...requests.filter((r) => hasAnyAssignments(r) && isCtrEligibleStatus(r.status)),
      ]).filter((r) => hasAnyAssignments(r) && isCtrEligibleStatus(r.status)),
    [onGoing, completed, requests],
  );

  const sourceForFilters = activeTab === "ctr" ? ctrBaseSource : trackerBaseSource;

  const entityOptions = useMemo(() => {
    const seen = new Set();
    const opts = [];
    sourceForFilters.forEach((r) => {
      const name = r.entity?.name;
      if (name && !seen.has(name)) {
        seen.add(name);
        opts.push(name);
      }
    });
    return opts.sort();
  }, [sourceForFilters]);

  const filteredSource = useMemo(() => {
    let filtered = sourceForFilters;

    if (selectedSem !== "all") {
      const sem = semesters.find((s) => s.id === selectedSem);
      if (sem) {
        const start = new Date(sem.start_date);
        const end = new Date(sem.end_date);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter((r) => {
          if (!r.event_date) return false;
          const d = new Date(r.event_date);
          return d >= start && d <= end;
        });
      }
    }

    if (selectedEntity !== "all") {
      filtered = filtered.filter((r) => r.entity?.name === selectedEntity);
    }

    if (missingProofOnly) {
      filtered = filtered.filter((r) => {
        const assignments = r.coverage_assignments || [];
        if (!assignments.length) return false;
        const proofCount = assignments.filter((a) => !!a.selfie_url).length;
        return proofCount < assignments.length;
      });
    }

    if (activeTab === "ctr") {
      const tokens = searchText
        .split(/\s+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      if (tokens.length) {
        filtered = filtered.filter((r) => {
          const assignmentText = (r.coverage_assignments || [])
            .map((a) => `${a.staffer?.full_name || ""} ${a.section || a.sections?.name || ""}`)
            .join(" ")
            .toLowerCase();

          const haystack = [
            r.title,
            r.request_title,
            r.entity?.name,
            r.venue,
            buildEventDateDisplay(r),
            assignmentText,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return tokens.every((token) => haystack.includes(token));
        });
      }
    }

    return filtered;
  }, [sourceForFilters, selectedSem, selectedEntity, semesters, missingProofOnly, activeTab, searchText]);

  const rows = useMemo(() => {
    return filteredSource.map((req) => {
      const assignments = req.coverage_assignments || [];
      const timedInCount = assignments.filter((a) => !!a.timed_in_at).length;
      const completedCount = assignments.filter((a) => !!a.completed_at).length;
      const proofCount = assignments.filter((a) => !!a.selfie_url).length;

      return {
        id: req.id,
        requestTitle: req.title || "—",
        eventType: !!(req.is_multiday && req.event_days?.length > 0),
        client: req.entity?.name || "—",
        eventDate: buildEventDateDisplay(req),
        status: stageFilter,
        timedInCount,
        completedCount,
        proofCount,
        totalAssignments: assignments.length,
        _raw: req,
      };
    });
  }, [filteredSource, stageFilter]);

  const ctrRequestSource = useMemo(() => {
    if (!focusedRequestId) return filteredSource;
    return filteredSource.filter((r) => r.id === focusedRequestId);
  }, [filteredSource, focusedRequestId]);

  const attendanceByRequest = useMemo(() => {
    if (activeTab !== "ctr") return {};

    const grouped = {};
    ctrRequestSource.forEach((req) => {
      const normalized = (req.coverage_assignments || []).map((item) => {
        const sectionName = item.sections?.name || item.section || null;
        return {
          ...item,
          request_id: item.request_id || req.id,
          section_id: item.section_id || null,
          staff_id: item.staff_id || item.assigned_to || null,
          sections: item.sections || (sectionName ? { name: sectionName } : null),
          staff: item.staff || item.staffer || null,
        };
      });

      const byStaff = new Map();
      normalized.forEach((item) => {
        const sectionName = item.sections?.name || item.section || "Unassigned Section";
        const fallbackStaffName = item.staff?.full_name || "Unknown";
        const staffKey =
          item.staff_id ||
          item.staff?.id ||
          item.assigned_to ||
          `name:${fallbackStaffName.toLowerCase()}`;

        if (!byStaff.has(staffKey)) {
          byStaff.set(staffKey, {
            ...item,
            _sectionNames: [sectionName],
          });
          return;
        }

        const existing = byStaff.get(staffKey);
        const mergedSections = Array.from(new Set([...(existing._sectionNames || []), sectionName]));
        const preferred =
          getAssignmentPriority(item) > getAssignmentPriority(existing) ? item : existing;

        byStaff.set(staffKey, {
          ...preferred,
          _sectionNames: mergedSections,
          sections: { name: mergedSections.join(", ") },
        });
      });

      const deduped = Array.from(byStaff.values());

      deduped.sort((a, b) => {
        const left = a.timed_in_at ? new Date(a.timed_in_at).getTime() : 0;
        const right = b.timed_in_at ? new Date(b.timed_in_at).getTime() : 0;
        return right - left;
      });

      grouped[req.id] = deduped;
    });

    return grouped;
  }, [activeTab, ctrRequestSource]);

  const attendanceLoading = false;

  const buildCtrExportRows = (requestList) => {
    const rowsForExport = [];
    requestList.forEach((req) => {
      const attendance = attendanceByRequest[req.id] || [];

      if (attendance.length === 0) {
        rowsForExport.push([
          req.id,
          req.title || req.request_title || "Coverage Request",
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
        const status = a.completed_at ? "Completed" : a.timed_in_at ? "Ongoing" : "Pending";
        rowsForExport.push([
          req.id,
          req.title || req.request_title || "Coverage Request",
          req.entity?.name || "",
          buildEventDateDisplay(req),
          req.venue || "",
          a.staff?.full_name || "Unknown",
          a.sections?.name || a.section || "Unassigned Section",
          status,
          fmtTime(a.timed_in_at),
          fmtTime(a.completed_at),
          computeDuration(a.timed_in_at, a.completed_at),
          resolveSelfieUrl(a.selfie_url) || "",
        ]);
      });
    });
    return rowsForExport;
  };

  const exportCtrRequests = (requestList, fileBase) => {
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

    const rowsForCsv = buildCtrExportRows(requestList);

    const safeBase = sanitizeFileNamePart(fileBase);
    downloadCsvFile(`${safeBase}.csv`, headers, rowsForCsv);
  };

  const exportCtrRequestsPdf = (requestList, fileBase) => {
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
    const rowsForPdf = buildCtrExportRows(requestList);
    openPrintTable(fileBase, headers, rowsForPdf);
  };

  const exportTrackerPdf = () => {
    const headers = [
      "Request Title",
      "Type",
      "Client",
      "Event Date",
      "Status",
      "Timed In",
      "Completed",
      "Proof",
      "Total Assignments",
    ];

    const pdfRows = rows.map((row) => [
      row.requestTitle,
      row.eventType ? "Multi-day" : "Single",
      row.client,
      row.eventDate,
      stageFilter,
      row.timedInCount,
      row.completedCount,
      row.proofCount,
      row.totalAssignments,
    ]);

    openPrintTable("Coverage Tracker", headers, pdfRows);
  };

  const openGlobalExportMenu = (event) => {
    setExportMenuScope("global");
    setExportRequestContext(null);
    setExportMenuAnchorEl(event.currentTarget);
  };

  const openRequestExportMenu = (event, req) => {
    setExportMenuScope("request");
    setExportRequestContext(req);
    setExportMenuAnchorEl(event.currentTarget);
  };

  const closeExportMenu = () => {
    setExportMenuAnchorEl(null);
  };

  const runExportByFormat = (format) => {
    if (activeTab === "tracker") {
      if (format === "csv") {
        gridApiRef.current?.exportDataAsCsv({
          utf8WithBom: true,
          fileName: `coverage-tracker-${stageFilter.toLowerCase().replace(/\s+/g, "-")}`,
        });
      } else {
        exportTrackerPdf();
      }
      closeExportMenu();
      return;
    }

    const requestList =
      exportMenuScope === "request" && exportRequestContext
        ? [exportRequestContext]
        : ctrRequestSource;
    const exportBase =
      exportMenuScope === "request" && exportRequestContext
        ? `coverage-time-record-${sanitizeFileNamePart(exportRequestContext.title || exportRequestContext.id)}`
        : focusedRequestId
          ? "coverage-time-record-focused"
          : "coverage-time-record-all";

    if (format === "csv") {
      exportCtrRequests(requestList, exportBase);
    } else {
      exportCtrRequestsPdf(requestList, exportBase);
    }
    closeExportMenu();
  };

  const externalFilterModel = useMemo(() => {
    const tokens = searchText
      .split(/\s+/)
      .map((t) => t.trim())
      .filter(Boolean);
    return { items: [], quickFilterValues: tokens };
  }, [searchText]);

  const selectSx = {
    fontFamily: dm,
    fontSize: "0.78rem",
    borderRadius: CONTROL_RADIUS,
    height: FILTER_INPUT_HEIGHT,
    backgroundColor: isDark ? "transparent" : "#f7f7f8",
    "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(0,0,0,0.12)" },
    "& .MuiSelect-icon": { fontSize: 18, color: "text.disabled" },
  };

  const columns = [
    {
      field: "requestTitle",
      headerName: "Request Title",
      flex: 1.5,
      minWidth: 220,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%", width: "100%" }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: isDark ? "#f5f5f5" : "#1a1a1a",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            {p.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "eventType",
      headerName: "Type",
      flex: 0.68,
      minWidth: 95,
      sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <EventTypePill isMultiDay={p.value} isDark={isDark} />
        </Box>
      ),
    },
    {
      field: "client",
      headerName: "Client",
      flex: 1.35,
      minWidth: 220,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "eventDate",
      headerName: "Event Date",
      flex: 1.1,
      minWidth: 150,
      renderCell: (p) => <MetaCell>{p.value}</MetaCell>,
    },
    {
      field: "actions",
      headerName: "",
      minWidth: 150,
      flex: 0.75,
      sortable: false,
      align: "right",
      headerAlign: "right",
      renderCell: (p) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            width: "100%",
            height: "100%",
          }}
        >
          <ViewActionButton
            onClick={() => {
              navigate(`/admin/coverage-tracker`, {
                state: {
                  tab: "CTR",
                  focusRequestId: p.row.id,
                },
              });
            }}
          >
            View CTR
          </ViewActionButton>
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: isDark ? "background.default" : "#ffffff",
        fontFamily: dm,
      }}
    >
      <Box
        sx={{
          mb: 2.5,
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-start",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Typography
          onClick={() => {
            setActiveTab("tracker");
            setStageFilter("On Going");
            setFocusedRequestId(null);
          }}
          sx={{
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: activeTab === "tracker" ? 600 : 400,
            color: activeTab === "tracker" ? "text.primary" : "text.secondary",
            letterSpacing: "-0.01em",
            cursor: "pointer",
          }}
        >
          Coverage Tracker
        </Typography>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: border, my: 0.1 }}
        />

        <Typography
          onClick={() => {
            setActiveTab("ctr");
            setStageFilter("Completed");
          }}
          sx={{
            fontFamily: dm,
            fontSize: "0.8rem",
            fontWeight: activeTab === "ctr" ? 600 : 400,
            color: activeTab === "ctr" ? "text.primary" : "text.secondary",
            letterSpacing: "-0.01em",
            cursor: "pointer",
          }}
        >
          Coverage Time Record
        </Typography>
      </Box>

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
          sx={{ flex: 1.8, minWidth: FILTER_SEARCH_MIN_WIDTH, maxWidth: 460 }}
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

        {activeTab === "tracker" && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <Select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              IconComponent={UnfoldMoreIcon}
              sx={selectSx}
              renderValue={(val) => {
                const count = rows.length;
                const label = STAGE_OPTIONS.find((o) => o.key === val)?.label ?? val;
                return (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontFamily: dm, fontSize: "0.78rem" }}>{label}</Typography>
                    <NumberBadge
                      count={count}
                      active
                      fontFamily={dm}
                      fontSize="0.56rem"
                    />
                  </Box>
                );
              }}
            >
              {STAGE_OPTIONS.map((opt) => (
                <MenuItem key={opt.key} value={opt.key} sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <FormControl size="small" sx={{ minWidth: 148 }}>
          <Select
            value={selectedSem}
            onChange={(e) => setSelectedSem(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            inputProps={{ "aria-label": "Semester filter" }}
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

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
            inputProps={{ "aria-label": "Client filter" }}
            sx={selectSx}
          >
            <MenuItem value="all" sx={{ fontFamily: dm, fontSize: "0.78rem" }}>
              All Clients
            </MenuItem>
            {entityOptions.map((name) => (
              <MenuItem
                key={name}
                value={name}
                sx={{ fontFamily: dm, fontSize: "0.78rem" }}
              >
                {name}
              </MenuItem>
            ))}
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

        <Box
          onClick={openGlobalExportMenu}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            height: FILTER_INPUT_HEIGHT,
            borderRadius: CONTROL_RADIUS,
            cursor: "pointer",
            border: "1px solid rgba(0,0,0,0.12)",
            fontFamily: dm,
            fontSize: "0.78rem",
            fontWeight: 500,
            color: "text.secondary",
            backgroundColor: isDark ? "transparent" : "#f7f7f8",
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

        <Menu
          anchorEl={exportMenuAnchorEl}
          open={Boolean(exportMenuAnchorEl)}
          onClose={closeExportMenu}
          PaperProps={{ sx: { borderRadius: "8px" } }}
        >
          <MenuItem
            onClick={() => runExportByFormat("csv")}
            sx={{ fontFamily: dm, fontSize: "0.78rem" }}
          >
            Export as CSV
          </MenuItem>
          <MenuItem
            onClick={() => runExportByFormat("pdf")}
            sx={{ fontFamily: dm, fontSize: "0.78rem" }}
          >
            Export as PDF
          </MenuItem>
        </Menu>

        <Tooltip title="Manage coverage" arrow>
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(true)}
            sx={{
              borderRadius: CONTROL_RADIUS,
              p: 0.7,
              height: FILTER_INPUT_HEIGHT,
              width: FILTER_INPUT_HEIGHT,
              border: "1px solid rgba(0,0,0,0.12)",
              color: "text.secondary",
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
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

      <Box sx={{ flex: 1, minHeight: 0, width: "100%", overflowX: "auto" }}>
        {activeTab === "tracker" ? (
          <Box
            sx={{
              minWidth: 760,
              height: "100%",
              bgcolor: isDark ? "background.paper" : "#f7f7f8",
              borderRadius: "10px",
              border: `1px solid ${border}`,
              overflow: "hidden",
            }}
          >
            <DataGrid
              apiRef={gridApiRef}
              rows={rows}
              columns={columns}
              loading={loading}
              pageSize={10}
              rowsPerPageOptions={[10, 20]}
              disableRowSelectionOnClick
              enableSearch={false}
              showToolbar={false}
              filterModel={externalFilterModel}
              checkboxSelection={false}
            />
          </Box>
        ) : (
          <Box
            sx={{
              minWidth: 760,
              height: "100%",
              bgcolor: isDark ? "background.paper" : "#f7f7f8",
              borderRadius: "10px",
              border: `1px solid ${border}`,
              overflowY: "auto",
              p: 1.5,
            }}
          >
            {focusedRequestId && (
              <Box
                onClick={() => setFocusedRequestId(null)}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: 1.1,
                  py: 0.45,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  color: "text.secondary",
                  cursor: "pointer",
                  mb: 1.25,
                }}
              >
                Show all requests
              </Box>
            )}

            {attendanceLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={26} sx={{ color: "#22c55e" }} />
              </Box>
            ) : ctrRequestSource.length === 0 ? (
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.82rem",
                  color: "text.secondary",
                  textAlign: "center",
                  py: 5,
                }}
              >
                No requests found for this CTR view.
              </Typography>
            ) : (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.2 }}>
                {ctrRequestSource.map((req) => {
                  const attendance = attendanceByRequest[req.id] || [];

                  return (
                    <Box
                      key={req.id}
                      sx={{
                        border: `1px solid ${border}`,
                        borderRadius: "10px",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.01)"
                          : "#ffffff",
                        overflow: "hidden",
                        position: "relative",
                        transition: "background-color 0.2s ease",
                        "&:hover": {
                          backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(53,53,53,0.05)",
                        },
                        "& .ctr-card-reveal": {
                          opacity: { xs: 1, md: 0 },
                        },
                        "&:hover .ctr-card-reveal": {
                          opacity: 1,
                        },
                      }}
                    >
                      <Tooltip title="View details" arrow placement="left">
                        <Box
                          component="button"
                          type="button"
                          onClick={() => {
                            navigate(`/admin/coverage-request-details/${req.id}`, {
                              state: {
                                backTo: "/admin/coverage-tracker",
                              },
                            });
                          }}
                          className="ctr-card-reveal"
                          sx={{
                            position: "absolute",
                            top: 0,
                            right: 0,
                            bottom: 0,
                            width: { xs: 0, md: 0 },
                            border: "none",
                            borderLeft: `1px solid ${border}`,
                            background: isDark
                              ? "linear-gradient(90deg, rgba(255,255,255,0.00) 0%, rgba(255,255,255,0.10) 100%)"
                              : "linear-gradient(90deg, rgba(53,53,53,0.00) 0%, rgba(53,53,53,0.08) 100%)",
                            color: isDark ? "rgba(255,255,255,0.82)" : "rgba(17,17,17,0.75)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            cursor: "pointer",
                            zIndex: 2,
                            transition: "opacity 0.2s ease, background 0.2s ease, color 0.2s ease, width 0.2s ease",
                            overflow: "hidden",
                            "&:hover": {
                              background: isDark
                                ? "linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.16) 100%)"
                                : "linear-gradient(90deg, rgba(53,53,53,0.03) 0%, rgba(53,53,53,0.13) 100%)",
                              color: isDark ? "#ffffff" : "#111111",
            width: { xs: 52, md: 72 },
                            },
                          }}
                        >
                          <ChevronRightIcon sx={{ fontSize: { xs: 26, md: 44 }, fontWeight: 700 }} />
                        </Box>
                      </Tooltip>

                      <Box sx={{ px: 1.5, pt: 1.3, pb: 1.5, pr: { xs: 1.5, md: 7.25 } }}>

                        {attendance.length === 0 ? (
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.76rem",
                              color: "text.secondary",
                              px: 0.25,
                              py: 0.6,
                            }}
                          >
                            No attendance records for this request.
                          </Typography>
                        ) : (
                          <Box
                            sx={{
                              border: `1px solid ${border}`,
                              borderRadius: "10px",
                              overflow: "hidden",
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.015)"
                                : "#fbfbfb",
                            }}
                          >
                            <Box
                              sx={{
                                px: 1.1,
                                py: 0.95,
                                borderBottom: `1px solid ${border}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <Box sx={{ minWidth: 220 }}>
                                <Typography
                                  sx={{
                                    fontFamily: dm,
                                    fontSize: "0.84rem",
                                    fontWeight: 700,
                                    color: "text.primary",
                                  }}
                                >
                                  {req.title || req.request_title || "Coverage Request"}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontFamily: dm,
                                    fontSize: "0.72rem",
                                    color: "text.secondary",
                                  }}
                                >
                                  {req.entity?.name || "—"} · {buildEventDateDisplay(req)}
                                </Typography>
                                <Typography
                                  sx={{
                                    fontFamily: dm,
                                    fontSize: "0.72rem",
                                    color: "text.secondary",
                                  }}
                                >
                                  {req.venue || "—"}
                                </Typography>
                              </Box>

                              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                <Box
                                  sx={{
                                    px: 0.9,
                                    py: 0.28,
                                    borderRadius: "999px",
                                    backgroundColor: "#e6f1fb",
                                    color: "#0c447c",
                                    fontFamily: dm,
                                    fontSize: "0.7rem",
                                    fontWeight: 700,
                                    lineHeight: 1,
                                  }}
                                >
                                  {attendance.length} {attendance.length === 1 ? "staffer" : "staffers"}
                                </Box>

                                <Box
                                  component="button"
                                  type="button"
                                  onClick={(e) => openRequestExportMenu(e, req)}
                                  sx={{
                                    p: 0.5,
                                    border: "none",
                                    backgroundColor: "transparent",
                                    color: "text.secondary",
                                    cursor: "pointer",
                                    transition: "all 0.15s",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    "&:hover": {
                                      color: "text.primary",
                                    },
                                  }}
                                  title="Export"
                                >
                                  <FileDownloadOutlinedIcon sx={{ fontSize: "1.3rem" }} />
                                </Box>
                              </Box>
                            </Box>

                            <Box
                              sx={{
                                display: "grid",
                                gridTemplateColumns: { xs: "1fr", md: "1.05fr 1.75fr 0.85fr 1fr" },
                                borderBottom: `1px solid ${border}`,
                                backgroundColor: isDark
                                  ? "rgba(0,0,0,0.14)"
                                  : "rgba(53,53,53,0.02)",
                              }}
                            >
                              <Typography sx={{ px: 1.1, py: 0.55, fontFamily: dm, fontSize: "0.6rem", fontWeight: 700, color: "text.disabled", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                                Staff Assigned
                              </Typography>
                              <Typography sx={{ px: 1.1, py: 0.55, fontFamily: dm, fontSize: "0.6rem", fontWeight: 700, color: "text.disabled", letterSpacing: "0.07em", textTransform: "uppercase", borderLeft: { md: `1px solid ${border}` } }}>
                                Attendance
                              </Typography>
                              <Typography sx={{ px: 1.1, py: 0.55, fontFamily: dm, fontSize: "0.6rem", fontWeight: 700, color: "text.disabled", letterSpacing: "0.07em", textTransform: "uppercase", borderLeft: { md: `1px solid ${border}` } }}>
                                Status
                              </Typography>
                              <Typography sx={{ px: 1.1, py: 0.55, fontFamily: dm, fontSize: "0.6rem", fontWeight: 700, color: "text.disabled", letterSpacing: "0.07em", textTransform: "uppercase", borderLeft: { md: `1px solid ${border}` } }}>
                                Proof of Attendance
                              </Typography>
                            </Box>

                            <Box sx={{ display: "flex", flexDirection: "column" }}>
                              {attendance.map((a, index) => {
                                const sectionName = a.sections?.name || "Unassigned Section";
                                const timeInStr = fmtTime(a.timed_in_at);
                                const completedAtStr = fmtTime(a.completed_at);
                                const duration = computeDuration(a.timed_in_at, a.completed_at);
                                const status = a.completed_at
                                  ? "Completed"
                                  : a.timed_in_at
                                    ? "Ongoing"
                                    : "Pending";
                                const proofUrl = resolveSelfieUrl(a.selfie_url);
                                const isBroken = !!brokenSelfieById[a.id];
                                const hasProof = !!a.selfie_url;
                                const avatarColor = getAvatarColor(a.staff_id);
                                const avatarUrl = getAvatarUrl(a.staff?.avatar_url);

                                return (
                                  <Box
                                    key={a.id}
                                    sx={{
                                      display: "grid",
                                      gridTemplateColumns: { xs: "1fr", md: "1.05fr 1.75fr 0.85fr 1fr" },
                                      borderTop: index === 0 ? "none" : `1px solid ${border}`,
                                    }}
                                  >
                                    <Box sx={{ px: 1.1, py: 0.95, minWidth: 0 }}>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                                        <Avatar
                                          src={avatarUrl || undefined}
                                          sx={{
                                            width: TABLE_USER_AVATAR_SIZE,
                                            height: TABLE_USER_AVATAR_SIZE,
                                            fontSize: TABLE_USER_AVATAR_FONT_SIZE,
                                            fontWeight: 600,
                                            backgroundColor: avatarColor.bg,
                                            color: avatarColor.color,
                                            flexShrink: 0,
                                          }}
                                        >
                                          {!avatarUrl && getInitials(a.staff?.full_name)}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0 }}>
                                          <Typography
                                            sx={{
                                              fontFamily: dm,
                                              fontSize: "0.8rem",
                                              fontWeight: 700,
                                              color: "text.primary",
                                              lineHeight: 1.15,
                                              whiteSpace: "nowrap",
                                              overflow: "hidden",
                                              textOverflow: "ellipsis",
                                            }}
                                          >
                                            {a.staff?.full_name || "Unknown"}
                                          </Typography>
                                          <Typography
                                            sx={{
                                              fontFamily: dm,
                                              fontSize: "0.72rem",
                                              color: "text.secondary",
                                            }}
                                          >
                                            {sectionName}
                                          </Typography>
                                        </Box>
                                      </Box>

                                    </Box>

                                    <Box sx={{ px: 1.1, py: 0.95, borderLeft: { md: `1px solid ${border}` } }}>
                                      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr 1fr" }, gap: 0.55 }}>
                                        <Box sx={{ borderRadius: "8px", px: 0.75, py: 0.48, backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(53,53,53,0.06)" }}>
                                          <Typography sx={{ fontFamily: dm, fontSize: "0.64rem", color: "text.disabled", fontWeight: 700 }}>Time in</Typography>
                                          <Typography sx={{ fontFamily: dm, fontSize: "0.84rem", color: timeInStr !== "—" ? "text.primary" : "text.disabled", fontWeight: 700 }}>{timeInStr}</Typography>
                                        </Box>
                                        <Box sx={{ borderRadius: "8px", px: 0.75, py: 0.48, backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(53,53,53,0.06)" }}>
                                          <Typography sx={{ fontFamily: dm, fontSize: "0.64rem", color: "text.disabled", fontWeight: 700 }}>Time out</Typography>
                                          <Typography sx={{ fontFamily: dm, fontSize: "0.84rem", color: completedAtStr !== "—" ? "text.primary" : "text.disabled", fontWeight: 700 }}>{completedAtStr}</Typography>
                                        </Box>
                                        <Box sx={{ borderRadius: "8px", px: 0.75, py: 0.48, backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "rgba(53,53,53,0.06)" }}>
                                          <Typography sx={{ fontFamily: dm, fontSize: "0.64rem", color: "text.disabled", fontWeight: 700 }}>Duration</Typography>
                                          <Typography sx={{ fontFamily: dm, fontSize: "0.84rem", color: duration !== "—" ? (isDark ? "#f5c52b" : "#d97706") : "text.disabled", fontWeight: 700 }}>{duration}</Typography>
                                        </Box>
                                      </Box>
                                    </Box>

                                    <Box sx={{ px: 1.1, py: 0.95, borderLeft: { md: `1px solid ${border}` } }}>
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
                                            status === "Completed"
                                              ? "#ecf8e6"
                                              : status === "Ongoing"
                                                ? "#e6f1fb"
                                                : isDark
                                                  ? "rgba(255,255,255,0.08)"
                                                  : "rgba(53,53,53,0.08)",
                                          color:
                                            status === "Completed"
                                              ? "#27500a"
                                              : status === "Ongoing"
                                                ? "#0c447c"
                                                : "text.secondary",
                                        }}
                                      >
                                        {status}
                                      </Box>
                                    </Box>

                                    <Box sx={{ px: 1.1, py: 0.95, borderLeft: { md: `1px solid ${border}` } }}>
                                      {hasProof ? (
                                        <Box
                                          sx={{
                                            width: 104,
                                            maxWidth: "100%",
                                            height: 62,
                                            borderRadius: "6px",
                                            border: `1px solid ${border}`,
                                            overflow: "hidden",
                                            backgroundColor: isDark
                                              ? "rgba(17,17,17,0.45)"
                                              : "rgba(53,53,53,0.03)",
                                            cursor: proofUrl && !isBroken ? "zoom-in" : "default",
                                          }}
                                        >
                                          {proofUrl && !isBroken ? (
                                            <Box
                                              component="img"
                                              src={proofUrl}
                                              alt="Selfie proof"
                                              sx={{
                                                width: "100%",
                                                height: "100%",
                                                objectFit: "cover",
                                                display: "block",
                                              }}
                                              onError={() =>
                                                setBrokenSelfieById((prev) => ({
                                                  ...prev,
                                                  [a.id]: true,
                                                }))
                                              }
                                              onMouseEnter={() =>
                                                handleProofMouseEnter({
                                                  id: a.id,
                                                  url: proofUrl,
                                                  name: a.staff?.full_name || "Proof of attendance",
                                                })
                                              }
                                              onMouseLeave={() => handleProofMouseLeave(a.id)}
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
                                                sx={{
                                                  color: "text.disabled",
                                                  fontSize: 18,
                                                  mb: 0.2,
                                                }}
                                              />
                                              <Typography
                                                sx={{
                                                  fontFamily: dm,
                                                  fontSize: "0.64rem",
                                                  color: "text.disabled",
                                                  lineHeight: 1,
                                                }}
                                              >
                                                Unavailable
                                              </Typography>
                                            </Box>
                                          )}
                                        </Box>
                                      ) : (
                                        <Typography
                                          sx={{
                                            fontFamily: dm,
                                            fontSize: "0.72rem",
                                            color: "text.disabled",
                                          }}
                                        >
                                          No proof uploaded
                                        </Typography>
                                      )}
                                    </Box>
                                  </Box>
                                );
                              })}
                            </Box>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>

      <Drawer
        anchor="right"
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            width: { xs: "100%", sm: 420 },
            backgroundColor: "background.default",
            borderLeft: `1px solid ${border}`,
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            py: 2,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.85rem",
              fontWeight: 600,
              color: "text.primary",
            }}
          >
            Coverage Settings
          </Typography>
          <IconButton
            size="small"
            onClick={() => setSettingsOpen(false)}
            sx={{
              borderRadius: "10px",
              color: "text.secondary",
              "&:hover": { backgroundColor: HOVER_BG },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>

        <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={missingProofOnly}
                onChange={(e) => setMissingProofOnly(e.target.checked)}
              />
            }
            label={
              <Typography sx={{ fontFamily: dm, fontSize: "0.8rem" }}>
                Show only requests with missing proof
              </Typography>
            }
          />

          <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary" }}>
            These settings only affect this Coverage Tracker view.
          </Typography>
        </Box>
      </Drawer>

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
            px: 2,
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
              alt={`Proof of attendance - ${hoveredProof.name}`}
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
