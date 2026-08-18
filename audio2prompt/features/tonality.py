"""Key, mode and chord-progression estimation."""

from __future__ import annotations

from dataclasses import dataclass, field

import librosa
import numpy as np

PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

# Krumhansl-Kessler key profiles.
KK_MAJOR = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
KK_MINOR = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

# Extra modes, as flat weightings over their characteristic scale degrees.
MODE_INTERVALS = {
    "major": [0, 2, 4, 5, 7, 9, 11],
    "minor": [0, 2, 3, 5, 7, 8, 10],
    "dorian": [0, 2, 3, 5, 7, 9, 10],
    "phrygian": [0, 1, 3, 5, 7, 8, 10],
    "mixolydian": [0, 2, 4, 5, 7, 9, 10],
    "lydian": [0, 2, 4, 6, 7, 9, 11],
    "harmonic minor": [0, 2, 3, 5, 7, 8, 11],
    "phrygian dominant": [0, 1, 4, 5, 7, 8, 10],
}

# (suffix, intervals, prior).  The prior encodes how often a chord type shows
# up in practice — without it, four-note and sus templates win on raw
# correlation simply because they cover more of the chroma vector.
CHORD_TEMPLATES: list[tuple[str, list[int], float]] = [
    ("", [0, 4, 7], 1.00),
    ("m", [0, 3, 7], 1.00),
    ("7", [0, 4, 7, 10], 0.90),
    ("m7", [0, 3, 7, 10], 0.90),
    ("maj7", [0, 4, 7, 11], 0.86),
    ("sus4", [0, 5, 7], 0.80),
    ("sus2", [0, 2, 7], 0.78),
    ("6", [0, 4, 7, 9], 0.78),
    ("m6", [0, 3, 7, 9], 0.74),
    ("dim", [0, 3, 6], 0.72),
    ("m7b5", [0, 3, 6, 10], 0.70),
    ("aug", [0, 4, 8], 0.66),
]

ROMAN_MAJOR = {0: "I", 2: "ii", 4: "iii", 5: "IV", 7: "V", 9: "vi", 11: "vii"}
ROMAN_MINOR = {0: "i", 2: "ii", 3: "III", 5: "iv", 7: "v", 8: "VI", 10: "VII"}


@dataclass
class Tonality:
    key: str
    mode: str
    key_confidence: float
    alternate_keys: list[tuple[str, float]]
    scale_notes: list[str]
    chords: list[tuple[float, float, str]] = field(repr=False)
    chord_progression: list[str]
    roman_progression: list[str]
    harmonic_rate: float
    chromatic_density: float
    notes: list[str]

    @property
    def key_name(self) -> str:
        return f"{self.key} {self.mode}"

    def to_dict(self) -> dict:
        return {
            "key": self.key,
            "mode": self.mode,
            "key_name": self.key_name,
            "confidence": round(self.key_confidence, 3),
            "alternates": [[k, round(v, 3)] for k, v in self.alternate_keys],
            "scale_notes": self.scale_notes,
            "chord_progression": self.chord_progression,
            "roman_progression": self.roman_progression,
            "chord_changes_per_min": round(self.harmonic_rate, 2),
            "chromatic_density": round(self.chromatic_density, 3),
            "chord_timeline": [[round(s, 2), round(e, 2), c] for s, e, c in self.chords],
            "notes": self.notes,
        }


def _mode_profile(intervals: list[int]) -> np.ndarray:
    prof = np.full(12, 0.35)
    for i, degree in enumerate(intervals):
        prof[degree] = 1.0 if i in (0, 4) else 0.8
    return prof


def _normalize(v: np.ndarray) -> np.ndarray:
    v = v - v.mean()
    n = np.linalg.norm(v)
    return v / n if n > 0 else v


