"use client";

import { useMemo, useState } from "react";
import { WEEKDAYS } from "@/lib/dates";
import { formatHour, formatNumber } from "@/lib/format";
import { heatLevel, heatThresholds } from "@/lib/heatmap";
import { FloatingTooltip } from "./chart-tooltip";

const CELL = 18;
const GAP = 2;
const LEFT = 32;
const TOP = 18;

/** Weekday × hour grid of commit counts in the user's timezone. */
export function Punchcard({ matrix, tz }) {
  const [tip, setTip] = useState(null);
  const thresholds = useMemo(() => heatThresholds(matrix.flat()), [matrix]);
  const step = CELL + GAP;
  const width = LEFT + 24 * step;
  const height = TOP + 7 * step;
  const total = matrix.flat().reduce((a, b) => a + b, 0);

  return (
    <div className="relative">
      <div className="scrollbar-thin overflow-x-auto">
        <svg width={width} height={height} role="img" aria-label={`Commit times by weekday and hour (${tz}), ${formatNumber(total)} commits.`} onMouseLeave={() => setTip(null)}>
          {[0, 6, 12, 18].map((h) => (
            <text key={h} x={LEFT + h * step} y={11} className="fill-[var(--fg-3)] text-[10px]">
              {formatHour(h)}
            </text>
          ))}
          {WEEKDAYS.map((day, row) => (
            <text key={day} x={0} y={TOP + row * step + CELL - 5} className="fill-[var(--fg-3)] text-[10px]">
              {day}
            </text>
          ))}
          {matrix.map((hours, row) =>
            hours.map((value, hour) => (
              <rect
                key={`${row}-${hour}`}
                className="heat-cell"
                x={LEFT + hour * step}
                y={TOP + row * step}
                width={CELL}
                height={CELL}
                rx={2}
                fill={`var(--heat-${heatLevel(value, thresholds)})`}
                onMouseEnter={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  const parent = e.currentTarget.closest(".relative").getBoundingClientRect();
                  setTip({
                    x: box.left - parent.left + CELL / 2,
                    y: box.top - parent.top,
                    content: (
                      <>
                        <span className="font-medium">{formatNumber(value)} commit{value === 1 ? "" : "s"}</span>
                        <span className="text-fg-3"> · {WEEKDAYS[row]} {formatHour(hour)}–{formatHour((hour + 1) % 24)}</span>
                      </>
                    ),
                  });
                }}
              />
            )),
          )}
        </svg>
      </div>
      <FloatingTooltip tip={tip} />
    </div>
  );
}
