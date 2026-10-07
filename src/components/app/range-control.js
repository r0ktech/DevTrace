import { SegmentedLinks } from "@/components/ui/segmented";
import { RANGES, HEATMAP_PERIODS } from "@/lib/dates";

const RANGE_OPTIONS = Object.keys(RANGES).map((value) => ({ value, label: value.toUpperCase() }));
const HEATMAP_OPTIONS = Object.entries(HEATMAP_PERIODS).map(([value]) => ({ value, label: value.toUpperCase() }));

export function RangeControl({ value, pathname, searchParams }) {
  return <SegmentedLinks label="Date range" options={RANGE_OPTIONS} param="range" value={value} pathname={pathname} searchParams={searchParams} />;
}

export function HeatmapPeriodControl({ value, pathname, searchParams }) {
  return <SegmentedLinks label="Heatmap period" options={HEATMAP_OPTIONS} param="heatmap" value={value} pathname={pathname} searchParams={searchParams} />;
}
