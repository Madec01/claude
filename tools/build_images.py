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
import re
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
    "kenney_natureKit_2.1": dict(pack="Nature Kit", url="https://kenney.nl/assets/nature-kit", license_file="License.txt"),
    "kenney_piratepack": dict(pack="Pirate Pack", url="https://kenney.nl/assets/pirate-pack", license_file="License.txt"),
}
# Pack 3D KayKit (CC0 également) : les modèles sont rendus en PNG isométriques par
# tools/render_kaykit.js, à la projection exacte de nos tuiles (30°, 120 px/unité).
KAYKIT = dict(pack="KayKit : Medieval Hexagon Pack (1.0)", author="Kay Lousberg",
              url="https://kaylousberg.itch.io/kaykit-medieval-hexagon",
              mirror="https://github.com/KayKit-Game-Assets/KayKit-Medieval-Hexagon-Pack-1.0",
              license_file="LICENSE.txt")

# Alias de modèle → chemin sous Assets/gltf/ du pack. Le rouge est la couleur d'équipe
# dont les toits sont les plus proches de notre terre cuite.
# Étirement vertical des dalles plates, une fois rendues à la verticale (KAY_VIEWS). Nos tuiles sont des
# hexagones réguliers de 240 × 280 (rapport 1,167) ; l'hexagone KayKit vu de dessus donne 1,115. Le reste
# de l'écart se rattrape ici — c'est peu, et invisible sur une texture de sol.
FLAT_STRETCH = 1.047

FOREST = dict(pack="KayKit : Forest Nature Pack (1.0)", author="Kay Lousberg",
              url="https://kaylousberg.itch.io/forest-nature-pack",
              mirror="fourni par le commanditaire (téléchargement direct)",
              license_file="License.txt")

# Pack EXTRA du Hexagon Pack, fourni par le commanditaire. Il reprend les 221 modèles du pack de base (à deux
# près — un moulin bleu et un pont — que nous n'employons pas) et en ajoute 183. On le garde comme troisième
# racine, préfixe « extra/ », plutôt que d'y basculer : aucun modèle déjà en place ne change sans qu'on le veuille.
EXTRA = dict(pack="KayKit : Medieval Hexagon Pack EXTRA (1.0)", author="Kay Lousberg",
             url="https://kaylousberg.itch.io/kaykit-medieval-hexagon",
             mirror="fourni par le commanditaire (téléchargement direct)",
             license_file="License.txt")

KAY_MODELS = {
    # --- pack Forest : les feuillus existent en huit palettes, dont les couleurs de saison ;
    # on ne les recolore donc pas, on prend directement la bonne. L'hiver est un arbre nu.
    # Trois silhouettes par rôle, chacune dans sa propre nuance : une forêt de clones n'est pas une
    # forêt. Le décor en tire une au hasard de la case, et la mélange encore par la taille et le miroir.
    "feuillu_spring": "forest/Color3/Tree_5_C_Color3",
    "feuillu_summer": "forest/Color1/Tree_5_C_Color1",
    "feuillu_autumn": "forest/Color7/Tree_5_C_Color7",
    "feuillu_winter": "forest/Color2/Tree_Bare_1_C_Color2",
    "feuillu_fleurs": "forest/Color8/Tree_5_C_Color8",
    "feuillu2_spring": "forest/Color1/Tree_5_B_Color1",
    "feuillu2_summer": "forest/Color2/Tree_5_B_Color2",
    "feuillu2_autumn": "forest/Color7/Tree_5_B_Color7",
    "feuillu2_winter": "forest/Color2/Tree_Bare_1_A_Color2",
    "feuillu2_fleurs": "forest/Color8/Tree_5_B_Color8",
    "feuillu3_spring": "forest/Color3/Tree_5_F_Color3",
    "feuillu3_summer": "forest/Color1/Tree_5_F_Color1",
    "feuillu3_autumn": "forest/Color5/Tree_5_F_Color5",
    "feuillu3_winter": "forest/Color1/Tree_Bare_1_B_Color1",
    "feuillu3_fleurs": "forest/Color8/Tree_5_F_Color8",
    "feuillu_petit_spring": "forest/Color3/Tree_5_E_Color3",
    "feuillu_petit_summer": "forest/Color1/Tree_5_E_Color1",
    "feuillu_petit_autumn": "forest/Color7/Tree_5_E_Color7",
    "feuillu_petit_winter": "forest/Color2/Tree_Bare_2_B_Color2",
    "feuillu_petit_fleurs": "forest/Color8/Tree_5_E_Color8",
    "feuillu_petit2_spring": "forest/Color1/Tree_5_D_Color1",
    "feuillu_petit2_summer": "forest/Color2/Tree_5_D_Color2",
    "feuillu_petit2_autumn": "forest/Color6/Tree_5_D_Color6",
    "feuillu_petit2_winter": "forest/Color2/Tree_Bare_2_A_Color2",
    "feuillu_petit2_fleurs": "forest/Color8/Tree_5_D_Color8",
    "feuillu_petit3_spring": "forest/Color3/Tree_2_B_Color3",
    "feuillu_petit3_summer": "forest/Color1/Tree_2_B_Color1",
    "feuillu_petit3_autumn": "forest/Color7/Tree_2_B_Color7",
    "feuillu_petit3_winter": "forest/Color1/Tree_Bare_2_C_Color1",
    "feuillu_petit3_fleurs": "forest/Color8/Tree_2_B_Color8",
    # sapins : une deuxième silhouette, prise dans le pack Forest, pour casser l'alignement
    "sapin2_spring": "forest/Color3/Tree_5_A_Color3",
    "sapin2_summer": "forest/Color2/Tree_5_A_Color2",
    "sapin2_autumn": "forest/Color6/Tree_5_A_Color6",
    "sapin2_winter": "forest/Color4/Tree_5_A_Color4",
    # sous-bois : buissons et touffes, ce qui manque le plus pour que ça respire
    "buisson_spring": "forest/Color3/Bush_3_A_Color3",
    "buisson_summer": "forest/Color1/Bush_3_A_Color1",
    "buisson_autumn": "forest/Color6/Bush_3_A_Color6",
    "buisson_winter": "forest/Color2/Bush_2_A_Color2",
    "buisson2_spring": "forest/Color1/Bush_4_A_Color1",
    "buisson2_summer": "forest/Color2/Bush_4_A_Color2",
    "buisson2_autumn": "forest/Color5/Bush_4_A_Color5",
    "buisson2_winter": "forest/Color2/Bush_1_A_Color2",
    # le pommier du verger : en fleurs au printemps, chargé en été, cuivré en automne, nu en hiver
    "pommier_spring": "forest/Color8/Tree_2_A_Color8",
    "pommier_summer": "forest/Color1/Tree_2_A_Color1",
    "pommier_autumn": "forest/Color7/Tree_2_A_Color7",
    "pommier_winter": "forest/Color2/Tree_Bare_2_B_Color2",
    # --- la roche : les vrais massifs sont dans le pack hexagonal (le pack Forest n'a que des
    # galets lisses, qui ne font pas montagne). Trois massifs de silhouettes différentes, un
    # gros bloc et des cailloux pour l'éboulis.
    "massif_A": "decoration/nature/mountain_C",
    "massif_B": "decoration/nature/mountain_B",
    "massif_C": "decoration/nature/mountain_A",
    "bloc_grand": "forest/Color1/Rock_2_C_Color1",
    # --- herbes hautes du pack Forest. Les variantes « _A » et « _B » sont des brins isolés (mesuré :
    # 37 px de large), illisibles seuls ; seules les « _C » et « _D » sont de vraies touffes. Grass_2 est
    # la graminée fine et haute (le pré), Grass_1 la touffe à feuilles larges (la lande).
    # Contrairement aux feuillus, on ne prend PAS les palettes de saison du pack : ces touffes passent par
    # la recoloration « reed », la même que les roseaux et les touffes déjà en place — sans quoi deux
    # herbes voisines dans un même pré ne parleraient pas la même langue. La couleur de départ est donc
    # sans effet, et une seule entrée suffit par famille.
    "herbe1": "forest/Color1/Grass_2_C_Color1",
    "herbe2": "forest/Color1/Grass_2_D_Color1",
    "touffe": "forest/Color1/Grass_1_C_Color1",
    # --- pack EXTRA : les deux dalles hexagonales. Elles se rendent à la VERTICALE (voir KAY_VIEWS) :
    # nos tuiles sont des hexagones réguliers vus de dessus (240 × 280), pas des dalles en perspective.
    "ble": "extra/buildings/neutral/building_grain",
    "terre": "extra/buildings/neutral/building_dirt",
    # --- trois volumes qui remplacent les derniers sprites plats posés à côté de modèles 3D
    "abreuvoir": "extra/decoration/props/trough_long",
    "sanctuaire": "extra/buildings/green/building_shrine_green",
    "nenuphar": "decoration/nature/waterlily_A",
    # --- la variété qui ne coûte rien : une seconde silhouette de récolte et trois massettes d'eau
    "botte_ronde": "extra/decoration/props/haybale",
    # L'épouvantail posait un sprite plat Kenney qui est en réalité un MARTEAU DE FORGERON couché
    # (36 × 32 unités monde) : c'est lui qu'on voyait en travers des rangs de culture. Aucun des trois
    # packs ne contient d'épouvantail ; le piquet à chiffon en est la silhouette la plus proche, et il
    # est vertical.
    "piquet": "decoration/props/flag_red",
    # --- la tente du campement et l'écurie : deux sprites plats Kenney de moins
    "tente": "extra/buildings/red/building_tent_red",
    "ecurie": "extra/buildings/red/building_stables_red",
    "roseau_A": "decoration/nature/waterplant_A",
    "roseau_B": "decoration/nature/waterplant_B",
    "roseau_C": "decoration/nature/waterplant_C",
    # --- le port : le seul endroit du jeu dont le vocabulaire venait encore d'un autre pack (Nature Kit)
    "ponton": "extra/buildings/red/building_docks_red",
    "barque": "extra/decoration/props/boat",
    "chevalet": "extra/decoration/props/boatrack",
    "ancre": "extra/decoration/props/anchor",
    "navire": "extra/units/neutral/ship",
    "chantier_naval": "extra/buildings/red/building_shipyard_red",
    # --- les deux bâtiments civils, et le chantier
    "mairie": "extra/buildings/red/building_townhall_red",
    "atelier": "extra/buildings/red/building_workshop_red",
    "chantier_A": "buildings/neutral/building_stage_A",
    "chantier_B": "buildings/neutral/building_stage_B",
    "echelle": "decoration/props/ladder",
    "pelle": "extra/units/neutral/shovel",
    "charrette": "extra/units/neutral/cart",
    "charrette_marchand": "extra/units/neutral/cart_merchant",
    "caillou_A": "decoration/nature/rock_single_A",
    "caillou_B": "decoration/nature/rock_single_B",
    "caillou_C": "decoration/nature/rock_single_C",
    # --- collines et monts du pack EXTRA (CC0) : des reliefs en volume, posés sur un sol d'herbe plat,
    # à la place de la tuile surélevée grass_17 (un bloc hexagonal à flancs bruns qui ne se fondait pas)
    "colline_A": "extra/decoration/nature/hill_single_A",
    "colline_B": "extra/decoration/nature/hill_single_B",
    "colline_C": "extra/decoration/nature/hill_single_C",
    "collines_A": "extra/decoration/nature/hills_A",
    "collines_B": "extra/decoration/nature/hills_B",
    "collines_C": "extra/decoration/nature/hills_C",
    "collines_B_arbres": "extra/decoration/nature/hills_B_trees",
    "collines_C_arbres": "extra/decoration/nature/hills_C_trees",
    "mont_A_herbe": "extra/decoration/nature/mountain_A_grass",
    "mont_B_herbe": "extra/decoration/nature/mountain_B_grass",
    "mont_C_herbe": "extra/decoration/nature/mountain_C_grass",
    "mont_A": "extra/decoration/nature/mountain_A",     # les mêmes, sans herbe : les sommets des massifs de roche
    "mont_B": "extra/decoration/nature/mountain_B",
    "mont_C": "extra/decoration/nature/mountain_C",
    "caillou_D": "decoration/nature/rock_single_D",
    "caillou_E": "decoration/nature/rock_single_E",
    "bloc_brun": "forest/Color5/Rock_5_C_Color5",
    "home_A": "buildings/red/building_home_A_red",
    "home_A_jaune": "buildings/yellow/building_home_A_yellow",
    "home_A_vert": "buildings/green/building_home_A_green",
    "home_B": "buildings/red/building_home_B_red",
    "home_B_jaune": "buildings/yellow/building_home_B_yellow",
    "home_B_vert": "buildings/green/building_home_B_green",
    "church": "buildings/red/building_church_red",
    "windmill": "buildings/red/building_windmill_red",
    "watermill": "buildings/red/building_watermill_red",
    "market": "buildings/red/building_market_red",
    "tavern": "buildings/red/building_tavern_red",
    "tavern_jaune": "buildings/yellow/building_tavern_yellow",
    "tavern_vert": "buildings/green/building_tavern_green",
    "lumbermill_jaune": "buildings/yellow/building_lumbermill_yellow",
    "lumbermill_vert": "buildings/green/building_lumbermill_green",
    "well": "buildings/red/building_well_red",
    "mine": "buildings/red/building_mine_red",
    "tower": "buildings/red/building_tower_A_red",
    "tower_base": "buildings/red/building_tower_base_red",
    "barracks": "buildings/red/building_barracks_red",
    "blacksmith": "buildings/red/building_blacksmith_red",
    "lumbermill": "buildings/red/building_lumbermill_red",
    "gate": "buildings/neutral/wall_straight_gate",
    "wall": "buildings/neutral/wall_straight",
    "ruin": "buildings/neutral/building_destroyed",
    "scaffolding": "buildings/neutral/building_scaffolding",
    "stage": "buildings/neutral/building_stage_C",
    "mountain_A": "decoration/nature/mountain_A",
    "mountain_B": "decoration/nature/mountain_B",
    "mountain_C": "decoration/nature/mountain_C",
    "rock_A": "decoration/nature/rock_single_A",
    "rock_B": "decoration/nature/rock_single_B",
    "rock_C": "decoration/nature/rock_single_C",
    "rock_D": "decoration/nature/rock_single_D",
    "rock_E": "decoration/nature/rock_single_E",
    "pine_big": "decoration/nature/tree_single_A",
    "pines_large": "decoration/nature/trees_A_large",
    "pines_medium": "decoration/nature/trees_A_medium",
    "pines_small": "decoration/nature/trees_A_small",
    "round_large": "decoration/nature/trees_B_large",
    "round_medium": "decoration/nature/trees_B_medium",
    "round_small": "decoration/nature/trees_B_small",
    "round_big": "decoration/nature/tree_single_B",
    "table": "decoration/props/tent",
    "barrel": "decoration/props/barrel",
    "crate": "decoration/props/crate_A_big",
    "crate_open": "decoration/props/crate_open",
    "sack": "decoration/props/sack",
    "lumber": "decoration/props/resource_lumber",
    "wheelbarrow": "decoration/props/wheelbarrow",
    "bucket": "decoration/props/bucket_water",
    "pallet": "decoration/props/pallet",
    "flag": "decoration/props/flag_red",
    "flag_green": "decoration/props/flag_green",
}

