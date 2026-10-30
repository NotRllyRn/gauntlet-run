import type { AdapterFixture } from "./adapter-fixtures";
export const words = ["fuss", "cuss", "cubs", "cobs", "coos", "coop", "poop"];
export function pooplePage(path = words, par = 6, number = 442) {
  return `<div class="flex w-full flex-col items-center gap-5 py-4"><p>#${number}: FUSS</p>${path.map((w) => `<div>${[...w.toUpperCase()].map((c) => `<div class="h-12 w-12 bg-muted">${c}</div>`).join("")}</div>`).join("")}</div>${path.at(-1) === "poop" ? `<div class="poople-card"><h2>FUSS → POOP</h2><p>You used ${path.length - 1} guesses. The best solution was ${par} guesses.</p></div>` : ""}`;
}
export const adapterFixture: AdapterFixture = {
  now: new Date("2026-10-30T16:00:00Z"),
  storageRequired: true,
  unfinished: {
    html: pooplePage(words.slice(0, 2)),
    storage: { guesses: words.slice(0, 2), dateLastPlayed: 1793376000000 },
  },
  complete: {
    html: pooplePage(),
    storage: { guesses: words, dateLastPlayed: 1793376000000 },
  },
  expected: {
    outcome: "won",
    score: "6/6",
    metrics: { guesses: 6, par: 6, extraGuesses: 0 },
    shareText:
      "Poople #442 6/6\n⬜⬜⬜⬜\n⬜⬜⬜⬜\n⬜⬜⬜⬜\n⬜🟫⬜⬜\n⬜🟫🟫⬜\n⬜🟫🟫🟫\n🟫🟫🟫🟫\n\nhttps://pooplegame.com/",
  },
  spoilers: ["FUSS", "cuss"],
};
