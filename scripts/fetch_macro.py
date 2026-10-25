#!/usr/bin/env python3
"""Henter norske makro-nøkkeltall og skriver macro.json til repo-rot.

Kilder (nøkkelfrie, autoritative):
  - Inflasjon:    SSB JSON-stat tabell 14700 — 12-mnd endring (Tolvmanedersendring) + indeksnivå (KpiIndMnd, 2025=100,
                  kjedet til 2015=100). Erstatter 03013, som ble avsluttet med 2025M12.
  - Lønnsvekst:   SSB JSON-stat tabell 11418 — gj.snittlig månedslønn, alle yrker/sektorer; YoY beregnet
  - Styringsrente: Norges Bank IR/B.KPRA.SD.R (CSV)

Kun stdlib (urllib) — ingen avhengigheter. Kjøres månedlig av .github/workflows/macro.yml.
Klientene (pensjonskalkulator, personligøkonomi) leser den committede macro.json; de
hardkodede default-verdiene er fallback hvis fila mangler/er ugyldig.

Defensivt: hver henting i try/except — en feilet kilde beholder forrige verdi.
Idempotent: skriver kun ved faktisk endrede verdier (ingen unødige commits).

Alderssperre: `fetch_macro.py --check-age` henter ingenting, men leser macro.json og gir exit 1
hvis en kilde er eldre enn MAX_AGE_*. Workflowen kjører den som eget steg etter commit, så en
avsluttet eller forsinket serie gir rød kjøring i stedet for grønne kjøringer med gamle tall.
"""
from __future__ import annotations

import csv
import io
import json
import sys
import urllib.request as u
from datetime import date, datetime, timezone
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "macro.json"  # repo-rot
SSB = "https://data.ssb.no/api/v0/no/table"
NB = "https://data.norges-bank.no/api/data"
TIMEOUT = 30

# Kjedefaktor 2025=100 → 2015=100: snittet av 03013 KpiIndMnd 2025M01–M12 (135,1 … 139,1).
# 03013 er avsluttet, så tallet endres ikke. Kontroll 2026-10-25: 14700 × faktor / 100 gjenskaper
# alle 312 overlappende måneder i 03013 (2000M01–2025M12) med maks avvik 0,11 (avrunding).
CPI_2025_AVG_2015BASE = 1652.6 / 12  # = 137,7167

# Alderssperre. SSB publiserer KPI rundt den 10. og cron går den 1., så inflasjonen tåler 2 mnd.
# Lønn (11418, årstall) regnes fra desember i året og kommer årlig i februar.
MAX_AGE_MONTHS = {"inflation": 2, "wageGrowth": 14}
MAX_AGE_DAYS_POLICY_RATE = 45


def _period_key(p: str) -> tuple[int, int]:
    """Kronologisk sorteringsnøkkel: '2026M04'→(2026,4), '2026K2'→(2026,6), '2025'→(2025,0)."""
    if "M" in p:
        y, m = p.split("M")
        return (int(y), int(m))
    if "K" in p:
        y, q = p.split("K")
        return (int(y), int(q) * 3)
    return (int(p), 0) if p.isdigit() else (0, 0)


