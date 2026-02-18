// src/pages/client/HistoryTable.jsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

// Sample requests including all statuses
const mockRequests = [
  {
    id: 1,
    eventTitle: "Campus Orientation",
    submissionDate: "2026-02-12",
    status: "Draft",
    details: {
      location: "Main Hall",
      attendees: 50,
      notes: "Bring cameras and microphone",
    },
  },
  {
    id: 2,
    eventTitle: "Club Fair",
    submissionDate: "2026-02-10",
    status: "Pending",
    details: {
      location: "Quadrangle",
      attendees: 200,
      notes: "Setup booths and coverage team",
    },
  },
  {
    id: 3,
    eventTitle: "Awards Night",
    submissionDate: "2026-02-08",
    status: "Approved",
    details: {
      location: "Auditorium",
      attendees: 100,
      notes: "Assigned staff: 3",
    },
  },
  {
    id: 4,
    eventTitle: "Annual Sports Meet",
    submissionDate: "2026-01-30",
    status: "Declined",
    details: {
      location: "Sports Complex",
      attendees: 150,
      notes: "Insufficient staff available",
    },
  },
];

export default function History() {
  const [selectedRequest, setSelectedRequest] = useState(null);

  const handleView = (row) => setSelectedRequest(row);
  const handleClose = () => setSelectedRequest(null);

  const columns = [
    { field: "eventTitle", headerName: "Event Title", flex: 1 },
    { field: "submissionDate", headerName: "Submission Date", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => {
        let color = "#757575";
        if (params.value === "Draft") color = "#fbc02d";
        else if (params.value === "Pending") color = "#1976d2";
        else if (params.value === "Approved") color = "#388e3c";
        else if (params.value === "Declined") color = "#d32f2f";

        return (
          <Box
            sx={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
            }}
          >
            <Typography
              sx={{
                fontWeight: 500,
                color,
                textTransform: "uppercase",
                fontSize: "0.9rem",
              }}
            >
              {params.value}
            </Typography>
          </Box>
        );
      },
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
          View
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "#f9f9f9" }}>
      <Box sx={{ height: 500, width: "100%", bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
        <DataGrid
          rows={mockRequests}
          columns={columns}
          pageSize={5}
          rowsPerPageOptions={[5]}
          disableSelectionOnClick
          sx={{
            "& .MuiDataGrid-cell": { outline: "none" },
            "& .MuiDataGrid-columnHeaders": { backgroundColor: "#f5f5f5" },
          }}
        />
      </Box>

      {/* ---------- VIEW DIALOG ---------- */}
      <Dialog
        open={!!selectedRequest}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
         PaperProps={{ sx: { fontFamily: "'Helvetica Neue', sans-serif", borderRadius:4  } }}
      >
        <DialogTitle>Request Details</DialogTitle>
        <DialogContent>
          {selectedRequest && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Event Name:
              </Typography>
              <Typography variant="body1">{selectedRequest.eventName}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Submission Date:
              </Typography>
              <Typography variant="body1">{selectedRequest.submissionDate}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Status:
              </Typography>
              <Typography variant="body1">{selectedRequest.status}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Location:
              </Typography>
              <Typography variant="body1">{selectedRequest.details.location}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Attendees:
              </Typography>
              <Typography variant="body1">{selectedRequest.details.attendees}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Notes:
              </Typography>
              <Typography variant="body1">{selectedRequest.details.notes}</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
