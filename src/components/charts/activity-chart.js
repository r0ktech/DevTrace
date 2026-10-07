"use client";

import { useState } from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import { bucketLabel } from "@/lib/chart-labels";
import { cn } from "@/lib/cn";
import { EmptyState } from "@/components/ui/states";

export const SERIES = [
  { key: "commits", label: "Commits", color: "var(--series-1)" },
  { key: "pullRequests", label: "Pull requests", color: "var(--series-2)" },
  { key: "issues", label: "Issues", color: "var(--series-3)" },
];


function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      <div className="mb-1 font-medium">{bucketLabel(label, unit, true)}</div>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5 text-fg-2">
            <span className="h-0.5 w-3 rounded-full" style={{ background: item.color }} aria-hidden="true" />
            {item.name}
          </span>
          <span className="tabular font-medium">{formatNumber(item.value)}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Activity over time with toggleable series. The legend doubles as the
 * toggle, so series identity is always labelled, never colour alone.
 */
export function ActivityChart({ points, unit, totals, height = 240, initial = ["commits", "pullRequests", "issues"] }) {
  const [visible, setVisible] = useState(new Set(initial));
  const [showTable, setShowTable] = useState(false);
  const hasData = points.some((p) => p.commits || p.pullRequests || p.issues);

  const toggle = (key) =>
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key) && next.size > 1) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label="Series">
        {SERIES.map((s) => {
          const on = visible.has(s.key);
          return (
            <button
              key={s.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(s.key)}
              className={cn(
                "inline-flex h-7 items-center gap-2 rounded-md border px-2.5 text-xs transition-colors",
                on ? "border-border-strong bg-surface text-fg" : "border-border text-fg-3 line-through decoration-fg-3/50",
              )}
            >
              <span className="h-2 w-2 rounded-[2px]" style={{ background: on ? s.color : "var(--border-strong)" }} aria-hidden="true" />
              {s.label}
              {totals && <span className="tabular text-fg-3">{formatNumber(totals[s.key])}</span>}
            </button>
          );
        })}
      </div>

      {!hasData ? (
        <EmptyState compact title="Not enough activity to generate this chart yet." description="Commits, pull requests and issues in this period will appear here." />
      ) : (
        <div style={{ height }} className="-ml-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={points} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grid)" />
              <XAxis
                dataKey="key"
                tickFormatter={(k) => bucketLabel(k, unit)}
                tickLine={false}
                axisLine={{ stroke: "var(--axis)" }}
                tick={{ fill: "var(--fg-3)", fontSize: 11 }}
                minTickGap={24}
                tickMargin={8}
              />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--fg-3)", fontSize: 11 }} width={32} />
              <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ stroke: "var(--axis)", strokeWidth: 1 }} />
              {SERIES.filter((s) => visible.has(s.key)).map((s) => (
                <Line
                  key={s.key}
                  type="linear"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={2}
                  dot={points.length <= 14 ? { r: 3, strokeWidth: 0, fill: s.color } : false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {hasData && (
        <div className="mt-2">
          <button type="button" onClick={() => setShowTable((v) => !v)} aria-expanded={showTable} className="text-2xs text-fg-3 underline-offset-2 hover:text-fg hover:underline">
            {showTable ? "Hide table" : "View as table"}
          </button>
          {showTable && <SeriesTable points={points} unit={unit} />}
        </div>
      )}
    </div>
  );
}

function SeriesTable({ points, unit }) {
  return (
    <div className="mt-2 max-h-64 overflow-auto">
      <table className="w-full text-xs">
        <thead className="sticky top-0 bg-surface">
          <tr className="text-left text-fg-3">
            <th scope="col" className="py-1 pr-4 font-medium">{unit === "day" ? "Day" : unit === "week" ? "Week" : "Month"}</th>
            {SERIES.map((s) => (
              <th key={s.key} scope="col" className="py-1 pr-4 text-right font-medium">{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="tabular">
          {points.map((p) => (
            <tr key={p.key} className="border-t border-border">
              <td className="py-1 pr-4">{bucketLabel(p.key, unit, true)}</td>
              <td className="py-1 pr-4 text-right">{p.commits}</td>
              <td className="py-1 pr-4 text-right">{p.pullRequests}</td>
              <td className="py-1 pr-4 text-right">{p.issues}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
