# Staging, Migration, and Rollback Checklist

## Before staging

1. Confirm the target Supabase project and Vercel project are staging—not production.
2. Review pending migrations and run a dry-run where supported.
3. Verify required environment variables without printing secret values.
4. Confirm a current backup or disposable staging reset path.

## Database rehearsal

Use the Supabase CLI with explicit targets. A clean local verification should start the local stack, rebuild from migrations, apply seed data only to development/staging, run database linting, and run pgTAP tests when present. Never include seed data in production.

The pilot-launch tables are intentionally server-managed: RLS is enabled, `public`, `anon`, and `authenticated` privileges are revoked, and only `service_role` receives table privileges. The service key must never be exposed to browser code.

## Application rehearsal

1. Deploy the application to staging.
2. Run `npm run verify:client-readiness`.
3. Set `CLIENT_READINESS_BASE_URL` to the staging URL and run it again for HTTP checks.
4. Test platform admin, venue director, staff, and anonymous public journeys.
5. Prepare a disposable demo tenant and complete the Pilot Launch rehearsal.

## Rollback decision

Pause the pilot if permissions expose the wrong tenant, schedule identity changes unexpectedly, public safety information is incorrect, alert delivery cannot be explained, or the backup operator cannot take over. Restore the previously approved application deployment and use the venue's documented manual schedule/radio/PA fallback. Database rollback must be planned per migration; never erase or rebuild production as a shortcut.
