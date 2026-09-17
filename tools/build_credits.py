#!/usr/bin/env python3
"""Génère CREDITS.md à partir de assets/credits/*.json (images, audio, polices)."""
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def load(name):
    p = os.path.join(ROOT, 'assets/credits', name)
    if not os.path.exists(p): return []
    d = json.load(open(p, encoding='utf-8'))
    if isinstance(d, dict): d = d.get('works') or d.get('items') or d.get('entries') or d.get('packs') or []
    return d

def line(e):
    name = e.get('pack') or e.get('title') or e.get('name') or e.get('work') or ''
    author = e.get('author') or e.get('artist') or ''
    lic = e.get('license') or ''
    url = e.get('url') or e.get('source') or e.get('source_url') or ''
    licurl = e.get('licenseUrl') or e.get('license_url') or ''
    mirror = e.get('mirror') or ''
    files = e.get('files') or []
    out = f"- **{name}**"
    if author: out += f" — {author}"
    if lic: out += f" — licence {lic}" + (f" ([texte]({licurl}))" if licurl else '')
    if url: out += f" — [source]({url})"
    if mirror: out += f" — [miroir utilisé]({mirror})"
    if e.get('attribution'): out += f"\n  - Attribution : {e['attribution']}"
    if files: out += f"\n  - Fichiers : {len(files)}" if len(files) > 6 else f"\n  - Fichiers : {', '.join(files)}"
    return out

images, audio, fonts = load('images.json'), load('audio.json'), load('fonts.json')
music = [a for a in audio if 'macleod' in (a.get('author') or '').lower() or a.get('type') == 'music']
other = [a for a in audio if a not in music]
md = ["# Crédits — Cent Saisons", "",
      "Le code du jeu (dossiers `src/`, `css/`, `tools/`, `tests/`, `index.html`) est publié sous licence MIT (voir `LICENSE`).",
      "Toutes les œuvres ci-dessous appartiennent à leurs auteurs et sont utilisées selon leurs licences. Les sites des banques étant inaccessibles depuis l'environnement de production, les fichiers ont été récupérés depuis des miroirs GitHub des mêmes packs, dont la licence est embarquée.", "",
      "## Musique", ""] + [line(e) for e in music] + ["", "## Sons et ambiances", ""] + [line(e) for e in other] + ["", "## Graphismes", ""] + [line(e) for e in images] + ["", "## Polices", ""] + [line(e) for e in fonts] + ["",
      "## Remerciements", "", "Merci à Kenney, à Kevin MacLeod, aux contributeurs de Freesound et d'OpenGameArt, à Frank Wen (FluidR3) et aux auteurs des polices.", ""]
open(os.path.join(ROOT, 'CREDITS.md'), 'w', encoding='utf-8').write('\n'.join(md))
print(f"CREDITS.md : {len(music)} musiques, {len(other)} sons, {len(images)} packs d'images, {len(fonts)} polices")
