"""Daily finn.no scraper for strategi.html.

Decrypts the encrypted payload from the private Gist, scrapes finn.no via
Playwright headless Chromium for full client-side-rendered results,
dedupes against existing entries, scores each new job with the same
PROFILE/algorithm used in strategi.html, re-encrypts the payload and
pushes it back to the Gist. strategi.html picks up the new jobs on next
unlock via its existing bootstrapSync flow.

Run locally:
    STRATEGI_PASSWORD=... GIST_PAT=... GIST_ID=... \
        python scripts/fetch_jobs.py
    (requires `playwright install chromium` once)

Required env: STRATEGI_PASSWORD, GIST_PAT, GIST_ID
Dependencies: requests, cryptography, playwright

PARITY NOTE: The PROFILE constant and scoring algorithm below MUST stay
in sync with strategi.html's PROFILE/scoreJob (search "PROFILE = {" in
strategi.html). The breakdown labels ("selskap:", "tittel:", "sted:",
"seniority:") are Norwegian to match what the browser-side popover
displays for migrate-imported and paste-imported jobs.
"""

import base64
import hashlib
import json
import os
import re
import sys
import time
from datetime import datetime, timezone

import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
# playwright importeres lazy inne i scrape_finn() slik at PROFILE/score_job
# kan importeres (re-score-migrering, tester) uten at playwright er installert.

USER_AGENT = "ValiantEvers-strategi-scraper/1.0 (+https://evers.no)"

# ─────────────────────────────────────────────────────────────────────────
# PROFILE — KEEP IN SYNC WITH strategi.html PROFILE-konstant.
# ─────────────────────────────────────────────────────────────────────────
PROFILE = {
    "priorityCompanies": [
        {"match": ["formue", "formuesforvaltning"], "points": 30},
        {"match": ["dnb", "nordea", "storebrand", "handelsbanken", "danske bank"], "points": 25},
        {"match": ["pareto", "arctic", "abg", "sparebank 1 markets"], "points": 20},
        {"match": ["bnp paribas", "societe generale", "société générale"], "points": 20},
        {"match": ["holberg", "odin", "skagen"], "points": 15},
    ],
    "titleKeywords": [
        ("wealth management", 30),
        ("private banking", 30),
        ("private banker", 25),
        ("fund sales", 25),
        ("investeringsrådgiver", 18),
        ("formuesrådgiver", 18),
        ("investment advis", 20),
        ("investerings", 15),
        ("kapitalforvaltning", 15),
        ("finansiell rådgiver", 15),
        ("asset management", 15),
        ("fund manager", 15),
        ("junior", 15),
    ],
    "locations": [
        ("oslo", 10), ("paris", 8), ("london", 5),
        ("luxembourg", 5), ("stockholm", 3),
    ],
    "seniorityBoost": {"junior": 20, "mid": 5, "senior": -10},
    "negativeKeywords": [
        "forsikring", "eiendomsmegl", "eiendomsrådgiver", "regnskap", "lønn",
        "gjeldsrådgiver", "kundeservice", "kundesenter", "sykepleier", "renhold",
        "lærling", "developer", "utvikler", "ingeniør", "it-rådgiver",
        "controller", "comptable", "lawyer",
    ],
}

QUERIES = [
    "wealth management",
    "formuesforvaltning",
    "formuesforvalter",
    "private banking",
    "premium banking",
    "fund sales",
    "investeringsrådgiver",
    "finansrådgiver",
    "porteføljeforvalter",
    "fondsforvalter",
    "kapitalforvaltning",
    "asset management",
    "finansanalytiker",
    "aksjeanalytiker",
    "kunderådgiver bank",
    "relasjonsleder",
    "graduate finans",
    "trainee finans",
    "nyutdannet finans",
    "junior rådgiver finans",
    "private banker",
    # F5 — utvidet dekning: engelske titler + norske fond/formue-varianter
    "investment advisor",
    "client advisor",
    "relationship manager",
    "wealth advisor",
    "fondsrådgiver",
    "fondsselger",
    "kunderådgiver formue",
]


# ─────────────────────────────────────────────────────────────────────────
# Crypto — matches browser AES-GCM-256 + PBKDF2-SHA256-250k (strategi.html)
# ─────────────────────────────────────────────────────────────────────────

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


# ─────────────────────────────────────────────────────────────────────────
# Gist API
# ─────────────────────────────────────────────────────────────────────────

