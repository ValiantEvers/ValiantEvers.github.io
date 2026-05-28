# Healthcheck — evers.no — 2026-05-28

Autonomous sweep of the `ValiantEvers/ValiantEvers.github.io` repo. Nine parallel inspection tracks (Spor A–I), six commits of safe auto-fixes, and a punch list of findings that need your decision.

## 1. Sammendrag

Sidens generelle helse er **god**. Ingen kritiske bugs, ingen brutte interne struktur, alle 6 språkblokker i `index.html` og 5 i `cv.html` er konsistente, og null hard JS/HTML-syntaks-feil på tvers av 18 produksjonssider. De viktigste reelle problemene er (a) noen brutte eksterne lenker som er synlige for besøkende (Yahoo Finance live-bar i header), (b) manglende SEO-meta på de Vite-byggde SPA-sidene, og (c) 8.7 MB orphan-bilder som lå igjen i repoet. Punkt (b) og (c) er auto-fikset; (a) flagges fordi løsning krever skjønn (fjerne href eller velge alternativ destinasjon). Repo-størrelsen er nå 54 MB med 256 sporede filer.

## 2. Auto-fikset (6 commits)

| Commit | Beskrivelse |
|---|---|
| `2c513ec` | Add meta descriptions to garmin and FNTI 1/2/3 SPA pages |
| `87e3c2d` | Remove dead i18n keys: backHome (cv.html, 5×) + proj1DescDEPR (index medieval, 1×) |
| `a0a3071` | a11y: add aria-labels to form inputs and label/for association on quiz slider |
| `ececbeb` | Delete 15 orphan images (~8.7 MB): swords 1-3, prince-valiant references, travel backgrounds, prins-ride gif/mp4 variants |
| `8d5291e` | Add robots.txt and sitemap.xml (excluding strategi.html and jobs/ redirect) |
| `(denne)` | HEALTHCHECK-2026-05-28.md |

Alle pushet til `main` fortløpende; Pages-deploy fanger dem opp automatisk.

## 3. Funn som trenger din beslutning

### 🔴 Høy prioritet — synlig for besøkende

**A1. Yahoo Finance live-bar lenker er 404**
- `index.html:510` `href="https://finance.yahoo.com/quote/OSEBX.OL/"` → 404
- `index.html:511` `href="https://finance.yahoo.com/quote/EURNOK=X/"` → 404
- Live-bar-tallene oppdateres fortsatt (chart-API funker), men klikket lander på 404. Sannsynligvis Yahoos URL-struktur som har endret seg.
- Forslag: pek til `https://no.finance.yahoo.com/quote/...` (norsk variant), eller fjern `href`, eller pek til Oslo Børs-side for OSEBX / Norges Bank for EUR/NOK.

**A2. Brutt Yale/Coursera PDF-referanse**
- `index.html:564` og `cv.html:490`: `href="docs/Yale%20University%3ACoursera%20Sertifikat.pdf"`
- Filen finnes ikke i `docs/`. `:` i filnavn er heller ikke gyldig på NTFS.
- Forslag: enten last opp PDF-en med et sanitert filnavn (f.eks. `Yale_Coursera_Certificate.pdf`), eller fjern sertifikat-oppføringen.

**A3. `/osebx/` mangler i repo**
- `prosjekter/index.html:198` `href="/osebx/"` — katalogen finnes ikke i arbeidstreet.
- Per CLAUDE.md er den "mirrored from osebx repo". Verifiser at GH Pages serverer `evers.no/osebx/` faktisk fra noe (separat repo? GH Actions?). Hvis ikke deployes — død lenke i produksjon.

### 🟡 Middels prioritet — synlig men ikke kritisk

**B1. Manglende OG/Twitter-tags på 8 SPA-sider**
- examprep/, fra-null-til-investor{,2,3}/, garmin/, nb-watch/, pensjonskalkulator/, personligokonomi/
- Konsekvens: deling på LinkedIn/Slack viser bare URL uten preview-card.
- Pluss partial: `prosjekter/masteroppgave/index.html` mangler og:image; `forretningsenhet-dashboard` mangler `og:locale` + `og:image:alt` + width/height.
- Forslag: legg til standard OG-blokk + Twitter-card med peker til `og-image.png` på hver. (Auto-fix er mulig men jeg gjorde det ikke fordi du bør velge per-side titler/beskrivelser/bilder.)

