"""Add comedy animations to a finished reel: emoji pops, floating laugh emojis, zoom punches, shakes.

  python3 add_fx.py in.mp4 fx.json out.mp4

fx.json: {"area": [x0, y0, x1, y1],        the picture area inside the frame (zoom / shake / stickers stay in it)
          "float_top": 870,                 floating emojis rise from the bottom up to this y (keep it below the captions)
          "seed": 7,                        change it for a different random result
          "events": [{"t": 7.8, "type": "pop", "emoji": "1f644"},     emoji is optional: random if missing
                     {"t": 13.6, "type": "sticker", "image": "woman.png", "side": "left", "dur": 1.7},   transparent PNG
                     {"t": 35.2, "type": "punch"}, {"t": 20.9, "type": "shake"},
                     {"t0": 55.6, "t1": 59.0, "type": "laugh", "count": 14}]}
Times are seconds in the input video. Emoji images are Noto Emoji PNGs in ./emoji (hex code names).
"""
import json, math, os, random, subprocess, sys
import cv2, numpy as np

def main():
    src, cfg, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
    here = os.path.dirname(os.path.abspath(__file__)); edir = cfg.get('emoji_dir', os.path.join(here, 'emoji'))
    rnd = random.Random(cfg.get('seed', 7)); em = {}
    for f in os.listdir(edir):
        if f.endswith('.png'): em[f[:-4]] = cv2.imread(os.path.join(edir, f), cv2.IMREAD_UNCHANGED)
    POP = [k for k in ['1f480', '1f62d', '1f525', '1f92f', '1f440', '1f644', '1f62c', '1f921', '1f631', '1f624'] if k in em]
    LAUGH = [k for k in ['1f602', '1f923', '1f602', '1f923', '1f480', '1f62d', '1f44f'] if k in em]
    cap = cv2.VideoCapture(src); fps = cap.get(5); W = int(cap.get(3)); H = int(cap.get(4))
    ax0, ay0, ax1, ay1 = cfg.get('area', [0, 0, W, H]); ftop = cfg.get('float_top', int(H * 0.58))   # floating emojis stop here
    pops = []; punches = []; shakes = []; floats = []; stickers = []; side = 1
    for e in cfg['events']:
        if e['type'] == 'pop':
            side = -side   # alternate left / right of the picture, random height
            x = rnd.uniform(0.12, 0.28) if side < 0 else rnd.uniform(0.72, 0.88)
            pops.append({'t': e['t'], 'e': e.get('emoji') or rnd.choice(POP), 'x': ax0 + x * (ax1 - ax0), 'y': ay0 + rnd.uniform(0.22, 0.6) * (ay1 - ay0),
                         'size': e.get('size', int(W * rnd.uniform(0.17, 0.23))), 'rot': rnd.uniform(-18, 18), 'dur': e.get('dur', 1.15)})
        elif e['type'] == 'sticker':   # a cut-out picture that springs in from the side, shakes with rage and leaves
            im = cv2.imread(e['image'], cv2.IMREAD_UNCHANGED); h = e.get('height', int((ay1 - ay0) * 0.62)); w = int(im.shape[1] * h / im.shape[0])
            stickers.append({'t': e['t'], 'dur': e.get('dur', 1.7), 'img': cv2.resize(im, (w, h), interpolation=cv2.INTER_AREA), 'side': e.get('side') or rnd.choice(['left', 'right']),
                             'y': e.get('y', ay1 - h // 2 - 4), 'tilt': rnd.uniform(4, 9)})
        elif e['type'] == 'punch': punches.append(e['t'])
        elif e['type'] == 'shake': shakes.append(e['t'])
        elif e['type'] == 'laugh':
            for _ in range(e.get('count', max(4, int((e['t1'] - e['t0']) * 4)))):
                floats.append({'t': rnd.uniform(e['t0'], max(e['t0'], e['t1'] - 0.6)), 'e': rnd.choice(LAUGH), 'x': rnd.uniform(0.06, 0.94) * W,
                               'size': int(W * rnd.uniform(0.09, 0.16)), 'sway': rnd.uniform(8, 26), 'ph': rnd.uniform(0, 6.28), 'spd': rnd.uniform(0.75, 1.25), 'rot': rnd.uniform(-25, 25)})
    def paste_img(fr, s, cx, cy, rot, scale):
        h, w = s.shape[:2]; d = int(math.hypot(w, h) * max(scale, 0.01)) + 4
        M = cv2.getRotationMatrix2D((w / 2, h / 2), rot, scale); M[0, 2] += d / 2 - w / 2; M[1, 2] += d / 2 - h / 2
        r = cv2.warpAffine(s, M, (d, d), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        x0 = int(cx - d / 2); y0 = int(cy - d / 2); X0, Y0 = max(x0, ax0), max(y0, ay0); X1, Y1 = min(x0 + d, ax1), min(y0 + d, ay1)   # clipped to the picture area
        if X1 <= X0 or Y1 <= Y0: return
        p = r[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]; a = p[..., 3:4].astype(np.float32) / 255
        fr[Y0:Y1, X0:X1] = fr[Y0:Y1, X0:X1] * (1 - a) + p[..., :3] * a
    def paste(fr, img, cx, cy, size, rot, alpha):
        if size < 4 or alpha <= 0: return
        s = cv2.resize(img, (size, size), interpolation=cv2.INTER_AREA)
        if rot: s = cv2.warpAffine(s, cv2.getRotationMatrix2D((size / 2, size / 2), rot, 1), (size, size), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        x0 = int(cx - size / 2); y0 = int(cy - size / 2); X0, Y0 = max(x0, 0), max(y0, 0); X1, Y1 = min(x0 + size, W), min(y0 + size, H)
        if X1 <= X0 or Y1 <= Y0: return
        p = s[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]; a = p[..., 3:4].astype(np.float32) / 255 * alpha
        fr[Y0:Y1, X0:X1] = fr[Y0:Y1, X0:X1] * (1 - a) + p[..., :3] * a
    tmp = out + '.video.mp4'
    ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
                           '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', tmp], stdin=subprocess.PIPE)
    n = 0
    while True:
        ok, fr = cap.read()
        if not ok: break
        t = n / fps; fr = fr.astype(np.float32)
        # zoom punch and shake act on the picture area only, so title and captions stay still
        z = 1.0; dx = dy = 0
        for p in punches:
            u = t - p
            if 0 <= u < 0.45: z = max(z, 1 + 0.11 * math.exp(-u * 7))
        for s in shakes:
            u = t - s
            if 0 <= u < 0.4: k = 9 * math.exp(-u * 6); dx += k * math.sin(u * 80); dy += k * math.cos(u * 67)
        if z > 1.001 or dx or dy:
            a = fr[ay0:ay1, ax0:ax1]; h, w = a.shape[:2]
            M = np.float32([[z, 0, (1 - z) * w / 2 + dx], [0, z, (1 - z) * h / 2 + dy]])
            fr[ay0:ay1, ax0:ax1] = cv2.warpAffine(a, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
        for f in floats:   # rise from the bottom, sway, fade out
            u = (t - f['t']) * f['spd']
            if 0 <= u < 2.2:
                y = H + f['size'] - u / 2.2 * (H - ftop + f['size'] / 2); x = f['x'] + f['sway'] * math.sin(u * 4 + f['ph'])
                paste(fr, em[f['e']], x, y, f['size'], f['rot'] * math.sin(u * 3 + f['ph']), min(1, u * 6) * min(1, (2.2 - u) * 2))
        for k in stickers:
            u = t - k['t']
            if 0 <= u < k['dur']:
                w = k['img'].shape[1]; sgn = -1 if k['side'] == 'left' else 1
                rest = (ax0 + w * 0.5 + 6) if sgn < 0 else (ax1 - w * 0.5 - 6); off = rest + sgn * (w + 20)
                if u < 0.45:   # spring in with overshoot
                    q = u / 0.45; ease = 1 - math.exp(-6 * q) * math.cos(11 * q); x = off + (rest - off) * ease
                elif u > k['dur'] - 0.25: q = (k['dur'] - u) / 0.25; x = off + (rest - off) * q * q
                else: x = rest
                rage = 1 if 0.45 <= u <= k['dur'] - 0.25 else 0
                x += rage * 3.5 * math.sin(u * 95); rot = -sgn * k['tilt'] + rage * 2.2 * math.sin(u * 70); sc = 1 + rage * 0.035 * math.sin(u * 18)
                paste_img(fr, k['img'], x, k['y'], rot, sc)
                if rage and '1f4a2' in em:   # pulsing anger mark above the head
                    pulse = 1 + 0.25 * math.sin(u * 16); paste(fr, em['1f4a2'], x - sgn * w * 0.28, k['y'] - k['img'].shape[0] * 0.42, int(W * 0.1 * pulse), 12 * math.sin(u * 9), 1)
        for p in pops:     # bounce in, wobble, shrink out
            u = t - p['t']
            if 0 <= u < p['dur']:
                if u < 0.22: sc = 1.25 * (u / 0.22) ** 0.6
                elif u < 0.36: sc = 1.25 - 0.25 * (u - 0.22) / 0.14
                elif u > p['dur'] - 0.18: sc = max(0, (p['dur'] - u) / 0.18)
                else: sc = 1 + 0.04 * math.sin(u * 14)
                paste(fr, em[p['e']], p['x'], p['y'], int(p['size'] * sc), p['rot'] + 6 * math.sin(u * 11), 1)
        ff.stdin.write(np.clip(fr, 0, 255).astype(np.uint8).tobytes()); n += 1
    ff.stdin.close(); ff.wait()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', tmp, '-i', src, '-map', '0:v', '-map', '1:a?', '-c', 'copy', '-shortest', out], check=True)
    os.remove(tmp); print(f'done: {n} frames, {len(stickers)} stickers, {len(pops)} pops, {len(floats)} floating, {len(punches)} punches, {len(shakes)} shakes -> {out}')

if __name__ == '__main__': main()
