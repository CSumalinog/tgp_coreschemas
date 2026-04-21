// src/pages/common/ProfilePage.jsx
// Shared across all roles: admin, sec_head, staff, client
import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Avatar,
  Button,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  TextField,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon from "@mui/icons-material/VisibilityOffOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";
import { supabase } from "../../lib/supabaseClient";
import { pushSuccessToast } from "../../components/common/SuccessToast";
import { useThemeMode } from "../../context/ThemeContext";
import { getAvatarUrl } from "../../components/common/UserAvatar";
import BrandedLoader from "../../components/common/BrandedLoader";

// ── Brand tokens (mirrors ThemeContext + CalendarManagement) ─────────────────
const GOLD = "#F5C52B";
const GOLD_08 = "rgba(245,197,43,0.08)";
const GOLD_16 = "rgba(245,197,43,0.16)";
const CHARCOAL = "#353535";
const BORDER = "rgba(53,53,53,0.08)";
const BORDER_DARK = "rgba(255,255,255,0.08)";
const dm = "'Inter', sans-serif";

const HOVER_BG = "rgba(53,53,53,0.03)";

const BUCKET = "coverage-files";
const FOLDER = "avatars";
const MAX_SIZE = 2 * 1024 * 1024;

// ── Small reusable section card ───────────────────────────────────────────────
function Card({ children, isDark, sx = {} }) {
  return (
    <Box
      sx={{
        backgroundColor: "background.paper",
        borderRadius: "10px",
        border: `1px solid ${isDark ? BORDER_DARK : BORDER}`,
        p: { xs: 2, sm: 3 },
        ...sx,
      }}
    >
      {children}
    </Box>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────
function SectionLabel({ icon: Icon, label }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
      <Box
        sx={{
          width: 26,
          height: 26,
          borderRadius: "10px",
          backgroundColor: GOLD_08,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon sx={{ fontSize: 13, color: GOLD }} />
      </Box>
      <Typography
        sx={{
          fontFamily: dm,
          fontSize: "0.72rem",
          fontWeight: 700,
          color: "text.secondary",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        {label}
      </Typography>
    </Box>
  );
}

// ── Branded TextField ─────────────────────────────────────────────────────────
function BrandField({ label, type, value, onChange, show, onToggle, isDark }) {
  const border = isDark ? BORDER_DARK : BORDER;
  return (
    <TextField
      label={label}
      type={show !== undefined ? (show ? "text" : "password") : type}
      value={value}
      onChange={onChange}
      size="small"
      fullWidth
      slotProps={{
        input:
        onToggle
          ? {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={onToggle}
                    sx={{
                      color: "text.disabled",
                      "&:hover": { color: CHARCOAL, backgroundColor: GOLD_08 },
                      borderRadius: "10px",
                      width: 26,
                      height: 26,
                    }}
                  >
                    {show ? (
                      <VisibilityOffOutlinedIcon sx={{ fontSize: 15 }} />
                    ) : (
                      <VisibilityOutlinedIcon sx={{ fontSize: 15 }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }
          : undefined,
      }}
      sx={{
        "& .MuiOutlinedInput-root": {
          borderRadius: "10px",
          fontSize: "0.85rem",
          fontFamily: dm,
        },
        "& .MuiInputLabel-root": {
          fontFamily: dm,
          fontSize: "0.82rem",
        },
      }}
    />
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { isDark } = useThemeMode();
  const fileInputRef = useRef(null);
  const border = isDark ? BORDER_DARK : BORDER;

  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState(null);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, section, division, avatar_url")
        .eq("id", authUser.id)
        .single();
      setUser({ ...authUser, ...profile });
      setAvatarUrl(getAvatarUrl(profile?.avatar_url) || null);
    }
    load();
  }, []);

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getPositionLabel = () => {
    if (!user) return "";
    if (user.section) return user.section;
    const labels = {
      client: "Client",
      admin: "Administrator",
      sec_head: "Section Head",
      staff: "Staff",
    };
    return labels[user.role] || user.role;
  };

  async function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setUploadMsg({ type: "error", text: "Please select an image file." });
      return;
    }
    if (file.size > MAX_SIZE) {
      setUploadMsg({ type: "error", text: "Image must be under 2MB." });
      return;
    }

    setUploading(true);
    setUploadMsg(null);
    try {
      const ext = file.name.split(".").pop();
      const filePath = `${FOLDER}/${user.id}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("id", user.id);
      if (updateErr) throw updateErr;
      setAvatarUrl(`${getAvatarUrl(filePath)}?t=${Date.now()}`);
      pushSuccessToast("Profile photo updated.");
    } catch (err) {
      setUploadMsg({ type: "error", text: err.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function handlePasswordChange() {
    setPwMsg(null);
    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ type: "error", text: "Please fill in all password fields." });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({
        type: "error",
        text: "New password must be at least 6 characters.",
      });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPw === currentPw) {
      setPwMsg({
        type: "error",
        text: "New password must be different from current.",
      });
      return;
    }

    setPwLoading(true);
    try {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPw,
      });
      if (signInErr) {
        setPwMsg({ type: "error", text: "Current password is incorrect." });
        setPwLoading(false);
        return;
      }
      const { error: updateErr } = await supabase.auth.updateUser({
        password: newPw,
      });
      if (updateErr) throw updateErr;
      pushSuccessToast("Password updated successfully.");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
    } catch (err) {
      setPwMsg({ type: "error", text: err.message });
    } finally {
      setPwLoading(false);
    }
  }

  if (!user) return <BrandedLoader size={86} minHeight="60vh" />;

  return (
    <Box
      sx={{ p: { xs: 2, sm: 3 }, maxWidth: 560, mx: "auto", fontFamily: dm }}
    >
      

      {/* ── Profile Photo ── */}
      <Card isDark={isDark} sx={{ mb: 2 }}>
        <SectionLabel icon={PersonOutlinedIcon} label="Profile Photo" />

        <Box sx={{ display: "flex", alignItems: "center", gap: 2.5 }}>
          {/* Avatar with camera overlay */}
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 72,
                height: 72,
                backgroundColor: GOLD,
                color: CHARCOAL,
                fontSize: "1.4rem",
                fontWeight: 700,
                fontFamily: dm,
                // Subtle gold ring
                outline: `2px solid ${GOLD}`,
                outlineOffset: "2px",
              }}
            >
              {!avatarUrl && getInitials(user?.full_name)}
            </Avatar>

            <Tooltip title="Change photo" arrow>
              <IconButton
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                size="small"
                sx={{
                  position: "absolute",
                  bottom: -3,
                  right: -3,
                  width: 26,
                  height: 26,
                  backgroundColor: isDark ? "#2a2a2a" : CHARCOAL,
                  color: "#fff",
                  border: `2px solid`,
                  borderColor: "background.paper",
                  transition: "background-color 0.15s",
                  "&:hover": { backgroundColor: isDark ? "#3a3a3a" : "#555" },
                  "&:disabled": { opacity: 0.6 },
                }}
              >
                {uploading ? (
                  <CircularProgress size={11} sx={{ color: "#fff" }} />
                ) : (
                  <PhotoCameraOutlinedIcon sx={{ fontSize: 13 }} />
                )}
              </IconButton>
            </Tooltip>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
          </Box>

          {/* Name / role info */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: dm,
                fontWeight: 700,
                fontSize: "0.92rem",
                color: "text.primary",
                lineHeight: 1.3,
              }}
            >
              {user?.full_name}
            </Typography>
            <Typography
              sx={{
                fontFamily: dm,
                fontSize: "0.72rem",
                color: "text.secondary",
                mt: 0.15,
              }}
            >
              {user?.email}
            </Typography>

            {/* Role badge */}
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                mt: 0.75,
                px: 1,
                py: 0.25,
                borderRadius: "10px",
                backgroundColor: GOLD_08,
                border: `1px solid ${GOLD_16}`,
              }}
            >
              <Typography
                sx={{
                  fontFamily: dm,
                  fontSize: "0.62rem",
                  fontWeight: 700,
                  color: GOLD,
                  textTransform: "uppercase",
                  letterSpacing: "0.09em",
                }}
              >
                {getPositionLabel()}
              </Typography>
            </Box>

            {/* Change photo button */}
            <Box>
              <Box
                onClick={() => !uploading && fileInputRef.current?.click()}
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 1.5,
                  px: 1.5,
                  py: 0.5,
                  borderRadius: "10px",
                  border: `1px solid ${border}`,
                  cursor: uploading ? "not-allowed" : "pointer",
                  fontFamily: dm,
                  fontSize: "0.75rem",
                  fontWeight: 500,
                  color: "text.secondary",
                  userSelect: "none",
                  transition: "all 0.15s",
                  "&:hover": !uploading
                    ? {
                        borderColor: "rgba(53,53,53,0.3)",
                        color: "text.primary",
                        backgroundColor: HOVER_BG,
                      }
                    : {},
                }}
              >
                {uploading ? "Uploading…" : "Change Photo"}
              </Box>
            </Box>
          </Box>
        </Box>

        {uploadMsg && uploadMsg.type !== "success" && (
          <Alert
            severity={uploadMsg.type}
            icon={
              uploadMsg.type === "success" ? (
                <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />
              ) : undefined
            }
            sx={{
              mt: 2,
              borderRadius: "10px",
              fontFamily: dm,
              fontSize: "0.78rem",
              py: 0.75,
            }}
          >
            {uploadMsg.text}
          </Alert>
        )}

        <Typography
          sx={{
            fontFamily: dm,
            fontSize: "0.67rem",
            color: "text.disabled",
            mt: 1.5,
          }}
        >
          JPG, PNG or GIF · Max 2 MB
        </Typography>
      </Card>

      {/* ── Change Password ── */}
      <Card isDark={isDark} sx={{ mb: 2 }}>
        <SectionLabel icon={LockOutlinedIcon} label="Change Password" />

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
          <BrandField
            label="Current Password"
            show={showCurrent}
            onToggle={() => setShowCurrent((p) => !p)}
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            isDark={isDark}
          />
          <Divider sx={{ borderColor: border }} />
          <BrandField
            label="New Password"
            show={showNew}
            onToggle={() => setShowNew((p) => !p)}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            isDark={isDark}
          />
          <BrandField
            label="Confirm New Password"
            show={showConfirm}
            onToggle={() => setShowConfirm((p) => !p)}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            isDark={isDark}
          />
        </Box>

        {pwMsg && pwMsg.type !== "success" && (
          <Alert
            severity={pwMsg.type}
            icon={
              pwMsg.type === "success" ? (
                <CheckCircleOutlineOutlinedIcon sx={{ fontSize: 16 }} />
              ) : undefined
            }
            sx={{
              mt: 2,
              borderRadius: "10px",
              fontFamily: dm,
              fontSize: "0.78rem",
              py: 0.75,
            }}
          >
            {pwMsg.text}
          </Alert>
        )}

        {/* Save button — matches calendar's GOLD action style */}
        <Box
          onClick={!pwLoading ? handlePasswordChange : undefined}
          sx={{
            mt: 2.5,
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            py: 1,
            borderRadius: "10px",
            backgroundColor: "#212121",
            color: "#fff",
            fontFamily: dm,
            fontSize: "0.82rem",
            fontWeight: 700,
            cursor: pwLoading ? "not-allowed" : "pointer",
            opacity: pwLoading ? 0.75 : 1,
            userSelect: "none",
            transition: "background-color 0.15s",
            "&:hover": !pwLoading ? { backgroundColor: "#333" } : {},
          }}
        >
          {pwLoading ? (
            <CircularProgress size={16} sx={{ color: "#fff" }} />
          ) : (
            "Update Password"
          )}
        </Box>
      </Card>
    </Box>
  );
}
