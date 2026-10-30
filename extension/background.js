if (typeof importScripts === "function")
  importScripts("core.js", "screenshot.js");
const api = globalThis.browser || chrome,
  G = globalThis.Gauntlet;
let queue = Promise.resolve();
const serial = (fn) => {
  const p = queue.then(fn);
  queue = p.catch(() => {});
  return p;
};
const load = async () => (await api.storage.local.get("activeRun")).activeRun;
async function save(run) {
  await api.storage.local.set({ activeRun: run });
}
async function openDashboard() {
  await api.tabs.create({ url: api.runtime.getURL("dashboard.html") });
}
api.action.onClicked.addListener(openDashboard);
async function launchStage(run) {
  const game = G.games.find((g) => g.id === run.order[run.index]);
  if (!game) {
    run.status = "complete";
    run.finishedAt = Date.now();
    run.stage = null;
    await save(run);
    const { history = [] } = await api.storage.local.get("history");
    await api.storage.local.set({
      history: [run, ...history.filter((r) => r.id !== run.id)],
    });
    await openDashboard();
    return;
  }
  run.stage = {
    game: game.id,
    launchedAt: Date.now(),
    observed: false,
    puzzleId: null,
    preexisting: false,
    pending: null,
    attempts: 0,
  };
  run.error = null;
  await save(run);
  let tab;
  try {
    if (run.tabId)
      tab = await api.tabs.update(run.tabId, { url: game.url, active: true });
  } catch {
    /* Closed game tab. */
  }
  if (!tab) tab = await api.tabs.create({ url: game.url, active: true });
  run.tabId = tab.id;
  await save(run);
}
async function capturePending(run) {
  if (!run.stage?.pending || run.stage.attempts >= 3) return;
  const tab = await api.tabs.get(run.tabId);
  if (!tab.active || !(await api.windows.get(tab.windowId)).focused) {
    run.error = "Return to the game tab to save its board screenshot.";
    await save(run);
    return;
  }
  run.stage.attempts++;
  await save(run);
  try {
    const screenshot = await G.captureBoard(api, tab);
    const p = run.stage.pending;
    run.results[run.stage.game] = {
      ...p,
      screenshot,
      captureTarget:
        run.stage.game === "wordle" ? "Wordle board" : "Globle globe canvas",
      capturedAt: Date.now(),
      preexisting: run.stage.preexisting,
      elapsedMs: run.stage.preexisting
        ? null
        : p.completedAt - run.stage.launchedAt,
    };
    run.error = null;
    // Persist the result and image before any navigation.
    run.stage.pending = null;
    run.stage.saved = true;
    await save(run);
  } catch (error) {
    run.error = `Capture not saved: ${error.message} Use Retry capture in the dashboard.`;
    await save(run);
    return;
  }
  run.index++;
  await launchStage(run);
}
async function returnToGame(run) {
  const game = G.games.find((g) => g.id === run.stage.game);
  let tab;
  try {
    tab = await api.tabs.get(run.tabId);
    tab = await api.tabs.update(run.tabId, {
      active: true,
      ...(tab.url !== game.url ? { url: game.url } : {}),
    });
  } catch {
    tab = await api.tabs.create({ url: game.url, active: true });
  }
  run.tabId = tab.id;
  await save(run);
  await api.windows.update(tab.windowId, { focused: true });
}
async function handle(message, sender) {
  const internal =
    sender.id === api.runtime.id &&
    sender.url?.startsWith(api.runtime.getURL(""));
  if (message.type === "start" && internal) {
    const current = await load();
    if (current?.status === "running")
      throw new Error("A run is already in progress. Finish or stop it first.");
    const run = G.newRun(message.ids, message.random);
    await launchStage(run);
    return { ok: true };
  }
  if (message.type === "retry" && internal) {
    const run = await load();
    if (run?.status !== "running") return { ok: true };
    if (run.stage?.pending) {
      run.stage.attempts = 0;
      await save(run);
      await returnToGame(run);
      await capturePending(run);
    } else if (run.stage?.saved) {
      run.index++;
      await launchStage(run);
    } else await returnToGame(run);
    return { ok: true };
  }
  if (message.type === "stop" && internal) {
    const run = await load();
    if (run?.status === "running") {
      run.status = "stopped";
      run.finishedAt = Date.now();
      await save(run);
      const { history = [] } = await api.storage.local.get("history");
      await api.storage.local.set({
        history: [run, ...history.filter((r) => r.id !== run.id)],
      });
    }
    return { ok: true };
  }
  if (message.type !== "observation") return;
  const run = await load(),
    s = message.snapshot;
  if (
    !run ||
    run.status !== "running" ||
    sender.tab?.id !== run.tabId ||
    sender.frameId !== 0 ||
    !s ||
    run.stage?.game !== s.game
  )
    return;
  const expected = new URL(G.games.find((g) => g.id === s.game).url),
    actual = new URL(sender.url);
  if (
    expected.origin !== actual.origin ||
    expected.pathname !== actual.pathname
  )
    return;
  if (run.stage.saved) {
    run.index++;
    await launchStage(run);
    return;
  }
  if (!run.stage.observed) {
    run.stage.observed = true;
    run.stage.puzzleId = s.puzzleId;
    run.stage.preexisting = s.complete;
    await save(run);
  }
  if (Number.isInteger(s.progress) && run.stage.progress !== s.progress) {
    run.stage.progress = s.progress;
    await save(run);
  }
  if (s.puzzleId !== run.stage.puzzleId) {
    run.error =
      "The daily puzzle changed during this stage. Stop this run and start a new one.";
    await save(run);
    return;
  }
  if (s.complete && !run.stage.pending) {
    if (
      !["won", "lost"].includes(s.outcome) ||
      typeof s.shareText !== "string" ||
      s.shareText.length > 10000 ||
      typeof s.score !== "string"
    )
      return;
    run.stage.pending = {
      game: s.game,
      puzzleId: s.puzzleId,
      outcome: s.outcome,
      score: s.score,
      guesses: s.guesses,
      shareText: s.shareText,
      shareSource: s.shareSource,
      spoiler: s.spoiler,
      completedAt: Date.now(),
    };
    await save(run);
  }
  if (run.stage.pending && Date.now() - run.stage.pending.completedAt >= 3500)
    await capturePending(run);
}
api.runtime.onMessage.addListener((m, sender, respond) => {
  serial(() => handle(m, sender)).then(
    (value) => respond(value ?? { ok: true }),
    (error) => respond({ error: error.message }),
  );
  return true;
});
