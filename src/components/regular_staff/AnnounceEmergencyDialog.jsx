// src/components/regular_staff/AnnounceEmergencyDialog.jsx
// Dialog for staff to announce an emergency/unavailability in advance

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
} from "@mui/material";

/**
 * Props:
 * - open: boolean
 * - onClose: function
 * - onAnnounce: function(reason: string)
 */
export default function AnnounceEmergencyDialog({ open, onClose, onAnnounce }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleAnnounce = () => {
    if (!reason.trim()) {
      setError("Please provide a reason for your unavailability.");
      return;
    }
    setError("");
    onAnnounce(reason.trim());
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    setError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Announce Emergency / Unavailability</DialogTitle>
      <DialogContent>
        <Typography gutterBottom>
          Please provide a reason for your unavailability. This will notify your section head to reassign coverage in advance.
        </Typography>
        <TextField
          label="Reason"
          value={reason}
          onChange={e => setReason(e.target.value)}
          fullWidth
          multiline
          minRows={2}
          error={!!error}
          helperText={error}
          autoFocus
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} color="secondary">Cancel</Button>
        <Button onClick={handleAnnounce} variant="contained" color="primary">Announce</Button>
      </DialogActions>
    </Dialog>
  );
}
