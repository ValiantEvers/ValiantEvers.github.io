#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Baker forsidens norske tekst (T.no i index.html) statisk inn i samme fil.

Uten dette var 41 av 97 data-i-elementer tomme i raa HTML (hero-undertittel,
om meg, prosjektbeskrivelser, masteroppgaven, funfacts, kontakt ...), saa
crawlere, AI-screenere, lenkeforhaandsvisninger og lesere uten JS saa nesten
ingenting (1247 tegn broedtekst). setLang('no') kjoerer ved load og setter
el.innerHTML = T.no[noekkel] paa hvert [data-i] og content paa hvert
[data-i-content], saa dette er ren progressiv forsterkning: statisk innhold =
det JS-en uansett skriver, samme kilde (T.no), null drift. Soesterskript til
build_projects_static.py.

T evalueres med node (som i check_parity.py), ikke med regex, saa escapes i
strengene blir riktige. Et element hoppes over (med melding) naar baken ikke
er trygg: nestet data-i, verdi med annet enn balansert inline-markup (raa HTML
parses i dokumentet, ikke som et isolert innerHTML-fragment), eller noe som
ligner e-post/telefon (de skal bare JS-rendres, se CLAUDE.md).
Kjoeres av .github/workflows/update-index-static.yml ved push av index.html.
Kun stdlib + node. Idempotent: andre kjoering gir "ingen endring".

  python scripts/build_index_static.py           # bak inn
  python scripts/build_index_static.py --check   # skriv ingenting, exit 1 ved drift
"""
import argparse, html, json, re, subprocess, sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
T_START, T_END = "var T={no:", "\n};"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
        "source", "track", "wbr"}
INLINE_OK = {"a", "abbr", "b", "br", "code", "em", "i", "small", "span", "strong", "sub", "sup"}
PRIVATE = re.compile(r"@|mailto:|tel:|\d[\d ]{6,}\d")

def t_no(src):
    i = src.find(T_START)
    j = src.find(T_END, i)
    if i == -1 or j == -1:
        sys.exit(f"FEIL: fant ikke {T_START!r} ... {T_END!r} i index.html")
    # Via stdin, ikke `node -e`: ordboken er for lang for Windows-kommandolinjen.
    r = subprocess.run(["node"], input=src[i:j + len(T_END)] +
                       "\nprocess.stdout.write(JSON.stringify(T.no));",
                       capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        sys.exit("FEIL: node-evaluering av T feilet: " + r.stderr.strip())
    return json.loads(r.stdout)

def inline_only(val, host):
    # Bare tekst + balansert inline-markup kan bakes raatt uten aa endre DOM-en rundt.
    if "<!--" in val:
        return False
    stack = []
    for m in re.finditer(r"<(/?)([a-zA-Z][a-zA-Z0-9]*)[^>]*>", val):
        tag = m.group(2).lower()
        if tag not in INLINE_OK or (tag == "a" and host in ("a", "button")):
            return False
        if tag in VOID:
            continue
        if not m.group(1):
            stack.append(tag)
        elif not stack or stack.pop() != tag:
            return False
    return not stack

class Spans(HTMLParser):
    """Tegnposisjoner for innholdet i hvert [data-i] og start-taggen til hvert
    [data-i-content]. HTMLParser hopper selv over script/style/kommentarer."""
    def __init__(self, src):
        super().__init__(convert_charrefs=False)
        self.line0 = [0] + [m.end() for m in re.finditer("\n", src)]
        self.open, self.inner, self.metas = {}, [], []
        self.feed(src)
        self.close()

    def _pos(self):
        line, col = self.getpos()
        return self.line0[line - 1] + col

    def handle_startendtag(self, tag, attrs):
        a = dict(attrs)
        if "data-i-content" in a:
            s = self._pos()
            self.metas.append((a["data-i-content"], s, s + len(self.get_starttag_text())))

    def handle_starttag(self, tag, attrs):
        self.handle_startendtag(tag, attrs)
        if tag not in VOID:
            end = self._pos() + len(self.get_starttag_text())
            self.open.setdefault(tag, []).append((dict(attrs).get("data-i"), end))

    def handle_endtag(self, tag):
        if self.open.get(tag):
            key, s = self.open[tag].pop()
            if key is not None:
                self.inner.append((key, tag, s, self._pos()))

def bake(src, tno):
    p = Spans(src)
    edits, skipped = [], []
    for key, tag, s, e in p.inner:
        val = tno.get(key)
        why = ("mangler i T.no" if val is None
               else "nestet data-i" if re.search(r"\sdata-i\s*=", src[s:e])
               else "ikke ren inline-markup" if not inline_only(val, tag)
               else "ligner e-post/telefon" if PRIVATE.search(val) else None)
        if why:
            skipped.append(f"{key} ({why})")
        elif src[s:e] != val:
            edits.append((s, e, val, key))
    for key, s, e in p.metas:
        val = tno.get(key)
        m = re.search(r'\scontent\s*=\s*"([^"]*)"', src[s:e])
        why = ("mangler i T.no" if val is None else "mangler content=\"...\"" if not m
               else "ligner e-post/telefon" if PRIVATE.search(val) else None)
        if why:
            skipped.append(f"{key} ({why})")
        elif html.unescape(m.group(1)) != val:
            edits.append((s + m.start(1), s + m.end(1), html.escape(val, quote=True), key))
    out = src
    for s, e, val, _ in sorted(edits, reverse=True):
        out = out[:s] + val + out[e:]
    return out, sorted({k for *_, k in edits}), skipped, len(p.inner), len(p.metas)

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--check", action="store_true", help="bare sammenlign, skriv ingenting (exit 1 ved drift)")
    args = ap.parse_args()
    src = HTML.read_bytes().decode("utf-8")
    out, changed, skipped, n_el, n_meta = bake(src, t_no(src))
    for s in skipped:
        print("hoppet over:", s)
    print(f"data-i: {n_el} elementer, data-i-content: {n_meta}, hoppet over: {len(skipped)}")
    if out == src:
        print("ingen endring")
        return 0
    print(f"{'ute av synk' if args.check else 'bakt'}: {len(changed)} noekler ({', '.join(changed)})")
    if args.check:
        return 1
    HTML.write_bytes(out.encode("utf-8"))
    print("index.html oppdatert (statisk tekst bakt fra T.no)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
