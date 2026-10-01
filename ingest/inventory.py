"""Inventory a folder of PDFs before ingestion.

For every PDF this records page count, size, whether pages carry a text
layer or are scanned images, and which scripts appear in the text
(Devanagari for Sanskrit/Hindi, Tamil, Latin for English/IAST). Nothing is
modified; the output is a CSV plus a summary that tells us how much OCR
the corpus needs.

    python ingest/inventory.py /path/to/library --out inventory.csv
"""

import argparse
import csv
import os
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

import pymupdf

from textcheck import MIN_TEXT_CHARS, SCRIPTS, script_counts

# Pages sampled per document; spread evenly so huge books stay fast.
SAMPLE_PAGES = 25

FIELDS = [
    "path", "size_mb", "pages", "sampled", "text_pages", "scanned_pages",
    "kind", "devanagari", "tamil", "latin", "main_script", "title", "error",
]


def sample_indexes(n):
    if n <= SAMPLE_PAGES:
        return list(range(n))
    step = n / SAMPLE_PAGES
    return sorted({int(i * step) for i in range(SAMPLE_PAGES)})


def inspect(path):
    row = {"path": str(path), "size_mb": round(path.stat().st_size / 1e6, 1)}
    try:
        with pymupdf.open(path) as doc:
            if doc.needs_pass:
                row["error"] = "password protected"
                return row
            row["pages"] = doc.page_count
            row["title"] = (doc.metadata or {}).get("title", "")
            counts = dict.fromkeys(SCRIPTS, 0)
            text_pages = 0
            idx = sample_indexes(doc.page_count)
            for i in idx:
                text = doc[i].get_text()
                if len(text.strip()) >= MIN_TEXT_CHARS:
                    text_pages += 1
                for k, v in script_counts(text).items():
                    counts[k] += v
    except Exception as e:  # corrupt or unreadable file
        row["error"] = str(e)
        return row

    sampled = len(idx)
    row.update(counts)
    row["sampled"] = sampled
    row["text_pages"] = text_pages
    row["scanned_pages"] = sampled - text_pages
    ratio = text_pages / sampled if sampled else 0
    row["kind"] = "text" if ratio >= 0.9 else "scanned" if ratio <= 0.1 else "mixed"
    total = sum(counts.values())
    row["main_script"] = max(counts, key=counts.get) if total else "none"
    return row


def summarize(rows):
    ok = [r for r in rows if not r.get("error")]
    pages = sum(r["pages"] for r in ok)
    print(f"\nFiles: {len(rows)}  ({len(rows) - len(ok)} unreadable)")
    print(f"Size:  {sum(r['size_mb'] for r in rows) / 1000:.2f} GB")
    print(f"Pages: {pages:,}")
    for kind in ("text", "mixed", "scanned"):
        group = [r for r in ok if r["kind"] == kind]
        print(f"  {kind:8} {len(group):4} files  {sum(r['pages'] for r in group):>9,} pages")
    print("Main script (by file):")
    for script in list(SCRIPTS) + ["none"]:
        n = sum(1 for r in ok if r["main_script"] == script)
        if n:
            print(f"  {script:11} {n:4}")
    # Scanned pages need OCR; mixed files are estimated from the sample.
    ocr_pages = sum(r["pages"] * r["scanned_pages"] / r["sampled"] for r in ok if r["sampled"])
    print(f"Estimated pages needing OCR: {int(ocr_pages):,}")
    largest = sorted(ok, key=lambda r: r["pages"], reverse=True)[:5]
    print("Largest documents:")
    for r in largest:
        print(f"  {r['pages']:>6,} pages  {r['path']}")
    for r in rows:
        if r.get("error"):
            print(f"  ERROR {r['path']}: {r['error']}")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("library", type=Path, help="folder containing PDFs (searched recursively)")
    ap.add_argument("--out", type=Path, default=Path("inventory.csv"))
    ap.add_argument("--workers", type=int, default=os.cpu_count())
    args = ap.parse_args()

    pdfs = sorted(p for p in args.library.rglob("*") if p.suffix.lower() == ".pdf")
    if not pdfs:
        sys.exit(f"No PDFs found under {args.library}")

    rows = []
    with ProcessPoolExecutor(max_workers=args.workers) as pool:
        futures = [pool.submit(inspect, p) for p in pdfs]
        for n, fut in enumerate(as_completed(futures), 1):
            rows.append(fut.result())
            print(f"\r{n}/{len(pdfs)} inspected", end="", flush=True)

    rows.sort(key=lambda r: r["path"])
    with args.out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    summarize(rows)
    print(f"\nDetails written to {args.out}")


if __name__ == "__main__":
    main()
