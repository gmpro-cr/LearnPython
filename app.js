// PyQuest engine: state, rendering, Pyodide runner, rewards.

/* ------------------------------------------------ state ------------------ */

const STORE_KEY = "pyquest-progress-v1";

function loadState() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (!s.bugs) s.bugs = { cleared: {}, best: {} };
      delete s.arcade; delete s.vaults; delete s.space;
      return s;
    }
  } catch (e) { /* corrupted state falls through to fresh */ }
  return { xp: 0, done: {}, badges: [], streak: 0, bugs: { cleared: {}, best: {} } };
}

const state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    // storage unavailable (private browsing / quota) — keep playing in memory
  }
}

const totalExercises = STAGES.reduce((n, s) => n + s.exercises.length, 0);

function stageDone(stage) {
  return stage.exercises.every((ex) => state.done[ex.id]);
}

function stageUnlocked(idx) {
  if (idx === 0) return true;
  return stageDone(STAGES[idx - 1]) && bugDone(idx - 1);
}

function doneCount() {
  return Object.keys(state.done).length;
}

function currentLevel() {
  let lvl = LEVELS[0];
  for (const l of LEVELS) if (state.xp >= l.at) lvl = l;
  return lvl;
}

function nextLevel() {
  for (const l of LEVELS) if (state.xp < l.at) return l;
  return null;
}

/* ------------------------------------------------ python engine ---------- */
// Pyodide lives in a Web Worker so learner code can never freeze the page.
// A watchdog terminates runs that exceed RUN_TIMEOUT_MS (infinite loops)
// and boots a fresh engine automatically.

let worker = null;
let pyReady = false;
let runSeq = 0;
const pending = new Map();
const RUN_TIMEOUT_MS = 10000;

function setEngineStatus(cls, text) {
  const dot = document.querySelector(".engine-dot");
  dot.classList.remove("loading", "ready", "error");
  dot.classList.add(cls);
  document.getElementById("engine-label").textContent = text;
}

function setRunButtons(enabled) {
  document.querySelectorAll(".btn-run").forEach((b) => (b.disabled = !enabled));
}

function bootPython(restarting) {
  pyReady = false;
  setEngineStatus("loading", restarting ? "Restarting Python engine" : "Starting Python engine");
  setRunButtons(false);
  worker = new Worker("worker.js?v=4");
  worker.onmessage = (e) => {
    const msg = e.data;
    if (msg.type === "ready") {
      pyReady = true;
      setEngineStatus("ready", "Python ready");
      setRunButtons(true);
    } else if (msg.type === "boot-error") {
      setEngineStatus("error", "Engine failed — check connection and reload");
    } else if (msg.type === "result") {
      const p = pending.get(msg.id);
      if (p) {
        clearTimeout(p.timer);
        pending.delete(msg.id);
        p.resolve(JSON.parse(msg.raw));
      }
    }
  };
  worker.onerror = () => setEngineStatus("error", "Engine failed — check connection and reload");
}

function runExercise(code, check) {
  return new Promise((resolve) => {
    const id = ++runSeq;
    const timer = setTimeout(() => {
      pending.delete(id);
      worker.terminate();
      resolve({ out: "", error: null, passed: false, feedback: "", timedOut: true });
      bootPython(true);
    }, RUN_TIMEOUT_MS);
    pending.set(id, { resolve, timer });
    worker.postMessage({ type: "run", id, code, check });
  });
}

/* ------------------------------------------------ syntax highlight ------- */
// Minimal Python highlighter for lesson examples. Colors comments, strings,
// keywords, builtins and numbers using the site's pastel ink palette.

