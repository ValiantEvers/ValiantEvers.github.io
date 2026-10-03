#!/usr/bin/env python3
"""Oppdaterer datagrunnlaget for evers.no/garmin (RUNS + ANALYTICS + nøkkeltall i garmin/index.html).

Bruk (fra repo-roten):
  python scripts/build_garmin.py --check     # ingen endring: reproduserer analysene dagens tall?
  python scripts/build_garmin.py --offline   # regn alt på nytt fra dagens RUNS (ingen nett)
  python scripts/build_garmin.py             # hent løpeturer fra Garmin Connect og bygg på nytt

Krever for nett-modus:  pip install -U garminconnect

Innlogging: første gang spør scriptet om e-post, passord og ev. MFA-kode og lagrer et EGET
token i ~/.garminconnect-evers (utenfor repoet, aldri committet). Egen token-kjede med vilje:
Garmin roterer refresh-tokenet ved hver fornyelse, og matlogg-synken har sin egen kjede i
Supabase. To forbrukere av samme kjede ville ugyldiggjort hverandre.

Personvern: lat/lon tas ALDRI med i RUNS. Siden bruker dem ikke, og startpunktene for
hundrevis av løpeturer avslører hvor man bor. (Fjernet 2026-10-03.)

Analysene er rekonstruert fra den opprinnelige (ikke-arkiverte) generatoren og verifisert
mot tallene som lå i siden 26.04.2026: --check skal gi null avvik utenom avrundingsstøy.

«Skriftlig analyse»-seksjonen i siden er prosa med hardkodede tall. Den oppdateres IKKE av
scriptet — scriptet sier fra når tallene har endret seg, så teksten kan skrives om.
"""
import argparse
import collections
import datetime as dt
import json
import math
import re
import statistics as st
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGE = ROOT / "garmin" / "index.html"
TOKEN_DIR = "~/.garminconnect-evers"
START_DATE = "2024-01-01"
RIEGEL = 1.06
MONTHS = ["jan", "feb", "mar", "apr", "mai", "jun", "jul", "aug", "sep", "okt", "nov", "des"]
MONTHS_LONG = ["januar", "februar", "mars", "april", "mai", "juni", "juli", "august",
               "september", "oktober", "november", "desember"]
RUN_TYPES = {"running", "trail_running", "track_running", "treadmill_running", "indoor_running",
             "street_running", "virtual_run", "ultra_run"}
FIELDS = ["date", "name", "dist_km", "dur_min", "pace", "avg_hr", "max_hr", "elev_gain", "calories",
          "vo2max", "training_load", "aerobic_te", "cadence", "location", "split_1k", "split_mile",
          "pr", "avg_power", "avg_resp", "avg_stride", "avg_vert_osc", "avg_vert_ratio", "avg_gct",
          "bb_delta", "hr_z1", "hr_z2", "hr_z3", "hr_z4", "hr_z5"]


# ── side-IO ────────────────────────────────────────────────────────────────
def read_const(html: str, name: str):
    m = re.search(rf"^const {name} = (.*?);?$", html, re.M)
    if not m:
        sys.exit(f"Fant ikke 'const {name} = …' i {PAGE}")
    return json.loads(m.group(1)), m


def write_const(html: str, name: str, obj) -> str:
    _, m = read_const(html, name)
    had_semicolon = m.group(0).rstrip().endswith(";")
    line = f"const {name} = " + json.dumps(obj, separators=(",", ":"), ensure_ascii=True) + (";" if had_semicolon else "")
    return html[: m.start()] + line + html[m.end():]


# ── formatering ────────────────────────────────────────────────────────────
def mmss(seconds: float) -> str:
    s = int(seconds)
    h, rem = divmod(s, 3600)
    m, sec = divmod(rem, 60)
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"


def pace_str(pace_min: float) -> str:
    return mmss(pace_min * 60)


def no_date(iso: str) -> str:
    d = dt.date.fromisoformat(iso)
    return f"{d.day}. {MONTHS[d.month - 1]} {d.year}"


def r1(v):
    return None if v is None else round(v, 1)


# ── Garmin → RUNS ──────────────────────────────────────────────────────────
def num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None


