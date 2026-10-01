<script>
  let { pdf, pageNumber, width, onerror, onrendered } = $props();

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
        onrendered?.(n);
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
  .page { display: inline-block; background: #fff; line-height: 0; transition: opacity 0.2s; border-radius: 2px; box-shadow: 0 0 0 1px rgba(255, 214, 160, 0.12), 0 30px 80px rgba(0, 0, 0, 0.6), 0 0 60px rgba(242, 184, 90, 0.08); }
  .page.rendering { opacity: 0.55; }
  canvas { display: block; }
</style>
