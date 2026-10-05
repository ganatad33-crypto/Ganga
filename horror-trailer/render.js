// Renders trailer.html frame-by-frame and muxes it with the narration into an MP4.
// usage: node render.js [out.mp4]        full render
//        node render.js --stills 8.9,22.5  PNG stills for checking frames
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FPS = 30, DURATION = 92.4;
const dir = __dirname;

(async () => {
  const args = process.argv.slice(2);
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto('file://' + path.join(dir, 'trailer.html') + '?render');
  await page.evaluate(() => window.ready);

  const frame = (t, type) => page.evaluate(([t, type]) => {
    window.render(t);
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

  const out = args[0] || path.join(dir, 'trailer.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    '-i', path.join(dir, 'audio.mp3'), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
    '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-shortest', out], { stdio: ['pipe', 'inherit', 'inherit'] });

  const total = Math.ceil(DURATION * FPS);
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
