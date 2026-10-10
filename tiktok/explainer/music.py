"""Procedural soundtrack for the explainer: 120 BPM synth-pop loop,
whooshes on every scene cut and impacts on every hit from timeline.json.
Usage: python3 music.py  ->  out/music.wav
"""
import json
import os
import wave

import numpy as np

SR = 44100
BPM = 120
BEAT = 60 / BPM
here = os.path.dirname(os.path.abspath(__file__))
tl = json.load(open(os.path.join(here, 'out', 'timeline.json')))
DUR = tl['dur']
N = int(SR * DUR)
rng = np.random.default_rng(7)
mix = np.zeros((N, 2))


def add(sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    mix[i:i + len(sig), 0] += sig * gain * (1 - max(pan, 0))
    mix[i:i + len(sig), 1] += sig * gain * (1 + min(pan, 0))


def env(n, a=0.005, r=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / r)


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def saw(f, n, detune=(0.0,)):
    t = np.arange(n) / SR
    return sum(2 * ((t * f * (1 + d)) % 1) - 1 for d in detune) / len(detune)


# --- one-shot instruments (precomputed) ---
n = int(0.45 * SR)
tt = np.arange(n) / SR
KICK = np.sin(2 * np.pi * (45 * tt + 90 * (1 - np.exp(-tt * 30)) / 30)) * env(n, 0.001, 0.16)
n = int(0.25 * SR)
CLAP = lowpass(rng.uniform(-1, 1, n), 4000) * env(n, 0.001, 0.07)
n = int(0.06 * SR)
HAT = rng.uniform(-1, 1, n)
HAT = (HAT - lowpass(HAT, 7000)) * env(n, 0.001, 0.018)
n = int(1.4 * SR)
tt = np.arange(n) / SR
IMPACT = (np.sin(2 * np.pi * (38 * tt + 60 * (1 - np.exp(-tt * 8)) / 8)) * env(n, 0.002, 0.5)
          + 0.5 * lowpass(rng.uniform(-1, 1, n), 1500) * env(n, 0.001, 0.12))
n = int(0.6 * SR)
nz = rng.uniform(-1, 1, n)
sweep = np.sin(np.linspace(0, np.pi, n)) ** 2
WHOOSH = (nz - lowpass(nz, 600)) * sweep * 0.5

# chord progression Am F C G, one chord per bar (2 s)
CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
ROOTS = [45, 41, 48, 43]
mtof = lambda m: 440 * 2 ** ((m - 69) / 12)

BAR = 4 * BEAT
nbars = int(DUR / BAR)
pad = np.zeros(N)
bass = np.zeros(N)
for b in range(nbars):
    t0 = b * BAR
    i0 = int(t0 * SR)
    m = int(BAR * SR)
    seg = sum(saw(mtof(x), m, (-0.004, 0, 0.005)) for x in CHORDS[b % 4]) / 3
    a = np.minimum(1, np.arange(m) / (0.3 * SR)) * np.minimum(1, (m - np.arange(m)) / (0.2 * SR))
    pad[i0:i0 + m] += seg[: N - i0] * a[: N - i0]
    for k in range(8):  # eighth-note bass pulses
        j = int((t0 + k * BEAT / 2) * SR)
        q = int(BEAT / 2 * SR)
        f = mtof(ROOTS[b % 4] - 12 + (12 if k % 4 == 3 else 0))
        s = saw(f, q) * env(q, 0.003, 0.12)
        bass[j:j + q] += s[: N - j]
pad = lowpass(pad, 1400)
bass = lowpass(bass, 500)

# sidechain-style ducking on every beat
t = np.arange(N) / SR
duck = 1 - 0.55 * np.exp(-((t % BEAT) / 0.09))

drums_on = lambda x: 4 <= x < 113.5  # silent intro hook, outro breathes
for k in range(int(DUR / BEAT)):
    x = k * BEAT
    if drums_on(x):
        add(KICK, x, 0.9)
        if k % 2 == 1:
            add(CLAP, x, 0.35, 0.1)
    if 8 <= x < 113.5:
        add(HAT, x + BEAT / 2, 0.22, -0.3)
        add(HAT, x + BEAT / 4 * 3, 0.10, 0.3)

intro = np.clip((t - 0) / 0.5, 0, 1)
mix[:, 0] += pad * 0.20 * duck * intro + bass * 0.32 * duck * (t >= 4)
mix[:, 1] += pad * 0.20 * duck * intro + bass * 0.32 * duck * (t >= 4)

for c in tl['bounds']:
    add(WHOOSH, c - 0.42, 0.55, 0.0)
for h in tl['hits']:
    add(IMPACT, h, 0.6)

# master: fade out, soft clip, normalise
fade = np.clip((DUR - t) / 2.5, 0, 1)
mix *= fade[:, None]
mix = np.tanh(mix * 1.2)
mix /= np.max(np.abs(mix)) / 0.89
pcm = (mix * 32767).astype('<i2')
with wave.open(os.path.join(here, 'out', 'music.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote out/music.wav', DUR, 's')