# Animaux 3D : un modèle glTF par espèce, rendu de profil par tools/render_animals.js.
# `clip` = cycle de marche quand le modèle en a un ; `largeur` = largeur voulue du sprite en px 2×
# (la faune est dessinée à la moitié, à l'échelle monde) ; `face` = sens du modèle rendu
# (« droite » ou « gauche »), relevé à l'œil une fois : le jeu retourne l'image pour l'autre sens.
ANIMALS = {
    "rabbit":  dict(model="rabbit",  clip=None,                          frames=1, width=56, face="gauche", fr="lapin"),
    "moose":   dict(model="deer",    clip="Walk",                        frames=8, width=92, face="droite", fr="élan"),
    "frog":    dict(model="frog",    clip="FrogArmature|Frog_Idle",      frames=4, width=42, face="droite", fr="grenouille"),
    "duck":    dict(model="duck",    clip=None,                          frames=1, width=54, face="droite", fr="canard"),
    "bear":    dict(model="bear",    clip=None,                          frames=1, width=88, face="gauche", fr="ours"),
    "owl":     dict(model="owl",     clip=None,                          frames=1, width=52, face="droite", fr="hibou"),
    "penguin": dict(model="penguin", clip=None,                          frames=1, width=54, face="gauche", fr="manchot"),
    "goat":    dict(model="goat",    clip=None,                          frames=1, width=74, face="droite", fr="chèvre"),
    "chicken": dict(model="hen",     clip=None,                          frames=1, width=54, face="gauche", fr="poule"),
    "chick":   dict(model="chick",   clip=None,                          frames=1, width=34, face="gauche", fr="poussin"),
    "horse":   dict(model="horse",   clip="Walk",                        frames=8, width=100, face="droite", fr="cheval"),
    "cow":     dict(model="cow",     clip="Armature|Walk",               frames=8, width=100, face="droite", fr="vache"),
}

# Les bâtiments KayKit sont plus denses que les sprites plats qu'ils remplacent : à largeur égale
# ils écrasent le paysage. Un quart de moins remet l'île au premier plan (décision du commanditaire).
BUILD_SCALE = 0.75
# Et les tuiles rares, dont le bâtiment est le sujet, ne perdent que 15 %.
RARE_SCALE = 0.85

NK = "kenney_natureKit_2.1"
PP = "kenney_piratepack"
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
# Trois silhouettes de flaque : chacune est une union d'ellipses (décalage x, décalage y, largeur,
# hauteur — en fractions du rayon nominal). La première ellipse porte la masse, les autres mordent
# dessus pour casser le cercle.
FLAQUES = (
    ((0, 0, 0.74, 0.80), (0.52, 0.12, 0.48, 0.52), (-0.46, -0.16, 0.42, 0.46), (-0.10, 0.34, 0.50, 0.40)),
    ((-0.08, 0, 0.70, 0.84), (0.55, -0.10, 0.45, 0.44), (0.30, 0.34, 0.44, 0.40), (-0.52, 0.16, 0.40, 0.42)),
    ((0.05, -0.06, 0.78, 0.72), (-0.50, 0.10, 0.44, 0.50), (0.46, 0.26, 0.40, 0.44), (-0.16, 0.36, 0.46, 0.34)),
)

COLORS = {
    "grass": {"spring": "#77c96a", "summer": "#4f9e4a", "autumn": "#c9a45a", "winter": SNOW},
    "foliage": {"spring": "#5fae4f", "summer": "#3f8a3d", "autumn": ("#d9823a", "#b5532a"), "winter": "#dfe8ef"},
    "field": {"spring": "#a8743f", "summer": "#a9c24a", "autumn": "#d8a33c", "winter": SNOW},
    "reed": {"spring": "#9db04a", "summer": "#a5a63f", "autumn": "#c29d45", "winter": "#d3d9d2"},
    "dry": "#cdbb6a",
    # L'eau douce suit la MER, saison par saison — c'est `render.js` qui fait autorité (constantes
    # SEA et CREUX) : le plan d'eau prend la couleur de la mer à mi-écran, le liseré son rapport de
    # lèvre. Ces quatre couples sont la recopie de ce calcul, pour les flaques du marais et pour la
    # carte de la tuile d'eau, que le pipeline cuit une fois pour toutes. Un lac bleu roi à côté
    # d'une mer bleu-gris, c'étaient deux matières ; c'est désormais la même.
    "water": {"spring": "#8ac0dc", "summer": "#77b5d8", "autumn": "#87afc8", "winter": "#a9c1d2"},
    "water_edge": {"spring": "#5a95b7", "summer": "#4e8db3", "autumn": "#5988a6", "winter": "#6f96ae"},
    "ice": "#dbe9f4", "ice_edge": "#c5d8ea",
    "fruit": {"summer": ("#e8553d", "#d9463a"), "autumn": ("#f0a03a", "#e8553d")},
    "stone_winter": "#e3eaf0", "dirt_winter": "#e6ebf0",
    "heath_ground": {"spring": "#a9b26a", "summer": "#b0a45a", "autumn": "#b58c55", "winter": SNOW},
    "heather": {"spring": "#b98ccc", "summer": "#a67bb8", "autumn": "#8f6a9e", "winter": "#d9d0e2"},
    # les rangs de culture se posent désormais sur une dalle de blé, plus sur de la terre nue : il leur faut
    # une nuance un cran plus soutenue que le sol de la saison, sinon ils s'y fondent et les sillons disparaissent
    "crop": {"spring": "#8fca5c", "summer": "#86a637", "autumn": "#c08c26", "winter": "#cfe0ec"},
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
    if kind == "sommet":      # herbe jaune-verte des collines KayKit (teinte ≈ 60°), flancs bruns et roche exclus
        return (h > 0.11) & (h < 0.47) & (s > 0.28)
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

    def __init__(self, src_root, kay_root=None, animals_root=None, forest_root=None, extra_root=None):
        self.src = src_root
        self.kay_root = kay_root
        self.animals_root = animals_root
        self.forest_root = forest_root
        self.extra_root = extra_root
        self.hp_png = src_root / HP / "PNG"
        self.tiles2x = CACHE / "hex2x_tiles"
        self.objs2x = CACHE / "hex2x_objects"
        self.kay2x = CACHE / "kaykit"
        self.methods = {}   # nom de sprite Hexagon Pack → "svg2x" | "lanczos"
        self.cache = {}
        self.kay_cache = {}
        self.kay_used = set()
        self.anim3d = CACHE / "animaux"

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
        self.prepare_kaykit(rebuild)
        self.prepare_animals(rebuild)

    def prepare_animals(self, rebuild=False):
        """Rend les animaux 3D (Chromium + three.js) si le cache manque."""
        self.anim3d.mkdir(parents=True, exist_ok=True)
        need = rebuild or not (self.anim3d / "meta.json").exists()
        if not need:
            meta = json.loads((self.anim3d / "meta.json").read_text(encoding="utf-8"))["species"]
            need = any(sp not in meta for sp in ANIMALS)
        if not need:
            return
        prov = json.loads((self.animals_root / "PROVENANCE.json").read_text(encoding="utf-8"))["models"]
        jobs = {sp: {"file": prov[c["model"]]["file"], "clip": c["clip"], "frames": c["frames"]} for sp, c in ANIMALS.items()}
        path = CACHE / "animaux_jobs.json"
        path.write_text(json.dumps(jobs, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"rendu des {len(jobs)} animaux 3D (Chromium + three.js)…")
        subprocess.run(["node", str(ROOT / "tools" / "render_animals.js"), str(path),
                        "--src", str(self.animals_root), "--out", str(self.anim3d)], check=True)

    def animals_dir(self):
        return self.anim3d

    def prepare_kaykit(self, rebuild=False):
        """Rend les modèles 3D KayKit en PNG isométriques (Chromium + three.js) si le cache manque."""
        self.kay2x.mkdir(parents=True, exist_ok=True)
        todo = rebuild or not (self.kay2x / "meta.json").exists() or any(
            not (self.kay2x / f"{n}.raw.png").exists() for n in KAY_MODELS)
        if not todo and (self.kay2x / "meta.json").exists():
            # une prise de vue modifiée (KAY_VIEWS) ne change pas le nom du fichier : on la compare au cache
            m = json.loads((self.kay2x / "meta.json").read_text(encoding="utf-8"))["models"]
            todo = any((m.get(n) or {}).get("el") != KAY_VIEWS.get(n, {}).get("el")
                       or (m.get(n) or {}).get("az") != KAY_VIEWS.get(n, {}).get("az")
                       or (m.get(n) or {}).get("zoom") != KAY_VIEWS.get(n, {}).get("zoom") for n in KAY_MODELS)
        if not todo:
            return
        jobs = CACHE / "kaykit_models.json"
        spec = {n: (dict(model=p, **KAY_VIEWS[n]) if n in KAY_VIEWS else p) for n, p in KAY_MODELS.items()}
        jobs.write_text(json.dumps(spec, indent=1), encoding="utf-8")
        print(f"rendu des {len(KAY_MODELS)} modèles KayKit (Chromium + three.js)…")
        subprocess.run(["node", str(ROOT / "tools" / "render_kaykit.js"), str(jobs),
                        "--src", str(self.kay_root), "--forest", str(self.forest_root), "--extra", str(self.extra_root), "--out", str(self.kay2x)], check=True)

    def kay_meta(self):
        if not getattr(self, "_kay_meta", None):
            self._kay_meta = json.loads((self.kay2x / "meta.json").read_text(encoding="utf-8"))
        return self._kay_meta

    def kay(self, name, scale=1.0, sy=1.0):
        """Modèle KayKit rendu : (image rognée, origine x, origine y dans l'image).

        L'origine du modèle — le centre de son pied — est au centre du canevas de rendu ;
        après rognage on sait donc exactement par quel point l'ancrer sur la tuile.

        `sy` étire l'image en hauteur seulement. Il ne sert qu'aux pièces **plates** posées au sol :
        nos tuiles sont dessinées à une élévation plus haute (face du dessus : 137 px pour 240 de large)
        que celle des rendus 3D (108 px), écart invisible sur un objet debout mais qui saute aux yeux
        sur une dalle. Voir FLAT_STRETCH.
        """
        k = (name, scale, sy)
        if k in self.kay_cache:
            return self.kay_cache[k]
        if name not in KAY_MODELS:
            raise KeyError(f"Modèle KayKit inconnu : {name}")
        p = self.kay2x / f"{name}.raw.png"
        if not p.exists():
            raise FileNotFoundError(f"Rendu KayKit manquant : {p} (relancer avec --rebuild-cache)")
        im = Image.open(p).convert("RGBA")
        box = im.getbbox()
        if box is None:
            raise ValueError(f"Rendu KayKit vide : {name}")
        if box[0] <= 0 or box[1] <= 0 or box[2] >= im.width or box[3] >= im.height:
            raise ValueError(f"Rendu KayKit rogné par le canevas : {name} {box}")
        im = im.crop(box)
        # l'origine du modèle est donnée par le rendu (la caméra vise le milieu du modèle, pas l'origine)
        org = self.kay_meta()["models"][name].get("origin") or [p and 0, 0]
        ox, oy = org[0] - box[0], org[1] - box[1]
        # `scale` reste exprimé par rapport à la taille CANONIQUE du modèle (120 px/unité). Si son rendu
        # a été zoomé (KAY_VIEWS), on divise d'autant : la taille finale est la même qu'avant, mais on
        # réduit une grande image au lieu d'en agrandir une petite.
        scale = scale / float(KAY_VIEWS.get(name, {}).get("zoom", 1) or 1)
        if scale != 1.0 or sy != 1.0:
            im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale * sy))), Image.LANCZOS)
            ox, oy = ox * scale, oy * scale * sy
        self.kay_used.add(name)
        self.kay_cache[k] = (im, ox, oy)
        return self.kay_cache[k]

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
def kay_model(sprite, season):
    """Nom du modèle KayKit d'un calque : « kay:x » vaut x, « kays:x » vaut x_<saison>."""
    return f"{sprite[5:]}_{season}" if sprite.startswith("kays:") else sprite[4:]


