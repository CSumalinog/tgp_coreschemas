// src/pages/auth/Login.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { supabase } from "../../lib/supabaseClient";

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lr {
          min-height: 100vh;
          width: 100vw;
          display: flex;
          font-family: 'Inter', sans-serif;
          background: #0d0d0d;
          overflow: hidden;
        }

        /* ══════════════════════════════
           LEFT — Editorial Identity
        ══════════════════════════════ */
        .lr-left {
          flex: 1.1;
          background: #0d0d0d;
          border-right: 1px solid rgba(255,255,255,0.06);
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 52px 56px;
          position: relative;
          overflow: hidden;
        }

        /* Vertical rule accent */
        .lr-left::before {
          content: '';
          position: absolute;
          top: 0; bottom: 0;
          right: 0;
          width: 1px;
          background: linear-gradient(180deg,
            transparent 0%,
            rgba(245,197,43,0.25) 30%,
            rgba(245,197,43,0.25) 70%,
            transparent 100%
          );
        }

        /* Noise texture */
        .lr-left::after {
          content: '';
          position: absolute;
          inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 512 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.018'/%3E%3C/svg%3E");
          pointer-events: none;
        }

        .lr-left-top { position: relative; z-index: 2; }

        .lr-issue-bar {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 64px;
        }

        .lr-issue-rule {
          width: 28px;
          height: 2px;
          background: #f5c52b;
        }

        .lr-issue-text {
          font-family: 'Inter', sans-serif;
          font-size: 0.65rem;
          font-weight: 600;
          color: rgba(255,255,255,0.25);
          letter-spacing: 0.18em;
          text-transform: uppercase;
        }

        .lr-masthead {
          position: relative;
          z-index: 2;
        }

        .lr-pub-label {
          font-family: 'Inter', sans-serif;
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: #f5c52b;
          margin-bottom: 12px;
        }

        .lr-pub-name {
          font-family: 'Inter', sans-serif;
          font-size: clamp(2.8rem, 4.5vw, 4rem);
          font-weight: 800;
          color: #ffffff;
          line-height: 1.05;
          letter-spacing: -0.02em;
          margin-bottom: 20px;
        }

        .lr-pub-name em {
          color: #f5c52b;
          font-style: normal;
        }

        .lr-rule {
          width: 48px;
          height: 3px;
          background: linear-gradient(90deg, #f5c52b, rgba(245,197,43,0.2));
          margin-bottom: 20px;
          border-radius: 2px;
        }

        .lr-tagline {
          font-size: 0.88rem;
          color: rgba(255,255,255,0.3);
          line-height: 1.75;
          max-width: 320px;
          font-weight: 300;
        }

        .lr-left-bottom {
          position: relative;
          z-index: 2;
        }

        .lr-system-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 6px;
          padding: 10px 14px;
          margin-bottom: 24px;
          background: rgba(255,255,255,0.02);
        }

        .lr-badge-dot {
          width: 6px; height: 6px;
          background: #f5c52b;
          border-radius: 50%;
          animation: blink 2.5s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }

        .lr-badge-label {
          font-size: 0.72rem;
          font-weight: 500;
          color: rgba(255,255,255,0.3);
          letter-spacing: 0.05em;
        }

        .lr-footer-meta {
          font-size: 0.65rem;
          color: rgba(255,255,255,0.12);
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        /* Big decorative background text */
        .lr-bg-text {
          position: absolute;
          bottom: -40px;
          left: -10px;
          font-family: 'Inter', sans-serif;
          font-size: 22rem;
          font-weight: 800;
          color: rgba(255,255,255,0.015);
          line-height: 1;
          pointer-events: none;
          user-select: none;
          z-index: 0;
          letter-spacing: -0.05em;
        }

        /* ══════════════════════════════
           RIGHT — Login Form
        ══════════════════════════════ */
        .lr-right {
          width: 440px;
          flex-shrink: 0;
          background: #111111;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 52px 48px;
          position: relative;
          opacity: 0;
          transform: translateX(16px);
          transition: opacity 0.5s 0.1s cubic-bezier(0.16,1,0.3,1),
                      transform 0.5s 0.1s cubic-bezier(0.16,1,0.3,1);
        }
        .lr-right.ready { opacity: 1; transform: translateX(0); }

        .lr-right-header {
          margin-bottom: 36px;
          padding-bottom: 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .lr-right-eyebrow {
          font-size: 0.65rem;
          font-weight: 600;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #f5c52b;
          margin-bottom: 10px;
        }

        .lr-right-title {
          font-family: 'Inter', sans-serif;
          font-size: 1.6rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
          line-height: 1.2;
          margin-bottom: 6px;
        }

        .lr-right-sub {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.25);
          font-weight: 300;
        }

        .lr-error {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.16);
          border-left: 3px solid rgba(239,68,68,0.5);
          border-radius: 6px;
          padding: 10px 13px;
          font-size: 0.78rem;
          color: #f87171;
          margin-bottom: 18px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          line-height: 1.5;
        }

        .lr-field { margin-bottom: 16px; }

        .lr-label {
          display: block;
          font-size: 0.67rem;
          font-weight: 600;
          color: rgba(255,255,255,0.28);
          letter-spacing: 0.1em;
          text-transform: uppercase;
          margin-bottom: 7px;
        }

        .lr-input-wrap { position: relative; }

        .lr-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 11px 14px;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 400;
          color: #ffffff;
          outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .lr-input::placeholder { color: rgba(255,255,255,0.1); }
        .lr-input:focus {
          border-color: rgba(245,197,43,0.4);
          background: rgba(245,197,43,0.025);
          box-shadow: 0 0 0 3px rgba(245,197,43,0.06);
        }
        .lr-input:-webkit-autofill,
        .lr-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #161616 inset;
          -webkit-text-fill-color: #ffffff;
          caret-color: #ffffff;
        }
        .lr-input.pw { padding-right: 44px; }

        .lr-toggle {
          position: absolute;
          right: 11px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.18);
          display: flex;
          align-items: center;
          padding: 4px;
          transition: color 0.2s;
        }
        .lr-toggle:hover { color: rgba(255,255,255,0.5); }

        .lr-submit {
          width: 100%;
          margin-top: 6px;
          padding: 12px;
          background: #f5c52b;
          color: #0d0d0d;
          border: none;
          border-radius: 8px;
          font-family: 'Inter', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          letter-spacing: 0.02em;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(245,197,43,0.2);
        }
        .lr-submit:hover:not(:disabled) {
          background: #fdd835;
          transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(245,197,43,0.3);
        }
        .lr-submit:active:not(:disabled) { transform: translateY(0); }
        .lr-submit:disabled { opacity: 0.45; cursor: not-allowed; }

        .lr-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.75rem;
          color: rgba(255,255,255,0.18);
          text-align: center;
        }
        .lr-footer a {
          color: #f5c52b;
          text-decoration: none;
          font-weight: 500;
          opacity: 0.85;
          transition: opacity 0.2s;
        }
        .lr-footer a:hover { opacity: 1; }

        @media (max-width: 900px) {
          .lr-left { display: none; }
          .lr-right { width: 100vw; padding: 48px 32px; }
        }
      `}</style>

      <div className="lr">
        {/* LEFT */}
        <div className="lr-left">
          <div className="lr-bg-text">TGP</div>

          <div className="lr-left-top">
            <div className="lr-issue-bar">
              <div className="lr-issue-rule" />
              <span className="lr-issue-text">
                Official Student Publication of Caraga State University - Main
                Campus
              </span>
            </div>

            <div className="lr-masthead">
              <div className="lr-pub-name">
                <em>The Gold Panicles</em>
              </div>
              <div className="lr-rule" />
              <p className="lr-tagline" style={{ fontSize: "20px" }}>
                <i>We never flinch in serving you the truth</i>
              </p>
            </div>
          </div>

          <div className="lr-left-bottom">
            <div className="lr-system-badge">
              <div className="lr-badge-dot" />
              <span className="lr-badge-label">
                Coverage Request & Scheduling Management System — Active
              </span>
            </div>
            <div className="lr-footer-meta">© 2026 The Gold Panicles</div>
          </div>
        </div>

        {/* RIGHT */}
        <div className={`lr-right ${ready ? "ready" : ""}`}>
          <div className="lr-right-header">
            <div className="lr-right-eyebrow">User Portal</div>
            <div className="lr-right-title">Sign in</div>
            <div className="lr-right-sub">
              Enter your credentials to access the system
            </div>
          </div>

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
            <div className="lr-field">
              <label className="lr-label">Email address</label>
              <div className="lr-input-wrap">
                <input
                  className="lr-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="lr-field">
              <label className="lr-label">Password</label>
              <div className="lr-input-wrap">
                <input
                  className="lr-input pw"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lr-toggle"
                  onClick={() => setShowPassword((p) => !p)}
                  tabIndex={-1}
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
                "Sign In"
              )}
            </button>
          </form>

          <div className="lr-footer">
            Don't have an account? <Link to="/signup">Sign Up</Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
