import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { openLiveExtension, waitForSavedResult } from "./live-browser.mjs";
const { context, dashboard, start } = await openLiveExtension("guessthegame");
try {
  const page = await start("guessthegame");
  await page.locator(".current-game .Screenshots").waitFor();
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Skip", exact: true }).click();
    await page.waitForTimeout(250);
  }
  await page.locator(".result .lose-msg").waitFor();
  await page.evaluate(() => {
    window.nativeShare = null;
    navigator.clipboard.writeText = async (text) => {
      window.nativeShare = text;
    };
  });
  await page.locator("#share-results-btn").evaluate((button) => button.click());
  const nativeShare = await page.evaluate(() => window.nativeShare);
  const saved = await waitForSavedResult(dashboard, "guessthegame");
  const result = saved.run.games.guessthegame.result;
  assert.equal(result.shareText, nativeShare);
  assert.equal(result.outcome, "lost");
  assert.equal(result.score, "X/6");
  assert.equal(result.guesses, 6);
  assert.equal(result.preexisting, false);
  assert.equal(saved.run.status, "complete");
  await fs.writeFile(
    "research/guessthegame-result.png",
    Buffer.from(saved.image.split(",")[1], "base64"),
  );
  await fs.writeFile(
    "research/guessthegame-live-raw.json",
    JSON.stringify(
      {
        url: page.url(),
        puzzleId: saved.run.games.guessthegame.puzzleId,
        result,
        nativeShare,
        screenshotKey: saved.run.games.guessthegame.screenshotKey,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS live GuessTheGame: six skips, saved loss, native share equality, extension screenshot.",
  );
  console.log(nativeShare);
} finally {
  await context.close();
}
