"""Cut a short reel out of a longer video and burn in word-highlight captions.

  python3 make_reel.py video.mp4 plan.json out.mp4

plan.json (all times are seconds in the ORIGINAL video, all positions are pixels):
{
  "segments": [[125.5, 134.9], [153.0, 166.0]],          parts to keep, in order
  "captions": [[125.64, 126.3, "אבל יש דבר אחד"], ...],   start, end, text
  "caption_y": 790,                                       vertical centre of the captions
  "caption_size": 54,                                     optional
  "highlight_rgb": [255, 62, 165],                        optional, box behind the current word
  "title": {                                              optional: covers an existing title
    "box": [48, 196, 532, 328], "rgb": [53, 149, 241],
    "lines": ["אף פעם לא תצליח", "לשמח אישה"], "size": 44,
    "emoji_from": [128, 408, 262, 462, 314]               optional: time, x0, y0, x1, y1 of an
  }                                                       emoji in the source to re-use
}
In caption text, words are separated by spaces; "_" keeps two words in one highlight step.
The highlight moves evenly through the words of a caption between its start and end.
"""
import json, os, subprocess, sys
import cv2, numpy as np
from PIL import Image, ImageDraw, ImageFont, features

def main():
    video, plan, out = sys.argv[1], json.load(open(sys.argv[2])), sys.argv[3]
    font_path = plan.get('font') or os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'subtitles', 'Heebo.ttf')
    seg = plan['segments']; caps = plan.get('captions', []); pink = tuple(plan.get('highlight_rgb', [255, 62, 165]))
    cap = cv2.VideoCapture(video); fps = cap.get(5); W = int(cap.get(3)); H = int(cap.get(4))
    yc = plan.get('caption_y', int(H * 0.77)); base = plan.get('caption_size', int(W * 0.094))
    raqm = features.check('raqm')
    def rtl(s): return any('֐' <= ch <= 'ࣿ' for ch in s)
    def kw(s): return {'direction': 'rtl', 'language': 'he'} if (raqm and rtl(s)) else {}
    def font(sz, weight):
        f = ImageFont.truetype(font_path, sz)
        try: f.set_variation_by_axes([weight])
        except Exception: pass
        return f
    # title overlay, built once
    TA = TC = None; t = plan.get('title')
    if t:
        img = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(img); tf = font(t.get('size', 44), 700)
        x0, y0, x1, y1 = t['box']; d.rounded_rectangle([x0, y0, x1, y1], radius=14, fill=tuple(t.get('rgb', [53, 149, 241])) + (255,))
        n = len(t['lines']); step = (y1 - y0) / n; em = None
        if t.get('emoji_from'):
            et, ex0, ey0, ex1, ey1 = t['emoji_from']; cap.set(1, int(et * fps)); ok, ref = cap.read()
            em = Image.fromarray(cv2.cvtColor(ref[ey0:ey1, ex0:ex1], cv2.COLOR_BGR2RGB))
        for i, line in enumerate(t['lines']):
            cy = y0 + step * (i + 0.5); wl = d.textlength(line, font=tf, **kw(line))
            if em is not None and i == n - 1:
                tot = wl + 10 + em.width; right = W / 2 + tot / 2
                if rtl(line): d.text((right - wl / 2, cy), line, font=tf, fill='white', anchor='mm', **kw(line)); img.paste(em, (int(right - tot), int(cy - em.height / 2)))
                else: d.text((right - tot + wl / 2, cy), line, font=tf, fill='white', anchor='mm'); img.paste(em, (int(right - em.width), int(cy - em.height / 2)))
            else: d.text(((x0 + x1) / 2, cy), line, font=tf, fill='white', anchor='mm', **kw(line))
        a = np.array(img); TA = a[..., 3:4] / 255.0; TC = a[..., :3][..., ::-1]
    cache = {}; half = int(base * 1.3)
    def cap_img(text, hi):
        if (text, hi) in cache: return cache[(text, hi)]
        words = [w.replace('_', ' ') for w in text.split()]; img = Image.new('RGBA', (W, 2 * half), (0, 0, 0, 0)); d = ImageDraw.Draw(img); sz = base
        while True:
            f = font(sz, 900); ws = [d.textlength(w, font=f, **kw(w)) for w in words]; gap = sz // 3; tot = sum(ws) + gap * (len(words) - 1)
            if tot <= W - 50 or sz <= 24: break
            sz -= 2
        r = rtl(text); x = W / 2 + tot / 2 if r else W / 2 - tot / 2
        for k, (w, wl) in enumerate(zip(words, ws)):
            x0 = x - wl if r else x
            if k == hi: d.rounded_rectangle([x0 - 11, half - sz * 0.68, x0 + wl + 11, half + sz * 0.68], radius=14, fill=pink + (255,))
            d.text((x0 + wl / 2, half), w, font=f, fill='white', anchor='mm', stroke_width=5, stroke_fill=(0, 0, 0), **kw(w))
            x = x0 - gap if r else x0 + wl + gap
        a = np.array(img); cache[(text, hi)] = (a[..., 3:4] / 255.0, a[..., :3][..., ::-1]); return cache[(text, hi)]
    tmp = out + '.video.mp4'
    ff = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(fps), '-i', '-',
                           '-c:v', 'libx264', '-crf', '17', '-pix_fmt', 'yuv420p', tmp], stdin=subprocess.PIPE)
    total = 0
    for s, e in seg:
        n0, n1 = int(round(s * fps)), int(round(e * fps)); cap.set(1, n0)
        for n in range(n0, n1):
            ok, fr = cap.read()
            if not ok: break
            tt = n / fps; fr = fr.astype(np.float32)
            if TA is not None: fr = fr * (1 - TA) + TC * TA
            for i, (a, b, txt) in enumerate(caps):
                nxt = caps[i + 1][0] if i + 1 < len(caps) else 1e9
                if a <= tt < min(b + 0.35, nxt) and s <= a < e:
                    k = len(txt.split()); hi = min(k - 1, int((tt - a) / max(b - a, 0.01) * k)) if tt < b else k - 1
                    al, cl = cap_img(txt, hi); fr[yc - half:yc + half] = fr[yc - half:yc + half] * (1 - al) + cl * al; break
            ff.stdin.write(np.clip(fr, 0, 255).astype(np.uint8).tobytes()); total += 1
    ff.stdin.close(); ff.wait()
    parts = []; lab = ''   # audio: same cuts with tiny fades at the joins
    for i, (s, e) in enumerate(seg):
        a, b = int(round(s * fps)) / fps, int(round(e * fps)) / fps
        parts.append(f'[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,afade=t=in:d=0.04,afade=t=out:st={b - a - 0.06}:d=0.06[a{i}]'); lab += f'[a{i}]'
    fc = ';'.join(parts) + f';{lab}concat=n={len(seg)}:v=0:a=1[a]'
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', video, '-i', tmp, '-filter_complex', fc, '-map', '1:v', '-map', '[a]',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', out], check=True)
    os.remove(tmp); print(f'done: {total / fps:.1f} seconds -> {out}')

if __name__ == '__main__': main()
