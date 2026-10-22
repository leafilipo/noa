// The Worker, end to end against a fresh local instance: login, documents, publishing, the public site, analytics, the form.
import { test } from "node:test";
import assert from "node:assert/strict";

const base = process.env.TEST_BASE || "http://localhost:8799";
const PUB = base.replace("localhost", "127.0.0.1"); // the "real domain" in the test config
const as = email => ({ "cf-access-authenticated-user-email": email });
const lea = as("lea@huit.studio"), guest = as("guest@example.com");
const api = async (method, path, body, headers = lea, type = "application/json") => {
  const r = await fetch(base + path, { method, headers: { ...headers, ...(body != null ? { "content-type": type } : {}) }, body: body == null ? undefined : (typeof body === "string" || body instanceof ArrayBuffer ? body : JSON.stringify(body)) });
  let data = null; try { data = await r.json(); } catch (e) {}
  return { status: r.status, data, headers: r.headers };
};

test("login: no identity is 401, an unknown identity is 403, a known one gets a name", async () => {
  assert.equal((await api("GET", "/api/me", null, {})).status, 401);
  const stranger = await api("GET", "/api/me", null, as("nobody@example.com"));
  assert.equal(stranger.status, 403); assert.equal(stranger.data.error, "not_invited");
  const me = await api("GET", "/api/me");
  assert.equal(me.status, 200); assert.equal(me.data.name, "Lea"); assert.equal(me.data.canPublish, true);
  const g = await api("GET", "/api/me", null, guest); assert.equal(g.data.canPublish, false);
});

test("the Studio is behind the login; the public site is not", async () => {
  assert.equal((await fetch(base + "/studio/")).status, 401);
  assert.equal((await fetch(base + "/studio/", { headers: lea })).status, 200);
  const pub = await fetch(PUB + "/"); assert.equal(pub.status, 404); assert.match(await pub.text(), /Nothing published/);
});

test("documents: save, list, update with the base, conflict on a stale base, delete", async () => {
  let r = await api("PUT", "/api/db/settings/t1", { data: { a: 1 } });
  assert.equal(r.status, 200); const first = r.data.updated; assert.ok(first > 0);
  r = await api("GET", "/api/db/settings"); assert.equal(r.data.docs.find(d => d.id === "t1").data.a, 1);
  r = await api("PUT", "/api/db/settings/t1", { data: { a: 2 }, base: first }); assert.equal(r.status, 200);
  const second = r.data.updated;
  r = await api("PUT", "/api/db/settings/t1", { data: { a: 3 }, base: first }); // a stale tab, same user
  assert.equal(r.status, 409); assert.equal(r.data.error, "conflict"); assert.equal(r.data.doc.data.a, 2); assert.equal(r.data.doc.updated, second);
  r = await api("PUT", "/api/db/settings/t1", { data: { a: 3 }, base: second }); assert.equal(r.status, 200);
  assert.equal((await api("PUT", "/api/db/settings/t1", "{not json", lea)).status, 400);
  assert.equal((await api("PUT", "/api/db/settings/t1", { nothing: true })).status, 400);
  assert.equal((await api("PUT", "/api/db/nope/t1", { data: {} })).status, 404);
  assert.equal((await api("PUT", "/api/db/settings/bad id", { data: {} })).status, 400);
  r = await api("DELETE", "/api/db/settings/t1"); assert.equal(r.status, 200);
  r = await api("GET", "/api/db/settings"); assert.equal(r.data.docs.find(d => d.id === "t1"), undefined);
});

test("blobs: an image goes in and comes back with its type; other types are refused", async () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13]).buffer;
  const r = await api("POST", "/api/blob", png, lea, "image/png"); assert.equal(r.status, 200);
  const g = await fetch(`${base}/_blob/${r.data.id}`); assert.equal(g.status, 200); assert.equal(g.headers.get("content-type"), "image/png"); assert.equal((await g.arrayBuffer()).byteLength, 12);
  assert.equal((await api("POST", "/api/blob", "hello", lea, "text/html")).status, 415);
  assert.equal((await fetch(`${base}/_blob/doesnotexist`)).status, 404);
});

