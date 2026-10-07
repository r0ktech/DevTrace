"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ArrowUpRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Avatar } from "@/components/app/avatar";
import { useSyncStatus } from "@/components/app/use-sync-status";
import { formatDateTime } from "@/lib/format";
import { RANGES } from "@/lib/dates";
import { cn } from "@/lib/cn";

function Section({ title, description, children }) {
  return (
    <section className="grid gap-4 border-b border-border py-6 first:pt-0 last:border-b-0 md:grid-cols-[220px_1fr]">
      <div>
        <h2 className="text-sm font-medium">{title}</h2>
        {description && <p className="mt-1 text-xs text-fg-3">{description}</p>}
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function Row({ label, hint, htmlFor, children }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0">
        <Label htmlFor={htmlFor} className="text-sm text-fg">{label}</Label>
        {hint && <p className="text-xs text-fg-3">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({ id, checked, onChange, disabled }) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full border transition-colors disabled:opacity-50",
        checked ? "border-accent bg-accent" : "border-border-strong bg-surface-3",
      )}
    >
      <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      <span className="sr-only">{checked ? "On" : "Off"}</span>
    </button>
  );
}

async function patchSettings(body) {
  const res = await fetch("/api/settings", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || "Couldn't save settings.");
  return data;
}

export function SettingsForm({ account, preferences, sync, isDemo }) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [prefs, setPrefs] = useState(preferences);
  const [name, setName] = useState(account.name);
  const [status, setStatus] = useState(null);
  const syncState = useSyncStatus({ initial: { job: null, lastSyncedAt: sync.lastSyncedAt }, enabled: !isDemo, onComplete: () => router.refresh() });
  const timezones = useMemo(() => {
    try {
      return Intl.supportedValuesOf("timeZone");
    } catch {
      return [prefs.timezone];
    }
  }, [prefs.timezone]);

  async function save(patch) {
    const previous = prefs;
    setPrefs((p) => ({ ...p, ...patch }));
    setStatus({ type: "saving" });
    try {
      await patchSettings(patch);
      setStatus({ type: "saved" });
      router.refresh();
    } catch (e) {
      setPrefs(previous);
      setStatus({ type: "error", message: e.message });
    }
  }

  const disabled = isDemo;

  return (
    <div className="max-w-4xl">
      {isDemo && (
        <p className="mb-6 rounded-md border border-warning/40 px-3 py-2 text-sm text-warning">The demo account is read-only. Settings are shown for reference.</p>
      )}
      <div className="mb-4 h-5 text-xs" aria-live="polite">
        {status?.type === "saving" && <span className="text-fg-3">Saving…</span>}
        {status?.type === "saved" && <span className="inline-flex items-center gap-1 text-good"><Check className="h-3.5 w-3.5" aria-hidden="true" /> Saved</span>}
        {status?.type === "error" && <span role="alert" className="text-critical">{status.message}</span>}
      </div>

      <Section title="Account" description="Your profile comes from GitHub; you can change the display name.">
        <div className="flex items-center gap-3">
          <Avatar src={account.avatarUrl} name={account.name || account.login} size={44} />
          <div>
            <p className="text-sm font-medium">{account.login ? `@${account.login}` : "No GitHub account"}</p>
            {account.profileUrl && (
              <a href={account.profileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-fg-3 hover:text-fg">
                GitHub profile <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        </div>
        <form
          className="flex flex-col gap-2 sm:flex-row sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            setStatus({ type: "saving" });
            try {
              await patchSettings({ name });
              setStatus({ type: "saved" });
              router.refresh();
            } catch (err) {
              setStatus({ type: "error", message: err.message });
            }
          }}
        >
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="name">Display name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} disabled={disabled} />
          </div>
          <Button type="submit" disabled={disabled || !name.trim() || name === account.name}>Save</Button>
        </form>
        <Row label="Email" hint="Primary email shared by GitHub. Not shown publicly.">
          <span className="text-sm text-fg-2">{account.email || "Not shared"}</span>
        </Row>
      </Section>

      <Section title="Preferences" description="Defaults applied across the dashboard.">
        <Row label="Theme" htmlFor="theme">
          <Select
            id="theme"
            value={prefs.theme}
            disabled={disabled}
            onChange={(e) => {
              setTheme(e.target.value);
              save({ theme: e.target.value });
            }}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </Select>
        </Row>
        <Row label="Default date range" htmlFor="range">
          <Select id="range" value={prefs.defaultRange} disabled={disabled} onChange={(e) => save({ defaultRange: e.target.value })}>
            {Object.entries(RANGES).map(([key, r]) => (
              <option key={key} value={key}>{r.label}</option>
            ))}
          </Select>
        </Row>
        <Row label="Default repository filter" hint="Used by Repositories and Languages." htmlFor="scope">
          <Select id="scope" value={prefs.defaultRepoScope} disabled={disabled} onChange={(e) => save({ defaultRepoScope: e.target.value })}>
            <option value="all">All repositories</option>
            <option value="owned">Owned only</option>
            <option value="exclude-forks">Exclude forks</option>
          </Select>
        </Row>
        <Row label="Timezone" hint="Days, weeks and hours are calculated in this timezone." htmlFor="tz">
          <Select id="tz" value={prefs.timezone} disabled={disabled} onChange={(e) => save({ timezone: e.target.value })} className="max-w-60">
            {timezones.map((tz) => (
              <option key={tz} value={tz}>{tz}</option>
            ))}
          </Select>
        </Row>
      </Section>

      <Section title="Privacy" description="Control what appears on your public developer profile.">
        <Row label="Public profile" hint={account.login ? `Visible at /u/${account.login}` : undefined} htmlFor="public">
          <Toggle id="public" checked={prefs.publicProfile} disabled={disabled} onChange={(v) => save({ publicProfile: v })} />
        </Row>
        <Row label="Show activity" hint="Contribution calendar and yearly stats on your profile." htmlFor="activity">
          <Toggle id="activity" checked={prefs.profileShowActivity} disabled={disabled} onChange={(v) => save({ profileShowActivity: v })} />
        </Row>
        <Row label="Include private repositories" hint="Off by default. When off, private repositories and their activity never appear on your profile." htmlFor="private">
          <Toggle id="private" checked={prefs.profileShowPrivateRepos} disabled={disabled} onChange={(v) => save({ profileShowPrivateRepos: v })} />
        </Row>
        {account.login && (
          <a href={`/u/${account.login}`} className="inline-flex items-center gap-1 text-xs text-fg-2 hover:text-fg">
            Preview profile <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </a>
        )}
      </Section>

      <Section title="Data" description="Synchronization and account removal.">
        <Row
          label="Last synchronization"
          hint={syncState.active ? "Sync in progress…" : sync.lastError ? sync.lastError : syncState.lastSyncedAt ? formatDateTime(syncState.lastSyncedAt) : "Never"}
        >
          <Button onClick={() => syncState.start()} disabled={disabled || syncState.active || syncState.starting}>
            {syncState.active ? "Syncing…" : "Sync now"}
          </Button>
        </Row>
        {syncState.requestError && <p role="alert" className="text-xs text-critical">{syncState.requestError}</p>}
        <Row label="Disconnect GitHub" hint="Revokes DevTrace's access, deletes the stored token and all synced GitHub data, and signs you out.">
          <ConfirmAction
            disabled={disabled}
            trigger="Disconnect"
            title="Disconnect GitHub?"
            description="DevTrace will revoke its GitHub authorization and delete your synced repositories, commits, pull requests and issues. Signing in again will reconnect and resync."
            confirmLabel="Disconnect GitHub"
            request={() => fetch("/api/account/disconnect", { method: "POST" })}
          />
        </Row>
        <Row label="Delete DevTrace account" hint="Permanently deletes your account, preferences and all synced data.">
          <ConfirmAction
            disabled={disabled}
            trigger="Delete account"
            title="Delete your DevTrace account?"
            description="This can't be undone. Everything DevTrace stores about you will be deleted and its GitHub authorization revoked."
            confirmLabel="Delete account"
            requireText={account.login || "delete"}
            request={(confirm) =>
              fetch("/api/account", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirm }),
              })
            }
          />
        </Row>
      </Section>
    </div>
  );
}

function ConfirmAction({ trigger, title, description, confirmLabel, request, requireText, disabled }) {
  const router = useRouter();
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);
  const ready = !requireText || typed.trim().toLowerCase() === requireText.toLowerCase();

  async function run() {
    setPending(true);
    setError(null);
    try {
      const res = await request(typed.trim());
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error?.message || "The request failed.");
      // The session no longer exists; return to the landing page signed out
      router.replace("/");
      router.refresh();
    } catch (e) {
      setError(e.message);
      setPending(false);
    }
  }

  return (
    <Dialog onOpenChange={() => { setTyped(""); setError(null); }}>
      <DialogTrigger asChild>
        <Button variant="danger" disabled={disabled}>{trigger}</Button>
      </DialogTrigger>
      <DialogContent title={title} description={description}>
        {requireText && (
          <div className="mb-4 flex flex-col gap-1.5">
            <Label htmlFor="confirm-text">
              Type <span className="font-mono text-fg">{requireText}</span> to confirm
            </Label>
            <Input id="confirm-text" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
        )}
        {error && <p role="alert" className="mb-3 text-sm text-critical">{error}</p>}
        <div className="flex justify-end gap-2">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button variant="dangerSolid" onClick={run} disabled={!ready || pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
