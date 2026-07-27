"""
Daily deadline reminder. Decrypts Gist, finds jobs with deadline
≤ 5 days away — status "new", plus starred jobs in any status except
applied/rejected/removed — and sends email summary to GMAIL_USER.
Also nudges about stale applications («Purr på disse»): jobs/apps with
status "applied" untouched for > 14 days.
Idempotent: no state stored, just queries current payload — «daglig
briefing»-filosofien (mai 2026) står: samme innslag gjentas til status
endres, bevisst ingen per-jobb sendt-tracking.
"""

import os, json, sys, base64, html
from datetime import datetime, timezone, date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import smtplib
import requests
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

USER_AGENT = "ValiantEvers-strategi-reminder/1.0"
GIST_API = "https://api.github.com"
REMINDER_WINDOW_DAYS = 5
FOLLOWUP_AFTER_DAYS = 14
STRATEGI_URL = "https://evers.no/strategi.html"

# Kilde-helse (juli 2026): speiler FAIL_LOUD_AFTER i fetch_jobs.py (kun visning).
# Leser lastScrape/sourceHealth fra payloaden og legger én ⚠-linje øverst i
# mailen når noe er rødt. Null-guardet — eldre payloads mangler feltene.
HEALTH_RED_AFTER = {"finn": 1, "nordea": 2, "dnb": 2}
HEALTH_DEFAULT_AFTER = 5
STALE_SCRAPE_HOURS = 48


def health_warnings(payload):
    """⚠-linjer når scrape-helsa er rød: stale lastScrape (>48 t) eller kilder
    over fail-loud-terskelen. Tom liste = alt friskt."""
    warns = []
    at = (payload.get("lastScrape") or {}).get("at")
    if at:
        try:
            dt = datetime.fromisoformat(str(at).replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            age_h = (datetime.now(timezone.utc) - dt).total_seconds() / 3600
            if age_h > STALE_SCRAPE_HOURS:
                warns.append(f"siste scrape er {age_h / 24:.1f} døgn gammel")
        except ValueError:
            pass
    for src, h in sorted((payload.get("sourceHealth") or {}).items()):
        cz = int(h.get("consecutiveZeroFound") or 0)
        if cz >= HEALTH_RED_AFTER.get(src, HEALTH_DEFAULT_AFTER):
            warns.append(f"{src}: 0 funnet {cz} kjøringer på rad")
    return warns


# Crypto + Gist — duplicate of fetch_jobs.py (KEEP IN SYNC)
def derive_key(password, salt):
    kdf = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32,
                     salt=salt, iterations=250000)
    return kdf.derive(password.encode("utf-8"))


def decrypt_blob(password, blob):
    salt = base64.b64decode(blob["salt"])
    iv = base64.b64decode(blob["iv"])
    ct = base64.b64decode(blob["ct"])
    key = derive_key(password, salt)
    return json.loads(AESGCM(key).decrypt(iv, ct, None))


def gist_get(pat, gist_id):
    # timeout=30 som i de tre andre scriptene — uten den kan en hengende
    # connection blokkere til Actions' jobbtimeout.
    r = requests.get(f"{GIST_API}/gists/{gist_id}",
        headers={"Authorization": f"Bearer {pat}",
                 "Accept": "application/vnd.github+json",
                 "User-Agent": USER_AGENT},
        timeout=30)
    r.raise_for_status()
    data = r.json()
    file_obj = data["files"]["strategi.enc.json"]
    if file_obj.get("truncated"):
        raw = requests.get(file_obj["raw_url"], timeout=30)
        raw.raise_for_status()
        return json.loads(raw.text)
    return json.loads(file_obj["content"])


def parse_deadline(s):
    """Returnerer date-objekt eller None."""
    if not s: return None
    try:
        return datetime.fromisoformat(s.split("T")[0]).date()
    except Exception:
        return None


# Starred-utvidelse (juli 2026): en stjernemerket jobb skal ikke falle ut av
# varslingen i det øyeblikket den er sett (status "seen") — jf. SEB PWM-
# internshipet (frist 31.07). applied/rejected/removed er ferdigbehandlet.
STARRED_EXCLUDED_STATUSES = {"applied", "rejected", "removed"}


