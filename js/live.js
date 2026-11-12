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

// Kameraet beder om et lille billede. Genkendelsen behøver ikke mere, og et stort
// kamerabillede fylder meget i grafikhukommelsen, når MindAR analyserer det.
if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  const gum = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
  navigator.mediaDevices.getUserMedia = (c = {}) =>
    gum({ audio: false, video: { ...(typeof c.video === "object" ? c.video : {}), width: { ideal: 640 }, height: { ideal: 480 } } });
}
// MindAR's billedanalyse (TensorFlow.js) skal slippe grafikhukommelse med det samme.
try {
  window.MINDAR.IMAGE.tf.env().set("WEBGL_DELETE_TEXTURE_THRESHOLD", 0);
} catch {}

// Testtrin til fejlfinding på telefonen: ?trin=1 kun kamera, ?trin=2 genkendelse uden AR,
// ?trin=3 genkendelse med et fladt billede af trykket. Uden ?trin kører den fulde AR.
const STAGE = Number(new URLSearchParams(location.search).get("trin")) || 0;
let statusEl = null;
function status(msg) {
  if (!STAGE) return;
  if (!statusEl) {
    statusEl = document.createElement("div");
    statusEl.style.cssText = "position:fixed;left:12px;top:max(12px,env(safe-area-inset-top));z-index:20;background:#F5E14B;color:#010103;font:700 13px/1.3 system-ui;padding:8px 12px;border-radius:12px;max-width:70vw";
    document.body.appendChild(statusEl);
  }
  statusEl.textContent = `Test trin ${STAGE}: ${msg}`;
}

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

async function startCameraOnly() {
  status("starter kun kameraet …");
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    const v = document.createElement("video");
    v.setAttribute("playsinline", "");
    v.muted = true;
    v.autoplay = true;
    v.srcObject = stream;
    v.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover";
    $("#ar").appendChild(v);
    await v.play().catch(() => {});
    $("#loading").hidden = true;
    v.addEventListener("loadedmetadata", () => status(`kameraet kører (${v.videoWidth}×${v.videoHeight}). Går det godt i 30 sek., er kameraet ikke problemet.`));
  } catch (e) {
    $("#loading").hidden = true;
    status("kameraet kunne ikke starte: " + (e && e.name));
  }
}

async function start() {
  if (STAGE === 1) return startCameraOnly();
  $("#error").hidden = true;
  $("#loading").hidden = false;
  status("indlæser genkendelsen …");
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
    // WebGL-lærredet bruges ikke (AR'en er HTML-lag), så det holdes lille og skjult.
    mindar.renderer.setPixelRatio(1);
    mindar.renderer.domElement.style.display = "none";

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
    if (STAGE === 2) {
      // kun genkendelse, ingen AR-grafik
    } else if (STAGE === 3) {
      const img = document.createElement("img");
      img.src = "print/koebenhavn-ar-maal.png";
      img.style.cssText = `position:absolute;left:${(ELEM_PX * 400) / 2400}px;top:${(ELEM_PX * 600) / 2400}px;width:${(ELEM_PX * 1600) / 2400}px;opacity:0.85;outline:6px solid #F5E14B`;
      const wrap = document.createElement("div");
      wrap.style.cssText = `width:${ELEM_PX}px;height:${ELEM_PX}px;position:relative`;
      wrap.appendChild(img);
      const obj = new CSS3DObject(wrap);
      obj.scale.set(UP, UP, 1);
      anchor.group.add(obj);
    } else if (LITE) makeObj(scene.layers.map((L) => L.svg), 0);
    else scene.layers.forEach((L) => makeObj([L.svg], L.depth));
    holder.remove();

    anchor.onTargetFound = () => {
      const away = (performance.now() - clock.lostAt) / 1000;
      if (clock.lostAt && away > RESTART_AFTER) restart();
      clock.tracking = true;
      document.body.classList.add("tracking");
      status("trykket er FUNDET. Bevæg telefonen lidt, og se om siden holder.");
      if (soundOn && clock.t > CUES.rain) sfx.rain.play().catch(() => {});
    };
    anchor.onTargetLost = () => {
      clock.tracking = false;
      clock.lostAt = performance.now();
      document.body.classList.remove("tracking");
      status("trykket er tabt. Peg på det igen.");
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
  const vid = document.querySelector("#ar video");
  status(`genkendelsen kører (kamera ${vid ? vid.videoWidth + "×" + vid.videoHeight : "?"}). Peg på trykket.`);
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
  if (clock.tracking && objects.length) scene.update(t); // tegn kun, når trykket er i billedet
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
