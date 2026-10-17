"""Picture-area and transition detection. Called by analyze.sh.

Picture area: rows/cols whose mean brightness > 20 across sampled frames,
so letterbox bars and black caption bands are excluded. Caption text sits
on black bands, so we take the longest contiguous bright run.

Transitions: difference between each frame and the frame 0.5s earlier.
Hard cuts AND soft dissolves both show up as peaks, which a plain
scene-detect filter misses for dissolves.
"""
import subprocess, sys, json
import numpy as np

v = sys.argv[1]
info = json.loads(subprocess.run(
    ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
     "stream=width,height:format=duration", "-of", "json", v],
    capture_output=True, text=True).stdout)
W, H = info["streams"][0]["width"], info["streams"][0]["height"]
dur = float(info["format"]["duration"])


def longest_run(mask):
    best, start = (0, -1), None
    for i, m in enumerate(list(mask) + [False]):
        if m and start is None:
            start = i
        elif not m and start is not None:
            if i - start > best[1] - best[0] + 1:
                best = (start, i - 1)
            start = None
    return best


# --- picture area, per sample time (segments may differ!)
print("picture area per sample (x,y,w,h):")
areas = []
for t in np.linspace(0.3, max(0.3, dur - 0.3), 12):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", v, "-frames:v", "1",
                          "-f", "rawvideo", "-pix_fmt", "gray", "-"], capture_output=True).stdout
    if len(raw) < W * H:
        continue
    a = np.frombuffer(raw[:W * H], np.uint8).reshape(H, W).astype(float)
    r0, r1 = longest_run(a.mean(1) > 20)
    c0, c1 = longest_run(a.mean(0) > 20)
    w, h = (c1 - c0 + 1) // 2 * 2, (r1 - r0 + 1) // 2 * 2
    areas.append((t, c0, r0, w, h))
    print(f"  t={t:5.1f}s  crop={w}:{h}:{c0}:{r0}")
if areas:
    w = min(a[3] for a in areas); h = min(a[4] for a in areas)
    x = max(a[1] for a in areas); y = max(a[2] for a in areas)
    print(f"safe crop for whole video: {w}:{h}:{x}:{y}  (if samples differ, segments have different letterbox – handle per segment)")

# --- transitions (measured only inside the picture area, so static caption
# bands don't dilute the signal)
fps = 30
cw, ch, cx, cy = (w, h, x, y) if areas else (W, H, 0, 0)
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", v, "-vf",
                      f"fps={fps},crop={cw}:{ch}:{cx}:{cy},scale=64:48,format=gray",
                      "-f", "rawvideo", "-"], capture_output=True).stdout
d = np.frombuffer(raw, np.uint8).reshape(-1, 48, 64).astype(float)
lag = fps // 2
win = np.array([np.abs(d[i] - d[max(0, i - lag)]).mean() for i in range(len(d))])   # catches dissolves
step = np.array([0.0] + [np.abs(d[i] - d[i - 1]).mean() for i in range(1, len(d))])  # pinpoints hard cuts
step_thr = max(20.0, np.median(step) * 8)
thr = max(15.0, np.median(win) * 4)
min_gap = int(0.5 * fps)
# hard cuts: big jump between two consecutive frames
cuts = []
for i in np.argsort(-step):
    if step[i] <= step_thr:
        break
    if not (5 <= i < len(d) - 5):
        continue
    # a real cut changes the content for good; a dropped/duplicated frame or a jolt
    # does not: compare a few frames after vs a few frames before, against normal motion
    across = np.abs(d[i + 2] - d[i - 3]).mean()
    motion = max(min(np.abs(d[i - 3] - d[i - 5]).mean(), np.abs(d[i + 4] - d[i + 2]).mean()), 1.0)
    if across < max(step_thr, 4 * motion):
        continue
    if all(abs(i - j) > min_gap for j in cuts):
        cuts.append(int(i))
# dissolves: big change over 0.5s with no hard cut nearby
diss = []
for i in np.argsort(-win):
    if win[i] <= thr:
        break
    if all(abs(i - j) > lag + 3 for j in cuts) and all(abs(i - j) > int(0.8 * fps) for j in diss):
        diss.append(int(i))
events = [(c / fps, "cut", "") for c in cuts] + \
         [((i - lag / 2) / fps, "dissolve", f"[{(i - lag) / fps:.2f} – {i / fps:.2f}]") for i in diss]
print("transitions: time  type")
for t, kind, extra in sorted(events):
    print(f"  {t:6.2f}s  {kind} {extra}")
if not events:
    print("  none – single continuous shot")
print("note: fast camera moves can also show up here – confirm on the contact sheets.")
