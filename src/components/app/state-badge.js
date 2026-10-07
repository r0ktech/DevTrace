import { CircleCheck, CircleDot, GitMerge, GitPullRequest, GitPullRequestClosed, GitPullRequestDraft } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// State is always shown as icon + text, never colour alone.
export function PullRequestState({ state, isDraft }) {
  if (state === "merged") return <Badge tone="merged"><GitMerge className="h-3 w-3" aria-hidden="true" />Merged</Badge>;
  if (state === "closed") return <Badge tone="critical"><GitPullRequestClosed className="h-3 w-3" aria-hidden="true" />Closed</Badge>;
  if (isDraft) return <Badge><GitPullRequestDraft className="h-3 w-3" aria-hidden="true" />Draft</Badge>;
  return <Badge tone="good"><GitPullRequest className="h-3 w-3" aria-hidden="true" />Open</Badge>;
}

export function IssueState({ state }) {
  if (state === "closed") return <Badge tone="merged"><CircleCheck className="h-3 w-3" aria-hidden="true" />Closed</Badge>;
  return <Badge tone="good"><CircleDot className="h-3 w-3" aria-hidden="true" />Open</Badge>;
}