def map_activity(a: dict) -> dict | None:
    dist, dur = num(a.get("distance")), num(a.get("duration"))
    if not dist or not dur or dist < 100:
        return None
    km = dist / 1000
    stride = num(a.get("avgStrideLength"))
    gct, power = num(a.get("avgGroundContactTime")), num(a.get("avgPower"))
    tl = num(a.get("activityTrainingLoad"))
    steps, moving, elev = num(a.get("steps")), num(a.get("movingDuration")), num(a.get("elevationGain"))
    # Kadens = steg per BEVEGELSEStid. Garmins snitt tar med stopp (en tur med lange pauser
    # fikk 10,6 spm), og de gamle FIT-baserte tallene utelot stopp. Steg/bevegelsestid er den
    # nærmeste konsistente definisjonen (diagnose 03.10: 150,2 mot gammel 151,2 og API 147,2).
    if steps and moving:
        cadence = round(steps / (moving / 60), 1)
    else:
        cadence = r1(num(a.get("averageRunningCadenceInStepsPerMinute")))
    # Watt fra API-et tar også med stopp. Er under 80 % av tiden bevegelse, er snittet meningsløst.
    if power is not None and moving and dur and moving / dur < 0.8:
        power = None
    run = {
        "date": (a.get("startTimeLocal") or "")[:10],
        "name": a.get("activityName") or "Løping",
        "dist_km": round(km, 2),
        "dur_min": round(dur / 60, 1),
        # Tempo over 15 min/km er gange/pause, ikke løping (originalen satte slike til null)
        "pace": round(dur / 60 / km, 3) if dur / 60 / km <= 15 else None,
        "avg_hr": num(a.get("averageHR")),
        "max_hr": num(a.get("maxHR")),
        "elev_gain": float(round(elev)) if elev is not None else None,  # gamle data: hele meter
        "calories": num(a.get("calories")),
        "vo2max": num(a.get("vO2MaxValue")),
        "training_load": round(tl, 1) if tl is not None else None,
        "aerobic_te": num(a.get("aerobicTrainingEffect")),
        "cadence": cadence,
        "location": a.get("locationName"),
        "split_1k": r1(num(a.get("fastestSplit_1000"))),
        "split_mile": r1(num(a.get("fastestSplit_1609"))),
        "pr": bool(a.get("pr")),
        "avg_power": round(power) if power is not None else None,
        "avg_resp": r1(num(a.get("avgRespirationRate"))),
        "avg_stride": round(stride / 100, 2) if stride is not None else None,
        "avg_vert_osc": r1(num(a.get("avgVerticalOscillation"))),
        "avg_vert_ratio": r1(num(a.get("avgVerticalRatio"))),
        "avg_gct": round(gct) if gct is not None else None,
        "bb_delta": num(a.get("differenceBodyBattery")),
        **{f"hr_z{i}": num(a.get(f"hrTimeInZone_{i}")) for i in range(1, 6)},
    }
    return {k: run[k] for k in FIELDS}


def garmin_login():
    try:
        from garminconnect import Garmin
    except ImportError:
        sys.exit("Mangler garminconnect: pip install -U garminconnect")
    store = Path(TOKEN_DIR).expanduser()
    if store.exists():
        g = Garmin()
        try:
            g.login(TOKEN_DIR)
            print("Garmin: innlogget med lagret token.")
            return g
        except Exception as e:
            print(f"Garmin: lagret token virket ikke ({e}) — logger inn på nytt.")
    from getpass import getpass
    email = input("Garmin-e-post: ").strip()
    pw = getpass("Garmin-passord (vises ikke): ")
    g = Garmin(email=email, password=pw, prompt_mfa=lambda: input("MFA-kode: ").strip())
    g.login()
    g.client.dump(TOKEN_DIR)
    print(f"Garmin: innlogget, token lagret i {TOKEN_DIR} (utenfor repoet).")
    return g


