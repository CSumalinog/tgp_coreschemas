import React from "react";
import { supabase } from "../../lib/supabaseClient";
import ArchiveManagementBase from "../common/request-management/ArchiveManagementBase";

const adminArchiveAdapter = {
  fetchArchived: async () => {
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, status, event_date, is_multiday, event_days, submitted_at, archived_at, requester_id")
      .not("archived_at", "is", null)
      .is("trashed_at", null)
      .order("archived_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  fetchArchivable: async () => {
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id")
      .in("status", ["Completed", "Declined", "Cancelled"])
      .is("archived_at", null)
      .is("trashed_at", null)
      .order("submitted_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  archive: async (ids) => {
    const { error } = await supabase
      .from("coverage_requests")
      .update({ archived_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw error;
  },
  unarchive: async (ids) => {
    const { error } = await supabase
      .from("coverage_requests")
      .update({ archived_at: null })
      .in("id", ids);
    if (error) throw error;
  },
  moveToTrash: async (ids) => {
    const { error } = await supabase
      .from("coverage_requests")
      .update({ trashed_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw error;
  },
};

export default function ArchiveManagement(props) {
  return <ArchiveManagementBase {...props} adapter={adminArchiveAdapter} />;
}
