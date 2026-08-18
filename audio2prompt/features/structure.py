"""Section segmentation and an energy map over the timeline."""

from __future__ import annotations

from dataclasses import dataclass

import librosa
import numpy as np


@dataclass
class Section:
    index: int
    start: float
    end: float
    label: str
    energy: float
    brightness: float
    density: float

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class Structure:
    sections: list[Section]
    form: list[str]
    intro_seconds: float
    outro_seconds: float
    peak_time: float
    energy_curve: list[float]
    notes: list[str]

    def to_dict(self) -> dict:
        return {
            "form": self.form,
            "section_count": len(self.sections),
            "sections": [
                {
                    "label": s.label,
                    "start": round(s.start, 2),
                    "end": round(s.end, 2),
                    "duration": round(s.duration, 2),
                    "energy": round(s.energy, 3),
                    "brightness": round(s.brightness, 3),
                    "density": round(s.density, 3),
                }
                for s in self.sections
            ],
            "intro_seconds": round(self.intro_seconds, 2),
            "outro_seconds": round(self.outro_seconds, 2),
            "peak_time": round(self.peak_time, 2),
            "notes": self.notes,
        }


def _label_sections(sections: list[Section], total: float) -> None:
    """Name sections from their relative energy, position and repetition."""
    if not sections:
        return
    energies = np.array([s.energy for s in sections])
    lo, hi = float(energies.min()), float(energies.max())
    span = max(hi - lo, 1e-9)

    for s in sections:
        rel = (s.energy - lo) / span
        pos = s.start / max(total, 1e-9)
        if pos < 0.08 and rel < 0.55:
            s.label = "intro"
        elif pos > 0.88 and rel < 0.6:
            s.label = "outro"
        elif rel > 0.78:
            s.label = "chorus/drop"
        elif rel > 0.5:
            s.label = "verse"
        elif rel > 0.28:
            s.label = "build/bridge"
        else:
            s.label = "breakdown"

    # a low-energy stretch immediately before a peak reads as a build-up
    for i in range(len(sections) - 1):
        if sections[i + 1].label == "chorus/drop" and sections[i].label in ("breakdown", "build/bridge"):
            sections[i].label = "build-up"


def analyze_structure(y: np.ndarray, sr: int, duration: float, hop_length: int = 512) -> Structure:
    mfcc = librosa.feature.mfcc(y=y, sr=sr, hop_length=hop_length, n_mfcc=20)
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr, hop_length=hop_length)
    rms = librosa.feature.rms(y=y, hop_length=hop_length)[0]
    centroid = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=hop_length)[0]
    onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=hop_length)

    n = min(mfcc.shape[1], chroma.shape[1], rms.size, centroid.size, onset_env.size)
    features = np.vstack([
        librosa.util.normalize(mfcc[:, :n], axis=1),
        librosa.util.normalize(chroma[:, :n], axis=1),
        librosa.util.normalize(rms[np.newaxis, :n], axis=1) * 2.0,
    ])

    # scale the number of segments with track length, ~1 section per 18s
    k = int(np.clip(round(duration / 14.0), 2, 12))
    try:
        boundaries = librosa.segment.agglomerative(features, k)
    except Exception:
        boundaries = np.linspace(0, n - 1, k + 1, dtype=int)
    boundaries = np.unique(np.concatenate([[0], boundaries, [n - 1]]))
    times = librosa.frames_to_time(boundaries, sr=sr, hop_length=hop_length)
    times = np.clip(times, 0, duration)

    sections: list[Section] = []
    for i, (start_f, end_f) in enumerate(zip(boundaries[:-1], boundaries[1:])):
        if end_f - start_f < 2:
            continue
        sections.append(
            Section(
                index=i,
                start=float(times[i]),
                end=float(times[i + 1]),
                label="section",
                energy=float(np.mean(rms[start_f:end_f])),
                brightness=float(np.mean(centroid[start_f:end_f])),
                density=float(np.mean(onset_env[start_f:end_f])),
            )
        )

    # Fold slivers into a neighbour: backwards when there is one, forwards for
    # a short leading section (which otherwise gets labelled on 2s of evidence).
    min_len = max(4.0, min(8.0, duration * 0.06))
    merged: list[Section] = []
    for s in sections:
        if merged and s.duration < min_len:
            prev = merged[-1]
            merged[-1] = Section(
                prev.index, prev.start, s.end, prev.label,
                (prev.energy * prev.duration + s.energy * s.duration) / max(prev.duration + s.duration, 1e-9),
                prev.brightness, prev.density,
            )
        else:
            merged.append(s)
    while len(merged) > 1 and merged[0].duration < min_len:
        head, nxt = merged[0], merged[1]
        merged[1] = Section(
            nxt.index, head.start, nxt.end, nxt.label,
            (head.energy * head.duration + nxt.energy * nxt.duration) / max(head.duration + nxt.duration, 1e-9),
            nxt.brightness, nxt.density,
        )
        merged.pop(0)
    sections = merged

    if len(sections) == 1:
        sections[0].label = "main loop"
    else:
        _label_sections(sections, duration)

    peak_time = max(sections, key=lambda s: s.energy).start if sections else 0.0
    intro = sections[0].duration if sections and sections[0].label == "intro" else 0.0
    outro = sections[-1].duration if sections and sections[-1].label == "outro" else 0.0

    # coarse energy curve, 32 points
    step = max(1, rms.size // 32)
    curve = [float(np.mean(rms[i : i + step])) for i in range(0, rms.size, step)][:32]
    peak_val = max(curve) if curve else 1.0
    curve = [round(v / peak_val, 3) for v in curve] if peak_val else curve

    notes: list[str] = []
    if len(sections) == 1:
        notes.append("one continuous section — loop or beat-style material, no arrangement contrast")
    if intro > 12:
        notes.append("long atmospheric intro")
    elif intro and intro < 5:
        notes.append("short intro, gets going quickly")
    if any(s.label == "build-up" for s in sections):
        notes.append("clear build-up into a drop")
    if len({s.label for s in sections}) <= 2:
        notes.append("loop-based, minimal structural contrast")
    if outro > 12:
        notes.append("long fade-out / outro")

    return Structure(
        sections=sections,
        form=[s.label for s in sections],
        intro_seconds=intro,
        outro_seconds=outro,
        peak_time=float(peak_time),
        energy_curve=curve,
        notes=notes,
    )
