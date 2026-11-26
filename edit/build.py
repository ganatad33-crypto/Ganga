#!/usr/bin/env python3
"""Music-video edit for "עוד לילה, מאמי".

Builds a beat-synced edit from the numbered scene clips, replaces their audio
with the song, adds Hebrew/Spanish subtitles, a light cinematic grade and
letterbox. Run:  python3 build.py [--preview]
"""
import json, os, re, subprocess, sys
import numpy as np

ROOT = os.path.dirname(os.path.abspath(__file__))
V = lambda n: os.path.join(ROOT, 'videos', f'scene{n}.mp4')
SONG = os.path.join(ROOT, 'audio', 'song.mp3')
SEG = os.path.join(ROOT, 'out', 'seg')
OUT = os.path.join(ROOT, 'out')
W, H, FPS = 1920, 1080, 24
PREVIEW = '--preview' in sys.argv
SONG_LEN = 219.62
FRAME = 1 / FPS

beats = np.array(json.load(open(os.path.join(ROOT, 'audio', 'analysis.json')))['beats'])
BEAT = float(np.median(np.diff(beats)))


def snap(t):
    """Snap a time to the nearest detected beat (within half a beat)."""
    i = int(np.argmin(abs(beats - t)))
    return float(beats[i]) if abs(beats[i] - t) < BEAT / 2 else t


# ---------------------------------------------------------------- shot pool
# name: (scene, src_in, src_out)
SHOTS = {
    's1_face':   (1, 0.0, 2.6),    # close-up, painted face + sunglasses
    's1_strum':  (1, 2.6, 4.4),    # she starts playing, sunset
    's1_embrace':(1, 4.6, 7.8),    # wide: guitarist + couple embracing
    's1_feet':   (1, 7.9, 9.0),    # feet splash, reflections
    's1_spin':   (1, 9.0, 10.0),   # couple spin, hair flying
    's1_guitar': (1, 10.0, 12.0),  # guitar close-up strumming
    's1_twirl':  (1, 12.0, 14.2),  # wide twirl
    's1_kiss':   (1, 14.3, 18.8),  # wide embrace/kiss at sunset
    's5_twirl':  (5, 0.0, 2.0),    # daytime, rock frame, twirl
    's5_close':  (5, 2.0, 4.2),    # close dance
    's5_play':   (5, 4.2, 9.0),    # playful dancing in shallow water
    's5_spin':   (5, 9.0, 12.0),   # close spin
    's5_flare':  (5, 12.0, 15.0),  # twirl, dress flare
    's7_rock':   (7, 0.0, 4.0),    # couple on rock, wave behind
    's7_splash': (7, 4.0, 10.0),   # medium, waves exploding behind
    's7_cu':     (7, 10.0, 20.0),  # close-up faces, smiles
    's8_dark':   (8, 0.0, 6.0),    # dark wave hiding the sun
    's8_crash':  (8, 6.0, 12.0),   # waves crashing, sun
    's8_sun':    (8, 12.0, 20.0),  # sun on the horizon (end scene)
}
cursor = {k: v[1] for k, v in SHOTS.items()}

# ---------------------------------------------------------------- timeline
# Each entry: (shot, t_start, opts). t_end = next entry's t_start.
# opts: speed (<1 = slow motion), z (punch-in factor), ax/ay (punch-in anchor
# 0..1), flip, bw, at (explicit source in-point), trans (into this shot:
# 'cut' | ('fade', secs) | ('white', secs) | ('black', secs)).
TL = []


def add(shot, t, **o):
    TL.append([shot, t, o])


def run(start, end, pattern, beats_each=2, **common):
    """Fill [start, end) with beat-length cuts cycling through `pattern`."""
    t = start
    i = 0
    while t < end - BEAT * 0.75:
        item = pattern[i % len(pattern)]
        shot, o = (item, {}) if isinstance(item, str) else item
        n = o.pop('n', beats_each) if isinstance(item, tuple) else beats_each
        o = {**common, **o}
        add(shot, t, **o)
        t = snap(t + n * BEAT)
        i += 1
    return t


