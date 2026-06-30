"""Generate the BuckeyeRatings app icon set.

Design: a Scarlet rounded tile, a large silver-gray five-pointed star
(the ratings motif), with a bold scarlet "B" monogram knocked out of the star.
Rendered at 4x and downsampled for crisp antialiasing.
"""
import math
from PIL import Image, ImageDraw, ImageFont

AGGIE_BLUE = (187, 0, 0, 255)        # OSU Scarlet #BB0000 (tile)
AGGIE_GOLD = (206, 211, 215, 255)    # silver-gray star #CED3D7
SS = 4  # supersample factor

FONT_PATH = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"


def rounded_mask(size, radius):
    m = Image.new("L", (size, size), 0)
    d = ImageDraw.Draw(m)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return m


def star_points(cx, cy, r_out, r_in, n=5, rot=-math.pi / 2):
    pts = []
    for i in range(n * 2):
        ang = rot + i * math.pi / n
        r = r_out if i % 2 == 0 else r_in
        pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    return pts


def render(px):
    size = px * SS
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    # Aggie-blue rounded tile
    radius = int(size * 0.22)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=AGGIE_BLUE)

    # Gold star, centered and slightly raised so the optical center sits true
    cx, cy = size / 2, size * 0.52
    r_out = size * 0.40
    r_in = r_out * 0.42
    d.polygon(star_points(cx, cy, r_out, r_in), fill=AGGIE_GOLD)

    # Scarlet "B" knocked out of the star (only at sizes where it reads)
    if px >= 32:
        try:
            font = ImageFont.truetype(FONT_PATH, int(size * 0.40))
            tb = d.textbbox((0, 0), "B", font=font)
            tw, th = tb[2] - tb[0], tb[3] - tb[1]
            d.text(
                (cx - tw / 2 - tb[0], cy - th / 2 - tb[1]),
                "B", font=font, fill=AGGIE_BLUE,
            )
        except OSError:
            pass

    img = img.resize((px, px), Image.LANCZOS)
    # Re-apply a crisp rounded mask after downsample
    img.putalpha(rounded_mask(px, int(px * 0.22)))
    return img


out_dir = "public/icons/app"
for px in (16, 48, 128):
    render(px).save(f"{out_dir}/icon-{px}.png")
render(128).save(f"{out_dir}/logo.png")
print("wrote icon-16/48/128 + logo.png to", out_dir)
