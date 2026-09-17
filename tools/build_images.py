#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pipeline images « Cent Saisons » — tuiles hexagonales 2×, variantes saisonnières,
faune, effets, UI.

Lit les packs Kenney (CC0) depuis le miroir GitHub ETdoFresh/kenney.nl, écrit des
PNG individuels dans assets/img/<dossier>/, puis génère :
  - assets/img/manifest.json    (toutes les images produites, tailles, sources, notes)
  - assets/credits/images.json  (packs utilisés, licences, fichiers ; + polices)

Étapes (toutes relançables, tout est régénéré depuis les sources) :
  1. python3 tools/fetch_fonts.py                       (polices, css/fonts.css)
  2. node tools/rasterize_svg.js <svg> <png> <échelle>  (rendus Chromium des SVG du
     Hexagon Pack, 1× et 2×, dans tools/cache/svg/ — lancé automatiquement par ce
     script s'ils manquent)
  3. python3 tools/build_images.py [--src …] [--out …] [--rebuild-cache] [--sheets]

Les tuiles et objets du Hexagon Pack sont extraits en 2× du rendu SVG par
tools/upscale_from_svg.py (appariement des composantes connexes aux PNG 1× du
pack). Si un sprite n'est pas apparié, il est agrandi ×2 en Lanczos depuis le
PNG et le manifeste le consigne (« method »: « lanczos »).

Géométrie : tuile 240×280 (hexagone à sommet en haut), bords plats de y=69 à
y=210, sommets (120,0) (240,70) (240,210) (120,280) (0,210) (0,70) ; toutes les
tuiles ont exactement cette taille et le même hexagone de base (vérifié).
"""
import argparse
import datetime as _dt
import json
import os
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from upscale_from_svg import extract  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / "tools" / "cache"

# ---------------------------------------------------------------------------
# Packs sources (tous CC0 — le fichier de licence de chaque pack est vérifié)
# ---------------------------------------------------------------------------
MIRROR = "https://github.com/ETdoFresh/kenney.nl"
CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/"
PACKS = {
    "hexagon-pack": dict(pack="Hexagon Pack", url="https://kenney.nl/assets/hexagon-pack", license_file="License.txt"),
    "hexagontiles": dict(pack="Hexagon Tiles", url="https://kenney.nl/assets/hexagon-tiles", license_file="license.txt"),
    "kenney_animalpackredux": dict(pack="Animal Pack Redux", url="https://kenney.nl/assets/animal-pack-redux", license_file="License.txt"),
    "particlePack_1.1": dict(pack="Particle Pack (1.1)", url="https://kenney.nl/assets/particle-pack", license_file="License.txt"),
    "smokeparticleassets": dict(pack="Smoke Particles", url="https://kenney.nl/assets/smoke-particles", license_file="license.txt"),
    "kenney_foliagesprites": dict(pack="Foliage Sprites", url="https://kenney.nl/assets/foliage-sprites", license_file="License.txt"),
    "gameicons": dict(pack="Game Icons", url="https://kenney.nl/assets/game-icons", license_file="license.txt"),
    "gameicons-expansion": dict(pack="Game Icons Expansion", url="https://kenney.nl/assets/game-icons-expansion", license_file="license.txt"),
    "uipack_fixed": dict(pack="UI Pack", url="https://kenney.nl/assets/ui-pack", license_file="license.txt"),
}
HP, HT, AN, PA, SM, FO, GI, GIE, UI = ("hexagon-pack", "hexagontiles", "kenney_animalpackredux", "particlePack_1.1",
                                       "smokeparticleassets", "kenney_foliagesprites", "gameicons",
                                       "gameicons-expansion", "uipack_fixed")

# ---------------------------------------------------------------------------
# Géométrie des tuiles (mesurée sur le rendu 2× de grass_05)
# ---------------------------------------------------------------------------
SCALE = 2
TILE_W, TILE_H = 240, 280
FLAT_Y0, FLAT_Y1 = 69, 210
HEX_VERTICES = [(120, 0), (240, 70), (240, 210), (120, 280), (0, 210), (0, 70)]
SEASONS = ("spring", "summer", "autumn", "winter")

# ---------------------------------------------------------------------------
# Palette saisonnière (cibles de recoloration)
# ---------------------------------------------------------------------------
SNOW = "#eef2f6"
SNOW_SHADOW = "#c9d6e2"
COLORS = {
    "grass": {"spring": "#77c96a", "summer": "#4f9e4a", "autumn": "#c9a45a", "winter": SNOW},
    "foliage": {"spring": "#5fae4f", "summer": "#3f8a3d", "autumn": ("#d9823a", "#b5532a"), "winter": "#dfe8ef"},
    "field": {"spring": "#a8743f", "summer": "#a9c24a", "autumn": "#d8a33c", "winter": SNOW},
    "reed": {"spring": "#9db04a", "summer": "#a5a63f", "autumn": "#c29d45", "winter": "#d3d9d2"},
    "dry": "#cdbb6a",
    "water": "#5aa7d6", "water_edge": "#4a90bd",
    "ice": "#dbe9f4", "ice_edge": "#c5d8ea",
    "fruit": {"summer": ("#e8553d", "#d9463a"), "autumn": ("#f0a03a", "#e8553d")},
    "stone_winter": "#e3eaf0", "dirt_winter": "#e6ebf0",
    "heath_ground": {"spring": "#a9b26a", "summer": "#b0a45a", "autumn": "#b58c55", "winter": SNOW},
    "heather": {"spring": "#b98ccc", "summer": "#a67bb8", "autumn": "#8f6a9e", "winter": "#d9d0e2"},
    "crop": {"spring": "#8fca5c", "summer": "#a9c24a", "autumn": "#e2b44b", "winter": "#e8edf1"},
    "blossom": "#f2d3de",
}


# ===========================================================================
# Outils couleur (HSV vectorisé, recoloration contrôlée)
# ===========================================================================
def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgb_to_hsv(rgb):
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.max(rgb, axis=-1)
    mn = np.min(rgb, axis=-1)
    d = mx - mn
    s = np.where(mx > 0, d / np.maximum(mx, 1e-9), 0.0)
    h = np.zeros_like(mx)
    nz = d > 1e-9
    rc = np.where(nz, (mx - r) / np.maximum(d, 1e-9), 0)
    gc = np.where(nz, (mx - g) / np.maximum(d, 1e-9), 0)
    bc = np.where(nz, (mx - b) / np.maximum(d, 1e-9), 0)
    h = np.where(mx == r, bc - gc, np.where(mx == g, 2.0 + rc - bc, 4.0 + gc - rc))
    h = np.where(nz, (h / 6.0) % 1.0, 0.0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    i = np.floor(h * 6.0)
    f = h * 6.0 - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    i = i.astype(int) % 6
    r = np.choose(i, [v, q, p, p, t, v])
    g = np.choose(i, [t, v, v, q, p, p])
    b = np.choose(i, [p, p, t, v, v, q])
    return np.stack([r, g, b], axis=-1)


def color_hsv(hexcolor):
    rgb = np.array(hex2rgb(hexcolor), dtype=np.float32) / 255.0
    h, s, v = rgb_to_hsv(rgb[None, :])
    return float(h[0]), float(s[0]), float(v[0])


def mask_select(kind, h, s, v):
    if kind == "green":       # herbe, feuillages Kenney (teinte ≈ 145°)
        return (h > 0.20) & (h < 0.47) & (s > 0.25)
    if kind == "brownfield":  # champ beige / brun (teinte 25–50°)
        return (h > 0.05) & (h < 0.16) & (s > 0.25)
    if kind == "all":
        return np.ones_like(h, dtype=bool)
    if kind == "light":       # faces claires peu saturées (sommets des rochers)
        return (v > 0.74) & (s < 0.15)
    raise ValueError(kind)


def recolor(im, target, mask="green", shade=1.0, shadow_sat=0.0, sat_mix=0.85, hue=None):
    """Recolore les pixels sélectionnés en conservant l'ombrage.

    Travaille en HSV : la teinte est remplacée par celle de `target` (ou `hue`),
    la saturation est mélangée (sat_mix) vers celle de la cible, la valeur est
    recentrée sur celle de la cible en conservant l'écart à la moyenne × `shade`.
    `shadow_sat` ajoute de la saturation aux pixels plus sombres que la moyenne
    (ombres bleutées de la neige).
    """
    arr = np.asarray(im.convert("RGBA"), dtype=np.float32) / 255.0
    h, s, v = rgb_to_hsv(arr[..., :3])
    a = arr[..., 3]
    m = mask_select(mask, h, s, v) & (a > 0.02)
    if not m.any():
        return im.copy()
    th, ts, tv = color_hsv(target)
    if hue is not None:
        th = color_hsv(hue)[0]
    vmean = float(np.average(v[m], weights=a[m]))
    dv = v - vmean
    h2 = np.where(m, th, h)
    s2 = np.where(m, np.clip(s * (1 - sat_mix) + ts * sat_mix + np.maximum(0, -dv) * shadow_sat, 0, 1), s)
    v2 = np.where(m, np.clip(tv + dv * shade, 0, 1), v)
    out = arr.copy()
    out[..., :3] = hsv_to_rgb(h2, s2, v2)
    return Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8), "RGBA")


def snowify(im, target=SNOW, mask="green", shade=0.6):
    """Recoloration hivernale : blanc neige, ombres bleutées (#c9d6e2)."""
    return recolor(im, target, mask=mask, shade=shade, shadow_sat=0.9, sat_mix=1.0, hue=SNOW_SHADOW)


def blend_toward(im, target, amount, mask="all"):
    """Mélange linéaire des pixels masqués vers une couleur (sol enneigé léger)."""
    arr = np.asarray(im.convert("RGBA"), dtype=np.float32) / 255.0
    h, s, v = rgb_to_hsv(arr[..., :3])
    m = mask_select(mask, h, s, v) & (arr[..., 3] > 0.02)
    t = np.array(hex2rgb(target), dtype=np.float32) / 255.0
    out = arr.copy()
    out[..., :3] = np.where(m[..., None], arr[..., :3] * (1 - amount) + t * amount, arr[..., :3])
    return Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8), "RGBA")


