// src/services/stafferService.js
import { supabase } from "../lib/supabaseClient";

/**
 * Fetch all TGP members (non-client profiles)
 */
export async function fetchAllStaffers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, division, section, is_active, created_at")
    .in("role", ["admin", "sec_head", "staff"])
    .order("full_name", { ascending: true });

  if (error) throw new Error(`Failed to fetch staffers: ${error.message}`);
  return data || [];
}

/**
 * Create a new TGP member account
 * Uses Supabase Admin API via edge function workaround —
 * since we can't call admin.createUser from the frontend,
 * we use signUp and immediately update the profile.
 */
export async function createStafferAccount({ full_name, email, password, role, division, section }) {
  // 1. Create auth user via signUp
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name },
    },
  });

  if (authError) throw new Error(`Failed to create account: ${authError.message}`);

  const userId = authData.user?.id;
  if (!userId) throw new Error("User creation failed — no user ID returned.");

  // 2. Update the profile that was auto-created by the trigger
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name,
      role,
      division: division || null,
      section: section || null,
      is_active: true,
    })
    .eq("id", userId);

  if (profileError) throw new Error(`Failed to update profile: ${profileError.message}`);

  // 3. Send credentials email via Edge Function
  await supabase.functions.invoke("send-credentials", {
    body: { email, full_name, password },
  });

  return userId;
}

/**
 * Update an existing staffer's profile
 */
export async function updateStafferProfile(userId, { full_name, role, division, section }) {
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      role,
      division: division || null,
      section: section || null,
    })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update profile: ${error.message}`);
  return true;
}

/**
 * Toggle active/inactive status
 */
export async function toggleStafferStatus(userId, isActive) {
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) throw new Error(`Failed to update status: ${error.message}`);
  return true;
}

/**
 * Delete a staffer account permanently (for graduates)
 * Note: This only deletes the profile row.
 * Full auth deletion requires a Supabase Edge Function.
 */
export async function deleteStafferAccount(userId) {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", userId);

  if (error) throw new Error(`Failed to delete account: ${error.message}`);
  return true;
}