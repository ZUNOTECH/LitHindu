// Helpers shared by the 3D scenes: palette, soft glow textures, glowing
// line layers and the drifting ember field.

import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  Group,
  Points,
  ShaderMaterial,
} from 'three';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';

export const GOLD = new Color('#ffd27a');
export const SAFFRON = new Color('#ffb15c');
export const EMBER = new Color('#ff7a3d');
export const ETHER = new Color('#8b9cff');


export function radialTexture() {
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
export function glowLines(positions, color, resolution, weights) {
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

export function particleField(PARTICLES = 650, spread = { r: 2.6, h: 4.2 }) {
  const positions = new Float32Array(PARTICLES * 3);
  const seeds = new Float32Array(PARTICLES * 3); // size, speed, phase
  const colors = new Float32Array(PARTICLES * 3);
  for (let i = 0; i < PARTICLES; i++) {
    const r = 0.4 + Math.pow(Math.random(), 0.6) * spread.r;
    const a = Math.random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = (Math.random() - 0.5) * spread.h;
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
