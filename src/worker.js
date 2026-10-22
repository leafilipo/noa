// noa site (fork of the Huit builder): public website from published releases + Studio (editor) behind Cloudflare Access.
// Same engine as the Northern Lights Studio: documents in D1, images as blobs, publishing = frozen HTML snapshots.
const COLLS = new Set(["versions", "comments", "inquiries", "settings", "posts", "campaigns"]);
const MAX_DOC = 1_500_000, MAX_BLOB = 1_900_000;
const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
const rid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
const okId = s => /^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(s);
const escH = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

let schemaOk = false;
async function ensureSchema(env) {
  if (schemaOk) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS docs (coll TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL, updated INTEGER NOT NULL, by TEXT, PRIMARY KEY (coll, id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS blobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, data BLOB NOT NULL, at TEXT, by TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS releases (id INTEGER PRIMARY KEY AUTOINCREMENT, ver TEXT, ver_name TEXT, by TEXT, at TEXT, pages INTEGER, css TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS release_pages (release INTEGER NOT NULL, path TEXT NOT NULL, title TEXT, descr TEXT, html TEXT NOT NULL, PRIMARY KEY (release, path))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT)"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS hits (day TEXT NOT NULL, kind TEXT NOT NULL, path TEXT NOT NULL, ref TEXT, n INTEGER NOT NULL DEFAULT 1, PRIMARY KEY (day, kind, path, ref))")
  ]);
  schemaOk = true;
}
const kvGet = async (env, k) => { const r = await env.DB.prepare("SELECT v FROM kv WHERE k = ?").bind(k).first(); return r ? r.v : null; };
const kvSet = (env, k, v) => env.DB.prepare("INSERT INTO kv (k, v) VALUES (?, ?) ON CONFLICT (k) DO UPDATE SET v = excluded.v").bind(k, String(v)).run();
const list = v => String(v || "").split(",").map(x => x.trim()).filter(Boolean);
const publicHosts = env => list(env.PUBLIC_HOSTS).map(x => x.toLowerCase());
const canPublish = (env, me) => !!(me && me.name && list(env.PUBLISHERS || "Lea").includes(me.name));

// ---- login: Cloudflare Access in front of /studio and /api; the worker verifies the token itself too ----
let certs = {}, certsAt = 0;
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(s.length / 4) * 4, "=")), c => c.charCodeAt(0));
async function verifyAccess(token, env) {
  const [h, p, sig] = token.split("."); if (!sig) return null;
  const head = JSON.parse(new TextDecoder().decode(b64u(h))), body = JSON.parse(new TextDecoder().decode(b64u(p)));
  const team = String(body.iss || "").replace(/^https:\/\//, "").replace(/\/$/, "");
  if (!list(env.ACCESS_TEAM_DOMAIN).includes(team)) return null;
  if (!certs[team] || Date.now() - certsAt > 3600e3) { certs[team] = (await (await fetch(`https://${team}/cdn-cgi/access/certs`)).json()).keys; certsAt = Date.now(); }
  const jwk = certs[team].find(k => k.kid === head.kid); if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64u(sig), new TextEncoder().encode(h + "." + p));
  const auds = list(env.ACCESS_AUD), aud = [].concat(body.aud || []);
  if (!ok || (auds.length && !aud.some(a => auds.includes(a))) || body.exp * 1000 < Date.now()) return null;
  return String(body.email || "").toLowerCase();
}
async function viewer(req, env) {
  let email = null;
  if (env.ACCESS_TEAM_DOMAIN) {
    const ck = (req.headers.get("cookie") || "").match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    const t = req.headers.get("cf-access-jwt-assertion") || (ck && ck[1]);
    email = t ? await verifyAccess(t, env).catch(() => null) : null;
  } else email = (req.headers.get("cf-access-authenticated-user-email") || "").toLowerCase() || null; // local dev only
  let users = {}; try { users = JSON.parse(env.USERS || "{}"); } catch (e) {}
  return email ? { email, name: users[email] || null } : null;
}

