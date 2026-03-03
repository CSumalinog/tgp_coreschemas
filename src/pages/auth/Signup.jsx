// src/pages/auth/Signup.jsx
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

function Signup() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!fullName || !email || !password || !confirm) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      setError("Password must contain at least 1 uppercase letter.");
      return;
    }
    if (!/[0-9]/.test(password)) {
      setError("Password must contain at least 1 number.");
      return;
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      setError("Password must contain at least 1 special character (!@#$%...).");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Sign up with Supabase Auth
      // role: 'client' is passed as metadata → trigger auto-inserts into profiles
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "client",
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // 2. Show success — tell them to verify email
      setSuccess(true);

    } catch (err) {
      setError("Something went wrong. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          width: "100vw",
          height: "100vh",
          backgroundColor: "#f5f5f5",
        }}
      >
        <Paper
          sx={{
            padding: 4,
            width: { xs: "90%", sm: 450 },
            borderRadius: 4,
            boxShadow: 3,
            textAlign: "center",
          }}
        >
          <Typography variant="h5" fontWeight={700} mb={2}>
            Check your email! 📬
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            We sent a confirmation link to <strong>{email}</strong>. Please
            verify your email before logging in.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/login")}
            sx={{
              backgroundColor: "#f5c52b",
              color: "#000",
              fontWeight: 700,
              "&:hover": { backgroundColor: "#e6b920" },
            }}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100vw",
        height: "100vh",
        backgroundColor: "#f5f5f5",
      }}
    >
      <Paper
        sx={{
          padding: 4,
          width: { xs: "90%", sm: 450 },
          maxWidth: "100%",
          backgroundColor: "#ffffff",
          borderRadius: 4,
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" sx={{ textAlign: "center", mb: 1, fontWeight: 700 }}>
          Create Account
        </Typography>
        <Typography
          variant="body2"
          sx={{ textAlign: "center", color: "text.secondary", mb: 3 }}
        >
          Register as Client
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <form
          style={{ display: "flex", flexDirection: "column" }}
          onSubmit={handleSignup}
        >
          <TextField
            label="Full Name"
            type="text"
            variant="outlined"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            sx={{ mb: 2 }}
            disabled={loading}
          />

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
            sx={{ mb: 1 }}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowPassword((prev) => !prev)}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />

          {/* Live password strength indicator */}
          {password.length > 0 && (
            <Box sx={{ mb: 2, display: "flex", flexDirection: "column", gap: 0.3 }}>
              {[
                { rule: password.length >= 8, label: "At least 8 characters" },
                { rule: /[A-Z]/.test(password), label: "At least 1 uppercase letter" },
                { rule: /[0-9]/.test(password), label: "At least 1 number" },
                { rule: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password), label: "At least 1 special character" },
              ].map(({ rule, label }) => (
                <Box key={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      backgroundColor: rule ? "#4caf50" : "#e0e0e0",
                      transition: "background-color 0.2s",
                    }}
                  />
                  <Typography
                    sx={{
                      fontSize: "0.75rem",
                      color: rule ? "#4caf50" : "#9e9e9e",
                      transition: "color 0.2s",
                    }}
                  >
                    {label}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <TextField
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            variant="outlined"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            sx={{ mb: 3 }}
            disabled={loading}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirm((prev) => !prev)}
                    edge="end"
                  >
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
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
              backgroundColor: "#f5c52b",
              color: "#000",
              fontWeight: 700,
              py: 1.5,
              "&:hover": { backgroundColor: "#e6b920" },
              mb: 2,
            }}
          >
            {loading ? (
              <CircularProgress size={22} sx={{ color: "#000" }} />
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>

        <Typography variant="body2" sx={{ textAlign: "center" }}>
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#1976d2" }}>
            Login
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Signup;