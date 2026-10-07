"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 1500;

/**
 * Tracks the latest sync job. Polls while a job is queued or running and
 * calls onComplete once it finishes.
 */
export function useSyncStatus({ initial, onComplete, auto = false, enabled = true } = {}) {
  const [state, setState] = useState(initial || { job: null, lastSyncedAt: null });
  const [requestError, setRequestError] = useState(null);
  const [starting, setStarting] = useState(false);
  const completeRef = useRef(onComplete);
  useEffect(() => {
    completeRef.current = onComplete;
  });

  const active = state.job && ["queued", "running"].includes(state.job.status);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/sync", { cache: "no-store" });
    if (!res.ok) throw new Error("status");
    const data = await res.json();
    setState((prev) => {
      const wasActive = prev.job && ["queued", "running"].includes(prev.job.status);
      const nowDone = data.job && !["queued", "running"].includes(data.job.status);
      if (wasActive && nowDone) setTimeout(() => completeRef.current?.(data), 0);
      return data;
    });
    return data;
  }, []);

  const start = useCallback(async () => {
    setRequestError(null);
    setStarting(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await res.json();
      if (!res.ok) {
        setRequestError(data?.error?.message || "Couldn't start a sync.");
        return;
      }
      setState(data);
    } catch {
      setRequestError("Couldn't reach DevTrace. Check your connection and try again.");
    } finally {
      setStarting(false);
    }
  }, []);

  // Background refresh when data is stale; the server decides whether to sync
  useEffect(() => {
    if (!enabled || !auto) return;
    fetch("/api/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ auto: true }) })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setState(data))
      .catch(() => {});
  }, [enabled, auto]);

  useEffect(() => {
    if (!enabled || !active) return;
    const timer = setInterval(() => refresh().catch(() => {}), POLL_MS);
    return () => clearInterval(timer);
  }, [enabled, active, refresh]);

  return { ...state, active, starting, requestError, start, refresh };
}
