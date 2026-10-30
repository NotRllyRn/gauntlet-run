const api = globalThis.browser || chrome,
  G = globalThis.Gauntlet;
const $ = (id) => document.getElementById(id);
let order = G.games.map((g) => g.id),
  selected = new Set(order),
  runs = [],
  active,
  chosen;
function lineup() {
  $("lineup").replaceChildren();
  order.forEach((id, i) => {
    const row = document.createElement("div");
    row.className = "lineup";
    const label = document.createElement("label"),
      check = document.createElement("input");
    check.type = "checkbox";
    check.checked = selected.has(id);
    check.onchange = () => {
      check.checked ? selected.add(id) : selected.delete(id);
      persistSettings();
    };
    label.append(check, ` ${G.games.find((g) => g.id === id).name}`);
    row.append(label);
    for (const [text, delta] of [
      ["↑", -1],
      ["↓", 1],
    ]) {
      const button = document.createElement("button");
      button.textContent = text;
      button.className = "secondary";
      button.setAttribute(
        "aria-label",
        `Move ${id} ${delta < 0 ? "up" : "down"}`,
      );
      button.disabled = i + delta < 0 || i + delta >= order.length;
      button.onclick = () => {
        [order[i], order[i + delta]] = [order[i + delta], order[i]];
        lineup();
        persistSettings();
      };
      row.append(button);
    }
    $("lineup").append(row);
  });
}
function persistSettings() {
  api.storage.local.set({
    settings: { order, selected: [...selected], random: $("random").checked },
  });
}
$("random").onchange = persistSettings;
async function message(type, extras = {}) {
  const r = await api.runtime.sendMessage({ type, ...extras });
  if (r?.error) throw new Error(r.error);
  await refresh();
}
function action(id, fn) {
  $(id).onclick = async () => {
    try {
      await fn();
    } catch (e) {
      $("error").textContent = e.message;
    }
  };
}
action("start", async () => {
  // Must be requested directly from a user gesture, before other awaited calls.
  const granted = await api.permissions.request({ origins: ["<all_urls>"] });
  if (!granted)
    throw new Error(
      "Automatic cross-site screenshots require the optional all-sites permission. No run started.",
    );
  await message("start", {
    ids: order.filter((id) => selected.has(id)),
    random: $("random").checked,
  });
});
action("retry", () => message("retry"));
action("stop", () => message("stop"));
function chosenRun() {
  return runs.find((r) => r.id === chosen) || active;
}
function renderShare() {
  const run = chosenRun();
  $("summary").textContent = run
    ? G.summary(run)
    : "Finish a run to share your results.";
  for (const id of ["copy", "image", "json"]) $(id).disabled = !run;
}
$("history").onchange = () => {
  chosen = $("history").value;
  renderShare();
};
action("copy", () => navigator.clipboard.writeText(G.summary(chosenRun())));
function download(blob, name) {
  const a = document.createElement("a"),
    url = URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
action("json", () =>
  download(
    new Blob([JSON.stringify(chosenRun(), null, 2)], {
      type: "application/json",
    }),
    `gauntlet-${chosenRun().id}.json`,
  ),
);
action("image", async () =>
  download(
    await G.spoilerImage(chosenRun()),
    `gauntlet-spoilers-${chosenRun().id}.png`,
  ),
);
async function refresh() {
  const data = await api.storage.local.get(["activeRun", "history"]);
  active = data.activeRun;
  runs = [
    ...(active ? [active] : []),
    ...(data.history || []).filter((r) => r.id !== active?.id),
  ];
  $("history").replaceChildren(
    ...runs.map((r) => {
      const option = document.createElement("option");
      option.value = r.id;
      option.textContent = `${new Date(r.createdAt).toLocaleString()} · ${r.status}`;
      return option;
    }),
  );
  if (!runs.some((r) => r.id === chosen)) chosen = runs[0]?.id;
  if (chosen) $("history").value = chosen;
  $("start").disabled = active?.status === "running";
  $("stop").disabled = active?.status !== "running";
  $("retry").disabled = active?.status !== "running";
  $("run-title").textContent = active ? `Run ${active.status}` : "No run yet";
  $("status").textContent = active
    ? `Play order: ${active.order.map((id) => G.games.find((g) => g.id === id).name).join(" → ")}${active.stage ? ` · Current: ${active.stage.game}` : ""}`
    : "";
  $("error").textContent = active?.error || "";
  $("results").replaceChildren();
  for (const game of G.games) {
    const r = active?.results[game.id];
    if (!r) continue;
    const div = document.createElement("div");
    div.className = "result";
    const title = document.createElement("strong");
    title.textContent = `${game.name}: ${r.score} · ${r.preexisting ? "Previously completed" : G.duration(r.elapsedMs)}`;
    const pre = document.createElement("pre");
    pre.textContent = r.shareText;
    const details = document.createElement("details"),
      summary = document.createElement("summary");
    summary.textContent = "Show saved board screenshot (spoiler)";
    const img = document.createElement("img");
    img.src = r.screenshot;
    img.alt = `${game.name} completed board, contains spoilers`;
    details.append(summary, img);
    div.append(title, pre, details);
    $("results").append(div);
  }
  renderShare();
}
const { settings } = await api.storage.local.get("settings");
if (settings) {
  order = settings.order;
  selected = new Set(settings.selected);
  $("random").checked = settings.random;
}
lineup();
refresh();
api.storage.onChanged.addListener(refresh);

setInterval(() => {
  $("elapsed").textContent = active
    ? `Elapsed: ${G.duration((active.finishedAt || Date.now()) - active.startedAt)}${active.stage ? ` · Guesses: ${active.stage.progress ?? 0}` : ""}`
    : "";
}, 1000);
