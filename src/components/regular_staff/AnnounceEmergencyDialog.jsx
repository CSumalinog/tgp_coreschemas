// src/components/regular_staff/AnnounceEmergencyDialog.jsx
// Dialog for staff to announce an emergency/unavailability in advance

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  Button,
  TextField,
  Typography,
  Box,
  Divider,
} from "@mui/material";

/**
 * Props:
 * - open: boolean
 * - onClose: function
 * - onAnnounce: function(reason: string)
 */
function AnnounceEmergencyDialog({ open, onClose, onAnnounce }) {
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
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={false}
      fullWidth
      slotProps={{
        paper: {
          sx: {
            width: 450,
            maxWidth: '100%',
            borderRadius: 3,
            background: '#fff',
            p: 0,
          },
        },
      }}
    >
      <Box sx={{ p: 3, pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#f5c52b22',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              color: '#b45309',
            }}
          >
            ⚡
          </Box>
          <Typography sx={{ fontWeight: 700, fontSize: '1.18rem', color: '#222' }}>
            Announce Emergency / Unavailability
          </Typography>
        </Box>
        <Typography sx={{ color: '#444', fontSize: '0.98rem', mb: 2 }}>
          Let your section head know in advance if you can't make it to your assignment. Please provide a reason below.
        </Typography>
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ fontWeight: 600, fontSize: '0.92rem', mb: 0.5, color: '#222' }}>
            Reason <span style={{ color: '#dc2626' }}>*</span>
          </Typography>
          <TextField
            placeholder="e.g. I have a medical appointment on this date."
            value={reason}
            onChange={e => setReason(e.target.value)}
            fullWidth
            multiline
            minRows={2}
            error={!!error}
            helperText={error}
            autoFocus
            sx={{
              background: '#fafafa',
              borderRadius: 2,
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
              },
            }}
          />
        </Box>
      </Box>
      <Divider />
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1.5, px: 3, py: 2, background: '#fff', borderRadius: '0 0 24px 24px' }}>
        <Button onClick={handleClose} sx={{ borderRadius: 2, fontWeight: 600, color: '#444', background: '#f3f3f3', boxShadow: 'none', px: 2.5 }}>
          Cancel
        </Button>
        <Button
          onClick={handleAnnounce}
          variant="contained"
          sx={{
            borderRadius: 2,
            fontWeight: 700,
            background: '#222',
            color: '#fff',
            boxShadow: 'none',
            px: 2.5,
            '&:hover': { background: '#111' },
          }}
        >
          Submit request
        </Button>
      </Box>
    </Dialog>
  );
}

export default AnnounceEmergencyDialog;
