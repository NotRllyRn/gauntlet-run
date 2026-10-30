// Shared disposable Chrome setup for live game checks; never shipped.
import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
export async function openLiveExtension(name) {
  const dir = path.resolve(`dist/test-${name}-live`);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.cp("dist/chrome", dir, { recursive: true });
  const manifest = JSON.parse(
    await fs.readFile(dir + "/manifest.json", "utf8"),
  );
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
    const worker =
      context.serviceWorkers()[0] ??
      (await context.waitForEvent("serviceworker"));
    const dashboard = await context.newPage();
    await dashboard.goto(
      `chrome-extension://${new URL(worker.url()).hostname}/dashboard.html`,
    );
    return {
      context,
      dashboard,
      async start(gameId) {
        const opened = context.waitForEvent("page");
        const response = await dashboard.evaluate(
          (id) =>
            chrome.runtime.sendMessage({
              type: "start",
              ids: [id],
              random: false,
            }),
          gameId,
        );
        assert(!response.error, response.error);
        const page = await opened;
        await page.waitForLoadState("domcontentloaded");
        return page;
      },
    };
  } catch (error) {
    await context.close();
    throw error;
  }
}
export async function waitForSavedResult(dashboard, gameId) {
  let saved;
  for (let attempt = 0; attempt < 60; attempt++) {
    saved = await dashboard.evaluate(async (id) => {
      const { activeRun } = await chrome.storage.local.get("activeRun");
      const key = activeRun.games[id].screenshotKey;
      return {
        run: activeRun,
        image: key ? (await chrome.storage.local.get(key))[key] : null,
      };
    }, gameId);
    if (saved.image && saved.run.games[gameId].result) return saved;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Result capture timed out: ${JSON.stringify(saved.run)}`);
}
