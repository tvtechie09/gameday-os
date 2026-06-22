import { ClipboardCheck, FileText, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

type TestStep = {
  expected: string;
  label: string;
};

type TestSection = {
  goal: string;
  steps: TestStep[];
  title: string;
};

const testSections: TestSection[] = [
  {
    goal: "Confirm a parent can scan a field QR code and understand the field page quickly.",
    title: "Parent QR Scan Test",
    steps: [
      { label: "Scan a printed field QR code with an iPhone camera.", expected: "Public field page opens without login." },
      { label: "Read the top of the page in under 10 seconds.", expected: "Venue, field, current/next game, score/status, and alerts are obvious." },
      { label: "Tap a game link or sponsor link if available.", expected: "External link opens in a new tab." },
      { label: "Check page on cellular data if possible.", expected: "Public URL works away from local Wi-Fi." },
    ],
  },
  {
    goal: "Confirm a coach or operator can update live game information.",
    title: "Coach Score Update Test",
    steps: [
      { label: "Open the session dashboard for an active or test session.", expected: "Score controls and game state are visible." },
      { label: "Add one home run and one away run.", expected: "Scores save and remain after refresh." },
      { label: "Use Ball, Strike, Out, Reset Count, and Next Inning/Period.", expected: "Game state updates correctly." },
      { label: "Reload the public field page.", expected: "Updated score/status appears for parents." },
    ],
  },
  {
    goal: "Confirm the venue command view helps staff understand the day.",
    title: "Venue Dashboard Test",
    steps: [
      { label: "Open Pilot Launch, Game Day, and Status Board.", expected: "Active sessions, alerts, fields, and links load." },
      { label: "Change a field status to delayed or open.", expected: "Dashboard and public field page reflect the change." },
      { label: "Open the public venue page.", expected: "Fields, alerts, and today's schedule are easy to scan." },
    ],
  },
  {
    goal: "Confirm sponsors are visible and clickable without overwhelming the parent page.",
    title: "Sponsor Visibility Test",
    steps: [
      { label: "Open a field page with assigned sponsors.", expected: "Sponsor name, placement, logo, and description display cleanly." },
      { label: "Tap Visit Website for a sponsor.", expected: "Sponsor site opens and click tracking does not break the page." },
      { label: "Check sponsor area on phone size.", expected: "Cards are readable and do not crowd the game card." },
    ],
  },
  {
    goal: "Confirm parents or volunteers can request help/resources without account setup.",
    title: "Resource Activation Test",
    steps: [
      { label: "Open the public field page and find optional helper actions.", expected: "Resource and volunteer actions appear below primary game information." },
      { label: "Submit a livestream, camera, audio, or scoreboard helper request.", expected: "Success message appears." },
      { label: "Open resource activations or dashboard.", expected: "Pending request is visible for review." },
      { label: "Approve or reject the request.", expected: "Status changes without affecting public page stability." },
    ],
  },
  {
    goal: "Confirm scoreboards can be opened for phones, TVs, projectors, or OBS.",
    title: "Scoreboard Display Test",
    steps: [
      { label: "Open a field scoreboard display link.", expected: "Active or next session appears full screen." },
      { label: "Open a session scoreboard display link.", expected: "Teams, score, inning/period, status, venue, and field are clear." },
      { label: "Update score from session dashboard.", expected: "Scoreboard display updates within the polling interval." },
      { label: "Try dark, light, compact, and sponsor URL options if needed.", expected: "Display remains readable on the target screen." },
    ],
  },
];

function CheckBox() {
  return <span className="mt-1 h-5 w-5 shrink-0 rounded border-2 border-[var(--foreground)] bg-white print:h-4 print:w-4" aria-hidden="true" />;
}

function TestSectionCard({ section, index }: { index: number; section: TestSection }) {
  return (
    <section className="break-inside-avoid rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm print:border-black print:p-4 print:shadow-none">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-sm font-black text-[var(--accent-strong)] print:border print:border-black print:bg-white print:text-black">
          {index + 1}
        </div>
        <div>
          <h2 className="text-xl font-black">{section.title}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)] print:text-black">{section.goal}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3">
        {section.steps.map((step) => (
          <div className="grid gap-3 rounded-lg border border-[var(--line)] bg-[var(--background)] p-4 print:border-black print:bg-white print:p-3" key={step.label}>
            <div className="flex items-start gap-3">
              <CheckBox />
              <div>
                <p className="text-sm font-black">{step.label}</p>
                <p className="mt-1 text-sm leading-6 text-[var(--muted)] print:text-black">Expected: {step.expected}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default function PilotScriptPage() {
  return (
    <main className="min-w-0 px-4 py-6 print:px-0 print:py-0 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-5xl gap-6 print:max-w-none print:gap-4">
        <section className="rounded-lg border border-[var(--line)] bg-[var(--black-soft)] p-5 text-white shadow-sm print:border-black print:bg-white print:p-0 print:text-black print:shadow-none">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-white/55 print:text-black">Pilot Day Test Script</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">Live testing checklist</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-white/70 print:text-black">
                A step-by-step script for Kyle to test QR scans, score updates, dashboards, sponsors, resources, and scoreboard displays during a live pilot.
              </p>
            </div>
            <div className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-white px-4 text-sm font-black text-[var(--black-soft)] print:hidden">
              <Printer className="h-4 w-4" aria-hidden="true" />
              Use browser print
            </div>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3 print:grid-cols-3">
            <div className="rounded-lg bg-white/10 p-4 print:border print:border-black print:bg-white">
              <ClipboardCheck className="h-5 w-5 print:hidden" aria-hidden="true" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-white/55 print:mt-0 print:text-black">Tester</p>
              <p className="mt-1 min-h-8 border-b border-white/30 text-sm font-bold print:border-black" />
            </div>
            <div className="rounded-lg bg-white/10 p-4 print:border print:border-black print:bg-white">
              <FileText className="h-5 w-5 print:hidden" aria-hidden="true" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-white/55 print:mt-0 print:text-black">Venue</p>
              <p className="mt-1 min-h-8 border-b border-white/30 text-sm font-bold print:border-black" />
            </div>
            <div className="rounded-lg bg-white/10 p-4 print:border print:border-black print:bg-white">
              <ClipboardCheck className="h-5 w-5 print:hidden" aria-hidden="true" />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.14em] text-white/55 print:mt-0 print:text-black">Date / Time</p>
              <p className="mt-1 min-h-8 border-b border-white/30 text-sm font-bold print:border-black" />
            </div>
          </div>
        </section>

        <section className="grid gap-4">
          {testSections.map((section, index) => (
            <TestSectionCard index={index} key={section.title} section={section} />
          ))}
        </section>

        <section className="break-inside-avoid rounded-lg border border-[var(--line)] bg-white p-5 shadow-sm print:border-black print:p-4 print:shadow-none">
          <h2 className="text-xl font-black">Notes & Observations</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)] print:text-black">
            Capture what worked, what confused parents/coaches, and anything that should be fixed before the next field test.
          </p>
          <div className="mt-5 grid gap-3">
            {Array.from({ length: 8 }, (_, index) => (
              <div className="min-h-12 border-b border-[var(--line)] print:border-black" key={index} />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
