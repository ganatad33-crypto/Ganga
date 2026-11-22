"""Cut a cartoon sticker out of its background and save it as a transparent PNG.

  python3 cutout.py generated.png sticker.png

Made for generated sticker art: a colourful figure with a white outline on a dark, grey or
plain background. It keeps the largest coloured shape, fills its inside (eyes, teeth, lines)
and keeps a white outline around it. It is not meant for photos.
"""
import sys
import cv2, numpy as np

def main():
    im = cv2.imread(sys.argv[1]); hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
    col = ((hsv[..., 1] > 70) & (hsv[..., 2] > 50)).astype(np.uint8)
    col = cv2.morphologyEx(col, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(col)
    if n < 2: raise SystemExit('no coloured figure found')
    m = (lab == 1 + np.argmax(st[1:, 4])).astype(np.uint8)
    cnt, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE); m[:] = 0; cv2.drawContours(m, cnt, -1, 1, -1)
    k = max(7, int(min(im.shape[:2]) * 0.021)) | 1
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (k, k)))
    a = cv2.GaussianBlur(m * 255, (0, 0), 1.3); rgb = im.copy()
    ring = (m > 0) & (cv2.erode(m, np.ones((k - 2, k - 2), np.uint8)) == 0) & (hsv[..., 1] < 70); rgb[ring] = 255
    out = np.dstack([rgb, a]); ys, xs = np.where(a > 20); out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    cv2.imwrite(sys.argv[2], out); print(f'{out.shape[1]}x{out.shape[0]} -> {sys.argv[2]}')

if __name__ == '__main__': main()
