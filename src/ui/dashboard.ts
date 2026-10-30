import { wireShareControls, renderShareControls } from "./share-controls";
import { api } from "../browser/api";
import { games } from "../games";
import { summary, spoilerImage } from "../sharing";
import { imagesFor, exportRun } from "../run/storage";
import type { Run, Settings } from "../types";
import {
  element,
  button,
  onClick,
  renderRun,
  renderTimers,
  send,
  startRun,
  wireRunControls,
} from "./common";
let active: Run | null = null,
  runs: Run[] = [],
  chosen: string | undefined;
let order = games.map((g) => g.id),
  selected = new Set(order),
  resultSignature = "";
const check = (id: string) => element<HTMLInputElement>(id);
function persistSettings(): void {
  void api.storage.local.set({
    settings: {
      order,
      selected: [...selected],
      random: check("random").checked,
    },
  });
}
function lineup(): void {
  element("lineup").replaceChildren();
  order.forEach((id, i) => {
    const row = document.createElement("div");
    row.className = "lineup";
    const label = document.createElement("label"),
      input = document.createElement("input");
    input.type = "checkbox";
    input.checked = selected.has(id);
    input.onchange = () => {
      input.checked ? selected.add(id) : selected.delete(id);
      persistSettings();
    };
    label.append(input, ` ${games.find((g) => g.id === id)!.name}`);
    row.append(label);
    for (const [text, delta] of [
      ["↑", -1],
      ["↓", 1],
    ] as const) {
      const b = button(text, () => {
        [order[i], order[i + delta]] = [order[i + delta], order[i]];
        lineup();
        persistSettings();
      });
      b.disabled = i + delta < 0 || i + delta >= order.length;
      b.setAttribute("aria-label", `Move ${id} ${delta < 0 ? "up" : "down"}`);
      row.append(b);
    }
    element("lineup").append(row);
  });
}
function chosenRun(): Run | undefined {
  return runs.find((r) => r.id === chosen) || active || undefined;
}
function renderShare(): void {
  const run = chosenRun();
  element("summary").textContent = run
    ? summary(run)
    : "Start a run to save results.";
  void renderResults(run);
  renderShareControls(run);
  for (const id of ["image", "json"])
    element<HTMLButtonElement>(id).disabled = !run;
}
function download(blob: Blob, name: string): void {
  const a = document.createElement("a"),
    url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
wireRunControls(() => active);
onClick("start", () =>
  startRun(
    order.filter((id) => selected.has(id)),
    check("random").checked,
  ),
);
onClick("stop", () => send({ type: "stop" }));
wireShareControls(chosenRun);
onClick("json", async () => {
  const run = chosenRun()!;
  download(
    new Blob([JSON.stringify(await exportRun(run), null, 2)], {
      type: "application/json",
    }),
    `gauntlet-${run.id}.json`,
  );
});
onClick("image", async () => {
  const run = chosenRun()!;
  download(
    await spoilerImage(run, await imagesFor(run)),
    `gauntlet-spoilers-${run.id}.png`,
  );
});
check("random").onchange = persistSettings;
element<HTMLSelectElement>("history").onchange = () => {
  chosen = element<HTMLSelectElement>("history").value;
  renderShare();
};
async function refresh(): Promise<void> {
  const data = (await api.storage.local.get(["activeRun", "history"])) as {
    activeRun?: Run;
    history?: Run[];
  };
  active = data.activeRun || null;
  runs = [
    ...(active ? [active] : []),
    ...((data.history || []) as Run[]).filter((r) => r.id !== active?.id),
  ];
  const history = element<HTMLSelectElement>("history");
  history.replaceChildren(
    ...runs.map((r) => {
      const o = document.createElement("option");
      o.value = r.id;
      o.textContent = `${new Date(r.createdAt).toLocaleString()} · ${r.status}`;
      return o;
    }),
  );
  if (!runs.some((r) => r.id === chosen)) chosen = runs[0]?.id;
  if (chosen) history.value = chosen;
  const running = Boolean(
    active && ["running", "paused"].includes(active.status),
  );
  element<HTMLButtonElement>("start").disabled = running;
  element<HTMLButtonElement>("stop").disabled = !running;
  renderRun(active);
  renderShare();
}
async function renderResults(run: Run | undefined): Promise<void> {
  const signature = JSON.stringify(
    run &&
      Object.entries(run.games).map(([id, item]) => [
        id,
        item.result,
        item.screenshotKey,
      ]),
  );
  if (signature === resultSignature) return;
  resultSignature = signature;
  element("results").replaceChildren();
  if (!run) return;
  const images = await imagesFor(run);
  if (signature !== resultSignature) return;
  for (const game of games) {
    const item = run.games[game.id];
    if (!item?.result) continue;
    const div = document.createElement("div");
    div.className = "result";
    const title = document.createElement("strong");
    title.textContent = `${game.name}: ${item.result.score}`;
    const pre = document.createElement("pre");
    pre.textContent = item.result.shareText;
    const copy = button(`Copy ${game.name} share result (no spoilers)`, () =>
      navigator.clipboard.writeText(item.result!.shareText),
    );
    div.append(title, pre, copy);
    if (item.screenshotKey && images[item.screenshotKey]) {
      const details = document.createElement("details"),
        caption = document.createElement("summary");
      caption.textContent = "Show saved board (spoiler)";
      const image = document.createElement("img");
      image.src = images[item.screenshotKey];
      image.alt = `${game.name} result board (spoiler)`;
      details.append(caption, image);
      div.append(details);
    }
    element("results").append(div);
  }
}
async function init(): Promise<void> {
  await send({ type: "getRun" });
  const { settings } = (await api.storage.local.get("settings")) as {
    settings?: Settings;
  };
  if (settings) {
    order = games
      .map((g) => g.id)
      .sort((a, b) => settings.order.indexOf(a) - settings.order.indexOf(b));
    selected = new Set(
      (settings.selected as string[]).filter((id) => order.includes(id)),
    );
    check("random").checked = Boolean(settings.random);
  }
  lineup();
  await refresh();
  api.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && (changes.activeRun || changes.history))
      void refresh();
  });
}
void init();
setInterval(() => renderTimers(active), 500);
