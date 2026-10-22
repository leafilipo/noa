// Studio side menu: Website (editor), Projects, Tone of voice, Brand kit, References.
// Tone, brand and references are documents in the "settings" collection; projects are the version's cases.
(function () {
  const X = window.HSX, { esc, get, src, slugify } = window.HS;
  const $ = (s, r) => (r || document).querySelector(s);
  const deep = o => JSON.parse(JSON.stringify(o));
  const VIEWS = [["site", "Website", "M3 4h14v12H3z M3 8h14"], ["projects", "Projects", "M3 5h6l2 2h6v9H3z"], ["tone", "Tone of voice", "M4 15V5h12v8H8z"], ["brand", "Guides", "M10 3l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1z"], ["refs", "References", "M8 12l4-4M6 14l-1 1a2 2 0 0 1-3-3l3-3a2 2 0 0 1 3 0M14 6l1-1a2 2 0 0 1 3 3l-3 3a2 2 0 0 1-3 0"], ["widgets", "Widgets", "M3 3h6v6H3z M11 3h6v6h-6z M3 11h6v6H3z M11 11h6v6h-6z"], ["posts", "Posts", "M4 4h12v9H8l-4 3z"], ["stats", "Analytics", "M3 16h14M5 13V9M9 13V5M13 13V8M17 13V3"]];

  const docs = {}; let loaded = false, saveT = {};
  async function load() {
    const r = await X.req("GET", "/api/db/settings");
    r.docs.forEach(d => docs[d.id] = d);
    ["tone", "brand", "refs"].forEach(id => { if (!docs[id]) docs[id] = { id, data: deep(SEEDS[id]), updated: null }; });
    if (!docs.brand.data.guides) docs.brand.data.guides = deep(GUIDES);
    loaded = true;
  }
  function save(id) { clearTimeout(saveT[id]); saveT[id] = setTimeout(async () => { const d = docs[id]; try { const r = await X.req("PUT", "/api/db/settings/" + id, { data: d.data, base: d.updated }); d.updated = r.updated; mark("Saved"); } catch (e) { mark("Not saved"); X.toast("Couldn’t save. It retries on the next change."); } }, 600); }
  const mark = t => { const el = $("#st-saved"); if (el) { el.textContent = t; el.dataset.s = t; } };
  const setPath = (obj, path, val) => { const ks = path.split("."); const last = ks.pop(); ks.reduce((a, k) => a[k], obj)[last] = val; };

  // ---- seeds ----
  const REF_LIST = [];
  const GUIDES = [
    { part: "design", topic: "World", rules: [
      "Everything on the site belongs to one world. A new piece is a new specimen in it, not a portfolio item.",
      "Each specimen gets a field guide entry: name, Latin name, habitat, behaviour, first observed, status.",
      "Play first, explanation second. A visitor should touch something before they read anything." ] },
    { part: "design", topic: "Look", rules: [
      "Grain paper, ink outlines, one sky blue. Colour comes from the creatures and skies, not the chrome.",
      "Outlined shapes, stacked and repeated. Eyes, bones, circles, clouds.",
      "Mono for labels and nav, sans for reading." ] },
    { part: "design", topic: "Motion", rules: [
      "Things are alive: they wander, blink, follow attention. Nothing loops just to get attention.",
      "Every interaction has a consequence the visitor can see: something eats, grows, blinks or answers." ] },
    { part: "content", topic: "Posts", rules: [
      "A post is a sighting: a new specimen, a behaviour, a field note, an experiment that failed.",
      "Show the thing moving. A short clip beats a still.",
      "One point per post, and the first line works on its own." ] },
    { part: "content", topic: "Language", rules: [
      "Short sentences, plain words, no em-dashes, no exclamation marks.",
      "Write about creatures as if they are real, with a straight face.",
      "No art-speak: no “explores the liminal”, no “interrogates”." ] }
  ];
  const SEEDS = {
    tone: { intro: "How noa sounds: on the site, in field guide entries and in posts.", principles: [
      { title: "Straight face", text: "The creatures are real. Describe them like a naturalist would, calmly and precisely." },
      { title: "Curious", text: "Questions are allowed. “I don’t know why he does that yet” is a good sentence." },
      { title: "Plain", text: "Short sentences, ordinary words. The work is strange enough." },
      { title: "Warm", text: "A bit of humour, never a wink at the audience." }],
      dos: ["Name things: species, places, dates.", "Describe behaviour, not intentions.", "Lowercase, calm, specific."],
      donts: ["No art-speak (“liminal”, “interrogates”, “explores the notion of”).", "No em-dashes, no exclamation marks.", "No hype, no “new drop”."],
      samples: [{ k: "Field guide", v: "Wanders in loops. Follows attention. Eats whatever you drop." }, { k: "Post", v: "New sighting: a spine swimming between two cumulus clouds over Berlin. It dashes when startled." }] },
    brand: { intro: "How noa looks. The values here are the ones the website uses.",
      colors: [{ name: "Paper", hex: "#DCD8D3", note: "Page, with grain" }, { name: "Ink", hex: "#1A1A1A", note: "Text, outlines" }, { name: "Sky", hex: "#1E63D8", note: "Skies, the contact block" }, { name: "Deep blue", hex: "#1B3FA0", note: "Labels, irises" }, { name: "Cloud", hex: "#F3F1EA", note: "Frames, clouds" }, { name: "Night", hex: "#121212", note: "Dark mode" }],
      type: [{ name: "Reading", v: "Inter Tight 400 to 600." }, { name: "Labels and nav", v: "IBM Plex Mono 400, 12 to 13px, uppercase for labels." }],
      marks: [],
      rules: ["Outlines are 1.5px ink. Cards have 14px corners.", "Images sit in cream frames, slightly tilted.", "Dark mode is night: the same world, lights off."],
      assets: [], guides: GUIDES },
    refs: { intro: "Artists, sites and things you look at.", items: [] }
  };


  // ---- side menu ----
  const ICON = Object.fromEntries(VIEWS.map(([id, , d]) => [id, d]));
  ICON.plan = "M3 5h14v12H3z M3 9h14 M7 3v4 M13 3v4"; ICON.posts = "M5 15l1-4 7-7 3 3-7 7z M12 5l3 3";
  const GROUPS = [["Site", [["site", "Website"], ["projects", "Projects"], ["widgets", "Widgets"]]], ["Content", [["posts", "Create"], ["plan", "Plan"], ["stats", "Analytics"]]], ["Brand", [["brand", "Guides"], ["tone", "Tone of voice"], ["refs", "References"]]]];
  function renderSide() {
    const s = X.state;
    $("#st-side").innerHTML = GROUPS.map(([g, items]) => `<div class="st-sgroup"><div class="st-ssec">${esc(g)}</div>${items.map(([id, name]) => `<button class="st-sitem ${s.view === id ? "on" : ""}" data-view="${id}" title="${esc(name)}" ${s.view === id ? 'aria-current="page"' : ""}><svg viewBox="0 0 20 20"><path d="${ICON[id] || ""}"/></svg><span>${esc(name)}</span></button>`).join("")}</div>`).join("");
  }

  // ---- views ----
  const field = (id, path, val, opts) => opts && opts.multi ? `<textarea class="st-in" data-doc="${id}" data-path="${esc(path)}" rows="${opts.rows || 2}">${esc(val)}</textarea>` : `<input class="st-in" data-doc="${id}" data-path="${esc(path)}" value="${esc(val)}" ${opts && opts.ph ? `placeholder="${esc(opts.ph)}"` : ""}>`;
  const row = (id, path, i, inner) => `<div class="st-row" data-row="${esc(path)}.${i}"><div class="st-row-in">${inner}</div><button class="st-mini st-rowx" data-rowdel="${esc(path)}.${i}" data-doc="${id}" title="Remove">×</button></div>`;
  const addBtn = (id, path, kind) => `<button class="st-btn st-addrow" data-rowadd="${esc(path)}" data-doc="${id}" data-kind="${kind}">+ Add</button>`;
  const head = (t, sub) => `<div class="st-vh"><h1>${t}</h1>${sub !== undefined ? `<textarea class="st-in st-intro" data-doc="${t.toLowerCase() === "tone of voice" ? "tone" : t.toLowerCase() === "guides" ? "brand" : "refs"}" data-path="intro" rows="2">${esc(sub)}</textarea>` : ""}</div>`;

  function viewProjects() {
    const V = X.V(), cs = V.cases || [];
    return `<div class="st-vh"><h1>Projects</h1><p>Case studies on the Work page, in this order. Hidden ones stay in the Studio and off the site.</p></div>
      <div class="st-plist">${cs.map((c, i) => `<div class="st-proj ${c.hidden ? "hid" : ""}">
        <div class="st-pthumb" data-pimg="${i}">${c.img ? `<img src="${esc(src(c.img))}" alt="">` : `<span>Add image</span>`}</div>
        <div class="st-pbody"><input class="st-in st-pname" data-case="${i}" data-k="client" value="${esc(c.client)}"><input class="st-in" data-case="${i}" data-k="tags" value="${esc((c.tags || []).join(", "))}" placeholder="Tags, comma separated"><textarea class="st-in" data-case="${i}" data-k="intro" rows="2" placeholder="One paragraph on the brief">${esc((c.intro || []).join("\n"))}</textarea><div class="st-pmeta"><span class="st-m">/work/${esc(c.slug)}</span><label class="st-check"><input type="checkbox" data-case="${i}" data-k="hidden" ${c.hidden ? "checked" : ""}> Hidden</label></div></div>
        <div class="st-pacts"><button class="st-mini" data-pmv="${i}" data-d="-1" ${i === 0 ? "disabled" : ""}>↑</button><button class="st-mini" data-pmv="${i}" data-d="1" ${i === cs.length - 1 ? "disabled" : ""}>↓</button><button class="st-btn" data-prjopen="${i}">Open page</button><button class="st-mini st-txt st-danger" data-pdel="${i}">Delete</button></div>
      </div>`).join("")}</div>
      <button class="st-btn st-primary" data-addcase="1">+ New project</button>`;
  }
  function viewTone() {
    const d = docs.tone.data, id = "tone";
    const ta = (path, val, cls, ph) => `<textarea class="st-doc ${cls || ""}" data-doc="${id}" data-path="${esc(path)}" rows="1" placeholder="${esc(ph || "")}">${esc(val)}</textarea>`;
    return `<div class="st-tone">
      <header class="st-tone-h"><h1>Tone of voice</h1>${ta("intro", d.intro, "st-doc-lead", "What this is for")}</header>
      <section class="st-tone-s"><h2>Principles</h2><div class="st-tone-grid">${d.principles.map((p, i) => `<div class="st-tone-card" data-row="principles.${i}"><span class="st-tone-n">${String(i + 1).padStart(2, "0")}</span>${ta(`principles.${i}.title`, p.title, "st-doc-h", "Principle")}${ta(`principles.${i}.text`, p.text, "", "What it means in practice")}<button class="st-mini st-rowx" data-rowdel="principles.${i}" data-doc="${id}">×</button></div>`).join("")}<button class="st-tone-add" data-rowadd="principles" data-doc="${id}" data-kind="principle">+ Principle</button></div></section>
      <section class="st-tone-s st-tone-two">
        <div><h2>Do</h2><ul class="st-tone-list">${d.dos.map((p, i) => `<li data-row="dos.${i}"><span class="st-tone-dot"></span>${ta(`dos.${i}`, p, "", "A rule")}<button class="st-mini st-rowx" data-rowdel="dos.${i}" data-doc="${id}">×</button></li>`).join("")}</ul><button class="st-tone-add" data-rowadd="dos" data-doc="${id}" data-kind="line">+ Add</button></div>
        <div><h2>Don’t</h2><ul class="st-tone-list st-tone-no">${d.donts.map((p, i) => `<li data-row="donts.${i}"><span class="st-tone-dot"></span>${ta(`donts.${i}`, p, "", "A rule")}<button class="st-mini st-rowx" data-rowdel="donts.${i}" data-doc="${id}">×</button></li>`).join("")}</ul><button class="st-tone-add" data-rowadd="donts" data-doc="${id}" data-kind="line">+ Add</button></div>
      </section>
      <section class="st-tone-s"><h2>How it sounds</h2><div class="st-tone-grid">${d.samples.map((p, i) => `<figure class="st-tone-q" data-row="samples.${i}">${ta(`samples.${i}.v`, p.v, "st-doc-q", "The line")}<figcaption>${ta(`samples.${i}.k`, p.k, "st-doc-k", "Where")}</figcaption><button class="st-mini st-rowx" data-rowdel="samples.${i}" data-doc="${id}">×</button></figure>`).join("")}<button class="st-tone-add" data-rowadd="samples" data-doc="${id}" data-kind="kv">+ Sample</button></div></section>
    </div>`;
  }
  function viewBrand() {
    const d = docs.brand.data, id = "brand";
    const rules = part => `<div class="st-guides">${(d.guides || []).map((g, gi) => g.part !== part ? "" : `<div class="st-guide" data-row="guides.${gi}">
        <textarea class="st-doc st-guide-t" data-doc="${id}" data-path="guides.${gi}.topic" rows="1">${esc(g.topic)}</textarea>
        <ol class="st-guide-l">${g.rules.map((r, ri) => `<li data-row="guides.${gi}.rules.${ri}"><textarea class="st-doc" data-doc="${id}" data-path="guides.${gi}.rules.${ri}" rows="1" placeholder="A rule">${esc(r)}</textarea><button class="st-mini st-rowx" data-rowdel="guides.${gi}.rules.${ri}" data-doc="${id}" title="Remove">×</button></li>`).join("")}</ol>
        <button class="st-tone-add" data-rowadd="guides.${gi}.rules" data-doc="${id}" data-kind="line">+ Rule</button></div>`).join("")}<button class="st-tone-add st-guide-new" data-guideadd="${part}">+ Topic</button></div>`;
    return head("Guides", d.intro) + `
      <nav class="st-gnav"><a href="#g-kit">Brand kit</a><a href="#g-design">Design rules</a><a href="#g-content">Content rules</a><span class="st-m">Tone of voice has its own page.</span></nav>
      <h2 class="st-gh" id="g-kit">Brand kit</h2>
      <section class="st-vs"><h2>Colours</h2><div class="st-swatches">${d.colors.map((c, i) => `<div class="st-sw" data-row="colors.${i}"><label class="st-swc" style="background:${esc(c.hex)}"><input type="color" data-doc="${id}" data-path="colors.${i}.hex" value="${esc(/^#[0-9a-f]{6}$/i.test(c.hex) ? c.hex : "#000000")}"></label>${field(id, `colors.${i}.name`, c.name)}${field(id, `colors.${i}.hex`, c.hex)}${field(id, `colors.${i}.note`, c.note, { ph: "Used for" })}<button class="st-mini st-rowx" data-rowdel="colors.${i}" data-doc="${id}">×</button></div>`).join("")}</div>${addBtn(id, "colors", "color")}</section>
      <section class="st-vs"><h2>Type</h2>${d.type.map((t, i) => row(id, "type", i, field(id, `type.${i}.name`, t.name) + field(id, `type.${i}.v`, t.v, { multi: true }))).join("")}${addBtn(id, "type", "kv2")}</section>
      <section class="st-vs"><h2>Marks</h2><div class="st-marks">${d.marks.map((m, i) => `<div class="st-mark" data-row="marks.${i}"><div class="st-pthumb st-mthumb" data-bimg="marks.${i}.img">${m.img ? `<img src="${esc(src(m.img))}" alt="">` : "<span>Add file</span>"}</div>${field(id, `marks.${i}.name`, m.name)}${field(id, `marks.${i}.note`, m.note, { multi: true })}<button class="st-mini st-rowx" data-rowdel="marks.${i}" data-doc="${id}">×</button></div>`).join("")}</div>${addBtn(id, "marks", "mark")}</section>
      <section class="st-vs"><h2>Rules</h2>${d.rules.map((p, i) => row(id, "rules", i, field(id, `rules.${i}`, p, { multi: true }))).join("")}${addBtn(id, "rules", "line")}</section>
      <section class="st-vs"><h2>Files</h2><p class="st-m">Logos, fonts, templates. Anyone on the team can download them from here.</p><div class="st-files">${(d.assets || []).map((a, i) => `<a class="st-file" href="${esc(src(a.id))}" download="${esc(a.name)}" target="_blank"><span>${esc(a.name)}</span><span class="st-m">${esc(a.type || "")}</span><button class="st-mini st-rowx" data-rowdel="assets.${i}" data-doc="${id}">×</button></a>`).join("")}</div><button class="st-btn" data-upload="assets">Upload file</button></section>
      <h2 class="st-gh" id="g-design">Design rules</h2><p class="st-m st-gp">For the website, the Studio, posts and anything else that carries the name.</p>${rules("design")}
      <h2 class="st-gh" id="g-content">Content rules</h2><p class="st-m st-gp">What we write and show, and in what order. Posts and AI drafts follow these too.</p>${rules("content")}`;
  }
  // ---- widgets: the little cards in the corners of the home page. Settings live in the version (site.widgets) and publish with it. ----
  const WDEF = { clock: { name: "Clock", note: "An analog clock on Berlin time.", fields: [["label", "Label under the time"]] }, weather: { name: "Weather", note: "The sky over Berlin right now, drawn. Temperature and conditions from Open-Meteo, no account needed.", fields: [["label", "Label (leave empty for the live condition)"]] }, stats: { name: "Worm stats", note: "Snacks eaten, distance crawled and time awake, counted live while someone watches.", fields: [] }, now: { name: "Now", note: "One line you set here: what you're making or thinking about.", fields: [["text", "The line"], ["label", "Small label"]] }, music: { name: "Music", note: "What you're listening to, with little bars that dance. Add a link to Spotify, Apple Music or anywhere.", fields: [["title", "Track"], ["artist", "Artist"], ["href", "Link (optional)"]] } };
  const CORNERS = [["tl", "Top left"], ["tr", "Top right"], ["bl", "Bottom left"], ["br", "Bottom right"]];
  function viewWidgets() {
    const V = X.V(); V.site.widgets = V.site.widgets || {}; const W = V.site.widgets;
    return `<div class="st-vh"><h1>Widgets</h1><p>Small live cards in the corners of the home page. Switch them on, pick a corner, set the text. They publish with the site.</p></div>
      <div class="st-wgrid">${Object.entries(WDEF).map(([id, d]) => { const w = W[id] || (W[id] = { on: false, corner: "br" }); return `<section class="st-wcard ${w.on !== false ? "on" : ""}">
        <header><label class="st-switch"><input type="checkbox" data-won="${id}" ${w.on !== false ? "checked" : ""}><span></span></label><div><h2>${esc(d.name)}</h2><p class="st-m">${esc(d.note)}</p></div></header>
        <div class="st-wfields"><label class="st-field"><span>Corner</span><select class="st-in" data-wcorner="${id}">${CORNERS.map(([k, n]) => `<option value="${k}" ${w.corner === k ? "selected" : ""}>${n}</option>`).join("")}</select></label>
        ${d.fields.map(([k, n]) => `<label class="st-field"><span>${esc(n)}</span><input class="st-in" data-wfield="${id}.${k}" value="${esc(w[k] || "")}"></label>`).join("")}</div></section>`; }).join("")}</div>`;
  }
  function viewRefs() {
    const d = docs.refs.data, id = "refs";
    const items = d.items.map((r, i) => ({ r, i }));
    const tier = t => items.filter(x => x.r.tier === t);
    const card = ({ r, i }) => `<div class="st-ref ${r.tier ? "st-ref-" + r.tier : ""}" data-row="items.${i}">
        <a class="st-shot" href="${esc(r.url)}" target="_blank" rel="noopener" title="Open site">${r.img ? `<img src="${esc(src(r.img))}" alt="" loading="lazy">` : `<span>No screenshot</span>`}</a><button class="st-mini st-txt st-shotbtn" data-shot="${i}" title="Upload a screenshot">${r.img ? "Replace shot" : "Add shot"}</button>
        <div class="st-ref-h"><a class="st-ref-name" href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.name)} ↗</a><span class="st-ref-tier"><button class="st-mini ${r.tier === "fav" ? "on" : ""}" data-tier="fav" data-i="${i}" title="Favourite">★</button><button class="st-mini ${r.tier === "top" ? "on" : ""}" data-tier="top" data-i="${i}" title="Benchmark">◆</button><button class="st-mini st-rowx" data-rowdel="items.${i}" data-doc="${id}">×</button></span></div>
        ${field(id, `items.${i}.name`, r.name)}${field(id, `items.${i}.url`, r.url)}${field(id, `items.${i}.note`, r.note, { multi: true, rows: 2 })}</div>`;
    return head("References", d.intro) + `
      <section class="st-vs"><h2>Favourite</h2><div class="st-refgrid">${tier("fav").map(card).join("") || "<p class='st-m'>Mark one with ★</p>"}</div></section>
      <section class="st-vs"><h2>Benchmarks</h2><p class="st-m">The ones we compare against. Toggle ◆ on any site below to add it.</p><div class="st-refgrid">${tier("top").map(card).join("")}</div></section>
      <section class="st-vs"><h2>All (${items.length})</h2><input class="st-in st-refq" placeholder="Filter…" data-refq><div class="st-refgrid st-refall">${tier("").map(card).join("")}</div>${addBtn(id, "items", "ref")}</section>`;
  }
  const ITEMS = { principle: () => ({ title: "", text: "" }), line: () => "", kv: () => ({ k: "", v: "" }), kv2: () => ({ name: "", v: "" }), color: () => ({ name: "New colour", hex: "#888888", note: "" }), mark: () => ({ name: "", note: "", img: "" }), ref: () => ({ name: "", url: "https://", tier: "", note: "" }) };

  const grow = el => { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; };
  function render() {
    renderSide(); if (X.renderTop) X.renderTop();
    const v = X.state.view, site = $("#site"), box = $("#st-view");
    document.body.dataset.view = v;
    if (v === "site" || !loaded) { site.hidden = false; box.hidden = true; box.innerHTML = ""; return; }
    site.hidden = true; box.hidden = false;
    if (v === "posts" || v === "plan") { box.innerHTML = ""; if (window.HSP) window.HSP.render(box); return; }
    if (v === "stats") { box.innerHTML = ""; if (window.HSA) window.HSA.analytics(box); return; }
    box.innerHTML = `<div class="st-vwrap">${v === "projects" ? viewProjects() : v === "tone" ? viewTone() : v === "brand" ? viewBrand() : v === "widgets" ? viewWidgets() : viewRefs()}</div>`;
    box.querySelectorAll("textarea.st-doc").forEach(grow);
  }

  // ---- events ----
  document.addEventListener("input", e => {
    const el = e.target;
    if (el.matches("[data-wfield]")) { const [id, k] = el.dataset.wfield.split("."); X.V().site.widgets[id][k] = el.value; X.V().updatedAt = new Date().toISOString(); mark("Saving…"); X.scheduleSave(); return; }
    if (el.matches("[data-doc][data-path]")) {
      const id = el.dataset.doc, d = docs[id].data; let val = el.value; if (el.classList.contains("st-doc")) grow(el);
      setPath(d, el.dataset.path, val); mark("Saving…"); save(id);
      if (el.type === "color") { const sib = el.closest(".st-sw").querySelector(`input[data-path="${el.dataset.path}"]:not([type=color])`); if (sib) sib.value = val; el.parentElement.style.background = val; }
      else if (/\.hex$/.test(el.dataset.path) && /^#[0-9a-f]{6}$/i.test(val)) { const sw = el.closest(".st-sw"); sw.querySelector(".st-swc").style.background = val; sw.querySelector("input[type=color]").value = val; }
      return;
    }
    if (el.matches("[data-refq]")) { const q = el.value.toLowerCase(); $("#st-view .st-refall").querySelectorAll(".st-ref").forEach(c => c.hidden = q && !c.textContent.toLowerCase().includes(q)); return; }
    if (el.matches("[data-case]") && !el.matches("[type=checkbox]")) {
      const i = +el.dataset.case, k = el.dataset.k, c = X.V().cases[i];
      if (k === "client") { c.client = el.value; if (!c._slugLocked) { const s = slugify(el.value); if (s && !X.V().cases.some((x, j) => j !== i && x.slug === s)) { c.slug = s; el.closest(".st-proj").querySelector(".st-m").textContent = "/work/" + s; } } }
      else if (k === "tags") c.tags = el.value.split(",").map(x => x.trim()).filter(Boolean);
      else if (k === "intro") c.intro = el.value.split(/\n+/).map(x => x.trim()).filter(Boolean);
      X.V().updatedAt = new Date().toISOString(); mark("Saving…"); X.scheduleSave(); return;
    }
  });
  document.addEventListener("change", e => {
    const el = e.target;
    if (el.matches("[data-won]")) { const id = el.dataset.won; X.change(() => { X.V().site.widgets[id].on = el.checked; }); el.closest(".st-wcard").classList.toggle("on", el.checked); return; }
    if (el.matches("[data-wcorner]")) { const id = el.dataset.wcorner; X.change(() => { X.V().site.widgets[id].corner = el.value; }); return; }
    if (el.matches("[data-case][type=checkbox]")) { const i = +el.dataset.case; X.change(() => { X.V().cases[i].hidden = el.checked; }); el.closest(".st-proj").classList.toggle("hid", el.checked); }
  });
  document.addEventListener("click", async e => {
    const t = e.target, c = s => t.closest(s); if (!c("#st-view")) return;
    const V = X.V();
    if (c("[data-guideadd]")) { const d = docs.brand.data; d.guides = d.guides || []; d.guides.push({ part: c("[data-guideadd]").dataset.guideadd, topic: "New topic", rules: [""] }); save("brand"); render(); return; }
    if (c("[data-rowadd]")) { const b = c("[data-rowadd]"), d = docs[b.dataset.doc].data; const arr = get(d, b.dataset.rowadd); arr.push(ITEMS[b.dataset.kind]()); save(b.dataset.doc); render(); const last = [...$("#st-view").querySelectorAll(`[data-row^="${b.dataset.rowadd}."]`)].pop(); if (last) { last.scrollIntoView({ block: "center" }); const f = last.querySelector("input:not([type=color]),textarea"); if (f) f.focus(); } return; }
    if (c("[data-rowdel]")) { const b = c("[data-rowdel]"), d = docs[b.dataset.doc].data, ks = b.dataset.rowdel.split("."), i = +ks.pop(), arr = get(d, ks.join(".")); const gone = arr.splice(i, 1)[0]; save(b.dataset.doc); render(); X.toast("Removed.", ["Undo", () => { arr.splice(i, 0, gone); save(b.dataset.doc); render(); }]); return; }
    if (c("[data-shot]")) { const i = +c("[data-shot]").dataset.shot; X.pickFile(async file => { if (!file) return; try { const blob = await X.shrink(file); const r = await X.req("POST", "/api/blob", blob, blob.type); docs.refs.data.items[i].img = "asset:" + r.id; save("refs"); render(); } catch (err) { X.toast("Upload failed."); } }); return; }
    if (c("[data-tier]")) { const b = c("[data-tier]"), it = docs.refs.data.items[+b.dataset.i]; const tier = b.dataset.tier; if (tier === "fav") docs.refs.data.items.forEach((x, k) => { if (k !== +b.dataset.i && x.tier === "fav") x.tier = "top"; }); it.tier = it.tier === tier ? (tier === "fav" ? "top" : "") : tier; save("refs"); return render(); }
    if (c("[data-upload]")) { X.pickFile(async file => { if (!file) return; X.toast("Uploading…"); try { const r = await X.req("POST", "/api/blob", file, file.type || "application/octet-stream"); docs.brand.data.assets.push({ id: "asset:" + r.id, name: file.name, type: file.type }); save("brand"); render(); X.toast("File added."); } catch (err) { X.toast(err.code === "too_large" ? "Too large (max 1.9 MB)." : err.code === "bad_type" ? "That file type isn’t allowed. Images, SVG, PDF, fonts and zip work." : "Upload failed."); } }); return; }
    if (c("[data-bimg]")) { const path = c("[data-bimg]").dataset.bimg; X.pickFile(async file => { if (!file) return; try { const blob = await X.shrink(file); const r = await X.req("POST", "/api/blob", blob, blob.type); setPath(docs.brand.data, path, "asset:" + r.id); save("brand"); render(); } catch (err) { X.toast("Upload failed."); } }); return; }
    if (c("[data-pimg]")) { const i = +c("[data-pimg]").dataset.pimg; X.pickFile(async file => { if (!file) return; try { const blob = await X.shrink(file); const r = await X.req("POST", "/api/blob", blob, blob.type); X.change(() => { V.cases[i].img = "asset:" + r.id; }); render(); } catch (err) { X.toast("Upload failed."); } }); return; }
    if (c("[data-pmv]")) { const i = +c("[data-pmv]").dataset.pmv, d = +c("[data-pmv]").dataset.d; X.change(() => { const a = V.cases; [a[i], a[i + d]] = [a[i + d], a[i]]; }); return render(); }
    if (c("[data-prjopen]")) { X.state.view = "site"; X.keep(); X.go("/work/" + V.cases[+c("[data-prjopen]").dataset.prjopen].slug); return render(); }
    if (c("[data-pdel]")) { const b = c("[data-pdel]"); if (!b.dataset.sure) { b.dataset.sure = 1; b.textContent = "Click again to delete"; return; } const i = +b.dataset.pdel, gone = V.cases[i]; X.change(() => V.cases.splice(i, 1)); render(); X.toast(`${gone.client} deleted.`, ["Undo", () => { X.change(() => V.cases.splice(i, 0, gone)); render(); }]); return; }
    if (c("[data-addcase]")) { let cs; X.change(() => { cs = window.HS.newCase(V); V.cases.push(cs); }); render(); const el = [...$("#st-view").querySelectorAll(".st-pname")].pop(); if (el) { el.scrollIntoView({ block: "center" }); el.select(); } return; }
  });


  // ---- search: one field in the top bar, results from every part of the Studio ----
  function searchIndex() {
    const V = X.V(), out = [], push = (group, title, sub, go, hay) => out.push({ group, title, sub, go, hay: (title + " " + (sub || "") + " " + (hay || "")).toLowerCase() });
    GROUPS.forEach(([g, items]) => items.forEach(([id, name]) => push("Go to", name, g, () => setView(id))));
    Object.entries(V.pages || {}).forEach(([k, pg]) => push("Pages", pg.title ? pg.title.split(" · ")[0] : k, pg.path, () => { setView("site"); X.go(pg.path); }, pg.desc));
    (V.cases || []).forEach(c => push("Projects", c.client, "/work/" + c.slug, () => { setView("site"); X.go("/work/" + c.slug); }, (c.tags || []).join(" ") + " " + (c.intro || []).join(" ")));
    const P = window.HSP && window.HSP.data ? window.HSP.data() : { posts: [], camps: [] };
    P.posts.forEach(p => push("Posts", p.title || "Untitled", [p.status ? p.status[0].toUpperCase() + p.status.slice(1) : "", p.date ? new Date(p.date + "T00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : ""].filter(Boolean).join(" · "), () => window.HSP.openPost(p.id), p.brief + " " + Object.values(p.texts || {}).join(" ")));
    P.camps.forEach(c => push("Campaigns", c.name, c.goal, () => window.HSP.openCampaigns(), c.notes));
    const b = docs.brand && docs.brand.data; if (b) { (b.guides || []).forEach((g, gi) => g.rules.forEach(r => push("Guides", r, (g.part === "design" ? "Design · " : "Content · ") + g.topic, () => { setView("brand"); setTimeout(() => { const el = document.querySelector(`[data-row="guides.${gi}"]`); if (el) el.scrollIntoView({ block: "center" }); }, 60); }))); (b.colors || []).forEach(c => push("Guides", c.name, c.hex + " · Colour", () => setView("brand"))); }
    const t = docs.tone && docs.tone.data; if (t) (t.principles || []).forEach(pr => push("Tone of voice", pr.title, pr.text, () => setView("tone")));
    const r = docs.refs && docs.refs.data; if (r) (r.items || []).forEach(x => push("References", x.name, x.url, () => setView("refs"), x.note));
    return out;
  }
  function setView(v) { X.state.view = v; X.state.panel = null; X.keep(); render(); }
  let palSel = 0, palRes = [];
  function openPalette() {
    closePalette(); const idx = searchIndex();
    const wrap = document.createElement("div"); wrap.className = "st-pal-wrap"; wrap.innerHTML = `<div class="st-pal" role="dialog" aria-label="Search"><label class="st-pal-in"><svg viewBox="0 0 20 20"><circle cx="9" cy="9" r="5.5"/><path d="M13 13l4 4"/></svg><input placeholder="Search pages, posts, projects, guides…" aria-label="Search"><kbd>Esc</kbd></label><div class="st-pal-res" role="listbox"></div></div>`;
    document.body.appendChild(wrap); const inp = wrap.querySelector("input"), res = wrap.querySelector(".st-pal-res");
    const draw = () => { const q = inp.value.trim().toLowerCase(), words = q.split(/\s+/).filter(Boolean);
      palRes = (q ? idx.filter(x => words.every(w => x.hay.includes(w))) : idx.filter(x => x.group === "Go to")).slice(0, 40); palSel = Math.min(palSel, Math.max(0, palRes.length - 1));
      let last = ""; res.innerHTML = palRes.map((x, i) => { const h = x.group !== last ? `<div class="st-pal-g">${esc(x.group)}</div>` : ""; last = x.group; return h + `<button class="st-pal-r ${i === palSel ? "on" : ""}" data-pi="${i}" role="option"><span>${esc(x.title)}</span><em>${esc(x.sub || "")}</em></button>`; }).join("") || `<p class="st-pal-none">Nothing found for “${esc(inp.value)}”.</p>`; };
    const pick = i => { const x = palRes[i]; if (!x) return; closePalette(); x.go(); };
    inp.addEventListener("input", () => { palSel = 0; draw(); });
    inp.addEventListener("keydown", e => { if (e.key === "ArrowDown") { palSel = Math.min(palRes.length - 1, palSel + 1); draw(); e.preventDefault(); } else if (e.key === "ArrowUp") { palSel = Math.max(0, palSel - 1); draw(); e.preventDefault(); } else if (e.key === "Enter") { pick(palSel); e.preventDefault(); } else if (e.key === "Escape") closePalette(); });
    res.addEventListener("click", e => { const b = e.target.closest("[data-pi]"); if (b) pick(+b.dataset.pi); });
    wrap.addEventListener("mousedown", e => { if (e.target === wrap) closePalette(); });
    draw(); inp.focus();
  }
  function closePalette() { const w = document.querySelector(".st-pal-wrap"); if (w) w.remove(); }
  document.addEventListener("keydown", e => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); document.querySelector(".st-pal-wrap") ? closePalette() : openPalette(); } });
  document.addEventListener("click", e => { if (e.target.closest("[data-search]")) openPalette(); });
  window.HSV = { render, docs, openPalette };
  load().then(render).catch(() => {});
})();
