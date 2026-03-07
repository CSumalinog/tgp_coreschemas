// src/pages/admin/ForwardedRequests.jsx
import React, { useState } from "react";
import { Box, Button, Typography, CircularProgress, Chip, Stack, useTheme } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useAdminRequests } from "../../hooks/useAdminRequest";
import RequestDetails from "../../components/admin/RequestDetails";

export default function ForwardedRequests() {
  const theme  = useTheme();
  const isDark = theme.palette.mode === "dark";

  const { forwarded, loading, refetch } = useAdminRequests();
  const [selectedRequest, setSelectedRequest] = useState(null);

  const rows = forwarded.map((req) => ({
    id: req.id,
    requestTitle: req.title,
    client: req.entity?.name || "—",
    forwardedTo: req.forwarded_sections || [],
    dateForwarded: req.forwarded_at
      ? new Date(req.forwarded_at).toLocaleDateString()
      : "—",
    status: req.status,
    ...req,
  }));

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

  const columns = [
    {
      field: "requestTitle", headerName: "Request Title", flex: 1.4,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem", color: "text.primary" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "client", headerName: "Client", flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem", color: "text.primary" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "forwardedTo", headerName: "Forwarded To", flex: 1.4,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {params.value.length > 0 ? params.value.map((s, idx) => (
              <Chip
                key={idx}
                label={s}
                size="small"
                sx={{ fontSize: "0.75rem", fontWeight: 500, backgroundColor: "#f3e5f5", color: "#7b1fa2", borderRadius: 2 }}
              />
            )) : <Typography sx={{ fontSize: "0.9rem", color: "text.secondary" }}>—</Typography>}
          </Stack>
        </Box>
      ),
    },
    {
      field: "dateForwarded", headerName: "Date Forwarded", flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem", color: "text.primary" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "status", headerName: "Status", flex: 0.8,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontWeight: 400, color: "#7b1fa2", textTransform: "uppercase", fontSize: "0.9rem" }}>
            {params.value}
          </Typography>
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
            onClick={() => setSelectedRequest(params.row)}
            sx={{ textTransform: "none" }}
          >
            View Details
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "background.default" }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", lineHeight: 1.5 }}>
          Requests that have been forwarded to section heads for staff assignment.
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