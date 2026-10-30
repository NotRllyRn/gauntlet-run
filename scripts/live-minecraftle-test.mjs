// The test-only recipe lookup exercises the actual site's win path in a disposable profile.
// Production adapters never read the hidden solution or recipe cache.
import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { openLiveExtension, waitForSavedResult } from "./live-browser.mjs";
const { context, dashboard, start } = await openLiveExtension("minecraftle");
try {
  const page = await start("minecraftle");
  await page.locator("#guesses .crafting-output").waitFor();
  const { recipe, ingredients } = await page.evaluate(() => {
    const get = (prefix) =>
      JSON.parse(
        localStorage.getItem(
          Object.keys(localStorage).find((k) => k.startsWith(prefix)),
        ),
      );
    return {
      recipe: get("recipes_")[window.minecraftle.getState().solution],
      ingredients: get("givenIngredients_"),
    };
  });
  for (let row = 0; row < recipe.input.length; row++)
    for (let col = 0; col < recipe.input[row].length; col++) {
      const item = recipe.input[row][col];
      if (!item) continue;
      const index = ingredients.indexOf(item);
      assert(index >= 0, "Missing ingredient " + item);
      await page.locator("main .box:has(h2) .slot").nth(index).click();
      await page.waitForTimeout(100);
      await page
        .locator("#guesses > div:last-child > div:first-child .slot")
        .nth(row * 3 + col)
        .click();
      await page.waitForTimeout(100);
    }
  await page.locator("#guesses .crafting-output .slot").last().click();
  const panel = page.locator('[id^="headlessui-dialog-panel"]');
  await panel.waitFor();
  const saved = await waitForSavedResult(dashboard, "minecraftle");
  await page.evaluate(() => {
    window.copiedResult = null;
    navigator.clipboard.writeText = async (text) => {
      window.copiedResult = text;
    };
  });
  await panel.getByText("Copy", { exact: true }).click();
  const native = await page.evaluate(() => window.copiedResult);
  assert.equal(saved.run.games.minecraftle.result.shareText, native);
  assert.equal(saved.run.games.minecraftle.result.outcome, "won");
  assert.equal(saved.run.games.minecraftle.result.guesses, 1);
  assert.equal(saved.run.games.minecraftle.result.preexisting, false);
  assert.equal(saved.run.status, "complete");
  await fs.writeFile(
    "research/minecraftle-result.png",
    Buffer.from(saved.image.split(",")[1], "base64"),
  );
  await fs.writeFile(
    "research/minecraftle-live-raw.json",
    JSON.stringify(saved.run, null, 2),
  );
  console.log(
    "PASS live Minecraftle: daily win, native Copy equality, saved metrics, result-panel capture.",
  );
  console.log(native);
} finally {
  await context.close();
}
