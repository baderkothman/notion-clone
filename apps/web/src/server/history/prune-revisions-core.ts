const ONE_HOUR_MS = 60 * 60 * 1000;
const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const THIRTY_DAYS_MS = 30 * ONE_DAY_MS;

export interface RevisionStub {
  id: string;
  createdAt: Date;
}

/**
 * Pure bucketing policy — no I/O — so it's unit-testable without a database. See
 * prune-revisions.ts for the DB-backed wrapper.
 *
 * Every revision from the last 24h is kept (each gets its own bucket — the 5-minute
 * throttle in snapshot-policy.ts already bounds how many that can be). Revisions from
 * 24h–30 days ago are thinned to one per hour (the newest in each hour survives).
 * Revisions older than 30 days are thinned to one per day.
 */
export function idsToPrune(revisions: RevisionStub[], now: number): string[] {
  const seenBuckets = new Set<string>();
  const toDelete: string[] = [];

  // Newest first, so the first revision seen in a given bucket (the one kept) is always
  // the most recent one in that bucket.
  const sorted = [...revisions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  for (const revision of sorted) {
    const age = now - revision.createdAt.getTime();
    let bucketKey: string;

    if (age < ONE_DAY_MS) {
      bucketKey = revision.id;
    } else if (age < THIRTY_DAYS_MS) {
      bucketKey = `hour:${Math.floor(revision.createdAt.getTime() / ONE_HOUR_MS)}`;
    } else {
      bucketKey = `day:${Math.floor(revision.createdAt.getTime() / ONE_DAY_MS)}`;
    }

    if (seenBuckets.has(bucketKey)) {
      toDelete.push(revision.id);
    } else {
      seenBuckets.add(bucketKey);
    }
  }

  return toDelete;
}