def fetch_runs(raw_out: list | None = None) -> list[dict]:
    g = garmin_login()
    today = dt.date.today().isoformat()
    acts = g.get_activities_by_date(START_DATE, today, activitytype="running", sortorder="asc") or []
    try:
        g.client.dump(TOKEN_DIR)  # tokenet kan ha rotert
    except Exception as e:
        print(f"ADVARSEL: klarte ikke å lagre fornyet token ({e})")
    runs = []
    for a in acts:
        tk = (a.get("activityType") or {}).get("typeKey", "running")
        if tk not in RUN_TYPES:
            continue
        r = map_activity(a)
        if r:
            runs.append(r)
            if raw_out is not None:
                raw_out.append((r, a))
    runs.sort(key=lambda r: (r["date"], r["name"]))
    print(f"Garmin: {len(acts)} aktiviteter hentet, {len(runs)} løpeturer fra {START_DATE}.")
    return runs


def compare_and_merge(old: list[dict], new: list[dict]) -> tuple[list[dict], dict]:
    """Match på dato + distanse (±0,05 km). Rapporterer felt som avviker for matchede par."""
    used, report, merged = set(), collections.Counter(), list(new)
    tol = {"pace": 0.02, "dur_min": 0.15, "aerobic_te": 0.05}
    pairs = 0
    for o in old:
        hit = next((i for i, n in enumerate(new) if i not in used and n["date"] == o["date"]
                    and abs(n["dist_km"] - o["dist_km"]) <= 0.05), None)
        if hit is None:
            merged.append({k: o.get(k) for k in FIELDS})
            report["__kun_i_gammel"] += 1
            continue
        used.add(hit)
        pairs += 1
        n = new[hit]
        for k in FIELDS:
            a, b = o.get(k), n.get(k)
            if isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
                if abs(a - b) > tol.get(k, 0.051 if isinstance(a, float) else 0.5):
                    report[k] += 1
            elif a != b and not (k in ("name", "location") or (a is None or b is None)):
                report[k] += 1
    report["__par"] = pairs
    merged.sort(key=lambda r: (r["date"], r["name"]))
    return merged, report


DIAG_KEYS = ["steps", "movingDuration", "duration", "elapsedDuration", "averageRunningCadenceInStepsPerMinute", "averageDoubleCadence", "averageBikingCadenceInRevPerMinute",
             "elevationGain", "elevationLoss", "avgPower", "normPower", "maxPower", "differenceBodyBattery",
             "avgRespirationRate", "minRespirationRate", "maxRespirationRate", "avgGroundContactTime",
             "avgStrideLength", "avgVerticalOscillation", "avgVerticalRatio", "pr", "hasPersonalRecord",
             "hrTimeInZone_1", "hrTimeInZone_2", "hrTimeInZone_3", "hrTimeInZone_4", "hrTimeInZone_5"]


