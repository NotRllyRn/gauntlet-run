// Disposable Chromium profile only. Default: let all seven rounds expire naturally.
// Optional saved storage JSON reopens a previously observed live result for capture checks.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { openLiveExtension, waitForSavedResult } from "./live-browser.mjs";
const { context, dashboard, start } = await openLiveExtension("krillion");
try {
  if (process.argv[2]) {
    const storage = JSON.parse(await fs.readFile(process.argv[2], "utf8"));
    await context.addInitScript((data) => {
      if (location.origin === "https://krillion.io")
        for (const [key, value] of Object.entries(data))
          localStorage.setItem(key, value);
    }, storage);
  }
  const page = await start("krillion");
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
  const saved = await waitForSavedResult(dashboard, "krillion");
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
