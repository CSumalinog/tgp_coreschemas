// src/pages/client/RequestTable.jsx
import React, { useState } from "react";
import {
  Box, Button, Dialog, DialogTitle, DialogContent,
  Typography, Chip, Stack, IconButton, CircularProgress, useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DataGrid } from "@mui/x-data-grid";
import { useClientRequests } from "../../hooks/useClientRequests";
import { supabase } from "../../lib/supabaseClient";

const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};

const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage.from("coverage-files").getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

export default function Request() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [selectedRequest, setSelectedRequest] = useState(null);
  const { pending, loading } = useClientRequests();

  const rows = pending.map((req) => ({
    id: req.id,
    eventTitle: req.title,
    submissionDate: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "—",
    status: req.status,
    details: {
      description: req.description,
      requestedDate: req.event_date,
      timeRange: `${req.from_time} - ${req.to_time}`,
      venue: req.venue,
      coverageComponents: req.services
        ? Object.entries(req.services).filter(([_, pax]) => pax > 0).map(([name, pax]) => ({ name, pax }))
        : [],
      client: req.entity?.name || "—",
      contactPerson: req.contact_person,
      contactInfo: req.contact_info,
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
    { field: "eventTitle",     headerName: "Event Title",       flex: 1 },
    { field: "submissionDate", headerName: "Submission Date",   flex: 1 },
    {
      field: "status", headerName: "Status", flex: 1,
      renderCell: (params) => (
        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 500, color: "#1976d2", textTransform: "uppercase", fontSize: "0.9rem" }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions", headerName: "Actions", flex: 1, sortable: false,
      renderCell: (params) => (
        <Button variant="outlined" size="small" onClick={() => setSelectedRequest(params.row)}>
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

      <Dialog open={!!selectedRequest} onClose={() => setSelectedRequest(null)} fullWidth
        PaperProps={{ sx: { fontFamily: "'Helvetica Neue', sans-serif", borderRadius: 3, width: 600, height: "70vh", backgroundColor: "background.paper" } }}>
        <IconButton onClick={() => setSelectedRequest(null)} sx={{ position: "absolute", right: 8, top: 8, color: "text.secondary" }}>
          <CloseIcon />
        </IconButton>
        <DialogTitle sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.9rem", color: "text.primary" }}>
          Request Details
        </DialogTitle>
        <DialogContent dividers sx={{ "& *": { fontFamily: "'Helvetica Neue', sans-serif" } }}>
          {selectedRequest && (
            <Box sx={{ display: "grid", gridTemplateColumns: "1.2fr 2.8fr", gap: 0.1, alignItems: "center" }}>
              <RowLabel>Request Title</RowLabel>   <RowValue>{selectedRequest.eventTitle}</RowValue>
              <RowLabel>Description</RowLabel>     <RowValue>{selectedRequest.details.description}</RowValue>
              <RowLabel>Requested Date</RowLabel>  <RowValue>{selectedRequest.details.requestedDate}</RowValue>
              <RowLabel>Requested Time</RowLabel>  <RowValue>{selectedRequest.details.timeRange}</RowValue>
              <RowLabel>Location</RowLabel>        <RowValue>{selectedRequest.details.venue}</RowValue>
              <RowLabel>Services Needed</RowLabel>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {selectedRequest.details.coverageComponents.map((c, idx) => (
                  <Chip key={idx} label={`${c.name} (${c.pax})`} size="small" sx={{ borderRadius: 2 }} />
                ))}
              </Stack>
              <RowLabel>Client</RowLabel>          <RowValue>{selectedRequest.details.client}</RowValue>
              <RowLabel>Contact Person</RowLabel>  <RowValue>{selectedRequest.details.contactPerson}</RowValue>
              <RowLabel>Contact Info</RowLabel>    <RowValue>{selectedRequest.details.contactInfo}</RowValue>
              <RowLabel>File Attachment</RowLabel>
              {selectedRequest.details.filePath ? (
                <Typography sx={{ fontSize: "0.88rem", color: "#1976d2", cursor: "pointer", textDecoration: "underline", wordBreak: "break-word", "&:hover": { color: "#1565c0" } }}
                  onClick={() => openFile(selectedRequest.details.filePath)}>
                  {getFileName(selectedRequest.details.filePath)}
                </Typography>
              ) : (
                <RowValue>No file attached</RowValue>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

function RowLabel({ children }) {
  return <Typography sx={{ fontSize: "0.82rem", color: "text.secondary", fontWeight: 500, pt: 0.3 }}>{children}</Typography>;
}
function RowValue({ children }) {
  return <Typography sx={{ fontSize: "0.88rem", color: "text.primary" }}>{children || "—"}</Typography>;
}