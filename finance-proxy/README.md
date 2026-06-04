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
