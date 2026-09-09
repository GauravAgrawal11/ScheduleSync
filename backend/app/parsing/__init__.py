from app.parsing.service import extract_raw_text

# Alias for backward compatibility
parse_document = extract_raw_text

__all__ = ["extract_raw_text", "parse_document"]
