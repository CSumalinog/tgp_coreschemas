// src/services/coverageService.js
import { supabase } from "../lib/supabaseClient";
import {
  notifyAdmins,
  notifySecHeads,
  notifySpecificStaff,
} from "./NotificationService";

// ── Timezone-safe date serializer ─────────────────────────────────────────────
const toLocalISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// ── Serialize a Date or string time value → "HH:MM" ──────────────────────────
const toTimeStr = (t) => {
  if (!t) return null;
  if (t instanceof Date) return t.toTimeString().slice(0, 5);
  // already a string like "08:00" or "08:00:00"
  return t.slice(0, 5);
};

// ── Upsert "Others" entity via RPC (SECURITY DEFINER — bypasses RLS) ──────────
async function resolveEntityId(otherEntityName, clientTypeId) {
  const { data, error } = await supabase.rpc("upsert_client_entity", {
    p_name: otherEntityName.trim(),
    p_client_type_id: clientTypeId,
  });
  if (error) throw error;
  return data;
}

// ── Build the multi-day payload fields ───────────────────────────────────────
// event_days is [{ date, from_time, to_time }] where times are Date objects
// Returns the fields to merge into the DB payload
function buildDatePayload(requestData) {
  const isMultiDay = requestData.is_multiday;

  if (isMultiDay && requestData.event_days?.length > 0) {
    const sorted = [...requestData.event_days].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    const first = sorted[0];

    return {
      is_multiday: true,
      event_days: sorted.map((d) => ({
        date: d.date,
        from_time: toTimeStr(d.from_time),
        to_time: toTimeStr(d.to_time),
      })),
      // NOT NULL fallback — use first day's values
      event_date: first.date,
      from_time: toTimeStr(first.from_time) || "00:00",
      to_time: toTimeStr(first.to_time) || "00:00",
      end_date: sorted.length > 1 ? sorted[sorted.length - 1].date : null,
    };
  }

  // Single day
  return {
    is_multiday: false,
    event_days: null,
    event_date:
      requestData.date instanceof Date
        ? toLocalISO(requestData.date)
        : requestData.date,
    from_time: toTimeStr(requestData.from_time) || "00:00",
    to_time: toTimeStr(requestData.to_time) || "00:00",
    end_date: null,
  };
}

/**
 * Submit or save a coverage request as Draft or Pending
 */
export async function submitCoverageRequest(
  requestData,
  file,
  isDraft = false,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    throw new Error("You must be logged in to submit a request.");

  // ── Resolve "Others" entity ──
  let resolvedEntityId = requestData.entity || null;
  if (requestData.other_entity) {
    resolvedEntityId = await resolveEntityId(
      requestData.other_entity,
      requestData.client_type,
    );
  }

  if (!resolvedEntityId) {
    throw new Error("Entity / organization is required to submit a request.");
  }

  // ── Upload file ──
  let fileUrl = null;
  if (file) {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/\s+/g, "_");
    const filePath = `program_flows/${user.id}/${timestamp}_${sanitizedName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("coverage-files")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError)
      throw new Error(`File upload failed: ${uploadError.message}`);
    fileUrl = uploadData.path;
  }

  const payload = {
    title: requestData.title,
    description: requestData.description,
    ...buildDatePayload(requestData),
    venue: requestData.venue,
    services: requestData.services,
    client_type_id: requestData.client_type,
    entity_id: resolvedEntityId,
    other_entity: null,
    contact_person: requestData.contact_person,
    contact_info: requestData.contact_info,
    file_url: fileUrl,
    requester_id: user.id,
    status: isDraft ? "Draft" : "Pending",
    submitted_at: isDraft ? null : new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("coverage_requests")
    .insert([payload])
    .select()
    .single();
  if (error) throw new Error(`Failed to submit request: ${error.message}`);

  if (!isDraft) {
    let entityName = "a client";
    if (resolvedEntityId) {
      const { data: ent } = await supabase
        .from("client_entities")
        .select("name")
        .eq("id", resolvedEntityId)
        .single();
      if (ent?.name) entityName = ent.name;
    }
    try {
      await notifyAdmins({
        type: "new_request",
        title: "New Coverage Request",
        message: `"${data.title}" was submitted by ${entityName}.`,
        requestId: data.id,
        createdBy: user.id,
      });
    } catch (notifErr) {
      console.error("notifyAdmins failed:", notifErr);
    }
  }

  return data;
}

/**
 * Fetch all coverage requests for the currently logged-in client.
 */
export async function fetchMyRequests() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("coverage_requests")
    .select(
      `
      id,
      title,
      description,
      event_date,
      from_time,
      to_time,
      venue,
      services,
      status,
      is_multiday,
      event_days,
      end_date,
      contact_person,
      contact_info,
      file_url,
      admin_notes,
      declined_reason,
      forwarded_sections,
      submitted_at,
      approved_at,
      declined_at,
      forwarded_at,
      created_at,
      cancelled_at,
      cancellation_reason,
      client_type:client_type_id ( id, name ),
      entity:entity_id ( id, name ),
      coverage_assignments (
        id,
        section,
        status,
        timed_in_at,
        completed_at,
        staffer:assigned_to (
          id,
          full_name,
          section,
          avatar_url
        )
      )
    `,
    )
    .eq("requester_id", user.id)
    .is("archived_at", null)
    .is("trashed_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch requests: ${error.message}`);
  return data || [];
}

