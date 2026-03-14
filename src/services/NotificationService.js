// src/services/notificationService.js
// ─────────────────────────────────────────────────────────────────────────────
// Centralized notification helpers. Import from here — never duplicate these
// in adminRequestService.js or coverageService.js.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "../lib/supabaseClient";

// ── Base insert ───────────────────────────────────────────────────────────────
async function insertNotifications(rows) {
  if (!rows || rows.length === 0) return;
  const { error } = await supabase.from("notifications").insert(rows);
  if (error) console.error("Notification insert failed:", error.message);
}

// ── Notify all active admins ──────────────────────────────────────────────────
export async function notifyAdmins({ type, title, message, requestId }) {
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);
  if (!admins?.length) return;
  await insertNotifications(
    admins.map((a) => ({
      user_id:        a.id,
      recipient_id:   a.id,
      recipient_role: "admin",
      request_id:     requestId || null,
      type,
      title,
      message,
      is_read:        false,
    }))
  );
}

// ── Notify a single client (requester) ───────────────────────────────────────
export async function notifyClient({ requesterId, type, title, message, requestId }) {
  if (!requesterId) return;
  await insertNotifications([{
    user_id:        requesterId,
    recipient_id:   requesterId,
    recipient_role: "client",
    request_id:     requestId || null,
    type,
    title,
    message,
    is_read:        false,
  }]);
}

// ── Notify sec heads for specific sections ────────────────────────────────────
export async function notifySecHeads({ sections, type, title, message, requestId }) {
  if (!sections?.length) return;
  const { data: secHeads } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "sec_head")
    .in("section", sections)
    .eq("is_active", true);
  if (!secHeads?.length) return;
  await insertNotifications(
    secHeads.map((s) => ({
      user_id:        s.id,
      recipient_id:   s.id,
      recipient_role: "sec_head",
      request_id:     requestId || null,
      type,
      title,
      message,
      is_read:        false,
    }))
  );
}

// ── Notify all staff assigned to a request ────────────────────────────────────
export async function notifyAssignedStaff({ requestId, type, title, message }) {
  const { data: assignments } = await supabase
    .from("coverage_assignments")
    .select("assigned_to")
    .eq("request_id", requestId);
  if (!assignments?.length) return;
  const staffIds = [...new Set(assignments.map((a) => a.assigned_to))];
  await insertNotifications(
    staffIds.map((id) => ({
      user_id:        id,
      recipient_id:   id,
      recipient_role: "staff",
      request_id:     requestId || null,
      type,
      title,
      message,
      is_read:        false,
    }))
  );
}