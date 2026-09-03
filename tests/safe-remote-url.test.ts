import assert from "node:assert/strict";
import test from "node:test";
import { isPublicInternetAddress, validatePublicHttpsUrl } from "../src/lib/safe-remote-url-core.ts";

test("calendar imports allow only credential-free HTTPS URLs", () => {
  assert.equal(validatePublicHttpsUrl("https://calendar.example.com/feed.ics").hostname, "calendar.example.com");
  for (const value of ["http://calendar.example.com/feed.ics", "https://user:pass@example.com/feed.ics", "https://localhost/feed.ics", "https://calendar.local/feed.ics"]) {
    assert.throws(() => validatePublicHttpsUrl(value));
  }
});

test("private, loopback, link-local, mapped, and documentation addresses are rejected", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.0.1", "192.168.1.1", "169.254.1.1", "100.64.0.1", "192.0.2.1", "198.51.100.1", "203.0.113.1", "::1", "fe80::1", "fd00::1", "::ffff:127.0.0.1", "2001:db8::1"]) {
    assert.equal(isPublicInternetAddress(address), false, address);
  }
  assert.equal(isPublicInternetAddress("8.8.8.8"), true);
  assert.equal(isPublicInternetAddress("2606:4700:4700::1111"), true);
});
