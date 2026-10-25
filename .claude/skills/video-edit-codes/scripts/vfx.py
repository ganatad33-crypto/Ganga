#!/usr/bin/env python3
"""Five video-editing effects built on ffmpeg.

Usage:
  vfx.py grade        IN OUT [--preset cinematic|warm|cool|noir] [--letterbox]
  vfx.py beatcuts     OUT --clips A.mp4 [B.mp4 ...] [--music song.mp3] [--every 1]
  vfx.py beforeafter  IN OUT [--after OTHER.mp4 | --preset cinematic] [--mode split|side|wipe]
  vfx.py handdrawn    IN OUT [--fps 12] [--color]
  vfx.py motion       IN OUT [--title TEXT] [--subtitle TEXT] [--cut 2.5]
"""
import argparse
import json
import os
import shutil
import subprocess
import sys

import numpy as np

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf",
    "C:/Windows/Fonts/arialbd.ttf",
]


def font():
    for f in FONT_CANDIDATES:
        if os.path.exists(f):
            return f
    sys.exit("No bold font found. Edit FONT_CANDIDATES in vfx.py.")


def esc(text):
    """Escape text for drawtext's text= option."""
    return text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\u2019").replace("%", "\\%")


def run(args):
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", *args]
    print("+", " ".join(cmd[:12]), "...", file=sys.stderr)
    subprocess.run(cmd, check=True)


def probe(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries",
         "format=duration:stream=codec_type,width,height,r_frame_rate",
         "-of", "json", path],
        check=True, capture_output=True, text=True).stdout
    data = json.loads(out)
    v = next(s for s in data["streams"] if s["codec_type"] == "video")
    num, den = v["r_frame_rate"].split("/")
    return {
        "duration": float(data["format"]["duration"]),
        "w": int(v["width"]), "h": int(v["height"]),
        "fps": float(num) / float(den or 1),
        "audio": any(s["codec_type"] == "audio" for s in data["streams"]),
    }


ENC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p",
       "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart"]

# ---------------------------------------------------------------- 1. Color Grade
GRADES = {
    # teal shadows, orange highlights, a bit of contrast: the "Hollywood" look
    "cinematic": "eq=contrast=1.10:saturation=1.12:gamma=0.97,"
                 "colorbalance=rs=-0.06:gs=-0.01:bs=0.09:rm=0.02:bm=-0.02:rh=0.08:gh=0.02:bh=-0.07,"
                 "curves=all='0/0.03 0.25/0.21 0.5/0.5 0.75/0.79 1/0.97'",
    "warm": "eq=contrast=1.06:saturation=1.18:gamma=0.98,"
            "colorbalance=rs=0.05:bs=-0.04:rm=0.05:bm=-0.04:rh=0.06:bh=-0.05",
    "cool": "eq=contrast=1.08:saturation=0.95,"
            "colorbalance=rs=-0.05:bs=0.07:rm=-0.03:bm=0.05:rh=-0.02:bh=0.04",
    "noir": "hue=s=0,eq=contrast=1.35:brightness=-0.02,"
            "curves=all='0/0 0.3/0.2 0.7/0.8 1/1',noise=alls=6:allf=t",
}


def grade_filter(preset, letterbox=False):
    f = GRADES[preset] + ",vignette=angle=PI/5"
    if letterbox:  # 2.39:1 black bars
        f += ",drawbox=x=0:y=0:w=iw:h=(ih-iw/2.39)/2:color=black:t=fill" \
             ",drawbox=x=0:y=ih-(ih-iw/2.39)/2:w=iw:h=(ih-iw/2.39)/2:color=black:t=fill"
    return f


def cmd_grade(a):
    info = probe(a.input)
    if a.letterbox and info["h"] >= info["w"] / 2.39 * 1.05 and info["h"] > info["w"]:
        print("letterbox skipped: the video is vertical, bars would cover most of it", file=sys.stderr)
        a.letterbox = False
    run(["-i", a.input, "-vf", grade_filter(a.preset, a.letterbox), "-map", "0:v", "-map", "0:a?", *ENC, a.output])

# ---------------------------------------------------------------- 2. Beat Synced Cuts


