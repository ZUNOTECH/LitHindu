// Highlighting helpers. Search snippets arrive with \x02 / \x03 around each
// match; full page text is highlighted by looking for the query words.

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

export function snippetHtml(snippet) {
  return escapeHtml(snippet).replaceAll('\x02', '<mark>').replaceAll('\x03', '</mark>');
}

function fold(s) {
  // Match the search index: ignore case and Latin diacritics (śiva = siva).
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

export function queryTerms(q) {
  return (q || '')
    .split(/\s+/)
    .map((t) => t.replace(/[*"]/g, ''))
    .filter(Boolean);
}

/** HTML for page text with every occurrence of the query terms marked. */
export function markTerms(text, q) {
  const terms = queryTerms(q).map(fold);
  if (!terms.length) return escapeHtml(text);
  // Fold character by character so positions in the folded text map back.
  const map = [];
  let folded = '';
  for (let i = 0; i < text.length; i++) {
    const f = fold(text[i]);
    folded += f;
    for (let k = 0; k < f.length; k++) map.push(i);
  }
  const ranges = [];
  for (const term of terms) {
    let from = 0;
    let at;
    while ((at = folded.indexOf(term, from)) !== -1) {
      ranges.push([map[at], map[at + term.length - 1] + 1]);
      from = at + term.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  let html = '';
  let pos = 0;
  for (const [s, e] of ranges) {
    if (s < pos) continue;
    html += escapeHtml(text.slice(pos, s)) + '<mark>' + escapeHtml(text.slice(s, e)) + '</mark>';
    pos = e;
  }
  return html + escapeHtml(text.slice(pos));
}
