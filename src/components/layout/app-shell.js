import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";
import { SyncIndicator } from "@/components/app/sync-indicator";
import { ConnectGitHubButton } from "@/components/app/connect-github-button";
import { Sidebar } from "./sidebar";
import { MobileNav } from "./mobile-nav";

export function AppShell({ account, isDemo, syncState, children }) {
  return (
    <div className="min-h-dvh">
      <a href="#main" className="sr-only z-50 rounded-md bg-surface px-3 py-2 text-sm focus:not-sr-only focus:fixed focus:left-3 focus:top-3">
        Skip to content
      </a>
      <Sidebar account={account} isDemo={isDemo} />
      <div className="lg:pl-[var(--sidebar-w)]">
        <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur sm:px-6">
          <Link href="/dashboard" aria-label="DevTrace overview" className="rounded-md lg:hidden">
            <LogoMark />
          </Link>
          <div className="hidden min-w-0 items-center gap-2 text-xs text-fg-3 lg:flex">
            {isDemo ? (
              <span className="inline-flex items-center gap-2">
                <span className="rounded-[4px] border border-warning/50 px-1.5 py-0.5 font-medium text-warning">Demo</span>
                You&apos;re viewing a fictional sample account. None of this data belongs to a real developer.
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            {isDemo && <ConnectGitHubButton fromDemo size="sm" label="Use my GitHub" />}
            <SyncIndicator initial={syncState} isDemo={isDemo} />
          </div>
        </header>
        {isDemo && (
          <div className="border-b border-border bg-surface px-4 py-2 text-xs text-fg-2 lg:hidden">
            <span className="font-medium text-warning">Demo · </span>Fictional sample data, not a real developer.
          </div>
        )}
        <main id="main" className="mx-auto w-full max-w-[1280px] px-4 pb-24 pt-6 sm:px-6 lg:pb-12">
          {children}
        </main>
      </div>
      <MobileNav account={account} isDemo={isDemo} />
    </div>
  );
}
