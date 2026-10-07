"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatNumber } from "@/lib/format";
import { bucketLabel } from "@/lib/chart-labels";
import { EmptyState } from "@/components/ui/states";

function TooltipBox({ active, payload, noun, unit }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const title = unit ? bucketLabel(point.key, unit, true) : point.label;
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2 text-xs shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
      <div className="font-medium">{title}</div>
      <div className="text-fg-2">
        <span className="tabular font-medium text-fg">{formatNumber(point.value)}</span> {noun}
        {point.value === 1 ? "" : "s"}
      </div>
    </div>
  );
}

/**
 * Single-series column chart (one colour for every bar).
 * Pass `unit` for date buckets, or a `label` on each point for categories.
 * (Only serializable props: this is rendered from server components.)
 */
export function ColumnChart({ data, noun = "commit", color = "var(--series-1)", height = 200, unit, emptyText }) {
  if (!data.some((d) => d.value > 0)) {
    return <EmptyState compact title={emptyText || "Not enough activity to generate this chart yet."} />;
  }
  return (
    <div style={{ height }} className="-ml-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} stroke="var(--grid)" />
          <XAxis
            dataKey="key"
            tickFormatter={(k) => (unit ? bucketLabel(k, unit) : (data.find((d) => d.key === k)?.label ?? k))}
            tickLine={false}
            axisLine={{ stroke: "var(--axis)" }}
            tick={{ fill: "var(--fg-3)", fontSize: 11 }}
            minTickGap={16}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "var(--fg-3)", fontSize: 11 }} width={32} />
          <Tooltip content={<TooltipBox noun={noun} unit={unit} />} cursor={{ fill: "var(--surface-2)" }} />
          <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={28} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
