// src/pages/client/DraftTable.jsx
import React, { useState } from "react";
import {
  Box, Button, Dialog, DialogTitle, DialogContent, DialogActions,
  Typography, Chip, Stack, IconButton, CircularProgress, Alert, useTheme,
} from "@mui/material";
import CloseIcon          from "@mui/icons-material/Close";
import EditOutlinedIcon   from "@mui/icons-material/EditOutlined";
import SendOutlinedIcon   from "@mui/icons-material/SendOutlined";
import DeleteOutlineIcon  from "@mui/icons-material/DeleteOutline";
import { DataGrid }       from "@mui/x-data-grid";
import { useClientRequests } from "../../hooks/useClientRequests";
import { updateDraftRequest, deleteDraftRequest } from "../../services/coverageRequestService";
import { supabase } from "../../lib/supabaseClient";
import CoverageRequestDialog from "../../components/client/RequestForm";

const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};

const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage.from("coverage-files").getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

export default function Draft() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { drafts, loading, refetch } = useClientRequests();
  const [selectedDraft,      setSelectedDraft]      = useState(null);
  const [editOpen,           setEditOpen]           = useState(false);
  const [confirmSubmitOpen,  setConfirmSubmitOpen]  = useState(false);
  const [confirmDeleteOpen,  setConfirmDeleteOpen]  = useState(false);
  const [actionLoading,      setActionLoading]      = useState(false);
  const [error,              setError]              = useState("");

  const handleView  = (row) => { setError(""); setSelectedDraft(row); };
  const handleClose = () => setSelectedDraft(null);

  const handleEditSuccess = () => { setEditOpen(false); setSelectedDraft(null); refetch(); };

  const handleSubmitDraft = async () => {
    if (!selectedDraft) return;
    setActionLoading(true); setError("");
    try {
      await updateDraftRequest(selectedDraft.id, {
        title: selectedDraft.raw.title, description: selectedDraft.raw.description,
        date: selectedDraft.raw.event_date, from_time: selectedDraft.raw.from_time,
        to_time: selectedDraft.raw.to_time, venue: selectedDraft.raw.venue,
        services: selectedDraft.raw.services, client_type: selectedDraft.raw.client_type_id,
        entity: selectedDraft.raw.entity_id, contact_person: selectedDraft.raw.contact_person,
        contact_info: selectedDraft.raw.contact_info, file_url: selectedDraft.raw.file_url,
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
    savedDate: req.created_at ? new Date(req.created_at).toLocaleDateString() : "—",
    status: req.status,
    raw: req,
    details: {
      description: req.description,
      requestedDate: req.event_date,
      timeRange: req.from_time && req.to_time ? `${req.from_time} - ${req.to_time}` : "—",
      venue: req.venue,
      coverageComponents: req.services
        ? Object.entries(req.services).filter(([_, pax]) => pax > 0).map(([name, pax]) => ({ name, pax }))
        : [],
      client: req.entity?.name || "—",
      contactPerson: req.contact_person || "—",
      contactInfo: req.contact_info || "—",
      filePath: req.file_url || null,
    },
  }));

  const dataGridSx = {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: "0.9rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-cell":           { outline: "none", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-columnHeaders":  { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-footerContainer":{ backgroundColor: isDark ? "#1e1e1e" : "#fff", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-row:hover":      { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":    { color: "text.secondary" },
  };

  const columns = [
    { field: "eventTitle", headerName: "Event Title", flex: 1 },
    { field: "savedDate",  headerName: "Saved Date",  flex: 1 },
    {
      field: "status", headerName: "Status", flex: 1,
      renderCell: (params) => (
        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 500, color: "#fbc02d", textTransform: "uppercase", fontSize: "0.9rem" }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions", headerName: "Actions", flex: 1, sortable: false,
      renderCell: (params) => (
        <Button variant="outlined" size="small" onClick={() => handleView(params.row)}>
          View Details
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default" }}>

      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid rows={rows} columns={columns} pageSize={5} rowsPerPageOptions={[5]} disableSelectionOnClick sx={dataGridSx} />
        )}
      </Box>

      {/* View Draft Dialog */}
      <Dialog open={!!selectedDraft && !editOpen} onClose={handleClose} fullWidth
        PaperProps={{ sx: { fontFamily: "'Helvetica Neue', sans-serif", borderRadius: 3, width: 600, height: "70vh", backgroundColor: "background.paper" } }}>
        <Box sx={{ position: "absolute", right: 8, top: 8, display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={() => setEditOpen(true)} sx={{ color: "text.secondary" }}><EditOutlinedIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={() => setConfirmDeleteOpen(true)} sx={{ color: "text.secondary" }}><DeleteOutlineIcon fontSize="small" /></IconButton>
          <IconButton size="small" onClick={handleClose} sx={{ color: "text.secondary" }}><CloseIcon fontSize="small" /></IconButton>
        </Box>
        <DialogTitle sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.9rem", color: "text.primary" }}>
          Draft Details
        </DialogTitle>
        <DialogContent dividers sx={{ "& *": { fontSize: "0.9rem", fontFamily: "'Helvetica Neue', sans-serif" } }}>
          {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}
          {selectedDraft && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 2.8fr", gap: 0.1, alignItems: "center" }}>
              <RowLabel>Event Title</RowLabel>     <RowValue>{selectedDraft.eventTitle}</RowValue>
              <RowLabel>Description</RowLabel>     <RowValue>{selectedDraft.details.description || "—"}</RowValue>
              <RowLabel>Requested Date</RowLabel>  <RowValue>{selectedDraft.details.requestedDate || "—"}</RowValue>
              <RowLabel>Requested Time</RowLabel>  <RowValue>{selectedDraft.details.timeRange}</RowValue>
              <RowLabel>Venue</RowLabel>           <RowValue>{selectedDraft.details.venue || "—"}</RowValue>
              <RowLabel>Services Needed</RowLabel>
              {selectedDraft.details.coverageComponents.length > 0 ? (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {selectedDraft.details.coverageComponents.map((c, idx) => (
                    <Chip key={idx} label={`${c.name} (${c.pax})`} size="small" sx={{ borderRadius: 2 }} />
                  ))}
                </Stack>
              ) : <RowValue>—</RowValue>}
              <RowLabel>Client</RowLabel>          <RowValue>{selectedDraft.details.client}</RowValue>
              <RowLabel>Contact Person</RowLabel>  <RowValue>{selectedDraft.details.contactPerson}</RowValue>
              <RowLabel>Contact Info</RowLabel>    <RowValue>{selectedDraft.details.contactInfo}</RowValue>
              <RowLabel>File Attachment</RowLabel>
              {selectedDraft.details.filePath ? (
                <Typography sx={{ fontSize: "0.88rem", color: "#1976d2", cursor: "pointer", textDecoration: "underline", wordBreak: "break-word", "&:hover": { color: "#1565c0" } }}
                  onClick={() => openFile(selectedDraft.details.filePath)}>
                  {getFileName(selectedDraft.details.filePath)}
                </Typography>
              ) : <RowValue>No file attached</RowValue>}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button variant="contained" startIcon={<SendOutlinedIcon />} size="small"
            onClick={() => setConfirmSubmitOpen(true)}
            sx={{ backgroundColor: "#f5c52b", color: "#212121", textTransform: "none", "&:hover": { backgroundColor: "#e6b920" } }}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Submit */}
      <Dialog open={confirmSubmitOpen} onClose={() => !actionLoading && setConfirmSubmitOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 4, backgroundColor: "background.paper" } }}>
        <DialogTitle sx={{ fontSize: "0.95rem", fontWeight: 600, color: "text.primary" }}>Submit this request?</DialogTitle>
        <DialogContent sx={{ "& *": { fontSize: "0.9rem" } }}>
          <Typography color="text.primary">Once submitted, this request will be sent to Admin for review and can no longer be edited.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmitOpen(false)} disabled={actionLoading} sx={{ color: "text.secondary" }}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitDraft} disabled={actionLoading}
            sx={{ backgroundColor: "#f5c52b", color: "#212121", "&:hover": { backgroundColor: "#e6b920" } }}>
            {actionLoading ? <CircularProgress size={18} /> : "Yes, Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirm Delete */}
      <Dialog open={confirmDeleteOpen} onClose={() => !actionLoading && setConfirmDeleteOpen(false)} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 4, backgroundColor: "background.paper" } }}>
        <DialogTitle sx={{ fontSize: "0.95rem", fontWeight: 600, color: "text.primary" }}>Delete this draft?</DialogTitle>
        <DialogContent sx={{ "& *": { fontSize: "0.9rem" } }}>
          <Typography color="text.primary">This draft will be permanently deleted and cannot be recovered.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)} disabled={actionLoading} sx={{ color: "text.secondary" }}>Cancel</Button>
          <Button variant="contained" color="error" onClick={handleDeleteDraft} disabled={actionLoading}>
            {actionLoading ? <CircularProgress size={18} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

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

function RowLabel({ children }) {
  return <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", fontWeight: 500, pt: 0.3 }}>{children}</Typography>;
}
function RowValue({ children }) {
  return <Typography sx={{ fontSize: "0.88rem", color: "text.primary" }}>{children || "—"}</Typography>;
}