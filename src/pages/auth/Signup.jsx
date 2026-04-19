// src/pages/auth/Signup.jsx
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

const RULES = [
  { test: (p) => p.length >= 8, label: "At least 8 characters" },
  { test: (p) => /[A-Z]/.test(p), label: "At least 1 uppercase letter" },
  { test: (p) => /[0-9]/.test(p), label: "At least 1 number" },
  {
    test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),
    label: "At least 1 special character",
  },
];

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
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName || !email || !password || !confirm) {
      return;
    }
    if (!RULES[1].test(password)) {
      setError("Password must contain at least 1 uppercase letter.");
      return;
    }
    if (!RULES[2].test(password)) {
      setError("Password must contain at least 1 number.");
      return;
    }
    if (!RULES[3].test(password)) {
      setError("Password must contain at least 1 special character.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName, role: "client" } },
      });
      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (success) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          .su-success {
            min-height: 100vh; width: 100vw;
            background: #0d0d0d;
            display: flex; align-items: center; justify-content: center;
            font-family: 'Inter', sans-serif;
          }
          .su-success-card {
            width: 100%; max-width: 400px; margin: 24px;
            background: #111111;
            border: 1px solid rgba(255,255,255,0.07);
            border-radius: 16px;
            padding: 44px 40px;
            text-align: center;
          }
          .su-success-icon {
            width: 52px; height: 52px;
            background: rgba(245,197,43,0.1);
            border: 1px solid rgba(245,197,43,0.2);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            margin: 0 auto 20px;
            font-size: 1.4rem;
          }
          .su-success-title {
            font-family: 'Inter', sans-serif;
            font-size: 1.4rem; font-weight: 700;
            color: #ffffff; margin-bottom: 10px;
          }
          .su-success-sub {
            font-size: 0.82rem; color: rgba(255,255,255,0.3);
            line-height: 1.7; margin-bottom: 28px;
          }
          .su-success-sub strong { color: rgba(255,255,255,0.6); font-weight: 500; }
          .su-btn {
            display: inline-block; padding: 11px 28px;
            background: #f5c52b; color: #0d0d0d;
            border: none; border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 0.875rem; font-weight: 600;
            cursor: pointer; transition: background 0.2s;
          }
          .su-btn:hover { background: #fdd835; }
        `}</style>
        <div className="su-success">
          <div className="su-success-card">
            <div className="su-success-icon">📬</div>
            <div className="su-success-title">Check your email</div>
            <p className="su-success-sub">
              We sent a confirmation link to <strong>{email}</strong>.<br />
              Please verify your email before signing in.
            </p>
            <button className="su-btn" onClick={() => navigate("/login")}>
              Go to Sign In
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ── Root layout ─────────────────────────────────────────── */
        .su {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          font-family: 'Inter', sans-serif;
          overflow: hidden;
          background: #0d0d0d;
          position: relative;
        }

        /* ── LEFT PANEL — 50 % width, video/carousel-ready ──────── */
        .su-left {
          flex: 0 0 50%;
          width: 50%;
          background: #000;
          position: relative;
          overflow: hidden;
        }

        /* Full-bleed video */
        .su-left-video {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.85;
        }

        /* Dark gradient overlay so dots stay readable */
        .su-left-overlay {
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

        /* ── Bottom progress bar ─────────────────────────────────── */
        .su-progress {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          display: flex;
          gap: 6px;
          padding: 0 24px 18px;
          z-index: 10;
          pointer-events: none;
        }
        .su-bar {
          flex: 1;
          height: 3px;
          border-radius: 2px;
          background: rgba(255,255,255,0.18);
          overflow: hidden;
          position: relative;
        }
        .su-bar.done { background: rgba(255,255,255,0.7); }
        .su-bar.active::after {
          content: '';
          position: absolute;
          top: 0; left: 0; bottom: 0;
          width: 100%;
          background: #ffffff;
          animation: su-bar-fill 8s linear forwards;
        }
        @keyframes su-bar-fill {
          from { width: 0%; }
          to   { width: 100%; }
        }

        /* ── RIGHT PANEL — 50% width, form ────────────────────────── */
        .su-right {
          flex: 0 0 50%;
          width: 50%;
          background: #0d0d0d;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 48px 48px 80px;
          position: relative;
          overflow-y: auto;
          max-height: 100vh;
          opacity: 0;
          transform: translateX(16px);
          transition:
            opacity  0.45s 0.08s cubic-bezier(0.16,1,0.3,1),
            transform 0.45s 0.08s cubic-bezier(0.16,1,0.3,1);
        }
        .su-right.ready { opacity: 1; transform: translateX(0); }

        /* Left-border accent */
        .su-right::before {
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
        .su-title {
          font-size: 1.75rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin-bottom: 6px;
        }
        .su-sub {
          font-size: 0.82rem;
          color: rgba(255,255,255,0.28);
          font-weight: 300;
          line-height: 1.55;
          margin-bottom: 28px;
        }

        /* ── Error banner ────────────────────────────────────────── */
        .su-error {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.16);
          border-left: 3px solid rgba(239,68,68,0.45);
          border-radius: 8px;
          padding: 10px 13px;
          font-size: 0.78rem;
          color: #f87171;
          margin-bottom: 16px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.5;
        }

        /* ── Form fields ─────────────────────────────────────────── */
        .su-field { margin-bottom: 12px; }

        .su-input-wrap {
          position: relative;
          display: flex;
          align-items: center;
        }

        .su-input {
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
        .su-input::placeholder { color: rgba(255,255,255,0.18); }
        .su-input:focus {
          border-color: rgba(245,197,43,0.45);
          background: rgba(245,197,43,0.03);
          box-shadow: 0 0 0 3px rgba(245,197,43,0.07);
        }
        .su-input:-webkit-autofill,
        .su-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #131313 inset;
          -webkit-text-fill-color: #ffffff;
          caret-color: #ffffff;
        }
        .su-input.has-toggle { padding-right: 44px; }

        /* Eye toggle */
        .su-toggle {
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
        .su-toggle:hover { color: rgba(255,255,255,0.7); }

        /* Floating label */
        .su-label {
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
        .su-input:focus ~ .su-label,
        .su-input:not(:placeholder-shown) ~ .su-label {
          top: 0;
          transform: translateY(-50%);
          font-size: 0.67rem;
          color: rgba(255,255,255,0.5);
          background: #0d0d0d;
          padding: 0 4px;
        }
        .su-input:focus ~ .su-label {
          color: rgba(255,255,255,0.8);
        }

        /* Password strength rules */
        .su-strength {
          margin-top: 7px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .su-rule { display: flex; align-items: center; gap: 7px; }
        .su-rule-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
          transition: background 0.2s;
        }
        .su-rule-dot.pass { background: #4caf50; }
        .su-rule-dot.fail { background: rgba(255,255,255,0.12); }
        .su-rule-text { font-size: 0.72rem; transition: color 0.2s; }
        .su-rule-text.pass { color: #4caf50; }
        .su-rule-text.fail { color: rgba(255,255,255,0.25); }

        /* ── Submit ──────────────────────────────────────────────── */
        .su-submit {
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
        .su-submit:hover:not(:disabled) {
          background: #e8e8e8;
          transform: translateY(-1px);
        }
        .su-submit:active:not(:disabled) { transform: translateY(0); }
        .su-submit:disabled { opacity: 0.45; cursor: not-allowed; }

        /* ── Footer ──────────────────────────────────────────────── */
        .su-footer {
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.78rem;
          color: rgba(255,255,255,0.22);
          text-align: center;
        }
        .su-footer a {
          color: #f5c52b;
          text-decoration: none;
          font-weight: 600;
          transition: opacity 0.2s;
        }
        .su-footer a:hover { opacity: 0.75; }

        /* ── Social footer ───────────────────────────────────────── */
        .su-social {
          position: absolute;
          bottom: 30px;
          left: 0; right: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 16px;
          z-index: 10;
          pointer-events: none;
        }
        .su-social a {
          pointer-events: auto;
          color: inherit;
          display: flex;
          align-items: center;
          text-decoration: none;
          opacity: 0.7;
          transition: opacity 0.2s;
        }
        .su-social a:hover { opacity: 1; }
        .su-social-group {
          display: flex;
          align-items: center;
          gap: 5px;
          color: rgba(255,255,255,0.38);
        }
        .su-social-sep {
          width: 1px;
          height: 14px;
          background: rgba(255,255,255,0.15);
        }
        .su-social-handle {
          font-size: 0.69rem;
          font-family: 'Inter', sans-serif;
          color: rgba(255,255,255,0.38);
          letter-spacing: 0.02em;
        }

        /* ── Responsive ────────────────────────────────────────────── */
        @media (max-width: 768px) {
          .su-left { display: none; }
          .su-right { flex: 0 0 100%; width: 100vw; padding: 44px 28px 80px; max-height: unset; }
        }
      `}</style>

      <div className="su">
        {/* ── LEFT: Video / Carousel placeholder ──────────────────── */}
        <div className="su-left">
          {/*
            VIDEO / CAROUSEL PLACEHOLDER
            ──────────────────────────────────────────────────────────
            Replace the src below with your actual video file path.
            For a carousel, remove the <video> and render slides as
            position:absolute children instead.
          */}
          <video
            className="su-left-video"
            src={loginVid}
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="su-left-overlay" />
        </div>

        {/* ── RIGHT: Sign-up form ───────────────────────────────── */}
        <div className={`su-right ${ready ? "ready" : ""}`}>
          <div className="su-title">Create Account</div>
          <div className="su-sub">
            Submit and track your coverage requests
          </div>

          {error && (
            <div className="su-error">
              <svg
                width="14" height="14" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2.2"
                style={{ flexShrink: 0, marginTop: 1 }}
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup}>
            {/* Full name */}
            <div className="su-field">
              <div className="su-input-wrap">
                <input
                  className="su-input"
                  id="su-fullname"
                  type="text"
                  placeholder=" "
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  autoComplete="name"
                />
                <label className="su-label" htmlFor="su-fullname">Full Name</label>
              </div>
            </div>

            {/* Email */}
            <div className="su-field">
              <div className="su-input-wrap">
                <input
                  className="su-input"
                  id="su-email"
                  type="email"
                  placeholder=" "
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
                <label className="su-label" htmlFor="su-email">Email</label>
              </div>
            </div>

            {/* Password */}
            <div className="su-field">
              <div className="su-input-wrap">
                <input
                  className="su-input has-toggle"
                  id="su-password"
                  type={showPassword ? "text" : "password"}
                  placeholder=" "
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <label className="su-label" htmlFor="su-password">Password</label>
                <button
                  type="button"
                  className="su-toggle"
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
              {password.length > 0 && (
                <div className="su-rules">
                  {RULES.map(({ test, label }) => {
                    const pass = test(password);
                    return (
                      <div className="su-rule" key={label}>
                        <div className={`su-rule-dot ${pass ? "pass" : "fail"}`} />
                        <span className={`su-rule-text ${pass ? "pass" : "fail"}`}>
                          {label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="su-field">
              <div className="su-input-wrap">
                <input
                  className="su-input has-toggle"
                  id="su-confirm"
                  type={showConfirm ? "text" : "password"}
                  placeholder=" "
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  disabled={loading}
                  autoComplete="new-password"
                />
                <label className="su-label" htmlFor="su-confirm">Confirm Password</label>
                <button
                  type="button"
                  className="su-toggle"
                  onClick={() => setShowConfirm((p) => !p)}
                  tabIndex={-1}
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? (
                    <VisibilityOff style={{ fontSize: 17 }} />
                  ) : (
                    <Visibility style={{ fontSize: 17 }} />
                  )}
                </button>
              </div>
            </div>

            <button className="su-submit" type="submit" disabled={loading}>
              {loading ? (
                <CircularProgress size={17} sx={{ color: "#0d0d0d" }} />
              ) : (
                "Create account"
              )}
            </button>
          </form>

          <div className="su-footer">
            Already have an account?{" "}
            <Link to="/login">Sign in</Link>
          </div>

          {/* ── Social footer ──────────────────────────────────── */}
          <div className="su-social">
            <div className="su-social-group">
              <a href="https://www.facebook.com/thegoldpanicles" target="_blank" rel="noopener noreferrer"><Facebook style={{ fontSize: 14 }} /></a>
              <a href="https://www.instagram.com/thegoldpanicles/" target="_blank" rel="noopener noreferrer"><Instagram style={{ fontSize: 14 }} /></a>
              <a href="https://www.youtube.com/@thegoldpanicles" target="_blank" rel="noopener noreferrer"><YouTube style={{ fontSize: 14 }} /></a>
              <span className="su-social-handle">@thegoldpanicles</span>
            </div>
            <div className="su-social-sep" />
            <div className="su-social-group">
              <a href="https://x.com/tgpCSU" target="_blank" rel="noopener noreferrer">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <span className="su-social-handle">@tgpCSU</span>
            </div>
          </div>
        </div>

        
      </div>
    </>
  );
}

export default Signup;
