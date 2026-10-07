import { Skeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Skeleton className="mb-2 h-6 w-40" />
      <Skeleton className="mb-6 h-4 w-72" />
      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-surface p-4">
            <Skeleton className="mb-3 h-3 w-20" />
            <Skeleton className="h-7 w-16" />
          </div>
        ))}
      </div>
      <Skeleton className="mb-4 h-56 w-full" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
