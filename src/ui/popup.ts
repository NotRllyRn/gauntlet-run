import { wireShareControls, renderShareControls } from "./share-controls";
import { api } from "../browser/api";
import { games } from "../games";
import type { Run, Settings } from "../types";
import {
  element,
  onClick,
  renderRun,
  renderTimers,
  send,
  wireRunControls,
} from "./common";
let run: Run | null = null;
async function refresh(): Promise<void> {
  run = (await send({ type: "getRun" })).run || null;
  renderRun(run);
  renderShareControls(run);
}
wireRunControls(() => run);
wireShareControls(() => run);
onClick("dashboard", () =>
  api.tabs.create({ url: api.runtime.getURL("dashboard.html") }),
);
onClick("start", async () => {
  // Request inside the click gesture, before reading asynchronous settings.
  if (!(await api.permissions.request({ origins: ["<all_urls>"] })))
    throw new Error("Screenshot access is required.");
  const { settings } = (await api.storage.local.get("settings")) as {
    settings?: Settings;
  };
  await send({
    type: "start",
    ids:
      settings?.order?.filter((id: string) =>
        settings!.selected.includes(id),
      ) || games.map((g) => g.id),
    random: Boolean(settings?.random),
  });
});
api.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.activeRun) {
    run = (changes.activeRun.newValue as Run) || null;
    renderRun(run);
    renderShareControls(run);
    element<HTMLButtonElement>("start").disabled = Boolean(
      run && ["running", "paused"].includes(run.status),
    );
  }
});
void refresh().then(() => {
  element<HTMLButtonElement>("start").disabled = Boolean(
    run && ["running", "paused"].includes(run.status),
  );
});
setInterval(() => renderTimers(run), 500);
