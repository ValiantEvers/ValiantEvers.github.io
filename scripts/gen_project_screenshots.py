#!/usr/bin/env python3
"""Generate optimized WebP screenshots for the prosjekter/ feature cards.

Captures the live evers.no apps headlessly (Playwright driving the *system*
Chrome — no chromium download) and exports cropped, retina (2x) WebP at
800x500 (16:10), displayed ~400x250 in the card.

Why live URLs: osebx/ and wc2026/ are separate GitHub Pages repos (not in this
repo) but served under evers.no; capturing live also matches the deployed look.
The three "Finansielle maler" cards capture the themed finansielle-maler page at
their section anchors (the actual link target) — far more legible and lighter
than the raw dense Excel-grid PNGs under finansielle-maler/screenshots/.

Regenerate:
    python3 -m venv /tmp/shotenv && /tmp/shotenv/bin/pip install playwright pillow
    /tmp/shotenv/bin/python scripts/gen_project_screenshots.py
Then visually inspect every file in prosjekter/screenshots/ before committing.
Tune `scroll`/`wait_ms`/`q` per target below if a capture frames the wrong
region or lands on a loading/empty state (SPAs hydrate; osebx fetches live data).
"""
import io
import pathlib
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
OUT = ROOT / "prosjekter" / "screenshots"
OUT.mkdir(parents=True, exist_ok=True)

TW, TH = 800, 500          # 16:10 retina target
QUALITY = 74               # per-target override via "q"

TARGETS = [
    {"slug": "osebx",                      "url": "https://www.evers.no/osebx/",                                            "scroll": 0,   "wait_ms": 6500},
    {"slug": "pensjonskalkulator",         "url": "https://www.evers.no/pensjonskalkulator/",                               "scroll": 0,   "wait_ms": 4000},
    {"slug": "personligokonomi",           "url": "https://www.evers.no/personligokonomi/",                                 "scroll": 820, "wait_ms": 4000},
    {"slug": "forretningsenhet-dashboard", "url": "https://www.evers.no/prosjekter/forretningsenhet-dashboard/",            "scroll": 0,   "wait_ms": 4000},
    {"slug": "nb-watch",                   "url": "https://www.evers.no/nb-watch/",                                         "scroll": 0,   "wait_ms": 4000},
    {"slug": "leie-eller-eie",             "url": "https://www.evers.no/leie-eller-eie/",                                   "scroll": 0,   "wait_ms": 3500},
    {"slug": "masteroppgave",              "url": "https://www.evers.no/prosjekter/masteroppgave/",                         "scroll": 980, "wait_ms": 3500},
    {"slug": "wc2026",                     "url": "https://www.evers.no/wc2026/",                                           "scroll": 0,   "wait_ms": 4000},
    {"slug": "examprep",                   "url": "https://www.evers.no/examprep/",                                         "scroll": 0,   "wait_ms": 3500, "q": 69},
    {"slug": "regnskapsoppstillinger",     "url": "https://www.evers.no/prosjekter/finansielle-maler/#grunnleggende",       "scroll": 0,   "wait_ms": 2500, "q": 72},
    {"slug": "integrert-modellering",      "url": "https://www.evers.no/prosjekter/finansielle-maler/#integrert",           "scroll": 0,   "wait_ms": 2500, "q": 72},
    {"slug": "verdsettelse",               "url": "https://www.evers.no/prosjekter/finansielle-maler/#verdsettelse",        "scroll": 0,   "wait_ms": 2500, "q": 72},
]


def cover_to_target(img):
    """Crop img to 16:10 (cover, top-anchored) then resize to TWxTH."""
    img = img.convert("RGB")
    w, h = img.size
    ratio = TW / TH
    if w / h > ratio:
        nw = int(h * ratio)
        left = (w - nw) // 2
        img = img.crop((left, 0, left + nw, h))
    else:
        nh = int(w / ratio)
        img = img.crop((0, 0, w, nh))
    return img.resize((TW, TH), Image.LANCZOS)


def main():
    with sync_playwright() as p:
        b = p.chromium.launch(channel="chrome", headless=True)
        for t in TARGETS:
            pg = b.new_page(viewport={"width": 1440, "height": 900}, device_scale_factor=2)
            try:
                pg.goto(t["url"], wait_until="networkidle", timeout=45000)
            except Exception as e:                      # noqa: BLE001
                print(f"  ! {t['slug']} networkidle timeout ({e}); continuing")
            if t["scroll"]:
                pg.evaluate(f"window.scrollTo(0,{t['scroll']})")
            pg.wait_for_timeout(t["wait_ms"])
            png = pg.screenshot(type="png")             # 1440x900 viewport (16:10) @2x
            pg.close()
            img = cover_to_target(Image.open(io.BytesIO(png)))
            q = t.get("q", QUALITY)
            path = OUT / f"{t['slug']}.webp"
            img.save(path, "WEBP", quality=q, method=6)
            print(f"  {t['slug']}.webp  {path.stat().st_size // 1024} KB (q{q})")
        b.close()
    print("Done. Now visually inspect every file in prosjekter/screenshots/.")


if __name__ == "__main__":
    main()
