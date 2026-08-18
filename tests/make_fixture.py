"""Render a deterministic test track: 120 BPM, A minor, kick + bass + chords + melody."""

from __future__ import annotations

import sys
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44100
BPM = 120.0
BEAT = 60.0 / BPM


def _env(n: int, attack: float, decay: float, sr: int = SR) -> np.ndarray:
    a = max(1, int(attack * sr))
    d = max(1, n - a)
    return np.concatenate([np.linspace(0, 1, a), np.exp(-np.linspace(0, decay, d))])[:n]


def tone(freq: float, dur: float, amp: float = 0.3, harmonics: int = 4, attack: float = 0.01, decay: float = 4.0) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    wave = np.zeros(n)
    for h in range(1, harmonics + 1):
        wave += (1.0 / h) * np.sin(2 * np.pi * freq * h * t)
    return wave / harmonics * amp * _env(n, attack, decay)


def kick(dur: float = 0.25, amp: float = 0.9) -> np.ndarray:
    n = int(dur * SR)
    t = np.arange(n) / SR
    freq = 110 * np.exp(-t * 30) + 45
    return np.sin(2 * np.pi * np.cumsum(freq) / SR) * np.exp(-t * 14) * amp


def hat(dur: float = 0.05, amp: float = 0.18) -> np.ndarray:
    n = int(dur * SR)
    rng = np.random.default_rng(7)
    noise = rng.standard_normal(n)
    return noise * np.exp(-np.arange(n) / SR * 90) * amp


def midi_hz(m: int) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)


def render(bars: int = 16) -> np.ndarray:
    total = int(bars * 4 * BEAT * SR) + SR
    buf = np.zeros(total)

    def place(sig: np.ndarray, at: float) -> None:
        i = int(at * SR)
        end = min(total, i + sig.size)
        buf[i:end] += sig[: end - i]

    # Am - F - C - G, one chord per bar
    progression = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]
    melody_line = [69, 72, 71, 69, 67, 69, 72, 76]

    for bar in range(bars):
        bar_t = bar * 4 * BEAT
        chord = progression[bar % 4]
        for note in chord:
            place(tone(midi_hz(note), 4 * BEAT, amp=0.16, harmonics=5, attack=0.05, decay=1.2), bar_t)
        place(tone(midi_hz(chord[0] - 24), 4 * BEAT, amp=0.35, harmonics=3, attack=0.005, decay=2.0), bar_t)

        for beat in range(4):
            place(kick(), bar_t + beat * BEAT)
            place(hat(), bar_t + beat * BEAT + BEAT / 2)

        if bar >= 4:  # melody enters after an intro
            for i, note in enumerate(melody_line):
                place(
                    tone(midi_hz(melody_line[(bar * 2 + i) % len(melody_line)]), BEAT * 0.45,
                         amp=0.32, harmonics=6, attack=0.01, decay=5.0),
                    bar_t + i * BEAT / 2,
                )

    peak = np.max(np.abs(buf)) or 1.0
    return (buf / peak * 0.9).astype(np.float32)


if __name__ == "__main__":
    out = Path(sys.argv[1] if len(sys.argv) > 1 else "examples/fixture_120bpm_Am.wav")
    out.parent.mkdir(parents=True, exist_ok=True)
    sf.write(out, render(), SR)
    print(f"wrote {out}")
