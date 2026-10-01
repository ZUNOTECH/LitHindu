# Lit Hindu

An offline encyclopedia and library of Sanatana Dharma, covering its history,
texts and traditions from the beginning to today. It runs entirely on local
hardware, from a single PC up to touch-screen kiosks in knowledge centers.

## Status

Phase 0: building the searchable library (inventory, text extraction, OCR).

## Step 1: inventory the library

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r ingest/requirements.txt
python ingest/inventory.py /path/to/your/pdf/folder --out inventory.csv
```

This only reads the PDFs and never changes them. It prints a summary (pages,
text vs scanned, scripts found, estimated OCR workload) and writes per-file
details to `inventory.csv`.

## Step 2: build the searchable library

Needs Tesseract with the Indic languages (one-time, on a Mac):

```bash
brew install tesseract tesseract-lang
```

Then, from the project folder with the virtual environment active:

```bash
caffeinate -i python ingest/build_library.py "/path/to/your/pdf/folder"
```

- Every page of every PDF goes into `data/library.db` (SQLite), one row per page.
- Pages with a good text layer are extracted directly. Scanned pages, and pages
  typed in legacy Hindi fonts such as Kruti Dev, are OCR'd.
- Each scanned book's language (Hindi, Sanskrit, Tamil, English or a mix) is
  chosen automatically by testing which Tesseract model reads it best.
- **Resumable:** press Ctrl+C to pause, then run the same command to continue.
  `caffeinate -i` stops the Mac from sleeping while it runs.
- Adding new PDFs later and re-running processes only the new ones.

## Step 3: search

```bash
python ingest/search.py agni
python ingest/search.py "अग्नि"
python ingest/search.py "yaj*"          # prefix search
```

Search matches whole words in any script. Sanskrit diacritics are optional
(`siva` finds `śiva`), and each result shows the book and page number.
