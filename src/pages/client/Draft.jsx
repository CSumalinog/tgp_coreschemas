// src/pages/client/DraftTable.jsx
import React, { useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
  IconButton,
  CircularProgress,
  Alert,
  GlobalStyles,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVertOutlined";
import { DataGrid } from "../../components/common/AppDataGrid";
import ViewActionButton from "../../components/common/ViewActionButton";
import { useTheme } from "@mui/material/styles";
import { useClientRequests } from "../../hooks/useClientRequests";
import { useRealtimeNotify } from "../../hooks/useRealtimeNotify";
import { pushSuccessToast } from "../../components/common/SuccessToast";
import {
  updateDraftRequest,
  deleteDraftRequest,
} from "../../services/coverageRequestService";
import { supabase } from "../../lib/supabaseClient";
import {
  TABLE_FIRST_COL_FLEX,
  TABLE_FIRST_COL_MIN_WIDTH,
} from "../../utils/layoutTokens";
import CoverageRequestDialog from "../../components/client/RequestForm";
import BrandedLoader from "../../components/common/BrandedLoader";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG = "rgba(53,53,53,0.03)";
const dm = "'Inter', sans-serif";

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

// ── Format "HH:MM:SS" or "HH:MM" → "H:MM AM/PM" ─────────────────────────────
function fmtTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ── Format "YYYY-MM-DD" → localized ──────────────────────────────────────────
function fmtDate(d, opts = { month: "long", day: "numeric", year: "numeric" }) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", opts);
}

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
          fontSize: "1.5rem !important",
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