function hlPython(sourceText) {
  const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const plain = (s) => esc(s)
    .replace(/\b(def|return|if|elif|else|for|while|in|and|or|not|try|except|raise|class|import|from|yield|lambda|pass|break|continue|with|as)\b/g, '<span class="tok-kw">$1</span>')
    .replace(/\b(True|False|None)\b/g, '<span class="tok-num">$1</span>')
    .replace(/\b(print|len|range|int|str|sum|sorted|set|list|dict|next|super|isinstance|append|upper)\b/g, '<span class="tok-fn">$1</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="tok-num">$1</span>');
  const re = /(#[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')/g;
  let out = "", last = 0, m;
  while ((m = re.exec(sourceText))) {
    out += plain(sourceText.slice(last, m.index));
    if (m[1]) out += '<span class="tok-com">' + esc(m[1]) + "</span>";
    else out += '<span class="tok-str">' + esc(m[2]) + "</span>";
    last = m.index + m[0].length;
  }
  return out + plain(sourceText.slice(last));
}

function highlightExamples(container) {
  container.querySelectorAll(".code-example").forEach((pre) => {
    [...pre.childNodes].forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent.trim() !== "") {
        const span = document.createElement("span");
        span.innerHTML = hlPython(node.textContent);
        node.replaceWith(span);
      }
    });
  });
}

/* ------------------------------------------------ svg helpers ------------ */

function badgeSvg(stageIdx, size) {
  return ILLO.medallion(stageIdx, size || 56, {
    label: `Badge for stage ${stageIdx + 1}: ${STAGES[stageIdx].badge.label}`,
  });
}

const BUG_MINI_SVG = `<svg width="12" height="12" viewBox="-10 -10 20 20" color="currentColor"><g>${typeof BUG_GLYPH !== "undefined" ? BUG_GLYPH : ""}</g></svg>`;

const CHECK_SVG = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.2 3L13 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/* ------------------------------------------------ header / sidebar ------- */

function refreshHeader(bump) {
  document.getElementById("xp-count").textContent = state.xp;
  document.getElementById("level-tag").textContent = currentLevel().name;
  if (bump) {
    const pill = document.querySelector(".xp-pill");
    pill.classList.remove("bump");
    void pill.offsetWidth;
    pill.classList.add("bump");
  }
}

let activeStageIdx = null; // null = home

function refreshSidebar() {
  const list = document.getElementById("stage-list");
  list.innerHTML = "";

  TRACKS.forEach((track) => {
    const heading = document.createElement("p");
    heading.className = "track-heading";
    let trackDone = 0, trackTotal = 0;
    for (let k = track.from; k <= track.to && k < STAGES.length; k++) {
      trackTotal++;
      if (stageDone(STAGES[k])) trackDone++;
    }
    heading.innerHTML = `${track.name}<span class="track-count">${trackDone}/${trackTotal}</span>`;
    list.appendChild(heading);

    for (let idx = track.from; idx <= track.to && idx < STAGES.length; idx++) {
      const stage = STAGES[idx];
      const unlocked = stageUnlocked(idx);
      const complete = stageDone(stage);
      const btn = document.createElement("button");
      btn.className = "stage-item" +
        (complete ? " done" : "") +
        (idx === activeStageIdx ? " active" : "") +
        (!unlocked ? " locked" : "");
      btn.dataset.stage = idx;
      btn.style.setProperty("--stage-ink", ILLO.stageInk(idx).ink);
      btn.innerHTML =
        `<span class="stage-num">${idx + 1}</span>` +
        `<span class="stage-name">${stage.name}</span>` +
        (!unlocked ? `<span class="stage-glyph">${ILLO.pressed(14)}</span>` : "");
      if (unlocked) btn.addEventListener("click", () => showStage(idx));
      else btn.disabled = true;
      list.appendChild(btn);

      // the bug hunt linking this stage to the next
      if (idx < STAGES.length - 1) {
        const hReady = stageDone(stage) && !bugDone(idx);
        const hDone = bugDone(idx);
        const hBtn = document.createElement("button");
        hBtn.className = "hunt-item" +
          (activeStageIdx === "bug:" + idx ? " active" : "") +
          (hDone ? " done" : hReady ? " ready" : " sealed");
        hBtn.innerHTML =
          `<span class="hunt-glyph">${hDone ? CHECK_SVG : BUG_MINI_SVG}</span>` +
          `<span class="hunt-name">Firewall ${idx + 1}${hReady ? " — defend it" : ""}</span>`;
        if (stageDone(stage)) hBtn.addEventListener("click", () => showBugHunt(idx));
        else hBtn.disabled = true;
        list.appendChild(hBtn);
      }
    }
  });

  growVine();

  // quiet two-step reset control (no browser confirm dialogs)
  const foot = document.getElementById("sidebar-foot");
  foot.innerHTML = "";
  const reset = document.createElement("button");
  reset.className = "reset-btn";
  reset.textContent = "Reset all progress";
  reset.addEventListener("click", () => {
    if (reset.dataset.armed) {
      localStorage.removeItem(STORE_KEY);
      state.xp = 0; state.done = {}; state.badges = []; state.streak = 0;
      refreshHeader(false);
      showHome();
    } else {
      reset.dataset.armed = "1";
      reset.textContent = "Click again to erase everything";
      setTimeout(() => { delete reset.dataset.armed; reset.textContent = "Reset all progress"; }, 4000);
    }
  });
  foot.appendChild(reset);

  const nxt = nextLevel();
  document.getElementById("progress-note").textContent =
    `${doneCount()} of ${totalExercises} exercises` +
    (nxt ? ` · ${nxt.name} at ${nxt.at} XP` : " · top rank reached");
}

