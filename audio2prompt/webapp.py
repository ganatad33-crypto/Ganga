"""A tiny local web app: drop an audio file in the browser, get the Suno prompt.

Deliberately built on the standard library — no Flask/FastAPI — so `pip install
audio2prompt && audio2prompt-web` is all it takes to run it.
"""

from __future__ import annotations

import argparse
import http.server
import json
import re
import shutil
import socketserver
import tempfile
import threading
import webbrowser
from pathlib import Path

from .analyze import analyze_file
from .audio_io import AudioLoadError
from .prompt import build_prompt

MAX_UPLOAD_BYTES = 120 * 1024 * 1024


def parse_multipart(body: bytes, content_type: str) -> dict[str, tuple[str | None, bytes]]:
    """Minimal multipart/form-data parser.

    The stdlib `cgi` module used to do this, but it was removed in Python 3.13
    and this app only ever needs one file part plus a couple of flags.
    Returns {field_name: (filename_or_None, raw_value)}.
    """
    match = re.search(r'boundary="?([^";]+)"?', content_type or "", re.I)
    if not match:
        raise ValueError("missing multipart boundary")
    boundary = b"--" + match.group(1).encode()

    fields: dict[str, tuple[str | None, bytes]] = {}
    for part in body.split(boundary):
        part = part.strip(b"\r\n")
        if not part or part == b"--":
            continue
        head, _, value = part.partition(b"\r\n\r\n")
        disposition = ""
        for line in head.split(b"\r\n"):
            if line.lower().startswith(b"content-disposition:"):
                disposition = line.decode("utf-8", "replace")
                break
        name_match = re.search(r'name="([^"]*)"', disposition)
        if not name_match:
            continue
        file_match = re.search(r'filename="([^"]*)"', disposition)
        fields[name_match.group(1)] = (file_match.group(1) if file_match else None, value.rstrip(b"\r\n"))
    return fields