def diagnose(old: list[dict], pairs_raw: list) -> None:
    """Skriver _garmin-diag.json i projects-roten: eksempler på avvik + rå API-felt (ingen posisjonsdata)."""
    out = {"felt": {}, "raa_eksempler": [], "alle_api_nokler": []}
    by_date = collections.defaultdict(list)
    for o in old:
        by_date[o["date"]].append(o)
    for r, a in pairs_raw:
        o = next((x for x in by_date.get(r["date"], []) if abs(x["dist_km"] - r["dist_km"]) <= 0.05), None)
        if not o:
            continue
        for k in FIELDS:
            x, y = o.get(k), r.get(k)
            if isinstance(x, (int, float)) and isinstance(y, (int, float)) and not isinstance(x, bool) and abs(x - y) > 0.051:
                f = out["felt"].setdefault(k, {"n": 0, "eksempler": [], "diffs": [], "ratios": []})
                f["n"] += 1
                f["diffs"].append(y - x)
                if x:
                    f["ratios"].append(y / x)
                if len(f["eksempler"]) < 6:
                    f["eksempler"].append({"date": r["date"], "gammel": x, "ny": y})
            elif (x is None) != (y is None) and k not in ("name", "location"):
                f = out["felt"].setdefault(k, {"n": 0, "eksempler": [], "diffs": [], "ratios": []})
                f["n"] += 1
                if len(f["eksempler"]) < 6:
                    f["eksempler"].append({"date": r["date"], "gammel": x, "ny": y})
        if len(out["raa_eksempler"]) < 4 and r["date"] >= "2025-06-01":
            out["raa_eksempler"].append({"date": r["date"], "gammel": {k: o.get(k) for k in FIELDS if k not in ("name", "location")},
                                         "api": {k: a.get(k) for k in DIAG_KEYS}})
    for k, f in out["felt"].items():
        d, q = f.pop("diffs"), f.pop("ratios")
        f["snitt_diff"] = round(st.mean(d), 3) if d else None
        f["median_ratio"] = round(st.median(q), 4) if q else None
    # Kadens-kandidater: hvilken definisjon matcher de gamle tallene?
    cand = collections.Counter()
    npairs = 0
    for r, a in pairs_raw:
        o = next((x for x in by_date.get(r["date"], []) if abs(x["dist_km"] - r["dist_km"]) <= 0.05), None)
        if not o or not o.get("cadence"):
            continue
        npairs += 1
        steps, mov, dur = num(a.get("steps")), num(a.get("movingDuration")), num(a.get("duration"))
        el = num(a.get("elapsedDuration"))
        c = {"api_snitt": num(a.get("averageRunningCadenceInStepsPerMinute")),
             "steg_per_bevegelsestid": steps / (mov / 60) if steps and mov else None,
             "steg_per_varighet": steps / (dur / 60) if steps and dur else None,
             "steg_per_total_tid": steps / (el / 60) if steps and el else None}
        for k, v in c.items():
            if v is not None and abs(v - o["cadence"]) <= 0.15:
                cand[k] += 1
    out["kadens_kandidater"] = {"par_med_kadens": npairs, **cand}
    if pairs_raw:
        out["alle_api_nokler"] = sorted(k for k in pairs_raw[-1][1].keys()
                                        if not re.search(r"(?i)lat|lon|location|owner|user|profile|device|id$|gps|polyline", k))
    path = ROOT.parent / "_garmin-diag.json"
    path.write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"Diagnose skrevet til {path} (ingen posisjonsdata, ingen tokens).")


# ── analyser (rekonstruert, se --check) ───────────────────────────────────
def predictions(runs):
    splits = [r["split_1k"] for r in runs if r.get("split_1k")]
    top5 = sorted([r for r in runs if r.get("pace") and r["dist_km"] >= 2], key=lambda r: r["pace"])[:5]
    if not splits or not top5:
        return [], None, None
    best_split = min(splits)
    ap = st.mean(r["pace"] for r in top5)
    ad = st.mean(r["dist_km"] for r in top5)
    out = []
    for name, km in (("5K", 5), ("10K", 10), ("Halvmaraton", 21.0975), ("Maraton", 42.195)):
        opt = best_split * km ** RIEGEL
        rea = ap * 60 * ad * (km / ad) ** RIEGEL
        out.append({"distance": name, "km": km, "optimistic": mmss(opt), "optimistic_pace": mmss(opt / km),
                    "realistic": mmss(rea), "realistic_pace": mmss(rea / km)})
    return out, best_split, ap


def distance_now(runs, window=60):
    last = dt.date.fromisoformat(runs[-1]["date"])
    rec = [r for r in runs if (last - dt.date.fromisoformat(r["date"])).days < window]
    L = max(rec, key=lambda r: r["dist_km"])
    avg_pace = round(st.mean(r["pace"] for r in rec if r.get("pace")), 2)
    return {"recent_runs": len(rec), "longest_recent": L["dist_km"], "longest_date": L["date"],
            "avg_dist": round(st.mean(r["dist_km"] for r in rec), 1), "avg_pace": avg_pace,
            "realistic_max": int(L["dist_km"] * 1.3), "comfortable": round(L["dist_km"]),
            "safe_pace": round(avg_pace * 1.1, 2)}


def efficiency(runs):
    m = collections.defaultdict(list)
    for r in runs:
        if r.get("avg_hr") and r.get("pace") and r["dist_km"] >= 2:
            m[r["date"][:7]].append(1000 / r["pace"] / r["avg_hr"])
    return [{"month": k, "value": round(st.mean(v), 3), "n": len(v)} for k, v in sorted(m.items())]


