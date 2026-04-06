import React from "react";
import { supabase } from "../../lib/supabaseClient";
import TrashManagementBase from "../common/request-management/TrashManagementBase";

const sectionHeadTrashAdapter = {
  init: async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { userId: null, section: null };

    const { data, error } = await supabase
      .from("profiles")
      .select("section")
      .eq("id", user.id)
      .single();
    if (error) throw error;

    return { userId: user.id, section: data?.section || null };
  },
  fetchTrashed: async ({ userId, section }) => {
    if (!userId || !section) return [];

    const { data: stateRows, error: stateError } = await supabase
      .from("request_user_state")
      .select("request_id, trashed_at")
      .eq("user_id", userId)
      .not("trashed_at", "is", null)
      .is("purged_at", null);
    if (stateError) throw stateError;

    const trashedMap = new Map((stateRows || []).map((row) => [row.request_id, row.trashed_at]));
    const trashedIds = [...trashedMap.keys()];
    if (!trashedIds.length) return [];

    const { data, error } = await supabase
      .from("coverage_requests")
      .select("id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id")
      .in("id", trashedIds)
      .contains("forwarded_sections", [section]);
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
  deleteForever: async (ids, { userId }) => {
    const ts = new Date().toISOString();
    const rows = ids.map((id) => ({ user_id: userId, request_id: id, purged_at: ts }));

    const { error } = await supabase
      .from("request_user_state")
      .upsert(rows, { onConflict: "user_id,request_id" });
    if (error) throw error;
  },
};

export default function TrashManagement(props) {
  return <TrashManagementBase {...props} adapter={sectionHeadTrashAdapter} />;
}
