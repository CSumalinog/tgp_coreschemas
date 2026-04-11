// src/pages/section_head/CoverageTimeRecordPage.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Avatar,
  Box,
  CircularProgress,
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
  TABLE_USER_AVATAR_FONT_SIZE,
  TABLE_USER_AVATAR_SIZE,
} from "../../utils/layoutTokens";

// ── Tokens ────────────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────────
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

// ── Component ──────────────────────────────────────────────────────────────────
export default function CoverageTimeRecordPage({ embedded = false }) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const [currentUser, setCurrentUser] = useState(null);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [semesters, setSemesters] = useState([]);
  const [selectedSem, setSelectedSem] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [brokenSelfieById, setBrokenSelfieById] = useState({});
  const [exportMenuAnchorEl, setExportMenuAnchorEl] = useState(null);

  // ── Load user ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, section, division")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  // ── Load semesters ─────────────────────────────────────────────────────────
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

  // ── Load requests ──────────────────────────────────────────────────────────
  const loadRequests = useCallback(async () => {
    if (!currentUser?.section) return;
    setLoading(true);
    try {
      const baseSelect = `
        id, title, event_date, is_multiday, event_days, venue, status,
        entity:client_entities ( id, name ),
        coverage_assignments (
          id, status, assigned_to, section, timed_in_at, completed_at, selfie_url,
          staffer:profiles!assigned_to ( id, full_name, section, role, avatar_url )
        )
      `;

      const { data, error } = await supabase
        .from("coverage_requests")
        .select(baseSelect)
        .in("status", [
          "Assigned",
          "Approved",
          "On Going",
          "Coverage Complete",
          "Completed",
        ])
        .contains("forwarded_sections", [currentUser.section])
        .order("event_date", { ascending: false });

      if (error) throw error;

      // Only keep requests that have at least one assignment for this section
      const mySection = currentUser.section;
      const filtered = (data || []).filter((req) =>
        (req.coverage_assignments || []).some((a) => a.section === mySection),
      );

      setRequests(filtered);
    } catch (err) {
      console.error("CTR load error:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // ── Build attendance map ────────────────────────────────────────────────────
  const attendanceByRequest = useMemo(() => {
    if (!currentUser?.section) return {};
    const mySection = currentUser.section;
    const grouped = {};

    requests.forEach((req) => {
      // Only assignments for this section
      const sectionAssignments = (req.coverage_assignments || []).filter(
        (a) => a.section === mySection,
      );

      // Dedup by staff (same logic as admin CTR)
      const byStaff = new Map();
      sectionAssignments.forEach((item) => {
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
  }, [requests, currentUser]);

  // ── Filter by semester + search ────────────────────────────────────────────
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

  // ── Export ─────────────────────────────────────────────────────────────────
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
      "Status",
      "Time In",
      "Time Out",
      "Duration",
      "Proof URL",
    ];
    if (format === "csv") {
      downloadCsvFile(
        `coverage-time-record-${sanitizeFileNamePart(currentUser?.section || "section")}.csv`,
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
        pt: embedded ? { xs: 0.5, sm: 0.75, md: 1 } : { xs: 1.5, sm: 2, md: 3 },
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
      {!embedded && (
        <Box sx={{ mb: 2, flexShrink: 0 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "1.05rem",
              fontWeight: 700,
              color: "text.primary",
              letterSpacing: "-0.02em",
            }}
          >
            Coverage Time Record
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.secondary",
              mt: 0.25,
            }}
          >
            Attendance time records for your section&apos;s covered assignments.
          </Typography>
        </Box>
      )}

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
          px: 1.25,
          py: 1,
          borderRadius: CONTROL_RADIUS,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"}`,
          backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "#f3f3f4",
        }}
      >
        <FormControl
          size="small"
          sx={{
            flex: FILTER_SEARCH_FLEX,
            minWidth: FILTER_SEARCH_MIN_WIDTH,
            maxWidth: FILTER_SEARCH_MAX_WIDTH,
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

        <FormControl size="small" sx={{ minWidth: 148 }}>
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

        <Box
          onClick={(e) => setExportMenuAnchorEl(e.currentTarget)}
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
          onClose={() => setExportMenuAnchorEl(null)}
          PaperProps={{ sx: { borderRadius: "8px" } }}
        >
          <MenuItem
            onClick={() => runExport("csv")}
            sx={{ fontFamily: dm, fontSize: "0.78rem" }}
          >
            Export as CSV
          </MenuItem>
        </Menu>
      </Box>

      {/* ── Content ── */}
      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", pt: 8 }}>
            <CircularProgress size={28} sx={{ color: "#F5C52B" }} />
          </Box>
        ) : filteredRequests.length === 0 ? (
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              color: "text.secondary",
              textAlign: "center",
              py: 8,
            }}
          >
            No time record entries found.
          </Typography>
        ) : (
          <Box
            sx={{ display: "flex", flexDirection: "column", gap: 1.2, pb: 2 }}
          >
            {filteredRequests.map((req) => {
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
                  }}
                >
                  {attendance.length === 0 ? (
                    <Box sx={{ px: 1.5, py: 1.2 }}>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.76rem",
                          color: "text.secondary",
                        }}
                      >
                        No attendance records for this request.
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        border: `1px solid ${border}`,
                        borderRadius: "10px",
                        overflow: "hidden",
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.015)"
                          : "#fbfbfb",
                        m: 1,
                      }}
                    >
                      {/* Card header */}
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
                            {req.title || "Coverage Request"}
                          </Typography>
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.72rem",
                              color: "text.secondary",
                            }}
                          >
                            {req.entity?.name || "—"} ·{" "}
                            {buildEventDateDisplay(req)}
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
                          {attendance.length}{" "}
                          {attendance.length === 1 ? "staffer" : "staffers"}
                        </Box>
                      </Box>

                      {/* Column headers */}
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: {
                            xs: "1fr",
                            md: "1.05fr 1.75fr 0.85fr 1fr",
                          },
                          borderBottom: `1px solid ${border}`,
                          backgroundColor: isDark
                            ? "rgba(0,0,0,0.14)"
                            : "rgba(53,53,53,0.02)",
                        }}
                      >
                        {[
                          "Staff Assigned",
                          "Attendance",
                          "Status",
                          "Proof of Attendance",
                        ].map((col, i) => (
                          <Typography
                            key={col}
                            sx={{
                              px: 1.1,
                              py: 0.55,
                              fontFamily: dm,
                              fontSize: "0.6rem",
                              fontWeight: 700,
                              color: "text.disabled",
                              letterSpacing: "0.07em",
                              textTransform: "uppercase",
                              borderLeft:
                                i > 0
                                  ? { md: `1px solid ${border}` }
                                  : undefined,
                            }}
                          >
                            {col}
                          </Typography>
                        ))}
                      </Box>

                      {/* Rows */}
                      <Box sx={{ display: "flex", flexDirection: "column" }}>
                        {attendance.map((a, index) => {
                          const timeInStr = fmtTime(a.timed_in_at);
                          const completedAtStr = fmtTime(a.completed_at);
                          const duration = computeDuration(
                            a.timed_in_at,
                            a.completed_at,
                          );
                          const status = a.completed_at
                            ? "Completed"
                            : a.timed_in_at
                              ? "Ongoing"
                              : "Pending";
                          const proofUrl = resolveSelfieUrl(a.selfie_url);
                          const isBroken = !!brokenSelfieById[a.id];
                          const hasProof = !!a.selfie_url;
                          const avatarColor = getAvatarColor(a.assigned_to);
                          const avatarUrl = getAvatarUrl(a.staffer?.avatar_url);

                          return (
                            <Box
                              key={a.id}
                              sx={{
                                display: "grid",
                                gridTemplateColumns: {
                                  xs: "1fr",
                                  md: "1.05fr 1.75fr 0.85fr 1fr",
                                },
                                borderTop:
                                  index === 0 ? "none" : `1px solid ${border}`,
                              }}
                            >
                              {/* Staff */}
                              <Box sx={{ px: 1.1, py: 0.95, minWidth: 0 }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.75,
                                  }}
                                >
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
                                    {!avatarUrl &&
                                      getInitials(a.staffer?.full_name)}
                                  </Avatar>
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
                                    {a.staffer?.full_name || "Unknown"}
                                  </Typography>
                                </Box>
                              </Box>

                              {/* Attendance */}
                              <Box
                                sx={{
                                  px: 1.1,
                                  py: 0.95,
                                  borderLeft: { md: `1px solid ${border}` },
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "grid",
                                    gridTemplateColumns: {
                                      xs: "1fr",
                                      sm: "1fr 1fr 1fr",
                                    },
                                    gap: 0.55,
                                  }}
                                >
                                  {[
                                    { label: "Time in", val: timeInStr },
                                    { label: "Time out", val: completedAtStr },
                                    {
                                      label: "Duration",
                                      val: duration,
                                      highlight: true,
                                    },
                                  ].map(({ label, val, highlight }) => (
                                    <Box
                                      key={label}
                                      sx={{
                                        borderRadius: "8px",
                                        px: 0.75,
                                        py: 0.48,
                                        backgroundColor: isDark
                                          ? "rgba(0,0,0,0.2)"
                                          : "rgba(53,53,53,0.06)",
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontFamily: dm,
                                          fontSize: "0.64rem",
                                          color: "text.disabled",
                                          fontWeight: 700,
                                        }}
                                      >
                                        {label}
                                      </Typography>
                                      <Typography
                                        sx={{
                                          fontFamily: dm,
                                          fontSize: "0.84rem",
                                          fontWeight: 700,
                                          color:
                                            val === "—"
                                              ? "text.disabled"
                                              : highlight
                                                ? isDark
                                                  ? "#f5c52b"
                                                  : "#d97706"
                                                : "text.primary",
                                        }}
                                      >
                                        {val}
                                      </Typography>
                                    </Box>
                                  ))}
                                </Box>
                              </Box>

                              {/* Status */}
                              <Box
                                sx={{
                                  px: 1.1,
                                  py: 0.95,
                                  borderLeft: { md: `1px solid ${border}` },
                                  display: "flex",
                                  alignItems: "center",
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

                              {/* Proof */}
                              <Box
                                sx={{
                                  px: 1.1,
                                  py: 0.95,
                                  borderLeft: { md: `1px solid ${border}` },
                                }}
                              >
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
                                      cursor:
                                        proofUrl && !isBroken
                                          ? "zoom-in"
                                          : "default",
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
                                        onClick={() =>
                                          window.open(
                                            proofUrl,
                                            "_blank",
                                            "noopener,noreferrer",
                                          )
                                        }
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
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}