// ---- API ----
async function api(req, env, url) {
  const me = await viewer(req, env);
  if (!(me && me.name)) return json({ error: me ? "not_invited" : "login_required", email: me && me.email }, me ? 403 : 401);
  await ensureSchema(env);
  const parts = url.pathname.split("/").filter(Boolean).slice(1);
  if (parts[0] === "me") return json({ name: me.name, email: me.email, canPublish: canPublish(env, me) });

  if (parts[0] === "db" && COLLS.has(parts[1])) {
    const coll = parts[1], id = parts[2] ? decodeURIComponent(parts[2]) : null;
    if (req.method === "GET" && !id) {
      const { results } = await env.DB.prepare("SELECT id, data, updated, by FROM docs WHERE coll = ? ORDER BY updated DESC").bind(coll).all();
      return json({ docs: results.map(r => ({ id: r.id, data: JSON.parse(r.data), updated: r.updated, by: r.by })) });
    }
    if (!id || !okId(id)) return json({ error: "bad_id" }, 400);
    if (req.method === "PUT") {
      const text = await req.text(); if (text.length > MAX_DOC) return json({ error: "too_large" }, 413);
      const b = JSON.parse(text);
      // optimistic check: the client sends the "updated" it last saw; a newer save by someone else wins and is returned
      if (b.base != null) {
        const cur = await env.DB.prepare("SELECT data, updated, by FROM docs WHERE coll = ? AND id = ?").bind(coll, id).first();
        if (cur && cur.updated !== b.base && cur.by !== me.name) return json({ error: "conflict", doc: { id, data: JSON.parse(cur.data), updated: cur.updated, by: cur.by } }, 409);
      }
      const now = Date.now();
      await env.DB.prepare("INSERT INTO docs (coll, id, data, updated, by) VALUES (?, ?, ?, ?, ?) ON CONFLICT (coll, id) DO UPDATE SET data = excluded.data, updated = excluded.updated, by = excluded.by")
        .bind(coll, id, JSON.stringify(b.data), now, me.name).run();
      return json({ id, updated: now });
    }
    if (req.method === "DELETE") { await env.DB.prepare("DELETE FROM docs WHERE coll = ? AND id = ?").bind(coll, id).run(); return json({ ok: true }); }
  }

  if (parts[0] === "blob" && req.method === "POST") {
    const type = (req.headers.get("content-type") || "").split(";")[0];
    if (!/^(image\/(png|jpeg|webp|gif|svg\+xml|avif)|video\/mp4|application\/(pdf|zip|x-zip-compressed)|font\/(woff2?|otf|ttf)|application\/font-woff2?|application\/x-font-(otf|ttf)|application\/octet-stream)$/.test(type)) return json({ error: "bad_type" }, 415);
    const buf = await req.arrayBuffer(); if (buf.byteLength > MAX_BLOB) return json({ error: "too_large" }, 413);
    const id = rid();
    await env.DB.prepare("INSERT INTO blobs (id, type, data, at, by) VALUES (?, ?, ?, ?, ?)").bind(id, type, buf, new Date().toISOString(), me.name).run();
    return json({ id });
  }

  if (parts[0] === "social" && req.method === "GET") return social(env, Math.min(+url.searchParams.get("days") || 30, 365));
  if (parts[0] === "stats" && req.method === "GET") {
    const days = Math.min(+url.searchParams.get("days") || 30, 365), since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
    const q = async (sql, ...b) => (await env.DB.prepare(sql).bind(...b).all()).results;
    return json({
      since, days,
      byDay: await q("SELECT day, SUM(CASE WHEN kind='view' THEN n ELSE 0 END) views, SUM(CASE WHEN kind='click' THEN n ELSE 0 END) clicks FROM hits WHERE day >= ? GROUP BY day ORDER BY day", since),
      pages: await q("SELECT path, SUM(n) n FROM hits WHERE kind='view' AND day >= ? GROUP BY path ORDER BY n DESC LIMIT 12", since),
      refs: await q("SELECT ref, SUM(n) n FROM hits WHERE kind='view' AND day >= ? AND ref != '' GROUP BY ref ORDER BY n DESC LIMIT 12", since),
      posts: await q("SELECT path post, ref, SUM(n) n FROM hits WHERE kind='click' AND day >= ? GROUP BY path, ref ORDER BY n DESC", since),
      sources: await q("SELECT ref, SUM(n) n FROM hits WHERE kind='src' AND day >= ? GROUP BY ref ORDER BY n DESC", since),
      countries: await q("SELECT ref, SUM(n) n FROM hits WHERE kind='country' AND day >= ? GROUP BY ref ORDER BY n DESC LIMIT 10", since),
      devices: await q("SELECT ref, SUM(n) n FROM hits WHERE kind='device' AND day >= ? GROUP BY ref ORDER BY n DESC", since),
      hosts: await q("SELECT ref, SUM(n) n FROM hits WHERE kind='host' AND day >= ? GROUP BY ref ORDER BY n DESC", since),
      prev: await q("SELECT SUM(CASE WHEN kind='view' THEN n ELSE 0 END) views FROM hits WHERE day >= ? AND day < ?", new Date(Date.now() - 2 * days * 864e5).toISOString().slice(0, 10), since)
    });
  }
  if (parts[0] === "ai" && parts[1] === "post" && req.method === "POST") {
    if (!env.AI) return json({ error: "no_ai" }, 501);
    const b = await req.json();
    const tone = String(b.tone || "").slice(0, 4000), brief = String(b.brief || "").slice(0, 2000), platform = String(b.platform || "linkedin"), lang = String(b.lang || "en");
    const limits = { linkedin: "up to 1200 characters, line breaks between short paragraphs, no hashtags spam (max 3)", instagram: "up to 900 characters, first line is the hook, up to 5 hashtags at the end", x: "under 260 characters, one idea, no hashtags" };
    const prompt = `You write social posts for noa, an experimental and speculative digital artist in Berlin. Her creatures, systems and instruments are described like real specimens, with a straight face. Follow this tone of voice strictly:\n${tone}\n\nWrite one ${platform} post in ${lang === "de" ? "German" : "English"} (${limits[platform] || limits.linkedin}). Plain text only, no markdown, no emojis, no em-dashes. Brief: ${brief}`;
    try { const r = await env.AI.run("@cf/meta/llama-3.3-70b-instruct-fp8-fast", { messages: [{ role: "user", content: prompt }], max_tokens: 600 }); return json({ text: String(r.response || "").trim() }); }
    catch (e) { return json({ error: "ai_failed", detail: String(e && e.message || e) }, 502); }
  }
  if (parts[0] === "live") {
    if (req.method === "GET") {
      const cur = +(await kvGet(env, "live_release")) || null;
      const { results } = await env.DB.prepare("SELECT id, ver, ver_name, by, at, pages FROM releases ORDER BY id DESC LIMIT 20").all();
      const rel = results.map(r => ({ id: r.id, ver: r.ver, verName: r.ver_name, by: r.by, at: r.at, pages: r.pages }));
      return json({ current: rel.find(r => r.id === cur) || null, releases: rel, hosts: publicHosts(env), canPublish: canPublish(env, me) });
    }
    if (!canPublish(env, me)) return json({ error: "not_allowed" }, 403);
    if (req.method === "POST" && parts[1] === "publish") {
      const b = await req.json();
      const pages = (b.pages || []).filter(p => p && typeof p.path === "string" && p.path.startsWith("/") && typeof p.html === "string");
      if (!pages.length) return json({ error: "no_pages" }, 400);
      const r = await env.DB.prepare("INSERT INTO releases (ver, ver_name, by, at, pages, css) VALUES (?, ?, ?, ?, ?, ?) RETURNING id")
        .bind(String(b.ver || ""), String(b.verName || ""), me.name, new Date().toISOString(), pages.length, String(b.css || "")).first();
      const stmts = pages.map(p => env.DB.prepare("INSERT OR REPLACE INTO release_pages (release, path, title, descr, html) VALUES (?, ?, ?, ?, ?)").bind(r.id, p.path, String(p.title || ""), String(p.desc || ""), p.html));
      for (let i = 0; i < stmts.length; i += 40) await env.DB.batch(stmts.slice(i, i + 40));
      await kvSet(env, "live_release", r.id);
      return json({ id: r.id, pages: pages.length });
    }
    if (req.method === "POST" && parts[1] === "activate") {
      const { release } = await req.json();
      const r = await env.DB.prepare("SELECT id FROM releases WHERE id = ?").bind(+release).first();
      if (!r) return json({ error: "not_found" }, 404);
      await kvSet(env, "live_release", r.id); return json({ id: r.id });
    }
  }
  return json({ error: "not_found" }, 404);
}

