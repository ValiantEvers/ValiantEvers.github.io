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
from datetime import datetime, timedelta, timezone
from html import unescape as _unescape

import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
# playwright importeres lazy inne i scrape_finn() slik at PROFILE/score_job
# kan importeres (re-score-migrering, tester) uten at playwright er installert.

USER_AGENT = "ValiantEvers-strategi-scraper/1.0 (+https://evers.no)"

ENABLE_JOBINDEX = False  # dansk Jobindex deaktivert (Oslo-fokus, juni 2026). Sett True for å gjenoppta.

# Nye kilder (juni 2026) — NAV-feed + arbeidsgiver-ATS/scrape hos målbedriftene.
# Default PÅ, reversibelt (sett False for å deaktivere en enkelt kilde).
ENABLE_NAV = True       # NAV pam-stilling-feed (requests)
ENABLE_NORDEA = True    # Nordea SuccessFactors RSS (requests)
ENABLE_DNB = True       # DNB SuccessFactors RSS (requests)
ENABLE_FORMUE = True    # Formue Teamtailor JSON (requests)
ENABLE_NBIM = True      # NBIM vacancies (Playwright)
ENABLE_STOREBRAND = True  # Storebrand Workday CXS JSON (requests POST)
ENABLE_ARCTIC = True      # Arctic Securities open-positions (requests+regex, Playwright-fallback)
ENABLE_PARETO = True      # Pareto Securities Teamtailor JSON (requests, som Formue)
ENABLE_KLP = True         # KLP SuccessFactors RSS (requests, som Nordea/DNB) — juli 2026
ENABLE_SEB = True         # SEB Lever postings-API (requests) — juli 2026
ENABLE_DANSKE = True      # Danske Bank Oracle HCM CE REST (requests) — juli 2026
ENABLE_GARANTUM = True    # Garantum Teamtailor JSON (requests, som Formue/Pareto) — juli 2026.
                          # I dag 0 Norge-roller (Sverige-kontorer) — poenget er å FANGE
                          # en fremtidig Oslo-rolle (tier 1, åpen søknad-spor).

