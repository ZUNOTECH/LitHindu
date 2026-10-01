<script>
  import { api } from '../lib/api.js';
  import { route, go, link } from '../lib/router.svelte.js';
  import { snippetHtml } from '../lib/highlight.js';
  import SearchBox from '../lib/SearchBox.svelte';

  const PAGE = 20;
  const q = $derived(route.params.get('q') || '');

  let results = $state([]);
  let total = $state(0);
  let loading = $state(false);
  let error = $state('');

  async function load(query, offset) {
    loading = true;
    error = '';
    try {
      const r = await api.search(query, { limit: PAGE, offset });
      if (query !== q) return; // a newer search started
      total = r.total;
      results = offset ? [...results, ...r.results] : r.results;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    results = [];
    total = 0;
    if (q) load(q, 0);
  });
</script>

<div class="container">
  <div class="box">
    <SearchBox value={q} size="large" placeholder="Search all books" autofocus={!q}
      onsearch={(text) => go(link('/search', { q: text }).slice(1))} />
    <p class="tips muted">
      All words must appear on the page. Add <code>*</code> to match the start of a word (<code>yaj*</code>).
      Sanskrit diacritics are optional: <code>siva</code> finds <code>śiva</code>.
    </p>
  </div>

  {#if error}
    <p class="muted">{error}</p>
  {:else if q && !loading && !results.length}
    <p class="muted">No pages found for “{q}”.</p>
  {/if}

  {#if results.length}
    <p class="muted">{total.toLocaleString()} {total === 1 ? 'page' : 'pages'} found</p>
    <ol class="results">
      {#each results as r (r.book_id + ':' + r.page)}
        <li>
          <a href={link(`/read/${r.book_id}`, { page: r.page, q })}>
            <div class="where">
              <strong>{r.title}</strong>
              <span class="badge">Page {r.page}</span>
              {#if r.source === 'ocr'}<span class="badge" title="Text recognised from a scanned page">Scanned</span>{/if}
            </div>
            <p class="snippet">{@html snippetHtml(r.snippet)}</p>
          </a>
        </li>
      {/each}
    </ol>
    {#if results.length < total}
      <div class="more">
        <button onclick={() => load(q, results.length)} disabled={loading}>
          {loading ? 'Loading…' : 'Show more results'}
        </button>
      </div>
    {/if}
  {:else if loading}
    <p class="muted">Searching…</p>
  {/if}
</div>

<style>
  .box { max-width: 820px; margin: 32px 0 8px; }
  .tips { font-size: 14px; margin: 10px 8px 24px; }
  code { background: var(--surface-2); padding: 1px 6px; border-radius: 6px; font-size: 0.95em; }
  .results { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; max-width: 900px; }
  .results a {
    display: block;
    padding: 16px 20px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: var(--radius);
    color: var(--text);
  }
  .results a:hover { text-decoration: none; border-color: var(--accent); }
  .where { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
  .where strong { text-transform: capitalize; }
  .snippet { margin: 8px 0 0; color: var(--text-muted); overflow-wrap: anywhere; }
  .more { margin: 20px 0; }
</style>
