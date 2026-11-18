import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

export type FeedAddressResolver = (hostname: string) => Promise<ReadonlyArray<{ address: string }>>;
export type FeedFetcher = (input: string, init: RequestInit) => Promise<Response>;

const blockedIpv4 = new BlockList();
for (const [network, prefix] of [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
] as const) {
  blockedIpv4.addSubnet(network, prefix, "ipv4");
}

const globalIpv6 = new BlockList();
globalIpv6.addSubnet("2000::", 3, "ipv6");
const blockedIpv6 = new BlockList();
blockedIpv6.addSubnet("2001:db8::", 32, "ipv6");

export function isPublicFeedAddress(address: string) {
  const family = isIP(address);
  if (family === 4) return !blockedIpv4.check(address, "ipv4");
  if (family === 6) {
    return globalIpv6.check(address, "ipv6") && !blockedIpv6.check(address, "ipv6");
  }
  return false;
}

const defaultResolver: FeedAddressResolver = async (hostname) => lookup(hostname, { all: true, verbatim: true });

function normalizedHostname(url: URL) {
  return url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

export async function validatePublicFeedUrl(rawUrl: string | URL, resolver: FeedAddressResolver = defaultResolver) {
  const url = rawUrl instanceof URL ? new URL(rawUrl) : new URL(rawUrl);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new Error("Feed URL is not allowed.");
  }

  const hostname = normalizedHostname(url);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")
    || hostname.endsWith(".internal") || hostname.endsWith(".home") || hostname.endsWith(".lan")) {
    throw new Error("Feed URL is not allowed.");
  }

  const literalFamily = isIP(hostname);
  const addresses = literalFamily ? [{ address: hostname }] : await resolver(hostname);
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicFeedAddress(address))) {
    throw new Error("Feed URL is not allowed.");
  }
  return url;
}

const redirectStatuses = new Set([301, 302, 303, 307, 308]);

export async function fetchPublicFeed(
  rawUrl: string,
  options: { fetcher?: FeedFetcher; maxRedirects?: number; resolver?: FeedAddressResolver } = {},
) {
  const fetcher = options.fetcher ?? fetch;
  const maxRedirects = options.maxRedirects ?? 3;
  let currentUrl = new URL(rawUrl);

  for (let redirectCount = 0; ; redirectCount += 1) {
    await validatePublicFeedUrl(currentUrl, options.resolver);
    const response = await fetcher(currentUrl.toString(), {
      cache: "no-store",
      headers: { Accept: "text/calendar,text/plain,*/*" },
      redirect: "manual",
    });
    if (!redirectStatuses.has(response.status)) return response;
    if (redirectCount >= maxRedirects) throw new Error("Feed redirect limit exceeded.");
    const location = response.headers.get("location");
    if (!location) throw new Error("Feed redirect is missing a destination.");
    currentUrl = new URL(location, currentUrl);
  }
}
