#!/usr/bin/env python3
"""
build_audio.py — pipeline audio reproductible de « Cent Saisons ».

Produit, à partir de sources libres présentes sur disque (miroirs GitHub) :
  assets/audio/music/*.ogg     boucles musicales (Kevin MacLeod, CC BY 4.0), q5, -16 LUFS
  assets/audio/ambience/*.ogg  boucles d'ambiance (Freesound CC0), q3, -20 LUFS, 60–90 s
  assets/audio/sfx/*.ogg       effets (CC0 + samples FluidR3_GM CC BY 3.0), q4, pics -3 dBFS
  assets/audio/manifest.json   registre machine (fichier, durée, boucle, source, auteur, licence)
  assets/credits/audio.json    crédits dédupliqués (œuvre, auteur, licence, URLs, miroir)

Dépendances : Python 3, numpy, imageio_ffmpeg (ffmpeg statique avec libvorbis).
Aucun oscillateur ni bruit synthétique : carillons de points, jingles de saison, accords de
bilan, etc. sont des montages de samples d'instruments réels (FluidR3_GM) ou d'enregistrements.

Usage : python3 tools/build_audio.py [--only music|ambience|sfx] [--keys a,b] [--verify-only]
Un build complet (sans --only ni --keys) supprime les .ogg obsolètes des trois dossiers.
"""
from __future__ import annotations

import argparse
import json
import math
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

import numpy as np

try:
    import imageio_ffmpeg

    FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:  # pragma: no cover
    FFMPEG = "ffmpeg"

SR = 44100
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "audio"
CREDITS_OUT = ROOT / "assets" / "credits" / "audio.json"
GAME = "Cent Saisons"

# ---------------------------------------------------------------------------
# Sources (miroirs locaux). Surchargeables par variables d'environnement.
# ---------------------------------------------------------------------------
KM = Path(os.environ.get("CS_KM", "/home/user/mirrors/km-audio"))
AMB = Path(os.environ.get("CS_AMBIENT", "/home/user/mirrors/omarchy-ambient/sounds"))
CC0 = Path(os.environ.get("CS_CC0", "/home/user/mirrors/cc0sounds"))
KENNEY = Path(os.environ.get("CS_KENNEY", "/home/user/etdofresh/kenney.nl"))
FLUID = Path(os.environ.get("CS_FLUID", "/home/user/mirrors/fluidr3"))
FLUID_URL = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/"

# Identifiants de « packs » (pour manifest + crédits)
P_KM = "km"
P_FS_BIRDS, P_FS_STREAM, P_FS_WIND, P_FS_RAIN, P_FS_CRICKETS, P_FS_WAVES = (
    "fs_birds", "fs_stream", "fs_wind", "fs_rain", "fs_crickets", "fs_waves")
P_RD1, P_RD_WM, P_RD2, P_RD_CRE, P_RD_CRE2, P_RD_RPG, P_RD_WATER = (
    "rd_100sfx", "rd_woodmetal", "rd_100sfx2", "rd_creature", "rd_creature2", "rd_rpg", "rd_water")
P_BB_WOOSH, P_BB_PAPER, P_BB_CUTTER = "bb_wooshes", "bb_paper", "bb_papercutter"
P_K_UI, P_K_IF, P_K_IMP, P_K_RPG = "kenney_ui", "kenney_interface", "kenney_impact", "kenney_rpg"
P_FLUID = "fluidr3"
P_FS_STORM = "fs_storm"

PACKS = {
    P_KM: dict(dir=KM, author="Kevin MacLeod", license="CC BY 4.0"),
    P_FS_BIRDS: dict(dir=AMB, author="felix.blume", license="CC0 1.0"),
    P_FS_STREAM: dict(dir=AMB, author="IceVFX", license="CC0 1.0"),
    P_FS_WIND: dict(dir=AMB, author="felix.blume", license="CC0 1.0"),
    P_FS_RAIN: dict(dir=AMB, author="richwise", license="CC0 1.0"),
    P_FS_CRICKETS: dict(dir=AMB, author="felix.blume", license="CC0 1.0"),
    P_FS_WAVES: dict(dir=AMB, author="SecureSubset", license="CC0 1.0"),
    P_FS_STORM: dict(dir=AMB, author="Sheyvan", license="CC0 1.0"),
    P_RD1: dict(dir=CC0 / "100-CC0-SFX", author="rubberduck", license="CC0 1.0"),
    P_RD_WM: dict(dir=CC0 / "100-CC0-wood-metal-SFX", author="rubberduck", license="CC0 1.0"),
    P_RD2: dict(dir=CC0 / "100-cc0-sfx-2", author="rubberduck", license="CC0 1.0"),
    P_RD_CRE: dict(dir=CC0 / "80-CC0-creature-SFX", author="rubberduck", license="CC0 1.0"),
    P_RD_CRE2: dict(dir=CC0 / "80-CC0-creature-sfx-2", author="rubberduck", license="CC0 1.0"),
    P_RD_RPG: dict(dir=CC0 / "80-CC0-RPG-SFX", author="rubberduck", license="CC0 1.0"),
    P_RD_WATER: dict(dir=CC0 / "40-cc0-water-splash-slime-sfx", author="rubberduck", license="CC0 1.0"),
    P_BB_WOOSH: dict(dir=CC0 / "Micro Pack - Organic Wooshes", author="Ben Burnes (Abstraction)", license="CC0 1.0"),
    P_BB_PAPER: dict(dir=CC0 / "bb - Books, Paper, Writing (Jan 2021)", author="Ben Burnes (Abstraction)", license="CC0 1.0"),
    P_BB_CUTTER: dict(dir=CC0 / "Micro Pack - Paper Cutter", author="Ben Burnes (Abstraction)", license="CC0 1.0"),
    P_K_UI: dict(dir=KENNEY / "kenney_uiaudio" / "Audio", author="Kenney", license="CC0 1.0"),
    P_K_IF: dict(dir=KENNEY / "kenney_interfacesounds" / "Audio", author="Kenney", license="CC0 1.0"),
    P_K_IMP: dict(dir=KENNEY / "kenney_impactsounds" / "Audio", author="Kenney", license="CC0 1.0"),
    P_K_RPG: dict(dir=KENNEY / "kenney_rpgaudio" / "Audio", author="Kenney", license="CC0 1.0"),
    P_FLUID: dict(dir=FLUID, author="Frank Wen", license="CC BY 3.0"),
}

CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/"
CCBY4_URL = "http://creativecommons.org/licenses/by/4.0/"
CCBY3_URL = "https://creativecommons.org/licenses/by/3.0/"
OMARCHY = "https://github.com/funcoder/omarchy-ambient"
LAVENDER = "https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"
KENNEY_MIRROR = "https://github.com/ETdoFresh/kenney.nl"

