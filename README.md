# audio2prompt

Drop in an audio file — get back what it is made of, and a Suno prompt built from those measurements.

The tool decomposes a track into tempo, meter, groove, key, mode, chord progression, melody (as
notes *and* a MIDI file), instrumentation, mix character and arrangement structure, then assembles
that into the fields Suno actually reads: **Style**, **Exclude Styles**, and a structure block.
Lyrics are never extracted or generated — the default output is an instrumental prompt.

---

## מה זה עושה (עברית)

שמים קובץ אודיו, ומקבלים:

| מה מחלצים | מה יוצא |
|---|---|
| קצב | BPM מדויק, משקל (4/4 או 3/4), מידת סווינג, כמה הגריד "מרובע" מול נגינה חיה |
| סולם והרמוניה | טוניקה ומוד (מז'ור, מינור, דוריאן, פריגי, מינור הרמוני ועוד), רצף האקורדים והפרוגרסיה בספרות רומיות |
| מלודיה | התווים עצמם, טווח, קונטור, פרזות — וקובץ MIDI להורדה. עם תמלול פוליפוני מקבלים גם MIDI של **כל** התווים בטראק |
| כלים | דירוג של הכלים שכנראה מנגנים, עם רמת ביטחון |
| סאונד והפקה | בהירות, איזון תדרים, דחיסה, דינמיקה, תחושת lo-fi מול מודרני |
| מבנה | חלוקה לקטעים (intro / verse / build / drop / breakdown / outro) עם זמנים ואנרגיה |
| סטמים | פירוק לתופים / באס / ליד |
| סגנון | התאמה לז'אנרים עם אחוזי ביטחון + מילות מצב־רוח |

ומזה נבנה **פרומט מוכן ל-Suno**: שדה Style קצר, שדה Style מפורט, שדה Exclude Styles, ובלוק מבנה עם תגיות.

המילים לא מחולצות ולא נכתבות — ברירת המחדל היא פרומט אינסטרומנטלי.

---

## Install

```bash
pip install -r requirements.txt
pip install -e .
```

Python 3.10+. `libsndfile` (shipped with the `soundfile` wheel) decodes wav, flac, ogg and mp3
without any external binary. For m4a/aac/wma, install `ffmpeg` as well.

## Use

### Web app — drag and drop

```bash
audio2prompt-web            # opens http://127.0.0.1:8765
```

Drop a file onto the page. Every prompt field has a copy button.

### Command line

```bash
audio2prompt track.mp3                        # full report in the terminal
audio2prompt track.mp3 --prompt-only          # just the Suno fields
audio2prompt track.mp3 -o out/                # JSON + Markdown + prompt.txt + melody MIDI
audio2prompt track.mp3 -o out/ --save-stems   # also write the separated stems
audio2prompt album/ --json                    # whole folder, machine-readable
audio2prompt track.mp3 --with-vocals          # build a vocal prompt instead of instrumental
audio2prompt track.mp3 --skip-melody          # ~3x faster, drops the note/MIDI output
audio2prompt track.mp3 --transcribe pyin      # force the monophonic melody backend
```

### Python

```python
from audio2prompt import analyze_file
from audio2prompt.prompt import build_prompt

analysis = analyze_file("track.mp3")
prompt = build_prompt(analysis, instrumental=True)

print(analysis.rhythm.bpm, analysis.tonality.key_name)
print(analysis.tonality.chord_progression)
print(prompt.style_short)
```

## Sample output

```
▸ RHYTHM
  tempo            120.0 BPM
  meter            4/4  (16 bars)
  grid tightness   ███████████████████████· 95%
  swing            ███····················· 14%
  groove           tight quantized grid, programmed drums; straight eighths

▸ TONALITY
  key              A minor  (100% confidence)
  progression      Am7 → F → C → Gmaj7
  in roman         i7 → VI → III → vii7

▸ MELODY
  extracted by     basic-pitch (top voice)
  range            C4 → C6   centre A4
  polyphony        5.5 notes sounding at once

═══ SUNO PROMPT ═══
Style:   deep house with progressive house influence, dark, brooding, melancholic,
         groovy, 120 BPM, A minor, instrumental, kick drum, synth bass
Exclude: vocals, lyrics, spoken word, choir, muddy mix, abrupt ending, tempo drift
```

## Melody extraction

Two backends, picked automatically:

- **`pyin`** (always available) — monophonic pitch tracking on a high-passed copy of the mix.
  It can only follow one pitch at a time, so on a dense arrangement it reports whichever voice is
  loudest, which is often a pad or the bassline rather than the lead.
- **`basic-pitch`** (optional, recommended) — a polyphonic transcription model. It transcribes
  every note it hears, and the lead is recovered as the **top voice** of that transcription, which
  is what a listener hears as the melody:

  ```bash
  pip install -r requirements-optional.txt
  ```

  Unlike demucs there is nothing to download — the model weights ship inside the wheel. With it you
  also get a full `.transcription.mid` alongside the lead-line `.melody.mid`, plus a polyphony
  measurement (how many notes sound at once).

On the test fixture — where the melody is written at MIDI 67–76 over chords at 48–64 — `pyin`
centres its line on the chord bed at B3, while the polyphonic top voice centres on A4, inside the
written melody. The regression test asserts exactly that.

## Stem separation

Two backends, picked automatically:

- **`dsp`** (always available) — harmonic/percussive separation plus band splitting. No extra
  dependencies. Good enough to keep the melody tracker off the bassline and to report per-stem levels.
- **`demucs`** (optional) — a trained separation model, far more accurate:

  ```bash
  pip install -r requirements-optional.txt
  audio2prompt track.mp3 --separate demucs
  ```

  It pulls in torch and downloads model weights on first run. If the download fails, the tool falls
  back to the DSP split rather than erroring out.

## How accurate is this?

Signal analysis, not magic. What it is reliably good at, and where it guesses:

| | |
|---|---|
| **Tempo** | Solid on anything with a steady beat. Half/double-time confusion is possible; `bpm_candidates` in the JSON shows the alternatives. |
| **Key** | Good. Relative major/minor is resolved from the chord track (which chord the loop starts and rests on), not from chroma alone. Heavily processed or modulating material lowers the reported confidence. |
| **Chords** | Triads and sevenths, decoded with a Viterbi pass so chords are held rather than flickering. Inversions and slash chords are not detected. |
| **Melody** | Good with `basic-pitch` installed: the top voice of a full polyphonic transcription. On harmonically rich material the line can still pick up a partial above the lead, or a chord tone while the lead rests — outliers far from the line's pitch centre are trimmed, but not all of them. Without `basic-pitch` it falls back to monophonic tracking, which on a dense mix often follows a pad instead of the lead. |
| **Instruments** | Heuristics over spectral evidence, reported as ranked hints with confidences, **not** classifications. Treat anything under ~50% as a suggestion. |
| **Genre** | Rule-based matching against feature windows, weighted so narrow profiles beat catch-all ones. Top-3 with confidences. |
| **Vocals** | A crude proxy (sustained energy in the vocal band). It will miss quiet or heavily processed vocals. |

## Layout

```
audio2prompt/
  analyze.py       pipeline — one HPSS pass feeds every extractor
  audio_io.py      decoding, resampling, mono-folding
  separation.py    stem separation (dsp | demucs)
  transcribe.py    polyphonic transcription and top-voice melody extraction
  features/
    rhythm.py      BPM, beat grid, meter, swing, groove
    tonality.py    key/mode detection, Viterbi chord decoding, progressions
    melody.py      monophonic pitch tracking, note segmentation, MIDI writer
    timbre.py      spectral balance, dynamics, production character
    structure.py   section segmentation and labelling
    instruments.py instrumentation hints
  genre.py         style profiles and matching
  prompt.py        Suno Style / Exclude / structure fields
  report.py        terminal, Markdown, JSON and file outputs
  cli.py           command line
  webapp.py        local drag-and-drop web app (stdlib only)
```

## Tests

```bash
python3 tests/make_fixture.py examples/fixture_120bpm_Am.wav   # regenerate the fixture
python3 -m pytest tests/ -q
```

The fixture is a rendered 120 BPM / A minor / Am-F-C-G loop, so the end-to-end tests assert on
known-correct musical values rather than on whatever the code happens to output.
