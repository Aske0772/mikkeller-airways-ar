// Mikkeller AR-kit: fælles tegneværktøjer for alle bytryk.
// En by-scene (js/scene.js) bruger disse til at tegne i Mikkellers håndtegnede stil, så trykket
// og AR-lagene kommer fra samme kode og passer præcis oven på hinanden.

export const NS = "http://www.w3.org/2000/svg";

// Farver fra mikkeller-colors/palette.json (version 5).
export const INK = "#010103";
export const WHITE = "#FFFFFF";
export const BRAND = {
  red: "#DA3A35",
  yellow: "#F5E14B",
  blue: "#3584BA",
  peach: "#F0B7AD",
  moss: "#357C4F",
  beer: "#ECAE0A",
  mauve: "#CFB5BC",
  brown: "#8F5C35",
  paper: "#EEE5D2",
  evening: "#0F0F54",
};

// Trykkets tegneflade. AR-lagene er større, så regn, sky og fly kan gå ud over t-shirten.
export const PRINT = { w: 1600, h: 1200 };
export const VIEW = { x: -400, y: -600, w: 2400, h: 2400 };
export const FONT = "'Bowlby One', 'Arial Black', sans-serif";

// ---------- små værktøjer ----------
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const ease = (v) => {
  v = clamp01(v);
  return v * v * (3 - 2 * v);
};
export const easeOut = (v) => 1 - Math.pow(1 - clamp01(v), 3);
export const f = (n) => Math.round(n * 10) / 10;

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function densify(pts, step, closed) {
  const out = [];
  const n = pts.length;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const k = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
    for (let j = 0; j < k; j++) out.push([a[0] + ((b[0] - a[0]) * j) / k, a[1] + ((b[1] - a[1]) * j) / k]);
  }
  if (!closed) out.push(pts[n - 1]);
  return out;
}

export function smooth(pts, closed) {
  const n = pts.length;
  const P = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(P(0)[0])},${f(P(0)[1])}`;
  const m = closed ? n : n - 1;
  for (let i = 0; i < m; i++) {
    const p0 = P(i - 1);
    const p1 = P(i);
    const p2 = P(i + 1);
    const p3 = P(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${f(c1[0])},${f(c1[1])} ${f(c2[0])},${f(c2[1])} ${f(p2[0])},${f(p2[1])}`;
  }
  return closed ? d + "Z" : d;
}

// Håndtegnet linje: tæt punktrække med lidt rystelse, glattet ud.
let seedCounter = 11;
// Nulstil rystelsen før hver scene, så print- og AR-kopien bliver identiske.
export function resetSeed(n = 11) {
  seedCounter = n;
}
export function hand(pts, { closed = true, step = 38, amt = 2.4, seed } = {}) {
  const r = rng(seed ?? seedCounter++);
  const dense = step ? densify(pts, step, closed) : pts;
  return smooth(
    dense.map((p) => [p[0] + (r() - 0.5) * 2 * amt, p[1] + (r() - 0.5) * 2 * amt]),
    closed
  );
}

export function ellipsePts(cx, cy, rx, ry, n = 14, rot = 0, wob = 0, seed = 1) {
  const r = rng(seed);
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * wob;
    const x = Math.cos(a) * rx * k;
    const y = Math.sin(a) * ry * k;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return pts;
}

export function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, u) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * clamp01(u)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function E(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}

export const SW = 9; // hovedstreg i trykpixels
export const LINE = { fill: "none", stroke: INK, "stroke-width": SW, "stroke-linecap": "round", "stroke-linejoin": "round" };
export const SHAPE = { fill: WHITE, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" };
export const SOLID = { fill: INK, stroke: INK, "stroke-width": SW, "stroke-linejoin": "round" };

// Benenes vinkel ud fra hofte og fod (to led, knæet peger frem).
export function ik(h, ft, l1, l2) {
  const dx = ft[0] - h[0];
  const dy = ft[1] - h[1];
  const d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.5);
  const a = Math.atan2(dy, dx);
  const b = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d))));
  const ang = a - b;
  return [h[0] + l1 * Math.cos(ang), h[1] + l1 * Math.sin(ang)];
}

export function bezier(p0, p1, p2, p3, u) {
  const v = 1 - u;
  return [
    v * v * v * p0[0] + 3 * v * v * u * p1[0] + 3 * v * u * u * p2[0] + u * u * u * p3[0],
    v * v * v * p0[1] + 3 * v * v * u * p1[1] + 3 * v * u * u * p2[1] + u * u * u * p3[1],
  ];
}

// Laver én <svg> pr. dybdelag. Alle lag har samme viewBox (VIEW), så de ligger præcis oveni hinanden.
export function makeLayers(root, layerDefs, cls = "ar") {
  const layers = {};
  for (const L of layerDefs) {
    const svg = E("svg", {
      viewBox: `${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`,
      class: `${cls}-layer ${cls}-layer-` + L.id,
      "data-depth": L.depth,
    });
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.overflow = "visible";
    svg.style.pointerEvents = "none";
    root.appendChild(svg);
    layers[L.id] = { ...L, svg, g: E("g", {}, svg), defs: E("defs", {}, svg) };
  }
  return layers;
}

// Tegner en QR-kode (rækker af "0"/"1") centreret i (cx, cy) med en samlet bredde på size trykpixels.
// Ingen håndrystelse: koden skal kunne scannes. Hold mindst 2 moduler hvid luft rundt om den.
export function drawQR(parent, rows, cx, cy, size) {
  const M = rows.length;
  const mod = size / M;
  const x0 = cx - (M * mod) / 2;
  const y0 = cy - (M * mod) / 2;
  const qr = E("g", { fill: INK }, parent);
  rows.forEach((row, r) => {
    let c = 0;
    while (c < M) {
      if (row[c] === "1") {
        let e = c;
        while (e < M && row[e] === "1") e++;
        E("rect", { x: f(x0 + c * mod), y: f(y0 + r * mod), width: f((e - c) * mod), height: f(mod + 0.4), rx: f(mod * 0.32) }, qr);
        c = e;
      } else c++;
    }
  });
  return qr;
}

// Samler trykket til én SVG (0 0 1600 1200) til tryk og som AR-mål.
export function printSVGString(scene, { embedFontCSS = "" } = {}) {
  const parts = scene.layers.map((L) => L.svg.innerHTML).join("\n");
  const style = embedFontCSS ? `<style>${embedFontCSS}</style>` : "";
  return `<svg xmlns="${NS}" viewBox="0 0 ${PRINT.w} ${PRINT.h}" width="${PRINT.w}" height="${PRINT.h}">${style}${parts}</svg>`;
}
