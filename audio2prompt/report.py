"""Human-readable and machine-readable renderings of an Analysis."""

from __future__ import annotations

import json
from pathlib import Path

from .analyze import Analysis
from .prompt import SunoPrompt


def _bar(value: float, width: int = 24) -> str:
    filled = int(round(max(0.0, min(1.0, value)) * width))
    return "█" * filled + "·" * (width - filled)


def render_text(analysis: Analysis, prompt: SunoPrompt, color: bool = True) -> str:
    r, t, m, tb, st, inst = (
        analysis.rhythm, analysis.tonality, analysis.melody,
        analysis.timbre, analysis.structure, analysis.instrumentation,
    )

    def h(text: str) -> str:
        return f"\033[1;36m{text}\033[0m" if color else text

    def dim(text: str) -> str:
        return f"\033[2m{text}\033[0m" if color else text

    out: list[str] = []
    dur = analysis.clip.duration
    out.append(h(f"\n═══ {analysis.clip.path.name} ═══"))
    out.append(dim(f"{int(dur // 60)}:{int(dur % 60):02d} · {analysis.clip.source_sr} Hz · "
                   f"{'stereo' if analysis.clip.channels >= 2 else 'mono'} · analysed in {analysis.elapsed:.1f}s"))

    out.append(h("\n▸ RHYTHM"))
    out.append(f"  tempo            {r.bpm:.1f} BPM   {dim('alt: ' + ', '.join(f'{c:.0f}' for c in r.bpm_candidates[1:]))}")
    out.append(f"  meter            {r.time_signature}  ({r.downbeats.size} bars)")
    out.append(f"  grid tightness   {_bar(r.tempo_stability)} {r.tempo_stability:.0%}")
    out.append(f"  swing            {_bar(r.swing)} {r.swing:.0%}")
    out.append(f"  onset density    {r.onset_rate:.1f}/s")
    out.append(f"  groove           {'; '.join(r.groove_notes)}")

    out.append(h("\n▸ TONALITY"))
    out.append(f"  key              {t.key} {t.mode}  ({t.key_confidence:.0%} confidence)")
    out.append(f"  alternates       {', '.join(k for k, _ in t.alternate_keys)}")
    out.append(f"  scale            {' '.join(t.scale_notes)}")
    if t.chord_progression:
        out.append(f"  progression      {' → '.join(t.chord_progression)}")
        out.append(f"  in roman         {' → '.join(t.roman_progression)}")
    out.append(f"  harmonic rate    {t.harmonic_rate:.1f} chords/min")
    for note in t.notes:
        out.append(dim(f"    · {note}"))

    out.append(h("\n▸ MELODY"))
    if m.notes:
        out.append(f"  notes found      {len(m.notes)}  ({m.notes_per_second:.1f}/s)")
        out.append(f"  range            {m.lowest} → {m.highest}  ({m.range_semitones} semitones)")
        out.append(f"  centre           {m.median_note}")
        out.append(f"  contour          {m.contour}")
        out.append(f"  first phrase     {' '.join(n.name for n in m.notes[:16])}")
    else:
        out.append("  no sustained lead line extracted")
    for d in m.descriptors:
        out.append(dim(f"    · {d}"))

    out.append(h("\n▸ SOUND & PRODUCTION"))
    out.append(f"  brightness       {tb.centroid_hz:.0f} Hz centroid, {tb.rolloff_hz:.0f} Hz rolloff")
    for name, value in tb.band_balance.items():
        out.append(f"    {name:<9}      {_bar(value * 3)} {value:.1%}")
    out.append(f"  crest factor     {tb.crest_db:.1f} dB")
    out.append(f"  dynamic range    {tb.dynamic_range_db:.1f} dB")
    out.append(f"  character        {'; '.join(tb.descriptors)}")
    for p in tb.production_notes:
        out.append(dim(f"    · {p}"))

    out.append(h("\n▸ INSTRUMENTATION"))
    for name, score in inst.hints[:8]:
        out.append(f"  {name:<32} {_bar(score, 16)} {score:.0%}")
    out.append(f"  vocals           {'likely present' if inst.likely_vocal else 'not detected'} ({inst.vocal_confidence:.0%})")
    out.append(f"  texture          {inst.texture}")

    out.append(h("\n▸ STRUCTURE"))
    peak = max((s.energy for s in st.sections), default=1.0) or 1.0
    for s in st.sections:
        out.append(f"  {s.start:6.1f}s  {s.label:<14} {_bar(s.energy / peak, 18)} {s.duration:5.1f}s")
    for note in st.notes:
        out.append(dim(f"    · {note}"))

    if analysis.stems:
        out.append(h("\n▸ STEMS"))
        out.append(dim(f"  backend: {analysis.stems.backend}"))
        loudest = max(analysis.stems.levels.values()) if analysis.stems.levels else 0.0
        for name, level in sorted(analysis.stems.levels.items(), key=lambda kv: kv[1], reverse=True):
            rel = 1.0 - min(1.0, max(0.0, (loudest - level) / 30.0))
            out.append(f"  {name:<16} {_bar(rel, 18)} {level:6.1f} dB")

    out.append(h("\n▸ STYLE MATCH"))
    for g in analysis.genres:
        out.append(f"  {g.name:<32} {_bar(g.confidence, 16)} {g.confidence:.0%}")
    out.append(f"  mood             {', '.join(analysis.moods)}")

    out.append(h("\n═══ SUNO PROMPT ═══"))
    out.append(h("\nStyle (short — paste into the Style box):"))
    out.append(f"  {prompt.style_short}")
    out.append(h("\nStyle (detailed):"))
    out.append(f"  {prompt.style_long}")
    out.append(h("\nExclude Styles:"))
    out.append(f"  {prompt.exclude}")
    out.append(h("\nStructure (Custom Mode lyrics box):"))
    for line in prompt.structure_block.splitlines():
        out.append(f"  {line}")
    out.append("")
    return "\n".join(out)


