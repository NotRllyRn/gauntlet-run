(() => {
  const api = globalThis.browser || chrome,
    G = globalThis.Gauntlet;
  const game = G.games.find((g) => {
    const u = new URL(g.url);
    return location.hostname === u.hostname && location.pathname === u.pathname;
  });
  if (!game) return;
  const adapter = G.adapters[game.id];
  let busy = false;
  api.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "prepareCapture") {
      G.prepareCapture(adapter).then(
        (rect) => sendResponse({ rect }),
        (error) => {
          sendResponse({ error: error.message });
        },
      );
      return true;
    }
    if (message.type === "restoreCapture") {
      G.restoreCapture();
      sendResponse({ ok: true });
    }
  });
  async function inspect() {
    if (busy || G.captureActive) return;
    busy = true;
    try {
      const snapshot = adapter.read();
      if (snapshot)
        await api.runtime.sendMessage({ type: "observation", snapshot });
    } catch {
      /* An extension reload invalidates old content contexts; refresh reattaches. */
    } finally {
      busy = false;
    }
  }
  // Polling also sees same-page localStorage updates, which emit no storage event here.
  setInterval(inspect, 1000);
  inspect();
})();
