// src/layouts/client/ClientLayout.jsx
import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Collapse,
  Drawer,
  useMediaQuery,
  IconButton,
  Box,
  Typography,
  Button,
  Avatar,
  Switch,
} from "@mui/material";

import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDownOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import TrackChangesOutlinedIcon from "@mui/icons-material/TrackChangesOutlined";
import MenuIcon from "@mui/icons-material/MenuOutlined";
import CloseIcon from "@mui/icons-material/Close";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LogoutIcon from "@mui/icons-material/LogoutOutlined";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMoreOutlined";
import HelpOutlineIcon from "@mui/icons-material/HelpOutlineOutlined";
import TrackChangesIcon from "@mui/icons-material/TrackChangesOutlined";

import CoverageRequestDialog from "../../components/client/RequestForm";
import NotificationBell from "../../components/common/NotificationBell";
import { SuccessToastProvider } from "../../components/common/SuccessToast";
import { supabase } from "../../lib/supabaseClient";
import { useThemeMode } from "../../context/ThemeContext";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import {
  BUTTON_HEIGHT,
  LAYOUT_ICON_LG,
  LAYOUT_ICON_MD,
  LAYOUT_ICON_SM,
  LAYOUT_ICON_TINY,
} from "../../utils/layoutTokens";
import brandLogo from "../../assets/img/cs-logo.png";

if (typeof document !== "undefined" && !document.getElementById("dash-fonts")) {
  const l = document.createElement("link");
  l.id = "dash-fonts";
  l.rel = "stylesheet";
  l.href =
    "https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800;1,9..40,400&display=swap";
  document.head.appendChild(l);
}

const SIDEBAR_W = 228;
const GOLD = "#F5C52B";
const CHARCOAL = "#353535";
const WHITE = "#ffffff";
const dm = "'Inter', sans-serif";

// ── Gold sidebar tokens ───────────────────────────────────────────────────────
const SIDEBAR_BG = "#121212";
const SIDEBAR_BORDER = "rgba(255,255,255,0.07)";
const TEXT_PRIMARY = "#ffffff";
const TEXT_SECONDARY = "rgba(255,255,255,0.85)";
const TEXT_ICON = "rgba(255,255,255,0.4)";
const TEXT_LABEL = "rgba(255,255,255,0.35)";
const ACTIVE_BG = "rgba(245,197,43,0.15)";
const ACTIVE_ICON_BG = "rgba(245,197,43,0.22)";
const HOVER_BG = "rgba(255,255,255,0.10)";
const BORDER = "rgba(53,53,53,0.08)";

const MENU_SECTIONS = [
  {
    group: "MENU",
    items: [
      { label: "Calendar", to: "calendar", Icon: CalendarTodayOutlinedIcon },
      { label: "Draft", to: "draft", Icon: DescriptionOutlinedIcon },
      {
        label: "Request Tracker",
        to: "request-tracker",
        Icon: TrackChangesOutlinedIcon,
      },
    ],
  },
];