# ─────────────────────────────────────────────────────────────────────────
# PROFILE — KEEP IN SYNC WITH strategi.html PROFILE-konstant.
# ─────────────────────────────────────────────────────────────────────────
PROFILE = {
    "priorityCompanies": [
        {"match": ["formue", "formuesforvaltning", "nbim", "norges bank investment management"], "points": 30},
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
        # Forvalter-titler (juni 2026) — lå i finn-QUERIES men manglet i scoring,
        # så «Formuesforvalter» o.l. scoret lavt. KEEP IN SYNC med strategi.html.
        ("formuesforvalt", 25),
        ("porteføljeforvalt", 18),
        ("fondsforvalt", 18),
    ],
    "locations": [
        ("oslo", 10),  # hele Oslo kommune: Bjørvika, Aker Brygge, Vika, Skøyen, Majorstuen, Nydalen
        # Pendlerbelte (Bærum/Asker-korridoren, direkte tog fra Oslo S):
        ("lysaker", 8), ("fornebu", 8), ("sandvika", 8), ("bærum", 8),
        ("asker", 5),  # ytre belte ~20 min tog
        # Avviklet juni 2026 — gjenopprett sammen med ENABLE_JOBINDEX hvis utland tas inn igjen:
        # ("paris", 8), ("london", 5), ("luxembourg", 5), ("stockholm", 3),
        # ("københavn", 7), ("copenhagen", 7), ("aarhus", 4), ("århus", 4),
        # ("aalborg", 3), ("odense", 3),
    ],
    "seniorityBoost": {"junior": 20, "mid": 5, "senior": -10},
    "negativeKeywords": [
        "forsikring", "eiendomsmegl", "eiendomsrådgiver", "regnskap", "lønn",
        "gjeldsrådgiver", "kundeservice", "kundesenter", "sykepleier", "renhold",
        "lærling", "developer", "utvikler", "ingeniør", "it-rådgiver",
        "controller", "comptable", "lawyer",
        # Danske staveformer (Jobindex-kilden) — de norske over fyrer aldri på
        # danske titler. KEEP IN SYNC med strategi.html (samme strenger/rekkefølge).
        "ejendomsmægler", "regnskab", "gældsrådgiver", "kundecenter",
        "sygeplejerske", "rengøring", "udvikler", "pædagog",
    ],
    # Ikke-Oslo-penalty: jobber UTEN lokasjons-treff (Oslo+belte) får myk straff så
    # Oslo rangerer over sammenlignbar ikke-Oslo. KEEP IN SYNC med strategi.html PROFILE.
    "nonOsloPenalty": -60,
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

# Danske søkeord for Jobindex.dk (source="jobindex"). Dansk stavemåte avviker
# fra norsk: "formueforvaltning" (uten -s-), "formuerådgiver", osv. Titler som
# "private banking/banker", "investeringsrådgiver", "kapitalforvaltning" og
# "porteføljeforvalter" staves identisk på dansk og treffer derfor de samme
# PROFILE.titleKeywords som finn-jobbene. De danske lokasjonene (København,
# Aarhus …) er lagt inn i PROFILE.locations nedenfor, ellers scorer alle
# danske jobber 0 stedspoeng. KEEP IN SYNC med strategi.html.
DK_QUERIES = [
    "private banking",
    "private banker",
    "formueforvaltning",
    "formuerådgiver",
    "porteføljeforvalter",
    "investeringsrådgiver",
    "kapitalforvaltning",
    "fondsforvalter",
    "investeringschef",
    "wealth management",
    "junior analytiker",
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
# Jobindex.dk scraper — Playwright headless Chromium
#
# Jobindex server-renders ~20 result cards per page and paginates the old
# way (?page=N), so no scroll-to-load-more — we walk page=1..N and stop when
# a page yields nothing new. Unlike finn, the visible title link points at
# the EXTERNAL employer site (e.g. nykredit.com), so we DON'T trust it as the
# identity URL. The stable jobindex permalink is built from the card's
# data-tid: https://www.jobindex.dk/vis-job/{tid}.
#
# Verified DOM (May 2026), search URL https://www.jobindex.dk/jobsoegning?q=…:
#   <div class="jobsearch-result">
#     <div class="PaidJob">           ← (or .jix_robotjob for robot ads)
#       … data-tid="h1666639" …       ← jobindex id, on several child elements
#       <div class="jix-toolbar-top__company"><a>{COMPANY}</a></div>
#       <h4><a href="{EXTERNAL_EMPLOYER_URL}">{TITLE}</a></h4>
#       <span class="jix_robotjob--area">{LOCATION}</span>
#       <time datetime="2026-05-19">19-05-2026</time>   ← posted (ISO date)
#
# Defensive parity with scrape_finn(): if div.jobsearch-result matches nothing
# on page 1 (captcha/block/DOM move), we log and return [] rather than guess a
# wrong element. Same {role, company, location, url, posted, query} dict shape.
# ─────────────────────────────────────────────────────────────────────────

JOBINDEX_SEARCH = "https://www.jobindex.dk/jobsoegning"
JOBINDEX_CARD_SELECTOR = "div.jobsearch-result"


def scrape_jobindex(query: str, max_jobs: int = 100, max_pages: int = 6) -> list:
    from playwright.sync_api import sync_playwright
    jobs = []
    seen_urls = set()

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=USER_AGENT,
            viewport={"width": 1280, "height": 800},
        )
        page = context.new_page()
        consent_done = False

        for page_num in range(1, max_pages + 1):
            url = (
                f"{JOBINDEX_SEARCH}?q={requests.utils.quote(query)}"
                f"&page={page_num}"
            )
            try:
                page.goto(url, wait_until="networkidle", timeout=30000)
            except Exception as e:
                print(f"  goto failed (page {page_num}): {e}", file=sys.stderr)
                break

            # Cookie consent — best effort, only worth trying once
            if not consent_done:
                for sel in (
                    "button:has-text('Accepter alle')",
                    "button:has-text('Accepter')",
                    "#jix-cookie-consent-accept-all",
                    "[id*='cookie'] button",
                ):
                    try:
                        page.click(sel, timeout=2000)
                        page.wait_for_timeout(400)
                        break
                    except Exception:
                        pass
                consent_done = True

            cards = page.query_selector_all(JOBINDEX_CARD_SELECTOR)
            if not cards:
                # Page 1 empty = block/DOM-move (loud signal). Later pages
                # empty = simply ran out of results (normal stop).
                if page_num == 1:
                    print(
                        f"  jobindex: 0 kort for {query!r} — selektor bommet "
                        f"eller blokkert, returnerer []",
                        file=sys.stderr,
                    )
                break

            new_on_page = 0
            for c in cards:
                try:
                    tid_el = c.query_selector("[data-tid]")
                    tid = (
                        tid_el.get_attribute("data-tid") if tid_el else None
                    )
                    if not tid:
                        continue
                    href = f"https://www.jobindex.dk/vis-job/{tid}"
                    if href in seen_urls:
                        continue

                    # Title: <h4> (same text as its employer-link anchor). No
                    # bare fallback on purpose — empty title across the board
                    # signals a DOM move, not a silent wrong grab.
                    h4 = c.query_selector("h4")
                    title = (h4.text_content() or "").strip() if h4 else ""
                    if not title:
                        continue

                    comp_el = c.query_selector(".jix-toolbar-top__company")
                    company = (
                        (comp_el.text_content() or "").strip()
                        if comp_el else ""
                    )

                    # Location: .jix_robotjob--area is the clean city (the
                    # wrapping .jobad-element-area also contains "Se rejsetid").
                    area = c.query_selector(".jix_robotjob--area")
                    location = (
                        (area.text_content() or "").strip() if area else ""
                    )

                    # Posted: <time datetime="YYYY-MM-DD">
                    posted = None
                    time_el = c.query_selector("time[datetime]")
                    if time_el:
                        dt = (
                            time_el.get_attribute("datetime")
                            or time_el.get_attribute("dateTime")
                            or ""
                        )
                        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", dt)
                        if m:
                            posted = m.group(0)

                    seen_urls.add(href)
                    jobs.append({
                        "role": title,
                        "company": company,
                        "location": location,
                        "url": href,
                        "posted": posted,
                        "query": query,
                    })
                    new_on_page += 1
                except Exception as e:
                    print(
                        f"  extract failed for one jobindex card: {e}",
                        file=sys.stderr,
                    )
                    continue

            # Stop conditions: hit the cap, or a full page added nothing new
            # (last page repeats / no further results).
            if len(jobs) >= max_jobs or new_on_page == 0:
                break

        browser.close()

    jobs = jobs[:max_jobs]
    # Inter-query throttle — stay polite to jobindex.dk
    time.sleep(1.5)
    return jobs


# ─────────────────────────────────────────────────────────────────────────
# Score + seniority — match strategi.html scoreJob() exactly
# ─────────────────────────────────────────────────────────────────────────

def detect_seniority(title: str) -> str:
    t = (title or "").lower()
    if re.search(r"\b(graduate|trainee|junior|associate|nyutdannet|første\s*år|entry|internship|intern)\b", t):
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

    # A1: selskapspoeng krever minst ett tittel-treff. Et reelt seniority-treff
    # (junior/senior — IKKE default "mid") teller også som tittel-treff (A2b).
    title_hit = any(kw in role for kw, _ in PROFILE["titleKeywords"])
    sen_hit = job.get("seniority") in ("junior", "senior")
    if title_hit or sen_hit:
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

    # locations: sum all matches; penalty if NO Oslo+belte match (Oslo-fokus)
    loc_hit = False
    for kw, pts in PROFILE["locations"]:
        if kw in loc:
            breakdown[f"sted: {kw}"] = pts
            total += pts
            loc_hit = True
    if not loc_hit:
        breakdown["utenfor Oslo+belte"] = PROFILE["nonOsloPenalty"]
        total += PROFILE["nonOsloPenalty"]

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


# ─────────────────────────────────────────────────────────────────────────
# Keep-filter for de brede/arbeidsgiver-kildene (NAV/ATS/NBIM).
# finn er query-forhåndsfiltrert og går UTENOM dette (beholder alt som før).
#
# Behold en jobb hvis: (finans-tittel som finn) ELLER graduate-nett — men for
# brede NAV gjelder graduate-nettet KUN målbedrift i priorityCompanies-allowlist
# (ellers fanges hele Oslos graduate-marked). Oslo-avgrensning + negativeKeywords
# gjenbrukes. «neg and not finance» dropper tech-graduate/lærling-støy, men
# beholder finansroller som tilfeldigvis har et neg-ord («Private Banking Controller»).
# ─────────────────────────────────────────────────────────────────────────

# Graduate-nett (substring-match, som resten av PROFILE-matchingen). Bare «intern»
# er utelatt med vilje (treffer «internasjonal» o.l.); «internship» er trygt.
# «lærling» er utelatt: strengen står også i PROFILE["negativeKeywords"], så
# keep_job dropper alltid ikke-finans lærling-treff («neg and not finance») —
# entryen kunne aldri avgjøre noe.
GRADUATE_NET = [
    "graduate", "trainee", "nyutdannet", "internship",
    "sommerjobb", "sommerinternship", "junior",
    # «summer intern» (juli 2026): fanger «Summer Interns …»-titler (Danske
    # Bank Equity Research) som «internship» bommer på. Toordskombinasjonen
    # er trygg mot «internasjonal»-fella som holder bare «intern» ute.
    "summer intern",
]

# Finans-vokabular for keep-filteret — bevisst BREDERE enn PROFILE.titleKeywords
# (som er SCORING-vokabular). Speiler finn-søkeordene (QUERIES) slik at ekte
# finansroller fra de ufiltrerte feedene fanges (f.eks. «Formuesforvalter»,
# «Porteføljeforvalter» — som IKKE er titleKeywords). Påvirker IKKE scoring →
# ingen parity-krav mot strategi.html.
FINANCE_TERMS = [kw for kw, _ in PROFILE["titleKeywords"]] + [
    "fondsrådgiv", "fondsselg", "finansrådgiv", "finansanalytiker",
    "aksjeanalytiker", "premium banking", "relasjonsleder",
    "client advisor", "relationship manager", "wealth advisor",
    # Juli 2026 — tettet verifisert hull: «Kunderådgiver Sparing og Investering»
    # (DNB) traff ingen nett («investerings» m/ s matcher ikke «investering» —
    # gjaldt BÅDE NAV og DNB-RSS). «sparing» har kjent lavscore-støy
    # (innsparing/energisparing) — akseptert; stram til «sparing og» hvis den
    # blir plagsom. IKKE legg inn bare «megler»: da blir finance=True for
    # «Eiendomsmegler» og not-(neg and not finance)-vernet slutter å virke
    # for hele megler-familien.
    "investering", "sparing", "aksjemegler", "verdipapir",
]

# «Målbedrift-rolle»-nett: front-office-NÆRE titler som WM/PB-vokabularet over
# IKKE fanger (analyst/associate/asset servicing/portfolio). Teller som eligible
# KUN når arbeidsgiveren allerede er en målbedrift — dvs. de direkte employer-
# kildene (nbim/nordea/dnb/formue), eller NAV gated på is_priority_company.
# Ellers ville hele Oslos analyst-/associate-marked slippe gjennom. Påvirker IKKE
# scoring → ingen parity-krav mot strategi.html (samme som FINANCE_TERMS).
EMPLOYER_ROLE_NET = [
    "analyst", "analytiker", "associate", "asset servic",
    "portfolio", "portefølje", "investment", "capital markets",
]


def matches_oslo_belt(location: str) -> bool:
    """Speiler matchesOsloBelt() i strategi.html — Oslo + pendlerbelte."""
    loc = (location or "").lower()
    return any(kw in loc for kw, _ in PROFILE["locations"])


def keep_job(job: dict, source: str) -> bool:
    """Keep-filter for brede/arbeidsgiver-kilder. finn kaller IKKE denne."""
    role = (job.get("role") or "").lower()
    company = job.get("company") or ""
    loc = (job.get("location") or "").strip()
    finance = any(t in role for t in FINANCE_TERMS)
    grad = any(g in role for g in GRADUATE_NET)
    emp_role = any(t in role for t in EMPLOYER_ROLE_NET)
    neg = any(n in role for n in PROFILE["negativeKeywords"])
    oslo_ok = (not loc) or matches_oslo_belt(loc)  # lenient på ukjent location
    if source == "nav":
        # NAV = hele markedet → grad-/employer-nettet gjelder KUN målbedrifter
        eligible = finance or ((grad or emp_role) and is_priority_company(company))
    else:  # nbim/nordea/dnb/formue er allerede én målbedrift
        eligible = finance or grad or emp_role
    return oslo_ok and eligible and not (neg and not finance)


# ─────────────────────────────────────────────────────────────────────────
# NAV pam-stilling-feed — offisiell gratis JSON-feed (hele det norske markedet),
# requests, ingen Playwright. publicToken-svaret er menneskelesbart
# («Current public token…: <JWT>») → JWT må parses ut. Event-feed: eldst→nyest,
# paginer framover via next_url; ?last=true gir tuppen.
#
# Cursor (siste konsumerte side-id) persisteres i payload.sourceCursors.nav.
# Første kjøring (cursor None) starter på tuppen — ingen bakover-/dato-seek finnes
# (verifisert: ?date= ignoreres, ingen prev_url), så 7–14-dagers-backfill er ikke
# mulig; hullet dekkes av ATS/finn-overlapp. Senere kjøringer re-henter cursor-
# siden (kan ha vokst) og følger next_url framover.
#
# ToS (arbeidsplassen.nav.no/vilkar-api): kun ACTIVE slippes; deep-link til den
# kanoniske NAV-annonsen. Lista (_feed_entry) har title/businessName/municipal/
# status/uuid → ingen per-jobb detalj-henting nødvendig (færre kall, høfligere).
# Arbeidsplassen-ad-URL er verifisert HTTP 200 for både aktive og inaktive uuid.
# ─────────────────────────────────────────────────────────────────────────

NAV_BASE = "https://pam-stilling-feed.nav.no"
NAV_AD_URL = "https://arbeidsplassen.nav.no/stillinger/stilling/{uuid}"
NAV_MAX_PAGES = 200  # sikkerhetstak per kjøring (forhindrer runaway forward-walk)


def _nav_token() -> str:
    r = requests.get(
        f"{NAV_BASE}/api/publicToken",
        headers={"User-Agent": USER_AGENT},
        timeout=30,
    )
    r.raise_for_status()
    m = re.search(r"eyJ[A-Za-z0-9._-]+", r.text)
    if not m:
        raise RuntimeError("NAV publicToken: fant ingen JWT i svaret")
    return m.group(0)


def fetch_nav(cursor):
    """NAV-feed → (jobs, new_cursor, stats). cursor = siste konsumerte side-id eller None.
    Filtrerer ACTIVE + keep_job på liste-feltene (NAV er hele markedet → må filtreres
    her), bygger jobb-dict med arbeidsplassen-deep-link, følger next_url til tuppen.
    stats teller RÅTT volum (telemetri): pages, items (alle events), active
    (ACTIVE-events = reelle kandidater FØR keep-filteret) — keep_job skjer her inne,
    så uten disse tallene er «0 kandidater» i loggen blind for om feeden i det hele
    tatt leverer events (jf. stille-død-analysen juli 2026)."""
    token = _nav_token()
    sess = requests.Session()
    sess.headers.update({
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
    })

    url = f"{NAV_BASE}/api/v1/feed/{cursor}" if cursor else f"{NAV_BASE}/api/v1/feed?last=true"
    jobs = []
    new_cursor = cursor
    stats = {"pages": 0, "items": 0, "active": 0}
    pages = 0
    while url and pages < NAV_MAX_PAGES:
        full = url if url.startswith("http") else NAV_BASE + url
        try:
            r = sess.get(full, timeout=30)
        except Exception as e:
            print(f"  nav: feed-henting feilet: {e}", file=sys.stderr)
            break
        if r.status_code != 200:
            print(f"  nav: feed status {r.status_code}, stopper", file=sys.stderr)
            break
        data = r.json()
        if data.get("id"):
            new_cursor = data["id"]
        for it in data.get("items", []):
            stats["items"] += 1
            fe = it.get("_feed_entry") or {}
            if fe.get("status") != "ACTIVE":
                continue
            stats["active"] += 1
            uuid = fe.get("uuid") or it.get("id")
            if not uuid:
                continue
            cand = {
                "role": fe.get("title") or it.get("title") or "",
                "company": fe.get("businessName") or "",
                "location": fe.get("municipal") or "",
            }
            if not keep_job(cand, "nav"):
                continue
            posted = None
            dm = it.get("date_modified") or fe.get("sistEndret") or ""
            m = re.match(r"(\d{4})-(\d{2})-(\d{2})", dm)
            if m:
                posted = m.group(0)
            jobs.append({
                "role": cand["role"],
                "company": cand["company"],
                "location": (cand["location"] or "").title(),
                "url": NAV_AD_URL.format(uuid=uuid),
                "posted": posted,
                "query": "nav-feed",
            })
        nxt = data.get("next_url")
        pages += 1
        if not nxt:
            break  # nådd tuppen
        url = nxt
        time.sleep(0.5)  # throttle — vær høflig mot NAV
    if pages >= NAV_MAX_PAGES:
        print(
            f"  nav: traff sikkerhetstak {NAV_MAX_PAGES} sider — resten tas "
            f"neste kjøring (cursor lagret)",
            file=sys.stderr,
        )
    stats["pages"] = pages
    return jobs, new_cursor, stats


# ─────────────────────────────────────────────────────────────────────────
# Arbeidsgiver-ATS — requests, ingen Playwright.
#
# SAP SuccessFactors RSS (Nordea, DNB, KLP fra juli 2026): RSS 2.0 + xmlns:g.
# Per <item>: title, link (deep-link), g:id, g:location (ren by, f.eks.
# «Oslo, Norge, 0191» / KLP: «Bergen, NO»), g:employer, g:expiration_date,
# g:job_function (kun DNB). Felles parser.
#
# Teamtailor JSON Feed (Formue): location ligger i _jobposting (schema.org
# JobPosting → jobLocation), ev. tittel-parentes. Realistisk browser-UA brukes
# defensivt (rå curl ga 200 i juni 2026, men UA er billig forsikring).
# ─────────────────────────────────────────────────────────────────────────

SF_NS = {"g": "http://base.google.com/ns/1.0"}
BROWSER_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _strip_location_paren(title: str) -> str:
    """Fjern etterstilt «(By, Land, postnr)»-parentes fra SF-titler (har komma).
    Lar legitime parenteser som «(Maternity cover)» være."""
    return re.sub(r"\s*\([^)]*,[^)]*\)\s*$", "", title or "").strip()


def fetch_successfactors(url: str, source: str) -> list:
    """Felles parser for SAP SuccessFactors RSS (Nordea, DNB)."""
    import xml.etree.ElementTree as ET
    jobs = []
    try:
        r = requests.get(url, headers={"User-Agent": BROWSER_UA}, timeout=40)
        r.raise_for_status()
        root = ET.fromstring(r.content)
    except Exception as e:
        print(f"  {source}: RSS-henting/parse feilet: {e}", file=sys.stderr)
        return []

    def gtext(item, tag):
        el = item.find(tag, SF_NS)
        return (el.text or "").strip() if el is not None and el.text else ""

    for item in root.findall(".//item"):
        title = _strip_location_paren(gtext(item, "title"))
        link = gtext(item, "link")
        if not title or not link:
            continue
        exp = gtext(item, "g:expiration_date")
        jobs.append({
            "role": title,
            "company": gtext(item, "g:employer") or source.upper(),
            "location": gtext(item, "g:location"),
            "url": link,
            "posted": None,  # SF-feeden har ingen pubDate
            "deadline": exp or None,
            "query": f"{source}-ats",
        })
    time.sleep(1.0)
    return jobs


def _teamtailor_location(item: dict) -> str:
    """By fra _jobposting (schema.org jobLocation), ellers tittel-parentes."""
    jp = item.get("_jobposting") or {}
    jl = jp.get("jobLocation")
    if isinstance(jl, list):
        jl = jl[0] if jl else None
    if isinstance(jl, dict):
        addr = jl.get("address")
        if isinstance(addr, dict):
            city = addr.get("addressLocality") or addr.get("addressRegion")
            if city:
                return str(city).strip()
    m = re.search(r"\(([^)]+)\)\s*$", item.get("title") or "")
    return m.group(1).strip() if m else ""


# Lokasjonsberikelse (juli 2026): enkelte TT-items mangler jobLocation i feeden
# (Pareto «Summer Internship 2027», enkelte Formue-roller) og fikk dermed
# nonOsloPenalty −60 i scoring. Detaljsidens JSON-LD er OGSÅ tom for disse
# (verifisert), men TT-headeren over <h1> viser «Avdeling · By» som uppercase-
# spans med byen sist. Vi henter detaljsiden KUN for items uten lokasjon
# (1–2 stk/dag) og parser den span-lista — beriker fremfor å anta Oslo.
_TT_REMOTE_WORDS = {"hybrid", "remote", "fully remote"}


def _teamtailor_detail_location(url: str, source: str) -> str:
    try:
        r = requests.get(url, headers={"User-Agent": BROWSER_UA}, timeout=30)
        r.raise_for_status()
    except Exception as e:
        print(f"  {source}: detaljside-henting feilet ({url}): {e}", file=sys.stderr)
        return ""
    m = re.search(r"<div[^>]*uppercase[^>]*>(.*?)</div>\s*<h1", r.text, re.S | re.I)
    if not m:
        return ""
    parts = [_strip_tags(s) for s in re.findall(r"<span[^>]*>(.*?)</span>", m.group(1), re.S)]
    parts = [p for p in parts
             if p and p not in {"·", "•", "-"} and p.lower() not in _TT_REMOTE_WORDS]
    return parts[-1] if parts else ""


def fetch_teamtailor(url: str, source: str) -> list:
    """Teamtailor JSON Feed (Formue, Pareto)."""
    jobs = []
    try:
        r = requests.get(url, headers={"User-Agent": BROWSER_UA}, timeout=30)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"  {source}: JSON-henting feilet: {e}", file=sys.stderr)
        return []
    for it in data.get("items", []):
        title = (it.get("title") or "").strip()
        link = it.get("url") or ""
        if not title or not link:
            continue
        posted = None
        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", it.get("date_published") or "")
        if m:
            posted = m.group(0)
        location = _teamtailor_location(it)
        if not location:
            location = _teamtailor_detail_location(link, source)
            if location:
                print(f"  {source}: beriket lokasjon fra detaljside: "
                      f"{title!r} → {location}")
            time.sleep(0.5)  # throttle — kun for de få uten lokasjon
        jobs.append({
            "role": title,
            "company": source.capitalize(),
            "location": location,
            "url": link,
            "posted": posted,
            "query": f"{source}-ats",
        })
    time.sleep(1.0)
    return jobs


