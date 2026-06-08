"""One-shot re-score migration for payload.jobs.

The daily scraper (fetch_jobs.py) never re-scores jobs it already knows
(URL-dedup skips them), so any change to the scoring algorithm requires a
one-shot pass over the whole backlog. This script re-runs the current
score_job() over every job and, while at it, soft-removes jobs from dead /
old-schema sources.

Dry-run by default — pass --apply to push the re-scored payload back to the
Gist. Before any Gist write, a timestamped backup of the current ENCRYPTED
blob is written outside the repo so a clobber is recoverable.

What it does (Runde 2 — A1 gate + A2 junior + A2b seniority):
- Re-derives seniority from role via detect_seniority (the detector changed in
  A2b), then recomputes score + breakdown via score_job. Both are imported
  from fetch_jobs.py — the parity code that MUST match strategi.html.
- Legacy soft-remove (status -> "removed", prevStatus preserved):
  * source == "jobslu": dead source (no scraper) — safe to remove by source.
  * source == "jobindex": LIVE source. Only old-schema URLs (NOT matching
    "/vis-job/") are legacy; daily /vis-job/ jobs are kept active.

NOTE: crypto + gist helpers below are duplicated from fetch_jobs.py for
standalone runnability (same precedent as dedup_jobs.py). If crypto params
change (PBKDF2 iter, AES-GCM, blob format), keep all three files in sync.

Required env: STRATEGI_PASSWORD, GIST_PAT, GIST_ID

  STRATEGI_PASSWORD=... GIST_PAT=... GIST_ID=... python scripts/rescore_jobs.py
  STRATEGI_PASSWORD=... GIST_PAT=... GIST_ID=... python scripts/rescore_jobs.py --apply
"""

import base64
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

# score_job / detect_seniority are imported from the scraper — the canonical
# parity code. sys.path[0] is this script's dir when run as a script, so a
# plain import resolves fetch_jobs.py next to it.
from fetch_jobs import score_job, detect_seniority  # noqa: E402

USER_AGENT = "ValiantEvers-strategi-rescore/1.0"
GIST_API = "https://api.github.com"
GIST_FILENAME = "strategi.enc.json"

# Backup goes OUTSIDE the repo (projects/), never committed.
BACKUP_DIR = Path(__file__).resolve().parents[2]


def derive_key(password: str, salt: bytes) -> bytes:
    return PBKDF2HMAC(
        algorithm=hashes.SHA256(), length=32, salt=salt, iterations=250000
    ).derive(password.encode("utf-8"))


def decrypt_blob(password: str, blob: dict) -> dict:
    salt = base64.b64decode(blob["salt"])
    iv = base64.b64decode(blob["iv"])
    ct = base64.b64decode(blob["ct"])
    pt = AESGCM(derive_key(password, salt)).decrypt(iv, ct, None)
    return json.loads(pt)


def encrypt_payload(password: str, payload: dict) -> dict:
    salt = os.urandom(16)
    iv = os.urandom(12)
    ct = AESGCM(derive_key(password, salt)).encrypt(
        iv, json.dumps(payload, ensure_ascii=False).encode("utf-8"), None
    )
    return {
        "v": 1,
        "salt": base64.b64encode(salt).decode("ascii"),
        "iv": base64.b64encode(iv).decode("ascii"),
        "ct": base64.b64encode(ct).decode("ascii"),
    }


def gist_get(pat: str, gist_id: str) -> dict:
    r = requests.get(
        f"{GIST_API}/gists/{gist_id}",
        headers={
            "Authorization": f"Bearer {pat}",
            "Accept": "application/vnd.github+json",
            "User-Agent": USER_AGENT,
        },
        timeout=30,
    )
    r.raise_for_status()
    data = r.json()
    file_obj = data["files"][GIST_FILENAME]
    if file_obj.get("truncated"):
        raw = requests.get(file_obj["raw_url"], timeout=30)
        raw.raise_for_status()
        return json.loads(raw.text)
    return json.loads(file_obj["content"])


def gist_patch(pat: str, gist_id: str, blob: dict) -> None:
    r = requests.patch(
        f"{GIST_API}/gists/{gist_id}",
        headers={
            "Authorization": f"Bearer {pat}",
            "Accept": "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": USER_AGENT,
        },
        json={"files": {GIST_FILENAME: {"content": json.dumps(blob)}}},
        timeout=30,
    )
    r.raise_for_status()


# ─────────────────────────────────────────────────────────────────────────
# Classification + distribution helpers
# ─────────────────────────────────────────────────────────────────────────

def classify_legacy(job: dict):
    """Return (is_legacy, reason) for dead / old-schema sources. jobindex is
    LIVE — only its old (non /vis-job/) URLs are legacy."""
    source = (job.get("source") or "").lower()
    url = job.get("url") or ""
    if source == "jobslu":
        return True, "jobslu — død kilde (ingen scraper)"
    if source == "jobindex" and "/vis-job/" not in url:
        return True, "jobindex — gammelt URL-skjema (ikke /vis-job/)"
    return False, None


def bucket(score: int) -> str:
    if score < 15:
        return "<15"
    if score < 50:
        return "15–49"
    return "50–100"


def distribution(jobs: list, active_only: bool) -> dict:
    d = {"<15": 0, "15–49": 0, "50–100": 0}
    for j in jobs:
        if active_only and j.get("status") == "removed":
            continue
        d[bucket(int(j.get("score") or 0))] += 1
    return d


