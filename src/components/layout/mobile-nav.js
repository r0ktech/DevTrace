"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Avatar } from "@/components/app/avatar";
import { cn } from "@/lib/cn";
import { MOBILE_PRIMARY, NAV_ITEMS, isActive } from "./nav-items";

/**
 * Bottom tab bar for small screens: four primary destinations plus a
 * "More" sheet with the remaining pages and account controls.
 */
export function MobileNav({ account, isDemo }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((item) => MOBILE_PRIMARY.includes(item.href));
  const secondary = NAV_ITEMS.filter((item) => !MOBILE_PRIMARY.includes(item.href));
  const moreActive = secondary.some((item) => isActive(pathname, item.href));

  const tab = "flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium";

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="flex h-14">
        {primary.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn(tab, active ? "text-fg" : "text-fg-3")}>
              <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
              {label}
            </Link>
          );
        })}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={cn(tab, moreActive ? "text-fg" : "text-fg-3")}>
            <MoreHorizontal className="h-[18px] w-[18px]" aria-hidden="true" />
            More
          </DialogTrigger>
          <DialogContent side="bottom" title="More">
            <ul className="-mx-2 grid grid-cols-2 gap-1">
              {secondary.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive(pathname, href) ? "page" : undefined}
                    className={cn(
                      "flex h-11 items-center gap-2.5 rounded-md px-3 text-sm",
                      isActive(pathname, href) ? "bg-surface-2 font-medium" : "text-fg-2",
                    )}
                  >
                    <Icon className="h-4 w-4 text-fg-3" aria-hidden="true" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-3 border-t border-border pt-4">
              {account && (
                <Link href={`/u/${account.login}`} onClick={() => setOpen(false)} className="flex items-center gap-3">
                  <Avatar src={account.avatarUrl} name={account.name || account.login} size={28} />
                  <span className="text-sm font-medium">{account.login}</span>
                  <span className="text-xs text-fg-3">{isDemo ? "Demo account" : "View profile"}</span>
                </Link>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-fg-2">Theme</span>
                <ThemeToggle persist={!isDemo} />
              </div>
              <SignOutButton label={isDemo ? "Exit demo" : "Log out"} className="flex h-10 items-center gap-2 text-sm text-fg-2" />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </nav>
  );
}
