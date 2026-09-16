import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "src/app/admin/command-center/page.tsx",
  "src/app/admin/demo/page.tsx",
  "src/app/admin/onboarding/page.tsx",
  "src/app/admin/pilot-launch/page.tsx",
  "src/app/admin/pilot-launch/runbook/page.tsx",
  "src/app/fields/[fieldId]/page.tsx",
  "docs/client-readiness/buyer-demo.md",
  "docs/client-readiness/implementation-kit.md",
  "docs/client-readiness/integration-maturity.md",
  "docs/client-readiness/pilot-proposal.md",
  "docs/client-readiness/staging-and-rollback.md",
];

const sourceContracts = [
  ["src/app/admin/onboarding/page.tsx", "Continue to Pilot Launch"],
  ["src/app/admin/demo/page.tsx", "Prepare reference demo"],
  ["src/app/admin/pilot-launch/page.tsx", "Successful Saturday drill"],
  ["src/app/admin/pilot-launch/page.tsx", "Launch decision"],
  ["src/lib/services/client-readiness.ts", "Reference preparation is restricted to a verified demo tenant."],
  ["docs/client-readiness/integration-maturity.md", "Implemented but unverified"],
];

let failed = false;
for (const file of requiredFiles) {
  try { await access(file); } catch { console.error(`MISSING ${file}`); failed = true; }
}
for (const [file, expected] of sourceContracts) {
  const source = await readFile(file, "utf8");
  if (!source.includes(expected)) { console.error(`CONTRACT ${file} is missing: ${expected}`); failed = true; }
}

const baseUrl = process.env.CLIENT_READINESS_BASE_URL?.replace(/\/$/, "");
if (baseUrl) {
  const publicRoutes = ["/demo/crossroads/today", "/demo/crossroads/presentation", "/venue/crossroads", "/venue/crossroads/field/6"];
  for (const route of publicRoutes) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    if (response.status >= 400) { console.error(`HTTP ${response.status} ${route}`); failed = true; }
    else console.log(`HTTP ${response.status} ${route}`);
  }
  for (const route of ["/admin/command-center", "/admin/demo", "/admin/pilot-launch"]) {
    const response = await fetch(`${baseUrl}${route}`, { redirect: "manual" });
    if (![302, 303, 307, 308].includes(response.status)) { console.error(`AUTH ${route} returned ${response.status}, expected redirect`); failed = true; }
    else console.log(`AUTH ${response.status} ${route}`);
  }
} else {
  console.log("Static client-readiness contracts passed. Set CLIENT_READINESS_BASE_URL to include HTTP route checks.");
}

if (failed) process.exitCode = 1;
