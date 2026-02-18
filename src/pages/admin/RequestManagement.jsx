// src/pages/admin/RequestManagement.jsx
import React, { useState } from "react";
import { Box, Button, Typography } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";

// ✅ Component
import RequestDetails from "../../components/admin/RequestDetails";

// ------------------ MOCK DATA (Pending only) ------------------
const mockPendingRequests = [
  {
    id: 1,
    requestTitle: "Student Council Presscon Coverage",
    client: "USC - Executive Council",
    dateReceived: "2026-02-16",
    status: "Pending",
    details: {
      description:
        "Requesting coverage for the student council press conference. Focus on key announcements and photo documentation.",
      venue: "Main Auditorium",
      requestedDate: "2026-02-17",
      timeRange: "9:00 AM - 11:00 AM",
      coverageComponents: [
        { name: "News", pax: 2 },
        { name: "Photo", pax: 3 },
        { name: "Video", pax: 2 },
      ],
      contactPerson: "Jane Doe",
      contactInfo: "jane.doe@example.com / 0917-123-4567",
      file: "Presscon_Flow.pdf",
    },
  },
  {
    id: 2,
    requestTitle: "Campus Sports Fest Opening",
    client: "CSU Athletics Office",
    dateReceived: "2026-02-16",
    status: "Pending",
    details: {
      description:
        "Coverage for the opening ceremony of Sports Fest. Need photo + video highlights.",
      venue: "University Gym",
      requestedDate: "2026-02-18",
      timeRange: "1:00 PM - 3:00 PM",
      coverageComponents: [
        { name: "Photo", pax: 2 },
        { name: "Video", pax: 2 },
      ],
      contactPerson: "John Smith",
      contactInfo: "john.smith@example.com / 0917-987-6543",
      file: "SportsFest_Flow.pdf",
    },
  },
];

export default function RequestManagement() {
  const [selectedRequest, setSelectedRequest] = useState(null);

  const handleView = (row) => {
    setSelectedRequest(row);
  };

  const handleClose = () => {
    setSelectedRequest(null);
  };

  const columns = [
    { field: "requestTitle", headerName: "Request Title", flex: 1.4 },
    { field: "client", headerName: "Client", flex: 1.2 },
    { field: "dateReceived", headerName: "Date Received", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => {
        const value = params.value;
        let color = "#757575";
        if (value === "Pending") color = "#fbc02d";

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
                fontWeight: 400,
                color,
                textTransform: "uppercase",
                fontSize: "0.9rem",
              }}
            >
              {value}
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
          sx={{ textTransform: "none" }}
        >
          View
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
      {/* --------- PAGE TITLE + INSTRUCTIONS --------- */}
      <Box sx={{ mb: 2 }}>
        <Typography
          sx={{
            mt: 0.1,
            fontSize: "0.8rem",
            color: "#757575",
            maxWidth: 900,
            lineHeight: 1.5,
          }}
        >
          Review newly submitted coverage requests.
        </Typography>
      </Box>

      {/* --------- TABLE CARD --------- */}
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
          rows={mockPendingRequests}
          columns={columns}
          pageSize={7}
          rowsPerPageOptions={[7]}
          disableSelectionOnClick
          sx={{
            border: "none",
            fontFamily: "'Helvetica Neue', sans-serif",
            fontSize: "0.9rem",
            "& .MuiDataGrid-cell": {
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: "0.9rem",
            },
            "& .MuiDataGrid-columnHeaders": {
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: "0.9rem",
            },
          }}
        />
      </Box>

      {/* ✅ REQUEST DETAILS COMPONENT */}
      <RequestDetails
        open={!!selectedRequest}
        onClose={handleClose}
        request={selectedRequest}
      />
    </Box>
  );
}
