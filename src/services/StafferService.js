// src/services/stafferService.js
import { supabase } from "../lib/supabaseClient";

let _supportsTrashedAtCache = null;

async function supportsProfilesTrashColumn() {
  if (_supportsTrashedAtCache !== null) return _supportsTrashedAtCache;

  const { error } = await supabase
    .from("profiles")
    .select("id, trashed_at")
    .limit(1);

  if (!error) {
    _supportsTrashedAtCache = true;
    return true;
  }

  // Postgres undefined_column. Treat as pre-migration schema and degrade gracefully.
  if (error.code === "42703") {
    _supportsTrashedAtCache = false;
    return false;
  }

  throw new Error(`Failed to inspect profiles schema: ${error.message}`);
}

export async function fetchAllStaffers() {
  const hasTrashColumn = await supportsProfilesTrashColumn();

  let query = supabase
    .from("profiles")
    .select(
      hasTrashColumn
        ? "id, full_name, role, division, section, position, designation, is_active, avatar_url, created_at, trashed_at"
        : "id, full_name, role, division, section, position, designation, is_active, avatar_url, created_at",
    )
    .in("role", ["admin", "sec_head", "staff"])
    .order("full_name", { ascending: true });

  if (hasTrashColumn) {
    query = query.is("trashed_at", null);
  }

  const { data, error } = await query;

  if (error) throw new Error(`Failed to fetch staffers: ${error.message}`);
  return data || [];
}

export async function createStafferAccount({
  full_name,
  email,
  password,
  role,
  division,
  section,
  position,
  designation,
}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { data, error } = await supabase.functions.invoke(
    "create-staff-account",
    {
      headers: {
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: {
        full_name,
        email,
        password,
        role,
        division: division || null,
        section: section || null,
        position: position || null,
        designation: designation || null,
      },
    },
  );

  if (error) throw new Error(`Failed to create account: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data?.userId;
}

export async function updateStafferProfile(
  userId,
  { full_name, role, division, section, position, designation },
) {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      role,
      division: division || null,
      section: section || null,
      position: position || null,
      designation: designation || null,
    })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return true;
}

export async function toggleStafferStatus(userId, isActive) {
  const hasTrashColumn = await supportsProfilesTrashColumn();

  let query = supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (hasTrashColumn) {
    query = query.is("trashed_at", null);
  }

  const { error } = await query;

  if (error) throw new Error(`Failed to update status: ${error.message}`);
  return true;
}

export async function deleteStafferAccount(userId) {
  const { error } = await supabase.from("profiles").delete().eq("id", userId);

  if (error) throw new Error(`Failed to delete account: ${error.message}`);
  return true;
}

export async function fetchTrashedStaffers() {
  const hasTrashColumn = await supportsProfilesTrashColumn();
  if (!hasTrashColumn) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, division, section, position, designation, is_active, avatar_url, created_at, trashed_at",
    )
    .in("role", ["admin", "sec_head", "staff"])
    .not("trashed_at", "is", null)
    .order("trashed_at", { ascending: false });

  if (error)
    throw new Error(`Failed to fetch trashed staffers: ${error.message}`);
  return data || [];
}

export async function moveStaffersToTrash(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return true;

  const hasTrashColumn = await supportsProfilesTrashColumn();

  const { error } = hasTrashColumn
    ? await supabase
        .from("profiles")
        .update({ trashed_at: new Date().toISOString(), is_active: false })
        .in("id", userIds)
    : await supabase.from("profiles").delete().in("id", userIds);

  if (error)
    throw new Error(`Failed to move staffers to trash: ${error.message}`);
  return true;
}

export async function restoreTrashedStaffers(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return true;

  const hasTrashColumn = await supportsProfilesTrashColumn();
  if (!hasTrashColumn) return true;

  const { error } = await supabase
    .from("profiles")
    .update({ trashed_at: null })
    .in("id", userIds);

  if (error)
    throw new Error(`Failed to restore trashed staffers: ${error.message}`);
  return true;
}
