// PyQuest — Firewall: tower defense between stages.
// Pests march a winding trail toward the seedling grown in the lesson. Plant
// garden defences to stop them — each is a drawn object (Lantern, Sprinkler,
// Gate, Scarecrow) that keeps the Python keyword it came from, so the game
// stays part of the course. Each sector (between stage N and N+1) is a harder
// wave set; new defences unlock as you advance.

const FW_XP = 5;
const FW_GRID_W = 14, FW_GRID_H = 10, FW_CELL = 40;

// path waypoints in cell coordinates (entry off-screen left, exit right)
const FW_WAYPOINTS = [
  [-1, 2], [3, 2], [3, 7], [7, 7], [7, 1], [11, 1], [11, 5], [14, 5],
];

// Each defence is a garden object you can picture, keeping the Python keyword
// that earned it: the mapping is what makes the Firewall part of the course.
// Costs, ranges, damage and unlocks are unchanged from the accepted balance.
const FW_TOWERS = {
  print: { key: "print", name: "Lantern",   art: "lantern",   keyword: "print()",
           cost: 50,  range: 95,  dmg: 9,  rate: 0.55, color: "#2B4C7E", bg: "#E1E9F5", unlockSector: 0,
           blurb: "Picks out one pest at a time, the way print() shows one thing at a time." },
  loop:  { key: "loop", name: "Sprinkler",  art: "sprinkler", keyword: "for",
           cost: 80,  range: 75,  dmg: 5,  rate: 0.9,  color: "#2E5E3A", bg: "#E3EEDF", unlockSector: 3, aoe: true,
           blurb: "Waters the whole bed at once — a for loop repeats over everything in range." },
  cond:  { key: "cond", name: "Gate",       art: "gate",      keyword: "if",
           cost: 60,  range: 85,  dmg: 1,  rate: 0.7,  color: "#A97708", bg: "#FAEDD0", unlockSector: 7, slow: 0.45,
           blurb: "Decides what gets through and holds the rest up, the way an if decides." },
  func:  { key: "func", name: "Scarecrow",  art: "scarecrow", keyword: "def",
           cost: 120, range: 150, dmg: 42, rate: 1.5,  color: "#B4462A", bg: "#F8E3D8", unlockSector: 11,
           blurb: "Built once, works from a long way off, over and over — like a def you defined." },
};

/* Defence and seedling drawings, decoded once per sector and cached. The board
   never waits on them: a missing image falls back to a plain ring. */
const fwArt = { defence: {}, seedling: {}, ready: false };

