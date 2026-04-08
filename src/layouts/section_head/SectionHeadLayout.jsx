// src/layouts/section_head/SectionHeadLayout.jsx
import React, { useState, useEffect, useRef } from "react";
import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  Avatar,
  Drawer,
  useMediaQuery,
  Switch,
  useTheme,
  Collapse,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AssignmentOutlinedIcon from "@mui/icons-material/AssignmentOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import AccountCircleOutlinedIcon from "@mui/icons-material/AccountCircleOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import UnfoldMoreIcon from "@mui/icons-material/UnfoldMore";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import GlobalSearch from "../../components/common/GlobalSearch";
import NotificationBell from "../../components/common/NotificationBell";
import { RealtimeToastProvider } from "../../components/common/RealtimeToast";
import { supabase } from "../../lib/supabaseClient";
import { useThemeMode } from "../../context/ThemeContext";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import brandLogo from "../../assets/img/cs-logo.png";

const SIDEBAR_W = 228;
const GOLD = "#F5C52B";
const CHARCOAL = "#353535";
const WHITE = "#ffffff";
const dm = "'Inter', sans-serif";
const SIDEBAR_BG = "#121212";
const SIDEBAR_BORDER = "rgba(255,255,255,0.07)";
const TEXT_PRIMARY = "#ffffff";
const TEXT_SECONDARY = "rgba(255,255,255,0.85)";
const TEXT_ICON = "rgba(255,255,255,0.70)";
const TEXT_LABEL = "rgba(255,255,255,0.35)";
const ACTIVE_BG = "rgba(245,197,43,0.15)";
const ACTIVE_ICON_BG = "rgba(245,197,43,0.22)";
const ACTIVE_COLOR = GOLD;
const HOVER_BG = "rgba(255,255,255,0.10)";
const BORDER = "rgba(53,53,53,0.08)";

const MENU_SECTIONS = [
  {
    group: "MENU",
    items: [
      { label: "Dashboard", to: "dashboard", Icon: DashboardOutlinedIcon },
      {
        label: "Coverage Assignment",
        to: "coverage-assignment",
        Icon: AssignmentOutlinedIcon,
      },
      { label: "My Staffers", to: "my-staffers", Icon: GroupOutlinedIcon },
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

function ProfileDropdown({
  open,
  currentUser,
  onClose,
  footerRef,
}) {
  const navigate = useNavigate();
  const { isDark, toggleDark } = useThemeMode();
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      document.addEventListener("mousedown", h);
    }, 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", h);
    };
    function h(e) {
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
          navigate("/sec_head/profile");
          onClose();
        },
        <>
          <AccountCircleOutlinedIcon
            sx={{ fontSize: 15, color: "rgba(53,53,53,0.45)" }}
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
            sx={{ fontSize: 15, color: "rgba(53,53,53,0.45)" }}
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
              "& .MuiSwitch-switchBase.Mui-checked": { color: GOLD },
              "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                backgroundColor: GOLD,
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
          <LogoutIcon sx={{ fontSize: 15, color: "#c62828" }} />
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

function SidebarContent({ onClose, isMobile }) {
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState({});
  const toggleGroup = (label) =>
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  const isChildActive = (children) =>
    children?.some((c) => location.pathname.includes(c.to));

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
            <CloseIcon sx={{ fontSize: 18 }} />
          </IconButton>
        )}
      </Box>
      <Box
        sx={{
          flex: 1,
          overflowY: "auto",
          px: 1.5,
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
                px: 1.25,
                mb: 0.75,
              }}
            >
              {section.group}
            </Typography>
            {section.items.map((item) => {
              if (item.children) {
                const isOpen = openGroups[item.label];
                const anyActive = isChildActive(item.children);
                return (
                  <Box key={item.label}>
                    <NavItem
                      label={item.label}
                      Icon={item.Icon}
                      onClick={() => toggleGroup(item.label)}
                      isActive={anyActive && !isOpen}
                      trailing={
                        <KeyboardArrowDownIcon
                          sx={{
                            fontSize: 15,
                            color: TEXT_ICON,
                            transition: "transform 0.22s",
                            transform: isOpen
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                          }}
                        />
                      }
                    />
                    <Collapse in={isOpen} timeout="auto" unmountOnExit>
                      <Box sx={{ pl: 1.5, mt: 0.25 }}>
                        {item.children.map((child) => (
                          <NavItem
                            key={child.to}
                            label={child.label}
                            Icon={child.Icon}
                            to={child.to}
                            isChild
                          />
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                );
              }
              return (
                <NavItem
                  key={item.to}
                  label={item.label}
                  Icon={item.Icon}
                  to={item.to}
                />
              );
            })}
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function NavItem({ label, Icon, to, onClick, isActive, isChild, trailing }) {
  const location = useLocation();
  const routeActive = to ? location.pathname.includes(to) : false;
  const active = isActive || routeActive;

  const inner = (
    <Box
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        px: 1.25,
        py: 0.8,
        borderRadius: "10px",
        cursor: "pointer",
        position: "relative",
        mb: 0.2,
        backgroundColor: active ? ACTIVE_BG : "transparent",
        transition: "background 0.15s",
        "&:hover": { backgroundColor: active ? ACTIVE_BG : HOVER_BG },
        "&::before": active
          ? {
              content: '""',
              position: "absolute",
              left: 0,
              top: "20%",
              height: "60%",
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
            width: 24,
            height: 24,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? ACTIVE_ICON_BG : "transparent",
            flexShrink: 0,
            transition: "background 0.15s",
          }}
        >
          <Icon
            sx={{
              fontSize: isChild ? 13 : 15,
              color: active ? GOLD : TEXT_ICON,
              transition: "color 0.15s",
            }}
          />
        </Box>
      )}
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: isChild ? "0.76rem" : "0.81rem",
          fontWeight: active ? 600 : 400,
          color: active ? ACTIVE_COLOR : TEXT_SECONDARY,
          flex: 1,
          transition: "color 0.15s",
          lineHeight: 1,
        }}
      >
        {label}
      </Typography>
      {trailing}
    </Box>
  );

  return to ? (
    <NavLink to={to} style={{ textDecoration: "none" }}>
      {inner}
    </NavLink>
  ) : (
    inner
  );
}

function SectionHeadLayout() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const isMobile = useMediaQuery("(max-width:900px)");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const avatarRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setCurrentUser(user);
      const { data } = await supabase
        .from("profiles")
        .select("full_name, role, avatar_url")
        .eq("id", user.id)
        .single();
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
    />
  );
  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        fontFamily: dm,
        backgroundColor: "#ffffff",
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
            borderRight: `1px solid ${SIDEBAR_BORDER}`,
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
              borderRight: `1px solid ${SIDEBAR_BORDER}`,
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
          backgroundColor: isDark ? "#0D0D0F" : "#ffffff",
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
              <MenuIcon sx={{ fontSize: 20 }} />
            </IconButton>
          )}
          <Box sx={{ flex: 1 }} />
          <GlobalSearch
            role="sec_head"
            userId={currentUser?.id}
            alwaysExpanded={!isMobile}
          />
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
          <RealtimeToastProvider>
            <Outlet />
          </RealtimeToastProvider>
        </Box>
      </Box>
    </Box>
  );
}

export default SectionHeadLayout;
