import type { AdapterFixture } from "./adapter-fixtures";
export function audioPage(count = 2, outcome?: "won" | "lost", day = 1276) {
  const storage: Record<string, unknown> = {
    [`${day}_gamestate`]:
      outcome === "won" ? "win" : outcome === "lost" ? "lose" : "playing",
  };
  for (let i = 1; i <= count; i++) {
    storage[`${day}_guess${i}`] =
      outcome === "won" && i === count ? "TiK ToK" : "Skipped!";
    storage[`${day}_guess${i}_f`] = "false";
  }
  const html = `<div class="current-game"><div class="current-game-number">Song #${day}</div>${Array.from({ length: 6 }, (_, i) => `<button class="gamecube ${outcome ? (outcome === "won" && i === count - 1 ? "guess-image-success" : i < count ? "guess-image-fail" : "") : ""}">${i + 1}</button>`).join("")}${outcome ? `<div class="result"><h2 class="${outcome === "won" ? "win" : "lose"}-msg">Result</h2><div class="answer">TiK ToK</div><button id="share-results-btn">Share Results</button></div>` : ""}</div>`;
  return { html, storage };
}
export const adapterFixture: AdapterFixture = {
  now: new Date("2026-10-30T16:00:00Z"),
  storageRequired: true,
  unfinished: audioPage(1),
  complete: audioPage(2, "won"),
  expected: {
    outcome: "won",
    score: "2/6",
    metrics: { guesses: 2, maxGuesses: 6 },
    shareText:
      "#GuessTheAudio #1276\n\n🔊 🟥 🟩 ⬜ ⬜ ⬜ ⬜\n\n#RookieListener\nhttps://GuessTheAudio.com/p/1276",
  },
  spoilers: ["TiK ToK", "Skipped!"],
};
