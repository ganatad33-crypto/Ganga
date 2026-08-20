import numpy as np
import librosa

MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
PITCH_CLASSES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]

GENRE_TEMPO_FAMILIES = [
    ("downtempo / lo-fi / ambient", 60, 95),
    ("hip-hop / trap feel", 70, 100),
    ("house family (deep / tech / afro house)", 118, 128),
    ("techno / trance family", 128, 145),
    ("dubstep / half-time bass", 135, 145),
    ("drum & bass / jungle", 160, 180),
    ("hardstyle / hardcore", 150, 170),
]


def load_audio(path, sr=22050, mono=True):
    y, sr = librosa.load(path, sr=sr, mono=mono)
    return y, sr


def estimate_tempo(y, sr):
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, beat_frames = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr)
    tempo = float(np.atleast_1d(tempo)[0])
    beat_times = librosa.frames_to_time(beat_frames, sr=sr)
    return round(tempo, 1), beat_times


def estimate_key(y, sr):
    chroma = librosa.feature.chroma_cqt(y=y, sr=sr)
    chroma_mean = chroma.mean(axis=1)
    best = {"score": -np.inf, "tonic": PITCH_CLASSES[0], "mode": "major"}
    for mode_name, profile in (("major", MAJOR_PROFILE), ("minor", MINOR_PROFILE)):
        for shift in range(12):
            rotated = np.roll(profile, shift)
            score = np.corrcoef(chroma_mean, rotated)[0, 1]
            if score > best["score"]:
                best = {"score": score, "tonic": PITCH_CLASSES[shift], "mode": mode_name}
    return f"{best['tonic']} {best['mode']}", round(float(best["score"]), 3)


def _bucket_windows(values, times, window_seconds, frame_hop_time):
    win_frames = max(1, int(round(window_seconds / frame_hop_time)))
    windows = []
    i = 0
    n = len(values)
    while i < n:
        j = min(n, i + win_frames)
        if j - i < 1:
            break
        windows.append({
            "start": float(times[i]),
            "end": float(times[j - 1]),
            "value": float(np.mean(values[i:j])),
        })
        i = j
    if not windows:
        windows = [{"start": float(times[0]), "end": float(times[-1]), "value": float(np.mean(values))}]
    return windows


def _label_segments(segments):
    n = len(segments)
    labeled = []
    for i, seg in enumerate(segments):
        tier = seg["tier"]
        if i == 0:
            label = "Intro" if tier != "high" else "Intro (opens high-energy)"
        elif i == n - 1:
            label = "Outro" if tier != "high" else "Outro (cold ending)"
        elif tier == "high":
            label = "Drop / Peak"
        elif tier == "low":
            label = "Breakdown"
        else:
            next_tier = segments[i + 1]["tier"] if i + 1 < n else None
            prev_tier = segments[i - 1]["tier"]
            if next_tier == "high":
                label = "Build"
            elif prev_tier == "high":
                label = "Release / Comedown"
            else:
                label = "Mid section"
        labeled.append({**seg, "suggested_label": label})
    return labeled


def estimate_structure(y, sr, window_seconds=6.0):
    frame_length, hop_length = 2048, 512
    rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
    times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
    frame_hop_time = hop_length / sr

    _, y_perc = librosa.effects.hpss(y)
    perc_rms = librosa.feature.rms(y=y_perc, frame_length=frame_length, hop_length=hop_length)[0]
    perc_ratio = perc_rms / (rms + 1e-9)

    energy_windows = _bucket_windows(rms, times, window_seconds, frame_hop_time)
    perc_windows = _bucket_windows(perc_ratio, times, window_seconds, frame_hop_time)

    energies = np.array([w["value"] for w in energy_windows])
    low_thr, high_thr = np.percentile(energies, [33, 66])

    def tier(v):
        if v <= low_thr:
            return "low"
        if v >= high_thr:
            return "high"
        return "mid"

    raw_segments = []
    for i, w in enumerate(energy_windows):
        raw_segments.append({
            "start": w["start"],
            "end": w["end"],
            "energy": w["value"],
            "percussive_ratio": perc_windows[i]["value"] if i < len(perc_windows) else None,
            "tier": tier(w["value"]),
        })

    merged = []
    for seg in raw_segments:
        if merged and merged[-1]["tier"] == seg["tier"]:
            merged[-1]["end"] = seg["end"]
            merged[-1]["energy"] = (merged[-1]["energy"] + seg["energy"]) / 2
        else:
            merged.append(dict(seg))

    return _label_segments(merged)


def estimate_texture(y, sr):
    y_harm, y_perc = librosa.effects.hpss(y)
    harm_energy = float(np.sum(y_harm ** 2))
    perc_energy = float(np.sum(y_perc ** 2))
    total_energy = harm_energy + perc_energy + 1e-9
    percussive_ratio = perc_energy / total_energy

    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    brightness = float(np.mean(spectral_centroid))

    S = np.abs(librosa.stft(y))
    freqs = librosa.fft_frequencies(sr=sr)
    sub_bass_mask = freqs <= 80
    bass_mask = (freqs > 80) & (freqs <= 250)
    total_mag = float(np.sum(S)) + 1e-9
    sub_bass_ratio = float(np.sum(S[sub_bass_mask, :])) / total_mag
    bass_ratio = float(np.sum(S[bass_mask, :])) / total_mag

    rms = librosa.feature.rms(y=y)[0]
    dynamic_range_db = float(20 * np.log10((np.max(rms) + 1e-9) / (np.percentile(rms, 10) + 1e-9)))

    return {
        "percussive_ratio": round(percussive_ratio, 3),
        "brightness_hz": round(brightness, 1),
        "sub_bass_ratio": round(sub_bass_ratio, 4),
        "bass_ratio": round(bass_ratio, 4),
        "dynamic_range_db": round(dynamic_range_db, 1),
    }


def guess_genre_family(bpm, texture):
    half = bpm / 2
    direct_matches = []
    half_time_matches = []
    for label, lo, hi in GENRE_TEMPO_FAMILIES:
        if lo <= bpm <= hi:
            direct_matches.append(label)
        elif lo <= half <= hi:
            half_time_matches.append(f"{label} (half-time feel)")
    candidates = direct_matches + half_time_matches
    if not candidates:
        candidates.append("no clear tempo-family match — describe the genre manually")

    perc = texture["percussive_ratio"]
    bright = texture["brightness_hz"]
    descriptors = [
        "percussion-forward" if perc > 0.55 else ("harmonic/melodic-forward" if perc < 0.35 else "balanced percussion/harmony"),
        "bright, airy texture" if bright > 3000 else ("dark, warm texture" if bright < 1500 else "mid-bright texture"),
    ]
    return candidates, descriptors


def analyze(path, window_seconds=6.0):
    y, sr = load_audio(path)
    duration = float(librosa.get_duration(y=y, sr=sr))
    bpm, beat_times = estimate_tempo(y, sr)
    key, key_confidence = estimate_key(y, sr)
    texture = estimate_texture(y, sr)
    structure = estimate_structure(y, sr, window_seconds=window_seconds)
    genre_candidates, texture_descriptors = guess_genre_family(bpm, texture)

    return {
        "path": str(path),
        "duration_sec": round(duration, 1),
        "bpm": bpm,
        "key": key,
        "key_confidence": key_confidence,
        "texture": texture,
        "texture_descriptors": texture_descriptors,
        "genre_family_guess": genre_candidates,
        "structure": structure,
    }
