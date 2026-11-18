export type SyncReadJobTarget = {
  id: string;
  sourceId: string | null;
};

export type SyncReadQueueTarget = {
  fieldId: string | null;
  id: string;
  syncJobId: string;
};

export type SyncReadSourceTarget = {
  id: string;
  venueId: string;
};

export function getScopedSyncReadIds({
  allowedFieldIds,
  allowedVenueIds,
  jobs,
  queue,
  sources,
}: {
  allowedFieldIds: ReadonlySet<string>;
  allowedVenueIds: ReadonlySet<string>;
  jobs: SyncReadJobTarget[];
  queue: SyncReadQueueTarget[];
  sources: SyncReadSourceTarget[];
}) {
  const sourceVenueById = new Map(sources.map((source) => [source.id, source.venueId]));
  const queueByJobId = new Map<string, SyncReadQueueTarget[]>();
  for (const item of queue) {
    const items = queueByJobId.get(item.syncJobId) ?? [];
    items.push(item);
    queueByJobId.set(item.syncJobId, items);
  }

  const jobIds = new Set<string>();
  for (const job of jobs) {
    const items = queueByJobId.get(job.id) ?? [];
    const sourceVenueId = job.sourceId ? sourceVenueById.get(job.sourceId) : null;
    const sourceAllowed = job.sourceId ? Boolean(sourceVenueId && allowedVenueIds.has(sourceVenueId)) : true;
    // Job aggregates can contain counts from every queue row, so a mixed-scope
    // job is hidden in full instead of returning only its in-scope children.
    const queueAllowed = items.length > 0
      && items.every((item) => Boolean(item.fieldId && allowedFieldIds.has(item.fieldId)));
    if (sourceAllowed && queueAllowed) jobIds.add(job.id);
    if (sourceAllowed && items.length === 0 && job.sourceId) jobIds.add(job.id);
  }

  const queueIds = new Set(queue
    .filter((item) => jobIds.has(item.syncJobId) && Boolean(item.fieldId && allowedFieldIds.has(item.fieldId)))
    .map((item) => item.id));

  return { jobIds, queueIds };
}
