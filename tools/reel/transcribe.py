"""Transcribe English speech in a video with a time for every word (CPU only).

  python3 transcribe.py video.mp4 out_dir

Writes out_dir/transcript.txt (one line per phrase with its start time), out_dir/words.json
(every word with its time) and out_dir/energy.json (loudness per half second: laughter and
applause show up as loud stretches with no words).
The model understands English only.
"""
import json, os, subprocess, sys
import numpy as np, sherpa_onnx, soundfile as sf

def main():
    video, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
    models = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models')
    d = os.path.join(models, 'sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8')
    wav = os.path.join(out, 'audio.wav')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', video, '-ar', '16000', '-ac', '1', wav], check=True)
    rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=d + '/encoder.int8.onnx', decoder=d + '/decoder.int8.onnx',
        joiner=d + '/joiner.int8.onnx', tokens=d + '/tokens.txt', num_threads=4, model_type='nemo_transducer')
    a, sr = sf.read(wav, dtype='float32')
    cfg = sherpa_onnx.VadModelConfig(); cfg.silero_vad.model = os.path.join(models, 'silero_vad.onnx')
    cfg.silero_vad.min_silence_duration = 0.35; cfg.silero_vad.max_speech_duration = 20; cfg.sample_rate = sr
    vad = sherpa_onnx.VoiceActivityDetector(cfg, buffer_size_in_seconds=600); segs = []; w = cfg.silero_vad.window_size
    def drain():
        while not vad.empty():
            s = vad.front; segs.append((s.start / sr, np.array(s.samples))); vad.pop()
    for i in range(0, len(a) - w, w):
        vad.accept_waveform(a[i:i + w]); drain()
    vad.flush(); drain()
    words = []; lines = []
    for st, x in segs:
        s = rec.create_stream(); s.accept_waveform(sr, x); rec.decode_stream(s); r = s.result; cur = None
        for tok, t in zip(r.tokens, r.timestamps):
            if tok.startswith(' ') or cur is None:
                if cur: words.append(cur)
                cur = {'w': tok.strip(), 't': round(st + t, 2)}
            else: cur['w'] += tok
        if cur: words.append(cur)
        lines.append(f'{st:7.2f}  {r.text.strip()}')
    open(os.path.join(out, 'transcript.txt'), 'w').write('\n'.join(lines) + '\n')
    json.dump(words, open(os.path.join(out, 'words.json'), 'w'))
    json.dump([round(float(np.sqrt((a[i:i + sr // 2] ** 2).mean())), 4) for i in range(0, len(a), sr // 2)], open(os.path.join(out, 'energy.json'), 'w'))
    print('\n'.join(lines)); print(f'\n{len(words)} words -> {out}')

if __name__ == '__main__': main()