def find_urgent_jobs(payload):
    """Filtrerer ut jobber med deadline innen REMINDER_WINDOW_DAYS dager:
    status='new', ELLER starred med status utenfor STARRED_EXCLUDED_STATUSES.
    Sortert deadline asc."""
    today = date.today()
    results = []
    for j in payload.get("jobs", []):
        status = j.get("status") or "new"
        starred_ok = j.get("starred") and status not in STARRED_EXCLUDED_STATUSES
        if status != "new" and not starred_ok:
            continue
        if j.get("probablyDown"):
            continue  # trolig nedtatt (fetch_jobs' feed-fravær-flagg) — ikke mas om døde annonser
        dl = parse_deadline(j.get("deadline"))
        if dl is None:
            continue
        days_left = (dl - today).days
        if days_left < 0:
            continue  # passed
        if days_left > REMINDER_WINDOW_DAYS:
            continue
        results.append({
            "job": j,
            "deadline": dl,
            "days_left": days_left
        })
    results.sort(key=lambda x: (x["deadline"], -x["job"].get("score", 0)))
    return results


def parse_ts(s):
    """Tolerant ISO-timestamp → date (None ved manglende/ugyldig verdi)."""
    if not s:
        return None
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _dedup_key(company, role, url):
    """Nøkkel for kryss-dedup jobb↔søknad. URL når den finnes (normalisert),
    ellers firma+rolle. Den tilsiktede arbeidsflyten PRODUSERER begge postene
    (addApp lager en apps-rad for en jobb som alt står som applied), så uten
    dette ga samme søknad to identiske linjer i «Purr på disse»."""
    u = (url or "").split("?")[0].split("#")[0].rstrip("/").lower()
    if u:
        return "u:" + u
    return "cr:" + (company or "").strip().lower() + "|" + (role or "").strip().lower()


def find_followups(payload):
    """«Purr på disse» (juli 2026): jobber og apps med status='applied' der
    siste bevegelse (statusUpdated/updated, fallback added/created) er eldre
    enn FOLLOWUP_AFTER_DAYS dager. probablyDown-jobber ekskluderes — nedtatte
    annonser skal ikke gi mail-støy. Jobs først, deretter apps; eldste øverst.
    Kryss-deduplisert på URL (fallback firma+rolle) — jobben vinner over
    apps-raden, siden den har scrape-metadata."""
    today = date.today()
    out = []
    seen = set()
    for j in payload.get("jobs", []):
        if (j.get("status") or "new") != "applied" or j.get("probablyDown"):
            continue
        moved = parse_ts(j.get("statusUpdated")) or parse_ts(j.get("added"))
        if moved is None:
            continue
        days = (today - moved).days
        if days > FOLLOWUP_AFTER_DAYS:
            seen.add(_dedup_key(j.get("company"), j.get("role"), j.get("url")))
            out.append({"kind": "jobb", "company": j.get("company", "?"),
                        "role": j.get("role", "?"), "url": j.get("url", ""),
                        "days": days})
    jobs_part = sorted(out, key=lambda x: -x["days"])
    apps = []
    for a in payload.get("apps", []):
        if a.get("status") != "applied" or a.get("deleted"):
            continue
        key = _dedup_key(a.get("company"), a.get("role"), a.get("url"))
        if key in seen:
            continue          # samme søknad står alt som jobb — ikke purr dobbelt
        seen.add(key)
        moved = parse_ts(a.get("updated")) or parse_ts(a.get("created"))
        if moved is None:
            continue
        days = (today - moved).days
        if days > FOLLOWUP_AFTER_DAYS:
            apps.append({"kind": "søknad", "company": a.get("company", "?"),
                         "role": a.get("role", "?"), "url": a.get("url", ""),
                         "days": days})
    return jobs_part + sorted(apps, key=lambda x: -x["days"])


# ── Outreach (2026-07-27) ────────────────────────────────────────────────────
# payload["outreach"] ble ikke lest av dette scriptet i det hele tatt, selv om
# Valiants egen strategitekst kaller nettverkssporet hovedsporet. Statusene
# finnes alt (planned/sent/replied/meeting/done/no_reply) — de aggregeres bare
# aldri. Idempotent på samme måte som resten: ingen state lagres, samme innslag
# gjentas til feltene endres.
OUTREACH_DONE_STATUSES = {"done", "no_reply"}


def find_outreach_due(payload):
    """Kontakter med et forfalt eller nært forestående «neste steg»
    (nextDate ≤ i dag + REMINDER_WINDOW_DAYS). Forfalte først."""
    today = date.today()
    out = []
    for o in payload.get("outreach", []):
        if o.get("deleted") or o.get("status") in OUTREACH_DONE_STATUSES:
            continue
        nd = parse_deadline(o.get("nextDate"))
        if nd is None:
            continue
        days_left = (nd - today).days
        if days_left > REMINDER_WINDOW_DAYS:
            continue
        out.append({"o": o, "date": nd, "days_left": days_left,
                    "action": o.get("nextAction") or "følg opp"})
    out.sort(key=lambda x: x["date"])
    return out


