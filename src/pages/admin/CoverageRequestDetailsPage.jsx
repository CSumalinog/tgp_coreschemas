// src/pages/admin/CoverageRequestDetailsPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  useTheme,
  CircularProgress,
  Alert,
} from "@mui/material";
import { supabase } from "../../lib/supabaseClient";
import RequestDetails from "../../components/admin/RequestDetails";

const CoverageRequestDetailsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRequest = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from("coverage_requests")
        .select(
          `
          id,
          title,
          description,
          event_date,
          from_time,
          to_time,
          end_date,
          is_multiday,
          event_days,
          venue,
          services,
          status,
          contact_person,
          contact_info,
          file_url,
          admin_notes,
          declined_reason,
          forwarded_sections,
          submitted_at,
          approved_at,
          declined_at,
          forwarded_at,
          created_at,
          requester_id,
          forwarded_by,
          approved_by,
          declined_by,
          client_type:client_type_id ( id, name ),
          entity:client_entities ( id, name ),
          coverage_assignments (
            id,
            status,
            section,
            assigned_to,
            timed_in_at,
            completed_at,
            selfie_url
          )
        `
        )
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      let requester = null;
      if (data?.requester_id) {
        const { data: requesterProfile } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("id", data.requester_id)
          .single();
        if (requesterProfile) requester = requesterProfile;
      }

      setRequest({
        ...data,
        requester,
      });
    } catch (err) {
      console.error("Error fetching request:", err);
      setError(err.message || "Failed to load request details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRequest();
  }, [fetchRequest]);

  const handleBack = () => {
    // Navigate back to previous page or coverage tracker
    const backPath = location.state?.backTo || "/admin/coverage-tracker";
    navigate(backPath, { 
      state: location.state?.backState 
    });
  };

  const handleClose = () => handleBack();

  const handleActionSuccess = () => {
    fetchRequest();
  };

  const handleOpenCoverageDetails = (eventPayload) => {
    navigate("/admin/coverage-tracker", {
      state: {
        tab: "CTR",
        focusRequestId: eventPayload.requestId || id,
        backTo: `/admin/coverage-request-details/${id}`,
      },
    });
  };

  return (
    <Box
      sx={{
        p: { xs: 1.5, sm: 2, md: 2.5 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        backgroundColor: isDark ? "background.default" : "#ffffff",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          flexShrink: 0,
        }}
      >
        <Typography sx={{ fontSize: "0.8rem", fontWeight: 600, color: "text.primary", letterSpacing: "-0.01em" }}>
          Request Details
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minHeight: 0 }}>
        {error ? (
          <Alert severity="error" sx={{ borderRadius: "10px" }}>
            {error}
          </Alert>
        ) : loading || !request ? (
          <Box
            sx={{
              height: "100%",
              minHeight: 320,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1.2,
              border: "1px solid",
              borderColor: "divider",
              borderRadius: "20px",
              backgroundColor: isDark ? "background.paper" : "#f7f7f8",
            }}
          >
            <CircularProgress size={28} />
            <Typography sx={{ color: "text.secondary", fontSize: "0.86rem" }}>
              Loading request details...
            </Typography>
          </Box>
        ) : (
          <RequestDetails
            open={true}
            asPage={true}
            request={request}
            onClose={handleClose}
            onOpenCoverageDetails={handleOpenCoverageDetails}
            onActionSuccess={handleActionSuccess}
          />
        )}
      </Box>
    </Box>
  );
};

export default CoverageRequestDetailsPage;
