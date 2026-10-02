# Lit Hindu

An offline encyclopedia and library of Sanatana Dharma, covering its history,
texts and traditions from the beginning to today. It runs entirely on local
hardware, from a single PC up to touch-screen kiosks in knowledge centers.

## Status

Phase 1: searchable library and website (search, browse, read every page).

## Step 1: inventory the library

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
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
- Scripts covered: Devanagari (Hindi, Sanskrit, Marathi, Nepali), Tamil,
  Gujarati, Odia, Bengali, Gurmukhi, Telugu, Kannada, Malayalam and Latin.
  Each scanned book's script is found by letting every script's model read
  sample pages and keeping the most confident. `--redo TEXT` starts over on
  books whose file name contains TEXT; add `--lang guj` (or `ori`, `mar`,
  `san+eng`, ...) to state the language yourself instead of detecting it.

## Comparing OCR engines

```bash
pip install surya-ocr          # optional; downloads its models on first run
python ingest/compare_ocr.py   # 3 pages from each of the 6 weakest books
python ingest/compare_ocr.py --book rigved --book "sarala" --pages 4
```

Writes `data/ocr_compare.html`: each page image beside every engine's
text, for someone who reads the script to judge.

## Step 3: search

```bash
python ingest/search.py agni
python ingest/search.py "अग्नि"
python ingest/search.py '"dharma"'     # exact word only
```

Search works in any script and includes word forms (धर्म finds धर्मस्य);
quotes give an exact match. Sanskrit diacritics are optional
(`siva` finds `śiva`), and each result shows the book and page number.

## Step 4: the website

One-time setup (needs Node.js only to build the site, not to run it):

```bash
brew install node
cd web && npm install && npm run build && cd ..
```

Run it:

```bash
python app/server.py
```

Then open http://localhost:8000. It works while the library is still being
built; books show how much of them is searchable so far.

- **Home:** a Sri Yantra drawn in light (Three.js), which follows the pointer
  and can be dragged; search everything; the largest works as 3D books.
- **Library:** every book as a 3D object, filterable by language and title.
- **Timeline:** the Kala Chakra, a 3D wheel of time. The inner ring carries
  recorded history (ten eras, forty-odd events from the Sindhu-Sarasvati
  cities to today) and turns under the visitor's hand: drag, flick, scroll or
  arrow keys. The outer ring carries the four yugas in their 4:3:2:1
  proportions. Every entry gives the scholarly dating and, where it differs,
  the traditional one, and links into the library. Content lives in
  `web/src/data/timeline.js`.
- **Encyclopedia:** 92 entries, deities, rishis and acharyas, texts, concepts,
  schools, places and festivals, each with its Devanagari name, a summary,
  key facts, a note where traditions differ, related entries, links onto the
  wheel of time and searches into the library. Search shows matching entries
  above page results, and timeline entries link to theirs. Content lives in
  `web/src/data/encyclopedia.js`.
- **Search:** results across all books with the matching passage highlighted.
- **Reader:** the original PDF page by page (even 7,000-page books open
  instantly) with a page-turn animation, the page's text alongside, and
  find-in-book. Arrow keys or swiping turn pages.

The design ("Jyoti", light) is dark by intention, for screens in dim halls,
and everything is bundled: fonts, Three.js, PDF.js. Motion is reduced for
visitors who ask for it (`prefers-reduced-motion`), the 3D scene pauses when
off screen, and a browser without WebGL gets a flat drawing of the yantra.

For a kiosk, `python app/server.py --kiosk` opens the browser automatically.

## Project layout

```
ingest/   PDF inventory, OCR pipeline and command-line search (Python)
app/      local web server and JSON API (Python, FastAPI)
web/      website (Svelte + PDF.js), built into web/dist
data/     library.db, generated; never committed
```
