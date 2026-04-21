// src/pages/section_head/ReassignmentHistoryPage.jsx
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  Tooltip,
  useTheme,
  OutlinedInput,
  InputAdornment,
} from "@mui/material";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import ArrowForwardIcon from "@mui/icons-material/ArrowForwardOutlined";
import SearchIcon from "@mui/icons-material/SearchOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import { DataGrid } from "../../components/common/AppDataGrid";
import { supabase } from "../../lib/supabaseClient";
import { getSemesterDisplayName } from "../../utils/semesterLabel";
import {
  CONTROL_RADIUS,
  FILTER_INPUT_HEIGHT,
  FILTER_ROW_GAP,
  FILTER_SEARCH_MIN_WIDTH,
  FILTER_SEMESTER_MIN_WIDTH,
  TABLE_FIRST_COL_FLEX,
  TABLE_FIRST_COL_MIN_WIDTH,
} from "../../utils/layoutTokens";

// â”€â”€ Helpers (mirrors CoverageManagementBase helpers) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const dm = "'Inter', sans-serif";

const openFile = (filePath, bucket = "coverage-files") => {
  if (!filePath) return;
  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop();
};

const extractEmergencyProofPath = (reasonText) => {
  if (!reasonText) return null;
  const match = String(reasonText).match(/\(Proof:\s*([^)]+)\)\s*$/i);
  return match?.[1]?.trim() || null;
};

const extractEmergencyReasonText = (reasonText) => {
  const raw = String(reasonText || "").trim();
  if (!raw) return "Emergency announced";
  const withoutProof = raw.replace(/\(Proof:\s*([^)]+)\)\s*$/i, "").trim();
  return (
    withoutProof.replace(/^Emergency announced:\s*/i, "").trim() ||
    "Emergency announced"
  );
};

const isAnnouncedEmergency = (a) => {
  if (a.status !== "Cancelled") return false;
  return String(a.cancellation_reason || "")
    .toLowerCase()
    .includes("emergency");
};