# ─────────────────────────────────────────────────────────────────────────
# Lever postings-API (SEB fra juli 2026) — offentlig JSON, requests.
# EU-tenant: api.eu.lever.co (us-endepunktet api.lever.co gir 404 for seb).
# Per posting: text (tittel), hostedUrl (deep-link), categories.location
# (ren by), createdAt (ms-epoch). Hele SEB-gruppen kommer i ett kall
# (~100 postings, Vilnius/Riga/Stockholm-tungt) — keep_job's Oslo-gate +
# finans/grad/employer-nettene snevrer inn til Oslo-rollene.
# ─────────────────────────────────────────────────────────────────────────


def fetch_lever(api_url: str, source: str, company: str) -> list:
    jobs = []
    try:
        r = requests.get(
            api_url,
            headers={"User-Agent": BROWSER_UA, "Accept": "application/json"},
            timeout=30,
        )
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"  {source}: Lever-henting feilet: {e}", file=sys.stderr)
        return []
    for p in data if isinstance(data, list) else []:
        title = (p.get("text") or "").strip()
        link = p.get("hostedUrl") or ""
        if not title or not link:
            continue
        posted = None
        ts = p.get("createdAt")
        if isinstance(ts, (int, float)) and ts > 0:
            posted = datetime.fromtimestamp(ts / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
        jobs.append({
            "role": title,
            "company": company,
            "location": ((p.get("categories") or {}).get("location") or "").strip(),
            "url": link,
            "posted": posted,
            "query": f"{source}-ats",
        })
    time.sleep(1.0)
    return jobs


# ─────────────────────────────────────────────────────────────────────────
# Oracle HCM (Fusion) CandidateExperience REST (Danske Bank fra juli 2026).
# Offentlig GET recruitingCEJobRequisitions med findReqs-finder; limit=200
# gir hele lista (175 jobber) i ETT kall (verifisert live — ingen paginering
# nødvendig; varsler hvis TotalJobsCount vokser forbi limit). Per requisition:
# Id, Title, PrimaryLocation («Oslo, Norway»), PostedDate, PostingEndDate
# (→ deadline). Deep-link: {ui_base}/job/{Id}. keep_job's Oslo-gate
# filtrerer bort Vilnius/København-massen.
# ─────────────────────────────────────────────────────────────────────────

ORACLE_LIMIT = 200


def fetch_oracle_hcm(rest_base: str, ui_base: str, site: str, source: str, company: str) -> list:
    # expand=requisitionList.… er OBLIGATORISK — uten den kommer items[]
    # tilbake uten requisitionList overhodet (verifisert live juli 2026).
    url = (
        f"{rest_base}/recruitingCEJobRequisitions?onlyData=true"
        f"&expand=requisitionList.secondaryLocations"
        f"&finder=findReqs%3BsiteNumber%3D{site}"
        f"%2Climit%3D{ORACLE_LIMIT}%2CsortBy%3DPOSTING_DATES_DESC"
    )
    try:
        r = requests.get(
            url,
            headers={"User-Agent": BROWSER_UA, "Accept": "application/json"},
            timeout=40,
        )
        r.raise_for_status()
        items = r.json().get("items") or []
    except Exception as e:
        print(f"  {source}: Oracle-henting feilet: {e}", file=sys.stderr)
        return []
    reqs = (items[0].get("requisitionList") or []) if items else []
    total = items[0].get("TotalJobsCount") if items else None
    if total and total > len(reqs):
        print(
            f"  {source}: TotalJobsCount {total} > {len(reqs)} hentet — "
            f"øk ORACLE_LIMIT eller innfør offset-paginering",
            file=sys.stderr,
        )
    jobs = []
    for q in reqs:
        title = (q.get("Title") or "").strip()
        rid = q.get("Id")
        if not title or not rid:
            continue
        posted = None
        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", str(q.get("PostedDate") or ""))
        if m:
            posted = m.group(0)
        deadline = None
        m = re.match(r"(\d{4})-(\d{2})-(\d{2})", str(q.get("PostingEndDate") or ""))
        if m:
            deadline = m.group(0)
        jobs.append({
            "role": title,
            "company": company,
            "location": (q.get("PrimaryLocation") or "").strip(),
            "url": f"{ui_base}/job/{rid}",
            "posted": posted,
            "deadline": deadline,
            "query": f"{source}-ats",
        })
    time.sleep(1.0)
    return jobs


# ─────────────────────────────────────────────────────────────────────────
# Workday CXS jobs-API — requests POST, gjenbrukbar på tvers av Workday-tenants
# (Storebrand først). GET på /jobs gir HTTP 400 (POST-only, bekreftet live).
# Body {"appliedFacets":{},"limit":20,"offset":0,"searchText":""}; tomt
# searchText gir ALLE jobber (mye irrelevant: forsikring/skade/IT) — keep_job
# snevrer inn. Svar: {"total": int, "jobPostings": [...]}. Per posting: title,
# externalPath, locationsText, postedOn («Posted 3 Days Ago» — IKKE ren dato →
# posted=None). Apply-URL = base_url + externalPath (locale-segment i base_url).
# ─────────────────────────────────────────────────────────────────────────

WORKDAY_LIMIT = 20
WORKDAY_MAX_PAGES = 15  # sikkerhetstak ~300 jobber/kjøring (runaway-vern)


def fetch_workday(api_url: str, base_url: str, source: str) -> list:
    """Workday CXS jobs-API (POST, paginert). base_url = locale-prefikset
    apply-base som externalPath henges på, f.eks.
    'https://storebrand.wd3.myworkdayjobs.com/en-US/Storebrand_Careers'."""
    jobs = []
    seen = set()
    try:
        offset = 0
        for _ in range(WORKDAY_MAX_PAGES):
            body = {"appliedFacets": {}, "limit": WORKDAY_LIMIT,
                    "offset": offset, "searchText": ""}
            r = requests.post(
                api_url, json=body,
                headers={"User-Agent": BROWSER_UA, "Accept": "application/json"},
                timeout=30,
            )
            r.raise_for_status()
            data = r.json()
            postings = data.get("jobPostings") or []
            if not postings:
                break
            for p in postings:
                path = (p.get("externalPath") or "").strip()
                title = (p.get("title") or "").strip()
                if not path or not title:
                    continue
                url = base_url.rstrip("/") + path  # externalPath begynner med "/"
                if url in seen:
                    continue
                seen.add(url)
                jobs.append({
                    "role": title,
                    "company": source.capitalize(),      # "storebrand" → "Storebrand"
                    "location": (p.get("locationsText") or "").strip(),
                    "url": url,
                    "posted": None,   # postedOn er menneskelesbar, ikke ren dato
                    "query": f"{source}-ats",
                })
            offset += WORKDAY_LIMIT
            total = data.get("total") or 0
            if total and offset >= total:
                break
            time.sleep(0.5)   # throttle mellom paginerte kall
    except Exception as e:
        print(f"  {source}: Workday-henting feilet: {e}", file=sys.stderr)
        return []
    time.sleep(1.0)
    return jobs


# ─────────────────────────────────────────────────────────────────────────
# NBIM (Norges Bank Investment Management) — Webcruiter-basert. På nbim.no
# (IKKE .com — .com 301-redirecter). Eneste kilde uten aggregator-fallback
# (ikke på finn ELLER NAV). Vacancies-siden lenker Webcruiter-annonser
# (tenant 398280) og SERVER-RENDRER dem (verifisert juli 2026) → requests +
# regex er primær (Arctic-mønsteret), Playwright kun fallback hvis siden
# skulle bli JS-hydrert igjen. Kort-ankeret har to spans: tittel + italic
# «Location: <by> Closing Date: <dd.mm.yyyy>» — parses til role/location/
# deadline (Location mangler av og til → default «Oslo», NBIM HQ).
# Sesong-landingssider for Graduate Programme / Summer Internship legges i
# NBIM_SEASONAL når de er live.
# ─────────────────────────────────────────────────────────────────────────

NBIM_VACANCIES = "https://www.nbim.no/en/about-us/career/vacancies/"
NBIM_SEASONAL = []  # f.eks. graduate-/internship-landingssider (sesong)
NBIM_HREF_RE = re.compile(
    r'<a[^>]+href="(https?://[^"]*webcruiter[^"]*recruit/public[^"]*)"[^>]*>(.*?)</a>',
    re.I | re.S,
)


def _nbim_split(text: str):
    """«Tittel Location: X Closing Date: dd.mm.yyyy» → (tittel, by, ISO-deadline).
    Begge metafelter er valgfrie; by-default «Oslo» (HQ) når Location mangler."""
    t = re.sub(r"\s+", " ", text or "").strip()
    deadline = None
    m = re.search(r"Closing Date:\s*(\d{2})\.(\d{2})\.(\d{4})", t, re.I)
    if m:
        deadline = f"{m.group(3)}-{m.group(2)}-{m.group(1)}"
        t = t[:m.start()].strip()
    location = ""
    m = re.search(r"Location:\s*(.+)$", t, re.I)
    if m:
        location = m.group(1).strip()
        t = t[:m.start()].strip()
    return t, (location or "Oslo"), deadline


def _nbim_job(href: str, anchor_text: str, seen: set):
    title, location, deadline = _nbim_split(anchor_text)
    if not title or href in seen:
        return None
    seen.add(href)
    return {
        "role": title,
        "company": "NBIM",
        "location": location,
        "url": href,
        "posted": None,
        "deadline": deadline,
        "query": "nbim",
    }


def scrape_nbim() -> list:
    # 1) requests + regex (primær)
    jobs, seen = [], set()
    try:
        for u in [NBIM_VACANCIES] + NBIM_SEASONAL:
            r = requests.get(u, headers={"User-Agent": BROWSER_UA}, timeout=30)
            r.raise_for_status()
            for m in NBIM_HREF_RE.finditer(r.text):
                job = _nbim_job(_unescape(m.group(1)).strip(), _strip_tags(m.group(2)), seen)
                if job:
                    jobs.append(job)
        if jobs:
            time.sleep(1.0)
            return jobs
        print("  nbim: 0 webcruiter-ankere i rå HTML — faller tilbake til Playwright", file=sys.stderr)
    except Exception as e:
        print(f"  nbim: requests feilet ({e}) — prøver Playwright", file=sys.stderr)

    # 2) Playwright-fallback (speiler scrape_arctic; samme parsing via _nbim_job)
    try:
        from playwright.sync_api import sync_playwright
        jobs, seen = [], set()
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=USER_AGENT, viewport={"width": 1280, "height": 800}
            )
            page = context.new_page()
            try:
                for u in [NBIM_VACANCIES] + NBIM_SEASONAL:
                    try:
                        page.goto(u, wait_until="networkidle", timeout=30000)
                    except Exception as e:
                        print(f"  nbim: goto feilet {u}: {e}", file=sys.stderr)
                        continue
                    page.wait_for_timeout(1500)
                    for a in page.query_selector_all("a[href*='webcruiter']"):
                        href = (a.get_attribute("href") or "").strip()
                        if "recruit/public" not in href:
                            continue
                        job = _nbim_job(href, a.text_content() or "", seen)
                        if job:
                            jobs.append(job)
            finally:
                browser.close()
        time.sleep(1.5)  # Playwright-throttle
        return jobs
    except Exception as e:
        print(f"  nbim: Playwright-fallback feilet: {e}", file=sys.stderr)
        return []


