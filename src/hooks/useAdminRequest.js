// src/hooks/useAdminRequests.js
import { useState, useEffect, useCallback } from "react";
import { fetchAllRequests } from "../services/adminRequestService";

/**
 * Shared data hook for all admin request pages.
 * Fetch once, filter locally.
 *
 * Usage:
 *   const { pending, forwarded, forApproval, approved, declined, loading, refetch } = useAdminRequests();
 */
export function useAdminRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  useEffect(() => {
    fetch();
  }, [fetch]);

  const pending     = requests.filter((r) => r.status === "Pending");
  const forwarded   = requests.filter((r) => r.status === "Forwarded");
  const forApproval = requests.filter((r) => r.status === "Assigned");
  const approved    = requests.filter((r) => r.status === "Approved");
  const declined    = requests.filter((r) => r.status === "Declined");

  return {
    requests,
    pending,
    forwarded,
    forApproval,
    approved,
    declined,
    loading,
    error,
    refetch: fetch,
  };
}