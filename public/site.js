// noa site renderer (fork of the Huit builder): turns a version document into page HTML. Used by the Studio (live editing) and at publish time.
// Layout and content follow the "Studio website" Figma research (2026 page).
(function () {
  const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const get = (o, path) => String(path).split(".").reduce((a, k) => a == null ? a : a[k], o);
  const src = id => { id = String(id || ""); if (!id) return ""; if (id.startsWith("asset:")) return "/_blob/" + id.slice(6); if (/^(https?:)?\//.test(id)) return id; return "/img/" + id; };
  const pad = n => String(n + 1).padStart(2, "0");
  const slugify = s => String(s || "").toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "case";
  const ARROW = `<span class="hs-arr" aria-hidden="true">→</span>`;
  // the studio mark: a dark disc with an off-centre light pupil (from the Figma nav)
  const LOGO = `<svg class="hs-logo-svg" viewBox="0 0 164 164" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M82 0C127.287 0 164 36.7127 164 82C164 127.287 127.287 164 82 164C36.7127 164 0 127.287 0 82C0 36.7127 36.7127 0 82 0ZM66.9629 18.8896C46.3673 18.8896 27.6788 35.4189 24.4717 59.2461C21.2646 83.0732 40.3687 94.8798 60.1045 94.8799C83.1038 94.8799 102.811 77.7376 102.811 54.7383C102.811 31.7391 86.5085 18.8898 66.9629 18.8896ZM60.3584 33.0684C70.1918 32.716 77.9094 37.3288 78.126 43.3711C78.2579 47.055 75.1182 50.7375 70.4199 53.1338C75.4545 55.9289 78.7102 60.3941 78.876 65.0195C79.1562 72.8508 69.8862 80.6552 58.252 81.0723C46.6181 81.489 38.2098 74.5997 37.9287 66.7686C37.7426 61.5755 41.4354 56.1812 47.3369 53.0146C44.7607 51.3274 43.2493 48.9659 43.1484 46.1553C42.9319 40.113 50.525 33.421 60.3584 33.0684ZM57.1152 57.3535C51.9438 57.5393 47.9834 61.9701 48.1279 66.0068C48.2727 70.0437 51.8342 72.7292 57.0059 72.5439C62.1773 72.3582 66.6612 68.362 66.5166 64.3252C66.3716 60.2885 62.2867 57.1683 57.1152 57.3535ZM59.4902 39.5811C55.6882 39.7176 52.762 42.5805 52.8545 45.1768C52.9476 47.7732 55.557 49.4897 59.3594 49.3535C63.1617 49.217 66.4707 46.6315 66.3779 44.0352C66.2846 41.4389 63.2925 39.4449 59.4902 39.5811Z"/></svg>`;
  // placeholder illustration used where the Figma shows the "seed" blob
  const BLOB = `<svg class="hs-blob" viewBox="0 0 164 164" aria-hidden="true"><path fill="currentColor" fill-rule="evenodd" d="M82 0C127.287 0 164 36.7127 164 82C164 127.287 127.287 164 82 164C36.7127 164 0 127.287 0 82C0 36.7127 36.7127 0 82 0ZM66.9629 18.8896C46.3673 18.8896 27.6788 35.4189 24.4717 59.2461C21.2646 83.0732 40.3687 94.8798 60.1045 94.8799C83.1038 94.8799 102.811 77.7376 102.811 54.7383C102.811 31.7391 86.5085 18.8898 66.9629 18.8896ZM60.3584 33.0684C70.1918 32.716 77.9094 37.3288 78.126 43.3711C78.2579 47.055 75.1182 50.7375 70.4199 53.1338C75.4545 55.9289 78.7102 60.3941 78.876 65.0195C79.1562 72.8508 69.8862 80.6552 58.252 81.0723C46.6181 81.489 38.2098 74.5997 37.9287 66.7686C37.7426 61.5755 41.4354 56.1812 47.3369 53.0146C44.7607 51.3274 43.2493 48.9659 43.1484 46.1553C42.9319 40.113 50.525 33.421 60.3584 33.0684ZM57.1152 57.3535C51.9438 57.5393 47.9834 61.9701 48.1279 66.0068C48.2727 70.0437 51.8342 72.7292 57.0059 72.5439C62.1773 72.3582 66.6612 68.362 66.5166 64.3252C66.3716 60.2885 62.2867 57.1683 57.1152 57.3535ZM59.4902 39.5811C55.6882 39.7176 52.762 42.5805 52.8545 45.1768C52.9476 47.7732 55.557 49.4897 59.3594 49.3535C63.1617 49.217 66.4707 46.6315 66.3779 44.0352C66.2846 41.4389 63.2925 39.4449 59.4902 39.5811Z"/></svg>`;

  // specimen placeholder: a small worm of circles, different for every specimen, until a real image is added
  const specArt = i => { let s = ""; const n = 46, a = 1 + (i % 3) * .6, ph = i * 1.9;
    for (let j = n - 1; j >= 0; j--) { const u = j / n, x = 20 + u * 160, y = 100 + Math.sin(u * Math.PI * a * 2 + ph) * 46 * Math.sin(u * Math.PI), r = 6 + 12 * Math.sin(u * Math.PI) * (1 - u * .4);
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}"/>`; }
    return `<svg class="nf-art" viewBox="0 0 200 200" aria-hidden="true">${s}</svg>`; };
  function make(V, opts) {
    const E = !!(opts && opts.edit);
    const f = (path, tag, cls, attrs) => { const v = get(V, path); return `<${tag || "span"} class="${cls || ""}" data-f="${esc(path)}"${attrs || ""}>${esc(v)}</${tag || "span"}>`; };
    const fm = (path, cls) => { const arr = get(V, path) || []; return `<div class="hs-rich ${cls || ""}" data-fm="${esc(path)}">${(arr.length ? arr : [""]).map(p => `<p>${esc(p)}</p>`).join("")}</div>`; };
    const link = (path, cls, extra) => { const l = get(V, path) || {}; const ext = /^https?:|^mailto:/.test(l.href || ""); return `<a class="${cls || ""}" href="${esc(l.href || "#")}" data-href="${esc(path)}.href"${ext && !/^mailto:/.test(l.href) ? ' target="_blank" rel="noopener"' : ""}><span data-f="${esc(path)}.label">${esc(l.label)}</span>${extra === undefined ? ARROW : extra}</a>`; };
    const media = (path, cls, ph) => {
      const id = get(V, path);
      const tools = E ? `<span class="st-imgtools"><button type="button" class="st-chip" data-imgset="${esc(path)}">${id ? "Replace" : "Add image"}</button>${id ? `<button type="button" class="st-chip" data-imgdel="${esc(path)}">Remove</button>` : ""}</span>` : "";
      const vid = /\.mp4$/.test(String(id));
      const inner = id ? (vid ? `<video src="${esc(src(id))}" autoplay muted loop playsinline></video>` : `<img src="${esc(src(id))}" alt="${esc(get(V, path + "Alt") || "")}" loading="lazy">`) : `<div class="hs-ph">${ph === false ? "" : BLOB}</div>`;
      return `<div class="hs-media ${cls || ""}" data-img="${esc(path)}">${inner}${tools}</div>`;
    };
    const items = (path, render, kind, cls) => { const arr = get(V, path) || []; return arr.map((it, i) => `<div class="hs-item ${cls || ""}" data-item="${esc(path)}.${i}">${render(`${path}.${i}`, i, it)}${E ? `<button type="button" class="st-x" data-del="${esc(path)}.${i}" title="Remove">×</button>` : ""}</div>`).join("") + (E ? `<button type="button" class="st-add" data-add="${esc(path)}" data-kind="${kind}">+ Add</button>` : ""); };
    const chips = (path, cls) => `<div class="hs-chips ${cls || ""}">${items(path, q => f(q, "span", "hs-chip"), "word", "chip")}</div>`;
    const caseOf = slug => (V.cases || []).find(c => c.slug === slug);

    const S = {
      // text card + mark + feature project card
      // the bench: a strict grid of modules. Visitors drag them around and resize them; the brand stays fixed.
      bench: (p, s) => { const mods = get(V, p + ".items") || [];
        const SZ = { "1": "", "2": "w2", "t": "h2", "b": "w2 h2", "3": "w3 h2" };
        const KINDS = ["text", "work", "service", "sketch", "clock", "contact", "quote", "image"];
        return `<div class="hs-bench" data-bench ${s.tall ? 'data-tall="1"' : ""}>${mods.map((m, i) => { const q = `${p}.items.${i}`, c = m.kind === "work" ? caseOf(m.case) : null;
          const inner = m.kind === "sketch" ? `<canvas data-sketch="${esc(m.variant || (i % 2 ? "dots" : "waves"))}" aria-hidden="true"></canvas>${f(q + ".k", "span", "hs-mk")}`
            : m.kind === "clock" ? `${f(q + ".k", "span", "hs-mk")}<span class="hs-mt" data-clock="${esc(V.site.tz || "Europe/Berlin")}">--:--</span>`
            : m.kind === "contact" ? `${f(q + ".k", "span", "hs-mk")}<span class="hs-mt">Tell us about it →</span>`
            : m.kind === "image" ? `${media(q + ".img", "hs-mimg", false)}${f(q + ".k", "span", "hs-mk")}`
            : m.kind === "work" ? `${c && c.img ? `<div class="hs-mimg"><img src="${esc(src(c.img))}" alt="" loading="lazy"></div>` : ""}${f(q + ".k", "span", "hs-mk")}<span class="hs-mod-b"><span class="hs-mt">${esc(c ? c.client : (m.t || "Pick a project"))}</span><span class="hs-mod-sub hs-tiny">${esc(c ? (c.tags || []).join(" · ") : "")}</span></span>`
            : `${f(q + ".k", "span", "hs-mk")}${f(q + ".t", "span", "hs-mt" + (m.kind === "quote" ? " hs-mq" : ""))}`;
          const tools = E ? `<span class="st-modtools"><button type="button" class="st-chip" data-msize="${esc(q)}">Size: ${esc(m.size || "1")}</button><button type="button" class="st-chip" data-mtone="${esc(q)}">${esc(m.tone || "card")}</button>${m.kind === "work" ? `<button type="button" class="st-chip" data-mcase="${esc(q)}">Project ▸</button>` : ""}${m.kind === "sketch" ? `<button type="button" class="st-chip" data-mvar="${esc(q)}">Sketch ▸</button>` : ""}<button type="button" class="st-chip st-danger" data-del="${esc(q)}">×</button></span>` : "";
          const href = m.kind === "work" && c ? ` data-go="/work/${esc(c.slug)}"` : m.kind === "service" || m.kind === "contact" ? ` data-go="/start"` : m.go ? ` data-go="${esc(m.go)}"` : "";
          return `<div class="hs-mod ${SZ[m.size] || ""} hs-mod-${esc(m.kind)} hs-tone-${esc(m.tone || "card")}" data-mod="${i}"${href} tabindex="0" style="--i:${i}">${inner}${tools}</div>`; }).join("")}
          ${E ? `<div class="hs-mod st-modadd">${KINDS.map(k => `<button type="button" class="st-chip" data-madd="${esc(p)}.items" data-kind="${k}">+ ${k}</button>`).join("")}</div>` : ""}</div>
          <div class="hs-bench-bar"><span class="hs-tiny hs-mut">Drag the modules. Double-click one to resize.</span><button type="button" class="hs-pill hs-pill-s" data-benchreset>Reset</button></div>`; },
      hero: (p, s) => { const c = caseOf(s.feature); return `<div class="hs-hero-grid">
          <div class="hs-card hs-hero-txt">${fm(p + ".body", "hs-lead")}</div>
          <div class="hs-hero-mark">${media(p + ".img", "hs-hero-img", true)}</div>
          ${c || E ? `<a class="hs-card hs-feature-card" href="${c ? "/work/" + esc(c.slug) : "#"}" ${E ? `data-feature="${esc(p)}.feature"` : ""}><span>${f(p + ".featureLabel", "span", "hs-lead-s")}<br><span class="hs-lead-s hs-up">${esc(c ? c.client : "Pick a case")}</span></span>${ARROW}</a>` : ""}
        </div>`; },
      // image card, big statement, small column, subline
      about: (p, s) => `<div class="hs-about ${get(V, p + ".img") || E ? "" : "noimg"}">
          ${get(V, p + ".img") || E ? media(p + ".img", "hs-about-img") : ""}
          ${fm(p + ".title", "hs-h1")}
          <div class="hs-about-side">${fm(p + ".aside", "hs-small")}${(get(V, p + ".facts") || E) ? `<div class="hs-about-facts">${items(p + ".facts", q => `${f(q + ".k", "span", "hs-tiny hs-mut")}${f(q + ".v", "span", "hs-small")}`, "fact")}</div>` : ""}</div>
        </div>${(get(V, p + ".body") || []).length || E ? fm(p + ".body", "hs-small hs-about-sub") : ""}`,
      // three cards, each a title and a list of tags
      cards: (p, s) => `<div class="hs-three">${items(p + ".items", q => `${f(q + ".title", "h2", "hs-h2")}<div class="hs-taglist" data-ftags="${esc(q)}.tags">${esc((get(V, q + ".tags") || []).join(", "))}</div>`, "card", "hs-card hs-card-tall")}</div>`,
      // one large image card with tag chips and a link
      feature: (p, s) => { const c = caseOf(s.href); return `<div class="hs-feature">${media(p + ".img", "hs-feature-img")}
          ${chips(p + ".tags", "hs-feature-tags")}
          <a class="hs-pill hs-feature-go" href="${c ? "/work/" + esc(c.slug) : esc(s.href || "#")}" ${E ? `data-feature="${esc(p)}.href"` : ""}>${f(p + ".cta", "span")}${ARROW}</a></div>`; },
      // tabs, each tab holds price cards
      packages: (p, s) => { const groups = get(V, p + ".groups") || []; return `<div class="hs-tabs" data-tabs>${groups.map((g, i) => `<button type="button" class="hs-tab ${i === 0 ? "on" : ""}" data-tab="${i}"><span data-f="${esc(p)}.groups.${i}.name">${esc(g.name)}</span></button>`).join("")}${E ? `<button type="button" class="st-add st-add-tab" data-add="${esc(p)}.groups" data-kind="group">+ Tab</button>` : ""}</div>
        ${groups.map((g, i) => `<div class="hs-tabpane ${i === 0 ? "on" : ""}" data-pane="${i}">${E && groups.length > 1 ? `<div class="st-paneh"><span class="st-chip st-type">${esc(g.name)}</span><button type="button" class="st-chip st-danger" data-del="${esc(p)}.groups.${i}">Remove tab</button></div>` : ""}<div class="hs-packs">${items(`${p}.groups.${i}.items`, q => `<div class="hs-pack-row"><div class="hs-pack-t">${f(q + ".title", "h3", "hs-h2")}${f(q + ".text", "p", "hs-body")}</div><div class="hs-pack-r"><span class="hs-pack-price hs-tiny">${f(q + ".price", "span")}</span>${link(q + ".link", "hs-pill hs-pill-s", "")}</div></div>`, "pack", "")}</div></div>`).join("")}`; },
      // numbered steps
      process: (p, s) => `<div class="hs-sec-head">${f(p + ".title", "h2", "hs-h2")}${(get(V, p + ".intro") || E) ? f(p + ".intro", "p", "hs-small hs-mut hs-proc-intro") : ""}</div><div class="hs-proc">${items(p + ".items", (q, i) => `<span class="hs-proc-n hs-n">${pad(i)}</span>${f(q + ".title", "h3", "hs-h2")}${f(q + ".text", "p", "hs-body")}${(get(V, q + ".out") || E) ? `<p class="hs-tiny hs-mut hs-proc-out"><span>→ </span>${f(q + ".out", "span")}</p>` : ""}`, "step", "hs-proc-step")}</div>`,
      quote: (p, s) => `<figure class="hs-quote">${f(p + ".text", "blockquote", "hs-q")}<figcaption>${f(p + ".by", "span", "hs-lead-s")}${f(p + ".role", "span", "hs-tiny hs-mut")}</figcaption></figure>`,
      // case grid
      work: (p, s) => {
        const list = (V.cases || []).map((c, i) => ({ c, i })).filter(x => !x.c.hidden || E); const n = s.limit ? Math.min(+s.limit, list.length) : list.length;
        return `${(get(V, p + ".title") || E) ? `<div class="hs-sec-head">${f(p + ".title", "h2", "hs-h2")}${s.more ? link(p + ".more", "hs-pill hs-pill-s") : ""}</div>` : ""}
          <div class="hs-work">${list.slice(0, n).map(({ c, i }) => `
            <a class="hs-card hs-case${c.hidden ? " st-hidden" : ""}" href="/work/${esc(c.slug)}" data-case="${i}">
              ${media(`cases.${i}.img`, "hs-case-img")}
              <div class="hs-case-t"><span class="hs-lead-s" ${E ? `data-f="cases.${i}.client"` : ""}>${esc(c.client)}</span><span class="hs-chips">${(c.tags || []).slice(0, 3).map(t => `<span class="hs-chip">${esc(t)}</span>`).join("")}</span></div>
              ${E ? `<span class="st-casetools"><button type="button" class="st-chip" data-caseopen="${i}">Edit case page</button><button type="button" class="st-chip" data-casehide="${i}">${c.hidden ? "Show" : "Hide"}</button></span>` : ""}
            </a>`).join("")}${E ? `<button type="button" class="st-add st-addcase" data-addcase="1">+ Add case</button>` : ""}</div>`;
      },
      // index: one statement, then the work as a plain two-column grid of images with a caption. The page is the work.
      index: (p, s) => {
        const list = (V.cases || []).map((c, i) => ({ c, i })).filter(x => !x.c.hidden || E);
        return `${fm(p + ".statement", "hs-index-st")}
          <div class="hs-igrid">${list.map(({ c, i }, k) => `
            <a class="hs-icell${c.hidden ? " st-hidden" : ""} ${k % 3 === 1 ? "sq" : ""}" href="/work/${esc(c.slug)}" data-case="${i}">
              ${media(`cases.${i}.img`, "hs-iimg")}
              <span class="hs-icap"><b ${E ? `data-f="cases.${i}.client"` : ""}>${esc(c.client)}</b><span><span ${E ? `data-f="cases.${i}.discipline"` : ""}>${esc(c.discipline || (c.tags || [])[0] || "")}</span>${(c.year || E) ? `, <span ${E ? `data-f="cases.${i}.year"` : ""}>${esc(c.year || "")}</span>` : ""}</span></span>
              ${E ? `<span class="st-casetools"><button type="button" class="st-chip" data-caseopen="${i}">Edit case page</button><button type="button" class="st-chip" data-casehide="${i}">${c.hidden ? "Show" : "Hide"}</button></span>` : ""}
            </a>`).join("")}${E ? `<button type="button" class="st-add st-addcase" data-addcase="1">+ Add case</button>` : ""}</div>`;
      },
      // tools catalogue: one card per tool with price, status and buttons (Stripe payment links go in "buy")
      tools: (p, s) => `${(get(V, p + ".title") || E) ? `<div class="hs-sec-head">${f(p + ".title", "h2", "hs-h2")}${(get(V, p + ".intro") || E) ? f(p + ".intro", "p", "hs-small hs-tools-intro") : ""}</div>` : ""}
        <div class="hs-three hs-tools">${items(p + ".items", (q, i, it) => `${media(q + ".img", "hs-tool-thumb")}<div class="hs-tool-body"><div class="hs-tool-top">${f(q + ".name", "h3", "hs-h2")}<span class="hs-chip hs-status-${esc(it.status || "soon")}" data-f="${esc(q)}.status">${esc(it.status || "soon")}</span></div>${f(q + ".text", "p", "hs-body")}<div class="hs-tool-price"><span class="hs-mt" data-f="${esc(q)}.price">${esc(it.price)}</span><span class="hs-tiny hs-mut" data-f="${esc(q)}.period">${esc(it.period)}</span></div><div class="hs-card-foot">${it.status === "live" ? ((get(V, q + ".buy.href") || E) ? link(q + ".buy", "hs-pill hs-pill-dark hs-pill-s", "") : "") + ((get(V, q + ".try.href") || E) ? link(q + ".try", "hs-pill hs-pill-s", "") : "") + (!get(V, q + ".buy.href") && !get(V, q + ".try.href") ? link(q + ".wait", "hs-pill hs-pill-s", "") : "") : link(q + ".wait", "hs-pill hs-pill-s", "")}</div><a class="hs-tool-custom hs-tiny" href="/start#tool-${esc(slugify(it.name))}"><span data-f="${esc(q)}.custom">${esc(it.custom || "Need a version built for your company?")}</span> ${ARROW}</a></div>`, "tool", "hs-card hs-tool")}</div>`,
      // tools: a product card with demo image and pills
      tool: (p, s) => `<div class="hs-sec-head">${f(p + ".title", "h2", "hs-h2")}</div>${media(p + ".img", "hs-tool-img")}<div class="hs-pills">${items(p + ".pills", q => link(q, "hs-pill hs-pill-dark", ""), "pill", "chip")}</div>${fm(p + ".body", "hs-body hs-tool-body")}`,
      text: (p, s) => `<div class="hs-card hs-textcard">${(get(V, p + ".title") || E) ? f(p + ".title", "h2", "hs-h2") : ""}${fm(p + ".body", "hs-body hs-cols")}</div>`,
      image: (p, s) => `${media(p + ".img", "hs-img-wide")}${(get(V, p + ".caption") || E) ? f(p + ".caption", "p", "hs-tiny hs-mut hs-cap") : ""}`,
      pair: (p, s) => `<div class="hs-pair">${media(p + ".a", "hs-img-half")}${media(p + ".b", "hs-img-half")}</div>`,
      facts: (p, s) => `<div class="hs-chips hs-credits">${items(p + ".items", q => `<span class="hs-chip hs-chip-lg"><b data-f="${esc(q)}.k">${esc(get(V, q + ".k"))}</b> <span data-f="${esc(q)}.v">${esc(get(V, q + ".v"))}</span></span>`, "fact", "chip")}</div>`,
      team: (p, s) => `${(get(V, p + ".title") || get(V, p + ".intro") || E) ? `<div class="hs-sec-head">${f(p + ".title", "h2", "hs-h2")}${(get(V, p + ".intro") || E) ? f(p + ".intro", "p", "hs-small hs-mut hs-proc-intro") : ""}</div>` : ""}<div class="hs-three hs-people">${items(p + ".items", q => `${media(q + ".img", "hs-portrait")}${f(q + ".name", "h3", "hs-lead-s")}${f(q + ".role", "p", "hs-tiny hs-mut")}${f(q + ".text", "p", "hs-body")}`, "person", "hs-card")}</div>`,
      // start a project: pick services and a size, see a timeline and price estimate, then write
      estimate: (p, s) => `<div class="hs-est" data-estimate>
          <div class="hs-est-left">${f(p + ".title", "h1", "hs-h1")}${fm(p + ".body", "hs-small")}
            <div class="hs-est-group"><p class="hs-tiny hs-mut">What do you need?</p><div class="hs-est-opts">${items(p + ".items", (q, i, it) => `<label class="hs-opt"><input type="checkbox" name="svc" value="${i}" data-price="${+it.price || 0}" data-weeks="${+it.weeks || 0}" ${it.on ? "checked" : ""}><span class="hs-opt-t">${f(q + ".name", "span", "hs-mt")}${f(q + ".text", "span", "hs-small hs-mut")}</span><span class="hs-opt-m hs-tiny"><span>from </span><span data-f="${esc(q)}.price">${esc(it.price)}</span><span>€ · ~</span><span data-f="${esc(q)}.weeks">${esc(it.weeks)}</span><span> wk</span></span></label>`, "svc")}</div></div>
            <div class="hs-est-group"><p class="hs-tiny hs-mut">How big is it?</p><div class="hs-tabs hs-est-size">${(get(V, p + ".sizes") || []).map((z, i) => `<label class="hs-tab ${i === 1 ? "on" : ""}"><input type="radio" name="size" value="${i}" data-x="${+z.x || 1}" ${i === 1 ? "checked" : ""}><span data-f="${esc(p)}.sizes.${i}.name">${esc(z.name)}</span></label>`).join("")}</div>${E ? `<p class="hs-tiny hs-mut">Multipliers: ${(get(V, p + ".sizes") || []).map((z, i) => `<span data-f="${esc(p)}.sizes.${i}.x">${esc(z.x)}</span>`).join(" · ")}</p>` : ""}</div>
          </div>
          <form class="hs-card hs-est-card hs-form" data-form novalidate>
            <div class="hs-est-sum" data-est-sum hidden><div><span class="hs-tiny hs-mut">First estimate</span><span class="hs-est-big" data-est-price></span></div><div><span class="hs-tiny hs-mut">Timeline</span><span class="hs-est-big" data-est-weeks></span></div></div>
            <p class="hs-small hs-mut" data-est-note>Choose what you need and we show a first estimate here.</p>
            <label><span class="hs-tiny">Name</span><input name="name" placeholder="Jane Doe" autocomplete="name"></label>
            <label><span class="hs-tiny">Email</span><input name="email" type="email" placeholder="jane@example.com" required autocomplete="email"></label>
            <label class="full"><span class="hs-tiny">A few lines about the project</span><textarea name="message" rows="4" placeholder="What is it, who is it for, when do you need it?" required></textarea></label>
            <input name="website" class="hs-hp" tabindex="-1" autocomplete="off"><input type="hidden" name="estimate" data-est-field>
            <div class="hs-form-foot"><button type="submit" class="hs-pill hs-pill-dark">Send the brief${ARROW}</button><span class="hs-tiny hs-mut">We reply within two working days with a real quote.</span></div>
            <p class="hs-form-msg hs-tiny" aria-live="polite"></p>
          </form></div>`,
      contact: (p, s) => `<div class="hs-contact">
          <div class="hs-card hs-contact-side">${f(p + ".title", "h2", "hs-h2")}${fm(p + ".body", "hs-body")}${(get(V, p + ".cta") || E) ? link(p + ".link", "hs-pill hs-pill-s") : ""}</div>
          <form class="hs-form hs-card" data-form novalidate>
            <label><span class="hs-tiny">Full name</span><input name="name" placeholder="Jane Doe" autocomplete="name"></label>
            <label><span class="hs-tiny">Email address</span><input name="email" type="email" placeholder="jane@example.com" required autocomplete="email"></label>
            <label class="full"><span class="hs-tiny">Package</span><select name="package"><option value="">How can we help you?</option>${(get(V, p + ".options") || []).map(o => `<option>${esc(o)}</option>`).join("")}</select></label>
            <label class="full"><span class="hs-tiny">Message</span><textarea name="message" rows="5" placeholder="Tell us more about your inquiry…" required></textarea></label>
            <input name="website" class="hs-hp" tabindex="-1" autocomplete="off">
            <div class="hs-form-foot"><button type="submit" class="hs-pill hs-pill-dark">Send${ARROW}</button><span class="hs-tiny hs-mut">Your data is protected by our privacy policy.</span></div>
            <p class="hs-form-msg hs-tiny" aria-live="polite"></p>
            ${E ? `<div class="st-paneh"><span class="hs-tiny hs-mut">Package options:</span>${chips(p + ".options")}</div>` : ""}
          </form></div>`,
      // ---- noa: the creature on the home page, with a field guide card that opens when you click his head ----
      creature: (p, s) => { const c = s.card || {}; const row = (k, label) => `<div class="nf-fg-row"><dt>${label}</dt><dd>${f(p + ".card." + k, "span")}</dd></div>`;
        return `<div class="nf-creature" data-creature="${esc(s.kind || "worm")}"><canvas aria-label="${esc(c.name || "A creature")} crawling across the page"></canvas>
          <aside class="nf-fg" ${E ? "" : "hidden"} aria-label="Field guide"><p class="nf-lab">Field guide · ${f(p + ".card.no", "span")}</p>${f(p + ".card.name", "h2", "nf-fg-name")}${f(p + ".card.latin", "p", "nf-fg-latin")}
            <dl>${row("habitat", "Habitat")}${row("behaviour", "Behaviour")}${row("diet", "Diet")}${row("observed", "First observed")}${row("status", "Status")}</dl>${fm(p + ".card.note", "nf-fg-note")}${E ? "" : `<button type="button" class="nf-fg-x" data-fgclose aria-label="Close field guide">×</button>`}</aside>
          <div class="nf-cap">${f(p + ".caption", "span")}<span class="nf-cap-r">${f(p + ".hint", "span")}</span></div></div>`; },
      // ---- noa: specimens, the work as field guide cards ----
      specimens: (p, s) => { const list = (V.cases || []).map((c, i) => ({ c, i })).filter(x => !x.c.hidden || E);
        return `${(get(V, p + ".title") || E) ? `<div class="nf-head">${f(p + ".title", "h2", "nf-h2")}${(get(V, p + ".intro") || E) ? f(p + ".intro", "p", "nf-intro") : ""}</div>` : ""}
          <div class="nf-specs">${list.map(({ c, i }) => `<a class="nf-spec ${c.hidden ? "st-hidden" : ""}" href="/work/${esc(c.slug)}"><div class="nf-spec-img">${c.img ? `<img src="${esc(src(c.img))}" alt="" loading="lazy">` : specArt(i)}</div>
            <div class="nf-spec-meta"><span class="nf-lab">No. ${pad(i)}</span><b>${esc(c.client)}</b><i>${esc(c.latin || "")}</i><span class="nf-mut">${esc(c.habitat || "")}</span></div></a>`).join("")}</div>`; },
      // ---- noa: a labelled block of paragraphs, with an optional tilted framed image ----
      notes: (p, s) => { const side = s.side || "right", img = side === "none" ? "" : `<div class="nf-frame-w"><div class="nf-frame" style="--tilt:${side === "left" ? -3 : 2.5}deg">${media(p + ".img", "nf-frame-m", false)}</div></div>`;
        return `<div class="nf-notes nf-side-${esc(side)}">${side === "left" ? img : ""}<div class="nf-notes-t">${f(p + ".label", "p", "nf-lab nf-acc")}${fm(p + ".body", "nf-body")}</div>${side === "right" ? img : ""}</div>`; },
      // ---- noa: the coloured contact block ----
      hello: (p, s) => `<div class="nf-hello">${f(p + ".label", "p", "nf-lab")}${f(p + ".title", "h2", "nf-hello-t")}<a class="nf-hello-a" href="mailto:${esc(get(V, p + ".email"))}"><span data-f="${esc(p)}.email">${esc(get(V, p + ".email"))}</span></a></div>`,
      legal: (p, s) => `<div class="hs-card hs-textcard">${f(p + ".title", "h1", "hs-h2")}${fm(p + ".body", "hs-body hs-legal")}</div>`
    };

    function section(s, p, idx, total) {
      const fn = S[s.t]; if (!fn) return "";
      const tools = E ? `<div class="st-sectools"><span class="st-chip st-type">${esc(LIB[s.t] ? LIB[s.t].name : s.t)}</span><button type="button" class="st-chip" data-mv="${esc(p)}" data-d="-1" ${idx === 0 ? "disabled" : ""} title="Move up">↑</button><button type="button" class="st-chip" data-mv="${esc(p)}" data-d="1" ${idx === total - 1 ? "disabled" : ""} title="Move down">↓</button>${(LIB[s.t] && LIB[s.t].opts || []).map(o => `<button type="button" class="st-chip" data-opt="${esc(p)}" data-k="${o[0]}">${o[1]}: ${esc(String(s[o[0]] === undefined ? o[2] : s[o[0]]))}</button>`).join("")}<button type="button" class="st-chip" data-dup="${esc(p)}" title="Duplicate">Duplicate</button><button type="button" class="st-chip st-danger" data-rm="${esc(p)}" title="Delete">Delete</button></div>` : "";
      return `<section class="hs-s hs-sec-${s.t}" data-sec="${esc(p)}" id="${esc(s.id || "")}">${tools}<div class="hs-rv">${fn(p, s)}</div></section>`;
    }
    const between = (path, at) => E ? `<div class="st-between"><button type="button" class="st-addsec" data-addsec="${esc(path)}" data-at="${at}">+ Add section</button></div>` : "";
    const list = path => { const arr = get(V, path) || []; return between(path, 0) + arr.map((s, i) => section(s, `${path}.${i}`, i, arr.length) + between(path, i + 1)).join(""); };

    const isOn = (cur, h) => h === "/" ? (cur === "/" || cur.startsWith("/work")) : cur.startsWith(h);
    const navLinks = cur => (V.site.nav || []).map((n, i) => `<a href="${esc(n.href)}" class="${isOn(cur, n.href) ? "on" : ""}"><span ${E ? `data-f="site.nav.${i}.label"` : ""}>${esc(n.label)}</span></a>`).join("");
    const cta = cur => V.site.cta ? `<a class="hs-cta ${cur.startsWith(V.site.cta.href) ? "on" : ""}" href="${esc(V.site.cta.href)}"><span ${E ? 'data-f="site.cta.label"' : ""}>${esc(V.site.cta.label)}</span><span aria-hidden="true">→</span></a>` : "";
    // ---- noa: name, pill nav, city and time; a quiet footer ----
    const noaNav = cur => `<header class="nf-nav"><a class="nf-name" href="/"><span ${E ? 'data-f="site.name"' : ""}>${esc(V.site.name)}</span></a>
      <nav class="nf-pill" aria-label="Main">${(V.site.nav || []).map((n, i) => `<a href="${esc(n.href)}" class="${isOn(cur, n.href) ? "on" : ""}"${isOn(cur, n.href) ? ' aria-current="page"' : ""}><span ${E ? `data-f="site.nav.${i}.label"` : ""}>${esc(n.label)}</span></a>`).join("")}</nav>
      <span class="nf-where"><span ${E ? 'data-f="site.city"' : ""}>${esc(V.site.city)}</span> <span data-clock="${esc(V.site.tz || "Europe/Berlin")}">--:--</span></span></header>`;
    const noaFoot = () => `<footer class="nf-foot"><a href="mailto:${esc(V.site.email)}"><span ${E ? 'data-f="site.email"' : ""}>${esc(V.site.email)}</span></a>
      ${(V.site.social || []).map((l, i) => `<a href="${esc(l.href)}" target="_blank" rel="noopener" data-href="site.social.${i}.href"><span ${E ? `data-f="site.social.${i}.label"` : ""}>${esc(l.label)}</span></a>`).join("")}
      <span class="nf-grow"></span><button class="nf-theme" type="button" data-theme aria-label="Dark mode">dark / light</button><a href="/imprint">Imprint</a><a href="/privacy">Privacy</a></footer>`;
    const fieldGuide = i => { const b = `cases.${i}`, row = (k, l) => `<div class="nf-fg-row"><dt>${l}</dt><dd>${f(b + "." + k, "span")}</dd></div>`;
      return `<aside class="nf-fg nf-fg-static"><p class="nf-lab">Field guide · No. ${pad(i)}</p>${f(b + ".latin", "p", "nf-fg-latin")}<dl>${row("habitat", "Habitat")}${row("behaviour", "Behaviour")}${row("observed", "First observed")}${row("status", "Status")}</dl></aside>`; };
    const nav = cur => V.site.navStyle === "noa" ? noaNav(cur) : V.site.navStyle === "float" ? `<header class="hs-nav hs-nav-right"><a class="hs-logo" href="/" aria-label="${esc(V.site.name)}">${LOGO}</a>
      <nav class="hs-menu hs-menu-right" aria-label="Main">${navLinks(cur)}${cta(cur)}</nav></header>
      <nav class="hs-navf" aria-label="Main">${navLinks(cur)}${cta(cur)}</nav>` : `<header class="hs-nav"><a class="hs-logo" href="/" aria-label="${esc(V.site.name)}">${LOGO}</a>
      <nav class="hs-menu" aria-label="Main">${(V.site.nav || []).map((n, i) => `<a href="${esc(n.href)}" class="${cur === n.href || (n.href !== "/" && cur.startsWith(n.href)) ? "on" : ""}"><span ${E ? `data-f="site.nav.${i}.label"` : ""}>${esc(n.label)}</span></a>`).join("")}</nav>
      <button class="hs-burger" type="button" aria-label="Menu" aria-expanded="false"><i></i><i></i></button></header>`;
    const foot = () => V.site.navStyle === "noa" ? noaFoot() + consent() : `<footer class="hs-foot">
        <button class="hs-fpill hs-theme" type="button" aria-label="Dark mode" data-theme><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/></svg></button>
        <a class="hs-fpill hs-fgrow" href="mailto:${esc(V.site.email)}"><span ${E ? 'data-f="site.email"' : ""}>${esc(V.site.email)}</span></a>
        ${(V.site.social || []).map((l, i) => `<a class="hs-fpill" href="${esc(l.href)}" target="_blank" rel="noopener" data-href="site.social.${i}.href"><span ${E ? `data-f="site.social.${i}.label"` : ""}>${esc(l.label)}</span></a>`).join("")}
        <span class="hs-fpill"><span ${E ? 'data-f="site.city"' : ""}>${esc(V.site.city)}</span></span>
        <span class="hs-fpill" data-clock="${esc(V.site.tz || "Europe/Berlin")}">--:--</span>
        <a class="hs-fpill hs-fsmall" href="/imprint">Imprint</a><a class="hs-fpill hs-fsmall" href="/privacy">Privacy</a><a class="hs-fpill hs-fsmall" href="/terms">Terms</a><a class="hs-fpill hs-fsmall" href="/cookies">Cookies</a>
      </footer>` + consent();
    // cookie banner: text lives in site.consent, the runtime shows it once and remembers the answer in this browser
    const consent = () => { const c = V.site.consent; if (!c || c.on === false) return ""; return `<div class="hs-consent" role="dialog" aria-label="Cookies" hidden><p class="hs-small"><span ${E ? 'data-f="site.consent.text"' : ""}>${esc(c.text)}</span> <a href="${esc(c.more || "/cookies")}">${esc(c.moreLabel || "Cookie policy")}</a></p><div class="hs-consent-b"><button type="button" class="hs-btn hs-btn-s" data-consent="0"><span ${E ? 'data-f="site.consent.decline"' : ""}>${esc(c.decline)}</span></button><button type="button" class="hs-btn hs-btn-s hs-btn-ink" data-consent="1"><span ${E ? 'data-f="site.consent.accept"' : ""}>${esc(c.accept)}</span></button></div></div>`; };

    function caseHead(i) {
      const c = V.cases[i], b = `cases.${i}`;
      return `<section class="hs-s hs-sec-casehead"><div class="hs-rv hs-casehead">
        <div>${f(b + ".client", "h1", "hs-h1-s")}<div class="hs-chips" data-ftags="${b}.tags" ${E ? "" : 'data-static'}>${(c.tags || []).map(t => `<span class="hs-chip">${esc(t)}</span>`).join("")}</div>${E ? `<p class="hs-tiny hs-mut">Tags: <span data-ftags="${b}.tags">${esc((c.tags || []).join(", "))}</span></p>` : ""}</div>
        ${fm(b + ".intro", "hs-small")}${fm(b + ".summary2", "hs-small")}${c.latin !== undefined ? fieldGuide(i) : ""}
      </div></section>`;
    }
    function caseFoot(i) {
      const cs = V.cases.map((c, k) => ({ c, k })).filter(x => !x.c.hidden); if (cs.length < 2) return "";
      const at = cs.findIndex(x => x.k === i), prev = cs[(at - 1 + cs.length) % cs.length].c, next = cs[(at + 1) % cs.length].c;
      return `<section class="hs-s"><div class="hs-rv hs-prevnext"><a class="hs-card hs-pn" href="/work/${esc(prev.slug)}"><span class="hs-arr">←</span><b>Previous</b><span class="hs-mut">${esc(prev.client)}</span></a><a class="hs-card hs-pn hs-pn-r" href="/work/${esc(next.slug)}"><b>Next</b><span class="hs-mut">${esc(next.client)}</span><span class="hs-arr">→</span></a></div></section>`;
    }

    function page(route) {
      route = route || "/";
      const m = route.match(/^\/work\/([^/]+)$/);
      if (m) {
        const i = (V.cases || []).findIndex(c => c.slug === m[1]);
        if (i >= 0) { const c = V.cases[i]; return { kind: "case", idx: i, title: (c.seoTitle || `${c.client} · ${V.site.name}`), desc: c.seoDesc || (c.intro || [])[0] || "", html: nav("/work") + `<main class="hs-main">${caseHead(i)}${list(`cases.${i}.sections`)}${caseFoot(i)}</main>` + foot() }; }
      }
      const key = Object.keys(V.pages).find(k => V.pages[k].path === route);
      if (!key) return null;
      const pg = V.pages[key];
      return { kind: "page", key, title: pg.title || V.site.name, desc: pg.desc || "", html: nav(route) + `<main class="hs-main">${list(`pages.${key}.sections`)}</main>` + foot() };
    }
    return { page };
  }

  // ---- section library ----
  const LIB = {
    bench: { name: "Bench", note: "A grid of modules visitors can rearrange", opts: [["tall", "Fill screen", true]], make: () => ({ t: "bench", tall: true, items: [{ kind: "text", k: "Studio Huit, Berlin", t: "A place to imagine, with a structure to build on.", size: "3", tone: "card" }, { kind: "work", k: "Project", case: "", size: "1", tone: "tint" }, { kind: "sketch", k: "Experiment 01", size: "1", tone: "card" }, { kind: "contact", k: "Say hello", size: "2", tone: "ink" }] }) },
    hero: { name: "Hero", note: "Text card, the mark, and a featured project", make: () => ({ t: "hero", body: ["noa makes creatures, systems and instruments in Berlin."], img: "", featureLabel: "Feature project", feature: "" }) },
    about: { name: "About", note: "Image, big statement, small column", make: () => ({ t: "about", img: "", title: ["A statement about the studio."], aside: ["A shorter paragraph next to it."], body: ["A line underneath."] }) },
    cards: { name: "Three cards", note: "Title and tags per card", make: () => ({ t: "cards", items: [{ title: "Strategy", tags: ["Positioning"] }, { title: "Systems", tags: ["Brand identity"] }, { title: "Experiences", tags: ["Websites"] }] }) },
    feature: { name: "Featured image", note: "Large image with tags and a link", make: () => ({ t: "feature", img: "", tags: ["Brand"], cta: "Explore", href: "" }) },
    packages: { name: "Packages", note: "Tabs with price cards", make: () => ({ t: "packages", groups: [{ name: "Audits", items: [{ title: "Brand review", price: "Starting price 800€", text: "Evaluate your strengths and opportunities for growth", cta: "", link: { label: "Get a quote", href: "/start" } }] }] }) },
    process: { name: "Process", note: "Numbered steps", make: () => ({ t: "process", title: "Our process", items: [{ title: "Strategy", text: "Short text." }, { title: "Design", text: "Short text." }, { title: "Production", text: "Short text." }] }) },
    quote: { name: "Quote", note: "A client quote", make: () => ({ t: "quote", text: "“A quote from someone we worked with.”", by: "Name", role: "" }) },
    index: { name: "Index", note: "One sentence, then the work as a grid", make: () => ({ t: "index", statement: ["noa makes creatures, systems and instruments. Berlin."] }) },
    work: { name: "Work", note: "Case study grid", opts: [["limit", "Show", ""]], make: () => ({ t: "work", title: "Selected work", more: { label: "All work", href: "/" } }) },
    tools: { name: "Tools catalogue", note: "Cards with price, status and buy buttons", make: () => ({ t: "tools", title: "Tools", intro: "Small, focused design tools. Pay monthly, cancel any time.", items: [ITEM.tool()] }) },
    tool: { name: "Tool", note: "A product with demo image and pills", make: () => ({ t: "tool", title: "Chart builder", img: "", pills: [{ label: "Monthly subscription ($45)", href: "/start" }, { label: "Yearly subscription ($450)", href: "/start" }, { label: "Customise to fit your brand", href: "/start" }], body: [] }) },
    text: { name: "Text", note: "Title and paragraphs in a card", make: () => ({ t: "text", title: "", body: ["Text."] }) },
    image: { name: "Image", note: "One full-width image card", make: () => ({ t: "image", img: "", caption: "" }) },
    pair: { name: "Two images", note: "Side by side", make: () => ({ t: "pair", a: "", b: "" }) },
    facts: { name: "Credits", note: "Label and value chips", make: () => ({ t: "facts", items: [{ k: "Design", v: "noa" }] }) },
    team: { name: "People", note: "Portrait cards", make: () => ({ t: "team", title: "People", intro: "", items: [{ img: "", name: "Name", role: "Role", text: "" }] }) },
    estimate: { name: "Start a project", note: "Services, size, estimate and brief", make: () => ({ t: "estimate", title: "Start a project.", body: ["Pick what you need and a size, and you get a first estimate on the spot."], items: [ITEM.svc()], sizes: [{ name: "Small", x: 1 }, { name: "Medium", x: 1.6 }, { name: "Large", x: 2.5 }] }) },
    contact: { name: "Contact", note: "Form with a side card", make: () => ({ t: "contact", title: "Not sure what you need?", body: ["Write a few lines and we'll come back with a suggestion."], cta: "Book a call", link: { label: "Book a call", href: "mailto:hi@huit.studio" }, options: ["Brand review", "Product audit", "Workshop", "Creative production", "Something else"] }) },
    creature: { name: "Creature", note: "The worm, full screen, with a field guide card", make: () => ({ t: "creature", kind: "worm", caption: "this is [his name]. he is going for a walk.", hint: "click to feed him · click his head to read about him", card: { no: "001", name: "The worm", latin: "Annelida filipovica", habitat: "Grain paper, Berlin", behaviour: "Wanders in loops. Follows attention.", diet: "Whatever you drop", observed: "2026", status: "Domesticated", note: ["[A few lines in your voice about where he came from.]"] } }) },
    specimens: { name: "Specimens", note: "The work as field guide cards", make: () => ({ t: "specimens", title: "Specimens", intro: "Creatures, systems and instruments, found so far." }) },
    notes: { name: "Notes", note: "Label, paragraphs and a tilted image", opts: [["side", "Image", "right"]], make: () => ({ t: "notes", side: "right", label: "Label", body: ["A paragraph."], img: "" }) },
    hello: { name: "Hello", note: "Coloured contact block", make: () => ({ t: "hello", label: "Contact", title: "Write to me.", email: "lea@huit.studio" }) },
    legal: { name: "Legal text", note: "Imprint, privacy", make: () => ({ t: "legal", title: "Title", body: ["Text."] }) }
  };
  const ITEM = {
    mod: k => ({ text: { kind: "text", k: "Label", t: "Text", size: "1", tone: "card" }, work: { kind: "work", k: "Project", case: "", size: "1", tone: "tint" }, service: { kind: "service", k: "Services", t: "Strategy", size: "1", tone: "card" }, sketch: { kind: "sketch", k: "Experiment", variant: "waves", size: "1", tone: "card" }, clock: { kind: "clock", k: "Berlin", size: "1", tone: "card" }, contact: { kind: "contact", k: "Say hello", size: "2", tone: "ink" }, quote: { kind: "quote", k: "Said about us", t: "“A quote.”", size: "2", tone: "card" }, image: { kind: "image", k: "", img: "", size: "1", tone: "tint" } }[k] || { kind: "text", k: "", t: "", size: "1", tone: "card" }),
    word: () => "Tag", card: () => ({ title: "Title", tags: ["Tag"] }), group: () => ({ name: "New tab", items: [] }),
    pack: () => ({ title: "Package", price: "Starting price", text: "What it is for.", cta: "", link: { label: "Get a quote", href: "/start" } }),
    step: () => ({ title: "Step", text: "Short text.", out: "" }),
    svc: () => ({ name: "Service", text: "What it includes.", price: 2000, weeks: 2, on: false }),
    tool: () => ({ name: "New tool", text: "What it does, in one line.", price: "€9", period: "per month", status: "soon", img: "", custom: "Need a version built for your company?", buy: { label: "Subscribe", href: "" }, try: { label: "Try it", href: "" }, wait: { label: "Join the waitlist", href: "mailto:hi@huit.studio?subject=Waitlist" } }), fact: () => ({ k: "Role", v: "Name" }), person: () => ({ img: "", name: "Name", role: "Role", text: "" }), pill: () => ({ label: "Option", href: "/start" })
  };
  const newCase = V => { let n = 1, slug; do { slug = "new-case" + (n > 1 ? "-" + n : ""); n++; } while ((V.cases || []).some(c => c.slug === slug)); return { slug, client: "New project", tags: ["Brand"], intro: ["One or two sentences on the project."], summary2: ["What we made and for whom."], img: "", hidden: true, sections: [LIB.image.make(), LIB.pair.make(), LIB.facts.make()] }; };

  // ---- first content: noa, experimental and speculative design ----
  const SPEC = (slug, client, latin, habitat, behaviour, tags, intro) => ({ slug, client, latin, habitat, behaviour, observed: "2026", status: "[status]", tags, intro, summary2: ["[How it works, what it is made of, what it does when you are not looking.]"], img: "", hidden: false,
    sections: [{ t: "image", img: "", caption: "" }, { t: "pair", a: "", b: "" }, { t: "facts", items: [{ k: "Medium", v: "[code, 3D, motion]" }, { k: "Year", v: "2026" }] }] });
  const SEED = {
    name: "V1",
    site: { name: "noa", navStyle: "noa", email: "lea@huit.studio", city: "Berlin", tz: "Europe/Berlin", nav: [{ label: "work", href: "/" }, { label: "about", href: "/about" }, { label: "tools", href: "/tools" }],
      consent: { on: true, text: "This site sets no tracking cookies. It counts page views without identifying you.", accept: "Fine", decline: "No counting", more: "/cookies", moreLabel: "Cookies" },
      social: [{ label: "Instagram", href: "https://www.instagram.com/" }, { label: "X", href: "https://x.com/" }] },
    pages: {
      home: { path: "/", title: "noa · experimental and speculative design, Berlin", desc: "Creatures, systems and instruments by noa, an experimental digital artist in Berlin.", sections: [
        LIB.creature.make(), LIB.specimens.make() ] },
      about: { path: "/about", title: "About · noa", desc: "noa is an experimental digital artist in Berlin: creatures, systems and small instruments.", sections: [
        {"t": "notes", "side": "left", "label": "Hello", "img": "", "body": ["I’m noa, an experimental digital artist in Berlin.", "I make creatures, systems and small instruments, and let them loose on the web. Some follow you around, some blink, some just want to be fed."]},
        {"t": "notes", "side": "right", "label": "What I keep coming back to", "img": "", "body": ["Eyes. Skeletons. Blue skies with clouds. Geometry, repeated until it starts to feel alive.", "Most of what lives here is some mix of those."]},
        {"t": "notes", "side": "none", "label": "Speculative", "body": ["I like designing for worlds that don’t exist yet. Everything here is treated as a real specimen, with a field guide entry, a habitat and a behaviour, as if someone had found it and written it down."]},
        {"t": "notes", "side": "none", "label": "Experimental", "body": ["Nothing here is finished. Things get fed, renamed and broken. The site is the sketchbook and the exhibition at the same time."]},
        {"t": "notes", "side": "none", "label": "Also", "body": ["By day I’m a product and brand designer and run Studio Huit. This is the other half."]},
        {"t": "hello", "label": "Contact", "title": "Say hi.", "email": "lea@huit.studio"} ] },
      tools: { path: "/tools", title: "Tools · noa", desc: "Instruments noa built for herself. Some are free to play with.", sections: [
        { t: "tools", title: "Instruments", intro: "Small tools I built for myself. Some are free to play with.", items: [
          { name: "Instrument no. 1", text: "A pendulum drawing machine. Every visit draws something new.", price: "", period: "free", status: "live", img: "", custom: "", buy: { label: "", href: "" }, try: { label: "Play", href: "" }, wait: { label: "", href: "" } },
          { name: "Field", text: "Particles in a noise field. Your cursor makes a vortex.", price: "", period: "free", status: "live", img: "", custom: "", buy: { label: "", href: "" }, try: { label: "Play", href: "" }, wait: { label: "", href: "" } },
          { name: "[Next instrument]", text: "[What it does, in one line.]", price: "", period: "", status: "soon", img: "", custom: "", buy: { label: "", href: "" }, try: { label: "", href: "" }, wait: { label: "Tell me when", href: "mailto:lea@huit.studio?subject=Tell%20me%20when" } } ] } ] },
      imprint: { path: "/imprint", title: "Imprint · noa", desc: "Imprint", sections: [{ t: "legal", title: "Imprint", body: ["[Full legal name]", "[Street and number]", "[Postcode] Berlin, Germany", "Email: lea@huit.studio"] }] },
      privacy: { path: "/privacy", title: "Privacy · noa", desc: "How this website handles personal data.", sections: [{ t: "legal", title: "Privacy", body: [
        "Responsible for this website: [full legal name], [address], lea@huit.studio.",
        "Hosting: the site runs on Cloudflare. Cloudflare processes technical data such as IP addresses to deliver the pages and protect them from abuse.",
        "Page views: the site counts views per page and day, plus the referring website, the country and the device type. It sets no cookies and stores nothing that identifies you. You can switch counting off in the banner.",
        "Email: if you write to me, I use your message only to reply.",
        "Your rights: you can ask for access, correction or deletion of your data at any time, and complain to a data protection authority." ] }] },
      cookies: { path: "/cookies", title: "Cookies · noa", desc: "Which cookies and browser storage this website uses.", sections: [{ t: "legal", title: "Cookies", body: [
        "This website sets no cookies.",
        "It stores two small values in your browser: your light or dark choice, and your answer to the counting banner. Both stay on your device." ] }] },
      notfound: { path: "/404", title: "Not found · noa", desc: "", sections: [{ t: "text", title: "Nothing lives here yet.", body: ["Go back to the start page, he is probably still walking around."] }] }
    },
    cases: [
      SPEC("the-worm", "The worm", "Annelida filipovica", "Grain paper, Berlin", "Wanders in loops. Follows attention. Eats whatever you drop.", ["creature", "interactive"], ["[One or two sentences on the worm.]"]),
      SPEC("sky-watchers", "Sky watchers", "Oculus caeli", "Clear blue skies, above cloud level", "Watch in groups. Blink in waves when disturbed.", ["creature", "eyes", "sky"], ["[One or two sentences.]"]),
      SPEC("sky-spine", "Sky spine", "Vertebra volans", "Between cumulus clouds", "Swims after movement. Dashes when startled.", ["creature", "bones", "sky"], ["[One or two sentences.]"]),
      SPEC("eye-mandala", "Eye mandala", "Oculus multiplex", "Wherever something is repeated enough times", "Turns slowly. Holds a small sky in its centre.", ["system", "eyes", "repetition"], ["[One or two sentences.]"]),
      SPEC("field", "Field", "Fluxus campi", "Any dark surface", "Flows. Forms a vortex around attention.", ["system", "particles"], ["[One or two sentences.]"]),
      SPEC("instrument-no-1", "Instrument no. 1", "Pendulum scribens", "The tools page", "Draws, forgets, draws again.", ["instrument", "drawing"], ["[One or two sentences.]"])
    ]
  };
  const routes = V => Object.values(V.pages).map(p => p.path).concat((V.cases || []).filter(c => !c.hidden).map(c => "/work/" + c.slug));
  // ---- bench runtime: drag to reorder (FLIP), double-click to resize, live sketches. Used by the Studio and the public page. ----
  function bench(grid, opts) {
    opts = opts || {}; const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let drag = null, lift = null, off = [0, 0], moved = false;
    const mods = () => [...grid.querySelectorAll(".hs-mod:not(.st-modadd)")];
    const order0 = mods().map(m => m.dataset.mod);
    const sizes = ["", "w2", "h2", "w2 h2"];
    grid.addEventListener("pointerdown", e => {
      const el = e.target.closest(".hs-mod"); if (!el || el.classList.contains("st-modadd") || e.button !== 0) return;
      if (e.target.closest("button, a, [contenteditable]:focus")) return;
      const r = el.getBoundingClientRect(); drag = { el, r }; off = [e.clientX - r.left, e.clientY - r.top]; moved = false;
    });
    const move = e => {
      if (!drag) return;
      if (!moved) { if (Math.hypot(e.clientX - (drag.r.left + off[0]), e.clientY - (drag.r.top + off[1])) < 7) return; moved = true; grid.classList.add("dragging");
        lift = drag.el.cloneNode(true); lift.classList.add("hs-lift"); lift.style.width = drag.r.width + "px"; lift.style.height = drag.r.height + "px"; document.body.appendChild(lift); drag.el.classList.add("hs-ghost"); }
      e.preventDefault(); lift.style.left = (e.clientX - off[0]) + "px"; lift.style.top = (e.clientY - off[1]) + "px";
      const over = document.elementsFromPoint(e.clientX, e.clientY).find(x => x.classList && x.classList.contains("hs-mod") && !x.classList.contains("hs-lift") && !x.classList.contains("st-modadd") && x !== drag.el && grid.contains(x));
      if (over) { const list = mods(), before = list.map(c => [c, c.getBoundingClientRect()]); const after = list.indexOf(over) > list.indexOf(drag.el); over[after ? "after" : "before"](drag.el);
        if (!reduce) before.forEach(([c, r0]) => { if (c === drag.el) return; const r1 = c.getBoundingClientRect(), dx = r0.left - r1.left, dy = r0.top - r1.top; if (dx || dy) { c.style.transition = "none"; c.style.transform = `translate(${dx}px,${dy}px)`; requestAnimationFrame(() => { c.style.transition = ""; c.style.transform = ""; }); } }); }
    };
    const end = () => { if (!drag) return; const was = moved; drag.el.classList.remove("hs-ghost"); if (lift) lift.remove(); lift = null; grid.classList.remove("dragging"); const el = drag.el; drag = null; if (was) { grid.dataset.played = "1"; setTimeout(() => moved = false, 60); if (opts.onOrder) opts.onOrder(mods().map(m => +m.dataset.mod)); } };
    addEventListener("pointermove", move, { passive: false }); addEventListener("pointerup", end); addEventListener("pointercancel", end);
    let clickT = null;
    grid.addEventListener("click", e => { const el = e.target.closest(".hs-mod"); if (!el || moved) return; if (e.target.closest("button, a, [contenteditable]")) return; const go = el.dataset.go; if (!go) return; clearTimeout(clickT); clickT = setTimeout(() => { if (opts.onGo) opts.onGo(go); else location.href = go; }, 280); });
    grid.addEventListener("dblclick", e => { const el = e.target.closest(".hs-mod"); if (!el || el.classList.contains("st-modadd") || e.target.closest("[contenteditable]")) return; e.preventDefault(); clearTimeout(clickT); const i = sizes.findIndex(sz => el.className.includes("w2") === sz.includes("w2") && el.className.includes("h2") === sz.includes("h2")); el.classList.remove("w2", "h2", "w3"); const n = sizes[(i + 1) % sizes.length]; n.split(" ").forEach(k => k && el.classList.add(k)); grid.dataset.played = "1"; if (opts.onSize) opts.onSize(+el.dataset.mod, ["1", "2", "t", "b"][(i + 1) % 4]); });
    grid.addEventListener("keydown", e => { const el = e.target.closest(".hs-mod"); if (!el) return; if (e.key === "Enter" && el.dataset.go) { if (opts.onGo) opts.onGo(el.dataset.go); else location.href = el.dataset.go; } });
    const reset = grid.parentElement.querySelector("[data-benchreset]");
    if (reset) reset.addEventListener("click", () => { if (opts.onReset) return opts.onReset(); const list = mods(); order0.forEach(id => { const m = list.find(x => x.dataset.mod === id); if (m) grid.appendChild(m); }); const add = grid.querySelector(".st-modadd"); if (add) grid.appendChild(add); delete grid.dataset.played; });
    // sketches
    const sk = [...grid.querySelectorAll("canvas[data-sketch]")].map((c, i) => ({ c, v: c.dataset.sketch, ph: i * 1.7 }));
    let raf; const accent = () => getComputedStyle(grid).getPropertyValue("--accent").trim() || "#1E3A40";
    function draw(ts) { const t = ts / 1000; sk.forEach(s => { const c = s.c, W = c.clientWidth | 0, H = c.clientHeight | 0; if (!W) return; if (c.width !== W || c.height !== H) { c.width = W; c.height = H; } const g = c.getContext("2d"); g.clearRect(0, 0, W, H); g.strokeStyle = g.fillStyle = accent(); g.lineWidth = 1; g.globalAlpha = .85; const tt = reduce ? 0 : t;
      if (s.v === "dots") { const n = 9, cx = W / (n + 1), cy = H / (n + 1); for (let i = 1; i <= n; i++) for (let j = 1; j <= n; j++) { const r = 1.2 + 2.6 * (.5 + .5 * Math.sin(tt * .9 + i * .6 + j * .4 + s.ph)); g.beginPath(); g.arc(i * cx, j * cy, r, 0, 7); g.fill(); } }
      else if (s.v === "grid") { const n = 8; for (let i = 0; i <= n; i++) { const o = Math.sin(tt * .5 + i + s.ph) * 6; g.beginPath(); g.moveTo(0, i * H / n + o); g.lineTo(W, i * H / n - o); g.stroke(); g.beginPath(); g.moveTo(i * W / n - o, 0); g.lineTo(i * W / n + o, H); g.stroke(); } }
      else { for (let k = 0; k < 12; k++) { g.beginPath(); for (let x = 0; x <= W; x += 6) { const y = H / 2 + Math.sin(x / 38 + tt * .6 + k * .5 + s.ph) * (H / 3) * Math.sin(k / 12 * Math.PI) + Math.cos(x / 90 - tt * .3) * 6; x === 0 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); } } });
      if (sk.length && !reduce) raf = requestAnimationFrame(draw); }
    if (sk.length) { raf = requestAnimationFrame(draw); if (reduce) setTimeout(() => draw(0), 50); }
    return { stop: () => cancelAnimationFrame(raf) };
  }
  // estimate: sums the checked services, applies the size multiplier
  function estimate(root) {
    const out = root.querySelector("[data-est-price]"), wk = root.querySelector("[data-est-weeks]"), note = root.querySelector("[data-est-note]"), hid = root.querySelector("[data-est-field]");
    function calc() {
      const on = [...root.querySelectorAll('input[name="svc"]:checked')], size = root.querySelector('input[name="size"]:checked'), x = size ? +size.dataset.x : 1;
      root.querySelectorAll(".hs-est-size .hs-tab").forEach(l => l.classList.toggle("on", l.querySelector("input").checked));
      const price = on.reduce((a, i) => a + (+i.dataset.price) * x, 0), weeks = Math.ceil(on.reduce((a, i) => a + (+i.dataset.weeks), 0) * (x > 1 ? Math.sqrt(x) : 1));
      const eur = n => "€" + (Math.round(n / 100) * 100).toLocaleString("en-GB"); const sum = root.querySelector("[data-est-sum]"); if (sum) sum.hidden = !on.length;
      out.textContent = on.length ? "from " + eur(price) : ""; wk.textContent = weeks ? "about " + weeks + (weeks === 1 ? " week" : " weeks") : "";
      const names = on.map(i => i.closest(".hs-opt").querySelector(".hs-mt").textContent.trim());
      note.textContent = on.length ? `${names.join(", ")}, ${size ? size.parentElement.textContent.trim().toLowerCase() : ""} scope. A first estimate, not a quote. The real one comes with the reply.` : "Choose what you need and we show a first estimate here.";
      if (hid) hid.value = on.length ? `${names.join(" + ")} · ${size ? size.parentElement.textContent.trim() : ""} · from ${eur(price)} · ${weeks} weeks` : "";
    }
    const m = (location.hash || "").match(/^#tool-([a-z0-9-]+)/);
    if (m) { const name = m[1].replace(/-/g, " "); const box = [...root.querySelectorAll('input[name="svc"]')].find(i => /creative tools/i.test(i.closest(".hs-opt").textContent)); if (box) box.checked = true; const ta = root.querySelector('textarea[name="message"]'); if (ta && !ta.value) ta.value = `A custom version of the ${name} tool for our company. `; }
    root.addEventListener("change", calc); calc();
  }
  // ---- noa: the worm. Stacked outlined circles on paper, follows attention, eats what you drop, opens his field guide when you click his head. ----
  const creatures = [];
  function creature(root) {
    const cv = root.querySelector("canvas"), card = root.querySelector(".nf-fg"), cap = root.querySelector(".nf-cap > span");
    if (!cv || cv.dataset.on) return; cv.dataset.on = "1";
    const ctx = cv.getContext("2d"), reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    let W = 0, H = 0, k = 1, N = 220, head = null, trail = [], snacks = [], eaten = 0, gulp = -9, nextBlink = 2, raf = 0, pts = [];
    const m = { x: 0, y: 0, at: -1e9 }, edit = !!root.closest(".st-editing"), base = cap ? cap.textContent : "";
    const col = n => getComputedStyle(root).getPropertyValue(n).trim();
    function fit() {
      const r = root.getBoundingClientRect(), d = devicePixelRatio || 1; W = r.width; H = r.height; if (!W || !H) return;
      cv.width = W * d; cv.height = H * d; ctx.setTransform(d, 0, 0, d, 0, 0); k = Math.max(.55, Math.min(1.2, Math.min(W / 1440, H / 860)));
      if (!head) { head = { x: W * .3, y: H * .5, a: 0 }; trail = []; for (let i = 0; i < 1500; i++) trail.push({ x: head.x - i * 2, y: head.y + Math.sin(i * .02) * 40 }); }
    }
    const ro = new ResizeObserver(fit); ro.observe(root); fit();
    const radius = (i, n) => { const T = 28 * k, u = i / n; if (i < 10) return T * (.62 + i * .038); if (u < .55) return T; return T * Math.pow(1 - (u - .55) / .45, 1.25) + 2.5 * k; };
    const pos = e => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    cv.addEventListener("pointermove", e => { const q = pos(e); m.x = q.x; m.y = q.y; m.at = performance.now(); });
    cv.addEventListener("click", e => {
      const q = pos(e), h0 = pts[0];
      if (h0 && Math.hypot(q.x - h0.x, q.y - h0.y) < h0.r * 1.4) { if (card && !edit) card.hidden = !card.hidden; return; }
      snacks.push({ x: q.x, y: q.y, b: performance.now() / 1000 });
    });
    if (card) { const x = card.querySelector("[data-fgclose]"); if (x) x.addEventListener("click", () => card.hidden = true); }
    function step(ms) {
      if (!cv.isConnected) { ro.disconnect(); return; }
      const t = ms / 1000; if (!W) { raf = requestAnimationFrame(step); return; }
      const ink = col("--ink") || "#1A1A1A", paper = col("--bg") || "#DCD8D3";
      let tx, ty, chasing = false;
      if (snacks.length) { let best = null, bd = 1e9; for (const s of snacks) { const d = Math.hypot(s.x - head.x, s.y - head.y); if (d < bd) { bd = d; best = s; } } tx = best.x; ty = best.y; chasing = true;
        if (bd < 22 * k) { snacks.splice(snacks.indexOf(best), 1); eaten++; N += 18; gulp = t; if (cap) cap.textContent = base.replace(/he is .*$/, "") + `he has eaten ${eaten} ${eaten === 1 ? "snack" : "snacks"}.`; } }
      else if (ms - m.at < 2500) { tx = m.x; ty = m.y; }
      else { tx = W / 2 + Math.cos(t * .37) * W * .3 + Math.sin(t * .91) * W * .08; ty = H / 2 + Math.sin(t * .53) * H * .3; }
      if (!reduce) {
        const want = Math.atan2(ty - head.y, tx - head.x); let da = want - head.a; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        const dist = Math.hypot(tx - head.x, ty - head.y), sp = (chasing ? 4.2 : 2.8) * k * Math.min(1, dist / (60 * k) + .25);
        head.a += Math.max(-.055, Math.min(.055, da)) + Math.sin(t * 2.2) * .012; head.x += Math.cos(head.a) * sp; head.y += Math.sin(head.a) * sp;
        if (Math.hypot(head.x - trail[0].x, head.y - trail[0].y) > .8) trail.unshift({ x: head.x, y: head.y }); if (trail.length > 9000) trail.length = 9000;
      }
      pts = []; let acc = 0, need = 0, i = 0;
      for (let j = 1; j < trail.length && i < N; j++) { const a = trail[j - 1], b = trail[j], seg = Math.hypot(b.x - a.x, b.y - a.y);
        while (acc + seg >= need && i < N) { const f = (need - acc) / (seg || 1), r = radius(i, N); pts.push({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f, r }); i++; need += r < 9 * k ? r * 2.3 : 3.6 * k; } acc += seg; }
      ctx.clearRect(0, 0, W, H);
      for (const s of snacks) { const w = 1 + Math.sin(t * 6 + s.b) * .15; ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(s.x, s.y, 5 * k * w, 0, 7); ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(s.x, s.y, 11 * k * w, 0, 7); ctx.stroke(); }
      ctx.lineWidth = 2.2 * k; ctx.strokeStyle = ink;
      const gf = Math.max(0, 1 - (t - gulp) * 1.2), bulge = gf > 0 ? (1 - gf) * pts.length : -999;
      for (let q = pts.length - 1; q >= 0; q--) { const p = pts[q], bump = 1 + Math.max(0, 1 - Math.abs(q - bulge) / 8) * .35; ctx.fillStyle = paper; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * bump, 0, 7); ctx.fill(); ctx.stroke(); }
      const hp = pts[0];
      if (hp) { const r = hp.r, cx = hp.x + Math.cos(head.a) * r * .18, cy = hp.y + Math.sin(head.a) * r * .18;
        if (t > nextBlink + .16) nextBlink = t + 2 + Math.random() * 5; const bl = t > nextBlink;
        ctx.fillStyle = ink; ctx.lineWidth = 2 * k;
        for (const s of [-1, 1]) { const ex = cx + s * r * .32, ey = cy - r * .22; if (bl) { ctx.beginPath(); ctx.moveTo(ex - r * .1, ey); ctx.lineTo(ex + r * .1, ey); ctx.stroke(); } else { ctx.beginPath(); ctx.ellipse(ex, ey, r * .09, r * .13, 0, 0, 7); ctx.fill(); } }
        ctx.beginPath(); ctx.arc(cx, cy + r * .05, r * .36, .15 * Math.PI, .85 * Math.PI); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(cx + r * .08 + Math.sin(t * 7) * r * .06, cy + r * .48, r * .13, r * (chasing ? .5 : .3) * .45, .2, 0, 7); ctx.fill(); }
      raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step); creatures.push({ stop: () => cancelAnimationFrame(raf) });
  }
  window.HS = { creature, creatures, make, LIB, ITEM, SEED, newCase, routes, get, esc, slugify, src, bench, estimate };
})();
