<script>
  import { onMount } from 'svelte';
  import { yantraSvgPath } from './three/yantraGeometry.js';

  let canvas = $state();
  let fallback = $state(false);
  let ready = $state(false);

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let scene;
    let cancelled = false;
    import('./three/yantraScene.js')
      .then(({ createYantraScene }) => {
        if (cancelled) return;
        scene = createYantraScene(canvas, { animated: !reduced });
        ready = true;
        // Only animate while on screen and the tab is visible.
        const visible = () => !document.hidden && onScreen;
        let onScreen = true;
        const io = new IntersectionObserver(([entry]) => {
          onScreen = entry.isIntersecting;
          visible() ? scene.start() : scene.stop();
        });
        io.observe(canvas);
        const onVisibility = () => (visible() ? scene.start() : scene.stop());
        document.addEventListener('visibilitychange', onVisibility);
        scene.start();
        cleanup = () => {
          io.disconnect();
          document.removeEventListener('visibilitychange', onVisibility);
          scene.dispose();
        };
      })
      .catch(() => (fallback = true));
    let cleanup = () => {};
    return () => {
      cancelled = true;
      cleanup();
    };
  });
</script>

{#if fallback}
  <svg class="yantra-svg" viewBox="-1.8 -1.8 3.6 3.6" aria-hidden="true">
    <path d={yantraSvgPath()} fill="none" stroke="#ffd27a" stroke-width="0.008" opacity="0.8" />
    <circle r="0.05" fill="#fff5dc" />
  </svg>
{:else}
  <canvas bind:this={canvas} class:ready aria-hidden="true"></canvas>
{/if}

<style>
  canvas,
  .yantra-svg {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    touch-action: none;
    cursor: grab;
  }
  canvas { opacity: 0; transition: opacity 1.4s ease; }
  canvas.ready { opacity: 1; }
  canvas:active { cursor: grabbing; }
  .yantra-svg { padding: 8%; box-sizing: border-box; opacity: 0.9; }
</style>
