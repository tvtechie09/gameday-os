# GameDay Bridge (Daktronics read-only)

A tiny process that sits next to a Daktronics All Sport controller, listens to
its RTD output, and feeds live scores to GameDay OS field pages, TVs, and
scoreboard displays. **Read-only**: it never controls the physical scoreboard.

## Hardware per field

- Raspberry Pi (any model with USB) or any always-on machine
- RTD tap from the All Sport controller:
  - USB-to-DB25/DB9 serial cable into the controller's RTD/output port, or
  - a serial-to-ethernet adapter already installed for TV graphics (use `--tcp`)
- Optional but recommended: LTE SIM/hat so scores survive venue Wi-Fi outages

## Server setup (once)

Set `DAKTRONICS_ADAPTER_TOKEN` in the Vercel project env (any long random
string). The ingestion endpoint is already live at
`POST /api/integrations/daktronics/readings`.

## Bridge setup (per field)

```bash
export GAMEDAY_URL=https://gameday-os.vercel.app
export DAKTRONICS_ADAPTER_TOKEN=<same token as the server>
export GAMEDAY_FIELD_ID=<field uuid from Admin → Fields>

# pick one source:
node gameday-daktronics-bridge.mjs --demo                  # end-to-end test, no hardware
node gameday-daktronics-bridge.mjs --tcp 192.168.1.50:10001
npm i serialport && node gameday-daktronics-bridge.mjs --serial /dev/ttyUSB0
```

Run it under systemd so it survives reboots:

```ini
# /etc/systemd/system/gameday-bridge.service
[Service]
Environment=GAMEDAY_URL=... DAKTRONICS_ADAPTER_TOKEN=... GAMEDAY_FIELD_ID=...
ExecStart=/usr/bin/node /opt/gameday/gameday-daktronics-bridge.mjs --serial /dev/ttyUSB0
Restart=always
[Install]
WantedBy=multi-user.target
```

## Notes

- Offline behavior: the latest reading queues in memory and flushes with
  backoff — a Wi-Fi blip never loses the current score.
- RTD field offsets vary by sport code; adjust `OFFSETS` in the script for
  your controller's configuration. Baseball "code 7" defaults are included.
- Session matching, dedupe, and event generation happen server-side in
  `src/lib/services/daktronics-scoreboard.ts`.
