"""כלי שיבוט קול מקומי: מעלים דגימת קול, כותבים טקסט, ומקבלים אודיו חדש באותו קול.

רץ כולו על המחשב שלך (ללא שירות ענן), מבוסס על Chatterbox Multilingual (23 שפות כולל עברית).
"""

import argparse
import re
import tempfile

import gradio as gr
import torch
import torchaudio
from chatterbox.mtl_tts import SUPPORTED_LANGUAGES, ChatterboxMultilingualTTS

# המודל מייצר עד ~40 שניות בכל קריאה, לכן טקסט ארוך מפוצל למקטעים.
MAX_CHUNK_CHARS = 250
PAUSE_SECONDS = 0.25

LANGUAGE_CHOICES = [(f"{name} ({code})", code) for code, name in sorted(SUPPORTED_LANGUAGES.items(), key=lambda kv: kv[1])]


def pick_device() -> str:
    if torch.cuda.is_available():
        return "cuda"
    if torch.backends.mps.is_available():
        return "mps"
    return "cpu"


DEVICE = pick_device()
_model = None


def get_model() -> ChatterboxMultilingualTTS:
    global _model
    if _model is None:
        print(f"Loading model on {DEVICE} (first run downloads ~3GB)...")
        _model = ChatterboxMultilingualTTS.from_pretrained(device=DEVICE)
    return _model


def split_text(text: str, limit: int = MAX_CHUNK_CHARS) -> list[str]:
    """מפצל לפי סופי משפטים, ומאחד משפטים קצרים עד למגבלת התווים."""
    sentences = [s.strip() for s in re.split(r"(?<=[.!?。！？؟…])\s+|\n+", text) if s.strip()]
    chunks, current = [], ""
    for sentence in sentences:
        # משפט ארוך מדי בפני עצמו מפוצל לפי פסיקים/רווחים.
        while len(sentence) > limit:
            cut = max(sentence.rfind(",", 0, limit), sentence.rfind(" ", 0, limit))
            cut = cut if cut > 0 else limit - 1
            chunks.append(sentence[: cut + 1].strip())
            sentence = sentence[cut + 1 :].strip()
        if current and len(current) + 1 + len(sentence) > limit:
            chunks.append(current)
            current = sentence
        else:
            current = f"{current} {sentence}".strip()
    if current:
        chunks.append(current)
    return chunks


def synthesize(reference_audio, text, language, consent, exaggeration, cfg_weight, temperature, progress=gr.Progress()):
    if not consent:
        raise gr.Error("יש לאשר שיש לך הסכמה של בעל הקול לפני יצירת אודיו.")
    if not reference_audio:
        raise gr.Error("יש להעלות או להקליט דגימת קול (מומלץ 10–30 שניות, נקייה מרעשים).")
    if not text or not text.strip():
        raise gr.Error("יש לכתוב טקסט.")

    model = get_model()
    chunks = split_text(text)
    pause = torch.zeros(1, int(model.sr * PAUSE_SECONDS))
    pieces = []
    for i, chunk in enumerate(progress.tqdm(chunks, desc="יוצר אודיו")):
        wav = model.generate(
            chunk,
            language_id=language,
            audio_prompt_path=reference_audio,
            exaggeration=exaggeration,
            cfg_weight=cfg_weight,
            temperature=temperature,
        )
        if i:
            pieces.append(pause)
        pieces.append(wav.cpu())

    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    torchaudio.save(out.name, torch.cat(pieces, dim=1), model.sr)
    return out.name


def build_ui() -> gr.Blocks:
    with gr.Blocks(title="שיבוט קול מקומי") as demo:
        gr.Markdown(
            "# 🎙️ שיבוט קול מקומי\n"
            "מעלים דגימת קול, כותבים טקסט בכל אחת מ־23 השפות, ומקבלים אודיו באותו קול. "
            "הכול רץ על המחשב שלך. כל קובץ שנוצר מסומן בסימן מים בלתי־נשמע (Perth) שמזהה אותו כאודיו סינתטי.\n\n"
            "⚠️ השתמש רק בקול שלך או בקול של מי שנתן לך רשות מפורשת."
        )
        with gr.Row():
            with gr.Column():
                reference = gr.Audio(label="דגימת קול (העלאה או הקלטה)", sources=["upload", "microphone"], type="filepath")
                language = gr.Dropdown(LANGUAGE_CHOICES, value="he", label="שפת הטקסט")
                text = gr.Textbox(label="טקסט להקראה", lines=6, rtl=True, placeholder="כתוב כאן את מה שהקול יגיד...")
                consent = gr.Checkbox(label="אני מאשר/ת שזה הקול שלי או שיש לי הסכמה מפורשת של בעל הקול")
                with gr.Accordion("הגדרות מתקדמות", open=False):
                    exaggeration = gr.Slider(0.25, 2.0, value=0.5, step=0.05, label="הבעה / רגש")
                    cfg_weight = gr.Slider(0.0, 1.0, value=0.5, step=0.05, label="קצב והיצמדות לדגימה (0 = מתאים כשהשפה שונה משפת הדגימה)")
                    temperature = gr.Slider(0.05, 2.0, value=0.8, step=0.05, label="אקראיות")
                button = gr.Button("צור אודיו", variant="primary")
            with gr.Column():
                output = gr.Audio(label="תוצאה", type="filepath")
        button.click(
            synthesize,
            inputs=[reference, text, language, consent, exaggeration, cfg_weight, temperature],
            outputs=output,
        )
    return demo


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Local multilingual voice cloning UI")
    parser.add_argument("--host", default="127.0.0.1", help="use 0.0.0.0 to open from other devices on your network")
    parser.add_argument("--port", type=int, default=7860)
    parser.add_argument("--share", action="store_true", help="create a temporary public link (e.g. for Google Colab)")
    args = parser.parse_args()
    if args.share:
        get_model()  # טוען מראש, כדי שהקישור יופיע רק כשהכלי מוכן
    build_ui().queue().launch(server_name=args.host, server_port=args.port, share=args.share)
