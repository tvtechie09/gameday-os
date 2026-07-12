#!/usr/bin/env node
// GameDay Bridge: reads a Daktronics All Sport controller's RTD output and
// posts normalized readings to GameDay OS. Runs on a Raspberry Pi (or any
// box) next to the scoreboard controller.
//
// Usage:
//   node gameday-daktronics-bridge.mjs --serial /dev/ttyUSB0        # RTD over serial (requires: npm i serialport)
//   node gameday-daktronics-bridge.mjs --tcp 192.168.1.50:10001     # RTD over a serial-to-ethernet adapter
//   node gameday-daktronics-bridge.mjs --demo                       # synthetic frames for end-to-end testing
//
// Required environment:
//   GAMEDAY_URL              e.g. https://gameday-os.vercel.app
//   DAKTRONICS_ADAPTER_TOKEN must match the server's DAKTRONICS_ADAPTER_TOKEN
//   GAMEDAY_FIELD_ID         the GameDay OS field this scoreboard serves
//
// Offline behavior: readings queue in memory (latest state wins) and flush
// with exponential backoff, so a Wi-Fi blip never loses the current score.

import { createConnection } from "node:net";

const args = process.argv.slice(2);
function argValue(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

const GAMEDAY_URL = (process.env.GAMEDAY_URL || "").replace(/\/$/, "");
const TOKEN = process.env.DAKTRONICS_ADAPTER_TOKEN || "";
const FIELD_ID = process.env.GAMEDAY_FIELD_ID || "";
const DEVICE_ID = process.env.GAMEDAY_DEVICE_ID || "bridge-" + Math.random().toString(36).slice(2, 8);
const POST_URL = GAMEDAY_URL + "/api/integrations/daktronics/readings";

if (!GAMEDAY_URL || !TOKEN || !FIELD_ID) {
  console.error("Set GAMEDAY_URL, DAKTRONICS_ADAPTER_TOKEN, and GAMEDAY_FIELD_ID.");
  process.exit(1);
}

// --- All Sport RTD frame parsing -------------------------------------------
// All Sport 5000-series RTD frames are fixed-position ASCII records. Field
// positions vary by sport code; the baseball layout below covers the common
// "code 7" stream. Adjust OFFSETS for your controller's sport code if needed.
const OFFSETS = {
  homeScore: [7, 9],
  awayScore: [9, 11],
  inning: [11, 13],
  topBottom: [13, 14], // '1' top / '2' bottom on many firmwares
  balls: [14, 15],
  strikes: [15, 16],
  outs: [16, 17]
};

function intAt(text, [start, end]) {
  const parsed = parseInt(text.slice(start, end).trim(), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseRtdFrame(frame) {
  const text = frame.toString("latin1");
  if (text.length < 17) return null;
  const homeScore = intAt(text, OFFSETS.homeScore);
  const awayScore = intAt(text, OFFSETS.awayScore);
  if (homeScore === null && awayScore === null) return null;
  const half = text.slice(...OFFSETS.topBottom);
  return {
    homeScore: homeScore ?? 0,
    awayScore: awayScore ?? 0,
    inning: intAt(text, OFFSETS.inning),
    topBottom: half === "1" ? "top" : half === "2" ? "bottom" : null,
    balls: intAt(text, OFFSETS.balls),
    strikes: intAt(text, OFFSETS.strikes),
    outs: intAt(text, OFFSETS.outs),
    status: "active"
  };
}

// --- Delivery with offline queue --------------------------------------------
let pending = null; // latest unsent state (absolute state: latest wins)
let lastSentHash = "";
let backoffMs = 1000;

function hashState(state) {
  return JSON.stringify([state.homeScore, state.awayScore, state.inning, state.topBottom, state.balls, state.strikes, state.outs]);
}

async function flush() {
  if (!pending) return;
  const state = pending;
  try {
    const response = await fetch(POST_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-gameday-adapter-token": TOKEN,
        "x-gameday-adapter-host": DEVICE_ID,
        "x-gameday-adapter-version": "bridge/1.0"
      },
      body: JSON.stringify({ ...state, fieldId: FIELD_ID, deviceId: DEVICE_ID, readAt: new Date().toISOString(), isOfficial: true })
    });
    if (!response.ok) throw new Error("HTTP " + response.status);
    if (pending === state) pending = null;
    lastSentHash = hashState(state);
    backoffMs = 1000;
    console.log(new Date().toISOString(), "sent", hashState(state));
  } catch (error) {
    backoffMs = Math.min(backoffMs * 2, 30000);
    console.warn(new Date().toISOString(), "offline, retrying in", backoffMs + "ms", "(" + (error?.message || error) + ")");
    setTimeout(flush, backoffMs);
  }
}

function onState(state) {
  if (!state || hashState(state) === lastSentHash) return;
  pending = state;
  void flush();
}

// --- Sources -----------------------------------------------------------------
async function runSerial(path) {
  const { SerialPort } = await import("serialport").catch(() => {
    console.error("Install the serial driver on this device first: npm i serialport");
    process.exit(1);
  });
  const port = new SerialPort({ path, baudRate: Number(process.env.RTD_BAUD || 19200) });
  console.log("Listening on serial", path);
  port.on("data", (chunk) => onState(parseRtdFrame(chunk)));
  port.on("error", (error) => console.error("serial error", error.message));
}

function runTcp(target) {
  const [host, portText] = target.split(":");
  const socket = createConnection({ host, port: Number(portText || 10001) });
  console.log("Listening on tcp", target);
  socket.on("data", (chunk) => onState(parseRtdFrame(chunk)));
  socket.on("error", (error) => { console.error("tcp error", error.message); setTimeout(() => runTcp(target), 5000); });
  socket.on("close", () => setTimeout(() => runTcp(target), 5000));
}

function runDemo() {
  console.log("Demo mode: posting a synthetic game to", POST_URL);
  let home = 0, away = 0, inning = 1, half = "top", outs = 0;
  setInterval(() => {
    outs += 1;
    if (outs > 2) { outs = 0; if (half === "top") { half = "bottom"; } else { half = "top"; inning += 1; } }
    if (Math.random() < 0.3) { if (Math.random() < 0.5) home += 1; else away += 1; }
    onState({ homeScore: home, awayScore: away, inning, topBottom: half, balls: 0, strikes: 0, outs, status: "active" });
  }, 8000);
}

const serial = argValue("--serial");
const tcp = argValue("--tcp");
if (serial) runSerial(serial);
else if (tcp) runTcp(tcp);
else if (args.includes("--demo")) runDemo();
else { console.error("Pass --serial <path>, --tcp <host:port>, or --demo"); process.exit(1); }
