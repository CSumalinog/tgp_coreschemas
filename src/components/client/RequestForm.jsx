// src/components/CoverageRequestDialog.jsx
import React, { useState, useEffect } from "react";
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
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import {
  fetchClientTypes,
  fetchEntitiesByType,
} from "../../services/classificationService";

const SERVICES = [
  "News Article",
  "Photo Documentation",
  "Video Documentaion",
  "Camera Operator (for live streaming)",
];

export default function CoverageRequestDialog({
  open,
  handleClose,
  handleSubmit,
  defaultDate = null,
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [fromTime, setFromTime] = useState(null);
  const [toTime, setToTime] = useState(null);
  const [services, setServices] = useState(
    SERVICES.reduce((acc, svc) => ({ ...acc, [svc]: 0 }), {}),
  );
  const [venue, setVenue] = useState("");
  const [clientType, setClientType] = useState("");
  const [entity, setEntity] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [file, setFile] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Dynamic client types and entities

  const [clientTypes, setClientTypes] = useState([]);
  const [entities, setEntities] = useState([]);

  // Load client types on dialog open
  useEffect(() => {
    if (!open) return;

    async function loadClientTypes() {
      const types = await fetchClientTypes();
      setClientTypes(types);
      setDate(defaultDate);
    }

    loadClientTypes();
  }, [open, defaultDate]);

  // Load entities whenever clientType changes
  useEffect(() => {
    if (!clientType) {
      setEntities([]);
      setEntity("");
      return;
    }

    async function loadEntities() {
      const ents = await fetchEntitiesByType(clientType);
      setEntities(ents);
      setEntity("");
    }

    loadEntities();
  }, [clientType]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type !== "application/pdf") {
      alert("Only PDF files are allowed.");
      e.target.value = null;
      return;
    }
    setFile(selectedFile);
  };

  const submitForm = async (isDraft = false) => {
    const totalServices = Object.values(services).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (!title || !description || !venue || !contactPerson || !contactInfo)
      return alert("Please fill in all text fields.");
    if (!date || !fromTime || !toTime)
      return alert("Please select date and time.");
    if (totalServices === 0)
      return alert(
        "Please select at least one service and specify the number of people.",
      );
    if (!clientType) return alert("Please select a client type.");
    if (!entity) return alert(`Please select a ${clientType} name.`);
    if (!file) return alert("Please upload the program flow (PDF).");

    const submission = {
      title,
      description,
      date,
      from_time: fromTime,
      to_time: toTime,
      services,
      venue,
      client_type: entity, // store UUID of classification
      entity: entity, // optional: also store name
      contact_person: contactPerson,
      contact_info: contactInfo,
      file_url: null,
      status: isDraft ? "Draft" : "Pending",
    };

    await handleSubmit(submission);

    // Reset form
    setTitle("");
    setDescription("");
    setDate(null);
    setFromTime(null);
    setToTime(null);
    setServices(SERVICES.reduce((acc, svc) => ({ ...acc, [svc]: 0 }), {}));
    setVenue("");
    setClientType("");
    setEntity("");
    setContactPerson("");
    setContactInfo("");
    setFile(null);
    handleClose();
  };

  return (
    <>
      <Dialog
        fullWidth
        open={open}
        onClose={handleClose}
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
        <DialogTitle sx={{ textAlign: "center" }}>Request Form</DialogTitle>
        <DialogContent dividers sx={{ "& *": { fontSize: "0.9rem", gap: 1 } }}>
          {/* Event Title & Description */}
          <TextField
            label="Event Title"
            fullWidth
            margin="dense"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={3}
            margin="dense"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Date & Time Pickers */}
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box
              sx={{
                display: "flex",
                gap: 1,
                width: "100%",
                
                marginTop: 1,
              }}
            >
              <Box sx={{ flex: 5, minWidth: 0 }}>
                <DatePicker
                  label="Event Date"
                  value={date}
                  onChange={setDate}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth margin="dense" />
                  )}
                />
              </Box>
              <Box sx={{ flex: 3, minWidth: 0 }}>
                <TimePicker
                  label="From"
                  value={fromTime}
                  onChange={setFromTime}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth margin="dense" />
                  )}
                />
              </Box>
              <Box sx={{ flex: 3, minWidth: 0 }}>
                <TimePicker
                  label="To"
                  value={toTime}
                  onChange={setToTime}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth margin="dense" />
                  )}
                />
              </Box>
            </Box>
          </LocalizationProvider>

          {/* Services Section */}
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle1" sx={{ mb: 1, display: "inline" }}>
              Services Needed{" "}
            </Typography>
            <Typography
              variant="body2"
              color="textSecondary"
              sx={{ display: "inline" }}
            >
              (Select and specify number of people needed)
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
                      gap: 1,
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
                        onChange={(e) =>
                          !e.target.checked
                            ? setServices((prev) => ({ ...prev, [service]: 0 }))
                            : setServices((prev) => ({ ...prev, [service]: 1 }))
                        }
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

          {/* Venue & Contact */}
          <TextField
            label="Venue"
            fullWidth
            margin="dense"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
          />
          <TextField
            label="Contact Person"
            fullWidth
            margin="dense"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            required
          />
          <TextField
            label="Contact Info (phone/messenger/email)"
            fullWidth
            margin="dense"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            required
          />

          {/* Client Type & Entity (Dynamic) */}
          <FormControl fullWidth margin="dense" required>
            <InputLabel>Client Type</InputLabel>
            <Select
            label="Client Type"
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
            >
              {clientTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Entity */}
          {clientType && (
            <FormControl fullWidth margin="dense" required>
              // eslint-disable-next-line no-undef
              <InputLabel>{selectedClientTypeName} Name</InputLabel>
              <Select
              label="Name"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
              >
                {entities.map((ent) => (
                  <MenuItem key={ent.id} value={ent.id}>
                    {ent.name}
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

        <DialogActions sx={{ "& *": { fontSize: "0.9rem" } }}>
          <Button onClick={handleClose}>Cancel</Button>
          <Button variant="contained" onClick={() => setConfirmOpen(true)}>
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{ sx: { borderRadius: 4 } }}
      >
        <DialogTitle>Confirm Submission</DialogTitle>
        <DialogContent sx={{ "& *": { fontSize: "0.9rem" } }}>
          <Typography>
            Do you want to submit this request now, or save it as a draft?
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1 }}>
            <InfoOutlinedIcon fontSize="small" color="action" />
            <Typography variant="caption" color="textSecondary">
              Once submitted, the request can no longer be edited.
            </Typography>
          </Box>
        </DialogContent>

        <DialogActions sx={{ "& *": { fontSize: "0.9rem" } }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              submitForm(true);
              setConfirmOpen(false);
            }}
          >
            Save as Draft
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              submitForm(false);
              setConfirmOpen(false);
            }}
          >
            Submit Now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
