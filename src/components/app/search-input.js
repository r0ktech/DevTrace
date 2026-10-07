"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Debounced, URL-backed search box. */
export function SearchInput({ placeholder = "Search", param = "q", label }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) || "");
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const current = searchParams.get(param) || "";
    if (value === current) return;
    const timer = setTimeout(() => {
      const params = new URLSearchParams(searchParams);
      if (value) params.set(param, value);
      else params.delete(param);
      params.delete("page");
      startTransition(() => router.replace(`${pathname}?${params}`, { scroll: false }));
    }, 300);
    return () => clearTimeout(timer);
  }, [value, param, pathname, router, searchParams]);

  return (
    <div className="relative w-full sm:w-64">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-3" aria-hidden="true" />
      <Input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        aria-label={label || placeholder}
        className="w-full pl-8"
        aria-busy={pending}
        maxLength={100}
      />
    </div>
  );
}
