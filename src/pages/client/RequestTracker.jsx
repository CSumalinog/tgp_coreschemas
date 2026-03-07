// src/pages/client/RequestTracker.jsx
import React, { useState, useEffect } from "react";
import {
  Box, Typography, CircularProgress, Tab, Tabs, useTheme,
  Dialog, DialogContent, IconButton, Button, Stack, Chip, Divider,
} from "@mui/material";
import CloseIcon                   from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import CheckCircleIcon             from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon    from "@mui/icons-material/RadioButtonUnchecked";
import { DataGrid }                from "@mui/x-data-grid";
import { useClientRequests }       from "../../hooks/useClientRequests";
import { supabase }                from "../../lib/supabaseClient";

// ── Helpers ──────────────────────────────────────────────────────────────────
const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};

const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage.from("coverage-files").getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

// ── Pipeline config ───────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: "Pending",   label: "Submitted",      sub: "Awaiting admin review" },
  { key: "Forwarded", label: "Under Review",   sub: "Forwarded to section" },
  { key: "Assigned",  label: "Staff Assigned", sub: "Staffers have been assigned" },
  { key: "Approved",  label: "Approved",       sub: "Request completed" },
];

const STATUS_CONFIG = {
  Pending:   { bg: "#fef3c7", color: "#d97706" },
  Forwarded: { bg: "#f3e8ff", color: "#7c3aed" },
  Assigned:  { bg: "#fff7ed", color: "#c2410c" },
  Approved:  { bg: "#dcfce7", color: "#15803d" },
  Declined:  { bg: "#fee2e2", color: "#dc2626" },
  Draft:     { bg: "#f3f4f6", color: "#6b7280" },
};

