"""A second fixture, deliberately unlike the first: 86 BPM, heavily swung,
F# minor, sparse, with the melody entering only in the middle section.

Two fixtures that differ in tempo, key, feel and arrangement make the
end-to-end tests meaningful — one fixture can be accidentally satisfied by a
tuning that does not generalise.
"""
import sys

import numpy as np
import soundfile as sf
SR, BPM = 44100, 86.0
BEAT = 60.0 / BPM

def env(n, a, d):
    ai = max(1, int(a * SR)); di = max(1, n - ai)
    return np.concatenate([np.linspace(0, 1, ai), np.exp(-np.linspace(0, d, di))])[:n]

def tone(f, dur, amp=.3, harm=3, a=.02, d=4.):
    n = int(dur * SR); t = np.arange(n) / SR
    w = sum(np.sin(2*np.pi*f*h*t)/h for h in range(1, harm+1))
    return w/harm*amp*env(n, a, d)

def kick(amp=.8):
    n = int(.3*SR); t = np.arange(n)/SR
    f = 120*np.exp(-t*28)+48
    return np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*11)*amp

def snare(amp=.35):
    n = int(.18*SR); rng = np.random.default_rng(3)
    return (rng.standard_normal(n)*.7 + np.sin(2*np.pi*190*np.arange(n)/SR))*np.exp(-np.arange(n)/SR*22)*amp

def hz(m): return 440.0*2**((m-69)/12)

bars = 20
total = int(bars*4*BEAT*SR)+SR
buf = np.zeros(total)
def place(sig, at):
    i = int(at*SR); e = min(total, i+sig.size); buf[i:e] += sig[:e-i]

# F#m - D - A - E  (i - VI - III - VII in F# minor)
prog = [[54,57,61],[50,54,57],[45,49,52],[52,56,59]]
for bar in range(bars):
    bt = bar*4*BEAT
    ch = prog[bar % 4]
    for n in ch:
        place(tone(hz(n+12), 4*BEAT, amp=.13, harm=4, a=.12, d=1.0), bt)
    place(tone(hz(ch[0]-12), 3.6*BEAT, amp=.30, harm=2, a=.01, d=1.6), bt)
    for b in range(4):
        if b in (0, 2): place(kick(), bt+b*BEAT)
        if b in (1, 3): place(snare(), bt+b*BEAT)
        # swung off-beats at 2/3 of the beat
        place(tone(hz(78), .06, amp=.05, harm=2, a=.002, d=9.), bt+b*BEAT+BEAT*0.66)
    if 4 <= bar < 16:  # melody only in the middle section
        mel = [66,69,68,66,64,66,61,64]
        for i, m in enumerate(mel):
            if i % 3 == 2: continue   # rests
            place(tone(hz(mel[(bar*3+i) % len(mel)]+12), BEAT*0.8, amp=.26, harm=5, a=.02, d=3.5),
                  bt + i*BEAT/2)

buf = (buf/ (np.max(np.abs(buf)) or 1) * .88).astype(np.float32)
out = sys.argv[1] if len(sys.argv) > 1 else "examples/fixture_86bpm_Fsharpm.wav"
from pathlib import Path
Path(out).parent.mkdir(parents=True, exist_ok=True)
sf.write(out, buf, SR)
print(f"wrote {out}")
