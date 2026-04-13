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
 * @param {string} [params.reason] - Reason for reassignment
 * @returns {Promise<Object>} Result of the operation
 */
export async function reassignAfterNoShow({ requestId, assignmentId, newStaffId, section, reason }) {
  const now = new Date().toISOString();

  // 1. Mark the previous assignment as No Show (if not already)
  const { error: noShowError } = await supabase
    .from("coverage_assignments")
    .update({
      status: "No Show",
      completed_at: now,
      cancellation_reason: reason || "No Show",
      updated_at: now,
    })
    .eq("id", assignmentId);
  if (noShowError) return { error: noShowError };

  // 2. Create a new assignment for the same request
  const { data: newAssignment, error: assignError } = await supabase
    .from("coverage_assignments")
    .insert([
      {
        request_id: requestId,
        assigned_to: newStaffId,
        section,
        status: "Assigned",
        assigned_at: now,
        is_reassigned: true,
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