const getStageIndex = (status) => {
  const map = { Pending: 0, Forwarded: 1, Assigned: 2, Approved: 3 };
  return map[status] ?? -1;
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function RequestTracker() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [tab, setTab] = useState(0);

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default" }}>
      {/* Page header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary" }}>
          Track the status of your coverage requests from submission to completion.
        </Typography>
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: "1px solid", borderColor: "divider", mb: 3 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            minHeight: 40,
            "& .MuiTab-root": {
              textTransform: "none", fontSize: "0.82rem", fontWeight: 500,
              minHeight: 40, px: 2, color: "text.secondary",
            },
            "& .Mui-selected": { color: "text.primary", fontWeight: 700 },
            "& .MuiTabs-indicator": { backgroundColor: "#f5c52b", height: 2 },
          }}
        >
          <Tab label="Pipeline" />
          <Tab label="All Requests" />
          <Tab label="Pending" />
          <Tab label="Approved" />
          <Tab label="Declined" />
        </Tabs>
      </Box>

      {tab === 0 && <PipelineTab isDark={isDark} />}
      {tab === 1 && <AllRequestsTab isDark={isDark} />}
      {tab === 2 && <PendingTab isDark={isDark} />}
      {tab === 3 && <ApprovedTab isDark={isDark} />}
      {tab === 4 && <DeclinedTab isDark={isDark} />}
    </Box>
  );
}

// ── Pipeline Tab ─────────────────────────────────────────────────────────────
function PipelineTab({ isDark }) {
  const { requests, loading } = useClientRequests();
  const [selected, setSelected] = useState(null);

  // Only show active (non-draft, non-declined) requests
  const active = requests.filter((r) =>
    ["Pending", "Forwarded", "Assigned", "Approved"].includes(r.status)
  );

  if (loading) return <Loader />;

  if (active.length === 0) return (
    <Box sx={{ py: 8, textAlign: "center" }}>
      <Typography sx={{ fontSize: "0.88rem", color: "text.secondary" }}>
        No active requests in the pipeline.
      </Typography>
    </Box>
  );

  return (
    <>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {active.map((req) => (
          <PipelineCard
            key={req.id}
            request={req}
            isDark={isDark}
            onClick={() => setSelected(req)}
          />
        ))}
      </Box>
      <RequestDetailDialog
        open={!!selected}
        onClose={() => setSelected(null)}
        request={selected}
        isDark={isDark}
      />
    </>
  );
}

function PipelineCard({ request, isDark, onClick }) {
  const currentIdx = getStageIndex(request.status);
  const isDeclined = request.status === "Declined";

  return (
    <Box
      onClick={onClick}
      sx={{
        p: 2.5, borderRadius: 2,
        border: "1px solid", borderColor: "divider",
        backgroundColor: "background.paper",
        cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        "&:hover": {
          borderColor: "#f5c52b",
          boxShadow: isDark ? "0 2px 12px rgba(0,0,0,0.3)" : "0 2px 12px rgba(0,0,0,0.07)",
        },
      }}
    >
      {/* Card header */}
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2 }}>
        <Box>
          <Typography sx={{ fontWeight: 700, fontSize: "0.9rem", color: "text.primary", lineHeight: 1.3 }}>
            {request.title}
          </Typography>
          <Typography sx={{ fontSize: "0.75rem", color: "text.secondary", mt: 0.3 }}>
            {request.event_date || "—"} · {request.venue || "—"}
          </Typography>
        </Box>
        <Box sx={{
          px: 1.5, py: 0.4, borderRadius: 1, flexShrink: 0, ml: 2,
          backgroundColor: STATUS_CONFIG[request.status]?.bg || "#f3f4f6",
          border: `1px solid ${STATUS_CONFIG[request.status]?.color || "#9ca3af"}30`,
        }}>
          <Typography sx={{
            fontSize: "0.68rem", fontWeight: 700,
            color: STATUS_CONFIG[request.status]?.color || "#6b7280",
            letterSpacing: "0.07em", textTransform: "uppercase",
          }}>
            {request.status === "Forwarded" ? "Under Review" :
             request.status === "Assigned"  ? "Staff Assigned" : request.status}
          </Typography>
        </Box>
      </Box>

      {/* Stepper */}
      {!isDeclined ? (
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {PIPELINE_STAGES.map((stage, idx) => {
            const done    = idx < currentIdx;
            const current = idx === currentIdx;
            const future  = idx > currentIdx;
            return (
              <React.Fragment key={stage.key}>
                {/* Step */}
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 0, flex: 1 }}>
                  <Box sx={{ display: "flex", alignItems: "center", mb: 0.5 }}>
                    {done ? (
                      <CheckCircleIcon sx={{ fontSize: 18, color: "#15803d" }} />
                    ) : current ? (
                      <Box sx={{
                        width: 18, height: 18, borderRadius: "50%",
                        backgroundColor: "#f5c52b",
                        border: "2px solid #f5c52b",
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <Box sx={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#111827" }} />
                      </Box>
                    ) : (
                      <RadioButtonUncheckedIcon sx={{ fontSize: 18, color: isDark ? "#444" : "#d1d5db" }} />
                    )}
                  </Box>
                  <Typography sx={{
                    fontSize: "0.68rem", fontWeight: current ? 700 : 400, textAlign: "center",
                    color: done ? "#15803d" : current ? "text.primary" : "text.secondary",
                    lineHeight: 1.3, px: 0.5,
                  }}>
                    {stage.label}
                  </Typography>
                </Box>

                {/* Connector line */}
                {idx < PIPELINE_STAGES.length - 1 && (
                  <Box sx={{
                    height: 2, flex: 1, mx: 0.5, mb: 2.5, borderRadius: 1,
                    backgroundColor: idx < currentIdx
                      ? "#15803d"
                      : isDark ? "#333" : "#e5e7eb",
                    transition: "background-color 0.3s",
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </Box>
      ) : (
        <Box sx={{
          px: 1.5, py: 1, borderRadius: 1.5,
          backgroundColor: isDark ? "#1a0a0a" : "#fef2f2",
          borderLeft: "3px solid #dc2626",
        }}>
          <Typography sx={{ fontSize: "0.78rem", color: "#dc2626" }}>
            This request was declined.{request.declined_reason ? ` "${request.declined_reason}"` : ""}
          </Typography>
        </Box>
      )}

      {/* Sub-label for current stage */}
      {!isDeclined && (
        <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 1, textAlign: "center" }}>
          {PIPELINE_STAGES[currentIdx]?.sub || ""}
        </Typography>
      )}
    </Box>
  );
}

// ── All Requests Tab ──────────────────────────────────────────────────────────
function AllRequestsTab({ isDark }) {
  const { requests, loading } = useClientRequests();
  const [selected, setSelected] = useState(null);

  const rows = requests
    .filter((r) => r.status !== "Draft")
    .map((req) => ({
      id:             req.id,
      eventTitle:     req.title,
      submissionDate: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "—",
      eventDate:      req.event_date || "—",
      status:         req.status,
      _raw:           req,
    }));

  const dataGridSx = makeDataGridSx(isDark);

  const columns = [
    { field: "eventTitle",     headerName: "Event Title",     flex: 1.4, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "submissionDate", headerName: "Submitted",       flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "eventDate",      headerName: "Event Date",      flex: 0.9, renderCell: (p) => <CellText>{p.value}</CellText> },
    {
      field: "status", headerName: "Status", flex: 0.9,
      renderCell: (p) => {
        const cfg = STATUS_CONFIG[p.value] || { bg: "#f3f4f6", color: "#6b7280" };
        return (
          <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
            <Box sx={{ px: 1.25, py: 0.3, borderRadius: 1, backgroundColor: cfg.bg, border: `1px solid ${cfg.color}30` }}>
              <Typography sx={{ fontSize: "0.72rem", fontWeight: 700, color: cfg.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                {p.value === "Forwarded" ? "Under Review" : p.value === "Assigned" ? "Staff Assigned" : p.value}
              </Typography>
            </Box>
          </Box>
        );
      },
    },
    {
      field: "actions", headerName: "", flex: 0.6, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Button variant="outlined" size="small" onClick={() => setSelected(p.row._raw)}
            sx={{ textTransform: "none", fontSize: "0.78rem" }}>
            View
          </Button>
        </Box>
      ),
    },
  ];

  if (loading) return <Loader />;

  return (
    <>
      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        <DataGrid rows={rows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick sx={dataGridSx} />
      </Box>
      <RequestDetailDialog open={!!selected} onClose={() => setSelected(null)} request={selected} isDark={isDark} />
    </>
  );
}

// ── Pending Tab ───────────────────────────────────────────────────────────────
function PendingTab({ isDark }) {
  const { pending, loading } = useClientRequests();
  const [selected, setSelected] = useState(null);

  const rows = pending.map((req) => ({
    id:             req.id,
    eventTitle:     req.title,
    submissionDate: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "—",
    eventDate:      req.event_date || "—",
    _raw:           req,
  }));

  const columns = [
    { field: "eventTitle",     headerName: "Event Title",   flex: 1.4, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "submissionDate", headerName: "Submitted",     flex: 1,   renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "eventDate",      headerName: "Event Date",    flex: 1,   renderCell: (p) => <CellText>{p.value}</CellText> },
    {
      field: "actions", headerName: "", flex: 0.6, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Button variant="outlined" size="small" onClick={() => setSelected(p.row._raw)}
            sx={{ textTransform: "none", fontSize: "0.78rem" }}>View</Button>
        </Box>
      ),
    },
  ];

  if (loading) return <Loader />;

  return (
    <>
      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        <DataGrid rows={rows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick sx={makeDataGridSx(isDark)} />
      </Box>
      <RequestDetailDialog open={!!selected} onClose={() => setSelected(null)} request={selected} isDark={isDark} />
    </>
  );
}

// ── Approved Tab ──────────────────────────────────────────────────────────────
function ApprovedTab({ isDark }) {
  const { requests, loading } = useClientRequests();
  const [selected, setSelected] = useState(null);

  const approved = requests.filter((r) => r.status === "Approved");
  const rows = approved.map((req) => ({
    id:             req.id,
    eventTitle:     req.title,
    submissionDate: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "—",
    eventDate:      req.event_date || "—",
    _raw:           req,
  }));

  const columns = [
    { field: "eventTitle",     headerName: "Event Title", flex: 1.4, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "submissionDate", headerName: "Submitted",   flex: 1,   renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "eventDate",      headerName: "Event Date",  flex: 1,   renderCell: (p) => <CellText>{p.value}</CellText> },
    {
      field: "actions", headerName: "", flex: 0.6, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Button variant="outlined" size="small" onClick={() => setSelected(p.row._raw)}
            sx={{ textTransform: "none", fontSize: "0.78rem" }}>View</Button>
        </Box>
      ),
    },
  ];

  if (loading) return <Loader />;

  return (
    <>
      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        <DataGrid rows={rows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick sx={makeDataGridSx(isDark)} />
      </Box>
      <RequestDetailDialog open={!!selected} onClose={() => setSelected(null)} request={selected} isDark={isDark} />
    </>
  );
}

// ── Declined Tab ──────────────────────────────────────────────────────────────
function DeclinedTab({ isDark }) {
  const { requests, loading } = useClientRequests();
  const [selected, setSelected] = useState(null);

  const declined = requests.filter((r) => r.status === "Declined");
  const rows = declined.map((req) => ({
    id:             req.id,
    eventTitle:     req.title,
    submissionDate: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "—",
    eventDate:      req.event_date || "—",
    _raw:           req,
  }));

  const columns = [
    { field: "eventTitle",     headerName: "Event Title", flex: 1.4, renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "submissionDate", headerName: "Submitted",   flex: 1,   renderCell: (p) => <CellText>{p.value}</CellText> },
    { field: "eventDate",      headerName: "Event Date",  flex: 1,   renderCell: (p) => <CellText>{p.value}</CellText> },
    {
      field: "actions", headerName: "", flex: 0.6, sortable: false,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Button variant="outlined" size="small" onClick={() => setSelected(p.row._raw)}
            sx={{ textTransform: "none", fontSize: "0.78rem" }}>View</Button>
        </Box>
      ),
    },
  ];

  if (loading) return <Loader />;

  return (
    <>
      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        <DataGrid rows={rows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick sx={makeDataGridSx(isDark)} />
      </Box>
      <RequestDetailDialog open={!!selected} onClose={() => setSelected(null)} request={selected} isDark={isDark} showDeclineReason />
    </>
  );
}

// ── Shared Request Detail Dialog ──────────────────────────────────────────────
function RequestDetailDialog({ open, onClose, request, isDark, showDeclineReason }) {
  if (!request) return null;

  const statusCfg = STATUS_CONFIG[request.status] || { bg: "#f3f4f6", color: "#6b7280" };
  const coverageComponents = request.services
    ? Object.entries(request.services).filter(([_, pax]) => pax > 0).map(([name, pax]) => ({ name, pax }))
    : [];

  const currentIdx = getStageIndex(request.status);
  const isActive   = currentIdx >= 0;
  const isDeclined = request.status === "Declined";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 2, maxHeight: "90vh",
          backgroundColor: "background.paper",
          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.5)" : "0 4px 24px rgba(0,0,0,0.08)",
        },
      }}
    >
      {/* Header */}
      <Box sx={{ px: 3, py: 2, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box sx={{ width: 3, height: 26, borderRadius: 1, backgroundColor: statusCfg.color, flexShrink: 0 }} />
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary", lineHeight: 1.3 }}>
              {request.title}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}>
              {request.submitted_at
                ? `Submitted ${new Date(request.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                : "Date unknown"}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, backgroundColor: statusCfg.bg, border: `1px solid ${statusCfg.color}30` }}>
            <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: statusCfg.color, letterSpacing: "0.07em", textTransform: "uppercase" }}>
              {request.status === "Forwarded" ? "Under Review" : request.status === "Assigned" ? "Staff Assigned" : request.status}
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: "text.secondary" }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <DialogContent sx={{ px: 3, py: 3, overflowY: "auto" }}>
        {/* Mini stepper inside dialog for active requests */}
        {isActive && !isDeclined && (
          <Box sx={{ mb: 3, p: 2, borderRadius: 1.5, backgroundColor: isDark ? "#161616" : "#fafafa", border: "1px solid", borderColor: "divider" }}>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1.5 }}>
              Request Progress
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              {PIPELINE_STAGES.map((stage, idx) => {
                const done    = idx < currentIdx;
                const current = idx === currentIdx;
                return (
                  <React.Fragment key={stage.key}>
                    <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, minWidth: 0 }}>
                      <Box sx={{ mb: 0.5 }}>
                        {done ? (
                          <CheckCircleIcon sx={{ fontSize: 16, color: "#15803d" }} />
                        ) : current ? (
                          <Box sx={{ width: 16, height: 16, borderRadius: "50%", backgroundColor: "#f5c52b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <Box sx={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#111827" }} />
                          </Box>
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ fontSize: 16, color: isDark ? "#444" : "#d1d5db" }} />
                        )}
                      </Box>
                      <Typography sx={{ fontSize: "0.65rem", textAlign: "center", fontWeight: current ? 700 : 400, color: done ? "#15803d" : current ? "text.primary" : "text.secondary", lineHeight: 1.3, px: 0.3 }}>
                        {stage.label}
                      </Typography>
                    </Box>
                    {idx < PIPELINE_STAGES.length - 1 && (
                      <Box sx={{ height: 2, flex: 1, mx: 0.5, mb: 2.2, borderRadius: 1, backgroundColor: idx < currentIdx ? "#15803d" : isDark ? "#333" : "#e5e7eb" }} />
                    )}
                  </React.Fragment>
                );
              })}
            </Box>
          </Box>
        )}

        {/* Event Info */}
        <Section label="Event Information">
          <InfoGrid rows={[
            ["Event Title", request.title],
            ["Description", request.description],
            ["Date",        request.event_date || "—"],
            ["Time",        request.from_time && request.to_time ? `${request.from_time} – ${request.to_time}` : "—"],
            ["Venue",       request.venue || "—"],
          ]} />
        </Section>

        {/* Coverage */}
        <Section label="Coverage Requirements">
          {coverageComponents.length > 0 ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
              {coverageComponents.map((c, idx) => (
                <Box key={idx} sx={{ px: 1.25, py: 0.5, borderRadius: 1, border: "1px solid", borderColor: "divider", backgroundColor: isDark ? "#1e1e1e" : "#f9fafb" }}>
                  <Typography sx={{ fontSize: "0.8rem", color: "text.primary" }}>
                    {c.name}{" "}
                    <Typography component="span" sx={{ fontSize: "0.78rem", color: "text.secondary" }}>×{c.pax}</Typography>
                  </Typography>
                </Box>
              ))}
            </Box>
          ) : (
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>—</Typography>
          )}
        </Section>

        {/* Contact */}
        <Section label="Contact Details">
          <InfoGrid rows={[
            ["Contact Person", request.contact_person || "—"],
            ["Contact Info",   request.contact_info   || "—"],
          ]} />
        </Section>

        {/* Attachment */}
        <Section label="Attachment">
          {request.file_url ? (
            <Box onClick={() => openFile(request.file_url)}
              sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, cursor: "pointer", color: "#1976d2", "&:hover": { textDecoration: "underline" } }}>
              <InsertDriveFileOutlinedIcon sx={{ fontSize: 15 }} />
              <Typography sx={{ fontSize: "0.85rem" }}>{getFileName(request.file_url)}</Typography>
            </Box>
          ) : (
            <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>No file attached</Typography>
          )}
        </Section>

        {/* Admin notes (Approved) */}
        {request.status === "Approved" && request.admin_notes && (
          <Section label="Admin Notes">
            <Box sx={{ p: 1.5, borderRadius: 1.5, backgroundColor: isDark ? "#0a1a0a" : "#f0fdf4", borderLeft: "3px solid #15803d" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "#15803d" }}>{request.admin_notes}</Typography>
            </Box>
          </Section>
        )}

        {/* Decline reason */}
        {isDeclined && (
          <Section label="Decline Reason">
            <Box sx={{ p: 1.5, borderRadius: 1.5, backgroundColor: isDark ? "#1a0a0a" : "#fef2f2", borderLeft: "3px solid #dc2626" }}>
              <Typography sx={{ fontSize: "0.85rem", color: "#dc2626", lineHeight: 1.6 }}>
                {request.declined_reason || "No reason provided."}
              </Typography>
            </Box>
          </Section>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Shared helpers ────────────────────────────────────────────────────────────
function Section({ label, children }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "text.secondary", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1, pb: 0.75, borderBottom: "1px solid", borderColor: "divider" }}>
        {label}
      </Typography>
      {children}
    </Box>
  );
}

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

function CellText({ children }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
      <Typography sx={{ fontSize: "0.88rem", color: "text.primary" }}>{children}</Typography>
    </Box>
  );
}

function Loader() {
  return (
    <Box sx={{ py: 8, display: "flex", justifyContent: "center" }}>
      <CircularProgress size={28} sx={{ color: "#f5c52b" }} />
    </Box>
  );
}

function makeDataGridSx(isDark) {
  return {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: "0.88rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-cell":            { outline: "none", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-columnHeaders":   { backgroundColor: isDark ? "#2a2a2a" : "#fafafa", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-footerContainer": { backgroundColor: isDark ? "#1e1e1e" : "#fff",    borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-row:hover":       { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":     { color: "text.secondary" },
  };
}