def tint(im, color, alpha=1.0):
    """Multiplie une silhouette blanche/grise par une couleur (feuilles, pétales, flocons)."""
    arr = np.asarray(im.convert("RGBA"), dtype=np.float32) / 255.0
    t = np.array(hex2rgb(color), dtype=np.float32) / 255.0
    out = arr.copy()
    out[..., :3] = arr[..., :3] * t
    out[..., 3] = arr[..., 3] * alpha
    return Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8), "RGBA")


def silhouette(im, color="#ffffff"):
    """Silhouette unie (icône) à partir de l'alpha d'un sprite."""
    a = im.convert("RGBA").split()[3]
    out = Image.new("RGBA", im.size, hex2rgb(color) + (0,))
    out.putalpha(a)
    return out


def fit(im, box):
    """Redimensionne (Lanczos) pour tenir dans box=(w, h) en conservant le ratio."""
    r = min(box[0] / im.width, box[1] / im.height)
    return im.resize((max(1, round(im.width * r)), max(1, round(im.height * r))), Image.LANCZOS)


# ===========================================================================
# Chargement des sprites sources
# ===========================================================================
class Sources:
    """Accès aux sprites : Hexagon Pack en 2× (cache SVG ou Lanczos), autres packs natifs."""

    def __init__(self, src_root):
        self.src = src_root
        self.hp_png = src_root / HP / "PNG"
        self.tiles2x = CACHE / "hex2x_tiles"
        self.objs2x = CACHE / "hex2x_objects"
        self.methods = {}   # nom de sprite Hexagon Pack → "svg2x" | "lanczos"
        self.cache = {}

    def prepare(self, rebuild=False):
        """Rasterise les SVG (Chromium) et extrait les sprites 2× si le cache manque."""
        svg_dir = CACHE / "svg"
        svg_dir.mkdir(parents=True, exist_ok=True)
        vec = self.src / HP / "Vector"
        jobs = [("hexagonVector_tiles.svg", "tiles"), ("hexagonVector_objects.svg", "objects")]
        for svg, stem in jobs:
            for k in (1, SCALE):
                out = svg_dir / f"{stem}_{k}x.png"
                if rebuild or not out.exists():
                    print(f"rasterisation {svg} ×{k} → {out}")
                    subprocess.run(["node", str(ROOT / "tools" / "rasterize_svg.js"), str(vec / svg), str(out), str(k)],
                                   check=True)
        if rebuild or not (self.tiles2x / "_index.json").exists():
            pngs = {}
            for sub in ("Terrain", "Medieval"):
                for p in sorted((self.hp_png / "Tiles" / sub).rglob("*.png")):
                    pngs[p.stem] = p
            res, missing = extract(svg_dir / "tiles_1x.png", svg_dir / f"tiles_{SCALE}x.png", SCALE, pngs, self.tiles2x)
            (self.tiles2x / "_index.json").write_text(json.dumps({"matched": res, "missing": missing}, indent=1))
        if rebuild or not (self.objs2x / "_index.json").exists():
            pngs = {p.stem: p for p in sorted((self.hp_png / "Objects").glob("*.png"))}
            res, missing = extract(svg_dir / "objects_1x.png", svg_dir / f"objects_{SCALE}x.png", SCALE, pngs, self.objs2x)
            (self.objs2x / "_index.json").write_text(json.dumps({"matched": res, "missing": missing}, indent=1))

    def hp(self, name):
        """Sprite du Hexagon Pack en 2× (tuile de terrain, tuile médiévale ou objet)."""
        if name in self.cache:
            return self.cache[name]
        for d in (self.tiles2x, self.objs2x):
            p = d / f"{name}.png"
            if p.exists():
                im = Image.open(p).convert("RGBA")
                self.methods[name] = "svg2x"
                self.cache[name] = im
                return im
        # repli : Lanczos ×2 du PNG du pack
        cands = list((self.hp_png / "Tiles").rglob(f"{name}.png")) + list((self.hp_png / "Objects").glob(f"{name}.png"))
        if not cands:
            raise FileNotFoundError(f"Sprite Hexagon Pack introuvable : {name}")
        im = Image.open(cands[0]).convert("RGBA")
        im = im.resize((im.width * SCALE, im.height * SCALE), Image.LANCZOS)
        self.methods[name] = "lanczos"
        self.cache[name] = im
        return im

    def hp_original(self, name):
        cands = list((self.hp_png / "Tiles").rglob(f"{name}.png")) + list((self.hp_png / "Objects").glob(f"{name}.png"))
        return "PNG/" + str(cands[0].relative_to(self.hp_png)) if cands else name

    def ht(self, name, scale):
        """Détail des Hexagon Tiles (65×89) agrandi en Lanczos."""
        im = Image.open(self.src / HT / "Tiles" / f"{name}.png").convert("RGBA")
        return im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)

    def path(self, pack, rel):
        return self.src / pack / rel


# ===========================================================================
# Composition des tuiles
# ===========================================================================
# Un calque : sprite Hexagon Pack (« obj:nom »), détail Hexagon Tiles (« ht:nom:échelle »)
# ou dessin (« draw:puddle », « draw:fruits »), ancré par son pied (bas-centre) en
# coordonnées 1× de la tuile (120×140). `kind` pilote la recoloration saisonnière :
#   foliage  arbres/haies (feuillage recoloré, troncs conservés, deux tons en automne)
#   field    champ (brun frais / vert-jaune / doré / neige)
#   reed     roseaux (jaune-vert)
#   rock     rochers (neige sur les faces claires en hiver)
#   static   inchangé (maisons, clôtures, puits, tentes…)
#   flower   fleurs (uniquement aux saisons listées)
def L(sprite, x, y, kind="static", seasons=None, mirror=False, scale=1.0, order=None, **extra):
    return dict(sprite=sprite, x=x, y=y, kind=kind, seasons=seasons, mirror=mirror, scale=scale, order=order, **extra)


def T(family, base, layers=(), base_kind="grass", base_mirror=False, base_rot=0, note=""):
    return dict(family=family, base=base, layers=list(layers), base_kind=base_kind,
                base_mirror=base_mirror, base_rot=base_rot, note=note)


PINE, PINE_S, ROUND, ROUND_S = "obj:treePine_large", "obj:treePine_small", "obj:treeRound_large", "obj:treeRound_small"
FLOWERS_SPRING = [L("ht:flowerWhite:2.8", 34, 92, "flower", ("spring",)), L("ht:flowerYellow:2.8", 90, 60, "flower", ("spring",)),
                  L("ht:flowerWhite:2.8", 72, 112, "flower", ("spring",))]
FLOWERS_SUMMER = [L("ht:flowerYellow:2.8", 34, 92, "flower", ("summer",)), L("ht:flowerRed:2.8", 90, 60, "flower", ("summer",))]

