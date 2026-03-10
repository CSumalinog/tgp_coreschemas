// src/pages/auth/Signup.jsx
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { supabase } from "../../lib/supabaseClient";

const RULES = [
  { test: (p) => p.length >= 8,                                        label: "At least 8 characters" },
  { test: (p) => /[A-Z]/.test(p),                                      label: "At least 1 uppercase letter" },
  { test: (p) => /[0-9]/.test(p),                                      label: "At least 1 number" },
  { test: (p) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(p),    label: "At least 1 special character" },
];

function Signup() {
  const [fullName,     setFullName]     = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [confirm,      setConfirm]      = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);
  const [ready,        setReady]        = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80);
    return () => clearTimeout(t);
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    if (!fullName || !email || !password || !confirm) { setError("Please fill in all fields."); return; }
    if (!RULES[0].test(password)) { setError("Password must be at least 8 characters."); return; }
    if (!RULES[1].test(password)) { setError("Password must contain at least 1 uppercase letter."); return; }
    if (!RULES[2].test(password)) { setError("Password must contain at least 1 number."); return; }
    if (!RULES[3].test(password)) { setError("Password must contain at least 1 special character."); return; }
    if (password !== confirm)     { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email, password,
        options: { data: { full_name: fullName, role: "client" } },
      });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }
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
          @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          .su-success {
            min-height: 100vh; width: 100vw;
            background: #0d0d0d;
            display: flex; align-items: center; justify-content: center;
            font-family: 'DM Sans', sans-serif;
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
            font-family: 'Playfair Display', serif;
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
            font-family: 'DM Sans', sans-serif;
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
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .su {
          min-height: 100vh; width: 100vw;
          background: #0d0d0d;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          position: relative; overflow: hidden;
        }

        .su::before {
          content: '';
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.022) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.022) 1px, transparent 1px);
          background-size: 72px 72px;
        }

        .su-blob {
          position: absolute; border-radius: 50%;
          filter: blur(130px); pointer-events: none;
        }
        .su-blob-1 { width: 500px; height: 500px; background: rgba(245,197,43,0.06); top: -130px; right: -130px; }
        .su-blob-2 { width: 380px; height: 380px; background: rgba(245,197,43,0.04); bottom: -80px; left: -80px; }

        /* ── CARD ── */
        .su-card {
          position: relative; z-index: 10;
          width: 100%; max-width: 480px;
          margin: 24px;
          background: #111111;
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 20px;
          overflow: hidden;
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.5s cubic-bezier(0.16,1,0.3,1),
                      transform 0.5s cubic-bezier(0.16,1,0.3,1);
        }
        .su-card.ready { opacity: 1; transform: translateY(0); }

        /* top gold rule */
        .su-card::before {
          content: '';
          position: absolute; top: 0; left: 44px; right: 44px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245,197,43,0.4), transparent);
        }

        .su-card-header {
          padding: 36px 40px 28px;
          border-bottom: 1px solid rgba(255,255,255,0.06);
        }

        .su-eyebrow {
          font-size: 0.65rem; font-weight: 600;
          letter-spacing: 0.18em; text-transform: uppercase;
          color: #f5c52b; margin-bottom: 8px;
        }

        .su-title {
          font-family: 'Playfair Display', serif;
          font-size: 1.5rem; font-weight: 700;
          color: #ffffff; letter-spacing: -0.02em;
          line-height: 1.2; margin-bottom: 5px;
        }

        .su-sub {
          font-size: 0.8rem;
          color: rgba(255,255,255,0.25);
          font-weight: 300;
        }

        .su-card-body { padding: 28px 40px 36px; }

        .su-error {
          background: rgba(239,68,68,0.07);
          border: 1px solid rgba(239,68,68,0.16);
          border-left: 3px solid rgba(239,68,68,0.5);
          border-radius: 6px;
          padding: 10px 13px; font-size: 0.78rem;
          color: #f87171; margin-bottom: 18px;
          display: flex; align-items: flex-start; gap: 8px; line-height: 1.5;
        }

        .su-field { margin-bottom: 14px; }

        .su-label {
          display: block; font-size: 0.67rem; font-weight: 600;
          color: rgba(255,255,255,0.28);
          letter-spacing: 0.1em; text-transform: uppercase;
          margin-bottom: 7px;
        }

        .su-input-wrap { position: relative; }

        .su-input {
          width: 100%;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 8px;
          padding: 11px 14px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 400;
          color: #ffffff; outline: none;
          transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
        }
        .su-input::placeholder { color: rgba(255,255,255,0.1); }
        .su-input:focus {
          border-color: rgba(245,197,43,0.4);
          background: rgba(245,197,43,0.025);
          box-shadow: 0 0 0 3px rgba(245,197,43,0.06);
        }
        .su-input:-webkit-autofill,
        .su-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0 1000px #161616 inset;
          -webkit-text-fill-color: #ffffff;
          caret-color: #ffffff;
        }
        .su-input.pw { padding-right: 44px; }

        .su-toggle {
          position: absolute; right: 11px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: rgba(255,255,255,0.18);
          display: flex; align-items: center; padding: 4px;
          transition: color 0.2s;
        }
        .su-toggle:hover { color: rgba(255,255,255,0.5); }

        /* password strength */
        .su-strength {
          margin-top: 8px; margin-bottom: 6px;
          display: flex; flex-direction: column; gap: 4px;
        }
        .su-rule {
          display: flex; align-items: center; gap: 7px;
        }
        .su-rule-dot {
          width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
          transition: background 0.2s;
        }
        .su-rule-dot.pass { background: #4caf50; }
        .su-rule-dot.fail { background: rgba(255,255,255,0.12); }
        .su-rule-text {
          font-size: 0.72rem; transition: color 0.2s;
        }
        .su-rule-text.pass { color: #4caf50; }
        .su-rule-text.fail { color: rgba(255,255,255,0.25); }

        .su-submit {
          width: 100%; margin-top: 6px; padding: 12px;
          background: #f5c52b; color: #0d0d0d;
          border: none; border-radius: 8px;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          letter-spacing: 0.02em;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 16px rgba(245,197,43,0.2);
        }
        .su-submit:hover:not(:disabled) {
          background: #fdd835; transform: translateY(-1px);
          box-shadow: 0 6px 24px rgba(245,197,43,0.3);
        }
        .su-submit:active:not(:disabled) { transform: translateY(0); }
        .su-submit:disabled { opacity: 0.45; cursor: not-allowed; }

        .su-footer {
          margin-top: 20px; padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.05);
          font-size: 0.75rem;
          color: rgba(255,255,255,0.18);
          text-align: center;
        }
        .su-footer a {
          color: #f5c52b; text-decoration: none;
          font-weight: 500; opacity: 0.85; transition: opacity 0.2s;
        }
        .su-footer a:hover { opacity: 1; }

        @media (max-width: 520px) {
          .su-card-header, .su-card-body { padding-left: 28px; padding-right: 28px; }
        }
      `}</style>

      <div className="su">
        <div className="su-blob su-blob-1" />
        <div className="su-blob su-blob-2" />

        <div className={`su-card ${ready ? "ready" : ""}`}>

          <div className="su-card-header">
            <div className="su-eyebrow">Client Registration</div>
            <div className="su-title">Create an account</div>
            <div className="su-sub">Submit and track your coverage requests</div>
          </div>

          <div className="su-card-body">
            {error && (
              <div className="su-error">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" style={{ flexShrink: 0, marginTop: 1 }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            <form onSubmit={handleSignup}>
              <div className="su-field">
                <label className="su-label">Full Name</label>
                <div className="su-input-wrap">
                  <input className="su-input" type="text" placeholder="Juan dela Cruz"
                    value={fullName} onChange={(e) => setFullName(e.target.value)}
                    disabled={loading} autoComplete="name" />
                </div>
              </div>

              <div className="su-field">
                <label className="su-label">Email Address</label>
                <div className="su-input-wrap">
                  <input className="su-input" type="email" placeholder="you@example.com"
                    value={email} onChange={(e) => setEmail(e.target.value)}
                    disabled={loading} autoComplete="email" />
                </div>
              </div>

              <div className="su-field">
                <label className="su-label">Password</label>
                <div className="su-input-wrap">
                  <input className={`su-input pw`} type={showPassword ? "text" : "password"}
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading} autoComplete="new-password" />
                  <button type="button" className="su-toggle"
                    onClick={() => setShowPassword((p) => !p)} tabIndex={-1}>
                    {showPassword ? <VisibilityOff style={{ fontSize: 17 }} /> : <Visibility style={{ fontSize: 17 }} />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="su-strength">
                    {RULES.map(({ test, label }) => {
                      const pass = test(password);
                      return (
                        <div className="su-rule" key={label}>
                          <div className={`su-rule-dot ${pass ? "pass" : "fail"}`} />
                          <span className={`su-rule-text ${pass ? "pass" : "fail"}`}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="su-field">
                <label className="su-label">Confirm Password</label>
                <div className="su-input-wrap">
                  <input className={`su-input pw`} type={showConfirm ? "text" : "password"}
                    placeholder="••••••••" value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    disabled={loading} autoComplete="new-password" />
                  <button type="button" className="su-toggle"
                    onClick={() => setShowConfirm((p) => !p)} tabIndex={-1}>
                    {showConfirm ? <VisibilityOff style={{ fontSize: 17 }} /> : <Visibility style={{ fontSize: 17 }} />}
                  </button>
                </div>
              </div>

              <button className="su-submit" type="submit" disabled={loading}>
                {loading
                  ? <CircularProgress size={17} sx={{ color: "#0d0d0d" }} />
                  : "Create Account"}
              </button>
            </form>

            <div className="su-footer">
              Already have an account?{" "}
              <Link to="/login">Sign in</Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Signup;