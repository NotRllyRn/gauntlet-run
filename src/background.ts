import { api } from "./browser/api";
import { captureBoard } from "./browser/screenshot";
import { games, gameForURL } from "./games";
import { initializeStorage, loadRun, saveRun, saveImage } from "./run/storage";
import {
  newRun,
  nextGame,
  observe,
  pause,
  resume,
  setFocus,
  settle,
  stop,
} from "./run/engine";
import { validObservation } from "./run/validation";
import { errorMessage } from "./utils";
import type { Focus, Run, Command } from "./types";

let queue: Promise<unknown> = Promise.resolve();
let initialization: Promise<void> | null = null;
function serial<T>(fn: () => Promise<T>): Promise<T> {
  const result = queue.then(async () => {
    initialization ??= initializeStorage().catch((error) => {
      initialization = null;
      throw error;
    });
    await initialization;
    return fn();
  });
  queue = result.catch(console.error);
  return result;
}
async function focusedTab(): Promise<chrome.tabs.Tab | undefined> {
  const windows = await api.windows.getAll({ windowTypes: ["normal"] });
  const focused = windows.find((w) => w.focused);
  return focused?.id === undefined
    ? undefined
    : (await api.tabs.query({ active: true, windowId: focused.id }))[0];
}
function focusFor(tab: chrome.tabs.Tab | undefined, run: Run): Focus | null {
  const game = gameForURL(tab?.url);
  return game && run.games[game.id] && tab?.id !== undefined
    ? { gameId: game.id, tabId: tab.id }
    : null;
}
async function openGame(run: Run, id: string): Promise<void> {
  const game = games.find((g) => g.id === id);
  if (!game || !run.games[id])
    throw new Error("This game is not selected for this run.");
  settle(run, Date.now());
  run.currentGameId = id;
  await saveRun(run);
  // Never replace an existing game: unfinished tabs remain available to return to.
  await api.tabs.create({ url: game.url, active: true });
}
async function captureResult(
  run: Run,
  gameId: string,
  tab: chrome.tabs.Tab,
  force = false,
): Promise<boolean> {
  const item = run.games[gameId];
  if (
    !item.result ||
    item.screenshotKey ||
    run.status === "paused" ||
    run.status === "stopped"
  )
    return false;
  if (
    !force &&
    (item.captureAttempts >= 3 || Date.now() - item.result.completedAt < 3500)
  )
    return false;
  const focused = await focusedTab();
  if (focused?.id !== tab.id) return false;
  item.captureAttempts++;
  await saveRun(run);
  try {
    const image = await captureBoard(tab);
    item.error = null;
    await saveImage(run, gameId, image);
    return true;
  } catch (error) {
    item.error = `Screenshot pending: ${errorMessage(error)} Return to this game and retry.`;
    await saveRun(run);
    return false;
  }
}
async function updateFocus(renew = true): Promise<void> {
  const run = await loadRun();
  if (!run || run.status !== "running") return;
  setFocus(run, focusFor(await focusedTab(), run), Date.now(), renew);
  await saveRun(run);
}
async function handle(
  raw: unknown,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (!raw || typeof raw !== "object" || !("type" in raw)) return;
  const message = raw as Command;
  const internal =
    sender.id === api.runtime.id &&
    Boolean(sender.url?.startsWith(api.runtime.getURL("")));
  let run = await loadRun();
  if (internal) {
    if (message.type === "getRun") return { run };
    if (message.type === "start") {
      if (run && ["running", "paused"].includes(run.status))
        throw new Error("Resume or end the existing run first.");
      if (
        !Array.isArray(message.ids) ||
        message.ids.some((id) => typeof id !== "string")
      )
        throw new Error("Invalid game selection.");
      run = newRun(message.ids, Boolean(message.random), games, Date.now());
      await saveRun(run);
      await openGame(run, run.order[0]);
      return { ok: true };
    }
    if (!run) throw new Error("Start a run first.");
    if (message.type === "openGame") await openGame(run, message.gameId);
    if (message.type === "next") {
      const next = nextGame(run);
      if (next) await openGame(run, next);
    }
    if (message.type === "pause") {
      pause(run, Date.now());
      await saveRun(run);
    }
    if (message.type === "resume") {
      resume(run, Date.now());
      setFocus(run, focusFor(await focusedTab(), run), Date.now());
      await saveRun(run);
    }
    if (message.type === "stop") {
      stop(run, Date.now());
      await saveRun(run);
    }
    if (message.type === "retryCapture") {
      const item = run.games[message.gameId];
      if (!item?.result)
        throw new Error("This game has no detected result yet.");
      item.captureAttempts = 0;
      item.error = null;
      await saveRun(run);
      await openGame(run, message.gameId);
    }
    return { ok: true };
  }
  const game = gameForURL(sender.url);
  if (
    !run ||
    !game ||
    !run.games[game.id] ||
    sender.id !== api.runtime.id ||
    sender.frameId !== 0 ||
    sender.tab?.id === undefined
  )
    return;
  if (run.status === "paused" || run.status === "stopped")
    return { status: run.status };
  if (run.status === "complete" && run.games[game.id].screenshotKey)
    return { status: run.status };
  const tab = await focusedTab();
  // Background tabs may supply completion, but never earn focus time or renew another tab's lease.
  if (run.status === "running")
    setFocus(run, focusFor(tab, run), Date.now(), tab?.id === sender.tab.id);
  if (
    message.type === "observation" &&
    validObservation(message.snapshot) &&
    message.snapshot.game === game.id
  ) {
    const item = run.games[game.id];
    observe(run, message.snapshot, Date.now());
    await saveRun(run);
    if (
      item.result &&
      message.snapshot.complete &&
      message.snapshot.puzzleId === item.puzzleId &&
      tab?.id === sender.tab.id
    ) {
      const saved = await captureResult(run, game.id, tab);
      if (saved && run.status === "running") {
        const next = nextGame(run);
        if (next) await openGame(run, next);
      }
    }
  } else if (run.status === "running") await saveRun(run);
  return { status: run.status };
}
api.runtime.onMessage.addListener((message: unknown, sender, respond) => {
  serial(() => handle(message, sender)).then(
    (value) => respond(value ?? { ok: true }),
    (error) => respond({ error: errorMessage(error) }),
  );
  return true;
});
api.tabs.onActivated.addListener(() => {
  void serial(() => updateFocus());
});
api.tabs.onUpdated.addListener((_id, change) => {
  if (change.url || change.status === "complete")
    void serial(() => updateFocus(false));
});
api.tabs.onRemoved.addListener(() => {
  void serial(() => updateFocus(false));
});
api.windows.onFocusChanged.addListener(() => {
  void serial(() => updateFocus());
});
api.windows.onRemoved.addListener(() => {
  void serial(async () => {
    if ((await api.windows.getAll({ windowTypes: ["normal"] })).length) {
      await updateFocus(false);
      return;
    }
    const run = await loadRun();
    if (run) {
      pause(run, Date.now(), "Browser windows closed. Resume when ready.");
      await saveRun(run);
    }
  });
});
// Alarms survive worker suspension. A new browser session recovers paused, unlike a worker restart.
api.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "checkpoint")
    void serial(async () => {
      const run = await loadRun();
      if (run?.status === "running") {
        settle(run, Date.now());
        await saveRun(run);
      }
    });
});
api.runtime.onStartup.addListener(() => {
  void serial(async () => {});
});
void serial(async () => {
  await api.alarms.create("checkpoint", { periodInMinutes: 0.5 });
});
