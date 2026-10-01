"""Lit Hindu local web server.

Serves the website and a small JSON API over the library database built by
ingest/build_library.py. Everything runs on this machine; no internet needed.

    python app/server.py              # then open http://localhost:8000
    python app/server.py --kiosk      # also opens a full-screen browser
"""

import argparse
import contextlib
import sqlite3
import sys
import threading
import webbrowser
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "ingest"))
from build_library import DEFAULT_DB  # noqa: E402
from search import fts_query  # noqa: E402

WEB_DIST = ROOT / "web" / "dist"

LANGUAGE_NAMES = {
    "hin": "Hindi", "san": "Sanskrit", "tam": "Tamil", "eng": "English",
}
SCRIPT_LANGUAGE = {"devanagari": "Hindi / Sanskrit", "tamil": "Tamil", "latin": "English"}


def language_of(row):
    """Human-readable language for a book, from its OCR model or text script."""
    if row["ocr_script"] and row["ocr_lang"]:
        return " + ".join(LANGUAGE_NAMES.get(code, code) for code in row["ocr_lang"].split("+"))
    if row["legacy_font"]:
        return "Hindi"
    return SCRIPT_LANGUAGE.get(row["script"] or "", "Unknown")


def create_app(db_path):
    app = FastAPI(title="Lit Hindu", docs_url="/api/docs", redoc_url=None)

    @contextlib.contextmanager
    def db():
        if not Path(db_path).exists():
            raise HTTPException(503, "Library database not built yet. Run ingest/build_library.py.")
        conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()

    def library_root(conn):
        row = conn.execute("SELECT value FROM meta WHERE key = 'library_root'").fetchone()
        return Path(row[0]) if row else None

    def book_dict(row):
        return {
            "id": row["id"],
            "title": row["title"],
            "pages": row["pages"],
            "language": language_of(row),
            "scanned": bool(row["ocr_script"]),
            "pages_ready": row["pages_ready"],
        }

    BOOK_SELECT = """
        SELECT d.*, (SELECT COUNT(*) FROM pages p WHERE p.doc_id = d.id) AS pages_ready
        FROM documents d WHERE d.error IS NULL AND d.classified = 1
    """

    @app.get("/api/stats")
    def stats():
        with db() as conn:
            books, pages = conn.execute(
                "SELECT COUNT(*), COALESCE(SUM(pages), 0) FROM documents "
                "WHERE error IS NULL AND classified = 1").fetchone()
            ready = conn.execute("SELECT COUNT(*) FROM pages").fetchone()[0]
        return {"books": books, "pages": pages, "pages_ready": ready}

    @app.get("/api/books")
    def books():
        with db() as conn:
            rows = conn.execute(BOOK_SELECT + " ORDER BY d.title COLLATE NOCASE").fetchall()
        return [book_dict(r) for r in rows]

    @app.get("/api/books/{book_id}")
    def book(book_id: int):
        with db() as conn:
            row = conn.execute(BOOK_SELECT + " AND d.id = ?", (book_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Book not found")
        return book_dict(row)

    @app.get("/api/books/{book_id}/pages/{page}")
    def page_text(book_id: int, page: int):
        """Text of one page (1-based), as extracted or OCR'd."""
        with db() as conn:
            row = conn.execute(
                "SELECT text, source, confidence FROM pages WHERE doc_id = ? AND page_no = ?",
                (book_id, page - 1)).fetchone()
        if not row:
            return {"text": None, "source": None, "confidence": None}
        return dict(row)

    @app.get("/api/books/{book_id}/file")
    def book_file(book_id: int):
        """The original PDF. Supports range requests, so huge books open instantly."""
        with db() as conn:
            row = conn.execute("SELECT path FROM documents WHERE id = ?", (book_id,)).fetchone()
            root = library_root(conn)
        if not row or not root:
            raise HTTPException(404, "Book not found")
        path = (root / row["path"]).resolve()
        if not path.is_relative_to(root.resolve()) or not path.is_file():
            raise HTTPException(404, "PDF file missing from the library folder")
        return FileResponse(path, media_type="application/pdf")

    @app.get("/api/search")
    def search(q: str = Query(..., min_length=1), book: int | None = None,
               limit: int = Query(20, le=100), offset: int = Query(0, ge=0)):
        query = fts_query(q)
        if not query:
            return {"total": 0, "results": []}
        where = "pages_fts MATCH ?"
        params = [query]
        if book is not None:
            where += " AND p.doc_id = ?"
            params.append(book)
        # Within one book, list matches in page order; across books, best first.
        order = "p.page_no" if book is not None else "bm25(pages_fts)"
        sql_from = f"""FROM pages_fts JOIN pages p ON p.id = pages_fts.rowid
                       JOIN documents d ON d.id = p.doc_id WHERE {where}"""
        with db() as conn:
            try:
                total = conn.execute(f"SELECT COUNT(*) {sql_from}", params).fetchone()[0]
                rows = conn.execute(
                    f"""SELECT d.id AS book_id, d.title, p.page_no + 1 AS page, p.source,
                               snippet(pages_fts, 0, '\x02', '\x03', ' … ', 24) AS snippet
                        {sql_from} ORDER BY {order} LIMIT ? OFFSET ?""",
                    params + [limit, offset]).fetchall()
            except sqlite3.OperationalError:
                return {"total": 0, "results": []}
        return {"total": total, "results": [dict(r) for r in rows]}

    if WEB_DIST.is_dir():
        app.mount("/", StaticFiles(directory=WEB_DIST, html=True), name="web")
    return app


def main():
    ap = argparse.ArgumentParser(description="Run the Lit Hindu website locally")
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--host", default="127.0.0.1",
                    help="use 0.0.0.0 to allow other devices on the network")
    ap.add_argument("--kiosk", action="store_true", help="open a browser window when ready")
    args = ap.parse_args()

    if not WEB_DIST.is_dir():
        print("Note: website not built yet (web/dist missing); only the API is available.")
    url = f"http://localhost:{args.port}"
    if args.kiosk:
        threading.Timer(1.5, webbrowser.open, (url,)).start()
    print(f"Lit Hindu running at {url}  (Ctrl+C to stop)")

    import uvicorn
    uvicorn.run(create_app(args.db), host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
