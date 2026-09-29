// Renders index.html frame-by-frame into an MP4 (1080x1920, 30fps).
// Usage: node render.js [out.mp4] [--html page.html] [--audio track.wav] [--stills t1,t2,...]
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG = process.env.FFMPEG || 'ffmpeg';
const FPS = 30;

(async () => {
  const args = process.argv.slice(2);
  const opt = (k, d) => { const i = args.indexOf(k); if (i < 0) return d; const v = args[i + 1]; args.splice(i, 2); return v; };
  const html = opt('--html', 'index.html');
  const audio = path.join(__dirname, opt('--audio', 'audio.wav'));
  const stills = opt('--stills', null);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, html));
  await page.evaluate(() => document.fonts.ready);

  if (stills) {
    const dir = path.join(__dirname, 'stills');
    fs.mkdirSync(dir, { recursive: true });
    for (const t of stills.split(',').map(Number)) {
      await page.evaluate(t => seek(t), t);
      await page.screenshot({ path: path.join(dir, `t${t}.jpg`), type: 'jpeg', quality: 80 });
    }
    await browser.close();
    return;
  }

  const out = args[0] || 'video.mp4';
  const duration = await page.evaluate(() => window.DURATION);
  const frames = Math.round(duration * FPS);
  const ff = spawn(FFMPEG, ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    ...(fs.existsSync(audio) ? ['-i', audio, '-c:a', 'aac', '-b:a', '192k', '-shortest'] : []),
    '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out],
    { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => seek(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.error(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
})();
