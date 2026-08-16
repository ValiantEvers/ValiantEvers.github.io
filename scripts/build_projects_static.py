#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Baker statiske prosjektkort fra prosjekter/projects.json inn i
prosjekter/index.html, mellom <!--STATIC-CARDS--> og <!--/STATIC-CARDS--> i
hver kategori-seksjon. Uten dette er galleriet tomt for crawlere og
AI-screenere (kortene rendres ellers av fetch() i nettleseren). JS-en
overskriver innholdet ved load (grid.innerHTML=\'\'), saa dette er ren
progressiv forsterkning: samme kilde (projects.json), null drift.
Kjoeres av .github/workflows/update-projects-static.yml ved push av
projects.json. Kun stdlib. Deterministisk output (JSON-rekkefoelge).

Baker OGSAA <span class="sub-count"> per seksjon (2026-08-16). Den staar utenfor
markoerene og var en haandskrevet literal — den sa 9 mens 12 kort ble bakt.
"""
import json, re, sys
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "prosjekter" / "index.html"
DATA = ROOT / "prosjekter" / "projects.json"
START, END = "<!--STATIC-CARDS-->", "<!--/STATIC-CARDS-->"

def card(p):
    tags = " ".join(p.get("tags") or [])
    hay = escape((p.get("tittel", "") + " " + p.get("beskrivelse", "") + " " + tags).lower(), quote=True)
    return (
        '<a class="cert-link" href="%s" data-tags="%s" data-search="%s" data-weight="1">'
        '<div class="cert-card"><div class="cert-icon">%s</div><h3>%s</h3>'
        '<p class="cert-issuer">%s</p></div></a>'
    ) % (escape(p.get("url", ""), quote=True), escape(tags, quote=True), hay,
         escape(p.get("ikon", "")), escape(p.get("tittel", "")), escape(p.get("beskrivelse", "")))

def main():
    src = HTML.read_text(encoding="utf-8")
    data = [p for p in json.loads(DATA.read_text(encoding="utf-8")) if p.get("synlig") is True]
    out = src
    for m in re.finditer(r'<section[^>]*data-kategori="([^"]+)"', src):
        kat = m.group(1)
        in_kat = [p for p in data if p.get("kategori") == kat]
        cards = "\n".join(card(p) for p in in_kat)

        # Sub-telleren staar i <div class="sub-header">, altsaa UTENFOR markoerene, og var
        # derfor en haandskrevet literal som raatnet i stillhet: den sa 9 mens 12 kort ble
        # bakt (satt i 793da5f 09.07, tre nye verktoey lagt til siden). JS-en overskriver
        # den ved load, saa feilen var usynlig i nettleseren og synlig for nettopp crawlerne
        # og AI-screenerne den statiske baken finnes for. Naa avledes den av samme filtrerte
        # liste som kortene, saa de to kan ikke lenger drifte fra hverandre.
        sec_ix = out.index(m.group(0))
        head_end = out.index('<div class="certs-grid">', sec_ix)
        head, n_sub = re.subn(r'(<span class="sub-count">)\d+(</span>)',
                              r"\g<1>%d\g<2>" % len(in_kat), out[sec_ix:head_end])
        if n_sub != 1:
            print(f'FEIL: forventet noeyaktig EN sub-count i seksjonen "{kat}", fant {n_sub}',
                  file=sys.stderr)
            return 1
        out = out[:sec_ix] + head + out[head_end:]

        gi = out.index('<div class="certs-grid">', out.index(m.group(0)))
        gi_end = gi + len('<div class="certs-grid">')
        s_ix = out.find(START, gi_end)
        block = START + "\n" + cards + "\n" + END
        if s_ix != -1 and s_ix < out.index("</section>", gi_end):
            e_ix = out.index(END, s_ix) + len(END)
            out = out[:s_ix] + block + out[e_ix:]
        else:
            out = out[:gi_end] + "\n" + block + out[gi_end:]
    if out != src:
        HTML.write_text(out, encoding="utf-8", newline="")
        print("prosjekter/index.html oppdatert (statiske kort bakt)")
    else:
        print("ingen endring")
    n = out.count("cert-link\" data") if False else len(re.findall(r'STATIC-CARDS', out))
    print("markoerpar:", n // 2)

if __name__ == "__main__":
    sys.exit(main())
