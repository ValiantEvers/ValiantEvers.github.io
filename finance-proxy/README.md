# finance-proxy

Liten Cloudflare Worker som proxyer Yahoo Finance sitt chart-endepunkt
(`query1.finance.yahoo.com/v8/finance/chart`) med CORS-headere og 5-minutters
edge-cache. Brukes av live-tickeren på [evers.no](https://www.evers.no) for å hente
S&P 500 (`^GSPC`), OSEBX (`OSEBX.OL`) og EUR/NOK (`EURNOK=X`) uten å være avhengig av
upålitelige offentlige CORS-proxyer.

## API

```
GET /?symbol=<symbol>&interval=<interval>&range=<range>
```

- `symbol` (påkrevd) — Yahoo-ticker, f.eks. `^GSPC`, `OSEBX.OL`, `EURNOK=X`.
  Valideres mot `^[A-Za-z0-9.^=\-]{1,20}$`.
- `interval` (valgfri, default `1d`)
- `range` (valgfri, default `2d`)

Svarer med rå Yahoo-JSON, `Access-Control-Allow-Origin: *` og
`Cache-Control: public, max-age=300`. Hosten er hardkodet til Yahoo — ikke en åpen proxy.

## Deploy

```bash
# 1. Logg inn (åpner nettleser, OAuth) — gjøres én gang
npx wrangler login

# 2. Deploy
cd finance-proxy
npx wrangler deploy
```

Deploy skriver ut URL-en `https://finance-proxy.<ditt-subdomene>.workers.dev`.
Den limes inn som `FINANCE_PROXY` i `index.html` (live-finance-bar-scriptet).

## Test

```bash
curl -si 'https://finance-proxy.<ditt-subdomene>.workers.dev/?symbol=^GSPC&interval=1d&range=2d' | head -20
```

Forvent `200`, `access-control-allow-origin: *`, `cache-control: ...max-age=300`, og
gyldig JSON med `chart.result[0].meta.regularMarketPrice`. Kjør to ganger for å se
`cf-cache-status: HIT` på andre kall.

## Web-vitals RUM (`POST /vitals`)

Tar imot ekte felt-metrikker (LCP/INP/CLS/FCP/TTFB) fra `web-vitals` på evers.no og
skriver til Workers **Analytics Engine** (`VITALS`-binding → datasett `evers_web_vitals`).
Personvern: ingen cookies, ingen IP lagret, ingen persistente/cross-site-id — kun
metrikk-navn, verdi, sidesti, `navigationType` og en per-load metrikk-id. CORS er låst
til `evers.no`; body sendes som `text/plain` via `navigator.sendBeacon` (ingen preflight).
Ticker-routene (`?symbol=`, `?fx=`) er urørt.

```
POST /vitals    body (text/plain JSON): {"n":"LCP","v":1820.4,"id":"v4-...","p":"/","t":"navigate"}
→ 204 No Content   (400 ugyldig · 403 feil origin · 405 ikke-POST · 413 for stor)
```

### Lese tallene (p75 siste 7 dager) — Analytics Engine SQL API

```bash
curl -s "https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/analytics_engine/sql" \
  -H "Authorization: Bearer <CF_API_TOKEN>" \
  --data "SELECT index1 AS metric, quantileWeighted(0.75, double1, _sample_interval) AS p75, count() AS n
          FROM evers_web_vitals WHERE timestamp > now() - INTERVAL '7' DAY GROUP BY metric"
```

API-token trenger «Account Analytics Read». `<ACCOUNT_ID>` finnes i Cloudflare-dashbordet
eller via `npx wrangler whoami`.
