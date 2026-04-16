import React from "react";
import CoverageManagementBase from "./CoverageManagementBase";

const descriptions = {
  all: "All active and completed coverage tracking records for your section.",
  "on-going":
    "Coverage currently in progress. Your section's staffers have timed in and are on-site.",
  completed: "Completed coverage requests handled by your section.",
};

export default function CoverageTrackerPage() {
  return (
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
  );
}