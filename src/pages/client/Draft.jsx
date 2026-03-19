// src/pages/client/DraftTable.jsx
import React, { useState } from "react";
import {
  Box, Dialog, DialogContent,
  Typography, IconButton, CircularProgress, Alert, GlobalStyles,
} from "@mui/material";
import CloseIcon                   from "@mui/icons-material/Close";
import EditOutlinedIcon            from "@mui/icons-material/EditOutlined";
import SendOutlinedIcon            from "@mui/icons-material/SendOutlined";
import DeleteOutlineIcon           from "@mui/icons-material/DeleteOutline";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import WarningAmberOutlinedIcon    from "@mui/icons-material/WarningAmberOutlined";
import { DataGrid }                from "@mui/x-data-grid";
import { useTheme }                from "@mui/material/styles";
import { useClientRequests }       from "../../hooks/useClientRequests";
import { useRealtimeNotify }       from "../../hooks/useRealtimeNotify";
import { updateDraftRequest, deleteDraftRequest } from "../../services/coverageRequestService";
import { supabase }                from "../../lib/supabaseClient";
import CoverageRequestDialog       from "../../components/client/RequestForm";

// ── Brand tokens ──────────────────────────────────────────────────────────────
const GOLD        = "#F5C52B";
const GOLD_08     = "rgba(245,197,43,0.08)";
const GOLD_18     = "rgba(245,197,43,0.18)";
const CHARCOAL    = "#353535";
const BORDER      = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const HOVER_BG    = "rgba(53,53,53,0.03)";
const dm          = "'Inter', sans-serif";

// ── Helpers ───────────────────────────────────────────────────────────────────
const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};
const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage.from("coverage-files").getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

