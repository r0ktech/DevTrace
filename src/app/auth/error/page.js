import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ConnectGitHubButton } from "@/components/app/connect-github-button";
import { githubConfigured } from "@/server/auth/options";

export const metadata = { title: "Sign-in problem" };

// NextAuth error codes → what happened and what to do
const MESSAGES = {
  AccessDenied: {
    title: "GitHub access was not granted",
    body: "You cancelled the authorization on GitHub, or DevTrace wasn't allowed to continue. Nothing was stored.",
  },
  OAuthSignin: {
    title: "Couldn't start GitHub sign-in",
    body: "DevTrace couldn't build the GitHub authorization request. This usually means the GitHub OAuth app isn't configured on this server.",
  },
  OAuthCallback: {
    title: "GitHub sign-in didn't complete",
    body: "GitHub redirected back, but the response couldn't be verified. This can happen if the sign-in took too long or was opened in another tab. Try again.",
  },
  OAuthAccountNotLinked: {
    title: "This GitHub account is linked elsewhere",
    body: "The GitHub account is already connected to a different DevTrace account. Sign in with that account instead.",
  },
  OAuthCreateAccount: {
    title: "Couldn't create your account",
    body: "GitHub sign-in worked, but DevTrace couldn't save your account. Check that the database is available and try again.",
  },
  Callback: {
    title: "GitHub sign-in didn't complete",
    body: "Something failed while finishing sign-in. If you were viewing the demo, exit it first and then connect GitHub.",
  },
  Configuration: {
    title: "Sign-in isn't configured",
    body: "The server is missing GitHub OAuth or session settings. If you run this DevTrace instance, check GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET and NEXTAUTH_SECRET.",
  },
};

const FALLBACK = {
  title: "Sign-in couldn't be completed",
  body: "GitHub sign-in failed for an unknown reason. Try again; if it keeps happening, the server logs will have details.",
};

export default async function AuthErrorPage({ searchParams }) {
  const { error } = await searchParams;
  const configured = githubConfigured();
  // Missing credentials is the most common setup problem; say so precisely
  const message = !configured
    ? {
        title: "GitHub sign-in isn't configured",
        body: "This server has no GitHub OAuth app credentials. Create an OAuth app at github.com/settings/developers with the callback URL below, set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in .env, and restart the server.",
      }
    : MESSAGES[error] || FALLBACK;
  const callbackUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/github`;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Logo className="mb-10" />
        <h1 className="text-xl font-semibold tracking-tight">{message.title}</h1>
        <p className="mt-2 text-sm text-fg-2">{message.body}</p>
        {(!configured || error === "OAuthCallback" || error === "OAuthSignin") && (
          <p className="mt-3 text-xs text-fg-3">
            Callback URL: <code className="break-all font-mono text-fg-2">{callbackUrl}</code>
          </p>
        )}
        {error && <p className="mt-2 font-mono text-2xs text-fg-3">Error code: {String(error).slice(0, 40)}</p>}
        <div className="mt-8 flex gap-2">
          <ConnectGitHubButton size="md" label="Try again" configured={configured} />
          <Button asChild variant="ghost">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
