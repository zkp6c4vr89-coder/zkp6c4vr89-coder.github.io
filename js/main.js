import { drawTitle } from "./title.js";
import { Garden } from "./garden.js";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

// wait for the fonts so the ASCII is measured with the right letters
await document.fonts.ready.catch(() => {});

drawTitle(document.getElementById("title-art"), { reduceMotion });
new Garden(document.getElementById("garden"), { reduceMotion });
new Garden(document.getElementById("garden-foot"), { interactive: false, dark: true, reduceMotion, density: 0.8 });

// ---- point people at the right download ----
async function detectOS() {
  const ua = navigator.userAgent;
  if (/Windows/i.test(ua)) return ["win", "Windows"];
  if (/Android|iPhone|iPad/i.test(ua)) return [null, "a phone — the web studio works great there!"];
  if (/Mac/i.test(ua)) {
    let arm = null;
    try {
      const h = await navigator.userAgentData?.getHighEntropyValues(["architecture"]);
      if (h?.architecture) arm = h.architecture === "arm";
    } catch {}
    if (arm === null) {
      // Safari/Firefox don't say; Apple Silicon GPUs give themselves away in WebGL
      try {
        const gl = document.createElement("canvas").getContext("webgl");
        const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
        const gpu = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "";
        arm = /Apple M|Apple GPU/i.test(gpu) || !/Intel/i.test(gpu);
      } catch { arm = true; }
    }
    return arm ? ["mac-arm", "a Mac with Apple Silicon"] : ["mac-intel", "an Intel Mac"];
  }
  if (/Linux/i.test(ua)) return ["linux", "Linux"];
  return [null, null];
}
detectOS().then(([os, label]) => {
  if (!label) return;
  document.getElementById("detected").textContent = `looks like you're on ${label}:`;
  if (os) document.querySelector(`.dl[data-os="${os}"]`)?.classList.add("recommended");
});

// ---- things slide in as you scroll ----
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
}, { threshold: 0.12 });
document.querySelectorAll("main section > *, .footer .foot-inner").forEach((el) => {
  el.classList.add("reveal");
  io.observe(el);
});
