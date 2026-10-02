"""Compare OCR engines on real pages from the library, side by side.

Takes sample pages from the books whose Tesseract OCR scored lowest (or from
books you name), runs each engine on them, and writes an HTML report with
the page image next to each engine's text, for a person who reads the
script to judge.

    python ingest/compare_ocr.py                       # 3 pages from each of the 6 weakest books
    python ingest/compare_ocr.py --book rigved --book mahabhart --pages 4
    python ingest/compare_ocr.py --engines tesseract,surya

Surya (https://github.com/datalab-to/surya) is optional:
    pip install surya-ocr
The first run downloads its models (a few GB) and needs internet once.
"""

import argparse
import base64
import html
import importlib.util
import io
import re
import sqlite3
import sys
import time
from pathlib import Path

import pymupdf

import ocr
from build_library import DEFAULT_DB

REPORT = Path(__file__).resolve().parent.parent / "data" / "ocr_compare.html"


def pick_pages(conn, books, per_book, weakest):
    """Return [(title, path, lang, [page_no...])]."""
    if books:
        rows = []
        for text in books:
            rows += conn.execute(
                "SELECT id, title, path, ocr_lang FROM documents WHERE lower(path) LIKE ? "
                "AND error IS NULL", (f"%{text.lower()}%",)).fetchall()
    else:
        rows = conn.execute(
            """SELECT d.id, d.title, d.path, d.ocr_lang FROM documents d
               JOIN pages p ON p.doc_id = d.id AND p.source = 'ocr'
               WHERE d.error IS NULL GROUP BY d.id
               HAVING COUNT(*) >= ? ORDER BY AVG(p.confidence) LIMIT ?""",
            (per_book, weakest)).fetchall()
    out = []
    for doc_id, title, path, lang in rows:
        # Middle-of-book OCR pages with the most text: typical, not blank leaves.
        pages = conn.execute(
            """SELECT page_no FROM pages WHERE doc_id = ? AND source = 'ocr'
               ORDER BY ABS(page_no - (SELECT MAX(page_no) / 2 FROM pages WHERE doc_id = ?)),
                        LENGTH(text) DESC LIMIT ?""", (doc_id, doc_id, per_book * 4)).fetchall()
        pages = sorted(p[0] for p in pages)
        step = max(1, len(pages) // per_book)
        out.append((title, path, lang or "eng", pages[::step][:per_book]))
    return out


# ---------------------------------------------------------------- engines

def run_tesseract(png, lang):
    text, conf = ocr.ocr(png, lang)
    return text, f"{lang}, confidence {conf:.0f}"


_surya = None


def run_surya(png, lang):
    global _surya
    from PIL import Image  # pillow comes with surya
    if _surya is None:
        from surya.inference import SuryaInferenceManager
        from surya.recognition import RecognitionPredictor
        _surya = RecognitionPredictor(SuryaInferenceManager())
    image = Image.open(io.BytesIO(png)).convert("RGB")
    page = _surya([image], full_page=True)[0]
    blocks = sorted((b for b in page.blocks if not b.skipped), key=lambda b: b.reading_order)
    parts = []
    for b in blocks:
        t = re.sub(r"<br\s*/?>", "\n", b.html)
        t = re.sub(r"</(p|div|h\d|li|tr)>", "\n", t)
        t = html.unescape(re.sub(r"<[^>]+>", "", t)).strip()
        if t:
            parts.append(t)
    return "\n\n".join(parts), f"{len(blocks)} blocks"


ENGINES = {"tesseract": run_tesseract, "surya": run_surya}


# ---------------------------------------------------------------- report

CSS = """
body{font-family:system-ui,'Noto Sans',sans-serif;background:#111;color:#eee;margin:0;padding:24px}
h1{font-weight:500} h2{font-weight:500;margin:40px 0 8px;color:#f2b85a}
.page{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:16px;margin:12px 0 32px}
.cell{background:#1c1c1c;border:1px solid #333;border-radius:10px;padding:14px;min-width:0}
.cell h3{margin:0 0 8px;font-size:14px;color:#aaa;font-weight:500}
img{width:100%;border-radius:6px;background:#fff}
pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.6 'Noto Sans Devanagari','Noto Sans Tamil','Noto Sans Gujarati','Noto Sans Oriya',sans-serif;margin:0}
.meta{font-size:12px;color:#888;margin-top:8px}
"""


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--book", action="append", default=[], help="books whose path contains this text (repeatable)")
    ap.add_argument("--weakest", type=int, default=6, help="how many lowest-scoring books to sample")
    ap.add_argument("--pages", type=int, default=3, help="pages per book")
    ap.add_argument("--engines", default="tesseract,surya")
    ap.add_argument("--out", type=Path, default=REPORT)
    args = ap.parse_args()

    engines = [e.strip() for e in args.engines.split(",") if e.strip()]
    for e in engines:
        if e not in ENGINES:
            sys.exit(f"Unknown engine {e!r}; choose from {', '.join(ENGINES)}")
    if "surya" in engines and importlib.util.find_spec("surya") is None:
        sys.exit("Surya is not installed. Run:  pip install surya-ocr   (then try again)")

    conn = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    root = Path(conn.execute("SELECT value FROM meta WHERE key = 'library_root'").fetchone()[0])
    picks = pick_pages(conn, args.book, args.pages, args.weakest)
    if not picks:
        sys.exit("No matching books with OCR pages.")

    sections = []
    timings = {e: 0.0 for e in engines}
    total = sum(len(p[3]) for p in picks)
    done = 0
    for title, rel, lang, pages in picks:
        with pymupdf.open(root / rel) as doc:
            for n in pages:
                png = ocr.render_png(doc[n])
                jpeg = base64.b64encode(doc[n].get_pixmap(dpi=110).tobytes("jpeg")).decode()
                cells = [f'<div class="cell"><h3>Page {n + 1}</h3><img src="data:image/jpeg;base64,{jpeg}"></div>']
                for e in engines:
                    t0 = time.time()
                    try:
                        text, meta = ENGINES[e](png, lang)
                    except Exception as ex:  # keep the report going
                        text, meta = f"[{e} failed: {ex}]", ""
                    timings[e] += time.time() - t0
                    cells.append(f'<div class="cell"><h3>{e}</h3><pre>{html.escape(text)}</pre>'
                                 f'<div class="meta">{html.escape(meta)} · {time.time() - t0:.1f}s</div></div>')
                sections.append(f'<h2>{html.escape(title)} · page {n + 1}</h2>'
                                f'<div class="page" style="--cols:{len(cells)}">{"".join(cells)}</div>')
                done += 1
                print(f"\r{done}/{total} pages", end="", flush=True)
    print()

    summary = " · ".join(f"{e}: {timings[e] / total:.1f}s per page" for e in engines)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    args.out.write_text(f"<!doctype html><meta charset=utf-8><title>OCR comparison</title><style>{CSS}</style>"
                        f"<h1>OCR comparison</h1><p class=meta>{total} pages · {html.escape(summary)}</p>"
                        + "".join(sections), encoding="utf-8")
    print(f"Report: {args.out}\n{summary}")


if __name__ == "__main__":
    main()