/* ------------------------------------------------ the vine --------------- */

/* Set by celebrateStage: the stage whose leaf should draw itself in rather
   than simply being there on the next render. */
let freshLeafStage = null;

function growVine() {
  const layer = document.getElementById("vine-layer");
  const rail = layer && layer.parentElement;
  if (!layer || !rail) return;

  const height = rail.offsetHeight;
  if (!height) return;

  /* the first unfinished stage carries the bud: it is what happens next */
  let budIdx = -1;
  for (let i = 0; i < STAGES.length; i++) {
    if (stageUnlocked(i) && !stageDone(STAGES[i])) { budIdx = i; break; }
  }

  const marks = [];
  rail.querySelectorAll(".stage-item").forEach((row) => {
    const idx = Number(row.dataset.stage);
    const y = row.offsetTop + row.offsetHeight / 2;
    const state = stageDone(STAGES[idx]) ? "leaf" : idx === budIdx ? "bud" : "bare";
    marks.push({ y, state, ink: ILLO.stageInk(idx).ink, key: String(idx) });
  });
  if (!marks.length) return;

  layer.innerHTML = ILLO.vine(height, marks);

  if (freshLeafStage !== null) {
    const leaf = layer.querySelector('.vine-leaf[data-key="' + freshLeafStage + '"]');
    freshLeafStage = null;
    if (leaf && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      leaf.classList.add("fresh");
      ILLO.arm(leaf);
      ILLO.draw(leaf, { duration: 700, stagger: 0 });
    }
  }
}

/* ------------------------------------------------ home view -------------- */



/* the three chapter markers: one plate per track, with what it actually covers */
const TRACK_BLURBS = {
  Foundations: "Your first print(), then variables, strings, decisions, loops, lists, dictionaries and functions — ending in a working chai shop you wrote yourself.",
  Intermediate: "Slices, while loops, comprehensions, error handling and unpacking: the tools that turn a script into a program that survives contact with real input.",
  Expert: "Classes, inheritance, functional Python, generators and decorators, finishing with a bank that keeps its own books.",
};

function trackPlates() {
  return TRACKS.map((track, i) => {
    let done = 0, total = 0;
    for (let k = track.from; k <= track.to && k < STAGES.length; k++) {
      total++;
      if (stageDone(STAGES[k])) done++;
    }
    const tone = ILLO.trackInk(track.name);
    return `
      <figure class="track-plate" style="--stage-ink:${tone.ink}">
        <div class="track-plate-art">${ILLO.trackPlate(track.name)}</div>
        <figcaption>
          <p class="track-plate-kicker">Plate ${String(i + 1).padStart(2, "0")} · ${done} of ${total} stages</p>
          <h3 class="track-plate-name">${track.name}</h3>
          <p class="track-plate-blurb">${TRACK_BLURBS[track.name] || ""}</p>
        </figcaption>
      </figure>`;
  }).join("");
}

