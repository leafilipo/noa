// Analytics without cookies: one counter per day, kind, path and referrer; tracked links; socials through Postiz.
import { json, CORS, ensureSchema, kvGet, kvSet } from "./lib.js";

// no cookies, no IPs: one counter per day, kind, path and referrer host
async function hit(env, kind, path, ref) {
  await ensureSchema(env);
  const day = new Date().toISOString().slice(0, 10);
  await env.DB.prepare("INSERT INTO hits (day, kind, path, ref, n) VALUES (?, ?, ?, ?, 1) ON CONFLICT (day, kind, path, ref) DO UPDATE SET n = n + 1").bind(day, kind, String(path).slice(0, 200), String(ref || "").slice(0, 120)).run();
}
const refHost = r => { try { return new URL(r).hostname.replace(/^www\./, ""); } catch (e) { return ""; } };
async function beacon(req, env, ctx) {
  const b = await req.json().catch(() => ({}));
  const path = String(b.path || "/").slice(0, 200), ref = refHost(b.ref), src = String(b.src || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 60), host = String(b.host || "").toLowerCase().replace(/[^a-z0-9.-]/g, "").slice(0, 80);
  const country = (req.cf && req.cf.country) || "", ua = req.headers.get("user-agent") || "", device = /Mobi|Android|iPhone/i.test(ua) ? "phone" : /iPad|Tablet/i.test(ua) ? "tablet" : "desktop";
  ctx.waitUntil(Promise.all([hit(env, "view", path, ref), src ? hit(env, "src", path, src) : null, country ? hit(env, "country", "", country) : null, hit(env, "device", "", device), host ? hit(env, "host", "", host) : null]));
  return new Response(null, { status: 204, headers: CORS });
}
// the same beacon for another site: one script tag, counts into the same analytics
const HIT_JS = (origin) => `(function(){try{var u=new URL(location.href);var b=JSON.stringify({path:u.pathname,ref:document.referrer||"",src:u.searchParams.get("src")||"",host:location.hostname});if(!(navigator.sendBeacon&&navigator.sendBeacon(${JSON.stringify(origin + "/_hit")},new Blob([b],{type:"application/json"}))))fetch(${JSON.stringify(origin + "/_hit")},{method:"POST",body:b,headers:{"content-type":"application/json"},keepalive:true,mode:"cors"}).catch(function(){})}catch(e){}})();`;
// socials through Postiz, when a key is set; cached for an hour
async function social(env, days) {
  if (!env.POSTIZ_API_KEY) return json({ connected: false, channels: [] });
  const key = "social_" + days, cached = await kvGet(env, key); if (cached) { const c = JSON.parse(cached); if (Date.now() - c.at < 36e5) return json(c.data); }
  const H = { Authorization: env.POSTIZ_API_KEY }, base = env.POSTIZ_API_URL || "https://api.postiz.com";
  try {
    const ints = await (await fetch(base + "/public/v1/integrations", { headers: H })).json();
    const list = Array.isArray(ints) ? ints : ints.integrations || [];
    const channels = await Promise.all(list.filter(i => !i.disabled).map(async i => {
      let metrics = []; try { const a = await (await fetch(`${base}/public/v1/analytics/${i.id}?date=${days}`, { headers: H })).json(); if (Array.isArray(a)) metrics = a.map(m => ({ label: m.label, total: m.total != null ? m.total : (m.data || []).reduce((s, d) => s + (+d.total || 0), 0), last: (m.data || []).length ? +m.data[m.data.length - 1].total : null, change: m.percentageChange != null ? m.percentageChange : null, series: (m.data || []).map(d => [d.date, +d.total || 0]) })); } catch (e) {}
      return { id: i.id, name: i.name, identifier: i.identifier || i.providerIdentifier, picture: i.picture || "", profile: i.profile || "", metrics };
    }));
    const data = { connected: true, channels }; await kvSet(env, key, JSON.stringify({ at: Date.now(), data })); return json(data);
  } catch (e) { return json({ connected: true, channels: [], error: "postiz_unreachable" }); }
}
// tracked links: /l/<post id>?to=... counts a click per post and platform, then sends the visitor on
async function trackedLink(req, env, ctx, url) {
  const id = url.pathname.slice(3).replace(/[^A-Za-z0-9_-]/g, "");
  await ensureSchema(env);
  const doc = id ? await env.DB.prepare("SELECT data FROM docs WHERE coll='posts' AND id = ?").bind(id).first() : null;
  const data = doc ? JSON.parse(doc.data) : {};
  const to = (data.link && /^https?:\/\//.test(data.link)) ? data.link : (data.link && data.link.startsWith("/") ? url.origin + data.link : url.origin + "/");
  const plat = String(url.searchParams.get("p") || "").replace(/[^a-z]/g, "").slice(0, 20);
  ctx.waitUntil(hit(env, "click", id || "unknown", plat));
  const dest = new URL(to); if (!dest.searchParams.has("src")) dest.searchParams.set("src", "post-" + (id || "x"));
  return Response.redirect(dest.toString(), 302);
}


// the numbers the Studio's Analytics view reads, one batch instead of nine round trips
async function stats(env, days) {
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10), before = new Date(Date.now() - 2 * days * 864e5).toISOString().slice(0, 10);
  const P = sql => env.DB.prepare(sql);
  const rows = await env.DB.batch([
    P("SELECT day, SUM(CASE WHEN kind='view' THEN n ELSE 0 END) views, SUM(CASE WHEN kind='click' THEN n ELSE 0 END) clicks FROM hits WHERE day >= ? GROUP BY day ORDER BY day").bind(since),
    P("SELECT path, SUM(n) n FROM hits WHERE kind='view' AND day >= ? GROUP BY path ORDER BY n DESC LIMIT 12").bind(since),
    P("SELECT ref, SUM(n) n FROM hits WHERE kind='view' AND day >= ? AND ref != '' GROUP BY ref ORDER BY n DESC LIMIT 12").bind(since),
    P("SELECT path post, ref, SUM(n) n FROM hits WHERE kind='click' AND day >= ? GROUP BY path, ref ORDER BY n DESC").bind(since),
    P("SELECT ref, SUM(n) n FROM hits WHERE kind='src' AND day >= ? GROUP BY ref ORDER BY n DESC").bind(since),
    P("SELECT ref, SUM(n) n FROM hits WHERE kind='country' AND day >= ? GROUP BY ref ORDER BY n DESC LIMIT 10").bind(since),
    P("SELECT ref, SUM(n) n FROM hits WHERE kind='device' AND day >= ? GROUP BY ref ORDER BY n DESC").bind(since),
    P("SELECT ref, SUM(n) n FROM hits WHERE kind='host' AND day >= ? GROUP BY ref ORDER BY n DESC").bind(since),
    P("SELECT SUM(CASE WHEN kind='view' THEN n ELSE 0 END) views FROM hits WHERE day >= ? AND day < ?").bind(before, since)
  ]);
  const [byDay, pages, refs, posts, sources, countries, devices, hosts, prev] = rows.map(r => r.results);
  return json({ since, days, byDay, pages, refs, posts, sources, countries, devices, hosts, prev });
}
export { hit, beacon, HIT_JS, social, trackedLink, stats };
