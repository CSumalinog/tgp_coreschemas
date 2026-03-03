// src/pages/auth/Login.jsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
  CircularProgress,
  Alert,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { supabase } from "../../lib/supabaseClient";

// Role → route mapping
const ROLE_ROUTES = {
  client: "/client/calendar",
  admin: "/admin/dashboard",
  sec_head: "/sechead/dashboard",
  staff: "/staff/dashboard",
};

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });

      if (authError) {
        setError("Invalid email or password. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Fetch role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", authData.user.id)
        .single();

      if (profileError || !profile) {
        setError("Account profile not found. Please contact the administrator.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 3. Check if account is active
      if (!profile.is_active) {
        setError("Your account has been deactivated. Please contact the administrator.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

      // 4. Redirect based on role
      const route = ROLE_ROUTES[profile.role] || "/login";
      navigate(route);

    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        backgroundColor: "#f5f5f5",
      }}
    >
      {/* Left column */}
      <Box
        sx={{
          flex: 1,
          backgroundColor: "#1a1a2e",
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          p: 4,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            color: "#f5c52b",
            fontWeight: 800,
            letterSpacing: 2,
            textAlign: "center",
          }}
        >
          TGP
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: "#ffffff99",
            textAlign: "center",
            maxWidth: 280,
            lineHeight: 1.8,
          }}
        >
          The Gold Panicles — Official Student Publication of Caraga State University
        </Typography>
        <Box
          sx={{
            width: 60,
            height: 4,
            backgroundColor: "#f5c52b",
            borderRadius: 2,
            mt: 1,
          }}
        />
        <Typography
          variant="caption"
          sx={{ color: "#ffffff55", textAlign: "center", mt: 1 }}
        >
          Coverage Request & Scheduling System
        </Typography>
      </Box>

      {/* Right column: Login form */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Paper
          sx={{
            padding: 4,
            width: { xs: "90%", sm: 450 },
            backgroundColor: "#ffffff",
            borderRadius: 4,
            boxShadow: 3,
          }}
        >
          <Typography variant="h5" sx={{ textAlign: "center", mb: 1, fontWeight: 700 }}>
            Welcome Back
          </Typography>
          <Typography
            variant="body2"
            sx={{ textAlign: "center", color: "text.secondary", mb: 3 }}
          >
            Sign in to your account
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <form
            onSubmit={handleLogin}
            style={{ display: "flex", flexDirection: "column" }}
          >
            <TextField
              label="Email"
              type="email"
              variant="outlined"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{ mb: 2 }}
              disabled={loading}
            />
            <TextField
              label="Password"
              type={showPassword ? "text" : "password"}
              variant="outlined"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{ mb: 3 }}
              disabled={loading}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword((prev) => !prev)}
                      edge="end"
                      sx={{ outline: "none", "&:focus": { outline: "none" } }}
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              variant="contained"
              type="submit"
              disabled={loading}
              sx={{
                mb: 2,
                py: 1.5,
                backgroundColor: "#f5c52b",
                color: "#000",
                fontWeight: 700,
                "&:hover": { backgroundColor: "#e6b920" },
              }}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "#000" }} />
              ) : (
                "Login"
              )}
            </Button>
          </form>

          <Typography variant="body2" sx={{ textAlign: "center" }}>
            Don't have an account?{" "}
            <Link to="/signup" style={{ color: "#1976d2" }}>
              Sign up
            </Link>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

export default Login;
