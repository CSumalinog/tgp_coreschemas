// src/services/notificationService.js
// ─────────────────────────────────────────────────────────────────────────────
// Centralized notification helpers. Import from here — never duplicate these
// in adminRequestService.js or coverageService.js.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "../lib/supabaseClient";

let supportsNotificationTargets = true;

function buildNotificationTarget({
  recipientRole,
  requestId,
  type,
  createdBy,
  targetPath,
  targetPayload,
}) {
  const customPayload = targetPayload || {};

  if (requestId) {
    const requestTargetPath = {
      admin: "/admin/request-management",
      client: "/client/request-tracker",
      sec_head: "/sec_head/coverage-management/assignment",
      staff: "/staff/my-assignment",
    }[recipientRole];

    if (requestTargetPath) {
      const basePayload =
        recipientRole === "client"
          ? { openRequestId: requestId, tab: "pipeline" }
          : { openRequestId: requestId };
      return {
        target_path: targetPath || requestTargetPath,
        target_payload: { ...basePayload, ...customPayload },
      };
    }
  }

  if (type === "duty_schedule_change_requested" && recipientRole === "admin") {
    const basePayload = createdBy
      ? { openDutyChangeRequestStafferId: createdBy }
      : {};
    return {
      target_path: targetPath || "/admin/duty-schedule-view",
      target_payload: { ...basePayload, ...customPayload },
    };
  }

  if (
    ["duty_schedule_change_approved", "duty_schedule_change_rejected"].includes(
      type,
    ) &&
    recipientRole === "staff"
  ) {
    return {
      target_path: targetPath || "/staff/my-schedule",
      target_payload: { ...customPayload },
    };
  }

  return {
    target_path: targetPath || null,
    target_payload: { ...customPayload },
  };
}

function buildNotificationRow({
  userId,
  recipientRole,
  requestId,
  type,
  title,
  message,
  createdBy,
  targetPath,
  targetPayload,
}) {
  const target = buildNotificationTarget({
    recipientRole,
    requestId,
    type,
    createdBy,
    targetPath,
    targetPayload,
  });

  return {
    user_id: userId,
    recipient_id: userId,
    recipient_role: recipientRole,
    request_id: requestId || null,
    type,
    title,
    message,
    is_read: false,
    created_by: createdBy || null,
    target_path: target.target_path,
    target_payload: target.target_payload,
  };
}

function stripTargetColumns(rows) {
  return rows.map((row) => {
    const next = { ...row };
    delete next.target_path;
    delete next.target_payload;
    return next;
  });
}

// ── Base insert ───────────────────────────────────────────────────────────────
async function insertNotifications(rows) {
  if (!rows || rows.length === 0) return { data: [] };

  const payload = supportsNotificationTargets ? rows : stripTargetColumns(rows);
  const { data, error } = await supabase.from("notifications").insert(payload);

  if (
    error &&
    supportsNotificationTargets &&
    /target_path|target_payload/i.test(error.message || "")
  ) {
    supportsNotificationTargets = false;
    const retry = await supabase
      .from("notifications")
      .insert(stripTargetColumns(rows));
    if (retry.error) {
      throw retry.error;
    }
    return retry;
  }

  if (error) {
    throw error;
  }

  return { data };
}

// ── Notify all active admins ──────────────────────────────────────────────────
export async function notifyAdmins({
  type,
  title,
  message,
  requestId,
  createdBy,
  targetPath,
  targetPayload,
}) {
  const { data: admins, error } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);
  if (error) return;
  if (!admins?.length) return;
  try {
    await insertNotifications(
      admins.map((a) =>
        buildNotificationRow({
          userId: a.id,
          recipientRole: "admin",
          requestId,
          type,
          title,
          message,
          createdBy,
          targetPath,
          targetPayload,
        }),
      ),
    );
  } catch (error) {
    // notification failure is non-fatal
  }
}

// ── Notify a single client (requester) ───────────────────────────────────────
export async function notifyClient({
  requesterId,
  type,
  title,
  message,
  requestId,
  createdBy,
  targetPath,
  targetPayload,
}) {
  if (!requesterId) return { ok: false, reason: "missing_requester_id" };
  try {
    await insertNotifications([
      buildNotificationRow({
        userId: requesterId,
        recipientRole: "client",
        requestId,
        type,
        title,
        message,
        createdBy,
        targetPath,
        targetPayload,
      }),
    ]);
    return { ok: true };
  } catch (error) {
    console.error("notifyClient failed:", error);
    return { ok: false, error };
  }
}

// ── Notify sec heads for specific sections ────────────────────────────────────
export async function notifySecHeads({
  sections,
  type,
  title,
  message,
  requestId,
  createdBy,
  targetPath,
  targetPayload,
}) {
  // sections: null/undefined → notify ALL active sec heads
  // sections: [] (empty array) → no-op (caller explicitly wants no one)
  if (Array.isArray(sections) && sections.length === 0)
    return { ok: false, reason: "empty_sections" };
  let query = supabase
    .from("profiles")
    .select("id")
    .eq("role", "sec_head")
    .eq("is_active", true);
  if (sections?.length) {
    query = query.in("section", sections);
  }
  const { data: secHeads, error } = await query;
  if (error) {
    return { ok: false, error };
  }
  if (!secHeads?.length) return { ok: false, reason: "no_sec_heads" };
  try {
    await insertNotifications(
      secHeads.map((s) =>
        buildNotificationRow({
          userId: s.id,
          recipientRole: "sec_head",
          requestId,
          type,
          title,
          message,
          createdBy,
          targetPath,
          targetPayload,
        }),
      ),
    );
    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
}

// ── Notify all staff assigned to a request ────────────────────────────────────
export async function notifyAssignedStaff({
  requestId,
  type,
  title,
  message,
  createdBy,
  targetPath,
  targetPayload,
}) {
  const { data: assignments } = await supabase
    .from("coverage_assignments")
    .select("assigned_to")
    .eq("request_id", requestId);
  if (!assignments?.length) return;
  const staffIds = [...new Set(assignments.map((a) => a.assigned_to))];
  await insertNotifications(
    staffIds.map((id) =>
      buildNotificationRow({
        userId: id,
        recipientRole: "staff",
        requestId,
        type,
        title,
        message,
        createdBy,
        targetPath,
        targetPayload,
      }),
    ),
  );
}

// ── Notify specific staff by ID array ────────────────────────────────────────
export async function notifySpecificStaff({
  staffIds,
  type,
  title,
  message,
  requestId,
  createdBy,
  targetPath,
  targetPayload,
}) {
  if (!staffIds?.length) return { ok: false, reason: "empty_staff_ids" };
  const uniqueIds = [...new Set(staffIds)];
  try {
    await insertNotifications(
      uniqueIds.map((id) =>
        buildNotificationRow({
          userId: id,
          recipientRole: "staff",
          requestId,
          type,
          title,
          message,
          createdBy,
          targetPath,
          targetPayload,
        }),
      ),
    );
    return { ok: true };
  } catch (error) {
    console.error("notifySpecificStaff failed:", error);
    return { ok: false, error };
  }
}
