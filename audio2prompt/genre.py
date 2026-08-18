"""Genre / style inference from the extracted features.

Each candidate style declares the feature window it lives in.  A track is
scored against every window and the best matches are returned with a
confidence, so downstream prompt text can hedge when nothing fits well.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class GenreProfile:
    name: str
    bpm: tuple[float, float]
    percussive: tuple[float, float] = (0.0, 1.0)
    sub_bass: tuple[float, float] = (0.0, 1.0)
    brightness: tuple[float, float] = (0.0, 20000.0)
    flatness: tuple[float, float] = (0.0, 1.0)
    swing: tuple[float, float] = (0.0, 1.0)
    stability: tuple[float, float] = (0.0, 1.0)
    onset_rate: tuple[float, float] = (0.0, 40.0)
    tags: tuple[str, ...] = ()


PROFILES: list[GenreProfile] = [
    GenreProfile("deep house", (118, 126), (0.35, 0.7), (0.06, 0.35), (900, 3000), (0.0, 0.2), (0.0, 0.4), (0.8, 1.0), (2, 8),
                 tags=("four-on-the-floor kick", "warm analog bassline", "soft pads", "shuffled hats")),
    GenreProfile("tech house", (122, 130), (0.45, 0.85), (0.08, 0.4), (1500, 4500), (0.0, 0.3), (0.0, 0.4), (0.85, 1.0), (3, 10),
                 tags=("punchy four-on-the-floor", "rolling bassline", "tight percussion loops")),
    GenreProfile("techno", (128, 145), (0.5, 0.95), (0.08, 0.45), (1200, 5000), (0.05, 0.45), (0.0, 0.3), (0.85, 1.0), (3, 12),
                 tags=("driving four-on-the-floor", "hypnotic loop", "industrial reverb", "modular textures")),
    GenreProfile("trance", (132, 142), (0.35, 0.75), (0.05, 0.3), (2000, 6000), (0.0, 0.3), (0.0, 0.3), (0.85, 1.0), (4, 14),
                 tags=("supersaw leads", "rolling 16th bass", "euphoric breakdown", "long build-up")),
    GenreProfile("psytrance", (138, 150), (0.45, 0.9), (0.08, 0.4), (2000, 7000), (0.05, 0.5), (0.0, 0.25), (0.9, 1.0), (5, 16),
                 tags=("rolling triplet-free 16th bassline", "acid squelch", "psychedelic risers")),
    GenreProfile("progressive house", (120, 128), (0.35, 0.75), (0.06, 0.35), (1500, 4500), (0.0, 0.25), (0.0, 0.3), (0.85, 1.0), (3, 10),
                 tags=("long evolving build", "wide plucks", "sidechained pads")),
    GenreProfile("drum and bass", (165, 178), (0.5, 0.95), (0.1, 0.5), (1500, 6000), (0.05, 0.4), (0.0, 0.4), (0.85, 1.0), (5, 18),
                 tags=("breakbeat drums", "heavy reese bass", "half-time feel over fast drums")),
    GenreProfile("dubstep / bass", (138, 152), (0.45, 0.9), (0.15, 0.6), (1200, 6000), (0.1, 0.6), (0.0, 0.3), (0.8, 1.0), (2, 10),
                 tags=("half-time drop", "wobble bass", "growling sub")),
    GenreProfile("trap", (130, 160), (0.4, 0.85), (0.15, 0.65), (1200, 5000), (0.05, 0.45), (0.0, 0.4), (0.8, 1.0), (3, 14),
                 tags=("808 sub with slides", "rapid hi-hat rolls", "sparse dark melody")),
    GenreProfile("hip hop / boom bap", (80, 100), (0.4, 0.85), (0.08, 0.45), (900, 3500), (0.03, 0.4), (0.15, 0.7), (0.6, 1.0), (2, 9),
                 tags=("dusty sampled drums", "swung groove", "vinyl texture")),
    GenreProfile("lo-fi / chillhop", (70, 92), (0.3, 0.7), (0.05, 0.35), (600, 2400), (0.0, 0.3), (0.2, 0.9), (0.4, 0.9), (1, 7),
                 tags=("dusty tape saturation", "jazzy keys", "laid-back swung drums", "vinyl crackle")),
    GenreProfile("ambient", (50, 100), (0.0, 0.28), (0.0, 0.3), (600, 4000), (0.0, 0.3), (0.0, 1.0), (0.0, 0.8), (0, 2.5),
                 tags=("evolving pads", "no drums", "long reverb tails", "drone")),
    GenreProfile("cinematic / orchestral", (60, 120), (0.1, 0.5), (0.03, 0.35), (800, 4000), (0.0, 0.25), (0.0, 0.5), (0.2, 0.85), (1, 8),
                 tags=("orchestral strings", "epic percussion swells", "wide hall reverb")),
    GenreProfile("rock", (100, 160), (0.35, 0.8), (0.05, 0.35), (1200, 4500), (0.08, 0.55), (0.0, 0.4), (0.4, 0.9), (3, 12),
                 tags=("distorted electric guitars", "live drum kit", "driving backbeat")),
    GenreProfile("indie / alt pop", (95, 130), (0.3, 0.7), (0.04, 0.3), (1200, 4500), (0.02, 0.4), (0.0, 0.5), (0.5, 0.95), (2, 10),
                 tags=("jangly guitars", "roomy drums", "warm analog mix")),
    GenreProfile("pop", (95, 130), (0.3, 0.75), (0.06, 0.4), (1500, 5000), (0.0, 0.35), (0.0, 0.4), (0.75, 1.0), (2, 10),
                 tags=("polished modern production", "big chorus lift", "layered synths and live drums")),
    GenreProfile("funk / disco", (105, 125), (0.4, 0.8), (0.06, 0.35), (1200, 4500), (0.02, 0.4), (0.1, 0.7), (0.5, 0.95), (4, 14),
                 tags=("syncopated slap bass", "wah guitar", "tight horn stabs")),
    GenreProfile("jazz", (80, 200), (0.2, 0.6), (0.03, 0.3), (900, 4000), (0.0, 0.3), (0.35, 1.0), (0.2, 0.8), (3, 14),
                 tags=("walking upright bass", "brushed or ride-led drums", "extended chords", "live room sound")),
    GenreProfile("reggae / dub", (65, 95), (0.3, 0.75), (0.08, 0.45), (700, 3000), (0.0, 0.35), (0.05, 0.6), (0.5, 0.95), (2, 9),
                 tags=("off-beat skank", "deep dub bass", "spring reverb and delay throws")),
    GenreProfile("afrobeats / amapiano", (100, 118), (0.35, 0.8), (0.08, 0.45), (1000, 4000), (0.0, 0.35), (0.1, 0.7), (0.6, 1.0), (3, 12),
                 tags=("log-drum bass", "shaker-driven groove", "syncopated percussion")),
    GenreProfile("latin / reggaeton", (88, 100), (0.4, 0.85), (0.08, 0.45), (1000, 4500), (0.0, 0.4), (0.0, 0.5), (0.7, 1.0), (3, 12),
                 tags=("dembow rhythm", "syncopated percussion", "bright synth stabs")),
    GenreProfile("middle-eastern / ethnic fusion", (70, 140), (0.25, 0.75), (0.04, 0.4), (900, 5000), (0.0, 0.45), (0.0, 0.6), (0.3, 0.95), (2, 12),
                 tags=("oud and qanun textures", "darbuka percussion", "microtonal ornamentation")),
    GenreProfile("synthwave", (95, 118), (0.3, 0.7), (0.05, 0.35), (1500, 5000), (0.0, 0.3), (0.0, 0.3), (0.85, 1.0), (2, 9),
                 tags=("gated reverb drums", "analog synth arpeggio", "neon 80s pads")),
    GenreProfile("metal", (120, 200), (0.4, 0.9), (0.05, 0.4), (1800, 6000), (0.15, 0.7), (0.0, 0.3), (0.5, 0.95), (5, 20),
                 tags=("palm-muted downtuned guitars", "double-kick drums", "aggressive mix")),
]


def _window_score(value: float, window: tuple[float, float], softness: float) -> float:
    lo, hi = window
    if lo <= value <= hi:
        return 1.0
    distance = lo - value if value < lo else value - hi
    return max(0.0, 1.0 - distance / max(softness, 1e-9))


def _specificity(profile: GenreProfile) -> float:
    """How narrow this profile's windows are, 0 (matches anything) to 1.

    A profile whose windows span the whole feature space matches every track,
    so without this a catch-all like "ethnic fusion" outranks a genuinely
    tight match like "techno".
    """
    spans = [
        (profile.bpm[1] - profile.bpm[0]) / 150.0,
        (profile.percussive[1] - profile.percussive[0]),
        (profile.sub_bass[1] - profile.sub_bass[0]),
        (profile.brightness[1] - profile.brightness[0]) / 8000.0,
        (profile.flatness[1] - profile.flatness[0]),
        (profile.swing[1] - profile.swing[0]),
        (profile.stability[1] - profile.stability[0]),
        (profile.onset_rate[1] - profile.onset_rate[0]) / 20.0,
    ]
    return float(max(0.0, 1.0 - sum(min(1.0, s) for s in spans) / len(spans)))


@dataclass
class GenreGuess:
    name: str
    confidence: float
    tags: list[str]


def infer_genres(
    bpm: float,
    percussive_ratio: float,
    sub_bass: float,
    brightness: float,
    flatness: float,
    swing: float,
    stability: float,
    onset_rate: float,
    top_k: int = 3,
) -> list[GenreGuess]:
    results: list[tuple[float, GenreProfile]] = []
    for profile in PROFILES:
        score = (
            _window_score(bpm, profile.bpm, 14.0) * 2.6
            + _window_score(percussive_ratio, profile.percussive, 0.2) * 1.5
            + _window_score(sub_bass, profile.sub_bass, 0.2) * 1.0
            + _window_score(brightness, profile.brightness, 1500.0) * 1.2
            + _window_score(flatness, profile.flatness, 0.2) * 0.9
            + _window_score(swing, profile.swing, 0.25) * 0.8
            + _window_score(stability, profile.stability, 0.25) * 0.8
            + _window_score(onset_rate, profile.onset_rate, 4.0) * 1.0
        )
        # a wide-open profile that matches everything is worth less than a
        # tight one that matches just as well
        score = (score / 9.8) * (0.78 + 0.34 * _specificity(profile))
        results.append((min(score, 1.0), profile))

    results.sort(key=lambda kv: kv[0], reverse=True)
    return [GenreGuess(p.name, round(s, 3), list(p.tags)) for s, p in results[:top_k]]


def mood_words(
    mode: str,
    brightness: float,
    energy: float,
    bpm: float,
    dynamic_range: float,
) -> list[str]:
    """Adjectives Suno responds well to, derived from the measured features."""
    words: list[str] = []
    minor_ish = mode in ("minor", "phrygian", "harmonic minor", "phrygian dominant", "dorian")

    if minor_ish and brightness < 1800:
        words += ["dark", "brooding", "melancholic"]
    elif minor_ish:
        words += ["moody", "cinematic", "tense"]
    elif brightness > 3000:
        words += ["bright", "uplifting", "euphoric"]
    else:
        words += ["warm", "nostalgic", "laid-back"]

    if bpm >= 140 and energy > 0.5:
        words += ["driving", "high-energy", "relentless"]
    elif bpm >= 115:
        words += ["groovy", "propulsive"]
    elif bpm < 85:
        words += ["slow-burning", "spacious"]

    if dynamic_range > 16:
        words.append("dynamic")
    elif dynamic_range < 7:
        words.append("wall-of-sound")

    seen: set[str] = set()
    return [w for w in words if not (w in seen or seen.add(w))]
