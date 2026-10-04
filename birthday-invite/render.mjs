// Renders invite.html frame-by-frame into invite.mp4 (1080x1920, 30fps, with music.wav)
// Usage (from repo root): python3 -m http.server 8765 &  then  node birthday-invite/render.mjs
import { chromium } from "playwright";
import { spawn } from "node:child_process";

const FPS = 30;
const URL = process.env.INVITE_URL || "http://localhost:8765/birthday-invite/invite.html?render";
const OUT = process.argv[2] || "birthday-invite/invite.mp4";
const ONLY = process.env.FRAME; // render a single PNG for preview

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
await page.goto(URL);
await page.evaluate(() => window.ready);
const dur = await page.evaluate(() => window.DURATION);

async function frame(t) {
  const b64 = await page.evaluate(t => { render(t); return document.getElementById("c").toDataURL("image/jpeg", .93).split(",")[1]; }, t);
  return Buffer.from(b64, "base64");
}

if (ONLY) {
  for (const t of ONLY.split(",")) {
    const fs = await import("node:fs");
    fs.writeFileSync(`${process.env.PREVIEW_DIR || "."}/frame_${t}.jpg`, await frame(+t));
  }
} else {
  const ff = spawn("ffmpeg", ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-i", process.env.MUSIC || "birthday-invite/music.wav", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-preset", "medium", "-crf", "20",
    "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", OUT], { stdio: ["pipe", "inherit", "inherit"] });
  const total = Math.round(dur * FPS);
  for (let i = 0; i < total; i++) {
    const buf = await frame(i / FPS);
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
    if (i % 150 === 0) console.error(`frame ${i}/${total}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on("close", r));
}
await browser.close();
