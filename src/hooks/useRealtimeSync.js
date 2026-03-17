// src/hooks/useRealtimeSync.js
// ─────────────────────────────────────────────────────────────────────────────
// Drop-in realtime hook. Subscribes to any table and calls the provided
// callback whenever a row is inserted, updated, or deleted.
//
// Usage:
//   useRealtimeSync("coverage_requests", refetch);
//   useRealtimeSync("coverage_assignments", refetch, `assigned_to=eq.${userId}`);
//
// The optional filter follows Supabase's postgres_changes filter syntax.
// ─────────────────────────────────────────────────────────────────────────────
import { useEffect, useRef } from "react";
import { supabase }          from "../lib/supabaseClient";

// Each hook call gets a unique id so channel names never collide across
// components that subscribe to the same table (e.g. Dashboard + AdminRequestManagement)
let _uid = 0;

/**
 * @param {string}   table    — Supabase table name (pass null to skip)
 * @param {function} callback — called on any INSERT / UPDATE / DELETE
 * @param {string}   [filter] — optional row filter e.g. "assigned_to=eq.uuid"
 */
export function useRealtimeSync(table, callback, filter = null) {
  const callbackRef = useRef(callback);
  const filterRef   = useRef(filter);
  const uidRef      = useRef(null);

  // Assign a stable unique id once per hook instance
  if (uidRef.current === null) uidRef.current = ++_uid;

  // Sync refs during render — avoids stale closure timing gaps
  callbackRef.current = callback;
  filterRef.current   = filter;

  useEffect(() => {
    if (!table) return;

    // Unique channel name per instance — prevents Supabase from deduplicating
    // channels when multiple components subscribe to the same table
    const channelName = filter
      ? `rt-${table}-${filter}-${uidRef.current}`
      : `rt-${table}-${uidRef.current}`;

    const config = {
      event:  "*",
      schema: "public",
      table,
      ...(filterRef.current ? { filter: filterRef.current } : {}),
    };

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", config, () => callbackRef.current?.())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [table, filter]);
}