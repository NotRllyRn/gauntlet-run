import { api } from "../browser/api";
import type { Run, Result, Json } from "../types";
import { emptyProgress, recover } from "./engine";
interface LegacyRun {
  version?: number;
  id: string;
  createdAt: number;
  startedAt: number;
  finishedAt?: number;
  status: string;
  order: string[];
  stage?: {
    game: string;
    progress?: number;
    puzzleId?: string;
    launchedAt: number;
  };
  results: Record<string, Result & { elapsedMs?: number; screenshot?: string }>;
}
async function migrate(old: LegacyRun): Promise<Run> {
  const run: Run = {
    version: 2,
    id: old.id,
    createdAt: old.createdAt,
    updatedAt: Date.now(),
    status:
      old.status === "complete"
        ? "complete"
        : old.status === "stopped"
          ? "stopped"
          : "paused",
    pauseReason:
      "Upgraded run. Earlier timings used wall clock; new game timers start at zero.",
    order: old.order,
    currentGameId: old.stage?.game || old.order[0],
    games: Object.fromEntries(old.order.map((id) => [id, emptyProgress()])),
    clock: {
      totalMs: Math.max(
        0,
        (old.finishedAt || old.stage?.launchedAt || old.startedAt) -
          old.startedAt,
      ),
      checkpointAt: Date.now(),
      activeGameId: null,
      activeTabId: null,
      leaseUntil: 0,
    },
  };
  for (const [id, result] of Object.entries(old.results)) {
    if (!run.games[id]) continue;
    const { screenshot, ...rest } = result;
    run.games[id].result = rest;
    if (screenshot) {
      run.games[id].screenshotKey = imageKey(run.id, id);
      await api.storage.local.set({ [imageKey(run.id, id)]: screenshot });
    }
  }
  if (old.stage && run.games[old.stage.game]) {
    const item = run.games[old.stage.game];
    item.puzzleId = old.stage.puzzleId || null;
    item.progress = old.stage.progress || 0;
    item.seen = Boolean(item.puzzleId);
  }
  return run;
}
export const imageKey = (runId: string, gameId: string): string =>
  `screenshot:${runId}:${gameId}`;
export async function loadRun(): Promise<Run | null> {
  return (
    ((await api.storage.local.get("activeRun")) as { activeRun?: Run })
      .activeRun || null
  );
}
export async function saveRun(run: Run): Promise<void> {
  await api.storage.local.set({ activeRun: run });
  if (run.status === "complete" || run.status === "stopped") {
    const history: Run[] =
      ((await api.storage.local.get("history")) as { history?: Run[] })
        .history || [];
    await api.storage.local.set({
      history: [run, ...history.filter((r) => r.id !== run.id)],
    });
  }
}
export async function initializeStorage(): Promise<void> {
  const data = (await api.storage.local.get(["activeRun", "history"])) as {
    activeRun?: Run | LegacyRun;
    history?: Run[] | LegacyRun[];
  };
  if (data.activeRun?.version !== 2 && data.activeRun) {
    // Preserve the original records, including old timing values, before conversion.
    await api.storage.local.set({ legacyV1Backup: data });
    const active = await migrate(data.activeRun as LegacyRun);
    const history = await Promise.all(
      ((data.history || []) as LegacyRun[]).map(migrate),
    );
    await api.storage.local.set({ activeRun: active, history });
  }
  const { sessionReady } = await api.storage.session.get("sessionReady");
  if (!sessionReady) {
    const run = await loadRun();
    if (run?.status === "running") {
      recover(run);
      await saveRun(run);
    }
    await api.storage.session.set({ sessionReady: true });
  }
}
export async function saveImage(
  run: Run,
  gameId: string,
  screenshot: string,
): Promise<void> {
  const key = imageKey(run.id, gameId);
  await api.storage.local.set({ [key]: screenshot });
  run.games[gameId].screenshotKey = key;
  await saveRun(run);
}
export async function imagesFor(run: Run): Promise<Record<string, string>> {
  const keys = Object.values(run.games).flatMap((g) =>
    g.screenshotKey ? [g.screenshotKey] : [],
  );
  return keys.length
    ? ((await api.storage.local.get(keys)) as Record<string, string>)
    : {};
}
export async function exportRun(run: Run): Promise<Json> {
  return { ...run, screenshots: await imagesFor(run) } as unknown as Json;
}
