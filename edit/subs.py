#!/usr/bin/env python3
"""Build out/subs.ass from the Suno word alignment (audio/lines.json).

Hebrew lines are shown without niqqud; Spanish ad-libs go on a second line in
gold italics; Hebrew echoes in parentheses on a second, softer line.
"""
import json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
lines = json.load(open(os.path.join(ROOT, 'audio', 'lines.json')))

NIQQUD = re.compile(r'[֑-ׇ]')
SPANISH = re.compile(r'[A-Za-zÁÉÍÓÚáéíóúñ¡¿]')


def clean(s):
    return NIQQUD.sub('', s).replace('"', '״').strip()


# Manual fixes where the aligner stretched a line over a sustained note or
# chant, and the post-chorus chants it could not place.
OVERRIDE = {
    'מָאמִי...': (15.6, 17.6),
    'Contigo... siempre...': (147.0, 154.2),
    'Para siempre...': (209.5, 212.6),
    'יַאלָּה!': (214.4, 215.9),
}
SKIP_PREFIX = ('(יַאלָּה', '(אוֹ-אוֹ-אוֹ, אוֹ-אוֹ)', '(te quiero')
CHANTS = [  # post-chorus 1 (brass drop), spread on the bars after the chorus
    (73.2, 75.6, 'יאללה!', None),
    (75.7, 78.2, 'זוזי, מאמי', None),
    (78.2, 80.7, 'יאללה!', None),
    (80.8, 83.3, 'זוז, פאפי', None),
    (83.4, 85.4, None, 'Te quiero!'),
]

events = []
for s, e, txt, ok in lines:
    if txt.startswith(SKIP_PREFIX):
        continue
    if txt in OVERRIDE:
        s, e = OVERRIDE[txt]
    if txt.startswith('אַתָּה מְקַנֵּא'):
        s = 85.6
    if txt.startswith('אַף אֶחָד פֹּה לֹא עוֹזֵב (te amo)'):
        e = 195.4
    if txt.startswith('(אוֹ-אוֹ-אוֹ, אוֹ-אוֹ) מָאמִי'):
        txt, s, e = 'מָאמִי...', 139.6, 141.6
    m = re.match(r'^(.*?)\s*\(([^)]*)\)\s*$', txt)
    main, extra = (m.group(1), m.group(2)) if m else (txt, None)
    if SPANISH.search(main) and not re.search(r'[א-ת]', main):
        events.append([s, e, None, main.strip()])          # whole line Spanish
    else:
        events.append([s, e, clean(main), extra and extra.strip()])
for c in CHANTS:
    events.append(list(c))
events.sort(key=lambda x: x[0])

# timing: small lead-in, hold to the next line but never overlap / never > 5.5s
for i, ev in enumerate(events):
    nxt = events[i + 1][0] if i + 1 < len(events) else 1e9
    ev[0] = max(0, ev[0] - 0.12)
    ev[1] = min(max(ev[1] + 0.35, ev[0] + 1.2), nxt - 0.08, ev[0] + 5.5)


def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f"{h}:{m:02d}:{s:05.2f}"


HEAD = """[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: He,Rubik Light,58,&H00FFFFFF,&H000000FF,&H00101010,&H96000000,1,0,0,0,100,100,0.5,0,1,2.2,1.5,2,120,120,62,177
Style: Es,Heebo,50,&H0062C8F5,&H000000FF,&H00101010,&H96000000,0,1,0,0,100,100,1,0,1,2,1.5,2,120,120,62,0
"""
EV = "\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
out = [HEAD, EV]
FAD = r"{\fad(180,220)}"
for s, e, he, extra in events:
    if he and extra:
        if SPANISH.search(extra):
            body = f"{FAD}{he}\\N{{\\rEs\\fs42}}{extra}"
        else:
            body = f"{FAD}{he}\\N{{\\fs44\\c&H00D8D8D8&}}{clean(extra)}"
        style = 'He'
    elif he:
        body, style = FAD + he, 'He'
    else:
        body, style = FAD + extra, 'Es'
    out.append(f"Dialogue: 0,{ts(s)},{ts(e)},{style},,0,0,0,,{body}\n")
os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
open(os.path.join(ROOT, 'out', 'subs.ass'), 'w').write(''.join(out))
print(len(events), 'subtitle events')