def detect_key(
    chroma_mean: np.ndarray,
    chord_weights: dict[str, float] | None = None,
    first_chord: str | None = None,
    last_chord: str | None = None,
    loop_chord: str | None = None,
) -> tuple[str, str, float, list[tuple[str, float]]]:
    """Score every (tonic, mode) pair against the chroma profile.

    Chroma correlation alone confuses a key with its relative major/minor —
    they share a pitch-class set.  When chord estimates are available we add
    the evidence that actually separates them: which chords are diatonic, how
    long the tonic chord is held, whether its quality matches the mode, and
    which chord the piece opens and closes on.
    """
    target = _normalize(chroma_mean)
    chord_weights = chord_weights or {}
    total_chord_weight = sum(chord_weights.values()) or 1.0

    scores: list[tuple[float, str, str]] = []
    for mode, intervals in MODE_INTERVALS.items():
        if mode == "major":
            base = KK_MAJOR
        elif mode == "minor":
            base = KK_MINOR
        else:
            base = _mode_profile(intervals)
        base_n = _normalize(base)
        for tonic in range(12):
            rotated = np.roll(base_n, tonic)
            score = float(np.dot(target, rotated))
            if mode not in ("major", "minor"):
                score *= 0.93

            if chord_weights:
                score += _chord_support(chord_weights, total_chord_weight, tonic, mode, intervals,
                                        first_chord, last_chord, loop_chord)
            scores.append((score, PITCH_CLASSES[tonic], mode))

    scores.sort(reverse=True)
    best_score, key, mode = scores[0]
    runner_up = scores[1][0] if len(scores) > 1 else 0.0
    confidence = float(np.clip((best_score - runner_up) * 4 + best_score, 0.0, 1.0))
    alternates = [(f"{k} {m}", float(s)) for s, k, m in scores[1:4]]
    return key, mode, confidence, alternates


MINOR_MODES = ("minor", "dorian", "phrygian", "harmonic minor")


def _chord_root_quality(chord: str) -> tuple[int, str] | None:
    root = chord[:2] if len(chord) > 1 and chord[1] == "#" else chord[:1]
    if root not in PITCH_CLASSES:
        return None
    suffix = chord[len(root):]
    if suffix.startswith("m") and not suffix.startswith("maj"):
        quality = "minor"
    elif suffix.startswith("dim"):
        quality = "dim"
    else:
        quality = "major"
    return PITCH_CLASSES.index(root), quality


def _chord_support(
    chord_weights: dict[str, float],
    total: float,
    tonic: int,
    mode: str,
    intervals: list[int],
    first_chord: str | None,
    last_chord: str | None,
    loop_chord: str | None = None,
) -> float:
    """Extra key evidence from the chord track, scaled to sit alongside the
    chroma correlation (which lives roughly in 0..1)."""
    scale = {(tonic + i) % 12 for i in intervals}
    wants_minor = mode in MINOR_MODES

    diatonic = 0.0
    tonic_weight = 0.0
    tonic_quality_match = 0.0
    dominant_weight = 0.0
    for chord, weight in chord_weights.items():
        parsed = _chord_root_quality(chord)
        if parsed is None:
            continue
        root, quality = parsed
        if root in scale:
            diatonic += weight
        if root == tonic:
            tonic_weight += weight
            if (quality == "minor") == wants_minor:
                tonic_quality_match += weight
            else:
                tonic_quality_match -= weight * 0.8
        if root == (tonic + 7) % 12:
            dominant_weight += weight

    heaviest = max(chord_weights.items(), key=lambda kv: kv[1])[0] if chord_weights else None
    parsed_heaviest = _chord_root_quality(heaviest) if heaviest else None

    support = 0.0
    if parsed_heaviest and parsed_heaviest[0] == tonic and (parsed_heaviest[1] == "minor") == wants_minor:
        support += 0.16
    support += 0.30 * (diatonic / total)
    support += 0.34 * (tonic_weight / total)
    support += 0.26 * (tonic_quality_match / total)
    support += 0.10 * (dominant_weight / total)

    # The chord a repeating progression starts on is the best relative-key
    # discriminator we have: Am-F-C-G and C-G-Am-F share every pitch class.
    for chord, bonus in ((first_chord, 0.12), (last_chord, 0.12), (loop_chord, 0.30)):
        parsed = _chord_root_quality(chord) if chord else None
        if parsed and parsed[0] == tonic:
            support += bonus
            if (parsed[1] == "minor") == wants_minor:
                support += bonus * 0.5

    return support


