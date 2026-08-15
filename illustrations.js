/* PyQuest — illustrations.js
 *
 * Every drawing in the field guide, built as SVG strings. No image assets.
 *
 * House style, applied to all of them:
 *   - linework in currentColor at one weight (1.4), round caps
 *   - one flat wash behind the subject, same hue, low opacity
 *   - stipple dots for shading, never a gradient
 *   - deterministic wobble, so nothing sits perfectly straight but every
 *     render is identical
 *
 * Linework draws itself with stroke-dashoffset. Each path is measured with
 * getTotalLength() at arm time rather than relying on pathLength="1", which
 * Chrome does not apply to dash values.
 */

/* ------------------------------------------------ inks ------------------ */

const INKS = [
  { name: "fern",       ink: "#2E5E3A", wash: "#E3EEDF" },
  { name: "indigo",     ink: "#2B4C7E", wash: "#E1E9F5" },
  { name: "terracotta", ink: "#B4462A", wash: "#F8E3D8" },
  { name: "amber",      ink: "#A97708", wash: "#FAEDD0" },
  { name: "plum",       ink: "#6C3A69", wash: "#F0E2EF" },
  { name: "teal",       ink: "#136266", wash: "#DCEDEC" },
];

const TRACK_INK = { Foundations: INKS[0], Intermediate: INKS[1], Expert: INKS[4] };

/* ------------------------------------------------ geometry -------------- */

const r2 = (n) => Math.round(n * 100) / 100;

/* small deterministic generator: same drawing every time, never machine-straight */
function rng(seed) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

/* point and tangent on a quadratic bezier */
function qPoint(p0, c, p1, t) {
  const u = 1 - t;
  return [
    u * u * p0[0] + 2 * u * t * c[0] + t * t * p1[0],
    u * u * p0[1] + 2 * u * t * c[1] + t * t * p1[1],
  ];
}
function qTangent(p0, c, p1, t) {
  const u = 1 - t;
  const x = 2 * u * (c[0] - p0[0]) + 2 * t * (p1[0] - c[0]);
  const y = 2 * u * (c[1] - p0[1]) + 2 * t * (p1[1] - c[1]);
  const len = Math.hypot(x, y) || 1;
  return [x / len, y / len];
}

/* a tapering blade: swells from the base, comes to a point at the tip */
function bladeGeometry(base, tip, width, bow) {
  const mid = [(base[0] + tip[0]) / 2 + bow, (base[1] + tip[1]) / 2];
  const t = qTangent(base, mid, tip, 0);
  const n = [-t[1], t[0]];
  const hw = width / 2;
  return {
    base, tip, mid,
    left:  [base[0] - n[0] * hw, base[1] - n[1] * hw],
    right: [base[0] + n[0] * hw, base[1] + n[1] * hw],
    ctrlL: [mid[0] - n[0] * hw * 0.75, mid[1] - n[1] * hw * 0.75],
    ctrlR: [mid[0] + n[0] * hw * 0.75, mid[1] + n[1] * hw * 0.75],
  };
}
function bladePath(g) {
  return `M ${r2(g.left[0])} ${r2(g.left[1])} Q ${r2(g.ctrlL[0])} ${r2(g.ctrlL[1])} ${r2(g.tip[0])} ${r2(g.tip[1])}` +
         ` Q ${r2(g.ctrlR[0])} ${r2(g.ctrlR[1])} ${r2(g.right[0])} ${r2(g.right[1])}`;
}
function veinPath(g) {
  return `M ${r2(g.base[0])} ${r2(g.base[1])} Q ${r2(g.mid[0])} ${r2(g.mid[1])} ${r2(g.tip[0])} ${r2(g.tip[1])}`;
}

