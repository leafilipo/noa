// noa Studio: edit the website in place, keep versions, publish.
(function () {
  const { make, LIB, ITEM, SEED, newCase, routes, get, esc, slugify } = window.HS;
  const $ = (s, r) => (r || document).querySelector(s);
  const deep = o => JSON.parse(JSON.stringify(o));
  const uid = () => Math.random().toString(36).slice(2, 10);
  const fmt = iso => { if (!iso) return ""; const d = new Date(iso); return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) + ", " + d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };

  const state = { verId: null, route: "/", edit: true, device: "desktop", panel: null, me: null, live: null, view: "site" };
  try { Object.assign(state, JSON.parse(localStorage.getItem("hs-studio") || "{}")); } catch (e) {}
  state.panel = null;
  const keep = () => { try { localStorage.setItem("hs-studio", JSON.stringify({ verId: state.verId, route: state.route, edit: state.edit, device: state.device, view: state.view })); } catch (e) {} };
  let versions = {}, inquiries = [], undo = [], saveT = null, saving = false;
  const cur = () => versions[state.verId];
  const V = () => cur().data;

  // ---- server ----
  async function req(method, path, body, type) {
    const r = await fetch(path, { method, headers: body != null ? { "content-type": type || "application/json" } : {}, body: body == null ? undefined : type ? body : JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(j.error || r.statusText); e.code = j.error || r.status; e.body = j; throw e; }
    return j;
  }
  async function load() {
    state.me = await req("GET", "/api/me");
    const [vs, live, inq] = await Promise.all([req("GET", "/api/db/versions"), req("GET", "/api/live"), req("GET", "/api/db/inquiries").catch(() => ({ docs: [] }))]);
    versions = {}; vs.docs.forEach(d => versions[d.id] = d);
    state.live = live; inquiries = inq.docs;
    if (!Object.keys(versions).length) { const data = deep(SEED); data.createdAt = new Date().toISOString(); versions.v1 = { id: "v1", data, updated: null }; await saveNow("v1"); }
    if (!versions[state.verId]) state.verId = Object.keys(versions).sort((a, b) => (versions[b].data.createdAt || "").localeCompare(versions[a].data.createdAt || ""))[0];
    render();
  }
  function scheduleSave() { V().updatedAt = new Date().toISOString(); setSaved("Saving…"); clearTimeout(saveT); saveT = setTimeout(() => saveNow(state.verId), 700); }
  async function saveNow(id) {
    const v = versions[id]; if (!v) return; saving = true;
    try { const r = await req("PUT", "/api/db/versions/" + encodeURIComponent(id), { data: v.data, base: v.updated }); v.updated = r.updated; v.by = state.me.name; setSaved("Saved"); }
    catch (e) {
      if (e.code === "conflict") { versions[id] = e.body.doc; toast(`${e.body.doc.by} saved a newer state of this version. Loaded it.`); render(); }
      else { setSaved("Not saved"); toast("Couldn’t save. Check your connection, it retries on the next change."); }
    }
    saving = false;
  }
  const setSaved = t => { const el = $("#st-saved"); if (el) { el.textContent = t; el.dataset.s = t; } };

  // ---- paths in the version document ----
  const parentOf = path => { const ks = path.split("."); const k = ks.pop(); return { arr: get(V(), ks.join(".")), i: +k, k, base: ks.join(".") }; };
  function setPath(path, val) { const ks = path.split("."); const last = ks.pop(); const o = ks.reduce((a, k) => a[k], V()); o[last] = val; }
  function snap() { undo.push({ id: state.verId, data: JSON.stringify(V()), route: state.route }); if (undo.length > 60) undo.shift(); }
  function change(fn, keepScroll = true) { snap(); fn(); scheduleSave(); renderSite(keepScroll); renderTop(); }
  function doUndo() { const u = undo.pop(); if (!u || !versions[u.id]) return toast("Nothing to undo"); versions[u.id].data = JSON.parse(u.data); state.verId = u.id; scheduleSave(); render(); toast("Undone"); }

  // ---- pages ----
  function pageList() {
    const v = V(); const pg = Object.entries(v.pages).map(([k, p]) => ({ route: p.path, name: { home: "Huit", work: "Work", about: "About", tools: "Tools", contact: "Start a project", terms: "Terms", cookies: "Cookies", imprint: "Imprint", privacy: "Privacy", notfound: "404" }[k] || k }));
    const cs = (v.cases || []).map(c => ({ route: "/work/" + c.slug, name: c.client, cas: true, hidden: c.hidden }));
    return { pg, cs };
  }
  function go(route) { state.route = route; keep(); renderSite(false); renderTop(); }

  // ---- render ----
  function render() { renderTop(); renderSite(); renderPanel(); if (window.HSV) window.HSV.render(); }
  function isDirty() { const l = state.live && state.live.current; if (!l) return true; if (l.ver !== state.verId) return true; return (V().updatedAt || "") > (l.at || ""); }
  function renderTop() {
    const v = V(), { pg, cs } = pageList(), l = state.live && state.live.current;
    const curName = (pg.find(p => p.route === state.route) || cs.find(p => p.route === state.route) || {}).name || "Page";
    $("#st-top").innerHTML = `
      <div class="st-l"><span class="st-brand"><svg viewBox="0 0 164 164" aria-hidden="true"><path fill="currentColor" stroke="currentColor" stroke-width="10" stroke-linejoin="round" d="M82.0 8.0L101.4 59.3L156.2 61.9L113.4 96.2L127.8 149.1L82.0 119.0L36.2 149.1L50.6 96.2L7.8 61.9L62.6 59.3Z"/></svg>Studio</span>
        ${state.view === "site" ? `<button class="st-btn st-drop" data-panel="pages"><span class="st-k">Page</span>${esc(curName)}<i>▾</i></button>
        <button class="st-btn st-drop" data-panel="versions"><span class="st-k">Version</span>${esc(v.name || state.verId)}${l && l.ver === state.verId ? '<span class="st-live">Live</span>' : ""}<i>▾</i></button>` : ""}
        <span class="st-saved" id="st-saved" data-s="Saved">Saved</span></div>
      <button class="st-gsearch" data-search type="button"><svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5"/><path d="M13 13l4 4"/></svg><span>Search</span><kbd>⌘K</kbd></button>
      <div class="st-r">
        <div class="st-seg"><button class="${state.edit ? "on" : ""}" data-mode="edit">Edit</button><button class="${!state.edit ? "on" : ""}" data-mode="view">Preview</button></div>
        <div class="st-seg"><button class="${state.device === "desktop" ? "on" : ""}" data-dev="desktop" title="Desktop"><svg viewBox="0 0 20 20"><rect x="2.5" y="4" width="15" height="10" rx="1.5"/><path d="M7 17h6"/></svg></button><button class="${state.device === "phone" ? "on" : ""}" data-dev="phone" title="Phone"><svg viewBox="0 0 20 20"><rect x="6" y="2.5" width="8" height="15" rx="1.8"/></svg></button></div>
        <button class="st-btn st-theme" data-sttheme title="Light or dark Studio" aria-label="Light or dark"><svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg></button>
        <button class="st-btn" data-panel="seo">SEO</button>
        <button class="st-btn" data-panel="inbox">Inbox${inquiries.length ? `<span class="st-badge">${inquiries.length}</span>` : ""}</button>
        ${state.me.canPublish ? `<button class="st-btn st-pub ${isDirty() ? "dirty" : ""}" data-panel="publish"><i class="st-dot"></i>Publish</button>` : ""}
        <span class="st-av" title="${esc(state.me.email)}">${esc((state.me.name || "?")[0])}</span>
      </div>`;
  }
  function renderSite(keepScroll) {
    const stage = $("#st-stage"), y = stage.scrollTop;
    let pg = make(V(), { edit: state.edit }).page(state.route);
    if (!pg) { state.route = "/"; pg = make(V(), { edit: state.edit }).page("/"); }
    const site = $("#site");
    site.className = "hs" + (state.edit ? " st-editing" : "") + (document.documentElement.dataset.st === "light" ? "" : " dark"); document.body.dataset.device = state.device;
    site.innerHTML = pg.html;
    if (state.edit) {
      site.querySelectorAll("[data-f],[data-ftags]").forEach(el => { el.setAttribute("contenteditable", "plaintext-only"); el.spellcheck = true; if (!el.textContent.trim()) el.classList.add("st-blank"); });
      site.querySelectorAll("[data-fm]").forEach(el => el.setAttribute("contenteditable", "true"));
    }
    stage.scrollTop = keepScroll ? y : 0;
    stuck();
    site.querySelectorAll("[data-estimate]").forEach(r => window.HS.estimate(r));
    window.HS.creatures.splice(0).forEach(c => c.stop()); site.querySelectorAll("[data-creature]").forEach(r => window.HS.creature(r));
  document.querySelectorAll("[data-date]").forEach(d => { try { d.textContent = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Berlin" }).format(new Date()).toLowerCase(); } catch (e) {} });
    site.querySelectorAll(".nf-pill").forEach(pill => { const blob = document.createElement("span"); blob.className = "nf-blob"; pill.prepend(blob);
      const to = a => { if (!a) { blob.style.width = "0"; return; } const pr = pill.getBoundingClientRect(), ar = a.getBoundingClientRect(); blob.style.left = (ar.left - pr.left) + "px"; blob.style.width = ar.width + "px"; };
      const home = () => { pill.querySelectorAll("a").forEach(x => x.classList.remove("lit")); to(pill.querySelector("a.on")); };
      pill.querySelectorAll("a").forEach(a => a.addEventListener("pointerenter", () => { pill.querySelectorAll("a").forEach(x => x.classList.remove("lit")); a.classList.add("lit"); to(a); }));
      pill.addEventListener("pointerleave", home); blob.style.transition = "none"; home(); requestAnimationFrame(() => { home(); blob.style.transition = ""; }); if (document.fonts) document.fonts.ready.then(home); }); site.querySelectorAll("[data-gallery]").forEach(r => window.HS.gallery(r));
    site.querySelectorAll("[data-bench]").forEach(g => { const path = g.closest("[data-sec]").dataset.sec + ".items"; window.HS.bench(g, {
      onGo: href => { if (!state.edit) go(href); },
      onOrder: ids => change(() => { const arr = get(V(), path); const next = ids.map(i => arr[i]); arr.splice(0, arr.length, ...next); }, true),
      onSize: (i, sz) => change(() => { get(V(), path)[i].size = sz; }, true),
      onReset: () => { renderSite(true); }
    }); });
  }
  const stuck = () => { const n = $("#site .hs-nav"); if (n) n.classList.toggle("stuck", $("#st-stage").scrollTop > 8); };

  // ---- panels ----
  function renderPanel() {
    const box = $("#st-panel"); box.hidden = !state.panel; document.body.classList.toggle("st-haspanel", !!state.panel);
    if (!state.panel) { box.innerHTML = ""; return; }
    const v = V(), l = state.live || {};
    const head = (t, sub) => `<div class="st-ph"><div><h3>${t}</h3>${sub ? `<p>${sub}</p>` : ""}</div><button class="st-x2" data-close aria-label="Close">×</button></div>`;
    let h = "";
    if (state.panel === "pages") {
      const { pg, cs } = pageList();
      h = head("Pages") + `<div class="st-list">${pg.map(p => `<button class="st-li ${p.route === state.route ? "on" : ""}" data-go="${esc(p.route)}"><span>${esc(p.name)}</span><span class="st-m">${esc(p.route)}</span></button>`).join("")}</div>
        <div class="st-sub">Case studies</div><div class="st-list">${cs.map((p, i) => `<div class="st-li-row"><button class="st-li ${p.route === state.route ? "on" : ""}" data-go="${esc(p.route)}"><span>${esc(p.name)}${p.hidden ? ' <em class="st-tag">Hidden</em>' : ""}</span><span class="st-m">${esc(p.route)}</span></button><button class="st-mini" data-cmv="${i}" data-d="-1" ${i === 0 ? "disabled" : ""}>↑</button><button class="st-mini" data-cmv="${i}" data-d="1" ${i === cs.length - 1 ? "disabled" : ""}>↓</button></div>`).join("")}</div>
        <button class="st-btn st-wide" data-addcase="1">+ New case study</button>`;
    }
    if (state.panel === "versions") {
      const ids = Object.keys(versions).sort((a, b) => (versions[b].data.createdAt || "").localeCompare(versions[a].data.createdAt || ""));
      h = head("Versions", "Each version is a full copy of the site. Try ideas in a new one, publish the one you like.") + `<div class="st-list">${ids.map(id => { const x = versions[id]; const live = l.current && l.current.ver === id; return `<button class="st-li ${id === state.verId ? "on" : ""}" data-ver="${esc(id)}"><span>${esc(x.data.name || id)}${live ? ' <em class="st-tag live">Live</em>' : ""}</span><span class="st-m">${x.by ? esc(x.by) + ", " : ""}${esc(fmt(x.data.updatedAt || x.data.createdAt))}</span></button>`; }).join("")}</div>
        <label class="st-field"><span>Name of this version</span><input data-vname value="${esc(v.name || "")}"></label>
        <button class="st-btn st-wide" data-newver="1">+ New version from ${esc(v.name || "this")}</button>
        ${ids.length > 1 && !(l.current && l.current.ver === state.verId) ? `<button class="st-btn st-wide st-danger" data-delver="1">Delete ${esc(v.name || "this version")}</button>` : ""}`;
    }
    if (state.panel === "seo") {
      const m = state.route.match(/^\/work\/(.+)$/), ci = m ? v.cases.findIndex(c => c.slug === m[1]) : -1;
      const key = ci < 0 ? Object.keys(v.pages).find(k => v.pages[k].path === state.route) : null;
      const base = ci >= 0 ? `cases.${ci}` : `pages.${key}`, o = get(v, base);
      const t = ci >= 0 ? (o.seoTitle || "") : o.title, d = ci >= 0 ? (o.seoDesc || "") : o.desc;
      h = head("SEO", "How this page shows up in Google and when shared.") + `
        <label class="st-field"><span>Title <em data-cnt="t">${(t || "").length}/60</em></span><input data-seo="${base}.${ci >= 0 ? "seoTitle" : "title"}" value="${esc(t)}" placeholder="${ci >= 0 ? esc(o.client + " · " + v.site.name) : ""}"></label>
        <label class="st-field"><span>Description <em data-cnt="d">${(d || "").length}/160</em></span><textarea rows="4" data-seo="${base}.${ci >= 0 ? "seoDesc" : "desc"}" placeholder="${ci >= 0 ? esc((o.intro || [])[0] || "") : ""}">${esc(d)}</textarea></label>
        <div class="st-serp"><span class="st-serp-u">${esc((l.hosts && l.hosts[0]) || location.host)}${esc(state.route === "/" ? "" : state.route)}</span><span class="st-serp-t">${esc(t || (ci >= 0 ? o.client + " · " + v.site.name : v.site.name))}</span><span class="st-serp-d">${esc(d || (ci >= 0 ? (o.intro || [])[0] || "" : ""))}</span></div>
        ${ci >= 0 ? `<div class="st-sub">Case study</div><label class="st-field"><span>Address</span><div class="st-pre"><span>/work/</span><input data-slug="${ci}" value="${esc(o.slug)}"></div></label>
          <label class="st-check"><input type="checkbox" data-hide="${ci}" ${o.hidden ? "checked" : ""}> Hidden (not on the site)</label>
          <button class="st-btn st-wide st-danger" data-delcase="${ci}">Delete this case study</button>` : ""}`;
    }
    if (state.panel === "inbox") {
      h = head("Inbox", "Messages from the contact form.") + (inquiries.length ? `<div class="st-inbox">${inquiries.map(q => `<div class="st-msg"><div class="st-msg-h"><b>${esc(q.data.name || "No name")}</b><span class="st-m">${esc(fmt(q.data.at))}</span></div><a href="mailto:${esc(q.data.email)}">${esc(q.data.email)}</a><p>${esc(q.data.message)}</p></div>`).join("")}</div>` : `<p class="st-empty-p">Nothing yet. Turn on the form in a Contact section to receive messages here.</p>`);
    }
    if (state.panel === "publish") {
      const rel = (l.releases || []).slice(0, 8), host = (l.hosts && l.hosts[0]) || location.host;
      h = head(`Publish ${esc(v.name || "")}`, `Puts this version live on ${esc(host)}. Everyone sees it right away.`) + `
        <div class="st-pubbox">${isDirty() ? `<p>${l.current ? `Live now: <b>${esc(l.current.verName || "")}</b>, published by ${esc(l.current.by)}, ${esc(fmt(l.current.at))}.` : "Nothing is live yet."}</p>` : `<p>This version is live and up to date.</p>`}
        <button class="st-btn st-primary st-wide" data-publish="1" ${saving ? "disabled" : ""}>Publish now</button></div>
        ${rel.length ? `<div class="st-sub">History</div><div class="st-list">${rel.map(r => `<div class="st-li-row"><div class="st-li st-static"><span>${esc(r.verName || r.ver)} · ${r.pages} pages${l.current && l.current.id === r.id ? ' <em class="st-tag live">Live</em>' : ""}</span><span class="st-m">${esc(r.by)}, ${esc(fmt(r.at))}</span></div>${l.current && l.current.id === r.id ? "" : `<button class="st-mini st-txt" data-restore="${r.id}">Restore</button>`}</div>`).join("")}</div>` : ""}
        <a class="st-btn st-wide" href="https://${esc(host)}${esc(state.route)}" target="_blank" rel="noopener">Open the live site ↗</a>`;
    }
    box.innerHTML = h;
  }
  const openPanel = p => { state.panel = state.panel === p ? null : p; renderPanel(); };

  // ---- library ----
  function openLib(path, at) {
    const dlg = $("#st-lib");
    dlg.innerHTML = `<div class="st-ph"><div><h3>Add a section</h3><p>It goes in where you clicked. You can move it afterwards.</p></div><button class="st-x2" data-libclose>×</button></div><div class="st-libgrid">${Object.entries(LIB).map(([k, x]) => `<button class="st-libit" data-libpick="${k}"><span class="st-libprev st-prev-${k}"><i></i><i></i><i></i></span><b>${esc(x.name)}</b><span>${esc(x.note)}</span></button>`).join("")}</div>`;
    dlg.dataset.path = path; dlg.dataset.at = at; dlg.showModal();
  }

  // ---- publish ----
  async function publish() {
    const btn = $("[data-publish]"); if (btn) { btn.disabled = true; btn.textContent = "Publishing…"; }
    try {
      clearTimeout(saveT); await saveNow(state.verId);
      const v = V(), r = make(v, { edit: false }), css = await (await fetch("site.css", { cache: "no-store" })).text();
      const pages = routes(v).map(path => { const p = r.page(path); return p && { path, title: p.title, desc: p.desc, html: p.html }; }).filter(Boolean);
      const out = await req("POST", "/api/live/publish", { ver: state.verId, verName: v.name, pages, css });
      state.live = await req("GET", "/api/live");
      toast(`Live: ${out.pages} pages published.`); renderTop(); renderPanel();
    } catch (e) { toast("Publishing failed: " + (e.code || e.message)); if (btn) { btn.disabled = false; btn.textContent = "Publish now"; } }
  }

  // ---- toast ----
  let toastT;
  function toast(msg, action) {
    const t = $("#st-toast"); t.innerHTML = `<span>${esc(msg)}</span>${action ? `<button>${esc(action[0])}</button>` : ""}`; t.hidden = false;
    if (action) t.querySelector("button").onclick = () => { action[1](); t.hidden = true; };
    clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, action ? 7000 : 3200);
  }

  // ---- URL bar for links ----
  function showUrl(el) {
    const bar = $("#st-url"), path = el.closest("[data-href]").dataset.href, r = el.closest("[data-href]").getBoundingClientRect();
    bar.hidden = false; bar.style.left = Math.max(12, Math.min(innerWidth - 372, r.left)) + "px"; bar.style.top = (r.bottom + 8) + "px";
    const inp = bar.querySelector("input"); inp.value = get(V(), path) || ""; inp.dataset.path = path;
  }

  // ---- events ----
  document.addEventListener("click", async e => {
    const t = e.target, c = s => t.closest(s);
    if (c("#site a")) e.preventDefault();
    if (c("[data-close]")) { state.panel = null; return renderPanel(); }
    if (c("#st-side [data-view]")) { state.view = c("[data-view]").dataset.view; state.panel = null; keep(); renderPanel(); return window.HSV && window.HSV.render(); }
    if (c("[data-sttheme]")) { const light = document.documentElement.dataset.st !== "light"; document.documentElement.dataset.st = light ? "light" : "dark"; try { localStorage.setItem("hs-st", light ? "light" : "dark"); } catch (e) {} return renderSite(true); }
    if (c("[data-panel]")) return openPanel(c("[data-panel]").dataset.panel);
    if (c("[data-mode]")) { state.edit = c("[data-mode]").dataset.mode === "edit"; keep(); renderTop(); return renderSite(true); }
    if (c("[data-dev]")) { state.device = c("[data-dev]").dataset.dev; keep(); renderTop(); return renderSite(true); }
    if (c("[data-go]")) { go(c("[data-go]").dataset.go); return renderPanel(); }
    if (c("[data-ver]")) { state.verId = c("[data-ver]").dataset.ver; keep(); undo = []; return render(); }
    if (c("[data-newver]")) {
      const n = Object.keys(versions).length + 1; let id; do { id = "v" + uid(); } while (versions[id]);
      const data = deep(V()); data.name = "V" + n; data.createdAt = new Date().toISOString(); data.base = state.verId;
      versions[id] = { id, data, updated: null }; state.verId = id; keep(); await saveNow(id); toast(`${data.name} created from ${versions[data.base].data.name}.`); return render();
    }
    if (c("[data-delver]")) {
      const b = c("[data-delver]"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to delete for good"; return; }
      const id = state.verId; await req("DELETE", "/api/db/versions/" + encodeURIComponent(id)); delete versions[id]; state.verId = Object.keys(versions)[0]; keep(); return render();
    }
    if (c("[data-publish]")) return publish();
    if (c("[data-restore]")) { await req("POST", "/api/live/activate", { release: +c("[data-restore]").dataset.restore }); state.live = await req("GET", "/api/live"); toast("That release is live again."); renderTop(); return renderPanel(); }
    if (c("[data-libclose]")) return $("#st-lib").close();
    if (c("[data-libpick]")) {
      const dlg = $("#st-lib"), k = c("[data-libpick]").dataset.libpick, path = dlg.dataset.path, at = +dlg.dataset.at; dlg.close();
      change(() => { const s = LIB[k].make(); s.id = uid(); get(V(), path).splice(at, 0, s); });
      setTimeout(() => { const el = $(`#site [data-sec="${path}.${at}"]`); if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("st-flash"); } }, 30);
      return;
    }
    if (c("[data-cmv]")) { const i = +c("[data-cmv]").dataset.cmv, d = +c("[data-cmv]").dataset.d; change(() => { const a = V().cases; [a[i], a[i + d]] = [a[i + d], a[i]]; }); return renderPanel(); }
    if (c("[data-delcase]")) {
      const b = c("[data-delcase]"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to delete"; return; }
      const i = +b.dataset.delcase, name = V().cases[i].client; change(() => V().cases.splice(i, 1)); state.panel = null; go("/work"); renderPanel(); return toast(`${name} deleted.`, ["Undo", doUndo]);
    }
    if (c("[data-addcase]")) { let cs; change(() => { cs = newCase(V()); V().cases.push(cs); }); go("/work/" + cs.slug); state.panel = "seo"; renderPanel(); return toast("New case study. It stays hidden until you switch it on in SEO."); }

    if (!c("#site")) return;
    // inside the site
    if (c("[data-mv]")) { const { arr, i } = parentOf(c("[data-mv]").dataset.mv), d = +c("[data-mv]").dataset.d; return change(() => { const [s] = arr.splice(i, 1); arr.splice(i + d, 0, s); }); }
    if (c("[data-tone]")) { const s = get(V(), c("[data-tone]").dataset.tone); return change(() => { s.tone = s.tone === "dark" ? "" : "dark"; }); }
    if (c("[data-opt]")) {
      const s = get(V(), c("[data-opt]").dataset.opt), k = c("[data-opt]").dataset.k;
      const cyc = { limit: ["", 2, 4, 6], tall: [true, false], side: ["right", "left", "none"] }[k] || [];
      const def = (LIB[s.t].opts.find(o => o[0] === k) || [])[2]; const curV = s[k] === undefined ? def : s[k];
      return change(() => { s[k] = cyc[(cyc.indexOf(curV) + 1) % cyc.length]; });
    }
    if (c("[data-dup]")) { const { arr, i } = parentOf(c("[data-dup]").dataset.dup); return change(() => { const s = deep(arr[i]); s.id = uid(); arr.splice(i + 1, 0, s); }); }
    if (c("[data-rm]")) { const { arr, i } = parentOf(c("[data-rm]").dataset.rm), name = (LIB[arr[i].t] || {}).name || "Section"; change(() => arr.splice(i, 1)); return toast(`${name} deleted.`, ["Undo", doUndo]); }
    if (c("[data-msize]")) { const m = get(V(), c("[data-msize]").dataset.msize), cyc = ["1", "2", "t", "b", "3"]; return change(() => { m.size = cyc[(cyc.indexOf(m.size || "1") + 1) % cyc.length]; }); }
    if (c("[data-mtone]")) { const m = get(V(), c("[data-mtone]").dataset.mtone), cyc = ["card", "tint", "ink", "accent"]; return change(() => { m.tone = cyc[(cyc.indexOf(m.tone || "card") + 1) % cyc.length]; }); }
    if (c("[data-mcase]")) { const m = get(V(), c("[data-mcase]").dataset.mcase), cs = V().cases.map(x => x.slug); return change(() => { m.case = cs[(cs.indexOf(m.case) + 1) % cs.length] || ""; }); }
    if (c("[data-mvar]")) { const m = get(V(), c("[data-mvar]").dataset.mvar), cyc = ["waves", "dots", "grid"]; return change(() => { m.variant = cyc[(cyc.indexOf(m.variant || "waves") + 1) % cyc.length]; }); }
    if (c("[data-madd]")) { const b = c("[data-madd]"); return change(() => { get(V(), b.dataset.madd).push(ITEM.mod(b.dataset.kind)); }); }
    if (c("[data-addsec]")) return openLib(c("[data-addsec]").dataset.addsec, +c("[data-addsec]").dataset.at);
    if (c("[data-add]")) { const b = c("[data-add]"), path = b.dataset.add; change(() => { const a = get(V(), path) || (setPath(path, []), get(V(), path)); a.push(ITEM[b.dataset.kind]()); }); return; }
    if (c("[data-del]")) { const { arr, i } = parentOf(c("[data-del]").dataset.del); change(() => arr.splice(i, 1)); return toast("Removed.", ["Undo", doUndo]); }
    if (c("[data-imgset]")) { e.preventDefault(); return pickImage(c("[data-imgset]").dataset.imgset); }
    if (c("[data-imgdel]")) { e.preventDefault(); const p = c("[data-imgdel]").dataset.imgdel; return change(() => setPath(p, "")); }
    if (c("[data-feature]")) { e.preventDefault(); const path = c("[data-feature]").dataset.feature, cs = V().cases.map(x => x.slug); const i = cs.indexOf(get(V(), path)); return change(() => setPath(path, cs[(i + 1) % cs.length] || "")); }
    if (c("[data-caseopen]")) { e.preventDefault(); return go("/work/" + V().cases[+c("[data-caseopen]").dataset.caseopen].slug); }
    if (c("[data-casehide]")) { e.preventDefault(); const i = +c("[data-casehide]").dataset.casehide; return change(() => { V().cases[i].hidden = !V().cases[i].hidden; }); }
    if (state.edit && c("[data-img]") && !c("[data-f]")) { return pickImage(c("[data-img]").dataset.img); }
    if (c("[data-tab]") && !c("[contenteditable]")) { const n = c("[data-tab]").dataset.tab, pane = c(".hs-s").querySelector(`[data-pane="${n}"]`); if (pane) pane.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (c(".hs-burger")) { const n = $("#site .hs-nav"); n.classList.toggle("open"); return; }
    // preview: links work like on the real site
    const a = c("a");
    if (a && !state.edit) { const href = a.getAttribute("href") || ""; if (href.startsWith("/")) go(href); else if (/^https?:|^mailto:/.test(href)) window.open(href, "_blank", "noopener"); }
    else if (a && state.edit && !c("[contenteditable]")) { const href = a.getAttribute("href") || ""; if (href.startsWith("/") && c(".hs-menu, .hs-logo, .hs-next-in, .hs-back, .nf-pill, .nf-name")) go(href); }
  });

  function pickImage(path) {
    const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/png,image/jpeg,image/webp,image/gif,image/svg+xml,image/avif";
    inp.onchange = async () => {
      const file = inp.files[0]; if (!file) return;
      toast("Uploading…");
      try { const blob = await shrink(file); const r = await req("POST", "/api/blob", blob, blob.type); change(() => setPath(path, "asset:" + r.id)); toast("Image added."); }
      catch (e) { toast(e.code === "too_large" ? "That image is too large (max. 1.9 MB after compression)." : "Upload failed."); }
    };
    inp.click();
  }
  // keep uploads light: long edge 2400px, webp
  async function shrink(file) {
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return file;
    const bmp = await createImageBitmap(file); const s = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    if (s === 1 && file.size < 900e3) return file;
    const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * s); cv.height = Math.round(bmp.height * s); cv.getContext("2d").drawImage(bmp, 0, 0, cv.width, cv.height);
    return await new Promise(r => cv.toBlob(r, "image/webp", .86));
  }

  // text editing
  const site = () => $("#site");
  document.addEventListener("input", e => {
    const el = e.target;
    if (el.matches("[data-vname]")) { V().name = el.value.slice(0, 40); scheduleSave(); renderTop(); return; }
    if (el.matches("[data-seo]")) { setPath(el.dataset.seo, el.value); scheduleSave(); const cnt = el.closest(".st-field").querySelector("em"); if (cnt) cnt.textContent = el.value.length + (el.tagName === "TEXTAREA" ? "/160" : "/60"); return; }
    if (el.matches("[data-slug]")) { const i = +el.dataset.slug, s = slugify(el.value); if (s && !V().cases.some((c, k) => k !== i && c.slug === s)) { V().cases[i].slug = s; state.route = "/work/" + s; keep(); scheduleSave(); } return; }
    if (el.matches("#st-url input")) { setPath(el.dataset.path, el.value.trim()); scheduleSave(); return; }
    if (!site().contains(el)) return;
    const f = el.closest("[data-f]"), fm = el.closest("[data-fm]"), ft = el.closest("[data-ftags]");
    if (!undo.length || undo[undo.length - 1].typing !== (f || fm || ft)) { snap(); undo[undo.length - 1].typing = f || fm || ft; }
    if (f) { setPath(f.dataset.f, f.textContent.replace(/ /g, " ")); f.classList.toggle("st-blank", !f.textContent.trim()); }
    else if (fm) { const ps = fm.children.length ? [...fm.children].map(p => p.innerText.replace(/ /g, " ").trim()) : fm.innerText.split(/\n+/); setPath(fm.dataset.fm, ps.filter(Boolean)); }
    else if (ft) setPath(ft.dataset.ftags, ft.textContent.split(",").map(x => x.trim()).filter(Boolean));
    scheduleSave();
  });
  document.addEventListener("change", e => {
    if (e.target.matches("[data-hide]")) { const i = +e.target.dataset.hide; change(() => { V().cases[i].hidden = e.target.checked; }); }
    if (e.target.matches("[data-slug]")) { e.target.value = V().cases[+e.target.dataset.slug].slug; renderTop(); renderSite(true); }
  });
  document.addEventListener("keydown", e => {
    const el = e.target;
    if (el.matches && el.matches("#site [data-f]") && e.key === "Enter") { e.preventDefault(); el.blur(); }
    if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey && !(el.isContentEditable || /INPUT|TEXTAREA/.test(el.tagName))) { e.preventDefault(); doUndo(); }
    if (e.key === "Escape") { if (!$("#st-url").hidden) $("#st-url").hidden = true; else if (state.panel) { state.panel = null; renderPanel(); } }
  });
  document.addEventListener("paste", e => {
    const el = e.target.closest && e.target.closest("#site [contenteditable]"); if (!el) return;
    e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData("text/plain");
    document.execCommand("insertText", false, el.matches("[data-f]") ? t.replace(/\s*\n\s*/g, " ") : t);
  });
  document.addEventListener("focusin", e => {
    if (state.edit && e.target.closest && e.target.closest("#site [data-href]")) showUrl(e.target);
    else if (!e.target.closest || !e.target.closest("#st-url")) $("#st-url").hidden = true;
  });
  document.addEventListener("focusout", e => { const el = e.target; if (el.matches && el.matches("#site [data-fm]")) { /* tidy paragraphs after editing */ setTimeout(() => { if (!el.contains(document.activeElement)) renderSite(true); }, 0); } });

  // stage
  window.addEventListener("load", () => {});
  $("#st-stage").addEventListener("scroll", stuck, { passive: true });
  setInterval(async () => { if (document.hidden) return; try { const q = await req("GET", "/api/db/inquiries"); if (q.docs.length !== inquiries.length) { inquiries = q.docs; renderTop(); if (state.panel === "inbox") renderPanel(); } } catch (e) {} }, 60000);
  window.addEventListener("beforeunload", e => { if ($("#st-saved").dataset.s === "Saving…") { e.preventDefault(); e.returnValue = ""; } });

  window.HSX = { state, req, V, cur: () => cur(), versions: () => versions, change, go, toast, render, renderTop, scheduleSave, keep, pickFile: (cb) => { const inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*,.svg,.pdf,.zip,.woff2,.otf,.ttf"; inp.onchange = () => cb(inp.files[0]); inp.click(); }, shrink, fmt };
  load().catch(e => { $("#st-stage").innerHTML = `<div class="st-fail"><h2>Studio couldn’t load</h2><p>${esc(e.code === "login_required" ? "Please log in again." : e.code === "not_invited" ? "This email isn’t on the team list yet." : "Error: " + (e.code || e.message))}</p></div>`; });
})();