S = snap
# ---- Intro (0 - 15.8): whispered "Mi amor / Mi vida", slow and moody
add('s8_dark', 0.0, speed=0.9)
add('s1_face', 6.55, speed=0.72, trans=('fade', 0.9))
add('s7_rock', 10.6, speed=0.7, trans=('fade', 0.9))
# ---- Groove (15.8 - 27.8): guitar enters, hard cuts on the beat
run(S(15.81), S(27.79), [('s1_guitar', {'n': 4}), 's1_feet', 's1_strum',
                         ('s5_twirl', {'n': 3}), ('s1_spin', {'n': 2}),
                         ('s5_flare', {'n': 4})])
# ---- Verse 1 (27.8 - 47.2): male, intimate. Long takes, soft dissolves
add('s7_splash', S(27.79), trans=('fade', 0.5))
add('s1_embrace', S(32.0), speed=0.75, trans=('fade', 0.5))
add('s7_cu', S(36.5), trans=('fade', 0.5))
add('s5_close', S(41.4), speed=0.8, trans=('fade', 0.4))
add('s1_kiss', S(44.3), speed=0.8, trans=('fade', 0.4))
# ---- Pre-chorus 1 (47.2 - 57.3): build, cuts accelerate
run(S(47.18), S(57.33), [('s5_play', {'n': 4}), ('s7_cu', {'n': 4, 'z': 1.3, 'ax': 0.3}),
                         ('s1_twirl', {'n': 2}), ('s5_spin', {'n': 2}),
                         ('s1_feet', {'n': 1}), ('s5_flare', {'n': 1}),
                         ('s1_spin', {'n': 1}), ('s7_splash', {'n': 1, 'z': 1.25})])
# ---- Chorus 1 (57.3 - 71.6)
CH = [('s5_twirl', {'trans': ('white', 0.25)}), ('s7_splash', {'z': 1.2}), 's1_twirl', 's5_spin',
      ('s7_cu', {'z': 1.35, 'ax': 0.25}), 's1_spin', 's5_flare', ('s1_kiss', {'z': 1.3, 'ax': 0.8}),
      's5_play', 's7_splash', 's1_feet']
run(S(57.33), S(71.63), CH)
# ---- Post-chorus drop 1 (71.6 - 85.6): brass, chants, fastest cutting
DROP = ['s5_flare', 's1_spin', ('s5_twirl', {'flip': 1}), 's1_feet', ('s7_splash', {'z': 1.3}),
        's5_spin', ('s1_guitar', {'z': 1.2}), ('s5_play', {'flip': 1}), 's1_twirl']
t = run(S(71.63), S(76.66), DROP, beats_each=1)
run(t, S(85.6), DROP[3:] + DROP[:3], beats_each=2)
# "אתה מקנא, אני בוערת" — she starts
add('s7_cu', S(85.6), z=1.35, ax=0.25)
# ---- Verse 2 (90.9 - 108.2): female, the conflict
add('s5_close', S(90.86))
add('s8_dark', S(93.84), bw=1, speed=0.8, trans=('fade', 0.3))   # "אני נשברת"
add('s7_cu', S(95.99), trans=('fade', 0.3))                      # "אתה חוזר"
add('s7_splash', S(98.48))                                       # "את הסערה"
add('s1_kiss', S(101.14), speed=0.7, trans=('fade', 0.6))        # "הפצע וגם הקסם"
# ---- Pre-chorus 2 (108.2 - 118.1)
run(S(108.23), S(118.14), [('s5_play', {'n': 4}), ('s1_embrace', {'n': 4, 'z': 1.3, 'ax': 0.8}),
                           ('s5_spin', {'n': 2}), ('s1_twirl', {'n': 2}),
                           ('s5_flare', {'n': 1}), ('s1_feet', {'n': 1}),
                           ('s7_splash', {'n': 1}), ('s1_spin', {'n': 1})])
