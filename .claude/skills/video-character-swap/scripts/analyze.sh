#!/usr/bin/env bash
# שימוש: analyze.sh <video> <outdir>
# מוציא: מידע טכני, אזור תמונה (בלי פסים/כתוביות), נקודות מעבר (חדות ורכות),
# עוצמת שמע לשנייה, וגיליונות פריימים עם חותמת זמן (sheet_XX.jpg).
set -euo pipefail
V="$1"; O="$2"; mkdir -p "$O"
HERE="$(cd "$(dirname "$0")" && pwd)"

echo "== info"
ffprobe -v error -show_entries format=duration:stream=codec_type,width,height,r_frame_rate,sample_rate -of compact "$V"

echo "== picture area + transitions"
python3 -I "$HERE/_analyze.py" "$V"

echo "== audio RMS per second (dB, <-45 = silence)"
SR=$(ffprobe -v error -select_streams a:0 -show_entries stream=sample_rate -of csv=p=0 "$V" || true)
if [ -n "$SR" ]; then
  ffmpeg -hide_banner -i "$V" -af "asetnsamples=$SR,astats=metadata=1:reset=1,ametadata=print:key=lavfi.astats.Overall.RMS_level" -f null - 2>&1 \
    | grep -o "RMS_level=[-0-9.a-z]*" | awk -F= '{printf "%d:%s ", NR-1, int($2)} END{print ""}'
else echo "no audio"; fi

echo "== contact sheets (2 fps, 18 frames each)"
ffmpeg -v error -y -i "$V" -vf "fps=2,scale=220:-2,drawtext=text='%{pts\:hms}':x=3:y=3:fontsize=14:fontcolor=yellow:box=1:boxcolor=black,tile=6x3" "$O/sheet_%02d.jpg"
ls "$O"/sheet_*.jpg
