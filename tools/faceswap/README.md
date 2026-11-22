# Local video face swap

Swaps the largest face in a video with the face from a photo. Runs on CPU only, no GPU needed.

Use it only with faces of people who agreed to it.

## Setup (once per machine)

Needs Python 3.10+ and ffmpeg. Downloads about 1.3 GB of models into `models/` (not committed).

```bash
./setup.sh
```

## Usage

```bash
python3 faceswap.py --video clip.mp4 --face face.jpg --out result.mp4 --start 0 --end 20
```

| Option | Meaning |
|---|---|
| `--start`, `--end` | Section to process, in seconds. Default: whole video |
| `--sharpen 0` | Skip the sharpening step: about twice as fast, softer faces |
| `--no-mouth-restore` | Always use the swapped mouth, even on exaggerated expressions |

The original audio is copied into the result.

## What to expect

- Speed: about 2 seconds per frame on 4 CPU cores, so 20 seconds of video takes 20 to 25 minutes.
- Only the face changes. Hair, body and clothes stay as in the video.
- Works best on clips where the face is large and mostly facing the camera.
- Open mouths can come out with dark teeth; fast head turns can flicker.
