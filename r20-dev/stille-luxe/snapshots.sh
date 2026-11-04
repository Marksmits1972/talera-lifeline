#!/usr/bin/env bash
# No installed app data, credentials, cookies or persistent browser profile.
set -euo pipefail
out="${RUNNER_TEMP:-/tmp}/talera-stille-luxe-screens"
mkdir -p "$out"
browser="$(command -v google-chrome || command -v google-chrome-stable || command -v chromium || command -v chromium-browser || true)"
if [[ -z "$browser" ]]; then
  echo "No headless Chrome available on runner; automated screenshots skipped."
  exit 0
fi
base="https://talera-v9-stille-luxe-stijlstaging-20261104.mark-a39.workers.dev"
for key in home mijn-leven tell present; do
  if [[ "$key" == home ]]; then page="/"; else page="/$key"; fi
  profile="$(mktemp -d)"
  echo "Capture anonymous $key (393 x 852)"
  timeout 25 "$browser" --headless=new --no-sandbox --disable-gpu --hide-scrollbars --disable-dev-shm-usage --no-first-run --disable-extensions --user-data-dir="$profile" --virtual-time-budget=2500 --window-size=393,852 --screenshot="$out/iphone-${key}.png" "$base$page" >/dev/null 2>&1 || true
  rm -rf "$profile"
done
profile="$(mktemp -d)"
timeout 25 "$browser" --headless=new --no-sandbox --disable-gpu --hide-scrollbars --disable-dev-shm-usage --no-first-run --disable-extensions --user-data-dir="$profile" --virtual-time-budget=2500 --window-size=1280,800 --screenshot="$out/desktop-mijn-leven.png" "$base/mijn-leven" >/dev/null 2>&1 || true
rm -rf "$profile"
ls -lh "$out" || true
