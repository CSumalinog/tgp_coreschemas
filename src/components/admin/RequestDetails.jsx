// src/components/admin/RequestDetails.jsx
import React from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Chip,
  Stack,
} from "@mui/material";

export default function RequestDetails({ open, onClose, request }) {
  if (!request) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          fontFamily: "'Helvetica Neue', sans-serif", // enforce theme font
        },
      }}
    >
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
        sx={{ "& *": { fontSize: "0.9rem", fontFamily: "'Helvetica Neue', sans-serif" } }}
      >
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 2fr",
            gap: 1.5,
            alignItems: "start",
          }}
        >
          {/* Request Title */}
          <Typography variant="subtitle2" sx={{ color: "#9e9e9e" }}>Request Title:</Typography>
          <Typography variant="body2">{request.requestTitle}</Typography>

          {/* Description */}
          <Typography variant="subtitle2"sx={{ color: "#9e9e9e" }}>Description:</Typography>
          <Typography variant="body2">{request.details.description}</Typography>

          {/* Requested Date & Time */}
          <Typography variant="subtitle2"sx={{ color: "#9e9e9e" }}>Requested Date:</Typography>
          <Typography variant="body2">{request.details.requestedDate}</Typography>

          <Typography variant="subtitle2"sx={{ color: "#9e9e9e" }}>Requested Time:</Typography>
          <Typography variant="body2">{request.details.timeRange}</Typography>

          {/* Client */}
          <Typography variant="subtitle2"sx={{ color: "#9e9e9e" }}>Client:</Typography>
          <Typography variant="body2">{request.client}</Typography>

          {/* Location / Venue */}
          <Typography variant="subtitle2"sx={{ color: "#9e9e9e" }}>Location:</Typography>
          <Typography variant="body2">{request.details.venue}</Typography>

          {/* Coverage Components / Services */}
          <Typography variant="subtitle2"sx={{ color: "#9e9e9e" }}>Services Needed:</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap" }}>
            {request.details.coverageComponents.map((c, idx) => (
              <Chip
                key={idx}
                label={`${c.name} (${c.pax})`}
                size="small"
                sx={{ borderRadius: 2, fontFamily: "'Helvetica Neue', sans-serif" }}
              />
            ))}
          </Stack>

          {/* Contact Person & Info */}
          <Typography variant="subtitle2"sx={{ color: "#9e9e9e" }}>Contact Person:</Typography>
          <Typography variant="body2">{request.details.contactPerson}</Typography>

          <Typography variant="subtitle2"sx={{ color: "#9e9e9e" }}>Contact Info:</Typography>
          <Typography variant="body2">{request.details.contactInfo}</Typography>

          {/* File Attachment */}
          <Typography variant="subtitle2"sx={{ color: "#9e9e9e" }}>File Attachment:</Typography>
          <Typography variant="body2">{request.details.file}</Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
