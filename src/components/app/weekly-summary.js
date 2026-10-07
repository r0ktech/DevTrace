"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Panel } from "@/components/ui/panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatNumber } from "@/lib/format";

/**
 * Optional AI-generated weekly summary. Always shown next to the exact
 * metrics it was generated from, and clearly labelled.
 */
export function WeeklySummaryPanel({ enabled, isDemo, initial }) {
  const [summary, setSummary] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  async function generate() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/summary", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error?.message || "Couldn't generate a summary.");
      setSummary(data.summary);
    } catch (e) {
      setError(e.message);
    } finally {
      setPending(false);
    }
  }

  const m = summary?.metrics;
  return (
    <Panel
      id="ai-summary"
      title={
        <span className="flex items-center gap-2">
          Your week in code
          <Badge tone="accent">
            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> AI-generated
          </Badge>
        </span>
      }
      description="Optional. Written by a language model from the metrics shown alongside it; it receives no code, only these numbers and titles."
      actions={
        enabled && !isDemo ? (
          <Button size="sm" onClick={generate} disabled={pending}>
            {pending ? "Generating…" : summary ? "Regenerate" : "Generate summary"}
          </Button>
        ) : null
      }
    >
      {!enabled ? (
        <p className="text-sm text-fg-3">AI summaries are turned off on this DevTrace server. Everything else on this page is calculated without AI.</p>
      ) : isDemo ? (
        <p className="text-sm text-fg-3">AI summaries aren&apos;t available for the demo account.</p>
      ) : !summary ? (
        <p className="text-sm text-fg-3">No summary yet. Generate one from your last 7 days of activity.</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <p className="text-sm leading-relaxed">{summary.content}</p>
            <p className="mt-3 text-2xs text-fg-3">
              Generated {formatDateTime(summary.createdAt)} · {summary.model}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 self-start rounded-md border border-border p-3 text-xs lg:col-span-2">
            <dt className="text-fg-3">Commits</dt><dd className="tabular text-right">{formatNumber(m.commits)}</dd>
            <dt className="text-fg-3">Active days</dt><dd className="tabular text-right">{formatNumber(m.activeDays)}</dd>
            <dt className="text-fg-3">PRs opened</dt><dd className="tabular text-right">{formatNumber(m.pullRequestsOpened)}</dd>
            <dt className="text-fg-3">PRs merged</dt><dd className="tabular text-right">{formatNumber(m.pullRequestsMerged)}</dd>
            <dt className="text-fg-3">Issues opened</dt><dd className="tabular text-right">{formatNumber(m.issuesOpened)}</dd>
            <dt className="text-fg-3">Issues closed</dt><dd className="tabular text-right">{formatNumber(m.issuesClosed)}</dd>
            <dt className="text-fg-3">Repositories</dt><dd className="tabular text-right">{m.repositories.map((r) => r.name).join(", ") || "—"}</dd>
          </dl>
        </div>
      )}
      {error && <p role="alert" className="mt-3 text-sm text-critical">{error}</p>}
    </Panel>
  );
}
