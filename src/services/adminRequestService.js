// src/services/adminRequestService.js
import { supabase }                                          from "../lib/supabaseClient";
import { notifyClient, notifySecHeads, notifyAssignedStaff } from "./NotificationService";

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
      forwarded_by,
      approved_by,
      declined_by,
      client_type:client_type_id ( id, name ),
      entity:client_entities ( id, name ),
      coverage_assignments (
        id,
        status,
        section,
        assigned_to,
        timed_in_at,
        completed_at
      )
    `)
    .not("status", "eq", "Draft")
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("fetchAllRequests error:", error.message);
    throw new Error(`Failed to fetch requests: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  // ── Collect all unique profile IDs to batch-fetch names ───────────────────
  const profileIds = new Set();
  data.forEach((r) => {
    if (r.requester_id) profileIds.add(r.requester_id);
    if (r.forwarded_by)  profileIds.add(r.forwarded_by);
    if (r.approved_by)   profileIds.add(r.approved_by);
    if (r.declined_by)   profileIds.add(r.declined_by);
    (r.coverage_assignments || []).forEach((a) => {
      if (a.assigned_to) profileIds.add(a.assigned_to);
    });
  });

  // ── Batch fetch all profiles in one query ─────────────────────────────────
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, section, avatar_url")
    .in("id", [...profileIds]);

  const profileMap = {};
  (profiles || []).forEach((p) => { profileMap[p.id] = p; });

  // ── Enrich each request with profile data ─────────────────────────────────
  return data.map((r) => ({
    ...r,
    requester:           profileMap[r.requester_id] ? { id: r.requester_id, full_name: profileMap[r.requester_id].full_name } : null,
    forwarded_by_profile: profileMap[r.forwarded_by] ? { id: r.forwarded_by, full_name: profileMap[r.forwarded_by].full_name } : null,
    approved_by_profile:  profileMap[r.approved_by]  ? { id: r.approved_by,  full_name: profileMap[r.approved_by].full_name  } : null,
    declined_by_profile:  profileMap[r.declined_by]  ? { id: r.declined_by,  full_name: profileMap[r.declined_by].full_name  } : null,
    coverage_assignments: (r.coverage_assignments || []).map((a) => ({
      ...a,
      staffer: profileMap[a.assigned_to] ? {
        id:         a.assigned_to,
        full_name:  profileMap[a.assigned_to].full_name,
        section:    profileMap[a.assigned_to].section,
        avatar_url: profileMap[a.assigned_to].avatar_url,
      } : null,
    })),
  }));
}

/**
 * Get the currently authenticated user's ID
 */
async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Forward a request to selected sections
 * → Records who forwarded it
 * → Notifies sec heads of the forwarded sections
 */
export async function forwardRequest(requestId, sections) {
  const [{ data: req }, currentUserId] = await Promise.all([
    supabase.from("coverage_requests").select("title, requester_id").eq("id", requestId).single(),
    getCurrentUserId(),
  ]);

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status:             "Forwarded",
      forwarded_sections: sections,
      forwarded_at:       new Date().toISOString(),
      forwarded_by:       currentUserId,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to forward request: ${error.message}`);

  await notifySecHeads({
    sections,
    type:    "forwarded",
    title:   "Request Forwarded to You",
    message: `"${req?.title || "A coverage request"}" has been forwarded to your section for staff assignment.`,
    requestId,
  });

  return data;
}

/**
 * Decline a request with a reason
 * → Records who declined it
 * → Notifies the client
 */
export async function declineRequest(requestId, reason) {
  const [{ data: req }, currentUserId] = await Promise.all([
    supabase.from("coverage_requests").select("title, requester_id").eq("id", requestId).single(),
    getCurrentUserId(),
  ]);

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status:          "Declined",
      declined_reason: reason,
      declined_at:     new Date().toISOString(),
      declined_by:     currentUserId,
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
 * → Records who approved it
 * → Flips all assignments to "Approved"
 * → Notifies the client + all assigned staff
 */
export async function approveRequest(requestId, adminNotes = "") {
  const [{ data: req }, currentUserId] = await Promise.all([
    supabase.from("coverage_requests").select("title, requester_id").eq("id", requestId).single(),
    getCurrentUserId(),
  ]);

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status:      "Approved",
      admin_notes: adminNotes,
      approved_at: new Date().toISOString(),
      approved_by: currentUserId,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to approve request: ${error.message}`);

  // ── Flip all assignments to Approved BEFORE notifying staff ───────────────
  const { error: assignErr } = await supabase
    .from("coverage_assignments")
    .update({ status: "Approved" })
    .eq("request_id", requestId);

  if (assignErr) throw new Error(`Failed to approve assignments: ${assignErr.message}`);

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