export function minecraftlePage({
  count = 1,
  outcome,
  day = "2026-10-30",
  contrast = false,
}: {
  count?: number;
  outcome?: "won" | "lost";
  day?: string;
  contrast?: boolean;
} = {}) {
  const green = contrast ? "🟧" : "🟩",
    yellow = contrast ? "🟦" : "🟨";
  const grids = Array.from({ length: count }, (_, i) =>
    i === count - 1 && outcome === "won"
      ? `${green.repeat(3)}\n${green.repeat(3)}\n${green.repeat(3)}`
      : `⬜${yellow}⬜\n⬜⬜⬜\n⬜⬜⬜`,
  );
  const shareText = `Minecraftle ${day} ${count}/10\n${grids.join("\n\n")}`;
  const html =
    `<div id="guesses">${Array.from({ length: count }, () => `<div class="box"><div>${'<div class="slot"></div>'.repeat(9)}</div><div class="crafting-output"></div></div>`).join("")}</div>` +
    (outcome
      ? `<div role="dialog"><div id="headlessui-dialog-panel-test"><p id="headlessui-description-test">Solution: Diamond Axe</p><h3>You ${outcome}! Took ${count} guesses.</h3><p class="whitespace-pre">${shareText}</p></div></div>`
      : "");
  return { html, shareText };
}
