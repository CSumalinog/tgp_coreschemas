// src/hooks/useAdminRequests.js
import { useState, useEffect, useCallback } from "react";
import { fetchAllRequests } from "../services/adminRequestService";

/**
 * Shared data hook for all admin request pages.
 * Fetch once, filter locally.
 *
 * Usage:
 *   const { requests, pending, forwarded, forApproval, approved, onGoing, declined, loading, refetch } = useAdminRequests();
 */
export function useAdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllRequests();
      setRequests(data);
    } catch (err) {
      setError(err.message);
      console.error("useAdminRequests error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  const pending     = requests.filter((r) => r.status === "Pending");
  const forwarded   = requests.filter((r) => r.status === "Forwarded" || r.status === "Assigned");
  const forApproval = requests.filter((r) => r.status === "For Approval");
  const approved    = requests.filter((r) => r.status === "Approved");
  // Trim + lowercase comparison to guard against any whitespace or case inconsistency
  const onGoing     = requests.filter((r) => r.status?.trim().toLowerCase() === "on going");
  const completed   = requests.filter((r) => r.status?.trim().toLowerCase() === "completed");
  const declined    = requests.filter((r) => r.status === "Declined");

  return {
    requests,
    pending,
    forwarded,
    forApproval,
    approved,
    onGoing,
    completed,
    declined,
    loading,
    error,
    refetch: fetch,
  };
}