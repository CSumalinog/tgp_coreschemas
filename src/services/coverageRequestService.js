// src/services/coverageService.js
import { supabase }        from "../lib/supabaseClient";
import { notifyAdmins }    from "./NotificationService";

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
    p_name:           otherEntityName.trim(),
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
    const sorted = [...requestData.event_days].sort((a, b) => a.date.localeCompare(b.date));
    const first  = sorted[0];

    return {
      is_multiday: true,
      event_days:  sorted.map((d) => ({
        date:      d.date,
        from_time: toTimeStr(d.from_time),
        to_time:   toTimeStr(d.to_time),
      })),
      // NOT NULL fallback — use first day's values
      event_date: first.date,
      from_time:  toTimeStr(first.from_time) || "00:00",
      to_time:    toTimeStr(first.to_time)   || "00:00",
      end_date:   sorted.length > 1 ? sorted[sorted.length - 1].date : null,
    };
  }

  // Single day
  return {
    is_multiday: false,
    event_days:  null,
    event_date:  requestData.date instanceof Date
      ? toLocalISO(requestData.date)
      : requestData.date,
    from_time:   toTimeStr(requestData.from_time) || "00:00",
    to_time:     toTimeStr(requestData.to_time)   || "00:00",
    end_date:    null,
  };
}

/**
 * Submit or save a coverage request as Draft or Pending
 */
export async function submitCoverageRequest(requestData, file, isDraft = false) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("You must be logged in to submit a request.");

  // ── Resolve "Others" entity ──
  let resolvedEntityId = requestData.entity || null;
  if (requestData.other_entity) {
    resolvedEntityId = await resolveEntityId(requestData.other_entity, requestData.client_type);
  }

  // ── Upload file ──
  let fileUrl = null;
  if (file) {
    const timestamp     = Date.now();
    const sanitizedName = file.name.replace(/\s+/g, "_");
    const filePath      = `program_flows/${user.id}/${timestamp}_${sanitizedName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("coverage-files").upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);
    fileUrl = uploadData.path;
  }

  const payload = {
    title:          requestData.title,
    description:    requestData.description,
    ...buildDatePayload(requestData),
    venue:          requestData.venue,
    services:       requestData.services,
    client_type_id: requestData.client_type,
    entity_id:      resolvedEntityId,
    other_entity:   null,
    contact_person: requestData.contact_person,
    contact_info:   requestData.contact_info,
    file_url:       fileUrl,
    requester_id:   user.id,
    status:         isDraft ? "Draft" : "Pending",
    submitted_at:   isDraft ? null : new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("coverage_requests").insert([payload]).select().single();
  if (error) throw new Error(`Failed to submit request: ${error.message}`);

  if (!isDraft) {
    let entityName = "a client";
    if (resolvedEntityId) {
      const { data: ent } = await supabase
        .from("client_entities").select("name").eq("id", resolvedEntityId).single();
      if (ent?.name) entityName = ent.name;
    }
    try {
      await notifyAdmins({
        type:      "new_request",
        title:     "New Coverage Request",
        message:   `"${data.title}" was submitted by ${entityName}.`,
        requestId: data.id,
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
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated.");

  const { data, error } = await supabase
    .from("coverage_requests")
    .select(`
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
      client_type:client_type_id ( id, name ),
      entity:entity_id ( id, name ),
      coverage_assignments (
        id,
        section,
        staffer:assigned_to (
          id,
          full_name,
          section,
          avatar_url
        )
      )
    `)
    .eq("requester_id", user.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch requests: ${error.message}`);
  return data || [];
}

/**
 * Update a Draft request (edit before submitting)
 */
export async function updateDraftRequest(requestId, requestData, file, submitNow = false) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated.");

  // ── Resolve "Others" entity ──
  let resolvedEntityId = requestData.entity || null;
  if (requestData.other_entity) {
    resolvedEntityId = await resolveEntityId(requestData.other_entity, requestData.client_type);
  }

  // ── Upload file if new one provided ──
  let fileUrl = requestData.file_url || null;
  if (file) {
    const timestamp     = Date.now();
    const sanitizedName = file.name.replace(/\s+/g, "_");
    const filePath      = `program_flows/${user.id}/${timestamp}_${sanitizedName}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("coverage-files").upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadError) throw new Error(`File upload failed: ${uploadError.message}`);
    fileUrl = uploadData.path;
  }

  const payload = {
    title:          requestData.title,
    description:    requestData.description,
    ...buildDatePayload(requestData),
    venue:          requestData.venue,
    services:       requestData.services,
    client_type_id: requestData.client_type,
    entity_id:      resolvedEntityId,
    other_entity:   null,
    contact_person: requestData.contact_person,
    contact_info:   requestData.contact_info,
    file_url:       fileUrl,
    updated_at:     new Date().toISOString(),
    ...(submitNow && { status: "Pending", submitted_at: new Date().toISOString() }),
  };

  const { data, error } = await supabase
    .from("coverage_requests").update(payload)
    .eq("id", requestId).eq("requester_id", user.id).select().single();
  if (error) throw new Error(`Failed to update request: ${error.message}`);

  if (submitNow) {
    let entityName = "a client";
    if (resolvedEntityId) {
      const { data: ent } = await supabase
        .from("client_entities").select("name").eq("id", resolvedEntityId).single();
      if (ent?.name) entityName = ent.name;
    }
    await notifyAdmins({
      type:      "new_request",
      title:     "New Coverage Request",
      message:   `"${data.title}" was submitted by ${entityName}.`,
      requestId: data.id,
    });
  }

  return data;
}

/**
 * Delete a Draft request
 */
export async function deleteDraftRequest(requestId) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("Not authenticated.");

  const { error } = await supabase
    .from("coverage_requests").delete()
    .eq("id", requestId).eq("requester_id", user.id).eq("status", "Draft");
  if (error) throw new Error(`Failed to delete draft: ${error.message}`);
  return true;
}

/**
 * Get public URL of an uploaded file
 */
export function getFileUrl(filePath) {
  if (!filePath) return null;
  const { data } = supabase.storage.from("coverage-files").getPublicUrl(filePath);
  return data?.publicUrl || null;
}