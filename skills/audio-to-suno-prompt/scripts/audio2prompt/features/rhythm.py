"""Tempo, beat grid, groove and rhythmic density."""

from __future__ import annotations

from dataclasses import dataclass, field

import librosa
import numpy as np


@dataclass
class Rhythm:
    bpm: float
    bpm_candidates: list[float]
    beats: np.ndarray = field(repr=False)
    downbeats: np.ndarray = field(repr=False)
    beats_per_bar: int
    time_signature: str
    tempo_stability: float
    swing: float
    onset_rate: float
    percussive_ratio: float
    groove_notes: list[str]

    def to_dict(self) -> dict:
        return {
            "bpm": round(self.bpm, 2),
            "bpm_candidates": [round(c, 2) for c in self.bpm_candidates],
            "time_signature": self.time_signature,
            "beats_per_bar": self.beats_per_bar,
            "beat_count": int(self.beats.size),
            "bar_count": int(self.downbeats.size),
            "tempo_stability": round(self.tempo_stability, 3),
            "swing": round(self.swing, 3),
            "onset_rate_per_sec": round(self.onset_rate, 2),
            "percussive_ratio": round(self.percussive_ratio, 3),
            "groove_notes": self.groove_notes,
        }


def _fold_bpm(bpm: float, low: float = 60.0, high: float = 190.0) -> float:
    """Fold an octave-ambiguous tempo into a musically plausible range."""
    if bpm <= 0:
        return 0.0
    while bpm < low:
        bpm *= 2
    while bpm > high:
        bpm /= 2
    return bpm


