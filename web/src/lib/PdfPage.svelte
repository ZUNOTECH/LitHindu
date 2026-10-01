<script>
  let { pdf, pageNumber, width, onerror } = $props();

  let canvas;
  let renderTask = null;
  let rendering = $state(true);

  $effect(() => {
    const n = pageNumber;
    const w = width;
    if (!pdf || !w || !canvas) return;
    let cancelled = false;
    rendering = true;
    (async () => {
      try {
        const page = await pdf.getPage(n);
        if (cancelled) return;
        const base = page.getViewport({ scale: 1 });
        const scale = w / base.width;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });
        renderTask?.cancel();
        const off = document.createElement('canvas');
        off.width = Math.floor(viewport.width);
        off.height = Math.floor(viewport.height);
        renderTask = page.render({ canvasContext: off.getContext('2d'), viewport });
        await renderTask.promise;
        if (cancelled) return;
        // Swap in the finished page at once, so turning pages never flashes blank.
        canvas.width = off.width;
        canvas.height = off.height;
        canvas.getContext('2d').drawImage(off, 0, 0);
        canvas.style.width = `${Math.floor(w)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        rendering = false;
      } catch (e) {
        if (e?.name !== 'RenderingCancelledException' && !cancelled) onerror?.(e);
      }
    })();
    return () => {
      cancelled = true;
      renderTask?.cancel();
    };
  });
</script>

<div class="page" class:rendering>
  <canvas bind:this={canvas} aria-label="Page {pageNumber}"></canvas>
</div>

<style>
  .page { display: inline-block; background: #fff; box-shadow: var(--shadow); line-height: 0; transition: opacity 0.15s; }
  .page.rendering { opacity: 0.6; }
  canvas { display: block; }
</style>
