// src/components/admin/BlockedDatesPanel.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Divider,
  Menu,
  MenuItem,
  Dialog,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import AddIcon from "@mui/icons-material/AddOutlined";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeftOutlined";
import ChevronRightIcon from "@mui/icons-material/ChevronRightOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import BrandedLoader from "../common/BrandedLoader";
import { MODAL_ACTION_HEIGHT } from "../../utils/layoutTokens";

const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm = "'Inter', sans-serif";

const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const formatISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function fmtDate(dateStr) {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlockedDatesPanel({
  events,
  loading,
  isDark,
  onEdit,
  onDelete,
  onAdd,
  onViewAll,
  slotOverrides,
  dutyBlackouts = [],
  onOpenSlotSettings,
  onOpenDutySettings,
  collapsed,
  onToggle,
}) {
  const border = isDark ? BORDER_DARK : BORDER;
  const today = new Date();
  const [quickAddAnchor, setQuickAddAnchor] = useState(null);
  const [blockedDatesOpen, setBlockedDatesOpen] = useState(true);
  const [coverageSlotsOpen, setCoverageSlotsOpen] = useState(true);
  const [dutyScheduleOpen, setDutyScheduleOpen] = useState(true);
  const [pendingDeleteEvent, setPendingDeleteEvent] = useState(null);
  const quickAddOpen = Boolean(quickAddAnchor);

  const openQuickAdd = (event) => setQuickAddAnchor(event.currentTarget);
  const closeQuickAdd = () => setQuickAddAnchor(null);
  const handleQuickAddBlockedDate = () => {
    closeQuickAdd();
    onAdd?.();
  };
  const handleQuickModifySlots = () => {
    closeQuickAdd();
    onOpenSlotSettings?.();
  };
  const handleQuickOpenDutySettings = () => {
    closeQuickAdd();
    onOpenDutySettings?.();
  };
  const closeDeleteConfirm = () => setPendingDeleteEvent(null);
  const confirmDelete = () => {
    if (!pendingDeleteEvent) return;
    onDelete?.(pendingDeleteEvent.id);
    setPendingDeleteEvent(null);
  };

  const sorted = [...events].sort(
    (a, b) => new Date(a.startDate) - new Date(b.startDate),
  );
  const upcoming = sorted.filter(
    (ev) => new Date(ev.endDate) >= startOfDay(today),
  );
  const past = sorted.filter((ev) => new Date(ev.endDate) < startOfDay(today));

  // Collapsed state - just a slim vertical strip
  if (collapsed) {
    return (
      <>
        <Box
          sx={{
            width: 36,
            flexShrink: 0,
            position: "sticky",
            top: 0,
            alignSelf: "flex-start",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 1,
          }}
        >
          <Tooltip title="Show blocked dates" placement="left" arrow>
            <Box
              onClick={onToggle}
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                border: `1px solid ${border}`,
                backgroundColor: "background.paper",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08 },
              }}
            >
              <ChevronLeftIcon sx={{ fontSize: 16, color: "text.secondary" }} />
            </Box>
          </Tooltip>

          <Tooltip title="Quick actions" placement="left" arrow>
            <Box
              onClick={openQuickAdd}
              sx={{
                width: 36,
                height: 36,
                borderRadius: "10px",
                backgroundColor: "#212121",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "background-color 0.15s",
                "&:hover": { backgroundColor: "#333" },
              }}
            >
              <AddIcon sx={{ fontSize: 15 }} />
            </Box>
          </Tooltip>

          {upcoming.length > 0 && (
            <Tooltip
              title={`${upcoming.length} upcoming blocked date${upcoming.length > 1 ? "s" : ""}`}
              placement="left"
              arrow
            >
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  backgroundColor: "background.paper",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    color: "text.secondary",
                    lineHeight: 1,
                  }}
                >
                  {upcoming.length}
                </Typography>
              </Box>
            </Tooltip>
          )}
        </Box>

        <Menu
          anchorEl={quickAddAnchor}
          open={quickAddOpen}
          onClose={closeQuickAdd}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.5,
                borderRadius: "10px",
                border: `1px solid ${border}`,
                boxShadow: isDark
                  ? "0 14px 28px rgba(0,0,0,0.5)"
                  : "0 10px 22px rgba(53,53,53,0.14)",
              },
            },
          }}
        >
          <MenuItem
            onClick={handleQuickAddBlockedDate}
            sx={{ fontFamily: dm, fontSize: "0.8rem", minWidth: 170 }}
          >
            Block a date
          </MenuItem>
          <MenuItem
            onClick={handleQuickModifySlots}
            sx={{ fontFamily: dm, fontSize: "0.8rem", minWidth: 170 }}
          >
            Modify slots
          </MenuItem>
          <MenuItem
            onClick={handleQuickOpenDutySettings}
            sx={{ fontFamily: dm, fontSize: "0.8rem", minWidth: 170 }}
          >
            Duty settings
          </MenuItem>
        </Menu>
      </>
    );
  }

  // â”€â”€ Expanded state â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const BlockCard = ({ ev, isPast }) => {
    const [menuAnchor, setMenuAnchor] = useState(null);
    const start = new Date(ev.startDate);
    const end = new Date(ev.endDate);
    const isMulti =
      ev.eventType === "multi" || formatISO(start) !== formatISO(end);
    const dateLabel = isMulti
      ? `${fmtDate(formatISO(start))} â€“ ${fmtDate(formatISO(end))}`
      : fmtDate(formatISO(start));

    return (
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          borderRadius: "10px",
          border: `1px solid ${border}`,
          backgroundColor: isPast
            ? "transparent"
            : isDark
              ? "rgba(255,255,255,0.02)"
              : "rgba(53,53,53,0.015)",
          opacity: isPast ? 0.5 : 1,
          transition: "opacity 0.15s",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 1,
            mb: 0.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                backgroundColor: isPast
                  ? "text.disabled"
                  : "rgba(53,53,53,0.35)",
                flexShrink: 0,
              }}
            />
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.8rem",
                fontWeight: 600,
                color: isPast ? "text.disabled" : "text.primary",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {ev.title}
            </Typography>
          </Box>
          {!isPast && (
            <Box sx={{ flexShrink: 0 }}>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setMenuAnchor(e.currentTarget); }}
                sx={{
                  width: 22,
                  height: 22,
                  borderRadius: "6px",
                  color: "text.secondary",
                  "&:hover": { color: CHARCOAL, backgroundColor: GOLD_08 },
                }}
              >
                <MoreVertIcon sx={{ fontSize: 14 }} />
              </IconButton>
              <Menu
                anchorEl={menuAnchor}
                open={Boolean(menuAnchor)}
                onClose={() => setMenuAnchor(null)}
                onClick={(e) => e.stopPropagation()}
                slotProps={{
                  paper: {
                    sx: {
                      borderRadius: "8px",
                      minWidth: 130,
                      boxShadow: "0 4px 16px rgba(0,0,0,0.10)",
                    },
                  },
                }}
              >
                <MenuItem
                  onClick={() => { setMenuAnchor(null); onEdit(ev); }}
                  sx={{ fontFamily: dm, fontSize: "0.8rem", gap: 1 }}
                >
                  <EditOutlinedIcon sx={{ fontSize: 15 }} />
                  Edit
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    setMenuAnchor(null);
                    setPendingDeleteEvent(ev);
                  }}
                  sx={{ fontFamily: dm, fontSize: "0.8rem", gap: 1, color: "#dc2626" }}
                >
                  <DeleteOutlinedIcon sx={{ fontSize: 15 }} />
                  Delete
                </MenuItem>
              </Menu>
            </Box>
          )}
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.25,
            mb: ev.notes ? 0.5 : 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.75rem",
              color: "text.secondary",
            }}
          >
            {dateLabel}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 0.75,
            mb: ev.notes ? 0.5 : 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.72rem",
              color: "text.disabled",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={`Blocked by ${ev.blocked_by_name || "Unknown"}`}
          >
            Blocked by: {ev.blocked_by_name || "Unknown"}
          </Typography>
        </Box>
        {ev.notes && (
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.72rem",
              color: "text.disabled",
              lineHeight: 1.4,
              fontStyle: "italic",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {ev.notes}
          </Typography>
        )}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        width: 268,
        flexShrink: 0,
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
        height: "100%",
        minHeight: 0,
        transition: "width 0.2s ease",
      }}
    >
      <Box
        sx={{
          height: "100%",
          minHeight: 0,
          borderRadius: "10px",
          border: `1px solid ${border}`,
          backgroundColor: "background.paper",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "100%",
        }}
      >
        {/* Panel header */}
        <Box
          sx={{
            px: 2,
            py: 1.75,
            borderBottom: `1px solid ${border}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.84rem",
                fontWeight: 700,
                color: "text.primary",
                lineHeight: 1.2,
              }}
            >
              Calendar Controls
            </Typography>
           
          </Box>

          <Tooltip 
          
          title="Collapse" arrow>
            <Box
              onClick={onToggle}
              sx={{
                width: 26,
                height: 26,
                borderRadius: "10px",
                border: `1px solid ${border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                transition: "all 0.15s",
                "&:hover": { borderColor: GOLD, backgroundColor: GOLD_08 },
              }}
            >
              <ChevronRightIcon
                sx={{ fontSize: 15, color: "text.secondary" }}
              />
            </Box>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={quickAddAnchor}
          open={quickAddOpen}
          onClose={closeQuickAdd}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{
            paper: {
              sx: {
                mt: 0.5,
                borderRadius: "10px",
                border: `1px solid ${border}`,
                boxShadow: isDark
                  ? "0 14px 28px rgba(0,0,0,0.5)"
                  : "0 10px 22px rgba(53,53,53,0.14)",
              },
            },
          }}
        >
          <MenuItem
            onClick={handleQuickAddBlockedDate}
            sx={{ fontFamily: dm, fontSize: "0.8rem", minWidth: 170 }}
          >
            Block a date
          </MenuItem>
          <MenuItem
            onClick={handleQuickModifySlots}
            sx={{ fontFamily: dm, fontSize: "0.8rem", minWidth: 170 }}
          >
            Modify slots
          </MenuItem>
          <MenuItem
            onClick={handleQuickOpenDutySettings}
            sx={{ fontFamily: dm, fontSize: "0.8rem", minWidth: 170 }}
          >
            Duty settings
          </MenuItem>
        </Menu>

        {/* List body */}
        <Box
          sx={{
            overflowY: "auto",
            flex: 1,
            px: 1.5,
            py: 1.5,
            "&::-webkit-scrollbar": { width: 3 },
            "&::-webkit-scrollbar-track": { background: "transparent" },
            "&::-webkit-scrollbar-thumb": {
              background: isDark ? "#3a3a3a" : "#e0e0e0",
              borderRadius: "10px",
            },
          }}
        >
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.95 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                px: 0.25,
              }}
            >
              <Box
                onClick={() => setBlockedDatesOpen((v) => !v)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.35,
                  cursor: "pointer",
                  userSelect: "none",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "text.primary",
                  }}
                >
                  Blocked Dates
                </Typography>
                <ChevronRightIcon
                  sx={{
                    fontSize: 14,
                    color: "text.secondary",
                    transform: blockedDatesOpen
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.15s",
                    ml: "auto",
                  }}
                />
              </Box>
              <Tooltip title="Add blocked date" arrow>
                <Box
                  onClick={onAdd}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "text.secondary",
                    flexShrink: 0,
                    "&:hover": {
                      borderColor: GOLD,
                      backgroundColor: GOLD_08,
                      color: CHARCOAL,
                    },
                  }}
                >
                  <AddIcon sx={{ fontSize: 12 }} />
                </Box>
              </Tooltip>
            </Box>

            <Box
              sx={{
                px: 0.25,
                mt: 0.05,
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
              }}
            >
              <Typography
                onClick={onViewAll}
                sx={{
                  fontFamily: dm,
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  color: "text.secondary",
                  cursor: "pointer",
                  userSelect: "none",
                  "&:hover": {
                    color: CHARCOAL,
                    textDecoration: "underline",
                    textUnderlineOffset: "2px",
                  },
                }}
              >
                See all
              </Typography>
            </Box>

            {blockedDatesOpen &&
              (loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <BrandedLoader size={30} inline />
                </Box>
              ) : events.length === 0 ? (
                <Box sx={{ textAlign: "center", py: 2.5 }}>
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.8rem",
                      color: "text.disabled",
                    }}
                  >
                    No blocked dates yet.
                  </Typography>
                </Box>
              ) : (
                <Box
                  sx={{
                    px: 0.25,
                    py: 0.25,
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.45,
                  }}
                >
                  {upcoming.length > 0 && (
                    <>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "text.disabled",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          px: 0.25,
                          mb: 0.25,
                        }}
                      >
                        Upcoming
                      </Typography>
                      {upcoming.map((ev) => (
                        <BlockCard key={ev.id} ev={ev} isPast={false} />
                      ))}
                    </>
                  )}
                  {past.length > 0 && (
                    <>
                      <Divider
                        sx={{
                          borderColor: isDark ? BORDER_DARK : BORDER,
                          my: 0.75,
                        }}
                      />
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.65rem",
                          fontWeight: 700,
                          color: "text.disabled",
                          textTransform: "uppercase",
                          letterSpacing: "0.1em",
                          px: 0.25,
                          mb: 0.25,
                        }}
                      >
                        Past
                      </Typography>
                      {past.map((ev) => (
                        <BlockCard key={ev.id} ev={ev} isPast={true} />
                      ))}
                    </>
                  )}
                </Box>
              ))}

            <Divider
              sx={{ borderColor: isDark ? BORDER_DARK : BORDER, my: 0.75 }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                px: 0.25,
              }}
            >
              <Box
                onClick={() => setCoverageSlotsOpen((v) => !v)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.35,
                  cursor: "pointer",
                  userSelect: "none",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "text.primary",
                  }}
                >
                  Request Slots
                </Typography>
                <ChevronRightIcon
                  sx={{
                    fontSize: 14,
                    color: "text.secondary",
                    transform: coverageSlotsOpen
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.15s",
                    ml: "auto",
                  }}
                />
              </Box>
              <Tooltip title="Add slot override" arrow>
                <Box
                  onClick={onOpenSlotSettings}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "text.secondary",
                    flexShrink: 0,
                    "&:hover": {
                      borderColor: GOLD,
                      backgroundColor: GOLD_08,
                      color: CHARCOAL,
                    },
                  }}
                >
                  <AddIcon sx={{ fontSize: 12 }} />
                </Box>
              </Tooltip>
            </Box>

            {coverageSlotsOpen && (
              <Box
                sx={{
                  px: 0.25,
                  py: 0.25,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.45,
                }}
              >
                {slotOverrides.length === 0 ? (
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.75rem",
                      color: "text.disabled",
                    }}
                  >
                    No overridden dates yet.
                  </Typography>
                ) : (
                  slotOverrides.map((row) => (
                    <Box
                      key={row.slot_date}
                      sx={{
                        px: 0.7,
                        py: 0.52,
                        borderRadius: "10px",
                        border: `1px solid ${border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.015)"
                          : "rgba(53,53,53,0.015)",
                      }}
                    >
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.75rem",
                          color: "text.secondary",
                        }}
                      >
                        {new Date(
                          `${row.slot_date}T00:00:00`,
                        ).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Typography>
                      <Typography
                        sx={{
                          fontFamily: dm,
                          fontSize: "0.75rem",
                          color: "text.primary",
                          fontWeight: 600,
                        }}
                      >
                        {row.slot_capacity} slots
                      </Typography>
                    </Box>
                  ))
                )}
              </Box>
            )}

            <Divider
              sx={{ borderColor: isDark ? BORDER_DARK : BORDER, my: 0.75 }}
            />

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                px: 0.25,
              }}
            >
              <Box
                onClick={() => setDutyScheduleOpen((v) => !v)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.35,
                  cursor: "pointer",
                  userSelect: "none",
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: dm,
                    fontSize: "0.8rem",
                    fontWeight: 700,
                    color: "text.primary",
                  }}
                >
                  Duty Schedule
                </Typography>
                <ChevronRightIcon
                  sx={{
                    fontSize: 14,
                    color: "text.secondary",
                    transform: dutyScheduleOpen ? "rotate(90deg)" : "rotate(0deg)",
                    transition: "transform 0.15s",
                    ml: "auto",
                  }}
                />
              </Box>
              <Tooltip title="Add blackout date" arrow>
                <Box
                  onClick={onOpenDutySettings}
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: "10px",
                    border: `1px solid ${border}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "text.secondary",
                    flexShrink: 0,
                    "&:hover": {
                      borderColor: GOLD,
                      backgroundColor: GOLD_08,
                      color: CHARCOAL,
                    },
                  }}
                >
                  <AddIcon sx={{ fontSize: 12 }} />
                </Box>
              </Tooltip>
            </Box>

            {dutyScheduleOpen && (
              <Box
                sx={{
                  px: 0.25,
                  py: 0.25,
                  display: "flex",
                  flexDirection: "column",
                  gap: 0.45,
                }}
              >
                {dutyBlackouts.length === 0 ? (
                  <Typography
                    sx={{
                      fontFamily: dm,
                      fontSize: "0.75rem",
                      color: "text.disabled",
                    }}
                  >
                    No blackout dates yet.
                  </Typography>
                ) : (
                  dutyBlackouts.map((row) => (
                    <Box
                      key={row.id}
                      sx={{
                        px: 0.7,
                        py: 0.52,
                        borderRadius: "10px",
                        border: `1px solid ${border}`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 1,
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.015)"
                          : "rgba(53,53,53,0.015)",
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontFamily: dm,
                            fontSize: "0.75rem",
                            color: "text.secondary",
                          }}
                        >
                          {new Date(`${row.blackout_date}T00:00:00`).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </Typography>
                        {row.reason && (
                          <Typography
                            sx={{
                              fontFamily: dm,
                              fontSize: "0.72rem",
                              color: "text.disabled",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {row.reason}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  ))
                )}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      <Dialog
        open={Boolean(pendingDeleteEvent)}
        onClose={closeDeleteConfirm}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: {
              borderRadius: "10px",
              backgroundColor: "background.paper",
              border: `1px solid ${border}`,
              backgroundImage: "none",
              boxShadow: isDark
                ? "0 20px 60px rgba(0,0,0,0.5)"
                : "0 8px 40px rgba(53,53,53,0.12)",
              overflow: "hidden",
            },
          },
        }}
      >
        <Box
          sx={{
            px: 2.5,
            pt: 2.25,
            pb: 2,
            borderBottom: `1px solid ${border}`,
            backgroundColor: isDark
              ? "rgba(220,38,38,0.04)"
              : "rgba(220,38,38,0.02)",
          }}
        >
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.9rem",
              fontWeight: 700,
              color: "text.primary",
              lineHeight: 1.2,
            }}
          >
            Delete blocked date?
          </Typography>
        </Box>

        <DialogContent sx={{ px: 2.5, py: 2.5 }}>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.83rem",
              color: "text.secondary",
              lineHeight: 1.65,
            }}
          >
            This will remove
            {pendingDeleteEvent?.title ? ` "${pendingDeleteEvent.title}"` : " this block"}
            . Clients will be able to request this date again.
          </Typography>
        </DialogContent>

        <Divider sx={{ borderColor: border }} />

        <DialogActions sx={{ px: 2.5, py: 1.75, gap: 1 }}>
          <Button
            onClick={closeDeleteConfirm}
            variant="outlined"
            sx={{
              minWidth: 112,
              height: MODAL_ACTION_HEIGHT,
              borderRadius: "10px",
              textTransform: "none",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 500,
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            variant="contained"
            sx={{
              minWidth: 132,
              height: MODAL_ACTION_HEIGHT,
              borderRadius: "10px",
              textTransform: "none",
              fontFamily: dm,
              fontSize: "0.8rem",
              fontWeight: 700,
              bgcolor: "#dc2626",
              "&:hover": { bgcolor: "#b91c1c" },
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}


