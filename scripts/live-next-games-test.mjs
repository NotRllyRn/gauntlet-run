import fs from "node:fs/promises";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { openLiveExtension, waitForSavedResult } from "./live-browser.mjs";
for (const id of ["lewdle", "angle"]) {
  const harness = await openLiveExtension(id);
  try {
    const page = await harness.start(id);
    await page.waitForTimeout(3000);
    if (id === "lewdle") {
      await page.locator(".testOverlayX").click();
      // Disposable test only: select a known winning input, never shipped in the adapter.
      const answer = await page.evaluate(() =>
        atob(JSON.parse(localStorage.getItem("currentTarget"))),
      );
      for (const letter of answer)
        await page
          .locator(".testKeyboard")
          .getByText(letter, { exact: true })
          .click();
      await page
        .locator(".testKeyboard")
        .getByText("ENTER", { exact: true })
        .click();
      await page.locator(".testCountdownButton").waitFor();
    } else {
      for (let i = 0; i < 4; i++) {
        await page.getByLabel("Your angle in degrees").fill("0");
        await page.getByRole("button", { name: "Guess!", exact: true }).click();
        await page.waitForTimeout(200);
      }
      await page
        .getByRole("button", { name: "Results & share", exact: true })
        .click();
    }
    const saved = await waitForSavedResult(harness.dashboard, id);
    await page.evaluate((id) => {
      window.savedShare = null;
      if (id === "lewdle")
        window.Clipboard.copy = (text) => {
          window.savedShare = text;
        };
      else {
        navigator.clipboard.writeText = async (text) => {
          window.savedShare = text;
        };
        navigator.share = undefined;
      }
    }, id);
    await page
      .locator(
        id === "lewdle" ? ".testCountdownButton" : '[data-testid="share-copy"]',
      )
      .click();
    const nativeShare = await page.evaluate(() => window.savedShare);
    const png = PNG.sync.read(Buffer.from(saved.image.split(",")[1], "base64"));
    const colors = new Set();
    for (let i = 0; i < png.data.length; i += 4)
      colors.add(png.data.subarray(i, i + 3).join(","));
    assert(colors.size > 20, "Saved capture must contain visible game content");
    if (id === "lewdle") {
      assert.equal(
        await page.locator(".testMain").evaluate((e) => e.style.opacity),
        "0",
      );
      assert.notEqual(
        await page
          .locator(".testOverlayBG")
          .evaluate((e) => getComputedStyle(e).display),
        "none",
      );
    }
    const result = saved.run.games[id].result;
    assert.equal(result.shareText, nativeShare);
    await fs.writeFile(
      `research/${id}-result.png`,
      Buffer.from(saved.image.split(",")[1], "base64"),
    );
    await fs.writeFile(
      `research/${id}-live-raw.json`,
      JSON.stringify({ result, nativeShare }, null, 2),
    );
    console.log(id, JSON.stringify(result));
  } finally {
    await harness.context.close();
  }
}
