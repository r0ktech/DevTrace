"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { weekdayIndex } from "@/lib/dates";
import { formatDayKey, formatNumber } from "@/lib/format";
import { heatLevel, heatThresholds } from "@/lib/heatmap";
import { FloatingTooltip } from "./chart-tooltip";

const CELL = 11;
const GAP = 3;
const STEP = CELL + GAP;
const LEFT = 28;
const TOP = 16;
const DAY_LABELS = { 0: "Mon", 2: "Wed", 4: "Fri" };

/**
 * Contribution calendar: one column per week (Mon–Sun), one cell per day.
 * Colour intensity uses a single-hue sequential ramp; counts are always
 * available via tooltip and the table view.
 */
export function Heatmap({ days, noun = "contribution" }) {
  const scroller = useRef(null);
  const [tip, setTip] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const { cells, months, weeks, thresholds, total, activeDays } = useMemo(() => {
    const thresholds = heatThresholds(days.map((d) => d.value));
    const offset = days.length ? weekdayIndex(days[0].key) : 0;
    const cells = days.map((d, i) => {
      const index = i + offset;
      return { ...d, col: Math.floor(index / 7), row: index % 7, level: heatLevel(d.value, thresholds) };
    });
    const months = [];
    let lastMonth = null;
    for (const cell of cells) {
      const month = cell.key.slice(0, 7);
      if (month !== lastMonth && cell.row === 0) {
        months.push({ col: cell.col, label: formatDayKey(cell.key, { month: "short" }) });
        lastMonth = month;
      } else if (lastMonth === null) {
        lastMonth = month;
      }
    }
    const weeks = cells.length ? cells[cells.length - 1].col + 1 : 0;
    return {
      cells,
      months,
      weeks,
      thresholds,
      total: days.reduce((t, d) => t + d.value, 0),
      activeDays: days.filter((d) => d.value > 0).length,
    };
  }, [days]);

  // Show the most recent weeks first on narrow screens
  useEffect(() => {
    if (scroller.current) scroller.current.scrollLeft = scroller.current.scrollWidth;
  }, [weeks]);

  const width = LEFT + weeks * STEP;
  const height = TOP + 7 * STEP;
  const plural = (n) => `${formatNumber(n)} ${noun}${n === 1 ? "" : "s"}`;

  const monthly = useMemo(() => {
    const map = new Map();
    for (const d of days) {
      const key = d.key.slice(0, 7);
      const entry = map.get(key) || { key, total: 0, active: 0 };
      entry.total += d.value;
      if (d.value > 0) entry.active += 1;
      map.set(key, entry);
    }
    return [...map.values()];
  }, [days]);

  return (
    <div>
      <div className="relative">
        <div ref={scroller} className="scrollbar-thin overflow-x-auto pb-1">
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={`${plural(total)} across ${formatNumber(activeDays)} active days from ${formatDayKey(days[0]?.key || "2000-01-01", { month: "long", day: "numeric", year: "numeric" })}.`}
            className="block"
            onMouseLeave={() => setTip(null)}
          >
            {months.map((m) => (
              <text key={`${m.col}-${m.label}`} x={LEFT + m.col * STEP} y={10} className="fill-[var(--fg-3)] text-[10px]">
                {m.label}
              </text>
            ))}
            {Object.entries(DAY_LABELS).map(([row, label]) => (
              <text key={row} x={0} y={TOP + Number(row) * STEP + CELL - 2} className="fill-[var(--fg-3)] text-[10px]">
                {label}
              </text>
            ))}
            {cells.map((cell) => (
              <rect
                key={cell.key}
                className="heat-cell"
                x={LEFT + cell.col * STEP}
                y={TOP + cell.row * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                fill={`var(--heat-${cell.level})`}
                onMouseEnter={(e) => {
                  const box = e.currentTarget.getBoundingClientRect();
                  const parent = scroller.current.parentElement.getBoundingClientRect();
                  setTip({
                    x: box.left - parent.left + CELL / 2,
                    y: box.top - parent.top,
                    content: (
                      <>
                        <span className="font-medium">{plural(cell.value)}</span>
                        <span className="text-fg-3"> · {formatDayKey(cell.key, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}</span>
                      </>
                    ),
                  });
                }}
              />
            ))}
          </svg>
        </div>
        <FloatingTooltip tip={tip} />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-2xs text-fg-3">
        <button type="button" onClick={() => setShowTable((v) => !v)} className="rounded underline-offset-2 hover:text-fg hover:underline" aria-expanded={showTable}>
          {showTable ? "Hide table" : "View as table"}
        </button>
        <div className="flex items-center gap-1.5" aria-hidden="true">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="heat-cell h-[11px] w-[11px] rounded-[2px]" style={{ background: `var(--heat-${level})` }} />
          ))}
          <span>More</span>
        </div>
        <span className="sr-only">
          Intensity levels: 1 up to {thresholds[0]}, 2 up to {thresholds[1]}, 3 up to {thresholds[2]}, 4 above.
        </span>
      </div>

      {showTable && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <caption className="sr-only">Monthly totals</caption>
            <thead>
              <tr className="text-left text-fg-3">
                <th scope="col" className="py-1 pr-4 font-medium">Month</th>
                <th scope="col" className="py-1 pr-4 text-right font-medium">Total</th>
                <th scope="col" className="py-1 text-right font-medium">Active days</th>
              </tr>
            </thead>
            <tbody className="tabular">
              {monthly.map((m) => (
                <tr key={m.key} className="border-t border-border">
                  <td className="py-1 pr-4">{formatDayKey(`${m.key}-01`, { month: "long", year: "numeric" })}</td>
                  <td className="py-1 pr-4 text-right">{formatNumber(m.total)}</td>
                  <td className="py-1 text-right">{m.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
