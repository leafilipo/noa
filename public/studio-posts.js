// Posts: campaigns, a calendar, the queue, a text per platform, AI draft in the studio's voice, branded image, tracked links, analytics.
(function () {
  const X = window.HSX, { esc, src } = window.HS;
  const $ = (s, r) => (r || document).querySelector(s);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const PLAT = { linkedin: { name: "LinkedIn", url: "https://www.linkedin.com/", max: 3000, sizes: [["1200×627", 1200, 627], ["1080×1350", 1080, 1350]] }, instagram: { name: "Instagram", url: "https://www.instagram.com/", max: 2200, sizes: [["1080×1350", 1080, 1350], ["1080×1080", 1080, 1080], ["1080×1920", 1080, 1920]] }, x: { name: "X", url: "https://x.com/", max: 280, sizes: [["1600×900", 1600, 900], ["1080×1080", 1080, 1080]] } };
  const STATUS = ["idea", "draft", "scheduled", "published"];
  const PIL = () => window.HS_PILLARS || []; const pil = id => PIL().find(x => x.id === id);
  const badge = id => { const x = pil(id); return x ? `<span class="st-pil" style="--pc:${x.color}">${esc(x.name)}</span>` : ""; };
  let pfil = "", tgtDoc = null, tgtOpen = false;
  const TGT_DEFAULT = { work: 2, pov: 2, craft: 1, report: 1, tools: 2, studio: 1 };
  let posts = [], camps = [], loaded = false, open = null, tab = "queue", filter = "", saveT = {}, stats = null, month = null, campOpen = null;

  async function load() {
    const [r, c] = await Promise.all([X.req("GET", "/api/db/posts"), X.req("GET", "/api/db/campaigns")]);
    posts = r.docs.map(d => Object.assign({ id: d.id, updated: d.updated }, d.data)); camps = c.docs.map(d => Object.assign({ id: d.id, updated: d.updated }, d.data));
    posts.forEach(p => { p.metrics = p.metrics || {}; p.link = p.link || ""; p.camp = p.camp || ""; });
    try { const d = await X.req("GET", "/api/db/settings/pillars"); tgtDoc = Object.assign({ id: "pillars", updated: d.updated }, d.data); } catch (e) { tgtDoc = { id: "pillars", updated: null, targets: Object.assign({}, TGT_DEFAULT) }; }
    try { const d = await X.req("GET", "/api/db/settings/social"); socDoc = Object.assign({ id: "social", updated: d.updated }, d.data); } catch (e) { socDoc = { id: "social", updated: null, log: { linkedin: [], instagram: [], x: [] } }; }
    sortPosts(); loaded = true;
  }
  const sortPosts = () => posts.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.updated || 0) - (a.updated || 0));
  function save(p, coll) { coll = coll || "posts"; clearTimeout(saveT[p.id]); saveT[p.id] = setTimeout(async () => { const { id, updated, ...data } = p; try { const r = await X.req("PUT", `/api/db/${coll}/` + id, { data, base: updated }); p.updated = r.updated; mark("Saved"); } catch (e) { mark("Not saved"); } }, 500); }
  const mark = t => { const el = $("#st-saved"); if (el) { el.textContent = t; el.dataset.s = t; } };
  const tone = () => { const d = window.HSV && window.HSV.docs.tone; if (!d) return ""; const t = d.data; return [t.intro, ...t.principles.map(p => p.title + ": " + p.text), "Do: " + t.dos.join(" "), "Don't: " + t.donts.join(" ")].join("\n"); };
  const brandColors = () => { const d = window.HSV && window.HSV.docs.brand; return d ? d.data.colors : [{ name: "Off-white", hex: "#F4F2ED" }, { name: "Ink", hex: "#131313" }]; };
  const newCamp = () => ({ id: "c" + uid(), name: "New campaign", goal: "", from: "", to: "", channels: ["linkedin", "instagram"], notes: "", updated: null });
  const campOf = id => camps.find(c => c.id === id);
  const fmtD = d => d ? new Date(d + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  const num = n => (n || 0).toLocaleString("en-GB");
  const clicksOf = (st, id) => st ? st.posts.filter(x => x.post === id).reduce((a, x) => a + x.n, 0) : 0;
  const newPost = () => ({ id: "p" + uid(), title: "", brief: "", status: "idea", platform: "linkedin", texts: { linkedin: "", instagram: "", x: "" }, lang: "en", date: "", img: "", notes: "", link: "", camp: campOpen || "", pillar: "", metrics: {}, card: { bg: "#131313", fg: "#F4F2ED", text: "", label: "noa", size: 0 }, updated: null });

  // ---- shell with tabs ----
  let qview = "list", planOpen = false;
  const SNAME = { idea: "Idea", draft: "Draft", scheduled: "Scheduled", published: "Published" };
  const status = st => `<span class="st-st st-st-${st}"><i></i>${SNAME[st] || st}</span>`;
  const pdot = id => { const x = pil(id); return x ? `<i class="st-pd" style="--pc:${x.color}" title="${esc(x.name)}"></i>` : `<i class="st-pd st-pd-none" title="No pillar"></i>`; };
  const ttabs = (items, cur, attr) => `<div class="st-ttabs" role="tablist">${items.map(([k, n, c]) => `<button role="tab" aria-selected="${cur === k}" class="${cur === k ? "on" : ""}" ${attr}="${k}">${n}${c != null ? `<em>${c}</em>` : ""}</button>`).join("")}</div>`;
  function shell(inner) {
    return `<div class="st-vwrap st-posts"><div class="st-phead">
      ${ttabs([["queue", "Posts", posts.length], ["calendar", "Calendar"], ["campaigns", "Campaigns", camps.length]], tab, "data-ptab")}
      <div class="st-phead-r"><div class="st-tpl"><button class="st-btn" data-tplopen>From template</button><div class="st-tpl-menu" hidden>${PIL().map(pl => `<div class="st-tpl-g"><div class="st-tpl-gh"><span class="st-pl">${pdot(pl.id)}${esc(pl.name)}</span><span class="st-m">${esc(pl.text)}</span></div>${(window.HS_TEMPLATES || []).filter(x => x.pillar === pl.id).map(x => `<button data-tpl="${x.id}"><b>${esc(x.name)}</b><span>${esc(x.brief)}</span></button>`).join("")}</div>`).join("")}</div></div><button class="st-btn st-primary" data-pnew>New post</button></div>
    </div>${inner}</div>`;
  }
  function postCard(p) {
    return `<button class="st-post" data-popen="${p.id}"><span class="st-post-img">${p.img ? `<img src="${esc(src(p.img))}" alt="">` : `<span class="st-post-card" style="background:${esc(p.card.bg)};color:${esc(p.card.fg)}">${esc((p.card.text || p.texts[p.platform] || p.title || "").slice(0, 80))}</span>`}</span><span class="st-post-b"><span class="st-post-t">${esc(p.title || "Untitled")}</span><span class="st-post-m">${pdot(p.pillar)}<span>${p.date ? esc(fmtD(p.date)) + " · " : ""}${esc(PLAT[p.platform].name)}</span>${status(p.status)}</span></span></button>`;
  }
  function postRow(p) {
    const c = campOf(p.camp), plats = Object.keys(PLAT).filter(k => k === p.platform || (p.texts[k] || "").trim());
    return `<button class="st-qrow" data-popen="${p.id}"><span class="st-qd">${p.date ? esc(fmtD(p.date)) : "<span class='st-m'>No date</span>"}</span><span class="st-qt">${pdot(p.pillar)}<b>${esc(p.title || "Untitled")}</b></span><span class="st-qp">${plats.map(k => PLAT[k].name).join(", ")}</span><span class="st-qc">${c ? esc(c.name) : ""}</span>${status(p.status)}</button>`;
  }
  function viewQueue() {
    const vis = posts.filter(p => (!filter || p.status === filter) && (!pfil || p.pillar === pfil) && (!campOpen || p.camp === campOpen))
      .slice().sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || (a.date || "").localeCompare(b.date || ""));
    const mo = new Date().toISOString().slice(0, 7), moName = new Date().toLocaleDateString("en-GB", { month: "long" }), T = (tgtDoc && tgtDoc.targets) || TGT_DEFAULT;
    const inMonth = posts.filter(p => p.date && p.date.slice(0, 7) === mo && p.status !== "idea"), total = Object.values(T).reduce((x, y) => x + (+y || 0), 0);
    const plan = `<div class="st-plan2"><button class="st-plan2-s" data-planopen aria-expanded="${planOpen}"><b>${esc(moName)}</b><span>${inMonth.length} of ${total} planned</span><span class="st-plan2-dots">${PIL().map(pl => { const n = inMonth.filter(p => p.pillar === pl.id).length, t = +T[pl.id] || 0; return `<span title="${esc(pl.name)}: ${n} of ${t}">${Array.from({ length: Math.max(t, n) }, (_, i) => `<i style="--pc:${pl.color}" class="${i < n ? "on" : ""}"></i>`).join("")}</span>`; }).join("")}</span><span class="st-m">${planOpen ? "Hide" : "By pillar"}</span></button>
      ${planOpen ? `<div class="st-plan2-g">${PIL().map(pl => { const n = inMonth.filter(p => p.pillar === pl.id).length, t = +T[pl.id] || 0;
        return `<button class="st-plan2-c ${pfil === pl.id ? "on" : ""}" data-pfil="${pl.id}"><span class="st-pl">${pdot(pl.id)}${esc(pl.name)}</span><span class="st-plan2-n">${n} of ${tgtOpen ? `<input type="number" min="0" max="20" data-tgt="${pl.id}" value="${t}" aria-label="${esc(pl.name)} target" onclick="event.stopPropagation()">` : t}</span></button>`; }).join("")}<button class="st-link" data-tgtedit>${tgtOpen ? "Done" : "Edit targets"}</button></div>` : ""}</div>`;
    const chips = [pfil ? `<button class="st-fchip" data-pfil="${pfil}">${pdot(pfil)}${esc((pil(pfil) || {}).name || "")} <span aria-hidden="true">×</span></button>` : "", campOpen ? `<button class="st-fchip" data-campclear>${esc((campOf(campOpen) || {}).name || "")} <span aria-hidden="true">×</span></button>` : ""].join("");
    return `${plan}
      <div class="st-qbar">${ttabs([["", "All", posts.length], ...STATUS.map(s => [s, { idea: "Ideas", draft: "Drafts", scheduled: "Scheduled", published: "Published" }[s], posts.filter(p => p.status === s).length])], filter, "data-pf")}${chips}<div class="st-qview">${ttabs([["list", "List"], ["grid", "Grid"]], qview, "data-qview")}</div></div>
      ${vis.length ? (qview === "grid" ? `<div class="st-pgrid">${vis.map(postCard).join("")}</div>` : `<div class="st-qlist"><div class="st-qrow st-qhead" aria-hidden="true"><span>Date</span><span>Post</span><span>Channels</span><span>Campaign</span><span>Status</span></div>${vis.map(postRow).join("")}</div>`) : `<p class="st-empty-p">Nothing here yet. Start from a template, or write a new post.</p>`}`;
  }
  // place timeline labels in rows so none overlap, measured at the card's real width
  function layoutMarks() {
    document.querySelectorAll(".st-cmp-marks").forEach(box => {
      const W = box.clientWidth, list = [...box.querySelectorAll(".st-cmp-mk")]; if (!W || !list.length) return;
      if (getComputedStyle(box).display === "grid") { list.forEach(m => { m.style.top = ""; }); box.style.height = ""; return; }
      const ends = [], ROW = 50, GAP = 16;
      list.sort((a, b) => +a.dataset.x - +b.dataset.x).forEach(m => {
        const x = +m.dataset.x / 100 * W, w = m.offsetWidth, end = m.classList.contains("end");
        const a0 = end ? x - w : x - 4, a1 = end ? x + 4 : x + w;
        let lane = ends.findIndex(e => e + GAP <= a0); if (lane < 0) { lane = ends.length; ends.push(0); }
        ends[lane] = a1; m.style.top = lane * ROW + "px";
      });
      box.style.height = ends.length * ROW + "px";
    });
  }
  let lmT; window.addEventListener("resize", () => { clearTimeout(lmT); lmT = setTimeout(layoutMarks, 80); });
  function viewCampaigns() {
    const today = new Date().toISOString().slice(0, 10);
    const span = c => { if (!c.from || !c.to) return ""; const d = Math.round((new Date(c.to) - new Date(c.from)) / 864e5) + 1; return d >= 14 ? `${Math.round(d / 7)} weeks` : `${d} days`; };
    const legend = `<div class="st-cmp-leg">${STATUS.map(status).join("")}</div>`;
    return `<div class="st-qbar"><span class="st-m">A campaign groups posts around one goal and a period.</span><button class="st-link st-qbar-r" data-campnew>New campaign</button></div>
      <div class="st-camps2">${camps.map(c => { const ps = posts.filter(p => p.camp === c.id).sort((a, b) => (a.date || "").localeCompare(b.date || "")), pub = ps.filter(p => p.status === "published").length, sch = ps.filter(p => p.status === "scheduled").length, clicks = ps.reduce((a, p) => a + clicksOf(stats, p.id), 0);
        const t0 = c.from ? Date.parse(c.from) : 0, t1 = c.to ? Date.parse(c.to) : 0, len = t1 > t0 ? t1 - t0 : 0;
        const pos = d => Math.max(0, Math.min(100, (Date.parse(d) - t0) / len * 100));
        const weeks = []; if (len) for (let t = t0; t <= t1 - 3 * 864e5; t += 7 * 864e5) weeks.push(new Date(t).toISOString().slice(0, 10));
        const dated = ps.filter(p => p.date), undated = ps.filter(p => !p.date);
        const line = len ? `<div class="st-cmp-tl">
            <div class="st-cmp-axis">${weeks.map(w => `<span class="st-cmp-wk" style="left:${pos(w)}%">${esc(fmtD(w))}</span>`).join("")}<span class="st-cmp-wk st-cmp-end" style="left:100%">${esc(fmtD(c.to))}</span>${dated.map(p => `<i class="st-cmp-ad st-st-${p.status}" style="left:${pos(p.date)}%"></i>`).join("")}${today >= c.from && today <= c.to ? `<i class="st-cmp-today" style="left:${pos(today)}%"><span>Today</span></i>` : ""}</div>
            <div class="st-cmp-marks">${dated.map((p, i) => `<button class="st-cmp-mk st-st-${p.status} ${pos(p.date) > 70 ? "end" : ""}" data-x="${pos(p.date)}" style="left:${pos(p.date)}%" data-popen="${p.id}" title="${esc(fmtD(p.date))}, ${esc(SNAME[p.status])}"><i></i><span><b>${esc(p.title || "Untitled")}</b><em>${esc(fmtD(p.date))} · ${esc(PLAT[p.platform].name)}</em></span></button>`).join("")}</div>
          </div>` : `<p class="st-m">Set the dates to see the posts on a timeline.</p>`;
        return `<article class="st-cmp">
          <header class="st-cmp-h">
            <div class="st-cmp-hl"><input class="st-ghost st-cmp-name" data-ck="name" data-cid="${c.id}" value="${esc(c.name)}" aria-label="Campaign name">
              <textarea class="st-ghost st-cmp-goal" data-ck="goal" data-cid="${c.id}" rows="1" placeholder="What this campaign should do.">${esc(c.goal)}</textarea></div>
            <div class="st-cmp-acts"><button class="st-link" data-campadd="${c.id}">Add post</button><button class="st-btn" data-campopen="${c.id}">Open posts</button></div>
          </header>
          <div class="st-cmp-meta"><input type="date" class="st-ghost st-cmp-date" data-ck="from" data-cid="${c.id}" value="${esc(c.from)}" aria-label="From"><span>to</span><input type="date" class="st-ghost st-cmp-date" data-ck="to" data-cid="${c.id}" value="${esc(c.to)}" aria-label="To">${span(c) ? `<span class="st-cmp-sep">·</span><span>${span(c)}</span>` : ""}<span class="st-cmp-sep">·</span><span class="st-cmp-ch">${Object.keys(PLAT).map(k => `<button class="${(c.channels || []).includes(k) ? "on" : ""}" data-cch="${k}" data-cid="${c.id}" aria-pressed="${(c.channels || []).includes(k)}">${PLAT[k].name}</button>`).join("")}</span>
            <span class="st-cmp-sum">${ps.length} post${ps.length === 1 ? "" : "s"}${sch ? `, ${sch} scheduled` : ""}${pub ? `, ${pub} published, ${num(clicks)} click${clicks === 1 ? "" : "s"}` : ""}</span></div>
          ${line}
          ${undated.length ? `<p class="st-cmp-und"><span class="st-m">No date yet:</span> ${undated.map(p => `<button class="st-link" data-popen="${p.id}">${esc(p.title || "Untitled")}</button>`).join(", ")}</p>` : ""}
          <footer class="st-cmp-f">${legend}<details class="st-cmp-notes"><summary>Notes</summary><textarea class="st-ghost" data-ck="notes" data-cid="${c.id}" rows="2" placeholder="Angle, references, who approves.">${esc(c.notes)}</textarea><button class="st-link st-danger" data-campdel="${c.id}">Delete campaign</button></details></footer>
        </article>`; }).join("") || `<p class="st-empty-p">No campaigns yet. A campaign groups posts around one goal and a period, like a launch or a month on one topic.</p>`}</div>`;
  }
  // ---- site analytics: its own view in the side menu, about the public site ----
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
    const srcName = r => { const p = posts.find(x => "post-" + x.id === r); return p ? "Post: " + (p.title || "Untitled") : r; };
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
      const ps = posts.filter(p => p.status === "published" && (p.platform === k || (p.texts[k] && p.metrics[k])) && (!p.date || p.date >= since()));
      const sum = f => ps.reduce((a, p) => a + (+(p.metrics[k] || {})[f] || 0), 0);
      return `<div class="st-soc-card"><div class="st-soc-h"><div><b>${pl.name}</b><a class="st-m" href="${esc(pl.url)}" target="_blank" rel="noopener">${esc(pl.url.replace(/^https?:\/\/(www\.)?/, ""))} ↗</a></div></div>
        <div class="st-soc-nums"><span><b>${last ? num(last.followers) : "–"}</b>Followers${last && prevE ? `<em class="${last.followers >= prevE.followers ? "st-up" : "st-down"}">${last.followers >= prevE.followers ? "+" : ""}${num(last.followers - prevE.followers)} since ${fmtD(prevE.d)}</em>` : last ? `<em>${fmtD(last.d)}</em>` : ""}</span><span><b>${ps.length}</b>Posts, ${range} d</span><span><b>${num(sum("impressions"))}</b>Impressions</span><span><b>${num(sum("likes") + sum("comments"))}</b>Likes and comments</span></div>
        ${L.length > 1 ? spark(L.map(x => x.followers)) : ""}
        <form class="st-soc-log" data-soclog="${k}"><input class="st-in" type="number" min="0" name="followers" placeholder="Followers today" aria-label="Followers today"><button class="st-btn" type="submit">Log</button>${last ? `<span class="st-m">last: ${num(last.followers)} on ${fmtD(last.d)}</span>` : ""}</form></div>`; }).join("")}</div>
      <p class="st-m">For live numbers: get an API key from Postiz (Settings → Public API), add it as a secret named <code>POSTIZ_API_KEY</code> on the Worker, and connect LinkedIn, Instagram and X there. Followers, impressions and engagement then show up here on their own, and scheduling from the Studio becomes possible too.</p>`;
  }
  function spark(vals) { const W = 300, H = 36, mx = Math.max(...vals), mn = Math.min(...vals), r = mx - mn || 1; const pts = vals.map((v, i) => `${(i / (vals.length - 1) * W).toFixed(1)},${(H - 3 - (v - mn) / r * (H - 6)).toFixed(1)}`).join(" "); return `<svg class="st-spark" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`; }
  function editor(box, p) {
    const pl = PLAT[p.platform], txt = p.texts[p.platform] || "", over = txt.length > pl.max, m = p.metrics[p.platform] || {}, clicks = clicksOf(stats, p.id);
    const tracked = `${location.origin}/l/${p.id}?p=${p.platform}`;
    box.innerHTML = `<div class="st-vwrap st-posts"><div class="st-prow"><button class="st-btn" data-pback>← Posts</button>${ttabs(STATUS.map(x => [x, SNAME[x]]), p.status, "data-pstatus")}<div class="st-pils">${PIL().map(pl => `<button class="st-pil ${p.pillar === pl.id ? "on" : ""}" style="--pc:${pl.color}" data-ppil="${pl.id}" title="${esc(pl.text)}">${esc(pl.name)}</button>`).join("")}</div><select class="st-in st-psel" data-pcamp><option value="">No campaign</option>${camps.map(c => `<option value="${c.id}" ${p.camp === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select><button class="st-mini st-txt st-danger" data-pdel>Delete</button></div>
      <div class="st-ped">
        <div class="st-pleft">
          <input class="st-in st-ptitle" data-pk="title" value="${esc(p.title)}" placeholder="Working title">
          <label class="st-field"><span>Brief <em>What is this post about, for whom, with what point?</em></span><textarea class="st-in" data-pk="brief" rows="3" placeholder="e.g. We launched the Chart builder. Say what it does, who it's for, link in comments.">${esc(p.brief)}</textarea></label>
          <div class="st-prow"><div class="st-seg">${Object.keys(PLAT).map(k => `<button class="${p.platform === k ? "on" : ""}" data-pplat="${k}">${PLAT[k].name}${p.texts[k] ? " ●" : ""}</button>`).join("")}</div><div class="st-seg"><button class="${p.lang === "en" ? "on" : ""}" data-plang="en">EN</button><button class="${p.lang === "de" ? "on" : ""}" data-plang="de">DE</button></div><button class="st-btn" data-pai>Draft with AI</button></div>
          <label class="st-field"><span>${esc(pl.name)} text <em class="${over ? "st-over" : ""}">${txt.length} / ${pl.max}</em></span><textarea class="st-in st-ptext" data-ptext rows="12" placeholder="Write, or press Draft with AI. The tone of voice from the side menu applies. {link} becomes the tracked link when you copy.">${esc(txt)}</textarea></label>
          <div class="st-prow"><button class="st-btn" data-pcopy>Copy text</button><a class="st-btn" href="${esc(pl.url)}" target="_blank" rel="noopener">Open ${esc(pl.name)} ↗</a><label class="st-field st-pdate"><span>Date</span><input class="st-in" type="date" data-pk="date" value="${esc(p.date)}"></label></div>
          <label class="st-field"><span>Link <em>where the post should send people</em></span><input class="st-in" data-pk="link" value="${esc(p.link)}" placeholder="/tools or https://huit.studio/work/kpk"></label>
          <div class="st-tracked"><span class="st-m">Tracked link for ${esc(pl.name)}, counts clicks:</span><code>${esc(tracked)}</code><button class="st-mini st-txt" data-copytracked="${esc(tracked)}">Copy</button><span class="st-m">${num(clicks)} clicks so far</span></div>
          <div class="st-field"><span>${esc(pl.name)} numbers <em>enter by hand after posting</em></span><div class="st-metrics"><label><span class="st-m">Impressions</span><input class="st-in" type="number" min="0" data-pm="impressions" value="${esc(m.impressions || "")}"></label><label><span class="st-m">Likes</span><input class="st-in" type="number" min="0" data-pm="likes" value="${esc(m.likes || "")}"></label><label><span class="st-m">Comments</span><input class="st-in" type="number" min="0" data-pm="comments" value="${esc(m.comments || "")}"></label></div></div>
          <label class="st-field"><span>Notes</span><textarea class="st-in" data-pk="notes" rows="2" placeholder="Assets, who approves.">${esc(p.notes)}</textarea></label>
        </div>
        <div class="st-pright st-creator">
          ${creator(p)}
        </div>
      </div></div>`;
    drawAll(p);
  }
  // ---- creator: one image, a carousel of slides, or a motion piece of scenes ----
  const FORMATS = { image: "Image", carousel: "Carousel", motion: "Motion" };
  const SIZES = { image: null, carousel: [["4:5", 1080, 1350], ["1:1", 1080, 1080]], motion: [["9:16", 1080, 1920], ["4:5", 1080, 1350], ["16:9", 1920, 1080]] };
  const newSlide = (over) => Object.assign({ text: "", sub: "", label: "noa", bg: "#131313", fg: "#F4F2ED", img: "", fit: "cover", dim: true, align: "left", pos: "bottom", hsize: "L", showText: true, dur: 4, trans: "fade", pic: "float", textIn: "lines" }, over || {});
  // older posts have p.card only; lift it into slides
  function slidesOf(p) { if (!p.slides || !p.slides.length) { p.slides = [newSlide({ text: p.card.text || "", label: p.card.label || "noa", bg: p.card.bg, fg: p.card.fg, img: p.img || "" })]; } p.format = p.format || "image"; p.cur = Math.min(p.cur || 0, p.slides.length - 1); p.ptab = p.ptab || "text"; return p.slides; }
  const cur = p => slidesOf(p)[p.cur];
  function sizeOf(p) { const list = SIZES[p.format] || PLAT[p.platform].sizes; return list[Math.min(p.card.size || 0, list.length - 1)]; }
  // keep the queue card and the AI brief in sync with slide 1
  function syncCard(p) { const s = slidesOf(p)[0]; p.card.text = s.text; p.card.bg = s.bg; p.card.fg = s.fg; p.card.label = s.label; p.img = s.img; }
  const seg = (name, key, opts, val) => `<div class="st-field"><span>${name}</span><div class="st-steps">${opts.map(([v, l]) => `<button class="${String(val) === String(v) ? "on" : ""}" data-sk="${key}" data-sv="${esc(String(v))}">${l}</button>`).join("")}</div></div>`;
  function creator(p) {
    const sl = slidesOf(p), s = cur(p), many = p.format !== "image", list = SIZES[p.format] || PLAT[p.platform].sizes, sz = sizeOf(p);
    const total = sl.reduce((a, x) => a + (+x.dur || 4), 0);
    const tabs = [["text", "Text"], ["picture", "Picture"], ["chart", "Chart"], ["colours", "Colours"], ...(p.format === "motion" ? [["motion", "Motion"]] : [])];
    const ch = s.chart || { type: "bar", unit: "", data: "" };
    const panel = p.ptab === "chart" ? `
          ${seg("Chart", "chart.type", [["none", "None"], ["bar", "Bars"], ["line", "Line"]], s.chart && s.chart.data ? ch.type : "none")}
          <label class="st-field"><span>Numbers <em>one per line: label, value</em></span><textarea class="st-in" data-sk="chart.data" rows="6" placeholder="2023, 12\n2024, 18\n2025, 27">${esc(ch.data || "")}</textarea></label>
          <label class="st-field"><span>Unit <em>shown after each value</em></span><input class="st-in" data-sk="chart.unit" value="${esc(ch.unit || "")}" placeholder="%, €, k"></label>
          <p class="st-m">Drawn in the slide's colours between the label and the text. Put the text at the bottom and keep it short so the chart has room. Name the source in the line under the heading.</p>`
      : p.ptab === "picture" ? `
          <div class="st-prow"><button class="st-btn" data-supload>${s.img ? "Replace picture" : "Add a picture"}</button>${s.img ? `<button class="st-mini st-txt" data-simgdel>Remove</button>` : ""}</div>
          ${s.img ? seg("Fit", "fit", [["cover", "Fill"], ["inset", "Inset"]], s.fit) + `<label class="st-check"><span>Darken behind the text</span><input type="checkbox" data-sk="dim" ${s.dim !== false ? "checked" : ""}></label>` : `<p class="st-m">No picture on this slide, the colour is the ground. Dithered or printed-looking images sit well here.</p>`}`
      : p.ptab === "colours" ? `
          <div class="st-field"><span>Ground</span><div class="st-swrow">${brandColors().map(c => `<button class="st-swb ${s.bg === c.hex ? "on" : ""}" data-sbg="${esc(c.hex)}" style="background:${esc(c.hex)}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join("")}</div></div>
          <div class="st-field"><span>Text</span><div class="st-swrow">${brandColors().map(c => `<button class="st-swb ${s.fg === c.hex ? "on" : ""}" data-sfg="${esc(c.hex)}" style="background:${esc(c.hex)}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join("")}</div></div>
          ${many ? `<button class="st-btn" data-sapplyall="colours">Same colours on every slide</button>` : ""}`
      : p.ptab === "motion" ? `
          ${seg("This scene lasts", "dur", [[3, "3 s"], [4, "4 s"], [6, "6 s"], [8, "8 s"]], s.dur || 4)}
          ${seg("Into this scene", "trans", [["cut", "Cut"], ["fade", "Fade"], ["slide", "Slide"]], s.trans || "fade")}
          ${seg("Picture", "pic", [["still", "Still"], ["float", "Float"], ["rise", "Rise"]], s.pic || "float")}
          ${seg("Text comes in", "textIn", [["once", "At once"], ["lines", "Line by line"], ["after", "After the picture"]], s.textIn || "lines")}
          <button class="st-btn" data-sapplyall="motion">Same motion on every scene</button>
          <p class="st-m">${sl.length} scene${sl.length > 1 ? "s" : ""}, ${total} s in all. Export gives a WebM file; Instagram and LinkedIn take it, for X convert to MP4.</p>`
      : `
          <label class="st-field"><span>Heading</span><textarea class="st-in" data-sk="text" rows="3" placeholder="Short. Leave empty to show only the picture.">${esc(s.text)}</textarea></label>
          <label class="st-field"><span>Line under it <em>optional</em></span><input class="st-in" data-sk="sub" value="${esc(s.sub || "")}" placeholder="A source, a date, a second thought."></label>
          <label class="st-field"><span>Label</span><input class="st-in" data-sk="label" value="${esc(s.label || "")}"></label>
          ${seg("Heading size", "hsize", [["S", "S"], ["M", "M"], ["L", "L"], ["XL", "XL"]], s.hsize || "L")}
          ${seg("Alignment", "align", [["left", "Left"], ["center", "Centre"]], s.align || "left")}
          ${seg("Position", "pos", [["top", "Top"], ["center", "Centre"], ["bottom", "Bottom"]], s.pos || "bottom")}
          <label class="st-check"><span>Show text on this slide</span><input type="checkbox" data-sk="showText" ${s.showText !== false ? "checked" : ""}></label>`;
    return `
          <div class="st-prow st-wrap"><div class="st-seg">${Object.entries(FORMATS).map(([k, n]) => `<button class="${p.format === k ? "on" : ""}" data-sformat="${k}">${n}</button>`).join("")}</div><div class="st-seg">${list.map((z, i) => `<button class="${(p.card.size || 0) === i ? "on" : ""}" data-psize="${i}">${z[0]}</button>`).join("")}</div>${p.format === "motion" ? `<button class="st-btn" data-splay>▶ Play</button><span class="st-m" data-stime></span>` : ""}</div>
          <div class="st-pcard-wrap ${sz[2] > sz[1] * 1.3 ? "tall" : ""}"><canvas id="pcanvas" class="st-pcanvas"></canvas></div>
          ${many ? `<div class="st-strip" role="list">${sl.map((x, i) => `<div class="st-thumb ${i === p.cur ? "on" : ""}" role="listitem"><button class="st-thumb-b" data-scur="${i}" aria-label="Slide ${i + 1}"><canvas class="st-thumb-c" data-thumb="${i}"></canvas></button><span class="st-m">${i + 1}${p.format === "motion" ? ` · ${x.dur || 4} s` : ""}</span>${sl.length > 1 ? `<span class="st-thumb-x"><button class="st-mini" data-smove="-1" title="Move left">‹</button><button class="st-mini" data-sdel title="Remove">×</button><button class="st-mini" data-smove="1" title="Move right">›</button></span>` : ""}</div>`).join("")}<button class="st-thumb st-thumb-add" data-sadd><span class="st-thumb-c">+</span><span class="st-m">Add</span></button></div>` : ""}
          <div class="st-tabs">${tabs.map(([k, n]) => `<button class="${p.ptab === k ? "on" : ""}" data-sptab="${k}">${n}</button>`).join("")}</div>
          <div class="st-panel-b">${panel}</div>
          <div class="st-prow">${p.format === "motion" ? `<button class="st-btn st-primary" data-sexport>Export video</button><button class="st-btn" data-pdown>This frame as PNG</button>` : many ? `<button class="st-btn st-primary" data-sdownall>Download all slides</button><button class="st-btn" data-pdown>This slide as PNG</button>` : `<button class="st-btn st-primary" data-pdown>Download PNG</button>`}</div>`;
  }
  const withSrc = s => Object.assign({}, s, { imgSrc: s.img ? src(s.img) : "" });
  let playing = null;
  function drawAll(p) {
    const c = $("#pcanvas"); if (!c) return; if (playing) { playing.stop(); playing = null; }
    const sz = sizeOf(p), W = sz[1], H = sz[2]; c.width = W; c.height = H; const g = c.getContext("2d");
    const paint = () => { window.HSC.draw(g, withSrc(cur(p)), W, H, 1, false, paint); drawThumbs(p); };
    document.fonts && document.fonts.ready.then(paint); paint();
  }
  function drawThumbs(p) {
    const sz = sizeOf(p); document.querySelectorAll("[data-thumb]").forEach(t => { const s = slidesOf(p)[+t.dataset.thumb]; if (!s) return; const w = 96, h = Math.round(96 * sz[2] / sz[1]); t.width = w * 2; t.height = h * 2; t.style.width = w + "px"; t.style.height = h + "px"; window.HSC.draw(t.getContext("2d"), withSrc(s), w * 2, h * 2, 1, false, () => drawThumbs(p)); });
  }
  function downloadBlob(b, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  const fname = (p, ext, i) => `noa-${p.format}-${(p.title || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-")}${i != null ? "-" + (i + 1) : ""}.${ext}`;
  const setPath = (o, path, v) => { const ks = path.split("."); const l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; };

  function render(box) {
    box = box || $("#st-view"); if (!loaded) return;
    if (open) { const p = posts.find(x => x.id === open); if (p) return editor(box, p); open = null; }
    if (!stats && tab !== "analytics") X.req("GET", "/api/stats?days=30").then(s => { stats = s; }).catch(() => {});
    setTimeout(layoutMarks, 0);
    box.innerHTML = shell(tab === "calendar" ? viewCalendar() : tab === "campaigns" ? viewCampaigns() : viewQueue());
  }

  document.addEventListener("click", async e => {
    const t = e.target, c = s => t.closest(s); if (!c("#st-view")) return;
    if (X.state.view === "stats") { if (c("[data-range]")) { range = +c("[data-range]").dataset.range; stats = null; analytics(); } if (c("[data-gov]")) { const b = $(`#st-side [data-view="posts"]`); if (b) b.click(); } return; }
    if (X.state.view !== "posts") return;
    const p = posts.find(x => x.id === open);
    const openNew = n => { posts.unshift(n); sortPosts(); open = n.id; save(n); render(); const el = $(".st-ptitle"); if (el) el.focus(); };
    if (c("[data-ptab]")) { tab = c("[data-ptab]").dataset.ptab; open = null; return render(); }
    if (c("[data-pf]")) { filter = c("[data-pf]").dataset.pf; return render(); }
    if (c("[data-planopen]")) { planOpen = !planOpen; return render(); }
    if (c("[data-qview]")) { qview = c("[data-qview]").dataset.qview; return render(); }
    if (c("[data-tgtedit]")) { tgtOpen = !tgtOpen; return render(); }
    if (c("[data-tgt]")) return;
    if (c("[data-pfil]")) { const v = c("[data-pfil]").dataset.pfil; pfil = pfil === v ? "" : v; return render(); }
    if (c("[data-month]")) { month = c("[data-month]").dataset.month; return render(); }
    if (c("[data-campclear]")) { campOpen = null; return render(); }
    if (c("[data-campnew]")) { const n = newCamp(); camps.push(n); save(n, "campaigns"); render(); const el = [...$("#st-view").querySelectorAll(".st-camp-name")].pop(); if (el) el.select(); return; }
    if (c("[data-campdel]")) { const b = c("[data-campdel]"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to delete"; return; } const id = b.dataset.campdel; await X.req("DELETE", "/api/db/campaigns/" + id); camps = camps.filter(x => x.id !== id); posts.forEach(x => { if (x.camp === id) { x.camp = ""; save(x); } }); if (campOpen === id) campOpen = null; return render(); }
    if (c("[data-cch]")) { const b = c("[data-cch]"), cp = campOf(b.dataset.cid), k = b.dataset.cch; cp.channels = (cp.channels || []).includes(k) ? cp.channels.filter(x => x !== k) : [...(cp.channels || []), k]; save(cp, "campaigns"); return render(); }
    if (c("[data-campopen]")) { campOpen = c("[data-campopen]").dataset.campopen; tab = "queue"; filter = ""; return render(); }
    if (c("[data-campadd]")) { const n = newPost(); n.camp = c("[data-campadd]").dataset.campadd; return openNew(n); }
    if (c("[data-tplopen]")) { const m = $(".st-tpl-menu"); m.hidden = !m.hidden; return; }
    if (c("[data-tpl]")) { const t = (window.HS_TEMPLATES || []).find(x => x.id === c("[data-tpl]").dataset.tpl); const n = newPost(); n.title = t.name; n.brief = t.brief; n.texts = Object.assign({}, t.texts); n.link = t.link; n.status = "draft"; n.card.text = t.card.text; n.card.bg = t.card.bg; n.card.fg = lum(t.card.bg) > .5 ? "#131313" : "#F4F2ED"; n.pillar = t.pillar || ""; if (t.slides && t.slides.length) { n.format = "carousel"; n.slides = t.slides.map(x => newSlide(Object.assign({ fg: lum(x.bg || "#131313") > .5 ? "#131313" : "#F4F2ED" }, x, x.chart ? { chart: Object.assign({}, x.chart) } : {}))); syncCard(n); } else n.slides = [newSlide({ text: t.card.text, bg: t.card.bg, fg: n.card.fg })]; return openNew(n); }
    if (c("[data-pnew]")) return openNew(newPost());
    if (c("[data-popen]")) { open = c("[data-popen]").dataset.popen; return render(); }
    if (c("[data-calday]")) { const n = newPost(); n.date = c("[data-calday]").dataset.calday; n.status = "draft"; return openNew(n); }
    if (c("[data-pback]")) { open = null; return render(); }
    if (!p) return;
    if (c("[data-copytracked]")) { try { await navigator.clipboard.writeText(c("[data-copytracked]").dataset.copytracked); X.toast("Tracked link copied. Use it in the post."); } catch (err) { X.toast("Couldn’t copy."); } return; }
    if (c("[data-ppil]")) { const v = c("[data-ppil]").dataset.ppil; p.pillar = p.pillar === v ? "" : v; save(p); return render(); }
    if (c("[data-pstatus]")) { p.status = c("[data-pstatus]").dataset.pstatus; save(p); return render(); }
    if (c("[data-pplat]")) { p.platform = c("[data-pplat]").dataset.pplat; if (p.format === "image") p.card.size = 0; save(p); return render(); }
    if (c("[data-plang]")) { p.lang = c("[data-plang]").dataset.plang; save(p); return render(); }
    if (c("[data-psize]")) { p.card.size = +c("[data-psize]").dataset.psize; save(p); return render(); }
    if (c("[data-sformat]")) { p.format = c("[data-sformat]").dataset.sformat; p.card.size = 0; if (p.format === "image") p.cur = 0; save(p); return render(); }
    if (c("[data-sptab]")) { p.ptab = c("[data-sptab]").dataset.sptab; return render(); }
    if (c("[data-scur]")) { p.cur = +c("[data-scur]").dataset.scur; return render(); }
    if (c("[data-sadd]")) { const base = cur(p); slidesOf(p).push(newSlide({ label: base.label, bg: base.bg, fg: base.fg, align: base.align, pos: base.pos, hsize: base.hsize, dur: base.dur, trans: base.trans, pic: base.pic, textIn: base.textIn })); p.cur = p.slides.length - 1; p.ptab = "text"; save(p); return render(); }
    if (c("[data-sdel]")) { const i = +c(".st-thumb").querySelector("[data-scur]").dataset.scur; p.slides.splice(i, 1); p.cur = Math.max(0, Math.min(p.cur, p.slides.length - 1)); syncCard(p); save(p); return render(); }
    if (c("[data-smove]")) { const d = +c("[data-smove]").dataset.smove, i = +c(".st-thumb").querySelector("[data-scur]").dataset.scur, j = i + d; if (j < 0 || j >= p.slides.length) return; [p.slides[i], p.slides[j]] = [p.slides[j], p.slides[i]]; p.cur = j; syncCard(p); save(p); return render(); }
    if (c("[data-sk]") && c("button")) { const b = c("[data-sk]"); let v = b.dataset.sv; if (/^\d+$/.test(v)) v = +v; const s = cur(p); if (b.dataset.sk === "chart.type") { s.chart = s.chart || { type: "bar", unit: "", data: "" }; if (v === "none") { s.chart.data = ""; } else { s.chart.type = v; if (!s.chart.data) s.chart.data = "2023, 12\n2024, 18\n2025, 27"; } } else s[b.dataset.sk] = v; syncCard(p); save(p); return render(); }
    if (c("[data-sbg]")) { const s = cur(p); s.bg = c("[data-sbg]").dataset.sbg; s.fg = lum(s.bg) > .5 ? "#131313" : "#F4F2ED"; syncCard(p); save(p); return render(); }
    if (c("[data-sfg]")) { cur(p).fg = c("[data-sfg]").dataset.sfg; syncCard(p); save(p); return render(); }
    if (c("[data-sapplyall]")) { const s = cur(p), keys = c("[data-sapplyall]").dataset.sapplyall === "colours" ? ["bg", "fg"] : ["dur", "trans", "pic", "textIn"]; p.slides.forEach(x => keys.forEach(k => x[k] = s[k])); syncCard(p); save(p); X.toast("Applied to every slide."); return render(); }
    if (c("[data-supload]")) { X.pickFile(async file => { if (!file) return; try { const blob = await X.shrink(file); const r = await X.req("POST", "/api/blob", blob, blob.type); cur(p).img = "asset:" + r.id; syncCard(p); save(p); render(); } catch (err) { X.toast("Upload failed."); } }); return; }
    if (c("[data-simgdel]")) { cur(p).img = ""; syncCard(p); save(p); return render(); }
    if (c("[data-splay]")) { const cv = $("#pcanvas"), b = c("[data-splay]"); if (playing) { playing.stop(); playing = null; b.textContent = "▶ Play"; return drawAll(p); } b.textContent = "■ Stop"; const tm = $("[data-stime]"); playing = window.HSC.play(cv, p.slides.map(withSrc), { onTime: (t, total) => { tm.textContent = `${t.toFixed(1)} / ${total} s`; }, onEnd: () => { playing = null; b.textContent = "▶ Play"; } }); return; }
    if (c("[data-sexport]")) { const cv = $("#pcanvas"), b = c("[data-sexport]"); if (playing) playing.stop(); b.disabled = true; b.textContent = "Recording…"; playing = window.HSC.record(cv, p.slides.map(withSrc), (blob, err) => { b.disabled = false; b.textContent = "Export video"; playing = null; if (!blob) return X.toast("This browser can’t record video. Chrome can."); downloadBlob(blob, fname(p, blob.type.includes("mp4") ? "mp4" : "webm")); drawAll(p); }); if (!playing) { b.disabled = false; b.textContent = "Export video"; } return; }
    if (c("[data-sdownall]")) { const sz = sizeOf(p), off = document.createElement("canvas"); off.width = sz[1]; off.height = sz[2]; const g = off.getContext("2d"); let i = 0; const next = () => { if (i >= p.slides.length) return X.toast("All slides downloaded. Your browser may have asked to allow several files."); window.HSC.draw(g, withSrc(p.slides[i]), sz[1], sz[2], 1, false); off.toBlob(bl => { downloadBlob(bl, fname(p, "png", i)); i++; setTimeout(next, 400); }, "image/png"); }; next(); return; }
    if (c("[data-pcopy]")) { const txt = (p.texts[p.platform] || "").replace(/\{link\}/g, `${location.origin}/l/${p.id}?p=${p.platform}`); try { await navigator.clipboard.writeText(txt); X.toast("Copied."); } catch (err) { X.toast("Couldn’t copy. Select the text instead."); } return; }
    if (c("[data-pdown]")) { if (playing) { playing.stop(); playing = null; drawAll(p); } $("#pcanvas").toBlob(b => downloadBlob(b, fname(p, "png", p.format === "image" ? null : p.cur)), "image/png"); return; }
    if (c("[data-pdel]")) { const b = c("[data-pdel]"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to delete"; return; } await X.req("DELETE", "/api/db/posts/" + p.id); posts = posts.filter(x => x !== p); open = null; return render(); }
    if (c("[data-pai]")) {
      const b = c("[data-pai]"); if (!p.brief.trim()) return X.toast("Write a brief first, one or two lines."); b.disabled = true; b.textContent = "Writing…";
      try { const r = await X.req("POST", "/api/ai/post", { brief: p.brief + (p.link ? ` Include this link: ${location.origin}/l/${p.id}?p=${p.platform}` : ""), tone: tone(), platform: p.platform, lang: p.lang }); p.texts[p.platform] = r.text; save(p); render(); X.toast("Draft written. Edit it, it’s a start."); }
      catch (err) { b.disabled = false; b.textContent = "Draft with AI"; X.toast(err.code === "no_ai" ? "AI isn’t switched on for this site yet." : "The draft failed. Try again."); }
      return;
    }
  });
  document.addEventListener("input", e => {
    const el = e.target; if (X.state.view !== "posts" || !el.closest("#st-view")) return;
    if (el.matches("[data-tgt]")) { tgtDoc.targets = tgtDoc.targets || {}; tgtDoc.targets[el.dataset.tgt] = Math.max(0, +el.value || 0); clearTimeout(saveT.tgt); saveT.tgt = setTimeout(async () => { const { id, updated, ...data } = tgtDoc; try { const r = await X.req("PUT", "/api/db/settings/pillars", { data, base: updated }); tgtDoc.updated = r.updated; mark("Saved"); } catch (err) { mark("Not saved"); } }, 500); return; }
    if (el.matches("[data-ck]")) { const cp = campOf(el.dataset.cid); if (!cp) return; cp[el.dataset.ck] = el.value; mark("Saving…"); save(cp, "campaigns"); return; }
    const p = posts.find(x => x.id === open); if (!p) return;
    if (el.matches("[data-pm]")) { p.metrics[p.platform] = p.metrics[p.platform] || {}; p.metrics[p.platform][el.dataset.pm] = +el.value || 0; mark("Saving…"); save(p); return; }
    if (el.matches("[data-ptext]")) { p.texts[p.platform] = el.value; const pl = PLAT[p.platform], em = el.closest(".st-field").querySelector("em"); em.textContent = `${el.value.length} / ${pl.max}`; em.classList.toggle("st-over", el.value.length > pl.max); mark("Saving…"); save(p); return; }
    if (el.matches("[data-sk]")) { const s = cur(p); const k = el.dataset.sk; if (k.startsWith("chart.")) { s.chart = s.chart || { type: "bar", unit: "", data: "" }; s.chart[k.slice(6)] = el.value; } else s[k] = el.type === "checkbox" ? el.checked : el.value; syncCard(p); mark("Saving…"); save(p); const c2 = $("#pcanvas"); if (c2) { const sz = sizeOf(p); window.HSC.draw(c2.getContext("2d"), withSrc(s), sz[1], sz[2], 1, false); drawThumbs(p); } return; }
    if (el.matches("[data-pk]")) { setPath(p, el.dataset.pk, el.value); mark("Saving…"); save(p); }
  });
  document.addEventListener("submit", async e => {
    const f = e.target; if (!f.matches("[data-soclog]")) return; e.preventDefault(); const v = +f.followers.value; if (!v) return;
    socDoc.log = socDoc.log || {}; const k = f.dataset.soclog, d = new Date().toISOString().slice(0, 10); socDoc.log[k] = (socDoc.log[k] || []).filter(x => x.d !== d).concat([{ d, followers: v }]).slice(-120);
    const { id, updated, ...data } = socDoc; try { const r = await X.req("PUT", "/api/db/settings/social", { data, base: updated }); socDoc.updated = r.updated; X.toast("Logged."); } catch (err) { X.toast("Not saved."); }
    analytics();
  });
  document.addEventListener("change", e => { const el = e.target; if (X.state.view !== "posts" || !el.closest("#st-view")) return; const p = posts.find(x => x.id === open); if (!p) return; if (el.matches("[data-pcamp]")) { p.camp = el.value; save(p); } if (el.matches("[data-pk=date]")) sortPosts(); });
  const lum = hex => { const m = hex.match(/[0-9a-f]{2}/gi) || ["80", "80", "80"]; const [r, g, b] = m.map(x => parseInt(x, 16) / 255); return .2126 * r + .7152 * g + .0722 * b; };

  window.HSP = { render, analytics };
  load().then(() => { if (X.state.view === "posts") render(); }).catch(() => {});
})();
