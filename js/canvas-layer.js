// Tegner scenens SVG-lag på <canvas> i stedet for at vise SVG direkte.
// Hvorfor: iPhone-Safari tegner store, animerede SVG'er i 3D som meget store grafikflader og
// løber tør for hukommelse. Et lærred har en fast størrelse, som vi selv bestemmer.
// Rendereren forstår netop det, scene.js bruger: g, path, rect, circle, ellipse, text,
// transform, clip-path, opacity, fill, stroke, streg-stil og stiplede linjer.
import { VIEW } from "./kit.js";

const INHERIT = ["fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-dasharray", "font-family", "font-size", "text-anchor", "letter-spacing"];
const BASE_STYLE = { fill: "#000", stroke: "none", "stroke-width": "1", "stroke-linecap": "butt", "stroke-linejoin": "miter", "stroke-dasharray": "none", "font-family": "sans-serif", "font-size": "16", "text-anchor": "start", "letter-spacing": "0" };

function applyTransform(ctx, str) {
  if (!str) return;
  const re = /(translate|rotate|scale|matrix)\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(str))) {
    const a = m[2].trim().split(/[\s,]+/).map(Number);
    if (m[1] === "translate") ctx.translate(a[0] || 0, a[1] || 0);
    else if (m[1] === "scale") ctx.scale(a[0], a.length > 1 ? a[1] : a[0]);
    else if (m[1] === "rotate") {
      const r = ((a[0] || 0) * Math.PI) / 180;
      if (a.length >= 3) {
        ctx.translate(a[1], a[2]);
        ctx.rotate(r);
        ctx.translate(-a[1], -a[2]);
      } else ctx.rotate(r);
    } else if (m[1] === "matrix") ctx.transform(a[0], a[1], a[2], a[3], a[4], a[5]);
  }
}

function num(el, name, def = 0) {
  const v = el.getAttribute(name);
  return v == null ? def : parseFloat(v);
}

// Path2D for en form, gemt så længe formen ikke ændrer sig.
function shapePath(el) {
  const tag = el.tagName;
  if (tag === "path") {
    const d = el.getAttribute("d") || "";
    if (el.__d !== d) {
      el.__d = d;
      el.__p = new Path2D(d);
    }
    return el.__p;
  }
  const key = tag + ["x", "y", "width", "height", "rx", "cx", "cy", "r", "ry"].map((n) => el.getAttribute(n)).join(",");
  if (el.__k === key) return el.__p;
  const p = new Path2D();
  if (tag === "rect") {
    const x = num(el, "x"), y = num(el, "y"), w = num(el, "width"), h = num(el, "height"), rx = Math.min(num(el, "rx"), w / 2, h / 2);
    if (rx > 0 && p.roundRect) p.roundRect(x, y, w, h, rx);
    else p.rect(x, y, w, h);
  } else if (tag === "circle") {
    p.arc(num(el, "cx"), num(el, "cy"), num(el, "r"), 0, Math.PI * 2);
  } else if (tag === "ellipse") {
    p.ellipse(num(el, "cx"), num(el, "cy"), Math.max(0, num(el, "rx")), Math.max(0, num(el, "ry")), 0, 0, Math.PI * 2);
  }
  el.__k = key;
  el.__p = p;
  return p;
}

// En transform-tekst som DOMMatrix (gemt på elementet).
function matrixOf(el) {
  const t = el.getAttribute("transform") || "";
  if (el.__t === t) return el.__m;
  let m = new DOMMatrix();
  const re = /(translate|rotate|scale|matrix)\(([^)]*)\)/g;
  let g;
  while ((g = re.exec(t))) {
    const a = g[2].trim().split(/[\s,]+/).map(Number);
    if (g[1] === "translate") m = m.translate(a[0] || 0, a[1] || 0);
    else if (g[1] === "scale") m = m.scale(a[0], a.length > 1 ? a[1] : a[0]);
    else if (g[1] === "rotate") m = a.length >= 3 ? m.translate(a[1], a[2]).rotate(a[0]).translate(-a[1], -a[2]) : m.rotate(a[0]);
    else if (g[1] === "matrix") m = m.multiply(new DOMMatrix(a));
  }
  el.__t = t;
  el.__m = m;
  return m;
}

