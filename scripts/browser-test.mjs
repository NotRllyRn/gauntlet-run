import { chromium, firefox } from "playwright";
import { spawn } from "node:child_process";
import { build } from "esbuild";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { browserFixtures } from "../tests/browser-fixtures.mjs";
for (const target of process.argv[2]
  ? [process.argv[2]]
  : ["chrome", "firefox"]) {
  let resolveReport;
  const nextReport = () =>
    new Promise((resolve) => {
      resolveReport = resolve;
    });
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.url === "/report") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        res.end("ok");
        resolveReport(JSON.parse(body));
      });
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    const fixture = browserFixtures[req.url.split("?")[0].slice(1)];
    res.end(
      fixture?.html ??
        (req.url === "/"
          ? '<!doctype html><title>Globle home</title><script>setTimeout(()=>history.pushState({},"","/globle"),1000)</script>'
          : "<!doctype html><title>Research tab</title><h1>Research</h1>"),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const dir = path.resolve(`dist/test-${target}-fixtures`);
  await fs.mkdir(dir, { recursive: true });
  await fs.cp(`dist/${target}`, dir, { recursive: true });
  const testCatalog = {
    name: "test-catalog",
    setup(b) {
      b.onLoad({ filter: /\/src\/games\.ts$/ }, async (args) => ({
        contents: (await fs.readFile(args.path, "utf8"))
          .replace('https://krillion.io/"', origin + '/krillion"')
          .replace(
            'https://minecraftle.zachmanson.com/"',
            origin + '/minecraftle"',
          )
          .replace(
            "https://www.nytimes.com/games/wordle/index.html",
            origin + "/wordle",
          )
          .replace('https://globle-game.com/"', origin + '/"')
          .replace('https://globle-game.com/game"', origin + '/globle"')
          .replace("https://globle-game.com/game'", origin + "/globle'"),
        loader: "ts",
      }));
    },
  };
  await build({
    entryPoints: {
      background: "src/background.ts",
      content: "src/content.ts",
      dashboard: "src/ui/dashboard.ts",
      popup: "src/ui/popup.ts",
      "test-controller": "tests/browser-controller.mjs",
    },
    bundle: true,
    format: "iife",
    outdir: dir,
    plugins: [testCatalog],
  });
  const manifest = JSON.parse(await fs.readFile(`${dir}/manifest.json`));
  manifest.host_permissions = ["<all_urls>"];
  manifest.content_scripts[0].matches = ["http://127.0.0.1/*"];
  await fs.writeFile(`${dir}/manifest.json`, JSON.stringify(manifest));
  await fs.writeFile(
    `${dir}/test-controller.html`,
    '<!doctype html><script src="test-origin.js"></script><script src="test-controller.js"></script>',
  );
  await fs.writeFile(
    `${dir}/test-origin.js`,
    `globalThis.TEST_ORIGIN=${JSON.stringify(origin)};`,
  );
  await fs.appendFile(
    `${dir}/background.js`,
    `\n(async()=>{const a=globalThis.browser||chrome;if(!(await a.storage.session.get('testHarnessStarted')).testHarnessStarted){await a.storage.session.set({testHarnessStarted:true});await a.tabs.create({url:a.runtime.getURL('test-controller.html'),active:false});}})();`,
  );
  const profile = await fs.mkdtemp(path.join(os.tmpdir(), "gauntlet-test-"));
  let context,
    proc,
    logs = "";
  async function launch() {
    if (target === "chrome")
      context = await chromium.launchPersistentContext(profile, {
        headless: true,
        channel: "chromium",
        args: [
          "--no-sandbox",
          `--disable-extensions-except=${dir}`,
          `--load-extension=${dir}`,
        ],
        viewport: { width: 1280, height: 1000 },
      });
    else {
      proc = spawn(
        process.execPath,
        [
          "node_modules/web-ext/bin/web-ext.js",
          "run",
          "--source-dir",
          dir,
          "--firefox",
          firefox.executablePath(),
          "--firefox-profile",
          profile,
          "--keep-profile-changes",
          "--no-reload",
          "--verbose",
          "--args=-no-remote",
          "--pref=extensions.originControls.grantByDefault=true",
          "--args=-headless",
        ],
        {
          detached: process.platform !== "win32",
          env: { ...process.env, MOZ_DISABLE_CONTENT_SANDBOX: "1" },
        },
      );
      proc.stdout.on("data", (chunk) => (logs += chunk));
      proc.stderr.on("data", (chunk) => (logs += chunk));
    }
  }
  async function close() {
    if (context) {
      await context.close();
      context = null;
    }
    if (proc) {
      const p = proc;
      proc = null;
      if (process.platform === "win32") p.kill("SIGTERM");
      else process.kill(-p.pid, "SIGTERM");
      await Promise.race([
        new Promise((r) => p.once("exit", r)),
        new Promise((r) => setTimeout(r, 3000)),
      ]);
    }
  }
  async function wait(report) {
    const result = await Promise.race([
      report,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Browser test timeout: ${logs}`)),
          55000,
        ).unref(),
      ),
    ]);
    assert(!result.error, JSON.stringify(result));
    return result;
  }
  try {
    let pending = nextReport();
    await launch();
    const first = await wait(pending);
    assert.equal(first.phase, "restart");
    console.log(
      `${target}: first phase passed; closing and reopening the browser`,
    );
    await close();
    await new Promise((r) => setTimeout(r, 3000));
    pending = nextReport();
    await launch();
    const done = await wait(pending);
    assert.equal(done.phase, "complete");
    assert.deepEqual(
      Object.keys(done.run.games).sort(),
      Object.keys(browserFixtures).sort(),
    );
    for (const [id, { dimensions }] of Object.entries(browserFixtures)) {
      const item = done.run.games[id];
      assert(item.result.shareText);
      assert(item.activeMs > 0);
      assert.equal(item.result.preexisting, false);
      const image = done.images[item.screenshotKey],
        png = PNG.sync.read(Buffer.from(image.split(",")[1], "base64"));
      assert.deepEqual([png.width, png.height], dimensions);
      let magenta = 0;
      for (let i = 0; i < png.data.length; i += 4)
        if (png.data[i] > 240 && png.data[i + 1] < 20 && png.data[i + 2] > 240)
          magenta++;
      assert.equal(
        magenta,
        0,
        "Capture must exclude the magenta overlay/background",
      );
    }
    assert(done.summary.indexOf("Wordle:") < done.summary.indexOf("Globle:"));
    assert(!done.summary.includes("France"));
    const share = PNG.sync.read(
      Buffer.from(done.shareImage.split(",")[1], "base64"),
    );
    assert.deepEqual(
      [share.width, share.height],
      [1200, 200 + Math.ceil(Object.keys(browserFixtures).length / 2) * 650],
    );
    console.log(
      `PASS ${target}: partial progress, manual tabs, Next, research exclusion, pause/resume, actual browser restart, reverse-order completion, clean captures, canonical exports.`,
    );
  } finally {
    await close();
    server.close();
  }
}
