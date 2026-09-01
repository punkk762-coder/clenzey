#!/usr/bin/env bash
# Capture a crash log from a connected Android device.
# Usage: ./scripts/capture-android-crash-log.sh [output.log]
set -euo pipefail

ADB="${ADB:-$HOME/Library/Android/sdk/platform-tools/adb}"
OUT="${1:-/tmp/clenzey-crash.log}"
PKG="com.clenzey.consumer"

if ! "$ADB" devices | grep -q 'device$'; then
  echo "No Android device connected. Enable USB debugging and reconnect."
  exit 1
fi

echo "Clearing old logs..."
"$ADB" logcat -c

echo "Launch the Clenzey app on your phone now. Waiting 15s for crash..."
sleep 15

echo "Saving logcat to $OUT"
"$ADB" logcat -d -v time \
  AndroidRuntime:E ReactNativeJS:E ReactNative:E ExpoModulesCore:E SoLoader:E \
  FirebaseInitProvider:E FirebaseApp:E \
  "*:S" > "$OUT" || "$ADB" logcat -d > "$OUT"

echo ""
echo "Crash hints:"
grep -E "FATAL|AndroidRuntime|SoLoader|Firebase|Exception|clenzey" "$OUT" | tail -40 || true
echo ""
echo "Full log: $OUT"