/* the cross-banding on a snake plant leaf */
function bands(g, width, count, seed) {
  const rand = rng(seed);
  let d = "";
  for (let i = 1; i <= count; i++) {
    const t = 0.14 + (i / (count + 1)) * 0.74;
    const p = qPoint(g.base, g.mid, g.tip, t);
    const tan = qTangent(g.base, g.mid, g.tip, t);
    const n = [-tan[1], tan[0]];
    const half = (width / 2) * (1 - t * 0.65) * (0.5 + rand() * 0.3);
    const sag = 2 + rand() * 2;
    d += ` M ${r2(p[0] - n[0] * half)} ${r2(p[1] - n[1] * half)}` +
         ` Q ${r2(p[0] + tan[0] * sag)} ${r2(p[1] + tan[1] * sag)}` +
         ` ${r2(p[0] + n[0] * half)} ${r2(p[1] + n[1] * half)}`;
  }
  return d.trim();
}

/* shading dots, scattered inside an ellipse */
function stipple(cx, cy, rx, ry, count, seed) {
  const rand = rng(seed);
  let out = "";
  for (let i = 0; i < count; i++) {
    const a = rand() * Math.PI * 2;
    const rad = Math.sqrt(rand());
    const x = cx + Math.cos(a) * rx * rad;
    const y = cy + Math.sin(a) * ry * rad;
    out += `<circle cx="${r2(x)}" cy="${r2(y)}" r="${r2(0.5 + rand() * 0.5)}"/>`;
  }
  return out;
}

/* a root or tendril that wanders as it goes */
function tendril(x, y, dx, dy, steps, spread, seed) {
  const rand = rng(seed);
  let d = `M ${r2(x)} ${r2(y)}`;
  let px = x, py = y;
  for (let i = 0; i < steps; i++) {
    const nx = px + dx + (rand() - 0.5) * spread;
    const ny = py + dy;
    const cx = px + dx * 0.5 + (rand() - 0.5) * spread * 1.6;
    const cy = py + dy * 0.5;
    d += ` Q ${r2(cx)} ${r2(cy)} ${r2(nx)} ${r2(ny)}`;
    px = nx; py = ny;
  }
  return d;
}

function spiralPath(cx, cy, rStart, rEnd, turns, startAngle) {
  const steps = Math.round(turns * 28);
  let d = "";
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const a = startAngle + f * turns * Math.PI * 2;
    const rad = rStart + (rEnd - rStart) * f;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    d += (i === 0 ? "M " : " L ") + r2(x) + " " + r2(y);
  }
  return d;
}

/* ------------------------------------------------ svg plumbing ---------- */

let illoSeq = 0;

const ink = (d, i) => `<path class="ink" style="--i:${i || 0}" d="${d}"/>`;
const wash = (d) => `<path class="wash" d="${d}"/>`;
const dots = (inner, i) => `<g class="stipple" style="--i:${i || 0}">${inner}</g>`;

function svgWrap(viewBox, inner, opts) {
  const o = opts || {};
  const cls = ["illo", o.class].filter(Boolean).join(" ");
  const label = o.label
    ? `role="img" aria-label="${o.label}"`
    : `aria-hidden="true"`;
  const size = (o.width ? ` width="${o.width}"` : "") + (o.height ? ` height="${o.height}"` : "");
  const style = o.ink ? ` style="color:${o.ink}"` : "";
  return `<svg class="${cls}" data-illo="${++illoSeq}" viewBox="${viewBox}"${size}${style} fill="none" ` +
         `stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" ` +
         `preserveAspectRatio="xMidYMid meet" ${label}>${inner}</svg>`;
}

/* ------------------------------------------------ plate 1: sansevieria -- */
/* The snake plant. The field-guide answer to "Python": no mascot, no cartoon. */

