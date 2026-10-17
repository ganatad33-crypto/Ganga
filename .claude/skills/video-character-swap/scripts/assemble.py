#!/usr/bin/env python3
"""Join the user's generated clips into one video, synced to the ORIGINAL audio.

Example:
  assemble.py --source src.mp4 --out joined.mp4 \
      --clip done1.mp4:1.2:7.0 --clip done2.mp4:7.0:13.9 --clip ORIG:19.2:22.4

--clip PATH:ORIG_START:ORIG_END
    PATH      a generated clip (only its first ORIG_END-ORIG_START seconds are used –
              tools usually pad to 10s), or ORIG to reuse the source itself.
    times     where this scene sits in the source; that audio range is laid under it.
--source-crop W:H:X:Y   picture area of the source (for ORIG clips; removes captions).
--size WxH  output size (default 1080x810, 4:3). Every clip is cleaned of black bars
            (detected per clip) and cover-cropped to this size, so mixed 16:9/4:3 outputs match.
"""
import argparse, subprocess, json, os, tempfile
import numpy as np


def probe(p):
    j = json.loads(subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
                                   "stream=width,height:format=duration", "-of", "json", p],
                                  capture_output=True, text=True).stdout)
    return j["streams"][0]["width"], j["streams"][0]["height"], float(j["format"]["duration"])


def active_area(p, t_max):
    """Black-bar-free area, taken as the intersection over several frames."""
    W, H, _ = probe(p)
    boxes = []
    for t in np.linspace(0.2, max(0.2, t_max - 0.2), 5):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", p, "-frames:v", "1",
                              "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
        if len(raw) < W * H:
            continue
        a = np.frombuffer(raw[:W * H], np.uint8).reshape(H, W).astype(float)
        rows = np.where(a.mean(1) > 18)[0]; cols = np.where(a.mean(0) > 18)[0]
        if len(rows) and len(cols):
            boxes.append((cols[0], rows[0], cols[-1], rows[-1]))
    if not boxes:
        return f"{W}:{H}:0:0"
    x0 = max(b[0] for b in boxes); y0 = max(b[1] for b in boxes)
    x1 = min(b[2] for b in boxes); y1 = min(b[3] for b in boxes)
    w = (x1 - x0 + 1) // 2 * 2; h = (y1 - y0 + 1) // 2 * 2
    return f"{w}:{h}:{x0}:{y0}"


ap = argparse.ArgumentParser()
ap.add_argument("--source", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--clip", action="append", required=True)
ap.add_argument("--source-crop", default=None)
ap.add_argument("--size", default="1080x810")
ap.add_argument("--fps", type=int, default=30)
a = ap.parse_args()
OW, OH = map(int, a.size.split("x"))
tmp = tempfile.mkdtemp()
pieces, audio_parts = [], []

for k, spec in enumerate(a.clip):
    path, s, e = spec.rsplit(":", 2)
    s, e = float(s), float(e); length = e - s
    nframes = round(length * a.fps)
    if path == "ORIG":
        src, ss = a.source, s
        crop = a.source_crop or active_area(a.source, probe(a.source)[2])
    else:
        src, ss = path, 0.0
        crop = active_area(path, min(length, probe(path)[2]))
    vf = (f"fps={a.fps},crop={crop},scale={OW}:{OH}:force_original_aspect_ratio=increase,"
          f"crop={OW}:{OH},setsar=1,trim=end_frame={nframes},setpts=PTS-STARTPTS")
    out = os.path.join(tmp, f"p{k:02d}.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(ss), "-i", src, "-vf", vf, "-an",
                    "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", out], check=True)
    pieces.append(out); audio_parts.append((s, e))
    print(f"clip {k + 1}: {os.path.basename(path)} crop={crop} -> {length:.2f}s ({nframes} frames)")

lst = os.path.join(tmp, "list.txt")
with open(lst, "w") as f:
    f.writelines(f"file '{p}'\n" for p in pieces)
video_only = os.path.join(tmp, "v.mp4")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", lst, "-c", "copy", video_only], check=True)

# original audio for each scene range, short fades against clicks
fc, labels = [], []
for k, (s, e) in enumerate(audio_parts):
    fc.append(f"[1:a]atrim={s}:{e},asetpts=PTS-STARTPTS,afade=t=in:d=0.03,afade=t=out:st={max(0, e - s - 0.04):.3f}:d=0.04[a{k}]")
    labels.append(f"[a{k}]")
fc.append(f"{''.join(labels)}concat=n={len(labels)}:v=0:a=1[a]")
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video_only, "-i", a.source, "-filter_complex", ";".join(fc),
                "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-shortest",
                "-movflags", "+faststart", a.out], check=True)
print("done:", a.out, probe(a.out)[2], "s")
