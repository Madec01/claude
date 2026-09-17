#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Extraction de sprites 2× (ou n×) depuis un SVG Kenney rasterisé par Chromium.

Principe (généralisation de l'ancien upscale_ships.py) : le SVG est rasterisé
deux fois par tools/rasterize_svg.js, à l'échelle 1 et à l'échelle N. On isole
les composantes connexes du rendu 1× (alpha dilaté de 2 px pour souder les
pièces proches), on apparie chaque PNG 1× du pack à une composante par taille
(±3 px) et similarité de pixels, puis on découpe la composante correspondante
dans le rendu N× et on la ramène EXACTEMENT à (N·w, N·h) — la géométrie du
PNG d'origine est donc conservée au facteur N près (tuiles 120×140 → 240×280).

Usage :
  python3 tools/upscale_from_svg.py --lo r1x.png --hi r2x.png --scale 2 \
      --png-dir <dossier de PNG 1×> [--png-dir …] --out tools/cache/hex2x

Le script est aussi importable (fonction extract()). Les sprites non appariés
sont listés sur la sortie standard ; build_images.py les remplace alors par un
agrandissement Lanczos du PNG, ce qui est consigné dans le manifeste.
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter


def label_components(mask):
    """Étiquette les composantes connexes (8-connexité) d'un masque booléen.

    Propagation itérative du label minimal (numpy pur, sans scipy) : converge
    en un nombre d'itérations de l'ordre du diamètre de la plus grande composante.
    """
    h, w = mask.shape
    labels = np.where(mask, np.arange(1, h * w + 1, dtype=np.int32).reshape(h, w), 0)
    big = np.iinfo(np.int32).max
    while True:
        cur = np.where(mask, labels, big)
        m = cur.copy()
        m[1:, :] = np.minimum(m[1:, :], cur[:-1, :])
        m[:-1, :] = np.minimum(m[:-1, :], cur[1:, :])
        m[:, 1:] = np.minimum(m[:, 1:], cur[:, :-1])
        m[:, :-1] = np.minimum(m[:, :-1], cur[:, 1:])
        m[1:, 1:] = np.minimum(m[1:, 1:], cur[:-1, :-1])
        m[1:, :-1] = np.minimum(m[1:, :-1], cur[:-1, 1:])
        m[:-1, 1:] = np.minimum(m[:-1, 1:], cur[1:, :-1])
        m[:-1, :-1] = np.minimum(m[:-1, :-1], cur[1:, 1:])
        new = np.where(mask, m, 0)
        if np.array_equal(new, labels):
            return labels
        labels = new


def components(lo, min_pixels=20, gap=2):
    """Boîtes englobantes (x0, y0, x1, y1) des composantes du rendu 1×."""
    alpha = np.array(lo.split()[3])
    solid = alpha > 8
    dil = Image.fromarray(solid.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(2 * gap + 1))
    dmask = np.array(dil) > 0
    labels = label_components(dmask)
    labels = np.where(solid, labels, 0)  # on ne garde que les pixels réellement peints
    ids, counts = np.unique(labels[labels > 0], return_counts=True)
    boxes = []
    ys, xs = np.nonzero(labels)
    lab = labels[ys, xs]
    order = np.argsort(lab, kind="stable")
    ys, xs, lab = ys[order], xs[order], lab[order]
    starts = np.searchsorted(lab, ids)
    ends = np.append(starts[1:], len(lab))
    for i, (s, e) in enumerate(zip(starts, ends)):
        if counts[i] < min_pixels:
            continue
        cy, cx = ys[s:e], xs[s:e]
        boxes.append((int(cx.min()), int(cy.min()), int(cx.max()) + 1, int(cy.max()) + 1))
    return boxes


def similarity(crop, sprite):
    """Écart moyen (0 = identique) entre une composante et un sprite, sur l'union des alphas."""
    c = crop.resize(sprite.size, Image.LANCZOS) if crop.size != sprite.size else crop
    a = np.asarray(c, dtype=np.float32)
    b = np.asarray(sprite, dtype=np.float32)
    m = (a[:, :, 3] > 8) | (b[:, :, 3] > 8)
    if not m.any():
        return None
    return float(np.abs(a - b)[m].mean())


def extract(lo_path, hi_path, scale, pngs, out_dir, tolerance=3, max_score=40.0, verbose=True):
    """Apparie les PNG (dict nom → chemin) aux composantes et écrit les sprites N× dans out_dir.

    Renvoie dict nom → {"file", "w", "h", "score", "box"} pour les sprites appariés.
    """
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    lo = Image.open(lo_path).convert("RGBA")
    hi = Image.open(hi_path).convert("RGBA")
    if hi.size != (lo.width * scale, lo.height * scale):
        raise RuntimeError(f"Rendus incohérents : {lo.size} ×{scale} ≠ {hi.size}")
    boxes = components(lo)
    if verbose:
        print(f"{Path(lo_path).name} : {len(boxes)} composantes, {len(pngs)} sprites à apparier")
    crops = [lo.crop(b) for b in boxes]

    sprites = {}
    for name, path in pngs.items():
        im = Image.open(path).convert("RGBA")
        bb = im.split()[3].getbbox()
        sprites[name] = (im, bb)

    # Tous les couples (score, sprite, composante) plausibles, puis affectation gloutonne par score croissant.
    cands = []
    for name, (im, bb) in sprites.items():
        if bb is None:
            continue
        sw, sh = bb[2] - bb[0], bb[3] - bb[1]
        trimmed = im.crop(bb)
        for i, (b, crop) in enumerate(zip(boxes, crops)):
            if abs(crop.width - sw) > tolerance or abs(crop.height - sh) > tolerance:
                continue
            s = similarity(crop, trimmed)
            if s is not None and s <= max_score:
                cands.append((s, name, i))
    cands.sort()
    used_sprite, used_box, result = set(), set(), {}
    for s, name, i in cands:
        if name in used_sprite or i in used_box:
            continue
        used_sprite.add(name)
        used_box.add(i)
        im, bb = sprites[name]
        x0, y0, x1, y1 = boxes[i]
        region = hi.crop((x0 * scale, y0 * scale, x1 * scale, y1 * scale))
        rb = region.split()[3].getbbox()
        if rb:
            region = region.crop(rb)
        target = (im.width * scale, im.height * scale)
        # Le PNG source peut avoir des marges transparentes (bb ≠ image entière) : on les reproduit.
        canvas = Image.new("RGBA", target, (0, 0, 0, 0))
        inner = ((bb[2] - bb[0]) * scale, (bb[3] - bb[1]) * scale)
        if region.size != inner:
            region = region.resize(inner, Image.LANCZOS)
        canvas.paste(region, (bb[0] * scale, bb[1] * scale))
        out_path = out_dir / f"{name}.png"
        canvas.save(out_path, "PNG", optimize=True)
        result[name] = {"file": str(out_path), "w": canvas.width, "h": canvas.height,
                        "score": round(s, 2), "box": [x0, y0, x1, y1]}
    missing = sorted(set(pngs) - set(result))
    if verbose:
        print(f"  {len(result)} appariés, {len(missing)} manquants")
        for name in missing:
            print(f"  ? {name}")
    return result, missing


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--lo", required=True, help="rendu 1× (tools/rasterize_svg.js … 1)")
    ap.add_argument("--hi", required=True, help="rendu N×")
    ap.add_argument("--scale", type=int, default=2)
    ap.add_argument("--png-dir", action="append", required=True, help="dossier(s) de PNG 1× (récursif)")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    pngs = {}
    for d in args.png_dir:
        for p in sorted(Path(d).rglob("*.png")):
            pngs[p.stem] = p
    result, missing = extract(args.lo, args.hi, args.scale, pngs, args.out)
    (Path(args.out) / "_index.json").write_text(
        json.dumps({"scale": args.scale, "matched": result, "missing": missing}, ensure_ascii=False, indent=1),
        encoding="utf-8")
    return 0 if result else 1


if __name__ == "__main__":
    sys.exit(main())
