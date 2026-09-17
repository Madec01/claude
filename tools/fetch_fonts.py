#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Polices « Feux de Brume » — téléchargement des WOFF2 (sous-ensembles latin et
latin-ext) depuis Google Fonts, écriture de css/fonts.css (chemins relatifs,
font-display: swap), de assets/fonts/LICENSES.md et de assets/credits/fonts.json.

Google Fonts ne renvoie du WOFF2 qu'avec un User-Agent de navigateur moderne.
Relançable : les fichiers sont réécrits depuis les sources.

Usage :  python3 tools/fetch_fonts.py [--out /chemin/repo]
"""
import argparse
import json
import re
import subprocess
from pathlib import Path

UA = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36")
CSS_URL = ("https://fonts.googleapis.com/css2?"
           "family=IM+Fell+English:ital@0;1"
           "&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500"
           "&family=Homemade+Apple&display=swap")
SUBSETS = ("latin", "latin-ext")
GF = "https://raw.githubusercontent.com/google/fonts/main/"

FAMILIES = {
    "IM Fell English": dict(
        slug="imfellenglish", author="Igino Marini (iginomarini.com)", license="SIL Open Font License 1.1",
        licenseUrl="https://openfontlicense.org/open-font-license-official-text/",
        licenseFile=GF + "ofl/imfellenglish/OFL.txt", url="https://fonts.google.com/specimen/IM+Fell+English",
        role="titres"),
    "Cormorant Garamond": dict(
        slug="cormorantgaramond", author="Christian Thalmann (Catharsis Fonts)", license="SIL Open Font License 1.1",
        licenseUrl="https://openfontlicense.org/open-font-license-official-text/",
        licenseFile=GF + "ofl/cormorantgaramond/OFL.txt", url="https://fonts.google.com/specimen/Cormorant+Garamond",
        role="corps de texte, HUD"),
    "Homemade Apple": dict(
        slug="homemadeapple", author="Font Diner (fontdiner.com)", license="Apache License 2.0",
        licenseUrl="https://www.apache.org/licenses/LICENSE-2.0",
        licenseFile=GF + "apache/homemadeapple/LICENSE.txt", url="https://fonts.google.com/specimen/Homemade+Apple",
        role="écriture manuscrite des pages de journal"),
}


def fetch(url, dest=None):
    cmd = ["curl", "-sSfL", "-A", UA, url] + (["-o", str(dest)] if dest else [])
    r = subprocess.run(cmd, capture_output=True, text=(dest is None))
    if r.returncode != 0:
        raise RuntimeError(f"curl a échoué pour {url}: {r.stderr}")
    return r.stdout if dest is None else None


def parse_css(css):
    """Renvoie la liste des blocs @font-face (subset, family, style, weight, url, unicode_range)."""
    blocks = []
    for m in re.finditer(r"/\*\s*([\w-]+)\s*\*/\s*@font-face\s*\{(.*?)\}", css, re.S):
        subset, body = m.group(1), m.group(2)
        def prop(name):
            mm = re.search(name + r"\s*:\s*([^;]+);", body)
            return mm.group(1).strip() if mm else None
        url = re.search(r"url\(([^)]+)\)", body).group(1)
        blocks.append(dict(subset=subset, family=prop("font-family").strip("'\""), style=prop("font-style"),
                           weight=prop("font-weight"), url=url, unicode_range=prop("unicode-range")))
    return blocks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=str(Path(__file__).resolve().parent.parent))
    args = ap.parse_args()
    repo = Path(args.out)
    fonts_dir = repo / "assets" / "fonts"
    fonts_dir.mkdir(parents=True, exist_ok=True)
    (repo / "css").mkdir(exist_ok=True)

    css = fetch(CSS_URL)
    if "woff2" not in css:
        raise RuntimeError("Google Fonts n'a pas renvoyé de WOFF2 (User-Agent ?)")
    blocks = [b for b in parse_css(css) if b["subset"] in SUBSETS]

    # Regroupement par (famille, style, subset, url) : Cormorant Garamond est servi en police
    # variable (un seul fichier pour 400-700), Google répète alors la même URL par graisse.
    groups = {}
    for b in blocks:
        k = (b["family"], b["style"], b["subset"], b["url"])
        g = groups.setdefault(k, dict(b, weights=[]))
        g["weights"].append(int(b["weight"]))

    faces, files_by_family = [], {f: [] for f in FAMILIES}
    for (family, style, subset, url), g in groups.items():
        ws = sorted(set(g["weights"]))
        weight = f"{ws[0]} {ws[-1]}" if len(ws) > 1 else str(ws[0])
        slug = FAMILIES[family]["slug"]
        name = f"{slug}-{style}-{weight.replace(' ', '-')}-{subset}.woff2"
        fetch(url, fonts_dir / name)
        if (fonts_dir / name).stat().st_size < 1000:
            raise RuntimeError(f"Fichier suspect : {name}")
        faces.append(dict(family=family, style=style, weight=weight, subset=subset, file=name,
                          unicode_range=g["unicode_range"], variable=len(ws) > 1, source=url))
        files_by_family[family].append(f"assets/fonts/{name}")

    # Nettoyage des WOFF2 orphelins
    keep = {f["file"] for f in faces}
    for p in fonts_dir.glob("*.woff2"):
        if p.name not in keep:
            p.unlink()

    # css/fonts.css
    order = {"IM Fell English": 0, "Cormorant Garamond": 1, "Homemade Apple": 2}
    faces.sort(key=lambda f: (order[f["family"]], f["style"], f["weight"], f["subset"]))
    out = ["/* Polices auto-hébergées — généré par tools/fetch_fonts.py (ne pas éditer à la main). */",
           "/* IM Fell English & Cormorant Garamond : SIL OFL 1.1 ; Homemade Apple : Apache 2.0 — voir assets/fonts/LICENSES.md */", ""]
    for f in faces:
        out += ["@font-face {",
                f"  font-family: '{f['family']}';",
                f"  font-style: {f['style']};",
                f"  font-weight: {f['weight']};",
                "  font-display: swap;",
                f"  src: url('../assets/fonts/{f['file']}') format('woff2');",
                f"  unicode-range: {f['unicode_range']};",
                "}", ""]
    out += [":root {",
            "  --font-title: 'IM Fell English', 'Times New Roman', Georgia, serif;",
            "  --font-body: 'Cormorant Garamond', Garamond, Georgia, serif;",
            "  --font-hand: 'Homemade Apple', 'Segoe Script', cursive;",
            "}", ""]
    (repo / "css" / "fonts.css").write_text("\n".join(out), encoding="utf-8")

    # LICENSES.md (textes de licence récupérés depuis le dépôt google/fonts)
    md = ["# Licences des polices", "",
          "Polices téléchargées depuis Google Fonts (fonts.gstatic.com), sous-ensembles latin et latin-ext uniquement,",
          "auto-hébergées dans ce dossier. Les textes ci-dessous sont copiés depuis le dépôt github.com/google/fonts.", ""]
    md += ["| Police | Auteur | Licence | Usage |", "|---|---|---|---|"]
    for fam, meta in FAMILIES.items():
        md.append(f"| {fam} | {meta['author']} | {meta['license']} | {meta['role']} |")
    md.append("")
    for fam, meta in FAMILIES.items():
        txt = fetch(meta["licenseFile"])
        md += [f"## {fam}", "", f"- Auteur : {meta['author']}", f"- Licence : {meta['license']} ({meta['licenseUrl']})",
               f"- Source : {meta['url']}", f"- Fichiers : " + ", ".join(sorted(Path(p).name for p in files_by_family[fam])),
               f"- Texte de licence d'origine : {meta['licenseFile']}", "", "```text", txt.rstrip(), "```", ""]
    (fonts_dir / "LICENSES.md").write_text("\n".join(md), encoding="utf-8")

    # assets/credits/fonts.json (fusionné dans images.json par build_images.py)
    credits = []
    for fam, meta in FAMILIES.items():
        credits.append(dict(pack=fam, type="font", author=meta["author"], license=meta["license"],
                            licenseUrl=meta["licenseUrl"], licenseFile=meta["licenseFile"], url=meta["url"],
                            mirror="https://fonts.gstatic.com", files=sorted(files_by_family[fam])))
    cred = repo / "assets" / "credits"
    cred.mkdir(parents=True, exist_ok=True)
    (cred / "fonts.json").write_text(json.dumps(credits, ensure_ascii=False, indent=1), encoding="utf-8")

    for f in faces:
        print(f"{f['family']:20s} {f['style']:7s} {f['weight']:8s} {f['subset']:9s} {f['file']} "
              f"({(fonts_dir / f['file']).stat().st_size // 1024} Ko)")
    print("css :", repo / "css" / "fonts.css")


if __name__ == "__main__":
    main()
