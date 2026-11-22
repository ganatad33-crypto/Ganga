"""Replace burned-in captions that sit on a solid dark band (e.g. translate them to Hebrew).

Two steps:
  python3 resub.py detect video.mp4 captions.json     # finds the lines, their timing and the word highlight
  (edit captions.json: fill in "text" for every line)
  python3 resub.py render video.mp4 captions.json out.mp4

Works when the captions are light text on a dark band outside the picture, optionally with a
coloured box that jumps from word to word. Right-to-left text is handled automatically.
"""
import argparse, json, os, subprocess, cv2, numpy as np

def frames_of(path):
    cap = cv2.VideoCapture(path); fps = cap.get(5)
    while True:
        ok, fr = cap.read()
        if not ok: break
        yield fps, fr

def find_band(path):
    """Rows that are dark most of the time but carry bright text at some point."""
    mx = None; dark = None; n = 0
    for i, (fps, fr) in enumerate(frames_of(path)):
        if i % 5: continue
        g = fr.max(axis=2)
        mx = g if mx is None else np.maximum(mx, g)
        d = (np.percentile(g, 10, axis=1) < 25).astype(np.float32)   # the band's edges stay black even under text
        dark = d if dark is None else dark + d; n += 1
    rows = np.where(((mx > 200).sum(1) > 5) & (dark / n > 0.95))[0]
    if not len(rows): raise SystemExit('No caption band found; pass --band Y0 Y1')
    # largest contiguous run
    runs = np.split(rows, np.where(np.diff(rows) > 3)[0] + 1); r = max(runs, key=len)
    return int(max(0, r[0] - 18)), int(r[-1] + 18)

