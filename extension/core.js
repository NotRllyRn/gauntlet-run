/* Shared by extension pages, background, content scripts, and tests. */
globalThis.Gauntlet = globalThis.Gauntlet || {};
Object.assign(globalThis.Gauntlet, {
  games: [
    {
      id: "wordle",
      name: "Wordle",
      url: "https://www.nytimes.com/games/wordle/index.html",
    },
    { id: "globle", name: "Globle", url: "https://globle-game.com/game" },
  ],
  adapters: {},
  localDay(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  },
  readJSON(storage, key) {
    try {
      return JSON.parse(storage.getItem(key));
    } catch {
      return null;
    }
  },
  duration(ms) {
    if (ms == null) return "—";
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  },
  shuffle(ids) {
    const copy = [...ids];
    // Rejection sampling avoids modulo bias.
    for (let i = copy.length - 1; i > 0; i--) {
      const size = i + 1,
        limit = 2 ** 32 - (2 ** 32 % size);
      let n;
      do {
        n = crypto.getRandomValues(new Uint32Array(1))[0];
      } while (n >= limit);
      const j = n % size;
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  },
  newRun(ids, random = false, now = Date.now()) {
    const allowed = this.games.map((g) => g.id);
    if (
      !Array.isArray(ids) ||
      !ids.length ||
      new Set(ids).size !== ids.length ||
      ids.some((id) => !allowed.includes(id))
    )
      throw new Error(
        "Select one or more supported games, without duplicates.",
      );
    const order = random ? this.shuffle(ids) : [...ids];
    return {
      id: crypto.randomUUID(),
      version: 1,
      order,
      random,
      createdAt: now,
      startedAt: now,
      status: "running",
      index: 0,
      tabId: null,
      results: {},
      stage: null,
      error: null,
    };
  },
  summary(run) {
    const lines = [
      "GAUNTLET RUN · v1",
      `Date: ${new Date(run.createdAt).toISOString().slice(0, 10)}`,
      `Status: ${run.status}`,
      "Timing: wall clock, includes loading and transitions; no pauses",
      `Total: ${this.duration(run.finishedAt ? run.finishedAt - run.startedAt : null)}`,
    ];
    for (const game of this.games) {
      const r = run.results[game.id];
      lines.push(
        `${game.name}: ${!run.order.includes(game.id) ? "Not included" : !r ? "Unfinished" : `${r.outcome} · ${r.score} · ${r.preexisting ? "Previously completed (untimed)" : this.duration(r.elapsedMs)}`}`,
      );
    }
    return lines.join("\n");
  },
});
