import {
  Activity,
  Braces,
  CircleDot,
  FolderGit2,
  GitCommitHorizontal,
  GitPullRequest,
  LayoutGrid,
  Lightbulb,
  Settings2,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/activity", label: "Activity", icon: Activity },
  { href: "/repositories", label: "Repositories", icon: FolderGit2 },
  { href: "/commits", label: "Commits", icon: GitCommitHorizontal },
  { href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
  { href: "/issues", label: "Issues", icon: CircleDot },
  { href: "/languages", label: "Languages", icon: Braces },
  { href: "/insights", label: "Insights", icon: Lightbulb },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

// Shown in the mobile bottom bar; the rest live under "More"
export const MOBILE_PRIMARY = ["/dashboard", "/activity", "/repositories", "/insights"];

export function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
