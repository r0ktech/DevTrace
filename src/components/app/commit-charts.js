"use client";

import { useState } from "react";
import { ColumnChart } from "@/components/charts/column-chart";
import { cn } from "@/lib/cn";

const UNITS = [
  { key: "day", label: "Day" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
];

/** Commits grouped by day / week / month, switchable without a reload. */
export function CommitTimeChart({ series }) {
  const [unit, setUnit] = useState(series.week.length > 60 ? "week" : "day");
  const data = series[unit];
  return (
    <div>
      <div role="radiogroup" aria-label="Group commits by" className="mb-3 inline-flex rounded-md border border-border-strong p-0.5">
        {UNITS.map((u) => (
          <button
            key={u.key}
            type="button"
            role="radio"
            aria-checked={unit === u.key}
            onClick={() => setUnit(u.key)}
            className={cn("h-6 rounded-[4px] px-2.5 text-xs font-medium", unit === u.key ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg")}
          >
            {u.label}
          </button>
        ))}
      </div>
      <ColumnChart data={data} noun="commit" height={220} unit={unit} emptyText="No commits in this period." />
    </div>
  );
}
