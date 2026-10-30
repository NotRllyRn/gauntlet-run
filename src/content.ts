import { api } from "./browser/api";
import { gameForURL } from "./games";
import {
  captureActive,
  prepareCapture,
  restoreCapture,
  captureSlice,
  capturePosition,
} from "./capture";
import { errorMessage } from "./utils";
{
  let busy = false;
  api.runtime.onMessage.addListener(
    (message: { type?: string; offsetY?: number }, _sender, respond) => {
      const game = gameForURL(location.href);
      if (message.type === "prepareCapture" && game) {
        prepareCapture(game.adapter).then(
          (rect) => respond({ rect }),
          (error) => respond({ error: errorMessage(error) }),
        );
        return true;
      }
      if (
        message.type === "captureSlice" ||
        message.type === "capturePosition"
      ) {
        Promise.resolve()
          .then(() =>
            message.type === "captureSlice"
              ? captureSlice(message.offsetY)
              : capturePosition(),
          )
          .then(
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
    const game = gameForURL(location.href);
    if (!game || busy || captureActive) return;
    busy = true;
    try {
      const snapshot = game.adapter.read(document, localStorage, new Date());
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
