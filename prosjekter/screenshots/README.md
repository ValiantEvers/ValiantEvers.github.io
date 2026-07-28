# prosjekter/screenshots/

Self-hosted feature-card screenshots for `prosjekter/index.html`. Each `<slug>.webp`
is a 16:10 retina (800×500) capture shown ~400×250 in a project card, loaded with
`loading="lazy"` + intrinsic `width`/`height` (no CLS). Cards without a `bilde` field in
`projects.json` keep their emoji icon (skatt-mcp, the three Fra-null-til-investor guides).

In `[data-theme="medieval"]` the screenshot is hidden and the card's emoji shows instead
(the medieval theme has its own visual system — see `DESIGN.md`).

## Regenerate

Generated headlessly from the **live** evers.no apps (osebx/ and wc2026/ live in separate
repos, so live URLs are authoritative) by `scripts/gen_project_screenshots.py`:

```bash
python3 -m venv /tmp/shotenv && /tmp/shotenv/bin/pip install playwright pillow
/tmp/shotenv/bin/python scripts/gen_project_screenshots.py
```

Playwright drives the **system** Chrome (`channel="chrome"`) — no chromium download.
Tune `scroll` / `wait_ms` / `q` per target in the script if a capture frames the wrong
region or lands on a loading/empty state (SPAs hydrate; osebx fetches live data).

**After regenerating, visually inspect every file** — do not trust file size alone.
Watch osebx (live-data loading/error state) and the React SPAs (pre-hydration blank).

## Budget

Per file ≤ 25 KB, WebP, 800×500. **Current set: 16 files, 378 KB.**

The ≤ 250 KB total this file used to state was written when the gallery had 12 cards and
no longer fits 16. Treat the per-file cap as the live constraint; the total needs a
decision rather than a silently rewritten number.

Five files are over the per-file cap:

| File | Size | Dimensions |
|---|---|---|
| `aksjeskatt.webp` | 53 KB | 1280×900 |
| `formuessamtalen.webp` | 41 KB | 1400×900 |
| `masteroppgave.webp` | 27 KB | 800×500 |
| `examprep.webp` | 25.2 KB | 800×500 |
| `wc2026.webp` | 25.1 KB | 800×500 |

`aksjeskatt` and `formuessamtalen` are most of the overage: both were captured by hand at
non-standard sizes and are **not** in `TARGETS`, so `gen_project_screenshots.py` never
regenerates them. Adding them to `TARGETS` would bring both to 800×500 and roughly halve
their weight. The other three are marginal — content-dense captures at q74.

Seven files have no `TARGETS` entry and so are frozen at whatever produced them:
`aksjeskatt`, `formuessamtalen`, `forretningsenhet-dashboard`, `integrert-modellering`,
`nb-watch`, `regnskapsoppstillinger`, `verdsettelse`.

Cards are `loading="lazy"`, so this is repo weight, not first-paint cost.

The three "Finansielle maler" cards capture the themed finansielle-maler page sections
(legible, on-brand, light) rather than the raw dense Excel-grid PNGs under
`finansielle-maler/screenshots/` (those exceed the per-file budget and read poorly at
thumbnail size).