def _strip_tags(s: str) -> str:
    """HTML → ren tekst: dropp tagger, decode entities (&amp;/&nbsp;), kollaps whitespace."""
    return re.sub(r"\s+", " ", _unescape(re.sub(r"<[^>]+>", " ", s or ""))).strip()


# ─────────────────────────────────────────────────────────────────────────
# Arctic Securities — server-rendret HTML, INGEN JSON-API funnet (juli 2026).
# Stillingene ligger i rå HTML: <a href="/career/open-position/<år>/<slug>">.
# Primær: requests.get + re (raskt, ingen browser). Fallback: Playwright samme
# DOM-selektor hvis rå-HTML ikke har ankrene (JS-hydrering). Company =
# «Arctic Securities», Oslo-HQ → location default «Oslo» når kortet mangler by.
# Absolutte URL-er (https://www.arctic.com). Liste-URL er FLERTALL
# (/open-positions), detalj ENTALL m/skråstrek (/open-position/…) → regex/
# selektor med etterfølgende «/» matcher aldri liste-selvlenken.
# ─────────────────────────────────────────────────────────────────────────

ARCTIC_POSITIONS = "https://www.arctic.com/career/open-positions"
ARCTIC_BASE = "https://www.arctic.com"
ARCTIC_HREF_RE = re.compile(
    r'<a[^>]+href="(/career/open-position/[^"#?]+)"[^>]*>(.*?)</a>', re.I | re.S
)
ARCTIC_CITY_RE = re.compile(
    r"\b(Oslo|Lysaker|Fornebu|Sandvika|Bærum|Asker|Stavanger|Bergen|Trondheim|"
    r"London|Stockholm|Copenhagen|København|Frankfurt)\b", re.I
)


