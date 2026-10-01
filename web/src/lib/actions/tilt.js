// Pointer-following 3D tilt with a moving light sheen. Sets CSS variables
// --rx, --ry (degrees), --mx, --my (0-1 pointer position) and --tilt (0/1).
// Only for fine pointers: touch screens get the resting state.

const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

export function tilt(node, { max = 12 } = {}) {
  if (!fine()) return {};
  let frame = 0;
  let rect;

  function move(e) {
    if (!rect) rect = node.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      node.style.setProperty('--ry', `${(x - 0.5) * 2 * max}deg`);
      node.style.setProperty('--rx', `${(0.5 - y) * 2 * max}deg`);
      node.style.setProperty('--mx', x.toFixed(3));
      node.style.setProperty('--my', y.toFixed(3));
    });
  }
  function enter() {
    rect = node.getBoundingClientRect();
    node.style.setProperty('--tilt', '1');
  }
  function leave() {
    cancelAnimationFrame(frame);
    rect = null;
    node.style.setProperty('--tilt', '0');
    node.style.setProperty('--rx', '0deg');
    node.style.setProperty('--ry', '0deg');
  }
  node.addEventListener('pointerenter', enter);
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerleave', leave);
  return {
    destroy() {
      cancelAnimationFrame(frame);
      node.removeEventListener('pointerenter', enter);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
    },
  };
}
