<script>
  import { api } from '../lib/api.js';
  import { openPdf } from '../lib/pdf.js';
  import { route, replace, link } from '../lib/router.svelte.js';
  import { markTerms, snippetHtml } from '../lib/highlight.js';
  import PdfPage from '../lib/PdfPage.svelte';

  let { bookId } = $props();

  let book = $state(null);
  let pdf = $state(null);
  let error = $state('');
  let viewerWidth = $state(0);
  let zoom = $state(1);
  let panelOpen = $state(window.innerWidth >= 960);
  let tab = $state(route.params.get('q') ? 'matches' : 'text');
  let pageText = $state(null);
  let matches = $state(null);
  let findText = $state(route.params.get('q') || '');
  let viewer;

  const page = $derived(Math.max(1, Number(route.params.get('page')) || 1));
  const q = $derived(route.params.get('q') || '');
  const total = $derived(book?.pages || pdf?.numPages || 0);
  const pageWidth = $derived(Math.max(200, (viewerWidth - 32) * zoom));

  $effect(() => {
    api.book(bookId).then((b) => (book = b)).catch((e) => (error = e.message));
    openPdf(bookId, api.fileUrl(bookId))
      .then((d) => (pdf = d))
      .catch(() => (error = 'This book’s PDF could not be opened. Is it still in the library folder?'));
  });

  $effect(() => {
    const p = page;
    pageText = null;
    api.page(bookId, p).then((t) => { if (p === page) pageText = t; }).catch(() => {});
  });

  $effect(() => {
    matches = null;
    if (!q) return;
    const query = q;
    api.search(query, { book: bookId, limit: 100 })
      .then((r) => { if (query === q) matches = r; })
      .catch(() => (matches = { total: 0, results: [] }));
  });

  function goTo(n, query = q) {
    const target = Math.min(Math.max(1, n), total || n);
    replace(link(`/read/${bookId}`, { page: target, q: query }).slice(1));
    viewer?.scrollTo({ top: 0 });
  }

  function find(e) {
    e.preventDefault();
    const text = findText.trim();
    replace(link(`/read/${bookId}`, { page, q: text }).slice(1));
    if (text) { tab = 'matches'; panelOpen = true; }
  }

  function onkeydown(e) {
    if (e.target.closest('input')) return;
    if (e.key === 'ArrowRight' || e.key === 'PageDown') goTo(page + 1);
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') goTo(page - 1);
  }

  // Swipe left/right to turn pages on touch screens (when not zoomed in).
  let touchStart = null;
  function pointerdown(e) {
    if (e.pointerType === 'touch' && zoom === 1) touchStart = { x: e.clientX, y: e.clientY };
  }
  function pointerup(e) {
    if (!touchStart) return;
    const dx = e.clientX - touchStart.x;
    const dy = e.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 60) goTo(page + (dx < 0 ? 1 : -1));
  }

  /** Keep the match for the current page visible in the list. */
  function intoView(node, current) {
    const update = (c) => c && node.scrollIntoView({ block: 'nearest' });
    update(current);
    return { update };
  }

  function back() {
    if (history.length > 1) history.back();
    else location.hash = '#/library';
  }
</script>

<svelte:window {onkeydown} />