def find_outreach_stale(payload):
    """Kontakter i status 'sent' uten bevegelse i mer enn FOLLOWUP_AFTER_DAYS
    dager. lastContact settes av setOutStatus når status blir sent/replied/
    meeting; updated/created er fallback for eldre poster."""
    today = date.today()
    out = []
    for o in payload.get("outreach", []):
        if o.get("deleted") or o.get("status") != "sent":
            continue
        if parse_deadline(o.get("nextDate")):
            continue          # har et konkret neste steg → dekkes av find_outreach_due
        moved = (parse_ts(o.get("lastContact")) or parse_ts(o.get("updated"))
                 or parse_ts(o.get("created")))
        if moved is None:
            continue
        days = (today - moved).days
        if days > FOLLOWUP_AFTER_DAYS:
            out.append({"o": o, "days": days})
    out.sort(key=lambda x: -x["days"])
    return out


def find_watch_changes(payload):
    """Boutique-vaktens funn fra siste scrape: [{name, url}] når en overvåket
    karriereside endret seg (fetch_jobs skriver lastScrape.watchChanged; feltet
    overskrives hver kjøring → selvutløpende, ingen state her). Null-guardet."""
    return (payload.get("lastScrape") or {}).get("watchChanged") or []


def esc(s):
    """HTML-escape (attributt-trygg: escaper òg " og ') for trygg
    interpolering av jobbfelt i HTML-e-posten."""
    return html.escape(str(s), quote=True)