function drawSansevieria(flowering) {
  const soil = 268;
  const leaves = [
    { base: [110, soil], tip: [112, 34],  w: 27, bow: 2,   seed: 11 },
    { base: [100, soil], tip: [74, 66],   w: 22, bow: -9,  seed: 23 },
    { base: [120, soil], tip: [148, 76],  w: 22, bow: 10,  seed: 37 },
    { base: [ 94, soil], tip: [46, 128],  w: 17, bow: -14, seed: 51 },
    { base: [126, soil], tip: [174, 138], w: 17, bow: 15,  seed: 67 },
    { base: [104, soil], tip: [80, 178],  w: 13, bow: -5,  seed: 83 },
    { base: [118, soil], tip: [140, 186], w: 13, bow: 6,   seed: 97 },
  ];

  let washD = "";
  let blades = "";
  let veins = "";
  let banding = "";

  leaves.forEach((L, i) => {
    const g = bladeGeometry(L.base, L.tip, L.w, L.bow);
    washD += bladePath(g) + " Z ";
    blades += ink(bladePath(g), i);
    veins += ink(veinPath(g), i);
    banding += ink(bands(g, L.w, 5, L.seed), i + 2);
  });

  const roots =
    ink(tendril(104, soil + 2, -7, 12, 4, 9, 5), 7) +
    ink(tendril(110, soil + 2, 1, 14, 4, 8, 9), 7) +
    ink(tendril(117, soil + 2, 8, 12, 4, 9, 13), 8);

  const ground = ink(`M 62 ${soil} Q 110 ${soil - 5} 160 ${soil}`, 6);

  const spike = flowering
    ? ink(`M 126 ${soil - 6} Q 146 208 152 124`, 8) +
      [0, 1, 2, 3, 4, 5].map((k) => {
        const y = 132 + k * 13;
        const x = 152 - k * 1.2;
        return `<circle class="bloom" style="--i:${9 + k}" cx="${x}" cy="${y}" r="3.4"/>` +
               `<circle class="bloom" style="--i:${9 + k}" cx="${x + 6}" cy="${y + 5}" r="2.6"/>`;
      }).join("")
    : "";

  return svgWrap(
    "0 0 220 330",
    wash(washD) + blades + veins + banding + ground + roots + spike +
      dots(stipple(110, soil + 14, 42, 12, 26, 3), 8),
    {
      class: "plate-illo",
      label: flowering
        ? "Botanical plate: a snake plant in flower"
        : "Botanical plate: a snake plant, roots to tip",
    }
  );
}

/* ------------------------------------------------ plate 2: seed --------- */
/* Foundations. A seed splitting: first root, first leaf. */

function drawSeed() {
  const cx = 106, cy = 132;

  /* the husk, split: the upper half has lifted and slid back off the lower */
  const lower = `M ${cx - 32} ${cy + 2} Q ${cx - 30} ${cy + 30} ${cx} ${cy + 32}` +
                ` Q ${cx + 30} ${cy + 30} ${cx + 32} ${cy} Q ${cx + 2} ${cy + 10} ${cx - 32} ${cy + 2}`;
  /* the upper half has slid back and tilted, the way a husk actually opens */
  const upper = `M ${cx - 40} ${cy - 16} Q ${cx - 38} ${cy - 44} ${cx - 10} ${cy - 48}` +
                ` Q ${cx + 18} ${cy - 50} ${cx + 22} ${cy - 24} Q ${cx - 8} ${cy - 10} ${cx - 40} ${cy - 16}`;

  /* root down through the split, rootlets off it */
  const root = ink(tendril(cx - 2, cy + 30, 3, 16, 4, 11, 29), 3);
  const rootlets =
    ink(tendril(cx + 2, cy + 52, -11, 10, 2, 7, 31), 4) +
    ink(tendril(cx + 6, cy + 66, 12, 9, 2, 7, 41), 4);

  /* shoot rising out of the gap between the halves */
  const shoot = ink(`M ${cx - 1} ${cy - 20} Q ${cx - 4} ${cy - 52} ${cx + 2} ${cy - 74}`, 2);

  const leafL = bladeGeometry([cx + 1, cy - 68], [cx - 34, cy - 94], 18, -8);
  const leafR = bladeGeometry([cx + 2, cy - 72], [cx + 38, cy - 92], 18, 9);

  return svgWrap(
    "0 0 220 220",
    wash(lower + " Z " + upper + " Z " + bladePath(leafL) + " Z " + bladePath(leafR) + " Z") +
      ink(lower, 0) + ink(upper, 1) +
      root + rootlets + shoot +
      ink(bladePath(leafL), 5) + ink(veinPath(leafL), 6) +
      ink(bladePath(leafR), 5) + ink(veinPath(leafR), 6) +
      dots(stipple(cx, cy + 16, 24, 8, 16, 7), 6),
    { class: "plate-illo", label: "Botanical plate: a germinating seed" }
  );
}