**B2. For lang meta description**
- `prosjekter/forretningsenhet-dashboard/index.html`: 215 chars (SERPs truncates ved ~160).
- `prosjekter/finansielle-maler/index.html`: 162 chars (marginal).
- `cv.html`: 159 chars (akkurat på grensa).

**B3. Heading-hierarki-hopp**
- `cv.html`: h2 → h4 hopp i Sertifiseringer + Prosjekter
- `prosjekter/index.html`: h2 → h4 hopp i alle tre sub-seksjoner
- `prosjekter/finansielle-maler/index.html`: h1 → h3 hopp + h2 → h4 hopp
- `garmin/index.html`: **null headings i hele dokumentet**
- `index.html`: `<h1 id="heroHeadline"></h1>` er tom statisk (fylles av JS) — crawlere uten JS ser ingen H1.

**B4. Yahoo Finance live-bar-lenker har sannsynligvis utdaterte URL-er**
Se A1 over.

**B5. strategi.html job-source-registry har døde lenker**
- `strategi.html:1000` karrierestart.no/ledig-stilling?q=finans → 404
- `strategi.html:1020` skagenfondene.no/om-oss/karriere/ → 404
- `strategi.html:1013` BNP Paribas — 403 fra WAF, sannsynligvis OK i browser.
- (Privat tracker, ikke offentlig — lavere prioritet.)

### 🟢 Lav prioritet — opprydding

**C1. Død kode**
- 9 ubrukte CSS-klasser i index.html: `.hero-tag`, `.wave`, `.tilt-card`, `.cv-preview-tip`, `.cv-preview-flag`, `.light-section`, `.sh`, `.sn`, `.tl-title`. + 2 mulig ubrukt: `.shape`, `.cv-banner.no/.en`.
- 1 i cv.html: `.status-pending`
- 2 i strategi.html: `.notes-pad` (erstattet av notebook), `.dirty` (erstattet av s-* state-classes)
- 9 ubrukte i18n-nøkler i index.html × 5 språk (~45 linjer): `proj1Title/Desc`, `proj2Title/Desc`, `proj3Title/Desc`, `projAllTitle`, `subToolsTitle`, `subGuidesTitle`. Erstattet av `proj*b*`-varianter.
- Disse ble ikke auto-fjernet fordi T-objektene er enkeltliner per språk; surgical edit krever forsiktighet. Vurder en samlet opprydding når du har tid.

**C2. Tekst som vil eldes post-graduation**
- `index.html:647-651` heroSub i 5 språk: "Snart ferdig med MSc Finance", "Completing my MSc Finance", "Bientôt diplômé", "Kurz vor dem Abschluss", "修了予定". Akkurat nå riktig; rart fra ~juli 2026.

**C3. NAV-referanse i strategi.html**
- `strategi.html:1021` har fortsatt Arbeidsplassen (NAV) i source-registry. Per hub-notater var ETAPPE 7 NAV-integrasjon forkastet. Privat side, lav prioritet, men kosmetisk.

**C4. Empty alt på rekrutterer-portrett**
- `rekrutterer/index.html:244` `<img src="../profile.jpg" alt="">` — samme bilde har `alt="Valiant Evers"` på index.html og cv.html. Inkonsistens.

**C5. Cross-check: 2025-tall i masteroppgave**
- `prosjekter/masteroppgave/index.html:699-700, 815-816` — "over 600 000 private aksjonærer i 2025". Sjekk om 2026-tall er publisert.

**C6. CLAUDE.md i18n-liste er utdatert**
- CLAUDE.md (global, ikke i dette repoet) sier 6 språk er `nb-NO, en, fr, de, es, nl`. Faktiske T-objekter bruker `no, en, fr, de, ja, medieval`. Oppdater CLAUDE.md.

**C7. Anchors uten target**
- `prosjekter/masteroppgave/index.html:674` `href="#top"` — virker i browser, men ingen `id="top"`. Vurder å legge til.
- `examprep/index.html:31` `href="#main-content"` — JSX-rendret runtime. Vurder fallback for non-JS.

**C8. Skip-to-content lenker mangler**
- 16/17 sider mangler "Skip to content". Anbefalt på index.html, cv.html, rekrutterer/.

## 4. Foreslåtte forbedringer

