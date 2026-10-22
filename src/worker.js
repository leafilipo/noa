// noa site (fork of the Huit builder): public website from published releases + Studio (editor) behind Cloudflare Access.
// Same engine as the Northern Lights Studio: documents in D1, images as blobs, publishing = frozen HTML snapshots.
// Routing only; the parts live in lib.js, access.js, api.js, site.js and analytics.js.
import { json, publicHosts, CORS } from "./lib.js";
import { viewer } from "./access.js";
import { api } from "./api.js";
import { servePage, sitemap, blob, contactForm } from "./site.js";
import { beacon, HIT_JS, trackedLink } from "./analytics.js";

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), host = url.hostname.toLowerCase(), p = url.pathname;
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
