import React, { useState } from "react";
import { Box, Divider, Typography } from "@mui/material";
import { useLocation } from "react-router-dom";
import CoverageManagementBase from "./CoverageManagementBase";
import CoverageTimeRecordPage from "./CoverageTimeRecordPage";

const descriptions = {
  all: "All active and completed coverage tracking records for your section.",
  "on-going":
    "Coverage currently in progress. Your section's staffers have timed in and are on-site.",
  completed: "Completed coverage requests handled by your section.",
};

export default function CoverageTrackerPage() {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() =>
    location.state?.tab === "time-record" ? "time-record" : "tracker",
  );

  return (
    <>
      <Box
        sx={{
          px: { xs: 1.5, sm: 2, md: 3 },
          pt: { xs: 0.5, sm: 0.75, md: 1 },
          pb: 0,
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexShrink: 0,
        }}
      >
        <Typography
          onClick={() => setActiveTab("tracker")}
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.8rem",
            fontWeight: activeTab === "tracker" ? 600 : 400,
            color: activeTab === "tracker" ? "text.primary" : "text.secondary",
            letterSpacing: "-0.01em",
            cursor: "pointer",
          }}
        >
          Coverage Tracker
        </Typography>

        <Divider
          orientation="vertical"
          flexItem
          sx={{ borderColor: "rgba(53,53,53,0.15)", my: 0.1 }}
        />

        <Typography
          onClick={() => setActiveTab("time-record")}
          sx={{
            fontFamily: "'Inter', sans-serif",
            fontSize: "0.8rem",
            fontWeight: activeTab === "time-record" ? 600 : 400,
            color: activeTab === "time-record" ? "text.primary" : "text.secondary",
            letterSpacing: "-0.01em",
            cursor: "pointer",
          }}
        >
          Coverage Time Record
        </Typography>
      </Box>

      {activeTab === "tracker" ? (
        <CoverageManagementBase
          pageTitle="Coverage Tracker"
          exportFileName="coverage-tracker-export"
          settingsTitle="Tracker Settings"
          defaultView="all"
          allowedViews={["all", "on-going", "completed"]}
          showHeader={false}
          compactTop
          descriptions={descriptions}
        />
      ) : (
        <CoverageTimeRecordPage embedded />
      )}
    </>
  );
}