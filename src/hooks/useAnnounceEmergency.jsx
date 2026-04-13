import React, { useState } from "react";
import AnnounceEmergencyDialog from "../components/regular_staff/AnnounceEmergencyDialog";

export function useAnnounceEmergency({ supabase, currentUser }) {
  const [announceOpen, setAnnounceOpen] = useState(false);
  const [announceAssignment, setAnnounceAssignment] = useState(null);
  const [announceLoading, setAnnounceLoading] = useState(false);
  const [announceError, setAnnounceError] = useState("");

  const openAnnounce = (assignment) => {
    setAnnounceAssignment(assignment);
    setAnnounceOpen(true);
  };
  const closeAnnounce = () => {
    setAnnounceOpen(false);
    setAnnounceAssignment(null);
    setAnnounceError("");
  };
  const handleAnnounce = async (reason) => {
    if (!supabase || !currentUser || !announceAssignment) {
      setAnnounceError("Missing required context.");
      return;
    }
    setAnnounceLoading(true);
    setAnnounceError("");
    try {
      const now = new Date().toISOString();
      const request = announceAssignment.request;
      
      const { error: updateError } = await supabase
        .from("coverage_assignments")
        .update({
          status: "Cancelled",
          completed_at: now,
          cancellation_reason: reason,
          updated_at: now,
        })
        .eq("id", announceAssignment.id);
      if (updateError) throw updateError;

      const { data: admins } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .eq("is_active", true);

      const { data: secHeads } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "sec_head")
        .eq("section", announceAssignment.section)
        .eq("is_active", true);

      const eventDate = request?.event_date 
        ? new Date(request.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
        : "TBD";
      
      const notifications = [];
      
      (admins || []).forEach((admin) => {
        notifications.push({
          user_id: admin.id,
          recipient_id: admin.id,
          recipient_role: "admin",
          request_id: request?.id,
          type: "emergency_announcement",
          title: "Staff Emergency Announcement",
          message: `${currentUser.full_name} announced an emergency for "${request?.title}" on ${eventDate}. Reason: ${reason}. Reassignment required.`,
          created_at: now,
        });
      });

      (secHeads || []).forEach((sh) => {
        notifications.push({
          user_id: sh.id,
          recipient_id: sh.id,
          recipient_role: "sec_head",
          request_id: request?.id,
          type: "emergency_announcement",
          title: "Emergency — Reassignment Required",
          message: `${currentUser.full_name} announced an emergency for "${request?.title}" on ${eventDate}. Please reassign coverage. Reason: ${reason}`,
          target_path: "/sec_head/coverage-management/assignment",
          created_at: now,
        });
      });

      if (notifications.length > 0) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert(notifications);
        if (notifError) console.error("Notification error:", notifError);
      }

      closeAnnounce();
    } catch (err) {
      setAnnounceError(err.message || "Failed to announce emergency.");
    } finally {
      setAnnounceLoading(false);
    }
  };

  const AnnounceEmergencyDialogWrapper = () => (
    <AnnounceEmergencyDialog
      open={announceOpen}
      onClose={closeAnnounce}
      onAnnounce={handleAnnounce}
      loading={announceLoading}
      error={announceError}
    />
  );

  return { openAnnounce, AnnounceEmergencyDialogWrapper };
}