def _arctic_parse_html(html: str) -> list:
    jobs, seen = [], set()
    for m in ARCTIC_HREF_RE.finditer(html):
        path, inner = m.group(1), m.group(2)
        title = _strip_tags(inner)
        if not title:
            continue
        url = ARCTIC_BASE + path.split("#")[0].split("?")[0]
        if url in seen:
            continue
        seen.add(url)
        # By fra tittelen, ellers ~300-tegns vindu etter ankeret; ellers Oslo (HQ).
        cm = ARCTIC_CITY_RE.search(title) or ARCTIC_CITY_RE.search(html[m.end():m.end() + 300])
        jobs.append({
            "role": title,
            "company": "Arctic Securities",
            "location": cm.group(1) if cm else "Oslo",
            "url": url,
            "posted": None,
            "query": "arctic",
        })
    return jobs


def scrape_arctic() -> list:
    # 1) requests + regex (primær)
    try:
        r = requests.get(ARCTIC_POSITIONS, headers={"User-Agent": BROWSER_UA}, timeout=30)
        r.raise_for_status()
        jobs = _arctic_parse_html(r.text)
        if jobs:
            time.sleep(1.0)
            return jobs
        print("  arctic: 0 ankere i rå HTML — faller tilbake til Playwright", file=sys.stderr)
    except Exception as e:
        print(f"  arctic: requests feilet ({e}) — prøver Playwright", file=sys.stderr)

    # 2) Playwright-fallback (speiler scrape_nbim)
    try:
        from playwright.sync_api import sync_playwright
        jobs, seen = [], set()
        with sync_playwright() as p:
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                user_agent=USER_AGENT, viewport={"width": 1280, "height": 800})
            page = context.new_page()
            try:
                page.goto(ARCTIC_POSITIONS, wait_until="networkidle", timeout=30000)
                page.wait_for_timeout(1500)
                for a in page.query_selector_all("a[href*='/career/open-position/']"):
                    href = (a.get_attribute("href") or "").strip()
                    title = _strip_tags(a.text_content() or "")
                    if not href or not title:
                        continue
                    if not href.startswith("http"):
                        href = ARCTIC_BASE + href
                    href = href.split("#")[0].split("?")[0]
                    if href in seen:
                        continue
                    seen.add(href)
                    jobs.append({
                        "role": title, "company": "Arctic Securities",
                        "location": "Oslo", "url": href,
                        "posted": None, "query": "arctic",
                    })
            finally:
                browser.close()
        time.sleep(1.5)   # Playwright-throttle
        return jobs
    except Exception as e:
        print(f"  arctic: Playwright-fallback feilet: {e}", file=sys.stderr)
        return []


