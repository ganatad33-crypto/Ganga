// Renders trailer.html frame-by-frame and muxes it with the narration into an MP4.
// usage: node render.js [out.mp4]           60-second edit (also writes audio-60.mp3)
//        node render.js --full [out.mp4]    uncut 92s version
//        node render.js --stills 8.9,22.5 [dir]  PNG stills (output-time seconds)
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30;
const dir = __dirname;

// Cuts the narration into the kept segments (short fades at every join), then
// applies the tempo that lands the edit on the target length.
function buildAudio(segs, tempo, length, out) {
  const parts = segs.map(([a, b], i) => {
    const len = b - a, f = Math.min(0.04, len / 4);
    return `[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS,afade=t=in:d=${f},afade=t=out:st=${(len - f).toFixed(3)}:d=${f}[s${i}]`;
  });
  const concat = segs.map((_, i) => `[s${i}]`).join('') + `concat=n=${segs.length}:v=0:a=1[c]`;
  const tail = `[c]atempo=${tempo.toFixed(5)},afade=t=out:st=${(length - 1.2).toFixed(2)}:d=1.2,atrim=0:${length}[out]`;
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', path.join(dir, 'audio.mp3'),
    '-filter_complex', [...parts, concat, tail].join(';'), '-map', '[out]', '-c:a', 'libmp3lame', '-b:a', '192k', out]);
}

(async () => {
  const args = process.argv.slice(2);
  const full = args[0] === '--full';
  if (full) args.shift();

  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(dir, 'trailer.html') + '?render' + (full ? '&full' : ''));
  await page.evaluate(() => window.ready);
  const { segs, tempo, length } = await page.evaluate(() => ({ segs: window.SEGS, tempo: window.TEMPO, length: window.OUT_DURATION }));

  const frame = (t, type) => page.evaluate(([t, type]) => {
    window.renderOut(t);
    return document.getElementById('cv').toDataURL(type, 0.92).split(',')[1];
  }, [t, type]);

  if (args[0] === '--stills') {
    const outDir = args[2] || dir;
    for (const s of args[1].split(',')) {
      fs.writeFileSync(path.join(outDir, `still-${s}.png`), Buffer.from(await frame(+s, 'image/png'), 'base64'));
    }
    await browser.close();
    return;
  }

  let audio = path.join(dir, 'audio.mp3');
  if (!full) { audio = path.join(dir, 'audio-60.mp3'); buildAudio(segs, tempo, length, audio); }

  const out = args[0] || path.join(dir, full ? 'trailer.mp4' : 'trailer-60s.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  const total = Math.round(length * FPS);
  for (let i = 0; i < total; i++) {
    const buf = Buffer.from(await frame(i / FPS, 'image/jpeg'), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('done', out);
})();
