(() => {
  const G = globalThis.Gauntlet;
  const boardSelector =
    '#wordle-app-game [class*="Board-module_board__"], #wordle-app-game [data-testid="board"]';
  G.adapters.wordle = {
    boardSelector,
    overlays:
      'dialog[open], [data-testid="modal-overlay"], [class*="Modal-module_modalOverlay"], [class*="Toast-module_toast"]',
    read(doc = document, storage = localStorage, now = new Date()) {
      const board = doc.querySelector(boardSelector);
      if (!board) return null;
      const rows = [
        ...board.querySelectorAll(
          '[role="group"], [class*="Row-module_row__"]',
        ),
      ];
      if (rows.length !== 6) return null;
      const states = rows.map((row) =>
        [...row.querySelectorAll("[data-state]")].map((t) => t.dataset.state),
      );
      if (states.some((row) => row.length !== 5)) return null;
      const settled = states.filter((row) =>
        row.every((s) => ["correct", "present", "absent"].includes(s)),
      );
      const won = settled.some((row) => row.every((s) => s === "correct"));
      const complete = won || settled.length === 6;
      const day = G.localDay(now);
      // Daily puzzle numbering is based on calendar days, independent of DST.
      const number = Math.round(
        (Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) -
          Date.UTC(2021, 5, 19)) /
          86400000,
      );
      // Current Wordle stores settings per account; choose the newest settings record.
      const records = Object.keys(storage)
        .filter((k) => k.startsWith("games-settings-wordleV2/"))
        .flatMap((k) => G.readJSON(storage, k)?.states || [])
        .filter((s) => s.puzzleId === "settings" && s.data)
        .sort((a, b) => b.timestamp - a.timestamp);
      const settings = records[0]?.data || {};
      const hardMode = settings.hardMode === true;
      const highContrast = settings.colorblindMode === true;
      const dark =
        G.readJSON(storage, "nyt-wordle-darkmode") ??
        settings.darkMode ??
        false;
      const colors = {
        correct: highContrast ? "🟧" : "🟩",
        present: highContrast ? "🟦" : "🟨",
        absent: dark ? "⬛" : "⬜",
      };
      const outcome = won ? "won" : "lost";
      return {
        game: "wordle",
        puzzleId: `wordle:${day}`,
        ready: true,
        complete,
        progress: settled.length,
        ...(complete
          ? {
              outcome,
              score: `${won ? settled.length : "X"}/6`,
              guesses: settled.length,
              shareText: `Wordle ${number.toLocaleString("en-US")} ${won ? settled.length : "X"}/6${hardMode ? "*" : ""}\n\n${settled.map((row) => row.map((s) => colors[s]).join("")).join("\n")}`,
              shareSource: "reconstructed-from-board",
              spoiler: {
                words: rows
                  .slice(0, settled.length)
                  .map((r) =>
                    [...r.querySelectorAll("[data-state]")]
                      .map((t) => t.textContent.trim())
                      .join(""),
                  ),
                states: settled,
              },
            }
          : {}),
      };
    },
  };
})();