# Prise de vue particulière de certains modèles. Par défaut tout se rend à 30° d'élévation et −30° d'azimut,
# comme les objets posés sur les tuiles. Une **dalle plate** doit au contraire se rendre à la verticale :
# à 30°, son hexagone est écrasé (240 × 108) et ne peut pas recouvrir le nôtre (240 × 280).
KAY_VIEWS = {
    "ble": {"el": 90, "az": 0},
    "terre": {"el": 90, "az": 0},
    # `zoom` : pixels par unité multipliés au RENDU 3D seulement. Certains modèles sont minuscules
    # (le sac de grain fait 20 px de large à 120 px/unité) et on les agrandissait ensuite à l'image :
    # on interpolait du vide, d'où une bouillie beige au pied du grenier. Rendus gros, puis réduits à
    # la taille voulue, ils gardent leurs arêtes. `Sources.kay` divise l'échelle demandée par ce zoom,
    # si bien que RIEN d'autre ne bouge : même taille en jeu, même ancrage, seulement plus de pixels.
    # (Relevé des cinq sprites interpolés : sac ×2,42, nénuphar ×1,67, abreuvoir ×1,58, pelle ×1,54,
    # tonneau ×1,41 — facteur = taille émise × échelle maximale en jeu ÷ taille naturelle.)
    "sack": {"zoom": 3.0},
    "nenuphar": {"zoom": 2.0},
    "abreuvoir": {"zoom": 2.0},
    "pelle": {"zoom": 2.0},
    "barrel": {"zoom": 1.8},
}


def L(sprite, x, y, kind="static", seasons=None, mirror=False, scale=1.0, order=None, **extra):
    return dict(sprite=sprite, x=x, y=y, kind=kind, seasons=seasons, mirror=mirror, scale=scale, order=order, **extra)


def T(family, base, layers=(), base_kind="grass", base_mirror=False, base_rot=0, note="", base_zoom=1.0):
    return dict(family=family, base=base, layers=list(layers), base_kind=base_kind,
                base_mirror=base_mirror, base_rot=base_rot, note=note, base_zoom=base_zoom)


PINE, PINE_S, ROUND, ROUND_S = "obj:treePine_large", "obj:treePine_small", "obj:treeRound_large", "obj:treeRound_small"
KPINE = "kay:pine_big"                 # sapin 3D KayKit (feuillage recoloré par saison)
KROUND, KROUND_S = "kays:feuillu", "kays:feuillu_petit"   # feuillus du pack Forest : la couleur suit la saison
KPOMMIER = "kays:pommier"              # verger : fleurs au printemps, feuilles en été, cuivre en automne, nu en hiver
FLOWERS_SPRING = [L("ht:flowerWhite:2.8", 34, 92, "flower", ("spring",)), L("ht:flowerYellow:2.8", 90, 60, "flower", ("spring",)),
                  L("ht:flowerWhite:2.8", 72, 112, "flower", ("spring",))]
FLOWERS_SUMMER = [L("ht:flowerYellow:2.8", 34, 92, "flower", ("summer",)), L("ht:flowerRed:2.8", 90, 60, "flower", ("summer",))]