**Performance**
- `travel/princevaliant.gif` er 7.7 MB (største fil i repoet). Brukes som easter-egg så slettes ikke, men vurder å konvertere til WebP/MP4 for 5-10× mindre størrelse.
- `travel/*-easter-egg.png` filene er 1.7-3.9 MB hver. Samme — kan optimaliseres.
- Vurder `loading="lazy"` på Leaflet-pin-bildene i `index.html:1204-1224` så de ikke lastes ved page-load.

**SEO/sosial**
- Standard OG-blokk på alle SPA-sider (B1). Maler kan kopieres fra index.html/cv.html.
- Bytt `<h4>` til `<h3>` i kort/sub-seksjoner for å fjerne h2→h4 hopp (cv.html, prosjekter/index.html, finansielle-maler).
- `garmin/index.html` trenger semantisk struktur — minst én `<h1>` og noen `<h2>`-er for de hovedseksjonene som finnes.

**UX**
- Yahoo Finance click-through (A1) — pek til Oslo Børs-siden eller fjern href.
- Skip-to-content lenke på de tre offentlige hovedsidene (C8).
- Vurder å oppdatere heroSub-tekstene post-graduation (C2).

**Kode-kvalitet**
- Død CSS + i18n-opprydding (C1) — ~50 linjer kan trygt fjernes etter en gjennomgang.
- Self-host LinkedIn-preview-bilder hvis du vil ha skikkelig preview-card der (lagt i `og-image.png` per side).

## 5. Statistikk

- **Filer skannet**: 18 produksjons-HTML-sider (ekskludert node_modules, *-src/, hero-vyre/, docs/, .tmp-skills/)
- **Eksterne lenker sjekket**: 61 unike (etter ekskludering av self + Google Fonts + GitHub API)
- **Lenker OK**: 49 — **Brutte (4xx)**: 6 reelle — **Server-feil (5xx)**: 0 — **Timeout/anti-bot**: 3
- **Bilder på disk**: ~70 (etter sletting av 15 orphans)
- **Sporede filer totalt**: 256
- **Repo-størrelse**: 54 MB (etter cleanup; var ~63 MB før)
- **Topp 5 største filer**:
  1. `travel/princevaliant.gif` — 7.69 MB (i bruk: medieval easter egg)
  2. `travel/thesis-easter-egg.png` — 3.89 MB
  3. `travel/viking-easter-egg.png` — 3.62 MB
  4. `travel/waffle-easter-egg.png` — 3.60 MB
  5. `travel/prins-ride.png` — 3.00 MB

## 6. Spor-rapporter

Detaljerte funn per spor ligger i `/tmp/healthcheck/findings-{A..I}.md`:
- **Spor A** — Broken Assets: 2 brutte href (Yale PDF + osebx/), 1 ambiguous empty-alt, 0 manglende bilder/favicons/fonter
- **Spor B** — i18n: 0 ekte oversettelsesgap. 1 dead key fjernet, 9 unused keys flagget for opprydding
- **Spor C** — HTML/CSS/JS: 0 harde feil
- **Spor D** — Interne lenker: 2 undeclared anchors (#top, #main-content), 1 broken absolute (/osebx/), 2 broken relative (Yale PDF × 2)
- **Spor E** — Eksterne lenker: 6 reelle 4xx, 1 anti-bot, 2 CORS-proxy-base (expected)
- **Spor F** — SEO: 5 manglende descriptions FIXED (4 i denne pass + 1 var allerede der), 8 sider mangler OG/Twitter
- **Spor G** — Innholdskonsistens: 0 stale claims, 2 decision-items (heroSub wear-out, NAV ref)
- **Spor H** — Død kode: 11 confirmed unused CSS, 15 orphan images (DELETED), 10 unused i18n-keys (1 fixed, 9 flagged)
- **Spor I** — A11y: 7 input-label-issues (4 FIXED på offentlige sider, 3 på private FIXED også), 1/17 sider har skip-link

## 7. Ikke gjort

- Død CSS-klasse-opprydding (vurder å gjøre samtidig som T-objekt-opprydding)
- Død i18n-nøkkel-opprydding utover backHome/proj1DescDEPR (konservativ pga single-line T-objekter)
- OG/Twitter-tags på 8 SPA-sider (krever per-side innholdsvalg)
- Heading-hierarki-fix (krever skjønn på hvilket nivå sub-cards skal være)
- Yahoo Finance link-fix (krever beslutning om mål-URL)
- Skip-to-content-lenker (UI-design-valg)

---
Generert av Claude Code sin healthcheck-sveip. Alle auto-fikser er individuelle commits og kan reverteres ved behov med `git revert <hash>`.
