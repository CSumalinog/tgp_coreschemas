// src/pages/client/DeclinedRequest.jsx
import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Chip,
  Stack,
  IconButton,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CloseIcon from "@mui/icons-material/Close";

// Sample data (replace with real API data)
const mockRequests = [
  {
    id: 1,
    eventTitle: "Campus Orientation",
    submissionDate: "2026-02-12",
    status: "Declined",
    client: "Student Org A",
    details: {
      description: "Setup cameras and microphones",
      requestedDate: "2026-02-15",
      timeRange: "09:00 - 12:00",
      venue: "Main Hall",
      coverageComponents: [
        { name: "News Writer", pax: 2 },
        { name: "Photjourn", pax: 1 },
      ],
      contactPerson: "John Doe",
      contactInfo: "09123456789",
      file: "orientation_plan.pdf",
      reason: "Insufficient staff available for the requested time",
    },
  },
  {
    id: 2,
    eventTitle: "Club Fair",
    submissionDate: "2026-02-10",
    status: "Declined",
    client: "Club B",
    details: {
      description: "Booth setup and coverage team",
      requestedDate: "2026-02-16",
      timeRange: "10:00 - 15:00",
      venue: "Quadrangle",
      coverageComponents: [
        { name: "Photjourn", pax: 2 },
        { name: "Videojourn", pax: 1 },
      ],
      contactPerson: "Alice Cruz",
      contactInfo: "09223334444",
      file: "clubfair_request.pdf",
      reason: "Conflicts with other approved events",
    },
  },
];

export default function DeclinedRequest() {
  const [selectedRequest, setSelectedRequest] = useState(null);

  // Only keep declined requests
  const declinedRequests = mockRequests.filter(
    (req) => req.status === "Declined",
  );

  const handleView = (row) => setSelectedRequest(row);
  const handleClose = () => setSelectedRequest(null);

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
              color: "red",
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
          View Reason
        </Button>
      ),
    },
  ];

  return (
    <Box
      sx={{
        p: 3,
        height: "100%",
        boxSizing: "border-box",
        backgroundColor: "#f9f9f9",
      }}
    >
      <Box
        sx={{
          height: 500,
          width: "100%",
          bgcolor: "white",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        <DataGrid
          rows={declinedRequests}
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

      {/* ---------- VIEW REASON DIALOG ---------- */}
      <Dialog
        open={!!selectedRequest}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
         PaperProps={{
    sx: {
      fontFamily: "'Helvetica Neue', sans-serif",
      position: "relative",
      borderRadius: 4,
      width: 500,   // fixed width in px
      height: 600,  // fixed height in px
    },
  }}
      >
        <DialogTitle
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            fontSize: "0.9rem",
            position: "relative",
          }}
        >
          Request Details
          <IconButton
            onClick={handleClose}
            sx={{ position: "absolute", right: 8, top: 8 }}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent
          dividers
          sx={{
            "& *": {
              fontSize: "0.9rem",
              fontFamily: "'Helvetica Neue', sans-serif",
            },
          }}
        >
          {selectedRequest && (
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1.2fr 2.8fr",
                gap: 0.1,
                alignItems: "center",
              }}
            >
              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Event Title:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.eventTitle}
              </Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Description:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.description}
              </Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Requested Date:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.requestedDate}
              </Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Requested Time:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.timeRange}
              </Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Client:
              </Typography>
              <Typography variant="body2">{selectedRequest.client}</Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Location:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.venue}
              </Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Services Needed:
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
                {selectedRequest.details.coverageComponents.map((c, idx) => (
                  <Chip
                    key={idx}
                    label={`${c.name} (${c.pax})`}
                    size="small"
                    sx={{
                      borderRadius: 2,
                      fontFamily: "'Helvetica Neue', sans-serif",
                    }}
                  />
                ))}
              </Stack>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Contact Person:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.contactPerson}
              </Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Contact Info:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.contactInfo}
              </Typography>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                File Attachment:
              </Typography>
              <Typography
                variant="body2"
                sx={{ borderBottom: "1px solid #e0e0e0", pb: 1}}
              >
                {selectedRequest.details.file}
              </Typography>

              {/* Highlighted Reason */}
              <Typography variant="subtitle2" sx={{ color: "red", mt: 1 }}>
                Reason:
              </Typography>
              <Box
                sx={{
                  border: "1px solid #d32f2f", // red border for highlight
                  borderRadius: 1,
                  p: 1,
                  backgroundColor: "#ffebee", // light red background
                  mt: 0.5,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ fontWeight: "sembibold", color: "#d32f2f" }}
                >
                  {selectedRequest.details.reason}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
