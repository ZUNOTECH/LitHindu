"""Curate the library's catalog: proper titles, authors, languages, categories.

The catalog is a CSV (catalog/books.csv) with one row per PDF. `export`
writes it from the library with auto-cleaned titles to start from; a person
edits it; `apply` writes it back into the library so the website shows the
curated names. `organise` renames and files the PDFs themselves to match,
keeping the library database in step so nothing is re-processed.

    python ingest/catalog.py export                 # write catalog/books.csv
    python ingest/catalog.py apply                  # library takes the CSV's titles etc.
    python ingest/catalog.py organise               # show the moves it would make
    python ingest/catalog.py organise --apply       # move the files and update the library
    python ingest/catalog.py adopt "/path/to/organised folder"          # match books to an
    python ingest/catalog.py adopt "/path/to/organised folder" --apply  # already-tidied copy

CSV columns: file, title, author, language, category, pages, notes.
`file` is the path relative to the library folder and must not be edited by
hand; `pages` is informational.
"""

import argparse
import csv
import re
import shutil
import sqlite3
import sys
from pathlib import Path

from build_library import DEFAULT_DB

CATALOG = Path(__file__).resolve().parent.parent / "catalog" / "books.csv"
FIELDS = ["file", "title", "author", "language", "category", "pages", "notes"]

# Shelves, in shelf order; `organise` files books into folders named "01 Vedas" etc.
CATEGORIES = [
    "Vedas", "Upanishads", "Ramayana", "Mahabharata", "Bhagavad Gita", "Puranas",
    "Dharmashastra and Niti", "Vedanta and Darshana", "Yoga and Tantra",
    "Bhakti - Stotra, Chalisa, Path", "Sampradaya Texts", "Jyotisha, Vastu and Vedic Sciences",
    "Ayurveda and Health", "Introductions to Sanatana Dharma", "Research Papers and Articles",
    "Reference - Wikipedia Articles", "Other",
]
LANGUAGE_WORDS = {"sanskrit", "hindi", "english", "gujarati", "tamil", "marathi", "nepali", "punjabi",
                  "odia", "oriya", "bengali", "telugu", "kannada", "malayalam", "awadhi", "roman", "romanized",
                  # fillers that may appear inside a language part
                  "with", "and", "tika", "commentary", "translation", "text", "only", "script"}


def shelf_folder(category):
    """'Vedas' -> '01 Vedas'; unknown categories go under 'Other'."""
    cat = category if category in CATEGORIES else "Other"
    return f"{CATEGORIES.index(cat) + 1:02d} {cat}"


def shelf_category(folder):
    """'03 Ramayana' -> 'Ramayana'; a folder outside the scheme keeps its own name."""
    return re.sub(r"^\d+\s+", "", folder).strip() or "Other"


def parse_name(stem):
    """Read 'Title (Author) - Language - Translator (Publisher year) - note' file names.

    Returns (title, author, language, notes). Parts that are not recognised
    as a language go to notes, so nothing from the name is lost.
    """
    parts = [p.strip() for p in re.split(r"\s+-\s+", stem) if p.strip()]
    title = parts[0] if parts else stem
    author = ""
    m = re.match(r"^(.*?)\s*\(([^()]+)\)\s*$", title)
    if m:
        title, author = m.group(1).strip(), m.group(2).strip()
    language = ""
    notes = []
    for p in parts[1:]:
        words = {w.lower() for w in re.split(r"[\s/,+]+", p.replace("-", " ")) if w}
        if not language and words and words <= LANGUAGE_WORDS and words - {"with", "and", "tika", "commentary", "translation", "text", "only", "script"}:
            language = p.replace("-", " + ") if " " not in p else p
        else:
            notes.append(p)
    return title, author, language, "; ".join(notes)

