globalThis.Gauntlet.cropScreenshot = async function (dataURL, rect) {
  const bitmap = await createImageBitmap(await (await fetch(dataURL)).blob());
  const sx = bitmap.width / rect.viewportWidth,
    sy = bitmap.height / rect.viewportHeight;
  const canvas = new OffscreenCanvas(
    Math.round(rect.width * sx),
    Math.round(rect.height * sy),
  );
  canvas
    .getContext("2d")
    .drawImage(
      bitmap,
      Math.round(rect.x * sx),
      Math.round(rect.y * sy),
      canvas.width,
      canvas.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  bitmap.close();
  const bytes = new Uint8Array(
    await (await canvas.convertToBlob({ type: "image/png" })).arrayBuffer(),
  );
  let binary = "";
  for (let i = 0; i < bytes.length; i += 32768)
    binary += String.fromCharCode(...bytes.subarray(i, i + 32768));
  return `data:image/png;base64,${btoa(binary)}`;
};

globalThis.Gauntlet.captureBoard = async function (browserAPI, tab) {
  try {
    const prep = await browserAPI.tabs.sendMessage(tab.id, {
      type: "prepareCapture",
    });
    if (prep.error) throw new Error(prep.error);
    const before = (
      await browserAPI.tabs.query({ active: true, windowId: tab.windowId })
    )[0];
    if (before?.id !== tab.id || before.url !== prep.rect.href)
      throw new Error("Game tab changed before capture.");
    const data = await browserAPI.tabs.captureVisibleTab(tab.windowId, {
      format: "png",
    });
    const after = (
      await browserAPI.tabs.query({ active: true, windowId: tab.windowId })
    )[0];
    if (after?.id !== tab.id || after.url !== prep.rect.href)
      throw new Error("Game tab changed during capture.");
    return await globalThis.Gauntlet.cropScreenshot(data, prep.rect);
  } finally {
    try {
      await browserAPI.tabs.sendMessage(tab.id, { type: "restoreCapture" });
    } catch {}
  }
};