def _estimate_swing(y: np.ndarray, sr: int, beats: np.ndarray, onset_env: np.ndarray, hop: int) -> float:
    """0.0 = straight eighths, ~0.33 = triplet shuffle.

    Measures where onset energy lands between consecutive beats.
    """
    if beats.size < 4:
        return 0.0
    positions: list[float] = []
    for start, end in zip(beats[:-1], beats[1:]):
        span = end - start
        if span < 4:
            continue
        window = onset_env[start:end]
        if window.size < 4:
            continue
        # ignore the on-beat attack itself, look at the off-beat half
        half = window.size // 2
        tail = window[max(1, half // 2):]
        if tail.size == 0 or float(tail.max()) <= 0:
            continue
        idx = int(np.argmax(tail)) + max(1, half // 2)
        positions.append(idx / window.size)
    if not positions:
        return 0.0
    median = float(np.median(positions))
    # straight = 0.5, hard shuffle = 0.667
    swing = (median - 0.5) / (2.0 / 3.0 - 0.5)
    return float(np.clip(swing, 0.0, 1.0))


def _pick_beats_per_bar(onset_env: np.ndarray, beats: np.ndarray) -> tuple[int, np.ndarray]:
    """Score 3- and 4-beat groupings by how strongly beat 1 stands out."""
    if beats.size < 8:
        return 4, beats[:1]
    strengths = onset_env[np.clip(beats, 0, onset_env.size - 1)]
    best_bpb, best_offset, best_score = 4, 0, -np.inf
    for bpb in (4, 3):
        for offset in range(bpb):
            firsts = strengths[offset::bpb]
            others = np.delete(strengths, np.arange(offset, strengths.size, bpb))
            if firsts.size < 2 or others.size < 2:
                continue
            score = float(firsts.mean() - others.mean())
            if bpb == 4:
                score *= 1.08  # 4/4 is the overwhelming prior in popular music
            if score > best_score:
                best_bpb, best_offset, best_score = bpb, offset, score
    return best_bpb, beats[best_offset::best_bpb]


def analyze_rhythm(
    y: np.ndarray,
    sr: int,
    hop_length: int = 512,
    y_harm: np.ndarray | None = None,
    y_perc: np.ndarray | None = None,
) -> Rhythm:
    if y_harm is None or y_perc is None:
        y_harm, y_perc = librosa.effects.hpss(y)
    perc_energy = float(np.mean(y_perc**2))
    harm_energy = float(np.mean(y_harm**2))
    percussive_ratio = perc_energy / (perc_energy + harm_energy + 1e-12)

    onset_env = librosa.onset.onset_strength(y=y_perc, sr=sr, hop_length=hop_length, aggregate=np.median)

    tempo_arr, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, hop_length=hop_length, trim=False)
    bpm = _fold_bpm(float(np.atleast_1d(tempo_arr)[0]))

    # The tempogram peak is quantised to its frequency bins; the spacing of the
    # tracked beats themselves is a finer estimate. Trust it when it agrees.
    if beats.size >= 8:
        beat_times = librosa.frames_to_time(beats, sr=sr, hop_length=hop_length)
        intervals = np.diff(beat_times)
        keep = (intervals > 0.2) & (intervals < 2.0)
        if keep.sum() >= 4:
            # Beat frames are quantised to the hop grid (~23 ms), so a median
            # interval lands on a lattice point and can be a couple of BPM out.
            # Fitting a line through the beat times averages that quantisation
            # away.
            idx = np.arange(beat_times.size)
            slope = float(np.polyfit(idx, beat_times, 1)[0])
            refined = _fold_bpm(60.0 / slope) if slope > 0 else 0.0
            if refined and abs(refined - bpm) < 6.0:
                bpm = refined
    # Producers work in whole BPMs; snap when we are already within rounding noise.
    if abs(bpm - round(bpm)) < 0.35:
        bpm = float(round(bpm))

    tempogram = librosa.feature.tempogram(onset_envelope=onset_env, sr=sr, hop_length=hop_length)
    tempo_axis = librosa.tempo_frequencies(tempogram.shape[0], sr=sr, hop_length=hop_length)
    mean_tempogram = tempogram.mean(axis=1)
    valid = np.isfinite(tempo_axis) & (tempo_axis > 40) & (tempo_axis < 260)
    ranked = np.argsort(mean_tempogram[valid])[::-1]
    candidates: list[float] = []
    for idx in ranked[:12]:
        cand = _fold_bpm(float(tempo_axis[valid][idx]))
        if all(abs(cand - c) > 2.0 for c in candidates):
            candidates.append(cand)
        if len(candidates) >= 3:
            break
    if not candidates:
        candidates = [bpm]

    # local tempo variance -> is this a grid-locked production or a live take?
    dyn = librosa.feature.tempo(onset_envelope=onset_env, sr=sr, hop_length=hop_length, aggregate=None)
    dyn = np.atleast_1d(dyn)
    dyn = dyn[np.isfinite(dyn) & (dyn > 0)]
    if dyn.size > 4:
        folded = np.array([_fold_bpm(float(v)) for v in dyn])
        stability = 1.0 - float(np.clip(np.std(folded) / max(np.mean(folded), 1e-6) * 4.0, 0.0, 1.0))
    else:
        stability = 0.5

    beats_per_bar, downbeats = _pick_beats_per_bar(onset_env, beats)
    swing = _estimate_swing(y, sr, beats, onset_env, hop_length)

    onsets = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, hop_length=hop_length, units="time")
    duration = len(y) / sr
    onset_rate = float(onsets.size) / max(duration, 1e-6)

    notes: list[str] = []
    if stability > 0.85:
        notes.append("tight quantized grid, programmed drums")
    elif stability < 0.55:
        notes.append("loose human timing, live-feel tempo drift")
    if swing > 0.55:
        notes.append("heavy shuffle / triplet swing")
    elif swing > 0.25:
        notes.append("light swing on the off-beats")
    else:
        notes.append("straight eighths")
    if percussive_ratio > 0.55:
        notes.append("drum-forward mix")
    elif percussive_ratio < 0.3:
        notes.append("sustained, pad-driven, few transients")
    if onset_rate > 7:
        notes.append("busy, dense rhythmic activity")
    elif onset_rate < 2:
        notes.append("sparse, spacious rhythm")

    return Rhythm(
        bpm=bpm,
        bpm_candidates=candidates,
        beats=beats,
        downbeats=downbeats,
        beats_per_bar=beats_per_bar,
        time_signature="3/4" if beats_per_bar == 3 else "4/4",
        tempo_stability=stability,
        swing=swing,
        onset_rate=onset_rate,
        percussive_ratio=percussive_ratio,
        groove_notes=notes,
    )