<div class="reader">
  <header class="toolbar">
    <button class="icon" onclick={back} aria-label="Back" title="Back">←</button>
    <h1 title={book?.title}>{book?.title ?? ''}</h1>
    <div class="nav">
      <button class="icon" onclick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
      <label class="pageno">
        <span class="sr">Page</span>
        <input type="number" min="1" max={total} value={page}
          onchange={(e) => goTo(Number(e.currentTarget.value))} />
        <span class="muted">/ {total.toLocaleString()}</span>
      </label>
      <button class="icon" onclick={() => goTo(page + 1)} disabled={total && page >= total} aria-label="Next page">›</button>
    </div>
    <div class="zoom">
      <button class="icon" onclick={() => (zoom = Math.max(0.5, zoom - 0.25))} aria-label="Zoom out">−</button>
      <button class="icon" onclick={() => (zoom = Math.min(3, zoom + 0.25))} aria-label="Zoom in">+</button>
    </div>
    <form class="find" onsubmit={find} role="search">
      <input type="search" placeholder="Find in this book" bind:value={findText} aria-label="Find in this book" />
    </form>
    <button onclick={() => (panelOpen = !panelOpen)} aria-pressed={panelOpen}>Text</button>
  </header>

  <div class="body" class:panel-open={panelOpen}>
    <!-- Swipe gestures supplement the page buttons and arrow keys. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="viewer" bind:this={viewer} bind:clientWidth={viewerWidth}
      onpointerdown={pointerdown} onpointerup={pointerup}>
      {#if error}
        <p class="message">{error}</p>
      {:else if pdf}
        <PdfPage {pdf} pageNumber={page} width={pageWidth}
          onerror={() => (error = 'This page could not be displayed.')} />
      {:else}
        <p class="message muted">Opening book…</p>
      {/if}
    </div>

    {#if panelOpen}
      <aside class="panel">
        <div class="tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'text'} class:on={tab === 'text'} onclick={() => (tab = 'text')}>Page text</button>
          {#if q}
            <button role="tab" aria-selected={tab === 'matches'} class:on={tab === 'matches'} onclick={() => (tab = 'matches')}>
              Matches{matches ? ` (${matches.total})` : ''}
            </button>
          {/if}
        </div>

        {#if tab === 'matches' && q}
          {#if !matches}
            <p class="muted">Searching…</p>
          {:else if !matches.results.length}
            <p class="muted">“{q}” was not found in this book.</p>
          {:else}
            <ol class="matches">
              {#each matches.results as m (m.page)}
                <li>
                  <button class:current={m.page === page} use:intoView={m.page === page} onclick={() => goTo(m.page)}>
                    <strong>Page {m.page}</strong>
                    <span>{@html snippetHtml(m.snippet)}</span>
                  </button>
                </li>
              {/each}
            </ol>
          {/if}
        {:else if pageText === null}
          <p class="muted">Loading…</p>
        {:else if !pageText.text}
          <p class="muted">No text for this page yet. It may still be processing, or the page may be blank.</p>
        {:else}
          {#if pageText.source === 'ocr'}
            <p class="note">Recognised from a scanned page{pageText.confidence != null ? ` · ${Math.round(pageText.confidence)}% confidence` : ''}. Small errors are possible; the page image is the original.</p>
          {/if}
          <div class="text">{@html markTerms(pageText.text, q)}</div>
        {/if}
      </aside>
    {/if}
  </div>
</div>

<style>
  .reader { height: 100vh; height: 100dvh; display: flex; flex-direction: column; }
  .toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
    flex-wrap: wrap;
  }
  h1 {
    flex: 1 1 160px;
    min-width: 0;
    margin: 0 4px;
    font-size: 17px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: capitalize;
  }
  .nav, .zoom { display: flex; align-items: center; gap: 4px; }
  .icon { font-size: 22px; }
  .pageno { display: flex; align-items: center; gap: 6px; }
  .pageno input { width: 92px; padding: 0 12px; text-align: center; }
  .find input { width: 200px; }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

  .body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr; }
  .body.panel-open { grid-template-columns: 1fr minmax(320px, 400px); }
  .viewer {
    overflow: auto;
    padding: 16px;
    text-align: center;
    background: var(--surface-2);
    touch-action: pan-y pinch-zoom;
  }
  .message { margin-top: 20vh; }
  .panel {
    overflow: auto;
    border-left: 1px solid var(--border);
    background: var(--surface);
    padding: 12px 18px 24px;
  }
  .tabs { display: flex; gap: 6px; margin-bottom: 12px; position: sticky; top: -12px; padding: 12px 0 8px; margin-top: -12px; background: var(--surface); }
  .tabs button.on { background: var(--accent-soft); border-color: var(--accent); color: var(--accent-strong); }
  .text { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 17px; line-height: 1.75; }
  .note { font-size: 13px; color: var(--text-muted); background: var(--surface-2); padding: 8px 12px; border-radius: 10px; }
  .matches { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .matches button {
    width: 100%;
    text-align: left;
    border-radius: 12px;
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    white-space: normal;
  }
  .matches button.current { border-color: var(--accent); background: var(--accent-soft); }
  .matches span { font-size: 14px; color: var(--text-muted); overflow-wrap: anywhere; }

  @media (max-width: 960px) {
    .body.panel-open { grid-template-columns: 1fr; grid-template-rows: 1fr 45%; }
    .panel { border-left: 0; border-top: 1px solid var(--border); }
    .find { order: 10; flex: 1 1 100%; }
    .find input { width: 100%; }
  }
</style>
