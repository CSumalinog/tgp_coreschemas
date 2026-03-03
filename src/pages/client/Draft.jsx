// src/pages/client/DraftTable.jsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Stack,
  IconButton,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { DataGrid } from "@mui/x-data-grid";
import { useClientRequests } from "../../hooks/useClientRequests";
import { updateDraftRequest, deleteDraftRequest } from "../../services/coverageRequestService";
import { supabase } from "../../lib/supabaseClient";
import CoverageRequestDialog from "../../components/client/RequestForm";

// "program_flows/uuid/1234567_MyFile.pdf" → "MyFile.pdf"
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
  const { drafts, loading, refetch } = useClientRequests();

  const [selectedDraft, setSelectedDraft] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");

  const handleView = (row) => {
    setError("");
    setSelectedDraft(row);
  };
  const handleClose = () => setSelectedDraft(null);

  // ── Edit ──────────────────────────────────────────────────────────────
  const handleEditOpen = () => {
    setEditOpen(true);
    
  };

  // Called after successful edit save
  const handleEditSuccess = () => {
    setEditOpen(false);
    setSelectedDraft(null);
    refetch();
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmitDraft = async () => {
    if (!selectedDraft) return;
    setActionLoading(true);
    setError("");

    try {
      await updateDraftRequest(
        selectedDraft.id,
        {
          title: selectedDraft.raw.title,
          description: selectedDraft.raw.description,
          date: selectedDraft.raw.event_date,
          from_time: selectedDraft.raw.from_time,
          to_time: selectedDraft.raw.to_time,
          venue: selectedDraft.raw.venue,
          services: selectedDraft.raw.services,
          client_type: selectedDraft.raw.client_type_id,
          entity: selectedDraft.raw.entity_id,
          contact_person: selectedDraft.raw.contact_person,
          contact_info: selectedDraft.raw.contact_info,
          file_url: selectedDraft.raw.file_url,
        },
        null,   // no new file
        true    // submitNow = true → status becomes Pending
      );

      setConfirmSubmitOpen(false);
      setSelectedDraft(null);
      refetch();
    } catch (err) {
      setError(err.message || "Failed to submit. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────
  const handleDeleteDraft = async () => {
    if (!selectedDraft) return;
    setActionLoading(true);
    setError("");

    try {
      await deleteDraftRequest(selectedDraft.id);
      setConfirmDeleteOpen(false);
      setSelectedDraft(null);
      refetch();
    } catch (err) {
      setError(err.message || "Failed to delete. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Map rows ──────────────────────────────────────────────────────────
  const rows = drafts.map((req) => ({
    id: req.id,
    eventTitle: req.title,
    savedDate: req.created_at
      ? new Date(req.created_at).toLocaleDateString()
      : "—",
    status: req.status,
    raw: req, // keep raw data for edit/submit
    details: {
      description: req.description,
      requestedDate: req.event_date,
      timeRange: req.from_time && req.to_time
        ? `${req.from_time} - ${req.to_time}`
        : "—",
      venue: req.venue,
      coverageComponents: req.services
        ? Object.entries(req.services)
            .filter(([_, pax]) => pax > 0)
            .map(([name, pax]) => ({ name, pax }))
        : [],
      client: req.entity?.name || "—",
      contactPerson: req.contact_person || "—",
      contactInfo: req.contact_info || "—",
      filePath: req.file_url || null,
    },
  }));

  const columns = [
    { field: "eventTitle", headerName: "Event Title", flex: 1 },
    { field: "savedDate", headerName: "Saved Date", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 500, color: "#fbc02d", textTransform: "uppercase", fontSize: "0.9rem" }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => handleView(params.row)}
        >
          View Details
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "#f9f9f9" }}>

      {/* ── Table ── */}
      <Box sx={{ height: 500, width: "100%", bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={5}
            rowsPerPageOptions={[5]}
            disableSelectionOnClick
            sx={{
              "& .MuiDataGrid-cell": { outline: "none" },
              "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f5f5f5" },
            }}
          />
        )}
      </Box>

      {/* ── View Draft Dialog ── */}
      <Dialog
        open={!!selectedDraft && !editOpen}
        onClose={handleClose}
        fullWidth
        PaperProps={{
          sx: {
            fontFamily: "'Helvetica Neue', sans-serif",
            borderRadius: 3,
            width: 600,
            height: "70vh",
          },
        }}
      >
        <Box sx={{ position: "absolute", right: 8, top: 8, display: "flex", alignItems: "center", gap: 0.5 }}>
          <IconButton size="small" onClick={handleEditOpen} sx={{ color: "#757575" }}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={() => setConfirmDeleteOpen(true)} sx={{ color: "#757575" }}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
          <IconButton size="small" onClick={handleClose} sx={{ color: "#757575" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
      </Box>

        <DialogTitle sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.9rem" }}>
          Draft Details
        </DialogTitle>

        <DialogContent
          dividers
          sx={{ "& *": { fontSize: "0.9rem", fontFamily: "'Helvetica Neue', sans-serif" } }}
        >
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {selectedDraft && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 2.8fr", gap: 0.1, alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Event Title:</Typography>
              <Typography variant="body2">{selectedDraft.eventTitle}</Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Description:</Typography>
              <Typography variant="body2">{selectedDraft.details.description || "—"}</Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Requested Date:</Typography>
              <Typography variant="body2">{selectedDraft.details.requestedDate || "—"}</Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Requested Time:</Typography>
              <Typography variant="body2">{selectedDraft.details.timeRange}</Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Venue:</Typography>
              <Typography variant="body2">{selectedDraft.details.venue || "—"}</Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Services Needed:</Typography>
              {selectedDraft.details.coverageComponents.length > 0 ? (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                  {selectedDraft.details.coverageComponents.map((c, idx) => (
                    <Chip key={idx} label={`${c.name} (${c.pax})`} size="small" sx={{ borderRadius: 2 }} />
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" sx={{ color: "#9e9e9e" }}>—</Typography>
              )}

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Client:</Typography>
              <Typography variant="body2">{selectedDraft.details.client}</Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Contact Person:</Typography>
              <Typography variant="body2">{selectedDraft.details.contactPerson}</Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Contact Info:</Typography>
              <Typography variant="body2">{selectedDraft.details.contactInfo}</Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>File Attachment:</Typography>
              {selectedDraft.details.filePath ? (
                <Typography
                  variant="body2"
                  onClick={() => openFile(selectedDraft.details.filePath)}
                  sx={{ color: "#1976d2", cursor: "pointer", textDecoration: "underline", wordBreak: "break-word", "&:hover": { color: "#1565c0" } }}
                >
                  {getFileName(selectedDraft.details.filePath)}
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: "#9e9e9e" }}>No file attached</Typography>
              )}
            </Box>
          )}
        </DialogContent>

        {/* ── Actions: Edit | Submit | Delete ── */}
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          
          {/* Submit */}
          <Button
            variant="contained"
            startIcon={<SendOutlinedIcon />}
            size="small"
            onClick={() => setConfirmSubmitOpen(true)}
            sx={{ backgroundColor: "#f5c52b", color: "#212121", textTransform: "none", "&:hover": { backgroundColor: "#e6b920" } }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm Submit Dialog ── */}
      <Dialog
        open={confirmSubmitOpen}
        onClose={() => !actionLoading && setConfirmSubmitOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
          Submit this request?
        </DialogTitle>
        <DialogContent sx={{ "& *": { fontSize: "0.9rem" } }}>
          <Typography>
            Once submitted, this request will be sent to Admin for review and
            can no longer be edited.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmSubmitOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitDraft}
            disabled={actionLoading}
            sx={{ backgroundColor: "#f5c52b", color: "#212121", "&:hover": { backgroundColor: "#e6b920" } }}
          >
            {actionLoading ? <CircularProgress size={18} /> : "Yes, Submit"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Confirm Delete Dialog ── */}
      <Dialog
        open={confirmDeleteOpen}
        onClose={() => !actionLoading && setConfirmDeleteOpen(false)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle sx={{ fontSize: "0.95rem", fontWeight: 600 }}>
          Delete this draft?
        </DialogTitle>
        <DialogContent sx={{ "& *": { fontSize: "0.9rem" } }}>
          <Typography>
            This draft will be permanently deleted and cannot be recovered.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteDraft}
            disabled={actionLoading}
          >
            {actionLoading ? <CircularProgress size={18} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Edit Dialog (reuses CoverageRequestDialog prefilled) ── */}
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