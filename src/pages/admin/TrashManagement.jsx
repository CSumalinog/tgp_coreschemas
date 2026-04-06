import React from "react";
import { supabase } from "../../lib/supabaseClient";
import TrashManagementBase from "../common/request-management/TrashManagementBase";

const adminTrashAdapter = {
  fetchTrashed: async () => {
    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, status, event_date, is_multiday, event_days, submitted_at, trashed_at, requester_id")
      .not("trashed_at", "is", null)
      .order("trashed_at", { ascending: false });
    if (error) throw error;
    return data || [];
  },
  restore: async (ids) => {
    const { error } = await supabase
      .from("coverage_requests")
      .update({ trashed_at: null, archived_at: null })
      .in("id", ids);
    if (error) throw error;
  },
  deleteForever: async (ids) => {
    const { error } = await supabase.rpc("admin_delete_requests", {
      request_ids: ids,
    });
    if (error) throw error;
  },
};

export default function TrashManagement(props) {
  return <TrashManagementBase {...props} adapter={adminTrashAdapter} />;
}
