// The Kala Chakra: a wheel of time seen from the front, tilted like a dial.
// The inner ring carries recorded history and turns under the visitor's
// hand; the outer ring carries the four yugas and turns on its own.
// Labels and event markers are HTML, positioned each frame by projecting
// points on the rings, so they stay crisp and touchable.

import {
  AdditiveBlending,
  Clock,
  Color,
  DoubleSide,
  Group,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  PerspectiveCamera,
  RingGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  Vector3,
  WebGLRenderer,
} from 'three';
import { ETHER, GOLD, SAFFRON, glowLines, particleField, radialTexture } from './common.js';
import { RING } from '../chakraLayout.js';

const TILT = 0.82; // radians: the dial leans toward the viewer
const SEG = 96;

/** Three's RingGeometry measures from +X counter-clockwise; ours is clockwise from +Y. */
function arc(rIn, rOut, a0, a1) {
  const length = a1 - a0;
  return new RingGeometry(rIn, rOut, Math.max(4, Math.ceil((length / (Math.PI * 2)) * SEG)), 1, Math.PI / 2 - a1, length);
}

function arcLine(r, a0, a1, n = 48) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const t0 = a0 + ((a1 - a0) * i) / n;
    const t1 = a0 + ((a1 - a0) * (i + 1)) / n;
    out.push(r * Math.sin(t0), r * Math.cos(t0), 0, r * Math.sin(t1), r * Math.cos(t1), 0);
  }
  return out;
}

function radial(r0, r1, a) {
  return [r0 * Math.sin(a), r0 * Math.cos(a), 0, r1 * Math.sin(a), r1 * Math.cos(a), 0];
}