def hr_zones(runs):
    secs = [sum(r.get(f"hr_z{i}") or 0 for r in runs) for i in range(1, 6)]
    tot = sum(secs) or 1
    pct = [round(s / tot * 100, 1) for s in secs]
    return {"seconds": secs, "percentages": pct, "total_hours": round(tot / 3600, 1),
            "easy_pct": round((secs[0] + secs[1]) / tot * 100, 1),
            "hard_pct": round((secs[2] + secs[3] + secs[4]) / tot * 100, 1)}


def acwr(runs):
    loads = collections.defaultdict(float)
    for r in runs:
        if r.get("training_load") is not None:
            loads[dt.date.fromisoformat(r["date"])] += r["training_load"]
    if not loads:
        return [], {"risky_count": 0, "sweet_count": 0, "low_count": 0, "total": 0, "current": 0}
    last = dt.date.fromisoformat(runs[-1]["date"])
    out, d = [], min(loads) + dt.timedelta(days=27)
    while d <= last:
        a7 = sum(v for k, v in loads.items() if 0 <= (d - k).days < 7)
        c = sum(v for k, v in loads.items() if 0 <= (d - k).days < 28) / 4
        if c > 0:
            out.append({"date": d.isoformat(), "acwr": round(a7 / c, 2), "acute": round(a7, 1)})
        d += dt.timedelta(days=1)
    v = [x["acwr"] for x in out]
    summ = {"risky_count": sum(1 for x in v if x > 1.5), "sweet_count": sum(1 for x in v if 0.8 <= x <= 1.3),
            "low_count": sum(1 for x in v if x < 0.8), "total": len(v), "current": v[-1] if v else 0}
    return out, summ


def year_in_review(runs):
    out = {}
    for y in sorted({r["date"][:4] for r in runs}):
        rr = [r for r in runs if r["date"][:4] == y]
        km = sum(r["dist_km"] for r in rr)
        bp = [r["pace"] for r in rr if r.get("pace") and r["dist_km"] >= 2]
        vo = [r["vo2max"] for r in rr if r.get("vo2max")]
        out[y] = {"total_km": round(km, 1), "total_runs": len(rr), "avg_dist": round(km / len(rr), 1),
                  "best_pace": pace_str(min(bp)) if bp else None,
                  "longest": round(max(r["dist_km"] for r in rr), 1),
                  "total_elev": int(sum(r.get("elev_gain") or 0 for r in rr)),
                  "total_calories": int(sum(r.get("calories") or 0 for r in rr)),
                  "days_running": len({r["date"] for r in rr}),
                  "vo2_start": vo[0] if vo else None, "vo2_end": vo[-1] if vo else None}
    return out


def build_analytics(runs):
    preds, _, _ = predictions(runs)
    series, summ = acwr(runs)
    return {"predictions": preds, "distance_now": distance_now(runs), "efficiency": efficiency(runs),
            "hr_zones": hr_zones(runs), "acwr": series, "acwr_summary": summ,
            "year_in_review": year_in_review(runs)}


# ── statiske nøkkeltall i HTML-en ──────────────────────────────────────────
def static_values(runs):
    vo = [(r["date"], r["vo2max"]) for r in runs if r.get("vo2max")]
    b3 = min((r for r in runs if r.get("pace") and r["dist_km"] >= 3), key=lambda r: r["pace"])
    b2 = min((r for r in runs if r.get("pace") and r["dist_km"] >= 2), key=lambda r: r["pace"])
    s1 = min((r for r in runs if r.get("split_1k")), key=lambda r: r["split_1k"])
    sm = min((r for r in runs if r.get("split_mile")), key=lambda r: r["split_mile"])
    lg = max(runs, key=lambda r: r["dist_km"])
    el = max(runs, key=lambda r: r.get("elev_gain") or 0)
    _, best_split, top5 = predictions(runs)
    first_vo = dt.date.fromisoformat(vo[0][0])
    return {
        "total_km": f"{round(sum(r['dist_km'] for r in runs))}",
        "vo2": f"{int(vo[-1][1])}",
        "vo2_delta": f"↑ +{int(vo[-1][1] - vo[0][1])} siden {MONTHS[first_vo.month - 1]} {first_vo.year}",
        "best_pace": pace_str(b3["pace"]), "best_pace_date": no_date(b3["date"]),
        "n_runs": f"{len(runs)}", "last": f"Siste: {no_date(runs[-1]['date'])}",
        "split_1k": mmss(s1["split_1k"]), "split_1k_date": no_date(s1["date"]),
        "split_mile": mmss(sm["split_mile"]), "split_mile_date": no_date(sm["date"]),
        "longest": f"{lg['dist_km']:.1f} KM", "longest_date": no_date(lg["date"]),
        "elev": f"{int(el['elev_gain'])} M", "elev_sub": f"{no_date(el['date'])} · {el.get('location') or ''}".rstrip(" ·"),
        "best_session": pace_str(b2["pace"]), "best_session_sub": f"{no_date(b2['date'])} · {b2['dist_km']:.2f} km",
        "predict_split": mmss(best_split), "predict_top5": pace_str(top5),
        "badge": f"{len(runs)} ØKTER · " + f"{round(sum(r['dist_km'] for r in runs)):,}".replace(",", " ") + " KM",
    }


