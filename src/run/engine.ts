import type { Focus, Game, GameProgress, Observation, Run } from "../types";
import { shuffle } from "../utils";
// A short lease prevents a sleeping/crashed page from accruing hours of game time.
export const GAME_LEASE_MS = 5000;
export function emptyProgress(): GameProgress {
  return {
    puzzleId: null,
    seen: false,
    progress: 0,
    checkpoint: null,
    activeMs: 0,
    result: null,
    screenshotKey: null,
    captureAttempts: 0,
    error: null,
  };
}
export function newRun(
  ids: string[],
  random: boolean,
  catalog: Game[],
  now: number,
): Run {
  if (
    !ids.length ||
    new Set(ids).size !== ids.length ||
    ids.some((id) => !catalog.some((g) => g.id === id))
  )
    throw new Error("Select one or more supported games, without duplicates.");
  const order = random ? shuffle(ids) : [...ids];
  return {
    version: 2,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    status: "running",
    pauseReason: null,
    order,
    currentGameId: order[0],
    games: Object.fromEntries(order.map((id) => [id, emptyProgress()])),
    clock: {
      totalMs: 0,
      checkpointAt: now,
      activeGameId: null,
      activeTabId: null,
      leaseUntil: now,
    },
  };
}
/** Settle the previous interval before changing focus, pause status, or completion. */
export function settle(run: Run, now: number): void {
  const clock = run.clock;
  now = Math.max(clock.checkpointAt, now);
  if (run.status === "running") {
    clock.totalMs += now - clock.checkpointAt;
    const game = clock.activeGameId && run.games[clock.activeGameId];
    if (game && !game.result)
      game.activeMs += Math.max(
        0,
        Math.min(now, clock.leaseUntil) - clock.checkpointAt,
      );
  }
  clock.checkpointAt = now;
  run.updatedAt = now;
}
export function setFocus(
  run: Run,
  focus: Focus | null,
  now: number,
  renewLease = true,
): void {
  settle(run, now);
  if (
    run.status !== "running" ||
    !focus ||
    !run.games[focus.gameId] ||
    run.games[focus.gameId].result
  ) {
    run.clock.activeGameId = null;
    run.clock.activeTabId = null;
    run.clock.leaseUntil = now;
    return;
  }
  const changed =
    run.clock.activeTabId !== focus.tabId ||
    run.clock.activeGameId !== focus.gameId;
  run.clock.activeGameId = focus.gameId;
  run.clock.activeTabId = focus.tabId;
  run.currentGameId = focus.gameId;
  if (changed || renewLease) run.clock.leaseUntil = now + GAME_LEASE_MS;
}
export function pause(run: Run, now: number, reason = "Paused by you"): void {
  if (run.status !== "running") return;
  settle(run, now);
  run.status = "paused";
  run.pauseReason = reason;
  run.clock.activeGameId = null;
  run.clock.activeTabId = null;
  run.clock.leaseUntil = now;
}
export function resume(run: Run, now: number): void {
  if (run.status !== "paused") return;
  run.status = "running";
  run.pauseReason = null;
  run.clock.checkpointAt = now;
  run.updatedAt = now;
}
/** Do not charge the interval since the last durable checkpoint on browser restart. */
export function recover(run: Run): void {
  pause(run, run.clock.checkpointAt, "Browser reopened. Resume when ready.");
}
export function stop(run: Run, now: number): void {
  settle(run, now);
  run.status = "stopped";
  run.clock.activeGameId = null;
  run.clock.activeTabId = null;
}
export function observe(run: Run, snapshot: Observation, now: number): boolean {
  const item = run.games[snapshot.game];
  if (!item || run.status !== "running" || item.result) return false;
  settle(run, now);
  if (item.puzzleId && item.puzzleId !== snapshot.puzzleId) {
    item.error =
      "This daily puzzle changed. The saved run is preserved, but this site can no longer resume its old puzzle.";
    pause(run, now, item.error);
    return false;
  }
  const preexisting = !item.seen && snapshot.complete;
  item.seen = true;
  item.puzzleId = snapshot.puzzleId;
  // An older duplicate tab must not roll the saved progress backwards.
  if (snapshot.progress >= item.progress) {
    item.progress = snapshot.progress;
    item.checkpoint = snapshot.checkpoint ?? item.checkpoint;
  }
  if (
    !snapshot.complete ||
    !snapshot.outcome ||
    !snapshot.score ||
    !snapshot.shareText
  )
    return false;
  item.result = {
    outcome: snapshot.outcome,
    score: snapshot.score,
    guesses: snapshot.guesses ?? snapshot.progress,
    shareText: snapshot.shareText,
    shareSource: snapshot.shareSource ?? "adapter",
    spoiler: snapshot.spoiler ?? null,
    completedAt: now,
    preexisting,
  };
  if (run.clock.activeGameId === snapshot.game) {
    run.clock.activeGameId = null;
    run.clock.activeTabId = null;
  }
  if (run.order.every((id) => run.games[id].result)) {
    run.status = "complete";
    run.pauseReason = null;
  }
  return true;
}
export function nextGame(run: Run): string | null {
  const start = Math.max(0, run.order.indexOf(run.currentGameId || ""));
  for (let offset = 1; offset <= run.order.length; offset++) {
    const id = run.order[(start + offset) % run.order.length];
    if (!run.games[id].result) return id;
  }
  return null;
}
export function projected(run: Run, now: number): Run {
  const copy = structuredClone(run);
  settle(copy, now);
  return copy;
}
