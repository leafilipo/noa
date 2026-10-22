// Shared helpers: responses, ids, schema, key-value store, site settings.
export const COLLS = new Set(["versions", "comments", "inquiries", "settings", "posts", "campaigns"]);
export const MAX_DOC = 1_500_000, MAX_BLOB = 1_900_000;
export const json = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
export const rid = () => crypto.randomUUID().replace(/-/g, "").slice(0, 20);
export const okId = s => /^[A-Za-z0-9_\-.~:@+]{1,200}$/.test(s);
export const escH = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const list = v => String(v || "").split(",").map(x => x.trim()).filter(Boolean);
export const publicHosts = env => list(env.PUBLIC_HOSTS).map(x => x.toLowerCase());
export const canPublish = (env, me) => !!(me && me.name && list(env.PUBLISHERS || "Lea").includes(me.name));
export const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };
// a body that is not JSON answers 400 instead of blowing up as a 500
export const readJson = async req => { try { return await req.json(); } catch (e) { return null; } };

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

export { ensureSchema, kvGet, kvSet };