/* ------------------------------------------------ plate 3: fiddlehead --- */
/* Intermediate. A fern frond caught mid-unfurl. */

function drawFrond() {
  /* one rachis from the base up into the coil, pinnae in pairs along it,
     each pair angled forward toward the tip and shrinking as they climb */
  const p0 = [50, 240], c = [78, 168], p1 = [136, 108];
  const stem = `M ${p0[0]} ${p0[1]} Q ${c[0]} ${c[1]} ${p1[0]} ${p1[1]}`;

  let pinnae = "";
  const pairs = 7;
  for (let i = 0; i < pairs; i++) {
    const t = 0.1 + (i / pairs) * 0.86;
    const P = qPoint(p0, c, p1, t);
    const T = qTangent(p0, c, p1, t);
    const n = [-T[1], T[0]];
    const len = 38 - i * 4.2;
    const w = 12 - i * 1.1;
    /* lean each leaflet toward the tip rather than straight out */
    const lean = 0.45;
    const dirL = [-n[0] + T[0] * lean, -n[1] + T[1] * lean];
    const dirR = [n[0] + T[0] * lean, n[1] + T[1] * lean];
    const norm = (v) => { const m = Math.hypot(v[0], v[1]) || 1; return [v[0] / m, v[1] / m]; };
    const dl = norm(dirL), dr = norm(dirR);
    const gL = bladeGeometry(P, [P[0] + dl[0] * len, P[1] + dl[1] * len], w, -3);
    const gR = bladeGeometry(P, [P[0] + dr[0] * len, P[1] + dr[1] * len], w, 3);
    pinnae += ink(bladePath(gL), 1 + i * 0.5) + ink(veinPath(gL), 1.4 + i * 0.5) +
              ink(bladePath(gR), 1 + i * 0.5) + ink(veinPath(gR), 1.4 + i * 0.5);
  }

  /* the fiddlehead: still rolled, waiting to open */
  const coilCx = 158, coilCy = 76;
  const coil = ink(spiralPath(coilCx, coilCy, 34, 4, 2.1, Math.PI * 0.86), 7);
  const coilLink = ink(`M 136 108 Q 130 96 128 84`, 6);

  return svgWrap(
    "0 0 220 270",
    wash(`M ${coilCx} ${coilCy} m -34 0 a 34 34 0 1 0 68 0 a 34 34 0 1 0 -68 0`) +
      ink(stem, 0) + pinnae + coilLink + coil +
      dots(stipple(coilCx, coilCy, 22, 22, 14, 17), 8),
    { class: "plate-illo", label: "Botanical plate: an unfurling fern frond" }
  );
}

/* ------------------------------------------------ plate 4: seed pod ----- */
/* Expert. The pod splits and the seeds go everywhere. */

