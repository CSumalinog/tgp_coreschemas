import React from "react";
import { supabase } from "../../../lib/supabaseClient";
import ArchiveManagementBase from "./ArchiveManagementBase";
import TrashManagementBase from "./TrashManagementBase";

const COMPLETED_STATUSES = ["Completed", "Declined", "Cancelled"];

async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user || null;
}

async function getSectionForUser(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select("section")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return data?.section || null;
}

async function getAssignedRequestIds(userId) {
  const { data, error } = await supabase
    .from("coverage_assignments")
    .select("request_id")
    .eq("assigned_to", userId);
  if (error) throw error;
  return [...new Set((data || []).map((row) => row.request_id))];
}

const adminArchiveAdapter = {
  init: async () => {
    const user = await getCurrentUser();
    return { userId: user?.id ?? null };
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
      .map((r) => ({ ...r, archived_at: archivedMap.get(r.id) }))
      .sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at));
  },
  fetchArchivable: async ({ userId }) => {
    const { data: stateRows } = userId
      ? await supabase
          .from("request_user_state")
          .select("request_id")
          .eq("user_id", userId)
      : { data: [] };
    const hiddenIds = (stateRows || []).map((r) => r.request_id);
    let query = supabase
      .from("coverage_requests")
      .select(
        "id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id",
      )
      .in("status", COMPLETED_STATUSES)
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

const adminTrashAdapter = {
  init: async () => {
    const user = await getCurrentUser();
    return { userId: user?.id ?? null };
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
      .map((r) => ({ ...r, trashed_at: trashedMap.get(r.id) }))
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

const sectionHeadArchiveAdapter = {
  init: async () => {
    const user = await getCurrentUser();
    if (!user) return { userId: null, section: null };

    const section = await getSectionForUser(user.id);
    return { userId: user.id, section };
  },
  fetchArchived: async ({ userId, section }) => {
    if (!userId || !section) return [];

    const { data: stateRows, error: stateError } = await supabase
      .from("request_user_state")
      .select("request_id, archived_at")
      .eq("user_id", userId)
      .not("archived_at", "is", null)
      .is("trashed_at", null)
      .is("purged_at", null);
    if (stateError) throw stateError;

    const archivedMap = new Map(
      (stateRows || []).map((row) => [row.request_id, row.archived_at]),
    );
    const archivedIds = [...archivedMap.keys()];
    if (!archivedIds.length) return [];

    const { data, error } = await supabase
      .from("coverage_requests")
      .select(
        "id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id",
      )
      .in("id", archivedIds)
      .contains("forwarded_sections", [section]);
    if (error) throw error;

    return (data || [])
      .map((row) => ({ ...row, archived_at: archivedMap.get(row.id) }))
      .sort((a, b) => new Date(b.archived_at) - new Date(a.archived_at));
  },
  fetchArchivable: async ({ userId, section }) => {
    if (!userId || !section) return [];

    const { data: stateRows, error: stateError } = await supabase
      .from("request_user_state")
      .select("request_id")
      .eq("user_id", userId);
    if (stateError) throw stateError;

    const hiddenIds = (stateRows || []).map((row) => row.request_id);
    let query = supabase
      .from("coverage_requests")
      .select(
        "id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id",
      )
      .in("status", COMPLETED_STATUSES)
      .is("archived_at", null)
      .is("trashed_at", null)
      .contains("forwarded_sections", [section])
      .order("submitted_at", { ascending: false });

    if (hiddenIds.length) {
      query = query.not("id", "in", `(${hiddenIds.join(",")})`);
    }

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

const sectionHeadTrashAdapter = {
  init: async () => {
    const user = await getCurrentUser();
    if (!user) return { userId: null, section: null };

    const section = await getSectionForUser(user.id);
    return { userId: user.id, section };
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

    const trashedMap = new Map(
      (stateRows || []).map((row) => [row.request_id, row.trashed_at]),
    );
    const trashedIds = [...trashedMap.keys()];
    if (!trashedIds.length) return [];

    const { data, error } = await supabase
      .from("coverage_requests")
      .select(
        "id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id",
      )
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
    const rows = ids.map((id) => ({
      user_id: userId,
      request_id: id,
      purged_at: ts,
    }));

    const { error } = await supabase
      .from("request_user_state")
      .upsert(rows, { onConflict: "user_id,request_id" });
    if (error) throw error;
  },
};

const regularStaffArchiveAdapter = {
  init: async () => {
    const user = await getCurrentUser();
    if (!user) return { userId: null, requestIds: [] };

    const requestIds = await getAssignedRequestIds(user.id);
    return { userId: user.id, requestIds };
  },
  fetchArchived: async ({ userId, requestIds }) => {
    if (!userId || !requestIds.length) return [];

    const { data: stateRows, error: stateError } = await supabase
      .from("request_user_state")
      .select("request_id, archived_at")
      .eq("user_id", userId)
      .not("archived_at", "is", null)
      .is("trashed_at", null)
      .is("purged_at", null);
    if (stateError) throw stateError;

    const archivedMap = new Map(
      (stateRows || []).map((row) => [row.request_id, row.archived_at]),
    );
    const archivedIds = [...archivedMap.keys()].filter((id) =>
      requestIds.includes(id),
    );
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
  fetchArchivable: async ({ userId, requestIds }) => {
    if (!userId || !requestIds.length) return [];

    const { data: stateRows, error: stateError } = await supabase
      .from("request_user_state")
      .select("request_id")
      .eq("user_id", userId);
    if (stateError) throw stateError;

    const hiddenIds = new Set((stateRows || []).map((row) => row.request_id));
    const visibleIds = requestIds.filter((id) => !hiddenIds.has(id));
    if (!visibleIds.length) return [];

    const { data, error } = await supabase
      .from("coverage_requests")
      .select(
        "id, title, status, event_date, is_multiday, event_days, submitted_at, requester_id",
      )
      .in("status", COMPLETED_STATUSES)
      .is("archived_at", null)
      .is("trashed_at", null)
      .in("id", visibleIds)
      .order("submitted_at", { ascending: false });
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

const regularStaffTrashAdapter = {
  init: async () => {
    const user = await getCurrentUser();
    if (!user) return { userId: null, requestIds: [] };

    const requestIds = await getAssignedRequestIds(user.id);
    return { userId: user.id, requestIds };
  },
  fetchTrashed: async ({ userId, requestIds }) => {
    if (!userId || !requestIds.length) return [];

    const { data: stateRows, error: stateError } = await supabase
      .from("request_user_state")
      .select("request_id, trashed_at")
      .eq("user_id", userId)
      .not("trashed_at", "is", null)
      .is("purged_at", null);
    if (stateError) throw stateError;

    const trashedMap = new Map(
      (stateRows || []).map((row) => [row.request_id, row.trashed_at]),
    );
    const trashedIds = [...trashedMap.keys()].filter((id) =>
      requestIds.includes(id),
    );
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
  deleteForever: async (ids, { userId }) => {
    const ts = new Date().toISOString();
    const rows = ids.map((id) => ({
      user_id: userId,
      request_id: id,
      purged_at: ts,
    }));

    const { error } = await supabase
      .from("request_user_state")
      .upsert(rows, { onConflict: "user_id,request_id" });
    if (error) throw error;
  },
};

const ADAPTERS = {
  admin: {
    archive: adminArchiveAdapter,
    trash: adminTrashAdapter,
  },
  sec_head: {
    archive: sectionHeadArchiveAdapter,
    trash: sectionHeadTrashAdapter,
  },
  staff: {
    archive: regularStaffArchiveAdapter,
    trash: regularStaffTrashAdapter,
  },
};

function getAdapter(role, type) {
  const adapter = ADAPTERS[role]?.[type];
  if (!adapter) {
    throw new Error(`Unsupported role '${role}' for ${type} management.`);
  }
  return adapter;
}

export function RoleArchiveManagement({ role, ...props }) {
  return (
    <ArchiveManagementBase {...props} adapter={getAdapter(role, "archive")} />
  );
}

export function RoleTrashManagement({ role, ...props }) {
  return <TrashManagementBase {...props} adapter={getAdapter(role, "trash")} />;
}
