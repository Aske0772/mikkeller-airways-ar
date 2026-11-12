// Hi-fi prototype: telefonen viser hele forløbet fra mærke til pas.
import { createScene, CUES } from "./scene.js";
import { boardingHTML, passportHTML, playStamp } from "./boarding.js";

const $ = (s) => document.querySelector(s);
const screen = $("#screen");
const STEPS = ["tag", "open", "camera", "boarding", "passport"];

await document.fonts.load("40px 'Bowlby One'").catch(() => {});

// ---------- skalering af telefonen ----------
function fit() {
  const s = Math.min(1, (innerHeight - 48) / 868, (innerWidth - 32) / 414);
  document.documentElement.style.setProperty("--s", Math.max(0.5, s).toFixed(3));
  const ms = Math.min(innerWidth / 390, innerHeight / 844);
  document.documentElement.style.setProperty("--ms", ms.toFixed(3));
}
addEventListener("resize", fit);
fit();

// ---------- QR-koder til live-AR ----------
const liveURL = new URL("./", location.href).href; // AR-kameraet ligger på sidens forside
$("#liveLink").href = liveURL;
if (window.QRCode) {
  new QRCode($("#liveQr"), { text: liveURL, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
  new QRCode($("#tagQr"), { text: liveURL, width: 240, height: 240, correctLevel: QRCode.CorrectLevel.M });
}

// ---------- lyd ----------
const sfx = {
  rain: new Audio("assets/audio/rain.mp3"),
  swish: new Audio("assets/audio/swish.wav"),
  stamp: new Audio("assets/audio/stamp.mp3"),
};
sfx.rain.loop = true;
let muted = false;
function play(name, vol = 1) {
  if (muted) return;
  const a = sfx[name];
  a.volume = vol;
  a.currentTime = 0;
  a.play().catch(() => {});
}
$("#mute").onclick = () => {
  muted = !muted;
  $("#muteWave").style.opacity = muted ? 0 : 1;
  if (muted) sfx.rain.pause();
  else if (ar.running && ar.t > CUES.rain) sfx.rain.play().catch(() => {});
};

// ---------- scenerne på t-shirten ----------
const printScene = createScene($("#printSlot"), { mode: "print" });
// I prototypen erstatter AR-laget trykket helt, så stoffet kan ses mellem stregerne.
const arScene = createScene($("#arSlot"), { mode: "ar", base: false });
const cam = $("#v-camera");
const world = $("#world");
const brackets = [...cam.querySelectorAll(".bracket")];

function placeBrackets(x0, y0, x1, y1) {
  const s = 30;
  const pos = [[x0, y0], [x1 - s, y0], [x0, y1 - s], [x1 - s, y1 - s]];
  brackets.forEach((b, i) => {
    b.style.left = pos[i][0] + "px";
    b.style.top = pos[i][1] + "px";
  });
}
const SCAN_RECT = [150, 118, 490, 418];
const PRINT_RECT = [179 - 12, 160 - 12, 460.6 + 12, 371.2 + 12];

const ar = { running: false, t: 0, t0: 0, cues: new Set() };
let camTimer = 0;

function resetCamera() {
  clearTimeout(camTimer);
  ar.running = false;
  ar.t = 0;
  ar.cues.clear();
  arScene.update(0);
  sfx.rain.pause();
  $("#arSlot").classList.remove("on");
  cam.classList.remove("locked", "ar-live");
  cam.classList.add("scanning");
  $("#chip").classList.remove("on");
  $("#sheet").classList.remove("on");
  $("#camHint").style.opacity = 1;
  $("#camHint").textContent = "Peg kameraet mod trykket";
  placeBrackets(...SCAN_RECT);
}

function lock() {
  cam.classList.remove("scanning");
  cam.classList.add("locked");
  placeBrackets(...PRINT_RECT);
  $("#chip").classList.add("on");
  $("#camHint").style.opacity = 0;
  camTimer = setTimeout(() => {
    $("#arSlot").classList.add("on");
    cam.classList.add("ar-live");
    ar.running = true;
    ar.t0 = performance.now();
    setTimeout(() => $("#chip").classList.remove("on"), 2200);
  }, 380);
}

function startCamera() {
  resetCamera();
  camTimer = setTimeout(lock, 1900);
}

// ---------- trin ----------
let tagTimers = [];
function setStep(name) {
  tagTimers.forEach(clearTimeout);
  tagTimers = [];
  screen.dataset.step = name;
  STEPS.forEach((s) => $("#v-" + s).classList.toggle("on", s === name));
  document.querySelectorAll("#steps button").forEach((b) => {
    if (b.dataset.go === name) b.setAttribute("aria-current", "step");
    else b.removeAttribute("aria-current");
  });
  if (name !== "camera") resetCamera();
  if (name === "tag") {
    const v = $("#v-tag");
    v.classList.remove("found");
    tagTimers.push(setTimeout(() => v.classList.add("found"), 1300));
  }
  if (name === "camera") startCamera();
  if (name === "boarding") {
    $("#v-boarding").innerHTML = boardingHTML();
    $("#v-boarding [data-action=stamp]").onclick = () => setStep("passport");
  }
  if (name === "passport") {
    const v = $("#v-passport");
    v.innerHTML = passportHTML();
    v.querySelector("[data-action=restart]").onclick = () => setStep("tag");
    requestAnimationFrame(() => playStamp(v, () => play("stamp", 0.9)));
  }
}
document.querySelectorAll("#steps button").forEach((b) => (b.onclick = () => setStep(b.dataset.go)));
$("#banner").onclick = () => setStep("open");
$("#startCam").onclick = () => setStep("camera");
$("#toBoarding").onclick = () => setStep("boarding");
$("#replay").onclick = () => startCamera();

// ---------- animation: hånd-sving, parallakse og AR-tid ----------
function frame(now) {
  const T = now / 1000;
  if (screen.dataset.step === "camera") {
    const sx = Math.sin(T * 0.62) * 7 + Math.sin(T * 1.7) * 1.6;
    const sy = Math.cos(T * 0.51) * 6 + Math.sin(T * 1.3) * 1.2;
    const rot = Math.sin(T * 0.37) * 0.9;
    world.style.transform = `translate(${sx.toFixed(2)}px, ${sy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg)`;

    if (ar.running) {
      ar.t = (now - ar.t0) / 1000;
      const t = ar.t;
      arScene.update(t);
      const d = arScene.depthAt(t);
      arScene.layers.forEach((L) => {
        const k = L.depth;
        const px = -sx * k * 0.012 * d;
        const py = -sy * k * 0.012 * d - k * 0.06 * d;
        L.svg.style.transform = `translate(${px.toFixed(2)}px, ${py.toFixed(2)}px) scale(${(1 + k * 0.0005 * d).toFixed(4)})`;
      });
      const cue = (key, at, fn) => {
        if (t >= at && !ar.cues.has(key)) {
          ar.cues.add(key);
          fn();
        }
      };
      cue("rain", CUES.rain, () => {
        if (muted) return;
        sfx.rain.volume = 0;
        sfx.rain.currentTime = 0;
        sfx.rain.play().catch(() => {});
      });
      cue("swish", CUES.planeSound, () => play("swish", 0.9));
      cue("end", CUES.end, () => $("#sheet").classList.add("on"));
      if (t > CUES.rain && !muted) sfx.rain.volume = Math.min(0.55, (t - CUES.rain) * 0.4);
    }
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// klokken i statuslinjen
const clock = $("#clock");
const tick = () => {
  const d = new Date();
  clock.textContent = d.getHours() + ":" + String(d.getMinutes()).padStart(2, "0");
};
tick();
setInterval(tick, 20000);

const start = location.hash.slice(1);
setStep(STEPS.includes(start) ? start : "tag");
window.__demo = { setStep, arScene, ar };
