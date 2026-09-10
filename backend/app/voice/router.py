"""
Member B: Voice Module
Stateless voice note transcription supporting field chat, WhatsApp audio, and site recordings.
"""

import logging
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from typing import Optional
from pydantic import BaseModel

router = APIRouter(tags=["Voice"])
logger = logging.getLogger(__name__)


class TranscribeResponse(BaseModel):
    text: str
    language_detected: str = "en"
    duration_seconds: float = 0.0


# Global lazy-loaded Whisper model singleton for fast sub-second inference
_whisper_model = None

def get_whisper_model():
    global _whisper_model
    if _whisper_model is None:
        try:
            from faster_whisper import WhisperModel
            logger.info("Initializing faster-whisper model (tiny, int8 CPU)...")
            _whisper_model = WhisperModel("tiny", device="cpu", compute_type="int8")
            logger.info("faster-whisper model initialized successfully!")
        except Exception as e:
            logger.warning(f"Could not load faster-whisper: {e}")
            _whisper_model = False
    return _whisper_model if _whisper_model is not False else None


def transcribe_audio_bytes(audio_bytes: bytes, filename: str = "audio.wav", language_hint: Optional[str] = None) -> dict:
    """
    Transcribe raw audio bytes using local Faster-Whisper.
    Supports .webm, .wav, .mp3, .ogg, .m4a, .aac, .opus.
    Returns dict with keys: text, language_detected, duration_seconds.
    """
    if not audio_bytes:
        return {
            "text": "",
            "language_detected": "en",
            "duration_seconds": 0.0,
        }

    whisper_model = get_whisper_model()
    if whisper_model:
        import tempfile
        import os

        ext = filename.split(".")[-1].lower() if "." in filename else "wav"
        if ext not in ("wav", "webm", "ogg", "mp3", "m4a", "flac", "opus", "aac"):
            ext = "wav"

        with tempfile.NamedTemporaryFile(suffix=f".{ext}", delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name

        try:
            # Pass language hint if valid 2-letter ISO code
            kwargs = {
                "beam_size": 1,
                "vad_filter": True,
                "initial_prompt": "Oil and gas refinery construction, piping, civil, electrical, instrumentation, substation, spools, welding, hydrotest."
            }
            if language_hint and len(language_hint) == 2:
                kwargs["language"] = language_hint

            segments, info = whisper_model.transcribe(tmp_path, **kwargs)
            transcribed_text = " ".join(seg.text for seg in segments).strip()
            return {
                "text": transcribed_text,
                "language_detected": info.language or "en",
                "duration_seconds": round(info.duration or 0.0, 2),
            }
        except Exception as e:
            logger.warning(f"Local faster-whisper transcription error: {e}")
        finally:
            if os.path.exists(tmp_path):
                try:
                    os.remove(tmp_path)
                except Exception:
                    pass

    return {
        "text": "",
        "language_detected": "en",
        "duration_seconds": 0.0,
    }


@router.post("/transcribe", response_model=TranscribeResponse, status_code=status.HTTP_200_OK)
async def transcribe_voice(
    file: UploadFile = File(None),
    audio: UploadFile = File(None),
    language: Optional[str] = Form(None),
):
    """
    Accept an uploaded audio file (webm/mp3/wav/ogg/m4a),
    transcribe audio to text via local Faster-Whisper,
    and return clean transcribed text with regional language support.
    """
    upload = file or audio
    if not upload or not upload.filename:
        raise HTTPException(status_code=400, detail="Audio file must be uploaded under field 'file' or 'audio'.")

    audio_bytes = await upload.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file received.")

    lang_code = language.strip().lower() if language else None
    result = transcribe_audio_bytes(audio_bytes, upload.filename, language_hint=lang_code)
    return TranscribeResponse(
        text=result["text"],
        language_detected=result["language_detected"],
        duration_seconds=result["duration_seconds"],
    )


class TranslateRequest(BaseModel):
    text: str
    target_lang: str = "en"  # "en" or "hi"
    source_lang: Optional[str] = None


class TranslateResponse(BaseModel):
    original_text: str
    translated_text: str
    target_lang: str


def translate_text_internal(text: str, target_lang: str = "en") -> str:
    """
    Programmatic helper to translate any site report text to target_lang (default 'en' for admin panel).
    Preserves engineering line numbers, equipment tags, and quantities.
    """
    if not text or not text.strip():
        return text or ""
    req = TranslateRequest(text=text, target_lang=target_lang)
    res = translate_text(req)
    return res.translated_text or text


@router.post("/translate", response_model=TranslateResponse, status_code=status.HTTP_200_OK)
def translate_text(req: TranslateRequest):
    """
    Translate supervisor site notes between Hindi and English with construction domain preservation.
    Preserves equipment tags, line IDs (e.g. Line 24, Unit 3), and engineering metrics.
    """
    import os
    from dotenv import load_dotenv
    load_dotenv()

    text_to_translate = (req.text or "").strip()
    if not text_to_translate:
        return TranslateResponse(
            original_text="",
            translated_text="",
            target_lang=req.target_lang,
        )

    target_language = "English" if req.target_lang == "en" else "Hindi"
    gemini_key = os.getenv("GEMINI_API_KEY")

    if gemini_key:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=gemini_key)
            configured_model = os.getenv("GEMINI_MODEL", "gemini-3.5-flash-lite")
            candidate_models = [configured_model, "gemini-3.5-flash-lite", "gemini-3.6-flash", "gemini-3.7-flash"]
            # Deduplicate preserving order
            seen_models = set()
            models_to_try = [m for m in candidate_models if not (m in seen_models or seen_models.add(m))]

            prompt = (
                f"You are an on-site engineering translator for refinery and construction projects.\n"
                f"Translate the following field progress note into {target_language}.\n\n"
                f"STRICT INSTRUCTIONS:\n"
                f"1. Output ONLY the single translated sentence. Do not provide options, explanations, markdown quotes, or greetings.\n"
                f"2. Keep all engineering tags and line numbers (e.g. Line 24, Unit 3, P-101, SP-001) unchanged.\n\n"
                f"Input text:\n{text_to_translate}"
            )

            resp = None
            for model_candidate in models_to_try:
                try:
                    resp = client.models.generate_content(
                        model=model_candidate,
                        contents=prompt,
                        config=types.GenerateContentConfig(
                            temperature=0.0,
                        ),
                    )
                    if resp and resp.text:
                        break
                except Exception as candidate_err:
                    logger.warning(f"Model {model_candidate} translation error: {candidate_err}. Trying fallback...")
                    continue

            if resp and resp.text:
                clean_translation = resp.text.strip().strip('"').strip("'").strip("`")
                # Strip out any markdown block formatting if present
                if "\n" in clean_translation:
                    clean_translation = clean_translation.split("\n")[0].strip()
                return TranslateResponse(
                    original_text=text_to_translate,
                    translated_text=clean_translation,
                    target_lang=req.target_lang,
                )
        except Exception as e:
            logger.warning(f"Gemini translation error: {e}. Returning original text.")

    # Graceful fallback: return original text if translation service is unreachable
    return TranslateResponse(
        original_text=text_to_translate,
        translated_text=text_to_translate,
        target_lang=req.target_lang,
    )


