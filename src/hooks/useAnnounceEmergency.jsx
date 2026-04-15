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
  const handleAnnounce = async ({ reason, proofFile = null }) => {
    if (!supabase || !currentUser || !announceAssignment) {
      setAnnounceError("Missing required context.");
      return;
    }
    if (!String(reason || "").trim()) {
      setAnnounceError("Please provide a valid reason.");
      return;
    }
    if (!proofFile) {
      setAnnounceError("Proof is required for emergency announcements.");
      return;
    }
    setAnnounceLoading(true);
    setAnnounceError("");
    try {
      const now = new Date().toISOString();
      const request = announceAssignment.request;
      let proofPath = null;

      if (announceAssignment.status === "Cancelled") {
        throw new Error("This assignment has already been cancelled.");
      }

      if (proofFile) {
        const timestamp = Date.now();
        const sanitizedName = String(proofFile.name || "proof")
          .replace(/\s+/g, "_")
          .replace(/[^a-zA-Z0-9._-]/g, "");
        const filePath = `emergency_proofs/${currentUser.id}/${timestamp}_${sanitizedName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("coverage-files")
          .upload(filePath, proofFile, {
            cacheControl: "3600",
            upsert: false,
          });
        if (uploadError) {
          throw new Error(`Proof upload failed: ${uploadError.message}`);
        }
        proofPath = uploadData?.path || null;
      }

      const normalizedReason = String(reason || "").trim();
      const reasonWithEmergencyPrefix = `Emergency announced: ${normalizedReason}`;
      const cancellationReason = proofPath
        ? `${reasonWithEmergencyPrefix} (Proof: ${proofPath})`
        : reasonWithEmergencyPrefix;

      const notifySections =
        Array.isArray(request?.forwarded_sections) && request.forwarded_sections.length > 0
          ? request.forwarded_sections
          : [announceAssignment.section].filter(Boolean);
      
      const { error: updateError } = await supabase
        .from("coverage_assignments")
        .update({
          status: "Cancelled",
          completed_at: now,
          cancelled_at: now,
          cancellation_reason: cancellationReason,
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
        .in("section", notifySections)
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
          message: `${currentUser.full_name} announced an emergency for "${request?.title}" on ${eventDate}. Reason: ${normalizedReason}. Reassignment required.${proofPath ? " Proof attached." : ""}`,
          target_payload: proofPath ? { proof_path: proofPath } : null,
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
          message: `${currentUser.full_name} announced an emergency for "${request?.title}" on ${eventDate}. Please reassign coverage. Reason: ${normalizedReason}${proofPath ? " (proof attached)" : ""}`,
          target_path: "/sec_head/coverage-management/assignment",
          target_payload: proofPath ? { proof_path: proofPath } : null,
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
