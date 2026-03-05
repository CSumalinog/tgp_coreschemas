// src/pages/admin/ForwardedRequests.jsx
import React, { useState } from "react";
import { Box, Button, Typography, CircularProgress, Chip, Stack } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { useAdminRequests } from "../../hooks/useAdminRequest";
import RequestDetails from "../../components/admin/RequestDetails";

export default function ForwardedRequests() {
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

  const columns = [
    { field: "requestTitle", headerName: "Request Title", flex: 1.4,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    { field: "client", headerName: "Client", flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "forwardedTo",
      headerName: "Forwarded To",
      flex: 1.4,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.5 }}>
            {params.value.length > 0 ? params.value.map((s, idx) => (
              <Chip
                key={idx}
                label={s}
                size="small"
                sx={{
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  backgroundColor: "#f3e5f5",
                  color: "#7b1fa2",
                  borderRadius: 2,
                }}
              />
            )) : <Typography sx={{ fontSize: "0.9rem", color: "#9e9e9e" }}>—</Typography>}
          </Stack>
        </Box>
      ),
    },
    { field: "dateForwarded", headerName: "Date Forwarded", flex: 1,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontSize: "0.9rem" }}>{params.value}</Typography>
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 0.8,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <Typography sx={{ fontWeight: 400, color: "#7b1fa2", textTransform: "uppercase", fontSize: "0.9rem" }}>
            {params.value}
          </Typography>
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 0.8,
      sortable: false,
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
    <Box sx={{ p: 3, height: "100%", boxSizing: "border-box", backgroundColor: "#f9f9f9" }}>
      <Box sx={{ mb: 2 }}>
        <Typography sx={{ fontSize: "0.8rem", color: "#757575", lineHeight: 1.5 }}>
          Requests that have been forwarded to section heads for staff assignment.
        </Typography>
      </Box>

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