import test from "node:test";
import assert from "node:assert/strict";
import { gameForURL } from "../src/games";

test("daily routes and home aliases match without accepting other games or origins", () => {
  for (const url of [
    "https://globle-game.com/",
    "https://globle-game.com/game?source=home",
  ])
    assert.equal(gameForURL(url)?.id, "globle");
  assert.equal(
    gameForURL("https://www.nytimes.com/games/wordle/")?.id,
    "wordle",
  );
  for (const url of [
    "https://globle-game.com/practice",
    "https://www.nytimes.com/games/connections",
    "https://example.com/game",
    "invalid",
  ])
    assert.equal(gameForURL(url), undefined);
});