# Words whose spelling the auto-cleaner knows; keys are lower-case forms as
# they appear in file names, values the preferred spelling.
WORDS = {
    "rigved": "Rig Veda", "rigveda": "Rig Veda", "rgveda": "Rig Veda", "yajurved": "Yajur Veda",
    "yajurveda": "Yajur Veda", "yugerved": "Yajur Veda", "samved": "Sama Veda", "samaveda": "Sama Veda",
    "atharvaved": "Atharva Veda", "atharvaveda": "Atharva Veda", "ved": "Veda", "veda": "Veda",
    "upanishad": "Upanishad", "upanishads": "Upanishads", "gita": "Gita", "geeta": "Gita",
    "bhagavad": "Bhagavad", "bhagwad": "Bhagavad", "bhagavat": "Bhagavata", "bhagwat": "Bhagavata",
    "mahabharat": "Mahabharata", "mahabharata": "Mahabharata", "mahabhart": "Mahabharata",
    "mahabharta": "Mahabharata", "ramayan": "Ramayana", "ramayana": "Ramayana",
    "ramcharitmanas": "Ramcharitmanas", "ramchritmanas": "Ramcharitmanas", "puran": "Purana",
    "purana": "Purana", "puranas": "Puranas", "vedpuran": "Veda Purana", "shiv": "Shiva", "shri": "Shri",
    "sri": "Sri", "swami": "Swami", "ji": "Ji", "gorkhpur": "Gita Press", "gorakhpur": "Gita Press",
    "gitapress": "Gita Press", "hindi": "Hindi", "english": "English", "sanskrit": "Sanskrit",
    "gujarati": "Gujarati", "marathi": "Marathi", "nepali": "Nepali", "tamil": "Tamil", "odia": "Odia",
    "roman": "Roman", "anuvad": "Anuvad", "mandal": "Mandala", "mandal1": "Mandala 1", "kand": "Kanda",
    "sanatana": "Sanatana", "sanatan": "Sanatana", "dharma": "Dharma", "hharma": "Dharma",
    "gnyaneshwari": "Jnaneshwari", "dnyaneshwari": "Jnaneshwari", "yogavasishtha": "Yoga Vasishtha",
    "vachanamrut": "Vachanamrut", "sadhak": "Sadhak", "sanjivani": "Sanjivani", "sanjivini": "Sanjivani",
    "sadhaksanjivani": "Sadhak Sanjivani", "ramsukhdas": "Ramsukhdas", "vidur": "Vidura", "niti": "Niti",
    "brahmam": "Brahman", "commentary": "Commentary", "with": "with", "and": "and", "of": "of",
    "the": "the", "by": "by", "on": "on", "in": "in", "all": "All", "pages": "pages",
}
_SMALL = {"with", "and", "of", "the", "by", "on", "in", "a", "an", "ka", "ki", "ke"}


def clean_title(path):
    """A readable first-draft title from a file name like '455-gita_roman (1).pdf'."""
    name = Path(path).stem
    name = re.sub(r"\(\d+\)|\[.*?\]", " ", name)                 # (1), [scan]
    name = re.sub(r"[_\-.+]+", " ", name)
    name = re.sub(r"\b\d{2,5}\b", " ", name)                      # catalogue numbers
    name = re.sub(r"\b(pdf|final|copy|new|ocr|scan|scanned|compressed|ebook|e book|www|com|org)\b", " ", name, flags=re.I)
    name = re.sub(r"\b(\d+\s*)?pages?\b", " ", name, flags=re.I)
    words = [w for w in re.split(r"\s+", name.strip()) if w]
    out = []
    for i, w in enumerate(words):
        key = w.lower()
        if key in WORDS:
            out.append(WORDS[key] if (i or key not in _SMALL) else WORDS[key].capitalize())
        elif key in _SMALL and i:
            out.append(key)
        elif w.isupper() and len(w) > 3:
            out.append(w.capitalize())
        else:
            out.append(w[:1].upper() + w[1:])
    title = " ".join(out)
    title = re.sub(r"\b(\w+)( \1\b)+", r"\1", title, flags=re.I)  # repeated words
    return title.strip() or Path(path).stem


def safe_filename(s):
    s = re.sub(r"[\\/:*?\"<>|]+", " ", s)
    s = re.sub(r"\s+", " ", s).strip(" .")
    return s[:120]


def connect(db):
    conn = sqlite3.connect(db)
    conn.row_factory = sqlite3.Row
    cols = {r[1] for r in conn.execute("PRAGMA table_info(documents)")}
    for col in ("author", "category", "language_name"):
        if col not in cols:
            conn.execute(f"ALTER TABLE documents ADD COLUMN {col} TEXT")
    conn.commit()
    return conn


