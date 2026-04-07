import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";

const MAX_REQUESTS_PER_SEMESTER = 3;

/**
 * Hook to fetch duty day change request count for a staffer in a semester
 * @param {string} stafferId - The staffer's user ID
 * @param {string} semesterId - The active semester ID
 * @returns {object} { count, used, remaining, loading, error, refetch }
 */
export function useDutyChangeRequestQuota(stafferId, semesterId) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchQuota = useCallback(async () => {
    if (!stafferId || !semesterId) {
      setCount(0);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Count only APPROVED requests (rejected/pending don't consume quota)
      const { data, error: err } = await supabase
        .from("duty_schedule_change_requests")
        .select("id", { count: "exact" })
        .eq("staffer_id", stafferId)
        .eq("semester_id", semesterId)
        .eq("status", "approved");

      if (err) throw err;

      const totalCount = data?.length || 0;
      setCount(totalCount);
    } catch (err) {
      setError(err.message);
      setCount(0);
    } finally {
      setLoading(false);
    }
  }, [stafferId, semesterId]);

  useEffect(() => {
    fetchQuota();
  }, [fetchQuota]);

  const used = count;
  const remaining = Math.max(0, MAX_REQUESTS_PER_SEMESTER - used);
  const isExhausted = remaining === 0;

  return {
    count,
    used,
    remaining,
    isExhausted,
    maxRequests: MAX_REQUESTS_PER_SEMESTER,
    loading,
    error,
    refetch: fetchQuota,
  };
}
