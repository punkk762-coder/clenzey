#!/usr/bin/env python3
"""Compose partner app icons/splash from the partner logo image."""

from __future__ import annotations

from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
OUT = ROOT / "apps" / "partner" / "assets"
SOURCE = OUT / "logo-source.png"

# Theme: colors.neutral
PARTNER_NAVY = (3, 4, 94, 255)
WHITE = (255, 255, 255, 255)


def load_logo() -> Image.Image:
    logo = Image.open(SOURCE).convert("RGBA")
    bbox = logo.getbbox()
    if bbox:
        logo = logo.crop(bbox)
    return logo


def fit_on_canvas(
    logo: Image.Image,
    canvas_w: int,
    canvas_h: int,
    width_ratio: float,
    background: tuple[int, int, int, int] | None = PARTNER_NAVY,
) -> Image.Image:
    if background is None:
        canvas = Image.new("RGBA", (canvas_w, canvas_h), (0, 0, 0, 0))
    else:
        canvas = Image.new("RGBA", (canvas_w, canvas_h), background)

    target_w = int(canvas_w * width_ratio)
    scale = target_w / logo.width
    target_h = int(logo.height * scale)
    resized = logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (canvas_w - target_w) // 2
    y = (canvas_h - target_h) // 2
    canvas.paste(resized, (x, y), resized)
    return canvas


def to_white_silhouette(image: Image.Image) -> Image.Image:
    result = Image.new("RGBA", image.size, (0, 0, 0, 0))
    src = image.load()
    dst = result.load()
    for y in range(image.height):
        for x in range(image.width):
            _, _, _, alpha = src[x, y]
            if alpha > 20:
                dst[x, y] = WHITE
    return result


def compose_icon(size: int) -> Image.Image:
    return fit_on_canvas(load_logo(), size, size, width_ratio=0.82, background=PARTNER_NAVY)


def compose_splash_icon(max_width: int = 1400) -> Image.Image:
    """Export the logo at full width — avoids tiny logo in a square canvas."""
    logo = load_logo()
    scale = max_width / logo.width
    target_h = int(logo.height * scale)
    return logo.resize((max_width, target_h), Image.Resampling.LANCZOS)


def compose_adaptive_foreground(size: int) -> Image.Image:
    """Android adaptive icon safe zone (~66% center)."""
    return fit_on_canvas(load_logo(), size, size, width_ratio=0.62, background=None)


def compose_notification_icon(size: int) -> Image.Image:
    logo_layer = fit_on_canvas(load_logo(), size, size, width_ratio=0.9, background=None)
    return to_white_silhouette(logo_layer)


def main() -> None:
    if not SOURCE.exists():
        raise SystemExit(f"Missing source logo: {SOURCE}")

    OUT.mkdir(parents=True, exist_ok=True)
    logo = load_logo()
    logo.save(OUT / "logo.png", "PNG")

    compose_icon(1024).save(OUT / "icon.png", "PNG")
    compose_adaptive_foreground(1024).save(OUT / "adaptive-icon.png", "PNG")

    splash = compose_splash_icon()
    splash.save(OUT / "splash-icon.png", "PNG")
    splash.save(OUT / "splash.png", "PNG")

    compose_notification_icon(96).save(OUT / "notification-icon.png", "PNG")

    print(f"Generated partner assets in {OUT}")


if __name__ == "__main__":
    main()
