// Copies PDF.js font and character-map data into public/ so the reader can
// display every PDF offline. Runs automatically before dev and build.
import { cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pdfjs = dirname(require.resolve('pdfjs-dist/package.json'));
const out = new URL('../public/pdfjs/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });
for (const dir of ['cmaps', 'standard_fonts']) {
  cpSync(join(pdfjs, dir), join(out, dir), { recursive: true });
}
