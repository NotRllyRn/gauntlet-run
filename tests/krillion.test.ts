import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { krillion } from "../src/adapters/krillion";
import {
  adapterFixtures,
  krillionEntry,
  krillionPanel,
} from "./adapter-fixtures";
const now = adapterFixtures.krillion.now;
function page(entry: unknown = krillionEntry, day = "2026-10-30") {
  const w = new JSDOM(krillionPanel, { url: "https://krillion.io/" }).window;
  w.localStorage.setItem(
    "krillion:stats:v1",
    JSON.stringify({ history: { [day]: entry } }),
  );
  return w;
}
test("Krillion rejects stale, incomplete, inconsistent, and unknown-tier results", () => {
  for (const entry of [
    { ...krillionEntry, score: 301 },
    { ...krillionEntry, results: krillionEntry.results.slice(0, 6) },
    { ...krillionEntry, tiers: Array(7).fill("krillion") },
    {
      ...krillionEntry,
      results: [
        { tier: "unknown", score: 0 },
        ...krillionEntry.results.slice(1),
      ],
    },
    { ...krillionEntry, results: null },
  ]) {
    const w = page(entry);
    assert.notEqual(
      krillion.read(w.document, w.localStorage, now)?.complete,
      true,
    );
    w.close();
  }
  const stale = page(krillionEntry, "2026-10-29");
  assert.equal(krillion.read(stale.document, stale.localStorage, now), null);
  stale.close();
});
test("Krillion follows New York daily date, account namespace, and share-link preference", () => {
  const w = page();
  w.localStorage.setItem("krillion:account-owner:v1", "test/player");
  assert.equal(krillion.read(w.document, w.localStorage, now), null);
  w.localStorage.setItem(
    "krillion:account:test%2Fplayer:krillion:stats:v1",
    w.localStorage.getItem("krillion:stats:v1")!,
  );
  w.localStorage.setItem("krillion-share-link", "1");
  // UTC has rolled over; the New York daily dive has not.
  const result = krillion.read(
    w.document,
    w.localStorage,
    new Date("2026-10-31T02:00:00Z"),
  )!;
  assert.equal(result.complete, true);
  assert.equal(result.puzzleId, "krillion:2026-10-30");
  assert(result.shareText!.endsWith("\n\nhttps://krillion.io"));
  assert.equal(
    krillion.read(w.document, w.localStorage, new Date("2026-10-31T05:00:00Z")),
    null,
  );
  w.close();
});
test("Krillion zero-point dive is completed, not a fabricated win or loss", () => {
  const entry = {
    dayNumber: 107,
    score: 0,
    tiers: Array(7).fill("miss"),
    results: Array.from({ length: 7 }, () => ({ tier: null, score: 0 })),
  };
  const w = page(entry);
  w.document.querySelector(".font-display")!.textContent = "0";
  const result = krillion.read(w.document, w.localStorage, now)!;
  assert.equal(result.complete, true);
  assert.equal(result.outcome, "completed");
  assert.equal(result.metrics?.points, 0);
  assert.equal(result.shareText, "Krillion #107 🦐\n0\n\n⬛⬛⬛⬛⬛⬛⬛");
  w.close();
});

test("Krillion does not complete from a different visible dive or changed display score", () => {
  for (const [selector, text] of [
    [".font-display", "301"],
    [".ds-done-krill + span", "Dive #106 complete"],
  ]) {
    const w = page();
    w.document.querySelector(selector)!.textContent = text;
    assert.equal(
      krillion.read(w.document, w.localStorage, now)?.complete,
      false,
    );
    w.close();
  }
});
