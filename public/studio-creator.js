// Creator: one image, a carousel of slides, or a motion piece of scenes. Draws on the canvas, exports PNG and video.
(function () {
  const X = window.HSX, { esc, src } = window.HS, PLAT = window.HS_PLATFORMS;
  const $ = (s, r) => (r || document).querySelector(s);
  const ttabs = (items, cur, attr) => `<div class="st-ttabs" role="tablist">${items.map(([k, n, c]) => `<button role="tab" aria-selected="${cur === k}" class="${cur === k ? "on" : ""}" ${attr}="${k}">${n}${c != null ? `<em>${c}</em>` : ""}</button>`).join("")}</div>`;
  const brandColors = () => { const d = window.HSV && window.HSV.docs.brand; return d ? d.data.colors : [{ name: "Off-white", hex: "#F4F2ED" }, { name: "Ink", hex: "#131313" }]; };

  const FORMATS = { image: "Image", carousel: "Carousel", motion: "Motion" };
  const SIZES = { image: null, carousel: [["4:5", 1080, 1350], ["1:1", 1080, 1080]], motion: [["9:16", 1080, 1920], ["4:5", 1080, 1350], ["16:9", 1920, 1080]] };
  const newSlide = (over) => Object.assign({ text: "", sub: "", label: "Studio Huit", bg: "#131313", fg: "#F4F2ED", img: "", fit: "cover", dim: true, align: "left", pos: "bottom", hsize: "L", showText: true, dur: 4, trans: "fade", pic: "float", textIn: "lines" }, over || {});
  // older posts have p.card only; lift it into slides
  function slidesOf(p) { if (!p.slides || !p.slides.length) { p.slides = [newSlide({ text: p.card.text || "", label: p.card.label || "Studio Huit", bg: p.card.bg, fg: p.card.fg, img: p.img || "" })]; } p.format = p.format || "image"; p.cur = Math.min(p.cur || 0, p.slides.length - 1); p.ptab = p.ptab || "text"; return p.slides; }
  const cur = p => slidesOf(p)[p.cur];
  function sizeOf(p) { const list = SIZES[p.format] || PLAT[p.platform].sizes; return list[Math.min(p.card.size || 0, list.length - 1)]; }
  // keep the queue card and the AI brief in sync with slide 1
  function syncCard(p) { const s = slidesOf(p)[0]; p.card.text = s.text; p.card.bg = s.bg; p.card.fg = s.fg; p.card.label = s.label; p.img = s.img; }
  const seg = (name, key, opts, val) => `<div class="st-cr-row"><span class="st-m">${name}</span><div class="st-ttabs st-ttabs-s">${opts.map(([v, l]) => `<button class="${String(val) === String(v) ? "on" : ""}" data-sk="${key}" data-sv="${esc(String(v))}">${l}</button>`).join("")}</div></div>`;
  function creator(p) {
    const sl = slidesOf(p), s = cur(p), many = p.format !== "image", list = SIZES[p.format] || PLAT[p.platform].sizes, sz = sizeOf(p);
    const total = sl.reduce((a, x) => a + (+x.dur || 4), 0);
    const tabs = [["text", "Text"], ["picture", "Picture"], ["chart", "Chart"], ["colours", "Colours"], ...(p.format === "motion" ? [["motion", "Motion"]] : [])];
    const ch = s.chart || { type: "bar", unit: "", data: "" };
    const panel = p.ptab === "chart" ? `
          ${seg("Chart", "chart.type", [["none", "None"], ["bar", "Bars"], ["line", "Line"]], s.chart && s.chart.data ? ch.type : "none")}
          <div class="st-cr-row"><span class="st-m">Numbers</span><textarea class="st-ghost st-mono" data-sk="chart.data" rows="5" placeholder="label, value, one per line">${esc(ch.data || "")}</textarea></div>
          <div class="st-cr-row"><span class="st-m">Unit</span><input class="st-ghost" data-sk="chart.unit" value="${esc(ch.unit || "")}" placeholder="%, €, k"></div>
          <p class="st-m">Drawn in the slide's colours between the label and the text. Put the text at the bottom and keep it short so the chart has room. Name the source in the line under the heading.</p>`
      : p.ptab === "picture" ? `
          <div class="st-cr-row"><span class="st-m">Picture</span><span><button class="st-btn" data-supload>${s.img ? "Replace" : "Add a picture"}</button>${s.img ? ` <button class="st-link" data-simgdel>Remove</button>` : ""}</span></div>
          ${s.img ? seg("Fit", "fit", [["cover", "Fill"], ["inset", "Inset"]], s.fit) + `<div class="st-cr-row"><span class="st-m">Shade</span><label class="st-check"><input type="checkbox" data-sk="dim" ${s.dim !== false ? "checked" : ""}> Darken behind the text</label></div>` : `<p class="st-m">No picture on this slide, the colour is the ground. Dithered or printed-looking images sit well here.</p>`}`
      : p.ptab === "colours" ? `
          <div class="st-cr-row"><span class="st-m">Ground</span><div class="st-swrow">${brandColors().map(c => `<button class="st-swb ${s.bg === c.hex ? "on" : ""}" data-sbg="${esc(c.hex)}" style="background:${esc(c.hex)}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join("")}</div></div>
          <div class="st-cr-row"><span class="st-m">Text</span><div class="st-swrow">${brandColors().map(c => `<button class="st-swb ${s.fg === c.hex ? "on" : ""}" data-sfg="${esc(c.hex)}" style="background:${esc(c.hex)}" title="${esc(c.name)}" aria-label="${esc(c.name)}"></button>`).join("")}</div></div>
          ${many ? `<button class="st-link" data-sapplyall="colours">Same colours on every slide</button>` : ""}`
      : p.ptab === "motion" ? `
          ${seg("This scene lasts", "dur", [[3, "3 s"], [4, "4 s"], [6, "6 s"], [8, "8 s"]], s.dur || 4)}
          ${seg("Into this scene", "trans", [["cut", "Cut"], ["fade", "Fade"], ["slide", "Slide"]], s.trans || "fade")}
          ${seg("Picture", "pic", [["still", "Still"], ["float", "Float"], ["rise", "Rise"]], s.pic || "float")}
          ${seg("Text comes in", "textIn", [["once", "At once"], ["lines", "Line by line"], ["after", "After the picture"]], s.textIn || "lines")}
          <button class="st-link" data-sapplyall="motion">Same motion on every scene</button>
          <p class="st-m">${sl.length} scene${sl.length > 1 ? "s" : ""}, ${total} s in all. Export gives a WebM file; Instagram and LinkedIn take it, for X convert to MP4.</p>`
      : `
          <div class="st-cr-row"><span class="st-m">Heading</span><textarea class="st-ghost" data-sk="text" rows="2" placeholder="Short. Empty shows only the picture.">${esc(s.text)}</textarea></div>
          <div class="st-cr-row"><span class="st-m">Line under</span><input class="st-ghost" data-sk="sub" value="${esc(s.sub || "")}" placeholder="A source, a date, a second thought"></div>
          <div class="st-cr-row"><span class="st-m">Label</span><input class="st-ghost" data-sk="label" value="${esc(s.label || "")}"></div>
          ${seg("Heading size", "hsize", [["S", "S"], ["M", "M"], ["L", "L"], ["XL", "XL"]], s.hsize || "L")}
          ${seg("Alignment", "align", [["left", "Left"], ["center", "Centre"]], s.align || "left")}
          ${seg("Position", "pos", [["top", "Top"], ["center", "Centre"], ["bottom", "Bottom"]], s.pos || "bottom")}
          <div class="st-cr-row"><span class="st-m">Text</span><label class="st-check"><input type="checkbox" data-sk="showText" ${s.showText !== false ? "checked" : ""}> Show on this slide</label></div>`;
    return `
          <div class="st-cr-top">${ttabs(Object.entries(FORMATS), p.format, "data-sformat")}<span class="st-cr-sizes">${ttabs(list.map((z, i) => [String(i), z[0]]), String(p.card.size || 0), "data-psize")}</span>${p.format === "motion" ? `<button class="st-link" data-splay>▶ Play</button><span class="st-m" data-stime></span>` : ""}</div>
          <div class="st-pcard-wrap ${sz[2] > sz[1] * 1.3 ? "tall" : ""}"><canvas id="pcanvas" class="st-pcanvas"></canvas></div>
          ${many ? `<div class="st-strip" role="list">${sl.map((x, i) => `<div class="st-thumb ${i === p.cur ? "on" : ""}" role="listitem"><button class="st-thumb-b" data-scur="${i}" aria-label="Slide ${i + 1}"><canvas class="st-thumb-c" data-thumb="${i}"></canvas></button><span class="st-m">${i + 1}${p.format === "motion" ? ` · ${x.dur || 4} s` : ""}</span>${sl.length > 1 ? `<span class="st-thumb-x"><button class="st-mini" data-smove="-1" title="Move left">‹</button><button class="st-mini" data-sdel title="Remove">×</button><button class="st-mini" data-smove="1" title="Move right">›</button></span>` : ""}</div>`).join("")}<button class="st-thumb st-thumb-add" data-sadd><span class="st-thumb-c">+</span><span class="st-m">Add</span></button></div>` : ""}
          <div class="st-tabs">${tabs.map(([k, n]) => `<button class="${p.ptab === k ? "on" : ""}" data-sptab="${k}">${n}</button>`).join("")}</div>
          <div class="st-panel-b">${panel}</div>
          <div class="st-prow">${p.format === "motion" ? `<button class="st-btn st-primary" data-sexport>Export video</button><button class="st-btn" data-pdown>This frame as PNG</button>` : many ? `<button class="st-btn st-primary" data-sdownall>Download all slides</button><button class="st-btn" data-pdown>This slide as PNG</button>` : `<button class="st-btn st-primary" data-pdown>Download PNG</button>`}</div>`;
  }
  const withSrc = s => Object.assign({}, s, { imgSrc: s.img ? src(s.img) : "" });
  function drawAll(p) {
    const c = $("#pcanvas"); if (!c) return; if (api.playing) { api.playing.stop(); api.playing = null; }
    const sz = sizeOf(p), W = sz[1], H = sz[2]; c.width = W; c.height = H; const g = c.getContext("2d");
    const paint = () => { window.HSC.draw(g, withSrc(cur(p)), W, H, 1, false, paint); drawThumbs(p); };
    document.fonts && document.fonts.ready.then(paint); paint();
  }
  function drawThumbs(p) {
    const sz = sizeOf(p); document.querySelectorAll("[data-thumb]").forEach(t => { const s = slidesOf(p)[+t.dataset.thumb]; if (!s) return; const w = 96, h = Math.round(96 * sz[2] / sz[1]); t.width = w * 2; t.height = h * 2; t.style.width = w + "px"; t.style.height = h + "px"; window.HSC.draw(t.getContext("2d"), withSrc(s), w * 2, h * 2, 1, false, () => drawThumbs(p)); });
  }
  function downloadBlob(b, name) { const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }
  const fname = (p, ext, i) => `huit-${p.format}-${(p.title || "post").toLowerCase().replace(/[^a-z0-9]+/g, "-")}${i != null ? "-" + (i + 1) : ""}.${ext}`;
  const api = { creator, drawAll, drawThumbs, slidesOf, cur, sizeOf, syncCard, newSlide, withSrc, downloadBlob, fname, FORMATS, SIZES, playing: null };
  window.HSC2 = api;
})();
