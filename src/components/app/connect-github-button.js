"use client";

import { useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { GitHubMark } from "@/components/brand/github-mark";
import { Button } from "@/components/ui/button";

/**
 * Starts GitHub OAuth. From the demo session we sign out first so the
 * GitHub account becomes a new DevTrace account, never the demo user's.
 */
export function ConnectGitHubButton({ fromDemo = false, label = "Connect GitHub", variant = "primary", size = "lg", className, configured = true }) {
  const [pending, setPending] = useState(false);
  if (!configured) {
    return (
      <Button
        variant={variant}
        size={size}
        className={className}
        disabled
        title="GitHub sign-in isn't configured on this server. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET."
      >
        <GitHubMark />
        {label}
      </Button>
    );
  }
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        if (fromDemo) await signOut({ redirect: false });
        await signIn("github", { callbackUrl: "/sync" });
      }}
    >
      <GitHubMark />
      {pending ? "Redirecting to GitHub…" : label}
    </Button>
  );
}
