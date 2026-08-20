"""Optional polyphonic transcription.

`pyin` can only follow one pitch at a time, so on a dense mix it reports
whichever voice happens to be loudest — often a pad or the bassline rather than
the lead.  A polyphonic model transcribes every note it hears, and the lead is
then recovered as the top voice of that transcription.

Backed by Spotify's basic-pitch when installed.  Its weights ship inside the
wheel, so unlike demucs there is nothing to download at runtime.
"""

from __future__ import annotations

import tempfile
import warnings
from dataclasses import dataclass
from importlib.util import find_spec
from pathlib import Path

import numpy as np
import soundfile as sf

from .features.melody import Melody, Note, describe_notes

_BROKEN = False


@dataclass
class Transcription:
    notes: list[Note]
    backend: str

    def to_dict(self) -> dict:
        if not self.notes:
            return {"backend": self.backend, "note_count": 0}
        pitches = [n.midi for n in self.notes]
        return {
            "backend": self.backend,
            "note_count": len(self.notes),
            "lowest_midi": int(min(pitches)),
            "highest_midi": int(max(pitches)),
        }


def basic_pitch_available() -> bool:
    return find_spec("basic_pitch") is not None


def _run_basic_pitch(path: Path) -> list[Note]:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        from basic_pitch import ICASSP_2022_MODEL_PATH  # noqa: PLC0415
        from basic_pitch.inference import predict  # noqa: PLC0415

        _, _, events = predict(str(path), ICASSP_2022_MODEL_PATH)

    notes: list[Note] = []
    for event in events:
        start, end, pitch, amplitude = event[0], event[1], event[2], event[3]
        if end <= start:
            continue
        bends = event[4] if len(event) > 4 else None
        # basic-pitch reports per-frame bend in 1/3-semitone steps
        bend = float(np.std(np.asarray(bends, dtype=float)) / 3.0) if bends is not None and len(bends) > 2 else 0.0
        notes.append(
            Note(
                start=float(start),
                end=float(end),
                midi=int(pitch),
                velocity=int(np.clip(float(amplitude) * 127, 20, 127)),
                bend=bend,
            )
        )
    notes.sort(key=lambda n: (n.start, -n.midi))
    return notes


def transcribe(y: np.ndarray, sr: int, backend: str = "auto") -> Transcription | None:
    """Transcribe `y` polyphonically, or return None when no backend is usable."""
    global _BROKEN
    want = backend == "basic-pitch" or (backend == "auto" and basic_pitch_available() and not _BROKEN)
    if not want:
        return None

    # basic-pitch reads from disk; writing the already-trimmed clip keeps the
    # transcription aligned with everything else in the analysis.
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
        sf.write(tmp.name, y, sr)
        try:
            notes = _run_basic_pitch(Path(tmp.name))
        except Exception:
            if backend == "basic-pitch":
                raise
            _BROKEN = True
            return None

    return Transcription(notes=notes, backend="basic-pitch")


# --------------------------------------------------------------------------
# Turning a polyphonic transcription into a single melodic line.
# --------------------------------------------------------------------------

FRAME = 0.01  # seconds


def top_voice(
    notes: list[Note],
    min_midi: int = 52,
    min_duration: float = 0.05,
) -> list[Note]:
    """Skyline extraction: the highest pitch sounding at each instant.

    Listeners hear the top voice of a chord as "the melody", which is why this
    beats picking the loudest voice.  `min_midi` drops the bass register so a
    low countermelody cannot win when the lead rests.
    """
    candidates = [n for n in notes if n.midi >= min_midi and n.end > n.start]
    if not candidates:
        return []

    end = max(n.end for n in candidates)
    n_frames = int(np.ceil(end / FRAME)) + 1
    pitch = np.full(n_frames, -1, dtype=np.int16)
    velocity = np.zeros(n_frames, dtype=np.int16)

    for note in candidates:
        lo = int(note.start / FRAME)
        hi = max(lo + 1, int(note.end / FRAME))
        window = pitch[lo:hi]
        higher = note.midi > window
        window[higher] = note.midi
        velocity[lo:hi][higher] = note.velocity

    line: list[Note] = []
    start_idx = 0
    for i in range(1, n_frames + 1):
        current = pitch[i] if i < n_frames else -2
        if current == pitch[start_idx]:
            continue
        if pitch[start_idx] >= 0:
            start_t, end_t = start_idx * FRAME, i * FRAME
            if end_t - start_t >= min_duration:
                line.append(
                    Note(
                        start=start_t,
                        end=end_t,
                        midi=int(pitch[start_idx]),
                        velocity=int(velocity[start_idx]) or 80,
                    )
                )
        start_idx = i

    return _merge_seams(_trim_outliers(line))


def _merge_seams(line: list[Note]) -> list[Note]:
    """A one-frame gap between equal pitches is a transcription seam, not a rest."""
    merged: list[Note] = []
    for note in line:
        if merged and merged[-1].midi == note.midi and note.start - merged[-1].end < 0.06:
            merged[-1] = Note(merged[-1].start, note.end, note.midi, max(merged[-1].velocity, note.velocity))
        else:
            merged.append(note)
    return merged


def _trim_outliers(line: list[Note], below: int = 9, above: int = 15) -> list[Note]:
    """Drop what the skyline picks up when the lead is not actually playing.

    While the melody rests, the highest sounding note is whatever chord tone is
    left, which drags the reported range down; and a brief partial above the
    lead reads as a spurious high note.  Both are far from the line's own pitch
    centre, so trimming around the median cleans them out without touching the
    melody itself.
    """
    if len(line) < 6:
        return line
    median = float(np.median([n.midi for n in line]))
    return [
        n for n in line
        if n.midi >= median - below and not (n.midi > median + above and n.duration < 0.12)
    ]


def polyphony(notes: list[Note]) -> float:
    """Mean number of notes sounding at once, over the sounding stretches."""
    if not notes:
        return 0.0
    end = max(n.end for n in notes)
    n_frames = int(np.ceil(end / FRAME)) + 1
    counts = np.zeros(n_frames, dtype=np.int16)
    for note in notes:
        lo = int(note.start / FRAME)
        hi = max(lo + 1, int(note.end / FRAME))
        counts[lo:hi] += 1
    active = counts[counts > 0]
    return float(active.mean()) if active.size else 0.0


def melody_from_transcription(transcription: Transcription, duration: float) -> Melody:
    """Reduce a polyphonic transcription to its lead line and describe it."""
    lead = top_voice(transcription.notes)
    sounding = sum(n.duration for n in lead)
    voiced_ratio = float(np.clip(sounding / max(duration, 1e-6), 0.0, 1.0))

    sustained = [n.bend for n in lead if n.duration >= 0.25]
    vibrato = float(np.clip(np.mean(sustained) * 4.0, 0.0, 1.0)) if sustained else 0.0

    return describe_notes(
        lead,
        voiced_ratio=voiced_ratio,
        total_time=duration,
        vibrato=vibrato,
        source=f"{transcription.backend} (top voice)",
        polyphony=polyphony(transcription.notes),
    )