function fwLoadImage(svg, into, key) {
  const img = new Image();
  img.onload = () => { into[key] = img; if (fw.ctx) fwDraw(); };
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function fwPreloadArt() {
  if (fwArt.ready) return;
  fwArt.ready = true;
  Object.values(FW_TOWERS).forEach((t) => {
    fwLoadImage(ILLO.defence(t.art, t.color), fwArt.defence, t.key);
  });
  /* one seedling per damage step, so leaves drop as it is eaten */
  for (let s = 0; s <= 10; s++) {
    fwLoadImage(ILLO.seedling(s / 10, "#2E5E3A"), fwArt.seedling, String(s));
  }
}

const fw = {
  sector: 0, running: false, raf: null, lastT: 0, speed: 1,
  credits: 0, integrity: 0, wave: 0, waves: 0,
  bugs: [], towers: [], effects: [], spawnQueue: [], nextSpawn: 0, waveGap: 0,
  phase: "build", // build | wave | won | lost
  selectedType: null, selectedTower: null,
  canvas: null, ctx: null, pathCells: new Set(), pathPx: [], pathLen: 0,
};

function fwSectorWaves(i) { return 3 + Math.min(3, Math.floor(i / 5)); }
function bugDone(i) { return !!(state.bugs && state.bugs.cleared[i]); }

function nextJourneyStep() {
  for (let i = 0; i < STAGES.length; i++) {
    if (!stageUnlocked(i)) break;
    if (!stageDone(STAGES[i])) return { type: "stage", idx: i };
    if (i < STAGES.length - 1 && !bugDone(i)) return { type: "bug", idx: i };
  }
  return { type: "stage", idx: STAGES.length - 1 };
}

/* ------------------------------------------------ path geometry ---------- */

function fwBuildPath() {
  fw.pathPx = FW_WAYPOINTS.map(([cx, cy]) => [cx * FW_CELL + FW_CELL / 2, cy * FW_CELL + FW_CELL / 2]);
  fw.pathLen = 0;
  for (let i = 1; i < fw.pathPx.length; i++) {
    fw.pathLen += Math.hypot(fw.pathPx[i][0] - fw.pathPx[i - 1][0], fw.pathPx[i][1] - fw.pathPx[i - 1][1]);
  }
  fw.pathCells = new Set();
  for (let i = 1; i < FW_WAYPOINTS.length; i++) {
    let [x0, y0] = FW_WAYPOINTS[i - 1], [x1, y1] = FW_WAYPOINTS[i];
    const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
    let x = x0, y = y0;
    while (x !== x1 || y !== y1) {
      if (x >= 0 && x < FW_GRID_W) fw.pathCells.add(x + "," + y);
      x += dx; y += dy;
    }
    if (x1 >= 0 && x1 < FW_GRID_W) fw.pathCells.add(x1 + "," + y1);
  }
}

function fwPointAt(dist) {
  let d = dist;
  for (let i = 1; i < fw.pathPx.length; i++) {
    const [x0, y0] = fw.pathPx[i - 1], [x1, y1] = fw.pathPx[i];
    const seg = Math.hypot(x1 - x0, y1 - y0);
    if (d <= seg) {
      const t = d / seg;
      return [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t];
    }
    d -= seg;
  }
  return fw.pathPx[fw.pathPx.length - 1];
}

/* ------------------------------------------------ sector setup ----------- */

function fwLoadSector(i) {
  fwStopLoop();
  fw.sector = i;
  fw.credits = 130 + i * 18;
  fw.integrity = 10;
  fw.wave = 0;
  fw.waves = fwSectorWaves(i);
  fw.bugs = []; fw.towers = []; fw.effects = []; fw.spawnQueue = [];
  fw.phase = "build";
  fw.betweenWaves = false;
  fw.selectedType = "print";
  fw.selectedTower = null;
  fw.speed = 1;
  fw.hover = null;
  fwPreloadArt();
  fwBuildPath();
  fwHud();
  fwDraw();
}

function fwQueueWave() {
  const i = fw.sector, w = fw.wave; // wave is 1-based when called
  const count = 6 + (w - 1) * 2 + Math.floor(i / 2);
  const hp = 22 + i * 5 + (w - 1) * 8;
  const speed = 42 + i * 1.3 + (w - 1) * 2.5;
  fw.spawnQueue = [];
  for (let k = 0; k < count; k++) {
    let kind = "worker";
    if (i >= 2 && k % 4 === 3) kind = "runner";
    if (i >= 5 && k % 6 === 5) kind = "tank";
    fw.spawnQueue.push({
      kind,
      hp: kind === "tank" ? hp * 3.4 : kind === "runner" ? hp * 0.6 : hp,
      speed: kind === "tank" ? speed * 0.6 : kind === "runner" ? speed * 1.7 : speed,
      gap: kind === "tank" ? 1.5 : 0.85,
    });
  }
  fw.nextSpawn = 0.4;
}

/* ------------------------------------------------ engine ----------------- */

function fwStep(dt) {
  if (fw.phase !== "wave") return;

  // spawning
  if (fw.spawnQueue.length) {
    fw.nextSpawn -= dt;
    if (fw.nextSpawn <= 0) {
      const s = fw.spawnQueue.shift();
      fw.bugs.push({ ...s, maxHp: s.hp, dist: 0, slow: 0 });
      fw.nextSpawn = s.gap;
    }
  }

  // bugs advance
  for (const b of fw.bugs) {
    const mult = b.slow > 0 ? 0.5 : 1;
    b.slow = Math.max(0, b.slow - dt);
    b.dist += b.speed * mult * dt;
    if (b.dist >= fw.pathLen) {
      b.dead = true;
      fw.integrity -= b.kind === "tank" ? 2 : 1;
    }
  }
  fw.bugs = fw.bugs.filter((b) => !b.dead);

  if (fw.integrity <= 0) {
    fw.phase = "lost";
    fwHud(); fwDraw();
    return;
  }

  // towers fire
  for (const t of fw.towers) {
    t.cool -= dt;
    if (t.cool > 0) continue;
    const spec = FW_TOWERS[t.type];
    const range = spec.range * (1 + 0.15 * (t.level - 1));
    const dmg = spec.dmg * (1 + 0.5 * (t.level - 1));
    const inRange = fw.bugs.filter((b) => {
      const [bx, by] = fwPointAt(b.dist);
      return Math.hypot(bx - t.x, by - t.y) <= range;
    });
    if (!inRange.length) continue;
    t.cool = spec.rate;

    if (spec.aoe) {
      for (const b of inRange) fwHit(b, dmg);
      fw.effects.push({ kind: "pulse", x: t.x, y: t.y, r: range, ttl: 0.25, color: spec.color });
    } else {
      inRange.sort((a, b) => b.dist - a.dist);
      const target = inRange[0];
      fwHit(target, dmg);
      if (spec.slow) target.slow = Math.max(target.slow, 1.4);
      const [bx, by] = fwPointAt(target.dist);
      fw.effects.push({ kind: "beam", x: t.x, y: t.y, bx, by, ttl: 0.12, color: spec.color });
    }
  }
  fw.bugs = fw.bugs.filter((b) => !b.dead);

  fw.effects.forEach((e) => (e.ttl -= dt));
  fw.effects = fw.effects.filter((e) => e.ttl > 0);

  // wave / sector completion
  if (!fw.spawnQueue.length && !fw.bugs.length) {
    if (fw.wave >= fw.waves) {
      fw.phase = "won";
      fwSectorWon();
    } else if (fw.betweenWaves) {
      fw.waveGap -= dt;
      if (fw.waveGap <= 0) {
        fw.betweenWaves = false;
        fw.wave += 1;
        fwQueueWave();
      }
    } else {
      fw.betweenWaves = true;
      fw.waveGap = 3.2;
      fw.credits += 30; // wave-clear bonus, paid once
    }
  }
  fwHud();
}

function fwHit(b, dmg) {
  b.hp -= dmg;
  if (b.hp <= 0 && !b.dead) {
    b.dead = true;
    const bump = Math.floor(fw.sector / 3) * 3;
    fw.credits += (b.kind === "tank" ? 26 : b.kind === "runner" ? 8 : 12) + bump;
    const [bx, by] = fwPointAt(b.dist);
    fw.effects.push({ kind: "pop", x: bx, y: by, ttl: 0.5, color: "#B4462A" });
  }
}

function fwLoop(t) {
  if (!fw.running) return;
  const dt = Math.min(0.05, (t - fw.lastT) / 1000) * fw.speed;
  fw.lastT = t;
  fwStep(dt);
  fwDraw();
  if (fw.phase === "wave" || fw.phase === "build") fw.raf = requestAnimationFrame(fwLoop);
  else fw.running = false;
}

function fwStartLoop() {
  if (fw.running) return;
  fw.running = true;
  fw.lastT = performance.now();
  fw.raf = requestAnimationFrame(fwLoop);
}

function fwStopLoop() {
  fw.running = false;
  if (fw.raf) cancelAnimationFrame(fw.raf);
  fw.raf = null;
}

/* ------------------------------------------------ outcomes --------------- */

function fwSectorWon() {
  fwStopLoop();
  const i = fw.sector;
  const firstTime = !bugDone(i);
  if (!state.bugs.best[i] || fw.integrity > state.bugs.best[i]) state.bugs.best[i] = fw.integrity;
  if (firstTime) {
    state.bugs.cleared[i] = true;
    state.xp += FW_XP;
  }
  saveState();
  refreshHeader(true);
  refreshSidebar();
  fwHud(); fwDraw();

  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal");
  modal.innerHTML = `
    <p class="modal-kicker">Sector ${i + 1} defended</p>
    <svg width="72" height="72" viewBox="0 0 64 64" fill="none" aria-hidden="true">
      <circle cx="32" cy="32" r="30" fill="#EBF0E8"/>
      <circle cx="32" cy="32" r="30" stroke="#41603F" stroke-opacity="0.3" stroke-width="1.5"/>
      <path d="M32 14 L46 20 L46 32 Q46 44 32 50 Q18 44 18 32 L18 20 Z" fill="#FFFFFF" stroke="#41603F" stroke-width="1.6"/>
      <path d="M25 32 l5 5 l10 -11" stroke="#41603F" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <h2>The firewall held.</h2>
    <p>All ${fw.waves} waves stopped with ${fw.integrity} of 10 integrity left${firstTime ? " — +" + FW_XP + " XP for the defense" : ""}.
    Stage ${i + 2} is open.</p>
    <span class="modal-xp">${state.xp} XP total</span>
    <div class="modal-actions">
      <button class="btn-run" id="modal-continue">Continue to Stage ${i + 2}</button>
    </div>`;
  backdrop.classList.remove("hidden");
  confetti();
  document.getElementById("modal-continue").focus();
  document.getElementById("modal-continue").addEventListener("click", () => {
    backdrop.classList.add("hidden");
    showStage(i + 1);
  });
}

/* ------------------------------------------------ view ------------------- */

function showBugHunt(i) {
  if (!stageDone(STAGES[i])) { showStage(i); return; }
  fwStopLoop();
  activeStageIdx = "bug:" + i;
  refreshSidebar();
  const main = document.getElementById("main");
  main.classList.remove("main-full");
  const cleared = bugDone(i);

  const palette = Object.values(FW_TOWERS).map((t) => {
    const locked = i < t.unlockSector;
    return `<button class="tower-btn ${locked ? "locked" : ""}" data-tower="${t.key}"
      style="--tc:${t.color};--tb:${t.bg}" ${locked ? "disabled" : ""}
      title="${locked ? "Unlocks in Sector " + (t.unlockSector + 1) : t.blurb}">
      <span class="tower-art">${ILLO.defence(t.art, t.color, { size: 38 })}</span>
      <span class="tower-key">${t.name}</span>
      <span class="tower-word">${t.keyword}</span>
      <span class="tower-cost">${locked ? "Sector " + (t.unlockSector + 1) : "₵" + t.cost}</span>
    </button>`;
  }).join("");

  main.innerHTML = `
    <p class="stage-kicker reveal" style="--index:0">Firewall · between Stage ${i + 1} and Stage ${i + 2}</p>
    <h1 class="stage-title reveal" style="--index:0">Defend Sector ${i + 1}</h1>
    <div class="lesson-prose reveal" style="--index:1">
      <p>Pests from Stage ${i + 1} are marching on the seedling you grew there. Pick a
      defence, click an empty bed beside the trail to plant it, then start the waves.
      Click a planted defence to <strong>upgrade</strong> or sell it. Kills earn credits;
      ${cleared ? "this sector is already secure — replay for a perfect run." : `survive all ${fwSectorWaves(i)} waves to open Stage ${i + 2}.`}</p>
    </div>
    <div class="fw-frame reveal" style="--index:2">
      <div class="fw-hud" id="fw-hud"></div>
      <div class="fw-stage"><canvas id="fw-canvas" width="560" height="400" aria-label="Firewall tower defense board"></canvas></div>
      <div class="fw-bar">
        <div class="fw-palette">${palette}</div>
        <div class="fw-actions">
          <button class="btn-hint" id="fw-speed">1×</button>
          <button class="btn-run" id="fw-start">Start the waves</button>
        </div>
      </div>
      <div class="fw-inspect" id="fw-inspect"></div>
    </div>
    <div class="stage-footer reveal" style="--index:3">
      <span class="muted-note">Lantern picks off one pest, Sprinkler waters the whole bed, Gate holds them up, Scarecrow hits from far off.</span>
      ${cleared && i + 1 < STAGES.length
        ? `<button class="btn-hint" id="fw-next">Continue to Stage ${i + 2}</button>` : ""}
    </div>`;

  const canvas = document.getElementById("fw-canvas");
  const dpr = window.devicePixelRatio || 1;
  canvas.width = FW_GRID_W * FW_CELL * dpr;
  canvas.height = FW_GRID_H * FW_CELL * dpr;
  canvas.style.aspectRatio = `${FW_GRID_W * FW_CELL} / ${FW_GRID_H * FW_CELL}`;
  fw.canvas = canvas;
  fw.ctx = canvas.getContext("2d");
  fw.ctx.scale(dpr, dpr);

  fwLoadSector(i);

  const cellFromEvent = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (FW_GRID_W * FW_CELL / r.width);
    const y = (e.clientY - r.top) * (FW_GRID_H * FW_CELL / r.height);
    return [Math.floor(x / FW_CELL), Math.floor(y / FW_CELL)];
  };

  canvas.addEventListener("click", (e) => {
    const [cx, cy] = cellFromEvent(e);
    fwCanvasClick(cx, cy);
  });

  /* Show where a defence would go, and what ground it would cover, before you
     commit. The rAF loop only runs during a wave, so hovering asks for its own
     redraw — throttled to one per frame. */
  let hoverPending = false;
  canvas.addEventListener("mousemove", (e) => {
    const [cx, cy] = cellFromEvent(e);
    const prev = fw.hover;
    if (prev && prev.cx === cx && prev.cy === cy) return;
    fw.hover = { cx, cy, ok: fwCanPlant(cx, cy) };
    if (hoverPending) return;
    hoverPending = true;
    requestAnimationFrame(() => { hoverPending = false; fwDraw(); });
  });

  canvas.addEventListener("mouseleave", () => {
    if (!fw.hover) return;
    fw.hover = null;
    fwDraw();
  });

  main.querySelectorAll(".tower-btn:not(.locked)").forEach((b) => {
    b.addEventListener("click", () => {
      fw.selectedType = b.dataset.tower;
      fw.selectedTower = null;
      fwHud(); fwDraw();
    });
  });

  document.getElementById("fw-start").addEventListener("click", () => {
    if (fw.phase === "lost" || fw.phase === "won") { fwLoadSector(i); return; }
    if (fw.phase !== "build") return;
    fw.phase = "wave";
    fw.wave = 1;
    fwQueueWave();
    fwStartLoop();
    fwHud();
  });

  document.getElementById("fw-speed").addEventListener("click", () => {
    fw.speed = fw.speed === 1 ? 2 : 1;
    document.getElementById("fw-speed").textContent = fw.speed + "×";
  });

  const nextBtn = document.getElementById("fw-next");
  if (nextBtn) nextBtn.addEventListener("click", () => showStage(i + 1));
  window.scrollTo({ top: 0 });
}

