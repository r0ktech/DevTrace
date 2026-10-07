"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/cn";

/** URL-backed select (repository, status, language filters). */
export function ParamSelect({ param, value, options, label, allLabel, className }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  return (
    <Select
      aria-label={label}
      value={value || ""}
      className={cn("max-w-56", pending && "opacity-60", className)}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams);
        if (e.target.value) params.set(param, e.target.value);
        else params.delete(param);
        params.delete("page");
        startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
      }}
    >
      {allLabel && <option value="">{allLabel}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </Select>
  );
}
