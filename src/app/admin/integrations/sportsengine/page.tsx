import Link from "next/link";
import { getProviderEnvStatus, getIntegrationProvider } from "@/lib/integration-framework";

export const dynamic = "force-dynamic";

export default function SportsEngineIntegrationPage() {
  const provider = getIntegrationProvider("sportsengine");
  const status = provider ? getProviderEnvStatus(provider) : null;

  return (
    <main className="px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[var(--accent-strong)]">SportsEngine</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">SportsEngine Schedule Integration</h1>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[var(--muted)]">
          SportsEngine is registered as an OAuth2 provider ready for real credentials. GameDay OS will ingest schedule data after OAuth is connected; it will not fake successful connections or generate mock SportsEngine games.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="ui-button ui-button-primary min-h-11" href="/admin/integrations">Open Integration Framework</Link>
          <Link className="ui-button ui-button-secondary min-h-11" href="/admin/dashboard">Open Dashboard</Link>
        </div>
      </section>

      {provider && status ? (
        <section className="mt-5 rounded-xl border border-[var(--line)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--black-soft)] px-2 py-1 text-xs font-black text-white">OAuth2</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-black uppercase text-amber-900">{status.status}</span>
          </div>
          <h2 className="mt-3 text-xl font-black">Credential requirements</h2>
          <p className="mt-2 text-sm font-semibold text-[var(--muted)]">{status.message}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {provider.credentialRequirements.map((credential) => (
              <div className="rounded-lg bg-[var(--background)] p-4" key={credential.envVar}>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">{credential.required ? "Required" : "Optional"}</p>
                <p className="mt-1 text-sm font-black">{credential.label}</p>
                <p className="mt-1 text-xs font-semibold text-[var(--muted)]">{credential.secret ? "Secret stored only server-side" : credential.envVar}</p>
                <p className="mt-2 text-xs font-black text-[var(--accent-strong)]">{status.configuredEnvVars.includes(credential.envVar) ? "Configured" : "Missing"}</p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
