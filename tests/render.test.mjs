// The site engine, as the Studio uses it to publish: every seeded route renders, with the markup the public runtime needs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

function load() {
  const win = { addEventListener() {}, matchMedia: () => ({ matches: false }) };
  const doc = { addEventListener() {}, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ getContext: () => null, style: {} }), fonts: null };
  const ctx = { window: win, document: doc, location: { origin: "https://huit.studio", hostname: "huit.studio", href: "https://huit.studio/" }, localStorage: { getItem: () => null, setItem() {} }, navigator: {}, console, Math, JSON, Date, Intl, URL, setTimeout, clearTimeout, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, Path2D: class {}, ResizeObserver: class { observe() {} }, IntersectionObserver: class { observe() {} } };
  ctx.self = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(readFileSync(new URL("../public/site.js", import.meta.url), "utf8"), ctx);
  return win.HS;
}

test("every seeded route renders a page with a title, and nothing throws", () => {
  const HS = load(); const V = JSON.parse(JSON.stringify(HS.SEED));
  const routes = HS.routes(V); assert.ok(routes.length >= 8, "routes: " + routes.join(" "));
  const R = HS.make(V, { edit: false });
  for (const r of routes) {
    const page = R.page(r);
    assert.ok(page && typeof page.html === "string" && page.html.length > 200, r);
    assert.ok(page.title && page.title.length > 2, r + " has a title");
    assert.doesNotMatch(page.html, /undefined|\[object Object\]|NaN/, r + " renders clean");
  }
});

test("the home page carries the nav, the footer, the consent banner and a page-view beacon hook", () => {
  const HS = load(); const V = JSON.parse(JSON.stringify(HS.SEED));
  const home = HS.make(V, { edit: false }).page("/").html;
  assert.match(home, /class="nf-nav"/); assert.match(home, /class="nf-foot"/); assert.match(home, /class="hs-consent"/); assert.match(home, /data-consent="0"/);
  assert.match(home, /href="\/contact"/, "the nav links to Contact");
  assert.match(home, /nf-home|data-bench/, "the home page is the noa home");
});

test("edit mode marks fields, view mode does not", () => {
  const HS = load(); const V = JSON.parse(JSON.stringify(HS.SEED));
  assert.match(HS.make(V, { edit: true }).page("/about").html, /data-f="/);
  assert.doesNotMatch(HS.make(V, { edit: false }).page("/about").html, /data-f="/);
});

test("a case study page renders from the case data, hidden cases are off the public routes", () => {
  const HS = load(); const V = JSON.parse(JSON.stringify(HS.SEED));
  const c = V.cases[0]; const page = HS.make(V, { edit: false }).page("/work/" + c.slug);
  assert.equal(page.kind, "case"); assert.match(page.html, new RegExp(c.client));
  c.hidden = true; assert.equal(HS.routes(V).includes("/work/" + c.slug), false);
});

test("the gallery page renders its creatures", () => {
  const HS = load(); const V = JSON.parse(JSON.stringify(HS.SEED));
  const page = HS.make(V, { edit: false }).page("/gallery");
  assert.ok(page && page.html.length > 200); assert.match(page.html, /class="nf-nav"/);
});
