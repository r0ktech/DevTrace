"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { GitHubMark } from "@/components/brand/github-mark";
import { ThemeToggle } from "@/components/app/theme-toggle";
import { SignOutButton } from "@/components/app/sign-out-button";
import { Avatar } from "@/components/app/avatar";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActive } from "./nav-items";

export function Sidebar({ account, isDemo }) {
  const pathname = usePathname();
  const main = NAV_ITEMS.filter((item) => item.href !== "/settings");

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[var(--sidebar-w)] flex-col border-r border-border bg-bg lg:flex">
      <div className="flex h-12 items-center px-4">
        <Link href="/dashboard" aria-label="DevTrace overview" className="rounded-md">
          <Logo />
        </Link>
      </div>

      <nav aria-label="Main" className="scrollbar-thin flex-1 overflow-y-auto px-2 py-2">
        <ul className="space-y-px">
          {main.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] transition-colors",
                    active ? "bg-surface-2 font-medium text-fg" : "text-fg-2 hover:bg-surface-2/70 hover:text-fg",
                  )}
                >
                  {active && <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-accent" aria-hidden="true" />}
                  <Icon className={cn("h-4 w-4", active ? "text-fg" : "text-fg-3 group-hover:text-fg-2")} aria-hidden="true" />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="space-y-1 border-t border-border p-2">
        {account && (
          <Link
            href={`/u/${account.login}`}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-surface-2"
            title="View developer profile"
          >
            <Avatar src={account.avatarUrl} name={account.name || account.login} size={24} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-medium">{account.login}</span>
              <span className="flex items-center gap-1 text-2xs text-fg-3">
                <GitHubMark className="h-3 w-3" /> {isDemo ? "Demo account" : "GitHub"}
              </span>
            </span>
          </Link>
        )}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-fg-3">Theme</span>
          <ThemeToggle persist={!isDemo} />
        </div>
        <Link
          href="/settings"
          aria-current={isActive(pathname, "/settings") ? "page" : undefined}
          className={cn(
            "flex h-8 items-center gap-2.5 rounded-md px-2.5 text-[13px] text-fg-2 hover:bg-surface-2 hover:text-fg",
            isActive(pathname, "/settings") && "bg-surface-2 font-medium text-fg",
          )}
        >
          {(() => {
            const Icon = NAV_ITEMS.at(-1).icon;
            return <Icon className="h-4 w-4 text-fg-3" aria-hidden="true" />;
          })()}
          Settings
        </Link>
        <SignOutButton
          label={isDemo ? "Exit demo" : "Log out"}
          className="flex h-8 w-full items-center gap-2.5 rounded-md px-2.5 text-[13px] text-fg-2 hover:bg-surface-2 hover:text-fg [&>svg]:text-fg-3"
        />
      </div>
    </aside>
  );
}
