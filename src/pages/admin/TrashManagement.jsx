import React from "react";
import { supabase } from "../../lib/supabaseClient";
import TrashManagementBase from "../common/request-management/TrashManagementBase";

async function getAdminUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const adminTrashAdapter = {
  init: async () => {
    const userId = await getAdminUserId();
    return { userId };
  },
  fetchTrashed: async ({ userId }) => {
    if (!userId) return [];
    const { data: stateRows, error: stateError } = await supabase
      .from("request_user_state")
      .select("request_id, trashed_at")
      .eq("user_id", userId)
      .not("trashed_at", "is", null)
      .is("purged_at", null);
    if (stateError) throw stateError;
    const trashedMap = new Map(
      (stateRows || []).map((r) => [r.request_id, r.trashed_at]),
    );
    const trashedIds = [...trashedMap.keys()];
    if (!trashedIds.length) return [];
    const { data, error } = await supabase
      .from("coverage_requests")
      .select(
        "id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id",
      )
      .in("id", trashedIds);
    if (error) throw error;
    return (data || [])
      .map((row) => ({ ...row, trashed_at: trashedMap.get(row.id) }))
      .sort((a, b) => new Date(b.trashed_at) - new Date(a.trashed_at));
  },
  restore: async (ids, { userId }) => {
    const { error } = await supabase
      .from("request_user_state")
      .delete()
      .eq("user_id", userId)
      .in("request_id", ids);
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
