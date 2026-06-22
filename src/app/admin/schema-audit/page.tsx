import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Database, FileCode2 } from "lucide-react";

export const dynamic = "force-dynamic";

type ExpectedColumn = {
  definition: string;
  name: string;
};

type ExpectedTable = {
  columns: ExpectedColumn[];
  createSql: string;
  name: string;
};

type ExpectedIndex = {
  name: string;
  sql: string;
  table: string;
};

type ExpectedPolicy = {
  name: string;
  sql: string;
  table: string;
};

type ExpectedSchema = {
  indexes: ExpectedIndex[];
  policies: ExpectedPolicy[];
  tables: ExpectedTable[];
};

type OpenApiDefinition = {
  properties?: Record<string, unknown>;
};

type SupabaseOpenApi = {
  definitions?: Record<string, OpenApiDefinition>;
};

type AuditResult = {
  actualColumnCount: number;
  actualTableCount: number;
  expectedColumnCount: number;
  expectedTableCount: number;
  missingColumns: Array<{ column: ExpectedColumn; table: ExpectedTable }>;
  missingTables: ExpectedTable[];
};

type HealthStatus = "Healthy" | "Warning" | "Error";

type TableAuditRow = {
  actual: string;
  expected: string;
  name: string;
  status: HealthStatus;
};

type ColumnAuditRow = {
  actual: string;
  expected: string;
  name: string;
  status: HealthStatus;
};

