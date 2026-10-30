import type { Adapter } from "../types";
const ranks: Record<number, string> = {
  0: "Rookie Listener",
  5: "Tune Enthusiast",
  10: "Music Explorer",
  20: "Melody Detective",
  40: "Harmony Seeker",
  80: "Song Sleuth",
  150: "Lyric Virtuoso",
  200: "Tune Master",
  250: "Melody Maestro",
  300: "Distinguished Note Detective",
  350: "Elite Listener",
  400: "Exalted Melody Guru",
  430: "Extraordinary Ear",
  470: "Champion of Chords",
  500: "Prodigious Music Guesser",
  530: "Masterful Melody Mind",
  560: "Superior Sound Strategist",
  600: "Grandmaster Listener",
  630: "Supreme Sound Savant",
  700: "Sovereign of Songs",
  750: "Grand Music Guesser",
  800: "Ultimate Melody Connoisseur",
  900: "Eternal Expert of Tunes",
  1000: "Omni-Listener",
  1100: "Galactic Guru of Music",
  1300: "Legendary Music Oracle",
};
export const guesstheaudio: Adapter = {
  captureBackground: true,
  boardSelector: ".current-game",
  resultSelector: ".current-game .result",
  overlays:
    '.current-game .result, .current-game .footer, [role="dialog"], .modal, [id^="guesstheaudio_"], .fs-sticky-slot-element',
  read(doc, storage, now) {
    const day = Math.ceil(
      (now.getTime() - new Date(2023, 4, 4).getTime()) / 86400000,
    );
    const heading = doc
      .querySelector(".current-game-number")
      ?.cloneNode(true) as Element | undefined;
    heading?.querySelectorAll("style, script").forEach((e) => e.remove());
    const shown = heading?.textContent?.trim();
    if (shown !== `Song #${day}`) return null;
    const cubes = [...doc.querySelectorAll(".current-game .gamecube")];
    if (cubes.length !== 6) return null;
    const state = storage.getItem(`${day}_gamestate`);
    if (state !== null && !["playing", "win", "lose"].includes(state))
      return null;
    const guesses: string[] = [],
      feedback: boolean[] = [];
    let gap = false;
    for (let i = 1; i <= 6; i++) {
      const guess = storage.getItem(`${day}_guess${i}`),
        flag = storage.getItem(`${day}_guess${i}_f`);
      if (guess === null) {
        gap = true;
        continue;
      }
      if (
        gap ||
        !guess ||
        guess.length > 500 ||
        ![null, "true", "false"].includes(flag)
      )
        return null;
      guesses.push(guess);
      feedback.push(flag === "true");
    }
    const base = {
      game: "guesstheaudio",
      puzzleId: `guesstheaudio:${day}`,
      progress: guesses.length,
      complete: false,
      checkpoint: { guesses, feedback },
    };
    const panel = doc.querySelector(".current-game .result");
    if (!panel || !panel.querySelector("#share-results-btn") || !guesses.length)
      return base;
    const won = state === "win";
    if (!won && state !== "lose") return base;
    if (!won && guesses.length !== 6) return base;
    if (!panel.querySelector(won ? ".win-msg" : ".lose-msg")) return base;
    for (let i = 0; i < 6; i++) {
      const success = won && i === guesses.length - 1;
      if (cubes[i].classList.contains("guess-image-success") !== success)
        return base;
      if (
        i < guesses.length &&
        !success &&
        !feedback[i] &&
        !cubes[i].classList.contains("guess-image-fail")
      )
        return base;
    }
    const answer = panel.querySelector(".answer")?.textContent?.trim();
    if (!answer) return base;
    const toggle = (key: string) => storage.getItem(key) !== "false";
    let wins = 0;
    for (let i = 1; i <= day; i++)
      if (storage.getItem(`${i}_gamestate`) === "win") wins++;
    const rank =
      ranks[
        Object.keys(ranks)
          .map(Number)
          .filter((n) => n <= wins)
          .at(-1)!
      ];
    const grid = cubes
      .map((_, i) =>
        i >= guesses.length
          ? "⬜"
          : won && i === guesses.length - 1
            ? "🟩"
            : toggle("franchiseToggle") && feedback[i]
              ? "🟨"
              : "🟥",
      )
      .join(" ");
    const url = toggle("linkToPuzzleToggle")
      ? `https://GuessTheAudio.com/p/${day}`
      : "GuessTheAudio.com";
    // The shipped header uses a green settings icon for authenticated members.
    const badge = doc.querySelector('.setting-btn svg[stroke="green"]')
      ? "🕹️"
      : "";
    const shareText =
      `#GuessTheAudio #${day}\n\n🔊 ${grid}\n\n${toggle("rankToggle") ? `${badge}#${rank.replaceAll(" ", "")}${badge}\n` : ""}${toggle("shareLinkToggle") ? url : ""}`.trimEnd();
    return {
      ...base,
      complete: true,
      outcome: won ? "won" : "lost",
      score: `${won ? guesses.length : "X"}/6`,
      guesses: guesses.length,
      metrics: { guesses: guesses.length, maxGuesses: 6 },
      shareText,
      shareSource: "reconstructed-from-submitted-guesses-and-visible-result",
      spoiler: { answer, guesses, feedback },
    };
  },
};
