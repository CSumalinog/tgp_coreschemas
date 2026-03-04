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
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { DataGrid } from "@mui/x-data-grid";
import { useClientRequests } from "../../hooks/useClientRequests";
import { supabase } from "../../lib/supabaseClient";

// "program_flows/uuid/1234567_MyFile.pdf" → "MyFile.pdf"
const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};

const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage
    .from("coverage-files")
    .getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

export default function Request() {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const { pending, loading } = useClientRequests();

  const handleView = (row) => setSelectedRequest(row);
  const handleClose = () => setSelectedRequest(null);

  const rows = pending.map((req) => ({
    id: req.id,
    eventTitle: req.title,
    submissionDate: req.submitted_at
      ? new Date(req.submitted_at).toLocaleDateString()
      : "—",
    status: req.status,
    details: {
      description: req.description,
      requestedDate: req.event_date,
      timeRange: `${req.from_time} - ${req.to_time}`,
      venue: req.venue,
      coverageComponents: req.services
        ? Object.entries(req.services)
            .filter(([_, pax]) => pax > 0)
            .map(([name, pax]) => ({ name, pax }))
        : [],
      client: req.entity?.name || "—",
      contactPerson: req.contact_person,
      contactInfo: req.contact_info,
      filePath: req.file_url || null,
    },
  }));

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
          }}
        >
          <Typography
            sx={{
              fontWeight: 500,
              color: "#1976d2",
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
      <Box
        sx={{
          height: 500,
          width: "100%",
          bgcolor: "white",
          borderRadius: 2,
          boxShadow: 1,
        }}
      >
        {loading ? (
          <Box
            sx={{
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
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

      <Dialog
        open={!!selectedRequest}
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
        <IconButton
          onClick={handleClose}
          sx={{ position: "absolute", right: 8, top: 8, color: "#757575" }}
        >
          <CloseIcon />
        </IconButton>

        <DialogTitle
          sx={{ fontWeight: "bold", textAlign: "center", fontSize: "0.9rem" }}
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
              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Request Title:
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
                    sx={{ borderRadius: 2 }}
                  />
                ))}
              </Stack>

              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                Client:
              </Typography>
              <Typography variant="body2">
                {selectedRequest.details.client}
              </Typography>

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

              {/* ✅ Clean filename + clickable */}
              <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>
                File Attachment:
              </Typography>
              {selectedRequest.details.filePath ? (
                <Typography
                  variant="body2"
                  onClick={() => openFile(selectedRequest.details.filePath)}
                  sx={{
                    color: "#1976d2",
                    cursor: "pointer",
                    textDecoration: "underline",
                    wordBreak: "break-word",
                    "&:hover": { color: "#1565c0" },
                  }}
                >
                  {getFileName(selectedRequest.details.filePath)}
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ color: "#9e9e9e" }}>
                  No file attached
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
