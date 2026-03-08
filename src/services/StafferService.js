// src/services/stafferService.js
import { supabase } from "../lib/supabaseClient";

export async function fetchAllStaffers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, division, section, position, is_active, avatar_url, created_at")
    .in("role", ["admin", "sec_head", "staff"])
    .order("full_name", { ascending: true });

  if (error) throw new Error(`Failed to fetch staffers: ${error.message}`);
  return data || [];
}

export async function createStafferAccount({
  full_name, email, password, role, division, section,
}) {
  const { data, error } = await supabase.functions.invoke("create-staff-account", {
    body: {
      full_name, email, password, role,
      division: division || null,
      section:  section  || null,
    },
  });

  if (error) throw new Error(`Failed to create account: ${error.message}`);
  if (data?.error) throw new Error(data.error);
  return data?.userId;
}

export async function updateStafferProfile(userId, { full_name, role, division, section }) {
  const { error } = await supabase
    .from("profiles")
    .update({ full_name, role, division: division || null, section: section || null })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return true;
}

export async function toggleStafferStatus(userId, isActive) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update status: ${error.message}`);
  return true;
}

export async function deleteStafferAccount(userId) {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (error) throw new Error(`Failed to delete account: ${error.message}`);
  return true;
}