"""Paints the wall-art texture: a dry-brush ensō (Zen ink circle) on warm rice paper.

Run:  python tools/blender/make_art.py   -> tools/blender/cache/prepared/enso_color.jpg
"""
import math
import os
import random

from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'cache', 'prepared', 'enso_color.jpg')
W, H = 2400, 1600
rnd = random.Random(7)

# Rice paper: warm off-white with fibres and soft mottling.
paper = Image.new('RGB', (W, H), (236, 229, 214))
mottle = Image.effect_noise((W // 8, H // 8), 18).resize((W, H), Image.BICUBIC).convert('RGB')
paper = ImageChops.multiply(paper, Image.merge('RGB', [mottle.split()[0].point(lambda v: 225 + v // 9)] * 3))
fibres = Image.new('L', (W, H), 0)
fd = ImageDraw.Draw(fibres)
for _ in range(2600):
    x, y = rnd.uniform(0, W), rnd.uniform(0, H)
    a = rnd.uniform(0, math.pi)
    length = rnd.uniform(20, 110)
    pts = [(x + math.cos(a) * t + rnd.uniform(-2, 2), y + math.sin(a) * t + rnd.uniform(-2, 2)) for t in range(0, int(length), 6)]
    if len(pts) > 1:
        fd.line(pts, fill=rnd.randint(10, 35), width=1)
fibres = fibres.filter(ImageFilter.GaussianBlur(0.6))
paper = ImageChops.subtract(paper, Image.merge('RGB', [fibres] * 3))

# Ensō: one brush stroke, heavy at the start and breaking up into dry bristle marks at the end.
ink = Image.new('L', (W, H), 0)
idr = ImageDraw.Draw(ink)
cx, cy, R = W * 0.5, H * 0.5, H * 0.32
start, sweep = math.radians(110), math.radians(325)
bristles = [(rnd.uniform(-1, 1), rnd.uniform(0.5, 1.0)) for _ in range(90)]
steps = 900
for i in range(steps):
    t = i / steps
    a = start - sweep * t
    width = (1 - t) ** 0.6 * 70 + 18
    pressure = 1 - t ** 3
    for off, strength in bristles:
        # Bristles run out of ink towards the end of the stroke.
        if rnd.random() > pressure * strength + 0.08:
            continue
        rr = R + off * width + math.sin(a * 3 + off * 5) * 4
        x, y = cx + math.cos(a) * rr, cy - math.sin(a) * rr
        idr.ellipse((x - 3.2, y - 3.2, x + 3.2, y + 3.2), fill=min(255, int(150 + 105 * pressure)))
ink = ink.filter(ImageFilter.GaussianBlur(1.6))
# Ink bleeds slightly into the paper.
bleed = ink.filter(ImageFilter.GaussianBlur(7)).point(lambda v: v // 4)
ink = ImageChops.lighter(ink, bleed)
ink_colour = Image.new('RGB', (W, H), (32, 30, 29))
art = Image.composite(ink_colour, paper, ink)

# A small red seal (hanko) in the corner.
seal = ImageDraw.Draw(art)
sx, sy = int(W * 0.79), int(H * 0.72)
seal.rounded_rectangle((sx, sy, sx + 70, sy + 70), radius=6, fill=(160, 52, 40))
seal.rectangle((sx + 18, sy + 16, sx + 52, sy + 22), fill=(236, 220, 205))
seal.rectangle((sx + 32, sy + 16, sx + 38, sy + 54), fill=(236, 220, 205))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
art.save(OUT, 'JPEG', quality=88)
print('wrote', OUT)