function drawPod() {
  /* the halves have swung apart at the top, still joined at the stalk */
  const half1 = `M 104 212 Q 62 156 62 84 Q 62 50 74 28 Q 78 74 86 140 Q 94 188 104 212`;
  const half2 = `M 114 212 Q 156 156 156 84 Q 156 50 144 28 Q 140 74 132 140 Q 124 188 114 212`;

  /* the seeds still sitting in the open pod */
  const inPod =
    `<ellipse class="wash-shape" cx="103" cy="118" rx="6" ry="4"/><ellipse cx="103" cy="118" rx="6" ry="4"/>` +
    `<ellipse class="wash-shape" cx="112" cy="146" rx="5.6" ry="3.8"/><ellipse cx="112" cy="146" rx="5.6" ry="3.8"/>` +
    `<ellipse class="wash-shape" cx="106" cy="174" rx="5.2" ry="3.6"/><ellipse cx="106" cy="174" rx="5.2" ry="3.6"/>`;

  const seedSpots = [
    [166, 48, 7, 4.6, -18], [188, 84, 6, 4, 22], [48, 54, 6.4, 4.2, 16],
    [30, 96, 5.6, 3.8, -24], [178, 132, 5, 3.4, 8], [40, 142, 5, 3.4, -8],
  ];
  let seeds = "";
  seedSpots.forEach((s, i) => {
    seeds += `<g class="seed" style="--i:${4 + i}" transform="translate(${s[0]} ${s[1]}) rotate(${s[4]})">` +
             `<ellipse class="wash-shape" cx="0" cy="0" rx="${s[2]}" ry="${s[3]}"/>` +
             `<ellipse cx="0" cy="0" rx="${s[2]}" ry="${s[3]}"/>` +
             `<path d="M ${-s[2] * 0.5} 0 Q 0 ${-s[3] * 0.5} ${s[2] * 0.5} 0"/></g>`;
  });

  return svgWrap(
    "0 0 220 240",
    wash(half1 + " Z " + half2 + " Z") +
      ink(half1, 0) + ink(half2, 0) +
      `<g class="pod-seeds" style="--i:3">${inPod}</g>` +
      ink(`M 109 214 Q 109 226 106 232`, 2) +
      seeds +
      dots(stipple(109, 186, 14, 26, 14, 23), 8),
    { class: "plate-illo", label: "Botanical plate: a seed pod, split open" }
  );
}

/* ------------------------------------------------ the beetle ------------ */
/* Firewall. Bug defence drawn as an entomological plate, so the game and the
   course belong to the same world. */

function beetleInner() {
  return drawBeetle({ inner: true });
}

function drawBeetle(opts) {
  const o = opts || {};
  const body = `M 60 44 Q 84 52 84 88 Q 84 118 60 126 Q 36 118 36 88 Q 36 52 60 44`;
  const pronotum = `M 60 30 Q 76 32 78 46 Q 68 42 60 42 Q 52 42 42 46 Q 44 32 60 30`;
  const head = `M 60 18 Q 70 20 70 28 Q 66 32 60 32 Q 54 32 50 28 Q 50 20 60 18`;

  const legs = [
    `M 40 56 Q 24 50 18 38`, `M 40 78 Q 20 78 12 70`, `M 42 100 Q 24 106 18 120`,
    `M 80 56 Q 96 50 102 38`, `M 80 78 Q 100 78 108 70`, `M 78 100 Q 96 106 102 120`,
  ].map((d, i) => ink(d, 3 + (i % 3))).join("");

  const antennae = ink(`M 55 20 Q 44 10 34 8`, 5) + ink(`M 65 20 Q 76 10 86 8`, 5);

  const inner =
    wash(body + " Z") +
    legs +
    ink(body, 0) + ink(pronotum, 1) + ink(head, 2) +
    ink(`M 60 46 L 60 122`, 2) +
    ink(`M 48 56 Q 45 88 50 114`, 4) + ink(`M 72 56 Q 75 88 70 114`, 4) +
    antennae +
    dots(stipple(48, 86, 7, 24, 9, 29) + stipple(72, 86, 7, 24, 9, 31), 6);

  if (o.inner) return inner;

  return svgWrap("0 0 120 140", inner, {
    class: "beetle-illo", width: o.width, height: o.height, ink: o.ink,
    label: o.label || "",
  });
}

/* ------------------------------------------------ leaves and vine ------- */

