// src/pages/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Facebook,
  Instagram,
  YouTube,
} from "@mui/icons-material";
import { supabase } from "../../lib/supabaseClient";
import loginVid from "../../assets/videos/login-page-vid.mp4";

const COVERAGE_SECTIONS = ["News", "Photojournalism", "Videojournalism"];

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({ email, password });
      if (authError) {
        setError("Invalid email or password.");
        setLoading(false);
        return;
      }
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, section, is_active")
        .eq("id", authData.user.id)
        .single();
      if (profileError || !profile) {
        setError("Account profile not found. Contact the administrator.");
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      if (!profile.is_active) {
        setError(
          "Your account has been deactivated. Contact the administrator.",
        );
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }
      let route = "/login";
      if (profile.role === "admin") route = "/admin/dashboard";
      else if (profile.role === "sec_head")
        route = COVERAGE_SECTIONS.includes(profile.section)
          ? "/sec_head/dashboard"
          : "/staff/dashboard";
      else if (profile.role === "staff") route = "/staff/my-assignment";
      else if (profile.role === "client") route = "/client/calendar";
      navigate(route);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Root layout ─────────────────────────────────────────── */
        .lr {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
          background: #0d0d0d;
        }

        /* ── LEFT PANEL — 50% width, video/carousel-ready ───────── */
        .lr-left {
          flex: 0 0 50%;
          width: 50%;
          background: #000;
          position: relative;
          overflow: hidden;
          /*
            VIDEO / CAROUSEL PLACEHOLDER
            Drop a <video> or slide children here as position:absolute
            inset:0 object-fit:cover children.
          */
        }

        /* Full-bleed video */
        .lr-left-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.85;
        }

        /* Overlay for dot readability */
        .lr-left-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(0,0,0,0.18) 0%,
            transparent 40%,
            rgba(0,0,0,0.45) 100%
          );
          z-index: 1;
        }
