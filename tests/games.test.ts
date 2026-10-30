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
  assert.equal(gameForURL("https://krillion.io/")?.id, "krillion");
  assert.equal(
    gameForURL("https://minecraftle.zachmanson.com/?utm_source=test")?.id,
    "minecraftle",
  );
  for (const url of [
    "https://minecraftle.zachmanson.com/?random=true",
    "https://minecraftle.zachmanson.com/?random=",
    "https://minecraftle.zachmanson.com/stats",
    "https://krillion.io/archive",
    "https://krillion.io/unlimited/classic",
    "https://krillion.io/party",
    "https://globle-game.com/practice",
    "https://www.nytimes.com/games/connections",
    "https://example.com/game",
    "invalid",
  ])
    assert.equal(gameForURL(url), undefined);
});
