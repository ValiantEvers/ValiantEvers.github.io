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

Total ≤ 250 KB, each file ≤ 25 KB, WebP. Current set: 12 files, ~235 KB.
The three "Finansielle maler" cards capture the themed finansielle-maler page sections
(legible, on-brand, light) rather than the raw dense Excel-grid PNGs under
`finansielle-maler/screenshots/` (those exceed the per-file budget and read poorly at
thumbnail size).
