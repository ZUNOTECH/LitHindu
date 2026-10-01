<script>
  // A soft light that follows the pointer on desktop screens.
  import { onMount } from 'svelte';
  let node;
  onMount(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let x = innerWidth / 2, y = innerHeight / 3, tx = x, ty = y, frame = 0, visible = false;
    const move = (e) => { tx = e.clientX; ty = e.clientY; if (!visible) { visible = true; node.style.opacity = '1'; } if (!frame) frame = requestAnimationFrame(loop); };
    const loop = () => {
      x += (tx - x) * 0.18; y += (ty - y) * 0.18;
      node.style.transform = `translate3d(${x - 300}px, ${y - 300}px, 0)`;
      frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0;
    };
    const leave = () => { visible = false; node.style.opacity = '0'; };
    window.addEventListener('pointermove', move, { passive: true });
    document.documentElement.addEventListener('pointerleave', leave);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('pointermove', move); document.documentElement.removeEventListener('pointerleave', leave); };
  });
</script>

<div bind:this={node} class="glow" aria-hidden="true"></div>

<style>
  .glow {
    position: fixed;
    top: 0;
    left: 0;
    width: 600px;
    height: 600px;
    pointer-events: none;
    z-index: 0;
    opacity: 0;
    transition: opacity 0.6s;
    background: radial-gradient(circle, rgba(242, 184, 90, 0.11), rgba(242, 184, 90, 0.03) 35%, transparent 65%);
    mix-blend-mode: screen;
    will-change: transform;
  }
</style>
