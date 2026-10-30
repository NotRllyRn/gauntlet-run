// Bundled into a test-only extension page, never into release builds.
import { scoreRun, scoreLabel } from "../src/scoring.ts";
import { games } from "../src/games.ts";
import { spoilerImage, summary } from "../src/sharing.ts";
const api = globalThis.browser || chrome;
const origin = globalThis.TEST_ORIGIN;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const send = async (message) => {
  const response = await api.runtime.sendMessage(message);
  if (response?.error) throw new Error(response.error);
  return response;
};
const read = async () => (await send({ type: "getRun" })).run;
const until = async (condition, label) => {
  for (let i = 0; i < 80; i++) {
    const run = await read();
    if (condition(run)) return run;
    await sleep(250);
  }
  throw new Error(`Timed out: ${label}. ${JSON.stringify(await read())}`);
};
const report = (result) =>
  fetch(origin + "/report", { method: "POST", body: JSON.stringify(result) });
async function main() {
  try {
    const { testPhase } = await api.storage.local.get("testPhase");
    if (testPhase !== "second") {
      await send({
        type: "start",
        ids: [
          "wordle",
          ...games
            .filter((g) => !["wordle", "globle"].includes(g.id))
            .map((g) => g.id),
          "globle",
        ],
        random: false,
      });
      await until(
        (r) =>
          r?.games.wordle.progress === 3 && r.games.wordle.activeMs >= 1500,
        "Wordle partial progress and time",
      );
      const tabs = await api.tabs.query({});
      const wordleTab = tabs.find((t) => t.url === origin + "/wordle");
      await api.tabs.create({ url: origin + "/research", active: true });
      await sleep(600);
      const before = await read();
      await sleep(2500);
      const research = await read();
      assert(
        research.games.wordle.activeMs === before.games.wordle.activeMs,
        "Research tab must not add Wordle time",
      );
      assert(
        research.clock.totalMs > before.clock.totalMs,
        "Research should add global time",
      );
      // Open the second game manually, without asking the extension to launch it.
      await api.tabs.create({ url: origin + "/", active: true });
      await until(
        (r) => r.games.globle.activeMs >= 1500,
        "Manual Globle tab tracking",
      );
      const count = (await api.tabs.query({})).length;
      await send({ type: "next" });
      await sleep(900);
      assert(
        (await api.tabs.query({})).length === count,
        "Next game must reuse the unfinished tab",
      );
      assert(
        (await api.tabs.get(wordleTab.id)).url === origin + "/wordle",
        "Original Wordle tab must be preserved",
      );
      assert(
        (await api.tabs.get(wordleTab.id)).active,
        "Next activates the original Wordle tab",
      );
      await send({ type: "openGame", gameId: "wordle" });
      assert(
        (await api.tabs.query({})).length === count,
        "Direct open reuses tab",
      );
      await api.tabs.remove(wordleTab.id);
      await send({ type: "openGame", gameId: "wordle" });
      assert(
        (await api.tabs.query({})).length === count,
        "Closed tab is recreated",
      );
      await send({ type: "pause" });
      const paused = await read();
      await sleep(1600);
      const later = await read();
      assert(
        later.status === "paused" &&
          later.clock.totalMs === paused.clock.totalMs,
        "Pause freezes global time",
      );
      assert(
        later.games.wordle.activeMs === paused.games.wordle.activeMs &&
          later.games.globle.activeMs === paused.games.globle.activeMs,
        "Pause freezes both game timers",
      );
      await send({ type: "resume" });
      await sleep(1300);
      const beforeRestart = await read();
      assert(
        beforeRestart.clock.totalMs > paused.clock.totalMs,
        "Resume restarts global time",
      );
      await api.storage.local.set({ testPhase: "second", beforeRestart });
      await report({ phase: "restart", run: beforeRestart });
    } else {
      const { beforeRestart } = await api.storage.local.get("beforeRestart");
      const recovered = await read();
      assert(
        recovered.status === "paused",
        "Reopened browser must recover paused",
      );
      assert(
        recovered.games.wordle.progress === 3,
        "Partial guesses survive restart",
      );
      assert(
        recovered.clock.totalMs <= beforeRestart.clock.totalMs + 2000,
        "Offline time must not be charged",
      );
      assert(
        recovered.games.wordle.activeMs >= beforeRestart.games.wordle.activeMs,
        "Saved game time survives restart",
      );
      await sleep(1200);
      assert(
        (await read()).clock.totalMs === recovered.clock.totalMs,
        "Recovered run remains paused until resume",
      );
      await send({ type: "resume" });
      await api.tabs.create({ url: origin + "/globle?finish=1", active: true });
      await until(
        (r) => r.games.globle.screenshotKey,
        "Globle completion and screenshot",
      );
      const returnRun = await until(
        (r) => r.currentGameId === "wordle",
        "Auto return to unfinished Wordle",
      );
      assert(
        returnRun.games.wordle.progress === 3,
        "Unfinished Wordle remains at three guesses",
      );
      const active = (
        await api.tabs.query({ active: true, currentWindow: true })
      )[0];
      await api.tabs.update(active.id, {
        url: origin + "/wordle?finish=1",
        active: true,
      });
      await until(
        (r) => r.games.wordle.screenshotKey,
        "Wordle completion and screenshot",
      );
      // Further games use the same completion/capture test flow.
      for (const game of games.filter(
        (g) => !["wordle", "globle"].includes(g.id),
      )) {
        await until(
          (r) => r.currentGameId === game.id,
          "Auto advance to " + game.name,
        );
        await until(
          (r) => r.games[game.id].seen,
          game.name + " partial progress",
        );
        const tab = (
          await api.tabs.query({ active: true, currentWindow: true })
        )[0];
        await api.tabs.update(tab.id, {
          url: origin + "/" + game.id + "?finish=1",
          active: true,
        });
        await until(
          (r) => r.games[game.id].screenshotKey,
          game.name + " result capture",
        );
      }
      const finished = await until(
        (r) => r.status === "complete",
        "All games complete",
      );
      assert(
        scoreRun(finished).unavailable.length === 0,
        `Every browser fixture must be scorable: ${scoreRun(finished).unavailable.join(", ")}`,
      );
      assert(scoreRun(finished).total > 0, "Completed run earns points");
      for (const page of ["dashboard", "popup"]) {
        const frame = document.createElement("iframe");
        frame.src = api.runtime.getURL(`${page}.html`);
        document.body.append(frame);
        await new Promise((resolve) => (frame.onload = resolve));
        for (
          let i = 0;
          i < 40 &&
          frame.contentDocument.getElementById("score").textContent !==
            scoreLabel(finished);
          i++
        )
          await sleep(100);
        const doc = frame.contentDocument;
        assert(
          doc.getElementById("score").textContent === scoreLabel(finished),
          `${page} shows total`,
        );
        if (page === "dashboard")
          assert(
            doc.getElementById("summary").textContent === summary(finished),
            "Dashboard shows canonical summary",
          );
        let copied;
        Object.defineProperty(
          frame.contentWindow.navigator.clipboard,
          "writeText",
          {
            value: async (text) => {
              copied = text;
            },
            configurable: true,
          },
        );
        doc.getElementById("copy").click();
        await sleep(100);
        assert(
          copied === summary(finished),
          `${page} copies scored non-spoiler summary`,
        );
        // Exercise the real PNG clipboard write, not a mock, in both browsers.
        doc.getElementById("copy-image").click();
        for (
          let i = 0;
          i < 100 &&
          doc.getElementById("copy-status").textContent !== "Image copied.";
          i++
        )
          await sleep(100);
        assert(
          doc.getElementById("copy-status").textContent === "Image copied.",
          `${page} image copy: ${doc.getElementById("error").textContent}`,
        );
        frame.remove();
      }
      const images = await api.storage.local.get(
        Object.values(finished.games).map((g) => g.screenshotKey),
      );
      const blob = await spoilerImage(finished, images);
      const shareImage = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      await report({
        phase: "complete",
        run: finished,
        images,
        summary: summary(finished),
        shareImage,
      });
    }
  } catch (error) {
    await report({
      error: error.message,
      stack: error.stack,
      run: await read().catch(() => null),
    });
  }
}
void main();
