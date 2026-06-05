#!/usr/bin/env python3
"""Henter norske makro-nøkkeltall og skriver macro.json til repo-rot.

Kilder (nøkkelfrie, autoritative):
  - Inflasjon:    SSB JSON-stat tabell 03013 — 12-mnd endring (Tolvmanedersendring) + indeksnivå (KpiIndMnd, 2015=100)
  - Lønnsvekst:   SSB JSON-stat tabell 11418 — gj.snittlig månedslønn, alle yrker/sektorer; YoY beregnet
  - Styringsrente: Norges Bank IR/B.KPRA.SD.R (CSV)

Kun stdlib (urllib) — ingen avhengigheter. Kjøres månedlig av .github/workflows/macro.yml.
Klientene (pensjonskalkulator, personligøkonomi) leser den committede macro.json; de
hardkodede default-verdiene er fallback hvis fila mangler/er ugyldig.

Defensivt: hver henting i try/except — en feilet kilde beholder forrige verdi.
Idempotent: skriver kun ved faktisk endrede verdier (ingen unødige commits).
"""
from __future__ import annotations

import csv
import io
import json
import sys
import urllib.request as u
from datetime import datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "macro.json"  # repo-rot
SSB = "https://data.ssb.no/api/v0/no/table"
NB = "https://data.norges-bank.no/api/data"
TIMEOUT = 30


def _ssb_series(table: str, query: list[dict]) -> list[tuple[str, float]]:
    """POST json-stat2-query, returner [(periode, verdi)] sortert kronologisk, uten None."""
    body = json.dumps({"query": query, "response": {"format": "json-stat2"}}).encode()
    req = u.Request(f"{SSB}/{table}/", data=body, headers={"Content-Type": "application/json"})
    d = json.load(u.urlopen(req, timeout=TIMEOUT))
    tid = d["dimension"]["Tid"]["category"]
    idx = tid["index"]
    vals = d["value"]
    keys = sorted(idx, key=lambda k: idx[k])
    return [(k, vals[idx[k]]) for k in keys if vals[idx[k]] is not None]


def _period_iso(p: str) -> str:
    """SSB-periode (YYYY / YYYYMmm / YYYYKq) → lesbar ISO-aktig form."""
    if "M" in p:
        y, m = p.split("M")
        return f"{y}-{int(m):02d}"
    if "K" in p:
        y, q = p.split("K")
        return f"{y}-Q{q}"
    return p


def fetch_inflation() -> dict:
    yoy = _ssb_series("03013", [
        {"code": "Konsumgrp", "selection": {"filter": "item", "values": ["TOTAL"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Tolvmanedersendring"]}},
    ])
    lvl = _ssb_series("03013", [
        {"code": "Konsumgrp", "selection": {"filter": "item", "values": ["TOTAL"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["KpiIndMnd"]}},
    ])
    pk, pv = yoy[-1]
    _, lv = lvl[-1]
    return {
        "yoyPct": round(float(pv), 2),
        "indexLevel": round(float(lv), 1),
        "asOf": _period_iso(pk),
        "source": "SSB tabell 03013",
    }


def fetch_wage() -> dict:
    s = _ssb_series("11418", [
        {"code": "MaaleMetode", "selection": {"filter": "item", "values": ["02"]}},
        {"code": "Yrke", "selection": {"filter": "item", "values": ["0-9"]}},
        {"code": "Sektor", "selection": {"filter": "item", "values": ["ALLE"]}},
        {"code": "Kjonn", "selection": {"filter": "item", "values": ["0"]}},
        {"code": "AvtaltVanlig", "selection": {"filter": "item", "values": ["0"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Manedslonn"]}},
    ])
    (_, prev_v), (cur_k, cur_v) = s[-2], s[-1]
    yoy = (float(cur_v) - float(prev_v)) / float(prev_v) * 100.0
    return {"yoyPct": round(yoy, 2), "asOf": _period_iso(cur_k), "source": "SSB tabell 11418"}


def fetch_policy_rate() -> dict:
    url = f"{NB}/IR/B.KPRA.SD.R?format=csv&startPeriod=2024-01-01"
    txt = u.urlopen(url, timeout=TIMEOUT).read().decode()
    rows = [r for r in csv.DictReader(io.StringIO(txt), delimiter=";") if r.get("OBS_VALUE")]
    last = rows[-1]
    return {"pct": round(float(last["OBS_VALUE"]), 2), "asOf": last["TIME_PERIOD"], "source": "Norges Bank"}


def main() -> None:
    prev: dict = {}
    if OUT.exists():
        try:
            prev = json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:
            prev = {}
    prev_vals = {k: v for k, v in prev.items() if k != "updated"}

    out = dict(prev_vals)  # behold forrige verdi ved feilet henting
    for key, fn in (("inflation", fetch_inflation), ("wageGrowth", fetch_wage), ("policyRate", fetch_policy_rate)):
        try:
            out[key] = fn()
            print(f"  {key}: {out[key]}")
        except Exception as e:  # noqa: BLE001 — defensivt: behold forrige verdi
            print(f"  {key}: FEIL ({e}) — beholder forrige verdi", file=sys.stderr)

    if out == prev_vals and OUT.exists():
        print("Ingen endring — macro.json urørt (ingen commit).")
        return

    payload = {"updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
    payload.update(out)
    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Skrev {OUT}")


if __name__ == "__main__":
    main()