GIST_API = "https://api.github.com"
GIST_FILENAME = "strategi.enc.json"


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
# finn.no scraper — Playwright headless Chromium (post-2026 Warp redesign)
#
# finn.no renders only ~5 job cards server-side; the rest is hydrated
# client-side and lazy-loaded on scroll, so requests+BeautifulSoup capped
# at 1–41 jobs/query. This version renders JS, scrolls to trigger
# lazy-loading, and captures the full result list (5–10x more candidates).
#
# Verified DOM (May 2026):
#   <div class="job-card__body">
#     <a class="job-card-link" href="https://www.finn.no/job/ad/{id}"
#        id="card-anchor-{id}">
#       <span class="inset-0 absolute" aria-hidden="true"></span>
#       {TITLE}
#     </a>
#     <div class="text-caption s-text-subtle"><strong>{COMPANY}</strong></div>
#     <ul class="job-card__pills">
#       <li><span class="block truncate">{LOCATION}</span></li>
#       <li><time dateTime="2026-04-29T17:36:25.000Z">14 dager siden</time></li>
#     </ul>
#   </div>
#
# `?sort=PUBLISHED_DESC` is the canonical sort param (verified from
# <select id="search-sorter">). If finn.no serves a captcha/block page,
# query_selector_all finds nothing and scrape_finn() returns [] — main()
# records 0 new for that query and continues. Pagination is now handled
# via scroll-to-load-more, so the old max_pages param is gone.
# ─────────────────────────────────────────────────────────────────────────

FINN_SEARCH = "https://www.finn.no/job/search"
CARD_SELECTOR = "a.job-card-link[href*='/job/ad/']"


def scrape_finn(query: str, max_jobs: int = 100) -> list:
    from playwright.sync_api import sync_playwright
    jobs = []
    url = f"{FINN_SEARCH}?q={requests.utils.quote(query)}&sort=PUBLISHED_DESC"

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()

        try:
            page.goto(url, wait_until="networkidle", timeout=30000)
        except Exception as e:
            print(f"  goto failed: {e}", file=sys.stderr)
            browser.close()
            return []

        # Cookie consent — best effort, ignore if no popup matches
        for sel in (
            "button:has-text('Godta alle')",
            "button:has-text('Godta')",
            "[id*='cookie'] button",
        ):
            try:
                page.click(sel, timeout=2000)
                page.wait_for_timeout(500)
                break
            except Exception:
                pass

        # Scroll-to-load-more: stop once the card count stabilises across
        # 3 attempts or the hard cap is reached.
        previous = 0
        stable_attempts = 0
        for _ in range(20):
            count = len(page.query_selector_all(CARD_SELECTOR))
            if count >= max_jobs:
                break
            if count == previous:
                stable_attempts += 1
                if stable_attempts >= 3:
                    break  # no more loading
            else:
                stable_attempts = 0
                previous = count
            page.mouse.wheel(0, 5000)
            page.wait_for_timeout(1500)

        anchors = page.query_selector_all(CARD_SELECTOR)[:max_jobs]
        seen_urls = set()
        for a in anchors:
            try:
                href = (a.get_attribute("href") or "").strip()
                if not href:
                    continue
                if not href.startswith("http"):
                    href = "https://www.finn.no" + href
                if href in seen_urls:
                    continue
                seen_urls.add(href)

                # Title: anchor text minus the absolute-overlay span
                title = (a.text_content() or "").strip()
                if not title:
                    continue

                # Walk up to the card container for company/location/time
                handle = a.evaluate_handle(
                    "a => a.closest('.job-card__body')"
                )
                card = handle.as_element() if handle else None

                company = ""
                location = ""
                posted = None
                if card:
                    # Company: <div class="text-caption …"><strong>…</strong>
                    # No bare-strong fallback on purpose: if this selector
                    # misses, company comes back empty across the board —
                    # a loud signal that finn.no's DOM moved, not a silent
                    # wrong-element grab.
                    strong = card.query_selector(".text-caption strong")
                    if strong:
                        company = (strong.text_content() or "").strip()
                    # Location: first <li> in <ul class="job-card__pills">
                    loc = card.query_selector(
                        "ul.job-card__pills > li:first-child span"
                    )
                    if loc:
                        location = (loc.text_content() or "").strip()
                    # Posted date: <time dateTime="ISO">
                    time_el = card.query_selector("time")
                    if time_el:
                        dt = (
                            time_el.get_attribute("datetime")
                            or time_el.get_attribute("dateTime")
                            or ""
                        )
                        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", dt)
                        if m:
                            posted = m.group(0)

                jobs.append({
                    "role": title,
                    "company": company,
                    "location": location,
                    "url": href,
                    "posted": posted,
                    "query": query,
                })
            except Exception as e:
                print(
                    f"  extract failed for one anchor: {e}", file=sys.stderr
                )
                continue

        browser.close()

    # Inter-query throttle — stay polite to finn.no (was per-page before)
    time.sleep(1.5)
    return jobs


# ─────────────────────────────────────────────────────────────────────────
# Score + seniority — match strategi.html scoreJob() exactly
# ─────────────────────────────────────────────────────────────────────────

def detect_seniority(title: str) -> str:
    t = (title or "").lower()
    if re.search(r"\b(graduate|trainee|junior|associate|nyutdannet|entry|internship|intern)\b", t):
        return "junior"
    if re.search(r"\b(senior|lead|principal|director|head\s+of|vp|chief)\b", t):
        return "senior"
    return "mid"


