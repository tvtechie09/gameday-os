import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { validateScheduleRows, type ScheduleCsvRow } from "@/lib/schedule-import";
import { getFields } from "@/lib/services/fields";
import { createSession } from "@/lib/services/sessions";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Schedule push API — the "bring your platform" connector rung above CSV.
// An external scheduling/registration platform (or a middleware script)
// pushes games here with a bearer token; rows are validated against real
// fields and upserted idempotently by external id.
//
// Auth: SCHEDULE_PUSH_TOKEN env; header `authorization: Bearer <token>` or
// `x-gameday-integration-token`.

function tokenValid(request: Request) {
  const expected = process.env.SCHEDULE_PUSH_TOKEN || "";
  if (!expected) return false;
  const explicit = request.headers.get("x-gameday-integration-token");
  const authorization = request.headers.get("authorization") ?? "";
  const provided = explicit || (authorization.toLowerCase().startsWith("bearer ") ? authorization.slice(7).trim() : "");
  if (!provided || provided.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  } catch {
    return false;
  }
}

type PushGame = {
  external_id?: string;
  date?: string;
  time?: string;
  field?: string;
  home?: string;
  away?: string;
  title?: string;
  sport?: string;
};

export async function GET(request: Request) {
  if (!tokenValid(request)) {
    return NextResponse.json({ ok: false, error: "Valid integration token required (SCHEDULE_PUSH_TOKEN)." }, { status: process.env.SCHEDULE_PUSH_TOKEN ? 401 : 503 });
  }
  const fields = await getFields().catch(() => []);
  return NextResponse.json({
    ok: true,
    api: "gameday-os schedule push v1",
    fields: fields.map((field) => field.name),
    payload_example: { games: [{ external_id: "abc-123", date: "2026-08-01", time: "17:30", field: "Field 1", home: "Cubs 10U", away: "Hawks 10U", sport: "baseball" }] }
  });
}

export async function POST(request: Request) {
  if (!tokenValid(request)) {
    return NextResponse.json({ ok: false, error: "Valid integration token required (SCHEDULE_PUSH_TOKEN)." }, { status: process.env.SCHEDULE_PUSH_TOKEN ? 401 : 503 });
  }
  let body: { source?: string; games?: PushGame[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }
  const games = Array.isArray(body.games) ? body.games.slice(0, 500) : [];
  if (!games.length) {
    return NextResponse.json({ ok: false, error: "Send { games: [...] }." }, { status: 400 });
  }
  const source = String(body.source || "schedule-push").slice(0, 60);
  const fields = await getFields();
  const rows: ScheduleCsvRow[] = games.map((game, index) => ({
    rowNumber: index + 1,
    date: String(game.date || ""),
    time: String(game.time || ""),
    fieldName: String(game.field || ""),
    homeTeam: String(game.home || ""),
    awayTeam: String(game.away || ""),
    title: String(game.title || ""),
    sport: String(game.sport || "baseball")
  }));
  const validated = validateScheduleRows(rows, fields, { defaultDate: new Date().toISOString().slice(0, 10) });

  const supabase = getSupabaseAdminClient();
  const results: Array<{ row: number; status: "created" | "updated" | "error"; error?: string }> = [];
  for (const [index, row] of validated.entries()) {
    if (row.errors.length) {
      results.push({ row: row.rowNumber, status: "error", error: row.errors.join("; ") });
      continue;
    }
    const externalId = String(games[index]?.external_id || "").slice(0, 120);
    try {
      if (externalId) {
        const { data: existing } = await supabase
          .from("sessions")
          .select("id")
          .eq("external_source", source)
          .eq("external_source_id", externalId)
          .maybeSingle();
        if (existing) {
          const { error } = await supabase
            .from("sessions")
            .update({
              field_id: row.fieldId,
              title: row.title || row.homeTeam + " vs " + row.awayTeam,
              home_team: row.homeTeam,
              away_team: row.awayTeam,
              start_time: row.startTime,
              end_time: row.endTime,
              updated_at: new Date().toISOString()
            })
            .eq("id", existing.id);
          if (error) throw new Error(error.message);
          results.push({ row: row.rowNumber, status: "updated" });
          continue;
        }
      }
      await createSession({
        field_id: row.fieldId,
        title: row.title || row.homeTeam + " vs " + row.awayTeam,
        sport_type: row.sport === "softball" ? "softball" : "baseball",
        home_team: row.homeTeam,
        away_team: row.awayTeam,
        start_time: row.startTime,
        end_time: row.endTime,
        status: "scheduled",
        external_source: source,
        external_source_id: externalId || null
      });
      results.push({ row: row.rowNumber, status: "created" });
    } catch (error) {
      results.push({ row: row.rowNumber, status: "error", error: error instanceof Error ? error.message.slice(0, 200) : "failed" });
    }
  }
  return NextResponse.json({
    ok: true,
    created: results.filter((result) => result.status === "created").length,
    updated: results.filter((result) => result.status === "updated").length,
    errors: results.filter((result) => result.status === "error")
  });
}
