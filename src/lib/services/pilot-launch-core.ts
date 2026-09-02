export const PILOT_REHEARSAL_STEPS = [
  { key: "operator_login", label: "Operator opens Home and Today", expected: "Primary and backup operators can sign in and see the correct venue day." },
  { key: "schedule_spot_check", label: "Schedule and field mapping spot-check", expected: "A sample of imported games matches source time, teams, and field." },
  { key: "qr_cellular", label: "QR scan on cellular data", expected: "A printed field QR opens without login and shows field, alert, and next game." },
  { key: "delay_all_clear", label: "Delay and all-clear drill", expected: "Staff publishes a delay, confirms public visibility, then restores normal operations." },
  { key: "notification_test", label: "Follower email test", expected: "A test follower receives the expected alert or delivery evidence explains why not." },
  { key: "support_drill", label: "Support escalation drill", expected: "Staff knows the primary owner, backup, escalation contact, and rollback path." },
] as const;

export type AutomaticPilotCheck = {
  detail: string;
  key: string;
  label: string;
  passed: boolean;
};

export type PilotGateResult = {
  automaticPassed: number;
  blockers: string[];
  canApprove: boolean;
  rehearsalPassed: number;
  score: number;
  total: number;
};

export function buildAutomaticPilotChecks(input: {
  backupOwnerReady: boolean;
  escalationReady: boolean;
  fieldCount: number;
  primaryOwnerReady: boolean;
  publicUrlReady: boolean;
  scheduleCount: number;
  targetDateReady: boolean;
  venueProfileReady: boolean;
  weatherReady: boolean;
}): AutomaticPilotCheck[] {
  return [
    { key: "venue", label: "Complete venue profile", detail: "Venue name, address, and operating timezone are configured.", passed: input.venueProfileReady },
    { key: "fields", label: "Configure fields", detail: `${input.fieldCount} field${input.fieldCount === 1 ? "" : "s"} available for the pilot.`, passed: input.fieldCount > 0 },
    { key: "schedule", label: "Load the pilot schedule", detail: `${input.scheduleCount} upcoming or active game${input.scheduleCount === 1 ? "" : "s"} assigned to pilot fields.`, passed: input.scheduleCount > 0 },
    { key: "weather", label: "Configure weather monitoring", detail: "The venue has a weather profile for game-day review and response.", passed: input.weatherReady },
    { key: "public_url", label: "Use a production public URL", detail: "QR destinations must work away from venue Wi-Fi.", passed: input.publicUrlReady },
    { key: "launch_date", label: "Choose the pilot date", detail: "Staff and support owners are working toward one scheduled operating date.", passed: input.targetDateReady },
    { key: "primary_owner", label: "Name the game-day owner", detail: "One person owns the operating decision and communication flow.", passed: input.primaryOwnerReady },
    { key: "backup_owner", label: "Name a backup operator", detail: "The pilot can continue if the primary owner is unavailable.", passed: input.backupOwnerReady },
    { key: "escalation", label: "Set the escalation contact", detail: "Staff know who to contact and when to stop or roll back.", passed: input.escalationReady },
  ];
}

export function evaluatePilotGate({
  automaticChecks,
  openHighSeverityIncidents,
  rehearsalStatuses,
}: {
  automaticChecks: AutomaticPilotCheck[];
  openHighSeverityIncidents: number;
  rehearsalStatuses: Record<string, string>;
}): PilotGateResult {
  const automaticPassed = automaticChecks.filter((check) => check.passed).length;
  const rehearsalPassed = PILOT_REHEARSAL_STEPS.filter((step) => rehearsalStatuses[step.key] === "passed").length;
  const total = automaticChecks.length + PILOT_REHEARSAL_STEPS.length + 1;
  const passed = automaticPassed + rehearsalPassed + (openHighSeverityIncidents === 0 ? 1 : 0);
  const blockers = [
    ...automaticChecks.filter((check) => !check.passed).map((check) => check.label),
    ...PILOT_REHEARSAL_STEPS.filter((step) => rehearsalStatuses[step.key] !== "passed").map((step) => step.label),
    ...(openHighSeverityIncidents > 0 ? ["Resolve high-priority support incidents"] : []),
  ];

  return {
    automaticPassed,
    blockers,
    canApprove: blockers.length === 0,
    rehearsalPassed,
    score: total === 0 ? 0 : Math.round((passed / total) * 100),
    total,
  };
}

export function pilotStatusLabel(status: string) {
  return {
    approved: "Approved to launch",
    live: "Pilot live",
    paused: "Pilot paused",
    rehearsal: "Rehearsal in progress",
    setup: "Setup in progress",
  }[status] ?? "Setup in progress";
}
