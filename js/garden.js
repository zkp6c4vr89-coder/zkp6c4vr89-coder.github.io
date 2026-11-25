// An ASCII garden. Stems grow up out of the grass, leaves unfurl, buds swell and bloom.
// Flowers sway in the breeze and lean away from the cursor; butterflies drift about.

const KINDS = {
  //            sprite rows (top → bottom)            petal colour       centre colour
  daisy:     { full: [" \\|/ ", "-(@)-", " /|\\ "], half: ["(@)"], petal: "#fffaf0", centre: "#e3a92b" },
  tulip:     { full: ["\\v/", "| |", "\\_/"],       half: ["(_)"], petal: "#e8553d", centre: "#e8553d" },
  rose:      { full: [" .@. ", "(@#@)", " `-' "],   half: ["(@)"], petal: "#ee7aa6", centre: "#c2185b" },
  sunflower: { full: ["\\ | /", "- @#@ -", "/ | \\"], half: ["@#@"], petal: "#f2c230", centre: "#7a4a1d" },
  bluebell:  { full: ["/^\\", "( )", "\\v/"],       half: ["/^\\"], petal: "#6d4ad6", centre: "#6d4ad6" },
};
const KIND_NAMES = Object.keys(KINDS);
const CENTRE = new Set(["@", "#"]);
const GRASS = [",", "'", '"', "`", ".", ";"];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Garden {
  constructor(canvas, { interactive = true, dark = false, reduceMotion = false, density = 1 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.interactive = interactive;
    this.dark = dark;
    this.reduce = reduceMotion;
    this.density = density;
    this.flowers = [];
    this.flies = [];
    this.mouse = null;
    this.visible = true;
    this.t0 = performance.now();
    this.resize();
    this.seed();

    addEventListener("resize", () => { clearTimeout(this.rt); this.rt = setTimeout(() => this.resize(), 150); });
    if (interactive) {
      canvas.addEventListener("pointermove", (e) => (this.mouse = this.toCell(e)));
      canvas.addEventListener("pointerleave", () => (this.mouse = null));
    }
    new IntersectionObserver(([e]) => (this.visible = e.isIntersecting)).observe(canvas);
    requestAnimationFrame((t) => this.frame(t));
  }

  toCell(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left) / this.cw, y: (e.clientY - r.top) / this.ch };
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.fontPx = w < 600 ? 13 : 15;
    this.ctx.font = `600 ${this.fontPx}px "IBM Plex Mono", ui-monospace, monospace`;
    this.cw = Math.ceil(this.ctx.measureText("M").width);
    this.ch = Math.round(this.fontPx * 1.2);
    this.cols = Math.floor(w / this.cw);
    this.rows = Math.floor(h / this.ch);
    this.canvas.width = w * dpr;
    this.canvas.height = h * dpr;
    this.dpr = dpr;
    this.grass = Array.from({ length: this.cols * 2 }, () => ({ c: pick(GRASS), g: rand(0.55, 1) }));
    // December to 6 January: a little snow falls over the garden
    const now = new Date();
    this.snowy = now.getMonth() === 11 || (now.getMonth() === 0 && now.getDate() <= 6);
    this.snow = this.snowy ? Array.from({ length: Math.round((this.cols * this.rows) / 45) }, () => ({ x: rand(0, this.cols), y: rand(0, this.rows), z: Math.random() })) : [];
  }

  newFlower(col, delay = 0) {
    const kind = pick(KIND_NAMES);
    const maxH = Math.max(3, this.rows - 5);
    return {
      col, kind, delay,
      height: Math.round(rand(Math.min(4, maxH), maxH)),
      grown: 0, bloom: 0,
      growRate: rand(3, 6), bloomRate: rand(0.35, 0.7),
      phase: rand(0, 6.28),
      leaves: [rand(0.25, 0.45), rand(0.5, 0.7)].map((f, i) => ({ f, side: i % 2 ? 1 : -1 })),
    };
  }

  seed() {
    const n = Math.max(4, Math.round((this.cols / 7) * this.density));
    const step = this.cols / n;
    for (let i = 0; i < n; i++) {
      const col = Math.round(step * (i + 0.5) + rand(-step * 0.3, step * 0.3));
      const f = this.newFlower(col, this.reduce ? 0 : rand(0, 2.5));
      if (this.reduce) { f.grown = f.height; f.bloom = 1; }
      this.flowers.push(f);
    }
    const flyCount = Math.max(2, Math.round(this.cols / 45));
    for (let i = 0; i < flyCount; i++) {
      this.flies.push({ x: rand(0, this.cols), y: rand(1, this.rows * 0.6), vx: rand(-3, 3), vy: 0, phase: rand(0, 6), col: pick(["#ee7aa6", "#1f8a86", "#e3a92b", "#6d4ad6"]) });
    }
  }

  step(dt, t) {
    for (const f of this.flowers) {
      if (f.delay > 0) { f.delay -= dt; continue; }
      if (f.grown < f.height) f.grown = Math.min(f.height, f.grown + f.growRate * dt);
      else f.bloom = Math.min(1, f.bloom + f.bloomRate * dt);
      // the cursor nearby: lean away, and hurry up and bloom
      f.push = 0;
      if (this.mouse) {
        const dx = f.col - this.mouse.x;
        if (Math.abs(dx) < 6) {
          f.push = Math.sign(dx || 1) * (1 - Math.abs(dx) / 6) * 1.6;
          if (f.grown >= f.height) f.bloom = Math.min(1, f.bloom + dt * 1.5);
        }
      }
    }
    for (const b of this.flies) {
      b.phase += dt * 10;
      b.vx += Math.sin(t * 0.7 + b.phase * 0.05) * dt * 4;
      b.vy = Math.sin(t * 1.3 + b.phase * 0.1) * 1.2;
      if (this.mouse) {
        const dx = b.x - this.mouse.x, dy = (b.y - this.mouse.y) * 1.6, d = Math.hypot(dx, dy) || 1;
        if (d < 8) { b.vx += (dx / d) * 30 * dt; b.y += (dy / d) * 6 * dt; }
      }
      b.vx = Math.max(-6, Math.min(6, b.vx));
      b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.x < -2) b.x = this.cols + 1; if (b.x > this.cols + 2) b.x = -1;
      b.y = Math.max(0.5, Math.min(this.rows - 4, b.y));
    }
  }

  put(x, y, c, color) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows || c === " ") return;
    this.ctx.fillStyle = color;
    this.ctx.fillText(c, (x + 0.5) * this.cw, (y + 0.5) * this.ch);
  }

  draw(t) {
    const { ctx, rows } = this;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.font = `600 ${this.fontPx}px "IBM Plex Mono", ui-monospace, monospace`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    const ground = rows - 1;
    const stemCol = this.dark ? "#6fcf5a" : "#4f8a3a", leafCol = this.dark ? "#9be07a" : "#3f7a2c";

    // grass: two rows, gently waving
    for (let x = 0; x < this.cols; x++) {
      for (let k = 0; k < 2; k++) {
        const g = this.grass[x * 2 + k];
        const wave = this.reduce ? 0 : Math.sin(t * 1.5 + x * 0.35 + k);
        const c = k === 0 && Math.abs(wave) > 0.7 ? (wave > 0 ? "/" : "\\") : g.c;
        const shade = Math.round(90 + 90 * g.g);
        this.put(x, ground - k, c, this.dark ? `rgb(60,${shade},70)` : `rgb(50,${shade - 20},45)`);
      }
    }

    for (const f of this.flowers) {
      if (f.delay > 0) continue;
      const sway = this.reduce ? 0 : Math.sin(t * 1.1 + f.phase) * 0.7 + (f.push || 0);
      const h = Math.floor(f.grown);
      // stem: straight at the bottom, leaning with the sway near the top
      for (let i = 1; i <= h; i++) {
        const k = i / Math.max(1, f.height);
        const off = Math.round(sway * k * k);
        const c = k > 0.6 && Math.abs(sway) > 0.5 ? (sway > 0 ? "/" : "\\") : "|";
        this.put(f.col + off, ground - 1 - i, c, stemCol);
      }
      for (const l of f.leaves) {
        const at = Math.round(l.f * f.height);
        if (h >= at && at > 0) this.put(f.col + l.side, ground - 1 - at, l.side < 0 ? "\\" : "/", leafCol);
      }
      if (f.grown < f.height) continue;
      // the flower head: bud → half open → full bloom
      const topY = ground - 1 - f.height;
      const headX = f.col + Math.round(sway);
      const kind = KINDS[f.kind];
      if (f.bloom < 0.3) { this.put(headX, topY, "o", leafCol); continue; }
      const sprite = f.bloom < 0.65 ? kind.half : kind.full;
      sprite.forEach((row, r) => {
        const y = topY - (sprite.length - 1) + r;
        [...row].forEach((c, i) => {
          this.put(headX - Math.floor(row.length / 2) + i, y, c, CENTRE.has(c) ? kind.centre : kind.petal);
        });
      });
    }

    for (const f of this.snow) {
      if (!this.reduce) { f.y += (0.02 + 0.05 * f.z); f.x += Math.sin(t + f.z * 9) * 0.01; }
      if (f.y > rows - 1) { f.y = 0; f.x = rand(0, this.cols); }
      const a = 0.35 + 0.55 * f.z;
      this.put(Math.round(f.x), Math.round(f.y), f.z > 0.7 ? "*" : ".", this.dark ? `rgba(235,242,255,${a})` : `rgba(70,95,150,${a})`);
    }

    for (const b of this.flies) {
      const open = Math.sin(b.phase) > 0;
      const x = Math.round(b.x), y = Math.round(b.y);
      this.put(x - 1, y, open ? "\\" : ")", b.col);
      this.put(x, y, "|", this.dark ? "#f4ecd8" : "#2a2118");
      this.put(x + 1, y, open ? "/" : "(", b.col);
    }
  }

  frame(now) {
    requestAnimationFrame((t) => this.frame(t));
    if (!this.visible) { this.last = now; return; }
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    const t = (now - this.t0) / 1000;
    if (!this.reduce) this.step(dt, t);
    this.draw(t);
  }
}
