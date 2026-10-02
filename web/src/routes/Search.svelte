<script>
  import { fly } from 'svelte/transition';
  import { api } from '../lib/api.js';
  import { route, go, link } from '../lib/router.svelte.js';
  import { snippetHtml } from '../lib/highlight.js';
  import { reveal } from '../lib/actions/reveal.js';
  import SearchBox from '../lib/SearchBox.svelte';
  import { searchEntries, TYPES } from '../lib/encyclopedia.js';

  const PAGE = 20;
  const q = $derived(route.params.get('q') || '');

  let results = $state([]);
  let total = $state(0);
  let loading = $state(false);
  let error = $state('');
  let batch = $state(0); // which "show more" batch a result arrived in, for staggering

  async function load(query, offset) {
    loading = true;
    error = '';
    try {
      const r = await api.search(query, { limit: PAGE, offset });
      if (query !== q) return; // a newer search started
      total = r.total;
      batch = offset;
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

  const entries = $derived(q ? searchEntries(q, 4) : []);

  const SUGGESTIONS = ['dharma', 'अग्नि', 'moksha', 'திருக்குறள்', 'yoga', 'ब्रह्म'];
</script>

<div class="container">
  <div class="box" use:reveal>
    <p class="kicker">अन्वेषण</p>
    <h1 class="display">Search the whole library</h1>
    <SearchBox value={q} size="large" placeholder="A word, a name, a verse…" autofocus={!q}
      onsearch={(text) => go(link('/search', { q: text }).slice(1))} />
    <p class="tips muted">
      All words must appear on the page, and word forms are included: <code>धर्म</code> also finds <code>धर्मस्य</code>.
      Quotes match exactly (<code>"dharma"</code>). Diacritics are optional: <code>siva</code> finds <code>śiva</code>.
    </p>
    {#if !q}
      <div class="suggest">
        <span class="muted">Try</span>
        {#each SUGGESTIONS as s}
          <a class="chip" href={link('/search', { q: s })}>{s}</a>
        {/each}
      </div>
    {/if}
  </div>

  {#if entries.length}
    <section class="entries" in:fly={{ y: 12, duration: 400 }}>
      <p class="muted found">In the encyclopedia</p>
      <div class="entry-row">
        {#each entries as e (e.id)}
          <a class="entry glass" href={link(`/encyclopedia/${e.id}`)}>
            <span class="entry-sa">{e.sa}</span>
            <strong>{e.name}</strong>
            <span class="badge">{TYPES[e.type].one}</span>
          </a>
        {/each}
      </div>
    </section>
  {/if}

  {#if error}
    <p class="muted">{error}</p>
  {:else if q && !loading && !results.length}
    <p class="muted empty">Nothing found for “{q}”. Try fewer words, or a different spelling.</p>
  {/if}

  {#if results.length}
    <p class="muted found">{total.toLocaleString()} {total === 1 ? 'page' : 'pages'}</p>
    <ol class="results">
      {#each results as r, i (r.book_id + ':' + r.page)}
        <li in:fly={{ y: 16, duration: 450, delay: Math.min(i - batch, 12) * 45 }}>
          <a class="glass" href={link(`/read/${r.book_id}`, { page: r.page, q })}>
            <div class="where">
              <strong>{r.title}</strong>
              <span class="badge accent">Page {r.page.toLocaleString()}</span>
              {#if r.source === 'ocr'}<span class="badge" title="Text recognised from a scanned page">Scanned</span>{/if}
            </div>
            <p class="snippet">{@html snippetHtml(r.snippet)}</p>
            <span class="open" aria-hidden="true">Open <span>→</span></span>
          </a>
        </li>
      {/each}
    </ol>
    {#if results.length < total}
      <div class="more">
        <button onclick={() => load(q, results.length)} disabled={loading}>
          {loading ? 'Loading…' : `Show more (${(total - results.length).toLocaleString()} left)`}
        </button>
      </div>
    {/if}
  {:else if loading}
    <p class="muted found">Searching…</p>
  {/if}
</div>

<style>
  .box { max-width: 860px; padding: 40px 0 8px; }
  .kicker { margin: 0 0 4px; font-family: var(--font-devanagari); color: var(--gold); font-size: 16px; }
  h1 { margin: 0 0 22px; font-size: clamp(34px, 4.2vw, 52px); }
  .tips { font-size: 14px; margin: 14px 10px 0; }
  code { background: var(--surface-2); border: 1px solid var(--border); padding: 1px 7px; border-radius: 6px; font-size: 0.95em; }
  .suggest { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 18px 10px 0; }
  .chip { display: inline-flex; align-items: center; min-height: 38px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--border); color: var(--text); background: var(--surface); transition: border-color 0.25s, box-shadow 0.3s; }
  .chip:hover { text-decoration: none; border-color: var(--border-strong); box-shadow: var(--glow); }
  .found, .empty { margin: 32px 0 14px; }
  .entries .found { margin-bottom: 10px; }
  .entry-row { display: flex; flex-wrap: wrap; gap: 10px; }
  .entry { display: inline-flex; align-items: center; gap: 12px; padding: 10px 16px 10px 14px; border-radius: 999px; color: var(--text); transition: border-color 0.3s, box-shadow 0.4s; }
  .entry:hover { text-decoration: none; border-color: var(--border-strong); box-shadow: var(--glow); }
  .entry-sa { font-family: var(--font-devanagari); color: var(--gold); font-size: 17px; }
  .results { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; max-width: 960px; }
  .results a {
    position: relative;
    display: block;
    padding: 18px 22px 18px 26px;
    color: var(--text);
    transition: transform 0.4s var(--ease-out), border-color 0.3s, box-shadow 0.4s;
  }
  .results a::before { content: ''; position: absolute; left: 0; top: 18px; bottom: 18px; width: 2px; border-radius: 2px; background: linear-gradient(180deg, var(--gold-2), var(--saffron)); box-shadow: 0 0 12px var(--gold); opacity: 0.7; }
  .results a:hover { text-decoration: none; transform: translateX(6px); border-color: var(--border-strong); box-shadow: var(--glow), var(--shadow); }
  .where { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding-right: 70px; }
  .where strong { text-transform: capitalize; font-family: var(--font-display); font-size: 21px; font-weight: 600; }
  .snippet { margin: 8px 0 0; color: var(--text-muted); overflow-wrap: anywhere; line-height: 1.65; }
  .open { position: absolute; right: 22px; top: 20px; color: var(--text-faint); font-size: 14px; transition: color 0.3s; }
  .open span { display: inline-block; transition: transform 0.3s var(--ease-out); }
  .results a:hover .open { color: var(--gold-2); }
  .results a:hover .open span { transform: translateX(4px); }
  .more { margin: 24px 0; }
</style>