# ─────────────────────────────────────────────────────────────────────────
# Pareto Securities — kjører Teamtailor (samme ATS som Formue). Selve
# paretosec.com/updates/vacant-positions er flaky å skrape (href veksler
# relativ/absolutt mellom kall); Teamtailor-feeden er strukturert JSON og
# gjenbruker fetch_teamtailor direkte (se employer-loopen i main), så ingen
# egen Pareto-kode trengs. Feed: https://paretosecurities.teamtailor.com/jobs.json
# ─────────────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────
# Cross-source dedup — fingerprint (selskap+tittel+by) på toppen av URL-dedup,
# så samme jobb fra finn/NAV/ATS ikke vises 2–3×. Kilde-preferanse: direkte
# arbeidsgiver > nav > finn > arkiv. Konjunktiv match = streng → få falske positiver.
# ─────────────────────────────────────────────────────────────────────────

SOURCE_PREF = {
    "nbim": 0, "nordea": 0, "dnb": 0, "formue": 0,  # direkte arbeidsgiver
    "storebrand": 0, "arctic": 0, "pareto": 0,      # direkte arbeidsgiver (nye, juli 2026)
    "klp": 0, "seb": 0, "danske": 0, "garantum": 0,  # direkte arbeidsgiver (juli 2026)
    "nav": 1, "finn": 2, "jobindex": 3,
}

# Fail-loud-terskler (juli 2026): kjøringer på rad med found==0 før exit 1
# (etter at Gist-payloaden er pushet — alarmen skal aldri koste data).
# finn: 28 queries sortert PUBLISHED_DESC gir organisk aldri 0 totalt → alarm
# samme dag (betyr blokk/DOM-brudd/Playwright-havari). Nordea/DNB-RSS har alltid
# innhold → 2. Småfeeds (formue/pareto/nbim/arctic/storebrand/nav) kan ha
# organiske 0-dager → default 5.
FAIL_LOUD_AFTER = {"finn": 1, "nordea": 2, "dnb": 2}
FAIL_LOUD_DEFAULT = 5


def _canon_company(company: str) -> str:
    """Kanonisk selskaps-token så «DNB», «DNB Bank ASA» osv. kollapser til ett.
    priorityCompanies-match er kanon for målbedrifter (der triplettene oppstår);
    ellers normalisert fullnavn m/ suffiks-strip. NBIM-synonymer slås sammen."""
    c = (company or "").lower()
    if "nbim" in c or "norges bank investment management" in c:
        return "nbim"
    for tier in PROFILE["priorityCompanies"]:
        for m in tier["match"]:
            if m in c:
                return re.sub(r"[^a-z0-9æøå]+", "", m)
    c = re.sub(r"\([^)]*\)", "", c)
    c = re.sub(r"\b(as|asa|abp|ab|sa)\b", "", c)
    return re.sub(r"[^a-z0-9æøå]+", "", c)


def _canon_city(location: str) -> str:
    """Kanonisk by — belte-nøkkel hvis Oslo+belte («Oslo, Norge, 0191» → «oslo»),
    ellers første ledd normalisert. Gjør by-komponenten robust på tvers av kilder."""
    loc = (location or "").lower()
    for kw, _ in PROFILE["locations"]:
        if kw in loc:
            return kw
    first = re.split(r"[,/]", location or "")[0]
    return re.sub(r"[^a-z0-9æøå]+", "", first.lower())


