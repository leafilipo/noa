// Analytics view: the public site (views, pages, sources, countries, devices) and the socials (Postiz or hand-logged).
(function () {
  const X = window.HSX, { esc } = window.HS, PLAT = window.HS_PLATFORMS;
  const $ = (s, r) => (r || document).querySelector(s);
  const P = () => window.HSP, posts = () => P().data().posts, fmtD = d => P().fmtD(d), num = n => P().num(n);
  const PIL = () => window.HS_PILLARS || [];
  let stats = null;
  async function loadSocial() { try { const d = await X.req("GET", "/api/db/settings/social"); socDoc = Object.assign({ id: "social", updated: d.updated }, d.data); } catch (e) { socDoc = { id: "social", updated: null, log: { linkedin: [], instagram: [], x: [] } }; } }

  let range = 30, soc = null, socDoc = null;
  const CN = { DE: "Germany", US: "United States", GB: "United Kingdom", FR: "France", CH: "Switzerland", AT: "Austria", NL: "Netherlands", ES: "Spain", IT: "Italy", PT: "Portugal", SE: "Sweden", DK: "Denmark", PL: "Poland", BE: "Belgium", CA: "Canada", AU: "Australia", IN: "India", BR: "Brazil", SG: "Singapore", AE: "United Arab Emirates", JP: "Japan", IE: "Ireland", NO: "Norway", FI: "Finland", CZ: "Czechia" };
  const cname = c => CN[c] || c;
  function analytics(box) {
    box = box || $("#st-view");
    if (!soc || soc.days !== range) { soc = { days: range, channels: [], loading: true }; X.req("GET", "/api/social?days=" + range).then(r => { soc = Object.assign({ days: range }, r); if (X.state.view === "stats") analytics(box); }).catch(() => { soc = { days: range, connected: false, channels: [] }; }); }
    if (!stats || stats.days !== range) { X.req("GET", "/api/stats?days=" + range).then(s => { stats = s; if (X.state.view === "stats") analytics(box); }).catch(() => {}); box.innerHTML = `<div class="st-vwrap st-an"><div class="st-vh"><h1>Analytics</h1><p class="st-m">Loading…</p></div></div>`; return; }
    const days = []; for (let i = stats.days - 1; i >= 0; i--) days.push(new Date(Date.now() - i * 864e5).toISOString().slice(0, 10));
    const by = Object.fromEntries(stats.byDay.map(d => [d.day, d])); const views = days.map(d => (by[d] || {}).views || 0), clicks = days.map(d => (by[d] || {}).clicks || 0);
    const tv = views.reduce((a, b) => a + b, 0), tc = clicks.reduce((a, b) => a + b, 0), max = Math.max(1, ...views), prev = (stats.prev && stats.prev[0] && stats.prev[0].views) || 0;
    const delta = prev ? Math.round((tv - prev) / prev * 100) : null;
    const W = 900, H = 160, bw = W / days.length;
    const bars = views.map((v, i) => `<rect x="${(i * bw).toFixed(1)}" y="${(H - v / max * H).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${(v / max * H).toFixed(1)}" rx="1.5"><title>${fmtD(days[i])}: ${v} views${clicks[i] ? ", " + clicks[i] + " from posts" : ""}</title></rect>`).join("");
    const cl = clicks.map((v, i) => v ? `<rect class="c" x="${(i * bw).toFixed(1)}" y="${(H - v / max * H).toFixed(1)}" width="${Math.max(1, bw - 2).toFixed(1)}" height="${(v / max * H).toFixed(1)}" rx="1.5"></rect>` : "").join("");
    const srcName = r => { const p = posts().find(x => "post-" + x.id === r); return p ? "Post: " + (p.title || "Untitled") : r; };
    const sources = [...stats.sources.map(s => ({ ref: srcName(s.ref), n: s.n })), ...stats.refs]; const direct = tv - stats.refs.reduce((a, r) => a + r.n, 0); if (direct > 0) sources.push({ ref: "Direct, typed or from a message", n: direct }); sources.sort((a, b) => b.n - a.n);
    const list = (rows, label) => rows.length ? rows.map(r => `<div class="st-an-row"><span>${esc(label ? label(r) : r.ref)}</span><i style="width:${Math.round(r.n / Math.max(1, rows[0].n) * 100)}%"></i><b>${num(r.n)}</b></div>`).join("") : "<p class='st-m'>Nothing yet.</p>";
    const dev = stats.devices.reduce((a, d) => a + d.n, 0);
    box.innerHTML = `<div class="st-vwrap st-an">
      <div class="st-vh st-an-h"><div><h1>noa</h1><p>What the public site does. Views only, no cookies, nothing personal.</p></div><div class="st-seg">${[7, 30, 90].map(d => `<button class="${range === d ? "on" : ""}" data-range="${d}">${d} days</button>`).join("")}</div></div>
      <div class="st-an-tiles"><div class="st-an-tile"><span class="st-m">Views</span><b>${num(tv)}</b>${delta != null ? `<span class="st-m ${delta >= 0 ? "st-up" : "st-down"}">${delta >= 0 ? "+" : ""}${delta}% on the ${range} days before</span>` : `<span class="st-m">${num(Math.round(tv / stats.days * 7))} a week</span>`}</div><div class="st-an-tile"><span class="st-m">Top page</span><b>${esc((stats.pages[0] || {}).path || "–")}</b><span class="st-m">${num((stats.pages[0] || {}).n)} views</span></div><div class="st-an-tile"><span class="st-m">Top source</span><b>${esc(sources[0] ? sources[0].ref : "–")}</b><span class="st-m">${num(sources[0] ? sources[0].n : 0)} views</span></div><div class="st-an-tile"><span class="st-m">From our posts</span><b>${num(tc)}</b><span class="st-m">clicks on tracked links</span></div></div>
      <div class="st-an-chart"><svg viewBox="0 0 ${W} ${H + 18}" preserveAspectRatio="none" aria-label="Views per day">${bars}${cl}<text x="0" y="${H + 14}">${esc(fmtD(days[0]))}</text><text x="${W}" y="${H + 14}" text-anchor="end">${esc(fmtD(days[days.length - 1]))}</text></svg></div>
      <div class="st-an-cols">
        <div><h3>Pages</h3>${list(stats.pages.map(p => ({ ref: p.path, n: p.n })))}</div>
        <div><h3>Where visits come from</h3>${list(sources.slice(0, 12))}</div>
        <div><h3>Countries</h3>${list(stats.countries, r => cname(r.ref))}<h3 style="margin-top:22px">Devices</h3>${stats.devices.length ? `<div class="st-an-dev">${stats.devices.map(d => `<span><b>${Math.round(d.n / dev * 100)}%</b> ${esc(d.ref)}</span>`).join("")}</div>` : "<p class='st-m'>Nothing yet.</p>"}</div>
      </div>
      ${stats.hosts && stats.hosts.length > 1 ? `<p class="st-m">Counted across ${stats.hosts.map(h => `<b>${esc(h.ref)}</b> ${num(h.n)}`).join(" · ")}.</p>` : stats.hosts && stats.hosts.length === 1 && stats.hosts[0].ref !== "huit.studio" ? `<p class="st-m">Only ${esc(stats.hosts[0].ref)} is counted so far. To count the current huit.studio as well, add this one line to its <code>&lt;head&gt;</code>: <code>&lt;script src="${esc(location.origin)}/_hit.js" async&gt;&lt;/script&gt;</code></p>` : ""}
      <div class="st-vh" style="margin-top:12px"><h1>Socials</h1><p>${soc && soc.connected ? "Live from Postiz, refreshed every hour." : "Followers logged by hand, impressions and likes from the posts. Connect Postiz for live numbers, see the note at the bottom."}</p></div>
      ${socials()}
      <p class="st-m">Post by post numbers, clicks and the campaign timelines live in <button class="st-link" data-gov="posts">Posts</button>.</p>
    </div>`;
  }
  const since = () => new Date(Date.now() - range * 864e5).toISOString().slice(0, 10);
  function socials() {
    const log = (socDoc && socDoc.log) || {};
    if (soc && soc.connected && soc.channels.length) {
      return `<div class="st-soc">${soc.channels.map(ch => { const m = k => ch.metrics.find(x => new RegExp(k, "i").test(x.label)); const fol = m("follow"), imp = m("impress|reach|views"), eng = m("like|engage");
        return `<div class="st-soc-card"><div class="st-soc-h">${ch.picture ? `<img src="${esc(ch.picture)}" alt="">` : ""}<div><b>${esc(ch.name)}</b><span class="st-m">${esc(ch.identifier || "")}</span></div></div>
          <div class="st-soc-nums">${[["Followers", fol, true], ["Impressions", imp], ["Engagement", eng]].map(([l, x, last]) => `<span><b>${x ? num(last && x.last != null ? x.last : x.total) : "–"}</b>${l}${x && x.change != null ? `<em class="${x.change >= 0 ? "st-up" : "st-down"}">${x.change >= 0 ? "+" : ""}${Math.round(x.change)}%</em>` : ""}</span>`).join("")}</div>
          ${fol && fol.series.length > 1 ? spark(fol.series.map(x => x[1])) : ""}</div>`; }).join("")}</div>`;
    }
    return `<div class="st-soc">${Object.entries(PLAT).map(([k, pl]) => {
      const L = (log[k] || []).slice().sort((a, b) => a.d.localeCompare(b.d)), last = L[L.length - 1], prevE = L.length > 1 ? L[L.length - 2] : null;
      const ps = posts().filter(p => p.status === "published" && (p.platform === k || (p.texts[k] && p.metrics[k])) && (!p.date || p.date >= since()));
      const sum = f => ps.reduce((a, p) => a + (+(p.metrics[k] || {})[f] || 0), 0);
      return `<div class="st-soc-card"><div class="st-soc-h"><div><b>${pl.name}</b><a class="st-m" href="${esc(pl.url)}" target="_blank" rel="noopener">${esc(pl.url.replace(/^https?:\/\/(www\.)?/, ""))} ↗</a></div></div>
        <div class="st-soc-nums"><span><b>${last ? num(last.followers) : "–"}</b>Followers${last && prevE ? `<em class="${last.followers >= prevE.followers ? "st-up" : "st-down"}">${last.followers >= prevE.followers ? "+" : ""}${num(last.followers - prevE.followers)} since ${fmtD(prevE.d)}</em>` : last ? `<em>${fmtD(last.d)}</em>` : ""}</span><span><b>${ps.length}</b>Posts, ${range} d</span><span><b>${num(sum("impressions"))}</b>Impressions</span><span><b>${num(sum("likes") + sum("comments"))}</b>Likes and comments</span></div>
        ${L.length > 1 ? spark(L.map(x => x.followers)) : ""}
        <form class="st-soc-log" data-soclog="${k}"><input class="st-in" type="number" min="0" name="followers" placeholder="Followers today" aria-label="Followers today"><button class="st-btn" type="submit">Log</button>${last ? `<span class="st-m">last: ${num(last.followers)} on ${fmtD(last.d)}</span>` : ""}</form></div>`; }).join("")}</div>
      <p class="st-m">For live numbers: get an API key from Postiz (Settings → Public API), add it as a secret named <code>POSTIZ_API_KEY</code> on the Worker, and connect LinkedIn, Instagram and X there. Followers, impressions and engagement then show up here on their own, and scheduling from the Studio becomes possible too.</p>`;
  }
  function spark(vals) { const W = 300, H = 36, mx = Math.max(...vals), mn = Math.min(...vals), r = mx - mn || 1; const pts = vals.map((v, i) => `${(i / (vals.length - 1) * W).toFixed(1)},${(H - 3 - (v - mn) / r * (H - 6)).toFixed(1)}`).join(" "); return `<svg class="st-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`; }
  document.addEventListener("click", e => {
    const t = e.target, c = s => t.closest(s); if (!c("#st-view") || X.state.view !== "stats") return;
    if (c("[data-range]")) { range = +c("[data-range]").dataset.range; stats = null; analytics(); }
    if (c("[data-gov]")) { const b = $(`#st-side [data-view="posts"]`); if (b) b.click(); }
  });
  document.addEventListener("submit", async e => {
    const f = e.target; if (!f.matches("[data-soclog]")) return; e.preventDefault(); const v = +f.followers.value; if (!v) return;
    socDoc.log = socDoc.log || {}; const k = f.dataset.soclog, d = new Date().toISOString().slice(0, 10); socDoc.log[k] = (socDoc.log[k] || []).filter(x => x.d !== d).concat([{ d, followers: v }]).slice(-120);
    const { id, updated, ...data } = socDoc; try { const r = await X.req("PUT", "/api/db/settings/social", { data, base: updated }); socDoc.updated = r.updated; X.toast("Logged."); } catch (err) { X.toast("Not saved."); }
    analytics();
  });
  window.HSA = { analytics, load: loadSocial };
  loadSocial();
})();
