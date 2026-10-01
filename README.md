# Lit Hindu

An offline encyclopedia and library of Sanatana Dharma, covering its history,
texts and traditions from the beginning to today. It runs entirely on local
hardware, from a single PC up to touch-screen kiosks in knowledge centers.

## Status

Phase 0: corpus inventory.

## Step 1: inventory the library

```bash
python -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r ingest/requirements.txt
python ingest/inventory.py /path/to/your/pdf/folder --out inventory.csv
```

This only reads the PDFs and never changes them. It prints a summary (pages,
text vs scanned, scripts found, estimated OCR workload) and writes per-file
details to `inventory.csv`.
