"""Synthesizes the soundtrack (music + sound effects) for the video -> audio.wav.
Timings match the scene timeline in index.html."""
import sys
import wave
import numpy as np

V2 = len(sys.argv) > 1 and sys.argv[1] == "v2"

SR = 44100
DUR = 58.4
N = int(SR * DUR)
rng = np.random.default_rng(3)
mus = np.zeros(N)
sfx = np.zeros(N)


def tt(d):
    return np.arange(int(SR * d)) / SR


def add(buf, t0, x, g=1.0):
    i = int(t0 * SR)
    if i >= N:
        return
    x = x[: N - i]
    buf[i:i + len(x)] += g * x


def filt(x, lo=None, hi=None):
    """FFT band filter with soft edges."""
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if hi:
        m *= 1 / (1 + (f / hi) ** 4)
    if lo:
        m *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X * m, len(x))


def env(n, a=0.005, d=0.2):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)


def saw(f, t):
    return 2 * ((f * t) % 1) - 1


def square(f, t):
    return np.sign(np.sin(2 * np.pi * f * t))


def note(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---------- instruments ----------
def kick(g=1.0):
    t = tt(0.35)
    f = 50 + 110 * np.exp(-t * 30)
    return g * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def snare():
    t = tt(0.2)
    n = filt(rng.standard_normal(len(t)), lo=1500, hi=9000)
    return (0.55 * n + 0.4 * np.sin(2 * np.pi * 190 * t)) * np.exp(-t * 22)


def hat():
    t = tt(0.05)
    return filt(rng.standard_normal(len(t)), lo=7000) * np.exp(-t * 90) * 0.35


def bass(m, d):
    t = tt(d)
    x = saw(note(m), t) + 0.5 * np.sin(2 * np.pi * note(m) * t)
    return filt(x, hi=500) * env(len(t), 0.004, d * 0.7)


def lead(m, d):
    t = tt(d)
    x = 0.6 * square(note(m), t) + 0.4 * saw(note(m) * 1.003, t)
    return filt(x, hi=3500) * env(len(t), 0.004, 0.18)


def pad(ms, d):
    t = tt(d)
    x = sum(saw(note(m) * (1 + dt), t) for m in ms for dt in (-0.004, 0.004))
    e = np.minimum(1, t / 0.08) * np.minimum(1, (d - t) / 0.2)
    return filt(x, hi=1400) * e / len(ms)


# ---------- groove ----------
BEAT = 0.5  # 120 BPM
CHORDS = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]  # C G Am F
MEL = [  # per bar: (8th index, midi, length in 8ths)
    [(0, 72, 1), (1, 76, 1), (2, 79, 2), (5, 76, 1), (6, 79, 2)],
    [(0, 74, 1), (1, 79, 1), (2, 83, 2), (5, 79, 1), (6, 74, 2)],
    [(0, 76, 1), (1, 81, 1), (2, 84, 2), (4, 81, 1), (5, 79, 1), (6, 76, 2)],
    [(0, 77, 1), (1, 81, 1), (2, 84, 1), (3, 81, 1), (4, 79, 2), (6, 77, 1), (7, 79, 1)],
]


def groove(t0, t1, full=True, mel=True):
    bar = 0
    t = t0
    while t < t1 - 0.01:
        root, ch = CHORDS[bar % 4]
        add(mus, t, pad(ch, min(4 * BEAT, t1 - t)), 0.18)
        for b in range(4):
            tb = t + b * BEAT
            if tb >= t1:
                break
            if full:
                add(mus, tb, kick(), 0.9)
                if b in (1, 3):
                    add(mus, tb, snare(), 0.5)
            for h in range(2):
                add(mus, tb + h * BEAT / 2, hat(), 0.5 if h else 0.3)
            for h, off in enumerate((0, 12)):
                if tb + h * BEAT / 2 < t1:
                    add(mus, tb + h * BEAT / 2, bass(root + off, BEAT / 2), 0.45)
        if mel:
            for i8, m, l8 in MEL[bar % 4]:
                ts = t + i8 * BEAT / 2
                if ts < t1:
                    add(mus, ts, lead(m, l8 * BEAT / 2), 0.16)
        bar += 1
        t += 4 * BEAT


