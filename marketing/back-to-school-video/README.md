# סרטון סטורי: "נגמרו החגים" 🎒

סרטון שיווקי הומוריסטי (אנכי 1080×1920, ‏58 שניות) לרגל החזרה ללימודים ב־4.10.2026.

- `nigmeru-hachagim.mp4` — הסרטון המוכן
- `index.html` — האנימציה (HTML/CSS/JS, מבוססת זמן)
- `audio.py` — מסנתז את המוזיקה והאפקטים (`audio.wav`)
- `render.js` — מצלם פריים־פריים עם Playwright ומקודד ל־MP4 עם ffmpeg

## בנייה מחדש
```bash
pip install numpy imageio-ffmpeg
python3 audio.py
FFMPEG=$(python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())") node render.js nigmeru-hachagim.mp4
```
תצוגה מקדימה של רגעים: `node render.js --stills 3,20,35`
