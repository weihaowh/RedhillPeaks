"""Turn the downloaded Poly Haven maps into the shared textures the GLBs use.

Tintable maps (wood, fabrics) become neutral grey detail: luminance only, large-scale blotches
flattened and the average set to 80% grey, so the app can multiply in any finish or fabric colour
and get that colour back with real grain or weave on top. Other maps are resized and re-encoded.

Run:  python tools/blender/prep_textures.py
Writes to tools/blender/cache/prepared/; the glTF exporter copies what each model uses into
public/models/wabi/textures/. Roughness is packed into the G channel of an ORM map (R = 1, B = 0)
so glTF uses it as-is.
"""
import os

from PIL import Image, ImageFilter, ImageOps, ImageStat

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'cache', 'textures')
OUT = os.path.join(HERE, 'cache', 'prepared')
SIZE = 2048
NEUTRAL = 0.80

# output name -> (Poly Haven id, tintable, contrast)
SETS = {
    'oak': ('white_oak_veneer', True, 1.35),
    'ash': ('ash_veneer', True, 1.25),
    'linen': ('rough_linen', True, 1.6),
    'boucle': ('curly_teddy_natural', True, 1.1),
    'jute': ('hessian_380', True, 1.2),
    'cotton': ('cotton_jersey', True, 1.0),
    'tatami': ('tatami_mat', False, 1.0),
    'plaster': ('plastered_wall', False, 1.0),
}


def neutral(img: Image.Image, contrast: float) -> Image.Image:
    lum = ImageOps.grayscale(img).resize((SIZE, SIZE), Image.LANCZOS)
    # Remove large-scale light/dark patches (lighting, dye variation) but keep fine detail.
    blur = lum.filter(ImageFilter.GaussianBlur(SIZE / 24))
    mean = ImageStat.Stat(lum).mean[0]
    px = lum.load()
    bl = blur.load()
    out = Image.new('L', lum.size)
    op = out.load()
    target = NEUTRAL * 255
    for y in range(SIZE):
        for x in range(SIZE):
            detail = (px[x, y] - bl[x, y]) * contrast
            op[x, y] = max(0, min(255, int(target + detail * (target / max(mean, 1)))))
    return out.convert('RGB')


def save(img: Image.Image, name: str):
    img.save(os.path.join(OUT, f'{name}.jpg'), 'JPEG', quality=86, optimize=True)


os.makedirs(OUT, exist_ok=True)
for name, (src, tint, contrast) in SETS.items():
    diff = Image.open(os.path.join(SRC, f'{src}_Diffuse.jpg')).convert('RGB')
    if tint:
        save(neutral(diff, contrast), f'{name}_color')
    else:
        save(diff.resize((SIZE, SIZE), Image.LANCZOS), f'{name}_color')
    nor = Image.open(os.path.join(SRC, f'{src}_nor_gl.jpg')).convert('RGB')
    save(nor.resize((SIZE, SIZE), Image.LANCZOS), f'{name}_normal')
    rough = ImageOps.grayscale(Image.open(os.path.join(SRC, f'{src}_Rough.jpg'))).resize((SIZE // 2, SIZE // 2), Image.LANCZOS)
    save(Image.merge('RGB', (Image.new('L', rough.size, 255), rough, Image.new('L', rough.size, 0))), f'{name}_orm')
    print(name)
