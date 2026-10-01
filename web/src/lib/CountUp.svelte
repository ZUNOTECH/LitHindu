<script>
  // A number that counts up from zero when it first appears.
  import { onMount } from 'svelte';
  let { value = 0, suffix = '', duration = 1600 } = $props();
  let shown = $state(0);
  let node;

  onMount(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      if (reduced) { shown = value; return; }
      const start = performance.now();
      const step = (now) => {
        const t = Math.min(1, (now - start) / duration);
        shown = Math.round(value * (1 - Math.pow(1 - t, 4)));
        if (t < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io.observe(node);
    return () => io.disconnect();
  });
  $effect(() => { if (shown > value) shown = value; });
</script>

<span bind:this={node}>{shown.toLocaleString()}{suffix}</span>
