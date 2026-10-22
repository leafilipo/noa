// The Studio's API: documents, blobs, AI drafts, releases. Everything here is behind Access.
import { COLLS, MAX_DOC, MAX_BLOB, json, rid, okId, publicHosts, canPublish, ensureSchema, kvGet, kvSet, readJson } from "./lib.js";
import { viewer } from "./access.js";
import { social, stats } from "./analytics.js";

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
      let b; try { b = JSON.parse(text); } catch (e) { return json({ error: "bad_json" }, 400); }
      if (!b || typeof b !== "object" || b.data === undefined) return json({ error: "bad_body" }, 400);
      // optimistic check: the client sends the "updated" it last saw; a newer save by someone else wins and is returned
      if (b.base != null) {
        const cur = await env.DB.prepare("SELECT data, updated, by FROM docs WHERE coll = ? AND id = ?").bind(coll, id).first();
        if (cur && cur.updated !== b.base) return json({ error: "conflict", doc: { id, data: JSON.parse(cur.data), updated: cur.updated, by: cur.by } }, 409);
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
  if (parts[0] === "stats" && req.method === "GET") return stats(env, Math.min(+url.searchParams.get("days") || 30, 365));
  if (parts[0] === "ai" && parts[1] === "post" && req.method === "POST") {
    if (!env.AI) return json({ error: "no_ai" }, 501);
    const b = (await readJson(req)) || {};
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
      const b = (await readJson(req)) || {};
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
      const { release } = (await readJson(req)) || {};
      const r = await env.DB.prepare("SELECT id FROM releases WHERE id = ?").bind(+release).first();
      if (!r) return json({ error: "not_found" }, 404);
      await kvSet(env, "live_release", r.id); return json({ id: r.id });
    }
  }
  return json({ error: "not_found" }, 404);
}


export { api };
