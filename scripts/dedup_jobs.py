"""One-shot dedup script for payload.jobs.

Triggered manually via workflow_dispatch. Dry-run by default — pass
--apply to push the deduped payload back to the Gist.

Strategy:
- Group jobs by normalize_url(job.url). Jobs without URL are kept
  as-is (no way to dedup them safely).
- For each group: pick a canonical entry that preserves the most
  user-data, and merge user-data (starred OR, notes concat) from
  siblings into it.
- Re-encrypt and push (only when --apply).

Idempotent: re-running on an already-deduped payload removes
0 entries and only updates lastDedup-timestamp.

NOTE: crypto + gist helpers below are duplicated from
scripts/fetch_jobs.py for standalone runnability. If crypto
parameters change (PBKDF2 iter, AES-GCM, blob format), keep both
files in sync.

Required env: STRATEGI_PASSWORD, GIST_PAT, GIST_ID
"""

import base64
import json
import os
import re
import sys
from datetime import datetime, timezone

import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

USER_AGENT = "ValiantEvers-strategi-dedup/1.0"
GIST_API = "https://api.github.com"
GIST_FILENAME = "strategi.enc.json"


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


def normalize_url(u: str) -> str:
    if not u: return ""
    # Strip kun hash-fragment, IKKE query (?Id=N er identifier på
    # noen sites som jobs.lu — bevare query er korrekt default)
    u = re.sub(r"#.*$", "", u)
    u = u.rstrip("/")
    return u.lower()


def has_user_data(job: dict) -> bool:
    """Returns True if the job has user-edited state worth preserving."""
    return (
        job.get("status") not in (None, "", "new")
        or bool((job.get("notes") or "").strip())
        or bool(job.get("starred"))
        or job.get("statusUpdated") is not None
    )


def merge_canonical(group: list) -> dict:
    """Pick a canonical entry from duplicates and merge user-data from siblings."""
    with_data = [j for j in group if has_user_data(j)]
    if with_data:
        # Most recent statusUpdated wins as canonical base
        with_data.sort(
            key=lambda j: (j.get("statusUpdated") or "", j.get("added") or ""),
            reverse=True,
        )
        canonical = dict(with_data[0])
    else:
        # No user-data anywhere → pick oldest by 'added' (most established scrape entry)
        group_sorted = sorted(group, key=lambda j: j.get("added") or "")
        canonical = dict(group_sorted[0])

    # Merge OR-semantics for starred + notes-concat from siblings
    for j in group:
        if j.get("starred"):
            canonical["starred"] = True
        j_notes = (j.get("notes") or "").strip()
        c_notes = (canonical.get("notes") or "").strip()
        if j_notes and j_notes != c_notes:
            if c_notes:
                if j_notes not in c_notes:
                    canonical["notes"] = c_notes + "\n---\n" + j_notes
            else:
                canonical["notes"] = j_notes

    return canonical


def main():
    password = os.environ["STRATEGI_PASSWORD"]
    pat = os.environ["GIST_PAT"]
    gist_id = os.environ["GIST_ID"]
    apply = "--apply" in sys.argv

    print(f"[{datetime.now(timezone.utc).isoformat()}] Dedup starting")
    print(f"Mode: {'APPLY' if apply else 'DRY-RUN (pass --apply to push)'}")

    blob = gist_get(pat, gist_id)
    payload = decrypt_blob(password, blob)

    jobs = payload.get("jobs", [])
    original_count = len(jobs)
    print(f"\nOriginal job count: {original_count}")

    # Group by normalized URL
    groups = {}
    no_url = []
    for j in jobs:
        u = normalize_url(j.get("url", ""))
        if not u:
            no_url.append(j)
        else:
            groups.setdefault(u, []).append(j)

    print(f"Unique normalized URLs: {len(groups)}")
    print(f"Jobs without URL: {len(no_url)}")

    deduped = []
    removed = 0
    groups_with_dups = 0
    preserved_user_data = 0

    for url, group in groups.items():
        if len(group) == 1:
            deduped.append(group[0])
        else:
            groups_with_dups += 1
            canonical = merge_canonical(group)
            if has_user_data(canonical):
                preserved_user_data += 1
            deduped.append(canonical)
            removed += len(group) - 1

    deduped.extend(no_url)

    print(f"\nDuplicate groups: {groups_with_dups}")
    print(f"Total entries removed: {removed}")
    print(f"Groups with preserved user-data: {preserved_user_data}")
    print(f"Final job count: {len(deduped)}")

    # Sample for verification
    sorted_groups = sorted(
        [(u, g) for u, g in groups.items() if len(g) > 1],
        key=lambda x: -len(x[1]),
    )
    if sorted_groups:
        print("\nTop duplicate groups (by size):")
        for url, group in sorted_groups[:5]:
            print(f"  [{len(group)}x] {url[:80]}")
            for j in group[:3]:
                title = (j.get("role") or "?")[:60]
                user_marker = " ★" if has_user_data(j) else ""
                print(f"      - {title}{user_marker}")

    last_dedup = payload.get("lastDedup")
    if last_dedup:
        print(f"\nPrevious dedup: at {last_dedup.get('at')}, "
              f"removed {last_dedup.get('removed')}, "
              f"{last_dedup.get('before')} → {last_dedup.get('after')}")

    if not apply:
        print("\n⚠ DRY-RUN — no changes pushed. Re-run workflow with apply=true to apply.")
        return

    if removed == 0:
        print("\nNo duplicates found — nothing to apply. Updating lastDedup-timestamp only.")

    payload["jobs"] = deduped
    now_iso = datetime.now(timezone.utc).isoformat()
    payload["updatedAt"] = now_iso
    payload["lastDedup"] = {
        "at": now_iso,
        "removed": removed,
        "before": original_count,
        "after": len(deduped),
    }

    new_blob = encrypt_payload(password, payload)
    gist_patch(pat, gist_id, new_blob)
    print(f"\n✓ Pushed deduped payload ({original_count} → {len(deduped)})")


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print(f"FATAL: missing env var {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"FATAL: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
