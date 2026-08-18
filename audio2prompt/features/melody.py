"""Lead-melody extraction: f0 tracking -> quantized notes -> MIDI."""

from __future__ import annotations

import struct
from dataclasses import dataclass, field
from pathlib import Path

import librosa
import numpy as np
import scipy.signal

PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


@dataclass
class Note:
    start: float
    end: float
    midi: int
    velocity: int

    @property
    def name(self) -> str:
        return f"{PITCH_CLASSES[self.midi % 12]}{self.midi // 12 - 1}"

    @property
    def duration(self) -> float:
        return self.end - self.start


@dataclass
class Melody:
    notes: list[Note] = field(repr=False)
    voiced_ratio: float
    range_semitones: int
    lowest: str
    highest: str
    median_note: str
    mean_interval: float
    leap_ratio: float
    contour: str
    phrase_lengths: list[float]
    vibrato: float
    notes_per_second: float
    descriptors: list[str]

    def to_dict(self) -> dict:
        return {
            "note_count": len(self.notes),
            "voiced_ratio": round(self.voiced_ratio, 3),
            "range_semitones": self.range_semitones,
            "lowest_note": self.lowest,
            "highest_note": self.highest,
            "median_note": self.median_note,
            "mean_interval_semitones": round(self.mean_interval, 2),
            "leap_ratio": round(self.leap_ratio, 3),
            "contour": self.contour,
            "avg_phrase_seconds": round(float(np.mean(self.phrase_lengths)), 2) if self.phrase_lengths else 0.0,
            "vibrato_strength": round(self.vibrato, 3),
            "notes_per_second": round(self.notes_per_second, 2),
            "descriptors": self.descriptors,
            "note_sequence": [n.name for n in self.notes[:64]],
        }


def _segment_notes(f0: np.ndarray, voiced: np.ndarray, times: np.ndarray, rms: np.ndarray) -> list[Note]:
    midi = np.full(f0.shape, np.nan)
    ok = voiced & np.isfinite(f0) & (f0 > 0)
    midi[ok] = librosa.hz_to_midi(f0[ok])

    notes: list[Note] = []
    cur: list[int] = []

    def flush() -> None:
        if len(cur) < 3:
            cur.clear()
            return
        vals = midi[cur]
        pitch = int(np.round(np.median(vals)))
        start, end = float(times[cur[0]]), float(times[cur[-1]])
        if end - start < 0.045:
            cur.clear()
            return
        loud = float(np.mean(rms[cur])) if rms.size else 0.5
        velocity = int(np.clip(40 + loud * 700, 25, 127))
        notes.append(Note(start=start, end=end, midi=pitch, velocity=velocity))
        cur.clear()

    for i in range(midi.size):
        if not np.isfinite(midi[i]):
            flush()
            continue
        if cur and abs(midi[i] - np.median(midi[cur])) > 0.85:
            flush()
        cur.append(i)
    flush()

    # glue neighbouring identical pitches split by a dropout
    merged: list[Note] = []
    for n in notes:
        if merged and merged[-1].midi == n.midi and n.start - merged[-1].end < 0.08:
            merged[-1] = Note(merged[-1].start, n.end, n.midi, max(merged[-1].velocity, n.velocity))
        else:
            merged.append(n)
    return merged


def _contour(notes: list[Note]) -> str:
    if len(notes) < 4:
        return "too sparse to characterise"
    pitches = np.array([n.midi for n in notes], dtype=float)
    slope = float(np.polyfit(np.arange(pitches.size), pitches, 1)[0])
    spread = float(pitches.max() - pitches.min())
    if abs(slope) < 0.02 and spread < 5:
        return "static, chant-like, hovers around one pitch centre"
    if slope > 0.08:
        return "rising overall — builds upward through the track"
    if slope < -0.08:
        return "descending overall — resolves downward"
    if spread > 14:
        return "wide arching contour with big rises and falls"
    return "wave-like, balanced up-and-down phrasing"


