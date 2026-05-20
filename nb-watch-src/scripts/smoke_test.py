"""Smoke-test: pinger alle datakilder og rapporterer status per kilde.

Kjør manuelt før du aktiverer cron-workflowen:
  cd nb-watch-src && python scripts/smoke_test.py

Tester HTTP-status, om responsen kan parses, og antall rader returnert.
Skriver IKKE noe til public/data/ — det er fetch_all.py sin jobb.
"""

from __future__ import annotations

import csv
import io
import json
import sys
from typing import Any

import requests

TIMEOUT = 20

NB_PROBES = [
    ("styringsrente", "https://data.norges-bank.no/api/data/IR/B.KPRA.SD.R?format=csv&startPeriod=2025-01-01"),
    ("nowa_3m", "https://data.norges-bank.no/api/data/SHORT_RATES/B.NOWA_AVERAGE.3M.R?format=csv&startPeriod=2025-01-01"),
    ("eur_nok", "https://data.norges-bank.no/api/data/EXR/B.EUR.NOK.SP?format=csv&startPeriod=2025-01-01"),
    ("usd_nok", "https://data.norges-bank.no/api/data/EXR/B.USD.NOK.SP?format=csv&startPeriod=2025-01-01"),
    ("sek_nok", "https://data.norges-bank.no/api/data/EXR/B.SEK.NOK.SP?format=csv&startPeriod=2025-01-01"),
    ("gbp_nok", "https://data.norges-bank.no/api/data/EXR/B.GBP.NOK.SP?format=csv&startPeriod=2025-01-01"),
]

SSB_PROBES = [
    ("kpi", "03013", {
        "query": [
            {"code": "Konsumgrp", "selection": {"filter": "item", "values": ["TOTAL"]}},
            {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Tolvmanedersendring"]}},
            {"code": "Tid", "selection": {"filter": "top", "values": ["3"]}},
        ],
        "response": {"format": "json-stat2"},
    }),
    ("kpi_jae", "05327", {
        "query": [
            {"code": "Konsumgrp", "selection": {"filter": "item", "values": ["JAE_TOTAL"]}},
            {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Tolvmanedersendring"]}},
            {"code": "Tid", "selection": {"filter": "top", "values": ["3"]}},
        ],
        "response": {"format": "json-stat2"},
    }),
    ("boligpris", "07221", {
        "query": [
            {"code": "Region", "selection": {"filter": "item", "values": ["TOTAL"]}},
            {"code": "Boligtype", "selection": {"filter": "item", "values": ["00"]}},
            {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Boligindeks"]}},
            {"code": "Tid", "selection": {"filter": "top", "values": ["3"]}},
        ],
        "response": {"format": "json-stat2"},
    }),
    ("lonn", "11418", {
        "query": [
            {"code": "MaaleMetode", "selection": {"filter": "item", "values": ["02"]}},
            {"code": "Yrke", "selection": {"filter": "item", "values": ["0-9"]}},
            {"code": "Sektor", "selection": {"filter": "item", "values": ["ALLE"]}},
            {"code": "Kjonn", "selection": {"filter": "item", "values": ["0"]}},
            {"code": "AvtaltVanlig", "selection": {"filter": "item", "values": ["0"]}},
            {"code": "ContentsCode", "selection": {"filter": "item", "values": ["Manedslonn"]}},
            {"code": "Tid", "selection": {"filter": "top", "values": ["3"]}},
        ],
        "response": {"format": "json-stat2"},
    }),
]


def probe_nb() -> list[dict[str, Any]]:
    out = []
    for name, url in NB_PROBES:
        rec: dict[str, Any] = {"source": "norges_bank", "name": name, "url": url}
        try:
            r = requests.get(url, timeout=TIMEOUT)
            rec["http_status"] = r.status_code
            if r.status_code == 200:
                reader = csv.DictReader(io.StringIO(r.text), delimiter=";")
                rows = list(reader)
                rec["parse"] = "ok"
                rec["rows"] = len(rows)
                rec["status"] = "ok" if rows else "empty"
            else:
                rec["parse"] = "n/a"
                rec["rows"] = 0
                rec["status"] = "http_error"
        except requests.exceptions.RequestException as e:
            rec["status"] = "request_error"
            rec["error"] = str(e)
        except Exception as e:
            rec["status"] = "parse_error"
            rec["error"] = str(e)
        out.append(rec)
    return out


def probe_ssb() -> list[dict[str, Any]]:
    out = []
    for name, table_id, body in SSB_PROBES:
        url = f"https://data.ssb.no/api/v0/no/table/{table_id}/"
        rec: dict[str, Any] = {"source": "ssb", "name": name, "table": table_id, "url": url}
        try:
            r = requests.post(url, json=body, timeout=TIMEOUT)
            rec["http_status"] = r.status_code
            if r.status_code == 200:
                d = r.json()
                values = d.get("value") or []
                rec["parse"] = "ok"
                rec["rows"] = len(values)
                rec["status"] = "ok" if values else "empty"
            else:
                rec["parse"] = "n/a"
                rec["rows"] = 0
                rec["status"] = "http_error"
                rec["error_body"] = r.text[:200]
        except requests.exceptions.RequestException as e:
            rec["status"] = "request_error"
            rec["error"] = str(e)
        except Exception as e:
            rec["status"] = "parse_error"
            rec["error"] = str(e)
        out.append(rec)
    return out


def main() -> int:
    results = probe_nb() + probe_ssb()

    width = max(len(r["name"]) for r in results)
    print(f"{'KILDE':14}  {'NAVN':{width}}  {'HTTP':>5}  {'PARSE':>6}  {'RADER':>6}  STATUS")
    print("-" * (50 + width))
    any_fail = False
    for r in results:
        status = r.get("status", "?")
        if status not in ("ok", "empty"):
            any_fail = True
        print(
            f"{r['source']:14}  "
            f"{r['name']:{width}}  "
            f"{r.get('http_status', '-'):>5}  "
            f"{r.get('parse', '-'):>6}  "
            f"{r.get('rows', '-'):>6}  "
            f"{status}"
        )
        if "error" in r:
            print(f"    err: {r['error'][:160]}")

    print()
    print(json.dumps({
        "total": len(results),
        "ok": sum(1 for r in results if r.get("status") == "ok"),
        "empty": sum(1 for r in results if r.get("status") == "empty"),
        "failed": sum(1 for r in results if r.get("status") not in ("ok", "empty")),
    }, indent=2))

    return 1 if any_fail else 0


if __name__ == "__main__":
    sys.exit(main())
