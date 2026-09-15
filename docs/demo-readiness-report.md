# Demo Readiness

The live readiness record is **Admin → Demo Readiness**. It evaluates each disposable demo tenant for:

- complete venue profile;
- fields and QR destinations;
- twelve resettable demo games;
- configured weather posture;
- a shareable non-local public URL; and
- optional sponsor/campaign proof.

Supporting documents:

- `docs/client-readiness/buyer-demo.md`
- `docs/client-readiness/implementation-kit.md`
- `docs/client-readiness/integration-maturity.md`
- `docs/client-readiness/pilot-proposal.md`
- `docs/client-readiness/staging-and-rollback.md`

Run `npm run verify:client-readiness` before a meeting. Set `CLIENT_READINESS_BASE_URL` to a staging or deployed URL to include HTTP route and authentication-redirect checks.
