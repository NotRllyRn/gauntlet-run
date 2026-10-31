import test from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { checkRelease, isNewerRelease, releasesURL } from "../src/updates";

for (const [latest, installed, expected] of [
  ["v0.3.1", "0.3.0", true],
  ["v0.10.0", "0.9.9", true],
  ["v1.0.0", "0.99.99", true],
  ["0.3.0", "0.3.0", false],
  ["v0.2.9", "0.3.0", false],
  ["v0.4.0-beta.1", "0.3.0", false],
  ["latest", "0.3.0", false],
  [null, "0.3.0", false],
] as const)
  test(`update comparison: ${latest} against ${installed}`, () => {
    assert.equal(isNewerRelease(latest, installed), expected);
  });

test("checks GitHub once a day and caches the latest stable version", async () => {
  let calls = 0;
  const request: typeof fetch = async (url, init) => {
    calls++;
    assert.equal(
      url,
      "https://api.github.com/repos/NotRllyRn/gauntlet-run/releases/latest",
    );
    assert.equal(init?.credentials, "omit");
    return Response.json({
      tag_name: "v0.4.0",
      draft: false,
      prerelease: false,
    });
  };
  const first = await checkRelease(undefined, 1000, request);
  assert.deepEqual(first, { checkedAt: 1000, latestVersion: "v0.4.0" });
  assert.equal(await checkRelease(first, 2000, request), first);
  assert.equal(calls, 1);
  await checkRelease(first, 1000 + 86400000, request);
  assert.equal(calls, 2);
  await checkRelease(first, 999, request); // Clock moved backwards.
  assert.equal(calls, 3);
});

test("offline, missing, rate-limited, draft and malformed releases are quiet and retain known updates", async () => {
  const cached = { checkedAt: 0, latestVersion: "v0.4.0" };
  const requests: (typeof fetch)[] = [
    async () => {
      throw new Error("offline");
    },
    async () => new Response(null, { status: 404 }),
    async () => new Response(null, { status: 403 }),
    async () => Response.json({ tag_name: "v0.5.0", prerelease: true }),
    async () => Response.json({ tag_name: "v0.5.0", draft: true }),
    async () => Response.json({ tag_name: "not a version" }),
    async () => new Response("not JSON"),
  ];
  for (const request of requests) {
    assert.deepEqual(await checkRelease(cached, 86400000, request), {
      checkedAt: 86400000,
      latestVersion: "v0.4.0",
    });
    assert.deepEqual(await checkRelease(undefined, 86400000, request), {
      checkedAt: 86400000,
      latestVersion: null,
    });
  }
});

test("notice is a fixed releases link and hides after upgrading", async () => {
  const original = globalThis.chrome;
  globalThis.chrome = {} as typeof chrome;
  const { renderUpdateNotice } = await import("../src/ui/update-notice");
  const window = new JSDOM('<a id="update-link" hidden></a>').window;
  try {
    const link = window.document.querySelector("a")!;
    renderUpdateNotice(link, "v0.4.0", "0.3.0");
    assert.equal(link.hidden, false);
    assert.equal(link.href, releasesURL);
    assert.equal(link.textContent, "⬆ Update extension");
    renderUpdateNotice(link, "v0.4.0", "0.4.0");
    assert.equal(link.hidden, true);
  } finally {
    globalThis.chrome = original;
    window.close();
  }
});