/* Can the selected defence be planted in this bed? The same rules the click
   applies, so the hover never promises a placement that then fails. */
function fwCanPlant(cx, cy) {
  if (cx < 0 || cx >= FW_GRID_W || cy < 0 || cy >= FW_GRID_H) return false;
  if (fw.phase === "won" || fw.phase === "lost") return false;
  if (fw.towers.some((t) => t.cx === cx && t.cy === cy)) return false;
  if (fw.pathCells.has(cx + "," + cy)) return false;
  const spec = FW_TOWERS[fw.selectedType];
  return !!spec && fw.sector >= spec.unlockSector && fw.credits >= spec.cost;
}

function fwCanvasClick(cx, cy) {
  if (cx < 0 || cx >= FW_GRID_W || cy < 0 || cy >= FW_GRID_H) return;
  const existing = fw.towers.find((t) => t.cx === cx && t.cy === cy);
  if (existing) {
    fw.selectedTower = existing;
    fwHud(); fwDraw();
    return;
  }
  fw.selectedTower = null;
  if (fw.phase === "won" || fw.phase === "lost") return;
  if (fw.pathCells.has(cx + "," + cy)) return;
  const spec = FW_TOWERS[fw.selectedType];
  if (!spec || fw.sector < spec.unlockSector || fw.credits < spec.cost) { fwHud(); fwDraw(); return; }
  fw.credits -= spec.cost;
  fw.towers.push({ type: spec.key, cx, cy, x: cx * FW_CELL + FW_CELL / 2, y: cy * FW_CELL + FW_CELL / 2, level: 1, cool: 0, spent: spec.cost });
  fwHud(); fwDraw();
}

