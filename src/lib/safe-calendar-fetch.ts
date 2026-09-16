import "server-only";

import { lookup } from "node:dns/promises";
import { request } from "node:https";
import type { LookupFunction } from "node:net";
import { isPublicInternetAddress, validatePublicHttpsUrl } from "@/lib/safe-remote-url-core";

const MAX_CALENDAR_BYTES = 2 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 8_000;
const MAX_REDIRECTS = 3;

export async function fetchPublicCalendarText(value: string, redirects = 0): Promise<string> {
  if (redirects > MAX_REDIRECTS) throw new Error("Calendar feed redirected too many times.");
  const url = validatePublicHttpsUrl(value);
  const addresses = await lookup(url.hostname, { all: true, verbatim: true });
  if (!addresses.length || addresses.some((address) => !isPublicInternetAddress(address.address))) {
    throw new Error("Calendar feed resolves to a private or reserved network.");
  }
  const pinned = addresses[0];
  const pinnedLookup = ((_hostname: string, _options: object, callback: (error: NodeJS.ErrnoException | null, address: string, family: number) => void) => {
    callback(null, pinned.address, pinned.family);
  }) as LookupFunction;

  return await new Promise<string>((resolve, reject) => {
    const outbound = request(url, {
      method: "GET",
      headers: { Accept: "text/calendar,text/plain;q=0.9" },
      lookup: pinnedLookup,
    }, (response) => {
      const status = response.statusCode ?? 0;
      if (status >= 300 && status < 400 && response.headers.location) {
        response.resume();
        const nextUrl = new URL(response.headers.location, url);
        resolve(fetchPublicCalendarText(nextUrl.toString(), redirects + 1));
        return;
      }
      if (status < 200 || status >= 300) {
        response.resume();
        reject(new Error("Calendar feed returned HTTP " + status + "."));
        return;
      }

      const chunks: Buffer[] = [];
      let total = 0;
      response.on("data", (chunk: Buffer) => {
        total += chunk.length;
        if (total > MAX_CALENDAR_BYTES) {
          outbound.destroy(new Error("Calendar feed exceeds the size limit."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
      response.on("error", reject);
    });
    outbound.setTimeout(REQUEST_TIMEOUT_MS, () => outbound.destroy(new Error("Calendar feed timed out.")));
    outbound.on("error", reject);
    outbound.end();
  });
}
