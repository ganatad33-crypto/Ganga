"""Synthesizes an original upbeat backing track (C-G-Am-F pop loop) -> music.wav"""
import os, sys, wave
import numpy as np

SR = 44100
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 33.0
BPM = 128
BEAT = 60 / BPM
N = int(SR * DUR)
out = np.zeros(N)

def note_hz(m): return 440 * 2 ** ((m - 69) / 12)

def add(sig, start):
    i = int(start * SR)
    if i >= N: return
    sig = sig[: N - i]
    out[i:i + len(sig)] += sig

def tone(m, length, kind="pluck", vol=.2):
    t = np.arange(int(length * SR)) / SR
    f = note_hz(m)
    if kind == "pluck":
        s = (np.sin(2*np.pi*f*t) + .5*np.sin(4*np.pi*f*t) + .25*np.sin(6*np.pi*f*t)) * np.exp(-t * 9)
    elif kind == "bass":
        s = np.tanh(2.5*np.sin(2*np.pi*f*t)) * np.exp(-t * 4)
    elif kind == "pad":
        s = sum(np.sin(2*np.pi*f*d*t) for d in (1, 1.004, .996)) / 3
        s *= np.minimum(1, t / .3) * np.minimum(1, (length - t) / .4)
    elif kind == "lead":
        s = (np.sign(np.sin(2*np.pi*f*t)) * .35 + np.sin(2*np.pi*f*t)) * np.exp(-t * 3) * (1 + .1*np.sin(2*np.pi*6*t))
    return s * vol

def kick():
    t = np.arange(int(.3 * SR)) / SR
    return np.sin(2*np.pi*(50 + 120*np.exp(-t*30))*t) * np.exp(-t * 9) * .55
def clap():
    t = np.arange(int(.2 * SR)) / SR
    return np.random.default_rng(1).standard_normal(len(t)) * np.exp(-t * 25) * .18
def hat():
    t = np.arange(int(.06 * SR)) / SR
    n = np.random.default_rng(2).standard_normal(len(t))
    return np.diff(n, prepend=0) * np.exp(-t * 70) * .06

CHORDS = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [57, 60, 64]), (41, [57, 60, 65])]  # C G Am F
MELODY = [  # (beat offset in 4-bar phrase, midi, length in beats) — original tune
    (0, 72, 1), (1, 74, .5), (1.5, 76, 1.5), (3, 79, 1),
    (4, 79, 1), (5, 77, .5), (5.5, 76, .5), (6, 74, 2),
    (8, 76, 1), (9, 77, .5), (9.5, 79, 1.5), (11, 81, 1),
    (12, 79, 1), (13, 76, 1), (14, 72, 2),
]

bars = int(DUR / (4 * BEAT)) + 1
for b in range(bars):
    t0 = b * 4 * BEAT
    root, chord = CHORDS[b % 4]
    intro = b < 2 and not os.environ.get("PROMO")
    add(tone(root + 12, 4 * BEAT, "pad", .05) * 0 + sum(tone(m, 4 * BEAT, "pad", .045) for m in chord), t0)
    for i in range(16):  # 16th arpeggio
        add(tone(chord[[0, 1, 2, 1][i % 4]] + 12 * (i % 8 >= 4), BEAT / 2, "pluck", .07), t0 + i * BEAT / 4)
    if intro: continue
    for i in range(8):
        add(tone(root - 12 + (12 if i % 2 else 0), BEAT / 2, "bass", .16), t0 + i * BEAT / 2)
    for i in range(4):
        add(kick(), t0 + i * BEAT)
        if i % 2: add(clap(), t0 + i * BEAT)
        add(hat(), t0 + i * BEAT + BEAT / 2)
    if b >= 4:  # melody enters
        phrase_start = (b // 4) * 16 * BEAT
        for off, m, ln in MELODY:
            st = phrase_start + off * BEAT
            if t0 <= st < t0 + 4 * BEAT:
                add(tone(m, ln * BEAT, "lead", .09), st)

if os.environ.get("PROMO"):  # whoosh into + boom on every cut
    rng = np.random.default_rng(9)
    for bar in (1, 2, 4, 6, 8, 10, 12, 14):
        c = bar * 4 * BEAT
        L = int(.45 * SR); tt = np.arange(L) / SR
        n = rng.standard_normal(L); n = np.convolve(n, np.ones(6) / 6, "same")
        add(n * (tt / tt[-1]) ** 2 * .22, c - .45)
        Lb = int(.7 * SR); tb = np.arange(Lb) / SR
        add(np.sin(2*np.pi*(40 + 80*np.exp(-tb*12))*tb) * np.exp(-tb*4.5) * .7, c)

# final fade
fade = int(1.5 * SR)
out[-fade:] *= np.linspace(1, 0, fade)
out /= max(1e-9, np.abs(out).max()) / .85
with wave.open("music.wav", "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((out * 32767).astype(np.int16).tobytes())
print("music.wav", DUR, "s")
