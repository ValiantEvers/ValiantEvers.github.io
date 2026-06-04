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
  async fetch(request) {
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
