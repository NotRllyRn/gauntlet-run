(() => {
  const G = globalThis.Gauntlet;
  G.adapters.globle = {
    boardSelector: ".scene-container canvas",
    // The current Globle statistics card is an absolutely positioned .m element.
    overlays:
      '[role="dialog"], dialog[open], .m.absolute.z-40, .float-tooltip-kap',
    read(doc = document, storage = localStorage, now = new Date()) {
      if (
        !doc.querySelector(".scene-container canvas") ||
        !doc.querySelector('[data-cy="guesser"]')
      )
        return null;
      const guesses = G.readJSON(storage, "guesses"),
        stats = G.readJSON(storage, "statistics");
      const day = G.localDay(now);
      if (!guesses || guesses.day !== day || !Array.isArray(guesses.countries))
        return null;
      const count = guesses.countries.length;
      const lastWin =
        typeof stats?.lastWin === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test(stats.lastWin)
          ? stats.lastWin
          : G.localDay(new Date(stats?.lastWin));
      // Today's win, a matching guess count, and the disabled result form must agree.
      const complete =
        count > 0 &&
        lastWin === day &&
        stats.usedGuesses?.at(-1) === count &&
        typeof stats.emojiGuesses === "string" &&
        stats.emojiGuesses.includes("🟩") &&
        doc.querySelector('[data-cy="guesser"]').disabled;
      const result = {
        game: "globle",
        puzzleId: `globle:${day}`,
        ready: true,
        complete: Boolean(complete),
        progress: count,
      };
      if (!complete) return result;
      const avg =
        Math.round(
          (stats.usedGuesses.reduce((a, b) => a + b, 0) /
            stats.usedGuesses.length) *
            100,
        ) / 100;
      const date = new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(now);
      return {
        ...result,
        outcome: "won",
        score: `${count} guesses`,
        guesses: count,
        shareText: `🌎 ${date} 🌍\n🔥 ${stats.currentStreak} | Avg. Guesses: ${avg}\n${stats.emojiGuesses} = ${count}\n\nhttps://globle-game.com\n#globle`,
        shareSource: "reconstructed-from-game-statistics",
        spoiler: { countries: [...guesses.countries] },
      };
    },
  };
})();
