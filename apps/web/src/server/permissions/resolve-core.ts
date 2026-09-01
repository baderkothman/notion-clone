import type { EffectivePermission, ShareRole } from "@notion-clone/contracts";
import { SHARE_ROLE_RANK } from "@notion-clone/contracts";
import type { WorkspaceRole } from "@notion-clone/contracts";

/** One page in the ancestor chain, nearest (the page itself) first, root last. */
export interface ChainEntry {
  pageId: string;
  visibility: "private" | "workspace";
  workspaceShareRole: ShareRole;
  /** This user's explicit share role on this exact page, if any. */
  explicitRole: ShareRole | null;
}

/**
 * Pure decision function — no I/O — so hierarchy/permission logic is unit-testable
 * without a database. See resolve.ts for the DB-backed wrapper that builds `chain`.
 *
 * Precedence, nearest ancestor wins: explicit share on this page > workspace visibility
 * on this page > explicit share on parent > workspace visibility on parent > ... Guests
 * never gain access via workspace visibility, only via explicit shares.
 */
export function resolveEffectiveRole(
  chain: ChainEntry[],
  requesterWorkspaceRole: WorkspaceRole | null,
  isCreatorOfLeaf: boolean,
): EffectivePermission {
  if (isCreatorOfLeaf) return { role: "full", source: "owner" };
  if (!requesterWorkspaceRole) return { role: null, source: null };

  for (let i = 0; i < chain.length; i++) {
    const entry = chain[i];
    if (!entry) continue;
    const isLeaf = i === 0;

    if (entry.explicitRole) {
      return { role: entry.explicitRole, source: isLeaf ? "explicit" : "inherited" };
    }
    if (entry.visibility === "workspace" && requesterWorkspaceRole !== "guest") {
      return { role: entry.workspaceShareRole, source: isLeaf ? "workspace" : "inherited" };
    }
  }

  return { role: null, source: null };
}

export function roleAtLeast(role: ShareRole | null, minimum: ShareRole): boolean {
  if (!role) return false;
  return SHARE_ROLE_RANK[role] >= SHARE_ROLE_RANK[minimum];
}
