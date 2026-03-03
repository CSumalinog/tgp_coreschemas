import { supabase } from "../lib/supabaseClient";

/**
 * Fetch all client types (Office, Department, Organization)
 */
export async function fetchClientTypes() {
  const { data, error } = await supabase.from("client_types").select("*");

  if (error) {
    console.error(error);
    return [];
  }

  return data || [];
}

/**
 * Fetch entities by client type id
 */
export async function fetchEntitiesByType(clientTypeId) {
  if (!clientTypeId) return [];

  const { data, error } = await supabase
    .from("client_entities") // ✅ FIXED TABLE NAME
    .select("id, name")
    .eq("client_type_id", clientTypeId)
    .order("name", { ascending: true });

  if (error) {
    console.error(
      `Error fetching entities for client type ${clientTypeId}:`,
      error.message,
    );
    return [];
  }

  return data || [];
}
