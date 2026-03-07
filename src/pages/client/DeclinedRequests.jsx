// src/pages/client/DeclinedRequest.jsx
import React, { useState } from "react";
import {
  Box, Button, Dialog, DialogContent,
  Typography, Chip, Stack, IconButton, CircularProgress, Divider, useTheme,
} from "@mui/material";
import { DataGrid }                from "@mui/x-data-grid";
import CloseIcon                   from "@mui/icons-material/Close";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import { useClientRequests }       from "../../hooks/useClientRequests";
import { supabase }                from "../../lib/supabaseClient";

const getFileName = (filePath) => {
  if (!filePath) return null;
  return filePath.split("/").pop().replace(/^\d+_/, "");
};

const openFile = (filePath) => {
  if (!filePath) return;
  const { data } = supabase.storage.from("coverage-files").getPublicUrl(filePath);
  if (data?.publicUrl) window.open(data.publicUrl, "_blank");
};

export default function DeclinedRequest() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { requests, loading } = useClientRequests();
  const [selectedRequest, setSelectedRequest] = useState(null);

  const declined = requests.filter((r) => r.status === "Declined");
  const rows = declined.map((req) => ({
    id:             req.id,
    eventTitle:     req.title,
    submissionDate: req.submitted_at ? new Date(req.submitted_at).toLocaleDateString() : "—",
    status:         req.status,
    ...req,
  }));

  const dataGridSx = {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: "0.9rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-cell":            { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-columnHeaders":   { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-footerContainer": { backgroundColor: isDark ? "#1e1e1e" : "#fff", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-row:hover":       { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":     { color: "text.secondary" },
  };

  const columns = [
    { field: "eventTitle",     headerName: "Event Title",     flex: 1.4 },
    { field: "submissionDate", headerName: "Submission Date", flex: 1 },
    {
      field: "status", headerName: "Status", flex: 1,
      renderCell: () => (
        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 400, color: "#dc2626", textTransform: "uppercase", fontSize: "0.9rem" }}>
            Declined
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions", headerName: "Actions", flex: 1, sortable: false,
      renderCell: (params) => (
        <Button variant="outlined" size="small"
          onClick={() => setSelectedRequest(params.row)}
          sx={{ textTransform: "none", fontSize: "0.8rem" }}>
          View Reason
        </Button>
      ),
    },
  ];

  const coverageComponents = selectedRequest?.services
    ? Object.entries(selectedRequest.services).filter(([_, pax]) => pax > 0).map(([name, pax]) => ({ name, pax }))
    : [];

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default" }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", lineHeight: 1.5 }}>
          View your declined coverage requests and the reasons provided by the admin.
        </Typography>
      </Box>

      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
        {loading ? (
          <Box sx={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
          </Box>
        ) : (
          <DataGrid rows={rows} columns={columns} pageSize={7} rowsPerPageOptions={[7]} disableSelectionOnClick sx={dataGridSx} />
        )}
      </Box>

      {/* ── View Reason Dialog ── */}
      <Dialog
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: 2,
            height: { md: "80vh" }, maxHeight: "90vh",
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
            <Box sx={{ width: 3, height: 26, borderRadius: 1, backgroundColor: "#dc2626", flexShrink: 0 }} />
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: "0.95rem", color: "text.primary", lineHeight: 1.3 }}>
                {selectedRequest?.title}
              </Typography>
              <Typography sx={{ fontSize: "0.72rem", color: "text.secondary", mt: 0.2 }}>
                {selectedRequest?.submitted_at
                  ? `Submitted ${new Date(selectedRequest.submitted_at).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
                  : "Date unknown"}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ px: 1.5, py: 0.4, borderRadius: 1, backgroundColor: isDark ? "#1a0a0a" : "#fee2e2", border: "1px solid #dc262630" }}>
              <Typography sx={{ fontSize: "0.7rem", fontWeight: 700, color: "#dc2626", letterSpacing: "0.07em", textTransform: "uppercase" }}>
                Declined
              </Typography>
            </Box>
            <IconButton onClick={() => setSelectedRequest(null)} size="small" sx={{ color: "text.secondary" }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        {/* ── Body ── */}
        <DialogContent sx={{ px: 3, py: 3, overflowY: "auto" }}>
          {selectedRequest && (
            <>
              <Section label="Event Information">
                <InfoGrid rows={[
                  ["Event Title", selectedRequest.title],
                  ["Description", selectedRequest.description],
                  ["Date",        selectedRequest.event_date || "—"],
                  ["Time",        selectedRequest.from_time && selectedRequest.to_time
                    ? `${selectedRequest.from_time} – ${selectedRequest.to_time}` : "—"],
                  ["Venue",       selectedRequest.venue || "—"],
                ]} />
              </Section>

              <Section label="Coverage Requirements">
                {coverageComponents.length > 0 ? (
                  <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75 }}>
                    {coverageComponents.map((c, idx) => (
                      <Box key={idx} sx={{
                        px: 1.25, py: 0.5, borderRadius: 1,
                        border: "1px solid", borderColor: "divider",
                        backgroundColor: isDark ? "#1e1e1e" : "#f9fafb",
                      }}>
                        <Typography sx={{ fontSize: "0.8rem", color: "text.primary" }}>
                          {c.name}{" "}
                          <Typography component="span" sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
                            ×{c.pax}
                          </Typography>
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>—</Typography>
                )}
              </Section>

              <Section label="Contact Details">
                <InfoGrid rows={[
                  ["Contact Person", selectedRequest.contact_person || "—"],
                  ["Contact Info",   selectedRequest.contact_info || "—"],
                ]} />
              </Section>

              <Section label="Attachment">
                {selectedRequest.file_url ? (
                  <Box onClick={() => openFile(selectedRequest.file_url)}
                    sx={{ display: "inline-flex", alignItems: "center", gap: 0.75, cursor: "pointer", color: "#1976d2", "&:hover": { textDecoration: "underline" } }}>
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 15 }} />
                    <Typography sx={{ fontSize: "0.85rem" }}>{getFileName(selectedRequest.file_url)}</Typography>
                  </Box>
                ) : (
                  <Typography sx={{ fontSize: "0.85rem", color: "text.secondary" }}>No file attached</Typography>
                )}
              </Section>

              {/* ── Decline Reason ── */}
              <Section label="Decline Reason">
                <Box sx={{
                  p: 1.5, borderRadius: 1.5,
                  backgroundColor: isDark ? "#1a0a0a" : "#fef2f2",
                  borderLeft: "3px solid #dc2626",
                }}>
                  <Typography sx={{ fontSize: "0.85rem", color: "#dc2626", lineHeight: 1.6 }}>
                    {selectedRequest.declined_reason || "No reason provided."}
                  </Typography>
                </Box>
              </Section>
            </>
          )}
        </DialogContent>
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