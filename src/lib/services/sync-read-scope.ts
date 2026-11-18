export type SyncReadJobTarget = {
  id: string;
};

export type SyncReadQueueTarget = {
  id: string;
  syncJobId: string;
  venueId: string | null;
};

export type SyncReadJobVenue = {
  syncJobId: string;
  venueId: string;
};

export function getScopedSyncReadIds({
  allowedVenueIds,
  jobVenues,
  jobs,
  queue,
}: {
  allowedVenueIds: ReadonlySet<string>;
  jobVenues: SyncReadJobVenue[];
  jobs: SyncReadJobTarget[];
  queue: SyncReadQueueTarget[];
}) {
  const venuesByJobId = new Map<string, string[]>();
  for (const ownership of jobVenues) {
    const venueIds = venuesByJobId.get(ownership.syncJobId) ?? [];
    venueIds.push(ownership.venueId);
    venuesByJobId.set(ownership.syncJobId, venueIds);
  }
  const queueByJobId = new Map<string, SyncReadQueueTarget[]>();
  for (const item of queue) {
    const items = queueByJobId.get(item.syncJobId) ?? [];
    items.push(item);
    queueByJobId.set(item.syncJobId, items);
  }

  const jobIds = new Set<string>();
  for (const job of jobs) {
    const venueIds = venuesByJobId.get(job.id) ?? [];
    const items = queueByJobId.get(job.id) ?? [];
    // Job aggregates can contain counts from every queue row, so a mixed-scope
    // job is hidden in full instead of returning only its in-scope children.
    const queueOwnershipIsSafe = items.every((item) => Boolean(item.venueId && allowedVenueIds.has(item.venueId)));
    if (venueIds.length > 0 && venueIds.every((venueId) => allowedVenueIds.has(venueId)) && queueOwnershipIsSafe) {
      jobIds.add(job.id);
    }
  }

  const queueIds = new Set(queue
    .filter((item) => jobIds.has(item.syncJobId) && Boolean(item.venueId && allowedVenueIds.has(item.venueId)))
    .map((item) => item.id));

  return { jobIds, queueIds };
}
