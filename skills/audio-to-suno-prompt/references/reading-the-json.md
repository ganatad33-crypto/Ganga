# מפת השדות ב-JSON

קרא את הקובץ הזה כשאתה צריך שדה שלא מכוסה ב-SKILL.md — למשל כשהמשתמש שואל שאלה נקודתית על הטראק, או כשאתה רוצה לבסס בחירה בפרומפט על מדידה ספציפית.

## source
| שדה | משמעות |
|---|---|
| `duration_seconds`, `duration_formatted` | אורך הקטע שנותח (מוגבל ב-`--max-seconds`) |
| `sample_rate`, `channels` | תכונות הקובץ המקורי |

## rhythm
| שדה | משמעות |
|---|---|
| `bpm` | הקריאה הסופית, אחרי חידוד על גריד הפעימות |
| `bpm_candidates` | קריאות חלופיות. שתי קריאות ביחס 1:2 = ספק half/double time |
| `time_signature`, `beats_per_bar` | 4/4 או 3/4 |
| `tempo_stability` | 1.0 = גריד מתוכנת. מתחת ל-0.55 = נגינה חיה |
| `swing` | 0 = אייטים ישרים. מעל 0.55 = שאפל טריולי |
| `onset_rate_per_sec` | צפיפות אירועים. מעל 7 = עמוס, מתחת ל-2 = דליל |
| `percussive_ratio` | חלק האנרגיה בכלי הקשה. מתחת ל-0.3 = כמעט בלי תופים |

## tonality
| שדה | משמעות |
|---|---|
| `key`, `mode`, `key_name` | הטוניקה והמוד |
| `confidence` | מתחת ל-0.4 — אל תסמוך על הסולם |
| `alternates` | שלוש הקריאות הבאות בדירוג |
| `chord_progression` | הלופ החוזר שזוהה |
| `roman_progression` | אותו לופ בספרות רומיות — זה מה שכדאי לכתוב בפרומפט |
| `chord_timeline` | כל האקורדים עם זמנים. שימושי לשאלות "מה קורה בשנייה 40" |
| `chord_changes_per_min` | מתחת ל-6 = הרמוניה סטטית. מעל 40 = ג'אזי |
| `chromatic_density` | כמה אנרגיה מחוץ לסולם |

## melody
| שדה | משמעות |
|---|---|
| `source` | `basic-pitch (top voice)` = המסלול הטוב. `pyin` = מסלול הגיבוי |
| `polyphony` | כמה תווים נשמעים בו-זמנית בממוצע |
| `note_sequence` | עד 64 תווים ראשונים בשמות |
| `range_semitones`, `lowest_note`, `highest_note`, `median_note` | הטווח והמרכז |
| `contour` | תיאור מילולי של צורת הקו |
| `leap_ratio` | מעל 0.45 = מלודיה קופצנית |
| `vibrato_strength` | ויברטו והחלקות |

## timbre
| שדה | משמעות |
|---|---|
| `spectral_centroid_hz` | בהירות. מתחת ל-1100 = כהה. מעל 3200 = בהיר |
| `band_balance` | פילוח אנרגיה: sub, bass, low_mid, mid, high_mid, air |
| `crest_factor_db` | מתחת ל-8 = דחוס מאוד. מעל 16 = דינמי וטבעי |
| `dynamic_range_db` | טווח דינמי לאורך הסידור |
| `descriptors`, `production_notes` | תיאורים מילוליים מוכנים לשימוש בפרומפט |

## structure
`sections` — כל קטע עם `label`, `start`, `duration`, `energy`. ה-`label` הוא ניחוש מבוסס אנרגיה ומיקום: intro, verse, build-up, chorus/drop, breakdown, outro, או `main loop` כשאין ניגודיות.

## instrumentation
`hints` — זוגות של [שם, ציון]. מעל 0.6 ראוי לפרומפט, 0.4–0.6 בזהירות, מתחת ל-0.4 התעלם.
`likely_vocal` + `vocal_confidence` — מדד גס בלבד.
`estimated_layers`, `texture` — צפיפות הסידור.

## stems / transcription
`stems.levels_db` — עוצמת כל סטם. `stems.backend` הוא `dsp` או `demucs:...`.
`transcription.note_count` — כמה תווים תומללו בסך הכל (לפני חילוץ הקול העליון).

## suno_prompt
`style_short` (עד 200 תווים), `style_long` (עד 1000), `exclude`, `structure_block`, `summary`.
