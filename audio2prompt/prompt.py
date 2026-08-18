"""Turn an Analysis into Suno-ready prompt fields."""

from __future__ import annotations

from dataclasses import dataclass

from .analyze import Analysis

# Suno's Style box is generous in v4.5+, but short prompts steer more reliably.
STYLE_SHORT_LIMIT = 200
STYLE_LONG_LIMIT = 1000

SECTION_TAGS = {
    "intro": "[Intro]",
    "verse": "[Verse]",
    "build/bridge": "[Bridge]",
    "build-up": "[Build]",
    "chorus/drop": "[Drop]",
    "breakdown": "[Breakdown]",
    "outro": "[Outro]",
    "main loop": "[Main]",
    "section": "[Section]",
}

BASE_EXCLUDES = [
    "lo-fi artifacts",
    "muddy mix",
    "off-key vocals",
    "abrupt ending",
]


@dataclass
class SunoPrompt:
    style_short: str
    style_long: str
    exclude: str
    structure_block: str
    negative_notes: list[str]
    summary: str

    def to_dict(self) -> dict:
        return {
            "style_short": self.style_short,
            "style_long": self.style_long,
            "exclude": self.exclude,
            "structure_block": self.structure_block,
            "summary": self.summary,
        }


def _trim(parts: list[str], limit: int) -> str:
    out: list[str] = []
    length = 0
    for p in parts:
        p = p.strip()
        if not p:
            continue
        extra = len(p) + (2 if out else 0)
        if length + extra > limit:
            continue
        out.append(p)
        length += extra
    return ", ".join(out)


def _tempo_word(bpm: float) -> str:
    if bpm < 75:
        return "slow"
    if bpm < 100:
        return "mid-tempo"
    if bpm < 128:
        return "upbeat"
    if bpm < 145:
        return "fast"
    return "very fast"


def build_prompt(analysis: Analysis, instrumental: bool = True, language: str | None = None) -> SunoPrompt:
    r, t, m, tb, st, inst = (
        analysis.rhythm,
        analysis.tonality,
        analysis.melody,
        analysis.timbre,
        analysis.structure,
        analysis.instrumentation,
    )
    primary = analysis.genres[0] if analysis.genres else None
    secondary = analysis.genres[1] if len(analysis.genres) > 1 else None

    genre_text = primary.name if primary else "genre-blended electronic"
    if secondary and secondary.confidence > 0.72 and primary and primary.confidence - secondary.confidence < 0.06:
        genre_text = f"{primary.name} with {secondary.name} influence"

    instruments = inst.top(6)
    mood_text = ", ".join(analysis.moods[:4])

    # ---- short style field -------------------------------------------------
    short_parts = [
        genre_text,
        mood_text,
        f"{int(round(r.bpm))} BPM",
        f"{t.key} {t.mode}",
        "instrumental" if instrumental else "with vocals",
    ]
    short_parts += instruments[:3]
    style_short = _trim(short_parts, STYLE_SHORT_LIMIT)

    # ---- long style field --------------------------------------------------
    long_parts = [
        genre_text,
        mood_text,
        f"{int(round(r.bpm))} BPM {_tempo_word(r.bpm)}",
        f"{r.time_signature}",
        f"key of {t.key} {t.mode}",
    ]
    if primary:
        long_parts += primary.tags[:3]
    long_parts += r.groove_notes[:2]
    long_parts += instruments
    if inst.notes:
        long_parts += inst.notes[:2]
    long_parts += tb.descriptors[:3]
    long_parts += tb.production_notes[:2]
    if m.descriptors:
        long_parts += m.descriptors[:2]
    long_parts.append(m.contour)
    if t.roman_progression:
        long_parts.append(f"chord movement {' - '.join(t.roman_progression[:4])}")
    long_parts += st.notes[:2]
    long_parts += t.notes[:2]
    long_parts.append(inst.texture)
    long_parts.append("instrumental, no vocals" if instrumental else "lead vocal present")
    if language and not instrumental:
        long_parts.append(f"{language} vocals")
    style_long = _trim(long_parts, STYLE_LONG_LIMIT)

    # ---- exclude field -----------------------------------------------------
    excludes = list(BASE_EXCLUDES)
    if instrumental:
        excludes = ["vocals", "lyrics", "spoken word", "choir"] + excludes
    if r.tempo_stability > 0.85:
        excludes.append("tempo drift")
    if tb.centroid_hz < 1800:
        excludes.append("harsh bright treble")
    else:
        excludes.append("muffled dull tone")
    if r.percussive_ratio < 0.3:
        excludes.append("heavy drums")
    if inst.hints and inst.hints[0][0] != "electric guitar" and "electric guitar" not in instruments:
        excludes.append("distorted guitars")
    if r.bpm < 110:
        excludes.append("double-time drum programming")
    if r.swing < 0.2 and (not primary or primary.name not in ("jazz", "lo-fi / chillhop", "hip hop / boom bap")):
        excludes.append("swing shuffle")
    exclude = ", ".join(dict.fromkeys([e for e in excludes if e]))

    # ---- structure block ---------------------------------------------------
    lines: list[str] = []
    if instrumental:
        lines.append("[Instrumental]")
    for s in st.sections:
        tag = SECTION_TAGS.get(s.label, "[Section]")
        lines.append(f"{tag}  ({s.duration:.0f}s) — energy {s.energy / max(1e-9, max(x.energy for x in st.sections)):.0%}")
    lines.append("[End]")
    structure_block = "\n".join(lines)

    summary = (
        f"{genre_text}, {int(round(r.bpm))} BPM, {t.key} {t.mode}, {r.time_signature}, "
        f"{analysis.clip.duration / 60:.1f} min, {inst.texture}."
    )

    negatives = [e for e in excludes if e]

    return SunoPrompt(
        style_short=style_short,
        style_long=style_long,
        exclude=exclude,
        structure_block=structure_block,
        negative_notes=negatives,
        summary=summary,
    )