def fingerprint(job: dict) -> str:
    role = re.sub(r"\([^)]*\)", "", (job.get("role") or "").lower())
    role = re.sub(r"[^a-z0-9æøå]+", "", role)
    return f"{_canon_company(job.get('company'))}|{role}|{_canon_city(job.get('location'))}"


# Repost-vern (juli 2026): fingerprint-dedup skal IKKE sammenligne mot hele
# payload-historikken. En stilling som re-utlyses med ny FINN-kode/URL har
# identisk fingerprint (selskap|tittel|by) og ble tidligere slukt for alltid —
# både i hoved-dedupen og clobber-guarden. Fingerprints dedupes nå kun mot
# «nylige/aktive» jobber: added siste RECENT_FP_DAYS dager ELLER status i
# aktiv pipeline. URL-dedup beholdes mot ALT (samme URL = samme annonse).
# Konsekvens (ønsket): en genuin re-utlysning dukker opp som ny jobb.
RECENT_FP_DAYS = 60
ACTIVE_PIPELINE_STATUSES = {"applied", "interview"}


def _parse_added(added):
    """Tolerant ISO-parse av jobs[].added (kan mangle eller ha Z-suffiks)."""
    if not added:
        return None
    try:
        dt = datetime.fromisoformat(str(added).replace("Z", "+00:00"))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def recent_fingerprints(jobs, now_utc):
    """Fingerprints for jobber som fortsatt skal blokkere re-import: nylig
    lagt til ELLER i aktiv pipeline. Felles for hoved-dedup og clobber-guard."""
    cutoff = now_utc - timedelta(days=RECENT_FP_DAYS)
    fps = set()
    for j in jobs:
        if j.get("status") in ACTIVE_PIPELINE_STATUSES:
            fps.add(fingerprint(j))
            continue
        added = _parse_added(j.get("added"))
        if added is not None and added >= cutoff:
            fps.add(fingerprint(j))
    return fps


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
    # updatedAt ved start — clobber-guard sammenligner mot fersk blob før push
    # for å oppdage eksterne skrivinger (nettleser) under scrapingen.
    start_updated_at = payload.get("updatedAt")
    existing_urls = {normalize_url(j.get("url", "")) for j in payload.get("jobs", [])}
    print(f"  Eksisterende jobber: {len(existing_urls)}")
    nav_cursor = (payload.get("sourceCursors") or {}).get("nav")
    new_nav_cursor = None  # settes av NAV-blokka; graftes på fersk payload før push
    # sourceHealth fra START-payloaden (nettleseren skriver aldri feltet, så
    # start = fersk for helse-formål); oppdatert versjon graftes på fersk payload.
    prev_health = payload.get("sourceHealth") or {}

    all_scraped = []
    seen_in_scrape = set()

    # Per-kilde-telemetri: found = RÅTT volum før keep-filteret (for NAV: ACTIVE-
    # events), kept = etter keep_job, new = etter dedup (settes om til FINALE tall
    # etter fingerprint-dedup + clobber-guard). Kun aktiverte kilder får entry —
    # en kilde som kaster exception blir stående på 0 (teller som zero-found).
    scrape_stats = {}
    for src, enabled in (
        ("finn", True), ("jobindex", ENABLE_JOBINDEX), ("nav", ENABLE_NAV),
        ("nordea", ENABLE_NORDEA), ("dnb", ENABLE_DNB), ("formue", ENABLE_FORMUE),
        ("nbim", ENABLE_NBIM), ("storebrand", ENABLE_STOREBRAND),
        ("arctic", ENABLE_ARCTIC), ("pareto", ENABLE_PARETO),
        ("klp", ENABLE_KLP), ("seb", ENABLE_SEB), ("danske", ENABLE_DANSKE),
        ("garantum", ENABLE_GARANTUM),
    ):
        if enabled:
            scrape_stats[src] = {"found": 0, "kept": 0, "new": 0}

    def record(source, found, kept, new):
        st = scrape_stats.setdefault(source, {"found": 0, "kept": 0, "new": 0})
        st["found"] += found
        st["kept"] += kept
        st["new"] += new

    def ingest(jobs, source, apply_keep):
        """URL-dedup + (valgfritt) keep-filter; tagger source og samler opp.
        Returnerer (kept, new): kept = passerte keep-filteret, new = også nye
        etter URL-dedup."""
        kept = 0
        new = 0
        for j in jobs:
            if apply_keep and not keep_job(j, source):
                continue
            kept += 1
            norm = normalize_url(j.get("url", ""))
            if not norm or norm in existing_urls or norm in seen_in_scrape:
                continue
            seen_in_scrape.add(norm)
            j["source"] = source
            all_scraped.append(j)
            new += 1
        return kept, new

    def collect(queries, scraper, source):
        for q in queries:
            print(f"Scraping {source} query: {q!r}")
            scraped = scraper(q)
            _, new = ingest(scraped, source, False)
            record(source, len(scraped), len(scraped), new)
            print(f"  {len(scraped)} jobber, {new} nye etter dedup")

    # finn er query-forhåndsfiltrert → ingen keep_job. Nye kilder → keep_job.
    collect(QUERIES, scrape_finn, "finn")
    if ENABLE_JOBINDEX:
        collect(DK_QUERIES, scrape_jobindex, "jobindex")

    # Hver ny kilde er isolert: feiler én, logges den og resten + finn fortsetter
    # (en daglig kjøring skal aldri tape finn-resultatene fordi NAV/ATS er nede).
    if ENABLE_NAV:
        print("Henter NAV-feed…")
        try:
            nav_jobs, new_nav_cursor, nav_stats = fetch_nav(nav_cursor)
            payload.setdefault("sourceCursors", {})["nav"] = new_nav_cursor
            # keep_job er alt anvendt inne i fetch_nav → apply_keep=False her.
            _, nav_new = ingest(nav_jobs, "nav", False)
            record("nav", nav_stats["active"], len(nav_jobs), nav_new)
            print(f"  nav: {nav_stats['pages']} sider / {nav_stats['items']} events "
                  f"({nav_stats['active']} ACTIVE), {len(nav_jobs)} etter keep, "
                  f"{nav_new} nye etter dedup")
        except Exception as e:
            print(f"  nav: FEILET ({type(e).__name__}: {e}) — hopper over", file=sys.stderr)
    for enabled, label, fn in (
        (ENABLE_NORDEA, "nordea", lambda: fetch_successfactors("https://careers.nordea.com/sitemal.xml", "nordea")),
        (ENABLE_DNB, "dnb", lambda: fetch_successfactors("https://jobb.dnb.no/sitemal.xml", "dnb")),
        (ENABLE_FORMUE, "formue", lambda: fetch_teamtailor("https://career.formue.no/jobs.json", "formue")),
        (ENABLE_NBIM, "nbim", scrape_nbim),
        (ENABLE_STOREBRAND, "storebrand", lambda: fetch_workday(
            "https://storebrand.wd3.myworkdayjobs.com/wday/cxs/storebrand/Storebrand_Careers/jobs",
            "https://storebrand.wd3.myworkdayjobs.com/en-US/Storebrand_Careers",
            "storebrand")),
        (ENABLE_ARCTIC, "arctic", scrape_arctic),
        (ENABLE_PARETO, "pareto", lambda: fetch_teamtailor(
            "https://paretosecurities.teamtailor.com/jobs.json", "pareto")),
        (ENABLE_KLP, "klp", lambda: fetch_successfactors("https://jobb.klp.no/sitemal.xml", "klp")),
        (ENABLE_SEB, "seb", lambda: fetch_lever(
            "https://api.eu.lever.co/v0/postings/seb?mode=json", "seb", "SEB")),
        (ENABLE_DANSKE, "danske", lambda: fetch_oracle_hcm(
            "https://ejqi.fa.ocs.oraclecloud.eu/hcmRestApi/resources/latest",
            "https://ejqi.fa.ocs.oraclecloud.eu/hcmUI/CandidateExperience/en/sites/CX_1001",
            "CX_1001", "danske", "Danske Bank")),
        (ENABLE_GARANTUM, "garantum", lambda: fetch_teamtailor(
            "https://karriar.garantum.se/jobs.json", "garantum")),
    ):
        if not enabled:
            continue
        print(f"Henter {label}…")
        try:
            found = fn()
            kept, new = ingest(found, label, True)
            record(label, len(found), kept, new)
            print(f"  {label}: {len(found)} kandidater, {kept} etter keep, {new} nye etter dedup")
        except Exception as e:
            print(f"  {label}: FEILET ({type(e).__name__}: {e}) — hopper over", file=sys.stderr)

    # Cross-source fingerprint-dedup (selskap+tittel+by): behold høyest-preferanse
    # kilde innen kjøringen, dropp mot NYLIGE/AKTIVE i payload (repost-vern —
    # se recent_fingerprints). Muter aldri eksisterende.
    existing_fps = recent_fingerprints(payload.get("jobs", []), now_utc)
    all_scraped.sort(key=lambda j: SOURCE_PREF.get(j.get("source"), 9))
    deduped, seen_fps = [], set()
    for j in all_scraped:
        fp = fingerprint(j)
        if fp in existing_fps or fp in seen_fps:
            continue
        seen_fps.add(fp)
        deduped.append(j)
    if len(deduped) != len(all_scraped):
        print(f"Cross-source dedup: fjernet {len(all_scraped) - len(deduped)} duplikater (selskap+tittel+by)")
    all_scraped = deduped

    print(f"Nye unike jobber totalt: {len(all_scraped)}")

    all_queries = QUERIES + DK_QUERIES
    now_iso = now_utc.isoformat()

    new_jobs = []
    for j in all_scraped:
        j["seniority"] = detect_seniority(j["role"])
        sc = score_job(j)
        new_jobs.append({
            "id": sha1_job_id(j["url"]),
            "source": j["source"],
            "company": j["company"],
            "role": j["role"],
            "url": j["url"],
            "location": j["location"],
            "seniority": j["seniority"],
            "description": "",
            "deadline": j.get("deadline"),
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

    # ── Clobber-guard: scrapingen tar 5–10 min, og nettleseren kan ha pushet
    # statuser/notater/notatbok i mellomtiden. Re-fetch + re-dekrypter fersk
    # payload rett før push, re-dedup de nye jobbene mot den (URL + fingerprint,
    # samme regler som over) og graft dem på den ferske payloaden — så ferske
    # brukerdata aldri overskrives av den stale kopien lest ved start. ──
    print("Re-fetching Gist før push (clobber-guard)…")
    fresh_blob = gist_get(pat, gist_id)
    fresh_payload = decrypt_blob(password, fresh_blob)
    # updatedAt bumper ved hver skriving — enhver endring betyr ekstern push under scrapingen.
    remote_changed = fresh_payload.get("updatedAt") != start_updated_at
    if remote_changed:
        print(f"  Gist endret under scraping (updatedAt {start_updated_at!r} → "
              f"{fresh_payload.get('updatedAt')!r}) — grafter på fersk payload")
    fresh_urls = {normalize_url(j.get("url", "")) for j in fresh_payload.get("jobs", [])}
    # Samme repost-vern som hoved-dedupen: fingerprints kun mot nylige/aktive.
    fresh_fps = recent_fingerprints(fresh_payload.get("jobs", []), now_utc)
    pre_guard = len(new_jobs)
    new_jobs = [j for j in new_jobs
                if normalize_url(j.get("url", "")) not in fresh_urls
                and fingerprint(j) not in fresh_fps]
    if len(new_jobs) != pre_guard:
        print(f"  Clobber-guard dedup: fjernet {pre_guard - len(new_jobs)} duplikater mot fersk payload")
    payload = fresh_payload
    if new_nav_cursor is not None:
        payload.setdefault("sourceCursors", {})["nav"] = new_nav_cursor

    # Telemetri: 'new' settes om til FINALE tall (etter fingerprint-dedup og
    # clobber-guard) så sources-feltet aldri lyver om hva som faktisk kom inn.
    for st in scrape_stats.values():
        st["new"] = 0
    for j in new_jobs:
        if j["source"] in scrape_stats:
            scrape_stats[j["source"]]["new"] += 1

    # sourceHealth: consecutiveZeroFound = kjøringer på rad med found==0 (en
    # kilde som kastet exception står på 0 found og teller). lastOkAt = siste
    # kjøring med found > 0. Kun aktiverte kilder vedlikeholdes — deaktiverte
    # faller ut (portalen null-guarder).
    source_health = {}
    for src, st in scrape_stats.items():
        prev = prev_health.get(src) or {}
        if st["found"] > 0:
            source_health[src] = {"consecutiveZeroFound": 0, "lastOkAt": now_iso}
        else:
            source_health[src] = {
                "consecutiveZeroFound": int(prev.get("consecutiveZeroFound") or 0) + 1,
                "lastOkAt": prev.get("lastOkAt"),
            }

    def health_alarm(pushed):
        """Fail-loud ETTER push — alarmen skal aldri koste payload-data.
        ::warning:: per kilde med 0 funnet i dag (synlig i run-oversikten);
        exit 1 når terskelen er nådd → GitHub sender failure-mail gratis."""
        for src in sorted(scrape_stats):
            if scrape_stats[src]["found"] == 0:
                print(f"::warning::{src}: 0 kandidater funnet "
                      f"({source_health[src]['consecutiveZeroFound']} kjøringer på rad)")
        alarms = [
            f"{src}: 0 funnet {source_health[src]['consecutiveZeroFound']} kjøringer på rad "
            f"(terskel {FAIL_LOUD_AFTER.get(src, FAIL_LOUD_DEFAULT)})"
            for src in sorted(scrape_stats)
            if source_health[src]["consecutiveZeroFound"] >= FAIL_LOUD_AFTER.get(src, FAIL_LOUD_DEFAULT)
        ]
        if alarms:
            print(f"KILDE-ALARM ({'payload pushet' if pushed else 'payload IKKE pushet'}): "
                  + "; ".join(alarms), file=sys.stderr)
            sys.exit(1)

    if not new_jobs:
        if remote_changed:
            print("0 nye jobber og Gist endret eksternt under scraping — hopper over push")
            health_alarm(pushed=False)
            return
        payload["lastScrape"] = {"at": now_iso, "count": 0, "queries": all_queries,
                                 "sources": scrape_stats}
        payload["sourceHealth"] = source_health
        payload["updatedAt"] = now_iso  # defensiv: bump så cross-device bootstrap adopterer lastScrape også når 0 nye jobber
        new_blob = encrypt_payload(password, payload)
        gist_patch(pat, gist_id, new_blob)
        print("Pushed lastScrape-update (0 nye jobber)")
        health_alarm(pushed=True)
        return

    payload["jobs"] = new_jobs + payload.get("jobs", [])
    payload["updatedAt"] = now_iso
    payload["lastScrape"] = {"at": now_iso, "count": len(new_jobs), "queries": all_queries,
                             "sources": scrape_stats}
    payload["sourceHealth"] = source_health

    print("Encrypting and pushing…")
    new_blob = encrypt_payload(password, payload)
    gist_patch(pat, gist_id, new_blob)
    print(f"✓ Pushed {len(new_jobs)} new jobs to Gist")
    health_alarm(pushed=True)


if __name__ == "__main__":
    try:
        main()
    except KeyError as e:
        print(f"FATAL: missing env var {e}", file=sys.stderr)
        sys.exit(2)
    except Exception as e:
        print(f"FATAL: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
