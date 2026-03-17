// src/hooks/useRealtimeNotify.js
import { useEffect, useRef, useCallback } from "react";
import { useRealtimeSync } from "./useRealtimeSync";

// ── Shared AudioContext (one instance, resumed on first user gesture) ──────────
let _ctx = null;

function getAudioContext() {
  if (!_ctx) {
    _ctx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return _ctx;
}

// Resume the context on first user interaction so autoplay policy is satisfied
function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx.state === "suspended") ctx.resume();
  } catch (_) {}
}

if (typeof window !== "undefined") {
  ["click", "keydown", "touchstart", "pointerdown"].forEach((evt) => {
    window.addEventListener(evt, unlockAudio, { once: false, passive: true });
  });
}

function playChime() {
  try {
    const ctx = getAudioContext();

    // If still suspended (no user gesture yet), bail silently
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
      return;
    }

    const now  = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);

    // Three-tone ascending chime: C5 → E5 → G5
    [[523.25, 0], [659.25, 0.14], [783.99, 0.28]].forEach(([freq, delay]) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + delay);
      osc.connect(gain);
      osc.start(now + delay);
      osc.stop(now + delay + 1.0);
    });
  } catch (_) {}
}

// ── Tab title flash ────────────────────────────────────────────────────────────
let _flashInterval = null;
const _origTitle   = typeof document !== "undefined" ? document.title : "";

function flashTab(message) {
  if (_flashInterval) return;
  let show = true;
  _flashInterval = setInterval(() => {
    document.title = show ? `🔔 ${message}` : _origTitle;
    show = !show;
  }, 900);

  const stop = () => {
    clearInterval(_flashInterval);
    _flashInterval = null;
    document.title = _origTitle;
    window.removeEventListener("focus", stop);
  };
  setTimeout(stop, 12000);
  window.addEventListener("focus", stop);
}

// ── Toast state ────────────────────────────────────────────────────────────────
let _setToasts = null;

export function _registerToastSetter(fn) {
  _setToasts = fn;
}

function pushToast(toast) {
  if (_setToasts) _setToasts((prev) => [...prev.slice(-4), toast]);
}

// ── Main hook ──────────────────────────────────────────────────────────────────
export function useRealtimeNotify(table, callback, filter = null, options = {}) {
  const {
    title    = table,
    sound    = true,
    toast    = true,
    tabFlash = true,
  } = options;

  const notify = useCallback(() => {
    if (sound)    playChime();
    if (tabFlash) flashTab("New update");
    if (toast)    pushToast({ id: Date.now(), title, table });
    callback?.();
  }, [callback, title, table, sound, toast, tabFlash]);

  useRealtimeSync(table, notify, filter);
}