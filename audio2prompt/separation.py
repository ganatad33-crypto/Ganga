"""Split a mix into stems.

Two backends:

* ``demucs`` — a trained source-separation model.  Far more accurate, but it
  pulls in torch and downloads model weights, so it is entirely optional.
* ``dsp``    — harmonic/percussive separation plus band splitting.  No extra
  dependencies, ships everywhere, and is good enough to keep the melody
  tracker off the bassline and to measure per-stem levels.

The rest of the package never assumes stems exist; separation only sharpens
the analysis when it is available.
"""

from __future__ import annotations

from dataclasses import dataclass
from importlib.util import find_spec

import librosa
import numpy as np
import scipy.signal

STEM_NAMES = ("drums", "bass", "lead", "other")

# demucs downloads its weights on first use.  If that fails (offline, blocked
# host) we must not pay the timeout again on every subsequent file.
_DEMUCS_BROKEN = False


@dataclass
class Stems:
    backend: str
    stems: dict[str, np.ndarray]
    levels: dict[str, float]

    def get(self, name: str) -> np.ndarray | None:
        return self.stems.get(name)

    def to_dict(self) -> dict:
        return {
            "backend": self.backend,
            "levels_db": {k: round(v, 2) for k, v in self.levels.items()},
            "dominant_stem": max(self.levels, key=self.levels.get) if self.levels else None,
        }


def demucs_available() -> bool:
    return find_spec("demucs") is not None and find_spec("torch") is not None


def _band(y: np.ndarray, sr: int, low: float | None, high: float | None, order: int = 4) -> np.ndarray:
    nyq = sr / 2
    if low and high:
        sos = scipy.signal.butter(order, [low / nyq, min(high / nyq, 0.99)], btype="bandpass", output="sos")
    elif low:
        sos = scipy.signal.butter(order, low / nyq, btype="highpass", output="sos")
    elif high:
        sos = scipy.signal.butter(order, min(high / nyq, 0.99), btype="lowpass", output="sos")
    else:
        return y
    return scipy.signal.sosfiltfilt(sos, y).astype(np.float32)


def _levels(stems: dict[str, np.ndarray]) -> dict[str, float]:
    out: dict[str, float] = {}
    for name, signal in stems.items():
        rms = float(np.sqrt(np.mean(signal**2))) if signal.size else 0.0
        out[name] = float(20 * np.log10(rms)) if rms > 1e-9 else -120.0
    return out


def _separate_dsp(
    y: np.ndarray,
    sr: int,
    harmonic: np.ndarray | None = None,
    percussive: np.ndarray | None = None,
) -> Stems:
    if harmonic is None or percussive is None:
        harmonic, percussive = librosa.effects.hpss(y)
    drums = percussive
    bass = _band(harmonic, sr, None, 250.0)
    lead = _band(harmonic, sr, 250.0, 8000.0)
    other = y - drums - bass - lead
    stems = {"drums": drums, "bass": bass, "lead": lead, "other": other.astype(np.float32)}
    return Stems(backend="dsp", stems=stems, levels=_levels(stems))


def _separate_demucs(y: np.ndarray, sr: int, model_name: str = "htdemucs") -> Stems:
    import torch  # noqa: PLC0415
    from demucs.apply import apply_model  # noqa: PLC0415
    from demucs.pretrained import get_model  # noqa: PLC0415

    model = get_model(model_name)
    model.eval()
    target_sr = model.samplerate

    audio = librosa.resample(y, orig_sr=sr, target_sr=target_sr) if sr != target_sr else y
    tensor = torch.from_numpy(np.stack([audio, audio])).unsqueeze(0).float()

    with torch.no_grad():
        out = apply_model(model, tensor, device="cpu", split=True, overlap=0.1, progress=False)[0]

    stems: dict[str, np.ndarray] = {}
    for name, track in zip(model.sources, out):
        mono = track.mean(dim=0).numpy()
        if target_sr != sr:
            mono = librosa.resample(mono, orig_sr=target_sr, target_sr=sr)
        stems[name] = mono.astype(np.float32)

    # demucs names its melodic residual "other"; the rest of the package looks
    # for a "lead" stem, so alias vocals-or-other into it.
    if "vocals" in stems and "other" in stems:
        vocal_level = float(np.sqrt(np.mean(stems["vocals"] ** 2)))
        other_level = float(np.sqrt(np.mean(stems["other"] ** 2)))
        stems["lead"] = stems["vocals"] if vocal_level > other_level else stems["other"]
    elif "other" in stems:
        stems["lead"] = stems["other"]

    return Stems(backend=f"demucs:{model_name}", stems=stems, levels=_levels(stems))


def separate(
    y: np.ndarray,
    sr: int,
    backend: str = "auto",
    harmonic: np.ndarray | None = None,
    percussive: np.ndarray | None = None,
) -> Stems:
    """Split `y` into stems using `backend` ('auto' | 'demucs' | 'dsp').

    `harmonic`/`percussive` let the caller hand in an HPSS split it already
    computed, so the dsp backend costs almost nothing on top of the rest of the
    analysis.
    """
    global _DEMUCS_BROKEN
    want_demucs = backend == "demucs" or (backend == "auto" and demucs_available() and not _DEMUCS_BROKEN)
    if want_demucs:
        try:
            return _separate_demucs(y, sr)
        except Exception:
            if backend == "demucs":
                raise
            _DEMUCS_BROKEN = True
    return _separate_dsp(y, sr, harmonic=harmonic, percussive=percussive)
