"""
Member B: Document Parsing Layer
Handles multi-format site report parsing:
- PDFs via pypdf / PyMuPDF
- Spreadsheets via pandas and openpyxl (flattened to readable lines)
- Scanned images via pytesseract and Pillow
- Word documents via python-docx
- Plain text / CSV files passed through cleanly
"""

import io
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def extract_raw_text(file_bytes: bytes, filename: str, source_type: str = "auto") -> str:
    """
    Dispatches file parsing according to file extension / source type.
    Always returns a clean string and never crashes.
    """
    if not file_bytes:
        return ""

    ext = filename.split(".")[-1].lower() if "." in filename else ""

    try:
        # 1. Plain text / CSV files
        if ext in ("txt", "log", "md", "notes"):
            return _parse_text(file_bytes)

        # 2. Spreadsheet files (Excel and tabular CSV)
        if ext in ("xlsx", "xls", "csv") or source_type == "excel":
            return _parse_spreadsheet(file_bytes, ext)

        # 3. PDF files
        if ext == "pdf" or source_type == "pdf":
            return _parse_pdf(file_bytes)

        # 4. Word documents (.docx)
        if ext in ("docx", "doc"):
            return _parse_docx(file_bytes)

        # 5. Image scans (PNG, JPG, TIFF)
        if ext in ("jpg", "jpeg", "png", "tif", "tiff", "webp") or source_type == "scan":
            return _parse_image(file_bytes)

        # 6. Audio / Voice Note files (.webm, .wav, .mp3, .ogg, .m4a, .aac, .opus)
        if ext in ("wav", "mp3", "ogg", "webm", "m4a", "aac", "opus", "flac") or source_type == "voice":
            return _parse_audio(file_bytes, filename)

        # Fallback: attempt text decode
        return _parse_text(file_bytes)

    except Exception as e:
        logger.warning(f"Error parsing file '{filename}': {e}. Falling back to text decode.")
        return _parse_text(file_bytes)


def _parse_text(file_bytes: bytes) -> str:
    """Decode raw bytes into string with fallback encodings."""
    try:
        return file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        try:
            return file_bytes.decode("latin-1")
        except Exception as e:
            return f"Binary data ({len(file_bytes)} bytes) - could not decode as text: {e}"


def _parse_spreadsheet(file_bytes: bytes, ext: str) -> str:
    """
    Flatten Excel / CSV rows into structured natural language lines
    e.g.: 'Row 1: Excavation for footing F-12 completed | Unit: 3 | Qty: 18 cum'
    """
    import pandas as pd

    buffer = io.BytesIO(file_bytes)
    try:
        if ext == "csv":
            df = pd.read_csv(buffer)
        else:
            df = pd.read_excel(buffer)
    except Exception as e:
        logger.warning(f"Pandas read failed: {e}. Trying raw text decode.")
        return _parse_text(file_bytes)

    lines = []
    headers = [str(c).strip() for c in df.columns]
    lines.append(f"Spreadsheet Columns: {', '.join(headers)}")

    for idx, row in df.iterrows():
        row_parts = []
        for col in df.columns:
            val = row[col]
            if pd.notna(val) and str(val).strip() != "":
                row_parts.append(f"{col}: {val}")
        if row_parts:
            lines.append(f"Row {idx + 1}: " + " | ".join(row_parts))

    return "\n".join(lines)


def _parse_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF pages using pypdf."""
    try:
        from pypdf import PdfReader

        reader = PdfReader(io.BytesIO(file_bytes))
        extracted_pages = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text()
            if text and text.strip():
                extracted_pages.append(f"[Page {idx + 1}]\n{text.strip()}")

        if extracted_pages:
            return "\n\n".join(extracted_pages)
        return "PDF contains no extractable text (may be a pure scanned image)."
    except Exception as e:
        logger.warning(f"PDF extraction error: {e}")
        return f"PDF parse error: {e}"


def _parse_docx(file_bytes: bytes) -> str:
    """Extract paragraphs and tables from Word docx."""
    try:
        import docx

        doc = docx.Document(io.BytesIO(file_bytes))
        lines = []
        for p in doc.paragraphs:
            if p.text.strip():
                lines.append(p.text.strip())

        for table in doc.tables:
            for row in table.rows:
                row_text = " | ".join(cell.text.strip() for cell in row.cells if cell.text.strip())
                if row_text:
                    lines.append(row_text)

        return "\n".join(lines)
    except Exception as e:
        logger.warning(f"DOCX extraction error: {e}")
        return f"DOCX parse error: {e}"


def _parse_image(file_bytes: bytes) -> str:
    """Extract text from image scans via pytesseract with graceful fallback."""
    try:
        import os
        import shutil
        from PIL import Image
        import pytesseract

        # Ensure tesseract executable path is located on Windows if not already in PATH
        if not shutil.which(pytesseract.pytesseract.tesseract_cmd):
            candidates = [
                os.getenv("TESSERACT_CMD"),
                r"C:\Program Files\Tesseract-OCR\tesseract.exe",
                r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
                os.path.expandvars(r"%LOCALAPPDATA%\Programs\Tesseract-OCR\tesseract.exe"),
            ]
            for cand in candidates:
                if cand and os.path.exists(cand):
                    pytesseract.pytesseract.tesseract_cmd = cand
                    break

        image = Image.open(io.BytesIO(file_bytes))
        ocr_text = pytesseract.image_to_string(image)
        if ocr_text.strip():
            return ocr_text.strip()
        return f"Image OCR complete. Dimensions: {image.width}x{image.height}. No clear text recognized."
    except Exception as e:
        # Fallback if tesseract executable is not in system PATH
        return f"Image scanned (size: {len(file_bytes)} bytes). Tesseract OCR not available: {e}"


def _parse_audio(file_bytes: bytes, filename: str) -> str:
    """Transcribe audio file bytes using local Whisper."""
    try:
        from app.voice.router import transcribe_audio_bytes
        res = transcribe_audio_bytes(file_bytes, filename)
        text = res.get("text", "").strip()
        if text:
            return text
        return f"Audio note recorded ({res.get('duration_seconds', 0)}s). No clear speech detected."
    except Exception as e:
        logger.warning(f"Voice transcription failed for {filename}: {e}")
        return f"Audio file attached ({filename}, {len(file_bytes)} bytes)."
