// src/services/adminRequestService.js
import { supabase } from "../lib/supabaseClient";
import {
  notifyClient,
  notifySecHeads,
  notifySpecificStaff,
} from "./NotificationService";

/**
 * Fetch all coverage requests for Admin (all statuses except Draft).
 * Excludes requests the admin has personally archived or trashed (per-user state).
 */
export async function fetchAllRequests() {
  const { data: { user } } = await supabase.auth.getUser();

  // Get this admin's personal hidden request IDs
  let hiddenIds = [];
  if (user?.id) {
    const { data: stateRows } = await supabase
      .from("request_user_state")
      .select("request_id")
      .eq("user_id", user.id);
    hiddenIds = (stateRows || []).map((r) => r.request_id);
  }

  let query = supabase
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
    .order("submitted_at", { ascending: false });

  if (hiddenIds.length) {
    query = query.not("id", "in", `(${hiddenIds.join(",")})`);
  }

  const { data, error } = await query;

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
      .select("title, requester_id, forwarded_sections")
      .eq("id", requestId)
      .single(),
    getCurrentUserId(),
  ]);

  const { data, error } = await supabase
    .from("coverage_requests")
    .update({
      status: "Approved",
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
    // coverage_assignments_status_check allows the legacy "Approved" value;
    // request-level status semantics still use Assigned/Approved compatibility.
    .update({ status: "Approved" })
    .eq("request_id", requestId)
    .not("status", "in", "(Completed,Cancelled)");

  if (assignErr)
    throw new Error(`Failed to assign assignments: ${assignErr.message}`);

  const requestTitle = req?.title || "a coverage request";

  // Fetch admin profile for use in sec-head notification message.
  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("full_name, designation")
    .eq("id", currentUserId)
    .single();

  const adminLabel = adminProfile
    ? `${adminProfile.full_name}${adminProfile.designation ? ` - ${adminProfile.designation}` : ""}`
    : "Admin";

  let clientNotif = await notifyClient({
    requesterId: req?.requester_id,
    type: "approved",
    title: "Coverage Request Approved",
    message: `Your request "${requestTitle}" has been approved! Please coordinate with the assigned staffers.`,
    requestId,
    createdBy: currentUserId,
  });

  // Fallback for environments where "approved" may be restricted by DB checks.
  if (!clientNotif?.ok) {
    console.warn("[approveRequest] notifyClient(approved) failed, retrying with for_approval", clientNotif?.error?.message || clientNotif?.reason);
    clientNotif = await notifyClient({
      requesterId: req?.requester_id,
      type: "for_approval",
      title: "Coverage Request Update",
      message: `Your request "${requestTitle}" has been approved and finalized. Please coordinate with the assigned staffers.`,
      requestId,
      createdBy: currentUserId,
    });
  }

  if (Array.isArray(req?.forwarded_sections) && req.forwarded_sections.length > 0) {
    await notifySecHeads({
      sections: req.forwarded_sections,
      type: "approved",
      title: "Forwarded Request Approved",
      message: `${adminLabel} approved "${requestTitle}." Assignments are finalized.`,
      requestId,
      createdBy: currentUserId,
    });
  }

  const { data: assignmentRows } = await supabase
    .from("coverage_assignments")
    .select("assigned_to, assigned_by")
    .eq("request_id", requestId);

  const assignerIds = [
    ...new Set((assignmentRows || []).map((a) => a.assigned_by).filter(Boolean)),
  ];

  const assignerMap = {};
  if (assignerIds.length > 0) {
    const { data: assigners } = await supabase
      .from("profiles")
      .select("id, full_name, position, designation, section")
      .in("id", assignerIds);

    (assigners || []).forEach((p) => {
      assignerMap[p.id] = p;
    });
  }

  const staffToAssigner = new Map();
  (assignmentRows || []).forEach((row) => {
    if (!row.assigned_to || staffToAssigner.has(row.assigned_to)) return;
    staffToAssigner.set(row.assigned_to, row.assigned_by || null);
  });

  await Promise.all(
    [...staffToAssigner.entries()].map(async ([staffId, assignerId]) => {
      const assigner = assignerMap[assignerId] || null;
      const assignerName = assigner?.full_name || "Your section head";
      const assignerDesignation =
        assigner?.designation ||
        assigner?.position ||
        (assigner?.section ? `${assigner.section} Section Head` : "Section Head");

      let staffNotif = await notifySpecificStaff({
        staffIds: [staffId],
        requestId,
        type: "assigned",
        title: "Coverage Assignment Finalized",
        message: `${assignerName} - ${assignerDesignation}, assigned you to cover "${requestTitle}". Admin approval has finalized this assignment.`,
        // Keep actor avatar consistent with the message author.
        // For assignment-finalized notices, show the original section head
        // who assigned the staffer, not the admin who clicked Approve.
        createdBy: assignerId || currentUserId,
      });

      // Fallback for environments where "assigned" may be restricted by DB checks.
      if (!staffNotif?.ok) {
        console.warn("[approveRequest] notifySpecificStaff(assigned) failed, retrying with for_approval", staffNotif?.error?.message || staffNotif?.reason);
        staffNotif = await notifySpecificStaff({
          staffIds: [staffId],
          requestId,
          type: "for_approval",
          title: "Coverage Assignment Finalized",
          message: `${assignerName} - ${assignerDesignation}, assigned you to cover "${requestTitle}". Admin approval has finalized this assignment.`,
          createdBy: assignerId || currentUserId,
        });
      }

      return staffNotif;
    }),
  );

  return data;
}
