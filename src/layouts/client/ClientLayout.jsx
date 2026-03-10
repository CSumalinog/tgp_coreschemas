// src/layouts/client/ClientLayout.jsx
import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Collapse, Drawer, useMediaQuery, IconButton,
  Box, Typography, Button, Badge, Tooltip, Avatar, Switch,
} from "@mui/material";

import CalendarTodayOutlinedIcon     from "@mui/icons-material/CalendarTodayOutlined";
import KeyboardArrowDownIcon         from "@mui/icons-material/KeyboardArrowDown";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import AddIcon                       from "@mui/icons-material/Add";
import InfoOutlinedIcon              from "@mui/icons-material/InfoOutlined";
import DescriptionOutlinedIcon       from "@mui/icons-material/DescriptionOutlined";
import TrackChangesOutlinedIcon      from "@mui/icons-material/TrackChangesOutlined";
import MenuIcon                      from "@mui/icons-material/Menu";
import CloseIcon                     from "@mui/icons-material/Close";
import AccountCircleOutlinedIcon     from "@mui/icons-material/AccountCircleOutlined";
import DarkModeOutlinedIcon          from "@mui/icons-material/DarkModeOutlined";
import LogoutIcon                    from "@mui/icons-material/Logout";
import UnfoldMoreIcon                from "@mui/icons-material/UnfoldMore";

import CoverageRequestDialog from "../../components/client/RequestForm";
import GlobalSearch          from "../../components/common/GlobalSearch";
import { supabase }          from "../../lib/supabaseClient";
import { useThemeMode }      from "../../context/ThemeContext";
import { getAvatarUrl }      from "../../components/common/UserAvatar";

// ── Font injection ─────────────────────────────────────────────────────────
if (typeof document !== "undefined" && !document.getElementById("dash-fonts")) {
  const l = document.createElement("link");
  l.id = "dash-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700&display=swap";
  document.head.appendChild(l);
}

// ── Brand tokens ───────────────────────────────────────────────────────────
const SIDEBAR_W = 228;
const GOLD      = "#F5C52B";
const GOLD_08   = "rgba(245,197,43,0.08)";
const GOLD_18   = "rgba(245,197,43,0.18)";
const CHARCOAL  = "#353535";
const WHITE     = "#ffffff";

const SIDEBAR_BG       = WHITE;
const BORDER           = "rgba(53,53,53,0.08)";
const TEXT_PRIMARY     = CHARCOAL;
const TEXT_SECONDARY   = "rgba(53,53,53,0.45)";
const TEXT_LABEL       = "rgba(53,53,53,0.30)";
const ACTIVE_BG        = GOLD_08;
const ACTIVE_ICON_BG   = GOLD_18;
const HOVER_BG         = "rgba(53,53,53,0.04)";

const dm = "'DM Sans', sans-serif";

// ── Nav items ──────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { label: "Calendar",        to: "calendar",        Icon: CalendarTodayOutlinedIcon },
  { label: "Draft",           to: "draft",           Icon: DescriptionOutlinedIcon   },
  { label: "Request Tracker", to: "request-tracker", Icon: TrackChangesOutlinedIcon  },
];