/**
 * Update a Draft request (edit before submitting)
 */
export async function updateDraftRequest(
  requestId,
  requestData,
  file,
  submitNow = false,
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated.");

  // Use existing draft values as fallback when the caller only sends partial
  // fields (common from Draft Details submit action).
  const { data: existingDraft } = await supabase
    .from("coverage_requests")
    .select("file_url, entity_id, client_type_id")
    .eq("id", requestId)
    .eq("requester_id", user.id)
    .single();

  const clientTypeId = requestData.client_type || existingDraft?.client_type_id;

  // ── Resolve "Others" entity ──
  let resolvedEntityId = requestData.entity || existingDraft?.entity_id || null;
  if (requestData.other_entity) {
    resolvedEntityId = await resolveEntityId(
      requestData.other_entity,
      clientTypeId,
    );
  }

  if (!resolvedEntityId) {
    throw new Error("Entity / organization is required to submit a request.");
  }

  // ── Upload file if new one provided ──
  let fileUrl = requestData.file_url;
  if (typeof fileUrl === "undefined") {
    fileUrl = existingDraft?.file_url || null;
  }
  if (file) {
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/\s+/g, "_");
    const filePath = `program_flows/${user.id}/${timestamp}_${sanitizedName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("coverage-files")
      .upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError)
      throw new Error(`File upload failed: ${uploadError.message}`);
    fileUrl = uploadData.path;
  }

  const payload = {
    title: requestData.title,
    description: requestData.description,
    ...buildDatePayload(requestData),
    venue: requestData.venue,
    services: requestData.services,
    client_type_id: clientTypeId,
    entity_id: resolvedEntityId,
    other_entity: null,
    contact_person: requestData.contact_person,
    contact_info: requestData.contact_info,
    file_url: fileUrl,
    updated_at: new Date().toISOString(),
    ...(submitNow && {
      status: "Pending",
      submitted_at: new Date().toISOString(),
    }),
  };

  const { data, error } = await supabase
    .from("coverage_requests")
    .update(payload)
    .eq("id", requestId)
    .eq("requester_id", user.id)
    .select()
    .single();
  if (error) throw new Error(`Failed to update request: ${error.message}`);

  if (submitNow) {
    let entityName = "a client";
    if (resolvedEntityId) {
      const { data: ent } = await supabase
        .from("client_entities")
        .select("name")
        .eq("id", resolvedEntityId)
        .single();
      if (ent?.name) entityName = ent.name;
    }
    await notifyAdmins({
      type: "new_request",
      title: "New Coverage Request",
      message: `"${data.title}" was submitted by ${entityName}.`,
      requestId: data.id,
      createdBy: user.id,
    });
  }

  return data;
}

/**
 * Delete a Draft request
 */
export async function deleteDraftRequest(requestId) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated.");

  const { error } = await supabase
    .from("coverage_requests")
    .delete()
    .eq("id", requestId)
    .eq("requester_id", user.id)
    .eq("status", "Draft");
  if (error) throw new Error(`Failed to delete draft: ${error.message}`);
  return true;
}

/**
 * Cancel a coverage request (client-initiated)
 * Notifies based on pipeline stage at time of cancellation
 */
export async function cancelRequest(requestId, reason = "") {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated.");

  // ── Fetch current request (need status + title for notifications) ──
  const { data: request, error: fetchError } = await supabase
    .from("coverage_requests")
    .select(
      `
      id,
      title,
      status,
      requester_id,
      forwarded_sections,
      coverage_assignments (
        id,
        assigned_to,
        status
      )
    `,
    )
    .eq("id", requestId)
    .eq("requester_id", user.id)
    .single();

  if (fetchError || !request)
    throw new Error("Request not found or access denied.");

  const CANCELLABLE_STATUSES = [
    "Pending",
    "Forwarded",
    "Assigned",
    "For Approval",
    "Approved",
    "On Going",
  ];

  if (!CANCELLABLE_STATUSES.includes(request.status)) {
    throw new Error(`Cannot cancel a request with status "${request.status}".`);
  }

  const now = new Date().toISOString();

  // ── 1. Update request status ──
  const { error: updateError } = await supabase
    .from("coverage_requests")
    .update({
      status: "Cancelled",
      cancelled_at: now,
      cancelled_by: user.id,
      cancellation_reason: reason || null,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("requester_id", user.id);

  if (updateError)
    throw new Error(`Failed to cancel request: ${updateError.message}`);

  // ── 2. Soft-cancel all active assignments ──
  const activeAssignments = (request.coverage_assignments || []).filter(
    (a) => !["Completed", "No Show", "Cancelled"].includes(a.status),
  );

  if (activeAssignments.length > 0) {
    const assignmentIds = activeAssignments.map((a) => a.id);
    const { error: assignError } = await supabase
      .from("coverage_assignments")
      .update({
        cancelled_at: now,
        cancellation_reason: "Request cancelled by client",
        status: "Cancelled",
      })
      .in("id", assignmentIds);

    if (assignError)
      console.error("Failed to cancel assignments:", assignError);
  }

  // ── 3. Notifications based on pipeline stage ──
  const { status } = request;
  const requestTitle = `"${request.title}"`;

  // Always notify admins
  try {
    await notifyAdmins({
      type: "request_cancelled",
      title: "Request Cancelled by Client",
      message: `${requestTitle} has been cancelled by the client. Reason: ${reason || "No reason provided."}`,
      requestId: request.id,
      createdBy: user.id,
    });
  } catch (e) {
    console.error("notifyAdmins failed:", e);
  }

  // Notify section heads if request was forwarded or beyond
  if (
    ["Forwarded", "Assigned", "For Approval", "Approved", "On Going"].includes(
      status,
    )
  ) {
    try {
      await notifySecHeads({
        type: "request_cancelled",
        title: "Request Cancelled",
        message: `${requestTitle} has been cancelled by the client.`,
        requestId: request.id,
        sections: request.forwarded_sections || [],
        createdBy: user.id,
      });
    } catch (e) {
      console.error("notifySecHeads failed:", e);
    }
  }

  // Notify assigned staff if Approved or On Going
  if (
    ["Approved", "On Going"].includes(status) &&
    activeAssignments.length > 0
  ) {
    const staffIds = activeAssignments
      .map((a) => a.assigned_to)
      .filter(Boolean);
    if (staffIds.length > 0) {
      try {
        await notifySpecificStaff({
          staffIds,
          type: "assignment_cancelled",
          title: "Assignment Cancelled",
          message: `Your assignment for ${requestTitle} has been cancelled. The client's event did not push through.`,
          requestId: request.id,
          createdBy: user.id,
        });
      } catch (e) {
        console.error("notifySpecificStaff failed:", e);
      }
    }
  }

  return true;
}

