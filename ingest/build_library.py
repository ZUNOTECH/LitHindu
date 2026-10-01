"""Build the Lit Hindu library database from a folder of PDFs.

Every page of every PDF ends up as searchable text in one SQLite file:
pages with a good embedded text layer are extracted directly, and scanned
pages (or pages typed in legacy Hindi fonts) are OCR'd with Tesseract in the
language that reads each book best.

The build is resumable: stop it at any time (Ctrl+C, closing the laptop) and
run the same command again to continue where it left off.

    python ingest/build_library.py "/path/to/library"
"""

import argparse
import os
import signal
import sqlite3
import sys
import time
from collections import deque
from concurrent.futures import FIRST_COMPLETED, ProcessPoolExecutor, as_completed, wait
from pathlib import Path

import pymupdf

import ocr
import textcheck
from textcheck import looks_broken_unicode, looks_legacy_font, main_script, script_counts, usable_text

DEFAULT_DB = Path(__file__).resolve().parent.parent / "data" / "library.db"
CLASSIFY_SAMPLES = 12  # pages inspected per book to classify it
LANG_SAMPLES = 2       # scanned pages OCR'd per book to pick its language
CHUNK = 8              # consecutive pages handed to a worker at once

SCHEMA = """
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS documents (
    id          INTEGER PRIMARY KEY,
    path        TEXT UNIQUE NOT NULL,   -- relative to the library folder
    size        INTEGER NOT NULL,
    title       TEXT,
    pages       INTEGER,
    script      TEXT,                   -- main script of the embedded text
    legacy_font INTEGER,                -- 1 if the text layer is garbled or in a legacy Hindi font
    ocr_lang    TEXT,                   -- Tesseract model for scanned pages
    ocr_script  TEXT,                   -- script Tesseract detected on scans
    classified  INTEGER NOT NULL DEFAULT 0,
    error       TEXT
);

CREATE TABLE IF NOT EXISTS pages (
    id          INTEGER PRIMARY KEY,
    doc_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_no     INTEGER NOT NULL,       -- 0-based
    text        TEXT NOT NULL,
    source      TEXT NOT NULL,          -- 'text', 'ocr' or 'empty'
    confidence  REAL,                   -- OCR word confidence, 0-100
    UNIQUE (doc_id, page_no)
);

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
    text, content = 'pages', content_rowid = 'id',
    -- M* keeps Indic vowel signs (matras) inside words; remove_diacritics
    -- lets 'siva' find 'śiva'.
    tokenize = "unicode61 remove_diacritics 2 categories 'L* N* Co M*'"
);

CREATE TRIGGER IF NOT EXISTS pages_ai AFTER INSERT ON pages BEGIN
    INSERT INTO pages_fts (rowid, text) VALUES (new.id, new.text);
END;
CREATE TRIGGER IF NOT EXISTS pages_ad AFTER DELETE ON pages BEGIN
    INSERT INTO pages_fts (pages_fts, rowid, text) VALUES ('delete', old.id, old.text);
END;
CREATE TRIGGER IF NOT EXISTS pages_au AFTER UPDATE ON pages BEGIN
    INSERT INTO pages_fts (pages_fts, rowid, text) VALUES ('delete', old.id, old.text);
    INSERT INTO pages_fts (rowid, text) VALUES (new.id, new.text);
END;
"""


def connect(db_path):
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.executescript(SCHEMA)
    return conn


def sample_indexes(n, k):
    if n <= k:
        return list(range(n))
    step = n / k
    return sorted({int(i * step + step / 2) for i in range(k)})


def title_from_path(path):
    return " ".join(path.stem.replace("_", " ").replace("-", " ").split())


# ---------------------------------------------------------------- registering

def register(conn, root, only):
    pdfs = sorted(p for p in root.rglob("*") if p.suffix.lower() == ".pdf")
    if only:
        pdfs = [p for p in pdfs if only.lower() in str(p).lower()]
    added = 0
    for p in pdfs:
        rel = str(p.relative_to(root))
        size = p.stat().st_size
        row = conn.execute("SELECT id, size FROM documents WHERE path = ?", (rel,)).fetchone()
        if row and row[1] == size:
            continue
        if row:  # file was replaced: start that book over
            conn.execute("DELETE FROM documents WHERE id = ?", (row[0],))
        conn.execute("INSERT INTO documents (path, size, title) VALUES (?, ?, ?)",
                     (rel, size, title_from_path(p)))
        added += 1
    conn.execute("INSERT OR REPLACE INTO meta VALUES ('library_root', ?)", (str(root),))
    conn.commit()
    return [str(p.relative_to(root)) for p in pdfs], added


