globalThis.Gauntlet.spoilerImage = async function (run) {
  const c = document.createElement("canvas");
  c.width = 1200;
  c.height = 930;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#10151b";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#c4ef93";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("GAUNTLET RUN · SPOILERS · v1", 40, 62);
  ctx.fillStyle = "#eef3ed";
  ctx.font = "20px sans-serif";
  ctx.fillText(
    `${new Date(run.createdAt).toISOString().slice(0, 10)} · ${run.status} · Total ${globalThis.Gauntlet.duration(run.finishedAt ? run.finishedAt - run.startedAt : null)}`,
    40,
    106,
  );
  ctx.font = "17px sans-serif";
  ctx.fillText(
    "Wall clock · includes loading and transitions · previously completed puzzles are untimed",
    40,
    140,
  );
  for (let i = 0; i < globalThis.Gauntlet.games.length; i++) {
    const game = globalThis.Gauntlet.games[i],
      r = run.results[game.id],
      x = 40 + i * 580;
    ctx.fillStyle = "#18212b";
    ctx.fillRect(x, 175, 540, 700);
    ctx.fillStyle = "#eef3ed";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(game.name, x + 22, 220);
    ctx.font = "18px sans-serif";
    ctx.fillText(
      !run.order.includes(game.id)
        ? "Not included"
        : !r
          ? "Unfinished"
          : `${r.outcome} · ${r.score}`,
      x + 22,
      254,
    );
    if (r) {
      ctx.fillText(
        r.preexisting
          ? "Previously completed (untimed)"
          : globalThis.Gauntlet.duration(r.elapsedMs),
        x + 22,
        284,
      );
      const img = new Image();
      img.src = r.screenshot;
      await img.decode();
      const scale = Math.min(496 / img.width, 500 / img.height);
      ctx.drawImage(
        img,
        x + (540 - img.width * scale) / 2,
        315 + (500 - img.height * scale) / 2,
        img.width * scale,
        img.height * scale,
      );
    }
  }
  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
};