STATIC_PATTERNS = [
    # (nøkkel, regex med én gruppe rundt verdien)
    ("badge", r'<div class="header-badge">([^<]*)<'),
    ("total_km", r'Total distanse</div>\s*<div class="stat-value">([^<]*)<'),
    ("vo2", r'VO₂ Maks</div>\s*<div class="stat-value">([^<]*)<'),
    ("vo2_delta", r'ML/KG/MIN</div>\s*<div class="stat-delta up">([^<]*)<'),
    ("best_pace", r'Beste tempo</div>\s*<div class="stat-value">([^<]*)<'),
    ("best_pace_date", r'MIN/KM \(3\+ KM\)</div>\s*<div class="stat-delta">([^<]*)<'),
    ("n_runs", r'Antall løpeturer</div>\s*<div class="stat-value">([^<]*)<'),
    ("last", r'AKTIVITETER</div>\s*<div class="stat-delta">([^<]*)<'),
    ("split_1k", r'Beste 1K split</div>\s*<div class="pr-value">([^<]*)<'),
    ("split_1k_date", r'Beste 1K split</div>\s*<div class="pr-value">[^<]*</div>\s*<div class="pr-sub">([^<]*)<'),
    ("split_mile", r'Beste mile split</div>\s*<div class="pr-value">([^<]*)<'),
    ("split_mile_date", r'Beste mile split</div>\s*<div class="pr-value">[^<]*</div>\s*<div class="pr-sub">([^<]*)<'),
    ("longest", r'Lengste løpetur</div>\s*<div class="pr-value">([^<]*)<'),
    ("longest_date", r'Lengste løpetur</div>\s*<div class="pr-value">[^<]*</div>\s*<div class="pr-sub">([^<]*)<'),
    ("elev", r'Mest stigning</div>\s*<div class="pr-value">([^<]*)<'),
    ("elev_sub", r'Mest stigning</div>\s*<div class="pr-value">[^<]*</div>\s*<div class="pr-sub">([^<]*)<'),
    ("best_session", r'Beste økt-tempo</div>\s*<div class="pr-value">([^<]*)<'),
    ("best_session_sub", r'Beste økt-tempo</div>\s*<div class="pr-value">[^<]*</div>\s*<div class="pr-sub">([^<]*)<'),
    ("predict_split", r'kalibrert mot beste 1K-split \(([^)]*)\) og snitt av 5'),
    ("predict_top5", r'og snitt av 5 raskeste løp \(([^)]*)/km\)'),
]


def apply_static(html: str, vals: dict, write: bool) -> tuple[str, list]:
    diffs = []
    for key, pat in STATIC_PATTERNS:
        m = re.search(pat, html)
        if not m:
            diffs.append((key, "FANT IKKE MØNSTER", vals[key]))
            continue
        if m.group(1) != vals[key]:
            diffs.append((key, m.group(1), vals[key]))
            if write:
                html = html[: m.start(1)] + vals[key] + html[m.end(1):]
    return html, diffs


def set_footer(html: str) -> str:
    d = dt.date.today()
    return re.sub(r"(Garmin Connect<span class=\"footer-sep\">·</span>)[^<]*",
                  rf"\g<1>Oppdatert {d.day}. {MONTHS_LONG[d.month - 1]} {d.year}", html, count=1)


