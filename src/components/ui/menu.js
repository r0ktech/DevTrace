"use client";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { cn } from "@/lib/cn";

export const DropdownMenu = Menu.Root;
export const DropdownTrigger = Menu.Trigger;

export function DropdownContent({ className, align = "end", side = "bottom", children }) {
  return (
    <Menu.Portal>
      <Menu.Content
        align={align}
        side={side}
        sideOffset={6}
        className={cn(
          "z-50 min-w-48 rounded-md border border-border bg-surface p-1 text-sm shadow-[0_4px_16px_rgba(0,0,0,0.08)] data-[state=open]:animate-fade-in",
          className,
        )}
      >
        {children}
      </Menu.Content>
    </Menu.Portal>
  );
}

export function DropdownItem({ className, ...props }) {
  return (
    <Menu.Item
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-[4px] px-2 py-1.5 text-fg-2 outline-none data-[highlighted]:bg-surface-2 data-[highlighted]:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator() {
  return <Menu.Separator className="my-1 h-px bg-border" />;
}

export function DropdownLabel({ children }) {
  return <Menu.Label className="px-2 py-1.5 text-2xs uppercase tracking-wide text-fg-3">{children}</Menu.Label>;
}