def _chord_matrix() -> tuple[np.ndarray, list[str], np.ndarray]:
    cols: list[np.ndarray] = []
    names: list[str] = []
    priors: list[float] = []
    for root in range(12):
        for suffix, intervals, prior in CHORD_TEMPLATES:
            template = np.zeros(12)
            for i, interval in enumerate(intervals):
                template[(root + interval) % 12] = 1.0 if i == 0 else 0.85
            cols.append(_normalize(template))
            names.append(f"{PITCH_CLASSES[root]}{suffix}")
            priors.append(prior)
    return np.stack(cols, axis=1), names, np.asarray(priors)


def _viterbi_chords(scores: np.ndarray, self_bonus: float = 0.28) -> list[int]:
    """Decode the most likely chord path, rewarding staying on a chord.

    Frame-by-frame argmax flickers between neighbouring chords that share two
    notes (C / Am / Em); a self-transition bonus keeps chords held for musically
    plausible spans.
    """
    n_states, n_frames = scores.shape
    if n_frames == 0:
        return []
    best = scores[:, 0].copy()
    back = np.zeros((n_states, n_frames), dtype=np.int32)
    for t in range(1, n_frames):
        stay = best + self_bonus
        switch_from = int(np.argmax(best))
        switch_value = best[switch_from]
        take_stay = stay >= switch_value
        back[:, t] = np.where(take_stay, np.arange(n_states), switch_from)
        best = np.where(take_stay, stay, switch_value) + scores[:, t]
    path = [int(np.argmax(best))]
    for t in range(n_frames - 1, 0, -1):
        path.append(int(back[path[-1], t]))
    return path[::-1]


def _to_roman(chord: str, key: str, mode: str) -> str:
    root = chord[:2] if len(chord) > 1 and chord[1] == "#" else chord[:1]
    suffix = chord[len(root):]
    if root not in PITCH_CLASSES:
        return chord
    degree = (PITCH_CLASSES.index(root) - PITCH_CLASSES.index(key)) % 12
    table = ROMAN_MINOR if mode in ("minor", "dorian", "phrygian", "harmonic minor", "phrygian dominant") else ROMAN_MAJOR
    numeral = table.get(degree)
    if numeral is None:
        return f"b{table.get((degree + 1) % 12, '?')}"
    if suffix.startswith("m") and numeral.isupper():
        numeral = numeral.lower()
    elif not suffix.startswith(("m", "dim")) and numeral.islower():
        numeral = numeral.upper()
    if suffix in ("7", "maj7", "m7"):
        numeral += "7"
    return numeral


