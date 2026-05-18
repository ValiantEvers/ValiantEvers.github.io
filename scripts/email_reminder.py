"""
Daily deadline reminder. Decrypts Gist, finds new jobs with
deadline ≤ 5 days away, sends email summary to GMAIL_USER.
Idempotent: no state stored, just queries current payload.
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
STRATEGI_URL = "https://evers.no/strategi.html"


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
    r = requests.get(f"{GIST_API}/gists/{gist_id}",
        headers={"Authorization": f"Bearer {pat}",
                 "Accept": "application/vnd.github+json",
                 "User-Agent": USER_AGENT})
    r.raise_for_status()
    data = r.json()
    file_obj = data["files"]["strategi.enc.json"]
    if file_obj.get("truncated"):
        raw = requests.get(file_obj["raw_url"])
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


def find_urgent_jobs(payload):
    """Filtrerer ut jobber med status='new' + deadline innen
    REMINDER_WINDOW_DAYS dager. Sortert deadline asc."""
    today = date.today()
    results = []
    for j in payload.get("jobs", []):
        if j.get("status") != "new":
            continue
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


def esc(s):
    """HTML-escape (attributt-trygg: escaper òg " og ') for trygg
    interpolering av jobbfelt i HTML-e-posten."""
    return html.escape(str(s), quote=True)


def build_email_body(urgent):
    """Returnerer (plain_text, html) tuple."""
    count = len(urgent)
    plain_lines = [
        f"{count} {'jobb' if count == 1 else 'jobber'} med "
        f"søknadsfrist innen {REMINDER_WINDOW_DAYS} dager.",
        ""
    ]
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

        plain_lines.extend([
            f"{i}. {j.get('role', '?')} — {j.get('company', '?')}",
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
              <a href="{url_e}" style="color: #0070ed; text-decoration: none;">
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

    plain_lines.extend([
        "—",
        f"Åpne strategi.html for å oppdatere status: {STRATEGI_URL}"
    ])
    plain = "\n".join(plain_lines)

    html = f"""
    <html><body style="font-family: -apple-system, system-ui, sans-serif; max-width: 600px; margin: 0; padding: 20px; color: #1a1a1a;">
      <h2 style="font-weight: 500; margin: 0 0 16px;">
        {count} {'jobb' if count == 1 else 'jobber'} med søknadsfrist innen {REMINDER_WINDOW_DAYS} dager
      </h2>
      <ol style="padding-left: 20px; margin: 0;">
        {''.join(html_items)}
      </ol>
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
    password = os.environ["STRATEGI_PASSWORD"]
    pat = os.environ["GIST_PAT"]
    gist_id = os.environ["GIST_ID"]

    print(f"[{datetime.now(timezone.utc).isoformat()}] Reminder check")

    blob = gist_get(pat, gist_id)
    payload = decrypt_blob(password, blob)
    urgent = find_urgent_jobs(payload)

    print(f"Total jobs: {len(payload.get('jobs', []))}")
    print(f"Urgent (new + deadline ≤ {REMINDER_WINDOW_DAYS} days): {len(urgent)}")

    if not urgent:
        print("Ingen e-post sendt — ingen jobber matcher kriteriene")
        return

    count = len(urgent)
    subject = f"{count} {'jobb' if count == 1 else 'jobber'} med frist innen {REMINDER_WINDOW_DAYS} dager"
    plain, html = build_email_body(urgent)

    print(f"Sender e-post: {subject}")
    send_email(subject, plain, html)
    print("✓ E-post sendt")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"FATAL: {type(e).__name__}: {e}", file=sys.stderr)
        sys.exit(1)