TILES = {
    # --- prairies : grass_05 est la seule tuile d'herbe unie du pack (01-04 sont incrustées d'autres terrains)
    "meadow_1": T("meadow", "grass_05", [L("ht:bushGrass:2.4", 84, 100, "reed"), L("ht:bushGrass:2.2", 36, 66, "reed", mirror=True)], note="Herbe unie (grass_05) + deux touffes."),
    "meadow_2": T("meadow", "grass_05", FLOWERS_SPRING + FLOWERS_SUMMER, base_mirror=True,
                  note="Herbe unie en miroir + fleurs (Hexagon Tiles ×2.8) au printemps et en été."),
    "meadow_3": T("meadow", "grass_05", [L("obj:rockGrey_small3", 84, 96, "rock"), L("ht:bushGrass:2.6", 32, 74, "reed")],
                  base_rot=180, note="Herbe unie tournée de 180° + petit rocher + touffe (Hexagon Tiles ×2.6)."),
    # --- forêts : trois densités (5, 7 et 9 arbres)
    "forest_1": T("forest", "grass_05", [L(PINE, 44, 72, "foliage"), L(ROUND_S, 78, 66, "foliage"), L(PINE_S, 30, 104, "foliage"),
                                         L(PINE_S, 62, 98, "foliage"), L(ROUND_S, 92, 104, "foliage")], note="Forêt clairsemée : 5 arbres (2 pins, 2 pins nains, 1 feuillu)."),
    "forest_2": T("forest", "grass_05", [L(PINE, 36, 68, "foliage"), L(ROUND, 70, 58, "foliage"), L(PINE_S, 96, 88, "foliage"),
                                         L(ROUND_S, 50, 100, "foliage"), L(PINE, 82, 108, "foliage"), L(PINE_S, 26, 96, "foliage"),
                                         L(ROUND_S, 64, 118, "foliage")], note="Forêt moyenne : 7 arbres."),
    "forest_3": T("forest", "grass_05", [L(PINE, 30, 74, "foliage"), L(ROUND, 58, 54, "foliage"), L(PINE, 88, 72, "foliage"),
                                         L(ROUND_S, 44, 102, "foliage"), L(PINE_S, 76, 106, "foliage"), L(PINE_S, 62, 86, "foliage"),
                                         L(ROUND_S, 100, 96, "foliage"), L(PINE_S, 24, 100, "foliage"), L(ROUND_S, 60, 122, "foliage")], note="Forêt dense : 9 arbres."),
    # --- vergers : deux rangs de feuillus + clôture / haie, fruits en été et en automne
    "orchard_1": T("orchard", "grass_05", [L(ROUND_S, 34, 66, "foliage", fruits=True), L(ROUND_S, 60, 60, "foliage", fruits=True), L(ROUND_S, 86, 66, "foliage", fruits=True),
                                           L(ROUND_S, 46, 92, "foliage", fruits=True), L(ROUND_S, 74, 92, "foliage", fruits=True),
                                           L("obj:fence", 34, 112), L("obj:fence", 86, 112)],
                  note="Verger : 5 treeRound_small en deux rangs + 2 clôtures ; fruits dessinés en été/automne."),
    "orchard_2": T("orchard", "grass_05", [L(ROUND_S, 38, 62, "foliage", fruits=True), L(ROUND_S, 82, 62, "foliage", fruits=True),
                                           L(ROUND_S, 30, 90, "foliage", fruits=True), L(ROUND_S, 60, 84, "foliage", fruits=True), L(ROUND_S, 90, 90, "foliage", fruits=True),
                                           L(ROUND_S, 60, 110, "foliage", fruits=True), L("obj:hedge", 60, 126, "foliage", scale=0.45)],
                  note="Verger : 6 treeRound_small + haie (hedge ×0.45) ; fruits dessinés en été/automne."),
    # --- champs : parcelles en quinconce + foin + clôture
    "field_1": T("field", "dirt_06", [L("ht:bushGrass:1.9", x, y, "crop") for (x, y) in
                                      [(34, 68), (52, 68), (70, 68), (88, 68), (26, 84), (44, 84), (62, 84), (80, 84), (98, 84), (34, 100), (52, 100), (70, 100), (88, 100), (44, 116), (62, 116), (80, 116)]]
                 + [L("obj:hay", 96, 110)], base_kind="dirt", note="Champ : terre nue + rangs de culture (touffes recolorées par saison) + botte de foin."),
    "field_2": T("field", "dirt_06", [L("ht:bushGrass:1.9", x, y, "crop") for (x, y) in
                                      [(44, 66), (62, 66), (80, 66), (34, 82), (52, 82), (70, 82), (88, 82), (26, 98), (44, 98), (62, 98), (80, 98), (98, 98), (52, 114), (70, 114)]]
                 + [L("obj:hay", 30, 116), L("obj:fence", 96, 118)], base_kind="dirt", base_mirror=True, note="Champ : terre nue en miroir + rangs de culture + foin + clôture."),
    # --- hameaux (bâtiments inchangés par la saison)
    "hamlet_1": T("hamlet", "grass_05", [L("obj:house", 62, 100), L("obj:house_small", 38, 80), L("obj:well", 98, 80), L("obj:fence", 92, 114)],
                  note="Grande maison (house) + maisonnette + puits + clôture."),
    "hamlet_2": T("hamlet", "grass_05", [L("obj:house_small", 40, 82), L("obj:tinyBuilding", 104, 72), L("obj:farm", 72, 108),
                                         L("obj:hay", 28, 108), L("obj:fence", 104, 116)], note="Maisonnette + remise + ferme + foin + clôture."),
    "hamlet_3": T("hamlet", "grass_05", [L("obj:villa", 64, 94), L("obj:tinyBuilding", 26, 80), L("obj:house_small", 96, 108, scale=0.85),
                                         L("obj:logPile", 34, 108), L("obj:fence", 100, 68)],
                  note="Villa + remise + maisonnette + tas de bûches + clôture."),
    # --- eau (base hexagonale pleine, vagues Hexagon Tiles ×3.7) — identique aux 4 saisons
    "water_1": T("water", "water", [L("ht:waveWater:3.7", 40, 60, "wave"), L("ht:waveWater:3.7", 78, 90, "wave"),
                                    L("ht:waveWater:3.7", 50, 116, "wave")], base_kind="water",
                note="Hexagone plein #5aa7d6 (ombre de bord #4a90bd) + 3 vagues."),
    "water_2": T("water", "water", [L("ht:waveWater:3.7", 72, 56, "wave"), L("ht:waveWater:3.7", 36, 96, "wave", mirror=True)],
                 base_kind="water", note="Hexagone plein #5aa7d6 + 2 vagues."),
    # --- marais : terre + flaques + roseaux (+ fleurs au printemps, flaques gelées en hiver)
    "marsh_1": T("marsh", "dirt_06", [L("draw:puddle", 44, 70, "puddle", rx=18, ry=10), L("draw:puddle", 82, 94, "puddle", rx=14, ry=8),
                                      L("draw:puddle", 72, 50, "puddle", rx=9, ry=5), L("ht:bushGrass:3", 28, 100, "reed"),
                                      L("ht:bushGrass:3", 96, 72, "reed"), L("ht:bushGrass:3", 62, 116, "reed"),
                                      L("ht:flowerWhite:2.8", 60, 90, "flower", ("spring",)), L("ht:flowerYellow:2.8", 30, 62, "flower", ("spring",))],
                 base_kind="dirt", note="Terre (dirt_06) + 3 flaques + 3 roseaux (bushGrass ×3) ; fleurs au printemps ; flaques gelées en hiver."),
    "marsh_2": T("marsh", "dirt_06", [L("draw:puddle", 76, 74, "puddle", rx=20, ry=11), L("draw:puddle", 40, 98, "puddle", rx=12, ry=7),
                                      L("ht:bushGrass:3", 92, 102, "reed"), L("ht:bushGrass:3", 34, 68, "reed"), L("ht:bushGrass:3", 56, 118, "reed", mirror=True),
                                      L("ht:flowerYellow:2.8", 58, 56, "flower", ("spring",)), L("ht:flowerWhite:2.8", 86, 112, "flower", ("spring",))],
                 base_kind="dirt", base_mirror=True, note="Terre en miroir + 2 flaques + 3 roseaux ; fleurs au printemps."),
    # --- roches : pierre + rochers gris (neige sur les sommets en hiver)
    "rock_1": T("rock", "stone_07", [L("obj:rockGrey_large", 60, 108, "rock"), L("obj:rockGrey_small1", 26, 92, "rock"), L("obj:rockGrey_small4", 96, 80, "rock"),
                                     L("obj:rockGrey_small2", 92, 116, "rock")], base_kind="stone", note="Grand rocher + trois petits."),
    "rock_2": T("rock", "stone_07", [L("obj:rockGrey_medium1", 42, 82, "rock"), L("obj:rockGrey_medium3", 82, 102, "rock"),
                                     L("obj:rockGrey_small3", 32, 108, "rock")], base_kind="stone", note="Deux rochers moyens + un petit."),
    "rock_3": T("rock", "stone_07", [L("obj:rockGrey_small1", 36, 70, "rock"), L("obj:rockGrey_small2", 78, 62, "rock"),
                                     L("obj:rockGrey_small3", 56, 100, "rock"), L("obj:rockGrey_medium2", 88, 106, "rock")],
                base_kind="stone", base_mirror=True, note="Éboulis : trois petits rochers + un moyen."),
    # --- sable (pas de saison)
    "sand_1": T("sand", "sand_07", base_kind="sand", note="Sable uni (sand_07)."),
    "sand_2": T("sand", "sand_07", [L("obj:rockBrown_small", 84, 98, "rock")], base_kind="sand", base_mirror=True, base_rot=180,
                note="Sable uni tourné + petit rocher brun."),
    # --- tuiles rares
    "mill": T("rare", "grass_05", [L("obj:windmill_complete", 60, 90), L("obj:hay", 26, 104), L("obj:fence", 96, 104)],
              note="Moulin (windmill_complete) + foin + clôture."),
    "chapel": T("rare", "grass_05", [L("obj:church", 60, 100), L("obj:tombstone1", 20, 96), L(PINE_S, 102, 72, "foliage")],
                note="Chapelle (church) + stèle + pin."),
    "watchtower": T("rare", "grass_05", [L("obj:tower", 60, 106), L("obj:rockGrey_small1", 24, 96, "rock"), L(PINE_S, 96, 72, "foliage")],
                    note="Tour de guet (tower) + rocher + pin."),
    "well": T("rare", "grass_05", [L("obj:well", 60, 82), L("obj:fence", 30, 100), L("obj:fence", 90, 100)] + FLOWERS_SPRING + FLOWERS_SUMMER,
              note="Puits + 2 clôtures + fleurs (printemps, été)."),
    "camp": T("rare", "grass_05", [L("obj:campingTent", 44, 86), L("obj:fire", 82, 92), L("obj:log", 84, 110), L(PINE_S, 30, 108, "foliage")],
              note="Campement : tente + feu (fire, Lanczos) + bûche + pin."),
    "ruins": T("rare", "stone_07", [L("obj:towerRuin", 48, 80, "rock"), L("obj:ruinsCorner", 82, 106, "rock"), L("obj:ruins_brick1", 26, 104, "rock")],
               base_kind="stone", note="Ruines (towerRuin + ruinsCorner + brique) sur pierre."),
    # --- collines (dès l'île 7) : hillGrass des Hexagon Tiles, recolorée comme l'herbe
    "hill_1": T("hill", "grass_17", [L(ROUND_S, 40, 72, "foliage"), L(PINE_S, 84, 66, "foliage"), L("ht:bushGrass:2.2", 62, 92, "reed")],
                note="Colline : tuile surélevée grass_17 (plateau et talus) recolorée par saison + feuillu, pin nain et touffe."),
    "hill_2": T("hill", "grass_17", [L(PINE_S, 34, 76, "foliage"), L("obj:rockGrey_small3", 88, 74, "rock"), L(ROUND_S, 66, 88, "foliage"), L("ht:bushGrass:2.2", 96, 96, "reed")],
                base_mirror=True, note="Colline en miroir + pin nain, feuillu, petit rocher et touffe."),
    # --- landes (dès l'île 9) : sol ocre + bruyère (bushGrass recolorées en violet)
    "heath_1": T("heath", "grass_05", [L("ht:bushGrass:2.5", 36, 82, "heather"), L("ht:bushGrass:2.5", 78, 70, "heather"), L("ht:bushGrass:2.5", 60, 108, "heather"),
                                       L("ht:bushGrass:2.3", 94, 104, "heather"), L("obj:rockGrey_small3", 28, 106, "rock")],
                 base_kind="heath", note="Lande : sol ocre (grass_05 recolorée) + quatre touffes de bruyère + petit rocher."),
    "heath_2": T("heath", "grass_05", [L("ht:bushGrass:2.5", 44, 72, "heather"), L("ht:bushGrass:2.5", 88, 84, "heather"), L("ht:bushGrass:2.5", 52, 110, "heather"),
                                       L(PINE_S, 96, 116, "foliage"), L("obj:rockGrey_small4", 24, 96, "rock")],
                 base_kind="heath", base_mirror=True, note="Lande en miroir : trois touffes de bruyère + pin nain + rocher."),
    # --- rares tardives
    "granary": T("rare", "grass_05", [L("obj:silo1", 60, 96), L("obj:hay", 26, 104), L("obj:hay", 94, 108), L("obj:fence", 92, 70)],
                 note="Grenier (silo1) + foin + clôture."),
    "fountain": T("rare", "grass_05", [L("obj:fountain", 60, 94), L("obj:fence", 26, 100), L("obj:fence", 94, 100)] + FLOWERS_SPRING + FLOWERS_SUMMER,
                  note="Fontaine + clôtures + fleurs au printemps et en été."),
    # --- tuiles d'événement (dès l'île 5) et rares tardives (dès l'île 8)
    "market": T("rare", "grass_05", [L("obj:shop", 60, 98), L("obj:hay", 22, 104), L("obj:banner", 98, 74)], note="Marché : échoppe + foin + bannière."),
    "fete": T("rare", "grass_05", [L("obj:banner", 38, 96), L("obj:banner", 82, 96), L("obj:log", 60, 112), L("obj:hay", 60, 74)] + FLOWERS_SPRING + FLOWERS_SUMMER,
              note="Fête : deux bannières, un tronc pour s'asseoir, du foin, des fleurs."),
    "restore": T("rare", "grass_05", [L("obj:ruinsCorner", 62, 100, "rock"), L("obj:ruins_brick1", 28, 104, "rock"), L("obj:ruins_brick1", 94, 84, "rock")],
                 note="Ruine à restaurer : pans de mur sur l'herbe (devient la famille majoritaire autour d'elle)."),
    "tavern": T("rare", "grass_05", [L("obj:tavern", 60, 98), L("obj:fence", 98, 110), L("obj:logPile", 22, 104)], note="Auberge + clôture + bûches."),
    "trough": T("rare", "grass_05", [L("obj:horseTrough", 60, 94), L("obj:fence", 26, 104), L("obj:fence", 94, 104)] + FLOWERS_SPRING, note="Abreuvoir + clôtures + fleurs au printemps."),
    "archway": T("rare", "grass_05", [L("obj:archway", 60, 100), L("obj:wall_small", 24, 104), L("obj:wall_small", 96, 104)], note="Porche + murets."),
    "mine": T("rare", "stone_07", [L("obj:mine", 60, 98), L("obj:rockGrey_small1", 24, 100, "rock"), L("obj:log", 96, 108)], base_kind="stone", note="Mine sur pierre + rocher + bûche."),
    "oven": T("rare", "grass_05", [L("obj:oven", 60, 96), L("obj:hay", 94, 106), L("obj:logPile", 26, 100)], note="Four à pain + foin + bûches."),
    "dry_meadow": T("rare", "grass_05", [L("ht:bushGrass:2.6", 36, 96, "dry"), L("ht:bushGrass:2.6", 88, 66, "dry")], base_kind="dry",
                    note="Prairie sèche d'été (herbe paille #cdbb6a), identique aux 4 saisons."),
}


