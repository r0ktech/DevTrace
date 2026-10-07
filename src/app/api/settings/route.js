import prisma from "@/server/db";
import { apiHandler } from "@/server/http";
import { getPreferences, updatePreferences } from "@/server/services/preferences";
import { getLastCompletedSync } from "@/server/sync/jobs";
import { settingsPatch } from "@/server/validation";
import { invalidateUserCache } from "@/server/cache";

function view(user, prefs, lastSync) {
  const github = user.connectedAccounts[0];
  return {
    account: {
      name: user.name,
      email: user.email,
      image: github?.avatarUrl || user.image,
      isDemo: user.isDemo,
      github: github ? { login: github.login, profileUrl: github.profileUrl } : null,
    },
    preferences: {
      theme: prefs.theme,
      defaultRange: prefs.defaultRange,
      defaultRepoScope: prefs.defaultRepoScope,
      timezone: prefs.timezone,
      publicProfile: prefs.publicProfile,
      profileShowActivity: prefs.profileShowActivity,
      profileShowPrivateRepos: prefs.profileShowPrivateRepos,
    },
    lastSyncedAt: lastSync?.finishedAt || null,
  };
}

// GET /api/settings
export const GET = apiHandler(async ({ user }) => {
  const [prefs, lastSync] = await Promise.all([getPreferences(user.id), getLastCompletedSync(user.id)]);
  return view(user, prefs, lastSync);
});

// PATCH /api/settings
export const PATCH = apiHandler(
  async ({ user, request }) => {
    const { name, ...prefs } = settingsPatch.parse(await request.json());
    if (name) await prisma.user.update({ where: { id: user.id }, data: { name } });
    if (Object.keys(prefs).length) await updatePreferences(user.id, prefs);
    if (prefs.timezone || prefs.defaultRange) await invalidateUserCache(user.id);
    const [fresh, lastSync] = await Promise.all([getPreferences(user.id), getLastCompletedSync(user.id)]);
    return view({ ...user, name: name || user.name }, fresh, lastSync);
  },
  { mutation: true, demoAllowed: false, name: "settings" },
);

