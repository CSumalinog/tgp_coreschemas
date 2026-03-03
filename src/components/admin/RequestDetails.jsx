// src/components/admin/RequestDetails.jsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Stack,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  TextField,
} from "@mui/material";

export default function RequestDetails({
  open = false,
  onClose = () => {},
  request = null,
  onForward = () => {},
  onReturn = () => {},
  onDecline = () => {},
}) {
  // ----------------------------
  // STATES
  // ----------------------------

  const [adminNotes, setAdminNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const [beneficial, setBeneficial] = useState(false);
  const [enoughPrepTime, setEnoughPrepTime] = useState(false);
  const [scopeRealistic, setScopeRealistic] = useState(false);

  const [declineMode, setDeclineMode] = useState(false);

  const details = request?.details || {};
  const components = details?.coverageComponents || [];

  useEffect(() => {
    setBeneficial(false);
    setEnoughPrepTime(false);
    setScopeRealistic(false);
    setAdminNotes("");
    setDeclineMode(false);
  }, [request]);

  const criteriaMet = beneficial && enoughPrepTime && scopeRealistic;

  // ----------------------------
  // HANDLERS
  // ----------------------------

  const handleForward = async () => {
    if (!criteriaMet) return;

    setLoading(true);

    await onForward?.(request, {
      adminNotes,
      checklist: {
        beneficial,
        enoughPrepTime,
        scopeRealistic,
      },
    });

    setLoading(false);
    onClose();
  };

  const handleDecline = async () => {
    setLoading(true);

    await onDecline?.(request, {
      adminNotes,
      checklist: {
        beneficial,
        enoughPrepTime,
        scopeRealistic,
      },
    });

    setLoading(false);
    onClose();
  };

  // ----------------------------
  // RENDER
  // ----------------------------

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      PaperProps={{
        sx: {
          fontFamily: "'Helvetica Neue', sans-serif",
          borderRadius: 3,
          width: 600,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          textAlign: "center",
          fontSize: "1rem",
          letterSpacing: 0.5,
        }}
      >
        Request Review
      </DialogTitle>

      <DialogContent dividers sx={{ px: 4, py: 3 }}>
        {!request ? (
          <Typography variant="body2">
            No request selected.
          </Typography>
        ) : (
          <>
            {/* REQUEST INFORMATION CARD */}
            <Box
              sx={{
                backgroundColor: "#fafafa",
                borderRadius: 3,
                p: 3,
                mb: 4,
                border: "1px solid #eee",
              }}
            >
              <Typography fontWeight={550} mb={2}>
                Request Information
              </Typography>

              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns: "150px 1fr",
                  rowGap: 1,
                  columnGap: 2,
                }}
              >
                {/* TITLE */}
                <Typography variant="caption" color="text.secondary">
                  Request Title
                </Typography>
                <Typography variant="body2">
                  {request.requestTitle || "—"}
                </Typography>

                {/* DESCRIPTION */}
                <Typography variant="caption" color="text.secondary">
                  Description
                </Typography>
                <Typography variant="body2">
                  {details.description || "—"}
                </Typography>

                {/* DATE */}
                <Typography variant="caption" color="text.secondary">
                  Requested Date
                </Typography>
                <Typography variant="body2">
                  {details.requestedDate || "—"}
                </Typography>

                {/* TIME */}
                <Typography variant="caption" color="text.secondary">
                  Requested Time
                </Typography>
                <Typography variant="body2">
                  {details.timeRange || "—"}
                </Typography>

                {/* SERVICES */}
                <Typography variant="caption" color="text.secondary">
                  Services Needed
                </Typography>

                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {components.length === 0 ? (
                    <Typography variant="caption" color="text.secondary">
                      No services specified.
                    </Typography>
                  ) : (
                    components.map((c, idx) => (
                      <Typography key={idx} variant="body2">
                        {c?.name || "Service"} ({c?.pax || 0})
                      </Typography>
                    ))
                  )}
                </Stack>

                {/* VENUE */}
                <Typography variant="caption" color="text.secondary">
                  Venue
                </Typography>
                <Typography variant="body2">
                  {details.venue || "—"}
                </Typography>

                {/* CLIENT */}
                <Typography variant="caption" color="text.secondary">
                  Client
                </Typography>
                <Typography variant="body2">
                  {request.client || "—"}
                </Typography>

                {/* CONTACT PERSON */}
                <Typography variant="caption" color="text.secondary">
                  Contact Person
                </Typography>
                <Typography variant="body2">
                  {details.contactPerson || "—"}
                </Typography>

                {/* CONTACT INFO */}
                <Typography variant="caption" color="text.secondary">
                  Contact Info
                </Typography>
                <Typography variant="body2">
                  {details.contactInfo || "—"}
                </Typography>

                {/* FILE */}
                <Typography variant="caption" color="text.secondary">
                  File Attachment
                </Typography>
                <Typography variant="body2">
                  {details.file || "No attachment"}
                </Typography>
              </Box>
            </Box>

            {/* STRATEGIC VALIDATION */}
            <Box
              sx={{
                backgroundColor: "#fffdf5",
                borderRadius: 3,
                p: 3,
                mb: 3,
                border: "1px solid #f5e6a0",
              }}
            >
              <Typography fontWeight={550} mb={1}>
                Request Approval Criteria
              </Typography>

              <Typography variant="caption" color="text.secondary" mb={2}>
                All conditions must be satisfied before forwarding.
              </Typography>

              <Stack>
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={beneficial}
                      onChange={(e) => setBeneficial(e.target.checked)}
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Event provides measurable value to the student body
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={enoughPrepTime}
                      onChange={(e) =>
                        setEnoughPrepTime(e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      Submitted at least 2-3 days before the event date
                    </Typography>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={scopeRealistic}
                      onChange={(e) =>
                        setScopeRealistic(e.target.checked)
                      }
                    />
                  }
                  label={
                    <Typography variant="body2">
                      No schedule conflict within requested date and time
                    </Typography>
                  }
                />
              </Stack>

              <Box mt={2}>
                <Typography
                  variant="caption"
                  color={criteriaMet ? "success.main" : "error.main"}
                >
                  {criteriaMet
                    ? "✓ All validation criteria satisfied."
                    : "⚠ Forwarding disabled until all conditions are met."}
                </Typography>
              </Box>
            </Box>

            {/* DECLINE DANGER ZONE */}
            {!criteriaMet && (
              <Box
                sx={{
                  borderRadius: 3,
                  p: 3,
                  mb: 3,
                  border: "1px solid #f3bcbc",
                }}
              >
                {!declineMode ? (
                  <Button
                    variant="outlined"
                    color="error"
                    fullWidth
                    onClick={() => setDeclineMode(true)}
                  >
                    Criteria are not met — Decline Request
                  </Button>
                ) : (
                  <>
                    <TextField
                      fullWidth
                      multiline
                      minRows={4}
                      label="Decline Justification"
                      value={adminNotes}
                      onChange={(e) =>
                        setAdminNotes(e.target.value)
                      }
                    />

                    <Box mt={2}>
                      <Button
                        variant="contained"
                        color="error"
                        fullWidth
                        onClick={handleDecline}
                        disabled={
                          adminNotes.trim().length === 0 || loading
                        }
                      >
                        Confirm Decline Request
                      </Button>
                    </Box>
                  </>
                )}
              </Box>
            )}
          </>
        )}
      </DialogContent>

      {/* ACTIONS */}
      <DialogActions
        sx={{
          px: 4,
          py: 2,
          justifyContent: "space-between",
        }}
      >
        <Button
          variant="contained"
          onClick={handleForward}
          disabled={!criteriaMet || loading}
          sx={{
            px: 4,
            fontWeight: 500,
            backgroundColor: "#f5c52b",
            color: "#212121",
            width: "100%",
          }}
        >
          Forward for Assignment
        </Button>
      </DialogActions>
    </Dialog>
  );
}