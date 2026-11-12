// Mikkeller Airways – København "Afgang"
// Én tegning, to tilstande:
//   mode "print": det statiske t-shirttryk (sort streg på hvid, ingen AR-elementer)
//   mode "ar":    samme tegning, delt i dybdelag, som vågner op og animeres over trykket
// Alt er en ren funktion af tiden t (sekunder efter at trykket er fundet), så scenen kan
// pauses, genstartes og bruges ens i prototypen, i live-AR og i eksporten af trykfilen.

import {
  INK, WHITE, BRAND, PRINT, VIEW, FONT, clamp01, ease, easeOut, f, rng, smooth, hand, ellipsePts, mix, E,
  LINE, SHAPE, SOLID, ik, bezier, resetSeed, makeLayers, drawQR,
} from "./kit.js";
import { QR_ROWS } from "./qr-rows.js";
export { INK, WHITE, BRAND, PRINT, VIEW } from "./kit.js";
export { printSVGString } from "./kit.js";

// Dybde i "trykpixels" over stoffet, når lagene er foldet helt ud.
export const LAYERS = [
  { id: "back", depth: 0 },
  { id: "harbour", depth: 40 },
  { id: "street", depth: 70 },
  { id: "rider", depth: 110 },
  { id: "fx", depth: 170 },
];

export const CUES = {
  color: 0.5, // husene får farve
  depth: 0.8, // lagene folder sig ud
  rain: 1.2, // regnen starter
  ride: 1.8, // han træder i pedalerne
  signs: [3.2, 3.9, 4.6, 5.3, 6.0], // skiltet bladrer destinationer
  plane: 5.0, // flyet letter bag husene
  planeSound: 6.0,
  end: 10.2, // boardingkortet er klar
};
const DESTS = ["CPH", "TYO", "LON", "PAR", "BJS", "VERDEN"];

let instance = 0;

