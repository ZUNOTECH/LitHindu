"""Search the library from the command line.

    python ingest/search.py agni
    python ingest/search.py "अग्नि" --limit 20
    python ingest/search.py "dharma kshetra"     # pages containing all words
    python ingest/search.py "yaj*"               # prefix search
"""

import argparse
import re
import sqlite3
import sys

from build_library import DEFAULT_DB


def fts_query(text):
    """Turn free text into a safe FTS5 query: every word must match, '*' = prefix."""
    terms = []
    for word in re.findall(r"[^\s\"]+", text):
        prefix = word.endswith("*")
        word = word.rstrip("*")
        if word:
            terms.append(f'"{word}"' + ("*" if prefix else ""))
    return " AND ".join(terms)


def search(conn, text, limit):
    query = fts_query(text)
    if not query:
        return []
    return conn.execute(
        """SELECT d.title, p.page_no + 1, p.source,
                  snippet(pages_fts, 0, '[', ']', ' … ', 14)
           FROM pages_fts
           JOIN pages p ON p.id = pages_fts.rowid
           JOIN documents d ON d.id = p.doc_id
           WHERE pages_fts MATCH ?
           ORDER BY bm25(pages_fts)
           LIMIT ?""", (query, limit)).fetchall()


def main():
    ap = argparse.ArgumentParser(description="Search the Lit Hindu library")
    ap.add_argument("query")
    ap.add_argument("--limit", type=int, default=10)
    ap.add_argument("--db", default=DEFAULT_DB)
    args = ap.parse_args()

    conn = sqlite3.connect(f"file:{args.db}?mode=ro", uri=True)
    results = search(conn, args.query, args.limit)
    if not results:
        sys.exit("No matches.")
    for title, page, source, snippet in results:
        tag = " (OCR)" if source == "ocr" else ""
        print(f"{title}, page {page}{tag}")
        print("   " + " ".join(snippet.split()) + "\n")


if __name__ == "__main__":
    main()
