"""Tiles preview renders into one image for review.

python tools/blender/contact_sheet.py <out.jpg> <view> [names...]   (no names: every preview of that view)
"""
import os
import sys

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
PREV = os.path.join(HERE, 'cache', 'previews')
out, view = sys.argv[1], sys.argv[2]
names = sys.argv[3:] or sorted(f[: -len(f'_{view}.png')] for f in os.listdir(PREV) if f.endswith(f'_{view}.png'))
cols, w, h = 4, 440, 320
sheet = Image.new('RGB', (cols * w, ((len(names) + cols - 1) // cols) * (h + 22)), 'white')
draw = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    path = os.path.join(PREV, f'{n}_{view}.png')
    if not os.path.exists(path):
        continue
    im = Image.open(path).convert('RGB')
    im.thumbnail((w, h))
    x, y = (i % cols) * w, (i // cols) * (h + 22)
    sheet.paste(im, (x, y))
    draw.text((x + 4, y + h + 4), n, fill='black')
sheet.save(out, quality=85)
print(out, len(names))
