# סרטון הסבר: מה למדתי על טיקטוק

סרטון אנכי (1080×1920), 2 דקות, 30fps. כל האנימציה כתובה בקוד בתוך `index.html`, והמוזיקה נוצרת ב-`music.py`.

הפקה מחדש:

```
node render.mjs stills 3 30 60     # תמונות בדיקה ב-out/
node render.mjs video              # מרנדר את הפריימים ל-out/
python3 music.py                   # out/music.wav (לפי out/timeline.json)
```

`render.mjs video` כותב את `out/timeline.json`, מרנדר בארבעה תהליכים במקביל ומחבר את `out/music.wav`. לכן צריך להריץ את `music.py` אחרי שהרינדור התחיל ולפני שהוא נגמר, או להריץ את `render.mjs video` פעמיים.
התוצאה: `out/video.mp4`. התיקייה `out/` לא נשמרת ב-git.

כדי לשנות טקסט או תזמון: לכל אלמנט יש `data-in` (השנייה שבה הוא נכנס) ו-`data-fx` (סוג האנימציה). אם מזיזים רגע של "מכה", צריך לעדכן גם את `HITS` בסקריפט.
