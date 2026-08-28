# vendor/ — self-hostede tredjepartsbiblioteker

Alt tredjepartsskript og -stil som evers.no laster kjøretid ligger her, servert
fra eget domene. Ingen side (utenfor unntakene nederst) gjør et nettverkskall
til en tredjeparts-CDN. Mønsteret er arvet fra `wc2026`, som aldri har hatt
eksterne kall.

**Regel:** legg aldri inn et `<script src="https://…cdn…">` på en ny side. Last
ned filen hit, pinn versjonen i filnavnet, og før den inn i tabellen under.

## Hvorfor

1. **Personvern** — en CDN-hentet fil gir tredjeparten den besøkendes IP,
   User-Agent og referer på hvert sidevisning.
2. **Robusthet** — siden virker uendret om CDN-en er nede, blokkert av en
   bedrifts-proxy, eller om pakken avpubliseres.
3. **Determinisme** — versjonen som ligger i repoet er versjonen som kjører.

## Filer

| Fil | Versjon | Hentet fra | SRI (sha384, base64) | Lisens |
|---|---|---|---|---|
| `twemoji-15.1.0.min.js` | @twemoji/api 15.1.0 | `cdn.jsdelivr.net/npm/@twemoji/api@15.1.0/dist/twemoji.min.js` | `o28+zJO3/45GHIy+9TFKGaYnbt0KQcFRzyBrb0WSSrz7bPGwGI1d64worBiXPgXw` | MIT (kode) |
| `twemoji/svg/*.svg` (67 stk.) | jdecked/twemoji 15.1.0 | `cdn.jsdelivr.net/gh/jdecked/twemoji@15.1.0/assets/svg/` | — | **CC-BY 4.0** (grafikk) |
| `leaflet-1.9.4/leaflet.js` | Leaflet 1.9.4 | `cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js` | `cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH` | BSD-2-Clause |
| `leaflet-1.9.4/leaflet.css` | Leaflet 1.9.4 | `cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css` | `sHL9NAb7lN7rfvG5lfHpm643Xkcjzp4jFvuavGOndn6pjVqS6ny56CAt3nsEVT4H` | BSD-2-Clause |
| `leaflet-1.9.4/images/*.png` (5 stk.) | Leaflet 1.9.4 | `cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/` | — | BSD-2-Clause |
| `chart.js-4.4.3.umd.min.js` | Chart.js 4.4.3 | `cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js` | `JUh163oCRItcbPme8pYnROHQMC6fNKTBWtRG3I3I0erJkzNgL7uxKlNwcrcFKeqF` | MIT |
| `chart.js-4.4.1.umd.min.js` | Chart.js 4.4.1 | `cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js` | `bs/nf9FbdNouRbMiFcrcZfLXYPKiPaGVGplVbv7dLGECccEXDW+S3zjqSKR5ZEaD` | MIT |
| `three-0.160.0.module.min.js` | three.js r160 | `unpkg.com/three@0.160.0/build/three.module.min.js` | — (ingen SRI var deklarert) | MIT |
| `web-vitals-4.2.4.js` | web-vitals 4.2.4 | `cdn.jsdelivr.net/npm/web-vitals@4.2.4/dist/web-vitals.js` | — | Apache-2.0 |
| `react-18.3.1.production.min.js`, `react-dom-18.3.1.production.min.js` | React 18.3.1 | (self-hostet i audit 2026-07-06) | — | MIT |
| `babel-standalone-7.29.0.min.js` | Babel 7.29.0 | (self-hostet i audit 2026-07-06) | — | MIT |
| `cytoscape-3.30.2.min.js` | Cytoscape 3.30.2 | (self-hostet i audit 2026-07-06) | — | MIT |
| `rough-notation.iife.js` | rough-notation | (self-hostet tidligere) | — | MIT |

**SRI-kolonnen er bevis, ikke konfigurasjon:** hashene er de sidene deklarerte
FØR self-hostingen, og hver nedlastede fil ble målt mot sin hash før den ble
lagt inn her. Alle fem matchet — filene er byte-identiske med det nettleseren
lastet fra CDN-en. `integrity`/`crossorigin` er fjernet fra taggene, siden SRI
ikke gir mening for same-origin-ressurser.

### To Chart.js-versjoner med vilje

`garmin/` sto på 4.4.1 (cdnjs) og `leie-eller-eie/` på 4.4.3 (jsDelivr). Begge
er pinnet som de var. Å samle dem på én versjon ville vært en oppgradering av
den ene siden i en jobb som skulle være atferdsnøytral. Slå dem sammen først
når begge sidene er verifisert på samme versjon.

### Twemoji-attribusjon (CC-BY 4.0)

Grafikken i `twemoji/svg/` er hentet fra <https://github.com/jdecked/twemoji> og
er lisensiert **CC-BY 4.0**. Koden (`twemoji-15.1.0.min.js`) er MIT.
Attribusjonskravet gjelder grafikken, og oppfylles av denne fila.

Settet er ikke komplett Twemoji: det er nøyaktig de 67 ikonene `index.html`
faktisk bruker, beregnet ved å kjøre `twemoji.parse()` fra selve biblioteket
over `index.html` (og over `books.json`/`strava.json`, som hentes og rendres —
de ga null ekstra). Legger du til en ny emoji i en tekst på forsiden, må SVG-en
lastes ned hit, ellers blir det et brutt bilde. `twemoji.parse()` kalles med
`base:'/vendor/twemoji/'` — uten den henter biblioteket ikonene fra jsDelivr
selv om selve skriptet er lokalt.

## Bevisste unntak (eksterne kall som IKKE kan self-hostes)

| Kall | Hvor | Hvorfor det står |
|---|---|---|
| `{s}.basemaps.cartocdn.com` (kartfliser) | `index.html` — reisekartet | Et verdensbasiskart kan ikke pakkes i repoet. Kallet er **lat**: det skjer først når brukeren åpner kartet, ikke ved sidelast. Gjenåpnes hvis kartet fjernes eller byttes til statisk bilde. |
| `finance-proxy.valiantevers1809.workers.dev` | `index.html` — børsticker + web-vitals-endepunkt | Egen Cloudflare Worker, ikke tredjepart. |
| `api.github.com` | `strategi.html` | Privat, noindex, passordlåst jobbsøk-OS mot egen gist. |

Datert 2026-08-28 (arbeidsordre 6, del C1).
