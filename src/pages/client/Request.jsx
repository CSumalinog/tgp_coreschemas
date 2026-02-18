// src/pages/client/RequestTable.jsx
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
import CloseIcon from "@mui/icons-material/Close";
import { DataGrid } from "@mui/x-data-grid";

// Sample submitted requests (Draft removed)
const mockRequests = [
  {
    id: 2,
    eventTitle: "Club Fair",
    client: "Student Org - Club Council",
    submissionDate: "2026-02-10",
    status: "Pending",
    details: {
      description: "Setup booths and coverage team for the club fair.",
      venue: "Quadrangle",
      requestedDate: "2026-02-12",
      timeRange: "10:00 AM - 2:00 PM",
      coverageComponents: [
        { name: "Photo", pax: 2 },
        { name: "Video", pax: 1 },
      ],
      client: "Alice Cruz",
      contactPerson: "Alice Cruz",
      contactInfo: "alice.cruz@example.com / 0917-555-1234",
      file: "ClubFair_Flow.pdf",
    },
  },
  {
    id: 3,
    eventTitle: "Awards Night",
    client: "University Admin Office",
    submissionDate: "2026-02-08",
    status: "Approved",
    details: {
      description: "Awarding ceremony for top students; need photo + video.",
      venue: "Auditorium",
      requestedDate: "2026-02-15",
      timeRange: "6:00 PM - 9:00 PM",
      coverageComponents: [
        { name: "Photo", pax: 3 },
        { name: "Video", pax: 2 },
        { name: "News", pax: 1 },
      ],
      client: "John Smith",
      contactPerson: "John Smith",
      contactInfo: "john.smith@example.com / 0917-987-6543",
      file: "AwardsNight_Flow.pdf",
    },
  },
];

// Filter only Pending requests
const pendingRequests = mockRequests.filter((req) => req.status === "Pending");

export default function Request() {
  const [selectedRequest, setSelectedRequest] = useState(null);

  const handleView = (row) => setSelectedRequest(row);
  const handleClose = () => setSelectedRequest(null);

  // ✅ Table columns: Event Title | Submission Date | Status | Actions
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
              color: "#fbc02d",
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
          View Details
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
      {/* DataGrid Table */}
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
          rows={pendingRequests} // only pending requests
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

      {/* Request Details Dialog (kept exactly as-is) */}
      <Dialog
        open={!!selectedRequest}
        onClose={handleClose}
        fullWidth
        PaperProps={{
          sx: {
            fontFamily: "'Helvetica Neue', sans-serif",
            position: "relative",
            borderRadius: 4,
            width: 500, // fixed width in px
            height: 600, // fixed height in px
          },
        }}
      >
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{ position: "absolute", right: 8, top: 8, color: "#757575" }}
        >
          <CloseIcon />
        </IconButton>

        <DialogTitle
          sx={{
            fontWeight: "bold",
            textAlign: "center",
            fontSize: "0.9rem",
            fontFamily: "'Helvetica Neue', sans-serif",
          }}
        >
          Request Details
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
              {/* Request Title */}
              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Request Title:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.eventTitle}
              </Typography>

              {/* Description */}
              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Description:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.description}
              </Typography>

              {/* Requested Date & Time */}
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

              {/* Location */}
              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Location:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.venue}
              </Typography>

              {/* Services Needed */}
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
                Client:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.client}
              </Typography>

              {/* Contact Person & Info */}
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

              {/* File Attachment */}
              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                File Attachment:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.file}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
