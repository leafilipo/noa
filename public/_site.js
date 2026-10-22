// Public site runtime: menu, reveal on scroll, package tabs, local time, dark mode, contact form.
(function () {
  const site = document.querySelector(".hs"), nav = document.querySelector(".hs-nav"), bur = document.querySelector(".hs-burger");
  if (bur) bur.addEventListener("click", () => { const o = nav.classList.toggle("open"); bur.setAttribute("aria-expanded", o); });
  const rv = document.querySelectorAll(".hs-rv");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -6% 0px", threshold: .05 });
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add("in"));
  // nav pill: a blob that slides under the hovered tab and settles back on the current page
  document.querySelectorAll(".nf-pill").forEach(pill => {
    const blob = document.createElement("span"); blob.className = "nf-blob"; pill.prepend(blob);
    const to = a => { if (!a) { blob.style.width = "0"; return; } const pr = pill.getBoundingClientRect(), ar = a.getBoundingClientRect(); blob.style.left = (ar.left - pr.left) + "px"; blob.style.width = ar.width + "px"; };
    const home = () => { pill.querySelectorAll("a").forEach(x => x.classList.remove("lit")); to(pill.querySelector("a.on")); };
    pill.querySelectorAll("a").forEach(a => a.addEventListener("pointerenter", () => { pill.querySelectorAll("a").forEach(x => x.classList.remove("lit")); a.classList.add("lit"); to(a); }));
    pill.addEventListener("pointerleave", home);
    requestAnimationFrame(() => { blob.style.transition = "none"; home(); requestAnimationFrame(() => blob.style.transition = ""); });
    if (document.fonts) document.fonts.ready.then(home);
  });
  // tabs
  document.querySelectorAll("[data-tabs]").forEach(bar => bar.addEventListener("click", e => {
    const t = e.target.closest("[data-tab]"); if (!t) return;
    const sec = bar.closest(".hs-s"); bar.querySelectorAll("[data-tab]").forEach(b => b.classList.toggle("on", b === t));
    sec.querySelectorAll("[data-pane]").forEach(p => p.classList.toggle("on", p.dataset.pane === t.dataset.tab));
  }));
  // local time of the studio
  const clocks = document.querySelectorAll("[data-clock]");
  const tick = () => clocks.forEach(c => { try { c.textContent = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: c.dataset.clock }).format(new Date()); } catch (e) {} });
  if (clocks.length) { tick(); setInterval(tick, 15000); }
  // light first; dark only when the visitor picks it (remembered in this browser)
  let dark = null; try { dark = localStorage.getItem("hs-dark"); } catch (e) {}
  const apply = () => site && site.classList.toggle("dark", dark === "1");
  apply();
  document.querySelectorAll("[data-theme]").forEach(b => b.addEventListener("click", () => { dark = site.classList.contains("dark") ? "0" : "1"; try { localStorage.setItem("hs-dark", dark); } catch (e) {} apply(); }));
  // bench: visitors rearrange the grid; it resets on reload
  document.querySelectorAll("[data-bench]").forEach(g => window.HS && window.HS.bench(g));
  document.querySelectorAll("[data-gallery]").forEach(r => window.HS && window.HS.gallery(r));
  document.querySelectorAll("[data-creature]").forEach(r => window.HS && window.HS.creature(r));
  document.querySelectorAll("[data-date]").forEach(d => { try { d.textContent = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date()).toLowerCase(); } catch (e) {} });
  document.querySelectorAll("[data-estimate]").forEach(r => window.HS && window.HS.estimate(r));
  // cookie banner: show once, remember the answer; "No counting" switches the view counter off in this browser
  let consent = null; try { consent = localStorage.getItem("hs-consent"); } catch (e) {}
  const banner = document.querySelector(".hs-consent");
  if (banner) { if (consent == null) banner.hidden = false; banner.querySelectorAll("[data-consent]").forEach(b => b.addEventListener("click", () => { consent = b.dataset.consent; try { localStorage.setItem("hs-consent", consent); } catch (e) {} banner.hidden = true; if (consent === "1") count(); })); }
  // one anonymous page view per load: path, referrer host and the src tag from tracked links. No cookies.
  function count() { try { const u = new URL(location.href); const body = JSON.stringify({ path: u.pathname, ref: document.referrer || "", src: u.searchParams.get("src") || "", host: location.hostname }); if (!(navigator.sendBeacon && navigator.sendBeacon("/_hit", new Blob([body], { type: "application/json" })))) fetch("/_hit", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true }).catch(() => {}); } catch (e) {} }
  if (consent !== "0" && !(banner && consent == null)) count();
  // contact form
  document.querySelectorAll("[data-form]").forEach(form => form.addEventListener("submit", async e => {
    e.preventDefault(); const msg = form.querySelector(".hs-form-msg"), b = form.querySelector("button[type=submit]");
    const d = Object.fromEntries(new FormData(form)); d.page = location.pathname; if (d.package) d.message = "[" + d.package + "] " + d.message; if (d.estimate) d.message = "[" + d.estimate + "]\n" + d.message;
    if (!d.email || !d.message) { msg.textContent = "Please add your email and a message."; return; }
    b.disabled = true; msg.textContent = "Sending…";
    try { const r = await fetch("/_form", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(d) }); if (!r.ok) throw 0; form.reset(); msg.textContent = "Thanks, I’ll write back soon."; }
    catch (e) { msg.textContent = "That didn’t go through. Email works too."; }
    b.disabled = false;
  }));
})();
