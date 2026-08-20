"""Audio loading helpers.

libsndfile 1.2+ decodes wav/flac/ogg/mp3 natively, so no external binary is
needed for the common cases.  Anything else (m4a/aac/wma/video containers) is
routed through ffmpeg when it happens to be installed.
"""

from __future__ import annotations

import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import soundfile as sf

NATIVE_SUFFIXES = {".wav", ".wave", ".flac", ".ogg", ".oga", ".opus", ".mp3", ".aiff", ".aif", ".au", ".w64", ".caf"}


class AudioLoadError(RuntimeError):
    pass


@dataclass
class Clip:
    """Mono float32 audio at a known sample rate."""

    y: np.ndarray
    sr: int
    path: Path
    duration: float
    channels: int
    source_sr: int

    @property
    def n_samples(self) -> int:
        return int(self.y.shape[0])


def _to_mono(data: np.ndarray) -> tuple[np.ndarray, int]:
    if data.ndim == 1:
        return data.astype(np.float32, copy=False), 1
    channels = data.shape[1]
    return data.mean(axis=1).astype(np.float32, copy=False), channels


def _decode_with_ffmpeg(path: Path, sr: int) -> tuple[np.ndarray, int, int]:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise AudioLoadError(
            f"Cannot decode {path.suffix or 'this file'} without ffmpeg. "
            "Install ffmpeg, or convert the file to wav/flac/mp3/ogg first."
        )
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmp:
        cmd = [ffmpeg, "-v", "error", "-y", "-i", str(path), "-ac", "1", "-ar", str(sr), "-f", "wav", tmp.name]
        proc = subprocess.run(cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            raise AudioLoadError(f"ffmpeg failed on {path.name}: {proc.stderr.strip()[:400]}")
        data, file_sr = sf.read(tmp.name, dtype="float32", always_2d=False)
    y, channels = _to_mono(data)
    return y, file_sr, channels


def load_audio(path: str | Path, sr: int = 22050, max_seconds: float | None = 600.0) -> Clip:
    """Load `path` as mono audio resampled to `sr`.

    `max_seconds` caps the analysed span so a 40-minute DJ set does not blow up
    memory; pass None to analyse the whole file.
    """
    path = Path(path).expanduser()
    if not path.is_file():
        raise AudioLoadError(f"No such audio file: {path}")

    suffix = path.suffix.lower()
    if suffix in NATIVE_SUFFIXES:
        try:
            data, file_sr = sf.read(str(path), dtype="float32", always_2d=False)
            y, channels = _to_mono(data)
        except Exception:
            y, file_sr, channels = _decode_with_ffmpeg(path, sr)
    else:
        y, file_sr, channels = _decode_with_ffmpeg(path, sr)

    if y.size == 0:
        raise AudioLoadError(f"{path.name} decoded to zero samples")

    source_sr = int(file_sr)
    if source_sr != sr:
        import librosa

        y = librosa.resample(y, orig_sr=source_sr, target_sr=sr, res_type="soxr_hq")

    duration = float(y.shape[0]) / sr
    if max_seconds is not None and duration > max_seconds:
        y = y[: int(max_seconds * sr)]
        duration = float(y.shape[0]) / sr

    peak = float(np.max(np.abs(y))) if y.size else 0.0
    if peak > 0:
        y = y / peak * 0.98

    return Clip(y=y.astype(np.float32), sr=sr, path=path, duration=duration, channels=channels, source_sr=source_sr)
