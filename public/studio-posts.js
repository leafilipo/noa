// Posts: campaigns, a calendar, the queue, a text per platform, AI draft in the studio's voice, branded image, tracked links, analytics.
(function () {
  const X = window.HSX, { esc, src } = window.HS;
  const $ = (s, r) => (r || document).querySelector(s);
  const uid = () => Math.random().toString(36).slice(2, 10);
  const PLAT = window.HS_PLATFORMS;
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
    sortPosts(); loaded = true;
  }
  const sortPosts = () => posts.sort((a, b) => (b.date || "").localeCompare(a.date || "") || (b.updated || 0) - (a.updated || 0));
  function save(p, coll) { coll = coll || "posts"; clearTimeout(saveT[p.id]); saveT[p.id] = setTimeout(async () => { const { id, updated, ...data } = p; try { const r = await X.req("PUT", `/api/db/${coll}/` + id, { data, base: updated }); p.updated = r.updated; mark("Saved"); } catch (e) { mark("Not saved"); } }, 500); }
  const mark = t => { const el = $("#st-saved"); if (el) { el.textContent = t; el.dataset.s = t; } };
  const tone = () => { const d = window.HSV && window.HSV.docs.tone; if (!d) return ""; const t = d.data; return [t.intro, ...t.principles.map(p => p.title + ": " + p.text), "Do: " + t.dos.join(" "), "Don't: " + t.donts.join(" ")].join("\n"); };
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
    const plan = X.state.view === "plan";
    const tpl = `<div class="st-tpl"><button class="st-btn" data-tplopen>From template</button><div class="st-tpl-menu" hidden>${PIL().map(pl => `<div class="st-tpl-g"><div class="st-tpl-gh"><span class="st-pl">${pdot(pl.id)}${esc(pl.name)}</span><span class="st-m">${esc(pl.text)}</span></div>${(window.HS_TEMPLATES || []).filter(x => x.pillar === pl.id).map(x => `<button data-tpl="${x.id}"><b>${esc(x.name)}</b><span>${esc(x.brief)}</span></button>`).join("")}</div>`).join("")}</div></div>`;
    return `<div class="st-vwrap st-posts"><div class="st-phead2"><div><h1>${plan ? "Plan" : "Create"}</h1><p class="st-m">${plan ? "When posts go out, what each month covers, and the campaigns they belong to." : "Write posts, make the images, carousels and motion. All in English."}</p></div>
      <div class="st-phead-r">${plan ? `<button class="st-btn" data-campnew>New campaign</button>` : ""}<button class="st-btn st-primary" data-pnew>New post</button></div></div>
      <div class="st-phead">${plan ? ttabs([["calendar", "Calendar"], ["campaigns", "Campaigns", camps.length]], tab, "data-ptab") : ttabs([["queue", "Posts", posts.length], ["templates", "Templates", (window.HS_TEMPLATES || []).length]], tab, "data-ptab")}</div>${inner}</div>`;
  }
  function postCard(p) {
    return `<button class="st-post" data-popen="${p.id}"><span class="st-post-img">${p.img ? `<img src="${esc(src(p.img))}" alt="">` : `<span class="st-post-card" style="background:${esc(p.card.bg)};color:${esc(p.card.fg)}">${esc((p.card.text || p.texts[p.platform] || p.title || "").slice(0, 80))}</span>`}</span><span class="st-post-b"><span class="st-post-t">${esc(p.title || "Untitled")}</span><span class="st-post-m">${pdot(p.pillar)}<span>${p.date ? esc(fmtD(p.date)) + " · " : ""}${esc(PLAT[p.platform].name)}</span>${status(p.status)}</span></span></button>`;
  }
  function postRow(p) {
    const c = campOf(p.camp), plats = Object.keys(PLAT).filter(k => k === p.platform || (p.texts[k] || "").trim());
    return `<button class="st-qrow" data-popen="${p.id}"><span class="st-qd">${p.date ? esc(fmtD(p.date)) : "<span class='st-m'>No date</span>"}</span><span class="st-qt">${pdot(p.pillar)}<b>${esc(p.title || "Untitled")}</b></span><span class="st-qp">${plats.map(k => PLAT[k].name).join(", ")}</span><span class="st-qc">${c ? esc(c.name) : ""}</span>${status(p.status)}</button>`;
  }
  function planLine() {
    const mo = new Date().toISOString().slice(0, 7), moName = new Date().toLocaleDateString("en-GB", { month: "long" }), T = (tgtDoc && tgtDoc.targets) || TGT_DEFAULT;
    const inMonth = posts.filter(p => p.date && p.date.slice(0, 7) === mo && p.status !== "idea"), total = Object.values(T).reduce((x, y) => x + (+y || 0), 0);
    return `<div class="st-plan2"><button class="st-plan2-s" data-planopen aria-expanded="${planOpen}"><b>${esc(moName)}</b><span>${inMonth.length} of ${total} planned</span><span class="st-plan2-dots">${PIL().map(pl => { const n = inMonth.filter(p => p.pillar === pl.id).length, t = +T[pl.id] || 0; return `<span title="${esc(pl.name)}: ${n} of ${t}">${Array.from({ length: Math.max(t, n) }, (_, i) => `<i style="--pc:${pl.color}" class="${i < n ? "on" : ""}"></i>`).join("")}</span>`; }).join("")}</span><span class="st-m">${planOpen ? "Hide" : "By pillar"}</span></button>
      ${planOpen ? `<div class="st-plan2-g">${PIL().map(pl => { const n = inMonth.filter(p => p.pillar === pl.id).length, t = +T[pl.id] || 0;
        return `<button class="st-plan2-c ${pfil === pl.id ? "on" : ""}" data-pfil="${pl.id}"><span class="st-pl">${pdot(pl.id)}${esc(pl.name)}</span><span class="st-plan2-n">${n} of ${tgtOpen ? `<input type="number" min="0" max="20" data-tgt="${pl.id}" value="${t}" aria-label="${esc(pl.name)} target" onclick="event.stopPropagation()">` : t}</span></button>`; }).join("")}<button class="st-link" data-tgtedit>${tgtOpen ? "Done" : "Edit targets"}</button></div>` : ""}</div>`;
  }
  function viewTemplates() {
    const T = window.HS_TEMPLATES || [];
    return `<p class="st-m st-tpl-lead">A template is a starting point: a brief, a text per platform and a first slide. Pick one and fill in what is in curly brackets.</p>
      ${PIL().map(pl => { const list = T.filter(x => x.pillar === pl.id); if (!list.length) return ""; return `<section class="st-tpl-sec"><h2 class="st-pl">${pdot(pl.id)}${esc(pl.name)}<span class="st-m">${esc(pl.text)}</span></h2>
        <div class="st-tpl-grid">${list.map(x => `<button class="st-tpl-card" data-tpl="${x.id}"><span class="st-tpl-prev" style="background:${esc(x.card.bg)};color:${lum(x.card.bg) > .5 ? "#131313" : "#F4F2ED"}"><span>${esc(x.card.text)}</span>${x.slides ? `<em>${x.slides.length} slides</em>` : ""}</span><b>${esc(x.name)}</b><span class="st-m">${esc(x.brief)}</span></button>`).join("")}</div></section>`; }).join("")}`;
  }
  function viewQueue() {
    const vis = posts.filter(p => (!filter || p.status === filter) && (!pfil || p.pillar === pfil) && (!campOpen || p.camp === campOpen))
      .slice().sort((a, b) => (a.date ? 0 : 1) - (b.date ? 0 : 1) || (a.date || "").localeCompare(b.date || ""));
    const mo = new Date().toISOString().slice(0, 7), moName = new Date().toLocaleDateString("en-GB", { month: "long" }), T = (tgtDoc && tgtDoc.targets) || TGT_DEFAULT;
    const inMonth = posts.filter(p => p.date && p.date.slice(0, 7) === mo && p.status !== "idea"), total = Object.values(T).reduce((x, y) => x + (+y || 0), 0);
    const chips = [pfil ? `<button class="st-fchip" data-pfil="${pfil}">${pdot(pfil)}${esc((pil(pfil) || {}).name || "")} <span aria-hidden="true">×</span></button>` : "", campOpen ? `<button class="st-fchip" data-campclear>${esc((campOf(campOpen) || {}).name || "")} <span aria-hidden="true">×</span></button>` : ""].join("");
    return `<div class="st-qbar">${ttabs([["", "All", posts.length], ...STATUS.map(s => [s, { idea: "Ideas", draft: "Drafts", scheduled: "Scheduled", published: "Published" }[s], posts.filter(p => p.status === s).length])], filter, "data-pf")}${chips}<div class="st-qview">${ttabs([["list", "List"], ["grid", "Grid"]], qview, "data-qview")}</div></div>
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
  function viewCalendar() {
    const m = month || new Date().toISOString().slice(0, 7), [y, mo] = m.split("-").map(Number), first = new Date(y, mo - 1, 1), start = (first.getDay() + 6) % 7, days = new Date(y, mo, 0).getDate(), today = new Date().toISOString().slice(0, 10);
    const ym = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, prev = ym(new Date(y, mo - 2, 1)), next = ym(new Date(y, mo, 1));
    const cells = []; for (let i = 0; i < start; i++) cells.push(""); for (let d = 1; d <= days; d++) cells.push(`${m}-${String(d).padStart(2, "0")}`);
    const campBars = camps.filter(c => c.from && c.to && c.from <= `${m}-31` && c.to >= `${m}-01`);
    return `<div class="st-prow"><button class="st-link" data-month="${prev}" aria-label="Previous month">←</button><h2 class="st-cal-h">${first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}</h2><button class="st-link" data-month="${next}" aria-label="Next month">→</button><button class="st-link" data-month="${ym(new Date())}">Today</button>${campBars.length ? `<span class="st-m">${campBars.map(c => `<span class="st-tag st-camp-tag">${esc(c.name)}</span>`).join(" ")}</span>` : ""}</div>
      <div class="st-cal"><div class="st-cal-dow">${["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => `<span>${d}</span>`).join("")}</div><div class="st-cal-grid">${cells.map(d => d ? `<div class="st-cal-day ${d === today ? "today" : ""}" data-calday="${d}"><span class="st-cal-n">${+d.slice(-2)}</span>${campBars.filter(c => c.from <= d && c.to >= d).map(c => `<i class="st-cal-camp" title="${esc(c.name)}"></i>`).join("")}${posts.filter(p => p.date === d).map(p => `<button class="st-cal-post st-s-${p.status}" data-popen="${p.id}" title="${esc(p.title)}${p.pillar ? " · " + esc((pil(p.pillar) || {}).name || "") : ""}">${p.pillar ? `<i class="st-pdot" style="--pc:${(pil(p.pillar) || {}).color}"></i>` : ""}${esc(PLAT[p.platform].name.slice(0, 2).toUpperCase())} · ${esc(p.title || "Untitled")}</button>`).join("")}</div>` : `<div class="st-cal-day st-cal-empty"></div>`).join("")}</div></div><p class="st-m">Click a day to add a post on it. The line at the top of a day is a campaign.</p>`;
  }
  function viewCampaigns() {
    const today = new Date().toISOString().slice(0, 10);
    const span = c => { if (!c.from || !c.to) return ""; const d = Math.round((new Date(c.to) - new Date(c.from)) / 864e5) + 1; return d >= 14 ? `${Math.round(d / 7)} weeks` : `${d} days`; };
    const legend = `<div class="st-cmp-leg">${STATUS.map(status).join("")}</div>`;
    return `<div class="st-camps2">${camps.map(c => { const ps = posts.filter(p => p.camp === c.id).sort((a, b) => (a.date || "").localeCompare(b.date || "")), pub = ps.filter(p => p.status === "published").length, sch = ps.filter(p => p.status === "scheduled").length, clicks = ps.reduce((a, p) => a + clicksOf(stats, p.id), 0);
        const t0 = c.from ? Date.parse(c.from) : 0, t1 = c.to ? Date.parse(c.to) : 0, len = t1 > t0 ? t1 - t0 : 0;
        const pos = d => Math.max(0, Math.min(100, (Date.parse(d) - t0) / len * 100));
        const weeks = []; if (len) for (let t = t0; t <= t1 - 3 * 864e5; t += 7 * 864e5) weeks.push(new Date(t).toISOString().slice(0, 10));
        const dated = ps.filter(p => p.date), undated = ps.filter(p => !p.date);
        const line = len ? `<div class="st-cmp-tl">
            <div class="st-cmp-axis">${weeks.map(w => `<span class="st-cmp-wk" style="left:${pos(w)}%">${esc(fmtD(w))}</span>`).join("")}<span class="st-cmp-wk st-cmp-end" style="left:100%">${esc(fmtD(c.to))}</span>${dated.map(p => `<i class="st-cmp-ad st-st-${p.status}" style="left:${pos(p.date)}%"></i><i class="st-cmp-tick" style="left:${pos(p.date)}%"></i>`).join("")}${today >= c.from && today <= c.to ? `<i class="st-cmp-today" style="left:${pos(today)}%"><span>Today</span></i>` : ""}</div>
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
  function editor(box, p) {
    const pl = PLAT[p.platform], txt = p.texts[p.platform] || "", over = txt.length > pl.max, m = p.metrics[p.platform] || {}, clicks = clicksOf(stats, p.id);
    const tracked = `${location.origin}/l/${p.id}?p=${p.platform}`, camp = campOf(p.camp);
    box.innerHTML = `<div class="st-vwrap st-posts st-ed">
      <div class="st-ed-top"><button class="st-link" data-pback>← Create</button><span class="st-ed-actions">${ttabs(STATUS.map(x => [x, SNAME[x]]), p.status, "data-pstatus")}<button class="st-link st-danger" data-pdel>Delete</button></span></div>
      <input class="st-ghost st-ed-title" data-pk="title" value="${esc(p.title)}" placeholder="Working title" aria-label="Title">
      <div class="st-ed-meta">
        <span class="st-ed-mitem"><span class="st-m">Pillar</span><span class="st-pils">${PIL().map(x => `<button class="st-pil ${p.pillar === x.id ? "on" : ""}" style="--pc:${x.color}" data-ppil="${x.id}" title="${esc(x.text)}">${pdot(x.id)}${esc(x.name)}</button>`).join("")}</span></span>
        <span class="st-ed-mitem"><span class="st-m">Campaign</span><select class="st-ghost st-ed-sel" data-pcamp aria-label="Campaign"><option value="">None</option>${camps.map(c => `<option value="${c.id}" ${p.camp === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></span>
        <span class="st-ed-mitem"><span class="st-m">Date</span><input class="st-ghost st-ed-date" type="date" data-pk="date" value="${esc(p.date)}" aria-label="Date"></span>
      </div>
      <div class="st-ped">
        <div class="st-pleft st-ed-write">
          <textarea class="st-ghost st-ed-brief" data-pk="brief" rows="1" placeholder="Brief: what is this post about, for whom, with what point?" aria-label="Brief">${esc(p.brief)}</textarea>
          <div class="st-ed-plat">${ttabs(Object.keys(PLAT).map(k => [k, PLAT[k].name + ((p.texts[k] || "").trim() ? " ●" : "")]), p.platform, "data-pplat")}<button class="st-link" data-pai>Draft with AI</button></div>
          <textarea class="st-ghost st-ed-text" data-ptext rows="10" placeholder="Write the ${esc(pl.name)} post, or draft it with AI. {link} becomes the tracked link when you copy." aria-label="${esc(pl.name)} text">${esc(txt)}</textarea>
          <div class="st-ed-under"><span class="st-m ${over ? "st-over" : ""}"><em>${txt.length}</em> / ${pl.max}</span><button class="st-link" data-pcopy>Copy text</button><a class="st-link" href="${esc(pl.url)}" target="_blank" rel="noopener">Open ${esc(pl.name)} ↗</a></div>
          <div class="st-ed-link"><span class="st-m">Link</span><input class="st-ghost" data-pk="link" value="${esc(p.link)}" placeholder="/tools or https://…" aria-label="Link target"><span class="st-ed-tracked"><span class="st-m">Tracked:</span><code>${esc(tracked.replace(/^https?:\/\//, ""))}</code><button class="st-link" data-copytracked="${esc(tracked)}">Copy</button>${clicks ? `<span class="st-m">${num(clicks)} clicks</span>` : ""}</span></div>
          <textarea class="st-ghost st-ed-notes" data-pk="notes" rows="1" placeholder="Notes: assets, who approves." aria-label="Notes">${esc(p.notes)}</textarea>
          ${p.status === "published" ? `<div class="st-ed-after"><span class="st-m">After posting, ${esc(pl.name)}</span><div class="st-metrics">${[["impressions", "Impressions"], ["likes", "Likes"], ["comments", "Comments"]].map(([k, l]) => `<label><span class="st-m">${l}</span><input class="st-ghost" type="number" min="0" data-pm="${k}" value="${esc(m[k] || "")}" placeholder="0"></label>`).join("")}</div></div>` : ""}
        </div>
        <div class="st-pright st-creator">
          ${creator(p)}
        </div>
      </div></div>`;
    drawAll(p); const ta = box.querySelector(".st-ed-text"); if (ta) { ta.style.height = "auto"; ta.style.height = Math.max(220, ta.scrollHeight) + "px"; }
  }
  const C = () => window.HSC2, creator = p => C().creator(p), drawAll = p => C().drawAll(p), drawThumbs = p => C().drawThumbs(p), slidesOf = p => C().slidesOf(p), cur = p => C().cur(p), sizeOf = p => C().sizeOf(p), syncCard = p => C().syncCard(p), newSlide = o => C().newSlide(o), withSrc = x => C().withSrc(x), downloadBlob = (b, n) => C().downloadBlob(b, n), fname = (p, e, i) => C().fname(p, e, i);
  const setPath = (o, path, v) => { const ks = path.split("."); const l = ks.pop(); ks.reduce((a, k) => a[k], o)[l] = v; };

  function render(box) {
    box = box || $("#st-view"); if (!loaded) return;
    if (open) { const p = posts.find(x => x.id === open); if (p) return editor(box, p); open = null; }
    if (!stats && tab !== "analytics") X.req("GET", "/api/stats?days=30").then(s => { stats = s; }).catch(() => {});
    setTimeout(layoutMarks, 0);
    if (X.state.view === "plan") { if (tab === "queue") tab = "calendar"; box.innerHTML = shell(planLine() + (tab === "campaigns" ? viewCampaigns() : viewCalendar())); }
    else { if (tab !== "templates") tab = "queue"; box.innerHTML = shell(tab === "templates" ? viewTemplates() : viewQueue()); }
  }

  document.addEventListener("click", async e => {
    const t = e.target, c = s => t.closest(s); if (!c("#st-view")) return;
    if (X.state.view === "stats") return;
    if (X.state.view !== "posts" && X.state.view !== "plan") return;
    const p = posts.find(x => x.id === open);
    const openNew = n => { posts.unshift(n); sortPosts(); open = n.id; save(n); render(); const el = $(".st-ptitle"); if (el) el.focus(); };
    if (c("[data-ptab]")) { tab = c("[data-ptab]").dataset.ptab; open = null; return render(); }
    if (c("[data-pf]")) { filter = c("[data-pf]").dataset.pf; return render(); }
    if (c("[data-planopen]")) { planOpen = !planOpen; return render(); }
    if (c("[data-qview]")) { qview = c("[data-qview]").dataset.qview; return render(); }
    if (c("[data-tgtedit]")) { tgtOpen = !tgtOpen; return render(); }
    if (c("[data-tgt]")) return;
    if (c("[data-pfil]") && X.state.view === "plan") { pfil = c("[data-pfil]").dataset.pfil; X.state.view = "posts"; X.keep(); return window.HSV.render(); }
    if (c("[data-pfil]")) { const v = c("[data-pfil]").dataset.pfil; pfil = pfil === v ? "" : v; return render(); }
    if (c("[data-month]")) { month = c("[data-month]").dataset.month; return render(); }
    if (c("[data-campclear]")) { campOpen = null; return render(); }
    if (c("[data-campnew]")) { tab = "campaigns"; const n = newCamp(); camps.push(n); save(n, "campaigns"); render(); const el = [...$("#st-view").querySelectorAll(".st-camp-name")].pop(); if (el) el.select(); return; }
    if (c("[data-campdel]")) { const b = c("[data-campdel]"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to delete"; return; } const id = b.dataset.campdel; await X.req("DELETE", "/api/db/campaigns/" + id); camps = camps.filter(x => x.id !== id); posts.forEach(x => { if (x.camp === id) { x.camp = ""; save(x); } }); if (campOpen === id) campOpen = null; return render(); }
    if (c("[data-cch]")) { const b = c("[data-cch]"), cp = campOf(b.dataset.cid), k = b.dataset.cch; cp.channels = (cp.channels || []).includes(k) ? cp.channels.filter(x => x !== k) : [...(cp.channels || []), k]; save(cp, "campaigns"); return render(); }
    if (c("[data-campopen]")) { campOpen = c("[data-campopen]").dataset.campopen; filter = ""; X.state.view = "posts"; X.keep(); return window.HSV.render(); }
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
    if (c("[data-splay]")) { const cv = $("#pcanvas"), b = c("[data-splay]"); if (C().playing) { C().playing.stop(); C().playing = null; b.textContent = "▶ Play"; return drawAll(p); } b.textContent = "■ Stop"; const tm = $("[data-stime]"); C().playing = window.HSC.play(cv, p.slides.map(withSrc), { onTime: (t, total) => { tm.textContent = `${t.toFixed(1)} / ${total} s`; }, onEnd: () => { C().playing = null; b.textContent = "▶ Play"; } }); return; }
    if (c("[data-sexport]")) { const cv = $("#pcanvas"), b = c("[data-sexport]"); if (C().playing) C().playing.stop(); b.disabled = true; b.textContent = "Recording…"; C().playing = window.HSC.record(cv, p.slides.map(withSrc), (blob, err) => { b.disabled = false; b.textContent = "Export video"; C().playing = null; if (!blob) return X.toast("This browser can’t record video. Chrome can."); downloadBlob(blob, fname(p, blob.type.includes("mp4") ? "mp4" : "webm")); drawAll(p); }); if (!playing) { b.disabled = false; b.textContent = "Export video"; } return; }
    if (c("[data-sdownall]")) { const sz = sizeOf(p), off = document.createElement("canvas"); off.width = sz[1]; off.height = sz[2]; const g = off.getContext("2d"); let i = 0; const next = () => { if (i >= p.slides.length) return X.toast("All slides downloaded. Your browser may have asked to allow several files."); window.HSC.draw(g, withSrc(p.slides[i]), sz[1], sz[2], 1, false); off.toBlob(bl => { downloadBlob(bl, fname(p, "png", i)); i++; setTimeout(next, 400); }, "image/png"); }; next(); return; }
    if (c("[data-pcopy]")) { const txt = (p.texts[p.platform] || "").replace(/\{link\}/g, `${location.origin}/l/${p.id}?p=${p.platform}`); try { await navigator.clipboard.writeText(txt); X.toast("Copied."); } catch (err) { X.toast("Couldn’t copy. Select the text instead."); } return; }
    if (c("[data-pdown]")) { if (C().playing) { C().playing.stop(); C().playing = null; drawAll(p); } $("#pcanvas").toBlob(b => downloadBlob(b, fname(p, "png", p.format === "image" ? null : p.cur)), "image/png"); return; }
    if (c("[data-pdel]")) { const b = c("[data-pdel]"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to delete"; return; } await X.req("DELETE", "/api/db/posts/" + p.id); posts = posts.filter(x => x !== p); open = null; return render(); }
    if (c("[data-pai]")) {
      const b = c("[data-pai]"); if (!p.brief.trim()) return X.toast("Write a brief first, one or two lines."); b.disabled = true; b.textContent = "Writing…";
      try { const r = await X.req("POST", "/api/ai/post", { lang: "en", brief: p.brief + (p.link ? ` Include this link: ${location.origin}/l/${p.id}?p=${p.platform}` : ""), tone: tone(), platform: p.platform }); p.texts[p.platform] = r.text; save(p); render(); X.toast("Draft written. Edit it, it’s a start."); }
      catch (err) { b.disabled = false; b.textContent = "Draft with AI"; X.toast(err.code === "no_ai" ? "AI isn’t switched on for this site yet." : "The draft failed. Try again."); }
      return;
    }
  });
  document.addEventListener("input", e => {
    const el = e.target; if ((X.state.view !== "posts" && X.state.view !== "plan") || !el.closest("#st-view")) return;
    if (el.matches("[data-tgt]")) { tgtDoc.targets = tgtDoc.targets || {}; tgtDoc.targets[el.dataset.tgt] = Math.max(0, +el.value || 0); clearTimeout(saveT.tgt); saveT.tgt = setTimeout(async () => { const { id, updated, ...data } = tgtDoc; try { const r = await X.req("PUT", "/api/db/settings/pillars", { data, base: updated }); tgtDoc.updated = r.updated; mark("Saved"); } catch (err) { mark("Not saved"); } }, 500); return; }
    if (el.matches("[data-ck]")) { const cp = campOf(el.dataset.cid); if (!cp) return; cp[el.dataset.ck] = el.value; mark("Saving…"); save(cp, "campaigns"); return; }
    const p = posts.find(x => x.id === open); if (!p) return;
    if (el.matches("[data-pm]")) { p.metrics[p.platform] = p.metrics[p.platform] || {}; p.metrics[p.platform][el.dataset.pm] = +el.value || 0; mark("Saving…"); save(p); return; }
    if (el.matches("[data-ptext]")) { p.texts[p.platform] = el.value; const pl = PLAT[p.platform], wrap = el.parentElement.querySelector(".st-ed-under .st-m"); if (wrap) { wrap.querySelector("em").textContent = el.value.length; wrap.classList.toggle("st-over", el.value.length > pl.max); } el.style.height = "auto"; el.style.height = Math.max(220, el.scrollHeight) + "px"; mark("Saving…"); save(p); return; }
    if (el.matches("[data-sk]")) { const s = cur(p); const k = el.dataset.sk; if (k.startsWith("chart.")) { s.chart = s.chart || { type: "bar", unit: "", data: "" }; s.chart[k.slice(6)] = el.value; } else s[k] = el.type === "checkbox" ? el.checked : el.value; syncCard(p); mark("Saving…"); save(p); const c2 = $("#pcanvas"); if (c2) { const sz = sizeOf(p); window.HSC.draw(c2.getContext("2d"), withSrc(s), sz[1], sz[2], 1, false); drawThumbs(p); } return; }
    if (el.matches("[data-pk]")) { setPath(p, el.dataset.pk, el.value); mark("Saving…"); save(p); }
  });
  document.addEventListener("change", e => { const el = e.target; if ((X.state.view !== "posts" && X.state.view !== "plan") || !el.closest("#st-view")) return; const p = posts.find(x => x.id === open); if (!p) return; if (el.matches("[data-pcamp]")) { p.camp = el.value; save(p); } if (el.matches("[data-pk=date]")) sortPosts(); });
  const lum = hex => { const m = hex.match(/[0-9a-f]{2}/gi) || ["80", "80", "80"]; const [r, g, b] = m.map(x => parseInt(x, 16) / 255); return .2126 * r + .7152 * g + .0722 * b; };

  const openPost = id => { open = id; X.state.view = "posts"; X.keep(); window.HSV.render(); };
  const openCampaigns = () => { open = null; tab = "campaigns"; X.state.view = "plan"; X.keep(); window.HSV.render(); };
  window.HSP = { render, data: () => ({ posts, camps }), openPost, openCampaigns, fmtD, num, lum, ttabs, pdot };
  load().then(() => { if (X.state.view === "posts" || X.state.view === "plan") render(); }).catch(() => {});
})();
