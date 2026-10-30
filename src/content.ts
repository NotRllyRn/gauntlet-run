import { api } from "./browser/api";
import { gameForURL } from "./games";
import { captureActive, prepareCapture, restoreCapture } from "./capture";
import { errorMessage } from "./utils";
const game = gameForURL(location.href);
if (game) {
  let busy = false;
  api.runtime.onMessage.addListener(
    (message: { type?: string }, _sender, respond) => {
      if (message.type === "prepareCapture") {
        prepareCapture(game.adapter).then(
          (rect) => respond({ rect }),
          (error) => respond({ error: errorMessage(error) }),
        );
        return true;
      }
      if (message.type === "restoreCapture") {
        restoreCapture();
        respond({ ok: true });
      }
    },
  );
  async function inspect(): Promise<void> {
    if (busy || captureActive) return;
    busy = true;
    try {
      const snapshot = game!.adapter.read(document, localStorage, new Date());
      if (snapshot)
        await api.runtime.sendMessage({ type: "observation", snapshot });
      else await api.runtime.sendMessage({ type: "heartbeat" });
    } catch {
      /* A reload invalidates the old content context. */
    } finally {
      busy = false;
    }
  }
  // Visible-page heartbeat supplies a short, renewable game-time lease.
  setInterval(inspect, 1000);
  document.addEventListener("visibilitychange", inspect);
  inspect();
}
