"""CI-paritetsvakt (juli 2026) — strukturell diff av de PARITETSBUNDNE delene
av strategi.html (JS) og scripts/fetch_jobs.py (Python):

  1. PROFILE — JS-objektet og Python-dicten normaliseres til samme JSON-form
     og sammenlignes rekkefølge-sensitivt (scoring itererer i rekkefølge, og
     priorityCompanies har first-tier-wins).
  2. detectSeniority/detect_seniority — junior- og senior-alternasjonene
     sammenlignes tegn-for-tegn (regex-kroppen skal være identisk).
  3. matchesOsloBelt/matches_oslo_belt — strukturell referansesjekk: begge
     sider skal lese nøklene fra PROFILE.locations (selve nøkkelverdiene
     dekkes av PROFILE-diffen).

Avvik → exit 1 med tydelig diff. Ingen secrets, ingen tredjeparts-
avhengigheter: stdlib + node (forhåndsinstallert på GitHub-runneren) for å
evaluere JS-objektet. Kjøres av .github/workflows/parity-check.yml ved
push/PR som endrer noen av filene.

Dette er en STRUKTURELL vakt; case-harnesset i _tools/strategi (utenfor
repoet, med vilje) er atferdstesten. De utfyller hverandre.

Kjør lokalt:  python scripts/check_parity.py
"""
import ast
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

# Windows-konsoll kan være cp1252 — outputen har norske tegn.
try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except AttributeError:
    pass

ROOT = Path(__file__).resolve().parent.parent
HTML = (ROOT / "strategi.html").read_text(encoding="utf-8")
PY_SRC = (ROOT / "scripts" / "fetch_jobs.py").read_text(encoding="utf-8")

failures = []


def fail(msg):
    failures.append(msg)
    print(f"AVVIK: {msg}", file=sys.stderr)


def hard_fail(msg):
    """Ekstraksjonsfeil = vakta er blind → alltid rød."""
    print(f"PARITETSVAKT FEILET (ekstraksjon): {msg}", file=sys.stderr)
    sys.exit(1)


def slice_between(text, start, end, label):
    i = text.find(start)
    if i == -1:
        hard_fail(f"fant ikke start-anker for {label}: {start!r}")
    j = text.find(end, i + len(start))
    if j == -1:
        hard_fail(f"fant ikke slutt-anker for {label}: {end!r}")
    return text[i:j + len(end)]


# ── 1. PROFILE ───────────────────────────────────────────────────────────

def python_profile():
    for node in ast.walk(ast.parse(PY_SRC)):
        if isinstance(node, ast.Assign):
            for t in node.targets:
                if isinstance(t, ast.Name) and t.id == "PROFILE":
                    return ast.literal_eval(node.value)
    hard_fail("fant ikke `PROFILE = {` i fetch_jobs.py")


def js_profile():
    src = slice_between(HTML, "var PROFILE = {", "\n};", "PROFILE (JS)")
    r = subprocess.run(
        ["node", "-e", src + "\nconsole.log(JSON.stringify(PROFILE));"],
        capture_output=True, text=True, encoding="utf-8",
    )
    if r.returncode != 0:
        hard_fail(f"node-evaluering av JS-PROFILE feilet: {r.stderr.strip()}")
    return json.loads(r.stdout)


def normalize_profile(profile):
    """Kanonisk form: titleKeywords/locations som [tekst, poeng]-par —
    Python har tupler, JS har {kw, points}-objekter."""
    def pairs(entries):
        out = []
        for e in entries:
            if isinstance(e, dict):
                out.append([e["kw"], e["points"]])
            else:
                out.append([e[0], e[1]])
        return out

    return {
        "priorityCompanies": [
            {"match": list(t["match"]), "points": t["points"]}
            for t in profile["priorityCompanies"]
        ],
        "titleKeywords": pairs(profile["titleKeywords"]),
        "locations": pairs(profile["locations"]),
        "seniorityBoost": dict(profile["seniorityBoost"]),
        "negativeKeywords": list(profile["negativeKeywords"]),
        "nonOsloPenalty": profile["nonOsloPenalty"],
    }


