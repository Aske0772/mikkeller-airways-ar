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
    holder.style.cssText = `position:absolute;left:-99999px;width:${LAYER_PX}px;height:${LAYER_PX}px`;
    document.body.appendChild(holder);
    scene = createScene(holder, { mode: "ar", base: true });
    scene.layers.forEach((L) => {
      const wrap = document.createElement("div");
      wrap.style.cssText = `width:${LAYER_PX}px;height:${LAYER_PX}px;position:relative;pointer-events:none`;
      wrap.appendChild(L.svg);
      const obj = new CSS3DObject(wrap);
      anchor.group.add(obj);
      objects.push({ obj, depth: L.depth });
    });
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
  clock.last = performance.now();
  mindar.renderer.setAnimationLoop(loop);
}

function loop(now) {
  const dt = Math.min(0.1, (now - clock.last) / 1000);
  clock.last = now;
  if (clock.tracking) clock.t += dt;
  const t = clock.t;
  scene.update(t);
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

  const { renderer, cssRenderer, scene: s3, cssScene, camera } = mindar;
  renderer.render(s3, camera);
  cssRenderer.render(cssScene, camera);
}

$("#retry").onclick = start;
start();

window.__live = { clock, get scene() { return scene; } };
