// Sri Yantra geometry: nine interlocking triangles around the bindu, two
// rings of lotus petals, enclosing circles and the bhupura (the gated
// square). Everything is returned as line segments in the XY plane, with
// the triangle circle at radius 1.

// Heights of the nine horizontal base lines, top to bottom (classical
// 48-unit construction). Each triangle's base ends where it meets the sides
// of the largest triangle of the opposite orientation, which produces the
// characteristic interlocking star.
const BASES = [0.75, 0.5, 0.2917, 0.1667, 0.0417, -0.125, -0.25, -0.5, -0.75];

function triangles() {
  const b = (i) => BASES[i - 1];
  const T = {};
  const widthOn = (parent, y) => {
    if (parent === 'circle') return Math.sqrt(1 - y * y);
    const p = T[parent];
    return (p.w * (y - p.apex)) / (p.base - p.apex);
  };
  const spec = [
    ['T1', b(1), -1, 'circle'],
    ['T2', b(9), 1, 'circle'],
    ['T3', b(2), b(9), 'T2'],
    ['T4', b(8), b(1), 'T1'],
    ['T5', b(3), b(8), 'T2'],
    ['T6', b(7), b(2), 'T1'],
    ['T7', b(4), b(7), 'T2'],
    ['T8', b(6), b(3), 'T1'],
    ['T9', b(5), b(6), 'T2'],
  ];
  for (const [name, base, apex, parent] of spec) {
    T[name] = { base, apex, w: widthOn(parent, base) };
  }
  return Object.values(T).map(({ base, apex, w }) => [
    [-w, base],
    [w, base],
    [0, apex],
  ]);
}

function polar(r, a) {
  return [r * Math.cos(a), r * Math.sin(a)];
}

function circle(r, n = 160) {
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(polar(r, (i / n) * Math.PI * 2));
  return pts;
}

function petals(count, rIn, rOut, offset = 0) {
  const span = ((Math.PI * 2) / count) * 0.92;
  const rings = [];
  for (let i = 0; i < count; i++) {
    const c = (i / count) * Math.PI * 2 + offset;
    const tip = polar(rOut, c);
    const pts = [];
    for (const side of [-1, 1]) {
      const base = polar(rIn, c + (side * span) / 2);
      const ctrl = polar(rIn * 0.3 + rOut * 0.7, c + side * span * 0.52);
      const curve = [];
      for (let k = 0; k <= 10; k++) {
        const t = k / 10;
        const u = 1 - t;
        curve.push([
          u * u * base[0] + 2 * u * t * ctrl[0] + t * t * tip[0],
          u * u * base[1] + 2 * u * t * ctrl[1] + t * t * tip[1],
        ]);
      }
      pts.push(side < 0 ? curve : curve.reverse());
    }
    rings.push([...pts[0], ...pts[1]]);
  }
  return rings;
}

function gatedSquare(s, gate, depth) {
  // One closed outline: a square whose every side carries a gate.
  const half = gate / 2;
  const side = (ax, ay, bx, by) => {
    // From corner A to corner B with a gate at the midpoint, protruding outward.
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const dx = Math.sign(bx - ax);
    const dy = Math.sign(by - ay);
    const ox = dy; // outward normal
    const oy = -dx;
    return [
      [ax, ay],
      [mx - dx * half, my - dy * half],
      [mx - dx * half + ox * depth, my - dy * half + oy * depth],
      [mx + dx * half + ox * depth, my + dy * half + oy * depth],
      [mx + dx * half, my + dy * half],
    ];
  };
  return [
    ...side(-s, s, s, s),
    ...side(s, s, s, -s),
    ...side(s, -s, -s, -s),
    ...side(-s, -s, -s, s),
    [-s, s],
  ];
}

function toSegments(polylines, z = 0) {
  const out = [];
  for (const line of polylines) {
    for (let i = 0; i < line.length - 1; i++) {
      out.push(line[i][0], line[i][1], z, line[i + 1][0], line[i + 1][1], z);
    }
  }
  return new Float32Array(out);
}

/** Line layers of the yantra, innermost first, each as flat xyz pairs. */
export function yantraLayers() {
  const tris = triangles().map((t) => [...t, t[0]]);
  return {
    triangles: toSegments(tris, 0.02),
    inner: toSegments([circle(1), circle(1.03)]),
    lotus8: toSegments(petals(8, 1.05, 1.21, Math.PI / 2), -0.01),
    lotus16: toSegments(petals(16, 1.23, 1.4, Math.PI / 2 + Math.PI / 16), -0.02),
    rings: toSegments([circle(1.22), circle(1.41), circle(1.46)], -0.03),
    bhupura: toSegments([gatedSquare(1.62, 0.42, 0.14), gatedSquare(1.54, 0.3, 0.08)], -0.05),
  };
}

/** The same figure as SVG path data, for browsers without WebGL. */
export function yantraSvgPath() {
  const seg = (arr) => {
    let d = '';
    for (let i = 0; i < arr.length; i += 6) {
      d += `M${arr[i].toFixed(3)} ${(-arr[i + 1]).toFixed(3)}L${arr[i + 3].toFixed(3)} ${(-arr[i + 4]).toFixed(3)}`;
    }
    return d;
  };
  return Object.values(yantraLayers()).map(seg).join('');
}