const fmtDate = (d) => {
  if (!d) return "\u2014";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

// â”€â”€ Main component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function ReassignmentHistoryPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? "rgba(255,255,255,0.08)" : "rgba(53,53,53,0.08)";
  const navigate = useNavigate();

  const [rows, setRows] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedSemester, setSelectedSemester] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all"); // all | emergency | noshow
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);

  // Load current user
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

  // Load semesters for filter
  useEffect(() => {
    supabase
      .from("semesters")
      .select("id, name, start_date, end_date, is_active")
      .order("start_date", { ascending: false })
      .then(({ data }) => {
        if (data) {
          setSemesters(data);
          const active = data.find((s) => s.is_active);
          if (active) setSelectedSemester(active.id);
        }
      });
  }, []);

  useEffect(() => {
    if (!currentUser?.section) return;
    if (semesters.length === 0 && selectedSemester !== "all") return;

    let cancelled = false;

    const run = async () => {
      setLoading(true);

      let dateFrom = null;
      let dateTo = null;
      if (selectedSemester !== "all") {
        const sem = semesters.find((s) => s.id === selectedSemester);
        if (sem) {
          dateFrom = sem.start_date;
          dateTo = sem.end_date;
        }
      }

      let query = supabase
        .from("coverage_assignments")
        .select(
          `
          id, status, section, service_key, assignment_date, from_time, to_time,
          cancellation_reason, cancelled_at, is_reassigned,
          staffer:profiles!assigned_to ( id, full_name, section, avatar_url ),
          request:request_id (
            id, title, event_date,
            entity:client_entities ( name )
          )
        `,
        )
        .eq("section", currentUser.section)
        .in("status", ["Cancelled", "No Show"])
        .order("cancelled_at", { ascending: false, nullsFirst: false });

      if (dateFrom) query = query.gte("assignment_date", dateFrom);
      if (dateTo) query = query.lte("assignment_date", dateTo);

      const { data: triggers, error } = await query;
      if (error || !triggers || cancelled) {
        if (!cancelled) setLoading(false);
        return;
      }

      let repQuery = supabase
        .from("coverage_assignments")
        .select(
          `
          id, assignment_date, section, service_key, is_reassigned,
          staffer:profiles!assigned_to ( id, full_name, avatar_url )
        `,
        )
        .eq("section", currentUser.section)
        .eq("is_reassigned", true);

      if (dateFrom) repQuery = repQuery.gte("assignment_date", dateFrom);
      if (dateTo) repQuery = repQuery.lte("assignment_date", dateTo);

      const { data: replacements } = await repQuery;

      const repMap = {};
      (replacements || []).forEach((r) => {
        const key = `${r.assignment_date}|${r.service_key || ""}`;
        if (!repMap[key]) repMap[key] = [];
        repMap[key].push(r);
      });

      const enriched = triggers.map((t) => ({
        ...t,
        replacements:
          repMap[`${t.assignment_date}|${t.service_key || ""}`] || [],
      }));

      if (!cancelled) {
        setRows(enriched);
        setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [currentUser, selectedSemester, semesters]);

  const filtered = useMemo(() => {
    let out = rows;
    if (typeFilter === "emergency")
      out = out.filter((r) => isAnnouncedEmergency(r));
    else if (typeFilter === "noshow")
      out = out.filter((r) => !isAnnouncedEmergency(r));
    if (searchText.trim()) {
      const tokens = searchText.toLowerCase().split(/\s+/).filter(Boolean);
      out = out.filter((r) => {
        const haystack = [r.request?.title ?? "", r.cancellation_reason ?? ""]
          .join(" ")
          .toLowerCase();
        return tokens.every((t) => haystack.includes(t));
      });
    }
    return out;
  }, [rows, typeFilter, searchText]);

  // â”€â”€ DataGrid rows â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const dataRows = useMemo(
    () =>
      filtered.map((row) => {
        const emergency = isAnnouncedEmergency(row);
        const reasonText = emergency
          ? extractEmergencyReasonText(row.cancellation_reason)
          : null;
        const proofPath = emergency
          ? extractEmergencyProofPath(row.cancellation_reason)
          : null;
        return {
          id: row.id,
          reqId: row.request?.id,
          title: row.request?.title || "\u2014",
          dateOccurred: fmtDate(row.assignment_date),
          reason: reasonText || (emergency ? "Emergency announced" : "No Show"),
          proofPath,
          reassignedTo:
            row.replacements?.length > 0
              ? row.replacements
                  .map((r) => r.staffer?.full_name || "Unknown")
                  .join(", ")
              : "",
          dateOfReassignment:
            row.replacements?.length > 0
              ? fmtDate(row.replacements[0].assignment_date)
              : "\u2014",
        };
      }),
    [filtered],
  );

  // â”€â”€ DataGrid columns â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
            {p.row.reqId && (
              <Tooltip title="View assignment" placement="top">
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate("/sec_head/coverage-management/assignment", {
                      state: { openRequestId: p.row.reqId },
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
            )}
          </Box>
        ),
      },
      {
        field: "dateOccurred",
        headerName: "Date Occurred",
        flex: 1,
        minWidth: 130,
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
                color: p.value === "\u2014" ? "text.disabled" : "text.primary",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "reason",
        headerName: "Reason",
        flex: 1.6,
        minWidth: 150,
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
                fontSize: "0.79rem",
                color: "text.primary",
                whiteSpace: "normal",
                lineHeight: 1.45,
              }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
      {
        field: "proofPath",
        headerName: "Proof",
        flex: 0.9,
        minWidth: 100,
        sortable: false,
        renderCell: (p) => {
          if (!p.value)
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
                  {"\u2014"}
                </Typography>
              </Box>
            );
          return (
            <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
              <Tooltip
                title={getFileName(p.value) || "View Proof"}
                placement="top"
              >
                <Box
                  onClick={(e) => {
                    e.stopPropagation();
                    openFile(p.value);
                  }}
                  sx={{
                    display: "inline-flex",
                    cursor: "pointer",
                    color: "text.secondary",
                    "&:hover": { color: "text.primary" },
                  }}
                >
                  <InsertDriveFileOutlinedIcon sx={{ fontSize: 18 }} />
                </Box>
              </Tooltip>
            </Box>
          );
        },
      },
      {
        field: "reassignedTo",
        headerName: "Reassigned To",
        flex: 1.2,
        minWidth: 140,
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
                color: p.value ? "text.primary" : "text.disabled",
                fontStyle: p.value ? "normal" : "italic",
              }}
            >
              {p.value || "Pending"}
            </Typography>
          </Box>
        ),
      },
      {
        field: "dateOfReassignment",
        headerName: "Date of Reassignment",
        flex: 1,
        minWidth: 160,
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
                  p.value === "\u2014" ? "text.disabled" : "text.secondary",
              }}
            >
              {p.value}
            </Typography>
          </Box>
        ),
      },
    ],
    [navigate, border],
  );

  return (
    <Box
      sx={{
        px: { xs: 1.5, sm: 2, md: 3 },
        pt: { xs: 1.5, sm: 2, md: 2.5 },
        pb: 3,
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: isDark ? "background.default" : "#ffffff",
        fontFamily: dm,
      }}
    >
      {/* â”€â”€ Filter bar â”€â”€ */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          gap: FILTER_ROW_GAP,
          alignItems: "center",
          flexWrap: "nowrap",
          overflowX: "auto",
          flexShrink: 0,
        }}
      >
        {/* Search */}
        <FormControl
          size="small"
          sx={{ flexShrink: 0, minWidth: FILTER_SEARCH_MIN_WIDTH }}
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
              backgroundColor: isDark ? "transparent" : "#f7f7f8",
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "rgba(0,0,0,0.12)",
              },
            }}
          />
        </FormControl>

        {/* Type filter */}
        <FormControl size="small" sx={{ flexShrink: 0, minWidth: 190 }}>
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            IconComponent={UnfoldMoreIcon}
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
              All
            </MenuItem>
            <MenuItem
              value="emergency"
              sx={{ fontFamily: dm, fontSize: "0.78rem" }}
            >
              Announced Emergency
            </MenuItem>
            <MenuItem
              value="noshow"
              sx={{ fontFamily: dm, fontSize: "0.78rem" }}
            >
              No Show
            </MenuItem>
          </Select>
        </FormControl>

        {/* Semester filter */}
        <FormControl
          size="small"
          sx={{ flexShrink: 0, minWidth: FILTER_SEMESTER_MIN_WIDTH }}
        >
          <Select
            value={selectedSemester}
            onChange={(e) => setSelectedSemester(e.target.value)}
            IconComponent={UnfoldMoreIcon}
            displayEmpty
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
                {s.is_active ? " (Active)" : ""}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ flex: 1 }} />

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.75rem",
            color: "text.disabled",
            flexShrink: 0,
          }}
        >
          {filtered.length} {filtered.length === 1 ? "event" : "events"}
        </Typography>
      </Box>

      {/* ── Content ── */}
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
          rows={dataRows}
          columns={columns}
          loading={loading}
          enableSearch={false}
          showToolbar={false}
          rowHeight={56}
          sx={{ height: "100%" }}
        />
      </Box>
    </Box>
  );
}