// ---- public pages: the HTML frozen at publish time ----
async function servePage(env, path, origin) {
  await ensureSchema(env);
  const rel = +(await kvGet(env, "live_release")) || 0;
  if (!rel) return new Response("Nothing published yet.", { status: 404, headers: { "content-type": "text/plain; charset=utf-8" } });
  if (path === "/_site.css") {
    const r = await env.DB.prepare("SELECT css FROM releases WHERE id = ?").bind(rel).first();
    return new Response(r ? r.css : "", { headers: { "content-type": "text/css; charset=utf-8", "cache-control": "public, max-age=31536000, immutable" } });
  }
  const clean = path.replace(/\/+$/, "") || "/";
  let p = await env.DB.prepare("SELECT path, title, descr, html FROM release_pages WHERE release = ? AND path = ?").bind(rel, clean).first();
  let status = 200;
  if (!p) { p = await env.DB.prepare("SELECT path, title, descr, html FROM release_pages WHERE release = ? AND path = '/404'").bind(rel).first(); status = 404; }
  if (!p) return new Response("Not found", { status: 404 });
  const canon = origin + (p.path === "/" ? "/" : p.path);
  const html = `<!doctype html><html lang="en" class="hs-pub"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escH(p.title)}</title><meta name="description" content="${escH(p.descr)}"><link rel="canonical" href="${escH(canon)}">
<meta property="og:title" content="${escH(p.title)}"><meta property="og:description" content="${escH(p.descr)}"><meta property="og:url" content="${escH(canon)}"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="preload" href="/fonts/geist-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/_site.css?r=${rel}"></head><body class="hs-pub"><div class="hs">${p.html}</div><script src="/site.js" defer></script><script src="/_site.js" defer></script></body></html>`;
  return new Response(html, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=60", "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin" } });
}
async function sitemap(env, origin) {
  await ensureSchema(env);
  const rel = +(await kvGet(env, "live_release")) || 0;
  const { results } = await env.DB.prepare("SELECT path FROM release_pages WHERE release = ? AND path != '/404'").bind(rel).all();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${results.map(r => `<url><loc>${escH(origin + r.path)}</loc></url>`).join("")}</urlset>`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=300" } });
}
async function blob(env, path) {
  await ensureSchema(env);
  const id = path.slice(7);
  const r = okId(id) ? await env.DB.prepare("SELECT type, data FROM blobs WHERE id = ?").bind(id).first() : null;
  if (!r) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(r.data), { headers: { "content-type": r.type, "cache-control": "public, max-age=31536000, immutable", "x-content-type-options": "nosniff" } });
}

// ---- contact form: stored as an inquiry, shows up in the Studio ----
async function contactForm(req, env) {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const b = await req.json().catch(() => ({}));
  const clip = (v, n) => String(v == null ? "" : v).replace(/\u0000/g, "").trim().slice(0, n);
  if (clip(b.website, 50)) return json({ ok: true }); // honeypot
  const d = { name: clip(b.name, 120), email: clip(b.email, 200), message: clip(b.message, 5000), page: clip(b.page, 200), at: new Date().toISOString() };
  if (!d.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) || !d.message) return json({ error: "invalid" }, 400);
  await ensureSchema(env);
  await env.DB.prepare("INSERT INTO docs (coll, id, data, updated, by) VALUES ('inquiries', ?, ?, ?, 'form')").bind(rid(), JSON.stringify(d), Date.now()).run();
  return json({ ok: true });
}

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
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };
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

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), host = url.hostname.toLowerCase(), p = url.pathname;
    if (p === "/studio-page") return Response.redirect(url.origin + "/about", 301);
    if (p === "/work" || p === "/work/") return Response.redirect(url.origin + "/", 301);
    if (p === "/_hit" && req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (p === "/_hit" && req.method === "POST") return beacon(req, env, ctx);
    if (p === "/_hit.js") return new Response(HIT_JS(url.origin), { headers: { "content-type": "text/javascript; charset=utf-8", "cache-control": "public, max-age=3600", ...CORS } });
    if (p.startsWith("/l/")) return trackedLink(req, env, ctx, url);
    const isAsset = /^\/(fonts|img)\//.test(p) || ["/_site.js", "/site.js", "/favicon.svg", "/robots.txt"].includes(p);
    if (p === "/_form") return contactForm(req, env).catch(() => json({ error: "server" }, 500));
    if (p.startsWith("/_blob/")) return blob(env, p);
    if (p === "/sitemap.xml") return sitemap(env, url.origin);
    if (isAsset) return env.ASSETS.fetch(req);
    const hosts = publicHosts(env);
    // the real domain only serves the website; the Studio lives on the workers.dev address (or a studio. subdomain)
    if (hosts.includes(host)) {
      if (host !== hosts[0]) return Response.redirect(`https://${hosts[0]}${p}${url.search}`, 301);
      return servePage(env, p, url.origin);
    }
    if (p.startsWith("/api/")) { try { return await api(req, env, url); } catch (e) { return json({ error: "server", detail: String(e && e.message || e) }, 500); } }
    if (p === "/studio") return Response.redirect(url.origin + "/studio/", 302);
    if (p.startsWith("/studio/")) {
      const me = await viewer(req, env);
      if (!(me && me.name)) return new Response("Login required", { status: 401 });
      const file = p === "/studio/" ? "/studio" : p.slice(7);
      const r = await env.ASSETS.fetch(new Request(url.origin + file, req));
      const h = new Headers(r.headers); h.set("cache-control", "no-store");
      return new Response(r.body, { status: r.status, headers: h });
    }
    return servePage(env, p, url.origin);
  }
};
