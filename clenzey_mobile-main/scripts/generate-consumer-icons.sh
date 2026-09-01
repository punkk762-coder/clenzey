#!/usr/bin/env bash
# Regenerate consumer app icons from the white Clenzey logo.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ASSETS="$ROOT/apps/consumer/assets"
LOGO="$ROOT/packages/design-system/assets/logo-white.png"
VENV="/tmp/clenzey-icon-venv"

python3 -m venv "$VENV"
"$VENV/bin/pip" install -q pillow

"$VENV/bin/python3" << PY
from PIL import Image

logo = Image.open("$LOGO").convert("RGBA")
assets = "$ASSETS"
BLUE = (0, 67, 186, 255)

def make_icon(size, logo_scale=0.58, bg=BLUE, transparent_bg=False):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent_bg else bg)
    target_w = int(size * logo_scale)
    ratio = target_w / logo.width
    target_h = int(logo.height * ratio)
    resized = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (size - target_w) // 2
    y = (size - target_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas

make_icon(1024, logo_scale=0.58).save(f"{assets}/icon.png")
make_icon(1024, logo_scale=0.58, transparent_bg=True).save(f"{assets}/adaptive-icon.png")
make_icon(512, logo_scale=0.58).save(f"{assets}/splash-icon.png")
make_icon(96, logo_scale=0.72).save(f"{assets}/notification-icon.png")
print("Icons written to", assets)
PY

echo "Done."
