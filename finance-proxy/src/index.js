// Cloudflare Worker: proxy for Yahoo Finance chart-endepunktet med edge-caching.
// Eneste oppgave: hente query1.finance.yahoo.com/v8/finance/chart for et gitt symbol
// og servere det med CORS-headere + 5-min cache. Hosten er hardkodet til Yahoo, så
// dette er ikke en åpen proxy (ingen SSRF). Brukes av tickeren på evers.no.
const CORS = {
  'Access-Control-Allow-Origin': '*', // kun offentlig markedsdata; kan låses til evers.no ved behov
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const TTL = 300; // sekunder (5 min)

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'GET') return json({ error: 'method not allowed' }, 405);

    const { searchParams } = new URL(request.url);
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

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
