// Shared between the sync service and the sync progress UI.
export const SYNC_STAGES = [
  { key: "profile", label: "Profile" },
  { key: "repositories", label: "Repositories" },
  { key: "contributions", label: "Contribution calendar" },
  { key: "commits", label: "Commits" },
  { key: "pull_requests", label: "Pull requests" },
  { key: "issues", label: "Issues" },
  { key: "languages", label: "Languages" },
];

export function initialStages() {
  return Object.fromEntries(SYNC_STAGES.map(({ key }) => [key, { status: "pending" }]));
}

// Human-readable explanations for sync failures. Shown to the user verbatim.
export const SYNC_ERROR_MESSAGES = {
  RATE_LIMITED: "GitHub temporarily limited synchronization. DevTrace will retry later.",
  UNAUTHORIZED: "GitHub rejected DevTrace's access token. Reconnect GitHub to continue syncing.",
  NO_TOKEN: "No GitHub connection was found for this account. Connect GitHub to sync.",
  NETWORK_ERROR: "DevTrace could not reach GitHub. Check that GitHub is available and retry.",
  GITHUB_UNAVAILABLE: "GitHub returned a server error. This is usually temporary; retry in a few minutes.",
  STALLED: "The previous sync stopped before finishing. Start a new sync to continue.",
};

export function describeSyncError(code, fallback) {
  return SYNC_ERROR_MESSAGES[code] || fallback || "Synchronization failed.";
}
