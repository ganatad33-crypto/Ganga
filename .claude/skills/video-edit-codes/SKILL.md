---
name: video-edit-codes
description: חמשת "קודי העריכה" לווידאו — Color Grade, Beat Synced Cuts, Before And After, Hand Drawn, Motion Graphics Showreel — מבוצעים בפועל על קובץ וידאו עם ffmpeg. השתמש בסקיל הזה כשהמשתמש שולח סרטון ומבקש אחד מהם בשם (גם בכתיב חלקי או בעברית: "קולור גרייד", "צבעוניות קולנועית", "חיתוך על הביט", "לפני ואחרי", "מסך מפוצל", "שיראה מצויר", "אנימציה מצוירת", "מושן גרפיקס", "שואוריל", "מעברים וטיפוגרפיה"), או מבקש "לערוך כמו עורך מקצועי". Use for any request to apply a cinematic color grade, cut clips to the beat of a song, make a before/after split screen, turn footage into a hand-drawn/sketch look, or build a fast motion-graphics showreel with transitions and kinetic titles.
---

# Video Edit Codes

Five editing looks, one script: `scripts/vfx.py`. Everything runs locally on ffmpeg (needs `ffmpeg` with libfreetype/fribidi/harfbuzz for Hebrew titles, and Python with numpy). No API keys.

```bash
V=.claude/skills/video-edit-codes/scripts/vfx.py
python3 $V <code> ...      # run with -h on any code for all options
```

## The five codes

| Code | Command | What it does |
|---|---|---|
| **Color Grade** | `grade IN OUT --preset cinematic` | Teal shadows / orange highlights, contrast curve, vignette. Presets: `cinematic` `warm` `cool` `noir`. `--letterbox` adds 2.39:1 bars (landscape only; skipped on vertical video). |
| **Beat Synced Cuts** | `beatcuts OUT --clips A.mp4 B.mp4 --music song.mp3` | Finds the song's tempo and beats, then cuts the clips so every cut lands on a beat, over the song. `--every 2` = calmer, `--flash` = white flash on each cut, `--max-seconds 30`. Without `--music` it cuts to the first clip's own audio. |
| **Before And After** | `beforeafter IN OUT --mode split` | Split screen with a white divider and labels. If no `--after FILE` is given, "after" is IN with the `--preset` grade. Modes: `split` (half/half), `side` (two full frames stacked), `wipe` (divider sweeps back and forth). Labels: `--before-label לפני --after-label אחרי`. |
| **Hand Drawn** | `handdrawn IN OUT --color` | Ink lines on paper, 12 fps stop-motion "boil" (frame jitter + paper grain). `--color` adds flat marker colors; without it it's pencil only. `--fps 8` = choppier. |
| **Motion Graphics Showreel** | `motion IN OUT --title "..." --subtitle "..."` | Chops the video every `--cut` seconds, rotating transitions (slide, circle, wipe, radial, zoom, pixelize), punch-in zoom per shot, sliding accent bars, kinetic title that slides in and out. `--accent 0xFF3366` changes the color. Audio stays in sync. |

Codes stack: e.g. `grade` then `motion` on the graded file, or `handdrawn` then `beforeafter --after hand.mp4` to show the transformation.

## Workflow

1. Probe the input first (`ffprobe`) — note duration, size, whether it has audio.
2. For long videos, test on a 10-second slice (`ffmpeg -i IN -t 10 -c copy test.mp4`) before the full render; `handdrawn` and `motion` are the slow ones.
3. Pull 1–3 frames from the output (`ffmpeg -ss 3 -i OUT -frames:v 1 f.png`) and look at them before handing the file over. Check: colors not tinted, text readable and not cut off, Hebrew reads right-to-left.
4. Put outputs in the scratchpad and send them to the user with SendUserFile.

## Limits (say these plainly to the user when relevant)

- **Hand Drawn** is a filter look (edge lines + flat colors + jitter), not real frame-by-frame AI rotoscoping. Works best on well-lit footage with clear outlines; busy or dark backgrounds get noisy.
- **Beat detection** is a simple onset/tempo tracker. Clear drums → accurate; ambient or rubato music → cuts may drift. Try `--every 2` or a different song section.
- **Motion** titles use DejaVu Sans Bold (has Hebrew). For a different font, edit `FONT_CANDIDATES` in the script.
- Output is H.264 MP4, CRF 18, original resolution and aspect ratio.
