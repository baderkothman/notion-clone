import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function Breadcrumbs({
  workspaceSlug,
  trail,
}: {
  workspaceSlug: string;
  trail: { id: string; title: string; icon: string | null }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1 text-sm text-text-muted">
      {trail.map((crumb, index) => (
        <span key={crumb.id} className="flex min-w-0 items-center gap-1">
          {index > 0 ? <ChevronRight className="size-3 shrink-0 text-text-faint" /> : null}
          {index === trail.length - 1 ? (
            <span className="truncate font-medium text-text">{crumb.title || "Untitled"}</span>
          ) : (
            <Link href={`/w/${workspaceSlug}/p/${crumb.id}`} className="truncate hover:text-text hover:underline">
              {crumb.title || "Untitled"}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
