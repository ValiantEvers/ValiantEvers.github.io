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
    const path = new URL(request.url).pathname;
    if (path === '/vitals') return vitals(request, env);
    if (path === '/hit') return hit(request, env);
    if (path === '/stats') return stats(request, env);
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

// ── Besøksmåler (2026-10-03) ──────────────────────────────────────────────
// POST /hit fra evers.no → Analytics Engine (HITS-binding → datasett `evers_hits`).
// Samme personvernmønster som /vitals: ingen cookies, ingen IP, ingen id — verken
// lagret eller sendt. Lagres: sidesti, referrer-VERT (aldri full URL), valgfri
// ?ref=-kilde, land (fra Cloudflare), enhetsklasse og om visningen er en inngang
// (tom/ekstern referrer = nytt besøk; intern navigasjon = 0).
// blob1 sti · blob2 referrer-vert · blob3 ref-kilde · blob4 land · blob5 enhet · blob6 inngang
const BOT_RE = /bot|crawl|spider|slurp|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python|go-http/i;
function fromSite(request) {
  const o = request.headers.get('Origin');
  if (o) return VITALS_ORIGINS.has(o);
  const r = request.headers.get('Referer') || '';
  return /^https:\/\/(www\.)?evers\.no\//.test(r);
}
async function hit(request, env) {
  const o = request.headers.get('Origin') || '';
  if (request.method === 'OPTIONS') return new Response(null, { headers: vcors(o) });
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405, headers: vcors(o) });
  if (!fromSite(request)) return new Response(null, { status: 403, headers: vcors(o) });
  const ua = request.headers.get('User-Agent') || '';
  if (!ua || BOT_RE.test(ua)) return new Response(null, { status: 204, headers: vcors(o) });
  let d;
  try {
    const t = await request.text();
    if (t.length > 600) return new Response(null, { status: 413, headers: vcors(o) });
    d = JSON.parse(t);
  } catch (e) {
    return new Response(null, { status: 400, headers: vcors(o) });
  }
  let path = String(d.p || '');
  if (!/^(404:)?\/[^\s?#<>"]{0,160}$/.test(path)) return new Response(null, { status: 400, headers: vcors(o) });
  path = path.replace(/\/index\.html$/, '/').slice(0, 128);
  const ref = String(d.r || '').toLowerCase();
  const refHost = /^[a-z0-9.-]{1,64}$/.test(ref) ? ref : '';
  const src = /^[A-Za-z0-9_-]{1,32}$/.test(String(d.s || '')) ? String(d.s).toLowerCase() : '';
  const country = (request.cf && /^[A-Z]{2}$/.test(request.cf.country || '')) ? request.cf.country : '';
  const device = /Mobi|Android|iPhone|iPad/i.test(ua) ? 'mobil' : 'desktop';
  const entry = d.e === 1 || d.e === '1' ? '1' : '0';
  if (env && env.HITS) {
    env.HITS.writeDataPoint({
      indexes: [path.slice(0, 90)],
      blobs: [path, refHost, src, country, device, entry],
      doubles: [1],
    });
  }
  return new Response(null, { status: 204, headers: vcors(o) });
}

// GET /stats?k=<STATS_KEY>[&d=30] → privat HTML-oversikt (kun for Valiant).
// Krever secrets: STATS_KEY, CF_ACCOUNT_ID, CF_API_TOKEN («Account Analytics Read»).
// Feil nøkkel gir 404 (siden skal ikke røpe at den finnes). Dager er UTC.
async function stats(request, env) {
  const H = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow', 'Referrer-Policy': 'no-referrer' };
  const url = new URL(request.url);
  if (request.method !== 'GET') return new Response('method not allowed', { status: 405, headers: H });
  if (!env || !env.STATS_KEY || !(await sameSecret(url.searchParams.get('k') || '', env.STATS_KEY))) {
    return new Response('not found', { status: 404, headers: H });
  }
  if (!env.CF_ACCOUNT_ID || !env.CF_API_TOKEN) {
    return new Response('Mangler secrets CF_ACCOUNT_ID / CF_API_TOKEN (se README).', { status: 500, headers: H });
  }
  const days = Math.min(90, Math.max(1, parseInt(url.searchParams.get('d'), 10) || 30));
  const W = `timestamp > NOW() - INTERVAL '${days}' DAY`;
  const DAY = `toStartOfInterval(timestamp, INTERVAL '1' DAY)`;
  const top = (blob, extra, lim) =>
    `SELECT ${blob} AS k, SUM(_sample_interval) AS n FROM evers_hits WHERE ${W}${extra} GROUP BY k ORDER BY n DESC LIMIT ${lim}`;
  const Q = {
    views: `SELECT ${DAY} AS d, SUM(_sample_interval) AS n FROM evers_hits WHERE ${W} GROUP BY d ORDER BY d`,
    visits: `SELECT ${DAY} AS d, SUM(_sample_interval) AS n FROM evers_hits WHERE ${W} AND blob6 = '1' GROUP BY d ORDER BY d`,
    pages: top('blob1', '', 25),
    refs: top('blob2', ` AND blob6 = '1'`, 15),
    srcs: top('blob3', ` AND blob3 != ''`, 10),
    land: top('blob4', '', 10),
    dev: top('blob5', '', 3),
    base: `SELECT ${DAY} AS d, SUM(_sample_interval) AS n FROM evers_web_vitals WHERE timestamp > NOW() - INTERVAL '90' DAY AND index1 = 'TTFB' GROUP BY d ORDER BY d`,
  };
  const keys = Object.keys(Q);
  const res = await Promise.allSettled(keys.map((k) => aeQuery(env, Q[k])));
  const R = {};
  keys.forEach((k, i) => { R[k] = res[i].status === 'fulfilled' ? res[i].value : { error: String(res[i].reason && res[i].reason.message || res[i].reason) }; });
  return new Response(renderStats(R, days, url.searchParams.get('k')), { headers: { ...H, 'Content-Type': 'text/html; charset=utf-8' } });
}

async function aeQuery(env, sql) {
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/analytics_engine/sql`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` },
    body: sql,
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Analytics Engine ${r.status}: ${t.slice(0, 200)}`);
  const j = JSON.parse(t);
  return (j.data || []).map((row) => ({ ...row, n: Number(row.n) || 0 }));
}

async function sameSecret(a, b) {
  const enc = new TextEncoder();
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const u = new Uint8Array(x), v = new Uint8Array(y);
  let diff = 0;
  for (let i = 0; i < u.length; i++) diff |= u[i] ^ v[i];
  return diff === 0;
}

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const dkey = (d) => String(d).slice(0, 10);

function renderStats(R, days, k) {
  const err = (x) => (x && x.error ? `<p class="err">${esc(x.error)}</p>` : '');
  const list = (x) => (Array.isArray(x) ? x : []);
  const sum = (x) => list(x).reduce((a, r) => a + r.n, 0);
  // dagsserie: visninger + besøk slått sammen på dato, tomme dager fylt inn
  const byDay = {};
  list(R.views).forEach((r) => { (byDay[dkey(r.d)] ||= { v: 0, b: 0 }).v = r.n; });
  list(R.visits).forEach((r) => { (byDay[dkey(r.d)] ||= { v: 0, b: 0 }).b = r.n; });
  const today = new Date();
  const dates = [];
  for (let i = days - 1; i >= 0; i--) dates.push(new Date(today.getTime() - i * 86400000).toISOString().slice(0, 10));
  const maxV = Math.max(1, ...dates.map((d) => (byDay[d] || {}).v || 0));
  const last7 = dates.slice(-7).reduce((a, d) => a + ((byDay[d] || {}).b || 0), 0);
  const prev7 = dates.slice(-14, -7).reduce((a, d) => a + ((byDay[d] || {}).b || 0), 0);
  const rows = dates.slice().reverse().map((d) => {
    const x = byDay[d] || { v: 0, b: 0 };
    return `<tr><td class="d">${d}</td><td class="n">${x.b}</td><td class="n">${x.v}</td><td class="bar"><span style="width:${(100 * x.v) / maxV}%"></span><i style="width:${(100 * x.b) / maxV}%"></i></td></tr>`;
  }).join('');
  const table = (x, label, empty) => {
    if (x && x.error) return err(x);
    const L = list(x);
    if (!L.length) return `<p class="muted">${empty}</p>`;
    const m = Math.max(1, ...L.map((r) => r.n));
    return `<table>${L.map((r) => `<tr><td>${esc(r.k || label)}</td><td class="n">${r.n}</td><td class="bar"><span style="width:${(100 * r.n) / m}%"></span></td></tr>`).join('')}</table>`;
  };
  const base = list(R.base);
  const baseMax = Math.max(1, ...base.map((r) => r.n));
  const baseRows = base.slice().reverse().map((r) => `<tr><td class="d">${dkey(r.d)}</td><td class="n">${r.n}</td><td class="bar"><span style="width:${(100 * r.n) / baseMax}%"></span></td></tr>`).join('');
  return `<!doctype html><html lang="no"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>evers.no · besøk</title>
<style>
:root{--bg:#fafaf9;--fg:#0a0a0a;--mu:#737373;--ac:#0070ed;--ac2:#9cc3f5;--line:#e7e5e4;--card:#fff}
@media (prefers-color-scheme:dark){:root{--bg:#0a0a0a;--fg:#ededed;--mu:#8a8a8a;--ac:#4f9bff;--ac2:#1d3f6e;--line:#262626;--card:#141414}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
main{max-width:860px;margin:0 auto;padding:24px 16px 64px}h1{font-size:1.4rem;margin:0 0 4px}h2{font-size:1rem;margin:32px 0 8px}
.muted,.note{color:var(--mu);font-size:.85rem}.err{color:#d33;font-size:.85rem}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:20px 0}
.kpi{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px 14px}.kpi b{display:block;font-size:1.5rem}
table{width:100%;border-collapse:collapse;font-size:.88rem}td{padding:4px 6px;border-bottom:1px solid var(--line);vertical-align:middle;word-break:break-all}
td.n{text-align:right;font-variant-numeric:tabular-nums;width:56px}td.d{white-space:nowrap;width:100px;word-break:normal}
td.bar{width:40%;position:relative}td.bar span,td.bar i{display:block;height:8px;border-radius:4px;background:var(--ac2)}td.bar i{background:var(--ac);margin-top:-8px}
.cols{display:grid;grid-template-columns:1fr 1fr;gap:24px}@media (max-width:640px){.cols{grid-template-columns:1fr}td.bar{width:30%}}
</style></head><body><main>
<h1>evers.no · besøk</h1><p class="muted">Siste ${days} dager · dager i UTC · egen trafikk utelatt der ?nostats er satt · ${[7, 30, 90].map((n) => (n === days ? `<b>${n}</b>` : `<a href="?k=${encodeURIComponent(k)}&amp;d=${n}">${n}</a>`)).join(' / ')} dager</p>
<div class="kpis"><div class="kpi"><span class="muted">Besøk</span><b>${sum(R.visits)}</b></div><div class="kpi"><span class="muted">Sidevisninger</span><b>${sum(R.views)}</b></div><div class="kpi"><span class="muted">Besøk siste 7 d</span><b>${last7}</b><span class="muted">forrige 7 d: ${prev7}</span></div></div>
${err(R.views)}${err(R.visits)}
<h2>Per dag</h2><p class="note">Mørk strek = besøk (innganger), lys = sidevisninger.</p><table><tr><td class="d muted">Dato</td><td class="n muted">Besøk</td><td class="n muted">Visn.</td><td></td></tr>${rows}</table>
<div class="cols"><div><h2>Sider</h2>${table(R.pages, '?', 'Ingen data ennå.')}</div><div><h2>Kom fra</h2><p class="note">Kun innganger. «(direkte)» = ingen referrer — podkastapper, lenker i meldinger og bokmerker havner her.</p>${table(R.refs, '(direkte)', 'Ingen data ennå.')}</div></div>
<div class="cols"><div><h2>?ref=-kilder</h2>${table(R.srcs, '?', 'Ingen merkede lenker ennå (f.eks. evers.no/?ref=linkedin).')}</div><div><h2>Land</h2>${table(R.land, '(ukjent)', 'Ingen data ennå.')}<h2>Enhet</h2>${table(R.dev, '?', 'Ingen data ennå.')}</div></div>
<h2>Baseline: forsideinnlastinger fra web-vitals (90 d)</h2><p class="note">Hver forside-innlasting sender én TTFB-måling — et grovt mål på forsidetrafikk fra før måleren fantes. Kun forsiden.</p>${R.base && R.base.error ? err(R.base) : `<table>${baseRows || '<tr><td class="muted">Ingen data.</td></tr>'}</table>`}
</main></body></html>`;
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