/* one leaf on a stem, angled off to a side; used by the vine and the medallions */
function leafAt(x, y, len, angleDeg, seed) {
  const a = (angleDeg * Math.PI) / 180;
  const tip = [x + Math.cos(a) * len, y + Math.sin(a) * len];
  /* wide and well bowed: a narrow blade at this size reads as an arrowhead */
  const bow = (seed % 2 ? 1 : -1) * len * 0.28;
  const g = bladeGeometry([x, y], tip, len * 0.62, bow);
  return { blade: bladePath(g) + " Z", vein: veinPath(g) };
}

/* The sidebar vine. marks: [{ y, state: "leaf"|"bud"|"bare", ink }] */
function drawVine(height, marks) {
  const w = 26;
  const rand = rng(7);
  const midX = 13;

  let stem = `M ${midX} ${height}`;
  const steps = Math.max(3, Math.round(height / 90));
  let py = height;
  for (let i = 0; i < steps; i++) {
    const ny = height - ((i + 1) / steps) * height;
    const cx = midX + (rand() - 0.5) * 9;
    stem += ` Q ${r2(cx)} ${r2((py + ny) / 2)} ${midX} ${r2(ny)}`;
    py = ny;
  }

  /* the journey reads top to bottom, so the stem inks in downwards: solid as
     far as you have got, pencil underdrawing from there on */
  const grown = marks.filter((m) => m.state !== "bare");
  const grownTo = grown.length ? Math.max(...grown.map((m) => m.y)) + 16 : 0;

  let parts = "";
  marks.forEach((m, i) => {
    const side = i % 2 === 0 ? 1 : -1;
    if (m.state === "leaf") {
      const L = leafAt(midX, m.y, 15, side > 0 ? -22 : 202, i + 1);
      parts += `<g class="vine-leaf" data-key="${m.key || i}" style="color:${m.ink};--i:${i}">` +
               `<path class="wash" d="${L.blade}"/>` +
               `<path class="ink" d="${L.blade}"/>` +
               `<path class="ink" d="${L.vein}"/></g>`;
    } else if (m.state === "bud") {
      parts += `<g class="vine-bud" style="color:${m.ink};--i:${i}">` +
               `<path class="ink" d="M ${midX} ${m.y} q ${side * 7} -3 ${side * 9} -9"/>` +
               `<ellipse class="bud-head" cx="${midX + side * 11}" cy="${m.y - 13}" rx="4.2" ry="6"` +
               ` transform="rotate(${side * 22} ${midX + side * 11} ${m.y - 13})"/></g>`;
    }
  });

  return `<svg class="illo vine" viewBox="0 0 ${w} ${height}" width="${w}" height="${height}" fill="none" ` +
         `stroke="currentColor" stroke-width="1.4" stroke-linecap="round" preserveAspectRatio="none" aria-hidden="true">` +
         `<path class="stem-pencil" d="${stem}"/>` +
         `<clipPath id="vine-grown"><rect x="0" y="0" width="${w}" height="${r2(Math.max(0, grownTo))}"/></clipPath>` +
         `<path class="stem-ink" d="${stem}" clip-path="url(#vine-grown)"/>` +
         parts +
         `</svg>`;
}

/* ------------------------------------------------ medallions ------------ */
/* 20 stage badges from a kit: 6 specimen forms x 6 inks x 3 frames. Each one
   distinct, all of them plainly the same collection. */

const FORMS = ["leaf", "seed", "pod", "frond", "berry", "root"];

