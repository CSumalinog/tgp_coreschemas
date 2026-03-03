// src/hooks/useClientRequests.js
import { useState, useEffect, useCallback } from "react";
import { fetchMyRequests } from "../services/coverageRequestService";

/**
 * Shared data hook for all client request pages.
 * Fetch once, filter locally — no duplicate API calls.
 *
 * Usage:
 *   const { requests, loading, error, refetch } = useClientRequests();
 *   const pending = requests.filter(r => r.status === "Pending");
 */
export function useClientRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchMyRequests();
      setRequests(data);
    } catch (err) {
      setError(err.message);
      console.error("useClientRequests error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Derived filtered lists — use these directly in each page
  const drafts = requests.filter((r) => r.status === "Draft");
  const pending = requests.filter((r) => r.status === "Pending");
  const approved = requests.filter((r) => r.status === "Approved");
  const declined = requests.filter((r) => r.status === "Declined");

  return {
    requests,   // all requests (for History page)
    drafts,
    pending,
    approved,
    declined,
    loading,
    error,
    refetch: fetch,
  };
}
