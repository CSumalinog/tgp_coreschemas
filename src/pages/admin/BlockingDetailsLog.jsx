import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  IconButton,
  Typography,
  useTheme,
} from "@mui/material";
import ArrowBackIosNewOutlinedIcon from "@mui/icons-material/ArrowBackIosNewOutlined";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DataGrid, useGridApiRef } from "../../components/common/AppDataGrid";
import BrandedLoader from "../../components/common/BrandedLoader";
import { supabase } from "../../lib/supabaseClient";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm = "'Inter', sans-serif";

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

function toDateLabel(value) {
  if (!value) return "-";
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toDateTimeLabel(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toRangeLabel(startDate, endDate) {
  if (!startDate || !endDate) return "-";
  if (startDate === endDate) return toDateLabel(startDate);
  return `${toDateLabel(startDate)} - ${toDateLabel(endDate)}`;
}

export default function BlockingDetailsLog() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const apiRef = useGridApiRef();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;
  const targetEventId = searchParams.get("eventId");

  const [rows, setRows] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [paginationModel, setPaginationModel] = useState({
    page: 0,
    pageSize: 10,
  });

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const { data, error: fetchError } = await supabase
        .from("blocked_dates")
        .select(
          "id, title, notes, start_date, end_date, blocked_by, created_at",
        )
        .order("start_date", { ascending: false })
        .order("created_at", { ascending: false });

      if (fetchError) throw fetchError;

      const blockerIds = [
        ...new Set((data || []).map((item) => item.blocked_by).filter(Boolean)),
      ];

      let blockerMap = {};
      if (blockerIds.length > 0) {
        const { data: blockerRows, error: blockerError } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", blockerIds);

        if (blockerError) throw blockerError;

        blockerMap = Object.fromEntries(
          (blockerRows || []).map((item) => [item.id, item.full_name || "Unknown"]),
        );
      }

      const today = startOfDay(new Date());
      const normalized = (data || []).map((item) => {
        const endDay = startOfDay(new Date(`${item.end_date}T12:00:00`));
        const status = endDay < today ? "Past" : "Upcoming";
        const isMulti = item.start_date !== item.end_date;

        return {
          id: item.id,
          title: item.title || "Untitled blocked date",
          start_date: item.start_date,
          end_date: item.end_date,
          range_label: toRangeLabel(item.start_date, item.end_date),
          status,
          event_type: isMulti ? "Multi-day" : "Single-day",
          blocked_by_name: blockerMap[item.blocked_by] || "Unknown",
          notes: item.notes || "",
          created_at_label: toDateTimeLabel(item.created_at),
          created_at: item.created_at || "",
        };
      });

      setRows(normalized);
    } catch (err) {
      setError(err.message || "Failed to load blocked dates.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const upcomingCount = useMemo(
    () => rows.filter((row) => row.status === "Upcoming").length,
    [rows],
  );
  const visibleRows = useMemo(() => {
    if (activeTab === "upcoming") {
      return rows.filter((row) => row.status === "Upcoming");
    }
    return rows;
  }, [rows, activeTab]);

  useEffect(() => {
    if (!targetEventId || rows.length === 0) return;
    const target = rows.find((row) => String(row.id) === String(targetEventId));
    if (target && target.status !== "Upcoming" && activeTab === "upcoming") {
      setActiveTab("all");
    }
  }, [rows, targetEventId, activeTab]);

  useEffect(() => {
    if (visibleRows.length === 0) {
      if (paginationModel.page !== 0) {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
      }
      return;
    }

    if (!targetEventId) {
      if (paginationModel.page !== 0) {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
      }
      return;
    }

    const targetIndex = visibleRows.findIndex(
      (row) => String(row.id) === String(targetEventId),
    );
    if (targetIndex < 0) {
      if (paginationModel.page !== 0) {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
      }
      return;
    }

    const nextPage = Math.floor(targetIndex / paginationModel.pageSize);
    if (paginationModel.page !== nextPage) {
      setPaginationModel((prev) => ({ ...prev, page: nextPage }));
    }
  }, [
    visibleRows,
    targetEventId,
    paginationModel.page,
    paginationModel.pageSize,
  ]);

  const columns = useMemo(
    () => [
      {
        field: "title",
        headerName: "Title",
        flex: 1.15,
        minWidth: 190,
      },
      {
        field: "range_label",
        headerName: "Blocked Date",
        flex: 1.05,
        minWidth: 170,
      },
      {
        field: "event_type",
        headerName: "Type",
        width: 120,
      },
      {
        field: "blocked_by_name",
        headerName: "Blocked By",
        flex: 0.95,
        minWidth: 150,
      },
      {
        field: "created_at_label",
        headerName: "Created",
        flex: 0.95,
        minWidth: 160,
      },
      {
        field: "notes",
        headerName: "Notes",
        flex: 1.1,
        minWidth: 210,
        renderCell: (params) => (
          <Typography
            title={params.value || ""}
            sx={{
              fontFamily: dm,
              fontSize: "0.76rem",
              color: params.value ? "text.secondary" : "text.disabled",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              width: "100%",
            }}
          >
            {params.value || "-"}
          </Typography>
        ),
      },
    ],
    [],
  );

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 3 },
        backgroundColor: "#ffffff",
        minHeight: "100%",
        fontFamily: dm,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <IconButton
            size="small"
            onClick={() => navigate("/admin/calendar-management")}
            sx={{
              border: `1px solid ${border}`,
              borderRadius: "10px",
              p: 0.65,
              color: "text.secondary",
              "&:hover": {
                borderColor: GOLD,
                backgroundColor: GOLD_08,
                color: CHARCOAL,
              },
            }}
          >
            <ArrowBackIosNewOutlinedIcon sx={{ fontSize: 13 }} />
          </IconButton>

          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.7rem",
                color: "text.secondary",
              }}
            >
              Accountability view for all blocked dates
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.8 }}>
              <Box
                onClick={() => setActiveTab("all")}
                sx={{
                  px: 1.25,
                  py: 0.55,
                  borderRadius: "10px",
                  border: `1px solid ${activeTab === "all" ? "#212121" : border}`,
                  backgroundColor:
                    activeTab === "all" ? "#212121" : "transparent",
                  fontFamily: dm,
                  fontSize: "0.74rem",
                  fontWeight: activeTab === "all" ? 700 : 500,
                  color: activeTab === "all" ? "#ffffff" : "text.secondary",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                All ({rows.length})
              </Box>
              <Box
                onClick={() => setActiveTab("upcoming")}
                sx={{
                  px: 1.25,
                  py: 0.55,
                  borderRadius: "10px",
                  border: `1px solid ${activeTab === "upcoming" ? "#212121" : border}`,
                  backgroundColor:
                    activeTab === "upcoming" ? "#212121" : "transparent",
                  fontFamily: dm,
                  fontSize: "0.74rem",
                  fontWeight: activeTab === "upcoming" ? 700 : 500,
                  color:
                    activeTab === "upcoming" ? "#ffffff" : "text.secondary",
                  cursor: "pointer",
                  userSelect: "none",
                }}
              >
                Upcoming ({upcomingCount})
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            mb: 2,
            borderRadius: "10px",
            fontFamily: dm,
            fontSize: "0.78rem",
          }}
        >
          {error}
        </Alert>
      )}

      <Box
        sx={{
          bgcolor: "#f7f7f8",
          borderRadius: "10px",
          border: `1px solid ${border}`,
          overflow: "hidden",
          minHeight: 440,
        }}
      >
        {loading ? (
          <Box
            sx={{
              height: 320,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BrandedLoader size={44} inline />
          </Box>
        ) : (
          <DataGrid
            apiRef={apiRef}
            rows={visibleRows}
            columns={columns}
            disableRowSelectionOnClick
            showToolbar={false}
            pageSizeOptions={[10, 25, 50]}
            paginationModel={paginationModel}
            onPaginationModelChange={setPaginationModel}
            getRowClassName={(params) =>
              String(params.id) === String(targetEventId) ? "row--highlighted" : ""
            }
            rowHeight={56}
            autoHeight={false}
            sx={{ minHeight: 460 }}
          />
        )}
      </Box>

      <Box sx={{ mt: 1.25 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.68rem",
            color: "text.secondary",
          }}
        >
          Use All or Upcoming to review blocking history for audits.
        </Typography>
      </Box>
    </Box>
  );
}
