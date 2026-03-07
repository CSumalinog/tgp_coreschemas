// src/pages/client/DeclinedRequest.jsx
import React, { useState } from "react";
import {
  Box, Button, Dialog, DialogTitle, DialogContent,
  Typography, Chip, Stack, IconButton, CircularProgress, useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CloseIcon                   from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
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

export default function DeclinedRequest() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { requests, loading } = useClientRequests();
  const [selectedRequest, setSelectedRequest] = useState(null);

  const declined = requests.filter((r) => r.status === "Declined");
  const rows = declined.map((req) => ({
    id: req.id,
    eventTitle: req.title,
    submissionDate: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "—",
    status: req.status,
    ...req,
  }));

  const dataGridSx = {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: "0.9rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-cell":           { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-columnHeaders":  { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-footerContainer":{ backgroundColor: isDark ? "#1e1e1e" : "#fff", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-row:hover":      { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":    { color: "text.secondary" },
  };

  const columns = [
    { field: "eventTitle",     headerName: "Event Title",     flex: 1.4 },
    { field: "submissionDate", headerName: "Submission Date", flex: 1 },
    {
      field: "status", headerName: "Status", flex: 1,
      renderCell: () => (
        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 400, color: "#d32f2f", textTransform: "uppercase", fontSize: "0.9rem" }}>
            Declined
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions", headerName: "Actions", flex: 1, sortable: false,
      renderCell: (params) => (
        <Button variant="outlined" size="small" onClick={() => setSelectedRequest(params.row)}>
          VIEW REASON
        </Button>
      ),
    },
  ];

  const coverageComponents = selectedRequest?.services
    ? Object.entries(selectedRequest.services).filter(([_, pax]) => pax > 0).map(([name, pax]) => ({ name, pax }))
    : [];

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default" }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", lineHeight: 1.5 }}>
          View your declined coverage requests and the reasons provided by the admin.
        </Typography>
      </Box>

      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid rows={rows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick sx={dataGridSx} />
        )}
      </Box>

      {/* View Reason Dialog */}
      <Dialog open={!!selectedRequest} onClose={() => setSelectedRequest(null)} fullWidth
        PaperProps={{ sx: { fontFamily: "'Helvetica Neue', sans-serif", borderRadius: 3, width: 600, height: "70vh", backgroundColor: "background.paper" } }}>
        <DialogTitle sx={{ fontWeight: 650, fontSize: "0.95rem", textAlign: "center", position: "relative", color: "text.primary" }}>
          Request Details
          <IconButton onClick={() => setSelectedRequest(null)} size="small" sx={{ position: "absolute", right: 8, top: 8, color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ "& *": { fontFamily: "'Helvetica Neue', sans-serif" } }}>
          {selectedRequest && (
            <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr", rowGap: 0.5, columnGap: 2, alignItems: "start" }}>
              <RowLabel>Event Title</RowLabel>      <RowValue>{selectedRequest.title}</RowValue>
              <RowLabel>Description</RowLabel>      <RowValue>{selectedRequest.description}</RowValue>
              <RowLabel>Event Date</RowLabel>       <RowValue>{selectedRequest.event_date || "—"}</RowValue>
              <RowLabel>Time</RowLabel>
              <RowValue>{selectedRequest.from_time && selectedRequest.to_time ? `${selectedRequest.from_time} - ${selectedRequest.to_time}` : "—"}</RowValue>
              <RowLabel>Venue</RowLabel>            <RowValue>{selectedRequest.venue}</RowValue>
              <RowLabel>Services Needed</RowLabel>
              <Box>
                {coverageComponents.length > 0 ? (
                  <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
                    {coverageComponents.map((c, idx) => (
                      <Chip key={idx} label={`${c.name} (${c.pax})`} size="small" sx={{ borderRadius: 2 }} />
                    ))}
                  </Stack>
                ) : <RowValue>—</RowValue>}
              </Box>
              <RowLabel>Contact Person</RowLabel>   <RowValue>{selectedRequest.contact_person}</RowValue>
              <RowLabel>Contact Info</RowLabel>     <RowValue>{selectedRequest.contact_info}</RowValue>
              <RowLabel>File Attachment</RowLabel>
              <Box>
                {selectedRequest.file_url ? (
                  <Box onClick={() => openFile(selectedRequest.file_url)}
                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, cursor: "pointer", color: "#1976d2", "&:hover": { textDecoration: "underline" } }}>
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 16 }} />
                    <Typography sx={{ fontSize: "0.88rem" }}>{getFileName(selectedRequest.file_url)}</Typography>
                  </Box>
                ) : <RowValue>No file attached</RowValue>}
              </Box>
              {/* Decline Reason */}
              <Typography sx={{ fontSize: "0.82rem", color: "#d32f2f", fontWeight: 600, pt: 0.3 }}>Decline Reason</Typography>
              <Box sx={{ p: 1.5, bgcolor: isDark ? "#2a1a1a" : "#fdecea", borderRadius: 2 }}>
                <Typography sx={{ fontSize: "0.88rem", color: "#d32f2f" }}>
                  {selectedRequest.declined_reason || "No reason provided."}
                </Typography>
              </Box>
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