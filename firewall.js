// PyQuest — Firewall: tower defense between stages.
// Bugs march a winding path toward your codebase. Place Python-keyword
// towers to stop them. Each sector (between stage N and N+1) is a harder
// wave set; new tower types unlock as you advance through the course.

const FW_XP = 5;
const FW_GRID_W = 14, FW_GRID_H = 10, FW_CELL = 40;

// path waypoints in cell coordinates (entry off-screen left, exit right)
const FW_WAYPOINTS = [
  [-1, 2], [3, 2], [3, 7], [7, 7], [7, 1], [11, 1], [11, 5], [14, 5],
];

const FW_TOWERS = {
  print: { key: "print",  label: "print()", cost: 50,  range: 95,  dmg: 9,  rate: 0.55, color: "#2A5680", bg: "#E7EEF7", unlockSector: 0,
           blurb: "Reliable single-target zapper." },
  loop:  { key: "loop",   label: "for",     cost: 80,  range: 75,  dmg: 5,  rate: 0.9,  color: "#41603F", bg: "#EBF0E8", unlockSector: 3, aoe: true,
           blurb: "Pulses damage to every bug in range." },
  cond:  { key: "cond",   label: "if",      cost: 60,  range: 85,  dmg: 1,  rate: 0.7,  color: "#8C6516", bg: "#FAF1DF", unlockSector: 7, slow: 0.45,
           blurb: "Filters the stream — slows bugs it hits." },
  func:  { key: "func",   label: "def",     cost: 120, range: 150, dmg: 42, rate: 1.5,  color: "#96432C", bg: "#F8EAE4", unlockSector: 11,
           blurb: "Long-range heavy cannon. Slow, devastating." },
};

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
    fw.effects.push({ kind: "pop", x: bx, y: by, ttl: 0.3, color: "#96432C" });
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
      <span class="tower-key">${t.label}</span>
      <span class="tower-cost">${locked ? "Sector " + (t.unlockSector + 1) : "₵" + t.cost}</span>
    </button>`;
  }).join("");

  main.innerHTML = `
    <p class="stage-kicker reveal" style="--index:0">Firewall · between Stage ${i + 1} and Stage ${i + 2}</p>
    <h1 class="stage-title reveal" style="--index:0">Defend Sector ${i + 1}</h1>
    <div class="lesson-prose reveal" style="--index:1">
      <p>Stage ${i + 1}'s escaped bugs are marching on your codebase. Pick a tower,
      click an empty tile beside the path to build it, then start the waves.
      Click a placed tower to <strong>upgrade</strong> or sell it. Kills earn credits;
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
      <span class="muted-note">Towers: print() zaps, for pulses everyone in range, if slows, def hits like a train.</span>
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

  canvas.addEventListener("click", (e) => {
    const r = canvas.getBoundingClientRect();
    const x = (e.clientX - r.left) * (FW_GRID_W * FW_CELL / r.width);
    const y = (e.clientY - r.top) * (FW_GRID_H * FW_CELL / r.height);
    fwCanvasClick(Math.floor(x / FW_CELL), Math.floor(y / FW_CELL));
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
    <span class="bug-stat">Integrity <strong>${Math.max(0, fw.integrity)}</strong>/10</span>
    <span class="bug-stat">Credits <strong>₵${fw.credits}</strong></span>
    <span class="bug-stat">Wave <strong>${fw.wave}</strong>/${fw.waves}</span>
    <span class="bug-best">${state.bugs.best[fw.sector] ? "best integrity " + state.bugs.best[fw.sector] : ""}</span>`;

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
        <span class="fw-inspect-name" style="color:${spec.color}">${spec.label} · level ${t.level}</span>
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
        ? `<span class="fw-inspect-name" style="color:${spec.color}">${spec.label}</span>
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

function fwDraw() {
  const c = fw.ctx;
  if (!c) return;
  const W = FW_GRID_W * FW_CELL, H = FW_GRID_H * FW_CELL;

  c.fillStyle = "#FCFBF8";
  c.fillRect(0, 0, W, H);
  c.strokeStyle = "rgba(0,0,0,0.045)";
  c.lineWidth = 1;
  for (let x = 1; x < FW_GRID_W; x++) { c.beginPath(); c.moveTo(x * FW_CELL + 0.5, 0); c.lineTo(x * FW_CELL + 0.5, H); c.stroke(); }
  for (let y = 1; y < FW_GRID_H; y++) { c.beginPath(); c.moveTo(0, y * FW_CELL + 0.5); c.lineTo(W, y * FW_CELL + 0.5); c.stroke(); }

  // the path
  c.strokeStyle = "#EDEAE3";
  c.lineWidth = 30;
  c.lineJoin = "round";
  c.lineCap = "round";
  c.beginPath();
  fw.pathPx.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  c.strokeStyle = "#D8D3C8";
  c.lineWidth = 1.5;
  c.setLineDash([5, 7]);
  c.beginPath();
  fw.pathPx.forEach(([x, y], k) => (k ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  c.setLineDash([]);

  // the codebase to defend (path end)
  const [ex, ey] = fw.pathPx[fw.pathPx.length - 1];
  c.fillStyle = "#12100D";
  c.font = "600 11px 'Geist Mono', monospace";
  c.textAlign = "center";
  c.fillText("{ code }", ex - 18, ey + 4);

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

  // towers
  for (const t of fw.towers) {
    const spec = FW_TOWERS[t.type];
    c.fillStyle = spec.bg;
    c.strokeStyle = spec.color;
    c.lineWidth = t === fw.selectedTower ? 2.4 : 1.5;
    c.beginPath();
    c.arc(t.x, t.y, 15, 0, Math.PI * 2);
    c.fill(); c.stroke();
    c.fillStyle = spec.color;
    c.font = "600 10px 'Geist Mono', monospace";
    c.textAlign = "center";
    c.fillText(spec.label.replace("()", ""), t.x, t.y + 3.5);
    for (let l = 0; l < t.level - 1; l++) {
      c.beginPath();
      c.arc(t.x - 6 + l * 6, t.y + 10.5, 1.8, 0, Math.PI * 2);
      c.fill();
    }
  }

  // bugs
  for (const b of fw.bugs) {
    const [x, y] = fwPointAt(b.dist);
    const r = b.kind === "tank" ? 11 : b.kind === "runner" ? 6 : 8;
    c.strokeStyle = "#35312B";
    c.lineWidth = 1.2;
    for (let a = 0; a < 3; a++) {
      const ang = (a - 1) * 0.7;
      c.beginPath();
      c.moveTo(x - Math.cos(ang) * (r + 4), y - Math.sin(ang) * (r + 4));
      c.lineTo(x + Math.cos(ang) * (r + 4), y + Math.sin(ang) * (r + 4));
      c.stroke();
    }
    c.fillStyle = b.kind === "tank" ? "#35312B" : b.kind === "runner" ? "#8C6516" : "#5A554D";
    if (b.slow > 0) c.fillStyle = "#2A5680";
    c.beginPath();
    c.ellipse(x, y, r, r * 1.2, 0, 0, Math.PI * 2);
    c.fill();
    // hp bar
    c.fillStyle = "#E8E4DC";
    c.fillRect(x - 10, y - r - 9, 20, 3);
    c.fillStyle = "#41603F";
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
      c.fillStyle = e.color;
      c.globalAlpha = e.ttl / 0.3;
      c.beginPath(); c.arc(e.x, e.y, 6 * (1.6 - e.ttl / 0.3), 0, Math.PI * 2); c.fill();
      c.globalAlpha = 1;
    }
  }

  // phase overlays
  if (fw.phase === "lost" || fw.phase === "won" || fw.phase === "build") {
    if (fw.phase !== "build" || fw.towers.length === 0) {
      c.fillStyle = "rgba(251,251,250,0.72)";
      c.fillRect(0, 0, W, H);
      c.fillStyle = "#12100D";
      c.font = "500 24px Fraunces, Georgia, serif";
      c.textAlign = "center";
      c.fillText(
        fw.phase === "lost" ? "The firewall was breached" :
        fw.phase === "won" ? "Sector secured" :
        "Build your defenses",
        W / 2, H / 2 - 8);
      c.fillStyle = "#8C8578";
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
const MAP_INK = { ink: "#12100D", line: "#D8D3C8", muted: "#6F6A61", faint: "#A79F92" };

// two layouts: 4-across desktop, 2-across large-type mobile
function mapPreset() {
  const mobile = typeof window !== "undefined" && window.matchMedia("(max-width: 700px)").matches;
  return mobile
    ? { cols: [120, 300], w: 420, y0: 62, rowH: 98, stageR: 26, numSize: 19, labelSize: 13, labelDy: 48, bugR: 15, ringPad: 8 }
    : { cols: [86, 242, 398, 554], w: 640, y0: 64, rowH: 96, stageR: 23, numSize: 17, labelSize: 10.5, labelDy: 44, bugR: 13, ringPad: 7 };
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

function journeyMapSvg() {
  const P = mapPreset();
  const nodes = journeyNodes(P);
  const step = nextJourneyStep();
  const H = nodes[nodes.length - 1].y + P.y0;
  let s = `<svg viewBox="0 0 ${P.w} ${H}" class="journey-svg" role="list" aria-label="Course journey map">`;

  for (let k = 1; k < nodes.length; k++) {
    const a = nodes[k - 1], b = nodes[k];
    const done = nodeComplete(a);
    s += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"
           stroke="${done ? "#12100D" : "#D8D3C8"}" stroke-width="${done ? 2.5 : 2}"
           ${done ? "" : `stroke-dasharray="3 6"`} stroke-linecap="round"/>`;
  }

  nodes.forEach((n, k) => {
    const complete = nodeComplete(n);
    const unlocked = nodeUnlocked(n);
    const isNext = step.type === n.type && step.idx === n.idx && !complete;
    const id = n.type + "-" + n.idx;
    n.delay = Math.min(k * 22, 900);

    if (n.type === "stage") {
      const c = PASTELS[STAGES[n.idx].badge.color];
      const fill = complete ? c.bg : unlocked ? "#FFFFFF" : "#F5F3EE";
      const ring = complete ? c.ink : unlocked ? MAP_INK.ink : MAP_INK.line;
      const txt = complete ? c.ink : unlocked ? MAP_INK.ink : MAP_INK.faint;
      const aria = `Stage ${n.idx + 1}: ${STAGES[n.idx].name}${complete ? ", completed" : isNext ? ", your next step" : ""}`;
      s += `<g class="jnode ${unlocked ? "live" : ""}" data-node="${id}" style="--pop:${n.delay}ms"${unlocked ? ` tabindex="0" role="button" aria-label="${aria}"` : ""}>`;
      if (isNext) s += `<circle cx="${n.x}" cy="${n.y}" r="${n.type === "stage" ? P.stageR + P.ringPad : P.bugR + P.ringPad}" fill="none" stroke="${MAP_INK.ink}" stroke-opacity="0.35" stroke-width="1.5" class="pulse-ring"/>`;
      s += `<circle cx="${n.x}" cy="${n.y}" r="${P.stageR}" fill="${fill}" stroke="${ring}" stroke-width="1.8"/>
            <text x="${n.x}" y="${n.y + P.numSize * 0.36}" text-anchor="middle" font-family="Fraunces, Georgia, serif"
                  font-size="${P.numSize}" font-weight="600" fill="${txt}">${n.idx + 1}</text>
            <text x="${n.x}" y="${n.y + P.labelDy}" text-anchor="middle" font-family="'Geist Sans', sans-serif"
                  font-size="${P.labelSize}" fill="${unlocked ? MAP_INK.muted : MAP_INK.faint}">${shortName(STAGES[n.idx].name)}</text>`;
      s += `</g>`;
    } else {
      const fill = complete ? "#EBF0E8" : unlocked ? "#FAF1DF" : "#F5F3EE";
      const ring = complete ? "#41603F" : unlocked ? "#8C6516" : MAP_INK.line;
      const aria = `Firewall sector ${n.idx + 1}${complete ? ", defended" : isNext ? ", your next step" : ""}`;
      s += `<g class="jnode ${unlocked ? "live" : ""}" data-node="${id}" style="--pop:${n.delay}ms"${unlocked ? ` tabindex="0" role="button" aria-label="${aria}"` : ""}>`;
      if (isNext) s += `<circle cx="${n.x}" cy="${n.y}" r="${P.bugR + P.ringPad}" fill="none" stroke="#8C6516" stroke-opacity="0.5" stroke-width="1.5" class="pulse-ring"/>`;
      s += `<circle cx="${n.x}" cy="${n.y}" r="${P.bugR}" fill="${fill}" stroke="${ring}" stroke-width="1.5"/>`;
      const glyphScale = P.bugR / 13;
      s += complete
        ? `<path d="M${n.x - 5 * glyphScale} ${n.y} l${3.4 * glyphScale} ${3.6 * glyphScale} l${6.6 * glyphScale} ${-7 * glyphScale}" stroke="#41603F" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
        : `<g transform="translate(${n.x} ${n.y}) scale(${glyphScale})" color="${unlocked ? "#8C6516" : MAP_INK.faint}">${BUG_GLYPH}</g>`;
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
