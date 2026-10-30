// Deliberate live loss in an isolated profile; no answer lookup or player state.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { openLiveExtension, waitForSavedResult } from "./live-browser.mjs";
const { context, dashboard, start } = await openLiveExtension("guesstheaudio");
try {
  const page = await start("guesstheaudio");
  for (let i = 0; i < 6; i++) {
    await page.locator(".skipButton").click({ timeout: 60000 });
    await page.waitForTimeout(350);
  }
  await page.locator(".result #share-results-btn").waitFor({ timeout: 30000 });
  await page.evaluate(() => {
    navigator.clipboard.writeText = async (text) => {
      window.nativeShare = text;
    };
  });
  await page.locator("#share-results-btn").click();
  const nativeShare = await page.evaluate(() => window.nativeShare);
  const saved = await waitForSavedResult(dashboard, "guesstheaudio");
  const result = saved.run.games.guesstheaudio.result;
  assert.equal(result.shareText, nativeShare);
  assert.equal(result.outcome, "lost");
  assert.equal(result.score, "X/6");
  assert.equal(saved.run.status, "complete");
  await fs.writeFile(
    "research/guesstheaudio-result.png",
    Buffer.from(saved.image.split(",")[1], "base64"),
  );
  await fs.writeFile(
    "research/guesstheaudio-live-raw.json",
    JSON.stringify(
      {
        url: page.url(),
        puzzleId: saved.run.games.guesstheaudio.puzzleId,
        result,
        nativeShare,
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS live GuessTheAudio: saved loss, native share equality, screenshot",
  );
} finally {
  await context.close();
}
