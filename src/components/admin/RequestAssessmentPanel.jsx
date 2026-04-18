import React from "react";
import { Box, Typography } from "@mui/material";
import AssessCard from "./AssessCard";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BrandedLoader from "../common/BrandedLoader";

const SCORE_CONFIG = {
  Low: { color: "#dc2626" },
  Moderate: { color: "#d97706" },
  High: { color: "#15803d" },
  "Very High": { color: "#1d4ed8" },
};

export default function RequestAssessmentPanel({ checks, isDark }) {
  return (
    <Box
      sx={{
        width: { xs: "100%", md: 280 },
        flexShrink: 0,
        px: 2.5,
        py: 3,
        backgroundColor: isDark ? "#161616" : "#fafafa",
        overflowY: { xs: "visible", md: "auto" },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 0.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <AutoAwesomeOutlinedIcon sx={{ fontSize: 13, color: "#f5c52b" }} />
          <Typography
            sx={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "text.secondary",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            Request Assessment
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
        {!checks || checks.loading ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BrandedLoader size={20} inline />
            <Typography sx={{ fontSize: "0.78rem", color: "text.secondary" }}>
              Analyzing…
            </Typography>
          </Box>
        ) : (
          <>
            <AssessCard
              title="Submission Timing"
              check={checks.lateSubmission}
              isDark={isDark}
            />
            <AssessCard
              title="Completeness"
              check={checks.incomplete}
              isDark={isDark}
              issues={checks.incomplete?.issues}
            />
            <AssessCard
              title="Scheduling Conflict"
              check={checks.conflict}
              isDark={isDark}
              conflicts={checks.conflict?.conflicts}
            />
            {checks.newsworthiness && (
              <Box
                sx={{
                  p: 1.5,
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: "divider",
                  backgroundColor: "background.paper",
                }}
              >
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "text.secondary",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    mb: 1,
                  }}
                >
                  Newsworthiness
                </Typography>
                {checks.newsworthiness.score ? (
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.75,
                      }}
                    >
                      <Typography sx={{ fontSize: "0.85rem" }}>
                        {"⭐".repeat(checks.newsworthiness.score)}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          color:
                            SCORE_CONFIG[checks.newsworthiness.label]?.color ||
                            "text.secondary",
                        }}
                      >
                        {checks.newsworthiness.label}
                      </Typography>
                    </Box>
                    <Typography
                      sx={{
                        fontSize: "0.75rem",
                        color: "text.secondary",
                        lineHeight: 1.5,
                        mb: 0.75,
                      }}
                    >
                      {checks.newsworthiness.reasoning}
                    </Typography>
                    {checks.newsworthiness.recommendation && (
                      <Typography
                        sx={{
                          fontSize: "0.72rem",
                          fontWeight: 600,
                          color: "#1976d2",
                        }}
                      >
                        → {checks.newsworthiness.recommendation}
                      </Typography>
                    )}
                  </>
                ) : (
                  <Typography
                    sx={{ fontSize: "0.75rem", color: "text.secondary" }}
                  >
                    {checks.newsworthiness.reasoning}
                  </Typography>
                )}
              </Box>
            )}
          </>
        )}
      </Box>
    </Box>
  );
}
