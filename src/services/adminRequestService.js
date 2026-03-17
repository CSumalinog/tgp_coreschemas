// src/services/adminRequestService.js
import { supabase }                                                    from "../lib/supabaseClient";
import { notifyClient, notifySecHeads, notifyAssignedStaff } from "./notificationService";

/**
 * Fetch all coverage requests for Admin (all statuses except Draft)
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
 * → Notifies sec heads of the forwarded sections
 */
export async function forwardRequest(requestId, sections) {
  const { data: req } = await supabase
    .from("coverage_requests")
    .select("title, requester_id")
    .eq("id", requestId)
    .single();

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status:             "Forwarded",
      forwarded_sections: sections,
      forwarded_at:       new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to forward request: ${error.message}`);

  await notifySecHeads({
    sections,
    type:      "forwarded",
    title:     "Request Forwarded to You",
    message:   `"${req?.title || "A coverage request"}" has been forwarded to your section for staff assignment.`,
    requestId,
  });

  return data;
}

/**
 * Decline a request with a reason
 * → Notifies the client
 */
export async function declineRequest(requestId, reason) {
  const { data: req } = await supabase
    .from("coverage_requests")
    .select("title, requester_id")
    .eq("id", requestId)
    .single();

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status:          "Declined",
      declined_reason: reason,
      declined_at:     new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to decline request: ${error.message}`);

  await notifyClient({
    requesterId: req?.requester_id,
    type:        "declined",
    title:       "Coverage Request Declined",
    message:     `Your request "${req?.title || "your coverage request"}" was declined. Reason: ${reason}`,
    requestId,
  });

  return data;
}

/**
 * Approve a request
 * → Flips all assignments to "Approved" (staff can now see + act on them)
 * → Notifies the client + all assigned staff
 */
export async function approveRequest(requestId, adminNotes = "") {
  const { data: req } = await supabase
    .from("coverage_requests")
    .select("title, requester_id")
    .eq("id", requestId)
    .single();

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status:      "Approved",
      admin_notes: adminNotes,
      approved_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to approve request: ${error.message}`);

  // ── Flip all assignments to Approved BEFORE notifying staff ───────────────
  // Staff queries filter out "Pending" — assignments must be flipped first
  // so that by the time the notification triggers a re-fetch, rows are visible.
  const { error: assignErr } = await supabase
    .from("coverage_assignments")
    .update({ status: "Approved" })
    .eq("request_id", requestId);

  if (assignErr) throw new Error(`Failed to approve assignments: ${assignErr.message}`);

  // ── Notifications fire only after the flip is confirmed ───────────────────
  const requestTitle = req?.title || "a coverage request";

  await notifyClient({
    requesterId: req?.requester_id,
    type:        "approved",
    title:       "Coverage Request Approved",
    message:     `Your request "${requestTitle}" has been approved! Please coordinate with the assigned staffers.`,
    requestId,
  });

  await notifyAssignedStaff({
    requestId,
    type:    "assigned",
    title:   "You Have a Coverage Assignment",
    message: `You have been assigned to cover "${requestTitle}". Check your assignments for details.`,
  });

  return data;
}