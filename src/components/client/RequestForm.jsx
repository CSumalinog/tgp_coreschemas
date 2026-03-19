// src/components/client/CoverageRequestDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  TextField,
  Button,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  FormHelperText,
  Typography,
  Box,
  CircularProgress,
  Alert,
  useTheme,
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

const EMPTY_ERRORS = {
  title: "",
  description: "",
  date: "",
  fromTime: "",
  toTime: "",
  venue: "",
  services: "",
  clientType: "",
  entity: "",
  otherEntity: "",
  contactPerson: "",
  contactInfo: "",
  file: "",
};

const OTHER_ID = "__others__";

export default function CoverageRequestDialog({
  open,
  handleClose,
  onSuccess,
  defaultDate = null,
  existingRequest = null,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

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
  const [otherEntity, setOtherEntity] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [file, setFile] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [clientTypes, setClientTypes] = useState([]);
  const [entities, setEntities] = useState([]);
  const [entitiesLoading, setEntitiesLoading] = useState(false);

  const isOthers = entity === OTHER_ID;

  // ── Load client types + populate fields when dialog opens ──
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
      setErrors(EMPTY_ERRORS);
      setSubmitError("");
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
        setOtherEntity("");
        setContactPerson(existingRequest.contact_person || "");
        setContactInfo(existingRequest.contact_info || "");
        setFile(null);
      } else {
        resetForm();
        setDate(defaultDate);
      }
    }
  }, [open, defaultDate, existingRequest]);

  // ── Load entities when client type changes ──
  useEffect(() => {
    if (!clientType) {
      setEntities([]);
      setEntity("");
      setOtherEntity("");
      return;
    }
    async function loadEntities() {
      setEntitiesLoading(true);
      try {
        const ents = await fetchEntitiesByType(clientType);
        setEntities(ents || []);
      } catch (err) {
        console.error(err);
        setEntities([]);
      } finally {
        setEntitiesLoading(false);
      }
      setEntity("");
      setOtherEntity("");
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
    if (selectedFile) setErrors((prev) => ({ ...prev, file: "" }));
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
    setOtherEntity("");
    setContactPerson("");
    setContactInfo("");
    setFile(null);
    setErrors(EMPTY_ERRORS);
    setSubmitError("");
  };

  // ── Validation ──
  const validate = () => {
    const totalServices = Object.values(services).reduce(
      (sum, val) => sum + val,
      0,
    );
    const newErrors = { ...EMPTY_ERRORS };
    let hasError = false;

    if (!title) {
      newErrors.title = "Event title is required.";
      hasError = true;
    }
    if (!description) {
      newErrors.description = "Description is required.";
      hasError = true;
    }
    if (!date) {
      newErrors.date = "Event date is required.";
      hasError = true;
    }
    if (!fromTime) {
      newErrors.fromTime = "Start time is required.";
      hasError = true;
    }
    if (!toTime) {
      newErrors.toTime = "End time is required.";
      hasError = true;
    }
    if (!venue) {
      newErrors.venue = "Venue is required.";
      hasError = true;
    }
    if (totalServices === 0) {
      newErrors.services = "Please select at least one service.";
      hasError = true;
    }
    if (!clientType) {
      newErrors.clientType = "Client type is required.";
      hasError = true;
    }
    if (!entity) {
      newErrors.entity = "Entity name is required.";
      hasError = true;
    }
    if (isOthers && !otherEntity.trim()) {
      newErrors.otherEntity = "Please specify the entity name.";
      hasError = true;
    }
    if (!contactPerson) {
      newErrors.contactPerson = "Contact person is required.";
      hasError = true;
    }
    if (!contactInfo) {
      newErrors.contactInfo = "Contact information is required.";
      hasError = true;
    }
    if (!file && !existingRequest?.file_url) {
      newErrors.file = "Please upload the program flow (PDF).";
      hasError = true;
    }

    setErrors(newErrors);
    return !hasError;
  };

  // ── Submit / Save as Draft ──
  // "Others" text is passed to the service which upserts it into client_entities
  // and returns a real entity_id — so the dropdown grows automatically next request.
  const submitForm = async (isDraft = false) => {
    setSubmitError("");

    if (!isDraft) {
      if (!validate()) return;
    } else {
      if (!title) {
        setErrors((prev) => ({
          ...prev,
          title: "Please enter at least an event title to save as draft.",
        }));
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
        entity: isOthers ? null : entity,
        other_entity: isOthers ? otherEntity.trim() : null,
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
      setSubmitError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Shared field sx ──
  const fieldSx = {
    "& .MuiInputBase-input": { fontSize: "0.85rem" },
    "& .MuiInputLabel-root": { fontSize: "0.85rem" },
    "& .MuiOutlinedInput-root": { borderRadius: 1.5 },
  };

  const errorFieldSx = (hasErr) => ({
    ...fieldSx,
    "& .MuiOutlinedInput-root": {
      borderRadius: 1.5,
      ...(hasErr && {
        "& fieldset": { borderColor: "#ef4444" },
        "&:hover fieldset": { borderColor: "#ef4444" },
        "&.Mui-focused fieldset": { borderColor: "#ef4444" },
      }),
    },
    ...(hasErr && {
      "& .MuiInputLabel-root": { color: "#ef4444" },
      "& .MuiInputLabel-root.Mui-focused": { color: "#ef4444" },
    }),
  });

  const helperSx = { fontSize: "0.72rem", color: "#ef4444", mt: 0.25, ml: 0.5 };

  return (
    <>
      {/* ══════════════════ Main Form Dialog ══════════════════ */}
      <Dialog
        fullWidth
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            borderRadius: 2,
            width: 600,
            height: "90vh",
            maxHeight: "90vh",
            display: "flex",
            flexDirection: "column",
            backgroundColor: "background.paper",
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.5)"
              : "0 4px 24px rgba(0,0,0,0.08)",
          },
        }}
      >
        {/* ── Header — fixed, never scrolls ── */}
        <Box
          sx={{
            px: 3,
            py: 2,
            flexShrink: 0,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 3,
              height: 26,
              borderRadius: 1,
              backgroundColor: "#f5c52b",
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary" }}
          >
            {existingRequest ? "Edit Draft" : "Coverage Request Form"}
          </Typography>
        </Box>

        {/* ── Scrollable content area ── */}
        <DialogContent
          sx={{
            px: 3,
            py: 2.5,
            overflowY: "auto",
            flex: 1,
            // Custom scrollbar styling
            "&::-webkit-scrollbar": { width: 6 },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: isDark ? "#333" : "#ddd",
              borderRadius: 3,
            },
            "&::-webkit-scrollbar-thumb:hover": { background: "#f5c52b" },
          }}
        >
          {/* ── Event Details ── */}
          <FormSection label="Event Details">
            <TextField
              label="Event Title"
              fullWidth
              margin="dense"
              value={title}
              required
              disabled={loading}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value) setErrors((p) => ({ ...p, title: "" }));
              }}
              error={!!errors.title}
              helperText={errors.title}
              sx={errorFieldSx(!!errors.title)}
              FormHelperTextProps={{ sx: helperSx }}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              margin="dense"
              value={description}
              required
              disabled={loading}
              onChange={(e) => {
                setDescription(e.target.value);
                if (e.target.value)
                  setErrors((p) => ({ ...p, description: "" }));
              }}
              error={!!errors.description}
              helperText={errors.description}
              sx={errorFieldSx(!!errors.description)}
              FormHelperTextProps={{ sx: helperSx }}
            />

            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
                <Box sx={{ flex: 5, minWidth: 0 }}>
                  <DatePicker
                    label="Event Date"
                    value={date}
                    disabled={loading}
                    onChange={(val) => {
                      setDate(val);
                      if (val) setErrors((p) => ({ ...p, date: "" }));
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: "dense",
                        error: !!errors.date,
                        helperText: errors.date,
                        sx: errorFieldSx(!!errors.date),
                        FormHelperTextProps: { sx: helperSx },
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 3, minWidth: 0 }}>
                  <TimePicker
                    label="From"
                    value={fromTime}
                    disabled={loading}
                    onChange={(val) => {
                      setFromTime(val);
                      if (val) setErrors((p) => ({ ...p, fromTime: "" }));
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: "dense",
                        error: !!errors.fromTime,
                        helperText: errors.fromTime,
                        sx: errorFieldSx(!!errors.fromTime),
                        FormHelperTextProps: { sx: helperSx },
                      },
                    }}
                  />
                </Box>
                <Box sx={{ flex: 3, minWidth: 0 }}>
                  <TimePicker
                    label="To"
                    value={toTime}
                    disabled={loading}
                    onChange={(val) => {
                      setToTime(val);
                      if (val) setErrors((p) => ({ ...p, toTime: "" }));
                    }}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        margin: "dense",
                        error: !!errors.toTime,
                        helperText: errors.toTime,
                        sx: errorFieldSx(!!errors.toTime),
                        FormHelperTextProps: { sx: helperSx },
                      },
                    }}
                  />
                </Box>
              </Box>
            </LocalizationProvider>

            <TextField
              label="Venue"
              fullWidth
              margin="dense"
              value={venue}
              required
              disabled={loading}
              onChange={(e) => {
                setVenue(e.target.value);
                if (e.target.value) setErrors((p) => ({ ...p, venue: "" }));
              }}
              error={!!errors.venue}
              helperText={errors.venue}
              sx={errorFieldSx(!!errors.venue)}
              FormHelperTextProps={{ sx: helperSx }}
            />
          </FormSection>

          {/* ── Services Needed ── */}
          <FormSection label="Services Needed">
            <Typography
              sx={{ fontSize: "0.78rem", color: "text.secondary", mb: 1.5 }}
            >
              Select services and specify the number of staff required for each.
            </Typography>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
              {SERVICES.map((service) => {
                const isChecked = services[service] > 0;
                return (
                  <Box
                    key={service}
                    onClick={() => {
                      if (loading) return;
                      setServices((prev) => {
                        const updated = {
                          ...prev,
                          [service]: prev[service] > 0 ? 0 : 1,
                        };
                        if (
                          Object.values(updated).reduce((s, v) => s + v, 0) > 0
                        )
                          setErrors((p) => ({ ...p, services: "" }));
                        return updated;
                      });
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      px: 1.5,
                      py: 1,
                      borderRadius: 1.5,
                      border: "1px solid",
                      borderColor: isChecked
                        ? "#f5c52b"
                        : errors.services
                          ? "#ef4444"
                          : "divider",
                      backgroundColor: isChecked
                        ? isDark
                          ? "#1e1800"
                          : "#fffbeb"
                        : isDark
                          ? "#1a1a1a"
                          : "#fafafa",
                      cursor: loading ? "default" : "pointer",
                      transition: "border-color 0.15s, background-color 0.15s",
                      "&:hover": !loading ? { borderColor: "#f5c52b" } : {},
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 14,
                          height: 14,
                          borderRadius: "3px",
                          border: "1.5px solid",
                          borderColor: isChecked ? "#f5c52b" : "divider",
                          backgroundColor: isChecked
                            ? "#f5c52b"
                            : "transparent",
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {isChecked && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "1px",
                              backgroundColor: "#111827",
                            }}
                          />
                        )}
                      </Box>
                      <Typography
                        sx={{ fontSize: "0.83rem", color: "text.primary" }}
                      >
                        {service}
                      </Typography>
                    </Box>
                    <TextField
                      type="number"
                      size="small"
                      value={services[service]}
                      onChange={(e) => {
                        e.stopPropagation();
                        const val = Math.max(0, Number(e.target.value));
                        setServices((prev) => {
                          const updated = { ...prev, [service]: val };
                          if (
                            Object.values(updated).reduce((s, v) => s + v, 0) >
                            0
                          )
                            setErrors((p) => ({ ...p, services: "" }));
                          return updated;
                        });
                      }}
                      onClick={(e) => e.stopPropagation()}
                      inputProps={{ min: 0, max: 5 }}
                      disabled={!isChecked || loading}
                      sx={{
                        width: 80,
                        "& .MuiInputBase-input": {
                          fontSize: "0.82rem",
                          textAlign: "center",
                          py: 0.6,
                        },
                        "& .MuiOutlinedInput-root": { borderRadius: 1 },
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
            {errors.services && (
              <Typography sx={{ ...helperSx, mt: 0.75 }}>
                {errors.services}
              </Typography>
            )}
          </FormSection>

          {/* ── Client Information ── */}
          <FormSection label="Client Information">
            <TextField
              label="Contact Person"
              fullWidth
              margin="dense"
              value={contactPerson}
              required
              disabled={loading}
              onChange={(e) => {
                setContactPerson(e.target.value);
                if (e.target.value)
                  setErrors((p) => ({ ...p, contactPerson: "" }));
              }}
              error={!!errors.contactPerson}
              helperText={errors.contactPerson}
              sx={errorFieldSx(!!errors.contactPerson)}
              FormHelperTextProps={{ sx: helperSx }}
            />
            <TextField
              label="Contact Info (phone / messenger / email)"
              fullWidth
              margin="dense"
              value={contactInfo}
              required
              disabled={loading}
              onChange={(e) => {
                setContactInfo(e.target.value);
                if (e.target.value)
                  setErrors((p) => ({ ...p, contactInfo: "" }));
              }}
              error={!!errors.contactInfo}
              helperText={errors.contactInfo}
              sx={errorFieldSx(!!errors.contactInfo)}
              FormHelperTextProps={{ sx: helperSx }}
            />

            <Box sx={{ display: "flex", gap: 1, mt: 0.5 }}>
              {/* Client Type */}
              <FormControl
                fullWidth
                margin="dense"
                required
                error={!!errors.clientType}
                sx={fieldSx}
              >
                <InputLabel
                  sx={{
                    fontSize: "0.85rem",
                    ...(errors.clientType && { color: "#ef4444" }),
                  }}
                >
                  Client Type
                </InputLabel>
                <Select
                  label="Client Type"
                  value={clientType}
                  disabled={loading}
                  onChange={(e) => {
                    setClientType(e.target.value);
                    if (e.target.value)
                      setErrors((p) => ({ ...p, clientType: "" }));
                  }}
                  sx={{
                    borderRadius: 1.5,
                    fontSize: "0.85rem",
                    ...(errors.clientType && {
                      "& fieldset": { borderColor: "#ef4444" },
                    }),
                  }}
                >
                  {clientTypes.map((type) => (
                    <MenuItem
                      key={type.id}
                      value={type.id}
                      sx={{ fontSize: "0.85rem" }}
                    >
                      {type.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.clientType && (
                  <FormHelperText sx={helperSx}>
                    {errors.clientType}
                  </FormHelperText>
                )}
              </FormControl>

              {/* Entity — always rendered, disabled until clientType is set */}
              <FormControl
                fullWidth
                margin="dense"
                required
                error={!!errors.entity}
                disabled={!clientType || entitiesLoading || loading}
                sx={fieldSx}
              >
                <InputLabel
                  sx={{
                    fontSize: "0.85rem",
                    ...(errors.entity && { color: "#ef4444" }),
                  }}
                >
                  {entitiesLoading ? "Loading…" : "Entity Name"}
                </InputLabel>
                <Select
                  label={entitiesLoading ? "Loading…" : "Entity Name"}
                  value={entity}
                  onChange={(e) => {
                    setEntity(e.target.value);
                    setOtherEntity("");
                    if (e.target.value)
                      setErrors((p) => ({ ...p, entity: "", otherEntity: "" }));
                  }}
                  MenuProps={{
                    PaperProps: { sx: { maxHeight: 240, overflowY: "auto" } },
                    MenuListProps: {
                      style: { maxHeight: 240, overflow: "auto" },
                    },
                    getContentAnchorEl: null,
                    anchorOrigin: { vertical: "bottom", horizontal: "left" },
                    transformOrigin: { vertical: "top", horizontal: "left" },
                    disablePortal: false,
                  }}
                  sx={{
                    borderRadius: 1.5,
                    fontSize: "0.85rem",
                    ...(errors.entity && {
                      "& fieldset": { borderColor: "#ef4444" },
                    }),
                  }}
                >
                  {entities.map((ent) => (
                    <MenuItem
                      key={ent.id}
                      value={ent.id}
                      sx={{ fontSize: "0.85rem" }}
                    >
                      {ent.name}
                    </MenuItem>
                  ))}
                  <MenuItem
                    value={OTHER_ID}
                    sx={{
                      fontSize: "0.85rem",
                      fontStyle: "italic",
                      borderTop: "1px solid",
                      borderColor: "divider",
                      color: "text.secondary",
                    }}
                  >
                    Others (specify below)
                  </MenuItem>
                </Select>
                {errors.entity && (
                  <FormHelperText sx={helperSx}>{errors.entity}</FormHelperText>
                )}
              </FormControl>
            </Box>

            {/* Free-text — only shown when Others is selected */}
            {isOthers && (
              <TextField
                label="Specify Entity Name"
                fullWidth
                margin="dense"
                value={otherEntity}
                onChange={(e) => {
                  setOtherEntity(e.target.value);
                  if (e.target.value)
                    setErrors((p) => ({ ...p, otherEntity: "" }));
                }}
                placeholder="e.g. Office of the President, Engineering Department..."
                required
                disabled={loading}
                error={!!errors.otherEntity}
                helperText={errors.otherEntity}
                sx={errorFieldSx(!!errors.otherEntity)}
                FormHelperTextProps={{ sx: helperSx }}
              />
            )}
          </FormSection>

          {/* ── Attachment ── */}
          <FormSection label="Attachment">
            <Button
              variant="outlined"
              component="label"
              disabled={loading}
              size="small"
              sx={{
                textTransform: "none",
                fontSize: "0.82rem",
                borderRadius: 1.5,
                borderColor: errors.file ? "#ef4444" : "divider",
                color: errors.file ? "#ef4444" : "text.secondary",
                "&:hover": { borderColor: "#f5c52b", color: "text.primary" },
              }}
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

            {errors.file && (
              <Typography sx={{ ...helperSx, mt: 0.5 }}>
                {errors.file}
              </Typography>
            )}

            {file ? (
              <Typography sx={{ mt: 1, fontSize: "0.8rem", color: "#15803d" }}>
                ✓ {file.name}
              </Typography>
            ) : existingRequest?.file_url ? (
              <Typography
                sx={{ mt: 1, fontSize: "0.8rem", color: "text.secondary" }}
              >
                Current:{" "}
                {existingRequest.file_url.split("/").pop().replace(/^\d+_/, "")}
              </Typography>
            ) : null}
          </FormSection>
        </DialogContent>

        {/* ── Footer — fixed, never scrolls ── */}
        <Box
          sx={{
            px: 3,
            py: 1.75,
            flexShrink: 0,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            backgroundColor: isDark ? "#161616" : "#fafafa",
          }}
        >
          <Button
            onClick={handleClose}
            disabled={loading}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              color: "text.secondary",
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            size="small"
            disabled={loading}
            onClick={() => {
              if (!validate()) return;
              setErrors(EMPTY_ERRORS);
              setConfirmOpen(true);
            }}
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#f5c52b",
              color: "#111827",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
            }}
          >
            Submit
          </Button>
        </Box>
      </Dialog>

      {/* ══════════════════ Confirmation Dialog ══════════════════ */}
      <Dialog
        open={confirmOpen}
        onClose={() => !loading && setConfirmOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: 2,
            backgroundColor: "background.paper",
            boxShadow: isDark
              ? "0 8px 32px rgba(0,0,0,0.5)"
              : "0 4px 24px rgba(0,0,0,0.08)",
          },
        }}
      >
        <Box
          sx={{
            px: 3,
            py: 2,
            borderBottom: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              width: 3,
              height: 22,
              borderRadius: 1,
              backgroundColor: "#f5c52b",
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary" }}
          >
            Confirm Submission
          </Typography>
        </Box>

        <DialogContent sx={{ pt: 2 }}>
          <Typography
            sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.6 }}
          >
            Do you want to submit this request now, or save it as a draft?
          </Typography>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              mt: 1.25,
              p: 1.25,
              borderRadius: 1.5,
              backgroundColor: isDark ? "#1a1a1a" : "#f9fafb",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <InfoOutlinedIcon
              sx={{ fontSize: 14, color: "text.secondary", flexShrink: 0 }}
            />
            <Typography
              sx={{
                fontSize: "0.78rem",
                color: "text.secondary",
                lineHeight: 1.5,
              }}
            >
              Once submitted, the request can no longer be edited.
            </Typography>
          </Box>

          {submitError && (
            <Alert
              severity="error"
              sx={{ mt: 2, borderRadius: 1.5, fontSize: "0.82rem" }}
            >
              {submitError}
            </Alert>
          )}
          {loading && (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 2 }}>
              <CircularProgress size={20} sx={{ color: "#f5c52b" }} />
            </Box>
          )}
        </DialogContent>

        <Box
          sx={{
            px: 3,
            py: 1.75,
            borderTop: "1px solid",
            borderColor: "divider",
            display: "flex",
            justifyContent: "flex-end",
            gap: 1,
            backgroundColor: isDark ? "#161616" : "#fafafa",
          }}
        >
          <Button
            onClick={() => submitForm(true)}
            disabled={loading}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              color: "text.secondary",
            }}
          >
            Save as Draft
          </Button>
          <Button
            variant="contained"
            onClick={() => submitForm(false)}
            disabled={loading}
            size="small"
            sx={{
              textTransform: "none",
              fontSize: "0.82rem",
              fontWeight: 600,
              backgroundColor: "#f5c52b",
              color: "#111827",
              boxShadow: "none",
              "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
            }}
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
      <Typography
        sx={{
          fontSize: "0.68rem",
          fontWeight: 700,
          color: "text.secondary",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          mb: 1,
          pb: 0.75,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {label}
      </Typography>
      {children}
    </Box>
  );
}
