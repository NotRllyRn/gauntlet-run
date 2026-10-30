# Integration findings — 2026-10-30

## Observed live behavior

- Official Wordle: `https://www.nytimes.com/games/wordle/index.html`.
  - Board: `#wordle-app-game [class*="Board-module_board__"]`.
  - Six `role="group"` rows, each containing five tiles with `data-state` values `empty`, `tbd`, `absent`, `present`, or `correct`.
  - Help examples also have evaluated tile states: all detection must be scoped to the board.
  - Results/help overlays are native `dialog` elements with `data-testid="modal-overlay"`.
  - Share formatting was checked against the shipped share selector in `2174.21b582036a6598268996.js`: puzzle number, score, optional hard-mode asterisk, blank line, colored tile grid.
  - Current settings use `games-settings-wordleV2/<account>`, with `states[].data`; dark theme is also stored as `nyt-wordle-darkmode`. This was observed by toggling Hard Mode in an isolated live profile.
- Globle: `https://globle-game.com/game`, app v1.10.8.
  - Globe: `.scene-container canvas`, a real WebGL rendering.
  - Form: `[data-cy="guesser"]`, disabled after a win.
  - Daily `guesses` localStorage value: `{day:"YYYY-MM-DD", countries:[...]}`.
  - `statistics`: `lastWin`, `currentStreak`, `usedGuesses`, `emojiGuesses`.
  - **Live `lastWin` is an RFC date string**, e.g. `Fri, 30 Oct 2026 … GMT`, not necessarily an ISO date. Normalize it to the browser's local day.
  - Current stats popup: `.m.absolute.z-40`. Temporarily hide it for capture; restore afterwards.
  - Share text construction confirmed in shipped `index-DityyZtG.js`; win/stat persistence confirmed in `Game-BhWAllN-.js`.

The generic T3 preview failed before opening with: “Chrome will not start its sandbox as root.” Local disposable browser profiles were used instead. No player's existing game profile or statistics were used.

## Evidence boundary

REA static analysis of the downloaded Globle index bundle returned `ev_214b37c03d9dfb78e9fdfadfdc9b0b54a1535e57e277e4d56c9326070f423731` (artifact-root SHA-256 `e680c6b1179df782aa66b7dc4d0bf709e6c052ad8284f7344d905f8b25739cf0`). This establishes static artifact analysis, not runtime correctness. The observations above also use direct live DOM/storage inspection and focused reads of shipped scripts.

The extension is an integration with independently maintained websites. Selectors/storage layouts can change; the adapter boundary contains those changes. Account synchronization, every locale/theme, consent variants, and browser store distribution have not all been exercised. Local results can be modified by the player and are not authoritative leaderboard evidence.

## Verification completed

- Real Chromium extension, disposable profile: official Wordle six-guess loss → automatic board capture/save → Globle win → automatic globe capture/save → completed run. Both saved images were visually inspected; neither contains the result popup.
- Installed Chrome and Firefox temporary extensions, deterministic local fixtures: win detection, two-stage auto-advance, share-text persistence, screenshot pixel dimensions, and absence of a deliberately magenta overlay all passed.
- Firefox fixture testing required a host match without a port and explicit test-profile host grants. Production matches use the real HTTPS domains, and Start requests the required permission from the user.
- Unit tests cover unfinished boards, Wordle win/loss, help-tile isolation, theme/hard-mode settings, stale/malformed Globle records, actual RFC win dates, selection validation, shuffle membership, and canonical spoiler-free summaries.
- Firefox manifest/package lint: zero errors and zero warnings.

Live-site gameplay was exercised in Chromium; Firefox's extension APIs and pipeline were exercised with local fixtures, not a live logged-in NYT/Globle account. The distribution artifacts remain unsigned development builds.

## Resumable TypeScript update

The v0.2 installed-extension regression suite additionally exercises partial Wordle progress, manually opened Globle tabs (including homepage SPA navigation), research-tab exclusion from game time, unfinished-tab reuse and closed-tab replacement, pause/resume, actual browser shutdown/relaunch with saved profiles, and completion in reverse order. Canonical exports retain catalog order. The live Chromium workflow was rerun successfully after the rewrite; the board images in this directory were regenerated from that run.

Timing recovery uses the last durable checkpoint and resumes paused. It does not restore expired daily puzzles or rewrite third-party site storage. See the README for timing intervals and recovery limits.

## Krillion daily integration — 2026-10-30

- Daily root: https://krillion.io/. Archive, Unlimited, packs, and Party are excluded.
- `krillion:game:v1` holds date, dive number, phase, and round results. Completion clears it and records `krillion:stats:v1.history[date]`.
- Signed-in storage is namespaced as `krillion:account:<encoded-owner>:<base-key>`, with the owner from `krillion:account-owner:v1`. Account behavior is fixture-tested, not live login-tested.
- The game resets on America/New_York calendar days. Each daily dive has seven rounds, maximum 700 points, with depth equal to points × 10.
- Tiers: miss 0/⬛, plankton 10/🫧, tooclever 15/🤡, schooler 30/🐟, rare 60/🦑, deepcut 85/🏮, krillion 100/🌟.
- Native format: `Krillion #<dive> 🦐`, newline, numeric score, blank line, seven emoji. `krillion-share-link=1` appends a blank line and `https://krillion.io`.
- Result capture targets `div:has(> div > .ds-done-krill)`, the summary containing dive number, points, depth, and distribution/percentile. It preserves the result UI.
- Detection requires the current daily history record, seven valid round scores/tiers, and matching visible dive number and score. Revised site scores that disagree with stored statistics are not accepted.

REA CLI analysis of the three selected shipped application chunks (`0snero216p82g.js`, `1klevf566y93_.js`, `2_ns9yberwasa.js`) returned evidence `ev_b07a4d8a0651805441e01a028e2646ffa22c2fd7464f61655369f6530c5ad908`, artifact-root SHA-256 `dff99e36e14c05b16468fefac7c5bf3e14a989c6634f78fc65a50fb56fec798d`. Focused reads established storage, tiers, timezone, and sharing. This static evidence is separate from the runtime checks below.

A disposable live Chromium session completed dive #107 by allowing all seven rounds to expire naturally. The adapter read the resulting real DOM/storage and reconstructed exactly the native copied text: score 0 and seven black squares. An installed extension in another disposable Chromium profile reopened that observed result, saved numeric metrics and the native-format share text, and captured the result panel. The saved image was visually inspected. All nonzero tiers are covered by fixtures, not a live high-score run.

The shared Chrome/Firefox browser suite now includes all three games: partial progress, tab reuse, research-time exclusion, pause/resume, real browser restart, out-of-order completion, local result/image persistence, and canonical exports. For Krillion the surrounding gameplay fixture is magenta and must be absent from the result crop; Wordle/Globle's magenta result overlays must likewise be absent from their board crops.