def library_root(conn):
    row = conn.execute("SELECT value FROM meta WHERE key = 'library_root'").fetchone()
    if not row:
        sys.exit("The library has not been built yet.")
    return Path(row[0])


def read_catalog(path):
    if not path.exists():
        sys.exit(f"No catalog at {path}. Run:  python ingest/catalog.py export")
    with path.open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    missing = [c for c in FIELDS if c not in (rows[0].keys() if rows else FIELDS)]
    if missing:
        sys.exit(f"Catalog is missing columns: {', '.join(missing)}")
    return rows


# ---------------------------------------------------------------- commands

def cmd_export(args):
    conn = connect(args.db)
    existing = {r["file"]: r for r in read_catalog(args.catalog)} if args.catalog.exists() else {}
    docs = conn.execute("SELECT path, title, author, category, language_name, pages FROM documents "
                        "WHERE error IS NULL ORDER BY path").fetchall()
    args.catalog.parent.mkdir(parents=True, exist_ok=True)
    with args.catalog.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for d in docs:
            old = existing.get(d["path"], {})
            w.writerow({
                "file": d["path"],
                "title": old.get("title") or d["author"] and d["title"] or clean_title(d["path"]),
                "author": old.get("author") or d["author"] or "",
                "language": old.get("language") or d["language_name"] or "",
                "category": old.get("category") or d["category"] or "",
                "pages": d["pages"],
                "notes": old.get("notes", ""),
            })
    kept = sum(1 for d in docs if d["path"] in existing)
    print(f"Wrote {args.catalog} with {len(docs)} books ({kept} kept from the previous catalog).")
    print("Edit title, author, language and category; leave file as it is. Then: python ingest/catalog.py apply")


def cmd_apply(args):
    conn = connect(args.db)
    rows = read_catalog(args.catalog)
    paths = {r["path"] for r in conn.execute("SELECT path FROM documents")}
    updated = 0
    unknown = []
    for r in rows:
        if r["file"] not in paths:
            unknown.append(r["file"])
            continue
        cat = r["category"].strip()
        if cat and cat not in CATEGORIES:
            print(f"Note: category {cat!r} for {r['file']} is not one of the standard ones")
        conn.execute("UPDATE documents SET title = ?, author = ?, category = ?, language_name = ? WHERE path = ?",
                     (r["title"].strip() or clean_title(r["file"]), r["author"].strip() or None,
                      cat or None, r["language"].strip() or None, r["file"]))
        updated += 1
    conn.commit()
    print(f"Applied the catalog to {updated} books.")
    for u in unknown:
        print(f"  not in the library (renamed or removed?): {u}")
    if unknown:
        print("Run `python ingest/catalog.py export` to refresh the catalog's file paths.")


def cmd_organise(args):
    conn = connect(args.db)
    root = library_root(conn)
    rows = read_catalog(args.catalog)
    moves = []
    taken = set()
    for r in rows:
        src = root / r["file"]
        if not src.is_file():
            print(f"  missing on disk: {r['file']}")
            continue
        title = r["title"].strip() or clean_title(r["file"])
        name = safe_filename(title + (f" - {r['author'].strip()}" if r["author"].strip() else ""))
        folder = safe_filename(shelf_folder(r["category"].strip()))
        rel = f"{folder}/{name}{src.suffix.lower()}"
        n = 2
        while rel.lower() in taken or ((root / rel).exists() and (root / rel) != src):
            rel = f"{folder}/{name} ({n}){src.suffix.lower()}"
            n += 1
        taken.add(rel.lower())
        if rel != r["file"]:
            moves.append((r["file"], rel))
    if not moves:
        print("Everything is already in place.")
        return
    width = max(len(m[0]) for m in moves)
    for old, new in moves:
        print(f"  {old:<{width}}  →  {new}")
    print(f"\n{len(moves)} files would move" + ("" if args.apply else " (dry run; add --apply to do it)"))
    if not args.apply:
        return
    done = 0
    for old, new in moves:
        src, dst = root / old, root / new
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))
        conn.execute("UPDATE documents SET path = ? WHERE path = ?", (new, old))
        conn.commit()
        done += 1
    # Remove folders left empty by the moves.
    for d in sorted((p for p in root.rglob("*") if p.is_dir()), key=lambda p: -len(p.parts)):
        if not any(d.iterdir()):
            d.rmdir()
    # Keep the catalog's file column in step.
    new_by_old = dict(moves)
    for r in rows:
        r["file"] = new_by_old.get(r["file"], r["file"])
    with args.catalog.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        w.writerows(rows)
    print(f"Moved {done} files; the library and the catalog now use the new paths.")


