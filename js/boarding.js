// Boardingkort og Mikkeller-pas – vises når AR-scenen er færdig.
// Bruges både i prototypen (index.html) og i live-AR (live.html).

const BASE = new URL("..", import.meta.url).href; // mappen ar-demo-koebenhavn/

const CITIES = [
  { code: "CPH", name: "København", img: "assets/stamps/cph.png" },
  { code: "TYO", name: "Tokyo", img: "assets/stamps/tyo.png" },
  { code: "LON", name: "London", img: "assets/stamps/lon.png" },
  { code: "PAR", name: "Paris", img: "assets/stamps/par.png" },
  { code: "BJS", name: "Beijing", img: "assets/stamps/bjs.png" },
];

const PLANE_ICON = `<svg viewBox="-50 -48 104 96" aria-hidden="true"><path d="M-40,0 C-40,-9 -30,-11 -20,-11 L30,-11 C44,-11 52,-5 52,0 C52,5 44,11 30,11 L-20,11 C-30,11 -40,9 -40,0Z M2,-8 L-18,-44 L-4,-44 L26,-8Z M2,8 L-18,44 L-4,44 L26,8Z M-34,-4 L-46,-26 L-36,-26 L-22,-4Z" fill="currentColor"/></svg>`;

function barcode() {
  let x = 0;
  let bars = "";
  let seed = 7;
  while (x < 300) {
    seed = (seed * 9301 + 49297) % 233280;
    const w = 2 + (seed % 5);
    if ((seed >> 3) % 3) bars += `<rect x="${x}" y="0" width="${w}" height="54"/>`;
    x += w + 2;
  }
  return `<svg class="bp-barcode" viewBox="0 0 300 54" preserveAspectRatio="none" aria-hidden="true">${bars}</svg>`;
}

export function boardingHTML() {
  return `
  <div class="bp-wrap">
    <p class="bp-kicker">Afgang registreret</p>
    <article class="bp">
      <header class="bp-head"><span class="bp-logo">${PLANE_ICON}</span><span>MIKKELLER AIRWAYS</span><span class="bp-head-r">BOARDINGKORT</span></header>
      <div class="bp-route">
        <div><div class="bp-code">CPH</div><div class="bp-city">København</div></div>
        <div class="bp-arrow">${PLANE_ICON}</div>
        <div class="bp-right"><div class="bp-code">???</div><div class="bp-city">Hele verden</div></div>
      </div>
      <dl class="bp-grid">
        <div><dt>Passager</dt><dd>Dig</dd></div>
        <div><dt>Fly</dt><dd>MK 001</dd></div>
        <div><dt>Sæde</dt><dd>Barstol 1A</dd></div>
        <div><dt>Gate</dt><dd>Nærmeste Mikkeller-bar</dd></div>
        <div><dt>Boarding</dt><dd>Nu</dd></div>
        <div><dt>Bagage</dt><dd>1 ladcykel</dd></div>
      </dl>
      <div class="bp-perf" aria-hidden="true"></div>
      <div class="bp-foot">
        <p>Mikkeller har barer i <strong>13 lande</strong> uden for Danmark. Find trykkene, saml stemplerne.</p>
        ${barcode()}
      </div>
    </article>
    <button class="btn btn-primary" data-action="stamp">Stempl dit pas</button>
  </div>`;
}

export function passportHTML() {
  const slots = CITIES.map(
    (c, i) => `
      <div class="pp-slot ${i === 0 ? "pp-new" : "pp-locked"}" data-code="${c.code}">
        <img src="${BASE}${c.img}" alt="${i === 0 ? "Passtempel " + c.name : ""}" draggable="false">
        <span class="pp-label">${i === 0 ? c.name : c.code + " · find trykket"}</span>
      </div>`
  ).join("");
  return `
  <div class="pp-wrap">
    <div class="pp-book">
      <div class="pp-top"><span>MIKKELLER PAS</span><span class="pp-count"><b>1</b> / 5 byer</span></div>
      <div class="pp-grid">${slots}</div>
    </div>
    <div class="pp-next">
      <p class="pp-next-k">Næste destination</p>
      <p class="pp-next-t">Tokyo</p>
      <p class="pp-next-s">Mikkeller har 4 steder i Tokyo. Find Tokyo-trykket for at lette igen.</p>
    </div>
    <button class="btn btn-ghost" data-action="restart">Se det igen</button>
  </div>`;
}

// Spiller stempel-animationen når passet vises.
export function playStamp(root, sound) {
  const slot = root.querySelector(".pp-new");
  if (!slot) return;
  slot.classList.remove("pp-hit");
  void slot.offsetWidth;
  slot.classList.add("pp-hit");
  setTimeout(() => sound && sound(), 260);
}