# ── main ───────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    g = ap.add_mutually_exclusive_group()
    g.add_argument("--check", action="store_true", help="bare sammenlign, skriv ingenting")
    g.add_argument("--offline", action="store_true", help="regn på nytt fra dagens RUNS, ingen nett")
    g.add_argument("--diagnose", action="store_true", help="hent fra Garmin, skriv avviksrapport, endre ingenting")
    ap.add_argument("--force", action="store_true", help="skriv selv om feltmappingen avviker mye")
    args = ap.parse_args()

    html = PAGE.read_text(encoding="utf-8")
    old_runs, _ = read_const(html, "RUNS")
    old_an, _ = read_const(html, "ANALYTICS")

    if args.check or args.offline:
        runs = [{k: r.get(k) for k in FIELDS} for r in old_runs]
    elif args.diagnose:
        raw = []
        fetch_runs(raw)
        diagnose(old_runs, raw)
        return
    else:
        new = fetch_runs()
        runs, rep = compare_and_merge(old_runs, new)
        pairs = rep.pop("__par", 0)
        only_old = rep.pop("__kun_i_gammel", 0)
        print(f"Sammenligning mot dagens data: {pairs} matchede løpeturer, {only_old} finnes bare i gammel data (beholdt).")
        bad = {k: v for k, v in rep.items() if v}
        if bad:
            print("  Felt som avviker på matchede turer:", ", ".join(f"{k}={v}" for k, v in sorted(bad.items())))
        # Felt som avviker av DEFINISJON (dokumentert i diagnosen 03.10), ikke av feil kobling:
        # kadens (stopp med/uten), watt (stopp med), kroppsbatteri (±1), pust/GCT/vertikal (avrunding).
        definitional = {"cadence", "avg_power", "bb_delta", "avg_resp", "avg_gct", "avg_vert_osc", "avg_vert_ratio"}
        worst = max((v for k, v in bad.items() if k not in definitional), default=0)
        if pairs and worst > 0.1 * pairs and not args.force:
            sys.exit("Over 10 % avvik i minst ett felt — sjekk mappingen før du skriver (eller kjør med --force).")
        print(f"Nye løpeturer: {len(runs) - len(old_runs)} (totalt {len(runs)}, siste {runs[-1]['date']}).")

    an = build_analytics(runs)
    vals = static_values(runs)

    # rapport
    diff_keys = [k for k in an if an[k] != old_an.get(k)]
    if args.check:
        eff_off = sum(1 for a, b in zip(an["efficiency"], old_an["efficiency"]) if a != b)
        print(f"ANALYTICS: {len(an) - len(diff_keys)}/{len(an)} blokker identiske; avvik i: {diff_keys or 'ingen'}")
        if "efficiency" in diff_keys:
            print(f"  efficiency: {eff_off} av {len(an['efficiency'])} måneder avviker (avrunding i lagret tempo, ±0,001)")
        _, sd = apply_static(html, vals, write=False)
        print(f"Statiske nøkkeltall: {len(STATIC_PATTERNS) - len(sd)}/{len(STATIC_PATTERNS)} stemmer" + (f"; avvik: {sd}" if sd else ""))
        has_latlon = any("lat" in r for r in old_runs)
        print(f"lat/lon i dagens RUNS: {'JA — kjør --offline for å fjerne' if has_latlon else 'nei'}")
        return

    html = write_const(html, "RUNS", runs)
    html = write_const(html, "ANALYTICS", an)
    html, sd = apply_static(html, vals, write=True)
    if not args.offline:
        html = set_footer(html)
    PAGE.write_text(html, encoding="utf-8")
    print(f"Skrev {PAGE.relative_to(ROOT)}: {len(runs)} løpeturer, ANALYTICS-blokker endret: {diff_keys or 'ingen'}; "
          f"nøkkeltall endret: {[k for k, _, _ in sd] or 'ingen'}.")
    if not args.offline and (diff_keys or sd):
        print("OBS: «Skriftlig analyse»-seksjonen har hardkodede tall og må skrives om for de nye dataene.")


if __name__ == "__main__":
    main()
