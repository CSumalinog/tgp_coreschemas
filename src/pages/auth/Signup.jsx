import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom"; // ← add Link
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const navigate = useNavigate();

  const handleSignup = (e) => {
    e.preventDefault();
    if (!email || !password || !confirm) {
      alert("Fill all fields!");
      return;
    }
    if (password !== confirm) {
      alert("Passwords do not match!");
      return;
    }
    alert("Signup successful!");
    navigate("/login");
  };

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
        <Typography variant="h5" sx={{ textAlign: "center", mb: 3 }}>
          Signup
        </Typography>

        <form style={{ display: "flex", flexDirection: "column" }} onSubmit={handleSignup}>
          <TextField
            label="Email"
            type="email"
            variant="outlined"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mb: 2 }}
          />

          <TextField
            label="Password"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ mb: 2 }}
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

          <TextField
            label="Confirm Password"
            type={showConfirm ? "text" : "password"}
            variant="outlined"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    onClick={() => setShowConfirm((prev) => !prev)}
                    edge="end"
                    sx={{ outline: "none", "&:focus": { outline: "none" } }}
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
            sx={{
              backgroundColor: "#f5c52b",
              color: "#000",
              "&:hover": { backgroundColor: "#e6b920" },
              mb: 2,
            }}
          >
            Signup
          </Button>
        </form>

        <Typography variant="body2" sx={{ textAlign: "center" }}>
          Already have an account? <Link to="/login">Login</Link>
        </Typography>
      </Paper>
    </Box>
  );
}

export default Signup;
