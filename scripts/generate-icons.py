"""
Generate app icons for TsuriNavi (iOS + PWA).

Design:
  - Background: deep ocean blue gradient (#0c4a6e → #0369a1)
  - Wave shape at bottom third (white, semi-transparent)
  - Stylized fish silhouette (golden yellow) jumping upward-right
  - Fishing line from top-right to fish hook area

Usage:
  python3 scripts/generate-icons.py
"""

import math
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def create_base_icon(size: int = 1024) -> Image.Image:
    s = size / 1024
    img = Image.new("RGBA", (size, size))
    draw = ImageDraw.Draw(img)

    # ── Background gradient (dark ocean blue → bright blue) ──────────────────
    top_color = (12, 74, 110)
    bot_color = (3, 105, 161)
    for y in range(size):
        t = y / (size - 1)
        r = int(top_color[0] + (bot_color[0] - top_color[0]) * t)
        g = int(top_color[1] + (bot_color[1] - top_color[1]) * t)
        b = int(top_color[2] + (bot_color[2] - top_color[2]) * t)
        draw.line([(0, y), (size - 1, y)], fill=(r, g, b, 255))

    # ── Wave (bottom ~30%) ───────────────────────────────────────────────────
    wave_base = int(720 * s)
    pts1: list[tuple[float, float]] = []
    for x in range(size + 1):
        off = math.sin(x / size * 3 * math.pi) * int(28 * s)
        pts1.append((x, wave_base + off))
    pts1 += [(size, size), (0, size)]
    draw.polygon(pts1, fill=(255, 255, 255, 45))

    wave2_base = int(760 * s)
    pts2: list[tuple[float, float]] = []
    for x in range(size + 1):
        off = math.sin(x / size * 3 * math.pi + math.pi) * int(22 * s)
        pts2.append((x, wave2_base + off))
    pts2 += [(size, size), (0, size)]
    draw.polygon(pts2, fill=(255, 255, 255, 30))

    # ── Fish silhouette (jumping up-right at ~45°) ────────────────────────────
    # Draw in a rotated coordinate frame, then composite.
    FISH_W = int(340 * s)
    FISH_H = int(160 * s)
    TAIL_W = int(110 * s)
    TAIL_H = int(110 * s)

    fish_canvas = Image.new("RGBA", (FISH_W + TAIL_W + 20, FISH_H + 20), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fish_canvas)
    fish_color = (255, 210, 40, 255)

    # Body (ellipse)
    bx, by = TAIL_W, 10
    fd.ellipse([bx, by, bx + FISH_W, by + FISH_H], fill=fish_color)

    # Tail (two triangles = fork tail)
    tx = bx
    mid_y = by + FISH_H // 2
    fd.polygon(
        [(tx, mid_y), (tx - TAIL_W, mid_y - TAIL_H // 2), (tx - TAIL_W + int(20 * s), mid_y)],
        fill=fish_color,
    )
    fd.polygon(
        [(tx, mid_y), (tx - TAIL_W, mid_y + TAIL_H // 2), (tx - TAIL_W + int(20 * s), mid_y)],
        fill=fish_color,
    )

    # Eye (white with dark pupil)
    ex = bx + int(FISH_W * 0.75)
    ey = mid_y - int(20 * s)
    er = int(22 * s)
    fd.ellipse([ex - er, ey - er, ex + er, ey + er], fill=(255, 255, 255, 255))
    fd.ellipse([ex - er // 2, ey - er // 2, ex + er // 2, ey + er // 2], fill=(10, 10, 10, 255))

    # Rotate 35° upward (counter-clockwise)
    fish_rotated = fish_canvas.rotate(35, expand=True, resample=Image.BICUBIC)

    # Paste fish centered in the icon (slightly left-of-center, upper half)
    fx = int(size * 0.38 - fish_rotated.width // 2)
    fy = int(size * 0.38 - fish_rotated.height // 2)
    img.paste(fish_rotated, (fx, fy), fish_rotated)

    # ── Fishing line (from top-right → near fish mouth) ──────────────────────
    line_start = (int(860 * s), int(160 * s))
    line_end = (int(590 * s), int(330 * s))
    draw2 = ImageDraw.Draw(img)
    lw = max(3, int(5 * s))
    draw2.line([line_start, line_end], fill=(255, 255, 255, 180), width=lw)

    # Rod tip dot
    rdot = max(6, int(10 * s))
    draw2.ellipse(
        [line_start[0] - rdot, line_start[1] - rdot, line_start[0] + rdot, line_start[1] + rdot],
        fill=(255, 255, 255, 200),
    )

    return img


def save_png(img: Image.Image, path: str, size: int) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(path, "PNG")
    print(f"  wrote {size}x{size} → {os.path.relpath(path, ROOT)}")


def main() -> None:
    print("Generating TsuriNavi app icons …")
    base = create_base_icon(1024)

    # ── iOS AppIcon.appiconset (single 1024px, Xcode 15+ / iOS 17) ───────────
    ios_dir = os.path.join(ROOT, "ios", "TsuriNavi", "Assets.xcassets", "AppIcon.appiconset")
    save_png(base, os.path.join(ios_dir, "AppIcon-1024.png"), 1024)

    # ── PWA icons ─────────────────────────────────────────────────────────────
    pwa_dir = os.path.join(ROOT, "public", "icons")
    save_png(base, os.path.join(pwa_dir, "icon-512x512.png"), 512)
    save_png(base, os.path.join(pwa_dir, "icon-192x192.png"), 192)

    print("Done.")


if __name__ == "__main__":
    main()