def build_email_body(urgent, warnings=None, followups=None, watch=None,
                     out_due=None, out_stale=None):
    """Returnerer (plain_text, html) tuple. warnings = ⚠-linjer fra
    health_warnings() som legges øverst når scrape-helsa er rød;
    followups = purre-linjer fra find_followups(); watch = endrede
    karrieresider fra find_watch_changes(); out_due/out_stale = outreach fra
    find_outreach_due()/find_outreach_stale() (nettverkssporet)."""
    count = len(urgent)
    plain_lines = []
    if warnings:
        plain_lines.extend(["⚠ Kilde-helse: " + "; ".join(warnings), ""])
    if watch:
        for w in watch:
            plain_lines.append(f"🔎 Karriereside endret: {w.get('name', '?')} — "
                               f"sjekk manuelt: {w.get('url', '')}")
        plain_lines.append("")
    if urgent:
        plain_lines.extend([
            f"{count} {'jobb' if count == 1 else 'jobber'} med "
            f"søknadsfrist innen {REMINDER_WINDOW_DAYS} dager.",
            ""
        ])
    html_items = []

    for i, item in enumerate(urgent, 1):
        j = item["job"]
        dl_str = item["deadline"].strftime("%d.%m.%Y")
        days = item["days_left"]
        days_label = (
            "i dag" if days == 0 else
            "i morgen" if days == 1 else
            f"{days} dager"
        )
        score = j.get("score", 0)
        star = "★ " if j.get("starred") else ""

        plain_lines.extend([
            f"{i}. {star}{j.get('role', '?')} — {j.get('company', '?')}",
            f"   Frist: {dl_str} ({days_label})",
            f"   Score: {score} · {j.get('location', '')}",
            f"   {j.get('url', '')}",
            ""
        ])

        role_e = esc(j.get("role", "?"))
        company_e = esc(j.get("company", "?"))
        location_e = esc(j.get("location", ""))
        url_e = esc(j.get("url", "#"))

        html_items.append(f"""
          <li style="margin-bottom: 14px;">
            <div style="font-weight: 600;">
              {star}<a href="{url_e}" style="color: #0070ed; text-decoration: none;">
                {role_e}
              </a>
            </div>
            <div style="color: #555; font-size: 0.9em;">
              {company_e} · {location_e} · score {score}
            </div>
            <div style="color: #d4a017; font-size: 0.9em; margin-top: 2px;">
              Frist: {dl_str} ({days_label})
            </div>
          </li>
        """)

    # «Purr på disse» — søkt for >FOLLOWUP_AFTER_DAYS dager siden uten bevegelse
    followup_html = ""
    if followups:
        plain_lines.extend([
            f"Purr på disse ({len(followups)} søkt for >{FOLLOWUP_AFTER_DAYS} "
            f"dager siden uten bevegelse):",
            ""
        ])
        fu_items = []
        for f in followups:
            plain_lines.extend([
                f"• {f['role']} — {f['company']} ({f['days']} dager siden søknad, {f['kind']})",
                f"  {f['url']}" if f["url"] else "  (ingen lenke)",
                ""
            ])
            link = (f'<a href="{esc(f["url"])}" style="color: #0070ed; text-decoration: none;">'
                    f'{esc(f["role"])}</a>') if f["url"] else esc(f["role"])
            fu_items.append(
                f'<li style="margin-bottom: 10px;">'
                f'<div style="font-weight: 600;">{link}</div>'
                f'<div style="color: #555; font-size: 0.9em;">'
                f'{esc(f["company"])} · {f["days"]} dager siden søknad ({f["kind"]})</div>'
                f'</li>'
            )
        followup_html = (
            '<h2 style="font-weight: 500; margin: 24px 0 12px;">'
            f'Purr på disse ({len(followups)})</h2>'
            '<p style="color: #888; font-size: 0.85em; margin: 0 0 12px;">'
            f'Søkt for over {FOLLOWUP_AFTER_DAYS} dager siden uten registrert bevegelse.</p>'
            '<ul style="padding-left: 20px; margin: 0; list-style: none;">'
            + "".join(fu_items) + "</ul>"
        )

    # ── Outreach: neste steg forfalt/nært, og kontakter som er blitt stille ──
    # Dette er sporet Valiants strategi kaller hovedsporet. Det er også det
    # eneste innslaget i mailen som setter et NAVN foran ham om morgenen.
    outreach_html = ""
    out_due = out_due or []
    out_stale = out_stale or []
    if out_due or out_stale:
        oi = []
        if out_due:
            plain_lines.append(f"Outreach — neste steg ({len(out_due)}):")
            for d in out_due:
                o = d["o"]
                when = ("FORFALT " + d["date"].strftime("%d.%m")
                        if d["days_left"] < 0 else
                        "i dag" if d["days_left"] == 0 else
                        "i morgen" if d["days_left"] == 1 else
                        d["date"].strftime("%d.%m"))
                who = f"{o.get('name', '?')} ({o.get('company', '?')})"
                chan = o.get("email") or o.get("phone") or o.get("linkedin") or ""
                plain_lines.append(f"• {who} — {d['action']} — {when}"
                                   + (f" — {chan}" if chan else ""))
                col = "#c0392b" if d["days_left"] < 0 else "#d4a017"
                chan_html = ""
                if o.get("email"):
                    chan_html = (f'<a href="mailto:{esc(o["email"])}" '
                                 f'style="color:#0070ed;text-decoration:none">'
                                 f'{esc(o["email"])}</a>')
                elif o.get("phone"):
                    chan_html = esc(o["phone"])
                elif o.get("linkedin"):
                    chan_html = (f'<a href="{esc(o["linkedin"])}" '
                                 f'style="color:#0070ed;text-decoration:none">LinkedIn</a>')
                oi.append(
                    f'<li style="margin-bottom:10px;">'
                    f'<div style="font-weight:600;">{esc(o.get("name", "?"))}'
                    f'<span style="color:#555;font-weight:400;"> — '
                    f'{esc(o.get("title") or "")}{" · " if o.get("title") else ""}'
                    f'{esc(o.get("company", "?"))}</span></div>'
                    f'<div style="color:{col};font-size:0.9em;margin-top:2px;">'
                    f'{esc(d["action"])} — {esc(when)}</div>'
                    + (f'<div style="font-size:0.9em;">{chan_html}</div>' if chan_html else "")
                    + f'</li>'
                )
            plain_lines.append("")
        if out_stale:
            plain_lines.append(f"Outreach — stille etter sendt ({len(out_stale)}):")
            for s in out_stale:
                o = s["o"]
                plain_lines.append(f"• {o.get('name', '?')} ({o.get('company', '?')}) "
                                   f"— {s['days']} dager siden kontakt")
                oi.append(
                    f'<li style="margin-bottom:10px;">'
                    f'<div style="font-weight:600;">{esc(o.get("name", "?"))}'
                    f'<span style="color:#555;font-weight:400;"> — '
                    f'{esc(o.get("company", "?"))}</span></div>'
                    f'<div style="color:#555;font-size:0.9em;">'
                    f'{s["days"]} dager siden kontakt, ingen svar registrert</div></li>'
                )
            plain_lines.append("")
        outreach_html = (
            '<h2 style="font-weight: 500; margin: 24px 0 12px;">'
            f'Outreach ({len(out_due) + len(out_stale)})</h2>'
            '<p style="color: #888; font-size: 0.85em; margin: 0 0 12px;">'
            'Nettverkssporet — forfalte neste steg og kontakter som er blitt stille.</p>'
            '<ul style="padding-left: 20px; margin: 0; list-style: none;">'
            + "".join(oi) + "</ul>"
        )

    plain_lines.extend([
        "—",
        f"Åpne strategi.html for å oppdatere status: {STRATEGI_URL}"
    ])
    plain = "\n".join(plain_lines)

    warn_html = ""
    if warnings:
        warn_html = (
            '<div style="background: #fdf3d7; border: 1px solid #e5c55a; '
            'border-radius: 6px; padding: 10px 12px; margin: 0 0 16px; '
            'color: #7a5d00; font-size: 0.9em;">⚠ Kilde-helse: '
            + esc("; ".join(warnings)) + "</div>"
        )

    watch_html = ""
    if watch:
        watch_html = (
            '<div style="background: #eef4fd; border: 1px solid #a9c7ee; '
            'border-radius: 6px; padding: 10px 12px; margin: 0 0 16px; '
            'color: #1d4e89; font-size: 0.9em;">🔎 Karriereside endret — sjekk manuelt:<br>'
            + "<br>".join(
                f'<a href="{esc(w.get("url", "#"))}" style="color: #0070ed;">'
                f'{esc(w.get("name", "?"))}</a>' for w in watch)
            + "</div>"
        )

    urgent_html = ""
    if urgent:
        urgent_html = (
            '<h2 style="font-weight: 500; margin: 0 0 16px;">'
            f"{count} {'jobb' if count == 1 else 'jobber'} med søknadsfrist innen {REMINDER_WINDOW_DAYS} dager"
            '</h2>'
            '<ol style="padding-left: 20px; margin: 0;">'
            + "".join(html_items) + "</ol>"
        )

    html = f"""
    <html><body style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0; padding: 20px; color: #1a1a1a;">
      {warn_html}
      {watch_html}
      {urgent_html}
      {outreach_html}
      {followup_html}
      <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
      <p style="color: #888; font-size: 0.85em;">
        <a href="{STRATEGI_URL}" style="color: #0070ed;">Åpne strategi.html for å oppdatere status</a>
      </p>
    </body></html>
    """
    return plain, html


