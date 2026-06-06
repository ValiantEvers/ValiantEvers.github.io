// Cloudflare Worker: proxy for Yahoo Finance chart-endepunktet med edge-caching.
// Eneste oppgave: hente query1.finance.yahoo.com/v8/finance/chart for et gitt symbol
// og servere det med CORS-headere + 5-min cache. Hosten er hardkodet til Yahoo, så
// dette er ikke en åpen proxy (ingen SSRF). Brukes av tickeren på evers.no.
const CORS = {
  'Access-Control-Allow-Origin': '*', // kun offentlig markedsdata; kan låses til evers.no ved behov
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const TTL = 300; // sekunder (5 min, Yahoo)
const ECB_TTL = 3600; // sekunder (1 time; ECB/Frankfurter oppdateres ~1×/virkedag ~16:00 CET)

export default {
  async fetch(request, env) {
    if (new URL(request.url).pathname === '/vitals') return vitals(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);

    const { searchParams } = new URL(request.url);

    // ECB-referansekurs (Frankfurter) for et valutapar, f.eks. ?fx=eurnok
    const fx = searchParams.get('fx');
    if (fx !== null) return ecb(fx);

    const symbol = searchParams.get('symbol') || '';
    // tillat kun fornuftige Yahoo-symboler (bokstaver, tall, . ^ = -)
    if (!/^[A-Za-z0-9.^=\-]{1,20}$/.test(symbol)) return json({ error: 'invalid symbol' }, 400);

    const rawInterval = searchParams.get('interval') || '';
    const rawRange = searchParams.get('range') || '';
    const interval = /^[0-9a-z]{1,4}$/.test(rawInterval) ? rawInterval : '1d';
    const range = /^[0-9a-z]{1,4}$/.test(rawRange) ? rawRange : '2d';

    const yahoo = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}`;

    let upstream;
    try {
      upstream = await fetch(yahoo, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; evers-finance-proxy)',
          Accept: 'application/json',
        },
        cf: { cacheTtl: TTL, cacheEverything: true }, // Cloudflare cacher Yahoo-svaret på kanten
      });
    } catch (e) {
      return json({ error: 'upstream fetch failed' }, 502);
    }

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        ...CORS,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `public, max-age=${TTL}, s-maxage=${TTL}`, // nettleser- + edge-cache
      },
    });
  },
};

function json(obj, status, cacheSeconds) {
  const headers = { ...CORS, 'Content-Type': 'application/json; charset=utf-8' };
  if (cacheSeconds) headers['Cache-Control'] = `public, max-age=${cacheSeconds}, s-maxage=${cacheSeconds}`;
  return new Response(JSON.stringify(obj), { status, headers });
}

// ── web-vitals RUM (P-9) ──────────────────────────────────────────────────
// POST /vitals fra evers.no → Workers Analytics Engine. Personvern: ingen IP/cookies
// lagres; kun metrikk-navn, verdi, sidesti, navigationType og per-load metrikk-id.
const VITALS_ORIGINS = new Set(['https://www.evers.no', 'https://evers.no']);
const VNAMES = new Set(['LCP', 'INP', 'CLS', 'FCP', 'TTFB']);
function vcors(o) {
  const allow = VITALS_ORIGINS.has(o) ? o : 'https://www.evers.no';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}
async function vitals(request, env) {
  const o = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { headers: vcors(o) });
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405, headers: vcors(o) });
  if (o && !VITALS_ORIGINS.has(o)) return new Response(null, { status: 403, headers: vcors(o) });
  let d;
  try {
    const t = await request.text();
    if (t.length > 600) return new Response(null, { status: 413, headers: vcors(o) });
    d = JSON.parse(t);
  } catch (e) {
    return new Response(null, { status: 400, headers: vcors(o) });
  }
  const name = String(d.n || '');
  const value = Number(d.v);
  if (!VNAMES.has(name) || !isFinite(value) || value < 0 || value > 3600000) {
    return new Response(null, { status: 400, headers: vcors(o) });
  }
  if (env && env.VITALS) {
    env.VITALS.writeDataPoint({
      indexes: [name],
      blobs: [String(d.p || '/').slice(0, 128), String(d.t || '').slice(0, 32), String(d.id || '').slice(0, 40)],
      doubles: [value],
    });
  }
  return new Response(null, { status: 204, headers: vcors(o) });
}

// ECB daglige referansekurser via Frankfurter (gratis, nøkkelfri). Henter et 14-dagers
// vindu med virkedager og bruker de to nyeste datoene til kurs + forrige (for %-endring).
// Hosten er hardkodet → ikke en åpen proxy.
async function ecb(fx) {
  if (!/^[a-z]{6}$/.test(fx)) return json({ error: 'invalid fx' }, 400);
  const base = fx.slice(0, 3).toUpperCase();
  const quote = fx.slice(3).toUpperCase();
  const start = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
  const url = `https://api.frankfurter.app/${start}..?from=${base}&to=${quote}`;

  let r;
  try {
    r = await fetch(url, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: ECB_TTL, cacheEverything: true },
    });
  } catch (e) {
    return json({ error: 'upstream fetch failed' }, 502);
  }
  if (!r.ok) return json({ error: `upstream ${r.status}` }, 502);

  const data = await r.json();
  const rates = data && data.rates;
  const dates = rates ? Object.keys(rates).sort() : []; // ISO-datoer sorterer kronologisk
  if (!dates.length) return json({ error: 'no rates' }, 502);

  const last = dates[dates.length - 1];
  const prev = dates.length > 1 ? dates[dates.length - 2] : null;
  const price = rates[last] && rates[last][quote];
  if (typeof price !== 'number') return json({ error: 'no rate' }, 502);
  const prevClose = prev && rates[prev] ? rates[prev][quote] : null;

  return json(
    { price, prevClose, date: last, prevDate: prev, base, quote, source: 'ECB' },
    200,
    ECB_TTL
  );
}
