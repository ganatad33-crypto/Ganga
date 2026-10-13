"""יוצר מחדש את colab.ipynb מתוך app.py — להריץ אחרי כל שינוי ב־app.py."""

import json
from pathlib import Path

here = Path(__file__).parent


def md(text):
    return {"cell_type": "markdown", "metadata": {}, "source": text.strip().splitlines(keepends=True)}


def code(text, title=None):
    meta = {"cellView": "form"} if title else {}
    return {"cell_type": "code", "metadata": meta, "execution_count": None, "outputs": [], "source": text.strip().splitlines(keepends=True)}


app_source = (here / "app.py").read_text(encoding="utf-8")

cells = [
    md("""
# 🎙️ שיבוט קול — גרסת Colab (עובד מהטלפון)

**לפני שמתחילים:** בתפריט למעלה ← **Runtime / סביבת זמן ריצה** ← **Change runtime type / שינוי סוג** ← בוחרים **T4 GPU** ← שמירה.

אחר כך לוחצים ▶️ על כל אחד משלושת התאים למטה, לפי הסדר.
בסוף תאי 3 יופיע קישור שמסתיים ב־`gradio.live` — לוחצים עליו ומשתמשים בכלי.

⚠️ להשתמש רק בקול שלך או בקול של מי שנתן לך רשות מפורשת.
"""),
    code("""
#@title 1️⃣ התקנה (כ־3–5 דקות, פעם אחת בכל הפעלה)
import subprocess
gpu = subprocess.run(["nvidia-smi", "-L"], capture_output=True, text=True).stdout
print("✅ כרטיס מסך:", gpu.strip()) if gpu else print("⚠️ אין כרטיס מסך! Runtime ← Change runtime type ← T4 GPU, ואז להריץ שוב.")
!pip install -q chatterbox-tts==0.1.7
print("✅ ההתקנה הסתיימה")
""", title=True),
    code("%%writefile app.py\n#@title 2️⃣ קוד הכלי (לא צריך לשנות כלום)\n" + app_source, title=True),
    code("""
#@title 3️⃣ הפעלה — מחכים לקישור gradio.live ולוחצים עליו
# בהפעלה הראשונה המודל יורד (~3GB), לוקח כמה דקות. התא ממשיך "לרוץ" כל עוד הכלי פתוח — זה תקין.
!python app.py --share
""", title=True),
    md("""
### טיפים
- **השאר את לשונית ה־Colab פתוחה** בזמן השימוש. אם הטלפון סוגר אותה ברקע, הכלי נעצר ואז מריצים שוב את תא 3 (ואם עבר הרבה זמן, את כל התאים).
- הקישור תקף לכ־72 שעות או עד שהסשן נסגר. בגרסה החינמית של Colab יש מגבלת זמן שימוש יומית בכרטיס המסך.
- כל מי שיש לו את הקישור יכול להשתמש בכלי — אל תפרסם אותו.
- דגימת קול טובה: 10–30 שניות, דובר אחד, בלי מוזיקה ורעשים.
- דגימה בשפה אחת וטקסט בשפה אחרת? בהגדרות מתקדמות הורד את "קצב והיצמדות לדגימה" ל־0.
"""),
]

notebook = {
    "nbformat": 4,
    "nbformat_minor": 0,
    "metadata": {
        "accelerator": "GPU",
        "colab": {"provenance": [], "gpuType": "T4", "name": "voice_clone.ipynb"},
        "kernelspec": {"name": "python3", "display_name": "Python 3"},
        "language_info": {"name": "python"},
    },
    "cells": cells,
}

(here / "colab.ipynb").write_text(json.dumps(notebook, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print("wrote colab.ipynb")
