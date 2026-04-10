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
  if (targetPath || targetPayload) {
    return {
      target_path: targetPath || null,
      target_payload: targetPayload || {},
    };
  }

  if (requestId) {
    const requestTargetPath = {
      admin: "/admin/request-management",
      client: "/client/request-tracker",
      sec_head: "/sec_head/coverage-management/assignment",
      staff: "/staff/my-assignment",
    }[recipientRole];

    if (requestTargetPath) {
      return {
        target_path: requestTargetPath,
        target_payload:
          recipientRole === "client"
            ? { openRequestId: requestId, tab: "pipeline" }
            : { openRequestId: requestId },
      };
    }
  }

  if (type === "duty_schedule_change_requested" && recipientRole === "admin") {
    return {
      target_path: "/admin/duty-schedule-view",
      target_payload: createdBy
        ? { openDutyChangeRequestStafferId: createdBy }
        : {},
    };
  }

  if (
    ["duty_schedule_change_approved", "duty_schedule_change_rejected"].includes(
      type,
    ) &&
    recipientRole === "staff"
  ) {
    return {
      target_path: "/staff/my-schedule",
      target_payload: {},
    };
  }

  return {
    target_path: null,
    target_payload: {},
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
  return rows.map(({ target_path, target_payload, ...row }) => row);
}

// ── Base insert ───────────────────────────────────────────────────────────────
async function insertNotifications(rows) {
  if (!rows || rows.length === 0) return;
  const payload = supportsNotificationTargets ? rows : stripTargetColumns(rows);
  const { error } = await supabase.from("notifications").insert(payload);

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
      console.error("Notification insert failed:", retry.error.message);
    }
    return;
  }

  if (error) console.error("Notification insert failed:", error.message);
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
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "admin")
    .eq("is_active", true);
  if (!admins?.length) return;
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
  if (!requesterId) return;
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
  if (Array.isArray(sections) && sections.length === 0) return;
  let query = supabase
    .from("profiles")
    .select("id")
    .eq("role", "sec_head")
    .eq("is_active", true);
  if (sections?.length) {
    query = query.in("section", sections);
  }
  const { data: secHeads } = await query;
  if (!secHeads?.length) return;
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
  if (!staffIds?.length) return;
  const uniqueIds = [...new Set(staffIds)];
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
}
