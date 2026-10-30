# Costcodle — 2026-10-30

Observed live `https://costcodle.com/` and its shipped `scripts/main.js`. Static REA evidence: `ev_081ffc5fcc63f51427cc8e7ec6a89111d3df59a36d0925cff80290f1ca354ca7` (inert syntax analysis, not runtime proof). Live disposable Chromium play corroborated six submitted guesses, revealed price, native share, and the installed extension's saved result/image.

The adapter uses only `state` (`gameNumber`, `guesses`, `hasWon`) and visible DOM. Each guess stores a two-decimal price string, closeness class, and direction entity. Submitted rows must agree with storage; the revealed price must reproduce every feedback classification before completion is accepted. Win tolerance is 5%, near feedback 25%. Native desktop share uses one arrow/color row per guess and preserves the site URL.

Puzzle numbering deliberately matches the site's `ceil((now - local Sep 21 2023 midnight)/86400000)+1`, including its midnight/DST quirks. Screenshot captures `#game-container`, temporarily hiding statistics/help overlays and toast messages. Raw price/product/guess data remains spoiler-only; public metrics retain guess count and maximum.

Live evidence: puzzle 1137, six deliberate $0.01 guesses, loss `X/6`; native share equality passed. Saved `research/costcodle-result.png` and `research/costcodle-live-raw.json`. No hidden price lookup is used in production or this live test. Fixtures additionally cover wins, near/down feedback, invalid/stale storage and mismatched visible results.
