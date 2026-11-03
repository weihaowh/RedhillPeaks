"""Download the CC0 Poly Haven textures and HDRI the wabi-sabi furniture is built from.

Run with any Python 3:  python tools/blender/fetch_assets.py
Files land in tools/blender/cache/ (git-ignored). Already-downloaded files are skipped.
"""
import json
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, 'cache')
RES = '2k'

# Poly Haven texture id -> maps to fetch.
TEXTURES = {
    'white_oak_veneer': ['Diffuse', 'nor_gl', 'Rough'],
    'ash_veneer': ['Diffuse', 'nor_gl', 'Rough'],
    'rough_linen': ['Diffuse', 'nor_gl', 'Rough'],
    'curly_teddy_natural': ['Diffuse', 'nor_gl', 'Rough'],
    'hessian_380': ['Diffuse', 'nor_gl', 'Rough'],
    'tatami_mat': ['Diffuse', 'nor_gl', 'Rough'],
    'plastered_wall': ['Diffuse', 'nor_gl', 'Rough'],
    'cotton_jersey': ['Diffuse', 'nor_gl', 'Rough'],
}
HDRI = 'brown_photostudio_02'


def get(url, path):
    if os.path.exists(path):
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'RedhillPeaksStudio/1.0'})
    with urllib.request.urlopen(req) as r, open(path, 'wb') as f:
        f.write(r.read())


def files(asset_id):
    req = urllib.request.Request(f'https://api.polyhaven.com/files/{asset_id}', headers={'User-Agent': 'RedhillPeaksStudio/1.0'})
    return json.load(urllib.request.urlopen(req))


for tex, maps in TEXTURES.items():
    f = files(tex)
    for m in maps:
        get(f[m][RES]['jpg']['url'], os.path.join(CACHE, 'textures', f'{tex}_{m}.jpg'))
    print('texture', tex)

get(files(HDRI)['hdri']['2k']['hdr']['url'], os.path.join(CACHE, f'{HDRI}.hdr'))
print('hdri', HDRI)