# ---------- S1: news intro ----------
def boom():
    t = tt(1.2)
    k = np.zeros(len(t))
    kk = kick(1.2)
    k[:len(kk)] = kk
    return k + filt(rng.standard_normal(len(t)), hi=300) * np.exp(-t * 4) * 0.6


def brass(ms, d):
    t = tt(d)
    x = sum(saw(note(m) * (1 + v), t) for m in ms for v in (-0.006, 0, 0.006))
    e = np.minimum(1, t / 0.03) * np.exp(-t * 1.6)
    return filt(x, hi=2200) * e / len(ms)


for tm, ch in [(0.15, [48, 55, 60, 63]), (0.75, [46, 53, 58, 62]), (1.25, [44, 51, 56, 60, 63])]:
    add(mus, tm, boom(), 0.8)
    add(mus, tm, brass(ch, 1.1 if tm < 1 else 2.8), 0.5)
for i in range(int((4.4 - 1.6) / 0.25)):  # ticking news pulse
    t = tt(0.03)
    add(mus, 1.6 + i * 0.25, np.sin(2 * np.pi * (1800 if i % 4 == 0 else 1200) * t) * np.exp(-t * 150), 0.25)
    if i % 2 == 0:
        add(mus, 1.6 + i * 0.25, bass(36, 0.25), 0.4)
r = tt(1.2)  # riser into the groove
add(sfx, 3.3, filt(rng.standard_normal(len(r)), lo=800, hi=6000) * (r / 1.2) ** 2, 0.35)

# ---------- music body ----------
groove(4.5, 46.0)
groove(51.6, 56.6, full=False)
groove(52.6, 56.6, mel=False)
add(mus, 56.6, pad([60, 64, 67, 72], 1.8), 0.4)
add(mus, 56.6, kick(), 0.8)
add(mus, 56.6, bass(36, 1.6), 0.5)

# ---------- SFX ----------
def whoosh(d=0.45):
    t = tt(d)
    n = rng.standard_normal(len(t))
    e = np.sin(np.pi * t / d) ** 2
    return filt(n, lo=400, hi=5000) * e


for ts in (13, 20.3, 29.8, 37.3, 51.6):
    add(sfx, ts - 0.3, whoosh(), 0.35)


def blip(f0=900, f1=1400, d=0.09):
    t = tt(d)
    f = f0 + (f1 - f0) * t / d
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(t), 0.002, d / 3)


def ding(f=1568, d=0.6):
    t = tt(d)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.01 * t)) * env(len(t), 0.002, 0.18)


# S2: rows pop + counting ticks
for i in range(4):
    t0 = 5.4 + i * 1.75
    add(sfx, t0, blip(500, 900, 0.12), 0.4)
    for k in range(18):
        add(sfx, t0 + 0.3 + k * 0.055, blip(2400, 2400, 0.015), 0.12)
    add(sfx, t0 + 1.4, ding(1318 if i < 3 else 523, 0.5), 0.25)

# S3: stamps + sad trombone
def thud():
    t = tt(0.15)
    return (np.sin(2 * np.pi * 110 * t) + filt(rng.standard_normal(len(t)), hi=1200) * 0.6) * np.exp(-t * 30)


for d in range(1, 23):
    add(sfx, 13.9 + (d - 1) * 0.16, thud(), 0.45)
add(sfx, 13.9 + 22 * 0.16 + 0.35, ding(2093, 0.8), 0.3)
for k, (m, d) in enumerate([(58, 0.35), (57, 0.35), (56, 0.35), (55, 1.1)]):
    t = tt(d)
    f = note(m - 12) * (1 + (0.02 * np.sin(2 * np.pi * 6 * t) if k == 3 else 0))
    x = filt(saw(f, t), hi=1100) * np.minimum(1, t / 0.03) * np.minimum(1, (d - t) / 0.08)
    add(sfx, 18.5 + k * 0.38, x, 0.55)

