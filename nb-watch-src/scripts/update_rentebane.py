"""Leser inn manuelt vedlikeholdt rentebane-CSV og skriver til public/data/rentebane.json.

Norges Bank publiserer rentebanen i Pengepolitisk rapport (PPR) 4x/år. For MVP
vedlikeholdes denne manuelt — én rad per kvartal med forventet styringsrente
ved kvartalsstart. Bytt ut når ny PPR slippes.
"""

from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any

SCRIPT_DIR = Path(__file__).parent
MANUAL_CSV = SCRIPT_DIR / "data" / "rentebane_manual.csv"
OUT_JSON = SCRIPT_DIR.parent / "public" / "data" / "rentebane.json"


def parse_manual_csv(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as f:
        reader = csv.DictReader(line for line in f if not line.startswith("#"))
        for row in reader:
            dato = (row.get("dato") or "").strip()
            rente_raw = (row.get("rente") or "").strip()
            kilde = (row.get("kilde_ppr") or "").strip()
            if not dato or not rente_raw:
                continue
            try:
                datetime.strptime(dato, "%Y-%m-%d")
                rente = float(rente_raw)
            except ValueError:
                print(f"  ! Hopper over ugyldig rad: {row}")
                continue
            rows.append({"date": dato, "value": rente, "source": kilde})
    return rows


def update() -> dict[str, Any]:
    if not MANUAL_CSV.exists():
        return {"status": "error", "message": f"Mangler {MANUAL_CSV}"}

    rows = parse_manual_csv(MANUAL_CSV)
    if not rows:
        return {"status": "error", "message": "Ingen gyldige rader i CSV"}

    rows.sort(key=lambda r: r["date"])
    sources = sorted({r["source"] for r in rows if r["source"]})

    payload = {
        "series": "rentebane",
        "unit": "percent",
        "description": "Norges Banks publiserte rentebane fra siste PPR.",
        "sources": sources,
        "data": rows,
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    return {
        "status": "ok",
        "rows": len(rows),
        "first": rows[0]["date"],
        "last": rows[-1]["date"],
        "sources": sources,
    }


if __name__ == "__main__":
    result = update()
    print(json.dumps(result, indent=2, ensure_ascii=False))
