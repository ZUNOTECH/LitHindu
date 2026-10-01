"""Decide whether a page's embedded text can be trusted or needs OCR."""

import re

# A page with fewer extracted characters than this is treated as scanned.
MIN_TEXT_CHARS = 50

SCRIPTS = {
    "devanagari": (0x0900, 0x097F),
    "tamil": (0x0B80, 0x0BFF),
    "latin": (0x0041, 0x024F),
}

# Common Hindi words as they come out of legacy Kruti Dev-style fonts
# (का के की है में और से ने कि). English text practically never contains these.
_LEGACY_WORDS = {"dk", "ds", "dh", "gS", "esa", "vkSj", "ls", "us", "fd", "Fkk", "gSa", ";g"}
_WORD = re.compile(r"\S+")


def script_counts(text):
    counts = dict.fromkeys(SCRIPTS, 0)
    for ch in text:
        cp = ord(ch)
        for name, (lo, hi) in SCRIPTS.items():
            if lo <= cp <= hi:
                counts[name] += 1
                break
    return counts


def main_script(counts):
    return max(counts, key=counts.get) if sum(counts.values()) else None


def looks_legacy_font(text):
    """True if the text looks like Hindi typed in a legacy (non-Unicode) font."""
    words = _WORD.findall(text)
    if len(words) < 30:
        return False
    hits = sum(1 for w in words if w.strip(".,|") in _LEGACY_WORDS)
    return hits / len(words) > 0.03


def usable_text(text):
    """True if embedded text is real, readable text rather than empty or garbage."""
    stripped = text.strip()
    if len(stripped) < MIN_TEXT_CHARS:
        return False
    if stripped.count("�") / len(stripped) > 0.05:
        return False
    return not looks_legacy_font(stripped)
