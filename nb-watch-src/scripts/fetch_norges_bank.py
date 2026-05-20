"""Henter styringsrente, NOWA 3M (NIBOR-substitutt) og valutakurser fra Norges Bank.

Norges Bank's API: https://data.norges-bank.no/api/data/{dataflow}/{key}
- IR/B.KPRA.SD.R           — styringsrenten (daglig)
- SHORT_RATES/B.NOWA_AVERAGE.3M.R — 3-måneders NOWA-gjennomsnitt
                                    (Norges Bank publiserer ikke NIBOR;
                                    NOWA 3M er den moderne RFR-baserte
                                    erstatningen og som ECB/BIS regner som
                                    standard kort markedsrente i NOK)
- EXR/B.{CCY}.NOK.SP       — daglig spotkurs, base→NOK

CSV-format (semikolon-separert SDMX-CSV med navngitte dimensjoner).
"""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

SCRIPT_DIR = Path(__file__).parent
OUT_DIR = SCRIPT_DIR.parent / "public" / "data"

BASE = "https://data.norges-bank.no/api/data"
TIMEOUT = 30


def _fetch_csv(url: str) -> list[dict[str, str]]:
    r = requests.get(url, timeout=TIMEOUT, headers={"Accept": "text/csv"})
    r.raise_for_status()
    reader = csv.DictReader(io.StringIO(r.text), delimiter=";")
    return list(reader)


def fetch_styringsrente(start_period: str = "2019-01-01") -> dict[str, Any]:
    """IR dataflow, key B.KPRA.SD.R — daglig styringsrente."""
    url = f"{BASE}/IR/B.KPRA.SD.R?format=csv&startPeriod={start_period}"
    rows = _fetch_csv(url)
    data = [
        {"date": r["TIME_PERIOD"], "value": float(r["OBS_VALUE"])}
        for r in rows
        if r.get("TIME_PERIOD") and r.get("OBS_VALUE")
    ]
    data.sort(key=lambda x: x["date"])
    return {
        "series": "styringsrente",
        "unit": "percent",
        "description": "Norges Banks styringsrente, daglig.",
        "source_key": "IR/B.KPRA.SD.R",
        "data": data,
    }


def fetch_nowa_3m(start_period: str = "2019-01-01") -> dict[str, Any]:
    """SHORT_RATES dataflow, key B.NOWA_AVERAGE.3M.R — 3M NOWA-snitt."""
    url = f"{BASE}/SHORT_RATES/B.NOWA_AVERAGE.3M.R?format=csv&startPeriod={start_period}"
    rows = _fetch_csv(url)
    data = [
        {"date": r["TIME_PERIOD"], "value": float(r["OBS_VALUE"])}
        for r in rows
        if r.get("TIME_PERIOD") and r.get("OBS_VALUE")
    ]
    data.sort(key=lambda x: x["date"])
    return {
        "series": "nowa_3m",
        "unit": "percent",
        "description": "3-måneders glidende gjennomsnitt av NOWA. Brukes som proxy for NIBOR 3M — Norges Bank publiserer ikke NIBOR direkte, og NOWA er den moderne RFR-baserte erstatningen.",
        "source_key": "SHORT_RATES/B.NOWA_AVERAGE.3M.R",
        "data": data,
    }


def fetch_valuta(start_period: str = "2020-01-01") -> dict[str, Any]:
    """Daglig spot for EUR, USD, SEK, GBP mot NOK.

    UNIT_MULT håndteres slik at OBS_VALUE alltid er NOK per 1 enhet av base.
    SEK publiseres med UNIT_MULT=2 (per 100), de andre med UNIT_MULT=0.
    """
    currencies = ["EUR", "USD", "SEK", "GBP"]
    by_date: dict[str, dict[str, float]] = {}

    for ccy in currencies:
        url = f"{BASE}/EXR/B.{ccy}.NOK.SP?format=csv&startPeriod={start_period}"
        rows = _fetch_csv(url)
        for r in rows:
            date = r.get("TIME_PERIOD")
            val_raw = r.get("OBS_VALUE")
            mult_raw = r.get("UNIT_MULT") or "0"
            if not date or not val_raw:
                continue
            try:
                val = float(val_raw) / (10 ** int(mult_raw))
            except (ValueError, TypeError):
                continue
            by_date.setdefault(date, {})[ccy] = val

    data = [
        {"date": d, **vals} for d, vals in sorted(by_date.items())
    ]
    return {
        "series": "valuta",
        "unit": "NOK per 1 enhet base",
        "description": "Daglig spot, EUR/USD/SEK/GBP mot NOK. Verdiene er NOK per 1 enhet utenlandsk valuta (SEK normalisert fra per 100).",
        "currencies": currencies,
        "source_key_pattern": "EXR/B.{CCY}.NOK.SP",
        "data": data,
    }


def write_json(name: str, payload: dict[str, Any]) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out = OUT_DIR / f"{name}.json"
    payload["last_fetched"] = datetime.utcnow().isoformat() + "Z"
    out.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return out


def run() -> dict[str, Any]:
    results: dict[str, Any] = {}
    for name, fn in [
        ("styringsrente", fetch_styringsrente),
        ("nibor", fetch_nowa_3m),  # filnavn beholder "nibor" for kompatibilitet
        ("valuta", fetch_valuta),
    ]:
        try:
            payload = fn()
            write_json(name, payload)
            n_rows = len(payload.get("data", []))
            results[name] = {"status": "ok", "rows": n_rows, "key": payload.get("source_key") or payload.get("source_key_pattern")}
        except Exception as e:
            results[name] = {"status": "error", "message": str(e)}
    return results


if __name__ == "__main__":
    print(json.dumps(run(), indent=2, ensure_ascii=False))