# S4: chat pops
for tm in (20.8, 21.9, 22.8, 23.6, 24.7, 25.3, 26.0, 27.2):
    add(sfx, tm, blip(1000, 1600, 0.07), 0.35)
    add(sfx, tm + 0.07, blip(1600, 2100, 0.06), 0.25)
add(sfx, 28.5, blip(600, 300, 0.25), 0.4)

# S5: slam + party horn + cheer
add(sfx, 29.9, boom(), 0.9)
t = tt(0.9)
horn = filt(saw(420 + 260 * np.minimum(1, t / 0.15) + 12 * np.sin(2 * np.pi * 9 * t), t), hi=3000)
add(sfx, 30.0, horn * np.minimum(1, t / 0.02) * np.minimum(1, (0.9 - t) / 0.1), 0.3)
t = tt(3.0)
cheer = filt(rng.standard_normal(len(t)), lo=500, hi=3500) * (1 + 0.5 * np.sin(2 * np.pi * 7 * t)) * np.exp(-t * 0.9)
add(sfx, 29.95, cheer * np.minimum(1, t / 0.1), 0.35)
for i in range(4):
    add(sfx, 33.0 + i * 0.2, blip(700, 1300, 0.1), 0.3)

# S6: checks
for i in range(4):
    t0 = 38.9 + i * 1.65
    add(sfx, t0, whoosh(0.25), 0.15)
    add(sfx, t0 + 0.75, ding(1760, 0.5), 0.3)
    add(sfx, t0 + 0.75, ding(2637, 0.5), 0.15)

# S7: record scratch, silence, alarm
t = tt(0.55)
scr_f = 300 + 900 * np.abs(np.sin(2 * np.pi * 3.2 * t))
scratch = filt(rng.standard_normal(len(t)), lo=200, hi=4000) * 0.5 + 0.6 * saw(scr_f, t)
add(sfx, 45.95, filt(scratch, hi=3000) * np.exp(-t * 3), 0.55)
add(sfx, 46.25, blip(300, 200, 0.2), 0.4)
add(sfx, 47.4, boom(), 1.0)
t = tt(2.2)
siren_f = np.where((t // 0.25) % 2 == 0, 960, 770)
siren = filt(square(siren_f, t) * 0.5 + saw(siren_f, t) * 0.5, hi=2500)
add(sfx, 47.4, siren * np.minimum(1, t / 0.02) * np.minimum(1, (2.2 - t) / 0.2), 0.7)
t = tt(0.8)
add(sfx, 49.9, filt(rng.standard_normal(len(t)), lo=2500, hi=8000) * np.sin(np.pi * t / 0.8) ** 2, 0.25)  # "shhh"

# S8: heart beat + CTA
add(sfx, 52.9, blip(400, 800, 0.15), 0.35)
add(sfx, 53.8, ding(1318, 0.8), 0.3)

# ---------- v2 extras ----------
if V2:
    t = tt(0.9)  # bus horn (two-tone)
    horn2 = filt(saw(311, t) + saw(392, t), hi=1800) * np.minimum(1, t / 0.02) * np.minimum(1, (0.9 - t) / 0.08)
    add(sfx, 34.7, horn2[: int(0.35 * SR)], 0.35)
    add(sfx, 35.15, horn2, 0.35)
    for k in range(8):  # wall clock ticking in the quiet morning
        t = tt(0.03)
        add(sfx, 37.6 + k, filt(rng.standard_normal(len(t)), lo=2000) * np.exp(-t * 200), 0.25)
    for tm in (52.6, 52.8):  # characters pop in
        add(sfx, tm, blip(500, 1000, 0.12), 0.3)
    for tm in (53.4, 53.6):  # sunglasses on
        add(sfx, tm, ding(2637, 0.3), 0.15)

# ---------- mix ----------
fade = np.ones(N)
fi = int(57.6 * SR)
fade[fi:] = np.linspace(1, 0, N - fi)
mix = (0.8 * mus + sfx) * fade
mix = np.tanh(mix / np.max(np.abs(mix)) * 1.6) * 0.89
st = np.stack([mix, mix], 1)
st = (st * 32767).astype(np.int16)
with wave.open('audio-v2.wav' if V2 else 'audio.wav', 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(st.tobytes())
print('ok', DUR)