class Composer:
    def __init__(self, src: Sources):
        self.src = src
        base = src.hp("grass_05")
        if base.size != (TILE_W, TILE_H):
            raise RuntimeError(f"grass_05 2× fait {base.size}, attendu {(TILE_W, TILE_H)}")
        self.hex_alpha = base.split()[3]
        self.hex_mask = np.asarray(self.hex_alpha) > 8
        self.inside = np.asarray(self.hex_alpha.filter(ImageFilter.MaxFilter(3))) > 8
        self.errors = []
        self.water_base = self.make_water_base(COLORS["water"], COLORS["water_edge"])
        self.ice_base = self.make_water_base(COLORS["ice"], COLORS["ice_edge"])

    # --- bases
    def make_water_base(self, fill, edge):
        """Hexagone plein (alpha de grass_05) avec un liseré intérieur plus sombre de 5 px."""
        im = Image.new("RGBA", (TILE_W, TILE_H), hex2rgb(edge) + (255,))
        inner = self.hex_alpha.filter(ImageFilter.MinFilter(11))
        fill_im = Image.new("RGBA", (TILE_W, TILE_H), hex2rgb(fill) + (255,))
        im.paste(fill_im, (0, 0), inner)
        im.putalpha(self.hex_alpha)
        return im

    def base_for(self, spec, season):
        kind = spec["base_kind"]
        if kind == "water":
            im = self.water_base.copy()
        else:
            im = self.src.hp(spec["base"]).copy()
        if spec["base_mirror"] or spec["base_rot"]:
            # miroir / rotation : on recompose sur la base d'origine pour garder exactement le même alpha de bord
            t = im
            if spec["base_mirror"]:
                t = t.transpose(Image.FLIP_LEFT_RIGHT)
            if spec["base_rot"]:
                t = t.rotate(spec["base_rot"], expand=False)
            im.alpha_composite(t)
        # même hexagone pour toutes les tuiles : l'alpha de bord est aligné sur celui de grass_05 (référence)
        im.putalpha(ImageChops.lighter(im.split()[3], self.hex_alpha))
        if kind == "grass":
            im = snowify(im) if season == "winter" else recolor(im, COLORS["grass"][season])
        elif kind == "dry":
            im = recolor(im, COLORS["dry"])
        elif kind == "heath":
            im = snowify(im) if season == "winter" else recolor(im, COLORS["heath_ground"][season])
        elif kind == "stone" and season == "winter":
            im = blend_toward(im, COLORS["stone_winter"], 0.45)
        elif kind == "dirt" and season == "winter":
            im = blend_toward(im, COLORS["dirt_winter"], 0.55)
        return im

    # --- calques
    def layer_image(self, layer, season, index):
        sp = layer["sprite"]
        kind = layer["kind"]
        if sp.startswith("draw:"):
            return None
        if sp.startswith("obj:"):
            im = self.src.hp(sp[4:])
        elif sp.startswith("ht:"):
            _, name, sc = sp.split(":")
            im = self.src.ht(name, float(sc))
        else:
            raise ValueError(sp)
        if layer["scale"] != 1.0:
            im = im.resize((max(1, round(im.width * layer["scale"])), max(1, round(im.height * layer["scale"]))), Image.LANCZOS)
        if layer["mirror"]:
            im = im.transpose(Image.FLIP_LEFT_RIGHT)
        if kind == "foliage":
            if season == "winter":
                im = snowify(im, COLORS["foliage"]["winter"])
            elif season == "autumn":
                im = recolor(im, COLORS["foliage"]["autumn"][index % 2])
            else:
                im = recolor(im, COLORS["foliage"][season])
            if layer.get("fruits") and season in COLORS["fruit"]:
                im = self.draw_fruits(im, COLORS["fruit"][season], index)
        elif kind == "field":
            im = snowify(im, mask="brownfield") if season == "winter" else recolor(im, COLORS["field"][season], mask="brownfield")
        elif kind == "reed":
            im = recolor(im, COLORS["reed"][season], mask="all", shade=1.0)
        elif kind == "heather":
            im = recolor(im, COLORS["heather"][season], mask="all", shade=1.0)
        elif kind == "crop":
            im = recolor(im, COLORS["crop"][season], mask="all", shade=1.0)
        elif kind == "blossom":
            im = recolor(im, COLORS["blossom"])
        elif kind == "hill":
            im = snowify(im) if season == "winter" else recolor(im, COLORS["grass"][season])
        elif kind == "dry":
            im = recolor(im, COLORS["dry"], mask="all")
        elif kind == "rock" and season == "winter":
            im = blend_toward(im, "#f4f8fb", 0.85, mask="light")
        elif kind == "wave":
            im = tint(silhouette(im, "#ffffff"), "#ffffff", 0.8)
        return im

    @staticmethod
    def draw_fruits(im, colors, index):
        im = im.copy()
        d = ImageDraw.Draw(im)
        w = im.width
        pts = [(w * 0.32, im.height * 0.25), (w * 0.68, im.height * 0.38), (w * 0.45, im.height * 0.5)]
        for i, (x, y) in enumerate(pts):
            c = hex2rgb(colors[(i + index) % 2])
            r = 3
            d.ellipse((x - r, y - r, x + r, y + r), fill=c + (255,), outline=tuple(max(0, v - 50) for v in c) + (255,))
        return im

    def draw_puddle(self, canvas, layer, season):
        """Flaque (ellipse eau + liseré) dessinée sur un calque puis composée (l'alpha de la base est préservé)."""
        cx, cy = layer["x"] * SCALE, layer["y"] * SCALE
        rx, ry = layer["rx"] * SCALE, layer["ry"] * SCALE
        fill, edge = (COLORS["ice"], COLORS["ice_edge"]) if season == "winter" else (COLORS["water"], COLORS["water_edge"])
        lay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=hex2rgb(edge) + (255,))
        d.ellipse((cx - rx + 2, cy - ry + 1, cx + rx - 2, cy + ry - 3), fill=hex2rgb(fill) + (255,))
        if season == "winter":  # fines fissures
            d.line((cx - rx * 0.6, cy - ry * 0.2, cx - rx * 0.1, cy + ry * 0.1, cx + rx * 0.5, cy - ry * 0.4), fill=(255, 255, 255, 200), width=2)
            d.line((cx - rx * 0.1, cy + ry * 0.1, cx + rx * 0.2, cy + ry * 0.55), fill=(255, 255, 255, 170), width=2)
        canvas.alpha_composite(lay)

    def compose(self, key, spec, season):
        canvas = self.base_for(spec, season)
        layers = [l for l in spec["layers"] if not l["seasons"] or season in l["seasons"]]
        # ordre du peintre : les dessins au sol d'abord, puis par pied (y) croissant
        layers.sort(key=lambda l: (-1 if l["sprite"].startswith("draw:") else 0, l["y"], l["x"]))
        for i, layer in enumerate(layers):
            if layer["sprite"] == "draw:puddle":
                self.draw_puddle(canvas, layer, season)
                continue
            im = self.layer_image(layer, season, i)
            x = layer["x"] * SCALE - im.width // 2
            y = layer["y"] * SCALE - im.height
            # vérification : rien ne dépasse de l'hexagone
            probe = Image.new("L", (TILE_W, TILE_H), 0)
            probe.paste(im.split()[3], (x, y))
            outside = (np.asarray(probe) > 60) & ~self.inside
            if outside.any():
                ys, xs = np.nonzero(outside)
                self.errors.append(f"{key}/{season}: le calque {layer['sprite']} ({layer['x']},{layer['y']}) dépasse de l'hexagone "
                                   f"({int(outside.sum())} px, x={int(xs.min())}..{int(xs.max())} y={int(ys.min())}..{int(ys.max())})")
            canvas.alpha_composite(im, (x, y))
        return canvas

    # --- aides
    def hex_helpers(self):
        mask = Image.new("RGBA", (TILE_W, TILE_H), (255, 255, 255, 0))
        mask.putalpha(self.hex_alpha)
        eroded = self.hex_alpha.filter(ImageFilter.MinFilter(13))  # 6 px
        outline = Image.new("RGBA", (TILE_W, TILE_H), (255, 255, 255, 0))
        outline.putalpha(ImageChops.subtract(self.hex_alpha, eroded))
        shadow_a = self.hex_alpha.filter(ImageFilter.MinFilter(17)).filter(ImageFilter.GaussianBlur(6))
        shadow = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
        shadow.putalpha(shadow_a)
        frozen = self.ice_base.copy()
        cracks = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
        d = ImageDraw.Draw(cracks)
        for pts in [((52, 96), (96, 128), (118, 176), (150, 196)), ((150, 196), (188, 172)), ((96, 128), (74, 160)),
                    ((166, 78), (186, 112), (172, 140)), ((60, 220), (98, 236), (130, 232))]:
            d.line(pts, fill=(255, 255, 255, 190), width=2)
        frozen.alpha_composite(cracks)
        return mask, outline, shadow, frozen


