// PyQuest engine worker. Runs Pyodide off the main thread so user code can
// never freeze the page; the page terminates this worker if a run exceeds
// its time budget and boots a fresh one.

importScripts("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");

const RUNNER_SETUP = `
import json

def _pyquest_run(code, check):
    import io, sys, traceback
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    ns = {}
    error = None
    try:
        exec(compile(code, "<your code>", "exec"), ns, ns)
    except BaseException:
        lines = traceback.format_exc().strip().split("\\n")
        error = "\\n".join(lines[-2:])
    finally:
        sys.stdout = old
    out = buf.getvalue()
    passed = False
    feedback = ""
    if error is None:
        ns["_stdout"] = out
        ns["_code"] = code
        try:
            exec(compile(check, "<check>", "exec"), ns, ns)
            passed = True
        except AssertionError as e:
            feedback = str(e) or "Not quite — read the task again and adjust your code."
        except BaseException:
            feedback = "The checker could not run — did you rename or remove something the task needs?"
    shown = out
    if len(shown) > 20000:
        shown = shown[:20000] + "\\n… output truncated (" + str(len(out)) + " characters in total)"
    return json.dumps({"out": shown, "error": error, "passed": passed, "feedback": feedback})
`;

let pyodide = null;

async function init() {
  try {
    pyodide = await loadPyodide();
    pyodide.runPython(RUNNER_SETUP);
    postMessage({ type: "ready" });
  } catch (e) {
    postMessage({ type: "boot-error" });
  }
}
init();

onmessage = (e) => {
  const msg = e.data;
  if (msg.type !== "run") return;
  let raw;
  try {
    pyodide.globals.set("_user_code", msg.code);
    pyodide.globals.set("_check_code", msg.check);
    raw = pyodide.runPython("_pyquest_run(_user_code, _check_code)");
  } catch (err) {
    raw = JSON.stringify({
      out: "",
      error: "The engine hit an unexpected problem running this code. Try again.",
      passed: false,
      feedback: "",
    });
  }
  postMessage({ type: "result", id: msg.id, raw });
};
