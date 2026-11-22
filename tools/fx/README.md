# Reel animations

Adds comedy animations on top of a finished reel.

```bash
python3 add_fx.py in.mp4 fx.json out.mp4
```

| Event type | What it does |
|---|---|
| `pop` | An emoji bounces in next to the speaker, wobbles and shrinks away |
| `sticker` | A cut-out picture springs in from the side, shakes with rage under a pulsing anger mark, then leaves |
| `laugh` | Laughing emojis float up from the bottom of the frame |
| `punch` | A quick zoom on the picture |
| `shake` | A short screen shake |

The format of `fx.json` is documented at the top of `add_fx.py`. Times are seconds in the
input video. `area` is the picture inside the frame: zoom, shake, pops and stickers stay
inside it, so a title and captions outside it are not touched. `float_top` keeps the
floating emojis below the captions. Change `seed` for a different random result.

## Assets

- `emoji/`: Noto Emoji PNGs, named by hex code (Apache 2.0, see `emoji/LICENSE`).
- `stickers/`: four generated "angry woman" cartoon stickers with transparent background.
- `cutout.py`: turns newly generated sticker art into a transparent PNG.

Needs Python 3.10+, ffmpeg, `opencv-python-headless` and `numpy`.