function getInitials(name) {
  if (!name) return "?";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

// ── Profile Dropdown ───────────────────────────────────────────────────────
function ProfileDropdown({ open, currentUser, userProfile, onClose, footerRef }) {
  const navigate               = useNavigate();
  const { isDark, toggleDark } = useThemeMode();
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handleOutside);
    }, 50);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handleOutside); };

    function handleOutside(e) {
      if (footerRef?.current?.contains(e.target)) return;
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
  }, [open, onClose]);

  if (!open) return null;

  const row = (onClick, children, danger = false) => (
    <Box
      onClick={onClick}
      sx={{
        display: "flex", alignItems: "center", gap: 1.5,
        px: 2, py: 1, cursor: "pointer",
        transition: "background 0.12s",
        "&:hover": { backgroundColor: danger ? "rgba(198,40,40,0.05)" : HOVER_BG },
      }}
    >
      {children}
    </Box>
  );

  return (
    <Box
      ref={ref}
      sx={{
        position: "absolute",
        bottom: "100%",
        left: 0, right: 0,
        backgroundColor: WHITE,
        border: `1px solid rgba(53,53,53,0.10)`,
        borderBottom: "none",
        borderRadius: "12px 12px 0 0",
        zIndex: 1400,
        boxShadow: "0 -8px 24px rgba(53,53,53,0.08)",
        animation: "dropup 0.18s cubic-bezier(0.34,1.4,0.64,1)",
        "@keyframes dropup": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to:   { opacity: 1, transform: "translateY(0)"   },
        },
      }}
    >
      {/* Email */}
      <Box sx={{ px: 2, py: 1.25, borderBottom: `1px solid rgba(53,53,53,0.08)` }}>
        <Typography sx={{
          fontFamily: dm, fontSize: "0.72rem", color: "rgba(53,53,53,0.45)",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
        }}>
          {currentUser?.email || ""}
        </Typography>
      </Box>

      {/* Profile & Settings */}
      {row(() => { navigate("/client/profile"); onClose(); }, <>
        <AccountCircleOutlinedIcon sx={{ fontSize: 15, color: "rgba(53,53,53,0.45)" }} />
        <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: CHARCOAL, lineHeight: 1 }}>
          Profile &amp; Settings
        </Typography>
      </>)}

      {/* Dark mode */}
      {row(toggleDark, <>
        <DarkModeOutlinedIcon sx={{ fontSize: 15, color: "rgba(53,53,53,0.45)" }} />
        <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: CHARCOAL, flex: 1, lineHeight: 1 }}>
          Dark Mode
        </Typography>
        <Switch
          checked={isDark}
          onChange={toggleDark}
          onClick={(e) => e.stopPropagation()}
          size="small"
          sx={{
            "& .MuiSwitch-switchBase.Mui-checked":                    { color: GOLD },
            "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: GOLD },
            "& .MuiSwitch-track":                                     { backgroundColor: "rgba(53,53,53,0.2)" },
          }}
        />
      </>)}

      <Box sx={{ height: "1px", backgroundColor: "rgba(53,53,53,0.08)", mx: 2, my: 0.25 }} />

      {/* Log out */}
      {row(async () => { await supabase.auth.signOut(); navigate("/login"); }, <>
        <LogoutIcon sx={{ fontSize: 15, color: "#c62828" }} />
        <Typography sx={{ fontFamily: dm, fontSize: "0.8rem", color: "#c62828", lineHeight: 1 }}>
          Log out
        </Typography>
      </>, true)}
    </Box>
  );
}

