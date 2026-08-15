/* PyQuest — cross-device progress.
 *
 * Signing in is optional and always has been the point of this design: the
 * course must still open, run and save with no account at all. localStorage
 * stays the source of truth for the session you are in; the server is a copy
 * that lets you pick the same journey up on another device.
 *
 * Three rules this file exists to keep:
 *   1. No config  -> completely inert. No button, no network, no behaviour change.
 *   2. Server unreachable -> a non-event. A paused free-tier project must never
 *      cost someone a lesson, so every call is guarded and failure is silent
 *      apart from one quiet line in the account menu.
 *   3. Signing in never loses work. Local and remote are merged, not chosen
 *      between — see mergeProgress().
 */

const SYNC_TABLE = "progress";
const PUSH_DEBOUNCE_MS = 1500;

const sync = {
  enabled: false,     // config present and the client loaded
  client: null,
  user: null,
  status: "off",      // off | signed-out | syncing | synced | offline
  detail: "",
  pushTimer: null,
  listeners: [],
};

function syncConfigured() {
  return (
    typeof SUPABASE_CONFIG !== "undefined" &&
    !!SUPABASE_CONFIG.url &&
    !!SUPABASE_CONFIG.anonKey
  );
}

function onSyncChange(fn) {
  sync.listeners.push(fn);
}

function emitSyncChange() {
  sync.listeners.forEach((fn) => {
    try { fn(sync); } catch (e) { /* a broken listener must not break sync */ }
  });
}

function setSyncStatus(status, detail) {
  sync.status = status;
  sync.detail = detail || "";
  emitSyncChange();
}

/* ------------------------------------------------ merging ---------------- */

/* Union everything countable, keep the best of everything numeric. A learner
   who finished three stages on a laptop and two more on a phone before signing
   in should end up with five, not whichever device wrote last. */
function mergeProgress(local, remote) {
  if (!remote) return local;
  if (!local) return remote;

  const done = Object.assign({}, remote.done || {}, local.done || {});

  const badges = Array.from(
    new Set([...(remote.badges || []), ...(local.badges || [])])
  );

  const cleared = Object.assign(
    {},
    (remote.bugs && remote.bugs.cleared) || {},
    (local.bugs && local.bugs.cleared) || {}
  );

  // best is "fewest leaves lost", so the higher number is the better run
  const best = Object.assign({}, (remote.bugs && remote.bugs.best) || {});
  const localBest = (local.bugs && local.bugs.best) || {};
  Object.keys(localBest).forEach((k) => {
    best[k] = Math.max(Number(localBest[k]) || 0, Number(best[k]) || 0);
  });

  return {
    xp: Math.max(Number(local.xp) || 0, Number(remote.xp) || 0),
    done,
    badges,
    streak: Math.max(Number(local.streak) || 0, Number(remote.streak) || 0),
    bugs: { cleared, best },
  };
}

/* ------------------------------------------------ the client ------------- */

async function loadSupabase() {
  /* Imported at run time from a CDN, the same way Pyodide and the fonts are —
     the site has no build step and this must not introduce one. */
  const mod = await import("https://esm.sh/@supabase/supabase-js@2.45.4");
  return mod.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    auth: { persistSession: true, detectSessionInUrl: true, flowType: "pkce" },
  });
}

async function initSync() {
  if (!syncConfigured()) {
    setSyncStatus("off");
    return;
  }
  try {
    sync.client = await loadSupabase();
    sync.enabled = true;
  } catch (e) {
    // CDN blocked, offline, or a bad URL — the course does not depend on this
    setSyncStatus("offline", "Sync unavailable — progress is saved on this device.");
    return;
  }

  try {
    const { data } = await sync.client.auth.getSession();
    if (data && data.session) {
      await adoptSession(data.session);
    } else {
      setSyncStatus("signed-out");
    }
  } catch (e) {
    setSyncStatus("offline", "Sync unavailable — progress is saved on this device.");
  }

  sync.client.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT" || !session) {
      sync.user = null;
      setSyncStatus("signed-out");
      return;
    }
    if (sync.user && session.user && sync.user.id === session.user.id) return;
    adoptSession(session);
  });
}

/* Someone is signed in: pull what the server has, merge the work done on this
   device into it, apply the result, and push it back. */
async function adoptSession(session) {
  sync.user = session.user;
  setSyncStatus("syncing");

  let remote = null;
  try {
    const { data, error } = await sync.client
      .from(SYNC_TABLE)
      .select("data")
      .eq("user_id", sync.user.id)
      .maybeSingle();
    if (error) throw error;
    remote = data ? data.data : null;
  } catch (e) {
    setSyncStatus("offline", "Signed in, but progress could not be loaded. This device still saves locally.");
    return;
  }

  const merged = mergeProgress(readLocalProgress(), remote);
  applyProgress(merged);

  const pushed = await pushProgress(merged);
  setSyncStatus(
    pushed ? "synced" : "offline",
    pushed ? "" : "Signed in, but this device could not save to the server yet."
  );
}

async function pushProgress(progress) {
  if (!sync.enabled || !sync.user) return false;
  try {
    const { error } = await sync.client.from(SYNC_TABLE).upsert(
      {
        user_id: sync.user.id,
        data: progress,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );
    if (error) throw error;
    return true;
  } catch (e) {
    return false;
  }
}

/* Called after every save. Writes are collapsed so finishing three exercises
   quickly is one request, not three. */
function queueSync(progress) {
  if (!sync.enabled || !sync.user) return;
  clearTimeout(sync.pushTimer);
  sync.pushTimer = setTimeout(async () => {
    const ok = await pushProgress(progress);
    setSyncStatus(ok ? "synced" : "offline",
      ok ? "" : "Saved on this device — the server is not reachable right now.");
  }, PUSH_DEBOUNCE_MS);
}

/* ------------------------------------------------ sign in / out ---------- */

/* Is the project actually up? signInWithOAuth navigates the browser away, so a
   paused project would dump the learner on a DNS error page with the course
   gone. Ask first, cheaply, and stay put if the answer is no. */
async function syncReachable() {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 4000);
    await fetch(SUPABASE_CONFIG.url + "/auth/v1/health", {
      method: "GET",
      headers: { apikey: SUPABASE_CONFIG.anonKey },
      signal: ctl.signal,
    });
    clearTimeout(timer);
    return true;   // any answer at all means the host is there
  } catch (e) {
    return false;  // DNS failure, timeout, or the project is paused
  }
}

async function signInWithGoogle() {
  if (!sync.enabled) return;
  setSyncStatus("syncing");

  if (!(await syncReachable())) {
    setSyncStatus(
      "offline",
      "Sign-in is unavailable right now. Your progress is still being saved on this device."
    );
    return;
  }

  try {
    await sync.client.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
  } catch (e) {
    setSyncStatus("offline", "Could not reach the sign-in service. Try again later.");
  }
}

async function signOutOfSync() {
  if (!sync.enabled) return;
  try {
    await sync.client.auth.signOut();
  } catch (e) { /* the local session is cleared by the listener regardless */ }
  sync.user = null;
  setSyncStatus("signed-out");
}

/* What the account menu shows about the person signed in. Nothing beyond this
   is read from the Google profile. */
function syncIdentity() {
  if (!sync.user) return null;
  const meta = sync.user.user_metadata || {};
  return {
    email: sync.user.email || "",
    name: meta.full_name || meta.name || (sync.user.email || "").split("@")[0],
    avatar: meta.avatar_url || meta.picture || "",
  };
}
