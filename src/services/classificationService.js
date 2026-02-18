import { supabase } from "../services/supabase";

/**
 * Fetch all client types (Office, Department, Organization)
 * @returns array of objects [{id, name}]
 */
export async function fetchClientTypes() {
  const { data, error } = await supabase
    .from("client_types")
    .select("id, name")
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching client types:", error.message);
    return [];
  }

  return data; // returns [{id, name}, ...]
}

/**
 * Fetch entities by client type id
 * @param {string} clientTypeId - UUID of the client type
 * @returns array of objects [{id, name}]
 */
export async function fetchEntitiesByType(clientTypeId) {
  if (!clientTypeId) return [];

  const { data, error } = await supabase
    .from("classifications")
    .select("id, name")
    .eq("client_type_id", clientTypeId)
    .order("name", { ascending: true });

  if (error) {
    console.error(
      `Error fetching entities for client type ${clientTypeId}:`,
      error.message
    );
    return [];
  }

  return data; // returns [{id, name}, ...]
}
