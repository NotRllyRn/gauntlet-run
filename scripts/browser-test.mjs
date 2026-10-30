// Installs real temporary extensions into both browsers, using deterministic local games.
import { chromium, firefox } from "playwright";
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
const wordle = `<!doctype html><style>body{margin:0;background:#eee}#wordle-app-game{margin:20px auto;width:300px}.Board-module_board__test{width:300px;height:360px;display:grid;grid-template-rows:repeat(6,1fr)}[role=group]{display:grid;grid-template-columns:repeat(5,1fr)}[data-state]{background:#ddd;border:3px solid white}[data-state=correct]{background:#00aa00}dialog{position:fixed;inset:0;width:100vw;height:100vh;background:#ff00ff;border:0;margin:0;z-index:999}</style><main id="wordle-app-game"><div class="Board-module_board__test">${Array.from({ length: 6 }, () => `<div role="group">${'<div data-state="empty"></div>'.repeat(5)}</div>`).join("")}</div></main><script>setTimeout(()=>{document.querySelectorAll('[role=group]')[0].querySelectorAll('[data-state]').forEach(e=>{e.dataset.state='correct';e.textContent='a'});const d=document.createElement('dialog');d.textContent='RESULT POPUP';document.body.append(d);d.showModal()},2200)</script>`;
const globle = `<!doctype html><style>body{margin:0;background:#eee}.scene-container{margin:30px auto;width:400px;height:400px}.m{position:fixed;inset:0;background:#ff00ff;z-index:999}input{display:block}</style><input data-cy="guesser"><div class="scene-container"><canvas width="400" height="400"></canvas></div><script>const d=new Date(),day=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');localStorage.setItem('guesses',JSON.stringify({day,countries:[]}));const ctx=document.querySelector('canvas').getContext('2d');ctx.fillStyle='#0044cc';ctx.fillRect(0,0,400,400);setTimeout(()=>{localStorage.setItem('guesses',JSON.stringify({day,countries:['France']}));localStorage.setItem('statistics',JSON.stringify({lastWin:day,currentStreak:1,usedGuesses:[1],emojiGuesses:'🟩'}));document.querySelector('input').disabled=true;const overlay=document.createElement('div');overlay.className='m absolute z-40';overlay.textContent='RESULT POPUP';document.body.append(overlay)},2200)</script>`;
for (const target of process.argv[2]
  ? [process.argv[2]]
  : ["chrome", "firefox"]) {
  let resolveReport;
  const report = new Promise((r) => (resolveReport = r));
  const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (req.url === "/report") {
      let b = "";
      req.on("data", (c) => (b += c));
      req.on("end", () => {
        resolveReport(JSON.parse(b));
        res.end("ok");
      });
      return;
    }
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(req.url === "/wordle" ? wordle : globle);
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const dir = path.resolve(`dist/test-${target}-fixtures`);
  await fs.rm(dir, { recursive: true, force: true });
  await fs.cp(`dist/${target}`, dir, { recursive: true });
  const m = JSON.parse(await fs.readFile(`${dir}/manifest.json`));
  m.host_permissions = ["<all_urls>"];
  m.content_scripts[0].matches = ["http://127.0.0.1/*"];
  await fs.appendFile(
    `${dir}/core.js`,
    `\nGauntlet.games[0].url='${origin}/wordle';Gauntlet.games[1].url='${origin}/globle';\n`,
  );
  // Test harness alone is allowed to start a run and report to the local test server.
  const harness = `setTimeout(async()=>{try {await api.tabs.create({url:api.runtime.getURL('test-controller.html'),active:false});await handle({type:'start',ids:['wordle','globle']},{id:api.runtime.id,url:api.runtime.getURL('dashboard.html')})}catch(e){await fetch('${origin}/report',{method:'POST',body:JSON.stringify({error:e.message})})}},1000);`;
  await fs.writeFile(
    `${dir}/test-controller.html`,
    '<!doctype html><script src="test-controller.js"></script>',
  );
  await fs.writeFile(
    `${dir}/test-controller.js`,
    `const api=globalThis.browser||chrome;let ticks=0;const timer=setInterval(async()=>{const run=(await api.storage.local.get('activeRun')).activeRun;if(run?.status==='complete'||++ticks>25){clearInterval(timer);await fetch('${origin}/report',{method:'POST',body:JSON.stringify(run||{error:'No run'})})}},1000);`,
  );

  await fs.appendFile(`${dir}/background.js`, harness);
  await fs.writeFile(`${dir}/manifest.json`, JSON.stringify(m));
  let context,
    proc,
    logs = "";
  try {
    if (target === "chrome")
      context = await chromium.launchPersistentContext("", {
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
        "node",
        [
          "node_modules/web-ext/bin/web-ext.js",
          "run",
          "--source-dir",
          dir,
          "--firefox",
          firefox.executablePath(),
          "--no-reload",
          "--pref=extensions.originControls.grantByDefault=true",
          "--args=-headless",
        ],
        { env: { ...process.env, MOZ_DISABLE_CONTENT_SANDBOX: "1" } },
      );
      proc.stdout.on("data", (c) => (logs += c));
      proc.stderr.on("data", (c) => (logs += c));
    }
    const run = await Promise.race([
      report,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error(`Test timed out. ${logs}`)),
          55000,
        ).unref(),
      ),
    ]);
    assert.equal(
      run.status,
      "complete",
      JSON.stringify(run.stage) + " " + run.error,
    );
    for (const [game, dimensions] of [
      ["wordle", [300, 360]],
      ["globle", [400, 400]],
    ]) {
      const r = run.results[game];
      assert.equal(r.preexisting, false);
      assert(r.elapsedMs >= 2000);
      assert(r.shareText);
      const png = PNG.sync.read(
        Buffer.from(r.screenshot.split(",")[1], "base64"),
      );
      assert.deepEqual([png.width, png.height], dimensions);
      let magenta = 0;
      for (let i = 0; i < png.data.length; i += 4)
        if (png.data[i] > 240 && png.data[i + 1] < 20 && png.data[i + 2] > 240)
          magenta++;
      assert.equal(magenta, 0, "Results popup must not appear in screenshot");
      await fs.writeFile(
        `research/${target}-${game}-fixture.png`,
        Buffer.from(r.screenshot.split(",")[1], "base64"),
      );
    }
    console.log(
      `PASS ${target}: installed extension; Wordle → Globle; scores/share text persisted; cropped screenshots exclude dialogs; completed exactly two stages.`,
    );
  } finally {
    if (context) await context.close();
    if (proc) proc.kill("SIGTERM");
    server.close();
  }
}