function showHome() {
  activeStageIdx = null;
  refreshSidebar();
  const main = document.getElementById("main");
  main.classList.add("main-full");
  const started = doneCount() > 0;
  const step = nextJourneyStep();

  main.innerHTML = `
    <section class="hero">
      <div class="hero-grid">
        <div class="hero-copy">
          <p class="hero-kicker reveal" style="--index:0">A Python course that runs in your browser</p>
          <h1 class="hero-title reveal" style="--index:1">Learn Python by actually writing it.</h1>
          <p class="hero-sub reveal" style="--index:2">
            Real Python runs on this page: you type code, press Run, and earn XP
            and badges as the language clicks into place. Three tracks take you from
            your first print() to classes, generators and decorators. No experience
            assumed, nothing to install.
          </p>
          <div class="hero-cta reveal" style="--index:3">
            <button class="btn-run" id="cta-start">${!started ? "Begin Stage 1" : step.type === "bug" ? "Defend Sector " + (step.idx + 1) : "Continue your journey"}</button>
          </div>
          <div class="hero-stats reveal" style="--index:4">
            <span><strong>${STAGES.length}</strong> stages</span>
            <span class="stat-dot"></span>
            <span><strong>${totalExercises}</strong> exercises</span>
            <span class="stat-dot"></span>
            <span><strong>3</strong> tracks, beginner to expert</span>
          </div>
        </div>
        <figure class="hero-plate reveal" style="--index:2">
          ${ILLO.sansevieria()}
          <figcaption class="plate-caption">
            <em>Sansevieria trifasciata</em> — the snake plant. Hard to kill,
            grows in low light, gets taller every month you pay it a little attention.
          </figcaption>
        </figure>
      </div>

      <div class="tracks-block reveal" style="--index:5">
        <div class="plate-num"><span class="plate-ink">Three tracks</span><span class="plate-rule"></span><span>beginner to expert</span></div>
        <div class="track-plates">${trackPlates()}</div>
      </div>

      <div class="specimen-block reveal" style="--index:6">
        <div class="plate-num"><span class="plate-ink">What a lesson looks like</span><span class="plate-rule"></span></div>
        <div class="hero-demo">
          <div class="editor-chrome">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
            <span class="file-name">stage-8.py</span>
          </div>
          <pre class="demo-code"><span class="dim"># your code runs right here</span>
<span class="kw">def</span> greet(name):
    <span class="kw">return</span> <span class="st">f"Hello, {name}!"</span>

print(greet(<span class="st">"Asha"</span>))</pre>
          <div class="demo-output">
            <span class="demo-output-label">Output</span>
            Hello, Asha!
          </div>
          <div class="demo-verdict">${CHECK_SVG}<span>Correct &nbsp;<span class="xp-gain">+10 XP</span></span></div>
        </div>
      </div>

      <div class="journey-block reveal" style="--index:7">
        <h2 class="badge-shelf-heading">The journey</h2>
        <p class="section-note">Every stage and every Firewall sector on one growing vine. Click any open node.</p>
        <div class="journey-map" id="journey-map">${journeyMapSvg()}</div>
      </div>
    </section>`;

  document.getElementById("cta-start").addEventListener("click", () => {
    if (step.type === "bug") showBugHunt(step.idx);
    else showStage(step.idx);
  });
  wireJourneyMap(document.getElementById("journey-map"));
  ILLO.observe(main);
  window.scrollTo({ top: 0 });
}

/* ------------------------------------------------ stage view ------------- */