TILES = {
    # --- prairies : grass_05 est la seule tuile d'herbe unie du pack (01-04 sont incrustées d'autres terrains)
    "meadow_1": T("meadow", "grass_05", [L("ht:bushGrass:2.4", 84, 100, "reed"), L("ht:bushGrass:2.2", 36, 66, "reed", mirror=True)], note="Herbe unie (grass_05) + deux touffes."),
    "meadow_2": T("meadow", "grass_05", FLOWERS_SPRING + FLOWERS_SUMMER, base_mirror=True,
                  note="Herbe unie en miroir + fleurs (Hexagon Tiles ×2.8) au printemps et en été."),
    "meadow_3": T("meadow", "grass_05", [L("kay:caillou_C", 84, 96, "rock", width=40), L("ht:bushGrass:2.6", 32, 74, "reed")],
                  base_rot=180, note="Herbe unie tournée de 180° + petit rocher + touffe (Hexagon Tiles ×2.6)."),
    # --- forêts : trois densités (5, 7 et 9 arbres)
    "forest_1": T("forest", "grass_05", [L(KPINE, 44, 80, "foliage", scale=0.55), L(KPINE, 74, 74, "foliage", scale=0.5), L(KPINE, 62, 96, "foliage", scale=0.6)], note="Forêt clairsemée : trois sapins KayKit isolés."),
    "forest_2": T("forest", "grass_05", [L("kay:pines_small", 60, 88, "foliage", scale=1.05)], note="Forêt moyenne : bosquet de sapins (KayKit trees_A_small)."),
    "forest_3": T("forest", "grass_05", [L("kay:pines_large", 60, 90, "foliage", scale=1.05)], note="Forêt dense : futaie de sapins (KayKit trees_A_large)."),
    # --- vergers : deux rangs de feuillus + clôture / haie, fruits en été et en automne
    "orchard_1": T("orchard", "grass_05", [L(KPOMMIER, 38, 72, height=64, fruits=True), L(KPOMMIER, 61, 68, height=64, fruits=True),
                                           L(KPOMMIER, 84, 72, height=64, fruits=True), L(KPOMMIER, 49, 92, height=64, fruits=True),
                                           L(KPOMMIER, 72, 92, height=64, fruits=True)],
                  note="Verger : 5 feuillus du pack Forest en deux rangs (fleurs au printemps, arbres nus en hiver) + 2 clôtures ; fruits dessinés en été/automne."),
    "orchard_2": T("orchard", "grass_05", [L(KPOMMIER, 42, 68, height=58, fruits=True), L(KPOMMIER, 78, 68, height=58, fruits=True),
                                           L(KPOMMIER, 33, 90, height=58, fruits=True), L(KPOMMIER, 60, 84, height=58, fruits=True),
                                           L(KPOMMIER, 87, 90, height=58, fruits=True), L(KPOMMIER, 60, 108, height=58, fruits=True)],
                  note="Verger : 6 feuillus du pack Forest ; fruits dessinés en été/automne."),
    # --- champs : parcelles en quinconce + foin + clôture
    "field_1": T("field", "dirt_06", [L("kay:terre", 60, 70, "field", width=306, flat=True, rogne=True, seasons=["spring"]),
                                      L("kay:ble", 60, 70, "field", width=312, flat=True, rogne=True, seasons=["summer", "autumn", "winter"])]
                 + [L("ht:bushGrass:1.9", x, y, "crop") for (x, y) in
                    [(34, 68), (70, 68), (26, 84), (62, 84), (98, 84), (44, 100), (80, 100), (62, 116)]]
                 + [L("kay:botte_ronde", 96, 112, scale=0.85)],
                 base_kind="dirt", note="Champ : la parcelle de blé du pack EXTRA (dalle hexagonale rendue à la verticale, recolorée par saison), quelques rangs de culture et une botte ronde en volume."),
    "field_2": T("field", "dirt_06", [L("kay:terre", 60, 70, "field", width=306, flat=True, rogne=True, mirror=True, seasons=["spring"]),
                                      L("kay:ble", 60, 70, "field", width=312, flat=True, rogne=True, mirror=True, seasons=["summer", "autumn", "winter"])]
                 + [L("ht:bushGrass:1.9", x, y, "crop") for (x, y) in
                    [(44, 66), (80, 66), (34, 82), (70, 82), (26, 98), (62, 98), (98, 98), (52, 114)]]
                 + [L("kay:botte_ronde", 36, 112, scale=0.85), L("kay:crate", 90, 104, scale=1.1)],
                 base_kind="dirt", base_mirror=True, note="Champ : la même parcelle en miroir, rangs de culture, botte ronde et clôture."),
    # --- hameaux (bâtiments inchangés par la saison)
    "hamlet_1": T("hamlet", "grass_05", [L("kay:home_A_jaune", 58, 90, scale=0.94), L("kay:barrel", 90, 98, scale=1.2), L("kay:crate", 38, 98, scale=1.1)],
                  note="Hameau : maison KayKit + tonneau + clôture."),
    "hamlet_2": T("hamlet", "grass_05", [L("kay:home_B", 60, 98, scale=0.81), L("kay:sack", 30, 102, scale=1.6), L("kay:wheelbarrow", 88, 98, scale=1.2)],
                  note="Village : maison à étage KayKit + sac de grain + brouette."),
    "hamlet_3": T("hamlet", "grass_05", [L("kay:home_B_vert", 50, 94, scale=0.70), L("kay:home_A_jaune", 86, 106, scale=0.66),
                                         L("kay:crate", 30, 100, scale=1.3), L("kay:barrel", 92, 86, scale=1.1)],
                  note="Bourg : deux maisons KayKit + caisse + clôture."),
    # --- eau (base hexagonale pleine, vagues Hexagon Tiles ×3.7) — identique aux 4 saisons
    "water_1": T("water", "water", [L("ht:waveWater:3.7", 40, 60, "wave"), L("ht:waveWater:3.7", 78, 90, "wave"),
                                    L("ht:waveWater:3.7", 50, 116, "wave")], base_kind="water",
                note="Hexagone plein #5aa7d6 (ombre de bord #4a90bd) + 3 vagues."),
    "water_2": T("water", "water", [L("ht:waveWater:3.7", 72, 56, "wave"), L("ht:waveWater:3.7", 36, 96, "wave", mirror=True)],
                 base_kind="water", note="Hexagone plein #5aa7d6 + 2 vagues."),
    # --- marais : terre + flaques + roseaux (+ fleurs au printemps, flaques gelées en hiver)
    "marsh_1": T("marsh", "dirt_06", [L("draw:puddle", 44, 70, "puddle", rx=14, ry=8, forme=0), L("draw:puddle", 82, 94, "puddle", rx=11, ry=6, forme=1),
                                      L("draw:puddle", 72, 50, "puddle", rx=8, ry=4, forme=2), L("ht:bushGrass:3", 28, 100, "reed"),
                                      L("ht:bushGrass:3", 96, 72, "reed"), L("ht:bushGrass:3", 62, 116, "reed"),
                                      L("ht:flowerWhite:2.8", 60, 90, "flower", ("spring",)), L("ht:flowerYellow:2.8", 30, 62, "flower", ("spring",))],
                 base_kind="dirt", note="Terre (dirt_06) + 3 flaques + 3 roseaux (bushGrass ×3) ; fleurs au printemps ; flaques gelées en hiver."),
    "marsh_2": T("marsh", "dirt_06", [L("draw:puddle", 76, 74, "puddle", rx=15, ry=9, forme=2), L("draw:puddle", 40, 98, "puddle", rx=10, ry=6, forme=0),
                                      L("ht:bushGrass:3", 92, 102, "reed"), L("ht:bushGrass:3", 34, 68, "reed"), L("ht:bushGrass:3", 56, 118, "reed", mirror=True),
                                      L("ht:flowerYellow:2.8", 58, 56, "flower", ("spring",)), L("ht:flowerWhite:2.8", 86, 112, "flower", ("spring",))],
                 base_kind="dirt", base_mirror=True, note="Terre en miroir + 2 flaques + 3 roseaux ; fleurs au printemps."),
    # --- roches : pierre + rochers gris (neige sur les sommets en hiver)
    "rock_1": T("rock", "stone_07", [L("kay:mont_A", 60, 96, "rock", width=150), L("kay:caillou_A", 26, 106, "rock", width=46),
                                     L("kay:caillou_C", 98, 92, "rock", width=38)], base_kind="stone",
                note="Mont de roche nue du pack EXTRA (mountain_A), le même qui coiffe maintenant les massifs en jeu (journal 106) + deux cailloux."),
    "rock_2": T("rock", "stone_07", [L("kay:massif_B", 48, 94, "rock", width=104), L("kay:massif_C", 86, 104, "rock", width=88),
                                     L("kay:caillou_B", 28, 108, "rock", width=40)], base_kind="stone", note="Deux massifs KayKit + un caillou."),
    "rock_3": T("rock", "stone_07", [L("kay:caillou_A", 38, 76, "rock", width=48), L("kay:caillou_D", 76, 70, "rock", width=44),
                                     L("kay:caillou_B", 56, 98, "rock", width=44), L("kay:bloc_grand", 86, 102, "rock", width=62)],
                base_kind="stone", base_mirror=True, note="Éboulis : trois cailloux et un bloc."),
    # --- sable (pas de saison)
    "sand_1": T("sand", "sand_07", base_kind="sand", base_zoom=1.08, note="Sable uni (sand_07), agrandi de 8 % et rogné : son liseré clair tombe dehors."),
    "sand_2": T("sand", "sand_07", [L("kay:bloc_brun", 84, 98, "rock", width=40)], base_kind="sand", base_mirror=True, base_rot=180, base_zoom=1.08,
                note="Sable uni tourné + petit rocher brun."),
    # --- tuiles rares
    "mill": T("rare", "grass_05", [L("kay:windmill", 60, 88, scale=0.85), L("kay:sack", 28, 104, scale=1.6), L("kay:barrel", 94, 98, scale=1.2)],
              note="Moulin à vent KayKit + sac de grain + clôture."),
    "chapel": T("rare", "grass_05", [L("kay:church", 60, 92, scale=0.81), L(KPINE, 26, 98, "foliage", scale=0.4), L(KPINE, 98, 78, "foliage", scale=0.5)],
                note="Église KayKit + muret de pierre + sapin."),
    "watchtower": T("rare", "grass_05", [L("kay:tower", 60, 96, scale=0.66), L("kay:wall", 32, 96, scale=0.55), L(KPINE, 96, 80, "foliage", scale=0.45)],
                    note="Tour de guet KayKit + pan de muraille + sapin."),
    "well": T("rare", "grass_05", [L("kay:well", 60, 88, scale=1.1), L("kay:bucket", 36, 104, scale=1.3)] + FLOWERS_SPRING + FLOWERS_SUMMER,
              note="Puits KayKit + 2 clôtures + fleurs (printemps, été)."),
    "camp": T("rare", "grass_05", [L("obj:campingTent", 44, 86), L("obj:fire", 82, 92), L("kay:lumber", 84, 108, scale=0.9), L(KPINE, 30, 100, "foliage", scale=0.45)],
              note="Campement : tente et feu Kenney + rondins et sapin KayKit."),
    "ruins": T("rare", "stone_07", [L("kay:ruin", 58, 92, scale=0.85), L("kay:lumber", 32, 100, scale=0.95)],
               base_kind="stone", note="Ruines KayKit (bâtiment effondré) sur pierre."),
    # --- collines (dès l'île 7) : hillGrass des Hexagon Tiles, recolorée comme l'herbe
    "hill_1": T("hill", "grass_05", [L("kay:colline_A", 60, 82, "hill", width=150), L("ht:bushGrass:2.2", 34, 104, "reed")],
                note="Colline : herbe plate + colline en volume du pack EXTRA (hill_single_A), sommet recoloré par saison, touffe au pied."),
    "hill_2": T("hill", "grass_05", [L("kay:mont_A_herbe", 60, 80, "hill", width=150, mirror=True), L("kay:caillou_C", 92, 100, "rock", width=30), L("ht:bushGrass:2.2", 30, 100, "reed")],
                base_mirror=True, note="Mont herbeux du pack EXTRA (mountain_A_grass), le même qui coiffe les grandes régions en jeu (journal 106), sommet recoloré par saison + rocher et touffe."),
    # --- landes (dès l'île 9) : sol ocre + bruyère (bushGrass recolorées en violet)
    "heath_1": T("heath", "grass_05", [L("ht:bushGrass:2.5", 36, 82, "heather"), L("ht:bushGrass:2.5", 78, 70, "heather"), L("ht:bushGrass:2.5", 60, 108, "heather"),
                                       L("ht:bushGrass:2.3", 94, 104, "heather"), L("kay:caillou_B", 28, 104, "rock", width=40)],
                 base_kind="heath", note="Lande : sol ocre (grass_05 recolorée) + quatre touffes de bruyère + petit rocher."),
    "heath_2": T("heath", "grass_05", [L("ht:bushGrass:2.5", 44, 72, "heather"), L("ht:bushGrass:2.5", 88, 84, "heather"), L("ht:bushGrass:2.5", 52, 110, "heather"),
                                       L(KPINE, 94, 112, "foliage", scale=0.42), L("kay:caillou_D", 26, 98, "rock", width=42)],
                 base_kind="heath", base_mirror=True, note="Lande en miroir : trois touffes de bruyère + pin nain + rocher."),
    # --- rares tardives
    "granary": T("rare", "grass_05", [L("kay:lumbermill", 60, 92, scale=0.68), L("kay:sack", 32, 100, scale=2.6), L("kay:sack", 86, 104, scale=2.6)],
                 note="Grenier : bâtiment de bois KayKit + deux sacs de grain."),
    "fountain": T("rare", "grass_05", [L("obj:fountain", 60, 94)] + FLOWERS_SPRING + FLOWERS_SUMMER,
                  note="Fontaine + clôtures + fleurs au printemps et en été."),
    # --- tuiles d'événement (dès l'île 5) et rares tardives (dès l'île 8)
    "market": T("rare", "grass_05", [L("kay:market", 60, 90, scale=0.77), L("kay:charrette_marchand", 88, 104, width=52), L("kay:crate_open", 26, 104, scale=1.3)],
                note="Marché KayKit (étal, auvent, cageots) + caisse ouverte."),
    "fete": T("rare", "grass_05", [L("kay:table", 46, 90, scale=1.0), L("kay:table", 72, 100, scale=1.0), L("kay:barrel", 60, 78, scale=1.1),
                                       L("kay:crate_open", 88, 104, scale=1.1), L("kay:flag", 30, 100, scale=2.6), L("kay:flag_green", 90, 84, scale=2.6)] + FLOWERS_SPRING + FLOWERS_SUMMER,
              note="Fête : deux tablées KayKit, un tonneau, deux oriflammes, des fleurs."),
    "restore": T("rare", "grass_05", [L("kay:chantier_B", 56, 98, width=96), L("kay:echelle", 90, 102, width=22), L("kay:pallet", 26, 106, scale=1.3)],
                 note="Chantier KayKit : échafaudage et palette (devient la famille majoritaire autour d'elle)."),
    "tavern": T("rare", "grass_05", [L("kay:tavern", 60, 90, scale=0.81), L("kay:barrel", 26, 102, scale=1.4), L("kay:barrel", 94, 106, scale=1.2)],
                note="Taverne KayKit + deux tonneaux."),
    "trough": T("rare", "grass_05", [L("kay:abreuvoir", 60, 94, width=56), L("kay:bucket", 92, 104, scale=1.4)] + FLOWERS_SPRING,
                note="Abreuvoir + clôtures KayKit + seau + fleurs au printemps."),
    "archway": T("rare", "grass_05", [L("kay:gate", 60, 94, scale=0.68), L("kay:wall", 28, 96, scale=0.5), L("kay:wall", 92, 96, scale=0.5)],
                 note="Porte fortifiée KayKit + deux pans de muraille."),
    "mine": T("rare", "stone_07", [L("kay:mine", 60, 92, scale=0.72), L("kay:lumber", 32, 100, scale=1.0)], base_kind="stone",
             note="Mine KayKit creusée dans la roche + rondins."),
    "oven": T("rare", "grass_05", [L("kay:blacksmith", 60, 90, scale=0.85), L("kay:lumber", 32, 100, scale=1.0)],
             note="Forge KayKit (four et cheminée) + rondins."),
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
        self.water_base = {sai: self.make_water_base(COLORS["water"][sai], COLORS["water_edge"][sai]) for sai in SEASONS}
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
            im = self.water_base[season].copy()
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
        if spec.get("base_zoom", 1.0) != 1.0:
            # base agrandie autour de son centre puis rognée à l'hexagone : le liseré clair que le sprite
            # porte à son bord (sand_07) tombe dehors — entre deux tuiles de sable, il dessinait la couture
            zf = spec["base_zoom"]; W, H = im.size; big = im.resize((round(W * zf), round(H * zf)), Image.LANCZOS)
            ox, oy = (big.width - W) // 2, (big.height - H) // 2
            im = big.crop((ox, oy, ox + W, oy + H))
            im.putalpha(self.hex_alpha)   # la base agrandie couvre tout l'hexagone : son alpha est celui de référence
        else:
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
        elif kind == "field":
            # sol de champ uni, recoloré par saison : la texture, ce sont les rangs de culture du décor
            im = snowify(im, mask="brownfield") if season == "winter" else recolor(im, COLORS["field"][season], mask="brownfield")
        return im

    # --- calques
    def kay_scale(self, layer, season):
        """Échelle d'un calque KayKit : `height` puis `width` (px 2× voulus) l'emportent sur `scale`."""
        if layer.get("width") or layer.get("height"):
            nat = self.src.kay(kay_model(layer["sprite"], season), 1.0)[0]
            return layer["height"] / nat.height if layer.get("height") else layer["width"] / nat.width
        return layer["scale"]

    @staticmethod
    def kay_sy(layer):
        """Étirement vertical du calque : `flat=True` pour une dalle posée au sol, sinon rien."""
        return FLAT_STRETCH if layer.get("flat") else float(layer.get("stretch", 1.0))

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
        elif sp.startswith("kay:") or sp.startswith("kays:"):
            im = self.src.kay(kay_model(sp, season), self.kay_scale(layer, season), self.kay_sy(layer))[0]   # l'échelle est déjà appliquée (l'origine la suit)
        else:
            raise ValueError(sp)
        if layer["scale"] != 1.0 and not sp.startswith("kay"):
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
            # les sommets KayKit sont jaune-vert (≈ 60°), hors du masque « green » : masque dédié
            im = snowify(im, mask="sommet") if season == "winter" else recolor(im, COLORS["grass"][season], mask="sommet")
        elif kind == "dry":
            im = recolor(im, COLORS["dry"], mask="all")
        elif kind == "rock" and season == "winter":
            im = blend_toward(im, "#f4f8fb", 0.85, mask="light")
        elif kind == "wave":
            im = tint(silhouette(im, "#ffffff"), "#ffffff", 0.8)
        if layer.get("fruits") and season in COLORS["fruit"]:
            im = self.draw_fruits(im, COLORS["fruit"][season], index)
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
        """Flaque : l'UNION de quelques ellipses décalées, posée sur un calque puis composée.

        Une ellipse seule se lit comme une pastille d'interface, et une flaque parfaitement ronde
        n'existe pas dans la nature. On en superpose trois ou quatre, de tailles et de centres
        différents : le contour devient lobé sans qu'on ait rien dessiné de plus qu'avant.
        `forme` choisit l'un des jeux de lobes de FLAQUES, pour que deux flaques voisines diffèrent.
        """
        cx, cy = layer["x"] * SCALE, layer["y"] * SCALE
        rx, ry = layer["rx"] * SCALE, layer["ry"] * SCALE
        fill, edge = (COLORS["ice"], COLORS["ice_edge"]) if season == "winter" else (COLORS["water"][season], COLORS["water_edge"][season])
        lobes = FLAQUES[layer.get("forme", 0) % len(FLAQUES)]
        lay = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        d = ImageDraw.Draw(lay)
        for creux in (0, 1):
            col = hex2rgb(fill if creux else edge) + (255,)
            mx, my, dy = (2, 1, 2) if creux else (0, 0, 0)
            for ox, oy, kx, ky in lobes:
                ax, ay = cx + ox * rx, cy + oy * ry
                d.ellipse((ax - rx * kx + mx, ay - ry * ky + my, ax + rx * kx - mx, ay + ry * ky - my - dy), fill=col)
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
            if layer["sprite"].startswith("kay"):
                # modèle 3D : ancré par l'origine du modèle (le centre de son pied), pas par le bas de l'image
                ox, oy = self.src.kay(kay_model(layer["sprite"], season), self.kay_scale(layer, season), self.kay_sy(layer))[1:]
                if layer["mirror"]:
                    ox = im.width - ox
                x = round(layer["x"] * SCALE - ox)
                y = round(layer["y"] * SCALE - oy)
            else:
                x = layer["x"] * SCALE - im.width // 2
                y = layer["y"] * SCALE - im.height
            if layer.get("rogne"):
                # calque volontairement plus large que la tuile, rogné à l'hexagone : c'est ainsi qu'une dalle
                # KayKit perd son liseré et ses coins biseautés (cuits dans le modèle), qui tombent dehors
                full = Image.new("RGBA", (TILE_W, TILE_H), (0, 0, 0, 0))
                full.paste(im, (x, y), im)
                full.putalpha(ImageChops.multiply(full.split()[3], self.hex_alpha))
                canvas.alpha_composite(full)
                continue
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
    def __init__(self, src_root, repo, sheets=False, kay_root=None, animals_root=None, forest_root=None, extra_root=None):
        self.src = Sources(src_root, kay_root, animals_root, forest_root, extra_root)
        self.animals_root = animals_root
        self.repo = repo
        self.img_root = repo / "assets" / "img"
        self.manifest = {}
        self.per_pack = {pid: set() for pid in PACKS}
        self.per_pack["kaykit"] = set()
        self.per_pack["animaux3d"] = set()
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
                   "sand": ("sand_07", "sand"), "hill": ("grass_05", "grass"), "heath": ("grass_05", "heath")}
        for kind, (base, bk) in GROUNDS.items():
            for season in SEASONS:
                im = comp.base_for(T(kind, base, [], base_kind=bk, base_zoom=1.08 if kind == "sand" else 1.0), season)
                arr = np.asarray(im)[120:170, 95:145, :3].reshape(-1, 3).mean(0)
                col = "#%02x%02x%02x" % tuple(int(v) for v in arr)
                self.emit(f"ground_{kind}_{season}", "tiles", im, HP, self.src.hp_original(base), f"Sol « {kind} » ({season}) pour le décor composé par région.",
                          ground=kind, season=season, ground_color=col)
        # Sol de champ : la terre unie (dirt_06) recolorée par saison — labour brun au printemps, blé
        # vert puis or, neige l'hiver. Les dalles KayKit (terre, blé) ont été essayées ici : leurs
        # reliefs éclairés (monticules ronds du labour, petits cubes d'épis) faisaient des taches
        # claires sur l'île (retour du commanditaire), et les rangs de culture sont de toute façon
        # posés par le décor, région par région : c'est eux qui font le champ.
        for season in SEASONS:
            base = comp.base_for(T("field", "dirt_06", [], base_kind="field"), season)
            arr = np.asarray(base)[120:170, 95:145, :3].reshape(-1, 3).mean(0)
            quoi = "terre labourée" if season == "spring" else "blé"
            self.emit(f"ground_field_{season}", "tiles", base, HP, self.src.hp_original("dirt_06"),
                      f"Sol de champ ({season}) : {quoi}, terre unie recolorée ; les rangs de culture sont ajoutés par région.",
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
        def kobj(keyname, model, season, target_w, kind="static", note="", target_h=None, **extra):
            """Objet de décor rendu depuis un modèle 3D KayKit, mis à la taille voulue (en px 2×).

            On vise la **hauteur** pour les arbres : d'une saison à l'autre le modèle change de forme
            (l'arbre nu de l'hiver est bien plus étroit que le feuillu d'été) et seule la hauteur
            garde alors une taille cohérente.
            """
            nat = self.src.kay(model, 1.0)[0]
            sc = target_h / nat.height if target_h else target_w / nat.width
            layer = L(f"kay:{model}", 0, 0, kind, scale=sc, **extra)
            im = comp.layer_image(layer, season, 0)
            bb = im.split()[3].getbbox()
            if bb:
                im = im.crop((bb[0], bb[1], bb[2], im.height))
            self.emit(keyname, "deco", im, "kaykit", f"{KAY_MODELS[model]}.gltf", note, anchor="bottom")

        # collines et monts en volume (pack EXTRA) : sommet d'herbe recoloré par saison (neige l'hiver),
        # flancs de terre ou de roche inchangés. Une colline isolée couvre une case, une chaîne un peu plus,
        # un mont davantage encore : c'est le décor qui choisit selon la place de la case dans sa région.
        for v in ("A", "B", "C"):
            for season in SEASONS:
                kobj(f"obj_colline_{v}_{season}", f"colline_{v}", season, 196, "hill", f"Colline isolée en volume (hill_single_{v}, pack EXTRA), sommet de {season}.")
                kobj(f"obj_collines_{v}_{season}", f"collines_{v}", season, 252, "hill", f"Chaîne de collines en volume (hills_{v}, pack EXTRA), sommets de {season}.")
                kobj(f"obj_mont_{v}_{season}", f"mont_{v}_herbe", season, 262, "hill", f"Mont herbeux en volume (mountain_{v}_grass, pack EXTRA), sommet de {season}.")
        for v in ("B", "C"):
            for season in SEASONS:
                kobj(f"obj_collines_{v}_arbres_{season}", f"collines_{v}_arbres", season, 252, "hill", f"Chaîne de collines boisée (hills_{v}_trees, pack EXTRA), sommets de {season}.")
        # les monts de roche nue : le sommet des massifs (faces claires blanchies l'hiver, comme les blocs)
        for v in ("A", "B", "C"):
            for season in SEASONS:
                kobj(f"obj_mont_roc_{v}_{season}", f"mont_{v}", season, 262, "rock", f"Mont de roche nue (mountain_{v}, pack EXTRA) : le sommet d'un massif ({season}).")
        # arbres : modèles 3D KayKit, feuillage recoloré par saison (les largeurs reprennent celles des sprites plats
        # qu'ils remplacent, pour que le décor composé garde ses proportions)
        for name, model, w in (("treePine_large", "pine_big", 56), ("treePine_small", "pine_big", 40)):
            for season in SEASONS:
                kobj(f"obj_{name}_{season}", model, season, w, "foliage", f"{name} : sapin 3D KayKit recoloré ({season}).")
        # feuillus : le pack Forest livre ses propres couleurs de saison (et un arbre nu pour l'hiver),
        # bien plus justes qu'une recoloration — on ne recolore donc pas ces calques.
        for name, base, h in (("treeRound_large", "feuillu", 84), ("treeRound_large2", "feuillu2", 92),
                              ("treeRound_large3", "feuillu3", 78), ("treeRound_small", "feuillu_petit", 60),
                              ("treeRound_small2", "feuillu_petit2", 66), ("treeRound_small3", "feuillu_petit3", 54)):
            for season in SEASONS:
                kobj(f"obj_{name}_{season}", f"{base}_{season}", season, None, "static",
                     f"{name} : feuillu 3D du pack Forest, palette de {season}" + (" (arbre nu)" if season == "winter" else "") + ".",
                     target_h=h)
        # une deuxième silhouette de sapin, et le sous-bois
        for season in SEASONS:
            kobj(f"obj_treePine_large2_{season}", f"sapin2_{season}", season, None, "static",
                 f"Sapin du pack Forest, palette de {season} : deuxième silhouette pour les forêts.", target_h=86)
            kobj(f"obj_treePine_small2_{season}", f"sapin2_{season}", season, None, "static",
                 f"Petit sapin du pack Forest ({season}).", target_h=58)
            kobj(f"obj_bush_{season}", f"buisson_{season}", season, None, "static",
                 f"Buisson du pack Forest ({season}) : sous-bois.", target_h=26)
            kobj(f"obj_bush2_{season}", f"buisson2_{season}", season, None, "static",
                 f"Buisson bas du pack Forest ({season}).", target_h=20)
            # Les prés étaient les tuiles les plus vides du jeu. Deux graminées hautes (Grass_2_C et
            # Grass_2_D du pack Forest) et une touffe à feuilles larges (Grass_1_C) pour la lande.
            kobj(f"obj_tallGrass_{season}", "herbe1", season, None, "reed",
                 f"Herbe haute, touffe fine ({season}) : prés.", target_h=34)
            kobj(f"obj_tallGrass2_{season}", "herbe2", season, None, "reed",
                 f"Herbe haute, touffe large ({season}) : prés.", target_h=42)
            kobj(f"obj_grassClump_{season}", "touffe", season, None, "reed",
                 f"Touffe à feuilles larges ({season}) : landes.", target_h=26)
        for season in SEASONS:
            kobj(f"obj_treeRound_fruit_{season}", f"pommier_{season}", season, None, "static",
                 f"Fruitier ({season}) : feuillu du pack Forest dans sa palette de saison, fruits dessinés en été et en automne.",
                 target_h=64, fruits=True)
            obj(f"obj_hedge_{season}", L("obj:hedge", 0, 0, "foliage", scale=0.45), season, f"Haie ×0.45 ({season}).")
            obj(f"obj_bushGrass_{season}", L("ht:bushGrass:2.4", 0, 0, "reed"), season, f"Touffe d'herbe / roseau ({season}).", pack=HT)
            obj(f"obj_heather_{season}", L("ht:bushGrass:2.4", 0, 0, "heather"), season, f"Bruyère ({season}).", pack=HT)
            obj(f"obj_crop_{season}", L("ht:bushGrass:" + {"spring": "1.5", "summer": "2.0", "autumn": "2.1", "winter": "1.3"}[season], 0, 0, "crop"), season, f"Rang de culture ({season}) : touffe recolorée (pousses, blé vert, blé mûr, chaume sous la neige).", pack=HT)
            for name in ("farmland", "farmland_empty"):
                obj(f"obj_{name}_{season}", L(f"obj:{name}", 0, 0, "field"), season, f"Parcelle {name} ({season}).")
        obj("obj_bushGrass_dry", L("ht:bushGrass:2.4", 0, 0, "dry"), "summer", "Touffe sèche.", pack=HT)
        # objets saisonniers : fleurs de printemps sur les arbres, tas de feuilles, congères, mousse, fleurs bleues, nénuphars, paniers
        for suffix, model, h in (("", "feuillu_petit_fleurs", 60), ("2", "feuillu_petit2_fleurs", 66), ("3", "feuillu_petit3_fleurs", 54)):
            kobj(f"obj_treeRound_blossom{suffix}", model, "spring", None, "static",
                 "Arbre en fleurs : la palette « fleurs » du pack Forest (forêts et vergers au printemps).", target_h=h)
        for suffix, model, h in (("", "feuillu_fleurs", 84), ("2", "feuillu2_fleurs", 92), ("3", "feuillu3_fleurs", 78)):
            kobj(f"obj_treeRound_blossom_large{suffix}", model, "spring", None, "static", "Grand arbre en fleurs (printemps).", target_h=h)
        obj("obj_leafpile", L("ht:bushAutumn:2.2", 0, 0), "autumn", "Tas de feuilles mortes (bushAutumn ×2.2) : forêts et vergers en automne.", pack=HT)
        obj("obj_snowdrift", L("ht:bushSnow:2.4", 0, 0), "winter", "Congère (bushSnow ×2.4) : hiver et bourrasque.", pack=HT)
        obj("obj_moss", L("ht:rockStone_moss1:1.6", 0, 0), "spring", "Petit rocher moussu (rockStone_moss1 ×1.6) : roches au printemps.", pack=HT)
        obj("obj_flowerBlue", L("ht:flowerBlue:2.8", 0, 0), "spring", "Fleur bleue (Hexagon Tiles ×2.8).", pack=HT)
        # Pack EXTRA et pack de base : les trois derniers sprites plats posés à côté de modèles 3D cèdent la
        # place à des volumes — l'abreuvoir, la pierre du menhir (qui était une pierre TOMBALE de 24 px) et
        # le nénuphar. Le nénuphar flotte à plat : il se rend à la verticale, comme les dalles.
        kobj("obj_lily", "nenuphar", "summer", 30, "static", "Nénuphar en volume (KayKit) : lacs et étangs en été.")
        kobj("obj_horseTrough", "abreuvoir", "summer", 72, "static", "Abreuvoir de bois (KayKit EXTRA).")
        kobj("obj_shrine", "sanctuaire", "summer", 86, "static", "Pierre gravée, bougies au pied (KayKit EXTRA) : l'ouvrage « menhir ».")
        # La variété qui ne coûte presque rien : une seconde silhouette de récolte, trois roseaux, deux souches.
        kobj("obj_haybale", "botte_ronde", "summer", 44, "static", "Botte de paille ronde (KayKit EXTRA) : seconde silhouette de récolte.")
        for i, m in enumerate(("roseau_A", "roseau_B", "roseau_C"), 1):
            kobj(f"obj_waterplant{i}", m, "summer", 26, "reed", f"Massette d'eau {i} (KayKit) : marais et bords d'étang.")
        # Le port : barque, chevalet, ancre et navire au mouillage.
        kobj("obj_boat", "barque", "summer", 52, "static", "Barque de bois (KayKit EXTRA) : rives et port.")
        kobj("obj_boatrack", "chevalet", "summer", 56, "static", "Chevalet à bateau (KayKit EXTRA) : rives et port.")
        kobj("obj_anchor", "ancre", "summer", 28, "static", "Ancre de fer (KayKit EXTRA) : port.")
        kobj("obj_ship", "navire", "summer", 100, "static", "Trois-mâts marchand (KayKit EXTRA) : mouillé au port.")
        # Le chantier : ossature, échelle, pelle, et deux charrettes pour le marché.
        kobj("obj_stage", "chantier_B", "summer", 130, "static", "Ossature de chantier (KayKit) : tuile « restaurer ».")
        kobj("obj_ladder", "echelle", "summer", 26, "static", "Échelle (KayKit) : chantier.")
        kobj("obj_shovel", "pelle", "summer", 20, "static", "Pelle plantée (KayKit EXTRA) : chantier et champs.")
        kobj("obj_cart", "charrette", "summer", 70, "static", "Charrette bâchée (KayKit EXTRA) : marché, fête, hameau.")
        kobj("obj_cart_merchant", "charrette_marchand", "summer", 70, "static", "Charrette de marchand chargée (KayKit EXTRA).")
        obj("obj_basket", L("obj:box1", 0, 0), "autumn", "Caisse de récolte (box1) : vergers en automne, cueillette.")
        # rochers : blocs 3D KayKit (les largeurs reprennent celles des sprites plats remplacés)
        for name, model, w in (("rockGrey_large", "massif_A", 150), ("rockGrey_large2", "massif_B", 138),
                               ("rockGrey_large3", "massif_C", 132), ("rockGrey_medium1", "massif_B", 96),
                               ("rockGrey_medium2", "massif_C", 90), ("rockGrey_medium3", "bloc_grand", 84),
                               ("rockGrey_small1", "caillou_A", 54), ("rockGrey_small2", "caillou_B", 50),
                               ("rockGrey_small3", "caillou_C", 42), ("rockGrey_small4", "caillou_D", 46),
                               ("rockBrown_small", "bloc_brun", 40)):
            kobj(f"obj_{name}", model, "summer", w, "rock", f"Rocher {name} : massif ou bloc 3D KayKit.")
            kobj(f"obj_{name}_winter", model, "winter", w, "rock", f"Rocher {name} enneigé.")
        # Bâtiments du décor composé : modèles 3D KayKit. Les largeurs de la table sont celles des
        # sprites plats qu'ils remplacent ; BUILD_SCALE les ramène à l'échelle voulue, car un modèle
        # KayKit est bien plus dense à l'œil qu'un sprite Kenney de même largeur (retour du
        # commanditaire : « trop gros par rapport à la map »).
        for keyname, model, w, note in (
                ("obj_house", "home_B", 168, "Maison à étage (colombages, perron)."),
                ("obj_house_small", "home_A", 116, "Maisonnette."),
                ("obj_villa", "tavern", 150, "Grande bâtisse (taverne)."),
                ("obj_tinyBuilding", "home_A", 66, "Petite remise (maisonnette réduite)."),
                ("obj_farm", "lumbermill", 128, "Ferme / atelier de bois."),
                ("obj_townhall", "mairie", 158, "Hôtel de ville (beffroi à horloge) — pack EXTRA."),
                ("obj_workshop", "atelier", 155, "Atelier de charpente (scie, cheminée) — pack EXTRA."),
                # Mesuré : à 56 (soit 21 unités monde) le puits faisait le tiers de l'hôtel de ville et
                # ne laissait qu'un trait rouge sur du gris. Ce n'était pas le modèle, c'était la taille.
                ("obj_well", "well", 90, "Puits."),
                ("obj_church", "church", 150, "Église."),
                ("obj_silo1", "tower_base", 84, "Silo (fût de pierre)."),
                ("obj_windmill_complete", "windmill", 120, "Moulin à vent."),
                ("obj_tower", "tower", 104, "Tour de guet."),
                ("obj_tavern", "tavern", 164, "Taverne."),
                ("obj_shop", "market", 148, "Étal de marché."),
                ("obj_mine", "mine", 130, "Mine."),
                ("obj_oven", "blacksmith", 120, "Forge (four et cheminée)."),
                ("obj_archway", "gate", 150, "Porte fortifiée."),
                ("obj_castle_small", "barracks", 200, "Petite forteresse."),
                ("obj_wall_small", "wall", 140, "Pan de muraille."),
                ("obj_wall", "wall", 180, "Muraille."),
                ("obj_logPile", "lumber", 74, "Tas de rondins."),
                ("obj_log", "lumber", 56, "Rondin."),
                ("obj_barrel", "barrel", 45, "Tonneau."),
                # Le sac est un accessoire de 0,17 unité dans le pack : le montrer à 25 unités monde, c'était
                # l'agrandir deux fois et demie au-delà de ce que le modèle porte — d'où un pain beige sans
                # détail. À 15 unités il redevient un sac posé à côté d'un bâtiment.
                ("obj_sack", "sack", 40, "Sac de grain."),
                ("obj_wheelbarrow", "wheelbarrow", 58, "Brouette."),
                ("obj_stake", "piquet", 46, "Piquet à chiffon : l'épouvantail."),
                ("obj_tent", "tente", 96, "Tente ronde de campement."),
                ("obj_stables", "ecurie", 160, "Écurie (stalles, bottes, clôture)."),
                ("obj_crate", "crate", 34, "Caisse."),
                ("obj_scaffolding", "scaffolding", 150, "Échafaudage de chantier."),
                ("obj_ruin_building", "ruin", 140, "Bâtiment effondré.")):
            kobj(keyname, model, "summer", round(w * BUILD_SCALE), "static", f"{note} Modèle 3D KayKit.")
        # les maisons existent en trois couleurs de toit : le décor en choisit une par case
        for keyname, model, w in (("obj_house", "home_B", 168), ("obj_house_small", "home_A", 116),
                                  ("obj_villa", "tavern", 150), ("obj_tinyBuilding", "home_A", 66),
                                  ("obj_farm", "lumbermill", 128)):
            for suffix, colour in (("_jaune", "ambre"), ("_vert", "vert")):
                kobj(keyname + suffix, model + suffix, "summer", round(w * BUILD_SCALE), "static",
                     f"Même bâtiment, toit {colour} (modèle 3D KayKit).")
        # La fontaine n'a aucun équivalent dans KayKit. Elle restait un disque de 46 unités monde —
        # aussi large qu'une maison, et plus clair que tout le reste du plateau : l'œil la prenait pour
        # un bouton d'interface. Réduite à 32 et assombrie d'un cran, elle redevient un objet posé au sol.
        fon = comp.layer_image(L("obj:fountain", 0, 0, scale=0.70), "summer", 0)
        arr_f = np.asarray(fon).astype(np.float32)
        arr_f[..., :3] *= 0.80
        fon = Image.fromarray(np.clip(arr_f, 0, 255).astype(np.uint8), "RGBA")
        bb_f = fon.split()[3].getbbox()
        if bb_f:
            fon = fon.crop((bb_f[0], bb_f[1], bb_f[2], fon.height))
        self.emit("obj_fountain", "deco", fon, HP, self.src.hp_original("fountain"),
                  "Fontaine (Hexagon Pack) réduite et assombrie : elle brillait comme un bouton.", anchor="bottom")
        # « hay » et « campingTent » ont disparu : la meule plate Kenney se lisait comme un jeton
        # d'interface (32 unités monde, plus grosse que le puits), et la tente était un triangle bleu
        # sans volume. La botte ronde et la tente ronde KayKit les remplacent.
        # Deux sprites plats de plus s'en vont : le maillet couché ci-dessus, et le poteau blanc de
        # 18 × 40 qui se lit comme le chiffre 1 planté au milieu d'un village — c'est très
        # probablement lui, et non le puits, que deux testeurs ont signalé.
        for name in ("fire", "towerRuin", "ruinsCorner", "ruins_brick1",
                     "banner", "medieval_doorway", "box2"):
            obj(f"obj_{name}", L(f"obj:{name}", 0, 0), "summer", f"Objet {name} (Hexagon Pack).")
        for name in ("flowerWhite", "flowerYellow", "flowerRed"):
            obj(f"obj_{name}", L(f"ht:{name}:2.8", 0, 0), "summer", f"Fleur {name} (Hexagon Tiles ×2.8).", pack=HT)
        # ponts et jetées : rendus isométriques du Nature Kit (dossier Isometric), recadrés, quatre orientations
        for kind, fr in (("bridge_wood", "Pont de bois"), ("bridge_side_wood", "Jetée (demi-pont de bois)")):
            for o in ("NE", "NW", "SE", "SW"):
                im = Image.open(self.src.path(NK, f"Isometric/{kind}_{o}.png")).convert("RGBA")
                im = im.crop(im.split()[3].getbbox())
                self.emit(f"obj_{kind}_{o}", "deco", im, NK, f"Isometric/{kind}_{o}.png", f"{fr}, orientation {o} (Nature Kit, rendu isométrique, taille native).", anchor="bottom")
        # Trois formes, et surtout ROGNÉES : le calque gardait une marge transparente au-dessus de
        # l'ellipse, or le sprite est ancré par son BAS — la flaque flottait donc de huit pixels
        # au-dessus du sol. Réduites au passage de 32 à 22 unités monde : une flaque n'occupe pas
        # le quart d'une tuile.
        for i in range(len(FLAQUES)):
            for season, suff in (("summer", ""), ("winter", "_winter")):
                lay = Image.new("RGBA", (80, 50), (0, 0, 0, 0))
                comp.draw_puddle(lay, {"x": 20, "y": 16, "rx": 11, "ry": 6, "forme": i}, season)
                bb = lay.split()[3].getbbox()
                self.emit(f"obj_puddle{i + 1}{suff}", "deco", lay.crop(bb), HP, "grass_05 (alpha)",
                          f"Flaque d'eau{' gelée' if season == 'winter' else ''}, silhouette {i + 1} sur {len(FLAQUES)} (union d'ellipses, liseré sombre).",
                          anchor="bottom")

    # --- B. faune
    def build_fauna(self):
        # 1. les têtes rondes de Kenney restent les portraits : file des vœux, guide, succès
        animals = {"rabbit": "lapin", "moose": "élan", "frog": "grenouille", "duck": "canard", "bear": "ours", "owl": "hibou",
                   "penguin": "manchot", "chick": "poussin (bonus)", "horse": "cheval", "goat": "chèvre", "chicken": "poule", "cow": "vache"}
        for name, fr in animals.items():
            im = Image.open(self.src.path(AN, f"PNG/Round/{name}.png")).convert("RGBA")
            bb = im.split()[3].getbbox()
            im = im.crop(bb)
            self.emit(f"fauna_{name}", "fauna", im, AN, f"PNG/Round/{name}.png", f"{fr.capitalize()} — tête ronde, taille native (dossier Round) : portrait (vœux, guide, succès).")
        # 2. les animaux du plateau : bandes rendues depuis les modèles 3D
        self.build_fauna_sheets()

    def build_fauna_sheets(self):
        """Une bande par espèce : le profil rendu en 3D, N images du cycle côte à côte.

        Les images d'une espèce sont rognées sur une **boîte commune** : sans cela, l'animal
        tressauterait d'une image à l'autre au lieu de marcher. L'orientation retenue est celle
        des quatre rendus dont la silhouette est la plus large, c'est-à-dire le profil.
        """
        src = self.src.animals_dir()
        meta = json.loads((src / "meta.json").read_text(encoding="utf-8"))["species"]
        prov = json.loads((self.animals_root / "PROVENANCE.json").read_text(encoding="utf-8"))["models"]
        for sp, cfg in ANIMALS.items():
            info = meta[sp]
            yaws, frames = info["yaws"], info["frames"]
            # profil = l'orientation la plus large
            best, bestw = yaws[0], -1
            for y in yaws:
                w = 0
                for f in range(frames):
                    bb = Image.open(src / f"{sp}_{y}_{f}.png").split()[3].getbbox()
                    if bb:
                        w = max(w, bb[2] - bb[0])
                if w > bestw:
                    best, bestw = y, w
            boxes = [Image.open(src / f"{sp}_{best}_{f}.png").split()[3].getbbox() for f in range(frames)]
            boxes = [b for b in boxes if b]
            if not boxes:
                raise RuntimeError(f"{sp} : rendus vides")
            box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
            scale = cfg["width"] / (box[2] - box[0])
            cw, ch = max(1, round((box[2] - box[0]) * scale)), max(1, round((box[3] - box[1]) * scale))
            sheet = Image.new("RGBA", (cw * frames, ch), (0, 0, 0, 0))
            for f in range(frames):
                im = Image.open(src / f"{sp}_{best}_{f}.png").convert("RGBA").crop(box).resize((cw, ch), Image.LANCZOS)
                if cfg["face"] == "gauche":   # toutes les bandes regardent à droite ; le jeu retourne pour l'autre sens
                    im = im.transpose(Image.FLIP_LEFT_RIGHT)
                sheet.alpha_composite(im, (f * cw, 0))
            pr = prov[cfg["model"]]
            note = (f"{cfg['fr'].capitalize()} — profil rendu depuis le modèle 3D ({frames} image(s)"
                    + (f", cycle « {cfg['clip']} »" if cfg["clip"] else ", modèle fixe") + f", orientation {best}°).")
            cycle = "walk" if (cfg["clip"] and "walk" in cfg["clip"].lower()) else ("idle" if cfg["clip"] else None)
            self.emit(f"fauna_{sp}_side", "fauna", sheet, "animaux3d", pr["source"], note,
                      frames=frames, frame_w=cw, frame_h=ch, cycle=cycle, licence=pr["licence"])

    # --- B bis. la mer autour de l'île : un voilier vu de dessus (Pirate Pack) et une baleine (Animal Pack Redux)
    def build_sea(self):
        for i, (n, note) in enumerate([("ship (1)", "voile blanche, coque brune"), ("ship (7)", "voile crème, coque claire")], 1):
            im = Image.open(self.src.path(PP, f"PNG/Default size/Ships/{n}.png")).convert("RGBA")
            im = im.crop(im.split()[3].getbbox())
            self.emit(f"sea_boat_{i}", "sea", im, PP, f"PNG/Default size/Ships/{n}.png", f"Voilier vu de dessus, {note} (Pirate Pack, taille native) : passe au large de l'île.")
        im = Image.open(self.src.path(AN, "PNG/Round/whale.png")).convert("RGBA")
        im = im.crop(im.split()[3].getbbox())
        self.emit("sea_whale", "sea", im, AN, "PNG/Round/whale.png", "Baleine — tête ronde, taille native (dossier Round) : fait surface au large, de loin en loin.")

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
    # --- E. vignettes des succès : composées à partir des tuiles et sprites déjà produits (aucun dessin par code)
    def build_badges(self):
        """Vignettes de succès : composées au départ depuis les tuiles et sprites du jeu. Le commanditaire a fait
        générer les 31 (prompts de docs/PROMPTS_SUCCES.pdf) ; elles sont posées à la main dans assets/img/succes/
        avec leurs entrées dans manifest.json et les crédits (pack « Généré par IA »). Plus rien à composer ici :
        la recette d'origine reste en dessous pour l'historique, jamais exécutée."""
        return
        def load(key):
            e = self.manifest.get(key)
            if not e:
                raise KeyError(f"vignette : image absente {key}")
            return Image.open(self.img_root / e["file"]).convert("RGBA")
        def shadowed(im, radius=6, alpha=140):
            """Ombre douce sombre sous un sprite (icônes blanches lisibles sur les sols clairs)."""
            a = im.split()[3]
            sh = Image.new("RGBA", im.size, (35, 30, 20, 0)); sh.putalpha(a.point(lambda v: v * alpha // 255))
            pad = radius * 3
            big = Image.new("RGBA", (im.width + 2 * pad, im.height + 2 * pad), (0, 0, 0, 0)); big.alpha_composite(sh, (pad, pad + 4))
            big = big.filter(ImageFilter.GaussianBlur(radius)); big.alpha_composite(im, (pad, pad))
            return big
        def sprite(key, x, y, scale=1.0, icon=False):
            im = load(key)
            if scale != 1.0:
                im = im.resize((max(1, round(im.width * scale)), max(1, round(im.height * scale))), Image.LANCZOS)
            if icon:
                im = shadowed(im)
            return im, x, y   # ancré bas-centre en (x, y)
        ICON = 1.4
        B = {
            "premiere-tuile": ("meadow_1_spring", []), "un-toit": ("hamlet_1_summer", []), "bourg": ("archway_summer", []),
            "grand-domaine": ("forest_1_summer", []),
            "coup-de-maitre": ("ground_grass_summer", [("icon_star", 120, 190, ICON, True)]),
            "sans-faute": ("ground_grass_spring", [("icon_check", 120, 190, ICON, True)]),
            "sans-regret": ("ground_grass_autumn", [("icon_undo", 120, 190, ICON, True)]),
            "la-source": ("water_1_spring", [("obj_rockGrey_medium1", 60, 150, 1.08)]),
            "jusqu-a-la-mer": ("ground_sand_summer", [("sea_wave_1", 120, 170, 1.4), ("sea_wave_2", 80, 200, 1.2)]),
            # « le-lac » et « l-ours » : images générées à la demande du commanditaire (pack « Généré par IA »),
            # posées à la main dans assets/img/succes/ — le pipeline ne doit plus les écraser
            "veillee": ("water_frozen", [("obj_shrine", 120, 212, 1.5)]),
            "quatre-saisons": ("ground_grass_autumn", [("icon_sun", 120, 190, ICON, True)]),
            "grande-foire": ("orchard_1_autumn", [("obj_basket", 120, 215, 1.35)]),
            "compagnie": ("ground_grass_summer", [("fauna_rabbit", 86, 205, 1.0), ("fauna_duck", 156, 205, 1.0)]),
            "menagerie": ("ground_grass_spring", [("fauna_moose", 120, 215, 1.15)]),
            "les-manchots": ("water_frozen", [("fauna_penguin", 98, 210, 0.95), ("fauna_penguin", 150, 200, 0.8)]),
            "promesse-tenue": ("ground_grass_summer", [("obj_banner", 120, 212, 1.8)]),
            "toute-l-ile": ("fete_summer", []), "cinquante-promesses": ("chapel_summer", []),
            "charpentier": ("ground_field_summer", [("obj_logPile", 100, 205, 1.49), ("obj_haybale", 165, 200, 2.0)]),
            "signature": ("ground_grass_summer", [("obj_church", 120, 215, 1.35)]),
            "le-cahier-complet": ("ground_stone_summer", [("obj_castle_small", 120, 210, 1.35)]),
            "port-d-attache": ("ground_water_summer", [("obj_house_small", 84, 200, 1.35), ("obj_rockGrey_medium1", 164, 206, 1.0), ("sea_wave_1", 150, 160, 1.0)]),
            "bien-place": ("ground_grass_summer", [("obj_box2", 120, 205, 1.35), ("obj_flowerYellow", 80, 205, 1.35), ("obj_flowerWhite", 160, 205, 1.35)]),
            "frais-du-jour": ("ground_grass_spring", [("obj_treeRound_blossom_large", 120, 220, 1.5)]),
            "chapitre-clos": ("ground_grass_summer", [("icon_trophy", 120, 190, ICON, True)]),
            "les-quatre-climats": ("ground_heath_autumn", [("obj_snowdrift", 78, 210, 1.9), ("obj_treePine_small_winter", 156, 205, 1.5), ("obj_bushGrass_dry", 120, 222, 1.4)]),
            "cent-saisons": ("ground_grass_summer", [("icon_medal", 120, 190, ICON, True)]),
            "cent-cinquante": ("ground_grass_spring", [("icon_trophy", 120, 190, ICON, True), ("obj_flowerWhite", 60, 215, 1.35), ("obj_flowerRed", 180, 215, 1.35)]),
            "lever-du-jour": ("ground_sand_summer", [("icon_sun", 120, 190, ICON, True)]),
            "sans-fin": ("hill_1_summer", []),
            "prudence": ("ground_grass_summer", [("icon_save", 120, 190, ICON, True)]),
        }
        def pack_of(key):
            pk = self.manifest[key]["source"]
            return pk if isinstance(pk, str) else pk[0]
        for bid, (base, layers) in B.items():
            im = load(base).copy()
            objs = []
            for lay in layers:
                key, x, y, scale = lay[0], lay[1], lay[2], lay[3]
                icon = len(lay) > 4 and lay[4]
                sp, x, y = sprite(key, x, y, scale, icon)
                objs.append((y, sp, x))
            for y, sp, x in sorted(objs, key=lambda o: o[0]):
                im.alpha_composite(sp, (int(x - sp.width / 2), int(y - sp.height)))
            packs = sorted({pack_of(base)} | {pack_of(l[0]) for l in layers})
            self.emit(bid, "succes", im, packs if len(packs) > 1 else packs[0], base + "".join(" + " + l[0] for l in layers),
                      "Vignette de succès composée à partir des tuiles et sprites du jeu.", badge=True)

    def build_archetype_badges(self):
        """Insignes d'archétype d'île (hameaux, aquatique, sauvage, montagneuse, nourricière, littorale) :
        composés au départ depuis les sprites du jeu, comme les vignettes de succès ci-dessus. Le
        commanditaire n'aimait pas ce style et a demandé, pour les six, des images générées à part (prompts
        donnés en conversation) — elles sont en place dans assets/img/archetypes/ avec leurs entrées
        manuelles dans manifest.json et les crédits (pack « Généré par IA »). Rien à composer ici tant que
        ça reste le cas ; laissé en place pour l'historique et au cas où il faudrait revenir en arrière."""
        pass

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
        for name, note in (("banner", "Bannière rouge"), ("sign", "Panneau bleu"), ("log", "Bûche")):
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
        for meta, pref in ((KAYKIT, ""), (FOREST, "forest/"), (EXTRA, "extra/")):
            def group(n, pref=pref):
                p = KAY_MODELS[n]
                return (p.startswith(pref) if pref else not (p.startswith("forest/") or p.startswith("extra/")))
            used = sorted(n for n in self.src.kay_used if group(n))
            if not used:
                continue
            credits.append({
                "pack": meta["pack"], "author": meta["author"], "license": "CC0 1.0", "licenseUrl": CC0_URL,
                "url": meta["url"], "mirror": meta["mirror"],
                "mirrorPath": "gltf" if pref == "forest/" else "Asset4/gltf" if pref == "extra/" else "addons/kaykit_medieval_hexagon_pack/Assets/gltf",
                "licenseFile": meta["mirror"] if pref else f"{meta['mirror']}/blob/main/{meta['license_file']}",
                "note": "modèles 3D rendus en PNG par tools/render_kaykit.js (élévation 30°, azimut −30°, 120 px/unité ; les dalles plates à la verticale)",
                "files": sorted(KAY_MODELS[n][len(pref):] + ".gltf" for n in used),
            })
        if self.per_pack["animaux3d"]:
            prov = json.loads((self.animals_root / "PROVENANCE.json").read_text(encoding="utf-8"))
            used = {c["model"] for c in ANIMALS.values()}
            groups = {}
            for m in used:
                pm = prov["models"][m]
                groups.setdefault((pm["licence"], pm.get("mirror", prov["mirror"])), []).append(m)
            for (lic, mirror), mods in sorted(groups.items()):
                label, url = ("CC0 1.0", CC0_URL) if lic == "CC0" else ("CC BY 3.0", "https://creativecommons.org/licenses/by/3.0/")
                credits.append({
                    "pack": "Animaux 3D" + (" (domaine public)" if lic == "CC0" else " (attribution)"),
                    "author": ", ".join(sorted({prov["models"][m]["source"].split("—")[-1].strip().replace('"', "") for m in mods})),
                    "license": label, "licenseUrl": url,
                    "url": "https://poly.pizza/", "mirror": mirror, "mirrorPath": "models",
                    "licenseFile": mirror,
                    "note": "modèles glTF rendus de profil en bandes d'images par tools/render_animals.js (élévation 30°, azimut −30°)",
                    "files": sorted(f"{m}.glb — {prov['models'][m]['source']}" for m in sorted(mods)),
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


def check_water_colours():
    """L'eau douce du pipeline doit être exactement celle que `render.js` calcule.

    Deux tables de couleurs qui disent la même chose finissent toujours par diverger, et la divergence
    ne se voit qu'en jeu, des semaines plus tard. On recalcule donc ici, depuis SEA et CREUX lus dans
    `render.js`, ce que les flaques et la carte de la tuile d'eau devraient valoir, et on refuse de
    construire si la table ci-dessus ne correspond plus.
    """
    src = (ROOT / "src" / "game" / "render.js").read_text(encoding="utf-8")
    m = re.search(r"const SEA = \{([^}]*)\};", src)
    if not m:
        raise RuntimeError("render.js : constante SEA introuvable")
    sea = {k: [a, b] for k, a, b in re.findall(r"(\w+): \['(#\w{6})', '(#\w{6})'\]", m.group(1))}
    c = re.search(r"const CREUX = \{[^}]*shoal: \[([\d., ]+)\][^}]*edge: \[([\d., ]+)\]", src)
    if not c:
        raise RuntimeError("render.js : constante CREUX introuvable")
    kshoal = [float(x) for x in c.group(1).split(",")]
    kedge = [float(x) for x in c.group(2).split(",")]
    ksurf = [(1 + k) / 2 for k in kshoal]   # cf. SURFACE dans render.js
    for sai in SEASONS:
        haut, bas = (hex2rgb(sea[sai][0]), hex2rgb(sea[sai][1]))
        mid = [(a + b) / 2 for a, b in zip(haut, bas)]
        surf = [v * k for v, k in zip(mid, ksurf)]
        attendu = "#%02x%02x%02x" % tuple(max(0, min(255, round(v))) for v in surf)
        bord = "#%02x%02x%02x" % tuple(max(0, min(255, round(v * k))) for v, k in zip(mid, kedge))
        if COLORS["water"][sai] != attendu or COLORS["water_edge"][sai] != bord:
            raise RuntimeError(
                f"eau douce désaccordée de la mer ({sai}) : le pipeline dit "
                f"{COLORS['water'][sai]} / {COLORS['water_edge'][sai]}, render.js calcule {attendu} / {bord}")


def check_kaykit_license(kay_root):
    p = kay_root / KAYKIT["license_file"]
    if not p.exists():
        raise RuntimeError(f"Pack KayKit introuvable : {p}")
    txt = p.read_text(encoding="utf-8", errors="replace")
    if "creativecommons.org/publicdomain/zero/1.0" not in txt:
        raise RuntimeError(f"Licence CC0 introuvable dans {p}")
    KAYKIT["license_text_path"] = KAYKIT["license_file"]


def check_forest_license(forest_root):
    p = forest_root / FOREST["license_file"]
    if not p.exists():
        raise RuntimeError(f"Pack Forest introuvable : {p}")
    txt = p.read_text(encoding="utf-8", errors="replace")
    if "creativecommons.org/publicdomain/zero/1.0" not in txt:
        raise RuntimeError(f"Licence CC0 introuvable dans {p}")
    FOREST["license_text_path"] = FOREST["license_file"]


def check_extra_license(extra_root):
    p = extra_root / EXTRA["license_file"]
    if not p.exists():
        raise RuntimeError(f"Pack EXTRA introuvable : {p}")
    txt = p.read_text(encoding="utf-8", errors="replace")
    if "creativecommons.org/publicdomain/zero/1.0" not in txt:
        raise RuntimeError(f"Licence CC0 introuvable dans {p}")
    EXTRA["license_text_path"] = EXTRA["license_file"]


def check_animals_licenses(animals_root):
    """Chaque modèle d'animal doit porter une licence libre non virale (CC0 ou CC-BY)."""
    p = animals_root / "PROVENANCE.json"
    if not p.exists():
        raise RuntimeError(f"Provenance des animaux 3D introuvable : {p}")
    prov = json.loads(p.read_text(encoding="utf-8"))["models"]
    for sp, cfg in ANIMALS.items():
        m = cfg["model"]
        if m not in prov:
            raise RuntimeError(f"{sp} : modèle « {m} » absent de PROVENANCE.json")
        lic = prov[m]["licence"]
        if lic not in ("CC0", "CC-BY"):
            raise RuntimeError(f"{sp} : licence « {lic} » non admise (CC0 ou CC-BY attendues)")
        if not (animals_root / prov[m]["file"]).exists():
            raise RuntimeError(f"{sp} : fichier absent ({prov[m]['file']})")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=os.environ.get("KENNEY_ROOT", "/home/user/etdofresh/kenney.nl"))
    ap.add_argument("--kaykit", default=os.environ.get("KAYKIT_ROOT", "/home/user/kaykit/KayKit-Medieval-Hexagon-Pack-1.0"))
    ap.add_argument("--animaux", default=os.environ.get("ANIMAUX3D_ROOT", "/home/user/animaux3d"))
    ap.add_argument("--forest", default=os.environ.get("FOREST_ROOT", "/home/user/kaykit/KayKit-Forest-Nature-Pack-1.0"))
    ap.add_argument("--extra", default=os.environ.get("EXTRA_ROOT", "/home/user/kaykit/extra"))
    ap.add_argument("--out", default=str(ROOT))
    ap.add_argument("--rebuild-cache", action="store_true", help="re-rasterise les SVG et ré-extrait les sprites 2×")
    ap.add_argument("--sheets", action="store_true", help="écrit des planches-contact par saison dans tools/cache/sheets/")
    args = ap.parse_args()
    src_root, repo, kay_root = Path(args.src), Path(args.out), Path(args.kaykit)
    animals_root = Path(args.animaux)
    check_water_colours()
    check_licenses(src_root)
    check_kaykit_license(kay_root)
    check_forest_license(Path(args.forest))
    check_extra_license(Path(args.extra))
    check_animals_licenses(animals_root)
    b = Builder(src_root, repo, sheets=args.sheets, kay_root=kay_root, animals_root=animals_root,
                forest_root=Path(args.forest), extra_root=Path(args.extra) / "Asset4")
    b.src.prepare(rebuild=args.rebuild_cache)
    b.build_tiles()
    b.build_deco()
    b.build_fauna()
    b.build_sea()
    b.build_fx()
    b.build_ui()
    b.build_badges()
    b.build_archetype_badges()
    if args.sheets:
        b.contact_sheets()
    b.finish()


if __name__ == "__main__":
    main()
