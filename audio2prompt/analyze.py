"""Top-level analysis pipeline."""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path

import librosa
import numpy as np

from .audio_io import Clip, load_audio
from .features.instruments import Instrumentation, analyze_instrumentation
from .features.melody import Melody, analyze_melody
from .features.rhythm import Rhythm, analyze_rhythm
from .features.structure import Structure, analyze_structure
from .features.timbre import Timbre, analyze_timbre
from .features.tonality import Tonality, analyze_tonality
from .genre import GenreGuess, infer_genres, mood_words
from .separation import Stems, separate

HOP_LENGTH = 512


@dataclass
class Analysis:
    clip: Clip = field(repr=False)
    rhythm: Rhythm
    tonality: Tonality
    melody: Melody
    timbre: Timbre
    structure: Structure
    instrumentation: Instrumentation
    genres: list[GenreGuess]
    moods: list[str]
    stems: Stems | None
    elapsed: float

    @property
    def title(self) -> str:
        return self.clip.path.stem

    def to_dict(self) -> dict:
        return {
            "source": {
                "file": self.clip.path.name,
                "duration_seconds": round(self.clip.duration, 2),
                "duration_formatted": f"{int(self.clip.duration // 60)}:{int(self.clip.duration % 60):02d}",
                "sample_rate": self.clip.source_sr,
                "channels": self.clip.channels,
            },
            "rhythm": self.rhythm.to_dict(),
            "tonality": self.tonality.to_dict(),
            "melody": self.melody.to_dict(),
            "timbre": self.timbre.to_dict(),
            "structure": self.structure.to_dict(),
            "instrumentation": self.instrumentation.to_dict(),
            "stems": self.stems.to_dict() if self.stems else None,
            "style": {
                "genres": [{"name": g.name, "confidence": g.confidence, "tags": g.tags} for g in self.genres],
                "moods": self.moods,
            },
            "analysis_seconds": round(self.elapsed, 2),
        }


def analyze_file(
    path: str | Path,
    sr: int = 22050,
    max_seconds: float | None = 600.0,
    skip_melody: bool = False,
    separation: str = "auto",
    progress=None,
) -> Analysis:
    """Run every feature extractor over `path` and return a combined Analysis."""
    started = time.perf_counter()

    def step(msg: str) -> None:
        if progress:
            progress(msg)

    step("loading audio")
    clip = load_audio(path, sr=sr, max_seconds=max_seconds)

    # One HPSS pass feeds rhythm, instrumentation and the dsp stem split; a
    # stricter harmonic extraction feeds key detection and pitch tracking.
    step("harmonic / percussive split")
    y_harm, y_perc = librosa.effects.hpss(clip.y)
    y_tonal = librosa.effects.harmonic(clip.y, margin=3.0)

    stems: Stems | None = None
    if separation != "off":
        step("stem separation")
        stems = separate(clip.y, clip.sr, backend=separation, harmonic=y_harm, percussive=y_perc)

    step("tempo & groove")
    rhythm = analyze_rhythm(clip.y, clip.sr, HOP_LENGTH, y_harm=y_harm, y_perc=y_perc)

    step("key & harmony")
    tonality = analyze_tonality(clip.y, clip.sr, rhythm.beats, HOP_LENGTH, clip.duration, y_harm=y_tonal)

    if skip_melody:
        step("melody (skipped)")
        melody = Melody(
            notes=[], voiced_ratio=0.0, range_semitones=0, lowest="-", highest="-", median_note="-",
            mean_interval=0.0, leap_ratio=0.0, contour="not analysed", phrase_lengths=[],
            vibrato=0.0, notes_per_second=0.0, descriptors=["melody extraction skipped"],
        )
    else:
        step("melody & note extraction")
        melody = analyze_melody(
            clip.y, clip.sr, HOP_LENGTH,
            y_harm=y_tonal,
            lead_stem=stems.get("lead") if stems else None,
        )

    step("timbre & mix character")
    timbre = analyze_timbre(clip.y, clip.sr, clip.channels, HOP_LENGTH)

    step("arrangement structure")
    structure = analyze_structure(clip.y, clip.sr, clip.duration, HOP_LENGTH)

    step("instrumentation")
    instrumentation = analyze_instrumentation(
        clip.y, clip.sr, rhythm.percussive_ratio, melody.voiced_ratio, timbre.flatness, HOP_LENGTH,
        y_harm=y_harm, y_perc=y_perc,
    )

    step("style matching")
    genres = infer_genres(
        bpm=rhythm.bpm,
        percussive_ratio=rhythm.percussive_ratio,
        sub_bass=timbre.sub_energy + timbre.bass_energy,
        brightness=timbre.centroid_hz,
        flatness=timbre.flatness,
        swing=rhythm.swing,
        stability=rhythm.tempo_stability,
        onset_rate=rhythm.onset_rate,
    )
    mean_energy = float(np.mean(structure.energy_curve)) if structure.energy_curve else 0.5
    moods = mood_words(tonality.mode, timbre.centroid_hz, mean_energy, rhythm.bpm, timbre.dynamic_range_db)

    return Analysis(
        clip=clip,
        rhythm=rhythm,
        tonality=tonality,
        melody=melody,
        timbre=timbre,
        structure=structure,
        instrumentation=instrumentation,
        genres=genres,
        moods=moods,
        stems=stems,
        elapsed=time.perf_counter() - started,
    )