// ── Column menu GlobalStyles ──────────────────────────────────────────────────
function ColumnMenuStyles({ isDark, border }) {
  const paperBg   = isDark ? "#1e1e1e" : "#ffffff";
  const shadow    = isDark ? "0 12px 40px rgba(0,0,0,0.55)" : "0 4px 24px rgba(53,53,53,0.12)";
  const textColor = isDark ? "rgba(255,255,255,0.85)" : CHARCOAL;
  const iconColor = isDark ? "rgba(255,255,255,0.35)" : "rgba(53,53,53,0.4)";
  const hoverBg   = isDark ? "rgba(245,197,43,0.08)" : "rgba(245,197,43,0.07)";

  return (
    <GlobalStyles styles={{
      ".MuiPaper-root:has(> .MuiDataGrid-menuList)": {
        borderRadius:    "10px !important",
        border:          `1px solid ${border} !important`,
        backgroundColor: `${paperBg} !important`,
        boxShadow:       `${shadow} !important`,
        minWidth:        "180px !important",
        overflow:        "hidden !important",
      },
      ".MuiDataGrid-menuList": {
        padding: "4px 0 !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root": {
        fontFamily:  `${dm} !important`,
        fontSize:    "0.78rem !important",
        fontWeight:  "500 !important",
        color:       `${textColor} !important`,
        padding:     "7px 14px !important",
        minHeight:   "unset !important",
        gap:         "10px !important",
        transition:  "background-color 0.12s, color 0.12s !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover": {
        backgroundColor: `${hoverBg} !important`,
        color:           "#b45309 !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root .MuiListItemIcon-root": {
        minWidth:   "unset !important",
        color:      `${iconColor} !important`,
        transition: "color 0.12s !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root .MuiSvgIcon-root": {
        fontSize: "1rem !important",
        color:    `${iconColor} !important`,
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiListItemIcon-root": {
        color: "#b45309 !important",
      },
      ".MuiDataGrid-menuList .MuiMenuItem-root:hover .MuiSvgIcon-root": {
        color: "#b45309 !important",
      },
      ".MuiDataGrid-menuList .MuiListItemText-primary": {
        fontFamily: `${dm} !important`,
        fontSize:   "0.78rem !important",
        fontWeight: "500 !important",
      },
      ".MuiDataGrid-menuList .MuiDivider-root": {
        borderColor: `${border} !important`,
        margin:      "4px 12px !important",
      },
    }} />
  );
}

export default function Draft() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const border = isDark ? BORDER_DARK : BORDER;

  const { drafts, loading, refetch } = useClientRequests();

  // ─── Realtime subscription ────────────────────────────────────────────────
  useRealtimeNotify("coverage_requests", refetch, null, { title: "Coverage Request" });

  const [selectedDraft,     setSelectedDraft]     = useState(null);
  const [editOpen,          setEditOpen]          = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionLoading,     setActionLoading]     = useState(false);
  const [error,             setError]             = useState("");

  const handleView  = (row) => { setError(""); setSelectedDraft(row); };
  const handleClose = () => setSelectedDraft(null);
  const handleEditSuccess = () => { setEditOpen(false); setSelectedDraft(null); refetch(); };

  const handleSubmitDraft = async () => {
    if (!selectedDraft) return;
    setActionLoading(true); setError("");
    try {
      await updateDraftRequest(selectedDraft.id, {
        title:          selectedDraft.raw.title,
        description:    selectedDraft.raw.description,
        date:           selectedDraft.raw.event_date,
        from_time:      selectedDraft.raw.from_time,
        to_time:        selectedDraft.raw.to_time,
        venue:          selectedDraft.raw.venue,
        services:       selectedDraft.raw.services,
        client_type:    selectedDraft.raw.client_type_id,
        entity:         selectedDraft.raw.entity_id,
        contact_person: selectedDraft.raw.contact_person,
        contact_info:   selectedDraft.raw.contact_info,
        file_url:       selectedDraft.raw.file_url,
      }, null, true);
      setConfirmSubmitOpen(false); setSelectedDraft(null); refetch();
    } catch (err) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally { setActionLoading(false); }
  };

  const handleDeleteDraft = async () => {
    if (!selectedDraft) return;
    setActionLoading(true); setError("");
    try {
      await deleteDraftRequest(selectedDraft.id);
      setConfirmDeleteOpen(false); setSelectedDraft(null); refetch();
    } catch (err) {
      setError(err.message || "Failed to delete. Please try again.");
    } finally { setActionLoading(false); }
  };

  const rows = drafts.map((req) => ({
    id: req.id,
    eventTitle: req.title,
    savedDate: req.created_at
      ? new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
      : "—",
    status: req.status,
    raw: req,
    details: {
      description:        req.description,
      requestedDate:      req.event_date,
      timeRange:          req.from_time && req.to_time ? `${req.from_time} – ${req.to_time}` : "—",
      venue:              req.venue,
      coverageComponents: req.services
        ? Object.entries(req.services).filter(([_, pax]) => pax > 0).map(([name, pax]) => ({ name, pax }))
        : [],
      client:        req.entity?.name   || "—",
      contactPerson: req.contact_person || "—",
      contactInfo:   req.contact_info   || "—",
      filePath:      req.file_url       || null,
    },
  }));

  const columns = [
    {
      field: "eventTitle", headerName: "Event Title", flex: 1.5,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", fontWeight: 500, color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {p.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "savedDate", headerName: "Saved", flex: 0.9,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "text.secondary" }}>{p.value}</Typography>
        </Box>
      ),
    },
    {
      field: "status", headerName: "Status", flex: 0.7,
      renderCell: () => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, px: 1.25, py: 0.35, borderRadius: "6px", backgroundColor: isDark ? "rgba(245,197,43,0.08)" : "#fef9ec" }}>
            <Box sx={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#f59e0b", flexShrink: 0 }} />
            <Typography sx={{ fontFamily: dm, fontSize: "0.68rem", fontWeight: 600, color: "#b45309", letterSpacing: "0.04em" }}>
              Draft
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "actions", headerName: "", width: 80, sortable: false, align: "right", headerAlign: "right",
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", height: "100%", pr: 0.75 }}>
          <Box
            onClick={() => handleView(p.row)}
            sx={{
              px: 1.25, py: 0.45, borderRadius: "6px", cursor: "pointer",
              border: `1px solid ${border}`,
              fontFamily: dm, fontSize: "0.73rem", fontWeight: 500,
              color: "text.secondary",
              transition: "all 0.15s",
              "&:hover": { borderColor: GOLD, color: CHARCOAL, backgroundColor: GOLD_08 },
            }}
          >
            View
          </Box>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: "background.default", minHeight: "100%", fontFamily: dm }}>

      {/* ── Column menu styles ── */}
      <ColumnMenuStyles isDark={isDark} border={border} />

      {/* ── Header ── */}
      <Box sx={{ mb: 3 }}>
        <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "1.05rem", color: "text.primary", letterSpacing: "-0.02em" }}>
          Drafts
        </Typography>
        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.secondary", mt: 0.3 }}>
          Saved requests that haven't been submitted yet.
        </Typography>
      </Box>

      {/* ── Grid ── */}
      <Box sx={{
        width: "100%",
        bgcolor: "background.paper",
        borderRadius: "10px",
        border: `1px solid ${border}`,
        overflow: "hidden",
      }}>
        {loading ? (
          <Box sx={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={26} sx={{ color: GOLD }} />
          </Box>
        ) : (
          <DataGrid
            rows={rows} columns={columns}
            pageSize={8} rowsPerPageOptions={[8]}
            disableSelectionOnClick
            rowHeight={52}
            sx={makeDataGridSx(isDark, border)}
          />
        )}
      </Box>

      {/* ── View Draft Dialog ── */}
      <Dialog
        open={!!selectedDraft && !editOpen}
        onClose={handleClose}
        fullWidth maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: "14px",
            backgroundColor: "background.paper",
            border: `1px solid ${border}`,
            boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.6)" : "0 8px 40px rgba(53,53,53,0.12)",
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          px: 3, py: 2,
          borderBottom: `1px solid ${border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}>
            <Box sx={{ width: 2.5, height: 28, borderRadius: "2px", backgroundColor: "#f59e0b", flexShrink: 0 }} />
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.92rem", color: "text.primary" }}>
                  Draft Details
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.3, borderRadius: "5px", backgroundColor: isDark ? GOLD_08 : "#fef9ec" }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                  <Typography sx={{ fontFamily: dm, fontSize: "0.65rem", fontWeight: 600, color: "#b45309" }}>Draft</Typography>
                </Box>
              </Box>
              {selectedDraft && (
                <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary", mt: 0.1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedDraft.eventTitle}
                </Typography>
              )}
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, flexShrink: 0, ml: 1 }}>
            <IconButton size="small" onClick={() => setEditOpen(true)}
              sx={{ borderRadius: "8px", color: "text.secondary", "&:hover": { color: "text.primary", backgroundColor: HOVER_BG } }}>
              <EditOutlinedIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" onClick={() => setConfirmDeleteOpen(true)}
              sx={{ borderRadius: "8px", color: "text.secondary", "&:hover": { color: "#dc2626", backgroundColor: isDark ? "rgba(220,38,38,0.08)" : "#fef2f2" } }}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
            <IconButton size="small" onClick={handleClose}
              sx={{ borderRadius: "8px", color: "text.secondary", "&:hover": { backgroundColor: HOVER_BG } }}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

        <DialogContent sx={{ px: 3, py: 2.5, overflowY: "auto" }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: "8px", fontFamily: dm, fontSize: "0.78rem" }}>{error}</Alert>
          )}

          {selectedDraft && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>

              <Section label="Event Details" border={border}>
                <InfoGrid rows={[
                  ["Title",       selectedDraft.eventTitle],
                  ["Description", selectedDraft.details.description],
                  ["Date",        selectedDraft.details.requestedDate || "—"],
                  ["Time",        selectedDraft.details.timeRange],
                  ["Venue",       selectedDraft.details.venue],
                ]} />
              </Section>

              <Section label="Coverage Requirements" border={border}>
                {selectedDraft.details.coverageComponents.length > 0 ? (
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {selectedDraft.details.coverageComponents.map((c, idx) => (
                      <Box key={idx} sx={{
                        px: 1.25, py: 0.4, borderRadius: "6px",
                        border: `1px solid ${border}`,
                        backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)",
                      }}>
                        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.primary" }}>
                          {c.name}{" "}
                          <Box component="span" sx={{ color: "text.secondary" }}>×{c.pax}</Box>
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>—</Typography>
                )}
              </Section>

              <Section label="Client" border={border}>
                <InfoGrid rows={[
                  ["Client",         selectedDraft.details.client],
                  ["Contact Person", selectedDraft.details.contactPerson],
                  ["Contact Info",   selectedDraft.details.contactInfo],
                ]} />
              </Section>

              <Section label="Attachment" border={border}>
                {selectedDraft.details.filePath ? (
                  <Box
                    onClick={() => openFile(selectedDraft.details.filePath)}
                    sx={{
                      display: "inline-flex", alignItems: "center", gap: 0.75,
                      cursor: "pointer",
                      px: 1.25, py: 0.6, borderRadius: "7px",
                      border: `1px solid ${border}`,
                      transition: "border-color 0.15s",
                      "&:hover": { borderColor: GOLD },
                    }}
                  >
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 14, color: "text.secondary" }} />
                    <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: "text.primary" }}>
                      {getFileName(selectedDraft.details.filePath)}
                    </Typography>
                  </Box>
                ) : (
                  <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.secondary" }}>No file attached</Typography>
                )}
              </Section>

            </Box>
          )}
        </DialogContent>

        {/* Footer actions */}
        <Box sx={{
          px: 3, py: 1.75,
          borderTop: `1px solid ${border}`,
          display: "flex", justifyContent: "flex-end", gap: 1,
          backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)",
        }}>
          <ActionBtn onClick={handleClose} border={border}>
            Close
          </ActionBtn>
          <ActionBtn
            primary
            onClick={() => setConfirmSubmitOpen(true)}
            icon={<SendOutlinedIcon sx={{ fontSize: 13 }} />}
          >
            Submit Request
          </ActionBtn>
        </Box>
      </Dialog>

      {/* ── Confirm Submit Dialog ── */}
      <ConfirmDialog
        open={confirmSubmitOpen}
        onClose={() => !actionLoading && setConfirmSubmitOpen(false)}
        isDark={isDark} border={border}
        icon={<SendOutlinedIcon sx={{ fontSize: 16, color: "#b45309" }} />}
        iconBg={isDark ? GOLD_08 : "#fef9ec"}
        title="Submit Request"
        subtitle="This cannot be undone"
        itemName={selectedDraft?.eventTitle}
        warning="Once submitted, this request will be sent to Admin for review and can no longer be edited."
        warningBg={isDark ? "rgba(245,197,43,0.06)" : "#fef9ec"}
        warningBorder={isDark ? "rgba(245,197,43,0.15)" : "#fde68a"}
        warningColor={isDark ? "#fbbf24" : "#92400e"}
        warningIcon={<WarningAmberOutlinedIcon sx={{ fontSize: 14, color: "#d97706", flexShrink: 0 }} />}
        actionLoading={actionLoading}
        onConfirm={handleSubmitDraft}
        confirmLabel="Yes, Submit"
        confirmSx={{ backgroundColor: GOLD, color: CHARCOAL, "&:hover": { backgroundColor: "#e6b920" } }}
      />

      {/* ── Confirm Delete Dialog ── */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => !actionLoading && setConfirmDeleteOpen(false)}
        isDark={isDark} border={border}
        icon={<DeleteOutlineIcon sx={{ fontSize: 16, color: "#dc2626" }} />}
        iconBg={isDark ? "rgba(220,38,38,0.1)" : "#fef2f2"}
        title="Delete Draft"
        subtitle="This cannot be recovered"
        itemName={selectedDraft?.eventTitle}
        warning="This draft will be permanently deleted and cannot be recovered."
        warningBg={isDark ? "rgba(220,38,38,0.06)" : "#fef2f2"}
        warningBorder={isDark ? "rgba(220,38,38,0.15)" : "#fecaca"}
        warningColor={isDark ? "#f87171" : "#991b1b"}
        warningIcon={<WarningAmberOutlinedIcon sx={{ fontSize: 14, color: "#dc2626", flexShrink: 0 }} />}
        actionLoading={actionLoading}
        onConfirm={handleDeleteDraft}
        confirmLabel="Yes, Delete"
        confirmSx={{
          backgroundColor: isDark ? "rgba(220,38,38,0.12)" : "#fef2f2",
          color: "#dc2626",
          border: `1px solid ${isDark ? "rgba(220,38,38,0.2)" : "#fecaca"}`,
          "&:hover": { backgroundColor: isDark ? "rgba(220,38,38,0.18)" : "#fee2e2" },
        }}
      />

      {selectedDraft && (
        <CoverageRequestDialog
          open={editOpen}
          handleClose={() => setEditOpen(false)}
          onSuccess={handleEditSuccess}
          defaultDate={selectedDraft.raw.event_date ? new Date(selectedDraft.raw.event_date) : null}
          existingRequest={selectedDraft.raw}
        />
      )}
    </Box>
  );
}

// ── Confirm Dialog (shared) ───────────────────────────────────────────────────
function ConfirmDialog({
  open, onClose, isDark, border,
  icon, iconBg, title, subtitle,
  itemName, warning, warningBg, warningBorder, warningColor, warningIcon,
  actionLoading, onConfirm, confirmLabel, confirmSx,
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth
      PaperProps={{
        sx: {
          borderRadius: "14px",
          backgroundColor: "background.paper",
          border: `1px solid ${border}`,
          boxShadow: isDark ? "0 24px 64px rgba(0,0,0,0.6)" : "0 8px 40px rgba(53,53,53,0.12)",
        },
      }}
    >
      <Box sx={{ px: 3, pt: 2.5, pb: 2, borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ width: 32, height: 32, borderRadius: "8px", backgroundColor: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {icon}
          </Box>
          <Box>
            <Typography sx={{ fontFamily: dm, fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>{title}</Typography>
            <Typography sx={{ fontFamily: dm, fontSize: "0.7rem", color: "text.secondary" }}>{subtitle}</Typography>
          </Box>
        </Box>
        <IconButton size="small" onClick={onClose} disabled={actionLoading}
          sx={{ borderRadius: "8px", color: "text.secondary", "&:hover": { backgroundColor: HOVER_BG } }}>
          <CloseIcon sx={{ fontSize: 16 }} />
        </IconButton>
      </Box>

      <Box sx={{ px: 3, py: 2.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box sx={{ px: 1.5, py: 1.25, borderRadius: "8px", border: `1px solid ${border}`, backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)" }}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.85rem", fontWeight: 600, color: "text.primary" }}>
            {itemName}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 1, px: 1.5, py: 1.25, borderRadius: "8px", backgroundColor: warningBg, border: `1px solid ${warningBorder}` }}>
          {warningIcon}
          <Typography sx={{ fontFamily: dm, fontSize: "0.76rem", color: warningColor, lineHeight: 1.55 }}>
            {warning}
          </Typography>
        </Box>
      </Box>

      <Box sx={{
        px: 3, py: 1.75,
        borderTop: `1px solid ${border}`,
        display: "flex", justifyContent: "flex-end", gap: 1,
        backgroundColor: isDark ? "rgba(255,255,255,0.01)" : "rgba(53,53,53,0.01)",
      }}>
        <ActionBtn onClick={onClose} disabled={actionLoading} border={border}>Cancel</ActionBtn>
        <ActionBtn onClick={onConfirm} disabled={actionLoading} customSx={confirmSx}>
          {actionLoading ? <CircularProgress size={14} sx={{ color: "inherit" }} /> : confirmLabel}
        </ActionBtn>
      </Box>
    </Dialog>
  );
}

// ── Small shared components ───────────────────────────────────────────────────
function ActionBtn({ children, onClick, disabled, primary, icon, border, customSx = {} }) {
  return (
    <Box
      onClick={!disabled ? onClick : undefined}
      sx={{
        display: "flex", alignItems: "center", gap: 0.6,
        px: 1.75, py: 0.65, borderRadius: "8px", cursor: disabled ? "default" : "pointer",
        fontFamily: dm, fontSize: "0.8rem", fontWeight: primary ? 600 : 500,
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.15s",
        ...(primary ? {
          backgroundColor: GOLD, color: CHARCOAL,
          "&:hover": { backgroundColor: "#e6b920" },
        } : {
          border: `1px solid ${border || BORDER}`,
          color: "text.secondary",
          "&:hover": { borderColor: "rgba(53,53,53,0.2)", color: "text.primary", backgroundColor: HOVER_BG },
        }),
        ...customSx,
      }}
    >
      {icon}{children}
    </Box>
  );
}

function Section({ label, children, border }) {
  return (
    <Box>
      <Typography sx={{
        fontFamily: dm, fontSize: "0.62rem", fontWeight: 700,
        color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase",
        mb: 1, pb: 0.75, borderBottom: `1px solid ${border}`,
      }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

function InfoGrid({ rows }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "130px 1fr", rowGap: 0.75, columnGap: 1.5, alignItems: "start" }}>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography sx={{ fontFamily: dm, fontSize: "0.75rem", color: "text.secondary" }}>{label}</Typography>
          <Typography sx={{ fontFamily: dm, fontSize: "0.82rem", color: "text.primary", lineHeight: 1.55 }}>{value || "—"}</Typography>
        </React.Fragment>
      ))}
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
      backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(53,53,53,0.02)",
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
    "& .MuiDataGrid-columnHeader:focus, & .MuiDataGrid-columnHeader:focus-within": { outline: "none" },
    "& .MuiDataGrid-menuIcon button":    { color: "text.disabled", padding: "2px", borderRadius: "6px", transition: "all 0.15s", "&:hover": { backgroundColor: GOLD_08, color: "#b45309" } },
    "& .MuiDataGrid-menuIcon .MuiSvgIcon-root": { fontSize: "1rem" },
    "& .MuiDataGrid-columnHeader:hover .MuiDataGrid-menuIcon button": { color: "text.secondary" },

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
      fontFamily: dm, fontSize: "0.75rem", color: "text.secondary",
    },
    "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
      fontFamily: dm, fontSize: "0.75rem",
    },
    "& .MuiDataGrid-virtualScroller":  { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay":          { backgroundColor: "background.paper" },
  };
}