#!/usr/bin/env python3
"""Oppdater <lastmod> i sitemap.xml fra git-historikken.

Kjøres av .github/workflows/update-sitemap.yml ved push til main (krever
full checkout: fetch-depth: 0). Hver URL i sitemapen er mappet til filene
som utgjør siden; lastmod settes til siste commit-dato (%cs) for disse.
URL-er uten mapping (osebx/, wc2026/ — egne prosjekt-repoer servert via
GitHub Pages-ruting) beholder eksisterende dato. Kun stdlib, ingen pip.
"""
import re
import subprocess
import sys

SITEMAP = "sitemap.xml"

# URL-sti -> pathspecs i DETTE repoet (None = eksternt repo, ikke rør)
URLMAP = {
    "/": ["index.html"],
    "/cv": ["cv.html"],
    "/rekrutterer/": ["rekrutterer"],
    "/prosjekter/": ["prosjekter/index.html", "prosjekter/projects.json", "prosjekter/screenshots"],
    "/prosjekter/masteroppgave/": ["prosjekter/masteroppgave"],
    "/prosjekter/efaktura-radar/": ["prosjekter/efaktura-radar"],
    "/formuessamtalen/": ["formuessamtalen"],
    "/pensjonskalkulator/": ["pensjonskalkulator"],
    "/leie-eller-eie/": ["leie-eller-eie"],
    "/personligokonomi/": ["personligokonomi"],
    "/aksjeskatt/": ["aksjeskatt"],
    "/klima/": ["klima"],
    "/osebx/": None,
    "/renteriket/": None,
    "/wc2026/": None,
    "/examprep/": ["examprep"],
    "/fra-null-til-investor/": ["fra-null-til-investor"],
    "/fra-null-til-investor2/": ["fra-null-til-investor2"],
    "/fra-null-til-investor3/": ["fra-null-til-investor3"],
    "/garmin/": ["garmin"],
}


def git_date(paths):
    out = subprocess.run(
        ["git", "log", "-1", "--format=%cs", "--"] + paths,
        capture_output=True, text=True, check=True,
    ).stdout.strip()
    return out or None


def main():
    src = open(SITEMAP, encoding="utf-8").read()
    changed = []

    def bump(m):
        loc, old = m.group("loc"), m.group("date")
        path = loc.replace("https://www.evers.no", "") or "/"
        spec = URLMAP.get(path)
        if spec is None:
            if path not in URLMAP:
                print(f"ADVARSEL: {path} mangler i URLMAP — beholder {old}")
            return m.group(0)
        new = git_date(spec)
        if not new or new == old:
            return m.group(0)
        changed.append(f"{path}: {old} -> {new}")
        return m.group(0).replace(f"<lastmod>{old}</lastmod>", f"<lastmod>{new}</lastmod>")

    dst = re.sub(
        r"<url><loc>(?P<loc>[^<]+)</loc><lastmod>(?P<date>[^<]+)</lastmod>",
        bump, src,
    )
    if changed:
        open(SITEMAP, "w", encoding="utf-8").write(dst)
        print("Oppdatert:")
        for c in changed:
            print("  " + c)
    else:
        print("Ingen lastmod-endringer.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