export function createChakraScene(canvas, { eras, events, yugas, lit, animated = true }) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);

  const scene = new Scene();
  const camera = new PerspectiveCamera(34, 1, 0.1, 60);
  camera.position.set(0, 2.3, 7.6);
  camera.lookAt(0, -0.1, 0);

  const resolution = { x: 1, y: 1 };
  const tilt = new Group();
  tilt.rotation.x = TILT;
  scene.add(tilt);
  const inner = new Group();
  const outer = new Group();
  tilt.add(inner, outer);

  const lines = [];
  const addLines = (group, positions, color, weights, z = 0) => {
    const g = glowLines(new Float32Array(positions), color, resolution, weights);
    g.position.z = z;
    group.add(g);
    lines.push(g);
    return g;
  };

  // --- history ring -------------------------------------------------------
  const eraMeshes = {};
  for (const era of eras) {
    const material = new MeshBasicMaterial({ color: new Color(era.color), transparent: true, opacity: 0.16, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const mesh = new Mesh(arc(RING.inner, RING.outer, era.a0, era.a1), material);
    inner.add(mesh);
    eraMeshes[era.id] = mesh;
    addLines(inner, radial(RING.inner, RING.outer, era.a0), new Color(era.color), [[4, 0.12], [1, 0.6]], 0.01);
  }
  // Unlit remainder: the yuga still to come.
  inner.add(new Mesh(arc(RING.inner, RING.outer, lit, Math.PI * 2), new MeshBasicMaterial({ color: 0x8b9cff, transparent: true, opacity: 0.035, blending: AdditiveBlending, depthWrite: false, side: DoubleSide })));
  addLines(inner, [...arcLine(RING.inner, 0, lit, 160), ...arcLine(RING.outer, 0, lit, 160)], GOLD, [[7, 0.07], [2.2, 0.22], [1, 0.9]], 0.01);
  addLines(inner, [...arcLine(RING.inner, lit, Math.PI * 2, 40), ...arcLine(RING.outer, lit, Math.PI * 2, 40)], ETHER, [[4, 0.05], [1, 0.3]], 0.01);
  // Event ticks on the ring.
  const ticks = events.flatMap((ev) => radial(RING.inner + 0.04, RING.outer - 0.04, ev.a));
  addLines(inner, ticks, GOLD, [[5, 0.06], [1, 0.45]], 0.02);
  // Spokes to the hub.
  const spokes = eras.flatMap((era) => radial(0.32, RING.inner - 0.06, era.mid));
  addLines(inner, spokes, SAFFRON, [[3, 0.04], [1, 0.14]], -0.01);
  addLines(inner, arcLine(0.3, 0, Math.PI * 2, 96), SAFFRON, [[5, 0.06], [1, 0.5]]);

  // --- cosmic ring -----------------------------------------------------------
  const yugaMeshes = {};
  const yugaTones = ['#ffe9b8', '#ffd27a', '#ff9d4d', '#ff6a3d'];
  yugas.forEach((y, i) => {
    const color = new Color(yugaTones[i]);
    const material = new MeshBasicMaterial({ color, transparent: true, opacity: 0.1, blending: AdditiveBlending, depthWrite: false, side: DoubleSide });
    const mesh = new Mesh(arc(RING.yugaIn, RING.yugaOut, y.a0 + 0.012, y.a1 - 0.012), material);
    outer.add(mesh);
    yugaMeshes[y.id] = mesh;
    addLines(outer, [...arcLine(RING.yugaIn, y.a0 + 0.012, y.a1 - 0.012, 60), ...arcLine(RING.yugaOut, y.a0 + 0.012, y.a1 - 0.012, 60), ...radial(RING.yugaIn, RING.yugaOut, y.a0 + 0.012), ...radial(RING.yugaIn, RING.yugaOut, y.a1 - 0.012)], color, [[4, 0.05], [1, 0.4]], 0.005);
  });

  // --- hub and atmosphere ----------------------------------------------------
  const texture = radialTexture();
  const bindu = new Sprite(new SpriteMaterial({ map: texture, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  bindu.scale.setScalar(0.7);
  bindu.position.z = 0.05;
  tilt.add(bindu);
  const halo = new Sprite(new SpriteMaterial({ map: texture, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.22 }));
  halo.scale.setScalar(5.5);
  halo.position.z = -0.3;
  tilt.add(halo);
  const particles = particleField(420, { r: 3.4, h: 3.6 });
  particles.material.uniforms.uPixelRatio.value = pixelRatio;
  scene.add(particles);

  // --- motion ------------------------------------------------------------------
  let rotation = 0; // inner.rotation.z: the angle currently at the near point
  let target = 0;
  let velocity = 0;
  let dragging = false;
  let settleCb = null;
  let frameCb = null;
  const pointer = { x: 0, y: 0 };
  let focusEra = null;
  let focusYuga = null;
  const opacities = {}; // animated per era/yuga

  function setFocus({ eraId = null, yugaId = null } = {}) {
    focusEra = eraId;
    focusYuga = yugaId;
  }

  const v = new Vector3();
  let width = 1;
  let height = 1;
  /** Screen positions for points on the rings: [{ a, r, ring: 'inner' | 'outer' | 'fixed' }]. */
  function project(points) {
    tilt.updateMatrixWorld(true);
    return points.map((p) => {
      v.set(p.r * Math.sin(p.a), p.r * Math.cos(p.a), p.z ?? 0);
      const group = p.ring === 'outer' ? outer : p.ring === 'fixed' ? tilt : inner;
      group.localToWorld(v);
      const depth = -camera.worldToLocal(v.clone()).z; // distance along the view axis
      v.project(camera);
      return {
        x: (v.x * 0.5 + 0.5) * width,
        y: (-v.y * 0.5 + 0.5) * height,
        scale: MathUtils.clamp(7.6 / depth, 0.55, 1.35),
        near: depth < 7.8,
      };
    });
  }

  function render() {
    renderer.render(scene, camera);
  }

  const clock = new Clock();
  let frame = 0;
  let running = false;
  let elapsed = 0;

  function tick() {
    frame = 0;
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (dragging) {
      rotation = target;
    } else if (Math.abs(velocity) > 0.03) {
      rotation += velocity * dt;
      velocity *= Math.pow(0.03, dt); // frictional decay: a flick lasts about a second
      target = rotation;
      if (Math.abs(velocity) <= 0.03) settleCb?.(rotation);
    } else {
      rotation += (target - rotation) * Math.min(1, dt * 7);
    }
    inner.rotation.z = rotation;
    if (animated) outer.rotation.z = elapsed * 0.012;

    // Focus: lit era glows; others rest.
    for (const era of eras) {
      const want = focusEra === era.id ? 0.42 : focusEra ? 0.1 : 0.16;
      const cur = opacities[era.id] ?? want;
      opacities[era.id] = cur + (want - cur) * Math.min(1, dt * 6);
      eraMeshes[era.id].material.opacity = opacities[era.id];
    }
    for (const y of yugas) {
      const want = focusYuga === y.id ? 0.4 : 0.1;
      const cur = opacities[y.id] ?? want;
      opacities[y.id] = cur + (want - cur) * Math.min(1, dt * 6);
      yugaMeshes[y.id].material.opacity = opacities[y.id];
    }

    tilt.rotation.y += (pointer.x * 0.08 - tilt.rotation.y) * 0.04;
    tilt.rotation.x += (TILT + pointer.y * 0.05 - tilt.rotation.x) * 0.04;
    bindu.scale.setScalar(0.65 + Math.sin(elapsed * 1.4) * 0.06);
    particles.material.uniforms.uTime.value = elapsed;

    render();
    frameCb?.();
    frame = requestAnimationFrame(tick);
  }

  function onPointerMove(e) {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = width < height ? 52 : width < 900 ? 40 : 34;
    camera.updateProjectionMatrix();
    resolution.x = width * pixelRatio;
    resolution.y = height * pixelRatio;
    for (const g of lines) for (const line of g.children) line.material.resolution.set(resolution.x, resolution.y);
    render();
    frameCb?.();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  function start() {
    if (running) return;
    running = true;
    clock.start();
    frame = requestAnimationFrame(tick);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(frame);
    frame = 0;
  }
  function dispose() {
    stop();
    observer.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    texture.dispose();
    renderer.dispose();
  }

  resize();
  return {
    start, stop, dispose, project, setFocus,
    /** Turn so that `angle` comes to the near point. */
    setRotation(angle, immediate = false) {
      velocity = 0;
      dragging = false;
      target = angle;
      if (immediate) rotation = angle;
    },
    getRotation: () => rotation,
    dragStart() { dragging = true; velocity = 0; target = rotation; },
    drag(delta) { target = rotation + delta; },
    dragEnd(v) { dragging = false; velocity = v; if (Math.abs(v) < 0.05) settleCb?.(rotation); },
    onSettle(cb) { settleCb = cb; },
    onFrame(cb) { frameCb = cb; },
  };
}
