"""Grade the objective assertions by pattern-matching the answers."""
import json, re, sys
from pathlib import Path

CHECKS = {
    "full-request-hebrew": [
        ("Reports the tempo as 86 BPM", lambda t: bool(re.search(r"\b8[5-7](\.\d)?\s*BPM", t, re.I))),
        ("Reports the key as F# minor", lambda t: bool(re.search(r"F#\s*(minor|מינור)", t, re.I))),
        ("Reports the F#m - D - A - E progression", lambda t: all(x in t for x in ("F#m", "D", "A", "E"))
            and bool(re.search(r"i\s*[–\-→]\s*VI\s*[–\-→]\s*III\s*[–\-→]\s*VII", t))),
        ("Notes the shuffled/swung groove", lambda t: bool(re.search(r"swing|swung|סווינג|shuffle", t, re.I))),
        ("Gives a paste-ready Suno Style field", lambda t: "Style" in t and "```" in t),
        ("Main Style field is under 300 chars", lambda t: (
            len(re.findall(r"```\n(.*?)\n```", t, re.S)[0]) < 300 if re.findall(r"```\n(.*?)\n```", t, re.S) else False)),
        ("Gives an Exclude Styles field", lambda t: bool(re.search(r"Exclude", t, re.I))),
        ("Exclude field excludes vocals", lambda t: bool(re.search(r"vocals", t, re.I))),
        ("Gives a structure block with section tags", lambda t: bool(re.search(r"\[(Intro|Instrumental|Breakdown|Outro|Verse|Drop|Build)", t))),
        # Ground truth: fixture 2 is synthesised from sine harmonics, a kick and
        # a snare. There is no guitar and no brass in it. The tool's heuristic
        # hints them anyway (64% / 61%), and band_balance contradicts both
        # (2% mid, 1% high-mid) — so putting them in the prompt is a real error
        # that steers Suno toward instruments the source never had.
        ("Keeps hallucinated guitar/brass hints out of the Style field",
         lambda t: not any(re.search(r"guitar|brass|horns", b, re.I)
                           for b in re.findall(r"```\n(.*?)\n```", t, re.S)[:2])),
        ("Answers in Hebrew", lambda t: len(re.findall(r"[֐-׿]", t)) > 200),
    ],
    "key-and-bpm-question": [
        ("Reports the tempo as 120 BPM", lambda t: bool(re.search(r"\b1(19|20|21)(\.\d)?\b", t))),
        ("Reports the key as A minor", lambda t: bool(re.search(r"(A\s*minor|לה\s*מינור)", t, re.I))),
        ("Names the chords Am, F, C and G", lambda t: all(re.search(rf"\b{c}", t) for c in ("Am", "F", "C", "G"))),
        # An *offer* to build a prompt is fine; what we are checking is that the
        # answer did not actually dump prompt fields that were never asked for.
        ("Stays on the question, no full Suno prompt dump",
         lambda t: not any(re.search(r"Exclude|BPM.*key of|instrumental, no vocals", b, re.I)
                           for b in re.findall(r"```\n(.*?)\n```", t, re.S))),
        ("Answers in Hebrew", lambda t: len(re.findall(r"[֐-׿]", t)) > 200),
    ],
}

for name, checks in CHECKS.items():
    for run in ("with_skill", "without_skill"):
        answer = Path(name) / run / "outputs" / "answer.md"
        if not answer.exists():
            continue
        text = answer.read_text()
        expectations = []
        for label, fn in checks:
            try:
                passed = bool(fn(text))
            except Exception:
                passed = False
            expectations.append({"text": label, "passed": passed, "evidence": "pattern match over the answer text"})
        out = {"expectations": expectations,
               "pass_rate": sum(e["passed"] for e in expectations) / len(expectations)}
        (Path(name) / run / "grading.json").write_text(json.dumps(out, indent=2, ensure_ascii=False))
        print(f"{name:26} {run:15} {out['pass_rate']:.0%}  "
              f"({sum(e['passed'] for e in expectations)}/{len(expectations)})")
        for e in expectations:
            if not e["passed"]:
                print(f"    FAIL: {e['text']}")
