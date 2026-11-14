// The big title, drawn the ASCII Studio way: render the words, then redraw every cell
// with a character whose "ink" matches how much of the letter covers it. A sunset
// gradient runs across it, characters shimmer, and they scatter a little near the cursor.

const RAMP = " .:-=+*#%@";
const STOPS = [[0, [109, 74, 214]], [0.35, [214, 60, 168]], [0.65, [232, 85, 61]], [1, [227, 169, 43]]];

function grad(t) {
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i][0]) {
      const [a, ca] = STOPS[i - 1], [b, cb] = STOPS[i];
      const k = (t - a) / (b - a);
      return ca.map((v, j) => Math.round(v + (cb[j] - v) * k));
    }
  }
  return STOPS.at(-1)[1];
}

export function drawTitle(canvas, { lines = ["ASCII", "STUDIO"], reduceMotion = false } = {}) {
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let cells = [], cols = 0, rows = 0, cw = 0, ch = 0, mouse = null, start = performance.now();

  function layout() {
    const w = canvas.clientWidth || canvas.parentElement.clientWidth;
    cw = Math.max(6, Math.round(w / 110));             // ~110 characters across
    ch = Math.round(cw * 1.6);
    cols = Math.floor(w / cw);
    rows = 26;
    canvas.width = cols * cw * dpr;
    canvas.height = rows * ch * dpr;
    canvas.style.height = `${rows * ch}px`;

    // draw the words in a hidden canvas at one pixel per cell, then read coverage
    const off = document.createElement("canvas");
    off.width = cols; off.height = rows;
    const o = off.getContext("2d");
    o.fillStyle = "#000"; o.fillRect(0, 0, cols, rows);
    o.fillStyle = "#fff";
    o.textAlign = "center"; o.textBaseline = "middle";
    const size = rows / lines.length;
    o.font = `900 ${size * 1.05}px "Fraunces", Georgia, serif`;
    lines.forEach((t, i) => {
      o.save();
      o.translate(cols / 2, size * (i + 0.55));
      o.scale(Math.min(1, (cols * 0.96) / o.measureText(t).width), 1);
      o.fillText(t, 0, 0);
      o.restore();
    });
    const px = o.getImageData(0, 0, cols, rows).data;
    cells = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const v = px[(y * cols + x) * 4] / 255;
        if (v < 0.08) continue;
        cells.push({ x, y, v, seed: Math.random() * 6.28, t: grad(x / cols * 0.75 + y / rows * 0.25) });
      }
    }
  }

  function frame(now) {
    const t = (now - start) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cols * cw, rows * ch);
    ctx.font = `600 ${Math.round(ch * 0.92)}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const c of cells) {
      // characters appear one diagonal at a time at load, like a printer
      const appear = reduceMotion ? 1 : Math.min(1, Math.max(0, (t * 90 - (c.x + c.y * 2)) / 12));
      if (appear <= 0) continue;
      let v = c.v + (reduceMotion ? 0 : 0.08 * Math.sin(t * 2 + c.seed));
      let dx = 0, dy = 0;
      if (mouse) {
        const mx = (c.x + 0.5) * cw - mouse.x, my = (c.y + 0.5) * ch - mouse.y;
        const d = Math.hypot(mx, my), R = cw * 9;
        if (d < R) { const k = (1 - d / R) ** 2; dx = (mx / (d || 1)) * k * cw * 1.6; dy = (my / (d || 1)) * k * ch * 0.8; v -= k * 0.4; }
      }
      const chr = RAMP[Math.max(1, Math.min(RAMP.length - 1, Math.round(v * (RAMP.length - 1))))];
      const [r, g, b] = c.t;
      ctx.fillStyle = `rgba(${r},${g},${b},${appear})`;
      ctx.fillText(chr, (c.x + 0.5) * cw + dx, (c.y + 0.5) * ch + dy);
    }
    if (!reduceMotion || t < 0.1) requestAnimationFrame(frame);
  }

  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  });
  canvas.addEventListener("pointerleave", () => (mouse = null));
  let rt;
  addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(layout, 150); });
  layout();
  requestAnimationFrame(frame);
}
