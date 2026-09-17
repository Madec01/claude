#!/usr/bin/env python3
"""Remplace les sprites de navires (66×113 natifs) par des versions 3× rasterisées depuis le SVG du Pirate Pack.

Étapes : le SVG `shipsMiscellaneous_vector.svg` est rasterisé par Chromium (tools/rasterize_ships.js) en 3840×2160 ;
on isole les composantes connexes de la version 1× (1280×720), on associe chaque composante à un sprite du manifeste
par taille et similarité de pixels, puis on découpe la version 3×. Relançable.
"""
import json, sys, os
from collections import deque
from PIL import Image
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HI = sys.argv[1] if len(sys.argv) > 1 else '/tmp/ships_svg_3x.png'
SCALE = 3
man_path = os.path.join(ROOT, 'assets/img/manifest.json')
man = json.load(open(man_path))

hi = Image.open(HI).convert('RGBA')
lo = hi.resize((hi.width // SCALE, hi.height // SCALE), Image.LANCZOS)
alpha = np.array(lo)[:, :, 3] > 8
H, W = alpha.shape
seen = np.zeros_like(alpha, dtype=bool)
comps = []
for y in range(H):
    for x in range(W):
        if alpha[y, x] and not seen[y, x]:
            q = deque([(y, x)]); seen[y, x] = True
            x0 = x1 = x; y0 = y1 = y; n = 0
            while q:
                cy, cx = q.popleft(); n += 1
                x0 = min(x0, cx); x1 = max(x1, cx); y0 = min(y0, cy); y1 = max(y1, cy)
                for dy in (-2, -1, 0, 1, 2):
                    for dx in (-2, -1, 0, 1, 2):
                        ny, nx = cy + dy, cx + dx
                        if 0 <= ny < H and 0 <= nx < W and alpha[ny, nx] and not seen[ny, nx]:
                            seen[ny, nx] = True; q.append((ny, nx))
            if n > 30:
                comps.append((x0, y0, x1 + 1, y1 + 1))
print(f'{len(comps)} composantes')

lo_np = np.array(lo).astype(np.float32)
def score(box, sprite):
    x0, y0, x1, y1 = box
    crop = lo.crop(box)
    if abs(crop.width - sprite.width) > 3 or abs(crop.height - sprite.height) > 3:
        return None
    c = crop.resize(sprite.size, Image.LANCZOS)
    a = np.array(c).astype(np.float32); b = np.array(sprite.convert('RGBA')).astype(np.float32)
    m = (a[:, :, 3] > 8) | (b[:, :, 3] > 8)
    if m.sum() == 0: return None
    d = np.abs(a - b)[m].mean()
    return d

targets = {k: v for k, v in man['images'].items() if v['file'].startswith('ships/')}
used = set(); done = 0
for key, meta in sorted(targets.items()):
    path = os.path.join(ROOT, 'assets/img', meta['file'])
    sprite = Image.open(path).convert('RGBA')
    best = None
    for i, box in enumerate(comps):
        if i in used: continue
        s = score(box, sprite)
        if s is not None and (best is None or s < best[0]):
            best = (s, i, box)
    if best is None or best[0] > 40:
        print(f'  ? {key} : aucune correspondance ({best and round(best[0],1)})')
        continue
    s, i, (x0, y0, x1, y1) = best
    used.add(i)
    crop = hi.crop((x0 * SCALE, y0 * SCALE, x1 * SCALE, y1 * SCALE))
    bbox = crop.getbbox()
    if bbox: crop = crop.crop(bbox)
    crop.save(path, optimize=True)
    meta['w'], meta['h'] = crop.size
    meta['bytes'] = os.path.getsize(path)
    meta['scale'] = SCALE
    meta['note'] = (meta.get('note', '') + f' Rasterisé ×{SCALE} depuis Vector/shipsMiscellaneous_vector.svg (Chromium).').strip()
    done += 1
print(f'{done}/{len(targets)} sprites remplacés')
man['upscaled_ships'] = {'scale': SCALE, 'source': 'kenney_piratepack/Vector/shipsMiscellaneous_vector.svg', 'tool': 'tools/rasterize_ships.js + tools/upscale_ships.py'}
json.dump(man, open(man_path, 'w'), ensure_ascii=False, indent=1)
