// src/pages/client/ReceiptTable.jsx
import React, { useState, useRef } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  Divider,
  Tooltip,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import DownloadIcon from "@mui/icons-material/Download";
import { DataGrid } from "@mui/x-data-grid";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Sample data
const mockRequests = [
  {
    id: 1,
    eventTitle: "Campus Orientation",
    submissionDate: "2026-02-12",
    status: "Approved",
    details: {
      location: "Main Hall",
      attendees: 50,
      notes: "Bring cameras and microphone",
      requestedDate: "2026-02-12",
      timeRange: "8:00 AM - 12:00 PM",
      coverageComponents: [
        { name: "News Writer", pax: 2 },
        { name: "Photojourn", pax: 2 },
      ],
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
      requestedDate: "2026-02-12",
      timeRange: "10:00 AM - 2:00 PM",
      coverageComponents: [
        { name: "Photo", pax: 2 },
        { name: "Video", pax: 1 },
      ],
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
      requestedDate: "2026-02-15",
      timeRange: "6:00 PM - 9:00 PM",
      coverageComponents: [
        { name: "Photo", pax: 3 },
        { name: "Video", pax: 2 },
        { name: "News", pax: 1 },
      ],
    },
  },
];

export default function ApprovedRequest() {
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const contentRef = useRef(); // ref for PDF

  const approvedRequests = mockRequests.filter(
    (req) => req.status === "Approved",
  );

  const handleView = (row) => setSelectedReceipt(row);
  const handleClose = () => setSelectedReceipt(null);

  const handleDownload = () => {
    if (!contentRef.current) return;

    html2canvas(contentRef.current, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${selectedReceipt.eventTitle}_receipt.pdf`);
    });
  };

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
              color: "#388e3c",
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
          View Receipt
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
          rows={approvedRequests}
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

      <Dialog
        open={!!selectedReceipt}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            fontFamily: "'Helvetica Neue', sans-serif",
            position: "relative",
            borderRadius: 4,
            width: 500, // fixed width in px
            height: 400, // fixed height in px
          },
        }}
      >
        <IconButton
          aria-label="close"
          onClick={handleClose}
          sx={{
            position: "absolute",
            right: 8,
            top: 8,
            color: "#757575",
            zIndex: 10,
          }}
        >
          <CloseIcon />
        </IconButton>

        <DialogTitle
          sx={{
            textAlign: "center",
            fontWeight: "bold",
            fontSize: "1.5rem",
            pb: 2,
          }}
        >
          COVERAGE REQUEST RECEIPT
          <Typography
            sx={{
              fontWeight: 400,
              fontSize: "0.8rem",
              mt: 0.5,
              color: "#616161",
            }}
          >
            Date Issued: 2026-02-17 | Receipt ID: REC-2026-02-17-002
          </Typography>
        </DialogTitle>

        <DialogContent
          sx={{
            position: "relative",
            py: 0,
            display: "flex",
            flexDirection: "column",
            gap: 1,
            justifyContent: "center", // vertical center
            alignItems: "center", // horizontal center
          }}
        >
          {selectedReceipt && (
            <Box
              ref={contentRef}
              sx={{
                position: "relative",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* APPROVED STAMP */}
              <Typography
                sx={{
                  position: "absolute",
                  top: "40%",
                  left: "50%",
                  transform: "translate(-50%, -40%) rotate(-30deg)",
                  fontSize: "3.5rem",
                  fontWeight: 800,
                  color: "#2e7d32",
                  opacity: 0.2,
                  letterSpacing: 1,
                  pointerEvents: "none",
                  userSelect: "none",
                  whiteSpace: "nowrap",
                }}
              >
                APPROVED
              </Typography>

              {/* 2-column layout */}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 2.8fr",
                  columnGap: 2,
                  rowGap: 0.5,
                  alignItems: "start",
                }}
              >
                <Typography sx={{ fontSize: "0.85rem", color: "#9e9e9e" }}>
                  Event Title:
                </Typography>
                <Typography sx={{ fontSize: "0.85rem", fontWeight: 600 }}>
                  {selectedReceipt.eventTitle}
                </Typography>

                <Typography sx={{ fontSize: "0.85rem", color: "#9e9e9e" }}>
                  Date & Time:
                </Typography>
                <Typography sx={{ fontSize: "0.85rem" }}>
                  {selectedReceipt.details.requestedDate} •{" "}
                  {selectedReceipt.details.timeRange}
                </Typography>

                <Typography sx={{ fontSize: "0.85rem", color: "#9e9e9e" }}>
                  Venue:
                </Typography>
                <Typography sx={{ fontSize: "0.85rem" }}>
                  {selectedReceipt.details.location}
                </Typography>

                <Typography sx={{ fontSize: "0.85rem", color: "#9e9e9e" }}>
                  Assigned Staff:
                </Typography>

                {/* Assigned Staff 3-column */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 2fr",
                    gap: 0,
                    mt: 0.5,
                  }}
                >
                  {selectedReceipt.details.coverageComponents.map((c, idx) =>
                    Array.from({ length: c.pax }, (_, i) => (
                      <React.Fragment key={`${idx}-${i}`}>
                        <Typography
                          sx={{ fontSize: "0.85rem", fontWeight: 500 }}
                        >
                          {c.name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.85rem" }}>
                          John Doe{i + 1}
                        </Typography>
                        <Typography
                          sx={{ fontSize: "0.85rem", color: "#616161" }}
                        >
                          fb.com/johndoe{i + 1}
                        </Typography>
                      </React.Fragment>
                    )),
                  )}
                </Box>
              </Box>

              {/* Notes + Download icon */}
              <Divider sx={{ my: 1 }} />
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "1fr 2.5fr .5fr",
                  columnGap: 1,
                  rowGap: 0.5,
                  alignItems: "start",
                  width: "100%",
                  mt: 0,
                }}
              >
                <Typography sx={{ fontSize: "0.7rem", color: "#9e9e9e" }}>
                  Notes:
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0 }}>
                  <Typography sx={{ fontSize: "0.7rem", color: "#9e9e9e" }}>
                    This request has been approved by the Admin.
                  </Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "#9e9e9e" }}>
                    Any changes must be coordinated with the coverage team.
                  </Typography>
                  <Typography sx={{ fontSize: "0.7rem", color: "#9e9e9e" }}>
                    Keep this receipt for reference.
                  </Typography>
                </Box>
                <Tooltip title="Download Receipt" arrow>
                  <IconButton
                    onClick={handleDownload}
                    sx={{ color: "#2e7d32" }}
                    size="small"
                  >
                    <DownloadIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