# Œuvres (pour les crédits dédupliqués). Une entrée par pack / enregistrement.
WORKS = {
    P_FS_BIRDS: dict(title="Forest quiet atmosphere with some birds", author="felix.blume", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://freesound.org/s/414098/", mirror=OMARCHY),
    P_FS_STREAM: dict(title="Relaxing River Sound", author="IceVFX", license="CC0 1.0", license_url=CC0_URL,
                      source_url="https://freesound.org/s/722875/", mirror=OMARCHY),
    P_FS_WIND: dict(title="Wind on bushes with muffled gust of wind, twig branch, close to desert ground",
                    author="felix.blume", license="CC0 1.0", license_url=CC0_URL,
                    source_url="https://freesound.org/s/711106/", mirror=OMARCHY),
    P_FS_RAIN: dict(title="Soft rain on a tile roof", author="richwise", license="CC0 1.0", license_url=CC0_URL,
                    source_url="https://freesound.org/s/466241/", mirror=OMARCHY),
    P_FS_CRICKETS: dict(title="Crickets (close recording)", author="felix.blume", license="CC0 1.0",
                        license_url=CC0_URL, source_url="https://freesound.org/s/476672/", mirror=OMARCHY),
    P_FS_WAVES: dict(title="Crashing Waves - Pacific Ocean", author="SecureSubset", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://freesound.org/s/817075/", mirror=OMARCHY),
    P_FS_STORM: dict(title="Rain and Thunder Ambience Tübingen", author="Sheyvan", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://freesound.org/s/369547/", mirror=OMARCHY),
    P_RD1: dict(title="100 CC0 SFX", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                source_url="https://opengameart.org/content/100-cc0-sfx", mirror=LAVENDER),
    P_RD_WM: dict(title="100 CC0 wood / metal SFX", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                  source_url="https://opengameart.org/content/100-cc0-wood-metal-sfx", mirror=LAVENDER),
    P_RD2: dict(title="100 CC0 SFX #2", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                source_url="https://opengameart.org/content/100-cc0-sfx-2", mirror=LAVENDER),
    P_RD_CRE: dict(title="80 CC0 creature SFX", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                   source_url="https://opengameart.org/content/80-cc0-creature-sfx", mirror=LAVENDER),
    P_RD_CRE2: dict(title="80 CC0 creature SFX #2", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                    source_url="https://opengameart.org/content/80-cc0-creature-sfx-2", mirror=LAVENDER),
    P_RD_RPG: dict(title="80 CC0 RPG SFX", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                   source_url="https://opengameart.org/content/80-cc0-rpg-sfx", mirror=LAVENDER),
    P_RD_WATER: dict(title="40 CC0 water / splash / slime SFX", author="rubberduck", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://opengameart.org/content/40-cc0-water-splash-slime-sfx",
                     mirror=LAVENDER),
    P_BB_WOOSH: dict(title="Micro Pack - Organic Wooshes", author="Ben Burnes (Abstraction)", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://abstractionmusic.com/", mirror=LAVENDER),
    P_BB_PAPER: dict(title="Books, Paper, Writing (Jan 2021)", author="Ben Burnes (Abstraction)", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://abstractionmusic.com/", mirror=LAVENDER),
    P_BB_CUTTER: dict(title="Micro Pack - Paper Cutter", author="Ben Burnes (Abstraction)", license="CC0 1.0",
                      license_url=CC0_URL, source_url="https://abstractionmusic.com/", mirror=LAVENDER),
    P_K_UI: dict(title="UI Audio", author="Kenney", license="CC0 1.0", license_url=CC0_URL,
                 source_url="https://kenney.nl/assets/ui-audio", mirror=KENNEY_MIRROR),
    P_K_IF: dict(title="Interface Sounds", author="Kenney", license="CC0 1.0", license_url=CC0_URL,
                 source_url="https://kenney.nl/assets/interface-sounds", mirror=KENNEY_MIRROR),
    P_K_IMP: dict(title="Impact Sounds", author="Kenney", license="CC0 1.0", license_url=CC0_URL,
                  source_url="https://kenney.nl/assets/impact-sounds", mirror=KENNEY_MIRROR),
    P_K_RPG: dict(title="RPG Audio", author="Kenney", license="CC0 1.0", license_url=CC0_URL,
                  source_url="https://kenney.nl/assets/rpg-audio", mirror=KENNEY_MIRROR),
    P_FLUID: dict(title="FluidR3_GM SoundFont (samples d'instruments, rendus MP3 par note)", author="Frank Wen",
                  license="CC BY 3.0", license_url=CCBY3_URL,
                  source_url="https://member.keymusician.com/Member/FluidR3_GM/index.html",
                  mirror="https://github.com/gleitz/midi-js-soundfonts"),
}


def km_attribution(title: str) -> str:
    return (f'"{title}" Kevin MacLeod (incompetech.com) — Licensed under Creative Commons: '
            f'By Attribution 4.0 License — {CCBY4_URL}')


# ---------------------------------------------------------------------------
# Primitives ffmpeg / numpy
# ---------------------------------------------------------------------------
def run(cmd: list[str], data: bytes | None = None) -> subprocess.CompletedProcess:
    p = subprocess.run(cmd, input=data, capture_output=True)
    if p.returncode != 0:
        raise RuntimeError("ffmpeg failed:\n" + " ".join(cmd) + "\n" + p.stderr.decode(errors="replace")[-2000:])
    return p


def decode(path: Path | str, ch: int = 2, sr: int = SR) -> np.ndarray:
    """Décode n'importe quel fichier en float32 (n, ch) à `sr` Hz."""
    p = run([FFMPEG, "-v", "error", "-i", str(path), "-f", "f32le", "-ac", str(ch), "-ar", str(sr), "-"])
    a = np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, ch)
    return a.astype(np.float32, copy=True)


def raw_args(a: np.ndarray) -> list[str]:
    return ["-f", "f32le", "-ar", str(SR), "-ac", str(a.shape[1]), "-i", "-"]


def ff_filter(a: np.ndarray, chain: str, out_ch: int | None = None) -> np.ndarray:
    """Applique une chaîne de filtres ffmpeg à un tableau (n, ch) et renvoie (n', ch)."""
    ch = out_ch or a.shape[1]
    p = run([FFMPEG, "-v", "error", *raw_args(a), "-af", chain, "-f", "f32le", "-ac", str(ch), "-ar", str(SR), "-"],
            np.ascontiguousarray(a, dtype=np.float32).tobytes())
    return np.frombuffer(p.stdout, dtype=np.float32).reshape(-1, ch).astype(np.float32, copy=True)


def encode_ogg(a: np.ndarray, path: Path, quality: float, title: str = "", artist: str = "") -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cmd = [FFMPEG, "-y", "-v", "error", *raw_args(a), "-c:a", "libvorbis", "-q:a", str(quality)]
    if title:
        cmd += ["-metadata", f"title={title}"]
    if artist:
        cmd += ["-metadata", f"artist={artist}"]
    cmd += ["-f", "ogg", str(path)]
    run(cmd, np.ascontiguousarray(np.clip(a, -1, 1), dtype=np.float32).tobytes())


def probe(path: Path) -> dict:
    """Équivalent ffprobe (le binaire ffprobe n'est pas fourni) : codec, canaux, durée décodée exacte."""
    p = subprocess.run([FFMPEG, "-i", str(path), "-f", "null", "-"], capture_output=True)
    err = p.stderr.decode(errors="replace")
    m = re.search(r"Audio: (\w+)[^\n]*?(\d+) Hz, (stereo|mono|\d+ channels)", err)
    codec = m.group(1) if m else "?"
    hz = int(m.group(2)) if m else 0
    ch = {"stereo": 2, "mono": 1}.get(m.group(3), 0) if m else 0
    a = decode(path, ch=max(ch, 1), sr=hz or SR)
    return dict(codec=codec, sample_rate=hz, channels=ch, duration=len(a) / (hz or SR),
                samples=len(a), size=path.stat().st_size)


def to_stereo(a: np.ndarray) -> np.ndarray:
    return np.repeat(a, 2, axis=1) if a.shape[1] == 1 else a


def to_mono(a: np.ndarray) -> np.ndarray:
    return a.mean(axis=1, keepdims=True).astype(np.float32) if a.shape[1] > 1 else a


def db(x: float) -> float:
    return 10 ** (x / 20)


def peak_normalize(a: np.ndarray, peak_db: float = -3.0) -> np.ndarray:
    pk = float(np.abs(a).max()) if len(a) else 0.0
    return a * (db(peak_db) / pk) if pk > 0 else a


def trim_silence(a: np.ndarray, thresh_db: float = -50.0, pre: float = 0.003, post: float = 0.03) -> np.ndarray:
    env = np.abs(a).max(axis=1)
    idx = np.where(env > db(thresh_db))[0]
    if len(idx) == 0:
        return a
    s = max(0, idx[0] - int(pre * SR))
    e = min(len(a), idx[-1] + int(post * SR))
    return a[s:e]


def fade(a: np.ndarray, fin: float = 0.0, fout: float = 0.0) -> np.ndarray:
    a = a.copy()
    n_in, n_out = int(fin * SR), int(fout * SR)
    if n_in > 0:
        n_in = min(n_in, len(a))
        a[:n_in] *= (0.5 - 0.5 * np.cos(np.linspace(0, math.pi, n_in)))[:, None]
    if n_out > 0:
        n_out = min(n_out, len(a))
        a[-n_out:] *= (0.5 + 0.5 * np.cos(np.linspace(0, math.pi, n_out)))[:, None]
    return a


def gain(a: np.ndarray, g_db: float) -> np.ndarray:
    return a * db(g_db)


def cut(a: np.ndarray, seconds: float, fout: float = 0.05) -> np.ndarray:
    """Tronque à `seconds` avec un fondu de sortie."""
    return fade(a[:int(seconds * SR)], 0.0, fout)


def reverse(a: np.ndarray) -> np.ndarray:
    return np.ascontiguousarray(a[::-1])


def resample_rate(a: np.ndarray, rate: float) -> np.ndarray:
    """Change la hauteur ET la durée (comme un magnétophone) : rate<1 = plus grave et plus long."""
    n = len(a)
    m = int(n / rate)
    x = np.linspace(0, n - 1, m)
    xi = np.arange(n)
    return np.stack([np.interp(x, xi, a[:, c]) for c in range(a.shape[1])], axis=1).astype(np.float32)


def mix(*layers: tuple[np.ndarray, float, float], length: float | None = None) -> np.ndarray:
    """Superpose des couches (tableau, décalage en s, gain dB). Résultat stéréo si une couche l'est."""
    ch = max(l[0].shape[1] for l in layers)
    end = max(int(t * SR) + len(a) for a, t, _ in layers)
    if length is not None:
        end = max(end, int(length * SR))
    out = np.zeros((end, ch), dtype=np.float32)
    for a, t, g in layers:
        a = to_stereo(a) if ch == 2 else a
        s = int(t * SR)
        out[s:s + len(a)] += a * db(g)
    return out


def envelope(a: np.ndarray, attack: float, hold_until: float, release: float) -> np.ndarray:
    """Enveloppe attaque (cosinus) / tenue / relâchement, appliquée en place ; tronque après le relâchement."""
    total = int((hold_until + release) * SR)
    a = a[:total].copy()
    n = len(a)
    env = np.ones(n, dtype=np.float32)
    na = min(int(attack * SR), n)
    env[:na] = 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, na))
    nr = min(int(release * SR), n)
    if nr > 0:
        env[-nr:] = np.minimum(env[-nr:], 0.5 + 0.5 * np.cos(np.linspace(0, math.pi, nr)))
    return a * env[:, None]


def sustain(a: np.ndarray, seconds: float, loop_start: float = 0.8, loop_end: float = 2.6, xf: float = 0.25) -> np.ndarray:
    """Prolonge un sample tenu en rebouclant sa partie stable (crossfades), sans synthèse."""
    if len(a) / SR >= seconds:
        return a[:int(seconds * SR)]
    s, e, n = int(loop_start * SR), int(min(loop_end, len(a) / SR) * SR), int(xf * SR)
    body = a[s:e]
    out = a[:e].copy()
    while len(out) < int(seconds * SR) + n:
        w = (0.5 - 0.5 * np.cos(np.linspace(0, math.pi, n)))[:, None]
        tail = out[-n:] * (1 - w) + body[:n] * w
        out = np.concatenate([out[:-n], tail, body[n:]])
    return out[:int(seconds * SR)]


def stereo_spread(mono: np.ndarray, ms: float = 0.4, er: tuple = ((23, 0.18), (31, 0.15))) -> np.ndarray:
    """Élargit une source mono : léger décalage inter-canal + premières réflexions asymétriques."""
    x = to_mono(mono)[:, 0]
    n = len(x)
    d = int(ms * SR / 1000)
    L = x.copy()
    R = np.concatenate([np.zeros(d, dtype=np.float32), x[:n - d]]) * 0.97
    (dl, gl), (dr, gr) = er
    dl, dr = int(dl * SR / 1000), int(dr * SR / 1000)
    L[dl:] += x[:n - dl] * gl
    R[dr:] += x[:n - dr] * gr
    return np.stack([L, R], axis=1)


# ---------------------------------------------------------------------------
# Loudness (loudnorm deux passes) et boucles
# ---------------------------------------------------------------------------
def _loudnorm_json(stderr: str) -> dict:
    m = re.findall(r"\{[^{}]*\}", stderr, flags=re.S)
    if not m:
        raise RuntimeError("loudnorm: pas de JSON dans la sortie")
    return json.loads(m[-1])


def loudnorm(a: np.ndarray, target: float, tp: float = -1.0, lra: float = 20.0) -> tuple[np.ndarray, dict]:
    """Normalisation EBU R128 en deux passes (mesure, puis application), sortie 44,1 kHz."""
    base = f"loudnorm=I={target}:TP={tp}:LRA={lra}"
    raw = np.ascontiguousarray(a, dtype=np.float32).tobytes()
    p1 = subprocess.run([FFMPEG, "-v", "info", *raw_args(a), "-af", base + ":print_format=json", "-f", "null", "-"],
                        input=raw, capture_output=True)
    m = _loudnorm_json(p1.stderr.decode(errors="replace"))
    chain = (f"{base}:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}"
             f":measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true:print_format=json,"
             f"aresample={SR}")
    p2 = subprocess.run([FFMPEG, "-v", "info", *raw_args(a), "-af", chain, "-f", "f32le", "-ac", str(a.shape[1]),
                         "-ar", str(SR), "-"], input=raw, capture_output=True)
    if p2.returncode != 0:
        raise RuntimeError(p2.stderr.decode(errors="replace")[-2000:])
    info = _loudnorm_json(p2.stderr.decode(errors="replace"))
    out = np.frombuffer(p2.stdout, dtype=np.float32).reshape(-1, a.shape[1]).astype(np.float32, copy=True)
    return out, dict(input_i=float(m["input_i"]), output_i=float(info.get("output_i", 0)),
                     mode=info.get("normalization_type", "?"))


def loudnorm_loop(a: np.ndarray, target: float) -> tuple[np.ndarray, dict]:
    """loudnorm sur la boucle répétée 3 fois, on garde la copie centrale : la couture reste continue
    même si loudnorm bascule en mode dynamique."""
    n = len(a)
    tiled = np.concatenate([a, a, a])
    out, info = loudnorm(tiled, target)
    # loudnorm/aresample peuvent décaler de quelques échantillons : on recale sur la longueur d'origine.
    if len(out) < 3 * n:
        out = np.concatenate([out, np.zeros((3 * n - len(out), a.shape[1]), dtype=np.float32)])
    mid = out[n:2 * n]
    return mid, info


def crossfade_loop(a: np.ndarray, xf: float) -> np.ndarray:
    """Boucle propre : la queue (xf s) est fondue sur la tête (équi-puissance) puis retirée.
    Le dernier échantillon enchaîne donc sur le premier sans rupture."""
    n = int(xf * SR)
    if n <= 0 or len(a) < 3 * n:
        return a
    t = np.linspace(0, math.pi / 2, n, dtype=np.float32)[:, None]
    head = a[:n] * np.sin(t) + a[-n:] * np.cos(t)
    return np.concatenate([head, a[n:-n]])


def _logmel(mono: np.ndarray, nfft: int = 2048, hop: int = 1024, bands: int = 48) -> np.ndarray:
    n = (len(mono) - nfft) // hop
    frames = np.lib.stride_tricks.as_strided(mono, shape=(n, nfft), strides=(mono.strides[0] * hop, mono.strides[0]))
    win = np.hanning(nfft).astype(np.float32)
    spec = np.abs(np.fft.rfft(frames * win, axis=1)) ** 2
    edges = np.geomspace(40, 12000, bands + 1)
    freqs = np.fft.rfftfreq(nfft, 1 / SR)
    fb = np.zeros((bands, len(freqs)), dtype=np.float32)
    for b in range(bands):
        fb[b, (freqs >= edges[b]) & (freqs < edges[b + 1])] = 1
    return np.log10(spec @ fb.T + 1e-7)


def choose_loop_end(a: np.ndarray, min_s: float, max_s: float, xf: float) -> tuple[float, float]:
    """Choisit la durée E (min_s..max_s) où la queue [E-xf, E] ressemble le plus (spectre + niveau)
    à la tête [0, xf] : c'est là que le fondu fin→début sera le plus discret."""
    hop = 1024
    mel = _logmel(to_mono(a)[:, 0])
    fps = SR / hop
    nx = int(xf * fps)
    head = mel[:nx]
    dur = len(a) / SR
    best, best_e = None, min(max_s, dur)
    e_min, e_max = int(min_s * fps), int(min(max_s, dur) * fps)
    for fe in range(e_min, e_max + 1):
        tail = mel[fe - nx:fe]
        if len(tail) != nx:
            continue
        d = float(np.mean(np.abs(tail - head)))
        # légère préférence pour les boucles longues (plus de variété)
        score = d + 0.08 * (1 - fe / e_max)
        if best is None or score < best:
            best, best_e = score, fe / fps
    return best_e, best or 0.0


def loop_seam_error(a: np.ndarray) -> dict:
    """Test numérique de boucle : saut d'amplitude entre dernier et premier échantillon,
    comparé aux pas naturels du signal (|x[i+1]-x[i]|). Par construction (crossfade_loop) le dernier et
    le premier échantillon sont deux échantillons consécutifs de la source : la couture doit rester
    dans la plage des pas naturels (ratio au 99,9e centile < 1) — sinon il y a un clic."""
    if len(a) < 2:
        return dict(seam=0.0, mean_step=0.0, p999_step=0.0, ratio=0.0)
    seam = float(np.abs(a[-1] - a[0]).max())
    steps = np.abs(np.diff(a, axis=0)).max(axis=1)
    mean_step = float(steps.mean())
    p999 = float(np.percentile(steps, 99.9))
    return dict(seam=seam, mean_step=mean_step, p999_step=p999, ratio=seam / p999 if p999 > 0 else 0.0)


def measure_lufs(path: Path) -> float:
    p = subprocess.run([FFMPEG, "-v", "info", "-i", str(path), "-af", "loudnorm=print_format=json", "-f", "null", "-"],
                       capture_output=True)
    return float(_loudnorm_json(p.stderr.decode(errors="replace"))["input_i"])


# ---------------------------------------------------------------------------
# Sources d'échantillons
# ---------------------------------------------------------------------------
def src(pack: str, name: str) -> Path:
    p = PACKS[pack]["dir"] / name
    if not p.exists():
        if pack == P_KM:
            # le miroir est un dépôt git : on extrait le titre à la demande
            subprocess.run(["git", "-C", str(KM), "checkout", "HEAD", "--", name], capture_output=True)
        if not p.exists():
            raise FileNotFoundError(p)
    return p


def fluid(instrument: str, note: str) -> Path:
    """Sample FluidR3_GM (MP3 par note), téléchargé dans le miroir local s'il manque."""
    d = FLUID / f"{instrument}-mp3"
    p = d / f"{note}.mp3"
    if not p.exists():
        d.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(f"{FLUID_URL}{instrument}-mp3/{note}.mp3", p)
    return p


def load(pack: str, name: str, ch: int = 1) -> np.ndarray:
    return decode(src(pack, name), ch=ch)


def load_fluid(instrument: str, note: str, ch: int = 1) -> np.ndarray:
    return decode(fluid(instrument, note), ch=ch)


# ---------------------------------------------------------------------------
# MUSIQUES
# ---------------------------------------------------------------------------
MUSIC = {
    # clé : (titre Kevin MacLeod, durée max de boucle, crossfade s, raison)
    "spring": ("Morning", 115, 3.0, "printemps : piano et cordes légères, aube claire — thème de la saison"),
    "summer": ("Kalimba Relaxation Music", 115, 3.0, "été : kalimba chaude et lente, chaleur paisible"),
    "autumn": ("Evening", 115, 3.0, "automne : calme, crépusculaire, mélancolie douce"),
    "winter": ("Gymnopedie No 1", 115, 3.0,
               "hiver : « Ethereal Relaxation » absent du miroir ; la Gymnopédie n° 1 (piano lent, dépouillé, "
               "froid et clair) est le plus hivernal des candidats"),
    "menu": ("Dream Catcher", 115, 3.0, "menu : rêveur, suspendu, invite à l'île"),
    "results": ("Beauty Flow", 115, 3.0, "bilan / atelier : coulée douce, contemplative"),
    "ending": ("Almost Bliss", 115, 4.0, "fin : lumineux et apaisé, l'île qui se souvient"),
    "garden": ("Study And Relax", 115, 3.0, "jardin (mode libre) : studieux, sans tension"),
    # deuxième piste par saison (alternance d'une île à l'autre) et modes
    "spring_2": ("Cloud Dancer", 115, 3.0, "printemps (variante) : aérien, nuages qui passent"),
    "summer_2": ("Pleasant Porridge", 115, 3.0, "été (variante) : chaleur tranquille, guitare douce"),
    "autumn_2": ("Leaving Home", 115, 3.0, "automne (variante) : départ, feuilles qui tombent"),
    "winter_2": ("Night Vigil", 115, 3.0, "hiver (variante) : veille nocturne, froid et calme"),
    "daily": ("Maccary Bay", 115, 3.0, "île du jour : baie tranquille, un jour à la fois"),
}
MUSIC_LUFS = -16.0
MUSIC_MIN_LOOP = 60.0


def build_music(only: set[str] | None = None) -> dict:
    manifest = {}
    for key, (title, max_s, xf, why) in MUSIC.items():
        if only and key not in only:
            continue
        path = OUT / "music" / f"{key}.ogg"
        a = decode(src(P_KM, f"{title}.mp3"), ch=2)
        a = trim_silence(a, thresh_db=-48, pre=0.0, post=0.0)
        dur = len(a) / SR
        if dur <= max_s:
            end = dur  # morceau court : on boucle sur toute sa durée
        else:
            end, _ = choose_loop_end(a, MUSIC_MIN_LOOP, max_s, xf)
        cut_a = a[:int(end * SR)]
        looped = crossfade_loop(cut_a, xf)
        normed, info = loudnorm_loop(looped, MUSIC_LUFS)
        encode_ogg(normed, path, 5, title=title, artist="Kevin MacLeod (incompetech.com)")
        pr = probe(path)
        manifest[key] = dict(file=f"music/{key}.ogg", duration=round(pr["duration"], 3), loop=True,
                             source=title, author="Kevin MacLeod", license="CC BY 4.0",
                             attribution=km_attribution(title), note=why)
        print(f"  music/{key}.ogg  <- {title!r}  cut={end:.1f}s xf={xf}s  "
              f"in={info['input_i']:.1f} LUFS -> {info['output_i']:.1f} ({info['mode']})  "
              f"{pr['duration']:.1f}s {pr['size'] / 1e6:.2f} Mo")
    return manifest


# ---------------------------------------------------------------------------
# AMBIANCES
# ---------------------------------------------------------------------------
AMBIENCE_LUFS = -20.0
AMBIENCE_LEN = 68.0   # avant retrait du crossfade (4 s) : boucles de 64 s
AMBIENCE_XF = 4.0


def _pick_window(a: np.ndarray, length: float, start: float = 10.0) -> np.ndarray:
    """Fenêtre de `length` s prise à `start` s du début (les boucles source sont homogènes)."""
    n = int(length * SR)
    if len(a) <= n:
        return a
    s = min(int(start * SR), len(a) - n)
    return a[s:s + n]


def build_ambience(only: set[str] | None = None) -> dict:
    manifest = {}
    specs = {
        # clé : (pack, fichier, chaîne de filtres ou None, note)
        "birds": (P_FS_BIRDS, "birds.ogg", None, "forêt et oiseaux : printemps / été, dosée selon la forêt de l'île"),
        "stream": (P_FS_STREAM, "stream.ogg", None, "ruisseau : près des rivières"),
        "wind": (P_FS_WIND, "wind.ogg", None, "vent sur les buissons : automne / hiver"),
        "rain": (P_FS_RAIN, "rain.ogg", None, "pluie douce sur un toit : transition d'automne"),
        "crickets": (P_FS_CRICKETS, "crickets.ogg", None, "grillons : nuits d'été"),
        "sea": (P_FS_WAVES, "waves.ogg", "highpass=f=60,lowpass=f=1100:p=2,lowpass=f=1800",
                "vagues douces au loin (passe-bas 1,1 kHz : la mer autour de l'île)"),
        "winter": (P_FS_WIND, "wind.ogg", "highpass=f=40,lowpass=f=650:p=2,lowpass=f=900",
                   "vent doux passe-bas : hiver, neige et ombres bleues"),
        "storm": (P_FS_STORM, "storm.ogg", None, "orage : pluie et tonnerre (météo de printemps)"),
    }
    for key, (pack, name, chain, why) in specs.items():
        if only and key not in only:
            continue
        path = OUT / "ambience" / f"{key}.ogg"
        a = decode(src(pack, name), ch=2)
        seg = _pick_window(a, AMBIENCE_LEN, start=10.0 if key != "winter" else 100.0)
        if chain:
            seg = ff_filter(seg, chain)
        looped = crossfade_loop(seg, AMBIENCE_XF)
        normed, info = loudnorm_loop(looped, AMBIENCE_LUFS)
        encode_ogg(normed, path, 3, title=f"{GAME} — ambiance {key}")
        pr = probe(path)
        manifest[key] = dict(file=f"ambience/{key}.ogg", duration=round(pr["duration"], 3), loop=True,
                             source=WORKS[pack]["title"], author=PACKS[pack]["author"],
                             license="CC0 1.0", packs=[pack], note=why)
        print(f"  ambience/{key}.ogg  <- {name}  {pr['duration']:.1f}s xf={AMBIENCE_XF}s  "
              f"in={info['input_i']:.1f} -> {info['output_i']:.1f} LUFS ({info['mode']})  {pr['size'] / 1e6:.2f} Mo")
    return manifest


# ---------------------------------------------------------------------------
# SFX
# ---------------------------------------------------------------------------
REVERB_SOFT = "aecho=0.8:0.5:40|90:0.25|0.15"                            # petite pièce / carnet
REVERB_OUT = "aecho=0.8:0.7:60|130|250|400:0.35|0.25|0.18|0.12"          # extérieur, île
REVERB_FAR = "aecho=0.7:0.8:90|210|380|560|800:0.45|0.35|0.28|0.2|0.14"  # très lointain


def sfx_finish(a: np.ndarray, path: Path, peak: float = -3.0, trim: bool = True, fin: float = 0.003,
               fout: float = 0.015) -> dict:
    if trim:
        a = trim_silence(a, thresh_db=-55)
    a = fade(a, fin, fout)
    a = peak_normalize(a, peak)
    encode_ogg(a, path, 4)
    return probe(path)


def build_sfx(only: set[str] | None = None) -> dict:
    manifest = {}
    F = P_FLUID

    def L(pack, name, ch=1):
        return load(pack, name, ch)

    def LF(inst, note, ch=1):
        return trim_silence(load_fluid(inst, note, ch))

    def hit(inst, note, length, g=0.0, body=None, body_g=-7.0, fout=0.3):
        """Note percussive réelle (glockenspiel, marimba…) coupée à `length` s, avec un corps optionnel."""
        layers = [(LF(inst, note), 0.0, g)]
        if body:
            layers.append((LF(*body), 0.0, body_g))
        return cut(mix(*layers), length, fout)

    def held(inst, note, seconds, attack, hold, release):
        """Note tenue réelle (flûte, pad, cordes) prolongée par rebouclage puis enveloppée."""
        return envelope(sustain(load_fluid(inst, note), seconds + 0.3), attack, hold, release)

    def arp(inst, notes, step, length, g=0.0, fout=0.4):
        """Arpège : une note réelle toutes les `step` s."""
        return cut(mix(*[(LF(inst, n), i * step, g) for i, n in enumerate(notes)]), length, fout)

    def wind_seg(start: float, length: float, ch=2):
        w = decode(src(P_FS_WIND, "wind.ogg"), ch=ch)
        return w[int(start * SR):int((start + length) * SR)]

    def wind_gust(length: float, ch=2):
        """Fenêtre la plus énergique du vent (une vraie rafale), dans les deux premières minutes."""
        w = decode(src(P_FS_WIND, "wind.ogg"), ch=ch)[:int(120 * SR)]
        n, hop = int(length * SR), SR // 2
        e = [(float((w[s:s + n] ** 2).mean()), s) for s in range(0, len(w) - n, hop)]
        s = max(e)[1]
        return w[s:s + n]

    def creature(pack, name, rate, lp, extra=None, reverb=REVERB_OUT):
        """Cri d'animal à partir d'un sample de créature CC0 : pitch, passe-bas, stéréo, réverb d'extérieur."""
        a = resample_rate(trim_silence(L(pack, name)), rate)
        layers = [(a, 0.0, 0.0)]
        for (p2, n2, r2, t2, g2) in (extra or []):
            layers.append((resample_rate(trim_silence(L(p2, n2)), r2), t2, g2))
        m = ff_filter(mix(*layers), f"highpass=f=80,lowpass=f={lp}")
        return ff_filter(stereo_spread(m), reverb)

    # Chaque entrée : nom -> (fonction produisant le tableau, [(pack, fichier ou description)], note)
    R: dict[str, tuple] = {}

    # ---- Tuiles ---------------------------------------------------------------
    R["tile_hover"] = (lambda: cut(ff_filter(L(P_K_IMP, "impactWood_light_002.ogg"), "lowpass=f=1800"), 0.09, 0.03),
                       [(P_K_IMP, "impactWood_light_002.ogg")], "survol de tuile : bois feutré, très court (passe-bas 1,8 kHz)")
    for i, (kf, wf) in enumerate([("impactWood_medium_000.ogg", None), ("impactWood_medium_001.ogg", None),
                                  ("impactWood_medium_002.ogg", "wooden_03.ogg"), ("impactWood_medium_003.ogg", "wooden_02.ogg")], 1):
        def _place(kf=kf, wf=wf):
            layers = [(L(P_K_IMP, kf), 0.0, 0.0)]
            if wf:
                layers.append((ff_filter(L(P_RD1, wf), "lowpass=f=5000"), 0.01, -9.0))
            return cut(mix(*layers), 0.45, 0.1)
        srcs = [(P_K_IMP, kf)] + ([(P_RD1, wf)] if wf else [])
        R[f"tile_place_{i}"] = (_place, srcs, f"pose de tuile, « toc » bois (variante {i})")
    R["tile_bounce"] = (lambda: cut(mix((resample_rate(L(P_K_IMP, "impactWood_light_000.ogg"), 1.15), 0.0, 0.0),
                                        (resample_rate(L(P_K_IMP, "impactWood_light_003.ogg"), 1.3), 0.09, -5.0)), 0.3, 0.05),
                        [(P_K_IMP, "impactWood_light_000.ogg"), (P_K_IMP, "impactWood_light_003.ogg")],
                        "rebond léger : deux petits bois rapprochés, le second plus aigu et plus faible")
    R["tile_invalid"] = (lambda: cut(mix((ff_filter(L(P_K_IMP, "impactWood_heavy_002.ogg"), "lowpass=f=500"), 0.0, 0.0),
                                         (L(P_K_IMP, "impactSoft_medium_001.ogg"), 0.0, -3.0)), 0.35, 0.1),
                         [(P_K_IMP, "impactWood_heavy_002.ogg"), (P_K_IMP, "impactSoft_medium_001.ogg")],
                         "pose impossible : bois sourd (passe-bas 500 Hz) + impact mou")
    R["tile_swap"] = (lambda: cut(mix((L(P_RD1, "paper_02.ogg"), 0.0, 0.0),
                                      (L(P_K_IMP, "impactWood_light_001.ogg"), 0.26, -2.0)), 0.6, 0.08),
                      [(P_RD1, "paper_02.ogg"), (P_K_IMP, "impactWood_light_001.ogg")], "échange de tuile : papier puis petit bois")
    R["tile_discard"] = (lambda: cut(mix((L(P_RD1, "paper_04.ogg"), 0.0, 0.0),
                                         (trim_silence(L(P_BB_CUTTER, "Caress Paper.wav")), 0.18, -5.0)), 0.9, 0.2),
                         [(P_RD1, "paper_04.ogg"), (P_BB_CUTTER, "Caress Paper.wav")], "tuile défaussée : papier froissé")
    R["tile_undo"] = (lambda: cut(ff_filter(mix((reverse(trim_silence(L(P_BB_WOOSH, "Twirl Smol 1.wav"))), 0.0, 0.0),
                                                (reverse(trim_silence(L(P_BB_WOOSH, "Swish 2.wav"))), 0.3, -3.0)),
                                            "lowpass=f=5000"), 0.6, 0.06),
                      [(P_BB_WOOSH, "Twirl Smol 1.wav"), (P_BB_WOOSH, "Swish 2.wav")],
                      "annulation : wooshes inversés (rembobinage doux, passe-bas 5 kHz)")
    R["tile_pocket"] = (lambda: cut(mix((L(P_K_RPG, "cloth2.ogg"), 0.0, 0.0),
                                        (trim_silence(L(P_BB_PAPER, "Softcover Tap 2.wav")), 0.14, -4.0)), 0.45, 0.08),
                        [(P_K_RPG, "cloth2.ogg"), (P_BB_PAPER, "Softcover Tap 2.wav")], "tuile mise en poche : tissu + tapotement")

    # ---- Points (samples réels : glockenspiel + corps de célesta) ---------------
    SCALE = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6"]
    for i, n in enumerate(SCALE, 1):
        R[f"point_{i}"] = ((lambda n=n: hit("glockenspiel", n, 1.0, body=("celesta", n))),
                           [(F, f"glockenspiel {n}"), (F, f"celesta {n}")], f"point {i} : {n} (gamme montante)")
    R["point_bad"] = (lambda: ff_filter(hit("marimba", "C3", 0.9, body=("marimba", "G2"), body_g=-9.0), "lowpass=f=3000"),
                      [(F, "marimba C3"), (F, "marimba G2")], "point perdu : note grave douce de marimba")
    R["region_close"] = (lambda: ff_filter(stereo_spread(cut(mix((LF("orchestral_harp", "C4"), 0.0, 0.0),
                                                                 (LF("orchestral_harp", "E4"), 0.06, 0.0),
                                                                 (LF("orchestral_harp", "G4"), 0.12, 0.0),
                                                                 (LF("glockenspiel", "C6"), 0.16, -7.0)), 1.5, 0.4)), REVERB_SOFT),
                         [(F, "orchestral_harp C4/E4/G4"), (F, "glockenspiel C6")], "région fermée : accord chaleureux harpe + glockenspiel (1,5 s)")
    R["region_big"] = (lambda: ff_filter(stereo_spread(cut(mix((LF("orchestral_harp", "C3"), 0.0, 0.0),
                                                               (LF("orchestral_harp", "G3"), 0.06, 0.0),
                                                               (LF("orchestral_harp", "E4"), 0.12, 0.0),
                                                               (LF("orchestral_harp", "B4"), 0.18, -1.0),
                                                               (LF("orchestral_harp", "D5"), 0.24, -1.0),
                                                               (LF("tubular_bells", "C5"), 0.1, -6.0),
                                                               (LF("glockenspiel", "E6"), 0.32, -9.0)), 2.0, 0.5)), REVERB_SOFT),
                       [(F, "orchestral_harp C3/G3/E4/B4/D5"), (F, "tubular_bells C5"), (F, "glockenspiel E6")],
                       "grande région : accord large (Cmaj9) + cloche tubulaire (2 s)")
    R["combo"] = (lambda: arp("glockenspiel", ["C5", "E5", "G5", "C6", "E6", "G6"], 0.055, 1.2, fout=0.35),
                  [(F, "glockenspiel C5/E5/G5/C6/E6/G6")], "combo : arpège rapide de glockenspiel")

    # ---- Saisons (jingles de 2–3 s, samples réels) ------------------------------
    R["season_spring"] = (lambda: ff_filter(stereo_spread(cut(mix(
        (held("flute", "D5", 0.6, 0.05, 0.3, 0.25), 0.0, -2.0),
        (held("flute", "E5", 0.6, 0.05, 0.3, 0.25), 0.3, -2.0),
        (held("flute", "G5", 1.7, 0.05, 1.2, 0.5), 0.6, 0.0),
        (LF("orchestral_harp", "C4"), 0.0, -4.0), (LF("orchestral_harp", "E4"), 0.05, -4.0),
        (LF("orchestral_harp", "G4"), 0.1, -4.0), (LF("orchestral_harp", "C5"), 0.62, -5.0),
        (LF("glockenspiel", "G5"), 0.62, -12.0)), 2.6, 0.5)), REVERB_SOFT),
        [(F, "flute D5/E5/G5"), (F, "orchestral_harp C4/E4/G4/C5"), (F, "glockenspiel G5")],
        "printemps : flûte montante (ré mi sol) sur harpe")
    R["season_summer"] = (lambda: ff_filter(stereo_spread(cut(mix(
        (LF("kalimba", "C4"), 0.0, 0.0), (LF("kalimba", "E4"), 0.17, 0.0), (LF("kalimba", "G4"), 0.34, 0.0),
        (LF("kalimba", "A4"), 0.51, 0.0), (LF("kalimba", "C5"), 0.68, 0.0), (LF("kalimba", "E5"), 0.85, -1.0),
        (LF("marimba", "C3"), 0.0, -4.0), (LF("marimba", "G3"), 0.68, -6.0), (LF("marimba", "C4"), 1.02, -6.0),
        (LF("vibraphone", "G4"), 0.85, -9.0), (LF("vibraphone", "C5"), 1.02, -8.0), (LF("vibraphone", "E5"), 1.19, -9.0)), 2.5, 0.6)), REVERB_SOFT),
        [(F, "kalimba C4/E4/G4/A4/C5/E5"), (F, "marimba C3/G3/C4"), (F, "vibraphone G4/C5/E5")],
        "été : kalimba en pentatonique sur marimba, halo de vibraphone")
    R["season_autumn"] = (lambda: ff_filter(stereo_spread(cut(mix(
        (LF("acoustic_guitar_nylon", "A2"), 0.0, 0.0), (LF("acoustic_guitar_nylon", "E3"), 0.07, 0.0),
        (LF("acoustic_guitar_nylon", "A3"), 0.14, 0.0), (LF("acoustic_guitar_nylon", "C4"), 0.21, 0.0),
        (LF("acoustic_guitar_nylon", "E4"), 0.28, 0.0),
        (LF("vibraphone", "E5"), 0.55, -7.0), (LF("vibraphone", "C5"), 1.0, -8.0), (LF("vibraphone", "A4"), 1.45, -8.0)), 2.8, 0.7)), REVERB_SOFT),
        [(F, "acoustic_guitar_nylon A2/E3/A3/C4/E4"), (F, "vibraphone E5/C5/A4")], "automne : guitare nylon (la mineur) et vibraphone descendant")
    R["season_winter"] = (lambda: ff_filter(stereo_spread(cut(mix(
        (LF("music_box", "E5"), 0.0, 0.0), (LF("music_box", "B5"), 0.35, 0.0), (LF("music_box", "G5"), 0.7, 0.0),
        (LF("music_box", "E6"), 1.05, -1.0), (LF("music_box", "B5"), 1.4, -2.0),
        (LF("celesta", "E4"), 0.0, -9.0), (LF("celesta", "G4"), 0.02, -9.0), (LF("celesta", "B4"), 0.04, -9.0)), 3.0, 0.8)), REVERB_OUT),
        [(F, "music_box E5/B5/G5/E6"), (F, "celesta E4/G4/B4")], "hiver : boîte à musique (mi mineur) sur célesta, réverbération froide")
    R["season_sweep"] = (lambda: fade(ff_filter(wind_gust(2.2), "highpass=f=150"), 0.5, 0.9),
                         [(P_FS_WIND, "wind.ogg")], "balayage de saison : rafale réelle de 2,2 s prise dans wind.ogg")

    # ---- Faune -------------------------------------------------------------------
    R["fauna_arrive"] = (lambda: cut(mix((L(P_RD1, "plop_02.ogg"), 0.0, 0.0), (LF("glockenspiel", "A5"), 0.08, -6.0),
                                         (LF("glockenspiel", "E6"), 0.2, -8.0)), 0.9, 0.3),
                         [(P_RD1, "plop_02.ogg"), (F, "glockenspiel A5/E6")], "animal qui apparaît : pop + petit carillon")
    R["fauna_leave"] = (lambda: cut(mix((L(P_RD1, "plop_02.ogg"), 0.0, 0.0),
                                        (resample_rate(L(P_RD1, "plop_01.ogg"), 0.75), 0.12, -2.0),
                                        (resample_rate(L(P_RD1, "plop_02.ogg"), 0.6), 0.24, -3.0)), 0.55, 0.08),
                        [(P_RD1, "plop_02.ogg"), (P_RD1, "plop_01.ogg")], "animal qui part : trois pops descendants")
    R["fauna_rabbit"] = (lambda: creature(P_RD_CRE, "cute_07.ogg", 1.35, 8000, extra=[(P_RD_CRE, "cute_07.ogg", 1.5, 0.17, -3.0)], reverb=REVERB_SOFT),
                         [(P_RD_CRE, "cute_07.ogg")], "lapin : pas de cri crédible dans les packs, « cute_07 » pitché ×1,35 puis ×1,5 (deux couinements)")
    R["fauna_moose"] = (lambda: creature(P_RD_CRE2, "grunt_07.ogg", 0.8, 1500),
                        [(P_RD_CRE2, "grunt_07.ogg")], "élan : brame grave (« grunt_07 » pitché ×0,8, passe-bas 1,5 kHz, réverb d'extérieur)")
    R["fauna_frog"] = (lambda: creature(P_RD_CRE, "burble_02.ogg", 0.6, 2500, extra=[(P_RD_CRE2, "misc_10.ogg", 1.0, 0.0, -8.0)]),
                       [(P_RD_CRE, "burble_02.ogg"), (P_RD_CRE2, "misc_10.ogg")], "grenouille : « burble_02 » pitché ×0,6 (coassement) + corps grave « misc_10 »")
    R["fauna_duck"] = (lambda: creature(P_RD_CRE, "barking_01.ogg", 1.25, 5000, extra=[(P_RD_CRE, "barking_01.ogg", 1.2, 0.26, -1.0)]),
                       [(P_RD_CRE, "barking_01.ogg")], "canard : « barking_01 » pitché ×1,25 répété (coin-coin)")
    R["fauna_bear"] = (lambda: creature(P_RD_CRE, "grunt_03.ogg", 0.7, 1800, extra=[(P_RD_CRE2, "grunt_06.ogg", 0.85, 0.18, -4.0)]),
                       [(P_RD_CRE, "grunt_03.ogg"), (P_RD_CRE2, "grunt_06.ogg")], "ours : grognements graves pitchés ×0,7 / ×0,85, passe-bas 1,8 kHz")
    R["fauna_owl"] = (lambda: creature(P_RD_CRE, "ooh.ogg", 0.65, 1200, extra=[(P_RD_CRE, "ooh.ogg", 0.62, 0.32, -2.0)], reverb=REVERB_FAR),
                      [(P_RD_CRE, "ooh.ogg")], "hibou : « ooh » pitché ×0,65 en deux hululements, passe-bas 1,2 kHz, réverb lointaine")
    R["fauna_penguin"] = (lambda: creature(P_RD_CRE, "cute_04.ogg", 0.8, 6000, extra=[(P_RD_CRE, "cute_02.ogg", 0.9, 0.45, -3.0)]),
                          [(P_RD_CRE, "cute_04.ogg"), (P_RD_CRE, "cute_02.ogg")], "manchot : pas de cri crédible, « cute_04 » (trille) ×0,8 + « cute_02 » ×0,9")

    # ---- Vœux ---------------------------------------------------------------------
    R["wish_new"] = (lambda: cut(mix((L(P_RD1, "paper_01.ogg"), 0.0, 0.0), (LF("tinkle_bell", "A5"), 0.25, -4.0)), 1.2, 0.3),
                     [(P_RD1, "paper_01.ogg"), (F, "tinkle_bell A5")], "nouveau vœu : papier épinglé + clochette")
    R["wish_done"] = (lambda: cut(mix((LF("orchestral_harp", "C5"), 0.0, -5.0), (LF("glockenspiel", "C5"), 0.0, 0.0),
                                      (LF("glockenspiel", "E5"), 0.12, 0.0), (LF("glockenspiel", "G5"), 0.24, 0.0),
                                      (LF("glockenspiel", "C6"), 0.36, 0.0), (LF("glockenspiel", "E6"), 0.48, -1.0)), 1.5, 0.4),
                      [(F, "glockenspiel C5/E5/G5/C6/E6"), (F, "orchestral_harp C5")], "vœu exaucé : carillon montant (1,5 s)")
    R["wish_failed"] = (lambda: ff_filter(cut(mix((LF("vibraphone", "G4"), 0.0, 0.0), (LF("vibraphone", "E4"), 0.35, -1.0),
                                                  (LF("vibraphone", "C4"), 0.7, -2.0)), 1.6, 0.5), "lowpass=f=4000"),
                        [(F, "vibraphone G4/E4/C4")], "vœu manqué : trois notes descendantes douces de vibraphone")
    R["rare_tile"] = (lambda: stereo_spread(cut(mix((LF("glockenspiel", "E6"), 0.0, -2.0), (LF("glockenspiel", "D6"), 0.07, -3.0),
                                                    (LF("glockenspiel", "C6"), 0.14, -3.0), (LF("glockenspiel", "E6"), 0.21, -2.0),
                                                    (LF("glockenspiel", "D6"), 0.28, -4.0),
                                                    (LF("orchestral_harp", "E5"), 0.05, -4.0), (LF("orchestral_harp", "G5"), 0.12, -4.0),
                                                    (LF("orchestral_harp", "C6"), 0.19, -4.0)), 1.4, 0.4)),
                      [(F, "glockenspiel E6/D6/C6"), (F, "orchestral_harp E5/G5/C6")], "tuile rare : scintillement glockenspiel aigu + harpe")

    # ---- Souffles ----------------------------------------------------------------
    R["breath_gain"] = (lambda: cut(mix((fade(ff_filter(wind_gust(0.7), "highpass=f=300,lowpass=f=6000"), 0.1, 0.3), 0.0, 0.0),
                                        (LF("glockenspiel", "E6"), 0.15, -6.0)), 0.9, 0.3),
                        [(P_FS_WIND, "wind.ogg"), (F, "glockenspiel E6")], "souffle gagné : souffle de vent court + tintement")
    R["breath_spend"] = (lambda: cut(ff_filter(trim_silence(L(P_RD2, "sfx100v2_air_02.ogg")), "lowpass=f=5000"), 0.8, 0.25),
                         [(P_RD2, "sfx100v2_air_02.ogg")], "souffle dépensé : souffle d'air")
    R["bud"] = (lambda: cut(mix((resample_rate(L(P_RD1, "plop_01.ogg"), 0.9), 0.0, 0.0), (LF("orchestral_harp", "G5"), 0.05, -4.0),
                                (LF("orchestral_harp", "C6"), 0.15, -8.0)), 0.9, 0.3),
                [(P_RD1, "plop_01.ogg"), (F, "orchestral_harp G5/C6")], "pousse : petit plop + harpe")

    # ---- Bilan -------------------------------------------------------------------
    R["star_1"] = (lambda: hit("glockenspiel", "C5", 1.3, body=("celesta", "C5"), body_g=-6.0), [(F, "glockenspiel C5"), (F, "celesta C5")], "étoile 1 (do)")
    R["star_2"] = (lambda: hit("glockenspiel", "E5", 1.3, body=("celesta", "E5"), body_g=-6.0), [(F, "glockenspiel E5"), (F, "celesta E5")], "étoile 2 (mi)")
    R["star_3"] = (lambda: hit("glockenspiel", "G5", 1.3, body=("celesta", "G5"), body_g=-6.0), [(F, "glockenspiel G5"), (F, "celesta G5")], "étoile 3 (sol)")
    R["island_done"] = (lambda: ff_filter(stereo_spread(cut(mix(
        (held("string_ensemble_1", "C3", 3.0, 0.4, 2.0, 1.0), 0.0, 0.0), (held("string_ensemble_1", "E3", 3.0, 0.45, 2.0, 1.0), 0.05, -2.0),
        (held("string_ensemble_1", "G3", 3.0, 0.5, 2.0, 1.0), 0.1, -2.0), (held("string_ensemble_1", "C4", 3.0, 0.55, 2.0, 1.0), 0.15, -3.0),
        (LF("orchestral_harp", "C4"), 0.1, -2.0), (LF("orchestral_harp", "E4"), 0.17, -2.0),
        (LF("orchestral_harp", "G4"), 0.24, -2.0), (LF("orchestral_harp", "C5"), 0.31, -2.0),
        (LF("tubular_bells", "C5"), 0.2, -7.0), (LF("glockenspiel", "C6"), 0.5, -9.0)), 3.0, 0.8)), REVERB_OUT),
        [(F, "string_ensemble_1 C3/E3/G3/C4"), (F, "orchestral_harp C4/E4/G4/C5"), (F, "tubular_bells C5"), (F, "glockenspiel C6")],
        "île achevée : accord final de cordes, harpe, cloche tubulaire et glockenspiel (3 s)")
    R["island_start"] = (lambda: ff_filter(stereo_spread(cut(mix((held("pad_2_warm", "C4", 1.8, 0.6, 1.0, 0.8), 0.0, 0.0),
                                                                 (LF("orchestral_harp", "C5"), 0.45, -3.0),
                                                                 (LF("orchestral_harp", "G5"), 0.6, -9.0)), 1.8, 0.5)), REVERB_SOFT),
                         [(F, "pad_2_warm C4"), (F, "orchestral_harp C5/G5")], "île ouverte : note douce (nappe chaude + harpe)")
    R["seed"] = (lambda: cut(mix((L(P_K_IMP, "impactWood_light_003.ogg"), 0.0, 0.0), (LF("glockenspiel", "C6"), 0.04, -9.0)), 0.9, 0.3),
                 [(P_K_IMP, "impactWood_light_003.ogg"), (F, "glockenspiel C6")], "graine reçue : bois + tintement")
    R["upgrade"] = (lambda: cut(mix((LF("orchestral_harp", "C4"), 0.0, 0.0), (LF("orchestral_harp", "E4"), 0.09, 0.0),
                                    (LF("orchestral_harp", "G4"), 0.18, 0.0), (LF("orchestral_harp", "C5"), 0.27, 0.0),
                                    (LF("glockenspiel", "C6"), 0.36, -7.0)), 1.8, 0.5),
                    [(F, "orchestral_harp C4/E4/G4/C5"), (F, "glockenspiel C6")], "amélioration : arpège de harpe")

    # ---- UI (Kenney, Ben Burnes) ----------------------------------------------
    R["ui_hover"] = (lambda: L(P_K_UI, "rollover4.ogg"), [(P_K_UI, "rollover4.ogg")], "survol, discret")
    R["ui_click"] = (lambda: L(P_K_UI, "click1.ogg"), [(P_K_UI, "click1.ogg")], "clic")
    R["ui_back"] = (lambda: L(P_K_IF, "back_002.ogg"), [(P_K_IF, "back_002.ogg")], "retour")
    R["ui_confirm"] = (lambda: L(P_K_IF, "confirmation_001.ogg"), [(P_K_IF, "confirmation_001.ogg")], "validation")
    R["ui_error"] = (lambda: L(P_K_IF, "error_006.ogg"), [(P_K_IF, "error_006.ogg")], "erreur, brève et feutrée")
    # ---- Météo -------------------------------------------------------------------
    R["thunder"] = (lambda: cut(ff_filter(L(P_RD2, "sfx100v2_thunder_01.ogg", 2), "lowpass=f=2200," + REVERB_FAR), 4.0, 1.2),
                    [(P_RD2, "sfx100v2_thunder_01.ogg")], "tonnerre lointain (orage)")
    R["weather"] = (lambda: stereo_spread(cut(ff_filter(mix((L(P_RD1, "bell_02.ogg"), 0.0, -3.0), (L(P_RD1, "bell_03.ogg"), 0.35, -7.0)), REVERB_OUT), 2.4, 0.8)),
                    [(P_RD1, "bell_02.ogg"), (P_RD1, "bell_03.ogg")], "annonce météo : cloches lointaines")
    R["ui_open"] = (lambda: L(P_K_RPG, "bookOpen.ogg"), [(P_K_RPG, "bookOpen.ogg")], "ouverture (carnet)")
    R["ui_close"] = (lambda: L(P_K_RPG, "bookClose.ogg"), [(P_K_RPG, "bookClose.ogg")], "fermeture (carnet)")
    R["page_flip_1"] = (lambda: L(P_K_RPG, "bookFlip2.ogg"), [(P_K_RPG, "bookFlip2.ogg")], "page tournée")
    R["page_flip_2"] = (lambda: L(P_K_RPG, "bookFlip3.ogg"), [(P_K_RPG, "bookFlip3.ogg")], "page tournée (variante)")
    R["chalk"] = (lambda: cut(ff_filter(mix((trim_silence(L(P_BB_PAPER, "Mech Pencil Lines 1.wav")), 0.0, 0.0),
                                            (L(P_K_IF, "scratch_004.ogg"), 0.05, -8.0)), "lowpass=f=6500"), 0.5, 0.1),
                  [(P_BB_PAPER, "Mech Pencil Lines 1.wav"), (P_K_IF, "scratch_004.ogg")], "craie : trait de crayon sur papier + grattement")

    for key, (fn, sources, note) in R.items():
        if only and key not in only:
            continue
        path = OUT / "sfx" / f"{key}.ogg"
        a = fn()
        pr = sfx_finish(a, path)
        packs = list(dict.fromkeys(p for p, _ in sources))
        manifest[key] = dict(file=f"sfx/{key}.ogg", duration=round(pr["duration"], 3), loop=False,
                             source=" + ".join(f"{n}" for _, n in sources),
                             author=" + ".join(dict.fromkeys(PACKS[p]["author"] for p in packs)),
                             license=" + ".join(dict.fromkeys(PACKS[p]["license"] for p in packs)),
                             packs=packs, note=note)
        print(f"  sfx/{key}.ogg  {pr['duration']:.2f}s  {pr['size'] / 1e3:.0f} ko  <- {manifest[key]['source']}")
    return manifest


# ---------------------------------------------------------------------------
# Manifest, crédits, vérification
# ---------------------------------------------------------------------------
def write_manifest(manifest: dict) -> None:
    (OUT / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_credits(manifest: dict) -> None:
    works = []
    seen = set()
    for key, m in manifest.get("music", {}).items():
        t = m["source"]
        if ("km", t) in seen:
            continue
        seen.add(("km", t))
        works.append(dict(title=t, author="Kevin MacLeod", license="CC BY 4.0", license_url=CCBY4_URL,
                          source_url="https://incompetech.com/music/royalty-free/index.html?keywords=" + t.replace(" ", "+"),
                          mirror="https://github.com/noobsandnerdsgroup/audio", attribution=km_attribution(t),
                          used_in=[f"music/{key}.ogg"]))
    for section in ("ambience", "sfx"):
        for key, m in manifest.get(section, {}).items():
            for p in m.get("packs", []):
                if ("pack", p) in seen:
                    for w in works:
                        if w.get("_pack") == p:
                            w["used_in"].append(f"{section}/{key}.ogg")
                    continue
                seen.add(("pack", p))
                w = dict(WORKS[p])
                w["_pack"] = p
                w["used_in"] = [f"{section}/{key}.ogg"]
                works.append(w)
    for w in works:
        w.pop("_pack", None)
    doc = dict(
        note=f"Crédits audio de « {GAME} ». Les fichiers ont été recompressés (OGG Vorbis), coupés en boucles, "
             "normalisés et parfois superposés ; aucune source n'est utilisée hors de sa licence.",
        works=works,
        licenses={"CC BY 4.0": CCBY4_URL, "CC BY 3.0": CCBY3_URL, "CC0 1.0": CC0_URL},
    )
    CREDITS_OUT.parent.mkdir(parents=True, exist_ok=True)
    CREDITS_OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def prune(manifest: dict, sections: set[str]) -> None:
    """Supprime les .ogg des dossiers reconstruits qui ne figurent plus dans le manifeste."""
    for section in sections:
        keep = {Path(m["file"]).name for m in manifest.get(section, {}).values()}
        for p in (OUT / section).glob("*.ogg"):
            if p.name not in keep:
                p.unlink()
                print(f"  supprimé (obsolète) : {section}/{p.name}")


TOTAL_LIMIT = 30_000_000


def verify() -> bool:
    ok = True
    total = 0
    limits = {"music": 4_000_000, "ambience": 2_000_000, "sfx": 2_000_000}
    print("\nVérification :")
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    for section in ("music", "ambience", "sfx"):
        listed = {Path(m["file"]).name for m in manifest.get(section, {}).values()}
        for path in sorted((OUT / section).glob("*.ogg")):
            pr = probe(path)
            total += pr["size"]
            problems = []
            if path.name not in listed:
                problems.append("absent du manifeste")
            if pr["codec"] != "vorbis":
                problems.append(f"codec {pr['codec']}")
            if pr["samples"] == 0 or pr["size"] < 1000:
                problems.append("fichier vide")
            if pr["size"] > limits[section]:
                problems.append("trop lourd")
            if pr["sample_rate"] != SR:
                problems.append(f"{pr['sample_rate']} Hz")
            line = f"  {section}/{path.name:20s} {pr['duration']:7.2f}s {pr['size'] / 1e6:5.2f} Mo {pr['codec']} {pr['channels']}ch"
            if section == "sfx":
                a = decode(path, ch=pr["channels"])
                pk = 20 * math.log10(float(np.abs(a).max()) + 1e-9)
                line += f"  pic {pk:5.1f} dBFS"
                if abs(pk + 3.0) > 1.0:  # tolérance : l'encodage Vorbis déplace légèrement les crêtes
                    problems.append("pic hors -3 dBFS")
                if pr["duration"] > 4.0:
                    problems.append("SFX trop long")
            if section in ("music", "ambience"):
                a = decode(path, ch=pr["channels"])
                seam = loop_seam_error(a)
                lufs = measure_lufs(path)
                target = MUSIC_LUFS if section == "music" else AMBIENCE_LUFS
                line += (f"  {lufs:6.1f} LUFS  couture |x[-1]-x[0]|={seam['seam']:.4f} "
                         f"(pas moyen {seam['mean_step']:.4f}, max naturel {seam['p999_step']:.3f})")
                if seam["ratio"] > 1.0:
                    problems.append("couture de boucle suspecte")
                if abs(lufs - target) > 1.0:
                    problems.append(f"loudness {lufs:.1f} != {target}")
                if section == "music" and not (MUSIC_MIN_LOOP - 1 <= pr["duration"] <= 181):
                    problems.append("durée hors plage")
                if section == "ambience" and not (60 <= pr["duration"] <= 90):
                    problems.append("durée hors plage")
            if problems:
                ok = False
                line += "  !! " + ", ".join(problems)
            print(line)
        for name in sorted(listed - {p.name for p in (OUT / section).glob("*.ogg")}):
            ok = False
            print(f"  {section}/{name}  !! listé dans le manifeste mais absent du disque")
    print(f"  Total assets/audio : {total / 1e6:.2f} Mo (limite {TOTAL_LIMIT / 1e6:.0f} Mo)")
    if total > TOTAL_LIMIT:
        ok = False
        print("  !! poids total dépassé")
    print("  OK" if ok else "  ÉCHEC")
    return ok


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", choices=["music", "ambience", "sfx"], action="append")
    ap.add_argument("--keys", help="clés à reconstruire (séparées par des virgules)")
    ap.add_argument("--verify-only", action="store_true")
    args = ap.parse_args()
    keys = set(args.keys.split(",")) if args.keys else None
    manifest_path = OUT / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8")) if manifest_path.exists() else {}
    if not args.verify_only:
        sections = set(args.only or ["music", "ambience", "sfx"])
        full = keys is None
        for d in ("music", "ambience", "sfx"):
            (OUT / d).mkdir(parents=True, exist_ok=True)
        if "music" in sections:
            print("Musiques :")
            built = build_music(keys)
            manifest["music"] = built if full else {**manifest.get("music", {}), **built}
        if "ambience" in sections:
            print("Ambiances :")
            built = build_ambience(keys)
            manifest["ambience"] = built if full else {**manifest.get("ambience", {}), **built}
        if "sfx" in sections:
            print("SFX :")
            built = build_sfx(keys)
            manifest["sfx"] = built if full else {**manifest.get("sfx", {}), **built}
        manifest = {k: manifest[k] for k in ("music", "ambience", "sfx") if k in manifest}
        if full:
            prune(manifest, sections)
        write_manifest(manifest)
        write_credits(manifest)
        print(f"\n{manifest_path} et {CREDITS_OUT} écrits.")
    return 0 if verify() else 1


if __name__ == "__main__":
    sys.exit(main())