def _ssb_series(table: str, query: list[dict]) -> list[tuple[str, float]]:
    """POST json-stat2-query, returner [(periode, verdi)] sortert kronologisk på PERIODE
    (ikke json-stat-posisjon), uten None — så series[-1] alltid er nyeste publiserte måned."""
    body = json.dumps({"query": query, "response": {"format": "json-stat2"}}).encode()
    req = u.Request(f"{SSB}/{table}/", data=body, headers={"Content-Type": "application/json"})
    d = json.load(u.urlopen(req, timeout=TIMEOUT))
    tid = d["dimension"]["Tid"]["category"]
    idx = tid["index"]
    vals = d["value"]
    items = [(k, vals[idx[k]]) for k in idx if vals[idx[k]] is not None]
    items.sort(key=lambda kv: _period_key(kv[0]))
    return items


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
    # Totalindeks (headline, VareTjenesteGrp 00), IKKE JAE (JAE = tabell 05327). yoy = 12-mnd endring,
    # siste måned; index = nivå, siste måned. Egne asOf-felt — yoy og indeks blandes ikke.
    # indexLevel MÅ stå på 2015=100-skalaen: personligøkonomi ankrer en 2015-basert KPI-serie på den.
    yoy = _ssb_series("14700", [
        {"code": "VareTjenesteGrp", "selection": {"filter": "item", "values": ["00"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Tolvmanedersendring"]}},
    ])
    lvl = _ssb_series("14700", [
        {"code": "VareTjenesteGrp", "selection": {"filter": "item", "values": ["00"]}},
        {"code": "ContentsCode", "selection": {"filter": "item", "values": ["KpiIndMnd"]}},
    ])
    yk, yv = yoy[-1]   # nyeste publiserte måned for inflasjonsraten
    lk, lv = lvl[-1]   # nyeste publiserte måned for indeksnivået (2025=100)
    return {
        "yoyPct": round(float(yv), 2),
        "asOf": _period_iso(yk),
        "indexLevel": round(float(lv) * CPI_2025_AVG_2015BASE / 100, 1),
        "indexAsOf": _period_iso(lk),
        "source": "SSB tabell 14700 (totalindeks)",
        "indexSource": "SSB tabell 14700 (2025=100), kjedet til 2015=100 med snittet av 03013 for 2025",
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


def _months_old(as_of: str, today: date) -> int:
    """Hele måneder fra periodens siste måned til i dag: '2026-09'→sep., '2026-Q2'→jun., '2025'→des."""
    if "-Q" in as_of:
        y, q = as_of.split("-Q")
        year, month = int(y), int(q) * 3
    elif "-" in as_of:
        y, m = as_of.split("-")[:2]
        year, month = int(y), int(m)
    else:
        year, month = int(as_of), 12
    return (today.year * 12 + today.month) - (year * 12 + month)


def stale_sources(data: dict, today: date) -> list[str]:
    """Kilder i macro.json som er eldre enn MAX_AGE_* (eller mangler/har uleselig asOf). Tom = ferskt."""
    problems = []
    for key, limit in MAX_AGE_MONTHS.items():
        series = data.get(key) or {}
        try:
            age = _months_old(series["asOf"], today)
        except (KeyError, ValueError):
            problems.append(f"{key}: mangler eller har uleselig asOf ({series.get('asOf')!r})")
            continue
        if age > limit:
            problems.append(f"{key}: asOf {series['asOf']} er {age} mnd gammel (grense {limit}), kilde: {series.get('source')}")
    rate = data.get("policyRate") or {}
    try:
        days = (today - date.fromisoformat(rate["asOf"])).days
    except (KeyError, ValueError):
        problems.append(f"policyRate: mangler eller har uleselig asOf ({rate.get('asOf')!r})")
    else:
        if days > MAX_AGE_DAYS_POLICY_RATE:
            problems.append(f"policyRate: asOf {rate['asOf']} er {days} dager gammel (grense {MAX_AGE_DAYS_POLICY_RATE}), kilde: {rate.get('source')}")
    return problems


def check_age() -> int:
    """Alderssperren: exit-kode 1 hvis en kilde i den skrevne macro.json er foreldet."""
    data = json.loads(OUT.read_text(encoding="utf-8"))
    today = datetime.now(timezone.utc).date()
    problems = stale_sources(data, today)
    if problems:
        print(f"FORELDET KILDE i macro.json per {today}. Sjekk om SSB/Norges Bank har avsluttet eller flyttet serien:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1
    print(f"Alle kilder i macro.json er innenfor aldersgrensene per {today}.")
    return 0


def main() -> None:
    if "--check-age" in sys.argv[1:]:
        sys.exit(check_age())

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
