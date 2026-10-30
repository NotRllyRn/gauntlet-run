// Disposable Chromium profile only. Default: let all seven rounds expire naturally.
// Optional saved storage JSON reopens a previously observed live result for capture checks.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
const dir = path.resolve("dist/test-krillion-live");
await fs.rm(dir, { recursive: true, force: true });
await fs.cp("dist/chrome", dir, { recursive: true });
const manifest = JSON.parse(await fs.readFile(dir + "/manifest.json", "utf8"));
manifest.host_permissions = ["<all_urls>"];
await fs.writeFile(dir + "/manifest.json", JSON.stringify(manifest));
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
  if (process.argv[2]) {
    const storage = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
    await context.addInitScript((data) => {
      if (location.origin === "https://krillion.io")
        for (const [key, value] of Object.entries(data))
          localStorage.setItem(key, value);
    }, storage);
  }
  const worker =
    context.serviceWorkers()[0] ??
    (await context.waitForEvent("serviceworker"));
  const id = new URL(worker.url()).hostname;
  const dashboard = await context.newPage();
  await dashboard.goto(`chrome-extension://${id}/dashboard.html`);
  const opened = context.waitForEvent("page");
  const start = await dashboard.evaluate(() =>
    chrome.runtime.sendMessage({
      type: "start",
      ids: ["krillion"],
      random: false,
    }),
  );
  assert(!start.error, start.error);
  const page = await opened;
  await page.waitForLoadState("domcontentloaded");
  if (!process.argv[2]) {
    await page
      .getByRole("button", { name: "▼ BEGIN DESCENT ▼" })
      .click({ force: true });
    for (let round = 0; round < 7; round++) {
      const next = page
        .locator(".ds-next-btn")
        .filter({ hasText: /DESCEND|SURFACE/ });
      await next.waitFor({ state: "visible", timeout: 50000 });
      await next.click({ force: true });
      console.log("Finished round", round + 1);
    }
  }
  await page
    .getByRole("button", { name: "Copy result", exact: true })
    .waitFor({ timeout: 30000 });
  let saved;
  for (let attempt = 0; attempt < 60; attempt++) {
    saved = await dashboard.evaluate(async () => {
      const { activeRun } = await chrome.storage.local.get("activeRun");
      const key = activeRun.games.krillion.screenshotKey;
      return {
        run: activeRun,
        image: key ? (await chrome.storage.local.get(key))[key] : null,
      };
    });
    if (saved.image && saved.run.games.krillion.result) break;
    await page.waitForTimeout(500);
  }
  assert(saved.image, JSON.stringify(saved.run));
  // Intercept only this disposable page's copy action to compare the site's actual text.
  await page.evaluate(() => {
    window.copiedResult = null;
    document.execCommand = () => false;
    navigator.clipboard.writeText = async (text) => {
      window.copiedResult = text;
    };
  });
  await page.getByRole("button", { name: "Copy result", exact: true }).click();
  const native = await page.evaluate(() => window.copiedResult);
  assert.equal(saved.run.games.krillion.result.shareText, native);
  assert.equal(saved.run.games.krillion.result.outcome, "completed");
  assert.equal(saved.run.status, "complete");
  await fs.writeFile(
    "research/krillion-result.png",
    Buffer.from(saved.image.split(",")[1], "base64"),
  );
  await fs.writeFile(
    "research/krillion-live-raw.json",
    JSON.stringify(saved.run, null, 2),
  );
  console.log(
    "PASS live Krillion: completion, native share equality, saved metrics, result-panel screenshot.",
  );
  console.log(native);
} finally {
  await context.close();
}
