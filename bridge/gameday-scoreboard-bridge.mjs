#!/usr/bin/env node
// Vendor-neutral passive scoreboard bridge. Fair-Play is the first additional
// provider; the existing Daktronics bridge remains unchanged for partnership
// and deployment continuity.

import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { DurableLatestStateOutbox } from "./lib/durable-outbox.mjs";
import { parseFairPlayFrame } from "./lib/fairplay-parser.mjs";

const args = process.argv.slice(2);
const value = (flag) => { const index = args.indexOf(flag); return index >= 0 ? args[index + 1] : undefined; };
const baseUrl = (process.env.GAMEDAY_URL || "").replace(/\/$/, "");
const provider = (value("--provider") || process.env.GAMEDAY_SCOREBOARD_PROVIDER || "fairplay").toLowerCase();
const deviceId = process.env.GAMEDAY_DEVICE_ID || "";
const fieldId = process.env.GAMEDAY_FIELD_ID || "";
const sessionId = process.env.GAMEDAY_SESSION_ID || null;
const token = process.env.GAMEDAY_SCOREBOARD_DEVICE_TOKEN || "";
const outbox = new DurableLatestStateOutbox(process.env.GAMEDAY_OUTBOX_PATH || "./data/scoreboard-outbox.json");
const postUrl = `${baseUrl}/api/integrations/scoreboards/readings`;
let backoffMs = 1_000;
let flushing = false;

if (!baseUrl || !deviceId || !fieldId || !token) {
  console.error("Set GAMEDAY_URL, GAMEDAY_DEVICE_ID, GAMEDAY_FIELD_ID, and GAMEDAY_SCOREBOARD_DEVICE_TOKEN.");
  process.exit(1);
}
if (!baseUrl.startsWith("https://") && !/^http:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(baseUrl)) {
  console.error("GAMEDAY_URL must use HTTPS except for local development.");
  process.exit(1);
}
if (provider !== "fairplay") {
  console.error("This initial bridge slice supports --provider fairplay. Keep using gameday-daktronics-bridge.mjs for Daktronics.");
  process.exit(1);
}

async function flush() {
  if (flushing || !outbox.pending?.eventId) return;
  flushing = true;
  const envelope = outbox.pending;
  try {
    const response = await fetch(postUrl, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gameday-adapter-token": token,
        "x-gameday-adapter-host": deviceId,
        "x-gameday-adapter-version": "scoreboard-bridge/0.1",
        "x-gameday-scoreboard-provider": provider,
      },
      body: JSON.stringify(envelope),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await outbox.acknowledge(envelope);
    backoffMs = 1_000;
  } catch (error) {
    backoffMs = Math.min(backoffMs * 2, 30_000);
    console.warn(new Date().toISOString(), "delivery unavailable; retained locally", error?.message || error);
    setTimeout(() => void flush(), backoffMs);
  } finally {
    flushing = false;
  }
}

async function onFrame(frame) {
  const state = parseFairPlayFrame(frame);
  if (!state) return;
  const observedAt = new Date().toISOString();
  await outbox.put({
    ...state,
    deviceId,
    eventAt: observedAt,
    eventId: randomUUID(),
    fieldId,
    isOfficial: true,
    originEventId: null,
    provider,
    readAt: observedAt,
    sequence: null,
    sessionId,
  });
  await flush();
}

async function serial(path) {
  const { SerialPort } = await import("serialport").catch(() => {
    console.error("Install the serial driver on the field device first: npm i serialport");
    process.exit(1);
  });
  const port = new SerialPort({ path, baudRate: Number(process.env.SCOREBOARD_BAUD || 9600) });
  let buffered = "";
  port.on("data", (chunk) => {
    buffered += chunk.toString("latin1");
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() || "";
    for (const line of lines) void onFrame(line);
  });
  port.on("error", (error) => console.error("serial error", error.message));
}

function tcp(target) {
  const [host, portText] = target.split(":");
  const socket = createConnection({ host, port: Number(portText || 10001) });
  let buffered = "";
  socket.on("data", (chunk) => {
    buffered += chunk.toString("latin1");
    const lines = buffered.split(/\r?\n/);
    buffered = lines.pop() || "";
    for (const line of lines) void onFrame(line);
  });
  socket.on("error", (error) => console.error("tcp error", error.message));
  socket.on("close", () => setTimeout(() => tcp(target), 5_000));
}

await outbox.load();
await flush();
const serialPath = value("--serial");
const tcpTarget = value("--tcp");
const fixture = value("--fixture");
if (serialPath) await serial(serialPath);
else if (tcpTarget) tcp(tcpTarget);
else if (fixture) await onFrame(fixture);
else { console.error("Pass --serial <path>, --tcp <host:port>, or --fixture <labelled VCG text>"); process.exit(1); }
