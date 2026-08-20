import argparse
import json
import sys

from . import audio_features, prompt_builder, stems


def main(argv=None):
    parser = argparse.ArgumentParser(
        prog="song2prompt",
        description="מנתח קובץ אודיו (BPM, סולם, מבנה אנרגיה, טקסטורה) וכותב טיוטת פרומפט ל-Suno.",
    )
    parser.add_argument("audio_path", help="נתיב לקובץ אודיו (mp3/wav/flac וכו')")
    parser.add_argument(
        "--window", type=float, default=6.0, help="גודל חלון בשניות לחלוקת ציר האנרגיה (ברירת מחדל: 6)"
    )
    parser.add_argument(
        "--stems", action="store_true",
        help="הרץ הפרדת שכבות (Demucs) לזיהוי נוכחות ווקאל/תופים/בס/שאר. דורש: pip install demucs torch",
    )
    parser.add_argument("--json", metavar="PATH", help="שמור גם את הנתונים הגולמיים כ-JSON לנתיב הזה")
    args = parser.parse_args(argv)

    analysis = audio_features.analyze(args.audio_path, window_seconds=args.window)

    stem_presence = None
    if args.stems:
        if not stems.stems_available():
            print(
                "אזהרה: --stems התבקש אבל demucs לא מותקן. הרץ: pip install demucs torch\n"
                "ממשיך בלי ניתוח שכבות.",
                file=sys.stderr,
            )
        else:
            stem_presence = stems.analyze_stems(args.audio_path)

    report = prompt_builder.build_report(analysis, stem_presence=stem_presence)
    print(report)

    if args.json:
        payload = dict(analysis)
        if stem_presence:
            payload["stem_presence"] = stem_presence
        with open(args.json, "w", encoding="utf-8") as f:
            json.dump(payload, f, ensure_ascii=False, indent=2)
        print(f"\n(נתונים גולמיים נשמרו ל-{args.json})", file=sys.stderr)


if __name__ == "__main__":
    main()
