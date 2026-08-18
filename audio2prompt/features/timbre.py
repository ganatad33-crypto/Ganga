"""Spectral / production character: brightness, weight, texture, dynamics."""

from __future__ import annotations

from dataclasses import dataclass

import librosa
import numpy as np


@dataclass
class Timbre:
    centroid_hz: float
    rolloff_hz: float
    bandwidth_hz: float
    flatness: float
    zero_crossing_rate: float
    sub_energy: float
    bass_energy: float
    mid_energy: float
    high_energy: float
    air_energy: float
    rms_db: float
    crest_db: float
    dynamic_range_db: float
    stereo_hint: str
    band_balance: dict[str, float]
    descriptors: list[str]
    production_notes: list[str]

    def to_dict(self) -> dict:
        return {
            "spectral_centroid_hz": round(self.centroid_hz),
            "spectral_rolloff_hz": round(self.rolloff_hz),
            "spectral_bandwidth_hz": round(self.bandwidth_hz),
            "spectral_flatness": round(self.flatness, 4),
            "zero_crossing_rate": round(self.zero_crossing_rate, 4),
            "band_balance": {k: round(v, 3) for k, v in self.band_balance.items()},
            "rms_dbfs": round(self.rms_db, 2),
            "crest_factor_db": round(self.crest_db, 2),
            "dynamic_range_db": round(self.dynamic_range_db, 2),
            "stereo": self.stereo_hint,
            "descriptors": self.descriptors,
            "production_notes": self.production_notes,
        }


BANDS = {
    "sub": (20, 60),
    "bass": (60, 250),
    "low_mid": (250, 800),
    "mid": (800, 2500),
    "high_mid": (2500, 6000),
    "air": (6000, 16000),
}


def analyze_timbre(y: np.ndarray, sr: int, channels: int = 1, hop_length: int = 512) -> Timbre:
    S = np.abs(librosa.stft(y, n_fft=2048, hop_length=hop_length))
    freqs = librosa.fft_frequencies(sr=sr, n_fft=2048)

    centroid = float(np.mean(librosa.feature.spectral_centroid(S=S, sr=sr)))
    rolloff = float(np.mean(librosa.feature.spectral_rolloff(S=S, sr=sr, roll_percent=0.85)))
    bandwidth = float(np.mean(librosa.feature.spectral_bandwidth(S=S, sr=sr)))
    flatness = float(np.mean(librosa.feature.spectral_flatness(S=S)))
    zcr = float(np.mean(librosa.feature.zero_crossing_rate(y, hop_length=hop_length)))

    power = S**2
    total = float(power.sum()) + 1e-12
    balance = {}
    for name, (lo, hi) in BANDS.items():
        mask = (freqs >= lo) & (freqs < hi)
        balance[name] = float(power[mask].sum() / total)

    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    rms = rms[rms > 0]
    if rms.size == 0:
        rms = np.array([1e-6])
    rms_db = float(20 * np.log10(np.mean(rms)))
    peak = float(np.max(np.abs(y))) or 1e-6
    crest_db = float(20 * np.log10(peak / np.mean(rms)))
    loud = 20 * np.log10(rms)
    dynamic_range = float(np.percentile(loud, 95) - np.percentile(loud, 10))

    descriptors: list[str] = []
    if centroid > 3200:
        descriptors.append("bright, airy top end")
    elif centroid > 2000:
        descriptors.append("open, present midrange")
    elif centroid > 1100:
        descriptors.append("warm, rounded tone")
    else:
        descriptors.append("dark, muffled, low-passed character")

    if balance["sub"] + balance["bass"] > 0.55:
        descriptors.append("heavy sub-bass weight")
    elif balance["sub"] + balance["bass"] < 0.15:
        descriptors.append("light, bass-shy, thin low end")

    if balance["air"] > 0.06:
        descriptors.append("crisp hi-hats and shimmer")
    elif balance["air"] < 0.008:
        descriptors.append("rolled-off highs, vintage/lo-fi tape feel")

    if flatness > 0.25:
        descriptors.append("noisy, distorted, saturated texture")
    elif flatness < 0.02:
        descriptors.append("clean tonal texture, little noise")

    if rolloff > 9000 and bandwidth > 2600:
        descriptors.append("wide full-spectrum modern mix")

    production: list[str] = []
    if crest_db < 8:
        production.append("heavily compressed, loud-mastered, wall-of-sound")
    elif crest_db > 16:
        production.append("dynamic, uncompressed, natural transients")
    if dynamic_range < 6:
        production.append("flat dynamics, constant loudness throughout")
    elif dynamic_range > 18:
        production.append("wide arrangement dynamics, quiet verses and big peaks")
    if zcr > 0.14:
        production.append("gritty / high-frequency-rich signal")

    stereo_hint = "stereo source" if channels >= 2 else "mono source"

    return Timbre(
        centroid_hz=centroid,
        rolloff_hz=rolloff,
        bandwidth_hz=bandwidth,
        flatness=flatness,
        zero_crossing_rate=zcr,
        sub_energy=balance["sub"],
        bass_energy=balance["bass"],
        mid_energy=balance["mid"],
        high_energy=balance["high_mid"],
        air_energy=balance["air"],
        rms_db=rms_db,
        crest_db=crest_db,
        dynamic_range_db=dynamic_range,
        stereo_hint=stereo_hint,
        band_balance=balance,
        descriptors=descriptors,
        production_notes=production,
    )