# ===========================================================================
# Icônes dessinées (absentes des packs Kenney) : soleil, vent
# ===========================================================================
def draw_sun(size=100):
    s = 4
    im = Image.new("RGBA", (size * s, size * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    c = size * s / 2
    r = 21 * s
    d.ellipse((c - r, c - r, c + r, c + r), fill=(255, 255, 255, 255))
    for k in range(8):
        a = k * np.pi / 4
        x0, y0 = c + np.cos(a) * 30 * s, c + np.sin(a) * 30 * s
        x1, y1 = c + np.cos(a) * 46 * s, c + np.sin(a) * 46 * s
        d.line((x0, y0, x1, y1), fill=(255, 255, 255, 255), width=9 * s)
        for (x, y) in ((x0, y0), (x1, y1)):
            d.ellipse((x - 4.5 * s, y - 4.5 * s, x + 4.5 * s, y + 4.5 * s), fill=(255, 255, 255, 255))
    return im.resize((size, size), Image.LANCZOS)


def draw_wind(size=100):
    s = 4
    im = Image.new("RGBA", (size * s, size * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    w = 9 * s
    white = (255, 255, 255, 255)
    for (x0, x1, y, r, up) in ((8, 62, 30, 11, True), (4, 82, 52, 13, False), (14, 56, 76, 10, True)):
        d.line((x0 * s, y * s, x1 * s, y * s), fill=white, width=w)
        d.ellipse((x0 * s - w / 2, y * s - w / 2, x0 * s + w / 2, y * s + w / 2), fill=white)
        cy = y - r if up else y + r
        box = ((x1 - r) * s, (cy - r) * s, (x1 + r) * s, (cy + r) * s)
        # PIL : angles horaires depuis 3 h ; boucle vers le haut = gauche→haut→droite→bas, vers le bas = haut→droite→bas→gauche
        if up:
            d.arc(box, 180, 90, fill=white, width=w)
        else:
            d.arc(box, 270, 180, fill=white, width=w)
        d.ellipse(((x1 - r) * s - w / 2, cy * s - w / 2, (x1 - r) * s + w / 2, cy * s + w / 2), fill=white)
    return im.resize((size, size), Image.LANCZOS)


# ===========================================================================
# Construction
# ===========================================================================
class Builder:
    def __init__(self, src_root, repo, sheets=False):
        self.src = Sources(src_root)
        self.repo = repo
        self.img_root = repo / "assets" / "img"
        self.manifest = {}
        self.per_pack = {pid: set() for pid in PACKS}
        self.sheets = sheets
        self.tiles_by_season = {s: [] for s in SEASONS}

    def emit(self, key, folder, im, pack, original, note, **extra):
        if key in self.manifest:
            raise RuntimeError(f"Clé dupliquée : {key}")
        if im.mode != "RGBA":
            im = im.convert("RGBA")
        bb = im.split()[3].getbbox()
        if bb is None:
            raise RuntimeError(f"{key}: image entièrement transparente")
        out_dir = self.img_root / folder
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{key}.png"
        im.save(out_path, "PNG", optimize=True)
        with Image.open(out_path) as chk:
            chk.verify()
        with Image.open(out_path) as chk:
            w, h = chk.size
        size = out_path.stat().st_size
        if size > 2 * 1024 * 1024:
            raise RuntimeError(f"{out_path} dépasse 2 Mo ({size} octets)")
        rel = f"{folder}/{key}.png"
        entry = {"file": rel, "w": w, "h": h, "bytes": size, "source": pack, "original": original, "note": note}
        entry.update({k: v for k, v in extra.items() if v is not None})
        self.manifest[key] = entry
        packs = pack if isinstance(pack, (list, tuple)) else [pack]
        for p in packs:
            if p != "generated":
                self.per_pack[p].add(rel)
        return entry

    # --- A. tuiles
    def build_tiles(self):
        comp = Composer(self.src)
        hex_mask_np = comp.hex_mask
        for key, spec in TILES.items():
            for season in SEASONS:
                im = comp.compose(key, spec, season)
                if im.size != (TILE_W, TILE_H):
                    raise RuntimeError(f"{key}_{season}: taille {im.size}")
                a = np.asarray(im.split()[3])
                if ((a > 40) & ~comp.inside).any() or ((a < 200) & (hex_mask_np & (np.asarray(comp.hex_alpha) > 200))).any():
                    raise RuntimeError(f"{key}_{season}: hexagone de base non aligné / troué")
                originals = sorted({self.src.hp_original(spec["base"]) if spec["base_kind"] != "water" else "grass_05 (alpha)"} |
                                   {self.src.hp_original(l["sprite"][4:]) for l in spec["layers"] if l["sprite"].startswith("obj:")} |
                                   {"hexagontiles/Tiles/" + l["sprite"].split(":")[1] + ".png" for l in spec["layers"] if l["sprite"].startswith("ht:")})
                methods = sorted({self.src.methods.get(n) for n in [spec["base"]] + [l["sprite"][4:] for l in spec["layers"] if l["sprite"].startswith("obj:")]
                                  if n in self.src.methods})
                packs = [HP] + ([HT] if any(l["sprite"].startswith("ht:") for l in spec["layers"]) else [])
                note = spec["note"] + (" Sprites 2× rasterisés depuis les SVG du Hexagon Pack (Chromium)."
                                       if "svg2x" in methods else "")
                if "lanczos" in methods:
                    lz = [n for n in [l["sprite"][4:] for l in spec["layers"] if l["sprite"].startswith("obj:")] if self.src.methods.get(n) == "lanczos"]
                    note += f" Agrandissement Lanczos ×2 (non apparié dans le SVG) : {', '.join(lz)}."
                e = self.emit(f"{key}_{season}", "tiles", im, packs if len(packs) > 1 else packs[0], " + ".join(originals), note,
                              season=season, family=spec["family"], tile=key, method="+".join(methods) or "composed")
                self.tiles_by_season[season].append(self.img_root / e["file"])
        if comp.errors:
            raise RuntimeError("Calques hors de l'hexagone :\n  " + "\n  ".join(sorted(set(comp.errors))))
        mask, outline, shadow, frozen = comp.hex_helpers()
        self.emit("water_frozen", "tiles", frozen, HP, "grass_05 (alpha)", "Eau gelée (hiver) : hexagone #dbe9f4, liseré #c5d8ea, fissures blanches.", family="water")
        self.emit("hex_mask", "tiles", mask, HP, "grass_05 (alpha)", "Hexagone plein blanc, mêmes sommets que les tuiles (surbrillances, à teinter).")
        self.emit("hex_outline", "tiles", outline, HP, "grass_05 (alpha)", "Contour blanc de 6 px de l'hexagone, fond transparent (à teinter).")
        self.emit("hex_shadow", "tiles", shadow, HP, "grass_05 (alpha)", "Ombre portée : hexagone noir rétréci de 8 px et flouté (rayon 6), même canevas 240×280.")
        for i, (name, mirror) in enumerate((("waveWater", False), ("waveLava", False), ("waveWater", True)), 1):
            im = self.src.ht(name, 3.7)
            if mirror:
                im = im.transpose(Image.FLIP_LEFT_RIGHT)
            im = tint(silhouette(im, "#ffffff"), "#ffffff", 0.85)
            self.emit(f"sea_wave_{i}", "tiles", im, HT, f"Tiles/{name}.png", "Vague blanche translucide pour la mer (Hexagon Tiles ×3.7" + (", miroir" if mirror else "") + ").")

    # --- A bis. décor composé par région : sols par type de terrain et objets par saison (ancrés en bas au centre)
    def build_deco(self):
        comp = Composer(self.src)
        GROUNDS = {"grass": ("grass_05", "grass"), "water": ("grass_05", "water"), "dirt": ("dirt_06", "dirt"), "stone": ("stone_07", "stone"),
                   "sand": ("sand_07", "sand"), "hill": ("grass_17", "grass"), "heath": ("grass_05", "heath")}
        for kind, (base, bk) in GROUNDS.items():
            for season in SEASONS:
                im = comp.base_for(T(kind, base, [], base_kind=bk), season)
                arr = np.asarray(im)[120:170, 95:145, :3].reshape(-1, 3).mean(0)
                col = "#%02x%02x%02x" % tuple(int(v) for v in arr)
                self.emit(f"ground_{kind}_{season}", "tiles", im, HP, self.src.hp_original(base), f"Sol « {kind} » ({season}) pour le décor composé par région.",
                          ground=kind, season=season, ground_color=col)
        # sol de champ : terre nue (dirt_06) ; les rangs de culture sont des objets posés par région (obj_crop_*)
        for season in SEASONS:
            base = comp.base_for(T("field", "dirt_06", [], base_kind="dirt"), season)
            arr = np.asarray(base)[120:170, 95:145, :3].reshape(-1, 3).mean(0)
            self.emit(f"ground_field_{season}", "tiles", base, HP, self.src.hp_original("dirt_06"), f"Sol de champ ({season}) : terre nue, les rangs de culture sont ajoutés par région.",
                      ground="field", season=season, ground_color="#%02x%02x%02x" % tuple(int(v) for v in arr))
        im = comp.base_for(T("dry", "grass_05", [], base_kind="dry"), "summer")
        arr = np.asarray(im)[120:170, 95:145, :3].reshape(-1, 3).mean(0)
        self.emit("ground_dry", "tiles", im, HP, self.src.hp_original("grass_05"), "Sol de prairie sèche (été).", ground="dry", ground_color="#%02x%02x%02x" % tuple(int(v) for v in arr))
        def obj(keyname, layer, season, note, pack=HP, original=None):
            im = comp.layer_image(layer, season, 0)
            bb = im.split()[3].getbbox()
            if bb:
                im = im.crop((bb[0], 0, bb[2], im.height))
            self.emit(keyname, "deco", im, pack, original or (self.src.hp_original(layer["sprite"][4:]) if layer["sprite"].startswith("obj:") else "Tiles/" + layer["sprite"].split(":")[1] + ".png"),
                      note, anchor="bottom")
        for name in ("treePine_large", "treePine_small", "treeRound_large", "treeRound_small"):
            for season in SEASONS:
                obj(f"obj_{name}_{season}", L(f"obj:{name}", 0, 0, "foliage"), season, f"{name} recoloré ({season}).")
        for season in SEASONS:
            obj(f"obj_treeRound_fruit_{season}", L(ROUND_S, 0, 0, "foliage", fruits=True), season, f"Fruitier ({season}) : feuillu + fruits dessinés en été et en automne.")
            obj(f"obj_hedge_{season}", L("obj:hedge", 0, 0, "foliage", scale=0.45), season, f"Haie ×0.45 ({season}).")
            obj(f"obj_bushGrass_{season}", L("ht:bushGrass:2.4", 0, 0, "reed"), season, f"Touffe d'herbe / roseau ({season}).", pack=HT)
            obj(f"obj_heather_{season}", L("ht:bushGrass:2.4", 0, 0, "heather"), season, f"Bruyère ({season}).", pack=HT)
            obj(f"obj_crop_{season}", L("ht:bushGrass:" + {"spring": "1.5", "summer": "2.0", "autumn": "2.1", "winter": "1.3"}[season], 0, 0, "crop"), season, f"Rang de culture ({season}) : touffe recolorée (pousses, blé vert, blé mûr, chaume sous la neige).", pack=HT)
            for name in ("farmland", "farmland_empty"):
                obj(f"obj_{name}_{season}", L(f"obj:{name}", 0, 0, "field"), season, f"Parcelle {name} ({season}).")
        obj("obj_bushGrass_dry", L("ht:bushGrass:2.4", 0, 0, "dry"), "summer", "Touffe sèche.", pack=HT)
        # objets saisonniers : fleurs de printemps sur les arbres, tas de feuilles, congères, mousse, fleurs bleues, nénuphars, paniers
        obj("obj_treeRound_blossom", L(ROUND_S, 0, 0, "blossom"), "spring", "Feuillu en fleurs (feuillage recoloré rose pâle) : forêts et vergers au printemps.")
        obj("obj_treeRound_blossom_large", L(ROUND, 0, 0, "blossom"), "spring", "Grand feuillu en fleurs (printemps).")
        obj("obj_leafpile", L("ht:bushAutumn:2.2", 0, 0), "autumn", "Tas de feuilles mortes (bushAutumn ×2.2) : forêts et vergers en automne.", pack=HT)
        obj("obj_snowdrift", L("ht:bushSnow:2.4", 0, 0), "winter", "Congère (bushSnow ×2.4) : hiver et bourrasque.", pack=HT)
        obj("obj_moss", L("ht:rockStone_moss1:1.6", 0, 0), "spring", "Petit rocher moussu (rockStone_moss1 ×1.6) : roches au printemps.", pack=HT)
        obj("obj_flowerBlue", L("ht:flowerBlue:2.8", 0, 0), "spring", "Fleur bleue (Hexagon Tiles ×2.8).", pack=HT)
        obj("obj_lily", L("ht:flowerGreen:2.0", 0, 0), "summer", "Nénuphar (flowerGreen ×2.0) : lacs et étangs en été.", pack=HT)
        obj("obj_basket", L("obj:box1", 0, 0), "autumn", "Caisse de récolte (box1) : vergers en automne, cueillette.")
        for name in ("rockGrey_large", "rockGrey_medium1", "rockGrey_medium2", "rockGrey_medium3", "rockGrey_small1", "rockGrey_small2", "rockGrey_small3", "rockGrey_small4", "rockBrown_small"):
            obj(f"obj_{name}", L(f"obj:{name}", 0, 0, "rock"), "summer", f"Rocher {name}.")
            obj(f"obj_{name}_winter", L(f"obj:{name}", 0, 0, "rock"), "winter", f"Rocher {name} enneigé.")
        for name in ("house", "house_small", "villa", "tinyBuilding", "farm", "well", "fence", "hay", "logPile", "log", "fountain", "silo1", "campingTent", "fire",
                     "windmill_complete", "church", "tower", "tombstone1", "towerRuin", "ruinsCorner", "ruins_brick1", "wall_small", "wall", "lightpost", "tavern",
                     "oven", "archway", "horseTrough", "mine", "banner", "shop"):
            obj(f"obj_{name}", L(f"obj:{name}", 0, 0), "summer", f"Objet {name} (Hexagon Pack).")
        for name in ("flowerWhite", "flowerYellow", "flowerRed"):
            obj(f"obj_{name}", L(f"ht:{name}:2.8", 0, 0), "summer", f"Fleur {name} (Hexagon Tiles ×2.8).", pack=HT)
        for season, k in (("summer", "obj_puddle"), ("winter", "obj_puddle_winter")):
            lay = Image.new("RGBA", (80, 50), (0, 0, 0, 0))
            comp.draw_puddle(lay, {"x": 20, "y": 12, "rx": 16, "ry": 9}, season)
            self.emit(k, "deco", lay, HP, "grass_05 (alpha)", "Flaque d'eau" + (" gelée" if season == "winter" else "") + " (ellipse dessinée, liseré sombre).", anchor="bottom")

    # --- B. faune
    def build_fauna(self):
        animals = {"rabbit": "lapin", "moose": "élan", "frog": "grenouille", "duck": "canard", "bear": "ours", "owl": "hibou",
                   "penguin": "manchot", "chick": "poussin (bonus)", "horse": "cheval", "goat": "chèvre", "chicken": "poule", "cow": "vache"}
        for name, fr in animals.items():
            im = Image.open(self.src.path(AN, f"PNG/Round/{name}.png")).convert("RGBA")
            bb = im.split()[3].getbbox()
            im = im.crop(bb)
            self.emit(f"fauna_{name}", "fauna", im, AN, f"PNG/Round/{name}.png", f"{fr.capitalize()} — tête ronde, taille native (dossier Round).")

    # --- C. effets
    def build_fx(self):
        pad = "PNG (Transparent)"
        groups = [("smoke", 10, "Fumée blanche douce (512 px), à teinter"), ("circle", 5, "Anneau / disque (ondes de fermeture, halos)"),
                  ("spark", 7, "Étincelle"), ("star", 9, "Étoile / scintillement"), ("light", 3, "Halo lumineux"),
                  ("twirl", 3, "Tourbillon (vent, remous)"), ("magic", 5, "Symbole lumineux (vœux, fragments)")]
        for stem, n, note in groups:
            for i in range(1, n + 1):
                im = Image.open(self.src.path(PA, f"{pad}/{stem}_{i:02d}.png"))
                self.emit(f"{stem}_{i:02d}", "fx", im, PA, f"{pad}/{stem}_{i:02d}.png", note)
        im = Image.open(self.src.path(PA, f"{pad}/flare_01.png"))
        self.emit("flare_01", "fx", im, PA, f"{pad}/flare_01.png", "Éclat horizontal (soleil d'été)")
        for i in (0, 2, 4, 6):
            im = Image.open(self.src.path(SM, f"PNG/Flash/flash{i:02d}.png"))
            self.emit(f"flash_{i:02d}", "fx", im, SM, f"PNG/Flash/flash{i:02d}.png", "Flash lumineux (transition de saison, grosse prime)")
        # feuilles, pétales, flocons, goutte : silhouettes du Foliage Sprites teintées
        def fol(n, color, box, alpha=1.0, flip=False):
            im = Image.open(self.src.path(FO, f"PNG/Shaded/sprite_{n:04d}.png")).convert("RGBA")
            im = im.crop(im.split()[3].getbbox())
            if flip:
                im = im.transpose(Image.FLIP_TOP_BOTTOM)
            return tint(fit(im, box), color, alpha), f"PNG/Shaded/sprite_{n:04d}.png"
        for i, (n, color) in enumerate(((83, "#d9823a"), (86, "#b5532a"), (88, "#e0a33a")), 1):
            im, orig = fol(n, color, (64, 64))
            self.emit(f"leaf_{i}", "fx", im, FO, orig, f"Feuille d'automne teintée {color} (silhouette Foliage Sprites, ≈64 px)")
        for i, (n, color) in enumerate(((80, "#f6c5d4"), (81, "#fff4f7")), 1):
            im, orig = fol(n, color, (40, 40))
            self.emit(f"petal_{i}", "fx", im, FO, orig, f"Pétale de printemps teinté {color} (≈40 px)")
        for i, n in enumerate((96, 99), 1):
            im, orig = fol(n, "#ffffff", (48, 48))
            self.emit(f"snowflake_{i}", "fx", im, FO, orig, "Flocon blanc (silhouette radiale Foliage Sprites, 48 px)")
        im, orig = fol(81, "#7fb8d8", (28, 40), 0.9)
        self.emit("drop", "fx", im, FO, orig, "Goutte d'eau (pluie, crue) teintée #7fb8d8")

    # --- D. UI
    def build_ui(self):
        icons = [
            ("icon_gear", GI, "gear", "Engrenage (options)"), ("icon_audio_on", GI, "audioOn", "Son activé"),
            ("icon_audio_off", GI, "audioOff", "Son coupé"), ("icon_music_on", GI, "musicOn", "Musique activée"),
            ("icon_music_off", GI, "musicOff", "Musique coupée"), ("icon_pause", GI, "pause", "Pause"),
            ("icon_play", GI, "right", "Lecture (triangle « right »)"), ("icon_return", GI, "return", "Retour (flèche courbe)"),
            ("icon_undo", GI, "return", "Souvenir : annuler la dernière pose (même glyphe que icon_return)"),
            ("icon_home", GI, "home", "Accueil / hameau"), ("icon_star", GI, "star", "Étoile (récompense)"),
            ("icon_question", GI, "question", "Aide"), ("icon_info", GI, "information", "Information"),
            ("icon_cross", GI, "cross", "Croix (fermer)"), ("icon_check", GI, "checkmark", "Coche"),
            ("icon_arrow_left", GI, "arrowLeft", "Flèche gauche"), ("icon_arrow_right", GI, "arrowRight", "Flèche droite"),
            ("icon_arrow_up", GI, "arrowUp", "Flèche haut"), ("icon_arrow_down", GI, "arrowDown", "Flèche bas"),
            ("icon_trophy", GI, "trophy", "Trophée"), ("icon_medal", GI, "medal1", "Médaille"),
            ("icon_leaderboard", GI, "leaderboardsSimple", "Classement"), ("icon_locked", GI, "locked", "Cadenas fermé"),
            ("icon_unlocked", GI, "unlocked", "Cadenas ouvert"), ("icon_fullscreen", GI, "larger", "Plein écran"),
            ("icon_fullscreen_exit", GI, "smaller", "Quitter le plein écran"), ("icon_exit", GI, "exit", "Quitter"),
            ("icon_wrench", GI, "wrench", "Clé (atelier)"), ("icon_target", GI, "target", "Cible (vœux)"),
            ("icon_warning", GI, "warning", "Avertissement"), ("icon_exclamation", GI, "exclamation", "Point d'exclamation"),
            ("icon_next", GI, "next", "Suivant"), ("icon_previous", GI, "previous", "Précédent"),
            ("icon_plus", GI, "plus", "Plus"), ("icon_minus", GI, "minus", "Moins"), ("icon_save", GI, "save", "Sauvegarde"),
            ("icon_power", GI, "power", "Marche / arrêt"), ("icon_stop", GI, "stop", "Stop"),
            ("icon_contrast", GI, "contrast", "Contraste"), ("icon_menu", GI, "barsHorizontal", "Menu (trois barres)"),
            ("icon_trash", GI, "trashcan", "Défausser (poubelle)"), ("icon_pocket", GI, "shoppingBasket", "Poche (panier)"),
            ("icon_swap", GI, "scrollHorizontal", "Échanger (deux triangles opposés « scrollHorizontal »)"),
            ("icon_flag", GIE, "flag", "Drapeau"), ("icon_key", GIE, "key", "Clé (fragments)"),
            ("icon_diamond", GIE, "diamond", "Diamant"), ("icon_cloud", GIE, "cloud", "Nuage (météo)"),
            ("icon_coin", GIE, "coin", "Pièce (souffles)"),
        ]
        for key, pack, f, note in icons:
            im = Image.open(self.src.path(pack, f"PNG/White/2x/{f}.png"))
            self.emit(key, "ui", im, pack, f"PNG/White/2x/{f}.png", note + " — blanc, 100 px")
        # icônes absentes de Game Icons : silhouettes Foliage Sprites / Hexagon Pack, ou dessin
        def icon_from(im, key, pack, orig, note):
            im = fit(silhouette(im.crop(im.split()[3].getbbox())), (100, 100))
            canvas = Image.new("RGBA", (100, 100), (255, 255, 255, 0))
            canvas.alpha_composite(im, ((100 - im.width) // 2, (100 - im.height) // 2))
            self.emit(key, "ui", canvas, pack, orig, note + " — blanc, 100 px")
        fo = lambda n: Image.open(self.src.path(FO, f"PNG/Shaded/sprite_{n:04d}.png")).convert("RGBA")
        icon_from(fo(83), "icon_leaf", FO, "PNG/Shaded/sprite_0083.png", "Feuille (saison : automne / vœux nature) — silhouette Foliage Sprites")
        icon_from(fo(97), "icon_snow", FO, "PNG/Shaded/sprite_0097.png", "Flocon (hiver) — silhouette radiale Foliage Sprites")
        icon_from(fo(81), "icon_drop", FO, "PNG/Shaded/sprite_0081.png", "Goutte (eau, printemps) — silhouette Foliage Sprites")
        icon_from(self.src.hp("treePine_large"), "icon_tree", HP, "PNG/Objects/treePine_large.png", "Arbre (forêt) — silhouette du pin du Hexagon Pack")
        self.emit("icon_sun", "ui", draw_sun(), "generated", "dessin (tools/build_images.py)", "Soleil (été) — dessiné : disque + 8 rayons, blanc, 100 px")
        self.emit("icon_wind", "ui", draw_wind(), "generated", "dessin (tools/build_images.py)", "Vent (souffles) — dessiné : trois traits bouclés, blanc, 100 px")
        # décor d'UI : objets du Hexagon Pack en 2×
        for name, note in (("banner", "Bannière rouge"), ("sign", "Panneau bleu"), ("log", "Bûche"), ("hay", "Botte de foin"), ("fence", "Clôture")):
            im = self.src.hp(name)
            self.emit(name, "ui", im, HP, self.src.hp_original(name), note + f" (Hexagon Pack, 2× {self.src.methods[name]})")
        for key, f, note in [("panel_grey", "grey_panel", "Panneau 9-slice gris (bords 10 px)"),
                             ("button_grey_normal", "grey_button02", "Bouton gris, état normal"),
                             ("button_grey_pressed", "grey_button03", "Bouton gris, état pressé"),
                             ("slider_track", "grey_sliderHorizontal", "Piste de curseur horizontale"),
                             ("slider_handle", "grey_circle", "Poignée ronde de curseur"), ("slider_end", "grey_sliderEnd", "Bout de piste"),
                             ("checkbox_on", "grey_boxCheckmark", "Case cochée"), ("checkbox_off", "grey_box", "Case vide")]:
            im = Image.open(self.src.path(UI, f"PNG/{f}.png"))
            self.emit(key, "ui", im, UI, f"PNG/{f}.png", note)

    # --- planches-contact (contrôle visuel)
    def contact_sheets(self):
        out_dir = CACHE / "sheets"
        out_dir.mkdir(parents=True, exist_ok=True)
        for season, files in self.tiles_by_season.items():
            cols = 8
            cw, ch = TILE_W + 10, TILE_H + 26
            rows = (len(files) + cols - 1) // cols
            sheet = Image.new("RGBA", (cols * cw, rows * ch), (244, 239, 230, 255))
            d = ImageDraw.Draw(sheet)
            for i, f in enumerate(files):
                im = Image.open(f).convert("RGBA")
                x, y = (i % cols) * cw + 5, (i // cols) * ch + 4
                sheet.alpha_composite(im, (x, y))
                d.text((x + 4, y + TILE_H + 4), f.stem, fill=(43, 42, 38, 255))
            sheet.save(out_dir / f"tiles_{season}.png")
        print("planches-contact :", out_dir)

    # --- sorties
    def finish(self):
        produced = {self.img_root / v["file"] for v in self.manifest.values()}
        for p in self.img_root.rglob("*"):
            if p.is_file() and p not in produced and p.name != "manifest.json":
                p.unlink()
        for p in sorted(self.img_root.rglob("*"), reverse=True):
            if p.is_dir() and not any(p.iterdir()):
                p.rmdir()
        manifest_doc = {
            "generated": _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat(),
            "generator": "tools/build_images.py",
            "conventions": {
                "hex": {"w": TILE_W, "h": TILE_H, "flatEdgeY0": FLAT_Y0, "flatEdgeY1": FLAT_Y1, "vertices": HEX_VERTICES,
                        "anchor": "coin supérieur gauche du canevas ; centre de l'hexagone en (120, 140)",
                        "scale": SCALE, "native": "Hexagon Pack 120×140 (bords plats y=34..105), rasterisé ×2 depuis les SVG",
                        "grid": "sommet en haut ; voisins horizontaux à 240 px, lignes espacées de 210 px avec décalage d'une demi-tuile (120 px)"},
                "seasons": list(SEASONS),
                "tiles": "tiles/<famille>_<n>_<saison>.png, toutes 240×280 avec le même hexagone de base (vérifié par alpha) ; "
                         "eau, sable et prairie sèche sont identiques aux 4 saisons ; water_frozen, hex_mask, hex_outline, hex_shadow et sea_wave_* sans saison.",
                "method": "svg2x = rasterisation Chromium des SVG du pack (tools/rasterize_svg.js + tools/upscale_from_svg.py) ; "
                          "lanczos = agrandissement ×2 du PNG ; composed = base + calques + recoloration HSV (tools/build_images.py).",
                "missing": {
                    "fire / canFire (Hexagon Pack)": "non appariés dans le rendu SVG (dégradés différents) → Lanczos ×2",
                    "grass_01..04": "incrustées d'autres terrains : les prairies utilisent grass_05 (seule herbe unie), en miroir / tournée",
                    "icon_sun, icon_wind": "absents de Game Icons → dessinés (PIL)",
                    "icon_leaf, icon_snow, icon_drop, icon_tree": "absents de Game Icons → silhouettes Foliage Sprites / pin du Hexagon Pack",
                    "icon_swap": "pas de glyphe « échanger » → scrollHorizontal (deux triangles opposés)",
                    "icon_water, icon_bag": "alias non produits : utiliser icon_drop et icon_pocket",
                    "pétales, feuilles, flocons": "le Particle Pack n'en contient pas → silhouettes Foliage Sprites teintées",
                },
            },
            "images": self.manifest,
        }
        (self.img_root / "manifest.json").write_text(json.dumps(manifest_doc, ensure_ascii=False, indent=1), encoding="utf-8")
        credits = []
        for pid, meta in PACKS.items():
            credits.append({
                "pack": meta["pack"], "author": "Kenney (kenney.nl)", "license": "CC0 1.0", "licenseUrl": CC0_URL,
                "url": meta["url"], "mirror": MIRROR, "mirrorPath": pid,
                "licenseFile": f"{MIRROR}/blob/main/{meta['license_text_path']}",
                "files": sorted(self.per_pack[pid]),
            })
        fonts_credits_path = self.repo / "assets" / "credits" / "fonts.json"
        if fonts_credits_path.exists():
            credits.extend(json.loads(fonts_credits_path.read_text(encoding="utf-8")))
        cred_dir = self.repo / "assets" / "credits"
        cred_dir.mkdir(parents=True, exist_ok=True)
        (cred_dir / "images.json").write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")
        by_folder = {}
        for v in self.manifest.values():
            f = v["file"].split("/")[0]
            by_folder.setdefault(f, [0, 0])
            by_folder[f][0] += 1
            by_folder[f][1] += v["bytes"]
        total = sum(v["bytes"] for v in self.manifest.values())
        for f, (n, b) in sorted(by_folder.items()):
            print(f"{f:8s} {n:4d} images  {b / 1024:8.1f} Ko")
        print(f"TOTAL    {len(self.manifest):4d} images  {total / 1024:8.1f} Ko")
        print("manifest :", self.img_root / "manifest.json")
        print("crédits  :", cred_dir / "images.json")


def check_licenses(src_root):
    for pid, meta in PACKS.items():
        p = src_root / pid / meta["license_file"]
        txt = p.read_text(encoding="utf-8", errors="replace")
        if "creativecommons.org/publicdomain/zero/1.0" not in txt:
            raise RuntimeError(f"Licence CC0 introuvable dans {p}")
        meta["license_text_path"] = str(p.relative_to(src_root))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.environ.get("KENNEY_ROOT", "/home/user/etdofresh/kenney.nl"))
    ap.add_argument("--out", default=str(ROOT))
    ap.add_argument("--rebuild-cache", action="store_true", help="re-rasterise les SVG et ré-extrait les sprites 2×")
    ap.add_argument("--sheets", action="store_true", help="écrit des planches-contact par saison dans tools/cache/sheets/")
    args = ap.parse_args()
    src_root, repo = Path(args.src), Path(args.out)
    check_licenses(src_root)
    b = Builder(src_root, repo, sheets=args.sheets)
    b.src.prepare(rebuild=args.rebuild_cache)
    b.build_tiles()
    b.build_deco()
    b.build_fauna()
    b.build_fx()
    b.build_ui()
    if args.sheets:
        b.contact_sheets()
    b.finish()


if __name__ == "__main__":
    main()