test("publishing: a release freezes the HTML, the public site serves it, the sitemap lists it, a rollback works", async () => {
  const pages = [
    { path: "/", title: "Home · Test", desc: "A test home", html: '<main class="hs-main"><h1>Hello</h1><a href="/about">About</a></main>' },
    { path: "/about", title: "About · Test", desc: "About us", html: "<main><h1>About</h1></main>" },
    { path: "/404", title: "Not found", desc: "", html: "<main><h1>Nope</h1></main>" }
  ];
  assert.equal((await api("POST", "/api/live/publish", { ver: "v1", verName: "V1", css: ".hs{color:red}", pages }, guest)).status, 403);
  let r = await api("POST", "/api/live/publish", { ver: "v1", verName: "V1", css: ".hs{color:red}", pages });
  assert.equal(r.status, 200); const rel1 = r.data.id; assert.equal(r.data.pages, 3);
  assert.equal((await api("POST", "/api/live/publish", { pages: [] })).status, 400);
  let h = await fetch(PUB + "/"); assert.equal(h.status, 200); let t = await h.text();
  assert.match(t, /<title>Home · Test<\/title>/); assert.match(t, /<h1>Hello<\/h1>/); assert.match(t, /rel="canonical" href="http:\/\/127\.0\.0\.1:\d+\/"/); assert.match(t, /\/site\.js/);
  h = await fetch(PUB + "/about/"); assert.equal(h.status, 200); assert.match(await h.text(), /<h1>About<\/h1>/); // trailing slash tolerated
  h = await fetch(PUB + "/missing"); assert.equal(h.status, 404); assert.match(await h.text(), /<h1>Nope<\/h1>/);
  const css = await fetch(PUB + "/_site.css"); assert.equal(await css.text(), ".hs{color:red}");
  const sm = await (await fetch(PUB + "/sitemap.xml")).text(); assert.match(sm, /<loc>http:\/\/127\.0\.0\.1:\d+\/about<\/loc>/); assert.doesNotMatch(sm, /\/404</);
  // a second release goes live, then the first one is put back
  r = await api("POST", "/api/live/publish", { ver: "v2", verName: "V2", css: "", pages: [{ path: "/", title: "Two", desc: "", html: "<main><h1>Two</h1></main>" }] });
  assert.equal(r.status, 200); const rel2 = r.data.id;
  assert.match(await (await fetch(PUB + "/")).text(), /<h1>Two<\/h1>/);
  const live = await api("GET", "/api/live"); assert.equal(live.data.current.id, rel2); assert.ok(live.data.releases.length >= 2);
  r = await api("POST", "/api/live/activate", { release: rel1 }); assert.equal(r.status, 200);
  assert.match(await (await fetch(PUB + "/")).text(), /<h1>Hello<\/h1>/);
  assert.equal((await api("POST", "/api/live/activate", { release: 999999 })).status, 404);
});

test("analytics: the beacon counts a view, a tracked link counts a click and redirects, stats add up", async () => {
  await api("PUT", "/api/db/posts/pt1", { data: { title: "T", link: "/about", texts: {}, card: {} } });
  let r = await fetch(base + "/_hit", { method: "POST", headers: { "content-type": "application/json", "user-agent": "Mozilla iPhone" }, body: JSON.stringify({ path: "/", ref: "https://www.linkedin.com/feed", src: "", host: "pub.example" }) });
  assert.equal(r.status, 204); assert.equal(r.headers.get("access-control-allow-origin"), "*");
  assert.equal((await fetch(base + "/_hit", { method: "OPTIONS" })).status, 204);
  const js = await fetch(base + "/_hit.js"); assert.equal(js.headers.get("content-type"), "text/javascript; charset=utf-8"); assert.match(await js.text(), /_hit/);
  r = await fetch(base + "/l/pt1?p=linkedin", { redirect: "manual" });
  assert.equal(r.status, 302); const loc = new URL(r.headers.get("location")); assert.equal(loc.pathname, "/about"); assert.equal(loc.searchParams.get("src"), "post-pt1");
  r = await fetch(base + "/l/unknown", { redirect: "manual" }); assert.equal(r.status, 302); assert.equal(new URL(r.headers.get("location")).pathname, "/");
  await new Promise(res => setTimeout(res, 400)); // the counters are written after the response
  const s = await api("GET", "/api/stats?days=7"); assert.equal(s.status, 200);
  const today = new Date().toISOString().slice(0, 10), day = s.data.byDay.find(d => d.day === today);
  assert.ok(day && day.views >= 1 && day.clicks >= 2);
  assert.ok(s.data.refs.some(x => x.ref === "linkedin.com")); assert.ok(s.data.devices.some(x => x.ref === "phone")); assert.ok(s.data.hosts.some(x => x.ref === "pub.example"));
  assert.ok(s.data.posts.some(x => x.post === "pt1" && x.ref === "linkedin"));
  const soc = await api("GET", "/api/social"); assert.equal(soc.data.connected, false);
});

test("contact form: a valid message becomes an inquiry, junk is refused, the honeypot is silent", async () => {
  let r = await api("POST", "/_form", { name: "A", email: "a@example.com", message: "Hello there", page: "/start" }, {});
  assert.equal(r.status, 200);
  const inq = await api("GET", "/api/db/inquiries"); assert.ok(inq.data.docs.some(d => d.data.email === "a@example.com" && d.by === "form"));
  assert.equal((await api("POST", "/_form", { email: "not-an-email", message: "x" }, {})).status, 400);
  assert.equal((await api("POST", "/_form", "garbage", {}, "application/json")).status, 400);
  r = await api("POST", "/_form", { email: "bot@example.com", message: "spam", website: "http://spam" }, {}); assert.equal(r.status, 200);
  assert.equal((await api("GET", "/api/db/inquiries")).data.docs.some(d => d.data.email === "bot@example.com"), false);
  assert.equal((await fetch(base + "/_form")).status, 405);
});

test("redirects and assets", async () => {
  const r = await fetch(base + "/work", { redirect: "manual" }); assert.equal(r.status, 301); assert.match(r.headers.get("location"), /\/$/);
  assert.equal((await fetch(base + "/studio", { redirect: "manual" })).status, 302);
  assert.equal((await fetch(base + "/site.js")).status, 200);
  assert.equal((await fetch(base + "/favicon.svg")).headers.get("content-type").includes("svg"), true);
});
