"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * On first visit, store the browser's timezone so day/hour analytics use the
 * user's local calendar. Changeable later in Settings.
 */
export function TimezoneSync({ current, enabled }) {
  const router = useRouter();
  useEffect(() => {
    if (!enabled || current) return;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone }),
    })
      .then((res) => res.ok && router.refresh())
      .catch(() => {});
  }, [current, enabled, router]);
  return null;
}
