# GameDay Improvement 2.2B — Weak-Network Hardening

## Operating contract

GameDay remains online-required for authoritative operations. It does not queue offline mutations, install a service worker, or tell an operator a change succeeded before the server confirms it. A small browser-connectivity notice appears only when the browser reports offline: **Connection lost. Changes cannot be saved right now.** Critical client actions also fail fast while offline and preserve the form/sheet state for retry.

| Workflow | Class | Retry/concurrency truth | Current behavior |
|---|---|---|---|
| Home, Today, public field/venue | read | safe browser refresh | server-rendered stable shells/loading and bounded public error copy |
| Fields status | consequential reversible mutation | timestamp conflict check; no automatic retry | pending lock, authoritative result, refresh on conflict, offline refusal |
| Disruption/game move | consequential mutation | canonical conflict-checked schedule workflow; no automatic retry | confirmation, pending lock, preserved selection/time, authoritative result |
| Work Order create/lifecycle | mutation | lifecycle concurrency timestamp; no automatic retry | pending lock, preserved notes, refresh on conflict, offline refusal |
| Work Order photo | upload | unique object identity; manual retry only | pending lock, preview preserved, lifecycle separated from upload |
| Announcement publish | consequential mutation | no automatic retry | pending lock, draft preserved on failure, offline refusal |
| Notification preferences | idempotent own-user update | safe manual retry | pending lock and offline refusal |
| Universal Search | read | safe, cancellable | 250ms debounce, abort stale requests, 8-second bound, newer query cannot be overwritten |
| Identity Review/Truth | consequential identity decision | server atomic identity decision and separate retryable projection | no generic browser retry added; existing review/concurrency rules remain authoritative |

## Error language and observability

`client-network.ts` centralizes coarse categories for network unavailable, timeout, permission denied, state changed, server unavailable, and upload failure. UI surfaces never include database/provider errors. Existing pilot telemetry records action type, outcome, and coarse duration only; drafts, queries, notes, photos, and provider payloads are excluded.

## Reads and public QR

Public pages remain server-rendered and lightweight. GameDay does not claim to show cached/last-loaded operational state because no durable client cache exists. A failed request uses the existing bounded public error state and a normal refresh is the retry. Adding stale operational caching was deferred because showing an old closure/open state without a freshness contract is unsafe.

## Explicit limitations

- No offline mutation queue, background sync, service worker, or guaranteed cached public page.
- `navigator.onLine` is a fast hint, not proof that the backend is reachable; authoritative failures still come from server actions.
- Server actions are not automatically aborted or retried client-side. This avoids duplicate consequential mutations; their pending UI ends when the request completes or browser/navigation terminates it.
- Real 500ms/several-second/offline/timeout/network-return browser acceptance requires a controllable hosted preview or browser automation and remains a release blocker.

No migration is required. No production deployment is authorized.
