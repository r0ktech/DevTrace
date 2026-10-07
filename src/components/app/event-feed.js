"use client";

import { useState } from "react";
import { EventList } from "./event-list";

/** Event list with "Load more" pagination via /api/activity/events. */
export function EventFeed({ initial, repositoryId, tz }) {
  const [events, setEvents] = useState(initial.events);
  const [nextBefore, setNextBefore] = useState(initial.nextBefore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadMore() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ before: new Date(nextBefore).toISOString(), limit: "25" });
      if (repositoryId) params.set("repo", repositoryId);
      const res = await fetch(`/api/activity/events?${params}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEvents((prev) => [...prev, ...data.events]);
      setNextBefore(data.nextBefore);
    } catch {
      setError("Couldn't load older events. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <EventList events={events} tz={tz} showRepository={!repositoryId} />
      {nextBefore && (
        <div className="border-t border-border py-2 text-center">
          <button type="button" onClick={loadMore} disabled={loading} className="text-xs text-fg-2 hover:text-fg disabled:opacity-60">
            {loading ? "Loading…" : "Load older events"}
          </button>
          {error && <p role="alert" className="mt-1 text-xs text-critical">{error}</p>}
        </div>
      )}
    </div>
  );
}