function clipTo(ctx, svg, ref) {
  const id = ref.match(/url\(#([^)]+)\)/);
  if (!id) return;
  const cp = svg.querySelector("#" + CSS.escape(id[1]));
  if (!cp) return;
  if (cp.__cp && cp.__cpKey === cp.innerHTML) {
    ctx.clip(cp.__cp);
    return;
  }
  const combined = new Path2D();
  for (const s of cp.children) combined.addPath(shapePath(s), matrixOf(s));
  cp.__cp = combined;
  cp.__cpKey = cp.innerHTML;
  ctx.clip(combined);
}

function drawText(ctx, el, st) {
  const txt = el.textContent || "";
  if (!txt) return;
  const size = parseFloat(st["font-size"]);
  ctx.font = `${size}px ${st["font-family"]}`;
  ctx.textBaseline = "alphabetic";
  const ls = parseFloat(st["letter-spacing"]) || 0;
  const rot = (el.getAttribute("rotate") || "").trim().split(/[\s,]+/).filter(Boolean).map(Number);
  const chars = [...txt];
  const widths = chars.map((c) => ctx.measureText(c).width);
  const total = widths.reduce((a, b) => a + b, 0) + ls * chars.length;
  let x = num(el, "x");
  const y = num(el, "y");
  if (st["text-anchor"] === "middle") x -= total / 2;
  else if (st["text-anchor"] === "end") x -= total;
  chars.forEach((c, i) => {
    const r = rot.length ? rot[Math.min(i, rot.length - 1)] : 0;
    ctx.save();
    ctx.translate(x, y);
    if (r) ctx.rotate((r * Math.PI) / 180);
    if (st.fill !== "none") {
      ctx.fillStyle = st.fill;
      ctx.fillText(c, 0, 0);
    }
    ctx.restore();
    x += widths[i] + ls;
  });
}

function walk(ctx, svg, node, parentStyle, alpha) {
  for (const el of node.children) {
    const tag = el.tagName;
    if (tag === "defs" || tag === "clipPath" || tag === "style") continue;
    const op = el.getAttribute("opacity");
    const a = alpha * (op == null ? 1 : parseFloat(op));
    if (a <= 0.001) continue;
    const st = { ...parentStyle };
    for (const k of INHERIT) {
      const v = el.getAttribute(k);
      if (v != null) st[k] = v;
    }
    ctx.save();
    applyTransform(ctx, el.getAttribute("transform"));
    const cp = el.getAttribute("clip-path");
    if (cp) clipTo(ctx, svg, cp);
    if (tag === "g") walk(ctx, svg, el, st, a);
    else if (tag === "text") {
      ctx.globalAlpha = a;
      drawText(ctx, el, st);
    } else if (tag === "path" || tag === "rect" || tag === "circle" || tag === "ellipse") {
      const p = shapePath(el);
      ctx.globalAlpha = a;
      if (st.fill !== "none") {
        ctx.fillStyle = st.fill;
        ctx.fill(p);
      }
      if (st.stroke !== "none" && parseFloat(st["stroke-width"]) > 0) {
        ctx.strokeStyle = st.stroke;
        ctx.lineWidth = parseFloat(st["stroke-width"]);
        ctx.lineCap = st["stroke-linecap"];
        ctx.lineJoin = st["stroke-linejoin"];
        const da = st["stroke-dasharray"];
        ctx.setLineDash(da && da !== "none" ? da.split(/[\s,]+/).map(Number) : []);
        ctx.stroke(p);
      }
    }
    ctx.restore();
  }
}

// Ét lærred pr. lag (eller ét for flere lag). size = CSS-px, res = pixels i lærredet.
export function canvasLayer(svgs, { size, res }) {
  const canvas = document.createElement("canvas");
  canvas.width = res;
  canvas.height = res;
  canvas.style.cssText = `width:${size}px;height:${size}px;display:block;pointer-events:none`;
  const ctx = canvas.getContext("2d");
  const k = res / VIEW.w;
  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, res, res);
    ctx.setTransform(k, 0, 0, k, -VIEW.x * k, -VIEW.y * k);
    for (const svg of svgs) walk(ctx, svg, svg, BASE_STYLE, 1);
  }
  return { canvas, draw };
}