function formInner(form, seed) {
  switch (form) {
    case "leaf": {
      const L = leafAt(32, 44, 26, -74, seed);
      return `<path class="wash" d="${L.blade}"/><path class="ink" d="${L.blade}"/>` +
             `<path class="ink" d="${L.vein}"/>`;
    }
    case "seed": {
      const d = `M 32 20 Q 45 30 44 42 Q 43 52 32 52 Q 21 52 20 42 Q 19 30 32 20`;
      return `<path class="wash" d="${d}"/><path class="ink" d="${d}"/>` +
             `<path class="ink" d="M 32 24 L 32 50"/>`;
    }
    case "pod": {
      const a = `M 26 50 Q 18 34 26 18 Q 30 26 29 38 Q 29 46 26 50`;
      const b = `M 38 50 Q 46 34 38 18 Q 34 26 35 38 Q 35 46 38 50`;
      return `<path class="wash" d="${a} Z ${b} Z"/><path class="ink" d="${a}"/>` +
             `<path class="ink" d="${b}"/>` +
             `<circle cx="32" cy="30" r="2.2"/><circle cx="32" cy="40" r="2.2"/>`;
    }
    case "frond": {
      let out = `<path class="ink" d="M 22 50 Q 32 36 42 20"/>`;
      for (let i = 0; i < 4; i++) {
        const t = 0.2 + i * 0.22;
        const P = qPoint([22, 50], [32, 36], [42, 20], t);
        const len = 12 - i * 1.8;
        const l1 = leafAt(P[0], P[1], len, 200, i + seed);
        const l2 = leafAt(P[0], P[1], len, 20, i + seed + 1);
        out += `<path class="ink" d="${l1.blade}"/>` +
               `<path class="ink" d="${l2.blade}"/>`;
      }
      return out;
    }
    case "berry": {
      const spots = [[26, 40, 7], [39, 36, 6], [32, 26, 5.4]];
      return spots.map((s, i) =>
        `<circle class="wash-shape" cx="${s[0]}" cy="${s[1]}" r="${s[2]}"/>` +
        `<circle cx="${s[0]}" cy="${s[1]}" r="${s[2]}"/>` +
        `<path class="ink" d="M ${s[0]} ${s[1] - s[2]} q ${2 + i} -5 ${5 + i} -7"/>`
      ).join("");
    }
    default: {
      return `<path class="ink" d="M 32 18 L 32 34"/>` +
             `<path class="ink" d="${tendril(32, 34, -5, 7, 3, 6, seed + 3)}"/>` +
             `<path class="ink" d="${tendril(32, 34, 5, 7, 3, 6, seed + 9)}"/>` +
             `<path class="ink" d="${tendril(32, 34, 0, 8, 3, 4, seed + 15)}"/>`;
    }
  }
}

function frameInner(variant) {
  if (variant === 1) {
    return `<circle cx="32" cy="32" r="29"/>` +
           `<circle class="hair" cx="32" cy="32" r="24" stroke-dasharray="1.5 3.5"/>`;
  }
  if (variant === 2) {
    return `<circle cx="32" cy="32" r="29"/><circle class="hair" cx="32" cy="32" r="26"/>`;
  }
  return `<circle cx="32" cy="32" r="29"/>`;
}

/* the medallion's contents in its own 64x64 space, for callers that place it
   inside a larger drawing */
function medallionInner(idx, opts) {
  const o = opts || {};
  const form = FORMS[(idx + Math.floor(idx / FORMS.length)) % FORMS.length];
  const frame = Math.floor(idx / FORMS.length) % 3;
  return `<circle class="medallion-ground" cx="32" cy="32" r="29"/>` +
    `<g class="medallion-frame">${frameInner(frame)}</g>` +
    formInner(form, idx * 7 + 3) +
    /* the number sits in a notch at the foot of the plate, like a specimen label */
    (o.noNumber ? "" :
      `<rect class="medallion-plate" x="22" y="50" width="20" height="13" rx="3"/>` +
      `<text class="medallion-num" x="32" y="59.5" text-anchor="middle">${idx + 1}</text>`);
}

function drawMedallion(idx, size, opts) {
  const o = opts || {};
  const tone = INKS[idx % INKS.length];
  return svgWrap("0 0 64 64", medallionInner(idx, o), {
    class: "medallion",
    width: size || 56,
    height: size || 56,
    ink: o.ink || tone.ink,
    label: o.label || "",
  });
}