export default function Draft() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const { drafts, loading, refetch } = useClientRequests();
  useRealtimeNotify("coverage_requests", refetch, null, {
    title: "Coverage Request",
  });

  const [selectedDraft, setSelectedDraft] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [rowMenuAnchor, setRowMenuAnchor] = useState(null);
  const [rowMenuTarget, setRowMenuTarget] = useState(null);

  const handleView = (row) => {
    setError("");
    setSelectedDraft(row);
  };
  const handleClose = () => setSelectedDraft(null);
  const handleEditSuccess = () => {
    setEditOpen(false);
    setSelectedDraft(null);
    refetch();
    pushSuccessToast("Draft saved.");
  };

  const handleSubmitDraft = async () => {
    if (!selectedDraft) return;
    setActionLoading(true);
    setError("");
    try {
      const raw = selectedDraft.raw;
      const isMultiDay = !!(raw.is_multiday && raw.event_days?.length > 0);
      await updateDraftRequest(
        selectedDraft.id,
        {
          title: raw.title,
          description: raw.description,
          is_multiday: isMultiDay,
          date: raw.event_date ? new Date(raw.event_date + "T00:00:00") : null,
          from_time: raw.from_time,
          to_time: raw.to_time,
          event_days: isMultiDay ? raw.event_days : null,
          venue: raw.venue,
          services: raw.services,
          client_type: raw.client_type_id,
          entity: raw.entity_id,
          contact_person: raw.contact_person,
          contact_info: raw.contact_info,
          file_url: raw.file_url,
        },
        null,
        true,
      );
      setConfirmSubmitOpen(false);
      setSelectedDraft(null);
      refetch();
      pushSuccessToast("Request submitted successfully.");
    } catch (err) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteDraft = async () => {
    if (!selectedDraft) return;
    setActionLoading(true);
    setError("");
    try {
      await deleteDraftRequest(selectedDraft.id);
      setConfirmDeleteOpen(false);
      setSelectedDraft(null);
      refetch();
      pushSuccessToast("Draft deleted.");
    } catch (err) {
      setError(err.message || "Failed to delete. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const rows = drafts.map((req) => ({
    id: req.id,
    eventTitle: req.title,
    savedDate: req.created_at
      ? new Date(req.created_at).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      : "—",
    status: req.status,
    raw: req,
    details: {
      description: req.description,
      is_multiday: !!(req.is_multiday && req.event_days?.length > 0),
      event_days: req.event_days || [],
      requestedDate: req.event_date,
      timeRange:
        req.from_time && req.to_time
          ? `${req.from_time} – ${req.to_time}`
          : "—",
      venue: req.venue,
      coverageComponents: req.services
        ? Object.entries(req.services)
            .filter(([, pax]) => pax > 0)
            .map(([name, pax]) => ({ name, pax }))
        : [],
      client: req.entity?.name || "—",
      contactPerson: req.contact_person || "—",
      contactInfo: req.contact_info || "—",
      filePath: req.file_url || null,
    },
  }));

  const columns = [
    {
      field: "eventTitle",
      headerName: "Event Title",
      flex: TABLE_FIRST_COL_FLEX,
      minWidth: TABLE_FIRST_COL_MIN_WIDTH,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
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
      field: "savedDate",
      headerName: "Saved",
      flex: 0.9,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.78rem",
              color: "text.secondary",
            }}
          >
            {p.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 130,
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
            gap: 0.5,
          }}
        >
          <ViewActionButton onClick={() => handleView(p.row)} />
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setRowMenuTarget(p.row);
              setRowMenuAnchor(e.currentTarget);
            }}
            sx={{
              borderRadius: "6px",
              color: "text.secondary",
              "&:hover": { backgroundColor: HOVER_BG },
            }}
          >
            <MoreVertIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box
      sx={{
        p: { xs: 2, sm: 3 },
        backgroundColor: "#ffffff",
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: dm,
      }}
    >
      <ColumnMenuStyles isDark={isDark} border={border} />

      {/* ── Row kebab menu ── */}
      <Menu
        anchorEl={rowMenuAnchor}
        open={Boolean(rowMenuAnchor)}
        onClose={() => { setRowMenuAnchor(null); setRowMenuTarget(null); }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        slotProps={{
          paper: {
            sx: {
              mt: 0.5,
              borderRadius: "10px",
              minWidth: 160,
              border: `1px solid ${border}`,
              boxShadow: isDark
                ? "0 8px 24px rgba(0,0,0,0.5)"
                : "0 4px 20px rgba(53,53,53,0.10)",
            },
          },
        }}
      >
        <MenuItem
          onClick={() => {
            setRowMenuAnchor(null);
            setSelectedDraft(rowMenuTarget);
            setEditOpen(true);
          }}
          sx={{ fontFamily: dm, fontSize: "0.8rem", py: 1, gap: 0.5 }}
        >
          <ListItemIcon sx={{ minWidth: 28 }}>
            <EditOutlinedIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          </ListItemIcon>
          <ListItemText primary="Edit" slotProps={{ primary: { fontFamily: dm, fontSize: "0.8rem", fontWeight: 500 } }} />
        </MenuItem>
        <MenuItem
          onClick={() => {
            setRowMenuAnchor(null);
            setSelectedDraft(rowMenuTarget);
            setConfirmDeleteOpen(true);
          }}
          sx={{ fontFamily: dm, fontSize: "0.8rem", py: 1, gap: 0.5, color: "#dc2626" }}
        >
          <ListItemIcon sx={{ minWidth: 28 }}>
            <DeleteOutlineIcon sx={{ fontSize: 16, color: "#dc2626" }} />
          </ListItemIcon>
          <ListItemText primary="Delete" slotProps={{ primary: { fontFamily: dm, fontSize: "0.8rem", fontWeight: 500, color: "#dc2626" } }} />
        </MenuItem>
      </Menu>

      {/* ── Header ── */}
      <Box sx={{ mb: 3, flexShrink: 0 }}>
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 600,
            fontSize: "0.8rem",
            color: "text.primary",
            letterSpacing: "-0.01em",
          }}
        >
          Drafts
        </Typography>
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.78rem",
            color: "text.secondary",
            mt: 0.3,
          }}
        >
          Saved requests that haven't been submitted yet.
        </Typography>
      </Box>

      {/* ── Grid ── */}
      <Box
        sx={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflowX: "auto",
          borderRadius: "10px",
          boxShadow: isDark
            ? "0 1px 10px rgba(0,0,0,0.4)"
            : "0 1px 8px rgba(0,0,0,0.07)",
        }}
      >
        <Box
          sx={{
            minWidth: 640,
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
                height: 300,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <BrandedLoader size={44} inline />
            </Box>
          ) : (
            <DataGrid
              rows={rows}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10]}
              showToolbar={false}
              disableRowSelectionOnClick
              rowHeight={56}
            />
          )}
        </Box>
      </Box>

      {/* ── View Draft Dialog ── */}
      <Dialog
        open={!!selectedDraft && !editOpen}
        onClose={handleClose}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: "10px",
              backgroundColor: "background.paper",
              border: `1px solid ${border}`,
              boxShadow: isDark
                ? "0 24px 64px rgba(0,0,0,0.6)"
                : "0 8px 40px rgba(53,53,53,0.12)",
            },
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
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              minWidth: 0,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: dm,
                  fontWeight: 700,
                  fontSize: "0.92rem",
                  color: "text.primary",
                }}
              >
                Details
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.25,
              flexShrink: 0,
              ml: 1,
            }}
          >
            <IconButton
              size="small"
              onClick={() => setEditOpen(true)}
              sx={{
                borderRadius: "10px",
                color: "text.secondary",
                "&:hover": { color: "text.primary", backgroundColor: HOVER_BG },
              }}
            >
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton
              size="small"
              onClick={() => setConfirmDeleteOpen(true)}
              sx={{
                borderRadius: "10px",
                color: "text.secondary",
                "&:hover": {
                  color: "#dc2626",
                  backgroundColor: isDark ? "rgba(220,38,38,0.08)" : "#fef2f2",
                },
              }}
            >
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        <DialogContent sx={{ px: 3, py: 2.5, overflowY: "auto" }}>
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

          {selectedDraft && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
              {/* ── Event Details ── */}
              <Section label="Event Details" border={border}>
                <InfoGrid
                  rows={[
                    ["Title", selectedDraft.eventTitle],
                    ["Description", selectedDraft.details.description],
                  ]}
                />

                {/* Date / time — multi-day aware */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "130px 1fr",
                    rowGap: 0.75,
                    columnGap: 1.5,
                    alignItems: "start",
                    mt: 0.75,
                  }}
                >
                  {selectedDraft.details.is_multiday ? (
                    <>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.75rem",
                          color: "text.secondary",
                          pt: 0.3,
                        }}
                      >
                        Coverage Days
                      </Typography>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 0.5,
                        }}
                      >
                        {selectedDraft.details.event_days.map((day, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              px: 1,
                              py: 0.5,
                              borderRadius: "10px",
                              border: `1px solid ${border}`,
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.02)"
                                : "#fafafa",
                            }}
                          >
                            <Box
                              sx={{
                                px: 0.9,
                                py: 0.2,
                                borderRadius: "10px",
                                backgroundColor: GOLD,
                                color: CHARCOAL,
                                fontSize: "0.7rem",
                                fontWeight: 600,
                                flexShrink: 0,
                                minWidth: 48,
                                textAlign: "center",
                              }}
                            >
                              {fmtDate(day.date, {
                                month: "short",
                                day: "numeric",
                              })}
                            </Box>
                            {day.from_time && day.to_time ? (
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.8rem",
                                  color: "text.primary",
                                }}
                              >
                                {fmtTime(day.from_time)} –{" "}
                                {fmtTime(day.to_time)}
                              </Typography>
                            ) : (
                              <Typography
                                sx={{
                                  fontFamily: dm,
                                  fontSize: "0.78rem",
                                  color: "text.disabled",
                                  fontStyle: "italic",
                                }}
                              >
                                No time set
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    </>
                  ) : (
                    <>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.75rem",
                          color: "text.secondary",
                        }}
                      >
                        Date
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.82rem",
                          color: "text.primary",
                          lineHeight: 1.55,
                        }}
                      >
                        {fmtDate(selectedDraft.details.requestedDate)}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.75rem",
                          color: "text.secondary",
                        }}
                      >
                        Time
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.82rem",
                          color: "text.primary",
                          lineHeight: 1.55,
                        }}
                      >
                        {selectedDraft.details.timeRange}
                      </Typography>
                    </>
                  )}

                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.75rem",
                      color: "text.secondary",
                    }}
                  >
                    Venue
                  </Typography>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.82rem",
                      color: "text.primary",
                      lineHeight: 1.55,
                    }}
                  >
                    {selectedDraft.details.venue || "—"}
                  </Typography>
                </Box>
              </Section>

              {/* ── Coverage Requirements ── */}
              <Section label="Coverage Requirements" border={border}>
                {selectedDraft.details.coverageComponents.length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selectedDraft.details.coverageComponents.map((c, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          px: 1.25,
                          py: 0.4,
                          borderRadius: "10px",
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
                          <Box
                            component="span"
                            sx={{ color: "text.secondary" }}
                          >
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

              {/* ── Client ── */}
              <Section label="Client" border={border}>
                <InfoGrid
                  rows={[
                    ["Client", selectedDraft.details.client],
                    ["Contact Person", selectedDraft.details.contactPerson],
                    ["Contact Info", selectedDraft.details.contactInfo],
                  ]}
                />
              </Section>

              {/* ── Attachment ── */}
              <Section label="Attachment" border={border}>
                {selectedDraft.details.filePath ? (
                  <Box
                    onClick={() => openFile(selectedDraft.details.filePath)}
                    sx={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 0.75,
                      cursor: "pointer",
                      px: 1.25,
                      py: 0.6,
                      borderRadius: "10px",
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
                      {getFileName(selectedDraft.details.filePath)}
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
            </Box>
          )}
        </DialogContent>

        {/* Footer */}
        <Box
          sx={{
            px: 3,
            py: 1.75,
            borderTop: `1px solid ${border}`,
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.01)"
              : "rgba(53,53,53,0.01)",
          }}
        >
          <ActionBtn onClick={handleClose} border={border}>
            Cancel
          </ActionBtn>
          <ActionBtn
            primary
            onClick={() => setConfirmSubmitOpen(true)}
          >
            Submit Request
          </ActionBtn>
        </Box>
      </Dialog>

      {/* ── Confirm Submit ── */}
      <ConfirmDialog
        open={confirmSubmitOpen}
        onClose={() => !actionLoading && setConfirmSubmitOpen(false)}
        isDark={isDark}
        border={border}
        icon={<SendOutlinedIcon sx={{ fontSize: 16, color: "#b45309" }} />}
        iconBg={isDark ? GOLD_08 : "#fef9ec"}
        title="Submit Request"
        subtitle="This cannot be undone"
        itemName={selectedDraft?.eventTitle}
        warning="Once submitted, this request will be sent to Admin for review and can no longer be edited."
        warningBg={isDark ? "rgba(245,197,43,0.06)" : "#fef9ec"}
        warningBorder={isDark ? "rgba(245,197,43,0.15)" : "#fde68a"}
        warningColor={isDark ? "#fbbf24" : "#92400e"}
        warningIcon={
          <WarningAmberOutlinedIcon
            sx={{ fontSize: 14, color: "#d97706", flexShrink: 0 }}
          />
        }
        actionLoading={actionLoading}
        onConfirm={handleSubmitDraft}
        confirmLabel="Yes, Submit"
        confirmSx={{
          backgroundColor: "#212121",
          color: "#fff",
          "&:hover": { backgroundColor: "#333" },
        }}
      />

      {/* ── Confirm Delete ── */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => !actionLoading && setConfirmDeleteOpen(false)}
        isDark={isDark}
        border={border}
        title="Delete Draft"
        itemName={selectedDraft?.eventTitle}
        warning="This draft will be permanently deleted and cannot be recovered."
        warningBg={isDark ? "rgba(220,38,38,0.06)" : "#fef2f2"}
        warningBorder={isDark ? "rgba(220,38,38,0.15)" : "#fecaca"}
        warningColor={isDark ? "#f87171" : "#991b1b"}
        warningIcon={
          <WarningAmberOutlinedIcon
            sx={{ fontSize: 14, color: "#dc2626", flexShrink: 0 }}
          />
        }
        actionLoading={actionLoading}
        onConfirm={handleDeleteDraft}
        confirmLabel="Yes, Delete"
        confirmSx={{
          backgroundColor: "#dc2626",
          color: "#fff",
          border: "1px solid #dc2626",
          "&:hover": {
            backgroundColor: "#b91c1c",
            border: "1px solid #b91c1c",
          },
        }}
      />

      {selectedDraft && (
        <CoverageRequestDialog
          open={editOpen}
          handleClose={() => setEditOpen(false)}
          onSuccess={handleEditSuccess}
          defaultDate={
            selectedDraft.raw.event_date
              ? new Date(selectedDraft.raw.event_date)
              : null
          }
          existingRequest={selectedDraft.raw}
        />
      )}
    </Box>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  open,
  onClose,
  isDark,
  border,
  title,
  itemName,
  warning,
  warningBg,
  warningBorder,
  warningColor,
  warningIcon,
  actionLoading,
  onConfirm,
  confirmLabel,
  confirmSx,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: "10px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark
              ? "0 24px 64px rgba(0,0,0,0.6)"
              : "0 8px 40px rgba(53,53,53,0.12)",
          },
        },
      }}
    >
      <Box
        sx={{
          px: 3,
          pt: 2.5,
          pb: 2,
          borderBottom: `1px solid ${border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontWeight: 700,
            fontSize: "0.9rem",
            color: "text.primary",
          }}
        >
          {title}
        </Typography>
      </Box>
      <Box
        sx={{
          px: 3,
          py: 2.5,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        <Box
          sx={{
            px: 1.5,
            py: 1.25,
            borderRadius: "10px",
            border: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(53,53,53,0.02)",
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
            {itemName}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 1,
            px: 1.5,
            py: 1.25,
            borderRadius: "10px",
            backgroundColor: warningBg,
            border: `1px solid ${warningBorder}`,
          }}
        >
          {warningIcon}
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.76rem",
              color: warningColor,
              lineHeight: 1.55,
            }}
          >
            {warning}
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          px: 3,
          py: 1.75,
          borderTop: `1px solid ${border}`,
          display: "flex",
          justifyContent: "flex-end",
          gap: 1,
          backgroundColor: isDark
            ? "rgba(255,255,255,0.01)"
            : "rgba(53,53,53,0.01)",
        }}
      >
        <ActionBtn onClick={onClose} disabled={actionLoading} border={border}>
          Cancel
        </ActionBtn>
        <ActionBtn
          onClick={onConfirm}
          disabled={actionLoading}
          customSx={confirmSx}
        >
          {actionLoading ? (
            <CircularProgress size={14} sx={{ color: "inherit" }} />
          ) : (
            confirmLabel
          )}
        </ActionBtn>
      </Box>
    </Dialog>
  );
}

// ── Shared components ─────────────────────────────────────────────────────────
function ActionBtn({
  children,
  onClick,
  disabled,
  primary,
  icon,
  border,
  customSx = {},
}) {
  return (
    <Box
      onClick={!disabled ? onClick : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.6,
        px: 1.75,
        py: 0.65,
        borderRadius: "10px",
        cursor: disabled ? "default" : "pointer",
        fontFamily: dm,
        fontSize: "0.8rem",
        fontWeight: primary ? 600 : 500,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        ...(primary
          ? {
              backgroundColor: "#212121",
              color: "#fff",
              "&:hover": { backgroundColor: "#333" },
            }
          : {
              border: `1px solid ${border || BORDER}`,
              color: "text.secondary",
              "&:hover": {
                borderColor: "rgba(53,53,53,0.2)",
                color: "text.primary",
                backgroundColor: HOVER_BG,
              },
            }),
        ...customSx,
      }}
    >
      {icon}
      {children}
    </Box>
  );
}

function Section({ label, children, border }) {
  return (
    <Box>
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
