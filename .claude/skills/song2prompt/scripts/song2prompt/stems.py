import shutil
import subprocess
import tempfile
from pathlib import Path

import numpy as np
import librosa

STEM_NAMES = ("vocals", "drums", "bass", "other")


def _has_demucs_module():
    try:
        import demucs  # noqa: F401
        return True
    except ImportError:
        return False


def stems_available():
    return shutil.which("demucs") is not None or _has_demucs_module()


def separate_stems(path, out_dir=None, model="htdemucs"):
    if not stems_available():
        raise RuntimeError(
            "demucs is not installed. Install with: pip install demucs torch"
        )
    path = Path(path)
    work_dir = Path(out_dir) if out_dir else Path(tempfile.mkdtemp(prefix="song2prompt_stems_"))
    cmd = ["python3", "-m", "demucs.separate", "-n", model, "-o", str(work_dir), str(path)]
    subprocess.run(cmd, check=True)

    stem_dir = work_dir / model / path.stem
    stems = {}
    for name in STEM_NAMES:
        f = stem_dir / f"{name}.wav"
        if f.exists():
            stems[name] = f
    return stems


def analyze_stem_presence(stems):
    energies = {}
    for name, filepath in stems.items():
        y, sr = librosa.load(str(filepath), sr=22050, mono=True)
        rms = librosa.feature.rms(y=y)[0]
        energies[name] = float(np.mean(rms))

    total = sum(energies.values()) + 1e-9
    presence = {}
    for name, e in energies.items():
        ratio = e / total
        if ratio < 0.05:
            level = "barely present / near silent"
        elif ratio < 0.15:
            level = "background / subtle"
        elif ratio < 0.35:
            level = "present"
        else:
            level = "prominent / dominant"
        presence[name] = {"energy_ratio": round(ratio, 3), "level": level}
    return presence


def analyze_stems(path, out_dir=None, model="htdemucs"):
    stems = separate_stems(path, out_dir=out_dir, model=model)
    return analyze_stem_presence(stems)
