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
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    if (email && password) {
      navigate("/admin/dashboard");
    } else {
      alert("Enter email and password!");
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
          backgroundColor: "#1976d2", // example: blue background
          display: { xs: "none", md: "block" }, // hide on small screens
        }}
      >
        {/* You can add an image or illustration here */}
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
          <Typography variant="h5" sx={{ textAlign: "center", mb: 3 }}>
            Login
          </Typography>
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

            <Button
              variant="contained"
              type="submit"
              sx={{
                mb: 2,
                backgroundColor: "#f5c52b",
                color: "#000",
                "&:hover": { backgroundColor: "#e6b920" },
              }}
            >
              Login
            </Button>
          </form>
          <Typography variant="body2" sx={{ textAlign: "center" }}>
            Don’t have an account? <Link to="/signup">Signup</Link>
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

export default Login;
