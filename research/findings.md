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

## Minecraftle daily integration — 2026-10-30

- Live build: `5TPw1-Pwe8mX8wrRLZKr9`; daily URL https://minecraftle.zachmanson.com/.
- Root `#guesses > .box` contains one crafting table per submitted guess plus the current draft. Each table has nine input `.slot` elements; output slots are excluded from progress snapshots.
- The completion panel is `[id^="headlessui-dialog-panel"]`. Its `h3` gives `You won/lost! Took N guesses.`; `p.whitespace-pre` is the actual native share text. The `headlessui-description` element reveals the solution and is stored only in spoiler data.
- Share format: `Minecraftle YYYY-MM-DD N/10`, newline, three emoji rows per guess, blank lines between guesses. Normal mode uses 🟩/🟨/⬜; high contrast uses 🟧/🟦/⬜. Native losses still say `10/10`; preserve the separate structured outcome.
- The current site's React state holds crafting tables, feedback, and outcome in memory. Local storage caches ingredients/recipes/items and preferences, plus a last-submitted date; it does not persist playable crafting tables. The extension does not read the recipe/answer cache in production or attempt private-state restoration.
- Date follows the local calendar. `?random=true` is another mode on the same pathname; catalog query exclusions prevent Random from earning daily-game time or producing daily results.
- Capture preserves the completion panel, including its revealed recipe. Full native share text is saved independently of the panel's scrollable share area.

REA static analysis of the shipped page chunk `2ao21xf4k5tuz.js` returned evidence `ev_4ea3ac578568b31a89cd8952c9197ceca13b64994e43b22cd5d1237d205a22c8`, artifact-root SHA-256 `94429e85e3292beacdfaf24082a2f7a53c074565b3c5c1998c8cca9a401c0a0c`. Focused ordinary source reads of the context chunk `1883ut9xrm9yl.js` established in-memory state and local-date behavior. This static evidence is distinct from runtime checks.

The installed Chromium extension completed the actual daily puzzle in a disposable profile using test-only recipe lookup and ordinary crafting UI interactions. It saved a one-guess win, numeric metrics, the exact text emitted by the site's Copy action, and a result-panel screenshot. The saved screenshot was visually inspected. Production code neither looks up nor changes the solution. Losses, malformed/stale summaries, high-contrast grids, and Random-mode exclusion are fixture-tested.

## Full-height boards, Lewdle and Angle — 2026-10-30

Minecraftle now captures `#guesses`, hiding the completion dialog. A disposable live run submitted nine wrong recipes and a final correct recipe; the saved native-resolution 352×2020 image includes all ten grids in order. Shared Chromium/Firefox fixtures use ten differently colored bands to verify stitching without page scaling. Capture restores overlays and scroll position, validates the active tab and geometry for each slice, and refuses gaps or changing geometry.

Lewdle's deployed version 69.50 stores `words`, `highlights`, `row`, `gameState`, and `easyOnSubmit`. The adapter requires visible submitted letters to match saved state; it reconstructs the native share formatting, including three newlines before the URL, lowercase `x` for losses, hints and ghost tiles. Five- and six-letter games are supported. Its stats modal sets `.testMain` opacity to zero: capture temporarily reveals that element and hides `.testOverlayBG` and the floating `.grippy-host` ad handle. Original styles are restored. The daily share number follows `floor((unixSeconds - 1642564800)/86400)+1`. There is no independent stored board date; daily reset remains site-owned.

Angle uses current-local-day `guesses` and `angle.construct.daily`. Completion requires a consistent revealed target, final-screen puzzle number, finished first round, and an explicitly skipped or finished optional construction round. Native shares use direction/proximity squares and an optional `made it in N` / `not made` suffix. Saved numeric metrics preserve both rounds. The screenshot targets `[data-testid="final-screen"]`.

Live disposable Chromium evidence: Lewdle `1/6`, share `Lewdle 🍆💦 1746 1/6`; Angle `X/4`, share `#Angle #1592 X/4`, construction skipped. Both saved shares were compared with native copy actions. Lewdle uses a test-only answer lookup to finish the daily board; Angle deliberately submits four incorrect guesses. These lookup/copy interception helpers are never shipped. Artifacts: `minecraftle-result.png`, `lewdle-result.png`, `angle-result.png`, and corresponding live JSON files under `research/` (local generated evidence, ignored by git).

Validation: 46 unit/contract tests, TypeScript checks, build, Firefox manifest lint, and installed-extension tests in Chromium and Firefox. Fixtures cover progress, completion, malformed/stale data, exact share formatting, round-two branches, persistence, pause/resume, browser restart, tab reuse, arbitrary order, all-game screenshots, and canonical exports. These are checks of observed versions, not a promise that future third-party changes will preserve compatibility.

A repeat live Lewdle run encountered a dynamically served overlay and correctly left the screenshot pending instead of saving an obstructed image; another run passed the native-share comparison, nonblank-image assertion, and style-restoration checks. Third-party ads can still require dismissal and Retry screenshot. Scores and share text remain saved in that case.

## Ten-game lineup — 2026-10-30

The final four adapters are Guess the Audio, GuessThe.Game, Poople, and Costcodle. Game-specific evidence and limitations are recorded in their `*-findings.md` files. Production adapters use submitted/revealed data; no bundled answer table or solving helper is accessed.

All four disposable live Chromium checks produced actual locally saved results and PNG captures, with saved share text equal to native Copy/Share output. Audio and Game used six real skips (loss); Costcodle used six deliberately incorrect prices (loss); Poople used its test-only solver to obtain a path, then submitted every word through the keyboard (win). Poople's capture passed with normal animations after the shared capture helper was changed to hide unrelated overlays while preserving the selected result panel and its ancestors. The host needed Noto Color Emoji for legible emoji screenshots; nothing was added to production for font rendering.

Final validation: 70 unit/contract tests passed, TypeScript and build passed, Firefox lint returned zero errors/warnings, and the full ten-game installed-extension suite passed in Chromium and Firefox. That suite verifies partial progress, tab reuse/manual navigation, research-time exclusion, pause/resume, actual browser close/reopen, all-game completion/capture, overlay exclusion, Minecraftle's full-height stitching, and fixed-order exports. Native live equality covered the specific runs above; alternate outcomes/preferences are fixture-tested, not claims of exhaustive live verification.

Share template v6 fixes all ten slots regardless of selection, shuffle, or completion order. Score normalization remains deferred; numeric metrics and native-format shares are retained.

## Background capture selection — 2026-10-30

At user request, Poople, Guess the Audio and GuessThe.Game now use background capture. Audio/Game target `.current-game` while hiding the result panel and footer; Poople captures its submitted path while hiding the result overlay, confetti and fixed site header. The existing shared capture mechanism restores all temporary styles. Fresh live installed-extension runs saved each background image and still matched native share text. The Poople live image was inspected to confirm that its title and first row are no longer covered by the fixed header. Browser fixtures paint result panels and the sticky Poople header magenta to catch accidental inclusion.

Scoring remains unimplemented pending review. `docs/scoring-proposal.md` specifies bounded raw formulas, automatic correction factors, configurable total budget/weights, five alternative-rule comparisons, and additional data needed for proximity scoring.
