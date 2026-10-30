// Live integration test in a fresh, disposable profile. Never runs in a player's profile.
// The Globle answer is obtained only by this TEST harness to exercise its real win path.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
const dir = path.resolve("dist/test-chrome");
await fs.rm(dir, { recursive: true, force: true });
await fs.cp("dist/chrome", dir, { recursive: true });
const manifest = JSON.parse(await fs.readFile(`${dir}/manifest.json`));
manifest.host_permissions = ["<all_urls>"];
await fs.writeFile(`${dir}/manifest.json`, JSON.stringify(manifest));
const context = await chromium.launchPersistentContext("", {
  headless: true,
  channel: "chromium",
  args: [
    "--no-sandbox",
    `--disable-extensions-except=${dir}`,
    `--load-extension=${dir}`,
  ],
  viewport: { width: 1280, height: 1000 },
});
try {
  const worker =
    context.serviceWorkers()[0] ||
    (await context.waitForEvent("serviceworker"));
  worker.on("console", (m) => console.log("worker", m.text()));
  const id = new URL(worker.url()).hostname;
  const dashboard = await context.newPage();
  await dashboard.goto(`chrome-extension://${id}/dashboard.html`);
  console.log("dashboard", await dashboard.title());
  const pagePromise = context.waitForEvent("page");
  console.log(
    "start",
    await dashboard.evaluate(() =>
      chrome.runtime.sendMessage({ type: "start", ids: ["wordle", "globle"] }),
    ),
  );
  const page = await pagePromise.catch(() => null);
  console.log("extension launched game tab");
  const game = page || context.pages().find((p) => p.url().includes("nytimes"));
  await game.waitForLoadState("domcontentloaded");
  console.log("game", game.url());
  await game
    .getByRole("button", { name: "Play", exact: true })
    .click({ timeout: 45000 });
  await game.waitForTimeout(5000);
  if (await game.getByRole("button", { name: /Continue to Wordle/ }).count())
    await game.getByRole("button", { name: /Continue to Wordle/ }).click();
  await game
    .getByRole("button", { name: "Close", exact: true })
    .click({ timeout: 30000 });
  await game.waitForTimeout(2500);
  console.log(
    "wordle storage",
    await game.evaluate(() =>
      Object.keys(localStorage).filter((k) => /wordle/i.test(k)),
    ),
  );
  for (const word of ["crane", "sloth", "bumpy", "vivid", "jazzy", "fewer"]) {
    if (!game.url().includes("nytimes")) break;
    await game.keyboard.type(word);
    await game.keyboard.press("Enter");
    await game.waitForTimeout(1900);
  }
  await game.waitForTimeout(5000);
  let run = await dashboard.evaluate(
    async () => (await chrome.storage.local.get("activeRun")).activeRun,
  );
  console.log(
    "after wordle",
    JSON.stringify({
      ...run,
      results: Object.fromEntries(
        Object.entries(run.results).map(([k, v]) => [
          k,
          { ...v, screenshot: v.screenshot?.slice(0, 50) },
        ]),
      ),
    }),
  );
  if (!run.results.wordle) {
    await game.screenshot({ path: "research/wordle-failure.png" });
    await fs.writeFile("/tmp/wordle-complete.html", await game.content());
    throw new Error(run.error || "Wordle did not save");
  }
  await fs.writeFile(
    "research/wordle-board.png",
    Buffer.from(run.results.wordle.screenshot.split(",")[1], "base64"),
  );
  await game.waitForURL("https://globle-game.com/game");
  await game.waitForSelector('[data-cy="guesser"]');
  await game.waitForTimeout(2000);
  // Decode the same daily test puzzle the page loaded. This code is never shipped in the extension.
  const payload = await game.evaluate(async () => {
    const url = performance
      .getEntriesByType("resource")
      .map((e) => e.name)
      .find((u) => u.includes("/answer?"));
    return (await (await fetch(url)).json()).answer;
  });
  const bytes = Buffer.from(payload, "base64"),
    salt = bytes.subarray(8, 16),
    password = Buffer.from("ee53e68c3074206a002bf01333b047d5");
  let material = Buffer.alloc(0),
    last = Buffer.alloc(0);
  while (material.length < 48) {
    last = crypto
      .createHash("md5")
      .update(Buffer.concat([last, password, salt]))
      .digest();
    material = Buffer.concat([material, last]);
  }
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    material.subarray(0, 32),
    material.subarray(32, 48),
  );
  const index = Number(
    Buffer.concat([
      decipher.update(bytes.subarray(16)),
      decipher.final(),
    ]).toString(),
  );
  const answer = await game.evaluate(async (index) => {
    const url = [...document.scripts].find(
      (s) => s.type === "module" && s.src.includes("/assets/index-"),
    ).src;
    const mod = await import(url);
    const geo = Object.values(mod).find(
      (v) => v?.features?.[0]?.properties?.NAME,
    );
    return geo.features[index].properties.NAME;
  }, index);
  await game.locator('[data-cy="guesser"]').fill(answer);
  await game.locator('[data-cy="guesser"]').press("Enter");
  await game.waitForTimeout(9000);
  run = await dashboard.evaluate(
    async () => (await chrome.storage.local.get("activeRun")).activeRun,
  );
  console.log(
    "after globle",
    run.status,
    run.error,
    run.stage,
    run.results.globle?.shareText,
  );
  if (!run.results.globle) {
    await game.screenshot({ path: "research/globle-failure.png" });
    await fs.writeFile("/tmp/globle-complete.html", await game.content());
    console.log(
      "state",
      await game.evaluate(() => ({
        guesses: localStorage.guesses,
        statistics: localStorage.statistics,
      })),
    );
    throw new Error("Globle did not save");
  }
  await fs.writeFile(
    "research/globle-board.png",
    Buffer.from(run.results.globle.screenshot.split(",")[1], "base64"),
  );
  await fs.writeFile(
    "research/live-run-raw.json",
    JSON.stringify(run, null, 2),
  );
  console.log(
    "PASS live Wordle loss → Globle win, screenshots saved, run complete.",
  );
} finally {
  await context.close();
}
