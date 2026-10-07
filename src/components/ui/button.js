import { forwardRef } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-fg text-bg hover:bg-fg/85 disabled:bg-fg/50",
  secondary: "border border-border-strong bg-surface text-fg hover:bg-surface-2",
  ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
  danger: "border border-critical/40 bg-surface text-critical hover:bg-critical/10",
  dangerSolid: "bg-critical text-white hover:bg-critical/90 disabled:opacity-60",
};

const sizes = {
  sm: "h-7 px-2.5 text-xs gap-1.5",
  md: "h-8 px-3 text-sm gap-2",
  lg: "h-10 px-4 text-sm gap-2",
  icon: "h-8 w-8 justify-center",
};

export const Button = forwardRef(function Button(
  { className, variant = "secondary", size = "md", asChild = false, ...props },
  ref,
) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex select-none items-center whitespace-nowrap rounded-md font-medium transition-colors duration-100 disabled:cursor-not-allowed active:translate-y-px",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});
