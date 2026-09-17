#!/usr/bin/env python3
"""
build_audio.py — pipeline audio reproductible de « Feux de Brume ».

Produit, à partir de sources libres présentes sur disque (miroirs GitHub) :
  assets/audio/music/*.ogg     boucles musicales (Kevin MacLeod, CC BY 4.0), q5, -16 LUFS
  assets/audio/ambience/*.ogg  boucles d'ambiance (Freesound CC0), q3, -20 LUFS
  assets/audio/sfx/*.ogg       effets (CC0 + samples FluidR3_GM CC BY 3.0), q4, pics -3 dBFS
  assets/audio/manifest.json   registre machine (fichier, durée, boucle, source, auteur, licence)
  assets/credits/audio.json    crédits dédupliqués (œuvre, auteur, licence, URLs, miroir)

Dépendances : Python 3, numpy, imageio_ffmpeg (ffmpeg statique avec libvorbis).
Aucun oscillateur ni bruit synthétique : la corne de brume, les carillons, l'aube,
etc. sont des montages de samples d'instruments réels (FluidR3_GM) ou d'enregistrements.

Usage : python3 tools/build_audio.py [--only music|ambience|sfx] [--verify-only]
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

# ---------------------------------------------------------------------------
# Sources (miroirs locaux). Surchargeables par variables d'environnement.
# ---------------------------------------------------------------------------
KM = Path(os.environ.get("FDB_KM", "/home/user/mirrors/km-audio"))
AMB = Path(os.environ.get("FDB_AMBIENT", "/home/user/mirrors/omarchy-ambient/sounds"))
CC0 = Path(os.environ.get("FDB_CC0", "/home/user/mirrors/cc0sounds"))
KENNEY = Path(os.environ.get("FDB_KENNEY", "/home/user/etdofresh/kenney.nl"))
FLUID = Path(os.environ.get("FDB_FLUID", "/home/user/mirrors/fluidr3"))
FLUID_URL = "https://raw.githubusercontent.com/gleitz/midi-js-soundfonts/gh-pages/FluidR3_GM/"

# Identifiants de « packs » (pour manifest + crédits)
P_KM = "km"
P_FS_WAVES, P_FS_WIND, P_FS_RAIN, P_FS_STORM = "fs_waves", "fs_wind", "fs_rain", "fs_storm"
P_RD1, P_RD_WM, P_RD2, P_RD_CRE, P_RD_RPG, P_RD_WATER, P_RD_BFH = (
    "rd_100sfx", "rd_woodmetal", "rd_100sfx2", "rd_creature", "rd_rpg", "rd_water", "rd_bfh")
P_BB_WOOSH, P_BB_PAPER, P_BB_CHAIR, P_BB_MECH, P_BB_PLOP = (
    "bb_wooshes", "bb_paper", "bb_chairmat", "bb_mechanisms", "bb_plops")
P_K_UI, P_K_IF, P_K_IMP, P_K_RPG = "kenney_ui", "kenney_interface", "kenney_impact", "kenney_rpg"
P_FLUID = "fluidr3"

PACKS = {
    P_KM: dict(dir=KM, author="Kevin MacLeod", license="CC BY 4.0"),
    P_FS_WAVES: dict(dir=AMB, author="SecureSubset", license="CC0 1.0"),
    P_FS_WIND: dict(dir=AMB, author="felix.blume", license="CC0 1.0"),
    P_FS_RAIN: dict(dir=AMB, author="richwise", license="CC0 1.0"),
    P_FS_STORM: dict(dir=AMB, author="Sheyvan", license="CC0 1.0"),
    P_RD1: dict(dir=CC0 / "100-CC0-SFX", author="rubberduck", license="CC0 1.0"),
    P_RD_WM: dict(dir=CC0 / "100-CC0-wood-metal-SFX", author="rubberduck", license="CC0 1.0"),
    P_RD2: dict(dir=CC0 / "100-cc0-sfx-2", author="rubberduck", license="CC0 1.0"),
    P_RD_CRE: dict(dir=CC0 / "80-CC0-creature-SFX", author="rubberduck", license="CC0 1.0"),
    P_RD_RPG: dict(dir=CC0 / "80-CC0-RPG-SFX", author="rubberduck", license="CC0 1.0"),
    P_RD_WATER: dict(dir=CC0 / "40-cc0-water-splash-slime-sfx", author="rubberduck", license="CC0 1.0"),
    P_RD_BFH: dict(dir=CC0 / "75-cc0-breaking-falling-hit-sfx", author="rubberduck", license="CC0 1.0"),
    P_BB_WOOSH: dict(dir=CC0 / "Micro Pack - Organic Wooshes", author="Ben Burnes (Abstraction)", license="CC0 1.0"),
    P_BB_PAPER: dict(dir=CC0 / "bb - Books, Paper, Writing (Jan 2021)", author="Ben Burnes (Abstraction)", license="CC0 1.0"),
    P_BB_CHAIR: dict(dir=CC0 / "Micro Pack - Chairmat", author="Ben Burnes (Abstraction)", license="CC0 1.0"),
    P_BB_MECH: dict(dir=CC0 / "bb - Smol Mechanisms (May 2021)", author="Ben Burnes (Abstraction)", license="CC0 1.0"),
    P_BB_PLOP: dict(dir=CC0 / "bb - Bottle Plops (Apr 2021)", author="Ben Burnes (Abstraction)", license="CC0 1.0"),
    P_K_UI: dict(dir=KENNEY / "kenney_uiaudio" / "Audio", author="Kenney", license="CC0 1.0"),
    P_K_IF: dict(dir=KENNEY / "kenney_interfacesounds" / "Audio", author="Kenney", license="CC0 1.0"),
    P_K_IMP: dict(dir=KENNEY / "kenney_impactsounds" / "Audio", author="Kenney", license="CC0 1.0"),
    P_K_RPG: dict(dir=KENNEY / "kenney_rpgaudio" / "Audio", author="Kenney", license="CC0 1.0"),
    P_FLUID: dict(dir=FLUID, author="Frank Wen", license="CC BY 3.0"),
}

CC0_URL = "https://creativecommons.org/publicdomain/zero/1.0/"
CCBY4_URL = "http://creativecommons.org/licenses/by/4.0/"
CCBY3_URL = "https://creativecommons.org/licenses/by/3.0/"

# Œuvres (pour les crédits dédupliqués). Une entrée par pack / enregistrement.
WORKS = {
    P_FS_WAVES: dict(title="Crashing Waves - Pacific Ocean", author="SecureSubset", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://freesound.org/s/817075/",
                     mirror="https://github.com/funcoder/omarchy-ambient"),
    P_FS_WIND: dict(title="Wind on bushes with muffled gust of wind, twig branch, close to desert ground",
                    author="felix.blume", license="CC0 1.0", license_url=CC0_URL,
                    source_url="https://freesound.org/s/711106/", mirror="https://github.com/funcoder/omarchy-ambient"),
    P_FS_RAIN: dict(title="Soft rain on a tile roof", author="richwise", license="CC0 1.0", license_url=CC0_URL,
                    source_url="https://freesound.org/s/466241/", mirror="https://github.com/funcoder/omarchy-ambient"),
    P_FS_STORM: dict(title="Rain and Thunder Ambience Tübingen", author="Sheyvan", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://freesound.org/s/369547/",
                     mirror="https://github.com/funcoder/omarchy-ambient"),
    P_RD1: dict(title="100 CC0 SFX", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                source_url="https://opengameart.org/content/100-cc0-sfx",
                mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_RD_WM: dict(title="100 CC0 wood / metal SFX", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                  source_url="https://opengameart.org/content/100-cc0-wood-metal-sfx",
                  mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_RD2: dict(title="100 CC0 SFX #2", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                source_url="https://opengameart.org/content/100-cc0-sfx-2",
                mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_RD_CRE: dict(title="80 CC0 creature SFX", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                   source_url="https://opengameart.org/content/80-cc0-creature-sfx",
                   mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_RD_RPG: dict(title="80 CC0 RPG SFX", author="rubberduck", license="CC0 1.0", license_url=CC0_URL,
                   source_url="https://opengameart.org/content/80-cc0-rpg-sfx",
                   mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_RD_WATER: dict(title="40 CC0 water / splash / slime SFX", author="rubberduck", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://opengameart.org/content/40-cc0-water-splash-slime-sfx",
                     mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_RD_BFH: dict(title="75 CC0 breaking / falling / hit SFX", author="rubberduck", license="CC0 1.0",
                   license_url=CC0_URL, source_url="https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx",
                   mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_BB_WOOSH: dict(title="Micro Pack - Organic Wooshes", author="Ben Burnes (Abstraction)", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://abstractionmusic.com/",
                     mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_BB_PAPER: dict(title="Books, Paper, Writing (Jan 2021)", author="Ben Burnes (Abstraction)", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://abstractionmusic.com/",
                     mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_BB_CHAIR: dict(title="Micro Pack - Chairmat", author="Ben Burnes (Abstraction)", license="CC0 1.0",
                     license_url=CC0_URL, source_url="https://abstractionmusic.com/",
                     mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_BB_MECH: dict(title="Smol Mechanisms (May 2021)", author="Ben Burnes (Abstraction)", license="CC0 1.0",
                    license_url=CC0_URL, source_url="https://abstractionmusic.com/",
                    mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_BB_PLOP: dict(title="Bottle Plops (Apr 2021)", author="Ben Burnes (Abstraction)", license="CC0 1.0",
                    license_url=CC0_URL, source_url="https://abstractionmusic.com/",
                    mirror="https://github.com/lavenderdotpet/CC0-Public-Domain-Sounds"),
    P_K_UI: dict(title="UI Audio", author="Kenney", license="CC0 1.0", license_url=CC0_URL,
                 source_url="https://kenney.nl/assets/ui-audio", mirror="https://github.com/ETdoFresh/kenney.nl"),
    P_K_IF: dict(title="Interface Sounds", author="Kenney", license="CC0 1.0", license_url=CC0_URL,
                 source_url="https://kenney.nl/assets/interface-sounds", mirror="https://github.com/ETdoFresh/kenney.nl"),
    P_K_IMP: dict(title="Impact Sounds", author="Kenney", license="CC0 1.0", license_url=CC0_URL,
                  source_url="https://kenney.nl/assets/impact-sounds", mirror="https://github.com/ETdoFresh/kenney.nl"),
    P_K_RPG: dict(title="RPG Audio", author="Kenney", license="CC0 1.0", license_url=CC0_URL,
                  source_url="https://kenney.nl/assets/rpg-audio", mirror="https://github.com/ETdoFresh/kenney.nl"),
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


def soft_saturate(a: np.ndarray, drive: float) -> np.ndarray:
    return (np.tanh(a * drive) / math.tanh(drive)).astype(np.float32)


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
    "menu": ("Evening", 150, 3.0, "calme, mystérieux, nocturne — thème du menu"),
    "act1": ("Midnight Tale", 150, 3.0, "nuit calme et concentrée — acte I"),
    "act2": ("Night Vigil", 150, 3.0, "tension sourde, veille nocturne — acte II"),
    "act3": ("Spellbound", 150, 3.0, "sombre, menace, envoûtement — acte III"),
    "results": ("Piano Between", 150, 2.0, "doux piano, interlude — écran de résultats / atelier"),
    "defeat": ("Mourning Song", 150, 3.0, "deuil sobre — défaite"),
    "ending": ("Stay the Course", 150, 4.0, "lumineux, résolu — fin / générique"),
    "finale": ("Virtutes Vocis", 150, 4.0, "ample, choral, dramatique — nuit 12"),
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
        cut = a[:int(end * SR)]
        looped = crossfade_loop(cut, xf)
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


def _pick_window(a: np.ndarray, length: float, prefer_low_energy: bool = False) -> np.ndarray:
    """Fenêtre de `length` s prise à 10 s du début (les boucles source sont homogènes).
    Pour l'orage : fenêtre la plus riche en graves (contient un coup de tonnerre net)."""
    n = int(length * SR)
    if len(a) <= n:
        return a
    if prefer_low_energy:
        low = ff_filter(to_mono(a), "lowpass=f=120")[:, 0]
        hop = SR
        best, best_s = -1.0, 0
        for s in range(0, len(a) - n, hop):
            seg = low[s:s + n]
            frames = seg[: (len(seg) // hop) * hop].reshape(-1, hop)
            e = np.sqrt((frames ** 2).mean(axis=1))
            score = float(e.max() - np.median(e))  # présence d'un coup de tonnerre net
            if score > best:
                best, best_s = score, s
        return a[best_s:best_s + n]
    return a[int(10 * SR):int(10 * SR) + n]


def build_ambience(only: set[str] | None = None) -> dict:
    manifest = {}
    xf = 4.0
    specs = {
        "waves": (P_FS_WAVES, "waves.ogg", 80.0, "vagues, boucle permanente"),
        "wind": (P_FS_WIND, "wind.ogg", 75.0, "vent, mixé selon la météo"),
        "rain": (P_FS_RAIN, "rain.ogg", 75.0, "pluie sur un toit, mixée selon la météo"),
        "storm": (P_FS_STORM, "storm.ogg", 85.0, "pluie + tonnerre (roulements naturels + Fake Thunder 2)"),
    }
    for key, (pack, name, length, why) in specs.items():
        if only and key not in only:
            continue
        path = OUT / "ambience" / f"{key}.ogg"
        a = decode(src(pack, name), ch=2)
        if key == "storm":
            seg = _pick_window(a, length, prefer_low_energy=True)
            # un roulement lointain supplémentaire, placé loin de la couture
            th = decode(src(P_BB_CHAIR, "Fake Thunder 2.wav"), ch=2)
            th = ff_filter(fade(trim_silence(th), 0.05, 2.0)[:int(10 * SR)], "lowpass=f=900")
            seg = mix((seg, 0.0, 0.0), (th, length * 0.55, -14.0))[:len(seg)]
            sources = [(P_FS_STORM, "Rain and Thunder Ambience Tübingen"), (P_BB_CHAIR, "Fake Thunder 2")]
        else:
            seg = _pick_window(a, length)
            sources = [(pack, WORKS[pack]["title"])]
        looped = crossfade_loop(seg, xf)
        normed, info = loudnorm_loop(looped, AMBIENCE_LUFS)
        encode_ogg(normed, path, 3, title=f"Feux de Brume — ambiance {key}")
        pr = probe(path)
        manifest[key] = dict(file=f"ambience/{key}.ogg", duration=round(pr["duration"], 3), loop=True,
                             source=" + ".join(t for _, t in sources),
                             author=" + ".join(dict.fromkeys(PACKS[p]["author"] for p, _ in sources)),
                             license="CC0 1.0", packs=[p for p, _ in sources], note=why)
        print(f"  ambience/{key}.ogg  <- {name}  {pr['duration']:.1f}s xf={xf}s  "
              f"in={info['input_i']:.1f} -> {info['output_i']:.1f} LUFS ({info['mode']})  {pr['size'] / 1e6:.2f} Mo")
    return manifest


# ---------------------------------------------------------------------------
# SFX
# ---------------------------------------------------------------------------
REVERB_OUT = "aecho=0.8:0.7:60|130|250|400:0.35|0.25|0.18|0.12"      # large extérieur
REVERB_FAR = "aecho=0.7:0.8:90|210|380|560|800:0.45|0.35|0.28|0.2|0.14"  # très lointain


def foghorn(notes: dict, attack: float, hold: float, release: float, drive: float,
            band: tuple[int, int], reverb: str, total: float, extra_lp: int | None = None) -> np.ndarray:
    """Corne de brume à partir de VRAIS samples FluidR3_GM (tuba + trombone + cor + contrebasse).
    1) mixage des samples (gains relatifs), 2) enveloppe attaque/tenue/relâchement,
    3) saturation douce (timbre de diaphone), 4) passe-bande 200-900 Hz + bosse à 350 Hz,
    5) élargissement stéréo + réverbération type grand extérieur, 6) coupe + fondu final."""
    layers = []
    for (instrument, note), g in notes.items():
        s = load_fluid(instrument, note)
        s = sustain(s, hold + release + 0.2)
        layers.append((s, 0.0, g))
    m = mix(*layers)
    m = envelope(m, attack, hold, release)
    m = peak_normalize(m, -6.0)
    m = soft_saturate(m, drive)
    lo, hi = band
    chain = f"highpass=f={lo}:p=2,lowpass=f={hi}:p=2,equalizer=f=350:t=q:w=1.2:g=5"
    if extra_lp:
        chain += f",lowpass=f={extra_lp}"
    m = ff_filter(m, chain)
    st = stereo_spread(m)
    st = ff_filter(st, reverb)
    st = fade(st[:int(total * SR)], 0.0, 0.25)
    return st


def sfx_finish(a: np.ndarray, path: Path, peak: float = -3.0, trim: bool = True, fin: float = 0.003,
               fout: float = 0.015, max_len: float | None = None) -> dict:
    if trim:
        a = trim_silence(a, thresh_db=-55)
    if max_len:
        a = fade(a[:int(max_len * SR)], 0.0, min(fout * 4, 0.3))
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
        return load_fluid(inst, note, ch)

    def note_hit(inst, note, length, g=0.0, body=None, body_g=-6.0):
        a = trim_silence(LF(inst, note))
        layers = [(a, 0.0, g)]
        if body:
            layers.append((trim_silence(LF(*body)), 0.0, body_g))
        return fade(mix(*layers)[:int(length * SR)], 0.0, 0.3)

    def wind_seg(start: float, length: float, ch=2):
        w = decode(src(P_FS_WIND, "wind.ogg"), ch=ch)
        return w[int(start * SR):int((start + length) * SR)]

    # Chaque entrée : nom -> (fonction produisant le tableau, [(pack, fichier ou description)], note)
    R: dict[str, tuple] = {}

    # ---- UI (Kenney) ------------------------------------------------------
    R["ui_hover"] = (lambda: gain(L(P_K_UI, "rollover4.ogg"), 0), [(P_K_UI, "rollover4.ogg")], "survol, discret")
    R["ui_click"] = (lambda: L(P_K_UI, "click1.ogg"), [(P_K_UI, "click1.ogg")], "clic")
    R["ui_back"] = (lambda: L(P_K_IF, "back_002.ogg"), [(P_K_IF, "back_002.ogg")], "retour")
    R["ui_confirm"] = (lambda: L(P_K_IF, "confirmation_001.ogg"), [(P_K_IF, "confirmation_001.ogg")], "validation")
    R["ui_error"] = (lambda: L(P_K_IF, "error_008.ogg"), [(P_K_IF, "error_008.ogg")], "erreur, brève")
    R["ui_open"] = (lambda: L(P_K_RPG, "bookOpen.ogg"), [(P_K_RPG, "bookOpen.ogg")], "ouverture (livre / carnet)")
    R["ui_close"] = (lambda: L(P_K_RPG, "bookClose.ogg"), [(P_K_RPG, "bookClose.ogg")], "fermeture (livre / carnet)")
    R["page_flip_1"] = (lambda: L(P_K_RPG, "bookFlip2.ogg"), [(P_K_RPG, "bookFlip2.ogg")], "page tournée")
    R["page_flip_2"] = (lambda: L(P_K_RPG, "bookFlip3.ogg"), [(P_K_RPG, "bookFlip3.ogg")], "page tournée")

    # ---- Phare ---------------------------------------------------------------
    R["lens_tick_1"] = (lambda: ff_filter(L(P_K_RPG, "metalClick.ogg"), "lowpass=f=6000"),
                        [(P_K_RPG, "metalClick.ogg")], "clic doux du mécanisme de lentille")
    R["lens_tick_2"] = (lambda: ff_filter(trim_silence(L(P_BB_MECH, "Ratchet Muted 1.wav"))[:int(0.25 * SR)], "lowpass=f=5000"),
                        [(P_BB_MECH, "Ratchet Muted 1.wav")], "clic doux du mécanisme de lentille (variante)")
    R["lens_start"] = (lambda: mix((L(P_K_RPG, "metalClick.ogg"), 0.0, -2.0),
                                   (ff_filter(trim_silence(L(P_BB_MECH, "Ratchet Muted 3.wav")), "lowpass=f=5500"), 0.12, 0.0),
                                   (trim_silence(L(P_BB_MECH, "Cable Coiler 2.wav")), 0.9, -6.0)),
                       [(P_K_RPG, "metalClick.ogg"), (P_BB_MECH, "Ratchet Muted 3.wav"), (P_BB_MECH, "Cable Coiler 2.wav")],
                       "mécanisme qui démarre (clic + cliquet + enrouleur)")
    R["oil_refill"] = (lambda: fade(mix((ff_filter(trim_silence(L(P_BB_PLOP, "Plop - Viscous 3.wav")), "lowpass=f=4500"), 0.0, 0.0),
                                        (L(P_RD_WATER, "bubble_02.ogg"), 0.4, -6.0),
                                        (L(P_RD_WATER, "bubble_01.ogg"), 1.3, -8.0))[:int(2.4 * SR)], 0, 0.4),
                       [(P_BB_PLOP, "Plop - Viscous 3.wav"), (P_RD_WATER, "bubble_02.ogg"), (P_RD_WATER, "bubble_01.ogg")],
                       "huile versée dans le réservoir (liquide visqueux + bulles)")
    R["oil_out"] = (lambda: fade(mix((L(P_RD2, "sfx100v2_air_03.ogg"), 0.0, 0.0),
                                     (ff_filter(L(P_RD2, "sfx100v2_air_02.ogg"), "lowpass=f=3000"), 0.08, -6.0))[:int(0.7 * SR)], 0, 0.25),
                    [(P_RD2, "sfx100v2_air_03.ogg"), (P_RD2, "sfx100v2_air_02.ogg")], "flamme soufflée")
    R["oil_relight"] = (lambda: L(P_RD_RPG, "spell_fire_06.ogg"), [(P_RD_RPG, "spell_fire_06.ogg")], "flamme rallumée")

    # ---- Navires -------------------------------------------------------------
    R["bell_dock_1"] = (lambda: L(P_RD1, "bell_01.ogg"), [(P_RD1, "bell_01.ogg")], "cloche claire d'accostage")
    R["bell_dock_2"] = (lambda: L(P_RD1, "bell_03.ogg"), [(P_RD1, "bell_03.ogg")], "cloche claire d'accostage (variante)")
    R["ship_creak_1"] = (lambda: L(P_K_RPG, "creak1.ogg"), [(P_K_RPG, "creak1.ogg")], "bois qui craque")
    R["ship_creak_2"] = (lambda: L(P_K_RPG, "creak2.ogg"), [(P_K_RPG, "creak2.ogg")], "bois qui craque")
    R["ship_creak_3"] = (lambda: ff_filter(L(P_RD_WM, "wood_squeak_01.ogg"), "lowpass=f=5000"),
                         [(P_RD_WM, "wood_squeak_01.ogg")], "bois qui craque (grincement)")
    R["anchor_drop"] = (lambda: mix((L(P_RD_RPG, "chain_03.ogg"), 0.0, 0.0), (L(P_RD_WATER, "splash_12.ogg"), 0.55, -1.0)),
                        [(P_RD_RPG, "chain_03.ogg"), (P_RD_WATER, "splash_12.ogg")], "chaîne puis plouf")
    R["anchor_raise"] = (lambda: mix((L(P_RD_RPG, "chain_01.ogg"), 0.0, 0.0), (L(P_RD_RPG, "chain_02.ogg"), 0.32, -1.0),
                                     (L(P_RD_RPG, "chain_01.ogg"), 0.62, -3.0)),
                         [(P_RD_RPG, "chain_01.ogg"), (P_RD_RPG, "chain_02.ogg")], "chaîne remontée")
    R["wreck_wood"] = (lambda: mix((L(P_K_IMP, "impactWood_heavy_000.ogg"), 0.0, 0.0),
                                   (L(P_RD_WM, "wood_breaking_01.ogg"), 0.02, 0.0),
                                   (L(P_RD_WM, "wood_breaking_02.ogg"), 0.18, -1.0),
                                   (resample_rate(L(P_RD_BFH, "bfh1_breaking_01.ogg"), 0.85), 0.3, -2.0)),
                       [(P_K_IMP, "impactWood_heavy_000.ogg"), (P_RD_WM, "wood_breaking_01.ogg"),
                        (P_RD_WM, "wood_breaking_02.ogg"), (P_RD_BFH, "bfh1_breaking_01.ogg")], "coque qui se brise")
    R["wreck_splash"] = (lambda: mix((resample_rate(L(P_RD_WATER, "splash_01.ogg", 2), 0.85), 0.0, 0.0),
                                     (resample_rate(L(P_RD_WATER, "splash_07.ogg", 2), 0.8), 0.15, -2.0),
                                     (L(P_RD_WATER, "splash_04.ogg", 2), 0.5, -5.0)),
                         [(P_RD_WATER, "splash_01.ogg"), (P_RD_WATER, "splash_07.ogg"), (P_RD_WATER, "splash_04.ogg")],
                         "grosse éclaboussure")
    R["splash_small_1"] = (lambda: L(P_RD_WATER, "splash_09.ogg"), [(P_RD_WATER, "splash_09.ogg")], "petit plouf")
    R["splash_small_2"] = (lambda: L(P_RD_WATER, "splash_10.ogg"), [(P_RD_WATER, "splash_10.ogg")], "petit plouf")
    R["splash_small_3"] = (lambda: L(P_RD_WATER, "splash_15.ogg"), [(P_RD_WATER, "splash_15.ogg")], "petit plouf")
    R["route_draw"] = (lambda: fade(trim_silence(L(P_BB_PAPER, "Fine Felt Tip Lines.wav"))[:int(0.35 * SR)], 0.005, 0.08),
                       [(P_BB_PAPER, "Fine Felt Tip Lines.wav")], "trait de plume sur la carte")
    R["route_set"] = (lambda: ff_filter(L(P_BB_PAPER, "Softcover Tap 1.wav"), "lowpass=f=3500"),
                      [(P_BB_PAPER, "Softcover Tap 1.wav")], "confirmation feutrée (tapotement)")
    R["route_invalid"] = (lambda: L(P_K_IF, "error_005.ogg"), [(P_K_IF, "error_005.ogg")], "tracé invalide")

    # ---- Corne de brume (samples réels uniquement) ----------------------------
    R["horn"] = (lambda: foghorn({("tuba", "Bb1"): 0.0, ("trombone", "Bb1"): -3.0, ("french_horn", "F2"): -6.0,
                                  ("contrabass", "Bb1"): -9.0},
                                 attack=0.16, hold=1.9, release=0.4, drive=2.6, band=(200, 900), reverb=REVERB_OUT,
                                 total=2.45),
                 [(F, "tuba Bb1"), (F, "trombone Bb1"), (F, "french_horn F2"), (F, "contrabass Bb1")],
                 "corne de brume du phare : tuba + trombone + cor + contrebasse (FluidR3), enveloppe, saturation, "
                 "passe-bande 200–900 Hz, réverbération extérieure")
    R["horn_distant"] = (lambda: foghorn({("tuba", "G1"): 0.0, ("trombone", "G1"): -4.0, ("french_horn", "D2"): -7.0,
                                          ("contrabass", "G1"): -8.0},
                                         attack=0.25, hold=0.95, release=0.35, drive=1.8, band=(200, 900),
                                         reverb=REVERB_FAR, total=1.5, extra_lp=450),
                         [(F, "tuba G1"), (F, "trombone G1"), (F, "french_horn D2"), (F, "contrabass G1")],
                         "réponse lointaine d'un navire : plus grave, filtrée à 450 Hz, réverbération longue")

    # ---- Brume / Bête ----------------------------------------------------------
    def growl(name, rate, extra=None):
        a = resample_rate(L(P_RD_CRE, name), rate)
        if extra:
            a = mix((a, 0.0, 0.0), (resample_rate(L(P_RD_CRE, extra), rate * 0.9), 0.25, -4.0))
        a = ff_filter(a, "highpass=f=50,lowpass=f=2200")
        return ff_filter(stereo_spread(a), REVERB_OUT)

    R["beast_growl_1"] = (lambda: growl("monster_04.ogg", 0.8, "monster_07.ogg"),
                          [(P_RD_CRE, "monster_04.ogg"), (P_RD_CRE, "monster_07.ogg")], "souffle grave de la Bête (pitch -, réverb)")
    R["beast_growl_2"] = (lambda: ff_filter(stereo_spread(ff_filter(
                              mix((resample_rate(L(P_RD_RPG, "creature_roar_02.ogg"), 0.75), 0.0, 0.0),
                                  (resample_rate(L(P_RD_CRE, "monster_06.ogg"), 0.7), 0.3, -5.0)), "lowpass=f=1600")), REVERB_OUT),
                          [(P_RD_RPG, "creature_roar_02.ogg"), (P_RD_CRE, "monster_06.ogg")], "grondement de la Bête (variante)")
    R["beast_hurt"] = (lambda: ff_filter(stereo_spread(ff_filter(resample_rate(L(P_RD_RPG, "creature_hurt_01.ogg"), 0.8), "lowpass=f=2500")), REVERB_OUT),
                       [(P_RD_RPG, "creature_hurt_01.ogg")], "la Bête touchée par le faisceau")
    R["beast_retreat"] = (lambda: ff_filter(mix((trim_silence(L(P_BB_CHAIR, "Woom 4.wav", 2)), 0.0, 0.0),
                                                (resample_rate(trim_silence(L(P_BB_WOOSH, "Swish 6.wav", 2)), 0.55), 0.1, -2.0)),
                                            "lowpass=f=1200"),
                          [(P_BB_CHAIR, "Woom 4.wav"), (P_BB_WOOSH, "Swish 6.wav")], "woosh grave de retraite")
    R["fog_whisper"] = (lambda: fade(mix((ff_filter(wind_seg(40, 4.0), "highpass=f=250,lowpass=f=1800"), 0.0, 0.0),
                                         (resample_rate(trim_silence(L(P_RD_CRE, "breath.ogg")), 0.5), 1.2, -8.0)), 1.2, 1.5),
                        [(P_FS_WIND, "wind.ogg"), (P_RD_CRE, "breath.ogg")], "souffle long et discret de la brume")

    # ---- Météo ------------------------------------------------------------------
    R["thunder_1"] = (lambda: L(P_RD2, "sfx100v2_thunder_01.ogg", 2), [(P_RD2, "sfx100v2_thunder_01.ogg")], "tonnerre proche")
    R["thunder_2"] = (lambda: fade(trim_silence(L(P_BB_CHAIR, "Fake Thunder 1.wav", 2))[:int(7.0 * SR)], 0, 2.0),
                      [(P_BB_CHAIR, "Fake Thunder 1.wav")], "roulement de tonnerre")
    R["thunder_3"] = (lambda: fade(trim_silence(L(P_BB_CHAIR, "Fake Thunder 2.wav", 2))[:int(8.0 * SR)], 0, 2.5),
                      [(P_BB_CHAIR, "Fake Thunder 2.wav")], "roulement de tonnerre lointain")
    R["gust"] = (lambda: mix((fade(ff_filter(wind_seg(120, 3.5), "highpass=f=150"), 1.0, 1.6), 0.0, 0.0),
                             (resample_rate(trim_silence(L(P_BB_WOOSH, "Whistle 1.wav", 2)), 0.5), 0.9, -3.0)),
                 [(P_FS_WIND, "wind.ogg"), (P_BB_WOOSH, "Whistle 1.wav")], "rafale de vent")

    # ---- Récompenses (samples réels) ---------------------------------------------
    R["page_pickup"] = (lambda: mix((L(P_RD1, "paper_01.ogg"), 0.0, 0.0),
                                    (trim_silence(LF("glockenspiel", "A5")), 0.12, -6.0),
                                    (trim_silence(LF("glockenspiel", "E6")), 0.28, -9.0))[:int(1.4 * SR)],
                        [(P_RD1, "paper_01.ogg"), (F, "glockenspiel A5"), (F, "glockenspiel E6")], "page de journal ramassée (papier + carillon)")
    R["shard"] = (lambda: mix((L(P_K_IMP, "impactGlass_light_001.ogg"), 0.0, 0.0),
                              (trim_silence(LF("glockenspiel", "C6")), 0.02, -10.0))[:int(1.0 * SR)],
                  [(P_K_IMP, "impactGlass_light_001.ogg"), (F, "glockenspiel C6")], "éclat cristallin")
    R["star_1"] = (lambda: note_hit("glockenspiel", "C5", 1.3, body=("celesta", "C5")), [(F, "glockenspiel C5"), (F, "celesta C5")], "étoile 1 (do)")
    R["star_2"] = (lambda: note_hit("glockenspiel", "E5", 1.3, body=("celesta", "E5")), [(F, "glockenspiel E5"), (F, "celesta E5")], "étoile 2 (mi)")
    R["star_3"] = (lambda: note_hit("glockenspiel", "G5", 1.3, body=("celesta", "G5")), [(F, "glockenspiel G5"), (F, "celesta G5")], "étoile 3 (sol)")
    R["upgrade"] = (lambda: fade(mix((trim_silence(LF("orchestral_harp", "C4")), 0.0, 0.0),
                                     (trim_silence(LF("orchestral_harp", "E4")), 0.09, 0.0),
                                     (trim_silence(LF("orchestral_harp", "G4")), 0.18, 0.0),
                                     (trim_silence(LF("orchestral_harp", "C5")), 0.27, 0.0),
                                     (trim_silence(LF("glockenspiel", "C6")), 0.36, -7.0))[:int(1.8 * SR)], 0, 0.5),
                    [(F, "orchestral_harp C4/E4/G4/C5"), (F, "glockenspiel C6")], "amélioration achetée (arpège de harpe)")
    R["night_win"] = (lambda: fade(mix((trim_silence(LF("tubular_bells", "C4", 2)), 0.0, 0.0),
                                       (trim_silence(LF("tubular_bells", "G4", 2)), 0.25, -3.0),
                                       (trim_silence(LF("glockenspiel", "C5")), 0.5, -6.0),
                                       (trim_silence(LF("glockenspiel", "E5")), 0.62, -6.0),
                                       (trim_silence(LF("glockenspiel", "G5")), 0.74, -6.0),
                                       (trim_silence(LF("glockenspiel", "C6")), 0.86, -5.0))[:int(2.8 * SR)], 0, 0.8),
                      [(F, "tubular_bells C4/G4"), (F, "glockenspiel C5/E5/G5/C6")], "nuit gagnée : cloche + carillon")
    R["night_lose"] = (lambda: fade(mix((envelope(sustain(LF("contrabass", "C1"), 3.0), 0.3, 1.6, 1.2), 0.0, 0.0),
                                        (envelope(sustain(LF("cello", "C2"), 3.0), 0.3, 1.6, 1.2), 0.0, -3.0),
                                        (resample_rate(trim_silence(LF("tubular_bells", "C4", 2)), 0.5), 0.1, -4.0)), 0, 0.6),
                       [(F, "contrabass C1"), (F, "cello C2"), (F, "tubular_bells C4 (une octave plus bas)")],
                       "nuit perdue : glas grave et sobre")
    R["dawn"] = (lambda: ff_filter(stereo_spread(mix((envelope(sustain(LF("string_ensemble_1", "C3"), 4.5), 1.5, 3.0, 1.4), 0.0, 0.0),
                                                     (envelope(sustain(LF("string_ensemble_1", "E3"), 4.5), 1.6, 3.0, 1.4), 0.1, -2.0),
                                                     (envelope(sustain(LF("string_ensemble_1", "G3"), 4.5), 1.7, 3.0, 1.4), 0.2, -2.0),
                                                     (envelope(sustain(LF("string_ensemble_1", "C4"), 4.5), 1.9, 3.0, 1.4), 0.3, -3.0),
                                                     (envelope(sustain(LF("pad_2_warm", "C3"), 4.5), 1.5, 3.0, 1.4), 0.0, -4.0),
                                                     (envelope(sustain(LF("choir_aahs", "C4"), 4.5), 2.0, 3.0, 1.4), 0.6, -8.0))),
                                   "aecho=0.8:0.6:40|90:0.3|0.2"),
                 [(F, "string_ensemble_1 C3/E3/G3/C4"), (F, "pad_2_warm C3"), (F, "choir_aahs C4")],
                 "l'aube se lève : montée douce de cordes (samples réels)")
    R["warning"] = (lambda: L(P_K_IF, "tick_004.ogg"), [(P_K_IF, "tick_004.ogg")], "tic d'alerte discret")
    R["tick"] = (lambda: L(P_K_IF, "tick_002.ogg"), [(P_K_IF, "tick_002.ogg")], "tic (horloge / compteur)")

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
        note="Crédits audio de « Feux de Brume ». Les fichiers ont été recompressés (OGG Vorbis), coupés en boucles, "
             "normalisés et parfois superposés ; aucune source n'est utilisée hors de sa licence.",
        works=works,
        licenses={"CC BY 4.0": CCBY4_URL, "CC BY 3.0": CCBY3_URL, "CC0 1.0": CC0_URL},
    )
    CREDITS_OUT.parent.mkdir(parents=True, exist_ok=True)
    CREDITS_OUT.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def verify() -> bool:
    ok = True
    total = 0
    limits = {"music": 4_000_000, "ambience": 2_000_000, "sfx": 2_000_000}
    print("\nVérification :")
    for section in ("music", "ambience", "sfx"):
        for path in sorted((OUT / section).glob("*.ogg")):
            pr = probe(path)
            total += pr["size"]
            problems = []
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
                if section == "music" and not (20 <= pr["duration"] <= 181):
                    problems.append("durée hors plage")
                if section == "ambience" and not (60 <= pr["duration"] <= 90):
                    problems.append("durée hors plage")
            if problems:
                ok = False
                line += "  !! " + ", ".join(problems)
            print(line)
    print(f"  Total assets/audio : {total / 1e6:.2f} Mo (limite 35 Mo)")
    if total > 35_000_000:
        ok = False
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
        for d in ("music", "ambience", "sfx"):
            (OUT / d).mkdir(parents=True, exist_ok=True)
        if "music" in sections:
            print("Musiques :")
            manifest.setdefault("music", {}).update(build_music(keys))
        if "ambience" in sections:
            print("Ambiances :")
            manifest.setdefault("ambience", {}).update(build_ambience(keys))
        if "sfx" in sections:
            print("SFX :")
            manifest.setdefault("sfx", {}).update(build_sfx(keys))
        manifest = {k: manifest[k] for k in ("music", "ambience", "sfx") if k in manifest}
        write_manifest(manifest)
        write_credits(manifest)
        print(f"\n{manifest_path} et {CREDITS_OUT} écrits.")
    return 0 if verify() else 1


if __name__ == "__main__":
    sys.exit(main())
