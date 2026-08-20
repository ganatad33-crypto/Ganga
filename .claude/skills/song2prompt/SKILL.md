---
name: song2prompt
description: Analyze a song's audio file (BPM, key, energy-based structure, texture/instrumentation) and draft a Suno-style generation prompt from it. Use this whenever the user uploads or references an audio file (mp3/wav/flac/etc.) and asks to analyze it, break it down, extract its BPM/key/structure, or turn it into a prompt to recreate something similar with Suno or another AI music generator. Also use when the user asks "what can this do" about a `remotion render ... audio.mp3`-style command that turns out to actually be about song analysis, or asks for a tool/skill that takes a song and writes a prompt like it.
---

# song2prompt

Analyzes a song file and produces two things: **measured facts** (BPM, key,
energy-based structure timeline, texture) and a **draft Suno prompt**
(Style / Exclude / Structure blocks) built from those facts.

## Hard limits — do not overclaim

- **No genre classification.** The script has no genre classifier. It was
  tested against a real reggaeton track and, before this was fixed, it
  confidently mislabeled it "techno / trance" purely because the BPM fell in
  that range. The script now always leaves the genre field as an explicit
  `<GENRE — fill in manually>` placeholder — **never** let a wrong BPM-based
  guess reach the user as if it were a real genre identification.
- **No note-for-note transcription.** BPM, key, structure, and texture are
  reliable. Exact melody/chord transcription from a full mix (with vocals)
  is not attempted and would not be accurate if it were.
- **Structure labels (Intro/Build/Drop/Breakdown) are an energy-curve
  heuristic**, not real harmonic section detection (verse/chorus). Say so
  when presenting results.

## How to run it

1. Check whether the Python dependencies are already importable; install
   them only if missing (don't reinstall every time):
   ```bash
   python3 -c "import librosa" 2>/dev/null || pip install -r <skill_dir>/scripts/requirements.txt
   ```
   Replace `<skill_dir>` with this skill's own directory (the directory
   containing this SKILL.md).

2. Run the analysis on the user's audio file:
   ```bash
   python3 <skill_dir>/scripts/entry_point.py "/path/to/song.mp3"
   ```
   Useful flags:
   - `--json /path/to/out.json` — also dump the raw measured data as JSON.
   - `--stems` — run optional Demucs stem separation to detect
     vocal/drums/bass/other presence. This pulls in PyTorch (heavy, slow to
     install) — only use it if the user specifically wants stem/instrument
     presence detection, and warn them about the download size first.
   - `--window <seconds>` — energy-segmentation window size (default 6s).

3. The command prints a full Hebrew-language report to stdout. Read it, then
   **before showing it to the user, fill in the `<GENRE — fill in manually>`
   placeholder yourself** using whatever you actually know about the track
   (artist/title recognition, or the audible style if you have listened to
   it via other means). If you genuinely don't know the genre, say so
   explicitly instead of guessing — don't silently reuse the BPM-family list
   from section 5 as if it were a real identification.

4. **Never put a real artist's name inside the Suno Style/Exclude prompt**
   (matches the `suno-electronic` skill's rule) — translate "sounds like
   Artist X" into sonic descriptors instead.

5. If the actual genre is electronic dance music (house/techno/trance/DnB/
   dubstep/etc.), hand the corrected draft to the `suno-electronic` skill to
   refine the subgenre, differentiation tag, and groove wording before
   giving the user a final version. If the genre is anything else
   (reggaeton, hip-hop, pop, rock, Latin, etc.), `suno-electronic` doesn't
   apply — just present the corrected Style/Exclude/Structure draft
   directly, adjusting the groove/bass/texture language to fit that genre's
   real conventions instead of the electronic-music phrasing the draft
   defaults to.

## Files

| File | Role |
|---|---|
| `scripts/song2prompt/audio_features.py` | BPM, key, energy structure, texture (librosa) |
| `scripts/song2prompt/stems.py` | Optional Demucs-based stem presence detection |
| `scripts/song2prompt/prompt_builder.py` | Builds the report + Suno draft text |
| `scripts/song2prompt/cli.py` | Argument parsing, orchestration |
| `scripts/entry_point.py` | Script entry point (`python3 entry_point.py <audio>`) |
| `scripts/requirements.txt` | Runtime dependencies to bootstrap on first use |

The standalone CLI version of this same tool (installable via `pip install
-e .` as the `song2prompt` command) lives at `song2prompt/` in the repo
root, for users who want to run it outside of Claude.
