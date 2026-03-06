// src/pages/sechead/SectionHeadAssignment.jsx
import React, { useState, useEffect, useCallback } from "react";
import {
  Box, Button, Typography, CircularProgress, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, Divider, Avatar,
  IconButton, Alert, Checkbox, FormGroup,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import CloseIcon from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import PersonAddOutlinedIcon from "@mui/icons-material/PersonAddOutlined";
import WeekendOutlinedIcon from "@mui/icons-material/WeekendOutlined";
import { supabase } from "../../lib/supabaseClient";

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
  News: "News Article",
  Photojournalism: "Photo Documentation",
  Videojournalism: "Video Documentation",
};

// JS getDay() → duty_day (0=Mon...4=Fri), returns null for weekend
const jsDateToDutyDay = (dateStr) => {
  if (!dateStr) return null;
  const day = new Date(dateStr).getDay(); // 0=Sun, 1=Mon...6=Sat
  if (day === 0 || day === 6) return null; // weekend
  return day - 1; // Mon=0, Tue=1, Wed=2, Thu=3, Fri=4
};

const isWeekendDate = (dateStr) => {
  if (!dateStr) return false;
  const day = new Date(dateStr).getDay();
  return day === 0 || day === 6;
};

export default function SectionHeadAssignment() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Dialog
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [staffers, setStaffers] = useState([]);
  const [staffersLoading, setStaffersLoading] = useState(false);
  const [selectedStaffers, setSelectedStaffers] = useState([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState("");
  const [isWeekend, setIsWeekend] = useState(false);

  // ── Get current sec head profile ──
  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, section, division")
        .eq("id", user.id)
        .single();
      setCurrentUser(profile);
    }
    loadUser();
  }, []);

  // ── Fetch forwarded requests ──
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

  useEffect(() => {
    if (currentUser) loadRequests();
  }, [currentUser, loadRequests]);

  // ── Fetch staffers when dialog opens ──
  // Logic:
  //   Weekday event → staffers whose duty_day matches the event's day
  //   Weekend event → all staffers in section
  //   Both cases   → sorted by assignment count ascending (fewest first)
  useEffect(() => {
    if (!selectedRequest || !currentUser?.section) return;

    async function loadStaffers() {
      setStaffersLoading(true);
      setStaffers([]);
      setSelectedStaffers([]);

      const eventDate = selectedRequest.event_date;
      const weekend = isWeekendDate(eventDate);
      setIsWeekend(weekend);
      const dutyDay = jsDateToDutyDay(eventDate);

      // 1. Get active semester
      const { data: semester } = await supabase
        .from("semesters")
        .select("id")
        .eq("is_active", true)
        .single();

      // 2. Get all profiles in this section
      const { data: allProfiles } = await supabase
        .from("profiles")
        .select("id, full_name, section, role")
        .eq("section", currentUser.section)
        .eq("is_active", true);

      if (!allProfiles || allProfiles.length === 0) {
        setStaffers([]);
        setStaffersLoading(false);
        return;
      }

      // 3. If weekday — filter by duty_day
      let eligibleProfiles = allProfiles;
      if (!weekend && dutyDay !== null && semester?.id) {
        const { data: dutySchedules } = await supabase
          .from("duty_schedules")
          .select("staffer_id")
          .eq("semester_id", semester.id)
          .eq("duty_day", dutyDay);

        const eligibleIds = new Set((dutySchedules || []).map((d) => d.staffer_id));
        eligibleProfiles = allProfiles.filter((p) => eligibleIds.has(p.id));
      }

      // 4. Get assignment counts for eligible staffers this semester
      let assignmentCounts = {};
      if (semester?.id && eligibleProfiles.length > 0) {
        const eligibleIds = eligibleProfiles.map((p) => p.id);

        const { data: assignments } = await supabase
          .from("coverage_assignments")
          .select("assigned_to")
          .in("assigned_to", eligibleIds);

        (assignments || []).forEach((a) => {
          assignmentCounts[a.assigned_to] = (assignmentCounts[a.assigned_to] || 0) + 1;
        });
      }

      // 5. Sort by assignment count ascending (fewest first)
      const sorted = eligibleProfiles
        .map((p) => ({ ...p, assignmentCount: assignmentCounts[p.id] || 0 }))
        .sort((a, b) => a.assignmentCount - b.assignmentCount);

      setStaffers(sorted);
      setStaffersLoading(false);
    }

    loadStaffers();
  }, [selectedRequest, currentUser]);

  // ── Assign staffers ──
  const handleAssign = async () => {
    if (selectedStaffers.length === 0) {
      setAssignError("Please select at least one staffer.");
      return;
    }
    setAssignLoading(true);
    setAssignError("");
    try {
      const assignments = selectedStaffers.map((stafferId) => ({
        request_id: selectedRequest.id,
        assigned_to: stafferId,
        assigned_by: currentUser.id,
        section: currentUser.section,
      }));

      const { error: assignErr } = await supabase
        .from("coverage_assignments")
        .insert(assignments);

      if (assignErr) throw assignErr;

      const { data: existingAssignments } = await supabase
        .from("coverage_assignments")
        .select("section")
        .eq("request_id", selectedRequest.id);

      const assignedSections = [...new Set(existingAssignments.map((a) => a.section))];
      const allAssigned = selectedRequest.forwarded_sections.every((s) =>
        assignedSections.includes(s)
      );

      if (allAssigned) {
        await supabase
          .from("coverage_requests")
          .update({ status: "Assigned" })
          .eq("id", selectedRequest.id);
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
    const serviceName = SECTION_SERVICE_MAP[currentUser.section];
    return request.services[serviceName] || "—";
  };

  const rows = requests.map((req) => ({
    id: req.id,
    requestTitle: req.title,
    client: req.entity?.name || "—",
    eventDate: req.event_date ? new Date(req.event_date).toLocaleDateString() : "—",
    paxNeeded: getPaxForSection(req),
    dateForwarded: req.forwarded_at ? new Date(req.forwarded_at).toLocaleDateString() : "—",
    ...req,
  }));

  const columns = [
    {
      field: "requestTitle", headerName: "Event Title", flex: 1.4,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "client", headerName: "Client", flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "eventDate", headerName: "Event Date", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "paxNeeded", headerName: "Pax Needed", flex: 0.7,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Chip
            label={`${params.value} pax`}
            size="small"
            sx={{ fontSize: "0.8rem", backgroundColor: "#e3f2fd", color: "#1565c0", fontWeight: 500 }}
          />
        </Box>
      ),
    },
    {
      field: "dateForwarded", headerName: "Date Forwarded", flex: 0.9,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "actions", headerName: "Actions", flex: 0.8, sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => { setAssignError(""); setSelectedRequest(params.row); }}
            sx={{ textTransform: "none" }}
          >
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
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "#f9f9f9" }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "#757575" }}>
          Requests forwarded to your section ({currentUser.section}) that need staffer assignment.
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      <Box sx={{ height: 500, width: "100%", bgcolor: "white", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid
            rows={rows}
            columns={columns}
            pageSize={7}
            rowsPerPageOptions={[7]}
            disableSelectionOnClick
            sx={{
              border: "none",
              fontFamily: "'Helvetica Neue', sans-serif",
              fontSize: "0.9rem",
              "& .MuiDataGrid-cell": { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none" },
              "& .MuiDataGrid-columnHeaders": { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem" },
            }}
          />
        )}
      </Box>

      {/* ── Assignment Dialog ── */}
      <Dialog
        open={!!selectedRequest}
        onClose={() => !assignLoading && setSelectedRequest(null)}
        fullWidth
        maxWidth="md"
        PaperProps={{ sx: { borderRadius: 3, height: "90vh" } }}
      >
        <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", pb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography sx={{ fontWeight: 700, fontSize: "1rem" }}>Assign Staffers</Typography>
            <Chip
              label={currentUser.section}
              size="small"
              sx={{ backgroundColor: "#f3e5f5", color: "#7b1fa2", fontWeight: 600, fontSize: "0.72rem" }}
            />
            {isWeekend && (
              <Chip
                icon={<WeekendOutlinedIcon sx={{ fontSize: "14px !important" }} />}
                label="Weekend Event"
                size="small"
                sx={{ backgroundColor: "#fff3e0", color: "#e65100", fontWeight: 600, fontSize: "0.72rem" }}
              />
            )}
          </Box>
          <IconButton onClick={() => setSelectedRequest(null)} size="small" disabled={assignLoading}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ py: 0, px: 0 }}>
          <Box sx={{ display: "flex", height: "100%" }}>

            {/* ── Left: Request Details ── */}
            <Box sx={{ flex: 1, px: 4, py: 3, overflowY: "auto" }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "150px 1fr", rowGap: 0.5, columnGap: 1, alignItems: "start" }}>
                <RowLabel>Event Title</RowLabel>
                <RowValue>{selectedRequest?.title}</RowValue>

                <RowLabel>Description</RowLabel>
                <RowValue>{selectedRequest?.description}</RowValue>

                <RowLabel>Event Date</RowLabel>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, pt: 0.3 }}>
                  <Typography sx={{ fontSize: "0.88rem", color: "#212121" }}>
                    {selectedRequest?.event_date || "—"}
                  </Typography>
                  {isWeekend && (
                    <Chip
                      label="Weekend"
                      size="small"
                      sx={{ fontSize: "0.7rem", backgroundColor: "#fff3e0", color: "#e65100", fontWeight: 600 }}
                    />
                  )}
                </Box>

                <RowLabel>Time</RowLabel>
                <RowValue>
                  {selectedRequest?.from_time && selectedRequest?.to_time
                    ? `${selectedRequest.from_time} - ${selectedRequest.to_time}`
                    : "—"}
                </RowValue>

                <RowLabel>Venue</RowLabel>
                <RowValue>{selectedRequest?.venue}</RowValue>

                <RowLabel>Pax Needed</RowLabel>
                <Box>
                  <Chip
                    label={`${getPaxForSection(selectedRequest)} pax for ${currentUser.section}`}
                    size="small"
                    sx={{ fontSize: "0.8rem", backgroundColor: "#e3f2fd", color: "#1565c0", fontWeight: 500 }}
                  />
                </Box>

                <RowLabel>Client</RowLabel>
                <RowValue>{selectedRequest?.entity?.name || "—"}</RowValue>

                <RowLabel>Contact Person</RowLabel>
                <RowValue>{selectedRequest?.contact_person}</RowValue>

                <RowLabel>Contact Info</RowLabel>
                <RowValue>{selectedRequest?.contact_info}</RowValue>

                <RowLabel>File Attachment</RowLabel>
                <Box>
                  {selectedRequest?.file_url ? (
                    <Box
                      onClick={() => openFile(selectedRequest.file_url)}
                      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, cursor: "pointer", color: "#1976d2", "&:hover": { textDecoration: "underline" } }}
                    >
                      <InsertDriveFileOutlinedIcon sx={{ fontSize: 16 }} />
                      <Typography sx={{ fontSize: "0.88rem" }}>{getFileName(selectedRequest.file_url)}</Typography>
                    </Box>
                  ) : (
                    <Typography sx={{ fontSize: "0.88rem", color: "#9e9e9e" }}>No file attached</Typography>
                  )}
                </Box>
              </Box>
            </Box>

            <Divider orientation="vertical" flexItem />

            {/* ── Right: Staffer Selection ── */}
            <Box sx={{ width: 300, px: 2.5, py: 3, backgroundColor: "#fafafa", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.8 }}>
                <PersonAddOutlinedIcon sx={{ fontSize: 16, color: "#f5c52b" }} />
                <Typography sx={{ fontWeight: 600, fontSize: "0.85rem" }}>Select Staffers</Typography>
              </Box>

              <Typography sx={{ fontSize: "0.78rem", color: "#9e9e9e" }}>
                {isWeekend
                  ? "Weekend event — showing all staffers sorted by least assignments."
                  : `Showing staffers on duty for ${new Date(selectedRequest?.event_date).toLocaleDateString("en-US", { weekday: "long" })}, sorted by least assignments.`
                }
              </Typography>

              {assignError && <Alert severity="error" sx={{ borderRadius: 2, fontSize: "0.8rem" }}>{assignError}</Alert>}

              {staffersLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={20} sx={{ color: "#f5c52b" }} />
                </Box>
              ) : staffers.length === 0 ? (
                <Typography sx={{ fontSize: "0.82rem", color: "#9e9e9e", textAlign: "center", py: 2 }}>
                  No eligible staffers found for this event day.
                </Typography>
              ) : (
                <FormGroup sx={{ gap: 1 }}>
                  {staffers.map((staffer) => {
                    const isSelected = selectedStaffers.includes(staffer.id);
                    return (
                      <Box
                        key={staffer.id}
                        onClick={() => setSelectedStaffers((prev) =>
                          prev.includes(staffer.id)
                            ? prev.filter((id) => id !== staffer.id)
                            : [...prev, staffer.id]
                        )}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                          p: 1.2,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: isSelected ? "#f5c52b" : "#e0e0e0",
                          backgroundColor: "white",
                          cursor: "pointer",
                          transition: "all 0.15s",
                          "&:hover": { borderColor: "#f5c52b" },
                        }}
                      >
                        <Avatar sx={{ width: 36, height: 36, fontSize: "0.8rem", fontWeight: 700, backgroundColor: isSelected ? "#f5c52b" : "#e0e0e0", color: isSelected ? "#212121" : "#9e9e9e" }}>
                          {getInitials(staffer.full_name)}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: "0.85rem", fontWeight: 500 }}>{staffer.full_name}</Typography>
                          <Typography sx={{ fontSize: "0.72rem", color: "#9e9e9e" }}>
                            {staffer.assignmentCount === 0
                              ? "No assignments yet"
                              : `${staffer.assignmentCount} assignment${staffer.assignmentCount > 1 ? "s" : ""}`}
                          </Typography>
                        </Box>
                        <Checkbox
                          checked={isSelected}
                          size="small"
                          sx={{ p: 0, color: "#e0e0e0", "&.Mui-checked": { color: "#f5c52b" } }}
                        />
                      </Box>
                    );
                  })}
                </FormGroup>
              )}

              {selectedStaffers.length > 0 && (
                <Box sx={{ p: 1.5, bgcolor: "#fffde7", borderRadius: 2, border: "1px solid #f5c52b" }}>
                  <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "#f57c00" }}>
                    {selectedStaffers.length} staffer/s selected
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 4, py: 2 }}>
          <Button onClick={() => setSelectedRequest(null)} disabled={assignLoading} sx={{ textTransform: "none", color: "#757575" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleAssign}
            disabled={assignLoading}
            sx={{ textTransform: "none", backgroundColor: "#f5c52b", color: "#212121", fontWeight: 600, "&:hover": { backgroundColor: "#e6b920" } }}
          >
            {assignLoading ? <CircularProgress size={18} sx={{ color: "#212121" }} /> : "Confirm Assignment"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function RowLabel({ children }) {
  return <Typography sx={{ fontSize: "0.82rem", color: "#9e9e9e", fontWeight: 500, pt: 0.3 }}>{children}</Typography>;
}

function RowValue({ children }) {
  return <Typography sx={{ fontSize: "0.88rem", color: "#212121" }}>{children || "—"}</Typography>;
}