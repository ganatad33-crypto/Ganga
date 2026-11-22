# Reel maker

Cuts a short reel out of a longer video and burns in word-highlight captions, for example
Hebrew captions for an English video.

```bash
./setup.sh                                            # once: dependencies and speech model (about 480 MB)
python3 transcribe.py video.mp4 work/                 # English speech -> transcript with word times
python3 make_reel.py video.mp4 plan.json out.mp4      # cut + captions
```

`plan.json` lists the segments to keep and the captions with their times. Its format is
documented at the top of `make_reel.py`. The font comes from `../subtitles/Heebo.ttf`.

The speech model understands English only.