function splitStatements(sql: string) {
  return sql
    .split(/;\s*(?=\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean)
    .map((statement) => `${statement};`);
}

function splitTopLevel(value: string) {
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  let inSingleQuote = false;

  for (const char of value) {
    if (char === "'") {
      inSingleQuote = !inSingleQuote;
    }

    if (!inSingleQuote && char === "(") depth += 1;
    if (!inSingleQuote && char === ")") depth -= 1;

    if (!inSingleQuote && depth === 0 && char === ",") {
      parts.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function parseExpectedSchema(sql: string): ExpectedSchema {
  const statements = splitStatements(sql);
  const parsedTables = statements.flatMap((statement): ExpectedTable[] => {
    const match = statement.match(/^create table if not exists public\.([a-z_]+)\s*\(([\s\S]*)\);$/i);
    if (!match) return [];

    const [, name, body] = match;
    const columns = splitTopLevel(body).flatMap((line): ExpectedColumn[] => {
      const trimmed = line.trim();
      if (/^(constraint|primary|foreign|unique|check)\b/i.test(trimmed)) return [];

      const columnMatch = trimmed.match(/^([a-z_][a-z0-9_]*)\s+(.+)$/i);
      if (!columnMatch) return [];

      return [{ definition: trimmed, name: columnMatch[1] }];
    });

    return [{ columns, createSql: statement, name }];
  });
  const tableMap = new Map<string, ExpectedTable>();

  for (const table of parsedTables) {
    const existing = tableMap.get(table.name);

    if (!existing) {
      tableMap.set(table.name, table);
      continue;
    }

    const existingColumns = new Set(existing.columns.map((column) => column.name));
    table.columns.forEach((column) => {
      if (!existingColumns.has(column.name)) {
        existing.columns.push(column);
      }
    });
  }

  statements.forEach((statement) => {
    const match = statement.match(/^alter table public\.([a-z_]+)\s+add column if not exists\s+([\s\S]+);$/i);
    if (!match) return;

    const [, tableName, body] = match;
    const table = tableMap.get(tableName);
    if (!table) return;

    const existingColumns = new Set(table.columns.map((column) => column.name));
    splitTopLevel(body).forEach((line) => {
      const trimmed = line.trim().replace(/^add column if not exists\s+/i, "");
      const columnMatch = trimmed.match(/^([a-z_][a-z0-9_]*)\s+(.+)$/i);

      if (!columnMatch || existingColumns.has(columnMatch[1])) return;

      table.columns.push({ definition: trimmed, name: columnMatch[1] });
      existingColumns.add(columnMatch[1]);
    });
  });
  const tables = [...tableMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  const indexes = statements.flatMap((statement): ExpectedIndex[] => {
    const match = statement.match(/^create\s+(?:unique\s+)?index if not exists\s+([a-z0-9_]+)[\s\S]*?\son public\.([a-z_]+)/i);
    return match ? [{ name: match[1], sql: statement, table: match[2] }] : [];
  });

  const policies = statements.flatMap((statement): ExpectedPolicy[] => {
    const match = statement.match(/^create policy "([^"]+)"\s+on public\.([a-z_]+)/i);
    return match ? [{ name: match[1], sql: statement, table: match[2] }] : [];
  });

  return { indexes, policies, tables };
}

async function readExpectedSchema() {
  const schemaPath = path.join(process.cwd(), "supabase", "schema.sql");
  const migrationsPath = path.join(process.cwd(), "supabase", "migrations");
  const schemaSql = await readFile(schemaPath, "utf8");
  let migrationSql = "";

  try {
    const migrationFiles = await readdir(migrationsPath);
    const sqlFiles = migrationFiles.filter((file) => file.endsWith(".sql")).sort();
    migrationSql = (await Promise.all(sqlFiles.map((file) => readFile(path.join(migrationsPath, file), "utf8")))).join("\n\n");
  } catch (error) {
    console.error("Unable to read migrations for schema audit expected counts", error);
  }

  return parseExpectedSchema(`${schemaSql}\n\n${migrationSql}`);
}

async function fetchActualRestSchema(): Promise<{ definitions: Record<string, OpenApiDefinition>; error: string | null }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !key) {
    return { definitions: {}, error: "Supabase URL or API key is not configured." };
  }

  try {
    const response = await fetch(`${supabaseUrl.replace(/\/$/, "")}/rest/v1/`, {
      cache: "no-store",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!response.ok) {
      return { definitions: {}, error: `Supabase schema request failed with ${response.status}.` };
    }

    const openApi = await response.json() as SupabaseOpenApi;
    return { definitions: openApi.definitions ?? {}, error: null };
  } catch (error) {
    return {
      definitions: {},
      error: error instanceof Error ? error.message : "Unable to fetch Supabase REST schema.",
    };
  }
}

function compareSchema(expected: ExpectedSchema, actualDefinitions: Record<string, OpenApiDefinition>): AuditResult {
  const missingTables = expected.tables.filter((table) => !actualDefinitions[table.name]);
  const missingColumns = expected.tables.flatMap((table) => {
    const actualColumns = new Set(Object.keys(actualDefinitions[table.name]?.properties ?? {}));
    if (!actualDefinitions[table.name]) return [];

    return table.columns
      .filter((column) => !actualColumns.has(column.name))
      .map((column) => ({ column, table }));
  });

  return {
    actualColumnCount: Object.values(actualDefinitions).reduce((total, definition) => total + Object.keys(definition.properties ?? {}).length, 0),
    actualTableCount: Object.keys(actualDefinitions).length,
    expectedColumnCount: expected.tables.reduce((total, table) => total + table.columns.length, 0),
    expectedTableCount: expected.tables.length,
    missingColumns,
    missingTables,
  };
}

function buildSqlFixScript(expected: ExpectedSchema, audit: AuditResult) {
  const missingTableSql = audit.missingTables.map((table) => table.createSql);
  const missingColumnSql = audit.missingColumns.map(({ column, table }) => `alter table public.${table.name}\n  add column if not exists ${column.definition};`);

  return [
    "-- GameDay OS schema audit fix script",
    "-- Review before running in Supabase SQL Editor.",
    ...missingTableSql,
    ...missingColumnSql,
    "-- Expected indexes. Run any that are missing after checking pg_indexes.",
    ...expected.indexes.map((index) => index.sql),
    "-- Expected RLS policies. Run any that are missing after checking pg_policies.",
    ...expected.policies.map((policy) => `drop policy if exists "${policy.name}" on public.${policy.table};\n${policy.sql}`),
  ].join("\n\n");
}

function buildTableRows(expected: ExpectedSchema, actualDefinitions: Record<string, OpenApiDefinition>): TableAuditRow[] {
  return expected.tables.map((table) => {
    const actualTable = actualDefinitions[table.name];
    return {
      actual: actualTable ? "Present" : "Missing",
      expected: `public.${table.name}`,
      name: table.name,
      status: actualTable ? "Healthy" : "Error",
    };
  });
}

function buildColumnRows(expected: ExpectedSchema, actualDefinitions: Record<string, OpenApiDefinition>): ColumnAuditRow[] {
  return expected.tables.flatMap((table) => {
    const actualTable = actualDefinitions[table.name];
    const actualColumns = new Set(Object.keys(actualTable?.properties ?? {}));

    return table.columns.map((column) => ({
      actual: actualTable ? (actualColumns.has(column.name) ? "Present" : "Missing") : "Table missing",
      expected: column.definition,
      name: `${table.name}.${column.name}`,
      status: actualTable && actualColumns.has(column.name) ? "Healthy" : "Error",
    }));
  });
}

function StatusPill({ status }: { status: HealthStatus }) {
  const className = {
    Error: "bg-red-100 text-red-800 ring-1 ring-red-200",
    Healthy: "bg-[var(--accent-soft)] text-[var(--accent-strong)]",
    Warning: "bg-amber-100 text-amber-950 ring-1 ring-amber-200",
  }[status];

  return <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${className}`}>{status}</span>;
}

function CountBadge({ count, label }: { count: number; label: string }) {
  const healthy = count === 0;
  return (
    <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${healthy ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-red-100 text-red-800 ring-1 ring-red-200"}`}>
      {healthy ? "Healthy" : `${count} ${label}`}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="ui-empty mt-4">{children}</p>;
}

function SqlBlock({ sql }: { sql: string }) {
  return (
    <pre className="mt-4 max-h-[520px] overflow-auto rounded-lg bg-[var(--black-soft)] p-4 text-xs leading-6 text-white">
      <code>{sql}</code>
    </pre>
  );
}

function AuditRowCard({ actual, expected, name, status }: TableAuditRow | ColumnAuditRow) {
  return (
    <article className="rounded-lg border border-[var(--line)] bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-base font-black">{name}</p>
          <p className="mt-1 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Expected</p>
          <p className="mt-1 break-words text-sm font-semibold text-[var(--foreground)]">{expected}</p>
          <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-[var(--muted)]">Actual</p>
          <p className="mt-1 text-sm font-semibold text-[var(--muted)]">{actual}</p>
        </div>
        <StatusPill status={status} />
      </div>
    </article>
  );
}

function ExpectedSqlList({
  items,
  kind,
}: {
  items: Array<{ name: string; sql: string; table: string }>;
  kind: "index" | "policy";
}) {
  return (
    <div className="mt-4 grid gap-3">
      {items.map((item) => (
        <article className="rounded-lg border border-amber-200 bg-amber-50 p-4" key={`${item.table}-${item.name}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-base font-black text-amber-950">{item.name}</p>
              <p className="mt-1 text-sm font-semibold text-amber-900">Expected {kind} on public.{item.table}</p>
            </div>
            <StatusPill status="Warning" />
          </div>
          <pre className="mt-3 overflow-auto rounded-lg bg-white/70 p-3 text-xs leading-5 text-amber-950">
            <code>{item.sql}</code>
          </pre>
        </article>
      ))}
    </div>
  );
}

export default async function SchemaAuditPage() {
  const expected = await readExpectedSchema();
  const actual = await fetchActualRestSchema();
  const audit = compareSchema(expected, actual.definitions);
  const tableRows = buildTableRows(expected, actual.definitions);
  const columnRows = buildColumnRows(expected, actual.definitions);
  const fixScript = buildSqlFixScript(expected, audit);
  const hasTableOrColumnIssues = audit.missingTables.length > 0 || audit.missingColumns.length > 0;
  const tableStatus: HealthStatus = audit.missingTables.length > 0 ? "Error" : "Healthy";
  const columnStatus: HealthStatus = audit.missingColumns.length > 0 ? "Error" : "Healthy";

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-[var(--accent-strong)]">Schema audit</p>
          <h1 className="mt-2 text-3xl font-black sm:text-4xl">Schema Audit & Migration Center</h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--muted)]">
            Compare GameDay OS expected schema against live Supabase metadata before pages fail. This page is read-only.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link className="ui-button ui-button-secondary" href="/admin/executive">
            Executive Dashboard
          </Link>
          <Link className="ui-button ui-button-secondary" href="/admin/system-health">
            System Health
          </Link>
          <Link className="ui-button ui-button-secondary" href="/admin/integrations/health">
            Integration Health
          </Link>
        </div>
      </div>

      {actual.error ? (
        <section className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-5 text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-xl font-black">Live schema could not be loaded</h2>
              <p className="mt-2 text-sm leading-6">{actual.error}</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="ui-card p-5">
          <Database className="h-5 w-5 text-[var(--accent-strong)]" aria-hidden="true" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Tables</p>
          <p className="mt-2 text-3xl font-black">{audit.actualTableCount}/{audit.expectedTableCount}</p>
          <StatusPill status={tableStatus} />
        </article>
        <article className="ui-card p-5">
          <ClipboardCheck className="h-5 w-5 text-[var(--accent-strong)]" aria-hidden="true" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Columns</p>
          <p className="mt-2 text-3xl font-black">{audit.actualColumnCount}/{audit.expectedColumnCount}</p>
          <StatusPill status={columnStatus} />
        </article>
        <article className="ui-card p-5">
          <FileCode2 className="h-5 w-5 text-[var(--accent-strong)]" aria-hidden="true" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Indexes</p>
          <p className="mt-2 text-3xl font-black">{expected.indexes.length}</p>
          <StatusPill status="Warning" />
        </article>
        <article className="ui-card p-5">
          <CheckCircle2 className="h-5 w-5 text-[var(--accent-strong)]" aria-hidden="true" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-[var(--muted)]">Policies</p>
          <p className="mt-2 text-3xl font-black">{expected.policies.length}</p>
          <StatusPill status="Warning" />
        </article>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <article className="ui-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Missing tables</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Checked against live Supabase REST/OpenAPI definitions.</p>
            </div>
            <CountBadge count={audit.missingTables.length} label="missing" />
          </div>
          {audit.missingTables.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {audit.missingTables.map((table) => (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4" key={table.name}>
                  <p className="text-base font-black text-red-950">public.{table.name}</p>
                  <p className="mt-1 text-sm text-red-800">{table.columns.length} expected columns</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No missing tables detected from the live REST schema.</EmptyState>
          )}
        </article>

        <article className="ui-card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Missing columns</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Column names are compared against REST schema properties.</p>
            </div>
            <CountBadge count={audit.missingColumns.length} label="missing" />
          </div>
          {audit.missingColumns.length > 0 ? (
            <div className="mt-4 grid gap-3">
              {audit.missingColumns.map(({ column, table }) => (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4" key={`${table.name}.${column.name}`}>
                  <p className="text-base font-black text-red-950">public.{table.name}.{column.name}</p>
                  <p className="mt-1 break-words text-sm text-red-800">{column.definition}</p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No missing columns detected from the live REST schema.</EmptyState>
          )}
        </article>

        <article className="ui-card p-5">
          <h2 className="text-xl font-black">Missing indexes</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Live index introspection is not exposed through Supabase REST by default. Expected definitions are shown so you can compare against `pg_indexes` in SQL Editor.
          </p>
          <div className="mt-4">
            <StatusPill status="Warning" />
          </div>
          <ExpectedSqlList items={expected.indexes} kind="index" />
        </article>

        <article className="ui-card p-5">
          <h2 className="text-xl font-black">Missing policies</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Live RLS policy introspection is not exposed through Supabase REST by default. Expected policies are shown so you can compare against `pg_policies` in SQL Editor.
          </p>
          <div className="mt-4">
            <StatusPill status="Warning" />
          </div>
          <ExpectedSqlList items={expected.policies} kind="policy" />
        </article>
      </section>

      <section className="mt-8 grid gap-5 xl:grid-cols-2">
        <article className="ui-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Table status</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Expected application tables compared to actual Supabase REST tables.</p>
            </div>
            <StatusPill status={tableStatus} />
          </div>
          <div className="mt-4 grid gap-3">
            {tableRows.map((row) => <AuditRowCard key={row.name} {...row} />)}
          </div>
        </article>

        <article className="ui-card p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-black">Column status</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Expected application columns compared to actual Supabase REST properties.</p>
            </div>
            <StatusPill status={columnStatus} />
          </div>
          <div className="mt-4 grid max-h-[760px] gap-3 overflow-auto pr-1">
            {columnRows.map((row) => <AuditRowCard key={row.name} {...row} />)}
          </div>
        </article>
      </section>

      <section className="mt-8 ui-card p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-xl font-black">Migration helper</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
              SQL snippets are generated for missing tables and columns when possible, followed by expected index and policy definitions for manual review.
            </p>
          </div>
          <span className={`w-fit rounded-md px-2 py-1 text-xs font-black uppercase tracking-[0.12em] ${hasTableOrColumnIssues ? "bg-red-100 text-red-800 ring-1 ring-red-200" : "bg-[var(--accent-soft)] text-[var(--accent-strong)]"}`}>
            {hasTableOrColumnIssues ? "Fixes generated" : "No table/column fixes"}
          </span>
        </div>
        <SqlBlock sql={fixScript} />
      </section>
    </section>
  );
}