def recheck_text_pages(conn):
    """Send stored pages back for OCR if improved checks now reject their text.

    Books whose language was never detected (all sampled pages looked like
    good text) are re-classified so their OCR uses the right language.
    """
    row = conn.execute("SELECT value FROM meta WHERE key = 'textcheck_version'").fetchone()
    if row and int(row[0]) >= textcheck.VERSION:
        return
    redo = 0
    for doc_id, ocr_script in conn.execute(
            "SELECT id, ocr_script FROM documents WHERE classified = 1").fetchall():
        bad = [pid for pid, text in conn.execute(
            "SELECT id, text FROM pages WHERE doc_id = ? AND source = 'text'", (doc_id,))
            if not usable_text(text)]
        if not bad:
            continue
        conn.executemany("DELETE FROM pages WHERE id = ?", [(pid,) for pid in bad])
        if ocr_script is None:
            conn.execute("UPDATE documents SET classified = 0 WHERE id = ?", (doc_id,))
        redo += len(bad)
    conn.execute("INSERT OR REPLACE INTO meta VALUES ('textcheck_version', ?)",
                 (str(textcheck.VERSION),))
    conn.commit()
    if redo:
        print(f"Re-checking stored text: {redo:,} pages had garbled text and will be OCR'd.")


# ---------------------------------------------------------------- workers

def _init_worker():
    # Ctrl+C is handled by the main process, which lets running pages finish.
    signal.signal(signal.SIGINT, signal.SIG_IGN)


