// src/components/client/CoverageRequestDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogActions,
  TextField, Button, MenuItem, Select, InputLabel,
  FormControl, Typography, Box, CircularProgress, Alert, useTheme,
} from "@mui/material";
import { DatePicker, TimePicker, LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { fetchClientTypes, fetchEntitiesByType } from "../../services/classificationService";
import { submitCoverageRequest, updateDraftRequest } from "../../services/coverageRequestService";

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
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [title,         setTitle]         = useState("");
  const [description,   setDescription]   = useState("");
  const [date,          setDate]          = useState(defaultDate);
  const [fromTime,      setFromTime]      = useState(null);
  const [toTime,        setToTime]        = useState(null);
  const [services,      setServices]      = useState(SERVICES.reduce((acc, svc) => ({ ...acc, [svc]: 0 }), {}));
  const [venue,         setVenue]         = useState("");
  const [clientType,    setClientType]    = useState("");
  const [entity,        setEntity]        = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactInfo,   setContactInfo]   = useState("");
  const [file,          setFile]          = useState(null);
  const [confirmOpen,   setConfirmOpen]   = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [clientTypes,   setClientTypes]   = useState([]);
  const [entities,      setEntities]      = useState([]);

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
        setDate(existingRequest.event_date ? new Date(existingRequest.event_date) : defaultDate);
        setFromTime(existingRequest.from_time ? new Date(`1970-01-01T${existingRequest.from_time}`) : null);
        setToTime(existingRequest.to_time ? new Date(`1970-01-01T${existingRequest.to_time}`) : null);
        setServices(existingRequest.services || SERVICES.reduce((acc, svc) => ({ ...acc, [svc]: 0 }), {}));
        setVenue(existingRequest.venue || "");
        setClientType(existingRequest.client_type?.id || existingRequest.client_type_id || "");
        setEntity(existingRequest.entity?.id || existingRequest.entity_id || "");
        setContactPerson(existingRequest.contact_person || "");
        setContactInfo(existingRequest.contact_info || "");
        setFile(null);
      } else {
        setDate(defaultDate);
      }
    }
  }, [open, defaultDate, existingRequest]);

  useEffect(() => {
    if (!clientType) { setEntities([]); setEntity(""); return; }
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
    setTitle(""); setDescription(""); setDate(null); setFromTime(null); setToTime(null);
    setServices(SERVICES.reduce((acc, svc) => ({ ...acc, [svc]: 0 }), {}));
    setVenue(""); setClientType(""); setEntity(""); setContactPerson(""); setContactInfo("");
    setFile(null); setError("");
  };

  const validate = () => {
    const totalServices = Object.values(services).reduce((sum, val) => sum + val, 0);
    if (!title || !description || !venue || !contactPerson || !contactInfo) return "Please fill in all text fields.";
    if (!date || !fromTime || !toTime) return "Please select date and time.";
    if (totalServices === 0) return "Please select at least one service and specify the number of people.";
    if (!clientType) return "Please select a client type.";
    if (!entity) return "Please select an entity name.";
    if (!file && !existingRequest?.file_url) return "Please upload the program flow (PDF).";
    return null;
  };

  const submitForm = async (isDraft = false) => {
    setError("");
    if (!isDraft) {
      const validationError = validate();
      if (validationError) { setError(validationError); return; }
    } else {
      if (!title) { setError("Please enter at least an event title to save as draft."); return; }
    }
    setLoading(true);
    try {
      const requestData = { title, description, date, from_time: fromTime, to_time: toTime, services, venue, client_type: clientType, entity, contact_person: contactPerson, contact_info: contactInfo };
      if (existingRequest) {
        await updateDraftRequest(existingRequest.id, requestData, file, !isDraft);
      } else {
        await submitCoverageRequest(requestData, file, isDraft);
      }
      resetForm();
      setConfirmOpen(false);
      handleClose();
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared field sx ──
  const fieldSx = {
    "& .MuiInputBase-input":    { fontSize: "0.85rem" },
    "& .MuiInputLabel-root":    { fontSize: "0.85rem" },
    "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
  };

  return (
    <>
      <Dialog
        fullWidth
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: 600,
            maxHeight: "90vh",
            backgroundColor: "background.paper",
            boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.08)",
          },
        }}
      >
        {/* ── Header ── */}
        <Box sx={{
          px: 3, py: 2,
          borderBottom: "1px solid", borderColor: "divider",
          display: "flex", alignItems: "center", gap: 1.5,
        }}>
          <Box sx={{ width: 3, height: 26, borderRadius: 1, backgroundColor: "#f5c52b", flexShrink: 0 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary" }}>
            {existingRequest ? "Edit Draft" : "Coverage Request Form"}
          </Typography>
        </Box>

        <DialogContent sx={{ px: 3, py: 2.5 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5, fontSize: "0.82rem" }}>{error}</Alert>
          )}

          {/* ── Section: Event Details ── */}
          <FormSection label="Event Details">
            <TextField label="Event Title" fullWidth margin="dense" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} sx={fieldSx} />
            <TextField label="Description" fullWidth multiline rows={3} margin="dense" value={description} onChange={(e) => setDescription(e.target.value)} required disabled={loading} sx={fieldSx} />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                <Box sx={{ flex: 5, minWidth: 0 }}>
                  <DatePicker
                    label="Event Date"
                    value={date}
                    onChange={setDate}
                    disabled={loading}
                    renderInput={(params) => <TextField {...params} fullWidth margin="dense" sx={fieldSx} />}
                  />
                </Box>
                <Box sx={{ flex: 3, minWidth: 0 }}>
                  <TimePicker
                    label="From"
                    value={fromTime}
                    onChange={setFromTime}
                    disabled={loading}
                    renderInput={(params) => <TextField {...params} fullWidth margin="dense" sx={fieldSx} />}
                  />
                </Box>
                <Box sx={{ flex: 3, minWidth: 0 }}>
                  <TimePicker
                    label="To"
                    value={toTime}
                    onChange={setToTime}
                    disabled={loading}
                    renderInput={(params) => <TextField {...params} fullWidth margin="dense" sx={fieldSx} />}
                  />
                </Box>
              </Box>
            </LocalizationProvider>

            <TextField label="Venue" fullWidth margin="dense" value={venue} onChange={(e) => setVenue(e.target.value)} required disabled={loading} sx={fieldSx} />
          </FormSection>

          {/* ── Section: Services ── */}
          <FormSection label="Services Needed">
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 1.5 }}>
              Select services and specify the number of staff required for each.
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {SERVICES.map((service) => {
                const isChecked = services[service] > 0;
                return (
                  <Box
                    key={service}
                    sx={{
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                      px: 1.5, py: 1, borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: isChecked ? "#f5c52b" : "divider",
                      backgroundColor: isChecked
                        ? (isDark ? "#1e1800" : "#fffbeb")
                        : (isDark ? "#1a1a1a" : "#fafafa"),
                      cursor: loading ? "default" : "pointer",
                      transition: "border-color 0.15s, background-color 0.15s",
                      "&:hover": !loading ? { borderColor: "#f5c52b" } : {},
                    }}
                    onClick={() => {
                      if (loading) return;
                      setServices((prev) => ({ ...prev, [service]: prev[service] > 0 ? 0 : 1 }));
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{
                        width: 14, height: 14, borderRadius: "3px", border: "1.5px solid",
                        borderColor: isChecked ? "#f5c52b" : "divider",
                        backgroundColor: isChecked ? "#f5c52b" : "transparent",
                        flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        {isChecked && <Box sx={{ width: 8, height: 8, borderRadius: "1px", backgroundColor: "#111827" }} />}
                      </Box>
                      <Typography sx={{ fontSize: "0.83rem", color: "text.primary" }}>{service}</Typography>
                    </Box>
                    <TextField
                      type="number"
                      size="small"
                      value={services[service]}
                      onChange={(e) => {
                        e.stopPropagation();
                        const val = Math.max(0, Number(e.target.value));
                        setServices((prev) => ({ ...prev, [service]: val }));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      inputProps={{ min: 0, max: 5 }}
                      disabled={!isChecked || loading}
                      sx={{
                        width: 80,
                        "& .MuiInputBase-input":    { fontSize: "0.82rem", textAlign: "center", py: 0.6 },
                        "& .MuiOutlinedInput-root": { borderRadius: 1 },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
          </FormSection>

          {/* ── Section: Client Info ── */}
          <FormSection label="Client Information">
            <TextField label="Contact Person" fullWidth margin="dense" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} required disabled={loading} sx={fieldSx} />
            <TextField label="Contact Info (phone / messenger / email)" fullWidth margin="dense" value={contactInfo} onChange={(e) => setContactInfo(e.target.value)} required disabled={loading} sx={fieldSx} />

            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              <FormControl fullWidth margin="dense" required sx={fieldSx}>
                <InputLabel sx={{ fontSize: "0.85rem" }}>Client Type</InputLabel>
                <Select
                  label="Client Type" value={clientType}
                  onChange={(e) => setClientType(e.target.value)}
                  disabled={loading}
                  sx={{ borderRadius: 1.5, fontSize: "0.85rem" }}
                >
                  {clientTypes.map((type) => (
                    <MenuItem key={type.id} value={type.id} sx={{ fontSize: "0.85rem" }}>{type.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>

              {clientType && (
                <FormControl fullWidth margin="dense" required sx={fieldSx}>
                  <InputLabel sx={{ fontSize: "0.85rem" }}>Entity Name</InputLabel>
                  <Select
                    label="Entity Name" value={entity}
                    onChange={(e) => setEntity(e.target.value)}
                    disabled={loading}
                    sx={{ borderRadius: 1.5, fontSize: "0.85rem" }}
                  >
                    {entities.map((ent) => (
                      <MenuItem key={ent.id} value={ent.id} sx={{ fontSize: "0.85rem" }}>{ent.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>
          </FormSection>

          {/* ── Section: Attachment ── */}
          <FormSection label="Attachment">
            <Button
              variant="outlined"
              component="label"
              disabled={loading}
              size="small"
              sx={{
                textTransform: "none", fontSize: "0.82rem", borderRadius: 1.5,
                borderColor: "divider", color: "text.secondary",
                "&:hover": { borderColor: "#f5c52b", color: "text.primary" },
              }}
            >
              {existingRequest ? "Replace Program Flow (PDF)" : "Upload Program Flow (PDF)"}
              <input type="file" hidden onChange={handleFileChange} accept="application/pdf" />
            </Button>

            {file ? (
              <Typography sx={{ mt: 1, fontSize: "0.8rem", color: "#15803d" }}>✓ {file.name}</Typography>
            ) : existingRequest?.file_url ? (
              <Typography sx={{ mt: 1, fontSize: "0.8rem", color: "text.secondary" }}>
                Current: {existingRequest.file_url.split("/").pop().replace(/^\d+_/, "")}
              </Typography>
            ) : null}
          </FormSection>
        </DialogContent>

        {/* ── Footer ── */}
        <Box sx={{
          px: 3, py: 1.75,
          borderTop: "1px solid", borderColor: "divider",
          display: "flex", justifyContent: "flex-end", gap: 1,
          backgroundColor: isDark ? "#161616" : "#fafafa",
        }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            size="small"
            sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={() => {
              const validationError = validate();
              if (validationError) { setError(validationError); return; }
              setError("");
              setConfirmOpen(true);
            }}
            disabled={loading}
            sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}
          >
            Submit
          </Button>
        </Box>
      </Dialog>

      {/* ── Confirmation Dialog ── */}
      <Dialog
        open={confirmOpen}
        onClose={() => !loading && setConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: "background.paper",
            boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.08)",
          },
        }}
      >
        {/* Header */}
        <Box sx={{
          px: 3, py: 2,
          borderBottom: "1px solid", borderColor: "divider",
          display: "flex", alignItems: "center", gap: 1.5,
        }}>
          <Box sx={{ width: 3, height: 22, borderRadius: 1, backgroundColor: "#f5c52b", flexShrink: 0 }} />
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}>
            Confirm Submission
          </Typography>
        </Box>

        <DialogContent sx={{ pt: 2 }}>
          <Typography sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.6 }}>
            Do you want to submit this request now, or save it as a draft?
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 1.25, p: 1.25, borderRadius: 1.5, backgroundColor: isDark ? "#1a1a1a" : "#f9fafb", border: "1px solid", borderColor: "divider" }}>
            <InfoOutlinedIcon sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }} />
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.5 }}>
              Once submitted, the request can no longer be edited.
            </Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mt: 2, borderRadius: 1.5, fontSize: "0.82rem" }}>{error}</Alert>}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <CircularProgress size={20} sx={{ color: "#f5c52b" }} />
            </Box>
          )}
        </DialogContent>

        <Box sx={{
          px: 3, py: 1.75,
          borderTop: "1px solid", borderColor: "divider",
          display: "flex", justifyContent: "flex-end", gap: 1,
          backgroundColor: isDark ? "#161616" : "#fafafa",
        }}>
          <Button
            onClick={() => submitForm(true)}
            disabled={loading}
            size="small"
            sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}
          >
            Save as Draft
          </Button>
          <Button
            variant="contained"
            onClick={() => submitForm(false)}
            disabled={loading}
            size="small"
            sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}
          >
            Submit Now
          </Button>
        </Box>
      </Dialog>
    </>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function FormSection({ label, children }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{
        fontSize: "0.68rem", fontWeight: 700, color: "text.secondary",
        letterSpacing: "0.1em", textTransform: "uppercase",
        mb: 1, pb: 0.75, borderBottom: "1px solid", borderColor: "divider",
      }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}