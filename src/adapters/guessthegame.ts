import type { Adapter } from "../types";
const ranks: [number, string][] = [
  [0, "Rookie Guesser"],
  [5, "Gamer"],
  [10, "Game Navigator"],
  [20, "Screenshot Sleuth"],
  [40, "Pro Gamer"],
  [80, "Insightful Guesser"],
  [150, "Visual Virtuoso"],
  [200, "Master Gamer"],
  [250, "Game Guessing Guru"],
  [300, "Distinguished Game Detective"],
  [350, "Elite Guesser"],
  [400, "Exalted Game Guru"],
  [430, "Extraordinary Guesser"],
  [470, "Champion of the Six Screens"],
  [500, "Prodigious Game Guesser"],
  [530, "Masterful Mind of the Six"],
  [560, "Superior Screenshot Strategist"],
  [600, "Grandmaster Guesser"],
  [630, "Supreme Screenshot Savant"],
  [700, "Sovereign of Guess the Game"],
  [750, "Grand Game Guesser"],
  [800, "Ultimate Game Connoisseur"],
  [900, "Eternal Expert of Gaming"],
  [1000, "Omni-Gamer"],
  [1100, "Galactic Guru of Gaming"],
  [1300, "Legendary Game Oracle"],
];
export const guessthegame: Adapter = {
  captureBackground: false,
  boardSelector: ".current-game .Screenshots",
  resultSelector: ".current-game .result",
  overlays: '.modal, [role="dialog"], .fs-sticky-footer',
  read(doc, storage, now) {
    const board = doc.querySelector(".current-game");
    const id = board
      ?.querySelector(".current-game-number")
      ?.textContent?.match(/^Game #(\d+)/)?.[1];
    const today = Math.ceil(
      (now.getTime() - new Date(2022, 4, 15).getTime()) / 86400000,
    );
    if (!id || Number(id) !== today || !board?.querySelector(".Screenshots"))
      return null;
    const state = storage.getItem(`${id}_gamestate`);
    if (!["playing", "win", "lose"].includes(state ?? "")) return null;
    const all = Array.from(
      { length: 6 },
      (_, i) => storage.getItem(`${id}_guess${i + 1}`) ?? "",
    );
    const count = all.filter(Boolean).length;
    if (
      all.some(
        (g, i) => g.length > 500 || (i < count && !g) || (i >= count && !!g),
      )
    )
      return null;
    const guesses = all.slice(0, count);
    const base = {
      game: "guessthegame",
      puzzleId: `guessthegame:${id}`,
      progress: count,
      complete: false,
      checkpoint: { guesses },
    };
    const panel = board.querySelector(".result");
    const answer = panel?.querySelector(".answer span")?.textContent?.trim();
    const won = state === "win";
    if (
      !panel ||
      !answer ||
      !count ||
      state === "playing" ||
      (!won && count !== 6) ||
      !panel.querySelector(won ? ".win-msg" : ".lose-msg") ||
      !panel.querySelector("#share-results-btn")
    )
      return base;
    const flags = guesses.map((_, i) =>
      storage.getItem(`${id}_guess${i + 1}_f`),
    );
    if (flags.some((f) => f !== "true" && f !== "false")) return base;
    const enabled = (key: string) => storage.getItem(key) !== "false";
    let wins = 0;
    for (let n = 1; n <= today; n++)
      if (storage.getItem(`${n}_gamestate`) === "win") wins++;
    const rank = ranks
      .filter(([n]) => wins >= n)
      .at(-1)![1]
      .replaceAll(" ", "");
    const member = storage.getItem("user_hint");
    // Membership changes native rank decoration; retain no account data.
    const badge = member && member !== "null" ? "🕹️" : "";
    const grid = Array.from({ length: 6 }, (_, i) =>
      i >= count
        ? "⬜"
        : won && i === count - 1
          ? "🟩"
          : enabled("franchiseToggle") && flags[i] === "true"
            ? "🟨"
            : "🟥",
    ).join(" ");
    const url = enabled("linkToPuzzleToggle")
      ? `https://GuessThe.Game/p/${id}`
      : "GuessThe.Game";
    const shareText =
      `#GuessTheGame #${id}\n\n🎮 ${grid}\n\n${enabled("rankToggle") ? `${badge}#${rank}${badge}\n` : ""}${enabled("shareLinkToggle") ? url : ""}`.trimEnd();
    return {
      ...base,
      complete: true,
      outcome: won ? "won" : "lost",
      score: `${won ? count : "X"}/6`,
      guesses: count,
      metrics: { guesses: count, maxGuesses: 6 },
      shareText,
      shareSource: "reconstructed-from-submitted-guesses-and-revealed-result",
      spoiler: { answer, guesses },
    };
  },
};
