# Krillion graph + Catch capture

The existing score/histogram panel and The Catch are siblings inside `.ds-done-inner > div`. Promotions and controls sit between them. The outer `.ds-done` is an independently scrolling results panel, so window scrolling cannot reach every Catch row.

The adapter now targets their common container, requires all seven Catch rows, and temporarily hides the other children. A shared optional `scrollContainerSelector` lets the existing native-size stitcher scroll this panel. Capture clips each slice to the panel viewport and restores its original scroll position and hidden styles afterward. Result detection, scores, and native share extraction are unchanged.

The live-page check used a disposable Chromium profile with a reconstructed 305-point result based on the seven answers in the user's screenshot. It was a layout/capture replay, not a newly played run. The site rendered the score graph and all seven answers; native share equality and scroll restoration passed. Example: `research/krillion-catch-result.png` (ignored generated evidence).

Regression coverage includes a 1160px fixture in a 600px scroll panel for both Chrome and Firefox, plus a unit check that confirms graph/Catch inclusion, promotion hiding, clipped overlapping slices, and restoration of a nonzero original scroll position.
