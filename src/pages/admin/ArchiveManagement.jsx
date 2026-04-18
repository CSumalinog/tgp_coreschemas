import React from "react";
import { supabase } from "../../lib/supabaseClient";
import ArchiveManagementBase from "../common/request-management/ArchiveManagementBase";

async function getAdminUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

const adminArchiveAdapter = {
  init: async () => {
    const userId = await getAdminUserId();
    return { userId };
  },
  fetchArchived: async ({ userId }) => {
    if (!userId) return [];
    const { data: stateRows, error: stateError } = await supabase
      .from("request_user_state")
      .select("request_id, archived_at")
      .eq("user_id", userId)
      .not("archived_at", "is", null)
      .is("trashed_at", null)
      .is("purged_at", null);
    if (stateError) throw stateError;
    const archivedMap = new Map(
      (stateRows || []).map((r) => [r.request_id, r.archived_at]),
    );
    const archivedIds = [...archivedMap.keys()];
    if (!archivedIds.length) return [];
    const { data, error } = await supabase
      .from("coverage_requests")
      .select(
        "id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id",
      )
      .in("id", archivedIds);
    if (error) throw error;
    return (data || [])
      .map((row) => ({ ...row, archived_at: archivedMap.get(row.id) }))
      .sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at));
  },
  fetchArchivable: async ({ userId }) => {
    if (!userId) return [];
    const { data: stateRows } = await supabase
      .from("request_user_state")
      .select("request_id")
      .eq("user_id", userId);
    const hiddenIds = (stateRows || []).map((r) => r.request_id);
    let query = supabase
      .from("coverage_requests")
      .select(
        "id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id",
      )
      .in("status", ["Completed", "Declined", "Cancelled"])
      .order("submitted_at", { ascending: false });
    if (hiddenIds.length)
      query = query.not("id", "in", `(${hiddenIds.join(",")})`);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },
  archive: async (ids, { userId }) => {
    const ts = new Date().toISOString();
    const rows = ids.map((id) => ({
      user_id: userId,
      request_id: id,
      archived_at: ts,
      trashed_at: null,
      purged_at: null,
    }));
    const { error } = await supabase
      .from("request_user_state")
      .upsert(rows, { onConflict: "user_id,request_id" });
    if (error) throw error;
  },
  unarchive: async (ids, { userId }) => {
    const { error } = await supabase
      .from("request_user_state")
      .delete()
      .eq("user_id", userId)
      .in("request_id", ids);
    if (error) throw error;
  },
  moveToTrash: async (ids, { userId }) => {
    const ts = new Date().toISOString();
    const rows = ids.map((id) => ({
      user_id: userId,
      request_id: id,
      archived_at: null,
      trashed_at: ts,
      purged_at: null,
    }));
    const { error } = await supabase
      .from("request_user_state")
      .upsert(rows, { onConflict: "user_id,request_id" });
    if (error) throw error;
  },
};

export default function ArchiveManagement(props) {
  return <ArchiveManagementBase {...props} adapter={adminArchiveAdapter} />;
}
