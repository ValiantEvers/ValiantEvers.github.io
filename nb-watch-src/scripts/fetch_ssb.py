"""Henter KPI, KPI-JAE, boligprisindeks og lønn fra SSB Pxweb API.

API: https://data.ssb.no/api/v0/no/table/{tabellid}/
Format: POST med JSON-query, response som json-stat2.

Tabeller (verifisert 2026-05):
- 03013 — KPI, ContentsCode "Tolvmanedersendring"
- 05327 — KPI-JAE/JA, ContentsCode "Tolvmanedersendring", Konsumgrp "JAE_TOTAL"
- 07221 — Prisindeks for brukte boliger, kvartalsvis (NB: 06035 er kun
          kvm-priser, ikke en ekte indeks — derfor 07221 i stedet for det
          som var i original-prompten)
- 11418 — Yrkesfordelt månedslønn (alle yrker), årlig
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

import requests

SCRIPT_DIR = Path(__file__).parent
OUT_DIR = SCRIPT_DIR.parent / "public" / "data"

BASE = "https://data.ssb.no/api/v0/no/table"
TIMEOUT = 30


def _post(table_id: str, query: list[dict[str, Any]]) -> dict[str, Any]:
    body = {"query": query, "response": {"format": "json-stat2"}}
    url = f"{BASE}/{table_id}/"
    r = requests.post(url, json=body, timeout=TIMEOUT)
    r.raise_for_status()
    return r.json()


def _flatten_jsonstat(d: dict[str, Any]) -> list[dict[str, Any]]:
    """Pakker ut én-måls (skalar per Tid) json-stat2-respons til [{date,value}...]."""
    values = d.get("value") or []
    dim = d.get("dimension") or {}
    tid = dim.get("Tid") or dim.get("tid") or {}
    cat = tid.get("category") or {}
    index = cat.get("index") or {}
    label = cat.get("label") or {}

    if isinstance(index, dict):
        ordered = sorted(index.items(), key=lambda kv: kv[1])
        keys = [k for k, _ in ordered]
    elif isinstance(index, list):
        keys = list(index)
    else:
        keys = []

    out = []
    for i, key in enumerate(keys):
        if i >= len(values):
            break
        v = values[i]
        if v is None:
            continue
        out.append({
            "date": _ssb_period_to_iso(key),
            "label": label.get(key, key),
            "value": float(v),
        })
    return out


def _ssb_period_to_iso(p: str) -> str:
    """Konverterer SSB-periode (YYYY, YYYYMNN, YYYYKQ) til ISO-dato (første dag i perioden)."""
    if len(p) == 4 and p.isdigit():
        return f"{p}-01-01"
    if "M" in p:
        y, m = p.split("M")
        return f"{y}-{int(m):02d}-01"
    if "K" in p:
        y, q = p.split("K")
        month = {1: "01", 2: "04", 3: "07", 4: "10"}.get(int(q), "01")
        return f"{y}-{month}-01"
    return p


def fetch_kpi(years: int = 10) -> dict[str, Any]:
    """KPI, 12-mnd endring, totalindeks."""
    cutoff_year = datetime.utcnow().year - years
    d = _post("03013", [
        {"code": "Konsumgrp", "selection": {"filter": "item", "values": ["TOTAL"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Tolvmanedersendring"]}},
    ])
    rows = [r for r in _flatten_jsonstat(d) if int(r["date"][:4]) >= cutoff_year]
    return {
        "series": "kpi",
        "unit": "percent",
        "description": "KPI, 12-måneders endring i prosent.",
        "source": "SSB tabell 03013",
        "data": rows,
    }


def fetch_kpi_jae(years: int = 10) -> dict[str, Any]:
    cutoff_year = datetime.utcnow().year - years
    d = _post("05327", [
        {"code": "Konsumgrp", "selection": {"filter": "item", "values": ["JAE_TOTAL"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Tolvmanedersendring"]}},
    ])
    rows = [r for r in _flatten_jsonstat(d) if int(r["date"][:4]) >= cutoff_year]
    return {
        "series": "kpi_jae",
        "unit": "percent",
        "description": "KPI-JAE (justert for avgifter og uten energivarer), 12-måneders endring i prosent.",
        "source": "SSB tabell 05327",
        "data": rows,
    }


def fetch_boligpris(years: int = 10) -> dict[str, Any]:
    """Boligprisindeks, kvartalsvis, hele landet, alle boligtyper."""
    cutoff_year = datetime.utcnow().year - years
    d = _post("07221", [
        {"code": "Region", "selection": {"filter": "item", "values": ["TOTAL"]}},
        {"code": "Boligtype", "selection": {"filter": "item", "values": ["00"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Boligindeks"]}},
    ])
    rows = [r for r in _flatten_jsonstat(d) if int(r["date"][:4]) >= cutoff_year]
    return {
        "series": "boligpris",
        "unit": "index (2015=100)",
        "description": "Prisindeks for brukte boliger, kvartalsvis. Indeksen er ikke sesongjustert.",
        "source": "SSB tabell 07221",
        "data": rows,
    }


def fetch_lonn(years: int = 10) -> dict[str, Any]:
    """Gjennomsnittlig månedslønn, alle yrker, alle sektorer, begge kjønn, årlig.

    Returner nivå-data; UI regner ut årlig vekst (YoY).
    """
    cutoff_year = datetime.utcnow().year - years
    d = _post("11418", [
        {"code": "MaaleMetode", "selection": {"filter": "item", "values": ["02"]}},
        {"code": "Yrke", "selection": {"filter": "item", "values": ["0-9"]}},
        {"code": "Sektor", "selection": {"filter": "item", "values": ["ALLE"]}},
        {"code": "Kjonn", "selection": {"filter": "item", "values": ["0"]}},
        {"code": "AvtaltVanlig", "selection": {"filter": "item", "values": ["0"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Manedslonn"]}},
    ])
    rows = [r for r in _flatten_jsonstat(d) if int(r["date"][:4]) >= cutoff_year]

    # Beregn YoY-vekst (årlig endring i prosent).
    rows.sort(key=lambda r: r["date"])
    enriched = []
    for i, r in enumerate(rows):
        prev = rows[i - 1] if i > 0 else None
        growth = None
        if prev and prev["value"] != 0:
            growth = (r["value"] - prev["value"]) / prev["value"] * 100.0
        enriched.append({
            "date": r["date"],
            "year": r["date"][:4],
            "value": r["value"],
            "yoy_pct": round(growth, 2) if growth is not None else None,
        })
    return {
        "series": "lonnsvekst",
        "unit": "NOK per måned + YoY %",
        "description": "Gjennomsnittlig månedslønn, alle yrker og sektorer, og årlig vekst (YoY).",
        "source": "SSB tabell 11418",
        "data": enriched,
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
        ("kpi", fetch_kpi),
        ("kpi_jae", fetch_kpi_jae),
        ("boligpris", fetch_boligpris),
        ("lonnsvekst", fetch_lonn),
    ]:
        try:
            payload = fn()
            write_json(name, payload)
            n_rows = len(payload.get("data", []))
            results[name] = {"status": "ok", "rows": n_rows, "source": payload.get("source")}
        except Exception as e:
            results[name] = {"status": "error", "message": str(e)}
    return results


if __name__ == "__main__":
    print(json.dumps(run(), indent=2, ensure_ascii=False))