function getInitials(name) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ── Help popover ──────────────────────────────────────────────────────────────
function HelpPopover({ open, onClose, anchorRef }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handleOutside);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleOutside);
    };
    function handleOutside(e) {
      if (anchorRef?.current?.contains(e.target)) return;
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
  }, [open, onClose, anchorRef]);
  if (!open) return null;
  return (
    <Box
      ref={ref}
      sx={{
        position: "absolute",
        bottom: "calc(100% + 8px)",
        left: 12,
        width: 256,
        backgroundColor: WHITE,
        border: "1px solid rgba(53,53,53,0.10)",
        borderRadius: "10px",
        zIndex: 1400,
        boxShadow:
          "0 -4px 24px rgba(53,53,53,0.15), 0 8px 32px rgba(53,53,53,0.10)",
        overflow: "hidden",
        animation: "helpPopup 0.16s cubic-bezier(0.34,1.4,0.64,1)",
        "@keyframes helpPopup": {
          from: { opacity: 0, transform: "translateY(6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Box
        sx={{
          px: 2,
          pt: 1.75,
          pb: 1.25,
          borderBottom: "1px solid rgba(53,53,53,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 1,
        }}
      >
        <HelpOutlineIcon
          sx={{ fontSize: LAYOUT_ICON_SM, color: GOLD, flexShrink: 0 }}
        />
        <Box>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.82rem",
              fontWeight: 700,
              color: CHARCOAL,
              lineHeight: 1.3,
            }}
          >
            How to request coverage
          </Typography>
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.68rem",
              color: "rgba(53,53,53,0.55)",
              mt: 0.2,
            }}
          >
            Quick guide to submitting a request
          </Typography>
        </Box>
      </Box>
      <Box
        sx={{
          px: 2,
          py: 1.75,
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
        }}
      >
        {[
          {
            text: 'Click "Create Request" in the top bar to open the request form.',
          },
          {
            text: "Or click any available date on the calendar to pre-fill the date field.",
          },
          {
            text: "Past dates and blocked dates cannot be selected.",
            note: true,
          },
        ].map((step, i) => (
          <Box
            key={i}
            sx={{ display: "flex", alignItems: "flex-start", gap: 1.25 }}
          >
            <Box
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                backgroundColor: step.note ? "rgba(53,53,53,0.08)" : CHARCOAL,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                mt: 0.1,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: step.note ? CHARCOAL : WHITE,
                  lineHeight: 1,
                }}
              >
                {step.note ? "!" : i + 1}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.78rem",
                color: "rgba(53,53,53,0.8)",
                lineHeight: 1.55,
              }}
            >
              {step.text}
            </Typography>
          </Box>
        ))}
      </Box>
      <Box
        sx={{
          px: 2,
          py: 1.25,
          borderTop: "1px solid rgba(53,53,53,0.08)",
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          backgroundColor: "rgba(53,53,53,0.02)",
        }}
      >
        <TrackChangesIcon
          sx={{
            fontSize: LAYOUT_ICON_TINY,
            color: "rgba(53,53,53,0.4)",
            flexShrink: 0,
          }}
        />
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.73rem",
            color: "rgba(53,53,53,0.6)",
          }}
        >
          Track your requests in Request Tracker
        </Typography>
      </Box>
    </Box>
  );
}

// ── Profile dropdown ──────────────────────────────────────────────────────────
function ProfileDropdown({ open, currentUser, onClose, footerRef }) {
  const navigate = useNavigate();
  const { isDark, toggleDark } = useThemeMode();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      document.addEventListener("mousedown", handleOutside);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", handleOutside);
    };
    function handleOutside(e) {
      if (footerRef?.current?.contains(e.target)) return;
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
  }, [open, onClose, footerRef]);
  if (!open) return null;
  const row = (onClick, children, danger = false) => (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 2,
        py: 1,
        cursor: "pointer",
        transition: "background 0.12s",
        "&:hover": {
          backgroundColor: danger
            ? "rgba(198,40,40,0.05)"
            : "rgba(53,53,53,0.04)",
        },
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
        top: "calc(100% + 8px)",
        right: 0,
        width: 240,
        backgroundColor: WHITE,
        border: "1px solid rgba(53,53,53,0.12)",
        borderRadius: "10px",
        zIndex: 1400,
        boxShadow: "0 8px 32px rgba(53,53,53,0.15)",
        animation: "dropdown 0.18s cubic-bezier(0.34,1.4,0.64,1)",
        "@keyframes dropdown": {
          from: { opacity: 0, transform: "translateY(-6px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      }}
    >
      <Box
        sx={{ px: 2, py: 1.25, borderBottom: "1px solid rgba(53,53,53,0.08)" }}
      >
        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.72rem",
            color: "rgba(53,53,53,0.45)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {currentUser?.email || ""}
        </Typography>
      </Box>
      {row(
        () => {
          navigate("/client/profile");
          onClose();
        },
        <>
          <AccountCircleOutlinedIcon
            sx={{ fontSize: LAYOUT_ICON_SM, color: "rgba(53,53,53,0.45)" }}
          />
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              color: CHARCOAL,
              lineHeight: 1,
            }}
          >
            Profile &amp; Settings
          </Typography>
        </>,
      )}
      {row(
        toggleDark,
        <>
          <DarkModeOutlinedIcon
            sx={{ fontSize: LAYOUT_ICON_SM, color: "rgba(53,53,53,0.45)" }}
          />
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              color: CHARCOAL,
              flex: 1,
              lineHeight: 1,
            }}
          >
            Dark Mode
          </Typography>
          <Switch
            checked={isDark}
            onChange={toggleDark}
            onClick={(e) => e.stopPropagation()}
            size="small"
            sx={{
              "& .MuiSwitch-switchBase.Mui-checked": { color: CHARCOAL },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: CHARCOAL,
              },
              "& .MuiSwitch-track": { backgroundColor: "rgba(53,53,53,0.2)" },
            }}
          />
        </>,
      )}
      <Box
        sx={{
          height: "1px",
          backgroundColor: "rgba(53,53,53,0.08)",
          mx: 2,
          my: 0.25,
        }}
      />
      {row(
        async () => {
          await supabase.auth.signOut();
          navigate("/login");
        },
        <>
          <LogoutIcon sx={{ fontSize: LAYOUT_ICON_SM, color: "#c62828" }} />
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.8rem",
              color: "#c62828",
              lineHeight: 1,
            }}
          >
            Log out
          </Typography>
        </>,
        true,
      )}
    </Box>
  );
}

