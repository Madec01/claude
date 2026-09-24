#!/usr/bin/env python3
"""Écrit assets/version.json : une empreinte du contenu de assets/ (chemins et octets), dont le service worker fait
le nom de son cache. Elle change dès qu'un fichier d'assets change, et seulement alors : le jeu en ligne ne sert
jamais une vieille image par oubli d'un numéro à incrémenter.

Usage : python3 tools/version_assets.py            écrit le fichier s'il a changé
        python3 tools/version_assets.py --check    ne fait que vérifier (code 1 s'il n'est pas à jour) — suite.sh le fait
"""
import hashlib, json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
VERSION_FILE = ASSETS / "version.json"


def empreinte() -> str:
    h = hashlib.sha1()
    for p in sorted(ASSETS.rglob("*")):
        if p.is_file() and p != VERSION_FILE:
            h.update(str(p.relative_to(ASSETS)).encode("utf-8")); h.update(b"\0"); h.update(p.read_bytes()); h.update(b"\0")
    return h.hexdigest()[:10]


def main() -> int:
    v = empreinte()
    actuel = None
    if VERSION_FILE.exists():
        try: actuel = json.loads(VERSION_FILE.read_text(encoding="utf-8")).get("assets")
        except Exception: actuel = None
    if "--check" in sys.argv:
        if actuel == v: return 0
        print(f"assets/version.json n'est pas à jour ({actuel} ≠ {v}) : lance python3 tools/version_assets.py", file=sys.stderr); return 1
    if actuel == v: print(f"assets/version.json déjà à jour : {v}"); return 0
    VERSION_FILE.write_text(json.dumps({"assets": v}) + "\n", encoding="utf-8")
    print(f"assets/version.json : {actuel} → {v}"); return 0


if __name__ == "__main__":
    sys.exit(main())
