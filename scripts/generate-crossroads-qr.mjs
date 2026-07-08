// Generates scannable QR PNGs for every Crossroads field/surface.
// Each PNG encodes the canonical public field route (/fields/{uuid}) using the
// deterministic UUIDs assigned in supabase/crossroads-rebuild-seed.sql.
// Run: node scripts/generate-crossroads-qr.mjs
import QRCode from "qrcode";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const baseUrl = process.env.CROSSROADS_BASE_URL ?? "https://gameday-os.vercel.app";
const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "qr", "crossroads");

// Mirror the seed: parents c4a00000-...-N, children c4b0000N-...-K (A=1,B=2,C=3).
const codeK = { A: 1, B: 2, C: 3 };
const targets = [];

for (let n = 1; n <= 9; n += 1) {
  const parentId = `c4a00000-0000-4000-a000-00000000000${n}`;
  targets.push({ slug: `crossroads-field-${n}`, id: parentId });
  const codes = n <= 4 ? ["A", "B", "C"] : ["A", "B"];
  for (const code of codes) {
    const childId = `c4b0000${n}-0000-4000-a000-00000000000${codeK[code]}`;
    targets.push({ slug: `crossroads-field-${n}${code.toLowerCase()}`, id: childId });
  }
}

await mkdir(outDir, { recursive: true });

for (const { slug, id } of targets) {
  const url = `${baseUrl}/fields/${id}`;
  await QRCode.toFile(join(outDir, `${slug}.png`), url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#1B2A4A", light: "#FFFFFF" },
  });
}

console.log(`Generated ${targets.length} QR PNGs in ${outDir}`);