function fwUpgradeCost(t) { return Math.round(FW_TOWERS[t.type].cost * 0.6 * t.level); }

function fwHud() {
  const hud = document.getElementById("fw-hud");
  if (!hud) return;
  hud.innerHTML = `
    <span class="bug-stat">Seedling <strong>${Math.max(0, fw.integrity)}</strong>/10</span>
    <span class="bug-stat">Credits <strong>₵${fw.credits}</strong></span>
    <span class="bug-stat">Wave <strong>${fw.wave}</strong>/${fw.waves}</span>
    <span class="bug-best">${state.bugs.best[fw.sector] ? "best seedling " + state.bugs.best[fw.sector] : ""}</span>`;

  const startBtn = document.getElementById("fw-start");
  if (startBtn) {
    startBtn.textContent =
      fw.phase === "build" ? "Start the waves" :
      fw.phase === "wave" ? "Defending…" :
      fw.phase === "lost" ? "Breached — rebuild" : "Play again";
    startBtn.disabled = fw.phase === "wave";
  }

  const ins = document.getElementById("fw-inspect");
  if (ins) {
    if (fw.selectedTower) {
      const t = fw.selectedTower;
      const spec = FW_TOWERS[t.type];
      const up = fwUpgradeCost(t);
      ins.innerHTML = `
        <span class="fw-inspect-name" style="color:${spec.color}">${spec.name} <em>${spec.keyword}</em> · level ${t.level}</span>
        <button class="btn-hint fw-mini" id="fw-upgrade" ${t.level >= 3 || fw.credits < up ? "disabled" : ""}>
          ${t.level >= 3 ? "Max level" : "Upgrade ₵" + up}</button>
        <button class="btn-hint fw-mini" id="fw-sell">Sell ₵${Math.round(t.spent * 0.5)}</button>`;
      document.getElementById("fw-upgrade").addEventListener("click", () => {
        const cost = fwUpgradeCost(t);
        if (t.level < 3 && fw.credits >= cost) { fw.credits -= cost; t.spent += cost; t.level += 1; fwHud(); fwDraw(); }
      });
      document.getElementById("fw-sell").addEventListener("click", () => {
        fw.credits += Math.round(t.spent * 0.5);
        fw.towers = fw.towers.filter((x) => x !== t);
        fw.selectedTower = null;
        fwHud(); fwDraw();
      });
    } else {
      const spec = FW_TOWERS[fw.selectedType];
      ins.innerHTML = spec
        ? `<span class="fw-inspect-name" style="color:${spec.color}">${spec.name} <em>${spec.keyword}</em></span>
           <span class="fw-inspect-blurb">${spec.blurb} Range ${spec.range} · damage ${spec.dmg} · ₵${spec.cost}</span>`
        : "";
    }
  }

  document.querySelectorAll(".tower-btn").forEach((b) => {
    b.classList.toggle("selected", b.dataset.tower === fw.selectedType && !fw.selectedTower);
    if (!b.classList.contains("locked")) {
      b.classList.toggle("poor", fw.credits < FW_TOWERS[b.dataset.tower].cost);
    }
  });
}