function showStage(idx) {
  ensureEngine();
  activeStageIdx = idx;
  refreshSidebar();
  const stage = STAGES[idx];
  const main = document.getElementById("main");
  main.classList.remove("main-full");

  const introHtml = stage.intro.join("\n");

  const exercisesHtml = stage.exercises.map((ex, i) => {
    const done = !!state.done[ex.id];
    return `
    <div class="exercise-card reveal" style="--index:${i + 2}" data-ex="${ex.id}">
      <div class="exercise-head">
        <span class="exercise-label">Exercise ${i + 1} of ${stage.exercises.length} · ${XP_PER_EXERCISE} XP</span>
        <span class="exercise-status ${done ? "done" : "todo"}">${done ? "Complete" : "To do"}</span>
      </div>
      <h2 class="exercise-title">${ex.title}</h2>
      <p class="exercise-brief">${ex.brief}</p>
      <div class="editor-frame">
        <div class="editor-chrome">
          <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          <span class="file-name">${ex.id}.py</span>
        </div>
        <textarea class="editor" spellcheck="false" autocapitalize="off" autocomplete="off" aria-label="Python code editor: ${ex.title}"></textarea>
      </div>
      <div class="exercise-actions">
        <button class="btn-run" ${pyReady ? "" : "disabled"}>Run</button>
        <button class="btn-hint">Hint</button>
        <span class="kbd-note"><kbd>Ctrl</kbd> + <kbd>Enter</kbd> to run</span>
      </div>
      <div class="hint-box">${ex.hint}</div>
      <div class="verdict"></div>
      <div class="output-block">
        <div class="output-head">Output</div>
        <div class="output-body"></div>
      </div>
    </div>`;
  }).join("");

  const track = TRACKS.find((t) => idx >= t.from && idx <= t.to);
  const tone = ILLO.stageInk(idx);
  main.style.setProperty("--stage-ink", tone.ink);
  main.style.setProperty("--stage-wash", tone.wash);
  main.innerHTML = `
    <div class="stage-head reveal" style="--index:0">
      <div class="stage-head-text">
        <p class="plate-num">
          <span class="plate-ink">Plate ${String(idx + 1).padStart(2, "0")}</span>
          <span class="plate-rule"></span>
          <span>${track ? track.name : ""} · ${stage.exercises.length} exercise${stage.exercises.length > 1 ? "s" : ""} · ${stage.exercises.length * XP_PER_EXERCISE} XP</span>
        </p>
        <h1 class="stage-title">${stage.name}</h1>
      </div>
      <div class="stage-vignette">${ILLO.medallion(idx, 60)}</div>
    </div>
    <div class="lesson-prose reveal" style="--index:1">${introHtml}</div>
    ${exercisesHtml}
    <div class="stage-footer reveal" style="--index:${stage.exercises.length + 2}">
      <span class="muted-note">Finish every exercise to earn the “${stage.badge.label}” badge.</span>
      ${stageDone(stage) && idx < STAGES.length - 1 && !bugDone(idx)
        ? `<button class="btn-run" id="to-bug">Firewall ${idx + 1}: defend the sector</button>`
        : idx + 1 < STAGES.length
        ? `<button class="btn-hint" id="next-stage" ${stageUnlocked(idx + 1) ? "" : "disabled"}>Next stage</button>`
        : ""}
    </div>`;

  highlightExamples(main);

  // wire up each exercise card
  stage.exercises.forEach((ex) => {
    const card = main.querySelector(`[data-ex="${ex.id}"]`);
    const editor = card.querySelector(".editor");
    editor.value = ex.starter;
    autoSize(editor);

    editor.addEventListener("input", () => autoSize(editor));
    editor.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const s = editor.selectionStart;
        editor.value = editor.value.slice(0, s) + "    " + editor.value.slice(editor.selectionEnd);
        editor.selectionStart = editor.selectionEnd = s + 4;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        card.querySelector(".btn-run").click();
      }
    });

    card.querySelector(".btn-hint").addEventListener("click", () => {
      card.querySelector(".hint-box").classList.toggle("show");
    });

    card.querySelector(".btn-run").addEventListener("click", () => execute(stage, idx, ex, card));
  });

  const nextBtn = document.getElementById("next-stage");
  if (nextBtn) nextBtn.addEventListener("click", () => {
    if (stageUnlocked(idx + 1)) showStage(idx + 1);
  });
  const bugBtn = document.getElementById("to-bug");
  if (bugBtn) bugBtn.addEventListener("click", () => showBugHunt(idx));

  ILLO.observe(main);
  window.scrollTo({ top: 0 });
}