def detect_beats(audio_path, sr=22050):
    """Return beat times (seconds) using spectral-flux onsets + tempo grid."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", audio_path, "-vn", "-ac", "1", "-ar", str(sr),
         "-f", "f32le", "-"], check=True, capture_output=True).stdout
    y = np.frombuffer(raw, dtype=np.float32)
    if len(y) < sr:
        sys.exit("Audio is too short to find beats.")
    hop, n = 512, 2048
    frames = 1 + (len(y) - n) // hop
    win = np.hanning(n).astype(np.float32)
    idx = np.arange(n)[None, :] + hop * np.arange(frames)[:, None]
    spec = np.abs(np.fft.rfft(y[idx] * win, axis=1))
    spec = np.log1p(spec * 10)
    flux = np.maximum(0, np.diff(spec, axis=0)).sum(axis=1)
    flux = np.concatenate([[0], flux])
    flux = (flux - flux.mean()) / (flux.std() + 1e-9)
    fps = sr / hop

    # tempo by autocorrelation in the 70-180 BPM range
    ac = np.correlate(flux, flux, mode="full")[len(flux) - 1:]
    lo, hi = int(fps * 60 / 180), int(fps * 60 / 70)
    period = lo + int(np.argmax(ac[lo:hi]))

    # choose the phase that lands on the strongest onsets, then walk the grid,
    # snapping each beat to the local onset peak
    phase = int(np.argmax([flux[p::period].sum() for p in range(period)]))
    beats, t = [], phase
    r = max(1, period // 6)
    while t < len(flux):
        a0, a1 = max(0, t - r), min(len(flux), t + r + 1)
        t = a0 + int(np.argmax(flux[a0:a1]))
        beats.append(t / fps)
        t += period
    bpm = 60 * fps / period
    return np.array(beats), bpm


def cmd_beatcuts(a):
    clips = [probe(c) | {"path": c} for c in a.clips]
    music = a.music or a.clips[0]
    beats, bpm = detect_beats(music)
    beats = beats[:: a.every]
    print(f"tempo ~{bpm:.0f} BPM, {len(beats)} cuts", file=sys.stderr)
    w, h = clips[0]["w"], clips[0]["h"]
    fps = clips[0]["fps"]

    # walk through the clips in order, one beat-length piece at a time
    segs, cursor, ci = [], [0.0] * len(clips), 0
    for b0, b1 in zip(beats[:-1], beats[1:]):
        length = b1 - b0
        for _ in range(len(clips)):
            c = clips[ci]
            if cursor[ci] + length <= c["duration"]:
                break
            cursor[ci] = 0.0  # loop the clip if it ran out
            ci = (ci + 1) % len(clips)
        segs.append((ci, cursor[ci], length))
        cursor[ci] += length
        if len(clips) > 1:
            ci = (ci + 1) % len(clips)
    if a.max_seconds:
        total, keep = 0.0, []
        for s in segs:
            if total + s[2] > a.max_seconds:
                break
            keep.append(s)
            total += s[2]
        segs = keep

    inputs = []
    for c in clips:
        inputs += ["-i", c["path"]]
    inputs += ["-ss", f"{beats[0]:.3f}", "-i", music]
    parts, labels = [], []
    for k, (ci, start, length) in enumerate(segs):
        flash = ",eq=brightness=0.25:enable='lt(t,0.06)'" if a.flash else ""
        parts.append(
            f"[{ci}:v]trim=start={start:.3f}:duration={length:.3f},setpts=PTS-STARTPTS,"
            f"scale={w}:{h}:force_original_aspect_ratio=increase,crop={w}:{h},fps={fps},setsar=1{flash}[s{k}]")
        labels.append(f"[s{k}]")
    parts.append("".join(labels) + f"concat=n={len(segs)}:v=1:a=0[v]")
    total = sum(s[2] for s in segs)
    run([*inputs, "-filter_complex", ";".join(parts), "-map", "[v]", "-map", f"{len(clips)}:a",
         "-t", f"{total:.3f}", *ENC, a.output])

# ---------------------------------------------------------------- 3. Before And After


def cmd_beforeafter(a):
    info = probe(a.input)
    w, h = info["w"] - info["w"] % 2, info["h"] - info["h"] % 2
    f = font()
    fs = max(18, min(w, h) // 16)
    lab = (f"drawtext=fontfile={f}:text='{esc(a.before_label)}':fontsize={fs}:fontcolor=white"
           f":box=1:boxcolor=black@0.55:boxborderw=12:x=24:y=24")
    lab2 = (f"drawtext=fontfile={f}:text='{esc(a.after_label)}':fontsize={fs}:fontcolor=white"
            f":box=1:boxcolor=black@0.55:boxborderw=12:x=w-tw-24:y=24")
    if a.after:
        inputs = ["-i", a.input, "-i", a.after]
        pre = (f"[0:v]scale={w}:{h},setsar=1,format=yuv444p[b];"
               f"[1:v]scale={w}:{h},setsar=1,format=yuv444p[g];")
    else:
        inputs = ["-i", a.input]
        pre = (f"[0:v]scale={w}:{h},setsar=1,format=yuv444p,split[b][g0];"
               f"[g0]{grade_filter(a.preset)}[g];")

    if a.mode == "side":
        # both full frames at half size, placed next to each other (portrait) or
        # one above the other (landscape), padded back to the original size
        if h >= w:
            stack, size = "hstack", f"{w // 2 - w // 2 % 2}:-2"
        else:
            stack, size = "vstack", f"-2:{h // 2 - h // 2 % 2}"
        g = (pre + f"[b]scale={size}[b2];[g]scale={size}[g2];"
             f"[b2][g2]{stack}=inputs=2,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2:color=black,"
             f"{lab},{lab2},format=yuv420p[v]")
    else:
        if a.mode == "wipe":  # divider sweeps back and forth
            pos = "(0.5+0.42*sin(2*PI*T/6))"
            line_x = "iw*(0.5+0.42*sin(2*PI*t/6))-3"
        else:
            pos, line_x = "0.5", "iw/2-3"
        g = (pre + f"[b][g]blend=all_expr='if(lte(X,W*{pos}),A,B)',"
             f"drawbox=x='{line_x}':y=0:w=6:h=ih:color=white:t=fill,{lab},{lab2},format=yuv420p[v]")
    run([*inputs, "-filter_complex", g, "-map", "[v]", "-map", "0:a?", *ENC, a.output])

# ---------------------------------------------------------------- 4. Hand Drawn


def cmd_handdrawn(a):
    info = probe(a.input)
    w, h = info["w"] - info["w"] % 2, info["h"] - info["h"] % 2
    # dark ink lines on light paper, with optional flat "marker" colors underneath.
    # The edges become the alpha of a black "ink" layer laid over the fill, which
    # keeps the fill's colors intact. format=yuv444p before split matters: edgedetect
    # wants gray, and without it ffmpeg turns *both* split branches gray.
    # fps drop + a few pixels of random jitter per frame gives the hand-made "boil".
    lines = "format=gray,edgedetect=low=0.08:high=0.22:mode=wires"
    if a.color:
        # flatten into a few brightness steps on a light "paper" range, keep chroma
        # centred on neutral (128) so whites stay white, then push saturation
        fill = ("boxblur=4:2,"
                "lutyuv=y='clip(120+floor(val/40)*28,0,248)'"
                ":u='clip(128+round((val-128)*1.9/16)*16,16,240)'"
                ":v='clip(128+round((val-128)*1.9/16)*16,16,240)',"
                "format=yuv444p")
    else:
        fill = "hue=s=0,lutyuv=y='if(gt(val,150),245,225)',format=yuv444p"
    j = 4
    g = (f"[0:v]fps={a.fps},scale={w}:{h},setsar=1,format=yuv444p,split[a][b];"
         f"[a]{lines}[m];[b]{fill}[c];"
         f"color=c=0x1a1a1a:s={w}x{h}:r={a.fps}[k];[k][m]alphamerge[ink];"
         f"[c][ink]overlay=shortest=1:format=yuv444,"
         f"noise=alls=7:allf=t+u,"
         f"pad=iw+{2*j}:ih+{2*j}:{j}:{j}:color=0xf4efe4,"
         f"crop={w}:{h}:'{j}+{j}*(2*random(1)-1)':'{j}+{j}*(2*random(2)-1)',"
         f"format=yuv420p[v]")
    run(["-i", a.input, "-filter_complex", g, "-map", "[v]", "-map", "0:a?", "-r", str(int(info["fps"])), *ENC, a.output])

# ---------------------------------------------------------------- 5. Motion Graphics Showreel

TRANSITIONS = ["slideleft", "circleopen", "wipeup", "smoothright", "radial", "zoomin", "diagtl", "pixelize"]


def cmd_motion(a):
    info = probe(a.input)
    w, h = info["w"] - info["w"] % 2, info["h"] - info["h"] % 2
    dur, fps = info["duration"], round(info["fps"])
    td = 0.35  # transition length
    n = max(2, int(dur // a.cut))
    seg = dur / n
    f = font()
    big, small = max(28, w // 9), max(18, w // 20)
    accent = a.accent

    parts = []
    for k in range(n):
        s = k * seg
        # each segment gets a punch-in zoom that settles, plus a colored bar sliding across
        z = 1.12 if k % 2 == 0 else 1.06
        parts.append(
            f"[0:v]trim=start={s:.3f}:duration={seg + (td if k < n - 1 else 0):.3f},setpts=PTS-STARTPTS,"
            f"scale={w}:{h},setsar=1,fps={fps},"
            f"scale=w='{w}*{z}':h=-2:eval=init,crop={w}:{h},"
            f"drawbox=x='-iw+min(iw*1.6,iw*3.2*t)':y=ih*{0.78 if k % 2 else 0.12}:w=iw*0.45:h=ih*0.012:color={accent}:t=fill,"
            f"drawbox=x='iw-min(iw*1.3,iw*2.6*t)':y=ih*{0.82 if k % 2 else 0.16}:w=iw*0.25:h=ih*0.012:color=white:t=fill,"
            f"format=yuv420p[s{k}]")
    # chain the segments with rotating transitions. Each segment carries td extra
    # seconds of overlap, so transition k starts at k*seg and the output stays
    # on the original timeline (the audio stays in sync).
    prev = "[s0]"
    for k in range(1, n):
        out = f"[x{k}]"
        parts.append(f"{prev}[s{k}]xfade=transition={TRANSITIONS[(k - 1) % len(TRANSITIONS)]}"
                     f":duration={td}:offset={k * seg:.3f}{out}")
        prev = out

    # kinetic title: slides in from the left, holds, slides out
    txt = []
    if a.title:
        txt.append(
            f"drawtext=fontfile={f}:text='{esc(a.title)}':fontsize={big}:fontcolor=white:borderw=4:bordercolor=black@0.6"
            f":x='if(lt(t,0.5),-tw+(w/2+tw/2)*t/0.5,if(lt(t,2.6),(w-tw)/2,(w-tw)/2+(t-2.6)*w*2.5))'"
            f":y=h*0.40:enable='lt(t,3.2)'")
        txt.append(f"drawbox=x='(iw-iw*0.7*min(1,t/0.4))/2':y=ih*0.40+{big}+14:w='iw*0.7*min(1,t/0.4)':h=8:color={accent}:t=fill:enable='between(t,0.2,2.6)'")
    if a.subtitle:
        txt.append(
            f"drawtext=fontfile={f}:text='{esc(a.subtitle)}':fontsize={small}:fontcolor=white:box=1:boxcolor={accent}@0.9:boxborderw=14"
            f":x=(w-tw)/2:y=h*0.40+{big}+40:alpha='min(1,max(0,(t-0.5)*3))*if(gt(t,2.6),max(0,1-(t-2.6)*3),1)':enable='lt(t,3.2)'")
    final = prev
    if txt:
        parts.append(f"{prev}{','.join(txt)}[v]")
        final = "[v]"
    run(["-i", a.input, "-filter_complex", ";".join(parts), "-map", final, "-map", "0:a?",
         "-t", f"{dur:.3f}", *ENC, a.output])


def main():
    if not shutil.which("ffmpeg"):
        sys.exit("ffmpeg is not installed.")
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = p.add_subparsers(dest="cmd", required=True)

    s = sp.add_parser("grade", help="Color Grade")
    s.add_argument("input"); s.add_argument("output")
    s.add_argument("--preset", choices=GRADES, default="cinematic")
    s.add_argument("--letterbox", action="store_true", help="add 2.39:1 black bars")
    s.set_defaults(fn=cmd_grade)

    s = sp.add_parser("beatcuts", help="Beat Synced Cuts")
    s.add_argument("output")
    s.add_argument("--clips", nargs="+", required=True)
    s.add_argument("--music", help="song to cut to (default: audio of the first clip)")
    s.add_argument("--every", type=int, default=1, help="cut every N beats (2 = calmer)")
    s.add_argument("--max-seconds", type=float)
    s.add_argument("--flash", action="store_true", help="tiny white flash on each cut")
    s.set_defaults(fn=cmd_beatcuts)

    s = sp.add_parser("beforeafter", help="Before And After split screen")
    s.add_argument("input"); s.add_argument("output")
    s.add_argument("--after", help="edited version; if omitted, --preset grade is applied")
    s.add_argument("--preset", choices=GRADES, default="cinematic")
    s.add_argument("--mode", choices=["split", "side", "wipe"], default="split")
    s.add_argument("--before-label", default="BEFORE")
    s.add_argument("--after-label", default="AFTER")
    s.set_defaults(fn=cmd_beforeafter)

    s = sp.add_parser("handdrawn", help="Hand Drawn animation look")
    s.add_argument("input"); s.add_argument("output")
    s.add_argument("--fps", type=int, default=12)
    s.add_argument("--color", action="store_true", help="flat marker colors instead of pencil-only")
    s.set_defaults(fn=cmd_handdrawn)

    s = sp.add_parser("motion", help="Motion Graphics Showreel")
    s.add_argument("input"); s.add_argument("output")
    s.add_argument("--title"); s.add_argument("--subtitle")
    s.add_argument("--cut", type=float, default=2.5, help="seconds between transitions")
    s.add_argument("--accent", default="0xFFD400")
    s.set_defaults(fn=cmd_motion)

    a = p.parse_args()
    a.fn(a)
    print(a.output if hasattr(a, "output") else "")


if __name__ == "__main__":
    main()
