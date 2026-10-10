// Renders index.html frame by frame. Usage:
//   node render.mjs stills 3 9.5 30           -> PNG stills for checking
//   node render.mjs video                      -> out/video.mp4 (needs out/music.wav)
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// playwright is installed globally; ESM ignores NODE_PATH, so resolve it via require
const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.NODE_PATH || '', '/opt/node22/lib/node_modules'] }));
const dir = path.dirname(fileURLToPath(import.meta.url));
const url = 'file://' + path.join(dir, 'index.html');
const out = path.join(dir, 'out');
mkdirSync(out, { recursive: true });
const FPS = 30, W = 1080, H = 1920;
const [mode, ...args] = process.argv.slice(2);

async function openPage(browser) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  return page;
}

function run(cmd, argv, stdin) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, argv, { stdio: [stdin ? 'pipe' : 'ignore', 'ignore', 'inherit'] });
    p.on('exit', c => c === 0 ? res() : rej(new Error(cmd + ' exited ' + c)));
    if (stdin) stdin(p);
  });
}

const browser = await chromium.launch();
if (mode === 'stills') {
  const page = await openPage(browser);
  for (const t of args) {
    await page.evaluate(t => window.seek(t), +t);
    await page.screenshot({ path: path.join(out, `still_${t}.png`) });
  }
} else if (mode === 'video') {
  const page0 = await openPage(browser);
  const tl = await page0.evaluate(() => window.TIMELINE);
  writeFileSync(path.join(out, 'timeline.json'), JSON.stringify(tl));
  await page0.close();
  const total = Math.round(tl.dur * FPS), workers = 4, per = Math.ceil(total / workers);
  const segs = [];
  await Promise.all([...Array(workers)].map(async (_, w) => {
    const page = await openPage(browser);
    const seg = path.join(out, `seg${w}.mp4`); segs[w] = seg;
    const from = w * per, to = Math.min(total, from + per);
    await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', seg], async p => {
      for (let f = from; f < to; f++) {
        await page.evaluate(t => window.seek(t), f / FPS);
        const buf = await page.screenshot({ type: 'jpeg', quality: 95 });
        if (!p.stdin.write(buf)) await new Promise(r => p.stdin.once('drain', r));
        if (f % 300 === 0) console.log(`worker ${w}: frame ${f}/${to}`);
      }
      p.stdin.end();
    });
  }));
  writeFileSync(path.join(out, 'segs.txt'), segs.map(s => `file '${s}'`).join('\n'));
  await run('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', path.join(out, 'segs.txt'),
    '-i', path.join(out, 'music.wav'), '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
    '-movflags', '+faststart', path.join(out, 'video.mp4')]);
  console.log('done', path.join(out, 'video.mp4'));
}
await browser.close();