// ---------- scenen ----------
export function createScene(container, { mode = "ar", base = true } = {}) {
  const AR = mode === "ar";
  const uid = "kbh" + instance++;
  resetSeed(11); // samme rystelse i hver kopi, så AR-laget passer præcis på trykket

  const root = document.createElement("div");
  root.className = "kbh-scene";
  root.style.position = "relative";
  container.appendChild(root);

  const layers = makeLayers(root, LAYERS, "kbh");
  const anim = {}; // referencer til de dele der bevæger sig

  // ===== LAG: back (baggrund, sky, fly, huse) =====
  {
    const g = layers.back.g;
    const defs = layers.back.defs;
    if (AR) {
      // Hvid flade dækker det trykte motiv, så det kun er AR-versionen man ser (live-AR).
      if (base) E("rect", { x: 0, y: 0, width: PRINT.w, height: PRINT.h, fill: WHITE }, g);

      // Den store regnsky, der vokser ud over t-shirtens kant.
      const over = E("g", { opacity: 0 }, g);
      const overPts = [
        [-380, 40], [-390, -120], [-300, -260], [-150, -300], [-60, -420], [120, -470], [260, -400],
        [420, -520], [640, -540], [820, -430], [1000, -500], [1200, -470], [1340, -360], [1520, -380],
        [1700, -280], [1900, -220], [1980, -60], [1960, 60], [1700, 90], [1300, 70], [800, 110], [300, 80],
      ];
      const overPath = E("path", { d: hand(overPts, { step: 0, amt: 4 }), ...SHAPE, fill: "#C9C3B8" }, over);
      anim.overCloud = { g: over, path: overPath };
    }

    // Skyen i trykket.
    const cloudPts = [
      [170, 205], [148, 160], [190, 118], [252, 112], [282, 68], [362, 48], [432, 74], [486, 40], [572, 34],
      [640, 68], [702, 58], [770, 86], [806, 130], [852, 150], [864, 190], [822, 212], [600, 218], [400, 214],
    ];
    const cloud = E("path", { d: hand(cloudPts, { step: 0, amt: 3 }), ...SHAPE }, g);
    E("path", { d: hand([[300, 150], [360, 128], [420, 138]], { closed: false, step: 0, amt: 1 }), ...LINE, "stroke-width": 6 }, g);
    E("path", { d: hand([[590, 120], [650, 104], [700, 116]], { closed: false, step: 0, amt: 1 }), ...LINE, "stroke-width": 6 }, g);
    anim.cloud = cloud;

    // Trykkets faste regnstreger (forsvinder når den rigtige regn starter).
    const dashes = E("g", {}, g);
    const r = rng(77);
    let placed = 0;
    let guard = 0;
    while (placed < 34 && guard++ < 500) {
      const x = 60 + r() * 1480;
      const y = 230 + r() * 600;
      const inRider = x > 420 && x < 770 && y > 280 && y < 760;
      const inCargo = x > 770 && x < 1140 && y > 500 && y < 760;
      const inSign = x > 1300 && x < 1570 && y > 440 && y < 630;
      if (inRider || inCargo || inSign) continue;
      E("path", { d: `M${f(x)},${f(y)} l-12,36`, ...LINE, "stroke-width": 7 }, dashes);
      placed++;
    }
    anim.dashes = dashes;

    // Flyet (kun AR) – letter bag husene.
    if (AR) {
      // flyet klippes ved husenes fod, så det kun ses over tagene
      const pclip = E("clipPath", { id: `${uid}-sky` }, defs);
      E("rect", { x: -1200, y: -2400, width: 4800, height: 2400 + 858 }, pclip);
      const planeWrap = E("g", { "clip-path": `url(#${uid}-sky)` }, g);
      const plane = E("g", { opacity: 0 }, planeWrap);
      const banner = E("g", {}, plane);
      const rope = E("path", { ...LINE, "stroke-width": 4 }, banner);
      const flagPath = E("path", { ...SHAPE, "stroke-width": 7 }, banner);
      const flagText = E("text", {
        x: -470, y: 36, "font-family": FONT, "font-size": 40, fill: INK, "text-anchor": "middle", "letter-spacing": 2,
      }, banner);
      flagText.textContent = "MIKKELLER AIRWAYS";
      E("path", { d: hand([[-10, -18], [-46, -66], [-18, -66], [34, -20]], { step: 0, amt: 1 }), ...SHAPE }, plane);
      E("path", { d: hand([[-150, -2], [-118, -30], [60, -32], [130, -20], [164, 0], [132, 18], [-118, 24]], { step: 0, amt: 1.5 }), ...SHAPE }, plane);
      E("path", { d: hand([[-146, -6], [-176, -84], [-136, -82], [-96, -26]], { step: 0, amt: 1 }), ...SOLID }, plane);
      const m = E("text", { x: -146, y: -38, "font-family": FONT, "font-size": 30, fill: WHITE, "text-anchor": "middle", transform: "rotate(14 -146 -38)" }, plane);
      m.textContent = "M";
      E("path", { d: hand([[-24, 6], [-74, 74], [-38, 76], [42, 10]], { step: 0, amt: 1 }), ...SHAPE }, plane);
      for (let i = 0; i < 6; i++) E("circle", { cx: -84 + i * 26, cy: -8, r: 6.5, fill: INK }, plane);
      E("path", { d: hand([[104, -20], [136, -12], [122, -4], [100, -8]], { step: 0, amt: 0.5 }), fill: INK }, plane);
      anim.plane = { g: plane, rope, flagPath, flagText };
    }

    // Nyhavn-husene.
    const houses = [
      { x: 80, w: 170, top: 500, type: "step", color: BRAND.red },
      { x: 250, w: 180, top: 448, type: "point", color: BRAND.yellow },
      { x: 430, w: 160, top: 520, type: "curve", color: BRAND.blue },
      { x: 590, w: 180, top: 430, type: "flat", color: BRAND.peach },
      { x: 770, w: 160, top: 484, type: "point", color: BRAND.beer },
      { x: 930, w: 180, top: 410, type: "step", color: BRAND.moss },
      { x: 1110, w: 180, top: 470, type: "curve", color: BRAND.red },
      { x: 1290, w: 230, top: 520, type: "point", color: BRAND.yellow },
    ];
    const BASE = 862;
    anim.houses = [];
    const hr = rng(5);
    houses.forEach((h, i) => {
      const { x, w, top } = h;
      let gable;
      if (h.type === "point") gable = [[x, top], [x + w / 2, top - 120], [x + w, top]];
      else if (h.type === "step") {
        const s = w / 7;
        gable = [
          [x, top], [x + s, top], [x + s, top - 36], [x + 2 * s, top - 36], [x + 2 * s, top - 72], [x + 3 * s, top - 72],
          [x + 3 * s, top - 108], [x + 4 * s, top - 108], [x + 4 * s, top - 72], [x + 5 * s, top - 72], [x + 5 * s, top - 36],
          [x + 6 * s, top - 36], [x + 6 * s, top], [x + w, top],
        ];
      } else if (h.type === "curve") {
        gable = [
          [x, top], [x + w * 0.14, top - 8], [x + w * 0.22, top - 58], [x + w * 0.36, top - 74], [x + w * 0.38, top - 116],
          [x + w * 0.62, top - 116], [x + w * 0.64, top - 74], [x + w * 0.78, top - 58], [x + w * 0.86, top - 8], [x + w, top],
        ];
      } else gable = [[x - 8, top + 4], [x - 8, top - 22], [x + w + 8, top - 22], [x + w + 8, top + 4]];
      const facade = [[x, BASE], ...gable, [x + w, BASE]];
      const d = hand(facade, { step: 70, amt: 1.1, seed: 300 + i });
      E("path", { d, fill: WHITE }, g);
      let colorRect = null;
      if (AR) {
        const clip = E("clipPath", { id: `${uid}-house${i}` }, defs);
        colorRect = E("rect", { x: x - 20, y: BASE, width: w + 40, height: 0 }, clip);
        E("path", { d, fill: h.color, "clip-path": `url(#${uid}-house${i})` }, g);
      }
      // vinduer
      const cols = w >= 200 ? 3 : 2;
      const cw = w / cols;
      for (let yy = top + 50, row = 0; yy + 50 < BASE - 130 && row < 3; yy += 96, row++) {
        for (let c = 0; c < cols; c++) {
          const wx = x + c * cw + cw / 2 - 17;
          const dark = hr() < 0.16;
          E("path", {
            d: hand([[wx, yy], [wx + 34, yy], [wx + 34, yy + 50], [wx, yy + 50]], { step: 20, amt: 0.7 }),
            ...SHAPE, "stroke-width": 7, fill: dark ? INK : WHITE,
          }, g);
          if (!dark) E("path", { d: `M${f(wx + 17)},${f(yy + 4)} V${f(yy + 46)}`, ...LINE, "stroke-width": 4 }, g);
        }
      }
      // dør og butiksvindue i stueetagen
      const doorX = x + (i % 2 ? w * 0.22 : w * 0.58);
      E("path", {
        d: hand([[doorX, BASE], [doorX, BASE - 78], [doorX + 22, BASE - 98], [doorX + 44, BASE - 78], [doorX + 44, BASE]], { closed: false, step: 14, amt: 1 }),
        ...SHAPE, "stroke-width": 7,
      }, g);
      if (h.type !== "flat") {
        const gx = x + w / 2;
        const gy = top - (h.type === "point" ? 46 : 50);
        E("path", { d: hand(ellipsePts(gx, gy, 15, 15, 8), { step: 0, amt: 0.8 }), ...SHAPE, "stroke-width": 6 }, g);
      } else {
        E("path", { d: hand([[x + 120, top - 22], [x + 120, top - 70], [x + 150, top - 70], [x + 150, top - 22]], { closed: false, step: 12, amt: 1 }), ...SHAPE, "stroke-width": 7 }, g);
      }
      E("path", { d, ...LINE, "stroke-width": 8 }, g);
      anim.houses.push({ rect: colorRect, top: top - 130, base: BASE });
    });
  }

  // ===== LAG: harbour (kanal, både, master, Dannebrog) =====
  {
    const g = layers.harbour.g;
    // vand
    E("path", { d: hand([[60, 880], [340, 876], [700, 882], [1000, 877], [1540, 881]], { closed: false, step: 60, amt: 2 }), ...LINE, "stroke-width": 6 }, g);
    E("path", { d: hand([[120, 895], [480, 892], [900, 897], [1480, 893]], { closed: false, step: 60, amt: 2 }), ...LINE, "stroke-width": 5 }, g);

    const boats = [
      { hull: [[110, 856], [500, 856], [468, 900], [150, 900]], cabin: [[196, 856], [196, 822], [292, 822], [292, 856]], mast: 330, mastTop: 236 },
      { hull: [[1010, 858], [1316, 858], [1292, 900], [1036, 900]], cabin: [[1060, 858], [1060, 830], [1130, 830], [1130, 858]], mast: 1182, mastTop: 300 },
    ];
    anim.flags = [];
    boats.forEach((b, i) => {
      E("path", { d: hand([[b.mast, b.mastTop + 10], [b.hull[0][0] + 14, b.hull[0][1]]], { closed: false, step: 80, amt: 1 }), ...LINE, "stroke-width": 4 }, g);
      E("path", { d: hand([[b.mast, b.mastTop + 10], [b.hull[1][0] - 12, b.hull[1][1]]], { closed: false, step: 80, amt: 1 }), ...LINE, "stroke-width": 4 }, g);
      E("path", { d: hand([[b.mast, b.hull[0][1]], [b.mast, b.mastTop]], { closed: false, step: 60, amt: 1.2 }), ...LINE, "stroke-width": 10 }, g);
      E("path", { d: hand([[b.mast - 70, b.mastTop + 90], [b.mast + 60, b.mastTop + 84]], { closed: false, step: 40, amt: 1 }), ...LINE, "stroke-width": 7 }, g);
      E("path", { d: hand(b.cabin, { closed: false, step: 20, amt: 1 }), ...SHAPE, "stroke-width": 7 }, g);
      E("path", { d: hand(b.hull, { step: 60, amt: 1.1 }), ...SHAPE }, g);
      E("circle", { cx: b.hull[0][0] + 80, cy: 876, r: 8, ...SHAPE, "stroke-width": 5 }, g);
      E("circle", { cx: b.hull[0][0] + 120, cy: 876, r: 8, ...SHAPE, "stroke-width": 5 }, g);
      if (i === 0) {
        // Dannebrog: sort med hvidt kors i trykket, rød i AR
        const field = E("path", { ...SOLID, "stroke-width": 6 }, g);
        const crossV = E("path", { fill: "none", stroke: WHITE, "stroke-width": 9, "stroke-linecap": "butt" }, g);
        const crossH = E("path", { fill: "none", stroke: WHITE, "stroke-width": 9, "stroke-linecap": "butt" }, g);
        anim.flags.push({ field, crossV, crossH, x: b.mast, y: b.mastTop + 2 });
      }
    });
    // kajkant og pullert
    E("path", { d: hand([[40, 908], [1560, 908]], { closed: false, step: 70, amt: 1.5 }), ...LINE }, g);
    for (let x = 120; x < 1560; x += 150) E("path", { d: `M${x},${912} v10`, ...LINE, "stroke-width": 5 }, g);
    E("path", { d: hand([[196, 908], [198, 872], [234, 872], [236, 908]], { closed: false, step: 12, amt: 0.8 }), ...SOLID }, g);
    E("path", { d: hand(ellipsePts(216, 868, 26, 9, 10), { step: 0, amt: 0.6 }), ...SOLID }, g);
  }

  // ===== LAG: street (brosten, vandpytter, lufthavnsskilt, tekst) =====
  {
    const g = layers.street.g;
    const cobbles = E("g", {}, g);
    const cr = rng(19);
    for (let row = 0; row < 2; row++) {
      for (let x = -150; x < 1750; x += 92) {
        const cx = x + (row ? 46 : 0) + (cr() - 0.5) * 10;
        const cy = 936 + row * 28;
        E("path", { d: hand([[cx, cy], [cx + 36, cy - 1], [cx + 37, cy + 11], [cx + 1, cy + 12]], { step: 12, amt: 1 }), ...LINE, "stroke-width": 5 }, cobbles);
      }
    }
    // klip brostenene til trykket, så de ikke kravler ud over t-shirten
    const clip = E("clipPath", { id: `${uid}-street` }, layers.street.defs);
    E("rect", { x: 30, y: 900, width: 1540, height: 100 }, clip);
    const cobbleWrap = E("g", { "clip-path": `url(#${uid}-street)` }, g);
    cobbleWrap.appendChild(cobbles);
    anim.cobbles = cobbles;

    E("path", { d: hand([[30, 990], [1570, 990]], { closed: false, step: 60, amt: 1.6 }), ...LINE }, g);
    anim.puddles = [];
    [[300, 970, 86, 11], [1250, 974, 104, 13]].forEach(([cx, cy, rx, ry], i) => {
      E("path", { d: hand(ellipsePts(cx, cy, rx, ry, 16), { step: 0, amt: 1.2 }), ...SHAPE, "stroke-width": 7 }, g);
      E("path", { d: `M${cx - rx * 0.5},${cy} h${rx * 0.4}`, ...LINE, "stroke-width": 4 }, g);
      if (AR) {
        const rings = [0, 1, 2].map(() => E("ellipse", { cx, cy, rx: 1, ry: 1, fill: "none", stroke: INK, "stroke-width": 4, opacity: 0 }, g));
        anim.puddles.push({ cx, cy, rx, ry, rings, phase: i * 0.37 });
      }
    });

    // Lufthavnsskiltet
    E("path", { d: hand([[1435, 610], [1435, 988]], { closed: false, step: 60, amt: 1 }), ...LINE, "stroke-width": 16 }, g);
    E("path", { d: hand([[1318, 456], [1552, 456], [1552, 612], [1318, 612]], { step: 60, amt: 1.1 }), ...SHAPE }, g);
    const icon = E("g", { transform: "translate(1350 497) rotate(-20) scale(0.52)" }, g);
    E("path", { d: "M-40,0 C-40,-9 -30,-11 -20,-11 L30,-11 C44,-11 52,-5 52,0 C52,5 44,11 30,11 L-20,11 C-30,11 -40,9 -40,0Z", fill: INK }, icon);
    E("path", { d: "M2,-8 L-18,-44 L-4,-44 L26,-8Z M2,8 L-18,44 L-4,44 L26,8Z M-34,-4 L-46,-26 L-36,-26 L-22,-4Z", fill: INK }, icon);
    const lbl = E("text", { x: 1462, y: 512, "font-family": FONT, "font-size": 29, fill: INK, "letter-spacing": 0.5, "text-anchor": "middle" }, g);
    lbl.textContent = "LUFTHAVN";
    E("path", { d: hand([[1338, 530], [1532, 530], [1532, 596], [1338, 596]], { step: 24, amt: 1 }), ...SOLID, "stroke-width": 4 }, g);
    const flap = E("g", {}, g);
    const flapText = E("text", { x: 1435, y: 582, "font-family": FONT, "font-size": 46, fill: WHITE, "text-anchor": "middle", "letter-spacing": 4 }, flap);
    flapText.textContent = DESTS[0];
    E("path", { d: "M1342,563 H1528", stroke: INK, "stroke-width": 3 }, g);
    anim.flap = { g: flap, text: flapText, cx: 1435, cy: 563 };

    // Tekst under motivet
    const city = E("text", { x: 800, y: 1116, "font-family": FONT, "font-size": 132, fill: INK, "text-anchor": "middle", "letter-spacing": 6, rotate: "-3 2 -2 3 -1 2 -3 1 2" }, g);
    city.textContent = "KØBENHAVN";
    const sub = E("text", { x: 800, y: 1176, "font-family": FONT, "font-size": 36, fill: INK, "text-anchor": "middle", "letter-spacing": 7 }, g);
    sub.textContent = "MIKKELLER AIRWAYS · AFGANG CPH";
  }

  // ===== LAG: rider (ladcykel, kuffert, øl og manden i regntøj) =====
  {
    const g = layers.rider.g;
    const defs = layers.rider.defs;
    const body = E("g", {}, g); // hopper en smule når han træder
    anim.body = body;

    const REAR = [470, 913];
    const FRONT = [985, 913];
    const FRONT2 = [1032, 905];
    const CRANK = [612, 902];
    const HIP = [566, 706];

    function wheel(c, R, parent) {
      const wg = E("g", {}, parent);
      E("circle", { cx: c[0], cy: c[1], r: R, fill: WHITE, stroke: INK, "stroke-width": 18 }, wg);
      E("circle", { cx: c[0], cy: c[1], r: R - 16, fill: "none", stroke: INK, "stroke-width": 4 }, wg);
      const spokes = E("g", {}, wg);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI;
        E("path", { d: `M${f(c[0] - Math.cos(a) * (R - 16))},${f(c[1] - Math.sin(a) * (R - 16))} L${f(c[0] + Math.cos(a) * (R - 16))},${f(c[1] + Math.sin(a) * (R - 16))}`, stroke: INK, "stroke-width": 4 }, spokes);
      }
      E("circle", { cx: c[0], cy: c[1], r: 10, fill: INK }, wg);
      return { spokes, c };
    }

    anim.wheels = [wheel(FRONT2, 68, body)];
    // bagerste ben (bag stellet)
    const legFar = E("path", { ...LINE, "stroke-width": 46 }, body);
    const shoeFar = E("path", { fill: INK }, body);
    const crankFar = E("path", { ...LINE, "stroke-width": 10 }, body);
    anim.wheels.push(wheel(REAR, 72, body));
    anim.wheels.push(wheel(FRONT, 72, body));

    // stel
    const frame = [
      [REAR, CRANK], [CRANK, [556, 724]], [REAR, [560, 748]], [CRANK, [748, 872]], [[560, 760], [744, 770]],
    ];
    frame.forEach(([a, b]) => E("path", { d: `M${a[0]},${a[1]} L${b[0]},${b[1]}`, ...LINE, "stroke-width": 13 }, body));
    E("circle", { cx: CRANK[0], cy: CRANK[1], r: 22, ...SHAPE, "stroke-width": 7 }, body);
    E("path", { d: hand(ellipsePts(548, 714, 40, 11, 10, -0.08), { step: 0, amt: 0.6 }), ...SOLID }, body);

    // last: kuffert og en kasse Mikkeller
    for (let i = 0; i < 4; i++) {
      const bx = 994 + i * 28;
      E("path", { d: hand([[bx, 640], [bx, 590], [bx + 6, 572], [bx + 6, 542], [bx + 14, 542], [bx + 14, 572], [bx + 20, 590], [bx + 20, 640]], { step: 0, amt: 0.4 }), fill: INK }, body);
    }
    E("path", { d: hand([[972, 612], [1108, 610], [1108, 700], [972, 700]], { step: 20, amt: 1 }), ...SHAPE }, body);
    E("path", { d: hand([[1012, 632], [1068, 632], [1068, 646], [1012, 646]], { step: 10, amt: 0.6 }), ...SOLID, "stroke-width": 4 }, body);
    E("path", { d: hand([[852, 562], [850, 532], [902, 530], [902, 562]], { closed: false, step: 10, amt: 0.8 }), ...LINE, "stroke-width": 10 }, body);
    E("path", { d: hand([[796, 562], [956, 560], [958, 706], [798, 708]], { step: 50, amt: 1 }), ...SHAPE }, body);
    E("path", { d: "M840,572 V700 M914,572 V700", ...LINE, "stroke-width": 6 }, body);
    // bagagemærke
    const tag = E("g", { transform: "rotate(10 904 536)" }, body);
    E("path", { d: "M904,536 Q916,560 916,574", ...LINE, "stroke-width": 4 }, tag);
    E("path", { d: hand([[886, 574], [952, 574], [952, 612], [886, 612]], { step: 12, amt: 0.6 }), ...SHAPE, "stroke-width": 6 }, tag);
    const tagT = E("text", { x: 919, y: 604, "font-family": FONT, "font-size": 26, fill: INK, "text-anchor": "middle" }, tag);
    tagT.textContent = "CPH";

    // ladkassen
    const boxPts = [[738, 698], [1126, 686], [1090, 880], [752, 880]];
    E("path", { d: hand(boxPts, { step: 60, amt: 1.1 }), ...SHAPE }, body);
    // plankerne stopper omkring QR-mærket, så koden har hvid luft rundt om sig
    E("path", { d: hand([[748, 760], [834, 758]], { closed: false, step: 40, amt: 0.8 }), ...LINE, "stroke-width": 6 }, body);
    E("path", { d: hand([[1018, 755], [1112, 752]], { closed: false, step: 40, amt: 0.8 }), ...LINE, "stroke-width": 6 }, body);
    E("path", { d: hand([[752, 822], [834, 821]], { closed: false, step: 40, amt: 0.8 }), ...LINE, "stroke-width": 6 }, body);
    E("path", { d: hand([[1018, 818], [1100, 816]], { closed: false, step: 40, amt: 0.8 }), ...LINE, "stroke-width": 6 }, body);
    // QR-koden er malet på ladkassen som et mærkat. iPhone- og Android-kameraet kan kun
    // genkende QR-koder, så det er den, der giver link-pop-op'et; AR'en genkender hele tegningen.
    // Den tegnes uden håndrystelse, så den altid kan scannes.
    drawQR(body, QR_ROWS, 926, 787, 160);
    E("path", { d: hand([[738, 698], [1126, 686]], { closed: false, step: 50, amt: 1 }), ...LINE, "stroke-width": 14 }, body);
    // styr
    E("path", { d: hand([[744, 716], [704, 644], [664, 638]], { closed: false, step: 0, amt: 0.6 }), ...LINE, "stroke-width": 12 }, body);

    // forreste ben (foran stellet)
    const crankNear = E("path", { ...LINE, "stroke-width": 10 }, body);
    const legNear = E("path", { ...LINE, "stroke-width": 48 }, body);
    const shoeNear = E("path", { fill: INK }, body);
    anim.legs = { legFar, shoeFar, crankFar, legNear, shoeNear, crankNear, HIP, CRANK };

    // regnfrakke med Mikkeller-bønner
    const coatPts = [[498, 738], [490, 640], [504, 568], [540, 522], [586, 504], [630, 512], [656, 546], [670, 612], [664, 692], [642, 738]];
    const coatD = hand(coatPts, { step: 26, amt: 1.6 });
    E("path", { d: coatD, ...SHAPE }, body);
    const coatClip = E("clipPath", { id: `${uid}-coat` }, defs);
    E("path", { d: coatD }, coatClip);
    const beans = E("g", { "clip-path": `url(#${uid}-coat)` }, body);
    [[522, 604, 18, 11, 0.9], [566, 560, 16, 10, -0.3], [612, 596, 17, 11, 0.4], [640, 660, 15, 10, 1.2], [548, 668, 18, 11, -0.6], [600, 712, 17, 10, 0.2], [506, 702, 14, 9, 0.7], [630, 540, 12, 8, -0.8]].forEach(([x, y, rx, ry, rot], i) =>
      E("path", { d: hand(ellipsePts(x, y, rx, ry, 10, rot, 0.3, 40 + i), { step: 0, amt: 0.8 }), fill: INK }, beans)
    );
    E("path", { d: coatD, ...LINE }, body);
    // ærme og hånd på styret
    E("path", { d: "M598,548 Q630,580 662,630", fill: "none", stroke: INK, "stroke-width": 58, "stroke-linecap": "round" }, body);
    E("path", { d: "M598,548 Q630,580 662,630", fill: "none", stroke: WHITE, "stroke-width": 40, "stroke-linecap": "round" }, body);
    E("path", { d: hand([[650, 622], [676, 616], [690, 630], [684, 648], [660, 652], [646, 640]], { step: 0, amt: 0.6 }), ...SHAPE, "stroke-width": 7 }, body);
    E("path", { d: "M664,628 q12,6 18,14 M660,640 q10,4 14,10", ...LINE, "stroke-width": 4 }, body);
    // krave
    E("path", { d: hand([[574, 512], [586, 476], [632, 480], [638, 514]], { closed: false, step: 0, amt: 0.6 }), ...SHAPE }, body);

    // hovedet
    const headPts = [
      [568, 494], [552, 430], [556, 372], [638, 362], [654, 398], [660, 432], [700, 440], [728, 452], [734, 470],
      [720, 484], [690, 482], [662, 480], [656, 500], [612, 506],
    ];
    E("path", { d: hand(headPts, { step: 0, amt: 0.8 }), ...SHAPE }, body);
    E("path", { d: "M672,494 q10,2 20,0", ...LINE, "stroke-width": 6 }, body);
    // øjet: halvt lukket låg = tør, dansk minimine
    const EYE = { cx: 622, cy: 420, rx: 25, ry: 20 };
    const eyeClip = E("clipPath", { id: `${uid}-eye` }, defs);
    E("ellipse", { cx: EYE.cx, cy: EYE.cy, rx: EYE.rx, ry: EYE.ry, transform: `rotate(-10 ${EYE.cx} ${EYE.cy})` }, eyeClip);
    E("ellipse", { cx: EYE.cx, cy: EYE.cy, rx: EYE.rx, ry: EYE.ry, fill: WHITE, transform: `rotate(-10 ${EYE.cx} ${EYE.cy})` }, body);
    const eyeIn = E("g", { "clip-path": `url(#${uid}-eye)` }, body);
    const pupil = E("circle", { cx: EYE.cx + 9, cy: EYE.cy + 2, r: 9.5, fill: INK }, eyeIn);
    const lid = E("rect", { x: EYE.cx - 40, y: EYE.cy - 40, width: 80, height: 10, fill: INK }, eyeIn);
    E("ellipse", { cx: EYE.cx, cy: EYE.cy, rx: EYE.rx, ry: EYE.ry, ...LINE, "stroke-width": 7, transform: `rotate(-10 ${EYE.cx} ${EYE.cy})` }, body);
    anim.eye = { pupil, lid, ...EYE };

    // sydvest (regnhat)
    const hatPts = [
      [520, 452], [524, 400], [546, 366], [560, 322], [600, 300], [646, 316], [662, 354], [694, 368], [706, 380],
      [690, 392], [650, 388], [600, 382], [566, 390], [550, 420], [538, 456],
    ];
    E("path", { d: hand(hatPts, { step: 0, amt: 1 }), ...SOLID }, body);
    // dråben på næsen (kun AR)
    if (AR) anim.drip = E("path", { d: "M0,-14 C5,-6 9,0 9,5 C9,11 4,14 0,14 C-4,14 -9,11 -9,5 C-9,0 -5,-6 0,-14Z", ...SHAPE, "stroke-width": 4, opacity: 0 }, body);
  }

  // ===== LAG: fx (regn og plask, kun AR) =====
  if (AR) {
    const g = layers.fx.g;
    const r = rng(101);
    anim.drops = [];
    for (let i = 0; i < 110; i++) {
      const line = E("path", { ...LINE, "stroke-width": 7, opacity: 0 }, g);
      const splash = E("path", { ...LINE, "stroke-width": 4, opacity: 0 }, g);
      anim.drops.push({ line, splash, x0: -250 + r() * 2150, speed: 1500 + r() * 600, phase: r() * 10, len: 30 + r() * 24 });
    }
  }

  // ---------- opdatering ----------
  function pose(t) {
    const L = anim.legs;
    const tau = Math.max(0, t - CUES.ride);
    const omega = Math.PI * 2 * 1.05;
    const crank = 0.7 + (AR ? omega * (tau - 0.7 * (1 - Math.exp(-tau / 0.7))) : 0);
    const wheelAng = (crank - 0.7) * 2.4;

    const pedal = (a) => [L.CRANK[0] + Math.cos(a) * 40, L.CRANK[1] + Math.sin(a) * 40];
    const draw = (a, leg, shoe, arm) => {
      const p = pedal(a);
      const foot = [p[0] + 8, p[1] - 8];
      const knee = ik(L.HIP, foot, 120, 128);
      leg.setAttribute("d", `M${f(L.HIP[0])},${f(L.HIP[1])} L${f(knee[0])},${f(knee[1])} L${f(foot[0])},${f(foot[1])}`);
      shoe.setAttribute("d", hand(ellipsePts(foot[0] + 16, foot[1] + 6, 30, 13, 10, 0.08), { step: 0, amt: 0, seed: 9 }));
      arm.setAttribute("d", `M${L.CRANK[0]},${L.CRANK[1]} L${f(p[0])},${f(p[1])}`);
    };
    draw(crank + Math.PI, L.legFar, L.shoeFar, L.crankFar);
    draw(crank, L.legNear, L.shoeNear, L.crankNear);
    anim.wheels.forEach((w) => w.spokes.setAttribute("transform", `rotate(${f((wheelAng * 180) / Math.PI)} ${w.c[0]} ${w.c[1]})`));
    const rideAmt = AR ? ease((t - CUES.ride) / 1.2) : 0;
    anim.body.setAttribute("transform", `translate(0 ${f(Math.sin(crank * 2) * 3 * rideAmt)})`);
    const dist = wheelAng * 72;
    anim.cobbles.setAttribute("transform", `translate(${f(-(dist % 92))} 0)`);
    return { crank };
  }

  function update(t) {
    pose(t);

    // husene får farve nedefra
    if (AR) {
      anim.houses.forEach((h, i) => {
        const p = easeOut((t - CUES.color - i * 0.11) / 0.7);
        const hgt = (h.base - h.top) * p;
        h.rect.setAttribute("y", f(h.base - hgt));
        h.rect.setAttribute("height", f(hgt + 2));
      });
    }

    // flaget vajer
    anim.flags.forEach((fl) => {
      const w = 80;
      const hh = 56;
      const wave = AR ? ease((t - 0.6) / 0.8) : 0;
      const pt = (u, v) => {
        const yy = fl.y + v * hh + Math.sin(u * 4.2 - t * 7) * 7 * u * wave;
        return [fl.x - u * w, yy];
      };
      const top = [];
      const bot = [];
      for (let k = 0; k <= 6; k++) {
        top.push(pt(k / 6, 0));
        bot.push(pt(1 - k / 6, 1));
      }
      fl.field.setAttribute("d", smooth([...top, ...bot], true));
      fl.field.setAttribute("fill", AR ? mix(INK, BRAND.red, ease((t - 0.6) / 0.6)) : INK);
      const cu = 0.34;
      const a = pt(cu, 0);
      const b = pt(cu, 0.5);
      const c = pt(cu, 1);
      fl.crossV.setAttribute("d", `M${f(a[0])},${f(a[1] + 3)} Q${f(b[0])},${f(b[1])} ${f(c[0])},${f(c[1] - 3)}`);
      const hp = [];
      for (let k = 0; k <= 6; k++) hp.push(pt(0.02 + (k / 6) * 0.95, 0.5));
      fl.crossH.setAttribute("d", smooth(hp, false));
    });

    // trykkets regnstreger viger for den rigtige regn
    anim.dashes.setAttribute("opacity", AR ? f(1 - ease((t - CUES.rain) / 0.5)) : 1);

    // øjet: tørt halvt låg, blink, kigger efter flyet
    {
      const e = anim.eye;
      let lid = 0.36;
      for (const b of [2.6, 9.9, 13.5]) {
        const u = (t - b) / 0.16;
        if (AR && u > 0 && u < 1) lid = 0.36 + (1 - Math.abs(u * 2 - 1)) * 0.64;
      }
      e.lid.setAttribute("height", f(e.ry * 2 * lid + 20));
      e.lid.setAttribute("y", f(e.cy - e.ry - 20));
      const look = AR ? ease((t - 6.3) / 0.4) * (1 - ease((t - 9.4) / 0.5)) : 0;
      e.pupil.setAttribute("cx", f(e.cx + 9 + look * 4));
      e.pupil.setAttribute("cy", f(e.cy + 2 - look * 9));
    }

    // skiltet bladrer
    {
      let idx = 0;
      let sy = 1;
      CUES.signs.forEach((c, k) => {
        if (!AR) return;
        if (t >= c + 0.24) idx = k + 1;
        else if (t >= c) {
          const u = (t - c) / 0.24;
          idx = u < 0.5 ? k : k + 1;
          sy = Math.max(0.02, Math.abs(1 - 2 * u));
        }
      });
      anim.flap.text.textContent = DESTS[idx];
      anim.flap.text.setAttribute("font-size", DESTS[idx].length > 3 ? 36 : 46);
      anim.flap.text.setAttribute("letter-spacing", DESTS[idx].length > 3 ? 2 : 4);
      anim.flap.text.setAttribute("y", DESTS[idx].length > 3 ? 577 : 582);
      anim.flap.g.setAttribute("transform", `translate(0 ${anim.flap.cy}) scale(1 ${f(sy * 100) / 100}) translate(0 ${-anim.flap.cy})`);
    }

    if (!AR) return;

    // skyen bliver grå og vokser ud over kanten
    {
      const u = ease((t - CUES.rain) / 1.1);
      anim.overCloud.g.setAttribute("opacity", f(u));
      anim.overCloud.g.setAttribute("transform", `translate(0 ${f((1 - u) * -60)})`);
      anim.cloud.setAttribute("fill", mix(WHITE, "#DCD6CB", u));
    }

    // regn
    {
      const amt = ease((t - CUES.rain) / 1.0);
      const n = Math.round(anim.drops.length * amt);
      const GROUND = 990;
      anim.drops.forEach((d, i) => {
        if (i >= n) {
          d.line.setAttribute("opacity", 0);
          d.splash.setAttribute("opacity", 0);
          return;
        }
        const span = GROUND + 650;
        const per = span / d.speed;
        const local = (t + d.phase) % per;
        const y = -650 + local * d.speed;
        const x = d.x0 - 0.34 * (y + 650);
        d.line.setAttribute("d", `M${f(x)},${f(y)} l${f(-0.34 * d.len)},${f(d.len)}`);
        d.line.setAttribute("opacity", y < GROUND - d.len ? 1 : 0);
        const sx = d.x0 - 0.34 * span;
        const onPrint = sx > 40 && sx < 1560;
        if (local < 0.22 && onPrint) {
          const u = local / 0.22;
          const r = 6 + u * 22;
          d.splash.setAttribute("d", `M${f(sx - r)},${GROUND - 2} q${f(r * 0.4)},${f(-r * 0.8)} ${f(r)},${f(-r * 0.8)} M${f(sx + r)},${GROUND - 2} q${f(-r * 0.4)},${f(-r * 0.8)} ${f(-r)},${f(-r * 0.8)}`);
          d.splash.setAttribute("opacity", f(1 - u));
        } else d.splash.setAttribute("opacity", 0);
      });
      anim.puddles.forEach((p) => {
        p.rings.forEach((ring, k) => {
          const u = ((t * 0.9 + p.phase + k / 3) % 1 + 1) % 1;
          ring.setAttribute("rx", f(p.rx * 0.15 + u * p.rx * 0.75));
          ring.setAttribute("ry", f(p.ry * 0.2 + u * p.ry * 0.7));
          ring.setAttribute("opacity", f((1 - u) * amt));
        });
      });
    }

    // dråben på næsen
    {
      const on = t > 2.2;
      const u = on ? ((t - 2.2) % 2.6) / 2.6 : 0;
      let s = 0;
      let dy = 0;
      let op = 0;
      if (on) {
        if (u < 0.55) {
          s = 0.3 + (u / 0.55) * 0.7;
          op = 1;
        } else if (u < 0.85) {
          const v = (u - 0.55) / 0.3;
          s = 1;
          dy = v * v * 120;
          op = 1 - v;
        }
      }
      anim.drip.setAttribute("opacity", f(op));
      anim.drip.setAttribute("transform", `translate(726 ${f(490 + dy + s * 10)}) scale(${f(s)})`);
    }

    // flyet letter bag husene og flyver ud over t-shirten
    {
      const P = anim.plane;
      const u = clamp01((t - CUES.plane) / 4.6);
      const vis = t > CUES.plane && u < 1;
      P.g.setAttribute("opacity", vis ? 1 : 0);
      if (vis) {
        const e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
        const p0 = [800, 780];
        const p1 = [1000, 540];
        const p2 = [1400, 140];
        const p3 = [2200, -560];
        const pos = bezier(p0, p1, p2, p3, e);
        const ahead = bezier(p0, p1, p2, p3, Math.min(1, e + 0.02));
        const ang = (Math.atan2(ahead[1] - pos[1], ahead[0] - pos[0]) * 180) / Math.PI;
        const sc = 0.85 + e * 0.5;
        P.g.setAttribute("transform", `translate(${f(pos[0])} ${f(pos[1])}) rotate(${f(ang)}) scale(${f(sc)})`);
        // banneret bølger
        const top = [];
        const bot = [];
        for (let k = 0; k <= 10; k++) {
          const xx = -230 - k * 50;
          const w = Math.sin(k * 0.9 - t * 9) * 7 * (k / 10);
          top.push([xx, -4 + w]);
          bot.unshift([xx, 52 + w]);
        }
        P.flagPath.setAttribute("d", smooth([...top, ...bot], true));
        P.rope.setAttribute("d", "M-170,-10 Q-200,0 -230,12");
        P.flagText.setAttribute("x", -480);
      }
    }
  }

  // Hvor langt lagene er foldet ud (0 = fladt som trykket, 1 = helt ude).
  function depthAt(t) {
    return AR ? ease((t - CUES.depth) / 1.1) : 0;
  }

  update(0);
  return {
    root,
    layers: LAYERS.map((L) => ({ id: L.id, depth: L.depth, svg: layers[L.id].svg })),
    update,
    depthAt,
    cues: CUES,
  };
}