def render_markdown(analysis: Analysis, prompt: SunoPrompt) -> str:
    r, t, m, tb, st, inst = (
        analysis.rhythm, analysis.tonality, analysis.melody,
        analysis.timbre, analysis.structure, analysis.instrumentation,
    )
    dur = analysis.clip.duration
    lines = [
        f"# {analysis.clip.path.stem}",
        "",
        f"`{int(dur // 60)}:{int(dur % 60):02d}` · **{r.bpm:.0f} BPM** · **{t.key} {t.mode}** · {r.time_signature}",
        "",
        "## Suno prompt",
        "",
        "**Style**",
        "```",
        prompt.style_short,
        "```",
        "",
        "**Style (detailed)**",
        "```",
        prompt.style_long,
        "```",
        "",
        "**Exclude Styles**",
        "```",
        prompt.exclude,
        "```",
        "",
        "**Structure**",
        "```",
        prompt.structure_block,
        "```",
        "",
        "## Analysis",
        "",
        "| | |",
        "|---|---|",
        f"| Tempo | {r.bpm:.1f} BPM ({', '.join(f'{c:.0f}' for c in r.bpm_candidates)}) |",
        f"| Meter | {r.time_signature} |",
        f"| Grid tightness | {r.tempo_stability:.0%} |",
        f"| Swing | {r.swing:.0%} |",
        f"| Key | {t.key} {t.mode} ({t.key_confidence:.0%}) |",
        f"| Progression | {' → '.join(t.chord_progression) or '—'} |",
        f"| Roman | {' → '.join(t.roman_progression) or '—'} |",
        f"| Melodic range | {m.lowest} → {m.highest} ({m.range_semitones} st) |",
        f"| Contour | {m.contour} |",
        f"| Brightness | {tb.centroid_hz:.0f} Hz |",
        f"| Dynamic range | {tb.dynamic_range_db:.1f} dB |",
        f"| Texture | {inst.texture} |",
        f"| Vocals | {'likely' if inst.likely_vocal else 'not detected'} |",
        "",
        "### Instrumentation",
        "",
    ]
    lines += [f"- {name} — {score:.0%}" for name, score in inst.hints[:8]]
    lines += ["", "### Structure", "", "| Start | Section | Length | Energy |", "|---|---|---|---|"]
    peak = max((s.energy for s in st.sections), default=1.0) or 1.0
    for s in st.sections:
        lines.append(f"| {s.start:.1f}s | {s.label} | {s.duration:.1f}s | {s.energy / peak:.0%} |")
    lines += ["", "### Style match", ""]
    lines += [f"- {g.name} — {g.confidence:.0%}" for g in analysis.genres]
    lines += ["", f"Mood: {', '.join(analysis.moods)}", ""]
    return "\n".join(lines)


def write_outputs(
    analysis: Analysis,
    prompt: SunoPrompt,
    outdir: Path,
    write_midi_file: bool = True,
    save_stems: bool = False,
) -> dict[str, Path]:
    outdir.mkdir(parents=True, exist_ok=True)
    stem = analysis.clip.path.stem
    written: dict[str, Path] = {}

    payload = analysis.to_dict()
    payload["suno_prompt"] = prompt.to_dict()
    json_path = outdir / f"{stem}.analysis.json"
    json_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False))
    written["json"] = json_path

    md_path = outdir / f"{stem}.report.md"
    md_path.write_text(render_markdown(analysis, prompt))
    written["markdown"] = md_path

    prompt_path = outdir / f"{stem}.suno.txt"
    prompt_path.write_text(
        "=== STYLE ===\n"
        f"{prompt.style_short}\n\n"
        "=== STYLE (DETAILED) ===\n"
        f"{prompt.style_long}\n\n"
        "=== EXCLUDE STYLES ===\n"
        f"{prompt.exclude}\n\n"
        "=== STRUCTURE ===\n"
        f"{prompt.structure_block}\n"
    )
    written["prompt"] = prompt_path

    if save_stems and analysis.stems:
        import soundfile as sf

        stem_dir = outdir / f"{stem}.stems"
        stem_dir.mkdir(parents=True, exist_ok=True)
        for name, signal in analysis.stems.stems.items():
            path = stem_dir / f"{name}.wav"
            sf.write(path, signal, analysis.clip.sr)
            written[f"stem:{name}"] = path

    if write_midi_file and analysis.melody.notes:
        from .features.melody import write_midi

        midi_path = outdir / f"{stem}.melody.mid"
        write_midi(analysis.melody.notes, midi_path, bpm=analysis.rhythm.bpm)
        written["midi"] = midi_path

    return written
