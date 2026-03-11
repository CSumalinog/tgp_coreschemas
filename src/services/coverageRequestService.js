// src/services/coverageService.js
import { supabase } from "../lib/supabaseClient";

/**
 * Submit or save a coverage request as Draft or Pending
 */
export async function submitCoverageRequest(requestData, file, isDraft = false) {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error("You must be logged in to submit a request.");

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
    event_date:     requestData.date instanceof Date ? requestData.date.toISOString().split("T")[0] : requestData.date,
    from_time:      requestData.from_time instanceof Date ? requestData.from_time.toTimeString().slice(0, 5) : requestData.from_time,
    to_time:        requestData.to_time instanceof Date ? requestData.to_time.toTimeString().slice(0, 5) : requestData.to_time,
    venue:          requestData.venue,
    services:       requestData.services,
    client_type_id: requestData.client_type,
    entity_id:      requestData.entity       || null,
    other_entity:   requestData.other_entity || null,
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
      other_entity,
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
    event_date:     requestData.date instanceof Date ? requestData.date.toISOString().split("T")[0] : requestData.date,
    from_time:      requestData.from_time instanceof Date ? requestData.from_time.toTimeString().slice(0, 5) : requestData.from_time,
    to_time:        requestData.to_time instanceof Date ? requestData.to_time.toTimeString().slice(0, 5) : requestData.to_time,
    venue:          requestData.venue,
    services:       requestData.services,
    client_type_id: requestData.client_type,
    entity_id:      requestData.entity       || null,
    other_entity:   requestData.other_entity || null,
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