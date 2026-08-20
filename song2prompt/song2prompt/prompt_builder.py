def _groove_descriptor(texture):
    perc = texture["percussive_ratio"]
    if perc > 0.6:
        return "percussion-forward, punchy rhythmic groove"
    if perc < 0.3:
        return "smooth, harmony-forward groove, understated percussion"
    return "balanced groove, steady rhythmic pulse"


def _bass_descriptor(texture):
    if texture["sub_bass_ratio"] > 0.03:
        return "deep rolling sub bass"
    if texture["bass_ratio"] > 0.05:
        return "warm mid-bass presence"
    return "light bass, not sub-heavy"


def _texture_descriptor(texture):
    words = []
    if texture["brightness_hz"] > 3000:
        words.append("bright, airy top end")
    elif texture["brightness_hz"] < 1500:
        words.append("dark, warm texture")
    else:
        words.append("balanced tonal texture")
    if texture["dynamic_range_db"] > 18:
        words.append("wide dynamic range, strong builds")
    else:
        words.append("compressed, consistently energetic")
    return ", ".join(words)


def build_style_line(analysis):
    genre_guess = analysis["genre_family_guess"][0] if analysis["genre_family_guess"] else "electronic"
    texture = analysis["texture"]
    parts = [
        genre_guess,
        f"{analysis['bpm']} BPM",
        _groove_descriptor(texture),
        _bass_descriptor(texture),
        _texture_descriptor(texture),
    ]
    return ", ".join(parts)


def build_exclude_line(analysis):
    excludes = ["festival EDM, big room drop, generic supersaw lead"]
    if analysis["texture"]["percussive_ratio"] < 0.3:
        excludes.append("no aggressive drums")
    if "minor" not in analysis["key"]:
        excludes.append("no dark horror-movie minor-key cliches")
    return ", ".join(excludes)


def build_structure_block(analysis):
    lines = []
    for seg in analysis["structure"]:
        tag = seg["suggested_label"].split(" (")[0].split(" / ")[0].strip()
        lines.append(f"[{tag}] {seg['start']:.0f}s–{seg['end']:.0f}s ({seg['tier']} energy)")
    return "\n".join(lines)


def build_report(analysis, stem_presence=None):
    style_line = build_style_line(analysis)
    exclude_line = build_exclude_line(analysis)
    structure_block = build_structure_block(analysis)
    texture = analysis["texture"]

    lines = []
    lines.append("# ניתוח השיר")
    lines.append("")
    lines.append("## 1. עובדות מדודות (לא ניחוש)")
    lines.append(f"- קובץ: {analysis['path']}")
    lines.append(f"- אורך: {analysis['duration_sec']:.1f} שניות")
    lines.append(f"- BPM: {analysis['bpm']}")
    lines.append(f"- סולם משוער: {analysis['key']} (רמת ביטחון: {analysis['key_confidence']})")
    lines.append(
        f"- יחס פרקוסיבי/הרמוני: {texture['percussive_ratio']} "
        f"(0=הרמוני לחלוטין, 1=פרקוסיבי לחלוטין)"
    )
    lines.append(f"- בהירות ספקטרלית ממוצעת: {texture['brightness_hz']} Hz")
    lines.append(f"- נוכחות סאב-בס: {texture['sub_bass_ratio']}")
    lines.append(f"- טווח דינמי: {texture['dynamic_range_db']} dB")
    lines.append("")

    if stem_presence:
        lines.append("## 2. נוכחות שכבות (Demucs stems)")
        for name, info in stem_presence.items():
            lines.append(f"- {name}: {info['level']} (יחס אנרגיה {info['energy_ratio']})")
        lines.append("")

    lines.append("## 3. ציר זמן אנרגיה (משוער)")
    lines.append(
        "החלוקה למקטעים ולתוויות (Intro/Build/Drop/Breakdown/Outro) היא היוריסטיקה "
        "המבוססת על עקומת אנרגיה בלבד — לא זיהוי הרמוני אמיתי של פזמון/בית. "
        "תיאום ידני מומלץ."
    )
    for seg in analysis["structure"]:
        lines.append(
            f"- {seg['start']:.0f}s–{seg['end']:.0f}s: {seg['suggested_label']} "
            f"(אנרגיה יחסית: {seg['tier']})"
        )
    lines.append("")

    lines.append("## 4. טיוטת פרומפט ל-Suno")
    lines.append(
        "**חשוב:** תת-הז'אנר למטה הוא ניחוש גס לפי BPM וטקסטורה בלבד, לא זיהוי אמיתי. "
        "לפני שימוש בפועל — קח את השורות האלה ותן אותן לקלוד עם הסקיל `suno-electronic` "
        "כדי לחדד תת-ז'אנר מדויק, תגית הבדלה מהשכן הקרוב, וניסוח גרוב נכון."
    )
    lines.append("")
    lines.append("### Style (טיוטה)")
    lines.append(style_line)
    lines.append("")
    lines.append("### Exclude (טיוטה)")
    lines.append(exclude_line)
    lines.append("")
    lines.append("### Structure (טיוטה, להעתקה לשדה המילים)")
    lines.append(structure_block)
    lines.append("")

    lines.append("## 5. משפחות ז'אנר אפשריות לפי BPM")
    for g in analysis["genre_family_guess"]:
        lines.append(f"- {g}")

    return "\n".join(lines)
