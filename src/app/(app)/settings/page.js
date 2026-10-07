import { getPageContext } from "@/server/page-context";
import { getLastCompletedSync, getLatestSyncJob } from "@/server/sync/jobs";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsForm } from "@/components/app/settings-form";
import { describeSyncError } from "@/lib/sync-stages";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ searchParams }) {
  const params = await searchParams;
  const { user, prefs } = await getPageContext(params);
  const [lastSync, latest] = await Promise.all([getLastCompletedSync(user.id), getLatestSyncJob(user.id)]);

  return (
    <>
      <PageHeader title="Settings" description="Account, preferences, privacy and data." />
      <SettingsForm
        isDemo={user.isDemo}
        account={{
          name: user.name || "",
          email: user.email,
          avatarUrl: user.github?.avatarUrl || user.image,
          login: user.github?.login,
          profileUrl: user.isDemo ? null : user.github?.profileUrl,
        }}
        preferences={{
          theme: prefs.theme,
          defaultRange: prefs.defaultRange,
          defaultRepoScope: prefs.defaultRepoScope,
          timezone: prefs.timezone || "UTC",
          publicProfile: prefs.publicProfile,
          profileShowActivity: prefs.profileShowActivity,
          profileShowPrivateRepos: prefs.profileShowPrivateRepos,
        }}
        sync={{
          lastSyncedAt: lastSync?.finishedAt?.toISOString() || null,
          lastError: latest?.status === "failed" ? describeSyncError(latest.errorCode) : null,
        }}
      />
    </>
  );
}
