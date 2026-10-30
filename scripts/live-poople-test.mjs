// The site's solver is used only here to drive actual keyboard submissions.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { openLiveExtension, waitForSavedResult } from "./live-browser.mjs";
const { context, dashboard, start } = await openLiveExtension("poople");
try {
  const page = await start("poople");
  await page.waitForFunction(() => typeof window.__poopleSolve === "function");
  const path = await page.evaluate(() => window.__poopleSolve());
  for (const word of path.slice(1)) {
    await page.keyboard.type(word, { delay: 70 });
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
  }
  await page
    .getByRole("button", { name: "Copy results", exact: true })
    .waitFor();
  const saved = await waitForSavedResult(dashboard, "poople");
  await page.evaluate(() => {
    window.nativeShare = null;
    navigator.clipboard.writeText = async (text) => {
      window.nativeShare = text;
    };
  });
  await page.getByRole("button", { name: "Copy results", exact: true }).click();
  const nativeShare = await page.evaluate(() => window.nativeShare);
  assert.equal(saved.run.games.poople.result.shareText, nativeShare);
  assert.equal(saved.run.games.poople.result.outcome, "won");
  assert.equal(saved.run.status, "complete");
  await fs.writeFile(
    "research/poople-result.png",
    Buffer.from(saved.image.split(",")[1], "base64"),
  );
  await fs.writeFile(
    "research/poople-live-raw.json",
    JSON.stringify(
      {
        result: saved.run.games.poople.result,
        nativeShare,
        screenshotKey: saved.run.games.poople.screenshotKey,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS live Poople: saved score, exact native share, extension screenshot.",
  );
} finally {
  await context.close();
}
