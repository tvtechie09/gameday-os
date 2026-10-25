import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export class DurableLatestStateOutbox {
  constructor(path) {
    this.path = path;
    this.pending = null;
  }

  async load() {
    try {
      this.pending = JSON.parse(await readFile(this.path, "utf8"));
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    return this.pending;
  }

  async put(envelope) {
    await mkdir(dirname(this.path), { recursive: true });
    const temporary = `${this.path}.tmp`;
    await writeFile(temporary, JSON.stringify(envelope), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, this.path);
    this.pending = envelope;
  }

  async acknowledge(envelope) {
    if (this.pending?.eventId !== envelope.eventId) return;
    await this.put({});
    this.pending = null;
  }
}
