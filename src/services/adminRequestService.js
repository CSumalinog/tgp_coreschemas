// src/services/adminRequestService.js
import { supabase } from "../lib/supabaseClient";

/**
 * Fetch all coverage requests for Admin (all statuses)
 */
export async function fetchAllRequests() {
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
      requester_id,
      client_type:client_type_id ( id, name ),
      entity:client_entities ( id, name ),
      requester:profiles ( id, full_name )
    `)
    .not("status", "eq", "Draft")
    .order("submitted_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch requests: ${error.message}`);
  return data || [];
}

/**
 * Forward a request to selected sections
 */
export async function forwardRequest(requestId, sections) {
  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status: "Forwarded",
      forwarded_sections: sections,
      forwarded_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to forward request: ${error.message}`);
  return data;
}

/**
 * Decline a request with a reason
 */
export async function declineRequest(requestId, reason) {
  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status: "Declined",
      declined_reason: reason,
      declined_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to decline request: ${error.message}`);
  return data;
}

/**
 * Approve a request (after Sec Head has assigned staffers)
 */
export async function approveRequest(requestId, adminNotes = "") {
  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status: "Approved",
      admin_notes: adminNotes,
      approved_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to approve request: ${error.message}`);
  return data;
}