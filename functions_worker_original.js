// Cloudflare Pages "advanced mode" worker.
// /api/gold   -> rates from ksaexpats.com/gold-rates   (JSON)
// /api/silver -> rates from ksaexpats.com/silver-rates (JSON)
// /api/fx     -> rates from ksaexpats.com/exchange-rate (JSON)
// /api/fuel   -> prices from ksaexpats.com/saudi-arabia-fuel-prices (JSON)
// everything else -> normal static files (index.html)
// Please make sure you have permission to reuse this data.

const num = s => parseFloat(String(s).replace(/,/g, ''));

function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ');
}

function parseGold(text) {
  const rows = {};
  for (const k of [24, 22, 21, 18]) {
    const m = text.match(new RegExp(k + 'K\\s*\\d+\\s*purity\\s*SAR\\s*([\\d,]+(?:\\.\\d+)?)', 'i'));
    if (m) rows[k + 'K'] = { rate: num(m[1]) };
  }
  if (!rows['24K']) throw new Error('gold prices not found');
  const jew = [];
  const sec = text.match(/Jeweller\s+24K\s+22K\s+18K(.*?)Published jewellery/i);
  if (sec) {
    const re = /([A-Za-z][A-Za-z&.' -]*?)\s*SAR\s*([\d,.]+)\s*SAR\s*([\d,.]+)\s*(?:SAR\s*([\d,.]+)|[—–-])/g;
    let m;
    while ((m = re.exec(sec[1]))) jew.push({ name: m[1].trim(), r24: num(m[2]), r22: num(m[3]), r18: m[4] ? num(m[4]) : null });
  }
  return { rows, jew, updated: updated(text) };
}

function parseSilver(text) {
  const rows = {};
  for (const f of ['999', '958', '925', '800']) {
    const m = text.match(new RegExp(f + ' Silver\\s+[A-Za-z0-9 ]+?\\s*SAR\\s*([\\d,]+(?:\\.\\d+)?)', 'i'));
    if (m) rows[f] = num(m[1]);
  }
  if (!rows['999']) throw new Error('silver prices not found');
  const hist = [];
  const sec = text.split(/Recent Silver Prices/i)[1] || '';
  const re = /(\d{1,2} \w{3} \d{4})\s*SAR\s*([\d.]+)/g;
  let m;
  while ((m = re.exec(sec)) && hist.length < 7) hist.push([m[1], num(m[2])]);
  return { rows, hist, updated: updated(text) };
}

function parseFx(text) {
  const sec = (text.split(/All currency rates/i)[1] || '').split(/Before sending money/i)[0];
  const list = [];
  const re = /([A-Z][A-Za-z .'’-]+?)\s+([A-Z]{3})\s+([\d,]+(?:\.\d+)?)\s+\2/g;
  let m;
  while ((m = re.exec(sec))) list.push([m[2], m[1].trim(), num(m[3])]);
  if (list.length < 5) throw new Error('exchange rates not found');
  return { list, updated: new Date().toISOString() };
}

function parseFuel(text) {
  const defs = [['Gasoline 91', '91 octane'], ['Gasoline 95', '95 octane'], ['Gasoline 98', '98 octane'], ['Diesel', 'Diesel vehicles'], ['Kerosene', 'Kerosene fuel']];
  const fuels = [];
  for (const [name, sub] of defs) {
    const m = text.match(new RegExp(name + '\\s+' + sub + '\\s*SAR\\s*([\\d.]+)\\s*per litre\\s*(No change|[↑↓]\\s*SAR\\s*[\\d.]+)?', 'i'));
    if (m) fuels.push({ name, price: num(m[1]), note: (m[2] || 'No change').replace(/\s+/g, ' ') });
  }
  if (fuels.length < 3) throw new Error('fuel prices not found');
  const lpg = [];
  for (const [name, unit] of [['11 kg cylinder', 'per cylinder'], ['5 kg cylinder', 'per cylinder'], ['Gas tank refill', 'per litre']]) {
    const m = text.match(new RegExp(name + '\\s*SAR\\s*([\\d.]+)\\s*' + unit, 'i'));
    if (m) lpg.push({ name, price: num(m[1]), unit });
  }
  const v = text.match(/Last verified on KSA Expats:\s*(\d{1,2} \w{3} \d{4})/i);
  return { fuels, lpg, verified: v ? v[1] : '' };
}

function updated(text) {
  const t = text.match(/(?:Last )?updated:\s*(\d{1,2} \w{3} \d{4},? \d{1,2}:\d{2}\s*[AP]M)/i);
  return t ? t[1] : new Date().toISOString();
}

// Optional: price history. Needs a KV namespace bound to this project as GOLD_KV.
// Stores one 24K rate per hour (about 90 days). Without it, the site still works.
async function withHistory(data, env) {
  const kv = env.GOLD_KV;
  if (!kv) return data;
  try {
    const hist = JSON.parse((await kv.get('hist')) || '[]');
    const now = Date.now(), last = hist[hist.length - 1];
    if (!last || now - last[0] >= 60 * 60 * 1000) {
      hist.push([now, data.rows['24K'].rate]);
      if (hist.length > 2200) hist.splice(0, hist.length - 2200);
      await kv.put('hist', JSON.stringify(hist));
    }
    data.hist = hist;
  } catch (e) { /* history is optional */ }
  return data;
}

async function feed(url, parse, env, post) {
  const headers = { 'content-type': 'application/json', 'cache-control': 'public, max-age=20' };
  try {
    const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, cf: { cacheTtl: 20 } });
    let data = parse(toText(await res.text()));
    if (post) data = await post(data, env);
    return new Response(JSON.stringify(data), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 502, headers });
  }
}

export default {
  async fetch(request, env) {
    const p = new URL(request.url).pathname;
    if (p === '/api/gold') return feed('https://ksaexpats.com/gold-rates/', parseGold, env, withHistory);
    if (p === '/api/silver') return feed('https://ksaexpats.com/silver-rates/', parseSilver);
    if (p === '/api/fx') return feed('https://ksaexpats.com/exchange-rate/', parseFx);
    if (p === '/api/fuel') return feed('https://ksaexpats.com/saudi-arabia-fuel-prices/', parseFuel);
    return env.ASSETS.fetch(request);
  },
};
