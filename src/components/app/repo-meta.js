import { GitFork, Lock, Star } from "lucide-react";
import { formatCompact } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

export function LanguageLabel({ language, className = "" }) {
  if (!language) return <span className={`text-fg-3 ${className}`}>—</span>;
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="h-2 w-2 rounded-full bg-fg-3" aria-hidden="true" />
      {language}
    </span>
  );
}

export function RepoStats({ stars, forks }) {
  return (
    <>
      <span className="inline-flex items-center gap-1" title={`${stars} stars`}>
        <Star className="h-3 w-3" aria-hidden="true" />
        <span className="tabular">{formatCompact(stars)}</span>
        <span className="sr-only">stars</span>
      </span>
      <span className="inline-flex items-center gap-1" title={`${forks} forks`}>
        <GitFork className="h-3 w-3" aria-hidden="true" />
        <span className="tabular">{formatCompact(forks)}</span>
        <span className="sr-only">forks</span>
      </span>
    </>
  );
}

export function RepoFlags({ repo }) {
  return (
    <>
      {repo.isPrivate && (
        <Badge>
          <Lock className="h-2.5 w-2.5" aria-hidden="true" /> Private
        </Badge>
      )}
      {repo.isFork && <Badge>Fork</Badge>}
      {repo.isArchived && <Badge tone="warning">Archived</Badge>}
      {repo.isAffiliated === false && <Badge tone="accent">Contribution</Badge>}
    </>
  );
}
