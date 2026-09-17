#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pipeline images « Feux de Brume » — extraction, découpe, optimisation des sprites.

Lit les packs Kenney (CC0) depuis le miroir GitHub ETdoFresh/kenney.nl, écrit des
PNG individuels dans assets/img/<dossier>/, puis génère :
  - assets/img/manifest.json    (toutes les images produites, tailles, sources, notes)
  - assets/credits/images.json  (packs utilisés, licences, fichiers)

Relançable à volonté : les sorties sont régénérées depuis les sources.

Usage :  python3 tools/build_images.py [--src /chemin/vers/kenney.nl] [--out /chemin/repo]
"""
import argparse
import datetime as _dt
import io
import json
import os
import re
import sys
import zipfile
from pathlib import Path

from PIL import Image

# ---------------------------------------------------------------------------
# Packs sources (tous CC0 — le fichier de licence de chaque pack est vérifié)
# ---------------------------------------------------------------------------
MIRROR = "https://github.com/ETdoFresh/kenney.nl"
PACKS = {
    "kenney_piratepack": dict(pack="Pirate Pack", url="https://kenney.nl/assets/pirate-pack", license_file="License.txt"),
    "kenney_fishpack": dict(pack="Fish Pack", url="https://kenney.nl/assets/fish-pack", license_file="License.txt"),
    "cartographypack": dict(pack="Cartography Pack", url="https://kenney.nl/assets/cartography-pack", license_file="License.txt"),
    "particlePack_1.1": dict(pack="Particle Pack (1.1)", url="https://kenney.nl/assets/particle-pack", license_file="License.txt"),
    "smokeparticleassets": dict(pack="Smoke Particles", url="https://kenney.nl/assets/smoke-particles", license_file="license.txt"),
    "uipack_fixed": dict(pack="UI Pack", url="https://kenney.nl/assets/ui-pack", license_file="license.txt"),
    "gameicons": dict(pack="Game Icons", url="https://kenney.nl/assets/game-icons", license_file="license.txt"),
    "gameicons-expansion": dict(pack="Game Icons Expansion", url="https://kenney.nl/assets/game-icons-expansion", license_file="license.txt"),
    "crosshairpack_kenney": dict(pack="Crosshair Pack", url="https://kenney.nl/assets/crosshair-pack", license_file="License.txt"),
}
CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/"

# ---------------------------------------------------------------------------
# Description d'une image à produire
# ---------------------------------------------------------------------------
class Img:
    """Une image de sortie : clé (nom sans extension), dossier, pack, chemin source, note."""
    __slots__ = ("key", "folder", "pack", "src", "note", "trim", "scale", "rotate", "zip", "compose")

    def __init__(self, key, folder, pack, src, note="", trim=True, scale=1.0, rotate=0, zip=None, compose=None):
        self.key, self.folder, self.pack, self.src, self.note = key, folder, pack, src, note
        self.trim, self.scale, self.rotate, self.zip = trim, scale, rotate, zip
        self.compose = compose  # liste de chemins sources juxtaposés horizontalement (sprites multi-tuiles)


ENTRIES = []


def add(*a, **k):
    ENTRIES.append(Img(*a, **k))


# ===========================================================================
# A. NAVIRES  (kenney_piratepack — dossier « Retina » ; NB : pour Ships,
#    Ship parts et Effects, le dossier Retina de ce pack a exactement la même
#    résolution que « Default size » (66×113 pour un navire) : Kenney n'a
#    doublé que les tuiles. Aucun rasteriseur SVG n'est disponible ici.)
# ===========================================================================
PP = "kenney_piratepack"
SHIP_COLORS = ["white", "black", "red", "green", "blue", "yellow"]  # ordre Kenney ship (1..6)
SHIP_STATES = ["intact", "légèrement abîmé", "très abîmé", "détruit / coulé (gris)"]
for state in range(4):
    for ci, color in enumerate(SHIP_COLORS):
        n = state * 6 + ci + 1
        add(f"ship_{color}_{state}", "ships", PP, f"PNG/Retina/Ships/ship ({n}).png",
            f"Voile/emblème {color}, état {state} = {SHIP_STATES[state]}. Proue vers le haut (orientation native Kenney).")
for i in range(1, 4):
    add(f"dinghy_large_{i-1}", "ships", PP, f"PNG/Retina/Ships/dinghyLarge{i}.png", f"Grande chaloupe, état {i-1}. Proue vers le haut.")
    add(f"dinghy_small_{i-1}", "ships", PP, f"PNG/Retina/Ships/dinghySmall{i}.png", f"Petite chaloupe, état {i-1}. Proue vers le haut.")
for i in range(1, 5):
    add(f"hull_large_{i-1}", "ships", PP, f"PNG/Retina/Ship parts/hullLarge ({i}).png", f"Coque grande, état {i-1} ({SHIP_STATES[i-1]}).")
    add(f"hull_small_{i-1}", "ships", PP, f"PNG/Retina/Ship parts/hullSmall ({i}).png", f"Coque petite, état {i-1} ({SHIP_STATES[i-1]}).")
SAIL_LARGE_NOTES = {
    1: "grande voile jaune, croix d'os", 2: "grande voile blanche, unie", 3: "grande voile noire, crâne", 4: "grande voile rouge, croix",
    5: "grande voile verte, sabres", 6: "grande voile bleue, casque", 7: "grande voile jaune (variante)", 8: "grande voile noire unie",
    9: "voile noire, crâne (déchirée)", 10: "voile noire, croix (déchirée)", 11: "voile noire, sabres (déchirée)", 12: "voile noire, casque (déchirée)",
    13: "voile noire, os croisés (déchirée)", 14: "voile blanche déchirée", 15: "voile noire crâne déchirée 2", 16: "voile rouge déchirée",
    17: "voile verte déchirée", 18: "voile bleue déchirée", 19: "voile bleue repliée", 20: "voile jaune repliée", 21: "voile noire repliée",
    22: "voile rouge repliée", 23: "voile verte repliée", 24: "voile bleue repliée 2",
}
for i in range(1, 25):
    add(f"sail_large_{i}", "ships", PP, f"PNG/Retina/Ship parts/sailLarge ({i}).png", SAIL_LARGE_NOTES.get(i, "grande voile"))
for i in range(1, 14):
    add(f"sail_small_{i}", "ships", PP, f"PNG/Retina/Ship parts/sailSmall ({i}).png", "petite voile (1-7 déployées, 8-13 repliées)")
FLAG_NOTES = {1: "blanc", 2: "gris/noir", 3: "rouge", 4: "vert", 5: "bleu", 6: "jaune"}
for i in range(1, 7):
    add(f"flag_{i}", "ships", PP, f"PNG/Retina/Ship parts/flag ({i}).png", f"Fanion {FLAG_NOTES[i]}")
    add(f"crew_{i}", "ships", PP, f"PNG/Retina/Ship parts/crew ({i}).png", "Membre d'équipage vu de dessus")
add("nest", "ships", PP, "PNG/Retina/Ship parts/nest.png", "Nid de pie (vue de dessus)")
add("pole", "ships", PP, "PNG/Retina/Ship parts/pole.png", "Mât vu de dessus")
add("cannon", "ships", PP, "PNG/Retina/Ship parts/cannon.png", "Canon")
add("cannon_loose", "ships", PP, "PNG/Retina/Ship parts/cannonLoose.png", "Canon détaché (débris)")
add("cannon_mobile", "ships", PP, "PNG/Retina/Ship parts/cannonMobile.png", "Canon sur affût")
add("cannonball", "ships", PP, "PNG/Retina/Ship parts/cannonBall.png", "Boulet")
for i in range(1, 5):
    add(f"wood_{i}", "ships", PP, f"PNG/Retina/Ship parts/wood ({i}).png", "Planche de bois (éclats / débris flottants)")

# ===========================================================================
# B. TUILES  (kenney_piratepack PNG/Retina/Tiles, 128×128). Les tuiles de
#    grille ne sont PAS découpées (trim=False) pour conserver leur alignement
#    dans la cellule 128×128 ; seuls les objets isolés (rochers, plantes,
#    tours nues) sont découpés.
#    Convention des suffixes : « edge_n » = rive au NORD (eau au nord, sable
#    au sud) ; « corner_nw » = coin extérieur arrondi au nord-ouest (eau au
#    nord et à l'ouest) ; « inner_se » = ombrage intérieur (coin rentrant)
#    au sud-est ; « grass_s » = bande d'herbe le long du bord sud ;
#    « sand_grass_inner_nw » = herbe sur les bords nord + ouest, sable au SE.
#    Murs : « wall_v » = mur nord-sud, « wall_h » = mur est-ouest ;
#    « tower_wall_ns » = tour reliée à un mur au nord et au sud ;
#    « wall_end_n » = mur venant du sud terminé (bout arrondi) au nord.
# ===========================================================================
def T(n):
    return f"PNG/Retina/Tiles/tile_{n:02d}.png"

TILE_MAP = [  # (clé, n° tuile, note, trim)
    ("water", 73, "Tuile d'eau unie (bleu clair, deux ondulations). À teinter en bleu nuit par le rendu.", False),
    # sable — bord de mer
    ("sand_corner_nw", 1, "Sable, coin extérieur arrondi nord-ouest", False),
    ("sand_edge_n", 2, "Sable, rive au nord", False),
    ("sand_corner_ne", 3, "Sable, coin extérieur arrondi nord-est", False),
    ("sand_edge_w", 17, "Sable, rive à l'ouest", False),
    ("sand_full", 18, "Sable uni", False),
    ("sand_edge_e", 19, "Sable, rive à l'est", False),
    ("sand_corner_sw", 33, "Sable, coin extérieur arrondi sud-ouest", False),
    ("sand_edge_s", 34, "Sable, rive au sud", False),
    ("sand_corner_se", 35, "Sable, coin extérieur arrondi sud-est", False),
    ("sand_inner_se", 4, "Sable, ombrage intérieur (coin rentrant) au sud-est", False),
    ("sand_inner_sw", 5, "Sable, ombrage intérieur au sud-ouest", False),
    ("sand_inner_ne", 20, "Sable, ombrage intérieur au nord-est", False),
    ("sand_inner_nw", 21, "Sable, ombrage intérieur au nord-ouest", False),
    ("sand_traces_1", 68, "Sable avec traces / gravillons (variante 1)", False),
    ("sand_traces_2", 69, "Sable avec traces / gravillons (variante 2)", False),
    # sable + herbe
    ("sand_corner_nw_grass", 6, "Sable coin NW, herbe dans le coin sud-est", False),
    ("sand_edge_n_grass_s", 7, "Sable rive nord, bande d'herbe au sud", False),
    ("sand_edge_n_grass_s_2", 8, "Sable rive nord, herbe au sud (bord irrégulier)", False),
    ("sand_corner_ne_grass", 9, "Sable coin NE, herbe dans le coin sud-ouest", False),
    ("sand_edge_w_grass_e", 22, "Sable rive ouest, herbe à l'est", False),
    ("sand_edge_e_grass_w", 25, "Sable rive est, herbe à l'ouest", False),
    ("sand_edge_w_grass_e_2", 38, "Sable rive ouest, herbe à l'est (bord irrégulier)", False),
    ("sand_edge_e_grass_w_2", 41, "Sable rive est, herbe à l'ouest (bord irrégulier)", False),
    ("sand_grass_inner_nw", 36, "Herbe sur les bords nord + ouest, sable au sud-est", False),
    ("sand_grass_inner_ne", 37, "Herbe sur les bords nord + est, sable au sud-ouest", False),
    ("sand_grass_inner_sw", 52, "Herbe sur les bords sud + ouest, sable au nord-est", False),
    ("sand_grass_inner_se", 53, "Herbe sur les bords sud + est, sable au nord-ouest", False),
    ("sand_corner_sw_grass", 54, "Sable coin SW, herbe dans le coin nord-est", False),
    ("sand_edge_s_grass_n", 55, "Sable rive sud, bande d'herbe au nord", False),
    ("sand_edge_s_grass_n_2", 56, "Sable rive sud, herbe au nord (bord irrégulier)", False),
    ("sand_corner_se_grass", 57, "Sable coin SE, herbe dans le coin nord-ouest", False),
    # herbe
    ("grass_full", 23, "Herbe unie", False),
    ("grass_speckled_1", 24, "Herbe avec cailloux clairs", False),
    ("grass_speckled_2", 39, "Herbe mouchetée (variante 2)", False),
    ("grass_speckled_3", 40, "Herbe mouchetée (variante 3)", False),
    # pierre (plateau rocheux gris)
    ("stone_corner_nw", 10, "Sol de pierre gris, coin extérieur nord-ouest", False),
    ("stone_edge_n", 11, "Sol de pierre, bord nord", False),
    ("stone_corner_ne", 12, "Sol de pierre, coin extérieur nord-est", False),
    ("stone_edge_w", 26, "Sol de pierre, bord ouest", False),
    ("stone_full", 27, "Sol de pierre uni", False),
    ("stone_edge_e", 28, "Sol de pierre, bord est", False),
    ("stone_corner_sw", 42, "Sol de pierre, coin extérieur sud-ouest", False),
    ("stone_edge_s", 43, "Sol de pierre, bord sud", False),
    ("stone_corner_se", 44, "Sol de pierre, coin extérieur sud-est", False),
    ("stone_inner_se", 58, "Sol de pierre, coin rentrant sud-est", False),
    ("stone_inner_sw", 59, "Sol de pierre, coin rentrant sud-ouest", False),
    ("stone_inner_ne", 74, "Sol de pierre, coin rentrant nord-est", False),
    ("stone_inner_nw", 75, "Sol de pierre, coin rentrant nord-ouest", False),
    # rochers (fond transparent : à poser sur l'eau)
    ("rock_1", 49, "Rocher gris (petit) — dans l'eau", True),
    ("rock_2", 50, "Rocher gris (grand, allongé) — dans l'eau", True),
    ("rock_3", 51, "Rocher gris (moyen) — dans l'eau", True),
    ("rock_4", 65, "Rocher avec algues (petit)", True),
    ("rock_5", 66, "Rocher avec algues (grand)", True),
    ("rock_6", 67, "Rocher avec algues (moyen)", True),
    ("rock_7", 85, "Rocher + plantes sur fond de sable (tuile pleine)", False),
    ("rock_8", 86, "Rocher + plantes sur sable avec herbe au nord (tuile pleine)", False),
    # épaves / débris (tuiles pleines sur sable)
    ("wreck_1", 81, "Épave de chaloupe échouée sur le sable", False),
    ("wreck_2", 82, "Épave échouée sur sable, herbe au nord", False),
    ("debris_1", 83, "Tonneau + planche sur le sable", False),
    ("debris_2", 84, "Tonneau + planche sur sable, herbe au nord", False),
    # plantes
    ("plant_1", 70, "Plante à trois feuilles", True),
    ("plant_2", 71, "Grande plante en étoile (palmier vu de dessus)", True),
    ("plant_3", 72, "Plante étoilée moyenne", True),
    ("plant_4", 87, "Petite pousse isolée", True),
    ("plant_5", 88, "Trois petites pousses", True),
    # tours rondes
    ("tower_round", 13, "Tour ronde en pierre vue de dessus (base du phare)", True),
    ("tower_round_hatch", 14, "Tour ronde avec trappe carrée au centre", True),
    ("tower_wall_ns", 29, "Tour ronde reliée à un mur nord + sud", False),
    ("tower_wall_ew", 30, "Tour ronde reliée à un mur est + ouest", False),
    ("tower_wall_s", 45, "Tour ronde reliée à un mur au sud", False),
    ("tower_wall_e", 46, "Tour ronde reliée à un mur à l'est", False),
    ("tower_wall_n", 61, "Tour ronde reliée à un mur au nord", False),
    ("tower_wall_w", 62, "Tour ronde reliée à un mur à l'ouest", False),
    ("tower_wall_se", 77, "Tour ronde reliée à un mur au sud + est", False),
    ("tower_wall_sw", 78, "Tour ronde reliée à un mur au sud + ouest", False),
    ("tower_wall_ne", 93, "Tour ronde reliée à un mur au nord + est", False),
    ("tower_wall_nw", 94, "Tour ronde reliée à un mur au nord + ouest", False),
    # murs de pierre
    ("wall_v", 15, "Mur de pierre nord-sud", False),
    ("wall_h", 16, "Mur de pierre est-ouest", False),
    ("wall_end_n", 63, "Mur venant du sud, bout arrondi au nord", False),
    ("wall_end_w", 64, "Mur venant de l'est, bout arrondi à l'ouest", False),
    ("wall_end_s", 79, "Mur venant du nord, bout arrondi au sud", False),
    ("wall_end_e", 80, "Mur venant de l'ouest, bout arrondi à l'est", False),
    ("wall_v_broken_1", 89, "Mur nord-sud éboulé (variante 1)", False),
    ("wall_h_broken_1", 90, "Mur est-ouest éboulé (variante 1)", False),
    ("wall_v_broken_2", 91, "Mur nord-sud éboulé (variante 2)", False),
    ("wall_h_broken_2", 92, "Mur est-ouest éboulé (variante 2)", False),
    ("wall_v_bastion", 95, "Mur nord-sud avec bastion rond au centre", False),
    ("wall_h_bastion", 96, "Mur est-ouest avec bastion rond au centre", False),
    ("wall_v_cart_1", 31, "Mur nord-sud avec chariot / affût (orienté nord)", False),
    ("wall_v_cart_2", 32, "Mur nord-sud avec chariot / affût (orienté sud)", False),
    ("wall_h_cart_1", 47, "Mur est-ouest avec chariot / affût (orienté ouest)", False),
    ("wall_h_cart_2", 48, "Mur est-ouest avec chariot / affût (orienté est)", False),
    # quais : le Pirate Pack n'a pas de ponton en bois isolé ; les portes de
    # bois dans un mur de pierre sont ce qui s'en rapproche le plus.
    ("dock_1", 60, "Porte de bois dans un mur nord-sud — sert de ponton/quai (pas de vrai ponton dans le pack)", False),
    ("dock_2", 76, "Porte de bois dans un mur est-ouest — sert de ponton/quai (pas de vrai ponton dans le pack)", False),
]
for key, n, note, trim in TILE_MAP:
    add(key, "tiles", PP, T(n), note, trim=trim)
# Aucune tour plus petite n'existe dans le pack : version réduite à 50 %.
add("tower_round_small", "tiles", PP, T(13), "Réduction à 50 % (Lanczos) de tower_round — aucune tour plus petite dans le pack", trim=True, scale=0.5)

# ===========================================================================
# C. EFFETS
# ===========================================================================
for i in range(1, 4):
    add(f"explosion_{i}", "fx", PP, f"PNG/Retina/Effects/explosion{i}.png", f"Explosion, image {i}/3")
for i in range(1, 3):
    add(f"fire_{i}", "fx", PP, f"PNG/Retina/Effects/fire{i}.png", f"Feu, image {i}/2")

PA = "particlePack_1.1"
PAD = "PNG (Transparent)"
for i in range(1, 11):
    add(f"smoke_{i:02d}", "fx", PA, f"{PAD}/smoke_{i:02d}.png", "Fumée blanche (512 px source), à teinter")
for i in range(1, 4):
    add(f"light_{i:02d}", "fx", PA, f"{PAD}/light_{i:02d}.png", "Halo lumineux doux (faisceau / lanterne)")
add("flare_01", "fx", PA, f"{PAD}/flare_01.png", "Éclat horizontal de lentille")
for i in range(1, 6):
    add(f"circle_{i:02d}", "fx", PA, f"{PAD}/circle_{i:02d}.png", "Anneau / disque (ondes de la cloche, halo)")
for i in range(1, 4):
    add(f"twirl_{i:02d}", "fx", PA, f"{PAD}/twirl_{i:02d}.png", "Tourbillon (remous, courant)")
for i in range(1, 8):
    add(f"spark_{i:02d}", "fx", PA, f"{PAD}/spark_{i:02d}.png", "Étincelle / éclair")
for i in range(1, 10):
    add(f"star_{i:02d}", "fx", PA, f"{PAD}/star_{i:02d}.png", "Étoile / scintillement")
for i in range(1, 6):
    add(f"magic_{i:02d}", "fx", PA, f"{PAD}/magic_{i:02d}.png", "Symbole lumineux (la Bête, pages)")
for i in range(1, 4):
    add(f"scorch_{i:02d}", "fx", PA, f"{PAD}/scorch_{i:02d}.png", "Brûlure / tache")
for i in (1, 4, 7):
    add(f"trace_{i:02d}", "fx", PA, f"{PAD}/trace_{i:02d}.png", "Traînée verticale (pluie, sillage)")

SM = "smokeparticleassets"
for i in range(0, 25, 3):  # 9 bouffées réparties : 00, 03, …, 24
    add(f"whitepuff_{i:02d}", "fx", SM, f"PNG/White puff/whitePuff{i:02d}.png", "Bouffée blanche douce (écume, vapeur)")
for i in (0, 2, 4, 6):
    add(f"flash_{i:02d}", "fx", SM, f"PNG/Flash/flash{i:02d}.png", "Flash lumineux (aube, coup de foudre)")
# fog_1..6 : choisis automatiquement parmi les 25 whitePuff, les plus diffus
# (alpha moyen le plus faible dans leur boîte englobante). Voir select_fog().

# ===========================================================================
# D. CARTOGRAPHIE & UI
# ===========================================================================
CA = "cartographypack"
for k, f, note in [
    ("parchment_basic", "Textures/parchmentBasic.png", "Texture parchemin 1024², fond de carte / UI"),
    ("parchment_ancient", "Textures/parchmentAncient.png", "Texture parchemin ancien 1024²"),
    ("parchment_crinkled", "Textures/parchmentCrinkled.png", "Texture parchemin froissé 1024²"),
    ("parchment_folded", "Textures/parchmentFolded.png", "Texture parchemin plié 1024²"),
    ("parchment_folded_crinkled", "Textures/parchmentFoldedCrinkled.png", "Texture parchemin plié et froissé 1024²"),
]:
    add(k, "ui", CA, f, note, trim=False)
CARTO_ICONS = [
    ("compass", "compass", "Rose des vents (encre #2a2a2a sur transparent)"),
    ("lighthouse", "lighthouse", "Phare (icône de carte)"),
    ("ship_icon", "ship", "Navire (icône de carte)"),
    ("skull", "skull", "Crâne (naufrage, danger)"),
    ("banner", "banner", "Bannière verticale"),
    ("element_circle", "elementCircle", "Cartouche rond"),
    ("element_shield", "elementShield", "Cartouche écu"),
    ("element_square", "elementSquare", "Cartouche carré"),
    ("element_diamond", "elementDiamond", "Cartouche losange"),
    ("element_cross", "elementCross", "Cartouche en croix"),
    ("arrow_head", "arrowHead", "Flèche (tête)"),
    ("arrow_straight", "arrowStraight", "Flèche droite"),
    ("arrow_corner", "arrowCorner", "Flèche coudée"),
    ("arrow_small", "arrowSmall", "Petite flèche"),
    ("dock_icon", "dock", "Quai / ponton (icône de carte)"),
    ("rocks_icon", "rocks", "Rochers (icône de carte)"),
    ("rocks_icon_2", "rocksA", "Rochers, variante A"),
    ("rocks_icon_3", "rocksB", "Rochers, variante B"),
    ("waves_icon", "textureWater", "Motif de vagues (textureWater)"),
    ("tower_icon", "tower", "Tour (icône de carte)"),
    ("watchtower_icon", "watchtower", "Tour de guet sur pilotis"),
    ("flag_icon", "flag", "Drapeau (icône de carte)"),
    ("chest", "chest", "Coffre"),
    ("campfire_icon", "campfire", "Feu de camp"),
    ("path_straight", "pathStraight", "Tracé de route droit (encre)"),
    ("path_corner", "pathCorner", "Tracé de route coudé"),
    ("path_end", "pathEnd", "Tracé de route terminé (boucle)"),
    ("path_split", "pathSplit", "Tracé de route bifurquant"),
    ("lake_icon", "lake", "Étendue d'eau (icône)"),
    ("bush_icon", "bush", "Buisson"),
]
for k, f, note in CARTO_ICONS:
    add(k, "ui", CA, f"PNG/Retina/{f}.png", note)
# anchor_icon : aucune ancre dans le Cartography Pack (ni ailleurs dans les packs) — non produit.

GI = "gameicons"
GIE = "gameicons-expansion"
GAME_ICONS = [
    ("icon_gear", GI, "gear", "Engrenage (options)"),
    ("icon_audio_on", GI, "audioOn", "Son activé"),
    ("icon_audio_off", GI, "audioOff", "Son coupé"),
    ("icon_music_on", GI, "musicOn", "Musique activée"),
    ("icon_music_off", GI, "musicOff", "Musique coupée"),
    ("icon_pause", GI, "pause", "Pause"),
    ("icon_play", GI, "right", "Lecture — le pack n'a pas de « play » : triangle « right »"),
    ("icon_return", GI, "return", "Retour (flèche courbe)"),
    ("icon_home", GI, "home", "Accueil"),
    ("icon_star", GI, "star", "Étoile (Éclats)"),
    ("icon_question", GI, "question", "Aide"),
    ("icon_info", GI, "information", "Information"),
    ("icon_cross", GI, "cross", "Croix (fermer)"),
    ("icon_check", GI, "checkmark", "Coche"),
    ("icon_arrow_left", GI, "arrowLeft", "Flèche gauche"),
    ("icon_arrow_right", GI, "arrowRight", "Flèche droite"),
    ("icon_arrow_up", GI, "arrowUp", "Flèche haut"),
    ("icon_arrow_down", GI, "arrowDown", "Flèche bas"),
    ("icon_trophy", GI, "trophy", "Trophée"),
    ("icon_medal", GI, "medal1", "Médaille"),
    ("icon_leaderboard", GI, "leaderboardsSimple", "Classement"),
    ("icon_locked", GI, "locked", "Cadenas fermé"),
    ("icon_unlocked", GI, "unlocked", "Cadenas ouvert"),
    ("icon_fullscreen", GI, "larger", "Plein écran (agrandir)"),
    ("icon_fullscreen_exit", GI, "smaller", "Quitter le plein écran"),
    ("icon_exit", GI, "exit", "Quitter"),
    ("icon_wrench", GI, "wrench", "Clé (atelier)"),
    ("icon_flag", GIE, "flag", "Drapeau (depuis l'expansion)"),
    ("icon_target", GI, "target", "Cible"),
    ("icon_signal", GI, "signal3", "Signal (3 barres) — corne de brume"),
    ("icon_signal_low", GI, "siganl1", "Signal (1 barre) — nom Kenney mal orthographié « siganl1 »"),
    ("icon_warning", GI, "warning", "Avertissement"),
    ("icon_exclamation", GI, "exclamation", "Point d'exclamation"),
    ("icon_next", GI, "next", "Suivant"),
    ("icon_previous", GI, "previous", "Précédent"),
    ("icon_plus", GI, "plus", "Plus"),
    ("icon_minus", GI, "minus", "Moins"),
    ("icon_save", GI, "save", "Sauvegarde"),
    ("icon_power", GI, "power", "Marche / arrêt"),
    ("icon_stop", GI, "stop", "Stop"),
    ("icon_contrast", GI, "contrast", "Contraste (mode nuit)"),
    ("icon_menu", GI, "barsHorizontal", "Menu (trois barres)"),
    ("icon_key", GIE, "key", "Clé (pages / secrets)"),
    ("icon_diamond", GIE, "diamond", "Diamant"),
    ("icon_cloud", GIE, "cloud", "Nuage (brume, météo)"),
]
for k, pack, f, note in GAME_ICONS:
    add(k, "ui", pack, f"PNG/White/2x/{f}.png", note + " — blanc, 100 px")
# icon_clock : aucune horloge dans Game Icons / expansion — non produit (utiliser icon_signal ou un dessin canvas).

UI = "uipack_fixed"
for k, f, note in [
    ("panel_grey", "grey_panel", "Panneau 9-slice gris (bords 10 px)"),
    ("button_grey_normal", "grey_button02", "Bouton gris, état normal (avec ombre basse)"),
    ("button_grey_pressed", "grey_button03", "Bouton gris, état pressé (plat)"),
    ("slider_track", "grey_sliderHorizontal", "Piste de curseur horizontale 190×4"),
    ("slider_handle", "grey_circle", "Poignée ronde de curseur"),
    ("slider_end", "grey_sliderEnd", "Bout de piste de curseur"),
    ("checkbox_on", "grey_boxCheckmark", "Case cochée"),
    ("checkbox_off", "grey_box", "Case vide"),
    ("box_tick", "grey_boxTick", "Case avec coche fine"),
]:
    add(k, "ui", UI, f"PNG/{f}.png", note, trim=False)

CR = "crosshairpack_kenney"
add("crosshair_1", "ui", CR, "crosshair117.png", "Réticule fin : cercle simple (blanc, Retina 128 px)", zip="PNG/White Retina.zip")
add("crosshair_2", "ui", CR, "crosshair118.png", "Réticule fin : cercle + point central (blanc, Retina 128 px)", zip="PNG/White Retina.zip")

# ===========================================================================
# E. FAUNE  (kenney_fishpack PNG/Retina 128×128)
# ===========================================================================
FI = "kenney_fishpack"
def F(n):
    return f"PNG/Retina/fishTile_{n:03d}.png"
FISH = [  # (n° image A, n° image B (2e pose), note)
    (72, 73, "Poisson vert"), (74, 75, "Petit poisson violet"), (76, 77, "Poisson bleu"), (78, 79, "Poisson rouge"),
    (80, 81, "Poisson orange"), (100, 101, "Poisson-globe brun"), (102, 103, "Anguille grise courte"),
]
for i, (a, b, note) in enumerate(FISH, 1):
    add(f"fish_{i}", "fauna", FI, F(a), note + " — pose A, regarde vers la gauche")
    add(f"fish_{i}_b", "fauna", FI, F(b), note + " — pose B (animation 2 images)")
# Les anguilles longues occupent deux tuiles (queue + tête) : assemblage horizontal.
add("fish_8", "fauna", FI, F(104), "Anguille grise longue (2 tuiles assemblées 104+105) — pose A", compose=[F(104), F(105)])
add("fish_8_b", "fauna", FI, F(106), "Anguille grise longue (2 tuiles assemblées 106+107) — pose B", compose=[F(106), F(107)])
for i, n in enumerate((123, 124, 125), 1):
    add(f"bubble_{i}", "fauna", FI, F(n), ["Bulle (anneau)", "Bulle (pleine)", "Petite bulle (anneau)"][i - 1])
for i, n in enumerate((90, 94, 96), 1):
    add(f"bones_{i}", "fauna", FI, F(n), "Arête de poisson (décor lugubre)")
for i, n in enumerate((10, 14, 28, 32, 64, 66), 1):
    add(f"seaweed_{i}", "fauna", FI, F(n), "Algue (violette 1-2, verte 3-4, bleue 5-6)")
add("starfish_1", "fauna", FI, F(46), "Étoile de mer (petite)")
add("starfish_2", "fauna", FI, F(51), "Étoile de mer (grande)")
add("shell", "fauna", FI, F(18), "Coquillage rose sur fond de sable (tuile pleine)", trim=False)
# shark / octopus / jellyfish : absents du Fish Pack — non produits.

# ===========================================================================
# Traitement
# ===========================================================================
def load_source(src_root, e):
    p = src_root / e.pack
    if e.compose:
        parts = [Image.open(p / f).convert("RGBA") for f in e.compose]
        w = sum(im.width for im in parts)
        h = max(im.height for im in parts)
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        x = 0
        for im in parts:
            canvas.paste(im, (x, 0), im)
            x += im.width
        return canvas
    if e.zip:
        with zipfile.ZipFile(p / e.zip) as zf:
            name = next(n for n in zf.namelist() if n.endswith("/" + e.src) or n == e.src)
            return Image.open(io.BytesIO(zf.read(name))).copy()
    return Image.open(p / e.src)


def process(im, e):
    """Découpe (trim alpha), rotation, échelle. Renvoie (image, boîte d'origine)."""
    orig_w, orig_h = im.size
    box = (0, 0, orig_w, orig_h)
    rgba = im.convert("RGBA")
    if e.trim:
        bb = rgba.split()[3].getbbox()
        if bb is None:
            raise RuntimeError(f"{e.key}: image entièrement transparente")
        box = bb
        # crop() conserve la palette et la transparence d'un PNG palettisé (mode P) : plus léger
        im = im.crop(bb) if im.mode in ("RGBA", "LA", "P") else rgba.crop(bb)
    else:
        im = im if im.mode in ("RGBA", "P", "LA") else rgba
    if e.rotate:
        im = im.convert("RGBA").rotate(e.rotate, expand=True)
    if e.scale != 1.0:
        im = im.convert("RGBA")
        im = im.resize((max(1, round(im.width * e.scale)), max(1, round(im.height * e.scale))), Image.LANCZOS)
    return im, box


def select_fog(src_root):
    """Les 6 whitePuff les plus diffus (alpha moyen minimal dans la boîte englobante)."""
    scored = []
    for i in range(25):
        p = src_root / SM / "PNG/White puff" / f"whitePuff{i:02d}.png"
        a = Image.open(p).convert("RGBA").split()[3]
        bb = a.getbbox()
        a = a.crop(bb)
        mean = sum(a.get_flattened_data() if hasattr(a, "get_flattened_data") else a.getdata()) / (a.width * a.height)
        scored.append((mean, i))
    scored.sort()
    return [i for _, i in scored[:6]]


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
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent))
    args = ap.parse_args()
    src_root = Path(args.src)
    repo = Path(args.out)
    img_root = repo / "assets" / "img"

    check_licenses(src_root)

    for rank, i in enumerate(select_fog(src_root), 1):
        add(f"fog_{rank}", "fx", SM, f"PNG/White puff/whitePuff{i:02d}.png",
            "Nappe de brume : whitePuff le plus diffus (sélection automatique par alpha moyen), à agrandir ×3-4 et teinter #c9d3dc")

    keys = [e.key for e in ENTRIES]
    dups = {k for k in keys if keys.count(k) > 1}
    if dups:
        raise RuntimeError(f"Clés dupliquées : {sorted(dups)}")

    manifest = {}
    per_pack_files = {pid: [] for pid in PACKS}
    for e in ENTRIES:
        im = load_source(src_root, e)
        out, box = process(im, e)
        out_dir = img_root / e.folder
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"{e.key}.png"
        out.save(out_path, "PNG", optimize=True)
        # vérification
        with Image.open(out_path) as chk:
            chk.verify()
        with Image.open(out_path) as chk:
            w, h = chk.size
        size = out_path.stat().st_size
        if size > 2 * 1024 * 1024:
            raise RuntimeError(f"{out_path} dépasse 2 Mo ({size} octets)")
        rel = f"{e.folder}/{e.key}.png"
        entry = {
            "file": rel, "w": w, "h": h, "bytes": size,
            "source": e.pack, "original": " + ".join(e.compose) if e.compose else (e.zip + "!" if e.zip else "") + e.src,
            "note": e.note,
        }
        if e.trim:
            entry["trim"] = {"x": box[0], "y": box[1], "srcW": im.width, "srcH": im.height}
        else:
            entry["trim"] = None
        if e.scale != 1.0:
            entry["scale"] = e.scale
        if e.rotate:
            entry["rotate"] = e.rotate
        manifest[e.key] = entry
        per_pack_files[e.pack].append(rel)

    # Nettoyage des PNG orphelins dans assets/img (sorties d'une version précédente)
    produced = {img_root / v["file"] for v in manifest.values()}
    for p in img_root.rglob("*.png"):
        if p not in produced:
            p.unlink()

    manifest_doc = {
        "generated": _dt.datetime.now(_dt.timezone.utc).replace(microsecond=0).isoformat(),
        "generator": "tools/build_images.py",
        "conventions": {
            "orientation": "Navires : proue vers le haut (orientation native Kenney, aucune rotation appliquée).",
            "tiles": "Tuiles de grille 128×128 non découpées (trim=null) ; objets isolés découpés, offset d'origine dans « trim ».",
            "suffixes": "edge_n = rive au nord (eau au nord) ; corner_nw = coin extérieur arrondi NW ; inner_se = coin rentrant SE ; "
                        "sand_grass_inner_nw = herbe sur bords N+W ; wall_v = mur N-S ; tower_wall_ns = tour reliée N et S ; "
                        "wall_end_n = mur terminé au nord.",
            "missing": {
                "anchor_icon": "aucune ancre dans les packs",
                "icon_clock": "aucune horloge dans Game Icons",
                "shark/octopus/jellyfish": "absents du Fish Pack",
                "tourbillons/ondulations (tuiles)": "absents du Pirate Pack ; utiliser fx/twirl_* et fx/circle_*",
                "dock (ponton bois)": "absent du Pirate Pack ; dock_1/dock_2 sont les portes de bois dans un mur, dock_icon vient du Cartography Pack",
                "tower_round_small": "aucune tour plus petite ; réduction 50 % de tower_round",
                "retina navires": "dans ce pack les dossiers Retina Ships/Ship parts/Effects ont la même résolution que Default size (66×113)",
            },
        },
        "images": manifest,
    }
    (img_root / "manifest.json").write_text(json.dumps(manifest_doc, ensure_ascii=False, indent=1), encoding="utf-8")

    credits = []
    for pid, meta in PACKS.items():
        credits.append({
            "pack": meta["pack"], "author": "Kenney (kenney.nl)", "license": "CC0 1.0", "licenseUrl": CC0_URL,
            "licenseFile": f"{MIRROR}/blob/main/{meta['license_text_path']}",
            "url": meta["url"], "mirror": MIRROR, "mirrorPath": pid,
            "files": sorted(per_pack_files[pid]),
        })
    fonts_credits_path = repo / "assets" / "credits" / "fonts.json"
    if fonts_credits_path.exists():
        credits.extend(json.loads(fonts_credits_path.read_text(encoding="utf-8")))
    cred_dir = repo / "assets" / "credits"
    cred_dir.mkdir(parents=True, exist_ok=True)
    (cred_dir / "images.json").write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")

    # rapport
    by_folder = {}
    for v in manifest.values():
        f = v["file"].split("/")[0]
        by_folder.setdefault(f, [0, 0])
        by_folder[f][0] += 1
        by_folder[f][1] += v["bytes"]
    total = sum(v["bytes"] for v in manifest.values())
    for f, (n, b) in sorted(by_folder.items()):
        print(f"{f:8s} {n:4d} images  {b/1024:8.1f} Ko")
    print(f"TOTAL    {len(manifest):4d} images  {total/1024:8.1f} Ko")
    print("manifest :", img_root / "manifest.json")


if __name__ == "__main__":
    main()
