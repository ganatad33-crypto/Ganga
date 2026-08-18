"""End-to-end and unit tests against a deterministic synthetic track."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from audio2prompt.analyze import analyze_file  # noqa: E402
from audio2prompt.features.melody import Note, write_midi  # noqa: E402
from audio2prompt.features.rhythm import _fold_bpm  # noqa: E402
from audio2prompt.features.tonality import _collapse_repeat, _dominant_loop, detect_key  # noqa: E402
from audio2prompt.genre import infer_genres  # noqa: E402
from audio2prompt.prompt import build_prompt  # noqa: E402
from audio2prompt.webapp import parse_multipart  # noqa: E402

FIXTURE = Path(__file__).resolve().parents[1] / "examples" / "fixture_120bpm_Am.wav"


@pytest.fixture(scope="module")
def fixture_path() -> Path:
    if not FIXTURE.exists():
        subprocess.run(
            [sys.executable, str(Path(__file__).parent / "make_fixture.py"), str(FIXTURE)],
            check=True,
        )
    return FIXTURE


@pytest.fixture(scope="module")
def analysis(fixture_path: Path):
    return analyze_file(fixture_path, separation="dsp")


# --------------------------------------------------------------------- units

@pytest.mark.parametrize(
    ("raw", "expected"),
    [(240.0, 120.0), (30.0, 60.0), (128.0, 128.0), (60.0, 60.0), (400.0, 100.0), (0.0, 0.0)],
)
def test_fold_bpm_lands_in_a_musical_range(raw: float, expected: float) -> None:
    assert _fold_bpm(raw) == pytest.approx(expected)


def test_collapse_repeat_removes_doubled_loops() -> None:
    assert _collapse_repeat(["Am", "F", "C", "G", "Am", "F", "C", "G"]) == ["Am", "F", "C", "G"]
    assert _collapse_repeat(["Am", "F", "C"]) == ["Am", "F", "C"]


def test_dominant_loop_finds_the_repeating_cycle() -> None:
    seq = ["Am", "F", "C", "G"] * 4 + ["Dm"]
    assert _dominant_loop(seq) == ["Am", "F", "C", "G"]


def test_chord_evidence_separates_relative_keys() -> None:
    """A minor and C major share a pitch set — the chord track must decide."""
    chroma = np.zeros(12)
    for pc in (0, 2, 4, 5, 7, 9, 11):  # C major scale content
        chroma[pc] = 1.0

    minor_key, minor_mode, _, _ = detect_key(
        chroma,
        chord_weights={"Am": 8.0, "F": 4.0, "C": 4.0, "G": 4.0},
        first_chord="Am", last_chord="Am", loop_chord="Am",
    )
    major_key, major_mode, _, _ = detect_key(
        chroma,
        chord_weights={"C": 8.0, "G": 4.0, "Am": 4.0, "F": 4.0},
        first_chord="C", last_chord="C", loop_chord="C",
    )
    assert (minor_key, minor_mode) == ("A", "minor")
    assert (major_key, major_mode) == ("C", "major")


def test_genre_inference_prefers_a_specific_profile_over_a_catch_all() -> None:
    guesses = infer_genres(
        bpm=134.0, percussive_ratio=0.7, sub_bass=0.25, brightness=3000.0,
        flatness=0.2, swing=0.05, stability=0.95, onset_rate=7.0,
    )
    assert guesses[0].name in {"techno", "trance", "psytrance"}
    assert all(0.0 <= g.confidence <= 1.0 for g in guesses)


def test_parse_multipart_reads_file_and_flag_fields() -> None:
    body = (
        b'--B\r\nContent-Disposition: form-data; name="audio"; filename="x.wav"\r\n'
        b"Content-Type: audio/wav\r\n\r\nPAYLOAD\r\n"
        b'--B\r\nContent-Disposition: form-data; name="fast"\r\n\r\n1\r\n--B--\r\n'
    )
    fields = parse_multipart(body, "multipart/form-data; boundary=B")
    assert fields["audio"] == ("x.wav", b"PAYLOAD")
    assert fields["fast"][1] == b"1"


def test_parse_multipart_rejects_a_missing_boundary() -> None:
    with pytest.raises(ValueError):
        parse_multipart(b"", "multipart/form-data")


def test_write_midi_emits_a_valid_header(tmp_path: Path) -> None:
    notes = [Note(0.0, 0.5, 60, 90), Note(0.5, 1.0, 64, 80)]
    path = write_midi(notes, tmp_path / "m.mid", bpm=120.0)
    raw = path.read_bytes()
    assert raw.startswith(b"MThd")
    assert b"MTrk" in raw
    assert len(raw) > 30


# ------------------------------------------------------------ end to end

def test_tempo_matches_the_rendered_fixture(analysis) -> None:
    assert analysis.rhythm.bpm == pytest.approx(120.0, abs=1.5)
    assert analysis.rhythm.time_signature == "4/4"


def test_key_matches_the_rendered_fixture(analysis) -> None:
    assert analysis.tonality.key == "A"
    assert analysis.tonality.mode in ("minor", "dorian", "phrygian", "harmonic minor")


def test_chord_progression_recovers_the_written_loop(analysis) -> None:
    roots = {c[:2] if len(c) > 1 and c[1] == "#" else c[:1] for c in analysis.tonality.chord_progression}
    assert {"A", "F", "C", "G"} <= roots


def test_melody_is_tracked_above_the_bass(analysis) -> None:
    assert analysis.melody.notes, "expected some melodic notes"
    pitches = [n.midi for n in analysis.melody.notes]
    assert np.median(pitches) > 48, "melody tracker locked onto the bass register"


def test_structure_and_stems_are_populated(analysis) -> None:
    assert analysis.structure.sections
    assert analysis.stems is not None
    assert set(analysis.stems.levels) >= {"drums", "bass", "lead"}


def test_prompt_fields_are_usable(analysis) -> None:
    prompt = build_prompt(analysis, instrumental=True)
    assert 0 < len(prompt.style_short) <= 200
    assert 0 < len(prompt.style_long) <= 1000
    assert "120 BPM" in prompt.style_short
    assert "A minor" in prompt.style_short
    assert "vocals" in prompt.exclude
    assert "[Instrumental]" in prompt.structure_block


def test_analysis_serialises_to_json(analysis) -> None:
    import json

    payload = analysis.to_dict()
    payload["suno_prompt"] = build_prompt(analysis).to_dict()
    assert json.loads(json.dumps(payload, ensure_ascii=False))["rhythm"]["bpm"] > 0
