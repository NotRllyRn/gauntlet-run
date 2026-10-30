# Poople daily adapter

Implemented only https://pooplegame.com/ (English daily game). No shared integration or capture infrastructure was edited by this task.

## Evidence and observations

- Shipped game chunk: `/_next/static/chunks/35-88451a41875bdfbb.js`, downloaded as `/tmp/poople-artifacts/17.js`; focused copy `/tmp/poople-focused/game.js`.
- REA Evidence `ev_3cbe69fdd093e754b373a680f630980efe3fef25de88aa763d9d0612c240b1d1`, container SHA-256 `24b740007ae9555eba04603b073ada7168bdccb9c1818e2f9b428950891f9fcf`. Complete evidence remains `/tmp/poople-focused-rea.json` (21 MB). Initial all-chunk analysis was stopped while processing framework code; the focused game-chunk analysis completed successfully.
- Static inspection: storage `guesses` is the submitted path including the start word. `dateLastPlayed` is a timestamp. Daily number is floor((time − 2025-08-14 08:00 UTC)/86400000). Daily mode wins on submitted POOP, has no attempt limit and no loss/give-up state. Give-up belongs to Unlimited only.
- Static share function L emits `Poople #NUMBER USED/PAR`, a row for every path word (including start), brown squares for letters matching POOP, white otherwise, a blank line, and `https://pooplegame.com/` including its trailing slash.
- Runtime confirmed puzzle #442, FUSS → CUSS → CUBS → COBS → COOS → COOP → POOP, 6 guesses / par 6. Test-only `window.__poopleSolve()` supplies the path; all steps are then submitted using ordinary keyboard events. Production adapter never accesses the solver, answer dictionary, React state, or hidden par.
- Production completion requires current puzzle number, current saved-play day, a valid one-letter submitted path, exact agreement with locked board tiles, terminal POOP, and the visible result panel's used/par text and start-word heading.
- Screenshot targets `.poople-card`; canvas confetti is selected for hiding during capture. The shared capture helper now hides unrelated overlays for result-panel captures while preserving the selected result and its ancestors. The live test passed with normal motion after this integration fix.

REA's graph is incomplete and static-only; unresolved dynamic relationships are not proof of absence. Runtime claims above come from the disposable Playwright run, not REA static analysis.

## Verification and artifacts

- Dedicated tests cover exact native share, win, unfinished progress, stale dates/numbers, malformed storage, inconsistent score/heading, invalid ladder transitions, Unlimited exclusion, above-par scores, and unsubmitted draft exclusion. No synthetic daily loss is invented; a 40-step unfinished path tests absence of a guess-limit loss.
- Full regression suite passed 68/68 at integration time; the additional dedicated above-par/draft test passes separately.
- Typecheck and Chrome/Firefox build passed.
- `node scripts/live-poople-test.mjs` passed with normal motion: actual extension-saved score and metrics, exact native clipboard equality, run completion, and screenshot persistence.
- `research/poople-live-raw.json` contains only the saved result, native share, and screenshot key. No broad storage or advertising tokens were captured.
- `research/poople-result.png` is the actual extension-saved result screenshot. The test environment initially lacked emoji fonts; Noto Color Emoji was added to the test host before recapturing. No font or test helper is bundled into the extension.
- Exported integration fixtures: `adapterFixture` in `tests/poople-fixture.ts`; `{html, dimensions}` in `tests/poople-browser-fixture.mjs`. Parent owns shared registration and full installed Chromium/Firefox browser test results; an integrated browser run was already active, so no duplicate was started.

T3 preview status/open was attempted first; open explicitly failed because Chromium cannot start its sandbox as root. Used the repository's authorized disposable installed-extension Playwright workflow. No commits or pushes.
