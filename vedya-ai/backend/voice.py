"""
ElevenLabs voice helpers: TTS (speak explanations) + STT (voice intake).
Uses REST via httpx so we do not require the ElevenLabs SDK.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

import httpx
from dotenv import load_dotenv

# Load vedya-ai/.env then backend/.env if present
_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(_ROOT / ".env")
load_dotenv(Path(__file__).resolve().parent / ".env")

ELEVEN_TTS_URL = "https://api.elevenlabs.io/v1/text-to-speech"
ELEVEN_STT_URL = "https://api.elevenlabs.io/v1/speech-to-text"


def _api_key() -> str:
    return os.getenv("ELEVENLABS_API_KEY", "").strip()


def _voice_id() -> str:
    return os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")


def _tts_model() -> str:
    return os.getenv("ELEVENLABS_TTS_MODEL", "eleven_flash_v2_5")


def _stt_model() -> str:
    return os.getenv("ELEVENLABS_STT_MODEL", "scribe_v2")


# Ayurvedic keyterms improve STT for classical vocabulary
AYURVEDA_KEYTERMS = [
    "Jvara", "Kasa", "Pinasa", "Shotha", "Prameha", "Madhumeha",
    "Punarnavadi", "Vyaghryadi", "Kashaya", "Kashayam", "Asava", "Arishta",
    "Ghrita", "Abhaya", "Jatyadi", "Santapa", "Pratishyaya", "Shwasa",
    "Vaidya", "Ayurveda", "Rasa", "Virya", "Vipaka",
]


def voice_configured() -> bool:
    return bool(_api_key())


def voice_status() -> dict:
    return {
        "configured": voice_configured(),
        "tts_model": _tts_model(),
        "stt_model": _stt_model(),
        "default_voice_id": _voice_id(),
        "features": [
            "text_to_speech",
            "speech_to_text",
            "multilingual_narration",
            "ayurveda_keyterms",
            "compare_narration",
            "preset_case_readaloud",
        ],
    }


async def synthesize_speech(
    text: str,
    *,
    voice_id: Optional[str] = None,
    locale: str = "en",
) -> bytes:
    key = _api_key()
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set")
    if not text or not text.strip():
        raise ValueError("Empty text")

    cleaned = " ".join(text.split())
    # Demo quotas are tiny — keep spoken lines short and clear
    max_chars = int(os.getenv("ELEVENLABS_MAX_CHARS", "120"))
    if len(cleaned) > max_chars:
        cleaned = cleaned[:max_chars].rsplit(" ", 1)[0] + "."

    vid = voice_id or _voice_id()
    model = _tts_model()
    language_code = locale if locale in {"en", "hi", "gu"} else "en"

    payload = {
        "text": cleaned,
        "model_id": model,
    }
    if model.startswith("eleven_flash") or model.startswith("eleven_turbo"):
        payload["language_code"] = language_code

    headers = {
        "xi-api-key": key,
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
    }

    output_format = os.getenv("ELEVENLABS_OUTPUT_FORMAT", "mp3_44100_64")

    async with httpx.AsyncClient(timeout=60.0) as client:
        resp = await client.post(
            f"{ELEVEN_TTS_URL}/{vid}",
            headers=headers,
            params={"output_format": output_format},
            json=payload,
        )
        if resp.status_code >= 400:
            raise RuntimeError(f"ElevenLabs TTS error {resp.status_code}: {resp.text[:300]}")
        return resp.content


async def transcribe_audio(
    file_bytes: bytes,
    filename: str = "audio.webm",
    *,
    locale: str = "en",
) -> dict:
    key = _api_key()
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set")
    if not file_bytes:
        raise ValueError("Empty audio")

    language_code = locale if locale in {"en", "hi", "gu"} else None
    headers = {"xi-api-key": key}

    content_type = "audio/webm"
    lower = filename.lower()
    if lower.endswith(".wav"):
        content_type = "audio/wav"
    elif lower.endswith(".mp3"):
        content_type = "audio/mpeg"
    elif lower.endswith(".m4a"):
        content_type = "audio/mp4"

    data: list[tuple[str, str]] = [("model_id", _stt_model())]
    if language_code:
        data.append(("language_code", language_code))
    for term in AYURVEDA_KEYTERMS:
        data.append(("keyterms", term))

    files = {"file": (filename, file_bytes, content_type)}

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(ELEVEN_STT_URL, headers=headers, data=data, files=files)
        if resp.status_code >= 400:
            raise RuntimeError(f"ElevenLabs STT error {resp.status_code}: {resp.text[:400]}")
        payload = resp.json()
        text = payload.get("text") or payload.get("transcript") or ""
        return {
            "text": text.strip(),
            "language_code": payload.get("language_code") or language_code,
            "raw": {k: payload.get(k) for k in ("language_code", "language_probability") if k in payload},
        }


def build_listen_script(
    *,
    yoga_name: str,
    kalpana: str | None,
    summary: str,
    winner_reason: str | None = None,
    locale: str = "en",
) -> str:
    """Short spoken line for demos (quota-friendly)."""
    locale = locale if locale in {"en", "hi", "gu"} else "en"
    form = f" ({kalpana})" if kalpana else ""
    if locale == "hi":
        base = f"शीर्ष योग: {yoga_name}{form}."
        if winner_reason:
            return f"{base} {winner_reason}"[:180]
        return base
    if locale == "gu":
        base = f"ટોચનો યોગ: {yoga_name}{form}."
        if winner_reason:
            return f"{base} {winner_reason}"[:180]
        return base
    base = f"Top pick: {yoga_name}{form}."
    if winner_reason:
        return f"{base} {winner_reason}"[:180]
    # Prefer a short slice of summary if present
    if summary:
        short = " ".join(summary.split())[:100]
        return f"{base} {short}"
    return base + " Educational decision support only."