def send_email(subject, plain, html):
    gmail_user = os.environ["GMAIL_USER"]
    gmail_pass = os.environ["GMAIL_PASS"]

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = gmail_user
    msg["To"] = gmail_user  # sende til seg selv
    msg.attach(MIMEText(plain, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(gmail_user, gmail_pass)
        server.send_message(msg)


def main():
    password = os.environ["STRATEGI_PASSWORD"].strip()
    pat = os.environ["GIST_PAT"]
    gist_id = os.environ["GIST_ID"]

    print(f"[{datetime.now(timezone.utc).isoformat()}] Reminder check")

    blob = gist_get(pat, gist_id)
    payload = decrypt_blob(password, blob)
    urgent = find_urgent_jobs(payload)
    followups = find_followups(payload)
    watch = find_watch_changes(payload)
    warnings = health_warnings(payload)
    out_due = find_outreach_due(payload)
    out_stale = find_outreach_stale(payload)

    print(f"Total jobs: {len(payload.get('jobs', []))}")
    print(f"Urgent (new/starred + deadline ≤ {REMINDER_WINDOW_DAYS} days): {len(urgent)}")
    print(f"Purre-kandidater (applied > {FOLLOWUP_AFTER_DAYS} dager): {len(followups)}")
    print(f"Karrieresider endret (boutique-vakt): {len(watch)}")
    print(f"Outreach med neste steg innen {REMINDER_WINDOW_DAYS} dager: {len(out_due)}")
    print(f"Outreach stille etter sendt (> {FOLLOWUP_AFTER_DAYS} dager): {len(out_stale)}")
    for w in warnings:
        print(f"⚠ Kilde-helse: {w}")

    if not urgent and not followups and not watch and not out_due and not out_stale:
        print("Ingen e-post sendt — ingenting matcher kriteriene")
        return

    count = len(urgent)
    parts = []
    if urgent:
        parts.append(f"{count} {'jobb' if count == 1 else 'jobber'} med frist innen {REMINDER_WINDOW_DAYS} dager")
    if out_due:
        parts.append(f"{len(out_due)} outreach forfaller")
    if followups:
        parts.append(f"{len(followups)} å purre på")
    if out_stale:
        parts.append(f"{len(out_stale)} stille kontakt{'er' if len(out_stale) != 1 else ''}")
    if watch:
        parts.append(f"{len(watch)} karriereside{'r' if len(watch) != 1 else ''} endret")
    subject = " · ".join(parts)
    plain, html = build_email_body(urgent, warnings, followups, watch, out_due, out_stale)

    print(f"Sender e-post: {subject}")
    send_email(subject, plain, html)
    print("✓ E-post sendt")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"FATAL: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
