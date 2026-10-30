import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { PNG } from "pngjs";
import { openLiveExtension, waitForSavedResult } from "./live-browser.mjs";
const harness = await openLiveExtension("costcodle");
try {
  const p = await harness.start("costcodle");
  await p.locator("#guess-input").waitFor();
  for (let i = 0; i < 6; i++) {
    await p.locator("#guess-input").fill("0.01");
    await p.locator("#guess-button").click();
    await p.waitForTimeout(700);
  }
  const saved = await waitForSavedResult(harness.dashboard, "costcodle");
  const result = saved.run.games.costcodle.result;
  await p.evaluate(() => {
    navigator.clipboard.writeText = async (t) => {
      window.savedShare = t;
    };
  });
  await p.locator("#share-button").click();
  const nativeShare = await p.evaluate(() => window.savedShare);
  assert.equal(result.shareText, nativeShare);
  assert.equal(result.outcome, "lost");
  assert.equal(result.metrics.guesses, 6);
  const image = Buffer.from(saved.image.split(",")[1], "base64"),
    png = PNG.sync.read(image);
  assert(png.width > 200 && png.height > 300);
  await fs.writeFile("research/costcodle-result.png", image);
  await fs.writeFile(
    "research/costcodle-live-raw.json",
    JSON.stringify({ result, nativeShare }, null, 2),
  );
  console.log(
    "PASS live Costcodle",
    JSON.stringify({ result, width: png.width, height: png.height }),
  );
} finally {
  await harness.context.close();
}