# ---- Chorus 2 (118.1 - 133.6)
run(S(118.14), S(133.63), CH[1:] + CH[:1])
# ---- Drop 2 (133.6 - 141.7)
t = run(S(133.63), S(137.4), DROP[4:] + DROP[:4], beats_each=1)
run(t, S(141.69), DROP, beats_each=2)
# "Te amo, mi amor..." / "Contigo... siempre..." — slow, black & white
add('s7_cu', S(141.69), speed=0.65, trans=('fade', 0.6))
add('s1_kiss', S(146.9), speed=0.6, bw=1, trans=('fade', 0.8))
# ---- Bridge (155.3 - 168.0): only guitar. B&W, then colour returns
add('s7_cu', S(155.32), bw=1, speed=0.7, at=15.0, trans=('fade', 0.6))  # "שומע רק אותך"
add('s1_embrace', S(158.36), bw=1, speed=0.7, trans=('fade', 0.5))       # "רואה רק אותך"
add('s5_close', S(162.03), speed=0.8, trans=('fade', 0.5))               # "תני לי יד"
add('s5_twirl', S(163.9), speed=0.75)                                   # "לרחבה!"
# ---- Percussion break (168.0 - 177.4): dance calls, rhythmic cuts
run(S(168.04), S(174.87), ['s1_feet', 's5_play', 's1_guitar', 's5_spin', 's7_splash', 's1_spin'])
add('s5_flare', S(174.87), speed=0.8)                                   # "ועכשיו... ביחד!"
# ---- Final chorus (177.4 - 195.3): everything, maximum energy
FIN = [('s1_twirl', {'trans': ('white', 0.3)}), 's5_spin', ('s7_splash', {'z': 1.25}), 's5_flare',
       ('s1_kiss', {'z': 1.3, 'ax': 0.8}), 's5_twirl', 's1_spin', ('s7_cu', {'z': 1.35, 'ax': 0.7}),
       's5_play', 's1_feet', ('s1_guitar', {'z': 1.2}), 's5_close']
run(S(177.38), S(190.0), FIN)
run(S(190.0), S(195.3), ['s5_flare', 's1_embrace', 's7_splash'], beats_each=3)
# ---- Outro (195.3 - end): slow down, whispers, end scene
add('s7_rock', S(195.3), speed=0.7, trans=('fade', 0.8))
add('s1_kiss', S(200.3), speed=0.65, trans=('fade', 0.8))
add('s7_cu', S(206.47), speed=0.7, at=16.0, trans=('fade', 0.6))     # "Te amo, mi amor"
add('s8_sun', S(209.58), speed=0.9, trans=('fade', 1.0))              # end scene
END = SONG_LEN

# ---------------------------------------------------------------- render
GRADE = ("eq=contrast=1.07:saturation=1.12:gamma=0.98,"
         "colorbalance=rs=0.03:bs=-0.04:rm=0.03:bm=-0.03:rh=0.02:bh=-0.02,"
         "vignette=PI/5")
GRADE_DAY = ("eq=contrast=1.05:saturation=1.05:gamma=0.97,"
             "colorbalance=rs=0.06:gs=0.01:bs=-0.07:rm=0.06:bm=-0.06:rh=0.04:bh=-0.05,"
             "vignette=PI/5")
BW = "hue=s=0,eq=contrast=1.18:brightness=-0.02,vignette=PI/4.5"

