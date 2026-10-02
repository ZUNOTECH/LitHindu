"""Tesseract helpers: render a PDF page, run OCR, detect script and language."""

import csv
import io
import os
import shutil
import subprocess

import pymupdf

from textcheck import main_script, script_counts

# Rendering resolution for OCR. 300 dpi is Tesseract's sweet spot; very large
# pages are scaled down so no image exceeds MAX_SIDE pixels.
OCR_DPI = 300
MAX_SIDE = 5000

# Tesseract models to try for each script. Mixed-language books (Sanskrit verse with English translation,
# for example) are covered by the combined models.
CANDIDATES = {
    "devanagari": ["hin", "san", "mar", "nep", "hin+eng", "san+eng"],
    "bengali": ["ben", "ben+eng"],
    "gurmukhi": ["pan", "pan+eng"],
    "gujarati": ["guj", "guj+eng"],
    "odia": ["ori", "ori+eng"],
    "tamil": ["tam", "tam+eng"],
    "telugu": ["tel", "tel+eng"],
    "kannada": ["kan", "kan+eng"],
    "malayalam": ["mal", "mal+eng"],
    "latin": ["eng", "eng+san", "eng+hin"],
}
FALLBACK_LANG = {"devanagari": "hin+san", "tamil": "tam", "latin": "eng"}
REQUIRED_LANGS = {"eng", "hin", "san", "tam"}
# Other Indian scripts in the library. Missing ones are skipped with a warning.
OPTIONAL_LANGS = {"mar", "nep", "ben", "pan", "guj", "ori", "tel", "kan", "mal"}
# Broad model used once per sample page just to see which script it is in.
# (Tesseract's own script detection often mistakes Devanagari for Latin.)
PROBE_LANG = "hin+eng+tam+guj+ori+ben+tel+kan+mal"

# Each extra model in a combination must earn this many confidence points.
COMBO_PENALTY = 2.0

_ENV = {**os.environ, "OMP_THREAD_LIMIT": "1"}


def check_tesseract():
    """Exit with a helpful message if Tesseract or a language is missing."""
    if not shutil.which("tesseract"):
        raise SystemExit("Tesseract not found. On a Mac: brew install tesseract tesseract-lang")
    out = subprocess.run(["tesseract", "--list-langs"], capture_output=True, text=True).stdout
    have = set(out.split()[1:]) if out else set()
    missing = REQUIRED_LANGS - have
    if missing:
        raise SystemExit(f"Tesseract is missing languages: {', '.join(sorted(missing))}. "
                         "On a Mac: brew install tesseract-lang")
    global PROBE_LANG, AVAILABLE
    AVAILABLE = have
    optional_missing = OPTIONAL_LANGS - have
    if optional_missing:
        print(f"Note: Tesseract lacks {', '.join(sorted(optional_missing))}; books in those "
              "scripts will be read with the nearest available model.")
    PROBE_LANG = "+".join(code for code in PROBE_LANG.split("+") if code in have)


AVAILABLE = None


def _usable(lang):
    return AVAILABLE is None or all(code in AVAILABLE for code in lang.split("+"))


def render_png(page):
    """Render a page to a grayscale PNG suitable for OCR."""
    rect = page.rect
    zoom = OCR_DPI / 72
    longest = max(rect.width, rect.height) * zoom
    if longest > MAX_SIDE:
        zoom *= MAX_SIDE / longest
    pix = page.get_pixmap(matrix=pymupdf.Matrix(zoom, zoom), colorspace=pymupdf.csGRAY)
    return pix.tobytes("png")


def _tesseract(png, *args):
    result = subprocess.run(["tesseract", "stdin", "stdout", *args],
                            input=png, capture_output=True, env=_ENV)
    return result.stdout.decode("utf-8", errors="replace")


def ocr(png, lang):
    """Return (text, mean word confidence 0-100) for a rendered page."""
    tsv = _tesseract(png, "-l", lang, "--psm", "3", "tsv")
    lines, confs = {}, []
    reader = csv.DictReader(io.StringIO(tsv), delimiter="\t", quoting=csv.QUOTE_NONE)
    for row in reader:
        word = (row.get("text") or "").strip()
        if row.get("level") != "5" or not word:
            continue
        key = (int(row["block_num"]), int(row["par_num"]), int(row["line_num"]))
        lines.setdefault(key, []).append(word)
        conf = float(row["conf"])
        if conf >= 0:
            confs.append(conf)
    parts, prev = [], None
    for key in sorted(lines):
        if prev and key[:2] != prev[:2]:
            parts.append("")  # blank line between paragraphs
        parts.append(" ".join(lines[key]))
        prev = key
    text = "\n".join(parts)
    return text, (sum(confs) / len(confs) if confs else 0.0)


def detect_script(png):
    """Main script on a rendered page: 'devanagari', 'tamil', 'latin' or None."""
    return main_script(script_counts(ocr(png, PROBE_LANG)[0]))


def choose_language(pngs):
    """Pick the Tesseract model that reads these sample pages best.

    Returns (lang, script, confidence).
    """
    scripts = [s for s in (detect_script(p) for p in pngs) if s]
    script = max(set(scripts), key=scripts.count) if scripts else "latin"
    candidates = [c for c in CANDIDATES.get(script, ["eng"]) if _usable(c)] or ["eng"]
    best = None
    for lang in candidates:
        confs = [ocr(p, lang)[1] for p in pngs]
        score = sum(confs) / len(confs) - COMBO_PENALTY * lang.count("+")
        if best is None or score > best[0]:
            best = (score, lang)
    return best[1], script, best[0]