INDEX_HTML = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>audio2prompt</title>
<style>
  :root {
    --bg: #0d0f14; --panel: #151922; --line: #242a36; --text: #e8ecf3;
    --muted: #8b95a8; --accent: #7dd3fc; --accent2: #a78bfa; --ok: #4ade80;
  }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text);
         font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
  .wrap { max-width: 940px; margin: 0 auto; padding: 32px 20px 80px; }
  h1 { font-size: 26px; margin: 0 0 4px; letter-spacing: -0.02em; }
  .sub { color: var(--muted); margin: 0 0 28px; }
  #drop { border: 2px dashed var(--line); border-radius: 14px; padding: 48px 20px;
          text-align: center; cursor: pointer; transition: .15s; background: var(--panel); }
  #drop.hot { border-color: var(--accent); background: #18202c; }
  #drop p { margin: 6px 0; color: var(--muted); }
  #drop strong { color: var(--text); font-size: 17px; }
  .opts { display: flex; gap: 18px; flex-wrap: wrap; margin: 18px 2px; color: var(--muted); font-size: 14px; }
  .opts label { display: flex; align-items: center; gap: 7px; cursor: pointer; }
  #status { margin: 18px 0; color: var(--accent); min-height: 22px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
          padding: 18px 20px; margin: 14px 0; }
  .card h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em;
             color: var(--muted); margin: 0 0 10px; font-weight: 600; }
  pre { white-space: pre-wrap; word-break: break-word; margin: 0; font-size: 14px;
        font-family: ui-monospace, "SF Mono", Menlo, monospace; }
  .copy { float: right; background: transparent; color: var(--accent); border: 1px solid var(--line);
          border-radius: 7px; padding: 3px 10px; cursor: pointer; font-size: 12px; }
  .copy:hover { border-color: var(--accent); }
  .facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
  .fact { background: #10141c; border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; }
  .fact span { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase;
               letter-spacing: .07em; }
  .fact b { font-size: 19px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  td { padding: 5px 0; border-bottom: 1px solid var(--line); }
  td:last-child { text-align: right; color: var(--muted); }
  .bar { height: 6px; background: #1d2431; border-radius: 3px; overflow: hidden; margin-top: 4px; }
  .bar i { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent2)); }
  .err { color: #f87171; }
</style>
</head>
<body>
<div class="wrap">
  <h1>audio2prompt</h1>
  <p class="sub">Drop a track. Get its tempo, key, chords, melody, arrangement — and a Suno prompt built from them.</p>

  <div id="drop">
    <strong>Drop an audio file here</strong>
    <p>or click to choose &middot; mp3, wav, flac, ogg, m4a</p>
    <input type="file" id="file" accept="audio/*" hidden>
  </div>

  <div class="opts">
    <label><input type="checkbox" id="vocals"> track has vocals</label>
    <label><input type="checkbox" id="fast"> fast mode (skip melody)</label>
  </div>

  <div id="status"></div>
  <div id="out"></div>
</div>

<script>
const drop = document.getElementById('drop');
const file = document.getElementById('file');
const status = document.getElementById('status');
const out = document.getElementById('out');

drop.onclick = () => file.click();
drop.ondragover = e => { e.preventDefault(); drop.classList.add('hot'); };
drop.ondragleave = () => drop.classList.remove('hot');
drop.ondrop = e => {
  e.preventDefault(); drop.classList.remove('hot');
  if (e.dataTransfer.files.length) send(e.dataTransfer.files[0]);
};
file.onchange = () => { if (file.files.length) send(file.files[0]); };

function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

function card(title, body, copyText) {
  const btn = copyText !== undefined
    ? `<button class="copy" data-copy="${esc(copyText)}">copy</button>` : '';
  return `<div class="card"><h2>${btn}${esc(title)}</h2>${body}</div>`;
}

async function send(f) {
  out.innerHTML = '';
  status.textContent = `Analysing ${f.name} — this takes 10–40 seconds…`;
  status.className = '';
  const fd = new FormData();
  fd.append('audio', f);
  fd.append('vocals', document.getElementById('vocals').checked ? '1' : '0');
  fd.append('fast', document.getElementById('fast').checked ? '1' : '0');
  try {
    const res = await fetch('/analyze', { method: 'POST', body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'analysis failed');
    render(data);
    status.textContent = `Done — analysed in ${data.analysis_seconds}s`;
  } catch (err) {
    status.className = 'err';
    status.textContent = 'Error: ' + err.message;
  }
}

function render(d) {
  const p = d.suno_prompt, r = d.rhythm, t = d.tonality, m = d.melody, s = d.structure;
  let html = '';

  html += card('Style — paste into Suno', `<pre>${esc(p.style_short)}</pre>`, p.style_short);
  html += card('Style — detailed', `<pre>${esc(p.style_long)}</pre>`, p.style_long);
  html += card('Exclude styles', `<pre>${esc(p.exclude)}</pre>`, p.exclude);
  html += card('Structure', `<pre>${esc(p.structure_block)}</pre>`, p.structure_block);

  html += card('Musical facts', `<div class="facts">
    <div class="fact"><span>Tempo</span><b>${r.bpm} BPM</b></div>
    <div class="fact"><span>Key</span><b>${esc(t.key_name)}</b></div>
    <div class="fact"><span>Meter</span><b>${esc(r.time_signature)}</b></div>
    <div class="fact"><span>Length</span><b>${esc(d.source.duration_formatted)}</b></div>
    <div class="fact"><span>Swing</span><b>${Math.round(r.swing * 100)}%</b></div>
    <div class="fact"><span>Grid</span><b>${Math.round(r.tempo_stability * 100)}%</b></div>
  </div>`);

  if (t.chord_progression.length) {
    html += card('Harmony', `<pre>${esc(t.chord_progression.join('  →  '))}
${esc(t.roman_progression.join('  →  '))}
scale: ${esc(t.scale_notes.join(' '))}</pre>`, t.chord_progression.join(' - '));
  }

  if (m.note_count) {
    html += card('Melody', `<pre>range ${esc(m.lowest_note)} → ${esc(m.highest_note)} (${m.range_semitones} semitones)
${esc(m.contour)}
${esc(m.note_sequence.slice(0, 24).join(' '))}</pre>`);
  }

  html += card('Instrumentation', '<table>' + d.instrumentation.hints.slice(0, 8).map(
    ([name, score]) => `<tr><td>${esc(name)}<div class="bar"><i style="width:${Math.round(score * 100)}%"></i></div></td>
      <td>${Math.round(score * 100)}%</td></tr>`).join('') + '</table>');

  html += card('Arrangement', '<table>' + s.sections.map(
    sec => `<tr><td>${esc(sec.label)}</td><td>${sec.start}s · ${sec.duration}s</td></tr>`).join('') + '</table>');

  html += card('Closest styles', '<table>' + d.style.genres.map(
    g => `<tr><td>${esc(g.name)}<div class="bar"><i style="width:${Math.round(g.confidence * 100)}%"></i></div></td>
      <td>${Math.round(g.confidence * 100)}%</td></tr>`).join('') + '</table>');

  out.innerHTML = html;
  out.querySelectorAll('.copy').forEach(b => b.onclick = async () => {
    await navigator.clipboard.writeText(b.dataset.copy);
    b.textContent = 'copied'; setTimeout(() => b.textContent = 'copy', 1200);
  });
}
</script>
</body>
</html>
"""


class Handler(http.server.BaseHTTPRequestHandler):
    server_version = "audio2prompt"

    def log_message(self, fmt: str, *args) -> None:  # quieter console
        if self.path != "/analyze":
            return
        super().log_message(fmt, *args)

    def _json(self, payload: dict, status: int = 200) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path not in ("/", "/index.html"):
            self.send_error(404)
            return
        body = INDEX_HTML.encode()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/analyze":
            self.send_error(404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_UPLOAD_BYTES:
            self._json({"error": f"upload must be between 1 byte and {MAX_UPLOAD_BYTES // (1024 * 1024)} MB"}, 413)
            return

        try:
            fields = parse_multipart(self.rfile.read(length), self.headers.get("Content-Type", ""))
        except ValueError as exc:
            self._json({"error": str(exc)}, 400)
            return

        upload = fields.get("audio")
        if not upload or not upload[0] or not upload[1]:
            self._json({"error": "no audio file in the request"}, 400)
            return

        instrumental = fields.get("vocals", (None, b"0"))[1] != b"1"
        fast = fields.get("fast", (None, b"0"))[1] == b"1"

        # keep the uploaded name (minus any path) so the report is labelled usefully
        safe_name = Path(upload[0]).name or "upload.wav"
        workdir = Path(tempfile.mkdtemp(prefix="audio2prompt-"))
        try:
            target = workdir / safe_name
            target.write_bytes(upload[1])
            analysis = analyze_file(target, skip_melody=fast)
        except AudioLoadError as exc:
            self._json({"error": str(exc)}, 400)
            return
        except Exception as exc:  # noqa: BLE001
            self._json({"error": f"analysis failed: {exc}"}, 500)
            return
        finally:
            shutil.rmtree(workdir, ignore_errors=True)

        prompt = build_prompt(analysis, instrumental=instrumental)
        payload = analysis.to_dict()
        payload["suno_prompt"] = prompt.to_dict()
        self._json(payload)


class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="audio2prompt-web", description="Local drag-and-drop UI for audio2prompt")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)

    server = ThreadedServer((args.host, args.port), Handler)
    url = f"http://{args.host}:{args.port}/"
    print(f"audio2prompt running at {url}  (ctrl-c to stop)")
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
