// src/services/ReassignmentService.js
// Handles reassignment logic for No Show and emergency coverage scenarios

import { supabase } from "../lib/supabaseClient";

/**
 * Reassigns staff for a given coverage request after a No Show or emergency.
 * - Cancels the previous assignment
 * - Creates a new assignment for the selected staff
 * - Optionally notifies section heads and staff
 * @param {Object} params
 * @param {string} params.requestId - The coverage request ID
 * @param {string} params.assignmentId - The assignment ID to mark as No Show
 * @param {string} params.newStaffId - The user ID of the new staff to assign
 * @param {string} params.section - Section for the assignment
 * @param {string} [params.assignedBy] - User ID of sec head/admin doing the reassignment
 * @param {("announced-emergency"|"unannounced-no-show")} [params.triggerType]
 * @param {string} [params.reason] - Reason for reassignment
 * @returns {Promise<Object>} Result of the operation
 */
export async function reassignAfterNoShow({
  requestId,
  assignmentId,
  newStaffId,
  section,
  assignedBy,
  triggerType = "unannounced-no-show",
  reason,
}) {
  const now = new Date().toISOString();

  const { data: originalAssignment, error: fetchOriginalErr } = await supabase
    .from("coverage_assignments")
    .select(
      "id, request_id, section, service_key, assignment_date, from_time, to_time, assigned_by, cancellation_reason, status",
    )
    .eq("id", assignmentId)
    .single();
  if (fetchOriginalErr) return { error: fetchOriginalErr };

  const effectiveSection = section || originalAssignment?.section;
  const effectiveRequestId = requestId || originalAssignment?.request_id;
  const existingReason = originalAssignment?.cancellation_reason;
  const isAnnouncedEmergency = triggerType === "announced-emergency";

  // 1. Mark the previous assignment as replaced by no-show/emergency context
  const previousUpdate = {
    status: isAnnouncedEmergency ? "Cancelled" : "No Show",
    cancellation_reason:
      reason ||
      existingReason ||
      (isAnnouncedEmergency ? "Emergency announced" : "No Show"),
    updated_at: now,
  };
  if (!isAnnouncedEmergency) {
    previousUpdate.completed_at = now;
  }

  const { error: previousAssignErr } = await supabase
    .from("coverage_assignments")
    .update(previousUpdate)
    .eq("id", assignmentId);
  if (previousAssignErr) return { error: previousAssignErr };

  // 2. Create replacement assignment with the same assignment slot metadata
  const { data: newAssignment, error: assignError } = await supabase
    .from("coverage_assignments")
    .insert([
      {
        request_id: effectiveRequestId,
        assigned_to: newStaffId,
        assigned_by: assignedBy || originalAssignment?.assigned_by || null,
        section: effectiveSection,
        service_key: originalAssignment?.service_key || null,
        assignment_date: originalAssignment?.assignment_date || null,
        from_time: originalAssignment?.from_time || null,
        to_time: originalAssignment?.to_time || null,
        status: "Assigned",
        assigned_at: now,
        is_reassigned: true,
        cancellation_reason: null,
        created_at: now,
        updated_at: now,
      },
    ])
    .select()
    .single();
  if (assignError) return { error: assignError };

  // 3. (Optional) Notify section heads and new staff here
  // ...

  return { success: true, newAssignment };
}
