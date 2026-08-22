#!/usr/bin/env python3
"""Analyse an audio file and dump everything the skill needs as JSON.

Wraps the bundled audio2prompt package so the skill can call one script
without worrying about import paths, and fails with an actionable message
when a dependency is missing rather than a raw traceback.
"""

from __future__ import annotations

import argparse
import contextlib
import io
import json
import sys
import warnings
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

REQUIRED = {
    "numpy": "numpy",
    "scipy": "scipy",
    "librosa": "librosa",
    "soundfile": "soundfile",
}

INSTALL_HINT = (
    "Missing dependencies: {missing}\n"
    "Install them with:\n"
    "    pip install numpy scipy librosa soundfile\n"
    "Optional, and a big upgrade to melody accuracy (weights ship in the wheel,\n"
    "nothing is downloaded at runtime):\n"
    "    pip install basic-pitch 'setuptools<81'"
)


def check_dependencies() -> None:
    from importlib.util import find_spec

    missing = [pkg for mod, pkg in REQUIRED.items() if find_spec(mod) is None]
    if missing:
        print(INSTALL_HINT.format(missing=", ".join(missing)), file=sys.stderr)
        raise SystemExit(3)


def main() -> int:
    parser = argparse.ArgumentParser(description="Analyse audio and emit a Suno prompt as JSON")
    parser.add_argument("audio", help="path to the audio file")
    parser.add_argument("--outdir", help="also write JSON, Markdown, prompt text, MIDI and stems here")
    parser.add_argument("--with-vocals", action="store_true", help="build a vocal prompt instead of instrumental")
    parser.add_argument("--fast", action="store_true", help="skip melody extraction (roughly 3x faster)")
    parser.add_argument("--save-stems", action="store_true", help="write separated stems (needs --outdir)")
    parser.add_argument("--max-seconds", type=float, default=600.0,
                        help="analyse at most this many seconds; 0 means the whole file")
    args = parser.parse_args()

    check_dependencies()
    warnings.filterwarnings("ignore")

    # torch and basic-pitch print download and progress lines straight to
    # stdout. This script's stdout is the JSON contract, so anything they emit
    # would corrupt it — send their chatter to stderr with the progress log.
    noise = io.StringIO()

    from audio2prompt.analyze import analyze_file
    from audio2prompt.audio_io import AudioLoadError
    from audio2prompt.prompt import build_prompt

    try:
        with contextlib.redirect_stdout(noise):
            analysis = analyze_file(
                args.audio,
                max_seconds=None if args.max_seconds == 0 else args.max_seconds,
                skip_melody=args.fast,
                progress=lambda msg: print(f"… {msg}", file=sys.stderr),
            )
    except AudioLoadError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    finally:
        captured = noise.getvalue().strip()
        if captured:
            print(captured, file=sys.stderr)

    prompt = build_prompt(analysis, instrumental=not args.with_vocals)
    payload = analysis.to_dict()
    payload["suno_prompt"] = prompt.to_dict()

    if args.outdir:
        from audio2prompt.report import write_outputs

        with contextlib.redirect_stdout(sys.stderr):
            written = write_outputs(analysis, prompt, Path(args.outdir), save_stems=args.save_stems)
        payload["written_files"] = {k: str(v) for k, v in written.items()}

    json.dump(payload, sys.stdout, indent=2, ensure_ascii=False)
    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
