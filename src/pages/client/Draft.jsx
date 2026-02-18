// src/pages/client/DraftTable.jsx
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

// Sample data including Drafts
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
    status: "Draft",
    details: {
      location: "Auditorium",
      attendees: 100,
      notes: "Assigned staff: 3",
    },
  },
];

export default function Draft() {
  const [selectedDraft, setSelectedDraft] = useState(null);

  // Only keep drafts
  const draftRequests = mockRequests.filter((req) => req.status === "Draft");

  const handleView = (row) => setSelectedDraft(row);
  const handleClose = () => setSelectedDraft(null);

  const columns = [
    { field: "eventTitle", headerName: "Event Title", flex: 1 },
    { field: "submissionDate", headerName: "Submission Date", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => (
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
              color: "#fbc02d", // Draft color
              textTransform: "uppercase",
              fontSize: "0.9rem",
            }}
          >
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
          View
        </Button>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "#f9f9f9" }}>
      <Box sx={{ height: 500, width: "100%", bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
        <DataGrid
          rows={draftRequests}
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
        open={!!selectedDraft}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
         PaperProps={{ sx: { fontFamily: "'Helvetica Neue', sans-serif", borderRadius:4  } }}
      >
        <DialogTitle>Draft Details</DialogTitle>
        <DialogContent>
          {selectedDraft && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Event Name:
              </Typography>
              <Typography variant="body1">{selectedDraft.eventName}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Submission Date:
              </Typography>
              <Typography variant="body1">{selectedDraft.submissionDate}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Status:
              </Typography>
              <Typography variant="body1">{selectedDraft.status}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Location:
              </Typography>
              <Typography variant="body1">{selectedDraft.details.location}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Attendees:
              </Typography>
              <Typography variant="body1">{selectedDraft.details.attendees}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Notes:
              </Typography>
              <Typography variant="body1">{selectedDraft.details.notes}</Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
