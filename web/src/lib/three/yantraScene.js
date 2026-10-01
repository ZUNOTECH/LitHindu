// The hero scene: a Sri Yantra drawn in light, tilted in space, slowly
// turning, with embers drifting through it. It follows the pointer and can
// be dragged. Rendering pauses when hidden, and respects reduced motion.

import {
  AdditiveBlending,
  BufferGeometry,
  Clock,
  Color,
  Float32BufferAttribute,
  Group,
  MathUtils,
  PerspectiveCamera,
  Points,
  Scene,
  ShaderMaterial,
  Sprite,
  SpriteMaterial,
  CanvasTexture,
  WebGLRenderer,
} from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { yantraLayers } from './yantraGeometry.js';

const GOLD = new Color('#ffd27a');
const SAFFRON = new Color('#ffb15c');
const EMBER = new Color('#ff7a3d');
const ETHER = new Color('#8b9cff');

const PARTICLES = 650;

function radialTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,225,170,0.6)');
  g.addColorStop(0.6, 'rgba(255,170,90,0.12)');
  g.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(c);
}

/** Glowing lines: the same segments drawn as a wide halo, a soft core and a bright hairline. */
function glowLines(positions, color, resolution, weights) {
  const geometry = new LineSegmentsGeometry();
  geometry.setPositions(positions);
  const group = new Group();
  for (const [width, opacity] of weights) {
    const material = new LineMaterial({
      color,
      linewidth: width,
      transparent: true,
      opacity,
      blending: AdditiveBlending,
      depthTest: false,
      depthWrite: false,
      worldUnits: false,
    });
    material.resolution = resolution;
    const line = new LineSegments2(geometry, material);
    line.computeLineDistances();
    group.add(line);
  }
  return group;
}

