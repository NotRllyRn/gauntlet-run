import type { Game, Run } from "./types";
import { games } from "./games";
import { scoreRun, scoreLabel, points } from "./scoring";
import { duration } from "./utils";
export function summary(run: Run, catalog: Game[] = games): string {
  const scores = scoreRun(run);
  const lines = [
    "GAUNTLET RUN · v7",
    `Date: ${new Date(run.createdAt).toISOString().slice(0, 10)}`,
    `Status: ${run.status}`,
    scoreLabel(run),
    "Total excludes pauses; game times count focused game tabs only.",
    `Total: ${duration(run.clock.totalMs)}`,
  ];
  for (const game of catalog) {
    const item = run.games[game.id];
    const earned = item?.result
      ? scores.games[game.id]?.score
        ? `${points(scores.games[game.id].points)} points`
        : "score unavailable"
      : "0 points";
    lines.push(
      `${game.name}: ${!item ? "Not included" : !item.result ? `Unfinished · ${duration(item.activeMs)}` : `${item.result.outcome} · ${item.result.score} · ${item.result.preexisting ? "Previously completed (untimed)" : duration(item.activeMs)}`} · ${earned}`,
    );
  }
  return lines.join("\n");
}
export async function spoilerImage(
  run: Run,
  images: Record<string, string>,
  catalog: Game[] = games,
): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 200 + Math.ceil(catalog.length / 2) * 650;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#10151b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#c4ef93";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("GAUNTLET RUN · SPOILERS · v6", 40, 60);
  ctx.fillStyle = "#eef3ed";
  ctx.font = "20px sans-serif";
  ctx.fillText(
    `${new Date(run.createdAt).toISOString().slice(0, 10)} · ${run.status} · Total ${duration(run.clock.totalMs)}`,
    40,
    100,
  );
  ctx.font = "17px sans-serif";
  ctx.fillText(
    "Pauses excluded · game timers count only focused game tabs",
    40,
    136,
  );
  for (let i = 0; i < catalog.length; i++) {
    const game = catalog[i],
      item = run.games[game.id],
      x = 40 + (i % 2) * 580,
      y = 170 + Math.floor(i / 2) * 650;
    ctx.fillStyle = "#18212b";
    ctx.fillRect(x, y, 540, 620);
    ctx.fillStyle = "#eef3ed";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(game.name, x + 22, y + 42);
    ctx.font = "18px sans-serif";
    ctx.fillText(
      !item
        ? "Not included"
        : item.result
          ? `${item.result.outcome} · ${item.result.score}`
          : "Unfinished",
      x + 22,
      y + 76,
    );
    if (item)
      ctx.fillText(
        item.result?.preexisting
          ? "Previously completed (untimed)"
          : `Game time: ${duration(item.activeMs)}`,
        x + 22,
        y + 106,
      );
    const source = item?.screenshotKey && images[item.screenshotKey];
    if (source) {
      const image = new Image();
      image.src = source;
      await image.decode();
      const scale = Math.min(496 / image.width, 450 / image.height);
      ctx.drawImage(
        image,
        x + (540 - image.width * scale) / 2,
        y + 135 + (450 - image.height * scale) / 2,
        image.width * scale,
        image.height * scale,
      );
    } else if (item?.result)
      ctx.fillText("Screenshot pending", x + 22, y + 150);
  }
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Image export failed.")),
      "image/png",
    ),
  );
}