// ── Sidebar content ───────────────────────────────────────────────────────────
function SidebarContent({ onClose, isMobile, draftCount }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const helpRef = useRef(null);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        fontFamily: dm,
        position: "relative",
        backgroundColor: SIDEBAR_BG,
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: 2.5,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          borderBottom: `1px solid ${SIDEBAR_BORDER}`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box
            component="img"
            src={brandLogo}
            alt="core schemas logo"
            sx={{
              width: 34,
              height: 34,
              objectFit: "contain",
              flexShrink: 0,
            }}
          />
          <Typography
            sx={{
              fontFamily: dm,
              fontWeight: 700,
              fontSize: "0.92rem",
              color: TEXT_PRIMARY,
              letterSpacing: "-0.015em",
            }}
          >
            core schemas
          </Typography>
        </Box>
        {isMobile && (
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: TEXT_SECONDARY,
              "&:hover": { color: TEXT_PRIMARY, backgroundColor: HOVER_BG },
            }}
          >
            <CloseIcon sx={{ fontSize: LAYOUT_ICON_MD }} />
          </IconButton>
        )}
      </Box>

      {/* Nav */}
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 0,
          py: 1.5,
          "&::-webkit-scrollbar": { width: 0 },
        }}
      >
        {MENU_SECTIONS.map((section) => (
          <Box key={section.group} sx={{ mb: 2 }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.6rem",
                fontWeight: 700,
                color: TEXT_LABEL,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                px: 2,
                mb: 0.75,
              }}
            >
              {section.group}
            </Typography>
            {section.items.map((item) => (
              <NavItem
                key={item.to}
                label={item.label}
                Icon={item.Icon}
                to={item.to}
                trailing={
                  item.to === "draft" && draftCount > 0 ? (
                    <Box
                      sx={{
                        minWidth: 18,
                        height: 18,
                        borderRadius: "9px",
                        backgroundColor: "#F5C52B",
                        color: "#212121",
                        fontSize: "0.62rem",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        px: 0.5,
                      }}
                    >
                      {draftCount}
                    </Box>
                  ) : undefined
                }
              />
            ))}
          </Box>
        ))}
        <CalendarLegendSection />
      </Box>

      {/* Help row */}
      <Box
        ref={helpRef}
        sx={{
          position: "relative",
          borderTop: `1px solid ${SIDEBAR_BORDER}`,
          px: 2,
          py: 1,
          display: "flex",
          alignItems: "center",
        }}
      >
        <HelpPopover
          open={helpOpen}
          onClose={() => setHelpOpen(false)}
          anchorRef={helpRef}
        />
        <Box
          onClick={() => {
            setHelpOpen((p) => !p);
          }}
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.25,
            py: 0.5,
            borderRadius: "10px",
            cursor: "pointer",
            border: `1px solid ${helpOpen ? "rgba(245,197,43,0.5)" : "rgba(245,197,43,0.25)"}`,
            backgroundColor: helpOpen
              ? "rgba(245,197,43,0.1)"
              : "rgba(245,197,43,0.06)",
            transition: "all 0.15s",
            "&:hover": {
              borderColor: "rgba(245,197,43,0.45)",
              backgroundColor: "rgba(245,197,43,0.1)",
            },
          }}
        >
          <HelpOutlineIcon
            sx={{ fontSize: LAYOUT_ICON_TINY, color: TEXT_SECONDARY }}
          />
          <Typography
            sx={{
              fontFamily: dm,
              fontSize: "0.75rem",
              fontWeight: 500,
              color: TEXT_SECONDARY,
              lineHeight: 1,
            }}
          >
            Help
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ── Calendar legend ───────────────────────────────────────────────────────────
function CalendarLegendSection() {
  const location = useLocation();
  if (!location.pathname.includes("/calendar")) return null;
  return (
    <Box sx={{ mt: 2 }}>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.6rem",
          fontWeight: 700,
          color: TEXT_LABEL,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          px: 1.25,
          mb: 0.75,
        }}
      >
        CALENDAR
      </Typography>
      <CollapsibleLegend
        title="My Calendars"
        items={[
          { color: "#15803d", label: "Available" },
          { color: CHARCOAL, label: "Fully Booked" },
          { color: "#d32f2f", label: "Office Unavailable" },
        ]}
      />
    </Box>
  );
}