/**
 * Reschedule a coverage request (client-initiated)
 * - Preserves previous date fields for audit trail
 * - Soft-cancels all existing assignments
 * - Kicks status back to Forwarded
 * - Fires notifications to all relevant parties
 */
export async function rescheduleRequest(
  requestId,
  newDatePayload,
  reason = "",
) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated.");

  // ── Fetch current request ──
  const { data: request, error: fetchError } = await supabase
    .from("coverage_requests")
    .select(
      `
      id,
      title,
      status,
      requester_id,
      forwarded_sections,
      event_date,
      from_time,
      to_time,
      is_multiday,
      event_days,
      coverage_assignments (
        id,
        assigned_to,
        status
      )
    `,
    )
    .eq("id", requestId)
    .eq("requester_id", user.id)
    .single();

  if (fetchError || !request)
    throw new Error("Request not found or access denied.");

  const RESCHEDULABLE_STATUSES = [
    "Forwarded",
    "Assigned",
    "For Approval",
    "Approved",
    "On Going",
  ];

  if (!RESCHEDULABLE_STATUSES.includes(request.status)) {
    throw new Error(
      `Cannot reschedule a request with status "${request.status}".`,
    );
  }

  const now = new Date().toISOString();

  // ── 1. Update request with new date + preserve previous date ──
  const { error: updateError } = await supabase
    .from("coverage_requests")
    .update({
      // New date fields
      ...newDatePayload,
      // Kick back to Forwarded
      status: "Forwarded",
      // Reschedule metadata
      reschedule_requested_at: now,
      reschedule_reason: reason || null,
      rescheduled_at: now,
      rescheduled_by: user.id,
      // Preserve previous date for audit trail
      previous_event_date: request.event_date || null,
      previous_from_time: request.from_time || null,
      previous_to_time: request.to_time || null,
      previous_event_days: request.event_days || null,
      updated_at: now,
    })
    .eq("id", requestId)
    .eq("requester_id", user.id);

  if (updateError)
    throw new Error(`Failed to reschedule request: ${updateError.message}`);

  // ── 2. Soft-cancel all active assignments ──
  const activeAssignments = (request.coverage_assignments || []).filter(
    (a) => !["Completed", "No Show", "Cancelled"].includes(a.status),
  );

  if (activeAssignments.length > 0) {
    const assignmentIds = activeAssignments.map((a) => a.id);
    const { error: assignError } = await supabase
      .from("coverage_assignments")
      .update({
        cancelled_at: now,
        cancellation_reason: "Request rescheduled by client",
        status: "Cancelled",
      })
      .in("id", assignmentIds);

    if (assignError)
      console.error("Failed to cancel assignments on reschedule:", assignError);
  }

  // ── 3. Notifications ──
  const { status } = request;
  const requestTitle = `"${request.title}"`;
  const newDateLabel = newDatePayload.event_date || "a new date";

  // Notify section heads — they need to reassign
  try {
    await notifySecHeads({
      type: "request_rescheduled",
      title: "Request Rescheduled — Reassignment Needed",
      message: `${requestTitle} has been rescheduled to ${newDateLabel}. Please reassign staff for the new date.`,
      requestId: request.id,
      // null → all active sec heads when forwarded_sections is missing/empty
      sections: request.forwarded_sections?.length
        ? request.forwarded_sections
        : null,
      createdBy: user.id,
    });
  } catch (e) {
    console.error("notifySecHeads (reschedule) failed:", e);
  }

  // Notify assigned staff if there were active assignments
  if (activeAssignments.length > 0) {
    const staffIds = activeAssignments
      .map((a) => a.assigned_to)
      .filter(Boolean);
    if (staffIds.length > 0) {
      try {
        await notifySpecificStaff({
          staffIds,
          type: "assignment_cancelled",
          title: "Assignment Cancelled — Event Rescheduled",
          message: `Your assignment for ${requestTitle} has been cancelled. The client has rescheduled the event to ${newDateLabel}.`,
          requestId: request.id,
          createdBy: user.id,
        });
      } catch (e) {
        console.error("notifySpecificStaff (reschedule) failed:", e);
      }
    }
  }

  // Notify admins — FYI
  try {
    await notifyAdmins({
      type: "request_rescheduled",
      title: "Request Rescheduled by Client",
      message: `${requestTitle} has been rescheduled to ${newDateLabel}. Status reset to Forwarded.${reason ? ` Reason: ${reason}` : ""}`,
      requestId: request.id,
      createdBy: user.id,
    });
  } catch (e) {
    console.error("notifyAdmins (reschedule) failed:", e);
  }

  return true;
}

/**
 * Get public URL of an uploaded file
 */
export function getFileUrl(filePath) {
  if (!filePath) return null;
  const { data } = supabase.storage
    .from("coverage-files")
    .getPublicUrl(filePath);
  return data?.publicUrl || null;
}
