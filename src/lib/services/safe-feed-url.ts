import { lookup } from "node:dns/promises";
import { request as httpRequest, type IncomingHttpHeaders, type RequestOptions } from "node:http";
import { request as httpsRequest } from "node:https";
import { BlockList, isIP } from "node:net";

export type FeedAddressResolver = (hostname: string) => Promise<ReadonlyArray<{ address: string }>>;
export type ResolvedFeedAddress = { address: string; family: 4 | 6 };
export type FeedTransport = (
  url: URL,
  addresses: ReadonlyArray<ResolvedFeedAddress>,
  options: { maxResponseBytes: number; signal: AbortSignal },
) => Promise<Response>;

export const defaultFeedMaxResponseBytes = 5 * 1024 * 1024;
export const defaultFeedTimeoutMs = 15_000;

export class FeedFetchPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedFetchPolicyError";
  }
}

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
  if (family === 6) return globalIpv6.check(address, "ipv6") && !blockedIpv6.check(address, "ipv6");
  return false;
}

const defaultResolver: FeedAddressResolver = async (hostname) => lookup(hostname, { all: true, verbatim: true });

function normalizedHostname(url: URL) {
  return url.hostname.replace(/^\[|\]$/g, "").replace(/\.$/, "").toLowerCase();
}

export async function resolvePublicFeedUrl(rawUrl: string | URL, resolver: FeedAddressResolver = defaultResolver) {
  const url = rawUrl instanceof URL ? new URL(rawUrl) : new URL(rawUrl);
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
    throw new FeedFetchPolicyError("Feed URL is not allowed.");
  }

  const hostname = normalizedHostname(url);
  if (!hostname || hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local")
    || hostname.endsWith(".internal") || hostname.endsWith(".home") || hostname.endsWith(".lan")) {
    throw new FeedFetchPolicyError("Feed URL is not allowed.");
  }

  const literalFamily = isIP(hostname);
  const answers = literalFamily ? [{ address: hostname }] : await resolver(hostname);
  if (answers.length === 0 || answers.some(({ address }) => !isPublicFeedAddress(address))) {
    throw new FeedFetchPolicyError("Feed URL is not allowed.");
  }
  const addresses = [...new Map(answers.map(({ address }) => {
    const family = isIP(address);
    return [`${family}:${address}`, { address, family: family as 4 | 6 }];
  })).values()];
  return { addresses, url };
}

export async function validatePublicFeedUrl(rawUrl: string | URL, resolver: FeedAddressResolver = defaultResolver) {
  return (await resolvePublicFeedUrl(rawUrl, resolver)).url;
}

export async function readBoundedFeedBody(body: AsyncIterable<Uint8Array>, maxResponseBytes: number) {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of body) {
    const buffer = Buffer.from(chunk);
    total += buffer.byteLength;
    if (total > maxResponseBytes) throw new FeedFetchPolicyError("Feed response is too large.");
    chunks.push(buffer);
  }
  return Buffer.concat(chunks, total);
}

function responseHeaders(headers: IncomingHttpHeaders) {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => result.append(name, item));
    else if (value !== undefined) result.set(name, value);
  }
  return result;
}

const redirectStatuses = new Set([301, 302, 303, 307, 308]);

function requestPinnedAddress(
  url: URL,
  resolvedAddress: ResolvedFeedAddress,
  { maxResponseBytes, signal }: { maxResponseBytes: number; signal: AbortSignal },
) {
  return new Promise<Response>((resolve, reject) => {
    // Keep the original URL hostname for Host/TLS SNI, but never let the
    // connection perform a second DNS lookup after policy validation.
    const lookupPinnedAddress: NonNullable<RequestOptions["lookup"]> = (_hostname, _options, callback) => {
      callback(null, resolvedAddress.address, resolvedAddress.family);
    };
    const requester = url.protocol === "https:" ? httpsRequest : httpRequest;
    const request = requester(url, {
      agent: false,
      family: resolvedAddress.family,
      headers: {
        Accept: "text/calendar,text/plain,*/*",
        "Accept-Encoding": "identity",
      },
      lookup: lookupPinnedAddress,
      method: "GET",
      signal,
    }, async (response) => {
      try {
        const status = response.statusCode ?? 500;
        const headers = responseHeaders(response.headers);
        if (redirectStatuses.has(status)) {
          response.destroy();
          resolve(new Response(null, { headers, status }));
          return;
        }
        const encoding = response.headers["content-encoding"];
        if (encoding && encoding !== "identity") throw new FeedFetchPolicyError("Encoded feed responses are not allowed.");
        const declaredLength = Number(response.headers["content-length"] ?? 0);
        if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
          throw new FeedFetchPolicyError("Feed response is too large.");
        }
        const body = await readBoundedFeedBody(response, maxResponseBytes);
        const responseBody = status === 204 || status === 205 || status === 304 ? null : body;
        resolve(new Response(responseBody, { headers, status, statusText: response.statusMessage }));
      } catch (error) {
        response.destroy();
        reject(error);
      }
    });
    request.on("error", reject);
    request.end();
  });
}

const defaultTransport: FeedTransport = async (url, addresses, options) => {
  let lastError: unknown = new Error("Feed request failed.");
  for (const address of addresses.slice(0, 8)) {
    if (options.signal.aborted) throw new FeedFetchPolicyError("Feed request timed out.");
    try {
      return await requestPinnedAddress(url, address, options);
    } catch (error) {
      if (error instanceof FeedFetchPolicyError || options.signal.aborted) throw error;
      lastError = error;
    }
  }
  throw lastError;
};

function abortable<T>(promise: Promise<T>, signal: AbortSignal) {
  if (signal.aborted) return Promise.reject(new FeedFetchPolicyError("Feed request timed out."));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new FeedFetchPolicyError("Feed request timed out."));
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      (value) => { signal.removeEventListener("abort", onAbort); resolve(value); },
      (error) => { signal.removeEventListener("abort", onAbort); reject(error); },
    );
  });
}

export async function fetchPublicFeed(
  rawUrl: string,
  options: {
    maxRedirects?: number;
    maxResponseBytes?: number;
    resolver?: FeedAddressResolver;
    timeoutMs?: number;
    transport?: FeedTransport;
  } = {},
) {
  const controller = new AbortController();
  const timeoutMs = Math.max(1, options.timeoutMs ?? defaultFeedTimeoutMs);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const maxRedirects = Math.min(10, Math.max(0, options.maxRedirects ?? 3));
  const maxResponseBytes = Math.max(1, options.maxResponseBytes ?? defaultFeedMaxResponseBytes);
  const transport = options.transport ?? defaultTransport;
  let currentUrl = new URL(rawUrl);

  try {
    for (let redirectCount = 0; ; redirectCount += 1) {
      const resolved = await abortable(resolvePublicFeedUrl(currentUrl, options.resolver), controller.signal);
      const response = await abortable(transport(resolved.url, resolved.addresses, {
        maxResponseBytes,
        signal: controller.signal,
      }), controller.signal);
      if (!redirectStatuses.has(response.status)) return response;
      if (redirectCount >= maxRedirects) throw new FeedFetchPolicyError("Feed redirect limit exceeded.");
      const location = response.headers.get("location");
      if (!location) throw new FeedFetchPolicyError("Feed redirect is missing a destination.");
      currentUrl = new URL(location, currentUrl);
    }
  } finally {
    clearTimeout(timer);
  }
}