def analyze_tonality(
    y: np.ndarray,
    sr: int,
    beats: np.ndarray,
    hop_length: int = 512,
    duration: float | None = None,
    y_harm: np.ndarray | None = None,
) -> Tonality:
    if y_harm is None:
        y_harm = librosa.effects.harmonic(y, margin=3.0)
    chroma = librosa.feature.chroma_cqt(y=y_harm, sr=sr, hop_length=hop_length, bins_per_octave=36)
    smoothed = librosa.decompose.nn_filter(chroma, aggregate=np.median, metric="cosine")
    chroma = np.minimum(chroma, smoothed)

    total = duration if duration is not None else float(len(y) / sr)

    # --- beat-synchronous chord estimation (runs before key detection so the
    #     chord track can disambiguate relative major/minor) ------------------
    matrix, names, priors = _chord_matrix()
    if beats.size >= 4:
        sync = librosa.util.sync(chroma, beats, aggregate=np.median)
        frame_times = librosa.frames_to_time(beats, sr=sr, hop_length=hop_length)
    else:
        sync = chroma
        frame_times = librosa.frames_to_time(np.arange(chroma.shape[1]), sr=sr, hop_length=hop_length)

    columns = np.stack([_normalize(sync[:, i]) for i in range(sync.shape[1])], axis=1) if sync.shape[1] else sync
    silent = np.array([np.linalg.norm(columns[:, i]) < 1e-6 for i in range(columns.shape[1])])
    frame_scores = (matrix.T @ columns) * priors[:, np.newaxis]
    path = _viterbi_chords(frame_scores)
    raw = ["N" if silent[i] else names[state] for i, state in enumerate(path)]

    segments: list[tuple[float, float, str]] = []
    for i, chord in enumerate(raw):
        start = float(frame_times[i]) if i < frame_times.size else total
        end = float(frame_times[i + 1]) if i + 1 < frame_times.size else total
        if segments and segments[-1][2] == chord:
            segments[-1] = (segments[-1][0], end, chord)
        else:
            segments.append((start, end, chord))
    segments = [s for s in segments if s[2] != "N" and s[1] - s[0] > 0.2]

    chord_weights: dict[str, float] = {}
    for start, end, chord in segments:
        chord_weights[chord] = chord_weights.get(chord, 0.0) + (end - start)

    seq = [c for _, _, c in segments]
    progression = _dominant_loop(seq)

    # --- key ----------------------------------------------------------------
    chroma_mean = chroma.mean(axis=1)
    key, mode, confidence, alternates = detect_key(
        chroma_mean,
        chord_weights=chord_weights,
        first_chord=segments[0][2] if segments else None,
        last_chord=segments[-1][2] if segments else None,
        loop_chord=progression[0] if progression else None,
    )

    scale_notes = [PITCH_CLASSES[(PITCH_CLASSES.index(key) + i) % 12] for i in MODE_INTERVALS[mode]]
    in_scale = sum(chroma_mean[PITCH_CLASSES.index(n)] for n in scale_notes)
    chromatic_density = float(1.0 - in_scale / (chroma_mean.sum() + 1e-9))

    harmonic_rate = len(segments) / max(total / 60.0, 1e-6)

    roman = [_to_roman(c, key, mode) for c in progression]

    notes: list[str] = []
    if confidence < 0.35:
        notes.append("ambiguous tonality — atonal, heavily processed or modulating")
    if chromatic_density > 0.35:
        notes.append("chromatic / outside-the-key movement")
    if harmonic_rate < 6:
        notes.append("static harmony, near-modal drone")
    elif harmonic_rate > 40:
        notes.append("fast-moving harmony, jazz-leaning changes")
    if mode in ("dorian", "phrygian", "mixolydian", "lydian"):
        notes.append(f"modal colour: {mode}")
    if mode in ("harmonic minor", "phrygian dominant"):
        notes.append("exotic / middle-eastern scale colour")

    return Tonality(
        key=key,
        mode=mode,
        key_confidence=confidence,
        alternate_keys=alternates,
        scale_notes=scale_notes,
        chords=segments,
        chord_progression=progression,
        roman_progression=roman,
        harmonic_rate=harmonic_rate,
        chromatic_density=chromatic_density,
        notes=notes,
    )


def _dominant_loop(seq: list[str], max_len: int = 8) -> list[str]:
    """Find the repeating chord cycle that explains most of the sequence."""
    if not seq:
        return []
    if len(seq) < 4:
        return seq[:4]
    best: tuple[float, list[str]] = (0.0, seq[:4])

    for size in range(2, max_len + 1):
        counts: dict[tuple[str, ...], int] = {}
        for i in range(len(seq) - size + 1):
            window = tuple(seq[i : i + size])
            if len(set(window)) < 2:
                continue
            counts[window] = counts.get(window, 0) + 1
        if not counts:
            continue
        window, count = max(counts.items(), key=lambda kv: kv[1] * (len(kv[0]) ** 0.5))
        coverage = count * size / len(seq)
        score = coverage * (1.0 + 0.05 * size)
        if score > best[0]:
            best = (score, list(window))
    return _collapse_repeat(best[1])


def _collapse_repeat(loop: list[str]) -> list[str]:
    """A-B-C-D-A-B-C-D is the same progression as A-B-C-D."""
    n = len(loop)
    for size in range(2, n // 2 + 1):
        if n % size == 0 and all(loop[i] == loop[i % size] for i in range(n)):
            return loop[:size]
    return loop