def print_dist(label: str, before: dict, after: dict):
    print(f"\n{label}")
    for k in ("<15", "15–49", "50–100"):
        print(f"  {k:>7}:  {before[k]:>4}  →  {after[k]:>4}")


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    password = os.environ["STRATEGI_PASSWORD"].strip()
    pat = os.environ["GIST_PAT"]
    gist_id = os.environ["GIST_ID"]
    apply = "--apply" in sys.argv

    print(f"[{datetime.now(timezone.utc).isoformat()}] Re-score starting")
    print(f"Mode: {'APPLY' if apply else 'DRY-RUN (pass --apply to push)'}")

    blob = gist_get(pat, gist_id)
    payload = decrypt_blob(password, blob)
    jobs = payload.get("jobs", [])
    print(f"\nTotal jobs: {len(jobs)}")

    # ── jobindex URL-skjema-inspeksjon (gate-betingelse: aldri anta) ──
    jobindex = [j for j in jobs if (j.get("source") or "").lower() == "jobindex"]
    ji_new = [j for j in jobindex if "/vis-job/" in (j.get("url") or "")]
    ji_old = [j for j in jobindex if "/vis-job/" not in (j.get("url") or "")]
    print("\n── jobindex URL-skjema (LEVENDE kilde — kun gammelt skjema fjernes) ──")
    print(f"  jobindex totalt:      {len(jobindex)}")
    print(f"  /vis-job/ (beholdes): {len(ji_new)}")
    print(f"  gammelt skjema (fjernes): {len(ji_old)}")
    for j in ji_new[:3]:
        print(f"    KEEP  {(j.get('url') or '')[:90]}")
    for j in ji_old[:3]:
        print(f"    DROP  {(j.get('url') or '')[:90]}")

    dist_before_total = distribution(jobs, active_only=False)
    dist_before_active = distribution(jobs, active_only=True)

    # ── Re-score + legacy soft-remove ──
    score_changed = 0
    seniority_changed = 0
    soft_removed = 0
    remove_sample = []  # (source, schema, role, url)

    for j in jobs:
        old_sen = j.get("seniority")
        new_sen = detect_seniority(j.get("role") or "")
        if new_sen != old_sen:
            seniority_changed += 1
        j["seniority"] = new_sen

        old_score = j.get("score")
        res = score_job(j)
        if res["score"] != old_score:
            score_changed += 1
        j["score"] = res["score"]
        j["breakdown"] = res["breakdown"]

        legacy, reason = classify_legacy(j)
        if legacy and j.get("status") != "removed":
            j["prevStatus"] = j.get("status", "new")
            j["status"] = "removed"
            soft_removed += 1
            schema = "jobslu" if "jobslu" in (reason or "") else "jobindex-gammelt"
            remove_sample.append((j.get("source"), schema,
                                  (j.get("role") or "?")[:50],
                                  (j.get("url") or "")[:80]))

    dist_after_total = distribution(jobs, active_only=False)
    dist_after_active = distribution(jobs, active_only=True)

    print(f"\nScore endret:      {score_changed}/{len(jobs)}")
    print(f"Seniority endret:  {seniority_changed}/{len(jobs)} (A2b-detektor + recompute)")
    print(f"Soft-removed:      {soft_removed}")

    print_dist("Distribusjon — ALLE jobber (før → etter):",
               dist_before_total, dist_after_total)
    print_dist("Distribusjon — KUN AKTIVE (før → etter):",
               dist_before_active, dist_after_active)

    # ── Soft-remove-sample gruppert på source OG URL-skjema ──
    by_group = {}
    for src, schema, role, url in remove_sample:
        by_group.setdefault((src, schema), []).append((role, url))
    print("\nSoft-remove — gruppert på (source, URL-skjema):")
    if not by_group:
        print("  (ingen)")
    for (src, schema), rows in by_group.items():
        print(f"  [{len(rows)}x] source={src!r}  skjema={schema}")
        for role, url in rows[:4]:
            print(f"      - {role}  |  {url}")

    if not apply:
        print("\n⚠ DRY-RUN — ingenting pushet. Inspiser tallene over.")
        print("  Bekreft at /vis-job/-jobindex IKKE er i fjern-lista, så kjør --apply")
        print("  (med ALLE faner + andre enheter lukket).")
        return

    # ── APPLY: obligatorisk backup FØR Gist-skriving ──
    ts = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_path = BACKUP_DIR / f"gist-backup-pre-rescore-{ts}.json"
    backup_path.write_text(json.dumps(blob), encoding="utf-8")
    print(f"\n✓ Backup av nåværende kryptert blob: {backup_path}")

    now_iso = datetime.now(timezone.utc).isoformat()
    payload["jobs"] = jobs
    payload["updatedAt"] = now_iso
    payload["lastRescore"] = {
        "at": now_iso,
        "scoreChanged": score_changed,
        "seniorityChanged": seniority_changed,
        "softRemoved": soft_removed,
    }

    new_blob = encrypt_payload(password, payload)
    gist_patch(pat, gist_id, new_blob)
    print(f"✓ Pushet re-scoret payload "
          f"(score endret {score_changed}, soft-removed {soft_removed})")
    print("  Husk: refresh seed strategi.enc.json fra Gist etterpå (egen STOPP).")


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print(f"FATAL: missing env var {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"FATAL: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
