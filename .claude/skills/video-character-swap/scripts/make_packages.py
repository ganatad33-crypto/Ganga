#!/usr/bin/env python3
"""Build one folder + ZIP per scene, ready for the user to upload to their tools.

Example:
  make_packages.py --video src.mp4 --out pkg --crop 480:356:0:248 \
      --scene 1:1.2:7.0 --scene 2:7.0:13.9 --scene 3:19.2:22.4:1.3

--scene N:START:END[:ZOOM]  ZOOM>1 crops toward the center to make small faces bigger
                            (use for medium shots; wide shots should be skipped instead).
--crop W:H:X:Y              picture area from analyze.sh (removes captions/letterbox).
Each folder gets: סצנה_N_תמונה.png, סצנה_N_סרטון.mp4, סצנה_N_אודיו.mp3,
and empty פרומפט_תמונה.txt / פרומפט_סרטון.txt for Claude to fill.
"""
import argparse, os, subprocess, zipfile


def run(cmd):
    subprocess.run(cmd, check=True)


ap = argparse.ArgumentParser()
ap.add_argument("--video")
ap.add_argument("--out", required=True)
ap.add_argument("--crop", default=None)
ap.add_argument("--scene", action="append", default=[])
ap.add_argument("--rezip", action="store_true", help="only rebuild the ZIPs (after filling the prompt files)")
ap.add_argument("--min-width", type=int, default=960, help="upscale small sources to at least this width")
a = ap.parse_args()
os.makedirs(a.out, exist_ok=True)

if a.rezip:
    folders = sorted(f for f in os.listdir(a.out) if os.path.isdir(os.path.join(a.out, f)))
    with zipfile.ZipFile(os.path.join(a.out, "כל_הסצנות.zip"), "w") as allz:
        for name in folders:
            d = os.path.join(a.out, name)
            with zipfile.ZipFile(os.path.join(a.out, f"{name}.zip"), "w") as zf:
                for f in sorted(os.listdir(d)):
                    zf.write(os.path.join(d, f), os.path.join(name, f))
                    allz.write(os.path.join(d, f), os.path.join(name, f))
    print("re-zipped:", ", ".join(folders))
    raise SystemExit
if not a.scene:
    ap.error("--scene is required")

all_zip = zipfile.ZipFile(os.path.join(a.out, "כל_הסצנות.zip"), "w")
for spec in a.scene:
    parts = spec.split(":")
    n, s, e = parts[0], float(parts[1]), float(parts[2])
    zoom = float(parts[3]) if len(parts) > 3 else 1.0
    name = f"סצנה_{n}"
    d = os.path.join(a.out, name)
    os.makedirs(d, exist_ok=True)

    vf = []
    if a.crop:
        vf.append(f"crop={a.crop}")
    if zoom > 1:
        vf.append(f"crop=trunc(iw/{zoom}/2)*2:trunc(ih/{zoom}/2)*2")
    # upscale to a usable size, keep aspect, even dims
    vf.append(f"scale='max({a.min_width},iw)':-2:flags=lanczos,setsar=1")
    vf = ",".join(vf)

    vid = os.path.join(d, f"{name}_סרטון.mp4")
    img = os.path.join(d, f"{name}_תמונה.png")
    aud = os.path.join(d, f"{name}_אודיו.mp3")
    # accurate seek: -ss after -i
    run(["ffmpeg", "-v", "error", "-y", "-i", a.video, "-ss", str(s), "-to", str(e), "-vf", vf,
         "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p",
         "-c:a", "aac", "-b:a", "192k", vid])
    run(["ffmpeg", "-v", "error", "-y", "-i", vid, "-frames:v", "1", img])
    run(["ffmpeg", "-v", "error", "-y", "-i", vid, "-vn", "-c:a", "libmp3lame", "-b:a", "192k", aud])
    for p in ("פרומפט_תמונה.txt", "פרומפט_סרטון.txt"):
        open(os.path.join(d, p), "a").close()

    z = os.path.join(a.out, f"{name}.zip")
    with zipfile.ZipFile(z, "w") as zf:
        for f in sorted(os.listdir(d)):
            zf.write(os.path.join(d, f), os.path.join(name, f))
            all_zip.write(os.path.join(d, f), os.path.join(name, f))
    dur = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", vid],
                         capture_output=True, text=True).stdout.strip()
    print(f"{name}: {s}-{e}s ({dur}s) zoom={zoom} -> {d}")
all_zip.close()
print(f"next: fill the prompt .txt files, then run: make_packages.py --rezip --out {a.out}")
