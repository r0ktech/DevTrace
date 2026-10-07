"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

async function persistTheme(theme) {
  try {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
  } catch {
    // Local preference still applies
  }
}

/** Light / dark / system. Saved locally and to the account. */
export function ThemeToggle({ persist = true, className }) {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; avoid a hydration mismatch
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  return (
    <div role="radiogroup" aria-label="Theme" className={cn("inline-flex rounded-md border border-border p-0.5", className)}>
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const active = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => {
              setTheme(value);
              if (persist) persistTheme(value);
            }}
            className={cn(
              "flex h-6 w-7 items-center justify-center rounded-[4px] transition-colors",
              active ? "bg-surface-3 text-fg" : "text-fg-3 hover:text-fg",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}

/**
 * Applies the account's saved theme on a device that has no local choice yet.
 */
export function ThemeSync({ preferred }) {
  const { setTheme } = useTheme();
  useEffect(() => {
    try {
      if (!localStorage.getItem("devtrace-theme") && preferred && preferred !== "system") setTheme(preferred);
    } catch {
      // storage unavailable
    }
  }, [preferred, setTheme]);
  return null;
}