function CollapsibleLegend({ title, items }) {
  const [open, setOpen] = useState(false);
  return (
    <Box
      sx={{
        mx: 1,
        mb: 1,
        border: `1px solid ${SIDEBAR_BORDER}`,
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 1.5,
          py: 1,
          cursor: "pointer",
          "&:hover": { backgroundColor: HOVER_BG },
        }}
        onClick={() => setOpen((p) => !p)}
      >
        <Typography
          sx={{ fontFamily: dm, fontSize: "0.78rem", color: TEXT_SECONDARY }}
        >
          {title}
        </Typography>
        <KeyboardArrowDownIcon
          sx={{
            fontSize: LAYOUT_ICON_SM,
            color: TEXT_SECONDARY,
            transition: "transform 0.2s",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </Box>
      <Collapse in={open}>
        <Box
          sx={{
            px: 1.5,
            pb: 1.5,
            display: "flex",
            flexDirection: "column",
            gap: 0.85,
          }}
        >
          {items.map((item, idx) => (
            <Box
              key={idx}
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  flexShrink: 0,
                  backgroundColor: item.isBorder ? "transparent" : item.color,
                  border: item.isBorder
                    ? "2px solid rgba(53,53,53,0.3)"
                    : "none",
                }}
              />
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.72rem",
                  color: TEXT_SECONDARY,
                }}
              >
                {item.label}
              </Typography>
            </Box>
          ))}
        </Box>
      </Collapse>
    </Box>
  );
}

// ── Nav item ──────────────────────────────────────────────────────────────────
function NavItem({ label, Icon, to, onClick, isActive, trailing }) {
  const location = useLocation();
  const routeActive = to ? location.pathname.includes(to) : false;
  const active = isActive || routeActive;

  const inner = (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        pl: 1.5,
        pr: 1.5,
        py: 1.1,
        cursor: "pointer",
        position: "relative",
        mb: 0.1,
        transition: "background 0.15s",
        "&:hover .nav-item-icon": { color: GOLD },
        "&:hover .nav-label": { color: TEXT_PRIMARY },
        "&::before": active
          ? {
              content: '""',
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: "2.5px",
              borderRadius: "0 2px 2px 0",
              backgroundColor: GOLD,
            }
          : {},
      }}
    >
      {Icon && (
        <Box
          sx={{
            width: 28,
            height: 28,
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: active ? ACTIVE_ICON_BG : "transparent",
            transition: "background 0.15s",
          }}
        >
          <Icon
            className="nav-item-icon"
            sx={{
              fontSize: 16,
              color: active ? GOLD : TEXT_ICON,
              transition: "color 0.15s",
            }}
          />
        </Box>
      )}
      <Typography
        className="nav-label"
        sx={{
          fontFamily: dm,
          fontSize: "0.8rem",
          fontWeight: active ? 600 : 400,
          color: active ? TEXT_PRIMARY : TEXT_SECONDARY,
          flex: 1,
          transition: "color 0.15s",
          lineHeight: 1,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </Typography>
      {trailing}
    </Box>
  );

  if (to)
    return (
      <NavLink to={to} style={{ textDecoration: "none", display: "block" }}>
        {inner}
      </NavLink>
    );
  return inner;
}

