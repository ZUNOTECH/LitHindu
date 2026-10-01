// Where everything sits on the wheel. Angles are in radians, measured
// clockwise from the top (12 o'clock). The recorded story fills most of the
// inner ring; the unlit remainder is the time still to come in Kali Yuga.

import { ERAS, EVENTS, YUGAS } from '../data/timeline.js';

export const RING = {
  inner: 1.42,   // inner radius of the history ring
  outer: 1.78,   // outer radius of the history ring
  label: 2.02,   // where era labels sit
  yugaIn: 2.22,  // the cosmic ring
  yugaOut: 2.36,
  yugaLabel: 2.6,
};

const LIT = (Math.PI * 2 * 300) / 360; // degrees of the ring that carry history
const MIN_GAP = (Math.PI * 2 * 3.2) / 360; // smallest angle between two events

// Colour drifts from ember (ancient) through gold to ether (modern).
const STOPS = ['#ff6a3d', '#ff9d4d', '#f2b85a', '#ffd98a', '#c7c0ff', '#8b9cff'];
function lerpColor(a, b, t) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
export function eraColor(index, count) {
  const t = (index / Math.max(1, count - 1)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(t));
  return lerpColor(STOPS[i], STOPS[i + 1], t - i);
}

export function layout() {
  const totalWeight = ERAS.reduce((n, e) => n + e.weight, 0);
  let a = 0;
  const eras = ERAS.map((era, i) => {
    const span = (era.weight / totalWeight) * LIT;
    const out = { ...era, a0: a, a1: a + span, mid: a + span / 2, color: eraColor(i, ERAS.length), events: [] };
    a += span;
    return out;
  });
  const byId = Object.fromEntries(eras.map((e) => [e.id, e]));

  // Place events by year within their era, then spread any that crowd.
  for (const era of eras) {
    const list = EVENTS.filter((ev) => ev.era === era.id).sort((x, y) => x.year - y.year);
    const pad = Math.min(MIN_GAP, (era.a1 - era.a0) * 0.12);
    const lo = era.a0 + pad;
    const hi = era.a1 - pad;
    const range = Math.max(1, era.end - era.start);
    let angles = list.map((ev) => lo + ((Math.min(Math.max(ev.year, era.start), era.end) - era.start) / range) * (hi - lo));
    for (let i = 1; i < angles.length; i++) angles[i] = Math.max(angles[i], angles[i - 1] + MIN_GAP);
    if (angles.length && angles[angles.length - 1] > hi) {
      // Compress evenly so the last one stays inside the era.
      const first = angles[0];
      const scale = (hi - first) / (angles[angles.length - 1] - first || 1);
      angles = angles.map((v) => first + (v - first) * scale);
    }
    era.events = list.map((ev, i) => ({ ...ev, a: angles[i], color: era.color }));
  }
  const events = eras.flatMap((e) => e.events);

  // The cosmic ring: four yugas, 4:3:2:1, Kali ending at the top where "now" is.
  const shares = YUGAS.reduce((n, y) => n + y.share, 0);
  let ya = -(Math.PI * 2 * YUGAS[YUGAS.length - 1].share) / shares; // so Kali ends at angle 0
  const yugas = YUGAS.map((y) => {
    const span = (Math.PI * 2 * y.share) / shares;
    const out = { ...y, a0: ya, a1: ya + span, mid: ya + span / 2 };
    ya += span;
    return out;
  });

  return { eras, events, yugas, lit: LIT, byId };
}
