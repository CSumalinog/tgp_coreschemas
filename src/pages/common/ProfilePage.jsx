// src/pages/common/ProfilePage.jsx
// Shared across all roles: admin, sec_head, staff, client
import React, { useState, useEffect, useRef } from "react";
import {
  Box, Typography, Avatar, Button, Divider, Alert,
  CircularProgress, IconButton, TextField, InputAdornment,
} from "@mui/material";
import PhotoCameraOutlinedIcon    from "@mui/icons-material/PhotoCameraOutlined";
import VisibilityOutlinedIcon     from "@mui/icons-material/VisibilityOutlined";
import VisibilityOffOutlinedIcon  from "@mui/icons-material/VisibilityOffOutlined";
import CheckCircleOutlineOutlinedIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import DarkModeOutlinedIcon       from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon      from "@mui/icons-material/LightModeOutlined";
import { supabase }               from "../../lib/supabaseClient";
import { useThemeMode }           from "../../context/ThemeContext";

const BUCKET   = "coverage-files";
const FOLDER   = "avatars";
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

export default function ProfilePage() {
  const { isDark, toggleDark } = useThemeMode();
  const fileInputRef = useRef(null);

  const [user,         setUser]         = useState(null);
  const [avatarUrl,    setAvatarUrl]    = useState(null);
  const [uploading,    setUploading]    = useState(false);
  const [uploadMsg,    setUploadMsg]    = useState(null); // { type, text }

  const [currentPw,    setCurrentPw]    = useState("");
  const [newPw,        setNewPw]        = useState("");
  const [confirmPw,    setConfirmPw]    = useState("");
  const [showCurrent,  setShowCurrent]  = useState(false);
  const [showNew,      setShowNew]      = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [pwLoading,    setPwLoading]    = useState(false);
  const [pwMsg,        setPwMsg]        = useState(null); // { type, text }

  // ── Load profile ──
  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, role, section, division, avatar_url")
        .eq("id", authUser.id)
        .single();

      setUser({ ...authUser, ...profile });

      if (profile?.avatar_url) {
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(profile.avatar_url);
        setAvatarUrl(data?.publicUrl || null);
      }
    }
    load();
  }, []);

  const getInitials = (name) => {
    if (!name) return "?";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getPositionLabel = () => {
    if (!user) return "";
    if (user.section) return user.section;
    const labels = { client: "Client", admin: "Administrator", sec_head: "Section Head", staff: "Staff" };
    return labels[user.role] || user.role;
  };

  // ── Photo upload ──
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
      const ext      = file.name.split(".").pop();
      const filePath = `${FOLDER}/${user.id}.${ext}`;

      // Upload — upsert so re-uploads overwrite
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: true, contentType: file.type });
      if (uploadErr) throw uploadErr;

      // Save path to profiles table
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: filePath })
        .eq("id", user.id);
      if (updateErr) throw updateErr;

      // Refresh display URL with cache-bust
      const { data } = supabase.storage.from(BUCKET).getPublicUrl(filePath);
      setAvatarUrl(`${data.publicUrl}?t=${Date.now()}`);
      setUploadMsg({ type: "success", text: "Profile photo updated." });
    } catch (err) {
      setUploadMsg({ type: "error", text: err.message });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  // ── Change password ──
  async function handlePasswordChange() {
    setPwMsg(null);

    if (!currentPw || !newPw || !confirmPw) {
      setPwMsg({ type: "error", text: "Please fill in all password fields." });
      return;
    }
    if (newPw.length < 6) {
      setPwMsg({ type: "error", text: "New password must be at least 6 characters." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPw === currentPw) {
      setPwMsg({ type: "error", text: "New password must be different from current." });
      return;
    }

    setPwLoading(true);
    try {
      // Re-authenticate with current password to verify it
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email:    user.email,
        password: currentPw,
      });
      if (signInErr) {
        setPwMsg({ type: "error", text: "Current password is incorrect." });
        setPwLoading(false);
        return;
      }

      // Update password
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPw });
      if (updateErr) throw updateErr;

      setPwMsg({ type: "success", text: "Password updated successfully." });
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
    } catch (err) {
      setPwMsg({ type: "error", text: err.message });
    } finally {
      setPwLoading(false);
    }
  }

  if (!user) return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh" }}>
      <CircularProgress size={32} sx={{ color: "#f5c52b" }} />
    </Box>
  );

  return (
    <Box sx={{ p: 3, maxWidth: 560, mx: "auto" }}>

      {/* Page header */}
      <Typography sx={{ fontWeight: 700, fontSize: "1.1rem", color: "text.primary" }}>
        Profile & Settings
      </Typography>
      <Typography sx={{ fontSize: "0.8rem", color: "text.secondary", mt: 0.3, mb: 3 }}>
        Manage your photo, password, and display preferences.
      </Typography>

      {/* ── Photo Section ── */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider", p: 3, mb: 2.5 }}>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, mb: 2 }}>
          Profile Photo
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 3 }}>
          {/* Avatar with camera overlay */}
          <Box sx={{ position: "relative", flexShrink: 0 }}>
            <Avatar
              src={avatarUrl || undefined}
              sx={{
                width: 80, height: 80,
                backgroundColor: "#f5c52b", color: "#212121",
                fontSize: "1.6rem", fontWeight: 700,
                border: "3px solid", borderColor: "#f5c52b",
              }}
            >
              {!avatarUrl && getInitials(user?.full_name)}
            </Avatar>
            <IconButton
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              size="small"
              sx={{
                position: "absolute", bottom: -4, right: -4,
                width: 28, height: 28,
                backgroundColor: "#212121", color: "white",
                border: "2px solid", borderColor: "background.paper",
                "&:hover": { backgroundColor: "#424242" },
              }}
            >
              {uploading
                ? <CircularProgress size={12} sx={{ color: "white" }} />
                : <PhotoCameraOutlinedIcon sx={{ fontSize: 14 }} />
              }
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={handlePhotoChange}
            />
          </Box>

          {/* Info + upload button */}
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 600, fontSize: "0.95rem", color: "text.primary" }}>
              {user?.full_name}
            </Typography>
            <Typography sx={{ fontSize: "0.75rem", color: "text.secondary" }}>{user?.email}</Typography>
            <Typography sx={{ fontSize: "0.68rem", fontWeight: 700, color: "#f5c52b", textTransform: "uppercase", letterSpacing: 0.8, mt: 0.4 }}>
              {getPositionLabel()}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              sx={{
                mt: 1.5, textTransform: "none", fontSize: "0.78rem",
                borderRadius: 2, borderColor: "divider", color: "text.primary",
                "&:hover": { borderColor: "#f5c52b", backgroundColor: "transparent" },
              }}
            >
              {uploading ? "Uploading…" : "Change Photo"}
            </Button>
          </Box>
        </Box>

        {uploadMsg && (
          <Alert
            severity={uploadMsg.type}
            icon={uploadMsg.type === "success" ? <CheckCircleOutlineOutlinedIcon fontSize="small" /> : undefined}
            sx={{ mt: 2, borderRadius: 2, fontSize: "0.8rem" }}
          >
            {uploadMsg.text}
          </Alert>
        )}

        <Typography sx={{ fontSize: "0.7rem", color: "text.secondary", mt: 1.5 }}>
          JPG, PNG or GIF · Max 2MB
        </Typography>
      </Box>

      {/* ── Change Password ── */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider", p: 3, mb: 2.5 }}>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, mb: 2 }}>
          Change Password
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Current Password"
            type={showCurrent ? "text" : "password"}
            value={currentPw}
            onChange={(e) => setCurrentPw(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowCurrent((p) => !p)}>
                    {showCurrent ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.88rem" } }}
          />

          <Divider />

          <TextField
            label="New Password"
            type={showNew ? "text" : "password"}
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowNew((p) => !p)}>
                    {showNew ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.88rem" } }}
          />
          <TextField
            label="Confirm New Password"
            type={showConfirm ? "text" : "password"}
            value={confirmPw}
            onChange={(e) => setConfirmPw(e.target.value)}
            size="small"
            fullWidth
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShowConfirm((p) => !p)}>
                    {showConfirm ? <VisibilityOffOutlinedIcon fontSize="small" /> : <VisibilityOutlinedIcon fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 2, fontSize: "0.88rem" } }}
          />
        </Box>

        {pwMsg && (
          <Alert
            severity={pwMsg.type}
            icon={pwMsg.type === "success" ? <CheckCircleOutlineOutlinedIcon fontSize="small" /> : undefined}
            sx={{ mt: 2, borderRadius: 2, fontSize: "0.8rem" }}
          >
            {pwMsg.text}
          </Alert>
        )}

        <Button
          variant="contained"
          onClick={handlePasswordChange}
          disabled={pwLoading}
          fullWidth
          sx={{
            mt: 2.5, textTransform: "none", fontSize: "0.85rem",
            borderRadius: 2, fontWeight: 600, boxShadow: "none",
            backgroundColor: "#f5c52b", color: "#212121",
            "&:hover": { backgroundColor: "#e6b920", boxShadow: "none" },
          }}
        >
          {pwLoading
            ? <CircularProgress size={18} sx={{ color: "#212121" }} />
            : "Update Password"
          }
        </Button>
      </Box>

      {/* ── Display Preferences ── */}
      <Box sx={{ bgcolor: "background.paper", borderRadius: 2, border: "1px solid", borderColor: "divider", p: 3 }}>
        <Typography sx={{ fontSize: "0.78rem", fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, mb: 2 }}>
          Display
        </Typography>

        <Box
          onClick={toggleDark}
          sx={{
            display: "flex", alignItems: "center", gap: 2,
            p: 1.5, borderRadius: 2, cursor: "pointer",
            border: "1px solid", borderColor: isDark ? "#f5c52b" : "divider",
            backgroundColor: isDark ? "#fffde7" : "transparent",
            transition: "all 0.2s",
            "&:hover": { borderColor: "#f5c52b" },
          }}
        >
          <Box sx={{
            p: 1, borderRadius: 1.5,
            backgroundColor: isDark ? "#f5c52b" : "#f5f5f5",
            color: isDark ? "#212121" : "#9e9e9e",
            display: "flex",
          }}>
            {isDark
              ? <LightModeOutlinedIcon sx={{ fontSize: 18 }} />
              : <DarkModeOutlinedIcon  sx={{ fontSize: 18 }} />
            }
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontSize: "0.88rem", fontWeight: 600, color: isDark ? "#212121" : "text.primary" }}>
              {isDark ? "Light Mode" : "Dark Mode"}
            </Typography>
            <Typography sx={{ fontSize: "0.72rem", color: isDark ? "#757575" : "text.secondary" }}>
              {isDark ? "Switch to light theme" : "Switch to dark theme"}
            </Typography>
          </Box>
          <Box sx={{
            width: 36, height: 20, borderRadius: 10,
            backgroundColor: isDark ? "#f5c52b" : "#e0e0e0",
            position: "relative", transition: "background-color 0.2s",
          }}>
            <Box sx={{
              position: "absolute", top: 2,
              left: isDark ? 18 : 2,
              width: 16, height: 16, borderRadius: "50%",
              backgroundColor: "white",
              transition: "left 0.2s",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
            }} />
          </Box>
        </Box>
      </Box>

    </Box>
  );
}