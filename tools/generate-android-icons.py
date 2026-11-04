#!/usr/bin/env python3
"""Builds the Android launcher icons from native-assets/icon-source.jpg.

Output goes to native-assets/android/res and is copied into the generated
android/ project by scripts/prepare-android.mjs. Only needed when the source
artwork changes; the generated files are committed.

Requires Pillow and numpy:  pip install pillow numpy
Run from the project root:  python3 tools/generate-android-icons.py
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "native-assets" / "icon-source.jpg"
OUT = ROOT / "native-assets" / "android"
RES = OUT / "res"

# Flat colour behind the logo (taken from the artwork's dark navy background).
BACKGROUND = (11, 20, 31)
BACKGROUND_HEX = "#0B141F"

# Area of the artwork that holds the wordmark and the tagline (source pixels).
# The whole of it must stay visible after the launcher applies its mask.
CONTENT_BOX = (81, 897, 1000, 1264)
FEATHER_PAD = 170  # extra artwork kept around the content, faded out before its edge
FEATHER_START = 25  # distance from the content box where the fade begins
FEATHER_END = 160   # distance from the content box where it is fully transparent

DENSITIES = {"mdpi": 1.0, "hdpi": 1.5, "xhdpi": 2.0, "xxhdpi": 3.0, "xxxhdpi": 4.0}
ADAPTIVE_DP = 108   # adaptive icon layer size
SAFE_DP = 66        # diameter of the circle every launcher mask keeps visible
LEGACY_DP = 48      # pre Android 8 icon size
LEGACY_FILL = 0.74  # content width as a share of a legacy icon


def load_content():
    """Returns the content crop as an RGBA image that fades out smoothly around the content box."""
    src = Image.open(SOURCE).convert("RGB")
    cx0, cy0, cx1, cy1 = CONTENT_BOX
    # Repeat the border pixels so the fade has artwork to blend on every side
    padded = np.pad(np.asarray(src), ((FEATHER_PAD, FEATHER_PAD), (FEATHER_PAD, FEATHER_PAD), (0, 0)), mode="edge")
    box = (cx0, cy0, cx1 + 2 * FEATHER_PAD, cy1 + 2 * FEATHER_PAD)  # content box plus pad, in padded coordinates
    crop = Image.fromarray(padded[box[1] : box[3], box[0] : box[2]])
    w, h = crop.size
    # Distance from each pixel to the content rectangle, then a smooth falloff
    ix0, iy0 = FEATHER_PAD, FEATHER_PAD
    ix1, iy1 = FEATHER_PAD + (cx1 - cx0), FEATHER_PAD + (cy1 - cy0)
    xx, yy = np.meshgrid(np.arange(w), np.arange(h))
    dist = np.hypot(np.maximum(np.maximum(ix0 - xx, 0), xx - ix1), np.maximum(np.maximum(iy0 - yy, 0), yy - iy1))
    t = np.clip((dist - FEATHER_START) / (FEATHER_END - FEATHER_START), 0, 1)
    alpha = 1 - t * t * (3 - 2 * t)
    rgba = crop.convert("RGBA")
    rgba.putalpha(Image.fromarray((alpha * 255).astype("uint8")))
    return rgba, (ix0, iy0, ix1, iy1)


def place(canvas_px, content_width_px, content, content_box):
    """Transparent square canvas with the content centred and scaled to the width."""
    scale = content_width_px / (content_box[2] - content_box[0])
    resized = content.resize(
        (max(1, round(content.width * scale)), max(1, round(content.height * scale))),
        Image.LANCZOS,
    )
    cx = (content_box[0] + content_box[2]) / 2 * scale
    cy = (content_box[1] + content_box[3]) / 2 * scale
    layer = Image.new("RGBA", (canvas_px, canvas_px), (0, 0, 0, 0))
    layer.alpha_composite(resized, (round(canvas_px / 2 - cx), round(canvas_px / 2 - cy)))
    return layer


def on_background(layer):
    base = Image.new("RGBA", layer.size, BACKGROUND + (255,))
    base.alpha_composite(layer)
    return base


def mask(size, shape):
    scale = 4
    m = Image.new("L", (size * scale, size * scale), 0)
    d = ImageDraw.Draw(m)
    if shape == "circle":
        d.ellipse((0, 0, size * scale - 1, size * scale - 1), fill=255)
    else:
        d.rounded_rectangle((0, 0, size * scale - 1, size * scale - 1), radius=int(size * scale * 0.18), fill=255)
    return m.resize((size, size), Image.LANCZOS)


def save(img, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, optimize=True)


def main():
    content, content_box = load_content()
    cw = content_box[2] - content_box[0]
    ch = content_box[3] - content_box[1]
    diagonal = (cw**2 + ch**2) ** 0.5
    # Content width at which its diagonal just fits inside the safe circle
    adaptive_fill = (SAFE_DP / ADAPTIVE_DP) * (cw / diagonal) * 0.98

    for name, density in DENSITIES.items():
        folder = RES / f"mipmap-{name}"

        fg_px = round(ADAPTIVE_DP * density)
        save(place(fg_px, fg_px * adaptive_fill, content, content_box), folder / "ic_launcher_foreground.png")

        px = round(LEGACY_DP * density)
        legacy = on_background(place(px, px * LEGACY_FILL, content, content_box))
        for file_name, shape in (("ic_launcher.png", "square"), ("ic_launcher_round.png", "circle")):
            shaped = legacy.copy()
            shaped.putalpha(mask(px, shape))
            save(shaped, folder / file_name)

    (RES / "values").mkdir(parents=True, exist_ok=True)
    (RES / "values" / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n'
        f'    <color name="ic_launcher_background">{BACKGROUND_HEX}</color>\n</resources>\n'
    )

    # 512px store listing icon (Google Play takes a full square and rounds it itself)
    store = on_background(place(512, 512 * 0.80, content, content_box)).convert("RGB")
    save(store, OUT / "ic_launcher-playstore.png")
    print(f"Icons written to {OUT} (adaptive content fill {adaptive_fill:.2f})")


if __name__ == "__main__":
    main()
