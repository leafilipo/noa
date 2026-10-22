// The public website: pages frozen at publish time, the sitemap, blobs and the contact form.
import { json, rid, okId, escH, ensureSchema, kvGet, readJson } from "./lib.js";

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
  const b = (await readJson(req)) || {};
  const clip = (v, n) => String(v == null ? "" : v).replace(/\u0000/g, "").trim().slice(0, n);
  if (clip(b.website, 50)) return json({ ok: true }); // honeypot
  const d = { name: clip(b.name, 120), email: clip(b.email, 200), message: clip(b.message, 5000), page: clip(b.page, 200), at: new Date().toISOString() };
  if (!d.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(d.email) || !d.message) return json({ error: "invalid" }, 400);
  await ensureSchema(env);
  await env.DB.prepare("INSERT INTO docs (coll, id, data, updated, by) VALUES ('inquiries', ?, ?, ?, 'form')").bind(rid(), JSON.stringify(d), Date.now()).run();
  return json({ ok: true });
}


export { servePage, sitemap, blob, contactForm };
