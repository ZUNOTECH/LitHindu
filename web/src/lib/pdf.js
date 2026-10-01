// PDF.js setup. The legacy build supports older browsers on kiosk hardware.
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

let current = null; // { id, task }

/** Open a book's PDF. Only the pages being viewed are downloaded. */
export function openPdf(id, url) {
  if (current?.id === id) return current.task.promise;
  current?.task.destroy();
  const task = pdfjs.getDocument({
    url,
    cMapUrl: '/pdfjs/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: '/pdfjs/standard_fonts/',
    disableAutoFetch: true, // fetch pages on demand, not the whole 7,000-page file
    disableStream: true,
    rangeChunkSize: 256 * 1024,
  });
  current = { id, task };
  return task.promise;
}
