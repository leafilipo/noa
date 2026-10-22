// Slide renderer for posts: draws one slide on a canvas, plays a sequence of scenes, records it as video.
(function () {
  const LOGO = new Path2D("M82 0C127.287 0 164 36.7127 164 82C164 127.287 127.287 164 82 164C36.7127 164 0 127.287 0 82C0 36.7127 36.7127 0 82 0ZM66.9629 18.8896C46.3673 18.8896 27.6788 35.4189 24.4717 59.2461C21.2646 83.0732 40.3687 94.8798 60.1045 94.8799C83.1038 94.8799 102.811 77.7376 102.811 54.7383C102.811 31.7391 86.5085 18.8898 66.9629 18.8896ZM60.3584 33.0684C70.1918 32.716 77.9094 37.3288 78.126 43.3711C78.2579 47.055 75.1182 50.7375 70.4199 53.1338C75.4545 55.9289 78.7102 60.3941 78.876 65.0195C79.1562 72.8508 69.8862 80.6552 58.252 81.0723C46.6181 81.489 38.2098 74.5997 37.9287 66.7686C37.7426 61.5755 41.4354 56.1812 47.3369 53.0146C44.7607 51.3274 43.2493 48.9659 43.1484 46.1553C42.9319 40.113 50.525 33.421 60.3584 33.0684ZM57.1152 57.3535C51.9438 57.5393 47.9834 61.9701 48.1279 66.0068C48.2727 70.0437 51.8342 72.7292 57.0059 72.5439C62.1773 72.3582 66.6612 68.362 66.5166 64.3252C66.3716 60.2885 62.2867 57.1683 57.1152 57.3535ZM59.4902 39.5811C55.6882 39.7176 52.762 42.5805 52.8545 45.1768C52.9476 47.7732 55.557 49.4897 59.3594 49.3535C63.1617 49.217 66.4707 46.6315 66.3779 44.0352C66.2846 41.4389 63.2925 39.4449 59.4902 39.5811Z");
  const HS = { S: .055, M: .068, L: .085, XL: .11 };
  const imgs = {};
  const ease = t => t < 0 ? 0 : t > 1 ? 1 : 1 - Math.pow(1 - t, 3);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function image(srcUrl, onload) { if (!srcUrl) return null; let im = imgs[srcUrl]; if (!im) { im = imgs[srcUrl] = new Image(); im.crossOrigin = "anonymous"; im.src = srcUrl; } if (!im.complete && onload) im.addEventListener("load", onload, { once: true }); return im.complete && im.naturalWidth ? im : null; }
  function wrap(g, text, maxW) { const lines = []; text.split("\n").forEach(par => { const words = par.split(/\s+/).filter(Boolean); let cur = ""; words.forEach(w => { const t = cur ? cur + " " + w : w; if (g.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }); lines.push(cur); }); return lines.slice(0, 8); }
  // s: slide, t: 0..1 progress through the scene (1 = settled still), motion: whether to animate
  function draw(g, s, W, H, t, motion, onload) {
    t = t == null ? 1 : t; const pad = W * .07;
    g.save(); g.fillStyle = s.bg; g.fillRect(0, 0, W, H);
    const im = image(s.imgSrc, onload); const fg = s.img && im && s.fit !== "inset" ? "#FFFFFF" : s.fg;
    if (im) {
      let dy = 0, sc = 1; if (motion) { if (s.pic === "float") { dy = Math.sin(t * Math.PI) * H * .012; sc = 1 + t * .03; } if (s.pic === "rise") { dy = (1 - ease(t * 2.2)) * H * .05; } }
      if (s.fit === "inset") {
        const bw = W - pad * 2, top = pad + W * .08, bh = (s.pos === "center" ? H * .42 : H * .5); const r = Math.min(bw / im.naturalWidth, bh / im.naturalHeight), w = im.naturalWidth * r, h = im.naturalHeight * r;
        g.save(); g.globalAlpha = motion ? ease(t * 2) : 1; g.drawImage(im, pad + (bw - w) / 2, top + (bh - h) / 2 + dy, w * sc, h * sc); g.restore();
      } else {
        const r = Math.max(W / im.naturalWidth, H / im.naturalHeight) * sc, w = im.naturalWidth * r, h = im.naturalHeight * r; g.drawImage(im, (W - w) / 2, (H - h) / 2 + dy, w, h);
        if (s.dim !== false) { g.fillStyle = "rgba(0,0,0,.3)"; g.fillRect(0, 0, W, H); }
      }
    }
    g.fillStyle = fg; g.textBaseline = "top"; g.textAlign = "left";
    g.font = `${Math.round(W * .022)}px "Plex Mono", monospace`; g.fillText((s.label || "").toUpperCase(), pad, pad);
    if (s.chart && s.chart.data) chart(g, s, W, H, pad, fg, motion ? t : 1);
    if (s.showText !== false) {
      const fs = Math.round(W * (HS[s.hsize] || HS.L)), lh = fs * 1.05; g.font = `500 ${fs}px "Inter Tight", Helvetica, Arial, sans-serif`;
      const lines = wrap(g, (s.text || "").trim(), W - pad * 2); const subFs = Math.round(W * .028); const subH = s.sub ? subFs * 1.4 + fs * .3 : 0;
      const block = lines.length * lh + subH; const markH = W * .044 + W * .05;
      let y = s.pos === "top" ? pad + W * .07 : s.pos === "center" ? (H - block) / 2 : H - pad - markH - block;
      const x = s.align === "center" ? W / 2 : pad; g.textAlign = s.align === "center" ? "center" : "left";
      lines.forEach((l, i) => {
        let a = 1, off = 0; if (motion) { const d = s.textIn === "lines" ? .12 * i : 0, start = s.textIn === "after" ? .3 : .05; const p = ease((t - start - d) / .35); a = p; off = (1 - p) * fs * .4; }
        g.globalAlpha = a; g.fillText(l, x, y + off); g.globalAlpha = 1; y += lh;
      });
      if (s.sub) { g.globalAlpha = motion ? ease((t - .4) / .35) : 1; g.font = `${subFs}px "Inter Tight", Helvetica, Arial, sans-serif`; g.fillText(s.sub, x, y + fs * .3); g.globalAlpha = 1; }
    }
    const r = W * .022; g.save(); g.translate(pad, H - pad - r * 2); g.scale(r * 2 / 164, r * 2 / 164); g.fillStyle = fg; g.fill(LOGO, "evenodd"); g.restore();
    g.textAlign = "left"; g.fillStyle = fg; g.font = `${Math.round(W * .022)}px "Plex Mono", monospace`; g.textBaseline = "middle"; g.fillText("HUIT.STUDIO", pad + r * 2 + W * .015, H - pad - r);
    g.restore();
  }
  // a small chart from "Label, value" lines, drawn in the brand: thin mono axes, solid bars or one line
  const parseData = txt => String(txt || "").split("\n").map(l => l.split(/[,;\t]/)).filter(a => a.length >= 2).map(a => ({ k: a[0].trim(), v: parseFloat(String(a[1]).replace(/[^\d.-]/g, "")) })).filter(d => !isNaN(d.v));
  function chart(g, s, W, H, pad, fg, t) {
    const d = parseData(s.chart.data); if (!d.length) return; const type = s.chart.type || "bar", unit = s.chart.unit || "";
    const fs = Math.round(W * .022), top = pad + W * .09, bottomRoom = (s.showText !== false ? (W * (HS[s.hsize] || HS.L)) * 2.4 + (s.sub ? W * .06 : 0) : 0) + W * .11;
    const x0 = pad, x1 = W - pad, y0 = top + fs * 2, y1 = (s.pos === "bottom" ? H - pad - bottomRoom : s.pos === "top" ? H - pad - W * .1 : H - pad - W * .1) - fs * 2.2;
    if (y1 - y0 < W * .12) return; const max = Math.max(...d.map(x => x.v), 0), min = Math.min(...d.map(x => x.v), 0), range = max - min || 1; const fmt = v => (Math.abs(v) >= 1000 ? Math.round(v).toLocaleString("en-GB") : (Math.round(v * 10) / 10).toString()) + unit;
    g.save(); g.strokeStyle = fg; g.globalAlpha = .25; g.lineWidth = Math.max(1, W * .0015); g.beginPath(); g.moveTo(x0, y1); g.lineTo(x1, y1); g.stroke(); g.globalAlpha = 1;
    g.fillStyle = fg; g.font = `${fs}px "Plex Mono", monospace`; g.textBaseline = "top";
    if (type === "line") {
      const n = d.length, step = (x1 - x0) / Math.max(1, n - 1); const pt = i => [x0 + i * step, y1 - (d[i].v - min) / range * (y1 - y0)];
      g.lineWidth = Math.max(2, W * .004); g.strokeStyle = fg; g.beginPath(); const upto = Math.max(1, Math.ceil(n * ease(t)));
      for (let i = 0; i < upto; i++) { const [x, y] = pt(i); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
      d.forEach((p, i) => { if (i >= upto) return; const [x, y] = pt(i); g.beginPath(); g.arc(x, y, W * .007, 0, Math.PI * 2); g.fill(); g.textAlign = i === 0 ? "left" : i === n - 1 ? "right" : "center"; g.fillText(p.k, x, y1 + fs * .6); if (i === n - 1 || i === 0 || p.v === max) { g.textBaseline = "bottom"; g.fillText(fmt(p.v), x, y - fs * .5); g.textBaseline = "top"; } });
    } else {
      const n = d.length, gap = W * .02, bw = ((x1 - x0) - gap * (n - 1)) / n;
      d.forEach((p, i) => { const h = (p.v - min) / range * (y1 - y0) * ease(t * 1.4 - i * .08 + .3), x = x0 + i * (bw + gap); g.fillRect(x, y1 - h, bw, h); g.textAlign = "left"; g.fillText(p.k, x, y1 + fs * .6); g.textBaseline = "bottom"; g.fillText(fmt(p.v), x, y1 - h - fs * .4); g.textBaseline = "top"; });
    }
    g.restore();
  }
  // play scenes on a canvas; returns a controller with stop()
  function play(canvas, slides, opts) {
    const W = canvas.width, H = canvas.height, g = canvas.getContext("2d"), TR = .5; const off = document.createElement("canvas"); off.width = W; off.height = H; const og = off.getContext("2d");
    const durs = slides.map(s => +s.dur || 4), total = durs.reduce((a, b) => a + b, 0); let raf, t0 = performance.now(), stopped = false;
    const frame = now => {
      if (stopped) return; const tg = (now - t0) / 1000; if (tg >= total) { draw(g, slides[slides.length - 1], W, H, 1, true); opts.onEnd && opts.onEnd(); return; }
      let acc = 0, i = 0; while (i < slides.length - 1 && tg >= acc + durs[i]) { acc += durs[i]; i++; }
      const lt = clamp((tg - acc) / durs[i], 0, 1), rem = acc + durs[i] - tg, next = slides[i + 1];
      draw(g, slides[i], W, H, lt, true);
      if (next && next.trans !== "cut" && rem < TR) {
        const k = ease(1 - rem / TR); draw(og, next, W, H, 0, true);
        if (next.trans === "slide") { g.save(); g.drawImage(off, W * (1 - k), 0); g.restore(); } else { g.save(); g.globalAlpha = k; g.drawImage(off, 0, 0); g.restore(); }
      }
      opts.onTime && opts.onTime(tg, total); raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return { stop() { stopped = true; cancelAnimationFrame(raf); }, total };
  }
  // record a play-through as webm
  function record(canvas, slides, done) {
    const stream = canvas.captureStream(30); const type = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"].find(t => window.MediaRecorder && MediaRecorder.isTypeSupported(t));
    if (!type) return done(null, "no_recorder"); const rec = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 8e6 }), chunks = [];
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); }; rec.onstop = () => done(new Blob(chunks, { type: type.split(";")[0] }));
    rec.start(200); const ctl = play(canvas, slides, { onEnd: () => setTimeout(() => rec.stop(), 300) }); return ctl;
  }
  window.HSC = { draw, play, record, image };
})();
