// src/pages/client/HistoryTable.jsx
import React, { useState } from "react";
import {
  Box, Button, Dialog, DialogTitle, DialogContent,
  Typography, useTheme,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

const mockRequests = [
  { id: 1, eventTitle: "Campus Orientation", submissionDate: "2026-02-12", status: "Draft",    details: { location: "Main Hall",     attendees: 50,  notes: "Bring cameras and microphone" } },
  { id: 2, eventTitle: "Club Fair",          submissionDate: "2026-02-10", status: "Pending",  details: { location: "Quadrangle",    attendees: 200, notes: "Setup booths and coverage team" } },
  { id: 3, eventTitle: "Awards Night",       submissionDate: "2026-02-08", status: "Approved", details: { location: "Auditorium",    attendees: 100, notes: "Assigned staff: 3" } },
  { id: 4, eventTitle: "Annual Sports Meet", submissionDate: "2026-01-30", status: "Declined", details: { location: "Sports Complex", attendees: 150, notes: "Insufficient staff available" } },
];

const STATUS_COLORS = { Draft: "#fbc02d", Pending: "#1976d2", Approved: "#388e3c", Declined: "#d32f2f" };

export default function History() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [selectedRequest, setSelectedRequest] = useState(null);

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
    { field: "eventTitle",     headerName: "Event Title",     flex: 1 },
    { field: "submissionDate", headerName: "Submission Date", flex: 1 },
    {
      field: "status", headerName: "Status", flex: 1,
      renderCell: (params) => (
        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "flex-start" }}>
          <Typography sx={{ fontWeight: 500, color: STATUS_COLORS[params.value] || "text.secondary", textTransform: "uppercase", fontSize: "0.9rem" }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions", headerName: "Actions", flex: 1, sortable: false,
      renderCell: (params) => (
        <Button variant="outlined" size="small" onClick={() => setSelectedRequest(params.row)}>View</Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default" }}>
      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        <DataGrid rows={mockRequests} columns={columns} pageSize={5} rowsPerPageOptions={[5]} disableSelectionOnClick sx={dataGridSx} />
      </Box>

      <Dialog open={!!selectedRequest} onClose={() => setSelectedRequest(null)} maxWidth="sm" fullWidth
        PaperProps={{ sx: { fontFamily: "'Helvetica Neue', sans-serif", borderRadius: 4, backgroundColor: "background.paper" } }}>
        <DialogTitle sx={{ color: "text.primary" }}>Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 1 }}>
              {[
                ["Event Name",       selectedRequest.eventTitle],
                ["Submission Date",  selectedRequest.submissionDate],
                ["Status",           selectedRequest.status],
                ["Location",         selectedRequest.details.location],
                ["Attendees",        selectedRequest.details.attendees],
                ["Notes",            selectedRequest.details.notes],
              ].map(([label, value]) => (
                <Box key={label}>
                  <Typography variant="subtitle2" sx={{ mt: 1, color: "text.secondary" }}>{label}:</Typography>
                  <Typography variant="body1" color="text.primary">{value}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}