def detect(a):
    y0, y1 = a.band or find_band(a.video)
    per = []; hl_px = []
    for fps, fr in frames_of(a.video):
        b = fr[y0:y1]; hsv = cv2.cvtColor(b, cv2.COLOR_BGR2HSV)
        col = (hsv[..., 1] > 120) & (hsv[..., 2] > 150)
        cx = np.where(col.sum(0) > 3)[0]; wx = np.where((b.min(axis=2) > 200).sum(0) > 0)[0]
        hi = [int(cx.min()), int(cx.max())] if len(cx) > 10 else None
        if hi and len(hl_px) < 4000: hl_px.extend(b[col][::7].tolist())
        per.append(([int(wx.min()), int(wx.max())] if len(wx) > 20 else None, hi))
    # box rows and colour of the highlight
    box = None; rgb = [255, 44, 78]
    if hl_px:
        m = np.median(np.array(hl_px), axis=0); rgb = [int(m[2]), int(m[1]), int(m[0])]
    # split into lines wherever the text extent changes
    lines = []; cur = None
    for n, (tx, hi) in enumerate(per):
        same = cur is not None and tx is not None and cur['x'] is not None and abs(tx[0]-cur['x'][0]) < 2 and abs(tx[1]-cur['x'][1]) < 2
        if not same:
            if cur and cur['x'] is not None: cur['e'] = n; lines.append(cur)
            cur = {'s': n, 'x': tx, 'hs': []} if tx is not None else None
        if cur and hi: cur['hs'].append((n, hi[0]))
    if cur and cur['x'] is not None: cur['e'] = len(per); lines.append(cur)
    lines = [l for l in lines if l['e'] - l['s'] >= 2]
    # read each line's text once, on a frame without the highlight when possible
    from rapidocr import RapidOCR
    ocr = RapidOCR(); cap = cv2.VideoCapture(a.video); out = []; frame_line = [-1]*len(per); frame_hi = [-1]*len(per)
    for i, l in enumerate(lines):
        plain = [n for n in range(l['s'], l['e']) if per[n][1] is None] or [l['s']]
        cap.set(1, plain[len(plain)//2]); ok, fr = cap.read()
        r = ocr(cv2.resize(fr[y0:y1], None, fx=2, fy=2)); src = ''
        if r.txts: src = ' '.join(t for _, t in sorted(zip([bx[0][0] for bx in r.boxes], r.txts)))
        starts = sorted(x for _, x in l['hs']); groups = []
        counts = []
        for x in starts:
            if not groups or x - groups[-1] > 25: groups.append(x); counts.append(1)
            else: counts[-1] += 1
        if any(k >= 2 for k in counts):   # a position seen on one frame only is the box mid-animation
            groups = [g for g, k in zip(groups, counts) if k >= 2]
        for n in range(l['s'], l['e']): frame_line[n] = i
        for n, x in l['hs']: frame_hi[n] = min(range(len(groups)), key=lambda j: abs(groups[j]-x))
        out.append({'start': round(l['s']/fps, 2), 'end': round(l['e']/fps, 2), 'source': src, 'source_words': max(len(groups), 1), 'text': ''})
    # vertical extent of the highlight box
    ys = []
    for n, (tx, hi) in enumerate(per):
        if hi and len(ys) < 5:
            cap.set(1, n); ok, fr = cap.read(); hsv = cv2.cvtColor(fr[y0:y1], cv2.COLOR_BGR2HSV)
            r = np.where(((hsv[..., 1] > 120) & (hsv[..., 2] > 150)).sum(1) > 3)[0]
            if len(r): ys.append((r.min(), r.max()))
    if ys: box = [int(np.median([y[0] for y in ys])) + y0, int(np.median([y[1] for y in ys])) + y0]
    json.dump({'fps': fps, 'band': [y0, y1], 'box': box, 'highlight_rgb': rgb, 'lines': out, 'frame_line': frame_line, 'frame_highlight': frame_hi},
              open(a.captions, 'w'), ensure_ascii=False, indent=1)
    print(f'{len(out)} lines -> {a.captions}')
    for l in out: print(f"  {l['start']:6.2f}  {l['source']}")

def render(a):
    from PIL import Image, ImageDraw, ImageFont, features
    c = json.load(open(a.captions)); y0, y1 = c['band']; pink = tuple(c['highlight_rgb'])
    box = c['box'] or [y0 + 12, y1 - 12]; cy = (box[0] + box[1]) / 2 - y0
    cap = cv2.VideoCapture(a.video); W = int(cap.get(3)); H = int(cap.get(4)); fps = c['fps']
    size = a.size or int((box[1] - box[0]) * 0.73)
    def load(sz):
        f = ImageFont.truetype(a.font, sz)
        try: f.set_variation_by_axes([a.weight])
        except Exception: pass
        return f
    def is_rtl(s): return any('֐' <= ch <= 'ࣿ' for ch in s)
    raqm = features.check('raqm')
    def kw(w): return {'direction': 'rtl', 'language': 'he'} if (raqm and is_rtl(w)) else {}
    cache = {}
    def draw(i, hi):
        words = [w.replace('_', ' ') for w in c['lines'][i]['text'].split()]
        img = Image.new('RGB', (W, y1 - y0), (0, 0, 0)); d = ImageDraw.Draw(img)
        if not words: return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
        sz = size
        while True:   # shrink until the line fits
            font = load(sz); ws = [d.textlength(w, font=font, **kw(w)) for w in words]; gap = sz // 3
            total = sum(ws) + gap * (len(words) - 1)
            if total <= W - 60 or sz <= 20: break
            sz -= 3
        rtl = is_rtl(''.join(words)); x = W/2 + total/2 if rtl else W/2 - total/2
        for k, (w, wl) in enumerate(zip(words, ws)):
            x0 = x - wl if rtl else x
            if k == hi:
                d.rounded_rectangle([x0 - 13, box[0] - y0, x0 + wl + 13, box[1] - y0], radius=16, fill=pink)
                d.text((x0 + wl/2, cy), w, font=font, fill=(255, 255, 255), anchor='mm', stroke_width=5, stroke_fill=(0, 0, 0), **kw(w))
            else:
                d.text((x0 + wl/2, cy), w, font=font, fill=(255, 255, 255), anchor='mm', **kw(w))
            x = x0 - gap if rtl else x0 + wl + gap
        return cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-', '-i', a.video,
                           '-map', '0:v', '-map', '1:a?', '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', '-c:a', 'copy', '-shortest', a.out], stdin=subprocess.PIPE)
    n = 0
    while True:
        ok, fr = cap.read()
        if not ok: break
        i = c['frame_line'][n] if n < len(c['frame_line']) else -1
        if i < 0: fr[y0:y1] = 0
        else:
            words = c['lines'][i]['text'].split(); e = c['frame_highlight'][n]; hi = None
            if e >= 0 and words: hi = min(len(words) - 1, int(e * len(words) / c['lines'][i]['source_words']))
            if (i, hi) not in cache: cache[(i, hi)] = draw(i, hi)
            fr[y0:y1] = cache[(i, hi)]
        ff.stdin.write(fr.tobytes()); n += 1
    ff.stdin.close(); ff.wait(); print(f'done: {n} frames -> {a.out}')

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter); sub = ap.add_subparsers(dest='cmd', required=True)
    d = sub.add_parser('detect'); d.add_argument('video'); d.add_argument('captions'); d.add_argument('--band', type=int, nargs=2, metavar=('Y0', 'Y1'))
    r = sub.add_parser('render'); r.add_argument('video'); r.add_argument('captions'); r.add_argument('out')
    r.add_argument('--font', default=os.path.join(here, 'Heebo.ttf')); r.add_argument('--weight', type=int, default=900); r.add_argument('--size', type=int)
    a = ap.parse_args(); (detect if a.cmd == 'detect' else render)(a)
