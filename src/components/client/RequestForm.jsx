// src/components/CoverageRequestDialog.jsx
import React, { useState, useEffect } from "react"; // added useEffect
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Typography,
  Box,
} from "@mui/material";
import {
  DatePicker,
  TimePicker,
  LocalizationProvider,
} from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";

const SERVICES = [
  "News Article",
  "Photo Documentation",
  "Video Documentaion",
  "Camera Operator (for live streaming)",
];

const CLIENT_TYPES = ["Office", "Department", "Organization"];

const ENTITIES = {
  Office: ["Office A", "Office B", "Office C"],
  Department: ["Dept X", "Dept Y", "Dept Z"],
  Organization: ["Org 1", "Org 2", "Org 3"],
};

export default function CoverageRequestDialog({
  open,
  handleClose,
  handleSubmit,
  defaultDate = null, // added defaultDate prop
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate); // initialize with defaultDate
  const [fromTime, setFromTime] = useState(null);
  const [toTime, setToTime] = useState(null);

  // services with quantity
  const [services, setServices] = useState({
    "News Article": 0,
    "Photo Documentation": 0,
    "Video Documentaion": 0,
    "Camera Operator (for live streaming)": 0,
  });

  const [venue, setVenue] = useState("");
  const [clientType, setClientType] = useState("");
  const [entity, setEntity] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [file, setFile] = useState(null);

  // -------------------- NEW: sync clicked date --------------------
  useEffect(() => {
    if (open) {
      setDate(defaultDate);
    }
  }, [open, defaultDate]);
  // ---------------------------------------------------------------

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      e.target.value = null;
      return;
    }
    setFile(selectedFile);
  };

  const onSubmit = () => {
    if (!title || !description || !venue || !contactPerson || !contactInfo) {
      alert("Please fill in all text fields.");
      return;
    }

    if (!date || !fromTime || !toTime) {
      alert("Please select date and time.");
      return;
    }

    const totalServices = Object.values(services).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (totalServices === 0) {
      alert(
        "Please select at least one service and specify the number of people.",
      );
      return;
    }

    if (!clientType) {
      alert("Please select a client type.");
      return;
    }

    if (!entity) {
      alert(`Please select a ${clientType} name.`);
      return;
    }

    if (!file) {
      alert("Please upload the program flow (PDF).");
      return;
    }

    handleSubmit({
      title,
      description,
      date,
      fromTime,
      toTime,
      services,
      venue,
      clientType,
      entity,
      contactPerson,
      contactInfo,
      file,
    });

    // Reset form
    setTitle("");
    setDescription("");
    setDate(null);
    setFromTime(null);
    setToTime(null);
    setServices({
      "News Article": 0,
      "Photo Documentation": 0,
      "Video Documentaion": 0,
      "Camera Operator (for live streaming)": 0,
    });
    setVenue("");
    setClientType("");
    setEntity("");
    setContactPerson("");
    setContactInfo("");
    setFile(null);

    handleClose();
  };

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      onClose={handleClose}
      PaperProps={{
        sx: { borderRadius: 4 },
      }}
    >
      <DialogTitle sx={{ textAlign: "center" }}>Request Form</DialogTitle>
      <DialogContent dividers>
        <TextField
          label="Event Title"
          fullWidth
          margin="normal"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <TextField
          label="Description"
          fullWidth
          multiline
          rows={3}
          margin="normal"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Box
            sx={{
              display: "flex",
              gap: 1.5,
              width: "100%",
              overflowX: "hidden",
            }}
          >
            <Box sx={{ flex: 4, minWidth: 0 }}>
              <DatePicker
                label="Event Date"
                value={date}
                onChange={setDate}
                renderInput={(params) => (
                  <TextField {...params} fullWidth margin="dense" required />
                )}
              />
            </Box>

            <Box sx={{ flex: 3, minWidth: 0 }}>
              <TimePicker
                label="From"
                value={fromTime}
                onChange={setFromTime}
                renderInput={(params) => (
                  <TextField {...params} fullWidth margin="dense" required />
                )}
              />
            </Box>

            <Box sx={{ flex: 3, minWidth: 0 }}>
              <TimePicker
                label="To"
                value={toTime}
                onChange={setToTime}
                renderInput={(params) => (
                  <TextField {...params} fullWidth margin="dense" required />
                )}
              />
            </Box>
          </Box>
        </LocalizationProvider>

        {/* Services, venue, contact, client type, entity, file upload */}
        {/* ...keep all your existing code unchanged */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Services Needed (Select and specify number of people needed)
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {SERVICES.map((service) => {
              const isChecked = services[service] > 0;
              return (
                <Box
                  key={service}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    justifyContent: "space-between",
                  }}
                >
                  <FormControl
                    sx={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          setServices((prev) => ({ ...prev, [service]: 0 }));
                        } else {
                          setServices((prev) => ({ ...prev, [service]: 1 }));
                        }
                      }}
                    />
                    <Typography>{service}</Typography>
                  </FormControl>
                  <TextField
                    type="number"
                    size="small"
                    value={services[service]}
                    onChange={(e) => {
                      const val = Math.max(0, Number(e.target.value));
                      setServices((prev) => ({ ...prev, [service]: val }));
                    }}
                    inputProps={{ min: 0, max: 20 }}
                    sx={{ width: 90 }}
                    disabled={!isChecked}
                  />
                </Box>
              );
            })}
          </Box>
        </Box>

        <TextField
          label="Venue"
          fullWidth
          margin="normal"
          value={venue}
          onChange={(e) => setVenue(e.target.value)}
          required
        />
        <TextField
          label="Contact Person"
          fullWidth
          margin="normal"
          value={contactPerson}
          onChange={(e) => setContactPerson(e.target.value)}
          required
        />
        <TextField
          label="Contact Info (phone/messenger/email)"
          fullWidth
          margin="normal"
          value={contactInfo}
          onChange={(e) => setContactInfo(e.target.value)}
          required
        />

        <FormControl fullWidth margin="normal" required>
          <InputLabel>Client Type</InputLabel>
          <Select
            value={clientType}
            onChange={(e) => {
              setClientType(e.target.value);
              setEntity("");
            }}
          >
            {CLIENT_TYPES.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {clientType && (
          <FormControl fullWidth margin="normal">
            <InputLabel>{clientType} Name</InputLabel>
            <Select value={entity} onChange={(e) => setEntity(e.target.value)}>
              {ENTITIES[clientType].map((ent) => (
                <MenuItem key={ent} value={ent}>
                  {ent}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}

        <Button variant="outlined" component="label" sx={{ mt: 2 }}>
          Upload Program Flow (PDF)
          <input
            type="file"
            hidden
            onChange={handleFileChange}
            accept="application/pdf"
          />
        </Button>
        {file && <Typography sx={{ mt: 1 }}>{file.name}</Typography>}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button variant="contained" onClick={onSubmit}>
          Submit
        </Button>
      </DialogActions>
    </Dialog>
  );
}