// ── Main layout ───────────────────────────────────────────────────────────────
function ClientLayout() {
  const isMobile = useMediaQuery("(max-width:900px)");
  const [openDialog, setOpenDialog] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const avatarRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [draftCount, setDraftCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setCurrentUser(user);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (data) {
        setUserProfile(data);
        setAvatarUrl(getAvatarUrl(data.avatar_url) || null);
      }
      supabase
        .from("coverage_requests")
        .select("id", { count: "exact", head: true })
        .eq("requester_id", user.id)
        .eq("status", "Draft")
        .then(({ count }) => {
          if (!cancelled) setDraftCount(count || 0);
        });
    }
    loadUser();
    return () => {
      cancelled = true;
    };
  }, []);

  const sidebarNode = (
    <SidebarContent
      currentUser={currentUser}
      userProfile={userProfile}
      avatarUrl={avatarUrl}
      onClose={() => setMobileOpen(false)}
      isMobile={isMobile}
      draftCount={draftCount}
    />
  );

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        fontFamily: dm,
        backgroundColor: "background.default",
      }}
    >
      {!isMobile && (
        <Box
          sx={{
            width: SIDEBAR_W,
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            height: "100vh",
            zIndex: 1200,
            borderRight: "1px solid rgba(53,53,53,0.12)",
          }}
        >
          {sidebarNode}
        </Box>
      )}
      {isMobile && (
        <Drawer
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          variant="temporary"
          ModalProps={{ keepMounted: true }}
          sx={{
            "& .MuiDrawer-paper": {
              width: SIDEBAR_W,
              border: "none",
              borderRight: "1px solid rgba(53,53,53,0.12)",
            },
          }}
        >
          {sidebarNode}
        </Drawer>
      )}

      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          backgroundColor: "background.default",
          minWidth: 0,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            px: { xs: 1.5, sm: 3 },
            height: 60,
            flexShrink: 0,
            backgroundColor: WHITE,
            borderBottom: `1px solid ${BORDER}`,
            gap: { xs: 1, sm: 2 },
          }}
        >
          {isMobile && (
            <IconButton
              onClick={() => setMobileOpen(true)}
              size="small"
              sx={{
                color: "rgba(53,53,53,0.6)",
                borderRadius: "10px",
                p: 0.75,
                "&:hover": {
                  backgroundColor: "rgba(53,53,53,0.04)",
                  color: CHARCOAL,
                },
              }}
            >
              <MenuIcon sx={{ fontSize: LAYOUT_ICON_LG }} />
            </IconButton>
          )}
          <Button
            variant="contained"
            size="small"
            startIcon={<AddIcon sx={{ fontSize: LAYOUT_ICON_SM }} />}
            onClick={() => setOpenDialog(true)}
            sx={{
              textTransform: "none",
              fontFamily: dm,
              fontWeight: 600,
              fontSize: "0.81rem",
              borderRadius: "10px",
              height: BUTTON_HEIGHT,
              px: { xs: 1, sm: 1.75 },
              minWidth: 0,
              backgroundColor: GOLD,
              color: CHARCOAL,
              boxShadow: "none",
              "& .MuiButton-startIcon": { mr: { xs: 0, sm: 0.75 } },
              "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
              transition: "background 0.15s",
            }}
          >
            <Box
              component="span"
              sx={{ display: { xs: "none", sm: "inline" } }}
            >
              Create Request
            </Box>
          </Button>
          <Box sx={{ flex: 1 }} />
          <NotificationBell userId={currentUser?.id} />
          <Box sx={{ position: "relative" }}>
            <Avatar
              ref={avatarRef}
              src={avatarUrl || undefined}
              onClick={() => setDropdownOpen((p) => !p)}
              sx={{
                width: 36,
                height: 36,
                cursor: "pointer",
                backgroundColor: GOLD,
                color: CHARCOAL,
                fontSize: "0.72rem",
                fontWeight: 700,
                fontFamily: dm,
                transition: "box-shadow 0.15s",
                "&:hover": { boxShadow: "0 0 0 2px rgba(53,53,53,0.15)" },
              }}
            >
              {!avatarUrl && getInitials(userProfile?.full_name)}
            </Avatar>
            <ProfileDropdown
              open={dropdownOpen}
              currentUser={currentUser}
              userProfile={userProfile}
              onClose={() => setDropdownOpen(false)}
              footerRef={avatarRef}
            />
          </Box>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto" }}>
          <SuccessToastProvider>
            <Outlet />
          </SuccessToastProvider>
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
