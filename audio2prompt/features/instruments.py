"""Heuristic instrumentation hints.

Without a trained tagger these are *hints*, not classifications: each one is
scored from spectral and rhythmic evidence and reported with its confidence so
the prompt builder can weight them honestly.
"""

from __future__ import annotations

from dataclasses import dataclass

import librosa
import numpy as np


@dataclass
class Instrumentation:
    hints: list[tuple[str, float]]
    likely_vocal: bool
    vocal_confidence: float
    texture: str
    layer_estimate: int
    notes: list[str]

    def to_dict(self) -> dict:
        return {
            "hints": [[name, round(score, 3)] for name, score in self.hints],
            "likely_vocal": self.likely_vocal,
            "vocal_confidence": round(self.vocal_confidence, 3),
            "texture": self.texture,
            "estimated_layers": self.layer_estimate,
            "notes": self.notes,
        }

    def top(self, n: int = 6, threshold: float = 0.34) -> list[str]:
        return [name for name, score in self.hints[:n] if score >= threshold]


def _bandpass_energy(power: np.ndarray, freqs: np.ndarray, lo: float, hi: float) -> float:
    mask = (freqs >= lo) & (freqs < hi)
    if not mask.any():
        return 0.0
    return float(power[mask].sum() / (power.sum() + 1e-12))


def analyze_instrumentation(
    y: np.ndarray,
    sr: int,
    percussive_ratio: float,
    voiced_ratio: float,
    flatness: float,
    hop_length: int = 512,
    y_harm: np.ndarray | None = None,
    y_perc: np.ndarray | None = None,
) -> Instrumentation:
    if y_harm is None or y_perc is None:
        y_harm, y_perc = librosa.effects.hpss(y)
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop_length))
    power = (S**2).mean(axis=1)
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)

    S_perc = np.abs(librosa.stft(y_perc, n_fft=2048, hop_length=hop_length))
    perc_power = (S_perc**2).mean(axis=1)

    contrast = librosa.feature.spectral_contrast(S=S, sr=sr)
    contrast_mean = contrast.mean(axis=1)

    sub = _bandpass_energy(power, freqs, 20, 70)
    bass = _bandpass_energy(power, freqs, 70, 250)
    low_mid = _bandpass_energy(power, freqs, 250, 800)
    mid = _bandpass_energy(power, freqs, 800, 2500)
    presence = _bandpass_energy(power, freqs, 2500, 6000)
    air = _bandpass_energy(power, freqs, 6000, 16000)

    kick = _bandpass_energy(perc_power, freqs, 40, 110)
    snare = _bandpass_energy(perc_power, freqs, 150, 400) + _bandpass_energy(perc_power, freqs, 1500, 4000) * 0.5
    hats = _bandpass_energy(perc_power, freqs, 7000, 16000)

    onset_env = librosa.onset.onset_strength(y=y_perc, sr=sr, hop_length=hop_length)
    attack_sharpness = float(np.mean(np.abs(np.diff(onset_env)))) / (float(onset_env.mean()) + 1e-9)

    harm_sustain = 1.0 - percussive_ratio
    tonal_flatness = float(np.mean(librosa.feature.spectral_flatness(y=y_harm)))

    raw: dict[str, float] = {}

    raw["kick drum"] = kick * 2.2 + percussive_ratio * 0.35
    raw["snare / clap"] = snare * 1.6 + attack_sharpness * 0.2
    raw["hi-hats / shakers"] = hats * 6.0 + air * 2.0
    raw["bass guitar or synth bass"] = (sub + bass) * 1.3
    raw["808 sub bass"] = max(0.0, sub * 4.0 - bass * 0.5)

    raw["electric guitar"] = low_mid * 1.1 + flatness * 0.9 + contrast_mean[3] / 55
    raw["acoustic guitar / plucked strings"] = max(0.0, mid * 1.1 + attack_sharpness * 0.3 - flatness * 1.2)
    raw["piano / keys"] = max(0.0, mid * 1.0 + harm_sustain * 0.32 - flatness * 1.0)
    raw["synth pads / strings"] = max(0.0, harm_sustain * 0.75 - attack_sharpness * 0.4 + low_mid * 0.7)
    raw["synth lead / arpeggio"] = presence * 1.3 + (1 - tonal_flatness) * 0.22 + voiced_ratio * 0.2
    raw["strings / orchestral"] = max(0.0, harm_sustain * 0.7 + low_mid * 0.8 - hats * 3.0)
    raw["brass / horns"] = max(0.0, presence * 1.2 + contrast_mean[4] / 55 - air * 1.5)
    raw["percussion / hand drums"] = max(0.0, percussive_ratio * 0.6 + low_mid * 0.5 - kick * 1.5)

    # tanh keeps strong evidence below a saturating 100% so the ranking still
    # carries information at the top of the list
    scores = {name: float(np.tanh(value * 1.15)) for name, value in raw.items()}
    ordered = sorted(scores.items(), key=lambda kv: kv[1], reverse=True)

    # a strong, continuously voiced 150-1200Hz band with vibrato-ish energy
    # is the closest cheap proxy for a lead vocal
    vocal_band = _bandpass_energy(power, freqs, 200, 1200)
    vocal_conf = float(np.clip(voiced_ratio * 1.2 * (0.4 + vocal_band) - flatness, 0.0, 1.0))
    likely_vocal = vocal_conf > 0.45

    strong = sum(1 for _, s in ordered if s > 0.45)
    layer_estimate = int(np.clip(strong, 2, 10))

    if layer_estimate <= 3:
        texture = "sparse, minimal arrangement"
    elif layer_estimate <= 6:
        texture = "medium-density arrangement"
    else:
        texture = "dense, layered, full arrangement"

    notes: list[str] = []
    if scores["808 sub bass"] > 0.5:
        notes.append("808-style sliding sub bass")
    if scores["hi-hats / shakers"] > 0.55 and percussive_ratio > 0.45:
        notes.append("prominent hi-hat pattern")
    if scores["synth pads / strings"] > 0.6 and percussive_ratio < 0.35:
        notes.append("ambient pad bed underneath")
    if not likely_vocal:
        notes.append("reads as instrumental — no dominant lead vocal detected")

    return Instrumentation(
        hints=ordered,
        likely_vocal=likely_vocal,
        vocal_confidence=vocal_conf,
        texture=texture,
        layer_estimate=layer_estimate,
        notes=notes,
    )
