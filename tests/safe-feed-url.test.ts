import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import {
  fetchPublicFeed,
  isPublicFeedAddress,
  readBoundedFeedBody,
  validatePublicFeedUrl,
  type FeedAddressResolver,
  type FeedTransport,
} from "../src/lib/services/safe-feed-url.ts";

function resolver(entries: Record<string, string[]>): FeedAddressResolver {
  return async (hostname) => (entries[hostname] ?? []).map((address) => ({ address }));
}

describe("safe calendar feed URLs", () => {
  it("allows globally routable IPv4 and IPv6 addresses", () => {
    assert.equal(isPublicFeedAddress("8.8.8.8"), true);
    assert.equal(isPublicFeedAddress("2606:4700:4700::1111"), true);
  });

  it("denies loopback, private, link-local, carrier, documentation, and non-unicast ranges", () => {
    for (const address of [
      "0.0.0.1", "10.0.0.1", "100.64.0.1", "127.0.0.1", "169.254.169.254", "172.16.0.1",
      "192.0.2.1", "192.168.1.1", "198.18.0.1", "198.51.100.1", "203.0.113.1", "224.0.0.1",
      "::1", "fe80::1", "fc00::1", "2001:db8::1", "::ffff:127.0.0.1",
    ]) {
      assert.equal(isPublicFeedAddress(address), false, address);
    }
  });

  it("resolves every hostname and denies mixed public/private answers", async () => {
    const resolve = resolver({
      "calendar.example": ["8.8.8.8"],
      "mixed.example": ["8.8.8.8", "10.0.0.4"],
    });
    assert.equal((await validatePublicFeedUrl("https://calendar.example/feed.ics", resolve)).hostname, "calendar.example");
    await assert.rejects(validatePublicFeedUrl("https://mixed.example/feed.ics", resolve), /not allowed/);
    await assert.rejects(validatePublicFeedUrl("https://missing.example/feed.ics", resolve), /not allowed/);
  });

  it("denies credentials, local names, and non-HTTP protocols before resolution", async () => {
    const neverResolve: FeedAddressResolver = async () => assert.fail("resolver must not run");
    for (const url of [
      "ftp://calendar.example/feed.ics",
      "https://user:secret@calendar.example/feed.ics",
      "http://localhost/feed.ics",
      "http://calendar.internal/feed.ics",
      "http://device.local/feed.ics",
    ]) {
      await assert.rejects(validatePublicFeedUrl(url, neverResolve), /not allowed/);
    }
  });

  it("manually validates every redirect destination before following it", async () => {
    const fetched: Array<{ addresses: string[]; url: string }> = [];
    const response = await fetchPublicFeed("https://calendar.example/feed.ics", {
      transport: async (url, addresses) => {
        fetched.push({ addresses: addresses.map((item) => item.address), url: url.toString() });
        return new Response(null, { status: 302, headers: { location: "http://metadata.internal/latest" } });
      },
      resolver: resolver({ "calendar.example": ["8.8.8.8"] }),
    }).catch((error: unknown) => error);

    assert.match(String(response), /not allowed/);
    assert.deepEqual(fetched, [{ addresses: ["8.8.8.8"], url: "https://calendar.example/feed.ics" }]);
  });

  it("pins each request to that hop's validated addresses", async () => {
    const fetched: string[] = [];
    const response = await fetchPublicFeed("https://calendar.example/feed.ics", {
      transport: async (url, addresses) => {
        fetched.push(`${url.hostname}=${addresses.map((item) => item.address).join(",")}`);
        if (fetched.length === 1) return new Response(null, { status: 307, headers: { location: "https://cdn.example/feed.ics" } });
        return new Response("BEGIN:VCALENDAR", { status: 200 });
      },
      resolver: resolver({ "calendar.example": ["8.8.8.8"], "cdn.example": ["1.1.1.1"] }),
    });

    assert.equal(await response.text(), "BEGIN:VCALENDAR");
    assert.deepEqual(fetched, ["calendar.example=8.8.8.8", "cdn.example=1.1.1.1"]);
  });

  it("aborts a stalled transport at the configured deadline", async () => {
    const stalledTransport: FeedTransport = async (_url, _addresses, { signal }) => new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(new Error("transport aborted")), { once: true });
    });
    await assert.rejects(fetchPublicFeed("https://calendar.example/feed.ics", {
      resolver: resolver({ "calendar.example": ["8.8.8.8"] }),
      timeoutMs: 10,
      transport: stalledTransport,
    }), /timed out/);
  });

  it("rejects response bodies over the byte limit without a network request", async () => {
    async function* chunks() {
      yield Buffer.from("123");
      yield Buffer.from("456");
    }
    await assert.rejects(readBoundedFeedBody(chunks(), 5), /too large/);
    assert.equal((await readBoundedFeedBody(chunks(), 6)).toString(), "123456");
  });

  it("uses a pinned Node transport rather than resolving again through fetch", () => {
    const service = readFileSync("src/lib/services/safe-feed-url.ts", "utf8");
    assert.match(service, /lookupPinnedAddress[\s\S]*resolvedAddress\.address[\s\S]*(?:httpsRequest|httpRequest)/);
    assert.doesNotMatch(service, /\bfetch\(/);
  });
});