function particleField() {
  const positions = new Float32Array(PARTICLES * 3);
  const seeds = new Float32Array(PARTICLES * 3); // size, speed, phase
  const colors = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    const r = 0.4 + Math.pow(Math.random(), 0.6) * 2.6;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 4.2;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 2.4;
    seeds[i * 3] = 0.5 + Math.random() * 1.6;
    seeds[i * 3 + 1] = 0.02 + Math.random() * 0.06;
    seeds[i * 3 + 2] = Math.random() * Math.PI * 2;
    const c = Math.random() < 0.78 ? (Math.random() < 0.5 ? GOLD : SAFFRON) : Math.random() < 0.5 ? EMBER : ETHER;
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('seed', new Float32BufferAttribute(seeds, 3));
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3));
  const material = new ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute vec3 seed;
      attribute vec3 color;
      uniform float uTime;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        vColor = color;
        vec3 p = position;
        // Drift upward like embers, wrapping around; sway gently sideways.
        p.y = mod(p.y + uTime * seed.y + 2.1, 4.2) - 2.1;
        p.x += sin(uTime * 0.35 + seed.z) * 0.08;
        vTwinkle = 0.55 + 0.45 * sin(uTime * (0.8 + seed.y * 10.0) + seed.z);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = seed.x * 9.0 * uPixelRatio * (3.2 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vTwinkle;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float a = smoothstep(1.0, 0.0, d);
        a = a * a * vTwinkle;
        gl_FragColor = vec4(vColor, a * 0.85);
      }`,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  });
  return new Points(geometry, material);
}

export function createYantraScene(canvas, { animated = true } = {}) {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
  renderer.setClearColor(0x000000, 0);
  const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
  renderer.setPixelRatio(pixelRatio);

  const scene = new Scene();
  const camera = new PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 6.4);

  const resolution = { x: 1, y: 1 };
  const tilt = new Group(); // follows pointer and drag
  const spin = new Group(); // turns about its own axis
  tilt.add(spin);
  scene.add(tilt);
  tilt.rotation.x = -0.42;

  const layers = yantraLayers();
  const lineGroups = [
    glowLines(layers.triangles, GOLD, resolution, [[9, 0.07], [3, 0.22], [1.1, 1]]),
    glowLines(layers.inner, SAFFRON, resolution, [[6, 0.05], [1.4, 0.55]]),
    glowLines(layers.lotus8, SAFFRON, resolution, [[7, 0.06], [2, 0.2], [1, 0.8]]),
    glowLines(layers.lotus16, SAFFRON, resolution, [[6, 0.05], [1.6, 0.16], [1, 0.6]]),
    glowLines(layers.rings, GOLD, resolution, [[5, 0.04], [1, 0.4]]),
    glowLines(layers.bhupura, ETHER, resolution, [[8, 0.05], [1.2, 0.5]]),
  ];
  for (const g of lineGroups) spin.add(g);

  const texture = radialTexture();
  const bindu = new Sprite(new SpriteMaterial({ map: texture, blending: AdditiveBlending, depthWrite: false, transparent: true }));
  bindu.scale.setScalar(0.55);
  bindu.position.z = 0.05;
  spin.add(bindu);
  const halo = new Sprite(new SpriteMaterial({ map: texture, blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.35 }));
  halo.scale.setScalar(4.2);
  halo.position.z = -0.2;
  spin.add(halo);

  const particles = particleField();
  particles.material.uniforms.uPixelRatio.value = pixelRatio;
  scene.add(particles);

  // --- interaction -------------------------------------------------------
  const pointer = { x: 0, y: 0 };
  const drag = { active: false, x: 0, y: 0, vx: 0, vy: 0 };
  let userSpin = 0;
  let userTilt = 0;

  function onPointerMove(e) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    pointer.x = (e.clientX / w) * 2 - 1;
    pointer.y = (e.clientY / h) * 2 - 1;
    if (drag.active) {
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.vx = dx * 0.006;
      drag.vy = dy * 0.004;
      userSpin += drag.vx;
      userTilt = MathUtils.clamp(userTilt + drag.vy, -0.6, 0.6);
      render();
    }
  }
  function onPointerDown(e) {
    drag.active = true;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.vx = drag.vy = 0;
    canvas.setPointerCapture?.(e.pointerId);
  }
  function onPointerUp() {
    drag.active = false;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // --- sizing ------------------------------------------------------------
  let width = 1;
  let height = 1;
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Keep the figure fully visible on narrow screens.
    camera.fov = width < height ? 44 : 32;
    camera.updateProjectionMatrix();
    resolution.x = width * pixelRatio;
    resolution.y = height * pixelRatio;
    for (const g of lineGroups) for (const line of g.children) line.material.resolution.set(resolution.x, resolution.y);
    render();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);

  // --- animation ---------------------------------------------------------
  const clock = new Clock();
  let frame = 0;
  let running = false;
  let elapsed = 0;

  function render() {
    renderer.render(scene, camera);
  }

  function tick() {
    frame = 0;
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;
    if (!drag.active) {
      // Inertia after a drag, then the slow natural turn.
      userSpin += drag.vx;
      userTilt = MathUtils.clamp(userTilt + drag.vy, -0.6, 0.6);
      drag.vx *= 0.94;
      drag.vy *= 0.9;
      userTilt *= 0.985;
    }
    spin.rotation.z = elapsed * 0.045 + userSpin;
    const targetX = -0.42 + pointer.y * 0.16 + userTilt;
    const targetY = pointer.x * 0.28;
    tilt.rotation.x += (targetX - tilt.rotation.x) * 0.045;
    tilt.rotation.y += (targetY - tilt.rotation.y) * 0.045;
    tilt.position.y = Math.sin(elapsed * 0.5) * 0.04;
    bindu.scale.setScalar(0.5 + Math.sin(elapsed * 1.6) * 0.05);
    particles.material.uniforms.uTime.value = elapsed;
    render();
    frame = requestAnimationFrame(tick);
  }

  function start() {
    if (running) return;
    running = true;
    clock.start();
    if (animated) frame = requestAnimationFrame(tick);
    else render();
  }
  function stop() {
    running = false;
    cancelAnimationFrame(frame);
    frame = 0;
  }

  // Static mode (reduced motion) still follows the pointer, gently.
  let staticFrame = 0;
  function onStaticMove() {
    if (animated || staticFrame) return;
    staticFrame = requestAnimationFrame(() => {
      staticFrame = 0;
      tilt.rotation.x = -0.42 + pointer.y * 0.1;
      tilt.rotation.y = pointer.x * 0.18;
      render();
    });
  }
  if (!animated) window.addEventListener('pointermove', onStaticMove, { passive: true });

  function dispose() {
    stop();
    observer.disconnect();
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointermove', onStaticMove);
    canvas.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('pointercancel', onPointerUp);
    scene.traverse((o) => {
      o.geometry?.dispose?.();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
    });
    texture.dispose();
    renderer.dispose();
  }

  resize();
  return { start, stop, dispose };
}
