---
name: video-tools
description: Local video and caption tools kept in this repo under tools/. Use when the user wants to cut a short reel from a longer video, add or translate captions (Hebrew word-highlight style), replace burned-in captions, transcribe a video's English speech, or swap a face in a video. Triggers - "רילס", "כתוביות", "תרגם את הסרטון", "החלף פנים", "reel", "subtitles", "captions", "face swap".
---

# Video tools

Three tools live in `tools/`. All run on CPU, with no external service and no credits.
Reply to the user in their language (usually Hebrew).

| Folder | Does | Setup | Speed |
|---|---|---|---|
| `tools/reel` | Transcribe English speech; cut a reel and burn in highlight captions | `tools/reel/setup.sh` (about 480 MB) | fast: about 1 min per reel |
| `tools/subtitles` | Replace captions already burned into a video | `pip install opencv-python-headless pillow numpy rapidocr onnxruntime` | fast |
| `tools/faceswap` | Swap the largest face in a video | `tools/faceswap/setup.sh` (about 1.3 GB) | slow: about 2 s per frame |

Run the setup once per session before first use (cloud sessions start without the models).
All need Python 3.10+ and ffmpeg. Work in the scratchpad, not in the repo, and send finished
videos to the user as files.

## 1. Reel with translated captions

1. `python3 tools/reel/transcribe.py video.mp4 work/` and read `work/transcript.txt`.
   The model is English-only and makes mistakes on fast or slurred words: fix obvious errors
   from context before translating.
2. Choose segments that add up to the requested length (default 55 to 60 seconds). Prefer a
   hook that works without context, complete jokes or thoughts, and a strong last line. Cut on
   sentence boundaries using the word times in `work/words.json`, leave about 0.15 s before
   the first word, and keep the laughter after a punchline. If the user asks for another reel
   from the same video, do not reuse segments.
3. Translate. Split every sentence into captions of 2 to 4 words, each with the start time of
   its first source word and the end time of its last. Join words with `_` when they should
   highlight together (`כל_הזמן`).
4. Look at one frame to place things: `caption_y` goes on a calm area below the picture; if
   the video has a title baked in, measure its box and cover it with a translated `title`.
5. Write `plan.json` (format is documented at the top of `tools/reel/make_reel.py`) and run
   `python3 tools/reel/make_reel.py video.mp4 plan.json out.mp4`.
6. Check: extract a few frames, confirm Hebrew reads right to left and nothing is clipped,
   and confirm the duration with ffprobe.

Defaults the user chose: Heebo heavy white text with a black outline, pink highlight box
`[255, 62, 165]`. Tell the user which source time ranges went into the reel, that the voice
stays in the original language, and that you checked frames rather than watched it play.

## 2. Replace burned-in captions

For captions that sit on a solid dark band outside the picture.

1. `python3 tools/subtitles/resub.py detect video.mp4 captions.json`
2. Fill `text` for every line in `captions.json`. `source` is OCR and only a hint. Captions
   are often 3-word slices of longer sentences, so read the lines in order, work out the
   full sentences, translate those, then split the translation back onto the same lines.
3. `python3 tools/subtitles/resub.py render video.mp4 captions.json out.mp4`

The highlight colour is `highlight_rgb` in `captions.json`. Captions drawn on top of the
footage are not supported.

## 3. Face swap

`python3 tools/faceswap/faceswap.py --video clip.mp4 --face face.jpg --out out.mp4 --start 0 --end 20`

- Only the face changes: hair, body and clothes stay. It cannot replace a whole person.
- Good input is a large face, mostly facing the camera. Test a 2-second range first and
  show the user a frame before running the whole clip.
- Run long jobs in the background: 20 seconds of video takes 20 to 25 minutes.
- Only use faces of people who agreed to it. If it is not clear the people in the photo and
  the video agreed, ask once before running. Do not use it to make sexual or revealing
  content of a real person, or to put someone into footage they would object to.

## Limits to state plainly

- No GPU here: whole-body or character replacement and Hebrew voice dubbing are not possible
  with these tools.
- Clips of films, shows or stand-up belong to their owners; mention once that platforms may
  remove reposts.
