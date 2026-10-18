# prosjekter/screenshots/

Self-hosted feature-card screenshots for `prosjekter/index.html`. Each `<slug>.webp`
is a 16:10 retina (800×500) capture shown ~400×250 in a project card, loaded with
`loading="lazy"` + intrinsic `width`/`height` (no CLS). Since 2026-10-17 only skatt-mcp has no
`bilde` field in `projects.json`; its card shows a pale tile with the repo URL. The three
Fra null til investor guides got captures that day.

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
Only some slugs: pass them as arguments (`... gen_project_screenshots.py klima renteriket`).
Before a deploy: `SHOT_BASE=http://127.0.0.1:8765` captures the local repo instead of live
evers.no (2026-10-17: personligokonomi was re-captured from its new local build this way).

Tune `scroll` / `wait_ms` / `q` per target in the script if a capture frames the wrong
region or lands on a loading/empty state (SPAs hydrate; osebx fetches live data).

**After regenerating, visually inspect every file** — do not trust file size alone.
Watch osebx (live-data loading/error state) and the React SPAs (pre-hydration blank).

## Budget

Per file ≤ 25 KB, WebP, 800×500. **Current set: 19 files, 360 KB** (2026-10-17, after the
plan C re-captures).

The ≤ 250 KB total this file used to state was written when the gallery had 12 cards and
no longer fits 16. Treat the per-file cap as the live constraint; the total needs a
decision rather than a silently rewritten number.

Four files are over the per-file cap:

| File | Size | Dimensions |
|---|---|---|
| `aksjeskatt.webp` | 53 KB | 1280×900 |
| `masteroppgave.webp` | 7 KB | 800×500 |
| `examprep.webp` | 25.2 KB | 800×500 |
| `wc2026.webp` | 25.1 KB | 800×500 |

`aksjeskatt` is most of the overage: it was captured by hand at a non-standard size and is
**not** in `TARGETS`, so `gen_project_screenshots.py` never regenerates it. Adding it would
bring it to 800×500 and roughly halve its weight (`formuessamtalen` went from 41 KB at
1400×900 to 17 KB that way on 2026-10-17). The other three are marginal — content-dense
captures at q74.

Five files have no `TARGETS` entry and so are frozen at whatever produced them:
`aksjeskatt`, `integrert-modellering`, `nb-watch`, `regnskapsoppstillinger`, `verdsettelse`.
All five belong to unlisted pages (`synlig:false`), so none shows in the gallery today.
(`forretningsenhet-dashboard.webp` was deleted with its page on 2026-07-31.)

Cards are `loading="lazy"`, so this is repo weight, not first-paint cost.

The three "Finansielle maler" cards capture the themed finansielle-maler page sections
(legible, on-brand, light) rather than the raw dense Excel-grid PNGs under
`finansielle-maler/screenshots/` (those exceed the per-file budget and read poorly at
thumbnail size).