def score_job(job: dict) -> dict:
    """Mirror of scoreJob() in strategi.html. Breakdown labels are Norwegian
    to match what the browser-side popover renders for existing jobs."""
    breakdown = {}
    total = 0
    company = (job.get("company") or "").lower()
    role = (job.get("role") or "").lower()
    loc = (job.get("location") or "").lower()

    # priorityCompanies: first-tier match wins (no double-count)
    for tier in PROFILE["priorityCompanies"]:
        hit = next((m for m in tier["match"] if m in company), None)
        if hit:
            breakdown[f"selskap: {hit}"] = tier["points"]
            total += tier["points"]
            break

    # titleKeywords: sum all matches on role only (NOT company)
    for kw, pts in PROFILE["titleKeywords"]:
        if kw in role:
            breakdown[f"tittel: {kw}"] = pts
            total += pts

    # locations: sum all matches
    for kw, pts in PROFILE["locations"]:
        if kw in loc:
            breakdown[f"sted: {kw}"] = pts
            total += pts

    # seniorityBoost
    sen = job.get("seniority")
    if sen and sen in PROFILE["seniorityBoost"]:
        v = PROFILE["seniorityBoost"][sen]
        breakdown[f"seniority: {sen}"] = v
        total += v

    # negativeKeywords: myk straff -50 ved tittel-treff (irrelevante bransjer)
    neg = next((n for n in PROFILE["negativeKeywords"] if n in role), None)
    if neg:
        breakdown[f"ekskludert: {neg}"] = -50
        total -= 50

    return {"score": max(0, min(100, total)), "breakdown": breakdown}


def is_priority_company(company: str) -> bool:
    c = (company or "").lower()
    return any(m in c for tier in PROFILE["priorityCompanies"] for m in tier["match"])


def normalize_url(u: str) -> str:
    if not u: return ""
    # Strip kun hash-fragment, IKKE query (?Id=N er identifier på
    # noen sites som jobs.lu — bevare query er korrekt default)
    u = re.sub(r"#.*$", "", u)
    u = u.rstrip("/")
    return u.lower()


def sha1_job_id(url: str) -> str:
    return hashlib.sha1(url.encode("utf-8")).hexdigest()[:12]


# ─────────────────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────────────────

def main():
    password = os.environ["STRATEGI_PASSWORD"].strip()
    pat = os.environ["GIST_PAT"]
    gist_id = os.environ["GIST_ID"]

    now_utc = datetime.now(timezone.utc)
    print(f"[{now_utc.isoformat()}] Starting scrape")

    print("Fetching Gist…")
    blob = gist_get(pat, gist_id)
    print(
        f"  blob fingerprint: v={blob.get('v')} "
        f"salt={blob.get('salt', '')[:8]}… iv={blob.get('iv', '')[:8]}… "
        f"ct_len={len(blob.get('ct', ''))} pw_len={len(password)}"
    )
    try:
        payload = decrypt_blob(password, blob)
    except Exception:
        print(
            "  DECRYPT FAILED. Blob above was NOT written with the "
            "STRATEGI_PASSWORD this run used (pw_len shown). Either the "
            "CI secret is stale, or the Gist blob was re-keyed from the browser.",
            file=sys.stderr,
        )
        raise
    existing_urls = {normalize_url(j.get("url", "")) for j in payload.get("jobs", [])}
    print(f"  Eksisterende jobber: {len(existing_urls)}")

    all_scraped = []
    seen_in_scrape = set()
    for q in QUERIES:
        print(f"Scraping query: {q!r}")
        scraped = scrape_finn(q)
        kept = 0
        for j in scraped:
            norm = normalize_url(j["url"])
            if norm in existing_urls or norm in seen_in_scrape:
                continue
            seen_in_scrape.add(norm)
            all_scraped.append(j)
            kept += 1
        print(f"  {len(scraped)} SSR-jobber, {kept} nye etter dedup")

    print(f"Nye unike jobber totalt: {len(all_scraped)}")

    now_iso = now_utc.isoformat()

    if not all_scraped:
        payload["lastScrape"] = {"at": now_iso, "count": 0, "queries": QUERIES}
        new_blob = encrypt_payload(password, payload)
        gist_patch(pat, gist_id, new_blob)
        print("Pushed lastScrape-update (0 nye jobber)")
        return

    new_jobs = []
    for j in all_scraped:
        j["seniority"] = detect_seniority(j["role"])
        sc = score_job(j)
        new_jobs.append({
            "id": sha1_job_id(j["url"]),
            "source": "finn",
            "company": j["company"],
            "role": j["role"],
            "url": j["url"],
            "location": j["location"],
            "seniority": j["seniority"],
            "description": "",
            "deadline": None,
            "posted": j["posted"],
            "added": now_iso,
            "score": sc["score"],
            "scoreBreakdown": sc["breakdown"],
            "query": j["query"],
            "priority": is_priority_company(j["company"]),
            "status": "new",
            "statusUpdated": None,
            "notes": "",
            "starred": False,
        })

    payload["jobs"] = new_jobs + payload.get("jobs", [])
    payload["updatedAt"] = now_iso
    payload["lastScrape"] = {"at": now_iso, "count": len(new_jobs), "queries": QUERIES}

    print("Encrypting and pushing…")
    new_blob = encrypt_payload(password, payload)
    gist_patch(pat, gist_id, new_blob)
    print(f"✓ Pushed {len(new_jobs)} new jobs to Gist")


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print(f"FATAL: missing env var {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"FATAL: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
