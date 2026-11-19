import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchPublicFeed, isPublicFeedAddress, validatePublicFeedUrl, type FeedAddressResolver } from "../src/lib/services/safe-feed-url.ts";

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
    const fetched: string[] = [];
    const response = await fetchPublicFeed("https://calendar.example/feed.ics", {
      fetcher: async (url, init) => {
        fetched.push(url);
        assert.equal(init.redirect, "manual");
        return new Response(null, { status: 302, headers: { location: "http://metadata.internal/latest" } });
      },
      resolver: resolver({ "calendar.example": ["8.8.8.8"] }),
    }).catch((error: unknown) => error);

    assert.match(String(response), /not allowed/);
    assert.deepEqual(fetched, ["https://calendar.example/feed.ics"]);
  });

  it("follows a bounded public redirect and returns the terminal response", async () => {
    const fetched: string[] = [];
    const response = await fetchPublicFeed("https://calendar.example/feed.ics", {
      fetcher: async (url) => {
        fetched.push(url);
        if (fetched.length === 1) return new Response(null, { status: 307, headers: { location: "https://cdn.example/feed.ics" } });
        return new Response("BEGIN:VCALENDAR", { status: 200 });
      },
      resolver: resolver({ "calendar.example": ["8.8.8.8"], "cdn.example": ["1.1.1.1"] }),
    });

    assert.equal(await response.text(), "BEGIN:VCALENDAR");
    assert.deepEqual(fetched, ["https://calendar.example/feed.ics", "https://cdn.example/feed.ics"]);
  });
});