def _highpass(y: np.ndarray, sr: int, cutoff: float) -> np.ndarray:
    sos = scipy.signal.butter(4, cutoff / (sr / 2), btype="highpass", output="sos")
    return scipy.signal.sosfiltfilt(sos, y).astype(np.float32)


def _track_f0(y: np.ndarray, sr: int, hop_length: int, fmin: float, fmax: float):
    return librosa.pyin(
        y,
        fmin=fmin,
        fmax=fmax,
        sr=sr,
        hop_length=hop_length,
        frame_length=hop_length * 4,
        fill_na=np.nan,
    )


def analyze_melody(
    y: np.ndarray,
    sr: int,
    hop_length: int = 512,
    fmin: float = 150.0,
    fmax: float = 1400.0,
    y_harm: np.ndarray | None = None,
    lead_stem: np.ndarray | None = None,
) -> Melody:
    """Track the lead line.

    The bass is usually the loudest periodic source, so pyin run on the raw
    signal reports the bassline instead of the melody.  Analysing a high-passed
    copy first pushes the tracker onto the lead; if that finds almost nothing
    (bass-only or drone material) we fall back to the full range and say so.
    """
    if y_harm is None:
        y_harm = librosa.effects.harmonic(y, margin=3.0)
    # A separated lead stem already excludes the bass, so it only needs a gentle
    # high-pass; a raw mix needs the filter to keep pyin off the bassline.
    if lead_stem is not None:
        y_lead = _highpass(lead_stem, sr, 90.0)
    else:
        y_lead = _highpass(y_harm, sr, max(120.0, fmin * 0.85))

    f0, voiced, voiced_prob = _track_f0(y_lead, sr, hop_length, fmin, fmax)
    register = "lead"
    voiced_bool = np.nan_to_num(voiced, nan=False).astype(bool)
    if voiced_bool.mean() < 0.08:
        f0, voiced, voiced_prob = _track_f0(y_harm, sr, hop_length, 55.0, fmax)
        register = "low"
    times = librosa.times_like(f0, sr=sr, hop_length=hop_length)
    rms = librosa.feature.rms(y=y_lead if register == "lead" else y_harm, hop_length=hop_length)[0]
    if rms.size < f0.size:
        rms = np.pad(rms, (0, f0.size - rms.size), mode="edge")
    rms = rms[: f0.size]

    voiced = np.nan_to_num(voiced, nan=False).astype(bool)
    voiced_ratio = float(voiced.mean()) if voiced.size else 0.0

    notes = _segment_notes(f0, voiced, times, rms)

    if notes:
        pitches = np.array([n.midi for n in notes])
        intervals = np.abs(np.diff(pitches)) if pitches.size > 1 else np.array([0])
        lowest, highest = int(pitches.min()), int(pitches.max())
        median = int(np.median(pitches))
        rng = highest - lowest
        mean_interval = float(intervals.mean())
        leap_ratio = float((intervals > 3).mean())
    else:
        lowest = highest = median = 60
        rng, mean_interval, leap_ratio = 0, 0.0, 0.0

    # phrases = note runs separated by rests
    phrases: list[float] = []
    if notes:
        phrase_start = notes[0].start
        prev_end = notes[0].end
        for n in notes[1:]:
            if n.start - prev_end > 0.45:
                phrases.append(prev_end - phrase_start)
                phrase_start = n.start
            prev_end = n.end
        phrases.append(prev_end - phrase_start)

    # vibrato: cent-level wobble inside sustained notes
    vib_scores: list[float] = []
    cents = librosa.hz_to_midi(np.where(np.isfinite(f0) & (f0 > 0), f0, np.nan)) * 100
    for n in notes:
        if n.duration < 0.25:
            continue
        mask = (times >= n.start) & (times <= n.end)
        seg = cents[mask]
        seg = seg[np.isfinite(seg)]
        if seg.size > 6:
            vib_scores.append(float(np.std(seg - np.median(seg))))
    vibrato = float(np.clip(np.mean(vib_scores) / 45.0, 0.0, 1.0)) if vib_scores else 0.0

    total_time = float(times[-1]) if times.size else 1.0
    nps = len(notes) / max(total_time, 1e-6)

    descriptors: list[str] = []
    if register == "low":
        descriptors.append("the most prominent melodic line sits in the bass register")
    if voiced_ratio < 0.15:
        descriptors.append("no clear sustained lead line — texture/percussion driven")
    if rng > 19:
        descriptors.append("wide melodic range, over an octave and a half")
    elif 0 < rng <= 7:
        descriptors.append("narrow, riff-like melodic range")
    if leap_ratio > 0.45:
        descriptors.append("angular, leap-heavy melody")
    elif leap_ratio < 0.2 and notes:
        descriptors.append("smooth stepwise melodic motion")
    if vibrato > 0.5:
        descriptors.append("expressive vibrato and pitch slides")
    if nps > 5:
        descriptors.append("fast, virtuosic note runs")
    elif 0 < nps < 1.2:
        descriptors.append("long sustained notes, slow melodic pacing")

    return Melody(
        notes=notes,
        voiced_ratio=voiced_ratio,
        range_semitones=int(rng),
        lowest=f"{PITCH_CLASSES[lowest % 12]}{lowest // 12 - 1}",
        highest=f"{PITCH_CLASSES[highest % 12]}{highest // 12 - 1}",
        median_note=f"{PITCH_CLASSES[median % 12]}{median // 12 - 1}",
        mean_interval=mean_interval,
        leap_ratio=leap_ratio,
        contour=_contour(notes),
        phrase_lengths=phrases,
        vibrato=vibrato,
        notes_per_second=nps,
        descriptors=descriptors,
    )


