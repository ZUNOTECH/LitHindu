// Lookups over the encyclopedia and its links to the timeline.

import { ENTRIES, TYPES, byId } from '../data/encyclopedia.js';
import { ERAS, EVENTS } from '../data/timeline.js';

function fold(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Entries whose name, other names or Devanagari match the words of `q`. */
export function searchEntries(q, limit = 8) {
  const words = fold(q || '').split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const scored = [];
  for (const e of ENTRIES) {
    const names = [e.name, e.sa, ...(e.aka || [])].map(fold);
    const hay = names.join(' ');
    let score = 0;
    for (const w of words) {
      if (names.some((n) => n === w)) score += 10;
      else if (names.some((n) => n.split(/[\s·]+/).some((part) => part.startsWith(w)))) score += 5;
      else if (hay.includes(w)) score += 3;
      else if (fold(e.summary).includes(w)) score += 1;
      else { score = 0; break; } // every word must match somewhere
    }
    if (score) scored.push([score, e]);
  }
  return scored.sort((a, b) => b[0] - a[0]).slice(0, limit).map(([, e]) => e);
}

/** Timeline eras and events an entry points at, resolved to links. */
export function timelineLinks(entry) {
  const out = [];
  for (const ref of entry.timeline || []) {
    const era = ERAS.find((e) => e.id === ref);
    if (era) { out.push({ label: era.name, at: `era:${era.id}` }); continue; }
    const i = EVENTS.findIndex((ev) => ev.name === ref);
    if (i >= 0) out.push({ label: EVENTS[i].name, at: `event:${i}` });
    else if (['satya', 'treta', 'dvapara', 'kali'].includes(ref)) out.push({ label: ref[0].toUpperCase() + ref.slice(1) + ' Yuga', at: `yuga:${ref}` });
  }
  return out;
}

/** Entries that point at a timeline era, event or yuga. */
export function entriesFor(kind, idOrName) {
  return ENTRIES.filter((e) => (e.timeline || []).includes(idOrName));
}

export { ENTRIES, TYPES, byId };
