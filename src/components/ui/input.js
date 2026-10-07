import { forwardRef } from "react";
import { cn } from "@/lib/cn";

export const fieldClass =
  "h-8 rounded-md border border-border-strong bg-surface px-2.5 text-sm text-fg placeholder:text-fg-3 transition-colors hover:border-fg-3 focus-visible:outline-2 focus-visible:outline-offset-0 disabled:opacity-60";

export const Input = forwardRef(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(fieldClass, className)} {...props} />;
});

export const Select = forwardRef(function Select({ className, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(fieldClass, "cursor-pointer pr-7", className)} {...props}>
      {children}
    </select>
  );
});

export function Label({ className, ...props }) {
  return <label className={cn("text-xs font-medium text-fg-2", className)} {...props} />;
}