/* ------------------------------------------------ render ----------------- */

/* A bug, drawn the way the field guide draws a beetle: wash body, ink
   outline, elytra seam, six legs, two antennae. Marching left to right, so
   the head faces the codebase it is walking toward. */
function fwDrawBeetle(c, x, y, r, ink, heading) {
  const w = r, h = r * 1.25;
  c.save();
  c.translate(x, y);
  c.rotate((heading || 0) + Math.PI / 2);
  c.lineWidth = 1.2;
  c.lineCap = "round";
  c.strokeStyle = ink;

  // legs first, so the body sits over their roots
  for (let s = -1; s <= 1; s += 2) {
    for (let l = -1; l <= 1; l++) {
      c.beginPath();
      c.moveTo(0, l * h * 0.42);
      c.quadraticCurveTo(s * w * 1.2, l * h * 0.5, s * w * 1.7, l * h * 0.95);
      c.stroke();
    }
  }

  // body
  c.fillStyle = ink + "22";
  c.beginPath();
  c.ellipse(0, h * 0.12, w, h, 0, 0, Math.PI * 2);
  c.fill();
  c.stroke();

  // elytra seam and the head end
  c.beginPath();
  c.moveTo(0, -h * 0.55);
  c.lineTo(0, h * 0.95);
  c.stroke();
  c.beginPath();
  c.ellipse(0, -h * 0.85, w * 0.5, h * 0.3, 0, 0, Math.PI * 2);
  c.stroke();

  // antennae
  for (let s = -1; s <= 1; s += 2) {
    c.beginPath();
    c.moveTo(s * w * 0.28, -h * 1.05);
    c.quadraticCurveTo(s * w * 0.9, -h * 1.5, s * w * 1.4, -h * 1.6);
    c.stroke();
  }
  c.restore();
}

