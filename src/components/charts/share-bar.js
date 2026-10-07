import { formatPercent } from "@/lib/format";

/**
 * 100% stacked bar of shares. Segments are separated by a 2px surface gap;
 * every segment is named in the legend below, so colour is never the only cue.
 */
export function ShareBar({ items, label }) {
  return (
    <figure>
      <div className="flex h-2.5 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={label}>
        {items.map((item) => (
          <div key={item.label} style={{ width: `${item.share * 100}%`, background: item.color }} className="h-full min-w-[2px]" title={`${item.label} ${formatPercent(item.share * 100, 1)}`} />
        ))}
      </div>
      <figcaption>
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {items.map((item) => (
            <li key={item.label} className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-[2px]" style={{ background: item.color }} aria-hidden="true" />
              <span>{item.label}</span>
              <span className="tabular text-fg-3">{formatPercent(item.share * 100, 1)}</span>
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  );
}
