import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Stack,
  Divider,
  Container,
  Button,
} from "@mui/material";

import RequestPageIcon from "@mui/icons-material/RequestPage";
import PendingActionsIcon from "@mui/icons-material/PendingActions";
import ForwardToInboxIcon from "@mui/icons-material/ForwardToInbox";
import AssignmentTurnedInIcon from "@mui/icons-material/AssignmentTurnedIn";
import GroupWorkIcon from "@mui/icons-material/GroupWork";
import ArticleIcon from "@mui/icons-material/Article";
import CancelIcon from "@mui/icons-material/Cancel";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

/* ===============================
   Metric Card
   =============================== */

const MetricCard = ({ icon, title, value, subtitle }) => (
  <Card
    sx={{
      borderRadius: 3,
      height: 180,
      width: "100%",
      transition: "0.25s ease",
      "&:hover": {
        transform: "translateY(-4px)",
        boxShadow: 3,
      },
    }}
  >
    <CardContent>
      <Stack spacing={1}>
        {icon}

        <Typography variant="h6">{value}</Typography>

        <Typography variant="body2" color="text.secondary">
          {title}
        </Typography>

        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      </Stack>
    </CardContent>
  </Card>
);

/* ===============================
   Dashboard Component
   =============================== */

export default function Dashboard() {

  const metrics = {
    totalRequests: 48,
    pendingReview: 12,
    forwarded: 15,
    completed: 18,
    rejected: 3,
  };

  const sections = [
    { name: "News Section", load: 7 },
    { name: "Photo Section", load: 5 },
    { name: "Video Section", load: 3 },
  ];

  const currentWorkflowStage = "review";

  const isActiveStage = (stage) =>
    stage === currentWorkflowStage;

  const metricsList = [
    {
      icon: <RequestPageIcon sx={{ color: "#f5c52b" }} />,
      title: "Total Requests",
      value: metrics.totalRequests,
      subtitle: "All submitted requests",
    },
    {
      icon: <PendingActionsIcon sx={{ color: "#f5c52b" }} />,
      title: "Pending Review",
      value: metrics.pendingReview,
      subtitle: "Needs admin evaluation",
    },
    {
      icon: <ForwardToInboxIcon sx={{ color: "#f5c52b" }} />,
      title: "Forwarded Requests",
      value: metrics.forwarded,
      subtitle: "Sent to section heads",
    },
    {
      icon: <AssignmentTurnedInIcon sx={{ color: "#f5c52b" }} />,
      title: "Completed Coverage",
      value: metrics.completed,
      subtitle: "Executed coverage",
    },
    {
      icon: <CancelIcon sx={{ color: "#f5c52b" }} />,
      title: "Rejected Requests",
      value: metrics.rejected,
      subtitle: "Declined with justification",
    },
  ];

  /* ===============================
     Report Generator Handler
     =============================== */

  const handleGenerateReport = async () => {
    try {
      const response = await fetch("/api/report/generate");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = "governance-report.pdf";
      a.click();

    } catch (error) {
      console.error("Report generation failed", error);
    }
  };

  return (
    <Container maxWidth="xl">

      <Typography fontWeight={600} mb={3} marginTop={3}>
        Request Management Dashboard
      </Typography>

      {/* ===============================
         Report Panel (NEW)
      =============================== */}

      <Box mb={4}>
        <Card sx={{ p: 3, borderRadius: 3 }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", md: "center" }}
            spacing={2}
          >
            <Box>
              <Typography fontWeight={600}>
                Governance Report Summary
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Generate workflow performance report for administrative review.
              </Typography>
            </Box>

            <Button
              variant="contained"
              sx={{
                backgroundColor: "#f5c52b",
                color: "#212121",
                px: 4
              }}
              onClick={handleGenerateReport}
            >
              Generate PDF Report
            </Button>
          </Stack>
        </Card>
      </Box>

      {/* Metric Row */}
      <Grid container spacing={3} mb={4} wrap="nowrap">

        {metricsList.map((metric, index) => (
          <Grid item key={index} sx={{ flex: 1, display: "flex" }}>
            <Box sx={{ flex: 1 }}>
              <MetricCard {...metric} />
            </Box>
          </Grid>
        ))}

      </Grid>

      {/* Workflow Pipeline */}

      <Typography fontWeight={600} mb={2}>
        Workflow Pipeline Status
      </Typography>

      <Card sx={{ p: 3, borderRadius: 3, mb: 4 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="nowrap"
        >
          {[
            { stage: "submission", label: "Submission", icon: <ArticleIcon /> },
            { stage: "review", label: "Review", icon: <PendingActionsIcon /> },
            { stage: "forward", label: "Forward", icon: <ForwardToInboxIcon /> },
            { stage: "assignment", label: "Assignment", icon: <GroupWorkIcon /> },
            { stage: "completion", label: "Completion", icon: <AssignmentTurnedInIcon /> },
          ].map((node, index, array) => (
            <React.Fragment key={node.stage}>

              <Stack
                alignItems="center"
                spacing={1}
                sx={{
                  opacity: isActiveStage(node.stage) ? 1 : 0.4,
                  transition: "0.3s ease",
                }}
              >
                {React.cloneElement(node.icon, {
                  sx: {
                    color: isActiveStage(node.stage) ? "#f5c52b" : "gray",
                  },
                })}

                <Typography variant="caption">
                  {node.label}
                </Typography>
              </Stack>

              {index !== array.length - 1 && (
                <ArrowForwardIcon sx={{ color: "#aaa" }} />
              )}

            </React.Fragment>
          ))}
        </Stack>
      </Card>

      {/* Section Load */}

      <Typography fontWeight={600} mb={2}>
        Section Workload Distribution
      </Typography>

      <Grid container spacing={3}>
        {sections.map((section, index) => (
          <Grid item xs={12} md={4} key={index}>
            <Card sx={{ borderRadius: 3 }}>
              <CardContent>
                <Typography fontWeight={600}>
                  {section.name}
                </Typography>

                <Typography variant="h4" mt={2}>
                  {section.load}
                </Typography>

                <Typography variant="caption" color="text.secondary">
                  Active workload
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

    </Container>
  );
}