function fwDraw() {
  const c = fw.ctx;
  if (!c) return;
  const W = FW_GRID_W * FW_CELL, H = FW_GRID_H * FW_CELL;

  c.fillStyle = "#FBF7ED";
  c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(23,19,9,0.05)";
  c.lineWidth = 1;
  for (let x = 1; x < FW_GRID_W; x++) { c.beginPath(); c.moveTo(x * FW_CELL + 0.5, 0); c.lineTo(x * FW_CELL + 0.5, H); c.stroke(); }
  for (let y = 1; y < FW_GRID_H; y++) { c.beginPath(); c.moveTo(0, y * FW_CELL + 0.5); c.lineTo(W, y * FW_CELL + 0.5); c.stroke(); }

  // the path
  c.strokeStyle = "#F2EBD9";
  c.lineWidth = 30;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.beginPath();
  fw.pathPx.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  c.strokeStyle = "#D3C9B2";
  c.lineWidth = 1.3;
  c.setLineDash([5, 7]);
  c.beginPath();
  fw.pathPx.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  c.setLineDash([]);

  // what the pests are marching on: the seedling grown in the lesson
  const [ex, ey] = fw.pathPx[fw.pathPx.length - 1];
  const step = String(Math.max(0, Math.min(10, Math.round(fw.integrity))));
  const seed = fwArt.seedling[step];
  if (seed) {
    /* the last waypoint sits just off the board, so keep the seedling inside it */
    const sx = Math.min(ex - 26, FW_GRID_W * FW_CELL - 56);
    c.drawImage(seed, sx, ey - 30, 52, 52);
  } else {
    c.fillStyle = "#2E5E3A";
    c.font = "600 11px 'Geist Mono', monospace";
    c.textAlign = "center";
    c.fillText("seedling", ex - 20, ey + 4);
  }

  // the bed the hovered defence would go in, and the ground it would cover
  if (fw.hover && fw.phase !== "lost") {
    const { cx, cy, ok } = fw.hover;
    const px = cx * FW_CELL, py = cy * FW_CELL;
    c.save();
    c.fillStyle = ok ? "rgba(46,94,58,0.10)" : "rgba(180,70,42,0.10)";
    c.fillRect(px, py, FW_CELL, FW_CELL);
    c.strokeStyle = ok ? "rgba(46,94,58,0.55)" : "rgba(180,70,42,0.5)";
    c.lineWidth = 1.2;
    c.setLineDash([4, 4]);
    c.strokeRect(px + 1, py + 1, FW_CELL - 2, FW_CELL - 2);
    c.setLineDash([]);
    const spec = FW_TOWERS[fw.selectedType];
    if (ok && spec) {
      const gx = px + FW_CELL / 2, gy = py + FW_CELL / 2;
      c.strokeStyle = spec.color + "44";
      c.fillStyle = spec.color + "0E";
      c.beginPath();
      c.arc(gx, gy, spec.range, 0, Math.PI * 2);
      c.fill(); c.stroke();
      const art = fwArt.defence[spec.key];
      if (art) { c.globalAlpha = 0.45; c.drawImage(art, gx - 17, gy - 19, 34, 34); c.globalAlpha = 1; }
    }
    c.restore();
  }

  // tower range preview for selection
  const sel = fw.selectedTower;
  if (sel) {
    const spec = FW_TOWERS[sel.type];
    c.fillStyle = spec.color + "14";
    c.strokeStyle = spec.color + "55";
    c.beginPath();
    c.arc(sel.x, sel.y, spec.range * (1 + 0.15 * (sel.level - 1)), 0, Math.PI * 2);
    c.fill(); c.stroke();
  }

  // the defences, drawn — and upgrades read as growth rather than pips
  for (const t of fw.towers) {
    const spec = FW_TOWERS[t.type];
    const grow = 0.86 + (t.level - 1) * 0.15;      // level 1 → 3 gets visibly bigger
    const size = 34 * grow;

    // the bed it stands in
    c.fillStyle = spec.bg;
    c.strokeStyle = t === fw.selectedTower ? spec.color : spec.color + "66";
    c.lineWidth = t === fw.selectedTower ? 2 : 1.2;
    c.beginPath();
    c.arc(t.x, t.y, 17, 0, Math.PI * 2);
    c.fill(); c.stroke();

    // a full-grown defence earns a second ring
    if (t.level >= 3) {
      c.strokeStyle = spec.color + "55";
      c.lineWidth = 1;
      c.beginPath();
      c.arc(t.x, t.y, 20.5, 0, Math.PI * 2);
      c.stroke();
    }

    const art = fwArt.defence[t.type];
    if (art) {
      c.drawImage(art, t.x - size / 2, t.y - size / 2 - 2, size, size);
    } else {
      c.fillStyle = spec.color;
      c.font = "600 9px 'Geist Mono', monospace";
      c.textAlign = "center";
      c.fillText(spec.name, t.x, t.y + 3.5);
    }
  }

  // bugs, drawn as the same entomological beetle the map uses
  for (const b of fw.bugs) {
    const [x, y] = fwPointAt(b.dist);
    const r = b.kind === "tank" ? 11 : b.kind === "runner" ? 6 : 8;
    const ink = b.slow > 0 ? "#2B4C7E"
      : b.kind === "tank" ? "#171309"
      : b.kind === "runner" ? "#A97708"
      : "#3A342A";
    const [ax, ay] = fwPointAt(Math.min(b.dist + 6, fw.pathLen));
    const heading = ax === x && ay === y ? 0 : Math.atan2(ay - y, ax - x);
    fwDrawBeetle(c, x, y, r, ink, heading);
    // hp bar
    c.fillStyle = "#E3D9C2";
    c.fillRect(x - 10, y - r - 9, 20, 3);
    c.fillStyle = "#2E5E3A";
    c.fillRect(x - 10, y - r - 9, 20 * Math.max(0, b.hp / b.maxHp), 3);
  }

  // effects
  for (const e of fw.effects) {
    if (e.kind === "beam") {
      c.strokeStyle = e.color;
      c.lineWidth = 2;
      c.globalAlpha = Math.min(1, e.ttl / 0.12);
      c.beginPath(); c.moveTo(e.x, e.y); c.lineTo(e.bx, e.by); c.stroke();
      c.globalAlpha = 1;
    } else if (e.kind === "pulse") {
      c.strokeStyle = e.color;
      c.lineWidth = 2;
      c.globalAlpha = e.ttl / 0.25 * 0.6;
      c.beginPath(); c.arc(e.x, e.y, e.r * (1 - e.ttl / 0.25 * 0.3), 0, Math.PI * 2); c.stroke();
      c.globalAlpha = 1;
    } else if (e.kind === "pop") {
      // a stopped pest is pinned as a specimen, then fades from the board
      const f = Math.max(0, e.ttl / 0.5);
      c.save();
      c.globalAlpha = f;
      c.strokeStyle = e.color;
      c.fillStyle = e.color;
      c.lineWidth = 1.2;
      c.beginPath();                                  // the pin
      c.moveTo(e.x + 7, e.y - 9);
      c.lineTo(e.x, e.y);
      c.stroke();
      c.beginPath();                                  // its head
      c.arc(e.x + 7.6, e.y - 9.8, 2, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = f * 0.5;                        // the specimen beneath it
      c.beginPath();
      c.ellipse(e.x, e.y + 1, 5, 6.5, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }

  // phase overlays
  if (fw.phase === "lost" || fw.phase === "won" || fw.phase === "build") {
    if (fw.phase !== "build" || fw.towers.length === 0) {
      c.fillStyle = "rgba(251,247,237,0.78)";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#171309";
      c.font = "500 24px Fraunces, Georgia, serif";
      c.textAlign = "center";
      c.fillText(
        fw.phase === "lost" ? "The firewall was breached" :
        fw.phase === "won" ? "Sector secured" :
        "Build your defenses",
        W / 2, H / 2 - 8);
      c.fillStyle = "#9A907C";
      c.font = "12px 'Geist Mono', monospace";
      c.fillText(
        fw.phase === "lost" ? "Rebuild and try a new layout — no penalty" :
        fw.phase === "won" ? "" :
        "Pick a tower below, then click an empty tile",
        W / 2, H / 2 + 16);
    }
  }
}

/* ------------------------------------------------ journey map ------------ */

const BUG_GLYPH = `<path d="M-4 0 a4 4.6 0 1 0 8 0 a4 4.6 0 1 0 -8 0 M0 -4.6 L0 4.6 M-4 -2 l-2.4 -1.6 M-4 2 l-2.6 0.6 M4 -2 l2.4 -1.6 M4 2 l2.6 0.6 M-1.6 -5.8 l-1 -1.6 M1.6 -5.8 l1 -1.6" stroke="currentColor" stroke-width="1.1" fill="none"/>`;

// map colors, centralised (SVG strings cannot read CSS variables)
const MAP_INK = {
  ink: "#171309", line: "#E3D9C2", muted: "#756D5D", faint: "#9A907C",
  pencil: "#D3C9B2", fern: "#2E5E3A", amber: "#A97708",
};

// two layouts: 4-across desktop, 2-across large-type mobile
function mapPreset() {
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches;
  return mobile
    ? { cols: [120, 300], w: 420, y0: 66, rowH: 104, stageR: 27, numSize: 19, labelSize: 13, labelDy: 50, bugR: 15, ringPad: 9, leaf: 20 }
    : { cols: [86, 242, 398, 554], w: 640, y0: 66, rowH: 100, stageR: 24, numSize: 17, labelSize: 10.5, labelDy: 46, bugR: 13, ringPad: 8, leaf: 17 };
}

function journeyNodes(P) {
  const nodes = [];
  for (let i = 0; i < STAGES.length; i++) {
    nodes.push({ type: "stage", idx: i });
    if (i < STAGES.length - 1) nodes.push({ type: "bug", idx: i });
  }
  const n = P.cols.length;
  return nodes.map((node, k) => {
    const row = Math.floor(k / n);
    const col = k % n;
    node.x = row % 2 === 0 ? P.cols[col] : P.cols[n - 1 - col];
    node.y = P.y0 + row * P.rowH;
    return node;
  });
}

function nodeComplete(n) {
  return n.type === "stage" ? stageDone(STAGES[n.idx]) : bugDone(n.idx);
}

function nodeUnlocked(n) {
  return n.type === "stage" ? stageUnlocked(n.idx) : stageDone(STAGES[n.idx]);
}

/* The trail is one vine: inked and leafed as far as you have got, pencil
   underdrawing beyond. Stages are specimen medallions on it, Firewall sectors
   are beetles perched between them. */
function journeyMapSvg() {
  const P = mapPreset();
  const nodes = journeyNodes(P);
  const step = nextJourneyStep();
  const H = nodes[nodes.length - 1].y + P.y0;
  let s = `<svg viewBox="0 0 ${P.w} ${H}" class="journey-svg" role="list" aria-label="Course journey map">`;

  /* the stem, one gently curved segment at a time so each can carry its own state */
  let leaves = "";
  for (let k = 1; k < nodes.length; k++) {
    const a = nodes[k - 1], b = nodes[k];
    const done = nodeComplete(a);
    const dx = b.x - a.x, dy = b.y - a.y;
    /* bow each length of stem sideways, alternating, so the trail grows
       rather than being ruled */
    const seg = Math.hypot(dx, dy) || 1;
    const nx = -dy / seg, ny = dx / seg;
    const bow = (k % 2 ? 1 : -1) * Math.min(14, seg * 0.11);
    const c1x = a.x + dx * 0.3 + nx * bow, c1y = a.y + dy * 0.3 + ny * bow;
    const c2x = b.x - dx * 0.3 + nx * bow, c2y = b.y - dy * 0.3 + ny * bow;
    s += `<path class="jstem ${done ? "inked" : "pencil"}" fill="none"
           d="M ${a.x} ${a.y} C ${c1x} ${c1y} ${c2x} ${c2y} ${b.x} ${b.y}"/>`;

    /* a leaf on every stretch of vine you have actually grown, sitting on the
       curve itself and leaning off it */
    if (done) {
      const mx = (a.x + 3 * c1x + 3 * c2x + b.x) / 8;
      const my = (a.y + 3 * c1y + 3 * c2y + b.y) / 8;
      const out = bow >= 0 ? 1 : -1;
      const angle = (Math.atan2(ny * out, nx * out) * 180) / Math.PI + (k % 2 ? 22 : -22);
      const tone = ILLO.stageInk(k);
      leaves += `<g class="jleaf" style="color:${tone.ink}">` +
                ILLO.leafMark(mx, my, P.leaf, angle, k) + `</g>`;
    }
  }
  s += leaves;

  nodes.forEach((n, k) => {
    const complete = nodeComplete(n);
    const unlocked = nodeUnlocked(n);
    const isNext = step.type === n.type && step.idx === n.idx && !complete;
    const id = n.type + "-" + n.idx;
    n.delay = Math.min(k * 22, 900);

    if (n.type === "stage") {
      const tone = ILLO.stageInk(n.idx);
      const color = complete || unlocked ? tone.ink : MAP_INK.pencil;
      const size = P.stageR * 2;
      const scale = size / 64;
      const aria = `Stage ${n.idx + 1}: ${STAGES[n.idx].name}${complete ? ", completed" : isNext ? ", your next step" : ""}`;
      s += `<g class="jnode medallion ${unlocked ? "live" : "future"}" data-node="${id}"` +
           ` style="--pop:${n.delay}ms;color:${color}"${unlocked ? ` tabindex="0" role="button" aria-label="${aria}"` : ` aria-label="${aria}"`}>`;
      if (isNext) s += `<circle cx="${n.x}" cy="${n.y}" r="${P.stageR + P.ringPad}" fill="none" stroke="currentColor" stroke-opacity="0.4" stroke-width="1.2" class="pulse-ring"/>`;
      s += `<g transform="translate(${n.x - size / 2} ${n.y - size / 2}) scale(${scale})" stroke-width="${(1.4 / scale).toFixed(2)}">${ILLO.medallionInner(n.idx)}</g>`;
      s += `<text class="jlabel" x="${n.x}" y="${n.y + P.labelDy}" text-anchor="middle"
                  font-size="${P.labelSize}">${shortName(STAGES[n.idx].name)}</text>`;
      s += `</g>`;
    } else {
      const color = complete ? MAP_INK.fern : unlocked ? MAP_INK.amber : MAP_INK.pencil;
      const w = P.bugR * 2.1;
      const scale = w / 120;
      const aria = `Firewall sector ${n.idx + 1}${complete ? ", defended" : isNext ? ", your next step" : ""}`;
      s += `<g class="jnode beetle ${unlocked ? "live" : "future"}" data-node="${id}"` +
           ` style="--pop:${n.delay}ms;color:${color}"${unlocked ? ` tabindex="0" role="button" aria-label="${aria}"` : ` aria-label="${aria}"`}>`;
      if (isNext) s += `<circle cx="${n.x}" cy="${n.y}" r="${P.bugR + P.ringPad}" fill="none" stroke="currentColor" stroke-opacity="0.45" stroke-width="1.2" class="pulse-ring"/>`;
      s += `<g transform="translate(${n.x - w / 2} ${n.y - (w * 140 / 120) / 2}) scale(${scale})" stroke-width="${(1.4 / scale).toFixed(2)}">${ILLO.beetleInner()}</g>`;
      s += `</g>`;
    }
  });

  s += `</svg>`;
  return s;
}

function shortName(name) {
  return name.replace("Capstone: ", "").replace("Master Capstone: ", "").split(" & ")[0].split(": ")[0];
}

function wireJourneyMap(container) {
  container.querySelectorAll(".jnode.live").forEach((g) => {
    const go = () => {
      const [type, idx] = g.dataset.node.split("-");
      if (type === "stage") showStage(Number(idx));
      else showBugHunt(Number(idx));
    };
    g.addEventListener("click", go);
    g.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); }
    });
  });
}

// re-render the map when crossing the mobile/desktop breakpoint
if (typeof window !== "undefined") {
  window.matchMedia("(max-width: 700px)").addEventListener("change", () => {
    if (activeStageIdx === null) showHome();
  });
}

// pause the defense when the tab is hidden — rAF stops anyway; this keeps state clean
document.addEventListener("visibilitychange", () => {
  if (document.hidden) fwStopLoop();
  else if (fw.phase === "wave" && activeStageIdx === "bug:" + fw.sector) fwStartLoop();
});
