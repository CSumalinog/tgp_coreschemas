import React from "react";
import CoverageManagementBase from "./CoverageManagementBase";

const descriptions = {
  all: "All assignment-stage requests for your section in one view.",
  "for-assignment":
    "Requests forwarded to your section. Assign staffers, then submit for admin approval.",
  "for-approval":
    "Assignments submitted and waiting for admin to review and approve all sections.",
  assigned:
    "Officially approved assignments. Staffers are confirmed and the event is upcoming.",
};

export default function CoverageAssignmentPage() {
  return (
    <CoverageManagementBase
      pageTitle="Coverage Assignment"
      exportFileName="coverage-assignment-export"
      settingsTitle="Assignment Settings"
      defaultView="all"
      allowedViews={["all", "for-assignment", "for-approval", "assigned"]}
      descriptions={descriptions}
    />
  );
}