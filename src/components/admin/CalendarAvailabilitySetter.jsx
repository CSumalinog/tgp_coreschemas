import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  Chip,
  IconButton,
  Dialog as ConfirmDialog,
  DialogContentText,
} from "@mui/material";

import CloseIcon from "@mui/icons-material/Close";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

import dayjs from "dayjs";

const MODE = {
  VIEW: "view",
  EDIT: "edit",
  CREATE: "create",
};

export default function CalendarEventDialog({
  open,
  handleClose,
  handleSave,
  handleDelete,
  defaultDate,
  existingEvent,
  existingEvents = [],
  initialEventType = "single",
}) {
  const titleRef = useRef(null);

  const [mode, setMode] = useState(MODE.CREATE);
  const [eventType, setEventType] = useState("single");

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  const [start, setStart] = useState(null);
  const [end, setEnd] = useState(null);

  const [error, setError] = useState("");
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  /*
  ======================================
  Init Dialog State
  ======================================
  */
  useEffect(() => {
    if (!open) return;

    const base = defaultDate ? dayjs(defaultDate) : dayjs();

    if (existingEvent) {
      setMode(MODE.VIEW);

      setTitle(existingEvent.title || "");
      setNotes(existingEvent.notes || "");

      setEventType(existingEvent.eventType || "single");

      setStart(dayjs(existingEvent.startDate));
      setEnd(dayjs(existingEvent.endDate));
    } else {
      setMode(MODE.CREATE);

      setTitle("");
      setNotes("");

      setEventType(initialEventType);

      if (initialEventType === "single") {
        setStart(base);
        setEnd(base.add(1, "hour"));
      } else {
        setStart(base.startOf("day"));
        setEnd(base.endOf("day"));
      }
    }

    setError("");
  }, [open, existingEvent, defaultDate, initialEventType]);

  const isEditable = mode !== MODE.VIEW;

  /*
  ======================================
  Conflict Check (Simple Version)
  ======================================
  */
  const hasConflict = (newStart, newEnd) => {
    return existingEvents.some((event) => {
      if (existingEvent && event.id === existingEvent.id) return false;

      const s = dayjs(event.startDate);
      const e = dayjs(event.endDate);

      return newStart.isBefore(e) && newEnd.isAfter(s);
    });
  };

  /*
  ======================================
  Validation
  ======================================
  */
  const validate = () => {
    if (!title.trim()) {
      setError("Event title is required");
      return false;
    }

    if (!start || !end) {
      setError("Start and end are required");
      return false;
    }

    if (end.isBefore(start)) {
      setError("End must be after start");
      return false;
    }

    if (hasConflict(start, end)) {
      setError("Scheduling conflict detected");
      return false;
    }

    return true;
  };

  /*
  ======================================
  Submit
  ======================================
  */
  const handleSubmit = () => {
    if (!validate()) return;

    let finalStart = start;
    let finalEnd = end;

    if (eventType === "multi") {
      finalStart = start.startOf("day");
      finalEnd = end.endOf("day");
    }

    handleSave({
      id: existingEvent?.id || Date.now(),
      title,
      notes,
      eventType,
      startDate: finalStart.toDate(),
      endDate: finalEnd.toDate(),
    });

    handleClose();
  };

  /*
  ======================================
  Delete Flow
  ======================================
  */
  const confirmDelete = () => {
    handleDelete?.(existingEvent?.id);
    setConfirmDeleteOpen(false);
    handleClose();
  };

  /*
  ======================================
  Render Time / Date Fields
  ======================================
  */
  const renderFields = () => {
    if (eventType === "single") {
      return (
        <>
          <TextField
            label="Start Time"
            type="datetime-local"
            fullWidth
            disabled={!isEditable}
            value={start ? start.format("YYYY-MM-DDTHH:mm") : ""}
            onChange={(e) => setStart(dayjs(e.target.value))}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            label="End Time"
            type="datetime-local"
            fullWidth
            disabled={!isEditable}
            value={end ? end.format("YYYY-MM-DDTHH:mm") : ""}
            onChange={(e) => setEnd(dayjs(e.target.value))}
            sx={{ mt: 2 }}
            InputLabelProps={{ shrink: true }}
          />
        </>
      );
    }

    return (
      <>
        <TextField
          label="Start Date"
          type="date"
          fullWidth
          disabled={!isEditable}
          value={start ? start.format("YYYY-MM-DD") : ""}
          onChange={(e) =>
            setStart(dayjs(e.target.value).startOf("day"))
          }
          sx={{ mt: 2 }}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="End Date"
          type="date"
          fullWidth
          disabled={!isEditable}
          value={end ? end.format("YYYY-MM-DD") : ""}
          onChange={(e) =>
            setEnd(dayjs(e.target.value).endOf("day"))
          }
          sx={{ mt: 2 }}
          InputLabelProps={{ shrink: true }}
        />
      </>
    );
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={handleClose}
        fullWidth
        PaperProps={{
          sx: {
            width: 500,
            borderRadius: 3,
            p: 2,
            backgroundColor: "#ffffff",
          },
        }}
      >
        <DialogTitle>
          <Box display="flex" justifyContent="space-between">
            <Typography fontWeight={600}>
              {existingEvent ? "Event Details" : "Create Availability"}
            </Typography>

            <Box display="flex" gap={1}>
              {existingEvent && mode === MODE.VIEW && (
                <IconButton onClick={() => setMode(MODE.EDIT)}>
                  <EditIcon />
                </IconButton>
              )}

              {existingEvent && (
                <IconButton
                  color="error"
                  onClick={() => setConfirmDeleteOpen(true)}
                >
                  <DeleteIcon />
                </IconButton>
              )}

              <IconButton onClick={handleClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent dividers>
          {existingEvent && (
            <Chip
              label={
                mode === MODE.VIEW
                  ? "View Mode"
                  : mode === MODE.EDIT
                  ? "Edit Mode"
                  : "Create Mode"
              }
              size="small"
              color="primary"
              sx={{ mb: 2 }}
            />
          )}

          <TextField
            inputRef={titleRef}
            label="Event Title"
            fullWidth
            value={title}
            disabled={!isEditable}
            onChange={(e) => setTitle(e.target.value)}
          />

          <TextField
            select
            fullWidth
            label="Event Type"
            value={eventType}
            disabled={!isEditable}
            onChange={(e) => setEventType(e.target.value)}
            SelectProps={{ native: true }}
            sx={{ mt: 2 }}
          >
            <option value="single">Single Day (With Time)</option>
            <option value="multi">Multi Day (Whole Day)</option>
          </TextField>

          {renderFields()}

          <TextField
            label="Notes (Optional)"
            fullWidth
            multiline
            rows={3}
            value={notes}
            disabled={!isEditable}
            onChange={(e) => setNotes(e.target.value)}
            sx={{ mt: 2 }}
          />

          {error && (
            <Typography color="error" mt={2} fontSize="0.85rem">
              {error}
            </Typography>
          )}
        </DialogContent>

        {isEditable && (
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button variant="contained" onClick={handleSubmit}>
              {existingEvent ? "Save Changes" : "Add Availability"}
            </Button>
          </DialogActions>
        )}
      </Dialog>

      {/* Delete Confirmation */}

      <ConfirmDialog
        open={confirmDeleteOpen}
        onClose={() => setConfirmDeleteOpen(false)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>

        <DialogContent>
          <DialogContentText>
            Are you sure you want to permanently delete this event?
          </DialogContentText>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setConfirmDeleteOpen(false)}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </ConfirmDialog>
    </>
  );
}