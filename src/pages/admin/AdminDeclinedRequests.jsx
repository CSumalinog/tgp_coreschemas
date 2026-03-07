// src/pages/admin/DeclinedRequests.jsx
import React, { useState } from "react";
import { Box, Button, Typography, CircularProgress, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useAdminRequests } from "../../hooks/useAdminRequest";
import RequestDetails from "../../components/admin/RequestDetails";

export default function DeclinedRequests() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { declined, loading, refetch } = useAdminRequests();
  const [selectedRequest, setSelectedRequest] = useState(null);

  const rows = declined.map((req) => ({
    id: req.id,
    requestTitle: req.title,
    client: req.entity?.name || "—",
    dateReceived: req.submitted_at
      ? new Date(req.submitted_at).toLocaleDateString()
      : "—",
    status: req.status,
    ...req,
  }));

  const columns = [
    { field: "requestTitle", headerName: "Request Title", flex: 1.4 },
    { field: "client",       headerName: "Client",        flex: 1.2 },
    { field: "dateReceived", headerName: "Date Received", flex: 1 },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: () => (
        <Box sx={{ width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
          <Typography sx={{ fontWeight: 400, color: "#d32f2f", textTransform: "uppercase", fontSize: "0.9rem" }}>
            Declined
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      sortable: false,
      renderCell: (params) => (
        <Button
          variant="outlined"
          size="small"
          onClick={() => setSelectedRequest(params.row)}
        >
          VIEW DETAILS
        </Button>
      ),
    },
  ];

  const dataGridSx = {
    border: "none",
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: "0.9rem",
    backgroundColor: "background.paper",
    color: "text.primary",
    "& .MuiDataGrid-virtualScroller":  { backgroundColor: "background.paper" },
    "& .MuiDataGrid-overlay":          { backgroundColor: "background.paper" },
    "& .MuiDataGrid-cell":             { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", outline: "none", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-columnHeaders":    { fontFamily: "'Helvetica Neue', sans-serif", fontSize: "0.9rem", backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5", color: "text.primary", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-footerContainer":  { backgroundColor: "background.paper", borderColor: isDark ? "#2e2e2e" : "#e0e0e0" },
    "& .MuiDataGrid-row:hover":        { backgroundColor: isDark ? "#2a2a2a" : "#f5f5f5" },
    "& .MuiTablePagination-root":      { color: "text.secondary" },
  };

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default" }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", lineHeight: 1.5 }}>
          Review declined coverage requests and their reasons.
        </Typography>
      </Box>

      <Box sx={{ height: 500, width: "100%", bgcolor: "background.paper", borderRadius: 2, boxShadow: 1 }}>
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
            sx={dataGridSx}
          />
        )}
      </Box>

      <RequestDetails
        open={!!selectedRequest}
        onClose={() => setSelectedRequest(null)}
        request={selectedRequest}
        onActionSuccess={() => {
          setSelectedRequest(null);
          refetch();
        }}
      />
    </Box>
  );
}