/* ── Social footer ────────────────────────────────────────── */
        .lr-social {
          position: absolute;
          bottom: 24px;
          left: 0; right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          pointer-events: none;
        }
        .lr-social a {
          pointer-events: auto;
          color: inherit;
          display: flex;
          align-items: center;
          text-decoration: none;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .lr-social a:hover { opacity: 1; }
        .lr-social-group {
          display: flex;
          align-items: center;
          gap: 5px;
          color: rgba(255,255,255,0.38);
        }
        .lr-social-sep {
          width: 1px;
          height: 14px;
          background: rgba(255,255,255,0.15);
        }
        .lr-social-handle {
          font-size: 0.69rem;
          font-family: 'Inter', sans-serif;
          color: rgba(255,255,255,0.38);
          letter-spacing: 0.02em;
        }

        /* ── RIGHT PANEL — 50% width, form ─────────────────────── */
        .lr-right {
          flex: 0 0 50%;
          width: 50%;
          background: #0d0d0d;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 56px 48px 80px;
          position: relative;
          overflow-y: auto;
          max-height: 100vh;
          opacity: 0;
          transform: translateX(16px);
          transition:
            opacity  0.45s 0.08s cubic-bezier(0.16,1,0.3,1),
            transform 0.45s 0.08s cubic-bezier(0.16,1,0.3,1);
        }
        .lr-right.ready { opacity: 1; transform: translateX(0); }

        /* Left-border accent */
        .lr-right::before {
          content: '';
          position: absolute;
          top: 0; left: 0; bottom: 0;
          width: 1px;
          background: linear-gradient(
            180deg,
            transparent 0%,
            rgba(245,197,43,0.22) 25%,
            rgba(245,197,43,0.22) 75%,
            transparent 100%
          );
        }

        /* ── Typography ──────────────────────────────────────────── */
        .lr-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin-bottom: 6px;
        }
        .lr-sub {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.28);
          font-weight: 300;
          line-height: 1.55;
          margin-bottom: 32px;
        }

        /* ── Error banner ────────────────────────────────────────── */
        .lr-error {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.16);
          border-left: 3px solid rgba(239,68,68,0.45);
          border-radius: 8px;
          padding: 10px 13px;
          font-size: 0.78rem;
          color: #f87171;
          margin-bottom: 20px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.5;
        }

        /* ── Form fields ─────────────────────────────────────────── */
        .lr-field { margin-bottom: 14px; }

        .lr-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .lr-input {
          width: 100%;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.09);
          border-radius: 10px;
          padding: 22px 14px 8px 14px;
          height: 54px;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 400;
          color: #ffffff;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .lr-input::placeholder { color: rgba(255,255,255,0.18); }
        .lr-input:focus {
          border-color: rgba(245,197,43,0.45);
          background: rgba(245,197,43,0.03);
          box-shadow: 0 0 0 3px rgba(245,197,43,0.07);
        }
        .lr-input:-webkit-autofill,
        .lr-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #131313 inset;
          -webkit-text-fill-color: #ffffff;
          caret-color: #ffffff;
        }
        .lr-input.has-toggle { padding-right: 44px; }

        /* Eye toggle */
        .lr-toggle {
          position: absolute;
          right: 11px;
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.28);
          display: flex;
          align-items: center;
          padding: 4px;
          border-radius: 4px;
          transition: color 0.2s;
          z-index: 1;
        }
        .lr-toggle:hover { color: rgba(255,255,255,0.7); }

        /* Floating label */
        .lr-label {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.875rem;
          color: rgba(255,255,255,0.35);
          font-family: 'Inter', sans-serif;
          pointer-events: none;
          transition: top 0.18s ease, transform 0.18s ease, font-size 0.18s ease, color 0.18s ease, background 0.18s ease, padding 0.18s ease;
          padding: 0;
          z-index: 2;
          line-height: 1;
          white-space: nowrap;
        }
        .lr-input:focus ~ .lr-label,
        .lr-input:not(:placeholder-shown) ~ .lr-label {
          top: 0;
          transform: translateY(-50%);
          font-size: 0.67rem;
          color: rgba(255,255,255,0.5);
          background: #0d0d0d;
          padding: 0 4px;
        }
        .lr-input:focus ~ .lr-label {
          color: rgba(255,255,255,0.8);
        }

        /* ── Submit ──────────────────────────────────────────────── */
        .lr-submit {
          width: 100%;
          margin-top: 8px;
          padding: 13px;
          background: #ffffff;
          color: #0d0d0d;
          border: none;
          border-radius: 4px;
          font-family: 'Inter', sans-serif;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.01em;
          transition: background 0.2s, transform 0.15s;
          box-shadow: none;
        }
        .lr-submit:hover:not(:disabled) {
          background: #e8e8e8;
          transform: translateY(-1px);
        }
        .lr-submit:active:not(:disabled) { transform: translateY(0); }
        .lr-submit:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Footer ──────────────────────────────────────────────── */
        .lr-footer {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.78rem;
          color: rgba(255,255,255,0.22);
          text-align: center;
        }
        .lr-footer a {
          color: #f5c52b;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s;
        }
        .lr-footer a:hover { opacity: 0.75; }

        /* ── Responsive ──────────────────────────────────────────── */
        @media (max-width: 768px) {
          .lr-left { display: none; }
          .lr-right { flex: 0 0 100%; width: 100vw; padding: 44px 28px 80px; max-height: unset; }
        }
      `}</style>

      <div className="lr">
        {/* ── LEFT: Video / Carousel placeholder ──────────────────── */}
        <div className="lr-left">
          {/*
            VIDEO / CAROUSEL PLACEHOLDER
            ──────────────────────────────────────────────────────────
            Replace the src below with your actual video file path.
            For a carousel, remove <video> and render slide children
            with position:absolute inset:0 object-fit:cover instead.
          */}
          <video
            className="lr-left-video"
            src={loginVid}
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="lr-left-overlay" />
        </div>

        <div className={`lr-right${ready ? " ready" : ""}`}>
          <div className="lr-title">Welcome back</div>
          <div className="lr-sub">Sign in to your TGP account</div>

          {error && (
            <div className="lr-error">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin}>
            {/* Email */}
            <div className="lr-field">
              <div className="lr-input-wrap">
                <input
                  className="lr-input"
                  id="lr-email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
                <label className="lr-label" htmlFor="lr-email">
                  Email
                </label>
              </div>
            </div>

            {/* Password */}
            <div className="lr-field">
              <div className="lr-input-wrap">
                <input
                  className="lr-input has-toggle"
                  id="lr-password"
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <label className="lr-label" htmlFor="lr-password">
                  Password
                </label>
                <button
                  className="lr-toggle"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <VisibilityOff style={{ fontSize: 17 }} />
                  ) : (
                    <Visibility style={{ fontSize: 17 }} />
                  )}
                </button>
              </div>
            </div>

            <button className="lr-submit" type="submit" disabled={loading}>
              {loading ? (
                <CircularProgress size={17} sx={{ color: "#0d0d0d" }} />
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <div className="lr-footer">
            Don't have an account yet? <Link to="/signup">Sign up</Link>
          </div>

          {/* ── Social footer ────────────────────────────────────────── */}
          <div className="lr-social">
            <div className="lr-social-group">
              <a
                href="https://www.facebook.com/thegoldpanicles"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Facebook style={{ fontSize: 14 }} />
              </a>
              <a
                href="https://www.instagram.com/thegoldpanicles/"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Instagram style={{ fontSize: 14 }} />
              </a>
              <a
                href="https://www.youtube.com/@thegoldpanicles"
                target="_blank"
                rel="noopener noreferrer"
              >
                <YouTube style={{ fontSize: 14 }} />
              </a>
              <span className="lr-social-handle">@thegoldpanicles</span>
            </div>
            <div className="lr-social-sep" />
            <div className="lr-social-group">
              <a
                href="https://x.com/tgpCSU"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <span className="lr-social-handle">@tgpCSU</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
