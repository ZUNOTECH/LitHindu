<script>
  import { fly, fade } from 'svelte/transition';
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
  let turn = $state(''); // 'forward' | 'back' while the page-turn animation plays
  let lastPage = 0;
  let viewer;

  const page = $derived(Math.max(1, Number(route.params.get('page')) || 1));
  const q = $derived(route.params.get('q') || '');
  const total = $derived(book?.pages || pdf?.numPages || 0);
  const pageWidth = $derived(Math.max(200, Math.min(viewerWidth - 48, 980) * zoom));

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

  function rendered(n) {
    if (lastPage && n !== lastPage) {
      turn = n > lastPage ? 'forward' : 'back';
      setTimeout(() => (turn = ''), 520);
    }
    lastPage = n;
  }

  function goTo(n, query = q) {
    const target = Math.min(Math.max(1, n), total || n);
    replace(link(`/read/${bookId}`, { page: target, q: query }).slice(1));
    viewer?.scrollTo({ top: 0, behavior: 'smooth' });
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
    if (e.key === 'Escape') back();
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
    const update = (c) => c && node.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    update(current);
    return { update };
  }

  function back() {
    if (history.length > 1) history.back();
    else location.hash = '#/library';
  }
</script>

<svelte:window {onkeydown} />

<div class="reader" in:fade={{ duration: 400 }}>
  <header class="toolbar" in:fly={{ y: -20, duration: 500, delay: 100 }}>
    <div class="head">
      <button class="icon ghost" onclick={back} aria-label="Back" title="Back (Esc)">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>
      </button>
      <div class="title">
        <h1 title={book?.title}>{book?.title ?? ''}</h1>
        {#if book}<span class="muted sub">{book.language} · {book.pages.toLocaleString()} pages</span>{/if}
      </div>
    </div>
    <div class="nav glass">
      <button class="icon ghost" onclick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
      <label class="pageno">
        <span class="sr">Page</span>
        <input type="number" min="1" max={total} value={page}
          onchange={(e) => goTo(Number(e.currentTarget.value))} />
        <span class="muted">/ {total.toLocaleString()}</span>
      </label>
      <button class="icon ghost" onclick={() => goTo(page + 1)} disabled={total && page >= total} aria-label="Next page">›</button>
    </div>
    <div class="zoom glass">
      <button class="icon ghost" onclick={() => (zoom = Math.max(0.5, +(zoom - 0.25).toFixed(2)))} aria-label="Zoom out">−</button>
      <span class="muted zoom-val">{Math.round(zoom * 100)}%</span>
      <button class="icon ghost" onclick={() => (zoom = Math.min(3, +(zoom + 0.25).toFixed(2)))} aria-label="Zoom in">+</button>
    </div>
    <form class="find" onsubmit={find} role="search">
      <input type="search" placeholder="Find in this book" bind:value={findText} aria-label="Find in this book" />
    </form>
    <button class:on={panelOpen} onclick={() => (panelOpen = !panelOpen)} aria-pressed={panelOpen}>Text</button>
  </header>

  <div class="body" class:panel-open={panelOpen}>
    <!-- Swipe gestures supplement the page buttons and arrow keys. -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="viewer" bind:this={viewer} bind:clientWidth={viewerWidth}
      onpointerdown={pointerdown} onpointerup={pointerup}>
      {#if error}
        <p class="message">{error}</p>
      {:else if pdf}
        <div class="leaf {turn}" in:fly={{ y: 40, duration: 700, delay: 150 }}>
          <PdfPage {pdf} pageNumber={page} width={pageWidth} onrendered={rendered}
            onerror={() => (error = 'This page could not be displayed.')} />
        </div>
      {:else}
        <div class="message loading"><span class="spark"></span><p class="muted">Opening book…</p></div>
      {/if}
    </div>

    {#if panelOpen}
      <aside class="panel" transition:fly={{ x: 40, duration: 450 }}>
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
                    <strong>Page {m.page.toLocaleString()}</strong>
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
    gap: 10px;
    padding: 10px 14px;
    border-bottom: 1px solid var(--border);
    background: rgba(9, 7, 16, 0.65);
    backdrop-filter: blur(18px) saturate(1.3);
    -webkit-backdrop-filter: blur(18px) saturate(1.3);
    flex-wrap: wrap;
    z-index: 2;
  }
  .head { flex: 1 1 220px; min-width: 0; display: flex; align-items: center; gap: 10px; }
  .title { flex: 1; min-width: 0; display: flex; flex-direction: column; margin: 0 4px; }
  h1 {
    margin: 0;
    font-family: var(--font-display);
    font-size: 21px;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-transform: capitalize;
    line-height: 1.2;
  }
  .sub { font-size: 12.5px; }
  .nav, .zoom { display: flex; align-items: center; gap: 2px; padding: 3px; border-radius: 999px; }
  .ghost { min-width: 42px; min-height: 42px; }
  .icon { font-size: 22px; }
  .pageno { display: flex; align-items: center; gap: 6px; }
  .pageno input { width: 86px; min-height: 40px; padding: 0 10px; text-align: center; font-variant-numeric: tabular-nums; }
  .zoom-val { font-size: 13px; min-width: 42px; text-align: center; font-variant-numeric: tabular-nums; }
  .find input { width: 210px; }
  .toolbar button.on { background: var(--accent-soft); border-color: rgba(242, 184, 90, 0.4); color: var(--gold-2); }
  .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }

  .body { flex: 1; min-height: 0; display: grid; grid-template-columns: 1fr; }
  .body.panel-open { grid-template-columns: 1fr minmax(340px, 420px); }
  .viewer {
    position: relative;
    overflow: auto;
    padding: 28px 24px 48px;
    text-align: center;
    perspective: 1800px;
    touch-action: pan-y pinch-zoom;
    background:
      radial-gradient(900px 500px at 50% 0%, rgba(242, 184, 90, 0.07), transparent 70%),
      radial-gradient(1200px 800px at 50% 100%, rgba(80, 60, 160, 0.14), transparent 70%);
  }
  .leaf { display: inline-block; transform-origin: center; transform-style: preserve-3d; }
  .leaf.forward { animation: turn-forward 0.52s var(--ease-out); }
  .leaf.back { animation: turn-back 0.52s var(--ease-out); }
  @keyframes turn-forward {
    0% { transform: rotateY(-16deg) translateX(40px); opacity: 0.2; filter: brightness(0.7); }
    100% { transform: none; opacity: 1; filter: none; }
  }
  @keyframes turn-back {
    0% { transform: rotateY(16deg) translateX(-40px); opacity: 0.2; filter: brightness(0.7); }
    100% { transform: none; opacity: 1; filter: none; }
  }
  .message { margin-top: 18vh; }
  .loading { display: flex; flex-direction: column; align-items: center; gap: 18px; }
  .spark { width: 14px; height: 14px; border-radius: 50%; background: var(--gold-2); box-shadow: 0 0 24px 6px rgba(242, 184, 90, 0.5); animation: breathe 1.6s ease-in-out infinite; }
  @keyframes breathe { 0%, 100% { transform: scale(0.8); opacity: 0.7; } 50% { transform: scale(1.2); opacity: 1; } }

  .panel {
    overflow: auto;
    border-left: 1px solid var(--border);
    background: rgba(12, 9, 22, 0.55);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
    padding: 0 20px 28px;
  }
  .tabs { display: flex; gap: 6px; position: sticky; top: 0; padding: 14px 0 12px; background: linear-gradient(180deg, rgba(12, 9, 22, 0.95) 70%, transparent); z-index: 1; }
  .tabs button.on { background: var(--accent-soft); border-color: rgba(242, 184, 90, 0.4); color: var(--gold-2); }
  .text { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 17px; line-height: 1.8; }
  .note { font-size: 13px; color: var(--text-muted); background: var(--surface-2); border: 1px solid var(--border); padding: 10px 14px; border-radius: 12px; }
  .matches { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
  .matches button {
    width: 100%;
    text-align: left;
    border-radius: 14px;
    padding: 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    white-space: normal;
    backdrop-filter: none;
  }
  .matches button.current { border-color: rgba(242, 184, 90, 0.5); background: var(--accent-soft); box-shadow: var(--glow); }
  .matches strong { color: var(--gold-2); font-size: 14px; letter-spacing: 0.02em; }
  .matches span { font-size: 14px; color: var(--text-muted); overflow-wrap: anywhere; line-height: 1.5; }

  @media (max-width: 960px) {
    .body.panel-open { grid-template-columns: 1fr; grid-template-rows: 1fr 45%; }
    .panel { border-left: 0; border-top: 1px solid var(--border); }
    .toolbar { gap: 8px; padding: 8px 10px; }
    .head { flex-basis: 100%; }
    .find { flex: 1 1 120px; }
    .find input { width: 100%; }
    .viewer { padding: 16px 12px 32px; }
    .zoom, .sub { display: none; }
    h1 { font-size: 18px; }
  }
</style>
