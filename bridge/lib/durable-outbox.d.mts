export class DurableLatestStateOutbox<T extends { eventId?: string } = { eventId?: string }> {
  constructor(path: string);
  path: string;
  pending: T | null;
  load(): Promise<T | null>;
  put(envelope: T): Promise<void>;
  acknowledge(envelope: T): Promise<void>;
}
