// src/components/client/CoverageRequestDialog.jsx
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
  CircularProgress,
  Alert,
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
import {
  submitCoverageRequest,
  updateDraftRequest,
} from "../../services/coverageRequestService";

const SERVICES = [
  "News Article",
  "Photo Documentation",
  "Video Documentation",
  "Camera Operator (for live streaming)",
];

export default function CoverageRequestDialog({
  open,
  handleClose,
  onSuccess,
  defaultDate = null,
  existingRequest = null,
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [clientTypes, setClientTypes] = useState([]);
  const [entities, setEntities] = useState([]);

  // ✅ FIX 1: dependency array added — was running on every render before
  useEffect(() => {
    async function loadClientTypes() {
      try {
        const types = await fetchClientTypes();
        setClientTypes(types || []);
      } catch (err) {
        console.error(err);
        setClientTypes([]);
      }
    }

    if (open) {
      loadClientTypes();
      setError("");

      if (existingRequest) {
        setTitle(existingRequest.title || "");
        setDescription(existingRequest.description || "");
        setDate(
          existingRequest.event_date
            ? new Date(existingRequest.event_date)
            : defaultDate,
        );
        setFromTime(
          existingRequest.from_time
            ? new Date(`1970-01-01T${existingRequest.from_time}`)
            : null,
        );
        setToTime(
          existingRequest.to_time
            ? new Date(`1970-01-01T${existingRequest.to_time}`)
            : null,
        );
        setServices(
          existingRequest.services ||
            SERVICES.reduce((acc, svc) => ({ ...acc, [svc]: 0 }), {}),
        );
        setVenue(existingRequest.venue || "");
        setClientType(
          existingRequest.client_type?.id ||
            existingRequest.client_type_id ||
            "",
        );
        setEntity(
          existingRequest.entity?.id || existingRequest.entity_id || "",
        );
        setContactPerson(existingRequest.contact_person || "");
        setContactInfo(existingRequest.contact_info || "");
        setFile(null);
      } else {
        setDate(defaultDate);
      }
    }
  }, [open, defaultDate, existingRequest]); // ✅ FIX 1: proper dependency array

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

  const resetForm = () => {
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
    setError("");
  };

  const validate = () => {
    const totalServices = Object.values(services).reduce(
      (sum, val) => sum + val,
      0,
    );
    if (!title || !description || !venue || !contactPerson || !contactInfo)
      return "Please fill in all text fields.";
    if (!date || !fromTime || !toTime) return "Please select date and time.";
    if (totalServices === 0)
      return "Please select at least one service and specify the number of people.";
    if (!clientType) return "Please select a client type.";
    if (!entity) return "Please select an entity name.";
    if (!file && !existingRequest?.file_url)
      return "Please upload the program flow (PDF).";
    return null;
  };

  const submitForm = async (isDraft = false) => {
    setError("");

    if (!isDraft) {
      const validationError = validate();
      if (validationError) {
        setError(validationError);
        return;
      }
    } else {
      if (!title) {
        setError("Please enter at least an event title to save as draft.");
        return;
      }
    }

    setLoading(true);

    try {
      const requestData = {
        title,
        description,
        date,
        from_time: fromTime,
        to_time: toTime,
        services,
        venue,
        client_type: clientType,
        entity,
        contact_person: contactPerson,
        contact_info: contactInfo,
      };

      if (existingRequest) {
        await updateDraftRequest(
          existingRequest.id,
          requestData,
          file,
          !isDraft,
        );
      } else {
        await submitCoverageRequest(requestData, file, isDraft);
      }

      resetForm();
      setConfirmOpen(false);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
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
            borderRadius: 3,
            width: 600,
            maxHeight: "90vh",
          },
        }}
      >
        <DialogTitle sx={{ textAlign: "center" }}>
          {existingRequest ? "Edit Draft" : "Request Form"}
        </DialogTitle>

        <DialogContent dividers sx={{ "& *": { fontSize: "0.9rem" } }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Event Title"
            fullWidth
            margin="dense"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={loading}
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
            disabled={loading}
          />

          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <Box sx={{ display: "flex", gap: 1, width: "100%", marginTop: 1 }}>
              <Box sx={{ flex: 5, minWidth: 0 }}>
                <DatePicker
                  label="Event Date"
                  value={date}
                  onChange={setDate}
                  disabled={loading}
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
                  disabled={loading}
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
                  disabled={loading}
                  renderInput={(params) => (
                    <TextField {...params} fullWidth margin="dense" />
                  )}
                />
              </Box>
            </Box>
          </LocalizationProvider>

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
                        disabled={loading}
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
                      disabled={!isChecked || loading}
                    />
                  </Box>
                );
              })}
            </Box>
          </Box>

          <TextField
            label="Venue"
            fullWidth
            margin="dense"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            required
            disabled={loading}
          />
          <TextField
            label="Contact Person"
            fullWidth
            margin="dense"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            required
            disabled={loading}
          />
          <TextField
            label="Contact Info (phone/messenger/email)"
            fullWidth
            margin="dense"
            value={contactInfo}
            onChange={(e) => setContactInfo(e.target.value)}
            required
            disabled={loading}
          />

          <FormControl fullWidth margin="dense" required>
            <InputLabel>Client Type</InputLabel>
            <Select
              label="Client Type"
              value={clientType}
              onChange={(e) => setClientType(e.target.value)}
              disabled={loading}
            >
              {clientTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {clientType && (
            <FormControl fullWidth margin="dense" required>
              <InputLabel>Entity Name</InputLabel>
              <Select
                label="Entity Name"
                value={entity}
                onChange={(e) => setEntity(e.target.value)}
                disabled={loading}
              >
                {entities.map((ent) => (
                  <MenuItem key={ent.id} value={ent.id}>
                    {ent.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="outlined"
            component="label"
            sx={{ mt: 2 }}
            disabled={loading}
          >
            {existingRequest
              ? "Replace Program Flow (PDF)"
              : "Upload Program Flow (PDF)"}
            <input
              type="file"
              hidden
              onChange={handleFileChange}
              accept="application/pdf"
            />
          </Button>

          {file ? (
            <Typography sx={{ mt: 1, fontSize: "0.85rem", color: "#388e3c" }}>
              ✓ {file.name}
            </Typography>
          ) : existingRequest?.file_url ? (
            <Typography sx={{ mt: 1, fontSize: "0.85rem", color: "#757575" }}>
              Current file:{" "}
              {existingRequest.file_url.split("/").pop().replace(/^\d+_/, "")}
            </Typography>
          ) : null}
        </DialogContent>

        <DialogActions sx={{ "& *": { fontSize: "0.9rem" } }}>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          {/* ✅ FIX 2: validate before opening confirm dialog */}
          <Button
            variant="contained"
            onClick={() => {
              const validationError = validate();
              if (validationError) {
                setError(validationError);
                return;
              }
              setError("");
              setConfirmOpen(true);
            }}
            disabled={loading}
            sx={{ backgroundColor: "#f5c52b", color: "#212121" }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmOpen}
        onClose={() => !loading && setConfirmOpen(false)}
        fullWidth
        PaperProps={{ sx: { borderRadius: 4, p: 1, width: 500 } }}
      >
        <DialogTitle sx={{ textAlign: "start" }}>
          <Typography sx={{ fontWeight: 600, fontSize: "1rem" }}>
            Confirmation of submission
          </Typography>
        </DialogTitle>
        <hr style={{ backgroundColor: "#e0e0e0", width: "90%" }} />

        {/* ✅ FIX 3: single DialogContent — no layout shift */}
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

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <CircularProgress size={22} sx={{ color: "#f5c52b" }} />
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ "& *": { fontSize: "0.9rem" } }}>
          <Button
            onClick={() => submitForm(true)}
            disabled={loading}
            sx={{ color: "#212121" }}
          >
            Save as Draft
          </Button>
          <Button
            variant="contained"
            onClick={() => submitForm(false)}
            disabled={loading}
            sx={{
              backgroundColor: "#f5c52b",
              color: "#212121",
              "&:hover": { backgroundColor: "#e6b920" },
            }}
          >
            Submit Now
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
