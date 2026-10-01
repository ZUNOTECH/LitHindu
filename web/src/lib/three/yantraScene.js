// The hero scene: a Sri Yantra drawn in light, tilted in space, slowly
// turning, with embers drifting through it. It follows the pointer and can
// be dragged. Rendering pauses when hidden, and respects reduced motion.

import { AdditiveBlending, Clock, Group, MathUtils, PerspectiveCamera, Scene, Sprite, SpriteMaterial, WebGLRenderer } from 'three';
import { yantraLayers } from './yantraGeometry.js';
import { ETHER, GOLD, SAFFRON, glowLines, particleField, radialTexture } from './common.js';

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
