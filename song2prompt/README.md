# song2prompt

כלי שורת-פקודה שמנתח קובץ אודיו של שיר ומפיק:

- **עובדות מדודות**: BPM, סולם/טונליות משוער, טווח דינמי, בהירות ספקטרלית, יחס פרקוסיבי/הרמוני, נוכחות סאב-בס
- **ציר זמן אנרגיה** משוער (Intro/Build/Drop/Breakdown/Outro) — היוריסטיקה מבוססת אנרגיה, לא זיהוי הרמוני אמיתי
- **טיוטת פרומפט ל-[Suno](https://suno.com)** בפורמט Style / Exclude / Structure

> **חשוב להבין את הגבולות:** הכלי הזה לא מתמלל תווים ("נוטות") מדויקות מתוך אודיו מלא —
> זו משימה שאפילו כלים מסחריים לא פותרים היטב כשיש ווקאל וכלים מעורבבים. הוא גם **לא
> מזהה ז'אנר** — אין כאן מודל סיווג. מה שהוא כן עושה טוב: BPM, מבנה אנרגיה, וזיהוי
> טקסטורה/כלים גסים. משדה ה-Style בפלט מכוונת במפורש `<GENRE — fill in manually>` במקום
> לנחש — ניחוש BPM-בלבד (למשל "128 BPM אז זה טכנו") נכשל באופן צפוי על כל דבר שהוא לא
> מוזיקה אלקטרונית טהורה (רגאטון, היפ-הופ, פופ, רוק וכו'). מלא את הז'אנר בעצמך, ואם
> מדובר בז'אנר אלקטרוני — קח את הטיוטה ותן אותה ל-Claude עם הסקיל `suno-electronic`
> לחידוד תת-הז'אנר המדויק ותגיות ההבדלה מהשכן הקרוב.

## התקנה

```bash
pip install -e .
```

הפרדת שכבות (זיהוי נוכחות ווקאל/תופים/בס/שאר) היא תוסף אופציונלי — כבדה יותר (מתקינה
PyTorch):

```bash
pip install -e ".[stems]"
```

## שימוש

```bash
song2prompt path/to/song.mp3
```

עם הפרדת שכבות (Demucs), לזיהוי נוכחות ווקאל/תופים/בס בפועל:

```bash
song2prompt path/to/song.mp3 --stems
```

שמירת הנתונים הגולמיים כ-JSON (שימושי אם רוצים לעבד את הפלט תוכנתית):

```bash
song2prompt path/to/song.mp3 --json out/analysis.json
```

## מבנה הפרויקט

| קובץ | תפקיד |
|---|---|
| `song2prompt/audio_features.py` | BPM, סולם, מבנה אנרגיה, טקסטורה (librosa בלבד) |
| `song2prompt/stems.py` | הפרדת שכבות אופציונלית עם Demucs |
| `song2prompt/prompt_builder.py` | הרכבת הדוח והטיוטה בפורמט Suno |
| `song2prompt/cli.py` | ממשק שורת הפקודה |

## דוגמת פלט (מקוצר)

```
## 1. עובדות מדודות (לא ניחוש)
- BPM: 128.0
- סולם משוער: A minor (רמת ביטחון: 0.87)
...

## 4. טיוטת פרומפט ל-Suno
### Style (טיוטה)
<GENRE — fill in manually, the tool does not classify genre>, 128.0 BPM, percussion-forward, punchy rhythmic groove, deep rolling sub bass, dark, warm texture, wide dynamic range, strong builds

### Exclude (טיוטה)
festival EDM, big room drop, generic supersaw lead
```