def cmd_adopt(args):
    """Match the library's books to files in an already-organised folder by size."""
    conn = connect(args.db)
    folder = Path(args.folder).expanduser().resolve()
    if not folder.is_dir():
        sys.exit(f"Not a folder: {folder}")
    files = {}
    for p in folder.rglob("*"):
        if p.suffix.lower() == ".pdf" and p.is_file():
            files.setdefault(p.stat().st_size, []).append(p)
    docs = conn.execute("SELECT id, path, size, pages FROM documents ORDER BY path").fetchall()
    matched, unmatched = [], []
    for d in docs:
        cands = files.get(d["size"], [])
        if len(cands) > 1:
            # Same size twice (duplicates): tell them apart by page count, else take them in order.
            try:
                import pymupdf
                cands = [c for c in cands if pymupdf.open(c).page_count == d["pages"]] or cands
            except Exception:
                pass
        if not cands:
            unmatched.append(d["path"])
            continue
        p = cands.pop(0)
        files[d["size"]] = cands
        rel = str(p.relative_to(folder))
        title, author, language, notes = parse_name(p.stem)
        matched.append((d["id"], d["path"], rel, title, author, language, shelf_category(p.parent.name) if p.parent != folder else "Other", d["pages"], notes))
    leftover = [str(p.relative_to(folder)) for ps in files.values() for p in ps]
    width = max((len(m[1]) for m in matched), default=10)
    for _, old, rel, *_ in matched:
        print(f"  {old:<{width}}  =  {rel}")
    print(f"\n{len(matched)} of {len(docs)} books matched by file size.")
    for u in unmatched:
        print(f"  NOT FOUND in the folder: {u}")
    for l in leftover:
        print(f"  in the folder but not in the library: {l}")
    if not args.apply:
        print("Dry run. Add --apply to point the library at these files and write the catalog.")
        return
    for doc_id, old, rel, title, author, language, category, pages, notes in matched:
        conn.execute("UPDATE documents SET path = ?, title = ?, author = ?, language_name = ?, category = ? WHERE id = ?",
                     (rel, title, author or None, language or None, category, doc_id))
    conn.execute("INSERT OR REPLACE INTO meta VALUES ('library_root', ?)", (str(folder),))
    conn.commit()
    args.catalog.parent.mkdir(parents=True, exist_ok=True)
    with args.catalog.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=FIELDS)
        w.writeheader()
        for _, old, rel, title, author, language, category, pages, notes in matched:
            w.writerow({"file": rel, "title": title, "author": author, "language": language,
                        "category": category, "pages": pages, "notes": notes})
    print(f"The library now reads from {folder}. Catalog written to {args.catalog}.")
    if unmatched:
        print(f"{len(unmatched)} books were not found there; they keep their old paths and will show as missing until their files are present.")


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("command", choices=["export", "apply", "organise", "adopt"])
    ap.add_argument("folder", nargs="?", help="adopt: the organised folder to match against")
    ap.add_argument("--db", type=Path, default=DEFAULT_DB)
    ap.add_argument("--catalog", type=Path, default=CATALOG)
    ap.add_argument("--apply", action="store_true", help="organise: really move the files")
    args = ap.parse_args()
    if args.command == "adopt" and not args.folder:
        sys.exit("adopt needs the organised folder:  python ingest/catalog.py adopt \"/path/to/folder\"")
    {"export": cmd_export, "apply": cmd_apply, "organise": cmd_organise, "adopt": cmd_adopt}[args.command](args)


if __name__ == "__main__":
    main()