/* a single leaf, for callers drawing their own scene */
function leafMark(x, y, len, angleDeg, seed) {
  const L = leafAt(x, y, len, angleDeg, seed || 1);
  return `<path class="wash" d="${L.blade}"/>` +
         `<path class="ink" d="${L.blade}"/>` +
         `<path class="ink" d="${L.vein}"/>`;
}

/* ------------------------------------------------ small marks ----------- */

/* what a locked stage gets instead of a padlock: a pressed, faded specimen */
function drawPressed(size) {
  const L = leafAt(8, 14, 11, -62, 3);
  return svgWrap("0 0 16 16", `<path class="pressed" d="${L.blade}"/>`, {
    class: "pressed-mark", width: size || 13, height: size || 13,
  });
}

/* ------------------------------------------------ draw-on --------------- */

/* Illustrations ink themselves in when they arrive, once, and never again. */
let illoObserver = null;

/* Hide the linework by dashing each path by its own length, so that when the
   draw runs every line takes the same time no matter how long it is.
   Done before the first paint, so nothing flashes. */
function armPaths(el) {
  if (el.dataset.armed) return;
  el.dataset.armed = "1";
  el.querySelectorAll(".ink").forEach((p) => {
    let len = 0;
    try { len = p.getTotalLength(); } catch (e) { len = 0; }
    p.style.setProperty("--len", Math.ceil(len) || 1);
  });
}

/* The draw runs from JS, not CSS, for two Chrome behaviours:
   - it will not interpolate a keyframe built from var(--len), and silently
     holds the start value, leaving the drawing invisible;
   - a finished fill:forwards animation holds the right computed value but
     does not repaint the path, so the finished line vanishes. Writing the
     resting state inline on finish forces the repaint. */
const DRAW_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

function drawIn(el, opts) {
  const o = opts || {};
  const duration = o.duration || 900;
  const stagger = o.stagger === undefined ? 120 : o.stagger;
  el.classList.add("drawn");
  el.querySelectorAll(".ink").forEach((p) => {
    const len = parseFloat(p.style.getPropertyValue("--len")) || 0;
    if (!len || !p.animate) {
      p.style.strokeDasharray = "none";
      p.style.strokeDashoffset = "0";
      return;
    }
    const i = parseFloat(p.style.getPropertyValue("--i")) || 0;
    const anim = p.animate(
      [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
      { duration, delay: i * stagger, easing: DRAW_EASE, fill: "forwards" }
    );
    anim.onfinish = () => {
      p.style.strokeDasharray = "none";
      p.style.strokeDashoffset = "0";
      anim.cancel();
    };
  });
}

function observeIllustrations(root) {
  const scope = root || document;
  const targets = scope.querySelectorAll(".illo:not(.drawn):not(.no-draw)");
  if (!targets.length) return;

  /* Reduced motion, or a tab opened in the background: show the finished
     drawing. A hidden tab does not run animations, so arming the paths there
     would leave the page blank until it happened to be looked at. */
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.hidden) {
    targets.forEach((el) => el.classList.add("drawn", "instant"));
    return;
  }

  targets.forEach(armPaths);

  if (!illoObserver) {
    illoObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        drawIn(entry.target);
        illoObserver.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
  }
  targets.forEach((el) => illoObserver.observe(el));
}

/* ------------------------------------------------ public ---------------- */

const ILLO = {
  inks: INKS,
  stageInk: (idx) => INKS[idx % INKS.length],
  trackInk: (name) => TRACK_INK[name] || INKS[0],

  sansevieria: () => drawSansevieria(false),
  flowering: () => drawSansevieria(true),
  seed: drawSeed,
  frond: drawFrond,
  pod: drawPod,
  beetle: drawBeetle,
  beetleInner,
  vine: drawVine,
  medallion: drawMedallion,
  medallionInner,
  leafMark,
  pressed: drawPressed,

  trackPlate(name) {
    if (name === "Intermediate") return drawFrond();
    if (name === "Expert") return drawPod();
    return drawSeed();
  },

  observe: observeIllustrations,
  arm: armPaths,
  draw: drawIn,
};
