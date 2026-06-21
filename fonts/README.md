# fonts/

Self-hosted web fonts for evers.no — **no third-party font calls** (no fonts.googleapis.com /
fonts.gstatic.com). Each page declares the families it uses via inline `@font-face` pointing at
these files. Latin families use Google's standard `latin` + `latin-ext` subsets (full coverage
for no/en/fr/de). Variable fonts ship one file per subset/style (covers all weights).

## Hovedsitens type-system (FT-emulering)

Den redaksjonelle «Inter-kjernen» — `index.html`, `cv.html`, `prosjekter/index.html`,
`prosjekter/finansielle-maler/index.html`, `prosjekter/forretningsenhet-dashboard/index.html`,
`rekrutterer/index.html` — deler ett type-system via `:root`-variabler
(`--font-serif` / `--font-sans` / `--font-mono`):

- **Serif (overskrifter):** `Newsreader` — fra `@fontsource-variable/newsreader@5.2.10`,
  `newsreader-latin[-ext]-standard-normal.woff2` (opsz + wght-akser; `font-optical-sizing:auto`
  på overskrifter).
- **Sans (brødtekst / UI):** `Hanken Grotesk` — fra `@fontsource-variable/hanken-grotesk@5.2.8`,
  `hanken-grotesk-latin[-ext]-wght-normal.woff2`.
- **Mono:** `JetBrains Mono` (uendret). **Japansk:** `Noto Sans JP` ligger i begge
  tekstvariablene (per-glyf-fallback) — så `html[lang="ja"]` trenger ingen egen regel.

Begge tekstvariabler faller videre til system-fonter. `Noto Sans JP`-fallbacken gjelder fortsatt
det innholds-subsettede subsetet under (regenererings-advarselen nedenfor gjelder uendret).

**Fjernet** (ikke lenger referert noe sted etter byttet): `InterVariable.woff2` (Inter),
`crimson-text-*.woff2` (rekrutterer brukte Crimson Text, nå Newsreader), og kandidat-serifen
`source-serif-4-*.woff2` (kun brukt av den nå slettede sammenligningssiden `font-lab.html`).
Medieval-easter-egget beholder en inert `'Inter'`-**navne**fallback i font-stacken (ingen
`@font-face` lastes for den lenger → faller til system-sans); easter-egget er ellers urørt.

## ⚠️ `noto-sans-jp-subset.woff2` is content-subsetted — regenerate if the Japanese UI text changes

`noto-sans-jp-subset.woff2` contains **only the glyphs used by the current Japanese (`ja`)
i18n strings** (≈565 kana/kanji/punctuation + basic Latin). It is used for Japanese UI text on
the pages whose font stack includes `Noto Sans JP` (currently: `index.html`, `cv.html`,
`prosjekter/index.html`, `prosjekter/forretningsenhet-dashboard/index.html`,
`prosjekter/finansielle-maler/index.html`, `leie-eller-eie/index.html`).

**If you add or change Japanese text in any `ja:` translation object, you MUST regenerate this
file** — otherwise the new characters render with the fallback font (tofu / □) silently.

### Regenerate

```bash
# 1) Re-extract the unique Japanese glyphs from the ja strings (kana/kanji/fullwidth ranges)
node -e '
const fs=require("fs");
const files=["index.html","cv.html","prosjekter/index.html",
  "prosjekter/forretningsenhet-dashboard/index.html",
  "prosjekter/finansielle-maler/index.html","leie-eller-eie/index.html"];
const set=new Set();
const jp=c=>(c>=0x3000&&c<=0x30FF)||(c>=0x3400&&c<=0x9FFF)||(c>=0xFF00&&c<=0xFFEF);
for(const f of files){const t=fs.readFileSync(f,"utf8");for(const ch of t)if(jp(ch.codePointAt(0)))set.add(ch);}
fs.writeFileSync("/tmp/jp-glyphs.txt",[...set].sort().join(""));
console.log("glyphs:",set.size);'

# 2) Download the full variable Noto Sans JP TTF (source) and subset it
python3 -m venv /tmp/nv && /tmp/nv/bin/pip -q install fonttools brotli
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/notosansjp/NotoSansJP%5Bwght%5D.ttf" -o /tmp/NotoSansJP-full.ttf
/tmp/nv/bin/pyftsubset /tmp/NotoSansJP-full.ttf \
  --text-file=/tmp/jp-glyphs.txt \
  --unicodes="U+0000-00FF,U+2000-206F,U+25A0-25FF,U+3000-303F" \
  --layout-features='*' --flavor=woff2 \
  --output-file=fonts/noto-sans-jp-subset.woff2
```

(Run from the repo root. The latin families need no regeneration — they carry Google's full
latin/latin-ext subsets.)
