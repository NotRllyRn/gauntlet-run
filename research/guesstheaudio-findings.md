# GuessTheAudio adapter investigation

Target: https://guesstheaudio.com/ (daily audio only). Observed 2026-10-30, puzzle 1276.

## Evidence and scope

- Shipped `/static/js/main.040585e3.js`, SHA-256 `ad7ec27388ce6fd15f26b0c170b098a802479e9c6987e0ea7b4322ebf1f4a824`. Direct static inspection identified `qN` game metadata, `Ho` share cubes, `zn` share formatting, `jn` copy action, `ON.num_days_from_start_date`, and `xi` rank thresholds.
- REA CLI attempted analysis of `/tmp/guesstheaudio-artifact`. It returned `provider_timeout` at its 300000ms per-source deadline. Partial Evidence `ev_c78e19894f36a8d5ab5aa67fae4d5a6d4144bf2fd6061114eff20babf81899b2`, artifact root digest `797575a5bf09eb3f8e9eae4d34e945f8a5f0637ad960daa4218ac0cc87bc1ab1`. This is incomplete static analysis, not a successful whole-app semantic graph. Direct bundle inspection and browser observations establish the behaviors below.
- T3 preview status/open attempted; open failed because the root server cannot start Chrome's sandbox. Used the repository's documented disposable Playwright Chromium extension workflow.
- Actual extension result: `research/guesstheaudio-live-raw.json`. Actual extension-captured image: `research/guesstheaudio-result.png` (512 × 360). Native Share Results copy output equals saved `result.shareText` byte-for-byte.

## Observed contract

`<day>_gamestate` is a raw string (`playing`, `win`, `lose`); `<day>_guess1` through `guess6` are raw submitted guesses, including `Skipped!`; `_f` suffixes store franchise-match booleans. The adapter reads only these game keys and four share preferences, never broad storage, ad data, credentials, or the bundled answer table. Historical gamestate keys supply native rank thresholds. The answer is read only from the completed visible `.result .answer`.

The native day is `ceil((now - local midnight May 4, 2023) / 86400000)`. The current Song heading must match it. Previous puzzles and other game types cannot satisfy that daily heading check. Completion requires saved terminal state, contiguous submitted guesses, matching visible win/loss marker and six cube feedback elements, revealed answer, and native share button. Loss requires six attempts.

Share format includes the tag/day, six spaced squares, optional rank, optional URL, optional franchise-yellow feedback, and member controller badges. The shipped settings header uses `svg[stroke="green"]` when authenticated; this is used without inspecting authentication storage. Member badges are statically established and fixture-tested, not tested against a real authenticated account. Rank/link preferences are fixture-tested; live equality used defaults. A result heading injects a style element after completion, so heading extraction excludes style/script text.

## Verification

- Dedicated tests: exact win/loss shares, incomplete/stale/malformed state, contradictory feedback, missing revealed answer, share preferences, franchise feedback, injected heading CSS, member badges.
- Shared adapter contract plus dedicated suite: 25/25 passed.
- Typecheck and build passed.
- Installed Chromium live check: six real Skip button submissions, saved `lost` / `X/6`, six guesses, completed run, exact native share equality, saved screenshot. No hidden-answer lookup or seeded completion used.
- Exported `adapterFixture` and browser `{html, dimensions}` for parent integration. Fixture storage is raw; parent added `rawStorage` integration. Shared browser suite remains parent-owned; do not infer Firefox/live-win verification from the Chromium live loss.

No shared files or capture infrastructure were edited in this task; no commits or pushes.
