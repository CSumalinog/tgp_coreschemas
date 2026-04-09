// src/services/adminRequestService.js
import { supabase } from "../lib/supabaseClient";
import {
  notifyClient,
  notifySecHeads,
  notifyAssignedStaff,
} from "./NotificationService";

/**
 * Fetch all coverage requests for Admin (all statuses except Draft)
 */
export async function fetchAllRequests() {
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
      end_date,
      is_multiday,
      event_days,
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
        completed_at,
        selfie_url
      )
    `,
    )
    .not("status", "eq", "Draft")
    .is("archived_at", null)
    .is("trashed_at", null)
    .order("submitted_at", { ascending: false });

  if (error) {
    console.error("fetchAllRequests error:", error.message);
    throw new Error(`Failed to fetch requests: ${error.message}`);
  }

  if (!data || data.length === 0) return [];

  const profileIds = new Set();
  data.forEach((r) => {
    if (r.requester_id) profileIds.add(r.requester_id);
    if (r.forwarded_by) profileIds.add(r.forwarded_by);
    if (r.approved_by) profileIds.add(r.approved_by);
    if (r.declined_by) profileIds.add(r.declined_by);
    (r.coverage_assignments || []).forEach((a) => {
      if (a.assigned_to) profileIds.add(a.assigned_to);
    });
  });

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, section, avatar_url")
    .in("id", [...profileIds]);

  const profileMap = {};
  (profiles || []).forEach((p) => {
    profileMap[p.id] = p;
  });

  return data.map((r) => ({
    ...r,
    requester: profileMap[r.requester_id]
      ? { id: r.requester_id, full_name: profileMap[r.requester_id].full_name }
      : null,
    forwarded_by_profile: profileMap[r.forwarded_by]
      ? {
          id: r.forwarded_by,
          full_name: profileMap[r.forwarded_by].full_name,
          avatar_url: profileMap[r.forwarded_by].avatar_url,
        }
      : null,
    approved_by_profile: profileMap[r.approved_by]
      ? {
          id: r.approved_by,
          full_name: profileMap[r.approved_by].full_name,
          avatar_url: profileMap[r.approved_by].avatar_url,
        }
      : null,
    declined_by_profile: profileMap[r.declined_by]
      ? {
          id: r.declined_by,
          full_name: profileMap[r.declined_by].full_name,
          avatar_url: profileMap[r.declined_by].avatar_url,
        }
      : null,
    coverage_assignments: (r.coverage_assignments || []).map((a) => ({
      ...a,
      staffer: profileMap[a.assigned_to]
        ? {
            id: a.assigned_to,
            full_name: profileMap[a.assigned_to].full_name,
            section: profileMap[a.assigned_to].section,
            avatar_url: profileMap[a.assigned_to].avatar_url,
          }
        : null,
    })),
  }));
}

async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function forwardRequest(requestId, sections) {
  const [{ data: req }, currentUserId] = await Promise.all([
    supabase
      .from("coverage_requests")
      .select("title, requester_id")
      .eq("id", requestId)
      .single(),
    getCurrentUserId(),
  ]);

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status: "Forwarded",
      forwarded_sections: sections,
      forwarded_at: new Date().toISOString(),
      forwarded_by: currentUserId,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to forward request: ${error.message}`);

  await notifySecHeads({
    sections,
    type: "forwarded",
    title: "Request Forwarded to You",
    message: `"${req?.title || "A coverage request"}" has been forwarded to your section for staff assignment.`,
    requestId,
    createdBy: currentUserId,
  });

  return data;
}

export async function declineRequest(requestId, reason) {
  const [{ data: req }, currentUserId] = await Promise.all([
    supabase
      .from("coverage_requests")
      .select("title, requester_id")
      .eq("id", requestId)
      .single(),
    getCurrentUserId(),
  ]);

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status: "Declined",
      declined_reason: reason,
      declined_at: new Date().toISOString(),
      declined_by: currentUserId,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to decline request: ${error.message}`);

  await notifyClient({
    requesterId: req?.requester_id,
    type: "declined",
    title: "Coverage Request Declined",
    message: `Your request "${req?.title || "your coverage request"}" was declined. Reason: ${reason}`,
    requestId,
    createdBy: currentUserId,
  });

  return data;
}

export async function approveRequest(requestId, adminNotes = "") {
  const [{ data: req }, currentUserId] = await Promise.all([
    supabase
      .from("coverage_requests")
      .select("title, requester_id")
      .eq("id", requestId)
      .single(),
    getCurrentUserId(),
  ]);

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status: "Assigned",
      admin_notes: adminNotes,
      approved_at: new Date().toISOString(),
      approved_by: currentUserId,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) throw new Error(`Failed to approve request: ${error.message}`);

  const { error: assignErr } = await supabase
    .from("coverage_assignments")
    .update({ status: "Assigned" })
    .eq("request_id", requestId);

  if (assignErr)
    throw new Error(`Failed to assign assignments: ${assignErr.message}`);

  const requestTitle = req?.title || "a coverage request";

  await notifyClient({
    requesterId: req?.requester_id,
    type: "approved",
    title: "Coverage Request Approved",
    message: `Your request "${requestTitle}" has been approved! Please coordinate with the assigned staffers.`,
    requestId,
    createdBy: currentUserId,
  });

  await notifyAssignedStaff({
    requestId,
    type: "assigned",
    title: "You Have a Coverage Assignment",
    message: `You have been assigned to cover "${requestTitle}". Check your assignments for details.`,
    createdBy: currentUserId,
  });

  return data;
}