def classify(path):
    """Inspect a book: page count, scripts, legacy fonts and best OCR language."""
    result = {"error": None}
    try:
        with pymupdf.open(path) as doc:
            if doc.needs_pass:
                return {"error": "password protected"}
            result["pages"] = doc.page_count
            counts = dict.fromkeys(("devanagari", "tamil", "latin"), 0)
            legacy, needs_ocr = 0, []
            for i in sample_indexes(doc.page_count, CLASSIFY_SAMPLES):
                text = doc[i].get_text()
                for k, v in script_counts(text).items():
                    counts[k] += v
                legacy += looks_legacy_font(text) or looks_broken_unicode(text)
                if not usable_text(text):
                    needs_ocr.append(i)
            script = main_script(counts)
            result["script"] = script
            result["legacy_font"] = int(legacy > 0)
            if needs_ocr:
                # Sample from the middle of the book, away from covers and blank leaves.
                mid = len(needs_ocr) // 2
                chosen = needs_ocr[max(0, mid - LANG_SAMPLES // 2):][:LANG_SAMPLES]
                pngs = [ocr.render_png(doc[i]) for i in chosen]
                lang, ocr_script, _ = ocr.choose_language(pngs)
                result["ocr_lang"], result["ocr_script"] = lang, ocr_script
            else:
                # Every sampled page had text; keep a sensible model for any that don't.
                result["ocr_lang"] = ocr.FALLBACK_LANG.get(script, "eng")
                result["ocr_script"] = None
    except Exception as e:  # corrupt or unreadable file
        return {"error": str(e)}
    return result


_open_doc = (None, None)


def process_pages(path, lang, page_numbers):
    """Extract or OCR the given pages. Returns [(page_no, text, source, confidence)]."""
    global _open_doc
    if _open_doc[0] != path:
        if _open_doc[1] is not None:
            _open_doc[1].close()
        _open_doc = (path, pymupdf.open(path))
    doc = _open_doc[1]
    out = []
    for n in page_numbers:
        page = doc[n]
        text = page.get_text()
        if usable_text(text):
            out.append((n, text, "text", None))
            continue
        text, conf = ocr.ocr(ocr.render_png(page), lang)
        if text.strip():
            out.append((n, text, "ocr", round(conf, 1)))
        else:
            out.append((n, "", "empty", None))
    return out


# ---------------------------------------------------------------- phases

def run_classify(conn, root, paths, pool):
    todo = conn.execute(
        f"SELECT id, path FROM documents WHERE classified = 0 AND path IN "
        f"({','.join('?' * len(paths))})", paths).fetchall()
    if not todo:
        return
    print(f"Classifying {len(todo)} books (sampling pages, detecting languages)...")
    futures = {pool.submit(classify, str(root / p)): (i, p) for i, p in todo}
    for n, fut in enumerate(as_completed(futures), 1):
        doc_id, rel = futures[fut]
        r = fut.result()
        conn.execute(
            "UPDATE documents SET pages = ?, script = ?, legacy_font = ?, ocr_lang = ?, "
            "ocr_script = ?, error = ?, classified = 1 WHERE id = ?",
            (r.get("pages"), r.get("script"), r.get("legacy_font"), r.get("ocr_lang"),
             r.get("ocr_script"), r["error"], doc_id))
        conn.commit()
        print(f"\r  {n}/{len(todo)}  {rel[:70]:<70}", end="", flush=True)
    print()


def pending_chunks(conn, paths):
    docs = conn.execute(
        f"SELECT id, path, pages, ocr_lang FROM documents WHERE classified = 1 AND error IS NULL "
        f"AND path IN ({','.join('?' * len(paths))}) ORDER BY id", paths).fetchall()
    chunks = []
    for doc_id, rel, pages, lang in docs:
        done = {r[0] for r in conn.execute("SELECT page_no FROM pages WHERE doc_id = ?", (doc_id,))}
        missing = [n for n in range(pages) if n not in done]
        for i in range(0, len(missing), CHUNK):
            chunks.append((doc_id, rel, lang, missing[i:i + CHUNK]))
    return chunks


def run_pages(conn, root, paths, pool, workers):
    chunks = pending_chunks(conn, paths)
    total = sum(len(c[3]) for c in chunks)
    if not total:
        return True
    print(f"Processing {total:,} pages with {workers} workers. "
          "Press Ctrl+C to pause; run the same command again to resume.")
    queue = deque(chunks)
    running = {}
    done = 0
    started = time.time()
    recent = deque(maxlen=400)  # (time, pages) for a current-rate ETA

    def submit():
        # Keep just one spare chunk queued so Ctrl+C pauses within seconds.
        while queue and len(running) < workers + 1:
            doc_id, rel, lang, pages = queue.popleft()
            running[pool.submit(process_pages, str(root / rel), lang, pages)] = doc_id

    def save(fut):
        nonlocal done
        doc_id = running.pop(fut)
        rows = fut.result()
        conn.executemany(
            "INSERT OR REPLACE INTO pages (doc_id, page_no, text, source, confidence) "
            "VALUES (?, ?, ?, ?, ?)", [(doc_id, *r) for r in rows])
        conn.commit()
        done += len(rows)
        recent.append((time.time(), len(rows)))

    submit()
    try:
        while running:
            finished, _ = wait(running, return_when=FIRST_COMPLETED)
            for fut in finished:
                save(fut)
            submit()
            _progress(done, total, started, recent)
    except KeyboardInterrupt:
        print("\nPausing: finishing the pages already in progress...")
        for fut in list(running):
            fut.cancel()
        for fut in [f for f in running if not f.cancelled()]:
            try:
                save(fut)
            except Exception:
                running.pop(fut, None)
        if done == total:
            print()
            return True
        print(f"Paused with {done:,}/{total:,} pages done. Run the same command to resume.")
        return False
    print()
    return True


def _progress(done, total, started, recent):
    elapsed = time.time() - started
    eta = ""
    if len(recent) > 1:
        span = recent[-1][0] - recent[0][0]
        pages = sum(p for _, p in list(recent)[1:])
        if span > 0 and pages:
            eta = f"  ~{_fmt((total - done) * span / pages)} left"
    print(f"\r  {done:,}/{total:,} pages  {_fmt(elapsed)} elapsed{eta}    ", end="", flush=True)


def _fmt(seconds):
    seconds = int(seconds)
    h, m = divmod(seconds // 60, 60)
    return f"{h}h{m:02d}m" if h else f"{m}m{seconds % 60:02d}s"


def summary(conn):
    q = lambda sql: conn.execute(sql).fetchall()  # noqa: E731
    docs = q("SELECT COUNT(*), SUM(error IS NOT NULL), SUM(legacy_font) FROM documents")[0]
    print(f"\nBooks: {docs[0]}  ({docs[1] or 0} unreadable, {docs[2] or 0} with garbled or legacy-font text)")
    print("Pages:")
    for source, n in q("SELECT source, COUNT(*) FROM pages GROUP BY source ORDER BY 2 DESC"):
        print(f"  {source:6} {n:>9,}")
    print("OCR language per scanned book:")
    for lang, n in q("SELECT ocr_lang, COUNT(*) FROM documents WHERE ocr_script IS NOT NULL "
                     "GROUP BY ocr_lang ORDER BY 2 DESC"):
        print(f"  {lang:10} {n:4}")
    low = q("SELECT d.title, COUNT(*), ROUND(AVG(p.confidence)) FROM pages p "
            "JOIN documents d ON d.id = p.doc_id WHERE p.source = 'ocr' "
            "GROUP BY d.id HAVING AVG(p.confidence) < 60 ORDER BY 3")
    if low:
        print("Books with weak OCR (average confidence below 60):")
        for title, n, conf in low:
            print(f"  {conf:>3.0f}  {title} ({n:,} pages)")
    for path, err in q("SELECT path, error FROM documents WHERE error IS NOT NULL"):
        print(f"  ERROR {path}: {err}")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("library", type=Path, help="folder containing PDFs (searched recursively)")
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--workers", type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument("--only", help="process only PDFs whose path contains this text")
    args = ap.parse_args()

    ocr.check_tesseract()
    root = args.library.resolve()
    if not root.is_dir():
        sys.exit(f"Not a folder: {root}")
    conn = connect(args.db)
    paths, added = register(conn, root, args.only)
    if not paths:
        sys.exit(f"No PDFs found under {root}")
    print(f"{len(paths)} PDFs ({added} new or changed). Database: {args.db}")
    recheck_text_pages(conn)

    with ProcessPoolExecutor(max_workers=args.workers, initializer=_init_worker) as pool:
        try:
            run_classify(conn, root, paths, pool)
        except KeyboardInterrupt:
            print("\nPaused during classification. Run the same command to resume.")
            pool.shutdown(cancel_futures=True)
            return
        finished = run_pages(conn, root, paths, pool, args.workers)
    if finished:
        summary(conn)
        print("\nDone. Try a search:  python ingest/search.py agni")


if __name__ == "__main__":
    main()
