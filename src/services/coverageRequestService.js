import { supabase } from "../supabaseClient";

/**
 * Submit a coverage request
 * @param {Object} requestData
 * @returns inserted row
 */
export async function submitCoverageRequest(requestData) {
  let fileUrl = null;

  // Handle file upload if provided
  if (requestData.file) {
    const { data, error } = await supabase.storage
      .from("coverage-files")
      .upload(`program_flows/${requestData.file.name}`, requestData.file, {
        cacheControl: "3600",
        upsert: true,
      });

    if (error) throw error;
    fileUrl = data.path;
  }

  const { data, error } = await supabase
    .from("coverage_requests")
    .insert([{
      ...requestData,
      file_url: fileUrl,
    }]);

  if (error) throw error;
  return data;
}
