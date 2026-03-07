// src/pages/sechead/SectionHeadAssignment.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Button, Typography, CircularProgress, Dialog,
  DialogContent, Chip, Divider, Avatar,
  IconButton, Alert, Checkbox, FormGroup, useTheme,
} from "@mui/material";
import { DataGrid }                from "@mui/x-data-grid";
import CloseIcon                   from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PersonAddOutlinedIcon       from "@mui/icons-material/PersonAddOutlined";
import { supabase }                from "../../lib/supabaseClient";

const getInitials = (name) => {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage.from("coverage-files").getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};

const SECTION_SERVICE_MAP = {
  News:            "News Article",
  Photojournalism: "Photo Documentation",
  Videojournalism: "Video Documentation",
};

const jsDateToDutyDay = (dateStr) => {
  if (!dateStr) return null;
  const day = new Date(dateStr).getDay();
  if (day === 0 || day === 6) return null;
  return day - 1;
};

const isWeekendDate = (dateStr) => {
  if (!dateStr) return false;
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
};

export default function SectionHeadAssignment() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [requests,         setRequests]         = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [error,            setError]            = useState("");
  const [currentUser,      setCurrentUser]      = useState(null);
  const [selectedRequest,  setSelectedRequest]  = useState(null);
  const [staffers,         setStaffers]         = useState([]);
  const [staffersLoading,  setStaffersLoading]  = useState(false);
  const [selectedStaffers, setSelectedStaffers] = useState([]);
  const [assignLoading,    setAssignLoading]    = useState(false);
  const [assignError,      setAssignError]      = useState("");
  const [isWeekend,        setIsWeekend]        = useState(false);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles").select("id, full_name, role, section, division")
        .eq("id", user.id).single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  const loadRequests = useCallback(async () => {
    if (!currentUser?.section) return;
    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("coverage_requests")
        .select(`
          id, title, description, event_date, from_time, to_time,
          venue, services, status, contact_person, contact_info,
          file_url, forwarded_sections, forwarded_at, submitted_at,
          client_type:client_type_id ( id, name ),
          entity:entity_id ( id, name )
        `)
        .eq("status", "Forwarded")
        .contains("forwarded_sections", [currentUser.section])
        .order("forwarded_at", { ascending: false });
      if (fetchError) throw fetchError;
      setRequests(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => { if (currentUser) loadRequests(); }, [currentUser, loadRequests]);

  useEffect(() => {
    if (!selectedRequest || !currentUser?.section) return;
    async function loadStaffers() {
      setStaffersLoading(true);
      setStaffers([]);
      setSelectedStaffers([]);

      const eventDate = selectedRequest.event_date;
      const weekend   = isWeekendDate(eventDate);
      setIsWeekend(weekend);
      const dutyDay = jsDateToDutyDay(eventDate);

      const { data: semester } = await supabase.from("semesters").select("id").eq("is_active", true).single();
      const { data: allProfiles } = await supabase
        .from("profiles").select("id, full_name, section, role")
        .eq("section", currentUser.section).eq("is_active", true);

      if (!allProfiles || allProfiles.length === 0) { setStaffers([]); setStaffersLoading(false); return; }

      let eligibleProfiles = allProfiles;
      if (!weekend && dutyDay !== null && semester?.id) {
        const { data: dutySchedules } = await supabase
          .from("duty_schedules").select("staffer_id")
          .eq("semester_id", semester.id).eq("duty_day", dutyDay);
        const eligibleIds = new Set((dutySchedules || []).map((d) => d.staffer_id));
        eligibleProfiles = allProfiles.filter((p) => eligibleIds.has(p.id));
      }

      let assignmentCounts = {};
      if (semester?.id && eligibleProfiles.length > 0) {
        const eligibleIds = eligibleProfiles.map((p) => p.id);
        const { data: assignments } = await supabase
          .from("coverage_assignments").select("assigned_to").in("assigned_to", eligibleIds);
        (assignments || []).forEach((a) => {
          assignmentCounts[a.assigned_to] = (assignmentCounts[a.assigned_to] || 0) + 1;
        });
      }

      const sorted = eligibleProfiles
        .map((p) => ({ ...p, assignmentCount: assignmentCounts[p.id] || 0 }))
        .sort((a, b) => a.assignmentCount - b.assignmentCount);

      setStaffers(sorted);
      setStaffersLoading(false);
    }
    loadStaffers();
  }, [selectedRequest, currentUser]);

  const handleAssign = async () => {
    if (selectedStaffers.length === 0) { setAssignError("Please select at least one staffer."); return; }
    setAssignLoading(true);
    setAssignError("");
    try {
      const assignments = selectedStaffers.map((stafferId) => ({
        request_id:  selectedRequest.id,
        assigned_to: stafferId,
        assigned_by: currentUser.id,
        section:     currentUser.section,
      }));
      const { error: assignErr } = await supabase.from("coverage_assignments").insert(assignments);
      if (assignErr) throw assignErr;

      const { data: existingAssignments } = await supabase
        .from("coverage_assignments").select("section").eq("request_id", selectedRequest.id);
      const assignedSections = [...new Set(existingAssignments.map((a) => a.section))];
      const allAssigned = selectedRequest.forwarded_sections.every((s) => assignedSections.includes(s));
      if (allAssigned) {
        await supabase.from("coverage_requests").update({ status: "Assigned" }).eq("id", selectedRequest.id);
      }
      setSelectedRequest(null);
      loadRequests();
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssignLoading(false);
    }
  };

  const getPaxForSection = (request) => {
    if (!currentUser?.section || !request?.services) return "—";
    return request.services[SECTION_SERVICE_MAP[currentUser.section]] || "—";
  };

  const dataGridSx = {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: "0.9rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-cell":            { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-columnHeaders":   { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", backgroundColor: isDark ? "#2a2a2a" : "#fafafa", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-footerContainer": { backgroundColor: isDark ? "#1e1e1e" : "#fff", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-row:hover":       { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":     { color: "text.secondary" },
  };

  const rows = requests.map((req) => ({
    id:            req.id,
    requestTitle:  req.title,
    client:        req.entity?.name || "—",
    eventDate:     req.event_date ? new Date(req.event_date).toLocaleDateString() : "—",
    paxNeeded:     getPaxForSection(req),
    dateForwarded: req.forwarded_at ? new Date(req.forwarded_at).toLocaleDateString() : "—",
    ...req,
  }));

  const columns = [
    { field: "requestTitle",  headerName: "Event Title",    flex: 1.4, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "client",        headerName: "Client",         flex: 1,   renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "eventDate",     headerName: "Event Date",     flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    {
      field: "paxNeeded", headerName: "Pax Needed", flex: 0.7,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip label={`${p.value} pax`} size="small"
            sx={{ fontSize: "0.78rem", backgroundColor: isDark ? "#0d2137" : "#e3f2fd", color: "#1565c0", fontWeight: 500 }} />
        </Box>
      ),
    },
    { field: "dateForwarded", headerName: "Date Forwarded", flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    {
      field: "actions", headerName: "Actions", flex: 0.8, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Button variant="outlined" size="small"
            onClick={() => { setAssignError(""); setSelectedRequest(p.row); }}
            sx={{ textTransform: "none", fontSize: "0.8rem" }}>
            Assign
          </Button>
        </Box>
      ),
    },
  ];

  if (!currentUser) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
      <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default" }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          Requests forwarded to your section ({currentUser.section}) that need staffer assignment.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 1.5 }}>{error}</Alert>}

      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid rows={rows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick sx={dataGridSx} />
        )}
      </Box>

      {/* ── Assignment Dialog ── */}
      <Dialog
        open={!!selectedRequest}
        onClose={() => !assignLoading && setSelectedRequest(null)}
        fullWidth maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 2,
            height: { md: "90vh" }, maxHeight: "95vh",
            backgroundColor: "background.paper",
            boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.08)",
          },
        }}
      >
        {/* ── Header ── */}
        <Box sx={{
          px: 3, py: 2,
          borderBottom: "1px solid", borderColor: "divider",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Box sx={{ width: 3, height: 28, borderRadius: 1, backgroundColor: "#f5c52b", flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary", lineHeight: 1.3 }}>
                {selectedRequest?.title}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}>
                {selectedRequest?.forwarded_at
                  ? `Forwarded ${new Date(selectedRequest.forwarded_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : "Forwarded date unknown"}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, backgroundColor: isDark ? "#1e0a2e" : "#f3e8ff", border: "1px solid #7c3aed30" }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#7c3aed", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                {currentUser.section}
              </Typography>
            </Box>
            {isWeekend && (
              <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, backgroundColor: isDark ? "#1e1000" : "#fff7ed", border: "1px solid #c2410c30" }}>
                <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#c2410c", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                  Weekend
                </Typography>
              </Box>
            )}
            <IconButton onClick={() => setSelectedRequest(null)} size="small" disabled={assignLoading} sx={{ color: "text.secondary" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* ── Body ── */}
        <DialogContent sx={{
          p: 0, display: "flex",
          flexDirection: { xs: "column", md: "row" },
          overflow: { xs: "auto", md: "hidden" },
          minHeight: 0,
        }}>
          {/* Left: Request Details */}
          <Box sx={{ flex: 1, px: 3, py: 3, overflowY: { xs: "visible", md: "auto" }, minWidth: 0 }}>

            <Section label="Event Information">
              <InfoGrid rows={[
                ["Event Title", selectedRequest?.title],
                ["Description", selectedRequest?.description],
                ["Date",        selectedRequest?.event_date || "—"],
                ["Time",        selectedRequest?.from_time && selectedRequest?.to_time
                  ? `${selectedRequest.from_time} – ${selectedRequest.to_time}` : "—"],
                ["Venue",       selectedRequest?.venue || "—"],
              ]} />
            </Section>

            <Section label="Coverage Requirements">
              <Box sx={{
                display: "inline-flex", px: 1.25, py: 0.5, borderRadius: 1,
                border: "1px solid", borderColor: isDark ? "#0d2137" : "#bfdbfe",
                backgroundColor: isDark ? "#0d2137" : "#eff6ff",
              }}>
                <Typography sx={{ fontSize: "0.8rem", color: "#1565c0", fontWeight: 600 }}>
                  {getPaxForSection(selectedRequest)} pax
                  <Typography component="span" sx={{ fontSize: "0.78rem", color: "text.secondary", fontWeight: 400 }}>
                    {" "}for {currentUser.section}
                  </Typography>
                </Typography>
              </Box>
            </Section>

            <Section label="Client Details">
              <InfoGrid rows={[
                ["Organization",   selectedRequest?.entity?.name || "—"],
                ["Contact Person", selectedRequest?.contact_person || "—"],
                ["Contact Info",   selectedRequest?.contact_info || "—"],
              ]} />
            </Section>

            <Section label="Attachment">
              {selectedRequest?.file_url ? (
                <Box onClick={() => openFile(selectedRequest.file_url)}
                  sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, cursor: "pointer", color: "#1976d2", "&:hover": { textDecoration: "underline" } }}>
                  <InsertDriveFileOutlinedIcon sx={{ fontSize: 15 }} />
                  <Typography sx={{ fontSize: "0.85rem" }}>{getFileName(selectedRequest.file_url)}</Typography>
                </Box>
              ) : (
                <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>No file attached</Typography>
              )}
            </Section>
          </Box>

          <Divider orientation="horizontal" flexItem sx={{ display: { xs: "block", md: "none" } }} />
          <Divider orientation="vertical"   flexItem sx={{ display: { xs: "none",  md: "flex" } }} />

          {/* Right: Staffer Selection */}
          <Box sx={{
            width: { xs: "100%", md: 290 }, flexShrink: 0,
            px: 2.5, py: 3,
            backgroundColor: isDark ? "#161616" : "#fafafa",
            overflowY: { xs: "visible", md: "auto" },
            display: "flex", flexDirection: "column", gap: 1.5,
          }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.5 }}>
              <PersonAddOutlinedIcon sx={{ fontSize: 13, color: "#f5c52b" }} />
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                Select Staffers
              </Typography>
            </Box>

            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary", lineHeight: 1.6 }}>
              {isWeekend
                ? "Weekend event — all staffers shown, sorted by least assignments."
                : `Showing staffers on duty for ${new Date(selectedRequest?.event_date).toLocaleDateString("en-US", { weekday: "long" })}, sorted by least assignments.`}
            </Typography>

            {assignError && (
              <Alert severity="error" sx={{ borderRadius: 1.5, fontSize: "0.78rem" }}>{assignError}</Alert>
            )}

            {staffersLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={18} sx={{ color: "#f5c52b" }} />
              </Box>
            ) : staffers.length === 0 ? (
              <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", textAlign: "center", py: 2 }}>
                No eligible staffers found for this event day.
              </Typography>
            ) : (
              <FormGroup sx={{ gap: 1 }}>
                {staffers.map((staffer) => {
                  const isSelected = selectedStaffers.includes(staffer.id);
                  return (
                    <Box key={staffer.id}
                      onClick={() => setSelectedStaffers((prev) =>
                        prev.includes(staffer.id) ? prev.filter((id) => id !== staffer.id) : [...prev, staffer.id]
                      )}
                      sx={{
                        display: "flex", alignItems: "center", gap: 1.5,
                        p: 1.25, borderRadius: 1.5,
                        border: "1px solid",
                        borderColor: isSelected ? "#f5c52b" : "divider",
                        backgroundColor: isSelected ? (isDark ? "#1e1800" : "#fffbeb") : "background.paper",
                        cursor: "pointer",
                        transition: "border-color 0.15s, background-color 0.15s",
                        "&:hover": { borderColor: "#f5c52b" },
                      }}
                    >
                      <Avatar sx={{
                        width: 34, height: 34, fontSize: "0.78rem", fontWeight: 700,
                        backgroundColor: isSelected ? "#f5c52b" : (isDark ? "#333" : "#e5e7eb"),
                        color: isSelected ? "#111827" : "text.secondary",
                      }}>
                        {getInitials(staffer.full_name)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontSize: "0.83rem", fontWeight: 600, color: "text.primary" }}>
                          {staffer.full_name}
                        </Typography>
                        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary" }}>
                          {staffer.assignmentCount === 0
                            ? "No assignments yet"
                            : `${staffer.assignmentCount} assignment${staffer.assignmentCount > 1 ? "s" : ""}`}
                        </Typography>
                      </Box>
                      <Checkbox checked={isSelected} size="small"
                        sx={{ p: 0, color: "divider", "&.Mui-checked": { color: "#f5c52b" } }} />
                    </Box>
                  );
                })}
              </FormGroup>
            )}

            {selectedStaffers.length > 0 && (
              <Box sx={{
                p: 1.25, borderRadius: 1.5,
                backgroundColor: isDark ? "#1e1800" : "#fffbeb",
                border: "1px solid #f5c52b",
              }}>
                <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#d97706" }}>
                  {selectedStaffers.length} staffer{selectedStaffers.length > 1 ? "s" : ""} selected
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>

        {/* ── Footer ── */}
        <Box sx={{
          px: 3, py: 1.75,
          borderTop: "1px solid", borderColor: "divider",
          display: "flex", justifyContent: "flex-end", gap: 1,
          backgroundColor: isDark ? "#161616" : "#fafafa",
        }}>
          <Button onClick={() => setSelectedRequest(null)} disabled={assignLoading} size="small"
            sx={{ textTransform: "none", fontSize: "0.82rem", color: "text.secondary" }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleAssign} disabled={assignLoading} size="small"
            sx={{ textTransform: "none", fontSize: "0.82rem", fontWeight: 600, backgroundColor: "#f5c52b", color: "#111827", boxShadow: "none", "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" } }}>
            {assignLoading ? <CircularProgress size={16} sx={{ color: "#111827" }} /> : "Confirm Assignment"}
          </Button>
        </Box>
      </Dialog>
    </Box>
  );
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({ label, children }) {
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

// ── Info grid ────────────────────────────────────────────────────────────────
function InfoGrid({ rows }) {
  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "140px 1fr", rowGap: 0.6, columnGap: 1, alignItems: "start" }}>
      {rows.map(([label, value]) => (
        <React.Fragment key={label}>
          <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", pt: 0.2 }}>{label}</Typography>
          <Typography sx={{ fontSize: "0.85rem", color: "text.primary", lineHeight: 1.5 }}>{value || "—"}</Typography>
        </React.Fragment>
      ))}
    </Box>
  );
}

// ── Cell text helper ─────────────────────────────────────────────────────────
function CellText({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography sx={{ fontSize: "0.9rem", color: "text.primary" }}>{children}</Typography>
    </Box>
  );
}