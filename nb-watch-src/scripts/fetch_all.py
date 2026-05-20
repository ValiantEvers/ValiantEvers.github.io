"""Orchestrator — kjører alle fetchers og skriver manifest.json.

Brukes både lokalt (manuell) og av GitHub Actions-cronen.
Feiler ikke hvis en enkelt kilde feiler — logger status og fortsetter.
"""

from __future__ import annotations

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

import fetch_norges_bank
import fetch_ssb
import update_rentebane

SCRIPT_DIR = Path(__file__).parent
OUT_DIR = SCRIPT_DIR.parent / "public" / "data"
MANIFEST = OUT_DIR / "manifest.json"


def main() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    nb_results = fetch_norges_bank.run()
    ssb_results = fetch_ssb.run()
    rb_result = update_rentebane.update()

    sources = []
    if any(v.get("status") == "ok" for v in nb_results.values()):
        sources.append({
            "name": "Norges Bank",
            "url": "https://data.norges-bank.no/",
            "series": list(nb_results.keys()),
        })
    if any(v.get("status") == "ok" for v in ssb_results.values()):
        sources.append({
            "name": "SSB",
            "url": "https://data.ssb.no/api/v0/no/",
            "series": list(ssb_results.keys()),
        })
    if rb_result.get("status") == "ok":
        sources.append({
            "name": "Norges Bank (Pengepolitisk rapport, manuell)",
            "url": "https://www.norges-bank.no/aktuelt/publikasjoner/pengepolitisk-rapport/",
            "series": ["rentebane"],
        })

    manifest = {
        "lastUpdated": datetime.utcnow().isoformat() + "Z",
        "sources": sources,
        "fetch_status": {
            "norges_bank": nb_results,
            "ssb": ssb_results,
            "rentebane": rb_result,
        },
    }
    MANIFEST.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")

    print(json.dumps(manifest, indent=2, ensure_ascii=False))

    # Exit-code 0 selv om noe feiler — vi vil at JSON-filene som lyktes skal committes.
    return 0


if __name__ == "__main__":
    sys.exit(main())