// ── Sidebar Content ────────────────────────────────────────────────────────
function SidebarContent({ currentUser, userProfile, avatarUrl, onClose, isMobile }) {
  const location   = useLocation();
  const showLegend = location.pathname.includes("/calendar");
  const [showInstructions, setShowInstructions] = useState(false);
  const [dropdownOpen,     setDropdownOpen]     = useState(false);
  const footerRef = useRef(null);

  return (
    <Box sx={{
      display: "flex", flexDirection: "column", height: "100%",
      fontFamily: dm, position: "relative",
      backgroundColor: SIDEBAR_BG,
    }}>

      {/* ── Logo ── */}
      <Box sx={{
        px: 2.5, pt: 2.5, pb: 2,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{
            width: 30, height: 30, borderRadius: "8px",
            backgroundColor: GOLD,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Typography sx={{
              fontFamily: dm, fontSize: "0.92rem", fontWeight: 800,
              color: CHARCOAL, lineHeight: 1, letterSpacing: "-0.03em",
            }}>
              cs
            </Typography>
          </Box>
          <Typography sx={{
            fontFamily: dm, fontWeight: 700, fontSize: "0.92rem",
            color: TEXT_PRIMARY, letterSpacing: "-0.015em",
          }}>
            core schemas
          </Typography>
        </Box>
        {isMobile && (
          <IconButton onClick={onClose} size="small" sx={{ color: TEXT_SECONDARY, "&:hover": { color: TEXT_PRIMARY } }}>
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>

      {/* ── Nav ── */}
      <Box sx={{ flex: 1, overflowY: "auto", px: 1.5, pb: 2, "&::-webkit-scrollbar": { width: 0 } }}>

        <Typography sx={{
          fontFamily: dm, fontSize: "0.6rem", fontWeight: 700,
          color: TEXT_LABEL, letterSpacing: "0.1em",
          textTransform: "uppercase", px: 1.25, mb: 0.5,
        }}>
          MENU
        </Typography>

        {NAV_ITEMS.map((item) => (
          <NavItem key={item.to} label={item.label} Icon={item.Icon} to={item.to} />
        ))}

        {/* Calendar legend */}
        {showLegend && (
          <Box sx={{ mt: 3 }}>
            <Typography sx={{
              fontFamily: dm, fontSize: "0.6rem", fontWeight: 700,
              color: TEXT_LABEL, letterSpacing: "0.1em",
              textTransform: "uppercase", px: 1.25, mb: 0.75,
            }}>
              CALENDAR
            </Typography>

            {/* How to request */}
            <Box sx={{
              mx: 1, mb: 1,
              border: `1px solid ${BORDER}`,
              borderRadius: "10px",
              overflow: "hidden",
            }}>
              <Box
                sx={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  px: 1.5, py: 1, cursor: "pointer",
                  "&:hover": { backgroundColor: HOVER_BG },
                }}
                onClick={() => setShowInstructions((p) => !p)}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <InfoOutlinedIcon sx={{ fontSize: 14, color: GOLD }} />
                  <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: TEXT_SECONDARY }}>
                    How to Request
                  </Typography>
                </Box>
                <KeyboardArrowDownIcon sx={{
                  fontSize: 15, color: TEXT_SECONDARY,
                  transition: "transform 0.2s",
                  transform: showInstructions ? "rotate(180deg)" : "rotate(0deg)",
                }} />
              </Box>
              <Collapse in={showInstructions}>
                <Box sx={{ px: 1.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {[
                    'Click "Create Request" in the topbar to fill out a new request.',
                    "Or click any available date on the calendar to pre-fill the date.",
                    "Past dates and blocked dates are unavailable.",
                  ].map((text, i) => (
                    <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                      <Typography sx={{
                        fontFamily: dm, fontSize: "0.68rem", color: GOLD,
                        fontWeight: 700, flexShrink: 0, mt: 0.1,
                      }}>
                        {i + 1}.
                      </Typography>
                      <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: TEXT_SECONDARY, lineHeight: 1.5 }}>
                        {text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Collapse>
            </Box>

            <CollapsibleLegend title="My Calendars" items={[
              { color: "#15803d", label: "Available" },
              { color: GOLD,      label: "Fully Booked" },
              { color: "#d32f2f", label: "Office Unavailable" },
            ]} />
            <CollapsibleLegend title="Other Calendars" items={[
              { color: "#4caf50",           label: "Holidays in the Philippines" },
              { color: "rgba(53,53,53,0.15)", label: "Weekend", isBorder: true },
              { color: "#1976d2",           label: "Today" },
            ]} />
          </Box>
        )}
      </Box>

      {/* ── Footer + Dropdown wrapper ── */}
      <Box sx={{ position: "relative" }}>
        <ProfileDropdown
          open={dropdownOpen}
          currentUser={currentUser}
          userProfile={userProfile}
          onClose={() => setDropdownOpen(false)}
          footerRef={footerRef}
        />

        {/* Footer row */}
        <Box
          ref={footerRef}
          onClick={() => setDropdownOpen(p => !p)}
          sx={{
            px: 2, py: 1.5,
            borderTop: `1px solid ${BORDER}`,
            display: "flex", alignItems: "center", gap: 1.25,
            cursor: "pointer", userSelect: "none",
            transition: "background 0.15s",
            backgroundColor: dropdownOpen ? HOVER_BG : "transparent",
            "&:hover": { backgroundColor: HOVER_BG },
          }}
        >
          <Avatar
            src={avatarUrl || undefined}
            sx={{
              width: 30, height: 30, flexShrink: 0,
              backgroundColor: GOLD, color: CHARCOAL,
              fontSize: "0.72rem", fontWeight: 700, fontFamily: dm,
            }}
          >
            {!avatarUrl && getInitials(userProfile?.full_name)}
          </Avatar>

          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{
              fontFamily: dm, fontSize: "0.78rem", fontWeight: 600, color: TEXT_PRIMARY,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.3,
            }}>
              {userProfile?.full_name || "Client"}
            </Typography>
            <Typography sx={{
              fontFamily: dm, fontSize: "0.64rem", color: TEXT_SECONDARY,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              lineHeight: 1.3, mt: 0.1,
            }}>
              {currentUser?.email || ""}
            </Typography>
          </Box>

          <UnfoldMoreIcon sx={{
            fontSize: 15, flexShrink: 0,
            color: TEXT_SECONDARY,
            transition: "color 0.15s",
            ...(dropdownOpen && { color: TEXT_PRIMARY }),
          }} />
        </Box>
      </Box>
    </Box>
  );
}

// ── NavItem ────────────────────────────────────────────────────────────────
function NavItem({ label, Icon, to }) {
  const location = useLocation();
  const active   = location.pathname.includes(to);

  return (
    <NavLink to={to} style={{ textDecoration: "none" }}>
      <Box sx={{
        display: "flex", alignItems: "center", gap: 1.25,
        px: 1.25, py: 0.8, borderRadius: "9px",
        cursor: "pointer", position: "relative", mb: 0.2,
        backgroundColor: active ? ACTIVE_BG : "transparent",
        transition: "background 0.15s",
        "&:hover": { backgroundColor: active ? ACTIVE_BG : HOVER_BG },
        "&::before": active ? {
          content: '""', position: "absolute",
          left: 0, top: "20%", height: "60%", width: "2.5px",
          borderRadius: "0 2px 2px 0", backgroundColor: GOLD,
        } : {},
      }}>
        {Icon && (
          <Box sx={{
            width: 24, height: 24, borderRadius: "7px",
            display: "flex", alignItems: "center", justifyContent: "center",
            backgroundColor: active ? ACTIVE_ICON_BG : "transparent",
            flexShrink: 0, transition: "background 0.15s",
          }}>
            <Icon sx={{
              fontSize: 15,
              color: active ? GOLD : TEXT_SECONDARY,
              transition: "color 0.15s",
            }} />
          </Box>
        )}
        <Typography sx={{
          fontFamily: dm, fontSize: "0.81rem",
          fontWeight: active ? 600 : 400,
          color: active ? TEXT_PRIMARY : TEXT_SECONDARY,
          flex: 1, transition: "color 0.15s", lineHeight: 1,
        }}>
          {label}
        </Typography>
      </Box>
    </NavLink>
  );
}

// ── Collapsible Legend ─────────────────────────────────────────────────────
function CollapsibleLegend({ title, items }) {
  const [open, setOpen] = useState(false);

  return (
    <Box sx={{
      mx: 1, mb: 1,
      border: `1px solid ${BORDER}`,
      borderRadius: "10px", overflow: "hidden",
    }}>
      <Box
        sx={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          px: 1.5, py: 1, cursor: "pointer",
          "&:hover": { backgroundColor: HOVER_BG },
        }}
        onClick={() => setOpen((p) => !p)}
      >
        <Typography sx={{ fontFamily: dm, fontSize: "0.78rem", color: TEXT_SECONDARY }}>{title}</Typography>
        <KeyboardArrowDownIcon sx={{
          fontSize: 15, color: TEXT_SECONDARY,
          transition: "transform 0.2s",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
        }} />
      </Box>
      <Collapse in={open}>
        <Box sx={{ px: 1.5, pb: 1.5, display: "flex", flexDirection: "column", gap: 0.85 }}>
          {items.map((item, idx) => (
            <Box key={idx} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{
                width: 9, height: 9, borderRadius: "50%", flexShrink: 0,
                backgroundColor: item.isBorder ? "transparent" : item.color,
                border: item.isBorder ? `2px solid rgba(53,53,53,0.25)` : "none",
              }} />
              <Typography sx={{ fontFamily: dm, fontSize: "0.72rem", color: TEXT_SECONDARY }}>{item.label}</Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Main Layout ────────────────────────────────────────────────────────────
function ClientLayout() {
  const isMobile = useMediaQuery("(max-width:900px)");

  const [openDialog,  setOpenDialog]  = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [avatarUrl,   setAvatarUrl]   = useState(null);

  const unreadCount = 0;

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);
      const { data } = await supabase.from("profiles")
        .select("full_name, role, avatar_url").eq("id", user.id).single();
      if (data) {
        setUserProfile(data);
        setAvatarUrl(getAvatarUrl(data.avatar_url) || null);
      }
    }
    loadUser();
  }, []);

  const sidebarNode = (
    <SidebarContent
      currentUser={currentUser}
      userProfile={userProfile}
      avatarUrl={avatarUrl}
      onClose={() => setMobileOpen(false)}
      isMobile={isMobile}
      onCreateRequest={() => setOpenDialog(true)}
    />
  );

  return (
    <Box sx={{ display: "flex", height: "100vh", fontFamily: dm }}>

      {/* ── Desktop sidebar ── */}
      {!isMobile && (
        <Box sx={{
          width: SIDEBAR_W, flexShrink: 0,
          backgroundColor: SIDEBAR_BG,
          borderRight: `1px solid ${BORDER}`,
          display: "flex", flexDirection: "column",
          height: "100vh", zIndex: 1200, overflow: "visible",
        }}>
          {sidebarNode}
        </Box>
      )}

      {/* ── Mobile drawer ── */}
      {isMobile && (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          variant="temporary"
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: SIDEBAR_W,
              backgroundColor: SIDEBAR_BG,
              border: "none",
              borderRight: `1px solid ${BORDER}`,
            },
          }}
        >
          {sidebarNode}
        </Drawer>
      )}

      {/* ── Main area ── */}
      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", backgroundColor: "#F5F5F7" }}>

        {/* Topbar */}
        <Box sx={{
          display: "flex", alignItems: "center",
          px: 3, height: 60, flexShrink: 0,
          backgroundColor: WHITE,
          borderBottom: `1px solid ${BORDER}`,
          gap: 2,
        }}>
          {isMobile && (
            <IconButton
              onClick={() => setMobileOpen(true)}
              size="small"
              sx={{
                color: TEXT_SECONDARY, borderRadius: "8px", p: 0.75, mr: 0.5,
                "&:hover": { backgroundColor: HOVER_BG, color: TEXT_PRIMARY },
              }}
            >
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}

          {/* Gold CTA button — charcoal text on gold */}
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: 15 }} />}
            onClick={() => setOpenDialog(true)}
            sx={{
              textTransform: "none",
              fontFamily: dm,
              fontWeight: 600,
              fontSize: "0.81rem",
              borderRadius: "9px",
              height: 34,
              px: 1.75,
              backgroundColor: GOLD,
              color: CHARCOAL,
              boxShadow: "none",
              "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
              transition: "background 0.15s",
            }}
          >
            Create Request
          </Button>

          <Box sx={{ flex: 1 }} />

          <GlobalSearch role="client" userId={currentUser?.id} alwaysExpanded />

          <Tooltip title="Notifications" arrow>
            <IconButton
              size="small"
              sx={{
                borderRadius: "9px", p: 0.9,
                border: `1px solid ${BORDER}`,
                backgroundColor: "transparent",
                color: TEXT_SECONDARY,
                transition: "all 0.15s",
                "&:hover": {
                  backgroundColor: GOLD_08,
                  borderColor: GOLD,
                  color: CHARCOAL,
                },
              }}
            >
              <Badge
                badgeContent={unreadCount}
                invisible={unreadCount === 0}
                sx={{
                  "& .MuiBadge-badge": {
                    fontSize: "0.6rem", height: 15, minWidth: 15,
                    backgroundColor: "#c62828",
                  },
                }}
              >
                <NotificationsNoneOutlinedIcon sx={{ fontSize: 18 }} />
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <Outlet />
        </Box>
      </Box>

      <CoverageRequestDialog
        open={openDialog}
        handleClose={() => setOpenDialog(false)}
        onSuccess={() => setOpenDialog(false)}
      />
    </Box>
  );
}

export default ClientLayout;