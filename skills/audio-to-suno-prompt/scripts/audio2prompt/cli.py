"""Command line entry point: audio file in, Suno prompt out."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .analyze import analyze_file
from .audio_io import AudioLoadError
from .prompt import build_prompt
from .report import render_markdown, render_text, write_outputs

AUDIO_GLOBS = ("*.mp3", "*.wav", "*.flac", "*.ogg", "*.m4a", "*.aac", "*.aiff", "*.opus", "*.wma")


def _collect(paths: list[str]) -> list[Path]:
    files: list[Path] = []
    for raw in paths:
        p = Path(raw).expanduser()
        if p.is_dir():
            for pattern in AUDIO_GLOBS:
                files.extend(sorted(p.glob(pattern)))
        else:
            files.append(p)
    return files


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="audio2prompt",
        description="Decompose an audio file into tempo, key, chords, melody, timbre and structure, "
                    "then build a Suno-ready style prompt from it.",
    )
    parser.add_argument("paths", nargs="+", help="audio file(s) or a directory of audio files")
    parser.add_argument("-o", "--outdir", type=Path, help="write JSON, Markdown, prompt and MIDI here")
    parser.add_argument("--json", action="store_true", help="print the full analysis as JSON to stdout")
    parser.add_argument("--markdown", action="store_true", help="print a Markdown report to stdout")
    parser.add_argument("--prompt-only", action="store_true", help="print just the Suno fields")
    parser.add_argument("--with-vocals", action="store_true",
                        help="build the prompt for a vocal track instead of an instrumental")
    parser.add_argument("--language", help="vocal language to name in the prompt (implies --with-vocals)")
    parser.add_argument("--sr", type=int, default=22050, help="analysis sample rate (default 22050)")
    parser.add_argument("--max-seconds", type=float, default=600.0,
                        help="analyse at most this many seconds (0 = whole file)")
    parser.add_argument("--separate", choices=["auto", "dsp", "demucs", "off"], default="auto",
                        help="stem separation backend: auto uses demucs when installed, "
                             "otherwise a dependency-free DSP split")
    parser.add_argument("--transcribe", choices=["auto", "basic-pitch", "pyin", "off"], default="auto",
                        help="melody backend: auto uses basic-pitch (polyphonic) when installed, "
                             "otherwise monophonic pitch tracking")
    parser.add_argument("--save-stems", action="store_true",
                        help="write the separated stems as wav files (needs --outdir)")
    parser.add_argument("--skip-melody", action="store_true",
                        help="skip pitch tracking — much faster, drops the note/MIDI output")
    parser.add_argument("--no-midi", action="store_true", help="do not write a melody MIDI file")
    parser.add_argument("--no-color", action="store_true", help="plain text output")
    parser.add_argument("-q", "--quiet", action="store_true", help="suppress progress messages")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    files = _collect(args.paths)
    if not files:
        print("No audio files found.", file=sys.stderr)
        return 2

    instrumental = not (args.with_vocals or args.language)
    color = not args.no_color and sys.stdout.isatty()
    max_seconds = None if args.max_seconds == 0 else args.max_seconds

    exit_code = 0
    results = []
    for path in files:
        def progress(msg: str, path=path) -> None:
            if not args.quiet:
                print(f"  … {path.name}: {msg}", file=sys.stderr)

        try:
            analysis = analyze_file(
                path, sr=args.sr, max_seconds=max_seconds,
                skip_melody=args.skip_melody, separation=args.separate,
                transcription="off" if args.transcribe == "pyin" else args.transcribe,
                progress=progress,
            )
        except AudioLoadError as exc:
            print(f"error: {exc}", file=sys.stderr)
            exit_code = 1
            continue
        except Exception as exc:  # noqa: BLE001 - one bad file must not kill a batch
            print(f"error: failed to analyse {path.name}: {exc}", file=sys.stderr)
            exit_code = 1
            continue

        prompt = build_prompt(analysis, instrumental=instrumental, language=args.language)
        results.append((analysis, prompt))

        if args.json:
            payload = analysis.to_dict()
            payload["suno_prompt"] = prompt.to_dict()
            print(json.dumps(payload, indent=2, ensure_ascii=False))
        elif args.markdown:
            print(render_markdown(analysis, prompt))
        elif args.prompt_only:
            print(f"=== {path.name} ===")
            print(f"STYLE: {prompt.style_short}")
            print(f"STYLE (DETAILED): {prompt.style_long}")
            print(f"EXCLUDE: {prompt.exclude}")
            print(prompt.structure_block)
            print()
        else:
            print(render_text(analysis, prompt, color=color))

        if args.outdir:
            written = write_outputs(
                analysis, prompt, args.outdir,
                write_midi_file=not args.no_midi, save_stems=args.save_stems,
            )
            if not args.quiet:
                for kind, p in written.items():
                    print(f"  wrote {kind}: {p}", file=sys.stderr)

    return exit_code


if __name__ == "__main__":
    raise SystemExit(main())