function autoSize(editor) {
  editor.style.height = "auto";
  editor.style.height = Math.max(120, editor.scrollHeight + 4) + "px";
}

/* ------------------------------------------------ execution -------------- */

async function execute(stage, stageIdx, ex, card) {
  if (!pyReady) return;
  const btn = card.querySelector(".btn-run");
  const outBlock = card.querySelector(".output-block");
  const outBody = card.querySelector(".output-body");
  const verdict = card.querySelector(".verdict");

  btn.disabled = true;
  btn.textContent = "Running";
  verdict.classList.remove("show", "pass", "fail");

  let result;
  try {
    result = await runExercise(card.querySelector(".editor").value, ex.check);
  } catch (e) {
    result = { out: "", error: "Something went wrong running your code. Try again.", passed: false, feedback: "" };
  }

  btn.disabled = !pyReady;
  btn.textContent = "Run";

  outBlock.classList.add("show");
  if (result.timedOut) {
    outBody.classList.add("error");
    outBody.textContent = "(stopped — your code ran for more than 10 seconds)";
  } else if (result.error) {
    outBody.classList.add("error");
    outBody.textContent = result.error;
  } else {
    outBody.classList.remove("error");
    outBody.textContent = result.out.trim() === "" ? "(no output)" : result.out;
  }

  if (result.passed) {
    state.streak += 1;
    const firstTime = !state.done[ex.id];
    if (firstTime) {
      state.done[ex.id] = true;
      state.xp += XP_PER_EXERCISE;
      saveState();
      refreshHeader(true);
      refreshSidebar();
      card.querySelector(".exercise-status").className = "exercise-status done";
      card.querySelector(".exercise-status").textContent = "Complete";
    }
    verdict.className = "verdict show pass";
    card.querySelector(".btn-hint").classList.remove("warm");
    const praise = pick([
      "Clean. That is exactly right.",
      "Correct — the machine obeys.",
      "Nailed it.",
      "That ran perfectly.",
      "Correct, first-class work.",
    ]);
    verdict.innerHTML = `${ILLO.check(15)}<span>${praise}
      ${firstTime ? `&nbsp;<span class="xp-gain">+${XP_PER_EXERCISE} XP</span>` : "&nbsp;(already banked)"}
      ${state.streak >= 3 ? `&nbsp;— ${state.streak} correct in a row` : ""}</span>`;
    const mark = verdict.querySelector(".check-mark");
    if (mark && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      ILLO.arm(mark);
      ILLO.draw(mark, { duration: 300, stagger: 0 });
    }

    if (firstTime && stageDone(stage) && !state.badges.includes(stage.id)) {
      state.badges.push(stage.id);
      saveState();
      setTimeout(() => celebrateStage(stageIdx), 500);
    }
  } else {
    state.streak = 0;
    verdict.className = "verdict show fail";
    const msg = result.timedOut
      ? "That looks like an infinite loop — the code never finished, so I stopped it. Make sure the loop can actually end (does the condition ever become False?), then run again once the engine is back."
      : result.error
      ? "Python hit an error — read the message above, fix the line it mentions, and run again."
      : (result.feedback || "Not quite — compare your output with what the task asks for.");
    /* no shake: a wrong answer is a normal part of learning. A hairline draws
       under the output and the hint button warms, and that is all. */
    verdict.innerHTML = `<span>${msg}</span>`;
    card.querySelector(".btn-hint").classList.add("warm");
  }
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ------------------------------------------------ rewards ---------------- */

function celebrateStage(stageIdx) {
  const stage = STAGES[stageIdx];
  /* the vine grows a leaf for this stage on the next sidebar render */
  freshLeafStage = String(stageIdx);
  refreshSidebar();
  const backdrop = document.getElementById("modal-backdrop");
  const modal = document.getElementById("modal");
  const last = stageIdx === STAGES.length - 1;
  const lvl = currentLevel();

  modal.innerHTML = `
    <p class="modal-kicker">Stage ${stageIdx + 1} complete</p>
    ${badgeSvg(stageIdx, 88)}
    <h2>${last ? "You are a Python Master." : `Badge earned: ${stage.badge.label}`}</h2>
    <p>${last
      ? `Every stage from your first print() to decorators and a working bank — all ${totalExercises} exercises, written by your own hands. That is the whole arc, beginner to expert.`
      : `“${stage.name}” is in the bag. Your rank: ${lvl.name}. But this stage's bugs are marching on your codebase — man the firewall.`}</p>
    <span class="modal-xp">${state.xp} XP total</span>
    <div class="modal-actions">
      <button class="btn-run" id="modal-continue">${last ? "Back to the journey" : "Firewall " + (stageIdx + 1) + ": defend the sector"}</button>
    </div>`;

  backdrop.classList.remove("hidden");
  confetti();
  document.getElementById("modal-continue").focus();

  document.getElementById("modal-continue").addEventListener("click", () => {
    backdrop.classList.add("hidden");
    if (last) showHome();
    else showBugHunt(stageIdx);
  });
}

/* seeds and petals coming loose, in the six inks — a plant shedding, not a
   party popper */
function confetti() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const layer = document.getElementById("confetti-layer");
  const inks = ILLO.inks;
  for (let i = 0; i < 54; i++) {
    const p = document.createElement("div");
    p.className = "seed-fall " + (i % 3 === 0 ? "petal" : "seed");
    p.style.left = Math.random() * 100 + "vw";
    p.style.background = inks[i % inks.length].ink;
    p.style.opacity = String(0.45 + Math.random() * 0.4);
    p.style.setProperty("--spin", 180 + Math.random() * 420 + "deg");
    p.style.setProperty("--drift", (Math.random() * 120 - 60) + "px");
    p.style.animationDuration = 1.8 + Math.random() * 1.6 + "s";
    p.style.animationDelay = Math.random() * 0.5 + "s";
    layer.appendChild(p);
    setTimeout(() => p.remove(), 4000);
  }
}

/* ------------------------------------------------ boot ------------------- */

document.getElementById("home-link").addEventListener("click", (e) => {
  e.preventDefault();
  showHome();
});

// hideable side panel (preference persists per device)
const panelToggle = document.getElementById("panel-toggle");
function setPanel(hidden, save) {
  document.body.classList.toggle("sidebar-hidden", hidden);
  panelToggle.setAttribute("aria-expanded", String(!hidden));
  panelToggle.setAttribute("aria-label", hidden ? "Show side panel" : "Hide side panel");
  panelToggle.title = hidden ? "Show side panel" : "Hide side panel";
  if (save) {
    try { localStorage.setItem("pyquest-panel", hidden ? "hidden" : "open"); } catch (e) {}
  }
}
panelToggle.addEventListener("click", () => {
  setPanel(!document.body.classList.contains("sidebar-hidden"), true);
});
try {
  if (localStorage.getItem("pyquest-panel") === "hidden") setPanel(true, false);
} catch (e) {}

document.getElementById("modal-backdrop").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.classList.add("hidden");
});

document.addEventListener("keydown", (e) => {
  const backdrop = document.getElementById("modal-backdrop");
  if (e.key === "Escape") backdrop.classList.add("hidden");
  if (e.key === "Tab" && !backdrop.classList.contains("hidden")) {
    // keep focus inside the dialog
    const focusables = backdrop.querySelectorAll("button, [href], input, textarea");
    if (!focusables.length) return;
    const first = focusables[0], last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && (document.activeElement === last || !backdrop.contains(document.activeElement))) {
      e.preventDefault(); first.focus();
    }
  }
});

const ambient = document.createElement("div");
ambient.className = "ambient";
document.body.appendChild(ambient);

let engineRequested = false;
function ensureEngine() {
  if (engineRequested) return;
  engineRequested = true;
  bootPython();
}

refreshHeader(false);
showHome();
setEngineStatus("idle", "Python loads with your first lesson");