# --------------------------------------------------------------------------
# Minimal type-0 MIDI writer (no external dependency).
# --------------------------------------------------------------------------

def _vlq(value: int) -> bytes:
    buf = value & 0x7F
    value >>= 7
    while value:
        buf <<= 8
        buf |= (value & 0x7F) | 0x80
        value >>= 7
    out = bytearray()
    while True:
        out.append(buf & 0xFF)
        if buf & 0x80:
            buf >>= 8
        else:
            break
    return bytes(out)


def write_midi(notes: list[Note], path: str | Path, bpm: float = 120.0, ticks_per_beat: int = 480, program: int = 0) -> Path:
    """Write the extracted melody as a single-track MIDI file."""
    path = Path(path)
    bpm = bpm if bpm and bpm > 0 else 120.0
    sec_per_tick = 60.0 / bpm / ticks_per_beat

    events: list[tuple[int, int, int, int]] = []  # (tick, status, pitch, velocity)
    for n in notes:
        on = int(round(n.start / sec_per_tick))
        off = max(on + 1, int(round(n.end / sec_per_tick)))
        events.append((on, 0x90, n.midi, n.velocity))
        events.append((off, 0x80, n.midi, 0))
    events.sort(key=lambda e: (e[0], e[1] == 0x90))

    track = bytearray()
    track += _vlq(0) + b"\xff\x51\x03" + struct.pack(">I", int(60_000_000 / bpm))[1:]
    track += _vlq(0) + bytes([0xC0, program & 0x7F])
    prev = 0
    for tick, status, pitch, velocity in events:
        track += _vlq(max(0, tick - prev)) + bytes([status, pitch & 0x7F, velocity & 0x7F])
        prev = tick
    track += _vlq(0) + b"\xff\x2f\x00"

    header = b"MThd" + struct.pack(">IHHH", 6, 0, 1, ticks_per_beat)
    chunk = b"MTrk" + struct.pack(">I", len(track)) + bytes(track)
    path.write_bytes(header + chunk)
    return path
