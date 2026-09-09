"""
Member B: Voice Module
Stateless voice note transcription supporting field chat, WhatsApp audio, and site recordings.
"""

import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, status
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


def transcribe_audio_bytes(audio_bytes: bytes, filename: str = "audio.wav") -> dict:
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
            segments, info = whisper_model.transcribe(
                tmp_path,
                beam_size=1,
                vad_filter=True,
                initial_prompt="Oil and gas refinery construction, piping, civil, electrical, instrumentation, substation, spools, welding, hydrotest."
            )
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
):
    """
    Accept an uploaded audio file (webm/mp3/wav/ogg/m4a),
    transcribe audio to text via local Faster-Whisper,
    and return clean transcribed text.
    """
    upload = file or audio
    if not upload or not upload.filename:
        raise HTTPException(status_code=400, detail="Audio file must be uploaded under field 'file' or 'audio'.")

    audio_bytes = await upload.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file received.")

    result = transcribe_audio_bytes(audio_bytes, upload.filename)
    return TranscribeResponse(
        text=result["text"],
        language_detected=result["language_detected"],
        duration_seconds=result["duration_seconds"],
    )
