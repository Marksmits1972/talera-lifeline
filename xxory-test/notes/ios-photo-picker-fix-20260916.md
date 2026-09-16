# iPhone photo picker fix — 2026-09-16

Problem confirmed on real iPhone/Safari-style in-app browser: the presentation-like vertelpagina rendered correctly, but photo selection still did not open reliably.

Cause in the visible shell: the +foto buttons still called `.click()` on a 1x1 hidden file input with `pointer-events:none` and negative z-index. That is still a proxy interaction and can be rejected by iOS/in-app browser user-activation rules.

Fix: the visible +foto controls are replaced after mount by labels containing a real native `input[type=file]` stretched transparently over the visible control. The native input receives the user's tap directly. Selected files are then handed to the existing `__taleraStorytellingActions.addPhotos()` path, preserving optimization, staging, draft/save and timeline behavior.

The old hidden proxy input is disabled after the native controls are installed.

Rollback: `backup/pre-ios-native-photo-input-20260916`.

This is an internal candidate only until real iPhone verification succeeds.
