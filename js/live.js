// Live-AR viewport: siden åbner direkte i kameraet. Selve trykket er triggeren
// (billedgenkendelse med MindAR). Når trykket findes, vågner scenen op oven på t-shirten,
// og hvert lag løftes ud fra stoffet efter sin dybde.
import { CSS3DObject } from "three/addons/renderers/CSS3DRenderer.js";
import { MindARThree } from "mindar-image-three";
import { createScene, PRINT, VIEW, CUES } from "./scene.js";

const $ = (s) => document.querySelector(s);
const PX = 1000 / PRINT.w; // MindAR: målbilledets bredde = 1000 CSS-px
const LAYER_PX = VIEW.w * PX; // AR-fladen er større end trykket
const RESTART_AFTER = 4; // sekunder uden tryk, før forløbet starter forfra næste gang

// Hukommelse: iPhone-Safari genindlæser siden (og spørger om kameraet igen), hvis den løber
// tør for grafikhukommelse. Hvert lag tegnes derfor som et lille element og skaleres op i 3D.
// Er siden lige blevet genindlæst under opstart, bruges "let"-tilstand: ét fladt lag.
const store = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch {} },
  del(k) { try { sessionStorage.removeItem(k); } catch {} },
};
const lastStart = Number(store.get("kbh-start") || 0);
const LITE = new URLSearchParams(location.search).has("let") || (lastStart && Date.now() - lastStart < 30000);
const ELEM_PX = LITE ? 420 : 600; // elementets egen størrelse i CSS-px
const UP = LAYER_PX / ELEM_PX; // opskalering i 3D, så trykket stadig dækker 1000 px

// ---------- lyd (kræver et tryk på skærmen) ----------
const sfx = {
  rain: new Audio("assets/audio/rain.mp3"),
  swish: new Audio("assets/audio/swish.wav"),
};
sfx.rain.loop = true;
let soundOn = false;
$("#sound").onclick = () => {
  soundOn = !soundOn;
  $("#sound").classList.toggle("on", soundOn);
  $("#sound").setAttribute("aria-label", soundOn ? "Slå lyd fra" : "Slå lyd til");
  if (soundOn) {
    for (const a of Object.values(sfx)) a.load();
    if (clock.tracking && clock.t > CUES.rain) sfx.rain.play().catch(() => {});
  } else sfx.rain.pause();
};
const play = (n, v) => {
  if (!soundOn) return;
  sfx[n].volume = v;
  sfx[n].currentTime = 0;
  sfx[n].play().catch(() => {});
};

// ---------- tid: går kun, mens trykket er i billedet ----------
const clock = { t: 0, last: 0, tracking: false, lostAt: 0, cues: new Set() };
function restart() {
  clock.t = 0;
  clock.cues.clear();
  sfx.rain.pause();
}

let mindar = null;
let scene = null;
const objects = [];

async function start() {
  $("#error").hidden = true;
  $("#loading").hidden = false;
  await document.fonts.load("40px 'Bowlby One'").catch(() => {});

  if (!mindar) {
    mindar = new MindARThree({
      container: $("#ar"),
      imageTargetSrc: "assets/target/koebenhavn.mind",
      uiLoading: "no",
      uiScanning: "no",
      uiError: "no",
      filterMinCF: 0.0001,
      filterBeta: 0.01,
      missTolerance: 8,
    });
    const anchor = mindar.addCSSAnchor(0);

    // Scenen bygges én gang; hvert lag får sit eget 3D-objekt på trykket.
    const holder = document.createElement("div");
    holder.style.cssText = `position:absolute;left:-99999px;width:${ELEM_PX}px;height:${ELEM_PX}px`;
    document.body.appendChild(holder);
    scene = createScene(holder, { mode: "ar", base: true });
    const makeObj = (svgs, depth) => {
      const wrap = document.createElement("div");
      wrap.style.cssText = `width:${ELEM_PX}px;height:${ELEM_PX}px;position:relative;pointer-events:none;overflow:visible`;
      svgs.forEach((svg) => wrap.appendChild(svg));
      const obj = new CSS3DObject(wrap);
      obj.scale.set(UP, UP, 1);
      anchor.group.add(obj);
      objects.push({ obj, depth });
    };
    if (LITE) makeObj(scene.layers.map((L) => L.svg), 0);
    else scene.layers.forEach((L) => makeObj([L.svg], L.depth));
    holder.remove();

    anchor.onTargetFound = () => {
      const away = (performance.now() - clock.lostAt) / 1000;
      if (clock.lostAt && away > RESTART_AFTER) restart();
      clock.tracking = true;
      document.body.classList.add("tracking");
      if (soundOn && clock.t > CUES.rain) sfx.rain.play().catch(() => {});
    };
    anchor.onTargetLost = () => {
      clock.tracking = false;
      clock.lostAt = performance.now();
      document.body.classList.remove("tracking");
      sfx.rain.pause();
    };
  }

  try {
    await mindar.start();
  } catch (e) {
    $("#loading").hidden = true;
    $("#errText").textContent = window.isSecureContext
      ? "Giv siden lov til at bruge kameraet, og prøv igen."
      : "Kameraet virker kun, når siden åbnes via https.";
    $("#error").hidden = false;
    return;
  }
  $("#loading").hidden = true;
  store.set("kbh-start", String(Date.now()));
  setTimeout(() => store.del("kbh-start"), 15000); // kørte stabilt: næste besøg får fuld version
  clock.last = performance.now();
  mindar.renderer.setAnimationLoop(loop);
}

function loop(now) {
  const dt = Math.min(0.1, (now - clock.last) / 1000);
  clock.last = now;
  if (clock.tracking) clock.t += dt;
  const t = clock.t;
  if (clock.tracking) scene.update(t); // tegn kun, når trykket er i billedet
  const d = scene.depthAt(t);
  objects.forEach(({ obj, depth }) => (obj.position.z = depth * PX * d));

  const cue = (k, at, fn) => {
    if (t >= at && !clock.cues.has(k)) {
      clock.cues.add(k);
      fn();
    }
  };
  cue("rain", CUES.rain, () => {
    if (soundOn && clock.tracking) {
      sfx.rain.volume = 0;
      sfx.rain.play().catch(() => {});
    }
  });
  cue("swish", CUES.planeSound, () => play("swish", 0.9));
  if (soundOn && t > CUES.rain) sfx.rain.volume = Math.min(0.55, (t - CUES.rain) * 0.4);

  // WebGL-scenen er tom (alt er HTML-lag), så kun CSS-laget tegnes.
  const { cssRenderer, cssScene, camera } = mindar;
  cssRenderer.render(cssScene, camera);
}

$("#retry").onclick = start;
start();

window.__live = { clock, get scene() { return scene; } };
