# Experimental state note — 10 Sep 2026

This commit marks the current experimental presentation state before returning production `main` to the saved presentation baseline.

The experimental state includes `intent-response.js` and `navigation-intent-engine.js`. These layers are being backed out because overlapping touch/zoom listeners caused nervous timeline movement and loss of stable positioning on mobile.

The known-good reference remains branch `backup/presentation-baseline-2026-09-10`.