py_prof_raw = python_profile()
js_prof_raw = js_profile()

py_keys, js_keys = sorted(py_prof_raw.keys()), sorted(js_prof_raw.keys())
if py_keys != js_keys:
    fail(f"PROFILE-nøkkelsett avviker: python={py_keys} js={js_keys}")

py_prof = normalize_profile(py_prof_raw)
js_prof = normalize_profile(js_prof_raw)
if py_prof != js_prof:
    py_json = json.dumps(py_prof, indent=2, ensure_ascii=False).splitlines()
    js_json = json.dumps(js_prof, indent=2, ensure_ascii=False).splitlines()
    diff = "\n".join(difflib.unified_diff(
        py_json, js_json, fromfile="fetch_jobs.py PROFILE",
        tofile="strategi.html PROFILE", lineterm=""))
    fail("PROFILE avviker mellom Python og JS:\n" + diff)
else:
    print("OK  PROFILE identisk (normalisert, rekkefølge-sensitivt)")

# ── 2. detectSeniority / detect_seniority ────────────────────────────────

py_sen_body = slice_between(PY_SRC, "def detect_seniority", 'return "mid"',
                            "detect_seniority (py)")
py_pats = re.findall(r're\.search\(r"([^"]+)", t\)', py_sen_body)
if len(py_pats) != 2:
    hard_fail(f"forventet 2 regexer i detect_seniority (py), fant {len(py_pats)}")

js_sen_body = slice_between(HTML, "function detectSeniority(title){", "\n}",
                            "detectSeniority (js)")
js_pats = re.findall(r'if\(/(.+?)/\.test\(t\)\)\s*return "(?:junior|senior)"', js_sen_body)
if len(js_pats) != 2:
    hard_fail(f"forventet 2 regexer i detectSeniority (js), fant {len(js_pats)}")

for label, py_p, js_p in (("junior", py_pats[0], js_pats[0]),
                          ("senior", py_pats[1], js_pats[1])):
    if py_p != js_p:
        fail(f"{label}-alternasjonen avviker:\n  python: {py_p}\n  js:     {js_p}")
    else:
        print(f"OK  {label}-regex identisk ({py_p[:60]}…)" if len(py_p) > 60
              else f"OK  {label}-regex identisk ({py_p})")

# ── 3. matchesOsloBelt — begge sider skal lese PROFILE.locations ─────────

py_belt = slice_between(PY_SRC, "def matches_oslo_belt", "]", "matches_oslo_belt (py)")
if 'PROFILE["locations"]' not in py_belt:
    fail('matches_oslo_belt (py) leser ikke PROFILE["locations"] — hardkodede '
         "nøkler fanges ikke av PROFILE-diffen")
else:
    print('OK  matches_oslo_belt leser PROFILE["locations"]')

js_belt = slice_between(HTML, "function matchesOsloBelt(j){", "\n}", "matchesOsloBelt (js)")
if "PROFILE.locations" not in js_belt:
    fail("matchesOsloBelt (js) leser ikke PROFILE.locations — hardkodede "
         "nøkler fanges ikke av PROFILE-diffen")
else:
    print("OK  matchesOsloBelt leser PROFILE.locations")

# ── Konklusjon ───────────────────────────────────────────────────────────
print()
if failures:
    print(f"PARITETSVAKT RØD — {len(failures)} avvik. Paritetsbundet kode i "
          "strategi.html og scripts/fetch_jobs.py skal endres i lås-steg "
          "(samme commit, begge filer).", file=sys.stderr)
    sys.exit(1)
print("PARITETSVAKT GRØNN — PROFILE, seniority-regexer og Oslo-belte i sync.")
