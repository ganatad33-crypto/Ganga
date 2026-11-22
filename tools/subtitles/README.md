# Replace burned-in captions

Replaces captions that are burned into a video with new text, for example a Hebrew translation.
Keeps the timing of every line and the coloured box that jumps from word to word.

Works when the captions are light text on a solid dark band outside the picture.
It does not work for captions drawn on top of the footage.

## Setup

Needs Python 3.10+, ffmpeg and:

```bash
python3 -m pip install opencv-python-headless pillow numpy rapidocr onnxruntime
```

## Usage

```bash
# 1. find the caption lines, their timing and the word highlight
python3 resub.py detect video.mp4 captions.json

# 2. open captions.json and fill in "text" for every line

# 3. render
python3 resub.py render video.mp4 captions.json out.mp4
```

In `captions.json`, `source` is the text read from the video. It is only a hint and often has
reading errors, so check it against the video. Write the replacement in `text`, words separated
by spaces. Use `_` to keep two words in one highlight step, for example `כל_כך`.

Options for `render`: `--font file.ttf`, `--weight 900`, `--size 66`.
Option for `detect`: `--band Y0 Y1` if the caption band is not found automatically.

Right-to-left text is laid out automatically. The highlight colour is in `highlight_rgb`
and can be edited in `captions.json`.

The bundled font is Heebo (SIL Open Font License, see `Heebo-OFL.txt`).
