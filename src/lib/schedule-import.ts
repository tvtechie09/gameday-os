// CSV schedule import: tolerant header mapping + row validation. Pure logic so
// the parser is unit-testable; persistence happens in the server action.

export type ScheduleCsvRow = {
  rowNumber: number;
  date: string;
  time: string;
  fieldName: string;
  homeTeam: string;
  awayTeam: string;
  title: string;
  sport: string;
};

export type ValidatedScheduleRow = ScheduleCsvRow & {
  fieldId: string;
  startTime: string;
  endTime: string;
  errors: string[];
};

const HEADER_ALIASES: Record<string, keyof Omit<ScheduleCsvRow, "rowNumber">> = {
  date: "date", "game date": "date", day: "date",
  time: "time", "start time": "time", start: "time", "game time": "time",
  field: "fieldName", "field name": "fieldName", court: "fieldName", surface: "fieldName", location: "fieldName",
  home: "homeTeam", "home team": "homeTeam", team1: "homeTeam", "team 1": "homeTeam",
  away: "awayTeam", "away team": "awayTeam", visitor: "awayTeam", team2: "awayTeam", "team 2": "awayTeam", opponent: "awayTeam",
  title: "title", game: "title", matchup: "title", division: "title",
  sport: "sport"
};

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') { current += '"'; i += 1; } else { quoted = !quoted; }
    } else if (char === "," && !quoted) {
      cells.push(current); current = "";
    } else {
      current += char;
    }
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseScheduleCsv(text: string): { rows: ScheduleCsvRow[]; unknownHeaders: string[]; error?: string } {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length);
  if (lines.length < 2) return { rows: [], unknownHeaders: [], error: "Paste a CSV with a header row and at least one game." };
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  const mapping = headers.map((header) => HEADER_ALIASES[header] ?? null);
  const unknownHeaders = headers.filter((header, index) => !mapping[index]);
  if (!mapping.includes("fieldName") || !mapping.includes("time")) {
    return { rows: [], unknownHeaders, error: "The CSV needs at least a field column and a time column. Recognized headers: date, time, field, home, away, title, sport." };
  }
  const rows = lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const row: ScheduleCsvRow = { rowNumber: index + 2, date: "", time: "", fieldName: "", homeTeam: "", awayTeam: "", title: "", sport: "" };
    mapping.forEach((key, cellIndex) => { if (key) row[key] = cells[cellIndex] ?? ""; });
    return row;
  });
  return { rows, unknownHeaders };
}

function parseStart(date: string, time: string, defaultDate: string) {
  const dateText = (date || defaultDate).trim();
  const timeText = time.trim();
  if (!timeText) return null;
  const candidate = new Date(dateText + " " + timeText);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate;
}

export function validateScheduleRows(
  rows: ScheduleCsvRow[],
  fields: Array<{ id: string; name: string }>,
  options: { defaultDate: string; gameMinutes?: number }
): ValidatedScheduleRow[] {
  const gameMinutes = options.gameMinutes ?? 90;
  const fieldByName = new Map(fields.map((field) => [field.name.trim().toLowerCase(), field.id]));
  return rows.map((row) => {
    const errors: string[] = [];
    const fieldId = fieldByName.get(row.fieldName.trim().toLowerCase()) ?? "";
    if (!fieldId) errors.push('Unknown field "' + row.fieldName + '"');
    const start = parseStart(row.date, row.time, options.defaultDate);
    if (!start) errors.push('Unreadable date/time "' + [row.date, row.time].filter(Boolean).join(" ") + '"');
    if (!row.homeTeam && !row.title) errors.push("Needs a home team or a title");
    const end = start ? new Date(start.getTime() + gameMinutes * 60 * 1000) : null;
    return {
      ...row,
      fieldId,
      startTime: start ? start.toISOString() : "",
      endTime: end ? end.toISOString() : "",
      errors
    };
  });
}
