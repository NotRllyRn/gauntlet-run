import { api } from "../browser/api";
import type { Command, Run } from "../types";
import { games } from "../games";
import { projected } from "../run/engine";
import { duration, errorMessage } from "../utils";
export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}
export async function send(command: Command): Promise<{ run?: Run | null }> {
  const response = (await api.runtime.sendMessage(command)) as {
    error?: string;
    run?: Run | null;
  };
  if (response?.error) throw new Error(response.error);
  return response || {};
}
export function onClick(id: string, callback: () => unknown): void {
  element(id).onclick = async () => {
    try {
      await callback();
    } catch (error) {
      element("error").textContent = errorMessage(error);
    }
  };
}
export function button(
  label: string,
  action: () => unknown,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.textContent = label;
  b.className = "secondary";
  b.onclick = async () => {
    try {
      await action();
    } catch (error) {
      element("error").textContent = errorMessage(error);
    }
  };
  return b;
}
export async function startRun(ids: string[], random: boolean): Promise<void> {
  if (!(await api.permissions.request({ origins: ["<all_urls>"] })))
    throw new Error("Screenshot access is required. No run started.");
  await send({ type: "start", ids, random });
}
export function renderRun(run: Run | null): void {
  element("run-title").textContent = run
    ? `Run ${run.status}`
    : "No active run";
  const active = run && ["running", "paused"].includes(run.status);
  element<HTMLButtonElement>("next").disabled = !active;
  element<HTMLButtonElement>("pause").disabled = !active;
  element("pause").textContent = run?.status === "paused" ? "Resume" : "Pause";
  element("error").textContent = run?.pauseReason || "";
  const list = element("game-list");
  list.replaceChildren();
  for (const game of games) {
    const item = run?.games[game.id];
    if (!item) continue;
    const row = document.createElement("div");
    row.className = "game-row";
    const info = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = game.name;
    const detail = document.createElement("p");
    detail.className = "hint";
    detail.textContent = item.result
      ? `${item.result.outcome} · ${item.result.score}${item.result.preexisting ? " · previously completed" : ""}`
      : `${item.progress} guesses · unfinished`;
    const timer = document.createElement("span");
    timer.id = `time-${game.id}`;
    info.append(name, detail, timer);
    row.append(
      info,
      button(`Open ${game.name}`, () =>
        send({ type: "openGame", gameId: game.id }),
      ),
    );
    if (item.result && !item.screenshotKey)
      row.append(
        button("Retry screenshot", () =>
          send({ type: "retryCapture", gameId: game.id }),
        ),
      );
    if (item.error) {
      const error = document.createElement("p");
      error.className = "error";
      error.textContent = item.error;
      row.append(error);
    }
    list.append(row);
  }
  renderTimers(run);
}
export function renderTimers(run: Run | null): void {
  const display = run && projected(run, Date.now());
  element("elapsed").textContent = display
    ? `Total time: ${duration(display.clock.totalMs)}`
    : "";
  if (display)
    for (const [id, item] of Object.entries(display.games)) {
      const el = document.getElementById(`time-${id}`);
      if (el) el.textContent = `Game time: ${duration(item.activeMs)}`;
    }
}
export function wireRunControls(getRun: () => Run | null): void {
  onClick("next", () => send({ type: "next" }));
  onClick("pause", () =>
    send({ type: getRun()?.status === "paused" ? "resume" : "pause" }),
  );
}
