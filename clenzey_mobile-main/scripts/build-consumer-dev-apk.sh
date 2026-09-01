#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CONSUMER="$ROOT/apps/consumer"

# Load local env overrides (EXPO_PUBLIC_API_URL, etc.)
if [[ -f "$CONSUMER/.env.local" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$CONSUMER/.env.local"
  set +a
elif [[ -f "$CONSUMER/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$CONSUMER/.env"
  set +a
fi

# Resolve LAN IP for physical device testing (override with EXPO_PUBLIC_API_URL)
detect_lan_ip() {
  ipconfig getifaddr en0 2>/dev/null \
    || ipconfig getifaddr en1 2>/dev/null \
    || ip route get 1.1.1.1 2>/dev/null | awk '{print $7; exit}' \
    || true
}

LAN_IP="${LAN_IP:-$(detect_lan_ip)}"

# APK builds must use LAN IP — localhost is unreachable from a phone
if [[ -z "${EXPO_PUBLIC_API_URL:-}" || "$EXPO_PUBLIC_API_URL" == *"localhost"* || "$EXPO_PUBLIC_API_URL" == *"127.0.0.1"* ]]; then
  if [[ -z "$LAN_IP" ]]; then
    echo "Error: Could not detect LAN IP. Set EXPO_PUBLIC_API_URL=http://<your-ip>:3001"
    exit 1
  fi
  export EXPO_PUBLIC_API_URL="http://${LAN_IP}:3001"
fi

echo "Building standalone release APK with API URL: $EXPO_PUBLIC_API_URL"
echo "(Release bundles JS — no Metro server required on device)"
echo ""

cd "$CONSUMER"

# Link real Razorpay native SDK in the JS bundle for release APK builds.
export EXPO_USE_NATIVE_RAZORPAY=1

# Generate native android/ project (gitignored)
EXPO_PUBLIC_API_URL="$EXPO_PUBLIC_API_URL" npx expo prebuild --platform android --clean

cd android
EXPO_USE_NATIVE_RAZORPAY=1 ./gradlew assembleRelease --no-daemon

APK="$CONSUMER/android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "APK ready: $APK"
ls -lh "$APK" 2>/dev/null || true
echo ""
echo "Install on a connected device:"
echo "  adb install -r \"$APK\""
echo ""
echo "Backend checklist:"
echo "  1. Backend running at localhost:3001 on this machine"
echo "  2. Backend bound to 0.0.0.0 (not 127.0.0.1 only)"
echo "  3. Phone and computer on the same Wi-Fi network"
echo "  4. API URL baked into this build: $EXPO_PUBLIC_API_URL"
