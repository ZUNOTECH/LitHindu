"""Decide whether a page's embedded text can be trusted or needs OCR."""

import re

# Bump when the checks below change, so the build re-checks stored pages.
VERSION = 2

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


_INDIC = re.compile(r"[\u0900-\u097F\u0B80-\u0BFF]")
_LATIN = re.compile(r"[A-Za-z\u00C0-\u02FF]")


def looks_broken_unicode(text):
    """True if Indic text came out garbled, e.g. धर्मक्षेत्रे as 'धùमZेŕे'.

    PDFs whose fonts lack proper character maps extract conjuncts as stray
    Latin letters inside Devanagari or Tamil words, which real text never has.
    """
    indic_words = [w for w in _WORD.findall(text) if _INDIC.search(w)]
    if len(indic_words) < 5:
        return False
    mixed = sum(1 for w in indic_words if _LATIN.search(w))
    return mixed / len(indic_words) > 0.1


def usable_text(text):
    """True if embedded text is real, readable text rather than empty or garbage."""
    stripped = text.strip()
    if len(stripped) < MIN_TEXT_CHARS:
        return False
    if stripped.count("�") / len(stripped) > 0.05:
        return False
    return not (looks_legacy_font(stripped) or looks_broken_unicode(stripped))
