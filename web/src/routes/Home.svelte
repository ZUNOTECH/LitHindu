<script>
  import { api } from '../lib/api.js';
  import { go, link } from '../lib/router.svelte.js';
  import SearchBox from '../lib/SearchBox.svelte';
  import BookCard from '../lib/BookCard.svelte';

  let stats = $state(null);
  let books = $state([]);
  let error = $state('');

  $effect(() => {
    api.stats().then((s) => (stats = s)).catch((e) => (error = e.message));
    api.books().then((b) => (books = b)).catch(() => {});
  });

  // The largest works first: the epics, Vedas and collected Upanishads.
  const great = $derived([...books].sort((a, b) => b.pages - a.pages).slice(0, 6));
</script>

<section class="hero">
  <div class="container">
    <p class="eyebrow">सनातन धर्म · Sanatana Dharma</p>
    <h1>The living library of Hindu knowledge</h1>
    <p class="lede">Search the Vedas, Upanishads, Itihasas and Puranas in Sanskrit, Hindi, Tamil and English, and read every page.</p>
    <div class="search-wrap">
      <SearchBox size="large" placeholder="Search: dharma, अग्नि, திருக்குறள்…" onsearch={(q) => go(link('/search', { q }).slice(1))} />
    </div>
    {#if stats}
      <dl class="stats">
        <div><dt>Books</dt><dd>{stats.books.toLocaleString()}</dd></div>
        <div><dt>Pages</dt><dd>{stats.pages.toLocaleString()}</dd></div>
        <div><dt>Searchable</dt><dd>{stats.pages ? Math.floor((stats.pages_ready / stats.pages) * 100) : 0}%</dd></div>
      </dl>
    {:else if error}
      <p class="muted">{error}</p>
    {/if}
  </div>
</section>

{#if great.length}
  <section class="container">
    <div class="section-head">
      <h2>Great works</h2>
      <a href="#/library">Browse all {books.length} books →</a>
    </div>
    <div class="grid">
      {#each great as book (book.id)}<BookCard {book} />{/each}
    </div>
  </section>
{/if}

<style>
  .hero {
    padding: 56px 0 40px;
    background:
      radial-gradient(1200px 400px at 50% -100px, var(--accent-soft), transparent 70%);
    text-align: center;
  }
  .eyebrow { font-family: var(--font-display); color: var(--accent-strong); font-size: 18px; margin: 0 0 8px; }
  h1 {
    font-family: var(--font-display);
    font-size: clamp(32px, 5vw, 52px);
    line-height: 1.15;
    margin: 0 auto 16px;
    max-width: 18ch;
  }
  .lede { max-width: 60ch; margin: 0 auto 28px; color: var(--text-muted); font-size: 19px; }
  .search-wrap { max-width: 720px; margin: 0 auto; }
  .stats { display: flex; justify-content: center; gap: 40px; margin: 32px 0 0; flex-wrap: wrap; }
  .stats div { display: flex; flex-direction: column-reverse; }
  dt { color: var(--text-muted); font-size: 14px; }
  dd { margin: 0; font-size: 28px; font-weight: 600; font-variant-numeric: tabular-nums; }
  .section-head { display: flex; align-items: baseline; justify-content: space-between; gap: 16px; margin: 32px 0 16px; flex-wrap: wrap; }
  h2 { font-family: var(--font-display); margin: 0; font-size: 26px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
</style>