durations = {n: float(subprocess.check_output(
    ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', V(n)]))
    for n in (1, 5, 7, 8)}


def trans_dur(tr):
    return FRAME if tr in (None, 'cut') else tr[1]


def render_segments():
    os.makedirs(SEG, exist_ok=True)
    plan = []
    for i, (shot, t0, o) in enumerate(TL):
        t1 = TL[i + 1][1] if i + 1 < len(TL) else END
        nxt = TL[i + 1][2].get('trans') if i + 1 < len(TL) else None
        tail = trans_dur(nxt) if i + 1 < len(TL) else 0
        dur = t1 - t0 + tail
        scene, a, b = SHOTS[shot]
        speed = o.get('speed', 1.0)
        need = dur * speed
        if 'at' in o:
            src_in = o['at']
        else:
            src_in = cursor[shot]
            if src_in + need > b + 0.01:
                src_in = a
        if src_in + need > durations[scene] - 0.05:          # not enough footage
            speed = max(0.35, (durations[scene] - 0.05 - src_in) / dur)
            need = dur * speed
            if src_in + need > durations[scene] - 0.05:
                src_in = max(0, durations[scene] - 0.05 - need)
        cursor[shot] = src_in + need if src_in + need < b - 0.3 else a
        plan.append(dict(i=i, shot=shot, scene=scene, t0=t0, t1=t1, dur=dur, src_in=src_in,
                         speed=speed, o=o))
    for p in plan:
        o = p['o']
        f = []
        if p['speed'] < 0.99:
            f.append(f"setpts={1/p['speed']:.4f}*PTS")
            f.append("minterpolate=fps=24:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1"
                     if not PREVIEW else "fps=24")
        z = o.get('z', 1.0)
        if z > 1.0:
            ax, ay = o.get('ax', 0.5), o.get('ay', 0.45)
            f.append(f"crop=iw/{z}:ih/{z}:(iw-iw/{z})*{ax}:(ih-ih/{z})*{ay}")
        if o.get('flip'):
            f.append('hflip')
        f.append(f"scale={W}:{H}:flags=lanczos,setsar=1")
        f.append(BW if o.get('bw') else (GRADE_DAY if p['scene'] == 5 else GRADE))
        f.append(f"fps={FPS},format=yuv420p")
        out = os.path.join(SEG, f"{p['i']:03d}.mp4")
        p['file'] = out
        src_len = p['dur'] * p['speed'] + 0.25
        cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-ss', f"{p['src_in']:.3f}",
               '-t', f"{src_len:.3f}", '-i', V(p['scene']), '-an', '-vf', ','.join(f),
               '-t', f"{p['dur']:.3f}", '-c:v', 'libx264', '-preset', 'veryfast' if PREVIEW else 'medium',
               '-crf', '14', out]
        subprocess.run(cmd, check=True)
        got = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
                                             'format=duration', '-of', 'csv=p=0', out]))
        if got < p['dur'] - 0.05:
            print(f"WARN seg {p['i']} {p['shot']} short: {got:.2f} < {p['dur']:.2f}")
    json.dump([{k: v for k, v in p.items() if k != 'o'} | {'o': p['o']} for p in plan],
              open(os.path.join(OUT, 'edl.json'), 'w'), ensure_ascii=False, indent=1, default=str)
    return plan


def assemble(plan):
    inputs = []
    for p in plan:
        inputs += ['-i', p['file']]
    fc = []
    prev = '[0:v]'
    for k in range(1, len(plan)):
        tr = plan[k]['o'].get('trans', 'cut')
        d = trans_dur(tr)
        kind = 'fade' if tr == 'cut' else {'fade': 'fade', 'white': 'fadewhite', 'black': 'fadeblack'}[tr[0]]
        off = plan[k]['t0']
        lab = f'[x{k}]'
        fc.append(f"{prev}[{k}:v]xfade=transition={kind}:duration={d:.4f}:offset={off:.4f}{lab}")
        prev = lab
    # letterbox 2.2:1, subtitles, fade in/out
    bar = int(round((H - W / 2.2) / 2))
    fc.append(f"{prev}drawbox=x=0:y=0:w=iw:h={bar}:color=black:t=fill,"
              f"drawbox=x=0:y=ih-{bar}:w=iw:h={bar}:color=black:t=fill,"
              f"ass={os.path.join(OUT, 'subs.ass')}:fontsdir={os.path.join(ROOT, 'fonts')},"
              f"fade=t=in:st=0:d=1.5,fade=t=out:st={END-3.5:.2f}:d=3.5,format=yuv420p[v]")
    graph = os.path.join(OUT, 'graph.txt')
    open(graph, 'w').write(';\n'.join(fc))
    name = 'preview.mp4' if PREVIEW else 'od_laila_mami_clip.mp4'
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *inputs, '-i', SONG,
           '-filter_complex_script', graph, '-map', '[v]', '-map', f'{len(plan)}:a',
           '-c:v', 'libx264', '-preset', 'veryfast' if PREVIEW else 'slow', '-crf', '20' if PREVIEW else '17',
           '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '320k', '-t', f'{END:.2f}',
           '-movflags', '+faststart', os.path.join(OUT, name)]
    subprocess.run(cmd, check=True)
    return os.path.join(OUT, name)


if __name__ == '__main__':
    subprocess.run([sys.executable, os.path.join(ROOT, 'subs.py')], check=True)
    plan = render_segments()
    print('segments:', len(plan))
    print(assemble(plan))
